# Session log — Coach du Dimanche V2

> Résumé chronologique des sessions de travail, leçons apprises, contexte pour reprise. À mettre à jour à chaque fin de session (via `/handoff` ou manuellement).

## Sessions antérieures

Voir `HANDOFF.md` à la racine du projet pour le détail commit par commit jusqu'au 25/05/2026.

---

## Session 26/05/2026 (nuit) — Cross-device + Event sourcing

### Durée
~14h+ de travail collaboratif Florian/Claude.

### Contexte initial
Florian a testé un match amical USDF vs Bussy sur son PC, l'a "fini" sans cliquer "Fin de match", et a constaté plein de bugs cross-device :
- Chrono affichant `29662334:37` sur le téléphone (epoch en minutes)
- Match fantôme "MATCH EN COURS" qui restait sur tous les devices
- Match FFF saison prochaine "? VS USDF · 12 Oct · 02h00" qui s'incrustait comme prochain match
- Historiques de matchs divergents entre devices (PC voit Bussy 1-0 + 2-1, téléphone voit Bussy 4-3)

### Commits poussés (8)

| Commit | Sujet | Apport |
|---|---|---|
| `cd2ec83` | chrono safe + cleanup post-match | Garde-fou `if (!M.tSt) return tOff` dans gMatch + cleanup local quand watch reçoit status='finished' |
| `02d52b7` | event sourcing du chrono | `computeChronoMs(M)` basé sur `M.startedAt` + events `pause/resume/period_start` au lieu de `tSt/tOff` fragiles |
| `b41cbbe` | cleanup match fantôme + bouton SOS Resync | Auto-cleanup en pullCloudData si plus aucune team ne revendique le match + bouton manuel dans Réglages |
| `7b2ade5` | filtre FFF anti-fantôme v1 | Filtre les matchs FFF avec opponent unresolved, date >60j, heure 02h00. Bug : ne testait que `m.away` |
| `9a2e538` | fix filtre FFF v2 | Teste `m.home` ET `m.away` (selon venue l'opposant change de côté) |
| `aae00b1` | bouton "🏁 Forcer la fin" | Lien sur l'accueil sous bandeau rouge MATCH EN COURS → `forceEndMatch(matchId, teamId)` qui écrit direct status='finished' dans Firestore |

(commits earlier dans la session : refonte du watch toujours actif `2881522`, scoreboard via M.isAtHome `2881522`, no-overwrite null Firestore `2881522`, etc.)

### Leçons apprises

1. **Florian a souvent un ad-blocker actif** (Arc Shield) qui bloque Firestore avec `ERR_BLOCKED_BY_CLIENT`. Toujours regarder la console DevTools avant de débugger plus loin.

2. **Le cache buster est fragile** : sur mobile, kill + relance ne suffit parfois pas. Le SOS Resync aide mais c'est laborieux.

3. **L'app a 6 sources de vérité divergentes** (cdd_match_current, cdd_match_<id>, cdd_match_last_finished, cdd_friendly_matches, cdd_v2_matches/.status, teams/.liveMatch). Les patches qui n'attaquent pas ce fond ne tiennent pas.

4. **Les patches s'enchaînent** : à chaque fix d'un cas, un autre apparaît. Florian a fini la session par "tu apprends en même temps qu'on travaille" → demande de créer une skill pour capitaliser.

5. **La refonte Firestore-first est nécessaire** (voir `refactor-plan.md`). Mais il faut un moment calme pour la faire propre, pas dans l'urgence d'un match.

6. **listCoachFinishedMatches() est un bug latent** : lit localStorage → divergence entre devices sur l'historique. À refondre vers Firestore.

7. **Les matchs FFF saison prochaine (DOFA) polluent** : DOFA remonte des placeholders calendrier avec `?` comme adversaire et `02h00` (artefact UTC midnight). Le filtre `_isSuspiciousFFFMatch` les exclut.

8. **Florian veut toujours la commande `git push` en bloc visible séparé**, pas inline. Important pour son workflow Git Bash.

9. **L'event sourcing du chrono** est la VRAIE solution au cross-device : les events sont déjà sync via Firestore (`M.ev` dans le payload), il suffit de calculer le chrono depuis ces events au lieu de stocker des champs tSt/tOff fragiles.

10. **Cette skill `coach-du-dimanche-architecture` a été créée à la fin de cette session** pour ne plus repartir de zéro la prochaine fois.

### Versions cache buster atteintes (fin de session 26/05)
- `firebase-sync.js` v167
- `match-engine.js` v134
- `data-bridge.js` v136
- `screen-match-live-v2.jsx` v131
- `screen-home.jsx` v164
- `screen-onb-set.jsx` v100

### Restant à faire (prochaine session)

1. **Refonte Firestore-first** (voir `refactor-plan.md`) — chantier principal
2. **Refondre `listCoachFinishedMatches()`** pour lire le cloud → historique cohérent cross-device
3. **Auto-end** des matchs qui traînent > 6h sans activité → plus de fantômes éternels
4. **Tester la skill** : démarrer une session fraîche et vérifier qu'elle se charge correctement
5. **Mettre à jour `HANDOFF.md`** avec un résumé de cette session
6. **Phase 0 de la refonte** : bannière "cloud injoignable" si test Firestore échoue au mount (résout 80% des bugs "ad-blocker invisible")

### État émotionnel / contexte humain (utile pour la prochaine session)

Florian a passé 14h sur cette session, beaucoup de frustration cumulée par les bugs en cascade. Il a explicitement demandé "centralisé les datas, la personne qui arbitre ou rentre les données toutes les données vont en ligne, les autres se tiennent au courant par un moyen technique fiable, il faut mettre en place le nécessaire".

C'est exactement la refonte Firestore-first. La prochaine session devrait commencer par :
1. Confirmer qu'il est frais et dispo pour une session ciblée (3-4h)
2. Charger cette skill automatiquement (devrait se faire seul si elle est dans `.claude/skills/`)
3. Discuter Phase 0 (détection cloud bloqué) avant Phase 1+2 (URL canonique + Firestore-first read)
4. Ne PAS commencer en plein milieu d'un test de match — choisir un moment calme

---

## Template pour la prochaine session

À la fin de chaque session, copier ce template ci-dessous et le remplir :

```markdown
## Session AAAA-MM-JJ — [Sujet principal]

### Durée
[X heures]

### Contexte initial
[Ce que Florian voulait faire / le problème de départ]

### Commits poussés
[Liste avec hash + sujet + apport]

### Leçons apprises
[Choses qu'on a appris pour les futures sessions]

### Versions cache buster (fin de session)
[Liste des `?v=` actuels]

### Restant à faire
[Backlog priorisé]
```
