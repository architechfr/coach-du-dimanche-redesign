/* global React, MATCH_HELPERS, MATCH_SFX */

/* ============================================================
   MATCH LIVE V2 — Full arbitrage screen
   ============================================================ */

const { useState: useStateMV, useEffect: useEffectMV, useRef: useRefMV, useMemo: useMemoMV } = React;

// ──────────────────────────────────────────────────────────
// Player picker — used by all action flows
// ──────────────────────────────────────────────────────────
function PlayerPicker({ title, subtitle, team, mode = 'field', M, onPick, onCancel, extraActions, hint }) {
  // Sélection du pool selon le mode demandé. On respecte le flag onField pour rester
  // cohérent avec les substitutions : un titulaire sorti (onField=false) ne doit pas
  // apparaître dans 'field', un remplaçant entré (onField=true) ne doit pas apparaître
  // dans 'bench'. Pour les cas anciens où onField n'est pas défini, fallback sur l'array.
  const pool = (mode === 'bench')
    ? [...(team.p || []), ...(team.bench || [])].filter(p => p.onField === false)
    : (mode === 'all')
      ? [...(team.p || []), ...(team.bench || [])]
      : /* 'field' (défaut) */
        [...(team.p || []), ...(team.bench || [])].filter(p => p.onField !== false);

  // Filter out players already excluded (red card) — un joueur expulsé ne peut plus
  // jouer du match (règle absolue, valable même pour les sub-in).
  const visible = pool.filter(p => !MATCH_HELPERS.playerLabel ? true : !window.MATCH_HELPERS.isPlayerOut?.(M, team === M.tA ? 'A' : 'B', MATCH_HELPERS.playerLabel(p)));

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
        <div className="mv-noop-row" style={{display:'flex', flexWrap:'wrap', gap:6}}>
          <button className="mv-chip-line" onClick={() => onDone({ scorer, passer: null, type: 'solo' })}>
            🎯 Action indiv.
          </button>
          <button className="mv-chip-line" onClick={() => onDone({ scorer, passer: null, type: 'free-kick' })}>
            ⚡ Coup-franc direct
          </button>
          <button className="mv-chip-line" onClick={() => onDone({ scorer, passer: null, type: 'corner' })}>
            🚩 Corner
          </button>
          <button className="mv-chip-line" onClick={() => onDone({ scorer, passer: null, type: 'cross' })}>
            ↪ Sur centre
          </button>
          <button className="mv-chip-line" onClick={() => onDone({ scorer, passer: null, type: 'recovery' })}>
            🛡 Erreur adv.
          </button>
          <button className="mv-chip-line" onClick={() => onDone({ scorer, passer: null, type: 'rebound' })}>
            🔄 Rebond / mêlée
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
// Team Badge — affiche le logo club si dispo, sinon fallback couleurs + initiale
// ──────────────────────────────────────────────────────────
function TeamBadgeBig({ team }) {
  const logo = team && team.logoDataUrl;
  if (logo) {
    return (
      <div className="mv-team-badge" style={{
        background:'#fff', overflow:'hidden',
        display:'flex', alignItems:'center', justifyContent:'center',
        borderColor: team.c || 'rgba(255,255,255,0.2)',
      }}>
        <img src={logo} alt={team.n}
             style={{width:'100%', height:'100%', objectFit:'cover'}}/>
      </div>
    );
  }
  // Fallback : pastille couleurs club + initiale (comportement historique)
  return (
    <div className="mv-team-badge" style={{
      background: team.c2
        ? `linear-gradient(135deg, ${team.c} 50%, ${team.c2} 50%)`
        : `linear-gradient(160deg, ${team.c}, ${team.c}99)`,
      borderColor: team.c
    }}>
      {team.n[0]}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Match Header (sticky)
// ──────────────────────────────────────────────────────────
function MatchHeader({ M, minute, onWhistle, onShowOnly, onShowLineup }) {
  // Refonte 2026-05-24 : layout scoreboard FIFA (logos+score sur 1 ligne,
  // chrono géant dessous). Avant : tout était empilé dans la colonne centrale
  // d'un grid 3-cols, le chrono XL refoulait le score hors viewport.
  const realMs = MATCH_HELPERS.gRealMs ? MATCH_HELPERS.gRealMs(M) : 0;
  const inHt = MATCH_HELPERS.isInHalftime ? MATCH_HELPERS.isInHalftime(M) : false;
  const matchMs = MATCH_HELPERS.gMatch ? MATCH_HELPERS.gMatch(M) : 0;
  const fmtH = (ts) => ts ? new Date(ts).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' }) : null;
  const t1 = fmtH(M.startedAt);
  const t2 = fmtH(M.periodStartedAt && M.periodStartedAt[2]);
  const showChrono = M.st !== 'finished' && !M.notStarted;

  return (
    <div className="mv-header">
      <div className="mv-header-bg"/>
      <div className="mv-header-grad"/>

      {/* Ligne 1 : scoreboard FIFA — Logo+Nom RECEVANT | SCORE | Logo+Nom VISITEUR
          Convention foot : le club qui RECOIT est toujours à gauche.
          tA = mon équipe (semantique), tB = adversaire. Si on joue à
          l'extérieur, mon équipe passe à droite (et le score aussi). */}
      {(() => {
        // Priorité au flag stocké sur le match (M.isAtHome, posé au coup d'envoi)
        // sinon fallback CDD_NEXT_MATCH.venue. Sur un device distant qui a tiré
        // le match via pullCloudData, CDD_NEXT_MATCH peut pointer sur le
        // prochain match FFF (Extérieur) et donc inverser le scoreboard.
        const _isAtHome = (M.isAtHome !== undefined)
          ? !!M.isAtHome
          : (window.CDD_NEXT_MATCH?.venue === 'Domicile');
        const teamA = (
          <div className="mv-team mv-team-A">
            <TeamBadgeBig team={M.tA}/>
            <div className="mv-team-n" style={{
              fontSize:'clamp(13px, 3.5vw, 18px)', fontWeight:900,
              letterSpacing:'.02em', lineHeight:1.1,
            }}>{M.tA.n}</div>
          </div>
        );
        const teamB = (
          <div className="mv-team mv-team-B">
            <TeamBadgeBig team={M.tB}/>
            <div className="mv-team-n" style={{
              fontSize:'clamp(13px, 3.5vw, 18px)', fontWeight:900,
              letterSpacing:'.02em', lineHeight:1.1,
            }}>{M.tB.n}</div>
          </div>
        );
        // Score : suit la position physique de chaque équipe.
        const leftScore  = _isAtHome ? (M.sA ?? 0) : (M.sB ?? 0);
        const rightScore = _isAtHome ? (M.sB ?? 0) : (M.sA ?? 0);
        return (
          <div className="mv-teams-row">
            {_isAtHome ? teamA : teamB}
            <div className="mv-score-block">
              <div className="mv-score-row">
                <span className="mv-score-num num">{leftScore}</span>
                <span className="mv-score-dash" style={{
                  color:'rgba(255,255,255,0.55)', fontSize:'42px', fontWeight:300,
                  margin:'0 12px', lineHeight:1,
                }}>–</span>
                <span className="mv-score-num num">{rightScore}</span>
              </div>
              {M.notStarted && <div className="mv-live-badge mv-pre" style={{marginTop:6}}>EN ATTENTE · COUP D'ENVOI</div>}
              {M.st === 'finished' && <div className="mv-live-badge mv-end" style={{marginTop:6}}>MATCH TERMINÉ</div>}
            </div>
            {_isAtHome ? teamB : teamA}
          </div>
        );
      })()}

      {/* Ligne 2 : Chrono géant + sous-titres + horodatages + halftime */}
      {showChrono && (
        <div className="mv-chrono-row" style={{
          position:'relative', zIndex:2, padding:'0 14px 10px',
          display:'flex', flexDirection:'column', alignItems:'center', gap:4,
        }}>
          {/* Gros chrono — taille adaptée pour rester visible sans masquer le score */}
          <div style={{
            fontFamily: 'var(--f-display, sans-serif)',
            fontSize: 'clamp(56px, 14vw, 110px)',
            fontWeight: 900, letterSpacing: '.04em',
            color: M.st === 'live' ? '#c8f169' : '#fbbf24',
            fontVariantNumeric: 'tabular-nums', lineHeight: 0.95,
            textShadow: M.st === 'live' ? '0 0 32px rgba(200,241,105,.5)' : 'none',
            padding: '2px 0',
          }}>
            {MATCH_HELPERS.fmtMMSS ? MATCH_HELPERS.fmtMMSS(matchMs) : minute + ":00"}
          </div>
          <div style={{
            display:'flex', alignItems:'center', gap:10, fontSize:13, fontWeight:800,
            letterSpacing:'.12em', textTransform:'uppercase',
            color: M.st === 'live' ? '#c8f169' : inHt ? '#fbbf24' : '#ff8a3d',
          }}>
            {M.st === 'live' && <span className="mv-live-dot" style={{animation:'pulse 1.2s infinite'}}/>}
            <span>{inHt ? 'MI-TEMPS' : M.st === 'live' ? 'LIVE' : 'PAUSE'}</span>
            <span style={{opacity:.5}}>·</span>
            <span>{M.ch === 1 ? '1ère' : M.ch + 'ème'} Mi-temps</span>
            {M.at > 0 && <><span style={{opacity:.5}}>·</span><span>+{M.at}'</span></>}
          </div>
          {(t1 || t2) && (
            <div style={{
              fontSize:10, color:'rgba(255,255,255,0.45)', marginTop:2,
              letterSpacing:'.04em', display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap',
            }}>
              {t1 && <span>Coup d'envoi · {t1}</span>}
              {t2 && <span style={{opacity:.6}}>·</span>}
              {t2 && <span>2ème MT · {t2}</span>}
            </div>
          )}
          {M.st === 'paused' && M.pauseStartedAt && (
            <div style={{
              fontSize:12, color:'#ff8a3d', fontWeight:700,
              fontVariantNumeric:'tabular-nums', marginTop:2,
              display:'flex', gap:6, alignItems:'center',
            }}>
              <span>⏸</span>
              <span>Pause depuis {MATCH_HELPERS.fmtMMSS(Date.now() - M.pauseStartedAt)}</span>
            </div>
          )}
          {M.startedAt && (M.st === 'paused' || inHt) && (
            <div style={{fontSize:10, color:'rgba(255,255,255,.4)', marginTop:2}}>
              Temps réel depuis coup d'envoi : {MATCH_HELPERS.fmtMMSS(realMs)}
            </div>
          )}
          {inHt && M.htStart && (() => {
            const htDurMs = (M.htDur || 15) * 60 * 1000;
            const elapsedHt = Date.now() - M.htStart;
            const remainHt = Math.max(0, htDurMs - elapsedHt);
            const isLow = remainHt < 60000;
            return (
              <div style={{
                marginTop:10, padding:'10px 18px', borderRadius:12,
                background: isLow ? 'rgba(255,80,80,.18)' : 'rgba(251,191,36,.14)',
                border: '1px solid ' + (isLow ? 'rgba(255,80,80,.4)' : 'rgba(251,191,36,.35)'),
                display:'flex', alignItems:'center', gap:12,
              }}>
                <span style={{fontSize:20}}>{isLow ? '🔔' : '☕'}</span>
                <div>
                  <div style={{fontSize:10, fontWeight:800, letterSpacing:'.1em',
                               color: isLow ? '#ff9a9a' : '#fbbf24', textTransform:'uppercase'}}>
                    PAUSE MI-TEMPS · {Math.floor((M.htDur || 15))}min
                  </div>
                  <div style={{
                    fontSize:22, fontWeight:900, fontVariantNumeric:'tabular-nums',
                    color:'#fff', marginTop:2, lineHeight:1,
                    textShadow: isLow ? '0 0 8px rgba(255,80,80,.4)' : 'none',
                  }}>
                    {MATCH_HELPERS.fmtMMSS(remainHt)} restantes
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      <div style={{display:'flex', gap:8, justifyContent:'center', padding:'0 14px 8px', position:'relative', zIndex:2}}>
        <button className="mv-show-only-btn" onClick={onShowOnly}
                title="Avertissement sans enregistrer" style={{flex:1}}>
          🪪 Montrer carton
        </button>
        {onShowLineup && (
          <button className="mv-show-only-btn" onClick={onShowLineup}
                  title="Voir la composition en cours" style={{flex:1}}>
            📋 Composition
          </button>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Action matrix — V1-like layout : 1 ligne par type d'action
// avec A (domicile) à gauche et B (extérieur) à droite.
// Ergonomie testée terrain par le coach (V1).
// ──────────────────────────────────────────────────────────
function ActionsMatrix({ M, disabled, onGoal, onCard, onSub, onInjury, isAtHome }) {
  const aName = M.tA?.n || 'Mon équipe';
  const bName = M.tB?.n || 'Adversaire';
  // Convention recevant à gauche : si on joue à l'extérieur, mon équipe (A)
  // passe à droite et l'adversaire (B) à gauche. Les `side` passés aux
  // handlers restent 'A'/'B' (logique métier inchangée) — seul le rendu
  // visuel est swappé pour aligner avec le scoreboard du haut.
  const _atHome = isAtHome !== false; // défaut true si non précisé
  const leftSide  = _atHome ? 'A' : 'B';
  const rightSide = _atHome ? 'B' : 'A';
  const leftName  = _atHome ? aName : bName;
  const rightName = _atHome ? bName : aName;

  // Bouton réutilisable. taille du label adapte au nombre de boutons par ligne.
  const Btn = ({ kind, side, onClick, children, fontSize }) => (
    <button
      className={`mv-action mv-action-${kind}`}
      disabled={disabled}
      onClick={() => onClick(side)}
      style={{ fontSize: fontSize || undefined, flex: 1, minWidth: 0 }}>
      {children}
    </button>
  );

  const goalIc   = <span className="mv-action-ic">⚽</span>;
  const yellowIc = <span className="mv-action-ic">
    <span style={{
      display:'inline-block', width:20, height:28, borderRadius:3,
      background:'#FFD600', boxShadow:'0 2px 4px rgba(0,0,0,.4), inset 0 -3px 0 rgba(0,0,0,.18)',
    }}/>
  </span>;
  const redIc = <span className="mv-action-ic">
    <span style={{
      display:'inline-block', width:20, height:28, borderRadius:3,
      background:'#E60026', boxShadow:'0 2px 4px rgba(0,0,0,.5), inset 0 -3px 0 rgba(0,0,0,.22)',
    }}/>
  </span>;
  const subIc    = <span className="mv-action-ic">⇅</span>;
  const injuryIc = <span className="mv-action-ic">🩹</span>;

  // Style commun pour une ligne (paire A | B avec separateur visuel central)
  const rowStyle = {
    display:'flex', gap:8, marginBottom:10,
  };
  const sideStyle = {
    flex:1, minWidth:0, display:'flex', gap:6,
  };
  const sepStyle = {
    width:1, alignSelf:'stretch',
    background:'linear-gradient(180deg, transparent, rgba(255,255,255,0.12), transparent)',
  };

  return (
    <div className="mv-actions-matrix">

      {/* Entêtes des 2 côtés — alignés avec le scoreboard (recevant à gauche) */}
      <div style={{
        display:'flex', gap:8, marginBottom:6,
        fontSize:10.5, fontWeight:800, opacity:0.55, letterSpacing:'.06em',
      }}>
        <div style={{flex:1, textAlign:'center'}}>{leftName.toUpperCase()}</div>
        <div style={{width:1}}/>
        <div style={{flex:1, textAlign:'center'}}>{rightName.toUpperCase()}</div>
      </div>

      {/* Ligne 1 — BUT gauche | BUT droite */}
      <div style={rowStyle}>
        <div style={sideStyle}>
          <Btn kind="goal" side={leftSide} onClick={onGoal}>
            {goalIc}<span className="mv-action-l">BUT</span>
          </Btn>
        </div>
        <div style={sepStyle}/>
        <div style={sideStyle}>
          <Btn kind="goal" side={rightSide} onClick={onGoal}>
            {goalIc}<span className="mv-action-l">BUT</span>
          </Btn>
        </div>
      </div>

      {/* Ligne 2 — JAUNE · ROUGE gauche | JAUNE · ROUGE droite */}
      <div style={rowStyle}>
        <div style={sideStyle}>
          <Btn kind="yel" side={leftSide} onClick={(s) => onCard(s, 'yellow')}>
            {yellowIc}<span className="mv-action-l">JAUNE</span>
          </Btn>
          <Btn kind="red" side={leftSide} onClick={(s) => onCard(s, 'red')}>
            {redIc}<span className="mv-action-l">ROUGE</span>
          </Btn>
        </div>
        <div style={sepStyle}/>
        <div style={sideStyle}>
          <Btn kind="yel" side={rightSide} onClick={(s) => onCard(s, 'yellow')}>
            {yellowIc}<span className="mv-action-l">JAUNE</span>
          </Btn>
          <Btn kind="red" side={rightSide} onClick={(s) => onCard(s, 'red')}>
            {redIc}<span className="mv-action-l">ROUGE</span>
          </Btn>
        </div>
      </div>

      {/* Ligne 3 — CHANGE gauche | CHANGE droite. BLESSÉ uniquement côté
          mon équipe (pas la feuille adverse → onInjury seulement si side==='A'). */}
      <div style={rowStyle}>
        <div style={sideStyle}>
          <Btn kind="sub" side={leftSide} onClick={onSub}>
            {subIc}<span className="mv-action-l">CHANGE</span>
          </Btn>
          {onInjury && leftSide === 'A' && (
            <Btn kind="injury" side="A" onClick={onInjury}>
              {injuryIc}<span className="mv-action-l">BLESSÉ</span>
            </Btn>
          )}
        </div>
        <div style={sepStyle}/>
        <div style={sideStyle}>
          <Btn kind="sub" side={rightSide} onClick={onSub}>
            {subIc}<span className="mv-action-l">CHANGE</span>
          </Btn>
          {onInjury && rightSide === 'A' && (
            <Btn kind="injury" side="A" onClick={onInjury}>
              {injuryIc}<span className="mv-action-l">BLESSÉ</span>
            </Btn>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Events timeline
// ──────────────────────────────────────────────────────────

// Retire le préfixe "#N " des labels stockés pour afficher juste le prénom.
// '#9 Léonis' -> 'Léonis', '#10 Djibril' -> 'Djibril'.
function cleanPlayerName(lbl) {
  if (!lbl) return '';
  return String(lbl).replace(/^#\d+\s*/, '').trim();
}

// Tag d'évènement en français (libellé court de l'action)
function eventTagFr(e) {
  switch (e.tp) {
    case 'goal':   return 'BUT';
    case 'yellow': return 'JAUNE';
    case 'red':    return e.auto ? 'ROUGE (2e jaune)' : 'ROUGE';
    case 'sub':    return 'CHANGEMENT';
    case 'half':   return 'MI-TEMPS';
    case 'end':    return 'COUP DE SIFFLET FINAL';
    case 'injury': return 'BLESSURE';
    case 'at':     return 'TEMPS ADDITIONNEL';
    default:       return String(e.tp).toUpperCase();
  }
}

// Phrase descriptive de l'évènement, en français propre, sans duplication.
// Le label stocké e.pl reste pour compatibilité ; on s'appuie sur les champs
// structurés (scorer, passer, type, source) quand ils sont disponibles.
function eventDescriptionFr(e) {
  const sName = cleanPlayerName(e.scorer || e.pl);
  if (e.tp === 'goal') {
    let main = `But ${sName}`;
    const parts = [];
    if (e.penalty) {
      parts.push(e.penaltyType === 'hand' ? 'penalty (main)' : 'penalty (faute)');
      if (e.obtainedBy) parts.push(`obtenu par ${cleanPlayerName(e.obtainedBy)}`);
      if (e.causedBy)   parts.push(`causé par ${cleanPlayerName(e.causedBy)}`);
    }
    if (e.passer)               parts.push(`passe décisive ${cleanPlayerName(e.passer)}`);
    else if (e.source === 'recovery') parts.push('sur récupération adverse');
    else if (e.source === 'unknown')  parts.push('sans passeur');
    return parts.length ? `${main} · ${parts.join(' · ')}` : main;
  }
  if (e.tp === 'yellow') return `Carton jaune ${cleanPlayerName(e.pl)}`;
  if (e.tp === 'red')    return `Carton rouge ${cleanPlayerName(e.pl)}`;
  if (e.tp === 'injury') return `Blessure ${cleanPlayerName(e.pl) || '(adversaire)'}`;
  if (e.tp === 'sub') {
    const out = cleanPlayerName(e.out || e.pl);
    const inn = cleanPlayerName(e.in);
    if (inn) return `${out} sort, ${inn} entre`;
    return `Changement : ${out}`;
  }
  if (e.tp === 'at')   return `Temps additionnel +${e.add || e.at || ''}'`;
  if (e.tp === 'half') return e.note || 'Pause de mi-temps';
  if (e.tp === 'end')  return e.note || 'Fin de la rencontre';
  return cleanPlayerName(e.pl);
}

// Logo / badge équipe pour la timeline (remplace le point vert anonyme)
function TeamEventBadge({ side, M }) {
  const team = side === 'A' ? M.tA : side === 'B' ? M.tB : null;
  if (!team) {
    return <span style={{
      width:18, height:18, borderRadius:9, flexShrink:0,
      background:'rgba(255,255,255,0.15)',
    }}/>;
  }
  const isA = side === 'A';
  // Cote A : logo de mon club. Cote B : logo de l'adversaire si l'API FFF
  // l'a fourni (CDD_NEXT_MATCH.awayLogoDataUrl) ou si configure manuellement
  // sur le match (team.logoDataUrl).
  const clubLogo = isA
    ? (window.CDD_LOGO?.getForActiveClub?.() || (window.CDD_CLUB && window.CDD_CLUB.logoDataUrl))
    : (team?.logoDataUrl || window.CDD_NEXT_MATCH?.awayLogoDataUrl || null);
  if (clubLogo) {
    return (
      <span style={{
        width:22, height:22, borderRadius:11, flexShrink:0,
        background:'#fff', overflow:'hidden',
        display:'inline-flex', alignItems:'center', justifyContent:'center',
        border:`1.5px solid ${team.c || 'rgba(255,255,255,0.2)'}`,
      }}>
        <img src={clubLogo} alt={team.n} style={{width:'100%', height:'100%', objectFit:'cover'}}/>
      </span>
    );
  }
  // Fallback : pastille avec couleurs et initiale du club
  return (
    <span title={team.n} style={{
      width:22, height:22, borderRadius:11, flexShrink:0,
      background: team.c2
        ? `linear-gradient(135deg, ${team.c} 50%, ${team.c2} 50%)`
        : team.c || '#3b82f6',
      color: team.c2 && team.c2 !== '#000000' ? '#fff' : (team.c2 || '#fff'),
      display:'inline-flex', alignItems:'center', justifyContent:'center',
      fontSize:10, fontWeight:900, letterSpacing:'-.02em',
      border:'1px solid rgba(255,255,255,0.2)',
      textShadow:'0 1px 2px rgba(0,0,0,0.4)',
    }}>{(team.n || '?')[0]}</span>
  );
}

function EventsTimeline({ M, onUndo, onEdit }) {
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
      ) : ev.map((e, i) => {
        const realIdx = M.ev.length - 1 - i;
        return (
          <div key={realIdx} className={`mv-ev mv-ev-${e.tp} mv-ev-${e.t || 'none'}`}>
            <span className="mv-ev-min num">{MATCH_HELPERS.fmtMatchMinute ? MATCH_HELPERS.fmtMatchMinute(e.mn, e.ch, M.cfg) : (e.mn + "'")}</span>
            <TeamEventBadge side={e.t} M={M}/>
            <div className="mv-ev-body">
              <span className={`mv-ev-tag mv-ev-tag-${e.tp}`}>{eventTagFr(e)}</span>
              <span className="mv-ev-pl">{eventDescriptionFr(e)}</span>
              {e._edited && <span style={{fontSize:10, color:'rgba(200,241,105,.7)', marginLeft:6}}>✎ édité</span>}
              {e.tp === 'goal' && e.source === 'pending' &&
                <span className="mv-ev-pending">⏰ Passeur à renseigner</span>}
            </div>
            {onEdit && (e.tp === 'goal' || e.tp === 'yellow' || e.tp === 'red' || e.tp === 'sub' || e.tp === 'injury') && (
              <button onClick={() => onEdit(realIdx)}
                      style={{background:'transparent', border:'none', color:'rgba(255,255,255,.5)',
                              fontSize:14, cursor:'pointer', padding:'4px 8px'}}>✎</button>
            )}
          </div>
        );
      })}
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
  const [showLineup, setShowLineup] = useStateMV(false);
  const [showFiche, setShowFiche] = useStateMV(false);
  const [editingEvent, setEditingEvent] = useStateMV(null);
  const [showSummaryShare, setShowSummaryShare] = useStateMV(false);
  // Étape intermédiaire entre "PreMatchSetup → LANCER" et le démarrage
  // réel du chrono : permet au coach de vérifier/ajuster les numéros de
  // maillot avant le coup d'envoi. true = setup validé, en attente du
  // bouton "Confirmer et démarrer" sur l'écran de vérification.
  const [setupValidated, setSetupValidated] = useStateMV(false);
  const [jerseyModalOpen, setJerseyModalOpen] = useStateMV(false);

  const Mref = useRefMV(null);

  // #C5 — piloter le match en direct = capacité 'compo'. Parent / joueur /
  // lecteur peuvent suivre le score et la timeline, pas saisir d'évènement.
  const canEdit = !window.CDD_ROLES || !window.CDD_ROLES.canDo
    || window.CDD_ROLES.canDo('compo');
  if (!Mref.current) {
    try {
      const existing = localStorage.getItem('cdd_match_current');
      if (existing) {
        const loaded = MATCH_HELPERS.loadMatch(existing);
        // Ne ré-ouvre PAS un match terminé ni un brouillon notStarted (fantôme
        // d'une visite précédente où le coach a ouvert l'écran sans lancer).
        if (loaded && loaded.st !== 'finished' && !loaded.notStarted) {
          Mref.current = loaded;
        } else if (loaded && loaded.st === 'finished') {
          try { localStorage.setItem('cdd_match_last_finished', existing); } catch (e) {}
          // On purge le pointeur stale aussi
          try { localStorage.removeItem('cdd_match_current'); } catch (e) {}
        } else if (loaded && loaded.notStarted) {
          // Brouillon abandonné → on nettoie pour repartir sur du propre
          try { localStorage.removeItem('cdd_match_current'); } catch (e) {}
          try { localStorage.removeItem('cdd_match_' + existing); } catch (e) {}
        }
      }
      if (!Mref.current) {
        const teams = MATCH_HELPERS.buildDefaultTeams();
        Mref.current = MATCH_HELPERS.newMatch(teams.tA, teams.tB);
        // Capture l'id du MATCH PROGRAMMÉ au moment du lancement.
        // newMatch() génère un id local 'm_xxx' (timestamp) qui n'a aucun
        // rapport avec l'id du match dans CDD_NEXT_MATCH / CDD_FRIENDLY.
        // Sans cette capture, endMatch ne pourrait pas relier le live
        // au match programmé → filtres post-match cassés (bug v119).
        Mref.current.scheduledMatchId = (window.CDD_NEXT_MATCH && window.CDD_NEXT_MATCH.id) || null;
        // ⚠️ On N'écrit PAS cdd_match_current ici. Tant que le coach n'a pas
        // cliqué LANCER, le match reste un brouillon en mémoire — ni l'accueil
        // ni un autre device ne doivent le voir comme "match en cours".
        // Le pointeur cdd_match_current est positionné dans startMatch().
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

  // Tick chrono every second. On tique DÈS QUE le match est commencé et pas terminé
  // → couvre live + pause (pour le compteur de pause) + mi-temps (pour le countdown).
  // Sans ça, le coach doit refresh la page pour voir avancer le temps en pause/mi-temps.
  const [chronoTick, setChronoTick] = useStateMV(Date.now());
  // eslint-disable-next-line no-unused-vars
  const minute = MATCH_HELPERS.gMin(M); // recalculé à chaque render grâce au tick
  useEffectMV(() => {
    if (!M || M.notStarted || M.st === 'finished') return;
    const t = setInterval(() => setChronoTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, [M, M && M.st, M && M.notStarted]);

  // RETROACTIF : si on rouvre l'écran avec un match déjà LANCÉ (typiquement
  // après refresh, ou avec un match commencé avant le déploiement du fix
  // live-match cross-device), on (re-)pousse le pointeur team.liveMatch
  // dans Firestore. Sans ça, le 2e device / adjoint / parent ne savait pas
  // qu'un match tournait (bug Florian 26/05/2026).
  useEffectMV(() => {
    if (!M || M.notStarted || M.st === 'finished') return;
    if (!window.cddData?.setTeamLiveMatch) {
      console.warn('[liveMatch] mount: cddData.setTeamLiveMatch indisponible');
      return;
    }
    // Fallback teamId : si M.teamId manque (cas historique), on prend
    // l'équipe active courante. Au moins UN des deux doit être présent.
    const teamId = M.teamId || (window.CDD?.getActiveTeam?.()?.id) || null;
    if (!teamId || !M.id) {
      console.warn('[liveMatch] mount: teamId/matchId manquant', { teamId, matchId: M.id });
      return;
    }
    console.info('[liveMatch] push team.liveMatch au mount →', teamId, M.id);
    window.cddData.setTeamLiveMatch(teamId, M.id)
      .then(r => console.info('[liveMatch] ✓ mount push OK', r))
      .catch(e => console.warn('[liveMatch] mount push FAIL:', e.message));
  }, [M && M.id, M && M.st, M && M.notStarted]);

  // Push cloud fire-and-forget : permet aux parents/adjoints/joueurs absents
  // de suivre le LIVE en temps réel via watchMatchFromCloud. Ne bloque pas
  // l'UX coach si Firestore est lent ou indisponible.
  // ⚠ Pousse AUSSI le pointeur team.liveMatch à chaque tick (auto-rattrapage
  // pour les cas où le useEffect au mount n'aurait pas fonctionné — caches,
  // matchs commencés avant la mise à jour du code, etc.).
  const _pushLive = (M) => {
    if (!M || M.notStarted || M.st === 'finished') return;
    if (!window.cddSync?.saveMatchToCloud) return;
    window.cddSync.saveMatchToCloud(M)
      .catch(e => console.warn('[match-live] cloud push:', e.message));
    // Auto-rattrapage du pointeur live : fallback teamId via getActiveTeam
    // si M.teamId est manquant (matchs anciens créés sans teamId).
    try {
      const teamId = M.teamId || (window.CDD?.getActiveTeam?.()?.id) || null;
      if (teamId && M.id && window.cddData?.setTeamLiveMatch) {
        console.info('[liveMatch] push team.liveMatch tick →', teamId, M.id);
        window.cddData.setTeamLiveMatch(teamId, M.id)
          .catch(e => console.warn('[liveMatch] tick push fail', e.message));
      } else {
        console.warn('[liveMatch] tick push skipped — teamId=', teamId,
          'matchId=', M.id, 'cddData ready?', !!window.cddData?.setTeamLiveMatch);
      }
    } catch (e) { console.warn('[liveMatch] tick push exception', e.message); }
  };

  const rerender = () => {
    forceRender({});
    if (M) M.savedAt = Date.now();
    MATCH_HELPERS.saveMatch(M);
    _pushLive(M);
  };

  // Auto-save toutes les 10 secondes pendant le match (#20)
  // + push cloud → maintient le live à jour pour les viewers même si le
  // coach n'a pas tapé d'action récemment (chrono qui avance, pause, etc.).
  useEffectMV(() => {
    if (!M || M.notStarted || M.st === 'finished') return;
    const tick = setInterval(() => {
      M.savedAt = Date.now();
      MATCH_HELPERS.saveMatch(M);
      _pushLive(M);
    }, 10000);
    return () => clearInterval(tick);
  }, [M, M && M.st, M && M.notStarted]);

  // ── Watch cloud pour toute device avec match live ──────────────────────
  // S'abonne à Firestore et synchronise les champs critiques (tSt, tOff,
  // startedAt, st, score, events) dès qu'ils changent côté origine.
  // - Sur le device origine : la plupart des snapshots seront identiques au
  //   local (boucle de retour de notre propre push), donc no-op via la
  //   comparaison curr[k] !== upd[k]. Aucune surcharge UX.
  // - Sur le device distant : le tSt cloud (valide) remplace le tSt local
  //   (null/stale), le chrono passe instantanément à la bonne valeur.
  // NB : on évite de dépendre d'un flag _pulledFromCloud qui peut manquer
  // sur un localStorage écrit avant le déploiement du fix v164.
  useEffectMV(() => {
    if (!M || M.notStarted || M.st === 'finished') return;
    if (!window.cddSync || !window.cddSync.watchMatchFromCloud) return;
    console.info('[liveMatch] abonnement watch cloud →', M.id);
    const unsub = window.cddSync.watchMatchFromCloud(M.id, (doc) => {
      if (!doc || !Mref.current) return;
      const curr = Mref.current;
      let changed = false;
      // Mise à jour des champs critiques depuis le cloud (chrono + score + events).
      // Règle : on n'écrase JAMAIS une valeur locale valide avec un null cloud.
      // Sinon un device origine (qui a tSt correct) verrait son tSt remis à null
      // si le cloud n'a pas encore les nouveaux champs (cas du doc legacy v162).
      const upd = {
        tSt:           doc.tSt           != null ? doc.tSt           : curr.tSt,
        tOff:          typeof doc.tOff === 'number' ? doc.tOff       : (curr.tOff || 0),
        startedAt:     doc.startedAt     != null ? doc.startedAt     : curr.startedAt,
        pauseStartedAt:doc.pauseStartedAt != null ? doc.pauseStartedAt : curr.pauseStartedAt,
        inHalftime:    doc.inHalftime    != null ? doc.inHalftime    : curr.inHalftime,
        htStart:       doc.htStart       != null ? doc.htStart       : curr.htStart,
        st:            doc.status        || curr.st,
        ch:            doc.period        || curr.ch,
        sA:            doc.teamA != null ? (typeof doc.teamA.score === 'number' ? doc.teamA.score : curr.sA) : curr.sA,
        sB:            doc.teamB != null ? (typeof doc.teamB.score === 'number' ? doc.teamB.score : curr.sB) : curr.sB,
        ev:            doc.events        || curr.ev,
        at:            typeof doc.addTime === 'number' ? doc.addTime : (curr.at || 0),
      };
      Object.keys(upd).forEach(k => {
        if (curr[k] !== upd[k]) { curr[k] = upd[k]; changed = true; }
      });
      if (changed) {
        console.info('[liveMatch] ✓ cloud sync →', { tSt: curr.tSt, st: curr.st, sA: curr.sA, sB: curr.sB });
        forceRender({});
      }
    });
    return () => { try { unsub(); } catch (e) {} };
  }, [M && M.id, M && M.st, M && M.notStarted]);

  // ─── Match controls ─────────────────────────────────
  const startMatch = () => {
    M.notStarted = false;
    // CAPTURE FIABLE DU SCHEDULED ID : ici on est SÛRS d'avoir le bon
    // CDD_NEXT_MATCH (le coach vient juste d'arriver depuis Convocations /
    // Match-prep, où il a vu ce match précis). On override systématiquement
    // pour couvrir le cas où M a été chargé depuis localStorage sans cet
    // id (match repris en mémoire).
    if (window.CDD_NEXT_MATCH && window.CDD_NEXT_MATCH.id) {
      M.scheduledMatchId = window.CDD_NEXT_MATCH.id;
    }
    M.tSt = Date.now();
    M.tOff = 0;
    M.st = 'live';
    M.startedAt = Date.now();
    // Horodatage absolu de la période en cours (1 au démarrage). Référence pour
    // l'arbitre en cas de contestation post-match.
    M.periodStartedAt = M.periodStartedAt || {};
    M.periodStartedAt[1] = Date.now();
    // ⚠️ C'est ICI qu'on déclare officiellement le match comme "en cours".
    // Le pointeur cdd_match_current est positionné maintenant (et pas au bootstrap)
    // pour que les autres écrans (accueil) ne voient pas de fantôme prematch.
    try { localStorage.setItem('cdd_match_current', M.id); } catch (e) {}
    // Push cloud du pointeur "match en cours" pour propagation cross-device :
    // adjoints, parents, joueurs, lecteurs, et 2e device du coach verront le
    // match au prochain pull (fire-and-forget, ne bloque pas le coup d'envoi).
    try {
      if (window.cddData?.setTeamLiveMatch && M.teamId) {
        window.cddData.setTeamLiveMatch(M.teamId, M.id)
          .catch(e => console.warn('[liveMatch] push start', e.message));
      }
    } catch (e) {}
    MATCH_SFX.playWhistle();
    MATCH_SFX.vibrate(200);
    if (MATCH_HELPERS.requestWakeLock) MATCH_HELPERS.requestWakeLock();
    if (MATCH_HELPERS.goFullscreen)    MATCH_HELPERS.goFullscreen();
    if (MATCH_HELPERS.startSilenceLoop) MATCH_HELPERS.startSilenceLoop();
    rerender();
  };

  // Blessure flow (#16)
  // Côté A (mon équipe) : picker joueur + workflow remplacement.
  // Côté B (adversaire) : pas d'effectif détaillé → on enregistre juste l'évènement
  // dans la timeline pour qu'il apparaisse sur la feuille de match (utile au compte-rendu).
  const handleInjury = (side) => {
    if (side === 'B') {
      const mn = MATCH_HELPERS.gMin(M);
      M.ev.push({ tp:'injury', t:'B', mn, ch: M.ch, pl:'Joueur adversaire', ts: Date.now() });
      MATCH_SFX.vibrate(150);
      rerender();
      return;
    }
    setActiveFlow({ kind: 'injury', side });
  };
  const handleInjuryPick = (side) => (player) => {
    if (MATCH_HELPERS.setInjured) MATCH_HELPERS.setInjured(M, side, player.id);
    else {
      const mn = MATCH_HELPERS.gMin(M);
      M.ev.push({ tp:'injury', t: side, mn, ch: M.ch, pl: MATCH_HELPERS.playerLabel(player), ts: Date.now() });
    }
    MATCH_SFX.vibrate(150);
    setSubOut(player);
    setActiveFlow({ kind: 'sub-in', side });
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
      M.pauseStartedAt = Date.now();
    } else if (M.st === 'paused') {
      // Cumuler le temps passe en pause
      if (M.pauseStartedAt) {
        M.pauseTotalMs = (M.pauseTotalMs || 0) + (Date.now() - M.pauseStartedAt);
        M.pauseStartedAt = null;
      }
      // Capture l'horodatage de reprise de la période (utile à l'arbitre en cas
      // de contestation). On enregistre une seule fois par période.
      if (M.inHalftime && !M.periodStartedAt?.[M.ch]) {
        M.periodStartedAt = M.periodStartedAt || {};
        M.periodStartedAt[M.ch] = Date.now();
      }
      M.inHalftime = false; // si on reprend, on sort de la mi-temps
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
    M.ev.push({ tp:'half', mn: MATCH_HELPERS.gMin(M), ch: M.ch, ts: Date.now(), _prev: snap });
    M.ch++; M.tOff = 0; M.st = 'paused'; M.tSt = Date.now();
    M.pauseStartedAt = Date.now();
    M.inHalftime = true; // #37 — entre 2 mi-temps : bloquer actions
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
    M.ev.push({ tp:'end', mn: MATCH_HELPERS.gMin(M), ch: M.ch, ts: Date.now(), _prev: snap });
    M.st = 'finished';
    M.endedAt = Date.now();
    MATCH_SFX.playBuzzer();
    MATCH_SFX.vibrate(500);
    setShowHtModal(null);
    // Libérer ressources terrain
    if (MATCH_HELPERS.releaseWakeLock)  MATCH_HELPERS.releaseWakeLock();
    if (MATCH_HELPERS.stopSilenceLoop)  MATCH_HELPERS.stopSilenceLoop();
    if (MATCH_HELPERS.exitFullscreen)   MATCH_HELPERS.exitFullscreen();
    // ID DU MATCH PROGRAMMÉ : pour les filtres post-match, on a besoin
    // de l'id qui figure dans CDD_NEXT_MATCH / CDD_FRIENDLY, PAS l'id
    // local 'm_xxx' généré par newMatch. Sans ça, le filtre ne reconnaît
    // pas le match comme terminé. M.id (= m_xxx) sert quand même au stockage
    // local du match pour la feuille post-match / vote.
    // FALLBACK : si scheduledMatchId pas capturé (ex: match repris depuis
    // localStorage qui n'avait pas ce champ), on lit MAINTENANT
    // CDD_NEXT_MATCH.id. Mieux que rien — généralement le match en cours
    // EST encore le prochain (il ne devient terminé qu'à cette ligne).
    const _scheduledId = M.scheduledMatchId
      || (window.CDD_NEXT_MATCH && window.CDD_NEXT_MATCH.id)
      || M.id;
    console.info('[endMatch] scheduledId=' + _scheduledId
      + ' (M.scheduledMatchId=' + M.scheduledMatchId
      + ', CDD_NEXT_MATCH.id=' + (window.CDD_NEXT_MATCH && window.CDD_NEXT_MATCH.id)
      + ', local M.id=' + M.id + ')');
    // Match terminé : cdd_match_current libéré pour qu'un nouveau match puisse être créé.
    // L'ID reste dans cdd_match_last_finished pour la page Vote post-match.
    try {
      // On stocke le scheduledId (= id reconnu par les filtres data-bridge /
      // match-switcher / friendly-matches). Si pas de scheduled (match
      // 100% improvisé sans CDD_NEXT_MATCH source), on garde M.id en fallback.
      localStorage.setItem('cdd_match_last_finished', _scheduledId);
      localStorage.removeItem('cdd_match_current');
    } catch (e) {}
    // Clear le pointeur cloud "match en cours" pour les autres devices.
    try {
      const _teamForClear = (M && M.teamId) || window.CDD?.getActiveTeam?.()?.id;
      if (_teamForClear && window.cddData?.clearTeamLiveMatch) {
        window.cddData.clearTeamLiveMatch(_teamForClear)
          .catch(e => console.warn('[liveMatch] clear end', e.message));
      }
    } catch (e) {}
    // BASCULE POST-MATCH : marquer l'amical comme terminé (s'il y en a un)
    // pour qu'il disparaisse de la liste "à venir". Pour les FFF, c'est
    // le filtre cdd_match_last_finished + date passée qui s'en charge.
    try {
      const _teamId = window.CDD?.getActiveTeam?.()?.id;
      if (_teamId && window.CDD_FRIENDLY?.markEnded && window.CDD_FRIENDLY?.get) {
        if (window.CDD_FRIENDLY.get(_teamId, _scheduledId)) {
          window.CDD_FRIENDLY.markEnded(_teamId, _scheduledId);
          console.info('[endMatch] amical marqué terminé : ' + _scheduledId);
        }
      }
    } catch (e) { console.warn('[match] markEnded failed', e); }
    // Force le rebuild de CDD_NEXT_MATCH pour basculer sur le match suivant
    // (ou noUpcoming si plus aucun à venir). Sans ça, les écrans
    // Accueil/Convocations/Match-prep continuaient à proposer le match
    // terminé "J-0 · À VENIR · 15 parents pas encore répondu...".
    try {
      if (window.CDD_REBUILD) window.CDD_REBUILD();
    } catch (e) {}
    // Push final cloud : status='finished' visible des viewers (parents)
    // qui peuvent ainsi sortir le match de leur "prochain match" via watch.
    _pushLive(M);
    // Auto-progression OVR : applique les deltas de stats sur chaque joueur ayant joué.
    // Le vote parents/coach viendra s'ajouter plus tard via ScreenVote.submitVote().
    try {
      if (window.CDD_COACH?.applyMatchPerformanceDeltas) {
        window.CDD_COACH.applyMatchPerformanceDeltas(M);
      }
    } catch (e) { console.warn('[match] perf deltas failed', e); }
    rerender();
  };

  // ─── Goal flow ──────────────────────────────────────
  const handleGoalDone = (side) => (data) => {
    const { scorer, passer, type, penaltyType, obtainedBy, causedBy } = data;
    const mn = MATCH_HELPERS.gMin(M);
    if (side === 'A') M.sA++; else M.sB++;

    const scorerLbl = '#'+scorer.num+(scorer.first?' '+scorer.first:'');
    let pl = scorerLbl;
    let evt = { tp:'goal', t: side, mn, ch: M.ch, scorer: scorerLbl, ts: Date.now() };

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
      M.ev.push({ tp:'yellow', t: side, mn, ch: M.ch, pl: playerLbl, ts: Date.now() });
      if (side === 'A') M.rA++; else M.rB++;
      M.ev.push({ tp:'red', t: side, mn, ch: M.ch, pl: playerLbl, auto: true, ts: Date.now() });
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
    M.ev.push({ tp: color, t: side, mn, ch: M.ch, pl: playerLbl, ts: Date.now() });
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
  // Règle amateur : pas de limite de changements, un joueur peut rentrer/sortir
  // plusieurs fois. Le sortant devient remplaçant (onField=false), l'entrant
  // passe sur le terrain (onField=true). Les pickers suivants reflètent
  // immédiatement la nouvelle réalité.
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
    M.ev.push({ tp:'sub', t: side, mn, ch: M.ch, out: outLbl, inn: inLbl, pl: outLbl+' → '+inLbl, ts: Date.now() });

    // ⚠️ SWAP RÉEL des positions : sans ça, le sortant reste considéré 'sur le terrain'
    // et l'entrant peut être resélectionné comme entrant -> match à 10 joueurs.
    const team = side === 'A' ? M.tA : M.tB;
    const findIn = (list, id) => (list || []).findIndex(x => x.id === id);
    // 1. Sortant : bascule onField=false. S'il est dans team.p, on le déplace en bench.
    const outId = subOut && subOut.id;
    if (outId) {
      const idxInP = findIn(team.p, outId);
      if (idxInP >= 0) {
        const [removed] = team.p.splice(idxInP, 1);
        removed.onField = false;
        team.bench = team.bench || [];
        // Évite les doublons si déjà présent
        if (!team.bench.some(x => x.id === outId)) team.bench.push(removed);
      } else {
        const idxInBench = findIn(team.bench, outId);
        if (idxInBench >= 0) team.bench[idxInBench].onField = false;
      }
    }
    // 2. Entrant : bascule onField=true. S'il est dans team.bench, on le déplace dans team.p.
    const inId = player && player.id;
    if (inId) {
      const idxInBench = findIn(team.bench, inId);
      if (idxInBench >= 0) {
        const [added] = team.bench.splice(idxInBench, 1);
        added.onField = true;
        team.p = team.p || [];
        if (!team.p.some(x => x.id === inId)) team.p.push(added);
      } else {
        const idxInP = findIn(team.p, inId);
        if (idxInP >= 0) team.p[idxInP].onField = true;
      }
    }

    MATCH_SFX.vibrate(100);
    setSubOut(null);
    setActiveFlow(null);
    rerender();
  };

  // ─── Undo ──────────────────────────────────────────
  const handleUndo = () => {
    if (!canEdit) return;
    if (M.ev.length === 0) return;
    const last = M.ev[M.ev.length - 1];
    if (last.tp === 'goal') { if (last.t === 'A') M.sA--; else M.sB--; }
    if (last.tp === 'yellow') { if (last.t === 'A') M.yA--; else M.yB--; }
    if (last.tp === 'red') { if (last.t === 'A') M.rA--; else M.rB--; }
    if (last.tp === 'sub') {
      if (last.t === 'A') M.uA--; else M.uB--;
      // Reverse swap : on remet le sortant sur le terrain et le rentrant sur le banc.
      // Sans ça, annuler un changement ne corrige pas la composition.
      const team = last.t === 'A' ? M.tA : M.tB;
      const findIn = (list, lbl) => (list || []).findIndex(x => MATCH_HELPERS.playerLabel(x) === lbl);
      // outLbl était le SORTANT (à remettre sur le terrain)
      const outIdxBench = findIn(team.bench, last.out);
      if (outIdxBench >= 0) {
        const [restored] = team.bench.splice(outIdxBench, 1);
        restored.onField = true;
        team.p = team.p || [];
        if (!team.p.some(x => x.id === restored.id)) team.p.push(restored);
      }
      // innLbl était l'ENTRANT (à renvoyer sur le banc)
      const inIdxP = findIn(team.p, last.inn);
      if (inIdxP >= 0) {
        const [reverted] = team.p.splice(inIdxP, 1);
        reverted.onField = false;
        team.bench = team.bench || [];
        if (!team.bench.some(x => x.id === reverted.id)) team.bench.push(reverted);
      }
    }
    if ((last.tp === 'half' || last.tp === 'end') && last._prev) {
      Object.assign(M, last._prev);
    }
    M.ev.pop();
    MATCH_SFX.vibrate(80);
    rerender();
  };

  // #37 — Bloquer aussi les actions pendant la mi-temps (entre 2 periodes)
  const inHt = MATCH_HELPERS.isInHalftime ? MATCH_HELPERS.isInHalftime(M) : false;
  const disabled = M.notStarted || M.st === 'finished' || inHt;
  const team = activeFlow ? (activeFlow.side === 'A' ? M.tA : M.tB) : null;

  // ─── Render ────────────────────────────────────────
  return (
    <div className="scr scr-match-v2 fade-in" data-screen-label="04 Match Live">

      <MatchHeader M={M} minute={minute}
        onWhistle={() => { MATCH_SFX.playWhistle(); MATCH_SFX.vibrate(50); }}
        onShowOnly={() => setActiveFlow({ kind:'show-only' })}
        onShowLineup={() => setShowLineup(true)}/>

      {/* Pre-match setup adversaire (#14) — 1ère étape : réglages + couleurs */}
      {M.notStarted && !setupValidated && (
        <PreMatchSetup M={M}
          onStart={() => { setSetupValidated(true); rerender(); }}
          rerender={rerender} canEdit={canEdit}/>
      )}

      {/* 2ème étape : vérification des numéros de maillot avant coup d'envoi.
          Évite que le chrono démarre sans que le coach ait revu sa compo. */}
      {M.notStarted && setupValidated && (
        <PreMatchJerseyCheck M={M}
          onConfirm={startMatch}
          onBack={() => { setSetupValidated(false); rerender(); }}
          onEditJerseys={() => setJerseyModalOpen(true)}
          canEdit={canEdit}/>
      )}

      {/* Modale d'édition des numéros maillots match — réutilise le composant
          existant utilisé depuis la page Compo/Convocations. */}
      {jerseyModalOpen && window.JerseyNumbersModal && (() => {
        const _teamId = window.CDD?.getActiveTeam?.()?.id;
        const _matchId = window.CDD_NEXT_MATCH?.id || 'placeholder';
        const _players = [...(M.tA?.p || []), ...(M.tA?.bench || [])]
          .map(lbl => {
            // p est une string "#N Prénom" ou un objet ; le composant attend
            // des objets player. On reconstruit le minimum nécessaire à
            // partir de CDD_PLAYERS si dispo.
            if (typeof lbl === 'string') {
              const m = lbl.match(/^#?(\d+)\s+(.+)$/);
              if (m) {
                const num = parseInt(m[1], 10);
                const first = m[2];
                const found = (window.CDD_PLAYERS || []).find(p => p.first === first);
                return found ? { ...found, num } : { id: first, first, num };
              }
            }
            return lbl;
          });
        return (
          <window.JerseyNumbersModal
            teamId={_teamId}
            matchId={_matchId}
            players={_players}
            title="🔢 NUMÉROS MAILLOTS DU MATCH"
            onClose={() => setJerseyModalOpen(false)}/>
        );
      })()}

      {/* Vue Composition en match (#17) */}
      {showLineup && (
        <LineupOverlay M={M} onClose={() => setShowLineup(false)}/>
      )}

      {/* Résumé partageable post-match (#60) */}
      {showSummaryShare && (
        <MatchSummaryShareModal M={M} onClose={() => setShowSummaryShare(false)}/>
      )}

      {/* Feuille de match post-fin (#19) */}
      {showFiche && (
        <FicheMatchOverlay M={M}
                           onClose={() => setShowFiche(false)}
                           onEditEvent={(idx) => setEditingEvent({idx, ev: M.ev[idx]})}
                           onShare={async () => {
                             const text = `${M.tA.n} ${M.sA} - ${M.sB} ${M.tB.n}\n`
                                        + (M.ev || []).filter(e => e.tp === 'goal')
                                          .map(e => `${e.mn}' ${e.pl}${e.passer ? ' (P. '+e.passer+')' : ''}`).join('\n');
                             if (navigator.share) {
                               try { await navigator.share({ title: 'Feuille de match', text }); }
                               catch (e) {}
                             } else {
                               try { await navigator.clipboard.writeText(text); alert('Feuille copiee dans le presse-papier'); }
                               catch (e) { alert('Partage indisponible'); }
                             }
                           }}/>
      )}

      {/* Editeur d'event post-match (#19) */}
      {editingEvent && (
        <EditEventOverlay M={M} idx={editingEvent.idx} ev={editingEvent.ev}
                          onSave={() => { setEditingEvent(null); rerender(); }}
                          onClose={() => setEditingEvent(null)}/>
      )}

      {!M.notStarted && (
        <>
          {/* #C5 — bandeau lecture seule + masquage des contrôles d'édition. */}
          {!canEdit && (
            <div style={{
              margin:'10px 14px', padding:'9px 13px', borderRadius:10, fontSize:12,
              background:'rgba(125,211,252,0.08)', border:'1px solid rgba(125,211,252,0.30)',
              color:'#7dd3fc', display:'flex', alignItems:'center', gap:7,
            }}>
              <span>👁</span><span>Mode lecture seule — tu suis le match, sans le piloter.</span>
            </div>
          )}

          {canEdit && (
            <ActionsMatrix M={M} disabled={disabled}
              isAtHome={(M.isAtHome !== undefined) ? !!M.isAtHome : (window.CDD_NEXT_MATCH?.venue === 'Domicile')}
              onGoal={(side) => setActiveFlow({ kind:'goal', side })}
              onCard={handleCard}
              onSub={(side) => setActiveFlow({ kind:'sub-out', side })}
              onInjury={handleInjury}/>
          )}

          {canEdit && (
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
            ) : M.st !== 'finished' ? (
              <button className="mv-ctrl mv-ctrl-end" onClick={() => {
                setConfirm({
                  title: '🏁 Coup de sifflet final ?',
                  msg: `Score : ${M.tA.n} ${M.sA} - ${M.sB} ${M.tB.n}. Le match sera clôturé et tu pourras voir la feuille de match.`,
                  okLabel: 'OUI, FIN DU MATCH',
                  cancelLabel: 'Annuler',
                  onOk: () => { setConfirm(null); endMatch(); },
                  onCancel: () => setConfirm(null),
                });
              }}>🏁 Fin de match</button>
            ) : null}
          </div>
          )}

          <EventsTimeline M={M} onUndo={handleUndo}
                          onEdit={(idx) => { if (canEdit) setEditingEvent({idx, ev: M.ev[idx]}); }}/>

          {M.st === 'finished' && (
            <>
              <div style={{
                padding: '20px 14px', margin: '14px',
                background: 'linear-gradient(135deg, rgba(200,241,105,.18), rgba(132,204,22,.12))',
                border: '2px solid rgba(200,241,105,.4)',
                borderRadius: 16, textAlign: 'center',
              }}>
                <div style={{fontSize: 32, marginBottom: 8}}>🏁</div>
                <div style={{
                  fontSize: 18, fontWeight: 900, letterSpacing: '.08em',
                  color: '#c8f169', textTransform: 'uppercase', marginBottom: 6,
                }}>MATCH TERMINÉ</div>
                <div style={{
                  fontSize: 32, fontWeight: 900, color: '#fff', marginBottom: 12,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {M.tA.n} {M.sA} – {M.sB} {M.tB.n}
                </div>
                <button onClick={() => setShowFiche(true)}
                        style={{
                          width:'100%', padding:'14px', fontSize:14, fontWeight:800,
                          background:'#c8f169', color:'#000', borderRadius:12, border:'none',
                          boxShadow:'0 4px 14px rgba(200,241,105,.4)', cursor:'pointer',
                          letterSpacing: '.05em',
                        }}>
                  📋 VOIR LA FEUILLE DE MATCH
                </button>
                <button onClick={() => setShowSummaryShare(true)}
                        style={{
                          width:'100%', padding:'14px', fontSize:14, fontWeight:800, marginTop:8,
                          background:'linear-gradient(135deg, #25D366, #128C7E)',
                          color:'#fff', borderRadius:12, border:'none',
                          boxShadow:'0 4px 14px rgba(37,211,102,.35)', cursor:'pointer',
                          letterSpacing: '.05em',
                          display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                        }}>
                  📲 PARTAGER LE RÉSUMÉ DU MATCH
                </button>
                {!M.matchType && (
                  <button onClick={() => setShowMatchType(true)}
                          style={{
                            width:'100%', padding:'12px', marginTop:8,
                            fontSize:12, fontWeight:700,
                            background:'rgba(251,191,36,.15)',
                            border:'1px solid rgba(251,191,36,.4)',
                            color:'#fbbf24', borderRadius:10, cursor:'pointer',
                          }}>
                    ⚠️ Préciser le type de match (Champ / Amical / …)
                  </button>
                )}
              </div>
            </>
          )}
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

      {/* Blessure flow (#16) */}
      {activeFlow?.kind === 'injury' && (
        <PlayerPicker title="🩹 Joueur blessé"
          subtitle="Tape sur le joueur blessé. Tu pourras le remplacer juste après."
          team={team} mode="all" M={M}
          onPick={handleInjuryPick(activeFlow.side)}
          onCancel={() => setActiveFlow(null)}/>
      )}

      {/* Sub flow — amateur, pas de limite. Sortant : uniquement les joueurs sur le terrain.
          Entrant : uniquement les joueurs hors terrain (banc + sortis précédemment). */}
      {activeFlow?.kind === 'sub-out' && (
        <PlayerPicker title="🔻 Joueur sortant"
          subtitle="Tape sur celui qui sort du terrain"
          team={team} mode="field" M={M}
          onPick={handleSubOut(activeFlow.side)}
          onCancel={() => setActiveFlow(null)}/>
      )}
      {activeFlow?.kind === 'sub-in' && (
        <PlayerPicker title="🔺 Joueur entrant"
          subtitle={`Pour ${MATCH_HELPERS.playerLabel(subOut)}`}
          team={team} mode="bench" M={M}
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

// ──────────────────────────────────────────────────────────
// Setup adversaire pré-match (#14)
// ──────────────────────────────────────────────────────────
function PreMatchSetup({ M, onStart, rerender, canEdit }) {
  // Pré-remplissage intelligent depuis CDD_NEXT_MATCH si dispo :
  // - nom adversaire (opponentName) → pas besoin de re-saisir
  // - type de match (isAmical → 'amical', fffMatchId → 'championnat')
  // Évite la friction "tout ressaisir" quand le match est déjà programmé.
  const _next = window.CDD_NEXT_MATCH || {};
  const _autoOpp = (() => {
    if (M.tB?.n && M.tB.n !== 'Adversaire') return M.tB.n;
    return _next.opponentName
        || (_next.venue === 'Domicile' ? _next.away : _next.home)
        || 'Adversaire';
  })();
  const _autoType = (() => {
    if (M.matchType) return M.matchType;
    if (M.fffMatchId) return 'championnat';
    if (_next.isAmical) return 'amical';
    if (!_next.noUpcoming && _next.opponentName) return 'championnat';
    return '';
  })();
  const [oppName, setOppName] = useStateMV(_autoOpp);
  const [oppColor, setOppColor] = useStateMV(M.tB?.c || '#3b82f6');
  const [oppColor2, setOppColor2] = useStateMV(M.tB?.c2 || '#ffffff');
  const [hd, setHd] = useStateMV(M.cfg?.hd || 45);
  const [htd, setHtd] = useStateMV(M.cfg?.htd || 15);
  const [hs, setHs] = useStateMV(M.cfg?.hs || 2);
  const [matchType, setMatchType] = useStateMV(_autoType);
  const _autoAtHome = M.isAtHome !== undefined ? M.isAtHome : (_next.venue === 'Domicile');
  const [isAtHome, setIsAtHome] = useStateMV(_autoAtHome);

  const MATCH_TYPES = [
    { id: 'championnat',  ic: '🏆', label: 'Championnat (FFF)' },
    { id: 'coupe',        ic: '🏟', label: 'Coupe' },
    { id: 'amical',       ic: '🤝', label: 'Amical' },
    { id: 'entrainement', ic: '💪', label: 'Entraînement' },
    { id: 'tournoi',      ic: '🎯', label: 'Tournoi' },
  ];

  const applyAndStart = () => {
    if (!canEdit) return;
    if (MATCH_HELPERS.setOpponent) MATCH_HELPERS.setOpponent(M, oppName.trim() || 'Adversaire', oppColor, { color2: oppColor2 });
    M.cfg = M.cfg || {};
    M.cfg.hd  = parseInt(hd, 10)  || 45;
    M.cfg.htd = parseInt(htd, 10) || 15;
    M.cfg.hs  = parseInt(hs, 10)  || 2;
    M.matchType = matchType || 'amical'; // par defaut si non choisi
    M.isAtHome = isAtHome;
    rerender();
    setTimeout(onStart, 50);
  };
  return (
    <div className="mv-prematch">
      <div className="mv-prematch-glow"/>
      <div className="mv-prematch-k">PRÉ-MATCH · SETUP</div>
      <div className="mv-prematch-t">Réglages match</div>
      <div style={{background:'rgba(0,0,0,.35)', borderRadius:12, padding:'14px 16px',
                   margin:'14px 0', width:'min(420px, 92%)',
                   border:'1px solid rgba(255,255,255,.08)'}}>
        <label style={{display:'block', marginBottom:12}}>
          <span style={{display:'block', fontSize:11, fontWeight:700, letterSpacing:'.08em',
                        color:'rgba(255,255,255,.7)', marginBottom:4, textTransform:'uppercase'}}>
            Nom de l'adversaire
          </span>
          <input type="text" value={oppName} onChange={e => setOppName(e.target.value)}
                 placeholder="ex: FC PONTOISE"
                 style={{width:'100%', height:38, background:'rgba(0,0,0,.4)',
                         border:'1px solid rgba(255,255,255,.12)', borderRadius:8,
                         color:'#fff', padding:'0 12px', fontSize:14, outline:'none'}}/>
        </label>
        <label style={{display:'block', marginBottom:12}}>
          <span style={{display:'block', fontSize:11, fontWeight:700, letterSpacing:'.08em',
                        color:'rgba(255,255,255,.7)', marginBottom:6, textTransform:'uppercase'}}>
            Couleurs adversaire (maillot + 2e couleur)
          </span>
          <div style={{display:'flex', gap:8, alignItems:'center'}}>
            <input type="color" value={oppColor} onChange={e => setOppColor(e.target.value)}
                   title="Couleur principale (maillot)"
                   style={{height:38, width:'40%', borderRadius:8, border:'none', padding:0, background:'transparent', cursor:'pointer'}}/>
            <input type="color" value={oppColor2} onChange={e => setOppColor2(e.target.value)}
                   title="Couleur secondaire (short / liserés)"
                   style={{height:38, width:'40%', borderRadius:8, border:'none', padding:0, background:'transparent', cursor:'pointer'}}/>
            <div title="Aperçu badge"
                 style={{width:38, height:38, borderRadius:'50%',
                         background: `linear-gradient(135deg, ${oppColor} 50%, ${oppColor2} 50%)`,
                         border:'2px solid rgba(255,255,255,.6)',
                         boxShadow:'0 2px 6px rgba(0,0,0,.4)'}}/>
          </div>
          <div style={{fontSize:10, color:'rgba(255,255,255,.4)', marginTop:4}}>
            💡 Pour une équipe monochrome, choisis 2 fois la même couleur.
          </div>
        </label>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8}}>
          <label>
            <span style={{display:'block', fontSize:10, fontWeight:700, color:'rgba(255,255,255,.6)', marginBottom:4}}>Mi-temps (min)</span>
            <input type="number" min="10" max="60" value={hd} onChange={e => setHd(e.target.value)}
                   style={{width:'100%', height:36, background:'rgba(0,0,0,.4)', border:'1px solid rgba(255,255,255,.12)',
                           borderRadius:8, color:'#fff', padding:'0 8px', fontSize:14, textAlign:'center'}}/>
          </label>
          <label>
            <span style={{display:'block', fontSize:10, fontWeight:700, color:'rgba(255,255,255,.6)', marginBottom:4}}>Pause (min)</span>
            <input type="number" min="0" max="30" value={htd} onChange={e => setHtd(e.target.value)}
                   style={{width:'100%', height:36, background:'rgba(0,0,0,.4)', border:'1px solid rgba(255,255,255,.12)',
                           borderRadius:8, color:'#fff', padding:'0 8px', fontSize:14, textAlign:'center'}}/>
          </label>
          <label>
            <span style={{display:'block', fontSize:10, fontWeight:700, color:'rgba(255,255,255,.6)', marginBottom:4}}>Nb périodes</span>
            <input type="number" min="1" max="4" value={hs} onChange={e => setHs(e.target.value)}
                   style={{width:'100%', height:36, background:'rgba(0,0,0,.4)', border:'1px solid rgba(255,255,255,.12)',
                           borderRadius:8, color:'#fff', padding:'0 8px', fontSize:14, textAlign:'center'}}/>
          </label>
        </div>
      </div>

      {/* Selecteur de type de match (#42) */}
      <div style={{
        background:'rgba(0,0,0,.35)', borderRadius:12, padding:'14px 16px',
        marginBottom:14, width:'min(420px, 92%)',
        border:'1px solid rgba(255,255,255,.08)',
      }}>
        <div style={{fontSize:11, fontWeight:800, letterSpacing:'.1em',
                     color:'rgba(255,255,255,.7)', marginBottom:8,
                     textTransform:'uppercase'}}>
          Type de match
        </div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:6}}>
          {MATCH_TYPES.map(t => (
            <button key={t.id} type="button" onClick={() => setMatchType(t.id)}
                    style={{
                      padding:'10px 12px', borderRadius:9,
                      border:'1px solid ' + (matchType === t.id ? 'var(--acc, #c8f169)' : 'rgba(255,255,255,.12)'),
                      background: matchType === t.id ? 'rgba(200,241,105,.18)' : 'rgba(0,0,0,.3)',
                      color: matchType === t.id ? '#c8f169' : '#fff',
                      fontSize:13, fontWeight:700, cursor:'pointer',
                      display:'flex', alignItems:'center', gap:8,
                    }}>
              <span style={{fontSize:16}}>{t.ic}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
        {!matchType && (
          <div style={{fontSize:11, color:'rgba(251,191,36,.8)', marginTop:8}}>
            ⚠️ Tu peux choisir plus tard, par defaut le match sera classe en Amical.
          </div>
        )}
      </div>

      {/* Lieu du match — domicile ou extérieur */}
      <div style={{
        background:'rgba(0,0,0,.35)', borderRadius:12, padding:'14px 16px',
        marginBottom:14, width:'min(420px, 92%)',
        border:'1px solid rgba(255,255,255,.08)',
      }}>
        <div style={{fontSize:11, fontWeight:800, letterSpacing:'.1em',
                     color:'rgba(255,255,255,.7)', marginBottom:8,
                     textTransform:'uppercase'}}>
          Lieu du match
        </div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:6}}>
          {[
            { val: true,  ic: '🏠', label: 'Domicile' },
            { val: false, ic: '✈️', label: 'Extérieur' },
          ].map(opt => (
            <button key={String(opt.val)} type="button" onClick={() => setIsAtHome(opt.val)}
                    style={{
                      padding:'10px 12px', borderRadius:9,
                      border:'1px solid ' + (isAtHome === opt.val ? 'var(--acc, #c8f169)' : 'rgba(255,255,255,.12)'),
                      background: isAtHome === opt.val ? 'rgba(200,241,105,.18)' : 'rgba(0,0,0,.3)',
                      color: isAtHome === opt.val ? '#c8f169' : '#fff',
                      fontSize:13, fontWeight:700, cursor:'pointer',
                      display:'flex', alignItems:'center', gap:8,
                    }}>
              <span style={{fontSize:16}}>{opt.ic}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {canEdit ? (
        <button className="mv-prematch-btn" onClick={applyAndStart}>
          <span>▶ VALIDER ET VÉRIFIER LES NUMÉROS</span>
        </button>
      ) : (
        <div style={{
          margin:'12px 14px 0', padding:'11px 14px', borderRadius:10, fontSize:12,
          background:'rgba(125,211,252,0.08)', border:'1px solid rgba(125,211,252,0.30)',
          color:'#7dd3fc', textAlign:'center',
        }}>👁 Lecture seule — seul un coach peut lancer le match.</div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Étape intermédiaire : vérification des numéros de maillot avant
// le coup d'envoi (entre PreMatchSetup et le démarrage du chrono).
// Évite le démarrage automatique trop brutal et donne une dernière
// chance d'ajuster la compo / les numéros.
// ──────────────────────────────────────────────────────────
function PreMatchJerseyCheck({ M, onConfirm, onBack, onEditJerseys, canEdit }) {
  // Re-render quand les numéros changent (event dispatché par CDD_JERSEY.setNum).
  // Sans ce listener, les modifs faites dans la modale ne s'affichaient pas
  // au retour sur cet écran — le coach pensait que ses changements étaient perdus.
  const [, _forceTick] = useStateMV({});
  useEffectMV(() => {
    const h = () => _forceTick({});
    window.addEventListener('cdd-jersey-changed', h);
    window.addEventListener('cdd-data-rebuilt', h);
    return () => {
      window.removeEventListener('cdd-jersey-changed', h);
      window.removeEventListener('cdd-data-rebuilt', h);
    };
  }, []);

  // Source unique : CDD_CONVO (à jour avec les choix coach + numéros match).
  // M.tA.p est un cache snapshot posé à la création du match — pas fiable
  // pour refléter les édits ultérieurs.
  const conv = window.CDD_CONVO || { starters: [], bench: [] };
  const allPlayers = window.CDD_PLAYERS || [];
  const findPlayer = (pid) => allPlayers.find(p => p.id === pid) || null;
  // Numéro à afficher : priorité au num match-specific (CDD_JERSEY).
  const displayNum = (p) => {
    if (!p) return '?';
    if (window.CDD_JERSEY?.ofPlayer) return window.CDD_JERSEY.ofPlayer(p);
    return p.num || '?';
  };

  // Convertit les ids de CDD_CONVO en objets player enrichis avec num à jour.
  const starters = conv.starters
    .map(pid => findPlayer(pid))
    .filter(Boolean)
    .map(p => ({ pid: p.id, num: displayNum(p), name: `${p.first} ${(p.last || '').toUpperCase()}`.trim() }));
  const bench = conv.bench
    .map(pid => findPlayer(pid))
    .filter(Boolean)
    .map(p => ({ pid: p.id, num: displayNum(p), name: `${p.first} ${(p.last || '').toUpperCase()}`.trim() }));

  // Détection des doublons : un même numéro porté par 2 joueurs convoqués
  // = ERREUR à signaler avant le coup d'envoi (arbitre = carton possible).
  const allNums = [...starters, ...bench].map(p => p.num).filter(n => n !== '?' && n !== null);
  const numCounts = allNums.reduce((acc, n) => { acc[n] = (acc[n] || 0) + 1; return acc; }, {});
  const isDup = (num) => numCounts[num] > 1;
  const hasDups = Object.values(numCounts).some(c => c > 1);

  const row = (p, i, isStarter) => {
    const dup = isDup(p.num);
    const baseColor = isStarter ? '#c8f169' : '#7dd3fc';
    const baseBg    = isStarter ? 'rgba(200,241,105,0.18)' : 'rgba(125,211,252,0.18)';
    const baseBorder = isStarter ? 'rgba(200,241,105,0.45)' : 'rgba(125,211,252,0.45)';
    return (
      <div key={i} style={{
        display:'flex', alignItems:'center', gap:10, padding:'8px 10px',
        background: dup ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${dup ? 'rgba(239,68,68,0.45)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius:8, marginBottom:4,
      }}>
        <span style={{
          minWidth:36, height:36, borderRadius:'50%',
          background: dup ? 'rgba(239,68,68,0.2)' : baseBg,
          border: `1px solid ${dup ? 'rgba(239,68,68,0.55)' : baseBorder}`,
          color: dup ? '#fca5a5' : baseColor,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontWeight:900, fontSize:14,
        }}>{p.num}</span>
        <span style={{flex:1, fontSize:13, fontWeight:600}}>{p.name}</span>
        {dup && (
          <span style={{
            fontSize:10, fontWeight:800, letterSpacing:'.04em',
            color:'#fca5a5', padding:'2px 6px',
            background:'rgba(239,68,68,0.18)', borderRadius:4,
            textTransform:'uppercase',
          }}>⚠ doublon</span>
        )}
        <span style={{
          fontSize:10, fontWeight:800, letterSpacing:'.06em',
          opacity:0.6, textTransform:'uppercase',
        }}>{isStarter ? 'Titulaire' : 'Banc'}</span>
      </div>
    );
  };

  return (
    <div className="mv-prematch" style={{padding:'14px'}}>
      <div className="mv-prematch-glow"/>
      <div className="mv-prematch-k">PRÉ-MATCH · VÉRIFICATION</div>
      <div className="mv-prematch-t" style={{marginBottom:12}}>Numéros de maillot</div>
      <div style={{
        fontSize:12.5, color:'rgba(255,255,255,0.75)', textAlign:'center',
        marginBottom:14, padding:'0 8px',
      }}>
        Dernière vérification avant le coup d'envoi. Tu peux ajuster les numéros
        de maillot si nécessaire (ex : maillot perdu, échange dernière minute).
      </div>

      {hasDups && (
        <div style={{
          width:'min(420px, 92%)', marginBottom:10,
          padding:'10px 14px', borderRadius:10,
          background:'rgba(239,68,68,0.10)',
          border:'1px solid rgba(239,68,68,0.45)',
          color:'#fca5a5', fontSize:12.5, fontWeight:700,
          display:'flex', alignItems:'center', gap:8,
        }}>
          <span style={{fontSize:18}}>⚠️</span>
          <span>Au moins 2 joueurs portent le même numéro — corrige les doublons avant le coup d'envoi (l'arbitre peut sanctionner).</span>
        </div>
      )}

      <div style={{
        width:'min(420px, 92%)', background:'rgba(0,0,0,.35)',
        borderRadius:12, padding:'12px 14px', marginBottom:12,
        border:'1px solid rgba(255,255,255,.08)',
      }}>
        <div style={{
          fontSize:11, fontWeight:800, letterSpacing:'.08em',
          color:'#c8f169', marginBottom:8, textTransform:'uppercase',
        }}>⚽ Titulaires · {starters.length}</div>
        {starters.length === 0 ? (
          <div style={{padding:'10px', fontSize:12, opacity:0.6, textAlign:'center'}}>
            Aucun titulaire défini.
          </div>
        ) : starters.map((p, i) => row(p, i, true))}

        {bench.length > 0 && (
          <>
            <div style={{
              fontSize:11, fontWeight:800, letterSpacing:'.08em',
              color:'#7dd3fc', marginTop:14, marginBottom:8, textTransform:'uppercase',
            }}>🪑 Remplaçants · {bench.length}</div>
            {bench.map((p, i) => row(p, i, false))}
          </>
        )}
      </div>

      {canEdit && (
        <button type="button" onClick={onEditJerseys} style={{
          width:'min(420px, 92%)', padding:'10px 14px', marginBottom:10,
          borderRadius:10, cursor:'pointer', fontFamily:'inherit',
          background:'rgba(255,255,255,0.06)',
          border:'1px solid rgba(255,255,255,0.15)',
          color:'#fff', fontSize:13, fontWeight:700,
        }}>
          🔢 Modifier les numéros
        </button>
      )}

      <div style={{display:'flex', gap:8, width:'min(420px, 92%)'}}>
        <button type="button" onClick={onBack} style={{
          flex:1, padding:'12px', borderRadius:10, cursor:'pointer',
          background:'rgba(255,255,255,0.06)',
          border:'1px solid rgba(255,255,255,0.15)',
          color:'#fff', fontSize:13, fontWeight:700, fontFamily:'inherit',
        }}>← Retour réglages</button>
        {canEdit && (
          <button type="button" onClick={onConfirm} className="mv-prematch-btn"
                  style={{flex:2}}>
            <span>▶ COUP D'ENVOI</span>
          </button>
        )}
      </div>
    </div>
  );
}

// LineupOverlay (#17)
function LineupOverlay({ M, onClose }) {
  const team = M.tA;
  const injured = new Set();
  const excluded = new Set();
  (M.ev || []).forEach(e => {
    if (e.t !== 'A') return;
    if (e.tp === 'injury' && e.pl) injured.add(e.pl);
    if (e.tp === 'red' && e.pl) excluded.add(e.pl);
  });
  const subs = (M.ev || []).filter(e => e.tp === 'sub' && e.t === 'A');
  const lbl = (p) => '#' + p.num + (p.first ? ' ' + p.first : '');
  const onField = new Set((team.p || []).map(lbl));
  const onBench = new Set((team.bench || []).map(lbl));
  subs.forEach(s => {
    if (s.out && onField.has(s.out)) { onField.delete(s.out); onBench.add(s.out); }
    if (s.inn && onBench.has(s.inn)) { onBench.delete(s.inn); onField.add(s.inn); }
  });
  const allPlayers = [...(team.p || []), ...(team.bench || [])];
  const playerByLbl = {};
  allPlayers.forEach(p => { playerByLbl[lbl(p)] = p; });
  const fieldPlayers = [...onField].map(l => playerByLbl[l]).filter(Boolean);
  const benchPlayers = [...onBench].map(l => playerByLbl[l]).filter(Boolean);
  const injuredPlayers = [...injured].map(l => playerByLbl[l]).filter(Boolean);
  const excludedPlayers = [...excluded].map(l => playerByLbl[l]).filter(Boolean);
  const primary = team.c || '#22c55e';
  const slots = (window.CDD_FORMATIONS && window.CDD_FORMATIONS['4-3-3']) || [];
  return (
    <div className="mv-modal-overlay" onClick={onClose} style={{zIndex:9999}}>
      <div className="mv-modal" onClick={e => e.stopPropagation()}
           style={{maxWidth:'92%', width:'500px', maxHeight:'92vh', overflow:'auto'}}>
        <div className="mv-modal-h">
          <div>
            <div className="mv-modal-k">COMPOSITION EN COURS</div>
            <h2 className="mv-modal-t">{team.n}</h2>
            <div className="mv-modal-s">
              {fieldPlayers.length} sur le terrain · {benchPlayers.length} au banc
              {injuredPlayers.length > 0 && ` · ${injuredPlayers.length} blessé(s)`}
              {excludedPlayers.length > 0 && ` · ${excludedPlayers.length} exclu(s)`}
            </div>
          </div>
          <button className="mv-modal-x" onClick={onClose}>✕</button>
        </div>
        <div style={{padding:'12px', background:'rgba(0,0,0,.2)', borderRadius:10, margin:'12px'}}>
          <svg viewBox="0 0 100 110" width="100%" style={{maxHeight:'320px', display:'block'}}>
            <defs>
              <linearGradient id="lo-grass" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1f7a3a"/>
                <stop offset="100%" stopColor="#1c6e35"/>
              </linearGradient>
            </defs>
            <rect width="100" height="110" fill="url(#lo-grass)"/>
            <g stroke="rgba(255,255,255,.55)" strokeWidth=".3" fill="none">
              <rect x="2" y="2" width="96" height="106"/>
              <line x1="2" y1="55" x2="98" y2="55"/>
              <circle cx="50" cy="55" r="9"/>
              <rect x="22" y="2"  width="56" height="13"/>
              <rect x="22" y="95" width="56" height="13"/>
            </g>
            {fieldPlayers.slice(0, 11).map((p, i) => {
              const slot = slots[i] || { x:50, y:55 };
              const x = slot.x;
              const y = 6 + (slot.y / 92) * 94;
              return (
                <g key={i} transform={`translate(${x}, ${y})`}>
                  <circle r="6" fill={primary} stroke="#fff" strokeWidth=".5"/>
                  <text textAnchor="middle" dominantBaseline="central" fontSize="5" fontWeight="900"
                        fill="#000" fontFamily="Inter, sans-serif" y=".5">{p.num}</text>
                  <g transform="translate(0, 10)">
                    <rect x="-12" y="-2" width="24" height="3.5" rx=".5" fill="rgba(0,0,0,.85)"/>
                    <text textAnchor="middle" dominantBaseline="central" fontSize="2.4" fontWeight="700"
                          fill="#fff" fontFamily="Inter, sans-serif">{(p.first || '').slice(0, 12)}</text>
                  </g>
                </g>
              );
            })}
          </svg>
        </div>
        <div style={{padding:'0 12px 16px'}}>
          {benchPlayers.length > 0 && (
            <div style={{marginBottom:14}}>
              <div style={{fontSize:11, fontWeight:700, letterSpacing:'.1em', color:'rgba(255,255,255,.55)', marginBottom:6, textTransform:'uppercase'}}>
                ⏱ AU BANC · {benchPlayers.length}
              </div>
              <div style={{display:'flex', flexWrap:'wrap', gap:6}}>
                {benchPlayers.map(p => (
                  <span key={p.id} style={{padding:'4px 10px', borderRadius:6, background:'rgba(255,255,255,.06)',
                                            fontSize:12, border:'1px solid rgba(255,255,255,.1)'}}>
                    <b style={{color:primary, marginRight:6}}>#{p.num}</b>{p.first || p.last}
                  </span>
                ))}
              </div>
            </div>
          )}
          {injuredPlayers.length > 0 && (
            <div style={{marginBottom:14}}>
              <div style={{fontSize:11, fontWeight:700, letterSpacing:'.1em', color:'#ff9a3d', marginBottom:6, textTransform:'uppercase'}}>
                🩹 BLESSÉS · {injuredPlayers.length}
              </div>
              <div style={{display:'flex', flexWrap:'wrap', gap:6}}>
                {injuredPlayers.map(p => (
                  <span key={p.id} style={{padding:'4px 10px', borderRadius:6, background:'rgba(255,160,40,.1)',
                                            fontSize:12, border:'1px solid rgba(255,160,40,.3)'}}>
                    <b style={{marginRight:6}}>#{p.num}</b>{p.first || p.last}
                  </span>
                ))}
              </div>
            </div>
          )}
          {excludedPlayers.length > 0 && (
            <div>
              <div style={{fontSize:11, fontWeight:700, letterSpacing:'.1em', color:'#ff5b5b', marginBottom:6, textTransform:'uppercase'}}>
                🟥 EXCLUS · {excludedPlayers.length}
              </div>
              <div style={{display:'flex', flexWrap:'wrap', gap:6}}>
                {excludedPlayers.map(p => (
                  <span key={p.id} style={{padding:'4px 10px', borderRadius:6, background:'rgba(255,80,80,.12)',
                                            fontSize:12, border:'1px solid rgba(255,80,80,.3)'}}>
                    <b style={{marginRight:6}}>#{p.num}</b>{p.first || p.last}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// FicheMatchOverlay (#19)
function FicheMatchOverlay({ M, onClose, onEditEvent, onShare }) {
  const exploits = (MATCH_HELPERS.computeExploits || (() => ({})))(M);
  const team = M.tA;
  const opp = M.tB;
  const playerStats = {};
  (team.p || []).concat(team.bench || []).forEach(p => {
    const lbl = MATCH_HELPERS.playerLabel(p);
    playerStats[p.id] = { id: p.id, num: p.num, first: p.first, last: p.last, label: lbl,
                          goals:0, assists:0, yellows:0, reds:0, subbed:false, injured:false };
  });
  (M.ev || []).forEach(e => {
    if (e.t !== 'A') return;
    Object.values(playerStats).forEach(p => {
      if (e.tp === 'goal' && e.pl === p.label) p.goals++;
      if (e.tp === 'goal' && e.passer === p.label) p.assists++;
      if (e.tp === 'yellow' && e.pl === p.label) p.yellows++;
      if (e.tp === 'red' && e.pl === p.label) p.reds++;
      if (e.tp === 'sub' && e.out === p.label) p.subbed = true;
      if (e.tp === 'injury' && e.pl === p.label) p.injured = true;
    });
  });
  const activeStats = Object.values(playerStats).filter(p =>
    p.goals || p.assists || p.yellows || p.reds || p.subbed || p.injured
  );
  const result = M.sA > M.sB ? 'VICTOIRE' : M.sA < M.sB ? 'DÉFAITE' : 'NUL';
  const resultColor = M.sA > M.sB ? '#c8f169' : M.sA < M.sB ? '#ff8a8a' : '#fbbf24';
  return (
    <div className="mv-modal-overlay" onClick={onClose} style={{zIndex:9998}}>
      <div className="mv-modal" onClick={e => e.stopPropagation()}
           style={{maxWidth:'94%', width:'520px', maxHeight:'94vh', overflow:'auto'}}>
        <div className="mv-modal-h">
          <div>
            <div className="mv-modal-k" style={{color: resultColor}}>{result}</div>
            <h2 className="mv-modal-t" style={{fontSize:18}}>FEUILLE DE MATCH</h2>
          </div>
          <button className="mv-modal-x" onClick={onClose}>✕</button>
        </div>
        <div style={{textAlign:'center', padding:'20px', background:'rgba(0,0,0,.25)'}}>
          <div style={{display:'flex', alignItems:'center', justifyContent:'center', gap:20}}>
            <div style={{flex:1, textAlign:'right'}}>
              <div style={{fontSize:13, color:'rgba(255,255,255,.7)', fontWeight:700}}>{team.n}</div>
            </div>
            <div style={{fontSize:42, fontWeight:900, color:'#fff', minWidth:80}}>{M.sA}&nbsp;–&nbsp;{M.sB}</div>
            <div style={{flex:1, textAlign:'left'}}>
              <div style={{fontSize:13, color:'rgba(255,255,255,.7)', fontWeight:700}}>{opp.n}</div>
            </div>
          </div>
          {M.at > 0 && <div style={{fontSize:11, color:'rgba(255,255,255,.5)', marginTop:6}}>+{M.at} min temps additionnel</div>}
        </div>
        {(exploits.hatTricks?.length > 0 || exploits.doubles?.length > 0 || exploits.cleanSheet || exploits.mvp) && (
          <div style={{padding:'14px 16px', borderBottom:'1px solid rgba(255,255,255,.06)'}}>
            <div style={{fontSize:11, fontWeight:800, letterSpacing:'.1em', color:'#c8f169', marginBottom:8}}>⭐ EXPLOITS</div>
            {exploits.mvp && <div style={{fontSize:13, marginBottom:4}}><b style={{color:'#fbbf24'}}>🏆 Homme du match</b> : {exploits.mvp}</div>}
            {(exploits.hatTricks || []).map(p => <div key={'ht-'+p} style={{fontSize:13, marginBottom:4}}>🎩 <b style={{color:'#c8f169'}}>Hat-trick</b> : {p}</div>)}
            {(exploits.doubles || []).map(p => <div key={'d-'+p} style={{fontSize:13, marginBottom:4}}>⚽⚽ <b>Doublé</b> : {p}</div>)}
            {exploits.cleanSheet && <div style={{fontSize:13, marginBottom:4}}>🧤 <b style={{color:'#06b6d4'}}>Sortie blanche</b> (0 but encaissé)</div>}
          </div>
        )}
        {activeStats.length > 0 && (
          <div style={{padding:'14px 16px', borderBottom:'1px solid rgba(255,255,255,.06)'}}>
            <div style={{fontSize:11, fontWeight:800, letterSpacing:'.1em', color:'rgba(255,255,255,.6)', marginBottom:10}}>JOUEURS — STATS DU MATCH</div>
            {activeStats.map(p => (
              <div key={p.id} style={{display:'flex', alignItems:'center', padding:'6px 0',
                                       borderBottom:'1px solid rgba(255,255,255,.04)', fontSize:13}}>
                <span style={{minWidth:24, fontWeight:800, color:'#c8f169'}}>#{p.num}</span>
                <span style={{flex:1, fontWeight:600}}>{p.first} <span style={{opacity:.7, fontSize:11}}>{p.last}</span></span>
                <span style={{display:'flex', gap:8, fontSize:11}}>
                  {p.goals > 0 && <span>⚽×{p.goals}</span>}
                  {p.assists > 0 && <span>👟×{p.assists}</span>}
                  {p.yellows > 0 && <span style={{color:'#fbbf24'}}>🟨×{p.yellows}</span>}
                  {p.reds > 0 && <span style={{color:'#ff5b5b'}}>🟥×{p.reds}</span>}
                  {p.subbed && <span style={{color:'rgba(255,255,255,.5)'}}>↓</span>}
                  {p.injured && <span style={{color:'#ff9a3d'}}>🩹</span>}
                </span>
              </div>
            ))}
          </div>
        )}
        <div style={{padding:'14px 16px'}}>
          <div style={{fontSize:11, fontWeight:800, letterSpacing:'.1em', color:'rgba(255,255,255,.6)', marginBottom:10}}>CHRONOLOGIE</div>
          {(M.ev || []).filter(e => ['goal','yellow','red','sub','injury','half','end'].includes(e.tp)).map((e, i) => {
            const realIdx = M.ev.indexOf(e);
            return (
              <div key={i} style={{display:'flex', alignItems:'center', padding:'6px 0',
                                    borderBottom:'1px solid rgba(255,255,255,.04)', fontSize:12}}>
                <span style={{minWidth:36, color:'#c8f169', fontWeight:800}}>{e.mn}'</span>
                <span style={{flex:1}}>
                  {e.tp === 'goal' ? '⚽ ' : e.tp === 'yellow' ? '🟨 ' : e.tp === 'red' ? '🟥 ' :
                   e.tp === 'sub' ? '🔁 ' : e.tp === 'injury' ? '🩹 ' :
                   e.tp === 'half' ? '⏸ ' : e.tp === 'end' ? '🏁 ' : ''}
                  {e.pl || (e.tp === 'half' ? 'Mi-temps' : e.tp === 'end' ? 'Fin de match' : '')}
                  {e.tp === 'sub' && (e.inn ? ' (entrant: ' + e.inn + ')' : '')}
                  {e.tp === 'goal' && e.passer ? ' (P. ' + e.passer + ')' : ''}
                  {e._edited && <span style={{fontSize:9, color:'rgba(200,241,105,.6)', marginLeft:6}}>✎</span>}
                </span>
                {onEditEvent && realIdx >= 0 && (e.tp === 'goal' || e.tp === 'yellow' || e.tp === 'red') && (
                  <button onClick={() => onEditEvent(realIdx)}
                          style={{background:'transparent', border:'none', color:'rgba(255,255,255,.4)',
                                  fontSize:13, cursor:'pointer', padding:'2px 8px'}}>✎</button>
                )}
              </div>
            );
          })}
        </div>
        <div style={{padding:'14px 16px 16px', display:'flex', gap:10, position:'sticky', bottom:0, background:'#0a0e14'}}>
          <button onClick={onShare}
                  style={{flex:1, padding:'12px', borderRadius:10, border:'1px solid rgba(200,241,105,.4)',
                          background:'rgba(200,241,105,.12)', color:'#c8f169', fontWeight:800,
                          fontSize:13, cursor:'pointer'}}>📤 Partager</button>
          <button onClick={onClose}
                  style={{flex:1, padding:'12px', borderRadius:10, border:'1px solid rgba(255,255,255,.15)',
                          background:'rgba(255,255,255,.06)', color:'#fff', fontWeight:700,
                          fontSize:13, cursor:'pointer'}}>Fermer</button>
        </div>
      </div>
    </div>
  );
}

// EditEventOverlay (#19)
function EditEventOverlay({ M, idx, ev, onSave, onClose }) {
  const [tp, setTp] = useStateMV(ev.tp);
  const [pl, setPl] = useStateMV(ev.pl || '');
  const [passer, setPasser] = useStateMV(ev.passer || '');
  const [mn, setMn] = useStateMV(ev.mn || 0);
  const save = () => {
    const p = { tp, pl, mn: parseInt(mn, 10) || 0 };
    if (tp === 'goal') p.passer = passer || null;
    if (MATCH_HELPERS.editEvent) MATCH_HELPERS.editEvent(M, idx, p);
    onSave();
  };
  const delEvent = () => {
    if (!confirm('Supprimer cet evenement ?')) return;
    M.ev.splice(idx, 1);
    if (ev.tp === 'goal' && ev.t) {
      if (ev.t === 'A') M.sA = Math.max(0, (M.sA || 0) - 1);
      if (ev.t === 'B') M.sB = Math.max(0, (M.sB || 0) - 1);
    }
    onSave();
  };
  return (
    <div className="mv-modal-overlay" onClick={onClose} style={{zIndex:9999}}>
      <div className="mv-modal" onClick={e => e.stopPropagation()} style={{maxWidth:'92%', width:'400px'}}>
        <div className="mv-modal-h">
          <h2 className="mv-modal-t">Editer l'evenement</h2>
          <button className="mv-modal-x" onClick={onClose}>✕</button>
        </div>
        <div style={{padding:'14px 16px'}}>
          <label style={{display:'block', marginBottom:12}}>
            <span style={{display:'block', fontSize:11, fontWeight:700, color:'rgba(255,255,255,.6)', marginBottom:4}}>TYPE</span>
            <select value={tp} onChange={e => setTp(e.target.value)}
                    style={{width:'100%', height:38, background:'rgba(0,0,0,.4)', border:'1px solid rgba(255,255,255,.12)',
                            borderRadius:8, color:'#fff', padding:'0 10px', fontSize:13}}>
              <option value="goal">But</option><option value="yellow">Carton jaune</option>
              <option value="red">Carton rouge</option><option value="sub">Changement</option>
              <option value="injury">Blessure</option>
            </select>
          </label>
          <label style={{display:'block', marginBottom:12}}>
            <span style={{display:'block', fontSize:11, fontWeight:700, color:'rgba(255,255,255,.6)', marginBottom:4}}>JOUEUR</span>
            <input value={pl} onChange={e => setPl(e.target.value)}
                   style={{width:'100%', height:38, background:'rgba(0,0,0,.4)', border:'1px solid rgba(255,255,255,.12)',
                           borderRadius:8, color:'#fff', padding:'0 10px', fontSize:13}}/>
          </label>
          {tp === 'goal' && (
            <label style={{display:'block', marginBottom:12}}>
              <span style={{display:'block', fontSize:11, fontWeight:700, color:'rgba(255,255,255,.6)', marginBottom:4}}>PASSEUR</span>
              <input value={passer} onChange={e => setPasser(e.target.value)}
                     style={{width:'100%', height:38, background:'rgba(0,0,0,.4)', border:'1px solid rgba(255,255,255,.12)',
                             borderRadius:8, color:'#fff', padding:'0 10px', fontSize:13}}/>
            </label>
          )}
          <label style={{display:'block', marginBottom:12}}>
            <span style={{display:'block', fontSize:11, fontWeight:700, color:'rgba(255,255,255,.6)', marginBottom:4}}>MINUTE</span>
            <input type="number" value={mn} onChange={e => setMn(e.target.value)}
                   style={{width:'100%', height:38, background:'rgba(0,0,0,.4)', border:'1px solid rgba(255,255,255,.12)',
                           borderRadius:8, color:'#fff', padding:'0 10px', fontSize:13}}/>
          </label>
        </div>
        <div style={{padding:'10px 16px 16px', display:'flex', gap:8}}>
          <button onClick={delEvent}
                  style={{padding:'10px 14px', borderRadius:8, border:'1px solid rgba(255,80,80,.3)',
                          background:'rgba(255,80,80,.12)', color:'#ff8a8a', fontWeight:700, cursor:'pointer'}}>🗑 Supprimer</button>
          <button onClick={onClose}
                  style={{flex:1, padding:'10px', borderRadius:8, border:'1px solid rgba(255,255,255,.15)',
                          background:'transparent', color:'#fff', fontWeight:700, cursor:'pointer'}}>Annuler</button>
          <button onClick={save}
                  style={{flex:1, padding:'10px', borderRadius:8, border:'none',
                          background:'var(--acc, #c8f169)', color:'#000', fontWeight:800, cursor:'pointer'}}>💾 Enregistrer</button>
        </div>
      </div>
    </div>
  );
}

window.ScreenMatch = ScreenMatchV2;

// ──────────────────────────────────────────────────────────
// Match summary share modal — résumé visuel post-match, exportable
// au format story Insta/WhatsApp (1080×1920). Cible viralité parents.
// ──────────────────────────────────────────────────────────
function MatchSummaryShareModal({ M, onClose }) {
  const cardRef = useRefMV(null);
  const [busy, setBusy] = useStateMV(false);
  const [msg, setMsg] = useStateMV('');

  const club = window.CDD_CLUB || {};
  const primary = (club.colors && club.colors[0]) || '#c8f169';
  const secondary = (club.colors && club.colors[1]) || '#0B1320';
  const lineup = [...(M.tA?.p || []), ...(M.tA?.bench || [])];

  // Buteurs équipe A : agrège par scorer label, garde l'ordre chronologique
  const scorers = [];
  (M.ev || []).forEach(e => {
    if (e.t === 'A' && e.tp === 'goal') {
      const label = e.scorer || e.pl || '?';
      const existing = scorers.find(s => s.label === label);
      if (existing) {
        existing.count++;
        existing.minutes.push({ mn: e.mn, ch: e.ch });
      } else {
        const pid = window.CDD_COACH?._resolvePlayerIdFromLabel?.(label, lineup);
        const player = pid ? (window.CDD_PLAYERS || []).find(p => p.id === pid) : null;
        scorers.push({ label, count: 1, minutes: [{ mn: e.mn, ch: e.ch }], player, isPenalty: !!e.penalty });
      }
    }
  });

  // MVP : joueur avec le plus de buts (tie-break : passes décisives via computeExploits si dispo)
  const exploits = window.MATCH_HELPERS?.computeExploits?.(M) || { goals: {}, assists: {}, mvp: null };
  let mvpPlayer = null;
  if (exploits.mvp) {
    const pid = window.CDD_COACH?._resolvePlayerIdFromLabel?.(exploits.mvp, lineup);
    mvpPlayer = pid ? (window.CDD_PLAYERS || []).find(p => p.id === pid) : null;
  }
  if (!mvpPlayer && scorers.length > 0) {
    mvpPlayer = scorers[0].player;
  }

  // Cartons équipe A
  const yellowsA = (M.ev || []).filter(e => e.t === 'A' && e.tp === 'yellow').length;
  const redsA = (M.ev || []).filter(e => e.t === 'A' && e.tp === 'red').length;

  // Résultat
  const sA = M.sA || 0, sB = M.sB || 0;
  const result = sA > sB ? 'V' : sA < sB ? 'D' : 'N';
  const resultLabel = result === 'V' ? 'VICTOIRE' : result === 'D' ? 'DÉFAITE' : 'NUL';
  const resultColor = result === 'V' ? '#c8f169' : result === 'D' ? '#ff6b6b' : '#fbbf24';

  const dateStr = M.endedAt ? new Date(M.endedAt).toLocaleDateString('fr-FR', { day:'numeric', month:'long' }) : '';

  const loadH2C = () => {
    if (window.html2canvas) return Promise.resolve(window.html2canvas);
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      s.onload = () => resolve(window.html2canvas);
      s.onerror = () => reject(new Error('html2canvas KO'));
      document.head.appendChild(s);
    });
  };

  const exportImage = async (share = false) => {
    if (!cardRef.current) return;
    setBusy(true);
    setMsg(share ? 'Préparation du partage…' : 'Génération PNG…');
    try {
      const h2c = await loadH2C();
      const canvas = await h2c(cardRef.current, { backgroundColor: null, scale: 2, useCORS: true, allowTaint: true });
      const fileName = `match-${(club.short || 'team')}-${(M.tB?.n || 'adv').replace(/\W+/g,'_')}.png`;
      if (share && navigator.share && navigator.canShare) {
        const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
        const file = new File([blob], fileName, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `${M.tA?.n} ${sA}-${sB} ${M.tB?.n}`,
            text: `${resultLabel} · ${M.tA?.n} ${sA}-${sB} ${M.tB?.n}`,
          });
          setMsg('✓ Partagé');
          setTimeout(() => setMsg(''), 1500);
          return;
        }
      }
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = fileName;
      a.click();
      setMsg('✓ Image téléchargée');
      setTimeout(() => setMsg(''), 2000);
    } catch (e) {
      setMsg('❌ ' + e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:500,
      display:'flex', flexDirection:'column', alignItems:'center', overflow:'auto',
      padding:'20px 16px',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width:'100%', maxWidth:380, display:'flex', flexDirection:'column', gap:14, alignItems:'center',
      }}>
        {/* Header avec close */}
        <div style={{width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', color:'#fff'}}>
          <span style={{fontSize:13, fontWeight:800, letterSpacing:'.08em', textTransform:'uppercase', opacity:0.85}}>
            Résumé du match
          </span>
          <button onClick={onClose} style={{
            background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)',
            color:'#fff', width:32, height:32, borderRadius:16, fontSize:16, cursor:'pointer',
          }}>✕</button>
        </div>

        {/* La carte exportable (format story 9:16) */}
        <div ref={cardRef} style={{
          width:'100%', aspectRatio:'9/16',
          background:`linear-gradient(160deg, ${secondary} 0%, ${primary}30 100%), #0B1320`,
          borderRadius:20, overflow:'hidden', position:'relative',
          boxShadow:'0 20px 60px rgba(0,0,0,0.5)', color:'#fff',
          fontFamily:'system-ui, -apple-system, sans-serif',
          display:'flex', flexDirection:'column',
        }}>
          {/* Bande supérieure : club + date */}
          <div style={{
            padding:'18px 20px', display:'flex', justifyContent:'space-between', alignItems:'center',
            borderBottom:'1px solid rgba(255,255,255,0.08)',
          }}>
            <div style={{display:'flex', alignItems:'center', gap:8}}>
              <div style={{
                width:32, height:32, borderRadius:8, background:primary, color:secondary,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontWeight:900, fontSize:14,
              }}>{(club.short || club.name || 'M')[0]}</div>
              <div>
                <div style={{fontSize:11, fontWeight:800, letterSpacing:'.06em'}}>{(club.name || 'MON CLUB').toUpperCase()}</div>
                <div style={{fontSize:9, opacity:0.6}}>{club.team || ''}</div>
              </div>
            </div>
            <div style={{fontSize:9, opacity:0.7, fontWeight:600}}>{dateStr}</div>
          </div>

          {/* Résultat — gros badge */}
          <div style={{padding:'20px 16px 10px', textAlign:'center'}}>
            <div style={{
              display:'inline-block', padding:'4px 14px', borderRadius:6,
              background:resultColor+'25', border:`1px solid ${resultColor}60`,
              color:resultColor, fontSize:11, fontWeight:900, letterSpacing:'.15em',
            }}>{resultLabel}</div>
          </div>

          {/* Score géant */}
          <div style={{padding:'10px 16px 14px', textAlign:'center'}}>
            <div style={{fontSize:14, fontWeight:700, opacity:0.85, marginBottom:8}}>
              {M.tA?.n || 'Mon équipe'} <span style={{opacity:0.5}}>vs</span> {M.tB?.n || 'Adversaire'}
            </div>
            <div style={{
              fontSize:96, fontWeight:900, lineHeight:1, letterSpacing:'-.04em',
              fontVariantNumeric:'tabular-nums', color:'#fff',
            }}>
              {sA}<span style={{opacity:0.4, margin:'0 12px', fontSize:64}}>–</span>{sB}
            </div>
          </div>

          {/* Buteurs */}
          {scorers.length > 0 && (
            <div style={{padding:'14px 20px', borderTop:'1px solid rgba(255,255,255,0.08)'}}>
              <div style={{
                fontSize:9, fontWeight:800, letterSpacing:'.12em', opacity:0.55, marginBottom:8,
                textTransform:'uppercase',
              }}>⚽ Buteurs</div>
              <div style={{display:'flex', flexDirection:'column', gap:5}}>
                {scorers.map((s, i) => (
                  <div key={i} style={{display:'flex', alignItems:'center', gap:8, fontSize:13}}>
                    <span style={{fontSize:14}}>⚽</span>
                    <span style={{fontWeight:700, flex:1}}>
                      {s.player ? `${s.player.first} ${s.player.last || ''}`.trim() : s.label}
                      {s.count > 1 && <span style={{color:primary, marginLeft:6}}>×{s.count}</span>}
                    </span>
                    <span style={{opacity:0.55, fontSize:11}}>
                      {s.minutes.map(min =>
                        MATCH_HELPERS.fmtMatchMinute ? MATCH_HELPERS.fmtMatchMinute(min.mn, min.ch, M.cfg) : `${min.mn}'`
                      ).join(' · ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MVP / Homme du match */}
          {mvpPlayer && (
            <div style={{
              margin:'8px 20px', padding:'14px',
              background:`linear-gradient(135deg, ${primary}20, transparent)`,
              border:`1px solid ${primary}40`, borderRadius:14,
              display:'flex', alignItems:'center', gap:12,
            }}>
              {mvpPlayer.photo ? (
                <img src={mvpPlayer.photo} alt="" style={{
                  width:54, height:54, borderRadius:27, objectFit:'cover',
                  border:`2px solid ${primary}`, flexShrink:0,
                }}/>
              ) : (
                <div style={{
                  width:54, height:54, borderRadius:27, background:primary, color:secondary,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontWeight:900, fontSize:22, flexShrink:0,
                }}>{mvpPlayer.num}</div>
              )}
              <div style={{minWidth:0, flex:1}}>
                <div style={{fontSize:9, fontWeight:800, color:primary, letterSpacing:'.12em', textTransform:'uppercase'}}>
                  🌟 Homme du match
                </div>
                <div style={{fontSize:15, fontWeight:900, marginTop:2, color:'#fff'}}>
                  {mvpPlayer.first} {mvpPlayer.last || ''}
                </div>
                {mvpPlayer.stats?.ovr && (
                  <div style={{fontSize:10, opacity:0.6, marginTop:1}}>
                    OVR {mvpPlayer.stats.ovr} · {mvpPlayer.pos || ''}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Spacer */}
          <div style={{flex:1}}/>

          {/* Stats sec — cartons / minutes */}
          <div style={{
            padding:'12px 20px', borderTop:'1px solid rgba(255,255,255,0.08)',
            display:'flex', justifyContent:'space-around', fontSize:11,
          }}>
            <div style={{textAlign:'center'}}>
              <div style={{fontWeight:900, fontSize:16, color:'#fbbf24'}}>🟨 {yellowsA}</div>
              <div style={{opacity:0.6, fontSize:9, marginTop:2}}>JAUNES</div>
            </div>
            <div style={{textAlign:'center'}}>
              <div style={{fontWeight:900, fontSize:16, color:'#ff6b6b'}}>🟥 {redsA}</div>
              <div style={{opacity:0.6, fontSize:9, marginTop:2}}>ROUGES</div>
            </div>
            <div style={{textAlign:'center'}}>
              <div style={{fontWeight:900, fontSize:16}}>⏱ {(M.cfg?.hs || 2) * (M.cfg?.hd || 45)}'</div>
              <div style={{opacity:0.6, fontSize:9, marginTop:2}}>DURÉE</div>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            padding:'10px 20px', background:'rgba(0,0,0,0.35)',
            display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:9, opacity:0.6,
          }}>
            <span>⚽ Coach du Dimanche</span>
            <span style={{fontWeight:700, color:primary}}>{club.season || 'Saison 2025-26'}</span>
          </div>
        </div>

        {/* Actions */}
        <div style={{width:'100%', display:'flex', gap:8}}>
          <button onClick={() => exportImage(false)} disabled={busy} style={{
            flex:1, padding:'14px', borderRadius:12, background:'rgba(255,255,255,0.08)',
            border:'1px solid rgba(255,255,255,0.18)', color:'#fff', cursor:'pointer',
            fontWeight:700, fontSize:13,
          }}>💾 Télécharger</button>
          <button onClick={() => exportImage(true)} disabled={busy} style={{
            flex:1, padding:'14px', borderRadius:12, color:'#fff', border:'none', cursor:'pointer',
            background:'linear-gradient(135deg, #25D366, #128C7E)',
            fontWeight:800, fontSize:13,
            boxShadow:'0 4px 14px rgba(37,211,102,.35)',
          }}>📲 Partager</button>
        </div>
        {msg && <div style={{color:'#c8f169', fontSize:12, fontWeight:700}}>{msg}</div>}
      </div>
    </div>
  );
}
window.MatchSummaryShareModal = MatchSummaryShareModal;

// Attach helpers en MUTANT l'objet (évite la race condition avec match-engine.js).
// Si window.MATCH_HELPERS n'existe pas encore (chargement parallèle), on crée la base
// puis match-engine.js complètera par mutation aussi.
if (!window.MATCH_HELPERS) window.MATCH_HELPERS = {};
window.MATCH_HELPERS.isPlayerOut = isPlayerOut;
window.MATCH_HELPERS.getYellowsForPlayer = getYellowsForPlayer;
