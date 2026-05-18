/* global React */

/* ============================================================
   STATUS DETAIL MODAL — Questions contextuelles par statut
   ============================================================
   S'ouvre après sélection d'un statut autre que "active" (Disponible).
   - Préremplit avec le statusMeta existant si présent.
   - Skippable : si l'utilisateur ferme sans valider, le statut nu
     est conservé (seul le statut a été setté avant l'ouverture).
   - Pour "active", aucune modale : on archive juste l'ancien meta.

   API:
     window.CDD_STATUS_DETAIL.open(statusId, player, onDone?)
   ============================================================ */

const { useState: useStateSD } = React;

/* ───── Catalogues de choix ───── */
const SD_CHOICES = {
  rest: {
    motif: [
      { id: 'ecole',    l: '🎒 École' },
      { id: 'vacances', l: '🌴 Vacances' },
      { id: 'famille',  l: '👪 Famille' },
      { id: 'perso',    l: '👤 Perso' },
      { id: 'autre',    l: '… Autre' },
    ],
    duree: [
      { id: 'match',     l: '1 match' },
      { id: 'date',      l: 'Jusqu\'à date' },
      { id: 'illimite',  l: 'Illimitée' },
    ],
  },
  injured: {
    gravite: [
      { id: 'legere',     l: '🟢 Légère' },
      { id: 'moderee',    l: '🟡 Modérée' },
      { id: 'grave',      l: '🟠 Grave' },
      { id: 'tres_grave', l: '🔴 Très grave' },
    ],
    type: [
      { id: 'musculaire',  l: 'Musculaire' },
      { id: 'articulaire', l: 'Articulaire' },
      { id: 'osseuse',     l: 'Osseuse' },
      { id: 'tendineuse',  l: 'Tendineuse' },
      { id: 'coup',        l: 'Coup' },
      { id: 'maladie',     l: 'Maladie' },
      { id: 'autre',       l: 'Autre' },
    ],
    zone: [
      { id: 'tete',     l: 'Tête' },
      { id: 'tronc',    l: 'Tronc' },
      { id: 'bras',     l: 'Bras' },
      { id: 'main',     l: 'Main' },
      { id: 'cuisse',   l: 'Cuisse' },
      { id: 'genou',    l: 'Genou' },
      { id: 'mollet',   l: 'Mollet' },
      { id: 'cheville', l: 'Cheville' },
      { id: 'pied',     l: 'Pied' },
    ],
    cote: [
      { id: 'gauche', l: 'Gauche' },
      { id: 'droite', l: 'Droite' },
      { id: 'na',     l: 'N/A' },
    ],
    dureeSemaines: [
      { id: 1,  l: '1 sem' },
      { id: 2,  l: '2 sem' },
      { id: 4,  l: '4 sem' },
      { id: 6,  l: '6 sem' },
      { id: 8,  l: '8 sem' },
      { id: 12, l: '12 sem' },
    ],
  },
  suspended: {
    typeSuspension: [
      { id: 'rouge',          l: '🟥 Carton rouge' },
      { id: 'jaune_cumul',    l: '🟨 Jaune cumul' },
      { id: 'disciplinaire',  l: 'Disciplinaire club' },
      { id: 'administrative', l: 'Administrative FFF' },
    ],
    nbMatchs: [
      { id: 1, l: '1 match' },
      { id: 2, l: '2 matchs' },
      { id: 3, l: '3 matchs' },
      { id: 4, l: '4+' },
    ],
  },
  reserve: {
    motifReserve: [
      { id: 'performance',   l: 'Performance' },
      { id: 'choix_sportif', l: 'Choix sportif' },
      { id: 'disciplinaire', l: 'Disciplinaire' },
      { id: 'demotivation',  l: 'Démotivation' },
      { id: 'autre',         l: 'Autre' },
    ],
  },
};

/* ───── Sous-composant Pills (boutons radio) ───── */
function SDPills({ options, value, onChange }) {
  return (
    <div className="sd-pills">
      {options.map(o => (
        <button key={String(o.id)} type="button"
          className={'sd-pill' + (String(value) === String(o.id) ? ' on' : '')}
          onClick={() => onChange(o.id)}>
          {o.l}
        </button>
      ))}
    </div>
  );
}

/* ───── Bloc Champ avec label ───── */
function SDField({ label, required, children }) {
  return (
    <div className="sd-field">
      <div className="sd-label">{label}{required && <span className="sd-req"> *</span>}</div>
      {children}
    </div>
  );
}

/* ───── Format date YYYY-MM-DD pour input ───── */
function sdToday() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}
function sdAddDays(iso, days) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/* ───── COMPOSANT PRINCIPAL ───── */
function StatusDetailModal({ statusId, player, onClose }) {
  // Préfill depuis l'existant
  const initial = (window.CDD_COACH?.getStatusMeta?.(player.id)) || {};
  const [meta, setMeta] = useStateSD(() => ({
    // Communs
    note: initial.note || '',
    startedAt: initial.startedAt || sdToday(),

    // rest
    motif:        initial.motif || null,
    dureeType:    initial.dureeType || null,
    dureeJusqua:  initial.dureeJusqua || '',

    // injured
    gravite:         initial.gravite || null,
    typeBlessure:    initial.typeBlessure || null,
    zoneCorps:       initial.zoneCorps || null,
    cote:            initial.cote || null,
    dureeSemaines:   initial.dureeSemaines || null,
    dateDebut:       initial.dateDebut || sdToday(),
    suiviMedical:    initial.suiviMedical || false,
    suiviMedicalNote: initial.suiviMedicalNote || '',

    // suspended
    typeSuspension:    initial.typeSuspension || null,
    nbMatchs:          initial.nbMatchs || null,
    matchDeclencheur:  initial.matchDeclencheur || '',
    notificationRecue: initial.notificationRecue || false,

    // reserve
    motifReserve: initial.motifReserve || null,
    evalDate:     initial.evalDate || sdAddDays(sdToday(), 30),
  }));

  const upd = (k, v) => setMeta(m => ({ ...m, [k]: v }));

  const handleSave = () => {
    // Nettoyage : ne garde que les champs pertinents pour le statut
    const clean = {
      note: meta.note?.trim() || null,
      startedAt: meta.startedAt || sdToday(),
      _v: 1, // version schéma
    };
    if (statusId === 'rest') {
      clean.motif = meta.motif;
      clean.dureeType = meta.dureeType;
      if (meta.dureeType === 'date') clean.dureeJusqua = meta.dureeJusqua || null;
    }
    if (statusId === 'injured') {
      clean.gravite = meta.gravite;
      clean.typeBlessure = meta.typeBlessure;
      clean.zoneCorps = meta.zoneCorps;
      clean.cote = meta.cote;
      clean.dureeSemaines = meta.dureeSemaines;
      clean.dateDebut = meta.dateDebut || sdToday();
      if (clean.dureeSemaines) clean.retourPrevu = sdAddDays(clean.dateDebut, clean.dureeSemaines * 7);
      clean.suiviMedical = !!meta.suiviMedical;
      if (clean.suiviMedical) clean.suiviMedicalNote = meta.suiviMedicalNote?.trim() || null;
    }
    if (statusId === 'suspended') {
      clean.typeSuspension = meta.typeSuspension;
      clean.nbMatchs = meta.nbMatchs;
      clean.matchDeclencheur = meta.matchDeclencheur?.trim() || null;
      clean.notificationRecue = !!meta.notificationRecue;
    }
    if (statusId === 'reserve') {
      clean.motifReserve = meta.motifReserve;
      clean.evalDate = meta.evalDate || null;
    }
    // Écrase totalement le meta du joueur (replace, pas merge)
    try {
      const all = JSON.parse(localStorage.getItem('cdd_player_status_meta') || '{}');
      all[player.id] = clean;
      localStorage.setItem('cdd_player_status_meta', JSON.stringify(all));
    } catch (e) {}
    window.dispatchEvent(new CustomEvent('cdd-player-changed', { detail: { playerId: player.id } }));
    if (window.CDD_REBUILD) window.CDD_REBUILD();
    onClose?.(clean);
  };

  const handleSkip = () => { onClose?.(null); };

  const playerName = (player.first || '').toUpperCase();
  const C = SD_CHOICES[statusId] || {};

  return (
    <div className="fi-sp-overlay" onClick={handleSkip}>
      <div className="fi-sp-sheet sd-sheet" onClick={e => e.stopPropagation()}>
        <div className="fi-sp-h">
          <span className="fi-sp-t">
            {statusId === 'rest'      && `INDISPONIBILITÉ DE ${playerName}`}
            {statusId === 'injured'   && `BLESSURE DE ${playerName}`}
            {statusId === 'suspended' && `SUSPENSION DE ${playerName}`}
            {statusId === 'reserve'   && `RÉSERVE — ${playerName}`}
          </span>
          <button className="fi-sp-x" onClick={handleSkip}>✕</button>
        </div>

        <div className="sd-body">

          {/* ────── REST ────── */}
          {statusId === 'rest' && (
            <>
              <SDField label="Motif">
                <SDPills options={C.motif} value={meta.motif} onChange={v => upd('motif', v)} />
              </SDField>
              <SDField label="Durée">
                <SDPills options={C.duree} value={meta.dureeType} onChange={v => upd('dureeType', v)} />
              </SDField>
              {meta.dureeType === 'date' && (
                <SDField label="Jusqu'au">
                  <input type="date" className="sd-input" value={meta.dureeJusqua}
                    onChange={e => upd('dureeJusqua', e.target.value)} />
                </SDField>
              )}
            </>
          )}

          {/* ────── INJURED ────── */}
          {statusId === 'injured' && (
            <>
              <SDField label="Gravité" required>
                <SDPills options={C.gravite} value={meta.gravite} onChange={v => upd('gravite', v)} />
              </SDField>
              <SDField label="Type">
                <SDPills options={C.type} value={meta.typeBlessure} onChange={v => upd('typeBlessure', v)} />
              </SDField>
              <SDField label="Zone du corps">
                <SDPills options={C.zone} value={meta.zoneCorps} onChange={v => upd('zoneCorps', v)} />
              </SDField>
              <SDField label="Côté">
                <SDPills options={C.cote} value={meta.cote} onChange={v => upd('cote', v)} />
              </SDField>
              <SDField label="Durée d'indispo prévue">
                <SDPills options={C.dureeSemaines} value={meta.dureeSemaines} onChange={v => upd('dureeSemaines', v)} />
              </SDField>
              <SDField label="Date de la blessure">
                <input type="date" className="sd-input" value={meta.dateDebut}
                  onChange={e => upd('dateDebut', e.target.value)} />
              </SDField>
              <SDField label="Suivi médical">
                <label className="sd-check">
                  <input type="checkbox" checked={meta.suiviMedical}
                    onChange={e => upd('suiviMedical', e.target.checked)} />
                  <span>En cours</span>
                </label>
                {meta.suiviMedical && (
                  <input type="text" className="sd-input" placeholder="RDV ostéo, kiné, …"
                    value={meta.suiviMedicalNote}
                    onChange={e => upd('suiviMedicalNote', e.target.value)} />
                )}
              </SDField>
            </>
          )}

          {/* ────── SUSPENDED ────── */}
          {statusId === 'suspended' && (
            <>
              <SDField label="Type" required>
                <SDPills options={C.typeSuspension} value={meta.typeSuspension} onChange={v => upd('typeSuspension', v)} />
              </SDField>
              <SDField label="Nombre de matchs">
                <SDPills options={C.nbMatchs} value={meta.nbMatchs} onChange={v => upd('nbMatchs', v)} />
              </SDField>
              <SDField label="Match déclencheur (optionnel)">
                <input type="text" className="sd-input" placeholder="ex : FCMH vs PSG du 12/05"
                  value={meta.matchDeclencheur}
                  onChange={e => upd('matchDeclencheur', e.target.value)} />
              </SDField>
              <SDField label="Notification FFF">
                <label className="sd-check">
                  <input type="checkbox" checked={meta.notificationRecue}
                    onChange={e => upd('notificationRecue', e.target.checked)} />
                  <span>Reçue</span>
                </label>
              </SDField>
            </>
          )}

          {/* ────── RESERVE ────── */}
          {statusId === 'reserve' && (
            <>
              <SDField label="Motif" required>
                <SDPills options={C.motifReserve} value={meta.motifReserve} onChange={v => upd('motifReserve', v)} />
              </SDField>
              <SDField label="Date de réévaluation">
                <input type="date" className="sd-input" value={meta.evalDate}
                  onChange={e => upd('evalDate', e.target.value)} />
              </SDField>
            </>
          )}

          {/* ────── NOTE LIBRE (commun) ────── */}
          <SDField label="Note libre">
            <textarea className="sd-textarea" rows="2" placeholder="Précisions, contexte…"
              value={meta.note} onChange={e => upd('note', e.target.value)} />
          </SDField>
        </div>

        <div className="sd-actions">
          <button className="sd-btn sd-btn-ghost" onClick={handleSkip}>Plus tard</button>
          <button className="sd-btn sd-btn-primary" onClick={handleSave}>Valider</button>
        </div>
      </div>
    </div>
  );
}

/* ───── Styles injectés une seule fois ───── */
(function injectSDStyles(){
  if (document.getElementById('sd-styles')) return;
  const css = `
    .sd-sheet { max-height: 85vh; overflow-y: auto; }
    .sd-body { padding: 8px 16px 16px; display: flex; flex-direction: column; gap: 14px; }
    .sd-field { display: flex; flex-direction: column; gap: 6px; }
    .sd-label { font-size: 12px; font-weight: 600; opacity: 0.85; text-transform: uppercase; letter-spacing: 0.5px; }
    .sd-req { color: #f87171; }
    .sd-pills { display: flex; flex-wrap: wrap; gap: 6px; }
    .sd-pill {
      padding: 7px 12px; border-radius: 999px;
      background: rgba(255,255,255,0.06); color: #e5e7eb;
      border: 1px solid rgba(255,255,255,0.12);
      font-size: 13px; cursor: pointer; transition: all 0.15s;
    }
    .sd-pill:hover { background: rgba(255,255,255,0.1); }
    .sd-pill.on { background: #22c55e; color: #052e16; border-color: #16a34a; font-weight: 600; }
    .sd-input, .sd-textarea {
      width: 100%; padding: 9px 11px; border-radius: 8px;
      background: rgba(0,0,0,0.3); color: #fff;
      border: 1px solid rgba(255,255,255,0.15);
      font-size: 14px; font-family: inherit;
    }
    .sd-textarea { resize: vertical; min-height: 50px; }
    .sd-check { display: inline-flex; gap: 8px; align-items: center; font-size: 14px; cursor: pointer; }
    .sd-actions {
      display: flex; gap: 10px; padding: 12px 16px 16px;
      border-top: 1px solid rgba(255,255,255,0.08);
      position: sticky; bottom: 0;
      background: var(--sheet-bg, #1a1a1f);
    }
    .sd-btn {
      flex: 1; padding: 12px; border-radius: 10px;
      font-size: 14px; font-weight: 600; cursor: pointer; border: none;
    }
    .sd-btn-ghost { background: rgba(255,255,255,0.08); color: #e5e7eb; }
    .sd-btn-primary { background: #22c55e; color: #052e16; }
    .sd-btn-primary:hover { background: #16a34a; }
  `;
  const s = document.createElement('style');
  s.id = 'sd-styles';
  s.textContent = css;
  document.head.appendChild(s);
})();

/* ───── API publique ───── */
window.CDD_STATUS_DETAIL = {
  /**
   * Renvoie true si le statut nécessite l'ouverture de la modale détail.
   * - 'active' : non (clôture juste l'ancien meta)
   */
  needsDetail(statusId) {
    return ['rest', 'injured', 'suspended', 'reserve'].includes(statusId);
  },
  /**
   * Pour 'active' : clôture l'ancien meta (vide). Pas de modale.
   */
  clearMeta(playerId) {
    try {
      const all = JSON.parse(localStorage.getItem('cdd_player_status_meta') || '{}');
      delete all[playerId];
      localStorage.setItem('cdd_player_status_meta', JSON.stringify(all));
    } catch (e) {}
    window.dispatchEvent(new CustomEvent('cdd-player-changed', { detail: { playerId } }));
    if (window.CDD_REBUILD) window.CDD_REBUILD();
  },
  // Le composant est rendu inline par les écrans qui en ont besoin
  // (via <StatusDetailModal .../> dans leur JSX). Cette API expose le
  // composant pour usage externe via window.
  Component: StatusDetailModal,
};

console.log('[CDD] StatusDetailModal ready');
