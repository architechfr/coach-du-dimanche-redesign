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

  /* ── TOMBSTONES (anti-résurrection) ─────────────────────────────
     PROBLÈME résolu (2026-06-14) : supprimer un match était fragile.
     1. La suppression cloud est fire-and-forget. 2. pullCloudData
     re-pull les amicaux et MERGE de façon additive (jamais de purge).
     → un match supprimé réapparaissait au prochain resync (focus),
     d'où le bug "je supprime un 2e match, le 1er revient".

     La parade : dès qu'on supprime un id (amical fr_* OU match m_*),
     on l'inscrit dans une liste de pierres tombales locale. Toute
     lecture (list, listCoachFinishedMatches) et tout merge cloud
     ignorent désormais cet id DÉFINITIVEMENT sur ce device. La
     suppression cloud réelle (deleteDoc) reste tentée pour propager
     aux autres devices, mais même si elle échoue (offline, ad-block),
     le match ne ressuscitera jamais ici.
     ────────────────────────────────────────────────────────────── */
  const TOMB_KEY = 'cdd_deleted_matches';
  function _readTomb() {
    try { const a = JSON.parse(localStorage.getItem(TOMB_KEY) || '[]'); return Array.isArray(a) ? a : []; }
    catch (e) { return []; }
  }
  function _writeTomb(arr) {
    // On borne à 1000 entrées (largement suffisant ; évite une croissance infinie).
    try { localStorage.setItem(TOMB_KEY, JSON.stringify(arr.slice(-1000))); } catch (e) {}
  }
  function tombstone(/* ...ids */) {
    const set = new Set(_readTomb().map(String));
    for (let i = 0; i < arguments.length; i++) {
      const id = arguments[i];
      if (id) set.add(String(id));
    }
    _writeTomb([...set]);
  }
  function isTombstoned(id) {
    return !!id && _readTomb().indexOf(String(id)) >= 0;
  }
  function tombstones() { return _readTomb(); }

  // Liste les matchs amicaux d'une équipe, triés par date croissante.
  // Par défaut, EXCLUT les matchs terminés (endedAt présent) → ils ne
  // doivent plus apparaître comme "à venir" sur les écrans de préparation.
  // Passer { includeEnded: true } pour récupérer l'historique complet.
  function list(teamId, opts) {
    if (!teamId) return [];
    const all = _read();
    let arr = (all[teamId] || []).slice();
    // Un match mis en pierre tombale ne reparaît jamais (anti-résurrection).
    arr = arr.filter(m => m && !isTombstoned(m.id));
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
    // Pierre tombale : empêche toute résurrection au prochain resync cloud.
    tombstone(matchId);
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
  // FIX 2026-05-26 : croisement avec les matchs LOCALEMENT TERMINÉS via
  // scheduledMatchId. Sans ce check, un amical dont le endedAt n'a pas été
  // propagé (race condition cross-device, push raté) restait "à venir"
  // alors que son cdd_match_* local est marqué finished → bug Florian
  // "le match s'affiche encore alors qu'il est joué".
  // Bonus : on auto-pose endedAt sur les amicaux ainsi détectés (qui sera
  // propagé au cloud via saveFriendlyMatch lors de l'update).
  function nextUpcoming(teamId) {
    const today = new Date().toISOString().slice(0, 10);
    // 1. Construit l'ensemble des scheduledMatchId déjà joués (st=finished
    //    ou endedAt) en scannant les cdd_match_*.
    const finishedSchedIds = new Set();
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith('cdd_match_')) continue;
        if (k === 'cdd_match_current' || k === 'cdd_match_last_finished'
            || k === 'cdd_match_lineup' || k === 'cdd_match_convoc'
            || k === 'cdd_match_info' || k === 'cdd_match_jersey_numbers') continue;
        try {
          const m = JSON.parse(localStorage.getItem(k) || 'null');
          if (m && (m.st === 'finished' || m.endedAt) && m.scheduledMatchId) {
            finishedSchedIds.add(String(m.scheduledMatchId));
          }
        } catch (e) {}
      }
    } catch (e) {}

    // 2. Parcours candidats : skip si déjà joué + auto-marker endedAt
    const candidates = list(teamId);
    for (const m of candidates) {
      if (String(m.date) < today) continue;
      if (finishedSchedIds.has(String(m.id))) {
        // Match déjà joué (preuve : un cdd_match_* terminé le référence)
        // → on pose endedAt pour qu'il disparaisse définitivement de list()
        // et que la propagation cloud nettoie les autres devices.
        try {
          console.info('[friendly:nextUpcoming] amical', m.id,
            'déjà joué détecté via scheduledMatchId → auto-markEnded');
          markEnded(teamId, m.id);
        } catch (e) {}
        continue;
      }
      return m;
    }
    return null;
  }

  // Liste les clés localStorage des matchs JOUÉS (cdd_match_<id>), en
  // ignorant les clés marqueurs/agrégats. Utilitaire interne pour purgeMatch.
  function _eachMatchRecord(cb) {
    const SKIP = new Set([
      'cdd_match_current', 'cdd_match_last_finished', 'cdd_match_lineup',
      'cdd_match_convoc', 'cdd_match_info', 'cdd_match_jersey_numbers',
    ]);
    try {
      // Snapshot des clés d'abord (on va supprimer pendant l'itération).
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('cdd_match_') && !SKIP.has(k)) keys.push(k);
      }
      for (const k of keys) {
        let m = null;
        try { m = JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) {}
        if (m) cb(k, m);
      }
    } catch (e) {}
  }

  // ── SUPPRESSION ATOMIQUE COMPLÈTE D'UN MATCH ────────────────────
  // Un match amical JOUÉ existe sous DEUX formes :
  //   • l'amical programmé  : cdd_friendly_matches[teamId][] (id 'fr_*')
  //   • le match arbitré     : cdd_match_<id> (id 'm_*', + scheduledMatchId='fr_*')
  //                            + cloud cdd_v2_matches/<id> + votes/<id>
  // Supprimer une seule forme laissait un fantôme. purgeMatch supprime TOUT
  // (les deux formes, local + cloud, + données liées) et pose les pierres
  // tombales correspondantes. Idempotent et résistant au resync.
  //
  // Args : { teamId, matchId?, friendlyId? } — au moins un des deux ids.
  //   - matchId    : id 'm_*' d'un match arbitré (depuis la feuille de match)
  //   - friendlyId : id 'fr_*' d'un amical programmé (depuis l'onglet Amicaux)
  function purgeMatch(opts) {
    opts = opts || {};
    const tid = opts.teamId || (window.CDD && window.CDD.getActiveTeam && window.CDD.getActiveTeam()?.id) || null;
    let frId = opts.friendlyId ? String(opts.friendlyId) : null;
    const matchIds = new Set();
    if (opts.matchId) matchIds.add(String(opts.matchId));

    // 1. Résolution croisée via les enregistrements de matchs joués :
    //    - si on part d'un matchId, on récupère son scheduledMatchId (= frId)
    //    - on collecte TOUS les cdd_match_* qui référencent ce frId
    _eachMatchRecord((k, m) => {
      const mid = String(m.id || k.replace('cdd_match_', ''));
      if (opts.matchId && mid === String(opts.matchId) && m.scheduledMatchId) {
        frId = frId || String(m.scheduledMatchId);
      }
    });
    if (frId) {
      _eachMatchRecord((k, m) => {
        if (m.scheduledMatchId && String(m.scheduledMatchId) === frId) {
          matchIds.add(String(m.id || k.replace('cdd_match_', '')));
        }
      });
    }

    // 2. Pierres tombales sur tous les ids concernés (anti-résurrection).
    tombstone(frId, ...matchIds);

    // 2b. Pierres tombales CLOUD → propagation cross-appareils (les autres
    //     téléphones purgeront leur copie au prochain pull).
    try {
      let clubId = null;
      const at = window.CDD && window.CDD.getActiveTeam && window.CDD.getActiveTeam();
      if (at && at.clubId) clubId = at.clubId;
      else if (tid && window.CDD && window.CDD.getTeamById) {
        const t = window.CDD.getTeamById(tid); clubId = (t && t.clubId) || null;
      }
      if (window.cddData && window.cddData.saveDeletedMatch) {
        [frId, ...matchIds].filter(Boolean).forEach(id => {
          try { window.cddData.saveDeletedMatch(id, { clubId, teamId: tid }); } catch (e) {}
        });
      }
    } catch (e) {}

    // 3. Suppression des enregistrements de matchs joués (local + marqueurs + cloud).
    matchIds.forEach(id => {
      try { localStorage.removeItem('cdd_match_' + id); } catch (e) {}
      try { if (localStorage.getItem('cdd_match_current') === id) localStorage.removeItem('cdd_match_current'); } catch (e) {}
      try { if (localStorage.getItem('cdd_match_last_finished') === id) localStorage.removeItem('cdd_match_last_finished'); } catch (e) {}
      try { window.cddSync?.deleteMatchFromCloud?.(id)?.catch?.(() => {}); } catch (e) {}
    });

    // 4. Suppression de l'amical programmé (local + cloud + lineup/info/jersey).
    //    remove() gère déjà le nettoyage complet + la pierre tombale du fr_*.
    if (frId && tid) {
      try { remove(tid, frId); } catch (e) {}
    }

    if (window.CDD_REBUILD) window.CDD_REBUILD();
    _dispatch('purged', { teamId: tid, friendlyId: frId, matchIds: [...matchIds] });
    return true;
  }

  function _dispatch(kind, detail) {
    try { window.dispatchEvent(new CustomEvent('cdd-friendly-changed', { detail: { kind, ...detail } })); } catch (e) {}
  }

  window.CDD_FRIENDLY = {
    isAmical, list, get, create, update, remove, nextUpcoming, markEnded,
    purgeMatch, tombstone, isTombstoned, tombstones,
  };
})();
