/* global React, CDD_PLAYERS, CDD_FORMATIONS, CDD_CLUB */

/* ============================================================
   SCREEN — Compo libre (drag&drop libre sur le terrain)
   ============================================================
   Repart des 11 titulaires de la formation courante, puis permet
   de bouger chaque pion librement sur le terrain. Persiste dans
   cdd_lineup_template[teamId].customPositions = { idx: {x,y} }
   et formation: 'custom'.
   ============================================================ */

const { useState: useCL, useRef: useCLRef, useEffect: useCLEff } = React;

function ScreenCompoLibre({ go, tweaks }) {
  // Récupérer le lineup courant
  const teamId = (window.CDD && window.CDD.getActiveTeam && window.CDD.getActiveTeam()?.id) || null;
  const formations = (window.CDD_FORMATIONS && Object.keys(window.CDD_FORMATIONS)) || ['4-3-3'];

  const loadInitial = () => {
    let formation = '4-3-3';
    let starters = {};
    let customPositions = null;
    try {
      const all = JSON.parse(localStorage.getItem('cdd_lineup_template') || '{}');
      const s = teamId && all[teamId];
      if (s) {
        formation = s.formation === 'custom' ? (s.basedOn || '4-3-3') : (s.formation || '4-3-3');
        starters = s.starters || {};
        customPositions = s.customPositions || null;
      }
    } catch (e) {}
    const slots = window.CDD_FORMATIONS[formation] || window.CDD_FORMATIONS['4-3-3'];
    // positions effectives : customPositions si présent, sinon slots formation
    const positions = {};
    slots.forEach((slot, i) => {
      if (customPositions && customPositions[i]) positions[i] = { ...customPositions[i] };
      else positions[i] = { x: slot.x, y: slot.y };
    });
    return { formation, slots, starters, positions };
  };

  const [state, setState] = useCL(loadInitial);
  const [dragIdx, setDragIdx] = useCL(null);
  const [saved, setSaved] = useCL(false);
  const svgRef = useCLRef(null);

  const playerOf = (pid) => pid && window.CDD_PLAYERS.find(p => p.id === pid);

  const svgPoint = (clientX, clientY) => {
    const svg = svgRef.current;
    if (!svg) return { x: 50, y: 50 };
    const rect = svg.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    return { x: Math.max(4, Math.min(96, x)), y: Math.max(6, Math.min(96, y)) };
  };

  const onDown = (e, idx) => {
    e.preventDefault();
    e.stopPropagation();
    setDragIdx(idx);
  };
  const onMove = (e) => {
    if (dragIdx === null) return;
    e.preventDefault();
    const pt = svgPoint(e.touches ? e.touches[0].clientX : e.clientX,
                         e.touches ? e.touches[0].clientY : e.clientY);
    setState(s => ({ ...s, positions: { ...s.positions, [dragIdx]: pt } }));
  };
  const onUp = () => setDragIdx(null);

  const persist = () => {
    if (!teamId) return;
    try {
      const all = JSON.parse(localStorage.getItem('cdd_lineup_template') || '{}');
      const prev = all[teamId] || {};
      all[teamId] = {
        ...prev,
        formation: 'custom',
        basedOn: state.formation,
        starters: state.starters,
        customPositions: state.positions,
        updatedAt: Date.now(),
      };
      localStorage.setItem('cdd_lineup_template', JSON.stringify(all));
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
      if (window.CDD_REBUILD) window.CDD_REBUILD();
    } catch (e) {}
  };

  const reset = () => {
    if (!confirm('Réinitialiser aux positions de la formation ' + state.formation + ' ?')) return;
    const slots = window.CDD_FORMATIONS[state.formation] || window.CDD_FORMATIONS['4-3-3'];
    const positions = {};
    slots.forEach((slot, i) => { positions[i] = { x: slot.x, y: slot.y }; });
    setState(s => ({ ...s, positions }));
  };

  const changeBase = (f) => {
    const slots = window.CDD_FORMATIONS[f];
    if (!slots) return;
    // Garder les ids des starters mais re-disposer
    const positions = {};
    slots.forEach((slot, i) => { positions[i] = { x: slot.x, y: slot.y }; });
    setState(s => ({ ...s, formation: f, slots, positions }));
  };

  // Auto-save sur changement de positions
  useCLEff(() => {
    const t = setTimeout(persist, 500);
    return () => clearTimeout(t);
  }, [state.positions]);

  const club = window.CDD_CLUB || { colors: ['#22c55e', '#000'] };

  return (
    <div className="scr scr-compo-libre fade-in" data-screen-label="10 Compo libre">

      <div className="cl-bar">
        <button className="tv-btn" onClick={() => go("lineup")}>← Retour</button>
        <div className="cl-title">COMPO LIBRE</div>
        <button className="tv-btn" onClick={reset} title="Réinitialiser">↺</button>
      </div>

      <div className="cl-fmt">
        <span className="cl-fmt-l">BASE :</span>
        {formations.map(f => (
          <button key={f}
                  className={`cl-fmt-c ${state.formation === f ? 'on' : ''}`}
                  onClick={() => changeBase(f)}>
            {f}
          </button>
        ))}
      </div>

      <div className="cl-pitch">
        <svg ref={svgRef} viewBox="0 0 100 100" width="100%" height="100%"
             onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
             onTouchMove={onMove} onTouchEnd={onUp} onTouchCancel={onUp}
             style={{touchAction:'none', userSelect:'none'}}>

          <defs>
            <linearGradient id="cl-grass" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1f7a3a"/>
              <stop offset="100%" stopColor="#1c6e35"/>
            </linearGradient>
          </defs>
          <rect width="100" height="100" fill="url(#cl-grass)"/>

          <g stroke="rgba(255,255,255,.55)" strokeWidth=".3" fill="none">
            <rect x="2" y="2" width="96" height="96"/>
            <line x1="2" y1="50" x2="98" y2="50"/>
            <circle cx="50" cy="50" r="8"/>
            <rect x="22" y="2"  width="56" height="12"/>
            <rect x="22" y="86" width="56" height="12"/>
          </g>

          {state.slots.map((slot, i) => {
            const pid = state.starters[i];
            const p = playerOf(pid);
            const pos = state.positions[i] || { x: slot.x, y: slot.y };
            const isDrag = dragIdx === i;
            return (
              <g key={i}
                 transform={`translate(${pos.x}, ${pos.y})`}
                 onMouseDown={(e) => onDown(e, i)}
                 onTouchStart={(e) => onDown(e, i)}
                 style={{cursor: 'grab', filter: isDrag ? 'drop-shadow(0 0 6px #c8f169)' : 'none'}}>
                <circle r="6.5" fill={club.colors && club.colors[0] || '#22c55e'}
                        stroke="#fff" strokeWidth=".4"/>
                <text textAnchor="middle" dominantBaseline="central"
                      fontSize="5.5" fontWeight="900"
                      fill={club.colors && club.colors[1] || '#000'}
                      fontFamily="Inter, sans-serif" y=".5">
                  {p ? p.num : (i+1)}
                </text>
                {p && (
                  <g>
                    <rect x="-13" y="9" width="26" height="4.5" rx="1" fill="rgba(0,0,0,.78)"/>
                    <text textAnchor="middle" dominantBaseline="central"
                          fontSize="2.8" fontWeight="800"
                          fill="#fff" fontFamily="Inter, sans-serif" y="11.5">
                      {(p.first || '').slice(0, 12)}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="cl-help">
        <div>
          💡 <b>Glisse chaque pion</b> où tu veux sur le terrain. La compo se sauvegarde automatiquement.
        </div>
        {saved && <div className="cl-saved">✓ Sauvé</div>}
      </div>
    </div>
  );
}

window.ScreenCompoLibre = ScreenCompoLibre;
