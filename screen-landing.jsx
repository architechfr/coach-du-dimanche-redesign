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
  const [mode, setMode] = useLS('home'); // 'home' | 'coach-signup' | 'paste-link'
  const [email, setEmail] = useLS('');
  const [name, setName] = useLS('');
  const [linkInput, setLinkInput] = useLS('');
  const emailValid = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const submitCoach = () => {
    const eClean = email.trim().toLowerCase();
    const nClean = name.trim();
    if (!eClean || !nClean) {
      alert('Email et nom requis pour créer ton compte coach.');
      return;
    }
    if (!emailValid) {
      alert('Format email invalide.');
      return;
    }
    try {
      localStorage.setItem('cdd_user_email', eClean);
      localStorage.setItem('cdd_coach_name', nClean);
      localStorage.setItem('cdd_user_role', 'coach');
    } catch (e) {}
    window.dispatchEvent(new Event('cdd-auth-changed'));
    window.dispatchEvent(new CustomEvent('cdd-data-rebuilt'));
    if (typeof onLoggedIn === 'function') onLoggedIn();
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
        }}>L'app FIFA<br/>pour les coachs<br/>de foot amateur.</div>
        <div style={{fontSize:13, opacity:0.65, lineHeight:1.5, padding:'0 8px'}}>
          Compo, convocation, match live, carte joueur évolutive.<br/>
          Vraies données FFF. Sans pub. Hors-ligne.
        </div>
      </div>

      {/* MODE HOME : 3 chemins d'entrée */}
      {mode === 'home' && (
        <>
          <div style={{
            fontSize:11, fontWeight:800, opacity:0.55,
            letterSpacing:'.08em', marginBottom:10, paddingLeft:4,
          }}>QUI ES-TU ?</div>

          <button onClick={() => setMode('coach-signup')} style={{
            ...cardBase, marginBottom:10,
            background:'rgba(200,241,105,0.08)', border:'1px solid rgba(200,241,105,0.35)',
          }}>
            <div style={{display:'flex', alignItems:'center', gap:14}}>
              <span style={{fontSize:32}}>🏆</span>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontWeight:900, fontSize:15, color:'#c8f169'}}>Je suis coach</div>
                <div style={{fontSize:12, opacity:0.65, marginTop:4, lineHeight:1.4}}>
                  Je crée mon club et je gère mes équipes
                </div>
              </div>
              <span style={{opacity:0.5, fontSize:18}}>›</span>
            </div>
          </button>

          <button onClick={() => setMode('paste-link')} style={{
            ...cardBase, marginBottom:10,
          }}>
            <div style={{display:'flex', alignItems:'center', gap:14}}>
              <span style={{fontSize:32}}>🔗</span>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontWeight:900, fontSize:15}}>J'ai reçu un lien</div>
                <div style={{fontSize:12, opacity:0.65, marginTop:4, lineHeight:1.4}}>
                  Mon coach m'a envoyé un lien sur WhatsApp/SMS
                </div>
              </div>
              <span style={{opacity:0.5, fontSize:18}}>›</span>
            </div>
          </button>

          <button onClick={() => alert(
            'Pas encore disponible.\n\nCette app sert à des coachs pour gérer leurs équipes. ' +
            'Si tu cherches à découvrir l\'app, demande un lien à un coach ou crée ton propre club.'
          )} style={{
            ...cardBase, marginBottom:10, opacity:0.6,
          }}>
            <div style={{display:'flex', alignItems:'center', gap:14}}>
              <span style={{fontSize:32}}>👀</span>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontWeight:900, fontSize:15}}>Je découvre</div>
                <div style={{fontSize:12, opacity:0.65, marginTop:4, lineHeight:1.4}}>
                  Visite guidée (bientôt)
                </div>
              </div>
              <span style={{opacity:0.5, fontSize:18}}>›</span>
            </div>
          </button>

          <div style={{
            marginTop:'auto', paddingTop:24, fontSize:10.5,
            color:'rgba(255,255,255,0.4)', textAlign:'center', lineHeight:1.5,
          }}>
            Coach du Dimanche · v2<br/>
            Aucune donnée n'est visible tant que tu n'as pas créé un compte<br/>
            ou utilisé un lien d'invitation.
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
            Ton email te rattache à tes clubs. Tu pourras créer ton premier club juste après.
          </div>

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
              Important : utilise ton vrai email Gmail / pro. Quand l'auth Google sera branchée,
              tu retrouveras tes clubs en te connectant avec exactement cet email.
            </span>
          </label>

          <button onClick={submitCoach}
                  disabled={!email.trim() || !name.trim() || !emailValid}
                  className="btn-cta"
                  style={{marginTop:8, opacity: (!email.trim() || !name.trim() || !emailValid) ? 0.5 : 1}}>
            CRÉER MON COMPTE COACH →
          </button>

          <div style={{
            marginTop:14, padding:'12px 14px', borderRadius:10,
            background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)',
            fontSize:11, opacity:0.7, lineHeight:1.5,
          }}>
            <b style={{display:'block', marginBottom:6}}>⚠ Sécurité actuelle</b>
            Pas encore d'authentification Google. Ton compte est local à cet appareil.
            La vraie auth Google arrive prochainement — quand elle sera là, le même email te
            retrouvera tes données.
          </div>
        </div>
      )}

      {/* MODE PASTE LINK */}
      {mode === 'paste-link' && (
        <div style={{display:'flex', flexDirection:'column', gap:14}}>
          <button onClick={() => setMode('home')} style={{
            background:'transparent', border:'none', color:'rgba(255,255,255,0.6)',
            cursor:'pointer', textAlign:'left', padding:'4px 0',
            fontFamily:'inherit', fontSize:13,
          }}>‹ Retour</button>

          <div style={{fontSize:22, fontWeight:900, marginBottom:4}}>Colle le lien</div>
          <div style={{fontSize:12, opacity:0.65, lineHeight:1.5, marginBottom:8}}>
            Ton coach (ou ton parent) t'a envoyé un lien sur WhatsApp / SMS / Email.
            Colle-le ici pour accéder à l'équipe.
          </div>

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

    </div>
  );
}

window.ScreenLanding = ScreenLanding;
