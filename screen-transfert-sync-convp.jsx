/* global React, CDD_CLUB, CDD_PLAYERS */

/* ============================================================
   SCREEN — Transfert d'équipe entre coachs
   ============================================================ */

function ScreenTransfert({ go, tweaks }) {
  const [step, setStep] = useState(1);
  const [selectedTeams, setSelectedTeams] = useState({ "u15-d2": true, "u13-d2": false });
  const code = "K4M-7XR-9PQ";

  const toggle = (id) => setSelectedTeams(s => ({...s, [id]: !s[id]}));
  const teams = [
    { id:"u15-d2",   club:"FCMH",  name:"U15 D2",     n:18 },
    { id:"u13-d2",   club:"FCMH",  name:"U13 D2",     n:14 },
    { id:"vet-usdf", club:"USDF",      name:"Vétérans",   n:22 },
  ];

  return (
    <div className="scr scr-transfert fade-in" data-screen-label="14 Transfert">

      <div className="tr-hero">
        <div className="tr-hero-bg"/>
        <div className="tr-hero-grad"/>
        <div className="tr-hero-in">
          <div className="tr-hero-k">TRANSFERT DE PARAMÉTRAGE</div>
          <div className="tr-hero-title">Donne une équipe<br/>à un autre coach</div>
          <div className="tr-hero-sub">Effectif, photos, FFF, formation · validité 7 jours</div>
        </div>
      </div>

      <div className="tr-steps">
        {["Choisir", "Code", "Partager"].map((s,i) => (
          <div key={i} className={`tr-step ${step > i ? "done" : ""} ${step === i+1 ? "on" : ""}`}>
            <span className="tr-step-n">{i+1}</span>
            <span className="tr-step-l">{s}</span>
          </div>
        ))}
      </div>

      {step === 1 && (
        <>
          <div className="sec-h"><span className="t">Quelles équipes transférer ?</span></div>
          <div className="tr-teams">
            {teams.map(t => (
              <button key={t.id}
                className={`tr-team ${selectedTeams[t.id] ? "on" : ""}`}
                onClick={() => toggle(t.id)}>
                <div className="tr-team-club">{t.club}</div>
                <div className="tr-team-name">{t.name}</div>
                <div className="tr-team-n"><b>{t.n}</b> joueurs</div>
                <div className="tr-team-check">{selectedTeams[t.id] ? "✓" : ""}</div>
              </button>
            ))}
          </div>
          <div className="tr-cta">
            <button className="btn-cta" disabled={!Object.values(selectedTeams).some(v=>v)}
              onClick={() => setStep(2)}>
              <span>GÉNÉRER LE CODE</span><span className="arr">→</span>
            </button>
          </div>
        </>
      )}

      {step === 2 && (
        <div className="tr-code-screen">
          <div className="tr-code-k">CODE DE TRANSFERT · 8 CARACTÈRES</div>
          <div className="tr-code">
            {code.split("").map((c,i) => (
              <span key={i} className={c === "-" ? "tr-code-sep" : "tr-code-c"}>{c}</span>
            ))}
          </div>
          <div className="tr-code-meta">
            <span>🕓 Expire dans 7 jours</span>
            <span className="sep">·</span>
            <span>📦 {Object.values(selectedTeams).filter(v=>v).length} équipe(s)</span>
          </div>

          <div className="tr-qr" style={{display:'flex', justifyContent:'center', padding:'12px 0'}}>
            {window.QRCode ? (
              <window.QRCode
                value={(typeof transferUrl !== 'undefined' && transferUrl)
                       || `${window.location.origin}/?transfer=${encodeURIComponent(JSON.stringify(Object.keys(selectedTeams).filter(k => selectedTeams[k])))}`}
                size={200}/>
            ) : (
              <div style={{width:200, height:200, background:'#fff', display:'flex',
                            alignItems:'center', justifyContent:'center', color:'#888',
                            fontSize:11, borderRadius:6}}>Chargement QR…</div>
            )}
          </div>

          <div className="tr-cta">
            <button className="btn-cta" onClick={() => setStep(3)}>
              <span>PARTAGER LE LIEN</span><span className="arr">→</span>
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="tr-share-screen">
          <div className="sec-h"><span className="t">Partager via</span></div>
          <div className="tr-share-grid">
            {[
              { ic:"💬", l:"WhatsApp",  c:"#25d366" },
              { ic:"✉️", l:"Email",     c:"#3b82f6" },
              { ic:"💌", l:"SMS",       c:"#a78bfa" },
              { ic:"📋", l:"Copier",    c:"#6b7280" },
              { ic:"📤", l:"Plus...",   c:"#9ca3af" },
              { ic:"🔗", l:"Lien",      c:"#06b6d4" },
            ].map((s,i) => {
              const url = `https://coach-du-dimanche-redesign.vercel.app/?import=${code}`;
              const msg = `Rejoins mon équipe sur Coach du Dimanche ! Code: ${code}`;
              const handlers = {
                "WhatsApp": () => window.open(`https://wa.me/?text=${encodeURIComponent(msg + " · " + url)}`, "_blank"),
                "Email":    () => window.location.href = `mailto:?subject=${encodeURIComponent("Invitation Coach du Dimanche")}&body=${encodeURIComponent(msg + "\n\n" + url)}`,
                "SMS":      () => window.location.href = `sms:?body=${encodeURIComponent(msg + " · " + url)}`,
                "Copier":   async () => { try { await navigator.clipboard.writeText(url); alert("Lien copié !"); } catch(e) { prompt("Copie ce lien :", url); } },
                "Plus...":  async () => { try { await navigator.share({ title:"Coach du Dimanche", text:msg, url }); } catch(e) { /* user cancel */ } },
                "Lien":     async () => { try { await navigator.clipboard.writeText(url); alert("Lien copié !"); } catch(e) { prompt("Copie ce lien :", url); } },
              };
              return (
                <button key={i} className="tr-share-btn" onClick={handlers[s.l] || (()=>{})}>
                  <span className="tr-share-ic" style={{background:s.c}}>{s.ic}</span>
                  <span className="tr-share-l">{s.l}</span>
                </button>
              );
            })}
          </div>

          <div className="tr-share-link">
            <div className="tr-share-link-k">Lien direct</div>
            <div className="tr-share-link-v mono">coach-du-dimanche.app/?import={code}</div>
          </div>

          <div className="tr-cta">
            <button className="btn-cta ghost" onClick={() => { setStep(1); go("home"); }}>
              ← Terminer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

window.ScreenTransfert = ScreenTransfert;


/* ============================================================
   SCREEN — Sync cloud & multi-club
   ============================================================ */

function ScreenSyncCloud({ go, tweaks }) {
  // ── Modèle : clubs[] avec leurs teams[] imbriquées.
  // Source de vérité : arb_clubs (liste des clubs) + arb_teams (équipes liées par clubId).
  // L'écran est cloisonné : on n'affiche QUE les équipes du club du tab actif.
  // Tab actif = club actif (arb_current_club + cdd_active_context.clubId).
  const buildClubsWithTeams = () => {
    try {
      const allClubs = JSON.parse(localStorage.getItem('arb_clubs') || '[]');
      const allTeams = JSON.parse(localStorage.getItem('arb_teams') || '[]');
      const logos    = JSON.parse(localStorage.getItem('cdd_club_logos') || '{}');
      return allClubs.map(c => ({
        id: c.id,
        name: c.name || 'Club',
        primaryColor: c.primaryColor || c.color || '#c8f169',
        logoDataUrl: logos[c.id] || null,
        createdAt: c.createdAt || null,
        createdBy: c.createdBy || null,
        teams: allTeams
          .filter(t => t.clubId === c.id)
          .map(t => ({
            id: t.id,
            name: t.name || t.category || 'Équipe',
            players: (t.players || []).length || t.playersCount || 0,
            createdAt: t.createdAt || null,
          })),
      }));
    } catch (e) { return []; }
  };
  const clubs = buildClubsWithTeams();

  // Contexte actuel (club actif + équipe active)
  const activeCtx = (() => {
    try { return JSON.parse(localStorage.getItem('cdd_active_context') || '{}'); }
    catch (e) { return {}; }
  })();
  const currentClubId = activeCtx.clubId || localStorage.getItem('arb_current_club') || clubs[0]?.id || '';
  const currentTeamId = activeCtx.teamId || '';

  // Le tab visible suit le club actif. On force un re-render via state pour que les
  // clics de switch déclenchent immédiatement le rafraîchissement de l'UI.
  const [activeClubId, setActiveClubId] = useState(currentClubId);
  const [activeTeamId, setActiveTeamId] = useState(currentTeamId);

  // Switch de club : écrit arb_current_club + cdd_active_context.clubId, et
  // sélectionne la 1ère équipe du club par défaut. Dispatch l'événement écouté
  // par data-bridge pour rebuild CDD_PLAYERS / CDD_NEXT_MATCH / etc.
  const switchClub = (clubId) => {
    if (!clubId || clubId === activeClubId) return;
    const club = clubs.find(c => c.id === clubId);
    const firstTeamId = club?.teams[0]?.id || null;
    try {
      localStorage.setItem('arb_current_club', clubId);
      const ctx = { ...activeCtx, clubId, teamId: firstTeamId, matchId: null };
      localStorage.setItem('cdd_active_context', JSON.stringify(ctx));
    } catch (e) {}
    setActiveClubId(clubId);
    setActiveTeamId(firstTeamId);
    try { window.dispatchEvent(new CustomEvent('cdd-active-club-changed', { detail: { clubId } })); } catch (e) {}
    try { window.dispatchEvent(new CustomEvent('cdd-active-team-changed', { detail: { teamId: firstTeamId } })); } catch (e) {}
    if (window.CDD_REBUILD) window.CDD_REBUILD();
  };

  const switchTeam = (teamId) => {
    if (!teamId || teamId === activeTeamId) return;
    try {
      const ctx = { ...activeCtx, clubId: activeClubId, teamId, matchId: null };
      localStorage.setItem('cdd_active_context', JSON.stringify(ctx));
    } catch (e) {}
    setActiveTeamId(teamId);
    try { window.dispatchEvent(new CustomEvent('cdd-active-team-changed', { detail: { teamId } })); } catch (e) {}
    if (window.CDD_REBUILD) window.CDD_REBUILD();
  };

  const activeClub = clubs.find(c => c.id === activeClubId) || clubs[0] || null;

  // Audit helper : journalise dans cdd_audit_log (visible par la vue admin).
  const audit = (kind, target) => {
    try {
      const by = localStorage.getItem('cdd_user_email')
              || localStorage.getItem('cdd_coach_name')
              || 'anonyme';
      const log = JSON.parse(localStorage.getItem('cdd_audit_log') || '[]');
      log.unshift({ ts: Date.now(), kind, by, target });
      localStorage.setItem('cdd_audit_log', JSON.stringify(log.slice(0, 200)));
    } catch (e) {}
  };

  // Création d'un VRAI nouveau club (push dans arb_clubs). On switch dessus
  // immédiatement pour que le tab actif devienne le nouveau club.
  const addNewClub = () => {
    const name = prompt('Nom du club (ex: FCMH, USDF, AS POISSY) :');
    if (!name) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      const existing = JSON.parse(localStorage.getItem('arb_clubs') || '[]');
      const newClub = {
        id: 'club_' + Date.now(),
        name: trimmed,
        primaryColor: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
        secondaryColor: '#0a0e14',
        createdAt: Date.now(),
        createdBy: localStorage.getItem('cdd_user_email') || localStorage.getItem('cdd_coach_name') || 'anonyme',
      };
      existing.push(newClub);
      localStorage.setItem('arb_clubs', JSON.stringify(existing));
      audit('club-created', trimmed);
      switchClub(newClub.id);
      alert(`Club "${trimmed}" créé. Ajoute maintenant une équipe à ce club.`);
    } catch (e) { alert('Erreur sauvegarde club : ' + e.message); }
  };

  // Création d'une VRAIE équipe DANS le club fourni (push dans arb_teams avec clubId).
  // Plus de confusion entre arb_clubs et arb_teams.
  const addNewTeam = (club) => {
    if (!club) return;
    const name = prompt(`Catégorie / nom de l'équipe pour ${club.name} (ex: U15 D2, Vétérans, Seniors B) :`, 'U15 D2');
    if (!name) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      const existing = JSON.parse(localStorage.getItem('arb_teams') || '[]');
      const newTeam = {
        id: 'team_' + Date.now(),
        clubId: club.id,
        name: trimmed,
        category: trimmed,
        players: [],
        lineupTemplate: null,
        createdAt: Date.now(),
        createdBy: localStorage.getItem('cdd_user_email') || localStorage.getItem('cdd_coach_name') || 'anonyme',
      };
      existing.push(newTeam);
      localStorage.setItem('arb_teams', JSON.stringify(existing));
      audit('team-created', `${club.name} · ${trimmed}`);
      // Cible cette équipe comme active dans le club courant
      switchTeam(newTeam.id);
      alert(`Équipe "${trimmed}" ajoutée à ${club.name}. Va dans Effectif pour ajouter des joueurs.`);
    } catch (e) { alert('Erreur sauvegarde équipe : ' + e.message); }
  };

  // Activité récente : on combine plusieurs sources locales pour afficher
  // un journal HONNÊTE de ce qui s'est vraiment passé (au lieu d'un mock).
  // 1. cdd_audit_log : créations / suppressions tracées explicitement
  // 2. cdd_match_* : matchs joués et terminés
  // Tout est trié par date desc, max 10 affiché.
  const activityEntries = (() => {
    const out = [];
    const fmtTime = (ts) => {
      if (!ts) return '';
      const diff = Date.now() - ts;
      if (diff < 60000) return 'à l\'instant';
      if (diff < 3600000) return `il y a ${Math.floor(diff/60000)} min`;
      if (diff < 86400000) return `il y a ${Math.floor(diff/3600000)} h`;
      const d = new Date(ts);
      return d.toLocaleDateString('fr-FR', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
    };
    // Source 1 : audit log explicite
    try {
      const log = JSON.parse(localStorage.getItem('cdd_audit_log') || '[]');
      log.forEach(a => {
        if (!a || !a.ts) return;
        out.push({
          ts: a.ts, t: fmtTime(a.ts),
          k: 'LOCAL', ic: '✚',
          l: a.kind === 'team-created' ? `Équipe créée : ${a.target}` :
             a.kind === 'team-deleted' ? `Équipe supprimée : ${a.target}` :
             `${a.kind} · ${a.target || ''}`,
          by: a.by || null,
        });
      });
    } catch (e) {}
    // Source 2 : matchs arbitrés (cdd_match_*)
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith('cdd_match_') || k === 'cdd_match_current' || k === 'cdd_match_last_finished') continue;
        const m = JSON.parse(localStorage.getItem(k) || 'null');
        if (!m) continue;
        if (m.endedAt) {
          out.push({
            ts: m.endedAt, t: fmtTime(m.endedAt),
            k: 'MATCH', ic: '⚽',
            l: `Match terminé · ${m.tA?.n || '?'} ${m.sA||0}–${m.sB||0} ${m.tB?.n || '?'}`,
          });
        } else if (m.startedAt) {
          out.push({
            ts: m.startedAt, t: fmtTime(m.startedAt),
            k: 'MATCH', ic: '🟢',
            l: `Match lancé · ${m.tA?.n || '?'} vs ${m.tB?.n || '?'}`,
          });
        }
      }
    } catch (e) {}
    // Source 3 : derniers carnets envoyés au parent (commit #64)
    try {
      const shared = JSON.parse(localStorage.getItem('cdd_carnet_shared') || '{}');
      Object.entries(shared).forEach(([pid, info]) => {
        if (!info?.sharedAt) return;
        out.push({
          ts: info.sharedAt, t: fmtTime(info.sharedAt),
          k: 'CARNET', ic: '🎴',
          l: `Carnet envoyé au parent (joueur ${pid.slice(-6)})`,
        });
      });
    } catch (e) {}
    // Tri desc + dedup grossier
    return out.sort((a, b) => b.ts - a.ts);
  })();

  return (
    <div className="scr scr-sync fade-in" data-screen-label="15 Sync Cloud">

      <div className="sync-hero">
        <div className="sync-hero-bg"/>
        <div className="sync-hero-grad"/>
        <div className="sync-hero-in">
          <div className="sync-hero-k">SYNC CLOUD · MULTI-CLUB</div>
          <div className="sync-hero-title">Tes données suivent<br/>tous tes appareils</div>
          {/* Statut HONNÊTE de la sync (basé sur window.cddSync.ready, pas un mock). */}
          {(() => {
            const ready = !!(window.cddSync && window.cddSync.ready);
            const lastActivity = activityEntries[0];
            const lastTxt = lastActivity ? `dernière action ${lastActivity.t}` : 'aucune action encore';
            return (
              <div className="sync-status" style={ready ? {} : { opacity: 0.7 }}>
                <div className="sync-pulse" style={!ready ? {
                  background:'#fbbf24', boxShadow:'0 0 8px rgba(251,191,36,0.6)'
                } : {}}/>
                <span>
                  {ready ? 'Connecté Firebase' : 'Mode local (Firebase non connecté)'} · {lastTxt}
                </span>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Bloc compte : honnête sur l'état d'identité actuel.
          Pas d'auth réelle encore → on est "coach owner local" par défaut
          (forcément, puisque c'est ton appareil qui a créé les données).
          Quand Phase 3 (Auth) sera là, ce bloc affichera le vrai compte. */}
      {(() => {
        const coachName = (localStorage.getItem('cdd_coach_name') || '').trim();
        const userEmail = (localStorage.getItem('cdd_user_email') || '').trim();
        const role = window.CDD_ROLES?.currentRole?.() || (localStorage.getItem('cdd_user_role') || 'coach');
        const roleLabel = window.CDD_ROLES?.roleLabel?.(role) || role;
        const displayName = coachName || `Coach owner ${(clubs[0]?.name || '').toUpperCase()}`.trim() || 'Coach owner';
        const initials = (coachName
          ? coachName.split(/\s+/).map(w => w[0]).join('').slice(0, 2)
          : (clubs[0]?.name || 'CO').slice(0, 2)).toUpperCase();
        const maskedEmail = userEmail ? userEmail.replace(/^(.{3}).*(@.+)$/, '$1***$2') : null;
        const isFullyConfigured = !!(coachName && userEmail);
        return (
          <div className="sync-account">
            <div className="sync-acc-avatar">{initials}</div>
            <div className="sync-acc-info">
              <b>{displayName}</b>
              <em>{maskedEmail || 'Mode local · auth à venir (Phase 3)'}</em>
              <span className="sync-acc-chip" style={!isFullyConfigured ? {
                background:'rgba(200,241,105,0.15)', color:'#c8f169', border:'1px solid rgba(200,241,105,0.35)'
              } : {}}>
                {roleLabel} · {isFullyConfigured ? 'profil complet' : 'profil à compléter'}
              </span>
            </div>
            <button className="sync-acc-sync"
                    title={isFullyConfigured ? 'Compte complet' : 'Aller dans Réglages pour compléter ton profil'}
                    onClick={() => {
                      if (!isFullyConfigured) {
                        if (confirm('Ton profil coach est incomplet. Aller dans Réglages pour le compléter ?')) {
                          go('set');
                        }
                      } else {
                        alert("Auth Google + sync compte : prévu Phase 3 (Stripe + Firebase Auth).\nAujourd'hui : sync anonyme via Firestore.");
                      }
                    }}>
              {isFullyConfigured ? '↻' : '✎'}
            </button>
          </div>
        );
      })()}

      <div className="sec-h">
        <span className="t">Mes clubs</span>
        <span className="a">{clubs.length} actif{clubs.length > 1 ? 's' : ''}</span>
      </div>

      {clubs.length === 0 ? (
        <div style={{
          margin:'0 14px 12px', padding:'24px 18px', borderRadius:12,
          background:'rgba(200,241,105,0.06)', border:'1px dashed rgba(200,241,105,0.30)',
          textAlign:'center',
        }}>
          <div style={{fontSize:32, marginBottom:8}}>⚽</div>
          <div style={{fontWeight:800, marginBottom:6}}>Aucun club pour l'instant</div>
          <div style={{fontSize:12, opacity:0.7, marginBottom:14}}>
            Crée ton premier club pour démarrer.<br/>
            Une équipe vit toujours à l'intérieur d'un club.
          </div>
          <button className="btn-cta" onClick={() => addNewClub()}>+ Créer un club</button>
        </div>
      ) : (
        <>
          {/* Tabs : un par club. Tab actif = club actif (synchro arb_current_club). */}
          <div style={{
            display:'flex', gap:6, padding:'0 14px 10px', overflowX:'auto',
            scrollbarWidth:'none', WebkitOverflowScrolling:'touch',
          }}>
            {clubs.map(c => {
              const on = c.id === activeClubId;
              const initial = (c.name[0] || '?').toUpperCase();
              return (
                <button key={c.id} onClick={() => switchClub(c.id)} style={{
                  flexShrink:0, padding:'8px 14px', borderRadius:10,
                  background: on ? c.primaryColor : 'rgba(255,255,255,0.05)',
                  color:    on ? '#0a0e14' : '#fff',
                  border:   on ? `1px solid ${c.primaryColor}` : '1px solid rgba(255,255,255,0.10)',
                  fontWeight: on ? 900 : 600, fontSize:13, fontFamily:'inherit',
                  cursor:'pointer', display:'flex', alignItems:'center', gap:8,
                  boxShadow: on ? `0 0 12px ${c.primaryColor}55` : 'none',
                }}>
                  {c.logoDataUrl
                    ? <img src={c.logoDataUrl} alt={c.name} style={{width:20, height:20, borderRadius:5, objectFit:'cover'}}/>
                    : <span style={{
                        width:20, height:20, borderRadius:5, display:'inline-flex',
                        alignItems:'center', justifyContent:'center',
                        background: on ? 'rgba(10,14,20,0.20)' : c.primaryColor,
                        color: on ? c.primaryColor : '#0a0e14',
                        fontWeight:900, fontSize:11,
                      }}>{initial}</span>}
                  <span>{c.name}</span>
                </button>
              );
            })}
            <button onClick={() => addNewClub()} style={{
              flexShrink:0, padding:'8px 12px', borderRadius:10,
              background:'transparent', border:'1px dashed rgba(255,255,255,0.25)',
              color:'rgba(255,255,255,0.7)', fontWeight:700, fontSize:13, fontFamily:'inherit',
              cursor:'pointer',
            }}>+ Club</button>
          </div>

          {/* Tab actif : section logo + section équipes du club. */}
          {activeClub && (
            <div style={{margin:'0 14px 8px', padding:'14px 14px 12px', borderRadius:12,
                         background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)'}}>

              {/* Identité du club + raccourci personnalisation */}
              <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:14}}>
                {activeClub.logoDataUrl
                  ? <img src={activeClub.logoDataUrl} alt={activeClub.name}
                         style={{width:48, height:48, borderRadius:10, objectFit:'cover',
                                 border:`2px solid ${activeClub.primaryColor}`}}/>
                  : <div style={{
                      width:48, height:48, borderRadius:10,
                      background: activeClub.primaryColor, color:'#0a0e14',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontWeight:900, fontSize:20,
                    }}>{(activeClub.name[0] || '?').toUpperCase()}</div>}
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontWeight:900, fontSize:16}}>{activeClub.name}</div>
                  <div style={{fontSize:11, opacity:0.6, marginTop:2}}>
                    {activeClub.teams.length} équipe{activeClub.teams.length > 1 ? 's' : ''}
                    {activeClub.logoDataUrl ? ' · logo configuré' : ' · sans logo'}
                  </div>
                </div>
                <button onClick={() => go('set')} title="Personnaliser ce club (Réglages)"
                        style={{
                          padding:'8px 12px', borderRadius:8,
                          background:'rgba(200,241,105,0.10)', border:'1px solid rgba(200,241,105,0.35)',
                          color:'#c8f169', fontWeight:800, fontSize:12, fontFamily:'inherit',
                          cursor:'pointer', whiteSpace:'nowrap',
                        }}>🎨 Personnaliser</button>
              </div>

              {/* Liste des équipes du club actif */}
              <div style={{fontSize:11, fontWeight:800, opacity:0.55,
                           letterSpacing:'.06em', marginBottom:8}}>
                ÉQUIPES DE {activeClub.name.toUpperCase()}
              </div>
              <div style={{display:'flex', flexDirection:'column', gap:6}}>
                {activeClub.teams.length === 0 ? (
                  <div style={{padding:'14px 12px', borderRadius:8,
                               background:'rgba(255,255,255,0.02)',
                               border:'1px dashed rgba(255,255,255,0.10)',
                               textAlign:'center', fontSize:12, opacity:0.6}}>
                    Aucune équipe dans ce club. Ajoute-en une ci-dessous.
                  </div>
                ) : activeClub.teams.map(t => {
                  const on = t.id === activeTeamId;
                  return (
                    <button key={t.id} onClick={() => switchTeam(t.id)} style={{
                      padding:'10px 12px', borderRadius:8, textAlign:'left',
                      background: on ? 'rgba(200,241,105,0.10)' : 'rgba(255,255,255,0.02)',
                      border: on ? '1px solid rgba(200,241,105,0.45)' : '1px solid rgba(255,255,255,0.06)',
                      color:'#fff', fontFamily:'inherit', cursor:'pointer',
                      display:'flex', alignItems:'center', gap:10,
                    }}>
                      <div style={{flex:1, minWidth:0}}>
                        <b style={{fontSize:14}}>{t.name}</b>
                        <em style={{display:'block', fontSize:11, opacity:0.6, fontStyle:'normal', marginTop:2}}>
                          {t.players} joueur{t.players > 1 ? 's' : ''}
                        </em>
                      </div>
                      {on ? (
                        <span style={{
                          padding:'4px 10px', borderRadius:6, fontSize:10, fontWeight:900,
                          background:'#c8f169', color:'#0a0e14',
                        }}>ACTIVE</span>
                      ) : (
                        <span style={{opacity:0.5, fontSize:18}}>›</span>
                      )}
                    </button>
                  );
                })}
                <button onClick={() => addNewTeam(activeClub)} style={{
                  padding:'10px 12px', borderRadius:8,
                  background:'transparent', border:'1px dashed rgba(255,255,255,0.20)',
                  color:'rgba(255,255,255,0.65)', fontWeight:700, fontSize:13,
                  fontFamily:'inherit', cursor:'pointer', textAlign:'left',
                }}>+ Équipe à {activeClub.name}</button>
              </div>
            </div>
          )}
        </>
      )}

      <div className="sec-h">
        <span className="t">Activité récente</span>
        <span className="a">{activityEntries.length} action{activityEntries.length > 1 ? 's' : ''}</span>
      </div>
      <div className="sync-activity">
        {activityEntries.length === 0 ? (
          <div style={{
            padding:'18px 14px', borderRadius:10,
            background:'rgba(255,255,255,0.03)', border:'1px dashed rgba(255,255,255,0.10)',
            textAlign:'center', fontSize:12, color:'rgba(255,255,255,0.55)',
          }}>
            Aucune action enregistrée encore.<br/>
            <span style={{fontSize:10, opacity:0.7}}>Les créations d'équipe, modifs de statut et matchs joués apparaîtront ici.</span>
          </div>
        ) : activityEntries.slice(0, 10).map((a, i) => (
          <div className="sync-evt" key={i}>
            <span className={`sync-evt-ic sync-evt-${a.k.toLowerCase()}`}>{a.ic}</span>
            <div className="sync-evt-body">
              <b>{a.l}</b>
              <em>{a.k} · {a.t}{a.by ? ' · ' + a.by : ''}</em>
            </div>
          </div>
        ))}
      </div>

      <div className="sync-actions">
        <button className="btn-cta" onClick={() => alert("Sync cloud Firestore — disponible avec l'auth Google (V2.x)")}>↻ FORCER UNE SYNC</button>
        <button className="btn-cta ghost" onClick={() => alert("Pull cloud — disponible avec l'auth Google (V2.x)")}>↧ Pull depuis cloud</button>
      </div>
    </div>
  );
}

window.ScreenSyncCloud = ScreenSyncCloud;


/* ============================================================
   SCREEN — Onboarding duo (refonte avec mode coach+arbitre)
   Already exists as ScreenOnboarding, expose enhanced version
   ============================================================ */


/* ============================================================
   SCREEN — Convocation parent (page reçue par les parents)
   ============================================================ */

function ScreenConvoParent({ go, tweaks }) {
  const [resp, setResp] = useState(null);
  const next = window.CDD_NEXT_MATCH || { date: 'À venir', venue: '?', away: 'À déterminer' };

  // Player ciblé via URL ?p=PLAYER_ID (lien parent), fallback premier joueur de l'effectif.
  const players = window.CDD_PLAYERS || [];
  const playerIdFromUrl = (() => {
    try {
      const fromSearch = new URLSearchParams(window.location.search).get('p');
      if (fromSearch) return fromSearch;
      const hash = window.location.hash || '';
      const q = hash.split('?')[1];
      if (q) return new URLSearchParams(q).get('p');
    } catch (e) {}
    return null;
  })();
  const me = (playerIdFromUrl && players.find(p => p.id === playerIdFromUrl))
          || players[0]
          || { first: 'Joueur', last: '', pos: '', num: '' };

  const myShort  = (window.CDD_CLUB?.short) || (window.CDD_CLUB?.name) || 'Mon équipe';
  const teamCat  = (window.CDD?.getActiveTeam?.()?.name)
                || (window.CDD?.getActiveTeam?.()?.category) || '';
  const oppShort = (next.away && next.away !== 'À déterminer') ? next.away : 'À venir';
  const meInit   = (myShort[0]  || '?').toUpperCase();
  const themInit = (oppShort[0] || '?').toUpperCase();
  const coachName = localStorage.getItem('cdd_coach_name') || 'Coach';
  const coachInit = coachName.split(/\s+/).map(w => w[0]).join('').slice(0,2).toUpperCase() || 'C';

  if (resp) {
    return (
      <div className="scr scr-cvp fade-in" data-screen-label="16 Convocation parent — répondu">
        <div className={`cvp-success cvp-success-${resp}`}>
          <div className="cvp-success-ic">
            {resp === "yes" ? "✓" : resp === "no" ? "✕" : "?"}
          </div>
          <div className="cvp-success-t">
            {resp === "yes" ? "Présence confirmée !" : resp === "no" ? "Absence enregistrée" : "Réponse incertaine"}
          </div>
          <div className="cvp-success-d">
            Ton coach a été notifié. Tu peux modifier ta réponse jusqu'au coup d'envoi.
          </div>
          <div className="cvp-success-card">
            <div className="cvp-success-card-k">RÉCAP MATCH</div>
            <div className="cvp-success-card-vs">
              <b>{myShort}</b><i>VS</i><b>{oppShort}</b>
            </div>
            <div className="cvp-success-card-meta">
              <span>📅 {next.date}</span>
              <span>🏟️ {next.venue}</span>
            </div>
          </div>
          <button className="btn-cta ghost" onClick={() => setResp(null)}>← Modifier ma réponse</button>
        </div>
      </div>
    );
  }

  return (
    <div className="scr scr-cvp fade-in" data-screen-label="16 Convocation parent">

      <div className="cvp-hero">
        <div className="cvp-hero-bg"/>
        <div className="cvp-hero-grad"/>
        <div className="cvp-hero-in">
          <div className="cvp-hero-k">
            CONVOCATION · {myShort}{teamCat ? ` ${teamCat}` : ''}
          </div>
          <div className="cvp-hero-title">
            <span className="cvp-hero-name">{me.first}</span><br/>
            est convoqué
          </div>
          <div className="cvp-hero-pos">
            {(typeof POSITION_LABEL !== 'undefined' && POSITION_LABEL[me.pos]) || me.pos}
            {me.num ? ` · #${me.num}` : ''}
          </div>
        </div>
      </div>

      <div className="cvp-match">
        <div className="cvp-match-k">MATCH</div>
        <div className="cvp-match-vs">
          <div className="cvp-match-team">
            <div className="cvp-match-badge me">{meInit}</div>
            <span>{myShort}</span>
          </div>
          <div className="cvp-match-vs-l">VS</div>
          <div className="cvp-match-team">
            <div className="cvp-match-badge them">{themInit}</div>
            <span>{oppShort}</span>
          </div>
        </div>
        <div className="cvp-match-info">
          <div><em>QUAND</em><b>{next.date}</b></div>
          <div><em>OÙ</em><b>{next.venue}</b></div>
        </div>
      </div>

      {/* MOT DU COACH : à brancher sur cdd_coach_match_note[matchId] quand l'écran de note coach sera fait.
          Pour l'instant on masque pour ne pas afficher un texte mock. */}

      <div className="cvp-question">{me.first} sera-t-il présent ?</div>

      <div className="cvp-answers">
        <button className="cvp-answer cvp-yes" onClick={() => setResp("yes")}>
          <span className="cvp-answer-ic">✓</span>
          <span className="cvp-answer-l">JE VIENS</span>
        </button>
        <button className="cvp-answer cvp-no" onClick={() => setResp("no")}>
          <span className="cvp-answer-ic">✕</span>
          <span className="cvp-answer-l">ABSENT</span>
        </button>
        <button className="cvp-answer cvp-may" onClick={() => setResp("may")}>
          <span className="cvp-answer-ic">?</span>
          <span className="cvp-answer-l">PEUT-ÊTRE</span>
        </button>
      </div>

      <div className="cvp-foot">
        Page de convocation · Coach du Dimanche · réponse anonyme, pas de compte requis
      </div>
    </div>
  );
}

window.ScreenConvoParent = ScreenConvoParent;
