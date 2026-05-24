/* global window */
/* ============================================================
   FRIENDLY MATCHES — Matchs amicaux (hors-championnat)
   ============================================================
   Un match amical n'est PAS dans le calendrier FFF (qui ne liste
   que les rencontres officielles de championnat/coupe). Le coach
   les crée manuellement et les gère comme un match normal :
   convocation, compo, infos pratiques, numéros maillots, match live.

   Storage local : localStorage 'cdd_friendly_matches'
     = { [teamId]: [ { id, teamId, clubId, date, time?, opponent,
                       venue, isAmical:true, createdAt, updatedAt,
                       createdBy } ] }

   L'id commence par 'fr_' pour distinguer dans le code et dans le
   storage cdd_match_lineup, cdd_match_info, cdd_match_jersey_numbers
   (qui sont indexés par matchId — tous compatibles).
   ============================================================ */

(function() {
  const STORAGE_KEY = 'cdd_friendly_matches';

  function _read() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch (e) { return {}; }
  }
  function _write(all) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(all)); } catch (e) {}
  }

  function _genId() {
    return 'fr_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  // Vérifie si un id de match est celui d'un amical (préfixe).
  function isAmical(matchId) {
    return typeof matchId === 'string' && matchId.indexOf('fr_') === 0;
  }

  // Liste les matchs amicaux d'une équipe, triés par date croissante.
  // Par défaut, EXCLUT les matchs terminés (endedAt présent) → ils ne
  // doivent plus apparaître comme "à venir" sur les écrans de préparation.
  // Passer { includeEnded: true } pour récupérer l'historique complet.
  function list(teamId, opts) {
    if (!teamId) return [];
    const all = _read();
    let arr = (all[teamId] || []).slice();
    if (!opts || !opts.includeEnded) {
      arr = arr.filter(m => !m.endedAt);
    }
    arr.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
    return arr;
  }

  // Marque un match amical comme TERMINÉ. Appelé par endMatch côté
  // match-live. Le match disparaît immédiatement de list() (défaut).
  function markEnded(teamId, matchId) {
    return update(teamId, matchId, { endedAt: Date.now() });
  }

  // Récupère un match amical par id.
  function get(teamId, matchId) {
    if (!teamId || !matchId) return null;
    const arr = list(teamId);
    return arr.find(m => m.id === matchId) || null;
  }

  // Crée un match amical. Retourne l'objet créé (avec id généré).
  // payload = { date, time?, opponent, venue, clubId? }
  function create(teamId, payload) {
    if (!teamId || !payload || !payload.date) return null;
    const all = _read();
    if (!all[teamId]) all[teamId] = [];
    const match = {
      id: _genId(),
      teamId,
      clubId: payload.clubId || null,
      date: payload.date,
      time: payload.time || '',
      opponent: payload.opponent || 'Adversaire',
      venue: payload.venue || 'H',   // 'H' = domicile, 'E' = extérieur
      isAmical: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: payload.createdBy || null,
    };
    all[teamId].push(match);
    _write(all);
    _dispatch('created', { teamId, matchId: match.id });
    if (window.CDD_REBUILD) window.CDD_REBUILD();
    // Push cloud (fire-and-forget) si dispo
    if (window.cddData?.saveFriendlyMatch) {
      window.cddData.saveFriendlyMatch(match)
        .catch(e => console.warn('[friendly] cloud push', e.message));
    }
    return match;
  }

  // Met à jour partiellement un match amical.
  function update(teamId, matchId, patch) {
    if (!teamId || !matchId || !patch) return null;
    const all = _read();
    const arr = all[teamId] || [];
    const i = arr.findIndex(m => m.id === matchId);
    if (i < 0) return null;
    arr[i] = { ...arr[i], ...patch, updatedAt: Date.now() };
    all[teamId] = arr;
    _write(all);
    _dispatch('updated', { teamId, matchId });
    if (window.CDD_REBUILD) window.CDD_REBUILD();
    if (window.cddData?.saveFriendlyMatch) {
      window.cddData.saveFriendlyMatch(arr[i])
        .catch(e => console.warn('[friendly] cloud push', e.message));
    }
    return arr[i];
  }

  // Supprime un match amical (+ ses données associées via match-info,
  // match-lineup, jersey-numbers — on les nettoie pour éviter les fantômes).
  function remove(teamId, matchId) {
    if (!teamId || !matchId) return false;
    const all = _read();
    const arr = all[teamId] || [];
    const i = arr.findIndex(m => m.id === matchId);
    if (i < 0) return false;
    arr.splice(i, 1);
    if (arr.length === 0) delete all[teamId];
    else all[teamId] = arr;
    _write(all);
    // Nettoyage des données liées (idempotent)
    try { window.CDD_MATCH_INFO?.clear?.(teamId, matchId); } catch (e) {}
    try {
      const lAll = JSON.parse(localStorage.getItem('cdd_match_lineup') || '{}');
      if (lAll[teamId] && lAll[teamId][matchId]) {
        delete lAll[teamId][matchId];
        localStorage.setItem('cdd_match_lineup', JSON.stringify(lAll));
      }
    } catch (e) {}
    try {
      const jAll = JSON.parse(localStorage.getItem('cdd_match_jersey_numbers') || '{}');
      if (jAll[teamId] && jAll[teamId][matchId]) {
        delete jAll[teamId][matchId];
        localStorage.setItem('cdd_match_jersey_numbers', JSON.stringify(jAll));
      }
    } catch (e) {}
    _dispatch('removed', { teamId, matchId });
    if (window.CDD_REBUILD) window.CDD_REBUILD();
    if (window.cddData?.deleteFriendlyMatch) {
      window.cddData.deleteFriendlyMatch(matchId)
        .catch(e => console.warn('[friendly] cloud delete', e.message));
    }
    return true;
  }

  // Retourne le prochain match amical à venir pour une équipe (date >= today).
  function nextUpcoming(teamId) {
    const today = new Date().toISOString().slice(0, 10);
    return list(teamId).find(m => String(m.date) >= today) || null;
  }

  function _dispatch(kind, detail) {
    try { window.dispatchEvent(new CustomEvent('cdd-friendly-changed', { detail: { kind, ...detail } })); } catch (e) {}
  }

  window.CDD_FRIENDLY = {
    isAmical, list, get, create, update, remove, nextUpcoming, markEnded,
  };
})();
