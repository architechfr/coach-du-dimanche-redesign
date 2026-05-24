/* global React, CDD_PLAYERS, CDD_CLUB, POSITION_LABEL */

/* ============================================================
   MATCH LIVE — full arbitrage flow
   Inspired by Coach du Dimanche v43.x — luxe FIFA UI +
   real M.ev source-of-truth + 4-modal goal flow + auto 2e
   yellow → red + fullscreen card overlay + sub flow + ht/end.
   ============================================================ */

// (React hooks aliases retirés — match-engine est pure JS, pas React)

// ─── Sounds (cheap Web Audio API beeps, no asset deps) ──
const _ac = () => {
  try {
    if (!window.__ml_ac) window.__ml_ac = new (window.AudioContext || window.webkitAudioContext)();
    if (window.__ml_ac.state === 'suspended') window.__ml_ac.resume();
    return window.__ml_ac;
  } catch (e) { return null; }
};
function _beep(freq=440, dur=0.18, type='sine', vol=0.18) {
  const ac = _ac(); if (!ac) return;
  const o = ac.createOscillator(); const g = ac.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0, ac.currentTime);
  g.gain.linearRampToValueAtTime(vol, ac.currentTime + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
  o.connect(g); g.connect(ac.destination);
  o.start(); o.stop(ac.currentTime + dur);
}
const playWhistle = () => { _beep(2200, .15, 'square'); setTimeout(()=>_beep(2400, .12, 'square'), 100); };
const playGoal    = () => { _beep(523, .12); setTimeout(()=>_beep(659, .12), 120); setTimeout(()=>_beep(784, .25), 240); };
const playCard    = () => { _beep(330, .12, 'square'); };
const playBuzzer  = () => { _beep(180, .3, 'sawtooth', .24); setTimeout(()=>_beep(150, .4, 'sawtooth', .24), 300); };
const vibrate = (ms) => { try { navigator.vibrate?.(ms); } catch(e) {} };

// ─── Match state — single source of truth, persisted ──────
function loadMatch(id) {
  try { return JSON.parse(localStorage.getItem('cdd_match_'+id) || 'null'); }
  catch (e) { return null; }
}
function saveMatch(M) {
  try { localStorage.setItem('cdd_match_'+M.id, JSON.stringify(M)); } catch (e) {}
}
function newMatch(tA, tB, cfg = {}) {
  // Cloisonnement #20 : tag le match avec le club et l'equipe active
  let clubId = null, tmId = null;
  try {
    const ctx = JSON.parse(localStorage.getItem('cdd_active_context') || '{}');
    clubId = ctx.clubId || localStorage.getItem('arb_current_club');
    tmId = ctx.teamId;
  } catch (e) {}
  return {
    id: 'm_' + Date.now().toString(36),
    st: 'paused', notStarted: true,
    tSt: null, tOff: 0,
    htStart: null, htDur: cfg.htd || 15,
    ch: 1,
    cfg: { hs: cfg.hs||2, hd: cfg.hd||45, htd: cfg.htd||15, nt: cfg.nt||11, ms: cfg.ms||5 },
    tA, tB,
    sA: 0, sB: 0,
    yA: 0, yB: 0,
    rA: 0, rB: 0,
    uA: 0, uB: 0,
    ev: [],
    // #20 cloisonnement
    clubId,
    tmId,
    startedAt: null,
    savedAt: null,
    endedAt: null,
    // #36 tracking temps pause
    pauseStartedAt: null,    // timestamp ms du dernier passage en pause
    pauseTotalMs: 0,         // somme cumulee de toutes les pauses
    inHalftime: false,       // true entre fin de mi-temps N et reprise mi-temps N+1
  };
}

// Build default teams from la vraie compo : convocation match si dispo,
// sinon compo type (cdd_lineup_template), sinon fallback isStarter.
function buildDefaultTeams() {
  const players = window.CDD_PLAYERS || [];
  const club = window.CDD_CLUB || {};
  const byId = (id) => players.find(p => p.id === id);
  const toToken = (p, onField) => ({
    num: p.num, first: p.first, last: p.last, id: p.id, onField,
  });

  let starters = null, bench = null;

  // Priorité 0 (Phase 1E) : cdd_match_lineup[teamId][matchId] — compo de
  // match posée depuis la page Convocations. Prend le dessus sur la compo
  // type et sur CDD_CONVO : c'est la intention explicite du coach pour CE match.
  try {
    const activeTeam = window.CDD?.getActiveTeam?.();
    const matchId = (window.CDD_NEXT_MATCH && window.CDD_NEXT_MATCH.id) || 'placeholder';
    if (activeTeam) {
      const allM = JSON.parse(localStorage.getItem('cdd_match_lineup') || '{}');
      const ml = allM[activeTeam.id]?.[matchId];
      if (ml && ml.starters) {
        const idsInOrder = Object.keys(ml.starters).sort((a,b) => +a - +b).map(k => ml.starters[k]);
        const matchStarters = idsInOrder.map(byId).filter(Boolean);
        if (matchStarters.length > 0) {
          starters = matchStarters;
          bench    = (ml.bench || []).map(byId).filter(Boolean);
        }
      }
    }
  } catch (e) {}

  // Priorité 1 : CDD_CONVO (overlay convocation match, calculé par data-bridge)
  const conv = window.CDD_CONVO;
  if ((!starters || starters.length === 0) && conv && Array.isArray(conv.starters) && conv.starters.length > 0) {
    starters = conv.starters.map(byId).filter(Boolean);
    bench    = (conv.bench || []).map(byId).filter(Boolean);
  }

  // Priorité 2 : cdd_lineup_template (compo type sauvée par le coach)
  if (!starters || starters.length === 0) {
    try {
      const activeTeam = window.CDD?.getActiveTeam?.();
      const all = JSON.parse(localStorage.getItem('cdd_lineup_template') || '{}');
      const s = activeTeam && all[activeTeam.id];
      if (s && s.starters) {
        const idsInOrder = Object.keys(s.starters).sort((a,b) => +a - +b).map(k => s.starters[k]);
        starters = idsInOrder.map(byId).filter(Boolean);
        bench    = (s.bench || []).map(byId).filter(Boolean);
      }
    } catch (e) {}
  }

  // Priorité 3 (fallback) : isStarter + premiers dispo en banc
  if (!starters || starters.length === 0) {
    starters = players.filter(p => p.isStarter).slice(0, 11);
    bench    = players.filter(p => !p.isStarter && p.status !== 'reserve').slice(0, 5);
  }

  return {
    tA: {
      n: club.short || club.name || 'Mon équipe',
      c: club.colors?.[0] || '#c8f169',
      c2: club.colors?.[1] || '#000000',
      logoDataUrl: club.logoDataUrl || null,
      p:     starters.map(p => toToken(p, true)),
      bench: (bench || []).map(p => toToken(p, false)),
    },
    tB: {
      n: 'Adversaire',
      c: '#3b82f6',
      c2: '#ffffff',
      logoDataUrl: null,
      p: Array.from({length:11}, (_,i) => ({ num: i+1, first: '', last: '#'+(i+1), id: 'b_'+i, onField: true })),
      bench: Array.from({length:5}, (_,i) => ({ num: 12+i, first: '', last: '#'+(12+i), id: 'b_'+(11+i), onField: false })),
    }
  };
}

// Chrono helpers
function gMatch(M) {
  if (!M) return 0;
  return M.st === 'live' ? M.tOff + (Date.now() - M.tSt) : M.tOff;
}
function gMin(M) {
  if (!M) return 0;
  return (M.ch - 1) * M.cfg.hd + Math.floor(gMatch(M) / 60000);
}
function fmtTime(ms) {
  const s = Math.floor(ms/1000);
  return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
}

// #36 — Temps de pause cumule (pauseStartedAt + pauseTotalMs)
function gPauseMs(M) {
  if (!M) return 0;
  let t = M.pauseTotalMs || 0;
  if (M.pauseStartedAt) t += Date.now() - M.pauseStartedAt;
  return t;
}
// Temps reel ecoule depuis le coup d'envoi (jeu + pauses)
function gRealMs(M) {
  if (!M || !M.startedAt) return 0;
  if (M.endedAt) return M.endedAt - M.startedAt;
  return Date.now() - M.startedAt;
}
// Format MM:SS pour affichage chrono arbitre
function fmtMMSS(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
// Vrai si on est entre 2 mi-temps (pause halftime, pas pause normale)
function isInHalftime(M) {
  return !!(M && M.inHalftime && M.st === 'paused' && !M.notStarted && M.ch < M.cfg.hs);
}

// Format réglementaire de la minute d'un évènement.
// Mn = minute cumulée depuis le coup d'envoi (gMin), ch = période où l'event a eu lieu.
//   Période 1 normale (mn <= hd)      → "12'"
//   Période 1 additionnelle (mn > hd) → "45 + 2'"
//   Période 2 normale (mn <= 2*hd)    → "47'", "78'"
//   Période 2 additionnelle           → "90 + 4'"
// Pour les events anciens sans champ ch : on infère depuis la minute.
function fmtMatchMinute(mn, ch, cfg) {
  const hd = (cfg && cfg.hd) || 45;
  const hs = (cfg && cfg.hs) || 2;
  let period = ch;
  if (period == null) {
    period = Math.min(hs, Math.max(1, Math.ceil((mn || 0) / hd)));
  }
  const periodEnd = hd * period;
  if (mn <= periodEnd) return `${mn}'`;
  return `${periodEnd} + ${mn - periodEnd}'`;
}

// Player helpers
function isPlayerOut(M, t, playerLabel) {
  return M.ev.some(e => e.t === t && e.tp === 'red' && e.pl === playerLabel);
}
function getYellowsForPlayer(M, t, playerLabel) {
  return M.ev.filter(e => e.t === t && e.tp === 'yellow' && e.pl === playerLabel).length;
}
function playerLabel(p) {
  return '#'+p.num+(p.first ? ' '+p.first : '');
}

// ─── Wake lock (empêche l'écran de s'éteindre pendant le match) ───
let _wakeLock = null;
async function requestWakeLock() {
  try {
    if (!('wakeLock' in navigator)) return false;
    _wakeLock = await navigator.wakeLock.request('screen');
    _wakeLock.addEventListener('release', () => { _wakeLock = null; });
    return true;
  } catch (e) {
    console.warn('[match] wakeLock failed:', e);
    return false;
  }
}
async function releaseWakeLock() {
  try {
    if (_wakeLock) { await _wakeLock.release(); _wakeLock = null; }
  } catch (e) {}
}

// ─── Plein écran (immersion match) ───
function goFullscreen(elem) {
  const el = elem || document.documentElement;
  try {
    if (el.requestFullscreen) return el.requestFullscreen();
    if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
    if (el.msRequestFullscreen) return el.msRequestFullscreen();
  } catch (e) { console.warn('[match] fullscreen failed:', e); }
}
function exitFullscreen() {
  try {
    if (document.exitFullscreen) return document.exitFullscreen();
    if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
  } catch (e) {}
}

// ─── Audio silence loop (iOS coupe le son sinon — V1 startAS) ───
let _silenceAudio = null;
function startSilenceLoop() {
  try {
    if (_silenceAudio) return;
    // Loop d'1s d'audio silencieux pour garder le canal audio iOS actif
    const ac = _ac(); if (!ac) return;
    const buf = ac.createBuffer(1, ac.sampleRate * 1, ac.sampleRate);
    const src = ac.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const g = ac.createGain();
    g.gain.value = 0.00001; // quasi-silence mais audio actif
    src.connect(g); g.connect(ac.destination);
    src.start();
    _silenceAudio = src;
  } catch (e) { console.warn('[match] silence loop failed:', e); }
}
function stopSilenceLoop() {
  try { if (_silenceAudio) { _silenceAudio.stop(); _silenceAudio = null; } } catch (e) {}
}

// ─── Temps additionnel ───
function addAT(M, minutes) {
  if (!M || M.notStarted || M.st === 'finished') return;
  M.at = (M.at || 0) + minutes;
  M.ev.push({ tp: 'at', mn: gMin(M), ts: Date.now(), val: minutes, ch: M.ch });
}

// ─── Setup adversaire ───
function setOpponent(M, name, color, opts = {}) {
  if (!M) return;
  M.tB.n = name || M.tB.n;
  M.tB.c = color || M.tB.c;
  // 2e couleur (bicolore) — via opts.color2 ou string secondaire
  if (opts.color2) M.tB.c2 = opts.color2;
  if (opts.players && Array.isArray(opts.players)) {
    M.tB.p = opts.players.slice(0, 11).map((nm, i) => ({
      num: i + 1, first: '', last: nm || '#' + (i+1), id: 'b_' + i, onField: true,
    }));
  }
}

// ─── Marquer un joueur blessé pendant le match ───
function setInjured(M, side, playerId) {
  if (!M) return;
  const team = side === 'A' ? M.tA : M.tB;
  const p = (team.p || []).find(x => x.id === playerId) || (team.bench || []).find(x => x.id === playerId);
  if (p) {
    p.injured = true;
    M.ev.push({
      tp: 'injury', mn: gMin(M), ts: Date.now(), t: side,
      pl: playerLabel(p), playerId: p.id,
    });
  }
}

// ─── Vibreur 2'30 avant fin (chkAlerts V1) ───
// Appelée par le screen toutes les secondes — déclenche les alertes
const _alertsFired = new WeakMap();
function checkAlerts(M, onAlert) {
  if (!M || M.notStarted || M.st !== 'live') return;
  const fired = _alertsFired.get(M) || {};
  const elapsedMs = gMatch(M);
  const halfMs = M.cfg.hd * 60 * 1000; // durée d'une mi-temps
  const remainMs = halfMs - elapsedMs;
  // 2'30 avant fin
  if (!fired['ah_'+M.ch] && remainMs > 0 && remainMs <= 150000) {
    fired['ah_'+M.ch] = true;
    vibrate([200, 100, 200]);
    if (onAlert) onAlert({ kind: 'before-end', remainMs });
  }
  // Fin officielle dépassée
  if (!fired['end_'+M.ch] && remainMs <= 0 && elapsedMs > halfMs - 1000) {
    fired['end_'+M.ch] = true;
    playBuzzer();
    vibrate([300, 200, 300, 200, 300]);
    if (onAlert) onAlert({ kind: 'time-up' });
  }
  _alertsFired.set(M, fired);
}

// ─── Recuperer un match en cours pour reprise (#20) ───
// Cherche un match dont st !== 'finished' && !notStarted dans le localStorage.
// Filtre par club actif si dispo.
function getLiveMatch() {
  try {
    // SOURCE DE VÉRITÉ : cdd_match_current. Ce pointeur est positionné par startMatch()
    // (et UNIQUEMENT par startMatch — pas par le bootstrap d'écran). Il est retiré
    // par endMatch(). Donc s'il existe et pointe sur un match valide, c'est qu'on a
    // un match VRAIMENT en cours. Pas de scan magique de tout le localStorage.
    const ABANDON_MS = 6 * 60 * 60 * 1000;
    const now = Date.now();
    const currentId = localStorage.getItem('cdd_match_current');
    if (!currentId) return null;
    const m = loadMatch(currentId);
    if (!m) {
      // Pointeur stale (match supprimé) → on nettoie pour la prochaine fois
      try { localStorage.removeItem('cdd_match_current'); } catch (e) {}
      return null;
    }
    if (m.notStarted || m.st === 'finished' || m.endedAt) {
      // Incohérent : on nettoie le pointeur (cas d'un bug passé qui aurait pollué)
      try { localStorage.removeItem('cdd_match_current'); } catch (e) {}
      return null;
    }
    const lastTouched = m.savedAt || m.tSt || 0;
    if (lastTouched && (now - lastTouched) > ABANDON_MS) {
      // Match abandonné depuis > 6h → on considère qu'il est mort
      try { localStorage.removeItem('cdd_match_current'); } catch (e) {}
      return null;
    }
    // Filtre par club actif
    const activeClub = JSON.parse(localStorage.getItem('cdd_active_context') || '{}').clubId
                     || localStorage.getItem('arb_current_club');
    if (activeClub && m.clubId && m.clubId !== activeClub) return null;
    return m;
  } catch (e) { return null; }
}

// ─── Liste des matchs ARBITRÉS et TERMINÉS du coach ───
// Scanne cdd_match_* pour récupérer tous les matchs finis (st === 'finished').
// Retourne dans le format attendu par CDD_LAST_MATCHES (utilisé par l'écran Accueil).
// Le type de match (championnat / amical / coupe / etc.) est inclus pour l'affichage.
function listCoachFinishedMatches() {
  try {
    const activeClub = JSON.parse(localStorage.getItem('cdd_active_context') || '{}').clubId
                     || localStorage.getItem('arb_current_club');
    const markerKeys = new Set(['cdd_match_current', 'cdd_match_last_finished']);
    const matches = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith('cdd_match_') || markerKeys.has(k)) continue;
      try {
        const m = JSON.parse(localStorage.getItem(k) || 'null');
        if (!m || (m.st !== 'finished' && !m.endedAt)) continue;
        if (activeClub && m.clubId && m.clubId !== activeClub) continue;
        const sA = m.sA || 0, sB = m.sB || 0;
        const result = sA > sB ? 'V' : sA < sB ? 'D' : 'N';
        const endedAt = m.endedAt || m.savedAt || 0;
        const date = endedAt
          ? new Date(endedAt).toLocaleDateString('fr-FR', { day:'numeric', month:'short' })
          : '?';
        // Buteurs équipe A (mon équipe) — formaté pour l'aperçu
        const scorers = (m.ev || [])
          .filter(e => e.t === 'A' && e.tp === 'goal')
          .map(e => (e.scorer || e.pl || '').replace(/^#\d+\s*/, ''))
          .filter(Boolean);
        matches.push({
          id: m.id,
          date,
          dateRaw: endedAt ? new Date(endedAt).toISOString() : null,
          endedAt,
          opp: m.tB?.n || 'Adversaire',
          home: m.tA?.n || 'Mon équipe',
          away: m.tB?.n || 'Adversaire',
          venue: '?',
          score: [sA, sB],
          result,
          journee: null,
          forfeit: false,
          played: true,
          scorers,
          matchType: m.matchType || 'amical',
          coachArbitrated: true,    // flag pour distinguer des matchs FFF officiels
        });
      } catch (e) {}
    }
    // Tri du plus récent au plus ancien
    matches.sort((a, b) => (b.endedAt || 0) - (a.endedAt || 0));
    return matches;
  } catch (e) { return []; }
}

// ─── Calculer les exploits joueurs depuis M.ev (#19) ───
// doubles, triples (hat-tricks), sortie blanche pour le gardien.
function computeExploits(M) {
  if (!M || !M.ev) return { goals: {}, assists: {}, yellows: {}, reds: {}, mvp: null, hatTricks: [], doubles: [], cleanSheet: false };
  const goals = {};
  const assists = {};
  const yellows = {};
  const reds = {};
  const mins = {};
  M.ev.forEach(e => {
    if (!e || !e.t) return;
    if (e.t !== 'A') return; // mon equipe seulement
    if (e.tp === 'goal'   && e.pl) goals[e.pl] = (goals[e.pl] || 0) + 1;
    if (e.tp === 'goal'   && e.passer) assists[e.passer] = (assists[e.passer] || 0) + 1;
    if (e.tp === 'yellow' && e.pl) yellows[e.pl] = (yellows[e.pl] || 0) + 1;
    if (e.tp === 'red'    && e.pl) reds[e.pl] = (reds[e.pl] || 0) + 1;
  });
  const hatTricks = Object.keys(goals).filter(p => goals[p] >= 3);
  const doubles   = Object.keys(goals).filter(p => goals[p] === 2);
  const cleanSheet = (M.sB || 0) === 0 && M.st === 'finished';
  // MVP = meilleur buteur (par defaut), ou plus de passes si egal
  let mvp = null, mvpScore = 0;
  Object.keys(goals).forEach(p => {
    const score = goals[p] * 3 + (assists[p] || 0);
    if (score > mvpScore) { mvpScore = score; mvp = p; }
  });
  return { goals, assists, yellows, reds, mins, mvp, hatTricks, doubles, cleanSheet };
}

// ─── Editer un event post-match (#19) ───
function editEvent(M, eventIdx, patch) {
  if (!M || !M.ev || !M.ev[eventIdx]) return false;
  M.ev[eventIdx] = { ...M.ev[eventIdx], ...patch, _edited: true };
  // Recompter le score si on a modifie un but
  if (patch.tp === 'goal' || M.ev[eventIdx].tp === 'goal') {
    M.sA = M.ev.filter(e => e.tp === 'goal' && e.t === 'A').length;
    M.sB = M.ev.filter(e => e.tp === 'goal' && e.t === 'B').length;
  }
  return true;
}

// MUTATION au lieu d'assignment pour éviter race condition avec screen-match-live-v2.jsx
if (!window.MATCH_HELPERS) window.MATCH_HELPERS = {};
Object.assign(window.MATCH_HELPERS, {
  newMatch, loadMatch, saveMatch, gMatch, gMin, buildDefaultTeams, playerLabel,
  requestWakeLock, releaseWakeLock, goFullscreen, exitFullscreen,
  startSilenceLoop, stopSilenceLoop, addAT, setOpponent, setInjured, checkAlerts,
  getLiveMatch, listCoachFinishedMatches, computeExploits, editEvent,
  gPauseMs, gRealMs, fmtMMSS, isInHalftime, fmtMatchMinute,
});
if (!window.MATCH_SFX) window.MATCH_SFX = {};
Object.assign(window.MATCH_SFX, { playWhistle, playGoal, playCard, playBuzzer, vibrate });
