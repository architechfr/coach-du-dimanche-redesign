/* global React, CDD */

/* ============================================================
   DEBUG HUD — Cloisonnement visualizer
   Shows clubId filter, hidden vs visible teams, leak attempts.
   ============================================================ */

const { useState: useState_HUD, useEffect: useEffect_HUD } = React;

function DebugHUD() {
  const [stats, setStats] = useState_HUD(CDD.getStats());
  const [activeClub, setActiveClub] = useState_HUD(CDD.getActiveClub());
  const [activeTeam, setActiveTeam] = useState_HUD(CDD.getActiveTeam());
  const [allClubs] = useState_HUD(CDD.getAllClubs());
  const [allTeamsRaw] = useState_HUD(() => {
    // Read ALL teams ignoring cloisonnement
    if (window.__CDD_OVERRIDE?.arb_teams) return window.__CDD_OVERRIDE.arb_teams;
    try { return JSON.parse(localStorage.getItem('arb_teams') || '[]'); } catch (e) { return []; }
  });
  const [open, setOpen] = useState_HUD(true);

  useEffect_HUD(() => {
    const t = setInterval(() => setStats(CDD.getStats()), 1000);
    const refresh = () => {
      setActiveClub(CDD.getActiveClub());
      setActiveTeam(CDD.getActiveTeam());
    };
    window.addEventListener('cdd-active-club-changed', refresh);
    window.addEventListener('cdd-active-team-changed', refresh);
    return () => {
      clearInterval(t);
      window.removeEventListener('cdd-active-club-changed', refresh);
      window.removeEventListener('cdd-active-team-changed', refresh);
    };
  }, []);

  const visibleTeams = CDD.getTeams();
  const hiddenTeams = allTeamsRaw.filter(t => !visibleTeams.find(v => v.id === t.id));
  const playerCount = CDD.getPlayers().length;

  const switchClub = (clubId) => {
    CDD.setActiveClub(clubId);
    if (window.CDD_REBUILD) window.CDD_REBUILD();
  };

  if (!open) {
    return (
      <button className="hud-toggle" onClick={() => setOpen(true)}>
        🔒 HUD
      </button>
    );
  }

  return (
    <div className="hud">
      <div className="hud-h">
        <span className="hud-t">DATA CLOISONNEMENT · LIVE</span>
        <button className="hud-x" onClick={() => setOpen(false)}>✕</button>
      </div>

      <div className="hud-section">
        <div className="hud-k">CLUB ACTIF</div>
        <div className="hud-club">
          <span className="hud-club-badge" style={{background: activeClub?.primaryColor || '#22c55e'}}>
            {activeClub?.name?.[0] || '?'}
          </span>
          <div className="hud-club-info">
            <b>{activeClub?.name || 'Aucun'}</b>
            <em className="mono">{activeClub?.id?.slice(-12) || '—'}</em>
          </div>
        </div>
        <div className="hud-club-switcher">
          {allClubs.map(c => (
            <button
              key={c.id}
              className={`hud-club-btn ${c.id === activeClub?.id ? 'on' : ''}`}
              onClick={() => switchClub(c.id)}>
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="hud-section">
        <div className="hud-k">ÉQUIPES</div>
        <div className="hud-counts">
          <div className="hud-count hud-count-ok">
            <b className="num">{visibleTeams.length}</b>
            <em>VISIBLES</em>
          </div>
          <div className="hud-count hud-count-hidden">
            <b className="num">{hiddenTeams.length}</b>
            <em>BLOQUÉES</em>
          </div>
          <div className="hud-count hud-count-warn">
            <b className="num">{stats.leakAttempts || 0}</b>
            <em>LEAKS</em>
          </div>
        </div>
        <div className="hud-teams">
          {visibleTeams.map(t => (
            <div className="hud-team ok" key={t.id}>
              <span className="hud-team-dot"/>
              <span className="hud-team-n">{t.name}</span>
              <span className="hud-team-c">{t.players?.length || 0}</span>
            </div>
          ))}
          {hiddenTeams.map(t => (
            <div className="hud-team blocked" key={t.id}>
              <span className="hud-team-dot"/>
              <span className="hud-team-n">{t.name}</span>
              <span className="hud-team-c mono">club {t.clubId?.slice(-6)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="hud-section">
        <div className="hud-k">ÉQUIPE ACTIVE</div>
        <div className="hud-active-team">
          <b>{activeTeam?.name || '—'}</b>
          <em>{playerCount} joueurs</em>
        </div>
      </div>

      <div className="hud-footer">
        <span>reads: <b className="num">{stats.reads}</b></span>
        <span className="sep">·</span>
        <span>v43.46 fix: relire à chaque call ✓</span>
      </div>
    </div>
  );
}

window.DebugHUD = DebugHUD;
