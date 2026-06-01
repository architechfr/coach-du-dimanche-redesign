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
  getFirestore, doc, setDoc, updateDoc, getDoc, getDocs, deleteDoc, deleteField,
  onSnapshot, serverTimestamp, collection, query, where, writeBatch
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js';
import {
  getAuth, sendSignInLinkToEmail, isSignInWithEmailLink,
  signInWithEmailLink, onAuthStateChanged, signOut as fbSignOut,
  GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js';
import {
  getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-storage.js';

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

let app, db, auth, storage;
try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  storage = getStorage(app);
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

async function sendVote(matchId, voterId, ratings, meta = {}) {
  if (!db) throw new Error('Firestore non initialisé');
  if (!matchId || !voterId || !ratings) throw new Error('matchId/voterId/ratings requis');

  await setDoc(doc(db, COLL_VOTES, matchId), {
    voters: {
      [voterId]: {
        ratings,
        ...meta,
        ts: serverTimestamp()
      }
    }
  }, { merge: true });

  try {
    localStorage.setItem(`cdd_v2_vote_${matchId}_${voterId}`, JSON.stringify({ ratings, ...meta, ts: Date.now() }));
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

  // ─── PROTECTION ANTI-ÉCRASEMENT (fix 2026-05-26 bug "tél tardif efface score") ───
  // Avant : un device qui rejoint un match en cours, si son M local est vide
  // (race condition de chargement), push sa version 0-event au cloud → écrase
  // les buts/cartons des autres devices.
  // Désormais : on fetch le doc cloud AVANT de push. Si cloud a PLUS d'events
  // que notre local, on ne touche PAS aux events / teamA / teamB / scores —
  // on push uniquement les méta-champs (chrono, status). 1 read par push
  // (~6/min/match) = coût négligeable, intégrité maximale.
  let cloudExisting = null;
  try {
    const existingDoc = await getDoc(doc(db, COLL_MATCHES, matchId));
    if (existingDoc.exists()) cloudExisting = existingDoc.data();
  } catch (e) { /* silencieux : si fetch échoue on push normalement */ }
  const cloudEvCount = (cloudExisting && Array.isArray(cloudExisting.events))
    ? cloudExisting.events.length : 0;
  const heartbeatOnly = cloudExisting && cloudEvCount > cleanEv.length;
  if (heartbeatOnly) {
    console.info('[saveMatchToCloud] HEARTBEAT : cloud=', cloudEvCount,
      'events vs local=', cleanEv.length, '→ events/teamA/teamB préservés cloud');
  }

  let payload;
  if (heartbeatOnly) {
    // Mode heartbeat : on ne touche QUE aux champs sûrs
    payload = {
      id: match.id,
      status: match.st,
      period: match.ch,
      addTime: match.at || 0,
      savedAt: serverTimestamp(),
      coachId: getVoterId(),
    };
  } else {
    // Mode complet : push tout (équipes, events, scores, méta)
    const teamAPayload = {
      n: match.tA && match.tA.n,
      c: match.tA && match.tA.c,
      score: match.sA,
      players: (match.tA && match.tA.p) || [],
      bench: (match.tA && match.tA.bench) || [],
    };
    if (match.tA && match.tA.logoDataUrl) teamAPayload.logoDataUrl = match.tA.logoDataUrl;
    const teamBPayload = {
      n: match.tB && match.tB.n,
      c: match.tB && match.tB.c,
      score: match.sB,
      players: (match.tB && match.tB.p) || [],
      bench: (match.tB && match.tB.bench) || [],
    };
    if (match.tB && match.tB.logoDataUrl) teamBPayload.logoDataUrl = match.tB.logoDataUrl;
    payload = {
      id: match.id,
      teamA: teamAPayload,
      teamB: teamBPayload,
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
  }
  // Champs chrono : ne PAS pousser un null s'il écraserait une valeur cloud
  // valide. Cas typique : un device distant qui a tiré un match sans tSt
  // (legacy v162) auto-save toutes les 10s — sans cette garde il écraserait
  // le bon tSt poussé par le device origine. Avec merge:true, omettre le
  // champ préserve la valeur existante côté Firestore.
  if (match.tSt != null)            payload.tSt = match.tSt;
  if (typeof match.tOff === 'number' && match.tOff > 0) payload.tOff = match.tOff;
  if (match.startedAt != null)      payload.startedAt = match.startedAt;
  if (match.pauseStartedAt != null) payload.pauseStartedAt = match.pauseStartedAt;
  if (typeof match.inHalftime === 'boolean') payload.inHalftime = match.inHalftime;
  if (match.htStart != null)        payload.htStart = match.htStart;

  // ─── Champs de filtrage cross-device (fix 2026-05-26) ───
  // Permet à fetchFinishedMatches() de requêter Firestore par clubId au lieu
  // de scanner localStorage. Sans ces champs, l'historique "Derniers matchs"
  // diverge entre PC et téléphone (chaque device n'a que son propre cache).
  // Tous écrits en merge:true → ne s'efface jamais s'ils sont déjà au cloud.
  if (match.clubId)              payload.clubId = String(match.clubId);
  if (match.tmId)                payload.teamId = String(match.tmId);
  if (match.endedAt != null)     payload.endedAt = match.endedAt;
  if (match.matchType)           payload.matchType = match.matchType;
  if (typeof match.isAtHome === 'boolean') payload.isAtHome = match.isAtHome;
  if (match.scheduledMatchId)    payload.scheduledMatchId = match.scheduledMatchId;

  await setDoc(doc(db, COLL_MATCHES, matchId), payload, { merge: true });
  return { ok: true, matchId };
}

async function deleteMatchFromCloud(matchId) {
  if (!db) throw new Error('Firestore non initialisé');
  if (!matchId) throw new Error('matchId requis');
  // Best-effort : on ne casse pas si les docs annexes n'existent pas.
  try { await deleteDoc(doc(db, COLL_MATCHES, matchId)); } catch (e) {}
  try { await deleteDoc(doc(db, COLL_VOTES, matchId));   } catch (e) {}
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
    localStorage.removeItem('cdd_access_revoked');
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
        // Miroir uid : utilisé par coach-profile.js (carte de visite,
        // partage public via ?coach=UID).
        if (user.uid) localStorage.setItem('cdd_user_uid', user.uid);
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
        localStorage.removeItem('cdd_user_uid');
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

/* ============================================================
   DATA — Lecture / écriture Firestore des clubs, équipes,
   joueurs et memberships (Phase C — C2).
   ============================================================
   window.cddData :
     saveClub / saveTeam / savePlayer / saveMembership  → écriture
     fetchMemberships / fetchClub / fetchTeams / fetchPlayers → lecture
     migrateLocalToCloud()  → migration unique des données locales

   Collections : clauses gouvernées par firestore.rules (C1).
   Convention : id d'une membership = `{uid}_{clubId}`.
   Tant que C3 n'est pas fait, l'app LIT encore en local — ce module
   ne fait qu'ALIMENTER Firestore (additif, ne casse rien).
============================================================ */

const ADMIN_EMAIL_DATA = 'archi.tech.fr@gmail.com';

function _uid()   { return auth && auth.currentUser ? auth.currentUser.uid : null; }
function _email() {
  return (auth && auth.currentUser && auth.currentUser.email)
    ? auth.currentUser.email.toLowerCase() : '';
}
function _lsJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  catch (e) { return fallback; }
}

// ─── Écriture ──────────────────────────────────────────────
// #60 — NON-LOSSY : on sauvegarde l'OBJET COMPLET (tous les champs), pas un
// sous-ensemble. Indispensable pour que la lecture cloud (C3) restitue des
// données intactes (statuts, titulaires, compo, numéros…).
// Strip récursivement les valeurs `undefined` d'un objet/tableau (Firestore
// les rejette avec "Unsupported field value: undefined"). On les remplace
// par `null` (que Firestore accepte et stocke comme "champ effacé").
// Sans ça, un seul champ undefined dans l'arbre fait échouer tout le setDoc
// — bug Florian 26/05/2026 : `short: undefined` cassait tout le save club.
function _stripUndefined(value) {
  if (value === undefined) return null;
  if (value === null) return null;
  if (Array.isArray(value)) return value.map(_stripUndefined);
  if (typeof value === 'object') {
    // Préserver les Timestamps Firestore (toMillis) et les FieldValue
    if (typeof value.toMillis === 'function') return value;
    if (typeof value._methodName === 'string') return value;
    const out = {};
    Object.keys(value).forEach(k => { out[k] = _stripUndefined(value[k]); });
    return out;
  }
  return value;
}

async function saveClub(club) {
  if (!db || !club || !club.id) throw new Error('db/club.id requis');

  // ─── PROTECTION ANTI-ÉCRASEMENT (fix 2026-05-26 bug Florian) ───
  // Avant : { ...club } spreadait TOUTES les clés même celles à undefined.
  // _stripUndefined convertit undefined → null → écrase la valeur cloud
  // avec null. Florian a perdu son stade 3 fois à cause de ça.
  //
  // Désormais : on construit le payload champ par champ, en n'incluant que
  // les valeurs qui ont du contenu réel. Avec merge:true, omettre la clé
  // préserve automatiquement la valeur cloud existante.
  const payload = {
    id: club.id,
    createdBy: _uid(),
    updatedAt: serverTimestamp(),
  };

  // Champs scalaires : push seulement si non-vide
  if (club.name && String(club.name).trim()) payload.name = club.name;
  if (club.short && String(club.short).trim()) payload.short = club.short;
  else if (club.name && String(club.name).trim()) payload.short = club.name;
  if (club.description && String(club.description).trim()) payload.description = club.description;
  if (club.foundedYear && String(club.foundedYear).trim()) payload.foundedYear = club.foundedYear;
  if (club.palmares && String(club.palmares).trim()) payload.palmares = club.palmares;
  if (club.presidentWord && String(club.presidentWord).trim()) payload.presidentWord = club.presidentWord;
  if (club.federation && String(club.federation).trim()) payload.federation = club.federation;
  if (club.district && String(club.district).trim()) payload.district = club.district;
  if (club.primaryColor) payload.primaryColor = club.primaryColor;
  if (club.secondaryColor) payload.secondaryColor = club.secondaryColor;
  if (Array.isArray(club.colors) && club.colors.length) payload.colors = club.colors;

  // Logo : prend la nouvelle valeur si fournie, sinon ne touche pas
  const logoUrl = club.logoUrl || club.logoDataUrl;
  if (logoUrl) payload.logoUrl = logoUrl;

  // Stadium : objet structuré, push UNIQUEMENT si au moins un champ a du contenu
  const stadiumHasContent = club.stadium && (
    (club.stadium.name && String(club.stadium.name).trim()) ||
    (club.stadium.address && String(club.stadium.address).trim()) ||
    (club.stadium.gpsUrl && String(club.stadium.gpsUrl).trim())
  );
  if (stadiumHasContent) payload.stadium = club.stadium;

  // Contacts : array, push uniquement si au moins 1 contact avec contenu
  const contactsHasContent = Array.isArray(club.contacts)
    && club.contacts.some(c => c && (c.role || c.name || c.phone || c.email));
  if (contactsHasContent) payload.contacts = club.contacts;

  // Social media : objet, push uniquement si au moins 1 lien
  const socialHasContent = club.socialMedia && (
    (club.socialMedia.facebook && String(club.socialMedia.facebook).trim()) ||
    (club.socialMedia.instagram && String(club.socialMedia.instagram).trim()) ||
    (club.socialMedia.website && String(club.socialMedia.website).trim())
  );
  if (socialHasContent) payload.socialMedia = club.socialMedia;

  await setDoc(doc(db, 'clubs', club.id), _stripUndefined(payload), { merge: true });
  console.info('[saveClub] ✓', club.id, 'champs:', Object.keys(payload).join(','));
  return { ok: true, id: club.id };
}

async function saveTeam(team) {
  if (!db || !team || !team.id) throw new Error('db/team.id requis');
  // On exclut le tableau `players` (sauvegardé séparément en documents).
  const teamCopy = { ...team };
  delete teamCopy.players;
  await setDoc(doc(db, 'teams', team.id), {
    ...teamCopy,
    clubId: team.clubId || null,
    fffConfig: team.fff || team.fffConfig || null,
    createdBy: _uid(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
  return { ok: true, id: team.id };
}

// Pointeur "match en cours" stocké sur le doc team. Permet à tous les
// autres appareils (adjoint, parent, joueur, lecteur, coach sur 2e device)
// de savoir qu'un match tourne. Sans ce mécanisme, cdd_match_current était
// purement local — le 2e device voyait l'app comme "pas de match" alors
// que le coach principal était en plein live (bug Florian 26/05/2026).
async function setTeamLiveMatch(teamId, matchId) {
  if (!db || !teamId || !matchId) return { ok: false };
  try {
    await setDoc(doc(db, 'teams', String(teamId)), {
      liveMatch: {
        matchId: String(matchId),
        startedAt: Date.now(), // ms numérique (sert au filtre "abandonné > 6h")
        startedBy: _uid() || null,
      },
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return { ok: true };
  } catch (e) {
    console.warn('[liveMatch] setTeamLiveMatch failed', e.message);
    return { ok: false, error: e.message };
  }
}

async function clearTeamLiveMatch(teamId) {
  if (!db || !teamId) return { ok: false };
  try {
    await setDoc(doc(db, 'teams', String(teamId)), {
      liveMatch: null,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return { ok: true };
  } catch (e) {
    console.warn('[liveMatch] clearTeamLiveMatch failed', e.message);
    return { ok: false, error: e.message };
  }
}

// Récupère un match individuel depuis le cloud (collection cdd_v2_matches).
// Utilisé pour qu'un device qui n'a pas créé le match puisse quand même le
// charger en local quand il détecte un liveMatch sur sa team active.
async function fetchMatch(matchId) {
  if (!db || !matchId) return null;
  try {
    const d = await getDoc(doc(db, COLL_MATCHES, String(matchId)));
    return d.exists() ? d.data() : null;
  } catch (e) {
    console.warn('[liveMatch] fetchMatch failed', e.message);
    return null;
  }
}

// ─── Tracker d'état Firestore (fix UX 2026-05-26) ──────────────────────
// État global de la connexion au cloud, exposé à l'UI via getSyncStatus()
// + event 'cdd-sync-status-changed'. Permet à l'indicateur 🟢/🔴 en haut
// du header et au bouton "🔄 Sync" du bandeau MATCH EN COURS de donner
// au coach la visibilité sur la santé de la sync sans devoir ouvrir la
// console. État initial optimiste (true) : on assume que ça marche jusqu'à
// preuve du contraire.
let _syncStatus = {
  ok: true,            // true = sync OK, false = échec (ad-blocker, 3G, rules…)
  lastPullAt: 0,       // ms epoch du dernier pull réussi
  inFlight: false,     // true pendant un forcePull (anti-double clic)
  lastError: null,     // string : message de la dernière erreur
};
function getSyncStatus() { return { ..._syncStatus }; }
function _setSyncStatus(patch) {
  _syncStatus = { ..._syncStatus, ...patch };
  try {
    window.dispatchEvent(new CustomEvent('cdd-sync-status-changed', { detail: { ..._syncStatus } }));
  } catch (e) {}
}
// Force un re-pull complet du cloud. Utilisé par les boutons "🔄 Sync".
// Retourne {ok, error?} pour feedback UI. Anti-double-clic via inFlight.
async function forcePull() {
  if (!db) return { ok: false, error: 'db non initialisé' };
  if (_syncStatus.inFlight) return { ok: false, error: 'sync en cours' };
  _setSyncStatus({ inFlight: true });
  try {
    const r = await pullCloudData();
    const ok = r && r.ok !== false;
    _setSyncStatus({
      ok,
      lastPullAt: Date.now(),
      inFlight: false,
      lastError: ok ? null : (r && r.error) || (r && r.reason) || 'pull KO',
    });
    // Force rebuild des globaux pour rerender React (CDD_LAST_MATCHES etc.)
    try { if (window.CDD_REBUILD) window.CDD_REBUILD(); } catch (e) {}
    return { ok, result: r };
  } catch (e) {
    _setSyncStatus({ ok: false, lastPullAt: Date.now(), inFlight: false, lastError: e.message });
    return { ok: false, error: e.message };
  }
}

// ─── Helper interne : reconstruit un match local depuis un doc cloud ───
// Extrait du bloc inline de pullCloudData (lignes 2289+) pour pouvoir le
// réutiliser dans watchTeamLiveMatch sans dupliquer la logique.
//
// Le format cloud (saveMatchToCloud) ≠ format local exact. On reconstruit
// un objet local-compatible (champs critiques : teamA, teamB, score, ev, st…)
// et on écrit sous cdd_match_{id} comme attendu par match-engine.
function _applyCloudMatchToLocal(matchDoc, teamId, clubId) {
  if (!matchDoc || !matchDoc.id) return false;
  try {
    const lmId = String(matchDoc.id);

    // ── PROTECTION ANTI-ÉCRASEMENT (fix 2026-05-26 bug "but s'efface") ──
    // Le tick auto-save 10s du device qui arbitre peut pousser un M sans
    // les events poussés par un autre device (race condition). Si on accepte
    // sans broncher, on perd les buts/cartons côté local.
    // Stratégie : si on a déjà un M local AVEC PLUS D'EVENTS que le cloud,
    // on préserve les events locaux + scores dérivés. Le reste (chrono,
    // status, addTime) prend toujours le cloud (peu critique).
    let existing = null;
    try { existing = JSON.parse(localStorage.getItem('cdd_match_' + lmId) || 'null'); }
    catch (e) {}
    const cloudEvents = matchDoc.events || [];
    const localEvents = (existing && Array.isArray(existing.ev)) ? existing.ev : [];
    const preserveLocalEvents = localEvents.length > cloudEvents.length;
    if (preserveLocalEvents) {
      console.info('[liveMatch] préserve events locaux :',
        localEvents.length, '> cloud', cloudEvents.length,
        '— protection anti-écrasement (tick 10s remote)');
    }

    const localShape = {
      id: lmId,
      teamId: teamId || matchDoc.teamId || null,
      clubId: clubId || matchDoc.clubId || null,
      tA: matchDoc.teamA ? {
        n: matchDoc.teamA.n, c: matchDoc.teamA.c,
        logoDataUrl: matchDoc.teamA.logoDataUrl || (existing && existing.tA && existing.tA.logoDataUrl) || null,
        p: matchDoc.teamA.players || [],
        bench: matchDoc.teamA.bench || [],
      } : null,
      tB: matchDoc.teamB ? {
        n: matchDoc.teamB.n, c: matchDoc.teamB.c,
        logoDataUrl: matchDoc.teamB.logoDataUrl || (existing && existing.tB && existing.tB.logoDataUrl) || null,
        p: matchDoc.teamB.players || [],
        bench: matchDoc.teamB.bench || [],
      } : null,
      sA: preserveLocalEvents
            ? (existing && typeof existing.sA === 'number' ? existing.sA : 0)
            : (matchDoc.teamA ? matchDoc.teamA.score : 0),
      sB: preserveLocalEvents
            ? (existing && typeof existing.sB === 'number' ? existing.sB : 0)
            : (matchDoc.teamB ? matchDoc.teamB.score : 0),
      st: matchDoc.status,
      ch: matchDoc.period,
      cfg: matchDoc.config || {},
      ev: preserveLocalEvents ? localEvents : cloudEvents,
      yA: matchDoc.yellows ? matchDoc.yellows.A : 0,
      yB: matchDoc.yellows ? matchDoc.yellows.B : 0,
      rA: matchDoc.reds    ? matchDoc.reds.A    : 0,
      rB: matchDoc.reds    ? matchDoc.reds.B    : 0,
      uA: matchDoc.subs    ? matchDoc.subs.A    : 0,
      uB: matchDoc.subs    ? matchDoc.subs.B    : 0,
      at: matchDoc.addTime || 0,
      tSt: matchDoc.tSt || null,
      tOff: typeof matchDoc.tOff === 'number' ? matchDoc.tOff : 0,
      startedAt: matchDoc.startedAt || null,
      pauseStartedAt: matchDoc.pauseStartedAt || null,
      inHalftime: matchDoc.inHalftime || false,
      htStart: matchDoc.htStart || null,
      isAtHome: typeof matchDoc.isAtHome === 'boolean' ? matchDoc.isAtHome : undefined,
      matchType: matchDoc.matchType || null,
      scheduledMatchId: matchDoc.scheduledMatchId || null,
      endedAt: matchDoc.endedAt || null,
      savedAt: Date.now(),
    };
    // Merge avec existing : préserve les champs locaux qui ne seraient PAS
    // dans le cloud (ex: isAtHome posé au coup d'envoi mais doc cloud lancé
    // avant le fix v170 → on garde la valeur locale plutôt qu'undefined).
    // localShape gagne sur existing pour les champs qu'il définit explicitement.
    const cleanLocal = {};
    Object.keys(localShape).forEach(k => {
      if (localShape[k] !== undefined) cleanLocal[k] = localShape[k];
    });
    const final = existing ? { ...existing, ...cleanLocal } : cleanLocal;

    // ─── Détection de changement VISIBLE (fix anti-clignotement 2026-05-26) ───
    // Sans ce check, on dispatch cdd-data-rebuilt à chaque snapshot Firestore
    // (toutes les 10s par le tick du coach) → React re-render tout → l'overlay
    // debug clignote + UX moche. On ne dispatch QUE si quelque chose de visible
    // a changé : nb d'events, statut, scores, période.
    const sigOf = (m) => m ? [
      (Array.isArray(m.ev) ? m.ev.length : 0),
      m.st || '',
      m.sA || 0,
      m.sB || 0,
      m.ch || 0,
    ].join('|') : '';
    const changedVisible = sigOf(existing) !== sigOf(final);

    localStorage.setItem('cdd_match_' + lmId, JSON.stringify(final));
    localStorage.setItem('cdd_match_current', lmId);
    return { ok: true, changed: changedVisible };
  } catch (e) {
    console.warn('[liveMatch] _applyCloudMatchToLocal failed', e.message);
    return { ok: false, changed: false };
  }
}

// ─── WATCH TEMPS RÉEL d'une équipe → propagation événementielle "match en cours" ───
// Fix complémentaire 2026-05-26 du commit 6f98c0e : ajoute la réactivité.
//
// Avant : le téléphone ne voyait le match du PC qu'au prochain pullCloudData
// (login/refresh manuel) ou au tick 10s s'il était déjà loggé. Pas de
// rattrapage automatique au coup d'envoi.
//
// Après : onSnapshot permanent sur teams/{teamId}. À chaque event Firestore
// (coup d'envoi par le coach, but, carton, fin de match), le téléphone réagit
// en <2s et propage l'état au localStorage + dispatch cdd-data-rebuilt.
//
// IMPORTANT : onSnapshot ne déclenche QUE quand le doc team change. Le tick
// 10s du coach (filet de sécurité) génère 1 read/10s pendant un match — coût
// négligeable. Pas de "live tic-tac chez le téléphone" : on propage les
// changements discrets, pas un fil minute par minute (volonté Florian).
//
// Retourne une fonction unsubscribe pour cleanup au unmount.
function watchTeamLiveMatch(teamId) {
  if (!db || !teamId) return () => {};
  let lastSeenMatchId = null;
  try {
    const cur = localStorage.getItem('cdd_match_current');
    if (cur) lastSeenMatchId = String(cur);
  } catch (e) {}
  return onSnapshot(
    doc(db, 'teams', String(teamId)),
    async (snap) => {
      if (!snap.exists()) return;
      const team = snap.data();
      const lm = team && team.liveMatch;
      const cloudMatchId = (lm && lm.matchId) ? String(lm.matchId) : null;

      // ── CAS 1 : match en cours détecté côté cloud ──────────────────
      if (cloudMatchId) {
        // Anti-fantôme : "started > 6h" = match abandonné, on ignore.
        const startedMs = (lm && typeof lm.startedAt === 'number') ? lm.startedAt : 0;
        const SIX_H = 6 * 60 * 60 * 1000;
        if (startedMs && (Date.now() - startedMs) > SIX_H) return;

        // Fetch + applique en local si nouveau OU si update (score/event)
        const matchDoc = await fetchMatch(cloudMatchId).catch(() => null);
        if (!matchDoc) return;
        const res = _applyCloudMatchToLocal(matchDoc, teamId, team.clubId);
        if (res && res.ok) {
          const isNew = lastSeenMatchId !== cloudMatchId;
          lastSeenMatchId = cloudMatchId;
          // Dispatch uniquement si NOUVEAU match ou si changement visible.
          // Évite le clignotement à chaque snapshot 10s (chrono cloud avance
          // mais rien de visible côté UI ne change).
          if (isNew) {
            console.info('[liveMatch:watch] ✓ NOUVEAU match en cours :', cloudMatchId, 'team', teamId);
            try { window.dispatchEvent(new CustomEvent('cdd-data-rebuilt')); } catch (e) {}
          } else if (res.changed) {
            console.info('[liveMatch:watch] ↻ update match :', cloudMatchId,
              'score', matchDoc.teamA && matchDoc.teamA.score, '-', matchDoc.teamB && matchDoc.teamB.score);
            try { window.dispatchEvent(new CustomEvent('cdd-data-rebuilt')); } catch (e) {}
          }
          // sinon : snapshot sans changement visible → silencieux
        }
        return;
      }

      // ── CAS 2 : team.liveMatch effacé côté cloud (fin de match) ────
      if (!cloudMatchId && lastSeenMatchId) {
        console.info('[liveMatch:watch] ✓ match terminé côté cloud, cleanup local :', lastSeenMatchId);
        try {
          const finishedId = lastSeenMatchId;
          // Pose le marker post-match pour que le suivant prenne la place
          localStorage.setItem('cdd_match_last_finished', finishedId);
          // Retire le pointeur courant
          const cur = localStorage.getItem('cdd_match_current');
          if (cur && String(cur) === finishedId) {
            localStorage.removeItem('cdd_match_current');
          }
        } catch (e) {}
        lastSeenMatchId = null;
        try { window.dispatchEvent(new CustomEvent('cdd-data-rebuilt')); } catch (e) {}
      }
    },
    (err) => {
      console.warn('[liveMatch:watch] erreur onSnapshot team', teamId, ':', err.message);
      // Bascule l'indicateur 🟢→🔴 pour signaler la coupure (ad-blocker, 3G…)
      _setSyncStatus({ ok: false, lastError: 'watch: ' + err.message });
    }
  );
}

// Liste les matchs TERMINÉS du club depuis Firestore (fix cross-device 2026-05-26).
// Remplace le scan localStorage de listCoachFinishedMatches() côté UI : ainsi
// l'historique "Derniers matchs" est identique sur tous les devices (PC, tél, etc.).
//
// Stratégie de query : un seul where('clubId', '==') pour éviter tout index
// composite Firestore. Le filtre status='finished' et le tri endedAt desc se
// font côté client. À l'échelle d'un club amateur (<200 matchs / saison), c'est
// largement supportable.
//
// Retourne `null` (et pas []) en cas d'erreur ou offline → signal au caller
// pour qu'il garde silencieusement les données localStorage (mode dégradé).
async function fetchFinishedMatches(clubId, limitN) {
  if (!db || !clubId) return null;
  const cap = limitN || 20;
  try {
    const q = query(collection(db, COLL_MATCHES), where('clubId', '==', String(clubId)));
    const snap = await getDocs(q);
    const docs = [];
    snap.forEach(d => {
      const data = d.data();
      if (data && data.status === 'finished') docs.push(data);
    });
    docs.sort((a, b) => {
      const aEnd = a.endedAt || (a.savedAt && a.savedAt.toMillis ? a.savedAt.toMillis() : 0);
      const bEnd = b.endedAt || (b.savedAt && b.savedAt.toMillis ? b.savedAt.toMillis() : 0);
      return bEnd - aEnd;
    });
    return docs.slice(0, cap);
  } catch (e) {
    console.warn('[fetchFinishedMatches] erreur cloud (fallback localStorage):', e.message);
    return null;
  }
}

async function savePlayer(player, teamId, clubId) {
  if (!db || !player || !player.id) throw new Error('db/player.id requis');
  await setDoc(doc(db, 'players', String(player.id)), {
    ...player,
    teamId: teamId || player.teamId || null,
    clubId: clubId || player.clubId || null,
    updatedBy: _uid(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
  return { ok: true, id: player.id };
}

// Supprime définitivement un joueur (doc players/{id}). Le nettoyage des
// références (compo, convoc) est géré côté client (orphelins filtrés).
async function deletePlayer(playerId) {
  if (!db || !playerId) throw new Error('db/playerId requis');
  await deleteDoc(doc(db, 'players', String(playerId)));
  return { ok: true, id: playerId };
}

// Sauvegarde les stats overrides d'un joueur dans son doc Firestore.
// statsObj = { PAC, SHO, PAS, DRI, DEF, PHY } ou null pour effacer.
async function savePlayerStats(playerId, statsObj) {
  if (!db || !playerId) return { ok: false, reason: 'no-db' };
  await setDoc(doc(db, 'players', String(playerId)), {
    statsOverride: statsObj || null,
    statsUpdatedAt: serverTimestamp(),
    updatedBy: _uid(),
  }, { merge: true });
  return { ok: true };
}

// ─── Images : compression + persistance en base64 dans Firestore ────────────
// Compromis plan Spark (gratuit) : pas de Firebase Storage. On compresse les
// images côté navigateur (Canvas API) et on les stocke en base64 dans le doc
// Firestore (limite 1 Mo/doc). Avec maxDim=400 et quality=0.75, un visage
// pèse ~40-80 Ko — bien en dessous de la limite, sync OK entre appareils.
async function compressImageFile(file, maxDim, quality) {
  if (!file) throw new Error('Aucun fichier fourni');
  const readAsDataUrl = (f) => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error || new Error('Lecture fichier échouée'));
    r.readAsDataURL(f);
  });
  const loadImg = (src) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = () => reject(new Error('Image illisible'));
    img.src = src;
  });
  const dataUrl = await readAsDataUrl(file);
  const img = await loadImg(dataUrl);
  let w = img.width, h = img.height;
  if (w > maxDim || h > maxDim) {
    if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
    else       { w = Math.round(w * maxDim / h); h = maxDim; }
  }
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  // Fond blanc pour les PNG transparents (JPEG ne supporte pas l'alpha).
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', quality);
}
window.CDD_compressImage = compressImageFile;

// Sauvegarde le logo d'un club en base64 dans son doc Firestore (champ
// `logoUrl`). dataUrl=null → efface le logo.
async function saveClubLogoBase64(clubId, dataUrl) {
  if (!db || !clubId) return { ok: false, reason: 'no-db' };
  await setDoc(doc(db, 'clubs', String(clubId)), {
    logoUrl: dataUrl || null,
    updatedBy: _uid(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
  return { ok: true };
}

// ─── Firebase Storage — DORMANT (plan Spark ne supporte pas Storage) ────────
// Code conservé pour une future bascule sur plan Blaze : il suffira de
// rebrancher l'appel depuis screen-onb-set.jsx et screen-match-fiche.jsx.

// Uploade le logo d'un club dans Firebase Storage et sauvegarde l'URL dans
// le doc Firestore du club. Accepte un objet File (input file, pas de base64).
async function uploadClubLogo(clubId, file) {
  if (!storage || !db || !clubId || !file) return { ok: false, reason: 'no-storage' };
  const sRef = storageRef(storage, `clubs/${clubId}/logo`);
  const snap = await uploadBytes(sRef, file, { contentType: file.type || 'image/jpeg' });
  const url = await getDownloadURL(snap.ref);
  await setDoc(doc(db, 'clubs', String(clubId)), {
    logoUrl: url, updatedBy: _uid(), updatedAt: serverTimestamp(),
  }, { merge: true });
  return { ok: true, url };
}

// Supprime le logo d'un club de Storage et efface l'URL dans Firestore.
async function deleteClubLogo(clubId) {
  if (!clubId) return { ok: false };
  if (storage) {
    try { await deleteObject(storageRef(storage, `clubs/${clubId}/logo`)); } catch (e) {}
  }
  if (db) {
    await setDoc(doc(db, 'clubs', String(clubId)), {
      logoUrl: null, updatedBy: _uid(), updatedAt: serverTimestamp(),
    }, { merge: true });
  }
  return { ok: true };
}

// Uploade la photo d'un joueur dans Firebase Storage et sauvegarde l'URL.
async function uploadPlayerPhoto(playerId, file) {
  if (!storage || !db || !playerId || !file) return { ok: false, reason: 'no-storage' };
  const sRef = storageRef(storage, `players/${playerId}/photo`);
  const snap = await uploadBytes(sRef, file, { contentType: file.type || 'image/jpeg' });
  const url = await getDownloadURL(snap.ref);
  await setDoc(doc(db, 'players', String(playerId)), {
    photoUrl: url, updatedBy: _uid(), updatedAt: serverTimestamp(),
  }, { merge: true });
  return { ok: true, url };
}

// Sauvegarde l'historique de progression par match d'un joueur.
// deltasObj = { [matchId]: { PAC, SHO, PAS, DRI, DEF, PHY, goals, … } }
async function savePlayerPerfDeltas(playerId, deltasObj) {
  if (!db || !playerId) return { ok: false, reason: 'no-db' };
  await setDoc(doc(db, 'players', String(playerId)), {
    perfDeltasOverride: deltasObj && Object.keys(deltasObj).length ? deltasObj : null,
    perfDeltasUpdatedAt: serverTimestamp(),
    updatedBy: _uid(),
  }, { merge: true });
  return { ok: true };
}

// Sauvegarde le profil d'un joueur (poste, licence, taille, pied, contacts…
// et photoDataUrl compressée). On compresse côté UI (compressImageFile) avant
// d'appeler ce save, pour rester sous la limite 1 Mo/doc Firestore.
async function savePlayerProfile(playerId, profileObj) {
  if (!db || !playerId) return { ok: false, reason: 'no-db' };
  const forCloud = (profileObj && typeof profileObj === 'object' && Object.keys(profileObj).length)
    ? profileObj : null;
  await setDoc(doc(db, 'players', String(playerId)), {
    profileOverride: forCloud,
    profileUpdatedAt: serverTimestamp(),
    updatedBy: _uid(),
  }, { merge: true });
  return { ok: true };
}

// Sauvegarde la compo type (lineup template) d'une équipe dans son doc
// Firestore. Inclut starters (map slot→pid), bench (array), reserve (array),
// formation. Source de vérité partagée entre tous les comptes du club :
// coach principal, adjoint, parents, joueurs, lecteurs voient la MÊME
// compo. Sans ça, chaque appareil avait sa propre compo locale, divergeant.
// Idée originale Florian 2026-05-23 : « la compo doit être dans le cloud ».
async function saveLineupTemplate(teamId, lineupObj) {
  if (!db || !teamId) return { ok: false, reason: 'no-db' };
  await setDoc(doc(db, 'teams', String(teamId)), {
    lineupTemplate: lineupObj || null,
    lineupUpdatedAt: serverTimestamp(),
    updatedBy: _uid(),
  }, { merge: true });
  return { ok: true };
}

// ─── Compo de MATCH (refonte 2026-05-23, Phase 1A) ───────────────────
// Architecture : la compo TYPE saison (lineupTemplate) reste figée comme
// référence. Chaque match a SA propre compo (titulaires + banc) qui peut
// diverger : un blessé, un test tactique, un match amical. Cette compo
// match est stockée séparément, pour ne pas polluer la compo type.
//
// Storage :
//   • Local : cdd_match_lineup[teamId][matchId] = { formation, starters, bench, reserve, updatedAt }
//   • Cloud : collection match_lineups, id = `{teamId}_{matchId}`
//
// Convention id : on inclut le teamId pour permettre la requête « toutes
// les compos de match de mon équipe » via where('teamId', '==', ...).

async function saveMatchLineup(teamId, matchId, lineupObj, clubId) {
  if (!db || !teamId || !matchId) return { ok: false, reason: 'no-db' };
  const id = String(teamId) + '_' + String(matchId);
  await setDoc(doc(db, 'match_lineups', id), {
    teamId: String(teamId),
    matchId: String(matchId),
    clubId: clubId ? String(clubId) : null,
    lineup: lineupObj || null,
    updatedAt: serverTimestamp(),
    updatedBy: _uid(),
  }, { merge: true });
  return { ok: true };
}

// Récupère toutes les compos de match d'un club. Lecture autorisée à tout
// membre du club (firestore.rules → match_lineups read = canReadClub).
async function fetchMatchLineups(clubId) {
  if (!db || !clubId) return [];
  const q = query(collection(db, 'match_lineups'), where('clubId', '==', String(clubId)));
  const snap = await getDocs(q);
  const out = [];
  snap.forEach(d => out.push({ id: d.id, ...d.data() }));
  return out;
}

// Supprime une compo de match (utilisé quand le coach veut « revenir à la
// compo type pure » pour un match).
async function deleteMatchLineup(teamId, matchId) {
  if (!db || !teamId || !matchId) return { ok: false };
  const id = String(teamId) + '_' + String(matchId);
  try { await deleteDoc(doc(db, 'match_lineups', id)); } catch (e) {}
  return { ok: true };
}

// ─── Infos pratiques du match (stade, horaires, covoit, notes) ───
// Storage local : cdd_match_info[teamId][matchId] (voir match-info.js)
// Cloud : collection match_infos, id = `{teamId}_{matchId}`
async function saveMatchInfo(teamId, matchId, infoObj, clubId) {
  if (!db || !teamId || !matchId) return { ok: false, reason: 'no-db' };
  const id = String(teamId) + '_' + String(matchId);
  await setDoc(doc(db, 'match_infos', id), {
    teamId: String(teamId),
    matchId: String(matchId),
    clubId: clubId ? String(clubId) : null,
    info: infoObj || null,
    updatedAt: serverTimestamp(),
    updatedBy: _uid(),
  }, { merge: true });
  return { ok: true };
}
async function fetchMatchInfos(clubId) {
  if (!db || !clubId) return [];
  const q = query(collection(db, 'match_infos'), where('clubId', '==', String(clubId)));
  const snap = await getDocs(q);
  const out = [];
  snap.forEach(d => out.push({ id: d.id, ...d.data() }));
  return out;
}
async function deleteMatchInfo(teamId, matchId) {
  if (!db || !teamId || !matchId) return { ok: false };
  const id = String(teamId) + '_' + String(matchId);
  try { await deleteDoc(doc(db, 'match_infos', id)); } catch (e) {}
  return { ok: true };
}

// ─── Numéros de maillot match-specific ───
// Storage local : cdd_match_jersey_numbers[teamId][matchId][playerId] = num
//   (voir jersey-numbers.js)
// Cloud : collection match_jerseys, id = `{teamId}_{matchId}`,
//   doc.jerseys = { [playerId]: num }
async function saveJerseyNumbers(teamId, matchId, jerseysMap, clubId) {
  if (!db || !teamId || !matchId) return { ok: false, reason: 'no-db' };
  const id = String(teamId) + '_' + String(matchId);
  await setDoc(doc(db, 'match_jerseys', id), {
    teamId: String(teamId),
    matchId: String(matchId),
    clubId: clubId ? String(clubId) : null,
    jerseys: jerseysMap || {},
    updatedAt: serverTimestamp(),
    updatedBy: _uid(),
  }, { merge: false }); // merge: false → écrase complètement, sinon les pids supprimés persistent
  return { ok: true };
}
async function fetchJerseyNumbers(clubId) {
  if (!db || !clubId) return [];
  const q = query(collection(db, 'match_jerseys'), where('clubId', '==', String(clubId)));
  const snap = await getDocs(q);
  const out = [];
  snap.forEach(d => out.push({ id: d.id, ...d.data() }));
  return out;
}
async function deleteJerseyNumbers(teamId, matchId) {
  if (!db || !teamId || !matchId) return { ok: false };
  const id = String(teamId) + '_' + String(matchId);
  try { await deleteDoc(doc(db, 'match_jerseys', id)); } catch (e) {}
  return { ok: true };
}

// ─── Matchs amicaux (hors-championnat) ───
// Storage local : cdd_friendly_matches[teamId][] (voir friendly-matches.js).
// Cloud : collection friendly_matches, id = match.id (préfixe 'fr_*').
async function saveFriendlyMatch(match) {
  if (!db || !match || !match.id || !match.teamId) return { ok: false, reason: 'no-db' };
  const payload = {
    id: String(match.id),
    teamId: String(match.teamId),
    clubId: match.clubId ? String(match.clubId) : null,
    date: match.date || '',
    time: match.time || '',
    opponent: match.opponent || '',
    venue: match.venue || 'H',
    isAmical: true,
    updatedAt: serverTimestamp(),
    updatedBy: _uid(),
  };
  // FIX 2026-05-26 : endedAt manquait → un match terminé sur un device
  // continuait d'apparaître "à venir" sur les autres devices car ce champ
  // n'était jamais propagé au cloud (et donc jamais relu non plus).
  if (typeof match.endedAt === 'number') payload.endedAt = match.endedAt;
  await setDoc(doc(db, 'friendly_matches', String(match.id)), payload, { merge: true });
  return { ok: true };
}
async function fetchFriendlyMatches(clubId) {
  if (!db || !clubId) return [];
  const q = query(collection(db, 'friendly_matches'), where('clubId', '==', String(clubId)));
  const snap = await getDocs(q);
  const out = [];
  snap.forEach(d => out.push({ id: d.id, ...d.data() }));
  return out;
}
async function deleteFriendlyMatch(matchId) {
  if (!db || !matchId) return { ok: false };
  try { await deleteDoc(doc(db, 'friendly_matches', String(matchId))); } catch (e) {}
  return { ok: true };
}

// ─── Profil coach (carte de visite partageable) ───
// Storage local : cdd_coach_profile_{uid} (voir coach-profile.js).
// Cloud : collection coach_profiles, id = uid.
// LECTURE PUBLIQUE (un parent peut consulter via ?coach=UID sans login).
// Écriture : un user édite uniquement SON propre profil (request.auth.uid == uid).
async function saveCoachProfile(uid, profile) {
  if (!db || !uid) return { ok: false, reason: 'no-db' };
  await setDoc(doc(db, 'coach_profiles', String(uid)), {
    ...profile,
    uid: String(uid),
    updatedAt: serverTimestamp(),
  }, { merge: true });
  return { ok: true };
}
async function fetchCoachProfile(uid) {
  if (!db || !uid) return null;
  try {
    const snap = await getDoc(doc(db, 'coach_profiles', String(uid)));
    return snap.exists() ? snap.data() : null;
  } catch (e) { console.warn('[coach-profile] fetch', e.message); return null; }
}
async function deleteCoachProfile(uid) {
  if (!db || !uid) return { ok: false };
  try { await deleteDoc(doc(db, 'coach_profiles', String(uid))); } catch (e) {}
  return { ok: true };
}

// Push EN BLOC de tous les overrides locaux (stats, profils, notes, perf
// deltas) vers Firestore. Utile pour les cas où le coach a édité des
// joueurs avant que la sync Firestore n'existe (overrides pre-v62) — ces
// modifs n'ont jamais été propagées au cloud, donc les adjoints/parents
// voient des données différentes.
//
// Déclenché automatiquement :
//   • à la génération d'une invitation (le coach va partager → on s'assure
//     que le cloud est à jour avant de donner accès à un nouveau membre)
//   • manuellement depuis Réglages → DONNÉES → « Pousser mes données »
//
// Throttle : 5 minutes minimum entre 2 pushes globaux (anti-spam Firestore
// quand le coach génère plusieurs invitations d'affilée). force=true pour
// court-circuiter le throttle (bouton manuel).
const PUSH_ALL_THROTTLE_MS = 5 * 60 * 1000;
const PUSH_ALL_KEY = 'cdd_last_global_push_at';
let _pushAllRunning = false;

async function pushAllLocalOverrides(opts) {
  const force = opts && opts.force === true;
  if (!db) return { ok: false, reason: 'no-db' };
  if (!auth || !auth.currentUser) return { ok: false, reason: 'not-signed-in' };
  if (_pushAllRunning) return { ok: false, reason: 'already-running' };

  // Throttle : sauf force, on saute si < 5 min depuis le dernier push.
  if (!force) {
    try {
      const last = parseInt(localStorage.getItem(PUSH_ALL_KEY) || '0', 10);
      if (last && Date.now() - last < PUSH_ALL_THROTTLE_MS) {
        return { ok: true, skipped: 'throttled', lastAt: last };
      }
    } catch (e) {}
  }

  _pushAllRunning = true;
  const counts = { stats: 0, profiles: 0, notes: 0, perfDeltas: 0, errors: 0 };
  try {
    // 1) Stats overrides
    try {
      const all = JSON.parse(localStorage.getItem('cdd_player_stats_override') || '{}');
      for (const pid of Object.keys(all)) {
        try { await savePlayerStats(pid, all[pid]); counts.stats++; }
        catch (e) { counts.errors++; console.warn('[pushAll] stats', pid, e.message); }
      }
    } catch (e) {}
    // 2) Profil overrides (poste, alt-positions, photo compressée, contacts…)
    try {
      const all = JSON.parse(localStorage.getItem('cdd_player_profile') || '{}');
      for (const pid of Object.keys(all)) {
        try { await savePlayerProfile(pid, all[pid]); counts.profiles++; }
        catch (e) { counts.errors++; console.warn('[pushAll] profile', pid, e.message); }
      }
    } catch (e) {}
    // 3) Notes / observations
    try {
      const all = JSON.parse(localStorage.getItem('cdd_player_notes') || '{}');
      for (const pid of Object.keys(all)) {
        try { await savePlayerNotes(pid, all[pid]); counts.notes++; }
        catch (e) { counts.errors++; console.warn('[pushAll] notes', pid, e.message); }
      }
    } catch (e) {}
    // 4) Performance deltas par match
    try {
      const all = JSON.parse(localStorage.getItem('cdd_player_perf_deltas') || '{}');
      for (const pid of Object.keys(all)) {
        try { await savePlayerPerfDeltas(pid, all[pid]); counts.perfDeltas++; }
        catch (e) { counts.errors++; console.warn('[pushAll] perfDeltas', pid, e.message); }
      }
    } catch (e) {}
    // 5) Compo type (lineup template) — partagée avec adjoints/parents/etc.
    try {
      const all = JSON.parse(localStorage.getItem('cdd_lineup_template') || '{}');
      counts.lineups = 0;
      for (const tid of Object.keys(all)) {
        try { await saveLineupTemplate(tid, all[tid]); counts.lineups++; }
        catch (e) { counts.errors++; console.warn('[pushAll] lineup', tid, e.message); }
      }
    } catch (e) {}
    try { localStorage.setItem(PUSH_ALL_KEY, String(Date.now())); } catch (e) {}
    console.info('%c[cddData] push global overrides terminé', 'color:#c8f169;font-weight:900', counts);
    return { ok: true, counts };
  } finally {
    _pushAllRunning = false;
  }
}

// Sauvegarde les notes/observations d'un joueur.
async function savePlayerNotes(playerId, notesArr) {
  if (!db || !playerId) return { ok: false, reason: 'no-db' };
  await setDoc(doc(db, 'players', String(playerId)), {
    notesOverride: Array.isArray(notesArr) && notesArr.length ? notesArr : null,
    notesUpdatedAt: serverTimestamp(),
    updatedBy: _uid(),
  }, { merge: true });
  return { ok: true };
}

// Membership — id imposé = {uid}_{clubId} (cf firestore.rules).
// Phase D : un rôle PAR ÉQUIPE — la membership porte une map `teams`
// { [teamId]: { role, playerId? } } + un standing club-level dénormalisé
// `clubRole` (owner/coach si présent dans la map, sinon '').
//
// Deux signatures acceptées :
//   saveMembership({ uid, clubId, teams: { [tid]: {role, playerId} }, clubRole? })
//     → nouveau format, recommandé.
//   saveMembership({ uid, clubId, teamId, role, playerId? })
//     → ancien format, normalisé en interne en teams: {[teamId]:{role,playerId}}.
//
// setDoc(..., {merge:true}) : Firestore fusionne PROFONDÉMENT la map `teams`,
// donc ajouter une équipe ne touche pas les autres. Pour SUPPRIMER une
// équipe, utiliser removeTeamMembership().
//
// inviteToken (optionnel) : présent lors d'une auto-création depuis une
// invitation — les règles Firestore le lisent pour autoriser l'écriture
// (cf. firestore.rules → createMatchesInvite / updateMatchesInvite).
async function saveMembership(m) {
  if (!db || !m || !m.uid || !m.clubId) throw new Error('db/uid/clubId requis');
  const id = m.uid + '_' + m.clubId;

  // Normalisation : map `teams` à partir du nouveau ou de l'ancien format.
  let teams = (m.teams && typeof m.teams === 'object') ? { ...m.teams } : {};
  if (m.teamId && m.role) {
    teams[m.teamId] = {
      role: m.role,
      playerId: m.playerId || null,
    };
  }
  // Nettoyage : strip des entrées sans rôle.
  Object.keys(teams).forEach(tid => {
    if (!teams[tid] || !teams[tid].role) delete teams[tid];
  });

  // clubRole : standing club-level. Forcé à '' pour les rattachements par
  // invitation (les règles refusent owner/admin/coach via lien). Sinon
  // dérivé : owner > coach > '' selon les rôles présents dans la map.
  let clubRole = m.clubRole;
  if (typeof clubRole !== 'string') {
    const roles = Object.values(teams).map(t => t && t.role).filter(Boolean);
    if (roles.includes('owner'))      clubRole = 'owner';
    else if (roles.includes('coach')) clubRole = 'coach';
    else                              clubRole = '';
  }

  const payload = {
    uid: m.uid,
    email: (m.email || '').toLowerCase(),
    clubId: m.clubId,
    clubRole,
    teams,
    createdBy: m.createdBy || _uid(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (m.displayName) payload.displayName = m.displayName;
  if (m.inviteToken) payload.inviteToken = m.inviteToken;
  await setDoc(doc(db, 'memberships', id), payload, { merge: true });
  return { ok: true, id };
}

// Retire UNE équipe de la map `teams` d'une membership existante (et
// recalcule clubRole). Utile pour révoquer un coach principal sans
// détruire les autres rattachements du même utilisateur sur le club.
async function removeTeamMembership(uid, clubId, teamId) {
  if (!db || !uid || !clubId || !teamId) throw new Error('uid/clubId/teamId requis');
  const id = uid + '_' + clubId;
  const ref = doc(db, 'memberships', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { ok: false, reason: 'not-found' };
  const data = snap.data() || {};
  const teams = { ...(data.teams || {}) };
  if (!(teamId in teams)) return { ok: true, noop: true };
  const remaining = Object.keys(teams).filter(k => k !== teamId);
  // Si plus aucune équipe → on supprime la membership entière.
  if (remaining.length === 0) {
    await deleteDoc(ref);
    return { ok: true, deleted: true };
  }
  // Recalcule clubRole sur les rôles restants.
  const rolesLeft = remaining.map(k => teams[k] && teams[k].role).filter(Boolean);
  let clubRole = '';
  if (rolesLeft.includes('owner'))      clubRole = 'owner';
  else if (rolesLeft.includes('coach')) clubRole = 'coach';
  await updateDoc(ref, {
    ['teams.' + teamId]: deleteField(),
    clubRole,
    updatedAt: serverTimestamp(),
  });
  return { ok: true };
}

// ─── Lecture ───────────────────────────────────────────────
async function fetchMemberships(uid) {
  if (!db) return [];
  const targetUid = uid || _uid();
  if (!targetUid) return [];
  const q = query(collection(db, 'memberships'), where('uid', '==', targetUid));
  const snap = await getDocs(q);
  const out = [];
  snap.forEach(d => out.push({ id: d.id, ...d.data() }));
  return out;
}

// Toutes les memberships d'un club — pour l'écran « membres du club ».
// Lisible uniquement par un coach principal/owner/admin du club (firestore
// .rules → memberships read = canEditClub). Un adjoint ou un parent qui
// appelle ça recevra une erreur permission-denied : c'est voulu.
async function fetchClubMemberships(clubId) {
  if (!db || !clubId) return [];
  const q = query(collection(db, 'memberships'), where('clubId', '==', clubId));
  const snap = await getDocs(q);
  const out = [];
  snap.forEach(d => out.push({ id: d.id, ...d.data() }));
  return out;
}

async function fetchClub(clubId) {
  if (!db || !clubId) return null;
  const d = await getDoc(doc(db, 'clubs', clubId));
  return d.exists() ? { id: d.id, ...d.data() } : null;
}

async function fetchTeams(clubId) {
  if (!db || !clubId) return [];
  const q = query(collection(db, 'teams'), where('clubId', '==', clubId));
  const snap = await getDocs(q);
  const out = [];
  snap.forEach(d => out.push({ id: d.id, ...d.data() }));
  return out;
}

async function fetchPlayers(clubId) {
  if (!db || !clubId) return [];
  const q = query(collection(db, 'players'), where('clubId', '==', clubId));
  const snap = await getDocs(q);
  const out = [];
  snap.forEach(d => out.push({ id: d.id, ...d.data() }));
  return out;
}

// ─── Admin : lecture globale + assignation coach principal ──
// Phase D — utilisé par le panneau admin clubs/équipes. Lecture autorisée
// pour l'admin uniquement (firestore.rules → canReadClub = isAdmin() || ...).
async function fetchAllClubs() {
  if (!db) return [];
  const snap = await getDocs(collection(db, 'clubs'));
  const out = [];
  snap.forEach(d => out.push({ id: d.id, ...d.data() }));
  return out;
}

// Recherche l'uid d'un utilisateur via une de ses memberships connues
// (lecture autorisée si admin ou coach manager d'un club partagé). Renvoie
// null si la personne n'a encore JAMAIS eu de membership.
async function findUidByEmail(email) {
  if (!db || !email) return null;
  const targetEmail = String(email).trim().toLowerCase();
  if (!targetEmail) return null;
  const snap = await getDocs(query(
    collection(db, 'memberships'),
    where('email', '==', targetEmail)
  ));
  let uid = null;
  snap.forEach(d => { if (!uid) uid = (d.data() || {}).uid || null; });
  return uid;
}

// Admin (D5) — Migre les memberships encore au format plat (Phase C) vers
// le format Phase D (clubRole + teams). Idempotente : les memberships déjà
// au nouveau format sont ignorées.
//
// Stratégie de mapping :
//   role:'admin'/'owner' (sans teamId) → clubRole=role, teams={}
//   role:'coach' (sans teamId) :
//     - 1 seule équipe dans le club → teams={[onlyTeam]:{role:'coach'}}, clubRole='coach'
//     - plusieurs équipes → on attribue 'coach' à TOUTES (préserve le standing
//       Phase C qui signifiait « coach principal du club entier »). L'admin
//       affine ensuite via le panneau.
//     - aucune équipe dans le club → clubRole='coach', teams={}
//   role:'adjoint'/'parent'/'joueur'/'lecteur' avec teamId connu →
//     teams={[teamId]:{role, playerId?}}, clubRole=''
//   Sans teamId ni rôle club → skip + log (impossible à mapper sûrement).
//
// Renvoie { ok, counts: { converted, skipped, errors, alreadyOk } }.
async function migrateMembershipsToTeamsModel() {
  if (!db) return { ok: false, reason: 'no-db' };
  const email = _email();
  if (email !== ADMIN_EMAIL_DATA) return { ok: false, reason: 'not-admin' };

  const counts = { converted: 0, skipped: 0, errors: 0, alreadyOk: 0 };
  const skipped = [];

  let clubs;
  try { clubs = await fetchAllClubs(); }
  catch (e) { return { ok: false, reason: 'fetch-clubs-failed', error: e.message }; }

  for (const club of clubs) {
    let teamsOfClub = [];
    try { teamsOfClub = await fetchTeams(club.id); }
    catch (e) { console.warn('[migrate] teams', club.id, e.message); }

    let memberships = [];
    try { memberships = await fetchClubMemberships(club.id); }
    catch (e) { console.warn('[migrate] memberships', club.id, e.message); counts.errors++; continue; }

    for (const m of memberships) {
      // Déjà au nouveau format : ne pas écraser.
      if (m.teams && typeof m.teams === 'object' && !Array.isArray(m.teams)
          && Object.keys(m.teams).length > 0) {
        counts.alreadyOk++; continue;
      }
      // Cas owner/admin sans teamId : clubRole + teams vide suffit.
      if (m.role === 'owner' || m.role === 'admin') {
        try {
          await updateDoc(doc(db, 'memberships', m.id), {
            clubRole: m.role,
            teams: {},
            role: deleteField(),
            teamId: deleteField(),
            playerId: deleteField(),
            updatedAt: serverTimestamp(),
          });
          counts.converted++;
        } catch (e) { counts.errors++; console.warn('[migrate]', m.id, e.message); }
        continue;
      }
      // Cas coach plat : on étend à toutes les équipes du club (ou à
      // l'unique équipe), pour préserver le standing « coach principal
      // du club entier » de Phase C.
      if (m.role === 'coach') {
        const teamsMap = {};
        for (const t of teamsOfClub) teamsMap[t.id] = { role: 'coach' };
        try {
          await updateDoc(doc(db, 'memberships', m.id), {
            clubRole: 'coach',
            teams: teamsMap,
            role: deleteField(),
            teamId: deleteField(),
            playerId: deleteField(),
            updatedAt: serverTimestamp(),
          });
          counts.converted++;
        } catch (e) { counts.errors++; console.warn('[migrate]', m.id, e.message); }
        continue;
      }
      // Cas adjoint/parent/joueur/lecteur avec teamId connu.
      if (['adjoint', 'parent', 'joueur', 'lecteur'].includes(m.role) && m.teamId) {
        const entry = { role: m.role };
        if (m.playerId) entry.playerId = m.playerId;
        try {
          await updateDoc(doc(db, 'memberships', m.id), {
            clubRole: '',
            teams: { [m.teamId]: entry },
            role: deleteField(),
            teamId: deleteField(),
            playerId: deleteField(),
            updatedAt: serverTimestamp(),
          });
          counts.converted++;
        } catch (e) { counts.errors++; console.warn('[migrate]', m.id, e.message); }
        continue;
      }
      // Cas impossible à mapper sûrement.
      counts.skipped++;
      skipped.push({ id: m.id, role: m.role, reason: 'no-teamId-and-not-club-wide' });
    }
  }
  if (skipped.length) console.warn('[migrate] memberships non migrés :', skipped);
  return { ok: true, counts, skipped };
}

// Admin : assigne un coach principal sur UNE équipe. Pose `teams[teamId]`
// avec role='coach' et `clubRole='coach'`. Si la personne avait déjà une
// membership sur ce club (ex. adjoint sur une autre équipe), on AJOUTE
// l'équipe sans toucher aux autres (merge profond).
async function assignTeamCoach(opts) {
  if (!db) throw new Error('Service cloud indisponible');
  const o = opts || {};
  if (!o.uid)     throw new Error('uid requis (cherche-le via findUidByEmail).');
  if (!o.clubId)  throw new Error('clubId requis.');
  if (!o.teamId)  throw new Error('teamId requis.');
  await saveMembership({
    uid: o.uid,
    email: o.email || '',
    clubId: o.clubId,
    teams: { [o.teamId]: { role: 'coach' } },
    clubRole: 'coach',
    createdBy: _uid(),
  });
  return { ok: true };
}

// Transfère le rôle de coach principal d'une équipe d'une personne à une
// autre, en une transaction atomique (writeBatch). L'ancien coach est
// rétrogradé (par défaut « adjoint ») ou retiré de l'équipe selon
// `demoteToRole`. La cible DOIT déjà être rattachée à l'équipe.
//
// Sécurité : l'utilisateur appelant doit avoir canManageClub (donc être
// coach principal ou owner/admin). Les rules Firestore autorisent les
// updates de membership pour ces rôles.
//
// opts = { fromUid, toUid, clubId, teamId, demoteToRole? }
//   demoteToRole : 'adjoint' (défaut), 'lecteur', ou 'none' (retirer l'équipe)
async function transferTeamCoach(opts) {
  if (!db) throw new Error('Service cloud indisponible');
  const o = opts || {};
  if (!o.fromUid || !o.toUid || !o.clubId || !o.teamId) {
    throw new Error('fromUid/toUid/clubId/teamId requis');
  }
  if (o.fromUid === o.toUid) {
    throw new Error('Source et cible identiques — pas de transfert possible.');
  }
  const demoteToRole = o.demoteToRole || 'adjoint';

  const fromRef = doc(db, 'memberships', o.fromUid + '_' + o.clubId);
  const toRef   = doc(db, 'memberships', o.toUid   + '_' + o.clubId);

  const [fromSnap, toSnap] = await Promise.all([getDoc(fromRef), getDoc(toRef)]);
  if (!fromSnap.exists()) throw new Error('Coach actuel introuvable côté cloud.');
  if (!toSnap.exists())   throw new Error('La cible doit déjà être rattachée à l\'équipe (génère-lui d\'abord un lien d\'invitation).');

  const fromData  = fromSnap.data() || {};
  const toData    = toSnap.data()   || {};
  const fromTeams = (fromData.teams && typeof fromData.teams === 'object') ? { ...fromData.teams } : {};
  const toTeams   = (toData.teams   && typeof toData.teams   === 'object') ? { ...toData.teams }   : {};

  if (!fromTeams[o.teamId] || fromTeams[o.teamId].role !== 'coach') {
    throw new Error('La personne actuelle n\'est pas coach principal de cette équipe.');
  }
  if (!toTeams[o.teamId]) {
    throw new Error('La cible n\'est pas rattachée à cette équipe — génère-lui un lien d\'invitation Adjoint avant le transfert.');
  }

  // Recalcule clubRole à partir d'une map teams.
  const computeClubRole = (teams) => {
    const roles = Object.values(teams).map(t => t && t.role).filter(Boolean);
    if (roles.includes('owner')) return 'owner';
    if (roles.includes('coach')) return 'coach';
    return '';
  };

  // Nouvel état ancien coach : rétrogradé ou retiré de l'équipe.
  const newFromTeams = { ...fromTeams };
  if (demoteToRole === 'none') {
    delete newFromTeams[o.teamId];
  } else {
    newFromTeams[o.teamId] = { ...fromTeams[o.teamId], role: demoteToRole };
  }
  const newFromClubRole = computeClubRole(newFromTeams);

  // Nouvel état nouveau coach : promu sur l'équipe (les autres équipes
  // intactes).
  const newToTeams = { ...toTeams, [o.teamId]: { ...toTeams[o.teamId], role: 'coach' } };
  const newToClubRole = computeClubRole(newToTeams);

  // Batch atomique : les deux updates passent ensemble, ou rien.
  const batch = writeBatch(db);
  if (demoteToRole === 'none' && Object.keys(newFromTeams).length === 0) {
    // L'ancien coach ne reste sur aucune équipe → supprime sa membership.
    batch.delete(fromRef);
  } else {
    batch.update(fromRef, {
      teams: newFromTeams,
      clubRole: newFromClubRole,
      updatedAt: serverTimestamp(),
    });
  }
  batch.update(toRef, {
    teams: newToTeams,
    clubRole: newToClubRole,
    updatedAt: serverTimestamp(),
  });
  await batch.commit();

  return { ok: true };
}

// Self-removal : l'utilisateur courant quitte un club côté cloud.
// Supprime sa propre membership Firestore. Refuse si l'utilisateur
// est coach principal d'au moins une équipe ou owner du club —
// dans ces cas, il doit d'abord transférer son rôle (sinon l'équipe
// se retrouverait orpheline).
async function leaveClub(clubId) {
  if (!db || !clubId) throw new Error('clubId requis');
  const uid = _uid();
  if (!uid) throw new Error('Pas connecté à Firebase Auth.');

  const ref = doc(db, 'memberships', uid + '_' + clubId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    // Déjà absent côté cloud → on laisse passer (cas user qui clique 2 fois,
    // ou membership déjà supprimée par un coach).
    return { ok: true, noop: true };
  }
  const data = snap.data() || {};

  // Refus 1 : owner du club.
  if (data.clubRole === 'owner') {
    throw new Error('Tu es propriétaire de ce club — tu ne peux pas le quitter. Transfère d\'abord la propriété ou supprime le club depuis le panneau admin.');
  }

  // Refus 2 : coach principal d'au moins une équipe.
  const teams = data.teams || {};
  const coachTeams = Object.keys(teams).filter(tid => teams[tid] && teams[tid].role === 'coach');
  if (coachTeams.length > 0) {
    const n = coachTeams.length;
    throw new Error('Tu es coach principal de ' + n + ' équipe' + (n > 1 ? 's' : '') + '. '
      + 'Transfère d\'abord ton rôle à un adjoint depuis « Membres du club », '
      + 'sinon l\'équipe se retrouverait sans coach.');
  }

  await deleteDoc(ref);
  return { ok: true };
}

// ─── Migration unique : données locales → Firestore ────────
// Réservée à l'admin. Pousse arb_clubs / arb_teams (+ joueurs imbriqués)
// vers Firestore et crée la membership 'owner' de l'admin sur chaque club.
// Idempotente (setDoc merge) ; pose un drapeau cdd_cloud_migrated.
async function migrateLocalToCloud(opts) {
  if (!db) return { ok: false, reason: 'no-db' };
  const uid = _uid();
  const email = _email();
  if (!uid) return { ok: false, reason: 'not-signed-in' };
  if (email !== ADMIN_EMAIL_DATA) return { ok: false, reason: 'not-admin' };
  const force = opts && opts.force;
  if (!force) {
    try { if (localStorage.getItem('cdd_cloud_migrated') === '1') return { ok: true, reason: 'already-done' }; }
    catch (e) {}
  }

  const counts = { clubs: 0, teams: 0, players: 0, memberships: 0, errors: 0 };
  const clubs = _lsJSON('arb_clubs', []);
  const teams = _lsJSON('arb_teams', []);
  const logos = _lsJSON('cdd_club_logos', {});

  for (const club of (Array.isArray(clubs) ? clubs : [])) {
    if (!club || !club.id) continue;
    try {
      await saveClub({ ...club, logoUrl: logos[club.id] || club.logoDataUrl || null });
      counts.clubs++;
      // Admin : standing club-level 'owner' sur le club entier, sans entrée
      // équipe (la map `teams` sera remplie au fur et à mesure des assignations).
      await saveMembership({ uid, email, clubId: club.id, clubRole: 'owner', createdBy: 'migration' });
      counts.memberships++;
    } catch (e) { counts.errors++; console.warn('[cddData] migrate club', club.id, e.message); }
  }

  // GARDE-FOU : on ne pousse pas un effectif si le cloud en a déjà une
  // version plus riche — un appareil au local appauvri ne doit jamais
  // corrompre le cloud (anti-imbroglio 2026-05-22).
  const cloudCount = {};
  try {
    const seenClubs = {};
    for (const team of (Array.isArray(teams) ? teams : [])) {
      const cid = team && team.clubId;
      if (!cid || seenClubs[cid]) continue;
      seenClubs[cid] = true;
      const cp = await fetchPlayers(cid);
      cp.forEach(p => { if (p && p.teamId) cloudCount[p.teamId] = (cloudCount[p.teamId] || 0) + 1; });
    }
  } catch (e) { console.warn('[cddData] migrate : lecture cloud préalable échouée', e.message); }

  for (const team of (Array.isArray(teams) ? teams : [])) {
    if (!team || !team.id) continue;
    const localN = (team.players || []).length;
    const cloudN = cloudCount[team.id] || 0;
    if (cloudN > localN) {
      console.warn('[cddData] migrate : équipe ' + team.id + ' IGNORÉE — le cloud est plus riche ('
        + cloudN + ' > ' + localN + ' joueurs)');
      counts.skipped = (counts.skipped || 0) + 1;
      continue;
    }
    try {
      await saveTeam(team);
      counts.teams++;
      for (const p of (team.players || [])) {
        if (!p || !p.id) continue;
        try { await savePlayer(p, team.id, team.clubId); counts.players++; }
        catch (e) { counts.errors++; console.warn('[cddData] migrate player', p.id, e.message); }
      }
    } catch (e) { counts.errors++; console.warn('[cddData] migrate team', team.id, e.message); }
  }

  try { localStorage.setItem('cdd_cloud_migrated', '1'); } catch (e) {}
  console.info('%c[cddData] migration → Firestore terminée', 'color:#c8f169;font-weight:900', counts);
  return { ok: true, counts };
}

// ─── Lecture cloud → cache local (Phase C — C3) ────────────
// Lit les memberships de l'utilisateur, récupère SES clubs/équipes/joueurs
// autorisés depuis Firestore, et réécrit le cache local (arb_clubs /
// arb_teams) que l'adaptateur synchrone consomme. Un compte sans membership
// n'obtient rien. Si la lecture échoue (hors-ligne), le cache local est
// laissé intact (pas de perte).
async function pullCloudData() {
  if (!db) return { ok: false, reason: 'no-db' };
  const uid = _uid();
  if (!uid) return { ok: false, reason: 'not-signed-in' };

  // [admin pull v2 — fix 2026-05-28] L'admin ne dépend PAS de ses memberships :
  // il doit voir TOUS les clubs en base (USDF était invisible parce qu'il n'a
  // pas de membership dessus). Pour les autres comptes, la logique d'origine
  // (filtre par memberships) reste inchangée.
  const isAdminPull = (_email() === ADMIN_EMAIL_DATA);

  let clubIds;
  // [fix 2026-06-01] `memberships` hissé au scope fonction : il est relu plus
  // bas (écriture cdd_memberships + branche « cloud vide »). Tant qu'il était
  // déclaré uniquement dans la branche non-admin, le chemin ADMIN plantait
  // avec ReferenceError "memberships is not defined" → resync admin cassée.
  let memberships = [];
  if (isAdminPull) {
    try {
      const allClubs = await fetchAllClubs();
      clubIds = (allClubs || []).map(c => c && c.id).filter(Boolean);
    } catch (e) { return { ok: false, reason: 'fetch-all-failed', error: e.message }; }
    // L'admin a aussi sa propre membership (owner) : on la charge pour garder
    // le cache local cdd_memberships juste. Best-effort, non bloquant.
    try { memberships = await fetchMemberships(uid); } catch (e) {}
  } else {
    try { memberships = await fetchMemberships(uid); }
    catch (e) { return { ok: false, reason: 'fetch-failed', error: e.message }; }
    clubIds = Array.from(new Set((memberships || []).map(m => m.clubId).filter(Boolean)));
  }

  if (clubIds.length === 0) {
    // [admin pull v2] Pas de purge pour l'admin sur 0 résultat : blip réseau
    // ou base vide ne doit jamais effacer son cache local.
    if (isAdminPull) {
      return { ok: true, empty: true, admin: true, counts: { clubs: 0, teams: 0, players: 0 } };
    }
    // SÉCURITÉ : ce compte n'a AUCUN rattachement cloud.
    // 1. Purge cdd_memberships (entrées de CET email seulement, les autres
    //    comptes sur l'appareil partagé sont intacts).
    try {
      const email = _email();
      if (email) {
        const local = JSON.parse(localStorage.getItem('cdd_memberships') || '[]');
        if (Array.isArray(local)) {
          const cleaned = local.filter(m => m && (m.email || '').toLowerCase() !== email);
          if (cleaned.length !== local.length) {
            localStorage.setItem('cdd_memberships', JSON.stringify(cleaned));
            window.dispatchEvent(new CustomEvent('cdd-memberships-changed'));
          }
        }
      }
    } catch (e) {}

    // 2. Purge toutes les données club/équipe du localStorage.
    //    Si l'utilisateur avait un club → sa membership a été RÉVOQUÉE →
    //    on pose le flag cdd_access_revoked pour que l'app le renvoie
    //    vers la landing (il ne doit plus voir l'équipe).
    try {
      const hadClub = !!(localStorage.getItem('arb_current_club') || '').trim();
      localStorage.removeItem('arb_current_club');
      localStorage.removeItem('cdd_active_context');
      localStorage.setItem('arb_clubs', '[]');
      localStorage.setItem('arb_teams', '[]');
      if (hadClub) localStorage.setItem('cdd_access_revoked', 'true');
    } catch (e) {}

    // Force React à se re-rendre (cdd-data-rebuilt déclenche root.render dans
    // app.jsx). Sans cet event, l'app continue à afficher l'ancien état même
    // après la purge.
    try {
      if (window.CDD_REBUILD) window.CDD_REBUILD();
      window.dispatchEvent(new CustomEvent('cdd-memberships-changed'));
      window.dispatchEvent(new CustomEvent('cdd-data-rebuilt'));
    } catch (e) {}
    return { ok: true, empty: true, counts: { clubs: 0, teams: 0, players: 0 } };
  }

  // Retire les métadonnées Firestore (timestamps non sérialisables proprement).
  const stripMeta = (o) => {
    const c = { ...o };
    delete c.updatedAt; delete c.createdAt; delete c.updatedBy; delete c.createdBy;
    return c;
  };

  const clubs = [];
  const teamsAll = [];
  let playerCount = 0;
  // Capture les overrides AVANT stripMeta (les Timestamps ne survivent pas à JSON).
  const rawPlayerStats      = {};
  const rawPlayerProfiles   = {};
  const rawPlayerNotes      = {};
  const rawPlayerPerfDeltas = {};
  // Compo type embarquée dans le doc team (sync 2026-05-23) — propagée
  // ensuite vers localStorage cdd_lineup_template via LWW.
  const rawTeamLineups      = {};
  // Compos de match (Phase 1A) — récupérées depuis collection match_lineups,
  // propagées vers localStorage cdd_match_lineup[teamId][matchId].
  const rawMatchLineups     = [];
  // Infos pratiques du match (stade, horaires, covoit) — collection match_infos
  // → localStorage cdd_match_info[teamId][matchId].
  const rawMatchInfos       = [];
  // Numéros maillots match-specific — collection match_jerseys
  // → localStorage cdd_match_jersey_numbers[teamId][matchId][pid].
  const rawJerseyNumbers    = [];
  // Matchs amicaux — collection friendly_matches → cdd_friendly_matches[teamId][]
  const rawFriendlyMatches  = [];
  for (const cid of clubIds) {
    try {
      const club = await fetchClub(cid);
      if (club) clubs.push(stripMeta(club));
      const teams = await fetchTeams(cid);
      const players = await fetchPlayers(cid);
      players.forEach(p => {
        if (!p || !p.id) return;
        if ('statsOverride'      in p) rawPlayerStats[p.id]      = { statsOverride:      p.statsOverride      || null, statsUpdatedAt:      p.statsUpdatedAt      || null };
        if ('profileOverride' in p || p.photoUrl) rawPlayerProfiles[p.id] = { profileOverride: p.profileOverride || null, profileUpdatedAt: p.profileUpdatedAt || null, photoUrl: p.photoUrl || null };
        if ('notesOverride'      in p) rawPlayerNotes[p.id]      = { notesOverride:      p.notesOverride      || null, notesUpdatedAt:      p.notesUpdatedAt      || null };
        if ('perfDeltasOverride' in p) rawPlayerPerfDeltas[p.id] = { perfDeltasOverride: p.perfDeltasOverride || null };
      });
      for (const t of teams) {
        if ('lineupTemplate' in t) {
          rawTeamLineups[t.id] = {
            lineupTemplate:   t.lineupTemplate   || null,
            lineupUpdatedAt:  t.lineupUpdatedAt  || null,
          };
        }
        const tc = stripMeta(t);
        tc.players = players.filter(p => p.teamId === t.id).map(stripMeta);
        playerCount += tc.players.length;
        teamsAll.push(tc);
      }
      // Compos de match du club (collection match_lineups)
      try {
        const mlList = await fetchMatchLineups(cid);
        mlList.forEach(ml => {
          if (ml && ml.teamId && ml.matchId) {
            rawMatchLineups.push({
              teamId: ml.teamId,
              matchId: ml.matchId,
              lineup: ml.lineup || null,
              updatedAt: ml.updatedAt || null,
            });
          }
        });
      } catch (e) { console.warn('[cddData] pull match_lineups', cid, e.message); }
      // Infos pratiques du match (collection match_infos)
      try {
        const miList = await fetchMatchInfos(cid);
        miList.forEach(mi => {
          if (mi && mi.teamId && mi.matchId) {
            rawMatchInfos.push({
              teamId: mi.teamId,
              matchId: mi.matchId,
              info: mi.info || null,
              updatedAt: mi.updatedAt || null,
            });
          }
        });
      } catch (e) { console.warn('[cddData] pull match_infos', cid, e.message); }
      // Numéros maillots match-specific (collection match_jerseys)
      try {
        const mjList = await fetchJerseyNumbers(cid);
        mjList.forEach(mj => {
          if (mj && mj.teamId && mj.matchId) {
            rawJerseyNumbers.push({
              teamId: mj.teamId,
              matchId: mj.matchId,
              jerseys: mj.jerseys || {},
              updatedAt: mj.updatedAt || null,
            });
          }
        });
      } catch (e) { console.warn('[cddData] pull match_jerseys', cid, e.message); }
      // Matchs amicaux (collection friendly_matches)
      try {
        const fmList = await fetchFriendlyMatches(cid);
        fmList.forEach(fm => {
          if (fm && fm.id && fm.teamId) {
            rawFriendlyMatches.push({
              id: fm.id,
              teamId: fm.teamId,
              clubId: fm.clubId || null,
              date: fm.date || '',
              time: fm.time || '',
              opponent: fm.opponent || '',
              venue: fm.venue || 'H',
              isAmical: true,
              updatedAt: fm.updatedAt || null,
            });
          }
        });
      } catch (e) { console.warn('[cddData] pull friendly_matches', cid, e.message); }
    } catch (e) { console.warn('[cddData] pull club', cid, e.message); }
  }

  // ═══ GARDE-FOU ANTI-ÉCRASEMENT (anti-imbroglio 2026-05-22) ═══════
  // Le cloud ne doit JAMAIS détruire un effectif local plus riche.
  // On lit le local, on le sauvegarde, puis on FUSIONNE — on ne
  // remplace jamais une équipe par une version cloud plus pauvre.
  let localClubs = [];
  let localTeams = [];
  try { localClubs = JSON.parse(localStorage.getItem('arb_clubs') || '[]'); } catch (e) {}
  try { localTeams = JSON.parse(localStorage.getItem('arb_teams') || '[]'); } catch (e) {}
  if (!Array.isArray(localClubs)) localClubs = [];
  if (!Array.isArray(localTeams)) localTeams = [];

  // Sauvegarde horodatée du local AVANT toute écriture — filet de sécurité.
  // On ne garde que les 3 sauvegardes les plus récentes (anti-saturation).
  try {
    if (localTeams.length || localClubs.length) {
      const bkeys = Object.keys(localStorage)
        .filter(k => k.indexOf('cdd_cloud_backup_') === 0).sort();
      while (bkeys.length > 3) { localStorage.removeItem(bkeys.shift()); }
      localStorage.setItem('cdd_cloud_backup_' + Date.now(), JSON.stringify({
        arb_clubs: localStorage.getItem('arb_clubs'),
        arb_teams: localStorage.getItem('arb_teams'),
        arb_current_club: localStorage.getItem('arb_current_club'),
        cdd_active_context: localStorage.getItem('cdd_active_context'),
      }));
    }
  } catch (e) {}

  // Cloud vide alors qu'on a du local → on ne touche À RIEN à l'effectif.
  // (les memberships, elles, suivent toujours le cloud — source des rôles.)
  if (teamsAll.length === 0 && localTeams.length > 0) {
    console.warn('[cddData] pull : cloud vide — effectif local préservé (anti-écrasement)');
    try {
      localStorage.setItem('cdd_memberships', JSON.stringify(memberships || []));
      window.dispatchEvent(new CustomEvent('cdd-memberships-changed'));
      if (window.CDD_REBUILD) window.CDD_REBUILD();
    } catch (e) {}
    return { ok: true, skipped: 'cloud-empty', counts: { clubs: 0, teams: 0, players: 0 } };
  }

  // RÉCUPÉRATION SCOPÉE AUX DROITS (2026-05-22) : le périmètre autorisé du
  // compte = les clubs de ses memberships (clubIds). On ne conserve QUE le
  // local de ce périmètre — le résidu d'un autre compte (ex. USDF traîné sur
  // un compte qui ne coache que le FCMH) est écarté. Sûr car on n'arrive ici
  // qu'avec ≥1 membership valide (le cas 0 membership est sorti plus haut),
  // et une sauvegarde horodatée a déjà été posée.
  const authorizedClubIds = new Set(clubIds);

  // Fusion équipes par id : pour une équipe présente des deux côtés, on ne
  // prend le cloud QUE s'il a au moins autant de joueurs ; sinon on garde le
  // local. Les joueurs sont fusionnés par id (zéro perte). Les équipes
  // locales d'un club AUTORISÉ absentes du cloud sont conservées (équipe
  // créée en local pas encore poussée) ; les autres sont écartées.
  const teamById = {};
  localTeams.forEach(t => {
    if (t && t.id && authorizedClubIds.has(t.clubId)) teamById[t.id] = t;
  });
  teamsAll.forEach(ct => {
    if (!ct || !ct.id) return;
    const lt = teamById[ct.id];
    if (!lt) { teamById[ct.id] = ct; return; }
    const cloudN = (ct.players || []).length;
    const localN = (lt.players || []).length;
    if (cloudN >= localN) {
      const pById = {};
      (lt.players || []).forEach(p => { if (p && p.id) pById[p.id] = p; });
      (ct.players || []).forEach(p => { if (p && p.id) pById[p.id] = { ...pById[p.id], ...p }; });
      teamById[ct.id] = { ...lt, ...ct, players: Object.values(pById) };
    } else {
      console.warn('[cddData] équipe ' + ct.id + ' : cloud plus pauvre ('
        + cloudN + ' < ' + localN + ' joueurs) — version locale conservée');
    }
  });
  const mergedTeams = Object.values(teamById);

  // Fusion clubs par id, scopée au périmètre autorisé. Le logo est préservé :
  // le cloud le stocke sous `logoUrl` (base64 compressé, plan Spark), l'app
  // le lit sous `logoDataUrl` ET dans la map localStorage `cdd_club_logos`
  // (cf. data-bridge.js). On sync les deux pour ne rien manquer.
  const clubById = {};
  localClubs.forEach(c => {
    if (c && c.id && authorizedClubIds.has(c.id)) clubById[c.id] = c;
  });
  try {
    const logosMap = JSON.parse(localStorage.getItem('cdd_club_logos') || '{}');
    let logosDirty = false;
    clubs.forEach(cc => {
      if (!cc || !cc.id) return;
      const lc = clubById[cc.id] || {};
      const cloudLogo = cc.logoUrl || cc.logoDataUrl || null;
      const finalLogo = lc.logoDataUrl || cloudLogo || null;
      // Protection anti-perte : le stade (objet imbriqué) ne doit pas être effacé
      // par un pull cloud incomplet. Pour chaque champ on garde la valeur NON VIDE
      // (cloud prioritaire si renseigné, sinon on conserve la saisie locale).
      const _ls = lc.stadium || {}, _cs = cc.stadium || {};
      const _pick = (c, l) => (c && String(c).trim()) ? c : (l || '');
      const mergedStadium = {
        ..._ls, ..._cs,
        name:    _pick(_cs.name,    _ls.name),
        address: _pick(_cs.address, _ls.address),
        gpsUrl:  _pick(_cs.gpsUrl,  _ls.gpsUrl),
      };
      clubById[cc.id] = { ...lc, ...cc, logoDataUrl: finalLogo, stadium: mergedStadium };
      // Propage aussi dans cdd_club_logos pour que data-bridge.js le voit.
      if (cloudLogo && logosMap[cc.id] !== cloudLogo) {
        logosMap[cc.id] = cloudLogo;
        logosDirty = true;
      } else if (!cloudLogo && cc.id in logosMap && !lc.logoDataUrl) {
        // Cloud a effacé le logo → on retire aussi du local.
        delete logosMap[cc.id];
        logosDirty = true;
      }
    });
    if (logosDirty) localStorage.setItem('cdd_club_logos', JSON.stringify(logosMap));
  } catch (e) { console.warn('[cddData] sync logos', e); }
  const mergedClubs = Object.values(clubById);

  // Sync des stats overrides depuis le cloud (last-write-wins, même logique que les statuts).
  try {
    const keys = Object.keys(rawPlayerStats);
    if (keys.length) {
      const statsOv = JSON.parse(localStorage.getItem('cdd_player_stats_override') || '{}');
      const statsTs  = JSON.parse(localStorage.getItem('cdd_player_stats_local_ts')  || '{}');
      let dirty = false;
      keys.forEach(pid => {
        const { statsOverride, statsUpdatedAt } = rawPlayerStats[pid];
        const cloudMs = statsUpdatedAt && typeof statsUpdatedAt.toMillis === 'function'
          ? statsUpdatedAt.toMillis()
          : (typeof statsUpdatedAt === 'number' ? statsUpdatedAt : 0);
        const localMs = statsTs[pid] || 0;
        if (localMs > cloudMs && localMs > 0) return; // local plus récent → on garde
        if (statsOverride && typeof statsOverride === 'object') {
          statsOv[pid] = { ...statsOverride };
        } else {
          delete statsOv[pid]; // cloud = null → on efface l'override local
        }
        delete statsTs[pid];
        dirty = true;
      });
      if (dirty) {
        localStorage.setItem('cdd_player_stats_override', JSON.stringify(statsOv));
        localStorage.setItem('cdd_player_stats_local_ts',  JSON.stringify(statsTs));
      }
    }
  } catch (e) {}

  // Sync des profils depuis le cloud (LWW — photo préservée côté local).
  try {
    const keys = Object.keys(rawPlayerProfiles);
    if (keys.length) {
      const profOv = JSON.parse(localStorage.getItem('cdd_player_profile') || '{}');
      const profTs = JSON.parse(localStorage.getItem('cdd_player_profile_local_ts') || '{}');
      let dirty = false;
      keys.forEach(pid => {
        const { profileOverride, profileUpdatedAt } = rawPlayerProfiles[pid];
        const cloudMs = profileUpdatedAt && typeof profileUpdatedAt.toMillis === 'function'
          ? profileUpdatedAt.toMillis()
          : (typeof profileUpdatedAt === 'number' ? profileUpdatedAt : 0);
        const localMs = profTs[pid] || 0;
        if (localMs > cloudMs && localMs > 0) return; // local plus récent → on garde
        // La photoDataUrl (base64 compressée) est désormais dans profileOverride.
        if (profileOverride && typeof profileOverride === 'object') {
          profOv[pid] = { ...profileOverride };
        } else {
          delete profOv[pid];
        }
        delete profTs[pid];
        dirty = true;
      });
      if (dirty) {
        localStorage.setItem('cdd_player_profile', JSON.stringify(profOv));
        localStorage.setItem('cdd_player_profile_local_ts', JSON.stringify(profTs));
      }
    }
  } catch (e) {}

  // Sync des notes/observations depuis le cloud (LWW).
  try {
    const keys = Object.keys(rawPlayerNotes);
    if (keys.length) {
      const notesOv = JSON.parse(localStorage.getItem('cdd_player_notes') || '{}');
      const notesTs = JSON.parse(localStorage.getItem('cdd_player_notes_local_ts') || '{}');
      let dirty = false;
      keys.forEach(pid => {
        const { notesOverride, notesUpdatedAt } = rawPlayerNotes[pid];
        const cloudMs = notesUpdatedAt && typeof notesUpdatedAt.toMillis === 'function'
          ? notesUpdatedAt.toMillis()
          : (typeof notesUpdatedAt === 'number' ? notesUpdatedAt : 0);
        const localMs = notesTs[pid] || 0;
        if (localMs > cloudMs && localMs > 0) return;
        if (Array.isArray(notesOverride)) notesOv[pid] = notesOverride;
        else delete notesOv[pid];
        delete notesTs[pid];
        dirty = true;
      });
      if (dirty) {
        localStorage.setItem('cdd_player_notes', JSON.stringify(notesOv));
        localStorage.setItem('cdd_player_notes_local_ts', JSON.stringify(notesTs));
      }
    }
  } catch (e) {}

  // Sync perf deltas (UNION par matchId — on ne perd jamais un match).
  try {
    const keys = Object.keys(rawPlayerPerfDeltas);
    if (keys.length) {
      const allDeltas = JSON.parse(localStorage.getItem('cdd_player_perf_deltas') || '{}');
      let dirty = false;
      keys.forEach(pid => {
        const { perfDeltasOverride } = rawPlayerPerfDeltas[pid];
        if (!perfDeltasOverride || typeof perfDeltasOverride !== 'object') return;
        allDeltas[pid] = { ...(allDeltas[pid] || {}), ...perfDeltasOverride };
        dirty = true;
      });
      if (dirty) localStorage.setItem('cdd_player_perf_deltas', JSON.stringify(allDeltas));
    }
  } catch (e) {}

  // Sync compo type (lineup template) depuis le cloud — LWW. Permet aux
  // adjoints, parents, joueurs, lecteurs de voir la compo posée par le
  // coach principal sur son tel. Source de vérité = cloud, mais l'écran
  // Feuille de match peut éditer en local et re-push.
  try {
    const keys = Object.keys(rawTeamLineups);
    if (keys.length) {
      const allLineups = JSON.parse(localStorage.getItem('cdd_lineup_template') || '{}');
      let dirty = false;
      keys.forEach(tid => {
        const { lineupTemplate, lineupUpdatedAt } = rawTeamLineups[tid];
        const cloudMs = lineupUpdatedAt && typeof lineupUpdatedAt.toMillis === 'function'
          ? lineupUpdatedAt.toMillis()
          : (typeof lineupUpdatedAt === 'number' ? lineupUpdatedAt : 0);
        const localMs = (allLineups[tid] && allLineups[tid].updatedAt) || 0;
        // LWW : local plus récent → on garde le local (le coach vient
        // probablement d'éditer et le push fire-and-forget arrive bientôt).
        if (localMs > cloudMs && localMs > 0) return;
        if (lineupTemplate && typeof lineupTemplate === 'object') {
          allLineups[tid] = lineupTemplate;
        } else {
          delete allLineups[tid];
        }
        dirty = true;
      });
      if (dirty) localStorage.setItem('cdd_lineup_template', JSON.stringify(allLineups));
    }
  } catch (e) {}

  // Sync compos de MATCH depuis le cloud — LWW par (teamId, matchId).
  // Permet à tous les comptes (adjoints, parents, lecteurs) de voir les
  // compos spécifiques de chaque match préparées par le coach.
  try {
    if (rawMatchLineups.length) {
      const allMl = JSON.parse(localStorage.getItem('cdd_match_lineup') || '{}');
      let dirty = false;
      rawMatchLineups.forEach(({ teamId, matchId, lineup, updatedAt }) => {
        if (!teamId || !matchId) return;
        const cloudMs = updatedAt && typeof updatedAt.toMillis === 'function'
          ? updatedAt.toMillis()
          : (typeof updatedAt === 'number' ? updatedAt : 0);
        if (!allMl[teamId]) allMl[teamId] = {};
        const localMs = (allMl[teamId][matchId] && allMl[teamId][matchId].updatedAt) || 0;
        if (localMs > cloudMs && localMs > 0) return; // local plus récent
        if (lineup && typeof lineup === 'object') {
          allMl[teamId][matchId] = { ...lineup, updatedAt: cloudMs };
        } else {
          delete allMl[teamId][matchId];
        }
        dirty = true;
      });
      if (dirty) localStorage.setItem('cdd_match_lineup', JSON.stringify(allMl));
    }
  } catch (e) {}

  // Sync INFOS DU MATCH depuis le cloud — LWW par (teamId, matchId).
  try {
    if (rawMatchInfos.length) {
      const allMi = JSON.parse(localStorage.getItem('cdd_match_info') || '{}');
      let dirty = false;
      rawMatchInfos.forEach(({ teamId, matchId, info, updatedAt }) => {
        if (!teamId || !matchId) return;
        const cloudMs = updatedAt && typeof updatedAt.toMillis === 'function'
          ? updatedAt.toMillis()
          : (typeof updatedAt === 'number' ? updatedAt : 0);
        if (!allMi[teamId]) allMi[teamId] = {};
        const localMs = (allMi[teamId][matchId] && allMi[teamId][matchId].updatedAt) || 0;
        if (localMs > cloudMs && localMs > 0) return;
        if (info && typeof info === 'object') {
          allMi[teamId][matchId] = { ...info, updatedAt: cloudMs };
        } else {
          delete allMi[teamId][matchId];
        }
        dirty = true;
      });
      if (dirty) localStorage.setItem('cdd_match_info', JSON.stringify(allMi));
    }
  } catch (e) {}

  // Sync NUMÉROS MAILLOTS match-specific depuis le cloud — LWW par (teamId, matchId).
  // Le cloud stocke un map { [pid]: num } qui remplace intégralement le local
  // (et non un merge pid à pid : si le coach a supprimé un override, on doit
  // le propager). LWW au niveau du couple (teamId, matchId).
  try {
    if (rawJerseyNumbers.length) {
      const allJ = JSON.parse(localStorage.getItem('cdd_match_jersey_numbers') || '{}');
      const cloudByKey = {}; // pour mémoriser le cloudMs et juger LWW au niveau global
      let dirty = false;
      rawJerseyNumbers.forEach(({ teamId, matchId, jerseys, updatedAt }) => {
        if (!teamId || !matchId) return;
        const cloudMs = updatedAt && typeof updatedAt.toMillis === 'function'
          ? updatedAt.toMillis()
          : (typeof updatedAt === 'number' ? updatedAt : 0);
        // Local n'a pas d'updatedAt par (teamId, matchId) — on prend la maj cloud
        // si elle existe. Le user pourra écraser localement après.
        if (!allJ[teamId]) allJ[teamId] = {};
        if (jerseys && typeof jerseys === 'object' && Object.keys(jerseys).length > 0) {
          allJ[teamId][matchId] = jerseys;
        } else {
          delete allJ[teamId][matchId];
        }
        dirty = true;
      });
      if (dirty) localStorage.setItem('cdd_match_jersey_numbers', JSON.stringify(allJ));
    }
  } catch (e) {}

  // Sync MATCHS AMICAUX depuis le cloud — LWW par id (qui est unique).
  // Local : cdd_friendly_matches[teamId] = [ { id, ... } ].
  // On fusionne : tout id cloud absent en local est ajouté, et si l'id existe
  // en local, on garde la version la plus récente (updatedAt).
  try {
    if (rawFriendlyMatches.length) {
      const allFm = JSON.parse(localStorage.getItem('cdd_friendly_matches') || '{}');
      let dirty = false;
      rawFriendlyMatches.forEach(({ id, teamId, clubId, date, time, opponent, venue, updatedAt, endedAt }) => {
        if (!id || !teamId) return;
        const cloudMs = updatedAt && typeof updatedAt.toMillis === 'function'
          ? updatedAt.toMillis()
          : (typeof updatedAt === 'number' ? updatedAt : 0);
        if (!allFm[teamId]) allFm[teamId] = [];
        const i = allFm[teamId].findIndex(m => m.id === id);
        const local = i >= 0 ? allFm[teamId][i] : null;
        const localMs = local?.updatedAt || 0;
        // Cas spécial : si le cloud a endedAt et que le local ne l'a pas, on
        // applique JUSTE endedAt sans toucher au reste (préserve les éventuelles
        // édits locales récentes : adversaire, heure...). Sans ça, un match
        // terminé sur device A restait "à venir" sur device B qui avait édité
        // le match juste avant.
        if (local && typeof endedAt === 'number' && typeof local.endedAt !== 'number') {
          allFm[teamId][i] = { ...local, endedAt, updatedAt: Math.max(localMs, cloudMs, Date.now()) };
          dirty = true;
          return;
        }
        if (local && localMs > cloudMs && localMs > 0) return; // local plus récent
        const entry = {
          id, teamId, clubId: clubId || null,
          date, time, opponent, venue,
          isAmical: true,
          createdAt: local?.createdAt || cloudMs || Date.now(),
          updatedAt: cloudMs || Date.now(),
        };
        // FIX 2026-05-26 : récupère endedAt du cloud si présent. Préserve aussi
        // endedAt local s'il existe (un device a marqué le match terminé mais
        // le cloud n'a pas encore reçu la propagation). Le 1er endedAt observé
        // gagne (LWW est dangereux ici car écraserait par null à chaque pull).
        if (typeof endedAt === 'number') entry.endedAt = endedAt;
        else if (local && typeof local.endedAt === 'number') entry.endedAt = local.endedAt;
        if (i >= 0) allFm[teamId][i] = entry;
        else allFm[teamId].push(entry);
        dirty = true;
      });
      if (dirty) localStorage.setItem('cdd_friendly_matches', JSON.stringify(allFm));
    }
  } catch (e) {}

  // Écriture du cache local (source que lit l'adaptateur synchrone).
  try {
    localStorage.setItem('arb_clubs', JSON.stringify(mergedClubs));
    localStorage.setItem('arb_teams', JSON.stringify(mergedTeams));
    // Phase D — cache LS au nouveau format (map `teams` + clubRole). Si une
    // membership cloud est encore au vieux format plat (Phase C, pre-D5),
    // on la garde telle quelle : roles.js D3 lit les deux formats.
    localStorage.setItem('cdd_memberships', JSON.stringify(
      (memberships || []).map(m => {
        const base = {
          email: (m.email || '').toLowerCase(),
          clubId: m.clubId,
          createdBy: m.createdBy || 'cloud',
          createdAt: Date.now(),
        };
        if (m.teams && typeof m.teams === 'object') {
          return { ...base, clubRole: m.clubRole || '', teams: m.teams };
        }
        // Vieux format : on conserve tel quel pour le bloc rétro-compat.
        return { ...base, role: m.role, playerId: m.playerId || null };
      })
    ));
    const cur = localStorage.getItem('arb_current_club');
    if ((!cur || !mergedClubs.some(c => c.id === cur)) && mergedClubs[0]) {
      localStorage.setItem('arb_current_club', mergedClubs[0].id);
    }
    // CONTEXTE ACTIF (2026-05-22) : si cdd_active_context pointe sur un club
    // hors du périmètre autorisé (résidu d'un autre compte), on le recale
    // sur un club/équipe valides. Sinon effectiveRole interroge un club où
    // le compte n'a aucun rôle → un coach se retrouve à tort en 'lecteur'.
    try {
      const ctx = JSON.parse(localStorage.getItem('cdd_active_context') || '{}');
      if (!ctx.clubId || !mergedClubs.some(c => c.id === ctx.clubId)) {
        const club0 = mergedClubs[0] || null;
        const team0 = club0 ? mergedTeams.find(t => t && t.clubId === club0.id) : null;
        localStorage.setItem('cdd_active_context', JSON.stringify({
          clubId: club0 ? club0.id : null,
          teamId: team0 ? team0.id : null,
          matchId: null,
        }));
      }
    } catch (e) {}
    // Si l'adaptateur tourne en mode override (seed), on le met à jour aussi.
    if (window.__CDD_OVERRIDE) {
      window.__CDD_OVERRIDE['arb_clubs'] = mergedClubs;
      window.__CDD_OVERRIDE['arb_teams'] = mergedTeams;
      window.__CDD_OVERRIDE['arb_current_club'] = localStorage.getItem('arb_current_club');
    }
  } catch (e) {
    return { ok: false, reason: 'localstorage', error: e.message };
  }

  // Membership retrouvée → on efface le flag de révocation (s'il existait).
  try { localStorage.removeItem('cdd_access_revoked'); } catch (e) {}

  // ── PROPAGATION "MATCH EN COURS" CROSS-DEVICE ────────────────────
  // Pour chaque équipe pullée, si elle a un liveMatch.matchId, on fetch
  // le match individuel et on positionne cdd_match_current localement.
  // Permet à un adjoint / parent / joueur / 2e device coach de voir le
  // match qui tourne sur le téléphone du coach principal.
  try {
    console.info('[liveMatch] scan ' + mergedTeams.length + ' équipes pour pointeur cloud…');
    const teamsWithLive = mergedTeams.filter(t => t && t.liveMatch && t.liveMatch.matchId);
    console.info('[liveMatch] équipes avec match en cours :', teamsWithLive.length,
      teamsWithLive.map(t => ({ id: t.id, matchId: t.liveMatch && t.liveMatch.matchId })));
    for (const t of teamsWithLive) {
      const lm = t.liveMatch;
      const lmId = String(lm.matchId);
      // Anti-match-fantôme : si "started > 6h", on considère abandonné.
      const startedMs = (typeof lm.startedAt === 'number') ? lm.startedAt : 0;
      const SIX_H = 6 * 60 * 60 * 1000;
      if (startedMs && (Date.now() - startedMs) > SIX_H) continue;
      // Fetch le match individuel depuis cdd_v2_matches → écrire en local
      // sous la même clé que match-engine attend (cdd_match_{id}).
      const matchDoc = await fetchMatch(lmId).catch(() => null);
      if (matchDoc) {
        try {
          // match-engine.js stocke chaque match sous cdd_match_{id}.
          // Le format cloud (saveMatchToCloud) ≠ format local exact, mais
          // contient les champs critiques (teamA, teamB, score, ev, st, ch).
          // On reconstruit un objet local-compatible :
          const localShape = {
            id: matchDoc.id || lmId,
            teamId: t.id,
            clubId: t.clubId || null,
            tA: matchDoc.teamA ? {
              n: matchDoc.teamA.n, c: matchDoc.teamA.c,
              p: matchDoc.teamA.players || [],
              bench: matchDoc.teamA.bench || [],
            } : null,
            tB: matchDoc.teamB ? {
              n: matchDoc.teamB.n, c: matchDoc.teamB.c,
              p: matchDoc.teamB.players || [],
              bench: matchDoc.teamB.bench || [],
            } : null,
            sA: matchDoc.teamA ? matchDoc.teamA.score : 0,
            sB: matchDoc.teamB ? matchDoc.teamB.score : 0,
            st: matchDoc.status,
            ch: matchDoc.period,
            cfg: matchDoc.config || {},
            ev: matchDoc.events || [],
            yA: matchDoc.yellows ? matchDoc.yellows.A : 0,
            yB: matchDoc.yellows ? matchDoc.yellows.B : 0,
            rA: matchDoc.reds    ? matchDoc.reds.A    : 0,
            rB: matchDoc.reds    ? matchDoc.reds.B    : 0,
            uA: matchDoc.subs    ? matchDoc.subs.A    : 0,
            uB: matchDoc.subs    ? matchDoc.subs.B    : 0,
            at: matchDoc.addTime || 0,
            tSt: matchDoc.tSt || null,
            tOff: typeof matchDoc.tOff === 'number' ? matchDoc.tOff : 0,
            startedAt: matchDoc.startedAt || null,
            pauseStartedAt: matchDoc.pauseStartedAt || null,
            inHalftime: matchDoc.inHalftime || false,
            htStart: matchDoc.htStart || null,
            savedAt: Date.now(),
          };
          localStorage.setItem('cdd_match_' + lmId, JSON.stringify(localShape));
          localStorage.setItem('cdd_match_current', lmId);
          console.info('[liveMatch] ✓ match en cours pulled du cloud :', lmId, 'team', t.id);
        } catch (e) {
          console.warn('[liveMatch] propagation locale échouée', e.message);
        }
      }
    }
  } catch (e) { console.warn('[liveMatch] pull cross-device', e.message); }

  // ── ANTI-FANTÔME : cleanup cdd_match_current si plus aucune team ne le revendique ──
  // Cas typique : un autre device a cliqué "Fin de match" → cloud team.liveMatch
  // est cleared, le match doc est status='finished'. Ce device garde dans son
  // localStorage un cdd_match_current pointant sur l'ancien match (et le
  // cdd_match_<id> peut avoir un st='paused' stale). Sans nettoyage, l'accueil
  // affiche un bandeau rouge "MATCH EN COURS" fantôme jusqu'à ce que l'utilisateur
  // navigue manuellement sur l'écran match-live (qui contient le watch cleanup).
  try {
    const ghostCurrentId = localStorage.getItem('cdd_match_current');
    if (ghostCurrentId) {
      const stillClaimed = mergedTeams.some(t =>
        t && t.liveMatch && String(t.liveMatch.matchId) === String(ghostCurrentId)
      );
      if (!stillClaimed) {
        // Aucune team ne le revendique → vérifier le statut cloud du match
        const ghostDoc = await fetchMatch(ghostCurrentId).catch(() => null);
        const isFinished = !ghostDoc || ghostDoc.status === 'finished';
        if (isFinished) {
          console.info('[cleanup] match fantôme détecté :', ghostCurrentId,
            'statut cloud:', ghostDoc ? ghostDoc.status : 'doc absent',
            '→ nettoyage local');
          try {
            // Marquer comme dernier match terminé pour les filtres post-match
            localStorage.setItem('cdd_match_last_finished', String(ghostCurrentId));
            localStorage.removeItem('cdd_match_current');
            // Mettre à jour le cache local pour refléter le statut finished
            const localKey = 'cdd_match_' + ghostCurrentId;
            const localRaw = localStorage.getItem(localKey);
            if (localRaw) {
              try {
                const local = JSON.parse(localRaw);
                if (local && local.st !== 'finished') {
                  local.st = 'finished';
                  local.endedAt = local.endedAt || (ghostDoc && ghostDoc.endedAt) || Date.now();
                  localStorage.setItem(localKey, JSON.stringify(local));
                }
              } catch (e) {}
            }
          } catch (e) {}
        }
      }
    }
  } catch (e) { console.warn('[cleanup] ghost match', e.message); }

  try {
    window.dispatchEvent(new CustomEvent('cdd-memberships-changed'));
    if (window.CDD_REBUILD) window.CDD_REBUILD();
    window.dispatchEvent(new CustomEvent('cdd-data-rebuilt'));
  } catch (e) {}

  console.info('%c[cddData] lecture cloud → local terminée (fusion sûre)', 'color:#c8f169;font-weight:900',
    { clubs: mergedClubs.length, teams: mergedTeams.length, players: playerCount });
  return { ok: true, counts: { clubs: mergedClubs.length, teams: mergedTeams.length, players: playerCount } };
}

/* ============================================================
   INVITES (Phase C — C4) — liens d'invitation
   ============================================================
   Le coach génère un lien → doc `invites/{token}`. L'invité ouvre
   le lien, se connecte, et SA membership est créée automatiquement
   selon le contenu de l'invitation (rôle / club / joueur imposés).
   Règles serveur : firestore.rules → collection `invites` + branche
   « auto-création depuis invitation » de `memberships`.
============================================================ */

const INVITE_TTL_DAYS       = 14;     // durée de validité d'un lien
const ADJOINT_CAP           = 5;      // plafond d'adjoints par club
const PENDING_INVITE_KEY    = 'cdd_pending_invite';

function _inviteToken() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '');
  }
  return 'inv' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
}

function inviteUrl(token) {
  return window.location.origin + window.location.pathname + '?invite=' + token;
}

// Compte les memberships d'un rôle sur une ÉQUIPE précise (lisible par un
// coach du club). Phase D — le plafond adjoints est par équipe, pas par club.
async function teamRoleCount(clubId, teamId, role) {
  if (!db || !clubId || !teamId) return 0;
  const snap = await getDocs(query(collection(db, 'memberships'), where('clubId', '==', clubId)));
  let n = 0;
  snap.forEach(d => {
    const data = d.data() || {};
    const t = data.teams && data.teams[teamId];
    if (t && t.role === role) n++;
  });
  return n;
}
// Alias rétro-compat : ancien code qui voulait compter sur le club entier.
async function clubRoleCount(clubId, role) {
  if (!db || !clubId) return 0;
  const snap = await getDocs(query(collection(db, 'memberships'), where('clubId', '==', clubId)));
  let n = 0;
  snap.forEach(d => {
    const data = d.data() || {};
    if (data.clubRole === role) { n++; return; }
    // Rétro-compat ancien format plat.
    if (data.role === role) n++;
  });
  return n;
}

async function fetchInvite(token) {
  if (!db || !token) return null;
  const d = await getDoc(doc(db, 'invites', token));
  return d.exists() ? { token: d.id, ...d.data() } : null;
}

// Toutes les invitations d'un club (en attente + consommées).
async function fetchClubInvites(clubId) {
  if (!db || !clubId) return [];
  const snap = await getDocs(query(collection(db, 'invites'), where('clubId', '==', clubId)));
  const out = [];
  snap.forEach(d => out.push({ token: d.id, ...d.data() }));
  return out;
}

// Coach : crée une invitation. opts = { clubId, teamId, role, playerId, email, label }
// Phase D : l'invitation cible TOUJOURS une équipe précise (teamId requis).
async function createInvite(opts) {
  if (!db) throw new Error('Service cloud indisponible');
  const uid = _uid();
  if (!uid) throw new Error('Connecte-toi pour créer une invitation');
  const o = opts || {};
  if (!o.clubId) throw new Error('Aucun club actif');
  if (!o.teamId) throw new Error('Aucune équipe active — choisis une équipe avant de générer un lien.');
  const role = o.role || 'lecteur';
  // Matrice d'invitation (cf. roles.js → INVITE_MATRIX et firestore.rules
  // → canInviteRole). Contrôle ergonomique : message clair AVANT l'appel
  // réseau. La sécurité réelle est imposée côté serveur. Phase D : le rôle
  // de l'invitant est lu SUR L'ÉQUIPE cible, pas sur le club entier.
  const R = window.CDD_ROLES;
  const isAdminUser = !!(R && R.isAdmin && R.isAdmin());
  const myRole = isAdminUser
    ? 'admin'
    : (R && R.teamRole) ? R.teamRole(o.clubId, o.teamId) : '';
  const allowed = (R && R.invitableRoles) ? R.invitableRoles(myRole) : [];
  if (!allowed.includes(role)) {
    const lbl = (R && R.roleLabel) ? R.roleLabel(myRole || 'lecteur') : (myRole || 'lecteur');
    throw new Error('Ton rôle sur cette équipe (' + lbl + ') ne permet pas de générer un lien vers un « ' + role + ' ».');
  }
  if (role === 'parent' && !o.playerId) {
    throw new Error('Une invitation parent doit être rattachée à un joueur.');
  }
  // Plafond adjoints — best-effort, vérifié À LA GÉNÉRATION. Phase D : par
  // ÉQUIPE (et non plus par club). Le coach a le droit de lire les
  // memberships de son club, l'invité ne l'a pas.
  if (role === 'adjoint') {
    let used = 0;
    try {
      used = await teamRoleCount(o.clubId, o.teamId, 'adjoint');
      const invs = await fetchClubInvites(o.clubId);
      used += invs.filter(i => i.role === 'adjoint' && i.teamId === o.teamId
        && !i.consumed && (!i.expiresAt || Date.now() < i.expiresAt)).length;
    } catch (e) { /* lecture impossible → best-effort, on laisse passer */ }
    if (used >= ADJOINT_CAP) {
      throw new Error('Plafond atteint : ' + ADJOINT_CAP + ' adjoints maximum par équipe.');
    }
  }
  const token = _inviteToken();
  // Noms (clubName / teamName / playerName) embarqués DANS l'invite : la
  // page de validation publique (screen-landing → mode invite-pending)
  // peut ainsi afficher « Tu rejoins FCMH (Sénior) comme parent de
  // Djibril TRAORE » SANS avoir besoin de lire les docs club/team/player
  // (réservés aux membres). Le token reste l'unique gardien d'accès.
  await setDoc(doc(db, 'invites', token), {
    clubId: o.clubId,
    teamId: o.teamId || null,
    role,
    playerId: o.playerId || null,
    email: ((o.email || '').trim().toLowerCase()) || null,
    label: (o.label || '').toString().slice(0, 80) || null,
    clubName:   (o.clubName   || '').toString().slice(0, 80) || null,
    teamName:   (o.teamName   || '').toString().slice(0, 80) || null,
    playerName: (o.playerName || '').toString().slice(0, 80) || null,
    createdBy: uid,
    createdByEmail: _email(),
    createdAt: serverTimestamp(),
    expiresAt: Date.now() + INVITE_TTL_DAYS * 86400000,
    consumed: false,
    consumedBy: null,
  });
  return { ok: true, token, url: inviteUrl(token), role, expiresInDays: INVITE_TTL_DAYS };
}

async function revokeInvite(token) {
  if (!db || !token) return { ok: false };

  // Lit l'invite avant suppression — pour savoir si elle était consommée
  // et qui doit perdre son accès à l'équipe.
  let inv = null;
  try {
    const snap = await getDoc(doc(db, 'invites', token));
    if (snap.exists()) inv = snap.data();
  } catch (_) { /* best-effort — la suppression se fera quand même */ }

  await deleteDoc(doc(db, 'invites', token));

  // Si l'invite a déjà été consommée par quelqu'un qui n'est PAS coach
  // principal → on retire sa membership d'équipe pour couper son accès.
  // Le coach principal n'est JAMAIS retiré par ce chemin (le remplacer
  // passe par assignTeamCoach depuis le panneau admin).
  let membershipRemoved = false;
  if (inv && inv.consumed && inv.consumedBy && inv.teamId && inv.clubId && inv.role !== 'coach') {
    try {
      await removeTeamMembership(inv.consumedBy, inv.clubId, inv.teamId);
      membershipRemoved = true;
    } catch (e) {
      console.warn('[revokeInvite] retrait membership échoué :', e.message);
    }
  }

  return { ok: true, membershipRemoved, wasConsumed: !!(inv && inv.consumed) };
}

// Invité : consomme un lien → crée SA membership (ou ajoute l'équipe à sa
// map `teams` existante), marque l'invitation utilisée.
async function consumeInvite(token) {
  if (!db)  return { ok: false, error: 'Service cloud indisponible' };
  const uid = _uid();
  if (!uid) return { ok: false, error: 'not-signed-in' };

  let inv;
  try { inv = await fetchInvite(token); }
  catch (e) { return { ok: false, error: "Lecture de l'invitation impossible" }; }
  if (!inv)         return { ok: false, error: 'Cette invitation est introuvable.' };
  if (inv.consumed) return { ok: false, error: 'Cette invitation a déjà été utilisée.' };
  if (inv.expiresAt && Date.now() > inv.expiresAt) {
    return { ok: false, error: 'Cette invitation a expiré.' };
  }
  if (!inv.teamId) {
    return { ok: false, error: "Cette invitation n'est pas rattachée à une équipe (lien Phase C non supporté)." };
  }

  // Préserve clubRole existant (cas d'un coach principal qui consommerait
  // un lien adjoint/parent sur le même club — on ne veut pas l'écraser).
  // Lecture autorisée par les rules : l'utilisateur lit SA propre membership.
  let preservedClubRole = '';
  try {
    const ref = doc(db, 'memberships', uid + '_' + inv.clubId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const d = snap.data() || {};
      preservedClubRole = d.clubRole || '';
      // Cas évident : déjà rattaché à cette équipe → on bloque pour éviter
      // que la règle update échoue (m.teams.size() == old.teams.size() + 1).
      if (d.teams && d.teams[inv.teamId]) {
        return { ok: false, error: 'Tu es déjà rattaché à cette équipe — l\'invitation est inutile.' };
      }
    }
  } catch (e) { /* lecture facultative — fallback clubRole='' */ }

  // Crée/complète la membership. inviteToken est lu par les règles Firestore
  // pour autoriser cette écriture (l'invité ne peut pas créer une membership
  // de coach principal).
  try {
    await saveMembership({
      uid,
      email: _email(),
      displayName: localStorage.getItem('cdd_coach_name') || '',
      clubId: inv.clubId,
      teams: { [inv.teamId]: { role: inv.role || 'lecteur', playerId: inv.playerId || null } },
      // clubRole explicite : préservé si déjà élevé, '' sinon — les règles
      // refusent owner/admin/coach via invite donc passer '' est sûr.
      clubRole: preservedClubRole,
      createdBy: inv.createdBy || 'invite',
      inviteToken: token,
    });
  } catch (e) {
    return { ok: false, error: 'Rattachement refusé : ' + (e.message || e) };
  }

  // Marque l'invitation consommée (non bloquant si ça échoue).
  // Stocke aussi consumedByEmail pour que le coach voie QUI a consommé
  // l'invite (pas seulement un uid Firebase abstrait).
  try {
    await setDoc(doc(db, 'invites', token),
      {
        consumed: true,
        consumedBy: uid,
        consumedByEmail: _email() || null,
        consumedAt: serverTimestamp(),
      },
      { merge: true });
  } catch (e) { console.warn('[invite] marquage consommé échoué', e.message); }

  return { ok: true, clubId: inv.clubId, teamId: inv.teamId, role: inv.role || 'lecteur', playerId: inv.playerId || null };
}

/* ============================================================
   FORCE END MATCH — terminer un match depuis n'importe quel device
   ============================================================ */
// Écrit direct dans Firestore status='finished'+endedAt, clear team.liveMatch,
// cleanup localStorage. Permet de clôturer un match cassé/fantôme sans devoir
// passer par l'écran match-live (qui peut être inaccessible si le M local est
// corrompu, chrono cassé, etc.). Source de vérité = Firestore.
async function forceEndMatch(matchId, teamId) {
  if (!db) throw new Error('Firestore non initialisé');
  if (!matchId) throw new Error('matchId requis');
  console.info('[force-end] début terminaison forcée :', matchId, 'team', teamId);
  try {
    // 1. Écrit status='finished' dans le doc cloud (merge:true pour préserver
    //    le reste : score, events, teams, etc.)
    await setDoc(doc(db, COLL_MATCHES, String(matchId)), {
      status: 'finished',
      endedAt: Date.now(),
      forceEndedBy: getVoterId(),
      forceEndedAt: serverTimestamp(),
      savedAt: serverTimestamp(),
    }, { merge: true });
    console.info('[force-end] ✓ doc cloud → status=finished');
  } catch (e) {
    console.warn('[force-end] write cloud failed', e.message);
    return { ok: false, error: 'cloud-write: ' + e.message };
  }
  // 2. Clear le pointeur team.liveMatch (si on a le teamId)
  if (teamId) {
    try {
      await clearTeamLiveMatch(teamId);
      console.info('[force-end] ✓ team.liveMatch cleared pour team', teamId);
    } catch (e) {
      console.warn('[force-end] clear team.liveMatch failed', e.message);
      // Non bloquant
    }
  }
  // 3. Cleanup local : retire cdd_match_current si pointe sur ce match,
  //    pose cdd_match_last_finished, marque le cache local st=finished
  try {
    const currentId = localStorage.getItem('cdd_match_current');
    if (currentId && String(currentId) === String(matchId)) {
      localStorage.removeItem('cdd_match_current');
    }
    localStorage.setItem('cdd_match_last_finished', String(matchId));
    const localKey = 'cdd_match_' + matchId;
    const raw = localStorage.getItem(localKey);
    if (raw) {
      try {
        const local = JSON.parse(raw);
        if (local && local.st !== 'finished') {
          local.st = 'finished';
          local.endedAt = local.endedAt || Date.now();
          localStorage.setItem(localKey, JSON.stringify(local));
        }
      } catch (e) {}
    }
    // Aussi : si c'est un amical, le marquer terminé dans cdd_friendly_matches
    // pour qu'il n'apparaisse plus en "à venir"
    if (teamId && window.CDD_FRIENDLY && window.CDD_FRIENDLY.markEnded) {
      try { window.CDD_FRIENDLY.markEnded(teamId, String(matchId)); } catch (e) {}
    }
  } catch (e) { console.warn('[force-end] cleanup local failed', e.message); }
  // 4. Trigger REBUILD pour que les écrans React se rafraîchissent
  try {
    if (window.CDD_REBUILD) window.CDD_REBUILD();
    window.dispatchEvent(new CustomEvent('cdd-data-rebuilt'));
  } catch (e) {}
  console.info('[force-end] ✓ terminaison forcée terminée pour', matchId);
  return { ok: true };
}

/* ============================================================
   SOS — Force resync : purge cache local match + re-pull cloud
   ============================================================ */
// Soupape de sécurité utilisateur quand le cache local est désynchronisé
// (match fantôme, chrono cassé, état incohérent). Purge tout ce qui est
// match-related en localStorage et relance pullCloudData pour repartir
// d'un état propre. Préserve les données structurantes (clubs, teams,
// players, memberships) qui seront re-pullées.
async function forceResyncMatch() {
  console.info('[SOS-resync] début purge match local…');
  const removed = [];
  try {
    // Lister toutes les clés cdd_match_* puis les purger
    const matchKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('cdd_match_') || k === 'cdd_match_current' ||
                k === 'cdd_match_last_finished')) {
        matchKeys.push(k);
      }
    }
    matchKeys.forEach(k => {
      try { localStorage.removeItem(k); removed.push(k); } catch (e) {}
    });
  } catch (e) { console.warn('[SOS-resync] purge keys', e.message); }
  console.info('[SOS-resync] purge OK :', removed.length, 'clés supprimées', removed);

  // Re-pull cloud → recharge tout depuis Firestore (incl. liveMatch fresh)
  try {
    await pullCloudData();
    console.info('[SOS-resync] pull cloud OK');
  } catch (e) {
    console.warn('[SOS-resync] pull cloud failed', e.message);
    return { ok: false, error: e.message, removed };
  }

  // Force rebuild des globaux + event pour rerender React
  try {
    if (window.CDD_REBUILD) window.CDD_REBUILD();
    window.dispatchEvent(new CustomEvent('cdd-data-rebuilt'));
  } catch (e) {}
  return { ok: true, removed };
}

window.cddData = {
  get ready() { return !!db; },
  saveClub, saveTeam, savePlayer, deletePlayer, savePlayerStats, savePlayerProfile, savePlayerNotes, savePlayerPerfDeltas,
  setTeamLiveMatch, clearTeamLiveMatch, fetchMatch, fetchFinishedMatches,
  saveLineupTemplate,
  saveMatchLineup, fetchMatchLineups, deleteMatchLineup,
  saveMatchInfo, fetchMatchInfos, deleteMatchInfo,
  saveJerseyNumbers, fetchJerseyNumbers, deleteJerseyNumbers,
  saveFriendlyMatch, fetchFriendlyMatches, deleteFriendlyMatch,
  saveCoachProfile, fetchCoachProfile, deleteCoachProfile,
  pushAllLocalOverrides,
  saveClubLogoBase64,
  uploadClubLogo, deleteClubLogo, uploadPlayerPhoto, // dormant (plan Blaze requis)
  saveMembership, removeTeamMembership,
  fetchMemberships, fetchClubMemberships, fetchClub, fetchTeams, fetchPlayers,
  migrateLocalToCloud, pullCloudData, forceResyncMatch, forceEndMatch,
  createInvite, fetchInvite, fetchClubInvites, revokeInvite,
  consumeInvite, clubRoleCount, teamRoleCount, inviteUrl,
  // Phase D — admin clubs/équipes
  fetchAllClubs, findUidByEmail, assignTeamCoach, transferTeamCoach, leaveClub,
  migrateMembershipsToTeamsModel,
  ADJOINT_CAP, INVITE_TTL_DAYS,
};

/* ---------- Consommation automatique du lien d'invitation ---------- */

// Capté tôt : ?invite=TOKEN dans l'URL. On le met de côté car le round-trip
// de connexion par lien email PERD la query string (le continueUrl ne
// contient que origin+pathname).
(function captureInviteParam() {
  try {
    const t = new URLSearchParams(window.location.search).get('invite');
    if (t) {
      localStorage.setItem(PENDING_INVITE_KEY, t);
      const clean = window.location.origin + window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, clean);
      // Si pas encore connecté, on prévient l'invité pourquoi se connecter.
      if (!auth || !auth.currentUser) {
        showInviteBanner('info', 'Une invitation t\'attend — connecte-toi pour rejoindre le club.');
      }
    }
  } catch (e) {}
})();

let _inviteRunning = false;

async function processPendingInvite() {
  if (_inviteRunning) return;
  let token = '';
  try { token = localStorage.getItem(PENDING_INVITE_KEY) || ''; } catch (e) {}
  if (!token) return;
  if (!auth || !auth.currentUser) return; // attend la connexion
  _inviteRunning = true;
  try {
    const res = await consumeInvite(token);
    if (res.error !== 'not-signed-in') {
      try { localStorage.removeItem(PENDING_INVITE_KEY); } catch (e) {}
    }
    if (res.ok) {
      // Le rôle de l'invité est imposé par l'invitation.
      try { if (res.role) localStorage.setItem('cdd_user_role', res.role); } catch (e) {}
      // Charge les données du club nouvellement accessible.
      try { await pullCloudData(); } catch (e) {}
      let clubName = res.clubId;
      try { const c = await fetchClub(res.clubId); if (c && c.name) clubName = c.name; }
      catch (e) {}
      showInviteBanner('ok', 'Bienvenue ! Tu es maintenant rattaché à ' + clubName + '.');
    } else if (res.error !== 'not-signed-in') {
      showInviteBanner('err', 'Invitation non valable — ' + res.error);
    }
    window.dispatchEvent(new CustomEvent('cdd-invite-consumed', { detail: res }));
  } catch (e) {
    console.warn('[invite] consommation échouée', e);
  } finally {
    _inviteRunning = false;
  }
}

// Bannière de retour — DOM pur, indépendante de React (survit à la navigation).
function showInviteBanner(kind, message) {
  try {
    const old = document.getElementById('cdd-invite-banner');
    if (old) old.remove();
    const palette = {
      ok:   { bg: '#16361c', fg: '#c8f169', bd: '#2f6b34' },
      err:  { bg: '#3a1518', fg: '#fca5a5', bd: '#7f2a2a' },
      info: { bg: '#0f2433', fg: '#7dd3fc', bd: '#1e4d66' },
    }[kind] || { bg: '#1a1f28', fg: '#fff', bd: '#333' };
    const el = document.createElement('div');
    el.id = 'cdd-invite-banner';
    el.style.cssText = [
      'position:fixed', 'left:50%', 'transform:translateX(-50%)', 'top:14px',
      'z-index:99999', 'max-width:92vw', 'box-sizing:border-box',
      'padding:12px 42px 12px 16px', 'border-radius:12px',
      'font-family:system-ui,-apple-system,sans-serif', 'font-size:13px',
      'font-weight:600', 'line-height:1.45',
      'box-shadow:0 10px 34px rgba(0,0,0,.55)',
      'background:' + palette.bg, 'color:' + palette.fg,
      'border:1px solid ' + palette.bd,
    ].join(';');
    el.textContent = message;
    const btn = document.createElement('button');
    btn.textContent = '✕';
    btn.setAttribute('aria-label', 'Fermer');
    btn.style.cssText = [
      'position:absolute', 'top:6px', 'right:8px', 'background:transparent',
      'border:none', 'color:inherit', 'font-size:15px', 'cursor:pointer',
      'opacity:.7', 'padding:4px',
    ].join(';');
    btn.onclick = () => { try { el.remove(); } catch (e) {} };
    el.appendChild(btn);
    document.body.appendChild(el);
    if (kind === 'ok' || kind === 'info') {
      setTimeout(() => { try { el.remove(); } catch (e) {} }, 9000);
    }
  } catch (e) {}
}

// Dès qu'une session est active (login email-link, Google, ou session déjà
// ouverte), on tente de consommer une invitation en attente.
window.addEventListener('cdd-auth-changed', () => { processPendingInvite(); });

// Migration auto, une seule fois, quand l'ADMIN est authentifié.
window.addEventListener('cdd-auth-changed', () => {
  try {
    if (_email() === ADMIN_EMAIL_DATA && localStorage.getItem('cdd_cloud_migrated') !== '1') {
      migrateLocalToCloud().catch(e => console.warn('[cddData] auto-migration', e));
    }
  } catch (e) {}
});

// SÉCURITÉ / RÔLES (2026-05-22) : à chaque session active, on réconcilie
// systématiquement données + rôles depuis le cloud (source de vérité).
// Un compte n'hérite ainsi jamais d'un rôle laissé en cache par un autre
// compte sur le même appareil, et une révocation côté admin se propage.
let _autoPullRunning = false;
window.addEventListener('cdd-auth-changed', () => {
  try {
    if (!auth || !auth.currentUser) return;
    if (_autoPullRunning) return;
    _autoPullRunning = true;
    Promise.resolve()
      .then(() => pullCloudData())
      .catch(e => console.warn('[cddData] auto-pull connexion', e))
      .finally(() => { _autoPullRunning = false; });
  } catch (e) { _autoPullRunning = false; }
});

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
  saveMatchToCloud, deleteMatchFromCloud,
  watchMatchFromCloud,
  watchTeamLiveMatch,
  getSyncStatus, forcePull,
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
