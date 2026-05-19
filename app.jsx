/* global React, ReactDOM, ScreenHome, ScreenEffectif, ScreenLineup, ScreenMatch, ScreenFiche, ScreenResults, ScreenConvocations, ScreenSettings, ScreenOnboarding, ScreenTV, ScreenTactique, TweaksPanel, TweakSection, TweakColor, TweakRadio, TweakSelect, useTweaks */

const { useState, useEffect, useMemo } = React;

// ----- Tweakable defaults (parsed/persisted by host) -----
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#c8f169",
  "cardStyle": "fut-classic",
  "hero": "photo",
  "density": "comfy"
}/*EDITMODE-END*/;

// Map accent → derived shades
function applyAccent(hex) {
  // Simple complementary shade (darker variant)
  const m = hex.replace("#","").match(/.{2}/g) || ["c8","f1","69"];
  const [r,g,b] = m.map(x => parseInt(x,16));
  // Darker accent-2 (mix toward green-3)
  const acc2 = `rgb(${Math.round(r*.55)},${Math.round(g*.85)},${Math.round(b*.7)})`;
  // Accent-3 is the further-darker variant
  const acc3 = `rgb(${Math.round(r*.35)},${Math.round(g*.7)},${Math.round(b*.5)})`;
  // ink — pick dark or light
  const lum = (0.299*r + 0.587*g + 0.114*b)/255;
  const ink = lum > 0.55 ? "#06120a" : "#fff";
  const glow = `rgba(${r},${g},${b},.45)`;
  document.documentElement.style.setProperty("--acc", hex);
  document.documentElement.style.setProperty("--acc-2", acc2);
  document.documentElement.style.setProperty("--acc-3", acc3);
  document.documentElement.style.setProperty("--acc-ink", ink);
  document.documentElement.style.setProperty("--acc-glow", glow);
}

// ----- Nav model -----
const NAV = [
  { id:"home",         label:"Accueil",       ic:"⌂",   icon:HomeIcon,   bottom:true },
  { id:"effectif",     label:"Effectif",      ic:"◧",   icon:SquadIcon,  bottom:true },
  { id:"lineup",       label:"Compo",         ic:"◉",   icon:PitchIcon,  bottom:true },
  { id:"convocations", label:"Convocs",       ic:"☷",   icon:ConvocIcon, bottom:true },
  { id:"results",      label:"Champ",         ic:"♛",   icon:CupIcon,    bottom:true },
  { id:"prep",         label:"Prépa J-7",     ic:"◈",   icon:CardIcon,   bottom:false },
  { id:"match",        label:"Live",          ic:"●",   icon:LiveIcon,   bottom:false },
  { id:"fiche",        label:"Fiche",         ic:"◌",   icon:CardIcon,   bottom:false },
  { id:"fiche-match",  label:"Feuille match", ic:"⊞",   icon:ConvocIcon, bottom:false },
  { id:"vote",         label:"Vote",          ic:"☆",   icon:CupIcon,    bottom:false },
  { id:"arb",          label:"Arbitre",       ic:"⚑",   icon:LiveIcon,   bottom:false },
  { id:"lecteur",      label:"Lecteur",       ic:"△",   icon:SquadIcon,  bottom:false },
  { id:"convoP",       label:"Convoc parent", ic:"¤",   icon:ConvocIcon, bottom:false },
  { id:"share",        label:"Partager",      ic:"↗",   icon:ConvocIcon, bottom:false },
  { id:"transfert",    label:"Transfert",     ic:"⇄",   icon:ConvocIcon, bottom:false },
  { id:"sync",         label:"Sync cloud",    ic:"☁",   icon:GearIcon,   bottom:false },
  { id:"set",          label:"Réglages",      ic:"⚙",   icon:GearIcon,   bottom:false },
  { id:"onb",          label:"Onboarding",    ic:"✦",   icon:SparkIcon,  bottom:false },
  { id:"tv",           label:"Visuel compo",  ic:"📷",  icon:PitchIcon,  bottom:false },
  { id:"tactique",     label:"Tactique",      ic:"🎬",  icon:PitchIcon,  bottom:false },
  { id:"carnet",       label:"Carnet joueur", ic:"🎴",  icon:CardIcon,   bottom:false },
];

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l9-7 9 7v9a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2z"/>
    </svg>
  );
}
function SquadIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3"/>
      <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
      <circle cx="17" cy="6" r="2.5"/>
      <path d="M14 14a4 4 0 0 1 3-1 4 4 0 0 1 4 4v1"/>
    </svg>
  );
}
function PitchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="1.5"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
      <circle cx="12" cy="12" r="3"/>
      <path d="M3 8h4v8H3M21 8h-4v8h4"/>
    </svg>
  );
}
function ConvocIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="2"/>
      <line x1="8" y1="8" x2="16" y2="8"/>
      <line x1="8" y1="12" x2="16" y2="12"/>
      <line x1="8" y1="16" x2="13" y2="16"/>
    </svg>
  );
}
function CupIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 4h10v4a5 5 0 0 1-10 0z"/>
      <path d="M7 6H4a3 3 0 0 0 3 6M17 6h3a3 3 0 0 1-3 6"/>
      <path d="M9 14h6l-.5 4h-5z"/>
      <line x1="8" y1="20" x2="16" y2="20"/>
    </svg>
  );
}
function LiveIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="4" fill="currentColor"/>
      <circle cx="12" cy="12" r="9" strokeOpacity=".4"/>
    </svg>
  );
}
function CardIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="3" width="12" height="18" rx="2"/>
      <circle cx="12" cy="9" r="2"/>
      <path d="M8 16c1-2 2.5-3 4-3s3 1 4 3"/>
    </svg>
  );
}
function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );
}
function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
      <path d="M12 2l1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7z"/>
    </svg>
  );
}

// ============================================================
// ERROR BOUNDARY — catch screen crashes, show readable message
// ============================================================
class ScreenErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) { console.error('[ScreenErrorBoundary]', err, info); }
  render() {
    if (this.state.err) {
      const msg = this.state.err?.message || String(this.state.err);
      return (
        <div style={{padding:24, textAlign:"center"}}>
          <div style={{fontSize:40, marginBottom:10}}>⚠</div>
          <h2 style={{margin:"0 0 8px", fontSize:18}}>Cet écran a planté</h2>
          <p style={{opacity:0.6, fontSize:13, marginBottom:16}}>
            Erreur : <code style={{background:"rgba(255,255,255,0.06)", padding:"2px 6px", borderRadius:4}}>{msg}</code>
          </p>
          <button className="btn-cta" onClick={() => { this.setState({err:null}); this.props.onReset?.(); }}>
            ← Retour à l'accueil
          </button>
          <p style={{opacity:0.4, fontSize:11, marginTop:24}}>
            (Ouvre la console F12 pour la stack trace complète.)
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

// ============================================================
// MAIN APP
// ============================================================

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  // Auto-route vers le Carnet du joueur si URL ?carnet=PLAYER_ID (lien magique enfant)
  const initialScreen = (() => {
    try {
      const params = new URLSearchParams(window.location.search || '');
      if (params.get('carnet') || params.get('joueur')) return 'carnet';
    } catch (e) {}
    return 'home';
  })();
  const [screen, setScreen] = useState(initialScreen);
  const [stack, setStack] = useState([initialScreen]);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [screenMenuOpen, setScreenMenuOpen] = useState(false);

  // Apply tweaks
  useEffect(() => { applyAccent(t.accent); }, [t.accent]);

  // Go to a screen, optionally with payload
  const go = (id, payload) => {
    if (id === "back") {
      setStack(s => {
        if (s.length <= 1) return s;
        const next = s.slice(0, -1);
        setScreen(next[next.length - 1]);
        return next;
      });
      return;
    }
    if (id === "fiche" && payload) setCurrentPlayer(payload);
    setScreen(id);
    setStack(s => [...s.slice(-3), id]);
    setScreenMenuOpen(false);
  };

  // Determine if header back button shown
  const showBack = !["home", "onb"].includes(screen);

  const headerTitle = useMemo(() => {
    const map = {
      home: "",
      effectif: "EFFECTIF",
      lineup: "FEUILLE DE MATCH",
      convocations: "CONVOCATIONS",
      results: "CHAMPIONNAT",
      match: "MATCH LIVE",
      fiche: "FICHE JOUEUR",
      "fiche-match": "FEUILLE DE MATCH",
      prep: "PRÉPA MATCH",
      arb: "MODE ARBITRE",
      lecteur: "FCMH · LECTEUR",
      vote: "VOTE POST-MATCH",
      transfert: "TRANSFERT",
      sync: "SYNC CLOUD",
      convoP: "CONVOCATION",
      share: "PARTAGER",
      set: "RÉGLAGES",
      onb: "",
      tv: "MODE VESTIAIRE",
      carnet: "MON CARNET",
    };
    return map[screen] ?? "";
  }, [screen]);

  return (
    <div className="app-stage" data-screen-label={`Phone — ${screen}`}>

      <div className="phone">
        <div className="phone-screen">

          {/* Header (hidden on onboarding & home) */}
          {screen !== "onb" && screen !== "home" && (
            <div className="app-hdr">
              <button className="app-hdr-btn back" onClick={() => go("back")}>‹</button>
              <div className="app-hdr-title">{headerTitle}</div>
              <button className="app-hdr-btn" onClick={() => setScreenMenuOpen(true)} aria-label="Tous les écrans">⋯</button>
            </div>
          )}

          {/* Home : floating header */}
          {screen === "home" && (
            <div className="app-hdr" style={{paddingTop: 0}}>
              <button className="app-hdr-btn" onClick={() => go("set")} aria-label="Réglages">⚙</button>
              <div className="app-hdr-title" style={{fontSize:14}}>FCMH · U15 D2</div>
              <button className="app-hdr-btn" onClick={() => setScreenMenuOpen(true)} aria-label="Tous les écrans">⋯</button>
            </div>
          )}

          {/* Body */}
          <div className="app-body" key={screen}>
            <ScreenErrorBoundary key={screen} onReset={() => go("home")}>
            {screen === "home"         && <ScreenHome go={go} tweaks={t}/>}
            {screen === "effectif"     && <ScreenEffectif go={go} tweaks={t}/>}
            {screen === "lineup"       && <ScreenLineup go={go} tweaks={t}/>}
            {screen === "convocations" && <ScreenConvocations go={go} tweaks={t}/>}
            {screen === "results"      && <ScreenResults go={go} tweaks={t}/>}
            {screen === "match"        && <ScreenMatch go={go} tweaks={t}/>}
            {screen === "fiche"        && <ScreenFiche go={go} tweaks={t} player={currentPlayer}/>}
            {screen === "fiche-match"  && <ScreenFicheMatch go={go} tweaks={t}/>}
            {screen === "tv"           && <ScreenTV go={go} tweaks={t}/>}
            {screen === "tactique"     && <ScreenTactique go={go} tweaks={t}/>}
            {screen === "carnet"       && window.ScreenCarnetJoueur && <window.ScreenCarnetJoueur go={go} tweaks={t} playerId={currentPlayer?.id}/>}
            {screen === "prep"         && <ScreenPrep go={go} tweaks={t}/>}
            {screen === "arb"          && <ScreenArbitre go={go} tweaks={t}/>}
            {screen === "lecteur"      && <ScreenLecteur go={go} tweaks={t}/>}
            {screen === "vote"         && <ScreenVote go={go} tweaks={t}/>}
            {screen === "transfert"    && <ScreenTransfert go={go} tweaks={t}/>}
            {screen === "sync"         && <ScreenSyncCloud go={go} tweaks={t}/>}
            {screen === "convoP"       && <ScreenConvoParent go={go} tweaks={t}/>}
            {screen === "share"        && <ScreenSharePartage go={go} tweaks={t}/>}
            {screen === "set"          && <ScreenSettings go={go} tweaks={t} setTweak={setTweak}/>}
            {screen === "onb"          && <ScreenOnboarding go={go} tweaks={t}/>}
            </ScreenErrorBoundary>
          </div>

          {/* Bottom nav */}
          {screen !== "onb" && (
            <div className="bottom-nav">
              {NAV.filter(n => n.bottom).map(n => {
                const Icon = n.icon;
                return (
                  <button key={n.id}
                    className={`bn-item ${screen===n.id?"on":""}`}
                    onClick={() => go(n.id)}>
                    <span className="ic"><Icon/></span>
                    <span>{n.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Screen selector overlay */}
          {screenMenuOpen && (
            <div className="sm-overlay" onClick={() => setScreenMenuOpen(false)}>
              <div className="sm-sheet" onClick={e => e.stopPropagation()}>
                <div className="sm-h">
                  <div className="sm-t">Tous les écrans</div>
                  <button className="sm-close" onClick={() => setScreenMenuOpen(false)}>✕</button>
                </div>
                <div className="sm-grid">
                  {NAV.map(n => {
                    const Icon = n.icon;
                    return (
                      <button key={n.id}
                        className={`sm-tile ${screen===n.id?"on":""}`}
                        onClick={() => go(n.id)}>
                        <span className="sm-tile-ic"><Icon/></span>
                        <span className="sm-tile-l">{n.label}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="sm-hint">
                  Tu peux aussi utiliser la barre de navigation en bas, ou taper sur les cartes joueurs / matchs depuis l'accueil.
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Tweaks panel — controlled by host toolbar */}
      <TweaksPanel title="Tweaks">
        <TweakSection label="Couleur d'accent">
          <TweakColor
            label="Accent"
            value={t.accent}
            onChange={v => setTweak("accent", v)}
            options={["#c8f169", "#f5c451", "#06b6d4", "#ef4444", "#a78bfa"]}
          />
        </TweakSection>
        <TweakSection label="Hero d'accueil">
          <TweakRadio
            label="Style hero"
            value={t.hero}
            onChange={v => setTweak("hero", v)}
            options={[
              { value:"photo",      label:"Photo" },
              { value:"geometric",  label:"Géom." },
            ]}/>
        </TweakSection>
        <TweakSection label="Cartes joueurs (à venir)">
          <TweakSelect
            label="Style FUT"
            value={t.cardStyle}
            onChange={v => setTweak("cardStyle", v)}
            options={[
              { value:"fut-classic", label:"Classique (FUT)" },
              { value:"fut-icon",    label:"Icon — premium" },
              { value:"fut-totw",    label:"Team of the Week" },
              { value:"fut-hero",    label:"Hero (arc-en-ciel)" },
            ]}/>
        </TweakSection>
        <TweakSection label="Densité">
          <TweakRadio
            label="Densité"
            value={t.density}
            onChange={v => setTweak("density", v)}
            options={[
              { value:"comfy",   label:"Aéré" },
              { value:"compact", label:"FM" },
            ]}/>
        </TweakSection>
      </TweaksPanel>

    </div>
  );
}


// ============================================================
// SCREEN — Feuille de match (récap dernier match terminé)
// ============================================================
function ScreenFicheMatch({ go, tweaks }) {
  const matches = (window.CDD_LAST_MATCHES || []).filter(m => m.played);
  const m = matches[0]; // dernier match terminé
  if (!m) {
    return (
      <div className="scr fade-in" style={{padding:"40px 20px", textAlign:"center"}}>
        <div style={{fontSize:48, marginBottom:12}}>⚽</div>
        <h2 style={{margin:"0 0 8px"}}>Pas encore de match</h2>
        <p style={{opacity:0.7, fontSize:14, marginBottom:24}}>
          La feuille de match s'affichera ici après le coup de sifflet final.
        </p>
        <button className="btn-cta" onClick={() => go("match")}>
          <span>LANCER UN MATCH</span><span className="arr">→</span>
        </button>
      </div>
    );
  }
  const resultLabel = m.result === "W" ? "VICTOIRE" : m.result === "D" ? "MATCH NUL" : "DÉFAITE";
  const resultCls   = m.result === "W" ? "win" : m.result === "D" ? "draw" : "loss";
  return (
    <div className="scr fade-in" style={{padding:"0 0 24px"}}>
      <div style={{
        padding:"24px 20px 20px",
        background:`linear-gradient(180deg, var(--acc-3) 0%, transparent 100%)`,
        textAlign:"center"
      }}>
        <div className={`chip ${resultCls}`} style={{fontSize:11, letterSpacing:"0.12em", marginBottom:12}}>
          {resultLabel}
        </div>
        <div style={{fontSize:13, opacity:0.6, marginBottom:8}}>
          {m.date} · {m.venue === "H" ? "DOMICILE" : "EXTÉRIEUR"}
        </div>
        <div style={{display:"flex", alignItems:"center", justifyContent:"center", gap:16, fontSize:18, fontWeight:700}}>
          <span>{m.venue === "H" ? "FCMH" : m.opp}</span>
          <span className="num" style={{fontSize:32, color:"var(--acc)"}}>{m.score[0]}–{m.score[1]}</span>
          <span>{m.venue === "H" ? m.opp : "FCMH"}</span>
        </div>
      </div>
      {m.scorers && m.scorers.length > 0 && (
        <div style={{padding:"20px"}}>
          <div className="sec-h" style={{marginBottom:12}}><span className="t">Buteurs</span></div>
          {m.scorers.map((s, i) => (
            <div key={i} style={{padding:"8px 12px", borderBottom:"1px solid rgba(255,255,255,0.06)"}}>⚽ {s}</div>
          ))}
        </div>
      )}
      <FicheMatchSyncBtn match={m}/>

      <div style={{padding:"20px", display:"flex", gap:10}}>
        <button className="btn-cta ghost" style={{flex:1}} onClick={() => go("results")}>
          ← Saison
        </button>
        <button className="btn-cta" style={{flex:1}} onClick={() => go("share")}>
          ↗ Partager
        </button>
      </div>
    </div>
  );
}
// ─── Bouton sync match dans le cloud (#11) ───
function FicheMatchSyncBtn({ match }) {
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState('');
  const onSync = async () => {
    if (!window.cddSync || !window.cddSync.saveMatchToCloud) {
      setMsg('❌ Sync cloud non disponible');
      setTimeout(() => setMsg(''), 2500);
      return;
    }
    let M = null;
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('cdd_match_'));
      for (const k of keys) {
        const m = JSON.parse(localStorage.getItem(k) || 'null');
        if (m && (!M || (m.tSt && (!M.tSt || m.tSt > M.tSt)))) M = m;
      }
    } catch (e) {}
    if (!M) {
      setMsg('❌ Aucun match en mémoire à sauvegarder');
      setTimeout(() => setMsg(''), 2500);
      return;
    }
    setBusy(true);
    setMsg('Sauvegarde en cours…');
    try {
      const res = await window.cddSync.saveMatchToCloud(M);
      setMsg('✅ Match sauvé dans le cloud (' + res.matchId.slice(-6) + ')');
      setTimeout(() => setMsg(''), 3500);
    } catch (e) {
      setMsg('❌ ' + (e.message || 'Erreur'));
      setTimeout(() => setMsg(''), 4000);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div style={{padding:"0 20px 8px"}}>
      <button onClick={onSync} disabled={busy}
              style={{
                width:'100%', padding:'14px', borderRadius:12,
                background:'linear-gradient(135deg, #06b6d4, #0891b2)',
                color:'#fff', border:'none', fontWeight:800, fontSize:14,
                letterSpacing:'.04em', cursor:'pointer',
                opacity: busy ? 0.6 : 1,
                boxShadow:'0 4px 14px rgba(6,182,212,.35)'
              }}>
        {busy ? '⏳ Sauvegarde…' : '☁️ SAUVEGARDER CE MATCH DANS LE CLOUD'}
      </button>
      {msg && (
        <div style={{textAlign:'center', marginTop:8, fontSize:12,
                     color: msg.startsWith('✅') ? '#c8f169' : msg.startsWith('❌') ? '#ff8a8a' : 'rgba(255,255,255,.7)'}}>
          {msg}
        </div>
      )}
    </div>
  );
}

window.ScreenFicheMatch = ScreenFicheMatch;

window.App = App;

// Render. Listen for data rebuilds (real-data mode) to force refresh.
(function() {
  const root = ReactDOM.createRoot(document.getElementById("root"));
  function render() { root.render(<App/>); }
  window.addEventListener('cdd-data-rebuilt', render);
  render();
})();
