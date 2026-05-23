/* ============================================================
   POSITION RATING — Notation des joueurs pondérée par poste
   ============================================================
   Source de vérité unique pour la note moyenne (OVR) d'un joueur.

   Principe : l'OVR n'est PAS une moyenne plate des 6 stats. Chaque
   poste évalue les 6 stats avec sa propre pondération (somme = 100).
   Un défenseur n'est pas pénalisé par une faible finition ; un
   attaquant n'est pas pénalisé par de faibles caractéristiques
   défensives. Un joueur est jugé sur ce qui compte À SON POSTE.

   7 profils de notation. Les 12 codes de poste de l'UI
   (CDD_COACH.POSITION_CHOICES) sont rabattus sur ces 7 profils.

   Le gardien dispose de 6 stats DÉDIÉES (plongeon, réflexes, jeu au
   pied, détente, placement, duel) — ce sont les mêmes 6 emplacements
   numériques (PAC..PHY) mais relibellés selon le poste.

   Exposé : window.CDD_RATING
   ============================================================ */
(function () {
  'use strict';

  // Les 6 emplacements de stats, dans l'ordre carte/radar.
  var STAT_KEYS = ['PAC', 'SHO', 'PAS', 'DRI', 'DEF', 'PHY'];

  var STAT_MIN = 40, STAT_MAX = 99;

  // ---- Libellés des 6 emplacements ----
  // Joueur de champ
  var FIELD_LABELS = {
    PAC: 'VITESSE', SHO: 'TIR', PAS: 'PASSE',
    DRI: 'DRIBBLE', DEF: 'DÉFENSE', PHY: 'PHYSIQUE',
  };
  var FIELD_SHORT = {
    PAC: 'VIT', SHO: 'TIR', PAS: 'PAS',
    DRI: 'DRI', DEF: 'DEF', PHY: 'PHY',
  };
  // Gardien — 6 stats dédiées sur les mêmes emplacements
  var GK_LABELS = {
    PAC: 'DÉTENTE', SHO: 'PLONGEON', PAS: 'JEU AU PIED',
    DRI: 'PLACEMENT', DEF: 'DUEL (1v1)', PHY: 'RÉFLEXES',
  };
  var GK_SHORT = {
    PAC: 'DÉT', SHO: 'PLG', PAS: 'JEU',
    DRI: 'PLC', DEF: 'DUE', PHY: 'RÉF',
  };

  // ---- 7 profils de notation ----
  // weights : pondération sur 100 des 6 emplacements PAC..PHY.
  // labelsLong / labelsShort : libellés contextualisés selon le poste —
  // un attaquant a « FINITION » au lieu de « TIR », un défenseur a
  // « MARQUAGE » au lieu de « DÉFENSE », un milieu offensif a « VISION
  // DU JEU » au lieu de « PASSE ». Si absents, fallback FIELD_LABELS.
  var PROFILES = {
    gk: {
      id: 'gk', label: 'Gardien', gk: true,
      // RÉFLEXES 24 · PLONGEON 22 · PLACEMENT 20 · DUEL 16 · DÉTENTE 10 · JEU AU PIED 8
      weights: { PAC: 10, SHO: 22, PAS: 8, DRI: 20, DEF: 16, PHY: 24 },
      labelsLong:  GK_LABELS,
      labelsShort: GK_SHORT,
    },
    dc: {
      id: 'dc', label: 'Défenseur central', gk: false,
      // DÉFENSE 30 · PHYSIQUE 25 · VITESSE 15 · PASSE 15 · DRIBBLE 10 · TIR 5
      weights: { PAC: 15, SHO: 5, PAS: 15, DRI: 10, DEF: 30, PHY: 25 },
      labelsLong: {
        PAC: 'VITESSE',     SHO: 'TIR LOINTAIN', PAS: 'RELANCE',
        DRI: 'CONDUITE',    DEF: 'MARQUAGE',     PHY: 'DUEL AÉRIEN',
      },
      labelsShort: { PAC: 'VIT', SHO: 'TIR', PAS: 'REL', DRI: 'CDU', DEF: 'MAR', PHY: 'DUE' },
    },
    lat: {
      id: 'lat', label: 'Latéral', gk: false,
      // VITESSE 24 · DÉFENSE 22 · PHYSIQUE 16 · PASSE 16 · DRIBBLE 16 · TIR 6
      weights: { PAC: 24, SHO: 6, PAS: 16, DRI: 16, DEF: 22, PHY: 16 },
      labelsLong: {
        PAC: 'VITESSE',     SHO: 'FRAPPE',       PAS: 'CENTRE',
        DRI: 'CONDUITE',    DEF: 'MARQUAGE',     PHY: 'ENDURANCE',
      },
      labelsShort: { PAC: 'VIT', SHO: 'FRP', PAS: 'CTR', DRI: 'CDU', DEF: 'MAR', PHY: 'END' },
    },
    mdef: {
      id: 'mdef', label: 'Milieu récupérateur', gk: false,
      // PASSE 24 · DÉFENSE 24 · PHYSIQUE 22 · DRIBBLE 14 · VITESSE 10 · TIR 6
      weights: { PAC: 10, SHO: 6, PAS: 24, DRI: 14, DEF: 24, PHY: 22 },
      labelsLong: {
        PAC: 'VITESSE',      SHO: 'FRAPPE LOINTAINE', PAS: 'DISTRIBUTION',
        DRI: 'CONDUITE',     DEF: 'RÉCUPÉRATION',     PHY: 'ENGAGEMENT',
      },
      labelsShort: { PAC: 'VIT', SHO: 'FRP', PAS: 'DIS', DRI: 'CDU', DEF: 'RCP', PHY: 'ENG' },
    },
    moff: {
      id: 'moff', label: 'Milieu offensif', gk: false,
      // PASSE 26 · DRIBBLE 24 · VITESSE 16 · TIR 16 · PHYSIQUE 10 · DÉFENSE 8
      weights: { PAC: 16, SHO: 16, PAS: 26, DRI: 24, DEF: 8, PHY: 10 },
      labelsLong: {
        PAC: 'ACCÉLÉRATION', SHO: 'FRAPPE',       PAS: 'VISION DU JEU',
        DRI: 'DRIBBLE COURT', DEF: 'REPLI',       PHY: 'ENDURANCE',
      },
      labelsShort: { PAC: 'ACC', SHO: 'FRP', PAS: 'VIS', DRI: 'DRI', DEF: 'RPL', PHY: 'END' },
    },
    ail: {
      id: 'ail', label: 'Ailier', gk: false,
      // VITESSE 26 · DRIBBLE 26 · PASSE 16 · TIR 16 · PHYSIQUE 10 · DÉFENSE 6
      weights: { PAC: 26, SHO: 16, PAS: 16, DRI: 26, DEF: 6, PHY: 10 },
      labelsLong: {
        PAC: 'POINTE DE VITESSE', SHO: 'FRAPPE',   PAS: 'CENTRE',
        DRI: 'DRIBBLE',           DEF: 'REPLI DÉFENSIF', PHY: 'ENDURANCE',
      },
      labelsShort: { PAC: 'VIT', SHO: 'FRP', PAS: 'CTR', DRI: 'DRI', DEF: 'RPL', PHY: 'END' },
    },
    bu: {
      id: 'bu', label: 'Attaquant de pointe', gk: false,
      // TIR 33 · VITESSE 22 · DRIBBLE 20 · PHYSIQUE 12 · PASSE 9 · DÉFENSE 4
      weights: { PAC: 22, SHO: 33, PAS: 9, DRI: 20, DEF: 4, PHY: 12 },
      labelsLong: {
        PAC: 'DÉMARQUAGE', SHO: 'FINITION', PAS: 'REMISE',
        DRI: 'CONTRÔLE',   DEF: 'PRESSING', PHY: 'DUEL',
      },
      labelsShort: { PAC: 'DMQ', SHO: 'FIN', PAS: 'REM', DRI: 'CTR', DEF: 'PRS', PHY: 'DUE' },
    },
  };

  // ---- Mapping des 12 codes UI → 7 profils ----
  var POSITION_TO_PROFILE = {
    GK: 'gk',
    DC: 'dc',
    DG: 'lat', DD: 'lat',
    DM: 'mdef',
    MC: 'moff', MOC: 'moff',
    ML: 'ail', MD: 'ail', AG: 'ail', AD: 'ail',
    BU: 'bu', ATT: 'bu',
  };

  function clamp(v) {
    return Math.max(STAT_MIN, Math.min(STAT_MAX, v));
  }

  // Code de poste → id de profil (défaut : milieu offensif, profil neutre).
  function profileIdFor(posCode) {
    if (!posCode) return 'moff';
    return POSITION_TO_PROFILE[String(posCode).toUpperCase()] || 'moff';
  }

  function profileFor(posCode) {
    return PROFILES[profileIdFor(posCode)];
  }

  function isGK(posCode) {
    return profileIdFor(posCode) === 'gk';
  }

  // Libellés des 6 stats pour un poste. Chaque profil peut spécifier ses
  // propres labelsLong / labelsShort contextualisés (FINITION pour un BU,
  // MARQUAGE pour un DC, VISION DU JEU pour un MOC…). Si le profil n'en a
  // pas, on retombe sur FIELD_LABELS (joueur de champ générique).
  function labelsFor(posCode) {
    var prof = profileFor(posCode);
    return {
      long:  (prof && prof.labelsLong)  || FIELD_LABELS,
      short: (prof && prof.labelsShort) || FIELD_SHORT,
    };
  }

  // Moyenne pondérée brute (non arrondie) d'un set de stats pour un poste.
  function weightedRaw(stats, posCode) {
    var w = profileFor(posCode).weights;
    var sum = 0, wsum = 0;
    for (var i = 0; i < STAT_KEYS.length; i++) {
      var k = STAT_KEYS[i];
      var v = (typeof stats[k] === 'number') ? stats[k] : 0;
      sum += v * w[k];
      wsum += w[k];
    }
    return wsum ? sum / wsum : 0;
  }

  // OVR pondéré arrondi — la note moyenne officielle d'un joueur.
  function weightedOverall(stats, posCode) {
    return Math.round(weightedRaw(stats, posCode));
  }

  // ──────────────────────────────────────────────────────────────────
  //  POLYVALENCE — bonus borné, anti-sur-boost (Phase E)
  // ──────────────────────────────────────────────────────────────────
  // Un joueur peut maîtriser plusieurs postes. Règles :
  //  - L'OVR de référence est calculé sur le POSTE PRINCIPAL (jamais un
  //    mélange de pondérations — décision produit 2026-05-21).
  //  - Pour chaque poste secondaire, on calcule l'OVR pondéré sur ce
  //    profil. Le poste est jugé « solide » si :
  //        ovr_alt >= ovr_main - VERSATILITY_TOLERANCE  (le joueur n'est
  //        pas perdu à ce poste — pondération adaptée à ses points forts)
  //      ET ovr_alt >= VERSATILITY_FLOOR                 (niveau minimal
  //        absolu — un joueur médiocre ne se voit pas récompenser parce
  //        qu'il est « médiocre partout »)
  //  - Bonus = min(VERSATILITY_CAP, nb_postes_solides). Cap dur.
  //
  // Conséquence : étiqueter 10 postes secondaires sans qualité réelle ne
  // donne RIEN. Maîtriser 1 poste alternatif vraiment donne +1, 2 → +2.
  var VERSATILITY_TOLERANCE = 4;
  var VERSATILITY_FLOOR     = 75;
  var VERSATILITY_CAP       = 2;

  // Détail polyvalence pour UI (badge + diagnostic mode Détaillé).
  // Renvoie { main: ovrMain, bonus, cap, alts: [{pos, ovr, solid}] }.
  function versatilityReport(stats, mainPos, altPositions) {
    var ovrMain = weightedOverall(stats, mainPos);
    var alts = [];
    var solidCount = 0;
    (altPositions || []).forEach(function (p) {
      if (!p || p === mainPos) return;
      var ovrAlt = weightedOverall(stats, p);
      var solid = (ovrAlt >= ovrMain - VERSATILITY_TOLERANCE)
               && (ovrAlt >= VERSATILITY_FLOOR);
      if (solid) solidCount++;
      alts.push({ pos: p, ovr: ovrAlt, solid: solid });
    });
    return {
      main: ovrMain,
      bonus: Math.min(VERSATILITY_CAP, solidCount),
      cap: VERSATILITY_CAP,
      alts: alts,
    };
  }

  // OVR final, polyvalence comprise. Capé à STAT_MAX.
  function overallWithVersatility(stats, mainPos, altPositions) {
    var r = versatilityReport(stats, mainPos, altPositions);
    return Math.min(STAT_MAX, r.main + r.bonus);
  }

  // Génère un profil de 6 stats TYPÉ pour un poste, dont la moyenne
  // pondérée vaut (à ±1 près) la note globale visée. Sert au mode Rapide :
  // le coach donne poste + note, l'app produit des stats réalistes.
  function quickProfile(posCode, targetNote) {
    var w = profileFor(posCode).weights;
    var target = clamp(targetNote);
    var avgW = 100 / 6; // pondération moyenne d'une stat
    var SPREAD = 16;    // amplitude du typage (écart stat forte / faible)

    var s = {};
    STAT_KEYS.forEach(function (k) {
      s[k] = clamp(target + SPREAD * (w[k] - avgW) / avgW);
    });

    // Recale itérativement pour que la moyenne pondérée == note visée.
    for (var iter = 0; iter < 12; iter++) {
      var diff = target - weightedRaw(s, posCode);
      if (Math.abs(diff) < 0.35) break;
      STAT_KEYS.forEach(function (k) { s[k] = clamp(s[k] + diff); });
    }
    STAT_KEYS.forEach(function (k) { s[k] = Math.round(s[k]); });
    return s;
  }

  window.CDD_RATING = {
    STAT_KEYS: STAT_KEYS,
    STAT_MIN: STAT_MIN,
    STAT_MAX: STAT_MAX,
    PROFILES: PROFILES,
    POSITION_TO_PROFILE: POSITION_TO_PROFILE,
    FIELD_LABELS: FIELD_LABELS,
    FIELD_SHORT: FIELD_SHORT,
    GK_LABELS: GK_LABELS,
    GK_SHORT: GK_SHORT,
    profileIdFor: profileIdFor,
    profileFor: profileFor,
    isGK: isGK,
    labelsFor: labelsFor,
    weightedRaw: weightedRaw,
    weightedOverall: weightedOverall,
    overallWithVersatility: overallWithVersatility,
    versatilityReport: versatilityReport,
    VERSATILITY_TOLERANCE: VERSATILITY_TOLERANCE,
    VERSATILITY_FLOOR: VERSATILITY_FLOOR,
    VERSATILITY_CAP: VERSATILITY_CAP,
    quickProfile: quickProfile,
  };

  console.log('[CDD] position-rating prêt — 7 profils de notation pondérée');
})();
