/* global React */
/* ============================================================
   FUT-style Player Card · multiple rarities
   ============================================================ */

const { useState } = React;

// ----------------- Rarity surfaces -----------------
const RARITY = {
  bronze: {
    bg: "linear-gradient(160deg, #6b3e1a 0%, #8a5224 35%, #b3702f 60%, #5b3416 100%)",
    ink: "#fde9c8",
    stroke: "rgba(255,200,140,.45)",
    glow: "rgba(180,110,40,.5)",
    badgeBg: "linear-gradient(180deg,#a8662b,#5b3416)",
    label: "BRONZE",
  },
  silver: {
    bg: "linear-gradient(160deg, #4a5260 0%, #7c8898 38%, #c4cfdc 60%, #4a5260 100%)",
    ink: "#0a0e14",
    stroke: "rgba(255,255,255,.55)",
    glow: "rgba(200,210,225,.5)",
    badgeBg: "linear-gradient(180deg,#c4cfdc,#5a6678)",
    label: "ARGENT",
  },
  gold: {
    bg: "linear-gradient(160deg, #6e5414 0%, #c79b25 35%, #f5d56b 58%, #7a5a16 100%)",
    ink: "#1a1305",
    stroke: "rgba(255,235,150,.65)",
    glow: "rgba(220,170,40,.5)",
    badgeBg: "linear-gradient(180deg,#f5d56b,#7a5a16)",
    label: "OR",
  },
  totw: {
    bg: "linear-gradient(160deg, #0a0a0a 0%, #1a1a1a 35%, #3a3a3a 65%, #050505 100%)",
    ink: "#fff",
    stroke: "rgba(255,255,255,.6)",
    glow: "rgba(0,0,0,.7)",
    badgeBg: "linear-gradient(180deg,#1a1a1a,#000)",
    label: "TOTW",
  },
  icon: {
    bg: "linear-gradient(160deg, #f3e9d2 0%, #fff3cd 30%, #ffe082 55%, #d6a435 100%)",
    ink: "#1f1404",
    stroke: "rgba(255,235,150,.8)",
    glow: "rgba(255,210,80,.55)",
    badgeBg: "linear-gradient(180deg,#fff3cd,#bb8b1f)",
    label: "ICON",
  },
  hero: {
    bg: "conic-gradient(from 60deg at 50% 35%, #ff6a3d, #ffd166, #ff9e3d, #ff6a3d)",
    ink: "#fff",
    stroke: "rgba(255,200,120,.7)",
    glow: "rgba(255,140,50,.55)",
    badgeBg: "linear-gradient(180deg,#ff7f3f,#a14010)",
    label: "HERO",
  },
};

const POSITION_LABEL = {
  GK:"GB", DG:"DG", DD:"DD", DC:"DC", DM:"DM", MD:"MD", ML:"ML",
  MC:"MC", MOC:"MOC", AG:"AG", AD:"AD", BU:"BU", ATT:"BU",
};

// ----------------- Player photo placeholder -----------------
function PlayerSilhouette({ rarity, accentColor }) {
  // Stylised footballer silhouette
  return (
    <svg viewBox="0 0 120 140" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={`ps-${rarity}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0"/>
          <stop offset="1" stopColor="#000" stopOpacity=".45"/>
        </linearGradient>
      </defs>
      {/* Head */}
      <ellipse cx="60" cy="44" rx="17" ry="20" fill="rgba(0,0,0,.35)" />
      {/* Body */}
      <path d="M22,140 Q22,92 60,82 Q98,92 98,140 Z" fill="rgba(0,0,0,.32)" />
      {/* Light */}
      <circle cx="48" cy="36" r="4" fill="rgba(255,255,255,.18)" />
      <rect x="0" y="0" width="120" height="140" fill={`url(#ps-${rarity})`} />
    </svg>
  );
}

// ----------------- FUT Card -----------------
function FutCard({ player, variant = "fut", size = "md", onClick, style }) {
  const r = RARITY[player.rarity] || RARITY.gold;
  const dims = {
    sm: { w: 110, h: 160, name: 11, ovr: 28, pos: 10, stat: 9 },
    md: { w: 165, h: 240, name: 14, ovr: 42, pos: 13, stat: 12 },
    lg: { w: 220, h: 320, name: 18, ovr: 56, pos: 16, stat: 15 },
    xl: { w: 280, h: 410, name: 22, ovr: 76, pos: 20, stat: 18 },
  }[size];

  const stats = player.stats;
  const ovr = stats.ovr;

  // ----- Compact / list variant -----
  if (variant === "row") {
    return (
      <button
        className="pc-row"
        onClick={onClick}
        style={{
          ...style,
          "--rar-bg": r.bg, "--rar-ink": r.ink, "--rar-stroke": r.stroke, "--rar-glow": r.glow,
        }}
      >
        <span className="pc-row-rating" style={{ background: r.bg, color: r.ink }}>
          <b>{ovr}</b>
          <em>{POSITION_LABEL[player.pos] || player.pos}</em>
        </span>
        <span className="pc-row-num">#{player.num}</span>
        <span className="pc-row-name">
          <span className="pc-row-first">{player.first || ''}</span>
          <span className="pc-row-last">{(player.last || '').toUpperCase()}</span>
        </span>
        <span className={`pc-row-form pc-row-form-${player.form>=8?"hot":player.form>=6?"ok":"cold"}`}>
          {player.form>=8 ? "🔥" : player.form>=6 ? "●" : "↓"}
        </span>
      </button>
    );
  }

  // ----- Full FUT card -----
  return (
    <button
      className={`pc pc-${player.rarity} pc-${size} pc-${variant}`}
      onClick={onClick}
      style={{
        ...style,
        width: dims.w, height: dims.h,
        "--rar-bg": r.bg, "--rar-ink": r.ink, "--rar-stroke": r.stroke, "--rar-glow": r.glow,
        "--name": dims.name + "px",
        "--ovr": dims.ovr + "px",
        "--pos": dims.pos + "px",
        "--stat": dims.stat + "px",
      }}
    >
      {/* outer rim */}
      <div className="pc-rim" />
      {/* glossy bg */}
      <div className="pc-bg" style={{ background: r.bg }} />
      {/* shine band */}
      <div className="pc-shine" />
      {/* holographic noise for icon / hero / totw */}
      {(player.rarity==="icon" || player.rarity==="hero" || player.rarity==="totw") && (
        <div className="pc-holo" />
      )}

      {/* TOP : OVR + POS */}
      <div className="pc-tl">
        <div className="pc-ovr" style={{ color: r.ink }}>{ovr}</div>
        <div className="pc-pos" style={{ color: r.ink }}>{POSITION_LABEL[player.pos] || player.pos}</div>
        <div className="pc-flag" style={{ background: r.ink, opacity:.5 }} />
        <div className="pc-club" style={{ background: r.ink, opacity:.5 }} />
      </div>

      {/* PHOTO */}
      <div className="pc-photo">
        {player.photo
          ? <img src={player.photo} alt="" onError={(e)=>{e.target.style.display='none'; e.target.nextSibling.style.display='block';}}/>
          : null}
        <div style={{display: player.photo ? 'none' : 'block', width:'100%', height:'100%'}}>
          <PlayerSilhouette rarity={player.rarity} accentColor={r.ink}/>
        </div>
        <div className="pc-shirt" style={{ color: r.ink }}>#{player.num}</div>
      </div>

      {/* NAME — prénom en gros + nom de famille en plus petit */}
      <div className="pc-name" style={{ color: r.ink }}>
        <span className="pc-name-first">{player.first || ''}</span>
        {player.last && (
          <span className="pc-name-last">{(player.last || '').toUpperCase()}</span>
        )}
      </div>

      <div className="pc-divider" style={{ background: r.ink, opacity:.35 }} />

      {/* STATS GRID 3×2 */}
      <div className="pc-stats" style={{ color: r.ink }}>
        <span><b>{stats.PAC}</b> VIT</span>
        <span><b>{stats.SHO}</b> TIR</span>
        <span><b>{stats.PAS}</b> PAS</span>
        <span><b>{stats.DRI}</b> DRI</span>
        <span><b>{stats.DEF}</b> DEF</span>
        <span><b>{stats.PHY}</b> PHY</span>
      </div>

      {/* Rarity ribbon */}
      <div className="pc-ribbon" style={{ color: r.ink, opacity:.55 }}>{r.label}</div>
    </button>
  );
}

window.FutCard = FutCard;
window.RARITY = RARITY;
window.POSITION_LABEL = POSITION_LABEL;
window.PlayerSilhouette = PlayerSilhouette;
