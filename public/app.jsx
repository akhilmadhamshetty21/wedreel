/* global React, ReactDOM */
const { useState, useEffect } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "palette": "classic",
  "intensity": 1,
  "showPetals": true,
  "showParticles": true,
  "bride": "Samyuktha",
  "groom": "Akhil",
  "hashtag": "#Sakhi",
  "dateDisplay": "June 20-27, 2026",
  "cityShort": "Hyderabad, India"
}/*EDITMODE-END*/;

const PALETTES = {
  classic: {
    "--maroon": "#5C1A24", "--maroon-deep": "#3F0F18", "--maroon-soft": "#7A2632",
    "--gold": "#C9A961", "--gold-2": "#E8C875", "--gold-deep": "#A8893F",
    "--blush": "#E8C4C4", "--blush-2": "#F2D7D2",
    "--ivory": "#FBF6EC", "--ivory-2": "#F4ECDC",
    "--champagne": "#E8D5B0", "--champagne-soft": "#F1E3C4",
  },
  emerald: {
    "--maroon": "#1F4D3A", "--maroon-deep": "#102E22", "--maroon-soft": "#2B6A50",
    "--gold": "#C9A961", "--gold-2": "#E8C875", "--gold-deep": "#A8893F",
    "--blush": "#D9E3D2", "--blush-2": "#EAF0E3",
    "--ivory": "#FBF6EC", "--ivory-2": "#F4ECDC",
    "--champagne": "#E8D5B0", "--champagne-soft": "#F1E3C4",
  },
  midnight: {
    "--maroon": "#2A1F4E", "--maroon-deep": "#15102E", "--maroon-soft": "#3D3068",
    "--gold": "#D49B7B", "--gold-2": "#E8B89A", "--gold-deep": "#A0664A",
    "--blush": "#E8C4C4", "--blush-2": "#F2D7D2",
    "--ivory": "#F7F1E8", "--ivory-2": "#EDE3D2",
    "--champagne": "#E0CFB2", "--champagne-soft": "#EEDFC4",
  },
  rose: {
    "--maroon": "#8A3A4A", "--maroon-deep": "#5C2030", "--maroon-soft": "#A45266",
    "--gold": "#D4B689", "--gold-2": "#E8CFA8", "--gold-deep": "#A88B5E",
    "--blush": "#F2D0CE", "--blush-2": "#F7E1DE",
    "--ivory": "#FCF6EE", "--ivory-2": "#F5EBDB",
    "--champagne": "#EBDABE", "--champagne-soft": "#F4E7CC",
  },
};

function applyPalette(name) {
  const p = PALETTES[name] || PALETTES.classic;
  Object.keys(p).forEach(k => document.documentElement.style.setProperty(k, p[k]));
}

function App() {
  const [t, setTweak] = window.useTweaks(TWEAK_DEFAULTS);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [photoCount, setPhotoCount] = useState(null);
  const [activeTab, setActiveTab] = useState("hero");

  useReveal();

  useEffect(() => { applyPalette(t.palette); }, [t.palette]);

  // Load real photo count for the gallery teaser
  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(d => setPhotoCount(d.total_photos ?? 0))
      .catch(() => { });
  }, [uploadOpen]); // refresh after each upload session closes

  const data = {
    bride: t.bride, groom: t.groom, hashtag: t.hashtag,
    dateDisplay: t.dateDisplay, cityShort: t.cityShort,
    weddingDateISO: "2026-06-24T20:52:00+05:30",
  };

  const navLinks = [
    { id: "hero", label: "Home" },
    { id: "events", label: "Events" },
    { id: "past-events", label: "Archives" },
    { id: "gallery", label: "Gallery", href: "/gallery" },
  ];

  function scrollTo(id, href) {
    if (href) { window.location.href = href; return; }
    setActiveTab(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      <div className="page-bg" />
      {t.showParticles && <Particles count={Math.round(22 * t.intensity)} />}
      {t.showPetals && <Petals count={Math.round(14 * t.intensity)} />}

      {/* Navigation */}
      <div className="nav-wrap">
        <div className="nav">
          <button className="nav-avatar" onClick={() => scrollTo("hero")} aria-label="Home">
            <img src="/couple.jpg" alt="S&A"
              onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "grid"; }}
            />
            <span className="nav-avatar-fallback">S&amp;A</span>
          </button>
          <div className="nav-links">
            {navLinks.map(l => (
              <button key={l.id}
                className={activeTab === l.id ? "current" : ""}
                onClick={() => scrollTo(l.id, l.href)}>{l.label}</button>
            ))}
          </div>
          <button className="nav-cta" onClick={() => setUploadOpen(true)}>Upload</button>
        </div>
      </div>

      {/* Sticky upload CTA (desktop only) */}
      <button className="sticky-upload" onClick={() => setUploadOpen(true)} aria-label="Upload Photos">
        <Icon.Upload s={16} />
        <span className="label">Upload Photos</span>
      </button>

      {/* Bottom tab bar (mobile only) */}
      <nav className="bottom-tab-bar">
        <button className={activeTab === "hero" ? "active" : ""} onClick={() => scrollTo("hero")}>
          <Icon.Home s={20} />
          <span>Home</span>
        </button>
        <button className={activeTab === "events" ? "active" : ""} onClick={() => scrollTo("events")}>
          <Icon.Cal s={20} />
          <span>Events</span>
        </button>
        <button className={activeTab === "past-events" ? "active" : ""} onClick={() => scrollTo("past-events")}>
          <Icon.Flame s={20} />
          <span>Archives</span>
        </button>
        <button onClick={() => scrollTo("gallery", "/gallery")}>
          <Icon.Grid s={20} />
          <span>Gallery</span>
        </button>
        <button className="tab-upload" onClick={() => setUploadOpen(true)}>
          <Icon.Camera s={20} />
          <span>Upload</span>
        </button>
      </nav>

      <main>
        <HeroSection data={data} onOpenUpload={() => setUploadOpen(true)} />
        <EventsSection />
        <PastEventsSection />
        <GallerySection onOpenUpload={() => setUploadOpen(true)} totalPhotos={photoCount} />
        <FooterSection data={data} />
      </main>

      {uploadOpen && (
        <UploadModal onClose={() => setUploadOpen(false)} onConfetti={() => setConfetti(true)} />
      )}
      <Confetti run={confetti} onDone={() => setConfetti(false)} />

      <window.TweaksPanel>
        <window.TweakSection label="Palette">
          <window.TweakSelect label="Color story" value={t.palette}
            onChange={v => setTweak("palette", v)}
            options={[
              { value: "classic", label: "Maroon & Gold" },
              { value: "emerald", label: "Emerald & Gold" },
              { value: "midnight", label: "Midnight & Rose Gold" },
              { value: "rose", label: "Dusty Rose & Champagne" },
            ]} />
        </window.TweakSection>
        <window.TweakSection label="Atmosphere">
          <window.TweakToggle label="Floating petals" value={t.showPetals} onChange={v => setTweak("showPetals", v)} />
          <window.TweakToggle label="Gold particles" value={t.showParticles} onChange={v => setTweak("showParticles", v)} />
          <window.TweakSlider label="Density" value={t.intensity} min={0.3} max={2} step={0.1}
            onChange={v => setTweak("intensity", v)} />
        </window.TweakSection>
        <window.TweakSection label="The couple">
          <window.TweakText label="Bride" value={t.bride} onChange={v => setTweak("bride", v)} />
          <window.TweakText label="Groom" value={t.groom} onChange={v => setTweak("groom", v)} />
          <window.TweakText label="Hashtag" value={t.hashtag} onChange={v => setTweak("hashtag", v)} />
          <window.TweakText label="Date" value={t.dateDisplay} onChange={v => setTweak("dateDisplay", v)} />
          <window.TweakText label="City" value={t.cityShort} onChange={v => setTweak("cityShort", v)} />
        </window.TweakSection>
      </window.TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
