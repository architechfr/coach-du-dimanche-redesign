# ⚽ Coach du Dimanche

> Application web mobile-first pour **coachs et arbitres amateurs de football**.
> Saisie de match en direct, gestion d'effectif, préparation de match (compo + convocations),
> suivi du championnat FFF officiel, partage de l'équipe aux parents, sync cloud multi-appareils.

**Production :** <https://coach-du-dimanche.vercel.app>
**Version courante :** v43.46 (mai 2026)

---

## 🎯 L'app en 30 secondes

Pour le coach : configurer son effectif, préparer le prochain match (convoqués, compo, adversaire), lancer le match en 2 taps, saisir buts/cartons/changements en direct, faire voter les joueurs après le match, partager la compo aux parents via WhatsApp.

Pour l'arbitre : un mode épuré sans gestion d'équipe — directement à la feuille de match avec les 2 équipes saisies au coup d'envoi.

Pour le parent / le joueur : recevoir un lien lecture seule pour voir la prochaine convocation, l'effectif, le calendrier et le classement FFF de l'équipe.

---

## 🚀 Fonctionnalités principales

### Match en direct
- ⏱️ Double chrono (temps officiel + temps réel) avec mi-temps, prolongations, temps additionnel
- 📊 Scoreboard plein écran lisible à distance
- ⚽ Buts, 🟨 cartons jaunes (2 = rouge auto), 🟥 cartons rouges plein écran, 🔁 changements (avec suivi du temps de jeu), 🩹 blessures
- 🔔 Alertes sonores avant la fin de période
- 🔄 Annulation du dernier événement
- 🔋 Wake lock (l'écran reste allumé pendant tout le match)

### Pré-match (configuration rapide)
- 🎽 2 équipes avec couleurs personnalisables (bicolore)
- 👥 Effectif : 11 titulaires + remplaçants (configurable)
- 🏟️ Formation tactique (4-4-2, 4-3-3, 4-2-3-1, 5-3-2, 3-5-2, 4-5-1, libre) avec drag & drop
- ⏰ Durée 5-45 min par mi-temps, 1/2/3 mi-temps
- 📋 Chargement instantané d'une équipe pré-enregistrée

### Préparation de match (page dédiée `/preparation_match/`)
Module séparé pour préparer sereinement le prochain match du calendrier FFF :
- 📅 Match suivant détecté automatiquement (calendrier FFF + matchs préparés locaux)
- 🛡️ Contexte strict club + équipe + matchId (résout les croisements entre 2 équipes d'un même coach)
- 👥 Effectif convoqué (toggle joueur par joueur, équipe-type en un tap)
- 🆚 Bloc adversaire : forme 5 derniers matchs, classement, match aller, stats attaque/défense
- 📊 Stats saison (matchs joués, buts, cartons, blessés)
- 🔁 Match précédent rappelé en bas de page
- ➡️ Bouton "Composition" et "Lancer le match" qui reprennent le contexte

### Convocations (`/coach_convocations/`)
Mini-app de gestion des convocations événement par événement :
- 📣 Envoi de convocations aux joueurs et parents
- 💬 Discussion (messages) liée à l'événement
- 👥 Gestion des groupes (équipe, parents, staff)
- 🔔 Notifications locales
- ✅ Suivi des réponses (présent / absent / incertain / sans réponse / conflit)

### Fin de match
- 📊 Feuille de match complète : stats par joueur (buts, passes, cartons, temps de jeu)
- ⭐ Vue terrain pour la notation (taper sur un pion → fiche joueur)
- 🔗 Page de vote partagée (parents et joueurs notent eux-mêmes, 48 h, 1 vote = 1 compte Google)
- 📈 Synthèse collective en temps réel (Firestore `onSnapshot`)
- 🏆 Exploits auto-détectés (hat-trick, clean-sheet…)
- 🏅 Top homme du match avec gestion des égalités (v43.26)

### Mon club / Mes équipes — cloisonnement strict (v43.5+)
- 🏆 Plusieurs clubs supportés en parallèle (ex : USDF + FCMH + Ferrières)
- 🔒 **Cloisonnement par club actif** : seule l'équipe du club ouvert est visible dans MES ÉQUIPES et proposée à NOUVEAU MATCH
- 🔁 Switch de club depuis MON CLUB (bouton "Définir comme club actif")
- 🏠 Badge du club actif dans l'en-tête et le hero d'accueil

### Mode arbitre (v43.5+)
- 🟨 Quand le rôle est "arbitre" dans Réglages → l'accueil est épuré
- Boutons MON CLUB / MON ÉQUIPE / MON CHAMPIONNAT / STATS SAISON masqués
- Hero "ARBITRE EN MISSION" — seul reste 🏟️ NOUVEAU MATCH
- Saisie manuelle des 2 équipes au coup d'envoi (pas d'effectif sauvegardé)

### Championnat FFF officiel (v37+)
- 📅 Calendrier live depuis l'API DOFA FFF (`api-dofa.fff.fr`)
- 🏆 Classement live (avec cascade de proxies CORS : corsproxy.io / allorigins / codetabs)
- ⚙️ Config par équipe : clubId, competId, phase, group (extraits de l'URL FFF du district)
- 🔍 Bouton "Tester maintenant" qui valide la config en live avant sauvegarde
- 🚨 Détection mismatch (URL U15 sur équipe Vétérans → alerte incohérence)
- 🚫 Badge FORFAIT en orange si match donné perdant
- ✏️ Calendrier/classement manuels possibles si l'API est indispo

### Partage public lecture seule (v40+)
- 📤 Bouton "Partager une équipe" → URL courte `/lecteur/?t=abc123`
- 🌐 Page lecteur **autonome** (~30 Ko, `/lecteur/index.html`) — pas besoin de l'app coach
- 👀 6 onglets pour les parents/joueurs : Prochain match / Effectif / Calendrier / Classement / Matchs joués / Stats
- 🔒 Aucune donnée privée transmise (pas de phone, email, birthdate, notes)
- 📱 QR code généré automatiquement

### Partage entre coachs du même club (v43.23+)
- 🌐 Bouton "Publier ce match au club" → écriture dans `club_matches/{clubId}/matches/{matchId}`
- 📥 Bouton "Pull club matches" : récupère tous les matchs publiés par les autres coachs du même club
- 🆕 Badge "🌐 NOUVEAU" 24 h sur les matchs nouvellement importés du cloud (v43.24)

### Sync cloud multi-appareils (v43.2+)
- ☁️ Connexion Google → toutes les données (équipes, matchs, configs FFF, clubs, club actif, rôle) suivent sur tous tes appareils
- 🔁 Push auto débouncé (3 s) à chaque modif locale
- 📥 Pull au login : le cloud est source de vérité (écrase le local sur un nouvel appareil)
- 💾 Stocké dans `users/{uid}` (1 doc par utilisateur)
- 🎛️ Section "SYNC CLOUD" dans Réglages : état, dernière sync, boutons login/logout/now/pull
- 🔁 Pull cloud automatique au retour sur l'app (visibilitychange — v43.21)

### Transfert de paramétrage à un autre coach (v43.3+)
- 📦 "Préparer un transfert" → choisir les équipes à donner (cases à cocher groupées par club)
- 🔑 Génère un code court (8 chars sans 0/O/1/I) + URL `/?import=CODE` + QR code
- 📤 Partage natif (v43.7) : WhatsApp / Email / SMS / Web Share API (toutes apps installées)
- ⏰ Expiration auto 7 jours
- 🎓 Écran d'accueil pédagogique pour le destinataire qui ne connaît pas l'app
- 🔄 Le destinataire se connecte avec **son** compte Google → ses données à lui, indépendantes ensuite

### CGU & juridique (v43.27)
- 📜 CGU intégrées dans Réglages : propriété intellectuelle ArchiTechFR, clause de passage payant prévue

---

## 🏗️ Architecture

```
COACH (téléphone, app coach)              CLOUD (Firestore)             PARENT / JOUEUR
                                                                        (n'importe où)

[index.html]                              users/{uid}                   [/lecteur/index.html]
  ~ 650 Ko, monolithique                    snapshot localStorage         autonome ~30 Ko
  IIFE pures, pas de framework               (équipes, matchs,           Au load : lit ?t=abc123
  vanilla JS / HTML / CSS                    configs FFF, clubs...)      → fetch Firestore
                                                                        → render lecture seule
  Auth Google ─┬─────────────────────► transfers/{code}
               │                         payload pour transfert         [/lecteur/?t=abc123]
               │                         à un autre coach (TTL 7j)
               │
               ├─────────────────────► shared_teams/{id}
               │                         partage public d'1 équipe
               │                         (lien pour les parents)
               │
               ├─────────────────────► matches/{matchId} + votes/{voteId}
               │                         pour le système de votes
               │                         joueurs après match (48 h)
               │
               └─────────────────────► club_matches/{clubId}/matches/{matchId}
                                         partage entre coachs du même club
                                         (v43.23+)

[preparation_match/index.html]            [coach_convocations/*.html]
  module dédié                            sous-app convocations
  préparation du prochain match           (event / convocation / groupes /
  contexte strict clubId+teamId+matchId    messages / notifications)
```

### Pages principales
- **`/`** — app coach (mobile-first)
- **`/preparation_match/`** — page dédiée préparation du prochain match
- **`/preparation_match/composition.html`** — éditeur de composition (depuis la prépa)
- **`/coach_convocations/event.html`** — événement en cours / prochains événements
- **`/coach_convocations/convocation.html`** — gestion d'une convocation
- **`/coach_convocations/messages.html`** — discussion liée à l'événement
- **`/lecteur/?t=<id>`** — page lecteur lecture seule (parents/joueurs)

### Stack
- **Front** : HTML5 + CSS3 + JavaScript ES5 (IIFE, `var`, pas de framework, pas de build)
- **Auth** : Firebase Authentication (Google sign-in, popup ou redirect selon environnement WebView)
- **Base de données** : Firestore (projet `arbitre-sport`)
- **Stockage local** : localStorage
  - `arb_teams`, `arb_m` (matchs), `arb_clubs`, `arb_current_club`
  - `arb_fff_manual_cals`, `arb_fff_manual_ranks`, `arb_fff_active_team`
  - `cdd_coach_team`, `cdd_active_club`, `cdd_active_context`
  - `cdd_prep_selected_matches` (contexte préparation, keyé par clubId::teamId::matchId)
  - `cdd_prep_action`, `cdd_calendar_selected_match`
- **Hébergement** : Vercel (déploiement auto sur push `main`)
- **PWA** : manifest + service worker (installable iOS/Android)

### Firestore Rules (extrait)
```
match /matches/{matchId}                          { ... votes ... }
match /matches/{matchId}/votes/{voteId}           { write: if uid == voteId }
match /votes/{voteId}                             { ... }
match /shared_teams/{id}                          { allow read, write: if true; }
match /users/{uid}                                { allow read, write: if request.auth.uid == uid; }
match /transfers/{code}                           { allow read: if true; create: if owner; }
match /club_matches/{document=**}                 { allow read, write: if auth != null; }
match /convocations/{document=**}                 { allow read, write: if true; }   // v43.39 : parent répond sans auth
```

---

## 📂 Structure du projet

```
.
├── index.html                       ← App coach (~650 Ko, monolithique, v43.27)
├── preparation_match/
│   ├── index.html                   ← Page préparation match
│   ├── prep.js                      ← Logique préparation (contexte strict)
│   ├── prep.css
│   ├── composition.html             ← Éditeur compo
│   └── composition.js
├── coach_convocations/
│   ├── event.html                   ← Événement / prochain match
│   ├── convocation.html             ← Gestion convocation
│   ├── messages.html                ← Discussion
│   ├── groupes.html                 ← Groupes
│   ├── notifications.html           ← Notifications
│   ├── commun.js / commun.css       ← Helpers partagés
│   └── README.md
├── lecteur/
│   └── index.html                   ← App lecteur autonome (~30 Ko)
├── assets/                          ← Images, photos joueurs, banners
├── docs/                            ← Snapshot publié (build Vercel statique)
│   └── _archive/                    ← Plans/analyses historiques
├── manifest.json                    ← PWA manifest
├── README.md                        ← Ce fichier
└── .gitignore
```

> ⚠️ Le dossier `assets/` est utilisé dynamiquement par l'app (référencé en runtime, pas en grep littéral toujours). Ne jamais le considérer comme inutile sur un grep simple.

---

## 🛠️ Lancer en local

Aucun build, aucune dépendance npm. Double-clic sur `index.html` ou serveur HTTP simple :

```bash
# Python
python -m http.server 8000

# Node
npx serve .
```

Puis <http://localhost:8000>.

> ⚠️ La sync cloud, le partage et les votes nécessitent que Firebase soit configuré dans le projet `arbitre-sport` avec les rules ad hoc (voir section Firestore Rules ci-dessus).

---

## 🚢 Déploiement

Push sur `main` → Vercel déploie automatiquement sur <https://coach-du-dimanche.vercel.app> en ~1 minute.

> ⚠️ **Piège connu (OneDrive)** : le repo vit sous OneDrive, qui ressuscite parfois `.git/index.lock`. Si un commit refuse de partir, supprime manuellement `.git/index.lock` puis recommence.

---

## 👥 Contexte multi-coachs / multi-clubs

L'app supporte plusieurs configurations en parallèle :
- **Multi-clubs par coach** : un même coach peut gérer des équipes de clubs différents (ex : U15 FCMH + Vétérans USDF). Le **club actif** est l'unité de cloisonnement.
- **Multi-coachs** : chaque coach a son propre compte Google, donc son propre `users/{uid}`. Les coachs d'un même club peuvent se partager les matchs via `club_matches/{clubId}/matches`.
- **Mélange de catégories** : 2 équipes du même coach mais de catégories différentes (U15 vs Vétérans par ex.) → la **page de préparation** utilise un contexte strict `clubId+teamId+matchId` pour éviter les croisements.

### Règles de surclassement
- Un joueur peut monter de **+2 catégories maximum** (ex : U13 → U15 OK, U13 → U17 KO)
- Pas de descente de catégorie autorisée
- Filles avec garçons : autorisé sans restriction supplémentaire

---

## 🔐 Fonctionnalités admin (réservées)

Certaines fonctionnalités sont gatées derrière `archi.tech.fr@gmail.com` et **ne doivent jamais être exposées aux coachs** :
- Diagnostic Firestore brut
- Outils de migration de données
- Bypass du cloisonnement par club
- **`/_admin/doublons.html`** — détection/nettoyage des joueurs présents dans plusieurs équipes/clubs (avec backups automatiques de `arb_teams`)

---

## 📜 Versions clés

| Version | Apport principal |
|---------|------------------|
| **v43.46** | **Fix sync Espace Coach > Effectif** — la cause racine du bug "la compo affichée n'est pas celle du module" : `renderTypeField` utilisait le `team` reçu en paramètre (référence en mémoire issue de `activeTeam()`), qui n'était PAS rafraîchi quand on revenait du module compo. Maintenant on **relit `arb_teams` depuis localStorage** à chaque appel de `renderTypeField` et on prend la dernière version du `team.lineupTemplate`. Plus aucune désynchro possible. |
| **v43.45** | **Module Compo : fin du cache obsolète + bouton VALIDER explicite** — (1) `useState` au boot lit le cache localStorage UNIQUEMENT s'il est strictement plus récent que `team.lineupTemplate.updatedAt` (ou `match.lineup.updatedAt`). Sinon on part de `initialState()` qui pioche dans la source de vérité. Plus de "j'ouvre le module et il affiche une vieille compo" ; (2) **bouton vert "✓ Valider"** ajouté dans la TopBar du module (à côté du sélecteur de formation). Quand on clique : appelle `saveStateToCDD(state)` + alert "✅ COMPO VALIDÉE — ta compo a été enregistrée dans le match préparé (ou ton équipe type)". Garantit que le user a un moyen visible de confirmer la sauvegarde, en complément de l'auto-save. |
| **v43.44** | **Espace Coach > Effectif : aperçu Équipe type type "COMPO VALIDÉE"** — refonte visuelle de `renderTypeField` en vanilla JS pour reproduire fidèlement la BroadcastView du module React. Terrain SVG vert avec gradient + lignes du terrain + pastilles colorées par poste (GB jaune, défense bleue, milieu vert lime, attaque orange) avec numéro en gros + nom prénom dans bandeau blanc en dessous. Remplaçants en ligne avec mêmes pastilles plus petites. Positions exactes par formation (mapping FORM_POS identique au module). Cohérence visuelle parfaite entre l'aperçu Effectif et l'éditeur interactif. |
| **v43.43** | **CRITIQUE — `data.js` reconstruit après corruption OneDrive** : le fichier s'était tronqué à 164 lignes au milieu d'une string, ce qui faisait perdre `saveStateToCDD` (auto-save inopérant) + `loadAndResizePhoto` + tous les exports. Cause cachée des bugs "ma compo ne se sauvegarde pas". Reconstruction complète avec tous les fixes cumulés. (2) **Harmonisation couleurs** : `THEME.bg = #07080a` + `THEME.accent = #a6ff2f` pour matcher exactement le thème de l'app principale. (3) **Menu burger** : affiche le **nom de l'équipe active** + statut ("★ Équipe type" ou "Composition match") au lieu de "Coach / Saison 2025-26". (4) **Listener `pageshow`** dans index.html : force le re-render de l'écran Espace Coach quand on revient via back navigateur depuis le module compo (sinon bfcache laissait l'aperçu figé). |
| **v43.42** | **Module Compo : entrée d'un remplaçant améliorée** — (1) dock button **"Effectif" renommé en "Banc"** + icône plus parlante ; (2) le bouton **"Entrer"** sur un remplaçant n'auto-swap plus avec un titulaire arbitraire : il ouvre un **modal "Qui sort pour [nom du remplaçant] ?"** listant les titulaires, le coach choisit explicitement qui sort, le swap est appliqué ; bouton "Annuler" disponible. Plus jamais de remplacement qu'on n'a pas choisi. |
| **v43.41** | **Module Compo : couleur par slot + prénom + save garanti** — (1) la **couleur des pastilles** dépend désormais du `slotRole` (poste sur le terrain) et plus du `player.role` (rôle préféré) : tous les joueurs placés en défense sont bleus, en milieu verts, en attaque orange — résout l'incohérence visuelle pour les polyvalents ; (2) les pastilles affichent le **prénom** au lieu du nom de famille (plus parlant en 7 chars) ; (3) **auto-save garanti** via 3 listeners (`beforeunload`, `pagehide`, `visibilitychange:hidden`) qui flushent l'état avant que la page disparaisse, debounce réduit de 1200ms à 500ms. Plus de "j'ai modifié mais ça revient à l'ancien". |
| **v43.40** | **Fix 9 bugs ESPACE COACH + module Compo** : (1) **auto-save debounced 1.2s** dans `arb_m[matchId].lineup` ou `team.lineupTemplate` via `window.saveStateToCDD` — fin du bug "la compo ne se sauvegarde pas" ; (2) **clé localStorage scopée par contexte** (`compo-state-v1__tpl_TEAMID` vs `__match_MATCHID`) — fin du bug "la compo d'un autre contexte écrase celle-ci" ; (3) **rendu mini-terrain refait** dans Espace Coach > Effectif : respecte la vraie `team.lineupTemplate.formation` (avant : hardcodé 1-4-3-3), **gardien en bas** (on attaque vers le haut), **remplaçants affichés** sous le terrain ; (4) sélecteur d'équipe caché si 1 seule (juste le nom en lecture seule), sous-titre verbeux retiré ; (5) badges "★ FAVORITE" sur la card Equipe type + "★ ÉQUIPE TYPE — modification" dans le header du module React. |
| **v43.39** | **Convocations parent + Firebase** : nouvelle page autonome `coach_convocations/parent.html?event=ID` que le coach partage via WhatsApp (Web Share API ou clipboard). Le parent identifie son enfant dans la liste, tap, choisit Présent / Absent / Incertain, écrit en Firestore `convocations/{eventId}/responses/{playerId}`. Côté coach : `convocation.html` push idempotent vers `convocations/{eventId}` (info match + liste joueurs) + `onSnapshot` sur les réponses → notifs auto + mise à jour live. Bouton "📤 Partager lien parents" en haut. **⚠️ Firestore Rules à mettre à jour** dans la console Firebase : `match /convocations/{document=**} { allow read, write: if true; }` (write public, comme `shared_teams`). |
| **v43.38** | **Module Compo v2** : intégration de la nouvelle version du module React fournie par l'utilisateur. 3 vues (editor / share / archives) + BroadcastView (présentation TV style match validé) + ShareView (export poster image). Photos joueurs : upload + redimensionnement 192x192 carré centré (`loadAndResizePhoto`), photos initiales chargées depuis `team.players[].photoDataUrl`. Mes modifs `save()` préservées sur le nouveau sheets.jsx (mode `template` → `team.lineupTemplate`, mode `match` → `arb_m[matchId].lineup`). |
| **v43.37** | **Bouton Convocations dans menu coach** — ajout du raccourci "📣 Convocations" dans le menu d'accueil coach (juste après "🧠 Préparer match"). Ouvre directement `coach_convocations/event.html`. Étape 1/3 de la refonte convocations parent. À venir : v43.38 page parent autonome avec réponse 1-tap, v43.39 sync Firestore temps réel. |
| **v43.36** | **Module Compo : mode équipe type** — `preparation_match/compo/?mode=template&teamId=X` lit/écrit `team.lineupTemplate` (au lieu de `match.lineup`). Boutons "🧠 Modifier équipe type" ajoutés dans (1) Espace Coach > onglet Formation et (2) card "Equipe type" de la fiche équipe. Look unifié pour toutes les compos de l'app (équipe type ET match préparé). |
| **v43.35** | **Module Compo : sauvegarde dans le match** — le bouton "Enregistrer" du module React Compo pousse désormais la compo (formation + startersIds + benchIds + matchNumbers + captain) dans `arb_m[matchId].lineup` via `window.__CDD_CTX.matchId`. L'app principale reprend cette compo au lancement du match. Sauvegarde locale (`compo-saved-v1`) conservée en parallèle. |
| **v43.34** | **Revert dashboard D** : l'ancienne page `preparation_match/index.html` (MATCH SUIVANT / CALENDRIER / ADVERSAIRE / EFFECTIF CONVOQUÉ / CONVOCATIONS / MATCH PRÉCÉDENT / STATS SAISON) est restaurée. Bouton "Ajouter un match amical" → "**Créer un match**" qui ouvre `goCfg()` (Nouveau match) de l'app principale. Le bouton 📋 Composition pointe désormais sur le module React `./compo/`. Anciens fichiers (dashboard.css/js, convocations.html) laissés en place mais non référencés. |
| **v43.33** | **Module Compo React** (`preparation_match/compo/`) intégré : terrain SVG plein écran, drag & drop joueurs, 8 formations, sheets bottom (joueur/formation/banc/plus), draw mode (flèches tactiques), export PNG. `data.js` lit `arb_teams` + `arb_m` pour brancher tes vrais joueurs (mapping rôle par poste configuré ou heuristique numéro). Bouton COMPO du dashboard pointe désormais dessus. Stack : React 18 + Babel via CDN (premier morceau React du projet). |
| **v43.32** | **REFONTE D** : nouveau dashboard `preparation_match/index.html` inspiré de l'Espace Coach avec carte PROCHAIN MATCH (heure + lieu + J) + 4 KPIs + CLASSEMENT + EFFECTIF + DERNIER RÉSULTAT. Une seule source de vérité, plus d'écrasement entre les écrans. Ancien écran préservé sous `convocations.html`. |
| **v43.31** | **ROLLBACK final v43.28** : suppression de la persistance dans `arb_fff_manual_cals` (côté `cddOpenPrep`). Le cleanup auto au boot v43.30 est retiré car il déclenchait une boucle de sync cloud. Nettoyage local manuel : `localStorage.removeItem('arb_fff_manual_cals'); location.reload();` puis Réglages → Pousser maintenant. |
| **v43.29** | Fix C (écrasement inter-clubs au switch) + Fix B (bouton retour compo + gardien dans surface de réparation + équipe moins tassée) + Outil admin `_admin/doublons.html` (détection et nettoyage des joueurs en doublon inter-équipes) |
| **v43.28** | Fix préparation USDF : matchs FFF cliqués persistés dans `arb_fff_manual_cals[teamId]` + `selectedMatchFromContext` tolérant à matchId d'URL (`prep.js` v2.2) |
| **v43.27** | CGU dans Réglages : propriété intellectuelle ArchiTechFR + clause passage payant |
| **v43.26** | Top homme du match — gestion claire des égalités + ranking complet |
| **v43.24** | Fix tri matchs (ISO datetime) + badge "🌐 NOUVEAU" sur matchs club |
| **v43.23** | Partage de matchs entre coachs du même club (collection `club_matches`) |
| **v43.22** | Réglages réorganisés (6 sections logiques) + bloc compte Google (photo) |
| **v43.21** | Pull cloud automatique au retour sur l'app (visibilitychange) |
| **v43.20** | Cache calendrier FFF instantané (TTL 5 min) + label FORFAIT chip orange |
| **v43.19** | Affichage FORFAIT sous l'équipe forfaitaire + distinction FORFAIT GÉNÉRAL |
| **v43.18** | Détection forfait FFF stricte (uniquement `is_forfeit='O'`) |
| **v43.17** | Mode arbitre cloisonné par CSS (`body.mode-arbitre`) |
| **v43.16** | Cloisonnement club appliqué aux matchs préparés |
| **v43.15** | Mode arbitre vraiment épuré (sans concepts coach) |
| **v43.14** | Vrai logo PNG (sifflet noir & or) + manifest PWA |
| **v43.13** | Bouton "Installer l'app" + manifest + logo SVG |
| **v43.12** | Transfert : matchs inclus par nom (fallback teamId manquant) |
| **v43.10-11** | Bouton "Recharger l'app" (cache-bust) + diagnostic affichage |
| **v43.7-9** | Transfert : partage natif (WhatsApp / Email / SMS) + cloisonnement étendu |
| **v43.5-6** | Cloisonnement strict par club + mode arbitre |
| **v43.2-4** | Sync cloud multi-appareils + transfert de paramétrage sélectif |
| **v43.0-1** | Refonte page lecteur, banners visuels |
| **v42.x** | Convocation (matchs préparés visibles dans le lecteur) |
| **v41.x** | Page lecteur autonome `/lecteur/` séparée de l'app coach |
| **v40.x** | Partage public d'équipe (Firestore + URL courte stable) |
| **v39.x** | API FFF DOFA, parseurs, détection forfait/incohérence/clash |
| **v37-38** | Config FFF par équipe, multi-clubs |
| **v29** | Vue terrain pour notation, synthèse collective des votes en live |
| **v28** | Onboarding coach/arbitre, foot-only, gestion stockage |
| **v25-27** | Versions historiques (renommage Arbitre Sport → Coach du Dimanche) |

L'historique complet est dans `git log`.

---

## 🗺️ Roadmap

### En cours
- [x] Sync cloud multi-appareils
- [x] Transfert de paramétrage à un autre coach
- [x] Cloisonnement strict par club
- [x] Mode arbitre épuré
- [x] Page dédiée préparation de match + convocations
- [x] CGU intégrées
- [ ] Auto-création des matchs préparés à J-7
- [ ] Fix des derniers résidus de filtrage par nom d'équipe dans `prep.js` (prevMatch, renderSeasonStats, head-to-head) — risque de mélange entre 2 équipes d'un même coach avec noms proches

### À venir
- [ ] Authentification lecteur pour répondre à la convocation (Google ou magic link mail)
- [ ] Système de réponse joueur (Je viens / Pas dispo / Peut-être)
- [ ] Stats perso pour le joueur connecté
- [ ] Photo de profil joueur (Firebase Storage)
- [ ] Co-voiturage
- [ ] "Wrapped" fin de saison

---

## 📑 Documentation interne

- **CONTEXT.md** — Document de passation entre conversations LLM (état exact à un instant T) — si présent
- **docs/_archive/** — Plans et analyses historiques (refonte visuelle, prompts Grok)
- **git log** — Historique complet versionné

---

## 👤 Auteur

ArchiTechFR — [github.com/architechfr](https://github.com/architechfr)
Repo : <https://github.com/architechfr/coach-du-dimanche>
