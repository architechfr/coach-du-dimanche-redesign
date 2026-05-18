/* global React, CDD_PLAYERS, CDD_FORMATIONS, CDD_CLUB, CDD_NEXT_MATCH, CDD_CONVO, POSITION_LABEL */

/* ============================================================
   SCREEN — Visuel équipe (export image WhatsApp / Instagram)
   ============================================================
   Terrain vert + 11 joueurs aux postes avec photo + numéro + nom.
   Header : logo club + nom + adversaire.
   Footer : sponsors (configurables) + coach.
   Export PNG via html2canvas (lazy CDN) + partage natif navigator.share.
   ============================================================ */

const { useState: useStateTV, useRef: useRefTV } = React;

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

// Lecture localStorage des sponsors (config via Réglages plus tard)
function loadSponsors() {
  try {
    const all = JSON.parse(localStorage.getItem('cdd_club_sponsors') || '[]');
    return Array.isArray(all) ? all.filter(s => s && (s.name || s.logoDataUrl)) : [];
  } catch (e) { return []; }
}

function ScreenTV({ go, tweaks }) {
  const cardRef = useRefTV(null);
  const [busy, setBusy] = useStateTV(false);
  const [msg, setMsg] = useStateTV('');
  const [showSponsorEditor, setShowSponsorEditor] = useStateTV(false);
  const [sponsors, setSponsors] = useStateTV(loadSponsors);

  let formation = '4-3-3';
  let startersMap = {};
  try {
    const activeTeam = window.CDD && window.CDD.getActiveTeam && window.CDD.getActiveTeam();
    if (activeTeam) {
      const all = JSON.parse(localStorage.getItem('cdd_lineup_template') || '{}');
      const s = all[activeTeam.id];
      if (s && s.starters) {
        const f = s.formation;
        if (f && window.CDD_FORMATIONS && window.CDD_FORMATIONS[f]) formation = f;
        else if (s.basedOn && window.CDD_FORMATIONS && window.CDD_FORMATIONS[s.basedOn]) formation = s.basedOn;
        startersMap = s.starters;
      }
    }
  } catch (e) {}

  const slots = (window.CDD_FORMATIONS && window.CDD_FORMATIONS[formation]) ||
                (window.CDD_FORMATIONS && window.CDD_FORMATIONS['4-3-3']) || [];
  const playerOf = (pid) => pid && window.CDD_PLAYERS && window.CDD_PLAYERS.find(p => p.id === pid);
  let starterPlayers = slots.map((slot, i) => {
    let pid = startersMap[i];
    if (!pid) {
      const fallback = (window.CDD_PLAYERS || []).filter(p => p.isStarter)[i];
      if (fallback) pid = fallback.id;
    }
    return playerOf(pid);
  });

  const club = window.CDD_CLUB || { name: 'MON CLUB', team: 'EQUIPE', colors: ['#22c55e', '#000'] };
  const match = window.CDD_NEXT_MATCH || {};
  const noUpcoming = match.noUpcoming || !match.away || match.away === 'À déterminer';
  const primary = (club.colors && club.colors[0]) || '#22c55e';
  const secondary = (club.colors && club.colors[1]) || '#000';

  const exportImage = async () => {
    if (!cardRef.current) return;
    setBusy(true);
    setMsg("Génération de l'image…");
    try {
      const h2c = await loadHtml2Canvas();
      const canvas = await h2c(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `compo-${club.short || 'team'}-${(match.date || 'jour').replace(/\W+/g,'-')}.png`;
      a.click();
      setMsg('✓ Image téléchargée');
      if (navigator.share && navigator.canShare) {
        try {
          const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
          const file = new File([blob], a.download, { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: `${club.team} - Compo`, text: `${club.name} vs ${match.away || ''}` });
          }
        } catch (e) {}
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
    <div className="scr scr-tv fade-in" data-screen-label="08 Visuel compo">

      <div className="tv-toolbar">
        <div className="tv-tb-title">VISUEL COMPO</div>
        <div className="tv-tb-actions">
          <button className="tv-btn" onClick={() => setShowSponsorEditor(true)}
                  title="Configurer les sponsors">
            🏷 SPONSORS
          </button>
          <button className="tv-btn tv-btn-primary"
                  onClick={exportImage}
                  disabled={busy || fillCount < 1}>
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

      {/* ─── Zone capturée pour l'export ─── */}
      <div className="tv-card" ref={cardRef}>

        {/* HEADER : logo club + nom + adversaire */}
        <div className="tv-card-header">
          <div className="tv-card-club">
            {club.logoDataUrl ? (
              <img src={club.logoDataUrl} alt={club.name} className="tv-card-logo"/>
            ) : (
              <div className="tv-card-badge" style={{ background: primary, color: secondary }}>
                {(club.short || club.name || '?').charAt(0)}
              </div>
            )}
            <div className="tv-card-club-txt">
              <div className="tv-card-club-name">{club.name || 'MON CLUB'}</div>
              <div className="tv-card-club-team">{club.team || ''} · {formation}</div>
            </div>
          </div>
          <div className="tv-card-match">
            {!noUpcoming && match.date && <div className="tv-card-date">{match.date}</div>}
            <div className="tv-card-vs">
              {noUpcoming ? 'À DÉTERMINER' : `VS ${match.away}`}
            </div>
            {!noUpcoming && match.venue && <div className="tv-card-venue">{match.venue}</div>}
          </div>
        </div>

        {/* TERRAIN */}
        <div className="tv-pitch">
          <svg viewBox="0 0 100 110" preserveAspectRatio="xMidYMid meet"
               width="100%" height="100%" className="tv-pitch-svg">
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
              {/* clipPath unique pour la photo ronde */}
              <clipPath id="tv-clip-photo">
                <circle cx="0" cy="0" r="6.2"/>
              </clipPath>
            </defs>

            <rect width="100" height="110" fill="url(#tv-stripes)"/>

            {/* Lignes terrain */}
            <g stroke="rgba(255,255,255,.65)" strokeWidth=".3" fill="none">
              <rect x="2" y="2" width="96" height="106"/>
              <line x1="2" y1="55" x2="98" y2="55"/>
              <circle cx="50" cy="55" r="9"/>
              <circle cx="50" cy="55" r=".6" fill="rgba(255,255,255,.65)"/>
              <rect x="22" y="2"  width="56" height="13"/>
              <rect x="36" y="2"  width="28" height="5"/>
              <rect x="22" y="95" width="56" height="13"/>
              <rect x="36" y="103" width="28" height="5"/>
              <circle cx="50" cy="11"  r=".6" fill="rgba(255,255,255,.65)"/>
              <circle cx="50" cy="99" r=".6" fill="rgba(255,255,255,.65)"/>
            </g>

            {/* ─── PASSE 1 : labels (en arrière, pour ne pas chevaucher les pastilles) ─── */}
            <g>
              {slots.map((slot, i) => {
                const p = starterPlayers[i];
                if (!p) return null;
                const x = slot.x;
                // #44 — Mapper sur 8..94 (au lieu de 6..100) pour que le label
                // du gardien (slot.y=92) reste DANS le viewBox 0 0 100 110.
                const y = 8 + (slot.y / 92) * 86;
                const labelY = y + 10.5;
                return (
                  <g key={'label-'+i} transform={`translate(${x}, ${labelY})`}>
                    <rect x="-13" y="-2.2" width="26" height="4.2" rx="1"
                          fill="rgba(0,0,0,.82)"/>
                    <text textAnchor="middle" dominantBaseline="central"
                          fontSize="2.8" fontWeight="800"
                          fill="#fff" fontFamily="Inter, sans-serif">
                      {(p.first || '').slice(0, 14)}
                    </text>
                  </g>
                );
              })}
            </g>

            {/* ─── PASSE 2 : pastilles avec photo + numéro (au-dessus des labels) ─── */}
            <g>
              {slots.map((slot, i) => {
                const p = starterPlayers[i];
                if (!p) return null;
                const x = slot.x;
                // #44 — meme mapping que les labels
                const y = 8 + (slot.y / 92) * 86;
                return (
                  <g key={'pion-'+i} transform={`translate(${x}, ${y})`}>
                    {/* halo flou */}
                    <circle r="7.6" fill="rgba(0,0,0,.42)"/>
                    {/* fond couleur club */}
                    <circle r="6.4" fill={primary} stroke="#fff" strokeWidth=".5"/>
                    {/* PHOTO si dispo, clip rond */}
                    {p.photo && (
                      <image href={p.photo} x="-6.2" y="-6.2" width="12.4" height="12.4"
                             preserveAspectRatio="xMidYMid slice"
                             clipPath="url(#tv-clip-photo)"
                             onError={(e) => { e.target.style.display = 'none'; }}/>
                    )}
                    {/* Voile semi-transparent pour la lisibilité du numéro */}
                    {p.photo && <circle r="6.2" fill="rgba(0,0,0,.18)"/>}
                    {/* Badge numéro (toujours visible, en surimpression) */}
                    <circle cx="3.8" cy="-3.8" r="2.7" fill={secondary} stroke="#fff" strokeWidth=".25"/>
                    <text x="3.8" y="-3.3" textAnchor="middle" dominantBaseline="central"
                          fontSize="3.2" fontWeight="900"
                          fill={primary === '#000000' || primary === '#000' ? '#fff' : '#fff'}
                          fontFamily="Inter, sans-serif">
                      {p.num}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        {/* SPONSORS si configurés */}
        {sponsors.length > 0 && (
          <div className="tv-card-sponsors">
            <div className="tv-card-sponsors-k">PARTENAIRES</div>
            <div className="tv-card-sponsors-list">
              {sponsors.slice(0, 6).map((s, i) => (
                <div className="tv-card-sponsor" key={i} title={s.name || ''}>
                  {s.logoDataUrl ? (
                    <img src={s.logoDataUrl} alt={s.name || ''}/>
                  ) : (
                    <span>{s.name}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div className="tv-card-footer">
          <div className="tv-card-foot-l">Coach: {club.coach || '—'}</div>
          <div className="tv-card-foot-r">{club.season || 'Saison'} · Coach du Dimanche</div>
        </div>
      </div>

      <div className="tv-help">
        💡 Exporte l'image et partage-la sur WhatsApp / Instagram. Ajoute des sponsors via le bouton 🏷 SPONSORS.
      </div>

      {/* Editeur sponsors */}
      {showSponsorEditor && (
        <SponsorEditor sponsors={sponsors}
                       onSave={(list) => {
                         setSponsors(list);
                         try { localStorage.setItem('cdd_club_sponsors', JSON.stringify(list)); } catch (e) {}
                         setShowSponsorEditor(false);
                       }}
                       onClose={() => setShowSponsorEditor(false)}/>
      )}
    </div>
  );
}

// ─── Sponsor editor modal ───
function SponsorEditor({ sponsors, onSave, onClose }) {
  const [list, setList] = useStateTV(() => [...(sponsors || [])]);

  const addSponsor = () => setList(l => [...l, { name: '', logoDataUrl: '' }]);
  const removeSponsor = (i) => setList(l => l.filter((_, idx) => idx !== i));
  const updateName = (i, v) => setList(l => l.map((s, idx) => idx === i ? { ...s, name: v } : s));
  const updateLogo = (i, file) => {
    if (!file) return;
    if (file.size > 800000) { alert('Logo trop lourd (max 800 Ko)'); return; }
    const r = new FileReader();
    r.onload = () => setList(l => l.map((s, idx) => idx === i ? { ...s, logoDataUrl: r.result } : s));
    r.readAsDataURL(file);
  };

  return (
    <div className="fi-sp-overlay" onClick={onClose}>
      <div className="fi-sp-sheet" onClick={e => e.stopPropagation()}
           style={{maxWidth:'420px', width:'92%'}}>
        <div className="fi-sp-h">
          <span className="fi-sp-t">SPONSORS / PARTENAIRES</span>
          <button className="fi-sp-x" onClick={onClose}>✕</button>
        </div>
        <div style={{padding:'14px 16px'}}>
          {list.length === 0 && (
            <div style={{textAlign:'center', color:'rgba(255,255,255,.5)', padding:'24px 0', fontSize:13}}>
              Aucun sponsor encore. Ajoute le 1er ci-dessous.
            </div>
          )}
          {list.map((s, i) => (
            <div key={i} style={{
              background:'rgba(255,255,255,.04)', borderRadius:10,
              padding:'10px', marginBottom:8, border:'1px solid rgba(255,255,255,.08)',
              display:'flex', gap:10, alignItems:'center'
            }}>
              {s.logoDataUrl ? (
                <img src={s.logoDataUrl} alt="" style={{width:40, height:40, borderRadius:6, objectFit:'cover'}}/>
              ) : (
                <div style={{width:40, height:40, borderRadius:6, background:'rgba(255,255,255,.06)',
                             display:'flex', alignItems:'center', justifyContent:'center', fontSize:18}}>🏷</div>
              )}
              <div style={{flex:1}}>
                <input type="text" value={s.name} onChange={e => updateName(i, e.target.value)}
                       placeholder="Nom sponsor"
                       style={{width:'100%', height:34, background:'rgba(0,0,0,.4)',
                               border:'1px solid rgba(255,255,255,.12)', borderRadius:7,
                               color:'#fff', padding:'0 10px', fontSize:13, outline:'none'}}/>
                <input type="file" accept="image/*" onChange={e => updateLogo(i, e.target.files && e.target.files[0])}
                       style={{marginTop:6, fontSize:11, color:'rgba(255,255,255,.7)'}}/>
              </div>
              <button type="button" onClick={() => removeSponsor(i)}
                      title="Supprimer ce sponsor"
                      style={{
                        minWidth: 80, height: 40, padding: '0 12px',
                        border: '1px solid rgba(255,80,80,.4)',
                        borderRadius: 8,
                        background: 'rgba(255,80,80,.18)',
                        color: '#ff8a8a',
                        fontSize: 12, fontWeight: 800,
                        cursor: 'pointer', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: 4,
                      }}>
                <span style={{fontSize: 14}}>🗑</span>
                <span>SUPPR.</span>
              </button>
            </div>
          ))}
        </div>
        <div style={{display:'flex', gap:8, padding:'10px 16px 16px'}}>
          <button onClick={addSponsor} type="button"
                  style={{flex:1, height:42, border:'1px dashed rgba(255,255,255,.25)',
                          borderRadius:9, background:'transparent', color:'#fff',
                          fontWeight:700, fontSize:13, cursor:'pointer'}}>
            + Ajouter un sponsor
          </button>
          <button onClick={() => onSave(list)} type="button"
                  style={{flex:1, height:42, border:'none', borderRadius:9,
                          background:'var(--acc, #c8f169)', color:'#000',
                          fontWeight:800, fontSize:13, cursor:'pointer'}}>
            💾 Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

window.ScreenTV = ScreenTV;
