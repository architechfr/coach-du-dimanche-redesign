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
  const [showAdminPanel, setShowAdminPanel] = useState(false);
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
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const editProfile = () => setShowProfileEdit(true);

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

      {(() => {
        const coachName = (localStorage.getItem("cdd_coach_name") || "").trim();
        const userEmail = (localStorage.getItem("cdd_user_email") || "").trim();
        const initials = coachName
          ? coachName.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
          : (club.short || club.name || 'CO').slice(0, 2).toUpperCase();
        const displayName = coachName || `Coach ${club.name || ''}`.trim() || 'Coach';
        const roleLabel = window.CDD_ROLES?.roleLabel?.(role) || role.toUpperCase();
        return (
          <div className="set-profile">
            <div className="set-avatar">
              <div className="set-avatar-i">{initials}</div>
              <div className="set-avatar-badge">{roleLabel}</div>
            </div>
            <div className="set-profile-info">
              <div className="set-profile-name">{displayName}</div>
              <div className="set-profile-club">{club.name} · {club.team}</div>
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

      {showProfileEdit && (
        <ProfileEditModal
          initialName={localStorage.getItem("cdd_coach_name") || ""}
          initialEmail={localStorage.getItem("cdd_user_email") || ""}
          onClose={() => setShowProfileEdit(false)}
          onSave={({ name, email }) => {
            if (name)  localStorage.setItem('cdd_coach_name', name);
            else       localStorage.removeItem('cdd_coach_name');
            if (email) localStorage.setItem('cdd_user_email', email);
            else       localStorage.removeItem('cdd_user_email');
            // Patch live des globals pour effet immédiat
            window.dispatchEvent(new CustomEvent('cdd-data-rebuilt'));
            if (window.CDD_REBUILD) window.CDD_REBUILD();
            setRefresh(x => x + 1);
            setShowProfileEdit(false);
          }}/>
      )}

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
                    d={isOwner ? 'Owner (archi.tech.fr)' : 'Admin role'}
                    go={() => alert('Tu es ' + (isOwner ? 'OWNER' : 'ADMIN'))}/>
          </div>
        </div>
      )}

      {showAdminPanel && <AdminInventoryPanel onClose={() => setShowAdminPanel(false)}/>}

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

// ─── Upload du logo club (par club_id, partagé entre toutes les équipes du club) ───
// Un même club (FCMH) peut avoir plusieurs équipes (U15, U11) qui partagent le logo.
// Storage : cdd_club_logos = { [clubId]: dataURL } — keyé par club, pas par équipe.
function ClubLogoRow({ refresh }) {
  const activeClub = window.CDD?.getActiveClub?.() || null;
  const activeClubId = activeClub?.id || null;
  const activeClubName = activeClub?.name || (window.CDD_CLUB && window.CDD_CLUB.name) || 'Mon club';
  const currentLogo = (window.CDD_CLUB && window.CDD_CLUB.logoDataUrl) || null;
  const fileInputRef = React.useRef(null);

  const handleFile = (file) => {
    if (!file) return;
    if (file.size > 800 * 1024) {
      alert('Logo trop lourd (max 800 Ko). Redimensionne ton image et réessaie.');
      return;
    }
    if (!activeClubId) {
      alert('Aucun club actif détecté. Sélectionne un club avant d\'uploader son logo.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const dataUrl = reader.result;
        const all = JSON.parse(localStorage.getItem('cdd_club_logos') || '{}');
        all[activeClubId] = dataUrl;
        localStorage.setItem('cdd_club_logos', JSON.stringify(all));
        if (window.CDD_CLUB) window.CDD_CLUB.logoDataUrl = dataUrl;
        window.dispatchEvent(new CustomEvent('cdd-data-rebuilt'));
        if (window.CDD_REBUILD) window.CDD_REBUILD();
        if (refresh) refresh();
      } catch (e) { alert('Erreur enregistrement : ' + e.message); }
    };
    reader.readAsDataURL(file);
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
          💡 Image carrée recommandée · PNG/JPG · max 800 Ko
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
              Email (sera utilisé pour la sync cloud Phase 3)
            </span>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                   placeholder="ton.email@gmail.com"
                   style={{
                     width:'100%', padding:'12px 14px', borderRadius:10,
                     background:'rgba(255,255,255,0.06)',
                     border:`1px solid ${emailValid ? 'rgba(255,255,255,0.14)' : 'rgba(255,107,107,0.5)'}`,
                     color:'#fff', fontSize:15, outline:'none', boxSizing:'border-box',
                   }}/>
            {!emailValid && (
              <span style={{fontSize:11, color:'#ff8a8a'}}>
                ⚠ Format email invalide
              </span>
            )}
            <span style={{fontSize:10.5, color:'rgba(255,255,255,0.5)'}}>
              💡 Renseigne <code style={{color:'#c8f169'}}>archi.tech.fr@gmail.com</code> pour avoir le rôle Owner.
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
          <button onClick={() => emailValid && onSave({ name: name.trim(), email: email.trim() })}
                  disabled={!emailValid} style={{
            flex:2, padding:'12px', borderRadius:10,
            background: emailValid ? '#c8f169' : 'rgba(200,241,105,0.3)',
            color:'#0B1320', border:'none', cursor: emailValid ? 'pointer' : 'not-allowed',
            fontWeight:800, fontSize:13,
          }}>💾 Enregistrer</button>
        </div>
      </div>
    </div>
  );
}

window.ScreenSettings = ScreenSettings;
