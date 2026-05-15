/* global React */
const { useState: useStateS, useEffect: useEffectS, useMemo: useMemoS } = React;

/* ============================================================
   Story Timeline
============================================================ */
const STORY = [
  {
    year: "Summer 2019", title: "Where it began",
    body: "A mutual friend's birthday in Goa. A late-night card game and a shared playlist that ran until sunrise.", idx: 1
  },
  {
    year: "Winter 2021", title: "The long road",
    body: "Two cities, three time zones, and an embarrassing number of voice notes — somehow it only made things better.", idx: 2
  },
  {
    year: "Monsoon 2024", title: "The yes",
    body: "On a quiet evening at the Mehrangarh viewpoint, with marigolds and the first rain of the year.", idx: 3
  },
  {
    year: "Now", title: "Forever",
    body: "We can't wait to celebrate with the people who made us who we are.", idx: 4
  },
];

function StorySection() {
  return (
    <section id="story" style={{ background: "linear-gradient(180deg,transparent,rgba(241,227,196,0.35))" }}>
      <div className="container">
        <div className="section-head reveal">
          <div className="kicker" style={{ justifyContent: "center" }}><Icon.Heart s={12} /> Our Story</div>
          <h2>A few years, in pictures</h2>
          <p>The little moments that brought us here.</p>
        </div>
        <div className="story-timeline">
          {STORY.map((s, i) => (
            <div key={i} className="story-item reveal">
              <div className="story-img">
                <PhotoPlaceholder idx={s.idx} />
              </div>
              <div>
                <div className="story-year">{s.year}</div>
                <h3 className="story-title">{s.title}</h3>
                <p className="story-body">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   Gallery Teaser — shows real uploaded photos + links to /gallery
============================================================ */
function GallerySection({ onOpenUpload, totalPhotos }) {
  const [teaserPhotos, setTeaserPhotos] = useStateS([]);
  const [total, setTotal] = useStateS(totalPhotos ?? 0);
  const [loaded, setLoaded] = useStateS(false);

  useEffectS(() => {
    fetch('/api/photos?sort=recent&limit=9')
      .then(r => r.json())
      .then(data => {
        setTeaserPhotos(data.photos || []);
        setTotal(data.total ?? data.photos?.length ?? 0);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  // Keep total in sync if parent updates it
  useEffectS(() => {
    if (totalPhotos !== null && totalPhotos !== undefined) setTotal(totalPhotos);
  }, [totalPhotos]);

  const EVENT_IDS = ["haldi", "mehendi", "sangeet", "wedding", "reception"];

  return (
    <section id="gallery">
      <div className="container">
        <div className="section-head reveal">
          <div className="kicker" style={{ justifyContent: "center" }}><Icon.Sparkle s={12} /> Live Gallery</div>
          <h2>Memories, as they happen</h2>
          <p>A glimpse of what's flowing in. Open the full memory wall to filter by ceremony or guest face.</p>
        </div>

        <div className="teaser-grid reveal">
          {/* Show real photos if available, otherwise placeholder tiles */}
          {loaded && teaserPhotos.length > 0
            ? teaserPhotos.slice(0, 9).map((p, i) => (
              <TeaserPhoto key={p.id} photo={p} idx={i} />
            ))
            : Array.from({ length: 9 }, (_, i) => (
              <PlaceholderTile key={i} idx={i} eventId={EVENT_IDS[i % EVENT_IDS.length]} />
            ))
          }

          {/* CTA panel */}
          <div className="teaser-cta reveal">
            <div className="teaser-cta-inner">
              <div className="teaser-count">
                <span className="n">{total > 0 ? total : "0"}+</span>
                <span className="l">Photos &amp; counting</span>
              </div>
              <p>From the haldi at sunrise to the reception under the stars — every memory uploaded by family and friends.</p>
              <a className="btn btn-primary" href="/gallery">
                <Icon.Sparkle s={14} /> Open Full Gallery
              </a>
              <button className="btn btn-ghost" onClick={onOpenUpload} style={{ marginTop: 10 }}>
                <Icon.Upload s={14} /> Add Your Photos
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TeaserPhoto({ photo, idx }) {
  const [err, setErr] = useStateS(false);
  const eventName = (window.EVENT_DATA || []).find(e => (photo.event_ids || []).includes(e.id))?.name || "";
  return (
    <div className={"teaser-item teaser-" + (idx + 1)}>
      {err
        ? <PhotoPlaceholder idx={idx} eventId={(photo.event_ids || [])[0]} />
        : <img src={photo.url} alt={photo.orig_name || "photo"}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          loading="lazy"
          onError={() => setErr(true)} />
      }
      <div className="teaser-overlay">
        {eventName && <span className="photo-tag-badge">{eventName}</span>}
      </div>
    </div>
  );
}

function PlaceholderTile({ idx, eventId }) {
  return (
    <div className={"teaser-item teaser-" + (idx + 1)}>
      <PhotoPlaceholder idx={idx} eventId={eventId} />
    </div>
  );
}

/* ============================================================
   Footer
============================================================ */
function FooterSection({ data }) {
  return (
    <footer className="foot reveal">
      <Mandala className="tl" color="#A8893F" />
      <div className="container" style={{ position: "relative", zIndex: 2 }}>
        <div className="monogram-big">S&amp;A</div>
        <h4>{data.bride} &amp; {data.groom}</h4>
        <p>{data.dateDisplay} · {data.cityShort}</p>
        <div className="by">made with love · {data.hashtag}</div>
        <div style={{
          marginTop: 38, opacity: 0.5, fontSize: 11, letterSpacing: ".24em",
          textTransform: "uppercase", color: "var(--ink-soft)"
        }}>
          For queries · samyukthaakhil2127@gmail.com
        </div>
      </div>
    </footer>
  );
}

Object.assign(window, { StorySection, GallerySection, FooterSection });
