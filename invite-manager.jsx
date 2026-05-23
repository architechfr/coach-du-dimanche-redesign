/* global React */
/* ============================================================
   INVITE MANAGER — génération de liens d'invitation (C4)
   ============================================================
   Affiché dans les Réglages, réservé aux coachs/owner/admin.
   Le coach choisit un rôle (+ un joueur pour parent/joueur),
   génère un lien, le partage. L'invité ouvre le lien, se
   connecte, et sa membership est créée automatiquement.
   API : window.cddData.{createInvite,fetchClubInvites,revokeInvite}
   ============================================================ */

function InviteManager() {
  // Club et équipe ciblés par l'invitation = contexte actif (Phase D :
  // une invitation cible TOUJOURS une équipe précise).
  const activeClub = (window.CDD && window.CDD.getActiveClub && window.CDD.getActiveClub()) || null;
  const club = { ...(window.CDD_CLUB || {}), ...(activeClub || {}) };
  const team = (window.CDD && window.CDD.getActiveTeam && window.CDD.getActiveTeam()) || {};

  // ── Matrice d'invitation : ce que MON rôle SUR CETTE ÉQUIPE peut inviter.
  // Source de vérité : roles.js → INVITE_MATRIX (et firestore.rules côté
  // serveur). On n'affiche QUE les rôles autorisés pour le rôle SUR L'ÉQUIPE
  // ciblée — pas le rôle global, qui n'a plus de sens en Phase D.
  const R = window.CDD_ROLES;
  const isAdminUser = !!(R && R.isAdmin && R.isAdmin());
  const myRole = isAdminUser
    ? 'admin'
    : (R && R.teamRole && club.id && team.id) ? R.teamRole(club.id, team.id) : '';
  const myRoleLabel = (R && R.roleLabel) ? R.roleLabel(myRole || 'lecteur') : (myRole || 'lecteur');
  const allowedRoles = (R && R.invitableRoles) ? R.invitableRoles(myRole) : [];

  // Catalogue complet. Le rôle « coach principal » n'y figure jamais : un
  // compte coach est créé par l'administrateur, pas via un lien.
  const ALL_ROLE_CHOICES = [
    { id: 'adjoint', l: 'Coach adjoint', d: 'Peut éditer cette équipe · max 5' },
    { id: 'parent',  l: 'Parent',  d: 'Suit un joueur · lecture seule' },
    { id: 'joueur',  l: 'Joueur',  d: 'Voit sa fiche · lecture seule' },
    { id: 'lecteur', l: 'Lecteur', d: 'Lecture seule de l\'équipe' },
  ];
  const ROLE_CHOICES = ALL_ROLE_CHOICES.filter(r => allowedRoles.includes(r.id));

  const [role, setRole]       = React.useState(() => (ROLE_CHOICES[0] || {}).id || 'lecteur');
  const [playerId, setPlayerId] = React.useState('');
  const [label, setLabel]     = React.useState('');
  const [busy, setBusy]       = React.useState(false);
  const [result, setResult]   = React.useState(null);
  const [error, setError]     = React.useState('');
  const [invites, setInvites] = React.useState(null);
  const [copied, setCopied]   = React.useState(false);

  const players = window.CDD_PLAYERS || [];
  const signedIn = !!(window.cddAuth && window.cddAuth.currentUser && window.cddAuth.currentUser());

  const needsPlayer = role === 'parent' || role === 'joueur';
  const roleLabel = (id) => (ALL_ROLE_CHOICES.find(r => r.id === id) || {}).l || id;

  const loadInvites = React.useCallback(async () => {
    if (!window.cddData || !window.cddData.ready || !club.id) { setInvites([]); return; }
    try {
      const list = await window.cddData.fetchClubInvites(club.id);
      list.sort((a, b) => ((b.createdAt && b.createdAt.seconds) || 0)
        - ((a.createdAt && a.createdAt.seconds) || 0));
      setInvites(list);
    } catch (e) { setInvites([]); }
  }, [club.id]);

  React.useEffect(() => { loadInvites(); }, [loadInvites]);

  const autoLabel = () => {
    const p = players.find(x => x.id === playerId);
    if (needsPlayer && p) return roleLabel(role) + ' · ' + (p.first || '') + ' ' + (p.last || '');
    return roleLabel(role);
  };

  const generate = async () => {
    setError(''); setResult(null); setCopied(false);
    if (!window.cddData || !window.cddData.ready) { setError('Service cloud indisponible.'); return; }
    if (!signedIn) { setError('Connecte-toi pour créer une invitation.'); return; }
    if (!club.id)  { setError('Aucun club actif.'); return; }
    if (needsPlayer && !playerId) { setError('Choisis le joueur concerné.'); return; }
    setBusy(true);
    try {
      // Noms embarqués dans l'invite pour la page de validation publique :
      // l'invité non connecté peut voir « FCMH » au lieu d'un clubId opaque.
      const pickedPlayer = needsPlayer ? players.find(x => x.id === playerId) : null;
      const playerName = pickedPlayer
        ? ((pickedPlayer.first || '') + ' ' + (pickedPlayer.last || '')).trim() || null
        : null;
      const r = await window.cddData.createInvite({
        clubId: club.id,
        teamId: team.id || null,
        role,
        playerId: needsPlayer ? playerId : null,
        label: (label.trim() || autoLabel()),
        clubName:   club.name || club.short || null,
        teamName:   team.name || team.category || null,
        playerName: playerName,
      });
      setResult(r);
      setLabel('');
      loadInvites();
    } catch (e) {
      setError((e && e.message) || String(e));
    } finally { setBusy(false); }
  };

  const copyLink = (txt) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt)
        .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); })
        .catch(() => window.prompt('Copie ce lien :', txt));
    } else {
      window.prompt('Copie ce lien :', txt);
    }
  };

  const shareLink = (url) => {
    if (navigator.share) {
      navigator.share({
        title: 'Invitation ' + (club.name || 'club'),
        text: 'Rejoins ' + (club.name || 'le club') + ' sur Coach du Dimanche',
        url,
      }).catch(() => {});
    } else {
      copyLink(url);
    }
  };

  const revoke = async (token) => {
    if (!window.confirm('Révoquer cette invitation ?\nLe lien ne fonctionnera plus.')) return;
    try { await window.cddData.revokeInvite(token); loadInvites(); }
    catch (e) { window.alert('Révocation impossible : ' + ((e && e.message) || e)); }
  };

  const inviteStatus = (inv) => {
    if (inv.consumed) return { k: 'used', l: 'Utilisée' };
    if (inv.expiresAt && Date.now() > inv.expiresAt) return { k: 'exp', l: 'Expirée' };
    return { k: 'wait', l: 'En attente' };
  };
  const fmtDate = (ts) => {
    try {
      if (ts && ts.toDate) return ts.toDate().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    } catch (e) {}
    return '';
  };

  if (!signedIn) {
    return (
      <div className="inv-box inv-box-empty">
        Connecte-toi pour générer des liens d'invitation.
      </div>
    );
  }

  // Phase D — une invitation cible TOUJOURS une équipe précise. Sans équipe
  // active, on bloque proprement avec une instruction claire.
  if (!team.id) {
    return (
      <div className="inv-box inv-box-empty">
        Sélectionne d'abord une équipe — chaque invitation cible une équipe précise.
      </div>
    );
  }

  // Un lecteur (ou tout rôle sans droit d'invitation) ne voit pas le module.
  if (ROLE_CHOICES.length === 0) {
    return (
      <div className="inv-box inv-box-empty">
        Ton rôle sur {team.name || 'cette équipe'} ({myRoleLabel}) ne permet pas
        de générer des liens d'invitation.
      </div>
    );
  }

  return (
    <div className="inv-box">
      {/* Rappel : ce que mon rôle SUR CETTE ÉQUIPE peut inviter */}
      <div style={{
        fontSize: 11.5, lineHeight: 1.5, color: 'var(--tx-3, rgba(255,255,255,0.6))',
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 8, padding: '8px 10px', marginBottom: 12,
      }}>
        En tant que <b style={{ color: 'var(--ac, #c8f169)' }}>{myRoleLabel}</b>
        {' '}de <b>{team.name || 'cette équipe'}</b>,
        tu peux inviter : {ROLE_CHOICES.map(r => r.l.toLowerCase()).join(', ')}.
      </div>

      {/* Choix du rôle */}
      <div className="inv-field-l">Rôle de la personne invitée</div>
      <div className="inv-roles">
        {ROLE_CHOICES.map(r => (
          <button key={r.id}
                  className={`inv-role ${role === r.id ? 'on' : ''}`}
                  onClick={() => { setRole(r.id); setResult(null); setError(''); }}>
            <b>{r.l}</b><em>{r.d}</em>
          </button>
        ))}
      </div>

      {/* Joueur concerné (parent / joueur) */}
      {needsPlayer && (
        <label className="inv-field">
          <span className="inv-field-l">
            Joueur concerné {role === 'parent' && <em className="inv-req">obligatoire</em>}
          </span>
          <select className="inv-select" value={playerId}
                  onChange={e => { setPlayerId(e.target.value); setResult(null); }}>
            <option value="">— choisir un joueur —</option>
            {players.map(p => (
              <option key={p.id} value={p.id}>
                {(p.num ? '#' + p.num + ' ' : '') + (p.first || '') + ' ' + (p.last || '')}
              </option>
            ))}
          </select>
        </label>
      )}

      {/* Libellé optionnel */}
      <label className="inv-field">
        <span className="inv-field-l">Note <em className="inv-opt">facultatif</em></span>
        <input className="inv-input" type="text" value={label} maxLength={80}
               placeholder="ex. Maman de Lucas, coach U13…"
               onChange={e => setLabel(e.target.value)}/>
      </label>

      {error && <div className="inv-error">{error}</div>}

      <button className="inv-generate" onClick={generate} disabled={busy}>
        {busy ? 'Création…' : 'Générer le lien d\'invitation'}
      </button>

      {/* Lien généré */}
      {result && result.url && (
        <div className="inv-result">
          <div className="inv-result-h">
            Lien {roleLabel(result.role)} prêt — valable {result.expiresInDays} jours
          </div>
          <div className="inv-link">{result.url}</div>
          <div className="inv-result-actions">
            <button className="inv-act" onClick={() => copyLink(result.url)}>
              {copied ? '✓ Copié' : 'Copier'}
            </button>
            <button className="inv-act inv-act-primary" onClick={() => shareLink(result.url)}>
              Partager
            </button>
          </div>
        </div>
      )}

      {/* Invitations existantes */}
      <div className="inv-list-h">
        Invitations du club
        {invites && invites.length > 0 && <span className="inv-count">{invites.length}</span>}
      </div>
      {invites === null && <div className="inv-box-empty">Chargement…</div>}
      {invites && invites.length === 0 && (
        <div className="inv-box-empty">Aucune invitation pour l'instant.</div>
      )}
      {invites && invites.map(inv => {
        const st = inviteStatus(inv);
        return (
          <div className="inv-row" key={inv.token}>
            <div className="inv-row-main">
              <span className="inv-row-label">{inv.label || roleLabel(inv.role)}</span>
              <span className="inv-row-meta">
                {roleLabel(inv.role)}{fmtDate(inv.createdAt) ? ' · ' + fmtDate(inv.createdAt) : ''}
              </span>
            </div>
            <span className={`inv-badge inv-badge-${st.k}`}>{st.l}</span>
            {st.k === 'wait' && (
              <button className="inv-row-btn" title="Copier le lien"
                      onClick={() => copyLink(window.cddData.inviteUrl(inv.token))}>⧉</button>
            )}
            <button className="inv-row-btn inv-row-del" title="Révoquer"
                    onClick={() => revoke(inv.token)}>✕</button>
          </div>
        );
      })}
    </div>
  );
}

window.InviteManager = InviteManager;
