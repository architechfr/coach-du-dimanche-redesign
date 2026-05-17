/* global React, CDD_PLAYERS, CDD_CLUB, POSITION_LABEL */

/* ============================================================
   MATCH LIVE — full arbitrage flow
   Inspired by Coach du Dimanche v43.x — luxe FIFA UI +
   real M.ev source-of-truth + 4-modal goal flow + auto 2e
   yellow → red + fullscreen card overlay + sub flow + ht/end.
   ============================================================ */

const { useState: useStateML, useEffect: useEffectML, useRef: useRefML, useMemo: useMemoML } = React;

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
  };
}

// Build default teams from CDD_PLAYERS
function buildDefaultTeams() {
  const players = window.CDD_PLAYERS || [];
  const club = window.CDD_CLUB || {};
  return {
    tA: {
      n: club.short || 'Mon équipe',
      c: club.colors?.[0] || '#c8f169',
      p: players.filter(p => p.isStarter).slice(0, 11).map(p => ({ num: p.num, first: p.first, last: p.last, id: p.id, onField: true })),
      bench: players.filter(p => !p.isStarter && p.status !== 'reserve').slice(0, 7).map(p => ({ num: p.num, first: p.first, last: p.last, id: p.id, onField: false })),
    },
    tB: {
      n: 'Adversaire',
      c: '#3b82f6',
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

window.MATCH_HELPERS = { newMatch, loadMatch, saveMatch, gMatch, gMin, buildDefaultTeams, playerLabel };
window.MATCH_SFX = { playWhistle, playGoal, playCard, playBuzzer, vibrate };
