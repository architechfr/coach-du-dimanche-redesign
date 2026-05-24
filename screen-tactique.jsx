/* global React */

/* ============================================================
   SCREEN — Module Tactique
   ============================================================
   Tableau noir interactif : joueurs draggables + ballon + flèches
   de mouvement / passes / courses. Sauvegarde de schémas nommés
   dans localStorage cdd_tactiques[teamId][].
   ============================================================ */

const { useState: useS, useRef: useR, useEffect: useE } = React;

const TAC_TOOLS = [
  { id: 'select', l: '✋ Bouger',  desc: 'Déplacer pions/ballon' },
  { id: 'move',   l: '→ Course',   desc: 'Trace une flèche pleine' },
  { id: 'pass',   l: '⇢ Passe',    desc: 'Trace une flèche pointillée' },
  { id: 'dribble',l: '↝ Dribble',  desc: 'Trace une courbe' },
  { id: 'erase',  l: '✕ Effacer',  desc: 'Tap sur un trait pour l\'effacer' },
];

// Position initiale 11 joueurs + ballon (vue terrain 100x100)
const DEFAULT_PLAYERS = [
  { id: 'p1',  num: 1,  x: 50, y: 92, label: 'GK'  },
  { id: 'p2',  num: 2,  x: 80, y: 76, label: 'DD'  },
  { id: 'p3',  num: 3,  x: 20, y: 76, label: 'DG'  },
  { id: 'p4',  num: 4,  x: 60, y: 76, label: 'DC'  },
  { id: 'p5',  num: 5,  x: 40, y: 76, label: 'DC'  },
  { id: 'p6',  num: 6,  x: 50, y: 60, label: 'MC'  },
  { id: 'p7',  num: 7,  x: 75, y: 50, label: 'MD'  },
  { id: 'p8',  num: 8,  x: 25, y: 50, label: 'MG'  },
  { id: 'p9',  num: 9,  x: 60, y: 28, label: 'BU'  },
  { id: 'p10', num: 10, x: 40, y: 28, label: 'MOC' },
  { id: 'p11', num: 11, x: 50, y: 18, label: 'BU'  },
];

const STORAGE_KEY = 'cdd_tactiques';

function getActiveTeamId() {
  try {
    const ctx = JSON.parse(localStorage.getItem('cdd_active_context') || '{}');
    return ctx.teamId || 'default';
  } catch (e) { return 'default'; }
}
function loadSchemes(teamId) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return all[teamId] || [];
  } catch (e) { return []; }
}
function saveSchemes(teamId, list) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    all[teamId] = list;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (e) {}
}

function ScreenTactique({ go, tweaks }) {
  const _canAccess = !window.CDD_ROLES || !window.CDD_ROLES.canDo || window.CDD_ROLES.canDo('compo');
  const teamId = getActiveTeamId();
  const [schemes, setSchemes] = useS(() => _canAccess ? loadSchemes(teamId) : []);
  const [editingId, setEditingId] = useS(null);

  if (!_canAccess) {
    return (
      <div className="scr fade-in" style={{display:'flex',flexDirection:'column',
        alignItems:'center',justifyContent:'center',minHeight:'60vh',gap:16}}>
        <div style={{fontSize:48}}>🔒</div>
        <div style={{fontSize:16,fontWeight:700}}>Page réservée aux coachs</div>
        <button className="tv-btn tv-btn-primary" onClick={() => go('home')}>← Retour à l'accueil</button>
      </div>
    );
  }

  if (editingId === null) {
    // ─── Liste des schémas ───
    return (
      <div className="scr scr-tac fade-in" data-screen-label="09 Tactique">
        <div className="tac-list-h">
          <div className="tac-list-title">SCHÉMAS TACTIQUES</div>
          <button className="tv-btn tv-btn-primary"
                  onClick={() => setEditingId('new')}>
            + NOUVEAU
          </button>
        </div>
        {schemes.length === 0 ? (
          <div className="tac-empty">
            <div className="tac-empty-ic">📋</div>
            <div className="tac-empty-t">Aucun schéma encore</div>
            <div className="tac-empty-d">
              Crée ton premier schéma : pressing haut, corner offensif,
              construction depuis le gardien, etc.
            </div>
            <button className="tv-btn tv-btn-primary"
                    onClick={() => setEditingId('new')}
                    style={{marginTop: 16}}>
              + CRÉER UN SCHÉMA
            </button>
          </div>
        ) : (
          <div className="tac-grid">
            {schemes.map(s => (
              <div className="tac-card" key={s.id} onClick={() => setEditingId(s.id)}>
                <div className="tac-card-mini">
                  <TacMiniPreview scheme={s}/>
                </div>
                <div className="tac-card-name">{s.name}</div>
                <div className="tac-card-meta">{new Date(s.updatedAt).toLocaleDateString('fr-FR')}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── Éditeur ───
  return <TacEditor
    teamId={teamId}
    schemeId={editingId}
    onBack={() => { setSchemes(loadSchemes(teamId)); setEditingId(null); }}
  />;
}

// Mini preview SVG pour la liste
function TacMiniPreview({ scheme }) {
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%">
      <rect width="100" height="100" fill="#1c6e35"/>
      <rect x="2" y="2" width="96" height="96" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth=".5"/>
      <line x1="2" y1="50" x2="98" y2="50" stroke="rgba(255,255,255,.4)" strokeWidth=".5"/>
      <circle cx="50" cy="50" r="8" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth=".5"/>
      {(scheme.players || []).map((p,i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#c8f169"/>
      ))}
      {(scheme.arrows || []).map((a,i) => (
        <line key={i} x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2}
              stroke="#ff8a3d" strokeWidth=".8"
              strokeDasharray={a.type === 'pass' ? '2,2' : 'none'}/>
      ))}
    </svg>
  );
}

function TacEditor({ teamId, schemeId, onBack }) {
  // Charger ou initialiser le scheme
  const initial = () => {
    if (schemeId === 'new') {
      // Reprendre la formation actuelle du lineup (cdd_lineup_template) si dispo
      let players = DEFAULT_PLAYERS.map(p => ({ ...p }));
      let basedOn = null;
      try {
        const activeTeam = window.CDD && window.CDD.getActiveTeam && window.CDD.getActiveTeam();
        if (activeTeam) {
          const all = JSON.parse(localStorage.getItem('cdd_lineup_template') || '{}');
          const lineup = all[activeTeam.id];
          if (lineup && lineup.formation) {
            // Récupérer les slots de la formation choisie
            const formationName = (lineup.formation && window.CDD_FORMATIONS && window.CDD_FORMATIONS[lineup.formation])
              ? lineup.formation
              : (lineup.basedOn && window.CDD_FORMATIONS && window.CDD_FORMATIONS[lineup.basedOn])
                ? lineup.basedOn
                : '4-3-3';
            const slots = window.CDD_FORMATIONS[formationName];
            if (slots && slots.length === 11) {
              players = slots.map((slot, i) => {
                const pid = lineup.starters && lineup.starters[i];
                const p = pid && window.CDD_PLAYERS && window.CDD_PLAYERS.find(x => x.id === pid);
                return {
                  id: 'p' + (i + 1),
                  num: (p && p.num) || (i + 1),
                  x: slot.x, y: slot.y,
                  label: (p && (p.first || '#' + p.num)) || slot.pos || '',
                };
              });
              basedOn = formationName;
            }
          }
        }
      } catch (e) { console.warn('[tactique] init from lineup KO', e); }

      return {
        id: 'sch_' + Date.now(),
        name: basedOn ? `Schéma (${basedOn})` : 'Nouveau schéma',
        formation: basedOn,
        players,
        ball: { x: 50, y: 50 },
        arrows: [],
        updatedAt: Date.now(),
      };
    }
    const list = loadSchemes(teamId);
    const s = list.find(x => x.id === schemeId);
    return s || { id: 'sch_'+Date.now(), name: 'Nouveau', players: DEFAULT_PLAYERS.map(p=>({...p})), ball:{x:50,y:50}, arrows:[], updatedAt: Date.now() };
  };

  const [scheme, setScheme] = useS(initial);
  const [tool, setTool] = useS('select');
  const [editingName, setEditingName] = useS(schemeId === 'new');
  const [drawingArrow, setDrawingArrow] = useS(null); // { x1, y1, x2, y2 }
  const [draggingId, setDraggingId] = useS(null); // 'p1'..'p11' | 'ball'
  const svgRef = useR(null);

  // Convertit coord client → coord SVG viewBox 100x100
  const svgPoint = (clientX, clientY) => {
    const svg = svgRef.current;
    if (!svg) return { x: 50, y: 50 };
    const rect = svg.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
  };

  const onDown = (e, what) => {
    e.preventDefault();
    e.stopPropagation();
    const pt = svgPoint(e.touches ? e.touches[0].clientX : e.clientX,
                         e.touches ? e.touches[0].clientY : e.clientY);
    if (tool === 'select') {
      if (what) setDraggingId(what);
    } else if (tool === 'move' || tool === 'pass' || tool === 'dribble') {
      setDrawingArrow({ type: tool, x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y });
    } else if (tool === 'erase' && what && what.startsWith('arrow:')) {
      const idx = parseInt(what.split(':')[1], 10);
      setScheme(s => ({ ...s, arrows: s.arrows.filter((_, i) => i !== idx) }));
    }
  };

  const onMove = (e) => {
    if (!draggingId && !drawingArrow) return;
    e.preventDefault();
    const pt = svgPoint(e.touches ? e.touches[0].clientX : e.clientX,
                         e.touches ? e.touches[0].clientY : e.clientY);
    if (draggingId === 'ball') {
      setScheme(s => ({ ...s, ball: pt }));
    } else if (draggingId) {
      setScheme(s => ({
        ...s,
        players: s.players.map(p => p.id === draggingId ? { ...p, x: pt.x, y: pt.y } : p)
      }));
    } else if (drawingArrow) {
      setDrawingArrow(a => ({ ...a, x2: pt.x, y2: pt.y }));
    }
  };

  const onUp = (e) => {
    if (drawingArrow) {
      const dx = drawingArrow.x2 - drawingArrow.x1;
      const dy = drawingArrow.y2 - drawingArrow.y1;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist > 3) {
        setScheme(s => ({ ...s, arrows: [...s.arrows, drawingArrow] }));
      }
      setDrawingArrow(null);
    }
    setDraggingId(null);
  };

  const saveScheme = () => {
    const list = loadSchemes(teamId);
    const updated = { ...scheme, updatedAt: Date.now() };
    const idx = list.findIndex(s => s.id === scheme.id);
    if (idx >= 0) list[idx] = updated;
    else list.push(updated);
    saveSchemes(teamId, list);
  };

  const deleteScheme = () => {
    if (!confirm('Supprimer ce schéma ?')) return;
    const list = loadSchemes(teamId).filter(s => s.id !== scheme.id);
    saveSchemes(teamId, list);
    onBack();
  };

  // Auto-save sur changements (debounced)
  useE(() => {
    const t = setTimeout(saveScheme, 600);
    return () => clearTimeout(t);
  }, [scheme]);

  return (
    <div className="scr scr-tac-editor fade-in" data-screen-label="09 Tactique">

      <div className="tac-ed-bar">
        <button className="tv-btn" onClick={onBack}>← Retour</button>
        {editingName ? (
          <input className="tac-ed-name-input"
                 value={scheme.name}
                 autoFocus
                 onChange={e => setScheme(s => ({ ...s, name: e.target.value }))}
                 onBlur={() => setEditingName(false)}
                 onKeyDown={e => { if (e.key === 'Enter') setEditingName(false); }}/>
        ) : (
          <div className="tac-ed-name" onClick={() => setEditingName(true)}>
            {scheme.name} ✎
          </div>
        )}
        <button className="tv-btn" onClick={deleteScheme} title="Supprimer"
                style={{background:'rgba(255,80,80,.12)', borderColor:'rgba(255,80,80,.3)', color:'#ff8a8a'}}>
          🗑
        </button>
      </div>

      <div className="tac-toolbar">
        {TAC_TOOLS.map(t => (
          <button key={t.id}
                  className={`tac-tool ${tool === t.id ? 'on' : ''}`}
                  onClick={() => setTool(t.id)}
                  title={t.desc}>
            {t.l}
          </button>
        ))}
      </div>

      <div className="tac-pitch">
        <svg ref={svgRef} viewBox="0 0 100 100"
             width="100%" height="100%"
             className="tac-pitch-svg"
             onMouseMove={onMove}
             onMouseUp={onUp}
             onTouchMove={onMove}
             onTouchEnd={onUp}
             onMouseDown={(e) => onDown(e, null)}
             onTouchStart={(e) => onDown(e, null)}>

          <defs>
            <linearGradient id="tac-grass" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1f7a3a"/>
              <stop offset="100%" stopColor="#1c6e35"/>
            </linearGradient>
            <marker id="tac-arrow-head" viewBox="0 0 10 10" refX="6" refY="5"
                    markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0,0 L10,5 L0,10 Z" fill="#ff8a3d"/>
            </marker>
          </defs>

          <rect width="100" height="100" fill="url(#tac-grass)"/>

          {/* Lignes terrain */}
          <g stroke="rgba(255,255,255,.55)" strokeWidth=".3" fill="none">
            <rect x="2" y="2" width="96" height="96"/>
            <line x1="2" y1="50" x2="98" y2="50"/>
            <circle cx="50" cy="50" r="8"/>
            <rect x="22" y="2"  width="56" height="12"/>
            <rect x="22" y="86" width="56" height="12"/>
          </g>

          {/* Flèches sauvegardées */}
          {scheme.arrows.map((a, i) => (
            <line key={'a'+i}
                  x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2}
                  stroke="#ff8a3d" strokeWidth="0.8"
                  strokeDasharray={a.type === 'pass' ? '2.5,1.5' : a.type === 'dribble' ? '0.8,1' : 'none'}
                  markerEnd="url(#tac-arrow-head)"
                  onClick={(e) => { if (tool==='erase') { e.stopPropagation(); onDown({preventDefault:()=>{}, stopPropagation:()=>{}}, 'arrow:'+i); } }}
                  style={{cursor: tool === 'erase' ? 'pointer' : 'default'}}/>
          ))}

          {/* Flèche en cours de dessin */}
          {drawingArrow && (
            <line x1={drawingArrow.x1} y1={drawingArrow.y1}
                  x2={drawingArrow.x2} y2={drawingArrow.y2}
                  stroke="#ff8a3d" strokeWidth="0.8"
                  strokeDasharray={drawingArrow.type === 'pass' ? '2.5,1.5' : drawingArrow.type === 'dribble' ? '0.8,1' : 'none'}
                  markerEnd="url(#tac-arrow-head)"/>
          )}

          {/* Joueurs */}
          {scheme.players.map(p => (
            <g key={p.id}
               onMouseDown={(e) => onDown(e, p.id)}
               onTouchStart={(e) => onDown(e, p.id)}
               style={{cursor: tool === 'select' ? 'grab' : 'default'}}>
              <circle cx={p.x} cy={p.y} r="3.5" fill="#c8f169" stroke="#000" strokeWidth=".3"/>
              <text x={p.x} y={p.y+1.2} textAnchor="middle" fontSize="3" fontWeight="900"
                    fill="#000" fontFamily="Inter, sans-serif">{p.num}</text>
            </g>
          ))}

          {/* Ballon */}
          <g onMouseDown={(e) => onDown(e, 'ball')}
             onTouchStart={(e) => onDown(e, 'ball')}
             style={{cursor: tool === 'select' ? 'grab' : 'default'}}>
            <circle cx={scheme.ball.x} cy={scheme.ball.y} r="2.5" fill="#fff" stroke="#000" strokeWidth=".3"/>
            <text x={scheme.ball.x} y={scheme.ball.y+.8} textAnchor="middle" fontSize="2.2"
                  fontFamily="Inter, sans-serif">⚽</text>
          </g>

        </svg>
      </div>

      <div className="tac-help">
        💡 <b>{TAC_TOOLS.find(t=>t.id===tool)?.desc}</b> — Sauvegarde auto.
      </div>
    </div>
  );
}

window.ScreenTactique = ScreenTactique;
