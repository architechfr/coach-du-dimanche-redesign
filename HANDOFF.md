# HANDOFF — Coach du Dimanche V2

> Document de reprise. Dernière mise à jour : **2026-05-21**.
> Pour reprendre dans un nouveau chat : dire « lis HANDOFF.md ».

---

## 1. Comment reprendre

Deux sujets ouverts, au choix :
- **« on fait la notation joueurs »** → construire la feature décrite en §5 (priorité demandée par Florian).
- **« C4 »** → continuer le chantier sécurité (invitations).

Action concrète attendue tout de suite : **améliorer le joueur Shahine — niveau 82 minimum.** C'est l'exemple qui motive la feature notation joueurs (§5).

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

---

## 4. Chantier sécurité — état

Objectif : un compte non autorisé ne doit voir AUCUNE donnée d'un club. Plan complet dans `PHASE-C-PLAN.md`.

- **C1 ✓** — règles Firestore déployées (`firestore.rules`). Modèle `clubs/teams/players/memberships/invites`. Accès imposé serveur : on ne lit un club que si on a une `membership` dessus. ID membership = `{uid}_{clubId}`.
- **C2 ✓** — données montées dans Firestore. `window.cddData` (dans `firebase-sync.js`) : save/fetch + `migrateLocalToCloud`. Bouton **Réglages → Sauvegarde cloud**.
- **C3 ✓** — migration rendue non-lossy (sauvegarde objet complet) ; `pullCloudData()` (lecture cloud → cache local) ; bouton **Réglages → Charger depuis le cloud** ; `seed-inline.js` vidé (données de mineurs hors du code public — RGPD). Testé : aller-retour cloud sans perte.

**Reste à faire :**
- **C4 — Invitations** : le coach génère un lien → crée une `membership`. Rattachement parent↔joueur obligatoire. Plafond 5 adjoints par coach.
- **C5 — Rôles & tableau de bord** : application des droits par rôle dans l'UI ; écran coach « qui est connecté en quelle qualité » ; nettoyer le fallback `currentRole()→'coach'` de `roles.js` ; rendre `pullCloudData` automatique au login ; images (logo club + photos joueurs) → Firebase Storage.
- Ménage non urgent : collections Firestore legacy (`matches`, `club_matches`, `transfers`, `users`, `cdd_v2_*`).

---

## 5. PROCHAINE FEATURE — Notation des joueurs pondérée par poste

> Demande explicite de Florian. À construire en priorité.

**Le besoin.** Le coach doit pouvoir modifier les caractéristiques de ses joueurs.

**Le principe central — la note moyenne est PONDÉRÉE selon le poste.** Ce n'est pas une moyenne plate des 6 stats. Un défenseur ne doit pas être mal noté parce qu'il a une mauvaise finition ; un attaquant ne doit pas être pénalisé parce qu'il n'a pas les caractéristiques défensives. Chaque poste est évalué différemment — mais un joueur, quel que soit son poste, peut avoir une très bonne ou une mauvaise note moyenne, selon qu'il est bon ou mauvais **à son poste**.

**Design retenu (Florian a délégué les choix) :**

1. **Postes détaillés — 7 profils**, chacun avec sa table de pondération sur les 6 stats (VIT/TIR/PAS/DRI/DEF/PHY) :
   Gardien · Défenseur central · Latéral · Milieu récupérateur · Milieu offensif · Ailier · Attaquant de pointe.
   Exemples de pondération (sur 100) :
   - Défenseur central : DEF 30, PHY 25, VIT 15, PAS 15, DRI 10, TIR 5
   - Attaquant de pointe : TIR 33, VIT 22, DRI 20, PHY 12, PAS 9, DEF 4

2. **Le gardien a ses 6 stats dédiées** : plongeon, réflexes, jeu au pied, détente, placement, duel (1v1). Les stats de champ ne décrivent pas un gardien.

3. **Deux modes d'édition** :
   - *Rapide* : le coach choisit le poste + donne une note globale → l'app génère un profil de stats réaliste et typé pour ce poste (s'appuyer sur le helper `deriveStats` existant).
   - *Détaillé* : le coach règle les 6 stats une par une → la note moyenne se recalcule en direct, en pondéré.

4. Source de vérité unique : la note moyenne est **toujours** dérivée des 6 stats + du poste. Le mode rapide pré-remplit, le mode détaillé affine.

Stats joueurs : vivent dans les documents `players` de Firestore. Pas de marque déposée dans les libellés.

---

## 6. Pièges connus

- **Mount OneDrive du sandbox** : sert souvent des fichiers tronqués/stale → la validation de syntaxe par script échoue à tort. La vérité = relecture par l'outil fichier. Validation fiable uniquement côté Git Bash Windows.
- **OneDrive ressuscite `.git/index.lock`** — connu de longue date sur ce projet.
- Cache buster : `firebase-sync.js` est chargé avec `?v=NN` dans `app.html` — l'incrémenter à chaque modif de ce fichier (actuellement v51).
- Méthode de travail : Florian pousse lui-même via Git Bash dans `Version/V2/`. Éditeur git configuré sur `notepad`.

---

## 7. Repères techniques

- `firebase-sync.js` expose `window.cddSync` (convoc/vote), `window.cddAuth` (auth email-link + Google), `window.cddData` (clubs/teams/players/memberships + migration + pullCloudData).
- `roles.js` expose `window.CDD_ROLES` (rôles, memberships localStorage, `isAdmin`, `ADMIN_EMAIL`).
- `data-adapter.js` (`window.CDD`) : seul accès au stockage ; filtre les clubs par membership de l'utilisateur.
- `data-bridge.js` : construit les globaux `CDD_CLUB`, `CDD_PLAYERS`, `CDD_CONVO`… consommés par les écrans React.
