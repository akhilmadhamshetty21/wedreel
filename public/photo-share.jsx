/* global React, faceapi */
/* Real photo upload + browser-side face detection */
const { useState: useStateP, useEffect: useEffectP, useRef: useRefP } = React;

/* ============================================================
   Face-api.js model loading (lazy, singleton)
============================================================ */
const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';
let _modelsPromise = null;

function ensureFaceModels() {
  if (_modelsPromise) return _modelsPromise;
  if (typeof faceapi === 'undefined') {
    _modelsPromise = Promise.reject(new Error('face-api.js not loaded'));
    return _modelsPromise;
  }
  _modelsPromise = Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]).then(() => { window._faceApiReady = true; })
    .catch(err => {
      _modelsPromise = null;
      window._faceApiReady = false;
      throw err;
    });
  return _modelsPromise;
}

// Kick off model loading in the background as soon as this script runs
if (typeof faceapi !== 'undefined') {
  ensureFaceModels().catch(() => { });
}

/* ============================================================
   Helpers
============================================================ */
function loadImg(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image load failed: ' + url));
    img.src = url;
  });
}

function cropFaceCanvas(img, box) {
  const canvas = document.createElement('canvas');
  const size = 120;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const pad = 0.35;
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const x = Math.max(0, box.x - box.width * pad);
  const y = Math.max(0, box.y - box.height * pad);
  const w = Math.min(iw - x, box.width * (1 + 2 * pad));
  const h = Math.min(ih - y, box.height * (1 + 2 * pad));
  ctx.drawImage(img, x, y, w, h, 0, 0, size, size);
  return canvas.toDataURL('image/jpeg', 0.8);
}

/* Compress an image file to max 1920px, ~85% quality — keeps well under Vercel's 4.5 MB limit */
function compressImage(file, maxDim = 1920, quality = 0.85) {
  return new Promise(resolve => {
    if (!file.type.startsWith('image/')) return resolve(file);
    const blobUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(blobUrl);
      const ratio = Math.min(maxDim / img.width, maxDim / img.height, 1);
      if (ratio >= 1) return resolve(file);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        blob => resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })),
        'image/jpeg', quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(blobUrl); resolve(file); };
    img.src = blobUrl;
  });
}

function euclidean(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; s += d * d; }
  return Math.sqrt(s);
}

/* Find which cluster index (from detectedFaces) best matches the tapped face */
function matchFace(tapDescriptor, allFaces, threshold = 0.52) {
  return allFaces.filter(f => {
    const desc = f.descriptor instanceof Float32Array ? f.descriptor : new Float32Array(f.descriptor);
    const tap = tapDescriptor instanceof Float32Array ? tapDescriptor : new Float32Array(tapDescriptor);
    return euclidean(tap, desc) < threshold;
  });
}

/* ============================================================
   Shared photo dataset from server (replaces fake BASE_PHOTOS)
   The server is source of truth; we cache here for same session.
============================================================ */
window.serverPhotosCache = window.serverPhotosCache || null;

/* ============================================================
   Decorative QR  (same as design)
============================================================ */
function DecorativeQR() {
  const canvasRef = useRefP(null);
  useEffectP(() => {
    if (!canvasRef.current || !window.QRCode) return;
    QRCode.toCanvas(canvasRef.current, window.location.origin, {
      width: 200,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: { dark: '#3F0F18', light: '#FBF6EC' },
    });
  }, []);
  return <canvas ref={canvasRef} style={{ borderRadius: 10, display: 'block' }} />;
}

/* ============================================================
   Photo Share Section (top of page)
============================================================ */
function PhotoShareSection({ onOpenUpload }) {
  return (
    <section className="share-section" id="share">
      <Mandala className="tl" />
      <div className="container">
        <div className="share-card glass reveal">
          <div className="qr-frame">
            <DecorativeQR />
            <div className="qr-monogram">S&amp;A</div>
          </div>
          <div className="share-text">
            <div className="kicker"><Icon.Sparkle /> Live Memory Wall</div>
            <h2>Scan &amp; Share Your Memories</h2>
            <p>Scan this QR code and upload your photos &amp; videos from our celebration — they'll appear instantly in our shared gallery.</p>
            <div className="flow-steps">
              <span><Icon.QR s={12} /> Scan</span><span className="sep">·</span>
              <span><Icon.Upload s={12} /> Upload &amp; Tag</span><span className="sep">·</span>
              <span><Icon.Sparkle s={12} /> Tap your face</span><span className="sep">·</span>
              <span><Icon.Heart s={12} /> View memories</span>
            </div>
            <button className="btn btn-primary" onClick={onOpenUpload}>
              <span className="upload-icon-anim"><Icon.Upload s={16} /></span>
              Upload Photos
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   Face & Photo placeholder SVGs (kept for fallback)
============================================================ */
const FACE_PALETTES = [
  ["#E8C4C4", "#5C1A24"], ["#F2D7D2", "#A8893F"],
  ["#E8D5B0", "#3F0F18"], ["#D89B9B", "#6B1F2E"],
  ["#F1E3C4", "#5C1A24"], ["#E8C875", "#3F0F18"],
  ["#C9A961", "#5C1A24"], ["#E8C4C4", "#A8893F"],
];

function FacePlaceholder({ idx, label }) {
  const [c1, c2] = FACE_PALETTES[idx % FACE_PALETTES.length];
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" style={{ width: "100%", height: "100%" }}>
      <defs>
        <linearGradient id={"fg" + idx} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor={c1} /><stop offset="100%" stopColor={c2} />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#fg${idx})`} />
      <circle cx="50" cy="40" r="18" fill="rgba(255,255,255,0.25)" />
      <ellipse cx="50" cy="85" rx="32" ry="22" fill="rgba(255,255,255,0.18)" />
      <text x="50" y="55" textAnchor="middle" fontFamily="Cormorant Garamond,serif"
        fontSize="28" fontWeight="600" fill="rgba(255,255,255,0.85)">{label || "?"}</text>
    </svg>
  );
}

const EVENT_TINT = {
  haldi: ["#E8C875", "#A8893F", "#F1E3C4"],
  mehendi: ["#9DBF7C", "#5E7A4A", "#D9E3D2"],
  sangeet: ["#D89B9B", "#A8893F", "#F2D7D2"],
  wedding: ["#C9A961", "#5C1A24", "#E8C875"],
  reception: ["#E8C4C4", "#3F0F18", "#A8893F"],
};

function PhotoPlaceholder({ idx, h, eventId }) {
  const tint = EVENT_TINT[eventId] || ["#A8893F", "#5C1A24", "#E8C875"];
  const [a, b, c] = tint;
  const uid = (idx || 0) + (eventId || '');
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice"
      style={{ width: "100%", height: h || "100%", display: "block" }}>
      <defs>
        <linearGradient id={"pg" + uid} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor={a} /><stop offset="60%" stopColor={b} /><stop offset="100%" stopColor={c} />
        </linearGradient>
        <pattern id={"pp" + uid} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="14" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
        </pattern>
      </defs>
      <rect width="100" height="100" fill={`url(#pg${uid})`} />
      <rect width="100" height="100" fill={`url(#pp${uid})`} />
      <circle cx={30 + ((idx || 0) * 7) % 40} cy="35" r="12" fill="rgba(255,255,255,0.22)" />
      <ellipse cx={30 + ((idx || 0) * 7) % 40} cy="75" rx="22" ry="20" fill="rgba(255,255,255,0.15)" />
    </svg>
  );
}

/* ============================================================
   Event tag chips (used in upload modal)
============================================================ */
function EventChip({ event, active, onClick }) {
  const E = window.EVENT_DATA?.find(e => e.id === event);
  if (!E) return null;
  const IconC = Icon[E.icon];
  return (
    <button type="button" onClick={onClick} className={"event-chip " + (active ? "active" : "")}>
      <span className="event-chip-ic" style={{
        background: active ? `linear-gradient(135deg,${E.color},var(--gold-deep))` : "rgba(255,250,240,0.7)",
        color: active ? "var(--maroon-deep)" : "var(--ink-soft)",
      }}>
        <IconC s={14} />
      </span>
      <span>{E.name}</span>
      {active && <Icon.Check s={12} />}
    </button>
  );
}

/* ============================================================
   Real face chip — shows actual crop if available
============================================================ */
function RealFaceChip({ face, active, onClick, style }) {
  const [imgErr, setImgErr] = useStateP(false);
  const initial = face.label || "?";
  return (
    <div className={"face-chip " + (active ? "active" : "")} style={style} onClick={onClick}
      title={face.name || "Tap to see your photos"}>
      {face.crop_url && !imgErr
        ? <img src={face.crop_url} alt="face" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
          onError={() => setImgErr(true)} />
        : <FacePlaceholder idx={face.idx || 0} label={initial} />
      }
    </div>
  );
}

/* ============================================================
   Upload Modal
   Steps: idle → uploading → scanning → faces → photos
============================================================ */
const ALL_EVENT_IDS = ["haldi", "mehendi", "sangeet", "wedding", "reception"];

function UploadModal({ onClose, onConfetti }) {
  const [step, setStep] = useStateP("idle");
  const [progress, setProgress] = useStateP(0);
  const [tagged, setTagged] = useStateP(["wedding"]);
  const [dragOver, setDragOver] = useStateP(false);
  const [uploadedPhotos, setUploaded] = useStateP([]);
  const [detectedFaces, setFaces] = useStateP([]);
  const [activeFace, setActive] = useStateP(null);
  const [scanMsg, setScanMsg] = useStateP("Uploading files…");
  const [error, setError] = useStateP(null);
  const fileRef = useRefP(null);
  const cameraRef = useRefP(null);

  function toggleTag(eid) {
    setTagged(t => t.includes(eid) ? t.filter(x => x !== eid) : [...t, eid]);
  }

  async function startUpload(files) {
    if (!tagged.length || !files?.length) return;
    setError(null);
    setStep("uploading");
    setProgress(5);

    try {
      // 1. Compress + upload one file at a time (Vercel has a 4.5 MB request limit)
      const fileArray = Array.from(files);
      const total = fileArray.length;
      const allPhotos = [];

      for (let i = 0; i < fileArray.length; i++) {
        setScanMsg(`Preparing ${i + 1} of ${total}…`);
        const compressed = await compressImage(fileArray[i]);

        setScanMsg(`Uploading ${i + 1} of ${total}…`);
        const fd = new FormData();
        fd.append('photos', compressed);
        fd.append('event_ids', JSON.stringify(tagged));

        const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd });
        if (!uploadRes.ok) {
          let msg = uploadRes.statusText;
          try { const d = await uploadRes.json(); msg = d.error || msg; } catch {}
          throw new Error('Upload failed: ' + msg);
        }
        const { photos } = await uploadRes.json();
        allPhotos.push(...photos);
        setProgress(5 + Math.round((i + 1) / total * 35));
      }

      const photos = allPhotos;
      setUploaded(photos);
      setProgress(40);
      onConfetti && onConfetti();

      // 2. Face detection on images
      setStep("scanning");
      setScanMsg("Loading face detection models…");

      let faceApiOk = false;
      try {
        await ensureFaceModels();
        faceApiOk = true;
      } catch (e) {
        console.warn("Face detection unavailable:", e.message);
      }

      const allFaces = [];

      if (faceApiOk) {
        setScanMsg("Detecting faces in your photos…");
        const imagePhotos = photos.filter(p => p.mime_type?.startsWith('image/'));

        for (let i = 0; i < imagePhotos.length; i++) {
          const photo = imagePhotos[i];
          setScanMsg(`Scanning photo ${i + 1} of ${imagePhotos.length}…`);

          try {
            const img = await loadImg(photo.url);
            const opts = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.45 });
            const detections = await faceapi
              .detectAllFaces(img, opts)
              .withFaceLandmarks()
              .withFaceDescriptors();

            if (detections.length > 0) {
              const facesData = detections.map(det => {
                const box = det.detection.box;
                const cropUrl = cropFaceCanvas(img, box);
                return {
                  descriptor: Array.from(det.descriptor),
                  bbox: {
                    x: box.x / img.naturalWidth, y: box.y / img.naturalHeight,
                    w: box.width / img.naturalWidth, h: box.height / img.naturalHeight,
                  },
                  crop_data_url: cropUrl,
                };
              });

              const faceRes = await fetch(`/api/photos/${photo.id}/faces`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ faces: facesData }),
              });
              const { faces: savedFaces } = await faceRes.json();

              savedFaces.forEach((sf, idx) => {
                allFaces.push({
                  id: sf.id,
                  photoId: photo.id,
                  photoUrl: photo.url,
                  crop_url: sf.crop_url || facesData[idx].crop_data_url,
                  descriptor: new Float32Array(facesData[idx].descriptor),
                  idx: allFaces.length,
                });
              });
            }
          } catch (e) {
            console.warn("Face detection error for photo:", photo.filename, e);
          }

          setProgress(40 + Math.round((i + 1) / imagePhotos.length * 55));
        }
      }

      setProgress(100);
      setFaces(allFaces);
      setStep(allFaces.length > 0 ? "faces" : "done_no_faces");

    } catch (err) {
      console.error("Upload error:", err);
      setError(err.message);
      setStep("idle");
    }
  }

  function handleFiles(fileList) {
    if (!tagged.length) return;
    startUpload(fileList);
  }

  // Photos matching tapped face (within this upload)
  const photosForFace = useStateP(() => [])[0];
  const matchedPhotos = activeFace !== null
    ? (() => {
      const matched = matchFace(detectedFaces[activeFace]?.descriptor, detectedFaces);
      const photoIds = new Set(matched.map(f => f.photoId));
      return uploadedPhotos.filter(p => photoIds.has(p.id));
    })()
    : [];

  const dominantEvent = tagged[0] || "wedding";

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <button className="modal-close" onClick={onClose} aria-label="Close"><Icon.Close s={16} /></button>

        {/* ── IDLE: tag events + dropzone ── */}
        {(step === "idle" || (step === "idle" && error)) && (
          <div>
            <div className="kicker"><Icon.Upload s={12} /> Share with the couple</div>
            <h3>Upload your photos</h3>
            <p className="sub">Drop photos &amp; videos from the celebration. We'll detect faces automatically — no login needed.</p>

            {error && (
              <div style={{
                padding: "12px 16px", borderRadius: 12, background: "rgba(92,26,36,.08)",
                color: "var(--maroon)", marginBottom: 16, fontSize: 13
              }}>
                ⚠ {error}
              </div>
            )}

            <div className="tag-section">
              <div className="tag-label">
                <span><Icon.Cal s={12} /> Which events are in these photos?</span>
                <button type="button" className="tag-all"
                  onClick={() => setTagged(tagged.length === ALL_EVENT_IDS.length ? [] : ALL_EVENT_IDS)}>
                  {tagged.length === ALL_EVENT_IDS.length ? "Clear" : "Select all"}
                </button>
              </div>
              <div className="event-chip-row">
                {ALL_EVENT_IDS.map(eid => (
                  <EventChip key={eid} event={eid} active={tagged.includes(eid)}
                    onClick={() => toggleTag(eid)} />
                ))}
              </div>
              {!tagged.length && <p className="tag-hint">Tag at least one event to continue.</p>}
            </div>

            {/* Desktop: drag-and-drop zone */}
            <div className={"dropzone " + (dragOver ? "hover" : "") + ((!tagged.length) ? " disabled" : "")}
              onDragOver={e => { if (tagged.length) { e.preventDefault(); setDragOver(true); } }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); if (tagged.length) handleFiles(e.dataTransfer.files); }}
              onClick={() => tagged.length && fileRef.current && fileRef.current.click()}>
              <div className="ic"><Icon.Upload s={26} /></div>
              <h4>Drag photos here</h4>
              <p>or tap to choose from your gallery — JPG, PNG, MP4</p>
              <button className="btn btn-gold" disabled={!tagged.length}
                onClick={e => { e.stopPropagation(); fileRef.current && fileRef.current.click(); }}>
                <Icon.Sparkle s={14} /> Choose Photos
              </button>
            </div>

            {/* Mobile: two large tap targets */}
            <div className="upload-actions">
              <button className="btn btn-ghost" disabled={!tagged.length}
                onClick={() => fileRef.current && fileRef.current.click()}>
                <Icon.Upload s={16} /> Gallery
              </button>
              <button className="btn btn-primary" disabled={!tagged.length}
                onClick={() => cameraRef.current && cameraRef.current.click()}>
                <Icon.Camera s={16} /> Camera
              </button>
            </div>

            {/* File inputs — always in DOM, used by both desktop and mobile */}
            <input ref={fileRef} type="file" multiple accept="image/*,video/*" hidden
              onChange={e => handleFiles(e.target.files)} />
            <input ref={cameraRef} type="file" accept="image/*,video/*" capture="environment" hidden
              onChange={e => handleFiles(e.target.files)} />
          </div>
        )}

        {/* ── UPLOADING / SCANNING ── */}
        {(step === "uploading" || step === "scanning") && (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div className="kicker" style={{ justifyContent: "center" }}>
              {step === "uploading" ? <><Icon.Upload s={12} /> Uploading</> : <><Icon.Sparkle s={12} /> AI Face Matching</>}
            </div>
            <h3 style={{ marginTop: 8 }}>{scanMsg}</h3>
            <p className="sub">
              {step === "uploading"
                ? `Tagged to: ${tagged.map(t => window.EVENT_DATA?.find(e => e.id === t)?.name || t).join(" · ")}`
                : "Privacy-friendly · nothing leaves this device until you hit share"}
            </p>
            <div className="progress" style={{ maxWidth: 360, margin: "18px auto" }}>
              <i style={{ width: progress + "%" }} />
            </div>
            {step === "scanning" && <div className="scan-ring" style={{ margin: "0 auto" }} />}
            <p style={{ marginTop: 14, color: "var(--ink-soft)", fontSize: 13 }}>
              {Math.min(Math.round(progress), 100)}% complete
            </p>
          </div>
        )}

        {/* ── FACES ── */}
        {step === "faces" && (
          <div>
            <div className="kicker"><Icon.Sparkle s={12} /> Faces detected</div>
            <h3>Tap your face to find your photos</h3>
            <p className="sub">
              We found {detectedFaces.length} face{detectedFaces.length !== 1 ? "s" : ""} in your {uploadedPhotos.length} photo{uploadedPhotos.length !== 1 ? "s" : ""}. No login needed.
            </p>
            <div className="face-grid">
              {detectedFaces.map((f, i) => (
                <RealFaceChip key={f.id || i} face={f}
                  active={activeFace === i}
                  style={{ animationDelay: (i * 0.06) + "s" }}
                  onClick={() => { setActive(activeFace === i ? null : i); if (activeFace !== i) setStep("photos"); }}
                />
              ))}
            </div>
            <div style={{ marginTop: 22, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a className="btn btn-ghost" href="/gallery" style={{ textDecoration: "none" }}>
                <Icon.Sparkle s={14} /> View Full Gallery
              </a>
              <button className="btn btn-primary" onClick={onClose}>Done</button>
            </div>
          </div>
        )}

        {/* ── DONE (no faces detected) ── */}
        {step === "done_no_faces" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div className="kicker" style={{ justifyContent: "center" }}><Icon.Check s={12} /> Upload complete</div>
            <h3 style={{ marginTop: 8 }}>
              {uploadedPhotos.length} photo{uploadedPhotos.length !== 1 ? "s" : ""} uploaded!
            </h3>
            <p className="sub">No faces were detected in these photos. They're in the gallery now.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 20 }}>
              <a className="btn btn-primary" href="/gallery" style={{ textDecoration: "none" }}>
                <Icon.Sparkle s={14} /> Open Gallery
              </a>
              <button className="btn btn-ghost" onClick={onClose}>Close</button>
            </div>
          </div>
        )}

        {/* ── PHOTOS ── */}
        {step === "photos" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 4 }}>
              <button onClick={() => { setStep("faces"); setActive(null); }}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  color: "var(--gold-deep)", fontSize: 11, letterSpacing: ".18em",
                  textTransform: "uppercase", fontWeight: 500
                }}>
                ← All faces
              </button>
            </div>
            <h3>Your memories</h3>
            <p className="sub">
              {matchedPhotos.length} photo{matchedPhotos.length !== 1 ? "s" : ""} · {tagged.length} event{tagged.length !== 1 ? "s" : ""}
            </p>
            {matchedPhotos.length === 0 && (
              <p style={{ color: "var(--ink-soft)", fontStyle: "italic", marginTop: 8 }}>
                No photos matched — try tapping a different face.
              </p>
            )}
            <div className="masonry">
              {matchedPhotos.map((p, i) => (
                <div key={p.id} style={{
                  animationDelay: (i * 0.04) + "s", position: "relative",
                  breakInside: "avoid", marginBottom: 12, borderRadius: 14,
                  overflow: "hidden", border: "1px solid rgba(232,200,117,.35)"
                }}>
                  <img src={p.url} alt={p.orig_name || "photo"}
                    style={{ width: "100%", display: "block", objectFit: "cover" }}
                    loading="lazy"
                    onError={e => { e.target.style.display = "none"; }} />
                  <span className="photo-tag-badge" style={{ position: "absolute", top: 8, left: 8 }}>
                    {(p.event_ids || [tagged[0]])[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, {
  PhotoShareSection, UploadModal,
  FacePlaceholder, PhotoPlaceholder, EventChip,
  ALL_EVENT_IDS, ensureFaceModels,
});
