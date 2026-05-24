/* global React, CDD_PLAYERS, CDD_FORMATIONS, CDD_CLUB, CDD_NEXT_MATCH, CDD_CONVO, POSITION_LABEL */

/* ============================================================
   SCREEN — Mode Vestiaire (projection compo + export image)
   ============================================================
   Affiche la convocation du match (titulaires aux postes + remplaçants en bas)
   pour vérifier la compo dans le vestiaire avant le coup d'envoi.
   Source : CDD_CONVO (overlay match si défini, sinon compo type saison).
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

function ScreenTV({ go, tweaks, source, matchId }) {
  const cardRef = useRefTV(null);
  const [busy, setBusy] = useStateTV(false);
  const [msg, setMsg] = useStateTV('');
  const [showSponsorEditor, setShowSponsorEditor] = useStateTV(false);
  const [sponsors, setSponsors] = useStateTV(loadSponsors);

  // Phase 1C — Source contextualisée :
  //   source === 'match' + matchId → compo de match (cdd_match_lineup[tid][mid])
  //                                   avec fallback sur la compo type si vide
  //   sinon                         → compo type saison (cdd_lineup_template[tid])
  //                                   comportement historique depuis Feuille de match
  const isMatchSource = source === 'match' && !!matchId;
  let formation = '4-3-3';
  let templateStartersMap = {};
  let templateBench = [];
  let sourceLabel = '';   // utilisé pour le bandeau
  let sourceFound = false; // true si une compo de match existe vraiment
  try {
    const activeTeam = window.CDD && window.CDD.getActiveTeam && window.CDD.getActiveTeam();
    if (activeTeam) {
      // ── Mode MATCH : tente d'abord cdd_match_lineup ──
      if (isMatchSource) {
        const allM = JSON.parse(localStorage.getItem('cdd_match_lineup') || '{}');
        const ml = allM[activeTeam.id] && allM[activeTeam.id][matchId];
        if (ml && ml.starters) {
          const f = ml.formation;
          if (f && window.CDD_FORMATIONS && window.CDD_FORMATIONS[f]) formation = f;
          else if (ml.basedOn && window.CDD_FORMATIONS && window.CDD_FORMATIONS[ml.basedOn]) formation = ml.basedOn;
          templateStartersMap = ml.starters;
          if (Array.isArray(ml.bench)) templateBench = ml.bench.slice();
          sourceFound = true;
        }
        // Fallback → compo type si aucune compo de match encore posée
        if (!sourceFound) {
          const all = JSON.parse(localStorage.getItem('cdd_lineup_template') || '{}');
          const s = all[activeTeam.id];
          if (s && s.starters) {
            const f = s.formation;
            if (f && window.CDD_FORMATIONS && window.CDD_FORMATIONS[f]) formation = f;
            else if (s.basedOn && window.CDD_FORMATIONS && window.CDD_FORMATIONS[s.basedOn]) formation = s.basedOn;
            templateStartersMap = s.starters;
          }
          if (s && Array.isArray(s.bench)) templateBench = s.bench.slice();
        }
      } else {
        // ── Mode SAISON : compo type ──
        const all = JSON.parse(localStorage.getItem('cdd_lineup_template') || '{}');
        const s = all[activeTeam.id];
        if (s && s.starters) {
          const f = s.formation;
          if (f && window.CDD_FORMATIONS && window.CDD_FORMATIONS[f]) formation = f;
          else if (s.basedOn && window.CDD_FORMATIONS && window.CDD_FORMATIONS[s.basedOn]) formation = s.basedOn;
          templateStartersMap = s.starters;
        }
        if (s && Array.isArray(s.bench)) templateBench = s.bench.slice();
      }
    }
  } catch (e) {}

  const slots = (window.CDD_FORMATIONS && window.CDD_FORMATIONS[formation]) ||
                (window.CDD_FORMATIONS && window.CDD_FORMATIONS['4-3-3']) || [];
  const playerOf = (pid) => pid && window.CDD_PLAYERS && window.CDD_PLAYERS.find(p => p.id === pid);

  // Titulaires : exactement ce que le coach a posé, slot par slot.
  let starterPlayers = slots.map((slot, i) => {
    let pid = templateStartersMap[i];
    if (!pid) {
      const fallback = (window.CDD_PLAYERS || []).filter(p => p.isStarter)[i];
      if (fallback) pid = fallback.id;
    }
    return playerOf(pid);
  });
  // Banc : exactement le bench posé par le coach.
  const benchPlayers = templateBench.map(playerOf).filter(Boolean);
  const hasMatchOverlay = false; // gardé pour compatibilité

  // Affichage du num : en mode MATCH (source='match'), on lit les overrides
  // match-specific. En mode compo type saison, num saison classique.
  const _activeTeamIdTV = window.CDD?.getActiveTeam?.()?.id;
  const _matchIdTV = matchId || ((window.CDD_NEXT_MATCH && window.CDD_NEXT_MATCH.id) || 'placeholder');
  const displayNum = (p) => {
    if (!p) return null;
    if (isMatchSource && _activeTeamIdTV && window.CDD_JERSEY?.getNum) {
      return window.CDD_JERSEY.getNum(_activeTeamIdTV, _matchIdTV, p.id, p.num);
    }
    return p.num;
  };
  // État modale numéros maillots
  const [jerseyModalOpen, setJerseyModalOpen] = useStateTV(false);

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
    <div className="scr scr-tv fade-in" data-screen-label="08 Mode vestiaire">

      <div className="tv-toolbar">
        <div className="tv-tb-title">MODE VESTIAIRE</div>
        <div className="tv-tb-actions">
          {isMatchSource && (
            <button className="tv-btn" onClick={() => setJerseyModalOpen(true)}
                    title="Éditer les numéros maillots pour ce match"
                    style={{background:'rgba(249,115,22,0.10)', color:'#f97316',
                            border:'1px solid rgba(249,115,22,0.35)'}}>
              🔢 NUMÉROS
            </button>
          )}
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
          ⚠️ Seulement {fillCount}/11 titulaires convoqués. Complète la convocation puis reviens ici.
        </div>
      )}

      {/* Source : compo de match (depuis Convocations) ou compo type saison */}
      <div className="tv-source-badge" style={{
        margin:'0 14px 10px', padding:'8px 12px', borderRadius:8,
        background: isMatchSource
          ? (sourceFound ? 'rgba(249,115,22,0.10)' : 'rgba(255,200,40,0.07)')
          : 'rgba(255,255,255,0.04)',
        border: `1px solid ${isMatchSource
          ? (sourceFound ? 'rgba(249,115,22,0.35)' : 'rgba(255,200,40,0.30)')
          : 'rgba(255,255,255,0.10)'}`,
        fontSize:11.5, color:'rgba(255,255,255,0.85)', letterSpacing:.2,
        display:'flex', alignItems:'center', gap:8,
      }}>
        {isMatchSource ? (
          sourceFound ? (
            <><b style={{color:'#f97316'}}>📅 Compo match</b> · {match.date || ''} · {starterPlayers.filter(Boolean).length} titulaires · {benchPlayers.length} remplaçants</>
          ) : (
            <><b style={{color:'#ffc040'}}>⚠ Aucune compo de match</b> — affichage de la compo type saison · {starterPlayers.filter(Boolean).length} tit. · <a onClick={() => go('match-lineup')} style={{color:'#f97316', cursor:'pointer', textDecoration:'underline'}}>Créer la compo match</a></>
          )
        ) : (
          <><b>🗓️ Compo type saison</b> · {starterPlayers.filter(Boolean).length} titulaires · {benchPlayers.length} remplaçants</>
        )}
      </div>

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
                    {/* PHOTO si dispo, clip rond. On pose href ET xlinkHref :
                        href = forme moderne (SVG 2), xlinkHref = forme legacy
                        (SVG 1.1). html2canvas ne capture que la forme xlink
                        dans la plupart des versions — sans ce double attribut,
                        les photos disparaissent dans l'export PNG (visibles
                        à l'écran via href, invisibles sur l'image téléchargée). */}
                    {p.photo && (
                      <image href={p.photo} xlinkHref={p.photo}
                             x="-6.2" y="-6.2" width="12.4" height="12.4"
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
                      {displayNum(p)}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        {/* BANC / REMPLAÇANTS — inclus dans la capture export */}
        {benchPlayers.length > 0 && (
          <div className="tv-card-bench" style={{
            padding:'10px 14px 12px',
            background:'rgba(0,0,0,0.35)',
            borderTop:'1px solid rgba(255,255,255,0.08)',
          }}>
            <div style={{
              fontSize:9.5, fontWeight:800, letterSpacing:'.12em',
              color:'rgba(255,255,255,0.55)', marginBottom:8, textTransform:'uppercase',
            }}>
              Sur le banc · {benchPlayers.length}
            </div>
            <div style={{
              display:'flex', flexWrap:'wrap', gap:6,
            }}>
              {benchPlayers.map(p => (
                <div key={p.id} style={{
                  display:'flex', alignItems:'center', gap:7,
                  padding:'5px 9px 5px 5px',
                  background:'rgba(255,255,255,0.06)',
                  border:'1px solid rgba(255,255,255,0.10)',
                  borderRadius:18, fontSize:12,
                }}>
                  <span style={{
                    minWidth:22, height:22, borderRadius:11,
                    background: primary, color: secondary,
                    display:'inline-flex', alignItems:'center', justifyContent:'center',
                    fontWeight:900, fontSize:11, padding:'0 5px',
                  }}>{displayNum(p)}</span>
                  <span style={{fontWeight:700, color:'#fff'}}>{p.first}</span>
                  {p.pos && <span style={{
                    fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.55)',
                    letterSpacing:.4, marginLeft:1,
                  }}>{(window.POSITION_LABEL && window.POSITION_LABEL[p.pos]) || p.pos}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

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

      {/* Modale numéros maillots — uniquement mode vestiaire match */}
      {jerseyModalOpen && isMatchSource && window.JerseyNumbersModal && (
        <window.JerseyNumbersModal
          teamId={_activeTeamIdTV}
          matchId={_matchIdTV}
          players={[...starterPlayers.filter(Boolean), ...benchPlayers]}
          title="🔢 NUMÉROS MAILLOTS DU MATCH"
          onClose={() => setJerseyModalOpen(false)}
        />
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
