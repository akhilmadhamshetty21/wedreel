/* Simple JSON-file database — no native modules required */
const fs   = require('fs');
const path = require('path');

// /tmp is the only writable path on Vercel serverless; local dev uses project root
const DB_PATH = process.env.VERCEL
  ? '/tmp/wedding-data.json'
  : path.join(__dirname, 'wedding-data.json');

const EMPTY = { photos: [], faces: [] };

function read() {
  if (!fs.existsSync(DB_PATH)) return structuredClone(EMPTY);
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); }
  catch { return structuredClone(EMPTY); }
}

function write(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data), 'utf8');
}

// ── Exported helpers ──────────────────────────────────────────────────────────

function insertPhotos(photosArr) {
  const db = read();
  db.photos.push(...photosArr);
  write(db);
}

function insertFaces(facesArr) {
  const db = read();
  db.faces.push(...facesArr);
  write(db);
}

function getPhoto(id) {
  return read().photos.find(p => p.id === id) || null;
}

function getPhotos({ event = 'all', sort = 'recent' } = {}) {
  let list = read().photos;
  if (event && event !== 'all') {
    list = list.filter(p => (p.event_ids || []).includes(event));
  }
  list = [...list].sort((a, b) =>
    sort === 'event'
      ? (a.event_ids?.[0] || '').localeCompare(b.event_ids?.[0] || '')
      : (b.upload_time || 0) - (a.upload_time || 0)
  );
  return list;
}

function getFaces() {
  const db = read();
  return db.faces.map(f => {
    const photo = db.photos.find(p => p.id === f.photo_id);
    return { ...f, photo_url: photo?.url, event_ids: photo?.event_ids || ['wedding'] };
  });
}

function stats() {
  const { photos, faces } = read();
  const events = ['haldi','mehendi','sangeet','wedding','reception'];
  const eventCounts = { all: photos.length };
  events.forEach(ev => {
    eventCounts[ev] = photos.filter(p => (p.event_ids || []).includes(ev)).length;
  });
  return { total_photos: photos.length, total_faces: faces.length, event_counts: eventCounts };
}

module.exports = { insertPhotos, insertFaces, getPhoto, getPhotos, getFaces, stats };
