/* global React, CDD_PLAYERS, CDD_FORMATIONS, CDD_CLUB, CDD_NEXT_MATCH, CDD_CONVO, POSITION_LABEL */

/* ============================================================
   SCREEN — Présentation équipe type TV
   ============================================================
   Visuel terrain vert + 11 joueurs aux postes (photo + numéro + prénom + NOM)
   exportable en PNG via html2canvas (chargé lazy depuis CDN) et partageable
   via navigator.share (WhatsApp / SMS / Photos).
   ============================================================ */

const { useState: useStateTV, useRef: useRefTV } = React;

// Charge html2canvas une seule fois, à la demande
function loadHtml2Canvas() {
  if (window.html2canvas) return Promise.resolve(window.html2canvas);
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    s.onload = () => resolve(window.html2canvas);
    s.onerror = () => reject(new Error('Impossible de charger html2canvas'));
    document.head.appendChild(s);
  });
}

function ScreenTV({ go, tweaks }) {
  const cardRef = useRefTV(null);
  const [busy, setBusy] = useStateTV(false);
  const [msg, setMsg] = useStateTV('');

  // ─── Récupérer le lineup actif depuis localStorage cdd_lineup_template ───
  let formation = '4-3-3';
  let startersMap = {};
  try {
    const activeTeam = window.CDD && window.CDD.getActiveTeam && window.CDD.getActiveTeam();
    if (activeTeam) {
      const all = JSON.parse(localStorage.getItem('cdd_lineup_template') || '{}');
      const s = all[activeTeam.id];
      if (s && s.formation && s.starters) {
        formation = s.formation;
        startersMap = s.starters;
      }
    }
  } catch (e) {}

  const slots = (window.CDD_FORMATIONS && window.CDD_FORMATIONS[formation]) || (window.CDD_FORMATIONS && window.CDD_FORMATIONS['4-3-3']) || [];
  const playerOf = (pid) => pid && window.CDD_PLAYERS.find(p => p.id === pid);

  // Si pas de startersMap, fallback sur les 11 premiers titulaires
  let starterPlayers = slots.map((slot, i) => {
    let pid = startersMap[i];
    if (!pid) {
      // fallback compo type
      const fallback = window.CDD_PLAYERS.filter(p => p.isStarter)[i];
      if (fallback) pid = fallback.id;
    }
    return playerOf(pid);
  });

  const club = window.CDD_CLUB || { name: 'MON CLUB', team: 'ÉQUIPE', colors: ['#22c55e', '#000'] };
  const match = window.CDD_NEXT_MATCH || {};

  const exportImage = async () => {
    if (!cardRef.current) return;
    setBusy(true);
    setMsg('Génération de l\'image…');
    try {
      const h2c = await loadHtml2Canvas();
      const canvas = await h2c(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });
      const dataUrl = canvas.toDataURL('image/png');
      // Téléchargement immédiat
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `equipe-${club.short || 'team'}-${(match.date || 'compo').replace(/\W+/g,'-')}.png`;
      a.click();
      setMsg('✓ Image téléchargée');
      // + tentative de partage natif si dispo
      if (navigator.share && navigator.canShare) {
        try {
          const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
          const file = new File([blob], a.download, { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: `${club.team} — Compo`, text: `${club.name} vs ${match.away || ''}` });
          }
        } catch (e) { /* user cancelled or unsupported */ }
      }
      setTimeout(() => setMsg(''), 2500);
    } catch (e) {
      setMsg('❌ Erreur : ' + e.message);
    } finally {
      setBusy(false);
    }
  };

  const fillCount = starterPlayers.filter(Boolean).length;

  return (
    <div className="scr scr-tv fade-in" data-screen-label="08 Présentation TV">

      <div className="tv-toolbar">
        <div className="tv-tb-title">PRÉSENTATION ÉQUIPE</div>
        <div className="tv-tb-actions">
          <button className="tv-btn tv-btn-primary"
                  onClick={exportImage}
                  disabled={busy || fillCount < 1}
                  title={fillCount < 11 ? `${fillCount}/11 joueurs placés` : 'Exporter en image'}>
            {busy ? '⏳' : '📷'} EXPORTER
          </button>
          {msg && <span className="tv-msg">{msg}</span>}
        </div>
      </div>

      {fillCount < 11 && (
        <div className="tv-warn">
          ⚠️ Seulement {fillCount}/11 joueurs sur la compo. Va dans Compo pour finaliser, puis reviens ici.
        </div>
      )}

      {/* Zone capturée pour l'export */}
      <div className="tv-card" ref={cardRef}>
        <div className="tv-card-header">
          <div className="tv-card-club">
            <div className="tv-card-badge" style={{
              background: club.colors && club.colors[0] || '#22c55e',
              color: club.colors && club.colors[1] || '#000'
            }}>
              {(club.short || club.name || '?').charAt(0)}
            </div>
            <div className="tv-card-club-txt">
              <div className="tv-card-club-name">{club.name || 'MON CLUB'}</div>
              <div className="tv-card-club-team">{club.team || ''} · {formation}</div>
            </div>
          </div>
          <div className="tv-card-match">
            {match.date && <div className="tv-card-date">{match.date}</div>}
            {match.away && <div className="tv-card-vs">VS {match.away}</div>}
            {match.venue && <div className="tv-card-venue">{match.venue}</div>}
          </div>
        </div>

        {/* Terrain SVG */}
        <div className="tv-pitch">
          <svg viewBox="0 0 100 110" preserveAspectRatio="xMidYMid meet"
               width="100%" height="100%" className="tv-pitch-svg">
            {/* Background terrain */}
            <defs>
              <linearGradient id="tv-grass" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1f7a3a"/>
                <stop offset="50%" stopColor="#2c8c47"/>
                <stop offset="100%" stopColor="#1c6e35"/>
              </linearGradient>
              <pattern id="tv-stripes" x="0" y="0" width="100" height="14" patternUnits="userSpaceOnUse">
                <rect width="100" height="14" fill="url(#tv-grass)"/>
                <rect y="7" width="100" height="7" fill="rgba(255,255,255,.04)"/>
              </pattern>
            </defs>
            <rect width="100" height="110" fill="url(#tv-stripes)"/>
            {/* Lignes terrain */}
            <g stroke="rgba(255,255,255,.65)" strokeWidth=".3" fill="none">
              <rect x="2" y="2" width="96" height="106"/>
              <line x1="2" y1="55" x2="98" y2="55"/>
              <circle cx="50" cy="55" r="9"/>
              <circle cx="50" cy="55" r=".6" fill="rgba(255,255,255,.65)"/>
              {/* Surface haut (adverse) */}
              <rect x="22" y="2"  width="56" height="13"/>
              <rect x="36" y="2"  width="28" height="5"/>
              {/* Surface bas (notre) */}
              <rect x="22" y="95" width="56" height="13"/>
              <rect x="36" y="103" width="28" height="5"/>
              {/* Points de pénalty */}
              <circle cx="50" cy="11"  r=".6" fill="rgba(255,255,255,.65)"/>
              <circle cx="50" cy="99" r=".6" fill="rgba(255,255,255,.65)"/>
            </g>

            {/* Joueurs */}
            {slots.map((slot, i) => {
              const p = starterPlayers[i];
              if (!p) return null;
              // Les y dans les formations vont de 18 (attaquant) à 92 (GK).
              // On les replace dans une zone 6..100 pour notre terrain.
              const x = slot.x;
              const y = 6 + (slot.y / 92) * 94;
              return (
                <g key={i} transform={`translate(${x}, ${y})`}>
                  {/* halo */}
                  <circle r="7.5" fill="rgba(0,0,0,.35)"/>
                  {/* maillot */}
                  <circle r="6.8" fill={club.colors && club.colors[0] || '#22c55e'}
                          stroke="#fff" strokeWidth=".4"/>
                  {/* numéro */}
                  <text textAnchor="middle" dominantBaseline="central"
                        fontSize="6" fontWeight="900"
                        fill={club.colors && club.colors[1] || '#000'}
                        fontFamily="Inter, sans-serif"
                        y=".5">
                    {p.num}
                  </text>
                  {/* nom dessous */}
                  <g transform="translate(0, 11.5)">
                    <rect x="-15" y="-2.5" width="30" height="5" rx="1"
                          fill="rgba(0,0,0,.78)"/>
                    <text textAnchor="middle" dominantBaseline="central"
                          fontSize="3" fontWeight="800"
                          fill="#fff"
                          fontFamily="Inter, sans-serif"
                          y="0">
                      {(p.first || '').slice(0, 14)}
                    </text>
                  </g>
                  {p.last && (
                    <g transform="translate(0, 16)">
                      <text textAnchor="middle" dominantBaseline="central"
                            fontSize="2.2" fontWeight="500"
                            fill="rgba(255,255,255,.75)"
                            fontFamily="Inter, sans-serif"
                            y="0">
                        {(p.last || '').slice(0, 18).toUpperCase()}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Footer */}
        <div className="tv-card-footer">
          <div className="tv-card-foot-l">Coach: {club.coach || '—'}</div>
          <div className="tv-card-foot-r">Coach du Dimanche</div>
        </div>
      </div>

      <div className="tv-help">
        💡 Une fois exporté, partage l'image directement sur WhatsApp parents,
        Instagram ou colle-la dans ta story de match.
      </div>
    </div>
  );
}

window.ScreenTV = ScreenTV;
