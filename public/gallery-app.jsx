/* global React, ReactDOM */
const { useState: useStateGA, useEffect: useEffectGA } = React;

const GA_TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "palette": "classic",
  "intensity": 0.7,
  "showPetals": true,
  "showParticles": true
}/*EDITMODE-END*/;

const GA_PALETTES = {
  classic: { "--maroon": "#5C1A24", "--maroon-deep": "#3F0F18", "--maroon-soft": "#7A2632", "--gold": "#C9A961", "--gold-2": "#E8C875", "--gold-deep": "#A8893F", "--blush": "#E8C4C4", "--blush-2": "#F2D7D2", "--ivory": "#FBF6EC", "--ivory-2": "#F4ECDC", "--champagne": "#E8D5B0", "--champagne-soft": "#F1E3C4" },
  emerald: { "--maroon": "#1F4D3A", "--maroon-deep": "#102E22", "--maroon-soft": "#2B6A50", "--gold": "#C9A961", "--gold-2": "#E8C875", "--gold-deep": "#A8893F", "--blush": "#D9E3D2", "--blush-2": "#EAF0E3", "--ivory": "#FBF6EC", "--ivory-2": "#F4ECDC", "--champagne": "#E8D5B0", "--champagne-soft": "#F1E3C4" },
  midnight: { "--maroon": "#2A1F4E", "--maroon-deep": "#15102E", "--maroon-soft": "#3D3068", "--gold": "#D49B7B", "--gold-2": "#E8B89A", "--gold-deep": "#A0664A", "--blush": "#E8C4C4", "--blush-2": "#F2D7D2", "--ivory": "#F7F1E8", "--ivory-2": "#EDE3D2", "--champagne": "#E0CFB2", "--champagne-soft": "#EEDFC4" },
  rose: { "--maroon": "#8A3A4A", "--maroon-deep": "#5C2030", "--maroon-soft": "#A45266", "--gold": "#D4B689", "--gold-2": "#E8CFA8", "--gold-deep": "#A88B5E", "--blush": "#F2D0CE", "--blush-2": "#F7E1DE", "--ivory": "#FCF6EE", "--ivory-2": "#F5EBDB", "--champagne": "#EBDABE", "--champagne-soft": "#F4E7CC" },
};

function applyGAPalette(name) {
  const p = GA_PALETTES[name] || GA_PALETTES.classic;
  Object.keys(p).forEach(k => document.documentElement.style.setProperty(k, p[k]));
}

function GalleryApp() {
  const [t, setTweak] = window.useTweaks(GA_TWEAK_DEFAULTS);
  const [uploadOpen, setUploadOpen] = useStateGA(false);
  const [confetti, setConfetti] = useStateGA(false);

  const adminKey = new URLSearchParams(window.location.search).get('key') || '';
  const isAdmin = adminKey.length > 0;

  useReveal();
  useEffectGA(() => { applyGAPalette(t.palette); }, [t.palette]);

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Events", href: "/#events" },
    { label: "Archives", href: "/#past-events" },
    { label: "Gallery", href: null },
  ];

  function navigate(l) {
    if (l.href) { window.location.href = l.href; return; }
  }

  return (
    <>
      <div className="page-bg" />
      {t.showParticles && <Particles count={Math.round(18 * t.intensity)} />}
      {t.showPetals && <Petals count={Math.round(10 * t.intensity)} />}

      {/* Nav */}
      <div className="nav-wrap">
        <div className="nav">
          <button className="nav-avatar" onClick={() => window.location.href = "/"} aria-label="Home">
            <img src="/couple.jpg" alt="S&A"
              onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "grid"; }}
            />
            <span className="nav-avatar-fallback">S&amp;A</span>
          </button>
          <div className="nav-links">
            {navLinks.map(l => (
              <button key={l.label} onClick={() => navigate(l)}
                className={!l.href ? "current" : ""}>
                {l.label}
              </button>
            ))}
          </div>
          <button className="nav-cta" onClick={() => setUploadOpen(true)}>Upload</button>
        </div>
      </div>

      {/* Sticky upload fab (desktop only) */}
      <button className="sticky-upload" onClick={() => setUploadOpen(true)} aria-label="Upload Photos">
        <Icon.Upload s={16} />
        <span className="label">Upload Photos</span>
      </button>

      {/* Bottom tab bar (mobile only) */}
      <nav className="bottom-tab-bar">
        <button onClick={() => window.location.href = "/"}>
          <Icon.Home s={22} />
          <span>Home</span>
        </button>
        <button onClick={() => window.location.href = "/#events"}>
          <Icon.Cal s={22} />
          <span>Events</span>
        </button>
        <button className="active">
          <Icon.Grid s={22} />
          <span>Gallery</span>
        </button>
        <button className="tab-upload" onClick={() => setUploadOpen(true)}>
          <Icon.Camera s={22} />
          <span>Upload</span>
        </button>
      </nav>

      {isAdmin && (
        <div className="admin-banner">
          🔐 Admin mode — trash icons are visible only to you
        </div>
      )}

      <main className="gallery-main" style={{ paddingTop: isAdmin ? 116 : 86 }}>
        <FullGallery onOpenUpload={() => setUploadOpen(true)} isAdmin={isAdmin} adminKey={adminKey} />
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
      </window.TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<GalleryApp />);
