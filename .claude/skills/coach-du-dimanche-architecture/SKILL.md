---
name: coach-du-dimanche-architecture
description: Référentiel d'architecture pour le projet **Coach du Dimanche V2** (PWA football amateur, dossier `Version/V2/`, dépôt `coach-du-dimanche-redesign`, déployé sur Vercel, backend Firestore plan Spark). Charge cette skill DÈS QUE l'utilisateur (Florian, alias `archi.tech.fr@gmail.com`) ouvre ou parle de ce projet, mentionne FCMH/USDF, parle de matchs live, convocations, cycle de vie d'un match, compo, vote post-match, parents/joueurs/coachs/lecteurs, ou édite un des fichiers suivants : `screen-*.jsx`, `firebase-sync.js`, `data-bridge.js`, `match-engine.js`, `roles.js`, `match-info.js`, `friendly-matches.js`, `jersey-numbers.js`, `coach-profile.js`, `match-switcher.js`, `data-adapter.js`, `position-rating.js`. La skill contient l'inventaire des **6 sources de vérité divergentes** qui causent les bugs cross-device, la **règle d'or Firestore-first**, le **glossaire technique**, les **patterns de fix éprouvés**, les **pièges connus** (ad-blocker bloquant Firestore, OneDrive verrouillant `.git`, cache buster manuel), et le **plan de refonte** à exécuter. Sans cette skill, Claude redécouvre les pièges à chaque session et propose des patches incohérents au lieu d'un travail architectural propre.
---

# Coach du Dimanche V2 — Référentiel d'architecture

> **À LIRE EN PREMIER à chaque session.** Cette skill capture 14h+ de travail collaboratif Florian/Claude. Sans elle, on tourne en rond, on repatche les mêmes choses, on rate les vrais problèmes architecturaux.

## 1. Le projet en 30 secondes

- **App** : PWA web mobile-first pour le **football amateur** (PAS de futsal/rugby/marques FIFA-FUT)
- **Stack** : HTML/CSS + JSX transpilé par Babel **dans le navigateur** (`type="text/babel"`). Tout est en scope global (`window.*`). **Pas de build, pas de bundler.**
- **Backend** : Firebase projet `arbitre-sport`, plan gratuit Spark (pas de Cloud Functions, sécurité 100% via `firestore.rules`)
- **Déploiement** : Vercel auto-deploy sur push `main` → `coach-du-dimanche-redesign.vercel.app`
- **Dépôt Git** : `github.com/architechfr/coach-du-dimanche-redesign` (la racine = dossier `Version/V2/`)
- **Admin** : `archi.tech.fr@gmail.com` (Florian)
- **Workflow de Florian** : pousse lui-même via Git Bash, éditeur `notepad`

**Lire absolument** : `HANDOFF.md` à la racine du projet pour l'état détaillé de la dernière session, et `CLAUDE.md` pour les conventions.

## 2. ⚠ LE PROBLÈME CENTRAL — 6 sources de vérité divergentes

C'est **la cause #1** de tous les bugs cross-device "match fantôme", "chrono cassé", "historique manquant". L'app n'a pas une mais **SIX** sources de vérité concurrentes pour l'état d'un match :

| # | Source | Type | Qui écrit | Qui lit | Quand ça diverge |
|---|---|---|---|---|---|
| 1 | `localStorage['cdd_match_current']` | string (matchId) | `startMatch()`, `endMatch()`, `pullCloudData` | `getLiveMatch()`, écran Match Live | Un device finit, l'autre garde le pointeur |
| 2 | `localStorage['cdd_match_<id>']` | objet match | `saveMatch()`, `pullCloudData` localShape | `loadMatch()`, écrans | Une partie auto-save écrase, l'autre est stale |
| 3 | `localStorage['cdd_match_last_finished']` | string (matchId) | `endMatch()`, watch cleanup | filtres post-match | Pointe sur ancien match → l'écarte des "à venir" |
| 4 | `localStorage['cdd_friendly_matches'][teamId][]` (objets avec `endedAt`) | array d'amicaux | `CDD_FRIENDLY.create/markEnded` | `CDD_FRIENDLY.list`, data-bridge | Un device a la liste fraîche, l'autre non |
| 5 | `Firestore: cdd_v2_matches/{matchId}.status` | `'live'\|'paused'\|'finished'` | `saveMatchToCloud`, `forceEndMatch` | `watchMatchFromCloud`, `fetchMatch` | **Source de vérité** mais pas toujours respectée |
| 6 | `Firestore: teams/{teamId}.liveMatch.matchId` | string ou null | `setTeamLiveMatch`, `clearTeamLiveMatch` | `pullCloudData` | Pointeur cloud, doit rester aligné avec status |

**Et un 7ème oubli** : `listCoachFinishedMatches()` dans `match-engine.js` **scanne localStorage** au lieu de lire le cloud → "Derniers matchs" affiche un historique différent sur chaque device.

➡ **À chaque fix d'un bug match, vérifier que les 6+1 sources restent cohérentes.** Voir `references/checklist.md`.

## 3. 🎯 LA RÈGLE D'OR (à inculquer à toute évolution future)

```
Firestore = SEULE source de vérité
localStorage = cache PASSIF (lecture rapide, jamais d'écriture autoritaire)
```

**Corollaires :**
- Toute action utilisateur (BUT, pause, fin, création amical…) → écrit Firestore D'ABORD, met à jour le local ENSUITE
- Toute lecture historique (Derniers matchs, classements, votes…) → lit Firestore d'abord, fallback local seulement si offline
- Au mount d'un écran qui dépend d'un match → `fetchMatch(matchId)` avec timeout 3s, fallback localStorage uniquement si timeout
- Si le cloud est inaccessible (ad-blocker, 3G, déconnexion) → bannière rouge claire "Connexion impossible" + bloquer les actions critiques
- Plus jamais de "auto-save 10s qui écrase le cloud avec des nulls stales"

## 4. Glossaire technique essentiel

| Nom | Type | Rôle |
|---|---|---|
| `CDD_NEXT_MATCH` | global window | Le prochain match à jouer (FFF ou amical). Construit par `data-bridge.js` selon priorité : choix explicite > amical proche > FFF |
| `CDD_LIVE_MATCH` | global window | Match en cours (déduit de `cdd_match_current`) |
| `CDD_LAST_MATCHES` | global window | Historique des matchs joués (⚠ bug : scanne localStorage, pas cloud) |
| `CDD_PLAYERS` | global window | Joueurs de l'équipe active |
| `CDD_CONVO` | global window | Convocations du match courant (titulaires + bench) |
| `CDD_REBUILD()` | global window | Reconstruit tous les `CDD_*` après changement de données |
| `CDD_ROLES.effectiveRole()` | helper | Rôle effectif (coach/owner/adjoint/parent/joueur/lecteur/admin) sur l'équipe active |
| `CDD_ROLES.canDo(cap)` | helper | Capacités : `compo`, `effectif`, `club` |
| `MATCH_HELPERS.gMatch(M)` | helper | Temps écoulé dans la période courante (ms) — **utilise event sourcing** depuis v134 |
| `MATCH_HELPERS.gMin(M)` | helper | Minute officielle du match (depuis kickoff cumulatif) |
| `MATCH_HELPERS.computeChronoMs(M)` | helper | Source de vérité du chrono via M.ev (depuis v134) |
| `MATCH_HELPERS.getLiveMatch()` | helper | Récupère le match en cours ou null (gère ABANDON_MS > 6h) |
| `cddData.*` (firebase-sync.js) | namespace | API Firestore (saveClub, fetchMatch, pullCloudData, etc.) |
| `cddSync.*` | namespace | API live (watchMatchFromCloud, watchConvocResponses, saveMatchToCloud) |
| `cddAuth.*` | namespace | Auth (email-link + Google sign-in) |
| `M.tSt`, `M.tOff` | match property | **LEGACY** — anciens champs chrono fragiles. Ne plus s'en servir comme source de vérité, utiliser `M.ev` |
| `M.startedAt`, `M.endedAt` | match property | Timestamps absolus du kickoff et de la fin (en ms epoch) |
| `M.ev[]` | match property | **NOUVEAU** — array d'événements timestampés (`tp`, `ts`, `ch`, `mn`). Source de vérité chrono |
| `M.isAtHome` | match property | Domicile (true) ou extérieur (false). Posé au coup d'envoi. À utiliser pour le scoreboard (PAS `CDD_NEXT_MATCH.venue`) |

**Détail complet** : voir `references/glossary.md`.

## 5. Patterns de fix éprouvés (à RÉUTILISER, pas réinventer)

### Pattern A — Event sourcing du chrono
**Problème** : `tSt`/`tOff` se perdent en cross-device → chrono affiche `29662334:37` (Date.now() en minutes).
**Solution** : calculer le chrono depuis `M.startedAt` + events `pause`/`resume`/`period_start` + `Date.now()`. Tous les devices ont les mêmes events (sync via `M.ev` dans Firestore) → tous calculent le même chrono.
**Implémentation** : `match-engine.js → computeChronoMs()` (v134). `togglePause` doit pousser `{tp:'pause', ts, ch}` ou `{tp:'resume'|'period_start', ts, ch}`.

### Pattern B — Cleanup en cascade pour les matchs fantômes
Quand un match passe `status='finished'`, **3 mécanismes en parallèle** garantissent la propagation :
1. **Watch live** (`screen-match-live-v2.jsx`) : si on est sur l'écran match-live, le watch détecte `doc.status==='finished'` et clean local immédiatement
2. **Cleanup pullCloudData** (`firebase-sync.js`) : à chaque login/refresh, si `cdd_match_current` pointe sur un match dont plus aucune team ne revendique en `liveMatch.matchId`, on vérifie le cloud et on clean
3. **Bouton SOS Resync** (Réglages) : action utilisateur de purge + re-pull total

### Pattern C — Force end cross-device
**Problème** : un match reste `paused` éternellement parce que personne n'a cliqué "Fin de match", ou parce que le device d'origine est offline.
**Solution** : `cddData.forceEndMatch(matchId, teamId)` écrit direct `status='finished'` + `endedAt` dans Firestore + `clearTeamLiveMatch`. Bouton visible sur l'accueil sous le bandeau rouge "MATCH EN COURS" (depuis v167).

### Pattern D — Filtres anti-fantôme FFF
**Problème** : DOFA remonte des matchs FFF de la saison prochaine (placeholder calendrier prévisionnel) qui s'affichent comme "prochain match" avec adversaire `?` et heure `02h00` (UTC midnight CEST).
**Solution** : dans `data-bridge.js`, filtre `_isSuspiciousFFFMatch(m)` qui exclut :
- `m.home` OU `m.away` unresolved (`?`, `À déterminer`, vide…)
- Date > 60 jours dans le futur
- Heure pile 00h00 ou 02h00 ET match à >7 jours

⚠ **Bug fréquent** : tester UNIQUEMENT `m.away` rate les matchs où on joue à l'extérieur (notre équipe est `m.away`, l'adversaire est `m.home`). Toujours tester les DEUX côtés.

**Détails et code** : voir `references/patterns.md`.

## 6. Pièges connus (perdre du temps dessus = inutile)

### Piège 1 — Ad-blocker / Brave Shield / Arc Shield bloquent Firestore
**Symptôme** : `ERR_BLOCKED_BY_CLIENT` dans la console DevTools sur `firestore.googleapis.com`. Le watch ne reçoit rien, les actions ne se propagent pas.
**Diagnostic** : faire ouvrir F12 → Console → chercher `ERR_BLOCKED_BY_CLIENT`.
**Solution** : désactiver l'ad-blocker sur le domaine, ou tester en navigation privée vierge.

### Piège 2 — OneDrive verrouille `.git/index.lock`
**Symptôme** : `git push` échoue avec "Deletion of directory failed", `.git/index.lock` ressuscite.
**Solution** : mettre OneDrive en pause avant un push (clic droit sur l'icône OneDrive → Pause).

### Piège 3 — Cache buster manuel à incrémenter
**Convention** : 1 push git = 1 numéro de version. Tous les fichiers modifiés dans le même commit prennent le même `?v=NN`. Le push suivant incrémente de 1.
**Action** : avant chaque commit, **bumper les `?v=` dans `app.html`** pour les fichiers `.jsx`/`.js`/`.css` modifiés.
**Versions actuelles** : `firebase-sync.js` v167, `match-engine.js` v134, `data-bridge.js` v136, `screen-match-live-v2.jsx` v131, `screen-home.jsx` v164. À vérifier avec `grep "?v=" app.html`.

### Piège 4 — Édition Babel-in-browser = pas de TypeScript, pas de bundler
**Conséquence** : pas d'imports ES6 entre fichiers JSX. Tout passe par `window.*`. Toute fonction exposée doit être assignée à `window.XXX` à la fin du fichier.

### Piège 5 — `firestore.rules` se déploie À LA MAIN
**Action** : après toute modif de `firestore.rules`, ouvrir la console Firebase → Firestore → Règles → coller le contenu → Publier. **Pas de déploiement automatique.**

### Piège 6 — Cross-team contamination via `CDD_NEXT_MATCH`
**Bug historique** : un amical de l'équipe USDF apparaissait comme prochain match de FCMH U15A parce que `CDD_NEXT_MATCH` n'avait pas de `teamId`.
**Fix** : `CDD_NEXT_MATCH` doit toujours porter un `teamId` et les écrans doivent vérifier que `prevNext.teamId === activeTeam.id`.

### Piège 7 — Florian a 2-3 téléphones + PC, tous connectés au même compte
Donc les bugs cross-device sont quotidiens pour lui. Si quelque chose marche sur 1 device mais pas l'autre, c'est une vraie désync, pas une illusion.

**Détails** : voir `references/pitfalls.md`.

## 7. 🚧 Refonte Firestore-first — chantier prioritaire

L'architecture actuelle est patchée mais reste fragile. Le **vrai fix de fond** est une refonte du cycle de vie match en 6 phases (validée par Florian) :

1. **URL canonique** `?match=m_xxx` au lieu de devinette via localStorage
2. **Firestore-first read au mount** (timeout 3s, fallback localStorage uniquement si offline)
3. **Watch toujours actif** + indicateur visuel "🟢 Sync OK" / "🔴 Déconnecté"
4. **Écritures optimistes** avec détection d'échec (bannière "Action non synchronisée")
5. **Chrono robuste** : `—:—` si données invalides (jamais d'invention)
6. **Mode lecteur public** sur la même URL avec `?view=lecteur` (partageable WhatsApp)

**Avant la refonte, créer une autre skill ou lire** : `references/refactor-plan.md` pour le plan détaillé.

## 8. ✅ Checklist anti-fantôme pour TOUT nouveau code matchs

À appliquer systématiquement avant tout commit :

- [ ] Est-ce que j'écris Firestore D'ABORD (pas localStorage en premier) ?
- [ ] Est-ce que je lis Firestore au mount (pas localStorage en premier) ?
- [ ] Si je modifie l'état d'un match, est-ce que les 6+1 sources restent cohérentes ?
- [ ] Est-ce que les autres devices reçoivent l'update via watch dans <10s ?
- [ ] Est-ce que ça marche si le device d'origine est offline ?
- [ ] Est-ce que ça marche pour TOUS les clubs/équipes (pas seulement USDF/FCMH) ?
- [ ] Est-ce qu'un chrono cassé reste affichable en `—:—` (jamais Date.now() ou NaN) ?
- [ ] Est-ce que j'ai bumpé les cache busters `?v=NN` dans `app.html` ?
- [ ] Est-ce que `firestore.rules` est inchangé OU que je rappelle à Florian de publier ?

## 9. Session log — leçons des sessions passées

Voir `references/session-log.md`. À mettre à jour à chaque fin de session via `/handoff`.

## 10. Pour commencer une session

1. **Lis `HANDOFF.md`** à la racine du projet pour l'état le plus récent
2. **Si l'utilisateur signale un bug** → applique la checklist anti-fantôme (section 8) AVANT de patcher
3. **Si l'utilisateur veut une nouvelle feature** → vérifie qu'elle respecte la règle d'or Firestore-first (section 3)
4. **À chaque commit** → bump des cache busters, message clair en français
5. **À chaque push** → toujours donner la commande `git push` en bloc visible séparé

> "On a un problème toutes les 2 secondes" disait Florian. C'est faux : on a UN problème (la désync des 6 sources) qui se manifeste sous 50 visages. Cette skill est le rappel permanent que **le vrai travail est architectural, pas cosmétique**.
