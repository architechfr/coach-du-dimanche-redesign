/* global React, CDD_PLAYERS, POSITION_LABEL */

/* ============================================================
   COACH OVERRIDES — Save player edits to localStorage
   ============================================================
   Keys used:
     cdd_player_status_override → { playerId: 'active'|'rest'|'reserve'|'suspended'|'injured' }
     cdd_player_stats_override  → { playerId: { PAC, SHO, PAS, DRI, DEF, PHY } }
     cdd_player_notes           → { playerId: [{ date, tag, txt }] }
     cdd_player_profile         → { playerId: { position, licence, num, height, weight,
                                                foot, birthDate, phone, parentPhone, email,
                                                photoDataUrl, notes } }
     cdd_player_status_meta     → { playerId: { reason, until } }
   ============================================================ */

// Postes officiels (codes courts utilisés par l'UI)
const POSITION_CHOICES = [
  { id: "GK",  l: "Gardien",            grp: "gk"  },
  { id: "DC",  l: "Défenseur central",  grp: "def" },
  { id: "DG",  l: "Latéral gauche",     grp: "def" },
  { id: "DD",  l: "Latéral droit",      grp: "def" },
  { id: "DM",  l: "Milieu défensif",    grp: "mid" },
  { id: "MC",  l: "Milieu central",     grp: "mid" },
  { id: "MOC", l: "Milieu offensif",    grp: "mid" },
  { id: "ML",  l: "Milieu gauche",      grp: "mid" },
  { id: "MD",  l: "Milieu droit",       grp: "mid" },
  { id: "AG",  l: "Ailier gauche",      grp: "att" },
  { id: "AD",  l: "Ailier droit",       grp: "att" },
  { id: "BU",  l: "Buteur",             grp: "att" },
];

const FOOT_CHOICES = [
  { id: "D", l: "Droit" },
  { id: "G", l: "Gauche" },
  { id: "A", l: "Ambidextre" },
];

window.CDD_COACH = {
  // Status (cycle 4 values)
  STATUS_OPTIONS: [
    { id: "active",    l: "✓ Disponible",  cls: "ok"   },
    { id: "rest",      l: "⏸ Indisponible", cls: "warn" },
    { id: "injured",   l: "🩹 Blessé",       cls: "bad"  },
    { id: "suspended", l: "⛔ Suspendu",     cls: "bad"  },
    { id: "reserve",   l: "★ Réserve",      cls: "info" },
  ],

  // NAMES (coach can fix typos in FFF data)
  getNameOverrides() {
    try { return JSON.parse(localStorage.getItem('cdd_player_name_override') || '{}'); }
    catch (e) { return {}; }
  },
  setNameOverride(playerId, first, last) {
    const all = this.getNameOverrides();
    all[playerId] = { first: (first||'').trim(), last: (last||'').trim().toUpperCase() };
    try { localStorage.setItem('cdd_player_name_override', JSON.stringify(all)); } catch (e) {}
    window.dispatchEvent(new CustomEvent('cdd-player-changed', { detail: { playerId } }));
    if (window.CDD_REBUILD) window.CDD_REBUILD();
  },
  resetName(playerId) {
    const all = this.getNameOverrides();
    delete all[playerId];
    try { localStorage.setItem('cdd_player_name_override', JSON.stringify(all)); } catch (e) {}
    window.dispatchEvent(new CustomEvent('cdd-player-changed', { detail: { playerId } }));
    if (window.CDD_REBUILD) window.CDD_REBUILD();
  },

  getStatusOverrides() {
    try { return JSON.parse(localStorage.getItem('cdd_player_status_override') || '{}'); }
    catch (e) { return {}; }
  },
  setStatusOverride(playerId, statusId) {
    const all = this.getStatusOverrides();
    if (statusId === null) delete all[playerId];
    else all[playerId] = statusId;
    try { localStorage.setItem('cdd_player_status_override', JSON.stringify(all)); } catch (e) {}

    // Timestamp local pour le merge last-write-wins avec le cloud (évite que le listener
    // Firestore n'écrase une modif locale récente avec un snapshot stale).
    try {
      const allTs = JSON.parse(localStorage.getItem('cdd_player_status_local_ts') || '{}');
      if (statusId === null) delete allTs[playerId];
      else allTs[playerId] = Date.now();
      localStorage.setItem('cdd_player_status_local_ts', JSON.stringify(allTs));
    } catch (e) {}

    // Sync Firestore (fire-and-forget, jamais bloquant — localStorage = source de vérité offline)
    if (statusId !== null && window.cddSync?.setPlayerStatus) {
      const teamId = window.CDD?.getActiveTeam?.()?.id || 'default';
      const meta = this.getStatusMeta(playerId) || {};
      window.cddSync.setPlayerStatus(teamId, playerId, statusId, meta)
        .catch(err => console.warn('[CDD] sync status cloud failed', err.message));
    }

    window.dispatchEvent(new CustomEvent('cdd-player-changed', { detail: { playerId } }));
    if (window.CDD_REBUILD) window.CDD_REBUILD();
  },
  // Accepte soit un objet joueur, soit un ID — tolérant aux 2 formes
  // d'appel (legacy `getStatus(p.id)` et nouveau `getStatus(p)`).
  getStatus(playerOrId) {
    const overrides = this.getStatusOverrides();
    const id = (typeof playerOrId === 'string' || typeof playerOrId === 'number')
      ? String(playerOrId)
      : playerOrId?.id;
    const pObj = (typeof playerOrId === 'object') ? playerOrId : null;
    if (id && overrides[id]) return overrides[id];
    return pObj?.raw?.status || pObj?.status || 'active';
  },

  // Stats
  getStatsOverrides() {
    try { return JSON.parse(localStorage.getItem('cdd_player_stats_override') || '{}'); }
    catch (e) { return {}; }
  },
  setStatOverride(playerId, key, value) {
    const all = this.getStatsOverrides();
    if (!all[playerId]) all[playerId] = {};
    all[playerId][key] = value;
    try { localStorage.setItem('cdd_player_stats_override', JSON.stringify(all)); } catch (e) {}
    try {
      const ts = JSON.parse(localStorage.getItem('cdd_player_stats_local_ts') || '{}');
      ts[playerId] = Date.now();
      localStorage.setItem('cdd_player_stats_local_ts', JSON.stringify(ts));
    } catch (e) {}
    if (window.cddData?.savePlayerStats) {
      window.cddData.savePlayerStats(playerId, all[playerId])
        .catch(err => console.warn('[CDD] sync stats cloud failed', err.message));
    }
    window.dispatchEvent(new CustomEvent('cdd-player-changed', { detail: { playerId } }));
    if (window.CDD_REBUILD) window.CDD_REBUILD();
  },
  // Écrit les 6 stats d'un coup (mode Rapide — profil généré par poste).
  setStatsBulk(playerId, statsObj) {
    const all = this.getStatsOverrides();
    all[playerId] = { ...(all[playerId] || {}) };
    ['PAC','SHO','PAS','DRI','DEF','PHY'].forEach(k => {
      if (typeof statsObj[k] === 'number') all[playerId][k] = statsObj[k];
    });
    try { localStorage.setItem('cdd_player_stats_override', JSON.stringify(all)); } catch (e) {}
    try {
      const ts = JSON.parse(localStorage.getItem('cdd_player_stats_local_ts') || '{}');
      ts[playerId] = Date.now();
      localStorage.setItem('cdd_player_stats_local_ts', JSON.stringify(ts));
    } catch (e) {}
    if (window.cddData?.savePlayerStats) {
      window.cddData.savePlayerStats(playerId, all[playerId])
        .catch(err => console.warn('[CDD] sync stats cloud failed', err.message));
    }
    window.dispatchEvent(new CustomEvent('cdd-player-changed', { detail: { playerId } }));
    if (window.CDD_REBUILD) window.CDD_REBUILD();
  },
  resetStats(playerId) {
    const all = this.getStatsOverrides();
    delete all[playerId];
    try { localStorage.setItem('cdd_player_stats_override', JSON.stringify(all)); } catch (e) {}
    try {
      const ts = JSON.parse(localStorage.getItem('cdd_player_stats_local_ts') || '{}');
      delete ts[playerId];
      localStorage.setItem('cdd_player_stats_local_ts', JSON.stringify(ts));
    } catch (e) {}
    if (window.cddData?.savePlayerStats) {
      window.cddData.savePlayerStats(playerId, null)
        .catch(err => console.warn('[CDD] sync stats cloud failed', err.message));
    }
    window.dispatchEvent(new CustomEvent('cdd-player-changed', { detail: { playerId } }));
    if (window.CDD_REBUILD) window.CDD_REBUILD();
  },

  // ─── Profil joueur (poste, licence, taille, pied, parents…) ───
  POSITION_CHOICES,
  FOOT_CHOICES,
  getProfileOverrides() {
    try { return JSON.parse(localStorage.getItem('cdd_player_profile') || '{}'); }
    catch (e) { return {}; }
  },
  getProfile(playerId) {
    return this.getProfileOverrides()[playerId] || {};
  },
  setProfile(playerId, patch) {
    const all = this.getProfileOverrides();
    all[playerId] = { ...(all[playerId] || {}), ...patch };
    Object.keys(all[playerId]).forEach(k => {
      const v = all[playerId][k];
      if (v === null || v === undefined || v === '') delete all[playerId][k];
    });
    if (Object.keys(all[playerId]).length === 0) delete all[playerId];
    try { localStorage.setItem('cdd_player_profile', JSON.stringify(all)); } catch (e) {}
    try {
      const ts = JSON.parse(localStorage.getItem('cdd_player_profile_local_ts') || '{}');
      ts[playerId] = Date.now();
      localStorage.setItem('cdd_player_profile_local_ts', JSON.stringify(ts));
    } catch (e) {}
    if (window.cddData?.savePlayerProfile) {
      window.cddData.savePlayerProfile(playerId, all[playerId] || null)
        .catch(err => console.warn('[CDD] sync profile cloud failed', err.message));
    }
    window.dispatchEvent(new CustomEvent('cdd-player-changed', { detail: { playerId } }));
    if (window.CDD_REBUILD) window.CDD_REBUILD();
  },
  resetProfile(playerId) {
    const all = this.getProfileOverrides();
    delete all[playerId];
    try { localStorage.setItem('cdd_player_profile', JSON.stringify(all)); } catch (e) {}
    try {
      const ts = JSON.parse(localStorage.getItem('cdd_player_profile_local_ts') || '{}');
      delete ts[playerId];
      localStorage.setItem('cdd_player_profile_local_ts', JSON.stringify(ts));
    } catch (e) {}
    if (window.cddData?.savePlayerProfile) {
      window.cddData.savePlayerProfile(playerId, null)
        .catch(err => console.warn('[CDD] sync profile cloud failed', err.message));
    }
    window.dispatchEvent(new CustomEvent('cdd-player-changed', { detail: { playerId } }));
    if (window.CDD_REBUILD) window.CDD_REBUILD();
  },

  // ─── Métadonnées de statut (motif blessure, durée etc.) ───
  getStatusMeta(playerId) {
    try {
      const all = JSON.parse(localStorage.getItem('cdd_player_status_meta') || '{}');
      return all[playerId] || {};
    } catch (e) { return {}; }
  },
  setStatusMeta(playerId, meta) {
    let merged = {};
    try {
      const all = JSON.parse(localStorage.getItem('cdd_player_status_meta') || '{}');
      all[playerId] = { ...(all[playerId] || {}), ...meta };
      merged = all[playerId];
      localStorage.setItem('cdd_player_status_meta', JSON.stringify(all));
    } catch (e) {}
    // Timestamp local : la meta partage la même horloge que le statut.
    try {
      const allTs = JSON.parse(localStorage.getItem('cdd_player_status_local_ts') || '{}');
      allTs[playerId] = Date.now();
      localStorage.setItem('cdd_player_status_local_ts', JSON.stringify(allTs));
    } catch (e) {}

    // Sync Firestore : on renvoie le statut courant + meta mergé
    if (window.cddSync?.setPlayerStatus) {
      const statusId = this.getStatusOverrides()[playerId];
      if (statusId) {
        const teamId = window.CDD?.getActiveTeam?.()?.id || 'default';
        window.cddSync.setPlayerStatus(teamId, playerId, statusId, merged)
          .catch(err => console.warn('[CDD] sync meta cloud failed', err.message));
      }
    }

    window.dispatchEvent(new CustomEvent('cdd-player-changed', { detail: { playerId } }));
    if (window.CDD_REBUILD) window.CDD_REBUILD();
  },

  // Notes / observations
  getNotes(playerId) {
    try {
      const all = JSON.parse(localStorage.getItem('cdd_player_notes') || '{}');
      return all[playerId] || [];
    } catch (e) { return []; }
  },
  addNote(playerId, note) {
    try {
      const all = JSON.parse(localStorage.getItem('cdd_player_notes') || '{}');
      if (!all[playerId]) all[playerId] = [];
      all[playerId].unshift({
        date: new Date().toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit' }),
        ...note,
      });
      localStorage.setItem('cdd_player_notes', JSON.stringify(all));
      try {
        const ts = JSON.parse(localStorage.getItem('cdd_player_notes_local_ts') || '{}');
        ts[playerId] = Date.now();
        localStorage.setItem('cdd_player_notes_local_ts', JSON.stringify(ts));
      } catch (e) {}
      if (window.cddData?.savePlayerNotes) {
        window.cddData.savePlayerNotes(playerId, all[playerId])
          .catch(err => console.warn('[CDD] sync notes cloud failed', err.message));
      }
    } catch (e) {}
    window.dispatchEvent(new CustomEvent('cdd-player-changed', { detail: { playerId } }));
  },
  removeNote(playerId, idx) {
    try {
      const all = JSON.parse(localStorage.getItem('cdd_player_notes') || '{}');
      if (all[playerId]) {
        all[playerId].splice(idx, 1);
        localStorage.setItem('cdd_player_notes', JSON.stringify(all));
        try {
          const ts = JSON.parse(localStorage.getItem('cdd_player_notes_local_ts') || '{}');
          ts[playerId] = Date.now();
          localStorage.setItem('cdd_player_notes_local_ts', JSON.stringify(ts));
        } catch (e) {}
        if (window.cddData?.savePlayerNotes) {
          window.cddData.savePlayerNotes(playerId, all[playerId])
            .catch(err => console.warn('[CDD] sync notes cloud failed', err.message));
        }
      }
    } catch (e) {}
    window.dispatchEvent(new CustomEvent('cdd-player-changed', { detail: { playerId } }));
  },

  // ─── Auto-progression OVR par match (Niveau 1 de l'analyse stratégique) ───
  // Calcule les deltas de stats à appliquer après chaque match selon : buts marqués,
  // passes décisives, cartons, clean sheet (GK), vote parents/coach.
  // Storage : cdd_player_perf_deltas = { [playerId]: { [matchId]: { PAC, SHO, PAS, DRI, DEF, PHY, source } } }
  // L'agrégation est cappée à ±10 par stat sur la saison (évite les "stars instantanées").
  PERF_CAP_PER_STAT: 10,

  // Cherche l'id d'un joueur depuis son label "#10 Djibril" (format utilisé dans M.ev).
  _resolvePlayerIdFromLabel(label, lineup) {
    if (!label || !lineup) return null;
    const m = String(label).match(/^#(\d+)/);
    const num = m ? parseInt(m[1], 10) : null;
    if (num != null) {
      const found = lineup.find(p => p.num === num);
      if (found) return found.id;
    }
    // Fallback : matche par prénom si présent dans le label
    const firstMatch = lineup.find(p => p.first && label.includes(p.first));
    return firstMatch ? firstMatch.id : null;
  },

  // Calcule les deltas pour CE match et les enregistre. Appelé depuis endMatch().
  // voteAggregate (optionnel) : { [playerId]: { avg: 4.2, count: 3 } } — moyenne des votes
  applyMatchPerformanceDeltas(M, voteAggregate) {
    if (!M || !M.id || !M.tA) return;
    const lineup = [...(M.tA.p || []), ...(M.tA.bench || [])];
    if (!lineup.length) return;

    const allDeltas = (() => {
      try { return JSON.parse(localStorage.getItem('cdd_player_perf_deltas') || '{}'); }
      catch (e) { return {}; }
    })();

    // Compte buts / passes / cartons par joueur (depuis M.ev, équipe A uniquement)
    const counts = {};
    (M.ev || []).forEach(e => {
      if (!e || e.t !== 'A') return;
      const pid = (e.scorerId || e.passerId || e.plId)
                || this._resolvePlayerIdFromLabel(e.scorer || e.passer || e.pl, lineup);
      if (!pid) return;
      if (!counts[pid]) counts[pid] = { goals:0, assists:0, yellows:0, reds:0 };
      if (e.tp === 'goal' && (e.scorer || e.pl)) {
        const scorerPid = e.scorerId || this._resolvePlayerIdFromLabel(e.scorer || e.pl, lineup);
        if (scorerPid) {
          if (!counts[scorerPid]) counts[scorerPid] = { goals:0, assists:0, yellows:0, reds:0 };
          counts[scorerPid].goals++;
        }
        if (e.passer) {
          const passerPid = e.passerId || this._resolvePlayerIdFromLabel(e.passer, lineup);
          if (passerPid) {
            if (!counts[passerPid]) counts[passerPid] = { goals:0, assists:0, yellows:0, reds:0 };
            counts[passerPid].assists++;
          }
        }
      }
      if (e.tp === 'yellow' && e.pl) {
        const yPid = this._resolvePlayerIdFromLabel(e.pl, lineup);
        if (yPid) {
          if (!counts[yPid]) counts[yPid] = { goals:0, assists:0, yellows:0, reds:0 };
          counts[yPid].yellows++;
        }
      }
      if (e.tp === 'red' && e.pl) {
        const rPid = this._resolvePlayerIdFromLabel(e.pl, lineup);
        if (rPid) {
          if (!counts[rPid]) counts[rPid] = { goals:0, assists:0, yellows:0, reds:0 };
          counts[rPid].reds++;
        }
      }
    });

    const cleanSheet = (M.sB || 0) === 0;
    const goalkeeper = lineup.find(p => p.num === 1); // approximation : #1 = GK

    // Calcule les deltas pour chaque joueur de la lineup A (titulaires + banc qui ont joué)
    lineup.forEach(p => {
      const c = counts[p.id] || { goals:0, assists:0, yellows:0, reds:0 };
      const vote = voteAggregate?.[p.id];
      const delta = { PAC:0, SHO:0, PAS:0, DRI:0, DEF:0, PHY:0 };

      // Performance brute
      delta.SHO += c.goals   * 0.4;
      delta.PAS += c.assists * 0.4;
      delta.PHY -= c.yellows * 0.15;
      delta.PHY -= c.reds    * 0.6;

      // Clean sheet → bonus pour le gardien
      if (cleanSheet && goalkeeper && p.id === goalkeeper.id) {
        delta.DEF += 0.5;
      }

      // Vote parents/coach (moyenne 1-5) → étalé sur les 6 stats
      if (vote && vote.avg != null) {
        const voteDelta = (vote.avg - 3) * 0.15; // 5⭐ → +0.3, 1⭐ → -0.3, 3⭐ → 0
        ['PAC','SHO','PAS','DRI','DEF','PHY'].forEach(k => { delta[k] += voteDelta; });
      }

      // Si aucune contribution, on n'enregistre rien (évite le bruit dans le storage)
      const sum = Math.abs(delta.PAC)+Math.abs(delta.SHO)+Math.abs(delta.PAS)
                 +Math.abs(delta.DRI)+Math.abs(delta.DEF)+Math.abs(delta.PHY);
      if (sum < 0.01) return;

      if (!allDeltas[p.id]) allDeltas[p.id] = {};
      allDeltas[p.id][M.id] = {
        ...delta,
        source: 'match',
        matchDate: M.endedAt || M.startedAt || Date.now(),
        opp: M.tB?.n || '?',
        goals: c.goals, assists: c.assists, yellows: c.yellows, reds: c.reds,
        voteAvg: vote?.avg ?? null,
      };
    });

    try { localStorage.setItem('cdd_player_perf_deltas', JSON.stringify(allDeltas)); } catch (e) {}
    // Sync cloud pour chaque joueur modifié (fire-and-forget)
    if (window.cddData?.savePlayerPerfDeltas) {
      lineup.forEach(p => {
        if (allDeltas[p.id] && allDeltas[p.id][M.id]) {
          window.cddData.savePlayerPerfDeltas(p.id, allDeltas[p.id])
            .catch(err => console.warn('[CDD] sync perf deltas cloud failed', err.message));
        }
      });
    }
    window.dispatchEvent(new CustomEvent('cdd-data-rebuilt'));
    if (window.CDD_REBUILD) window.CDD_REBUILD();
  },

  // Somme cumulée des deltas pour un joueur, cappée à ±CAP par stat.
  // Utilisée par data-bridge.deriveStats() pour appliquer la progression aux cartes.
  getPerfDeltaSum(playerId) {
    const cap = this.PERF_CAP_PER_STAT;
    const empty = { PAC:0, SHO:0, PAS:0, DRI:0, DEF:0, PHY:0 };
    try {
      const all = JSON.parse(localStorage.getItem('cdd_player_perf_deltas') || '{}');
      const byMatch = all[playerId];
      if (!byMatch) return empty;
      const sum = { ...empty };
      Object.values(byMatch).forEach(d => {
        ['PAC','SHO','PAS','DRI','DEF','PHY'].forEach(k => { sum[k] += d[k] || 0; });
      });
      // Cap chaque stat à ±cap
      ['PAC','SHO','PAS','DRI','DEF','PHY'].forEach(k => {
        sum[k] = Math.max(-cap, Math.min(cap, sum[k]));
      });
      return sum;
    } catch (e) { return empty; }
  },

  // Historique des deltas (pour affichage évolution dans la fiche joueur)
  getPerfDeltaHistory(playerId) {
    try {
      const all = JSON.parse(localStorage.getItem('cdd_player_perf_deltas') || '{}');
      const byMatch = all[playerId] || {};
      return Object.entries(byMatch)
        .map(([matchId, d]) => ({ matchId, ...d }))
        .sort((a, b) => (b.matchDate || 0) - (a.matchDate || 0));
    } catch (e) { return []; }
  },
};

/* ============================================================
   CLOUD LISTENER — Firestore → localStorage
   ============================================================
   Démarre dès que cddSync est prêt. Pulle les statuts de tous les
   joueurs de l'équipe active et les mirror dans localStorage,
   puis dispatch cdd-data-rebuilt pour forcer le re-render des écrans.
   ============================================================ */
let CDD_CLOUD_UNSUB = null;

window.CDD_COACH.startCloudPlayersListener = function() {
  if (!window.cddSync?.watchPlayerStatuses) {
    console.warn('[CDD] cddSync.watchPlayerStatuses non dispo — sync désactivée');
    return;
  }
  if (CDD_CLOUD_UNSUB) { try { CDD_CLOUD_UNSUB(); } catch (e) {} CDD_CLOUD_UNSUB = null; }

  const teamId = window.CDD?.getActiveTeam?.()?.id || 'default';
  CDD_CLOUD_UNSUB = window.cddSync.watchPlayerStatuses(teamId, (byId) => {
    // Merge cloud → local en LAST-WRITE-WINS par timestamp. Une modif locale récente
    // (cdd_player_status_local_ts[pid] > cloud.statusUpdatedAt) n'est PAS écrasée par
    // un snapshot Firestore stale. Sans timestamp local, le cloud gagne (cas standard).
    let allS, allM, allTs;
    try {
      allS  = JSON.parse(localStorage.getItem('cdd_player_status_override') || '{}');
      allM  = JSON.parse(localStorage.getItem('cdd_player_status_meta')     || '{}');
      allTs = JSON.parse(localStorage.getItem('cdd_player_status_local_ts') || '{}');
    } catch (e) { allS = {}; allM = {}; allTs = {}; }

    Object.keys(byId).forEach(pid => {
      const cloudEntry = byId[pid];
      const cloudTsRaw = cloudEntry.statusUpdatedAt;
      // Firestore Timestamp → millis. null/undefined si pas encore résolu côté serveur.
      const cloudMs = cloudTsRaw && typeof cloudTsRaw.toMillis === 'function'
        ? cloudTsRaw.toMillis()
        : (typeof cloudTsRaw === 'number' ? cloudTsRaw : 0);
      const localMs = allTs[pid] || 0;
      // Si la modif locale est plus récente que la cloud, on ne touche pas.
      // (Notre propre écriture cloud arrivera dans un snapshot suivant et alignera tout.)
      if (localMs > cloudMs && localMs > 0) return;
      // Sinon : le cloud gagne — on aligne localStorage et on retire le marqueur local
      // pour ne pas bloquer les futurs snapshots.
      if (cloudEntry.status) allS[pid] = cloudEntry.status;
      if (cloudEntry.statusMeta) allM[pid] = cloudEntry.statusMeta;
      if (allTs[pid]) delete allTs[pid];
    });

    try {
      localStorage.setItem('cdd_player_status_override', JSON.stringify(allS));
      localStorage.setItem('cdd_player_status_meta',     JSON.stringify(allM));
      localStorage.setItem('cdd_player_status_local_ts', JSON.stringify(allTs));
    } catch (e) {}
    window.dispatchEvent(new CustomEvent('cdd-data-rebuilt'));
    if (window.CDD_REBUILD) window.CDD_REBUILD();
  });
};

window.CDD_COACH.stopCloudPlayersListener = function() {
  if (CDD_CLOUD_UNSUB) {
    try { CDD_CLOUD_UNSUB(); } catch (e) {}
    CDD_CLOUD_UNSUB = null;
  }
};

// Auto-start dès que cddSync est prêt (cdd-sync-ready dispatché par firebase-sync.js)
if (window.cddSync?.watchPlayerStatuses) {
  // Déjà prêt → start direct
  window.CDD_COACH.startCloudPlayersListener();
} else {
  window.addEventListener('cdd-sync-ready', () => {
    window.CDD_COACH.startCloudPlayersListener();
  }, { once: true });
}

console.log('[CDD coach] Overrides API ready');
