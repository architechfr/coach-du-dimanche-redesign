# Phase C — Isolation des données & autorisation réelle

> Document d'architecture. Rédigé le 2026-05-19. Objectif : qu'un utilisateur
> ne puisse accéder **qu'aux** clubs/équipes/joueurs auxquels son compte a
> explicitement droit — imposé **côté serveur** (règles Firestore), donc
> infranchissable même via les outils développeur du navigateur.

## 1. Le problème qu'on corrige

Aujourd'hui les données des clubs sont (a) embarquées dans le bundle
(`seed-inline.js`) et (b) stockées dans le `localStorage` de l'appareil.
`data-adapter.js` les sert sans aucune notion de propriété. `roles.js`
estampille tout email connecté comme `coach`. Conséquence : n'importe quel
compte authentifié voit et possède toutes les données présentes sur
l'appareil.

L'authentification (Phase B) prouve **qui** tu es. La Phase C ajoute la
couche manquante : **à quoi** tu as droit (autorisation).

## 2. Modèle de données Firestore

```
clubs/{clubId}
  { name, logoUrl, createdBy(uid), createdAt }

teams/{teamId}
  { clubId, name, category, fffConfig, createdBy, createdAt }

players/{playerId}
  { teamId, clubId, first, last, num, pos, photoUrl, stats…, updatedBy }

memberships/{uid}_{clubId}        ← table d'AUTORISATION (cœur du système)
  { uid, email, clubId, teamId(opt), role, playerId(opt),
    createdBy, createdAt }
  role ∈ owner | admin | coach | adjoint | parent | joueur | lecteur
  ⚠ l'ID du doc DOIT être `{uid}_{clubId}` → permet aux règles Firestore
    de retrouver la membership par get() direct (pas de requête possible
    depuis une règle).

invites/{token}                   ← liens d'invitation
  { clubId, teamId, role, playerId(opt), email(opt),
    createdBy, createdAt, expiresAt, consumed:bool, consumedBy(uid) }

# Collections déjà existantes — conservées
cdd_v2_convoc/{matchId}   · cdd_v2_votes/{matchId}
cdd_v2_players/{playerId} · cdd_v2_matches/{matchId}
```

Principe clé : **une `membership` = un droit explicite**. Pas de membership
sur un club → aucun accès, peu importe ce qu'il y a en local.

## 3. Logique des règles de sécurité (Firestore Rules)

Admin = `archi.tech.fr@gmail.com` (vérifié via `request.auth.token.email` —
fiable maintenant qu'on a une vraie auth).

- **clubs / teams / players** :
  - *lecture* : autorisée si l'utilisateur a une `membership` sur ce `clubId`.
  - *écriture* : autorisée si membership de rôle `coach`/`owner`/`admin` sur
    ce club. Les rôles `adjoint`/`parent`/`joueur`/`lecteur` sont en lecture
    seule sur les données du club.
- **memberships** :
  - *lecture* : chacun lit les siennes ; un coach lit celles de ses clubs.
  - *création* : seul un `coach`/`owner`/`admin` du club concerné peut créer
    une membership (= rattacher quelqu'un). Une membership `parent` DOIT
    porter un `playerId` (sinon refus).
  - création d'une membership `coach` : réservée à l'admin.
- **invites** :
  - *création* : `coach`/`admin` uniquement, pour leurs propres clubs.
  - *lecture/consommation* : l'invité lit le token et, à la première
    connexion, déclenche la création de SA membership selon le contenu de
    l'invite (rôle/club/joueur imposés par l'invite, jamais choisis).

Limite assumée (plan gratuit Spark, pas de Cloud Functions) : le plafond de
5 adjoints et la consommation strictement atomique des tokens ne sont pas
garantis à 100 % par les règles seules. On fait au mieux côté règles + UI ;
durcissement possible plus tard avec une Cloud Function (plan Blaze).

## 4. Séquence d'implémentation

- **C1 — Socle** : ce document + `firestore.rules` réécrites pour le modèle
  ci-dessus, sans casser les collections `cdd_v2_*` existantes. Déployable
  seul, n'affecte pas l'app tant que C2/C3 ne sont pas là.
- **C2 — Écriture** : quand le coach crée/modifie club/équipe/joueur, on
  écrit aussi dans Firestore. Migration unique : pousser les données locales
  existantes du coach vers Firestore + créer ses memberships. La migration
  auto « tout le monde devient coach » de `roles.js` est **supprimée**.
- **C3 — Lecture** : `data-adapter.js` charge clubs/équipes/joueurs depuis
  Firestore filtrés par les memberships de l'utilisateur, au lieu du seed.
  `localStorage` devient un cache offline. Le `seed-inline.js` est vidé de
  ses vraies données (sujet RGPD : plus de données de mineurs dans le bundle
  public ni le dépôt GitHub).
  **Images uploadées** : le logo du club et les photos de joueurs doivent
  AUSSI quitter le `localStorage`/les fichiers statiques du dépôt. Cible :
  Firebase Storage, référencés par `clubs/{clubId}.logoUrl` et
  `players/{playerId}.photoUrl`, accessibles à tout membre du club.
  Aujourd'hui le logo n'a aucun fallback partagé (d'où le carré "F" pour les
  autres comptes) et les photos U15 sont des fichiers statiques publics
  (`assets/photos_U15_2025-2026/`) — les deux sont à corriger ici.
- **C4 — Invitations** : le coach génère un lien d'invitation → doc
  `invites` → le destinataire le consomme → sa membership est créée. Couvre
  l'accès club sur lien uniquement, le rattachement parent↔joueur
  obligatoire, le plafond de 5 adjoints.
- **C5 — Rôles & tableau de bord** : application des droits par rôle dans
  l'UI, écran coach « qui est connecté et en quelle qualité ».

## 5. Ce qui change pour l'utilisateur

- Un email inconnu qui se connecte : aucun club, écran « crée ton club » —
  et il ne PEUT créer un compte coach que si l'admin l'y autorise.
- Un parent : accès en lecture à son enfant uniquement, via un lien du coach.
- Le coach : retrouve ses clubs sur n'importe quel appareil (données dans le
  cloud, plus seulement sur un navigateur).
- Les données de mineurs ne sont plus dans le code public.

## 6. État

- [x] C1 — socle : `firestore.rules` + ce doc (2026-05-19).
- [x] C2 — écriture Firestore + migration (`window.cddData`, bouton Sauvegarde cloud).
- [x] C3 — lecture Firestore (`pullCloudData`) + vidage du seed.
- [x] C4 — invitations (2026-05-21) : `createInvite`/`consumeInvite`/`revokeInvite`
      dans `firebase-sync.js`, UI coach `invite-manager.jsx` dans les Réglages,
      consommation auto à la connexion, rattachement parent↔joueur, plafond
      5 adjoints. **`firestore.rules` modifiées → à redéployer dans la console
      Firebase** (branche « auto-création depuis invitation » de `memberships`).
- [ ] C5 — rôles & dashboard
