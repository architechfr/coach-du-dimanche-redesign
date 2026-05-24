/* global React */
/* ============================================================
   MATCH INFO MODAL — Édition des détails du match
   ============================================================
   Modale d'édition des infos pratiques d'un match (adversaire,
   stade, horaires, covoiturage, notes). Sauvegarde via
   window.CDD_MATCH_INFO.set().

   Props :
     - teamId, matchId (requis)
     - matchLabel : libellé optionnel pour le sous-titre ("Match du 24/05")
     - onClose() : fermeture
     - onSaved() : callback après save
   ============================================================ */

function MatchInfoModal({ teamId, matchId, matchLabel, onClose, onSaved }) {
  const [data, setData] = React.useState(() => {
    const stored = window.CDD_MATCH_INFO?.get?.(teamId, matchId) || {
      opponent: { name: '', city: '' },
      stadium:  { name: '', address: '' },
      kickoff:  '',
      arrival:  '',
      carpool:  { enabled: false, place: '', time: '', note: '' },
      notes:    '',
    };
    let working = stored;
    try {
      const nextMatch = window.CDD_NEXT_MATCH || {};
      const isHome = (nextMatch.venue === 'Domicile');
      const myClubName = (window.CDD_CLUB && (window.CDD_CLUB.name || window.CDD_CLUB.short)) || '';
      // Pré-remplir le nom de l'adversaire depuis CDD_NEXT_MATCH si vide.
      // L'adversaire est dans next.away si on est à domicile, sinon next.home.
      // On évite de mettre son propre nom de club s'il apparaît côté away/home.
      const opponentName = isHome ? (nextMatch.away || '') : (nextMatch.home || '');
      if (opponentName && !working.opponent.name && opponentName !== myClubName) {
        working = { ...working, opponent: { ...working.opponent, name: opponentName } };
      }
      // Pré-remplir le coup d'envoi depuis next.time si dispo et vide.
      if (nextMatch.time && !working.kickoff) {
        working = { ...working, kickoff: nextMatch.time };
      }
      // Pré-remplir le stade depuis le club si match à domicile ET stade vide.
      const clubStadium = window.CDD_CLUB?.stadium;
      if (isHome && clubStadium && !working.stadium.name && !working.stadium.address) {
        working = {
          ...working,
          stadium: {
            name:    clubStadium.name    || '',
            address: clubStadium.address || '',
          },
        };
      }
    } catch (e) {}
    return working;
  });
  const [savedFlash, setSavedFlash] = React.useState(false);

  const updateOpp = (key, v) => setData(d => ({ ...d, opponent: { ...d.opponent, [key]: v } }));
  const updateStd = (key, v) => setData(d => ({ ...d, stadium:  { ...d.stadium,  [key]: v } }));
  const updateCar = (key, v) => setData(d => ({ ...d, carpool:  { ...d.carpool,  [key]: v } }));

  const save = () => {
    window.CDD_MATCH_INFO?.set?.(teamId, matchId, data);
    setSavedFlash(true);
    setTimeout(() => {
      setSavedFlash(false);
      if (onSaved) onSaved();
      else if (onClose) onClose();
    }, 500);
  };

  // Style helpers
  const inputStyle = {
    width:'100%', padding:'11px 12px', borderRadius:9, fontSize:14,
    background:'rgba(255,255,255,0.04)',
    border:'1px solid rgba(255,255,255,0.12)',
    color:'#fff', fontFamily:'inherit', outline:'none', boxSizing:'border-box',
  };
  const labelStyle = {
    display:'flex', flexDirection:'column', gap:5, marginBottom:10,
  };
  const labelText = {
    fontSize:11, fontWeight:700, opacity:0.7, letterSpacing:'.04em',
  };
  const sectionHeader = {
    fontSize:11, fontWeight:900, letterSpacing:'.08em',
    color:'#c8f169', marginTop:14, marginBottom:8, textTransform:'uppercase',
  };

  return (
    <div className="fi-sp-overlay" onClick={onClose}>
      <div className="fi-sp-sheet" onClick={e => e.stopPropagation()}
           style={{maxWidth:'520px', width:'94%'}}>
        <div className="fi-sp-h">
          <span className="fi-sp-t">📋 INFOS DU MATCH</span>
          <button className="fi-sp-x" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        {matchLabel && (
          <div style={{padding:'10px 16px 4px', fontSize:12, color:'rgba(255,255,255,0.65)'}}>
            {matchLabel}
          </div>
        )}

        <div style={{padding:'12px 16px', maxHeight:'62vh', overflowY:'auto'}}>

          {/* ───── Adversaire ───── */}
          <div style={sectionHeader}>⚽ Adversaire</div>
          <label style={labelStyle}>
            <span style={labelText}>NOM DU CLUB ADVERSE</span>
            <input type="text" value={data.opponent.name}
                   onChange={e => updateOpp('name', e.target.value)}
                   placeholder="ex: FC Saint-Denis U15 A" style={inputStyle}/>
          </label>
          <label style={labelStyle}>
            <span style={labelText}>VILLE</span>
            <input type="text" value={data.opponent.city}
                   onChange={e => updateOpp('city', e.target.value)}
                   placeholder="ex: Saint-Denis" style={inputStyle}/>
          </label>

          {/* ───── Stade ───── */}
          <div style={sectionHeader}>🏟️ Stade du match</div>
          <label style={labelStyle}>
            <span style={labelText}>NOM DU STADE</span>
            <input type="text" value={data.stadium.name}
                   onChange={e => updateStd('name', e.target.value)}
                   placeholder="ex: Stade Auguste-Delaune" style={inputStyle}/>
          </label>
          <label style={labelStyle}>
            <span style={labelText}>ADRESSE COMPLÈTE</span>
            <input type="text" value={data.stadium.address}
                   onChange={e => updateStd('address', e.target.value)}
                   placeholder="ex: 1 rue des Sports, 93200 Saint-Denis" style={inputStyle}/>
          </label>

          {/* ───── Horaires ───── */}
          <div style={sectionHeader}>🕐 Horaires</div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
            <label style={labelStyle}>
              <span style={labelText}>RDV VESTIAIRE</span>
              <input type="time" value={data.arrival}
                     onChange={e => setData(d => ({ ...d, arrival: e.target.value }))}
                     style={inputStyle}/>
            </label>
            <label style={labelStyle}>
              <span style={labelText}>COUP D'ENVOI</span>
              <input type="time" value={data.kickoff}
                     onChange={e => setData(d => ({ ...d, kickoff: e.target.value }))}
                     style={inputStyle}/>
            </label>
          </div>

          {/* ───── Covoiturage ───── */}
          <div style={sectionHeader}>🚗 Covoiturage (optionnel)</div>
          <label style={{display:'flex', alignItems:'center', gap:10, marginBottom:10, cursor:'pointer'}}>
            <input type="checkbox" checked={data.carpool.enabled}
                   onChange={e => updateCar('enabled', e.target.checked)}
                   style={{width:18, height:18, accentColor:'#c8f169', cursor:'pointer'}}/>
            <span style={{fontSize:13, fontWeight:600}}>Organiser un covoiturage depuis le club-house</span>
          </label>
          {data.carpool.enabled && (
            <>
              <label style={labelStyle}>
                <span style={labelText}>LIEU DE DÉPART</span>
                <input type="text" value={data.carpool.place}
                       onChange={e => updateCar('place', e.target.value)}
                       placeholder="ex: Parking du stade FCMH" style={inputStyle}/>
              </label>
              <label style={labelStyle}>
                <span style={labelText}>HEURE DE DÉPART</span>
                <input type="time" value={data.carpool.time}
                       onChange={e => updateCar('time', e.target.value)}
                       style={inputStyle}/>
              </label>
              <label style={labelStyle}>
                <span style={labelText}>NOTE (OPTIONNEL)</span>
                <input type="text" value={data.carpool.note}
                       onChange={e => updateCar('note', e.target.value)}
                       placeholder="ex: Prévoir 1h de route, conducteurs : X et Y" style={inputStyle}/>
              </label>
            </>
          )}

          {/* ───── Notes libres ───── */}
          <div style={sectionHeader}>📝 Notes libres</div>
          <label style={labelStyle}>
            <span style={labelText}>INFORMATIONS COMPLÉMENTAIRES</span>
            <textarea value={data.notes}
                      onChange={e => setData(d => ({ ...d, notes: e.target.value }))}
                      placeholder="ex: Tenue alternative (maillot rouge), prévoir gourde, météo prévue pluie…"
                      rows={3}
                      style={{ ...inputStyle, resize:'vertical', minHeight:60, fontFamily:'inherit' }}/>
          </label>
        </div>

        <div style={{display:'flex', gap:8, padding:'10px 16px 16px',
                     borderTop:'1px solid rgba(255,255,255,0.06)'}}>
          <button onClick={onClose} type="button"
                  style={{flex:1, height:42, borderRadius:9, cursor:'pointer',
                          background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.75)',
                          border:'1px solid rgba(255,255,255,0.15)', fontSize:12, fontWeight:700}}>
            Annuler
          </button>
          <button onClick={save} type="button"
                  style={{flex:2, height:42, borderRadius:9, cursor:'pointer',
                          background: savedFlash ? 'rgba(200,241,105,0.40)' : 'var(--acc, #c8f169)',
                          color:'#000', border:'none', fontSize:13.5, fontWeight:800,
                          letterSpacing:'.02em'}}>
            {savedFlash ? '✓ Enregistré' : '💾 Enregistrer les infos'}
          </button>
        </div>
      </div>
    </div>
  );
}

window.MatchInfoModal = MatchInfoModal;
