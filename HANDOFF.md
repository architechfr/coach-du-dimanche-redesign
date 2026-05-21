# HANDOFF — Coach du Dimanche V2

> Document de reprise. Dernière mise à jour : **2026-05-21** (Phase D).
> Pour reprendre dans un nouveau chat : dire « lis HANDOFF.md ».

---

## 1. Comment reprendre

**Phase D livrée (code, non publié)** : modèle d'autorisation **par équipe**
+ multi-rôles. Voir §6 pour la séquence de publication, et `PHASE-D-PLAN.md`
pour la conception complète.

> ⚠️ **À FAIRE EN UN SEUL PASSAGE** (cf. §6 ci-dessous) : pousser le code
> de Phase D **ET** redéployer `firestore.rules` **ET** lancer la migration
> des memberships depuis le panneau admin. Les trois sont solidaires —
> publier les règles avant que l'app n'écrive le format `teams` casserait
> la prod ; publier le code sans les règles laisserait l'écriture refusée.

Sujet suivant au choix :
- **« publication D »** → suivre §6 et tester FCMH / snipflo en bout-en-bout.
- **« C5 fin »** → derniers points hérités de C5 : `pullCloudData`
  automatique au login, images (logos/photos) vers Firebase Storage,
  nettoyage du fallback `cdd_user_role` dans `effectiveRole()` une fois
  la publication D validée.
- **« notation v2 »** → suite de la notation : stats gardien sous clés
  dédiées, persistance Firestore des stats, recalage de la progression auto.

---

## 2. État du projet

- App : PWA web, **football amateur uniquement** (pas de futsal/rugby).
- Code : `Version/V2/` — dépôt Git `github.com/architechfr/coach-du-dimanche-redesign`.
- Déploiement : Vercel, URL **`coach-du-dimanche-redesign.vercel.app`** (auto-deploy sur push `main`).
- Backend : Firebase projet **`arbitre-sport`** (plan gratuit Spark). Firestore + Auth.
- Admin / super-utilisateur : **`archi.tech.fr@gmail.com`**.
- Tout le code est poussé et déployé. Dernier commit : `d8bc832`.

---

## 3. Fait dans la session du 21 mai 2026

- Finitions : banc strict 3→5, modale fiche joueur en overlay (page Convocations), typo prénom > nom.
- Bug déconnexion corrigé ; multi-sport retiré ; marques FIFA/FUT retirées des textes visibles.
- Liens QR / partage réparés (domaine courant `window.location.origin`, plus de domaine codé en dur).
- **Authentification réelle** : connexion par lien email magique + **Google sign-in** (Firebase Auth).
- Faille « entrer sans s'authentifier » fermée ; migration auto abusive coupée.
- **Chantier sécurité — Phase C** : voir §4.
- Nettoyage : bundles `push-*` supprimés à la racine.
- **Notation des joueurs pondérée par poste** : livrée — voir §5.
- **C4 — Invitations** : livré — voir §4.
- **C5 — Matrice d'invitation, rôle non modifiable, droits par rôle dans l'UI, écran membres du club** : livré — voir §4.

---

## 4. Chantier sécurité — état

Objectif : un compte non autorisé ne doit voir AUCUNE donnée d'un club. Plan complet dans `PHASE-C-PLAN.md`.

- **C1 ✓** — règles Firestore déployées (`firestore.rules`). Modèle `clubs/teams/players/memberships/invites`. Accès imposé serveur : on ne lit un club que si on a une `membership` dessus. ID membership = `{uid}_{clubId}`.
- **C2 ✓** — données montées dans Firestore. `window.cddData` (dans `firebase-sync.js`) : save/fetch + `migrateLocalToCloud`. Bouton **Réglages → Sauvegarde cloud**.
- **C3 ✓** — migration rendue non-lossy (sauvegarde objet complet) ; `pullCloudData()` (lecture cloud → cache local) ; bouton **Réglages → Charger depuis le cloud** ; `seed-inline.js` vidé (données de mineurs hors du code public — RGPD). Testé : aller-retour cloud sans perte.

- **C4 ✓** (2026-05-21) — invitations par lien. `firebase-sync.js` :
  `createInvite` / `fetchClubInvites` / `revokeInvite` / `consumeInvite`
  exposés sur `window.cddData`. UI coach `invite-manager.jsx` dans les
  Réglages (section « Inviter quelqu'un »). Le coach choisit un rôle
  (adjoint / parent / joueur / lecteur), un joueur pour parent (obligatoire),
  génère un lien `?invite=TOKEN`. À l'ouverture le token est mis de côté
  (`cdd_pending_invite`, survit au round-trip de connexion email) puis
  consommé dès la connexion : la `membership` de l'invité est créée,
  `pullCloudData()` charge le club, une bannière confirme. Plafond 5
  adjoints vérifié à la génération (l'invité n'a pas le droit de lire les
  memberships). `firestore.rules` : nouvelle branche « auto-création depuis
  invitation » de `memberships` → **à redéployer dans la console Firebase**.

- **C5 (début) ✓** (2026-05-21) — **matrice d'invitation** + **rôle non
  modifiable**. Qui peut inviter qui est désormais cadré par une matrice,
  source de vérité unique `roles.js → INVITE_MATRIX`, dupliquée volontairement
  dans `firestore.rules → canInviteRole` (UI = ergonomie, règles = sécurité) :
  coach principal/owner/admin → adjoint, parent, joueur, lecteur ;
  adjoint/joueur/parent → parent, joueur, lecteur ; lecteur → personne.
  `roles.js` expose `effectiveRole()` (rôle effectif : email admin → 'admin',
  sinon `cdd_user_role`) et `invitableRoles(role)`. `invite-manager.jsx`
  filtre les choix de rôle selon la matrice et affiche un rappel. La section
  « Inviter quelqu'un » des Réglages est visible dès que le rôle a au moins
  un rôle invitable (plus seulement `isCoach`). « Mon rôle » devient une
  **carte en lecture seule** en haut des Réglages (icône + libellé + « défini
  automatiquement ») : le `prompt()` éditable est supprimé — le rôle est une
  conséquence du lien reçu, plus une saisie libre. `isAdmin` des Réglages est
  recablé sur l'email (`CDD_ROLES.isAdmin()`), plus sur un rôle localStorage.
  `firestore.rules` modifiées (helpers `myRoleOnClub`/`canInviteRole`, règle
  `invites/create`, `invites/delete` étendue à l'auteur) → **à redéployer**.
  Cache buster `firebase-sync.js` : v52 → v53.

- **C5 (rôles & dashboard) ✓** (2026-05-21) — **droits par rôle dans l'UI** +
  **écran membres du club**. `roles.js` : nouvelle table `ROLE_CAPS` + helpers
  `canDo(cap)` / `isReadOnly()`. Trois capacités d'édition : `compo` (compo,
  convocations, match live), `effectif` (statuts, notation, joueurs/équipes),
  `club` (logo, infos club, liste des membres). Coach principal/owner/admin :
  les trois. Coach adjoint : `compo` + `effectif` (PAS `club` — décision
  produit). Parent/joueur/lecteur : aucune (lecture seule). `firestore.rules`
  miroir : nouveau `canEditData` (owner/coach/admin/adjoint) gouverne `teams`
  et `players` ; `canEditClub` (sans adjoint) reste sur `clubs`. Boutons
  d'édition masqués selon `canDo()` dans `screen-match-fiche.jsx` (statut,
  nom, notation, observations, ProfilTab), `screen-effectif-lineup.jsx`
  (toute la compo + bandeau lecture seule), `screen-results-conv.jsx`
  (add/remove convoc, statut rapide), `screen-match-live-v2.jsx` (barre
  d'action, chrono, lancer le match). Écran **Membres du club** : nouvelle
  `fetchClubMemberships` dans `cddData`, panneau `ClubMembersPanel` dans les
  Réglages (roster + rôle + joueur lié), réservé au coach principal. Cache
  buster `firebase-sync.js` : v53 → **v54**. `firestore.rules` modifiées
  (`canEditData`) → **à redéployer**.
  *NB : `ScreenVote` (notation post-match) et le RSVP de `ScreenLecteur` restent
  ouverts aux parents/joueurs — ce sont des fonctions de participation, pas
  d'édition coach.*

**Reste à faire (suite de C5) :**
- Nettoyer le fallback `currentRole()→'coach'` de `roles.js`.
- Rendre `pullCloudData` automatique au login.
- Images (logo club + photos joueurs) → Firebase Storage.
- Ménage non urgent : collections Firestore legacy (`matches`, `club_matches`, `transfers`, `users`, `cdd_v2_*`).

---

## 5. FEATURE LIVRÉE — Notation des joueurs pondérée par poste

> Livrée le 2026-05-21. La note moyenne (OVR) n'est plus une moyenne plate
> des 6 stats : elle est pondérée selon le poste. Une faible stat hors-poste
> (la DEF d'un attaquant, la finition d'un défenseur) ne pénalise plus.

**Ce qui a été construit :**

- **`position-rating.js`** (nouveau module, `window.CDD_RATING`) — source de
  vérité unique. 7 profils de notation, chacun avec sa table de pondération
  sur les 6 stats (somme = 100) :
  Gardien · Défenseur central · Latéral · Milieu récupérateur ·
  Milieu offensif · Ailier · Attaquant de pointe.
  Les 12 codes de poste de l'UI (`CDD_COACH.POSITION_CHOICES`) sont rabattus
  sur ces 7 profils via `POSITION_TO_PROFILE`.
- **Gardien** : 6 stats dédiées (DÉTENTE, PLONGEON, JEU AU PIED, PLACEMENT,
  DUEL 1v1, RÉFLEXES). Ce sont les mêmes 6 emplacements numériques
  (PAC..PHY) relibellés selon le poste — radar, carte FUT et fiche affichent
  les bons libellés. *Limite assumée* : les stats gardien ne sont pas encore
  stockées sous des clés distinctes (voir « notation v2 » en §1).
- **OVR pondéré** : `data-bridge.js` → `deriveStats()` calcule `stats.ovr`
  via `CDD_RATING.weightedOverall(stats, poste)` (fallback moyenne plate si
  le module n'est pas chargé).
- **Deux modes d'édition** dans l'onglet *Stats* de la fiche joueur
  (`screen-match-fiche.jsx`) :
  - *Rapide* : poste + note globale → `CDD_RATING.quickProfile()` génère un
    profil de 6 stats typé dont la moyenne pondérée vaut la note visée.
    Aperçu en direct, puis « Générer ». Écrit aussi le poste.
  - *Détaillé* : 6 curseurs, le poids de chaque stat au poste affiché,
    l'OVR pondéré se recalcule en direct.
- `coach-overrides.js` : nouvelle API `setStatsBulk()` (écrit les 6 stats
  d'un coup pour le mode Rapide). Persistance : `cdd_player_stats_override`
  en localStorage, comme les autres overrides coach.
- **Shahine** (`pl_moydtri8_vjlwq`) : noté comme milieu offensif, son profil
  passeur/dribbleur est désormais correctement valorisé → **OVR 83**
  (la moyenne plate le bloquait à ~80-81). Les `STAR_BONUSES` planchent
  désormais au niveau titulaire (`base = max(base, 78)`).

**Pistes de suite (« notation v2 ») :** stats gardien sous clés dédiées,
persistance Firestore des stats dans les docs `players`, recalage de
`applyMatchPerformanceDeltas` (progression auto par match) sur l'OVR pondéré.

---

## 6. Publication de la Phase D — séquence à respecter

Phase D refond le modèle d'autorisation : `memberships/{uid}_{clubId}` portent
désormais une map `teams: { [teamId]: { role, playerId? } }` + un champ
`clubRole` dénormalisé. Code et règles sont **solidaires**. À publier dans
l'ordre :

**1. Push du code (un seul commit, branche `main`)** :
- `roles.js` — rôle effectif par équipe active, helpers `teamRole`,
  `clubRoleOf`, `myRoleOnTeam`, `activeTeamRole`, `listMyTeamRoles`.
- `firebase-sync.js` (v55→v56 dans `app.html`) — `saveMembership` au
  format `teams`, `removeTeamMembership`, `teamRoleCount`, `consumeInvite`
  préserve `clubRole`, `pullCloudData` propage `teams`/`clubRole`,
  helpers admin `fetchAllClubs` / `findUidByEmail` / `assignTeamCoach` /
  `migrateMembershipsToTeamsModel`.
- `invite-manager.jsx` — matrice basée sur le rôle sur l'équipe ciblée.
- `admin-clubs-panel.jsx` — **nouveau** panneau admin clubs/équipes
  (créer un club, des équipes, assigner un coach, lancer la migration).
- `screen-onb-set.jsx` — carte « Mes rôles » (liste par équipe) +
  ligne 🏟️ « Clubs & équipes » dans la section ADMIN.
- `app.html` — inclut `admin-clubs-panel.jsx`, cache buster v56.
- `firestore.rules` (poussé pour traçabilité Git, mais publication console = étape 2).

**2. Publication des règles** dans la console Firebase
(`arbitre-sport` → Firestore → Règles → coller le contenu de
`firestore.rules` → Publier). Sans cette étape, l'écriture en map `teams`
sera refusée par les anciennes règles encore en place.

**3. Migration des memberships existants** (sur l'app de prod, connecté
en `archi.tech.fr@gmail.com`) :
- Réglages → AVANCÉ · ADMIN → 🏟️ Clubs & équipes
- Clic sur le bouton orange **Migrer** (zone « Migration des memberships »)
- Vérifier le résultat : « X convertis · Y déjà OK · Z sautés · 0 erreurs ».
- Idempotent : relançable sans risque.

**4. Cas FCMH / snipflo** (résolution du bug d'origine) :
- Dans le panneau admin : **+ Créer un club** « FCMH ».
- Ouvrir FCMH → **+ Équipe** « Sénior » (ou nom métier).
- **Assigner** → email = `snipflo@gmail.com`. Si la recherche d'UID
  échoue, demander à snipflo son UID Firebase (visible dans la console
  Firebase → Authentication) et le saisir manuellement. Pré-requis :
  snipflo doit s'être déjà connecté à l'app au moins une fois.
- Snipflo recharge l'app → ses droits coach apparaissent → il peut
  désormais générer des invitations.

**5. Vérifications post-déploiement** :
- Admin → Réglages → carte « Mes rôles » : liste correcte par équipe.
- Coach déjà migré (avant Phase D) : doit voir 'Coach principal' sur
  son équipe, et le badge « à migrer » DOIT avoir disparu après l'étape 3.
- Nouvelle invitation parent / adjoint / lecteur : générer → consommer
  depuis un autre compte → membership créée avec `teams[teamId]` correct.
- Tester qu'un compte non-membre ne voit AUCUNE équipe d'un club étranger
  (cloisonnement préservé).

---

## 7. Pièges connus

- **Mount OneDrive du sandbox** : sert souvent des fichiers tronqués/stale → la validation de syntaxe par script échoue à tort. La vérité = relecture par l'outil fichier. Validation fiable uniquement côté Git Bash Windows.
- **OneDrive ressuscite `.git/index.lock`** — connu de longue date sur ce projet.
- Cache buster : `firebase-sync.js` est chargé avec `?v=NN` dans `app.html` — l'incrémenter à chaque modif de ce fichier (actuellement **v56**). Les autres fichiers (`roles.js`, `*.jsx`) ne sont PAS versionnés : à un changement, recharger en vidant le cache (Ctrl+Maj+R).
- Méthode de travail : Florian pousse lui-même via Git Bash dans `Version/V2/`. Éditeur git configuré sur `notepad`.

---

## 8. Repères techniques

- `firebase-sync.js` expose `window.cddSync` (convoc/vote), `window.cddAuth` (auth email-link + Google), `window.cddData` (clubs/teams/players/memberships + migration + pullCloudData + invitations C4 + `fetchClubMemberships` + **admin Phase D : `fetchAllClubs`, `findUidByEmail`, `assignTeamCoach`, `removeTeamMembership`, `migrateMembershipsToTeamsModel`**).
- `invite-manager.jsx` expose `window.InviteManager` — UI de génération de liens, montée dans les Réglages (`screen-onb-set.jsx`, section visible dès que `invitableRoles(role)` n'est pas vide). Les choix de rôle sont filtrés par la matrice **lue sur le rôle de l'équipe active** (Phase D).
- `admin-clubs-panel.jsx` (Phase D, **nouveau**) expose `window.AdminClubsPanel` — panneau modal réservé à l'admin : créer un club, des équipes, assigner un coach principal par équipe, lancer la migration D5.
- `roles.js` expose `window.CDD_ROLES` : rôles, memberships localStorage, `isAdmin`, `ADMIN_EMAIL`, `INVITE_MATRIX`, `effectiveRole(email)`, `invitableRoles(role)`, `canInviteRole(target)`, **`ROLE_CAPS` + `canDo(cap)` + `isReadOnly()`**, **Phase D : `readActiveContext`, `clubRoleOf(clubId)`, `teamRole(clubId, teamId)`, `myRoleOnTeam`, `activeTeamRole`, `listMyTeamRoles`**. Le rôle effectif est désormais le rôle SUR L'ÉQUIPE ACTIVE (`cdd_active_context.teamId`), avec fallback rétro-compat sur l'ancien format plat tant que la migration D5 n'a pas tourné.
- `data-adapter.js` (`window.CDD`) : seul accès au stockage ; filtre les clubs par membership de l'utilisateur.
- `data-bridge.js` : construit les globaux `CDD_CLUB`, `CDD_PLAYERS`, `CDD_CONVO`… consommés par les écrans React.
- `position-rating.js` expose `window.CDD_RATING` (7 profils de notation, `weightedOverall`, `quickProfile`, `labelsFor`) — chargé avant `data-bridge.js` dans `app.html`.
