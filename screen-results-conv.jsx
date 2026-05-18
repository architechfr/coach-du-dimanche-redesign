/* global React, CDD_STANDINGS, CDD_TOP_SCORERS, CDD_LAST_MATCHES, CDD_CLUB, CDD_CONVO, CDD_PLAYERS, CDD_NEXT_MATCH, FutCard, POSITION_LABEL */

// #45 — W/L/D anglais -> V/N/D francais
function mapResultFR(r) {
  if (r === 'W') return 'V';
  if (r === 'D') return 'N';
  if (r === 'L') return 'D';
  return r || '?';
}

/* ============================================================
   SCREEN — Résultats / Championship
   ============================================================ */

function ScreenResults({ go, tweaks }) {
  const [tab, setTab] = useState("classement");
  const [, forceUpdate] = useState({});

  // Re-render when FFF data lands
  useEffect(() => {
    const handler = () => forceUpdate({});
    window.addEventListener('cdd-fff-loaded', handler);
    window.addEventListener('cdd-fff-loading', handler);
    window.addEventListener('cdd-fff-error', handler);
    return () => {
      window.removeEventListener('cdd-fff-loaded', handler);
      window.removeEventListener('cdd-fff-loading', handler);
      window.removeEventListener('cdd-fff-error', handler);
    };
  }, []);

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
          <div className="rs-hero-sub">
            {CDD_CLUB.name} {CDD_CLUB.rank ? <>· {CDD_CLUB.rank}<sup>e</sup> · {CDD_CLUB.pts} pts</> : <></>}
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
                          <span className={`rs-jrn-result rs-${m.result.toLowerCase()}`}>{mapResultFR(m.result)}</span>
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
    </div>
  );
}

window.ScreenResults = ScreenResults;


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
  const STATUS_QUICK = (window.CDD_COACH && window.CDD_COACH.STATUS_OPTIONS) || [];

  // ─── Picker taille convoc (14 / 16 / 18 / 20 / libre) ───
  const [showSizePicker, setShowSizePicker] = useState(false);
  const teamId = window.CDD?.getActiveTeam?.()?.id;
  const currentSize = conv.convocCount;
  const setSize = (n) => {
    if (!teamId || !window.CDD_CONVOC) return;
    window.CDD_CONVOC.setSize(teamId, n);
    setShowSizePicker(false);
  };
  const addPlayer = (pid) => {
    if (!teamId || !window.CDD_CONVOC) return;
    window.CDD_CONVOC.addToConvoc(teamId, pid, 'bench');
  };
  const removePlayer = (pid) => {
    if (!teamId || !window.CDD_CONVOC) return;
    if (!confirm('Retirer ce joueur de la convocation ?')) return;
    window.CDD_CONVOC.removeFromConvoc(teamId, pid);
  };

  // --- Live réponses parents (Firestore via cddSync) ---
  const matchId = (typeof window.cddSync !== 'undefined' && window.cddSync.matchId) || 'demo';
  const [parentResponses, setParentResponses] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`cdd_v2_convoc_${matchId}`) || '{}'); }
    catch (e) { return {}; }
  });
  useEffect(() => {
    if (!window.cddSync?.watchConvocResponses) return;
    const unsubscribe = window.cddSync.watchConvocResponses(matchId, (responses) => {
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
  const respCounts = Object.values(parentResponses).reduce((acc, r) => {
    if (r?.resp === 'yes') acc.yes++;
    else if (r?.resp === 'no') acc.no++;
    else if (r?.resp === 'may') acc.may++;
    return acc;
  }, { yes:0, no:0, may:0 });
  const totalResponded = respCounts.yes + respCounts.no + respCounts.may;

  return (
    <div className="scr scr-conv fade-in" data-screen-label="07 Convocations">

      <div className="cv-hero">
        <div className="cv-hero-bg"/>
        <div className="cv-hero-grad"/>
        <div className="cv-hero-in">
          <div className="cv-hero-k">FEUILLE DE CONVOCATION</div>
          <div className="cv-hero-title">{next.home}<br/>VS {next.away}</div>
          <div className="cv-hero-meta">
            <span>📅 {next.date}</span>
            <span>🏟️ {next.venue}</span>
          </div>
          <div className="cv-hero-share" style={{display:'flex', gap:8}}>
            <button className="btn-cta" onClick={() => go("share")}>
              ↗ PARTAGER AUX PARENTS
            </button>
            <button className="btn-cta" onClick={() => go("tv")}
                    style={{background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.14)'}}>
              📺 PRÉSENTATION TV
            </button>
          </div>
        </div>
      </div>

      <div className="cv-stats">
        <div className="cv-stat"><b className="num">{starterPlayers.length}</b><em>Titulaires</em></div>
        <div className="cv-stat"><b className="num">{benchPlayers.length}</b><em>Remplaçants</em></div>
        <div className="cv-stat warn"><b className="num">{absentEntries.length}</b><em>Absents</em></div>
        <button className="cv-stat cv-stat-btn" onClick={() => setShowSizePicker(true)}
                title="Régler la taille de la convocation">
          <b className="num">{currentSize === null ? '∞' : currentSize}</b>
          <em>Taille ✎</em>
        </button>
      </div>

      {showSizePicker && (
        <div className="fi-sp-overlay" onClick={() => setShowSizePicker(false)}>
          <div className="fi-sp-sheet" onClick={e => e.stopPropagation()}>
            <div className="fi-sp-h">
              <span className="fi-sp-t">TYPE DE MATCH · TAILLE CONVOC</span>
              <button className="fi-sp-x" onClick={() => setShowSizePicker(false)}>✕</button>
            </div>
            <div className="fi-sp-list">
              {[
                { n: 14, ic: '🏆', label: 'Championnat', sub: '11 titulaires + 3 remplaçants' },
                { n: 16, ic: '🤝', label: 'Amical',      sub: '11 titulaires + 5 remplaçants' },
                { n: 15, ic: '🏟️', label: 'Coupe',       sub: '11 titulaires + 4 remplaçants' },
                { n: 18, ic: '🎯', label: 'Tournoi',     sub: '11 titulaires + 7 remplaçants' },
                { n: 20, ic: '🎉', label: 'Grand match', sub: '11 titulaires + 9 remplaçants' },
                { n: null, ic: '♾', label: 'Illimitée',  sub: 'Tous les disponibles' },
              ].map(opt => (
                <button key={String(opt.n)}
                  className={`fi-sp-opt ${currentSize===opt.n?'on':''}`}
                  onClick={() => setSize(opt.n)}>
                  <span className="fi-sp-l" style={{display:'flex', alignItems:'center', gap:10}}>
                    <span style={{fontSize:20}}>{opt.ic}</span>
                    <span style={{flex:1, textAlign:'left'}}>
                      <div style={{fontWeight:700}}>{opt.label}</div>
                      <div style={{fontSize:11, opacity:.7}}>{opt.sub}</div>
                    </span>
                  </span>
                  {currentSize === opt.n && <span className="fi-sp-tick">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Réponses parents live (Firestore) */}
      <div className="cv-parent-bar" style={{
        margin:"8px 14px 14px", padding:"10px 12px",
        background:"rgba(200,241,105,0.06)", borderRadius:10, border:"1px solid rgba(200,241,105,0.18)",
        display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:12
      }}>
        <span style={{fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", opacity:0.8}}>
          Réponses parents
        </span>
        <span style={{display:"flex", gap:12, fontSize:13}}>
          <span title="Présents">👍 <b className="num">{respCounts.yes}</b></span>
          <span title="Absents">👎 <b className="num">{respCounts.no}</b></span>
          <span title="Peut-être">❓ <b className="num">{respCounts.may}</b></span>
          <span style={{opacity:0.5}}>·</span>
          <span title="Total répondu">
            <b className="num">{totalResponded}</b>
            <span style={{opacity:0.5}}>/{starterPlayers.length + benchPlayers.length}</span>
          </span>
        </span>
      </div>

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
          {starterPlayers.map(p => (
            <div className="cv-row cv-row-clickable" key={p.id}
                 onClick={() => go("fiche", p)}
                 title="Toucher pour modifier le profil / statut">
              <span className="cv-num num">#{p.num}</span>
              <span className="cv-name"><b>{p.first}</b> {(p.last || '').toUpperCase()}{respBadge(p.id)}</span>
              <span className="cv-pos">{POSITION_LABEL[p.pos]||p.pos}</span>
              <button className="cv-action"
                      onClick={(e) => { e.stopPropagation(); removePlayer(p.id); }}
                      title="Retirer de la convocation">−</button>
            </div>
          ))}
        </div>
      </div>

      <div className="cv-sec">
        <div className="cv-sec-h">
          <span className="cv-sec-k">REMPLAÇANTS · {benchPlayers.length}</span>
        </div>
        <div className="cv-list">
          {benchPlayers.map(p => (
            <div className="cv-row cv-row-clickable" key={p.id}
                 onClick={() => go("fiche", p)}
                 title="Toucher pour modifier le profil / statut">
              <span className="cv-num num">#{p.num}</span>
              <span className="cv-name"><b>{p.first}</b> {(p.last || '').toUpperCase()}{respBadge(p.id)}</span>
              <span className="cv-pos">{POSITION_LABEL[p.pos]||p.pos}</span>
              <button className="cv-action"
                      onClick={(e) => { e.stopPropagation(); removePlayer(p.id); }}
                      title="Retirer de la convocation">−</button>
            </div>
          ))}
        </div>
      </div>

      <div className="cv-sec">
        <div className="cv-sec-h">
          <span className="cv-sec-k abs">ABSENTS · {absentEntries.length}</span>
        </div>
        <div className="cv-list">
          {absentEntries.length === 0 ? (
            <div className="cv-empty" style={{padding:'12px 14px', opacity:.6, fontSize:13}}>
              Aucun absent — personne en blessé / suspendu / indisponible.
            </div>
          ) : absentEntries.map((a,i) => a.p && (
            <div className="cv-row abs cv-row-clickable" key={i}>
              <span className="cv-num num"
                    onClick={() => go("fiche", a.p)}
                    style={{cursor:'pointer'}}>#{a.p.num}</span>
              <span className="cv-name"
                    onClick={() => go("fiche", a.p)}
                    style={{cursor:'pointer'}}>
                <b>{a.p.first}</b> {(a.p.last || '').toUpperCase()}
                {a.note && <em> — {a.note}</em>}
              </span>
              {/* #44 — Badge statut CLIQUABLE pour changer rapidement */}
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
              {/* Bouton + pour CONVOQUER quand meme malgre indispo */}
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
            </div>
          ))}
        </div>
      </div>

      {reservePlayers.length > 0 && (
        <div className="cv-sec">
          <div className="cv-sec-h">
            <span className="cv-sec-k">DISPONIBLES NON CONVOQUÉS · {reservePlayers.length}</span>
            <span className="cv-sec-d">Touche le + pour ajouter à la convoc</span>
          </div>
          <div className="cv-list">
            {reservePlayers.map(p => (
              <div className="cv-row cv-row-add cv-row-clickable" key={p.id}
                   onClick={() => go("fiche", p)}
                   title="Toucher pour voir le profil">
                <span className="cv-num num">#{p.num}</span>
                <span className="cv-name"><b>{p.first}</b> {(p.last || '').toUpperCase()}</span>
                <span className="cv-pos">{POSITION_LABEL[p.pos]||p.pos}</span>
                <button className="cv-action cv-action-add"
                        onClick={(e) => { e.stopPropagation(); addPlayer(p.id); }}
                        title="Ajouter à la convocation">+</button>
              </div>
            ))}
          </div>
        </div>
      )}

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
                    if (window.CDD_COACH && window.CDD_COACH.setStatusOverride) {
                      window.CDD_COACH.setStatusOverride(statusPickerPlayer.id, s.id);
                    }
                    setStatusPickerPlayer(null);
                  }}>
                  <span className="fi-sp-l">{s.l}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

window.ScreenConvocations = ScreenConvocations;
