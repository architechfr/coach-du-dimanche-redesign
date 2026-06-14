/* global React, CDD */

/* ============================================================
   COACH DU DIMANCHE — Data Bridge
   Wraps real CDD adapter into the UI's expected globals.
   ============================================================ */

// ─── Helper : équipe adulte ou mineurs ? ─────────────────────
// Détermine si une équipe est composée d'adultes (Sénior, Vétérans 35+,
// Loisirs) ou de mineurs (U6→U17, Football d'Animation, etc.). Sert à
// adapter le copy : "parents" pour les mineurs, "joueurs" pour les adultes.
//
// Heuristique sur team.category puis team.name :
//   • U<n> avec n ≤ 18 → mineurs
//   • Mots-clés "sénior", "vétéran", "loisir", "+35/+40/...", "35 ans" → adultes
//   • Défaut : mineurs (texte "parents" reste valable comme aujourd'hui)
function isAdultTeam(team) {
  const txt = ((team && (team.category || '')) + ' ' + (team && team.name || '')).toLowerCase();
  if (!txt.trim()) return false;
  // U13, U15, U17, U18 etc. → mineurs (sauf U19+ qui sont déjà adultes côté FFF)
  const youthMatch = txt.match(/\bu\s*(\d{1,2})\b/);
  if (youthMatch) {
    const n = parseInt(youthMatch[1], 10);
    if (n <= 18) return false;
  }
  // Mots-clés adultes
  if (/\b(s[eé]nior|v[eé]t[eé]ran|loisir|amateur)/i.test(txt)) return true;
  if (/\+\s*(3[05]|4[05]|5[05]|60)/i.test(txt)) return true;
  if (/\b(3[05]|4[05]|5[05]|60)\s*ans\b/i.test(txt)) return true;
  // Football d'animation = U6→U11
  if (/\bf\.?\s*a\.?\b|animation/i.test(txt)) return false;
  return false; // défaut prudent : enfants (texte "parents" inchangé)
}

// Helper raccourci : récupère l'équipe active et teste.
function activeTeamIsAdult() {
  try {
    const t = (window.CDD && window.CDD.getActiveTeam && window.CDD.getActiveTeam()) || null;
    return isAdultTeam(t);
  } catch (e) { return false; }
}

window.CDD_TEAM_HELPERS = { isAdultTeam, activeTeamIsAdult };

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

// Photos USDF Vétérans (import PDF licences FFF) — dossier dédié, routées par nom de fichier.
var CDD_USDF_PHOTOS = {"AFROUNE_Karim.jpg":1,"AMANDE_Bruno.jpg":1,"AROUSSI_Djamel.jpg":1,"ASNOUN_Dan.jpg":1,"BEN-ZAIED_Nasreddine.jpg":1,"BOITELET_Julien.jpg":1,"BRUNAUD_Pascal.jpg":1,"BUTIN_David.jpg":1,"CAMARA_Abdoulaye.jpg":1,"CARLOSSE-VRIENS_Mickael.jpg":1,"CHEGHANNOU_Sami.jpg":1,"CHEN_Yongchuan.jpg":1,"DA-SILVA_Mike.jpg":1,"DELPLACE_David.jpg":1,"DUSSAUSSAY_Yannis.jpg":1,"GOMEZ_Marc.jpg":1,"GOURTI_Mohamed.jpg":1,"HEBERT_Thomas.jpg":1,"HYZY_Cedric.jpg":1,"ILLARI_Romain.jpg":1,"JACQUES_Alexandre.jpg":1,"JARRET_Guillaume.jpg":1,"KEWERKOPF_Arnaud.jpg":1,"LAPORT_Miguel.jpg":1,"LAURENT_Franck.jpg":1,"MARTELO-SILVA-DOS-SA_Joao.jpg":1,"MELLOT_Flavien.jpg":1,"MERIC_Charles.jpg":1,"MERIC_Guillaume.jpg":1,"MOUSSET_Remy.jpg":1,"NDIAYE_Ousmane.jpg":1,"NGUON_Laurent.jpg":1,"PASSE_Corentin.jpg":1,"PREVOST_Cedric.jpg":1,"RIBEIRO-MACHADO_Philippe.jpg":1,"RJILI_Ridha.jpg":1,"ROUSSELAT_Rodolphe.jpg":1,"SADDIK_Jonayd.jpg":1,"TATOT_Jeremy.jpg":1};

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
  if (CDD_USDF_PHOTOS[file]) return `assets/photos_USDF_Veteran_2025-2026/${file}`;
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

/* ═══════════════════════════════════════════════════════════════
   AGRÉGATEUR DE STATS MATCH — source unique (FIX 2026-06-14)
   ═══════════════════════════════════════════════════════════════
   AVANT : applyRealStats() et buildTopScorers() lisaient `arb_m`
   (store legacy souvent vide) avec les mauvais noms de champs
   (`m.events`, `e.type==='goal'`, `e.assistId`). Or un but réel est
   stocké dans `m.ev[]` sous la forme
       { tp:'goal', t:'A'|'B', scorer, scorerId, passer, ... }
   et un carton sous { tp:'yellow'|'red', t, pl }. Résultat : l'onglet
   Buteurs restait VIDE et les stats des cartes joueur à 0.

   Désormais : un seul agrégateur scanne les matchs arbitrés TERMINÉS
   (cdd_match_*, comme listCoachFinishedMatches), côté A (notre équipe),
   bucketé par compétition (championnat/coupe vs amical/entraînement),
   en respectant club/équipe actifs + pierres tombales.
   ═══════════════════════════════════════════════════════════════ */

// Résout un label d'événement ("#7 Romain", "Romain D.") vers un playerId.
// Les buts portent un scorerId stable, mais les PASSEURS et les CARTONS ne
// sont stockés qu'en label → on les rattache par numéro+prénom puis prénom.
function _makeLabelResolver(players) {
  const norm = s => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const map = {};
  (players || []).forEach(p => {
    if (!p || !p.first) return;
    const add = (key) => { const k = norm(key); if (k && !(k in map)) map[k] = p.id; };
    if (p.num != null) add('#' + p.num + ' ' + p.first);
    add(p.first);
    if (p.last) { add(p.first + ' ' + p.last); add(p.first + ' ' + p.last[0]); }
  });
  return (label) => {
    if (!label) return null;
    const raw = norm(label);
    if (map[raw]) return map[raw];
    const stripped = norm(String(label).replace(/^#\d+\s*/, ''));
    return map[stripped] || null;
  };
}

// Agrège but / passe décisive / cartons / matchs joués par joueur depuis les
// matchs arbitrés terminés. Retourne { [pid]: { goalsChamp, assistsChamp,
// goalsAmical, assistsAmical, yellow, red, matchesPlayed, mins } }.
function aggregateTeamMatchStats(players) {
  const out = {};
  const resolve = _makeLabelResolver(players);
  const playerById = {};
  (players || []).forEach(p => { if (p && p.id) playerById[p.id] = p; });
  const playerIds = new Set(Object.keys(playerById));
  const cleanLabel = s => String(s || '').replace(/^#\d+\s*/, '').trim();

  // Identité stable d'un buteur/passeur : son playerId si on a pu le rattacher
  // à l'effectif, SINON son label nettoyé (cas joueur ponctuel / invité non
  // inscrit). Ainsi TOUT buteur apparaît au classement, exactement comme dans
  // "Derniers matchs", au lieu d'être silencieusement ignoré.
  const ensure = (id, label) => {
    const cl = cleanLabel(label);
    const key = id ? ('id:' + id) : (cl ? 'lbl:' + cl.toLowerCase() : null);
    if (!key) return null;
    if (!out[key]) {
      const p = id ? playerById[id] : null;
      out[key] = {
        key, playerId: id || null,
        name: p ? `${p.first} ${p.last || ''}`.trim() : (cl || 'Joueur'),
        first: p ? (p.first || '') : (cl || ''),
        last: p ? (p.last || '') : '',
        photo: p ? (p.photo || null) : null,
        goalsChamp: 0, assistsChamp: 0, goalsAmical: 0, assistsAmical: 0,
        yellow: 0, red: 0, matchesPlayed: 0, mins: 0,
      };
    }
    return out[key];
  };

  let activeClub = null, activeTeam = null;
  try {
    const ctx = JSON.parse(localStorage.getItem('cdd_active_context') || '{}');
    activeClub = ctx.clubId || localStorage.getItem('arb_current_club');
    activeTeam = ctx.teamId;
  } catch (e) {}

  const SKIP = new Set([
    'cdd_match_current', 'cdd_match_last_finished', 'cdd_match_lineup',
    'cdd_match_convoc', 'cdd_match_info', 'cdd_match_jersey_numbers',
  ]);
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith('cdd_match_') || SKIP.has(k)) continue;
      let m = null;
      try { m = JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { continue; }
      if (!m || (m.st !== 'finished' && !m.endedAt)) continue;
      if (window.CDD_FRIENDLY && window.CDD_FRIENDLY.isTombstoned && window.CDD_FRIENDLY.isTombstoned(m.id)) continue;
      if (activeClub && m.clubId !== activeClub) continue;
      if (activeTeam && m.tmId && m.tmId !== activeTeam) continue;

      const champ = (m.matchType === 'championnat' || m.matchType === 'coupe');
      const playedKeys = new Set();
      // Roster de NOTRE équipe (côté A) pour compter les matchs joués.
      const roster = [].concat((m.tA && m.tA.p) || [], (m.tA && m.tA.bench) || []);
      roster.forEach(pp => {
        const pid = (pp && (pp.id || pp.pid)) || pp;
        if (playerIds.has(pid)) { const b = ensure(pid, null); if (b) playedKeys.add(b.key); }
      });
      (m.ev || []).forEach(e => {
        if (!e || e.t !== 'A') return; // uniquement les events de notre équipe
        if (e.tp === 'goal') {
          const sid = e.scorerId || resolve(e.scorer || e.pl);
          const b = ensure(sid, e.scorer || e.pl);
          if (b) { if (champ) b.goalsChamp++; else b.goalsAmical++; playedKeys.add(b.key); }
          if (e.passer) {
            const aid = resolve(e.passer);
            const ab = ensure(aid, e.passer);
            if (ab) { if (champ) ab.assistsChamp++; else ab.assistsAmical++; playedKeys.add(ab.key); }
          }
        } else if (e.tp === 'yellow') {
          const yb = ensure(e.scorerId || resolve(e.pl), e.pl);
          if (yb) { yb.yellow++; playedKeys.add(yb.key); }
        } else if (e.tp === 'red') {
          const rb = ensure(e.scorerId || resolve(e.pl), e.pl);
          if (rb) { rb.red++; playedKeys.add(rb.key); }
        }
      });
      playedKeys.forEach(key => { if (out[key]) { out[key].matchesPlayed++; out[key].mins += 90; } });
    }
  } catch (e) {}
  return out;
}

// ─── Applique les vraies stats joueur (mute `players` en place) ───
// goals/assists/yellow/red/mins/matchesPlayed depuis l'agrégateur unique.
// Sans matchs arbitrés, tout reste à 0 (pas de fausse data).
function applyRealStats(players) {
  const agg = aggregateTeamMatchStats(players);
  const byId = {};
  players.forEach(p => { byId[p.id] = p; });
  // agg est indexé par identité (id: ou lbl:) ; on n'applique qu'aux entrées
  // rattachées à un vrai joueur de l'effectif (les buteurs ponctuels n'ont pas
  // de carte joueur à muter, mais comptent quand même au classement buteurs).
  Object.keys(agg).forEach(key => {
    const b = agg[key];
    const p = b.playerId ? byId[b.playerId] : null;
    if (!p) return;
    p.goals         = (p.goals || 0)         + b.goalsChamp + b.goalsAmical;
    p.assists       = (p.assists || 0)       + b.assistsChamp + b.assistsAmical;
    p.yellow        = (p.yellow || 0)        + b.yellow;
    p.red           = (p.red || 0)           + b.red;
    p.matchesPlayed = (p.matchesPlayed || 0) + b.matchesPlayed;
    p.mins          = (p.mins || 0)          + b.mins;
  });
  // Forme simple : 6 + (buts/match)*4 − (cartons/match)*2
  players.forEach(p => {
    if (!p.matchesPlayed) { p.form = 0; return; }
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
  // Classement buteurs + passeurs, depuis l'agrégateur unique (cdd_match_*).
  // Chaque ligne porte les compteurs SÉPARÉS par compétition (champ vs amical)
  // pour que l'onglet Buteurs puisse filtrer Tout / Championnat / Amical.
  function buildTopScorers(teamPlayers) {
    const agg = aggregateTeamMatchStats(teamPlayers);

    const rows = Object.keys(agg)
      .map(key => {
        const b = agg[key];
        const goals = b.goalsChamp + b.goalsAmical;
        const assists = b.assistsChamp + b.assistsAmical;
        return {
          playerId: b.playerId || key, // clé stable pour React (id ou lbl:)
          name: b.name,
          first: b.first, last: b.last, photo: b.photo,
          goals, assists,
          goalsChamp: b.goalsChamp, assistsChamp: b.assistsChamp,
          goalsAmical: b.goalsAmical, assistsAmical: b.assistsAmical,
          // 'me' = rattaché à l'effectif (surlignage). Les ponctuels = false.
          me: !!b.playerId,
        };
      })
      // On garde aussi les passeurs sans but (les passes décisives t'intéressent).
      .filter(r => r.goals > 0 || r.assists > 0)
      .sort((a, b) => (b.goals - a.goals) || (b.assists - a.assists))
      .map((r, i) => ({ ...r, rank: i + 1 }));

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
  // Compat double-clé : seed local utilise `fff`, cloud sync écrit `fffConfig`.
  // Sans ce fallback, AUCUN user cloud ne voit ses stats championnat.
  const fffCfg = activeTeam?.fff || activeTeam?.fffConfig || null;
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
  // Si le match précédemment retenu est en réalité TERMINÉ (cdd_match_last_finished
  // pointe sur lui), on ne le préserve PAS → laisse le placeholder noUpcoming
  // prendre le relais. Sans ce check, le match fini restait coincé en "prochain match"
  // tant qu'un autre match ne venait pas le remplacer (bug remonté Florian 27/05).
  const _lastFinishedIdGate = (() => {
    try { return localStorage.getItem('cdd_match_last_finished') || null; }
    catch (e) { return null; }
  })();
  // ⚠ Garde "même équipe" : si l'utilisateur a changé d'équipe active, le
  // CDD_NEXT_MATCH précédent appartenait à l'AUTRE équipe et ne doit PAS
  // être préservé. Sans ce check, un amical créé pour USDF apparaissait
  // dans l'écran de préparation de FCMH (bug remonté Florian 26/05/2026).
  const _activeTeamIdGate = activeTeam?.id || null;
  const _prevTeamMatches = !prevNext
                         || !prevNext.teamId
                         || prevNext.teamId === _activeTeamIdGate;
  const hasRealNext = prevNext
    && _prevTeamMatches
    && !prevNext.noUpcoming
    && prevNext.away
    && prevNext.away !== 'À déterminer'
    && (!_lastFinishedIdGate || prevNext.id !== _lastFinishedIdGate);
  window.CDD_NEXT_MATCH = hasRealNext ? prevNext : {
    // ⚠ id sûr pour Firestore : les ids encadrés par '__..__' sont RÉSERVÉS et
    // refusés à l'écriture. Ne jamais revenir à '__placeholder__'.
    id: 'placeholder',
    teamId: _activeTeamIdGate, // ← traçabilité : à quelle équipe ce match appartient
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
          teamId: activeTeam.id, // ← traçabilité équipe (anti cross-team)
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
          teamId: activeTeam.id, // ← traçabilité équipe (anti cross-team)
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

  // ⚠️ AUTO-COMPLÉTION à 11 titulaires — UNIQUEMENT si pas de matchLineup
  // posé manuellement par le coach. Sinon on respecte SES choix : s'il a
  // retiré un titulaire, on accepte la convoc à 10 (à lui de remplir).
  // Sans ce check, retirer un titulaire le ré-ajoutait silencieusement via
  // un joueur du banc → "impossible de supprimer", "banc plein figé".
  const _coachHasSetLineup = !!(matchLineup && matchLineup.starters);
  if (!_coachHasSetLineup) {
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
  }

  // Remplaçants : convocCount - starters parmi les dispos restants
  const startersSet = new Set(starters);
  let benchPool = availablePlayers.filter(p => !startersSet.has(p.id) && p.status !== 'reserve');
  let bench;
  if (_coachHasSetLineup) {
    // RESPECT du choix coach : on prend EXACTEMENT le bench posé, sans
    // auto-complétion. Si le coach veut un banc à 4, il aura 4 — pas
    // d'injection automatique d'un 5ème depuis la réserve.
    bench = (effectiveLt?.benchIds && effectiveLt.benchIds.length)
      ? dedup(effectiveLt.benchIds.filter(id => availablePlayers.some(p => p.id === id)))
      : [];
  } else if (convocCount === null) {
    // Illimite : tous les dispos non-reserve sur le banc
    bench = benchPool.map(p => p.id);
  } else {
    // Pas de matchLineup : auto-completion classique à convocCount - 11
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

  // ─── ASYNC cloud refresh "Derniers matchs" (fix cross-device 2026-05-26) ───
  // Fire-and-forget : récupère les matchs finis du club depuis Firestore et
  // met à jour CDD_LAST_MATCHES. Le React re-render via cdd-data-rebuilt.
  // Pas bloquant pour le rendu initial localStorage.
  try { _triggerCloudLastMatchesRefresh(); } catch (e) {}

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
  // Stratégie de matching "notre équipe dans le classement / calendrier FFF" :
  //   • PRIORITÉ : par cl_no (= fffCfg.clubId) — universel, marche pour tous
  //     les clubs indépendamment de leur nom local. Exemple : "USDF 35 ans +"
  //     en local vs "FERRIERES BRIE USD" côté FFF → seul le cl_no=500466
  //     identifie de façon fiable.
  //   • FALLBACK : matching textuel via myTeamName (souvent en échec quand
  //     le nom local diffère du short_name FFF).
  const myTeamName = fffCfg.myTeamName || clubName;
  const matchOpts = { myTeamName, myClubId: fffCfg.clubId || null };

  const [rankRes, matchRes] = await Promise.allSettled([
    window.CDD_FFF.getRanking(fffCfg, { force: window.CDD_FFF_FORCE_REFRESH }),
    window.CDD_FFF.getMatches(fffCfg, { force: window.CDD_FFF_FORCE_REFRESH }),
  ]);
  window.CDD_FFF_FORCE_REFRESH = false;
  window.CDD_FFF_LOADING = false;

  // Standings
  if (rankRes.status === 'fulfilled' && rankRes.value.ok && rankRes.value.data.length > 0) {
    const standings = rankRes.value.data.map((r,i) =>
      window.CDD_FFF.normalizeRankRow(r, i, matchOpts));
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
      .map(m => window.CDD_FFF.normalizeMatchRow(m, matchOpts))
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

    // Filtre le match qui vient d'être TERMINÉ : sans cette exclusion, un
    // match FFF du jour terminé en fin de matinée continuait à apparaître
    // "À VENIR" sur l'Accueil et Convocations jusqu'au lendemain.
    const _lastFinishedId = (() => {
      try { return localStorage.getItem('cdd_match_last_finished') || null; }
      catch (e) { return null; }
    })();
    let upcomingFiltered = upcoming.slice();
    if (_lastFinishedId) {
      upcomingFiltered = upcomingFiltered.filter(m => {
        const id = `${m.away || 'inconnu'}__${m.dateRaw || m.date || 'sans-date'}`;
        return id !== _lastFinishedId;
      });
    }

    // ── ANTI-MATCH-FANTÔME FFF (Bug Bussy → "? VS USDF · Dim. 12 Oct · 02h00") ──
    // DOFA remonte parfois des matchs de la SAISON PROCHAINE avec :
    //   - adversaire non résolu ("?", "À déterminer", vide)
    //   - heure = 02h00 = artefact UTC midnight (la FFF stocke 00:00 UTC, JS
    //     l'affiche en CEST = 02h00) → indicateur fiable de date placeholder
    //   - date à >60 jours dans le futur (= prochaine saison vs match du jour)
    // Ces matchs polluaient le hero "Prochain match" après un amical terminé :
    // au lieu de noUpcoming, l'app affichait ce fantôme avec adversaire "?".
    const FUTURE_HORIZON_MS = 60 * 24 * 60 * 60 * 1000; // 60 jours
    const _isUnresolvedName = (n) => {
      const v = (n || '').trim();
      return !v || v === '?' || /^(à déterminer|tbd|n\/a|inconnu)$/i.test(v);
    };
    const _isSuspiciousFFFMatch = (m) => {
      if (!m) return true;
      // ⚠ Bug fix v136 : avant on testait UNIQUEMENT m.away, mais quand on
      // joue à l'extérieur l'adversaire est m.home (m.away = notre équipe).
      // Donc on teste les DEUX côtés : si l'un OU l'autre est unresolved,
      // le match est forcément un placeholder calendrier prévisionnel.
      if (_isUnresolvedName(m.home) || _isUnresolvedName(m.away)) {
        return true;
      }
      // Date suspecte (trop loin = saison prochaine)
      const d = new Date(m.dateRaw);
      if (isNaN(d)) return false; // on ne juge pas une date qu'on n'arrive pas à parser
      const diffMs = d.getTime() - Date.now();
      if (diffMs > FUTURE_HORIZON_MS) return true;
      // Heure 02h00 ou 00h00 = artefact UTC midnight (date sans heure renseignée)
      // Critère : si l'heure tombe pile sur 02h00 OU 00h00 ET qu'on est à >7 jours,
      // c'est très probablement une date placeholder du calendrier prévisionnel.
      const h = d.getHours();
      const mn = d.getMinutes();
      if ((h === 2 || h === 0) && mn === 0 && diffMs > 7 * 24 * 60 * 60 * 1000) {
        return true;
      }
      return false;
    };
    const _beforeSuspFilter = upcomingFiltered.length;
    upcomingFiltered = upcomingFiltered.filter(m => !_isSuspiciousFFFMatch(m));
    if (_beforeSuspFilter !== upcomingFiltered.length) {
      console.log(`[FFF] anti-fantôme : ${_beforeSuspFilter - upcomingFiltered.length} match(s) FFF suspect(s) filtré(s) (saison prochaine, adversaire ?, heure 02h00…)`);
    }

    // Expose la liste des matchs FFF à venir pour le sélecteur multi-matchs
    // (combine ensuite avec les matchs amicaux dans match-switcher.js).
    window.CDD_FFF_UPCOMING = upcomingFiltered.slice();

    // ⚠ ANTI-RÉGRESSION (bug 26/05/2026) : avant d'écraser CDD_NEXT_MATCH
    // avec le premier match FFF, on vérifie via le switcher quel est le
    // VRAI prochain match (FFF + amicaux fusionnés, triés par date). Sans
    // ce check, un match FFF d'octobre écrasait un amical du soir même.
    const _activeTeamForNext = (window.CDD?.getActiveTeam?.()?.id) || null;
    const _mergedNext = (_activeTeamForNext && window.CDD_MATCH_SWITCHER?.getActive)
      ? window.CDD_MATCH_SWITCHER.getActive(_activeTeamForNext)
      : null;
    if (_mergedNext && _mergedNext.kind === 'amical') {
      // Un amical est plus proche / explicitement choisi → ne PAS écraser.
      // CDD_NEXT_MATCH a déjà été posé sur l'amical par rebuildCDDGlobals
      // (branche amical fallback ou explicit choice).
      console.log('[FFF] amical plus proche que le prochain FFF → on garde l\'amical comme prochain match');
    } else if (upcomingFiltered.length > 0) {
      const next = upcomingFiltered[0];
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
        teamId: _activeTeamForNext, // ← traçabilité équipe (anti cross-team)
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

// ─── Refresh "Derniers matchs" depuis Firestore (fix cross-device 2026-05-26) ───
// Sans ce refresh, l'historique vient uniquement du localStorage de chaque device
// → PC et téléphone divergent (PC voit Bussy 2-1+1-0, téléphone voit 4-3).
//
// Stratégie : merge SANS PERTE
//   1. Cloud items (Firestore, multi-device fiables) — priorité
//   2. Local items absents du cloud (préserve les anciens matchs sans clubId)
//   3. FFF items (championnat, jamais en cloud) — préservés
// + backfill opportuniste : les local-only matchs sont ré-uploadés au cloud
// avec leur clubId, pour devenir visibles cross-device au refresh suivant.

function _cloudDocToLastMatchItem(d) {
  if (!d || !d.id) return null;
  const sA = (d.teamA && d.teamA.score) || 0;
  const sB = (d.teamB && d.teamB.score) || 0;
  const result = sA > sB ? 'W' : sA < sB ? 'L' : 'D';
  const endedAt = d.endedAt
    || (d.savedAt && d.savedAt.toMillis ? d.savedAt.toMillis() : 0);
  const date = endedAt
    ? new Date(endedAt).toLocaleDateString('fr-FR', { day:'numeric', month:'short' })
    : '?';
  const scorers = (d.events || [])
    .filter(e => e && e.t === 'A' && e.tp === 'goal')
    .map(e => (e.scorer || e.pl || '').replace(/^#\d+\s*/, ''))
    .filter(Boolean);
  let venue = '?';
  if (d.isAtHome === true)  venue = 'H';
  if (d.isAtHome === false) venue = 'E';
  if (venue === '?' && d.scheduledMatchId) {
    try {
      const allFm = JSON.parse(localStorage.getItem('cdd_friendly_matches') || '{}');
      for (const tid in allFm) {
        const fm = (allFm[tid] || []).find(f => f && f.id === d.scheduledMatchId);
        if (fm) {
          const v = fm.venue;
          if (v === 'H' || v === 'Domicile')  venue = 'H';
          if (v === 'E' || v === 'Extérieur') venue = 'E';
          break;
        }
      }
    } catch (e) {}
  }
  return {
    id: d.id,
    date,
    dateRaw: endedAt ? new Date(endedAt).toISOString() : null,
    endedAt,
    opp:  (d.teamB && d.teamB.n) || 'Adversaire',
    home: (d.teamA && d.teamA.n) || 'Mon équipe',
    away: (d.teamB && d.teamB.n) || 'Adversaire',
    venue,
    score: [sA, sB],
    result,
    journee: null,
    forfeit: false,
    played: true,
    scorers,
    matchType: d.matchType || 'amical',
    coachArbitrated: true,
  };
}

let _lastCloudLastMatchesRefreshAt = 0;
let _cloudLastMatchesRefreshInFlight = false;

async function _triggerCloudLastMatchesRefresh() {
  // Debounce : si CDD_REBUILD est appelé en rafale (login, snapshot, pullCloudData)
  // on n'envoie qu'1 seule requête Firestore par 200ms.
  const now = Date.now();
  if (_cloudLastMatchesRefreshInFlight) return;
  if (now - _lastCloudLastMatchesRefreshAt < 200) return;
  _lastCloudLastMatchesRefreshAt = now;
  _cloudLastMatchesRefreshInFlight = true;
  try {
    const ctx = (() => {
      try { return JSON.parse(localStorage.getItem('cdd_active_context') || '{}'); }
      catch (e) { return {}; }
    })();
    const clubId = ctx.clubId || localStorage.getItem('arb_current_club');
    if (!clubId) return;
    if (!window.cddData || !window.cddData.fetchFinishedMatches) return;

    const cloudDocs = await window.cddData.fetchFinishedMatches(clubId, 30);
    if (cloudDocs === null) {
      // Offline / erreur : on garde silencieusement le cache localStorage.
      console.log('[lastMatches] cloud indisponible — fallback localStorage');
      return;
    }
    const cloudItems = cloudDocs.map(_cloudDocToLastMatchItem).filter(Boolean);
    const cloudIds = new Set(cloudItems.map(m => m.id));

    // Merge sans perte (cloud + local-only + FFF), tri date desc, cap 99.
    const current = Array.isArray(window.CDD_LAST_MATCHES) ? window.CDD_LAST_MATCHES : [];
    const localMatches = (window.MATCH_HELPERS && window.MATCH_HELPERS.listCoachFinishedMatches)
      ? window.MATCH_HELPERS.listCoachFinishedMatches()
      : [];
    const localOnly = localMatches.filter(m => m && !cloudIds.has(m.id));
    const fffOnly   = current.filter(m => m && m.coachArbitrated === false);
    const merged = [...cloudItems, ...localOnly, ...fffOnly]
      .sort((a, b) => {
        const dA = a.dateRaw ? new Date(a.dateRaw).getTime() : (a.endedAt || 0);
        const dB = b.dateRaw ? new Date(b.dateRaw).getTime() : (b.endedAt || 0);
        return dB - dA;
      })
      .slice(0, 99);
    window.CDD_LAST_MATCHES = merged;
    console.log('[lastMatches] ✓ cloud:', cloudItems.length,
      '· local-only:', localOnly.length, '· FFF:', fffOnly.length);
    window.dispatchEvent(new CustomEvent('cdd-data-rebuilt'));

    // ─── ASTUCE CROISÉE (fix 2026-05-26 idée Florian) ─────────────────────
    // Garde-fou : si un match cloud terminé référence un amical via
    // scheduledMatchId, on marque CET amical comme terminé localement
    // même si le sync direct de endedAt a échoué (cas le plus fréquent du
    // bug "Prochain match qui réapparaît alors qu'il est joué").
    //
    // C'est une double protection : on n'est plus dépendant uniquement du
    // champ endedAt poussé par saveFriendlyMatch (qui peut louper si le
    // device origine était offline au moment de la fin de match).
    try {
      if (window.CDD_FRIENDLY && window.CDD_FRIENDLY.markEnded) {
        let marked = 0;
        const allFm = (() => {
          try { return JSON.parse(localStorage.getItem('cdd_friendly_matches') || '{}'); }
          catch (e) { return {}; }
        })();
        cloudDocs.forEach(d => {
          const schedId = d && d.scheduledMatchId;
          if (!schedId || !String(schedId).startsWith('fr_')) return;
          // Cherche cet amical dans le local
          for (const tid in allFm) {
            const fm = (allFm[tid] || []).find(f => f && f.id === schedId);
            if (fm && typeof fm.endedAt !== 'number') {
              window.CDD_FRIENDLY.markEnded(tid, schedId);
              marked++;
              break;
            }
          }
        });
        if (marked) console.log('[lastMatches] ↻ amicaux marqués terminés via scheduledMatchId :', marked);
      }
    } catch (e) { console.warn('[lastMatches] cross-mark endedAt', e.message); }

    // ─── Backfill opportuniste : ré-uploade les matchs locaux absents du cloud,
    // pour qu'ils soient visibles cross-device au prochain refresh.
    // Limite 10/cycle pour ne pas spammer Firestore au login.
    const toBackfill = localOnly.slice(0, 10);
    if (toBackfill.length
        && window.MATCH_HELPERS && window.MATCH_HELPERS.loadMatch
        && window.cddSync && window.cddSync.saveMatchToCloud) {
      let backfilled = 0;
      for (const item of toBackfill) {
        try {
          const M = window.MATCH_HELPERS.loadMatch(item.id);
          if (!M) continue;
          // Sécurité : si le match legacy n'avait pas de cloisonnement, on
          // pose le club/team actif AVANT push (sinon il n'apparaîtra pas dans
          // la query où clubId == activeClub).
          if (!M.clubId) M.clubId = String(clubId);
          if (!M.tmId && ctx.teamId) M.tmId = String(ctx.teamId);
          await window.cddSync.saveMatchToCloud(M);
          backfilled++;
        } catch (e) { /* silencieux : 1 match raté ne casse pas le batch */ }
      }
      if (backfilled) console.log('[lastMatches] ↑ backfill cloud :',
        backfilled, '/', toBackfill.length, 'anciens matchs migrés');
    }
  } catch (e) {
    console.warn('[lastMatches] refresh failed', e.message);
  } finally {
    _cloudLastMatchesRefreshInFlight = false;
  }
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
  // Échange explicite de 2 joueurs dans la convoc. Le coach choisit qui
  // descend et qui monte → pas de promotion automatique surprise.
  // Cas gérés :
  //  - out=titulaire, in=remplaçant   → in monte titulaire, out descend banc
  //  - out=titulaire, in=réserve      → in monte titulaire, out part en réserve
  //  - out=remplaçant, in=réserve     → in monte banc, out part en réserve
  //  - out=remplaçant, in=titulaire   → swap (rare mais cohérent)
  swapPlayers(teamId, outPid, inPid) {
    if (!teamId || !outPid || !inPid || outPid === inPid) return false;
    const matchId = _currentMatchId();
    const ml = _ensureMatchLineup(teamId, matchId);
    // Position actuelle de out
    let outSlot = null;
    for (const k of Object.keys(ml.starters)) {
      if (ml.starters[k] === outPid) { outSlot = k; break; }
    }
    const outInBench   = ml.bench.indexOf(outPid);
    const outInReserve = ml.reserve.indexOf(outPid);
    // Position actuelle de in
    let inSlot = null;
    for (const k of Object.keys(ml.starters)) {
      if (ml.starters[k] === inPid) { inSlot = k; break; }
    }
    const inInBench   = ml.bench.indexOf(inPid);
    const inInReserve = ml.reserve.indexOf(inPid);

    if (outSlot !== null && inInBench >= 0) {
      // titulaire ↔ remplaçant
      ml.starters[outSlot] = inPid;
      ml.bench[inInBench]  = outPid;
    } else if (outSlot !== null && inInReserve >= 0) {
      // titulaire ↔ réserve
      ml.starters[outSlot] = inPid;
      ml.reserve.splice(inInReserve, 1);
      if (!ml.reserve.includes(outPid)) ml.reserve.push(outPid);
    } else if (outInBench >= 0 && inInReserve >= 0) {
      // remplaçant ↔ réserve
      ml.bench[outInBench] = inPid;
      ml.reserve.splice(inInReserve, 1);
      if (!ml.reserve.includes(outPid)) ml.reserve.push(outPid);
    } else if (outInBench >= 0 && inSlot !== null) {
      // remplaçant ↔ titulaire (symétrique)
      ml.starters[inSlot] = outPid;
      ml.bench[outInBench] = inPid;
    } else {
      console.warn('[CDD_CONVOC.swapPlayers] cas non géré',
        { outPid, inPid, outSlot, outInBench, outInReserve, inSlot, inInBench, inInReserve });
      return false;
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
