'use strict';
const fs   = require('fs');
const path = require('path');

/* ── Upstash Redis via REST (no native module needed) ────────── */
const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const USE_REDIS   = !!(REDIS_URL && REDIS_TOKEN);

async function redis(...args) {
  const res = await fetch(REDIS_URL, {
    method : 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body   : JSON.stringify(args),
  });
  const { result, error } = await res.json();
  if (error) throw new Error('Redis: ' + error);
  return result;
}

async function rList(key) {
  const raw = await redis('LRANGE', key, '0', '-1');
  return (raw || []).map(s => JSON.parse(s));
}

/* ── File fallback (local dev without Redis) ─────────────────── */
const DB_PATH = process.env.VERCEL
  ? '/tmp/wedding-data.json'
  : path.join(__dirname, 'wedding-data.json');
const EMPTY = { photos: [], faces: [] };

function fRead() {
  if (!fs.existsSync(DB_PATH)) return structuredClone(EMPTY);
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); }
  catch { return structuredClone(EMPTY); }
}
function fWrite(data) { fs.writeFileSync(DB_PATH, JSON.stringify(data), 'utf8'); }

/* ── Exported helpers ────────────────────────────────────────── */
async function insertPhotos(arr) {
  if (USE_REDIS) {
    for (const p of arr) await redis('RPUSH', 'w:photos', JSON.stringify(p));
    return;
  }
  const db = fRead(); db.photos.push(...arr); fWrite(db);
}

async function insertFaces(arr) {
  if (USE_REDIS) {
    for (const f of arr) await redis('RPUSH', 'w:faces', JSON.stringify(f));
    return;
  }
  const db = fRead(); db.faces.push(...arr); fWrite(db);
}

async function getPhoto(id) {
  if (USE_REDIS) {
    const all = await rList('w:photos');
    return all.find(p => p.id === id) || null;
  }
  return fRead().photos.find(p => p.id === id) || null;
}

async function getPhotos({ event = 'all', sort = 'recent' } = {}) {
  let list = USE_REDIS ? await rList('w:photos') : fRead().photos;
  if (event && event !== 'all') list = list.filter(p => (p.event_ids || []).includes(event));
  return [...list].sort((a, b) =>
    sort === 'event'
      ? (a.event_ids?.[0] || '').localeCompare(b.event_ids?.[0] || '')
      : (b.upload_time || 0) - (a.upload_time || 0)
  );
}

async function getFaces() {
  let faces, photos;
  if (USE_REDIS) {
    [faces, photos] = await Promise.all([rList('w:faces'), rList('w:photos')]);
  } else {
    const db = fRead(); faces = db.faces; photos = db.photos;
  }
  return faces.map(f => {
    const photo = photos.find(p => p.id === f.photo_id);
    return { ...f, photo_url: photo?.url, event_ids: photo?.event_ids || ['wedding'] };
  });
}

async function stats() {
  let photos, faces;
  if (USE_REDIS) {
    [photos, faces] = await Promise.all([rList('w:photos'), rList('w:faces')]);
  } else {
    const db = fRead(); photos = db.photos; faces = db.faces;
  }
  const events = ['haldi', 'mehendi', 'sangeet', 'wedding', 'reception'];
  const eventCounts = { all: photos.length };
  events.forEach(ev => {
    eventCounts[ev] = photos.filter(p => (p.event_ids || []).includes(ev)).length;
  });
  return { total_photos: photos.length, total_faces: faces.length, event_counts: eventCounts };
}

async function deletePhoto(id) {
  if (USE_REDIS) {
    const [photoRaw, faceRaw] = await Promise.all([
      redis('LRANGE', 'w:photos', '0', '-1'),
      redis('LRANGE', 'w:faces',  '0', '-1'),
    ]);
    const photoMatch = photoRaw.find(s => { try { return JSON.parse(s).id === id; } catch { return false; } });
    if (photoMatch) await redis('LREM', 'w:photos', '1', photoMatch);
    for (const s of faceRaw) {
      try { if (JSON.parse(s).photo_id === id) await redis('LREM', 'w:faces', '1', s); } catch {}
    }
    return;
  }
  const data = fRead();
  data.photos = data.photos.filter(p => p.id !== id);
  data.faces  = data.faces.filter(f => f.photo_id !== id);
  fWrite(data);
}

async function getLiveUrl() {
  if (USE_REDIS) return (await redis('GET', 'w:live_url')) || null;
  return fRead().liveUrl || null;
}

async function setLiveUrl(url) {
  if (USE_REDIS) {
    if (url) await redis('SET', 'w:live_url', url);
    else await redis('DEL', 'w:live_url');
    return;
  }
  const data = fRead();
  data.liveUrl = url || null;
  fWrite(data);
}

module.exports = { insertPhotos, insertFaces, getPhoto, getPhotos, getFaces, stats, deletePhoto, getLiveUrl, setLiveUrl };
