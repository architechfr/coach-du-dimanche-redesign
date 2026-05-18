/* global React, CDD_CLUB, CDD_PLAYERS, CDD_NEXT_MATCH, CDD_LIVE_MATCH, CDD_LAST_MATCHES, CDD_STANDINGS, CDD_TOP_SCORERS, CDD_CONVO, CDD_FORMATIONS, CDD_OBSERVATIONS, CDD_POS_COLOR, FutCard, POSITION_LABEL */

/* ============================================================
   SCREEN — Home / Dashboard
   ============================================================ */

const { useState, useEffect, useMemo } = React;

// ---------- Tiny utility components ----------
function CountdownPill({ days }) {
  return (
    <div className="cd-pill">
      <span className="num">{days}</span>
      <em>jour{days>1?"s":""}</em>
    </div>
  );
}

function FormDot({ r, big }) {
  const cls = r === "W" ? "fd-w" : r === "D" ? "fd-d" : "fd-l";
  return <span className={`fd ${cls} ${big?"fd-big":""}`}>{r}</span>;
}

// ---------- HOME ----------
function ScreenHome({ go, tweaks }) {
  const next = CDD_NEXT_MATCH;
  const last = CDD_LAST_MATCHES;
  const club = CDD_CLUB;
  // Pick top 2 stars: highest OVR among starters, fallback to first 2 players
  const starters = CDD_PLAYERS.filter(p => p.isStarter);
  const sorted = [...(starters.length ? starters : CDD_PLAYERS)].sort((a,b) => (b.stats?.ovr||0) - (a.stats?.ovr||0));
  const topScorer = sorted[0];
  const topAssist = sorted[1];

  return (
    <div className="scr scr-home fade-in" data-screen-label="01 Home">

      {/* HERO — next match */}
      <div className={`home-hero hero-${tweaks.hero}`}>
        <div className="home-hero-bg" />
        <div className="home-hero-grad" />
        <div className="home-hero-noise" />

        <div className="home-hero-top">
          <div className="chip live">{`J-${next.daysLeft} · À VENIR`}</div>
          <button className="hero-share" aria-label="Partager" onClick={() => go("share")}>↗</button>
        </div>

        <div className="home-hero-vs">
          <div className="hero-club hero-club-home">
            <div className="hero-badge me" aria-hidden="true">F</div>
            <div className="hero-club-name">{next.home}</div>
          </div>
          <div className="hero-vs">
            <span>VS</span>
            <div className="hero-when num">{next.date}</div>
          </div>
          <div className="hero-club hero-club-away">
            <div className="hero-badge them" aria-hidden="true">P</div>
            <div className="hero-club-name">{next.away}</div>
          </div>
        </div>

        <div className="home-hero-meta">
          <span>{next.venue}</span>
          <span className="sep">•</span>
          <span>{next.weather}</span>
        </div>

        <div className="home-hero-cta">
          <button className="btn-cta" onClick={() => go("lineup")}>
            <span>PRÉPARER LA COMPO</span>
            <span className="arr">→</span>
          </button>
        </div>
      </div>

      {/* QUICK TILES — full grid of all sections */}
      <div className="sec-h"><span className="t">Hub</span><span className="a">Tout en un coup d'œil</span></div>
      <div className="home-tiles home-tiles-grid">
        <button className="tile tile-prep" onClick={() => go("prep")}>
          <span className="tile-ic">🧠</span>
          <span className="tile-t">Prépa match</span>
          <span className="tile-s">J-{next.daysLeft} · adversaire</span>
        </button>
        <button className="tile tile-convoc" onClick={() => go("convocations")}>
          <span className="tile-ic">📋</span>
          <span className="tile-t">Convocations</span>
          <span className="tile-s">{CDD_CONVO?.starters.length + CDD_CONVO?.bench.length || 0} convoqués</span>
        </button>
        <button className="tile tile-effectif" onClick={() => go("effectif")}>
          <span className="tile-ic">👥</span>
          <span className="tile-t">Effectif</span>
          <span className="tile-s">{CDD_PLAYERS.length} joueurs</span>
        </button>
        <button className="tile tile-lineup" onClick={() => go("lineup")}>
          <span className="tile-ic">⚽</span>
          <span className="tile-t">Compo</span>
          <span className="tile-s">Feuille de match</span>
        </button>
        <button className="tile tile-match" onClick={() => go("match")}>
          <span className="tile-ic" style={{color:"#ef4444"}}>●</span>
          <span className="tile-t">Match live</span>
          <span className="tile-s">Score · timeline</span>
        </button>
        <button className="tile tile-champ" onClick={() => go("results")}>
          <span className="tile-ic">🏆</span>
          <span className="tile-t">Championnat</span>
          <span className="tile-s">{club.rank ? <>{club.rank}<sup>e</sup> · {club.pts} pts</> : 'FFF live'}</span>
        </button>
        <button className="tile tile-fiche" onClick={() => go("effectif")}>
          <span className="tile-ic">📊</span>
          <span className="tile-t">Fiches joueurs</span>
          <span className="tile-s">Stats · obs · niveau</span>
        </button>
        <button className="tile tile-vote" onClick={() => go("vote")}>
          <span className="tile-ic">⭐</span>
          <span className="tile-t">Vote post-match</span>
          <span className="tile-s">Notes joueurs</span>
        </button>
      </div>

      {/* SECONDARY tiles — share + admin */}
      <div className="sec-h"><span className="t">Partage & Outils</span></div>
      <div className="home-tiles home-tiles-grid">
        <button className="tile tile-lecteur" onClick={() => go("lecteur")}>
          <span className="tile-ic">👀</span>
          <span className="tile-t">Page parents</span>
          <span className="tile-s">Lecteur public</span>
        </button>
        <button className="tile tile-cvp" onClick={() => go("share")}>
          <span className="tile-ic">↗</span>
          <span className="tile-t">Partager</span>
          <span className="tile-s">WhatsApp · SMS · QR</span>
        </button>
        <button className="tile tile-arb" onClick={() => go("arb")}>
          <span className="tile-ic">🟨</span>
          <span className="tile-t">Mode arbitre</span>
          <span className="tile-s">Cartons · chrono</span>
        </button>
        <button className="tile tile-transfert" onClick={() => go("transfert")}>
          <span className="tile-ic">⇄</span>
          <span className="tile-t">Transfert</span>
          <span className="tile-s">Donner équipe</span>
        </button>
        <button className="tile tile-sync" onClick={() => go("sync")}>
          <span className="tile-ic">☁️</span>
          <span className="tile-t">Sync cloud</span>
          <span className="tile-s">Multi-club · Firestore</span>
        </button>
        <button className="tile tile-set" onClick={() => go("set")}>
          <span className="tile-ic">⚙️</span>
          <span className="tile-t">Réglages</span>
          <span className="tile-s">Apparence · sons</span>
        </button>
      </div>

      {/* SEASON SNAPSHOT */}
      <div className="sec-h"><span className="t">Saison · ranking</span><button className="a" onClick={() => go("results")}>Voir tout</button></div>
      <div className="snap-card">
        <div className="snap-rank">
          <div className="snap-rank-n num">{club.rank}<sup>e</sup></div>
          <div className="snap-rank-l">{club.league}</div>
        </div>
        <div className="snap-grid">
          <div><b className="num">{club.played}</b><em>J</em></div>
          <div><b className="num">{club.W}</b><em>V</em></div>
          <div><b className="num">{club.D}</b><em>N</em></div>
          <div><b className="num">{club.L}</b><em>D</em></div>
          <div><b className="num">{club.gf}:{club.ga}</b><em>BUTS</em></div>
          <div><b className="num">{club.pts}</b><em>PTS</em></div>
        </div>
        <div className="snap-form">
          <span className="snap-form-l">FORME</span>
          {club.form.map((r,i) => <FormDot key={i} r={r}/>)}
        </div>
      </div>

      {/* TOP PERFORMERS */}
      <div className="sec-h"><span className="t">Tops du moment</span><button className="a" onClick={() => go("effectif")}>Effectif →</button></div>
      <div className="home-tops">
        {topScorer && <FutCard player={topScorer} size="md" onClick={() => go("fiche", topScorer)} />}
        {topAssist && <FutCard player={topAssist} size="md" onClick={() => go("fiche", topAssist)} />}
      </div>

      {/* DERNIERS MATCHS */}
      <div className="sec-h"><span className="t">Derniers matchs</span><button className="a" onClick={() => go("results")}>Tous →</button></div>
      <div className="lm-list">
        {last.map((m,i) => (
          <button className={`lm-card lm-${m.result.toLowerCase()}`} key={i} onClick={() => go("fiche-match")}>
            <div className="lm-result"><FormDot r={m.result} big/></div>
            <div className="lm-main">
              <div className="lm-opp">
                <span className="lm-venue">{m.venue}</span>
                <span className="lm-club">{m.opp}</span>
              </div>
              <div className="lm-scorers">{m.scorers.join(" · ")}</div>
            </div>
            <div className="lm-score num">
              <span>{m.score[0]}</span><i>–</i><span>{m.score[1]}</span>
            </div>
            <div className="lm-date">{m.date}</div>
          </button>
        ))}
      </div>

    </div>
  );
}

window.ScreenHome = ScreenHome;
