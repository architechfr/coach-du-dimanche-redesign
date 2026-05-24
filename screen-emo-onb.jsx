/* global React */
/* ============================================================
   SCREEN — Onboarding émotionnel (premier contact)
   ============================================================
   Parcours en 5 écrans interactifs au TOUT PREMIER ACCÈS à l'app,
   avant la landing publique. Ton complice / camarade ('côté banc').

   Stocké : cdd_emo_onb_done = 'true' à la fin OU au skip.
   Plus jamais affiché ensuite. Le user peut toujours skip à tout
   instant via 'Passer' en haut à droite.

   Réponses optionnelles stockées dans cdd_emo_onb_data pour usage
   futur (personnalisation de la landing, suggestions).
   ============================================================ */

const { useState: useStateEO, useEffect: useEffectEO } = React;

function ScreenEmoOnb({ onDone }) {
  const [step, setStep] = useStateEO(0);
  const [pains, setPains] = useStateEO([]);
  const [motiv, setMotiv] = useStateEO([]);

  const total = 5;

  const finish = (intent) => {
    try {
      localStorage.setItem('cdd_emo_onb_done', 'true');
      localStorage.setItem('cdd_emo_onb_data', JSON.stringify({
        pains, motiv, finishedAt: Date.now(),
      }));
    } catch (e) {}
    if (onDone) onDone(intent || 'home');
  };
  const skip = () => finish('skip');

  // Toggle utility for multi-select
  const togglePain = (id) => setPains(arr =>
    arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id]);
  const toggleMotiv = (id) => setMotiv(arr =>
    arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id]);

  // Styles communs
  const wrap = {
    width:'100%', minHeight:'100vh', display:'flex', flexDirection:'column',
    background:'linear-gradient(180deg, #0a0e14 0%, #050709 100%)',
    color:'#fff', fontFamily:'inherit', padding:'18px 18px 24px',
    boxSizing:'border-box', overflowY:'auto',
  };
  const headerRow = {
    display:'flex', justifyContent:'space-between', alignItems:'center',
    marginBottom:18,
  };
  const progressDots = {
    display:'flex', gap:5, alignItems:'center',
  };
  const dot = (active) => ({
    width: active ? 22 : 8, height: 4, borderRadius: 2,
    background: active ? '#c8f169' : 'rgba(255,255,255,0.18)',
    transition: 'all .25s',
  });
  const skipBtn = {
    background:'transparent', border:'none', color:'rgba(255,255,255,0.55)',
    cursor:'pointer', fontSize:12, fontFamily:'inherit', padding:'4px 8px',
  };
  const sectionTitle = {
    fontSize:'clamp(22px, 6.5vw, 30px)', fontWeight:900, lineHeight:1.15,
    letterSpacing:'-.01em', marginBottom:10,
  };
  const sectionLead = {
    fontSize:14, opacity:0.75, lineHeight:1.55, marginBottom:18,
  };
  const ctaPrimary = {
    width:'100%', padding:'14px 16px', borderRadius:12, cursor:'pointer',
    background:'var(--acc, #c8f169)', color:'#000', border:'none',
    fontSize:14, fontWeight:900, letterSpacing:'.02em',
    fontFamily:'inherit',
  };
  const ctaSecondary = {
    width:'100%', padding:'12px 14px', borderRadius:11, cursor:'pointer',
    background:'rgba(255,255,255,0.05)', color:'#fff',
    border:'1px solid rgba(255,255,255,0.15)',
    fontSize:13, fontWeight:700, fontFamily:'inherit', marginTop:8,
  };
  const chipBase = (active) => ({
    display:'flex', alignItems:'center', gap:10,
    padding:'12px 14px', borderRadius:11, cursor:'pointer',
    background: active ? 'rgba(200,241,105,0.10)' : 'rgba(255,255,255,0.04)',
    color: active ? '#c8f169' : '#fff',
    border: '1px solid ' + (active ? 'rgba(200,241,105,0.45)' : 'rgba(255,255,255,0.10)'),
    fontSize:13.5, fontWeight:700, letterSpacing:'.01em',
    fontFamily:'inherit', width:'100%', textAlign:'left',
    transition:'all .15s',
  });
  const chipIcon = { fontSize:20, lineHeight:1, flexShrink:0 };
  const chipCheck = (active) => ({
    width:18, height:18, borderRadius:5, flexShrink:0,
    background: active ? '#c8f169' : 'transparent',
    border: '1.5px solid ' + (active ? '#c8f169' : 'rgba(255,255,255,0.30)'),
    display:'flex', alignItems:'center', justifyContent:'center',
    color:'#000', fontSize:12, fontWeight:900,
  });

  // ============================================================
  // Contenu des écrans
  // ============================================================
  const PAIN_OPTIONS = [
    { id:'whatsapp', ic:'📱', l:"Je gère 16 numéros parents sur WhatsApp" },
    { id:'redo',     ic:'📋', l:"Je refais la convoc à chaque match" },
    { id:'who',      ic:'❓', l:"Je ne sais jamais qui vient vraiment" },
    { id:'jersey',   ic:'😩', l:"Mes joueurs n'ont jamais le bon maillot" },
    { id:'pitch',    ic:'🤷', l:"Le terrain / l'heure change tout le temps" },
    { id:'notes',    ic:'📝', l:"Mes notes joueurs sont sur 3 carnets différents" },
  ];
  const MOTIV_OPTIONS = [
    { id:'transmit', ic:'🎓', l:"Transmettre, faire progresser" },
    { id:'passion',  ic:'⚽', l:"La passion du foot" },
    { id:'kids',     ic:'👨‍👦', l:"Pour mes enfants / les mômes" },
    { id:'challenge',ic:'💪', l:"Le défi sportif, la compétition" },
    { id:'club',     ic:'🤝', l:"L'esprit du club, la famille" },
  ];

  // ============================================================
  // Rendu commun (header + progression)
  // ============================================================
  const renderHeader = () => (
    <div style={headerRow}>
      <div style={progressDots}>
        {Array.from({length: total}, (_, i) => <span key={i} style={dot(i <= step)}/>)}
      </div>
      <button onClick={skip} style={skipBtn}>Passer →</button>
    </div>
  );

  // ============================================================
  // ÉCRAN 0 — Hook émotionnel
  // ============================================================
  if (step === 0) {
    return (
      <div style={wrap}>
        {renderHeader()}
        <div style={{flex:1, display:'flex', flexDirection:'column', justifyContent:'center', padding:'12px 0'}}>
          <div style={{fontSize:48, marginBottom:18}}>👋</div>
          <div style={sectionTitle}>Salut coach.</div>
          <div style={{fontSize:14, opacity:0.85, lineHeight:1.65, marginBottom:14}}>
            On se connaît pas encore mais je devine pas mal de choses sur toi.
          </div>
          <div style={{
            background:'rgba(255,255,255,0.03)', borderLeft:'3px solid #c8f169',
            padding:'14px 16px', borderRadius:'0 11px 11px 0', fontSize:13.5,
            lineHeight:1.7, opacity:0.85,
          }}>
            Tu te lèves le dimanche à 7h.<br/>
            Tu prépares ta convoc dans WhatsApp.<br/>
            Tu cherches le fichier Excel avec les numéros maillots.<br/>
            Tu te demandes <i>encore</i> qui ne va pas venir aujourd'hui.
          </div>
        </div>
        <button onClick={() => setStep(1)} style={ctaPrimary}>
          Ouais... t'as raison. Continue ➡️
        </button>
      </div>
    );
  }

  // ============================================================
  // ÉCRAN 1 — Reconnaissance des problèmes (interactif)
  // ============================================================
  if (step === 1) {
    return (
      <div style={wrap}>
        {renderHeader()}
        <div style={sectionTitle}>C'est ça, non ?</div>
        <div style={sectionLead}>
          Coche tout ce qui te parle. Je suis pas là pour te juger.
        </div>
        <div style={{display:'flex', flexDirection:'column', gap:8, marginBottom:18}}>
          {PAIN_OPTIONS.map(opt => {
            const active = pains.includes(opt.id);
            return (
              <button key={opt.id} type="button" onClick={() => togglePain(opt.id)}
                      style={chipBase(active)}>
                <span style={chipIcon}>{opt.ic}</span>
                <span style={{flex:1, lineHeight:1.35}}>{opt.l}</span>
                <span style={chipCheck(active)}>{active ? '✓' : ''}</span>
              </button>
            );
          })}
        </div>
        <button onClick={() => setStep(2)} style={ctaPrimary}>
          {pains.length === 0 ? 'Tout va bien chez moi' : "Ouais, je connais"}  ➡️
        </button>
      </div>
    );
  }

  // ============================================================
  // ÉCRAN 2 — Promesse / bénéfices
  // ============================================================
  if (step === 2) {
    const BENEFITS = [
      { ic:'⚡', t:"Ta convoc en 30 secondes",
        s:"Tu pousses sur un bouton, les parents reçoivent. Les retours arrivent tout seuls." },
      { ic:'🎯', t:"Ta compo type qui se rappelle de tout",
        s:"Tu poses ton 11 une fois. Pour chaque match, tu adaptes — pas tout refaire." },
      { ic:'📋', t:"Stade, heure, covoit en 1 lien",
        s:"Les parents ont tout dans WhatsApp. Plus de 'à quelle heure on est où ?'." },
      { ic:'🏆', t:"Tes joueurs en cartes FUT",
        s:"Stats qui évoluent à chaque match. Les gosses adorent voir leur OVR grimper." },
    ];
    return (
      <div style={wrap}>
        {renderHeader()}
        <div style={sectionTitle}>Voilà ce qu'on va faire ensemble.</div>
        <div style={sectionLead}>
          4 trucs. Pas 40. Le but c'est de te rendre du temps.
        </div>
        <div style={{display:'flex', flexDirection:'column', gap:10, marginBottom:18}}>
          {BENEFITS.map((b, i) => (
            <div key={i} style={{
              padding:'14px', borderRadius:12,
              background:'rgba(255,255,255,0.03)',
              border:'1px solid rgba(255,255,255,0.08)',
              display:'flex', gap:12, alignItems:'flex-start',
            }}>
              <span style={{fontSize:28, lineHeight:1, flexShrink:0}}>{b.ic}</span>
              <div>
                <div style={{fontSize:14, fontWeight:900, marginBottom:3}}>{b.t}</div>
                <div style={{fontSize:12, opacity:0.7, lineHeight:1.5}}>{b.s}</div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => setStep(3)} style={ctaPrimary}>
          OK, ça me parle ➡️
        </button>
      </div>
    );
  }

  // ============================================================
  // ÉCRAN 3 — Pourquoi tu coaches (engagement)
  // ============================================================
  if (step === 3) {
    return (
      <div style={wrap}>
        {renderHeader()}
        <div style={sectionTitle}>Avant qu'on attaque…</div>
        <div style={sectionLead}>
          Pourquoi tu te lèves le dimanche, toi ? (plusieurs réponses possibles)
        </div>
        <div style={{display:'flex', flexDirection:'column', gap:8, marginBottom:18}}>
          {MOTIV_OPTIONS.map(opt => {
            const active = motiv.includes(opt.id);
            return (
              <button key={opt.id} type="button" onClick={() => toggleMotiv(opt.id)}
                      style={chipBase(active)}>
                <span style={chipIcon}>{opt.ic}</span>
                <span style={{flex:1, lineHeight:1.35}}>{opt.l}</span>
                <span style={chipCheck(active)}>{active ? '✓' : ''}</span>
              </button>
            );
          })}
        </div>
        <button onClick={() => setStep(4)} style={ctaPrimary}>
          C'est noté ➡️
        </button>
      </div>
    );
  }

  // ============================================================
  // ÉCRAN 4 — Conclusion + CTA
  // ============================================================
  if (step === 4) {
    // Personnalisation légère du message selon motivations
    const kidsFocus = motiv.includes('kids') || motiv.includes('transmit');
    const closingLine = kidsFocus
      ? "Les mômes que tu coaches s'en souviendront longtemps."
      : motiv.includes('club')
        ? "Ton club tient debout grâce à des gars comme toi."
        : "Tu fais vivre le foot du dimanche.";

    return (
      <div style={wrap}>
        {renderHeader()}
        <div style={{flex:1, display:'flex', flexDirection:'column', justifyContent:'center'}}>
          <div style={{fontSize:48, marginBottom:18}}>🤝</div>
          <div style={sectionTitle}>Le foot amateur tient debout grâce à toi.</div>
          <div style={{fontSize:14, opacity:0.85, lineHeight:1.7, marginBottom:18}}>
            {closingLine}
          </div>
          <div style={{
            background:'rgba(200,241,105,0.06)', border:'1px solid rgba(200,241,105,0.25)',
            padding:'14px 16px', borderRadius:11, fontSize:13, lineHeight:1.6,
            color:'rgba(255,255,255,0.9)', marginBottom:24,
          }}>
            Coach du Dimanche c'est <b style={{color:'#c8f169'}}>ton bras droit</b>.<br/>
            Pas un gestionnaire de plus à apprendre.<br/>
            Pas de pub. Pas de spam aux parents. Pas d'abonnement caché.
          </div>
        </div>
        <button onClick={() => finish('coach')} style={ctaPrimary}>
          🏆 Je suis coach, j'attaque
        </button>
        <button onClick={() => finish('link')} style={ctaSecondary}>
          🔗 J'ai reçu un lien
        </button>
        <button onClick={() => finish('signin')} style={{ ...ctaSecondary, marginTop:6,
                                                          background:'transparent',
                                                          border:'1px solid rgba(255,255,255,0.10)' }}>
          👤 Je me reconnecte
        </button>
      </div>
    );
  }

  return null;
}

window.ScreenEmoOnb = ScreenEmoOnb;
