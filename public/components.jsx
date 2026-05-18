/* global React */
const { useState, useEffect, useRef, useMemo, useCallback } = React;

/* ============================================================
   Background atmosphere: gold particles + floating petals
============================================================ */
function Particles({ count = 22 }) {
  const items = useMemo(() => Array.from({ length: count }, (_, i) => {
    const size = 2 + Math.random() * 4;
    return {
      left: Math.random() * 100,
      size,
      dur: 14 + Math.random() * 16,
      delay: -Math.random() * 20,
    };
  }), [count]);
  return (
    <div className="particles" aria-hidden="true">
      {items.map((p, i) => (
        <span key={i} className="particle" style={{
          left: p.left + "%",
          bottom: -20,
          width: p.size, height: p.size,
          animationDuration: p.dur + "s",
          animationDelay: p.delay + "s",
        }} />
      ))}
    </div>
  );
}

function Petals({ count = 14 }) {
  const colors = ["#E8C4C4", "#F2D7D2", "#E8D5B0", "#E8C875", "#D89B9B"];
  const items = useMemo(() => Array.from({ length: count }, () => ({
    left: Math.random() * 100,
    color: colors[Math.floor(Math.random() * colors.length)],
    dur: 16 + Math.random() * 14,
    delay: -Math.random() * 24,
    scale: 0.6 + Math.random() * 0.7,
    rot: Math.random() * 360,
  })), [count]);
  return (
    <div className="petals" aria-hidden="true">
      {items.map((p, i) => (
        <svg key={i} className="petal" viewBox="0 0 24 24" style={{
          left: p.left + "%",
          animationDuration: p.dur + "s",
          animationDelay: p.delay + "s",
          transform: `scale(${p.scale}) rotate(${p.rot}deg)`,
          width: 20 * p.scale,
          height: 20 * p.scale,
        }}>
          <path d="M12 2 C 16 6, 18 10, 12 22 C 6 10, 8 6, 12 2 Z" fill={p.color} opacity="0.85" />
          <path d="M12 6 C 13 10, 13 14, 12 18 C 11 14, 11 10, 12 6 Z" fill="rgba(255,255,255,0.4)" />
        </svg>
      ))}
    </div>
  );
}

/* ============================================================
   Mandala SVG (geometric, no figurative content)
============================================================ */
function Mandala({ className, color = "#A8893F" }) {
  const petals = 12;
  const arr = Array.from({ length: petals }, (_, i) => i);
  return (
    <svg className={"mandala " + className} viewBox="0 0 200 200" fill="none" stroke={color} strokeWidth="0.6">
      <circle cx="100" cy="100" r="98" />
      <circle cx="100" cy="100" r="82" strokeDasharray="2 3" />
      <circle cx="100" cy="100" r="62" />
      <circle cx="100" cy="100" r="40" strokeDasharray="1 2" />
      <circle cx="100" cy="100" r="20" />
      <circle cx="100" cy="100" r="6" fill={color} />
      {arr.map(i => {
        const a = (i / petals) * Math.PI * 2;
        const x1 = 100 + Math.cos(a) * 22;
        const y1 = 100 + Math.sin(a) * 22;
        const x2 = 100 + Math.cos(a) * 80;
        const y2 = 100 + Math.sin(a) * 80;
        const xm = 100 + Math.cos(a) * 50;
        const ym = 100 + Math.sin(a) * 50;
        const perp = a + Math.PI / 2;
        const w = 14;
        return (
          <g key={i}>
            <path d={`M${x1} ${y1} Q ${xm + Math.cos(perp)*w} ${ym + Math.sin(perp)*w} ${x2} ${y2} Q ${xm - Math.cos(perp)*w} ${ym - Math.sin(perp)*w} ${x1} ${y1} Z`} />
            <circle cx={x2} cy={y2} r="2.5" fill={color} fillOpacity="0.5" />
          </g>
        );
      })}
      {arr.map(i => {
        const a = ((i + 0.5) / petals) * Math.PI * 2;
        const x = 100 + Math.cos(a) * 92;
        const y = 100 + Math.sin(a) * 92;
        return <circle key={"o"+i} cx={x} cy={y} r="2" fill={color} fillOpacity="0.5" />;
      })}
    </svg>
  );
}

/* ============================================================
   Reveal-on-scroll
============================================================ */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/* ============================================================
   Confetti burst
============================================================ */
function Confetti({ run, onDone }) {
  useEffect(() => {
    if (run) {
      const t = setTimeout(() => onDone && onDone(), 2800);
      return () => clearTimeout(t);
    }
  }, [run]);
  if (!run) return null;
  const colors = ["#C9A961", "#E8C875", "#5C1A24", "#E8C4C4", "#F2D7D2", "#A8893F"];
  const bits = Array.from({ length: 80 }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.4,
    rot: Math.random() * 360,
    color: colors[i % colors.length],
    size: 6 + Math.random() * 8,
  }));
  return (
    <div className="confetti" aria-hidden="true">
      {bits.map((b, i) => (
        <i key={i} style={{
          left: b.left + "%",
          background: b.color,
          width: b.size,
          height: b.size * 1.8,
          transform: `rotate(${b.rot}deg)`,
          animationDelay: b.delay + "s",
        }} />
      ))}
    </div>
  );
}

/* ============================================================
   Decorative icons (geometric)
============================================================ */
const Icon = {
  Upload: ({ s = 18 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 17V4" /><path d="M6 10l6-6 6 6" /><path d="M5 20h14" />
    </svg>
  ),
  QR: ({ s = 18 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3M21 14v3M14 21h3M21 21v0M17 17v4" />
    </svg>
  ),
  Pin: ({ s = 18 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s7-7 7-12a7 7 0 0 0-14 0c0 5 7 12 7 12Z" /><circle cx="12" cy="10" r="2.5" />
    </svg>
  ),
  Clock: ({ s = 16 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
    </svg>
  ),
  Cal: ({ s = 16 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" />
    </svg>
  ),
  Sparkle: ({ s = 14 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l1.6 6.4L20 10l-6.4 1.6L12 18l-1.6-6.4L4 10l6.4-1.6L12 2z" />
    </svg>
  ),
  Heart: ({ s = 18 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9Z" />
    </svg>
  ),
  Music: ({ s = 18 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
    </svg>
  ),
  Flame: ({ s = 18 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3s5 4 5 9a5 5 0 0 1-10 0c0-2 1-3 1-3s1 2 3 2c0-3-3-5 1-8Z" />
    </svg>
  ),
  Leaf: ({ s = 18 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 19c0-9 7-14 16-14 0 9-5 16-14 16-2 0-2-1-2-2Z" /><path d="M5 19c5-5 8-7 12-9" />
    </svg>
  ),
  Crown: ({ s = 18 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8l4 4 5-7 5 7 4-4-2 11H5L3 8Z" /><path d="M5 19h14" />
    </svg>
  ),
  Diamond: ({ s = 18 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M6 3h12l4 6-10 12L2 9l4-6Z" /><path d="M6 3l3 6h6l3-6M2 9h20M9 9l3 12 3-12" />
    </svg>
  ),
  Menu: ({ s = 18 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  ),
  Close: ({ s = 18 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  ),
  Check: ({ s = 16 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12l5 5L20 7" />
    </svg>
  ),
  Camera: ({ s = 18 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 4h-5l-2 3H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3.5l-2-3Z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  ),
  Home: ({ s = 18 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5L12 3l9 7.5V21a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10.5Z" />
      <path d="M9 22V13h6v9" />
    </svg>
  ),
  Grid: ({ s = 18 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" /><rect x="13" y="13" width="8" height="8" rx="1.5" />
    </svg>
  ),
};

Object.assign(window, { Particles, Petals, Mandala, useReveal, Confetti, Icon });
