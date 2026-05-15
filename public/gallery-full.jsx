/* global React */
/* Full gallery — loads real photos from server, clusters faces client-side */
const { useState: useStateG, useEffect: useEffectG, useMemo: useMemoG, useCallback: useCallbackG } = React;

/* ── Euclidean distance between two face descriptor arrays ── */
function dist(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; s += d * d; }
  return Math.sqrt(s);
}

/* ── Cluster faces into unique people (greedy nearest-centroid) ── */
function clusterFaces(faceData, threshold = 0.52) {
  const clusters = [];
  for (const face of faceData) {
    const desc = new Float32Array(face.descriptor);
    let placed = false;
    for (const cl of clusters) {
      if (dist(desc, cl.centroid) < threshold) {
        cl.faces.push(face);
        const n = cl.faces.length;
        cl.centroid = cl.centroid.map((v, i) => (v * (n - 1) + desc[i]) / n);
        placed = true;
        break;
      }
    }
    if (!placed) {
      clusters.push({
        id: face.id,
        centroid: new Float32Array(face.descriptor),
        faces: [face],
        representative: face,
      });
    }
  }
  // Sort largest clusters first so the most-photographed people appear first
  return clusters.sort((a, b) => b.faces.length - a.faces.length);
}

/* ── Small face thumbnail chip ── */
function FaceChipSm({ face, active, onClick }) {
  const [err, setErr] = useStateG(false);
  return (
    <div className={"face-chip-sm " + (active ? "active" : "")}
         title={"Guest — " + face.faces.length + " photo" + (face.faces.length !== 1 ? "s" : "")}
         onClick={onClick}>
      {face.representative.crop_url && !err
        ? <img src={face.representative.crop_url} alt="face"
               style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
               onError={() => setErr(true)} />
        : <FacePlaceholder idx={clusters_idx(face)} label="?" />
      }
    </div>
  );
}
function clusters_idx(cl) { return (cl.id || "").charCodeAt(0) % 8; }

/* ── Single gallery photo card ── */
function GalleryPhotoCard({ photo, animDelay }) {
  const [err, setErr] = useStateG(false);
  const eventName = (window.EVENT_DATA || []).find(e => (photo.event_ids || []).includes(e.id))?.name
                     || (photo.event_ids?.[0] || "");
  return (
    <div className="gallery-item" style={{ animationDelay: animDelay + "s" }}>
      {err
        ? <PhotoPlaceholder idx={0} eventId={(photo.event_ids||[])[0]} />
        : <img src={photo.url} alt={photo.orig_name || "photo"}
               style={{ width: "100%", display: "block" }}
               loading="lazy"
               onError={() => setErr(true)} />
      }
      <div className="gallery-item-overlay">
        {eventName && <span className="photo-tag-badge">{eventName}</span>}
      </div>
    </div>
  );
}

/* ============================================================
   FullGallery
============================================================ */
function FullGallery({ onOpenUpload }) {
  const [photos,     setPhotos]     = useStateG([]);
  const [faces,      setFaces]      = useStateG([]);
  const [clusters,   setClusters]   = useStateG([]);
  const [evFilter,   setEvFilter]   = useStateG("all");
  const [faceCluster,setFaceCluster]= useStateG(null);  // cluster index or null
  const [sort,       setSort]       = useStateG("recent");
  const [loading,    setLoading]    = useStateG(true);
  const [counts,     setCounts]     = useStateG({ all: 0 });
  const [lastRefresh,setRefresh]    = useStateG(Date.now());

  // Load photos from API whenever event filter or sort changes
  useEffectG(() => {
    setLoading(true);
    const params = new URLSearchParams({ sort });
    if (evFilter !== "all") params.set("event", evFilter);

    fetch("/api/photos?" + params)
      .then(r => r.json())
      .then(data => {
        setPhotos(data.photos || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Gallery load error:", err);
        setLoading(false);
      });
  }, [evFilter, sort, lastRefresh]);

  // Load face data and cluster once
  useEffectG(() => {
    fetch("/api/faces")
      .then(r => r.json())
      .then(data => {
        const faceData = data.faces || [];
        setFaces(faceData);
        setClusters(clusterFaces(faceData));
      })
      .catch(err => console.warn("Face load error:", err));
  }, [lastRefresh]);

  // Load event counts
  useEffectG(() => {
    fetch("/api/stats")
      .then(r => r.json())
      .then(data => setCounts(data.event_counts || { all: 0 }))
      .catch(() => {});
  }, [lastRefresh]);

  // Auto-refresh every 30s
  useEffectG(() => {
    const id = setInterval(() => setRefresh(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  // Filter photos by face cluster (client-side, after server filtered by event)
  const displayPhotos = useMemoG(() => {
    if (faceCluster === null) return photos;
    const cl = clusters[faceCluster];
    if (!cl) return photos;
    const photoIds = new Set(cl.faces.map(f => f.photo_id));
    return photos.filter(p => photoIds.has(p.id));
  }, [photos, faceCluster, clusters]);

  const hasFilters = evFilter !== "all" || faceCluster !== null;
  const clearFilters = () => { setEvFilter("all"); setFaceCluster(null); };

  const EVENT_IDS = ["haldi", "mehendi", "sangeet", "wedding", "reception"];

  return (
    <div id="gallery" className="gallery-page-layout">

      {/* ── Header + stats ── */}
      <div className="gallery-top">
        <div className="container">
          <div className="gallery-top-inner">
            <div>
              <div className="kicker" style={{ justifyContent: "flex-start" }}><Icon.Sparkle s={12}/> The Memory Wall</div>
              <h2 style={{ margin: "4px 0 0", fontSize: "clamp(20px,2.6vw,32px)" }}>Every photo, in one place</h2>
            </div>
            <div className="gallery-stats">
              <div className="gallery-stat">
                <div className="n">{counts.all || 0}</div>
                <div className="l">Photos</div>
              </div>
              <div className="gallery-stat">
                <div className="n">{clusters.length || 0}</div>
                <div className="l">Guests</div>
              </div>
              <div className="gallery-stat">
                <div className="n" style={{ color: "var(--gold-deep)" }}>Live</div>
                <div className="l">Updating</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="gallery-filter-wrap">
        <div className="container">
          <div className="gallery-filters">

            {/* Event filter */}
            <div className="gallery-filter-row">
              <span className="gallery-filter-label"><Icon.Cal s={12}/> Event</span>
              <div className="event-chip-row">
                <button type="button"
                        className={"event-chip " + (evFilter === "all" ? "active" : "")}
                        onClick={() => setEvFilter("all")}>
                  <span className="event-chip-ic" style={{
                    background: evFilter === "all"
                      ? "linear-gradient(135deg,var(--gold-2),var(--gold-deep))"
                      : "rgba(255,250,240,0.7)",
                    color: evFilter === "all" ? "var(--maroon-deep)" : "var(--ink-soft)",
                  }}>
                    <Icon.Sparkle s={12}/>
                  </span>
                  <span>All <span className="chip-count">{counts.all || 0}</span></span>
                </button>

                {EVENT_IDS.map(eid => {
                  const E = (window.EVENT_DATA || []).find(e => e.id === eid);
                  if (!E) return null;
                  const IconC = Icon[E.icon];
                  const active = evFilter === eid;
                  return (
                    <button key={eid} type="button"
                            className={"event-chip " + (active ? "active" : "")}
                            onClick={() => setEvFilter(eid)}>
                      <span className="event-chip-ic" style={{
                        background: active
                          ? `linear-gradient(135deg,${E.color},var(--gold-deep))`
                          : "rgba(255,250,240,0.7)",
                        color: active ? "var(--maroon-deep)" : "var(--ink-soft)",
                      }}>
                        <IconC s={14}/>
                      </span>
                      <span>{E.name} <span className="chip-count">{counts[eid] || 0}</span></span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Face filter */}
            <div className="gallery-filter-row">
              <span className="gallery-filter-label"><Icon.Heart s={12}/> Guest</span>
              <div className="gallery-face-row">
                <div className={"face-chip-sm face-all " + (faceCluster === null ? "active" : "")}
                     title="All guests" onClick={() => setFaceCluster(null)}>
                  <span style={{
                    display: "grid", placeItems: "center", width: "100%", height: "100%",
                    background: "linear-gradient(135deg,var(--gold-2),var(--gold-deep))",
                    color: "var(--maroon-deep)", fontSize: 11, fontWeight: 600,
                  }}>ALL</span>
                </div>
                {clusters.length === 0 && (
                  <span style={{ fontSize: 12, color: "var(--ink-soft)", paddingTop: 14, fontStyle: "italic" }}>
                    Upload photos to see guest faces here
                  </span>
                )}
                {clusters.map((cl, i) => (
                  <FaceChipSm key={cl.id} face={cl}
                    active={faceCluster === i}
                    onClick={() => setFaceCluster(faceCluster === i ? null : i)} />
                ))}
              </div>
            </div>

            {/* Sort + summary row */}
            <div className="gallery-filter-row" style={{ alignItems: "center" }}>
              <span className="gallery-filter-label"><Icon.Sparkle s={12}/> Sort</span>
              <div className="event-chip-row" style={{ flex: 1 }}>
                {[["recent","Most Recent"],["event","By Ceremony"]].map(([v,l]) => (
                  <button key={v} type="button"
                          className={"event-chip " + (sort === v ? "active" : "")}
                          style={{ paddingLeft: 14 }}
                          onClick={() => setSort(v)}>
                    <span>{l}</span>
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: "auto" }}>
                <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                  {displayPhotos.length} photo{displayPhotos.length !== 1 ? "s" : ""}
                </span>
                {hasFilters && (
                  <button onClick={clearFilters} className="gallery-clear">
                    <Icon.Close s={10}/> Clear
                  </button>
                )}
                <button onClick={() => setRefresh(Date.now())} className="gallery-clear">
                  ↻ Refresh
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Scrollable photo grid ── */}
      <div className="gallery-photo-scroll">
        <div className="container">
          <div className="masonry-gallery">
            {loading && (
              <div className="empty-state">
                <div className="scan-ring" style={{ margin: "0 auto 12px" }} />
                <p>Loading photos…</p>
              </div>
            )}
            {!loading && displayPhotos.length === 0 && (
              <div className="empty-state">
                <Icon.Sparkle s={20}/>
                <p>
                  {counts.all === 0
                    ? "No photos yet — be the first to upload!"
                    : "No photos match this filter. Try clearing a filter."}
                </p>
              </div>
            )}
            {!loading && displayPhotos.map((p, i) => (
              <GalleryPhotoCard key={p.id} photo={p} animDelay={Math.min(i, 30) * 0.02} />
            ))}
          </div>
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <button className="btn btn-primary" onClick={onOpenUpload}>
              <Icon.Upload s={14}/> Add Your Photos
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}

Object.assign(window, { FullGallery });
