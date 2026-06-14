/* global React, CDD_STANDINGS, CDD_TOP_SCORERS, CDD_LAST_MATCHES, CDD_CLUB, CDD_CONVO, CDD_PLAYERS, CDD_NEXT_MATCH, FutCard, POSITION_LABEL */

/* ============================================================
   SCREEN — Résultats / Championship
   ============================================================ */

function ScreenResults({ go, tweaks }) {
  const [tab, setTab] = useState("classement");
  const [, forceUpdate] = useState({});
  // Modale création/édition d'un match amical (depuis l'onglet Amicaux)
  const [friendlyModal, setFriendlyModal] = useState(null); // null | { mode: 'create'|'edit', match? }

  // Re-render when FFF data lands or friendly matches change
  useEffect(() => {
    const handler = () => forceUpdate({});
    window.addEventListener('cdd-fff-loaded', handler);
    window.addEventListener('cdd-fff-loading', handler);
    window.addEventListener('cdd-fff-error', handler);
    window.addEventListener('cdd-friendly-changed', handler);
    return () => {
      window.removeEventListener('cdd-fff-loaded', handler);
      window.removeEventListener('cdd-fff-loading', handler);
      window.removeEventListener('cdd-fff-error', handler);
      window.removeEventListener('cdd-friendly-changed', handler);
    };
  }, []);

  // Helpers pour l'onglet Amicaux
  const _activeTeamRes = window.CDD?.getActiveTeam?.() || {};
  const _teamIdRes = _activeTeamRes.id;
  const _clubIdRes = _activeTeamRes.clubId || null;
  const _canEditRes = !window.CDD_ROLES || !window.CDD_ROLES.canDo
    || window.CDD_ROLES.canDo('compo');
  const friendlyList = _teamIdRes && window.CDD_FRIENDLY?.list
    ? window.CDD_FRIENDLY.list(_teamIdRes)
    : [];

  const isLoading = window.CDD_FFF_LOADING;
  const fffCfg = CDD_CLUB?.fff;
  const fffSource = window.CDD_FFF_SOURCE; // 'live' | 'cache-fresh' | 'cache-stale' | 'none'
  const fffAge = window.CDD_FFF_AGE || 0;
  const ageLabel = window.CDD_FFF?.formatAge?.(fffAge) || '';

  const forceRefresh = () => {
    window.CDD_FFF_FORCE_REFRESH = true;
    window.CDD_FFF_LOADED = false;
    window.CDD_REBUILD?.();
  };

  return (
    <div className="scr scr-results fade-in" data-screen-label="06 Resultats">

      <div className="rs-hero">
        <div className="rs-hero-bg"/>
        <div className="rs-hero-grad"/>
        <div className="rs-hero-in">
          <div className="rs-hero-k">
            {fffCfg ? `FFF · ${fffCfg.label}` : 'CHAMPIONNAT'}
            {fffCfg && (
              <button
                className={`rs-refresh-mini ${isLoading ? 'spin' : ''}`}
                onClick={forceRefresh}
                disabled={isLoading}
                title={isLoading ? "Sync en cours…" : `Rafraîchir FFF${ageLabel ? ' · ' + ageLabel : ''}`}>
                ↻
              </button>
            )}
          </div>
          <div className="rs-hero-title">CHAMPIONNAT<br/>2025–2026</div>
          <div className="rs-hero-sub" style={{display:'flex', alignItems:'center', gap:8, flexWrap:'wrap'}}>
            {window.ClubBadge && (
              <window.ClubBadge clubId={window.CDD?.getActiveClub?.()?.id}
                                clubName={CDD_CLUB.short || CDD_CLUB.name}
                                colors={CDD_CLUB.colors} size={24} shape="square"/>
            )}
            <span>{CDD_CLUB.name} {CDD_CLUB.rank ? <>· {CDD_CLUB.rank}<sup>e</sup> · {CDD_CLUB.pts} pts</> : <></>}</span>
            {fffSource && (
              <span className={`rs-source-tag rs-source-${fffSource}`}>
                {fffSource === 'live' && <>● live</>}
                {fffSource === 'cache-fresh' && <>✓ {ageLabel}</>}
                {fffSource === 'cache-stale' && <>⚠ ancien ({ageLabel})</>}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="rs-tabs">
        {[
          {id:"classement", l:"Classement"},
          {id:"calendrier", l:"Calendrier"},
          {id:"buteurs",    l:"Buteurs"},
          {id:"amicaux",    l:"🤝 Amicaux"},
        ].map(t => (
          <button key={t.id} className={`rs-tab ${tab===t.id?"on":""}`} onClick={()=>setTab(t.id)}>{t.l}</button>
        ))}
      </div>

      {tab === "classement" && (
        <>
          <div className="rs-standings">
            <div className="rs-thead">
              <span className="rs-th-r">#</span>
              <span className="rs-th-c">CLUB</span>
              <span className="rs-th-n">J</span>
              <span className="rs-th-n">V</span>
              <span className="rs-th-n">N</span>
              <span className="rs-th-n">D</span>
              <span className="rs-th-n" title="Forfaits">F</span>
              <span className="rs-th-n" title="Pénalité">P</span>
              <span className="rs-th-n">BP</span>
              <span className="rs-th-n">BC</span>
              <span className="rs-th-n">+/-</span>
              <span className="rs-th-n">PTS</span>
            </div>
            {CDD_STANDINGS.length === 0 ? (
              <div className="rs-cal-empty">
                <div className="rs-cal-empty-ic">🏆</div>
                <div className="rs-cal-empty-t">Classement non chargé</div>
                <div className="rs-cal-empty-d">Tape ↻ en haut pour télécharger</div>
              </div>
            ) : CDD_STANDINGS.map((s,i) => (
              <div key={i} className={`rs-row ${s.me?"me":""} ${s.hi?"hi":""}`}>
                <span className="rs-r-rank">
                  {s.rank}
                  {s.rank <= 2 && <i className="rs-r-mark up"/>}
                  {s.rank >= 7 && <i className="rs-r-mark dn"/>}
                </span>
                <span className="rs-r-c">
                  <span className="rs-c-name" title={s.club}>{s.club}</span>
                </span>
                <span className="num">{s.pl}</span>
                <span className="num">{s.w}</span>
                <span className="num">{s.d}</span>
                <span className="num">{s.l}</span>
                <span className={`num ${s.forfeits > 0 ? "warn" : "dim"}`}>{s.forfeits || 0}</span>
                <span className={`num ${s.penalty < 0 ? "neg" : "dim"}`}>{s.penalty || 0}</span>
                <span className="num dim">{s.gf}</span>
                <span className="num dim">{s.ga}</span>
                <span className={`num ${s.diff > 0 ? "pos" : s.diff < 0 ? "neg" : "dim"}`}>{s.diff > 0 ? "+" : ""}{s.diff}</span>
                <b className="num rs-r-pts">{s.pts}</b>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "calendrier" && (
        <div className="rs-cal">
          {/* Group matches by journée */}
          {(() => {
            const all = window.CDD_ALL_MATCHES || CDD_LAST_MATCHES || [];
            if (all.length === 0) {
              return (
                <div className="rs-cal-empty">
                  <div className="rs-cal-empty-ic">📅</div>
                  <div className="rs-cal-empty-t">Pas de calendrier</div>
                  <div className="rs-cal-empty-d">
                    {fffCfg
                      ? "Tape ↻ en haut pour récupérer le calendrier officiel."
                      : "Aucune configuration FFF."}
                  </div>
                </div>
              );
            }
            const byJ = {};
            all.forEach(m => {
              const j = m.journee || '?';
              if (!byJ[j]) byJ[j] = [];
              byJ[j].push(m);
            });
            const journees = Object.keys(byJ).sort((a,b) => {
              if (a === '?') return 1;
              if (b === '?') return -1;
              return +a - +b;
            });
            return journees.map(j => (
              <div key={j} className="rs-jrn">
                <div className="rs-jrn-h">
                  <span className="rs-jrn-n">J{j === '?' ? '–' : j}</span>
                  <span className="rs-jrn-c">{byJ[j].length} match{byJ[j].length>1?'s':''}</span>
                </div>
                <div className="rs-jrn-list">
                  {byJ[j].map((m,i) => {
                    const isMyMatch = m.venue === 'H' || m.venue === 'E';
                    return (
                      <div key={i} className={`rs-jrn-m ${m.played?'played':'pending'} ${isMyMatch?'mine':''} rs-${(m.result||'').toLowerCase()}`}>
                        {m.played && m.result && isMyMatch && (
                          <span className={`rs-jrn-result rs-${m.result.toLowerCase()}`}>{m.result}</span>
                        )}
                        {!m.played && isMyMatch && <span className="rs-jrn-date">{m.date}</span>}
                        {!isMyMatch && <span className="rs-jrn-date dim">{m.date}</span>}
                        <span className="rs-jrn-teams">
                          <span className={isMyMatch && m.venue==='H' ? 'me' : ''}>{m.home}</span>
                          {m.played && m.score ? (
                            <b className={`rs-jrn-sc ${m.forfeit?'forfeit':''}`}>{m.score[0]}–{m.score[1]}</b>
                          ) : (
                            <span className="rs-jrn-vs">vs</span>
                          )}
                          <span className={isMyMatch && m.venue==='E' ? 'me' : ''}>{m.away}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ));
          })()}
        </div>
      )}

      {tab === "buteurs" && (
        <div className="rs-buteurs">
          {CDD_TOP_SCORERS.length === 0 ? (
            <div className="rs-cal-empty">
              <div className="rs-cal-empty-ic">⚽</div>
              <div className="rs-cal-empty-t">Pas encore de buteur</div>
              <div className="rs-cal-empty-d">
                Les buts seront comptabilisés à partir des matchs que tu arbitres.<br/>
                Ouvre un match terminé pour vérifier que les buteurs y sont bien enregistrés.
              </div>
            </div>
          ) : CDD_TOP_SCORERS.map((p,i) => (
            <div className={`rs-but ${p.me?"me":""}`} key={p.playerId || i}>
              <span className="rs-but-r">{p.rank}</span>
              <span className="rs-but-name">
                {p.name}
                {p.assists > 0 && <em>{p.assists} passe{p.assists>1?'s':''}</em>}
              </span>
              <span className="rs-but-g num">
                <b>{p.goals}</b>
                <em>but{p.goals>1?'s':''}</em>
              </span>
            </div>
          ))}
        </div>
      )}

      {tab === "amicaux" && (
        <div className="rs-cal" style={{padding:'0 14px'}}>
          {/* Header + bouton + Match amical */}
          {_canEditRes && (
            <button onClick={() => setFriendlyModal({ mode: 'create' })}
                    style={{
                      width:'100%', padding:'11px 14px', borderRadius:10,
                      background:'rgba(168,85,247,0.10)', color:'#c4b5fd',
                      border:'1px dashed rgba(168,85,247,0.40)',
                      cursor:'pointer', fontWeight:800, fontSize:13,
                      letterSpacing:'.04em', marginBottom:14,
                      display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                    }}>
              <span>🤝</span><span>+ AJOUTER UN MATCH AMICAL</span>
            </button>
          )}

          {(() => {
            // ── COHÉRENCE (2026-06-14) ───────────────────────────────────
            // Avant : cet onglet ne montrait que les amicaux PROGRAMMÉS et non
            // joués (CDD_FRIENDLY.list exclut endedAt). Les amicaux DÉJÀ JOUÉS
            // n'apparaissaient nulle part ici alors qu'ils sont dans "Derniers
            // matchs" sur l'Accueil → incohérence signalée par Florian.
            // Maintenant : deux sections — "À venir" (programmés) + "Résultats"
            // (amicaux ET entraînements arbitrés, avec score + feuille de match).
            const played = (window.MATCH_HELPERS?.listCoachFinishedMatches?.() || [])
              .filter(m => m.matchType === 'amical' || m.matchType === 'entrainement');
            // Anti-doublon : un amical déjà joué (mais dont le endedAt n'a pas été
            // posé sur l'entrée programmée — race cross-device) ne doit pas
            // apparaître à la fois dans "À venir" ET dans "Résultats".
            const playedSchedIds = new Set(
              played.map(m => m.scheduledMatchId).filter(Boolean).map(String)
            );
            const upcoming = friendlyList // déjà filtré (non joués, non tombstone)
              .filter(m => !playedSchedIds.has(String(m.id)));

            const dispDate = (iso) => {
              const r = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
              return r ? (r[3] + '/' + r[2] + '/' + r[1]) : (iso || '');
            };
            const sectionH = {
              fontSize:11, fontWeight:900, letterSpacing:'.10em',
              color:'rgba(255,255,255,0.55)', textTransform:'uppercase',
              margin:'4px 2px 8px',
            };
            const typeMeta = (mt) => mt === 'entrainement'
              ? { l:'ENTR.', c:'#94a3b8' }
              : { l:'AMICAL', c:'#c4b5fd' };

            if (upcoming.length === 0 && played.length === 0) {
              return (
                <div className="rs-cal-empty">
                  <div className="rs-cal-empty-ic">🤝</div>
                  <div className="rs-cal-empty-t">Aucun match amical</div>
                  <div className="rs-cal-empty-d">
                    Les matchs amicaux (préparation, tournoi, jubilé…) ne sont pas dans
                    le calendrier FFF. Ajoute-les ici : tu les retrouveras dans
                    Convocations, puis leur résultat s'affichera ci-dessous une fois joués.
                  </div>
                </div>
              );
            }

            return (
              <>
                {/* ───────── À VENIR (programmés, non joués) ───────── */}
                {upcoming.length > 0 && (
                  <>
                    <div style={sectionH}>📅 À venir</div>
                    <div style={{display:'flex', flexDirection:'column', gap:8, marginBottom:18}}>
                      {upcoming.map(m => {
                        const dDisp = dispDate(m.date);
                        return (
                          <div key={m.id} style={{
                            padding:'12px 14px', borderRadius:10,
                            background:'rgba(168,85,247,0.06)',
                            border:'1px solid rgba(168,85,247,0.25)',
                            display:'flex', gap:10, alignItems:'center',
                          }}>
                            <div style={{
                              width:42, textAlign:'center', flexShrink:0,
                              borderRight:'1px solid rgba(255,255,255,0.08)', paddingRight:10,
                            }}>
                              <div style={{fontSize:18, fontWeight:900, lineHeight:1, color:'#c4b5fd'}}>
                                {dDisp.slice(0,2)}
                              </div>
                              <div style={{fontSize:9.5, fontWeight:700, opacity:0.65, marginTop:3, letterSpacing:'.04em'}}>
                                {dDisp.slice(3,5)}/{dDisp.slice(6,10)}
                              </div>
                            </div>
                            <div style={{flex:1, minWidth:0}}>
                              <div style={{fontSize:13, fontWeight:800, color:'#fff', display:'flex', alignItems:'center', gap:6, flexWrap:'wrap'}}>
                                <span style={{
                                  fontSize:9, padding:'2px 6px', borderRadius:5,
                                  background:'rgba(168,85,247,0.20)', color:'#c4b5fd',
                                  border:'1px solid rgba(168,85,247,0.40)', fontWeight:800,
                                  letterSpacing:'.06em',
                                }}>AMICAL</span>
                                <span>{m.venue === 'H' ? '🏠 vs' : '🚗 @'} {m.opponent || 'Adversaire'}</span>
                              </div>
                              <div style={{fontSize:11, opacity:0.65, marginTop:3, display:'flex', gap:8}}>
                                {m.time && <span>🕐 {m.time}</span>}
                              </div>
                            </div>
                            {_canEditRes && (
                              <button onClick={() => setFriendlyModal({ mode: 'edit', match: m })}
                                      title="Éditer ce match amical"
                                      style={{
                                        padding:'6px 10px', borderRadius:8, cursor:'pointer',
                                        background:'rgba(255,255,255,0.05)', color:'#c4b5fd',
                                        border:'1px solid rgba(168,85,247,0.30)',
                                        fontSize:11, fontWeight:700, flexShrink:0,
                                      }}>
                                ✎
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* ───────── RÉSULTATS (joués : amicaux + entraînements) ───────── */}
                {played.length > 0 && (
                  <>
                    <div style={sectionH}>🏁 Résultats</div>
                    <div style={{display:'flex', flexDirection:'column', gap:8}}>
                      {played.map(m => {
                        const tm = typeMeta(m.matchType);
                        // Score affiché identique à l'Accueil : "nous – eux".
                        // Pour les matchs arbitrés, score[0] = notre équipe.
                        const [us, them] = (m.venue === 'E')
                          ? [m.score[1], m.score[0]]
                          : [m.score[0], m.score[1]];
                        const fdCls = m.result === 'W' ? 'fd-w' : m.result === 'L' ? 'fd-l' : 'fd-d';
                        const fdTxt = m.result === 'W' ? 'V' : m.result === 'L' ? 'D' : 'N';
                        return (
                          <div key={m.id} style={{
                            padding:'10px 12px', borderRadius:10,
                            background:'rgba(255,255,255,0.02)',
                            border:'1px solid rgba(255,255,255,0.07)',
                            display:'flex', gap:10, alignItems:'center',
                          }}>
                            <span className={`fd ${fdCls} fd-big`} style={{flexShrink:0}}>{fdTxt}</span>
                            <button onClick={() => go('fiche-match', m)}
                                    title="Voir la feuille de match"
                                    style={{
                                      flex:1, minWidth:0, textAlign:'left', cursor:'pointer',
                                      background:'none', border:'none', padding:0, color:'inherit',
                                      fontFamily:'inherit',
                                    }}>
                              <div style={{fontSize:13, fontWeight:800, color:'#fff', display:'flex', alignItems:'center', gap:6, flexWrap:'wrap'}}>
                                <span style={{
                                  fontSize:9, padding:'2px 6px', borderRadius:5,
                                  background: tm.c + '22', color: tm.c,
                                  border:'1px solid ' + tm.c + '55', fontWeight:800,
                                  letterSpacing:'.06em',
                                }}>{tm.l}</span>
                                <span>{m.venue === 'H' ? '🏠' : m.venue === 'E' ? '🚗' : ''} {m.opp}</span>
                              </div>
                              <div style={{fontSize:10.5, opacity:0.6, marginTop:3, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>
                                {m.date}
                                {m.scorers && m.scorers.length > 0 &&
                                  <> · ⚽ {m.scorers.slice(0,3).join(', ')}{m.scorers.length > 3 ? '…' : ''}</>}
                                <> · feuille de match →</>
                              </div>
                            </button>
                            <div style={{fontWeight:900, fontSize:18, color:'#fff', flexShrink:0, letterSpacing:'.02em'}}>
                              {us}<span style={{opacity:0.4, margin:'0 2px'}}>–</span>{them}
                            </div>
                            {_canEditRes && (
                              <button
                                onClick={() => {
                                  const label = `${m.opp} (${us}–${them})`;
                                  if (!window.confirm(`Supprimer définitivement le match :\n\n${label}\n${m.date || ''}\n\nLa feuille de match et les données liées seront effacées. Cette action est irréversible.`)) return;
                                  const tid = _teamIdRes || null;
                                  window.CDD_FRIENDLY?.purgeMatch?.({ teamId: tid, matchId: m.id, friendlyId: m.scheduledMatchId || null });
                                }}
                                title="Supprimer ce match"
                                style={{
                                  padding:'6px 9px', borderRadius:8, cursor:'pointer',
                                  background:'rgba(255,107,107,0.08)', color:'#ff8a8a',
                                  border:'1px solid rgba(255,107,107,0.32)',
                                  fontSize:12, fontWeight:700, flexShrink:0,
                                }}>
                                🗑
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Modale création/édition d'un match amical depuis l'onglet Amicaux */}
      {friendlyModal && window.FriendlyMatchModal && _teamIdRes && (
        <window.FriendlyMatchModal
          teamId={_teamIdRes}
          clubId={_clubIdRes}
          existing={friendlyModal.mode === 'edit' ? friendlyModal.match : null}
          onClose={() => setFriendlyModal(null)}
          onSaved={() => setFriendlyModal(null)}
        />
      )}
    </div>
  );
}

window.ScreenResults = ScreenResults;


/* ============================================================
   MODALE — Fiche joueur en overlay (popup, pas navigation)
   #49 — Joueurs cliquables sur page Convocations
   ============================================================ */

function PlayerFicheModal({ player, onClose, onOpenFull }) {
  if (!player) return null;
  const FC = window.FutCard;
  const POS_LABEL = window.POSITION_LABEL || {};
  const status = (window.CDD_COACH?.getStatus?.(player.id) || 'active');
  const STATUS_OPTS = window.CDD_COACH?.STATUS_OPTIONS || [];
  const statusObj = STATUS_OPTS.find(s => s.id === status) || { l: 'Disponible', cls: 'on' };

  return (
    <div className="fi-sp-overlay cv-fiche-overlay" onClick={onClose}>
      <div className="fi-sp-sheet cv-fiche-sheet" onClick={e => e.stopPropagation()}>
        <div className="fi-sp-h">
          <span className="fi-sp-t">FICHE JOUEUR</span>
          <button className="fi-sp-x" onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        <div className="cv-fiche-body">
          <div className="cv-fiche-card">
            {FC && <FC player={player} variant="fut" size="md" />}
          </div>
          <div className="cv-fiche-info">
            <div className="cv-fiche-name">
              <span className="cv-fiche-first">{player.first || ''}</span>
              {player.last && <span className="cv-fiche-last">{player.last.toUpperCase()}</span>}
            </div>
            <div className="cv-fiche-meta">
              <span className="cv-fiche-tag cv-fiche-num">#{player.num}</span>
              <span className="cv-fiche-tag cv-fiche-pos">{POS_LABEL[player.pos] || player.pos}</span>
              <span className={`cv-fiche-tag cv-fiche-status cv-fiche-status-${statusObj.cls}`}>{statusObj.l}</span>
            </div>
          </div>
        </div>
        <div className="cv-fiche-actions">
          <button className="cv-fiche-btn cv-fiche-btn-secondary" onClick={onClose}>← Retour</button>
          <button className="cv-fiche-btn cv-fiche-btn-primary" onClick={onOpenFull}>Voir fiche complète</button>
        </div>
      </div>
    </div>
  );
}

window.PlayerFicheModal = PlayerFicheModal;


/* ============================================================
   SCREEN — Convocations
   ============================================================ */

function ScreenConvocations({ go, tweaks }) {
  const conv = CDD_CONVO;
  const next = conv.match;
  const starterPlayers = conv.starters.map(id => CDD_PLAYERS.find(p=>p.id===id)).filter(Boolean);
  const benchPlayers = conv.bench.map(id => CDD_PLAYERS.find(p=>p.id===id)).filter(Boolean);
  const reservePlayers = (conv.reserve || []).map(id => CDD_PLAYERS.find(p=>p.id===id)).filter(Boolean);
  const absentEntries = conv.absent.map(a => ({
    p: CDD_PLAYERS.find(p=>p.id===a.id),
    ...a,
  }));

  // #44 — Picker statut rapide depuis la ligne convoc
  const [statusPickerPlayer, setStatusPickerPlayer] = useState(null);
  // Modale détail (questions contextuelles par statut) — { player, statusId } ou null
  const [statusDetailFor, setStatusDetailFor] = useState(null);
  // #49 — Modale fiche joueur en popup (pas navigation pleine page)
  const [ficheModalPlayer, setFicheModalPlayer] = useState(null);
  // Modale numéros maillots match-specific. Mode 'edit' = simple édition ;
  // mode 'pre-match' = vérification obligatoire avant LANCER LE MATCH.
  const [jerseyModalMode, setJerseyModalMode] = useState(null); // null | 'edit' | 'pre-match'
  // Modale infos du match (stade, horaires, covoiturage…)
  const [matchInfoOpen, setMatchInfoOpen] = useState(false);
  // Modale création/édition d'un match amical
  const [friendlyModalMode, setFriendlyModalMode] = useState(null); // null | 'create' | 'edit'
  // Modale "Remplacer un joueur" : { player, role: 'starter'|'bench' }
  // Au lieu de "retirer puis voir un joueur monter au hasard", le coach
  // choisit explicitement le remplaçant via cette modale.
  const [swapModal, setSwapModal] = useState(null);
  // Tick pour re-render quand on sauvegarde les infos match (event listener).
  const [, forceMatchInfoUpdate] = useState({});
  const STATUS_QUICK = (window.CDD_COACH && window.CDD_COACH.STATUS_OPTIONS) || [];

  // Force re-render quand un statut/profil joueur change ailleurs (fiche, autre onglet)
  const [, forceConvocUpdate] = useState({});
  useEffect(() => {
    const handler = () => forceConvocUpdate({});
    window.addEventListener('cdd-player-changed', handler);
    window.addEventListener('cdd-data-rebuilt',   handler);
    return () => {
      window.removeEventListener('cdd-player-changed', handler);
      window.removeEventListener('cdd-data-rebuilt',   handler);
    };
  }, []);

  // Re-render quand les infos du match sont mises à jour depuis la modale.
  useEffect(() => {
    const h = () => forceMatchInfoUpdate({});
    window.addEventListener('cdd-match-info-changed', h);
    return () => window.removeEventListener('cdd-match-info-changed', h);
  }, []);

  // #51 — Banc strict 3 à 5 (foot amateur). Picker numérique retiré.
  const teamId = window.CDD?.getActiveTeam?.()?.id;
  const BENCH_MAX = (window.CDD_CONVOC && window.CDD_CONVOC.BENCH_MAX) || 5;
  const BENCH_MIN = (window.CDD_CONVOC && window.CDD_CONVOC.BENCH_MIN) || 3;
  const [benchFullToast, setBenchFullToast] = useState(false);

  // Écoute l'event 'cdd-bench-full' dispatché par CDD_CONVOC quand on dépasse 5
  useEffect(() => {
    const handler = () => {
      setBenchFullToast(true);
      setTimeout(() => setBenchFullToast(false), 2600);
    };
    window.addEventListener('cdd-bench-full', handler);
    return () => window.removeEventListener('cdd-bench-full', handler);
  }, []);

  // #C5 — modifier la convocation/compo = capacité 'compo' ; changer un
  // statut = 'effectif'. Les deux couvrent le même périmètre de rôles
  // (coach principal + adjoint), donc un seul booléen suffit ici.
  const _baseCanEdit = !window.CDD_ROLES || !window.CDD_ROLES.canDo
    || window.CDD_ROLES.canDo('compo');
  // VERROU : si un match est déjà LANCÉ (chrono en cours), on bloque
  // toute édition de la convoc/compo. Sinon le coach pourrait ressaisir
  // une compo "préparation" pendant que le live tourne → incohérent.
  const _liveMatch = (window.MATCH_HELPERS && window.MATCH_HELPERS.getLiveMatch)
    ? window.MATCH_HELPERS.getLiveMatch() : null;
  const _matchInProgress = !!_liveMatch;
  const canEdit = _baseCanEdit && !_matchInProgress;

  const addPlayer = (pid) => {
    // Log de traçabilité pour diagnostiquer pourquoi l'ajout peut échouer
    // silencieusement. État courant + résultat de addToConvoc.
    const _diag = {
      canEdit, teamId, pid,
      benchLen: benchPlayers.length,
      reserveLen: reservePlayers.length,
      hasConvoc: !!window.CDD_CONVOC,
      hasAdd: !!(window.CDD_CONVOC && window.CDD_CONVOC.addToConvoc),
    };
    if (!canEdit) {
      console.warn('[convocs] addPlayer refusé : pas de permission', _diag);
      return;
    }
    if (!teamId) {
      console.warn('[convocs] addPlayer refusé : teamId manquant', _diag);
      alert('Impossible d\'ajouter — aucune équipe active détectée. Recharge la page.');
      return;
    }
    if (!window.CDD_CONVOC || !window.CDD_CONVOC.addToConvoc) {
      console.warn('[convocs] addPlayer refusé : CDD_CONVOC non chargé', _diag);
      return;
    }
    console.info('[convocs] addPlayer →', _diag);
    // addToConvoc gère lui-même le cap bench=5 et étend convocCount au besoin
    const ok = window.CDD_CONVOC.addToConvoc(teamId, pid, 'bench');
    console.info('[convocs] addPlayer résultat :', ok ? 'OK' : 'REFUSÉ (banc plein ou erreur)');
    if (ok === false) {
      // Le toast cdd-bench-full sera déjà déclenché, mais on confirme côté UI.
      // Cas où l'UI affichait < BENCH_MAX mais le storage avait déjà plus :
      // l'utilisateur voit du coup le toast et le compteur se met à jour.
      setBenchFullToast(true);
      setTimeout(() => setBenchFullToast(false), 2600);
    }
  };
  const removePlayer = (pid) => {
    const _diag = { canEdit, teamId, pid, hasConvoc: !!window.CDD_CONVOC };
    if (!canEdit) {
      console.warn('[convocs] removePlayer refusé : pas de permission', _diag);
      return;
    }
    if (!teamId) {
      console.warn('[convocs] removePlayer refusé : teamId manquant', _diag);
      alert('Impossible de retirer — aucune équipe active. Recharge la page.');
      return;
    }
    if (!window.CDD_CONVOC || !window.CDD_CONVOC.removeFromConvoc) {
      console.warn('[convocs] removePlayer refusé : CDD_CONVOC non chargé', _diag);
      return;
    }
    if (!confirm('Retirer ce joueur de la convocation ?')) return;
    console.info('[convocs] removePlayer →', _diag);
    window.CDD_CONVOC.removeFromConvoc(teamId, pid);
    console.info('[convocs] removePlayer terminé');
  };
  // Exécute le swap (out descend, in monte). Appelée depuis la modale.
  const doSwap = (outPid, inPid) => {
    if (!canEdit || !teamId || !window.CDD_CONVOC?.swapPlayers) return;
    const ok = window.CDD_CONVOC.swapPlayers(teamId, outPid, inPid);
    console.info('[convocs] swap', { outPid, inPid, ok });
    if (!ok) alert('Impossible de faire ce changement — réessaie.');
    setSwapModal(null);
  };
  // Marque la présence d'un joueur côté coach (cas parent sans app ou
  // info reçue par texto/oral). Écrit dans Firestore comme une réponse
  // parent normale, avec un label indiquant qui a saisi.
  const markPresenceManual = (player, resp) => {
    if (!canEdit || !player) return;
    const label = `${player.first} ${player.last || ''} (saisi par coach)`;
    if (!window.cddSync?.sendConvocResponse) {
      console.warn('[convocs] markPresenceManual : cddSync indisponible');
      return;
    }
    console.info('[convocs] markPresenceManual →', { matchId, pid: player.id, resp });
    window.cddSync.sendConvocResponse(matchId, player.id, resp, label)
      .then(() => console.info('[convocs] markPresenceManual OK'))
      .catch(err => {
        console.warn('[convocs] markPresenceManual failed:', err.message);
        alert('Erreur sauvegarde — réessaie dans quelques secondes.');
      });
  };

  // --- Live réponses parents (Firestore via cddSync) ---
  const matchId = (typeof window.cddSync !== 'undefined' && window.cddSync.matchId) || 'demo';
  const [parentResponses, setParentResponses] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`cdd_v2_convoc_${matchId}`) || '{}'); }
    catch (e) { return {}; }
  });
  useEffect(() => {
    if (!window.cddSync?.watchConvocResponses) return;
    // Log de traçabilité — Florian peut comparer ce matchId avec celui
    // loggué par la page Lecteur côté parent. S'ils diffèrent → désync.
    console.info('[convocs] watching matchId=' + matchId
      + ' (firestorePath: match_convocs/' + matchId + ')');
    const unsubscribe = window.cddSync.watchConvocResponses(matchId, (responses) => {
      const n = Object.keys(responses || {}).length;
      console.info('[convocs] snapshot reçu : ' + n + ' réponse(s) pour ' + matchId);
      setParentResponses(responses);
    });
    return () => { try { unsubscribe?.(); } catch (e) {} };
  }, [matchId]);
  const respBadge = (playerId) => {
    const r = parentResponses[playerId];
    if (!r) return null;
    const label = r.resp === 'yes' ? '👍' : r.resp === 'no' ? '👎' : '❓';
    const title = r.resp === 'yes' ? 'Parent : présent' : r.resp === 'no' ? 'Parent : absent' : 'Parent : peut-être';
    return <span className="cv-parent-resp" title={title} style={{marginLeft:6, fontSize:14, opacity:0.9}}>{label}</span>;
  };
  // respCell — affichage unifié sur chaque ligne joueur (refonte 2026-05-23) :
  //   • Parent a répondu → badge emoji (👍/👎/❓)
  //   • Parent n'a PAS répondu → bouton « 💬 » WhatsApp inline cliquable
  // Évite d'avoir 2 listes du même joueur (une dans Suivi présences, l'autre
  // dans Titulaires/Remplaçants). Tout est sur la ligne du joueur.
  // Affichage du num : on applique l'override match-specific si défini, sinon
  // num saison. C'est l'écran Convocations, donc match-context permanent.
  const _matchIdForJersey = (window.CDD_NEXT_MATCH && window.CDD_NEXT_MATCH.id) || 'placeholder';
  const displayNum = (p) => {
    if (!p) return null;
    if (window.CDD_JERSEY?.getNum && teamId) {
      return window.CDD_JERSEY.getNum(teamId, _matchIdForJersey, p.id, p.num);
    }
    return p.num;
  };
  // Tri par numéro maillot du match croissant (refonte 2026-05-24).
  // On utilise displayNum pour que l'ordre suive le num qu'on voit afficher.
  const sortByNum = (arr) => [...(arr || [])].sort((a, b) => {
    const dna = displayNum(a);
    const dnb = displayNum(b);
    const na = (typeof dna === 'number' && dna) || 999;
    const nb = (typeof dnb === 'number' && dnb) || 999;
    return na - nb;
  });
  // Idem mais pour absentEntries qui sont des objets { p, reason, note }.
  const sortAbsentByNum = (arr) => [...(arr || [])].sort((a, b) => {
    const dna = displayNum(a?.p);
    const dnb = displayNum(b?.p);
    const na = (typeof dna === 'number' && dna) || 999;
    const nb = (typeof dnb === 'number' && dnb) || 999;
    return na - nb;
  });
  // Avatar compact pour la liste (photo joueur ou initiales en fallback).
  const renderAvatar = (p) => (
    <span style={{
      width: 28, height: 28, borderRadius: '50%', overflow: 'hidden',
      background: 'rgba(255,255,255,0.05)', flexShrink: 0,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.6)',
      border: '1px solid rgba(255,255,255,0.08)', marginRight: 6,
    }}>
      {(p && (p.photoDataUrl || p.photo)) ? (
        <img src={p.photoDataUrl || p.photo} alt=""
             style={{width:'100%', height:'100%', objectFit:'cover'}}
             onError={(e) => { e.currentTarget.style.display = 'none'; }}/>
      ) : (
        <span>{((p && p.first) || '?')[0]}{((p && p.last) || '?')[0]}</span>
      )}
    </span>
  );

  const respCell = (p) => {
    const r = parentResponses[p.id];
    if (r) {
      const label = r.resp === 'yes' ? '👍' : r.resp === 'no' ? '👎' : '❓';
      const title = r.resp === 'yes' ? 'Parent : présent' : r.resp === 'no' ? 'Parent : absent' : 'Parent : peut-être';
      // Coach peut ÉCRASER une réponse en cliquant à nouveau sur ✓/✗
      // (utile si la réponse parent est erronée — saisie manuelle gagne).
      if (canEdit && r.resp !== 'yes') {
        return (
          <span style={{display:'inline-flex', gap:4, marginLeft:6, alignItems:'center'}}>
            <span title={title} style={{fontSize:14, opacity:0.7}}>{label}</span>
            <button
              onClick={(e) => { e.stopPropagation(); markPresenceManual(p, 'yes'); }}
              title="Forcer présent (saisie coach)"
              style={{
                padding:'2px 6px', borderRadius:6,
                background:'rgba(200,241,105,0.18)', color:'#c8f169',
                border:'1px solid rgba(200,241,105,0.45)',
                fontSize:10.5, fontWeight:800, cursor:'pointer',
              }}>✓</button>
          </span>
        );
      }
      return <span className="cv-parent-resp" title={title} style={{marginLeft:6, fontSize:14, opacity:0.9}}>{label}</span>;
    }
    // Pas de réponse : parent ne voit rien, coach voit 2 boutons côte-à-côte :
    // ✓ Marquer présent (cas info reçue par texto / parent sans app)
    // 💬 Relancer WhatsApp
    if (!canEdit) return null;
    const hasPhone = !!normalizePhone(p.parentPhone);
    return (
      <span style={{display:'inline-flex', gap:4, marginLeft:8, flexShrink:0}}>
        <button
          onClick={(e) => { e.stopPropagation(); markPresenceManual(p, 'yes'); }}
          title={`Marquer ${p.first} comme PRÉSENT (saisie manuelle coach)`}
          style={{
            padding:'3px 8px', borderRadius:7,
            background:'rgba(200,241,105,0.18)', color:'#c8f169',
            border:'1px solid rgba(200,241,105,0.45)',
            fontSize:11, fontWeight:800, cursor:'pointer',
            whiteSpace:'nowrap',
          }}>
          ✓
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); openRelanceWhatsApp(p); }}
          title={hasPhone
            ? `Relancer ${p.first} sur WhatsApp`
            : `Pas de numéro parent enregistré — WhatsApp s'ouvrira vide`}
          style={{
            padding:'3px 8px', borderRadius:7,
            background: hasPhone ? '#25D366' : 'rgba(255,170,40,0.15)',
            color: hasPhone ? '#fff' : '#ffc788',
            border: hasPhone ? 'none' : '1px solid rgba(255,170,40,0.35)',
            fontSize:11, fontWeight:800, cursor:'pointer',
            display:'inline-flex', alignItems:'center', gap:3,
            whiteSpace:'nowrap',
          }}>
          💬 {hasPhone ? '' : '?'}
        </button>
      </span>
    );
  };
  const respCounts = Object.values(parentResponses).reduce((acc, r) => {
    if (r?.resp === 'yes') acc.yes++;
    else if (r?.resp === 'no') acc.no++;
    else if (r?.resp === 'may') acc.may++;
    return acc;
  }, { yes:0, no:0, may:0 });
  const totalResponded = respCounts.yes + respCounts.no + respCounts.may;

  // ─── Suivi présences : liste actionnable des non-respondants ───
  // Le coach voit qui relancer et clique 1× pour WhatsApper le parent.
  const convocPlayers = [...starterPlayers, ...benchPlayers];
  const pendingPlayers = convocPlayers.filter(p => !parentResponses[p.id]);
  const responseRate = convocPlayers.length > 0
    ? Math.round((totalResponded / convocPlayers.length) * 100)
    : 0;
  // Lien lecteur public (token persistant, partagé via la page Partage).
  const shareToken = (() => {
    try {
      let t = localStorage.getItem('cdd_share_token');
      if (!t) {
        t = Math.random().toString(36).slice(2, 9).toUpperCase();
        localStorage.setItem('cdd_share_token', t);
      }
      return t;
    } catch (e) { return 'PROTO123'; }
  })();
  // #56 — Domaine courant, jamais codé en dur (lien lecteur = app, route ?t=).
  const lecteurUrl = `${window.location.origin}/?t=${shareToken}`;
  // Normalise un numéro français vers le format E.164 pour wa.me.
  // '06 12 34 56 78' → '33612345678'. Si déjà international ou non-FR, laisse tel quel.
  const normalizePhone = (raw) => {
    if (!raw) return '';
    const digits = String(raw).replace(/[^\d+]/g, '');
    if (digits.startsWith('+')) return digits.slice(1);
    if (digits.startsWith('33')) return digits;
    if (digits.startsWith('0') && digits.length === 10) return '33' + digits.slice(1);
    return digits;
  };
  const buildRelanceMsg = (playerFirst) => {
    // Infos pratiques du match (stade, horaires, covoiturage) si renseignées.
    const _mid = (window.CDD_NEXT_MATCH && window.CDD_NEXT_MATCH.id) || 'placeholder';
    const infoBlock = (teamId && window.CDD_MATCH_INFO?.formatForMessage)
      ? window.CDD_MATCH_INFO.formatForMessage(window.CDD_MATCH_INFO.get(teamId, _mid))
      : '';
    return (
      `Salut ! Petit rappel pour la convoc ${(CDD_CLUB && CDD_CLUB.team) || ''} ${next.home || ''} vs ${next.away || ''} (${next.date || ''}).\n\n` +
      (infoBlock ? infoBlock + '\n\n' : '') +
      `Tu peux confirmer la présence de ${playerFirst} en 1 tap ici :\n${lecteurUrl}\n\nMerci 🙏`
    );
  };
  const openRelanceWhatsApp = (player) => {
    const phone = normalizePhone(player.parentPhone);
    const txt = encodeURIComponent(buildRelanceMsg(player.first || 'ton enfant'));
    const url = phone ? `https://wa.me/${phone}?text=${txt}` : `https://wa.me/?text=${txt}`;
    window.open(url, '_blank');
  };
  const openRelanceAll = () => {
    // Pas d'envoi groupé possible avec wa.me. On copie le message générique dans le presse-papier
    // et on ouvre la page Partage pour le canal de diffusion choisi par le coach.
    const txt = buildRelanceMsg('votre enfant');
    try { navigator.clipboard?.writeText(txt); } catch (e) {}
    go('share');
  };
  const [pendingExpanded, setPendingExpanded] = useState(true);

  return (
    <div className="scr scr-conv fade-in" data-screen-label="07 Convocations">

      {/* Bandeau VERROUILLAGE — affiché si un match est en cours.
          Empêche le coach de modifier la convoc pendant le live, ce qui
          mettrait la compo "préparation" en incohérence avec le terrain. */}
      {_matchInProgress && _baseCanEdit && (
        <div style={{
          margin:'10px 14px', padding:'11px 14px', borderRadius:10,
          background:'rgba(249,115,22,0.10)',
          border:'1px solid rgba(249,115,22,0.45)',
          color:'#fbbf24', fontSize:12.5, fontWeight:700,
          display:'flex', alignItems:'center', gap:10, flexWrap:'wrap',
        }}>
          <span style={{fontSize:18}}>🔒</span>
          <span style={{flex:1, minWidth:0}}>
            <b>Match en cours</b> — la convocation est verrouillée jusqu'à la fin du match.
          </span>
          <button
            type="button"
            onClick={() => go && go('match')}
            style={{
              padding:'7px 12px', borderRadius:7, cursor:'pointer',
              background:'rgba(249,115,22,0.18)', color:'#fbbf24',
              border:'1px solid rgba(249,115,22,0.40)',
              fontSize:11.5, fontWeight:800, fontFamily:'inherit',
              whiteSpace:'nowrap',
            }}>
            ▶ Aller au match
          </button>
        </div>
      )}

      <div className="cv-hero">
        <div className="cv-hero-bg"/>
        <div className="cv-hero-grad"/>
        <div className="cv-hero-in">
          <div className="cv-hero-k" style={{display:'flex', alignItems:'center', gap:8, flexWrap:'wrap'}}>
            <span>FEUILLE DE CONVOCATION</span>
            {next.isAmical && (
              <span style={{
                fontSize:9.5, padding:'2px 8px', borderRadius:10,
                background:'rgba(168,85,247,0.18)', color:'#c4b5fd',
                border:'1px solid rgba(168,85,247,0.45)',
                fontWeight:800, letterSpacing:'.08em',
              }}>🤝 MATCH AMICAL</span>
            )}
          </div>
          {(() => {
            const _placeholder = !!(next && (next.noUpcoming || !next.away || next.away === 'À déterminer'));
            if (_placeholder) {
              return (
                <>
                  <div className="cv-hero-title">Aucun match programmé</div>
                  <div className="cv-hero-meta" style={{opacity:0.7}}>
                    <span>Le coach annoncera le prochain.</span>
                  </div>
                </>
              );
            }
            // Heure affichée = priorité au coup d'envoi saisi dans
            // "Infos du match" (kickoff), fallback sur l'heure d'origine
            // FFF/amical (next.time). Cohérent avec screen-match-prep.jsx.
            const _mInfo = (teamId && matchId && window.CDD_MATCH_INFO?.get)
              ? window.CDD_MATCH_INFO.get(teamId, matchId) : null;
            const _eff = (_mInfo && _mInfo.kickoff) || next.time || '';
            return (
              <>
                <div className="cv-hero-title">{next.home}<br/>VS {next.away}</div>
                <div className="cv-hero-meta">
                  <span>📅 {next.date}{_eff ? ` · ${_eff}` : ''}</span>
                  <span>🏟️ {next.venue}</span>
                </div>
              </>
            );
          })()}
          {/* CTA unique dynamique selon l'état de la convocation.
              Logique en enfilade :
              1. Pas de match (placeholder)        → Créer un match amical
              2. Match présent, jamais partagé     → Envoyer la convocation
              3. Partagé, réponses incomplètes     → Relancer les parents restants
              4. Toutes les réponses sont arrivées → Lancer le match
              Les autres actions (compo, vestiaire, numéros, infos) sont sur la
              page Match dédiée pour éviter la surcharge. */}
          {canEdit && (() => {
            const isPlaceholder = !!(next && (next.noUpcoming || !next.away || next.away === 'À déterminer'));
            const nbPending = pendingPlayers.length;
            const nbConv = convocPlayers.length;
            const allResponded = nbConv > 0 && nbPending === 0;
            const noShareYet = nbConv > 0 && totalResponded === 0;

            // Style commun
            const baseStyle = {
              width:'100%', padding:'13px 16px', borderRadius:11,
              fontWeight:900, fontSize:14, letterSpacing:'.06em',
              cursor:'pointer', textAlign:'center',
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            };

            if (isPlaceholder) {
              return (
                <button onClick={() => setFriendlyModalMode('create')}
                  style={{ ...baseStyle,
                    background:'linear-gradient(135deg, rgba(168,85,247,0.20) 0%, rgba(168,85,247,0.08) 100%)',
                    border:'1px solid rgba(168,85,247,0.50)', color:'#c4b5fd' }}>
                  🤝 CRÉER UN MATCH AMICAL
                </button>
              );
            }
            if (allResponded) {
              return (
                <button onClick={() => {
                  const mid = (window.CDD_NEXT_MATCH && window.CDD_NEXT_MATCH.id) || 'placeholder';
                  const reviewed = window.CDD_JERSEY?.wasReviewed?.(teamId, mid);
                  if (!reviewed) setJerseyModalMode('pre-match');
                  else go('match');
                }}
                  style={{ ...baseStyle,
                    background:'linear-gradient(135deg, rgba(200,241,105,0.22) 0%, rgba(200,241,105,0.10) 100%)',
                    border:'1px solid rgba(200,241,105,0.55)', color:'#c8f169',
                    boxShadow:'0 4px 16px rgba(200,241,105,0.10)' }}>
                  🏁 LANCER LE MATCH ({nbConv} confirmés)
                </button>
              );
            }
            if (noShareYet) {
              return (
                <button onClick={() => go("share")}
                  style={{ ...baseStyle,
                    background:'linear-gradient(135deg, rgba(200,241,105,0.20) 0%, rgba(200,241,105,0.08) 100%)',
                    border:'1px solid rgba(200,241,105,0.50)', color:'#c8f169' }}>
                  ↗ ENVOYER LA CONVOCATION AUX {window.CDD_TEAM_HELPERS?.activeTeamIsAdult?.() ? 'JOUEURS' : 'PARENTS'}
                </button>
              );
            }
            // État intermédiaire : partagé, réponses partielles
            return (
              <div style={{display:'flex', flexDirection:'column', gap:8, width:'100%'}}>
                <button onClick={openRelanceAll}
                  style={{ ...baseStyle,
                    background:'linear-gradient(135deg, rgba(255,170,40,0.18) 0%, rgba(255,170,40,0.08) 100%)',
                    border:'1px solid rgba(255,170,40,0.50)', color:'#ffc788' }}>
                  📣 RELANCER LES {nbPending} {window.CDD_TEAM_HELPERS?.activeTeamIsAdult?.() ? 'JOUEUR' : 'PARENT'}{nbPending > 1 ? 'S' : ''} RESTANT{nbPending > 1 ? 'S' : ''}
                </button>
                {/* Bouton secondaire 'Lancer quand même' si le coach veut forcer */}
                <button onClick={() => {
                    const mid = (window.CDD_NEXT_MATCH && window.CDD_NEXT_MATCH.id) || 'placeholder';
                    const reviewed = window.CDD_JERSEY?.wasReviewed?.(teamId, mid);
                    if (!reviewed) setJerseyModalMode('pre-match');
                    else go('match');
                  }}
                  style={{
                    width:'100%', padding:'10px 14px', borderRadius:10, cursor:'pointer',
                    background:'rgba(200,241,105,0.06)', color:'#c8f169',
                    border:'1px dashed rgba(200,241,105,0.35)',
                    fontWeight:700, fontSize:12.5, letterSpacing:'.04em',
                  }}>
                  🏁 Lancer le match sans attendre →
                </button>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Mini-vue terrain de la compo du match. Lecture seule, bouton ✎ Modifier
          qui ouvre l'éditeur complet (avec drag & drop). Affiché uniquement
          quand un vrai match est programmé. */}
      {(() => {
        const _isPlaceholderMatch = !!(next && (next.noUpcoming || !next.away || next.away === 'À déterminer'));
        if (_isPlaceholderMatch || !teamId) return null;
        const _mid = (window.CDD_NEXT_MATCH && window.CDD_NEXT_MATCH.id) || 'placeholder';
        // Source du lineup : compo match (cdd_match_lineup) ou compo type
        let pitchLineup = null;
        let isMatchSpecific = false;
        try {
          const allM = JSON.parse(localStorage.getItem('cdd_match_lineup') || '{}');
          if (allM[teamId]?.[_mid]) { pitchLineup = allM[teamId][_mid]; isMatchSpecific = true; }
          else {
            const allT = JSON.parse(localStorage.getItem('cdd_lineup_template') || '{}');
            if (allT[teamId]) pitchLineup = allT[teamId];
          }
        } catch (e) {}
        if (!pitchLineup || !pitchLineup.starters) return null;
        const formation = pitchLineup.formation || '4-3-3';
        const slots = (window.CDD_FORMATIONS && window.CDD_FORMATIONS[formation])
                   || (window.CDD_FORMATIONS && window.CDD_FORMATIONS['4-3-3']) || [];
        const allPlayers = window.CDD_PLAYERS || [];
        const playerOf = (pid) => pid && allPlayers.find(p => p.id === pid);
        const club = window.CDD_CLUB || {};
        const primary = (club.colors && club.colors[0]) || '#c8f169';
        const secondary = (club.colors && club.colors[1]) || '#000';
        return (
          <div style={{
            margin:'8px 14px 14px', borderRadius:12, overflow:'hidden',
            border:'1px solid rgba(255,255,255,0.10)',
          }}>
            {/* Header */}
            <div style={{
              padding:'10px 12px', display:'flex', justifyContent:'space-between',
              alignItems:'center', background:'rgba(0,0,0,0.45)', gap:8,
            }}>
              <div style={{fontSize:11, fontWeight:900, letterSpacing:'.08em',
                           color: isMatchSpecific ? '#f97316' : '#c8f169',
                           textTransform:'uppercase'}}>
                {isMatchSpecific ? '🎯 Compo du match' : '🗓️ Compo type'} · {formation}
              </div>
              {canEdit && (
                <button onClick={() => go('match-lineup')}
                  style={{
                    padding:'6px 12px', borderRadius:7, cursor:'pointer',
                    background: isMatchSpecific ? 'rgba(249,115,22,0.12)' : 'rgba(200,241,105,0.12)',
                    color: isMatchSpecific ? '#f97316' : '#c8f169',
                    border: '1px solid ' + (isMatchSpecific ? 'rgba(249,115,22,0.40)' : 'rgba(200,241,105,0.40)'),
                    fontSize:11, fontWeight:700, letterSpacing:'.02em',
                  }}>
                  ✎ Modifier
                </button>
              )}
            </div>
            {/* Terrain SVG */}
            <div style={{position:'relative', width:'100%', paddingBottom:'95%', background:'#1c6e35'}}>
              <svg viewBox="0 0 100 110" preserveAspectRatio="xMidYMid meet"
                   style={{position:'absolute', top:0, left:0, width:'100%', height:'100%'}}>
                <defs>
                  <linearGradient id="cv-pitch-grass" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1f7a3a"/>
                    <stop offset="50%" stopColor="#2c8c47"/>
                    <stop offset="100%" stopColor="#1c6e35"/>
                  </linearGradient>
                  <pattern id="cv-pitch-stripes" x="0" y="0" width="100" height="14" patternUnits="userSpaceOnUse">
                    <rect width="100" height="14" fill="url(#cv-pitch-grass)"/>
                    <rect y="7" width="100" height="7" fill="rgba(255,255,255,.04)"/>
                  </pattern>
                </defs>
                <rect width="100" height="110" fill="url(#cv-pitch-stripes)"/>
                {/* Lignes terrain */}
                <g stroke="rgba(255,255,255,.65)" strokeWidth=".3" fill="none">
                  <rect x="2" y="2" width="96" height="106"/>
                  <line x1="2" y1="55" x2="98" y2="55"/>
                  <circle cx="50" cy="55" r="9"/>
                  <circle cx="50" cy="55" r=".6" fill="rgba(255,255,255,.65)"/>
                  <rect x="22" y="2" width="56" height="13"/>
                  <rect x="36" y="2" width="28" height="5"/>
                  <rect x="22" y="95" width="56" height="13"/>
                  <rect x="36" y="103" width="28" height="5"/>
                </g>
                {/* Labels noms — passe 1 (en arrière) */}
                <g>
                  {slots.map((slot, i) => {
                    const p = playerOf(pitchLineup.starters[i]);
                    if (!p) return null;
                    const x = slot.x;
                    const y = 8 + (slot.y / 92) * 86;
                    return (
                      <g key={'l-' + i} transform={`translate(${x}, ${y + 10})`}>
                        <rect x="-11" y="-2" width="22" height="3.6" rx="1" fill="rgba(0,0,0,.78)"/>
                        <text textAnchor="middle" dominantBaseline="central"
                              fontSize="2.6" fontWeight="800" fill="#fff"
                              fontFamily="Inter, sans-serif">
                          {(p.first || '').slice(0, 12)}
                        </text>
                      </g>
                    );
                  })}
                </g>
                {/* Pastilles joueurs — passe 2 (au-dessus) */}
                <g>
                  {slots.map((slot, i) => {
                    const p = playerOf(pitchLineup.starters[i]);
                    const x = slot.x;
                    const y = 8 + (slot.y / 92) * 86;
                    if (!p) {
                      // Slot vide : pastille discrète
                      return (
                        <g key={'e-' + i} transform={`translate(${x}, ${y})`}>
                          <circle r="5" fill="rgba(0,0,0,.30)" stroke="rgba(255,255,255,.30)"
                                  strokeWidth=".3" strokeDasharray="1 1"/>
                          <text textAnchor="middle" dominantBaseline="central"
                                fontSize="4" fontWeight="900" fill="rgba(255,255,255,.5)">+</text>
                        </g>
                      );
                    }
                    const num = (window.CDD_JERSEY?.getNum?.(teamId, _mid, p.id, p.num)) ?? p.num;
                    return (
                      <g key={'p-' + i} transform={`translate(${x}, ${y})`}>
                        <circle r="6.8" fill="rgba(0,0,0,.42)"/>
                        <circle r="5.8" fill={primary} stroke="#fff" strokeWidth=".4"/>
                        {p.photo && (
                          <>
                            <defs><clipPath id={`cv-clip-${i}`}><circle cx="0" cy="0" r="5.6"/></clipPath></defs>
                            <image href={p.photo} xlinkHref={p.photo}
                                   x="-5.6" y="-5.6" width="11.2" height="11.2"
                                   preserveAspectRatio="xMidYMid slice"
                                   clipPath={`url(#cv-clip-${i})`}/>
                            <circle r="5.6" fill="rgba(0,0,0,.18)"/>
                          </>
                        )}
                        <circle cx="3.4" cy="-3.4" r="2.4" fill={secondary} stroke="#fff" strokeWidth=".2"/>
                        <text x="3.4" y="-3.0" textAnchor="middle" dominantBaseline="central"
                              fontSize="2.8" fontWeight="900" fill="#fff"
                              fontFamily="Inter, sans-serif">
                          {num}
                        </text>
                      </g>
                    );
                  })}
                </g>
              </svg>
            </div>
          </div>
        );
      })()}

      {/* Carte récap des infos pratiques du match — visible si renseignées ou
          avertissement si vides (gating UX pour pousser le coach à les saisir
          AVANT d'envoyer la convocation).
          ⚠ Affichée uniquement s'il y a un VRAI match programmé (pas si placeholder). */}
      {(() => {
        const _isPlaceholderMatch = !!(next && (next.noUpcoming || !next.away || next.away === 'À déterminer'));
        if (_isPlaceholderMatch) return null; // pas de match → pas d'infos à demander
        const _mid = (window.CDD_NEXT_MATCH && window.CDD_NEXT_MATCH.id) || 'placeholder';
        const info = (teamId && window.CDD_MATCH_INFO?.get?.(teamId, _mid)) || null;
        const hasInfo = teamId && window.CDD_MATCH_INFO?.hasAny?.(teamId, _mid);
        if (!hasInfo) {
          return canEdit ? (
            <div onClick={() => setMatchInfoOpen(true)}
                 style={{
                   margin:'8px 14px 14px', padding:'12px 14px', borderRadius:10,
                   background:'rgba(255,170,40,0.08)', border:'1px dashed rgba(255,170,40,0.40)',
                   cursor:'pointer', display:'flex', alignItems:'center', gap:10,
                 }}>
              <span style={{fontSize:20}}>⚠️</span>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontSize:12.5, fontWeight:800, color:'#ffc788', marginBottom:3}}>
                  Infos du match manquantes
                </div>
                <div style={{fontSize:11, color:'rgba(255,255,255,0.65)', lineHeight:1.4}}>
                  Renseigne le stade, l'adresse, le RDV vestiaire et le coup d'envoi
                  pour que la convocation envoyée aux {window.CDD_TEAM_HELPERS?.activeTeamIsAdult?.() ? 'joueurs' : 'parents'} soit exploitable.
                </div>
              </div>
              <span style={{color:'#ffc788', fontSize:11, fontWeight:700, whiteSpace:'nowrap'}}>Renseigner →</span>
            </div>
          ) : null;
        }
        return (
          <div style={{
            margin:'8px 14px 14px', padding:'12px 14px', borderRadius:10,
            background:'rgba(125,211,252,0.06)', border:'1px solid rgba(125,211,252,0.25)',
          }}>
            <div style={{
              display:'flex', justifyContent:'space-between', alignItems:'center',
              marginBottom:8, fontSize:11, fontWeight:800, letterSpacing:'.08em',
              color:'#7dd3fc', textTransform:'uppercase',
            }}>
              <span>📋 Infos du match</span>
              {canEdit && (
                <button onClick={() => setMatchInfoOpen(true)}
                        style={{
                          background:'transparent', border:'none', color:'#7dd3fc',
                          fontSize:11, fontWeight:700, cursor:'pointer', padding:0,
                        }}>✎ Éditer</button>
              )}
            </div>
            <div style={{fontSize:12.5, lineHeight:1.6, color:'rgba(255,255,255,0.88)'}}>
              {(info.opponent?.name || info.opponent?.city) && (
                <div>⚽ <b>{[info.opponent.name, info.opponent.city].filter(Boolean).join(' · ')}</b></div>
              )}
              {(info.stadium?.name || info.stadium?.address) && (
                <div>🏟️ {info.stadium.name}{info.stadium.address ? <span style={{opacity:.7}}> — {info.stadium.address}</span> : null}</div>
              )}
              {(info.arrival || info.kickoff) && (
                <div style={{display:'flex', gap:14, flexWrap:'wrap', marginTop:2}}>
                  {info.arrival && <span>🕐 RDV vestiaire <b>{info.arrival}</b></span>}
                  {info.kickoff && <span>⚽ Coup d'envoi <b>{info.kickoff}</b></span>}
                </div>
              )}
              {info.carpool?.enabled && (info.carpool.place || info.carpool.time) && (
                <div style={{marginTop:4, color:'#c8f169'}}>
                  🚗 Covoit. {info.carpool.time && <>à <b>{info.carpool.time}</b> </>}
                  {info.carpool.place && <>depuis <b>{info.carpool.place}</b></>}
                </div>
              )}
              {info.notes && (
                <div style={{marginTop:6, padding:'6px 8px', background:'rgba(255,255,255,0.04)',
                             borderRadius:6, fontStyle:'italic', color:'rgba(255,255,255,0.75)', fontSize:11.5}}>
                  {info.notes}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {(() => {
        // Toute la mécanique convocation (stats, suivi présences, listes
        // titulaires/banc/réserve, statuts) n'a de SENS que si un vrai match
        // est programmé. Sans match, on masque pour éviter les fausses
        // interactions (statuts "?" résiduels, relances sur 0 parents, etc.).
        const _isPlaceholderMatch = !!(next && (next.noUpcoming || !next.away || next.away === 'À déterminer'));
        if (_isPlaceholderMatch) {
          return (
            <div style={{
              margin:'20px 14px', padding:'24px 16px', textAlign:'center',
              background:'rgba(255,255,255,0.03)',
              border:'1px dashed rgba(255,255,255,0.12)',
              borderRadius:14,
            }}>
              <div style={{fontSize:36, marginBottom:8}}>📅</div>
              <div style={{fontSize:14, fontWeight:800, color:'#fff', marginBottom:6}}>
                Aucun match à préparer
              </div>
              <div style={{fontSize:12, lineHeight:1.5, color:'rgba(255,255,255,0.65)'}}>
                Convocations, statuts de présence et relances WhatsApp
                s'activeront dès qu'un match sera programmé.
                {canEdit && <><br/>Utilise le bouton 🤝 ci-dessus pour créer un match amical.</>}
              </div>
            </div>
          );
        }
        return (<>
      <div className="cv-stats">
        <div className="cv-stat"><b className="num">{starterPlayers.length}</b><em>Titulaires</em></div>
        <div className={`cv-stat ${benchPlayers.length >= BENCH_MAX ? 'cv-stat-full' : ''}`}>
          <b className="num">{benchPlayers.length}<span className="cv-stat-max">/{BENCH_MAX}</span></b>
          <em>Banc</em>
        </div>
        {canEdit && <div className="cv-stat warn"><b className="num">{absentEntries.length}</b><em>Absents</em></div>}
      </div>

      {/* Suivi présences — RÉSERVÉ AUX COACHS (info pilotage). Parent/joueur/
          lecteur n'ont pas à voir 'X parents pas répondu' ni la relance groupée. */}
      {canEdit && (
      <div className="cv-parent-bar" style={{
        margin:"8px 14px 14px", padding:"12px 14px",
        background:"rgba(200,241,105,0.06)", borderRadius:12, border:"1px solid rgba(200,241,105,0.18)",
      }}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:12}}>
          <span style={{fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", opacity:0.85}}>
            Suivi présences
          </span>
          <span style={{display:"flex", gap:10, fontSize:13, alignItems:"center"}}>
            <span title="Présents" style={{color:"#c8f169"}}>👍 <b className="num">{respCounts.yes}</b></span>
            <span title="Absents" style={{color:"#ff8a8a"}}>👎 <b className="num">{respCounts.no}</b></span>
            <span title="Peut-être" style={{color:"#ffc788"}}>❓ <b className="num">{respCounts.may}</b></span>
            <span style={{opacity:0.4}}>·</span>
            <span title="Total répondu">
              <b className="num">{totalResponded}</b>
              <span style={{opacity:0.5}}>/{convocPlayers.length}</span>
            </span>
          </span>
        </div>
        {/* Barre de progression */}
        <div style={{
          marginTop:8, height:6, borderRadius:3,
          background:"rgba(255,255,255,0.08)", overflow:"hidden",
        }}>
          <div style={{
            width: `${responseRate}%`, height:"100%",
            background: responseRate >= 80 ? "#c8f169" : responseRate >= 50 ? "#ffc788" : "#ff8a8a",
            transition:"width .3s",
          }}/>
        </div>
        <div style={{marginTop:6, fontSize:11, opacity:0.65}}>
          {responseRate}% des parents ont répondu
          {pendingPlayers.length > 0 && (
            <span style={{marginLeft:8, color:"#ffc788"}}>
              · {pendingPlayers.length} à relancer (boutons 💬 sur les lignes ci-dessous)
            </span>
          )}
        </div>
        {/* Relance groupée — toujours accessible quand il reste des non-répondants */}
        {pendingPlayers.length > 0 && (
          <button
            onClick={openRelanceAll}
            style={{
              marginTop:10, width:"100%", padding:"8px 12px", borderRadius:8,
              background:"rgba(200,241,105,0.10)", color:"#c8f169",
              border:"1px solid rgba(200,241,105,0.30)",
              fontSize:11.5, fontWeight:700, cursor:"pointer",
              letterSpacing:"0.04em",
            }}>
            📣 Relance groupée des {pendingPlayers.length} parent{pendingPlayers.length > 1 ? 's' : ''} (message copié + page partage)
          </button>
        )}
        {pendingPlayers.length === 0 && convocPlayers.length > 0 && (
          <div style={{
            marginTop:10, padding:"8px 10px", borderRadius:8,
            background:"rgba(200,241,105,0.10)", border:"1px solid rgba(200,241,105,0.25)",
            fontSize:12, color:"#c8f169", fontWeight:700, textAlign:"center",
          }}>
            ✓ Tous les parents ont répondu
          </div>
        )}
      </div>
      )}

      {/* Bandeau Compo type vs Convocation match — RÉSERVÉ AUX COACHS.
          Info technique (pilotage compo). Parent/joueur/lecteur ne voient pas. */}
      {canEdit && (
      <div style={{
        margin:"0 14px 12px", padding:"10px 12px",
        background: conv.hasMatchOverlay ? "rgba(249,115,22,0.08)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${conv.hasMatchOverlay ? "rgba(249,115,22,0.35)" : "rgba(255,255,255,0.08)"}`,
        borderRadius:10, display:"flex", justifyContent:"space-between", alignItems:"center",
        fontSize:12, gap:10,
      }}>
        <span style={{flex:1, lineHeight:1.35}}>
          {conv.hasMatchOverlay ? (
            <><b style={{color:"#f97316"}}>Convocation adaptée pour ce match</b> — la compo type de la saison n'est pas modifiée.</>
          ) : (
            <><b style={{opacity:0.85}}>Source : compo type</b> — toute modif ci-dessous créera une convoc spécifique à ce match.</>
          )}
        </span>
        {canEdit && conv.hasMatchOverlay && (
          <button
            onClick={() => {
              if (!window.CDD_CONVOC || !teamId) return;
              if (!confirm("Réinitialiser la convocation depuis la compo type ?\n\nToutes les adaptations spécifiques à ce match seront perdues.")) return;
              window.CDD_CONVOC.resetToTemplate(conv.matchId, teamId);
            }}
            style={{
              padding:"6px 10px", borderRadius:8, cursor:"pointer",
              background:"rgba(255,255,255,0.06)", color:"#fff",
              border:"1px solid rgba(255,255,255,0.18)", fontSize:11, fontWeight:700,
              whiteSpace:"nowrap", flexShrink:0,
            }}
            title="Supprime l'overlay match — repart de la compo type">
            ↻ Réinit. compo type
          </button>
        )}
      </div>
      )}

      {/* Warnings convoc (#33) — 11 titulaires + taille atteinte */}
      {conv.warnings && conv.warnings.length > 0 && (
        <div style={{margin:'0 14px 14px'}}>
          {conv.warnings.map((w, i) => (
            <div key={i} style={{
              padding:'10px 12px',
              marginBottom: 8,
              background: w.level === 'error' ? 'rgba(255,80,80,.12)' : 'rgba(255,170,40,.12)',
              border: '1px solid ' + (w.level === 'error' ? 'rgba(255,80,80,.35)' : 'rgba(255,170,40,.35)'),
              borderRadius: 10,
              fontSize: 13,
              color: w.level === 'error' ? '#ff9a9a' : '#ffc788',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{fontSize:18}}>{w.level === 'error' ? '⚠️' : '🟧'}</span>
              <span style={{flex:1, fontWeight:600}}>{w.text}</span>
            </div>
          ))}
        </div>
      )}

      <div className="cv-sec">
        <div className="cv-sec-h">
          <span className="cv-sec-k">TITULAIRES · {starterPlayers.length}</span>
          <span className="cv-sec-d">Heure : 09h45 · vestiaire</span>
        </div>
        <div className="cv-list">
          {sortByNum(starterPlayers).map(p => (
            <div className="cv-row cv-row-clickable" key={p.id}
                 onClick={() => setFicheModalPlayer(p)}
                 title="Toucher pour voir la fiche du joueur">
              {renderAvatar(p)}
              <span className="cv-num num">#{displayNum(p)}</span>
              <span className="cv-name">
                <span className="cv-first">{p.first}</span>
                {p.last && <span className="cv-last">{p.last.toUpperCase()}</span>}
                {respCell(p)}
              </span>
              <span className="cv-pos">{POSITION_LABEL[p.pos]||p.pos}</span>
              {canEdit && (
                <button className="cv-action"
                        onClick={(e) => { e.stopPropagation(); setSwapModal({player:p, role:'starter'}); }}
                        title="Changer ce titulaire (choisir un remplaçant)"
                        style={{fontSize:14}}>↔</button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="cv-sec">
        <div className="cv-sec-h">
          <span className="cv-sec-k">REMPLAÇANTS · {benchPlayers.length}</span>
        </div>
        <div className="cv-list">
          {sortByNum(benchPlayers).map(p => (
            <div className="cv-row cv-row-clickable" key={p.id}
                 onClick={() => setFicheModalPlayer(p)}
                 title="Toucher pour voir la fiche du joueur">
              {renderAvatar(p)}
              <span className="cv-num num">#{displayNum(p)}</span>
              <span className="cv-name">
                <span className="cv-first">{p.first}</span>
                {p.last && <span className="cv-last">{p.last.toUpperCase()}</span>}
                {respCell(p)}
              </span>
              <span className="cv-pos">{POSITION_LABEL[p.pos]||p.pos}</span>
              {canEdit && (
                <button className="cv-action"
                        onClick={(e) => { e.stopPropagation(); setSwapModal({player:p, role:'bench'}); }}
                        title="Changer ce remplaçant (choisir un joueur de la réserve)"
                        style={{fontSize:14}}>↔</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {canEdit && <div className="cv-sec">
        <div className="cv-sec-h">
          <span className="cv-sec-k abs">ABSENTS · {absentEntries.length}</span>
        </div>
        <div className="cv-list">
          {absentEntries.length === 0 ? (
            <div className="cv-empty" style={{padding:'12px 14px', opacity:.6, fontSize:13}}>
              Aucun absent — personne en blessé / suspendu / indisponible.
            </div>
          ) : sortAbsentByNum(absentEntries).map((a,i) => a.p && (
            <div className="cv-row abs cv-row-clickable" key={i}>
              {renderAvatar(a.p)}
              <span className="cv-num num"
                    onClick={() => setFicheModalPlayer(a.p)}
                    style={{cursor:'pointer'}}>#{displayNum(a.p)}</span>
              <span className="cv-name"
                    onClick={() => setFicheModalPlayer(a.p)}
                    style={{cursor:'pointer'}}>
                <span className="cv-first">{a.p.first}</span>
                {a.p.last && <span className="cv-last">{a.p.last.toUpperCase()}</span>}
                {a.note && <em> — {a.note}</em>}
              </span>
              {/* #44 — Badge statut : cliquable seulement si le rôle peut éditer */}
              {canEdit ? (
                <button
                  onClick={(e) => { e.stopPropagation(); setStatusPickerPlayer(a.p); }}
                  title="Modifier le statut"
                  style={{
                    background:'rgba(255,170,40,.14)',
                    border:'1px solid rgba(255,170,40,.4)',
                    color:'#ffc788', fontWeight:700, fontSize:11,
                    padding:'4px 10px', borderRadius:6,
                    cursor:'pointer', marginRight:6,
                  }}>
                  {a.reason} ✎
                </button>
              ) : (
                <span style={{
                  background:'rgba(255,170,40,.10)', border:'1px solid rgba(255,170,40,.3)',
                  color:'#ffc788', fontWeight:700, fontSize:11,
                  padding:'4px 10px', borderRadius:6, marginRight:6,
                }}>{a.reason}</span>
              )}
              {/* Bouton + pour CONVOQUER quand meme malgre indispo — capacité 'compo' */}
              {canEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.CDD_CONVOC && window.CDD_CONVOC.addToConvoc && teamId) {
                      window.CDD_CONVOC.addToConvoc(teamId, a.p.id, 'bench');
                    }
                  }}
                  title="Convoquer quand meme (indispo overridable)"
                  style={{
                    background:'rgba(200,241,105,.14)',
                    border:'1px solid rgba(200,241,105,.4)',
                    color:'#c8f169', fontWeight:800, fontSize:12,
                    width:28, height:28, borderRadius:7,
                    cursor:'pointer',
                  }}>+</button>
              )}
            </div>
          ))}
        </div>
      </div>}

      {canEdit && reservePlayers.length > 0 && (
        <div className="cv-sec">
          <div className="cv-sec-h">
            <span className="cv-sec-k">DISPONIBLES NON CONVOQUÉS · {reservePlayers.length}</span>
            <span className="cv-sec-d">
              {benchPlayers.length >= BENCH_MAX
                ? `Banc plein (${BENCH_MAX}/${BENCH_MAX}) — retire un remplaçant pour ajouter`
                : `Banc ${benchPlayers.length}/${BENCH_MAX} — touche le + pour ajouter`}
            </span>
          </div>
          <div className="cv-list">
            {sortByNum(reservePlayers).map(p => {
              const isReserveTeam = p.status === 'reserve';
              return (
                <div className="cv-row cv-row-add cv-row-clickable" key={p.id}
                     onClick={() => setFicheModalPlayer(p)}
                     title={isReserveTeam ? "Joueur de l'équipe 2 — touche pour voir la fiche" : "Toucher pour voir la fiche du joueur"}
                     style={isReserveTeam ? {opacity:0.85, borderLeft:'3px solid rgba(125,211,252,0.45)'} : null}>
                  {renderAvatar(p)}
                  <span className="cv-num num">#{displayNum(p)}</span>
                  <span className="cv-name">
                    <span className="cv-first">{p.first}</span>
                    {p.last && <span className="cv-last">{p.last.toUpperCase()}</span>}
                    {isReserveTeam && (
                      <span style={{
                        fontSize:9, fontWeight:800, letterSpacing:'.06em',
                        padding:'2px 6px', borderRadius:5, marginLeft:6,
                        background:'rgba(125,211,252,0.14)', color:'#7dd3fc',
                        border:'1px solid rgba(125,211,252,0.35)',
                        textTransform:'uppercase', whiteSpace:'nowrap',
                      }} title="Joueur réserve / équipe 2">Équipe 2</span>
                    )}
                  </span>
                  <span className="cv-pos">{POSITION_LABEL[p.pos]||p.pos}</span>
                  {canEdit && (
                    <button className={`cv-action cv-action-add ${benchPlayers.length >= BENCH_MAX ? 'cv-action-disabled' : ''}`}
                            disabled={benchPlayers.length >= BENCH_MAX}
                            onClick={(e) => { e.stopPropagation(); addPlayer(p.id); }}
                            title={benchPlayers.length >= BENCH_MAX ? `Banc plein (${BENCH_MAX}/${BENCH_MAX})` : (isReserveTeam ? "Convoquer ce joueur de l'équipe 2" : "Ajouter à la convocation")}>+</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
        </>);
      })()}

      {/* Modale "Remplacer" : le coach choisit explicitement qui descend ↔ qui monte.
          Ouverte au clic sur le bouton ↔ d'un titulaire ou d'un remplaçant. */}
      {swapModal && (() => {
        const out = swapModal.player;
        const isStarter = swapModal.role === 'starter';
        // Candidats pour entrer à la place :
        // - Si out=titulaire → candidats = remplaçants actuels (+ option "retirer")
        // - Si out=remplaçant → candidats = joueurs de la réserve (+ option "retirer")
        const candidates = isStarter
          ? sortByNum(benchPlayers)
          : sortByNum(reservePlayers);
        const sectionLabel = isStarter ? 'Promouvoir un REMPLAÇANT' : 'Faire monter de la RÉSERVE';
        return (
          <div className="fi-sp-overlay" onClick={() => setSwapModal(null)}>
            <div className="fi-sp-sheet" onClick={e => e.stopPropagation()}
                 style={{maxWidth:420, maxHeight:'80vh', overflow:'auto'}}>
              <div className="fi-sp-h">
                <span className="fi-sp-t">
                  REMPLACER {(out.first||'').toUpperCase()} {(out.last||'').toUpperCase()}
                </span>
                <button className="fi-sp-x" onClick={() => setSwapModal(null)}>✕</button>
              </div>
              <div style={{padding:'8px 14px', fontSize:12, opacity:0.7}}>
                {isStarter
                  ? `${out.first} part au banc. Choisis qui prend sa place de titulaire :`
                  : `${out.first} sort de la convocation. Choisis qui prend sa place au banc :`}
              </div>
              {candidates.length === 0 ? (
                <div style={{padding:'20px 14px', textAlign:'center', opacity:0.6, fontSize:13}}>
                  Aucun joueur disponible {isStarter ? 'sur le banc' : 'en réserve'}.
                </div>
              ) : (
                <>
                  <div style={{
                    padding:'8px 14px', fontSize:10.5, fontWeight:800,
                    letterSpacing:'.08em', opacity:0.5, textTransform:'uppercase',
                  }}>{sectionLabel} · {candidates.length}</div>
                  <div className="cv-list" style={{padding:'0 8px 8px'}}>
                    {candidates.map(c => (
                      <button key={c.id} type="button"
                        onClick={() => doSwap(out.id, c.id)}
                        style={{
                          display:'flex', alignItems:'center', gap:10,
                          width:'100%', padding:'10px 12px', borderRadius:8,
                          background:'rgba(255,255,255,0.04)',
                          border:'1px solid rgba(255,255,255,0.08)',
                          color:'#fff', fontFamily:'inherit', cursor:'pointer',
                          marginBottom:4, textAlign:'left',
                        }}>
                        <span className="cv-num num">#{displayNum(c)}</span>
                        <span style={{flex:1, fontSize:13}}>
                          <b>{c.first}</b> {c.last && c.last.toUpperCase()}
                        </span>
                        <span className="cv-pos">{POSITION_LABEL[c.pos]||c.pos}</span>
                        <span style={{color:'#c8f169', fontSize:14, fontWeight:800}}>↑</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
              <div style={{
                padding:'10px 14px', borderTop:'1px solid rgba(255,255,255,0.08)',
                display:'flex', gap:8,
              }}>
                <button type="button"
                  onClick={() => setSwapModal(null)}
                  style={{
                    flex:1, padding:'10px', borderRadius:8,
                    background:'rgba(255,255,255,0.06)',
                    border:'1px solid rgba(255,255,255,0.12)',
                    color:'#fff', fontFamily:'inherit', cursor:'pointer',
                    fontSize:13, fontWeight:700,
                  }}>Annuler</button>
                <button type="button"
                  onClick={() => {
                    setSwapModal(null);
                    removePlayer(out.id);
                  }}
                  style={{
                    flex:1, padding:'10px', borderRadius:8,
                    background:'rgba(239,68,68,0.12)',
                    border:'1px solid rgba(239,68,68,0.4)',
                    color:'#fca5a5', fontFamily:'inherit', cursor:'pointer',
                    fontSize:13, fontWeight:700,
                  }}>Retirer sans remplacer</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* #44 Picker statut rapide */}
      {statusPickerPlayer && (
        <div className="fi-sp-overlay" onClick={() => setStatusPickerPlayer(null)}>
          <div className="fi-sp-sheet" onClick={e => e.stopPropagation()}>
            <div className="fi-sp-h">
              <span className="fi-sp-t">STATUT DE {(statusPickerPlayer.first||'').toUpperCase()}</span>
              <button className="fi-sp-x" onClick={() => setStatusPickerPlayer(null)}>✕</button>
            </div>
            <div className="fi-sp-list">
              {STATUS_QUICK.map(s => (
                <button key={s.id}
                  className={`fi-sp-opt fi-sp-opt-${s.cls}`}
                  onClick={() => {
                    const target = statusPickerPlayer;
                    if (window.CDD_COACH && window.CDD_COACH.setStatusOverride) {
                      window.CDD_COACH.setStatusOverride(target.id, s.id);
                    }
                    setStatusPickerPlayer(null);
                    // Enchaîner sur la modale détail si pertinent (sinon clôturer le meta)
                    if (window.CDD_STATUS_DETAIL?.needsDetail(s.id)) {
                      setStatusDetailFor({ player: target, statusId: s.id });
                    } else {
                      window.CDD_STATUS_DETAIL?.clearMeta(target.id);
                    }
                  }}>
                  <span className="fi-sp-l">{s.l}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Status detail modal (questions par statut) */}
      {statusDetailFor && window.CDD_STATUS_DETAIL?.Component && (
        <window.CDD_STATUS_DETAIL.Component
          statusId={statusDetailFor.statusId}
          player={statusDetailFor.player}
          onClose={() => setStatusDetailFor(null)}
        />
      )}

      {/* #49 — Modale fiche joueur en popup (reste sur la page Convocations en arrière-plan) */}
      {ficheModalPlayer && (
        <PlayerFicheModal
          player={ficheModalPlayer}
          onClose={() => setFicheModalPlayer(null)}
          onOpenFull={() => {
            const p = ficheModalPlayer;
            setFicheModalPlayer(null);
            go("fiche", p);
          }}
        />
      )}

      {/* Modale infos pratiques du match (stade, horaires, covoiturage…) */}
      {matchInfoOpen && window.MatchInfoModal && (
        <window.MatchInfoModal
          teamId={teamId}
          matchId={(window.CDD_NEXT_MATCH && window.CDD_NEXT_MATCH.id) || 'placeholder'}
          matchLabel={`${next.home || ''} vs ${next.away || 'À déterminer'} · ${next.date || ''}`}
          onClose={() => setMatchInfoOpen(false)}
        />
      )}

      {/* Modale création/édition d'un match amical */}
      {friendlyModalMode && window.FriendlyMatchModal && teamId && (
        <window.FriendlyMatchModal
          teamId={teamId}
          clubId={window.CDD?.getActiveTeam?.()?.clubId || null}
          existing={friendlyModalMode === 'edit' && next.isAmical
            ? window.CDD_FRIENDLY?.get?.(teamId, next.id)
            : null}
          onClose={() => setFriendlyModalMode(null)}
          onSaved={() => setFriendlyModalMode(null)}
        />
      )}

      {/* Modale numéros maillots (édition ou vérif pré-match) */}
      {jerseyModalMode && window.JerseyNumbersModal && (
        <window.JerseyNumbersModal
          teamId={teamId}
          matchId={(window.CDD_NEXT_MATCH && window.CDD_NEXT_MATCH.id) || 'placeholder'}
          players={[...starterPlayers, ...benchPlayers]}
          title={jerseyModalMode === 'pre-match' ? '🔢 NUMÉROS · AVANT COUP D\'ENVOI' : '🔢 NUMÉROS DU MATCH'}
          subtitle={jerseyModalMode === 'pre-match'
            ? <>Vérifie les numéros que portent réellement tes joueurs aujourd'hui. Les changements ne s'appliquent qu'à <b>ce match</b>.</>
            : null}
          confirmLabel={jerseyModalMode === 'pre-match' ? '✓ LANCER LE MATCH' : '💾 Enregistrer'}
          showSkip={jerseyModalMode === 'pre-match'}
          onClose={() => setJerseyModalMode(null)}
          onConfirm={() => {
            const mode = jerseyModalMode;
            setJerseyModalMode(null);
            if (mode === 'pre-match') {
              // Rebuild puis lancement du match : les tokens auront les bons numéros.
              if (window.CDD_REBUILD) window.CDD_REBUILD();
              setTimeout(() => go('match'), 100);
            }
          }}
        />
      )}

      {/* #51 — Toast banc plein (auto-hide après 2.6s) */}
      {benchFullToast && (
        <div className="cv-toast cv-toast-warn">
          <span className="cv-toast-ic">⚠</span>
          <span>Banc plein — {BENCH_MAX} remplaçants max. Retire-en un pour ajouter.</span>
        </div>
      )}

    </div>
  );
}

window.ScreenConvocations = ScreenConvocations;
