# Plan de refonte Firestore-first — Coach du Dimanche V2

> Chantier prioritaire validé par Florian le 26/05/2026. Remplace l'architecture actuelle (5+ sources de vérité divergentes) par un modèle **Firestore = source unique, localStorage = cache passif**. Estimation : 1 session ciblée de 3-4h, sur l'app calme, sans test concurrent.

## Objectif

> "Centraliser les datas. La personne qui arbitre / entre les données → tout va en ligne. Les autres se tiennent au courant par un moyen technique fiable." — Florian, 26/05/2026

Plus de localStorage qui décide tout seul. Plus de match fantôme. Plus de chrono cassé. Une seule vérité = Firestore, propagée en temps réel.

## Architecture cible

```
                   ┌───────────────────────────┐
                   │   FIRESTORE (cloud)       │
                   │   = SOURCE DE VÉRITÉ      │
                   └────────────┬──────────────┘
                                │
                  ┌─────────────┼─────────────┐
                  │             │             │
              [watch live]  [read once]   [write first]
                  ↓             ↓             ↓
             ┌───────┐    ┌───────┐    ┌─────────────┐
             │Device1│    │Device2│    │  Device3    │
             │(coach)│    │(adjoint)│  │  (parent)   │
             └───┬───┘    └───┬───┘    └──────┬──────┘
                 │            │               │
                localStorage = cache passif (offline only)
```

## Les 6 phases

### Phase 1 — URL canonique par match (`?match=m_xxx`)

**Objectif** : un match = une URL = une vérité. Plus de devinette via `cdd_match_current` localStorage.

**Implémentation** :
- Ajouter le param `match` dans l'URL au moment de `startMatch()` via `history.pushState`
- Au mount de l'app, lire `URLSearchParams.get('match')` en priorité sur `cdd_match_current`
- Bouton "Partager le match" → copie l'URL avec `?match=m_xxx`
- Cette URL marche pour le coach, adjoint, parent, joueur, lecteur — chacun selon ses droits

**Bénéfice** : un lien suffit à pointer sur le bon match, même si le device n'avait jamais ce match en cache.

### Phase 2 — Firestore-first read au mount

**Objectif** : les écrans qui dépendent d'un match doivent lire Firestore D'ABORD, pas localStorage.

**Implémentation** (`screen-match-live-v2.jsx`) :
```js
// AU MOUNT (remplace la lecture localStorage actuelle)
const [loadState, setLoadState] = useState('loading'); // 'loading'|'ready'|'offline'|'error'
useEffect(() => {
  const matchId = new URLSearchParams(location.search).get('match')
                  || localStorage.getItem('cdd_match_current');
  if (!matchId) {
    setLoadState('no-match');
    return;
  }
  // Try cloud first (3s timeout)
  Promise.race([
    cddData.fetchMatch(matchId),
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000))
  ])
  .then(doc => {
    if (!doc) { setLoadState('not-found'); return; }
    if (doc.status === 'finished') {
      // Cleanup local + nav away
      localStorage.removeItem('cdd_match_current');
      go('home');
      return;
    }
    // Reconstruct M from cloud doc (localShape)
    Mref.current = reconstructFromCloud(doc, matchId);
    setLoadState('ready');
  })
  .catch(err => {
    // Cloud unreachable : fallback localStorage uniquement si récent
    const local = MATCH_HELPERS.loadMatch(matchId);
    if (local && local.savedAt && Date.now() - local.savedAt < 60000) {
      Mref.current = local;
      setLoadState('offline');
    } else {
      setLoadState('error');
    }
  });
}, []);

// Render selon loadState
if (loadState === 'loading') return <Spinner text="Chargement du match…"/>;
if (loadState === 'no-match') return <NoMatchScreen/>;
if (loadState === 'not-found') return <MatchNotFoundScreen/>;
if (loadState === 'error') return <OfflineScreen onRetry={...}/>;
if (loadState === 'offline') return <OfflineBanner/> + <MatchUI/>;
```

### Phase 3 — Watch toujours actif + indicateur de connexion

**Objectif** : feedback visuel permanent à l'utilisateur sur l'état de la sync cloud.

**Implémentation** :
- Bannière en haut de l'écran match-live :
  - `🟢 Sync OK` (vert, disparaît en 2s après le 1er snapshot)
  - `🔴 Pas de connexion au cloud — désactive ton ad-blocker ou change de navigateur` (rouge persistant)
  - `🟡 Reconnexion en cours…` (jaune, pendant tentative)
- Watch est lancé au mount et reste actif tant que le match n'est pas `finished`
- Détection cloud bloqué : si pas de snapshot après 5s + 1 tentative `fetchMatch` qui échoue → state `cloud-blocked`

### Phase 4 — Écritures optimistes avec détection d'échec

**Objectif** : UI réactive (BUT, JAUNE, ROUGE ressentis instantanément), mais user prévenu si la sauvegarde cloud échoue.

**Implémentation** :
```js
async function recordEvent(M, event) {
  // 1. Mute local immédiatement
  M.ev.push(event);
  rerender();
  // 2. Push cloud
  try {
    await cddSync.saveMatchToCloud(M);
    // 3. Si OK : pas de UI feedback (silence = succès)
  } catch (err) {
    // 4. Si KO : bannière persistante "Action non synchronisée"
    showSyncFailureBanner({
      event,
      retry: () => recordEvent(M, event),
      ignore: () => /* ne propose plus de retry */,
    });
  }
}
```

**Bannière "Action non synchronisée"** :
- Visible en haut de l'écran tant qu'un event a échoué
- Bouton "🔄 Réessayer" + "Ignorer"
- Bouton "🔄 Tout resynchroniser" qui repush tous les events échoués en batch

### Phase 5 — Chrono robuste (jamais d'invention)

**Objectif** : si on n'a pas l'info, on affiche `—:—`, jamais une valeur fabriquée.

**Implémentation** (`match-engine.js`) :
```js
function gMatch(M) {
  if (!M || M.notStarted) return null; // ← null, pas 0
  const fromEvents = computeChronoMs(M);
  if (fromEvents !== null && !isNaN(fromEvents) && fromEvents >= 0) {
    return fromEvents;
  }
  return null; // Pas de fallback hasardeux
}
```

Et dans l'affichage :
```jsx
const ms = MATCH_HELPERS.gMatch(M);
const display = (ms == null) ? '—:—' : MATCH_HELPERS.fmtMMSS(ms);
```

**Avantage** : si la sync cloud ramène un `tSt` valide, le chrono reprend automatiquement. Pas de "0:00 puis 47:23 d'un coup".

### Phase 6 — Mode lecteur public sur la même URL

**Objectif** : un parent / famille / sponsor reçoit l'URL `?match=m_xxx&view=lecteur` → page lecture seule avec score live, timeline, compo. Pas besoin de login.

**Implémentation** :
- Param URL `view=lecteur` force le mode read-only
- Au lieu de demander un login Google, propose un sign-in optionnel "Me reconnecter" pour vote post-match
- Read public via `firestore.rules` : le doc `cdd_v2_matches/{id}` est lisible par tous, write réservé au coach (déjà en place actuellement, à vérifier)
- Bouton "Partager" sur l'écran coach → copie URL avec `?match=X&view=lecteur` → WhatsApp/SMS direct

**Bonus** : la page Lecteur actuelle (`screen-prep-arb-lec-vote.jsx`) peut être harmonisée pour utiliser la même URL.

## Migration des données existantes

### Matchs en cours au moment de la bascule
- Les matchs avec `status='paused'/'live'` dans Firestore doivent être terminés AVANT la bascule (sinon ils flottent dans l'ancien modèle)
- Action manuelle : `forceEndMatch` sur chaque match orphelin via une commande admin
- OU script de migration qui pose `status='finished'` automatiquement aux matchs sans activité > 6h

### Listes "Derniers matchs"
- Réécrire `listCoachFinishedMatches()` pour lire `cdd_v2_matches` filtré par `clubId` + `status='finished'`, trié par `endedAt desc`, limit 10-20
- Cache localStorage uniquement pour offline (mais pas comme source primaire)

### Convocations / votes
- Déjà sur Firestore (collections `convoc_responses`, `votes`)
- À vérifier : pas de divergence localStorage qui prendrait le pas

## Pour commencer cette refonte

### Pré-requis avant d'attaquer
1. Tous les bugs critiques actuels stabilisés (✓ fait dans session 26/05)
2. Un moment calme (pas en plein match en direct)
3. Florian disponible pour tester sur ses 3 devices
4. Backup Firestore (export depuis console Firebase)

### Ordre d'exécution recommandé
1. **Phase 5** (chrono robuste) — peu invasif, gros gain UX
2. **Phase 1** (URL canonique) — fondation pour les autres phases
3. **Phase 2** (Firestore-first read) — gros chantier, refait `screen-match-live-v2.jsx` mount
4. **Phase 3** (watch + indicateur) — sécurise l'UX
5. **Phase 4** (écritures optimistes) — robustifie les actions
6. **Phase 6** (mode lecteur) — feature visible utilisateur

### Tests obligatoires à chaque phase
- Test cross-device : PC + téléphone + tablette en parallèle
- Test offline : couper le wifi sur un device en plein match
- Test ad-blocker actif : vérifier que la bannière rouge apparaît
- Test "match qui traîne" : laisser un match paused 6h et voir si l'auto-end joue
- Test multi-clubs : un coach FCMH + un coach USDF sur le même device, vérifier l'isolation

## Critères de succès

✅ Le coach peut basculer entre 3 devices pendant un match, le chrono reste juste
✅ Si un device perd la connexion, l'utilisateur voit "Hors ligne, sync impossible"
✅ Quand le réseau revient, la sync repart toute seule
✅ Le "Forcer la fin" devient inutile en condition normale (mais reste dispo pour les cas dégradés)
✅ "Derniers matchs" affiche le même historique sur tous les devices
✅ Plus de match fantôme après un endMatch
✅ Plus de chrono `29662334:37`
✅ Un parent peut suivre le match en live via une URL partagée WhatsApp
