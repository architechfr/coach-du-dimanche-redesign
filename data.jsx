/* global window */
/* ============================================================
   COACH DU DIMANCHE — Mock data (rooted in real U15 squad)
   ============================================================ */

// Color palette per position (for FUT card accents)
const POS_COLOR = {
  GK:  "#f5c451",
  DC:  "#3b82f6",
  DG:  "#3b82f6",
  DD:  "#3b82f6",
  ML:  "#22c55e",
  MD:  "#22c55e",
  MC:  "#22c55e",
  MOC: "#22c55e",
  AG:  "#ef4444",
  AD:  "#ef4444",
  BU:  "#ef4444",
  ATT: "#ef4444",
};

const CLUB = {
  name: "FC MAGNY LE HONGRE",
  short: "FCMH",
  team: "U15 D1",
  season: "2025–2026",
  colors: ["#c8f169", "#0a0e14"],
  league: "U15 Phase 1 — Poule B",
  rank: 2,
  played: 8,
  W: 6, D: 1, L: 1,
  gf: 24, ga: 9,
  pts: 19,
  form: ["W","W","D","W","W","L","W","W"], // most recent right
  coach: "Florian C.",
  badgeHue: 92,
};

// Quick helper to fabricate FUT-card stats from a few key attrs
const mkStats = (PAC, SHO, PAS, DRI, DEF, PHY) => ({
  PAC, SHO, PAS, DRI, DEF, PHY,
  ovr: Math.round((PAC + SHO + PAS + DRI + DEF + PHY) / 6),
});

const PLAYERS = [
  // GK
  { id:"p01", num:1,  first:"Aaron",       last:"HAMDAOUI",     pos:"GK",  age:14, foot:"D", height:178, stats:mkStats(58,32,55,52,72,80), rarity:"gold",   form:8, fitness:96, mins:720, goals:0, assists:0, yellow:0, red:0, mvp:1, photo:"assets/photos_U15_2025-2026/HAMDAOUI_Aaron.jpg", license:"9602349950" },
  { id:"p02", num:16, first:"Clément",     last:"HESS",         pos:"GK",  age:13, foot:"D", height:172, stats:mkStats(56,28,52,50,70,72), rarity:"silver", form:6, fitness:90, mins:180, goals:0, assists:0, yellow:0, red:0, mvp:0, photo:"assets/photos_U15_2025-2026/HESS_Clement.jpg", license:"9602800618" },

  // DC / DG / DD
  { id:"p03", num:4,  first:"Mamadou",     last:"BAMBA",        pos:"DC",  age:14, foot:"D", height:182, stats:mkStats(72,42,66,64,84,86), rarity:"gold",   form:9, fitness:94, mins:720, goals:1, assists:0, yellow:2, red:0, mvp:2, photo:"assets/photos_U15_2025-2026/BAMBA_Mamadou.jpg", license:"2548487476" },
  { id:"p04", num:5,  first:"Sirianho",    last:"ANTANSO",      pos:"DC",  age:14, foot:"G", height:178, stats:mkStats(70,40,68,62,82,84), rarity:"gold",   form:8, fitness:88, mins:680, goals:0, assists:1, yellow:1, red:0, mvp:0, photo:"assets/photos_U15_2025-2026/ANTANSO_Sirianho.jpg", license:"9602358829" },
  { id:"p05", num:3,  first:"Jayden",      last:"ARAQUE",       pos:"DG",  age:13, foot:"G", height:170, stats:mkStats(82,52,72,76,76,72), rarity:"gold",   form:7, fitness:92, mins:540, goals:2, assists:3, yellow:0, red:0, mvp:1, photo:"assets/photos_U15_2025-2026/ARAQUE_Jayden.jpg", license:"9603670549" },
  { id:"p06", num:2,  first:"Adam",        last:"BENAHMED-HUGO",pos:"DD",  age:14, foot:"D", height:174, stats:mkStats(78,50,70,74,78,74), rarity:"gold",   form:8, fitness:90, mins:560, goals:1, assists:2, yellow:1, red:0, mvp:0, photo:"assets/photos_U15_2025-2026/BENAHMED-HUGO_Adam.jpg", license:"9604642066" },
  { id:"p07", num:14, first:"Romain",      last:"DEFORGE",      pos:"DC",  age:13, foot:"D", height:170, stats:mkStats(66,38,62,60,78,76), rarity:"silver", form:6, fitness:85, mins:280, goals:0, assists:0, yellow:0, red:0, mvp:0, photo:"assets/photos_U15_2025-2026/DEFORGE_Romain.jpg", license:"9602504075" },

  // Milieux
  { id:"p08", num:6,  first:"Mehdi",       last:"ACHIR",        pos:"MC",  age:14, foot:"D", height:172, stats:mkStats(82,72,86,84,68,72), rarity:"icon",   form:10,fitness:98, mins:720, goals:4, assists:6, yellow:1, red:0, mvp:3, photo:"assets/photos_U15_2025-2026/ACHIR_Mehdi.jpg", license:"9602395442" },
  { id:"p09", num:8,  first:"Shahine",     last:"AID",          pos:"MC",  age:14, foot:"G", height:170, stats:mkStats(80,68,82,82,66,70), rarity:"gold",   form:9, fitness:95, mins:720, goals:3, assists:5, yellow:2, red:0, mvp:2, photo:"assets/photos_U15_2025-2026/AID_Shahine.jpg", license:"2548265255" },
  { id:"p10", num:10, first:"Sékou",       last:"DOUMBIA",      pos:"MOC", age:14, foot:"D", height:168, stats:mkStats(86,80,84,90,58,68), rarity:"icon",   form:9, fitness:96, mins:700, goals:6, assists:7, yellow:1, red:0, mvp:4, photo:"assets/photos_U15_2025-2026/DOUMBIA_Sekou.jpg", license:"9602191711" },
  { id:"p11", num:18, first:"Yanis",       last:"HANNACHI",     pos:"ML",  age:14, foot:"G", height:165, stats:mkStats(86,68,76,84,62,64), rarity:"gold",   form:8, fitness:92, mins:540, goals:2, assists:4, yellow:0, red:0, mvp:1, photo:"assets/photos_U15_2025-2026/HANNACHI_Yanis.jpg", license:"9602435411" },
  { id:"p12", num:17, first:"Kais",        last:"IZEBATENE",    pos:"MD",  age:13, foot:"D", height:166, stats:mkStats(84,62,74,82,64,62), rarity:"gold",   form:7, fitness:90, mins:500, goals:1, assists:3, yellow:1, red:0, mvp:0, photo:"assets/photos_U15_2025-2026/IZEBATENE_Kais.jpg", license:"9602486440" },
  { id:"p13", num:15, first:"Léonis",      last:"CLARISSE",     pos:"MC",  age:13, foot:"D", height:168, stats:mkStats(72,62,76,76,64,68), rarity:"silver", form:7, fitness:88, mins:360, goals:1, assists:2, yellow:0, red:0, mvp:0, photo:"assets/photos_U15_2025-2026/CLARISSE_Leonis.jpg", license:"2547992637" },

  // Attaquants
  { id:"p14", num:9,  first:"Nayel",       last:"DAOUDA",       pos:"BU",  age:14, foot:"D", height:175, stats:mkStats(90,88,76,86,52,72), rarity:"totw",   form:10,fitness:98, mins:720, goals:11,assists:4, yellow:0, red:0, mvp:5, photo:"assets/photos_U15_2025-2026/DAOUDA_Nayel.jpg", license:"9602549171" },
  { id:"p15", num:7,  first:"Elias",       last:"GAUTHIER",     pos:"AD",  age:14, foot:"D", height:170, stats:mkStats(92,76,72,90,50,64), rarity:"gold",   form:9, fitness:94, mins:660, goals:5, assists:6, yellow:1, red:0, mvp:2, photo:"assets/photos_U15_2025-2026/GAUTHIER_Elias.jpg", license:"9602405067" },
  { id:"p16", num:11, first:"Marley",      last:"BOUBOUR",      pos:"AG",  age:13, foot:"G", height:168, stats:mkStats(88,72,70,88,48,60), rarity:"gold",   form:8, fitness:93, mins:580, goals:4, assists:5, yellow:0, red:0, mvp:2, photo:"assets/photos_U15_2025-2026/BOUBOUR_Marley.jpg", license:"9605206126" },
  { id:"p17", num:19, first:"Evan",        last:"LEROUX",       pos:"BU",  age:13, foot:"D", height:168, stats:mkStats(82,76,68,78,46,62), rarity:"silver", form:7, fitness:88, mins:340, goals:3, assists:1, yellow:0, red:0, mvp:1, photo:"assets/photos_U15_2025-2026/LEROUX_Evan.jpg", license:"9602976567" },
  { id:"p18", num:20, first:"Aymen",       last:"ATIA",         pos:"AD",  age:13, foot:"D", height:167, stats:mkStats(84,66,66,80,46,58), rarity:"silver", form:6, fitness:84, mins:240, goals:1, assists:2, yellow:0, red:0, mvp:0, photo:"assets/photos_U15_2025-2026/ATIA_Aymen.jpg", license:"9604504634" },
];

const FORMATIONS = {
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
  "3-5-2": [
    { pos:"GK",  x:50, y:92 },
    { pos:"DC",  x:24, y:76 }, { pos:"DC", x:50, y:78 }, { pos:"DC", x:76, y:76 },
    { pos:"ML",  x:12, y:52 }, { pos:"MC", x:32, y:56 }, { pos:"MC", x:50, y:50 }, { pos:"MC", x:68, y:56 }, { pos:"MD", x:88, y:52 },
    { pos:"BU",  x:36, y:22 }, { pos:"BU", x:64, y:22 },
  ],
};

const NEXT_MATCH = {
  date: "Dim. 24 Mai · 10h30",
  home: "FCMH",
  away: "FC PONTOISE",
  homeBadge: "92",
  awayBadge: "200",
  venue: "Stade Marcel-Cerdan",
  weather: "16°C · Soleil",
  competition: "Championnat U15 D1",
  daysLeft: 4,
};

const LIVE_MATCH = {
  minute: 67,
  half: 2,
  home: "FCMH", homeScore: 2,
  away: "FC PONTOISE", awayScore: 1,
  events: [
    { min: 12, type:"goal",   side:"home", player:"Nayel DAOUDA", desc:"Tête sur centre",   assist:"E. Gauthier" },
    { min: 23, type:"yellow", side:"away", player:"M. Diallo",     desc:"Tacle en retard" },
    { min: 38, type:"goal",   side:"away", player:"L. Petit",      desc:"Frappe enroulée hors surface" },
    { min: 45, type:"half",   side:"-",    player:"",               desc:"Mi-temps · 1-1" },
    { min: 52, type:"sub",    side:"home", player:"Romain DEFORGE", desc:"Entre · sort Hess", on:"R. Deforge", off:"C. Hess" },
    { min: 58, type:"goal",   side:"home", player:"Sékou DOUMBIA",  desc:"Coup-franc direct",  assist:"M. Achir" },
    { min: 64, type:"yellow", side:"home", player:"S. Aid",         desc:"Contestation" },
  ],
  poss: 58,
  shots: [9, 6],
  onTarget: [5, 3],
  corners: [4, 3],
  fouls: [7, 11],
};

const LAST_MATCHES = [
  { date:"17/05", opp:"FC HOUILLES",       venue:"H", score:[3,1], result:"W", scorers:["Daouda (2)", "Doumbia"] },
  { date:"10/05", opp:"AS POISSY",         venue:"E", score:[2,2], result:"D", scorers:["Gauthier", "Achir"] },
  { date:"03/05", opp:"PSG U15 RÉG.",      venue:"H", score:[1,3], result:"L", scorers:["Doumbia"] },
  { date:"26/04", opp:"CERGY-PONTOISE",    venue:"E", score:[4,0], result:"W", scorers:["Daouda (2)", "Boubour", "Hannachi"] },
  { date:"19/04", opp:"VAUREAL FC",        venue:"H", score:[2,0], result:"W", scorers:["Achir", "Daouda"] },
];

const STANDINGS = [
  { rank:1, club:"PSG U15 RÉG.",    pl:8, w:7, d:1, l:0, gf:28, ga:6,  pts:22, form:["W","W","W","D","W","W","W","W"], hi: true },
  { rank:2, club:"FCMH",        pl:8, w:6, d:1, l:1, gf:24, ga:9,  pts:19, form:["W","W","D","W","W","L","W","W"], me: true },
  { rank:3, club:"FC PONTOISE",     pl:8, w:5, d:2, l:1, gf:21, ga:11, pts:17, form:["W","D","W","W","D","W","L","W"] },
  { rank:4, club:"AS POISSY",       pl:8, w:4, d:2, l:2, gf:16, ga:13, pts:14, form:["L","D","W","W","D","L","W","W"] },
  { rank:5, club:"CERGY-PONT.",     pl:8, w:3, d:2, l:3, gf:14, ga:15, pts:11, form:["D","L","W","W","D","L","W","L"] },
  { rank:6, club:"VAUREAL FC",      pl:8, w:2, d:3, l:3, gf:11, ga:15, pts:9,  form:["L","D","W","D","L","D","W","L"] },
  { rank:7, club:"FC HOUILLES",     pl:8, w:2, d:1, l:5, gf:9,  ga:18, pts:7,  form:["L","L","W","D","L","W","L","L"] },
  { rank:8, club:"ÉCQUEVILLY US",   pl:8, w:0, d:2, l:6, gf:5,  ga:21, pts:2,  form:["L","D","L","L","L","L","D","L"] },
];

const TOP_SCORERS = [
  { name:"Nayel DAOUDA",   club:"FCMH",    goals:11, rank:1, me:true },
  { name:"M. Cherif",       club:"PSG U15 RÉG.",goals:9,  rank:2 },
  { name:"A. Lopez",        club:"AS POISSY",   goals:7,  rank:3 },
  { name:"Sékou DOUMBIA",   club:"FCMH",    goals:6,  rank:4, me:true },
  { name:"L. Petit",        club:"FC PONTOISE", goals:5,  rank:5 },
  { name:"Elias GAUTHIER",  club:"FCMH",    goals:5,  rank:6, me:true },
];

// Convocation pre-set
const CONVO = {
  match: NEXT_MATCH,
  starters: ["p01","p06","p03","p04","p05","p08","p10","p09","p15","p14","p16"],
  bench:    ["p02","p07","p11","p12","p17"],
  absent:   [
    { id:"p18", reason:"Blessure", note:"Cheville droite · 2 sem." },
    { id:"p13", reason:"Indispo",  note:"Mariage cousine" },
  ],
  shareCode: "AS-MAGNY-U15-#0524",
};

// Speaker/coach notes for player observations (used by fiche)
const OBSERVATIONS = {
  p10: [
    { date:"17/05", tag:"Match", txt:"Énorme match — 1 but, 2 passes. Discipline tactique top niveau." },
    { date:"10/05", tag:"Match", txt:"Très bon premier acte, baisse de rythme après l'heure de jeu." },
    { date:"08/05", tag:"Training", txt:"Travail spécifique sur frappes hors surface — gros progrès." },
  ],
  p14: [
    { date:"17/05", tag:"Match", txt:"Doublé de buts dont une tête splendide. Pressing exemplaire." },
  ],
  p08: [
    { date:"17/05", tag:"Match", txt:"Carton jaune évitable. Sinon, distribution propre." },
  ],
};

// Expose everything globally for component scripts
Object.assign(window, {
  CDD_CLUB: CLUB,
  CDD_PLAYERS: PLAYERS,
  CDD_FORMATIONS: FORMATIONS,
  CDD_NEXT_MATCH: NEXT_MATCH,
  CDD_LIVE_MATCH: LIVE_MATCH,
  CDD_LAST_MATCHES: LAST_MATCHES,
  CDD_STANDINGS: STANDINGS,
  CDD_TOP_SCORERS: TOP_SCORERS,
  CDD_CONVO: CONVO,
  CDD_OBSERVATIONS: OBSERVATIONS,
  CDD_POS_COLOR: POS_COLOR,
});
