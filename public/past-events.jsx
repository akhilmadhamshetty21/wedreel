/* global React */
const { useState: useStatePE, useEffect: useEffectPE } = React;

/* ── Edit this array to add / remove videos ── */
const PAST_VIDEOS = [
  {
    id: "N5qHz6y61eE",
    title: "Engagement Live Stream",
    tag: "Live",
    date: "2026",
    platform: "YouTube",
  },
  {
    id: "YBg3LIkdUD0",
    title: "Engagement Trailer",
    tag: "Pre-Wedding",
    date: "2025",
    platform: "YouTube",
  },
];

/* ── YouTube embed lightbox ── */
function VideoLightbox({ video, onClose }) {
  useEffectPE(() => {
    const onKey = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="lightbox-backdrop" onClick={onClose}>
      <div className="pe-video-box" onClick={e => e.stopPropagation()}>
        <button className="lightbox-close" onClick={onClose} aria-label="Close">
          <Icon.Close s={18} />
        </button>
        <div className="pe-iframe-wrap">
          <iframe
            src={`https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0`}
            title={video.title}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
          />
        </div>
      </div>
    </div>
  );
}

/* ── Single video card ── */
function VideoCard({ video, animDelay }) {
  const [open, setOpen] = useStatePE(false);
  const [thumbErr, setThumbErr] = useStatePE(false);
  const thumb = thumbErr
    ? `https://img.youtube.com/vi/${video.id}/hqdefault.jpg`
    : `https://img.youtube.com/vi/${video.id}/maxresdefault.jpg`;

  return (
    <>
      <div className="pe-card reveal" style={{ animationDelay: animDelay + "s" }}
        onClick={() => setOpen(true)}>
        <div className="pe-thumb">
          <img src={thumb} alt={video.title} onError={() => setThumbErr(true)} />
          <div className="pe-play">
            <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
              <path d="M6 4l14 8-14 8V4z" />
            </svg>
          </div>
          <span className="pe-platform-badge">{video.platform}</span>
        </div>
        <div className="pe-meta">
          <div className="pe-tags">
            <span className="pe-tag">{video.tag}</span>
            <span className="pe-date">{video.date}</span>
          </div>
          <p className="pe-title">{video.title}</p>
        </div>
      </div>
      {open && <VideoLightbox video={video} onClose={() => setOpen(false)} />}
    </>
  );
}

/* ── Section ── */
function PastEventsSection() {
  if (!PAST_VIDEOS.length) return null;

  return (
    <section id="past-events" className="section pe-section">
      <div className="container">
        <div className="section-head reveal">
          <div className="kicker"><Icon.Sparkle s={12} /> Past Events</div>
          <h2>The films before the wedding</h2>
          <p>Highlights, memories, and moments from the celebrations that led us here.</p>
        </div>
        <div className="pe-grid">
          {PAST_VIDEOS.map((v, i) => (
            <VideoCard key={v.id} video={v} animDelay={i * 0.08} />
          ))}
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { PastEventsSection });
