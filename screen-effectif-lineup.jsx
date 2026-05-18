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
    list = list.filter(p => (p.raw?.status || p.status) === statusFilter);
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
        <div className="ef-banner-in">
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
              { id: "all",     l: "Tous" },
              { id: "active",  l: "✓ Dispo" },
              { id: "rest",    l: "⏸ Indispo" },
              { id: "reserve", l: "★ Réserve" },
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

      {list.length === 0 ? (
        <div className="ef-empty">
          <div className="ef-empty-ic">🔍</div>
          <div className="ef-empty-t">Aucun joueur trouvé</div>
          <div className="ef-empty-d">Essaie une autre recherche ou efface les filtres</div>
        </div>
      ) : view === "grid" ? (
        <div className="ef-grid">
          {list.map(p => (
            <FutCard key={p.id} player={p} size="md" onClick={() => go("fiche", p)} />
          ))}
        </div>
      ) : (
        <div className="ef-list">
          {list.map(p => (
            <FutCard key={p.id} player={p} variant="row" onClick={() => go("fiche", p)} />
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

function ScreenLineup({ go, tweaks }) {
  const formations = Object.keys(CDD_FORMATIONS);

  // ===== Initial state — 3 listes : starters (map slotIdx→pid), bench[], reserve[] =====
  const buildInitial = () => {
    const activeTeam = window.CDD?.getActiveTeam?.();
    // 1. localStorage cdd_lineup_template (nouveau format avec starters/bench/reserve)
    try {
      const all = JSON.parse(localStorage.getItem('cdd_lineup_template') || '{}');
      const s = activeTeam && all[activeTeam.id];
      if (s && s.formation && s.starters && Array.isArray(s.bench) && Array.isArray(s.reserve)) {
        return { formation: s.formation, starters: s.starters, bench: s.bench, reserve: s.reserve };
      }
    } catch (e) {}
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
    const benchArr = CDD_PLAYERS.filter(p => !used.has(p.id) && p.status !== 'reserve').slice(0, 7).map(p => p.id);
    benchArr.forEach(pid => used.add(pid));
    const reserveArr = CDD_PLAYERS.filter(p => !used.has(p.id)).map(p => p.id);
    return { formation, starters, bench: benchArr, reserve: reserveArr };
  };

  const [lineup, setLineup] = useState(buildInitial);
  const [selection, setSelection] = useState(null);  // { type:'slot'|'bench'|'reserve', idx?, pid? }
  const [saved, setSaved] = useState(false);
  const [showFormationPicker, setShowFormationPicker] = useState(false);
  const [reserveSearch, setReserveSearch] = useState('');

  const slots = CDD_FORMATIONS[lineup.formation];
  const playerOf = (pid) => pid && CDD_PLAYERS.find(p => p.id === pid);
  const starterPlayers = slots.map((_, i) => playerOf(lineup.starters[i])).filter(Boolean);
  const benchPlayers = lineup.bench.map(pid => playerOf(pid)).filter(Boolean);
  const reservePlayers = lineup.reserve.map(pid => playerOf(pid)).filter(Boolean);
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

  // Persist
  useEffect(() => {
    const activeTeam = window.CDD?.getActiveTeam?.();
    if (!activeTeam) return;
    try {
      const all = JSON.parse(localStorage.getItem('cdd_lineup_template') || '{}');
      all[activeTeam.id] = { ...lineup, updatedAt: Date.now() };
      localStorage.setItem('cdd_lineup_template', JSON.stringify(all));
      setSaved(true);
      const t = setTimeout(() => setSaved(false), 1400);
      return () => clearTimeout(t);
    } catch (e) {}
  }, [lineup]);

  // Change formation
  const changeFormation = (newF) => {
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

      <div className="cl-quick-actions" style={{
        display:'flex', gap:8, padding:'10px 14px 0',
      }}>
        <button className="tv-btn" onClick={() => go("compo-libre")}
                style={{flex:1, fontSize:12}}>
          🎯 COMPO LIBRE
        </button>
        <button className="tv-btn" onClick={() => go("tactique")}
                style={{flex:1, fontSize:12}}>
          🎬 TACTIQUE
        </button>
        <button className="tv-btn" onClick={() => go("tv")}
                style={{flex:1, fontSize:12}}>
          📺 TV
        </button>
      </div>

      <div className="lu-top">
        <div className="lu-top-l">
          <span className="lu-top-k">FORMATION{saved && <em className="lu-saved"> · ✓ Enregistré</em>}</span>
          <button className="lu-formation-current" onClick={() => setShowFormationPicker(true)}>
            <b>{lineup.formation}</b>
            <span className="lu-formation-arr">▾</span>
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
                    <div className="lu-slot-num num">{p.num}</div>
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
            <span className="lu-bench-num num">{p.num}</span>
            <span className="lu-bench-name">{p.first}</span>
            <span className="lu-bench-pos">{POSITION_LABEL[p.pos]||p.pos}</span>
            <span className="lu-bench-ovr num">{p.stats.ovr}</span>
          </button>
        ))}
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
            <span className="lu-bench-num num">{p.num}</span>
            <span className="lu-bench-name">{p.first}</span>
            <span className="lu-bench-pos">{POSITION_LABEL[p.pos]||p.pos}</span>
            <span className="lu-bench-ovr num">{p.stats.ovr}</span>
          </button>
        ))}
      </div>

      <div className="lu-actions">
        <button className="btn-cta ghost" onClick={resetLineup} title="Réinitialiser à la compo FFF">↻ Reset</button>
        <button className="btn-cta ghost" onClick={()=>go("home")}>← Retour</button>
        <button className="btn-cta" onClick={()=>go("match")} disabled={!allFilled}>
          <span>{allFilled ? "COUP D'ENVOI" : `${slots.length - starterPlayers.length} POSTE(S) VIDE(S)`}</span>
          <span className="arr">⚽</span>
        </button>
      </div>

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
