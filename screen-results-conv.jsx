/* global React, CDD_STANDINGS, CDD_TOP_SCORERS, CDD_LAST_MATCHES, CDD_CLUB, CDD_CONVO, CDD_PLAYERS, CDD_NEXT_MATCH, FutCard, POSITION_LABEL */

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
  const absentEntries = conv.absent.map(a => ({
    p: CDD_PLAYERS.find(p=>p.id===a.id),
    ...a,
  }));

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
          <div className="cv-hero-share">
            <button className="btn-cta">
              ↗ PARTAGER AUX PARENTS
            </button>
          </div>
        </div>
      </div>

      <div className="cv-stats">
        <div className="cv-stat"><b className="num">{starterPlayers.length}</b><em>Titulaires</em></div>
        <div className="cv-stat"><b className="num">{benchPlayers.length}</b><em>Remplaçants</em></div>
        <div className="cv-stat warn"><b className="num">{absentEntries.length}</b><em>Absents</em></div>
        <div className="cv-stat"><b className="mono">{conv.shareCode.slice(-4)}</b><em>code</em></div>
      </div>

      <div className="cv-sec">
        <div className="cv-sec-h">
          <span className="cv-sec-k">TITULAIRES · {starterPlayers.length}</span>
          <span className="cv-sec-d">Heure : 09h45 · vestiaire</span>
        </div>
        <div className="cv-list">
          {starterPlayers.map(p => (
            <div className="cv-row" key={p.id}>
              <span className="cv-num num">#{p.num}</span>
              <span className="cv-name">{p.first} <b>{p.last}</b></span>
              <span className="cv-pos">{POSITION_LABEL[p.pos]||p.pos}</span>
              <span className="cv-check on">✓</span>
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
            <div className="cv-row" key={p.id}>
              <span className="cv-num num">#{p.num}</span>
              <span className="cv-name">{p.first} <b>{p.last}</b></span>
              <span className="cv-pos">{POSITION_LABEL[p.pos]||p.pos}</span>
              <span className="cv-check on">✓</span>
            </div>
          ))}
        </div>
      </div>

      <div className="cv-sec">
        <div className="cv-sec-h">
          <span className="cv-sec-k abs">ABSENTS · {absentEntries.length}</span>
        </div>
        <div className="cv-list">
          {absentEntries.map((a,i) => a.p && (
            <div className="cv-row abs" key={i}>
              <span className="cv-num num">#{a.p.num}</span>
              <span className="cv-name">{a.p.first} <b>{a.p.last}</b><em>{a.note}</em></span>
              <span className="cv-pos abs-reason">{a.reason}</span>
              <span className="cv-check abs">✕</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

window.ScreenConvocations = ScreenConvocations;
