/**
 * Google Drive helper — all photo and face-crop storage goes through here.
 *
 * Setup:
 *  1. Enable Drive API in Google Cloud Console
 *  2. Create an OAuth2 Client ID (Web Application) → add http://localhost:3001/callback
 *  3. Run `node get-token.js` once to get your refresh token
 *  4. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN,
 *     GOOGLE_DRIVE_FOLDER_ID in .env
 */
require('dotenv').config();
const { google } = require('googleapis');
const { Readable } = require('stream');

// ── Auth ─────────────────────────────────────────────────────────────────────
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
);
oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

const drive = google.drive({ version: 'v3', auth: oauth2Client });

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Upload a Buffer to Google Drive.
 * Returns { driveId, url } where url is a server-proxied path (/api/img/:id)
 * so guests never need a Google account to view photos.
 */
async function uploadBuffer(buffer, filename, mimeType) {
  if (!FOLDER_ID) throw new Error('GOOGLE_DRIVE_FOLDER_ID is not set in .env');

  const { data: file } = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [FOLDER_ID],
    },
    media: {
      mimeType: mimeType || 'application/octet-stream',
      body: Readable.from(buffer),
    },
    fields: 'id,name',
  });

  return {
    driveId: file.id,
    url: `/api/img/${file.id}`,
  };
}

/**
 * Upload a base64 data URL (from canvas) as a JPEG face-crop thumbnail.
 */
async function uploadDataUrl(dataUrl, filename) {
  const b64 = dataUrl.split(',')[1];
  if (!b64) throw new Error('Invalid data URL');
  const buffer = Buffer.from(b64, 'base64');
  const { driveId, url } = await uploadBuffer(buffer, filename, 'image/jpeg');
  return { driveId, url };
}

/**
 * Stream a Drive file directly to an Express response.
 * Used by the /api/img/:driveId proxy route.
 */
async function streamFile(driveId, res) {
  const response = await drive.files.get(
    { fileId: driveId, alt: 'media' },
    { responseType: 'stream' },
  );
  const ct = response.headers['content-type'] || 'image/jpeg';
  res.setHeader('Content-Type', ct);
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  response.data.pipe(res);
}

/**
 * Delete a file from Drive (called if we need to clean up on error).
 */
async function deleteFile(driveId) {
  try { await drive.files.delete({ fileId: driveId }); } catch {}
}

/**
 * Quick connectivity check — throws if credentials are wrong.
 */
async function ping() {
  await drive.about.get({ fields: 'user' });
}

module.exports = { uploadBuffer, uploadDataUrl, streamFile, deleteFile, ping };
