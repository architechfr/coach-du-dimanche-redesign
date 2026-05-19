/* ============================================================
   firebase-sync.js — Sync convoc parent↔coach + vote post-match
   Pilote V2 L1+L2 — projet Firebase arbitre-sport (Firestore)
   ============================================================
   Expose window.cddSync :
     - sendConvocResponse(matchId, playerId, resp, label?)
     - watchConvocResponses(matchId, callback) → unsubscribe fn
     - sendVote(matchId, voterId, ratings)
     - watchVotes(matchId, callback) → unsubscribe fn
     - getMatchId() → ID depuis URL ?m= ou localStorage ou date prochain match
     - getVoterId() → UUID local persistant

   Collections Firestore :
     /cdd_v2_convoc/{matchId}   doc { responses: { [playerId]: {resp, ts, label?} } }
     /cdd_v2_votes/{matchId}    doc { voters: { [voterId]: {ratings, ts} } }

   Doit être chargé en <script type="module"> dans app.html.
============================================================ */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js';
import {
  getFirestore, doc, setDoc, onSnapshot, serverTimestamp,
  collection, query, where
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyCsAHr2QpRwL-LiC_hawce_rbWyOAl-wrc",
  authDomain: "arbitre-sport.firebaseapp.com",
  projectId: "arbitre-sport",
  storageBucket: "arbitre-sport.firebasestorage.app",
  messagingSenderId: "214581758718",
  appId: "1:214581758718:web:c0809b98afc54d3e3773af",
  measurementId: "G-MH2NT3JPTF"
};

const COLL_CONVOC  = 'cdd_v2_convoc';
const COLL_VOTES   = 'cdd_v2_votes';
const COLL_MATCHES = 'cdd_v2_matches';
const COLL_PLAYERS = 'cdd_v2_players';

const VALID_STATUSES = ['active', 'rest', 'injured', 'suspended', 'reserve'];

let app, db;
try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (err) {
  console.error('[cddSync] init failed', err);
}

/* ---------- IDs helpers ---------- */

function getQueryParam(name) {
  // Lit ?name=... aussi bien depuis location.search que depuis hash router #lecteur?name=...
  const fromSearch = new URLSearchParams(window.location.search).get(name);
  if (fromSearch) return fromSearch;
  const hash = window.location.hash || '';
  const q = hash.split('?')[1];
  if (q) return new URLSearchParams(q).get(name);
  return null;
}

function getMatchId() {
  // Résolution "contexte courant", utilisée par les écrans Convocations, Home, Lecteur.
  // 1. URL ?m=XXX (vue ciblée — lecteur parent partagé)
  // 2. cdd_match_current (match LIVE en cours d'arbitrage — priorité max)
  // 3. CDD_NEXT_MATCH.id (prochain match à préparer — convocations)
  // 4. cdd_match_last_finished (fallback : un match vient de se terminer, contexte = post-match)
  // 5. fallback démo
  const fromUrl = getQueryParam('m');
  if (fromUrl) return fromUrl;
  const cur = localStorage.getItem('cdd_match_current');
  if (cur) return cur;
  const next = window.CDD_NEXT_MATCH;
  if (next?.id) return next.id;
  if (next?.date && !next?.noUpcoming) {
    return 'next_' + next.date.replace(/[^0-9]/g, '_').replace(/^_|_$/g, '');
  }
  const lastFinished = localStorage.getItem('cdd_match_last_finished');
  if (lastFinished) return lastFinished;
  return 'demo_default';
}

// Helper dédié pour la page Vote : doit pointer sur le dernier match TERMINÉ,
// pas sur le prochain à préparer.
function getLastFinishedMatchId() {
  return localStorage.getItem('cdd_match_last_finished') || null;
}

function getVoterId() {
  let id = localStorage.getItem('cdd_voter_id');
  if (!id) {
    id = 'v_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    localStorage.setItem('cdd_voter_id', id);
  }
  return id;
}

/* ---------- API Convocation parent ↔ coach ---------- */

async function sendConvocResponse(matchId, playerId, resp, label) {
  if (!db) throw new Error('Firestore non initialisé');
  if (!matchId || !playerId || !resp) throw new Error('matchId/playerId/resp requis');
  if (!['yes', 'no', 'may'].includes(resp)) throw new Error('resp doit être yes/no/may');

  await setDoc(doc(db, COLL_CONVOC, matchId), {
    responses: {
      [playerId]: {
        resp,
        ts: serverTimestamp(),
        label: label || null
      }
    }
  }, { merge: true });

  // Mirror local
  try {
    const key = `cdd_v2_convoc_${matchId}`;
    const cur = JSON.parse(localStorage.getItem(key) || '{}');
    cur[playerId] = { resp, ts: Date.now(), label: label || null };
    localStorage.setItem(key, JSON.stringify(cur));
  } catch (e) { /* ignore */ }
}

function watchConvocResponses(matchId, callback) {
  if (!db) {
    console.warn('[cddSync] watchConvocResponses: db non initialisé');
    callback({});
    return () => {};
  }
  return onSnapshot(
    doc(db, COLL_CONVOC, matchId),
    snap => {
      const responses = snap.exists() ? (snap.data().responses || {}) : {};
      callback(responses);
      // Mirror local
      try { localStorage.setItem(`cdd_v2_convoc_${matchId}`, JSON.stringify(responses)); } catch (e) {}
    },
    err => {
      console.warn('[cddSync] watchConvocResponses error:', err.message);
      // Fallback local cache
      try {
        const cached = JSON.parse(localStorage.getItem(`cdd_v2_convoc_${matchId}`) || '{}');
        callback(cached);
      } catch (e) { callback({}); }
    }
  );
}

/* ---------- API Vote post-match ---------- */

async function sendVote(matchId, voterId, ratings) {
  if (!db) throw new Error('Firestore non initialisé');
  if (!matchId || !voterId || !ratings) throw new Error('matchId/voterId/ratings requis');

  await setDoc(doc(db, COLL_VOTES, matchId), {
    voters: {
      [voterId]: {
        ratings,
        ts: serverTimestamp()
      }
    }
  }, { merge: true });

  try {
    localStorage.setItem(`cdd_v2_vote_${matchId}_${voterId}`, JSON.stringify({ ratings, ts: Date.now() }));
  } catch (e) {}
}

function watchVotes(matchId, callback) {
  if (!db) {
    callback({});
    return () => {};
  }
  return onSnapshot(
    doc(db, COLL_VOTES, matchId),
    snap => callback(snap.exists() ? (snap.data().voters || {}) : {}),
    err => {
      console.warn('[cddSync] watchVotes error:', err.message);
      callback({});
    }
  );
}

/* ---------- API Sauvegarde match dans le cloud (#11) ---------- */

async function saveMatchToCloud(match) {
  if (!db) throw new Error('Firestore non initialisé');
  if (!match || !match.id) throw new Error('match.id requis');
  const matchId = match.id;
  // Strip _prev (snapshots undo) pour reduire la taille
  const cleanEv = (match.ev || []).map(e => {
    const { _prev, ...rest } = e || {};
    return rest;
  });
  const payload = {
    id: match.id,
    teamA: { n: match.tA && match.tA.n, c: match.tA && match.tA.c, score: match.sA, players: (match.tA && match.tA.p) || [], bench: (match.tA && match.tA.bench) || [] },
    teamB: { n: match.tB && match.tB.n, c: match.tB && match.tB.c, score: match.sB, players: (match.tB && match.tB.p) || [], bench: (match.tB && match.tB.bench) || [] },
    status: match.st,
    period: match.ch,
    config: match.cfg || {},
    events: cleanEv,
    yellows: { A: match.yA || 0, B: match.yB || 0 },
    reds:    { A: match.rA || 0, B: match.rB || 0 },
    subs:    { A: match.uA || 0, B: match.uB || 0 },
    addTime: match.at || 0,
    savedAt: serverTimestamp(),
    coachId: getVoterId(),
  };
  await setDoc(doc(db, COLL_MATCHES, matchId), payload, { merge: true });
  return { ok: true, matchId };
}

function watchMatchFromCloud(matchId, callback) {
  if (!db) { callback(null); return () => {}; }
  return onSnapshot(
    doc(db, COLL_MATCHES, matchId),
    snap => callback(snap.exists() ? snap.data() : null),
    err => { console.warn('[cddSync] watchMatch error:', err.message); callback(null); }
  );
}

/* ---------- API Statuts joueurs (sync coach ↔ devices) ---------- */

async function setPlayerStatus(teamId, playerId, statusId, statusMeta) {
  if (!db) throw new Error('Firestore non initialisé');
  if (!teamId || !playerId) throw new Error('teamId/playerId requis');
  if (!VALID_STATUSES.includes(statusId)) {
    throw new Error('statusId invalide : ' + statusId);
  }
  const payload = {
    playerId,
    teamId,
    status: statusId,
    statusMeta: statusMeta || {},
    statusUpdatedAt: serverTimestamp(),
    statusUpdatedBy: getVoterId(),
  };
  await setDoc(doc(db, COLL_PLAYERS, String(playerId)), payload, { merge: true });
  return { ok: true, playerId };
}

function watchPlayerStatuses(teamId, callback) {
  if (!db) {
    console.warn('[cddSync] watchPlayerStatuses: db non initialisé');
    callback({});
    return () => {};
  }
  if (!teamId) {
    console.warn('[cddSync] watchPlayerStatuses: teamId manquant');
    callback({});
    return () => {};
  }
  const q = query(collection(db, COLL_PLAYERS), where('teamId', '==', teamId));
  return onSnapshot(
    q,
    snap => {
      const byId = {};
      snap.forEach(docSnap => {
        const d = docSnap.data();
        if (d && d.playerId) {
          byId[d.playerId] = {
            status: d.status || 'active',
            statusMeta: d.statusMeta || {},
            statusUpdatedAt: d.statusUpdatedAt || null,
            statusUpdatedBy: d.statusUpdatedBy || null,
          };
        }
      });
      callback(byId);
    },
    err => {
      console.warn('[cddSync] watchPlayerStatuses error:', err.message);
      callback({});
    }
  );
}

/* ---------- Expose globally ---------- */

// matchId est un GETTER dynamique : ré-évalué à chaque lecture.
// Sinon le matchId reste figé à l'init et les votes/convocs partent sur le mauvais match
// quand l'utilisateur passe d'un match à l'autre dans la même session.
window.cddSync = {
  ready: !!db,
  get matchId() { return getMatchId(); },
  get lastFinishedMatchId() { return getLastFinishedMatchId(); },
  voterId: getVoterId(),
  sendConvocResponse,
  watchConvocResponses,
  sendVote,
  watchVotes,
  saveMatchToCloud,
  watchMatchFromCloud,
  setPlayerStatus,
  watchPlayerStatuses,
  getMatchId,
  getLastFinishedMatchId,
  getVoterId,
};

window.dispatchEvent(new Event('cdd-sync-ready'));
console.info('[cddSync] ready · matchId=' + window.cddSync.matchId + ' · voterId=' + window.cddSync.voterId);
