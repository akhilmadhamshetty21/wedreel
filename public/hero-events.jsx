/* global React */
const { useState: useStateH, useEffect: useEffectH, useMemo: useMemoH } = React;

/* ============================================================
   Hero with countdown + background carousel
============================================================ */
function HeroSection({ data, onOpenUpload }) {
  const [bgIdx, setBgIdx] = useStateH(0);
  const slides = [0, 1, 2, 3];

  useEffectH(() => {
    const t = setInterval(() => setBgIdx(i => (i + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, []);

  const target = useMemoH(() => new Date(data.weddingDateISO), [data.weddingDateISO]);
  const [now, setNow] = useStateH(Date.now());
  useEffectH(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const diff = Math.max(0, target.getTime() - now);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);

  const pad = n => String(n).padStart(2, "0");

  return (
    <section className="hero" id="hero">
      <div className="hero-bg">
        {slides.map((s, i) => (
          <div key={s} className={"hero-bg-slide " + (i === bgIdx ? "active" : "")}>
            <HeroBgArt idx={s} />
          </div>
        ))}
      </div>
      <Mandala className="tl" />
      <Mandala className="br" />

      <div className="hero-inner reveal">
        <div className="kicker" style={{ justifyContent: "center" }}>
          <Icon.Sparkle s={12} /> The Wedding of
        </div>
        <h1 className="name" style={{ marginTop: 18 }}>{data.bride}</h1>
        <div className="ampersand">&amp;</div>
        <h1 className="name">{data.groom}</h1>

        <div className="date-row">
          <Icon.Cal s={14} />
          <span>{data.dateDisplay}</span>
          <Icon.Pin s={14} />
          <span>{data.cityShort}</span>
        </div>

        <div className="hashtag">{data.hashtag}</div>

        <div className="countdown">
          <div className="cd-cell">
            <div className="n">{pad(days)}</div>
            <div className="l">Days</div>
          </div>
          <div className="cd-cell">
            <div className="n">{pad(hours)}</div>
            <div className="l">Hours</div>
          </div>
          <div className="cd-cell">
            <div className="n">{pad(mins)}</div>
            <div className="l">Minutes</div>
          </div>
          <div className="cd-cell">
            <div className="n">{pad(secs)}</div>
            <div className="l">Seconds</div>
          </div>
        </div>

        <div style={{ marginTop: 36, display: "inline-flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <button className="btn btn-primary" onClick={onOpenUpload}>
            <Icon.Upload s={14} /> Upload Photos
          </button>
          <button className="btn btn-ghost" onClick={() => {
            document.getElementById("events").scrollIntoView({ behavior: "smooth", block: "start" });
          }}>
            <Icon.Cal s={14} /> View Events
          </button>
        </div>
      </div>
    </section>
  );
}

function HeroBgArt({ idx }) {
  // Layered radial gradients evoking warm wedding scenes
  const scenes = [
    { c1: "#5C1A24", c2: "#A8893F", c3: "#E8C875" },
    { c1: "#E8C4C4", c2: "#A8893F", c3: "#F2D7D2" },
    { c1: "#3F0F18", c2: "#6B1F2E", c3: "#C9A961" },
    { c1: "#F1E3C4", c2: "#E8C875", c3: "#D89B9B" },
  ];
  const s = scenes[idx % scenes.length];
  return (
    <div style={{
      position: "absolute", inset: 0,
      background:
        `radial-gradient(60% 50% at 30% 30%, ${s.c2}80, transparent 65%),
         radial-gradient(50% 50% at 80% 60%, ${s.c1}55, transparent 65%),
         radial-gradient(40% 40% at 50% 80%, ${s.c3}66, transparent 65%),
         linear-gradient(135deg, ${s.c2}30, ${s.c1}30)`
    }}/>
  );
}

/* ============================================================
   Events Timeline
============================================================ */
const EVENT_DATA = [
  { id: "haldi", name: "Haldi", icon: "Flame", color: "#E8C875",
    date: "Sat · June 20, 2026", time: "9:00 AM onwards",
    dress: "Yellow / Traditional", venue: "Village Arc Resort",
    address: "Village Arc Resort, Hyderabad",
    mapUrl: "https://maps.app.goo.gl/tJg8cNmUs9SdseCb9" },
  { id: "mehendi", name: "Mehendi", icon: "Leaf", color: "#9DBF7C",
    date: "Sat · June 20, 2026", time: "3:00 PM onwards",
    dress: "Green / Floral Ethnic", venue: "Village Arc Resort",
    address: "Village Arc Resort, Hyderabad",
    mapUrl: "https://maps.app.goo.gl/tJg8cNmUs9SdseCb9" },
  { id: "sangeet", name: "Sangeet", icon: "Music", color: "#D89B9B",
    date: "Sat · June 20, 2026", time: "8:00 PM onwards",
    dress: "Glam / Indo-Western", venue: "Village Arc Resort",
    address: "Village Arc Resort, Hyderabad",
    mapUrl: "https://maps.app.goo.gl/tJg8cNmUs9SdseCb9" },
  { id: "wedding", name: "Wedding Ceremony", icon: "Crown", color: "#C9A961",
    date: "Wed · June 24, 2026", time: "8:52 PM Muhurat",
    dress: "Traditional Indian / Pastels", venue: "Tirumala",
    address: "Tirumala, Andhra Pradesh",
    mapUrl: "https://maps.app.goo.gl/sH1b7ETjLt6gjVxF9" },
  { id: "reception", name: "Reception", icon: "Diamond", color: "#E8C4C4",
    date: "Sat · June 27, 2026", time: "7:00 PM onwards",
    dress: "Formal / Royal Ethnic", venue: "Hyndava Nimantran",
    address: "Hyndava Nimantran, Hyderabad",
    mapUrl: "https://maps.app.goo.gl/GRVhNybgqcvCgt7V6" },
];

function EventCard({ ev, side }) {
  const [expanded, setExpanded] = useStateH(false);
  const IconC = Icon[ev.icon];
  const mapsUrl = ev.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ev.address)}`;
  return (
    <div className={"event-card " + (expanded ? "expanded" : "")}>
      <div className="event-head">
        <div className="event-icon" style={{ background: `linear-gradient(135deg, ${ev.color}, var(--gold-deep))` }}>
          <IconC s={22} />
        </div>
        <div>
          <div className="eyebrow" style={{ marginBottom: 2 }}>Ceremony 0{EVENT_DATA.indexOf(ev) + 1}</div>
          <div className="event-name">{ev.name}</div>
        </div>
      </div>
      <div className="event-meta">
        <div>
          <div className="label"><Icon.Cal s={10} style={{ verticalAlign: "middle", marginRight: 4 }}/> Date</div>
          <div className="val">{ev.date}</div>
        </div>
        <div>
          <div className="label"><Icon.Clock s={10} style={{ verticalAlign: "middle", marginRight: 4 }}/> Time</div>
          <div className="val">{ev.time}</div>
        </div>
        <div>
          <div className="label">Dress Code</div>
          <div className="val">{ev.dress}</div>
        </div>
        <div>
          <div className="label">Venue</div>
          <div className="val">{ev.venue}</div>
        </div>
      </div>
      <div className="event-actions">
        <a className="btn btn-gold" href={mapsUrl} target="_blank" rel="noreferrer"
           style={{ padding: "10px 16px", fontSize: 11 }}
           onClick={(e) => { e.stopPropagation(); }}>
          <Icon.Pin s={14} /> Navigate Now
        </a>
        <button className="btn btn-ghost" style={{ padding: "10px 16px", fontSize: 11 }}
                onClick={() => setExpanded(v => !v)}>
          {expanded ? "Hide Map" : "Preview Map"}
        </button>
      </div>
      <div className="map-preview">
        <div className="map-tile">
          <svg className="streets" width="100%" height="100%" viewBox="0 0 200 140" preserveAspectRatio="none">
            <line x1="0" y1="30" x2="200" y2="50" />
            <line x1="0" y1="90" x2="200" y2="70" />
            <line x1="30" y1="0" x2="50" y2="140" />
            <line x1="130" y1="0" x2="150" y2="140" />
            <line x1="80" y1="0" x2="100" y2="140" />
            <line x1="0" y1="120" x2="200" y2="115" />
            <rect x="55" y="55" width="34" height="30" fill="rgba(168,137,63,.12)" stroke="rgba(168,137,63,.4)" />
            <rect x="110" y="35" width="28" height="22" fill="rgba(232,196,196,.18)" stroke="rgba(168,137,63,.4)" />
            <rect x="135" y="80" width="40" height="36" fill="rgba(168,137,63,.10)" stroke="rgba(168,137,63,.4)" />
          </svg>
          <div className="map-pin">
            <svg width="28" height="34" viewBox="0 0 24 30" fill="currentColor">
              <path d="M12 0a10 10 0 0 0-10 10c0 8 10 20 10 20s10-12 10-20A10 10 0 0 0 12 0Z" />
              <circle cx="12" cy="10" r="4" fill="var(--ivory)" />
            </svg>
          </div>
          <div style={{ position: "absolute", left: 12, bottom: 10, padding: "6px 10px",
                        borderRadius: 999, background: "rgba(251, 246, 236, .85)",
                        fontSize: 11, fontWeight: 500, color: "var(--maroon-deep)" }}>
            {ev.venue}
          </div>
        </div>
      </div>
    </div>
  );
}

function EventsSection() {
  return (
    <section id="events">
      <div className="container">
        <div className="section-head reveal">
          <div className="kicker" style={{ justifyContent: "center" }}><Icon.Sparkle s={12}/> Three Days of Celebration</div>
          <h2>Wedding Events</h2>
          <p>Join us for each chapter of our story — from the haldi at sunrise to the reception under the stars.</p>
        </div>

        <div className="timeline">
          {EVENT_DATA.map((ev, i) => {
            const side = i % 2 === 0 ? "left" : "right";
            return (
              <div key={ev.id} className={"event-row reveal " + side}>
                <div className={"spacer-l"} />
                <div className="dot" style={{ gridColumn: 2 }} />
                <div className={"ec"}>
                  <EventCard ev={ev} side={side} />
                </div>
                <div className={"spacer-r"} />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { HeroSection, EventsSection, EVENT_DATA });
