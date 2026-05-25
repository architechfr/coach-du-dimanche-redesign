# Patterns de fix éprouvés — Coach du Dimanche V2

> Catalogue des solutions techniques validées dans les sessions précédentes. À RÉUTILISER au lieu de réinventer.

## Pattern A — Event sourcing du chrono

### Le problème
Avant v134, le chrono utilisait `M.tSt` (timestamp début période) + `M.tOff` (offset cumulé). Ces champs sont mutés à chaque pause/resume/halftime. **Cross-device, ils se désynchronisent** :
- Device 1 démarre le match : `tSt = 1779700000000`
- Device 2 pull via `pullCloudData` : si Firestore n'a pas encore `tSt` (legacy ou push échoué), localShape a `tSt: null`
- Sur device 2 : `gMatch(M) = 0 + (Date.now() - null) = Date.now()` → chrono affiche `29662334:37` (epoch en minutes)

### La solution (depuis v134)
Calculer le chrono depuis les **événements timestampés absolus** stockés dans `M.ev`. Tous les devices ont les mêmes events (sync via Firestore dans le payload `saveMatchToCloud`), donc tous calculent le même chrono.

**Code (`match-engine.js`)** :

```js
function _findPeriodStartTs(M) {
  if (!M || !M.ch) return null;
  if (M.ch === 1) return M.startedAt || null;
  // Périodes 2+ : chercher l'event 'period_start' le plus récent pour cette ch
  const evs = M.ev || [];
  for (let i = evs.length - 1; i >= 0; i--) {
    const e = evs[i];
    if (e && e.ch === M.ch && (e.tp === 'period_start' || e.tp === 'resume_after_half')) {
      return e.ts || null;
    }
  }
  if (M.periodStartedAt && M.periodStartedAt[M.ch]) return M.periodStartedAt[M.ch];
  return null;
}

function computeChronoMs(M) {
  if (!M || M.notStarted) return 0;
  const periodStart = _findPeriodStartTs(M);
  if (!periodStart) return null;
  const now = M.endedAt || Date.now();
  if (now <= periodStart) return 0;

  let pauseMs = 0;
  let openPauseTs = null;
  for (const e of (M.ev || [])) {
    if (!e || !e.ts || e.ts < periodStart) continue;
    if (e.tp === 'pause') {
      if (!openPauseTs) openPauseTs = e.ts;
    } else if (e.tp === 'resume' || e.tp === 'half' || e.tp === 'end' || e.tp === 'period_start') {
      if (openPauseTs) {
        pauseMs += Math.max(0, e.ts - openPauseTs);
        openPauseTs = null;
      }
    }
  }
  if (openPauseTs) {
    pauseMs += Math.max(0, now - openPauseTs);
  } else if (M.st === 'paused' && M.pauseStartedAt && M.pauseStartedAt >= periodStart) {
    // Fallback legacy : état paused sans event pause correspondant
    pauseMs += Math.max(0, now - M.pauseStartedAt);
  }
  return Math.max(0, now - periodStart - pauseMs);
}

function gMatch(M) {
  if (!M) return 0;
  if (M.notStarted) return 0;
  const fromEvents = computeChronoMs(M);
  if (fromEvents !== null && !isNaN(fromEvents)) return fromEvents;
  // Fallback ancien tSt/tOff pour matchs très anciens sans startedAt
  if (M.st === 'live') {
    if (!M.tSt) return M.tOff || 0;
    return (M.tOff || 0) + (Date.now() - M.tSt);
  }
  return M.tOff || 0;
}
```

**Et dans `togglePause` (`screen-match-live-v2.jsx`)** :

```js
const togglePause = () => {
  if (M.notStarted) return;
  const _now = Date.now();
  if (M.st === 'live') {
    M.tOff += _now - M.tSt;  // legacy, on garde pour compat
    M.st = 'paused';
    M.pauseStartedAt = _now;
    M.ev.push({ tp:'pause', mn: MATCH_HELPERS.gMin(M), ch: M.ch, ts: _now });
  } else if (M.st === 'paused') {
    // ... cumul pauseTotalMs ...
    const wasHalftime = !!M.inHalftime;
    if (wasHalftime && !M.periodStartedAt?.[M.ch]) {
      M.periodStartedAt = M.periodStartedAt || {};
      M.periodStartedAt[M.ch] = _now;
    }
    M.inHalftime = false;
    M.tSt = _now;
    M.st = 'live';
    M.ev.push({
      tp: wasHalftime ? 'period_start' : 'resume',
      mn: MATCH_HELPERS.gMin(M), ch: M.ch, ts: _now,
    });
  }
  rerender();
};
```

### Pourquoi c'est robuste
- `M.startedAt` et `M.ev[].ts` sont des timestamps **absolus** (ms epoch). Insensibles au cross-device.
- `M.ev` est **toujours** dans le payload Firestore via `saveMatchToCloud` → sync automatique.
- Pas de chrono epoch absurde si tSt manque.
- Le user peut éditer manuellement les ts d'un event a posteriori si besoin (bouton ✎ sur la timeline).

---

## Pattern B — Cleanup en cascade pour les matchs fantômes

Quand un match passe `status='finished'`, **3 mécanismes en parallèle** garantissent la propagation locale sur tous les devices :

### B1 — Watch live (sur écran match-live)
**Fichier** : `screen-match-live-v2.jsx`

```js
useEffectMV(() => {
  if (!M || M.notStarted || M.st === 'finished') return;
  if (!window.cddSync?.watchMatchFromCloud) return;
  const unsub = window.cddSync.watchMatchFromCloud(M.id, (doc) => {
    if (!doc || !Mref.current) return;
    const curr = Mref.current;
    let changed = false;
    const upd = {
      tSt: doc.tSt != null ? doc.tSt : curr.tSt,
      tOff: typeof doc.tOff === 'number' ? doc.tOff : (curr.tOff || 0),
      startedAt: doc.startedAt != null ? doc.startedAt : curr.startedAt,
      // ... autres champs
      st: doc.status || curr.st,
      ch: doc.period || curr.ch,
      sA: doc.teamA?.score ?? curr.sA,
      sB: doc.teamB?.score ?? curr.sB,
      ev: doc.events || curr.ev,
    };
    Object.keys(upd).forEach(k => {
      if (curr[k] !== upd[k]) { curr[k] = upd[k]; changed = true; }
    });
    // Cleanup si status='finished' arrive
    if (curr.st === 'finished' && !curr.endedAt) {
      curr.endedAt = Date.now();
      try {
        localStorage.setItem('cdd_match_last_finished', String(curr.id));
        localStorage.removeItem('cdd_match_current');
      } catch (e) {}
      if (window.CDD_REBUILD) window.CDD_REBUILD();
      window.dispatchEvent(new CustomEvent('cdd-data-rebuilt'));
      changed = true;
    }
    if (changed) forceRender({});
  });
  return () => { try { unsub(); } catch (e) {} };
}, [M && M.id, M && M.st, M && M.notStarted]);
```

### B2 — Cleanup pullCloudData (au boot/refresh)
**Fichier** : `firebase-sync.js → pullCloudData()`, après la boucle `teamsWithLive`

```js
try {
  const ghostCurrentId = localStorage.getItem('cdd_match_current');
  if (ghostCurrentId) {
    const stillClaimed = mergedTeams.some(t =>
      t && t.liveMatch && String(t.liveMatch.matchId) === String(ghostCurrentId)
    );
    if (!stillClaimed) {
      const ghostDoc = await fetchMatch(ghostCurrentId).catch(() => null);
      const isFinished = !ghostDoc || ghostDoc.status === 'finished';
      if (isFinished) {
        localStorage.setItem('cdd_match_last_finished', String(ghostCurrentId));
        localStorage.removeItem('cdd_match_current');
        // Mettre à jour le cache local cdd_match_<id> à st=finished
        const localKey = 'cdd_match_' + ghostCurrentId;
        const localRaw = localStorage.getItem(localKey);
        if (localRaw) {
          const local = JSON.parse(localRaw);
          if (local && local.st !== 'finished') {
            local.st = 'finished';
            local.endedAt = local.endedAt || (ghostDoc && ghostDoc.endedAt) || Date.now();
            localStorage.setItem(localKey, JSON.stringify(local));
          }
        }
      }
    }
  }
} catch (e) { console.warn('[cleanup] ghost match', e.message); }
```

### B3 — Bouton SOS Resync (action user)
**Fichier** : `firebase-sync.js → forceResyncMatch()`, visible dans Réglages

```js
async function forceResyncMatch() {
  // Purge toutes les clés cdd_match_* en localStorage
  const matchKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && (k.startsWith('cdd_match_') || k === 'cdd_match_current' || k === 'cdd_match_last_finished')) {
      matchKeys.push(k);
    }
  }
  matchKeys.forEach(k => localStorage.removeItem(k));
  // Re-pull cloud
  await pullCloudData();
  if (window.CDD_REBUILD) window.CDD_REBUILD();
  window.dispatchEvent(new CustomEvent('cdd-data-rebuilt'));
  return { ok: true, removed: matchKeys };
}
```

---

## Pattern C — Force end cross-device

### Le problème
Un match reste `paused` éternellement parce que :
- Personne n'a cliqué "Fin de match" (oubli)
- Le device d'origine est offline / a fermé l'onglet
- Le chrono est cassé → l'utilisateur n'ose pas cliquer

### La solution (depuis v167)
`cddData.forceEndMatch(matchId, teamId)` permet de clôturer depuis **n'importe quel device**, sans passer par l'écran match-live (qui peut être inaccessible).

**Backend (`firebase-sync.js`)** :

```js
async function forceEndMatch(matchId, teamId) {
  // 1. Écrit status=finished dans le doc cloud
  await setDoc(doc(db, COLL_MATCHES, String(matchId)), {
    status: 'finished',
    endedAt: Date.now(),
    forceEndedBy: getVoterId(),
    forceEndedAt: serverTimestamp(),
    savedAt: serverTimestamp(),
  }, { merge: true });
  // 2. Clear team.liveMatch
  if (teamId) await clearTeamLiveMatch(teamId);
  // 3. Cleanup local
  if (String(localStorage.getItem('cdd_match_current')) === String(matchId)) {
    localStorage.removeItem('cdd_match_current');
  }
  localStorage.setItem('cdd_match_last_finished', String(matchId));
  // ... update cdd_match_<id> à st=finished ...
  // 4. Marquer l'amical ended
  if (teamId && window.CDD_FRIENDLY?.markEnded) {
    window.CDD_FRIENDLY.markEnded(teamId, String(matchId));
  }
  // 5. REBUILD
  if (window.CDD_REBUILD) window.CDD_REBUILD();
  window.dispatchEvent(new CustomEvent('cdd-data-rebuilt'));
  return { ok: true };
}
```

**UI (`screen-home.jsx`)** : lien discret sous le bandeau rouge "MATCH EN COURS" → confirmation modale → appel `forceEndMatch`.

---

## Pattern D — Filtres anti-fantôme FFF

### Le problème
DOFA (API FFF) remonte parfois des matchs du **calendrier prévisionnel saison prochaine** avec :
- Adversaire non résolu (`?`, "À déterminer", vide…)
- Date à plusieurs mois dans le futur
- Heure pile `02h00` (artefact UTC midnight : FFF stocke `00:00 UTC`, JS l'affiche en CEST → `02:00`)

Ces matchs polluent `CDD_NEXT_MATCH` et s'affichent sur l'accueil comme "prochain match" alors qu'ils sont bidon.

### La solution (depuis v136)
**Fichier** : `data-bridge.js → applyFFFData()`

```js
const FUTURE_HORIZON_MS = 60 * 24 * 60 * 60 * 1000; // 60 jours
const _isUnresolvedName = (n) => {
  const v = (n || '').trim();
  return !v || v === '?' || /^(à déterminer|tbd|n\/a|inconnu)$/i.test(v);
};
const _isSuspiciousFFFMatch = (m) => {
  if (!m) return true;
  // ⚠ Tester m.home ET m.away (selon venue, l'opposant change)
  if (_isUnresolvedName(m.home) || _isUnresolvedName(m.away)) return true;
  const d = new Date(m.dateRaw);
  if (isNaN(d)) return false;
  const diffMs = d.getTime() - Date.now();
  if (diffMs > FUTURE_HORIZON_MS) return true;
  const h = d.getHours(); const mn = d.getMinutes();
  if ((h === 2 || h === 0) && mn === 0 && diffMs > 7 * 24 * 60 * 60 * 1000) return true;
  return false;
};
upcomingFiltered = upcomingFiltered.filter(m => !_isSuspiciousFFFMatch(m));
```

### Erreur classique à éviter
La v135 testait UNIQUEMENT `m.away`. Quand on joue à l'extérieur, `m.away = notre équipe` et l'adversaire est `m.home`. Donc le filtre passait à côté. **Toujours tester les deux côtés.**

---

## Pattern E — Scoreboard via `M.isAtHome` (PAS `CDD_NEXT_MATCH.venue`)

### Le problème
Le code initial utilisait `window.CDD_NEXT_MATCH?.venue === 'Domicile'` pour décider qui afficher à gauche du scoreboard FIFA (convention : recevant à gauche). Mais sur un device distant qui a tiré un match via `pullCloudData`, `CDD_NEXT_MATCH` peut pointer sur un autre match (le prochain FFF par exemple) → venue erronée → scoreboard inversé.

### La solution (depuis v131)
Toujours lire `M.isAtHome` (stocké sur le match au coup d'envoi via `M.isAtHome = isAtHome` dans `applyAndStart`). Fallback `CDD_NEXT_MATCH.venue` seulement si `M.isAtHome` non défini (matchs très anciens).

```jsx
const _isAtHome = (M.isAtHome !== undefined)
  ? !!M.isAtHome
  : (window.CDD_NEXT_MATCH?.venue === 'Domicile');
```

---

## Pattern F — No-overwrite null Firestore

### Le problème
Un device avec un état stale (ex: `tSt: null` parce qu'il a tiré le match avant le déploiement event sourcing) auto-save toutes les 10s. Si on push `null` dans Firestore avec `merge: true`, ça **écrase la valeur correcte** que le device d'origine vient de pousser. Race condition.

### La solution (depuis v167 de saveMatchToCloud)
Construire le payload conditionnellement : on **omet** un champ s'il n'a pas de valeur valide localement. Avec `merge: true`, Firestore conserve alors la valeur existante.

```js
const payload = { id: match.id, teamA, teamB, status: match.st, /* ... */ };
if (match.tSt != null)             payload.tSt = match.tSt;
if (typeof match.tOff === 'number' && match.tOff > 0) payload.tOff = match.tOff;
if (match.startedAt != null)       payload.startedAt = match.startedAt;
if (match.pauseStartedAt != null)  payload.pauseStartedAt = match.pauseStartedAt;
if (typeof match.inHalftime === 'boolean') payload.inHalftime = match.inHalftime;
if (match.htStart != null)         payload.htStart = match.htStart;
await setDoc(doc(db, COLL_MATCHES, matchId), payload, { merge: true });
```

---

## Pattern G — Watch toujours actif (pas conditionnel)

### Le problème
La v3 du watch conditionnait l'abonnement Firestore à un flag `M._pulledFromCloud`. Mais ce flag n'était pas présent dans les caches localStorage écrits avant le déploiement → watch silencieux → device distant jamais à jour.

### La solution (depuis v130)
S'abonner **systématiquement** dès qu'un match est live (`!M.notStarted && M.st !== 'finished'`). Les snapshots identiques au local sont des no-ops via le check `curr[k] !== upd[k]` → aucun surcoût côté device origine.

```js
useEffectMV(() => {
  if (!M || M.notStarted || M.st === 'finished') return;
  if (!window.cddSync?.watchMatchFromCloud) return;
  const unsub = window.cddSync.watchMatchFromCloud(M.id, (doc) => {
    // ... merge des champs avec préservation des valeurs locales valides si doc null ...
  });
  return () => { try { unsub(); } catch (e) {} };
}, [M && M.id, M && M.st, M && M.notStarted]);
```

---

## Pattern H — Schéma localShape de pullCloudData

Quand `pullCloudData` reconstruit un match depuis Firestore vers localStorage, le mapping doit inclure **TOUS** les champs chrono (sinon NaN cross-device).

```js
const localShape = {
  id: matchDoc.id || lmId,
  teamId: t.id, clubId: t.clubId || null,
  tA: matchDoc.teamA ? {n,c,p,bench} : null,
  tB: matchDoc.teamB ? {n,c,p,bench} : null,
  sA, sB, st: matchDoc.status, ch: matchDoc.period,
  cfg: matchDoc.config || {}, ev: matchDoc.events || [],
  yA,yB,rA,rB,uA,uB, at: matchDoc.addTime || 0,
  // ⚠ Ces champs sont CRITIQUES pour le chrono cross-device :
  tSt: matchDoc.tSt || null,
  tOff: typeof matchDoc.tOff === 'number' ? matchDoc.tOff : 0,
  startedAt: matchDoc.startedAt || null,
  pauseStartedAt: matchDoc.pauseStartedAt || null,
  inHalftime: matchDoc.inHalftime || false,
  htStart: matchDoc.htStart || null,
  savedAt: Date.now(),
};
```
