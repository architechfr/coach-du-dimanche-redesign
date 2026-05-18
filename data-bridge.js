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
  // BAMBA Mamadou — LEADER, récupérateur + meneur de jeu, physique
  'pl_moydtri8_v1skp': { base: 14, profile: 'DM', leader: true },
  // TRAORE Djibril (#10) — meneur de jeu
  'pl_moydtri8_uid2h': { base: 11, profile: 'MOC' },
  // ITOUA Grace Appolinaire — milieu / box-to-box
  'pl_moydtri8_krkoy': { base: 10, profile: 'MC' },
  // DOUMBIA Sékou — athlète polyvalent, peut tout jouer
  'pl_moydtri8_uyhvf': { base: 12, profile: 'BU', versatile: true },
  // EULOGA Darell (#7) — RAPIDE, ailier droit
  'pl_moydtri8_fs89g': { base: 9, profile: 'AD', speedster: true },
  // AID Shahine (#16) — technique cœur du jeu, belles passes, petit périmètre
  'pl_moydtri8_vjlwq': { base: 3, profile: 'MC', technician: true },
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
  // Mamadou leader: PHY, DEF, PAS au max (récupérateur + meneur)
  if (star?.leader) {
    p.PHY = +14;
    p.DEF = +12;
    p.PAS = +14;
    p.DRI = +8;
  }
  // Darell speedster: PAC boost
  if (star?.speedster) {
    p.PAC = +20;
    p.DRI = +16;
  }
  // Shahine technician: belles passes + technique en petit périmètre, peu physique
  if (star?.technician) {
    p.PAS = +14;
    p.DRI = +10;
    p.SHO = +2;
    p.PHY = -2;
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
  // ⚠️ Capturer les noms FFF ORIGINAUX *avant* tout merge.
  // La photo est résolue par le nom de fichier FFF (NOM_Prénom.jpg) :
  // si le coach renomme un joueur ('Grace Appolinaire' → 'Appolinaire'),
  // l'image existe toujours sous l'ancien nom — on doit utiliser le raw.
  const rawFirstName = player.firstName;
  const rawLastName  = player.lastName;
  const rawPhotoDataUrl = player.photoDataUrl;

  const STAR_RARITIES = {
    'pl_moydtri8_82ncg': 'hero',    // Laighor — capitaine
    'pl_moydtri8_v1skp': 'hero',    // Mamadou — leader
    'pl_moydtri8_uid2h': 'icon',    // Djibril
    'pl_moydtri8_krkoy': 'totw',    // Grace Appolinaire
    'pl_moydtri8_uyhvf': 'hero',    // Sékou
    'pl_moydtri8_fs89g': 'totw',    // Darell — speedster
    'pl_moydtri8_vjlwq': 'icon',    // Shahine — technique pure
  };

  // ─── Apply PROFILE override (coach edits via fiche joueur) ───
  let profileOv = {};
  try {
    const all = JSON.parse(localStorage.getItem('cdd_player_profile') || '{}');
    profileOv = all[player.id] || {};
  } catch (e) {}
  const mergedPlayer = {
    ...player,
    position:       profileOv.position       || player.position,
    licenceFFF:     profileOv.licence        || player.licenceFFF || player.license,
    preferredNumber: profileOv.num != null   ? profileOv.num : player.preferredNumber,
    height:         profileOv.height         || player.height,
    weight:         profileOv.weight         || player.weight,
    foot:           profileOv.foot           || player.foot,
    birthDate:      profileOv.birthDate      || player.birthDate,
    phone:          profileOv.phone          || player.phone,
    parentPhone:    profileOv.parentPhone    || player.parentPhone,
    email:          profileOv.email          || player.email,
    notes:          profileOv.notes          || player.notes,
    photoDataUrl:   profileOv.photoDataUrl   || player.photoDataUrl,
  };

  // ─── Apply STATUS override (statut courant + métadonnées) ───
  let statusFinal = mergedPlayer.status || 'active';
  let statusMeta = {};
  try {
    const allS = JSON.parse(localStorage.getItem('cdd_player_status_override') || '{}');
    if (allS[player.id]) statusFinal = allS[player.id];
    const allM = JSON.parse(localStorage.getItem('cdd_player_status_meta') || '{}');
    if (allM[player.id]) statusMeta = allM[player.id];
  } catch (e) {}
  mergedPlayer.status       = statusFinal;
  mergedPlayer.statusReason = statusMeta.reason || null;
  mergedPlayer.statusUntil  = statusMeta.until  || null;

  player = mergedPlayer;
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
    age: player.birthDate ? computeAge(player.birthDate) : null,
    foot: player.foot || null,
    height: player.height ? parseInt(player.height) : null,
    weight: player.weight ? parseInt(player.weight) : null,
    birthDate: player.birthDate || null,
    phone: player.phone || null,
    parentPhone: player.parentPhone || null,
    email: player.email || null,
    notes: player.notes || '',
    stats, // FUT-card cosmetics derived from poste — see deriveStats()
    rarity: STAR_RARITIES[player.id] || deriveRarity(player, idx),
    isCaptain: player.id === 'pl_moydtri8_82ncg' || !!player.isCaptain,
    // ⚠️ Vraies stats — 0 par défaut, agrégées par applyRealStats() depuis arb_m{}
    form: 0,
    fitness: player.status === 'rest' ? 60 : (player.status === 'injured' ? 30 : 100),
    mins: 0,
    goals: 0,
    assists: 0,
    yellow: 0,
    red: 0,
    mvp: 0,
    matchesPlayed: 0,
    // ⚠️ Photo = nom FFF original (jamais le rename coach), mais photoDataUrl override gagne
    photo: resolvePhoto({
      firstName:    rawFirstName,
      lastName:     rawLastName,
      photoDataUrl: player.photoDataUrl || rawPhotoDataUrl,
    }),
    license: player.licenceFFF || player.license || null,
    status: player.status || 'active',
    statusReason: player.statusReason || null,
    statusUntil: player.statusUntil || null,
    isStarter: player.isStarter,
    raw: player,
  };
}

// ─── Agrège les vraies stats joueur depuis les matches arbitrés (arb_m{}) ───
// Mute les `players` en place : goals/assists/yellow/red/mvp/mins/matchesPlayed.
// Sans matchs arbitrés, tout reste à 0 (pas de fausse data).
function applyRealStats(players) {
  if (!window.CDD || !window.CDD.getMatchesForActiveTeam) return;
  const matches = window.CDD.getMatchesForActiveTeam() || [];
  if (!matches.length) return;
  const byId = {};
  players.forEach(p => { byId[p.id] = p; });
  matches.forEach(m => {
    const evs = m.events || m.timeline || m.actions || [];
    const playedIds = new Set();
    const lineupIds = (m.lineup && m.lineup.startersIds) || m.startersIds || [];
    const benchIds  = (m.lineup && m.lineup.benchIds)    || m.benchIds    || [];
    [...lineupIds, ...benchIds].forEach(pid => { if (byId[pid]) playedIds.add(pid); });
    evs.forEach(e => {
      if (!e) return;
      const type = (e.type || e.t || '').toLowerCase();
      const pid = e.scorerId || e.playerId || e.pid || e.p ||
                  (e.player && e.player.id) || e.id;
      if (!pid || !byId[pid]) return;
      const p = byId[pid];
      if (type === 'goal' || type === 'but' || type === 'g') {
        p.goals++;
        const aid = e.assistId || e.assist || (e.assistPlayer && e.assistPlayer.id);
        if (aid && byId[aid]) byId[aid].assists++;
        playedIds.add(pid);
      } else if (type === 'yellow' || type === 'jaune' || type === 'y') {
        p.yellow++; playedIds.add(pid);
      } else if (type === 'red' || type === 'rouge' || type === 'r') {
        p.red++; playedIds.add(pid);
      } else if (type === 'mvp') {
        p.mvp++; playedIds.add(pid);
      }
    });
    playedIds.forEach(pid => {
      const p = byId[pid];
      p.matchesPlayed++;
      p.mins += (m.minutesByPlayer && m.minutesByPlayer[pid]) || 90;
    });
  });
  // Forme simple : 6 + (buts/match)*4 − (cartons/match)*2
  players.forEach(p => {
    if (p.matchesPlayed === 0) { p.form = 0; return; }
    const goalRate = p.goals / p.matchesPlayed;
    const cardPenalty = (p.yellow + p.red * 3) / p.matchesPlayed;
    p.form = Math.max(4, Math.min(10, Math.round(6 + goalRate * 4 - cardPenalty * 2)));
  });
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
  // Agrège les vraies stats depuis arb_m (matches arbitrés du coach actif)
  applyRealStats(players);

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

  // Next match — par défaut "À déterminer" jusqu'à ce que FFF nous donne un vrai match
  window.CDD_NEXT_MATCH = {
    date: "À déterminer",
    home: clubName || "Mon équipe",
    away: "À déterminer",
    homeBadge: clubName?.[0] || "?",
    awayBadge: "?",
    venue: "À confirmer",
    weather: "",
    competition: fffCfg?.label || (activeTeam?.name + ' · Championnat'),
    daysLeft: 0,
    noUpcoming: true, // ← flag pour l'UI : afficher un placeholder explicite
  };

  // Default placeholders — overridden by FFF data
  window.CDD_LAST_MATCHES = [];
  window.CDD_STANDINGS = [];
  window.CDD_TOP_SCORERS = [];

  // ─── Convoc : taille configurable par équipe (14/16/18/20 ou libre) ───
  const lt = activeTeam?.lineupTemplate;
  let convocCount = 14; // 11 titulaires + 3 remplaçants (défaut foot amateur)
  try {
    const allSet = JSON.parse(localStorage.getItem('cdd_convoc_settings') || '{}');
    if (allSet[activeTeam?.id] && typeof allSet[activeTeam.id].count === 'number') {
      convocCount = allSet[activeTeam.id].count;
    } else if (allSet[activeTeam?.id] && allSet[activeTeam.id].count === null) {
      convocCount = null; // illimité
    }
  } catch (e) {}

  // STATUTS NON-DISPO : 'rest', 'injured', 'suspended'
  const unavailable = new Set(['rest', 'injured', 'suspended']);
  const availablePlayers = players.filter(p => !unavailable.has(p.status));
  const absentPlayers = players.filter(p => unavailable.has(p.status));

  // Titulaires : ceux marqués isStarter, dans la limite des dispos
  let starters = lt?.startersIds
    ? lt.startersIds.filter(id => availablePlayers.some(p => p.id === id))
    : availablePlayers.filter(p => p.isStarter).slice(0, 11).map(p => p.id);

  // ⚠️ COMPLETER A 11 TITULAIRES : si des titulaires d'origine sont
  // devenus absents, on puise dans les autres joueurs dispos pour
  // garantir une équipe complète (11 joueurs sur le terrain).
  const startersSetInit = new Set(starters);
  const fillers = availablePlayers.filter(p =>
    !startersSetInit.has(p.id) && p.status !== 'reserve'
  );
  // Ajouter les joueurs habituellement remplaçants en priorité, puis le reste
  fillers.sort((a, b) => {
    // Banc d'origine d'abord, puis réserve, puis le reste
    const aBench = lt?.benchIds?.includes(a.id) ? 0 : 1;
    const bBench = lt?.benchIds?.includes(b.id) ? 0 : 1;
    return aBench - bBench;
  });
  while (starters.length < 11 && fillers.length > 0) {
    starters.push(fillers.shift().id);
  }

  // Remplaçants : convocCount - starters parmi les dispos restants
  const startersSet = new Set(starters);
  const benchPool = availablePlayers.filter(p => !startersSet.has(p.id) && p.status !== 'reserve');
  let bench;
  if (convocCount === null) {
    // Illimité = tous les dispos non-titulaires non-réserve
    bench = benchPool.map(p => p.id);
  } else {
    const benchSize = Math.max(0, convocCount - starters.length);
    bench = (lt?.benchIds && lt.benchIds.length)
      ? lt.benchIds.filter(id => benchPool.some(p => p.id === id)).slice(0, benchSize)
      : benchPool.slice(0, benchSize).map(p => p.id);
  }

  // Absents : TOUS (plus de slice(0,3))
  const absent = absentPlayers.map(p => {
    const reasonMap = { rest: 'Indisponible', injured: 'Blessure', suspended: 'Suspendu' };
    return {
      id: p.id,
      reason: reasonMap[p.status] || p.statusReason || 'Indispo',
      note: p.statusReason || (p.statusUntil ? `Jusqu'au ${p.statusUntil}` : ''),
    };
  });

  // Joueurs en réserve non convoqués (filtre statut + non dans la convoc)
  const convocIds = new Set([...starters, ...bench, ...absent.map(a => a.id)]);
  const reserve = players.filter(p =>
    !convocIds.has(p.id) && p.status !== 'reserve' && !unavailable.has(p.status)
  ).map(p => p.id);

  // Warnings convoc : taille atteinte ? 11 titulaires ?
  const targetSize = convocCount === null ? (11 + (benchPool.length)) : convocCount;
  const warnings = [];
  if (starters.length < 11) {
    warnings.push({ level: 'error', text: `Seulement ${starters.length}/11 titulaires disponibles. Manque ${11 - starters.length} joueur(s).` });
  }
  if (convocCount !== null && (starters.length + bench.length) < convocCount) {
    warnings.push({ level: 'warn', text: `Convoc à ${starters.length + bench.length}/${convocCount} joueurs (manque ${convocCount - starters.length - bench.length}).` });
  }

  window.CDD_CONVO = {
    match: window.CDD_NEXT_MATCH,
    starters,
    bench,
    absent,
    reserve, // ← dispo mais non convoqués (cliquables pour ajouter)
    convocCount,
    targetSize,
    warnings,
    shareCode: "AS-" + (activeTeam?.id || '').slice(-6).toUpperCase(),
  };

  // Pas de fallback fictif — derniers matchs et classement viennent de FFF (async)
  // ou du moteur de matchs arbitrés (arb_m), jamais de mocks.
  window.CDD_LAST_MATCHES = [];
  window.CDD_STANDINGS = [];
  // Top scorers: ALWAYS from internal data (arb_m matches arbitrés par le coach).
  window.CDD_TOP_SCORERS = buildTopScorers(players);

  // Match live : aucun par défaut. Rempli par le moteur d'arbitrage si match en cours.
  let liveMatch = null;
  try {
    const live = JSON.parse(localStorage.getItem('arb_live') || localStorage.getItem('cdd_v2_live_match') || 'null');
    if (live && live.startedAt && !live.endedAt) liveMatch = live;
  } catch (e) {}
  window.CDD_LIVE_MATCH = liveMatch;

  // Observations coach — vide par défaut, à remplir par le coach via fiche joueur
  let observations = {};
  try {
    observations = JSON.parse(localStorage.getItem('cdd_observations') || '{}');
  } catch (e) {}
  window.CDD_OBSERVATIONS = observations;

  window.CDD_POS_COLOR = {
    GK: "#f5c451", DC: "#3b82f6", DG: "#3b82f6", DD: "#3b82f6",
    ML: "#22c55e", MD: "#22c55e", MC: "#22c55e", MOC: "#22c55e",
    AG: "#ef4444", AD: "#ef4444", BU: "#ef4444", ATT: "#ef4444",
  };

  console.log(`%c[CDD bridge] Globals rebuilt: ${players.length} players, club=${activeClub?.name}, team=${activeTeam?.name}`,
    'color:#c8f169;font-weight:700');

  // Pas de fallback fictif — listes vides jusqu'à FFF ou premier match arbitré
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

// ─── API publique : régler la taille de la convoc d'une équipe ───
window.CDD_CONVOC = {
  setSize(teamId, count) {
    // count = number | null (illimité)
    try {
      const all = JSON.parse(localStorage.getItem('cdd_convoc_settings') || '{}');
      all[teamId] = { count, updatedAt: Date.now() };
      localStorage.setItem('cdd_convoc_settings', JSON.stringify(all));
    } catch (e) {}
    if (window.CDD_REBUILD) window.CDD_REBUILD();
  },
  getSize(teamId) {
    try {
      const all = JSON.parse(localStorage.getItem('cdd_convoc_settings') || '{}');
      return all[teamId]?.count ?? 16;
    } catch (e) { return 16; }
  },
  // Ajoute un joueur à la convoc en starters ou bench (selon disponibilité)
  addToConvoc(teamId, playerId, slot = 'bench') {
    // Met à jour le lineupTemplate dans arb_teams
    try {
      const teams = JSON.parse(localStorage.getItem('arb_teams') || '[]');
      const team = teams.find(t => t.id === teamId);
      if (!team) return;
      if (!team.lineupTemplate) team.lineupTemplate = {};
      const lt = team.lineupTemplate;
      lt.startersIds = lt.startersIds || [];
      lt.benchIds = lt.benchIds || [];
      // Retirer d'abord du joueur des deux listes
      lt.startersIds = lt.startersIds.filter(id => id !== playerId);
      lt.benchIds    = lt.benchIds.filter(id    => id !== playerId);
      if (slot === 'starter') lt.startersIds.push(playerId);
      else                    lt.benchIds.push(playerId);
      lt.updatedAt = Date.now();
      localStorage.setItem('arb_teams', JSON.stringify(teams));
    } catch (e) {}
    if (window.CDD_REBUILD) window.CDD_REBUILD();
  },
  removeFromConvoc(teamId, playerId) {
    try {
      const teams = JSON.parse(localStorage.getItem('arb_teams') || '[]');
      const team = teams.find(t => t.id === teamId);
      if (!team || !team.lineupTemplate) return;
      const lt = team.lineupTemplate;
      lt.startersIds = (lt.startersIds || []).filter(id => id !== playerId);
      lt.benchIds    = (lt.benchIds    || []).filter(id => id !== playerId);
      lt.updatedAt = Date.now();
      localStorage.setItem('arb_teams', JSON.stringify(teams));
    } catch (e) {}
    if (window.CDD_REBUILD) window.CDD_REBUILD();
  },
};

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
