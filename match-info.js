/* global window */
/* ============================================================
   MATCH INFO — Détails pratiques du match pour la convocation
   ============================================================
   Une convocation sans infos précises (stade, adresse, horaires
   RDV vs coup d'envoi, covoiturage) est inexploitable en pratique.

   Ce module stocke par (teamId, matchId) :
   - Adversaire : nom + ville
   - Stade : nom + adresse complète
   - Horaires : coup d'envoi + RDV vestiaire (sur site)
   - Covoiturage : départ depuis le club-house (lieu + heure)
   - Notes libres

   Storage local : localStorage 'cdd_match_info'
     = { [teamId]: { [matchId]: { opponent, stadium, kickoff, arrival,
                                  carpool, notes, updatedAt } } }

   Cloud : à pousser dans une collection match_infos quand
   firebase-sync.js sera étendu. Pour l'instant, local-first.
   ============================================================ */

(function() {
  const STORAGE_KEY = 'cdd_match_info';

  function _read() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch (e) { return {}; }
  }
  function _write(all) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(all)); } catch (e) {}
  }

  // Forme par défaut, utilisée comme template d'édition pour un match sans infos.
  function emptyInfo() {
    return {
      opponent: { name: '', city: '' },
      stadium:  { name: '', address: '' },
      kickoff:  '',    // HH:MM (coup d'envoi)
      arrival:  '',    // HH:MM (RDV vestiaire sur site)
      carpool:  { enabled: false, place: '', time: '', note: '' },
      notes:    '',
      updatedAt: 0,
    };
  }

  // Lecture des infos pour (teamId, matchId). Retourne emptyInfo() si rien.
  function get(teamId, matchId) {
    if (!teamId || !matchId) return emptyInfo();
    const all = _read();
    const info = all[teamId] && all[teamId][matchId];
    if (!info) return emptyInfo();
    // Merge avec emptyInfo pour garantir la forme (champs ajoutés futurs).
    const base = emptyInfo();
    return {
      opponent: { ...base.opponent, ...(info.opponent || {}) },
      stadium:  { ...base.stadium,  ...(info.stadium  || {}) },
      kickoff:  info.kickoff || '',
      arrival:  info.arrival || '',
      carpool:  { ...base.carpool,  ...(info.carpool  || {}) },
      notes:    info.notes || '',
      updatedAt: info.updatedAt || 0,
    };
  }

  // Indique si des infos significatives ont été saisies (au moins un champ rempli).
  function hasAny(teamId, matchId) {
    const i = get(teamId, matchId);
    return !!(i.opponent.name || i.opponent.city ||
              i.stadium.name  || i.stadium.address ||
              i.kickoff || i.arrival ||
              (i.carpool.enabled && (i.carpool.place || i.carpool.time)) ||
              i.notes);
  }

  // Écriture en masse (utilisée par la modale d'édition).
  // Push cloud fire-and-forget : adjoints, parents et lecteurs verront les
  // infos au prochain pullCloudData.
  function set(teamId, matchId, info) {
    if (!teamId || !matchId) return;
    const all = _read();
    if (!all[teamId]) all[teamId] = {};
    const stored = { ...info, updatedAt: Date.now() };
    all[teamId][matchId] = stored;
    _write(all);
    try { window.dispatchEvent(new CustomEvent('cdd-match-info-changed', { detail: { teamId, matchId } })); } catch (e) {}
    if (window.CDD_REBUILD) window.CDD_REBUILD();
    // Push cloud
    if (window.cddData?.saveMatchInfo) {
      const activeTeam = window.CDD?.getActiveTeam?.();
      window.cddData.saveMatchInfo(teamId, matchId, stored, activeTeam?.clubId)
        .catch(e => console.warn('[match-info] cloud push', e.message));
    }
  }

  // Reset complet pour un match.
  function clear(teamId, matchId) {
    if (!teamId || !matchId) return;
    const all = _read();
    if (all[teamId] && all[teamId][matchId]) {
      delete all[teamId][matchId];
      if (Object.keys(all[teamId]).length === 0) delete all[teamId];
      _write(all);
      try { window.dispatchEvent(new CustomEvent('cdd-match-info-changed', { detail: { teamId, matchId, cleared: true } })); } catch (e) {}
      if (window.CDD_REBUILD) window.CDD_REBUILD();
      // Cloud delete
      if (window.cddData?.deleteMatchInfo) {
        window.cddData.deleteMatchInfo(teamId, matchId)
          .catch(e => console.warn('[match-info] cloud delete', e.message));
      }
    }
  }

  // Formate les infos pour le message WhatsApp de convocation.
  // Retourne un bloc texte multi-ligne prêt à coller.
  function formatForMessage(info) {
    if (!info) return '';
    const lines = [];
    if (info.opponent && (info.opponent.name || info.opponent.city)) {
      const opp = [info.opponent.name, info.opponent.city].filter(Boolean).join(' · ');
      lines.push(`⚽ Adversaire : ${opp}`);
    }
    if (info.stadium && (info.stadium.name || info.stadium.address)) {
      lines.push(`🏟️ Stade : ${info.stadium.name || ''}`.trim());
      if (info.stadium.address) lines.push(`   📍 ${info.stadium.address}`);
    }
    if (info.kickoff) lines.push(`⚽ Coup d'envoi : ${info.kickoff}`);
    if (info.arrival) lines.push(`🕐 RDV vestiaire : ${info.arrival}`);
    if (info.carpool && info.carpool.enabled) {
      const c = info.carpool;
      const parts = [];
      if (c.place) parts.push(c.place);
      if (c.time)  parts.push(c.time);
      if (parts.length) lines.push(`🚗 Covoiturage : ${parts.join(' à ')}`);
      if (c.note)  lines.push(`   ${c.note}`);
    }
    if (info.notes) {
      lines.push('');
      lines.push(info.notes);
    }
    return lines.join('\n');
  }

  window.CDD_MATCH_INFO = {
    emptyInfo, get, hasAny, set, clear, formatForMessage,
  };
})();
