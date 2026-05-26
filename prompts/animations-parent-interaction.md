# 🎬 Prompts chaînés — Animations + UX interactions parent live

> **Créé le** : 2026-05-26 (session marathon Florian/Claude)
> **Objectif** : générer un système d'interactions parent innovantes pendant le match live
> **Workflow** : Grok (animations brutes) → Claude Design (intégration UX) → Claude Code (implémentation)

---

## 📌 Contexte

Aujourd'hui les parents sont **passifs** pendant un match live sur Coach du Dimanche :
ils voient le score temps réel mais ne peuvent **rien faire**. Cette série de prompts vise à créer
des interactions émotionnelles, innovantes et safe pour les enfants, qui permettent aux parents
d'envoyer des réactions (applaudissements, soutien, wow…) et au coach de voir un "thermomètre"
de l'ambiance famille en direct.

Inspirations possibles : Twitch raids, Apple Music Karaoke, FotMob reactions, Strava kudos.

---

## 🎬 PROMPT 1 — Pour Grok (générer les animations)

> Colle ce prompt dans **Grok**, attends 5-10 min de génération, copie l'intégralité de la
> réponse pour la passer au prompt 2.

```
Tu es un expert animation web (CSS, SVG, Lottie, motion design). Je vais 
intégrer tes propositions dans une PWA mobile-first pour le foot amateur 
familial (parents, enfants, coachs). Pas de framework lourd, animations 
performantes sur mobile entrée de gamme.

CONTEXTE PRODUIT
- App : Coach du Dimanche — suivi de matchs par les familles
- Profil cible : parents de joueurs U7→U18 + adultes amateurs
- Moment d'usage : pendant un match en direct, en bord de terrain
- Ambiance : enthousiaste, chaleureuse, familiale (jamais agressive)
- Couleurs principales : vert #c8f169 (accent), bleu #3b82f6, jaune #fbbf24
- Fond : sombre #0a0e14, texte #fff

CONTRAINTES TECHNIQUES STRICTES
- HTML + CSS pur (ou inline SVG). PAS de JS framework, PAS de canvas WebGL.
- 60fps sur iPhone 11 minimum. Pas d'animation > 2 sec.
- Tailles : ≤ 5 Ko de CSS, ≤ 15 Ko de SVG par animation
- Compatible iOS Safari + Chrome Android (pas de @keyframes fancy non supportés)
- Respecter prefers-reduced-motion (fallback simple)
- Pas de dépendances externes (pas de Lottie player, pas de GSAP)

CATÉGORIES D'ANIMATIONS À PRODUIRE
1. RÉACTIONS PARENT (1 tap → emoji flottant qui monte et s'évanouit)
   - 👏 Applaudissements
   - ❤️ Soutien
   - 😱 Wow / déception
   - 🔥 Action de feu
   - 🤝 Fair-play
   → 5 versions, animation 1.2s, partant du doigt, montant 200px, fade out
   → Doit pouvoir s'empiler (multiple instances simultanées)

2. "L'ÉQUIPE VIBRE" — bandeau agrégé (50 parents ont applaudi en 10s)
   → Bandeau horizontal qui pulse, gradient animé vert→bleu
   → Compteur qui grimpe avec effet odomètre
   → 3 niveaux d'intensité (calme / chaud / explosion)

3. BUT MARQUÉ — célébration full-screen 2s
   → Texte "BUT !" qui zoom + rotate léger + glow
   → Particules confettis CSS pure (pas de canvas)
   → Variante "BUT ADVERSE" plus sobre (sans confettis, juste un éclair gris)

4. CHRONO TENSION — mi-temps qui s'achève (90'+3, dernières 30s)
   → Pulse rouge subtil autour du chrono
   → Tick-tock latéral (left/right shake 2px)
   → Crescendo visuel sans son

5. INDICATEUR PRÉSENCE FAMILLE — "5 parents en ligne maintenant"
   → 5 points colorés qui dansent en vague (chacun avec délai)
   → Apparition/disparition smooth quand le nombre change

FORMAT DE RÉPONSE ATTENDU
Pour chaque animation, livre exactement :
### [NOM]
**Effet** : (1 ligne descriptive)
**Trigger** : (event qui la déclenche)
**Durée** : (ms)
**Code HTML** :
<pre>...</pre>
**Code CSS** :
<pre>...</pre>
**Preview ASCII** : (frame clé en 3-5 lignes ASCII art)
**Variantes** : (idée pour décliner — intensité, couleur, etc.)

À LA FIN
- Tableau récapitulatif des 5 catégories × variantes
- Recommandation : laquelle est la PLUS "wow" à montrer en démo ?
- Animation bonus que tu inventes spécifiquement pour le foot amateur familial
  (qui n'existe nulle part ailleurs)

Sois CONCRET. Pas de "vous pourriez utiliser…". Du code copiable direct.
Si une animation est trop complexe pour CSS pur, propose une variante SVG
inline avec animation SMIL (oui SMIL marche sur mobile en 2026).
```

---

## 🎨 PROMPT 2 — Pour Claude Design (intégrer dans le système UX)

> À utiliser APRÈS avoir reçu la réponse de Grok. Colle la sortie Grok à l'endroit
> marqué `[COLLER ICI LA RÉPONSE COMPLÈTE DE GROK]`.

```
Tu es designer UX produit senior spécialisé apps sportives familiales 
(références : FotMob, OneFootball, Strava, Apple Sports). Mission : 
intégrer un set d'animations brutes dans un système d'interactions 
cohérent pour la PWA "Coach du Dimanche".

CONTEXTE
- App déjà fonctionnelle, dans une version stable
- Aujourd'hui les parents sont PASSIFS pendant le match : ils voient le 
  score temps réel mais ne peuvent rien faire
- Objectif : créer un système de réactions parent qui :
  * Soit émotionnel sans toxique
  * Donne au coach un "thermomètre famille"
  * Renforce le sentiment de tribu
  * Soit safe pour enfants

ANIMATIONS DÉJÀ DISPONIBLES (sortie Grok ci-dessous)
[COLLER ICI LA RÉPONSE COMPLÈTE DE GROK]

TON TRAVAIL
1. AUDIT : pour chaque animation Grok, dis si elle s'intègre bien à 
   l'ambiance Coach du Dimanche ou pas (et pourquoi)
2. SYSTÈME : propose un système d'interactions cohérent qui utilise 
   3-5 animations Grok bien choisies
3. PARCOURS : décris le flow utilisateur parent pendant un match :
   - Avant kick-off
   - Pendant les actions  
   - Après un but pour notre équipe
   - Après un but adverse
   - À la mi-temps
   - À la fin
4. ANTI-PATTERNS : qu'est-ce qu'il NE FAUT PAS faire ?
5. DASHBOARD COACH : comment le coach voit l'ambiance parent en live 
   sans être distrait de son arbitrage
6. WIREFRAMES : 3 écrans clés en ASCII art ou Mermaid :
   - Vue parent pendant match (réactions disponibles)
   - Vue coach (thermomètre ambiance)
   - Vue post-match (récap "Ambiance familiale du jour")
7. MODÈLE DATA : Firestore minimal pour stocker les réactions sans 
   exploser la limite 1Mo/doc. Rules d'écriture (qui peut envoyer quoi ?)
8. ROADMAP : MVP en 3 phases, du plus simple au plus ambitieux

CONTRAINTES PROJET
- Backend Firebase plan Spark (pas de Cloud Functions)
- Pas de notifications push natives
- 1-50 parents par match
- L'app doit rester utilisable sans cet ajout (feature optionnelle)

LIVRABLE
Un mini design doc structuré sections 1→8 ci-dessus.
Markdown propre, sections claires, schémas inclus.
Ton : pragmatique, design-driven, jamais "ça pourrait être bien si…".
```

---

## 🛠️ Workflow d'utilisation

```
┌─────────────┐      ┌──────────────────┐      ┌────────────────┐
│   PROMPT 1  │ ───→ │   PROMPT 2       │ ───→ │  CLAUDE CODE   │
│   (Grok)    │      │  (Claude Design) │      │  (intégration) │
└─────────────┘      └──────────────────┘      └────────────────┘
   animations          design doc             code dans le repo
   brutes              + flow UX              Coach du Dimanche
```

1. **Lance PROMPT 1 dans Grok** → tu obtiens du code HTML/CSS/SVG d'animations
2. **Colle la sortie dans PROMPT 2 → Claude Design** → tu obtiens un design doc complet
3. **Reviens dans Claude Code (ce repo)** avec le design doc → on intègre dans l'app

---

## 💡 Astuces

### Si la sortie Grok ne te plaît pas visuellement
Demande-lui :
> "Refais avec un style plus [glassmorphism / neon / paper / 8-bit / Pixar / minimaliste japonais].
> Garde les contraintes techniques."

### Si tu veux tester sans pousser dans l'app
Demande à Grok :
> "Mets-moi un seul HTML autonome avec tes 5 animations dans des `<div>` séparés.
> Je veux ouvrir le fichier dans Chrome pour les voir tourner."

### Pour adapter à d'autres profils
Tu peux dériver des animations pour :
- **Joueurs** (auto-encouragement avant match)
- **Adjoints** (signaler "bien joué" au coach)
- **Lecteur public** (réactions limitées, anti-spam)

---

## 📎 Liens utiles à connaître

- **Grok** : https://grok.com (compte X requis)
- **Claude.ai** : https://claude.ai (pour Claude Design en chat)
- **Repo Coach du Dimanche** : github.com/architechfr/coach-du-dimanche-redesign
- **App en prod** : coach-du-dimanche-redesign.vercel.app

---

## 🗒️ Notes pour reprise plus tard

- Ce fichier vit dans `prompts/animations-parent-interaction.md` du repo
- Il est versionné Git → accessible depuis n'importe quel device qui pull
- Pour le copier : ouvre GitHub web, navigue à ce fichier, bouton "Copy raw file"
- Ou dans Claude Code, juste demande "lis prompts/animations-parent-interaction.md"
- Ou dans cowork : référence le fichier path

**Pour reprendre dans un nouveau chat Claude** :
> "Lis prompts/animations-parent-interaction.md du projet Coach du Dimanche V2.
> J'ai la sortie Grok ci-dessous, applique le prompt 2 puis on implémente."
