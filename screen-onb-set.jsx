/* global React, CDD_CLUB */

/* ============================================================
   SCREEN — Onboarding
   ============================================================ */

function ScreenOnboarding({ go, tweaks }) {
  const [step, setStep] = useState(0);
  const [role, setRole] = useState(() => localStorage.getItem("cdd_user_role") || null);
  const [sport, setSport] = useState(() => localStorage.getItem("cdd_user_sport") || "foot");

  // Persist on change
  React.useEffect(() => { if (role) localStorage.setItem("cdd_user_role", role); }, [role]);
  React.useEffect(() => { if (sport) localStorage.setItem("cdd_user_sport", sport); }, [sport]);

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

  // ─── Gating par rôle (#12) ───────────────────────────────
  // Roles possibles : parent | joueur | coach | adjoint | dirigeant | ecole | admin
  const ADMIN_EMAIL = 'archi.tech.fr@gmail.com';
  const role = localStorage.getItem('cdd_user_role') || 'coach';
  const userEmail = localStorage.getItem('cdd_user_email') || '';
  const isOwner   = userEmail.toLowerCase() === ADMIN_EMAIL;
  const isAdmin   = role === 'admin' || isOwner;
  const isCoach   = isAdmin || ['coach', 'adjoint', 'dirigeant', 'ecole'].includes(role);
  const isParent  = role === 'parent' || role === 'joueur';

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
    if (!confirm("Se déconnecter ?")) return;
    localStorage.removeItem("cdd_user_role");
    localStorage.removeItem("cdd_user_sport");
    go("onb");
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
  const editProfile = () => {
    const name = prompt("Ton nom :", club.coach || "");
    if (!name) return;
    localStorage.setItem("cdd_coach_name", name);
    alert("Nom enregistré. Recharge pour voir.");
  };

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
          <div className="set-profile-name">{localStorage.getItem("cdd_coach_name") || club.coach}</div>
          <div className="set-profile-club">{club.name} · {club.team}</div>
          <div className="set-profile-since">Membre depuis Sept. 2024</div>
        </div>
        <button className="set-edit" onClick={editProfile}>✎</button>
      </div>

      <div className="set-sec">
        <div className="set-sec-k">COMPTE</div>
        <div className="set-rows">
          <SetRow ic="🏆" t="Mon club" d={club.name} go={() => isCoach ? go("sync") : alert('Réservé au coach')}/>
          <SetRow ic="👥" t={isParent ? 'Équipe' : 'Mon équipe'} d={`${club.team} · 18 joueurs`} go={() => go("effectif")}/>
          <SetRow ic="🔐" t="Compte Google" d={userEmail || 'Non connecté'} go={() => alert("Auth Google — disponible Sprint 7")}/>
          {isCoach && (
            <SetRow ic="📡" t="Synchronisation" d="Firestore · à jour" status="ok" go={() => go("sync")}/>
          )}
          <SetRow ic="🪪" t="Mon rôle" d={role + (isOwner ? ' (Owner)' : '')}
                  go={() => {
                    const choice = prompt('Changer de rôle ? Options : parent, joueur, coach, adjoint, dirigeant, ecole, admin', role);
                    if (choice && choice !== role) {
                      localStorage.setItem('cdd_user_role', choice.trim());
                      window.dispatchEvent(new Event('cdd-auth-changed'));
                      alert('Rôle changé en ' + choice + '. Recharge si nécessaire.');
                    }
                  }}/>
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
          <SetRow ic="🌑" t="Thème sombre" d={dark ? "Activé" : "Désactivé"} rightToggle on={dark} onToggle={() => setToggle("dark", !dark)}/>
          <SetRow ic="📱" t="Installer l'app" d="Ajouter à l'écran d'accueil" go={installApp}/>
        </div>
      </div>

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
            <SetRow ic="☁️" t="Sauvegarde cloud" d="Disponible avec auth Google (V2.x)" go={() => alert("Sync cloud — Sprint 7 (auth Google)")}/>
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
                    d={isOwner ? 'Owner (archi.tech.fr)' : 'Admin role'}
                    go={() => alert('Tu es ' + (isOwner ? 'OWNER' : 'ADMIN'))}/>
          </div>
        </div>
      )}

      <div className="set-sec">
        <div className="set-sec-k">À PROPOS</div>
        <div className="set-rows">
          <SetRow ic="ⓘ" t="Version" d="v44 · Build 2026.05.18" go={() => alert("Coach du Dimanche V2 redesign\nBuild 2026.05.18\nMode dev")}/>
          <SetRow ic="❤️" t="Soutenir le projet" d="Don ponctuel" go={() => window.open("https://github.com/architechfr/coach-du-dimanche-redesign", "_blank")}/>
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

window.ScreenSettings = ScreenSettings;
