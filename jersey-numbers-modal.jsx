/* global React */
/* ============================================================
   JERSEY NUMBERS MODAL — Édition des numéros maillots du match
   ============================================================
   Modale réutilisable :
   - Convocations / Compo match : 🔢 NUMÉROS MAILLOTS
   - Au lancement du match (vérification obligatoire au 1er passage)

   Props :
     - teamId          : id de l'équipe (requis)
     - matchId         : id du match (requis, 'placeholder' si pas de match)
     - players         : liste des joueurs à éditer (titulaires + banc)
     - onClose()       : fermeture sans action particulière
     - onConfirm()     : sauvegarde + fermeture (callback optionnel)
     - title           : titre custom (défaut "🔢 NUMÉROS DU MATCH")
     - subtitle        : sous-titre custom
     - confirmLabel    : libellé bouton primaire (défaut "💾 Enregistrer")
     - showSkip        : afficher un bouton "Plus tard" qui ferme sans valider
   ============================================================ */

function JerseyNumbersModal({ teamId, matchId, players, onClose, onConfirm, title, subtitle, confirmLabel, showSkip }) {
  const overrides = (window.CDD_JERSEY?.getOverrides?.(teamId, matchId)) || {};

  // État local : map { [playerId]: stringValue }. On stocke en string pour
  // permettre la saisie vide pendant l'édition.
  const [edits, setEdits] = React.useState(() => {
    const m = {};
    (players || []).forEach(p => {
      const v = overrides[p.id];
      m[p.id] = (v !== undefined ? v : (p.num != null ? p.num : '')).toString();
    });
    return m;
  });
  const [savedFlash, setSavedFlash] = React.useState(false);

  const update = (pid, raw) => {
    const clean = String(raw).replace(/[^\d]/g, '').slice(0, 2);
    setEdits(e => ({ ...e, [pid]: clean }));
  };

  // Détecte doublons
  const counts = {};
  Object.values(edits).forEach(n => { if (n) counts[n] = (counts[n] || 0) + 1; });
  const dupes = Object.keys(counts).filter(n => counts[n] > 1);

  const save = (skipConfirmDupes) => {
    if (dupes.length > 0 && !skipConfirmDupes) {
      if (!confirm(`⚠️ Numéros en doublon : ${dupes.join(', ')}\n\nDeux joueurs ne peuvent pas porter le même numéro pendant le match.\n\nEnregistrer quand même ?`)) return;
    }
    const playerById = {};
    (players || []).forEach(p => { playerById[p.id] = p; });
    const map = {};
    Object.keys(edits).forEach(pid => {
      const v = edits[pid];
      if (v === '') return;
      const seasonNum = playerById[pid]?.num;
      // On ne stocke que les VRAIS overrides (différents du num saison)
      if (+v !== seasonNum) map[pid] = +v;
    });
    window.CDD_JERSEY?.setBulk?.(teamId, matchId, map);
    window.CDD_JERSEY?.markReviewed?.(teamId, matchId);
    setSavedFlash(true);
    setTimeout(() => {
      setSavedFlash(false);
      if (onConfirm) onConfirm();
      else if (onClose) onClose();
    }, 500);
  };

  const reset = () => {
    if (!confirm("Réinitialiser tous les numéros à ceux de la saison ?")) return;
    const m = {};
    (players || []).forEach(p => { m[p.id] = (p.num != null ? p.num : '').toString(); });
    setEdits(m);
  };

  const list = players || [];

  return (
    <div className="fi-sp-overlay" onClick={onClose}>
      <div className="fi-sp-sheet" onClick={e => e.stopPropagation()}
           style={{maxWidth:'480px', width:'94%'}}>
        <div className="fi-sp-h">
          <span className="fi-sp-t">{title || '🔢 NUMÉROS DU MATCH'}</span>
          <button className="fi-sp-x" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        <div style={{padding:'12px 16px 8px', fontSize:12, color:'rgba(255,255,255,0.7)',
                     lineHeight:1.45, borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
          {subtitle || (
            <>Édite les numéros que porteront les joueurs lors de <b>CE match</b>. Les numéros saison restent inchangés.</>
          )}
        </div>

        {dupes.length > 0 && (
          <div style={{
            margin:'10px 16px 0', padding:'8px 12px', borderRadius:8,
            background:'rgba(255,80,80,0.10)', border:'1px solid rgba(255,80,80,0.40)',
            color:'#ff9a9a', fontSize:11.5, fontWeight:700,
            display:'flex', alignItems:'center', gap:6,
          }}>
            <span>⚠️</span>
            <span>Numéro{dupes.length > 1 ? 's' : ''} en doublon : <b>{dupes.join(', ')}</b></span>
          </div>
        )}

        <div style={{padding:'8px 16px', maxHeight:'54vh', overflowY:'auto'}}>
          {list.length === 0 ? (
            <div style={{textAlign:'center', padding:'24px 0', color:'rgba(255,255,255,0.5)', fontSize:13}}>
              Aucun joueur convoqué.
            </div>
          ) : list.map(p => {
            const seasonNum = p.num;
            const matchNum = edits[p.id];
            const isOverride = matchNum !== '' && +matchNum !== seasonNum;
            const isDupe = matchNum !== '' && (counts[matchNum] || 0) > 1;
            return (
              <div key={p.id} style={{
                display:'grid', gridTemplateColumns:'auto 1fr auto', gap:10,
                alignItems:'center', padding:'8px 0',
                borderBottom:'1px solid rgba(255,255,255,0.04)',
              }}>
                <div style={{
                  width:36, height:36, borderRadius:'50%',
                  background:'rgba(255,255,255,0.06)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:11, fontWeight:800, color:'rgba(255,255,255,0.7)',
                  overflow:'hidden', flexShrink:0,
                  border:'1px solid rgba(255,255,255,0.08)',
                }}>
                  {(p.photoDataUrl || p.photo) ? (
                    <img src={p.photoDataUrl || p.photo} alt=""
                         style={{width:'100%', height:'100%', objectFit:'cover'}}/>
                  ) : (
                    <span>{(p.first || '?')[0]}{(p.last || '?')[0]}</span>
                  )}
                </div>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:14, fontWeight:700, color:'#fff',
                               whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>
                    {p.first} {p.last}
                  </div>
                  <div style={{fontSize:10, color:'rgba(255,255,255,0.45)', marginTop:2,
                               display:'flex', gap:8, alignItems:'center'}}>
                    <span>Saison : #{seasonNum ?? '—'}</span>
                    {isOverride && !isDupe && (
                      <span style={{color:'#c8f169', fontWeight:700}}>· match #{matchNum} ✓</span>
                    )}
                    {isOverride && isDupe && (
                      <span style={{color:'#ff9a9a', fontWeight:700}}>· match #{matchNum} ⚠</span>
                    )}
                  </div>
                </div>
                <input
                  type="text" inputMode="numeric" pattern="[0-9]*"
                  value={matchNum}
                  onChange={e => update(p.id, e.target.value)}
                  placeholder={seasonNum != null ? String(seasonNum) : '#'}
                  style={{
                    width:64, height:44, padding:'0 8px',
                    // 3 états : doublon (rouge), changement OK (vert), neutre.
                    background: isDupe
                      ? 'rgba(255,80,80,0.14)'
                      : isOverride ? 'rgba(200,241,105,0.16)' : 'rgba(0,0,0,0.35)',
                    border: '1px solid ' + (isDupe
                      ? 'rgba(255,80,80,0.55)'
                      : isOverride ? 'rgba(200,241,105,0.50)' : 'rgba(255,255,255,0.15)'),
                    borderRadius:9,
                    color: isDupe ? '#ff9a9a' : isOverride ? '#c8f169' : '#fff',
                    fontSize:20, fontWeight:900, textAlign:'center',
                    outline:'none', fontVariantNumeric:'tabular-nums',
                  }}
                />
              </div>
            );
          })}
        </div>

        <div style={{display:'flex', gap:8, padding:'10px 16px 16px',
                     borderTop:'1px solid rgba(255,255,255,0.06)'}}>
          <button onClick={reset} type="button"
                  style={{flex:1, height:42, borderRadius:9, cursor:'pointer',
                          background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.75)',
                          border:'1px solid rgba(255,255,255,0.15)', fontSize:12, fontWeight:700}}>
            ↻ Reset (num saison)
          </button>
          {showSkip && (
            <button onClick={onClose} type="button"
                    style={{flex:1, height:42, borderRadius:9, cursor:'pointer',
                            background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.75)',
                            border:'1px solid rgba(255,255,255,0.15)', fontSize:12, fontWeight:700}}>
              Plus tard
            </button>
          )}
          <button onClick={() => save(false)} type="button"
                  style={{flex:2, height:42, borderRadius:9, cursor:'pointer',
                          background: savedFlash ? 'rgba(200,241,105,0.40)' : 'var(--acc, #c8f169)',
                          color:'#000', border:'none', fontSize:13.5, fontWeight:800,
                          letterSpacing:'.02em'}}>
            {savedFlash ? '✓ Enregistré' : (confirmLabel || '💾 Enregistrer')}
          </button>
        </div>
      </div>
    </div>
  );
}

window.JerseyNumbersModal = JerseyNumbersModal;
