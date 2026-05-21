# Phase D — Modèle d'autorisation par équipe & multi-rôles

> Document de conception. Rédigé le 2026-05-21. À VALIDER par Florian avant
> tout code. Fait suite à `PHASE-C-PLAN.md` (C1→C5 livrés). Objectif : refonder
> le modèle de droits pour qu'il colle au fonctionnement réel — un rôle par
> **équipe**, le multi-rôles, et l'admin qui crée les clubs.

---

## 1. Pourquoi cette phase

Le modèle actuel (Phase C) attache **un seul rôle par personne et par club**
(`memberships/{uid}_{clubId}`, champ `role` unique). Trois besoins exprimés ne
rentrent pas dans ce moule :

1. **Un coach principal par équipe.** Un club peut avoir 10 équipes → 10 coachs
   principaux. Le rôle porte sur une équipe, pas sur le club entier.
2. **Le multi-rôles.** Une même personne peut être, en même temps : coach
   principal de l'équipe A, adjoint de l'équipe B, parent d'un joueur de
   l'équipe C, et même joueuse +35 elle-même. Aucune limite.
3. **Les droits viennent du rôle attribué, pas de l'auteur de la création.**
   Peu importe qui a créé le club ou l'équipe (souvent l'admin, qui vend l'app
   et sa mise en place) — ce qui compte, c'est la `membership`.

Le bug constaté le 2026-05-21 (« Missing or insufficient permissions » à la
génération d'une invitation par `snipflo@gmail.com`) est un symptôme : le club
FCMH de snipflo n'existe qu'en local, jamais dans Firestore, donc le serveur ne
le reconnaît pas comme coach. Le correctif passe par ce nouveau modèle.

---

## 2. Le modèle révisé

### 2.1 Entités

```
clubs/{clubId}
  { name, logoUrl, createdBy, createdAt }
  createdBy = info seulement, JAMAIS une source de droits.

teams/{teamId}
  { clubId, name, category, fffConfig, createdBy, createdAt }

players/{playerId}
  { teamId, clubId, first, last, num, pos, stats… }

memberships/{uid}_{clubId}        ← table d'AUTORISATION
  { uid, email, clubId,
    teams: {                      ← un rôle PAR ÉQUIPE
      "{teamId}": { role, playerId(opt) },
      …
    },
    createdBy, createdAt, updatedAt }

invites/{token}
  { clubId, teamId, role, playerId(opt), email(opt),
    createdBy, createdAt, expiresAt, consumed, consumedBy }
```

### 2.2 Choix clé : la membership reste un doc par (utilisateur, club),
mais contient un rôle **par équipe**

Pourquoi pas un doc par (utilisateur, équipe) ? Parce que les règles Firestore
ne savent retrouver un document que par un identifiant qu'elles peuvent
calculer. Lors d'une opération sur un club, la règle connaît `uid` et `clubId`,
mais pas `teamId`. Garder l'id `{uid}_{clubId}` permet à la règle de retrouver
la membership par `get()` direct, puis de lire `teams[teamId].role`.

Concrètement, cette membership couvre tous les cas :

- Coach principal des équipes A et B :
  `teams: { A: {role:'coach'}, B: {role:'coach'} }`
- Coach de A + parent dans B (même club) :
  `teams: { A: {role:'coach'}, B: {role:'parent', playerId:'pl_…'} }`
- Membre de 3 clubs différents → 3 documents `memberships`.

### 2.3 Rôle effectif & équipe active

L'app a déjà une notion d'« équipe active » (`cdd_active_context.teamId`).
Le **rôle effectif** devient : le rôle de ma membership sur l'équipe active.

- `effectiveRole()` ne lit plus `cdd_user_role` (valeur unique) mais
  `membership(clubActif).teams[équipeActive].role`.
- L'admin (`archi.tech.fr@gmail.com`) reste 'admin' partout.
- La carte « Mon rôle » des Réglages devient « Mes rôles » : elle peut lister
  le rôle par équipe, ou afficher le rôle sur l'équipe active + un compteur.

---

## 3. Les rôles et leurs droits

Inchangé depuis C5, mais désormais appliqué **par équipe** :

| Rôle | Périmètre | Droits |
|---|---|---|
| **admin** | toute l'application | tout ; voit tous les clubs/équipes |
| **coach principal** (`coach`) | une équipe | capacités `compo` + `effectif` + `club` ; presque tout sur son équipe ; peut signaler un problème à l'admin |
| **adjoint** (= dirigeant) | une équipe | capacités `compo` + `effectif` ; pas la gestion du club |
| **parent** | un joueur d'une équipe | lecture seule, centrée sur son joueur |
| **joueur** | sa propre fiche | lecture seule |
| **lecteur** | une équipe | lecture seule |

Capacités d'édition (`roles.js → ROLE_CAPS`, déjà en place) : `compo` (compo,
convocations, match live), `effectif` (statuts, notation, joueurs/équipes),
`club` (logo, infos club).

> **À confirmer** : le terme « dirigeant » que tu emploies = le rôle `adjoint` ?
> Je propose de n'en garder qu'un seul nom pour éviter la confusion.

---

## 4. Qui crée quoi

- **Clubs** : l'admin (cas principal — tu vends l'app + la mise en place).
  Plus tard : auto-inscription payante d'un coach (cf. feuille de route :
  scan QR → 1 mois gratuit → 2,99 €/mois, partage 70/30).
- **Équipes** : l'admin, ou un coach principal du club.
- **Coach principal d'une équipe** : assigné par l'admin (un seul par équipe).
- **Adjoint / parent / joueur / lecteur** : par lien d'invitation, selon la
  matrice (cf. C5) — l'invitation cible une **équipe** précise.

L'admin a besoin d'un écran : créer un club → y créer des équipes → assigner un
coach principal (par e-mail) à chaque équipe.

---

## 5. Règles Firestore (principe)

- Les droits se lisent **uniquement** dans `memberships`. `createdBy` n'entre
  jamais dans une décision d'autorisation.
- Lecture d'une équipe / d'un joueur : avoir une entrée `teams[teamId]` dans sa
  membership du club, quel que soit le rôle.
- Écriture des données d'une équipe (`teams`, `players`) : rôle `coach` ou
  `adjoint` (ou `owner`/`admin`) sur cette équipe.
- Écriture du club lui-même (logo, infos) : rôle `coach`/`owner` sur au moins
  une équipe du club, ou admin. *(Point technique à régler en D2 : comment la
  règle vérifie « coach d'au moins une équipe » — sans doute via un champ
  dénormalisé sur la membership.)*
- `memberships` : l'admin assigne les rôles `coach` ; les autres rôles arrivent
  par consommation d'invitation (l'invité crée/complète sa propre membership,
  autorisé par un token valide — mécanique C4 conservée, étendue au niveau
  équipe).

---

## 6. Impact sur l'existant (C1→C5)

Ce qui devra évoluer :

- **`memberships`** : id conservé `{uid}_{clubId}`, mais le champ `role` plat
  devient une map `teams`. Migration des documents existants nécessaire.
- **`firestore.rules`** : helpers `hasMembership`/`membershipRole`/`canEditClub`
  /`canEditData`/`canInviteRole` réécrits pour lire `teams[teamId]`.
- **`roles.js`** : `effectiveRole()` lit la membership de l'équipe active ;
  `cdd_user_role` n'est plus une source de droits (au mieux un cache).
- **`firebase-sync.js`** : `saveMembership` écrit dans la map `teams` ;
  `createInvite`/`consumeInvite` raisonnent par équipe.
- **Le gating UI C5** (`canDo`) : la logique reste, seule la source du rôle
  change → peu de changement écran par écran.
- **Carte « Mon rôle »** → « Mes rôles » (multi-équipes).

Ce qui ne change pas : l'isolation entre clubs, les capacités `compo`/
`effectif`/`club`, la matrice d'invitation, l'auth.

---

## 7. Le cas FCMH / snipflo

Une fois le modèle codé : l'admin crée le club FCMH et son équipe dans
Firestore, assigne `snipflo@gmail.com` comme coach principal de l'équipe, et les
données locales de snipflo (joueurs) remontent. À partir de là, snipflo a une
membership serveur → les invitations fonctionnent.

D'ici là, FCMH/snipflo reste en local (décision : on attend le modèle complet).

---

## 8. Séquence d'implémentation

- **D1 — Conception** ✓ : ce document, validé par Florian.
- **D2 — Règles** ✓ : `firestore.rules` réécrites pour la map `teams`
  (`teamRole`, `canManageClub`, `canEditTeam`, `createMatchesInvite`,
  `updateMatchesInvite`, `canInviteRole`). **À publier console Firebase**
  en même temps que les autres steps (cf. `HANDOFF.md` §6).
- **D3 — roles.js** ✓ : `effectiveRole()` par équipe active, helpers
  `teamRole` / `clubRoleOf` / `myRoleOnTeam` / `activeTeamRole` /
  `listMyTeamRoles`, normalisation rétro-compat des deux formats de
  membership, carte « Mes rôles » dans les Réglages.
- **D4 — Données** ✓ : `firebase-sync.js` réécrit (`saveMembership` au
  format `teams`, `removeTeamMembership`, `teamRoleCount`, `consumeInvite`
  préserve `clubRole`, `pullCloudData` propage le nouveau format, helpers
  admin `fetchAllClubs` / `findUidByEmail` / `assignTeamCoach`) ;
  `invite-manager.jsx` matrice par équipe ciblée ; nouveau panneau
  `admin-clubs-panel.jsx` monté dans la section ADMIN des Réglages.
  Cache buster : v54 → v56.
- **D5 — Migration** ✓ : `migrateMembershipsToTeamsModel()` (idempotente),
  exposée via `window.cddData` et accessible depuis le panneau admin
  (bouton orange « Migrer »). Convertit les documents Phase C (rôle plat)
  vers `{ clubRole, teams }`. Mapping :
  - `owner` / `admin` plat → `clubRole=role`, `teams={}`.
  - `coach` plat → `clubRole='coach'`, `teams` = toutes les équipes du
    club (préserve le standing « coach principal du club entier »).
  - `adjoint`/`parent`/`joueur`/`lecteur` avec `teamId` → `clubRole=''`,
    `teams={[teamId]:{role,playerId?}}`.
  - Sans `teamId` ni standing club → ignoré, journalisé pour l'admin.
- **D6 — Publication & tests** ✓ (code) : checklist détaillée dans
  `HANDOFF.md` §6. Tests bout-en-bout à exécuter par Florian après
  publication. Une fois validés, retirer le fallback `cdd_user_role`
  et la branche `_legacyFlatRole` dans `roles.js` (commentaires en
  place pour repérer les zones à nettoyer).

---

## 9. Décisions (tranchées le 2026-05-21)

1. ✅ « Dirigeant » = le rôle `adjoint`. Un seul nom conservé : **coach
   adjoint**. Le mot « dirigeant » disparaît du vocabulaire.
2. ✅ Une équipe = **exactement 1 coach principal** + **jusqu'à 5 adjoints**.
   Parents / joueurs / lecteurs sans limite.
3. ✅ Création d'une équipe : **l'admin OU un coach principal du club**.
4. ✅ Carte « Mes rôles » : **liste complète**, un rôle par équipe.
5. ⏳ « Signaler un problème à l'admin » : simple e-mail pré-rempli pour
   l'instant ; canal in-app éventuellement plus tard. Hors périmètre D.
