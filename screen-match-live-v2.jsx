/* global React, MATCH_HELPERS, MATCH_SFX */

/* ============================================================
   MATCH LIVE V2 — Full arbitrage screen
   ============================================================ */

const { useState: useStateMV, useEffect: useEffectMV, useRef: useRefMV, useMemo: useMemoMV } = React;

// ──────────────────────────────────────────────────────────
// Player picker — used by all action flows
// ──────────────────────────────────────────────────────────
function PlayerPicker({ title, subtitle, team, mode = 'field', M, onPick, onCancel, extraActions, hint }) {
  const all = mode === 'bench' ? (team.bench || []) :
              mode === 'all'   ? [...(team.p||[]), ...(team.bench||[])] :
                                 (team.p || []);

  // Filter out players already excluded (red card)
  const visible = all.filter(p => !MATCH_HELPERS.playerLabel ? true : !window.MATCH_HELPERS.isPlayerOut?.(M, team === M.tA ? 'A' : 'B', MATCH_HELPERS.playerLabel(p)));

  return (
    <div className="mv-modal-overlay" onClick={onCancel}>
      <div className="mv-modal" onClick={e => e.stopPropagation()}>
        <div className="mv-modal-h">
          <div>
            <div className="mv-modal-k" style={{color: team.c}}>{team.n}</div>
            <h2 className="mv-modal-t">{title}</h2>
            {subtitle && <div className="mv-modal-s">{subtitle}</div>}
          </div>
          <button className="mv-modal-x" onClick={onCancel} aria-label="Fermer">✕</button>
        </div>

        {hint && <div className="mv-modal-hint">{hint}</div>}

        <div className="mv-pp-grid">
          {visible.length === 0 ? (
            <div className="mv-pp-empty">Aucun joueur disponible.</div>
          ) : visible.map(p => (
            <button key={p.id} className="mv-pp-tile" onClick={() => onPick(p)}>
              <span className="mv-pp-num num">{p.num}</span>
              <span className="mv-pp-name">{p.first || p.last || '?'}</span>
            </button>
          ))}
        </div>

        {extraActions && <div className="mv-modal-extra">{extraActions}</div>}

        <button className="mv-modal-noname" onClick={() => onPick({ num:'?', first:'', last:'Sans nom', id:'unnamed' })}>
          ↪ Sans nom
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Goal flow — 4 modals: scorer → passer/penalty → type → details
// ──────────────────────────────────────────────────────────
function GoalFlow({ team, side, M, onDone, onCancel }) {
  const [step, setStep] = useStateMV('scorer');
  const [scorer, setScorer] = useStateMV(null);
  const [penaltyType, setPenaltyType] = useStateMV(null);
  const [obtainedBy, setObtainedBy] = useStateMV(null);
  const opp = side === 'A' ? M.tB : M.tA;

  if (step === 'scorer') {
    return <PlayerPicker
      title="⚽ Buteur"
      team={team} mode="field" M={M}
      onPick={p => { setScorer(p); setStep('passer'); }}
      onCancel={onCancel}/>;
  }

  if (step === 'passer') {
    const scorerLbl = '#'+scorer.num+' '+(scorer.first||'');
    return <PlayerPicker
      title="👟 Passeur ?"
      subtitle={`Buteur : ${scorerLbl}`}
      team={team} mode="field" M={M}
      onPick={p => {
        if (p.id === scorer.id) return; // can't pass to self
        onDone({ scorer, passer: p, type: 'pass' });
      }}
      onCancel={() => setStep('scorer')}
      hint={
        <div className="mv-noop-row">
          <button className="mv-chip-line" onClick={() => onDone({ scorer, passer: null, type: 'unknown' })}>
            Sans passeur
          </button>
          <button className="mv-chip-line" onClick={() => onDone({ scorer, passer: null, type: 'recovery' })}>
            🛡️ Erreur adv.
          </button>
          <button className="mv-chip-line" onClick={() => onDone({ scorer, passer: null, type: 'pending' })}>
            ⏰ À renseigner
          </button>
        </div>
      }
      extraActions={
        <button className="mv-penalty-btn" onClick={() => setStep('pen-type')}>
          ⚠️ C'était un penalty
        </button>
      }/>;
  }

  if (step === 'pen-type') {
    return (
      <div className="mv-modal-overlay" onClick={onCancel}>
        <div className="mv-modal" onClick={e => e.stopPropagation()}>
          <div className="mv-modal-h">
            <div>
              <div className="mv-modal-k">PENALTY</div>
              <h2 className="mv-modal-t">Type de penalty ?</h2>
              <div className="mv-modal-s">Buteur : #{scorer.num} {scorer.first||''}</div>
            </div>
            <button className="mv-modal-x" onClick={() => setStep('passer')}>‹</button>
          </div>
          <div className="mv-pen-row">
            <button className="mv-pen-card" onClick={() => { setPenaltyType('foul'); setStep('pen-obtained'); }}>
              <div className="mv-pen-ic">🤚</div>
              <div className="mv-pen-l">FAUTE</div>
            </button>
            <button className="mv-pen-card" onClick={() => { setPenaltyType('hand'); setStep('pen-obtained'); }}>
              <div className="mv-pen-ic">✋</div>
              <div className="mv-pen-l">MAIN</div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'pen-obtained') {
    return <PlayerPicker
      title="🙌 Penalty obtenu par"
      subtitle={`${penaltyType==='hand'?'Main':'Faute'} dans la surface`}
      team={team} mode="field" M={M}
      onPick={p => { setObtainedBy(p); setStep('pen-caused'); }}
      onCancel={() => setStep('pen-type')}/>;
  }

  if (step === 'pen-caused') {
    return <PlayerPicker
      title="⛔ Penalty causé par"
      subtitle={`Joueur ${opp.n}`}
      team={opp} mode="field" M={M}
      onPick={p => {
        onDone({
          scorer, passer: null, type: 'penalty',
          penaltyType, obtainedBy, causedBy: p
        });
      }}
      onCancel={() => setStep('pen-obtained')}/>;
  }

  return null;
}

// ──────────────────────────────────────────────────────────
// Card overlay — fullscreen JAUNE / ROUGE
// ──────────────────────────────────────────────────────────
function CardOverlay({ color, side, player, hint, onClose, onCloseShow2 }) {
  return (
    <div className={`mv-card-overlay mv-card-${color}`} onClick={onCloseShow2 || onClose}>
      <div className="mv-card-bg"/>
      <div className="mv-card-inner">
        <div className="mv-card-ic">{color === 'yellow' ? '🟨' : '🟥'}</div>
        {player && (
          <>
            <div className="mv-card-num num">{player.num}</div>
            <div className="mv-card-name">{player.first || player.last || ''}</div>
          </>
        )}
        <div className="mv-card-hint">{hint || 'TAPEZ POUR FERMER'}</div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Match Header (sticky)
// ──────────────────────────────────────────────────────────
function MatchHeader({ M, minute, onWhistle, onShowOnly }) {
  return (
    <div className="mv-header">
      <div className="mv-header-bg"/>
      <div className="mv-header-grad"/>

      <div className="mv-teams-row">
        <div className="mv-team mv-team-A">
          <div className="mv-team-badge" style={{background:`linear-gradient(160deg, ${M.tA.c}, ${M.tA.c}99)`, borderColor: M.tA.c}}>
            {M.tA.n[0]}
          </div>
          <div className="mv-team-n">{M.tA.n}</div>
        </div>

        <div className="mv-score-block">
          <div className="mv-score-row">
            <span className="mv-score-num num">{M.sA}</span>
            <button className="mv-whistle" onClick={onWhistle} title="Sifflet" aria-label="Sifflet">
              📣
            </button>
            <span className="mv-score-num num">{M.sB}</span>
          </div>
          {M.st !== 'finished' && !M.notStarted && (
            <div className="mv-live-badge">
              {M.st === 'live' && <span className="mv-live-dot"/>}
              <span>{M.st === 'live' ? 'LIVE' : 'PAUSE'} · </span>
              <span className="num">{minute}'</span>
              <span> · {M.ch}<sup>e</sup> mi-temps</span>
            </div>
          )}
          {M.notStarted && <div className="mv-live-badge mv-pre">EN ATTENTE · COUP D'ENVOI</div>}
          {M.st === 'finished' && <div className="mv-live-badge mv-end">MATCH TERMINÉ</div>}
        </div>

        <div className="mv-team mv-team-B">
          <div className="mv-team-badge" style={{background:`linear-gradient(160deg, ${M.tB.c}, ${M.tB.c}99)`, borderColor: M.tB.c}}>
            {M.tB.n[0]}
          </div>
          <div className="mv-team-n">{M.tB.n}</div>
        </div>
      </div>

      <button className="mv-show-only-btn" onClick={onShowOnly} title="Avertissement sans enregistrer">
        🪪 Montrer carton
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Action grid — BUT / JAUNE / ROUGE / CHANGE per team
// ──────────────────────────────────────────────────────────
function ActionGrid({ side, M, disabled, onGoal, onCard, onSub }) {
  const tName = side === 'A' ? M.tA.n : M.tB.n;
  return (
    <div className={`mv-actions mv-actions-${side}`}>
      <div className="mv-actions-k">{tName}</div>
      <div className="mv-actions-row">
        <button className="mv-action mv-action-goal" disabled={disabled} onClick={() => onGoal(side)}>
          <span className="mv-action-ic">⚽</span>
          <span className="mv-action-l">BUT</span>
        </button>
        <button className="mv-action mv-action-yel" disabled={disabled} onClick={() => onCard(side, 'yellow')}>
          <span className="mv-action-ic">▮</span>
          <span className="mv-action-l">JAUNE</span>
        </button>
        <button className="mv-action mv-action-red" disabled={disabled} onClick={() => onCard(side, 'red')}>
          <span className="mv-action-ic">▮</span>
          <span className="mv-action-l">ROUGE</span>
        </button>
        <button className="mv-action mv-action-sub" disabled={disabled} onClick={() => onSub(side)}>
          <span className="mv-action-ic">⇅</span>
          <span className="mv-action-l">CHANGE</span>
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Events timeline
// ──────────────────────────────────────────────────────────
function EventsTimeline({ M, onUndo }) {
  const ev = [...M.ev].reverse();
  return (
    <div className="mv-timeline">
      <div className="mv-timeline-h">
        <span className="mv-timeline-t">Faits du match</span>
        {ev.length > 0 && (
          <button className="mv-undo" onClick={onUndo}>↶ Annuler</button>
        )}
      </div>
      {ev.length === 0 ? (
        <div className="mv-empty">Aucun événement pour le moment.<br/>Tape sur BUT / JAUNE / CHANGE pour commencer.</div>
      ) : ev.map((e, i) => (
        <div key={ev.length-i} className={`mv-ev mv-ev-${e.tp} mv-ev-${e.t || 'none'}`}>
          <span className="mv-ev-min num">{e.mn}<i>'</i></span>
          <span className="mv-ev-dot"/>
          <div className="mv-ev-body">
            <span className={`mv-ev-tag mv-ev-tag-${e.tp}`}>
              {e.tp === 'goal'   ? 'BUT' :
               e.tp === 'yellow' ? 'JAUNE' :
               e.tp === 'red'    ? (e.auto ? 'ROUGE (2e jaune)' : 'ROUGE') :
               e.tp === 'sub'    ? 'CHANGEMENT' :
               e.tp === 'half'   ? 'MI-TEMPS' :
               e.tp === 'end'    ? 'COUP DE SIFFLET FINAL' : e.tp.toUpperCase()}
            </span>
            <span className="mv-ev-pl">{e.pl || ''}</span>
            {e.tp === 'goal' && e.source === 'pending' &&
              <span className="mv-ev-pending">⏰ Passeur à renseigner</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Main screen — orchestrator
// ──────────────────────────────────────────────────────────
function ScreenMatchV2({ go, tweaks }) {
  // Guard: si moteur match ou data pas chargés, écran d'erreur lisible
  if (!window.MATCH_HELPERS || !window.MATCH_SFX) {
    return (
      <div style={{padding:30, textAlign:"center"}}>
        <div style={{fontSize:40, marginBottom:10}}>⚠</div>
        <h2 style={{margin:"0 0 10px"}}>Moteur match non chargé</h2>
        <p style={{opacity:0.7, marginBottom:20, fontSize:13}}>
          Le script match-engine.js n'est pas disponible. Recharge la page (Ctrl+Maj+R).
        </p>
        <button className="btn-cta" onClick={() => go("home")}>← Retour à l'accueil</button>
      </div>
    );
  }
  if (!window.CDD_PLAYERS || window.CDD_PLAYERS.length === 0) {
    return (
      <div style={{padding:30, textAlign:"center"}}>
        <div style={{fontSize:40, marginBottom:10}}>⚽</div>
        <h2 style={{margin:"0 0 10px"}}>Aucun joueur</h2>
        <p style={{opacity:0.7, marginBottom:20, fontSize:13}}>
          Ton effectif est vide. Va d'abord dans Effectif pour importer ou ajouter des joueurs.
        </p>
        <button className="btn-cta" onClick={() => go("effectif")}>→ Aller à l'effectif</button>
        <div style={{height:8}}/>
        <button className="btn-cta ghost" onClick={() => go("home")}>← Retour</button>
      </div>
    );
  }

  const [, forceRender] = useStateMV({});
  const [activeFlow, setActiveFlow] = useStateMV(null);
  const [cardOverlay, setCardOverlay] = useStateMV(null);
  const [confirm, setConfirm] = useStateMV(null);
  const [showHtModal, setShowHtModal] = useStateMV(null);

  const Mref = useRefMV(null);
  if (!Mref.current) {
    try {
      const existing = localStorage.getItem('cdd_match_current');
      if (existing) {
        const loaded = MATCH_HELPERS.loadMatch(existing);
        if (loaded) Mref.current = loaded;
      }
      if (!Mref.current) {
        const teams = MATCH_HELPERS.buildDefaultTeams();
        Mref.current = MATCH_HELPERS.newMatch(teams.tA, teams.tB);
        localStorage.setItem('cdd_match_current', Mref.current.id);
      }
    } catch (err) {
      console.error('[ScreenMatchV2] init failed', err);
    }
  }
  const M = Mref.current;
  if (!M) {
    return (
      <div style={{padding:30, textAlign:"center"}}>
        <div style={{fontSize:40, marginBottom:10}}>⚠</div>
        <h2 style={{margin:"0 0 10px"}}>Erreur démarrage match</h2>
        <p style={{opacity:0.7, marginBottom:20, fontSize:13}}>
          Impossible d'initialiser le match. Ouvre la console (F12) pour les détails.
        </p>
        <button className="btn-cta ghost" onClick={() => go("home")}>← Retour</button>
      </div>
    );
  }

  // Tick chrono every second while live
  const [minute, setMinute] = useStateMV(MATCH_HELPERS.gMin(M));
  useEffectMV(() => {
    if (M.st !== 'live') return;
    const t = setInterval(() => setMinute(MATCH_HELPERS.gMin(M)), 1000);
    return () => clearInterval(t);
  }, [M.st]);

  const rerender = () => { forceRender({}); MATCH_HELPERS.saveMatch(M); };

  // ─── Match controls ─────────────────────────────────
  const startMatch = () => {
    M.notStarted = false;
    M.tSt = Date.now();
    M.tOff = 0;
    M.st = 'live';
    MATCH_SFX.playWhistle();
    MATCH_SFX.vibrate(200);
    // ─── Activer wake lock + plein écran + silence loop iOS ───
    if (MATCH_HELPERS.requestWakeLock) MATCH_HELPERS.requestWakeLock();
    if (MATCH_HELPERS.goFullscreen)    MATCH_HELPERS.goFullscreen();
    if (MATCH_HELPERS.startSilenceLoop) MATCH_HELPERS.startSilenceLoop();
    rerender();
  };

  // ─── Ajouter du temps additionnel ───
  const addAT = (minutes) => {
    if (!MATCH_HELPERS.addAT) return;
    MATCH_HELPERS.addAT(M, minutes);
    MATCH_SFX.playWhistle();
    MATCH_SFX.vibrate(100);
    rerender();
  };
  const promptAT = () => {
    const v = prompt('Combien de minutes de temps additionnel ?', '3');
    if (v == null) return;
    const n = parseInt(v, 10);
    if (!isNaN(n) && n > 0 && n < 20) addAT(n);
  };

  const togglePause = () => {
    if (M.notStarted) return;
    if (M.st === 'live') {
      M.tOff += Date.now() - M.tSt;
      M.st = 'paused';
    } else if (M.st === 'paused') {
      M.tSt = Date.now();
      M.st = 'live';
    }
    rerender();
  };

  const halftime = () => {
    if (M.notStarted) return;
    if (M.ch >= M.cfg.hs) { endMatch(); return; }
    const elapsed = Math.floor(MATCH_HELPERS.gMatch(M)/60000);
    const remain = M.cfg.hd - elapsed;
    if (remain > 0) {
      setShowHtModal({ remain });
      return;
    }
    doHalftime();
  };

  const doHalftime = () => {
    const snap = { st:M.st, tOff:M.tOff, tSt:M.tSt, ch:M.ch };
    if (M.st === 'live') M.tOff += Date.now() - M.tSt;
    M.ev.push({ tp:'half', mn: MATCH_HELPERS.gMin(M), ts: Date.now(), _prev: snap });
    M.ch++; M.tOff = 0; M.st = 'paused'; M.tSt = Date.now();
    if (M.ch === 2) { M.htStart = Date.now(); M.htDur = M.cfg.htd || 15; }
    MATCH_SFX.playWhistle();
    MATCH_SFX.vibrate(300);
    setShowHtModal(null);
    // After 800ms, check pending goals (passer to fill in)
    setTimeout(() => {
      const pending = M.ev.filter(e => e.tp === 'goal' && e.source === 'pending');
      if (pending.length > 0) {
        setConfirm({
          title: `${pending.length} but${pending.length>1?'s':''} avec passeur à renseigner`,
          msg: 'Tu peux compléter à tête reposée, pendant la pause.',
          okLabel: 'D\'accord',
          onOk: () => setConfirm(null),
        });
      }
    }, 800);
    rerender();
  };

  const endMatch = () => {
    const snap = { st:M.st, tOff:M.tOff, tSt:M.tSt, ch:M.ch };
    if (M.st === 'live') M.tOff += Date.now() - M.tSt;
    M.ev.push({ tp:'end', mn: MATCH_HELPERS.gMin(M), ts: Date.now(), _prev: snap });
    M.st = 'finished';
    MATCH_SFX.playBuzzer();
    MATCH_SFX.vibrate(500);
    setShowHtModal(null);
    // Libérer ressources terrain
    if (MATCH_HELPERS.releaseWakeLock)  MATCH_HELPERS.releaseWakeLock();
    if (MATCH_HELPERS.stopSilenceLoop)  MATCH_HELPERS.stopSilenceLoop();
    if (MATCH_HELPERS.exitFullscreen)   MATCH_HELPERS.exitFullscreen();
    rerender();
  };

  // ─── Goal flow ──────────────────────────────────────
  const handleGoalDone = (side) => (data) => {
    const { scorer, passer, type, penaltyType, obtainedBy, causedBy } = data;
    const mn = MATCH_HELPERS.gMin(M);
    if (side === 'A') M.sA++; else M.sB++;

    const scorerLbl = '#'+scorer.num+(scorer.first?' '+scorer.first:'');
    let pl = scorerLbl;
    let evt = { tp:'goal', t: side, mn, scorer: scorerLbl, ts: Date.now() };

    if (type === 'penalty') {
      evt.penalty = true;
      evt.penaltyType = penaltyType;
      evt.obtainedBy = obtainedBy ? MATCH_HELPERS.playerLabel(obtainedBy) : '';
      evt.causedBy = causedBy ? MATCH_HELPERS.playerLabel(causedBy) : '';
      const lbl = penaltyType === 'hand' ? 'pen. main' : 'pen. faute';
      let det = '';
      if (evt.obtainedBy) det += ', obtenu par '+evt.obtainedBy;
      if (evt.causedBy)   det += ', causé par '+evt.causedBy;
      pl += ' ('+lbl+det+')';
    } else if (type === 'pass' && passer) {
      evt.passer = MATCH_HELPERS.playerLabel(passer);
      pl += ' (p. '+evt.passer+')';
    } else if (type === 'recovery') {
      evt.source = 'recovery';
      pl += ' (récup. erreur adv.)';
    } else if (type === 'pending') {
      evt.source = 'pending';
      pl += ' (passeur ?)';
    } else if (type === 'unknown') {
      evt.source = 'unknown';
      pl += ' (sans passeur)';
    }
    evt.pl = pl;

    M.ev.push(evt);
    MATCH_SFX.playGoal();
    MATCH_SFX.vibrate(200);
    setActiveFlow(null);
    rerender();
  };

  // ─── Card flow ──────────────────────────────────────
  const handleCardPick = (side, color) => (player) => {
    const playerLbl = MATCH_HELPERS.playerLabel(player);
    const mn = MATCH_HELPERS.gMin(M);

    // Already excluded?
    if (window.MATCH_HELPERS.isPlayerOut?.(M, side, playerLbl)) {
      setConfirm({ title: '⛔ Déjà exclu', msg: `${playerLbl} a déjà reçu un rouge.`, onOk: () => setConfirm(null), okLabel: 'Compris' });
      setActiveFlow(null);
      return;
    }

    // AUTO 2nd yellow → red
    if (color === 'yellow' && window.MATCH_HELPERS.getYellowsForPlayer?.(M, side, playerLbl) >= 1) {
      if (side === 'A') M.yA++; else M.yB++;
      M.ev.push({ tp:'yellow', t: side, mn, pl: playerLbl, ts: Date.now() });
      if (side === 'A') M.rA++; else M.rB++;
      M.ev.push({ tp:'red', t: side, mn, pl: playerLbl, auto: true, ts: Date.now() });
      MATCH_SFX.playCard();
      MATCH_SFX.vibrate(300);
      setActiveFlow(null);
      // Show 1st card then 2nd
      setCardOverlay({
        color: 'yellow', side, player,
        hint: '2ᵉ JAUNE — tape pour voir le ROUGE',
        next: { color: 'red', side, player, hint: 'EXCLUSION — tape pour fermer' }
      });
      rerender();
      return;
    }

    // Normal card
    if (color === 'yellow') { if (side === 'A') M.yA++; else M.yB++; }
    else { if (side === 'A') M.rA++; else M.rB++; }
    M.ev.push({ tp: color, t: side, mn, pl: playerLbl, ts: Date.now() });
    MATCH_SFX.playCard();
    MATCH_SFX.vibrate(200);
    setActiveFlow(null);
    setCardOverlay({ color, side, player });
    rerender();
  };

  const handleCard = (side, color) => {
    if (color === 'red') {
      setConfirm({
        title: 'Carton rouge ?',
        msg: 'Action grave — confirmer l\'exclusion.',
        okLabel: '🟥 OUI, EXPULSION',
        cancelLabel: 'Annuler',
        onOk: () => { setConfirm(null); setActiveFlow({ kind:'card', side, color }); },
        onCancel: () => setConfirm(null),
      });
    } else {
      setActiveFlow({ kind:'card', side, color });
    }
  };

  // ─── Sub flow ──────────────────────────────────────
  const [subOut, setSubOut] = useStateMV(null);
  const handleSubOut = (side) => (player) => {
    setSubOut(player);
    setActiveFlow({ kind:'sub-in', side });
  };
  const handleSubIn = (side) => (player) => {
    const mn = MATCH_HELPERS.gMin(M);
    if (side === 'A') M.uA++; else M.uB++;
    const outLbl = MATCH_HELPERS.playerLabel(subOut);
    const inLbl = MATCH_HELPERS.playerLabel(player);
    M.ev.push({ tp:'sub', t: side, mn, out: outLbl, inn: inLbl, pl: outLbl+' → '+inLbl, ts: Date.now() });
    MATCH_SFX.vibrate(100);
    setSubOut(null);
    setActiveFlow(null);
    rerender();
  };

  // ─── Undo ──────────────────────────────────────────
  const handleUndo = () => {
    if (M.ev.length === 0) return;
    const last = M.ev[M.ev.length - 1];
    if (last.tp === 'goal') { if (last.t === 'A') M.sA--; else M.sB--; }
    if (last.tp === 'yellow') { if (last.t === 'A') M.yA--; else M.yB--; }
    if (last.tp === 'red') { if (last.t === 'A') M.rA--; else M.rB--; }
    if (last.tp === 'sub') { if (last.t === 'A') M.uA--; else M.uB--; }
    if ((last.tp === 'half' || last.tp === 'end') && last._prev) {
      Object.assign(M, last._prev);
    }
    M.ev.pop();
    MATCH_SFX.vibrate(80);
    rerender();
  };

  const disabled = M.notStarted || M.st === 'finished';
  const team = activeFlow ? (activeFlow.side === 'A' ? M.tA : M.tB) : null;

  // ─── Render ────────────────────────────────────────
  return (
    <div className="scr scr-match-v2 fade-in" data-screen-label="04 Match Live">

      <MatchHeader M={M} minute={minute}
        onWhistle={() => { MATCH_SFX.playWhistle(); MATCH_SFX.vibrate(50); }}
        onShowOnly={() => setActiveFlow({ kind:'show-only' })}/>

      {/* Pre-match overlay avec setup adversaire */}
      {M.notStarted && (
        <PreMatchSetup M={M} onStart={startMatch} rerender={rerender}/>
      )}

      {!M.notStarted && (
        <>
          <ActionGrid side="A" M={M} disabled={disabled}
            onGoal={() => setActiveFlow({ kind:'goal', side:'A' })}
            onCard={handleCard}
            onSub={(side) => setActiveFlow({ kind:'sub-out', side })}/>

          <ActionGrid side="B" M={M} disabled={disabled}
            onGoal={() => setActiveFlow({ kind:'goal', side:'B' })}
            onCard={handleCard}
            onSub={(side) => setActiveFlow({ kind:'sub-out', side })}/>

          <div className="mv-control-row">
            {M.st === 'live' && <button className="mv-ctrl mv-ctrl-pause" onClick={togglePause}>⏸ Pause</button>}
            {M.st === 'paused' && !M.notStarted && M.ch <= M.cfg.hs && (
              <button className="mv-ctrl mv-ctrl-resume" onClick={togglePause}>
                ▶ {M.ch === 1 ? 'Reprendre' : `Reprendre ${M.ch}e mi-temps`}
              </button>
            )}
            {M.st === 'live' && (
              <button className="mv-ctrl mv-ctrl-at" onClick={promptAT}
                      title="Temps additionnel">
                +AT{M.at ? ` (${M.at}′)` : ''}
              </button>
            )}
            {M.ch < M.cfg.hs ? (
              <button className="mv-ctrl mv-ctrl-ht" onClick={halftime}>⏸ Mi-temps</button>
            ) : (
              <button className="mv-ctrl mv-ctrl-end" onClick={endMatch}>🏁 Fin de match</button>
            )}
          </div>

          <EventsTimeline M={M} onUndo={handleUndo}/>
        </>
      )}

      {/* Goal flow */}
      {activeFlow?.kind === 'goal' && (
        <GoalFlow team={team} side={activeFlow.side} M={M}
          onDone={handleGoalDone(activeFlow.side)}
          onCancel={() => setActiveFlow(null)}/>
      )}

      {/* Card pick */}
      {activeFlow?.kind === 'card' && (
        <PlayerPicker
          title={activeFlow.color === 'yellow' ? '🟨 Carton jaune' : '🟥 Carton rouge'}
          team={team} mode="field" M={M}
          onPick={handleCardPick(activeFlow.side, activeFlow.color)}
          onCancel={() => setActiveFlow(null)}/>
      )}

      {/* Sub flow — mode 'all' : amateur, pas de limite de changements
           (un joueur peut sortir, rentrer, ressortir autant que voulu) */}
      {activeFlow?.kind === 'sub-out' && (
        <PlayerPicker
          title="🔻 Joueur sortant"
          subtitle="Tape sur celui qui sort du terrain"
          team={team} mode="all" M={M}
          onPick={handleSubOut(activeFlow.side)}
          onCancel={() => setActiveFlow(null)}/>
      )}
      {activeFlow?.kind === 'sub-in' && (
        <PlayerPicker
          title="🔺 Joueur entrant"
          subtitle={`Pour ${MATCH_HELPERS.playerLabel(subOut)}`}
          team={team} mode="all" M={M}
          onPick={handleSubIn(activeFlow.side)}
          onCancel={() => { setSubOut(null); setActiveFlow(null); }}/>
      )}

      {/* Show only card */}
      {activeFlow?.kind === 'show-only' && (
        <div className="mv-modal-overlay" onClick={() => setActiveFlow(null)}>
          <div className="mv-modal" onClick={e=>e.stopPropagation()}>
            <div className="mv-modal-h">
              <h2 className="mv-modal-t">🪪 Montrer un carton</h2>
              <button className="mv-modal-x" onClick={() => setActiveFlow(null)}>✕</button>
            </div>
            <div className="mv-modal-s" style={{padding:'0 16px 12px'}}>Sans enregistrer · pour la galerie</div>
            <div className="mv-show-row">
              <button className="mv-show-yellow" onClick={() => { setActiveFlow(null); setCardOverlay({ color:'yellow', side:null, player:null, hint:'AVERTISSEMENT' }); MATCH_SFX.playCard(); }}>
                🟨 JAUNE
              </button>
              <button className="mv-show-red" onClick={() => { setActiveFlow(null); setCardOverlay({ color:'red', side:null, player:null, hint:'AVERTISSEMENT' }); MATCH_SFX.playCard(); }}>
                🟥 ROUGE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Card overlay fullscreen */}
      {cardOverlay && (
        <CardOverlay
          color={cardOverlay.color}
          side={cardOverlay.side}
          player={cardOverlay.player}
          hint={cardOverlay.hint}
          onClose={() => setCardOverlay(null)}
          onCloseShow2={cardOverlay.next ? () => setCardOverlay(cardOverlay.next) : undefined}/>
      )}

      {/* Confirm modal */}
      {confirm && (
        <div className="mv-modal-overlay" onClick={confirm.onCancel || (() => setConfirm(null))}>
          <div className="mv-confirm" onClick={e=>e.stopPropagation()}>
            <div className="mv-confirm-t">{confirm.title}</div>
            <div className="mv-confirm-m">{confirm.msg}</div>
            <div className="mv-confirm-actions">
              {confirm.onCancel && <button className="mv-confirm-cancel" onClick={confirm.onCancel}>{confirm.cancelLabel||'Annuler'}</button>}
              <button className="mv-confirm-ok" onClick={confirm.onOk}>{confirm.okLabel||'OK'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Halftime confirm */}
      {showHtModal && (
        <div className="mv-modal-overlay" onClick={() => setShowHtModal(null)}>
          <div className="mv-confirm" onClick={e=>e.stopPropagation()}>
            <div className="mv-confirm-t">Mi-temps anticipée ?</div>
            <div className="mv-confirm-m">Il reste <b>{showHtModal.remain} min</b> au chrono officiel. Confirmer la fin de période ?</div>
            <div className="mv-confirm-actions">
              <button className="mv-confirm-cancel" onClick={() => setShowHtModal(null)}>Continuer</button>
              <button className="mv-confirm-ok" onClick={doHalftime}>Siffler maintenant</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Helper fns exposed (déclarés avant l'attach pour éviter le hoisting Babel)
function isPlayerOut(M, t, lbl) {
  return M.ev.some(e => e.t === t && e.tp === 'red' && e.pl === lbl);
}
function getYellowsForPlayer(M, t, lbl) {
  return M.ev.filter(e => e.t === t && e.tp === 'yellow' && e.pl === lbl).length;
}

// Replace the existing ScreenMatch
window.ScreenMatch = ScreenMatchV2;

// Attach helpers en MUTANT l'objet (évite la race condition avec match-engine.js).
// Si window.MATCH_HELPERS n'existe pas encore (chargement parallèle), on crée la base
// puis match-engine.js complètera par mutation aussi.
if (!window.MATCH_HELPERS) window.MATCH_HELPERS = {};
window.MATCH_HELPERS.isPlayerOut = isPlayerOut;
window.MATCH_HELPERS.getYellowsForPlayer = getYellowsForPlayer;
