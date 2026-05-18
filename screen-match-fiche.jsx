/* global React, CDD_LIVE_MATCH, CDD_PLAYERS, CDD_OBSERVATIONS, FutCard, POSITION_LABEL */

/* ScreenMatch broadcast retiré (mort code) — V2 utilise screen-match-live-v2.jsx */


/* ============================================================
   SCREEN — Fiche Joueur (Player profile + radar)
   ============================================================ */

function ScreenFiche({ go, tweaks, player }) {
  const p = player || CDD_PLAYERS[0]; // default first player
  if (!p) return <div className="fi-empty">Aucun joueur</div>;
  const stats = p.stats;
  const [tab, setTab] = useState("stats");
  const [, setRefresh] = useState(0);
  const triggerRefresh = () => setRefresh(x => x + 1);
  const obs = CDD_OBSERVATIONS[p.id] || [];

  // ----- Status override -----
  const STATUS_OPTIONS = (window.CDD_COACH && window.CDD_COACH.STATUS_OPTIONS) || [
    { id:'dispo',     l:'Disponible',  cls:'ok'  },
    { id:'indispo',   l:'Indisponible',cls:'no'  },
    { id:'reserve',   l:'Réserve',     cls:'res' },
    { id:'blesse',    l:'Blessé',      cls:'no'  },
    { id:'suspendu',  l:'Suspendu',    cls:'no'  },
  ];
  const currentStatus = (window.CDD_COACH && window.CDD_COACH.getStatus)
    ? window.CDD_COACH.getStatus(p.id) || 'dispo'
    : (p.status || 'dispo');
  const statusObj = STATUS_OPTIONS.find(s => s.id === currentStatus) || STATUS_OPTIONS[0];
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  // ----- Name override -----
  const [editingName, setEditingName] = useState(false);
  const [editFirst, setEditFirst] = useState(p.first || '');
  const [editLast,  setEditLast]  = useState(p.last  || '');

  // ----- Stats edit -----
  const [editingStats, setEditingStats] = useState(false);
  const updateStat = (key, val) => {
    if (window.CDD_COACH && window.CDD_COACH.setStatOverride) {
      window.CDD_COACH.setStatOverride(p.id, key, val);
    } else {
      // Fallback : mute en mémoire
      p.stats[key] = val;
    }
    triggerRefresh();
  };
  const resetStats = () => {
    if (window.CDD_COACH && window.CDD_COACH.resetStats) {
      window.CDD_COACH.resetStats(p.id);
    }
    setEditingStats(false);
    triggerRefresh();
  };

  // ----- Note saisie -----
  const [newNote, setNewNote] = useState('');

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
