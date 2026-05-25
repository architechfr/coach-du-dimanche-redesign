# Checklist anti-fantôme — Coach du Dimanche V2

> À appliquer SYSTÉMATIQUEMENT avant tout commit qui touche le cycle de vie d'un match. La majorité des bugs cross-device passés viennent d'avoir sauté une de ces vérifications.

## Avant d'écrire le code

- [ ] J'ai lu `HANDOFF.md` à la racine du projet (état dernière session)
- [ ] J'ai identifié dans quelle(s) des **6 sources de vérité** je vais écrire
- [ ] Je sais ce que la modification affecte sur les 6 sources et les rends cohérentes
- [ ] La feature est testée mentalement contre le scénario "PC + téléphone connectés au même compte"
- [ ] Si je touche `firestore.rules` → je note de rappeler à Florian de les publier

## Pendant le code

- [ ] J'écris **Firestore d'abord**, localStorage **ensuite** (pas l'inverse)
- [ ] Je lis **Firestore au mount** (pas localStorage en premier) si l'écran dépend d'un match
- [ ] Pas d'écriture localStorage qui ne sera **pas** propagée au cloud
- [ ] Pas de calcul qui retourne `NaN` ou des valeurs inventées (préférer `null` → UI affiche `—:—`)
- [ ] Tout timestamp stocké est **absolu** (`Date.now()`) jamais relatif
- [ ] Si je touche `M.ev` ou la timeline → je vérifie que `computeChronoMs` reste cohérent
- [ ] Si je modifie un état de match → je m'assure que le watch propage l'update aux autres devices
- [ ] Les chemins de code marchent pour **TOUS les clubs/équipes** (pas hardcodé sur USDF/FCMH)

## Avant de committer

- [ ] J'ai bumpé les `?v=NN` dans `app.html` pour chaque `.jsx`/`.js`/`.css` modifié
- [ ] Tous les fichiers du commit ont le **même numéro de version**
- [ ] Le message de commit explique **pourquoi**, pas juste **quoi**
- [ ] Le message est en français
- [ ] Il finit par `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`

## Avant de pusher

- [ ] OneDrive est en pause (sinon `.git/index.lock` peut tilter)
- [ ] J'ai donné à Florian la commande `git push` en **bloc visible séparé**
- [ ] Si `firestore.rules` a changé → je lui rappelle de publier dans la console Firebase

## Tests cross-device obligatoires (avant de dire "c'est fini")

- [ ] **Test PC** : Ctrl+Shift+R, ouvre l'app, scenario qui touche le fix
- [ ] **Test téléphone 1** : kill app + relance, mêmes étapes, vérifier la cohérence avec PC
- [ ] **Test téléphone 2** (si applicable) : idem
- [ ] **Test offline** (si applicable) : couper wifi en plein scenario, vérifier la dégradation gracieuse
- [ ] **Test ad-blocker** (au moins une fois par session) : ouvrir DevTools, vérifier qu'il n'y a pas `ERR_BLOCKED_BY_CLIENT`

## Procédure cohérence 6 sources de vérité (pour les fixes match)

Avant de commit un fix qui touche un match, dérouler chaque source et écrire dans la PR / le commit l'impact :

### Si je modifie `status` ou `live/paused/finished`...

| Source | Action attendue |
|---|---|
| `cdd_match_current` | Reste si match toujours actif, supprimé si finished |
| `cdd_match_<id>` (objet) | `st` mis à jour, `endedAt` posé si finished |
| `cdd_match_last_finished` | Posé sur l'id si finished |
| `cdd_friendly_matches[].endedAt` | Posé si c'est un amical qui se termine |
| `cdd_v2_matches/{id}.status` (cloud) | Source de vérité, écrit en premier |
| `teams/{teamId}.liveMatch.matchId` (cloud) | Cleared si finished |
| `listCoachFinishedMatches()` | Ne lit que local — gap connu, refactor à venir |

### Si je crée un nouvel amical...

| Source | Action attendue |
|---|---|
| `cdd_friendly_matches[teamId][]` | Ajout local immédiat |
| `friendly_matches/{teamId}_{matchId}` (cloud) | Push `saveFriendlyMatch` |
| `CDD_NEXT_MATCH` | Refait par `CDD_REBUILD()` |
| `CDD_FFF_UPCOMING` | Inchangé (les FFF restent séparés) |

### Si je termine un match (endMatch ou forceEndMatch)...

| Source | Action attendue |
|---|---|
| `M.st` | `'finished'` |
| `M.endedAt` | `Date.now()` |
| `M.ev.push({tp:'end'})` | Ajouté |
| `cdd_match_current` | `removeItem` |
| `cdd_match_last_finished` | `setItem(matchId)` |
| `cdd_match_<id>` | `st='finished'`, `endedAt` posé |
| `cdd_friendly_matches[teamId][].endedAt` | `markEnded` si amical |
| `cdd_v2_matches/{id}.status` (cloud) | `'finished'` via `saveMatchToCloud` |
| `teams/{teamId}.liveMatch.matchId` (cloud) | `clearTeamLiveMatch` |
| `CDD_REBUILD()` | Appelé pour rafraîchir `CDD_NEXT_MATCH` etc. |
| Event `cdd-data-rebuilt` | Dispatch |

## Anti-patterns à éviter

### ❌ Mauvais
```js
// Lit localStorage en premier au mount d'un écran match
const M = MATCH_HELPERS.loadMatch(localStorage.getItem('cdd_match_current'));
```

### ✅ Bon (cible Firestore-first, voir refactor-plan.md)
```js
const matchId = URLParams.get('match') || localStorage.getItem('cdd_match_current');
const cloudDoc = await Promise.race([
  cddData.fetchMatch(matchId),
  timeoutAfter(3000)
]);
const M = cloudDoc ? reconstructFromCloud(cloudDoc) : MATCH_HELPERS.loadMatch(matchId);
```

### ❌ Mauvais
```js
// Push tSt=null vers le cloud, écrase la valeur valide
payload.tSt = match.tSt || null;
```

### ✅ Bon
```js
// Omet le champ si null, merge:true préserve le cloud
if (match.tSt != null) payload.tSt = match.tSt;
```

### ❌ Mauvais
```js
// Chrono qui invente
return M.tOff + (Date.now() - M.tSt); // NaN si tSt null
```

### ✅ Bon
```js
// Chrono qui assume "pas d'info"
const fromEvents = computeChronoMs(M);
return (fromEvents !== null && !isNaN(fromEvents)) ? fromEvents : null;
// UI affiche '—:—' si null
```

### ❌ Mauvais
```js
// Watch conditionnel sur un flag stale
if (!M._pulledFromCloud) return; // jamais set sur les vieux caches → watch jamais lancé
```

### ✅ Bon
```js
// Watch systématique pour tout match live
if (M.notStarted || M.st === 'finished') return;
// Watch tourne, le check curr[k] !== upd[k] évite les no-ops
```

### ❌ Mauvais
```js
// Filtre opponent uniquement sur m.away
if (m.away === '?') return true;
```

### ✅ Bon
```js
// Tester les deux côtés selon venue
if (_isUnresolvedName(m.home) || _isUnresolvedName(m.away)) return true;
```

## Si tu doutes

Demander à Florian. Mieux vaut une question de plus que 8 commits qui se ramassent.
