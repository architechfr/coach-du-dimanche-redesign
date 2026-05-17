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
  const [formation, setFormation] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('cdd_lineup_template') || '{}');
      const activeTeam = window.CDD?.getActiveTeam?.();
      if (activeTeam && saved[activeTeam.id]?.formation) return saved[activeTeam.id].formation;
    } catch (e) {}
    return "4-3-3";
  });
  const [showFormationPicker, setShowFormationPicker] = useState(false);
  const formations = Object.keys(CDD_FORMATIONS);

  // Build initial assignment: lineup-template (localStorage) > FFF lineupTemplate > fallback
  const buildInitialAssign = (formationKey) => {
    const slots = CDD_FORMATIONS[formationKey];
    const map = {};
    const activeTeam = window.CDD?.getActiveTeam?.();

    // 1. Coach's saved override (highest priority)
    try {
      const saved = JSON.parse(localStorage.getItem('cdd_lineup_template') || '{}');
      const teamCfg = activeTeam && saved[activeTeam.id];
      if (teamCfg && teamCfg.formation === formationKey && teamCfg.slots) {
        Object.assign(map, teamCfg.slots);
        return map;
      }
    } catch (e) {}

    // 2. FFF lineupTemplate
    const tpl = activeTeam?.lineupTemplate;
    if (tpl?.startersIds?.length) {
      tpl.startersIds.forEach((pid, i) => {
        if (i < slots.length) map[i] = pid;
      });
      return map;
    }

    // 3. Fallback: use isStarter players in order
    const starters = CDD_PLAYERS.filter(p => p.isStarter).slice(0, slots.length);
    starters.forEach((p, i) => { map[i] = p.id; });
    return map;
  };

  const [assign, setAssign] = useState(() => buildInitialAssign(formation));
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [saved, setSaved] = useState(false);

  // Persist assign + formation whenever they change
  useEffect(() => {
    const activeTeam = window.CDD?.getActiveTeam?.();
    if (!activeTeam) return;
    try {
      const all = JSON.parse(localStorage.getItem('cdd_lineup_template') || '{}');
      all[activeTeam.id] = { formation, slots: assign, updatedAt: Date.now() };
      localStorage.setItem('cdd_lineup_template', JSON.stringify(all));
      setSaved(true);
      const t = setTimeout(() => setSaved(false), 1400);
      return () => clearTimeout(t);
    } catch (e) {}
  }, [formation, assign]);

  // Re-build on formation change BUT keep existing player assignments if possible
  useEffect(() => {
    const newSlots = CDD_FORMATIONS[formation];
    const currentPlayers = Object.values(assign).filter(Boolean);
    const map = {};
    // Keep first N players from current assignment
    currentPlayers.slice(0, newSlots.length).forEach((pid, i) => {
      map[i] = pid;
    });
    // Fill any empty slots from the team's starters / reserve
    const used = new Set(Object.values(map));
    const available = CDD_PLAYERS.filter(p => !used.has(p.id));
    newSlots.forEach((_, i) => {
      if (!map[i] && available.length > 0) {
        const next = available.shift();
        if (next) map[i] = next.id;
      }
    });
    setAssign(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formation]);

  const slots = CDD_FORMATIONS[formation];
  const startingIds = new Set(Object.values(assign));
  const bench = CDD_PLAYERS.filter(p => !startingIds.has(p.id) && p.status !== 'reserve').slice(0, 7);
  const reserve = CDD_PLAYERS.filter(p => !startingIds.has(p.id) && p.status === 'reserve').slice(0, 6);

  const handleSlotClick = (i) => {
    if (selectedIdx === null) setSelectedIdx(i);
    else if (selectedIdx === i) setSelectedIdx(null);
    else {
      const next = { ...assign };
      [next[selectedIdx], next[i]] = [next[i], next[selectedIdx]];
      setAssign(next);
      setSelectedIdx(null);
    }
  };

  const playerOf = (i) => assign[i] ? CDD_PLAYERS.find(p => p.id === assign[i]) : null;
  const starters = slots.map((_,i) => playerOf(i)).filter(Boolean);
  const teamOvr = starters.length ? Math.round(starters.reduce((s,p)=>s+(p.stats?.ovr||0),0)/starters.length) : 0;
  const allFilled = starters.length === slots.length;

  return (
    <div className="scr scr-lineup fade-in" data-screen-label="03 Lineup">

      <div className="lu-top">
        <div className="lu-top-l">
          <span className="lu-top-k">FORMATION{saved && <em className="lu-saved"> · ✓ Enregistré</em>}</span>
          <button className="lu-formation-current" onClick={() => setShowFormationPicker(true)}>
            <b>{formation}</b>
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
                  className={`lu-fp-card ${formation===f?"on":""}`}
                  onClick={() => { setFormation(f); setShowFormationPicker(false); }}>
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
            const p = playerOf(i);
            const isSel = selectedIdx === i;
            const color = CDD_POS_COLOR[s.pos] || "var(--acc)";
            return (
              <button key={i}
                className={`lu-slot ${isSel?"on":""} ${p?"":"empty"}`}
                style={{ left: s.x+"%", top: s.y+"%", "--slot-c": color }}
                onClick={() => handleSlotClick(i)}>
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
        <span className="t">Banc · {bench.length}</span>
        <span className="a">Tap pour permuter</span>
      </div>
      <div className="lu-bench">
        {bench.map(p => (
          <button key={p.id} className="lu-bench-card">
            <span className="lu-bench-num num">{p.num}</span>
            <span className="lu-bench-name">{p.first}</span>
            <span className="lu-bench-pos">{POSITION_LABEL[p.pos]||p.pos}</span>
            <span className="lu-bench-ovr num">{p.stats.ovr}</span>
          </button>
        ))}
      </div>

      {reserve.length > 0 && (
        <>
          <div className="sec-h">
            <span className="t">Réserve · {reserve.length}</span>
            <span className="a">Non convoqués</span>
          </div>
          <div className="lu-bench">
            {reserve.map(p => (
              <button key={p.id} className="lu-bench-card reserve">
                <span className="lu-bench-num num">{p.num}</span>
                <span className="lu-bench-name">{p.first}</span>
                <span className="lu-bench-pos">{POSITION_LABEL[p.pos]||p.pos}</span>
                <span className="lu-bench-ovr num">{p.stats.ovr}</span>
              </button>
            ))}
          </div>
        </>
      )}

      <div className="lu-actions">
        <button className="btn-cta ghost" onClick={()=>go("home")}>← Retour</button>
        <button className="btn-cta" onClick={()=>go("match")} disabled={!allFilled}>
          <span>{allFilled ? "COUP D'ENVOI" : `${slots.length - starters.length} POSTE(S) VIDE(S)`}</span>
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
