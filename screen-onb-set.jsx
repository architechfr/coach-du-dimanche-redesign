/* global React, CDD_CLUB */

/* ============================================================
   SCREEN — Onboarding
   ============================================================ */

function ScreenOnboarding({ go, tweaks }) {
  const [step, setStep] = useState(0);
  const [role, setRole] = useState(() => localStorage.getItem("cdd_user_role") || null);

  // Persist on change
  React.useEffect(() => { if (role) localStorage.setItem("cdd_user_role", role); }, [role]);
  // #53 — Football uniquement. Le multi-sport (futsal/rugby) est retiré :
  // nombre de joueurs et terrain différents, hors périmètre produit.
  React.useEffect(() => { localStorage.setItem("cdd_user_sport", "foot"); }, []);

  const next = () => setStep(s => s + 1);

  return (
    <div className="scr scr-onb fade-in" data-screen-label="08 Onboarding">

      <div className="onb-stage">
        <div className="onb-bg"/>
        <div className="onb-grad"/>

        {step === 0 && (
          <div className="onb-step">
            <div className="onb-logo">
              <div className="onb-logo-ring"/>
              <div className="onb-logo-core">CD</div>
            </div>
            <div className="onb-k">SAISON 2025–2026</div>
            <h1 className="onb-title">
              COACH<br/>
              <span className="onb-title-acc">DU DIMANCHE</span>
            </h1>
            <p className="onb-lead">
              L'app du foot amateur.<br/>
              Convocations · Compo · Match live · Stats.
            </p>
            <button className="btn-cta" onClick={next}>
              <span>COMMENCER</span><span className="arr">→</span>
            </button>
            <div className="onb-foot">Hors-ligne · Sync cloud · PWA</div>
          </div>
        )}

        {step === 1 && (
          <div className="onb-step">
            <div className="onb-k">CHOISIS TON RÔLE</div>
            <h1 className="onb-title">Qui es-tu<br/>aujourd'hui&nbsp;?</h1>
            <div className="onb-roles">
              <button className={`onb-role ${role==="coach"?"on":""}`} onClick={()=>setRole("coach")}>
                <div className="onb-role-ic">📋</div>
                <div className="onb-role-t">COACH</div>
                <div className="onb-role-d">Gérer ton équipe, compos, matchs, parents</div>
              </button>
              <button className={`onb-role ${role==="arbitre"?"on":""}`} onClick={()=>setRole("arbitre")}>
                <div className="onb-role-ic">🟨</div>
                <div className="onb-role-t">ARBITRE</div>
                <div className="onb-role-d">Feuille de match, cartons, temps additionnel</div>
              </button>
              <button className={`onb-role ${role==="duo"?"on":""}`} onClick={()=>setRole("duo")}>
                <div className="onb-role-ic">⚡</div>
                <div className="onb-role-t">LES DEUX</div>
                <div className="onb-role-d">Bascule entre les modes à la volée</div>
              </button>
            </div>
            {/* #57 — SÉCURITÉ : l'onboarding ne donne PAS accès à l'app.
                Il mène à l'écran de connexion. Aucune entrée sans auth réelle. */}
            <button className="btn-cta" disabled={!role} onClick={() => go("landing")}>
              <span>CONTINUER</span><span className="arr">→</span>
            </button>
          </div>
        )}

        <div className="onb-progress">
          {[0,1].map(i => (
            <span key={i} className={`onb-dot ${step>=i?"on":""}`}/>
          ))}
        </div>
      </div>

    </div>
  );
}

window.ScreenOnboarding = ScreenOnboarding;


/* ============================================================
   SCREEN — Settings
   ============================================================ */

function ScreenSettings({ go, tweaks, setTweak }) {
  const club = CDD_CLUB;

  // ─── Gating par rôle (#12) ───────────────────────────────
  // Roles possibles : parent | joueur | coach | adjoint | dirigeant | ecole | admin
  // ⚠️ La notion d'owner-par-email a ete retiree (repo public + faille).
  // Le super-admin reviendra Sprint 3 via Firebase Auth custom claims.
  // Phase D — le rôle vient des memberships Firestore via effectiveRole().
  const role = (window.CDD_ROLES && window.CDD_ROLES.effectiveRole)
    ? window.CDD_ROLES.effectiveRole()
    : 'lecteur';
  const userEmail = localStorage.getItem('cdd_user_email') || '';
  const isOwner   = role === 'owner';
  // Admin = compte authentifié archi.tech.fr@gmail.com (gating super-user),
  // jamais un rôle saisi en localStorage.
  const isAdmin   = !!(window.CDD_ROLES && window.CDD_ROLES.isAdmin && window.CDD_ROLES.isAdmin());
  const isCoach   = isAdmin || ['owner', 'coach', 'adjoint', 'dirigeant', 'ecole'].includes(role);
  const isParent  = role === 'parent' || role === 'joueur';
  // Rôles que le rôle courant peut inviter (matrice). Vide → module masqué.
  const myInvitable = (window.CDD_ROLES && window.CDD_ROLES.invitableRoles)
    ? window.CDD_ROLES.invitableRoles(role) : [];
  // #C5 — capacités d'édition du rôle courant (cf. roles.js → ROLE_CAPS).
  const cdo = (cap) => !!(window.CDD_ROLES && window.CDD_ROLES.canDo && window.CDD_ROLES.canDo(cap));
  // Gestion du club (logo, infos, liste des membres) : coach principal /
  // owner / admin uniquement — PAS l'adjoint.
  const canManageClub = cdo('club');

  // ----- Persistent toggles (cdd_settings.*) -----
  const getToggle = (k, def=false) => {
    const v = localStorage.getItem("cdd_settings_" + k);
    return v === null ? def : v === "true";
  };
  const setToggle = (k, val) => {
    localStorage.setItem("cdd_settings_" + k, String(val));
    setRefresh(x => x + 1);
  };
  const [, setRefresh] = useState(0);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showMembersPanel, setShowMembersPanel] = useState(false);
  const [showAdminClubsPanel, setShowAdminClubsPanel] = useState(false);
  // Modale « Quitter le club » — { clubId, clubName, teamsCount } ou null.
  const [leavingClub, setLeavingClub] = useState(null);
  const dark      = getToggle("dark", true);
  const sons      = getToggle("sons", true);
  const vibrate   = getToggle("vibrate", false);
  const halfauto  = getToggle("halftime_auto", true);
  const sonsCart  = getToggle("cartons_sound", false);

  // Apply theme on mount + on change
  React.useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    // Map sound flag for match-engine
    window.CDD_SOUND_ENABLED = sons;
    window.CDD_VIBRATE_ENABLED = vibrate;
  }, [dark, sons, vibrate]);

  // ----- Cache / export / déconnexion -----
  const exportData = () => {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("cdd_")) data[k] = localStorage.getItem(k);
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type:"application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `coach-du-dimanche-export-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  // #59 — Sauvegarde cloud : déclenche la migration Firestore (C2) avec un
  // résultat VISIBLE (compteur de docs envoyés, ou message d'erreur exact).
  const cloudBackup = async () => {
    if (!window.cddData || !window.cddData.ready) {
      alert("Le service cloud n'est pas prêt.\nVérifie ta connexion internet et réessaie dans un instant.");
      return;
    }
    if (!window.cddAuth || !window.cddAuth.currentUser || !window.cddAuth.currentUser()) {
      alert("Tu dois être connecté pour sauvegarder dans le cloud.");
      return;
    }
    if (!confirm("Envoyer tes clubs, équipes et joueurs vers le cloud (Firestore) ?\n\nCela ne supprime rien en local.")) return;
    try {
      const res = await window.cddData.migrateLocalToCloud({ force: true });
      if (res && res.ok && res.counts) {
        const c = res.counts;
        alert("✓ Sauvegarde cloud réussie\n\n"
          + "Clubs : " + (c.clubs || 0) + "\n"
          + "Équipes : " + (c.teams || 0) + "\n"
          + "Joueurs : " + (c.players || 0) + "\n"
          + "Rattachements : " + (c.memberships || 0)
          + (c.errors ? "\n\n⚠ " + c.errors + " erreur(s) — détail dans la console (F12)" : ""));
      } else if (res && res.ok) {
        alert("Sauvegarde : " + (res.reason || 'rien à faire') + ".");
      } else {
        const reason = res ? res.reason : 'inconnue';
        let msg = "✗ Sauvegarde non effectuée.\nRaison : " + reason;
        if (reason === 'not-admin')     msg += "\n\nSeul le compte admin peut lancer la sauvegarde cloud.";
        if (reason === 'not-signed-in') msg += "\n\nTu n'es pas connecté.";
        if (reason === 'no-db')         msg += "\n\nFirestore n'est pas initialisé.";
        alert(msg);
      }
    } catch (err) {
      alert("✗ Erreur pendant la sauvegarde cloud :\n\n" + (err && err.message ? err.message : err));
    }
  };
  // #60 — Chargement cloud : récupère les données autorisées depuis Firestore
  // et remplace le cache local. Résultat affiché.
  const cloudRestore = async () => {
    if (!window.cddData || !window.cddData.ready) {
      alert("Le service cloud n'est pas prêt.\nVérifie ta connexion internet et réessaie.");
      return;
    }
    if (!window.cddAuth || !window.cddAuth.currentUser || !window.cddAuth.currentUser()) {
      alert("Tu dois être connecté pour charger depuis le cloud.");
      return;
    }
    if (!confirm("Charger tes données depuis le cloud ?\n\nLe contenu local (clubs, équipes, joueurs) sera remplacé par la version du cloud.")) return;
    try {
      const res = await window.cddData.pullCloudData();
      if (res && res.ok && res.empty) {
        alert("Aucun club autorisé pour ce compte dans le cloud.\nRien n'a été chargé.");
      } else if (res && res.ok && res.counts) {
        const c = res.counts;
        alert("✓ Données chargées depuis le cloud\n\n"
          + "Clubs : " + (c.clubs || 0) + "\n"
          + "Équipes : " + (c.teams || 0) + "\n"
          + "Joueurs : " + (c.players || 0)
          + "\n\nRecharge l'app (Ctrl+Maj+R) si l'affichage ne s'actualise pas.");
      } else {
        const reason = res ? res.reason : 'inconnue';
        let msg = "✗ Chargement non effectué.\nRaison : " + reason;
        if (reason === 'fetch-failed')  msg += "\n\nImpossible de lire le cloud (connexion ?).";
        if (reason === 'not-signed-in') msg += "\n\nTu n'es pas connecté.";
        alert(msg);
      }
    } catch (err) {
      alert("✗ Erreur pendant le chargement cloud :\n\n" + (err && err.message ? err.message : err));
    }
  };
  const clearCache = () => {
    if (!confirm("Vider le cache local ? Tu perdras toutes les données non synchronisées.")) return;
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith("cdd_") || k.startsWith("arb_"))) keys.push(k);
    }
    keys.forEach(k => localStorage.removeItem(k));
    alert(`${keys.length} clés supprimées. Recharge l'app.`);
  };
  const logout = () => {
    if (!confirm("Se déconnecter ?\n\nTu devras te reconnecter via le lien envoyé par email. Les données du club restent sur l'appareil.")) return;
    // #52 / #54 — Vraie déconnexion. On retire le profil local ET on coupe la
    // session Firebase : sans signOut(), onAuthStateChanged ressusciterait
    // cdd_user_email au rechargement et la déconnexion ne servirait à rien.
    localStorage.removeItem("cdd_user_role");
    localStorage.removeItem("cdd_user_sport");
    localStorage.removeItem("cdd_coach_name");
    if (window.cddAuth && window.cddAuth.ready) {
      // signOut() retire cdd_user_email et dispatche cdd-auth-changed.
      window.cddAuth.signOut();
    } else {
      localStorage.removeItem("cdd_user_email");
      window.dispatchEvent(new CustomEvent('cdd-auth-changed'));
    }
    // #57 — Retour à l'écran de CONNEXION, pas à l'onboarding (qui laissait
    // ré-entrer dans l'app sans s'authentifier).
    go("landing");
  };
  const installApp = () => {
    if (window.deferredInstallPrompt) {
      window.deferredInstallPrompt.prompt();
      window.deferredInstallPrompt.userChoice.then(() => {
        window.deferredInstallPrompt = null;
      });
    } else {
      alert("Sur iPhone : tape ↑ puis 'Sur l'écran d'accueil'.\nSur Android : menu Chrome → 'Ajouter à l'écran d'accueil'.");
    }
  };
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const editProfile = () => setShowProfileEdit(true);

  const accentOptions = [
    { id:"#c8f169", label:"Néon lime",  ink:"#062012" },
    { id:"#f5c451", label:"Or",         ink:"#1f1404" },
    { id:"#06b6d4", label:"Cyan ice",   ink:"#022027" },
    { id:"#ef4444", label:"Rouge feu",  ink:"#fff" },
    { id:"#a78bfa", label:"Violet pro", ink:"#1a0f33" },
    { id:"#22c55e", label:"Vert pelouse",ink:"#04120a" },
  ];

  return (
    <div className="scr scr-set fade-in" data-screen-label="09 Settings">

      {(() => {
        const coachName = (localStorage.getItem("cdd_coach_name") || "").trim();
        const userEmail = (localStorage.getItem("cdd_user_email") || "").trim();
        const initials = coachName
          ? coachName.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
          : (isAdmin ? '🛡️' : (club.short || club.name || 'CO').slice(0, 2).toUpperCase());
        // Pour l'admin : nom affiché spécifique si pas de coach name custom.
        const displayName = coachName
          || (isAdmin ? 'Admin Application' : (`Coach ${club.name || ''}`.trim() || 'Coach'));
        const roleLabel = window.CDD_ROLES?.roleLabel?.(role) || role.toUpperCase();
        const activeClub = window.CDD?.getActiveClub?.() || null;
        const clubColors = (window.CDD_CLUB && window.CDD_CLUB.colors) || [];
        // Pour l'admin : styling doré distinctif et libellé du contexte
        // « Toute l'application » au lieu d'un club/équipe spécifique.
        const adminGold = '#f5c451';
        return (
          <div className="set-profile" style={isAdmin ? {
            background: 'linear-gradient(135deg, rgba(245,196,81,0.10), rgba(245,196,81,0.03))',
            border: '1px solid rgba(245,196,81,0.40)',
          } : undefined}>
            <div className="set-avatar" style={{
              position:'relative',
              ...(isAdmin ? {
                background: 'linear-gradient(135deg, #f5c451, #d4a017)',
                color: '#1f1404',
              } : {}),
            }}>
              <div className="set-avatar-i" style={isAdmin ? {color:'#1f1404'} : undefined}>
                {initials}
              </div>
              <div className="set-avatar-badge" style={isAdmin ? {
                background: '#1f1404',
                border: '1px solid ' + adminGold,
                color: adminGold,
              } : undefined}>
                {isAdmin ? '🛡️ ADMIN APP' : roleLabel}
              </div>
              {/* Petit badge club en sur-impression — caché pour l'admin
                  (qui n'est attaché à aucun club en particulier). */}
              {window.ClubBadge && activeClub?.id && !isAdmin && (
                <div style={{
                  position:'absolute', bottom:-4, right:-4,
                  background:'#0a0e14', borderRadius:8, padding:2,
                }}>
                  <window.ClubBadge clubId={activeClub.id} clubName={club.short || club.name}
                                    colors={clubColors} size={24} shape="square"/>
                </div>
              )}
            </div>
            <div className="set-profile-info">
              <div className="set-profile-name" style={isAdmin ? {color: adminGold} : undefined}>
                {displayName}
              </div>
              <div className="set-profile-club">
                {isAdmin
                  ? <span style={{color:'rgba(245,196,81,0.85)', fontWeight:700}}>
                      🌐 Toute l'application
                    </span>
                  : `${club.name} · ${club.team}`}
              </div>
              <div className="set-profile-since">
                {userEmail || (
                  <span style={{color:'#fbbf24'}}>📧 Email non configuré — touche ✎ pour le renseigner</span>
                )}
              </div>
            </div>
            <button className="set-edit" onClick={editProfile}>✎</button>
          </div>
        );
      })()}

      {/* Phase D — Carte « Mes rôles » : liste COMPLÈTE, un rôle par équipe.
          Le rôle est une conséquence de la façon dont l'utilisateur a rejoint
          chaque équipe (création de club / lien d'invitation / attribution
          admin). Jamais saisi à la main. */}
      {(() => {
        const META = {
          admin:   { ic: '🛡️', label: 'Admin Application' },
          owner:   { ic: '👑', label: 'Propriétaire' },
          coach:   { ic: '📋', label: 'Coach principal' },
          adjoint: { ic: '🎽', label: 'Coach adjoint' },
          parent:  { ic: '👪', label: 'Parent' },
          joueur:  { ic: '⚽', label: 'Joueur' },
          lecteur: { ic: '👁️', label: 'Lecteur' },
        };
        const R = window.CDD_ROLES;
        const myRoles = (R && R.listMyTeamRoles) ? R.listMyTeamRoles() : [];
        const isAdminUser = !!(R && R.isAdmin && R.isAdmin());
        const canInvite = myInvitable.length
          ? 'Tu peux inviter : ' + myInvitable.join(', ') + '.'
          : 'Ton rôle ne permet pas de générer de liens d\'invitation.';
        // Pas de membership ET pas admin → message vide explicite.
        const isEmpty = !isAdminUser && myRoles.length === 0;
        // Cas admin : on synthétise une ligne « partout » plutôt que de
        // lister tous les clubs (qui peuvent être nombreux).
        const lines = isAdminUser && myRoles.length === 0
          ? [{ clubId: null, clubName: 'Toute l\'application',
               teamId: null, teamName: 'Tous les clubs et équipes',
               role: 'admin', isActive: true, legacy: false }]
          : myRoles;
        return (
          <div style={{
            margin: '0 14px 14px', padding: '14px 16px', borderRadius: 12,
            background: 'rgba(200,241,105,0.06)',
            border: '1px solid rgba(200,241,105,0.22)',
          }}>
            <div style={{ display:'flex', justifyContent:'space-between',
                          alignItems:'baseline', marginBottom: 8 }}>
              <div style={{
                fontSize: 10, fontWeight: 800, letterSpacing: '.12em',
                color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase',
              }}>{lines.length > 1 ? 'Mes rôles' : 'Mon rôle'}</div>
              <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.45)' }}>
                {lines.length > 0 && (lines.length === 1
                  ? '1 attribution'
                  : lines.length + ' attributions')}
              </div>
            </div>

            {isEmpty && (
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)',
                            lineHeight: 1.55 }}>
                Aucun rôle attribué pour le moment.<br/>
                Demande à l'admin de te rattacher à une équipe, ou utilise
                un lien d'invitation reçu.
              </div>
            )}

            {lines.map((r, i) => {
              const meta = META[r.role] || { ic: '•', label: r.role || '?' };
              return (
                <div key={(r.clubId || '_') + '/' + (r.teamId || '_') + '/' + i}
                     style={{
                       display: 'flex', gap: 11, alignItems: 'flex-start',
                       padding: '8px 0',
                       borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)',
                     }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                    background: r.isActive
                      ? 'rgba(200,241,105,0.18)'
                      : 'rgba(255,255,255,0.05)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18,
                  }}>{meta.ic}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      flexWrap: 'wrap',
                    }}>
                      <div style={{ fontSize: 14.5, fontWeight: 800, color: '#fff' }}>
                        {meta.label}
                      </div>
                      {r.isActive && (
                        <span style={{
                          fontSize: 9.5, fontWeight: 800, letterSpacing: '.08em',
                          padding: '2px 6px', borderRadius: 999,
                          background: 'rgba(200,241,105,0.18)',
                          color: '#c8f169', textTransform: 'uppercase',
                        }}>Actif</span>
                      )}
                      {r.legacy && (
                        <span title="Membership au format pré-migration (Phase D5 à venir)"
                              style={{
                          fontSize: 9.5, fontWeight: 700,
                          padding: '2px 6px', borderRadius: 999,
                          background: 'rgba(251,191,36,0.12)',
                          color: '#fbbf24',
                        }}>à migrer</span>
                      )}
                    </div>
                    <div style={{
                      fontSize: 11.5, color: 'rgba(255,255,255,0.6)',
                      lineHeight: 1.45, marginTop: 2,
                    }}>
                      {r.clubName}{r.teamId || r.legacy ? ' · ' + r.teamName : ''}
                    </div>
                  </div>
                </div>
              );
            })}

            <div style={{
              fontSize: 11, color: 'rgba(255,255,255,0.55)',
              lineHeight: 1.5, marginTop: 10,
              paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)',
            }}>
              {canInvite}
            </div>
            <div style={{
              fontSize: 10.5, color: '#c8f169', marginTop: 6,
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <span>🔒</span>
              <span>Défini automatiquement — non modifiable manuellement.</span>
            </div>
          </div>
        );
      })()}

      {showProfileEdit && (
        <ProfileEditModal
          initialName={localStorage.getItem("cdd_coach_name") || ""}
          initialEmail={localStorage.getItem("cdd_user_email") || ""}
          onClose={() => setShowProfileEdit(false)}
          onSave={({ name }) => {
            // #54 — On ne persiste que le NOM. L'email est l'identité
            // authentifiée Firebase, géré par cddAuth — jamais réécrit ici.
            if (name)  localStorage.setItem('cdd_coach_name', name);
            else       localStorage.removeItem('cdd_coach_name');
            window.dispatchEvent(new CustomEvent('cdd-data-rebuilt'));
            if (window.CDD_REBUILD) window.CDD_REBUILD();
            setRefresh(x => x + 1);
            setShowProfileEdit(false);
          }}/>
      )}

      <div className="set-sec">
        <div className="set-sec-k">COMPTE</div>
        <div className="set-rows">
          {/* Mon club / Mon équipe : masqué pour l'admin qui n'a pas de
              club spécifique. Il a un accès global via « Clubs & équipes »
              affiché plus bas dans la section ADMIN. */}
          {!isAdmin && (
            <>
              <SetRow ic="🏆" t="Mon club" d={club.name} go={() => isCoach ? go("sync") : alert('Réservé au coach')}/>
              <SetRow ic="👥" t={isParent ? 'Équipe' : 'Mon équipe'} d={`${club.team} · 18 joueurs`} go={() => go("effectif")}/>
            </>
          )}
          <SetRow ic="🔐" t="Compte" d={userEmail || 'Non connecté'}
                  status={userEmail ? 'ok' : undefined}
                  go={() => alert(userEmail
                    ? `Connecté en tant que ${userEmail}\n\nConnexion vérifiée par lien email. Pour changer de compte, déconnecte-toi puis reconnecte-toi.`
                    : "Tu n'es pas connecté. Reviens à l'accueil pour recevoir un lien de connexion.")}/>
          {isCoach && (
            <SetRow ic="📡" t="Synchronisation" d="Firestore · à jour" status="ok" go={() => go("sync")}/>
          )}
          {userEmail && (
            <SetRow ic="🆘" t="Forcer une resync match"
                    d="Si match fantôme, chrono cassé ou état bizarre"
                    go={async () => {
                      const ok = confirm(
                        'Forcer une resync complète du match en cours ?\n\n' +
                        '  • Le cache match local sera purgé\n' +
                        '  • Les données seront re-tirées depuis le cloud\n' +
                        '  • Aucune donnée joueur/équipe/club n\'est touchée\n\n' +
                        'Utile si tu vois un match fantôme, un chrono absurde, ' +
                        'ou un état désynchronisé entre tes devices.'
                      );
                      if (!ok) return;
                      if (!window.cddData?.forceResyncMatch) {
                        alert('Fonction indisponible (Firestore non initialisé).');
                        return;
                      }
                      try {
                        const r = await window.cddData.forceResyncMatch();
                        if (r.ok) {
                          alert('✓ Resync réussie\n\n' + (r.removed?.length || 0) +
                                ' clés cache purgées. État rechargé depuis le cloud.');
                        } else {
                          alert('❌ Resync échouée : ' + (r.error || 'inconnu') +
                                '\n\nLe cache local a été purgé mais le cloud n\'a pas répondu. ' +
                                'Vérifie ta connexion ou ton ad-blocker.');
                        }
                      } catch (e) {
                        alert('❌ Erreur : ' + e.message);
                      }
                    }}/>
          )}
          {/* #C5 — Membres du club : roster + rôle de chacun. Réservé au
              coach principal / owner / admin (canManageClub), pas l'adjoint.
              Pour l'admin : pertinent uniquement quand il a un club ACTIF
              sélectionné (il peut switcher de club via le panneau admin). */}
          {canManageClub && userEmail && !isAdmin && (
            <SetRow ic="👥" t="Membres du club"
                    d="Qui a rejoint le club et en quelle qualité"
                    go={() => setShowMembersPanel(true)}/>
          )}
          {/* #C5 — « Mon rôle » n'est plus une ligne éditable : voir la
              carte rôle en haut des Réglages (rôle dérivé, non modifiable). */}
          {userEmail && (
            <SetRow ic="🚪" t="Se déconnecter"
                    d="Couper la session (données conservées)"
                    go={() => {
                      const ok = confirm(
                        'Te déconnecter ?\n\n' +
                        '  • Ta session de connexion sera fermée\n' +
                        '  • Tes données locales ne sont PAS supprimées\n' +
                        '  • Tes rattachements (memberships) restent intacts\n' +
                        '  • Tu te reconnecteras via le lien envoyé par email'
                      );
                      if (!ok) return;
                      // #54 — Vraie déconnexion : coupe la session Firebase.
                      // Sans signOut(), onAuthStateChanged ressusciterait l'email.
                      if (window.cddAuth && window.cddAuth.ready) {
                        window.cddAuth.signOut();
                      } else {
                        try { localStorage.removeItem('cdd_user_email'); } catch (e) {}
                        window.dispatchEvent(new Event('cdd-auth-changed'));
                      }
                      window.dispatchEvent(new CustomEvent('cdd-memberships-changed'));
                      window.dispatchEvent(new CustomEvent('cdd-data-rebuilt'));
                      if (window.CDD_REBUILD) window.CDD_REBUILD();
                      setRefresh(x => x + 1);
                    }}/>
          )}
        </div>
      </div>

      {/* INVITER — génération de liens d'invitation (C4/C5). Visible dès que
          le rôle courant a au moins un rôle invitable (matrice). Lecteur exclu.
          Masqué pour l'admin app : ses outils sont dans le panneau « Clubs &
          équipes » (assigner / transférer coach directement, sans passer
          par un lien). */}
      {myInvitable.length > 0 && isCoach && !isAdmin && (
        <div className="set-sec">
          <div className="set-sec-k">INVITER QUELQU'UN</div>
          <div style={{ padding: '0 14px' }}>
            {window.InviteManager
              ? <window.InviteManager />
              : <div style={{ fontSize: 12, color: 'var(--tx-3)', padding: '8px 0' }}>
                  Module d'invitation indisponible.
                </div>}
          </div>
        </div>
      )}

      {/* MES RATTACHEMENTS — liste des clubs où l'user a une membership.
          C'est la source de vérité du « à quels clubs j'appartiens ».
          Le bouton 'Quitter' supprime la membership ET les données du club. */}
      {(() => {
        const myEmail = window.CDD_ROLES?.getCurrentEmail?.();
        if (!myEmail) {
          return (
            <div className="set-sec">
              <div className="set-sec-k">MES RATTACHEMENTS</div>
              <div style={{
                padding:'14px 16px', margin:'0 14px', borderRadius:10,
                background:'rgba(251,191,36,0.08)', border:'1px solid rgba(251,191,36,0.35)',
                fontSize:12, color:'#fbbf24', lineHeight:1.5,
              }}>
                Tu n'es rattaché à aucun club tant que ton email n'est pas saisi.<br/>
                Touche ✎ en haut pour configurer ton email coach.
              </div>
            </div>
          );
        }
        const myMemberships = window.CDD_ROLES?.listMemberships?.() || [];
        const allClubs = (() => {
          try { return JSON.parse(localStorage.getItem('arb_clubs') || '[]'); }
          catch (e) { return []; }
        })();
        const allTeams = (() => {
          try { return JSON.parse(localStorage.getItem('arb_teams') || '[]'); }
          catch (e) { return []; }
        })();
        const clubById = {};
        allClubs.forEach(c => { if (c && c.id) clubById[c.id] = c; });
        // Club actif courant — utilisé pour highlight + bouton « Activer ce club ».
        const activeClubId = (() => {
          try { return localStorage.getItem('arb_current_club') || null; }
          catch (e) { return null; }
        })();
        return (
          <div className="set-sec">
            <div className="set-sec-k">MES RATTACHEMENTS</div>
            <div style={{margin:'0 14px 14px', fontSize:11, opacity:0.55, lineHeight:1.4}}>
              Clubs et équipes où tu es enregistré comme membre actif.
              <br/>
              Email : <b>{myEmail}</b>
            </div>
            {myMemberships.length === 0 ? (
              <div style={{padding:'0 14px'}}>
                <div style={{
                  padding:'14px 16px', borderRadius:10,
                  background:'rgba(255,255,255,0.03)', border:'1px dashed rgba(255,255,255,0.10)',
                  fontSize:12, opacity:0.7, textAlign:'center', marginBottom:10,
                }}>
                  Aucun rattachement détecté pour <b>{myEmail}</b>.
                </div>
                <button onClick={() => {
                  // Diagnostic + tentative de migration forcée
                  const dump = window.CDD_ROLES?.diagnose?.();
                  const result = window.CDD_ROLES?.runMigrationIfNeeded?.();
                  const afterMemberships = window.CDD_ROLES?.listMemberships?.() || [];

                  const summary =
                    `═══ DIAGNOSTIC ═══\n` +
                    `Email : ${dump?.identity?.email || '(vide)'}\n` +
                    `\nSOURCES DE DONNÉES :\n` +
                    `  • localStorage arb_clubs : ${Array.isArray(dump?.localStorage?.arb_clubs) ? dump.localStorage.arb_clubs.length : '(rien)'}\n` +
                    `  • localStorage arb_teams : ${dump?.localStorage?.arb_teams_count}\n` +
                    `  • Seed clubs : ${dump?.seed?.clubs_count}\n` +
                    `  • Seed teams : ${dump?.seed?.teams_count}\n` +
                    `  • Override clubs : ${dump?.override?.arb_clubs_count}\n` +
                    `  • Override teams : ${dump?.override?.arb_teams_count}\n` +
                    `  • Adapter getAllClubs : ${dump?.adapter?.getAllClubs_count}\n` +
                    `  • Adapter getActiveClub : ${dump?.adapter?.getActiveClub ? dump.adapter.getActiveClub.name : '(rien)'}\n` +
                    `  • CDD_CLUB.name : ${dump?.globals?.CDD_CLUB?.name || '(rien)'}\n` +
                    `\nRÉSULTAT MIGRATION :\n` +
                    `  • ran : ${result?.ran}\n` +
                    `  • reason : ${result?.reason || '(none)'}\n` +
                    `  • added : ${result?.added || 0}\n` +
                    `  • persisted : ${result?.persisted || 0}\n` +
                    `\nMemberships après : ${afterMemberships.length}\n` +
                    `\nDétails complets dans la console (F12).`;

                  alert(summary);
                  if (afterMemberships.length > 0) setRefresh(x => x + 1);
                }} style={{
                  width:'100%', padding:'12px', borderRadius:10,
                  background:'rgba(200,241,105,0.10)', border:'1px solid rgba(200,241,105,0.40)',
                  color:'#c8f169', fontWeight:800, fontSize:13, fontFamily:'inherit',
                  cursor:'pointer',
                }}>🩺 Diagnostiquer + Migrer mes clubs</button>
                <div style={{fontSize:10, opacity:0.5, marginTop:8, textAlign:'center', lineHeight:1.5}}>
                  Inspecte toutes les sources de données (localStorage, seed, adapter, globals) et tente une migration forcée si des clubs sont détectés.
                </div>
              </div>
            ) : (
              <div style={{display:'flex', flexDirection:'column', gap:8, padding:'0 14px'}}>
                {myMemberships.map(m => {
                  const club = clubById[m.clubId];
                  const clubName = club?.name || `Club inconnu (${m.clubId.slice(0, 10)}…)`;
                  const clubColors = club?.colors || [
                    club?.primaryColor || club?.color || '#c8f169',
                    '#0a0e14',
                  ];
                  const teams = allTeams.filter(t => t.clubId === m.clubId);
                  const isInferred = !club;
                  // Rôle Phase D : on lit clubRole d'abord (owner/coach/admin),
                  // sinon le « meilleur » rôle parmi les équipes attachées,
                  // sinon legacy m.role (compat pre-D5). Évite l'affichage « ? ».
                  const roleOrder = ['owner', 'coach', 'adjoint', 'parent', 'joueur', 'lecteur'];
                  let effRole = m.clubRole || m.role || '';
                  if (!effRole && m.teams && typeof m.teams === 'object') {
                    for (const ord of roleOrder) {
                      const found = Object.values(m.teams).some(t => t && t.role === ord);
                      if (found) { effRole = ord; break; }
                    }
                  }
                  const effLabel = effRole
                    ? (window.CDD_ROLES?.roleLabel?.(effRole) || effRole)
                    : 'Membre';
                  // Carte active = club courant (cdd_active_context.clubId / arb_current_club).
                  // Mis en évidence visuel + bouton « Activer » caché (badge « Actif » à la place).
                  const isActive = m.clubId === activeClubId;
                  return (
                    <div key={m.clubId} style={{
                      padding:'12px 14px', borderRadius:10,
                      background: isActive ? 'rgba(200,241,105,0.06)' : 'rgba(255,255,255,0.03)',
                      border: isActive
                        ? '1px solid rgba(200,241,105,0.45)'
                        : '1px solid rgba(255,255,255,0.08)',
                      boxShadow: isActive ? '0 0 0 1px rgba(200,241,105,0.08)' : 'none',
                    }}>
                      <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:8}}>
                        {/* Vrai logo via ClubBadge (résout cdd_club_logos[clubId]
                            ou arb_clubs[].logoDataUrl) — fallback initiale+couleur. */}
                        {window.ClubBadge ? (
                          <window.ClubBadge clubId={m.clubId} clubName={clubName}
                                            colors={clubColors} size={38} shape="square"/>
                        ) : (
                          <div style={{
                            width:38, height:38, borderRadius:8,
                            background: clubColors[0], color: clubColors[1] || '#0a0e14',
                            display:'flex', alignItems:'center', justifyContent:'center',
                            fontWeight:900, fontSize:16,
                          }}>{(clubName[0] || '?').toUpperCase()}</div>
                        )}
                        <div style={{flex:1, minWidth:0}}>
                          <div style={{fontWeight:800, fontSize:14}}>
                            🏆 {effLabel} de {clubName}
                          </div>
                          <div style={{fontSize:11, opacity:0.6, marginTop:2}}>
                            {teams.length} équipe{teams.length > 1 ? 's' : ''}
                            {m.createdAt ? ` · rattaché depuis le ${new Date(m.createdAt).toLocaleDateString('fr-FR')}` : ''}
                            {m.createdBy === 'migration' ? ' · migration auto' : ''}
                            {isInferred ? ' · données héritage' : ''}
                          </div>
                        </div>
                      </div>
                      {teams.length > 0 && (
                        <div style={{fontSize:11, opacity:0.65, marginBottom:8, paddingLeft:48}}>
                          {teams.map(t => `${t.name || t.category || '?'} (${(t.players || []).length} j.)`).join(' · ')}
                        </div>
                      )}
                      <div style={{display:'flex', gap:8, paddingLeft:48, alignItems:'center', flexWrap:'wrap'}}>
                        {/* Switch club actif : badge « Actif » si déjà actif,
                            sinon bouton « Activer ce club » → écrit arb_current_club
                            + cdd_active_context.clubId, dispatch event, reload.
                            Logique miroir de switchClub() dans screen-transfert-sync-convp.jsx. */}
                        {isActive ? (
                          <span style={{
                            padding:'5px 10px', borderRadius:6, fontSize:11, fontWeight:800,
                            background:'rgba(200,241,105,0.15)',
                            border:'1px solid rgba(200,241,105,0.45)',
                            color:'#c8f169', fontFamily:'inherit',
                          }}>✓ Club actif</span>
                        ) : (
                          <button onClick={() => {
                            try {
                              localStorage.setItem('arb_current_club', m.clubId);
                              const ctxRaw = localStorage.getItem('cdd_active_context') || '{}';
                              const ctx = JSON.parse(ctxRaw);
                              ctx.clubId = m.clubId; ctx.teamId = null; ctx.matchId = null;
                              localStorage.setItem('cdd_active_context', JSON.stringify(ctx));
                              window.dispatchEvent(new CustomEvent('cdd-active-club-changed', { detail: { clubId: m.clubId } }));
                              if (window.CDD_REBUILD) window.CDD_REBUILD();
                              setTimeout(() => { try { location.reload(); } catch (e) {} }, 200);
                            } catch (e) { alert('Erreur switch club : ' + e.message); }
                          }} style={{
                            padding:'5px 10px', borderRadius:6, fontSize:11, fontWeight:800,
                            background:'linear-gradient(135deg,#c8f169,#a3e635)',
                            border:'1px solid #c8f169', color:'#0a0e14',
                            cursor:'pointer', fontFamily:'inherit',
                          }}>✅ Activer ce club</button>
                        )}
                        {/* Bouton « Quitter » volontairement discret (lien gris)
                            pour éviter les clics accidentels. La vraie sécurité
                            est dans la modale LeaveClubModal qui s'ouvre ensuite. */}
                        <button onClick={() => setLeavingClub({
                          clubId: m.clubId, clubName, teamsCount: teams.length,
                        })} style={{
                          padding:'5px 8px', borderRadius:6, fontSize:11, fontWeight:600,
                          background:'transparent',
                          border:'1px solid rgba(255,255,255,0.10)',
                          color:'rgba(255,255,255,0.45)', cursor:'pointer', fontFamily:'inherit',
                        }}>🗑 Quitter ce club…</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      <div className="set-sec">
        <div className="set-sec-k">APPARENCE</div>
        <div className="set-rows">
          <div className="set-row set-row-theme">
            <span className="set-row-ic">🎨</span>
            <div className="set-row-text">
              <span className="set-row-t">Couleur d'accent</span>
              <span className="set-row-d">{accentOptions.find(c => c.id === tweaks.accent)?.label || "Personnalisée"}</span>
            </div>
          </div>
          {/* Grille visuelle : pastille de couleur EN TAILLE, label en dessous,
              coche en haut à droite si sélectionné. Les classes .set-theme-swatches
              et .set-swatch sont définies dans quick-theme.css. */}
          <div className="set-theme-swatches">
            {accentOptions.map(c => {
              const selected = tweaks.accent === c.id;
              return (
                <button key={c.id}
                  className={`set-swatch ${selected ? "on" : ""}`}
                  onClick={() => setTweak("accent", c.id)}>
                  <span className="set-swatch-c" style={{background: c.id}}/>
                  <span className="set-swatch-l">{c.label}</span>
                  {selected && <span className="set-swatch-tick">✓</span>}
                </button>
              );
            })}
          </div>
          <SetRow ic="🌑" t="Thème sombre" d={dark ? "Activé" : "Désactivé"} rightToggle on={dark} onToggle={() => setToggle("dark", !dark)}/>
          <SetRow ic="📱" t="Installer l'app" d="Ajouter à l'écran d'accueil" go={installApp}/>
        </div>
      </div>

      {/* #C5 — Gestion du club (logo) : coach principal / owner / admin
          uniquement. L'adjoint ne gère pas le club. */}
      {canManageClub && (
        <div className="set-sec">
          <div className="set-sec-k">MON CLUB</div>
          <div className="set-rows">
            <ClubLogoRow refresh={() => setRefresh(x => x + 1)}/>
          </div>
        </div>
      )}

      {isCoach && (
        <div className="set-sec">
          <div className="set-sec-k">MATCH</div>
          <div className="set-rows">
            <SetRow ic="🔊" t="Sons" d={sons ? "Activés" : "Désactivés"} rightToggle on={sons} onToggle={() => setToggle("sons", !sons)}/>
            <SetRow ic="📳" t="Vibrations" d={vibrate ? "À chaque action" : "Désactivées"} rightToggle on={vibrate} onToggle={() => setToggle("vibrate", !vibrate)}/>
            <SetRow ic="🕒" t="Demi-temps auto" d={halfauto ? "25 min · auto" : "Manuel"} rightToggle on={halfauto} onToggle={() => setToggle("halftime_auto", !halfauto)}/>
            <SetRow ic="🟨" t="Sons cartons" d={sonsCart ? "Mode arbitre activé" : "Silencieux"} rightToggle on={sonsCart} onToggle={() => setToggle("cartons_sound", !sonsCart)}/>
          </div>
        </div>
      )}

      {isCoach && (
        <div className="set-sec">
          <div className="set-sec-k">DONNÉES</div>
          <div className="set-rows">
            <SetRow ic="☁️" t="Sauvegarder mon équipe" d="Envoie ta version actuelle en ligne, pour la retrouver sur tes autres appareils" go={cloudBackup}/>
            <SetRow ic="📥" t="Récupérer mon équipe" d="Remet sur cet appareil la dernière version enregistrée en ligne" go={cloudRestore}/>
            <SetRow ic="🔄" t="Pousser mes données joueurs" d="Force la synchro stats / profils / notes vers le cloud (pour que adjoints + parents voient les mêmes valeurs)" go={async () => {
              if (!window.cddData?.pushAllLocalOverrides) { alert('Service cloud indisponible.'); return; }
              try {
                const r = await window.cddData.pushAllLocalOverrides({ force: true });
                if (r && r.ok && r.counts) {
                  const c = r.counts;
                  const total = (c.stats||0) + (c.profiles||0) + (c.notes||0) + (c.perfDeltas||0);
                  alert('✓ Données poussées vers le cloud\n\n'
                    + 'Stats : ' + (c.stats||0) + '\n'
                    + 'Profils : ' + (c.profiles||0) + '\n'
                    + 'Notes : ' + (c.notes||0) + '\n'
                    + 'Historique match : ' + (c.perfDeltas||0)
                    + (c.errors ? '\n\n⚠ ' + c.errors + ' erreur(s) — détail console (F12)' : '')
                    + (total === 0 ? '\n\nAucune donnée locale à pousser (rien n\'a été édité sur cet appareil).' : ''));
                } else {
                  alert('✗ Push non effectué.\nRaison : ' + (r?.reason || 'inconnue'));
                }
              } catch (e) { alert('✗ Erreur : ' + ((e && e.message) || e)); }
            }}/>
            <SetRow ic="📤" t="Exporter mes données" d="Télécharger toutes mes données (JSON)" go={exportData}/>
            {isAdmin && (
              <SetRow ic="🗑️" t="Vider le cache local" d="Efface toutes les données locales" go={clearCache} warn/>
            )}
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="set-sec">
          <div className="set-sec-k">AVANCÉ · ADMIN</div>
          <div className="set-rows">
            <SetRow ic="🏟️" t="Clubs & équipes"
                    d="Créer un club, des équipes, assigner un coach principal"
                    go={() => setShowAdminClubsPanel(true)}/>
            <SetRow ic="🗂" t="Inventaire & audit"
                    d="Tous mes clubs/équipes · qui a créé quoi · quand"
                    go={() => setShowAdminPanel(true)}/>
            <SetRow ic="🔧" t="Outil doublons inter-équipes"
                    d="Détecter et nettoyer les joueurs dupliqués"
                    go={() => window.open('../../_admin/doublons.html', '_blank')}/>
            <SetRow ic="📊" t="Diagnostic CDD"
                    d="Stats internes (reads, fuites, …)"
                    go={() => {
                      try {
                        const s = window.CDD && window.CDD.getStats && window.CDD.getStats();
                        alert(JSON.stringify(s, null, 2));
                      } catch (e) { alert('Stats indisponibles'); }
                    }}/>
            <SetRow ic="🛠️" t="Mode dev"
                    d={'Admin role'}
                    go={() => alert('Tu es ADMIN')}/>
          </div>
        </div>
      )}

      {showAdminPanel && <AdminInventoryPanel onClose={() => setShowAdminPanel(false)}/>}

      {showAdminClubsPanel && window.AdminClubsPanel && (
        <window.AdminClubsPanel onClose={() => setShowAdminClubsPanel(false)}/>
      )}

      {showMembersPanel && (
        <ClubMembersPanel
          clubName={club.name}
          onClose={() => setShowMembersPanel(false)}/>
      )}

      {leavingClub && (
        <LeaveClubModal
          clubId={leavingClub.clubId}
          clubName={leavingClub.clubName}
          teamsCount={leavingClub.teamsCount}
          email={localStorage.getItem('cdd_user_email') || ''}
          onClose={() => setLeavingClub(null)}
          onConfirmed={() => {
            setLeavingClub(null);
            setRefresh(x => x + 1);
          }}/>
      )}

      <div className="set-sec">
        <div className="set-sec-k">À PROPOS</div>
        <div className="set-rows">
          <SetRow ic="ⓘ" t="Version"
                  d={(window.CDD_APP_VERSION || 'v?') + ' · Build ' + (window.CDD_APP_BUILD_DATE || '—')}
                  go={() => alert(
                    'Coach du Dimanche\n'
                    + 'Version : ' + (window.CDD_APP_VERSION || 'inconnue') + '\n'
                    + 'Build : ' + (window.CDD_APP_BUILD_DATE || 'inconnu') + '\n'
                    + 'L\'app du foot amateur'
                  )}/>
          <SetRow ic="❤️" t="Soutenir le projet" d="Bientôt disponible" go={() => alert("Merci de soutenir Coach du Dimanche ❤️\n\nLe soutien au projet (don ponctuel) arrive très bientôt dans une prochaine mise à jour.")}/>
          <SetRow ic="↩️" t="Déconnexion" d="Repartir à zéro" warn go={logout}/>
        </div>
      </div>

      <div className="set-foot">
        Coach du Dimanche · L'app du foot amateur
      </div>
    </div>
  );
}

function SetRow({ ic, t, d, status, rightToggle, on, onToggle, warn, go }) {
  const handleClick = (e) => {
    if (rightToggle && onToggle) {
      e.preventDefault();
      onToggle();
    } else if (go) {
      go();
    }
  };
  return (
    <button className={`set-row ${warn?"warn":""}`} onClick={handleClick}>
      <span className="set-row-ic">{ic}</span>
      <div className="set-row-text">
        <span className="set-row-t">{t}</span>
        {d && <span className="set-row-d">{d}</span>}
      </div>
      {status === "ok" && <span className="set-row-ok">●</span>}
      {rightToggle ? (
        <span className={`set-toggle ${on?"on":""}`}><i/></span>
      ) : (
        !status && <span className="set-row-arr">›</span>
      )}
    </button>
  );
}

// ─── Upload du logo club (par club_id, partagé entre toutes les équipes du club) ───
// Un même club (FCMH) peut avoir plusieurs équipes (U15, U11) qui partagent le logo.
// Storage : cdd_club_logos = { [clubId]: dataURL } — keyé par club, pas par équipe.
function ClubLogoRow({ refresh }) {
  const activeClub = window.CDD?.getActiveClub?.() || null;
  const activeClubId = activeClub?.id || null;
  const activeClubName = activeClub?.name || (window.CDD_CLUB && window.CDD_CLUB.name) || 'Mon club';
  const currentLogo = (window.CDD_CLUB && window.CDD_CLUB.logoDataUrl) || null;
  const fileInputRef = React.useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('Image trop lourde (max 10 Mo). Choisis une image plus légère.');
      return;
    }
    if (!activeClubId) {
      alert('Aucun club actif détecté. Sélectionne un club avant d\'uploader son logo.');
      return;
    }
    if (!window.CDD_compressImage) {
      alert('Module compression image indisponible. Recharge l\'app.');
      return;
    }
    try {
      // Compression : 256×256 max, JPEG qualité 80 → ~30-60 Ko (tient
      // largement dans la limite 1 Mo/doc Firestore, plan Spark OK).
      const dataUrl = await window.CDD_compressImage(file, 256, 0.8);
      const all = JSON.parse(localStorage.getItem('cdd_club_logos') || '{}');
      all[activeClubId] = dataUrl;
      localStorage.setItem('cdd_club_logos', JSON.stringify(all));
      if (window.CDD_CLUB) window.CDD_CLUB.logoDataUrl = dataUrl;
      window.dispatchEvent(new CustomEvent('cdd-data-rebuilt'));
      if (window.CDD_REBUILD) window.CDD_REBUILD();
      if (refresh) refresh();
      // Sync vers Firestore (base64 compressé dans clubs/{id}.logoUrl).
      if (window.cddData && window.cddData.saveClubLogoBase64) {
        window.cddData.saveClubLogoBase64(activeClubId, dataUrl)
          .catch(e => console.warn('[logo] sync Firestore', e));
      }
    } catch (e) {
      alert('Erreur traitement image : ' + (e.message || e));
    }
  };

  const removeLogo = () => {
    if (!confirm(`Supprimer le logo de ${activeClubName} ?`)) return;
    if (!activeClubId) return;
    try {
      const all = JSON.parse(localStorage.getItem('cdd_club_logos') || '{}');
      delete all[activeClubId];
      localStorage.setItem('cdd_club_logos', JSON.stringify(all));
      if (window.CDD_CLUB) window.CDD_CLUB.logoDataUrl = null;
      window.dispatchEvent(new CustomEvent('cdd-data-rebuilt'));
      if (window.CDD_REBUILD) window.CDD_REBUILD();
      if (refresh) refresh();
      // Sync vers Firestore (null efface le logo cloud aussi).
      if (window.cddData && window.cddData.saveClubLogoBase64) {
        window.cddData.saveClubLogoBase64(activeClubId, null)
          .catch(e => console.warn('[logo] sync delete Firestore', e));
      }
    } catch (e) {}
  };

  return (
    <div style={{
      padding: '14px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)',
      display:'flex', alignItems:'center', gap:14,
    }}>
      <div style={{
        width:56, height:56, borderRadius:14, flexShrink:0,
        background: currentLogo ? '#fff' : 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.12)',
        display:'flex', alignItems:'center', justifyContent:'center',
        overflow:'hidden',
      }}>
        {currentLogo ? (
          <img src={currentLogo} alt="Logo club" style={{width:'100%', height:'100%', objectFit:'cover'}}/>
        ) : (
          <span style={{fontSize:24, opacity:0.5}}>🛡</span>
        )}
      </div>
      <div style={{flex:1, minWidth:0}}>
        <div style={{fontSize:14, fontWeight:700, color:'#fff'}}>
          Logo de <span style={{color:'#c8f169'}}>{activeClubName}</span>
        </div>
        <div style={{fontSize:11, color:'rgba(255,255,255,0.55)', marginTop:2}}>
          Partagé par toutes les équipes du club · match live, mode vestiaire, partage parents
        </div>
        {/* Contraintes techniques visibles AVANT le clic — évite les rejets surprise */}
        <div style={{
          fontSize:10, color:'rgba(255,200,40,0.85)', marginTop:6,
          padding:'4px 8px', borderRadius:6,
          background:'rgba(255,200,40,0.06)', border:'1px solid rgba(255,200,40,0.18)',
          display:'inline-block',
        }}>
          💡 Image carrée recommandée · PNG/JPG · compressée auto en 256×256
        </div>
        <div style={{display:'flex', gap:6, marginTop:8}}>
          <button onClick={() => fileInputRef.current?.click()} style={{
            padding:'6px 10px', borderRadius:8,
            background:'rgba(200,241,105,0.12)', color:'#c8f169',
            border:'1px solid rgba(200,241,105,0.35)',
            fontSize:11, fontWeight:700, cursor:'pointer',
          }}>{currentLogo ? '🔄 Changer' : '📤 Uploader'}</button>
          {currentLogo && (
            <button onClick={removeLogo} style={{
              padding:'6px 10px', borderRadius:8,
              background:'rgba(255,107,107,0.10)', color:'#ff8a8a',
              border:'1px solid rgba(255,107,107,0.30)',
              fontSize:11, fontWeight:700, cursor:'pointer',
            }}>Supprimer</button>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*"
               style={{display:'none'}}
               onChange={(e) => handleFile(e.target.files && e.target.files[0])}/>
      </div>
    </div>
  );
}

// ─── Panneau admin : inventaire de tous les clubs/équipes + audit log ───
// Visible uniquement aux roles admin/owner. Sert à diagnostiquer "qui a créé quoi"
// et à anticiper la migration cloud (volumétrie data, mapping créateur → équipes).
function AdminInventoryPanel({ onClose }) {
  const data = React.useMemo(() => {
    const out = { clubs: [], teams: [], players: [], auditLog: [], storage: {} };
    try { out.clubs    = JSON.parse(localStorage.getItem('arb_clubs')    || '[]'); } catch (e) {}
    try { out.teams    = JSON.parse(localStorage.getItem('arb_teams')    || '[]'); } catch (e) {}
    try { out.players  = JSON.parse(localStorage.getItem('arb_players')  || '[]'); } catch (e) {}
    try { out.auditLog = JSON.parse(localStorage.getItem('cdd_audit_log')|| '[]'); } catch (e) {}
    // Pesée du localStorage : poids brut + estimation par préfixe.
    try {
      let totalBytes = 0;
      const byPrefix = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        const v = localStorage.getItem(k) || '';
        const bytes = (k.length + v.length) * 2; // UTF-16
        totalBytes += bytes;
        const prefix = k.split('_').slice(0, 2).join('_');
        byPrefix[prefix] = (byPrefix[prefix] || 0) + bytes;
      }
      out.storage = { totalBytes, totalKB: Math.round(totalBytes / 1024), byPrefix };
    } catch (e) {}
    return out;
  }, []);

  const fmtDate = (ts) => ts ? new Date(ts).toLocaleString('fr-FR') : '—';
  const fmtBytes = (b) => b > 1024 ? `${(b/1024).toFixed(1)} Ko` : `${b} o`;

  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:500,
      display:'flex', justifyContent:'center', alignItems:'flex-start', overflow:'auto', padding:20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width:'100%', maxWidth:600, background:'#0B1320', borderRadius:16,
        border:'1px solid rgba(255,255,255,0.12)', padding:20, color:'#fff',
        fontSize:13, lineHeight:1.5,
      }}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
          <div>
            <div style={{fontSize:11, fontWeight:800, letterSpacing:'.12em', color:'#c8f169', textTransform:'uppercase'}}>
              Inventaire & audit
            </div>
            <div style={{fontSize:18, fontWeight:900, marginTop:2}}>Toutes mes données</div>
          </div>
          <button onClick={onClose} style={{
            background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.18)',
            color:'#fff', width:32, height:32, borderRadius:16, cursor:'pointer', fontSize:16,
          }}>✕</button>
        </div>

        {/* Compteurs */}
        <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:18}}>
          {[
            { l:'Clubs', v: data.clubs.length, c:'#c8f169' },
            { l:'Équipes', v: data.teams.length, c:'#fbbf24' },
            { l:'Joueurs', v: data.players.length, c:'#3b82f6' },
            { l:'Storage', v: data.storage.totalKB + ' Ko', c:'#a78bfa' },
          ].map((x,i) => (
            <div key={i} style={{
              padding:'10px 6px', textAlign:'center', borderRadius:8,
              background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
            }}>
              <div style={{fontSize:18, fontWeight:900, color:x.c, fontVariantNumeric:'tabular-nums'}}>{x.v}</div>
              <div style={{fontSize:9, opacity:0.6, marginTop:2, letterSpacing:'.05em', textTransform:'uppercase'}}>{x.l}</div>
            </div>
          ))}
        </div>

        {/* Clubs avec audit */}
        <div style={{marginBottom:18}}>
          <div style={{fontSize:10, fontWeight:800, letterSpacing:'.12em', color:'rgba(255,255,255,0.55)', marginBottom:6, textTransform:'uppercase'}}>
            🏛 Clubs ({data.clubs.length})
          </div>
          {data.clubs.length === 0 ? (
            <div style={{fontSize:11, opacity:0.5, fontStyle:'italic'}}>Aucun club enregistré.</div>
          ) : data.clubs.map(c => (
            <div key={c.id} style={{
              padding:'8px 10px', borderRadius:8, marginBottom:5,
              background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)',
              display:'flex', justifyContent:'space-between', alignItems:'center', gap:8,
            }}>
              <div style={{minWidth:0, flex:1}}>
                <div style={{fontWeight:700}}>{c.name || c.id}</div>
                <div style={{fontSize:10, opacity:0.6}}>
                  ID: <code style={{fontSize:9}}>{c.id}</code>
                </div>
              </div>
              <div style={{fontSize:10, opacity:0.65, textAlign:'right', flexShrink:0}}>
                <div>Créé : {fmtDate(c.createdAt)}</div>
                <div>par : {c.createdBy || '— (legacy)'}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Équipes */}
        <div style={{marginBottom:18}}>
          <div style={{fontSize:10, fontWeight:800, letterSpacing:'.12em', color:'rgba(255,255,255,0.55)', marginBottom:6, textTransform:'uppercase'}}>
            👥 Équipes ({data.teams.length})
          </div>
          {data.teams.length === 0 ? (
            <div style={{fontSize:11, opacity:0.5, fontStyle:'italic'}}>Aucune équipe enregistrée.</div>
          ) : data.teams.map(t => (
            <div key={t.id} style={{
              padding:'8px 10px', borderRadius:8, marginBottom:5,
              background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{display:'flex', justifyContent:'space-between', gap:8}}>
                <div style={{minWidth:0, flex:1}}>
                  <div style={{fontWeight:700}}>{t.name || t.category || '(sans nom)'}</div>
                  <div style={{fontSize:10, opacity:0.6}}>
                    Club : <code style={{fontSize:9}}>{t.clubId || '?'}</code>
                    {' · '}
                    {(t.players || []).length || t.playersCount || 0} joueurs
                  </div>
                </div>
                <div style={{fontSize:10, opacity:0.65, textAlign:'right', flexShrink:0}}>
                  <div>Créée : {fmtDate(t.createdAt)}</div>
                  <div>par : {t.createdBy || '— (legacy)'}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Audit log */}
        <div style={{marginBottom:18}}>
          <div style={{fontSize:10, fontWeight:800, letterSpacing:'.12em', color:'rgba(255,255,255,0.55)', marginBottom:6, textTransform:'uppercase'}}>
            📝 Audit log ({data.auditLog.length})
          </div>
          {data.auditLog.length === 0 ? (
            <div style={{fontSize:11, opacity:0.5, fontStyle:'italic'}}>
              Aucune action tracée. Le journal commence aujourd'hui — actions passées non rétroactives.
            </div>
          ) : data.auditLog.slice(0, 20).map((a, i) => (
            <div key={i} style={{
              padding:'6px 10px', borderRadius:6, marginBottom:3,
              background:'rgba(255,255,255,0.02)', fontSize:11,
              display:'flex', justifyContent:'space-between', gap:8,
            }}>
              <span><b style={{color:'#c8f169'}}>{a.kind}</b> · {a.target}</span>
              <span style={{opacity:0.55, flexShrink:0}}>{fmtDate(a.ts)} · {a.by}</span>
            </div>
          ))}
        </div>

        {/* Storage par préfixe */}
        <div>
          <div style={{fontSize:10, fontWeight:800, letterSpacing:'.12em', color:'rgba(255,255,255,0.55)', marginBottom:6, textTransform:'uppercase'}}>
            💾 Stockage local ({data.storage.totalKB} Ko)
          </div>
          {Object.entries(data.storage.byPrefix || {})
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([prefix, bytes]) => (
              <div key={prefix} style={{
                display:'flex', justifyContent:'space-between', fontSize:11,
                padding:'4px 8px', borderRadius:4,
                background:'rgba(255,255,255,0.02)',
              }}>
                <code style={{fontSize:10, opacity:0.75}}>{prefix}*</code>
                <span style={{opacity:0.7, fontVariantNumeric:'tabular-nums'}}>{fmtBytes(bytes)}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

// ─── Modale d'édition profil coach (nom + email) ───
// Préfigure la Phase 3 : à terme l'email sera utilisé par Firebase Auth.
// Aujourd'hui sert juste à compléter le profil affiché localement.
function ProfileEditModal({ initialName, initialEmail, onClose, onSave }) {
  const [name, setName] = React.useState(initialName || '');
  const [email, setEmail] = React.useState(initialEmail || '');
  const emailValid = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:500,
      display:'flex', alignItems:'flex-start', justifyContent:'center', padding:20, overflow:'auto',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width:'100%', maxWidth:440, background:'#0B1320', borderRadius:16,
        border:'1px solid rgba(255,255,255,0.12)', padding:22, color:'#fff', marginTop:60,
      }}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
          <div>
            <div style={{fontSize:10, fontWeight:800, letterSpacing:'.12em', color:'#c8f169', textTransform:'uppercase'}}>
              Mon profil
            </div>
            <div style={{fontSize:18, fontWeight:900, marginTop:2}}>Compléter mes infos</div>
          </div>
          <button onClick={onClose} style={{
            background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.18)',
            color:'#fff', width:32, height:32, borderRadius:16, cursor:'pointer', fontSize:16,
          }}>✕</button>
        </div>

        <div style={{display:'flex', flexDirection:'column', gap:14}}>
          <label style={{display:'flex', flexDirection:'column', gap:6}}>
            <span style={{fontSize:11, fontWeight:800, letterSpacing:'.08em', color:'rgba(255,255,255,0.65)', textTransform:'uppercase'}}>
              Ton nom (affiché dans l'app)
            </span>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
                   placeholder="Florian Clarion"
                   autoFocus
                   style={{
                     width:'100%', padding:'12px 14px', borderRadius:10,
                     background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.14)',
                     color:'#fff', fontSize:15, outline:'none', boxSizing:'border-box',
                   }}/>
          </label>

          <label style={{display:'flex', flexDirection:'column', gap:6}}>
            <span style={{fontSize:11, fontWeight:800, letterSpacing:'.08em', color:'rgba(255,255,255,0.65)', textTransform:'uppercase'}}>
              Email de connexion
            </span>
            <input type="email" value={email} readOnly disabled
                   placeholder="ton.email@gmail.com"
                   style={{
                     width:'100%', padding:'12px 14px', borderRadius:10,
                     background:'rgba(255,255,255,0.03)',
                     border:'1px solid rgba(255,255,255,0.08)',
                     color:'rgba(255,255,255,0.6)', fontSize:15, outline:'none',
                     boxSizing:'border-box', cursor:'not-allowed',
                   }}/>
            <span style={{fontSize:10.5, color:'rgba(255,255,255,0.5)', lineHeight:1.5}}>
              🔐 Ton email est ton identité de connexion vérifiée — il n'est pas modifiable
              ici. Pour changer d'email, déconnecte-toi et reconnecte-toi avec le nouvel email.
            </span>
          </label>
        </div>

        <div style={{display:'flex', gap:8, marginTop:20}}>
          <button onClick={onClose} style={{
            flex:1, padding:'12px', borderRadius:10,
            background:'rgba(255,255,255,0.06)', color:'#fff',
            border:'1px solid rgba(255,255,255,0.14)', cursor:'pointer',
            fontWeight:700, fontSize:13,
          }}>Annuler</button>
          <button onClick={() => onSave({ name: name.trim(), email: email.trim() })}
                  style={{
            flex:2, padding:'12px', borderRadius:10,
            background:'#c8f169',
            color:'#0B1320', border:'none', cursor:'pointer',
            fontWeight:800, fontSize:13,
          }}>💾 Enregistrer</button>
        </div>
      </div>
    </div>
  );
}

// ─── Panneau « Membres du club » (#C5 + refonte Phase D) ─────────────
// Liste les memberships du club actif. Affiche pour CHAQUE membre :
//   • l'email (identité réelle)
//   • un BADGE par attribution (rôle + équipe), pas un seul badge global
//     → en multi-équipes futur : un même utilisateur peut être coach
//       sur U15 et adjoint sur U13. Chaque attribution s'affiche
//       séparément, claire et auditable.
//   • le joueur lié pour parent/joueur
//
// Cas spécial : archi.tech.fr@gmail.com = ADMIN de l'APPLICATION (pas
// owner du club). Badge or « ADMIN APP » distinct des owners de club.
//
// Sécurité : firestore.rules → memberships.read = canEditClub (coach
// principal/owner/admin). Adjoint, parent, joueur, lecteur ne peuvent
// PAS ouvrir ce panel (permission-denied → message clair).
const ADMIN_EMAIL_APP = 'archi.tech.fr@gmail.com';

function ClubMembersPanel({ clubName, onClose }) {
  const [state, setState] = React.useState({ phase: 'loading', members: [], teams: [], error: '' });
  const [reloadTick, setReloadTick] = React.useState(0);
  const [busyKey, setBusyKey] = React.useState(null); // uid+teamId en cours d'action

  // Email de l'utilisateur courant — pour interdire l'auto-révocation.
  const myEmail = (() => {
    try { return (localStorage.getItem('cdd_user_email') || '').trim().toLowerCase(); }
    catch (e) { return ''; }
  })();

  // Set des teamIds où JE suis coach principal — dérivé de la liste des
  // memberships une fois chargée. Permet d'afficher le bouton « Promouvoir »
  // uniquement sur les adjoints des équipes que je coache.
  const myTeamsAsCoach = React.useMemo(() => {
    const set = new Set();
    if (!myEmail) return set;
    const me = (state.members || []).find(m => (m.email || '').toLowerCase() === myEmail);
    if (!me) return set;
    const teams = me.teams || {};
    Object.keys(teams).forEach(tid => {
      if (teams[tid] && teams[tid].role === 'coach') set.add(tid);
    });
    return set;
  }, [state.members, myEmail]);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      const activeClub = window.CDD?.getActiveClub?.() || null;
      const clubId = activeClub?.id || null;
      if (!window.cddData || !window.cddData.ready) {
        if (alive) setState(s => ({ ...s, phase: 'error', error: 'Service cloud indisponible.' }));
        return;
      }
      if (!clubId) {
        if (alive) setState(s => ({ ...s, phase: 'error', error: 'Aucun club actif détecté.' }));
        return;
      }
      if (alive) setState(s => ({ ...s, phase: 'loading' }));
      try {
        // En parallèle : memberships du club + équipes du club (pour mapper teamId → nom).
        const [list, teams] = await Promise.all([
          window.cddData.fetchClubMemberships(clubId),
          window.cddData.fetchTeams ? window.cddData.fetchTeams(clubId).catch(() => []) : Promise.resolve([]),
        ]);
        // Tri : admin app → owner → coach → adjoint → parent → joueur → lecteur.
        const weightOf = (m) => {
          if ((m.email || '').toLowerCase() === ADMIN_EMAIL_APP) return 1000;
          if (m.clubRole === 'owner') return 900;
          if (m.clubRole === 'coach') return 800;
          const order = ['owner', 'coach', 'adjoint', 'parent', 'joueur', 'lecteur'];
          if (m.teams && typeof m.teams === 'object') {
            for (let i = 0; i < order.length; i++) {
              if (Object.values(m.teams).some(t => t && t.role === order[i])) {
                return 700 - i * 50;
              }
            }
          }
          // Legacy (pré-Phase D)
          if (m.role === 'owner')   return 900;
          if (m.role === 'coach')   return 800;
          if (m.role === 'adjoint') return 650;
          if (m.role === 'parent')  return 500;
          if (m.role === 'joueur')  return 400;
          if (m.role === 'lecteur') return 300;
          return 0;
        };
        list.sort((a, b) => weightOf(b) - weightOf(a));
        if (alive) setState({ phase: 'ready', members: list, teams, error: '' });
      } catch (e) {
        const msg = /permission|insufficient/i.test((e && e.message) || '')
          ? 'Accès refusé : seul le coach principal du club peut voir la liste des membres.'
          : 'Lecture impossible : ' + ((e && e.message) || e);
        if (alive) setState(s => ({ ...s, phase: 'error', error: msg }));
      }
    })();
    return () => { alive = false; };
  }, [reloadTick]);

  // Révoque le rôle d'un membre sur UNE équipe (par attribution).
  // Protections empilées : on ne propose même pas le bouton pour admin app /
  // owner / coach / soi-même — ce check est une seconde barrière en cas de
  // contournement du masquage UI.
  const revokeAttribution = async (m, teamId, role, teamLbl) => {
    if (!m || !teamId) return;
    const isAppAdmin = (m.email || '').toLowerCase() === ADMIN_EMAIL_APP;
    const isSelf     = (m.email || '').toLowerCase() === myEmail;
    if (isAppAdmin) { alert('L\'admin de l\'application ne peut pas être révoqué ici.'); return; }
    if (isSelf)     { alert('Tu ne peux pas révoquer ton propre accès. Utilise « Quitter ce club » dans Mes rattachements.'); return; }
    if (role === 'coach') {
      alert('Le coach principal ne peut pas être révoqué directement.\n\nPour le remplacer, demande à l\'admin de TRANSFÉRER le rôle à une autre personne (panneau Admin → Clubs & équipes).');
      return;
    }
    if (role === 'owner') {
      alert('Le propriétaire du club ne peut pas être révoqué ici.');
      return;
    }

    const who = m.displayName ? (m.displayName + ' (' + (m.email || m.uid) + ')')
                              : (m.email || m.uid);
    const ROLE_LBL = { adjoint:'Coach adjoint', parent:'Parent', joueur:'Joueur', lecteur:'Lecteur' };
    const rl = ROLE_LBL[role] || role;
    if (!confirm(
      'Révoquer l\'accès de ' + who + ' ?\n\n'
      + '• Rôle : ' + rl + '\n'
      + '• Équipe : ' + (teamLbl || teamId) + '\n\n'
      + 'Cette personne perdra immédiatement l\'accès à cette équipe. '
      + 'Pour lui redonner accès plus tard, il faudra lui générer un nouveau lien d\'invitation.'
    )) return;

    const key = m.uid + '_' + teamId;
    setBusyKey(key);
    try {
      const activeClub = window.CDD?.getActiveClub?.() || null;
      const clubId = activeClub?.id;
      if (!clubId) throw new Error('Club actif introuvable.');
      await window.cddData.removeTeamMembership(m.uid, clubId, teamId);
      setReloadTick(t => t + 1);
    } catch (e) {
      alert('Révocation impossible : ' + ((e && e.message) || e));
    } finally {
      setBusyKey(null);
    }
  };

  // Transfère le rôle de coach principal au membre cliqué.
  // Appelable UNIQUEMENT par le coach principal actuel de l'équipe,
  // et UNIQUEMENT sur une cible qui est déjà adjoint sur la même équipe.
  // Après transfert : la cible devient coach, l'utilisateur courant
  // devient adjoint sur cette équipe.
  const transferCoach = async (m, teamId, teamLbl) => {
    if (!m || !teamId) return;
    if (!myTeamsAsCoach.has(teamId)) {
      alert('Tu n\'es pas coach principal de cette équipe — transfert impossible.');
      return;
    }

    const who = m.displayName ? (m.displayName + ' (' + (m.email || m.uid) + ')')
                              : (m.email || m.uid);
    if (!confirm(
      '⚠ Transfert du rôle Coach principal\n\n'
      + '• Équipe : ' + (teamLbl || teamId) + '\n'
      + '• Nouveau coach principal : ' + who + '\n'
      + '• Toi : tu redeviens Coach adjoint sur cette équipe\n\n'
      + 'Tu perdras :\n'
      + '  – la possibilité d\'inviter un autre coach\n'
      + '  – les droits de gestion exclusifs du coach principal\n\n'
      + 'Cette action est immédiate. Continuer ?'
    )) return;

    // Récupère MON uid via la membership courante (myEmail → membership.uid).
    const myMember = (state.members || []).find(mm => (mm.email || '').toLowerCase() === myEmail);
    if (!myMember || !myMember.uid) {
      alert('Impossible de retrouver ton compte — recharge la page et réessaie.');
      return;
    }

    const key = m.uid + '_' + teamId;
    setBusyKey(key);
    try {
      const activeClub = window.CDD?.getActiveClub?.() || null;
      const clubId = activeClub?.id;
      if (!clubId) throw new Error('Club actif introuvable.');
      await window.cddData.transferTeamCoach({
        fromUid: myMember.uid,
        toUid:   m.uid,
        clubId,
        teamId,
        demoteToRole: 'adjoint',
      });
      // Force un re-pull cloud pour rafraîchir le rôle courant de l'app
      // (sinon le bandeau coach reste actif côté UI tant qu'on n'a pas
      // rechargé).
      try { if (window.cddData.pullCloudData) await window.cddData.pullCloudData(); } catch (e) {}
      alert('Transfert effectué.\n\nTu es maintenant coach adjoint de cette équipe.\nLa page va se recharger pour appliquer ton nouveau rôle.');
      setTimeout(() => window.location.reload(), 300);
    } catch (e) {
      alert('Transfert impossible : ' + ((e && e.message) || e));
      setBusyKey(null);
    }
  };

  const players = window.CDD_PLAYERS || [];
  const playerName = (pid) => {
    if (!pid) return null;
    const p = players.find(x => x.id === pid);
    return p ? ((p.first || '') + ' ' + (p.last || '')).trim() : null;
  };
  const teamLabel = (tid) => {
    const t = state.teams.find(x => x.id === tid);
    return (t?.name || t?.category || '').trim() || null;
  };
  const fmtDate = (ts) => {
    try {
      if (ts && ts.toDate) return ts.toDate().toLocaleDateString('fr-FR');
      if (typeof ts === 'number') return new Date(ts).toLocaleDateString('fr-FR');
    } catch (e) {}
    return '';
  };

  // Métadonnées par rôle : icône, libellé, couleur du badge.
  const ROLE_META = {
    admin:   { ic: '🛡️', label: 'Admin Application', color: '#f5c451' },
    owner:   { ic: '👑', label: 'Propriétaire',  color: '#f5c451' },
    coach:   { ic: '📋', label: 'Coach principal', color: '#c8f169' },
    adjoint: { ic: '🎽', label: 'Coach adjoint', color: '#7dd3fc' },
    parent:  { ic: '👪', label: 'Parent',         color: '#a78bfa' },
    joueur:  { ic: '⚽', label: 'Joueur',         color: '#22c55e' },
    lecteur: { ic: '👁️', label: 'Lecteur',        color: '#94a3b8' },
  };

  // Décompose une membership en lignes d'attribution affichables.
  // Une membership peut donner plusieurs lignes (un rôle par équipe).
  const decomposeMembership = (m) => {
    const lines = [];
    const isAppAdmin = (m.email || '').toLowerCase() === ADMIN_EMAIL_APP;

    if (isAppAdmin) {
      lines.push({
        role: 'admin',
        scope: 'Toute l\'application',
        sub: null,
      });
      return lines;
    }

    // Phase D — clubRole (owner ou coach club-wide) sans équipe spécifique.
    if (m.clubRole === 'owner') {
      lines.push({ role: 'owner', scope: 'Tout le club', sub: null });
    } else if (m.clubRole === 'coach' && (!m.teams || Object.keys(m.teams).length === 0)) {
      lines.push({ role: 'coach', scope: 'Tout le club', sub: null });
    }

    // Phase D — un rôle par équipe.
    if (m.teams && typeof m.teams === 'object') {
      Object.keys(m.teams).forEach(tid => {
        const t = m.teams[tid];
        if (!t || !t.role) return;
        const tLabel = teamLabel(tid) || 'Équipe inconnue';
        const pn = playerName(t.playerId);
        let sub = null;
        if (t.role === 'parent') sub = pn ? 'Suit ' + pn : 'Joueur lié manquant';
        if (t.role === 'joueur') sub = pn ? 'Fiche : ' + pn : null;
        lines.push({ role: t.role, scope: tLabel, sub, teamId: tid });
      });
    }

    // Legacy fallback (pré-Phase D : un seul rôle plat sur la membership).
    if (lines.length === 0 && m.role) {
      const pn = playerName(m.playerId);
      let sub = null;
      if (m.role === 'parent') sub = pn ? 'Suit ' + pn : 'Joueur lié manquant';
      if (m.role === 'joueur') sub = pn ? 'Fiche : ' + pn : null;
      lines.push({ role: m.role, scope: 'Tout le club', sub, legacy: true });
    }

    // Cas extrême : aucune info exploitable → ligne neutre.
    if (lines.length === 0) {
      lines.push({ role: 'lecteur', scope: '—', sub: 'Rattachement sans rôle défini' });
    }
    return lines;
  };

  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:500,
      display:'flex', justifyContent:'center', alignItems:'flex-start', overflow:'auto', padding:20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width:'100%', maxWidth:540, background:'#0B1320', borderRadius:16,
        border:'1px solid rgba(255,255,255,0.12)', padding:20, color:'#fff',
      }}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
          <div>
            <div style={{fontSize:11, fontWeight:800, letterSpacing:'.12em', color:'#c8f169', textTransform:'uppercase'}}>
              Membres du club
            </div>
            <div style={{fontSize:18, fontWeight:900, marginTop:2}}>{clubName || 'Mon club'}</div>
          </div>
          <button onClick={onClose} style={{
            background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.18)',
            color:'#fff', width:32, height:32, borderRadius:16, cursor:'pointer', fontSize:16,
          }}>✕</button>
        </div>

        {state.phase === 'loading' && (
          <div style={{fontSize:13, opacity:0.6, padding:'14px 0'}}>Chargement…</div>
        )}

        {state.phase === 'error' && (
          <div style={{
            padding:'14px 16px', borderRadius:10,
            background:'rgba(251,191,36,0.08)', border:'1px solid rgba(251,191,36,0.35)',
            fontSize:12.5, color:'#fbbf24', lineHeight:1.5,
          }}>{state.error}</div>
        )}

        {state.phase === 'ready' && state.members.length === 0 && (
          <div style={{fontSize:12.5, opacity:0.6, padding:'14px 0', fontStyle:'italic'}}>
            Aucun membre rattaché pour l'instant. Génère un lien d'invitation
            depuis « Inviter quelqu'un » pour ajouter des membres.
          </div>
        )}

        {state.phase === 'ready' && state.members.length > 0 && (
          <div style={{display:'flex', flexDirection:'column', gap:10}}>
            {state.members.map(m => {
              const lines = decomposeMembership(m);
              const isAppAdmin = (m.email || '').toLowerCase() === ADMIN_EMAIL_APP;
              const isSelf     = (m.email || '').toLowerCase() === myEmail;
              return (
                <div key={m.id || m.uid} style={{
                  padding:'12px 14px', borderRadius:10,
                  background: isAppAdmin
                    ? 'rgba(245,196,81,0.05)'
                    : 'rgba(255,255,255,0.03)',
                  border: isAppAdmin
                    ? '1px solid rgba(245,196,81,0.30)'
                    : '1px solid rgba(255,255,255,0.08)',
                }}>
                  {/* Identité : displayName (si dispo) + email en sous-titre */}
                  <div style={{marginBottom:8}}>
                    {m.displayName && (
                      <div style={{
                        fontSize:14, fontWeight:800,
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                      }}>
                        {m.displayName}
                        {isSelf && (
                          <span style={{
                            fontSize:9.5, fontWeight:800, letterSpacing:'.05em',
                            marginLeft:8, padding:'2px 6px', borderRadius:4,
                            background:'rgba(200,241,105,0.18)', color:'#c8f169',
                            textTransform:'uppercase',
                          }}>Toi</span>
                        )}
                      </div>
                    )}
                    <div style={{
                      fontSize: m.displayName ? 11.5 : 13.5,
                      fontWeight: m.displayName ? 500 : 800,
                      opacity: m.displayName ? 0.6 : 1,
                      marginTop: m.displayName ? 2 : 0,
                      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                    }}>
                      {m.email || m.uid || '—'}
                      {!m.displayName && isSelf && (
                        <span style={{
                          fontSize:9.5, fontWeight:800, letterSpacing:'.05em',
                          marginLeft:8, padding:'2px 6px', borderRadius:4,
                          background:'rgba(200,241,105,0.18)', color:'#c8f169',
                          textTransform:'uppercase',
                        }}>Toi</span>
                      )}
                    </div>
                  </div>

                  {/* Liste des attributions (rôle + équipe) */}
                  <div style={{display:'flex', flexDirection:'column', gap:8}}>
                    {lines.map((ln, idx) => {
                      const meta = ROLE_META[ln.role] || { ic:'•', label: ln.role, color:'#94a3b8' };
                      // Le bouton « Révoquer » n'apparaît QUE pour les rôles
                      // d'équipe non-coach, et pas pour soi-même / admin app.
                      // Une ligne « club-wide » (sans teamId) n'est pas révocable
                      // ici — ces rôles élevés relèvent du panneau admin.
                      const teamId = ln.teamId;
                      const canRevoke = !!teamId
                                     && !isAppAdmin
                                     && !isSelf
                                     && ln.role !== 'coach'
                                     && ln.role !== 'owner';
                      // Bouton « Promouvoir coach » : visible uniquement si
                      //   • la ligne est un adjoint
                      //   • JE suis coach principal de cette équipe
                      //   • ce n'est pas moi-même / pas l'admin app
                      const canPromote = !!teamId
                                      && !isAppAdmin
                                      && !isSelf
                                      && ln.role === 'adjoint'
                                      && myTeamsAsCoach.has(teamId);
                      const key = m.uid + '_' + (teamId || '');
                      const isBusy = busyKey === key;
                      return (
                        <div key={idx} style={{display:'flex', alignItems:'flex-start', gap:8}}>
                          <span style={{
                            fontSize:9.5, fontWeight:800, letterSpacing:'.05em',
                            textTransform:'uppercase',
                            color:'#0a0e14', background: meta.color,
                            padding:'3px 7px', borderRadius:5, flexShrink:0,
                            whiteSpace:'nowrap',
                          }}>{meta.ic} {meta.label}</span>
                          <div style={{flex:1, minWidth:0}}>
                            <div style={{fontSize:12, color:'rgba(255,255,255,0.85)'}}>
                              {ln.scope}
                              {ln.legacy && (
                                <span title="Format legacy pré-Phase D — à migrer"
                                      style={{
                                  fontSize:9, fontWeight:700, marginLeft:6,
                                  padding:'1px 5px', borderRadius:4,
                                  background:'rgba(251,191,36,0.15)', color:'#fbbf24',
                                }}>à migrer</span>
                              )}
                            </div>
                            {ln.sub && (
                              <div style={{
                                fontSize:11, opacity:0.6, marginTop:2, lineHeight:1.4,
                              }}>{ln.sub}</div>
                            )}
                          </div>
                          {canPromote && (
                            <button
                              onClick={() => transferCoach(m, teamId, ln.scope)}
                              disabled={isBusy}
                              style={{
                                fontSize:10.5, fontWeight:800,
                                padding:'4px 9px', borderRadius:6,
                                background: isBusy ? 'rgba(251,191,36,0.04)' : 'rgba(251,191,36,0.12)',
                                color:'#fbbf24',
                                border:'1px solid rgba(251,191,36,0.40)',
                                cursor: isBusy ? 'wait' : 'pointer',
                                opacity: isBusy ? 0.5 : 1,
                                flexShrink:0, whiteSpace:'nowrap',
                              }}
                              title="Transférer le rôle Coach principal à cette personne (tu redeviens adjoint)">
                              {isBusy ? '…' : '↔ Promouvoir coach'}
                            </button>
                          )}
                          {canRevoke && (
                            <button
                              onClick={() => revokeAttribution(m, teamId, ln.role, ln.scope)}
                              disabled={isBusy}
                              style={{
                                fontSize:10.5, fontWeight:800,
                                padding:'4px 9px', borderRadius:6,
                                background: isBusy ? 'rgba(239,68,68,0.04)' : 'rgba(239,68,68,0.10)',
                                color:'#fca5a5',
                                border:'1px solid rgba(239,68,68,0.32)',
                                cursor: isBusy ? 'wait' : 'pointer',
                                opacity: isBusy ? 0.5 : 1,
                                flexShrink:0, whiteSpace:'nowrap',
                              }}
                              title="Révoque le rôle de cette personne sur cette équipe">
                              {isBusy ? '…' : '✕ Révoquer'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Date de rattachement (info secondaire) */}
                  {fmtDate(m.createdAt) && (
                    <div style={{
                      fontSize:10.5, opacity:0.45, marginTop:8,
                      paddingTop:6, borderTop:'1px solid rgba(255,255,255,0.05)',
                    }}>
                      rattaché le {fmtDate(m.createdAt)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div style={{fontSize:10.5, opacity:0.45, marginTop:14, lineHeight:1.5}}>
          Liste des rattachements réels (Firestore). Un même utilisateur peut
          avoir plusieurs rôles (un par équipe). Révoquer un accès coupe
          immédiatement l'accès de la personne à l'équipe concernée.
        </div>
      </div>
    </div>
  );
}

window.ScreenSettings = ScreenSettings;

// ─── Modale « Quitter ce club » ─────────────────────────────────────
// Action destructive (irréversible) → friction délibérée :
//   1. Liste explicite de ce qui sera perdu (équipes, joueurs, logo).
//   2. Champ texte à remplir EXACTEMENT avec le nom du club. Le bouton
//      « Quitter définitivement » reste désactivé tant que le nom n'est
//      pas tapé à l'identique. Évite les clics accidentels (un confirm
//      natif est trop facile à valider sans réfléchir).
function LeaveClubModal({ clubId, clubName, teamsCount, email, onClose, onConfirmed }) {
  const [typed, setTyped] = React.useState('');
  const [working, setWorking] = React.useState(false);
  const expected = (clubName || '').trim();
  const canQuit = typed.trim() === expected && !working;

  const handleQuit = async () => {
    if (!canQuit) return;
    setWorking(true);
    try {
      // 1. Cloud : supprime la membership Firestore (refuse si coach
      //    principal ou owner — l'utilisateur doit d'abord transférer).
      //    Si le service cloud est dispo, c'est OBLIGATOIRE pour que la
      //    sortie soit définitive (sinon le prochain pullCloudData
      //    ré-attacherait l'utilisateur).
      if (window.cddData && window.cddData.ready && window.cddData.leaveClub) {
        const res = await window.cddData.leaveClub(clubId);
        if (!res || !res.ok) {
          throw new Error('Échec côté cloud');
        }
      }
      // 2. Local : nettoie localStorage (memberships, arb_clubs, arb_teams,
      //    logo). Bascule sur un autre club si c'était le club actif.
      const ok = window.CDD_ROLES?.deleteClubAndData?.(clubId, { email });
      if (ok) {
        if (onConfirmed) onConfirmed();
      } else {
        alert('Membership supprimée côté cloud mais nettoyage local échoué.\nRecharge la page pour re-synchroniser.');
        setWorking(false);
      }
    } catch (e) {
      alert('Impossible de quitter ce club :\n\n' + ((e && e.message) || e));
      setWorking(false);
    }
  };

  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.78)', zIndex:500,
      display:'flex', justifyContent:'center', alignItems:'flex-start',
      overflow:'auto', padding:20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width:'100%', maxWidth:460, background:'#0B1320', borderRadius:16,
        border:'1px solid rgba(239,68,68,0.35)', padding:22, color:'#fff', marginTop:40,
      }}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14}}>
          <div>
            <div style={{
              fontSize:10, fontWeight:800, letterSpacing:'.12em',
              color:'#ef4444', textTransform:'uppercase',
            }}>Action irréversible</div>
            <div style={{fontSize:20, fontWeight:900, marginTop:4}}>Quitter {clubName}</div>
          </div>
          <button onClick={onClose} style={{
            background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.18)',
            color:'#fff', width:32, height:32, borderRadius:16, cursor:'pointer', fontSize:16,
          }}>✕</button>
        </div>

        <div style={{
          padding:'12px 14px', borderRadius:10, marginBottom:14,
          background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.35)',
          fontSize:12.5, lineHeight:1.6, color:'rgba(255,255,255,0.92)',
        }}>
          Cette action <b style={{color:'#ff8a8a'}}>supprime définitivement</b> sur cet appareil :
          <ul style={{margin:'8px 0 0', paddingLeft:20, lineHeight:1.7}}>
            <li>le club <b>{clubName}</b></li>
            <li>{teamsCount} équipe{teamsCount > 1 ? 's' : ''} et leurs joueurs</li>
            <li>le logo et les préférences du club</li>
            <li>ton rattachement (membership) au club</li>
          </ul>
          <div style={{marginTop:10, fontSize:11.5, opacity:0.8}}>
            Tu pourras à nouveau rejoindre le club uniquement par un lien d'invitation.
          </div>
        </div>

        <label style={{display:'flex', flexDirection:'column', gap:6, marginBottom:14}}>
          <span style={{fontSize:11, fontWeight:800, letterSpacing:'.06em', color:'rgba(255,255,255,0.75)', textTransform:'uppercase'}}>
            Pour confirmer, retape : <b style={{color:'#c8f169'}}>{expected}</b>
          </span>
          <input
            type="text"
            value={typed}
            onChange={e => setTyped(e.target.value)}
            placeholder={expected}
            autoFocus
            autoCapitalize="off"
            autoCorrect="off"
            style={{
              width:'100%', padding:'12px 14px', borderRadius:10,
              background:'rgba(255,255,255,0.06)',
              border:`1px solid ${canQuit ? 'rgba(239,68,68,0.55)' : 'rgba(255,255,255,0.14)'}`,
              color:'#fff', fontSize:15, outline:'none', boxSizing:'border-box',
              fontFamily:'inherit',
            }}/>
          <span style={{fontSize:10.5, opacity:0.55, lineHeight:1.5}}>
            La saisie est sensible aux majuscules. Recopie le nom à l'identique.
          </span>
        </label>

        <div style={{display:'flex', gap:8}}>
          <button onClick={onClose} disabled={working} style={{
            flex:1, padding:'12px', borderRadius:10,
            background:'rgba(255,255,255,0.06)', color:'#fff',
            border:'1px solid rgba(255,255,255,0.14)', cursor: working ? 'default' : 'pointer',
            fontWeight:700, fontSize:13, fontFamily:'inherit',
            opacity: working ? 0.5 : 1,
          }}>Annuler</button>
          <button onClick={handleQuit} disabled={!canQuit} style={{
            flex:2, padding:'12px', borderRadius:10,
            background: canQuit ? '#ef4444' : 'rgba(239,68,68,0.18)',
            color: canQuit ? '#fff' : 'rgba(255,138,138,0.55)',
            border:'none', cursor: canQuit ? 'pointer' : 'not-allowed',
            fontWeight:800, fontSize:13, fontFamily:'inherit',
          }}>
            {working ? 'Suppression…' : '🗑 Quitter définitivement'}
          </button>
        </div>
      </div>
    </div>
  );
}
