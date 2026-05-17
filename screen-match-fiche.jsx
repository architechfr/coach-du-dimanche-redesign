/* global React, CDD_LIVE_MATCH, CDD_PLAYERS, CDD_OBSERVATIONS, FutCard, POSITION_LABEL */

/* ============================================================
   SCREEN — Match Live (broadcast)
   ============================================================ */

function ScreenMatch({ go, tweaks }) {
  const m = CDD_LIVE_MATCH;
  const [minute, setMinute] = useState(m.minute);
  const [running, setRunning] = useState(true);
  const [hScore, setHScore] = useState(m.homeScore);
  const [aScore, setAScore] = useState(m.awayScore);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setMinute(x => x + 1), 4000);
    return () => clearInterval(t);
  }, [running]);

  const ev = [...m.events].reverse();

  return (
    <div className="scr scr-match fade-in" data-screen-label="04 Match Live">

      {/* BROADCAST BAR */}
      <div className="ml-broadcast">
        <div className="ml-bb-bg"/>
        <div className="ml-bb-overlay"/>
        <div className="ml-bb-row">
          <div className="ml-bb-team ml-bb-home">
            <div className="ml-bb-badge me">M</div>
            <div className="ml-bb-name">{m.home}</div>
          </div>
          <div className="ml-bb-score">
            <span className="num">{hScore}</span>
            <i>·</i>
            <span className="num">{aScore}</span>
          </div>
          <div className="ml-bb-team ml-bb-away">
            <div className="ml-bb-name">{m.away}</div>
            <div className="ml-bb-badge them">P</div>
          </div>
        </div>

        <div className="ml-bb-timer">
          <div className="chip live">LIVE</div>
          <div className="ml-bb-min num">{minute}<span>'</span></div>
          <div className="ml-bb-half">2<sup>e</sup> MI-TEMPS</div>
          <button className="ml-bb-pause" onClick={()=>setRunning(r=>!r)}>
            {running ? "⏸" : "▶"}
          </button>
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div className="ml-actions">
        <button className="ml-act ml-act-goal" onClick={()=>setHScore(s=>s+1)}>
          <span className="ml-act-ic">⚽</span>
          <span className="ml-act-l">BUT</span>
        </button>
        <button className="ml-act ml-act-yel">
          <span className="ml-act-ic">▮</span>
          <span className="ml-act-l">JAUNE</span>
        </button>
        <button className="ml-act ml-act-red">
          <span className="ml-act-ic">▮</span>
          <span className="ml-act-l">ROUGE</span>
        </button>
        <button className="ml-act ml-act-sub">
          <span className="ml-act-ic">⇅</span>
          <span className="ml-act-l">CHANGE</span>
        </button>
      </div>

      {/* STATS BAR */}
      <div className="ml-stats">
        <div className="ml-stats-t">STATS · TEMPS RÉEL</div>
        <StatRow label="Possession" l={m.poss} r={100-m.poss} unit="%"/>
        <StatRow label="Tirs"        l={m.shots[0]} r={m.shots[1]}/>
        <StatRow label="Cadrés"      l={m.onTarget[0]} r={m.onTarget[1]}/>
        <StatRow label="Corners"     l={m.corners[0]} r={m.corners[1]}/>
        <StatRow label="Fautes"      l={m.fouls[0]} r={m.fouls[1]}/>
      </div>

      {/* TIMELINE */}
      <div className="sec-h"><span className="t">Timeline</span><span className="a">{ev.length} événements</span></div>
      <div className="ml-timeline">
        {ev.map((e, i) => (
          <div className={`ml-ev ml-ev-${e.type} ml-ev-${e.side}`} key={i}>
            <div className="ml-ev-min num">{e.min}<i>'</i></div>
            <div className="ml-ev-spine">
              <div className="ml-ev-dot"/>
              {i < ev.length-1 && <div className="ml-ev-line"/>}
            </div>
            <div className="ml-ev-body">
              <div className="ml-ev-head">
                <span className={`ml-ev-tag ml-ev-tag-${e.type}`}>
                  {e.type === "goal" ? "BUT" :
                   e.type === "yellow" ? "JAUNE" :
                   e.type === "red" ? "ROUGE" :
                   e.type === "sub" ? "REMPLACEMENT" :
                   e.type === "half" ? "MI-TEMPS" : "INFO"}
                </span>
                {e.player && <span className="ml-ev-player">{e.player}</span>}
              </div>
              {e.desc && <div className="ml-ev-desc">{e.desc}</div>}
              {e.assist && <div className="ml-ev-assist">Passe décisive · {e.assist}</div>}
            </div>
          </div>
        ))}
      </div>

      <div className="ml-end">
        <button className="btn-cta ghost" onClick={()=>go("fiche-match")}>
          FIN DE MATCH · FEUILLE
        </button>
      </div>
    </div>
  );
}

function StatRow({ label, l, r, unit }) {
  const total = (l + r) || 1;
  const lp = (l / total) * 100;
  return (
    <div className="ml-srow">
      <span className="num l">{l}{unit||""}</span>
      <div className="ml-sbar">
        <div className="ml-sbar-l" style={{width: lp+"%"}}/>
        <div className="ml-sbar-r" style={{width: (100-lp)+"%"}}/>
      </div>
      <span className="num r">{r}{unit||""}</span>
      <span className="ml-srow-lbl">{label}</span>
    </div>
  );
}

window.ScreenMatch = ScreenMatch;


/* ============================================================
   SCREEN — Fiche Joueur (Player profile + radar)
   ============================================================ */

function ScreenFiche({ go, tweaks, player }) {
  const p = player || CDD_PLAYERS[0]; // default first player
  if (!p) return <div className="fi-empty">Aucun joueur</div>;
  const stats = p.stats;
  const [tab, setTab] = useState("stats");
  const obs = CDD_OBSERVATIONS[p.id] || [];

  // Radar 6 axes
  const radarPts = useMemo(() => {
    const axes = [stats.PAC, stats.SHO, stats.PAS, stats.DRI, stats.DEF, stats.PHY];
    return axes.map((v, i) => {
      const ang = (Math.PI * 2 * i) / axes.length - Math.PI/2;
      const r = (v / 99) * 80;
      return { x: 100 + Math.cos(ang) * r, y: 100 + Math.sin(ang) * r, v, ang };
    });
  }, [stats]);

  const radarPath = radarPts.map((p,i)=>(i?"L":"M")+p.x+","+p.y).join(" ") + "Z";
  const axisLabels = ["VIT","TIR","PAS","DRI","DEF","PHY"];

  return (
    <div className="scr scr-fiche fade-in" data-screen-label="05 Fiche Joueur">

      {/* ─── HERO V2: card on top, identity below, no name duplication ─── */}
      <div className="fi-hero-v2">
        <div className="fi-hero-bg"/>
        <div className="fi-hero-grad"/>

        {/* OVR ring backdrop — a giant decorative number */}
        <div className="fi-hero-ovr-ghost num">{p.stats.ovr}</div>

        <div className="fi-hero-card-wrap">
          <FutCard player={p} size="lg" />
        </div>

        <div className="fi-id">
          <div className="fi-id-row">
            <span className="fi-id-num">#{p.num}</span>
            <span className="fi-id-pos">{p.posLabel || POSITION_LABEL[p.pos] || p.pos}</span>
            <span className="fi-id-ovr"><b className="num">{p.stats.ovr}</b><em>OVR</em></span>
          </div>
          <div className="fi-id-name" onClick={() => setEditingName(true)} title="Cliquer pour modifier">
            <span className="fi-id-first">{p.first}</span>
            <h1 className="fi-id-last">{p.last} <span className="fi-id-edit-ic">✎</span></h1>
          </div>
          <div className="fi-id-meta">
            <span><b>{p.age}</b> ans</span>
            <span className="dot">·</span>
            <span>{p.height} cm</span>
            <span className="dot">·</span>
            <span>Pied {p.foot}</span>
          </div>

          {/* Status chips — clickable */}
          <div className="fi-chips">
            <button className={`fi-chip ${statusObj.cls} fi-chip-btn`}
                    onClick={() => setShowStatusPicker(true)}
                    title="Changer le statut">
              {statusObj.l} <span className="fi-chip-edit">✎</span>
            </button>
            {p.license && <span className="fi-chip info">Licence FFF</span>}
            {p.isStarter && <span className="fi-chip ok">★ Titulaire</span>}
          </div>
        </div>
      </div>

      {/* Status picker overlay */}
      {showStatusPicker && (
        <div className="fi-sp-overlay" onClick={() => setShowStatusPicker(false)}>
          <div className="fi-sp-sheet" onClick={e => e.stopPropagation()}>
            <div className="fi-sp-h">
              <span className="fi-sp-t">STATUT DE {p.first?.toUpperCase()}</span>
              <button className="fi-sp-x" onClick={() => setShowStatusPicker(false)}>✕</button>
            </div>
            <div className="fi-sp-list">
              {window.CDD_COACH.STATUS_OPTIONS.map(s => (
                <button key={s.id}
                  className={`fi-sp-opt fi-sp-opt-${s.cls} ${currentStatus===s.id?'on':''}`}
                  onClick={() => {
                    window.CDD_COACH.setStatusOverride(p.id, s.id);
                    setShowStatusPicker(false);
                    triggerRefresh();
                  }}>
                  <span className="fi-sp-l">{s.l}</span>
                  {currentStatus === s.id && <span className="fi-sp-tick">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Name editor overlay */}
      {editingName && (
        <div className="fi-sp-overlay" onClick={() => setEditingName(false)}>
          <div className="fi-sp-sheet" onClick={e => e.stopPropagation()}>
            <div className="fi-sp-h">
              <span className="fi-sp-t">MODIFIER LE NOM</span>
              <button className="fi-sp-x" onClick={() => setEditingName(false)}>✕</button>
            </div>
            <div className="fi-ne-form">
              <label className="fi-ne-l">
                <span>Prénom</span>
                <input className="fi-ne-i" value={editFirst}
                       onChange={e => setEditFirst(e.target.value)}/>
              </label>
              <label className="fi-ne-l">
                <span>Nom de famille</span>
                <input className="fi-ne-i" value={editLast}
                       onChange={e => setEditLast(e.target.value)}/>
              </label>
              <div className="fi-ne-info">
                Tu peux corriger les fautes de la base FFF. Ces changements restent locaux.
              </div>
              <div className="fi-ne-actions">
                <button className="fi-attrs-btn-reset" onClick={() => {
                  window.CDD_COACH.resetName(p.id);
                  setEditFirst(p.raw?.firstName || '');
                  setEditLast(p.raw?.lastName || '');
                  setEditingName(false);
                  triggerRefresh();
                }}>Reset FFF</button>
                <button className="fi-attrs-btn-done" onClick={() => {
                  window.CDD_COACH.setNameOverride(p.id, editFirst, editLast);
                  setEditingName(false);
                  triggerRefresh();
                }}>Enregistrer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Licence FFF block (real data) ─── */}
      {p.license && (
        <div className="fi-licence">
          <div className="fi-licence-l">
            <div className="fi-licence-k">LICENCE FFF</div>
            <div className="fi-licence-n mono">{p.license}</div>
          </div>
          <div className="fi-licence-r">
            <div><em>Catégorie</em><b>{p.raw?.categorie || 'U15'}</b></div>
            {p.raw?.dateNaissance && <div><em>Né(e) le</em><b className="num">{p.raw.dateNaissance}</b></div>}
            {p.raw?.dernierClubQuitte && (
              <div className="fi-licence-prev">
                <em>Ex-club</em>
                <b>{(p.raw.dernierClubQuitte+'').replace(/^\d{4}\s/, '')}</b>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="fi-tabs">
        {[
          {id:"stats", l:"Stats"},
          {id:"saison", l:"Saison"},
          {id:"obs",  l:"Observations"},
        ].map(t => (
          <button key={t.id} className={`fi-tab ${tab===t.id?"on":""}`} onClick={()=>setTab(t.id)}>
            {t.l}
          </button>
        ))}
      </div>

      {tab === "stats" && (
        <div className="fi-stats-tab">
          {/* Radar */}
          <div className="fi-radar">
            <svg viewBox="0 0 200 200" width="100%" height="100%">
              <defs>
                <radialGradient id="rgrad">
                  <stop offset="0%" stopColor="var(--acc)" stopOpacity=".5"/>
                  <stop offset="100%" stopColor="var(--acc)" stopOpacity=".05"/>
                </radialGradient>
              </defs>
              {/* concentric */}
              {[20, 40, 60, 80].map(r => (
                <polygon key={r}
                  points={[0,1,2,3,4,5].map(i => {
                    const a = (Math.PI*2*i)/6 - Math.PI/2;
                    return (100 + Math.cos(a)*r) + "," + (100 + Math.sin(a)*r);
                  }).join(" ")}
                  fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="1"/>
              ))}
              {/* axes */}
              {[0,1,2,3,4,5].map(i => {
                const a = (Math.PI*2*i)/6 - Math.PI/2;
                return <line key={i} x1="100" y1="100"
                  x2={100+Math.cos(a)*80} y2={100+Math.sin(a)*80}
                  stroke="rgba(255,255,255,.08)" strokeWidth="1"/>;
              })}
              {/* value polygon */}
              <path d={radarPath} fill="url(#rgrad)" stroke="var(--acc)" strokeWidth="1.5"/>
              {/* dots */}
              {radarPts.map((pt,i) => (
                <circle key={i} cx={pt.x} cy={pt.y} r="3" fill="var(--acc)" stroke="#000" strokeWidth="1"/>
              ))}
              {/* labels */}
              {axisLabels.map((l,i) => {
                const a = (Math.PI*2*i)/6 - Math.PI/2;
                const lx = 100 + Math.cos(a)*94;
                const ly = 100 + Math.sin(a)*94;
                return <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
                  fontSize="10" fontWeight="800" fill="var(--tx-2)" fontFamily="var(--f-display)">
                  {l}
                </text>;
              })}
            </svg>
          </div>

          <div className="fi-attrs">
            <div className="fi-attrs-h">
              <span className="fi-attrs-k">ÉVALUATION COACH</span>
              <div className="fi-attrs-actions">
                {editingStats ? (
                  <>
                    <button className="fi-attrs-btn-reset" onClick={resetStats}>Reset</button>
                    <button className="fi-attrs-btn-done" onClick={() => setEditingStats(false)}>OK</button>
                  </>
                ) : (
                  <button className="fi-attrs-btn-edit" onClick={() => setEditingStats(true)}>✎ Éditer</button>
                )}
              </div>
            </div>
            {[
              ["VITESSE", "PAC"],
              ["TIR",     "SHO"],
              ["PASSE",   "PAS"],
              ["DRIBBLE", "DRI"],
              ["DÉFENSE", "DEF"],
              ["PHYSIQUE","PHY"],
            ].map(([lbl, k]) => {
              const v = stats[k];
              return (
                <div className="fi-attr" key={k}>
                  <span className="fi-attr-lbl">{lbl}</span>
                  {editingStats ? (
                    <input type="range" min="40" max="95" value={v}
                      className="fi-attr-range"
                      onChange={e => updateStat(k, parseInt(e.target.value))} />
                  ) : (
                    <div className="fi-attr-bar">
                      <div className="fi-attr-fill" style={{width:v+"%"}}/>
                    </div>
                  )}
                  <span className="fi-attr-v num">{v}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "saison" && (
        <div className="fi-saison">
          <div className="fi-kpi-grid">
            <div className="fi-kpi"><b className="num">{p.mins}</b><em>min jouées</em></div>
            <div className="fi-kpi acc"><b className="num">{p.goals}</b><em>buts</em></div>
            <div className="fi-kpi"><b className="num">{p.assists}</b><em>passes déc.</em></div>
            <div className="fi-kpi"><b className="num">{p.mvp}</b><em>MVP match</em></div>
            <div className="fi-kpi"><b className="num">{p.yellow}</b><em>jaunes</em></div>
            <div className="fi-kpi"><b className="num">{p.red}</b><em>rouges</em></div>
          </div>
          <div className="fi-form">
            <div className="fi-form-l">FORME · {p.form}/10</div>
            <div className="fi-form-bar">
              <div className="fi-form-fill" style={{width:(p.form*10)+"%"}}/>
            </div>
            <div className="fi-form-l">CONDITION · {p.fitness}%</div>
            <div className="fi-form-bar">
              <div className="fi-form-fill fitness" style={{width:p.fitness+"%"}}/>
            </div>
          </div>
        </div>
      )}

      {tab === "obs" && (
        <div className="fi-obs">
          <div className="fi-obs-add">
            <textarea
              className="fi-obs-input"
              placeholder="Note du coach… (entraînement, match, comportement…)"
              value={newNote}
              onChange={e => setNewNote(e.target.value)}/>
            <button
              className="fi-obs-add-btn"
              disabled={!newNote.trim()}
              onClick={() => {
                if (!newNote.trim()) return;
                window.CDD_COACH.addNote(p.id, { tag:'Coach', txt: newNote.trim() });
                setNewNote("");
                triggerRefresh();
              }}>
              + AJOUTER
            </button>
          </div>
          {obs.length === 0 ? (
            <div className="fi-empty">Pas encore d'observation. Tape ta première note ci-dessus.</div>
          ) : obs.map((o,i) => (
            <div className="fi-obs-item" key={i}>
              <div className="fi-obs-head">
                <span className="chip">{o.tag}</span>
                <span className="dim2 num">{o.date}</span>
                <button className="fi-obs-del" onClick={() => {
                  if (confirm('Supprimer cette note ?')) {
                    window.CDD_COACH.removeNote(p.id, i);
                    triggerRefresh();
                  }
                }}>×</button>
              </div>
              <div className="fi-obs-txt">{o.txt}</div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

window.ScreenFiche = ScreenFiche;
