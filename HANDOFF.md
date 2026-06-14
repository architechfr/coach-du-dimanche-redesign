# HANDOFF — Coach du Dimanche V2

> Document de reprise. Dernière mise à jour : **2026-06-14 — suppression atomique + buteurs par compétition + multi-format foot à 8/5/futsal** (data-bridge **v143** / match-engine **v140**).
> Pour reprendre dans un nouveau chat : dire « lis HANDOFF.md ».

---

## 🚀 Session du 14 juin — suppression atomique, buteurs par compétition, MULTI-FORMAT

Grosse session structurante. Tout livré et poussé sur `main`. **Foot à 11 strictement inchangé** à chaque étape.

### 1. Onglet Amicaux + suppression atomique anti-résurrection (tombstones)
**Problème** : l'onglet Amicaux ne montrait que les amicaux *programmés non joués* (filtre `endedAt`), jamais les résultats. Et supprimer un match était fragile : « je supprime un 2e match, le 1er revient » → cause = suppression cloud *fire-and-forget* + `pullCloudData` qui re-merge les amicaux de façon **additive** (jamais de purge).
- **Tombstones** (`cdd_deleted_matches`, dans `friendly-matches.js`) : un id supprimé n'est **plus jamais** ré-affiché ni re-mergé. Helpers `tombstone/isTombstoned/tombstones`.
- **`CDD_FRIENDLY.purgeMatch({teamId, matchId, friendlyId})`** : suppression ATOMIQUE des **deux** représentations d'un amical joué (l'amical `fr_*` ET le match arbitré `m_*` lié via `scheduledMatchId`) — local + cloud + lineup/info/jersey.
- `pullCloudData` (firebase-sync) : le merge des amicaux **skip + purge** les tombstones.
- `listCoachFinishedMatches` (match-engine) : filtre les tombstones.
- **Onglet Amicaux refait** (`screen-results-conv.jsx`) : section **📅 À venir** + section **🏁 Résultats** (amicaux ET entraînements, score + buteurs + lien feuille de match + 🗑 suppression). Anti-doublon À venir/Résultats.
- Suppression branchée aussi sur la feuille de match (`app.jsx`) et la modale d'édition amical (`friendly-match-modal.jsx`).

### 2. Classement buteurs + passes par compétition (champ vs amical)
**Problème** : l'onglet Buteurs était VIDE. Cause : `buildTopScorers`/`applyRealStats` lisaient le store legacy `arb_m` avec les mauvais champs (`m.events`/`e.type`) alors que les buts sont dans `m.ev` (`tp:'goal'`, `t:'A'`, `scorer/scorerId`, `passer`).
- **Agrégateur unique** `aggregateTeamMatchStats()` (data-bridge) : scanne `cdd_match_*`, côté A, **bucketé par compétition** (championnat/coupe vs amical/entraînement), respecte club/équipe + tombstones. Compte **buts ET passes décisives**. Inclut les buteurs **ponctuels** (rattachés par label si pas dans l'effectif) → tout buteur apparaît, comme dans « Derniers matchs ».
- `buildTopScorers` + `applyRealStats` (cartes joueur) consomment cette source unique.
- Onglet Buteurs : filtre **Tout / Championnat / Amical**.
- Cohérence suppression : supprimer un match recalcule le classement (tombstone + `CDD_REBUILD`).

### 3. MULTI-FORMAT foot à 11 / 8 / 5 / futsal (Phases 0 → 1c + live)
Socle pour rendre l'app utilisable en foot à 8 (équipes enfants ET adultes demi-terrain), foot à 5, futsal. **Défaut `'11'` → rien ne change pour l'existant.**
- **Phase 0 — socle** : `team.format` (`11|8|5|futsal`) + `team.isAdult` **explicites**, réglables dans **Club → Équipes du club** (`screen-club.jsx`), persistés `arb_teams` + cloud (saveTeam pass-through, pas de modif `firestore.rules`). Helpers `CDD_TEAM_HELPERS.teamFormat/formatMeta/activeTeamFormat/TEAM_FORMATS`. `isAdultTeam` respecte le réglage explicite (heuristique en défaut).
- **Phase 1a — formations** : `CDD_FORMATIONS_ALL` par format (F8 : 3-3-1/2-3-2/3-1-3/2-4-1 ; F5 : 1-2-1/2-2/2-1-1 ; futsal : 1-2-1/2-2/3-1 ; F11 inchangé). `window.CDD_FORMATIONS` = sous-ensemble du format actif → écrans adaptatifs automatiquement. `window.CDD_DEFAULT_FORMATION` remplace les `'4-3-3'` codés en dur.
- **Phase 1b — convoc + config match** : `CDD_CONVOC.getLimits()` (banc/convoc par format) ; `match-engine.newMatch` dérive durées/joueurs/changements du format (F8 2×30/8/7, F5 2×25/5/∞, futsal 2×20/5/∞) et stocke `m.format`.
- **Phase 1c — polish** : tous les `'4-3-3'` et compteurs `=== 11` résiduels rendus format-aware (results-conv, match-prep « compo prête » sur N titulaires, tactique, tv, compo-libre, effectif-lineup) + descriptions des nouvelles formations.
- **Live durci** : `buildDefaultTeams` + adversaire générique/saisi respectent le nb de joueurs du format.

### 4. Git / OneDrive — fin des prompts `y/n` au push
Cause : **147 objets loose en double** (`prune-packable`) que OneDrive/Defender empêchaient de supprimer → git re-tentait à chaque op. Réglé par `git gc --prune=now` (→ 0 loose, 1 pack) + `gc.auto 0` global. **Recommandé** : exclure le dossier projet de Windows Defender.

### Versions cache buster à jour
`data-bridge v143`, `match-engine v140`, `screen-results-conv v147`, `screen-club v146`, `screen-effectif-lineup v121`, `screen-match-prep v125`, `screen-match-live-v2 v142`, `screen-tactique v96`, `screen-tv v77`, `screen-compo-libre v2`, `friendly-matches v121`, `friendly-match-modal v81`, `app.jsx v151`.

### TODO / pistes next session
- **Tester un parcours F8 complet en vrai** (créer équipe F8, compo 8, convoc, lancer, feuille de match).
- Suppression cross-appareils : aujourd'hui définitive sur l'appareil qui supprime (cloud effacé) ; un autre appareil déjà ouvert peut garder un fantôme → SOS Resync. Possible amélioration : tombstones propagés au cloud.
- Mineurs détails F8 : snap du banc dans l'éditeur de compo type, `slice(0,11)` d'affichage live (inoffensif).

---

## 🚀 Session du 26 mai — UX coach, sync cross-device, ICS

Très grosse session. **20+ commits**, dont plusieurs fix critiques qui touchent au cœur du fonctionnement multi-device.

### ⚠️ TÂCHE EN COURS À L'OUVERTURE DU NEXT CHAT

Le **match en cours cross-device** n'est PAS encore validé en pratique :
- Le code est livré (commit `6f98c0e`)
- Mais le user n'a pas eu le temps de tester en conditions réelles après mon dernier push
- Étape attendue : lui demander de force-refresh téléphone, ouvrir l'écran live, vérifier dans F12 console PC qu'il voit :
  ```
  [liveMatch] équipes avec match en cours : 1 [...]
  [liveMatch] ✓ match en cours pulled du cloud : <id>
  ```
- Si non → le tick 10s va probablement rattraper si on attend assez longtemps

### Travail livré

#### 1. Admin app distinctif (carte dorée, sections coach masquées)
- `roles.js` : label `'Admin club'` → `'Admin App'`
- `screen-onb-set.jsx` : profil doré + sections "Mon club / équipe / Inviter" masquées pour admin
- Affichage spécifique partout (badge `🛡️ ADMIN APP`, "Toute l'application")

#### 2. Auto-fill FFF par recherche nom / numéro de club
- Nouveau `searchClubs(q)` : si q numérique → lookup direct `/clubs/{cl_no}.json`,
  sinon cascade text_filter + filtre CLIENT strict pour éviter résultats hors-sujet
- Nouveau `getClubCompetitions(cl_no)` : équipes + engagements DOFA (6 endpoints essayés)
- `parseFFFUrl` gère 2 formats : ancien (`?competition=&group=&scl=`) et NOUVEAU
  (`epreuves.fff.fr/competition/club/{cl_no}-slug/equipe/{annee}_{X}_{cat}_{n}`)
- IMPORTANT : dans le nouveau format, le nombre après l'année (ex `541`) est
  l'identifiant **club-saison**, PAS un competId. Toutes les équipes du même
  club partagent cette valeur.

#### 3. Texte "parents" → "joueurs" auto-détecté pour équipes adultes
- `data-bridge.js` expose `window.CDD_TEAM_HELPERS.activeTeamIsAdult()`
- Heuristique : `U6→U18` = mineurs ; `Sénior / Vét / +35/+40 / 35 ans / Loisir` = adultes
- 5 textes UI adaptés : `screen-home.jsx` bandeau, `screen-results-conv.jsx` bouton/info,
  `screen-effectif-lineup.jsx` carnets, `screen-match-prep.jsx` checklist

#### 4. Matching FFF par cl_no (universel)
- `fff-fetcher.js` : `normalizeRankRow` et `normalizeMatchRow` acceptent un objet
  `{ myTeamName, myClubId }` au lieu d'un simple string
- `data-bridge.js → applyFFFData` passe `myClubId: fffCfg.clubId`
- Résout : "USDF" local ≠ "FERRIERES BRIE USD" côté FFF → matching par `cl_no=500466` universel
- Marche pour TOUS les futurs clubs

#### 5. Cross-team contamination FIXÉE (bug critique)
- `data-bridge.js` : `CDD_NEXT_MATCH` porte désormais un `teamId`
- Le check `prevNext.teamId === activeTeam.id` empêche l'amical d'USDF d'apparaître
  comme prochain match de FCMH U15A
- C'était un bug d'isolation grave

#### 6. Calendrier .ics (📅 Ajouter à mon agenda)
- Nouveau fichier `calendar-export.js` (`window.CDD_CAL`)
- `buildMatchICS(match, info)` : RFC 5545 standard, alarme 2h avant
- `downloadMatchICS(match, info)` : téléchargement multi-plateforme (Apple, Google, Outlook)
- Bouton bleu visible pour TOUS (coach, adjoint, parent, joueur) sur `screen-match-prep.jsx`

#### 7. Bouton "J'ai contrôlé" sur Numéros maillots
- Évite au coach satisfait des numéros saison de devoir bidouiller pour valider la checklist
- Réutilise `CDD_JERSEY.wasReviewed/markReviewed` qui existaient déjà mais n'étaient pas branchés à la checklist
- `hasJerseys = hasOverrides OR wasReviewed`
- Libellé bouton adaptatif : "💾 Enregistrer" si changes, sinon "✓ J'ai contrôlé"

#### 8. Accueil pendant un match en cours
- Tile "Convocations" affiche "⚽ Match en cours" au lieu de "0/14 répondus"
- Tile "Prochain match" devient "Match en cours · Reprendre le live" (clic → écran match)
- Badge hero "J-0 · À VENIR" devient "● MATCH EN COURS" (rouge)
- Bouton CTA hero "PRÉPARER LE MATCH" devient "▶ REPRENDRE LE MATCH"

#### 9. Fix `saveClub` undefined (Firestore reject)
- `firebase-sync.js` : nouveau helper `_stripUndefined` qui parcourt récursivement
  le payload et remplace `undefined` par `null` (Firestore refuse undefined)
- `screen-club.jsx` : fallback `short → name → ''` pour ne plus produire undefined
- `save()` est désormais `async/await` avec **alert d'erreur visible** si le cloud refuse

#### 10. Firestore rules — publication manuelle effectuée
Le user a publié les nouvelles rules dans la console Firebase. Changements :
- `/clubs` create/update size : 20 → **50** (fiche club enrichie avec stadium, contacts, etc.)
- `/coach_profiles` AJOUTÉE (carte de visite coach, lecture publique)
- `/friendly_matches` AJOUTÉE (résout permission denied au pull)

#### 11. Match en cours cross-device (CRITIQUE)
- Nouveau champ `team.liveMatch = { matchId, startedAt, startedBy }` sur le doc team
- Backend `firebase-sync.js` :
  - `setTeamLiveMatch(teamId, matchId)` — push au start du match
  - `clearTeamLiveMatch(teamId)` — clear à la fin
  - `fetchMatch(matchId)` — lit un match individuel (cdd_v2_matches)
- `screen-match-live-v2.jsx` :
  - Push au `_startMatch` (siffle de coup d'envoi)
  - Push au **mount du screen** (rattrapage pour matchs existants)
  - **Push aussi à chaque tick auto-save 10s** (auto-rattrapage si mount loupe)
  - Fallback `teamId` via `getActiveTeam()?.id` si `M.teamId` est undefined
- `firebase-sync.js → pullCloudData` :
  - Scan toutes les équipes pullées
  - Pour chaque team avec `liveMatch.matchId` → `fetchMatch` → reconstruction format local → write `cdd_match_<id>` + `cdd_match_current`
  - Filtre "match abandonné > 6h"
- Logs console explicites : `[liveMatch] scan…`, `[liveMatch] équipes avec match en cours: N`, `[liveMatch] ✓ match en cours pulled du cloud`

#### 12. Texte de la home pendant match
- Tile "Prochain match" / "Convocations" / bouton CTA hero adaptés (déjà décrit point 8)

### Versions cache buster
- `firebase-sync.js` : **v162**
- `data-bridge.js` : **v134**
- `screen-match-live-v2.jsx` : **v127**
- `screen-home.jsx` : **v147**
- `screen-match-prep.jsx` : **v124**
- `screen-club.jsx` : **v145**
- `screen-onb-set.jsx` : **v99**
- `screen-results-conv.jsx` : **v144**
- `screen-effectif-lineup.jsx` : **v118**
- `screen-landing.jsx` : **v153**
- `jersey-numbers-modal.jsx` : **v115**
- `admin-clubs-panel.jsx` : **v155**
- `invite-manager.jsx` : **v154**
- `roles.js` : **v96**
- `fff-fetcher.js` : **v8** (nouvelles fonctions search/getClubCompetitions)
- `calendar-export.js` : **v1** (nouveau fichier)
- `app.jsx` : **v146**

### Restant à valider (next session)

1. **Test cross-device live match en condition réelle**
   - Téléphone : ouvre écran "MATCH LIVE", reste 15s
   - PC : F12 console + Ctrl+Maj+R → doit voir `[liveMatch] ✓`
   - Si pas → debug avec les logs ajoutés

2. **Fonctionnalité demandée par user : notification au démarrage du match**
   - User : "envoyer notification aux joueurs/parents/adjoints au coup d'envoi"
   - Plan Spark Firebase = pas de Cloud Functions
   - Solution possible : Web Push API (limitée mais gratuite) OU live snapshot
     côté autres devices (onSnapshot sur team.liveMatch)
   - À discuter en début de prochaine session

3. **Documenter pourquoi le bouton "PRÉPARER LE MATCH" reste en gros sur l'accueil
   pendant un match en cours** — décision UX prise : redirige vers écran match.
   Mais on peut le retirer si user le veut.

### Bugs résolus mais à re-tester rapidement
- Convocations USDF Parents → Joueurs ✓ doit être OK
- Amical USDF vs Bussy comme prochain match ✓ doit être OK (commit cefc9f1)
- "Dim 12 Oct 02h00" mystère côté USDF : c'est un match FFF saison prochaine
  remonté par DOFA, l'amical doit primer après le fix

---

## 🔐 Session du 25 mai (nuit) — Cycle membership complet

Chantier transverse sur la sécurité d'accès et la gestion des membres.
**9 fixes/features livrés et déployés en production** (Vercel auto-deploy).

### 1. Affichage des membres par équipe (admin)
- Panneau Admin → Clubs & équipes : la liste des compteurs ("2 adjoints · 1 parent")
  est remplacée par **une ligne par personne** avec badge rôle coloré + email
  (+ `displayName` si dispo).
- Fichier : `admin-clubs-panel.jsx`

### 2. Stockage du displayName à la consommation d'invite
- `consumeInvite` lit `localStorage.cdd_coach_name` et le pousse dans la
  membership Firestore via `saveMembership({..., displayName})`.
- Les anciens membres rattachés AVANT ce commit n'ont PAS de `displayName`
  (juste l'email). Les nouveaux rattachements oui.
- Fichier : `firebase-sync.js` (saveMembership + consumeInvite)

### 3. Révocation d'invitation = suppression de membership
- **Bug critique corrigé** : `revokeInvite` ne supprimait QUE le doc invite,
  la membership de la personne déjà consommatrice restait intacte → la
  personne gardait son accès.
- Désormais : si l'invite était consommée par un non-coach,
  `removeTeamMembership(consumedBy, clubId, teamId)` est appelé.
- Le coach principal est **JAMAIS** retiré par révocation (protection).
- Confirm dialog contextuel : affiche l'email du consommateur si présent.
- Fichier : `firebase-sync.js`, `invite-manager.jsx`

### 4. Bouton "↔ Transférer" distinct dans admin
- Remplace le bouton "Changer" générique par "Transférer" (jaune) quand
  il y a déjà un coach, ou "Assigner" (vert) quand il n'y en a pas.
- Fichier : `admin-clubs-panel.jsx`

### 5. Force landing quand membership révoquée (`cdd_access_revoked`)
- **Bug critique corrigé** : un user dont la membership Firestore avait été
  supprimée pouvait toujours voir l'équipe car `arb_current_club` et
  `cdd_active_context` restaient en localStorage.
- Désormais : `pullCloudData` quand `clubIds.length === 0` purge
  `arb_clubs`/`arb_teams`/`arb_current_club`/`cdd_active_context` ET
  pose `localStorage.cdd_access_revoked = 'true'` si l'utilisateur avait
  un club avant (= révocation, vs nouvel user).
- L'event `cdd-data-rebuilt` est dispatché → React re-render → `_forceLanding`
  bascule sur la landing.
- Effacé automatiquement quand pullCloudData trouve une membership OK,
  et au signOut.
- Fichier : `firebase-sync.js` (pullCloudData branch empty + signOutUser), `app.jsx`

### 6. Bandeau "⚠ Accès retiré" sur la landing
- Quand `cdd_access_revoked` est posé, la landing affiche un bandeau orangé
  explicite : email de l'utilisateur, raison probable, instructions pour
  récupérer l'accès (demander un nouveau lien au coach), bouton "Me
  déconnecter et essayer un autre compte".
- Fichier : `screen-landing.jsx`

### 7. Bouton "✕ Révoquer" dans "Membres du club" (coach)
- Le coach principal peut désormais révoquer un membre directement depuis
  Réglages → Membres du club, sans passer par les invitations.
- Affichage enrichi : `displayName` en tête de carte + email en sous-titre,
  badge "TOI" sur sa propre ligne.
- Protections empilées :
  - ❌ Pas de bouton pour admin app / owner / coach / soi-même
  - ✅ Bouton actif pour adjoint, parent, joueur, lecteur (par équipe)
- Confirmation explicite : nom + rôle + équipe + conséquences.
- Fichier : `screen-onb-set.jsx` (ClubMembersPanel)

### 8. Transfert coach principal self-service
- Nouveau bouton "↔ Promouvoir coach" (jaune) sur les lignes Adjoint dans
  "Membres du club", visible UNIQUEMENT si JE suis coach principal de
  l'équipe (vérifié via `myTeamsAsCoach` Set).
- Nouvelle fonction `transferTeamCoach({fromUid, toUid, clubId, teamId, demoteToRole})`
  dans `firebase-sync.js` : transaction atomique via `writeBatch` qui :
  - Rétrograde l'ancien coach en adjoint (ou retire si `demoteToRole = 'none'`)
  - Promeut la cible en coach
  - Recalcule `clubRole` sur les 2 docs
- Pas de changement Firestore rules : `canManageClub` couvre déjà les updates.
- Reload auto post-transfert pour appliquer le nouveau rôle.
- Import ajouté : `writeBatch` depuis `firebase/firestore`.
- Fichier : `firebase-sync.js`, `screen-onb-set.jsx`

### 9. "Quitter ce club" supprime aussi la membership Firestore
- **Bug critique corrigé** : `deleteClubAndData` (roles.js) ne touchait que
  localStorage. Au prochain `pullCloudData`, la membership Firestore intacte
  ré-attachait l'utilisateur → la sortie n'était jamais définitive.
- Nouvelle fonction `cddData.leaveClub(clubId)` : supprime le doc Firestore
  `memberships/{uid}_{clubId}`. Refuse si owner ou coach principal d'≥1 équipe
  (message clair : "transfère d'abord ton rôle").
- `LeaveClubModal.handleQuit` est désormais `async` et appelle `leaveClub`
  AVANT le nettoyage local. En cas d'échec cloud → arrêt, pas de purge.
- Fichier : `firebase-sync.js`, `screen-onb-set.jsx` (LeaveClubModal)

### Bilan : cycle membership désormais étanche

| Action | Cloud | Local | Feedback user |
|---|---|---|---|
| Coach invite | invite créée | — | lien copié |
| Membre rejoint | membership créée + displayName | rattachement cache | accès débloqué |
| Coach révoque un membre | membership supprimée | (au pull suivant) | bandeau landing |
| Membre quitte | membership supprimée (refus si coach) | localStorage purgé | landing |
| Coach transfère son rôle | batch atomique 2 docs | reload | message succès |
| Admin assigne / transfère | membership(s) modifiée(s) | — | reload panneau |

### Versions cache buster atteintes
- `firebase-sync.js` : v159
- `app.jsx` : v146
- `app.html` : (modifié à chaque push)
- `screen-onb-set.jsx` : v98
- `screen-landing.jsx` : v153
- `admin-clubs-panel.jsx` : v151
- `invite-manager.jsx` : v154

### À tester en conditions réelles (next session)
Plan de test détaillé fourni dans l'échange. 6 scénarios :
1. Révocation d'invite utilisée → bandeau côté révoqué
2. Bouton Révoquer dans Membres du club → bandeau côté révoqué
3. Protections UI (pas de bouton sur soi/admin/coach/owner)
4. Re-invitation après révocation → flag effacé, retour normal
5. Nouvel utilisateur (jamais rattaché) → PAS de bandeau
6. Persistance après fermeture/reouverture onglet

---

## 🆕 Demandes Florian du 25 mai (à traiter EN PRIORITÉ — session suivante)

### 1. Classement général saison (vote agrégé)
Pouvoir agréger les votes de TOUS les matchs joués pour avoir un MVP saison,
un top 5 joueurs, des moyennes. Aujourd'hui : un vote par match isolé, pas
de cumul. **Nécessite :**
- Nouvelle vue « Classement vote saison » (ou onglet dans la page Vote)
- Fetch de tous les docs `votes/{matchId}` du club via Firestore
- Agrégation côté client : moyenne pondérée par joueur sur N matchs
- Tri par OVR vote moyen, par nb MOTM, par nb d'étoiles

### 2. Pondération des votes par rôle
Un coach principal devrait peser plus qu'un parent dans la note finale.
**Schéma proposé :**
- Coach principal / owner / admin : poids ×3
- Coach adjoint : poids ×2
- Parent / joueur / lecteur : poids ×1
**Implémentation :**
- `sendVote` ajoute `voterRole` au doc Firestore (depuis `CDD_ROLES.effectiveRole()`)
- Agrégation pondérée : `Σ(note × poids) / Σ(poids)` au lieu de moyenne simple
- Afficher le poids dans la synthèse pour transparence

### 3. Automatisation FFF pour nouveaux clubs
Aujourd'hui les 4 IDs FFF (`clubId`, `competId`, `phase`, `group`) sont
hardcodés dans seed-real-data.json. Pour qu'un nouveau coach puisse créer
son équipe et avoir les stats championnat auto-remplies, il faut :
- UI de recherche FFF : tape le nom du club → liste des compétitions
- Au clic → auto-fill des 4 IDs dans `team.fffConfig`
- Trigger fetch immédiat post-création

---

## ⚡ Priorité absolue pour la PROCHAINE session

### 🗳️ CHANTIER EN BACKLOG — Refonte vote post-match (parité avec V1)

**Demande Florian (27 mai)** : la V1 avait un système de vote post-match
"très bien pensé" qu'il aimerait porter en V2. La V2 actuelle a un vote
ultra basique (étoiles 1-5, MVP = max notes, pas de live, pas de partage).

**Comparaison V1 ↔ V2** (audit complet réalisé) :

| Capacité V1 | État V2 |
|---|---|
| Étoiles 0-10 demi-points | ❌ V2 = 1-5 entières |
| Vote MOTM explicite (bouton ★ dédié) | ❌ V2 = déduit max notes |
| Statut "NS / Pas vu jouer" (skip) | ❌ V2 = forcé de tout noter |
| 10 critères détaillés (engagement, technique...) + variante GK | ❌ Manquant |
| Synthèse live (🔴 onSnapshot pendant vote) | 🟠 `watchVotes` existe mais jamais branché |
| Récap collectif post-vote (MOTM élu, top 3) | 🟠 V2 = MVP perso seulement |
| Page Résultats + Équipe-type 4-3-3 | ❌ Manquant |
| Activation coach explicite + fenêtre 48h auto | ❌ Manquant |
| URL partageable `?vote=matchId` + QR + WhatsApp | ❌ Manquant |
| Anti-fraude Google sign-in (1 compte = 1 vote) | ❌ V2 = UUID local (vider cookies = revoter) |
| Stats saison (MOTM cumulés, moyennes) | ❌ Manquant |
| Vue terrain / vue liste togglable | ❌ V2 = liste seule |
| Onglets équipes (vote pour les 2 équipes) | ❌ Manquant |
| Application vote → stats OVR joueur | ✅ V2-only (innovation V2) |

**Plan d'attaque proposé (3 vagues, à exécuter sur plusieurs sessions)** :

- **Vague V1 — Quick wins (3-4 jours)** :
  1. Échelle 0-10 demi-points (refactor boutons étoiles ScreenVote l. 1290+)
  2. Vote MOTM explicite (bouton dédié, choix unique)
  3. Statut "Pas vu / NS" (lève le blocage `allRated` l. 1156)
  4. Brancher `watchVotes` dans ScreenVote → synthèse live
  5. Activation coach : modèle `voteOpen` + `voteClosesAt` 48h + bouton "Activer les votes"

- **Vague V2 — Parité V1 (5-7 jours)** :
  6. URL partageable `?vote=matchId` + QR + page publique standalone
  7. Récap collectif post-vote (vrai MOTM élu, top 3, nb votants)
  8. Page Résultats post-clôture avec Équipe-type 4-3-3
  9. Cartes joueurs enrichies (minutes, passes, cartons en plus des buts)
  10. Anti-fraude Phase D : auth Firebase pour membres, Google sign-in pour public

- **Vague V3 — Premium (optionnel)** :
  11. 10 critères détaillés + variante GK (en bottom sheet)
  12. Vue terrain togglable
  13. Onglets équipes (vote pour adversaire aussi)
  14. Stats saison agrégées (MOTM cumulés, moyenne saisonnière)

**Risques** :
- Limite Firestore 1MB/doc → migrer vers sous-collection `votes/{matchId}/voters/{uid}` quand on ajoute critères.
- `firestore.rules` à étendre : write autorisé seulement si `voteOpen===true && now < voteClosesAt` et `request.auth.uid === voterId`.
- Cohérence parent : ne pas surcharger — présenter le vote comme notification post-match unique, pas onglet permanent.

**Pointeurs fichiers** :
- V1 référence : `index.html` lignes 6595-9370 (composant complet)
- V2 composant : `Version/V2/screen-prep-arb-lec-vote.jsx` lignes 1130-1319
- V2 backend : `Version/V2/firebase-sync.js` lignes 160-193

---

### 🆕 GROS CHANTIER EN BACKLOG — Multi-formats (foot 5/8/11) + multi-équipes par groupe

**Demande Florian (26 mai, fin de session)** : faire évoluer l'app pour
gérer aussi le foot à 5 et le foot à 8, avec un coach principal qui
répartit un groupe global de 20-30 joueurs sur plusieurs équipes A/B/C/D
(typique foot des jeunes U7/U9/U11). Conserver le fonctionnement actuel
foot à 11 mono-équipe (FCMH U15) intact.

**Plan d'attaque proposé (validé, à exécuter sur plusieurs sessions)** :

- **Phase M1 — Format de jeu par équipe** : ajout d'un champ
  `team.format = 'f5'|'f8'|'f11'`. Remplacer `BENCH_MAX = 5` en dur
  partout par helper `getBenchMax(teamId)`. Adapter match-engine
  (nombre titulaires). Ajouter formations 1-2-1, 2-1-1, 2-3-2, 3-2-2.
  Migration : équipes existantes → `f11` par défaut. **Aucune UI
  nouvelle.** Risque bas, valide l'approche.

- **Phase M2 — Adaptation visuelle terrain & UI** : SVG terrain adapté
  selon format, page Compo grid variable, Convocations compteurs
  adaptés, sélecteur formation filtré par format.

- **Phase M3 — Concept de GROUPE** : nouvelle collection Firestore
  `groups` (clubId, category, season, playerIds[], responsibleCoachId).
  Page "Mon groupe U9", création de teams rattachées au même group,
  affectation joueur→team avec anti-doublon par créneau, rotation
  agrégée par groupe.

- **Phase M4 — PLATEAU (événement multi-matchs)** : nouvelle collection
  `plateaus`. Création d'un plateau (date, lieu, plusieurs matchs en
  parallèle, chacun avec son terrain/horaire/adversaire/coach adjoint).
  Convocations groupées : 1 envoi parent avec équipe/horaire/terrain/
  coach assignés.

- **Phase M5 — Vue Responsable de groupe** : tableau de bord coach
  principal. Drag&drop pour répartir joueurs entre teams du groupe.
  Alertes doublons/non-affectés/absents. Équilibrage assisté
  (niveau/poste/rotation).

- **Phase M6 — Vue Coach adjoint scoped** : un adjoint sur une team ne
  voit QUE cette team. Bandeau "Tu coaches l'Équipe B aujourd'hui".

**Modèle de données proposé (extensions, tout optionnel = défaut
comportement actuel)** :

```js
// EXTENSION team
team.format       = 'f5' | 'f8' | 'f11'  // défaut 'f11'
team.starterCount = 5 | 8 | 11           // dérivé
team.benchMax     = 3 | 4 | 5            // configurable
team.groupId      = null | 'grp_xxx'     // si multi-équipes

// NOUVEAU group (optionnel)
group = { id, clubId, category, season, name, format,
          playerIds[], responsibleCoachId }

// NOUVEAU plateau
plateau = { id, groupId, date, venue, name, matchIds[] }

// EXTENSION match
match.plateauId         = null | 'pla_xxx'
match.assistantCoachId  = null | uid
match.terrain           = 'Terrain 1' (libre)
```

**Risques principaux** :
- `BENCH_MAX = 5` en dur dans ~12 fichiers → traque systématique en M1.
- `cdd_match_lineup` modèle slot→pid avec 11 slots fixes → migration auto en M2.
- UX risque de complexification pour les coachs simples foot à 11 →
  si `team.format === 'f11'` ET pas de `groupId` → UI strictement
  identique à aujourd'hui (les nouveautés cachées).
- Tests à chaque phase : compte FCMH U15 doit continuer à fonctionner
  comme avant.

**Stratégie de migration** : un coach FCMH U15 qui se connecte demain
ne doit voir AUCUN changement tant qu'il ne crée pas explicitement un
groupe ou un plateau. Feature flag implicite par présence des nouveaux
champs.

---

### Sujets ouverts plus petits (peuvent passer avant M1)

1. **Test E2E parent en prod** — toujours pas fait. Tester avec
   `luckyzedoggy@gmail.com` (lié à Léonis CLARISSE) :
   - La réponse présence (JE VIENS) arrive bien chez le coach FCMH.
   - Les logs `[lecteur] sendResponse →` et `[convocs] watching matchId=`
     donnent le MÊME `matchId` côté parent et côté coach.
   - **Tester aussi le LIVE v116** : ouvrir le compte coach, lancer
     un match, taper un BUT → vérifier que le compte parent (page
     Lecteur) voit le bandeau "EN DIRECT" avec le score à jour.

2. **Couverture des autres écrans coach (défense en profondeur)** :
   `tactique` a un guard (v95), mais `tv`, `tv-match`, `prep`, `share`,
   `sync`, `transfert`, `arb`, `fiche-match`, `convoP`, `carnet` n'ont
   PAS de guard interne. Le menu ⋯ les filtre (v102) et la bottom nav
   est adaptée (v104), mais une URL directe ou un `go(id)` ailleurs
   les rendrait.

3. **Améliorations LIVE post-v116** :
   - Afficher la minute live + timeline des événements sur le bandeau
     parent (actuellement juste le score)
   - Bandeau aussi sur l'Accueil parent (pas seulement Lecteur)
   - Notifications push natives si score change ?

4. **Filtrage Effectif pour parent** : composant `<ChildOnlyView>` qui
   filtre via `getChildOfParent(teamId)`. À arbitrer : utile ou pas ?
   L'effectif complet a aussi du sens pour un parent (savoir qui sont
   les copains de son enfant).

---

## 1. État au 26 mai 2026 — où on en est

### ✅ Livré dans la session du 26 mai (suite, commits v105 → v116)

Suite immédiate de la session UX parent — bascule progressive vers la
**UX coach/adjoint** + amorce du **mode LIVE**.

**v105** — `HANDOFF.md` updated (doc only, pas de bump cache buster).

**v106** (commit `81d1842`) — Chip statut famille uniquement
(`screen-match-fiche.jsx`) :
- Helper `_myLinkedPlayer` via `getChildOfParent()`.
- Statut "🩹 Blessé / ⛔ Suspendu" : coach voit bouton ✎ éditable,
  parent du joueur concerné (ou joueur lui-même) voit en lecture,
  autres parents → masqué (donnée médicale privée à la famille).
- N° licence FFF : visible pour tous (décision Florian).

**v107** (commit `b9134a7`) — Heure de coup d'envoi prioritaire
(`screen-match-prep.jsx`, `screen-results-conv.jsx`) :
- L'affichage utilise `CDD_MATCH_INFO.kickoff` en priorité sur
  `next.time` (l'heure d'origine FFF/amical).
- Bug : modifier l'heure dans "Infos du match" sauvait `kickoff`
  mais l'écran continuait à lire `next.time` → affichage figé.

**v108** (commit `851ef52`) — Page Prépa Match : 3 fixes
(`screen-prep-arb-lec-vote.jsx`) :
- Convention recevant à gauche (swap selon `next.venue === 'Domicile'`).
- **Plus de fallback adversaire trompeur** : retrait du `standings.find(s => !s.me)`
  qui prenait "le premier autre" du championnat quand l'adversaire
  n'était pas trouvé (cas amical contre Ferrières → affichait V.F.F.A 77).
  Maintenant si amical OU adversaire hors championnat → pas de section stats.
- **Plus de placeholder "22/09 défaite 1-2"** : le `allerMatch` était
  hardcodé en dur ligne 29 depuis le proto. Remplacé par recherche
  réelle dans `CDD_LAST_MATCHES`. Si pas trouvé → carte masquée.

**v109** (commit `566c161`) — Diag addPlayer (`screen-results-conv.jsx`) :
- Logs `[convocs] addPlayer →` + `[convocs] addPlayer résultat :`
  pour diagnostiquer le bug "Banc 4/5 + impossible d'ajouter" remonté
  par Florian. Aussi : feedback explicite si addToConvoc retourne false.

**v110** (commit `349e5e6`) — Match Live pré-remplissage + convention
(`screen-match-live-v2.jsx`) :
- `PreMatchSetup` : `oppName` auto-pré-rempli depuis
  `CDD_NEXT_MATCH.opponentName`, `matchType` auto-sélectionné selon
  `next.isAmical` / `fffMatchId`. Plus de "Adversaire" en dur.
- **Scoreboard FIFA** : convention recevant à gauche via swap
  `isAtHome ? teamA : teamB`. Le score `sA/sB` reste lié à l'équipe
  (logique métier), seules les positions visuelles swappent.

**v111** (commit `5bcbb24`) — RESPECT DU CHOIX COACH (data-bridge.js +
`screen-results-conv.jsx`) :
- **Cause racine identifiée et fixée** : `data-bridge.js` lignes 819-843
  avait un `while (starters.length < 11)` qui auto-complétait les
  titulaires depuis le banc puis la réserve. → Quand Florian retirait
  un titulaire, un joueur du banc était auto-promu → effet domino
  jusqu'à "Banc 5/5 figé impossible à modifier". Désactivé si
  `cdd_match_lineup` existe (= coach a posé sa convoc, on respecte).
- **Bouton ✓ "Marquer présent" côté coach** : à côté du 💬 WhatsApp,
  permet au coach de valider la présence sans réponse parent (cas
  texto / oral / parent sans app). Écrit dans Firestore comme une
  réponse parent normale avec label "(saisi par coach)".

**v112** (commit `441616e`) — Modale "Remplacer" (data-bridge.js +
`screen-results-conv.jsx`) :
- Nouvelle fonction `CDD_CONVOC.swapPlayers(teamId, outPid, inPid)`
  qui swap explicitement 2 joueurs (4 cas : titulaire↔remplaçant,
  titulaire↔réserve, remplaçant↔réserve, remplaçant↔titulaire).
- Boutons − sur titulaires/remplaçants remplacés par **boutons ↔**
  qui ouvrent une **modale "REMPLACER X par..."** avec la liste des
  candidats (banc pour titulaire, réserve pour remplaçant).
- Bouton "Retirer sans remplacer" dans la modale pour le cas où on
  veut juste retirer (= comportement removePlayer d'avant).

**v113** (commit `b56383e`) — Match Live : boutons swap + vérification
numéros (`screen-match-live-v2.jsx`) :
- **`ActionsMatrix`** : prend désormais `isAtHome`. Swap visuel des
  colonnes BUT/JAUNE/CHANGE pour aligner avec le scoreboard. Le `side`
  passé aux handlers reste 'A'/'B' (logique métier inchangée), seules
  les positions visuelles changent.
- **Nouvelle étape "PRÉ-MATCH · VÉRIFICATION"** entre `PreMatchSetup`
  et le démarrage du chrono. Composant `PreMatchJerseyCheck` affiche
  la compo avec numéros + bouton "Modifier les numéros" + boutons
  "← Retour réglages" et "▶ COUP D'ENVOI". Plus de chrono qui démarre
  automatiquement.

**v114** (commit `f2d9f91`) — Jersey sync + détection doublons
(`screen-match-live-v2.jsx`, `jersey-numbers-modal.jsx`) :
- `PreMatchJerseyCheck` lit désormais `CDD_CONVO` + `CDD_JERSEY.ofPlayer()`
  au lieu de `M.tA.p` (snapshot statique figé). Listeners sur
  `cdd-jersey-changed` + `cdd-data-rebuilt` → re-render auto.
- Détection doublons sur l'écran de vérification : bandeau rouge
  "⚠️ Au moins 2 joueurs portent le même numéro" + ligne en rouge
  avec badge "⚠ DOUBLON".
- `JerseyNumbersModal` : changement OK passe en **vert** (au lieu
  d'orange) — vert = "ça marche", rouge = "doublon".

**v115** (commit `eff1822`) — Verrouillage écrans pré-match si live en cours
(`screen-results-conv.jsx`, `screen-effectif-lineup.jsx`,
`screen-match-prep.jsx`) :
- Helper `_matchInProgress = !!MATCH_HELPERS.getLiveMatch()`.
- `canEdit = baseCanEdit && !_matchInProgress` → désactive tous les
  boutons d'édition pendant le live.
- Bandeau orange "🔒 Match en cours" en tête de chaque écran pré-match
  avec bouton "▶ Aller au match" qui redirige vers `screen-match`.

**v116** (commit `bc17045`) — MODE LIVE (`screen-match-live-v2.jsx`,
`screen-prep-arb-lec-vote.jsx`) :
- **Push cloud automatique** pendant le match : helper `_pushLive(M)`
  appelle `cddSync.saveMatchToCloud(M)` fire-and-forget à chaque
  rerender + dans le tick auto-save 10s. Couvre toutes les actions
  coach (BUT, JAUNE, ROUGE, CHANGE) + l'avancée du chrono.
- **Bandeau LIVE sur la page Lecteur** : `watchMatchFromCloud(matchId)`
  côté parent/lecteur/joueur. Si status === 'live' ou 'paused' →
  affiche bandeau rouge "EN DIRECT" avec score temps réel (convention
  recevant à gauche), point pulsant, compteur d'événements. Bandeau
  jaune "PAUSE · MI-TEMPS" si paused. Disparaît à 'finished'.
- **Infrastructure préexistante** : `saveMatchToCloud` /
  `watchMatchFromCloud` existaient déjà dans `firebase-sync.js`
  (collection `cdd_v2_matches`), juste pas branchés en auto.

**v117** (commit `1ca79ba`) — Effectif parent + signal indispo
(`screen-effectif-lineup.jsx`, `screen-match-fiche.jsx`) :
- **Page Effectif** : `ScreenEffectif` reçoit son propre `canEdit` (capacité
  `effectif`). Bandeau "X/N carnets envoyés aux parents" masqué pour non-coach
  (outil de pilotage diffusion). Badge "🎴 ENVOYÉ" sur les cartes joueur
  (vue grid + vue list) masqué pour parent/lecteur/joueur.
- **Fiche joueur — nouvelle modale `ParentSignalModal`** : sur la fiche
  de son enfant, le parent voit le chip statut **cliquable** (au lieu de
  juste lecture en v106). Au clic → modale épurée avec 3 options
  (Disponible / Blessé / Indisponible), date de retour optionnelle et
  note libre. PAS d'option "Suspendu" (réservé staff). Sauvegarde via
  `CDD_COACH.setStatusOverride` + `setStatusMeta` avec flag
  `source: 'parent'` pour audit coach. Sync Firestore automatique.

**v118** (commit `b02bbd9`) — Fix calendrier + LIVE cliquable
(`screen-prep-arb-lec-vote.jsx`) :
- **Bug "? vs FCMH" résolu** : sur l'onglet CALENDRIER, le titre du
  prochain match affichait "?" car le code v100 attendait le format
  `CDD_NEXT_MATCH` (`opponentName`, `venue:'Domicile'`) mais la source
  réelle (`CDD_MATCH_SWITCHER.listUpcoming`) renvoie `opponent`,
  `venue:'H'/'E'`, `kind:'amical'`. Helpers `_isHomeOf(m)` et `_oppOf(m)`
  qui acceptent les 2 formats. Appliqués à `fmtVs`, `venueLabel`,
  `venueColor`, badge AMICAL (prochain + suivants).
- **Bandeau LIVE cliquable** : ajout d'un bouton CTA "▶ SUIVRE LE MATCH
  EN DÉTAIL →" sous le score qui fait `go('match')`. La page ScreenMatch
  V2 est déjà gérée en lecture seule pour non-coach (`canEdit` retourne
  false → scoreboard + timeline visibles, boutons d'action cachés).

**v119** (commit `bd23999`) — Post-match cleanup (côté coach + parent)
(`friendly-matches.js`, `match-switcher.js`, `data-bridge.js`,
`screen-match-live-v2.jsx`, `screen-prep-arb-lec-vote.jsx`) :
- **Bug remonté Florian** : un amical joué dans la journée continuait à
  apparaître "J-0 · À VENIR · 15 parents pas encore répondu" partout.
- `CDD_FRIENDLY.list()` filtre par défaut les `endedAt` + nouvelle fonction
  `markEnded(teamId, matchId)`.
- `match-switcher.listUpcoming()` exclut `cdd_match_last_finished`.
- `hasExplicitChoice()` retourne false si le choix pointe sur un match
  qui n'est plus dans la liste (= terminé).
- `data-bridge.js` FFF : filtre `upcoming` pour exclure `last_finished`.
- `endMatch` : `markEnded` l'amical + `CDD_REBUILD` + push cloud final.
- Watcher cloud côté parent : si snapshot `status='finished'` → pose
  `cdd_match_last_finished` localement → bascule auto via REBUILD.

**v120** (commit `02aec8a`) — Capture `scheduledMatchId` au lancement
(`screen-match-live-v2.jsx`) :
- **Bug v119 incomplet** : `M.id` créé par newMatch (`'m_'+timestamp`) ≠
  `CDD_NEXT_MATCH.id` (= id de l'amical `fr_xxx` ou FFF). Du coup le
  filtre cdd_match_last_finished cherchait le bon id mais on stockait
  le mauvais → match toujours affiché.
- Capture `M.scheduledMatchId = CDD_NEXT_MATCH.id` au moment de la
  création du M (newMatch).

**v121** (commit `d384bdf`) — Re-capture à startMatch + bouton
"✓ Marquer comme joué" (`screen-match-live-v2.jsx`, `screen-match-prep.jsx`) :
- **Bug v120 incomplet** : si M était repris depuis localStorage
  (`cdd_match_current` valide), le bloc `if (!Mref.current)` ne tournait
  pas → scheduledMatchId jamais posé.
- Capture systématique dans `startMatch` (à chaque clic LANCER).
- Fallback dans `endMatch` : si scheduledMatchId absent → relit
  `CDD_NEXT_MATCH.id` au moment de la fin (généralement encore le bon).
- **Bouton "✓ Marquer comme joué"** sur Prépa Match à côté de
  "✎ Éditer le match amical" : permet de retirer un match de "à venir"
  sans avoir à le re-jouer (cas annulé, joué sans l'app, fictif de test).

**v122** (commit `93c6084`) — Vrai bascule noUpcoming + écrans propres
(`data-bridge.js`, `screen-home.jsx`, `screen-results-conv.jsx`,
`screen-prep-arb-lec-vote.jsx`) :
- **Cause racine** : data-bridge ligne 610 `hasRealNext` préservait
  `prevNext` même quand c'était le match terminé (car son adversaire
  n'était pas littéralement 'À déterminer'). Du coup `noUpcoming`
  restait à false → tous les écrans continuaient à afficher l'ancien match.
- Fix : ajout `&& (!lastFinishedId || prevNext.id !== lastFinishedId)`.
- **Accueil** : hero adapté `noUpcoming` (badge "PAS DE MATCH PROGRAMMÉ"
  + emoji 📅 + message + CTA "🤝 CRÉER UN MATCH AMICAL" coach). Tiles
  "Prépa match" et "Convocations" → message "Aucun match à venir" /
  "En attente du prochain match".
- **Convocations** hero : "Aucun match programmé" + "Le coach annoncera
  le prochain" au lieu de "FCMH vs À déterminer".
- **Lecteur onglet Prochain** : message "Aucun match annoncé" + "Tu
  seras notifié dès qu'une convocation arrive."

**Bilan v119 → v122** : 4 commits, post-match enfin propre. Le cycle
complet (créer match → préparer → jouer → finir → bascule sur le suivant)
fonctionne sans laisser de fantôme. Le match terminé reste accessible via
`cdd_match_${id}` et `cdd_v2_matches/${id}` (page Vote, feuille de match).

**Bilan v105 → v122** : 18 commits sur cette grosse session (~26h).

---

### ✅ Livré dans la session du 26 mai (UX parent, commits v95 → v104)

**Vague de nettoyage UX parent en 10 commits**. Compte de test :
`luckyzedoggy@gmail.com` (parent de Léonis CLARISSE dans FCMH U15 A).

**v95** — Nettoyage de base (commit `0294a25`) :
- `screen-tactique.jsx` : guard `_canAccess` via `canDo('compo')` →
  page 🔒 "réservée aux coachs" pour parent/lecteur/joueur.
- `screen-onb-set.jsx` : InviteManager masqué (`myInvitable.length > 0
  && isCoach`).
- `screen-results-conv.jsx` : stat "Absents", section ABSENTS et section
  "DISPONIBLES NON CONVOQUÉS" wrappées `{canEdit && ...}`.
- `screen-effectif-lineup.jsx` : boutons TACTIQUE/VISUEL COMPO et section
  Réserve cachés. CTA "PRÉPARER LE MATCH" remplacé par "👁 VOIR LA
  CONVOCATION" pour parent.
- `screen-prep-arb-lec-vote.jsx` : convention recevant à gauche (Ferrières
  vs FCMH quand à l'extérieur), onglet EFFECTIF sans "Reste de l'effectif",
  onglet CALENDRIER → matchs à venir via `CDD_MATCH_SWITCHER.listUpcoming()`.
- `roles.js` : ajout `getChildOfParent(teamId)` exposé sur `window.CDD_ROLES`.

**v96** — Convention recevant à gauche sur l'Accueil (commit `8c26d5b`) :
- `screen-home.jsx` : hero match swap dynamique `isHome ? me/opp :
  opp/me`. Classes CSS `hero-club-home`/`hero-club-away` paramétrées par
  POSITION (gauche/droite), pas par statut domicile/extérieur.

**v97** — Auto-sélection enfant sur Lecteur (commit `3e6a901`) :
- `screen-prep-arb-lec-vote.jsx` : priorité de sélection :
  1. URL `?p=XXX` (lien magique)
  2. `getChildOfParent()` (enfant lié au compte)
  3. Recherche manuelle (fallback lecteur tiers).
- Parent connecté → sa fiche s'ouvre directement sans recherche.

**v98** — Masquage WhatsApp relance (commit `13e6e67`) :
- `screen-results-conv.jsx` : `respCell` retourne `null` si `!canEdit`,
  donc plus de bouton 💬 ? à côté des joueurs non-respondants pour parent.

**v99** — Bouton Modifier après validation (commit `0b3e9d5`) :
- `screen-prep-arb-lec-vote.jsx` : state `editing`. Quand `resp && !editing`,
  affiche résumé "✓ Réponse envoyée : présent" + bouton "✎ Modifier"
  au lieu des 3 boutons JE VIENS/Absent/?. Reset `editing=false` au
  changement de joueur/match et après chaque envoi.

**v100** — Carte enrichie prochain match dans calendrier Lecteur
(commit `0387959`) :
- `screen-prep-arb-lec-vote.jsx` onglet CALENDRIER : premier match
  affiché en carte mise en avant (badges PROCHAIN MATCH / J-X / AMICAL,
  grille date/lieu/coup d'envoi/RDV + 🏟️ stade via `CDD_MATCH_INFO`).
  Matchs suivants → sous-titre "À suivre · N" + lignes compactes.
  Convention recevant à gauche aussi appliquée ici.

**v101** — Nettoyage UX fiche joueur (commit `c757e2b`) :
- `screen-match-fiche.jsx` :
  - `<CarnetActions>` (preview + WhatsApp + lien magique) → wrap canEdit.
  - `<ConvocPersoActions>` (lien ciblé + push Firestore) → wrap canEdit.
  - Onglet "Observations" retiré de la barre pour non-coach + protection
    `tab === "obs" && canEdit`.
  - Section CONTACT du ProfilTab (téléphones/email parent) → wrap canEdit
    pour éviter fuite contacts entre familles.
  - FORME / CONDITION (appréciations subjectives coach) → wrap canEdit.
    Les KPI factuels (mins, buts, passes, MVP, cartons) restent visibles.
  - Label "NOTATION COACH" → "ATTRIBUTS" pour non-coach.

**v102** — Filtrage menu ⋯ par capacité (commit `0106094`) :
- `app.jsx` : nouveau champ optionnel `cap` sur chaque entrée NAV. Si
  `cap: 'compo'`, l'item nécessite `canDo('compo')` pour être visible.
- Helper `_navAllowed(item)` : si pas de cap → visible, sinon check via
  `window.CDD_ROLES.canDo()`.
- Items gatés : `prep`, `match`, `fiche-match`, `arb`, `convoP`, `share`,
  `transfert`, `sync`, `tv`, `tactique`, `carnet`. Reste visible à
  tous : `home`, `effectif`, `lineup`, `convocations`, `results`,
  `fiche`, `vote`, `lecteur`, `set`, `onb`.

**v103** — Traçabilité sync présence + garde-fou (commit `7a67a34`) :
- `screen-prep-arb-lec-vote.jsx sendResponse` : refus si `matchId` est
  `'demo'`/`'demo_default'`/vide (= aucun match courant détecté) avec
  message "Aucun match en cours détecté — recharge la page". Console
  log `[lecteur] sendResponse → {matchId, playerId, firestorePath}`.
- `screen-results-conv.jsx watchConvocResponses` : console log
  `[convocs] watching matchId=XXX` + `[convocs] snapshot reçu : N
  réponse(s)`. Permet à Florian de comparer les matchIds parent/coach
  via chrome://inspect mobile.

**v104** — Bottom nav adaptative (commit `9eece17`) :
- `app.jsx` bottom-nav : si l'item est `lineup` et que l'user n'a pas
  `canDo('compo')`, remplace par `{id:'lecteur', label:'Ma convoc'}`.
  Le parent voit donc ⌂ Accueil · ◧ Effectif · ◉ **Ma convoc** ·
  ☷ Convocs · ♛ Champ.

**Bilan parent post-v104** :
- Hero accueil : convention respectée, CTA "VOIR MA CONVOCATION".
- Bottom nav adaptée → accès direct à la page Lecteur.
- Page Lecteur : auto-sélect enfant, calendrier enrichi, bouton Modifier.
- Fiche joueur : outils coach masqués, contacts privés masqués.
- Convocations : pas d'ABSENTS/RÉSERVE, pas de bouton WhatsApp.
- Compo : pas de TACTIQUE/VISUEL COMPO, pas de Réserve.
- Tactique : 🔒 page réservée aux coachs.
- Menu ⋯ : 12 écrans coach masqués.
- Réglages : pas d'InviteManager.

---

### ✅ Livré dans la session du 25 mai nuit (commits post-v82)

**Page Club complète** (commit 0feda67) :
- Nouveau `screen-club.jsx` (`window.ScreenClub`) : hero, sections Stade,
  Contacts (tel/email cliquables), Fédération/district, Réseaux sociaux.
- Édition gated par `canDo('club')`. Push cloud via `saveClub` (collection
  `clubs` existante, pas de nouvelle règle nécessaire).
- `match-info-modal` pré-remplit le stade du club si match à domicile.
- Tile **🏢 Mon club** sur l'Accueil.

**Page Coach partageable** (commit d95da7b) :
- Module `coach-profile.js` (`window.CDD_COACH_PROFILE`) : storage par uid,
  helpers, compression photo 400px JPEG.
- `screen-coach-profile.jsx` : view/edit + mode public lecture seule.
- Collection Firestore `coach_profiles/{uid}` (lecture publique, write
  self-only). `firestore.rules` à jour, publiées.
- Lien public `?coach=UID` → page de visite sans login.
- Miroir `cdd_user_uid` au sign-in dans firebase-sync.js.
- Tile **🪪 Ma carte coach** sur l'Accueil.

**QR codes** (commit 71bcb73) :
- Modale réutilisable `qr-share-modal.jsx` (`window.QRShareModal`) :
  QR 220px + URL + 3 boutons (Copier / Partager natif / **Imprimer**
  qui ouvre une fenêtre standalone avec QR 280px prête à imprimer).
- Bouton 📱 sur chaque ligne d'invitation en attente (`invite-manager`).
- Bouton 📱 QR Code sur `screen-coach-profile`.
- Cas d'usage : vestiaire, réunion parents, affiche club imprimée.

**Onboarding émotionnel** (commit 2ae10c8) :
- `screen-emo-onb.jsx` (`window.ScreenEmoOnb`) : parcours en 5 écrans
  plein écran, ton complice 'côté banc'.
  · Hook 'Salut coach. Tu te lèves le dimanche à 7h…'
  · Reconnaissance : checklist interactive des galères
  · Promesse : 4 cartes bénéfices
  · Engagement : 'Pourquoi tu coaches ?' multi-select
  · Conclusion + 3 CTA (Coach / Lien / Reconnexion)
- Déclenché AU PREMIER CONTACT (pas connecté + pas de token + pas fait).
- Storage `cdd_emo_onb_done` + `cdd_emo_onb_data` (pains, motiv pour
  personnalisation future).
- Bouton 'Passer →' toujours dispo en haut.

**Sélecteur multi-matchs FFF + amicaux** (commit 8cac784) :
- Module `match-switcher.js` (`window.CDD_MATCH_SWITCHER`) :
  · `listUpcoming(teamId)` combine FFF + amicaux en format unifié
  · `getActive/setActive/hasExplicitChoice`
  · Storage `cdd_active_match_{teamId}`.
- `data-bridge.js` expose `window.CDD_FFF_UPCOMING` + détecte choix
  explicite → override `CDD_NEXT_MATCH` priorité 0.
- `screen-match-prep.jsx` : rangée tuiles horizontales 'Quel match
  préparer ?' (visible si >1 match upcoming) avec badges colorés
  🏆 Champ. (vert) vs 🤝 Amical (violet).

**Refactor Convocations — 1 seul CTA dynamique** (commit f4a0563 + fix d67fbec) :
- Suppression des 7 boutons hero (Partager, Compo, Vestiaire, +Amical,
  Infos, Numéros, Lancer) — surcharge cognitive.
- 1 CTA primaire qui change selon l'état :
  · Pas de match → 🤝 CRÉER UN MATCH AMICAL
  · 0 réponse → ↗ ENVOYER LA CONVOCATION
  · Partagé partiel → 📣 RELANCER LES N PARENTS RESTANTS
  · 100% répondu → 🏁 LANCER LE MATCH (N confirmés)
- Bug noUpcoming non défini → fix calcul inline depuis next.
- Autres actions (compo, vestiaire, numéros, infos) accessibles via
  match-prep (le hub).

**Bugs UX flow création match** (commit b7779d1) :
- Avertissement 'Infos du match manquantes' ne s'affiche plus quand pas
  de match programmé (placeholder).
- `match-info-modal` pré-remplit l'adversaire depuis CDD_NEXT_MATCH
  (next.away si domicile, next.home si extérieur) + coup d'envoi depuis
  next.time. Plus de re-saisie.

**Mini-vue terrain dans Convocations** (commit b0765d1) :
- Bloc terrain SVG en lecture seule dans Convocations entre le CTA et
  la carte infos match. Joueurs aux positions de la formation avec
  photos rondes + badges numéros (avec matchNum override si défini).
- Header source : '🎯 Compo du match' orange si cdd_match_lineup,
  '🗓️ Compo type' vert sinon.
- Bouton ✎ Modifier → match-lineup (éditeur drag&drop complet).
- Affiché seulement si vrai match programmé.

**Filtrage Accueil par rôle** (commit a56e561) :
- `screen-home.jsx` lit `CDD_ROLES.effectiveRole()` et filtre les tiles :
  · Coach/Owner/Adjoint/Admin → tout
  · Parent/Joueur → tile **📋 Ma convocation** (→ lecteur), Vote, Mon
    club, Championnat, Réglages
  · Lecteur → Championnat + Page lecteur + Réglages
- Tile 'Convocations' (vue coach 'N à relancer') masquée pour parent/
  joueur, remplacée par 'Ma convocation' → go('lecteur').

**Fix 'FCMH vs FCMH'** (commit d05a41a) :
- `data-bridge.js` ajoute 3 champs unifiés dans CDD_NEXT_MATCH
  (calculés dans les 3 constructeurs : switcher, fallback amical, FFF) :
  · `opponentName` : adversaire selon venue (next.home si extérieur,
    next.away si domicile)
  · `opponentLogo` : logo correspondant
  · `myClubName` : nom de notre club
- `screen-home`, `screen-prep`, `screen-prep-arb-lec-vote` (page lecteur)
  utilisent ces champs avec fallback robuste. Plus de confusion 'nous
  vs nous' quand on est l'équipe `away`.

**Nettoyage UX parent (1er passage)** (commit en cours, prêt à push) :
- Bannière 'X parents pas répondu' sur Accueil → masquée pour non-coach.
- Hero CTA 'PRÉPARER LA COMPO' remplacé par :
  · Coach → 'PRÉPARER LE MATCH' → match-prep
  · Parent/Joueur → 'VOIR MA CONVOCATION' → lecteur
- Convocations : bandeau 'SUIVI PRÉSENCES' + relance groupée masqués
  pour non-coach. Bandeau technique 'Convocation adaptée pour ce match
  / Source : compo type' masqué pour non-coach.

### ✅ Livré dans la session du 24 mai SOIR (post-v76, commits c0945a0 → 01aa9e7)

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

### ✅ Livré dans la session du 24 mai SOIR (post-v76, commits c0945a0 → 01aa9e7)

**UX page Équipe Type — un seul bouton** (commit c0945a0) :
- Page lineup (Équipe Type) : suppression des boutons Reset/Retour/Coup d'envoi.
  Remplacés par **📋 PRÉPARER LE MATCH / CONVOCATION** plein largeur.
- Force le passage par Convocations pour lancer un match (équipe type =
  template saison, jamais un match concret).
- En mode Compo du Match : Reset/Retour/Coup d'envoi conservés, Retour
  pointe désormais sur Convocations (au lieu de Home).

**Dédup doublons + équipe 2 dans "Disponibles non convoqués"** (commit b54016a) :
- Bug résolu : Mamadou #6+#8, Appolinaire #7+#8, Laighor #11+#16 en double.
  Helper `dedup()` défensif dans builder `CDD_CONVO` (starters, bench) +
  `_ensureMatchLineup` (un joueur ne peut être qu'une fois entre
  starters/bench/reserve, priorité starters).
- Filtre `p.status !== 'reserve'` RETIRÉ de la liste "Disponibles non
  convoqués" → les joueurs équipe 2 apparaissent maintenant. Badge bleu
  pastel **Équipe 2** à côté du nom, bordure gauche distinctive.

**Page dédiée pour les liens ?t= (partage convocation)** (commit b78b411) :
- Avant : un parent qui cliquait un lien WhatsApp `?t=TOKEN` atterrissait
  sur la landing générique 'Je suis coach / Je découvre' — incohérent.
- `app.jsx` : `?t=` SANS email → landing (au lieu de lecteur direct).
  Après login depuis landing avec `?t=` en URL, redirection auto vers lecteur.
- `screen-landing.jsx` : nouveau mode 'share-signup' déclenché par `?t=` :
  bandeau bleu pastel 🔗 'Lien de convocation reçu', boutons Google +
  email magique, note 'Pas encore membre ? Demande un lien d'invitation'.

**Option "Je me reconnecte"** (commit fc0fdd6) :
- 4e carte sur la landing entre "J'ai reçu un lien" et "Je découvre" :
  **👤 Je me reconnecte (parent/joueur/adjoint/lecteur/coach)** en bleu.
- Mode `returning-signin` minimaliste : Google sign-in OU email magique
  sans saisie de nom ni choix de rôle. Le rôle réel est restauré
  automatiquement depuis le membership Firestore au login.

**Infos pratiques du match** (commit 3e59a02) :
- Module `match-info.js` (`window.CDD_MATCH_INFO`) : get/set/hasAny/clear/
  formatForMessage. Storage `cdd_match_info[teamId][matchId]` avec
  opponent / stadium / kickoff / arrival / carpool / notes / updatedAt.
- Modale `match-info-modal.jsx` (`window.MatchInfoModal`) : 5 sections
  (Adversaire, Stade, Horaires RDV+coup d'envoi, Covoiturage avec toggle,
  Notes libres).
- Intégration Convocations : bouton bleu **📋 INFOS DU MATCH** dans hero,
  carte récap si renseignées OU avertissement orange dashed
  '⚠️ Infos du match manquantes'. `buildRelanceMsg` WhatsApp inclut
  désormais le bloc `formatForMessage`.

**Sync cloud match-info + numéros maillots multi-device** (commit 86525b6) :
- `firebase-sync.js` : 6 nouvelles fonctions (`saveMatchInfo/fetchMatchInfos/
  deleteMatchInfo` + équivalents `saveJerseyNumbers/...`). Collections
  `match_infos` et `match_jerseys` (id = `{teamId}_{matchId}`).
- `pullCloudData` fetch les 2 collections au login, propage en LWW vers
  `cdd_match_info` et `cdd_match_jersey_numbers`.
- `match-info.js` set/clear et `jersey-numbers.js` setBulk push cloud
  fire-and-forget.
- `firestore.rules` : règles `/match_infos/{infoId}` et `/match_jerseys/
  {jerseyId}` (read = membre du club, write = canEditTeam).
  **Publiées dans la console Firebase le 24 mai soir.**

**Match amical — création hors-championnat** (commit 003d84e) :
- Module `friendly-matches.js` (`window.CDD_FRIENDLY`) : list/get/create/
  update/remove/nextUpcoming/isAmical. Storage `cdd_friendly_matches[teamId]
  []` avec ids préfixés `fr_*`. Cleanup automatique des données liées
  (match-info, match-lineup, jersey-numbers) à la suppression.
- Modale `friendly-match-modal.jsx` (`window.FriendlyMatchModal`) :
  date (default = prochain dimanche 14h), heure, adversaire, domicile/extérieur.
- `data-bridge.js` : si pas de match FFF en cours, le prochain amical
  devient `CDD_NEXT_MATCH` (avec `isAmical: true`).
- `screen-results-conv.jsx` : badge violet **🤝 MATCH AMICAL** dans hero
  Convocations, bouton **+ MATCH AMICAL** ou **✎ ÉDITER L'AMICAL** selon
  contexte.

**Match amical — sync cloud + onglet Amicaux dans Championnat** (commit bd44f18) :
- `firebase-sync.js` : `saveFriendlyMatch/fetchFriendlyMatches/
  deleteFriendlyMatch` (collection `friendly_matches`).
  `pullCloudData` étendu : merge LWW par id (préserve les ajouts locaux
  non encore push).
- `firestore.rules` : règles `/friendly_matches/{matchId}` (read = membre
  du club, write = canEditTeam). **Publiées dans la console Firebase.**
- `ScreenResults` (Championnat) : 4e onglet **🤝 Amicaux** à côté de
  Classement/Calendrier/Buteurs. Liste triée par date avec badge AMICAL,
  matchs passés grisés. Bouton **+ AJOUTER UN MATCH AMICAL** + bouton
  **✎** sur chaque ligne.

**Page Match dédiée — hub centralisé** (commit 01aa9e7) :
- Nouveau `screen-match-prep.jsx` (`window.ScreenMatchPrep`) accessible
  depuis l'Accueil (tile "Prochain match", anciennement "Match live").
- Contenu : hero match (badge AMICAL) · **checklist 4 items binaires**
  (✅/⚠️ Infos / Compo / Numéros / Convocations parents X/N avec seuil
  80%) · **grille 6 tuiles d'actions** (📋 Infos · 🎯 Compo · 🔢 Numéros ·
  👟 Vestiaire · 📣 Convocs · ↗ Partager) · **CTA primaire 🏁 LANCER LE
  MATCH** avec garde modale numéros au 1er passage.
- Cas "aucun match" : invitation à créer un match amical.
- 3 modales intégrées (MatchInfo, JerseyNumbers, FriendlyMatch).
- App.jsx : route `match-prep` + titre 'PROCHAIN MATCH'.

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
- Joueurs Mamadou/Appolinaire/Laighor en double dans Convocations (dédup
  défensif dans builder + `_ensureMatchLineup`).
- Joueurs équipe 2 invisibles dans "Disponibles non convoqués"
  (filtre `p.status !== 'reserve'` retiré).
- Lien WhatsApp `?t=` aboutissait sur la landing générique (mode
  share-signup dédié maintenant).
- Parent obligé de cliquer "Je suis coach" pour se reconnecter
  (option "Je me reconnecte" ajoutée).

### ⚠️ Convention cache buster (à respecter)
**1 push git = 1 numéro de version.** Tous les fichiers modifiés dans
le même commit prennent le même `?v=NN`. Le push suivant incrémente
de 1 (v74 → v75 → v76…). **Pas de réutilisation d'un numéro.**
Versions notables : v76 (bouchon UX + cache buster homogène),
v78 (numéros maillots + match-info), v79 (sync cloud match-info+jersey),
v80 (match amical), v81 (cloud amical + onglet Champ.), v82 (page
Match dédiée), v83 (Page Club), v84 (Page Coach), v85 (QR codes),
v86 (Onboarding émotionnel), v87 (sélecteur multi-matchs),
v88 (Convocations 1 CTA), v90 (fix bugs UX match), v91 (mini-vue
terrain Convocations), v92 (tiles Accueil par rôle), v93 (fix FCMH
vs FCMH), **v94** (nettoyage UX parent — actuelle).

---

## 2. Sujet suivant — backlog priorisé

### PRIORITÉ 1 : Nettoyage UX parent (suite)
Voir la section ⚡ "Priorité absolue pour la prochaine session" en haut
du document. 5 sujets précis identifiés par Florian :
1. Page Tactique cachée pour parent
2. Section Invitations dans Réglages cachée pour parent
3. Page Compo : ne montrer que son enfant pour parent (filtrage liste)
4. Page Convocations : ne montrer que son enfant pour parent (au lieu
   de la liste complète des titulaires/banc)
5. Mode Vestiaire : à masquer pour parent si pertinent

Approche recommandée : centraliser dans `roles.js` :
- `canSeeFullSquad()` (= isCoachLike)
- Helper `getChildOfParent(membership)` → playerId de l'enfant lié

### PRIORITÉ 2 : Page Soutien projet
- Page de présentation du projet (pas paiement, juste présentation et
  contact). Modèle économique / sponsoring / appel au don volontaire.

### Autres pistes (long terme)
- Import district / FFF (futur module ingestion automatique).
- Refonte des pages partage parent (`?p=`, `?carnet=`) cohérente avec
  la nouvelle UX parent.
- Animations/transitions plus fluides entre les écrans.
- PWA installable (manifest + service worker pour offline).

---

## 3. Sujets en backlog (long terme)

- **Page Soutien projet** dédiée (pas paiement, juste présentation).
- **Import district / FFF** (futur module ingestion).
- **Photos manquantes** : Djibril TRAORE, Ilian LUNETEAU, Niels BRUDEY
  → Florian dit "pas important, joueurs d'une autre catégorie".

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
