/* global React */

/* ============================================================
   SCREEN — Landing publique (mode visiteur sans token)
   ────────────────────────────────────────────────────────────
   Affichee quand :
     • cdd_user_email est vide (pas connecte)
     • ET aucun token magique dans l'URL (?carnet=, ?p=, ?t=,
       ?invite=)
   Aucune donnee club n'est exposee. Le visiteur doit choisir
   un parcours explicite avant de voir quoi que ce soit.
   ============================================================ */

function ScreenLanding({ onLoggedIn, onOpenLink }) {
  const { useState: useLS } = React;

  // ── Detection du contexte d'arrivée : un parent peut arriver via un lien
  // individuel (?carnet= ou ?p=) MAIS sans email saisi. On adapte le message
  // pour expliquer pourquoi il doit creer un compte avant de voir la fiche.
  // Pour ?invite= : firebase-sync.js capture le token DÈS le chargement
  // dans cdd_pending_invite et nettoie l'URL — on doit donc aussi regarder
  // dans localStorage pour ne pas perdre l'info après le strip.
  const arrivalContext = (() => {
    try {
      const params = new URLSearchParams(window.location.search || '');
      const carnet = params.get('carnet') || params.get('joueur');
      const p      = params.get('p');
      const t      = params.get('t');
      const invite = params.get('invite')
                  || localStorage.getItem('cdd_pending_invite') || null;
      if (carnet) return { kind: 'carnet', playerId: carnet };
      if (p)      return { kind: 'convoc', playerId: p };
      if (t)      return { kind: 'share',  token: t };
      if (invite) return { kind: 'invite', token: invite };
    } catch (e) {}
    return { kind: 'none' };
  })();

  const hasIndividualToken = arrivalContext.kind === 'carnet' || arrivalContext.kind === 'convoc';
  const hasShareToken = arrivalContext.kind === 'share';
  const hasInvite = arrivalContext.kind === 'invite';
  // Mode initial depuis l'onboarding émotionnel (intent stocké).
  // Permet de basculer directement sur 'coach-signup' / 'paste-link' /
  // 'returning-signin' au lieu d'afficher 'home' à un user qui vient de
  // finir le parcours et a cliqué sur sa carte d'intention.
  const fromOnbIntent = (() => {
    try {
      const v = (localStorage.getItem('cdd_landing_initial_mode') || '').trim();
      if (v) {
        localStorage.removeItem('cdd_landing_initial_mode'); // one-shot
        return v;
      }
    } catch (e) {}
    return null;
  })();
  const initialMode = hasInvite ? 'invite-pending'
                    : hasShareToken ? 'share-signup'
                    : hasIndividualToken ? 'parent-signup'
                    : (fromOnbIntent || 'home');
  const [mode, setMode] = useLS(initialMode);

  // ── Page de validation invitation : on charge les détails (clubName,
  // playerName, role…) AVANT login. Les invites sont lisibles publique-
  // ment côté Firestore (le token EST le secret d'accès).
  const [invite, setInvite] = useLS(null);
  const [inviteError, setInviteError] = useLS('');
  const [inviteLoading, setInviteLoading] = useLS(hasInvite);
  React.useEffect(() => {
    if (!hasInvite || !arrivalContext.token) return;
    let alive = true;
    let timeoutId = null;
    let readyListener = null;

    const doFetch = async () => {
      if (!alive) return;
      try {
        const inv = await window.cddData.fetchInvite(arrivalContext.token);
        if (!alive) return;
        if (!inv) { setInviteError('Lien invalide ou supprimé.'); setInviteLoading(false); return; }
        if (inv.consumed) { setInviteError('Ce lien a déjà été utilisé.'); setInviteLoading(false); return; }
        if (inv.expiresAt && Date.now() > inv.expiresAt) {
          setInviteError('Ce lien a expiré. Demande à ton coach un nouveau lien.');
          setInviteLoading(false); return;
        }
        setInvite(inv);
        setInviteLoading(false);
      } catch (e) {
        if (!alive) return;
        setInviteError('Lecture impossible : ' + ((e && e.message) || e));
        setInviteLoading(false);
      }
    };

    // RACE FIX : sur iPhone/connexion lente, le composant monte AVANT que
    // firebase-sync.js finisse d'initialiser window.cddData. On attendait
    // pas, on déclarait "Service indisponible" tout de suite → utilisateur
    // bloqué. Désormais : si pas prêt, on attend l'event cdd-sync-ready
    // (avec un timeout de 10s pour ne pas attendre indéfiniment).
    if (window.cddData && window.cddData.fetchInvite) {
      doFetch();
    } else {
      readyListener = () => {
        if (!alive) return;
        if (window.cddData && window.cddData.fetchInvite) {
          if (timeoutId) clearTimeout(timeoutId);
          doFetch();
        }
      };
      window.addEventListener('cdd-sync-ready', readyListener);
      // Filet de sécurité : si rien n'arrive en 10s, on bascule sur l'erreur
      timeoutId = setTimeout(() => {
        if (!alive) return;
        if (window.cddData && window.cddData.fetchInvite) {
          doFetch();
        } else {
          setInviteLoading(false);
          setInviteError('Connexion lente — recharge la page (tire vers le bas) ou vérifie ta connexion internet.');
        }
      }, 10000);
    }

    return () => {
      alive = false;
      if (timeoutId) clearTimeout(timeoutId);
      if (readyListener) window.removeEventListener('cdd-sync-ready', readyListener);
    };
  }, [hasInvite, arrivalContext.token]);
  const [email, setEmail] = useLS('');
  const [name, setName] = useLS('');
  const [linkInput, setLinkInput] = useLS('');
  // Rôle choisi par l'utilisateur sur le role-pick (pour afficher un hint
  // contextuel dans la page paste-link : "Tu as besoin d'un lien parent…").
  const [roleHint, setRoleHint] = useLS('');
  // #54 — Phase B : connexion par lien magique email.
  const [sentTo, setSentTo] = useLS('');     // email auquel le lien a été envoyé
  const [sending, setSending] = useLS(false); // envoi en cours
  const emailValid = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  // Envoie un lien de connexion Firebase. Le nom + rôle sont mis en attente
  // et appliqués automatiquement quand l'utilisateur revient via le lien.
  const sendMagicLink = async (eClean, nClean, role) => {
    if (!window.cddAuth || !window.cddAuth.ready) {
      alert("Service d'authentification indisponible. Vérifie ta connexion internet et réessaie dans un instant.");
      return;
    }
    setSending(true);
    try {
      await window.cddAuth.sendLoginLink(eClean, { name: nClean, role });
      setSentTo(eClean);
    } catch (err) {
      alert("Envoi du lien échoué : " + (err && err.message ? err.message : err));
    } finally {
      setSending(false);
    }
  };

  const submitCoach = () => {
    const eClean = email.trim().toLowerCase();
    const nClean = name.trim();
    if (!eClean || !nClean) { alert('Email et nom requis pour créer ton compte coach.'); return; }
    if (!emailValid) { alert('Format email invalide.'); return; }
    sendMagicLink(eClean, nClean, 'coach');
  };

  const submitParent = () => {
    const eClean = email.trim().toLowerCase();
    const nClean = name.trim();
    if (!eClean || !nClean) { alert('Email et nom requis pour créer ton compte parent.'); return; }
    if (!emailValid) { alert('Format email invalide.'); return; }
    sendMagicLink(eClean, nClean, 'parent');
  };

  // #55 — Connexion Google : un tap, aucun email envoyé (zéro spam).
  const googleSignIn = async (role) => {
    if (!window.cddAuth || !window.cddAuth.ready) {
      alert("Service d'authentification indisponible. Vérifie ta connexion internet et réessaie.");
      return;
    }
    setSending(true);
    try {
      await window.cddAuth.signInWithGoogle({ role });
      // onAuthStateChanged → cdd-auth-changed → app.jsx bascule sur l'accueil.
    } catch (err) {
      alert("Connexion Google échouée : " + (err && err.message ? err.message : err));
    } finally {
      setSending(false);
    }
  };

  const submitLink = () => {
    const raw = (linkInput || '').trim();
    if (!raw) return;
    try {
      // Accepte URL complete ou juste la query string
      let url;
      if (raw.startsWith('http')) url = new URL(raw);
      else if (raw.startsWith('?')) url = new URL('https://x.x/' + raw);
      else url = new URL('https://x.x/?' + raw.replace(/^\??/, ''));
      const params = url.searchParams;
      const carnet = params.get('carnet') || params.get('joueur');
      const p = params.get('p');
      const t = params.get('t');
      const invite = params.get('invite');
      if (carnet) { window.location.search = '?carnet=' + encodeURIComponent(carnet); return; }
      if (p)      { window.location.search = '?p='      + encodeURIComponent(p);      return; }
      if (t)      { window.location.search = '?t='      + encodeURIComponent(t);      return; }
      if (invite) { window.location.search = '?invite=' + encodeURIComponent(invite); return; }
      alert('Lien non reconnu. Demande à ton coach un lien complet (qui contient ?carnet=, ?p=, ?t= ou ?invite=).');
    } catch (e) {
      alert('Lien invalide. Colle l\'URL complete que t\'a envoyee ton coach.');
    }
  };

  const wrap = {
    width:'100%', height:'100%', minHeight:'100vh',
    background:'linear-gradient(180deg, #0a0e14 0%, #050709 100%)',
    color:'#fff', fontFamily:'inherit',
    display:'flex', flexDirection:'column',
    padding:'24px 20px 36px',
    boxSizing:'border-box',
    overflowY:'auto',
  };
  const cardBase = {
    padding:'18px 16px', borderRadius:14,
    background:'rgba(255,255,255,0.04)',
    border:'1px solid rgba(255,255,255,0.08)',
    cursor:'pointer', textAlign:'left',
    color:'#fff', fontFamily:'inherit',
    transition:'transform .15s, border-color .15s',
  };

  // #55 — Bouton "Continuer avec Google" (méthode principale, zéro spam)
  const googleButton = (role) => (
    <div style={{position:'relative'}}>
      <span style={{
        position:'absolute', top:-7, right:10, zIndex:1,
        fontSize:9, fontWeight:900, letterSpacing:'.06em',
        padding:'2px 7px', borderRadius:5, whiteSpace:'nowrap',
        background:'#c8f169', color:'#0a0e14',
        boxShadow:'0 2px 6px rgba(0,0,0,.35)',
      }}>RECOMMANDÉ · PLUS RAPIDE</span>
      <button onClick={() => googleSignIn(role)} disabled={sending} style={{
        display:'flex', alignItems:'center', justifyContent:'center', gap:10,
        width:'100%', padding:'14px 16px', borderRadius:12,
        background:'#fff', color:'#1f1f1f', border:'none',
        fontFamily:'inherit', fontSize:14.5, fontWeight:800,
        cursor: sending ? 'default' : 'pointer', opacity: sending ? 0.6 : 1,
        boxShadow:'0 4px 14px rgba(255,255,255,0.10)',
      }}>
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"/>
          <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.05l3.01-2.33z"/>
          <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/>
        </svg>
        {sending ? 'Connexion…' : 'Continuer avec Google'}
      </button>
    </div>
  );
  const orSep = (
    <div style={{display:'flex', alignItems:'center', gap:10, margin:'8px 0 2px'}}>
      <div style={{flex:1, height:1, background:'rgba(255,255,255,0.12)'}}/>
      <span style={{fontSize:10, opacity:0.55, fontWeight:700, letterSpacing:'.06em'}}>
        OU PAR EMAIL (PAS DE COMPTE GOOGLE ?)
      </span>
      <div style={{flex:1, height:1, background:'rgba(255,255,255,0.12)'}}/>
    </div>
  );

  return (
    <div style={wrap}>

      {/* HERO */}
      <div style={{textAlign:'center', marginTop:24, marginBottom:32}}>
        <div style={{
          display:'inline-block', padding:'6px 14px', borderRadius:999,
          background:'rgba(200,241,105,0.10)', border:'1px solid rgba(200,241,105,0.30)',
          color:'#c8f169', fontSize:11, fontWeight:800, letterSpacing:'.10em',
          marginBottom:18,
        }}>COACH DU DIMANCHE</div>
        <div style={{
          fontSize:28, fontWeight:900, lineHeight:1.1, marginBottom:12,
          letterSpacing:'-.01em',
        }}>Tes joueurs amateurs<br/>en cartes<br/>de légende.</div>
        <div style={{fontSize:13, opacity:0.65, lineHeight:1.5, padding:'0 8px'}}>
          Compo, convocation, match live, carte joueur évolutive.<br/>
          Vraies données FFF. Sans pub. Hors-ligne.
        </div>
      </div>

      {/* #54 — ÉCRAN "LIEN ENVOYÉ" : remplace tout le reste tant que sentTo est set */}
      {sentTo && (
        <div style={{display:'flex', flexDirection:'column', gap:14, marginTop:8}}>
          <div style={{fontSize:52, textAlign:'center'}}>📬</div>
          <div style={{fontSize:22, fontWeight:900, textAlign:'center'}}>
            Vérifie ta boîte mail
          </div>
          <div style={{fontSize:13, opacity:0.78, lineHeight:1.6, textAlign:'center'}}>
            On a envoyé un lien de connexion à<br/>
            <b style={{color:'#c8f169', wordBreak:'break-all'}}>{sentTo}</b>
          </div>
          <div style={{
            padding:'12px 14px', borderRadius:10,
            background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)',
            fontSize:12, opacity:0.85, lineHeight:1.6,
          }}>
            <div style={{marginBottom:6}}>
              <b style={{color:'#c8f169'}}>✓ Ouvre ce mail sur CET appareil</b> et clique le lien :
              tu seras connecté automatiquement. Le lien est valable 1h.
            </div>
            <div style={{
              marginTop:8, paddingTop:8,
              borderTop:'1px solid rgba(255,255,255,.08)',
              fontSize:11.5, opacity:0.85, lineHeight:1.6,
            }}>
              <b style={{color:'#fbbf24'}}>⚠ Tu ne vois rien arriver ?</b>
              <ul style={{margin:'4px 0 0 0', paddingLeft:18}}>
                <li>Vérifie tes <b>spams / courrier indésirable</b></li>
                <li>Vérifie ta <b>quarantaine</b> (mail pro Outlook / Microsoft 365)</li>
                <li>L'expéditeur est <code style={{fontSize:10, background:'rgba(0,0,0,.4)', padding:'1px 4px', borderRadius:3}}>noreply@arbitre-sport.firebaseapp.com</code></li>
                <li>Ajoute-le aux contacts pour les prochains envois</li>
              </ul>
            </div>
          </div>

          {/* Alternative Google si l'email coince (cas typique mail pro filtré) */}
          {window.cddAuth && window.cddAuth.signInWithGoogle && (
            <div style={{
              padding:'12px 14px', borderRadius:10,
              background:'rgba(125,211,252,0.06)',
              border:'1px solid rgba(125,211,252,0.30)',
            }}>
              <div style={{fontSize:12, fontWeight:800, color:'#7dd3fc', marginBottom:6}}>
                💡 Le mail n'arrive pas ? Connecte-toi avec Google
              </div>
              <div style={{fontSize:11.5, opacity:0.75, lineHeight:1.5, marginBottom:10}}>
                Aucun email à attendre — un seul tap, et tu es connecté.
                Idéal si ton mail pro filtre/quarantaine les expéditeurs externes.
              </div>
              <button onClick={async () => {
                try {
                  setSending(true);
                  await window.cddAuth.signInWithGoogle({});
                } catch (err) {
                  alert('Connexion Google échouée : ' + (err && err.message ? err.message : err));
                } finally {
                  setSending(false);
                }
              }} disabled={sending}
              style={{
                width:'100%', padding:'10px 14px', borderRadius:8,
                background:'#fff', color:'#1f2937',
                border:'none', fontSize:13, fontWeight:800, cursor:'pointer',
                opacity: sending ? 0.6 : 1,
              }}>
                {sending ? '⟳ …' : '🔑 Continuer avec Google'}
              </button>
            </div>
          )}

          {/* Actions explicites — plus de "Modifier mon email" ambigu */}
          <div style={{display:'flex', gap:8}}>
            <button onClick={() => {
              // Renvoie un NOUVEAU lien au même email (pratique si rien arrivé)
              const role = localStorage.getItem('cdd_auth_role_pending') || 'parent';
              const nm = localStorage.getItem('cdd_auth_name_pending') || '';
              sendMagicLink(sentTo, nm, role);
            }} disabled={sending}
            style={{
              flex:1, padding:'10px', borderRadius:10,
              background:'rgba(200,241,105,0.10)',
              border:'1px solid rgba(200,241,105,0.32)',
              color:'#c8f169', fontFamily:'inherit', fontSize:12.5, fontWeight:700,
              cursor:'pointer',
              opacity: sending ? 0.5 : 1,
            }}>
              {sending ? '⟳ Renvoi…' : '📩 Renvoyer le lien'}
            </button>
            <button onClick={() => setSentTo('')} style={{
              flex:1, padding:'10px', borderRadius:10,
              background:'transparent', border:'1px solid rgba(255,255,255,0.15)',
              color:'rgba(255,255,255,0.75)', fontFamily:'inherit', fontSize:12.5, fontWeight:700,
              cursor:'pointer',
            }}>
              ✎ Changer d'email
            </button>
          </div>
        </div>
      )}

      {/* Parcours d'entrée — masqués tant qu'un lien est en attente */}
      {!sentTo && (<>

      {/* MODE INVITE-PENDING — page de validation d'invitation. L'utilisateur
          a cliqué un lien WhatsApp/SMS : on lui montre AVANT login qui
          l'invite, à quel club/équipe il rejoint, et pour quel rôle. */}
      {mode === 'invite-pending' && (
        <div style={{display:'flex', flexDirection:'column', gap:14}}>
          {inviteLoading && (
            <div style={{
              padding:'36px 18px 28px', textAlign:'center',
              background:'rgba(200,241,105,0.06)',
              border:'1px solid rgba(200,241,105,0.22)',
              borderRadius:14,
            }}>
              <div style={{
                fontSize:11, fontWeight:900, letterSpacing:'.14em',
                color:'#c8f169', textTransform:'uppercase', marginBottom:10,
              }}>
                Bienvenue sur Coach du Dimanche
              </div>
              <div style={{fontSize:42, marginBottom:14}}>⚽</div>
              <div style={{fontSize:14, fontWeight:800, color:'#fff', marginBottom:8}}>
                Préparation de ton invitation…
              </div>
              <div style={{fontSize:11.5, color:'rgba(255,255,255,0.6)', lineHeight:1.5, maxWidth:280, margin:'0 auto'}}>
                On charge les infos du club qui t'invite.<br/>
                Quelques secondes sur la première connexion.
              </div>
            </div>
          )}

          {!inviteLoading && inviteError && (
            <>
              <div style={{
                padding:'18px 18px', borderRadius:12,
                background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.35)',
              }}>
                <div style={{fontSize:32, marginBottom:10, textAlign:'center'}}>⚠️</div>
                <div style={{fontWeight:900, fontSize:15, color:'#ff8a8a', textAlign:'center', marginBottom:6}}>
                  Invitation indisponible
                </div>
                <div style={{fontSize:12.5, opacity:0.85, lineHeight:1.6, textAlign:'center'}}>
                  {inviteError}
                </div>
              </div>
              <button onClick={() => {
                try { localStorage.removeItem('cdd_pending_invite'); } catch (e) {}
                setMode('home');
              }} style={{
                padding:'12px', borderRadius:10,
                background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.15)',
                color:'#fff', fontFamily:'inherit', fontSize:13, cursor:'pointer', fontWeight:700,
              }}>
                Revenir à l'accueil
              </button>
            </>
          )}

          {!inviteLoading && !inviteError && invite && (() => {
            const ROLE_META = {
              adjoint: { ic:'🎽', label:'Coach adjoint', desc:'Tu pourras éditer cette équipe (compo, convocations, statuts).' },
              parent:  { ic:'👪', label:'Parent',        desc:'Tu suivras les convocations et la fiche de ton enfant.' },
              joueur:  { ic:'⚽', label:'Joueur',        desc:'Tu verras ta fiche, tes stats et tes convocations.' },
              lecteur: { ic:'👁️', label:'Lecteur',       desc:'Tu auras un accès lecture seule à cette équipe.' },
            };
            const meta = ROLE_META[invite.role] || { ic:'•', label: invite.role, desc:'' };
            const clubName   = invite.clubName   || 'le club';
            const teamName   = invite.teamName   || null;
            const playerName = invite.playerName || null;
            return (
              <>
                <div style={{
                  padding:'4px 14px 6px', borderRadius:12,
                  background:'rgba(200,241,105,0.06)',
                  border:'1px solid rgba(200,241,105,0.28)',
                  textAlign:'center',
                }}>
                  <div style={{fontSize:9, fontWeight:900, letterSpacing:'.16em',
                               color:'#c8f169', textTransform:'uppercase', marginTop:10}}>
                    Tu as été invité
                  </div>
                  <div style={{fontSize:54, marginTop:8}}>{meta.ic}</div>
                  <div style={{
                    fontSize:22, fontWeight:900, lineHeight:1.25,
                    marginTop:4, padding:'0 8px',
                  }}>
                    Rejoindre {clubName}{teamName ? ' · ' + teamName : ''}
                  </div>
                  <div style={{fontSize:13, opacity:0.75, marginTop:10, lineHeight:1.5}}>
                    en tant que <b style={{color:'#c8f169'}}>{meta.label}</b>
                    {playerName && (
                      <> de <b style={{color:'#fff'}}>{playerName}</b></>
                    )}
                  </div>
                  {meta.desc && (
                    <div style={{
                      fontSize:11.5, opacity:0.6, lineHeight:1.5,
                      marginTop:12, padding:'10px 14px 14px',
                    }}>
                      {meta.desc}
                    </div>
                  )}
                </div>

                <div style={{
                  fontSize:11, opacity:0.65, lineHeight:1.5, textAlign:'center',
                  padding:'4px 8px',
                }}>
                  Connecte-toi pour accepter l'invitation.<br/>
                  Ton rattachement sera créé automatiquement.
                </div>

                {googleButton(invite.role || 'lecteur')}
                {orSep}

                <label style={{display:'flex', flexDirection:'column', gap:6}}>
                  <span style={{fontSize:11, fontWeight:700, opacity:0.7, letterSpacing:'.04em'}}>
                    TON NOM
                  </span>
                  <input value={name} onChange={e => setName(e.target.value)}
                         placeholder="ex: Sarah HAMDAOUI" autoFocus
                         style={{
                           padding:'12px 14px', borderRadius:10, fontSize:14,
                           background:'rgba(255,255,255,0.05)',
                           border:'1px solid rgba(255,255,255,0.12)',
                           color:'#fff', fontFamily:'inherit',
                         }}/>
                </label>

                <label style={{display:'flex', flexDirection:'column', gap:6}}>
                  <span style={{fontSize:11, fontWeight:700, opacity:0.7, letterSpacing:'.04em'}}>
                    TON EMAIL
                  </span>
                  <input value={email} onChange={e => setEmail(e.target.value)}
                         type="email" placeholder="ex: sarah@gmail.com"
                         style={{
                           padding:'12px 14px', borderRadius:10, fontSize:14,
                           background:'rgba(255,255,255,0.05)',
                           border: `1px solid ${emailValid ? 'rgba(255,255,255,0.12)' : 'rgba(239,68,68,0.45)'}`,
                           color:'#fff', fontFamily:'inherit',
                         }}/>
                  {!emailValid && (
                    <span style={{fontSize:11, color:'#ff8a8a'}}>⚠ Format email invalide</span>
                  )}
                </label>

                <button onClick={() => {
                  const eClean = email.trim().toLowerCase();
                  const nClean = name.trim();
                  if (!eClean || !nClean) { alert('Email et nom requis.'); return; }
                  if (!emailValid) { alert('Format email invalide.'); return; }
                  sendMagicLink(eClean, nClean, invite.role || 'lecteur');
                }}
                        disabled={!email.trim() || !name.trim() || !emailValid || sending}
                        className="btn-cta"
                        style={{marginTop:4, opacity: (!email.trim() || !name.trim() || !emailValid || sending) ? 0.5 : 1}}>
                  {sending ? 'ENVOI EN COURS…' : 'RECEVOIR MON LIEN DE CONNEXION →'}
                </button>

                <div style={{
                  marginTop:6, padding:'10px 12px', borderRadius:10,
                  background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)',
                  fontSize:10.5, opacity:0.65, lineHeight:1.55, textAlign:'center',
                }}>
                  🔒 Une fois connecté, ton rattachement à {clubName} est créé automatiquement.
                  Aucune action supplémentaire à faire.
                </div>

                <button onClick={() => {
                  if (!confirm('Annuler cette invitation ? Tu pourras la rouvrir en re-cliquant sur le lien WhatsApp/SMS.')) return;
                  try { localStorage.removeItem('cdd_pending_invite'); } catch (e) {}
                  setInvite(null);
                  setMode('home');
                }} style={{
                  marginTop:4, padding:'10px', borderRadius:8,
                  background:'transparent', border:'1px solid rgba(255,255,255,0.12)',
                  color:'rgba(255,255,255,0.55)', fontFamily:'inherit', fontSize:12,
                  cursor:'pointer',
                }}>
                  Annuler et revenir à l'accueil
                </button>
              </>
            );
          })()}
        </div>
      )}

      {/* MODE HOME : 3 chemins d'entrée */}
      {mode === 'home' && (
        <>
          <div style={{
            fontSize:11, fontWeight:800, opacity:0.55,
            letterSpacing:'.08em', marginBottom:10, paddingLeft:4,
          }}>QUI ES-TU ?</div>

          {/* SEUL chemin self-service : coach principal qui démarre un club.
              Tous les autres rôles (parent, joueur, adjoint, lecteur) sont
              FORCÉMENT invités par un membre existant — pas de fausse promesse. */}
          <button onClick={() => { setRoleHint(''); setMode('coach-signup'); }} style={{
            ...cardBase, marginBottom:10,
            background:'rgba(200,241,105,0.08)', border:'1px solid rgba(200,241,105,0.35)',
          }}>
            <div style={{display:'flex', alignItems:'center', gap:14}}>
              <span style={{fontSize:32}}>🏆</span>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontWeight:900, fontSize:15, color:'#c8f169'}}>Créer mon club</div>
                <div style={{fontSize:12, opacity:0.65, marginTop:4, lineHeight:1.4}}>
                  Je suis coach principal · je démarre un nouveau club
                </div>
              </div>
              <span style={{opacity:0.5, fontSize:18}}>›</span>
            </div>
          </button>

          {/* Le chemin "invité" couvre TOUS les autres rôles : parent, joueur,
              adjoint, lecteur, ET coach principal invité par un admin. Le
              token ?invite= dans le lien (ou QR scanné) porte le rôle. */}
          <button onClick={() => { setRoleHint(''); setMode('paste-link'); }} style={{
            ...cardBase, marginBottom:10,
            background:'rgba(125,211,252,0.06)', border:'1px solid rgba(125,211,252,0.30)',
          }}>
            <div style={{display:'flex', alignItems:'center', gap:14}}>
              <span style={{fontSize:32}}>🔗</span>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontWeight:900, fontSize:15, color:'#7dd3fc'}}>J'ai reçu un lien (ou QR)</div>
                <div style={{fontSize:12, opacity:0.65, marginTop:4, lineHeight:1.4}}>
                  Parent · joueur · adjoint · lecteur — un coach m'a invité
                </div>
              </div>
              <span style={{opacity:0.5, fontSize:18}}>›</span>
            </div>
          </button>

          {/* Reconnexion : pour les comptes existants (parent/joueur/adjoint/
              lecteur déjà rattachés au club). Évite de devoir cliquer 'Je suis
              coach' quand on n'en est pas un. */}
          <button onClick={() => setMode('returning-signin')} style={{
            ...cardBase, marginBottom:10,
            background:'rgba(125,211,252,0.06)', border:'1px solid rgba(125,211,252,0.30)',
          }}>
            <div style={{display:'flex', alignItems:'center', gap:14}}>
              <span style={{fontSize:32}}>👤</span>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontWeight:900, fontSize:15, color:'#7dd3fc'}}>Je me reconnecte</div>
                <div style={{fontSize:12, opacity:0.65, marginTop:4, lineHeight:1.4}}>
                  J'ai déjà un compte (parent, joueur, adjoint, lecteur, coach…)
                </div>
              </div>
              <span style={{opacity:0.5, fontSize:18}}>›</span>
            </div>
          </button>

          {/* Encart pédagogique : explique COMMENT être rattaché à un club
              quand on n'est ni coach principal ni déjà inscrit. Évite que
              l'utilisateur reste bloqué en se demandant comment s'inscrire. */}
          <div style={{
            marginTop:14, padding:'14px 14px', borderRadius:11,
            background:'rgba(255,255,255,0.03)',
            border:'1px dashed rgba(255,255,255,0.12)',
            fontSize:12, color:'rgba(255,255,255,0.78)', lineHeight:1.55,
          }}>
            <div style={{fontWeight:800, marginBottom:6, color:'#fff'}}>
              💡 Tu n'as pas de lien et tu n'es pas coach ?
            </div>
            Cette app fonctionne par invitation : un coach (ou un parent
            déjà inscrit) doit te <b>partager un lien</b> ou te faire
            <b> scanner un QR code</b> sur son écran. Ça prend 30 secondes.<br/><br/>
            <span style={{opacity:0.7}}>
              Donne-lui simplement ton email ou ton numéro WhatsApp — il
              t'enverra le lien d'invitation correspondant à ton rôle
              (parent, joueur, adjoint, lecteur).
            </span>
          </div>

          <div style={{
            marginTop:'auto', paddingTop:20, fontSize:10.5,
            color:'rgba(255,255,255,0.4)', textAlign:'center', lineHeight:1.5,
          }}>
            Coach du Dimanche · v2<br/>
            Aucune donnée n'est visible tant que tu n'as pas créé un compte<br/>
            ou utilisé un lien d'invitation.
          </div>
        </>
      )}

      {/* MODE ROLE-PICK — sélection du rôle pour un nouvel utilisateur.
          - Coach principal : self-signup (création de club autonome)
          - Adjoint/Parent/Joueur/Lecteur : nécessitent un lien d'invitation
            envoyé par le coach principal. On les oriente vers paste-link
            avec un hint contextualisé. */}
      {mode === 'role-pick' && (
        <>
          <button onClick={() => setMode('home')} style={{
            background:'transparent', border:'none', color:'rgba(255,255,255,0.6)',
            cursor:'pointer', textAlign:'left', padding:'4px 0 8px',
            fontFamily:'inherit', fontSize:13,
          }}>‹ Retour</button>

          <div style={{
            fontSize:11, fontWeight:800, opacity:0.55,
            letterSpacing:'.08em', marginBottom:10, paddingLeft:4,
          }}>QUEL EST TON RÔLE ?</div>

          {/* Coach principal — seul rôle en self-service */}
          <button onClick={() => setMode('coach-signup')} style={{
            ...cardBase, marginBottom:10,
            background:'rgba(200,241,105,0.08)', border:'1px solid rgba(200,241,105,0.35)',
          }}>
            <div style={{display:'flex', alignItems:'center', gap:14}}>
              <span style={{fontSize:30}}>🏆</span>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontWeight:900, fontSize:14.5, color:'#c8f169'}}>Coach principal</div>
                <div style={{fontSize:11.5, opacity:0.65, marginTop:3, lineHeight:1.4}}>
                  Je crée mon club et je gère mes équipes
                </div>
              </div>
              <span style={{
                fontSize:9, fontWeight:900, letterSpacing:'.06em',
                padding:'3px 7px', borderRadius:5, whiteSpace:'nowrap',
                background:'rgba(200,241,105,.18)', color:'#c8f169',
              }}>SELF-SERVICE</span>
            </div>
          </button>

          {/* Rôles invités — tous redirigent vers paste-link */}
          {[
            { id:'adjoint', ic:'🎽', label:'Coach adjoint',
              desc:"J'aide un coach principal à gérer son équipe",
              hint:"Demande à ton coach principal de t'envoyer un lien d'invitation « adjoint » sur WhatsApp ou SMS." },
            { id:'parent', ic:'👪', label:'Parent',
              desc:"Je suis le parent d'un joueur de l'équipe",
              hint:"Ton coach (ou le coach de ton enfant) doit t'envoyer un lien d'invitation « parent » via WhatsApp ou SMS." },
            { id:'joueur', ic:'⚽', label:'Joueur',
              desc:'Je joue dans une équipe',
              hint:"Demande à ton coach un lien d'invitation « joueur » pour rejoindre l'équipe." },
            { id:'lecteur', ic:'👁️', label:'Lecteur / supporter',
              desc:'Je suis fan / je suis les résultats',
              hint:"Demande au club un lien d'invitation « lecteur » (accès lecture seule)." },
          ].map(role => (
            <button key={role.id}
              onClick={() => { setRoleHint(role.id); setMode('paste-link'); }}
              style={{...cardBase, marginBottom:10}}>
              <div style={{display:'flex', alignItems:'center', gap:14}}>
                <span style={{fontSize:30}}>{role.ic}</span>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontWeight:900, fontSize:14.5}}>{role.label}</div>
                  <div style={{fontSize:11.5, opacity:0.65, marginTop:3, lineHeight:1.4}}>
                    {role.desc}
                  </div>
                </div>
                <span style={{
                  fontSize:9, fontWeight:900, letterSpacing:'.06em',
                  padding:'3px 7px', borderRadius:5, whiteSpace:'nowrap',
                  background:'rgba(125,211,252,.12)', color:'#7dd3fc',
                }}>SUR INVITE</span>
              </div>
            </button>
          ))}

          <div style={{
            marginTop:14, padding:'12px 14px', borderRadius:10,
            background:'rgba(125,211,252,0.05)',
            border:'1px solid rgba(125,211,252,0.20)',
            fontSize:11.5, color:'rgba(255,255,255,.75)', lineHeight:1.6,
          }}>
            💡 <b>Pourquoi seul le coach est en self-service ?</b><br/>
            L'app sert à un coach pour gérer son équipe : il invite ensuite
            ses parents, joueurs, adjoints et lecteurs en envoyant un lien
            personnalisé. Si tu n'as pas ce lien, demande-le à ton coach.
          </div>
        </>
      )}

      {/* MODE COACH SIGNUP */}
      {mode === 'coach-signup' && (
        <div style={{display:'flex', flexDirection:'column', gap:14}}>
          <button onClick={() => setMode('home')} style={{
            background:'transparent', border:'none', color:'rgba(255,255,255,0.6)',
            cursor:'pointer', textAlign:'left', padding:'4px 0',
            fontFamily:'inherit', fontSize:13,
          }}>‹ Retour</button>

          <div style={{fontSize:22, fontWeight:900, marginBottom:4}}>Crée ton compte coach</div>
          <div style={{fontSize:12, opacity:0.65, lineHeight:1.5, marginBottom:8}}>
            Connecte-toi pour créer ton club. Le plus rapide et sans spam : Google.
          </div>

          {googleButton('coach')}
          {orSep}

          <label style={{display:'flex', flexDirection:'column', gap:6}}>
            <span style={{fontSize:11, fontWeight:700, opacity:0.7, letterSpacing:'.04em'}}>
              TON NOM
            </span>
            <input value={name} onChange={e => setName(e.target.value)}
                   placeholder="ex: Florian CLARISSE" autoFocus
                   style={{
                     padding:'12px 14px', borderRadius:10, fontSize:14,
                     background:'rgba(255,255,255,0.05)',
                     border:'1px solid rgba(255,255,255,0.12)',
                     color:'#fff', fontFamily:'inherit',
                   }}/>
          </label>

          <label style={{display:'flex', flexDirection:'column', gap:6}}>
            <span style={{fontSize:11, fontWeight:700, opacity:0.7, letterSpacing:'.04em'}}>
              TON EMAIL
            </span>
            <input value={email} onChange={e => setEmail(e.target.value)}
                   type="email" placeholder="ex: florian@gmail.com"
                   style={{
                     padding:'12px 14px', borderRadius:10, fontSize:14,
                     background:'rgba(255,255,255,0.05)',
                     border: `1px solid ${emailValid ? 'rgba(255,255,255,0.12)' : 'rgba(239,68,68,0.45)'}`,
                     color:'#fff', fontFamily:'inherit',
                   }}/>
            {!emailValid && (
              <span style={{fontSize:11, color:'#ff8a8a'}}>⚠ Format email invalide</span>
            )}
            <span style={{fontSize:10.5, color:'rgba(255,255,255,0.5)', lineHeight:1.5}}>
              Utilise un email auquel tu as accès : on t'y enverra un lien de connexion.
              C'est cet email qui te rattache à tes clubs.
            </span>
          </label>

          <button onClick={submitCoach}
                  disabled={!email.trim() || !name.trim() || !emailValid || sending}
                  className="btn-cta"
                  style={{marginTop:8, opacity: (!email.trim() || !name.trim() || !emailValid || sending) ? 0.5 : 1}}>
            {sending ? 'ENVOI EN COURS…' : 'RECEVOIR MON LIEN DE CONNEXION →'}
          </button>

          <div style={{
            marginTop:14, padding:'12px 14px', borderRadius:10,
            background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)',
            fontSize:11, opacity:0.7, lineHeight:1.5,
          }}>
            <b style={{display:'block', marginBottom:6}}>🔐 Connexion sécurisée</b>
            Pas de mot de passe à retenir : on t'envoie un lien par email. Cliquer le lien
            prouve que cet email est bien le tien. Tu retrouves tes données en te reconnectant
            avec le même email.
          </div>
        </div>
      )}

      {/* MODE PARENT-SIGNUP : declenche par arrivee via lien individuel
          (?carnet= ou ?p=) sans email saisi. Bloque l'acces a la fiche
          tant que le compte parent n'est pas cree. */}
      {mode === 'parent-signup' && (
        <div style={{display:'flex', flexDirection:'column', gap:14}}>
          {!hasIndividualToken && (
            <button onClick={() => setMode('home')} style={{
              background:'transparent', border:'none', color:'rgba(255,255,255,0.6)',
              cursor:'pointer', textAlign:'left', padding:'4px 0',
              fontFamily:'inherit', fontSize:13,
            }}>‹ Retour</button>
          )}

          <div style={{
            padding:'14px 16px', borderRadius:12, marginBottom:4,
            background:'rgba(251,191,36,0.08)', border:'1px solid rgba(251,191,36,0.30)',
          }}>
            <div style={{fontWeight:900, fontSize:14, marginBottom:6, color:'#fbbf24'}}>
              🔒 Contenu protégé
            </div>
            <div style={{fontSize:12, opacity:0.85, lineHeight:1.5}}>
              {arrivalContext.kind === 'carnet'
                ? `Tu essaies d'ouvrir le carnet personnel d'un joueur. C'est une donnée privée d'enfant : on ne peut pas la montrer sans vérifier que tu es bien un parent légitime.`
                : arrivalContext.kind === 'convoc'
                ? `Tu essaies d'ouvrir la convocation individuelle d'un joueur. C'est une donnée privée d'enfant : on ne peut pas la montrer sans vérifier que tu es bien un parent légitime.`
                : `Pour voir les informations personnelles d'un joueur, tu dois créer un compte parent.`}
            </div>
          </div>

          <div style={{fontSize:20, fontWeight:900, marginBottom:4}}>Crée ton compte parent</div>
          <div style={{fontSize:12, opacity:0.65, lineHeight:1.5, marginBottom:8}}>
            Ton coach validera ensuite ton rattachement à ton enfant. Une fois validé, tu auras accès à ses convocations, sa fiche et son carnet.
          </div>

          {googleButton('parent')}
          {orSep}

          <label style={{display:'flex', flexDirection:'column', gap:6}}>
            <span style={{fontSize:11, fontWeight:700, opacity:0.7, letterSpacing:'.04em'}}>
              TON NOM
            </span>
            <input value={name} onChange={e => setName(e.target.value)}
                   placeholder="ex: Sarah HAMDAOUI" autoFocus
                   style={{
                     padding:'12px 14px', borderRadius:10, fontSize:14,
                     background:'rgba(255,255,255,0.05)',
                     border:'1px solid rgba(255,255,255,0.12)',
                     color:'#fff', fontFamily:'inherit',
                   }}/>
          </label>

          <label style={{display:'flex', flexDirection:'column', gap:6}}>
            <span style={{fontSize:11, fontWeight:700, opacity:0.7, letterSpacing:'.04em'}}>
              TON EMAIL
            </span>
            <input value={email} onChange={e => setEmail(e.target.value)}
                   type="email" placeholder="ex: sarah@gmail.com"
                   style={{
                     padding:'12px 14px', borderRadius:10, fontSize:14,
                     background:'rgba(255,255,255,0.05)',
                     border: `1px solid ${emailValid ? 'rgba(255,255,255,0.12)' : 'rgba(239,68,68,0.45)'}`,
                     color:'#fff', fontFamily:'inherit',
                   }}/>
            {!emailValid && (
              <span style={{fontSize:11, color:'#ff8a8a'}}>⚠ Format email invalide</span>
            )}
            <span style={{fontSize:10.5, color:'rgba(255,255,255,0.5)', lineHeight:1.5}}>
              C'est avec cet email que ton coach reconnaîtra ton compte. Utilise un email auquel tu as accès — on t'y enverra un lien de connexion à cliquer.
            </span>
          </label>

          <button onClick={submitParent}
                  disabled={!email.trim() || !name.trim() || !emailValid || sending}
                  className="btn-cta"
                  style={{marginTop:8, opacity: (!email.trim() || !name.trim() || !emailValid || sending) ? 0.5 : 1}}>
            {sending ? 'ENVOI EN COURS…' : 'RECEVOIR MON LIEN DE CONNEXION →'}
          </button>

          <div style={{
            marginTop:14, padding:'12px 14px', borderRadius:10,
            background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)',
            fontSize:11, opacity:0.7, lineHeight:1.6,
          }}>
            <b style={{display:'block', marginBottom:6}}>📋 Prochaine étape (à venir)</b>
            Une fois ton compte créé, tu rempliras un petit formulaire avec les infos de ton enfant (taille, poids, photo, position préférée). Ces infos seront envoyées à ton coach pour validation, puis intégrées à la fiche officielle.
          </div>

          {!hasIndividualToken && (
            <button onClick={() => setMode('home')} style={{
              marginTop:8, padding:'10px', borderRadius:8,
              background:'transparent', border:'1px solid rgba(255,255,255,0.15)',
              color:'rgba(255,255,255,0.7)', fontFamily:'inherit', fontSize:12,
              cursor:'pointer',
            }}>
              Annuler
            </button>
          )}
        </div>
      )}

      {/* MODE SHARE SIGNUP — arrivée depuis un lien ?t= (partage convocation/équipe).
           Le contenu est privé : on impose une connexion. Si l'user n'a pas encore
           de compte rattaché au club, le coach devra lui envoyer un lien
           d'invitation séparé. */}
      {mode === 'share-signup' && (
        <div style={{display:'flex', flexDirection:'column', gap:14}}>

          <div style={{
            padding:'14px 16px', borderRadius:12, marginBottom:4,
            background:'rgba(125,211,252,0.08)', border:'1px solid rgba(125,211,252,0.30)',
          }}>
            <div style={{fontWeight:900, fontSize:14, marginBottom:6, color:'#7dd3fc'}}>
              🔗 Lien de convocation reçu
            </div>
            <div style={{fontSize:12, opacity:0.85, lineHeight:1.5}}>
              Ton coach a partagé une convocation avec toi. Les données de l'équipe
              sont privées — connecte-toi pour les voir.
            </div>
          </div>

          <div style={{fontSize:20, fontWeight:900, marginBottom:2}}>Connecte-toi</div>
          <div style={{fontSize:12, opacity:0.65, lineHeight:1.5, marginBottom:6}}>
            Utilise le compte que ton coach a déjà rattaché au club. Si c'est
            la 1ère fois, ton coach doit t'envoyer un <b>lien d'invitation</b>
            personnel (différent de ce lien de convocation).
          </div>

          {googleButton('lecteur')}
          {orSep}

          <label style={{display:'flex', flexDirection:'column', gap:6}}>
            <span style={{fontSize:11, fontWeight:700, opacity:0.7, letterSpacing:'.04em'}}>
              TON EMAIL
            </span>
            <input value={email} onChange={e => setEmail(e.target.value)}
                   type="email" placeholder="ex: parent@gmail.com" autoFocus
                   style={{
                     padding:'12px 14px', borderRadius:10, fontSize:14,
                     background:'rgba(255,255,255,0.05)',
                     border: `1px solid ${emailValid ? 'rgba(255,255,255,0.12)' : 'rgba(239,68,68,0.45)'}`,
                     color:'#fff', fontFamily:'inherit',
                   }}/>
            {!emailValid && (
              <span style={{fontSize:11, color:'#ff8a8a'}}>⚠ Format email invalide</span>
            )}
          </label>

          <button onClick={() => {
                    const eClean = email.trim().toLowerCase();
                    if (!eClean) { alert('Email requis.'); return; }
                    if (!emailValid) { alert('Format email invalide.'); return; }
                    // role='lecteur' par défaut. Le bon rôle viendra du membership existant
                    // si l'user est déjà rattaché au club par le coach.
                    sendMagicLink(eClean, eClean.split('@')[0], 'lecteur');
                  }}
                  disabled={!email.trim() || !emailValid || sending}
                  className="btn-cta"
                  style={{marginTop:4, opacity: (!email.trim() || !emailValid || sending) ? 0.5 : 1}}>
            {sending ? 'ENVOI EN COURS…' : 'RECEVOIR MON LIEN DE CONNEXION →'}
          </button>

          <div style={{
            marginTop:10, padding:'10px 12px', borderRadius:9,
            background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)',
            fontSize:11, opacity:0.75, lineHeight:1.55,
          }}>
            💡 <b>Pas encore membre du club ?</b><br/>
            Ce lien sert uniquement à <i>voir</i> une convocation. Pour rejoindre
            le club et voir la fiche de ton enfant, demande à ton coach un <b>lien
            d'invitation personnel</b> (commence par <code>?invite=</code>).
          </div>

        </div>
      )}

      {/* MODE RETURNING SIGN-IN — reconnexion d'un user existant (peu importe son rôle).
           Le rôle vient automatiquement du membership Firestore, on ne demande
           rien d'autre que l'email/Google. */}
      {mode === 'returning-signin' && (
        <div style={{display:'flex', flexDirection:'column', gap:14}}>
          <button onClick={() => setMode('home')} style={{
            background:'transparent', border:'none', color:'rgba(255,255,255,0.6)',
            cursor:'pointer', textAlign:'left', padding:'4px 0',
            fontFamily:'inherit', fontSize:13,
          }}>‹ Retour</button>

          <div style={{fontSize:22, fontWeight:900, marginBottom:4}}>Je me reconnecte</div>
          <div style={{fontSize:12, opacity:0.65, lineHeight:1.5, marginBottom:6}}>
            Tu as déjà un compte (parent, joueur, adjoint, lecteur ou coach) ?
            Connecte-toi avec le même email/Google qu'à ton inscription. Ton rôle
            et tes rattachements aux clubs/équipes sont restaurés automatiquement.
          </div>

          {googleButton('lecteur')}
          {orSep}

          <label style={{display:'flex', flexDirection:'column', gap:6}}>
            <span style={{fontSize:11, fontWeight:700, opacity:0.7, letterSpacing:'.04em'}}>
              TON EMAIL
            </span>
            <input value={email} onChange={e => setEmail(e.target.value)}
                   type="email" placeholder="celui de ton inscription" autoFocus
                   style={{
                     padding:'12px 14px', borderRadius:10, fontSize:14,
                     background:'rgba(255,255,255,0.05)',
                     border: `1px solid ${emailValid ? 'rgba(255,255,255,0.12)' : 'rgba(239,68,68,0.45)'}`,
                     color:'#fff', fontFamily:'inherit',
                   }}/>
            {!emailValid && (
              <span style={{fontSize:11, color:'#ff8a8a'}}>⚠ Format email invalide</span>
            )}
          </label>

          <button onClick={() => {
                    const eClean = email.trim().toLowerCase();
                    if (!eClean) { alert('Email requis.'); return; }
                    if (!emailValid) { alert('Format email invalide.'); return; }
                    // role='lecteur' est un fallback minimal : si l'user a déjà un
                    // membership, son rôle réel est restauré depuis Firestore.
                    sendMagicLink(eClean, eClean.split('@')[0], 'lecteur');
                  }}
                  disabled={!email.trim() || !emailValid || sending}
                  className="btn-cta"
                  style={{marginTop:4, opacity: (!email.trim() || !emailValid || sending) ? 0.5 : 1}}>
            {sending ? 'ENVOI EN COURS…' : 'RECEVOIR MON LIEN DE CONNEXION →'}
          </button>

          <div style={{
            marginTop:10, padding:'10px 12px', borderRadius:9,
            background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)',
            fontSize:11, opacity:0.7, lineHeight:1.55,
          }}>
            💡 <b>Pas encore de compte ?</b><br/>
            Reviens à l'écran précédent et choisis « Je suis coach » (pour créer
            un club) ou « J'ai reçu un lien » (si ton coach t'a invité).
          </div>
        </div>
      )}

      {/* MODE PASTE LINK */}
      {mode === 'paste-link' && (
        <div style={{display:'flex', flexDirection:'column', gap:14}}>
          <button onClick={() => { setRoleHint(''); setMode(roleHint ? 'role-pick' : 'home'); }} style={{
            background:'transparent', border:'none', color:'rgba(255,255,255,0.6)',
            cursor:'pointer', textAlign:'left', padding:'4px 0',
            fontFamily:'inherit', fontSize:13,
          }}>‹ Retour</button>

          <div style={{fontSize:22, fontWeight:900, marginBottom:4}}>Colle le lien</div>
          <div style={{fontSize:12, opacity:0.65, lineHeight:1.5, marginBottom:8}}>
            Ton coach (ou ton parent) t'a envoyé un lien sur WhatsApp / SMS / Email.
            Colle-le ici pour accéder à l'équipe.
          </div>

          {/* Hint contextuel selon le rôle sélectionné sur role-pick */}
          {roleHint && (() => {
            const ROLE_HINT = {
              adjoint: { ic:'🎽', label:'Coach adjoint', msg:"Demande à ton coach principal de t'envoyer un lien d'invitation « adjoint » sur WhatsApp ou SMS." },
              parent:  { ic:'👪', label:'Parent',        msg:"Ton coach (ou le coach de ton enfant) doit t'envoyer un lien d'invitation « parent » via WhatsApp ou SMS." },
              joueur:  { ic:'⚽', label:'Joueur',        msg:"Demande à ton coach un lien d'invitation « joueur » pour rejoindre l'équipe." },
              lecteur: { ic:'👁️', label:'Lecteur / supporter', msg:"Demande au club un lien d'invitation « lecteur » (accès lecture seule)." },
            };
            const h = ROLE_HINT[roleHint];
            if (!h) return null;
            return (
              <div style={{
                padding:'12px 14px', borderRadius:10,
                background:'rgba(125,211,252,0.06)',
                border:'1px solid rgba(125,211,252,0.30)',
                fontSize:12, lineHeight:1.5, color:'rgba(255,255,255,.85)',
                display:'flex', gap:10, alignItems:'flex-start',
              }}>
                <span style={{fontSize:22}}>{h.ic}</span>
                <div>
                  <div style={{fontWeight:800, color:'#7dd3fc', fontSize:12.5, marginBottom:3}}>
                    Tu te connectes en tant que {h.label.toLowerCase()}
                  </div>
                  {h.msg}
                </div>
              </div>
            );
          })()}

          <label style={{display:'flex', flexDirection:'column', gap:6}}>
            <span style={{fontSize:11, fontWeight:700, opacity:0.7, letterSpacing:'.04em'}}>
              LIEN COMPLET
            </span>
            <input value={linkInput} onChange={e => setLinkInput(e.target.value)}
                   placeholder="https://coach-du-dimanche.app/?carnet=…" autoFocus
                   style={{
                     padding:'12px 14px', borderRadius:10, fontSize:13,
                     background:'rgba(255,255,255,0.05)',
                     border:'1px solid rgba(255,255,255,0.12)',
                     color:'#fff', fontFamily:'inherit',
                   }}/>
          </label>

          <button onClick={submitLink}
                  disabled={!linkInput.trim()}
                  className="btn-cta"
                  style={{marginTop:8, opacity: !linkInput.trim() ? 0.5 : 1}}>
            OUVRIR L'ÉQUIPE →
          </button>

          <div style={{
            marginTop:14, padding:'12px 14px', borderRadius:10,
            background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)',
            fontSize:11, opacity:0.7, lineHeight:1.5,
          }}>
            <b style={{display:'block', marginBottom:6}}>Types de liens reconnus</b>
            • <code style={{color:'#c8f169'}}>?carnet=ID</code> — Carnet personnel d'un joueur<br/>
            • <code style={{color:'#c8f169'}}>?p=ID</code> — Convocation parent<br/>
            • <code style={{color:'#c8f169'}}>?t=TOKEN</code> — Lecteur public d'un club<br/>
            • <code style={{color:'#c8f169'}}>?invite=TOKEN</code> — Invitation à rejoindre une équipe
          </div>
        </div>
      )}

      </>)}

    </div>
  );
}

window.ScreenLanding = ScreenLanding;
