/* global React, CDD_PLAYERS, CDD_FORMATIONS, FutCard, POSITION_LABEL */

/* ============================================================
   SCREEN — Effectif (Squad)
   ============================================================ */

const POS_GROUPS = [
  { id: "all", label: "Tous",       match: () => true,                                                          icon: "▦" },
  { id: "gk",  label: "Gardiens",   match: p => p.pos==="GK",                                                   icon: "🧤" },
  { id: "def", label: "Défense",    match: p => ["DC","DG","DD"].includes(p.pos),                               icon: "🛡" },
  { id: "mid", label: "Milieu",     match: p => ["MC","MOC","ML","MD","DM"].includes(p.pos),                    icon: "🔁" },
  { id: "att", label: "Attaque",    match: p => ["AG","AD","BU","ATT"].includes(p.pos),                         icon: "⚡" },
];

const SORTS = [
  { id: "num",   l: "N°",    fn: (a,b) => a.num - b.num },
  { id: "ovr",   l: "OVR",   fn: (a,b) => (b.stats?.ovr||0) - (a.stats?.ovr||0) },
  { id: "name",  l: "Nom",   fn: (a,b) => a.last.localeCompare(b.last) },
  { id: "goals", l: "Buts",  fn: (a,b) => (b.goals||0) - (a.goals||0) },
];

function ScreenEffectif({ go, tweaks }) {
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState("grid"); // grid | list
  const [sort, setSort] = useState("num");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all"); // all | active | rest | reserve

  // Suivi diffusion Carnet du joueur — coach voit où il en est dans l'envoi
  // des liens magiques aux parents. Source : cdd_carnet_shared écrit par CarnetActions.
  const [carnetShared, setCarnetShared] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cdd_carnet_shared') || '{}'); }
    catch (e) { return {}; }
  });
  useEffect(() => {
    const onShare = () => {
      try { setCarnetShared(JSON.parse(localStorage.getItem('cdd_carnet_shared') || '{}')); }
      catch (e) {}
    };
    window.addEventListener('cdd-carnet-shared', onShare);
    return () => window.removeEventListener('cdd-carnet-shared', onShare);
  }, []);

  // Apply filters
  let list = CDD_PLAYERS.filter(POS_GROUPS.find(g=>g.id===filter).match);

  if (search.trim()) {
    const q = search.toLowerCase().trim();
    list = list.filter(p =>
      (p.first || '').toLowerCase().includes(q) ||
      (p.last  || '').toLowerCase().includes(q) ||
      String(p.num).includes(q) ||
      (p.license || '').includes(q)
    );
  }

  if (statusFilter !== "all") {
    if (statusFilter === 'unavailable') {
      // Infirmerie : blesses + suspendus + indispos
      list = list.filter(p => {
        const s = p.raw?.status || p.status;
        return s === 'rest' || s === 'injured' || s === 'suspended';
      });
    } else {
      list = list.filter(p => (p.raw?.status || p.status) === statusFilter);
    }
  }

  // Apply sort
  list = [...list].sort(SORTS.find(s => s.id === sort).fn);

  const total = CDD_PLAYERS.length;
  const avgOvr = total ? Math.round(CDD_PLAYERS.reduce((s,p)=>s+(p.stats?.ovr||0),0)/total) : 0;
  const starsCount = CDD_PLAYERS.filter(p=>p.rarity==="icon"||p.rarity==="totw"||p.rarity==="hero").length;
  const availableCount = CDD_PLAYERS.filter(p => (p.raw?.status || p.status) === 'active').length;

  return (
    <div className="scr scr-effectif fade-in" data-screen-label="02 Effectif">

      <div className="ef-banner">
        <div className="ef-banner-bg"/>
        <div className="ef-banner-grad"/>
        <div className="ef-banner-in" style={{display:'flex', alignItems:'center', gap:14}}>
          {window.ClubBadge && (
            <window.ClubBadge clubId={window.CDD?.getActiveClub?.()?.id}
                              clubName={CDD_CLUB.short || CDD_CLUB.name}
                              colors={CDD_CLUB.colors} size={56} shape="square"/>
          )}
          <div style={{flex:1, minWidth:0}}>
            <div className="ef-banner-k">EFFECTIF · 2025-26</div>
            <div className="ef-banner-title">{CDD_CLUB.team} · {CDD_CLUB.short}</div>
            <div className="ef-banner-stats">
              <span><b className="num">{total}</b> joueurs</span>
              <span className="dot">●</span>
              <span><b className="num">{avgOvr}</b> moy.</span>
              <span className="dot">●</span>
              <span><b className="num">{availableCount}</b> dispo</span>
              {starsCount > 0 && <><span className="dot">●</span><span><b>{starsCount}</b> stars</span></>}
            </div>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="ef-search">
        <span className="ef-search-ic">🔍</span>
        <input
          type="text"
          placeholder="Cherche un joueur — nom, numéro, licence…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="ef-search-i"
        />
        {search && (
          <button className="ef-search-x" onClick={() => setSearch("")}>✕</button>
        )}
        <button
          className={`ef-search-toggle ${showFilters ? 'on' : ''}`}
          onClick={() => setShowFilters(s => !s)}>
          ⚙
        </button>
      </div>

      {/* Filter panel (collapsible) */}
      {showFilters && (
        <div className="ef-filters-panel">
          <div className="ef-fp-k">TRIER PAR</div>
          <div className="ef-fp-row">
            {SORTS.map(s => (
              <button key={s.id} className={`ef-fp-chip ${sort===s.id?"on":""}`} onClick={()=>setSort(s.id)}>
                {s.l}
              </button>
            ))}
          </div>
          <div className="ef-fp-k">STATUT</div>
          <div className="ef-fp-row">
            {[
              { id: "all",         l: "Tous" },
              { id: "active",      l: "✓ Dispo" },
              { id: "unavailable", l: "🩹 Infirmerie" },
              { id: "rest",        l: "⏸ Indispo" },
              { id: "reserve",     l: "★ Réserve" },
            ].map(s => (
              <button key={s.id} className={`ef-fp-chip ${statusFilter===s.id?"on":""}`} onClick={()=>setStatusFilter(s.id)}>
                {s.l}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Position filters + view toggle */}
      <div className="ef-filter">
        <div className="ef-tabs">
          {POS_GROUPS.map(g => {
            const count = CDD_PLAYERS.filter(g.match).length;
            return (
              <button key={g.id}
                className={`ef-tab ${filter===g.id?"on":""}`}
                onClick={() => setFilter(g.id)}>
                <span className="ef-tab-ic">{g.icon}</span>
                <span>{g.label}</span>
                <span className="ef-tab-c">{count}</span>
              </button>
            );
          })}
        </div>
        <div className="ef-view">
          <button className={view==="grid"?"on":""} onClick={()=>setView("grid")} aria-label="Grille">▦</button>
          <button className={view==="list"?"on":""} onClick={()=>setView("list")} aria-label="Liste">≡</button>
        </div>
      </div>

      {/* Result count */}
      <div className="ef-result-count">
        <span className="num">{list.length}</span>
        <em>{list.length > 1 ? "joueurs" : "joueur"}</em>
        {(search || filter !== "all" || statusFilter !== "all") && (
          <button className="ef-clear" onClick={() => {
            setSearch(""); setFilter("all"); setStatusFilter("all");
          }}>
            ✕ Effacer filtres
          </button>
        )}
      </div>

      {/* Suivi diffusion Carnet du joueur — visible quand au moins 1 joueur dans la liste */}
      {list.length > 0 && (() => {
        const sharedCount = list.filter(p => carnetShared[p.id]).length;
        const pending = list.length - sharedCount;
        const allDone = pending === 0;
        const rate = list.length > 0 ? Math.round((sharedCount / list.length) * 100) : 0;
        return (
          <div style={{
            margin:'0 14px 12px', padding:'10px 12px', borderRadius:10,
            background: allDone ? 'rgba(200,241,105,0.08)' : 'rgba(200,241,105,0.05)',
            border: `1px solid ${allDone ? 'rgba(200,241,105,0.30)' : 'rgba(200,241,105,0.15)'}`,
            display:'flex', alignItems:'center', gap:10, fontSize:12,
          }}>
            <span style={{fontSize:18}}>🎴</span>
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontWeight:800, fontSize:11.5, letterSpacing:'.04em'}}>
                {allDone
                  ? <>✓ Carnets diffusés à <b style={{color:'#c8f169'}}>tous les parents</b></>
                  : <><b style={{color:'#c8f169'}}>{sharedCount}/{list.length}</b> carnets envoyés aux parents{pending > 0 ? <span style={{opacity:0.7}}> · {pending} restant{pending>1?'s':''}</span> : null}</>}
              </div>
              {/* Mini barre progression */}
              <div style={{
                marginTop:5, height:4, borderRadius:2,
                background:'rgba(255,255,255,0.08)', overflow:'hidden',
              }}>
                <div style={{
                  width:`${rate}%`, height:'100%',
                  background:'#c8f169', transition:'width .3s',
                }}/>
              </div>
            </div>
            {!allDone && (
              <span style={{
                fontSize:10, opacity:0.7, fontStyle:'italic', flexShrink:0,
              }}>
                Touche un joueur →
              </span>
            )}
          </div>
        );
      })()}

      {list.length === 0 ? (
        <div className="ef-empty">
          <div className="ef-empty-ic">🔍</div>
          <div className="ef-empty-t">Aucun joueur trouvé</div>
          <div className="ef-empty-d">Essaie une autre recherche ou efface les filtres</div>
        </div>
      ) : view === "grid" ? (
        <div className="ef-grid">
          {list.map(p => (
            <div key={p.id} style={{position:'relative'}}>
              <FutCard player={p} size="md" onClick={() => go("fiche", p)} />
              {carnetShared[p.id] && (
                <span title={`Carnet envoyé au parent (${new Date(carnetShared[p.id].sharedAt).toLocaleDateString('fr-FR')})`}
                      style={{
                        position:'absolute', top:4, right:4, zIndex:2,
                        width:22, height:22, borderRadius:11,
                        background:'#c8f169', color:'#0B1320',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:12, fontWeight:900,
                        boxShadow:'0 2px 6px rgba(0,0,0,0.4)', pointerEvents:'none',
                      }}>🎴</span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="ef-list">
          {list.map(p => (
            <div key={p.id} style={{position:'relative'}}>
              <FutCard player={p} variant="row" onClick={() => go("fiche", p)} />
              {carnetShared[p.id] && (
                <span title={`Carnet envoyé au parent (${new Date(carnetShared[p.id].sharedAt).toLocaleDateString('fr-FR')})`}
                      style={{
                        position:'absolute', top:'50%', right:10, transform:'translateY(-50%)', zIndex:2,
                        padding:'2px 8px', borderRadius:10,
                        background:'rgba(200,241,105,0.15)', color:'#c8f169',
                        fontSize:10, fontWeight:800, letterSpacing:'.05em',
                        border:'1px solid rgba(200,241,105,0.35)', pointerEvents:'none',
                      }}>🎴 ENVOYÉ</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

window.ScreenEffectif = ScreenEffectif;


/* ============================================================
   SCREEN — Lineup (Compo)
   ============================================================ */

function ScreenLineup({ go, tweaks, matchId }) {
  const formations = Object.keys(CDD_FORMATIONS);
  // matchId optionnel : si fourni, on édite la COMPO DE MATCH (cdd_match_lineup),
  // sinon on édite la COMPO TYPE saison (cdd_lineup_template). Phase 1B 2026-05-23.
  // Permet de réutiliser le même composant pour les 2 cas sans dupliquer le code.
  const isMatchMode = !!matchId;

  // ===== Initial state — 3 listes : starters (map slotIdx→pid), bench[], reserve[] =====
  // Règle banc foot amateur : strictement 3 OU 5 remplaçants, jamais 4, jamais autre chose.
  // - Tout banc chargé invalide est snappé : <3 → top-up depuis la réserve pour atteindre 3
  // - = 4 → snap down à 3 (le 4ème retourne en tête de réserve)
  // - >= 5 → cap à 5 (surplus en tête de réserve)
  // Aussi : nettoie les IDs orphelins (joueur supprimé de l'effectif depuis la dernière sauvegarde).
  const snapBench = (bench, reserve) => {
    const allPlayers = window.CDD_PLAYERS || [];
    const playerExists = (pid) => allPlayers.some(p => p.id === pid);
    // 1. Garde uniquement les joueurs qui existent encore (cas effectif modifié depuis la sauvegarde)
    let cleanBench   = (bench || []).filter(playerExists);
    let cleanReserve = (reserve || []).filter(playerExists);
    // 2. Top-up si banc < 3 : on pioche dans la réserve les premiers joueurs disponibles
    if (cleanBench.length < 3 && cleanReserve.length > 0) {
      const benchSet = new Set(cleanBench);
      const needed = 3 - cleanBench.length;
      const toAdd = cleanReserve.filter(pid => !benchSet.has(pid)).slice(0, needed);
      cleanBench = [...cleanBench, ...toAdd];
      cleanReserve = cleanReserve.filter(pid => !toAdd.includes(pid));
    }
    // 3. Snap down si banc = 4
    if (cleanBench.length === 4) {
      return { bench: cleanBench.slice(0, 3), reserve: [cleanBench[3], ...cleanReserve] };
    }
    // 4. Cap à 5 si banc >= 5
    if (cleanBench.length >= 5) {
      return { bench: cleanBench.slice(0, 5), reserve: [...cleanBench.slice(5), ...cleanReserve] };
    }
    return { bench: cleanBench, reserve: cleanReserve };
  };
  // Helper de validation d'un lineup sauvegardé. Retourne un objet
  // { formation, starters, bench, reserve } valide, ou null si KO.
  const validateAndSnap = (s, activeTeam) => {
    if (!s || !s.formation || !s.starters || !Array.isArray(s.bench) || !Array.isArray(s.reserve)) return null;
    let formation = s.formation;
    if (!CDD_FORMATIONS[formation]) {
      formation = (s.basedOn && CDD_FORMATIONS[s.basedOn]) ? s.basedOn : '4-3-3';
    }
    const snapped = snapBench(s.bench, s.reserve);
    return { formation, starters: s.starters, bench: snapped.bench, reserve: snapped.reserve };
  };

  const buildInitial = () => {
    const activeTeam = window.CDD?.getActiveTeam?.();
    // Mode MATCH : lire d'abord cdd_match_lineup[tid][mid]. Si vide, on
    // HÉRITE de la compo type (cdd_lineup_template[tid]) — le coach n'a
    // pas à tout refaire à la main, juste à ajuster pour ce match.
    if (isMatchMode && activeTeam) {
      try {
        const allM = JSON.parse(localStorage.getItem('cdd_match_lineup') || '{}');
        const ml = allM[activeTeam.id] && allM[activeTeam.id][matchId];
        const validated = validateAndSnap(ml, activeTeam);
        if (validated) return validated;
      } catch (e) {}
      // Hériter de la compo type au premier accès à la compo match.
      try {
        const allT = JSON.parse(localStorage.getItem('cdd_lineup_template') || '{}');
        const s = allT[activeTeam.id];
        const validated = validateAndSnap(s, activeTeam);
        if (validated) return validated;
      } catch (e) {}
    }
    // Mode COMPO TYPE (et fallback si match mode trouve rien) :
    // 1. localStorage cdd_lineup_template
    if (!isMatchMode) {
      try {
        const all = JSON.parse(localStorage.getItem('cdd_lineup_template') || '{}');
        const s = activeTeam && all[activeTeam.id];
        const validated = validateAndSnap(s, activeTeam);
        if (validated) {
          // ⚠️ Auto-corrige le localStorage si formation invalide.
          if (s.formation !== validated.formation) {
            try {
              all[activeTeam.id] = { ...s, formation: validated.formation };
              localStorage.setItem('cdd_lineup_template', JSON.stringify(all));
            } catch (e) {}
          }
          return validated;
        }
      } catch (e) {}
    }
    // 2. FFF lineupTemplate sinon isStarter
    const formation = '4-3-3';
    const slots = CDD_FORMATIONS[formation];
    const tpl = activeTeam?.lineupTemplate;
    const startersIds = (tpl?.startersIds && tpl.startersIds.length)
      ? tpl.startersIds
      : CDD_PLAYERS.filter(p => p.isStarter).slice(0, slots.length).map(p => p.id);
    const starters = {};
    startersIds.slice(0, slots.length).forEach((pid, i) => { starters[i] = pid; });
    const used = new Set(Object.values(starters));
    const benchArr = CDD_PLAYERS.filter(p => !used.has(p.id) && p.status !== 'reserve').slice(0, 3).map(p => p.id);
    benchArr.forEach(pid => used.add(pid));
    const reserveArr = CDD_PLAYERS.filter(p => !used.has(p.id)).map(p => p.id);
    return { formation, starters, bench: benchArr, reserve: reserveArr };
  };

  const [lineup, setLineup] = useState(buildInitial);
  const [selection, setSelection] = useState(null);  // { type:'slot'|'bench'|'reserve', idx?, pid? }
  const [saved, setSaved] = useState(false);
  const [showFormationPicker, setShowFormationPicker] = useState(false);
  const [reserveSearch, setReserveSearch] = useState('');

  // Modale numéros maillots match-specific (visible seulement en mode match)
  const [jerseyModalOpen, setJerseyModalOpen] = useState(false);

  // Phase 1D — détecte si la compo TYPE saison est plus récente que la compo
  // de MATCH. Dans ce cas on affiche une bannière d'avertissement.
  const [templateNewer, setTemplateNewer] = useState(() => {
    if (!isMatchMode || !matchId) return false;
    try {
      const activeTeam = window.CDD?.getActiveTeam?.();
      if (!activeTeam) return false;
      const allM = JSON.parse(localStorage.getItem('cdd_match_lineup') || '{}');
      const ml = allM[activeTeam.id]?.[matchId];
      const allT = JSON.parse(localStorage.getItem('cdd_lineup_template') || '{}');
      const tpl = allT[activeTeam.id];
      if (!ml || !tpl) return false;
      return (tpl.updatedAt || 0) > (ml.updatedAt || 0);
    } catch (e) { return false; }
  });

  // #C5 — composer l'équipe = capacité 'compo'. Parent / joueur / lecteur
  // consultent la compo sans pouvoir la modifier. Fallback éditable si le
  // module rôles n'est pas chargé (ne jamais bloquer le coach).
  const canEdit = !window.CDD_ROLES || !window.CDD_ROLES.canDo
    || window.CDD_ROLES.canDo('compo');

  // Garde-fou : si lineup.formation est inconnue, prendre 4-3-3 par défaut (12 emplacements)
  const slots = CDD_FORMATIONS[lineup.formation] || CDD_FORMATIONS['4-3-3'];
  const playerOf = (pid) => pid && CDD_PLAYERS.find(p => p.id === pid);
  const starterPlayers = slots.map((_, i) => playerOf(lineup.starters[i])).filter(Boolean);
  const benchPlayers = lineup.bench.map(pid => playerOf(pid)).filter(Boolean);
  const reservePlayers = lineup.reserve.map(pid => playerOf(pid)).filter(Boolean);

  // Affichage du num : en mode MATCH, on lit l'override match-specific.
  // En mode COMPO TYPE SAISON, on garde le num saison (les overrides ne
  // doivent jamais "polluer" l'édition de la compo type).
  const _activeTeamId = window.CDD?.getActiveTeam?.()?.id;
  const displayNum = (p) => {
    if (!p) return null;
    if (isMatchMode && matchId && _activeTeamId && window.CDD_JERSEY?.getNum) {
      return window.CDD_JERSEY.getNum(_activeTeamId, matchId, p.id, p.num);
    }
    return p.num;
  };
  const teamOvr = starterPlayers.length ? Math.round(starterPlayers.reduce((s,p)=>s+(p.stats?.ovr||0),0)/starterPlayers.length) : 0;
  const allFilled = starterPlayers.length === slots.length;
  const selectedPlayerName = (() => {
    if (!selection) return null;
    if (selection.type === 'slot') {
      const p = playerOf(lineup.starters[selection.idx]);
      return p ? `${p.first} ${p.last}` : `Slot ${selection.idx+1} (vide)`;
    }
    const p = playerOf(selection.pid);
    return p ? `${p.first} ${p.last}` : 'Inconnu';
  })();

  // Persist + rebuild des globaux + push cloud (3 niveaux de cohérence).
  // 1) localStorage : immédiat, pour persistence locale.
  // 2) CDD_REBUILD() : debounced 400ms, pour que Mode Vestiaire et tous
  //    les autres écrans de CE tel voient la nouvelle compo sans recharger.
  // 3) Firestore saveLineupTemplate : debounced 400ms, pour que tous les
  //    autres comptes (adjoints, parents, joueurs, lecteurs) voient la
  //    même compo au prochain pullCloudData. C'est le « partage cloud de
  //    la compo » demandé par Florian 2026-05-23 (« quand je clique VISUEL
  //    COMPO, ça devrait pousser au cloud »).
  useEffect(() => {
    const activeTeam = window.CDD?.getActiveTeam?.();
    if (!activeTeam) return;
    try {
      if (isMatchMode) {
        // Sauvegarde dans cdd_match_lineup[teamId][matchId] + push cloud
        // via saveMatchLineup. La compo TYPE saison reste intacte.
        const allM = JSON.parse(localStorage.getItem('cdd_match_lineup') || '{}');
        if (!allM[activeTeam.id]) allM[activeTeam.id] = {};
        allM[activeTeam.id][matchId] = { ...lineup, updatedAt: Date.now() };
        localStorage.setItem('cdd_match_lineup', JSON.stringify(allM));
        setSaved(true);
        const t1 = setTimeout(() => setSaved(false), 1400);
        const t2 = setTimeout(() => {
          if (window.CDD_REBUILD) window.CDD_REBUILD();
          window.dispatchEvent(new CustomEvent('cdd-data-rebuilt'));
          if (window.cddData && window.cddData.saveMatchLineup) {
            window.cddData.saveMatchLineup(activeTeam.id, matchId, allM[activeTeam.id][matchId], activeTeam.clubId)
              .catch(e => console.warn('[match-lineup] sync cloud', e.message));
          }
        }, 400);
        return () => { clearTimeout(t1); clearTimeout(t2); };
      }
      // Mode COMPO TYPE (comportement existant)
      const all = JSON.parse(localStorage.getItem('cdd_lineup_template') || '{}');
      all[activeTeam.id] = { ...lineup, updatedAt: Date.now() };
      localStorage.setItem('cdd_lineup_template', JSON.stringify(all));
      setSaved(true);
      const t1 = setTimeout(() => setSaved(false), 1400);
      const t2 = setTimeout(() => {
        if (window.CDD_REBUILD) window.CDD_REBUILD();
        window.dispatchEvent(new CustomEvent('cdd-data-rebuilt'));
        // Push cloud fire-and-forget — les autres comptes recevront cette
        // compo à leur prochain login / pull cloud / rafraîchissement.
        if (window.cddData && window.cddData.saveLineupTemplate && activeTeam.id) {
          window.cddData.saveLineupTemplate(activeTeam.id, all[activeTeam.id])
            .catch(e => console.warn('[lineup] sync cloud', e.message));
        }
      }, 400);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    } catch (e) {}
  }, [lineup]);

  // Change formation
  const changeFormation = (newF) => {
    if (!canEdit) return;
    const newSlots = CDD_FORMATIONS[newF];
    const currentIds = Object.keys(lineup.starters).sort((a,b) => +a - +b).map(k => lineup.starters[k]).filter(Boolean);
    const newStarters = {};
    currentIds.slice(0, newSlots.length).forEach((pid, i) => { newStarters[i] = pid; });
    const benchCopy = [...lineup.bench];
    for (let i = 0; i < newSlots.length; i++) {
      if (!newStarters[i] && benchCopy.length > 0) newStarters[i] = benchCopy.shift();
    }
    const demoted = currentIds.slice(newSlots.length);
    setLineup({ ...lineup, formation: newF, starters: newStarters, bench: [...demoted, ...benchCopy] });
    setSelection(null);
    setShowFormationPicker(false);
  };

  // Tap logic unifié
  const sameTarget = (a, b) => {
    if (!a || !b) return false;
    if (a.type !== b.type) return false;
    if (a.type === 'slot') return a.idx === b.idx;
    return a.pid === b.pid;
  };
  const handleTap = (target) => {
    if (!canEdit) return;
    if (!selection) { setSelection(target); return; }
    if (sameTarget(selection, target)) { setSelection(null); return; }
    setLineup(l => doSwap(l, selection, target));
    setSelection(null);
  };
  const doSwap = (l, a, b) => {
    const next = { ...l, starters: {...l.starters}, bench: [...l.bench], reserve: [...l.reserve] };
    // slot↔slot
    if (a.type === 'slot' && b.type === 'slot') {
      const va = next.starters[a.idx], vb = next.starters[b.idx];
      if (va) next.starters[a.idx] = vb; else delete next.starters[a.idx];
      if (vb) next.starters[b.idx] = va; else delete next.starters[b.idx];
      if (!va) delete next.starters[b.idx];
      if (!vb) delete next.starters[a.idx];
      if (va !== undefined) next.starters[b.idx] = va;
      if (vb !== undefined) next.starters[a.idx] = vb;
      return next;
    }
    // bench↔bench
    if (a.type === 'bench' && b.type === 'bench') {
      const ia = next.bench.indexOf(a.pid), ib = next.bench.indexOf(b.pid);
      if (ia >= 0 && ib >= 0) { [next.bench[ia], next.bench[ib]] = [next.bench[ib], next.bench[ia]]; }
      return next;
    }
    // reserve↔reserve
    if (a.type === 'reserve' && b.type === 'reserve') {
      const ia = next.reserve.indexOf(a.pid), ib = next.reserve.indexOf(b.pid);
      if (ia >= 0 && ib >= 0) { [next.reserve[ia], next.reserve[ib]] = [next.reserve[ib], next.reserve[ia]]; }
      return next;
    }
    // Normaliser : slot toujours en premier
    let s = a.type === 'slot' ? a : (b.type === 'slot' ? b : null);
    let o = s === a ? b : (s === b ? a : null);
    if (s && o && (o.type === 'bench' || o.type === 'reserve')) {
      const slotPid = next.starters[s.idx];
      const otherList = o.type === 'bench' ? next.bench : next.reserve;
      const i = otherList.indexOf(o.pid);
      next.starters[s.idx] = o.pid;
      if (i >= 0) {
        if (slotPid) otherList[i] = slotPid;
        else otherList.splice(i, 1);
      } else if (slotPid) {
        otherList.push(slotPid);
      }
      return next;
    }
    // bench↔reserve
    if ((a.type === 'bench' && b.type === 'reserve') || (a.type === 'reserve' && b.type === 'bench')) {
      const benchSel = a.type === 'bench' ? a : b;
      const resSel   = a.type === 'reserve' ? a : b;
      const ib = next.bench.indexOf(benchSel.pid);
      const ir = next.reserve.indexOf(resSel.pid);
      if (ib >= 0 && ir >= 0) { next.bench[ib] = resSel.pid; next.reserve[ir] = benchSel.pid; }
      return next;
    }
    return l;
  };

  // Retirer du terrain → réserve
  const removeFromPitch = (slotIdx) => {
    if (!canEdit) return;
    setLineup(l => {
      const next = { ...l, starters: {...l.starters}, bench: [...l.bench], reserve: [...l.reserve] };
      const pid = next.starters[slotIdx];
      if (pid) {
        delete next.starters[slotIdx];
        if (!next.reserve.includes(pid) && !next.bench.includes(pid)) next.reserve.push(pid);
      }
      return next;
    });
    setSelection(null);
  };

  // Reset formation initial
  const resetLineup = () => {
    if (!canEdit) return;
    if (!confirm("Réinitialiser la compo aux titulaires FFF ?")) return;
    const activeTeam = window.CDD?.getActiveTeam?.();
    try {
      const all = JSON.parse(localStorage.getItem('cdd_lineup_template') || '{}');
      if (activeTeam && all[activeTeam.id]) {
        delete all[activeTeam.id];
        localStorage.setItem('cdd_lineup_template', JSON.stringify(all));
      }
    } catch (e) {}
    setLineup(buildInitial());
    setSelection(null);
  };

  // Phase 1D — Adopter la compo de match comme compo type saison
  const adoptAsTemplate = () => {
    if (!canEdit) return;
    if (!confirm('Adopter cette compo de match comme compo type saison ?\n\nLa compo type actuelle sera remplacée par cette version.')) return;
    const activeTeam = window.CDD?.getActiveTeam?.();
    if (!activeTeam) return;
    try {
      const all = JSON.parse(localStorage.getItem('cdd_lineup_template') || '{}');
      all[activeTeam.id] = { ...lineup, updatedAt: Date.now() };
      localStorage.setItem('cdd_lineup_template', JSON.stringify(all));
      if (window.CDD_REBUILD) window.CDD_REBUILD();
      window.dispatchEvent(new CustomEvent('cdd-data-rebuilt'));
      if (window.cddData?.saveLineupTemplate) {
        window.cddData.saveLineupTemplate(activeTeam.id, all[activeTeam.id])
          .catch(e => console.warn('[lineup] cloud push adopt', e.message));
      }
      setTemplateNewer(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 1400);
    } catch (e) {}
  };

  // Phase 1D — Réinitialiser la compo de match depuis la compo type saison
  const resetFromTemplate = () => {
    if (!canEdit) return;
    if (!confirm('Réinitialiser la compo de match depuis la compo type ?\n\nTes modifications pour ce match seront perdues.')) return;
    const activeTeam = window.CDD?.getActiveTeam?.();
    if (!activeTeam) return;
    try {
      const allT = JSON.parse(localStorage.getItem('cdd_lineup_template') || '{}');
      const s = allT[activeTeam.id];
      const validated = validateAndSnap(s, activeTeam);
      if (validated) {
        setLineup(validated);
        setTemplateNewer(false);
        setSelection(null);
      }
    } catch (e) {}
  };

  // Selection helpers
  const isSlotSelected = (i) => selection?.type === 'slot' && selection.idx === i;
  const isPidSelected  = (pid) => (selection?.type === 'bench' || selection?.type === 'reserve') && selection?.pid === pid;

  // Reserve search filter
  const reserveFiltered = !reserveSearch.trim() ? reservePlayers : reservePlayers.filter(p => {
    const q = reserveSearch.toLowerCase();
    return (p.first + ' ' + p.last + ' ' + (p.num||'')).toLowerCase().includes(q);
  });

  return (
    <div className="scr scr-lineup fade-in" data-screen-label="03 Lineup">

      {/* Bandeau d'identité écran : orange en mode match, neutre en mode compo type */}
      {isMatchMode && (
        <div style={{
          margin:'10px 14px 0', padding:'9px 13px', borderRadius:10,
          background:'linear-gradient(135deg, rgba(249,115,22,0.14) 0%, rgba(249,115,22,0.06) 100%)',
          border:'1px solid rgba(249,115,22,0.40)', color:'#f97316',
          fontSize:12, fontWeight:700, letterSpacing:'.04em',
          display:'flex', alignItems:'center', gap:8,
        }}>
          <span style={{fontSize:14}}>🎯</span>
          <span>COMPO DU MATCH — spécifique à ce match (la compo type saison n'est pas modifiée)</span>
        </div>
      )}

      <div className="cl-quick-actions" style={{
        display:'flex', gap:8, padding:'10px 14px 0',
      }}>
        <button className="tv-btn" onClick={() => go("tactique")}
                style={{flex:1, fontSize:13}}>
          🎬 TACTIQUE
        </button>
        <button className="tv-btn"
                onClick={() => {
                  // Rebuild immédiat + push cloud forcé avant navigation.
                  // Garantit que (a) le Mode Vestiaire de CE tel voit la
                  // compo à jour, (b) tous les autres comptes (adjoints,
                  // parents) la verront aussi au prochain pull cloud.
                  if (window.CDD_REBUILD) window.CDD_REBUILD();
                  try {
                    const at = window.CDD?.getActiveTeam?.();
                    if (isMatchMode) {
                      // Mode match : la sauvegarde est faite en continu par le useEffect
                      // sur 'cdd_match_lineup'. Pas besoin de push template ici.
                    } else if (at?.id && window.cddData?.saveLineupTemplate) {
                      const all = JSON.parse(localStorage.getItem('cdd_lineup_template') || '{}');
                      if (all[at.id]) {
                        window.cddData.saveLineupTemplate(at.id, all[at.id])
                          .catch(e => console.warn('[lineup] cloud push', e.message));
                      }
                    }
                  } catch (e) {}
                  // Mode match → Vestiaire match. Mode saison → Vestiaire compo type.
                  go(isMatchMode ? "tv-match" : "tv");
                }}
                style={{
                  flex:1, fontSize:13,
                  ...(isMatchMode ? {
                    background:'rgba(249,115,22,0.12)',
                    border:'1px solid rgba(249,115,22,0.40)',
                    color:'#f97316',
                  } : {}),
                }}>
          📷 VISUEL COMPO
        </button>
      </div>

      {/* Phase 1D — Barre d'actions compo match (visible seulement en mode match) */}
      {isMatchMode && canEdit && (
        <div style={{
          display:'flex', gap:8, padding:'8px 14px 0', flexWrap:'wrap',
        }}>
          <button
            onClick={adoptAsTemplate}
            title="Copier cette compo de match → compo type saison"
            style={{
              flex:1, padding:'8px 10px', borderRadius:9, cursor:'pointer',
              background:'rgba(200,241,105,0.10)', color:'#c8f169',
              border:'1px solid rgba(200,241,105,0.35)',
              fontSize:12, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:5,
            }}>
            📌 Adopter comme compo type
          </button>
          <button
            onClick={resetFromTemplate}
            title="Réinitialiser depuis la compo type saison"
            style={{
              flex:1, padding:'8px 10px', borderRadius:9, cursor:'pointer',
              background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.75)',
              border:'1px solid rgba(255,255,255,0.15)',
              fontSize:12, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:5,
            }}>
            ↻ Reset depuis compo type
          </button>
          <button
            onClick={() => setJerseyModalOpen(true)}
            title="Éditer les numéros maillots pour ce match"
            style={{
              flex:'1 1 100%', padding:'8px 10px', borderRadius:9, cursor:'pointer',
              background:'rgba(249,115,22,0.10)', color:'#f97316',
              border:'1px solid rgba(249,115,22,0.35)',
              fontSize:12, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:6,
            }}>
            🔢 Numéros maillots du match
            {_activeTeamId && window.CDD_JERSEY?.hasOverrides?.(_activeTeamId, matchId) && (
              <span style={{
                fontSize:10, padding:'2px 7px', borderRadius:10,
                background:'rgba(249,115,22,0.25)', fontWeight:800,
              }}>modifiés ✓</span>
            )}
          </button>
        </div>
      )}

      {/* Phase 1D — Bannière : la compo type a évolué APRÈS la compo match */}
      {isMatchMode && templateNewer && (
        <div style={{
          margin:'8px 14px 0', padding:'10px 14px', borderRadius:10,
          background:'rgba(249,115,22,0.10)', border:'1px solid rgba(249,115,22,0.40)',
          fontSize:12, color:'#f97316', display:'flex', alignItems:'flex-start', gap:10,
        }}>
          <span style={{fontSize:16, flexShrink:0}}>💡</span>
          <div style={{flex:1}}>
            <b>La compo type a évolué depuis que tu as posé ta compo match.</b>
            <div style={{marginTop:4, display:'flex', gap:8, flexWrap:'wrap'}}>
              <button onClick={() => setTemplateNewer(false)}
                      style={{padding:'4px 10px', borderRadius:6, border:'1px solid rgba(249,115,22,.4)',
                              background:'transparent', color:'#f97316', fontSize:11, cursor:'pointer', fontWeight:700}}>
                Garder ma compo match
              </button>
              <button onClick={resetFromTemplate}
                      style={{padding:'4px 10px', borderRadius:6, border:'none',
                              background:'rgba(249,115,22,.20)', color:'#f97316', fontSize:11, cursor:'pointer', fontWeight:700}}>
                ↻ Mettre à jour depuis la compo type
              </button>
            </div>
          </div>
        </div>
      )}

      {/* #C5 — bandeau lecture seule pour les rôles sans capacité 'compo'. */}
      {!canEdit && (
        <div style={{
          margin:'10px 14px 0', padding:'9px 13px', borderRadius:10, fontSize:12,
          background:'rgba(125,211,252,0.08)', border:'1px solid rgba(125,211,252,0.30)',
          color:'#7dd3fc', display:'flex', alignItems:'center', gap:7,
        }}>
          <span>👁</span><span>Mode lecture seule — tu peux consulter la compo, pas la modifier.</span>
        </div>
      )}

      <div className="lu-top">
        <div className="lu-top-l">
          <span className="lu-top-k">FORMATION{saved && <em className="lu-saved"> · ✓ Enregistré</em>}</span>
          <button className="lu-formation-current"
                  onClick={() => { if (canEdit) setShowFormationPicker(true); }}>
            <b>{lineup.formation}</b>
            {canEdit && <span className="lu-formation-arr">▾</span>}
          </button>
        </div>
        <div className="lu-top-r">
          <div className="lu-ovr">
            <em>OVR ÉQUIPE</em>
            <b className="num">{teamOvr}</b>
          </div>
        </div>
      </div>

      {/* Bandeau sélection */}
      {selection && (
        <div style={{
          margin:"0 14px 8px", padding:"10px 14px", borderRadius:10,
          background:"rgba(200,241,105,0.10)", border:"1px solid var(--acc, #c8f169)",
          fontSize:13, display:"flex", justifyContent:"space-between", alignItems:"center", gap:8
        }}>
          <span><b style={{color:"var(--acc, #c8f169)"}}>{selectedPlayerName}</b> sélectionné · tap un autre joueur pour échanger</span>
          <div style={{display:"flex", gap:6}}>
            {selection.type === 'slot' && lineup.starters[selection.idx] && (
              <button onClick={() => removeFromPitch(selection.idx)}
                      style={{fontSize:11, padding:"4px 10px", borderRadius:6, border:"1px solid #ff8a8a", background:"transparent", color:"#ff8a8a", cursor:"pointer"}}>
                ✕ Retirer
              </button>
            )}
            <button onClick={() => setSelection(null)}
                    style={{fontSize:11, padding:"4px 10px", borderRadius:6, border:"1px solid rgba(255,255,255,0.2)", background:"transparent", color:"#fff", cursor:"pointer"}}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Formation picker modal */}
      {showFormationPicker && (
        <div className="lu-fp-overlay" onClick={() => setShowFormationPicker(false)}>
          <div className="lu-fp-sheet" onClick={e => e.stopPropagation()}>
            <div className="lu-fp-h">
              <span className="lu-fp-t">CHOIX DE FORMATION</span>
              <button className="lu-fp-x" onClick={() => setShowFormationPicker(false)}>✕</button>
            </div>
            <div className="lu-fp-grid">
              {formations.map(f => (
                <button key={f}
                  className={`lu-fp-card ${lineup.formation===f?"on":""}`}
                  onClick={() => changeFormation(f)}>
                  <div className="lu-fp-mini">
                    <FormationDiagram formationKey={f} />
                  </div>
                  <div className="lu-fp-l">{f}</div>
                  <div className="lu-fp-d">{FORMATION_DESCRIPTIONS[f]}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="lu-pitch-wrap">
        <div className="lu-pitch">
          <svg className="lu-pitch-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <rect x="0" y="0" width="100" height="100" fill="url(#pgrad)" />
            <defs>
              <linearGradient id="pgrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#102818"/>
                <stop offset="50%" stopColor="#143a22"/>
                <stop offset="100%" stopColor="#0a1c11"/>
              </linearGradient>
            </defs>
            {[...Array(8)].map((_,i)=>(
              <rect key={i} x="0" y={i*12.5} width="100" height="12.5"
                fill={i%2 ? "rgba(255,255,255,.025)" : "rgba(0,0,0,.05)"} />
            ))}
            <g fill="none" stroke="rgba(255,255,255,.35)" strokeWidth=".35">
              <rect x="2" y="2" width="96" height="96" />
              <line x1="2" y1="50" x2="98" y2="50" />
              <circle cx="50" cy="50" r="9" />
              <circle cx="50" cy="50" r=".7" fill="rgba(255,255,255,.5)"/>
              <rect x="22" y="2" width="56" height="14"/>
              <rect x="34" y="2" width="32" height="6"/>
              <rect x="22" y="84" width="56" height="14"/>
              <rect x="34" y="92" width="32" height="6"/>
              <path d="M40,16 A12 12 0 0 0 60 16"/>
              <path d="M40,84 A12 12 0 0 1 60 84"/>
            </g>
          </svg>

          {slots.map((s, i) => {
            const pid = lineup.starters[i];
            const p = playerOf(pid);
            const isSel = isSlotSelected(i);
            const color = CDD_POS_COLOR[s.pos] || "var(--acc)";
            return (
              <button key={i}
                className={`lu-slot ${isSel?"on":""} ${p?"":"empty"}`}
                style={{ left: s.x+"%", top: s.y+"%", "--slot-c": color }}
                onClick={() => handleTap({type:'slot', idx:i})}>
                {p ? (
                  <>
                    <div className="lu-slot-num num">{displayNum(p)}</div>
                    <div className="lu-slot-name">{p.first}</div>
                    <div className="lu-slot-pos">{POSITION_LABEL[s.pos]||s.pos}</div>
                    <div className="lu-slot-ovr num">{p.stats.ovr}</div>
                  </>
                ) : (
                  <>
                    <div className="lu-slot-empty">+</div>
                    <div className="lu-slot-pos">{POSITION_LABEL[s.pos]||s.pos}</div>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="sec-h">
        <span className="t">Banc · {benchPlayers.length}</span>
        <span className="a">Tap pour permuter</span>
      </div>
      <div className="lu-bench">
        {benchPlayers.length === 0 && <div style={{padding:"10px 14px", opacity:0.5, fontSize:12}}>Aucun remplaçant — tape un joueur du terrain puis un de la réserve pour le faire entrer au banc</div>}
        {benchPlayers.map(p => (
          <button key={p.id}
            className={`lu-bench-card ${isPidSelected(p.id)?"on":""}`}
            style={isPidSelected(p.id) ? {outline:"2px solid var(--acc, #c8f169)", outlineOffset:2} : null}
            onClick={() => handleTap({type:'bench', pid:p.id})}>
            <span className="lu-bench-num num">{displayNum(p)}</span>
            <span className="lu-bench-name">{p.first}</span>
            <span className="lu-bench-pos">{POSITION_LABEL[p.pos]||p.pos}</span>
            <span className="lu-bench-ovr num">{p.stats.ovr}</span>
          </button>
        ))}
        {/* Toggle banc 3 ↔ 5 (foot amateur strict, jamais 4) — capacité 'compo' */}
        {canEdit && lineup.bench.length === 3 && lineup.reserve.length >= 2 && (
          <button
            className="lu-bench-card"
            style={{minWidth:110, justifyContent:"center", alignItems:"center", display:"flex", flexDirection:"column", gap:2, fontSize:11, fontWeight:800, color:"var(--acc, #c8f169)", borderStyle:"dashed", cursor:"pointer"}}
            title="Étendre le banc à 5 remplaçants"
            onClick={() => {
              setLineup(l => {
                if (l.bench.length !== 3 || l.reserve.length < 2) return l;
                const [pid1, pid2, ...rest] = l.reserve;
                return { ...l, bench: [...l.bench, pid1, pid2], reserve: rest };
              });
            }}>
            <span style={{fontSize:20, lineHeight:1}}>+</span>
            <span>Banc → 5</span>
          </button>
        )}
        {canEdit && lineup.bench.length === 5 && (
          <button
            className="lu-bench-card"
            style={{minWidth:110, justifyContent:"center", alignItems:"center", display:"flex", flexDirection:"column", gap:2, fontSize:11, fontWeight:800, color:"#f97316", borderStyle:"dashed", borderColor:"rgba(249,115,22,0.45)", cursor:"pointer"}}
            title="Réduire le banc à 3 remplaçants (les 2 derniers retournent en réserve)"
            onClick={() => {
              setLineup(l => {
                if (l.bench.length !== 5) return l;
                const demoted = l.bench.slice(3);
                return { ...l, bench: l.bench.slice(0, 3), reserve: [...demoted, ...l.reserve] };
              });
            }}>
            <span style={{fontSize:20, lineHeight:1}}>−</span>
            <span>Banc → 3</span>
          </button>
        )}
      </div>

      <div className="sec-h">
        <span className="t">Réserve / Non retenus · {reservePlayers.length}</span>
        <span className="a">{reserveSearch.trim() ? `${reserveFiltered.length} match` : 'Tap pour faire monter'}</span>
      </div>
      {reservePlayers.length > 5 && (
        <div style={{padding:"0 14px 10px"}}>
          <input
            type="search"
            placeholder="Rechercher dans la réserve…"
            value={reserveSearch}
            onChange={e => setReserveSearch(e.target.value)}
            style={{width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.04)", color:"#fff", fontSize:13}}
          />
        </div>
      )}
      <div className="lu-bench">
        {reserveFiltered.length === 0 && reserveSearch.trim() && <div style={{padding:"10px 14px", opacity:0.5, fontSize:12}}>Aucun joueur trouvé</div>}
        {reserveFiltered.map(p => (
          <button key={p.id}
            className={`lu-bench-card reserve ${isPidSelected(p.id)?"on":""}`}
            style={isPidSelected(p.id) ? {outline:"2px solid var(--acc, #c8f169)", outlineOffset:2} : null}
            onClick={() => handleTap({type:'reserve', pid:p.id})}>
            <span className="lu-bench-num num">{displayNum(p)}</span>
            <span className="lu-bench-name">{p.first}</span>
            <span className="lu-bench-pos">{POSITION_LABEL[p.pos]||p.pos}</span>
            <span className="lu-bench-ovr num">{p.stats.ovr}</span>
          </button>
        ))}
      </div>

      <div className="lu-actions">
        {canEdit && (
          <button className="btn-cta ghost" onClick={resetLineup} title="Réinitialiser à la compo FFF">↻ Reset</button>
        )}
        <button className="btn-cta ghost" onClick={()=>go("home")}>← Retour</button>
        <button className="btn-cta" onClick={()=>go("match")} disabled={!allFilled}>
          <span>{allFilled ? "COUP D'ENVOI" : `${slots.length - starterPlayers.length} POSTE(S) VIDE(S)`}</span>
          <span className="arr">⚽</span>
        </button>
      </div>

      {/* Modale numéros maillots — mode match seulement */}
      {jerseyModalOpen && isMatchMode && window.JerseyNumbersModal && (
        <window.JerseyNumbersModal
          teamId={_activeTeamId}
          matchId={matchId}
          players={[...starterPlayers, ...benchPlayers]}
          title="🔢 NUMÉROS MAILLOTS DU MATCH"
          onClose={() => setJerseyModalOpen(false)}
        />
      )}

    </div>
  );
}

const FORMATION_DESCRIPTIONS = {
  "4-3-3":   "Offensif · 3 attaquants",
  "4-4-2":   "Équilibré · classique",
  "4-2-3-1": "Souple · meneur de jeu",
  "5-3-2":   "Défensif · 5 derrière",
  "3-5-2":   "Milieu fort · ailiers piston",
  "4-5-1":   "Compact · 1 pointe",
  "4-1-4-1": "Sentinelle · transition",
  "3-4-3":   "Très offensif · 3 devant",
};

// Mini formation diagram for picker cards
function FormationDiagram({ formationKey }) {
  const slots = CDD_FORMATIONS[formationKey] || [];
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" width="100%" height="100%">
      <rect x="3" y="3" width="94" height="94" fill="#102818" stroke="rgba(255,255,255,.2)" strokeWidth=".4" rx="4"/>
      <line x1="3" y1="50" x2="97" y2="50" stroke="rgba(255,255,255,.15)" strokeWidth=".3"/>
      <circle cx="50" cy="50" r="7" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth=".3"/>
      {slots.map((s, i) => {
        const color = CDD_POS_COLOR[s.pos] || "#c8f169";
        return <circle key={i} cx={s.x} cy={s.y} r="3.5" fill={color} stroke="#fff" strokeWidth=".6"/>;
      })}
    </svg>
  );
}

window.ScreenLineup = ScreenLineup;
