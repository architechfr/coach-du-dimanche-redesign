/* global window */
/* ============================================================
   MATCH SWITCHER — Sélecteur du prochain match actif
   ============================================================
   Quand le coach a À LA FOIS un match FFF programmé ET un match
   amical, il doit pouvoir choisir lequel afficher comme "prochain
   match" (à préparer, convoquer, lancer).

   Par défaut : le match le plus proche dans le temps.
   Override par le coach : stocké dans cdd_active_match_{teamId}.

   Le module unifie la liste FFF + amicaux dans un format commun :
     { id, dateISO, time, opponent, venue('H'|'E'), kind('fff'|'amical'),
       label('Championnat'|'Match amical'), raw }
   ============================================================ */

(function() {
  const STORAGE_PREFIX = 'cdd_active_match_';

  function _keyFor(teamId) { return STORAGE_PREFIX + String(teamId); }
  function _todayISO() { return new Date().toISOString().slice(0, 10); }

  // Convertit un match FFF en format unifié.
  // FFF match raw shape (from fff-fetcher): { date, dateRaw, opp, home, away, venue('H'|'E'), journee }
  function _fromFff(m) {
    if (!m) return null;
    // dateRaw est typiquement ISO (YYYY-MM-DD HH:mm ou YYYY-MM-DDTHH:mm). On extrait.
    const dRaw = String(m.dateRaw || '');
    const isoMatch = /^(\d{4}-\d{2}-\d{2})/.exec(dRaw);
    const dateISO = isoMatch ? isoMatch[1] : '';
    const timeMatch = /(\d{2}:\d{2})/.exec(dRaw);
    const time = timeMatch ? timeMatch[1] : '';
    // Id stable pour le matching : on reproduit la même logique que data-bridge.js
    // (away + '__' + dateRaw) pour que les autres storages (match_lineup, etc.) trouvent.
    const id = `${m.away || 'inconnu'}__${m.dateRaw || m.date || 'sans-date'}`;
    return {
      id,
      kind: 'fff',
      dateISO,
      date: m.date || '',
      time,
      opponent: m.venue === 'H' ? (m.away || 'Adversaire') : (m.home || 'Adversaire'),
      venue: m.venue || 'H',
      label: 'Championnat',
      journee: m.journee,
      raw: m,
    };
  }
  function _fromFriendly(m) {
    if (!m) return null;
    return {
      id: m.id,
      kind: 'amical',
      dateISO: m.date || '',
      date: m.date || '',
      time: m.time || '',
      opponent: m.opponent || 'Adversaire',
      venue: m.venue || 'H',
      label: 'Match amical',
      raw: m,
    };
  }

  // Liste fusionnée des matchs à venir (FFF + amicaux), triée par date croissante.
  // EXCLUT le dernier match terminé (cdd_match_last_finished) pour éviter qu'il
  // reste affiché en "à venir" jusqu'au lendemain — bug remonté Florian 26/05 :
  // un amical joué dans la journée continuait à apparaître "J-0 · À VENIR".
  // Les amicaux terminés (endedAt) sont déjà filtrés par CDD_FRIENDLY.list().
  function listUpcoming(teamId) {
    const today = _todayISO();
    const lastFinishedId = (() => {
      try { return localStorage.getItem('cdd_match_last_finished') || null; }
      catch (e) { return null; }
    })();
    const out = [];
    // FFF
    const fffList = Array.isArray(window.CDD_FFF_UPCOMING) ? window.CDD_FFF_UPCOMING : [];
    fffList.forEach(m => {
      const u = _fromFff(m);
      if (!u) return;
      if (u.dateISO && u.dateISO < today) return;
      if (lastFinishedId && u.id === lastFinishedId) return;
      out.push(u);
    });
    // Amicaux (CDD_FRIENDLY.list filtre déjà les endedAt)
    if (teamId && window.CDD_FRIENDLY?.list) {
      const friendlies = window.CDD_FRIENDLY.list(teamId);
      friendlies.forEach(m => {
        if (m.date && m.date < today) return;
        if (lastFinishedId && m.id === lastFinishedId) return;
        const u = _fromFriendly(m);
        if (u) out.push(u);
      });
    }
    out.sort((a, b) => String(a.dateISO || '').localeCompare(String(b.dateISO || '')));
    return out;
  }

  // Retourne le match actif (choisi par le coach ou défaut = plus proche).
  function getActive(teamId) {
    const list = listUpcoming(teamId);
    if (list.length === 0) return null;
    // Choix explicite du coach
    try {
      const chosenId = (localStorage.getItem(_keyFor(teamId)) || '').trim();
      if (chosenId) {
        const m = list.find(x => x.id === chosenId);
        if (m) return m;
      }
    } catch (e) {}
    // Défaut : le plus proche
    return list[0];
  }

  // Définit le match actif. id=null/'' = retour au mode auto (plus proche).
  function setActive(teamId, matchId) {
    if (!teamId) return;
    try {
      if (matchId) localStorage.setItem(_keyFor(teamId), String(matchId));
      else         localStorage.removeItem(_keyFor(teamId));
    } catch (e) {}
    try { window.dispatchEvent(new CustomEvent('cdd-active-match-changed', { detail: { teamId, matchId } })); } catch (e) {}
    if (window.CDD_REBUILD) window.CDD_REBUILD();
  }

  // Indique si le coach a forcé un choix (ou si on est en auto).
  function hasExplicitChoice(teamId) {
    if (!teamId) return false;
    try {
      const chosen = (localStorage.getItem(_keyFor(teamId)) || '').trim();
      if (!chosen) return false;
      // Si le matchId choisi n'existe plus dans la liste (match terminé,
      // supprimé...) on retourne false pour que le fallback automatique
      // (FFF / amical le plus proche) reprenne la main.
      const list = listUpcoming(teamId);
      return list.some(m => m.id === chosen);
    } catch (e) { return false; }
  }

  window.CDD_MATCH_SWITCHER = {
    listUpcoming, getActive, setActive, hasExplicitChoice,
  };
})();
