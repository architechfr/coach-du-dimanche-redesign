/* ============================================================
   seed-inline.js — Phase C / C3 : SEED VIDÉ
   ============================================================
   Les vraies données (clubs, équipes, joueurs — dont des mineurs)
   ne sont PLUS embarquées dans le bundle public ni le dépôt GitHub.
   C'est une exigence RGPD : pas de données personnelles d'enfants
   dans du code accessible publiquement.

   La source de vérité des données est désormais Firestore (cf C2).
   Un appareil neuf démarre vide ; les données autorisées sont
   chargées depuis le cloud (C3 — lecture cloud).

   L'historique des anciennes données reste récupérable via Git.
============================================================ */
window.__CDD_SEED = {
  clubs: [],
  current: null,
  active_context: { clubId: null, teamId: null, matchId: null },
  teams: [],
};
