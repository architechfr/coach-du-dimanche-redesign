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
  'pl_moydtri8_vjlwq': { base: 4, profile: 'MC', technician: true },
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

  // Coach-identified stars : plancher au niveau titulaire (un joueur
  // identifié comme star n'est jamais noté comme un réserviste), puis
  // bonus spécifique. Garantit une note cohérente quel que soit le flag
  // isStarter de la donnée FFF/cloud.
  if (star) {
    base = Math.max(base, 78);
    base += star.base;
  }

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

  const clamp = v => Math.max(40, Math.min(99, v));
  // Postes secondaires (Phase E) — le coach déclare les postes où le joueur
  // est polyvalent. Lus depuis le profil override coach. Stockés en tableau
  // de codes ('DM', 'MC'…). Le poste principal `pos` n'est jamais inclus.
  let altPositions = [];
  try {
    const profiles = JSON.parse(localStorage.getItem('cdd_player_profile') || '{}');
    const prof = profiles[player.id];
    if (prof && Array.isArray(prof.altPositions)) {
      altPositions = prof.altPositions.filter(p => p && p !== pos);
    }
  } catch (e) {}

  // OVR pondéré selon le poste principal + bonus polyvalence borné
  // (voir position-rating.js → overallWithVersatility, cap à +2).
  // Une faible stat hors-poste (ex: DEF d'un attaquant) ne tire plus
  // la note vers le bas. Fallback : moyenne plate si le module n'est
  // pas encore chargé.
  const ovrFor = (s) => {
    if (!window.CDD_RATING) {
      return Math.round((s.PAC + s.SHO + s.PAS + s.DRI + s.DEF + s.PHY) / 6);
    }
    if (window.CDD_RATING.overallWithVersatility) {
      return window.CDD_RATING.overallWithVersatility(s, pos, altPositions);
    }
    return window.CDD_RATING.weightedOverall(s, pos);
  };
  const stats = {
    PAC: clamp(base + p.PAC + variation(0)),
    SHO: clamp(base + p.SHO + variation(1)),
    PAS: clamp(base + p.PAS + variation(2)),
    DRI: clamp(base + p.DRI + variation(3)),
    DEF: clamp(base + p.DEF + variation(4)),
    PHY: clamp(base + p.PHY + variation(5)),
  };
  stats.ovr = ovrFor(stats);

  // Coach overrides
  try {
    const overrides = JSON.parse(localStorage.getItem('cdd_player_stats_override') || '{}');
    const ov = overrides[player.id];
    if (ov) {
      Object.keys(stats).forEach(k => {
        if (typeof ov[k] === 'number') stats[k] = ov[k];
      });
      stats.ovr = ovrFor(stats);
    }
  } catch (e) {}

  // Auto-progression OVR par matchs joués (Niveau 1 — voir ANALYSE_STRATEGIQUE).
  // Les deltas sont accumulés dans cdd_player_perf_deltas par CDD_COACH.applyMatchPerformanceDeltas
  // après chaque match terminé. Cappé à ±10 par stat sur la saison.
  if (window.CDD_COACH && window.CDD_COACH.getPerfDeltaSum) {
    const perfDelta = window.CDD_COACH.getPerfDeltaSum(player.id);
    let mutated = false;
    ['PAC','SHO','PAS','DRI','DEF','PHY'].forEach(k => {
      if (perfDelta[k]) {
        // Arrondi obligatoire : les voteDelta (0,15) et goalsDelta (0,4)
        // sont fractionnaires — sans arrondi le slider de notation hérite
        // d'une valeur 82,15 et ne peut plus jamais retomber sur un entier.
        stats[k] = clamp(Math.round(stats[k] + perfDelta[k]));
        mutated = true;
      }
    });
    if (mutated) {
      stats.ovr = ovrFor(stats);
    }
  }

  // Phase E — détail polyvalence pour l'UI (badge carte FUT, diagnostic
  // Mode Détaillé). Exposé sur le résultat sans réécrire stats.ovr (qui
  // contient déjà le bonus via overallWithVersatility).
  stats.altPositions = altPositions;
  if (window.CDD_RATING && window.CDD_RATING.versatilityReport) {
    const vr = window.CDD_RATING.versatilityReport(stats, pos, altPositions);
    stats.versatilityBonus = vr.bonus;
    stats.versatilityAlts = vr.alts;
  } else {
    stats.versatilityBonus = 0;
    stats.versatilityAlts = [];
  }

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
    photoDataUrl:   profileOv.photoUrl || profileOv.photoDataUrl || player.photoDataUrl,
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

  // ── Disambiguation des prenoms dans l'equipe.
  // Si plusieurs joueurs ont le meme prenom (ex: 2 'Guillaume' dans
  // l'effectif), on ajoute l'initiale du nom de famille pour les
  // distinguer sur la carte FUT et partout ou on affiche player.firstDisplay.
  // Sinon firstDisplay = first (prenom seul, propre).
  (function disambiguateFirstNames() {
    const counts = {};
    players.forEach(p => {
      const f = (p.first || '').trim().toLowerCase();
      if (!f) return;
      counts[f] = (counts[f] || 0) + 1;
    });
    players.forEach(p => {
      const f = (p.first || '').trim();
      if (!f) { p.firstDisplay = p.first || ''; return; }
      const fLow = f.toLowerCase();
      if ((counts[fLow] || 0) > 1) {
        // Doublon detecte : ajouter l'initiale du nom (ex: 'Guillaume M.')
        const lastInitial = (p.last || '').trim().charAt(0).toUpperCase();
        p.firstDisplay = lastInitial ? `${f} ${lastInitial}.` : f;
      } else {
        p.firstDisplay = f;
      }
    });
  })();

  // Club view — pull FFF config from active team
  const fffCfg = activeTeam?.fff || null;
  const clubName = activeClub?.name || '';

  // Logo club : keyé par clubId pour qu'un coach gérant plusieurs clubs (FCMH, USDF...)
  // ait le bon logo pour chaque club. cdd_club_logos = { [clubId]: dataURL }.
  // Fallback : ancienne clé cdd_club_logo_override (mono-club), puis donnée brute.
  let logoDataUrl = null;
  try {
    const logos = JSON.parse(localStorage.getItem('cdd_club_logos') || '{}');
    if (activeClub?.id && logos[activeClub.id]) logoDataUrl = logos[activeClub.id];
  } catch (e) {}
  if (!logoDataUrl) {
    try { logoDataUrl = localStorage.getItem('cdd_club_logo_override') || null; } catch (e) {}
  }
  if (!logoDataUrl) logoDataUrl = activeClub?.logoDataUrl || null;

  window.CDD_CLUB = {
    name: clubName || 'Mon club',
    short: clubName || 'CLUB',
    team: activeTeam?.name || 'Équipe',
    season: '2025–2026',
    colors: [activeClub?.primaryColor || '#22c55e', activeClub?.secondaryColor || '#000000'],
    logoDataUrl,
    league: fffCfg?.label || 'Championnat',
    rank: 0, played: 0, W: 0, D: 0, L: 0, gf: 0, ga: 0, pts: 0,
    form: [],
    coach: "Coach",
    fff: fffCfg,
    // Page Club — référentiel central (2026-05-24) : stade + contacts +
    // fédération/district + réseaux sociaux. Édité via screen-club.jsx.
    stadium:     activeClub?.stadium     || null,
    contacts:    Array.isArray(activeClub?.contacts) ? activeClub.contacts : [],
    federation:  activeClub?.federation  || '',
    district:    activeClub?.district    || '',
    socialMedia: activeClub?.socialMedia || null,
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

  // Next match — par défaut "À déterminer" jusqu'à ce que FFF nous donne un vrai match.
  // Si applyFFFData a déjà rempli CDD_NEXT_MATCH avec un vrai match, on le préserve
  // (sinon un simple rebuild écraserait le contexte FFF et casserait l'overlay convoc).
  const prevNext = window.CDD_NEXT_MATCH;
  const hasRealNext = prevNext && !prevNext.noUpcoming && prevNext.away && prevNext.away !== 'À déterminer';
  window.CDD_NEXT_MATCH = hasRealNext ? prevNext : {
    // ⚠ id sûr pour Firestore : les ids encadrés par '__..__' sont RÉSERVÉS et
    // refusés à l'écriture. Ne jamais revenir à '__placeholder__'.
    id: 'placeholder',
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

  // ─── Sélecteur multi-matchs (FFF + amicaux) — 2026-05-24 ───
  // Si le coach a explicitement choisi un match actif (via le switcher),
  // on l'utilise comme CDD_NEXT_MATCH, prioritaire sur tout le reste.
  // Sinon, le comportement par défaut s'applique : FFF si présent, sinon
  // prochain amical (fallback ci-dessous).
  if (activeTeam?.id && window.CDD_MATCH_SWITCHER?.hasExplicitChoice?.(activeTeam.id)) {
    try {
      const active = window.CDD_MATCH_SWITCHER.getActive(activeTeam.id);
      if (active) {
        const myName = clubName || 'Mon équipe';
        const isHome = active.venue === 'H';
        const home = isHome ? myName : (active.opponent || 'Adversaire');
        const away = isHome ? (active.opponent || 'Adversaire') : myName;
        const dDisplay = (() => {
          const r = /^(\d{4})-(\d{2})-(\d{2})$/.exec(active.dateISO || '');
          return r ? (r[3] + '/' + r[2] + '/' + r[1]) : (active.date || '');
        })();
        window.CDD_NEXT_MATCH = {
          id: active.id,
          date: dDisplay,
          dateISO: active.dateISO,
          time: active.time || '',
          home, away,
          homeBadge: (home || '?')[0],
          awayBadge: (away || '?')[0],
          // Adversaire (= équipe qui n'est pas la nôtre) — calculé selon venue
          // pour éviter la confusion "FCMH vs FCMH" quand on est à l'extérieur.
          opponentName: active.opponent || 'Adversaire',
          opponentLogo: null,
          myClubName: myName,
          venue: isHome ? 'Domicile' : 'Extérieur',
          competition: active.label,
          isAmical: active.kind === 'amical',
          daysLeft: 0,
          noUpcoming: false,
        };
      }
    } catch (e) {}
  }

  // ─── Match AMICAL (hors-championnat) — fallback ───
  // Si aucun match FFF n'est chargé (placeholder en cours), on regarde si le
  // coach a créé un match amical à venir. Dans ce cas, l'amical devient le
  // prochain match. Si FFF a déjà un vrai match, on le garde (les amicaux
  // viendront dans un second temps via un onglet dédié).
  if (!hasRealNext && activeTeam?.id && window.CDD_FRIENDLY?.nextUpcoming
      && !(window.CDD_MATCH_SWITCHER?.hasExplicitChoice?.(activeTeam.id))) {
    try {
      const fn = window.CDD_FRIENDLY.nextUpcoming(activeTeam.id);
      if (fn) {
        const myName = clubName || 'Mon équipe';
        const isHome = fn.venue === 'H';
        const home = isHome ? myName : (fn.opponent || 'Adversaire');
        const away = isHome ? (fn.opponent || 'Adversaire') : myName;
        // Format date affichage : YYYY-MM-DD → DD/MM/YYYY pour cohérence FFF
        const dDisplay = (() => {
          const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fn.date || '');
          return m ? (m[3] + '/' + m[2] + '/' + m[1]) : (fn.date || '');
        })();
        window.CDD_NEXT_MATCH = {
          id: fn.id,
          date: dDisplay,
          dateISO: fn.date,
          time: fn.time || '',
          home,
          away,
          homeBadge: (home || '?')[0],
          awayBadge: (away || '?')[0],
          opponentName: fn.opponent || 'Adversaire',
          opponentLogo: null,
          myClubName: myName,
          venue: isHome ? 'Domicile' : 'Extérieur',
          competition: 'Match amical',
          isAmical: true,
          daysLeft: 0,
          noUpcoming: false,
        };
      }
    } catch (e) {}
  }

  // Default placeholders — overridden by FFF data
  // Mais on charge tout de suite les matchs arbitrés par le coach (cdd_match_*) pour qu'ils
  // apparaissent immédiatement sur l'accueil, sans attendre la sync FFF.
  const coachFinished = (window.MATCH_HELPERS && window.MATCH_HELPERS.listCoachFinishedMatches)
    ? window.MATCH_HELPERS.listCoachFinishedMatches()
    : [];
  window.CDD_LAST_MATCHES = coachFinished;
  window.CDD_STANDINGS = [];
  window.CDD_TOP_SCORERS = [];

  // ─── Convoc : taille foot amateur, banc strict 3 à 5 (#51) ───
  // 14 par défaut (11 + 3), extensible jusqu'à 16 (11 + 5) via bouton +.
  //
  // SOURCE DE LA COMPO TYPE (priorité décroissante, fix 2026-05-23) :
  //   1. cdd_lineup_template[teamId] — éditée par le coach (Feuille de match)
  //   2. activeTeam.lineupTemplate    — héritée FFF / seed historique
  // Avant le fix, on ne lisait QUE (2), donc les éditions du coach étaient
  // ignorées par CDD_CONVO → le Mode Vestiaire affichait une compo différente
  // de la Feuille de match. Maintenant (1) prend le dessus dès qu'elle existe.
  let lt = activeTeam?.lineupTemplate;
  try {
    const allCoachLineups = JSON.parse(localStorage.getItem('cdd_lineup_template') || '{}');
    const coachLineup = activeTeam?.id ? allCoachLineups[activeTeam.id] : null;
    if (coachLineup && coachLineup.starters && typeof coachLineup.starters === 'object') {
      // starters = map slotIdx → playerId. On la convertit en liste ordonnée
      // par slotIdx (1ère ligne du tableau = défense → milieu → attaque).
      const sortedStarters = Object.keys(coachLineup.starters)
        .map(k => parseInt(k, 10))
        .filter(k => !isNaN(k))
        .sort((a, b) => a - b)
        .map(k => coachLineup.starters[k])
        .filter(Boolean);
      if (sortedStarters.length > 0) {
        lt = {
          ...(lt || {}),
          startersIds: sortedStarters,
          benchIds: Array.isArray(coachLineup.bench) ? coachLineup.bench.slice() : (lt?.benchIds || []),
        };
      }
    }
  } catch (e) { /* fallback silencieux sur activeTeam.lineupTemplate */ }
  // Source de vérité pour le match courant (refonte 2026-05-24) :
  //   Priorité 0 : cdd_match_lineup[teamId][matchId] — compo spatiale du match
  //                (Phase 1B+, éditée via "🎯 Compo du match" depuis Convocations)
  //   Priorité 1 : cdd_match_convoc[teamId][matchId] — ancien overlay (legacy)
  //   Priorité 2 : lt (compo type saison)
  //
  // ⚠️ cdd_match_lineup est désormais la source UNIQUE pour la convocation
  // match : les boutons +/- de Convocations écrivent dedans, le builder le lit.
  // Garantit la cohérence parfaite entre Convocations · Compo du match · Mode Vestiaire.
  const matchId = window.CDD_NEXT_MATCH?.id || 'placeholder';
  let matchLineup = null;
  try {
    const allML = JSON.parse(localStorage.getItem('cdd_match_lineup') || '{}');
    matchLineup = allML[activeTeam?.id]?.[matchId] || null;
  } catch (e) {}
  let overlay = null;
  if (!matchLineup) {
    try {
      const allOv = JSON.parse(localStorage.getItem('cdd_match_convoc') || '{}');
      overlay = allOv[activeTeam?.id]?.[matchId] || null;
    } catch (e) {}
  }
  let effectiveLt;
  if (matchLineup && matchLineup.starters) {
    // cdd_match_lineup : starters est un map slotIdx→pid. Convertir en liste ordonnée.
    const sortedStarters = Object.keys(matchLineup.starters)
      .map(k => parseInt(k, 10)).filter(k => !isNaN(k))
      .sort((a, b) => a - b)
      .map(k => matchLineup.starters[k])
      .filter(Boolean);
    effectiveLt = {
      startersIds: sortedStarters,
      benchIds: Array.isArray(matchLineup.bench) ? matchLineup.bench.slice() : [],
    };
  } else if (overlay) {
    effectiveLt = { startersIds: overlay.startersIds || [], benchIds: overlay.benchIds || [] };
  } else {
    effectiveLt = lt;
  }
  // convocCount : si matchLineup, on respecte EXACTEMENT le banc posé par le coach
  // (11 + bench.length). Sinon, valeur saisie dans les réglages (14 ou 16).
  let convocCount = 14;
  if (matchLineup && Array.isArray(matchLineup.bench)) {
    convocCount = 11 + matchLineup.bench.length;
  } else {
    try {
      const allSet = JSON.parse(localStorage.getItem('cdd_convoc_settings') || '{}');
      const raw = allSet[activeTeam?.id]?.count;
      if (typeof raw === 'number') {
        // #51 — Strict 14 ou 16 (banc 3 ou 5).
        convocCount = raw >= 16 ? 16 : 14;
      }
    } catch (e) {}
  }

  // STATUTS NON-DISPO : 'rest', 'injured', 'suspended'
  const unavailable = new Set(['rest', 'injured', 'suspended']);
  const availablePlayers = players.filter(p => !unavailable.has(p.status));
  const absentPlayers = players.filter(p => unavailable.has(p.status));

  // Helper dédup en gardant l'ordre.
  const dedup = (arr) => { const seen = new Set(); return arr.filter(x => !seen.has(x) && seen.add(x)); };

  // Titulaires : ceux marqués isStarter, dans la limite des dispos.
  // Dédup défensif : si effectiveLt.startersIds contient des doublons (cas legacy
  // ou manipulation manuelle du storage), on les supprime ici.
  let starters = effectiveLt?.startersIds
    ? dedup(effectiveLt.startersIds.filter(id => availablePlayers.some(p => p.id === id)))
    : availablePlayers.filter(p => p.isStarter).slice(0, 11).map(p => p.id);

  // ⚠️ COMPLETER A 11 TITULAIRES : puise dans dispos (banc puis reserve)
  // pour garantir une équipe complète, sinon banc d'origine en priorite.
  const startersSetInit = new Set(starters);
  // 1ere passe : non-reserve
  let fillers = availablePlayers.filter(p =>
    !startersSetInit.has(p.id) && p.status !== 'reserve'
  );
  fillers.sort((a, b) => {
    const aBench = effectiveLt?.benchIds?.includes(a.id) ? 0 : 1;
    const bBench = effectiveLt?.benchIds?.includes(b.id) ? 0 : 1;
    return aBench - bBench;
  });
  while (starters.length < 11 && fillers.length > 0) {
    starters.push(fillers.shift().id);
  }
  // 2eme passe : si encore < 11, puiser dans les reservistes
  if (starters.length < 11) {
    const sNow = new Set(starters);
    const reservistsNow = availablePlayers.filter(p =>
      !sNow.has(p.id) && p.status === 'reserve'
    );
    while (starters.length < 11 && reservistsNow.length > 0) {
      starters.push(reservistsNow.shift().id);
    }
  }

  // Remplaçants : convocCount - starters parmi les dispos restants
  const startersSet = new Set(starters);
  let benchPool = availablePlayers.filter(p => !startersSet.has(p.id) && p.status !== 'reserve');
  // #41 — Si benchPool insuffisant, puiser dans les 'reserve' (joueurs surnumeraires)
  // pour atteindre la taille demandee (ou au moins 3 remplaçants mini).
  // #44 — Banc EXACTEMENT convocCount - 11 (pas de min force). Reste va en reserve.
  let bench;
  if (convocCount === null) {
    // Illimite : tous les dispos non-reserve sur le banc
    bench = benchPool.map(p => p.id);
  } else {
    const benchTarget = Math.max(0, convocCount - starters.length);
    if (benchPool.length < benchTarget) {
      // Pas assez de dispos hors reserve : puiser dans la reserve pour atteindre la cible
      const reservists = availablePlayers.filter(p =>
        !startersSet.has(p.id) && p.status === 'reserve' && !benchPool.some(b => b.id === p.id)
      );
      benchPool = [...benchPool, ...reservists];
    }
    bench = (effectiveLt?.benchIds && effectiveLt.benchIds.length)
      ? dedup(effectiveLt.benchIds.filter(id => benchPool.some(p => p.id === id))).slice(0, benchTarget)
      : benchPool.slice(0, benchTarget).map(p => p.id);
    if (bench.length < benchTarget) {
      const inBench = new Set(bench);
      benchPool.forEach(p => {
        if (bench.length < benchTarget && !inBench.has(p.id)) {
          bench.push(p.id);
          inBench.add(p.id);
        }
      });
    }
    bench = dedup(bench); // sécurité finale
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

  // Joueurs disponibles non convoqués : tout le monde sauf les déjà convoqués
  // et les absents (blessé/suspendu/repos). On INCLUT les joueurs status='reserve'
  // (équipe 2 / dépannage) pour que le coach puisse les piocher pour un match.
  const convocIds = new Set([...starters, ...bench, ...absent.map(a => a.id)]);
  const reserve = players.filter(p =>
    !convocIds.has(p.id) && !unavailable.has(p.status)
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
    matchId,                  // id du match courant (ou 'placeholder' si aucun match)
    hasMatchOverlay: !!matchLineup || !!overlay, // true si la convoc est adaptée pour ce match
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

    const fffMatches = played.slice(0, 99).map(m => ({
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
      matchType: 'championnat',  // FFF -> championnat par définition
      coachArbitrated: false,
    }));
    // Merge avec les matchs arbitrés par le coach (cdd_match_*) : ils prennent priorité
    // sur les matchs FFF du même adversaire (à +/- 2j) car ils contiennent le détail
    // (buteurs, cartons, type) saisi par le coach.
    const coachMatches = (window.MATCH_HELPERS && window.MATCH_HELPERS.listCoachFinishedMatches)
      ? window.MATCH_HELPERS.listCoachFinishedMatches()
      : [];
    const matchesOppDate = (a, b) => {
      const oppMatch = (a.opp || '').toLowerCase() === (b.opp || '').toLowerCase();
      const dateA = a.dateRaw ? new Date(a.dateRaw).getTime() : 0;
      const dateB = b.dateRaw ? new Date(b.dateRaw).getTime() : 0;
      const dateMatch = dateA && dateB && Math.abs(dateA - dateB) < 2 * 86400000;
      return oppMatch && dateMatch;
    };
    const merged = [...coachMatches];
    fffMatches.forEach(f => {
      if (!coachMatches.some(c => matchesOppDate(c, f))) merged.push(f);
    });
    // Tri par date desc, en gardant les sans-date en queue
    merged.sort((a, b) => {
      const dA = a.dateRaw ? new Date(a.dateRaw).getTime() : (a.endedAt || 0);
      const dB = b.dateRaw ? new Date(b.dateRaw).getTime() : (b.endedAt || 0);
      return dB - dA;
    });
    window.CDD_LAST_MATCHES = merged.slice(0, 99);

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

    // Expose la liste des matchs FFF à venir pour le sélecteur multi-matchs
    // (combine ensuite avec les matchs amicaux dans match-switcher.js).
    window.CDD_FFF_UPCOMING = upcoming.slice();
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

      const _isHomeFff = next.venue === 'H';
      window.CDD_NEXT_MATCH = {
        id: `${next.away || 'inconnu'}__${next.dateRaw || next.date || 'sans-date'}`,
        date: isValid ? `${dayLabel} ${dayNum} ${monthLabel}${hour ? ' · ' + hour : ''}` : next.date,
        home: next.home,
        away: next.away,
        homeBadge: next.home[0] || '?',
        awayBadge: next.away[0] || '?',
        // Logos FFF (fournis par fff-fetcher quand l'API DOFA en a). Servent
        // au composant ClubBadge via la prop forceLogo pour afficher le vrai
        // logo de l'adversaire dans les ecrans Prepa / Lecteur / Vote.
        homeLogoDataUrl: next.homeLogo || null,
        awayLogoDataUrl: next.awayLogo || null,
        // Adversaire = celui qui n'est pas nous, calculé selon venue.
        // Évite l'écueil "FCMH vs FCMH" quand on est à l'extérieur.
        opponentName: _isHomeFff ? next.away : next.home,
        opponentLogo: _isHomeFff ? (next.awayLogo || null) : (next.homeLogo || null),
        myClubName: clubName || (_isHomeFff ? next.home : next.away),
        venue: _isHomeFff ? 'Domicile' : 'Extérieur',
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
// #51 — Banc strict : 11 titulaires + 3 à 5 remplaçants (foot amateur). Cap dur 14↔16.
const CONVOC_MIN  = 14; // 11 + 3 (défaut foot amateur)
const CONVOC_MAX  = 16; // 11 + 5 (extension max via bouton +)
const BENCH_MIN   = 3;
const BENCH_MAX   = 5;

// ─── Overlay convoc par match (séparation Compo type ↔ Convocation) ───
// Storage : cdd_match_convoc = { [teamId]: { [matchId]: { startersIds, benchIds, basedOn, createdAt, updatedAt } } }
// Toute modif depuis la page Convocations écrit ici, jamais dans team.lineupTemplate.
function _readMatchConvoc() {
  try { return JSON.parse(localStorage.getItem('cdd_match_convoc') || '{}'); }
  catch (e) { return {}; }
}
function _writeMatchConvoc(all) {
  try { localStorage.setItem('cdd_match_convoc', JSON.stringify(all)); } catch (e) {}
}
function _currentMatchId() {
  return window.CDD_NEXT_MATCH?.id || 'placeholder';
}
function _getTeamTemplate(teamId) {
  // Source de la compo type, priorité décroissante (fix 2026-05-23) :
  //   1. cdd_lineup_template[teamId] — éditée par le coach (Feuille de match)
  //   2. arb_teams[].lineupTemplate   — héritée FFF / seed historique
  // Sans cette priorité, la création d'un overlay de convocation initialise
  // à partir de la lineup FFF — les modifications de compo type du coach
  // sont ignorées → l'écran Convocations affiche une équipe complètement
  // différente la première fois qu'on touche au "-" sur un joueur.
  try {
    const allCoachLineups = JSON.parse(localStorage.getItem('cdd_lineup_template') || '{}');
    const coachLineup = teamId ? allCoachLineups[teamId] : null;
    if (coachLineup && coachLineup.starters && typeof coachLineup.starters === 'object') {
      const sortedStarters = Object.keys(coachLineup.starters)
        .map(k => parseInt(k, 10))
        .filter(k => !isNaN(k))
        .sort((a, b) => a - b)
        .map(k => coachLineup.starters[k])
        .filter(Boolean);
      if (sortedStarters.length > 0) {
        return {
          startersIds: sortedStarters,
          benchIds: Array.isArray(coachLineup.bench) ? coachLineup.bench.slice() : [],
        };
      }
    }
  } catch (e) { /* fallback silencieux sur lineupTemplate FFF */ }
  try {
    const teams = JSON.parse(localStorage.getItem('arb_teams') || '[]');
    const team = teams.find(t => t.id === teamId);
    return team?.lineupTemplate || { startersIds: [], benchIds: [] };
  } catch (e) { return { startersIds: [], benchIds: [] }; }
}
function _ensureOverlay(teamId, matchId) {
  // Crée l'overlay (copie du template) si pas encore présent pour ce (teamId, matchId).
  const all = _readMatchConvoc();
  if (!all[teamId]) all[teamId] = {};
  if (!all[teamId][matchId]) {
    const tpl = _getTeamTemplate(teamId);
    all[teamId][matchId] = {
      startersIds: [...(tpl.startersIds || [])],
      benchIds:    [...(tpl.benchIds    || [])],
      basedOn: 'template',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    _writeMatchConvoc(all);
  }
  return all;
}

// Helpers cdd_match_lineup — source unique pour la convoc/compo du match (2026-05-24).
function _readMatchLineupAll() {
  try { return JSON.parse(localStorage.getItem('cdd_match_lineup') || '{}'); }
  catch (e) { return {}; }
}
function _writeMatchLineup(teamId, matchId, ml) {
  const all = _readMatchLineupAll();
  if (!all[teamId]) all[teamId] = {};
  all[teamId][matchId] = ml;
  try { localStorage.setItem('cdd_match_lineup', JSON.stringify(all)); } catch (e) {}
  // Push cloud fire-and-forget (autres comptes du club voient la maj au prochain pull)
  if (window.cddData?.saveMatchLineup) {
    const activeTeam = window.CDD?.getActiveTeam?.();
    window.cddData.saveMatchLineup(teamId, matchId, ml, activeTeam?.clubId)
      .catch(e => console.warn('[match_lineup] cloud push', e.message));
  }
  // Notifier les autres écrans (compo du match en édition, mode vestiaire)
  try { window.dispatchEvent(new CustomEvent('cdd-data-rebuilt')); } catch (e) {}
}
// Garantit qu'un cdd_match_lineup existe pour (teamId, matchId). Hérite du
// template (compo type) au 1er accès — même logique que ScreenLineup en mode match.
function _ensureMatchLineup(teamId, matchId) {
  const all = _readMatchLineupAll();
  // Helper dédup en gardant l'ordre — défense contre un storage corrompu.
  const dd = (arr) => { const s = new Set(); return arr.filter(x => !s.has(x) && s.add(x)); };
  if (all[teamId] && all[teamId][matchId]) {
    const ml = all[teamId][matchId];
    // Dédup des starters : si un même playerId est posé dans plusieurs slots
    // (ne devrait pas arriver, défense), on garde la 1ère occurrence.
    const cleanStarters = {};
    const seenPids = new Set();
    Object.keys(ml.starters || {})
      .map(k => parseInt(k, 10)).filter(k => !isNaN(k))
      .sort((a, b) => a - b)
      .forEach(k => {
        const pid = ml.starters[k];
        if (pid && !seenPids.has(pid)) {
          cleanStarters[k] = pid;
          seenPids.add(pid);
        }
      });
    return {
      formation: ml.formation || '4-3-3',
      starters: cleanStarters,
      bench:    Array.isArray(ml.bench)   ? dd(ml.bench).filter(id => !seenPids.has(id))   : [],
      reserve:  Array.isArray(ml.reserve) ? dd(ml.reserve).filter(id => !seenPids.has(id)) : [],
      updatedAt: ml.updatedAt,
    };
  }
  // Hériter de la compo type (cdd_lineup_template)
  let formation = '4-3-3';
  let starters = {};
  let bench = [];
  try {
    const allT = JSON.parse(localStorage.getItem('cdd_lineup_template') || '{}');
    const tpl = allT[teamId];
    if (tpl) {
      if (tpl.formation && window.CDD_FORMATIONS?.[tpl.formation]) formation = tpl.formation;
      if (tpl.starters && typeof tpl.starters === 'object') starters = { ...tpl.starters };
      if (Array.isArray(tpl.bench)) bench = [...tpl.bench];
    }
  } catch (e) {}
  // Calculer la réserve = tous les joueurs disponibles non dans starters/bench
  const allPlayers = window.CDD_PLAYERS || [];
  const usedIds = new Set([...Object.values(starters), ...bench]);
  const reserve = allPlayers
    .filter(p => !usedIds.has(p.id) && p.status !== 'reserve' && !['rest','injured','suspended'].includes(p.status))
    .map(p => p.id);
  return { formation, starters, bench, reserve };
}

window.CDD_CONVOC = {
  CONVOC_MIN, CONVOC_MAX, BENCH_MIN, BENCH_MAX,
  setSize(teamId, count) {
    // #51 — Strict 14 ou 16 (banc 3 ou 5). 15 = banc 4 = INVALIDE → snap au plus proche valide.
    const snapped = (typeof count === 'number' && count >= 16) ? 16 : 14;
    try {
      const all = JSON.parse(localStorage.getItem('cdd_convoc_settings') || '{}');
      all[teamId] = { count: snapped, updatedAt: Date.now() };
      localStorage.setItem('cdd_convoc_settings', JSON.stringify(all));
    } catch (e) {}
    if (window.CDD_REBUILD) window.CDD_REBUILD();
  },
  getSize(teamId) {
    try {
      const all = JSON.parse(localStorage.getItem('cdd_convoc_settings') || '{}');
      const raw = all[teamId]?.count;
      if (typeof raw !== 'number') return CONVOC_MIN;
      return raw >= 16 ? 16 : 14; // strict 14 ou 16
    } catch (e) { return CONVOC_MIN; }
  },
  // Indique si une compo de match existe pour le match courant.
  // Vérifie cdd_match_lineup (nouveau) puis cdd_match_convoc (legacy).
  hasOverlay(matchId, teamId) {
    const mid = matchId || _currentMatchId();
    const tid = teamId || window.CDD?.getActiveTeam?.()?.id;
    if (!tid) return false;
    try {
      const allML = JSON.parse(localStorage.getItem('cdd_match_lineup') || '{}');
      if (allML[tid] && allML[tid][mid]) return true;
    } catch (e) {}
    const all = _readMatchConvoc();
    return !!(all[tid] && all[tid][mid]);
  },
  // Réinitialise la convoc/compo du match : supprime cdd_match_lineup ET
  // cdd_match_convoc → on retombe sur la compo type.
  resetToTemplate(matchId, teamId) {
    const mid = matchId || _currentMatchId();
    const tid = teamId || window.CDD?.getActiveTeam?.()?.id;
    if (!tid) return;
    // Supprime cdd_match_lineup (source principale)
    try {
      const allML = JSON.parse(localStorage.getItem('cdd_match_lineup') || '{}');
      if (allML[tid] && allML[tid][mid]) {
        delete allML[tid][mid];
        if (Object.keys(allML[tid]).length === 0) delete allML[tid];
        localStorage.setItem('cdd_match_lineup', JSON.stringify(allML));
        if (window.cddData?.deleteMatchLineup) {
          window.cddData.deleteMatchLineup(tid, mid).catch(e => console.warn('[match_lineup] cloud delete', e.message));
        }
      }
    } catch (e) {}
    // Supprime aussi l'ancien overlay (legacy)
    const all = _readMatchConvoc();
    if (all[tid] && all[tid][mid]) {
      delete all[tid][mid];
      if (Object.keys(all[tid]).length === 0) delete all[tid];
      _writeMatchConvoc(all);
    }
    if (window.CDD_REBUILD) window.CDD_REBUILD();
  },
  // Ajoute un joueur à la convoc en starters ou bench (refonte 2026-05-24).
  // Écrit DIRECTEMENT dans cdd_match_lineup pour garantir la synchro avec
  // l'écran Compo du match et le Mode Vestiaire match.
  addToConvoc(teamId, playerId, slot = 'bench') {
    if (!teamId) return false;
    const matchId = _currentMatchId();
    const ml = _ensureMatchLineup(teamId, matchId);
    // Cap bench=5
    if (slot === 'bench') {
      const benchCountNow = ml.bench.filter(id => id !== playerId).length;
      if (benchCountNow >= BENCH_MAX) {
        try { window.dispatchEvent(new CustomEvent('cdd-bench-full', { detail: { teamId, max: BENCH_MAX } })); } catch (e) {}
        return false;
      }
    }
    // Retirer le joueur de partout (starters slots, bench, reserve)
    const startersKeys = Object.keys(ml.starters);
    for (const k of startersKeys) {
      if (ml.starters[k] === playerId) delete ml.starters[k];
    }
    ml.bench   = ml.bench.filter(id => id !== playerId);
    ml.reserve = ml.reserve.filter(id => id !== playerId);
    // Ajouter dans la cible
    if (slot === 'starter') {
      const slots = (window.CDD_FORMATIONS && window.CDD_FORMATIONS[ml.formation || '4-3-3']) || [];
      for (let i = 0; i < Math.max(slots.length, 11); i++) {
        if (!ml.starters[i]) { ml.starters[i] = playerId; break; }
      }
    } else {
      ml.bench.push(playerId);
    }
    ml.updatedAt = Date.now();
    _writeMatchLineup(teamId, matchId, ml);
    if (window.CDD_REBUILD) window.CDD_REBUILD();
    return true;
  },
  // Retire un joueur de la convoc (starters ou bench) → va en réserve.
  removeFromConvoc(teamId, playerId) {
    if (!teamId) return;
    const matchId = _currentMatchId();
    const ml = _ensureMatchLineup(teamId, matchId);
    const startersKeys = Object.keys(ml.starters);
    for (const k of startersKeys) {
      if (ml.starters[k] === playerId) delete ml.starters[k];
    }
    ml.bench   = ml.bench.filter(id => id !== playerId);
    if (!ml.reserve.includes(playerId)) ml.reserve.push(playerId);
    ml.updatedAt = Date.now();
    _writeMatchLineup(teamId, matchId, ml);
    if (window.CDD_REBUILD) window.CDD_REBUILD();
  },
};

// Expose
window.CDD_REBUILD = rebuildCDDGlobals;
// Helper texte : normalise une chaîne pour comparaison insensible aux accents
// et à la casse. "Léonis" et "leonis" deviennent tous les deux "leonis".
// Évite que la recherche échoue quand l'utilisateur oublie un accent.
function deburr(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
window.CDD_HELPERS = { normalizePosition, deriveRarity, deriveStats, resolvePhoto, buildViewPlayer, deburr };

// Auto-rebuild on club/team change
window.addEventListener('cdd-active-club-changed', rebuildCDDGlobals);
window.addEventListener('cdd-active-team-changed', rebuildCDDGlobals);
// Match amical créé/modifié/supprimé → on rebuild CDD_NEXT_MATCH si concerné.
window.addEventListener('cdd-friendly-changed', rebuildCDDGlobals);
// Match actif changé via le sélecteur → rebuild.
window.addEventListener('cdd-active-match-changed', rebuildCDDGlobals);

// Initial build (sync)
if (window.CDD && window.CDD.getActiveClub) {
  rebuildCDDGlobals();
}
