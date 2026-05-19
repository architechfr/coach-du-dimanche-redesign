# HANDOFF — Coach du Dimanche V2

> **Pour qui :** la prochaine conversation Claude qui reprendra le projet.
> **Quand :** dernière mise à jour 20 mai 2026.
> **Objectif :** transmettre l'état exact du projet + les règles tacites + la roadmap, pour pouvoir reprendre sans repasser par 50 messages de contexte.

---

## 1. Le projet en 30 secondes

App PWA React (JSX sans build, scripts in-browser) pour coachs de foot amateur français. Esthétique FIFA/Football Manager (cartes FUT, OVR, raretés). Cible : transformer un proto en produit défendable (objectif 580 k€ ARR à 36 mois).

- **Repo** : [architechfr/coach-du-dimanche-redesign](https://github.com/architechfr/coach-du-dimanche-redesign) — **PUBLIC** (le coach a choisi ce risque mesuré)
- **Code path** : `Version/V2/` dans `COACH-DU-DIMANCHE` OneDrive
- **Déploiement** : Vercel auto-deploy sur push `main`
- **URL prod** : `coach-du-dimanche.vercel.app`
- **Tech** : React 18 in-browser, Firebase Firestore (sync optionnel, anonymous), localStorage source de vérité offline-first
- **L'analyse stratégique exhaustive** est dans [`ANALYSE_STRATEGIQUE.md`](ANALYSE_STRATEGIQUE.md) — lecture obligatoire pour reprendre

## 2. Conventions tacites — à respecter absolument

Le coach m'a corrigé plusieurs fois là-dessus. Ne pas y déroger.

| Convention | Détail |
|---|---|
| **V/N/D pas W/D/L** | Affichage français Victoire/Nul/Défaite. Code interne peut garder W/D/L pour compat FFF mais la traduction est obligatoire à l'affichage. Vert / Gris / Rouge. |
| **Banc strict 3 ou 5** | Foot amateur. Jamais 4, jamais autre valeur. Snap automatique au chargement, toggle 3↔5 jamais ±1. |
| **Mode Vestiaire** | Jamais "Présentation TV" — c'est banni. Le contexte d'usage est le vestiaire. |
| **Push direct OK** | Le coach a explicitement autorisé `git push` direct sur `main` sans confirmation à chaque fois. Vercel auto-deploy après chaque push. **Sauf** : force push, push sur autre branche que main, suppression > 100 lignes — toujours demander. |
| **Diagnostiquer avant coder** | Pour les refactors ou questions d'archi, proposer diagnostic + plan d'action AVANT de coder. Le coach déteste "tourner en rond". |
| **Honnêteté du code** | Pas de mock data dans des écrans qui prétendent montrer du réel. Si pas de data, état vide explicite. |
| **Format minute réglementaire** | "45 + 2'" pas "47'" en temps additionnel — règle FFF. Helper `MATCH_HELPERS.fmtMatchMinute(mn, ch, cfg)`. |
| **Logo par club** | `cdd_club_logos[clubId]`, partagé entre toutes les équipes du club (FCMH U15 et U11 partagent le logo FCMH). Pas par appareil, pas par équipe. |
| **Sync Firestore = LWW par timestamp** | Tout listener qui écrit dans localStorage doit comparer cloudMs vs localMs et ne jamais écraser une modif locale récente. Voir commit #56. |
| **Lien parents = lecteur public** | `https://coach-du-dimanche.app/lecteur/?t=TOKEN` — token persistant `cdd_share_token` |
| **Lien joueur (Carnet) = magic link** | `https://coach-du-dimanche.app/?carnet=PLAYER_ID` — auto-route au boot de l'app |

## 3. Architecture data — clés localStorage de référence

```
// ── IDENTITÉ & RÔLES
cdd_user_role           string  ('coach' | 'owner' | 'parent' | 'joueur' | 'admin' | 'dirigeant' | 'adjoint' | 'ecole' | 'lecteur')
cdd_user_email          string  (identité de l'user — utilisé par roles.js pour les memberships ; pas de super-admin par email tant qu'Auth pas branchée)
cdd_user_scope          JSON    ({clubIds[], teamIds[], playerIds[]})
cdd_coach_name          string
cdd_voter_id            string  (identifiant anonyme par device)

// ── CLUBS / ÉQUIPES (vraies données)
arb_clubs               JSON    ([{id, name, primaryColor, secondaryColor, createdAt, createdBy}])
arb_teams               JSON    ([{id, clubId, name, category, players[], lineupTemplate, createdAt, createdBy}])
arb_current_club        string  (clubId actif)
cdd_active_context      JSON    ({clubId, teamId, matchId})
cdd_club_logos          JSON    ({[clubId]: dataURL}) ← NOUVEAU, par club et non par appareil

// ── COMPO TYPE / CONVOC / FEUILLE DE MATCH (3 couches strictes)
cdd_lineup_template     JSON    ({[teamId]: {formation, starters{slotIdx:pid}, bench[], reserve[]}})  ← compo SAISON
cdd_match_convoc        JSON    ({[teamId]: {[matchId]: {startersIds[], benchIds[], basedOn, ts}}})  ← convoc par match
cdd_convoc_settings     JSON    ({[teamId]: {count: 14|16}})  ← strict 14 ou 16, jamais 15
cdd_match_current       string  (matchId du match LIVE en cours — écrit par startMatch, retiré par endMatch)
cdd_match_last_finished string  (matchId du dernier match terminé — pour Vote)
cdd_match_{id}          JSON    (le match lui-même — score, events, lineup snapshot)

// ── OVERRIDES JOUEUR
cdd_player_status_override   JSON  ({[pid]: 'active|rest|injured|suspended|reserve'})
cdd_player_status_meta       JSON  ({[pid]: {reason, until, ...}})
cdd_player_status_local_ts   JSON  ({[pid]: timestamp})  ← clé pour le LWW Firestore sync
cdd_player_stats_override    JSON  ({[pid]: {PAC, SHO, PAS, DRI, DEF, PHY}})
cdd_player_profile           JSON  ({[pid]: {position, num, taille, poids, pied, parentPhone, ...}})
cdd_player_name_override     JSON
cdd_player_notes             JSON
cdd_player_perf_deltas       JSON  ({[pid]: {[matchId]: {PAC,...,source,matchDate,opp,goals,assists,...}}})  ← OVR vivante

// ── CARNET DU JOUEUR (Phase 1)
cdd_carnet_shared            JSON  ({[pid]: {sharedAt, channel}})

// ── SYNCHRONISATION & AUDIT
cdd_share_token              string (8 chars — lecteur public parents)
cdd_audit_log                JSON  ([{ts, kind, by, target}])  ← ajouté en #73
cdd_invitations              JSON  ([{token, role, scope, createdBy, createdAt, expiresAt, consumed}])  ← stub Phase 3
cdd_club_sponsors            JSON  (sponsors pour Mode Vestiaire)
cdd_tactiques                JSON  (schémas tactiques)

// ── FIRESTORE COLLECTIONS (anonyme actuellement)
cdd_v2_convoc/{matchId}      réponses convocations parents
cdd_v2_votes/{matchId}       votes post-match
cdd_v2_matches/{matchId}     snapshots match live
cdd_v2_players/{playerId}    status joueur (avec teamId)
```

## 4. Fichiers clés (et ce qu'ils font)

```
roles.js                   ← NOUVEAU (Phase 3 préfigurée). window.CDD_ROLES exposé.
data-bridge.js             cœur — assemble CDD_CLUB, CDD_PLAYERS, CDD_CONVO, CDD_NEXT_MATCH, CDD_LAST_MATCHES
match-engine.js            modèle match + helpers chrono + getLiveMatch + listCoachFinishedMatches
                           + fmtMatchMinute (format "45+2")
firebase-sync.js           Firestore : matchId est un GETTER dynamique (pas valeur fixe)
                           + lastFinishedMatchId helper
coach-overrides.js         API window.CDD_COACH : setStatusOverride, setProfile, addNote, etc.
                           + applyMatchPerformanceDeltas (auto-progression OVR)
                           + getPerfDeltaSum (cap ±10/stat saison)
                           + listener Firestore en LWW par timestamp

screen-home.jsx            accueil + alerte présences + dernière action
screen-effectif-lineup.jsx EFFECTIF + COMPO. snapBench top-up à 3 mini, toggle 3↔5
                           + indicateur "X/Y carnets envoyés"
screen-match-live-v2.jsx   MATCH LIVE arbitre. Chrono XL, événements en français,
                           formats "45+2", swap titulaire/remplaçant atomique,
                           timeline FR via cleanPlayerName + eventDescriptionFr
                           + MatchSummaryShareModal (résumé post-match shareable)
screen-results-conv.jsx    CHAMPIONNAT + CONVOCATIONS. Bandeau "Source: compo type / Convoc adaptée"
                           + section actionnable "X à relancer" avec WhatsApp 1-tap
screen-match-fiche.jsx     FICHE JOUEUR. Stats sliders, profil complet,
                           + CarnetActions (Aperçu / Envoyer parent / Copier lien)
screen-prep-arb-lec-vote.jsx PREP + ARBITRE + LECTEUR PUBLIC + VOTE post-match
                           Vote utilise lastFinishedMatch.tA.p (pas CDD_CONVO.starters)
screen-tv.jsx              MODE VESTIAIRE — titulaires (positions) + remplaçants
                           Source = CDD_CONVO (overlay match si défini)
screen-transfert-sync-convp.jsx  TRANSFERT + SYNC CLOUD + CONVOC PARENT
                           Activité récente = vraies sources (audit log + matchs + carnets)
                           Bloc compte = vrai état (pas mock Florian C.)
screen-carnet-joueur.jsx   ← NOUVEAU. Carte FUT personnelle, badges, progression OVR.
                           Auto-routé via ?carnet=PLAYER_ID
screen-onb-set.jsx         ONBOARDING + RÉGLAGES.
                           Section MON CLUB (upload logo par clubId)
                           Section AVANCÉ ADMIN > Inventaire & audit (AdminInventoryPanel)
                           ProfileEditModal (nom + email)
screen-tactique.jsx        Tableau noir tactique
screen-share.jsx           Partage lecteur public + QR
screen-compo-libre.jsx     Compo drag-drop libre
```

## 5. Ce qui a été shippé pendant les sessions précédentes

Commits récents (du plus récent au plus ancien) :

| # | Sujet |
|---|---|
| 75 | Squelette roles.js + fix "Compte non renseigné" + ProfileEditModal |
| 74 | Sync Cloud : tout le mock data retiré, branché sur vraies sources |
| 73 | Multi-club : logo par clubId + audit log + vue admin |
| 72 | UX Sync Cloud : "Mes équipes" + raccourci personnalisation |
| 71 | Minutes réglementaires "45+2" + horodatages périodes + hint logo |
| 70 | Logo club (TeamBadgeBig) + chrono pause/mi-temps + "Mi-temps" + noms plus gros |
| 69 | Sub : pickers filtrés + vrai swap onField + undo cohérent |
| 68 | Timeline : faits de match en français propre + logo équipe |
| 67 | Fantôme "match en cours" éliminé après fin de match |
| 66 | Banc 3 mini + matchs joués visibles sur accueil + V/N/D |
| 65 | Chrono qui tourne + sifflet retiré + blessé adversaire + match terminé clos |
| 64 | Carnet : compteur "X/Y envoyés" + badge par joueur |
| 63 | Carnet : bouton "Envoyer au parent" sur fiche joueur |
| 62 | **Carnet du joueur v0** (carte FUT + badges + progression) |
| 61 | **Résumé post-match partageable** (story Insta) |
| 60 | **Auto-progression OVR** Niveau 1 |
| 59 | Chrono XL arbitre + lifecycle match + matchId dynamique |
| 58 | Alerte accueil + badge tile convoc |
| 57 | Suivi présences actionnable (relance WhatsApp) |
| | **`ANALYSE_STRATEGIQUE.md`** : 585 lignes — diagnostic + roadmap + monétisation |
| 56 | Fix LWW Firestore (statuts joueurs qui revenaient) |
| 55 | Mode Vestiaire = convoc réelle |
| 54 | Overlay convoc séparé + banc strict + renommage Mode Vestiaire |

## 6. Roadmap immédiate (par ordre)

Référence : Phase 1 de [`ANALYSE_STRATEGIQUE.md`](ANALYSE_STRATEGIQUE.md).

### À faire en priorité (jours)
- [ ] Tester end-to-end un cycle match complet (prematch → live → fin → vote → partage)
- [ ] Mémoire / OneDrive : risque RGPD photos enfants (45 photos U15 dans `assets/photos_U15_2025-2026/`). À traiter si activité commerciale.
- [ ] Brancher la **section MON CLUB** sur la sélection d'un club spécifique (aujourd'hui ça suit le club actif sans choix)
- [ ] Section Compo libre + Tactique : à vérifier qu'elles n'ont pas régressé avec les modifs récentes

### Phase 2 (semaines) — Activer la viralité
- [ ] Notifications push FCM web (but enfant, convoc reçue, carte mise à jour)
- [ ] Onboarding parent simplifié (landing dédiée "Tu as reçu un lien pour Léo")
- [ ] Programme parrainage "invite un coach, 3 mois Pro pour vous deux"
- [ ] Système de badges joueur — enrichir le set actuel (10-15 badges)

### Phase 3 (le grand chantier) — Auth + Monétisation
- [ ] **Firebase Auth** (email + Google + Apple) → débloquer custom claims
- [ ] **Firestore rules strictes** (cloisonnement par clubId/teamId)
- [ ] **Vrai flow d'invitation magique** (`/invite/?t=TOKEN`) via le squelette `roles.js`
- [ ] **Stripe Checkout** + portail client (4 tiers : Free / Coach Pro 5-7€ / Carnet Joueur 3€ / Club 199-799€/an)
- [ ] **Feature flagging** par tier (Firestore custom claims)
- [ ] **Pricing page** + **mentions légales** + **CGU/CGV**
- [ ] **Conformité RGPD** (consentement parental pour mineurs, droit à l'oubli, export)

### Phase 4 — Scale
- [ ] Migration IndexedDB pour les grosses données (>500 équipes)
- [ ] Service Worker (cache offline html2canvas + QR + assets)
- [ ] Sentry monitoring
- [ ] Setup CI/CD (lint, tests, preview deploys)
- [ ] IA scout (assistant tactique)

## 7. Mémoire — règles persistantes côté Claude

Dans `~/.claude/projects/.../memory/` :

- `MEMORY.md` — index
- `terminologie_mode_vestiaire.md` — pas "Présentation TV"
- `terminologie_resultats_fr.md` — V/N/D pas W/D/L
- `banc_strict_3_ou_5.md` — jamais 4 ni autre
- `workflow_propositions.md` — diagnostic avant code pour les refactors
- `workflow_git_push_direct.md` — push direct OK sur ce repo
- `archi_compo_convoc_match.md` — 3 couches strictes (template / overlay / snapshot)
- `sync_firestore_last_write_wins.md` — listeners cloud en LWW timestamp

Si tu reprends sans mémoire, relis `MEMORY.md` en priorité.

## 8. Comment reprendre (checklist pour la prochaine conversation)

1. **Lire `ANALYSE_STRATEGIQUE.md`** (25 min) pour le cadre
2. **Lire `HANDOFF.md`** (ce fichier — 5 min)
3. **Vérifier les dernières règles** dans la mémoire (`~/.claude/projects/.../memory/MEMORY.md`)
4. **`git log --oneline -10`** pour voir les derniers commits
5. **Demander au coach** ce qui marche/cloche pour orienter la prochaine action
6. **Travailler en sessions** : un retour terrain = 1-3 fixes ciblés + commit + push (mode push direct OK)

## 9. Risques connus / dette technique

### À court terme
- **45 photos enfants + seed-real-data.json** dans repo PUBLIC : RGPD bombe à retardement si pas traité avant activité commerciale réelle. Coach prévenu, choix mesuré pour l'instant.
- **Pas d'auth réelle** : `cdd_match_current`, `cdd_user_role` sont éditables côté client. Tant qu'on est < 50 utilisateurs c'est OK.
- **Mock data résiduel** : à chercher dans certains écrans (j'ai nettoyé `screen-transfert-sync-convp.jsx` mais probablement d'autres mocks ailleurs).
- **Firebase Spark gratuit** : ~150 équipes max. Voir grille de coûts dans `ANALYSE_STRATEGIQUE.md` section 7.

### À moyen terme
- **Conformité RGPD enfants** (consentement parental, droit à l'oubli)
- **Sentry / Monitoring** : aucun pour l'instant, je vole à vue côté bugs en prod
- **Tests** : zéro test automatisé. Régressions possibles à chaque commit.
- **CI/CD** : Vercel auto-deploy uniquement. Pas de preview deploy par branche.

## 10. Super-admin / Owner

**⚠️ Pas de super-admin par email dans le code.** Toute version antérieure qui codait en dur un email owner dans le repo public était une faille (clone du repo = qui peut voir l'email = qui peut s'auto-promouvoir owner en le saisissant dans Réglages).

Tant que Firebase Auth n'est pas branchée (Sprint 3), **tout le monde est juste `coach`**. Le super-admin reviendra via Firebase custom claims côté serveur (impossible à forger côté client) ou via une rule Firestore qui check l'UID.

L'email coach stocké dans `cdd_user_email` sert uniquement d'identifiant pour les memberships locales (`cdd_memberships`).

---

**Fin du HANDOFF.** Bonne reprise.
