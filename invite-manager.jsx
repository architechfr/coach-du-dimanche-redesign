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
  // Lien de parenté (UNIQUEMENT pour rôle=parent). Sélecteur dur plutôt que
  // texte libre — décision UX 2026-05-23 (Florian) : éviter que le coach ait
  // à formuler « Maman de Léonis » à la main. L'app compose automatiquement
  // le libellé à partir de PARENT_KINDS + playerName.
  const PARENT_KINDS = [
    { id: 'mere',       l: 'Mère' },
    { id: 'pere',       l: 'Père' },
    { id: 'belle-mere', l: 'Belle-mère' },
    { id: 'beau-pere',  l: 'Beau-père' },
    { id: 'tuteur',     l: 'Tuteur·rice légal·e' },
    { id: 'proche',     l: 'Autre proche' },
  ];
  const [parentKind, setParentKind] = React.useState('mere');
  const [busy, setBusy]       = React.useState(false);
  const [result, setResult]   = React.useState(null);
  const [error, setError]     = React.useState('');
  const [invites, setInvites] = React.useState(null);
  const [copied, setCopied]   = React.useState(false);
  // Modale QR code pour partage physique (réunion parents, vestiaire…)
  const [qrInvite, setQrInvite] = React.useState(null);

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
      // Push EN BLOC des overrides locaux du coach AVANT de créer le lien :
      // l'invité (parent / adjoint / lecteur) va débarquer dans l'app — on
      // s'assure que TOUS les overrides du coach (stats, profils, alt-postes,
      // notes, perf deltas) sont à jour dans le cloud. Sans ça, l'invité
      // pourrait voir un effectif décalé (overrides pre-v62 jamais syncés).
      // Throttle de 5 min côté firebase-sync.js → pas de spam si générations
      // en rafale. Fire-and-forget : la création du lien n'attend pas.
      if (window.cddData && window.cddData.pushAllLocalOverrides) {
        window.cddData.pushAllLocalOverrides()
          .catch(e => console.warn('[invite] pushAllLocalOverrides', e));
      }
      // Noms embarqués dans l'invite pour la page de validation publique :
      // l'invité non connecté peut voir « FCMH » au lieu d'un clubId opaque.
      const pickedPlayer = needsPlayer ? players.find(x => x.id === playerId) : null;
      const playerName = pickedPlayer
        ? ((pickedPlayer.first || '') + ' ' + (pickedPlayer.last || '')).trim() || null
        : null;
      // Pour les invitations PARENT : label = lien de parenté seul (« Mère »).
      // Le nom du joueur est dans playerName et sera ajouté par le rendu de
      // liste (« Mère · pour Léonis CLARISSE »). Pas de doublon ni de saisie
      // libre du coach — zéro risque d'oubli.
      const finalLabel = role === 'parent'
        ? (PARENT_KINDS.find(k => k.id === parentKind) || PARENT_KINDS[0]).l
        : (label.trim() || autoLabel());
      const r = await window.cddData.createInvite({
        clubId: club.id,
        teamId: team.id || null,
        role,
        playerId: needsPlayer ? playerId : null,
        label: finalLabel,
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
    const inv = (invites || []).find(i => i.token === token);
    const wasUsed = inv && inv.consumed;
    const who = (inv && (inv.consumedByEmail || inv.consumedBy)) || '';
    const msg = wasUsed
      ? '⚠ Cette invitation a déjà été utilisée'
        + (who ? ' par ' + who : '') + '.\n\n'
        + 'Révoquer supprimera aussi le rattachement de cette personne '
        + '— elle n\'aura plus accès à l\'équipe.\n\nContinuer ?'
      : 'Révoquer cette invitation ?\n\nLe lien ne fonctionnera plus.';
    if (!window.confirm(msg)) return;
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

      {/* Pour PARENT : sélecteur Mère/Père/Beau-père/etc. — pas de saisie libre.
          L'app compose automatiquement « Mère · pour Léonis CLARISSE » dans
          la liste des invitations, sans intervention du coach. */}
      {role === 'parent' ? (
        <label className="inv-field">
          <span className="inv-field-l">Lien de parenté</span>
          <select className="inv-select" value={parentKind}
                  onChange={e => { setParentKind(e.target.value); setResult(null); }}>
            {PARENT_KINDS.map(k => (
              <option key={k.id} value={k.id}>{k.l}</option>
            ))}
          </select>
        </label>
      ) : (
        /* Pour les autres rôles (joueur / lecteur / adjoint) : note libre. */
        <label className="inv-field">
          <span className="inv-field-l">Note <em className="inv-opt">facultatif</em></span>
          <input className="inv-input" type="text" value={label} maxLength={80}
                 placeholder="ex. Coach U13, ami du club…"
                 onChange={e => setLabel(e.target.value)}/>
        </label>
      )}

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
        // Nom du joueur concerné — affiché pour les invitations parent/joueur.
        let playerName = inv.playerName || '';
        if (!playerName && inv.playerId) {
          const p = players.find(x => x.id === inv.playerId);
          if (p) playerName = ((p.first || '') + ' ' + (p.last || '')).trim();
        }
        const showPlayer = !!playerName
          && (inv.role === 'parent' || inv.role === 'joueur');
        // Email cible (si renseigné à la création) — visible côté coach
        // pour savoir À QUI le lien a été destiné.
        const targetEmail = (inv.email || '').trim();
        // Email du consommateur si l'invite est utilisée.
        const consumerEmail = (inv.consumedByEmail || '').trim();
        const consumedAtStr = fmtDate(inv.consumedAt);
        return (
          <div className="inv-row" key={inv.token} style={{flexWrap:'wrap'}}>
            <div className="inv-row-main">
              <span className="inv-row-label">
                {inv.label || roleLabel(inv.role)}
                {showPlayer && (
                  <span style={{
                    opacity: 0.75, fontWeight: 400, marginLeft: 6,
                  }}>· pour {playerName}</span>
                )}
              </span>
              <span className="inv-row-meta">
                {roleLabel(inv.role)}{fmtDate(inv.createdAt) ? ' · créée ' + fmtDate(inv.createdAt) : ''}
              </span>
            </div>
            <span className={`inv-badge inv-badge-${st.k}`}>{st.l}</span>
            {st.k === 'wait' && (
              <>
                <button className="inv-row-btn" title="QR code (partage physique)"
                        onClick={() => setQrInvite(inv)}>📱</button>
                <button className="inv-row-btn" title="Copier le lien"
                        onClick={() => copyLink(window.cddData.inviteUrl(inv.token))}>⧉</button>
              </>
            )}
            <button className="inv-row-btn inv-row-del" title="Révoquer"
                    onClick={() => revoke(inv.token)}>✕</button>
            {/* Détails contextuels — email cible / consommateur. Sur une 2e
                ligne sous le row principal (flexWrap), pour les coachs/adjoints
                qui veulent savoir qui est attaché à quelle invitation. */}
            {(targetEmail || consumerEmail) && (
              <div style={{
                width:'100%', marginTop:6, padding:'7px 9px', borderRadius:7,
                background:'rgba(255,255,255,0.025)',
                border:'1px solid rgba(255,255,255,0.06)',
                fontSize:11, lineHeight:1.55,
                color:'rgba(255,255,255,0.72)',
              }}>
                {targetEmail && (
                  <div>
                    📧 <span style={{opacity:.6}}>Cible :</span>{' '}
                    <b style={{color:'#fff', wordBreak:'break-all'}}>{targetEmail}</b>
                  </div>
                )}
                {consumerEmail && (
                  <div style={{marginTop: targetEmail ? 3 : 0}}>
                    ✅ <span style={{opacity:.6}}>Utilisée par :</span>{' '}
                    <b style={{color:'#c8f169', wordBreak:'break-all'}}>{consumerEmail}</b>
                    {consumedAtStr && (
                      <span style={{opacity:.55}}> · le {consumedAtStr}</span>
                    )}
                  </div>
                )}
                {/* Cas: invite utilisée mais consumedByEmail absent (vieilles
                    invites avant v153). On affiche au moins la date. */}
                {!consumerEmail && st.k === 'used' && consumedAtStr && (
                  <div style={{marginTop: targetEmail ? 3 : 0}}>
                    ✅ <span style={{opacity:.6}}>Utilisée le {consumedAtStr}</span>
                    <span style={{opacity:.45}}> (email du compte non journalisé)</span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Modale QR code pour invitations — partage physique réunion / vestiaire */}
      {qrInvite && window.QRShareModal && window.cddData?.inviteUrl && (
        <window.QRShareModal
          title={`📱 ${(qrInvite.label || roleLabel(qrInvite.role))}`}
          url={window.cddData.inviteUrl(qrInvite.token)}
          subtitle={`Invitation ${roleLabel(qrInvite.role)}${qrInvite.playerName ? ` pour ${qrInvite.playerName}` : ''}. Scanne pour rejoindre le club.`}
          onClose={() => setQrInvite(null)}
        />
      )}
    </div>
  );
}

window.InviteManager = InviteManager;
