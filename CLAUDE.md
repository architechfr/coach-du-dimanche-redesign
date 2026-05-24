# Coach du Dimanche V2 — contexte projet

PWA web mobile-first pour le **football amateur** (pas de futsal/rugby).
Pas d'étape de build : HTML/CSS + JSX transpilé par Babel **dans le navigateur**
(`type="text/babel"`). Tout est en scope global (`window.*`).

## Reprise rapide

Au démarrage d'une session, lis dans l'ordre :
1. `HANDOFF.md` — état détaillé, dernière session, repères techniques.
2. `PHASE-C-PLAN.md` — chantier sécurité C1→C5 (livré).
3. `PHASE-D-PLAN.md` — modèle d'autorisation par équipe (EN COURS).

## État au 2026-05-21

- **C1→C5 livrés** : auth réelle (Firebase), données dans Firestore,
  invitations par lien, matrice d'invitation, droits par rôle dans l'UI.
- **Phase D livrée côté code, NON PUBLIÉE** — refonte du modèle
  d'autorisation : un rôle **par équipe** (et non par club), multi-rôles.
  Voir `PHASE-D-PLAN.md` §8 et la **séquence de publication détaillée**
  dans `HANDOFF.md` §6.
  - **D1 → D6 ✓** côté code : règles, `roles.js`, `firebase-sync.js`,
    `invite-manager.jsx`, panneau admin clubs/équipes
    (`admin-clubs-panel.jsx`), migration des memberships, doc.

> ⚠️ **À publier en UN SEUL passage** : (1) push du code Phase D vers
> `main`, (2) publier `firestore.rules` dans la console Firebase,
> (3) lancer la migration des memberships depuis le panneau admin
> (Réglages → AVANCÉ · ADMIN → 🏟️ Clubs & équipes → « Migrer »).
> Les trois sont solidaires — publier les règles avant le code casserait
> la prod, publier le code sans les règles refuserait toute écriture.

## Bug ouvert qui motive la Phase D

`snipflo@gmail.com` (coach non-admin) reçoit « Missing or insufficient
permissions » en générant une invitation : son club FCMH n'existe qu'en local,
jamais dans Firestore. **Résolution prévue à la publication** (cf.
`HANDOFF.md` §6 étape 4) : créer FCMH + équipe + assigner snipflo comme
coach principal via le panneau admin.

## Infra & déploiement

- Dépôt Git : `github.com/architechfr/coach-du-dimanche-redesign`. La racine
  du dépôt est ce dossier (`Version/V2/`).
- Déploiement : Vercel, auto-deploy sur push `main` →
  `coach-du-dimanche-redesign.vercel.app`.
- Backend : Firebase projet `arbitre-sport` (plan gratuit Spark — pas de
  Cloud Functions, sécurité 100 % par `firestore.rules`).
- Admin / super-utilisateur : `archi.tech.fr@gmail.com`.
- `firestore.rules` se déploie À LA MAIN dans la console Firebase
  (Firestore → Règles → Publier). Chaque modif de ce fichier doit être
  redéployée.

## Pièges connus

- **Cache buster** : les fichiers `.js` / `.jsx` / `.css` sont chargés
  avec `?v=NN` dans `app.html`. **1 push git = 1 numéro de version**,
  tous les fichiers modifiés dans le même commit prennent le même `?v=NN`,
  le push suivant incrémente de 1 (actuellement **v76**). Pas de
  réutilisation d'un numéro. Seuls quelques fichiers stables historiques
  ne sont pas versionnés (player-card.jsx, screen-share.jsx, etc.).
- **OneDrive** : ce dossier est synchronisé OneDrive. OneDrive verrouille
  parfois `.git/` pendant un `git push` (prompts « Deletion of directory
  failed ») et ressuscite `.git/index.lock`. Mettre OneDrive en pause avant
  un push évite le souci.
- Florian pousse lui-même via Git Bash. Éditeur git = `notepad`.

## Conventions

- Football uniquement. Pas de marques déposées (FIFA/FUT/Ultimate Team) dans
  les textes visibles.
- Fonctions admin gatées derrière l'email `archi.tech.fr@gmail.com`, jamais
  exposées aux coachs.
- `roles.js` expose `window.CDD_ROLES` ; `firebase-sync.js` expose
  `window.cddAuth` / `window.cddData` / `window.cddSync`.
