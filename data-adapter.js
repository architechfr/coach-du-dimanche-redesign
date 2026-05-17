/* ============================================================
   COACH DU DIMANCHE — DATA ADAPTER
   ────────────────────────────────────────────────────────────
   Seul fichier qui touche au stockage. Garantit le cloisonnement
   par club actif. Aucun composant UI ne doit lire localStorage
   directement.

   Source order:
     1. window.__CDD_OVERRIDE  (injected seed - for prototype)
     2. localStorage (real production data)
     3. seed-real-data.json    (fallback fetched async)

   All `get*` accessors RE-READ each call → pas de cache stale
   (résout le bug v43.46).
   ============================================================ */

(function() {
  "use strict";

  // ─── Internal: read raw storage / override ────────────────
  function getRaw(key, fallback) {
    // Priority 1: in-memory override (prototype mode)
    if (window.__CDD_OVERRIDE && window.__CDD_OVERRIDE[key] !== undefined) {
      return window.__CDD_OVERRIDE[key];
    }
    // Priority 2: localStorage
    try {
      const v = localStorage.getItem(key);
      if (v === null) return fallback;
      // Try JSON parse, else return string
      try { return JSON.parse(v); } catch (e) { return v; }
    } catch (e) {
      return fallback;
    }
  }

  // ─── Diagnostics counter ──────────────────────────────────
  const stats = {
    reads: 0,
    leakAttempts: 0,
    lastClubFilter: null,
    lastTeamCount: 0,
    lastPlayerCount: 0,
  };

  // ─── Public API ───────────────────────────────────────────
  const CDD = {
    // Pure readers
    getCurrentClubId() {
      stats.reads++;
      return getRaw('arb_current_club', null);
    },
    getActiveContext() {
      stats.reads++;
      return getRaw('cdd_active_context', { clubId: null, teamId: null, matchId: null });
    },
    getAllClubs() {
      stats.reads++;
      return getRaw('arb_clubs', []);
    },
    getActiveClub() {
      const id = this.getCurrentClubId();
      return this.getAllClubs().find(c => c.id === id) || null;
    },

    // ★ CLOISONNEMENT — toutes les équipes filtrées par club actif
    getTeams() {
      stats.reads++;
      const clubId = this.getCurrentClubId();
      const allTeams = getRaw('arb_teams', []);
      stats.lastClubFilter = clubId;
      const filtered = clubId
        ? allTeams.filter(t => t.clubId === clubId)
        : allTeams;
      stats.lastTeamCount = filtered.length;

      // Detect potential leaks — anything that should NOT be visible
      const leaked = allTeams.length - filtered.length;
      if (leaked > 0 && window.__CDD_DEBUG_LEAKS) {
        console.log(`%c[CDD adapter] ${leaked} team(s) hidden by cloisonnement (clubId=${clubId})`,
          'color:#c8f169');
      }
      return filtered;
    },

    getActiveTeam() {
      const teams = this.getTeams();
      const ctx = this.getActiveContext();
      return teams.find(t => t.id === ctx.teamId) || teams[0] || null;
    },

    getTeamById(id) {
      // Strict: cross-check that team's clubId matches active club
      const all = getRaw('arb_teams', []);
      const t = all.find(x => x.id === id);
      if (!t) return null;
      const activeClub = this.getCurrentClubId();
      if (activeClub && t.clubId !== activeClub) {
        stats.leakAttempts++;
        console.warn(`[CDD adapter] LEAK BLOCKED: team ${id} belongs to club ${t.clubId}, active=${activeClub}`);
        return null;
      }
      return t;
    },

    // ★ PLAYERS — always scoped to active team, never cross
    getPlayers() {
      const team = this.getActiveTeam();
      if (!team) return [];
      stats.lastPlayerCount = (team.players || []).length;
      return team.players || [];
    },

    getStarters() {
      return this.getPlayers().filter(p => p.isStarter);
    },
    getBench() {
      return this.getPlayers().filter(p => !p.isStarter && p.status !== 'reserve');
    },
    getReserve() {
      return this.getPlayers().filter(p => p.status === 'reserve');
    },

    // Matches
    getMatch(matchId) {
      stats.reads++;
      const all = getRaw('arb_m', {});
      const m = all[matchId];
      if (!m) return null;
      // Verify match belongs to active club (if it has clubId metadata)
      const activeClub = this.getCurrentClubId();
      if (m.clubId && activeClub && m.clubId !== activeClub) {
        stats.leakAttempts++;
        console.warn(`[CDD adapter] LEAK BLOCKED: match ${matchId} clubId=${m.clubId}, active=${activeClub}`);
        return null;
      }
      return m;
    },

    /**
     * Get ALL matches scoped to active club + optionally active team.
     * Used for stats aggregation (top scorers, season stats).
     */
    getMatchesForActiveTeam() {
      stats.reads++;
      const all = getRaw('arb_m', {});
      const ctx = this.getActiveContext();
      const activeClubId = this.getCurrentClubId();
      const activeTeamId = ctx.teamId;
      const result = [];
      Object.keys(all).forEach(mid => {
        const m = all[mid];
        if (!m) return;
        // Strict club gate
        if (activeClubId && m.clubId && m.clubId !== activeClubId) return;
        // Team gate (match A or B team must match)
        if (activeTeamId) {
          const tA = m.tA?.teamId || m.tA?.tmId;
          const tB = m.tB?.teamId || m.tB?.tmId;
          if (tA !== activeTeamId && tB !== activeTeamId) return;
        }
        result.push({ id: mid, ...m });
      });
      return result;
    },

    // Diagnostics
    getStats() { return { ...stats, timestamp: Date.now() }; },

    // Force-set active club (proto only — would normally trigger save+sync)
    setActiveClub(clubId) {
      if (!window.__CDD_OVERRIDE) window.__CDD_OVERRIDE = {};
      window.__CDD_OVERRIDE['arb_current_club'] = clubId;
      // Reset context to first team of new club
      const teams = this.getTeams();
      if (teams.length > 0) {
        window.__CDD_OVERRIDE['cdd_active_context'] = {
          clubId,
          teamId: teams[0].id,
          matchId: null
        };
      }
      window.dispatchEvent(new CustomEvent('cdd-active-club-changed', { detail: { clubId } }));
    },

    setActiveTeam(teamId) {
      if (!window.__CDD_OVERRIDE) window.__CDD_OVERRIDE = {};
      const ctx = this.getActiveContext();
      window.__CDD_OVERRIDE['cdd_active_context'] = {
        ...ctx,
        teamId,
        clubId: this.getCurrentClubId()
      };
      window.dispatchEvent(new CustomEvent('cdd-active-team-changed', { detail: { teamId } }));
    }
  };

  // ─── Sync seed init ─────────────────────────────────────
  // Reads window.__CDD_SEED if defined (set by seed-inline.js).
  // In production with real localStorage, this is skipped.
  CDD.initFromSeed = function() {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('arb_teams')) {
      console.log('[CDD adapter] Using REAL localStorage data');
      return false;
    }
    const seed = window.__CDD_SEED;
    if (!seed) {
      console.warn('[CDD adapter] No seed available');
      return false;
    }
    window.__CDD_OVERRIDE = {
      'arb_clubs': seed.clubs,
      'arb_current_club': seed.current,
      'arb_teams': seed.teams,
      'cdd_active_context': seed.active_context,
    };
    console.log('%c[CDD adapter] Seed initialised — prototype mode', 'color:#c8f169;font-weight:900');
    console.log('[CDD adapter] Active club:', seed.current, '· teams:', seed.teams.length);
    return true;
  };

  window.CDD = CDD;
  // Auto-init if seed already present
  if (window.__CDD_SEED) CDD.initFromSeed();
  // Debug flag — set true to see leak prevention logs
  window.__CDD_DEBUG_LEAKS = true;
})();
