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
import {
  getAuth, sendSignInLinkToEmail, isSignInWithEmailLink,
  signInWithEmailLink, onAuthStateChanged, signOut as fbSignOut,
  GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js';

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

let app, db, auth;
try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
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

/* ---------- Partage équipe (payload pour /lecteur/?t=<token>) ---------- */
/* v43.79. Permet au V2 de publier dans `shared_teams/{token}` un payload
   au format attendu par la page autonome V1 `lecteur/index.html`, sans
   dépendre du V1 pour la création initiale.

   Le format payload (héritage V1) :
     { team:    { name, players[], fffConfig:{myTeamName}, short, season },
       matches: [ { st:'prepared', kickoffAt, ca, kickoffTime, meetingTime,
                    location, coachNote, tA:{n,lineup,bench}, tB:{n,...} } ],
       builtAt: Date.now(), source: 'v2' }

   Le V2 a ses propres structures (CDD_PLAYERS avec first/last/num, …), on
   les convertit ici en firstName/lastName/number attendus par V1.
*/

function buildSharedPayloadFromGlobals() {
  const club = (typeof window !== 'undefined' && window.CDD_CLUB) || {};
  const next = (typeof window !== 'undefined' && window.CDD_NEXT_MATCH) || {};
  const convo = (typeof window !== 'undefined' && window.CDD_CONVO) || {};
  const PLAYERS = (typeof window !== 'undefined' && window.CDD_PLAYERS) || [];

  const myTeamName = club.team || club.short || club.name || 'Mon équipe';

  // Joueurs au format V1 (firstName/lastName/number/isSub)
  const players = PLAYERS.map(p => ({
    id: p.id,
    firstName: p.first || '',
    lastName: p.last || '',
    number: p.num || '',
    isSub: !!p.isSub,
    pos: p.pos || '',
  }));

  // Convertit un joueur (objet ou string) en objet V1
  const toV1Player = (p) => {
    if (!p) return null;
    if (typeof p === 'string') return p;
    return {
      id: p.id || null,
      firstName: p.first || p.firstName || '',
      lastName: p.last || p.lastName || '',
      number: p.num || p.number || '',
    };
  };

  const lineup = (convo.starters || []).map(toV1Player).filter(Boolean);
  const bench = (convo.bench || []).map(toV1Player).filter(Boolean);

  const opp = (next.away && next.away !== 'À déterminer') ? next.away : 'À venir';

  const matchObj = {
    st: 'prepared',
    kickoffAt: next.date || null,
    ca: next.date || null,
    kickoffTime: next.time || next.kickoff || '',
    meetingTime: next.meeting || '09h45',
    location: next.venue || '',
    coachNote: next.coachNote || '',
    tA: { n: myTeamName, lineup, bench },
    tB: { n: opp, lineup: [], bench: [] },
  };

  return {
    team: {
      name: myTeamName,
      players,
      fffConfig: { myTeamName },
      short: club.short || '',
      season: club.season || '',
    },
    matches: [matchObj],
    builtAt: Date.now(),
    source: 'v2',
  };
}

async function pushSharedTeamPayload(token, payload) {
  if (!db) throw new Error('Firestore non initialisé');
  if (!token) throw new Error('token requis');
  const p = payload || buildSharedPayloadFromGlobals();
  if (!p || !p.team) throw new Error('payload.team requis');

  await setDoc(doc(db, 'shared_teams', token), {
    payload: p,
    updatedAt: serverTimestamp(),
    source: 'v2',
  }, { merge: true });

  try {
    localStorage.setItem(`cdd_v2_shared_${token}_pushed_at`, String(Date.now()));
  } catch (e) {}
  return p;
}

// Throttle : ne re-push pas si on l'a déjà fait il y a moins de TTL ms.
async function ensureSharedTeamPushed(token, opts) {
  const ttl = (opts && opts.ttlMs) || 30000; // 30s par défaut
  try {
    const last = parseInt(localStorage.getItem(`cdd_v2_shared_${token}_pushed_at`) || '0', 10);
    if (last && (Date.now() - last) < ttl) return { skipped: true, reason: 'recent' };
  } catch (e) {}
  await pushSharedTeamPayload(token);
  return { skipped: false };
}

/* ============================================================
   AUTH — Connexion par lien magique email (Phase B)
   ============================================================
   Modèle : pas de mot de passe. L'utilisateur saisit son email,
   reçoit un lien, clique → session Firebase authentifiée. L'email
   est de facto vérifié (il faut accéder à la boîte mail).

   window.cddAuth :
     ready                  → bool (Firebase Auth initialisé)
     currentUser()          → User Firebase | null
     sendLoginLink(email,o) → envoie le lien magique (o = {name, role})
     hasPendingLink()       → true si l'URL courante est un lien de connexion
     completeSignIn()       → finalise la connexion depuis le lien
     onChange(cb)           → s'abonne aux changements d'état (renvoie unsub)
     signOut()              → déconnexion réelle

   Compat : à chaque changement d'état, cdd_user_email est tenu à
   jour en miroir pour que le code existant (app.jsx, roles.js)
   continue de fonctionner sans réécriture.
============================================================ */

const AUTH_PENDING_EMAIL = 'cdd_auth_email_pending';
const AUTH_PENDING_NAME  = 'cdd_auth_name_pending';
const AUTH_PENDING_ROLE  = 'cdd_auth_role_pending';

const authSubscribers = new Set();
let authResolved = false;

function authActionSettings() {
  return {
    // URL de retour : la page courante. Le domaine doit être autorisé
    // dans Firebase Console → Authentication → Settings → Authorized domains.
    url: window.location.origin + window.location.pathname,
    handleCodeInApp: true,
  };
}

async function sendLoginLink(email, opts) {
  if (!auth) throw new Error('Firebase Auth non initialisé');
  const clean = (email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) throw new Error('Format email invalide');
  await sendSignInLinkToEmail(auth, clean, authActionSettings());
  try {
    localStorage.setItem(AUTH_PENDING_EMAIL, clean);
    if (opts && opts.name) localStorage.setItem(AUTH_PENDING_NAME, opts.name);
    if (opts && opts.role) localStorage.setItem(AUTH_PENDING_ROLE, opts.role);
  } catch (e) {}
  return { ok: true, email: clean };
}

function hasPendingLink() {
  return !!auth && isSignInWithEmailLink(auth, window.location.href);
}

async function completeSignIn() {
  if (!auth || !isSignInWithEmailLink(auth, window.location.href)) return null;
  let email = '';
  try { email = localStorage.getItem(AUTH_PENDING_EMAIL) || ''; } catch (e) {}
  if (!email) {
    // Lien ouvert sur un autre appareil que celui de la demande : on
    // redemande l'email pour finaliser (sécurité Firebase).
    email = window.prompt('Confirme ton email pour terminer la connexion :') || '';
  }
  if (!email) return null;
  try {
    const result = await signInWithEmailLink(auth, email.trim().toLowerCase(), window.location.href);
    try { localStorage.removeItem(AUTH_PENDING_EMAIL); } catch (e) {}
    // Nettoie l'URL (retire les longs paramètres oobCode du lien magique).
    try {
      window.history.replaceState({}, document.title,
        window.location.origin + window.location.pathname);
    } catch (e) {}
    return result.user;
  } catch (err) {
    console.error('[cddAuth] completeSignIn failed', err);
    alert('Connexion échouée : le lien est peut-être expiré ou déjà utilisé. Redemande un lien depuis l\'écran d\'accueil.');
    return null;
  }
}

// #55 — Connexion Google : un tap, aucun email envoyé (zéro spam).
// opts = { name?, role? } — mis en attente et appliqués par onAuthStateChanged.
async function signInWithGoogle(opts) {
  if (!auth) throw new Error('Firebase Auth non initialisé');
  try {
    if (opts && opts.role) localStorage.setItem(AUTH_PENDING_ROLE, opts.role);
    if (opts && opts.name) localStorage.setItem(AUTH_PENDING_NAME, opts.name);
  } catch (e) {}
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (err) {
    const code = err && err.code;
    // L'utilisateur a fermé la fenêtre volontairement → ne rien faire.
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      return null;
    }
    // Popup bloquée / non supportée (certains navigateurs mobiles) → bascule
    // sur un redirect plein écran (la page rechargera après connexion).
    if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
      await signInWithRedirect(auth, provider);
      return null;
    }
    throw err;
  }
}

async function signOutUser() {
  try { if (auth) await fbSignOut(auth); } catch (e) { console.warn('[cddAuth] signOut', e); }
  try {
    localStorage.removeItem('cdd_user_email');
    localStorage.removeItem(AUTH_PENDING_EMAIL);
  } catch (e) {}
  // onAuthStateChanged se déclenchera et dispatchera cdd-auth-changed.
}

function onAuthChange(cb) {
  if (typeof cb !== 'function') return () => {};
  authSubscribers.add(cb);
  if (authResolved) { try { cb(auth ? auth.currentUser : null); } catch (e) {} }
  return () => authSubscribers.delete(cb);
}

if (auth) {
  onAuthStateChanged(auth, (user) => {
    authResolved = true;
    try {
      if (user && user.email) {
        // Miroir de compat : le code existant route sur cdd_user_email.
        localStorage.setItem('cdd_user_email', user.email.toLowerCase());
        // Applique le profil saisi avant connexion (nom + rôle en attente).
        const pendName = localStorage.getItem(AUTH_PENDING_NAME);
        const pendRole = localStorage.getItem(AUTH_PENDING_ROLE);
        if (pendName) {
          localStorage.setItem('cdd_coach_name', pendName);
          localStorage.removeItem(AUTH_PENDING_NAME);
        } else if (user.displayName && !localStorage.getItem('cdd_coach_name')) {
          // Connexion Google : on récupère le nom directement du profil Google.
          localStorage.setItem('cdd_coach_name', user.displayName);
        }
        if (pendRole) { localStorage.setItem('cdd_user_role', pendRole); localStorage.removeItem(AUTH_PENDING_ROLE); }
      } else {
        // Pas de session authentifiée → on retire le miroir.
        localStorage.removeItem('cdd_user_email');
      }
    } catch (e) {}
    window.dispatchEvent(new CustomEvent('cdd-auth-changed', { detail: { user: user || null } }));
    authSubscribers.forEach(cb => { try { cb(user || null); } catch (e) {} });
  });

  // Récupère le résultat d'une connexion Google par redirect (mobile).
  getRedirectResult(auth).catch(err => {
    if (err && err.code) console.warn('[cddAuth] getRedirectResult', err.code);
  });

  // Auto-complète la connexion si on arrive via un lien magique.
  if (isSignInWithEmailLink(auth, window.location.href)) {
    completeSignIn();
  }
}

window.cddAuth = {
  get ready() { return !!auth; },
  get resolved() { return authResolved; },
  currentUser() { return auth ? auth.currentUser : null; },
  sendLoginLink,
  signInWithGoogle,
  hasPendingLink,
  completeSignIn,
  onChange: onAuthChange,
  signOut: signOutUser,
};
window.dispatchEvent(new Event('cdd-auth-ready'));
console.info('[cddAuth] ready=' + (!!auth));

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
  // v43.79 : autonomie du V2 pour publier le payload partagé
  buildSharedPayloadFromGlobals,
  pushSharedTeamPayload,
  ensureSharedTeamPushed,
};

window.dispatchEvent(new Event('cdd-sync-ready'));
console.info('[cddSync] ready · matchId=' + window.cddSync.matchId + ' · voterId=' + window.cddSync.voterId);
