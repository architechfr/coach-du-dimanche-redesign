/* global React, CDD */

/* ============================================================
   COACH DU DIMANCHE — Data Bridge
   Wraps real CDD adapter into the UI's expected globals.
   ============================================================ */

// Convert FFF position labels → standard short codes
// Also infers from preferredNumber when position is empty (FFF data often omits it)
function normalizePosition(p, preferredNumber) {
  if (p) {
    const s = String(p).toLowerCase();
    if (s.startsWith('gar') || s === 'gk') return 'GK';
    if (s.startsWith('déf') || s === 'def') return 'DC';
    if (s.startsWith('milieu off') || s === 'moc') return 'MOC';
    if (s.startsWith('milieu') || s === 'mid' || s === 'mc') return 'MC';
    if (s.startsWith('att') || s === 'att' || s === 'bu') return 'BU';
    if (s === 'ag' || s === 'ad' || s === 'dg' || s === 'dd' || s === 'ml' || s === 'md' || s === 'dm') {
      return p.toUpperCase();
    }
  }
  // Fallback: infer by jersey number convention
  if (preferredNumber) {
    const n = parseInt(preferredNumber, 10);
    if (n === 1)  return 'GK';
    if (n === 2)  return 'DD';
    if (n === 3)  return 'DG';
    if (n === 4 || n === 5)  return 'DC';
    if (n === 6)  return 'DM';
    if (n === 7)  return 'AD';
    if (n === 8)  return 'MC';
    if (n === 9)  return 'BU';
    if (n === 10) return 'MOC';
    if (n === 11) return 'AG';
    // 12+ = bench/reserve → no position guess
  }
  return null;
}

// Derive a rarity from preferredNumber + isStarter + status
function deriveRarity(player, idx) {
  if (player.status === 'reserve') return 'silver';
  if (!player.isStarter) return 'silver';
  // Top 3 starters get top rarities — first 3 by preferredNumber
  if (player.preferredNumber === 10) return 'icon';
  if (player.preferredNumber === 9 || player.preferredNumber === 7) return 'totw';
  return 'gold';
}

// Stats: titulaires = TRÈS bons (78 base · pic à 92).
// Banc = corrects (68 base). Réserve = en progression (58 base).
//
// COACH-SPECIFIED stars (les meilleurs joueurs identifiés par le coach).
// Bonus appliqué en plus du calcul standard.
const STAR_BONUSES = {
  // BOYLAMBA Laighor — CAPITAINE, meilleur joueur
  'pl_moydtri8_82ncg': { base: 12, profile: 'BU', label: 'Capitaine' },
  // BAMBA Mamadou — défenseur central exceptionnel
  'pl_moydtri8_v1skp': { base: 11, profile: 'DC' },
  // TRAORE Djibril (#10) — meneur de jeu
  'pl_moydtri8_uid2h': { base: 11, profile: 'MOC' },
  // ITOUA Grace Appolinaire — milieu / box-to-box
  'pl_moydtri8_krkoy': { base: 10, profile: 'MC' },
  // DOUMBIA Sékou — athlète polyvalent, peut tout jouer
  'pl_moydtri8_uyhvf': { base: 12, profile: 'BU', versatile: true },
};

function deriveStats(player) {
  // Allow star bonuses to override position
  const star = STAR_BONUSES[player.id];
  const pos = star?.profile
    || normalizePosition(player.position, player.preferredNumber)
    || 'MC';

  // Higher contrast between rôles
  let base;
  if (player.status === 'reserve') base = 58;
  else if (!player.isStarter) base = 68;
  else base = 78;

  // Bonus pour les "stars" : #10 et #9 (capitaine + buteur classique)
  if (player.isStarter && player.preferredNumber === 10) base += 4;
  if (player.isStarter && player.preferredNumber === 9)  base += 3;

  // Coach-identified stars get extra boost
  if (star) base += star.base;

  // Variation pour différencier les joueurs (-5 à +5)
  const seed = (player.preferredNumber || 1) * 11 + (player.firstName?.length || 0) * 5 + (player.lastName?.length || 0) * 3;
  const variation = (n) => (((seed * (n+1)) % 11) - 5);

  const profiles = {
    GK:  { PAC: -8, SHO: -28, PAS: -10, DRI: -16, DEF: +12, PHY: +6 },
    DC:  { PAC: -2, SHO: -22, PAS:  -4, DRI:  -6, DEF: +14, PHY: +10 },
    DG:  { PAC: +8, SHO: -14, PAS:  +2, DRI:  +2, DEF:  +8, PHY:   0 },
    DD:  { PAC: +8, SHO: -14, PAS:  +2, DRI:  +2, DEF:  +8, PHY:   0 },
    DM:  { PAC: -2, SHO: -10, PAS:  +6, DRI:  +2, DEF: +10, PHY:  +6 },
    ML:  { PAC: +6, SHO:  -2, PAS:  +6, DRI:  +6, DEF:  -2, PHY:   0 },
    MD:  { PAC: +6, SHO:  -2, PAS:  +6, DRI:  +6, DEF:  -2, PHY:   0 },
    MC:  { PAC: +2, SHO:  -2, PAS: +10, DRI:  +6, DEF:  -2, PHY:   0 },
    MOC: { PAC: +6, SHO:  +6, PAS: +12, DRI: +14, DEF: -10, PHY:  -2 },
    AG:  { PAC:+12, SHO:  +6, PAS:  +2, DRI: +14, DEF: -14, PHY:  -4 },
    AD:  { PAC:+12, SHO:  +6, PAS:  +2, DRI: +14, DEF: -14, PHY:  -4 },
    BU:  { PAC: +8, SHO: +14, PAS:  -2, DRI:  +8, DEF: -18, PHY:  +4 },
  };
  let p = { ...(profiles[pos] || profiles.MC) };

  // Sékou polyvalent: pas de gros malus en DEF (peut jouer partout)
  if (star?.versatile) {
    p.DEF = Math.max(p.DEF, -2);
    p.PHY = Math.max(p.PHY, +8);
  }

  const clamp = v => Math.max(40, Math.min(95, v));
  const stats = {
    PAC: clamp(base + p.PAC + variation(0)),
    SHO: clamp(base + p.SHO + variation(1)),
    PAS: clamp(base + p.PAS + variation(2)),
    DRI: clamp(base + p.DRI + variation(3)),
    DEF: clamp(base + p.DEF + variation(4)),
    PHY: clamp(base + p.PHY + variation(5)),
  };
  stats.ovr = Math.round((stats.PAC + stats.SHO + stats.PAS + stats.DRI + stats.DEF + stats.PHY) / 6);

  // Coach overrides
  try {
    const overrides = JSON.parse(localStorage.getItem('cdd_player_stats_override') || '{}');
    const ov = overrides[player.id];
    if (ov) {
      Object.keys(stats).forEach(k => {
        if (typeof ov[k] === 'number') stats[k] = ov[k];
      });
      stats.ovr = Math.round((stats.PAC + stats.SHO + stats.PAS + stats.DRI + stats.DEF + stats.PHY) / 6);
    }
  } catch (e) {}

  return stats;
}

// Resolve photo URL from licence number → FFF photo
function resolvePhoto(player) {
  if (player.photoDataUrl) return player.photoDataUrl;
  if (!player.lastName || !player.firstName) return null;
  // FFF photo file convention:
  //   LASTNAME_FirstName.jpg
  // Where:
  //   - within lastName/firstName: spaces become HYPHENS (ANDRADE FERREIRA → ANDRADE-FERREIRA)
  //   - join is underscore (LASTNAME_FirstName)
  //   - accents stripped
  const stripAccents = (s) => s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const norm = (s) => stripAccents(s).trim().replace(/\s+/g, "-");
  const file = `${norm(player.lastName)}_${norm(player.firstName)}.jpg`;
  return `assets/photos_U15_2025-2026/${file}`;
}

// Build a "view player" from raw player
function buildViewPlayer(player, idx) {
  const STAR_RARITIES = {
    'pl_moydtri8_82ncg': 'hero',    // Laighor — capitaine
    'pl_moydtri8_v1skp': 'icon',    // Mamadou
    'pl_moydtri8_uid2h': 'icon',    // Djibril
    'pl_moydtri8_krkoy': 'totw',    // Grace Appolinaire
    'pl_moydtri8_uyhvf': 'hero',    // Sékou
  };
  const pos = normalizePosition(player.position, player.preferredNumber) || 'MC';
  const stats = deriveStats(player);

  // Apply NAME overrides (coach can rename if FFF has a typo)
  let first = player.firstName || '';
  let last  = (player.lastName || '').toUpperCase();
  try {
    const nameOv = JSON.parse(localStorage.getItem('cdd_player_name_override') || '{}');
    const ov = nameOv[player.id];
    if (ov?.first) first = ov.first;
    if (ov?.last)  last  = ov.last.toUpperCase();
  } catch (e) {}

  return {
    id: player.id,
    num: player.preferredNumber || (idx + 1),
    first,
    last,
    pos,
    posLabel: player.position || pos,
    age: player.birthDate ? computeAge(player.birthDate) : 14,
    foot: player.foot || 'D',
    height: player.height ? parseInt(player.height) : 170,
    stats,
    rarity: STAR_RARITIES[player.id] || deriveRarity(player, idx),
    isCaptain: player.id === 'pl_moydtri8_82ncg',
    form: stats.ovr >= 80 ? 10 : stats.ovr >= 70 ? 8 : 6,
    fitness: player.status === 'rest' ? 60 : player.status === 'reserve' ? 80 : 92,
    mins: player.isStarter ? 680 : (player.status === 'reserve' ? 80 : 200),
    goals: idx === 4 ? 7 : idx === 8 ? 5 : Math.max(0, 10 - idx),
    assists: Math.max(0, 6 - Math.floor(idx / 2)),
    yellow: idx % 3 === 0 ? 1 : 0,
    red: 0,
    mvp: idx < 4 ? Math.floor(Math.random()*3) : 0,
    photo: resolvePhoto({ ...player, firstName: first, lastName: last }),
    license: player.licenceFFF || null,
    status: player.status || 'active',
    isStarter: player.isStarter,
    raw: player,
  };
}

function computeAge(dateStr) {
  // dateStr is DD/MM/YYYY
  const parts = (dateStr || '').split('/');
  if (parts.length !== 3) return 14;
  const y = parseInt(parts[2]);
  const now = new Date().getFullYear();
  return now - y;
}
  // Reads arb_m{} (the user's recorded matches), counts goals per player,
  // builds the top-scorer leaderboard.
  function buildTopScorers(teamPlayers) {
    if (!window.CDD?.getMatchesForActiveTeam) return [];
    const matches = window.CDD.getMatchesForActiveTeam();
    if (!matches.length) return [];

    const byPlayer = {};
    const playerById = {};
    teamPlayers.forEach(p => { playerById[p.id] = p; });

    matches.forEach(m => {
      // Match events can live in several places — try them all defensively
      const evs = m.events || m.timeline || m.actions || [];
      evs.forEach(e => {
        if (!e) return;
        const type = (e.type || e.t || '').toLowerCase();
        if (type !== 'goal' && type !== 'but' && type !== 'g') return;
        // Player id may be in scorerId, playerId, pid, p, or in player.id
        const pid = e.scorerId || e.playerId || e.pid || e.p ||
                    (e.player && e.player.id) || e.id;
        if (!pid) return;
        if (!byPlayer[pid]) byPlayer[pid] = { goals: 0, assists: 0 };
        byPlayer[pid].goals++;
        // Assist on same event sometimes
        const aid = e.assistId || e.assist || (e.assistPlayer && e.assistPlayer.id);
        if (aid) {
          if (!byPlayer[aid]) byPlayer[aid] = { goals: 0, assists: 0 };
          byPlayer[aid].assists++;
        }
      });
    });

    const rows = Object.keys(byPlayer)
      .map(pid => {
        const p = playerById[pid];
        return {
          playerId: pid,
          name: p ? `${p.first} ${p.last}` : 'Joueur inconnu',
          first: p?.first || '',
          last: p?.last || '',
          photo: p?.photo,
          goals: byPlayer[pid].goals,
          assists: byPlayer[pid].assists,
        };
      })
      .filter(r => r.goals > 0)
      .sort((a,b) => b.goals - a.goals)
      .map((r,i) => ({ ...r, rank: i+1, me: true }));

    return rows;
  }

// ─── BUILD THE GLOBAL CDD_* OBJECTS from real CDD adapter ───
async function rebuildCDDGlobals() {
  const adapter = window.CDD;
  if (!adapter) {
    console.error('[CDD bridge] No adapter!');
    return;
  }

  const activeClub = adapter.getActiveClub();
  const activeTeam = adapter.getActiveTeam();
  const allTeams = adapter.getTeams();
  const rawPlayers = adapter.getPlayers();
  const players = rawPlayers.map((p,i) => buildViewPlayer(p, i));

  // Club view — pull FFF config from active team
  const fffCfg = activeTeam?.fff || null;
  const clubName = activeClub?.name || '';

  window.CDD_CLUB = {
    name: clubName || 'AS Club',
    short: clubName || 'CLUB',
    team: activeTeam?.name || 'Équipe',
    season: '2025–2026',
    colors: [activeClub?.primaryColor || '#22c55e', activeClub?.secondaryColor || '#000000'],
    league: fffCfg?.label || 'Championnat',
    rank: 0, played: 0, W: 0, D: 0, L: 0, gf: 0, ga: 0, pts: 0,
    form: [],
    coach: "Coach",
    fff: fffCfg,
  };

  window.CDD_PLAYERS = players;

  // Formations (unchanged)
  window.CDD_FORMATIONS = {
    "4-3-3": [
      { pos:"GK",  x:50, y:92 },
      { pos:"DG",  x:14, y:72 }, { pos:"DC", x:36, y:75 }, { pos:"DC", x:64, y:75 }, { pos:"DD", x:86, y:72 },
      { pos:"MC",  x:30, y:52 }, { pos:"MOC",x:50, y:46 }, { pos:"MC", x:70, y:52 },
      { pos:"AG",  x:18, y:24 }, { pos:"BU", x:50, y:18 }, { pos:"AD", x:82, y:24 },
    ],
    "4-4-2": [
      { pos:"GK",  x:50, y:92 },
      { pos:"DG",  x:14, y:74 }, { pos:"DC", x:36, y:76 }, { pos:"DC", x:64, y:76 }, { pos:"DD", x:86, y:74 },
      { pos:"ML",  x:14, y:50 }, { pos:"MC", x:36, y:54 }, { pos:"MC", x:64, y:54 }, { pos:"MD", x:86, y:50 },
      { pos:"BU",  x:36, y:22 }, { pos:"BU", x:64, y:22 },
    ],
    "4-2-3-1": [
      { pos:"GK",  x:50, y:92 },
      { pos:"DG",  x:14, y:74 }, { pos:"DC", x:36, y:76 }, { pos:"DC", x:64, y:76 }, { pos:"DD", x:86, y:74 },
      { pos:"MC",  x:34, y:60 }, { pos:"MC", x:66, y:60 },
      { pos:"AG",  x:16, y:38 }, { pos:"MOC",x:50, y:36 }, { pos:"AD", x:84, y:38 },
      { pos:"BU",  x:50, y:16 },
    ],
    "5-3-2": [
      { pos:"GK",  x:50, y:92 },
      { pos:"DG",  x:10, y:74 }, { pos:"DC", x:30, y:76 }, { pos:"DC", x:50, y:78 }, { pos:"DC", x:70, y:76 }, { pos:"DD", x:90, y:74 },
      { pos:"MC",  x:28, y:50 }, { pos:"MOC",x:50, y:46 }, { pos:"MC", x:72, y:50 },
      { pos:"BU",  x:36, y:20 }, { pos:"BU", x:64, y:20 },
    ],
    "3-5-2": [
      { pos:"GK",  x:50, y:92 },
      { pos:"DC",  x:24, y:76 }, { pos:"DC", x:50, y:78 }, { pos:"DC", x:76, y:76 },
      { pos:"ML",  x:12, y:52 }, { pos:"MC", x:32, y:56 }, { pos:"MC", x:50, y:50 }, { pos:"MC", x:68, y:56 }, { pos:"MD", x:88, y:52 },
      { pos:"BU",  x:36, y:22 }, { pos:"BU", x:64, y:22 },
    ],
    "4-5-1": [
      { pos:"GK",  x:50, y:92 },
      { pos:"DG",  x:14, y:74 }, { pos:"DC", x:36, y:76 }, { pos:"DC", x:64, y:76 }, { pos:"DD", x:86, y:74 },
      { pos:"ML",  x:12, y:52 }, { pos:"MC", x:32, y:54 }, { pos:"MOC",x:50, y:50 }, { pos:"MC", x:68, y:54 }, { pos:"MD", x:88, y:52 },
      { pos:"BU",  x:50, y:18 },
    ],
    "4-1-4-1": [
      { pos:"GK",  x:50, y:92 },
      { pos:"DG",  x:14, y:74 }, { pos:"DC", x:36, y:76 }, { pos:"DC", x:64, y:76 }, { pos:"DD", x:86, y:74 },
      { pos:"DM",  x:50, y:60 },
      { pos:"ML",  x:14, y:42 }, { pos:"MC", x:36, y:44 }, { pos:"MC", x:64, y:44 }, { pos:"MD", x:86, y:42 },
      { pos:"BU",  x:50, y:18 },
    ],
    "3-4-3": [
      { pos:"GK",  x:50, y:92 },
      { pos:"DC",  x:24, y:76 }, { pos:"DC", x:50, y:78 }, { pos:"DC", x:76, y:76 },
      { pos:"ML",  x:14, y:52 }, { pos:"MC", x:36, y:54 }, { pos:"MC", x:64, y:54 }, { pos:"MD", x:86, y:52 },
      { pos:"AG",  x:20, y:22 }, { pos:"BU", x:50, y:18 }, { pos:"AD", x:80, y:22 },
    ],
  };

  // Next match — synthesized (will be overwritten by FFF if available)
  window.CDD_NEXT_MATCH = {
    date: "À venir",
    home: clubName || "Mon équipe",
    away: "À déterminer",
    homeBadge: clubName?.[0] || "?",
    awayBadge: "?",
    venue: "À confirmer",
    weather: "",
    competition: fffCfg?.label || (activeTeam?.name + ' · Championnat'),
    daysLeft: 0,
  };

  // Default placeholders — overridden by FFF data
  window.CDD_LAST_MATCHES = [];
  window.CDD_STANDINGS = [];
  window.CDD_TOP_SCORERS = [];

  // Convo from lineupTemplate if present
  const lt = activeTeam?.lineupTemplate;
  window.CDD_CONVO = {
    match: window.CDD_NEXT_MATCH,
    starters: lt?.startersIds || players.filter(p => p.isStarter).slice(0, 11).map(p => p.id),
    bench: lt?.benchIds || players.filter(p => !p.isStarter && p.status !== 'reserve').slice(0, 5).map(p => p.id),
    absent: players.filter(p => p.raw.status === 'rest').slice(0, 3).map(p => ({
      id: p.id, reason: p.raw.statut === 'Suspendu' ? 'Suspendu' : 'Blessure', note: 'Indispo ce week-end'
    })),
    shareCode: "AS-" + (activeTeam?.id || '').slice(-6).toUpperCase(),
  };

  // Static-ish data (would also come from FFF API normally)
  // Overridden below if FFF config exists.
  const FALLBACK_LAST = [
    { date:"17/05", opp:"FC HOUILLES",       venue:"H", score:[3,1], result:"W", scorers:["Mehdi", "Sékou"] },
    { date:"10/05", opp:"AS POISSY",         venue:"E", score:[2,2], result:"D", scorers:["Elias", "Mehdi"] },
    { date:"03/05", opp:"PSG U15 RÉG.",      venue:"H", score:[1,3], result:"L", scorers:["Sékou"] },
    { date:"26/04", opp:"CERGY-PONTOISE",    venue:"E", score:[4,0], result:"W", scorers:["Nayel (2)", "Marley"] },
    { date:"19/04", opp:"VAUREAL FC",        venue:"H", score:[2,0], result:"W", scorers:["Mehdi", "Nayel"] },
  ];
  const FALLBACK_STANDINGS = [
    { rank:1, club:"PSG U15 RÉG.",    pl:8, w:7, d:1, l:0, gf:28, ga:6,  pts:22, form:["W","W","W","D","W","W","W","W"], hi: true },
    { rank:2, club: clubName || "Mon équipe", pl:8, w:6, d:1, l:1, gf:24, ga:9, pts:19, form:["W","W","D","W","W","L","W","W"], me: true },
    { rank:3, club:"FC PONTOISE",     pl:8, w:5, d:2, l:1, gf:21, ga:11, pts:17, form:["W","D","W","W","D","W","L","W"] },
    { rank:4, club:"AS POISSY",       pl:8, w:4, d:2, l:2, gf:16, ga:13, pts:14, form:["L","D","W","W","D","L","W","W"] },
    { rank:5, club:"CERGY-PONT.",     pl:8, w:3, d:2, l:3, gf:14, ga:15, pts:11, form:["D","L","W","W","D","L","W","L"] },
    { rank:6, club:"VAUREAL FC",      pl:8, w:2, d:3, l:3, gf:11, ga:15, pts:9,  form:["L","D","W","D","L","D","W","L"] },
    { rank:7, club:"FC HOUILLES",     pl:8, w:2, d:1, l:5, gf:9,  ga:18, pts:7,  form:["L","L","W","D","L","W","L","L"] },
    { rank:8, club:"ÉCQUEVILLY US",   pl:8, w:0, d:2, l:6, gf:5,  ga:21, pts:2,  form:["L","D","L","L","L","L","D","L"] },
  ];

  // Only use fallback if no FFF config — but we'll override later with FFF data if it's available
  window.CDD_LAST_MATCHES = fffCfg ? [] : FALLBACK_LAST;
  window.CDD_STANDINGS = fffCfg ? [] : FALLBACK_STANDINGS;
  // Top scorers: ALWAYS from internal data (arb_m matches arbitrés par le coach).
  // No fake mocks — if no matches recorded yet, the leaderboard stays empty.
  window.CDD_TOP_SCORERS = buildTopScorers(players);

  window.CDD_LIVE_MATCH = {
    minute: 67, half: 2,
    home: activeClub?.name || "AS MAGNY", homeScore: 2,
    away: "FC PONTOISE", awayScore: 1,
    events: [
      { min: 12, type:"goal",   side:"home", player: players[4]?.first+' '+players[4]?.last || "Daouda", desc:"Tête sur centre", assist: players[14]?.first+' '+players[14]?.last },
      { min: 23, type:"yellow", side:"away", player:"M. Diallo", desc:"Tacle en retard" },
      { min: 45, type:"half",   side:"-",    player:"", desc:"Mi-temps · 1-1" },
      { min: 58, type:"goal",   side:"home", player: players[8]?.first+' '+players[8]?.last || "Doumbia", desc:"Coup-franc direct" },
      { min: 64, type:"yellow", side:"home", player: players[1]?.first+' '+players[1]?.last, desc:"Contestation" },
    ],
    poss: 58, shots: [9, 6], onTarget: [5, 3], corners: [4, 3], fouls: [7, 11],
  };

  window.CDD_OBSERVATIONS = {
    [players[8]?.id]: [
      { date:"17/05", tag:"Match", txt:"Énorme match — 1 but, 2 passes. Discipline tactique top niveau." }
    ],
    [players[4]?.id]: [
      { date:"17/05", tag:"Match", txt:"Doublé de buts dont une tête splendide. Pressing exemplaire." }
    ]
  };

  window.CDD_POS_COLOR = {
    GK: "#f5c451", DC: "#3b82f6", DG: "#3b82f6", DD: "#3b82f6",
    ML: "#22c55e", MD: "#22c55e", MC: "#22c55e", MOC: "#22c55e",
    AG: "#ef4444", AD: "#ef4444", BU: "#ef4444", ATT: "#ef4444",
  };

  console.log(`%c[CDD bridge] Globals rebuilt: ${players.length} players, club=${activeClub?.name}, team=${activeTeam?.name}`,
    'color:#c8f169;font-weight:700');

  // Use fallback data immediately so the app renders FAST
  window.CDD_LAST_MATCHES = FALLBACK_LAST;
  window.CDD_STANDINGS = FALLBACK_STANDINGS;
  // Buteurs: only from REAL recorded matches (arb_m) — no mock fillers
  window.CDD_TOP_SCORERS = buildTopScorers(players);

  // Render NOW with fallback, then fetch FFF in background if useful
  window.dispatchEvent(new CustomEvent('cdd-data-rebuilt'));

  // ─── ASYNC FFF fetch: NON-BLOCKING, cache-first ───
  // Only fetch if: config exists AND (no cache OR cache stale OR user forced refresh)
  if (fffCfg && window.CDD_FFF) {
    const status = window.CDD_FFF.getCacheStatus(fffCfg);
    const shouldFetch = window.CDD_FFF_FORCE_REFRESH || !status.hasCache || status.stale;

    if (!shouldFetch && status.hasCache) {
      console.log(`[CDD bridge] FFF cache fresh (${Math.round(status.age/3600000)}h old) — using cached data`);
      // Apply cached data immediately
      applyFFFData(fffCfg, clubName, players);
    } else {
      console.log(`[CDD bridge] FFF cache ${status.hasCache ? 'stale' : 'missing'} — fetching ${fffCfg.label}...`);
      window.CDD_FFF_LOADING = true;
      window.dispatchEvent(new CustomEvent('cdd-fff-loading'));

      // Fire-and-forget — never blocks
      applyFFFData(fffCfg, clubName, players).catch(e => {
        console.error('[CDD bridge] FFF fetch error:', e);
        window.CDD_FFF_LOADING = false;
        window.CDD_FFF_ERROR = e.message;
        window.dispatchEvent(new CustomEvent('cdd-fff-error', { detail: e.message }));
      });
    }
  }
}

async function applyFFFData(fffCfg, clubName, players) {
  // Build a target name for matching — prefer myTeamName if present, else clubName
  const myTeamName = fffCfg.myTeamName || clubName;

  const [rankRes, matchRes] = await Promise.allSettled([
    window.CDD_FFF.getRanking(fffCfg, { force: window.CDD_FFF_FORCE_REFRESH }),
    window.CDD_FFF.getMatches(fffCfg, { force: window.CDD_FFF_FORCE_REFRESH }),
  ]);
  window.CDD_FFF_FORCE_REFRESH = false;
  window.CDD_FFF_LOADING = false;

  // Standings
  if (rankRes.status === 'fulfilled' && rankRes.value.ok && rankRes.value.data.length > 0) {
    const standings = rankRes.value.data.map((r,i) =>
      window.CDD_FFF.normalizeRankRow(r, i, myTeamName));
    const me = standings.find(s => s.me);
    window.CDD_STANDINGS = standings;
    if (me) {
      window.CDD_CLUB = { ...window.CDD_CLUB,
        rank: me.rank, played: me.pl, W: me.w, D: me.d, L: me.l,
        gf: me.gf, ga: me.ga, pts: me.pts,
      };
    }
    window.CDD_FFF_SOURCE = rankRes.value.source;
    window.CDD_FFF_AGE = rankRes.value.age;
    console.log(`[FFF] ✓ Standings: ${standings.length} clubs (source: ${rankRes.value.source})`);
  }

  // Matches
  if (matchRes.status === 'fulfilled' && matchRes.value.ok && matchRes.value.data.length > 0) {
    const myMatches = matchRes.value.data
      .map(m => window.CDD_FFF.normalizeMatchRow(m, myTeamName))
      .filter(m => m.venue !== "?")
      .sort((a,b) => new Date(b.dateRaw) - new Date(a.dateRaw));

    const played = myMatches.filter(m => m.played);
    const upcoming = myMatches.filter(m => !m.played).reverse();

    window.CDD_LAST_MATCHES = played.slice(0, 99).map(m => ({
      date: m.date,
      dateRaw: m.dateRaw,
      opp: m.opp,
      home: m.home,
      away: m.away,
      venue: m.venue,
      score: m.score,
      result: m.result,
      journee: m.journee,
      forfeit: m.forfeit,
      played: true,
      scorers: [],
    }));

    // Also store all matches (past + upcoming) for full agenda
    window.CDD_ALL_MATCHES = [...played, ...upcoming.map(m => ({
      date: m.date,
      dateRaw: m.dateRaw,
      opp: m.opp,
      home: m.home,
      away: m.away,
      venue: m.venue,
      score: null,
      result: null,
      journee: m.journee,
      played: false,
      scorers: [],
    }))].sort((a,b) => (a.journee||999) - (b.journee||999));

    if (window.CDD_CLUB?.rank) {
      window.CDD_CLUB.form = played.slice(0, 8).reverse().map(m => m.result || "?");
    }

    if (upcoming.length > 0) {
      const next = upcoming[0];
      const d = new Date(next.dateRaw);
      const isValid = !isNaN(d);
      const dayLabel = isValid ?
        ['Dim.','Lun.','Mar.','Mer.','Jeu.','Ven.','Sam.'][d.getDay()] : '';
      const dayNum = isValid ? d.getDate() : '';
      const monthLabel = isValid ?
        ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc'][d.getMonth()] : '';
      const hour = isValid && (d.getHours() || d.getMinutes()) ?
        `${String(d.getHours()).padStart(2,'0')}h${String(d.getMinutes()).padStart(2,'0')}` : '';
      const daysLeft = isValid ? Math.max(0, Math.ceil((d - Date.now()) / 86400000)) : 0;

      window.CDD_NEXT_MATCH = {
        date: isValid ? `${dayLabel} ${dayNum} ${monthLabel}${hour ? ' · ' + hour : ''}` : next.date,
        home: next.home,
        away: next.away,
        homeBadge: next.home[0] || '?',
        awayBadge: next.away[0] || '?',
        venue: next.venue === 'H' ? 'Domicile' : 'Extérieur',
        weather: '',
        competition: fffCfg.label,
        daysLeft,
      };
    }
    console.log(`[FFF] ✓ Matches: ${played.length} played, ${upcoming.length} upcoming`);
  }

  window.CDD_FFF_LOADED = true;
  window.dispatchEvent(new CustomEvent('cdd-data-rebuilt'));
  window.dispatchEvent(new CustomEvent('cdd-fff-loaded'));
  console.log('%c[FFF] Data applied ✓', 'color:#c8f169;font-weight:900');
}

// Expose
window.CDD_REBUILD = rebuildCDDGlobals;
window.CDD_HELPERS = { normalizePosition, deriveRarity, deriveStats, resolvePhoto, buildViewPlayer };

// Auto-rebuild on club/team change
window.addEventListener('cdd-active-club-changed', rebuildCDDGlobals);
window.addEventListener('cdd-active-team-changed', rebuildCDDGlobals);

// Initial build (sync)
if (window.CDD && window.CDD.getActiveClub) {
  rebuildCDDGlobals();
}
