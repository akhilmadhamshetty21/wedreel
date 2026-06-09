require('dotenv').config();
const express = require('express');
const multer  = require('multer');
const path    = require('path');
const { v4: uuidv4 } = require('uuid');
const db      = require('./db');
const drive   = require('./drive');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Multer — memory storage; files stream straight to Drive, never touch disk ─
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, /^(image|video)\//.test(file.mimetype)),
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseEventIds(raw) {
  if (!raw) return ['wedding'];
  try { return typeof raw === 'string' ? JSON.parse(raw) : raw; }
  catch { return ['wedding']; }
}

// ── Routes ────────────────────────────────────────────────────────────────────

// Upload photos → stream each buffer to Drive, store Drive URL in DB
app.post('/api/upload', upload.array('photos', 100), async (req, res) => {
  try {
    if (!req.files?.length) return res.status(400).json({ error: 'No files' });

    const eventIds = parseEventIds(req.body.event_ids);
    const now = Date.now();

    const photos = await Promise.all(req.files.map(async f => {
      const ext = path.extname(f.originalname).toLowerCase() || '.jpg';
      const filename = `${now}-${uuidv4().slice(0, 8)}${ext}`;
      const { driveId, url } = await drive.uploadBuffer(f.buffer, filename, f.mimetype);
      return {
        id:          uuidv4(),
        drive_id:    driveId,
        url,
        orig_name:   f.originalname,
        event_ids:   eventIds,
        mime_type:   f.mimetype,
        size:        f.size,
        upload_time: now,
      };
    }));

    await db.insertPhotos(photos);

    res.json({
      success: true,
      count: photos.length,
      photos: photos.map(p => ({ id: p.id, url: p.url, event_ids: p.event_ids, mime_type: p.mime_type })),
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Store face descriptors + crops → upload crop images to Drive
app.post('/api/photos/:photoId/faces', async (req, res) => {
  try {
    const { photoId } = req.params;
    const photo = await db.getPhoto(photoId);
    if (!photo) return res.status(404).json({ error: 'Photo not found' });

    const { faces = [] } = req.body;

    const saved = await Promise.all(faces.map(async face => {
      const id = uuidv4();
      let cropUrl = null;
      let cropDriveId = null;

      if (face.crop_data_url?.startsWith('data:image')) {
        try {
          const result = await drive.uploadDataUrl(face.crop_data_url, `crop-${id}.jpg`);
          cropUrl = result.url;
          cropDriveId = result.driveId;
        } catch (e) {
          console.warn('Face crop upload failed:', e.message);
        }
      }

      return {
        id,
        photo_id:      photoId,
        descriptor:    face.descriptor,
        bbox:          face.bbox ?? null,
        crop_url:      cropUrl,
        crop_drive_id: cropDriveId,
      };
    }));

    await db.insertFaces(saved);

    res.json({
      success: true,
      faces: saved.map(f => ({ id: f.id, photo_id: f.photo_id, crop_url: f.crop_url })),
    });
  } catch (err) {
    console.error('Faces error:', err);
    res.status(500).json({ error: err.message });
  }
});

// List photos — url is already a Drive URL stored in DB
app.get('/api/photos', async (req, res) => {
  try {
    const { event = 'all', sort = 'recent', limit = '600' } = req.query;
    let photos = await db.getPhotos({ event, sort });
    photos = photos.slice(0, Math.min(parseInt(limit) || 600, 2000));
    res.json({ photos, total: photos.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// All face descriptors with photo context
app.get('/api/faces', async (req, res) => {
  try {
    const faces = (await db.getFaces()).map(f => ({
      id:         f.id,
      photo_id:   f.photo_id,
      photo_url:  f.photo_url,
      crop_url:   f.crop_url,
      event_ids:  f.event_ids,
      descriptor: f.descriptor,
      bbox:       f.bbox,
    }));
    res.json({ faces });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Proxy Drive files — guests don't need a Google account to view photos
app.get('/api/img/:driveId', async (req, res) => {
  try {
    await drive.streamFile(req.params.driveId, res);
  } catch (err) {
    res.status(404).end();
  }
});

// Delete photo — admin only
app.delete('/api/photos/:photoId', async (req, res) => {
  try {
    const { key } = req.query;
    if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY)
      return res.status(401).json({ error: 'Unauthorized' });

    const photo = await db.getPhoto(req.params.photoId);
    if (!photo) return res.status(404).json({ error: 'Not found' });

    await db.deletePhoto(req.params.photoId);
    if (photo.drive_id) {
      try { await drive.deleteFile(photo.drive_id); } catch {}
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stats
app.get('/api/stats', async (req, res) => {
  try { res.json(await db.stats()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// SPA routes
app.get('/gallery', (req, res) => res.sendFile(path.join(__dirname, 'public', 'gallery.html')));
app.get('/',        (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// ── Start ─────────────────────────────────────────────────────────────────────
// Listen locally; on Vercel the exported app is used instead
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🎊  Wedding website → http://localhost:${PORT}\n`);
  });
}

module.exports = app;
