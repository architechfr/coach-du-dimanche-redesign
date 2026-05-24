/* global window */
/* ============================================================
   JERSEY NUMBERS — Numéros de maillot match-specific
   ============================================================
   Beaucoup d'équipes amateur ont des numéros variables : un joueur
   d'une autre catégorie qui dépanne, un maillot perdu, un échange
   de poste. On veut éditer les numéros JUSTE POUR CE MATCH sans
   toucher au num saison stocké dans le profil joueur.

   Storage : localStorage 'cdd_match_jersey_numbers' =
     { [teamId]: { [matchId]: { [playerId]: matchNum } } }

   Seuls les joueurs dont le num match diffère du num saison sont
   stockés (économie d'espace + clarté).
   ============================================================ */

(function() {
  const STORAGE_KEY = 'cdd_match_jersey_numbers';

  function _read() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch (e) { return {}; }
  }
  function _write(all) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(all)); } catch (e) {}
  }

  // Retourne le map { [playerId]: matchNum } pour (teamId, matchId).
  function getOverrides(teamId, matchId) {
    if (!teamId || !matchId) return {};
    const all = _read();
    return (all[teamId] && all[teamId][matchId]) || {};
  }

  // Retourne le num match pour un joueur, avec fallback sur le num saison.
  function getNum(teamId, matchId, playerId, fallback) {
    const o = getOverrides(teamId, matchId);
    const v = o[playerId];
    return (v !== undefined && v !== null && v !== '') ? v : fallback;
  }

  // Helper raccourci : applique le matchNum sur un objet player. Retourne le num à afficher.
  function ofPlayer(player) {
    if (!player) return null;
    try {
      const tid = window.CDD?.getActiveTeam?.()?.id;
      const mid = window.CDD_NEXT_MATCH?.id || 'placeholder';
      return getNum(tid, mid, player.id, player.num);
    } catch (e) { return player.num; }
  }

  // Définit le num match pour un joueur. Si num === num saison ou vide → supprime l'override.
  function setNum(teamId, matchId, playerId, num) {
    if (!teamId || !matchId || !playerId) return;
    const all = _read();
    if (!all[teamId]) all[teamId] = {};
    if (!all[teamId][matchId]) all[teamId][matchId] = {};
    if (num === undefined || num === null || num === '' || isNaN(+num)) {
      delete all[teamId][matchId][playerId];
    } else {
      all[teamId][matchId][playerId] = +num;
    }
    // Cleanup vide
    if (Object.keys(all[teamId][matchId]).length === 0) delete all[teamId][matchId];
    if (Object.keys(all[teamId] || {}).length === 0) delete all[teamId];
    _write(all);
    try { window.dispatchEvent(new CustomEvent('cdd-jersey-changed', { detail: { teamId, matchId, playerId, num } })); } catch (e) {}
    if (window.CDD_REBUILD) window.CDD_REBUILD();
  }

  // Écrit en masse un map { playerId: num }. Remplace TOUS les overrides du match.
  // Le map doit contenir SEULEMENT les overrides (num différents du num saison) ;
  // les autres seront effacés.
  function setBulk(teamId, matchId, map) {
    if (!teamId || !matchId || !map) return;
    const all = _read();
    if (!all[teamId]) all[teamId] = {};
    const clean = {};
    Object.keys(map).forEach(pid => {
      const v = map[pid];
      if (v !== undefined && v !== null && v !== '' && !isNaN(+v)) {
        clean[pid] = +v;
      }
    });
    if (Object.keys(clean).length === 0) {
      delete all[teamId][matchId];
    } else {
      all[teamId][matchId] = clean;
    }
    if (Object.keys(all[teamId] || {}).length === 0) delete all[teamId];
    _write(all);
    try { window.dispatchEvent(new CustomEvent('cdd-jersey-changed', { detail: { teamId, matchId, bulk: true } })); } catch (e) {}
    if (window.CDD_REBUILD) window.CDD_REBUILD();
  }

  // Indique si le match a au moins un override.
  function hasOverrides(teamId, matchId) {
    if (!teamId || !matchId) return false;
    const o = getOverrides(teamId, matchId);
    return Object.keys(o).length > 0;
  }

  // Indique si la modale a déjà été présentée pour ce match (au LANCER LE MATCH).
  // Utilisé pour ne pas re-prompter à chaque clic une fois que le coach a confirmé.
  function wasReviewed(teamId, matchId) {
    if (!teamId || !matchId) return false;
    try {
      const all = JSON.parse(localStorage.getItem('cdd_match_jersey_reviewed') || '{}');
      return !!(all[teamId] && all[teamId][matchId]);
    } catch (e) { return false; }
  }
  function markReviewed(teamId, matchId) {
    if (!teamId || !matchId) return;
    try {
      const all = JSON.parse(localStorage.getItem('cdd_match_jersey_reviewed') || '{}');
      if (!all[teamId]) all[teamId] = {};
      all[teamId][matchId] = Date.now();
      localStorage.setItem('cdd_match_jersey_reviewed', JSON.stringify(all));
    } catch (e) {}
  }

  window.CDD_JERSEY = {
    getOverrides, getNum, ofPlayer, setNum, setBulk, hasOverrides,
    wasReviewed, markReviewed,
  };
})();
