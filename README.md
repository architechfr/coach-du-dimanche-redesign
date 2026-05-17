# Coach du Dimanche — Redesign Prototype (FIFA × FM)

## 🚀 Déploiement test

### Option recommandée : nouveau projet Vercel séparé pour tester

L'objectif : **garder ton index.html actuel intact** sur ta prod, et avoir une **URL séparée** pour tester le redesign avec tes vraies données. Une fois validé, on intègre.

#### Étapes (15 min)

1. **Créer un nouveau repo GitHub**
   ```bash
   # Sur ton ordinateur
   mkdir coach-du-dimanche-redesign
   cd coach-du-dimanche-redesign
   git init
   # Copier tous les fichiers de ce projet ici
   git add .
   git commit -m "Initial redesign prototype"
   git remote add origin https://github.com/architechfr/coach-du-dimanche-redesign.git
   git push -u origin main
   ```

2. **Déployer sur Vercel**
   - Va sur https://vercel.com/new
   - Importe le repo GitHub que tu viens de créer
   - **Aucune config build** nécessaire — c'est du HTML/CSS/JS pur
   - Vercel détecte automatiquement → Deploy
   - URL générée : `coach-du-dimanche-redesign-xxx.vercel.app`

3. **Tester avec tes vraies données**
   - Ouvre l'URL Vercel
   - Va sur `/Coach du Dimanche — Real Data.html`
   - Tu vois le HUD à gauche avec FCMH/USDF
   - Tape ↻ Rafraîchir FFF → tes vrais classements (FCMH U15 D2 + USDF Vétérans D2)
   - Tout l'effectif Magny U15 (Laighor, Mamadou, Sékou…) avec photos FFF

#### Page d'entrée

Tu peux créer un `index.html` à la racine qui redirige vers la version Real Data :

```html
<!DOCTYPE html>
<meta http-equiv="refresh" content="0; url=Coach du Dimanche — Real Data.html">
```

---

### Option alternative : branche sur ton repo existant

Si tu préfères tout avoir au même endroit :

```bash
cd coach-du-dimanche
git checkout -b redesign-fifa-fm
# Copier les fichiers du proto dans un sous-dossier ./v2/
mkdir v2
# (copier tous les .html .css .jsx .js de ce projet dans ./v2/)
git add v2/
git commit -m "Add v2 redesign prototype"
git push -u origin redesign-fifa-fm
```

Vercel te déploie automatiquement le preview à `coach-du-dimanche-git-redesign-fifa-fm-xxx.vercel.app/v2/` à chaque push.

---

## 📂 Structure du projet

```
.
├── Coach du Dimanche — Real Data.html   ← Version BRANCHÉE sur ton seed FFF (recommandée)
├── Coach du Dimanche — Redesign.html    ← Version avec mock data
│
├── theme.css                            ← Design tokens (couleurs, type)
├── screens.css                          ← Styles écrans 1
├── screens-2.css                        ← Styles écrans 2
├── screens-3.css                        ← Styles écrans 3
├── vibe-9.css                           ← Effets néon/glow
├── animations-plus.css                  ← Anims & transitions
├── overlays.css                         ← Sheets/modaux
├── player-card.css                      ← Cartes FUT
├── debug-hud.css                        ← HUD cloisonnement
├── fff-live.css                         ← Indicateurs FFF live
├── fiche-v2.css / fiche-v3.css          ← Fiche joueur
├── effectif-v2.css                      ← Filtres recherche
├── lineup-v2.css                        ← Compo / formations
├── quick-theme.css                      ← Palette couleurs
├── home-tiles-v2.css                    ← Tuiles d'accueil
│
├── data-adapter.js                      ★ Adapter cloisonnement (à brancher sur ton storage)
├── data-bridge.js                       ★ Pont entre adapter et UI
├── fff-fetcher.js                       ★ API FFF DOFA (cache 7j)
├── coach-overrides.js                   ★ Overrides coach (statut, stats, notes)
├── seed-inline.js                       ★ Tes données réelles
│
├── player-card.jsx                      ← FutCard component
├── tweaks-panel.jsx                     ← Panel design
├── debug-hud.jsx                        ← HUD visualisation
├── quick-theme.jsx                      ← Color picker
│
├── screen-home.jsx
├── screen-effectif-lineup.jsx
├── screen-match-fiche.jsx
├── screen-results-conv.jsx
├── screen-onb-set.jsx
├── screen-prep-arb-lec-vote.jsx
├── screen-transfert-sync-convp.jsx
├── app.jsx                              ← Orchestrateur principal
│
├── assets/                              ← Tes vrais visuels + photos FFF U15
│   ├── banner-*.jpg
│   ├── coach-hero.jpg
│   ├── hero-coach-dashboard.jpg
│   └── photos_U15_2025-2026/            ← Photos joueurs FFF (45 fichiers)
│
└── seed-real-data.json                  ← Snapshot de ton localStorage (FCMH + USDF)
```

---

## ⚙️ Configuration FFF

Les 2 équipes configurées dans `seed-inline.js` :

| Équipe | competId | group | label |
|---|---|---|---|
| **FCMH U15 A** | 443115 | 2 | U15 D2 |
| **USDF Vétérans** | 442623 | 2 | VETERANS D2 |

Une fois en prod, le `data-adapter.js` lira automatiquement le vrai `localStorage` de ton app (clés `arb_clubs`, `arb_teams`, `arb_current_club`, `arb_fff_config`, etc.). Le seed n'est utilisé que si localStorage est vide.

---

## 🔒 Cloisonnement garanti

Le `data-adapter.js` est le **seul fichier qui lit le storage**. Toutes les fonctions filtrent automatiquement par `arb_current_club`. Le HUD à gauche montre en live :
- Combien d'équipes sont visibles
- Combien sont bloquées (autre club)
- Combien de tentatives de fuite ont été interceptées

C'est le fix de ton bug v43.46 appliqué partout : **on relit à chaque appel**, pas de cache stale.

---

## 🎨 Personnalisation coach

Les coach overrides sont stockés dans :
- `cdd_player_status_override` — statut Disponible/Blessé/Suspendu/Réserve
- `cdd_player_stats_override` — sliders OVR par joueur
- `cdd_player_name_override` — corrections de prénoms/noms
- `cdd_player_notes` — observations du coach
- `cdd_lineup_template` — compo par équipe (formation + slots)

Quand tu intégreras dans ton repo, ces clés peuvent être synchronisées vers Firestore via ton `pushUserDoc()` existant. Aucune modification de ta logique métier nécessaire.

---

## 🧪 Stars de l'équipe Magny U15 (calibrés manuellement)

5 joueurs identifiés par le coach avec bonus stats :

| # | Joueur | Rareté | Note |
|---|---|---|---|
| 11 | **Laighor BOYLAMBA** | 🌟 HERO | Capitaine, +12 base |
| 6 | **Mamadou BAMBA** | 💎 ICON | DC exceptionnel, +11 |
| 10 | **Djibril TRAORE** | 💎 ICON | Meneur de jeu, +11 |
| 8 | **Grace Appolinaire ITOUA** | ⚫ TOTW | Milieu box-to-box, +10 |
| 5 | **Sékou DOUMBIA** | 🌟 HERO | Polyvalent (pas de malus DEF), +12 |

À modifier dans `data-bridge.js` → `STAR_BONUSES` et `STAR_RARITIES`.

---

## 📝 Prochaines étapes (après validation visuelle)

1. **Match Live interactif** : clic but → modal joueur → score s'incrémente avec animation
2. **Pack opening** : animation FUT pack reveal quand on tape une carte
3. **Drag & drop sur compo** : déplacer les joueurs au doigt sur le terrain
4. **Intégration data-adapter dans ton index.html** : remplacer les lectures directes localStorage par CDD.getX()
5. **Page lecteur** : décliner le redesign pour `/lecteur/index.html`

---

## 🐛 Limitations du proto

- **CORS proxies** peuvent être bloqués par CSP de l'iframe sandbox de design — en prod Vercel ça marche
- **Score incréments live** simulés (à brancher sur ton match engine)
- **Stats individuelles joueur** générées heuristiquement (à brancher sur tes événements Firestore)

---

Bon déploiement 🚀
