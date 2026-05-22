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
    COACH:    { id: 'coach',    label: 'Coach principal', weight: 60  },
    ADJOINT:  { id: 'adjoint',  label: 'Coach adjoint',   weight: 55  },
    DIRIGEANT:{ id: 'dirigeant',label: 'Dirigeant',       weight: 50  },
    ECOLE:    { id: 'ecole',    label: 'École de foot',   weight: 45  },
    PARENT:   { id: 'parent',   label: 'Parent',          weight: 20  },
    JOUEUR:   { id: 'joueur',   label: 'Joueur',          weight: 20  },
    LECTEUR:  { id: 'lecteur',  label: 'Lecteur',         weight: 10  },
  };

  // ═══════════════════════════════════════════════════════════════════
  //  MATRICE D'INVITATION — qui peut générer un lien vers quel rôle
  // ═══════════════════════════════════════════════════════════════════
  // Règle produit (confirmée 2026-05-21). Le rôle « coach » ne s'obtient
  // JAMAIS par lien : un compte coach principal est créé par l'admin.
  //   coach principal / owner / admin → adjoint, parent, joueur, lecteur
  //   coach adjoint                   → parent, joueur, lecteur
  //   joueur                          → parent, joueur, lecteur
  //   parent                          → parent, joueur, lecteur
  //   lecteur                         → personne
  // Cette matrice est dupliquée (volontairement) dans firestore.rules :
  // l'UI s'appuie dessus pour l'ergonomie, le serveur pour la sécurité.
  const INVITE_MATRIX = {
    admin:   ['adjoint', 'parent', 'joueur', 'lecteur'],
    owner:   ['adjoint', 'parent', 'joueur', 'lecteur'],
    coach:   ['adjoint', 'parent', 'joueur', 'lecteur'],
    adjoint: ['parent', 'joueur', 'lecteur'],
    joueur:  ['parent', 'joueur', 'lecteur'],
    parent:  ['parent', 'joueur', 'lecteur'],
    lecteur: [],
  };

  // ⚠️ La notion d'« owner par email » a été retirée pour cause de
  // vulnerabilite : ce code est dans un repo public, donc n'importe quel
  // utilisateur qui aurait vu l'email pouvait le saisir dans son Reglages
  // et devenir owner. Le super-admin reviendra avec Firebase Auth (Sprint
  // 3) via un UID Firebase valide cote serveur (custom claim ou rule
  // Firestore). Tant que Auth n'est pas la, tout le monde est juste 'coach'.
  const OWNER_EMAIL = null;

  // #58 — Admin / super-utilisateur. Fiable depuis qu'une vraie auth existe
  // (Phase B) : impossible de se faire passer pour cet email sans posséder
  // la boîte Gmail correspondante.
  const ADMIN_EMAIL = 'archi.tech.fr@gmail.com';

  // ═══════════════════════════════════════════════════════════════════
  //  CONTEXTE ACTIF (Phase D)
  // ═══════════════════════════════════════════════════════════════════
  // Le rôle d'un utilisateur dépend désormais de l'équipe active.
  // Source de vérité : cdd_active_context = { clubId, teamId, matchId }.
  // Lu via window.CDD si présent (data-adapter), sinon directement en LS.
  function readActiveContext() {
    try {
      if (window.CDD && typeof window.CDD.getActiveContext === 'function') {
        const ctx = window.CDD.getActiveContext();
        if (ctx) return ctx;
      }
    } catch (e) {}
    try {
      const raw = localStorage.getItem('cdd_active_context');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { clubId: null, teamId: null, matchId: null };
  }

  // ═══════════════════════════════════════════════════════════════════
  //  MEMBERSHIP — normalisation (lit le NOUVEAU et l'ANCIEN format)
  // ═══════════════════════════════════════════════════════════════════
  // Phase D : memberships/{uid}_{clubId} portent une map `teams`
  // { [teamId]: { role, playerId? } } et un champ dénormalisé `clubRole`.
  //
  // Tant que D4-D5 ne sont pas livrés, le cache local (cdd_memberships)
  // peut contenir d'anciens documents au format plat { role, playerId? } :
  // on les lit en rétro-compat, le rôle plat est promu en `clubRole` et
  // étendu comme wildcard sur les équipes du club (`_legacyFlatRole`) —
  // un coach migré en Phase C continue donc à coacher pendant la transition.
  //
  // Une fois D5 livré, le bloc « _legacy* » peut être supprimé sans
  // état d'âme : toutes les memberships seront au format `teams`.
  function _normalizeMembership(m) {
    if (!m) return null;
    if (m.teams && typeof m.teams === 'object' && !Array.isArray(m.teams)) {
      return Object.assign({}, m, {
        clubRole: m.clubRole || '',
        teams: m.teams,
        _legacyFlatRole: null,
        _legacyPlayerId: null,
      });
    }
    return Object.assign({}, m, {
      clubRole: m.role || '',
      teams: {},
      _legacyFlatRole: m.role || '',
      _legacyPlayerId: m.playerId || null,
    });
  }

  // DEPRECATED — alias rétro-compat de effectiveRole(). À retirer quand
  // les appelants externes auront migré.
  function currentRole() {
    return effectiveRole();
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

  // Permissions canoniques — Phase D, lues depuis les memberships.
  // Miroir serveur : firestore.rules → canManageClub / canEditTeam.
  // Les écrans utilisent surtout canDo() (ROLE_CAPS, indépendant du clubId) ;
  // ces helpers servent quand on a besoin de vérifier un id précis.
  function canEditClub(clubId) {
    if (isAdmin()) return true;
    if (!clubId) { const ctx = readActiveContext(); clubId = ctx && ctx.clubId; }
    const r = clubRoleOf(clubId);
    return r === 'owner' || r === 'coach';
  }

  function canEditTeam(teamId, clubId) {
    if (isAdmin()) return true;
    const ctx = readActiveContext();
    const cid = clubId || (ctx && ctx.clubId);
    const tid = teamId || (ctx && ctx.teamId);
    const r = teamRole(cid, tid);
    return r === 'owner' || r === 'coach' || r === 'adjoint';
  }

  function canViewPlayer(playerId, teamId, clubId) {
    if (isAdmin()) return true;
    const ctx = readActiveContext();
    const cid = clubId || (ctx && ctx.clubId);
    // Toute membership sur le club suffit pour lire un joueur (l'isolation
    // se fait au niveau club côté serveur).
    if (cid && hasMembership(cid)) return true;
    // Parent ciblé : voit son joueur même sans rôle sur l'équipe.
    if (playerId) {
      const ms = listMemberships();
      const matched = ms.some(raw => {
        const m = _normalizeMembership(raw);
        if (m._legacyPlayerId === playerId) return true;
        return m.teams && Object.values(m.teams)
          .some(t => t && t.playerId === playerId);
      });
      if (matched) return true;
    }
    return false;
  }

  // Rôle EFFECTIF de l'utilisateur courant — Phase D.
  // Priorité :
  //   1. email admin → toujours 'admin' (super-utilisateur)
  //   2. rôle sur l'équipe ACTIVE (cdd_active_context.teamId)
  //   3. rôle « club-wide » sur le club actif (clubRole / ancien format)
  //   4. RÉTRO-COMPAT TEMPORAIRE : cdd_user_role en localStorage — sera
  //      retiré une fois la migration D5 livrée. La membership devient
  //      alors la source de vérité unique.
  //   5. sans membership ni LS → 'lecteur' (jamais 'coach' par défaut :
  //      principe de moindre privilège).
  function effectiveRole(email) {
    if (isAdmin()) return 'admin';
    const ctx = readActiveContext();
    if (ctx && ctx.clubId && ctx.teamId) {
      const r = teamRole(ctx.clubId, ctx.teamId, email);
      if (r) return r;
    }
    if (ctx && ctx.clubId) {
      const r = clubRoleOf(ctx.clubId, email);
      if (r) return r;
    }
    // SÉCURITÉ (2026-05-22) : PLUS de fallback sur cdd_user_role.
    // cdd_user_role est une clé d'APPAREIL, pas liée au compte connecté —
    // un compte sans rattachement héritait du rôle laissé par un autre
    // compte sur le même appareil. Sans membership = 'lecteur', toujours
    // (principe de moindre privilège). Le rôle vient UNIQUEMENT des
    // memberships (cache local de Firestore, scopé par email).
    return 'lecteur';
  }

  // Liste des rôles qu'un rôle donné (ou le rôle courant) peut inviter.
  function invitableRoles(role) {
    return INVITE_MATRIX[role || effectiveRole()] || [];
  }

  function canInviteRole(targetRole) {
    return invitableRoles(effectiveRole()).includes(targetRole);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  CAPACITÉS PAR RÔLE — ce que chaque rôle a le droit de MODIFIER
  // ═══════════════════════════════════════════════════════════════════
  // Trois domaines d'édition (décision produit 2026-05-21) :
  //   'compo'    → composition d'équipe, convocations, match en direct
  //   'effectif' → statuts joueurs, notation/stats, création joueurs/équipes
  //   'club'     → logo et informations du club
  // Coach principal / owner / admin : les trois. Coach adjoint : compo +
  // effectif (PAS la gestion du club). Parent / joueur / lecteur : aucune
  // (lecture seule intégrale). Miroir serveur : firestore.rules →
  // canEditClub (domaine 'club') et canEditData (domaines compo/effectif).
  const ROLE_CAPS = {
    admin:     ['compo', 'effectif', 'club'],
    owner:     ['compo', 'effectif', 'club'],
    coach:     ['compo', 'effectif', 'club'],
    dirigeant: ['compo', 'effectif', 'club'],
    ecole:     ['compo', 'effectif', 'club'],
    adjoint:   ['compo', 'effectif'],
    parent:    [],
    joueur:    [],
    lecteur:   [],
  };
  // Vrai si le rôle courant peut modifier le domaine demandé.
  function canDo(capability) {
    return (ROLE_CAPS[effectiveRole()] || []).includes(capability);
  }
  // Vrai si le rôle courant est en lecture seule intégrale (aucune capacité).
  function isReadOnly() {
    return (ROLE_CAPS[effectiveRole()] || []).length === 0;
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

  // #58 — Vrai depuis le compte authentifié = admin.
  function isAdmin() {
    return getCurrentEmail() === ADMIN_EMAIL;
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

  // ═══════════════════════════════════════════════════════════════════
  //  RÔLES PAR ÉQUIPE (Phase D)
  // ═══════════════════════════════════════════════════════════════════
  function _findMembership(clubId, email) {
    if (!clubId) return null;
    const m = listMemberships(email).find(x => x.clubId === clubId);
    return m ? _normalizeMembership(m) : null;
  }

  // Rôle « club-wide » : owner/coach principal sur AU MOINS une équipe,
  // exposé via le champ dénormalisé `clubRole`. Sert au gating club-level
  // (créer une équipe, éditer le doc club). Rétro-compat : si la membership
  // est au format plat, on renvoie `role` directement.
  function clubRoleOf(clubId, email) {
    if (isAdmin()) return 'admin';
    const m = _findMembership(clubId, email);
    if (!m) return '';
    return m.clubRole || m._legacyFlatRole || '';
  }

  // Rôle de l'utilisateur sur UNE équipe précise. Miroir firestore.rules
  // → teamRole(clubId, teamId). Rétro-compat : ancien format plat = wildcard
  // sur toutes les équipes du club (à retirer une fois D5 livré).
  function teamRole(clubId, teamId, email) {
    if (isAdmin()) return 'admin';
    if (!clubId) return '';
    const m = _findMembership(clubId, email);
    if (!m) return '';
    if (teamId && m.teams && m.teams[teamId] && m.teams[teamId].role) {
      return m.teams[teamId].role;
    }
    if (m._legacyFlatRole) return m._legacyFlatRole;
    return '';
  }
  // Alias parlant côté UI.
  function myRoleOnTeam(clubId, teamId, email) {
    return teamRole(clubId, teamId, email);
  }
  function activeTeamRole(email) {
    const ctx = readActiveContext();
    return teamRole(ctx && ctx.clubId, ctx && ctx.teamId, email);
  }

  // « Mes rôles » — un par équipe. Utilisé par la carte des Réglages.
  // Renvoie [{ clubId, clubName, teamId, teamName, role, playerId,
  //   isActive, legacy }]. Pour une membership encore au format plat, une
  // seule ligne « toutes les équipes du club » avec legacy=true.
  function listMyTeamRoles(email) {
    const ms = listMemberships(email);
    const ctx = readActiveContext();

    let allClubs = [];
    try { if (window.CDD && window.CDD.getAllClubs) allClubs = window.CDD.getAllClubs() || []; } catch (e) {}
    if (allClubs.length === 0) {
      try { allClubs = JSON.parse(localStorage.getItem('arb_clubs') || '[]'); } catch (e) { allClubs = []; }
    }
    let allTeams = [];
    try { allTeams = JSON.parse(localStorage.getItem('arb_teams') || '[]'); } catch (e) { allTeams = []; }
    const clubsById = {};
    allClubs.forEach(c => { if (c && c.id) clubsById[c.id] = c; });
    const teamsById = {};
    allTeams.forEach(t => { if (t && t.id) teamsById[t.id] = t; });

    const out = [];
    ms.forEach(raw => {
      const m = _normalizeMembership(raw);
      const club = clubsById[m.clubId];
      const clubName = (club && club.name) || m.clubId;
      const teamKeys = Object.keys(m.teams || {});
      if (teamKeys.length > 0) {
        teamKeys.forEach(tid => {
          const entry = m.teams[tid] || {};
          const team = teamsById[tid];
          out.push({
            clubId: m.clubId, clubName,
            teamId: tid, teamName: (team && team.name) || tid,
            role: entry.role || '',
            playerId: entry.playerId || null,
            isActive: !!(ctx && ctx.clubId === m.clubId && ctx.teamId === tid),
            legacy: false,
          });
        });
      } else if (m._legacyFlatRole) {
        out.push({
          clubId: m.clubId, clubName,
          teamId: null,
          teamName: 'Toutes les équipes du club',
          role: m._legacyFlatRole,
          playerId: m._legacyPlayerId || null,
          isActive: !!(ctx && ctx.clubId === m.clubId),
          legacy: true,
        });
      }
    });
    out.sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      const cn = (a.clubName || '').localeCompare(b.clubName || '');
      if (cn) return cn;
      return (a.teamName || '').localeCompare(b.teamName || '');
    });
    return out;
  }

  function membershipRole(clubId, email) {
    return clubRoleOf(clubId, email) || null;
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
  // Au boot : si l'user a un email saisi ET qu'il y a deja des clubs SANS
  // memberships, on cree automatiquement les memberships 'coach'. Legalise
  // l'historique existant.
  //
  // IMPORTANT : les donnees clubs/equipes peuvent venir de 3 sources :
  //   1. localStorage direct (arb_clubs, arb_teams) — coachs ayant cree
  //      explicitement via l'UI
  //   2. seed-inline.js (chargees dans window.__CDD_OVERRIDE par
  //      data-adapter.js si localStorage vide) — coachs qui n'ont jamais
  //      ecrit en local, demarrent sur les vraies donnees pre-baked
  //   3. window.CDD.getAllClubs() / getTeams() — interface unifiee qui
  //      voit les 2 sources via le data-adapter
  //
  // La migration doit voir TOUTES les sources. On passe par window.CDD
  // (data-adapter) et on persiste les donnees du seed en localStorage si
  // necessaire pour que les memberships referencent des clubIds stables.
  function runMigrationIfNeeded() {
    try {
      const email = getCurrentEmail();
      if (!email) {
        console.info('[roles] migration skipped : no email configured (mode visiteur)');
        return { ran: false, reason: 'no-email' };
      }
      // #58 — SÉCURITÉ : la migration auto crée des memberships 'coach'.
      // Elle est désormais RÉSERVÉE à l'admin. Sans ce garde-fou, n'importe
      // quel email connecté devenait coach de tous les clubs de l'appareil.
      if (email !== ADMIN_EMAIL) {
        console.info('[roles] migration skipped : compte non-admin (' + email + ') — aucun rattachement automatique');
        return { ran: false, reason: 'not-admin' };
      }
      const existingMemberships = listMemberships(email);
      if (existingMemberships.length > 0) {
        return { ran: false, reason: 'already-migrated', count: existingMemberships.length };
      }

      // ── Collecte robuste : on prend l'union de toutes les sources.
      // 1. localStorage direct (cas legacy)
      let lsClubs = [];
      let lsTeams = [];
      try { lsClubs = JSON.parse(localStorage.getItem('arb_clubs') || '[]'); } catch (e) {}
      try { lsTeams = JSON.parse(localStorage.getItem('arb_teams') || '[]'); } catch (e) {}

      // 2. data-adapter (qui voit aussi le seed via window.__CDD_OVERRIDE)
      let adClubs = [];
      let adTeams = [];
      if (window.CDD) {
        try { adClubs = window.CDD.getAllClubs?.() || []; } catch (e) {}
        try {
          // Pour avoir TOUTES les teams (pas filtrees par club actif), lire
          // directement le raw qui inclut l'override seed.
          const allRaw = (window.__CDD_OVERRIDE && window.__CDD_OVERRIDE['arb_teams'])
                      || JSON.parse(localStorage.getItem('arb_teams') || '[]');
          adTeams = Array.isArray(allRaw) ? allRaw : [];
        } catch (e) {}
      }

      // 3. Seed brut (si pas de localStorage et pas d'override)
      let seedClubs = [];
      let seedTeams = [];
      if (window.__CDD_SEED) {
        if (Array.isArray(window.__CDD_SEED.clubs)) seedClubs = window.__CDD_SEED.clubs;
        if (Array.isArray(window.__CDD_SEED.teams)) seedTeams = window.__CDD_SEED.teams;
      }

      // 4. window.CDD_CLUB (fallback ultime : si data-bridge a deja construit
      // le global mais que les sources brutes sont introuvables). Construit
      // un club synthetique avec son id depuis cdd_active_context.
      const synthClubs = [];
      try {
        if (window.CDD_CLUB && window.CDD_CLUB.name) {
          const ctx = JSON.parse(localStorage.getItem('cdd_active_context') || '{}');
          const synthId = ctx.clubId || 'club_synth_' + window.CDD_CLUB.name.replace(/\s+/g, '_');
          synthClubs.push({
            id: synthId,
            name: window.CDD_CLUB.name,
            primaryColor: window.CDD_CLUB.colors?.[0] || '#c8f169',
            _synth: true,
          });
        }
      } catch (e) {}

      // Union dedupliquee par id
      const clubsById = {};
      [...lsClubs, ...adClubs, ...seedClubs, ...synthClubs].forEach(c => { if (c && c.id) clubsById[c.id] = c; });
      const teamsById = {};
      [...lsTeams, ...adTeams, ...seedTeams].forEach(t => { if (t && t.id) teamsById[t.id] = t; });

      const unionClubs = Object.values(clubsById);
      const unionTeams = Object.values(teamsById);

      // Collecte les clubIds : ceux deja dans arb_clubs + ceux referencees par
      // arb_teams (cas heritage ou aucun arb_clubs explicite).
      const clubIds = new Set();
      unionClubs.forEach(c => { if (c && c.id) clubIds.add(c.id); });
      unionTeams.forEach(t => { if (t && t.clubId) clubIds.add(t.clubId); });

      if (clubIds.size === 0) {
        console.info('[roles] migration : aucun club detecte (ni en localStorage, ni en seed). Mode coach sans rattachement.');
        return { ran: false, reason: 'no-clubs' };
      }

      // ── Persistance du seed : si certains clubs/teams ne sont qu'en seed,
      // on les ecrit en localStorage pour que les memberships pointent sur
      // des donnees stables (qui ne disparaitront pas a la prochaine session).
      let persisted = 0;
      try {
        const lsClubIds = new Set(lsClubs.map(c => c.id));
        const missingClubs = unionClubs.filter(c => !lsClubIds.has(c.id));
        if (missingClubs.length > 0) {
          const merged = [...lsClubs, ...missingClubs];
          localStorage.setItem('arb_clubs', JSON.stringify(merged));
          persisted += missingClubs.length;
        }
      } catch (e) { console.warn('[roles] persist arb_clubs failed', e); }
      try {
        const lsTeamIds = new Set(lsTeams.map(t => t.id));
        const missingTeams = unionTeams.filter(t => !lsTeamIds.has(t.id));
        if (missingTeams.length > 0) {
          const merged = [...lsTeams, ...missingTeams];
          localStorage.setItem('arb_teams', JSON.stringify(merged));
          persisted += missingTeams.length;
        }
      } catch (e) { console.warn('[roles] persist arb_teams failed', e); }

      if (persisted > 0) {
        console.info(`[roles] migration : ${persisted} entite(s) seed persistee(s) en localStorage`);
      }

      // ── Crée les memberships 'coach' pour cet email
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
      console.info(`[roles] migration done : ${added} membership(s) coach creee(s) pour ${email} (sur ${clubIds.size} club(s))`);
      window.dispatchEvent(new CustomEvent('cdd-memberships-changed'));
      return { ran: true, added, persisted };
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

  // ═══════════════════════════════════════════════════════════════════
  //  DIAGNOSTIC — dump complet de l'état des données
  // ═══════════════════════════════════════════════════════════════════
  // Outil pour comprendre pourquoi la migration ne voit pas un club.
  // Renvoie un objet avec tout ce qui est lisible. Le UI peut JSON.stringify
  // pour afficher au coach.
  function diagnose() {
    const dump = {
      time: new Date().toISOString(),
      identity: {
        email: getCurrentEmail(),
        cdd_user_email: (() => { try { return localStorage.getItem('cdd_user_email'); } catch(e) { return null; } })(),
        cdd_coach_name: (() => { try { return localStorage.getItem('cdd_coach_name'); } catch(e) { return null; } })(),
        cdd_user_role: (() => { try { return localStorage.getItem('cdd_user_role'); } catch(e) { return null; } })(),
      },
      localStorage: {
        arb_clubs: (() => { try { return JSON.parse(localStorage.getItem('arb_clubs') || 'null'); } catch(e) { return 'PARSE_ERROR'; } })(),
        arb_teams_count: (() => { try { const t = JSON.parse(localStorage.getItem('arb_teams') || '[]'); return Array.isArray(t) ? t.length : 'NOT_ARRAY'; } catch(e) { return 'PARSE_ERROR'; } })(),
        arb_current_club: (() => { try { return localStorage.getItem('arb_current_club'); } catch(e) { return null; } })(),
        cdd_active_context: (() => { try { return JSON.parse(localStorage.getItem('cdd_active_context') || 'null'); } catch(e) { return 'PARSE_ERROR'; } })(),
        cdd_memberships: (() => { try { return JSON.parse(localStorage.getItem('cdd_memberships') || 'null'); } catch(e) { return 'PARSE_ERROR'; } })(),
      },
      seed: {
        present: !!window.__CDD_SEED,
        clubs_count: window.__CDD_SEED?.clubs?.length || 0,
        teams_count: window.__CDD_SEED?.teams?.length || 0,
        current: window.__CDD_SEED?.current || null,
      },
      override: {
        present: !!window.__CDD_OVERRIDE,
        arb_clubs_count: window.__CDD_OVERRIDE?.['arb_clubs']?.length || 0,
        arb_teams_count: window.__CDD_OVERRIDE?.['arb_teams']?.length || 0,
      },
      adapter: {
        present: !!window.CDD,
        getAllClubs_count: (() => { try { return (window.CDD?.getAllClubs?.() || []).length; } catch(e) { return 'ERROR'; } })(),
        getTeams_count: (() => { try { return (window.CDD?.getTeams?.() || []).length; } catch(e) { return 'ERROR'; } })(),
        getActiveClub: (() => { try { const c = window.CDD?.getActiveClub?.(); return c ? { id: c.id, name: c.name } : null; } catch(e) { return 'ERROR'; } })(),
        getActiveTeam: (() => { try { const t = window.CDD?.getActiveTeam?.(); return t ? { id: t.id, name: t.name, clubId: t.clubId } : null; } catch(e) { return 'ERROR'; } })(),
      },
      globals: {
        CDD_CLUB: (() => {
          try {
            if (!window.CDD_CLUB) return null;
            return { name: window.CDD_CLUB.name, short: window.CDD_CLUB.short, team: window.CDD_CLUB.team };
          } catch(e) { return 'ERROR'; }
        })(),
        CDD_PLAYERS_count: (() => { try { return (window.CDD_PLAYERS || []).length; } catch(e) { return 'ERROR'; } })(),
      },
    };
    console.info('[roles] DIAGNOSTIC', dump);
    return dump;
  }

  // #58 — Nettoie les memberships créées par l'ANCIENNE migration auto pour
  // des comptes non-admin (faille : tout email connecté devenait coach de
  // tous les clubs de l'appareil). On ne garde une membership 'migration'
  // QUE si elle appartient à l'admin. À exécuter au boot, avant la migration.
  function purgeBadAutoMemberships() {
    try {
      const all = listAllMemberships();
      const cleaned = all.filter(m => {
        if (!m || m.createdBy !== 'migration') return true; // garder
        return (m.email || '').toLowerCase() === ADMIN_EMAIL;  // auto = admin only
      });
      if (cleaned.length !== all.length) {
        localStorage.setItem('cdd_memberships', JSON.stringify(cleaned));
        console.info('[roles] purge : ' + (all.length - cleaned.length)
          + ' membership(s) auto non-admin supprimée(s)');
        window.dispatchEvent(new CustomEvent('cdd-memberships-changed'));
      }
    } catch (e) { console.warn('[roles] purge failed', e); }
  }

  // Boot : on purge d'abord les rattachements illégitimes, puis on exécute
  // la migration (qui ne fera plus rien hors admin).
  purgeBadAutoMemberships();
  runMigrationIfNeeded();

  // Re-tente la migration au prochain build de CDD_CLUB (data-bridge prend
  // un peu de temps a cause de Babel). Cela couvre les cas ou roles.js a
  // tourne trop tot pour voir les vraies sources.
  let _retried = false;
  window.addEventListener('cdd-data-rebuilt', () => {
    if (_retried) return;
    const email = getCurrentEmail();
    if (!email) return;
    if (listMemberships(email).length > 0) return;
    _retried = true;
    console.info('[roles] retry migration after cdd-data-rebuilt');
    runMigrationIfNeeded();
  });

  // Expose
  window.CDD_ROLES = {
    ROLES, OWNER_EMAIL, ADMIN_EMAIL, INVITE_MATRIX, ROLE_CAPS,
    currentRole, effectiveRole, roleLabel, roleWeight, hasRole, atLeast,
    getScope, canEditClub, canEditTeam, canViewPlayer,
    canInviteRole, invitableRoles, canDeleteClub,
    canDo, isReadOnly,
    createInvitationDraft, listInvitations,
    // Memberships
    getCurrentEmail, isAdmin, listMemberships, listAllMemberships, hasMembership,
    membershipRole, addMembership, removeMembership, deleteClubAndData,
    myClubIds, isVisitorMode, runMigrationIfNeeded, purgeBadAutoMemberships,
    // Phase D — rôles par équipe & multi-rôles
    readActiveContext, clubRoleOf, teamRole, myRoleOnTeam,
    activeTeamRole, listMyTeamRoles,
    // Diagnostic
    diagnose,
  };

  // Évènement pour les écrans qui veulent réagir à un changement de rôle
  window.dispatchEvent(new CustomEvent('cdd-roles-ready'));
})();
