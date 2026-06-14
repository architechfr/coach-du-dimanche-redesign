# Coach du Dimanche V2 — contexte projet

PWA web mobile-first pour le **football amateur** (pas de futsal/rugby).
Pas d'étape de build : HTML/CSS + JSX transpilé par Babel **dans le navigateur**
(`type="text/babel"`). Tout est en scope global (`window.*`).

## Reprise rapide

Au démarrage d'une session, lis dans l'ordre :
1. `HANDOFF.md` — état détaillé, dernière session, repères techniques.
2. `PHASE-C-PLAN.md` — chantier sécurité C1→C5 (livré).
3. `PHASE-D-PLAN.md` — modèle d'autorisation par équipe (EN COURS).

## État au 2026-05-25 (nuit)

Pour le détail complet des livraisons, lire **`HANDOFF.md`** (changelog
session par session). Synthèse rapide :

- **C1→C5 + Phase D livrés et publiés** : auth réelle (Firebase), données
  Firestore, invitations par lien, matrice d'invitation, droits par rôle,
  modèle d'autorisation par équipe avec multi-rôles.
- **Phase 1A→1E livrées** : compo de match séparée de la compo type,
  Mode Vestiaire contextualisé, synchro adopter/reset, lancement match
  depuis Convocations.
- **Cohérence 3 écrans** : `cdd_match_lineup` est désormais la source
  UNIQUE pour Convocations / Compo du match / Mode Vestiaire match.
- **Numéros maillots match-specific** (`cdd_match_jersey_numbers`) avec
  modale d'édition, badge "Équipe 2" et sync cloud.
- **Infos pratiques du match** (`cdd_match_info`) : stade, adresse,
  horaires RDV/coup d'envoi, covoiturage, notes. Sync cloud.
- **Matchs amicaux** (`cdd_friendly_matches`) : création hors-championnat,
  badge violet AMICAL, onglet dédié dans Championnat. Sync cloud.
- **Page Match dédiée** (`screen-match-prep.jsx`) : hub centralisé du
  prochain match (checklist préparation + actions + lancement) accessible
  depuis l'Accueil (tile "Prochain match").

> **Collections Firestore actives** : `clubs`, `teams`, `players`,
> `memberships`, `invites`, `match_lineups`, `match_infos`, `match_jerseys`,
> `friendly_matches`, `deleted_matches` (pierres tombales de suppression
>   cross-appareils, 2026-06-14) + legacy `cdd_v2_*` et `shared_teams`.
> Les règles sont dans `firestore.rules`, à publier à la main dans la
> console Firebase après tout changement.

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
  le push suivant incrémente de 1 (actuellement **v94**). Pas de
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
