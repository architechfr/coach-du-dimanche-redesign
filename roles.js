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

  // ═══════════════════════════════════════════════════════════════════
  //  MEMBERSHIPS — couche de rattachement explicite user ↔ club ↔ rôle
  // ═══════════════════════════════════════════════════════════════════
  // Storage : cdd_memberships = [{ email, clubId, role, createdAt, createdBy }]
  // Une membership = un droit explicite sur un club. Sans membership = pas
  // d'accès au club, peu importe que les données soient présentes en local.
  // Quand Phase 3 (Firebase Auth) sera là, cette table sera mirorée en
  // Firestore et les rules Firestore enforceront server-side.

  function getCurrentEmail() {
    try {
      const raw = (localStorage.getItem('cdd_user_email') || '').trim();
      return raw ? raw.toLowerCase() : null;
    } catch (e) { return null; }
  }

  function listMemberships(email) {
    try {
      const all = JSON.parse(localStorage.getItem('cdd_memberships') || '[]');
      const targetEmail = (email || getCurrentEmail() || '').toLowerCase();
      if (!targetEmail) return [];
      return all.filter(m => m && (m.email || '').toLowerCase() === targetEmail);
    } catch (e) { return []; }
  }

  function listAllMemberships() {
    try { return JSON.parse(localStorage.getItem('cdd_memberships') || '[]'); }
    catch (e) { return []; }
  }

  function hasMembership(clubId, email) {
    return listMemberships(email).some(m => m.clubId === clubId);
  }

  function membershipRole(clubId, email) {
    const m = listMemberships(email).find(x => x.clubId === clubId);
    return m ? m.role : null;
  }

  function addMembership(email, clubId, role, opts) {
    if (!email || !clubId || !role) return false;
    const lowEmail = email.toLowerCase();
    try {
      const all = listAllMemberships();
      // Idempotent : si la membership existe deja avec le meme role, ne rien faire
      const existing = all.find(m => (m.email || '').toLowerCase() === lowEmail && m.clubId === clubId);
      if (existing) {
        if (existing.role !== role) {
          existing.role = role;
          existing.updatedAt = Date.now();
          localStorage.setItem('cdd_memberships', JSON.stringify(all));
        }
        return true;
      }
      all.push({
        email: lowEmail,
        clubId,
        role,
        createdAt: Date.now(),
        createdBy: (opts && opts.createdBy) || 'self',
      });
      localStorage.setItem('cdd_memberships', JSON.stringify(all));
      window.dispatchEvent(new CustomEvent('cdd-memberships-changed'));
      return true;
    } catch (e) {
      console.warn('[roles] addMembership failed', e);
      return false;
    }
  }

  function removeMembership(email, clubId) {
    if (!email || !clubId) return false;
    const lowEmail = email.toLowerCase();
    try {
      const all = listAllMemberships();
      const next = all.filter(m => !((m.email || '').toLowerCase() === lowEmail && m.clubId === clubId));
      if (next.length === all.length) return false;
      localStorage.setItem('cdd_memberships', JSON.stringify(next));
      window.dispatchEvent(new CustomEvent('cdd-memberships-changed'));
      return true;
    } catch (e) { return false; }
  }

  // Suppression COMPLETE d'un club : retire la membership ET nettoie toutes
  // les donnees liees (arb_clubs, arb_teams, logos). Utilise par 'Quitter ce club'.
  // Si c'etait le club actif, on bascule sur le premier club restant de l'user.
  function deleteClubAndData(clubId, opts) {
    if (!clubId) return false;
    const email = (opts && opts.email) || getCurrentEmail();
    try {
      // 1. Retirer toutes les memberships sur ce club (tous emails)
      const allM = listAllMemberships();
      const nextM = allM.filter(m => m.clubId !== clubId);
      localStorage.setItem('cdd_memberships', JSON.stringify(nextM));

      // 2. Retirer le club de arb_clubs
      const clubs = JSON.parse(localStorage.getItem('arb_clubs') || '[]');
      const nextClubs = clubs.filter(c => c.id !== clubId);
      localStorage.setItem('arb_clubs', JSON.stringify(nextClubs));

      // 3. Retirer toutes les teams liees
      const teams = JSON.parse(localStorage.getItem('arb_teams') || '[]');
      const removedTeamIds = teams.filter(t => t.clubId === clubId).map(t => t.id);
      const nextTeams = teams.filter(t => t.clubId !== clubId);
      localStorage.setItem('arb_teams', JSON.stringify(nextTeams));

      // 4. Retirer le logo du club
      try {
        const logos = JSON.parse(localStorage.getItem('cdd_club_logos') || '{}');
        if (logos[clubId]) { delete logos[clubId]; localStorage.setItem('cdd_club_logos', JSON.stringify(logos)); }
      } catch (e) {}

      // 5. Si le club actif etait celui-la, basculer sur un autre
      try {
        if (localStorage.getItem('arb_current_club') === clubId) {
          const fallbackClubId = nextClubs[0]?.id || '';
          const fallbackTeamId = nextTeams.find(t => t.clubId === fallbackClubId)?.id || '';
          if (fallbackClubId) {
            localStorage.setItem('arb_current_club', fallbackClubId);
            localStorage.setItem('cdd_active_context', JSON.stringify({
              clubId: fallbackClubId, teamId: fallbackTeamId, matchId: null
            }));
          } else {
            localStorage.removeItem('arb_current_club');
            localStorage.removeItem('cdd_active_context');
          }
        } else {
          // Sinon, juste nettoyer le teamId actif s'il appartenait au club supprime
          const ctx = JSON.parse(localStorage.getItem('cdd_active_context') || '{}');
          if (ctx.teamId && removedTeamIds.includes(ctx.teamId)) {
            ctx.teamId = null;
            localStorage.setItem('cdd_active_context', JSON.stringify(ctx));
          }
        }
      } catch (e) {}

      // 6. Audit
      try {
        const log = JSON.parse(localStorage.getItem('cdd_audit_log') || '[]');
        log.unshift({
          ts: Date.now(), kind: 'club-deleted', by: email || 'anonyme',
          target: `clubId=${clubId} · ${removedTeamIds.length} equipe(s) supprimee(s)`,
        });
        localStorage.setItem('cdd_audit_log', JSON.stringify(log.slice(0, 200)));
      } catch (e) {}

      window.dispatchEvent(new CustomEvent('cdd-memberships-changed'));
      window.dispatchEvent(new CustomEvent('cdd-active-club-changed'));
      window.dispatchEvent(new CustomEvent('cdd-active-team-changed'));
      if (window.CDD_REBUILD) window.CDD_REBUILD();
      return true;
    } catch (e) {
      console.warn('[roles] deleteClubAndData failed', e);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  MIGRATION AUTOMATIQUE
  // ═══════════════════════════════════════════════════════════════════
  // Au boot : si l'user a un email saisi ET qu'il y a deja des clubs en
  // local SANS memberships, on cree automatiquement les memberships 'coach'
  // pour cet user sur tous les clubs locaux. Legalise l'historique existant.
  function runMigrationIfNeeded() {
    try {
      const email = getCurrentEmail();
      if (!email) {
        console.info('[roles] migration skipped : no email configured (mode visiteur)');
        return { ran: false, reason: 'no-email' };
      }
      const existingMemberships = listMemberships(email);
      if (existingMemberships.length > 0) {
        return { ran: false, reason: 'already-migrated', count: existingMemberships.length };
      }

      // Collecte les clubIds presents en local : arb_clubs + clubIds heritage
      // referenece par arb_teams (sans entry dans arb_clubs).
      const allClubs = JSON.parse(localStorage.getItem('arb_clubs') || '[]');
      const allTeams = JSON.parse(localStorage.getItem('arb_teams') || '[]');
      const clubIds = new Set();
      allClubs.forEach(c => { if (c && c.id) clubIds.add(c.id); });
      allTeams.forEach(t => { if (t && t.clubId) clubIds.add(t.clubId); });

      if (clubIds.size === 0) {
        return { ran: false, reason: 'no-clubs' };
      }

      // Cree les memberships 'coach' pour cet email
      const all = listAllMemberships();
      const now = Date.now();
      let added = 0;
      clubIds.forEach(clubId => {
        const exists = all.some(m => (m.email || '').toLowerCase() === email && m.clubId === clubId);
        if (!exists) {
          all.push({
            email,
            clubId,
            role: 'coach',
            createdAt: now,
            createdBy: 'migration',
          });
          added++;
        }
      });
      localStorage.setItem('cdd_memberships', JSON.stringify(all));
      console.info(`[roles] migration done : ${added} membership(s) coach creee(s) pour ${email}`);
      window.dispatchEvent(new CustomEvent('cdd-memberships-changed'));
      return { ran: true, added };
    } catch (e) {
      console.warn('[roles] migration failed', e);
      return { ran: false, reason: 'error', error: e.message };
    }
  }

  // Mode visiteur : si pas d'email saisi, l'utilisateur est en lecture seule.
  function isVisitorMode() {
    return !getCurrentEmail();
  }

  // Helper : liste les clubIds auxquels j'ai access (via mes memberships).
  function myClubIds(email) {
    return Array.from(new Set(listMemberships(email).map(m => m.clubId)));
  }

  // Execute la migration au boot — avant que data-bridge build CDD_PLAYERS etc.
  runMigrationIfNeeded();

  // Expose
  window.CDD_ROLES = {
    ROLES, OWNER_EMAIL,
    currentRole, roleLabel, roleWeight, hasRole, atLeast,
    getScope, canEditClub, canEditTeam, canViewPlayer,
    canInviteRole, canDeleteClub,
    createInvitationDraft, listInvitations,
    // Memberships
    getCurrentEmail, listMemberships, listAllMemberships, hasMembership,
    membershipRole, addMembership, removeMembership, deleteClubAndData,
    myClubIds, isVisitorMode, runMigrationIfNeeded,
  };

  // Évènement pour les écrans qui veulent réagir à un changement de rôle
  window.dispatchEvent(new CustomEvent('cdd-roles-ready'));
})();
