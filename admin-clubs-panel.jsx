/* global React */
/* ============================================================
   ADMIN CLUBS PANEL — Phase D (D4e)
   ============================================================
   Réservé à l'admin (archi.tech.fr@gmail.com). Permet de :
     - Lister tous les clubs (lecture globale)
     - Créer un nouveau club
     - Pour chaque club : lister/créer ses équipes
     - Pour chaque équipe : voir le coach principal actuel + assigner un
       coach par (email + uid) — un seul coach par équipe.

   L'assignation nécessite l'UID Firebase de la personne. Si elle a déjà
   une membership (n'importe quel club), on retrouve son UID automatiquement
   via son email. Sinon, l'admin doit le saisir à la main.

   Source de vérité serveur : firestore.rules → `memberships/{uid}_{clubId}`
   avec map `teams: { [teamId]: { role } }`. canManageClub (admin/owner/coach)
   couvre les opérations ici.

   Expose window.AdminClubsPanel — monté à la demande dans les Réglages.
============================================================ */

function AdminClubsPanel({ onClose }) {
  const R = window.CDD_ROLES;
  const D = window.cddData;
  const isAdmin = !!(R && R.isAdmin && R.isAdmin());

  const [phase, setPhase]   = React.useState('loading'); // loading | ready | error
  const [error, setError]   = React.useState('');
  const [clubs, setClubs]   = React.useState([]);       // [{id, name, ...}]
  const [tick, setTick]     = React.useState(0);         // force reload

  // Détail club ouvert : { clubId, teams[], memberships[] }
  const [openId, setOpenId] = React.useState(null);
  const [detail, setDetail] = React.useState(null);
  const [detailBusy, setDetailBusy] = React.useState(false);

  // Migration Phase C → Phase D (D5)
  const [migBusy, setMigBusy] = React.useState(false);
  const [migResult, setMigResult] = React.useState(null);

  // Configuration FFF — modal d'édition par équipe (clubId/competId/phase/group)
  const [fffEditFor, setFffEditFor] = React.useState(null); // { club, team }
  const [fffForm, setFffForm] = React.useState({ clubId:'', competId:'', phase:'1', group:'1', label:'' });
  const [fffUrl, setFffUrl] = React.useState('');
  const [fffTesting, setFffTesting] = React.useState(false);
  const [fffTestResult, setFffTestResult] = React.useState(null);
  const [fffSaving, setFffSaving] = React.useState(false);
  // Recherche FFF par nom de club (méthode 0 — la plus simple pour un coach)
  const [fffSearch, setFffSearch] = React.useState('');
  const [fffSearchBusy, setFffSearchBusy] = React.useState(false);
  const [fffSearchResults, setFffSearchResults] = React.useState(null); // array | null
  const [fffSearchError, setFffSearchError] = React.useState('');
  const [fffPickedClub, setFffPickedClub] = React.useState(null);       // {cl_no, name, shortName}
  const [fffCompets, setFffCompets] = React.useState(null);             // array | null
  const [fffCompetsBusy, setFffCompetsBusy] = React.useState(false);
  const [fffCompetsError, setFffCompetsError] = React.useState('');

  const runFffClubSearch = async () => {
    if (!window.CDD_FFF || !window.CDD_FFF.searchClubs) {
      setFffSearchError('Module FFF non chargé.');
      return;
    }
    setFffSearchBusy(true);
    setFffSearchError('');
    setFffSearchResults(null);
    setFffPickedClub(null);
    setFffCompets(null);
    try {
      const res = await window.CDD_FFF.searchClubs(fffSearch);
      if (res && res.ok) setFffSearchResults(res.data);
      else { setFffSearchError(res?.error || 'Recherche échouée.'); setFffSearchResults([]); }
    } catch (e) {
      setFffSearchError((e && e.message) || String(e));
      setFffSearchResults([]);
    } finally {
      setFffSearchBusy(false);
    }
  };

  const pickFffClub = async (club) => {
    setFffPickedClub(club);
    setFffCompets(null);
    setFffCompetsError('');
    setFffCompetsBusy(true);
    // Pré-remplit déjà le clubId / label dans le formulaire — l'utilisateur
    // peut sauvegarder dès maintenant s'il connaît le competId/group à la main.
    setFffForm(prev => ({
      ...prev,
      clubId: String(club.cl_no || ''),
      label: prev.label || (club.shortName || club.name || ''),
    }));
    try {
      const res = await window.CDD_FFF.getClubCompetitions(club.cl_no);
      if (res && res.ok) setFffCompets(res.data);
      else { setFffCompetsError(res?.error || 'Lecture des compétitions échouée.'); setFffCompets([]); }
    } catch (e) {
      setFffCompetsError((e && e.message) || String(e));
      setFffCompets([]);
    } finally {
      setFffCompetsBusy(false);
    }
  };

  const pickFffCompetition = (cmp) => {
    setFffForm({
      clubId:   String(fffPickedClub?.cl_no || cmp.clubId || ''),
      competId: String(cmp.competId || ''),
      phase:    String(cmp.phase || '1'),
      group:    String(cmp.group || '1'),
      label:    (cmp.teamLabel ? cmp.teamLabel + ' — ' : '') + (cmp.competName || ''),
    });
    setFffTestResult(null);
  };

  const openFffEditor = (club, team) => {
    const cur = team.fffConfig || team.fff || {};
    setFffForm({
      clubId:   cur.clubId   || '',
      competId: cur.competId || '',
      phase:    cur.phase    || '1',
      group:    cur.group    || '1',
      label:    cur.label    || '',
    });
    setFffUrl('');
    setFffTestResult(null);
    // Reset recherche pour repartir sur un état propre
    setFffSearch('');
    setFffSearchResults(null);
    setFffSearchError('');
    setFffPickedClub(null);
    setFffCompets(null);
    setFffCompetsError('');
    setFffEditFor({ club, team });
  };

  const parseFffUrl = () => {
    const parser = window.CDD_FFF && window.CDD_FFF.parseFFFUrl;
    if (!parser) { alert('Module FFF non chargé.'); return; }
    const parsed = parser(fffUrl.trim());
    if (!parsed || !parsed.competId) {
      alert("URL non reconnue.\n\nFormats acceptés :\n"
        + "  • www.fff.fr/competitions/?competition=…&group=…&scl=…\n"
        + "  • epreuves.fff.fr/competition/club/{id}-slug/equipe/{annee}_{compet}_{cat}_{poule}/…\n\n"
        + "Va sur la page Classement ou Calendrier de TON équipe sur fff.fr et copie l'URL complète.");
      return;
    }
    setFffForm({
      clubId:   parsed.clubId   || fffForm.clubId,
      competId: parsed.competId || fffForm.competId,
      phase:    parsed.phase    || '1',
      group:    parsed.group    || '1',
      label:    parsed.label    || fffForm.label,
    });
    setFffTestResult(null);
  };

  const testFffConnection = async () => {
    if (!window.CDD_FFF || !window.CDD_FFF.getRanking) { alert('Module FFF non chargé.'); return; }
    if (!fffForm.competId || !fffForm.group) { alert('competId et group requis.'); return; }
    setFffTesting(true);
    setFffTestResult(null);
    try {
      const res = await window.CDD_FFF.getRanking({
        competId: fffForm.competId,
        phase:    fffForm.phase || '1',
        group:    fffForm.group,
      }, { force: true });
      if (res && res.ok && Array.isArray(res.data) && res.data.length > 0) {
        const teams = res.data.map(r => (r.equipe?.short_name || r.equipe?.name || '?'));
        setFffTestResult({ ok: true, count: res.data.length, teams: teams.slice(0, 8) });
      } else {
        setFffTestResult({ ok: false, error: res?.error || 'Pas de données — vérifie les IDs' });
      }
    } catch (e) {
      setFffTestResult({ ok: false, error: (e && e.message) || String(e) });
    } finally {
      setFffTesting(false);
    }
  };

  const saveFffConfig = async () => {
    if (!fffEditFor) return;
    if (!fffForm.competId || !fffForm.group) {
      alert('competId et group sont obligatoires.');
      return;
    }
    setFffSaving(true);
    try {
      await D.saveTeam({
        id:       fffEditFor.team.id,
        clubId:   fffEditFor.team.clubId || fffEditFor.club.id,
        name:     fffEditFor.team.name,
        category: fffEditFor.team.category || '',
        fffConfig: { ...fffForm },
      });
      setFffEditFor(null);
      reload();
    } catch (e) {
      alert('Sauvegarde échouée : ' + ((e && e.message) || e));
    } finally {
      setFffSaving(false);
    }
  };

  const reload = () => setTick(t => t + 1);

  const runMigration = async () => {
    if (!window.confirm(
      'Migrer toutes les memberships vers le modèle Phase D (rôle par équipe) ?\n\n'
      + '  • Les memberships déjà au nouveau format sont ignorées (idempotent).\n'
      + '  • Les coachs principaux Phase C deviennent coach de TOUTES les équipes existantes de leur club.\n'
      + '  • Tu pourras ensuite affiner chaque assignation via le panneau.\n\n'
      + 'Tu peux relancer cette migration sans risque.'
    )) return;
    setMigBusy(true); setMigResult(null);
    try {
      const res = await D.migrateMembershipsToTeamsModel();
      setMigResult(res);
      reload();
    } catch (e) {
      setMigResult({ ok: false, error: (e && e.message) || String(e) });
    } finally {
      setMigBusy(false);
    }
  };

  React.useEffect(() => {
    let alive = true;
    (async () => {
      setPhase('loading'); setError('');
      if (!isAdmin) { if (alive) { setPhase('error'); setError('Réservé à l\'administrateur.'); } return; }
      if (!D || !D.ready) { if (alive) { setPhase('error'); setError('Service cloud indisponible.'); } return; }
      try {
        const list = await D.fetchAllClubs();
        list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        if (alive) { setClubs(list); setPhase('ready'); }
      } catch (e) {
        if (alive) { setPhase('error'); setError('Lecture impossible : ' + ((e && e.message) || e)); }
      }
    })();
    return () => { alive = false; };
  }, [isAdmin, tick]);

  // Charge teams + memberships du club ouvert
  React.useEffect(() => {
    let alive = true;
    if (!openId) { setDetail(null); return; }
    (async () => {
      setDetailBusy(true);
      try {
        const [teams, memberships] = await Promise.all([
          D.fetchTeams(openId),
          D.fetchClubMemberships(openId),
        ]);
        teams.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        if (alive) setDetail({ clubId: openId, teams, memberships });
      } catch (e) {
        if (alive) setDetail({ clubId: openId, teams: [], memberships: [], error: (e && e.message) || String(e) });
      } finally {
        if (alive) setDetailBusy(false);
      }
    })();
    return () => { alive = false; };
  }, [openId, tick, D]);

  // ── Actions ────────────────────────────────────────────────
  const createClub = async () => {
    const name = window.prompt('Nom du nouveau club :');
    if (!name || !name.trim()) return;
    const id = 'club_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
    try {
      await D.saveClub({ id, name: name.trim() });
      reload();
    } catch (e) { alert('Création impossible : ' + ((e && e.message) || e)); }
  };

  const deleteClub = async (club) => {
    if (!window.confirm('Supprimer le club « ' + (club.name || club.id) + ' » ?\n\n'
      + 'Les équipes et joueurs liés ne seront PAS supprimés automatiquement.')) return;
    try {
      // L'API n'expose pas deleteClub côté cddData. On utilise un setDoc
      // direct ? Non — on n'a pas accès à `db`. Pour D4, on prévient
      // l'admin que la suppression se fait dans la console Firebase.
      alert('La suppression d\'un club doit se faire pour l\'instant dans la console Firebase ' +
            '(/clubs/' + club.id + '). Cette opération sera ajoutée au panneau plus tard.');
    } catch (e) { alert('Suppression impossible : ' + ((e && e.message) || e)); }
  };

  const createTeam = async (club) => {
    const name = window.prompt('Nom de l\'équipe à créer dans « ' + (club.name || club.id) + ' » :');
    if (!name || !name.trim()) return;
    const category = window.prompt('Catégorie (ex. Sénior, U13, +35) — facultatif :', '') || '';
    const id = 'team_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
    try {
      await D.saveTeam({ id, clubId: club.id, name: name.trim(), category: category.trim() });
      reload();
    } catch (e) { alert('Création impossible : ' + ((e && e.message) || e)); }
  };

  const assignCoach = async (club, team, currentCoachUid) => {
    const email = window.prompt('Email du futur coach principal de « ' + (team.name || team.id) + ' » :');
    if (!email || !email.trim()) return;
    const cleanEmail = email.trim().toLowerCase();
    let uid = null;
    try { uid = await D.findUidByEmail(cleanEmail); } catch (e) {}
    if (!uid) {
      uid = window.prompt('Cette personne n\'a encore aucune membership cloud.\n\n'
        + 'Saisis son UID Firebase (visible dans la console Firebase → Authentication).\n'
        + 'Note : la personne doit s\'être déjà connectée à l\'app au moins une fois.');
      if (!uid || !uid.trim()) return;
      uid = uid.trim();
    }
    if (currentCoachUid && currentCoachUid !== uid) {
      if (!window.confirm('Cette équipe a déjà un coach principal (UID ' + currentCoachUid + ').\n\n'
        + 'Le remplacer par ' + cleanEmail + ' ?\n'
        + 'L\'ancien coach perdra son rôle « coach » sur cette équipe — il gardera ses autres rattachements.')) return;
      try {
        // Rétrograde l'ancien coach en retirant SON entrée teams[teamId].
        await D.removeTeamMembership(currentCoachUid, club.id, team.id);
      } catch (e) {
        if (!window.confirm('Échec du retrait de l\'ancien coach : ' + ((e && e.message) || e)
          + '\n\nContinuer quand même l\'assignation du nouveau ?')) return;
      }
    }
    try {
      await D.assignTeamCoach({ uid, email: cleanEmail, clubId: club.id, teamId: team.id });
      reload();
    } catch (e) { alert('Assignation impossible : ' + ((e && e.message) || e)); }
  };

  // ── Helpers d'affichage ────────────────────────────────────
  const coachOfTeam = (memberships, teamId) => {
    for (const m of memberships) {
      const t = (m.teams || {})[teamId];
      if (t && t.role === 'coach') return m;
    }
    return null;
  };
  const nonCoachMembersOfTeam = (memberships, teamId) => {
    const out = [];
    for (const m of memberships) {
      const t = (m.teams || {})[teamId];
      if (t && t.role && t.role !== 'coach') out.push({ ...m, _role: t.role });
    }
    return out;
  };

  const ROLE_LABEL = { adjoint:'Adjoint', parent:'Parent', joueur:'Joueur', lecteur:'Lecteur' };
  const ROLE_COLOR = { adjoint:'#60a5fa', parent:'#c084fc', joueur:'#4ade80', lecteur:'rgba(255,255,255,0.45)' };

  // ── Render ─────────────────────────────────────────────────
  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:500,
      display:'flex', justifyContent:'center', alignItems:'flex-start', overflow:'auto', padding:20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width:'100%', maxWidth:640, background:'#0B1320', borderRadius:16,
        border:'1px solid rgba(255,255,255,0.12)', padding:20, color:'#fff',
      }}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14}}>
          <div>
            <div style={{fontSize:10.5, fontWeight:800, letterSpacing:'.12em',
                         color:'#c8f169', textTransform:'uppercase'}}>Admin</div>
            <div style={{fontSize:20, fontWeight:900, marginTop:2}}>Clubs & équipes</div>
            <div style={{fontSize:12, color:'rgba(255,255,255,0.55)', marginTop:2}}>
              Crée des clubs, des équipes, et assigne le coach principal de chaque équipe.
            </div>
          </div>
          <button onClick={onClose} style={{
            background:'transparent', border:'none', color:'#fff', fontSize:22, cursor:'pointer',
            padding:'4px 8px',
          }}>✕</button>
        </div>

        {phase === 'loading' && (
          <div style={{padding:20, textAlign:'center', color:'rgba(255,255,255,0.55)'}}>
            Chargement…
          </div>
        )}
        {phase === 'error' && (
          <div style={{padding:14, borderRadius:10, background:'rgba(239,68,68,0.12)',
                       border:'1px solid rgba(239,68,68,0.35)', color:'#fca5a5'}}>
            {error}
          </div>
        )}

        {phase === 'ready' && (
          <>
            {/* Migration Phase C → Phase D (D5) — idempotent. */}
            <div style={{
              padding:'10px 12px', borderRadius:10, marginBottom:12,
              background:'rgba(251,191,36,0.08)',
              border:'1px solid rgba(251,191,36,0.25)',
            }}>
              <div style={{display:'flex', justifyContent:'space-between',
                           alignItems:'center', gap:10}}>
                <div style={{fontSize:11.5, color:'rgba(255,255,255,0.75)', lineHeight:1.5}}>
                  <b style={{color:'#fbbf24'}}>Migration des memberships</b><br/>
                  Convertit les rattachements pré-D (rôle plat) vers le modèle
                  par équipe. À lancer UNE fois après publication des règles.
                </div>
                <button onClick={runMigration} disabled={migBusy} style={{
                  background:'rgba(251,191,36,0.18)', color:'#fbbf24',
                  border:'1px solid rgba(251,191,36,0.45)', borderRadius:7,
                  padding:'6px 11px', fontSize:11.5, fontWeight:700,
                  cursor: migBusy ? 'wait' : 'pointer', flexShrink:0,
                  opacity: migBusy ? 0.6 : 1,
                }}>{migBusy ? 'Migration…' : 'Migrer'}</button>
              </div>
              {migResult && (
                <div style={{
                  marginTop:8, fontSize:11.5, lineHeight:1.5,
                  color: migResult.ok ? '#c8f169' : '#fca5a5',
                }}>
                  {migResult.ok ? (
                    <>
                      ✓ {migResult.counts.converted} converti{migResult.counts.converted > 1 ? 's' : ''} ·
                      {' '}{migResult.counts.alreadyOk} déjà OK ·
                      {' '}{migResult.counts.skipped} sauté{migResult.counts.skipped > 1 ? 's' : ''} ·
                      {' '}{migResult.counts.errors} erreur{migResult.counts.errors > 1 ? 's' : ''}
                    </>
                  ) : (
                    <>✗ {migResult.error || migResult.reason || 'Échec inconnu'}</>
                  )}
                </div>
              )}
            </div>

            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10}}>
              <div style={{fontSize:11.5, color:'rgba(255,255,255,0.55)'}}>
                {clubs.length} club{clubs.length > 1 ? 's' : ''} en base
              </div>
              <button onClick={createClub} style={{
                background:'#c8f169', color:'#062012', border:'none', borderRadius:9,
                padding:'7px 12px', fontWeight:800, cursor:'pointer', fontSize:12.5,
              }}>+ Créer un club</button>
            </div>

            {clubs.length === 0 && (
              <div style={{padding:14, color:'rgba(255,255,255,0.55)', fontSize:13, textAlign:'center'}}>
                Aucun club encore. Crée le premier.
              </div>
            )}

            {clubs.map(c => {
              const isOpen = openId === c.id;
              const d = isOpen ? detail : null;
              return (
                <div key={c.id} style={{
                  marginBottom:8, borderRadius:11,
                  background:'rgba(255,255,255,0.03)',
                  border:'1px solid rgba(255,255,255,0.07)',
                }}>
                  <div style={{
                    display:'flex', alignItems:'center', gap:10, padding:'11px 12px',
                    cursor:'pointer',
                  }} onClick={() => setOpenId(isOpen ? null : c.id)}>
                    <div style={{fontSize:17, opacity:0.8}}>{isOpen ? '▾' : '▸'}</div>
                    <div style={{flex:1, minWidth:0}}>
                      <div style={{fontWeight:800, fontSize:14}}>{c.name || '(sans nom)'}</div>
                      <div style={{fontSize:11, color:'rgba(255,255,255,0.5)', marginTop:2}}>
                        id : {c.id}
                      </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); deleteClub(c); }} style={{
                      background:'transparent', border:'1px solid rgba(239,68,68,0.35)',
                      color:'#fca5a5', borderRadius:7, padding:'4px 8px',
                      fontSize:11, cursor:'pointer',
                    }} title="Supprimer ce club">Supprimer</button>
                  </div>

                  {isOpen && (
                    <div style={{borderTop:'1px solid rgba(255,255,255,0.06)', padding:12}}>
                      {detailBusy && <div style={{fontSize:12, color:'rgba(255,255,255,0.5)'}}>Chargement…</div>}
                      {d && d.error && (
                        <div style={{padding:8, borderRadius:8, background:'rgba(239,68,68,0.12)',
                                     color:'#fca5a5', fontSize:12, marginBottom:8}}>
                          {d.error}
                        </div>
                      )}
                      {d && !d.error && (
                        <>
                          <div style={{display:'flex', justifyContent:'space-between',
                                       alignItems:'center', marginBottom:8}}>
                            <div style={{fontSize:10.5, fontWeight:800, letterSpacing:'.1em',
                                         color:'rgba(255,255,255,0.55)', textTransform:'uppercase'}}>
                              Équipes ({d.teams.length})
                            </div>
                            <button onClick={() => createTeam(c)} style={{
                              background:'rgba(200,241,105,0.18)', color:'#c8f169',
                              border:'1px solid rgba(200,241,105,0.4)', borderRadius:7,
                              padding:'4px 10px', fontSize:11.5, fontWeight:700, cursor:'pointer',
                            }}>+ Équipe</button>
                          </div>
                          {d.teams.length === 0 && (
                            <div style={{fontSize:12, color:'rgba(255,255,255,0.5)',
                                         padding:'6px 0'}}>
                              Aucune équipe dans ce club.
                            </div>
                          )}
                          {d.teams.map(t => {
                            const coach = coachOfTeam(d.memberships, t.id);
                            const others = nonCoachMembersOfTeam(d.memberships, t.id);
                            return (
                              <div key={t.id} style={{
                                padding:'9px 0',
                                borderTop:'1px solid rgba(255,255,255,0.05)',
                              }}>
                                <div style={{display:'flex', alignItems:'center', gap:8}}>
                                  <div style={{flex:1, minWidth:0}}>
                                    <div style={{fontWeight:700, fontSize:13.5}}>
                                      {t.name || t.id}
                                      {t.category && (
                                        <span style={{fontWeight:500, fontSize:11.5,
                                                      color:'rgba(255,255,255,0.55)',
                                                      marginLeft:6}}>
                                          · {t.category}
                                        </span>
                                      )}
                                    </div>
                                    {/* Coach principal */}
                                    <div style={{fontSize:11.5, color:'rgba(255,255,255,0.6)', marginTop:3}}>
                                      {coach ? (
                                        <>
                                          <span style={{marginRight:4}}>📋</span>
                                          <span style={{color:'rgba(255,255,255,0.5)'}}>Coach :</span>
                                          {' '}
                                          <b style={{color:'#c8f169'}}>
                                            {coach.displayName ? coach.displayName + ' — ' : ''}
                                            {coach.email || coach.uid}
                                          </b>
                                        </>
                                      ) : (
                                        <span style={{color:'#fbbf24'}}>⚠ Pas de coach principal</span>
                                      )}
                                    </div>
                                    {/* Autres membres : un par ligne avec badge rôle + nom/email */}
                                    {others.length > 0 && (
                                      <div style={{marginTop:5, display:'flex', flexDirection:'column', gap:3}}>
                                        {others.map(m => {
                                          const col = ROLE_COLOR[m._role] || 'rgba(255,255,255,0.4)';
                                          return (
                                            <div key={m.uid} style={{
                                              display:'flex', alignItems:'center', gap:5,
                                              fontSize:11,
                                            }}>
                                              <span style={{
                                                padding:'1px 6px', borderRadius:4,
                                                background: col + '22',
                                                color: col,
                                                fontWeight:700, fontSize:10, flexShrink:0,
                                              }}>
                                                {ROLE_LABEL[m._role] || m._role}
                                              </span>
                                              <span style={{color:'rgba(255,255,255,0.75)'}}>
                                                {m.displayName || ''}
                                                {m.displayName && m.email ? ' — ' : ''}
                                                {m.email || m.uid}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                    {others.length === 0 && !coach && (
                                      <div style={{fontSize:11, color:'rgba(255,255,255,0.35)', marginTop:2}}>
                                        Aucun membre rattaché
                                      </div>
                                    )}
                                  </div>
                                  <button onClick={() => openFffEditor(c, t)} style={{
                                    background: (t.fffConfig?.competId || t.fff?.competId)
                                      ? 'rgba(245,196,81,0.14)' : 'rgba(255,255,255,0.05)',
                                    color: (t.fffConfig?.competId || t.fff?.competId) ? '#f5c451' : 'rgba(255,255,255,.65)',
                                    border:'1px solid ' + ((t.fffConfig?.competId || t.fff?.competId)
                                      ? 'rgba(245,196,81,0.32)' : 'rgba(255,255,255,.12)'),
                                    borderRadius:7,
                                    padding:'5px 9px', fontSize:11.5, fontWeight:700, cursor:'pointer',
                                    flexShrink:0,
                                  }}
                                  title={(t.fffConfig?.competId || t.fff?.competId)
                                    ? `FFF configuré · compet ${(t.fffConfig||t.fff).competId} · poule ${(t.fffConfig||t.fff).group}`
                                    : 'Configurer le championnat FFF'}>
                                    🏆 FFF
                                  </button>
                                  {coach ? (
                                    <button onClick={() => assignCoach(c, t, coach.uid)} style={{
                                      background:'rgba(251,191,36,0.12)', color:'#fbbf24',
                                      border:'1px solid rgba(251,191,36,0.35)', borderRadius:7,
                                      padding:'5px 10px', fontSize:11.5, fontWeight:700, cursor:'pointer',
                                      flexShrink:0,
                                    }} title="Remplace le coach principal actuel par une autre personne">
                                      ↔ Transférer
                                    </button>
                                  ) : (
                                    <button onClick={() => assignCoach(c, t, null)} style={{
                                      background:'rgba(200,241,105,0.14)', color:'#c8f169',
                                      border:'1px solid rgba(200,241,105,0.32)', borderRadius:7,
                                      padding:'5px 10px', fontSize:11.5, fontWeight:700, cursor:'pointer',
                                      flexShrink:0,
                                    }}>
                                      Assigner
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        <div style={{
          marginTop:14, paddingTop:12,
          borderTop:'1px solid rgba(255,255,255,0.08)',
          fontSize:11, color:'rgba(255,255,255,0.45)', lineHeight:1.55,
        }}>
          Pour qu'un futur coach apparaisse dans la recherche par email, il doit
          d'abord s'être connecté à l'app au moins une fois (création de son
          compte Firebase Auth).
        </div>
      </div>

      {/* MODAL CONFIG FFF — édition des IDs de championnat par équipe */}
      {fffEditFor && (
        <div style={{
          position:'fixed', inset:0, zIndex:200,
          background:'rgba(0,0,0,0.75)', display:'flex',
          alignItems:'center', justifyContent:'center', padding:14,
        }} onClick={() => !fffSaving && setFffEditFor(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            width:'100%', maxWidth:480, maxHeight:'90vh', overflow:'auto',
            background:'#0f1419',
            border:'1px solid rgba(245,196,81,0.30)',
            borderRadius:14, padding:'18px 16px',
          }}>
            <div style={{
              display:'flex', justifyContent:'space-between', alignItems:'center',
              marginBottom:4,
            }}>
              <div style={{
                fontSize:11, fontWeight:900, letterSpacing:'.10em',
                color:'#f5c451', textTransform:'uppercase',
              }}>🏆 Configuration FFF</div>
              <button onClick={() => !fffSaving && setFffEditFor(null)}
                style={{
                  background:'transparent', border:'none', color:'rgba(255,255,255,.6)',
                  fontSize:18, cursor:'pointer', padding:0, lineHeight:1,
                }}>✕</button>
            </div>
            <div style={{fontSize:14, fontWeight:800, color:'#fff', marginBottom:14}}>
              {fffEditFor.team.name}
              {fffEditFor.team.category && (
                <span style={{fontSize:12, color:'rgba(255,255,255,.55)', marginLeft:6}}>
                  · {fffEditFor.team.category}
                </span>
              )}
            </div>

            {/* Section : Recherche par nom de club (méthode la plus simple) */}
            <div style={{
              padding:'12px 12px', borderRadius:10, marginBottom:12,
              background:'rgba(200,241,105,0.05)',
              border:'1px dashed rgba(200,241,105,0.30)',
            }}>
              <div style={{fontSize:11, fontWeight:800, color:'#c8f169', marginBottom:6, letterSpacing:'.04em'}}>
                ⓪ Méthode auto — chercher le club FFF
              </div>
              <div style={{fontSize:11, color:'rgba(255,255,255,.6)', lineHeight:1.5, marginBottom:8}}>
                Tape le nom (ou un fragment) du club et choisis la
                compétition. Les 4 IDs se remplissent tout seuls.
              </div>
              <div style={{display:'flex', gap:6, marginBottom:8}}>
                <input type="text"
                  value={fffSearch}
                  onChange={e => setFffSearch(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') runFffClubSearch(); }}
                  placeholder="ex. FC MAGNY ou simplement MAGNY"
                  style={{
                    flex:1, padding:'8px 10px', borderRadius:7, fontSize:12,
                    background:'rgba(0,0,0,.35)', color:'#fff',
                    border:'1px solid rgba(255,255,255,.15)', outline:'none',
                  }}/>
                <button onClick={runFffClubSearch}
                  disabled={fffSearchBusy || fffSearch.trim().length < 2}
                  style={{
                    padding:'8px 12px', borderRadius:7, fontSize:12, fontWeight:800,
                    background: (fffSearchBusy || fffSearch.trim().length < 2) ? 'rgba(255,255,255,.08)' : '#c8f169',
                    color: (fffSearchBusy || fffSearch.trim().length < 2) ? 'rgba(255,255,255,.4)' : '#062012',
                    border:'none',
                    cursor: (fffSearchBusy || fffSearch.trim().length < 2) ? 'default' : 'pointer',
                  }}>
                  {fffSearchBusy ? '⟳' : '🔍 Chercher'}
                </button>
              </div>

              {/* Résultats clubs */}
              {fffSearchError && (
                <div style={{
                  fontSize:11.5, color:'#ff8a8a', padding:'6px 10px', borderRadius:7,
                  background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.30)',
                  marginBottom:8,
                }}>
                  ⚠ {fffSearchError}
                </div>
              )}
              {fffSearchResults && fffSearchResults.length > 0 && !fffPickedClub && (
                <div style={{
                  display:'flex', flexDirection:'column', gap:4,
                  maxHeight:200, overflow:'auto',
                  paddingRight:4,
                }}>
                  {fffSearchResults.map(c => (
                    <button key={c.cl_no}
                      onClick={() => pickFffClub(c)}
                      style={{
                        textAlign:'left', padding:'8px 10px', borderRadius:7,
                        background:'rgba(255,255,255,0.04)',
                        border:'1px solid rgba(255,255,255,0.10)',
                        color:'#fff', cursor:'pointer', fontSize:12,
                      }}>
                      <div style={{fontWeight:800}}>
                        {c.shortName || c.name}
                      </div>
                      {(c.locality || c.name !== c.shortName) && (
                        <div style={{fontSize:10.5, opacity:0.55, marginTop:2}}>
                          {c.name && c.name !== c.shortName ? c.name : ''}
                          {c.locality ? ' · ' + c.locality : ''}
                          {' · #' + c.cl_no}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Club choisi → liste des compétitions */}
              {fffPickedClub && (
                <div style={{
                  padding:'8px 10px', borderRadius:7, marginTop:8,
                  background:'rgba(200,241,105,0.06)',
                  border:'1px solid rgba(200,241,105,0.25)',
                }}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6}}>
                    <div style={{fontSize:12, fontWeight:800, color:'#c8f169'}}>
                      ✓ {fffPickedClub.shortName || fffPickedClub.name}
                      <span style={{fontWeight:500, opacity:0.6, marginLeft:6}}>
                        #{fffPickedClub.cl_no}
                      </span>
                    </div>
                    <button onClick={() => { setFffPickedClub(null); setFffCompets(null); }}
                      style={{
                        background:'transparent', border:'none', color:'rgba(255,255,255,0.5)',
                        fontSize:11, cursor:'pointer',
                      }}>changer</button>
                  </div>
                  {fffCompetsBusy && (
                    <div style={{fontSize:11, opacity:0.6, padding:'6px 0'}}>
                      ⟳ Lecture des compétitions…
                    </div>
                  )}
                  {fffCompetsError && (
                    <div style={{
                      fontSize:11.5, color:'#ff8a8a', padding:'4px 0',
                    }}>⚠ {fffCompetsError}</div>
                  )}
                  {fffCompets && fffCompets.length > 0 && (
                    <div style={{
                      display:'flex', flexDirection:'column', gap:3,
                      maxHeight:220, overflow:'auto', paddingRight:4,
                    }}>
                      {fffCompets.map((cmp, idx) => (
                        <button key={idx}
                          onClick={() => pickFffCompetition(cmp)}
                          style={{
                            textAlign:'left', padding:'7px 9px', borderRadius:6,
                            background: (fffForm.competId === cmp.competId && fffForm.group === cmp.group)
                              ? 'rgba(200,241,105,0.18)' : 'rgba(255,255,255,0.03)',
                            border:'1px solid ' + (
                              (fffForm.competId === cmp.competId && fffForm.group === cmp.group)
                                ? 'rgba(200,241,105,0.45)' : 'rgba(255,255,255,0.08)'
                            ),
                            color:'#fff', cursor:'pointer', fontSize:11.5,
                          }}>
                          <div style={{fontWeight:700}}>
                            {cmp.teamLabel}
                          </div>
                          <div style={{fontSize:10.5, opacity:0.65, marginTop:2}}>
                            {cmp.competName} · poule {cmp.group}
                            {cmp.season ? ' · ' + cmp.season : ''}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {fffCompets && fffCompets.length === 0 && !fffCompetsBusy && !fffCompetsError && (
                    <div style={{fontSize:11, opacity:0.55}}>
                      Aucune compétition trouvée pour ce club.
                    </div>
                  )}
                </div>
              )}
              {fffSearchResults && fffSearchResults.length === 0 && !fffSearchError && (
                <div style={{fontSize:11, opacity:0.55, padding:'4px 0'}}>
                  Aucun club correspondant — essaie un autre fragment.
                </div>
              )}
            </div>

            {/* Section : Coller URL FFF */}
            <div style={{
              padding:'12px 12px', borderRadius:10, marginBottom:12,
              background:'rgba(245,196,81,0.05)',
              border:'1px dashed rgba(245,196,81,0.25)',
            }}>
              <div style={{fontSize:11, fontWeight:800, color:'#f5c451', marginBottom:6, letterSpacing:'.04em'}}>
                ① Méthode rapide — coller l'URL FFF
              </div>
              <div style={{fontSize:11, color:'rgba(255,255,255,.6)', lineHeight:1.5, marginBottom:8}}>
                Sur <b>fff.fr</b>, ouvre ton championnat (ex : page Classement),
                copie l'URL complète (avec <code>?competition=…&group=…</code>)
                et colle-la ici :
              </div>
              <div style={{display:'flex', gap:6}}>
                <input type="text" value={fffUrl} onChange={e => setFffUrl(e.target.value)}
                  placeholder="fff.fr/competitions/?... ou epreuves.fff.fr/competition/club/.../equipe/..."
                  style={{
                    flex:1, padding:'8px 10px', borderRadius:7, fontSize:12,
                    background:'rgba(0,0,0,.35)', color:'#fff',
                    border:'1px solid rgba(255,255,255,.15)', outline:'none',
                  }}/>
                <button onClick={parseFffUrl} disabled={!fffUrl.trim()} style={{
                  padding:'8px 12px', borderRadius:7, fontSize:12, fontWeight:800,
                  background: fffUrl.trim() ? '#f5c451' : 'rgba(255,255,255,.08)',
                  color: fffUrl.trim() ? '#1f1404' : 'rgba(255,255,255,.4)',
                  border:'none', cursor: fffUrl.trim() ? 'pointer' : 'default',
                }}>Parser</button>
              </div>
            </div>

            {/* Section : 4 IDs éditables */}
            <div style={{
              padding:'12px 12px', borderRadius:10, marginBottom:12,
              background:'rgba(255,255,255,0.03)',
              border:'1px solid rgba(255,255,255,0.08)',
            }}>
              <div style={{fontSize:11, fontWeight:800, color:'rgba(255,255,255,.85)', marginBottom:8, letterSpacing:'.04em'}}>
                ② Identifiants (modifiables)
              </div>
              {[
                { k:'competId', label:'competId (compétition)', placeholder:'ex : 442001' },
                { k:'group',    label:'group (poule)',          placeholder:'ex : 4' },
                { k:'phase',    label:'phase',                  placeholder:'défaut : 1' },
                { k:'clubId',   label:'clubId (scl — ton club)', placeholder:'ex : 547122' },
                { k:'label',    label:'label (libellé affiché)', placeholder:'ex : VÉTÉRANS D2 POULE B' },
              ].map(f => (
                <label key={f.k} style={{display:'block', marginBottom:8}}>
                  <span style={{fontSize:10, fontWeight:700, color:'rgba(255,255,255,.55)', letterSpacing:'.04em'}}>
                    {f.label}
                  </span>
                  <input type="text" value={fffForm[f.k] || ''}
                    onChange={e => setFffForm(prev => ({...prev, [f.k]: e.target.value}))}
                    placeholder={f.placeholder}
                    style={{
                      width:'100%', padding:'7px 9px', borderRadius:6, fontSize:12,
                      background:'rgba(0,0,0,.35)', color:'#fff',
                      border:'1px solid rgba(255,255,255,.12)', outline:'none',
                      marginTop:3, boxSizing:'border-box',
                    }}/>
                </label>
              ))}
            </div>

            {/* Section : Tester */}
            <div style={{marginBottom:12}}>
              <button onClick={testFffConnection} disabled={fffTesting || !fffForm.competId || !fffForm.group}
                style={{
                  width:'100%', padding:'9px 12px', borderRadius:8,
                  background: 'rgba(125,211,252,0.08)',
                  border:'1px solid rgba(125,211,252,0.30)',
                  color:'#7dd3fc', fontSize:12, fontWeight:700, cursor:'pointer',
                  opacity: (fffTesting || !fffForm.competId || !fffForm.group) ? 0.5 : 1,
                }}>
                {fffTesting ? '⟳ Test en cours…' : '③ Tester la connexion FFF'}
              </button>
              {fffTestResult && (
                <div style={{
                  marginTop:8, padding:'9px 11px', borderRadius:8, fontSize:11.5,
                  background: fffTestResult.ok ? 'rgba(200,241,105,0.08)' : 'rgba(239,68,68,0.08)',
                  border:'1px solid ' + (fffTestResult.ok ? 'rgba(200,241,105,0.30)' : 'rgba(239,68,68,0.35)'),
                  color: fffTestResult.ok ? '#c8f169' : '#ff8a8a',
                  lineHeight:1.5,
                }}>
                  {fffTestResult.ok
                    ? <>✓ <b>{fffTestResult.count} équipes</b> trouvées : {fffTestResult.teams.join(', ')}{fffTestResult.count > 8 ? '…' : ''}</>
                    : <>⚠ {fffTestResult.error}</>}
                </div>
              )}
            </div>

            {/* Footer : Save / Cancel */}
            <div style={{display:'flex', gap:8}}>
              <button onClick={() => !fffSaving && setFffEditFor(null)}
                disabled={fffSaving}
                style={{
                  flex:1, padding:'10px', borderRadius:8,
                  background:'rgba(255,255,255,0.06)',
                  border:'1px solid rgba(255,255,255,0.15)',
                  color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer',
                }}>Annuler</button>
              <button onClick={saveFffConfig}
                disabled={fffSaving || !fffForm.competId || !fffForm.group}
                style={{
                  flex:2, padding:'10px', borderRadius:8,
                  background: '#f5c451', color:'#1f1404',
                  border:'none', fontSize:13, fontWeight:800, cursor:'pointer',
                  opacity: (fffSaving || !fffForm.competId || !fffForm.group) ? 0.5 : 1,
                }}>
                {fffSaving ? 'Enregistrement…' : '💾 Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

window.AdminClubsPanel = AdminClubsPanel;
