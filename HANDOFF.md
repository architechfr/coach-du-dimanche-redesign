# HANDOFF — Coach du Dimanche V2

> Document de reprise. Dernière mise à jour : **2026-05-24** (cache buster **v76**).
> Pour reprendre dans un nouveau chat : dire « lis HANDOFF.md ».

---

## 1. État au 24 mai 2026 — où on en est

### ✅ Livré dans la session du 24 mai (commits post-v74)

**Phase 1C — Mode Vestiaire contextualisé** (commit 31a9caa) :
- Nouveau screen `tv-match` → lit `cdd_match_lineup` (compo du match).
  Fallback compo type saison si pas encore éditée.
- Bandeau visuel différent : 📅 orange en mode match vs 🗓️ gris en mode
  saison. Bouton 👟 MODE VESTIAIRE dans le hero Convocations.

**Phase 1D — Synchro compo type ↔ compo match** (commit 9b8a884) :
- Boutons 📌 Adopter comme compo type · ↻ Reset depuis compo type.
- Bannière orange si compo type modifiée APRÈS la compo match
  (comparaison `updatedAt`), choix Garder/Mettre à jour.

**Phase 1E — Lancer le match depuis Convocations** (commit 842345f) :
- Bouton 🏁 LANCER LE MATCH dans hero Convocations.
- `buildDefaultTeams()` priorité 0 = `cdd_match_lineup[teamId][matchId]`.
  Le Match Live démarre avec la compo de match si elle existe.

**Bug grid Convocations** (commit f75906b) :
- `cv-row` passe en 5 colonnes (avatar | num | nom 1fr | pos | action).
  Le bouton − ne tombe plus en ligne 2. `min-width:0` sur `.cv-last`
  pour que `text-overflow:ellipsis` fonctionne en flex.

**Sync 3 écrans — cdd_match_lineup = source unique** (commit 60f5e4d) :
- `CDD_CONVO` builder lit `cdd_match_lineup` en priorité 0 (avant
  l'overlay legacy `cdd_match_convoc` et le template `lt`).
- `addToConvoc` / `removeFromConvoc` écrivent dans `cdd_match_lineup`
  (+ cloud + event). `convocCount` = 11 + bench.length quand matchLineup.
- Identité visuelle orange = match-specific (bandeau éditeur + bouton
  VISUEL COMPO → tv-match + bouton COMPO DU MATCH dans Convocations).
- Garantit la cohérence parfaite des 3 écrans : Convocations / Compo
  du match / Mode Vestiaire match → même donnée.

**Fix score Match Live + Numéros maillots match-specific** (commits 4f055b8 + 88fb595) :
- `MatchHeader` restructuré en 2 lignes (scoreboard FIFA `Logo+Score+Logo`
  puis chrono géant en dessous). Score `clamp(40px, 11vw, 60px)` pour
  visibilité mobile.
- Nouveau module `jersey-numbers.js` → `window.CDD_JERSEY` (getOverrides,
  setBulk, wasReviewed, markReviewed, ofPlayer).
- Modale réutilisable `jersey-numbers-modal.jsx` (détection doublons,
  reset num saison, photos joueurs).
- Storage : `cdd_match_jersey_numbers[teamId][matchId][playerId] = num`.
  Seuls les num différents du num saison sont stockés.
- Bouton 🔢 NUMÉROS MAILLOTS DU MATCH dans :
  · Hero Convocations · Barre d'action Compo du match (mode match)
  · Toolbar Mode Vestiaire (source=match) · Modale obligatoire au
  1er clic LANCER LE MATCH (`wasReviewed` mémorise).
- `buildDefaultTeams()` applique les overrides aux tokens Match Live.
- Propagation visuelle aux 4 écrans match via helper local `displayNum(p)` :
  Convocations (4 occurrences + tri par matchNum), Compo du match
  (3 occurrences, conditional `isMatchMode`), Mode Vestiaire (2 occurrences,
  conditional `isMatchSource`). En mode saison/hors-match, num saison.

**UX — Recherche sans accents + Équipe Type ≠ Compo Match** (commit 5205375) :
- Helper `window.CDD_HELPERS.deburr` (NFD + suppression diacritiques).
  "Leonis" trouve "Léonis", "clement" trouve "Clément".
- 3 filtres mis à jour : Effectif, Réserve compo, recherche arbitre.
- Header de la page `lineup` renommé **ÉQUIPE TYPE** (au lieu de
  "FEUILLE DE MATCH" qui prêtait à confusion).
- Bandeau VERT 🗓️ ÉQUIPE TYPE en haut de la page compo type, symétrique
  du bandeau ORANGE 🎯 COMPO DU MATCH en mode match.
- Tile Accueil "Compo" : sous-titre "Équipe type saison".

### ✅ Livré et publié (v74 et avant)

- **Phase D** : modèle d'autorisation par équipe + multi-rôles. Publié.
- **Notation v2** : labels par poste (FINITION pour BU, MARQUAGE pour DC,
  VISION DU JEU pour MOC…), cap 99, fix slider fractionnaire `.15`, sync
  stats overrides Firestore.
- **Sync Firestore globale** : stats, profils, notes, perf deltas, compo
  type, compo de match, logos club (base64 compressé), photos joueurs.
- **Images** : compression Canvas auto (logo 256×256 JPEG 80%, photo
  400×400 JPEG 75%). Pas de Firebase Storage (plan Spark).
- **Invitations** : page de validation publique AVANT login. Sélecteur de
  lien de parenté. Affichage du joueur concerné dans la liste invitations.
- **Page Convocations** : refondue. Tri par numéro, photos avatar, fusion
  Suivi présences + Titulaires/Banc avec bouton 💬 inline.
- **Page Membres du club** : refondue Phase D. Badge ADMIN APP distinct.
- **Modale "Quitter le club"** : friction délibérée (saisie texte).
- **Couleurs d'accent** : pastilles colorées visuelles.
- **Page lecteur** : onglet Effectif en 3 sections.
- **Phase 1A + 1B compo match** : data layer + éditeur dédié.
  Collection Firestore `match_lineups`.

### 🔧 Bugs corrigés récemment
- Bouton − des cards Convocations tombait en 2e ligne (grid 4 cols / 5 items).
- Score Match Live invisible à l'arrivée (chrono XL écrasait le score).
- Convocations affichait Lucas alors que Compo du match avait posé Marley
  (3 storages désynchronisés → fusionnés via `cdd_match_lineup`).
- Mode Vestiaire qui divergeait de Feuille de match (couche convocation
  adaptative supprimée).
- Recherche sans accent ne trouvait pas "Léonis" ni "Clément".

### ⚠️ Convention cache buster (à respecter)
**1 push git = 1 numéro de version.** Tous les fichiers modifiés dans
le même commit prennent le même `?v=NN`. Le push suivant incrémente
de 1 (v74 → v75 → v76…). **Pas de réutilisation d'un numéro.**
*Note 2026-05-24* : on est resté longtemps en v74 pendant la session,
on remonte tout à **v76** au commit final de bouchon.

---

## 2. Sujet suivant — backlog priorisé

### Match amical (priorité 1 — déjà discuté)
- A : Bouton "Ajouter un match amical" dans Convocations.
- C : Onglet "Amicaux" dédié à côté de "Championnat".

### Page Match dédiée (priorité 2)
- Accès depuis l'Accueil. Vue centrée sur **le prochain match** :
  équipe convoquée, lancement du match, accès rapide compo/vestiaire.
  Évite la navigation entre 3 onglets (Convocations/Compo/Match Live).

### Autres pistes
- Page Club complète (organigramme, stade, GPS, contacts).
- Page Coach partageable (carte de visite).
- Onboarding émotionnel repensé.

---

## 3. Sujets en backlog (post-Phase 1)

- **Page Match dédiée** depuis Accueil : voir l'équipe convoquée + lancer
  le match depuis là.
- **Page Club** complète (organigramme, stade, GPS, contacts).
- **Page Coach** partageable (carte de visite).
- **Onboarding émotionnel** repensé.
- **Page Soutien projet** dédiée (pas paiement, juste présentation).
- **Import district / FFF** (futur module ingestion).
- **Mode visiteur public sur `?t=token`** : à BLOQUER (réponse Florian =
  pas de visiteur public, tout le monde doit se logger).
- **Photos manquantes** : Djibril TRAORE, Ilian LUNETEAU, Niels BRUDEY
  → Florian dit "pas important, joueurs d'une autre catégorie".
- **QR code d'invitation** : si flow D livré est clair, peut être OK.

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
