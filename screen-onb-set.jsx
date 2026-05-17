/* global React, CDD_CLUB */

/* ============================================================
   SCREEN — Onboarding
   ============================================================ */

function ScreenOnboarding({ go, tweaks }) {
  const [step, setStep] = useState(0);
  const [role, setRole] = useState(null);
  const [sport, setSport] = useState("foot");

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
            <button className="btn-cta" disabled={!role} onClick={next}>
              <span>CONTINUER</span><span className="arr">→</span>
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="onb-step">
            <div className="onb-k">CONFIG · 1 min</div>
            <h1 className="onb-title">Ton sport</h1>
            <div className="onb-sports">
              {[
                {id:"foot", l:"Football",  ic:"⚽", desc:"11v11 · 9v9 · 7v7"},
                {id:"futsal", l:"Futsal",  ic:"🏟️", desc:"5v5"},
                {id:"rugby", l:"Rugby",    ic:"🏉", desc:"15 · 13 · 7"},
              ].map(s => (
                <button key={s.id} className={`onb-sport ${sport===s.id?"on":""}`} onClick={()=>setSport(s.id)}>
                  <span className="onb-sport-ic">{s.ic}</span>
                  <span className="onb-sport-l">{s.l}</span>
                  <span className="onb-sport-d">{s.desc}</span>
                </button>
              ))}
            </div>
            <button className="btn-cta" onClick={() => go("home")}>
              <span>ENTRER DANS L'APP</span><span className="arr">→</span>
            </button>
          </div>
        )}

        <div className="onb-progress">
          {[0,1,2].map(i => (
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

  const accentOptions = [
    { id:"#c8f169", label:"Néon lime",  ink:"#062012" },
    { id:"#f5c451", label:"Or FUT",     ink:"#1f1404" },
    { id:"#06b6d4", label:"Cyan ice",   ink:"#022027" },
    { id:"#ef4444", label:"Rouge feu",  ink:"#fff" },
    { id:"#a78bfa", label:"Violet pro", ink:"#1a0f33" },
    { id:"#22c55e", label:"Vert pelouse",ink:"#04120a" },
  ];

  return (
    <div className="scr scr-set fade-in" data-screen-label="09 Settings">

      <div className="set-profile">
        <div className="set-avatar">
          <div className="set-avatar-i">FC</div>
          <div className="set-avatar-badge">COACH</div>
        </div>
        <div className="set-profile-info">
          <div className="set-profile-name">{club.coach}</div>
          <div className="set-profile-club">{club.name} · {club.team}</div>
          <div className="set-profile-since">Membre depuis Sept. 2024</div>
        </div>
        <button className="set-edit">✎</button>
      </div>

      <div className="set-sec">
        <div className="set-sec-k">COMPTE</div>
        <div className="set-rows">
          <SetRow ic="🏆" t="Mon club" d={club.name} go={()=>{}}/>
          <SetRow ic="👥" t="Mon équipe" d={`${club.team} · 18 joueurs`} go={()=>{}}/>
          <SetRow ic="🔐" t="Compte Google" d="flo***@gmail.com" go={()=>{}}/>
          <SetRow ic="📡" t="Synchronisation" d="Firestore · à jour" status="ok"/>
        </div>
      </div>

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
          <div className="theme-picker-inline">
            {accentOptions.map(c => (
              <button key={c.id}
                className={`theme-swatch ${tweaks.accent===c.id?"on":""}`}
                style={{"--sw": c.id}}
                onClick={() => setTweak("accent", c.id)}>
                <span className="theme-swatch-color"/>
                <span className="theme-swatch-label">{c.label}</span>
              </button>
            ))}
          </div>
          <SetRow ic="🌑" t="Thème sombre" d="Toujours" rightToggle on/>
          <SetRow ic="📱" t="Installer l'app" d="Ajouter à l'écran d'accueil"/>
        </div>
      </div>

      <div className="set-sec">
        <div className="set-sec-k">MATCH</div>
        <div className="set-rows">
          <SetRow ic="🔊" t="Sons" d="Sifflet, but, cartons" rightToggle on/>
          <SetRow ic="📳" t="Vibrations" d="À chaque action" rightToggle/>
          <SetRow ic="🕒" t="Demi-temps" d="Auto · 25 min"/>
          <SetRow ic="🟨" t="Sons cartons" d="Mode arbitre"/>
        </div>
      </div>

      <div className="set-sec">
        <div className="set-sec-k">DONNÉES</div>
        <div className="set-rows">
          <SetRow ic="☁️" t="Sauvegarde cloud" d="Quotidienne · 03h00"/>
          <SetRow ic="📤" t="Exporter saison" d="CSV · PDF"/>
          <SetRow ic="🗑️" t="Vider le cache" d="2.4 Mo libres"/>
        </div>
      </div>

      <div className="set-sec">
        <div className="set-sec-k">À PROPOS</div>
        <div className="set-rows">
          <SetRow ic="ⓘ" t="Version" d="v52 · Build 2026.05.17"/>
          <SetRow ic="❤️" t="Soutenir le projet" d="Don ponctuel"/>
          <SetRow ic="↩️" t="Déconnexion" d="" warn/>
        </div>
      </div>

      <div className="set-foot">
        Coach du Dimanche · L'app du foot amateur
      </div>
    </div>
  );
}

function SetRow({ ic, t, d, status, rightToggle, on, warn, go }) {
  return (
    <button className={`set-row ${warn?"warn":""}`} onClick={go}>
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

window.ScreenSettings = ScreenSettings;
