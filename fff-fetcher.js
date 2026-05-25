/* ============================================================
   FFF FETCHER v3 — Aligned with Coach du Dimanche spec
   ============================================================
   ⚠ Critical: never fetch seineetmarne.fff.fr — that's HTML.
   Use api-dofa.fff.fr (+ proxies cascade) which returns JSON.
   ============================================================ */

(function() {
  "use strict";

  // Multi-base fallback
  const FFF_BASES = [
    "https://api-dofa.fff.fr/api",
    "https://api-dofa.prd-aws.fff.fr/api",
  ];

  // CORS proxies — tried in cascade
  const PROXIES = [
    { name: "corsproxy",  build: (url) => "https://corsproxy.io/?" + encodeURIComponent(url) },
    { name: "allorigins", build: (url) => "https://api.allorigins.win/raw?url=" + encodeURIComponent(url) },
    { name: "codetabs",   build: (url) => "https://api.codetabs.com/v1/proxy?quest=" + encodeURIComponent(url) },
    { name: "cors.sh",    build: (url) => "https://proxy.cors.sh/" + url },
  ];

  const CACHE_KEY = "cdd_fff_cache_v3";
  const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
  const FETCH_TIMEOUT_MS = 6000;

  // ─── Cache (never throws) ─────────────────────────────
  function getCache(key) {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const all = JSON.parse(raw);
      return all[key] || null;
    } catch (e) { return null; }
  }
  function setCache(key, value) {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      const all = raw ? JSON.parse(raw) : {};
      all[key] = { t: Date.now(), v: value };
      localStorage.setItem(CACHE_KEY, JSON.stringify(all));
    } catch (e) {}
  }
  function isStale(entry) {
    if (!entry) return true;
    return (Date.now() - entry.t) > CACHE_TTL_MS;
  }

  // ─── Fetch with timeout ──────────────────────────────
  function fetchWithTimeout(url, opts = {}, ms = FETCH_TIMEOUT_MS) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("timeout " + ms + "ms")), ms);
      fetch(url, opts).then(r => { clearTimeout(timer); resolve(r); })
                      .catch(e => { clearTimeout(timer); reject(e); });
    });
  }

  // ─── Core fetch: try direct then proxies ────────────
  async function fffFetch(path) {
    const errors = [];
    // 1. Direct on both bases
    for (const base of FFF_BASES) {
      try {
        const r = await fetchWithTimeout(base + path, {
          headers: { Accept: "application/ld+json, application/json" }
        });
        if (r.ok) {
          const data = await r.json();
          console.log(`[FFF] ✓ direct ${base.includes('prd-aws')?'(prd-aws)':''}: ${path.slice(0,80)}`);
          return data;
        }
        errors.push(`${base}${path.slice(0,40)} → HTTP ${r.status}`);
      } catch (e) {
        errors.push(`${base}${path.slice(0,40)} → ${e.message?.slice(0,40)}`);
      }
    }
    // 2. Via proxies
    for (const proxy of PROXIES) {
      for (const base of FFF_BASES) {
        try {
          const target = base + path;
          const r = await fetchWithTimeout(proxy.build(target));
          if (r.ok) {
            const txt = await r.text();
            try {
              const data = JSON.parse(txt);
              console.log(`[FFF] ✓ via ${proxy.name}: ${path.slice(0,60)}`);
              return data;
            } catch (e) {
              // HTML response (e.g. CORS rejected from proxy) — try next
            }
          }
        } catch (e) { /* proxy suivant */ }
      }
    }
    throw new Error("FFF fetch failed:\n" + errors.slice(0, 3).join("\n"));
  }

  // ─── Smart wrapper: cache + force flag ──────────────
  async function fetchSmart(path, opts = {}) {
    const cacheKey = "fff:" + path;
    const cached = getCache(cacheKey);

    if (cached && !isStale(cached) && !opts.force) {
      return { ok: true, data: cached.v, source: "cache-fresh", age: Date.now() - cached.t };
    }

    try {
      const data = await fffFetch(path);
      setCache(cacheKey, data);
      return { ok: true, data, source: "live", age: 0 };
    } catch (e) {
      if (cached) {
        console.log(`[FFF] live failed, returning STALE cache`);
        return { ok: true, data: cached.v, source: "cache-stale", age: Date.now() - cached.t, error: e.message };
      }
      return { ok: false, data: null, source: "none", error: e.message };
    }
  }

  // ─── URL parser (for in-app user paste) ─────────────
  function parseFFFUrl(url) {
    if (!url) return null;
    const qs = url.includes("?") ? url.split("?")[1].split("#")[0] : url;
    const params = {};
    qs.split("&").forEach(pair => {
      const [k, v=""] = pair.split("=");
      if (k) params[decodeURIComponent(k).toLowerCase()] = decodeURIComponent(v.replace(/\+/g, " "));
    });
    return {
      clubId:   params.scl || params.club,
      competId: params.competition || params.comp,
      phase:    params.stage || "1",
      group:    params.group || params.poule || "1",
      label:    params.label || "",
    };
  }

  // ─── Public API ────────────────────────────────────
  const FFF = {
    /**
     * Get ranking using the CORRECT DOFA endpoint:
     *   /compets/{competId}/phases/{phase}/poules/{group}/classement_journees.json?filter=
     * Falls back to alternative paths if 404.
     */
    async getRanking(cfg, opts = {}) {
      const { competId, phase = "1", group } = cfg;
      const attempts = [
        `/compets/${competId}/phases/${phase}/poules/${group}/classement_journees.json?filter=`,
        `/compets/${competId}/phases/${phase}/poules/${group}/classement.json?filter=`,
        `/compets/${competId}/phases/${phase}/poules/${group}/classements.json?filter=`,
        `/compets/${competId}/phases/${phase}/poules/${group}/ranking.json?filter=`,
      ];
      const cacheKey = `rank:${competId}:${phase}:${group}`;
      const cached = getCache(cacheKey);
      if (cached && !isStale(cached) && !opts.force) {
        const arr = normalizeRankArray(cached.v);
        return { ok: true, data: arr, source: "cache-fresh", age: Date.now() - cached.t };
      }

      for (const path of attempts) {
        try {
          const data = await fffFetch(path);
          setCache(cacheKey, data);
          const arr = normalizeRankArray(data);
          return { ok: true, data: arr, source: "live", age: 0 };
        } catch (e) { /* try next */ }
      }

      // All failed — return stale cache if any
      if (cached) {
        const arr = normalizeRankArray(cached.v);
        return { ok: true, data: arr, source: "cache-stale", age: Date.now() - cached.t };
      }
      return { ok: false, data: [], source: "none", error: "Aucun endpoint classement ne répond" };
    },

    /**
     * Get calendar (paginated Hydra). Up to 25 pages.
     */
    async getMatches(cfg, opts = {}) {
      const { competId, group } = cfg;
      const cacheKey = `cal:${competId}:${group}`;
      const cached = getCache(cacheKey);
      if (cached && !isStale(cached) && !opts.force) {
        return { ok: true, data: cached.v, source: "cache-fresh", age: Date.now() - cached.t };
      }

      const all = [];
      const seen = {};
      const grpNum = parseInt(group, 10);

      for (let page = 1; page <= 25; page++) {
        const path = `/match_entities.json?filter[]=&competition.cp_no=${encodeURIComponent(competId)}`
                   + `&poule.stage_number=${grpNum}&page=${page}`;
        let data;
        try { data = await fffFetch(path); } catch { break; }
        const arr = Array.isArray(data) ? data : (data["hydra:member"] || data.data || []);
        if (!arr.length) break;

        let added = 0;
        for (const m of arr) {
          const st = m?.poule?.stage_number;
          if (st != null && String(st) !== String(grpNum)) continue;
          const key = m.ma_no || `${m.date}|${m.home?.short_name}|${m.away?.short_name}`;
          if (seen[key]) continue;
          seen[key] = 1;
          all.push(m);
          added++;
        }
        if (added === 0 && arr.length < 30) break;
      }

      if (all.length > 0) {
        setCache(cacheKey, all);
        return { ok: true, data: all, source: "live", age: 0 };
      }
      if (cached) {
        return { ok: true, data: cached.v, source: "cache-stale", age: Date.now() - cached.t };
      }
      return { ok: false, data: [], source: "none", error: "Aucun match récupéré" };
    },

    getCacheStatus(cfg) {
      const rEntry = getCache(`rank:${cfg.competId}:${cfg.phase||"1"}:${cfg.group}`);
      const mEntry = getCache(`cal:${cfg.competId}:${cfg.group}`);
      const t = Math.min(rEntry?.t || Infinity, mEntry?.t || Infinity);
      if (!isFinite(t)) return { hasCache: false };
      return {
        hasCache: true,
        timestamp: t,
        age: Date.now() - t,
        stale: (Date.now() - t) > CACHE_TTL_MS,
      };
    },

    clearCache() {
      try { localStorage.removeItem(CACHE_KEY); } catch (e) {}
    },

    parseFFFUrl,

    /**
     * Recherche de clubs par nom (fuzzy). Utilise le filtre Hydra
     * text_filter du DOFA. Renvoie max 20 résultats.
     * Cache 1h pour éviter de spammer l'API pendant la frappe.
     */
    async searchClubs(query) {
      const q = (query || '').trim();
      if (q.length < 2) {
        return { ok: false, data: [], error: 'Tape au moins 2 caractères.' };
      }
      const cacheKey = `clubs:${q.toLowerCase()}`;
      const cached = getCache(cacheKey);
      const ONE_HOUR = 60 * 60 * 1000;
      if (cached && (Date.now() - cached.t) < ONE_HOUR) {
        return { ok: true, data: cached.v, source: 'cache' };
      }
      // Plusieurs variantes de paramètre selon les versions de DOFA.
      const attempts = [
        `/clubs.json?filter[]=&text_filter=${encodeURIComponent(q)}`,
        `/clubs.json?text_filter=${encodeURIComponent(q)}`,
        `/clubs.json?short_name=${encodeURIComponent(q)}`,
        `/clubs.json?name=${encodeURIComponent(q)}`,
      ];
      for (const path of attempts) {
        try {
          const data = await fffFetch(path);
          const arr = Array.isArray(data) ? data : (data['hydra:member'] || data.data || []);
          if (arr.length > 0) {
            const top = arr.slice(0, 20).map(c => ({
              cl_no:    c.cl_no || c.id || null,
              shortName: c.short_name || '',
              name:     c.name || c.short_name || '',
              locality: c.locality || c.city || '',
              logo:     c.logo || null,
            })).filter(c => c.cl_no);
            setCache(cacheKey, top);
            return { ok: true, data: top, source: 'live' };
          }
        } catch (e) { /* try next variant */ }
      }
      return { ok: false, data: [], error: 'Aucun club trouvé (vérifie l\'orthographe ou utilise la méthode URL).' };
    },

    /**
     * Liste les compétitions où un club est engagé cette saison.
     * Pour chaque équipe du club, on lit ses engagements et on aplatit
     * tout en une seule liste prête à afficher.
     * Cache 1h.
     */
    async getClubCompetitions(clubId) {
      if (!clubId) return { ok: false, data: [], error: 'clubId requis' };
      const cacheKey = `clubCompets:${clubId}`;
      const cached = getCache(cacheKey);
      const ONE_HOUR = 60 * 60 * 1000;
      if (cached && (Date.now() - cached.t) < ONE_HOUR) {
        return { ok: true, data: cached.v, source: 'cache' };
      }

      // Étape 1 : équipes du club
      let teams = [];
      const teamsAttempts = [
        `/clubs/${encodeURIComponent(clubId)}/equipes.json`,
        `/equipes.json?filter[]=&club.cl_no=${encodeURIComponent(clubId)}`,
      ];
      for (const path of teamsAttempts) {
        try {
          const data = await fffFetch(path);
          const arr = Array.isArray(data) ? data : (data['hydra:member'] || data.data || []);
          if (arr.length > 0) { teams = arr; break; }
        } catch (e) { /* try next */ }
      }
      if (teams.length === 0) {
        return { ok: false, data: [], error: 'Aucune équipe trouvée pour ce club.' };
      }

      // Étape 2 : engagements de chaque équipe (en parallèle, max 15)
      const out = [];
      const lim = Math.min(teams.length, 15);
      await Promise.all(teams.slice(0, lim).map(async (t) => {
        const eqNo = t.eq_no || t.id;
        if (!eqNo) return;
        const teamLabel = t.short_name || t.name || `Équipe ${eqNo}`;
        const engAttempts = [
          `/equipes/${encodeURIComponent(eqNo)}/engagements.json`,
          `/engagements.json?filter[]=&equipe.eq_no=${encodeURIComponent(eqNo)}`,
        ];
        for (const path of engAttempts) {
          try {
            const data = await fffFetch(path);
            const arr = Array.isArray(data) ? data : (data['hydra:member'] || data.data || []);
            arr.forEach(e => {
              const compet = e.competition || e.compet || {};
              const poule  = e.poule || {};
              const phase  = e.phase || {};
              const competId = compet.cp_no || compet.id || null;
              if (!competId) return;
              out.push({
                teamLabel,
                teamId: eqNo,
                competId: String(competId),
                competName: compet.name || compet.short_name || '(compétition sans nom)',
                phase:  String(phase.stage_number || phase.number || '1'),
                group:  String(poule.stage_number || poule.number || '1'),
                season: compet.season?.year || compet.season_year || '',
              });
            });
            if (arr.length > 0) break;
          } catch (e) { /* try next */ }
        }
      }));

      if (out.length === 0) {
        return { ok: false, data: [], error: 'Aucune compétition trouvée pour ce club cette saison.' };
      }
      setCache(cacheKey, out);
      return { ok: true, data: out, source: 'live' };
    },

    /**
     * Normalize one ranking row — uses CONFIRMED DOFA fields (v39.2 spec):
     *   rank, point_count, total_games_count, won_games_count, draw_games_count,
     *   lost_games_count, goals_for_count, goals_against_count, goals_diff,
     *   penalty_point_count, forfeits_games_count, equipe.short_name
     */
    normalizeRankRow(row, idx, myTeamName) {
      const team = row.equipe || row.club || row.team || {};
      const name = team.short_name || team.name || team.club_name || `Équipe ${idx+1}`;
      const isMe = myTeamName && (
        name.toUpperCase().includes(myTeamName.toUpperCase()) ||
        myTeamName.toUpperCase().includes(name.toUpperCase())
      );
      const gf = row.goals_for_count ?? row.goals_for ?? row.bp ?? row.buts_pour ?? 0;
      const ga = row.goals_against_count ?? row.goals_against ?? row.bc ?? row.buts_contre ?? 0;
      return {
        rank: row.rank || row.classement || (idx + 1),
        club: name,
        pl:  row.total_games_count ?? row.played ?? row.matches_played ?? 0,
        w:   row.won_games_count   ?? row.wins   ?? row.victoires ?? 0,
        d:   row.draw_games_count  ?? row.draws  ?? row.nuls ?? 0,
        l:   row.lost_games_count  ?? row.losses ?? row.defeats ?? row.defaites ?? 0,
        gf,
        ga,
        pts: row.point_count ?? row.points ?? row.pts ?? 0,
        diff: (gf - ga) || row.goals_diff || 0,
        penalty: row.penalty_point_count || 0,
        forfeits: row.forfeits_games_count || 0,
        forfeit: row.forfeit_general === "O" || row.is_forfeit === "O",
        me: isMe,
        hi: idx === 0,
        form: [],
      };
    },

    /**
     * Normalize one match — uses CONFIRMED DOFA fields (v39.5 spec):
     *   m.home/m.away with .short_name, .club.cl_no, .club.logo
     *   m.home_score / m.away_score (number or null — NOT 0-0)
     *   m.home_resu / m.away_resu : 'GA','PE','NU','FM' (forfait match), 'FG' (forfait général)
     *   m.home_is_forfeit / m.away_is_forfeit : 'O'/'N'
     *   m.poule_journee.number : journée
     */
    normalizeMatchRow(m, myTeamName) {
      const home = m.home || m.home_team || m.equipe_domicile || m.team_home || {};
      const away = m.away || m.away_team || m.equipe_exterieure || m.team_away || {};
      const hName = home.short_name || home.name || home.club_name || "?";
      const aName = away.short_name || away.name || away.club_name || "?";

      // Numeric scores — strict, null != 0
      const sHomeRaw = m.home_score ?? m.score_home;
      const sAwayRaw = m.away_score ?? m.score_away;
      const sHome = (typeof sHomeRaw === "number") ? sHomeRaw : (sHomeRaw && !isNaN(+sHomeRaw) ? +sHomeRaw : null);
      const sAway = (typeof sAwayRaw === "number") ? sAwayRaw : (sAwayRaw && !isNaN(+sAwayRaw) ? +sAwayRaw : null);
      const hasScore = sHome != null && sAway != null;

      const hForfeit = m.home_is_forfeit === "O";
      const aForfeit = m.away_is_forfeit === "O";
      const isForfeit = hForfeit || aForfeit;

      // For forfait without score → conventional 0-5 or 5-0
      let displayHome = sHome, displayAway = sAway;
      if (isForfeit && !hasScore) {
        displayHome = hForfeit ? 0 : 5;
        displayAway = aForfeit ? 0 : 5;
      }

      const played = hasScore || isForfeit;

      const isMyHome = myTeamName && hName.toUpperCase().includes(myTeamName.toUpperCase());
      const isMyAway = myTeamName && aName.toUpperCase().includes(myTeamName.toUpperCase());

      let result = null;
      if (played) {
        const useH = hasScore ? sHome : displayHome;
        const useA = hasScore ? sAway : displayAway;
        if (useH > useA) result = isMyHome ? "W" : isMyAway ? "L" : null;
        else if (useH < useA) result = isMyHome ? "L" : isMyAway ? "W" : null;
        else result = "D";
      }

      const dateStr = m.date || m.match_date || m.date_match || "";
      const d = dateStr ? new Date(dateStr) : null;
      const ddmm = d && !isNaN(d) ? `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}` : "?";

      return {
        date: ddmm,
        dateRaw: dateStr,
        played,
        forfeit: isForfeit,
        home: hName,
        away: aName,
        homeLogo: home.club?.logo || null,
        awayLogo: away.club?.logo || null,
        opp: isMyHome ? aName : hName,
        venue: isMyHome ? "H" : isMyAway ? "E" : "?",
        score: hasScore || isForfeit ? [displayHome, displayAway] : null,
        result,
        journee: m.poule_journee?.number || m.round_number || m.journee || null,
        status: m.status,
        homeResu: m.home_resu,
        awayResu: m.away_resu,
        raw: m,
      };
    },
  };

  function normalizeRankArray(raw) {
    return Array.isArray(raw) ? raw : (raw["hydra:member"] || raw.classement || raw.data || raw.ranking || []);
  }

  FFF.formatAge = function(ms) {
    if (!ms || ms < 0) return "à l'instant";
    const min = Math.floor(ms / 60000);
    const hr = Math.floor(ms / 3600000);
    const day = Math.floor(ms / 86400000);
    if (day > 0) return `il y a ${day} jour${day>1?"s":""}`;
    if (hr > 0)  return `il y a ${hr}h`;
    if (min > 0) return `il y a ${min} min`;
    return "à l'instant";
  };

  window.CDD_FFF = FFF;
  console.log("[FFF] fetcher v3 ready · spec-aligned · 7d cache · 6s timeout · 4 proxies");
})();
