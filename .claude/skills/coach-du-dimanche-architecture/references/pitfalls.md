# Pièges connus — Coach du Dimanche V2

> Liste exhaustive des écueils sur lesquels j'ai déjà perdu du temps. Toujours vérifier ici avant de chercher la cause d'un bug bizarre.

## Piège 1 — Ad-blocker / Privacy Shield bloque Firestore

### Symptômes
- Chrono cassé / `29662334:37`
- Watch ne reçoit rien
- Actions ne se propagent pas cross-device
- Match fantôme qui ne se nettoie jamais

### Diagnostic
F12 → Console DevTools → chercher :
```
Failed to load resource:
firestore.googleapis...
net::ERR_BLOCKED_BY_CLIENT
```

### Navigateurs / extensions coupables
- **Arc Browser** (Arc Shield activé par défaut)
- **Brave** (Brave Shield bloque Google APIs par défaut)
- **uBlock Origin** avec liste anti-tracking aggressive
- **Privacy Badger**
- **AdGuard**

### Solution
- Désactiver la protection sur `coach-du-dimanche-redesign.vercel.app` et `googleapis.com`
- OU tester en navigation privée avec extensions désactivées
- OU utiliser Chrome / Edge vierge

### Bug qui en découle dans le code
Sans cette détection visible côté UI, l'app ressemble à un bug du code. **Phase 0 prioritaire de la refonte** : bannière rouge "Cloud injoignable" au mount si test Firestore échoue.

---

## Piège 2 — OneDrive verrouille `.git/index.lock`

### Symptôme
```
git push
fatal: Unable to create '.git/index.lock': File exists
```
ou prompts "Deletion of directory failed" pendant l'opération.

### Cause
Le projet est dans `OneDrive`, qui synchronise en arrière-plan et peut verrouiller des fichiers Git en plein milieu d'une opération.

### Solution
**Avant tout push lourd** : clic droit sur l'icône OneDrive (taskbar) → **Pause la synchronisation** (2 heures, 8 heures…) → faire le push → relancer la sync.

---

## Piège 3 — Cache buster manuel à incrémenter

### Convention
**1 push git = 1 numéro de version.** Tous les fichiers modifiés dans le même commit prennent le même `?v=NN` dans `app.html`. Le push suivant incrémente de 1. **Pas de réutilisation d'un numéro.**

### Action à chaque commit
1. Vérifier les fichiers modifiés : `git diff --stat`
2. Pour chacun (`.jsx`, `.js`, `.css`), trouver le `?v=` dans `app.html` et l'incrémenter
3. Si plusieurs fichiers dans le même commit → même numéro pour tous
4. Si un seul fichier → incrémenter juste celui-là

### Fichiers SANS cache buster (historiquement stables)
- `player-card.jsx`
- `screen-share.jsx`
- `tweaks-panel.jsx`
- `status-detail-modal.jsx`
- (à vérifier via `grep -L "?v=" app.html` si besoin)

### Versions actuelles (à jour le 26/05/2026)
| Fichier | Version actuelle |
|---|---|
| `firebase-sync.js` | v167 |
| `match-engine.js` | v134 |
| `data-bridge.js` | v136 |
| `roles.js` | v96 |
| `screen-home.jsx` | v164 |
| `screen-match-live-v2.jsx` | v131 |
| `screen-onb-set.jsx` | v100 |
| `screen-match-prep.jsx` | v124 |
| `screen-results-conv.jsx` | v144 |
| `screen-effectif-lineup.jsx` | v118 |
| `screen-landing.jsx` | v153 |
| `screen-prep-arb-lec-vote.jsx` | (voir handoff) |
| `jersey-numbers-modal.jsx` | v115 |
| `invite-manager.jsx` | v154 |
| `admin-clubs-panel.jsx` | v155 |
| `calendar-export.js` | v1 |
| `fff-fetcher.js` | v8 |

⚠ **Toujours vérifier `grep "?v=" app.html`** avant de commit pour ne pas oublier un fichier.

---

## Piège 4 — Babel-in-browser = pas d'ES modules entre fichiers JSX

### Conséquence
Les fichiers `.jsx` sont transpilés par Babel **dans le navigateur** au runtime. Il n'y a **pas d'imports ES6** entre eux. Tout passe par `window.*`.

### Convention
- Toute fonction qu'on veut exposer doit être assignée à `window.XXX` à la fin du fichier
- Les `const { useState, useEffect } = React` au début des fichiers viennent de `window.React`
- Ne **pas** essayer de mettre des `import X from './Y'` dans un fichier JSX

### Exception
`firebase-sync.js` est chargé en `type="module"` (pour pouvoir importer les SDK Firebase). C'est le **seul** fichier avec des `import`.

---

## Piège 5 — `firestore.rules` se déploie À LA MAIN

### Symptôme
Après modif des rules, les écritures sont refusées en prod alors que ça marchait avant.

### Cause
`firestore.rules` est pushé sur GitHub mais **pas déployé automatiquement** par Vercel (qui ne touche qu'au front).

### Action obligatoire après toute modif de `firestore.rules`
1. Ouvrir [console Firebase](https://console.firebase.google.com/project/arbitre-sport/firestore/rules)
2. Coller le nouveau contenu de `firestore.rules`
3. Cliquer **Publier**

⚠ À rappeler à Florian dans le message de commit si on a touché les rules.

---

## Piège 6 — Cross-team contamination via `CDD_NEXT_MATCH`

### Symptôme
Un amical de l'équipe USDF apparaissait comme prochain match de FCMH U15A, malgré le switch d'équipe.

### Cause
`CDD_NEXT_MATCH` était écrit globalement sans `teamId` → pas de check d'isolation.

### Solution (fix session 26/05)
- `CDD_NEXT_MATCH` porte toujours un `teamId`
- À chaque rebuild, vérifier `prevNext.teamId === activeTeam.id`
- Si mismatch → on prend le prochain match de l'équipe active, pas le précédent

---

## Piège 7 — Florian a 2-3 téléphones + PC en parallèle

### Réalité du terrain
Florian arbitre les matchs sur son téléphone, en regarde un autre sur tablette/PC, et son entourage suit depuis d'autres devices. **Le cross-device n'est pas un cas limite, c'est le cas nominal.**

### Conséquence pour tester
- Toujours penser "que voit l'autre device ?" en pushant du code
- Le code doit converger même si les devices ont des caches désynchronisés
- Les bugs sont quotidiens pour lui, pas exotiques

---

## Piège 8 — Le bouton "Fin de match" n'est pas toujours cliqué

### Réalité
- Florian oublie de cliquer "Fin de match"
- Le réseau tombe pile à ce moment-là
- Le téléphone se met en veille
- L'utilisateur ferme l'onglet

### Conséquence
Le match reste `paused` éternellement dans Firestore → fantôme sur tous les devices.

### Mitigation actuelle (v167)
Bouton "🏁 Forcer la fin" sur l'accueil sous le bandeau rouge MATCH EN COURS.

### Mitigation future à coder
**Auto-end** : si un match dure plus de 4-6h sans event, basculer auto en `status='finished'` au prochain pull.

---

## Piège 9 — Heure FFF `02h00` = artefact UTC midnight

### Cause
La FFF stocke souvent une date sans heure (placeholder calendrier prévisionnel) → `00:00 UTC` → affichage en CEST (UTC+2 en été) = `02:00`.

### Reconnaître ce piège
Un match FFF affiché à `02h00` ou `00h00` est presque toujours un **placeholder saison prochaine**, pas un vrai match programmé.

### Solution (v136)
Filtre `_isSuspiciousFFFMatch` qui exclut ces cas (voir `patterns.md` Pattern D).

---

## Piège 10 — `listCoachFinishedMatches()` ne lit que localStorage

### Symptôme (signalé par Florian le 26/05)
- PC : "Derniers matchs" contient `Bussy 2-1, Bussy 1-0`
- Téléphone : "Derniers matchs" contient `Bussy 4-3`
- Les matchs ne sont **pas les mêmes** entre devices

### Cause
`match-engine.js → listCoachFinishedMatches()` scanne `localStorage` (clés `cdd_match_*`). Chaque device n'a que les matchs qu'il a lui-même joués ou pullé.

### Solution prévue (refactor à venir)
Réécrire `listCoachFinishedMatches` pour lire la collection Firestore `cdd_v2_matches` filtrée par `clubId` ET `status='finished'`. Cache localStorage uniquement pour l'offline.

### En attendant
Bouton SOS Resync purge le local + re-pull, ce qui harmonise au moins partiellement (mais incomplet pour les anciens matchs).

---

## Piège 11 — `git push` sans avoir bumpé les cache busters

### Symptôme
On push du code, Vercel déploie, mais les navigateurs servent l'ancienne version en cache → les fixes ne sont pas visibles.

### Cause
On a modifié un `.jsx`/`.js` mais oublié d'incrémenter `?v=NN` dans `app.html`.

### Solution
Avant chaque `git commit`, faire :
```bash
git diff --name-only
# Pour chaque .jsx / .js modifié, vérifier dans app.html que le ?v= est bumpé
```

---

## Piège 12 — Service workers / cache PWA agressif

### Réalité
Cette app n'a **pas de service worker** (PWA installable est un sujet futur). Donc en théorie, un Ctrl+Shift+R doit suffire.

### Mais
Certains navigateurs mobiles (Samsung Internet, Brave mobile) cachent **app.html** lui-même malgré le `force-refresh`. Si `app.html` est cached avec les anciens `?v=NN`, le cache buster ne sert à rien.

### Solution radicale sur mobile
- Quitter l'app complètement (multitâche → balayer pour fermer)
- Optionnel : **vider les données du site** dans les paramètres du navigateur
- Relancer

---

## Piège 13 — `cdd_friendly_matches` array indexé teamId

### Structure
```js
localStorage['cdd_friendly_matches'] = {
  'team_abc': [
    { id: 'fr_xxx', date, opponent, venue, endedAt? },
    ...
  ],
  'team_def': [ ... ]
}
```

### Piège
- `CDD_FRIENDLY.list(teamId)` filtre par défaut les `endedAt` (= terminés)
- Mais sur un device qui n'a pas reçu le `markEnded` (offline pendant la fin du match), le `endedAt` est manquant → l'amical apparaît encore comme "à venir"

### Mitigation
`forceEndMatch` appelle aussi `CDD_FRIENDLY.markEnded(teamId, matchId)`. Bouton SOS purge tout et re-pull.

---

## Piège 14 — Fonctions admin gatées par email, pas par rôle

### Convention
L'admin app (= Florian) est gaté par **email** = `archi.tech.fr@gmail.com`, pas par un rôle Firestore.
- `CDD_ROLES.ADMIN_EMAIL` = `archi.tech.fr@gmail.com`
- `CDD_ROLES.isAdmin()` compare l'email connecté à cette constante

### Conséquence
- Si on change l'email admin, il faut le faire en code + redéployer
- Si Florian se connecte avec un autre email, il perd les droits admin
- Les fonctions admin ne sont **jamais** exposées dans l'UI standard

---

## Piège 15 — Florian pousse lui-même via Git Bash

### Workflow Florian
- Éditeur git = `notepad`
- Terminal = Git Bash sur Windows
- Push se fait depuis SA machine (pas depuis le sandbox Claude Code qui n'a pas les credentials)

### Conséquence
**Toujours donner la commande `git push` en bloc visible** dans la réponse à Florian. Pas en inline. Pas en optionnel. Il veut voir clairement quoi exécuter.

---

## Piège 16 — Pas de marques déposées dans les textes UI

### Convention
**Football amateur uniquement.** Pas de futsal, pas de rugby, pas de FIFA, pas de FUT, pas de Ultimate Team dans les textes visibles utilisateur.

### Pourquoi
Risques juridiques + positionnement produit. Florian a fait le ménage dans une session passée.

### Action
Si on rédige une feature avec un texte UI, **vérifier** qu'aucune marque déposée n'apparaît.
