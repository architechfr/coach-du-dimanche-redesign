/* global React, CDD_PLAYERS, POSITION_LABEL */

/* ============================================================
   COACH OVERRIDES — Save player edits to localStorage
   ============================================================
   Keys used:
     cdd_player_status_override → { playerId: 'active'|'rest'|'reserve'|'suspended'|'injured' }
     cdd_player_stats_override  → { playerId: { PAC, SHO, PAS, DRI, DEF, PHY } }
     cdd_player_notes           → { playerId: [{ date, tag, txt }] }
   ============================================================ */

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
  },
  resetName(playerId) {
    const all = this.getNameOverrides();
    delete all[playerId];
    try { localStorage.setItem('cdd_player_name_override', JSON.stringify(all)); } catch (e) {}
    window.dispatchEvent(new CustomEvent('cdd-player-changed', { detail: { playerId } }));
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
    window.dispatchEvent(new CustomEvent('cdd-player-changed', { detail: { playerId } }));
  },
  getStatus(player) {
    const overrides = this.getStatusOverrides();
    return overrides[player.id] || player.raw?.status || player.status || 'active';
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
  },
  resetStats(playerId) {
    const all = this.getStatsOverrides();
    delete all[playerId];
    try { localStorage.setItem('cdd_player_stats_override', JSON.stringify(all)); } catch (e) {}
    window.dispatchEvent(new CustomEvent('cdd-player-changed', { detail: { playerId } }));
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

console.log('[CDD coach] Overrides API ready');
