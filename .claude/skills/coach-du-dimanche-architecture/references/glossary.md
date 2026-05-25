# Glossaire technique — Coach du Dimanche V2

> Tous les noms, modules, helpers, collections Firestore et événements custom utilisés dans l'app. À consulter quand on tombe sur un nom inconnu.

## Globaux `window.*` posés par `data-bridge.js`

| Nom | Rôle | Reconstruit par |
|---|---|---|
| `CDD_CLUB` | Le club actif (logo, couleurs, nom, classement, forme) | `rebuildCDDGlobals()` |
| `CDD_PLAYERS` | Joueurs de l'équipe active (avec stats dérivées via `position-rating.js`) | `rebuildCDDGlobals()` |
| `CDD_NEXT_MATCH` | Prochain match (FFF ou amical, avec `noUpcoming:true` si vide). Porte `teamId`, `opponentName`, `opponentLogo`, `myClubName`, `venue` (`'Domicile'`/`'Extérieur'`), `daysLeft`, `isAmical` | `rebuildCDDGlobals()` + applyFFFData |
| `CDD_LIVE_MATCH` | Match actuellement en cours (depuis `getLiveMatch()`) | `rebuildCDDGlobals()` |
| `CDD_LAST_MATCHES` | Historique des matchs joués. ⚠ **BUG : lit localStorage, pas le cloud** → diverge entre devices | `listCoachFinishedMatches()` |
| `CDD_STANDINGS` | Classement FFF de l'équipe | `applyFFFData()` |
| `CDD_TOP_SCORERS` | Top buteurs FFF du championnat | `applyFFFData()` |
| `CDD_CONVO` | Convocations match courant : `{starters: [pid], bench: [pid], reserve: [pid]}` | builder dans data-bridge |
| `CDD_FORMATIONS` | Schémas tactiques disponibles (4-3-3, 4-4-2, etc.) | static |
| `CDD_OBSERVATIONS` | Observations match du coach | localStorage |
| `CDD_POS_COLOR` | Map poste → couleur d'accent | static |
| `CDD_FFF_UPCOMING` | Liste des matchs FFF à venir, filtrés des fantômes | applyFFFData |
| `CDD_FFF_LOADED` | Flag : true quand les données FFF ont été appliquées | applyFFFData |
| `CDD_TEAM_HELPERS.activeTeamIsAdult()` | Helper : équipe sénior/vétéran (`true`) ou jeunes U6→U18 (`false`) → adapte les textes "parents"/"joueurs" | data-bridge |
| `CDD_REBUILD()` | Recompute tous les `CDD_*` après changement données | data-bridge |

## Namespaces

### `window.cddData` (firebase-sync.js)
API Firestore complète. Méthodes principales :
- `saveClub(club)`, `saveTeam(team)`, `savePlayer(player)`
- `savePlayerStats`, `savePlayerProfile`, `savePlayerNotes`, `savePlayerPerfDeltas`
- `saveLineupTemplate`, `saveMatchLineup`, `fetchMatchLineups`, `deleteMatchLineup`
- `saveMatchInfo`, `fetchMatchInfos`, `deleteMatchInfo`
- `saveJerseyNumbers`, `fetchJerseyNumbers`, `deleteJerseyNumbers`
- `saveFriendlyMatch`, `fetchFriendlyMatches`, `deleteFriendlyMatch`
- `saveCoachProfile`, `fetchCoachProfile`, `deleteCoachProfile`
- `setTeamLiveMatch(teamId, matchId)`, `clearTeamLiveMatch(teamId)`, `fetchMatch(matchId)`
- `saveMembership`, `removeTeamMembership`, `fetchMemberships`, `fetchClubMemberships`
- `fetchClub`, `fetchTeams`, `fetchPlayers`
- `migrateLocalToCloud()`, `pullCloudData()`, `forceResyncMatch()`, `forceEndMatch(matchId, teamId)`
- `createInvite`, `fetchInvite`, `fetchClubInvites`, `revokeInvite`, `consumeInvite`, `clubRoleCount`, `teamRoleCount`, `inviteUrl`
- **Phase D admin** : `fetchAllClubs`, `findUidByEmail`, `assignTeamCoach`, `transferTeamCoach`, `leaveClub`, `migrateMembershipsToTeamsModel`
- Constantes : `ADJOINT_CAP`, `INVITE_TTL_DAYS`

### `window.cddSync` (firebase-sync.js)
API live / temps réel :
- `sendConvocResponse(matchId, playerId, status)` — réponse parent JE VIENS / Absent / ?
- `watchConvocResponses(matchId, callback)` — onSnapshot sur les réponses convoc
- `sendVote(matchId, voterId, votes)`, `watchVotes(matchId, callback)`
- `saveMatchToCloud(match)` — push match complet (utilisé pendant le live)
- `deleteMatchFromCloud(matchId)`
- `watchMatchFromCloud(matchId, callback)` — onSnapshot sur le doc match
- `setPlayerStatus`, `watchPlayerStatuses`
- `getMatchId()`, `matchId` (property)

### `window.cddAuth` (firebase-sync.js)
- `ready` (boolean), `signOut()`, `currentUser()`, méthodes Google sign-in et email-link

### `window.MATCH_HELPERS` (match-engine.js)
- `newMatch(tA, tB)`, `loadMatch(id)`, `saveMatch(M)` — CRUD localStorage
- `gMatch(M)` — temps écoulé période courante (ms). **Depuis v134 : utilise event sourcing**
- `gMin(M)` — minute officielle (utilise `gMatch` + `M.ch * cfg.hd`)
- `gPauseMs(M)`, `gRealMs(M)`, `fmtMMSS(ms)`, `fmtMatchMinute(M, ev)`
- `computeChronoMs(M)` — **NOUVEAU v134** — source de vérité chrono via M.ev
- `isInHalftime(M)`
- `buildDefaultTeams()` — construit `{tA, tB}` depuis compo type ou compo match
- `playerLabel(p)`
- `addAT(M, minutes)` — ajoute du temps additionnel
- `setOpponent(M, name, color, opts)`
- `setInjured(M, side, playerId)`
- `checkAlerts(M, onAlert)` — vibreur 2'30 avant fin
- `getLiveMatch()` — retourne le match en cours ou null
- `listCoachFinishedMatches()` — ⚠ scan localStorage → bug cross-device
- `computeExploits(M)`
- `editEvent(M, idx, patch)`
- `requestWakeLock`, `releaseWakeLock`, `goFullscreen`, `exitFullscreen`
- `startSilenceLoop`, `stopSilenceLoop`

### `window.MATCH_SFX`
- `playWhistle()`, `playGoal()`, `playCard()`, `playBuzzer()`, `vibrate(ms)`

### `window.CDD_ROLES` (roles.js)
- `effectiveRole(email?)` — owner/coach/adjoint/parent/joueur/lecteur/admin
- `isAdmin()` — email admin gating
- `ADMIN_EMAIL` = `archi.tech.fr@gmail.com`
- `INVITE_MATRIX`, `invitableRoles(role)`, `canInviteRole(target)`
- `ROLE_CAPS`, `canDo(cap)`, `isReadOnly()`
- Phase D : `readActiveContext`, `clubRoleOf(clubId)`, `teamRole(clubId, teamId)`, `myRoleOnTeam`, `activeTeamRole`, `listMyTeamRoles`
- `getChildOfParent(teamId)` — pour parent : retourne le playerId de son enfant

### `window.CDD_FRIENDLY` (friendly-matches.js)
- `list(teamId, opts?)` — par défaut filtre les `endedAt`
- `get(teamId, matchId)`, `create(teamId, data)`, `update(teamId, matchId, patch)`
- `remove(teamId, matchId)` — cleanup en cascade (match-info, lineup, jersey)
- `markEnded(teamId, matchId)`, `nextUpcoming(teamId)`, `isAmical(matchId)`
- Storage : `localStorage['cdd_friendly_matches'][teamId][]`, ids préfixés `fr_*`

### `window.CDD_MATCH_INFO` (match-info.js)
- `get/set/hasAny/clear/formatForMessage(teamId, matchId)` — infos pratiques (stade, RDV, horaires, covoiturage, notes)
- Storage : `localStorage['cdd_match_info'][teamId][matchId]`
- Sync cloud via `saveMatchInfo`/`fetchMatchInfos`

### `window.CDD_JERSEY` (jersey-numbers.js)
- `getOverrides(teamId, matchId)`, `setBulk(teamId, matchId, map)`
- `wasReviewed(teamId, matchId)`, `markReviewed(teamId, matchId)`
- `ofPlayer(teamId, matchId, playerId)` — numéro match-specific avec fallback saison
- Storage : `localStorage['cdd_match_jersey_numbers'][teamId][matchId][playerId]`

### `window.CDD_MATCH_SWITCHER` (match-switcher.js)
- `listUpcoming(teamId)` — combine FFF + amicaux, format unifié
- `getActive(teamId)`, `setActive(teamId, matchId)`, `hasExplicitChoice(teamId)`
- Storage : `localStorage['cdd_active_match_<teamId>']`

### `window.CDD_COACH` (coach-overrides.js)
- `setStatusOverride`, `setStatusMeta`, `setStatsBulk`, `POSITION_CHOICES`, etc.
- Storage : `localStorage['cdd_player_stats_override']`, `cdd_player_status_override`

### `window.CDD_COACH_PROFILE` (coach-profile.js)
- `get/set/clear(uid)` — carte de visite coach partageable
- Sync via `saveCoachProfile/fetchCoachProfile`
- URL public : `?coach=UID`

### `window.CDD_RATING` (position-rating.js)
- `weightedOverall(stats, poste)` — OVR pondéré selon poste
- `quickProfile(rating, poste)` — génère un profil de 6 stats pour un OVR cible
- `labelsFor(poste)` — labels des 6 stats (gardien ≠ champ)
- 7 profils : Gardien, DC, Latéral, MdR, MOC, Ailier, BU

### `window.CDD` (data-adapter.js)
- `getActiveTeam()`, accès au stockage filtré par membership

### `window.CDD_CAL` (calendar-export.js)
- `buildMatchICS(match, info)` — RFC 5545
- `downloadMatchICS(match, info)` — multi-plateforme (Apple/Google/Outlook)

### `window.CDD_HELPERS`
- `deburr(s)` — NFD + suppression diacritiques (recherche sans accents)

### `window.CDD_TEAM_HELPERS`
- `activeTeamIsAdult()`

## Propriétés du match (`M`)

```js
M = {
  id: 'm_<base36>',              // local id (ou pulled from cloud)
  teamId, clubId,                 // contexte
  scheduledMatchId,               // id du match programmé (CDD_NEXT_MATCH.id ou amical fr_xxx)
  notStarted: bool,               // true tant que le coach n'a pas cliqué LANCER
  st: 'live'|'paused'|'finished',
  ch: number,                     // période courante (1, 2, ...)
  cfg: {hs, hd, htd, nt, ms},     // half_count, half_duration_min, ht_duration_min, num_titulaires, max_subs
  tSt: number|null,               // ⚠ LEGACY — timestamp début période. Cross-device fragile.
  tOff: number,                   //  LEGACY — offset cumulé période. Idem.
  pauseStartedAt, pauseTotalMs,   // pour le compteur de pause UI
  inHalftime: bool,               // true entre fin période N et reprise N+1
  htStart, htDur,                 // début mi-temps + durée nominale
  startedAt: number,              // ✓ timestamp absolu coup d'envoi (cross-device safe)
  endedAt: number,                // ✓ timestamp absolu fin
  periodStartedAt: {1:ts, 2:ts},  // ts absolu démarrage de chaque période
  isAtHome: bool,                 // posé au coup d'envoi — utiliser pour scoreboard, PAS CDD_NEXT_MATCH.venue
  tA, tB: {n, c, c2, p:[], bench:[], logoDataUrl},  // équipes
  sA, sB: number,                 // scores
  yA, yB, rA, rB, uA, uB: number, // jaunes, rouges, subs par équipe
  at: number,                     // additional time (minutes)
  ev: [{tp, mn, ch, ts, ...}],    // ✓ events timestampés = source vérité chrono v134
  savedAt: number,                // dernier save local
  _pulledFromCloud: bool,         // (provisoire, voir patterns.md)
}
```

### Types d'events (`ev[].tp`)
- `goal` (`{t:'A'/'B', pl, playerId, ts, mn, ch, source?}`)
- `card` (jaune/rouge)
- `sub` (changement)
- `injury`
- `at` (additional time, `val: minutes`)
- `half` — sifflet de mi-temps (fin de période N)
- `period_start` — reprise après mi-temps (début de période N+1) — **NOUVEAU v134**
- `pause` — passage en pause normale — **NOUVEAU v134**
- `resume` — sortie de pause normale — **NOUVEAU v134**
- `end` — coup de sifflet final

## Collections Firestore

| Collection | Doc id | Contenu |
|---|---|---|
| `clubs` | clubId | name, short, logo (base64), stadium, contacts, social |
| `teams` | teamId | name, category, format, fffConfig, liveMatch{matchId, startedAt} |
| `players` | playerId | nom, prénom, photo, stats, status |
| `memberships` | `{uid}_{clubId}` | uid, clubId, clubRole, teams: {[teamId]: {role, playerId?}} |
| `invites` | token | clubId, teamId, role, playerId?, createdBy, consumedBy?, expiresAt |
| `match_lineups` | `{teamId}_{matchId}` | compo match-specific |
| `match_infos` | `{teamId}_{matchId}` | stade, RDV, horaires, covoiturage, notes |
| `match_jerseys` | `{teamId}_{matchId}` | overrides numéros maillots |
| `friendly_matches` | `{teamId}_{matchId}` | amicaux hors-championnat |
| `coach_profiles` | uid | carte de visite coach (lecture publique) |
| `cdd_v2_matches` | matchId | doc complet du match live (teamA, teamB, status, period, config, events, scores, cartons, subs, addTime, **tSt, tOff, startedAt, endedAt, pauseStartedAt, inHalftime, htStart**) |
| `votes` | matchId | votes post-match |
| `convoc_responses` / `cdd_v2_convoc_<id>` | matchId | réponses parents JE VIENS / Absent / ? |
| **Legacy** | | `matches`, `club_matches`, `transfers`, `users`, `cdd_v2_*` (à nettoyer un jour) |

## Événements DOM custom (window.dispatchEvent)

- `cdd-data-rebuilt` — après `CDD_REBUILD()`, déclenche le rerender React
- `cdd-memberships-changed` — après modif d'une membership
- `cdd-auth-changed` — après signIn/signOut
- `cdd-fff-loaded` — après applyFFFData
- `cdd-jersey-changed` — après modif d'un numéro

## Clés localStorage importantes

| Clé | Contenu |
|---|---|
| `cdd_match_current` | matchId du match en cours |
| `cdd_match_<id>` | objet match complet (auto-save toutes les 10s) |
| `cdd_match_last_finished` | id du dernier match terminé (filtres post-match) |
| `cdd_friendly_matches` | dict {teamId: [amicaux[]]} |
| `cdd_match_info` | dict {teamId: {matchId: info}} |
| `cdd_match_jersey_numbers` | dict {teamId: {matchId: {playerId: num}}} |
| `cdd_active_context` | `{clubId, teamId}` |
| `cdd_active_match_<teamId>` | choix explicite multi-matchs |
| `cdd_user_email`, `cdd_user_uid` | identité Firebase |
| `cdd_user_name` | nom saisi à l'onboarding (pousse vers `displayName` au consumeInvite) |
| `cdd_pending_invite` | token de l'invite en attente (survit au round-trip email-link) |
| `cdd_access_revoked` | flag révocation membership (force landing) |
| `cdd_emo_onb_done`, `cdd_emo_onb_data` | onboarding émotionnel |
| `arb_clubs`, `arb_teams`, `arb_current_club` | cache structures (legacy mais actifs) |
| `cdd_player_stats_override`, `cdd_player_status_override` | overrides coach |
| `cdd_v2_convoc_<matchId>` | réponses parents en local |
