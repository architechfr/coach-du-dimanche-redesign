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
    window.dispatchEvent(new CustomEvent('cdd-player-changed', { detail: { playerId } }));
    if (window.CDD_REBUILD) window.CDD_REBUILD();
  },
  resetStats(playerId) {
    const all = this.getStatsOverrides();
    delete all[playerId];
    try { localStorage.setItem('cdd_player_stats_override', JSON.stringify(all)); } catch (e) {}
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
    window.dispatchEvent(new CustomEvent('cdd-player-changed', { detail: { playerId } }));
    if (window.CDD_REBUILD) window.CDD_REBUILD();
  },
  resetProfile(playerId) {
    const all = this.getProfileOverrides();
    delete all[playerId];
    try { localStorage.setItem('cdd_player_profile', JSON.stringify(all)); } catch (e) {}
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
    } catch (e) {}
    window.dispatchEvent(new CustomEvent('cdd-player-changed', { detail: { playerId } }));
  },
  removeNote(playerId, idx) {
    try {
      const all = JSON.parse(localStorage.getItem('cdd_player_notes') || '{}');
      if (all[playerId]) {
        all[playerId].splice(idx, 1);
        localStorage.setItem('cdd_player_notes', JSON.stringify(all));
      }
    } catch (e) {}
    window.dispatchEvent(new CustomEvent('cdd-player-changed', { detail: { playerId } }));
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
    // Reflète Firestore dans localStorage (sans écraser les autres clés)
    const allS = {};
    const allM = {};
    Object.keys(byId).forEach(pid => {
      if (byId[pid].status)     allS[pid] = byId[pid].status;
      if (byId[pid].statusMeta) allM[pid] = byId[pid].statusMeta;
    });
    try {
      localStorage.setItem('cdd_player_status_override', JSON.stringify(allS));
      localStorage.setItem('cdd_player_status_meta',     JSON.stringify(allM));
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
