/* global React */
/* ============================================================
   FRIENDLY MATCH MODAL — Création / édition d'un match amical
   ============================================================
   Modale minimale : date · heure · adversaire · domicile/extérieur.
   Les infos détaillées (stade, adresse, horaires précis, covoit)
   sont gérées séparément via match-info-modal après création.

   Props :
     - teamId, clubId (requis)
     - existing : match existant à éditer (null pour création)
     - onClose() : fermeture sans action
     - onSaved(match) : callback après save (avec l'objet match)
   ============================================================ */

function FriendlyMatchModal({ teamId, clubId, existing, onClose, onSaved }) {
  const isEdit = !!existing;

  // Default date : prochain dimanche à 14h (le plus courant pour le foot amateur).
  const defaultDate = (() => {
    if (existing && existing.date) return existing.date;
    const d = new Date();
    const dow = d.getDay(); // 0 = dimanche
    const daysToSunday = (7 - dow) % 7 || 7;
    d.setDate(d.getDate() + daysToSunday);
    return d.toISOString().slice(0, 10);
  })();

  const [date, setDate] = React.useState(defaultDate);
  const [time, setTime] = React.useState(existing?.time || '14:00');
  const [opponent, setOpponent] = React.useState(existing?.opponent || '');
  const [venue, setVenue] = React.useState(existing?.venue || 'H');
  const [savedFlash, setSavedFlash] = React.useState(false);

  const canSave = !!date && !!opponent.trim();

  const save = () => {
    if (!canSave) return;
    const payload = {
      date,
      time: time || '',
      opponent: opponent.trim(),
      venue,
      clubId,
    };
    let m;
    if (isEdit) {
      m = window.CDD_FRIENDLY?.update?.(teamId, existing.id, payload);
    } else {
      m = window.CDD_FRIENDLY?.create?.(teamId, payload);
    }
    if (!m) { alert("Sauvegarde échouée."); return; }
    setSavedFlash(true);
    setTimeout(() => {
      setSavedFlash(false);
      if (onSaved) onSaved(m);
      else if (onClose) onClose();
    }, 500);
  };

  const remove = () => {
    if (!isEdit) return;
    if (!confirm(`Supprimer le match amical contre ${existing.opponent} du ${existing.date} ?\n\nLes données liées (convocation, compo, infos) seront aussi effacées.`)) return;
    window.CDD_FRIENDLY?.remove?.(teamId, existing.id);
    if (onClose) onClose();
  };

  // Style helpers
  const inputStyle = {
    width:'100%', padding:'11px 12px', borderRadius:9, fontSize:14,
    background:'rgba(255,255,255,0.04)',
    border:'1px solid rgba(255,255,255,0.12)',
    color:'#fff', fontFamily:'inherit', outline:'none', boxSizing:'border-box',
  };
  const labelStyle  = { display:'flex', flexDirection:'column', gap:5, marginBottom:10 };
  const labelText   = { fontSize:11, fontWeight:700, opacity:0.7, letterSpacing:'.04em' };
  const venueBtn = (key, label, ic) => (
    <button type="button" onClick={() => setVenue(key)}
      style={{
        flex:1, padding:'12px 8px', borderRadius:9, cursor:'pointer',
        background: venue === key ? 'rgba(200,241,105,0.18)' : 'rgba(255,255,255,0.04)',
        color: venue === key ? '#c8f169' : 'rgba(255,255,255,0.85)',
        border: '1px solid ' + (venue === key ? 'rgba(200,241,105,0.50)' : 'rgba(255,255,255,0.12)'),
        fontSize:13, fontWeight:800, letterSpacing:'.02em',
        display:'flex', alignItems:'center', justifyContent:'center', gap:6,
      }}>
      <span>{ic}</span><span>{label}</span>
    </button>
  );

  return (
    <div className="fi-sp-overlay" onClick={onClose}>
      <div className="fi-sp-sheet" onClick={e => e.stopPropagation()}
           style={{maxWidth:'460px', width:'94%'}}>
        <div className="fi-sp-h">
          <span className="fi-sp-t">
            {isEdit ? '✏️ ÉDITER LE MATCH AMICAL' : '🤝 NOUVEAU MATCH AMICAL'}
          </span>
          <button className="fi-sp-x" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        <div style={{padding:'12px 16px 8px', fontSize:12, color:'rgba(255,255,255,0.7)',
                     lineHeight:1.45, borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
          Un match hors-championnat (préparation, tournoi, jubilé…). Après création,
          tu pourras le retrouver dans Convocations et préparer la compo / les
          infos pratiques comme un match normal.
        </div>

        <div style={{padding:'12px 16px'}}>

          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
            <label style={labelStyle}>
              <span style={labelText}>DATE</span>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle}/>
            </label>
            <label style={labelStyle}>
              <span style={labelText}>HEURE (COUP D'ENVOI)</span>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} style={inputStyle}/>
            </label>
          </div>

          <label style={labelStyle}>
            <span style={labelText}>ADVERSAIRE</span>
            <input type="text" value={opponent} onChange={e => setOpponent(e.target.value)}
                   placeholder="ex: FC Saint-Denis U15 A" autoFocus={!isEdit}
                   style={inputStyle}/>
          </label>

          <div style={{marginBottom:12}}>
            <div style={{...labelText, marginBottom:6}}>LIEU</div>
            <div style={{display:'flex', gap:8}}>
              {venueBtn('H', 'À domicile',   '🏠')}
              {venueBtn('E', 'À l\'extérieur', '🚗')}
            </div>
          </div>

          <div style={{
            padding:'10px 12px', borderRadius:9,
            background:'rgba(125,211,252,0.08)', border:'1px solid rgba(125,211,252,0.25)',
            fontSize:11, color:'rgba(255,255,255,0.7)', lineHeight:1.5, marginTop:4,
          }}>
            💡 Après création, ouvre la modale <b>📋 Infos du match</b> dans Convocations
            pour saisir l'adresse exacte du stade, le RDV vestiaire, le covoiturage…
          </div>
        </div>

        <div style={{display:'flex', gap:8, padding:'10px 16px 16px',
                     borderTop:'1px solid rgba(255,255,255,0.06)'}}>
          {isEdit && (
            <button onClick={remove} type="button"
                    style={{padding:'0 14px', height:42, borderRadius:9, cursor:'pointer',
                            background:'rgba(255,80,80,0.10)', color:'#ff8a8a',
                            border:'1px solid rgba(255,80,80,0.35)', fontSize:12, fontWeight:700}}>
              🗑 Supprimer
            </button>
          )}
          <button onClick={onClose} type="button"
                  style={{flex:1, height:42, borderRadius:9, cursor:'pointer',
                          background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.75)',
                          border:'1px solid rgba(255,255,255,0.15)', fontSize:12, fontWeight:700}}>
            Annuler
          </button>
          <button onClick={save} type="button" disabled={!canSave}
                  style={{flex:2, height:42, borderRadius:9,
                          cursor: canSave ? 'pointer' : 'not-allowed',
                          background: savedFlash ? 'rgba(200,241,105,0.40)' : 'var(--acc, #c8f169)',
                          color:'#000', border:'none', fontSize:13.5, fontWeight:800,
                          letterSpacing:'.02em',
                          opacity: canSave ? 1 : 0.5}}>
            {savedFlash ? '✓ Enregistré' : (isEdit ? '💾 Enregistrer' : '🤝 Créer le match amical')}
          </button>
        </div>
      </div>
    </div>
  );
}

window.FriendlyMatchModal = FriendlyMatchModal;
