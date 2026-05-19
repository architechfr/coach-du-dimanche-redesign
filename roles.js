/* ============================================================
   ROLES & PERMISSIONS — squelette pour Phase 3 (Auth réelle)
   ============================================================
   Architecture d'identité côté front. Tant que Firebase Auth n'est pas
   branché (Phase 3), les rôles sont stockés en localStorage et tout le
   monde est de facto "owner local" de son appareil. Quand Auth arrive,
   on charge les claims depuis Firebase (custom claims) et on utilise
   les mêmes helpers — aucun changement côté UI.

   Storage actuel :
     cdd_user_role          → string  (rôle de l'utilisateur courant)
     cdd_user_email         → string  (email si configuré)
     cdd_coach_name         → string  (nom affiché)
     cdd_user_scope         → JSON    (clubIds[], teamIds[], playerIds[])

   Storage futur (Phase 3) :
     window.cddAuth.currentUser.claims = { role, clubIds, teamIds, playerIds }
   ============================================================ */

(function () {
  // Définition canonique des rôles (référence unique pour toute l'app)
  const ROLES = {
    OWNER:    { id: 'owner',    label: 'Owner',           weight: 100 },
    ADMIN:    { id: 'admin',    label: 'Admin club',      weight: 80  },
    COACH:    { id: 'coach',    label: 'Coach',           weight: 60  },
    ADJOINT:  { id: 'adjoint',  label: 'Coach adjoint',   weight: 55  },
    DIRIGEANT:{ id: 'dirigeant',label: 'Dirigeant',       weight: 50  },
    ECOLE:    { id: 'ecole',    label: 'École de foot',   weight: 45  },
    PARENT:   { id: 'parent',   label: 'Parent',          weight: 20  },
    JOUEUR:   { id: 'joueur',   label: 'Joueur',          weight: 20  },
    LECTEUR:  { id: 'lecteur',  label: 'Lecteur',         weight: 10  },
  };

  // Email owner de fait — quand on aura Auth, ce sera détecté par claims.
  const OWNER_EMAIL = 'archi.tech.fr@gmail.com';

  function currentRole() {
    try {
      const email = (localStorage.getItem('cdd_user_email') || '').toLowerCase();
      if (email === OWNER_EMAIL) return 'owner';
      const stored = localStorage.getItem('cdd_user_role');
      if (stored && ROLES[stored.toUpperCase()]) return stored;
      // Fallback : si l'utilisateur a au moins un club, on le considère owner local
      // de son appareil (Phase < 3, pas d'auth réelle).
      const teams = JSON.parse(localStorage.getItem('arb_teams') || '[]');
      if (teams.length > 0) return 'coach';
      return 'coach';
    } catch (e) { return 'coach'; }
  }

  function roleLabel(roleId) {
    const r = ROLES[String(roleId || '').toUpperCase()];
    return r ? r.label : (roleId || '?');
  }

  function roleWeight(roleId) {
    const r = ROLES[String(roleId || '').toUpperCase()];
    return r ? r.weight : 0;
  }

  function hasRole(roleOrList) {
    const cur = currentRole();
    if (Array.isArray(roleOrList)) return roleOrList.includes(cur);
    return cur === roleOrList;
  }

  // Vrai si l'utilisateur a au moins le poids du rôle demandé.
  // Ex : atLeast('coach') accepte coach/admin/owner mais pas parent.
  function atLeast(roleId) {
    return roleWeight(currentRole()) >= roleWeight(roleId);
  }

  // Scope : limites de portée (quels clubs/équipes/joueurs l'utilisateur voit)
  function getScope() {
    try {
      const raw = localStorage.getItem('cdd_user_scope');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    // Sans scope explicite : owner local voit tout
    return { clubIds: null, teamIds: null, playerIds: null };
  }

  // Permissions canoniques — utilisées par les écrans pour conditionner l'UI.
  // Quand Phase 3 sera là, ces fonctions iront aussi vérifier les claims
  // Firestore (server-side enforcement via rules).
  function canEditClub(clubId) {
    if (atLeast('admin')) return true;
    const scope = getScope();
    if (!scope.clubIds) return atLeast('coach'); // owner local
    return scope.clubIds.includes(clubId) && atLeast('coach');
  }

  function canEditTeam(teamId) {
    if (atLeast('admin')) return true;
    const scope = getScope();
    if (!scope.teamIds) return atLeast('coach');
    return scope.teamIds.includes(teamId) && atLeast('coach');
  }

  function canViewPlayer(playerId) {
    if (atLeast('coach')) return true;
    const scope = getScope();
    if (scope.playerIds && scope.playerIds.includes(playerId)) return true;
    // Parent voit l'équipe par défaut (cas habituel)
    return hasRole(['parent', 'joueur', 'dirigeant', 'lecteur']);
  }

  function canInviteRole(targetRole) {
    // Owner peut tout inviter. Admin peut tout sauf owner. Coach invite parents/joueurs/lecteurs.
    if (hasRole('owner')) return true;
    if (hasRole('admin')) return targetRole !== 'owner';
    if (atLeast('coach')) return ['parent', 'joueur', 'lecteur'].includes(targetRole);
    return false;
  }

  function canDeleteClub() {
    return hasRole('owner');
  }

  // Stub pour Phase 3 : crée une structure d'invitation (token + scope) en local.
  // Sans serveur, ces tokens ne sont pas vraiment sécurisés (n'importe qui peut en forger),
  // donc on les utilise seulement pour le test/proto en attendant Firestore.
  function createInvitationDraft({ role, scope, expiresInDays }) {
    const token = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(36).padStart(2, '0')).join('').slice(0, 24).toUpperCase();
    const now = Date.now();
    const inv = {
      token,
      role,
      scope: scope || {},
      createdAt: now,
      createdBy: localStorage.getItem('cdd_user_email') || localStorage.getItem('cdd_coach_name') || 'anonyme',
      expiresAt: now + (expiresInDays || 7) * 86400000,
      consumed: false,
    };
    try {
      const all = JSON.parse(localStorage.getItem('cdd_invitations') || '[]');
      all.unshift(inv);
      localStorage.setItem('cdd_invitations', JSON.stringify(all.slice(0, 100)));
    } catch (e) {}
    return inv;
  }

  function listInvitations() {
    try { return JSON.parse(localStorage.getItem('cdd_invitations') || '[]'); }
    catch (e) { return []; }
  }

  // Expose
  window.CDD_ROLES = {
    ROLES, OWNER_EMAIL,
    currentRole, roleLabel, roleWeight, hasRole, atLeast,
    getScope, canEditClub, canEditTeam, canViewPlayer,
    canInviteRole, canDeleteClub,
    createInvitationDraft, listInvitations,
  };

  // Évènement pour les écrans qui veulent réagir à un changement de rôle
  window.dispatchEvent(new CustomEvent('cdd-roles-ready'));
})();
