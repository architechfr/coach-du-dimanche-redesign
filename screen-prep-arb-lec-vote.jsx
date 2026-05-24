/* global React, CDD_NEXT_MATCH, CDD_PLAYERS, CDD_LAST_MATCHES, CDD_STANDINGS, CDD_CONVO, FutCard, POSITION_LABEL */

/* ============================================================
   SCREEN — Préparation match (J-7 dashboard)
   Combine: prochain match, adversaire (forme + classement),
   effectif convoqué, match aller, stats saison
   ============================================================ */

function ScreenPrep({ go, tweaks }) {
  const next = CDD_NEXT_MATCH || { date:"À venir", daysLeft:0, competition:"Championnat" };
  const standings = (typeof CDD_STANDINGS !== 'undefined' && Array.isArray(CDD_STANDINGS)) ? CDD_STANDINGS : [];
  const lastMatches = (typeof CDD_LAST_MATCHES !== 'undefined' && Array.isArray(CDD_LAST_MATCHES)) ? CDD_LAST_MATCHES : [];
  const convo = CDD_CONVO || { starters:[], bench:[], absent:[] };
  // L'adversaire du prochain match. On utilise opponentName (calculé selon
  // venue par data-bridge) ; fallback sur next.away pour la rétrocompat.
  const oppName = (() => {
    const candidate = next.opponentName
                  || (next.venue === 'Domicile' ? next.away : next.home);
    if (!candidate || candidate === 'À déterminer') return null;
    return candidate;
  })();
  const oppLogo = next.opponentLogo
              || (next.venue === 'Domicile' ? next.awayLogoDataUrl : next.homeLogoDataUrl)
              || null;
  const noUpcoming = !oppName || next.noUpcoming;
  // Cherche l'adversaire dans le classement EXACTEMENT par nom. PAS de fallback
  // sur "premier autre" : pour un amical contre une équipe hors championnat
  // (Ferrières par ex.), aucun match dans standings → on n'affiche PAS la
  // section stats. Évite le bug "Ferrières → V.F.F.A 77 par défaut".
  const opp = (oppName && !next.isAmical)
    ? (standings.find(s => s.club === oppName) || null)
    : null;
  const me  = standings.find(s => s.me) || null;
  const lastMatch = lastMatches[0] || null;
  // Match aller : on cherche un vrai match dans l'historique contre cet
  // adversaire. PAS de placeholder hardcodé (le "22/09 défaite 1-2" qui
  // dormait ici depuis le proto n'a jamais correspondu à rien de réel).
  const allerMatch = (() => {
    if (!oppName || !lastMatches.length || next.isAmical) return null;
    const found = lastMatches.find(m => {
      const matchOpp = m.opp || (m.home === (CDD_CLUB?.short || CDD_CLUB?.name) ? m.away : m.home);
      return matchOpp === oppName;
    });
    return found || null;
  })();
  const convoCount = (convo.starters?.length || 0) + (convo.bench?.length || 0);
  const absCount = convo.absent?.length || 0;

  // Convention football : le RECEVANT est toujours à gauche.
  const isHome = next.venue === 'Domicile';

  return (
    <div className="scr scr-prep fade-in" data-screen-label="10 Preparation match">

      {/* Banner */}
      <div className="prep-hero">
        <div className="prep-hero-bg"/>
        <div className="prep-hero-grad"/>
        <div className="prep-hero-in">
          <div className="prep-hero-k">PRÉPARATION · J-{next.daysLeft}</div>
          <div className="prep-hero-title">{next.competition}</div>
          {(() => {
            // Convention recevant à gauche : si on joue à domicile, "me" à
            // gauche ; sinon adversaire à gauche, "me" à droite. Les classes
            // CSS .me / .them sont conservées (logique d'identité, pas de
            // position) — la position est déterminée par l'ordre dans le DOM.
            const renderMe = (
              <span className="prep-team me">
                {window.ClubBadge ? (
                  <window.ClubBadge clubId={window.CDD?.getActiveClub?.()?.id}
                                    clubName={CDD_CLUB?.short || CDD_CLUB?.name || 'F'}
                                    colors={CDD_CLUB?.colors} size={48} shape="circle"/>
                ) : (
                  <i className="prep-badge me">{(CDD_CLUB?.short || 'F').charAt(0)}</i>
                )}
                <em>{CDD_CLUB?.short || 'MON CLUB'}</em>
              </span>
            );
            const renderOpp = (
              <span className="prep-team them">
                <em>{noUpcoming ? 'À DÉTERMINER' : oppName}</em>
                {window.ClubBadge ? (
                  <window.ClubBadge clubId={null}
                                    clubName={noUpcoming ? '?' : (oppName || '?')}
                                    colors={['#3b82f6','#fff']}
                                    forceLogo={oppLogo}
                                    size={48} shape="circle"/>
                ) : (
                  <i className="prep-badge them">{noUpcoming ? '?' : (oppName || '?').charAt(0)}</i>
                )}
              </span>
            );
            return (
              <div className="prep-hero-vs">
                {isHome ? renderMe : renderOpp}
                <span className="prep-vs-l">VS</span>
                {isHome ? renderOpp : renderMe}
              </div>
            );
          })()}
          <div className="prep-hero-when">
            <span>📅 {next.date}</span>
            <span className="sep">·</span>
            <span>🏟️ {next.venue}</span>
          </div>
        </div>
      </div>

      {/* KPI strip — cliquables (renvoient vers Convocations / Effectif filtre Infirmerie) */}
      <div className="prep-kpis">
        <button className="prep-kpi prep-kpi-btn" onClick={() => go('convocations')}
                title="Voir la convocation complete">
          <b className="num">{convoCount}</b>
          <em>Convoqués</em>
        </button>
        <button className="prep-kpi prep-kpi-btn warn"
                onClick={() => go('effectif', { statusFilter: 'unavailable' })}
                title="Ouvrir l'infirmerie">
          <b className="num">{absCount}</b>
          <em>Absents</em>
        </button>
        <button className="prep-kpi prep-kpi-btn" onClick={() => go('convocations')}
                title="Voir les titulaires">
          <b className="num">{CDD_CONVO.starters.length}</b>
          <em>Titulaires</em>
        </button>
        <div className="prep-kpi acc">
          <b>{next.daysLeft}</b>
          <em className="num">jour{next.daysLeft>1?"s":""}</em>
        </div>
      </div>

      {/* Adversaire — forme + classement, conditionnel sur opp */}
      {opp && (
        <>
          <div className="sec-h">
            <span className="t">L'adversaire · {opp.club || oppName}</span>
            {opp.rank && <span className="a">{opp.rank}<sup>e</sup> · {opp.pts||0} pts</span>}
          </div>

          <div className="prep-opp">
            <div className="prep-opp-stats">
              <div className="prep-opp-stat">
                <em>Position</em>
                <b className="num">{opp.rank || "—"}{opp.rank && <sup>e</sup>}</b>
              </div>
              <div className="prep-opp-stat">
                <em>Forme</em>
                <div className="prep-opp-form">
                  {(opp.form||[]).map((r,i) => {
                    // Traduction W/D/L (FFF) → V/N/D (FR). Classes CSS conservées sur la lettre EN
                    // (fd-w = vert, fd-d = gris/orange nul, fd-l = rouge défaite).
                    const display = r === 'W' ? 'V' : r === 'L' ? 'D' : r === 'D' ? 'N' : r;
                    return <span key={i} className={`fd fd-${String(r).toLowerCase()}`}>{display}</span>;
                  })}
                  {(!opp.form || opp.form.length === 0) && <span style={{opacity:0.5, fontSize:11}}>—</span>}
                </div>
              </div>
              <div className="prep-opp-stat">
                <em>Buts marqués</em>
                <b className="num">{opp.gf||0} <span>en {opp.pl||0}</span></b>
              </div>
              <div className="prep-opp-stat">
                <em>Buts encaissés</em>
                <b className="num">{opp.ga||0} <span>en {opp.pl||0}</span></b>
              </div>
            </div>
            {/* Match aller : affiché UNIQUEMENT si un vrai match existe dans
                CDD_LAST_MATCHES contre cet adversaire. Plus de placeholder
                "22/09 défaite 1-2" inventé. */}
            {allerMatch && (
              <div className="prep-aller">
                <div className="prep-aller-k">MATCH ALLER · {allerMatch.date}</div>
                <div className="prep-aller-line">
                  <span className="prep-aller-team">{CDD_CLUB?.short || 'FCMH'}</span>
                  <span className="prep-aller-sc num">
                    {(allerMatch.score && allerMatch.score[0]) ?? '–'}
                    –
                    {(allerMatch.score && allerMatch.score[1]) ?? '–'}
                  </span>
                  <span className="prep-aller-team">{oppName}</span>
                </div>
                {allerMatch.result && (
                  <div className={`prep-aller-tag rs-${String(allerMatch.result).toLowerCase()}`}>
                    {allerMatch.result === "L" || allerMatch.result === "l"
                      ? (allerMatch.venue === "E" ? "DÉFAITE EXT." : "DÉFAITE")
                      : allerMatch.result === "W" || allerMatch.result === "w"
                      ? (allerMatch.venue === "E" ? "VICTOIRE EXT." : "VICTOIRE")
                      : "NUL"}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Quick actions block */}
      <div className="sec-h"><span className="t">Préparation</span></div>
      <div className="prep-actions">
        <button className="prep-action" onClick={() => go("convocations")}>
          <div className="prep-action-ic">📋</div>
          <div className="prep-action-l">
            <b>Convocations</b>
            <em>{convoCount} convoqués · {absCount} absents</em>
          </div>
          <div className="prep-action-arr">›</div>
        </button>
        <button className="prep-action" onClick={() => go("lineup")}>
          <div className="prep-action-ic">⚽</div>
          <div className="prep-action-l">
            <b>Composition</b>
            <em>4-3-3 · OVR équipe 78</em>
          </div>
          <div className="prep-action-arr">›</div>
        </button>
        <button className="prep-action" onClick={() => go("share")}>
          <div className="prep-action-ic">📤</div>
          <div className="prep-action-l">
            <b>Partager aux parents</b>
            <em>WhatsApp · SMS · lien lecteur</em>
          </div>
          <div className="prep-action-arr">›</div>
        </button>
        <button className="prep-action accent" onClick={() => go("match")}>
          <div className="prep-action-ic">⚡</div>
          <div className="prep-action-l">
            <b>LANCER LE MATCH</b>
            <em>Coup d'envoi · dimanche 10h30</em>
          </div>
          <div className="prep-action-arr">›</div>
        </button>
      </div>

      {/* Match précédent — conditionnel sur lastMatch */}
      {lastMatch && (
        <>
          <div className="sec-h"><span className="t">Match précédent</span></div>
          <div className="prep-prev">
            <div className={`prep-prev-tag rs-${String(lastMatch.result||"").toLowerCase()}`}>
              {lastMatch.result === "W" ? "VICTOIRE" : lastMatch.result === "D" ? "NUL" : lastMatch.result === "L" ? "DÉFAITE" : "—"}
            </div>
            <div className="prep-prev-line">
              <span>{lastMatch.venue === "H" ? "FCMH" : (lastMatch.opp||"—")}</span>
              <span className="num">{(lastMatch.score||[0,0])[0]}–{(lastMatch.score||[0,0])[1]}</span>
              <span>{lastMatch.venue === "H" ? (lastMatch.opp||"—") : "FCMH"}</span>
            </div>
            <div className="prep-prev-meta">{lastMatch.date} · {(lastMatch.scorers||[]).join(" · ")}</div>
          </div>
        </>
      )}

    </div>
  );
}

window.ScreenPrep = ScreenPrep;


/* ============================================================
   SCREEN — Mode arbitre (épuré)
   ============================================================ */

function _arbCoachVisual() {
  const h = new Date().getHours();
  return (h >= 7 && h < 19) ? 'assets/coach-day.png' : 'assets/coach-night.png';
}

function ScreenArbitre({ go, tweaks }) {
  return (
    <div className="scr scr-arb fade-in" data-screen-label="11 Mode Arbitre">

      <div className="arb-hero">
        <div className="arb-hero-bg" style={{
          backgroundImage: `url(${_arbCoachVisual()})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.65
        }}/>
        <div className="arb-hero-grad"/>
        <div className="arb-hero-stamp">ARBITRE</div>
        <div className="arb-hero-in">
          <div className="arb-hero-k">EN MISSION</div>
          <div className="arb-hero-title">
            COUP DE<br/>
            <span className="arb-hero-acc">SIFFLET</span>
          </div>
          <div className="arb-hero-sub">
            Feuille de match arbitre · saisie 2 équipes au coup d'envoi
          </div>
        </div>
      </div>

      <div className="arb-cta">
        <button className="btn-cta" onClick={() => go("match")}>
          <span>NOUVEAU MATCH</span>
          <span className="arr">⚽</span>
        </button>
      </div>

      <div className="arb-features">
        <div className="arb-f">
          <div className="arb-f-ic">⏱️</div>
          <div className="arb-f-l">Double chrono</div>
          <div className="arb-f-d">Officiel + temps réel</div>
        </div>
        <div className="arb-f">
          <div className="arb-f-ic">🟨</div>
          <div className="arb-f-l">Cartons</div>
          <div className="arb-f-d">2 jaunes = rouge auto</div>
        </div>
        <div className="arb-f">
          <div className="arb-f-ic">📊</div>
          <div className="arb-f-l">Feuille</div>
          <div className="arb-f-d">Export PDF / WhatsApp</div>
        </div>
        <div className="arb-f">
          <div className="arb-f-ic">🔋</div>
          <div className="arb-f-l">Wake lock</div>
          <div className="arb-f-d">Écran reste allumé</div>
        </div>
      </div>

      <div className="sec-h"><span className="t">Derniers matchs arbitrés</span></div>
      {(() => {
        const finished = (window.MATCH_HELPERS?.listCoachFinishedMatches?.() || []).slice(0, 5);
        if (finished.length === 0) {
          return (
            <div className="arb-list" style={{padding:"14px 16px", opacity:0.55, fontSize:13, textAlign:"center"}}>
              Aucun match arbitré pour l'instant.<br/>
              Lance un match depuis l'accueil pour démarrer ton historique.
            </div>
          );
        }
        return (
          <div className="arb-list">
            {finished.map((m) => (
              <div className="arb-item" key={m.id}>
                <div className="arb-item-d num">{m.date}</div>
                <div className="arb-item-m">
                  <span>{m.home}</span>
                  <b className="num">{m.score[0]}–{m.score[1]}</b>
                  <span>{m.away}</span>
                </div>
                <div className="arb-item-arr">›</div>
              </div>
            ))}
          </div>
        );
      })()}

      <button className="btn-cta ghost arb-switch" onClick={() => go("home")}>
        ⇄ Revenir en mode coach
      </button>
    </div>
  );
}

window.ScreenArbitre = ScreenArbitre;


/* ============================================================
   SCREEN — Page lecteur (public, parents/joueurs)
   ============================================================ */

function ScreenLecteur({ go, tweaks }) {
  const [tab, setTab] = useState("prochain");
  const next = CDD_NEXT_MATCH;
  // --- Convoc parent : état + persistance Firestore + localStorage ---
  const playerIdFromUrl = (() => {
    const fromSearch = new URLSearchParams(window.location.search).get('p');
    if (fromSearch) return fromSearch;
    const hash = window.location.hash || '';
    const q = hash.split('?')[1];
    if (q) return new URLSearchParams(q).get('p');
    return null;
  })();
  // Priorité de pré-sélection :
  //   1. URL ?p=XXX  (lien partagé)
  //   2. Enfant lié au compte parent connecté (membership team.playerId)
  //   3. Aucun → l'utilisateur cherche manuellement (lecteur tiers, etc.)
  // On garde la possibilité de "×" pour vérifier un autre joueur si besoin.
  const _autoChildId = (() => {
    try { return window.CDD_ROLES?.getChildOfParent?.() || null; }
    catch (e) { return null; }
  })();
  const [selectedPlayerId, setSelectedPlayerId] = useState(
    playerIdFromUrl || _autoChildId || null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const playerId = selectedPlayerId;
  const playerDisplay = (() => {
    if (!playerId) return "";
    const p = CDD_PLAYERS.find(x => x.id === playerId);
    return p ? `${p.first} ${p.last}` : "";
  })();
  // Liste filtrée pour la recherche : prénom OU nom, en starts-with d'abord
  // puis includes pour tolérer la frappe partielle au milieu.
  const searchResults = (searchQuery.trim().length >= 1 && !selectedPlayerId)
    ? CDD_PLAYERS.filter(p => {
        // Recherche insensible aux accents (Léonis ↔ leonis, Clément ↔ clement).
        const _deburr = (window.CDD_HELPERS && window.CDD_HELPERS.deburr)
          || ((s) => String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase());
        const q = _deburr(searchQuery.trim());
        const first = _deburr(p.first);
        const last = _deburr(p.last);
        return first.startsWith(q) || last.startsWith(q)
            || first.includes(q) || last.includes(q);
      }).slice(0, 8)
    : [];
  const matchId = (typeof window.cddSync !== 'undefined' && window.cddSync.matchId) || 'demo';
  const [resp, setResp] = useState(null);
  // Resync la réponse RSVP cachée localement à chaque changement de joueur.
  useEffect(() => {
    if (!playerId) { setResp(null); return; }
    try {
      const cached = JSON.parse(localStorage.getItem(`cdd_v2_convoc_${matchId}`) || '{}');
      setResp(cached[playerId]?.resp || null);
    } catch (e) { setResp(null); }
  }, [playerId, matchId]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  // Mode "édition" : permet de réafficher les 3 boutons après validation.
  // Reset à false quand on change de joueur ou de match.
  const [editing, setEditing] = useState(false);
  useEffect(() => { setEditing(false); }, [playerId, matchId]);
  const sendResponse = async (newResp) => {
    // Garde-fou : si matchId est en fallback (pas de match courant détecté),
    // refuse l'envoi avec un message clair. Sinon la réponse part dans un
    // doc Firestore que le coach ne regarde pas → silence trompeur.
    if (!matchId || matchId === 'demo' || matchId === 'demo_default') {
      const msg = "Aucun match en cours détecté — recharge la page";
      console.warn('[lecteur] sendResponse REFUSÉ : matchId invalide', { matchId, playerId });
      setSendError(msg);
      return;
    }
    if (!playerId) {
      setSendError("Aucun joueur sélectionné");
      return;
    }
    setSending(true);
    setSendError(null);
    setResp(newResp);
    // Log de traçabilité — utile pour diagnostiquer la sync parent→coach
    // via la console (chrome://inspect sur mobile). Le coach doit voir le
    // MÊME matchId côté Convocations pour que la réponse remonte.
    console.info('[lecteur] sendResponse →', {
      matchId, playerId, resp: newResp, label: playerDisplay,
      firestorePath: `match_convocs/${matchId}.responses.${playerId}`,
    });
    try {
      if (window.cddSync?.sendConvocResponse) {
        await window.cddSync.sendConvocResponse(matchId, playerId, newResp, playerDisplay);
        console.info('[lecteur] sendResponse OK');
      }
    } catch (err) {
      console.warn('[lecteur] sendResponse failed:', err.message);
      setSendError(err.message || 'Erreur envoi');
    } finally {
      setSending(false);
      setEditing(false);
    }
  };


  // Live match watcher : si un match est en cours côté coach et qu'il pousse
  // dans Firestore (cdd_v2_matches/{matchId}), le parent voit le score en
  // direct. Pas besoin d'être coach ni d'avoir un statut particulier.
  // BONUS : si le coach termine le match (status='finished'), on l'enregistre
  // localement comme "last_finished" → les écrans qui filtrent dessus
  // (data-bridge, match-switcher) excluent ce match de la liste "à venir".
  // Cohérence parent ↔ coach sans rien d'autre à faire côté parent.
  const [_liveData, _setLiveData] = useState(null);
  useEffect(() => {
    const _mid = (window.cddSync && window.cddSync.matchId) || null;
    if (!_mid || _mid === 'demo' || _mid === 'demo_default') return;
    if (!window.cddSync?.watchMatchFromCloud) return;
    const unsub = window.cddSync.watchMatchFromCloud(_mid, (data) => {
      if (!data) { _setLiveData(null); return; }
      if (data.status === 'live' || data.status === 'paused') {
        _setLiveData(data);
      } else {
        _setLiveData(null);
        // Match terminé côté coach → cache local pour exclure de "à venir"
        if (data.status === 'finished') {
          try {
            const cur = localStorage.getItem('cdd_match_last_finished');
            if (cur !== _mid) {
              localStorage.setItem('cdd_match_last_finished', _mid);
              if (window.CDD_REBUILD) window.CDD_REBUILD();
            }
          } catch (e) {}
        }
      }
    });
    return () => { try { unsub?.(); } catch (e) {} };
  }, []);

  return (
    <div className="scr scr-lecteur fade-in" data-screen-label="12 Lecteur public">

      {/* Bandeau LIVE — visible pour TOUS (parent, lecteur, joueur, coach
          quand il consulte la page Lecteur). Convention recevant à gauche. */}
      {_liveData && (() => {
        const _isAtHome = (window.CDD_NEXT_MATCH?.venue === 'Domicile');
        const meName  = (_liveData.teamA && _liveData.teamA.n) || 'Mon club';
        const oppName = (_liveData.teamB && _liveData.teamB.n) || 'Adversaire';
        const sA = _liveData.teamA?.score ?? 0;
        const sB = _liveData.teamB?.score ?? 0;
        const leftName  = _isAtHome ? meName  : oppName;
        const rightName = _isAtHome ? oppName : meName;
        const leftScore  = _isAtHome ? sA : sB;
        const rightScore = _isAtHome ? sB : sA;
        const isPaused = _liveData.status === 'paused';
        return (
          <div style={{
            margin:'10px 14px', padding:'12px 14px', borderRadius:12,
            background: isPaused
              ? 'linear-gradient(135deg, rgba(251,191,36,0.10), rgba(0,0,0,0.3))'
              : 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(0,0,0,0.3))',
            border: `1px solid ${isPaused ? 'rgba(251,191,36,0.45)' : 'rgba(239,68,68,0.45)'}`,
            display:'flex', flexDirection:'column', gap:8,
          }}>
            <div style={{display:'flex', alignItems:'center', gap:8}}>
              <span style={{
                width:8, height:8, borderRadius:'50%',
                background: isPaused ? '#fbbf24' : '#ef4444',
                boxShadow: isPaused ? 'none' : '0 0 8px #ef4444',
                animation: isPaused ? 'none' : 'pulse 1.5s ease-in-out infinite',
              }}/>
              <span style={{
                fontSize:11, fontWeight:900, letterSpacing:'.1em',
                color: isPaused ? '#fbbf24' : '#fca5a5',
              }}>{isPaused ? 'PAUSE · MI-TEMPS' : 'EN DIRECT'}</span>
              <span style={{flex:1}}/>
              <span style={{
                fontSize:11, fontWeight:700, opacity:0.7,
              }}>{(_liveData.events || []).length} événement{(_liveData.events || []).length > 1 ? 's' : ''}</span>
            </div>
            <div style={{
              display:'grid', gridTemplateColumns:'1fr auto 1fr',
              alignItems:'center', gap:14,
            }}>
              <div style={{textAlign:'right', fontSize:13, fontWeight:700}}>
                {leftName}
              </div>
              <div style={{
                fontSize:28, fontWeight:900, color:'#fff', letterSpacing:'.02em',
                fontVariantNumeric:'tabular-nums',
                padding:'0 10px',
              }}>{leftScore} – {rightScore}</div>
              <div style={{textAlign:'left', fontSize:13, fontWeight:700}}>
                {rightName}
              </div>
            </div>
            {/* Bouton CTA pour ouvrir la page match en lecture seule.
                Le coach garde l'édition (canEdit=true sur ScreenMatch),
                parent/lecteur/joueur voient juste le scoreboard + timeline. */}
            <button type="button"
              onClick={() => go && go('match')}
              style={{
                width:'100%', padding:'9px 14px', borderRadius:8,
                background: isPaused ? 'rgba(251,191,36,0.18)' : 'rgba(239,68,68,0.18)',
                border: `1px solid ${isPaused ? 'rgba(251,191,36,0.50)' : 'rgba(239,68,68,0.50)'}`,
                color: isPaused ? '#fbbf24' : '#fca5a5',
                fontSize:12, fontWeight:800, fontFamily:'inherit',
                cursor:'pointer', letterSpacing:'.04em',
              }}>
              ▶ SUIVRE LE MATCH EN DÉTAIL →
            </button>
          </div>
        );
      })()}

      {(() => {
        const clubName = (window.CDD_CLUB?.name) || (window.CDD_CLUB?.short) || 'Mon club';
        const teamLabel = (window.CDD?.getActiveTeam?.()?.name)
          || (window.CDD?.getActiveTeam?.()?.category)
          || (window.CDD_CLUB?.team) || '';
        const seasonLabel = (window.CDD_CLUB?.season) || '';
        return (
          <div className="lec-banner">
            <div className="lec-banner-bg"/>
            <div className="lec-banner-grad"/>
            <div className="lec-banner-in">
              <div className="lec-banner-k">ÉQUIPE PARTAGÉE · LECTURE SEULE</div>
              <div className="lec-banner-title">{clubName}</div>
              <div className="lec-banner-sub">
                {[teamLabel, seasonLabel].filter(Boolean).join(' · ') || 'Saison en cours'}
              </div>
            </div>
          </div>
        );
      })()}

      <div className="lec-tabs">
        {[
          {id:"prochain", l:"Prochain"},
          {id:"effectif", l:"Effectif"},
          {id:"cal",      l:"Calendrier"},
          {id:"class",    l:"Classement"},
        ].map(t => (
          <button key={t.id} className={`lec-tab ${tab===t.id?"on":""}`} onClick={() => setTab(t.id)}>{t.l}</button>
        ))}
      </div>

      {tab === "prochain" && next?.noUpcoming && (
        <div style={{padding:'36px 18px', textAlign:'center'}}>
          <div style={{fontSize:48, marginBottom:14, opacity:0.7}}>📅</div>
          <div style={{fontSize:17, fontWeight:800, marginBottom:8}}>Aucun match annoncé</div>
          <div style={{fontSize:13, opacity:0.65, maxWidth:300, margin:'0 auto', lineHeight:1.5}}>
            Le coach n'a pas encore programmé le prochain match. Tu seras
            notifié dès qu'une convocation arrive.
          </div>
        </div>
      )}
      {tab === "prochain" && !next?.noUpcoming && (() => {
        const myShort = (window.CDD_CLUB?.short) || (window.CDD_CLUB?.name) || 'Mon équipe';
        // Adversaire calculé selon venue (fix 'FCMH vs FCMH' quand à l'extérieur).
        const oppShort = (() => {
          const candidate = next?.opponentName
                        || (next?.venue === 'Domicile' ? next?.away : next?.home);
          if (!candidate || candidate === 'À déterminer') return 'À venir';
          return candidate;
        })();
        const oppLogo = next?.opponentLogo
                    || (next?.venue === 'Domicile' ? next?.awayLogoDataUrl : next?.homeLogoDataUrl)
                    || null;
        const myColors = (window.CDD_CLUB && window.CDD_CLUB.colors) || [];
        return (
        <div className="lec-prochain">
          <div className="lec-card">
            <div className="lec-card-k">PROCHAIN MATCH · J-{next.daysLeft}</div>
            {/* Convention football : club recevant (domicile) toujours à gauche */}
            {(() => {
              const isHome = next?.venue === 'Domicile';
              const myClubId = window.CDD?.getActiveClub?.()?.id;
              const myTeam  = { name: myShort,  colors: myColors,            logo: null,    clubId: myClubId };
              const oppTeam = { name: oppShort, colors: ['#3b82f6','#fff'],  logo: oppLogo, clubId: null };
              const [leftT, rightT] = isHome ? [myTeam, oppTeam] : [oppTeam, myTeam];
              const renderTeam = (t) => (
                <div className="lec-team">
                  {window.ClubBadge && (
                    <window.ClubBadge clubId={t.clubId} clubName={t.name}
                                      colors={t.colors} forceLogo={t.logo || undefined}
                                      size={42} shape="circle"/>
                  )}
                  <span>{t.name}</span>
                </div>
              );
              return (
                <div className="lec-card-vs">
                  {renderTeam(leftT)}
                  <div className="lec-vs">VS</div>
                  {renderTeam(rightT)}
                </div>
              );
            })()}
            {(() => {
              const teamId = window.CDD?.getActiveTeam?.()?.id;
              const mId = next?.id;
              const mInfo = (teamId && mId && window.CDD_MATCH_INFO?.get)
                ? window.CDD_MATCH_INFO.get(teamId, mId) : null;
              const rdv = mInfo?.arrival ? `${mInfo.arrival} · vestiaire`
                        : mInfo?.kickoff ? `${mInfo.kickoff} · coup d'envoi`
                        : null;
              return (
                <div className="lec-when">
                  <div><em>QUAND</em><b>{next.date}</b></div>
                  <div><em>OÙ</em><b>{next.venue}</b></div>
                  {rdv && <div><em>RDV</em><b className="acc">{rdv}</b></div>}
                </div>
              );
            })()}
          </div>

          <div className="sec-h"><span className="t">Mon enfant est-il convoqué ?</span></div>
          <div className="lec-convo">
            <div className="lec-convo-search" style={{position:"relative"}}>
              <span>🔍</span>
              <input
                placeholder="Cherche le prénom de ton enfant…"
                value={selectedPlayerId ? playerDisplay : searchQuery}
                onChange={(e) => {
                  setSelectedPlayerId(null);
                  setSearchQuery(e.target.value);
                }}
                autoComplete="off"
              />
              {selectedPlayerId && (
                <button
                  type="button"
                  aria-label="Effacer"
                  onClick={() => { setSelectedPlayerId(null); setSearchQuery(""); }}
                  style={{
                    position:"absolute", right:8, top:"50%", transform:"translateY(-50%)",
                    background:"transparent", border:"none", color:"var(--tx2,#a7adb8)",
                    fontSize:18, cursor:"pointer", padding:"4px 8px", lineHeight:1,
                  }}>
                  ×
                </button>
              )}
            </div>

            {/* Liste des résultats de recherche */}
            {searchResults.length > 0 && (
              <div className="lec-convo-results" style={{
                display:"flex", flexDirection:"column", gap:6, marginTop:8,
                maxHeight:240, overflowY:"auto"
              }}>
                {searchResults.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { setSelectedPlayerId(p.id); setSearchQuery(""); }}
                    style={{
                      display:"flex", alignItems:"center", gap:10,
                      padding:"10px 12px", borderRadius:10,
                      background:"rgba(255,255,255,0.04)",
                      border:"1px solid rgba(255,255,255,0.08)",
                      color:"inherit", cursor:"pointer", textAlign:"left",
                      fontFamily:"inherit", fontSize:13
                    }}>
                    <span style={{
                      width:28, height:28, borderRadius:"50%",
                      background:"rgba(198,255,58,0.12)", color:"#c6ff3a",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:11, fontWeight:800, flexShrink:0
                    }}>{p.num || '?'}</span>
                    <span style={{flex:1, fontWeight:700}}>{p.first} {p.last}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Hint si pas de sélection ni recherche */}
            {!selectedPlayerId && searchQuery.trim().length === 0 && (
              <div style={{
                padding:"14px 4px 4px", fontSize:12,
                color:"var(--tx2,#a7adb8)", lineHeight:1.5
              }}>
                Tape les premières lettres du prénom de ton enfant pour vérifier s'il est convoqué.
              </div>
            )}

            {/* Aucun résultat trouvé */}
            {!selectedPlayerId && searchQuery.trim().length >= 1 && searchResults.length === 0 && (
              <div style={{
                padding:"14px 4px 4px", fontSize:12,
                color:"var(--tx2,#a7adb8)", lineHeight:1.5
              }}>
                Aucun joueur trouvé. Vérifie l'orthographe ou demande au coach.
              </div>
            )}

            {/* Bloc confirmation + CTA — uniquement si un joueur est sélectionné */}
            {selectedPlayerId && (
              <>
                <div className="lec-convo-yes">
                  <div className="lec-convo-yes-ic">✓</div>
                  <div className="lec-convo-yes-t">
                    <b>{playerDisplay} est convoqué !</b>
                    {(() => {
                      const p = CDD_PLAYERS.find(x => x.id === playerId);
                      if (!p) return null;
                      const posLabel = (typeof POSITION_LABEL !== 'undefined' && POSITION_LABEL[p.pos]) || p.pos || '';
                      return <em>{posLabel}{p.num ? ` · #${p.num}` : ''}</em>;
                    })()}
                  </div>
                </div>
                {/* Tant qu'aucune réponse OU mode édition → 3 boutons.
                    Sinon → résumé compact + bouton Modifier. */}
                {(!resp || editing) ? (
                  <div className="lec-convo-cta">
                    <button
                      className={`lec-btn-resp lec-btn-yes ${resp === 'yes' ? 'on' : ''}`}
                      disabled={sending}
                      onClick={() => sendResponse('yes')}>
                      ✓ JE VIENS
                    </button>
                    <button
                      className={`lec-btn-resp lec-btn-no ${resp === 'no' ? 'on' : ''}`}
                      disabled={sending}
                      onClick={() => sendResponse('no')}>
                      ✕ Absent
                    </button>
                    <button
                      className={`lec-btn-resp lec-btn-may ${resp === 'may' ? 'on' : ''}`}
                      disabled={sending}
                      onClick={() => sendResponse('may')}>
                      ?
                    </button>
                  </div>
                ) : (
                  <div className="lec-convo-confirm" style={{
                    padding:"12px 14px", display:"flex", alignItems:"center",
                    gap:10, justifyContent:"space-between", flexWrap:"wrap",
                  }}>
                    <span style={{
                      color:"var(--accent,#c8f169)", fontSize:14, fontWeight:700,
                    }}>
                      {sending ? "Envoi en cours…" :
                       sendError ? `⚠ ${sendError} (sauvegardé localement)` :
                       resp === 'yes' ? "✓ Réponse envoyée : présent" :
                       resp === 'no'  ? "✓ Réponse envoyée : absent" :
                                        "✓ Réponse envoyée : peut-être"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      style={{
                        padding:"7px 14px", borderRadius:8, cursor:"pointer",
                        background:"rgba(255,255,255,0.06)",
                        border:"1px solid rgba(255,255,255,0.18)",
                        color:"var(--tx,#fff)", fontSize:12.5, fontWeight:700,
                        fontFamily:"inherit",
                      }}>
                      ✎ Modifier
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        );
      })()}

      {tab === "effectif" && (() => {
        // Refonte 2026-05-23 : effectif EN 3 SECTIONS plutôt qu'une liste plate.
        //   ⚽ Titulaires (les 11 convoqués pour le prochain match)
        //   🪑 Banc       (les 3-5 remplaçants convoqués)
        //   🛋️ Reste de l'effectif (les joueurs hors convoc — indispos ou réserve)
        // Source : CDD_CONVO (recalculé depuis la compo type + statut joueurs +
        // overlay match éventuel). Cohérent avec ce que le coach voit dans
        // « Convocations » et « Mode Vestiaire ».
        //
        // Pas de stats privées (buts/passes) sur ces cartes — la page lecteur
        // est consultée par parents/joueurs/lecteurs, leur sphère est la vie
        // d'équipe (qui joue, qui est sur le banc), pas les perfs individuelles.
        const convo = window.CDD_CONVO || { starters: [], bench: [] };
        const startersIds = new Set(convo.starters || []);
        const benchIds    = new Set(convo.bench    || []);
        const findPlayer  = (id) => CDD_PLAYERS.find(p => p.id === id);
        const startersList = (convo.starters || []).map(findPlayer).filter(Boolean);
        const benchList    = (convo.bench    || []).map(findPlayer).filter(Boolean);
        const restList = CDD_PLAYERS.filter(p =>
          !startersIds.has(p.id) && !benchIds.has(p.id)
        );

        const renderPlayer = (p) => (
          <div className="lec-pl" key={p.id}>
            <div className="lec-pl-avatar">
              {p.photoDataUrl ? (
                <img src={p.photoDataUrl} alt=""/>
              ) : p.photo ? (
                <img src={p.photo} alt=""
                     onError={(e) => { e.currentTarget.style.display = 'none'; }}/>
              ) : (
                <span>{(p.first || '?')[0]}{(p.last || '?')[0]}</span>
              )}
            </div>
            <div className="lec-pl-info">
              <b>#{p.num || '?'} {p.first} {p.last}</b>
              <em>{POSITION_LABEL[p.pos] || p.pos || '—'}</em>
            </div>
          </div>
        );

        const renderSection = (title, icon, color, players) => {
          if (!players || players.length === 0) return null;
          return (
            <div key={title} style={{marginBottom: 16}}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '12px 14px 8px',
                fontSize: 11, fontWeight: 800, letterSpacing: '.10em',
                color, textTransform: 'uppercase',
              }}>
                <span style={{fontSize: 14}}>{icon}</span>
                <span>{title}</span>
                <span style={{
                  marginLeft: 'auto', fontSize: 10, fontWeight: 700,
                  padding: '2px 8px', borderRadius: 999,
                  background: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.7)',
                }}>{players.length}</span>
              </div>
              {players.map(renderPlayer)}
            </div>
          );
        };

        return (
          <div className="lec-effectif">
            {/* Hint contextuel si une convoc spécifique existe pour ce match */}
            {convo.hasMatchOverlay && (
              <div style={{
                margin: '0 14px 12px', padding: '8px 12px', borderRadius: 8,
                background: 'rgba(200,241,105,0.06)',
                border: '1px solid rgba(200,241,105,0.20)',
                fontSize: 11, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5,
              }}>
                Convocation adaptée pour le prochain match (différente de la compo type).
              </div>
            )}
            {renderSection('Titulaires', '⚽', '#c8f169', startersList)}
            {renderSection('Banc',       '🪑', '#7dd3fc', benchList)}
            {startersList.length === 0 && benchList.length === 0 && restList.length === 0 && (
              <div style={{
                padding: '40px 16px', textAlign: 'center',
                fontSize: 13, color: 'rgba(255,255,255,0.5)',
              }}>Aucun joueur dans l'effectif pour l'instant.</div>
            )}
          </div>
        );
      })()}

      {tab === "cal" && (() => {
        const _calTeamId = window.CDD?.getActiveTeam?.()?.id;
        let upcoming = [];
        if (_calTeamId && window.CDD_MATCH_SWITCHER?.listUpcoming) {
          upcoming = window.CDD_MATCH_SWITCHER.listUpcoming(_calTeamId).slice(0, 10);
        } else if (CDD_NEXT_MATCH && !CDD_NEXT_MATCH.noUpcoming) {
          upcoming = [CDD_NEXT_MATCH];
        }
        if (upcoming.length === 0) {
          return (
            <div style={{padding:'36px 16px', textAlign:'center', opacity:.55, fontSize:13}}>
              <div style={{fontSize:36, marginBottom:10}}>📅</div>
              <div style={{fontWeight:700}}>Aucun match à venir programmé</div>
              <div style={{marginTop:6, fontSize:12, opacity:.7}}>Les prochains matchs apparaîtront ici.</div>
            </div>
          );
        }
        // Helper unifié : normalise les 2 formats possibles d'un match.
        //  - CDD_NEXT_MATCH : { opponentName, venue: 'Domicile'|'Extérieur', home, away }
        //  - CDD_MATCH_SWITCHER.listUpcoming() : { opponent, venue: 'H'|'E', kind:'fff'|'amical' }
        // Sans cette normalisation, le calendrier affichait "? vs FCMH" car
        // les champs n'étaient pas alignés avec ce que fmtVs attendait.
        const _isHomeOf = (m) => (m.venue === 'H' || m.venue === 'Domicile');
        const _oppOf = (m) =>
          m.opponent || m.opponentName
          || (_isHomeOf(m) ? m.away : m.home)
          || m.away || '?';
        const _meName = (window.CDD_CLUB?.short) || (window.CDD_CLUB?.team) || 'FCMH';
        // Convention recevant à gauche pour l'affichage VS
        const fmtVs = (m) => {
          const opp = _oppOf(m);
          return _isHomeOf(m) ? `${_meName} vs ${opp}` : `${opp} vs ${_meName}`;
        };
        const nextM = upcoming[0];
        const rest = upcoming.slice(1);
        // Infos pratiques du prochain match (stade, RDV, coup d'envoi)
        const nextInfo = (_calTeamId && nextM?.id && window.CDD_MATCH_INFO?.get)
          ? window.CDD_MATCH_INFO.get(_calTeamId, nextM.id) : null;
        const _nextIsHome = _isHomeOf(nextM);
        const venueLabel = _nextIsHome ? 'DOMICILE' : 'EXTÉRIEUR';
        const venueColor = _nextIsHome ? '#c8f169' : '#fbbf24';
        const dayLabel = (() => {
          if (typeof nextM.daysLeft !== 'number') return null;
          if (nextM.daysLeft === 0) return 'AUJOURD\'HUI';
          if (nextM.daysLeft === 1) return 'DEMAIN';
          return `J-${nextM.daysLeft}`;
        })();
        return (
          <div className="lec-cal">
            {/* CARTE — Prochain match (enrichi) */}
            <div style={{
              background:'linear-gradient(135deg, rgba(200,241,105,0.08), rgba(255,255,255,0.02))',
              border:'1px solid rgba(200,241,105,0.25)',
              borderRadius:14, padding:'14px 16px', marginBottom:12,
              display:'flex', flexDirection:'column', gap:10,
            }}>
              <div style={{display:'flex', alignItems:'center', gap:8, flexWrap:'wrap'}}>
                <span style={{
                  fontSize:10.5, fontWeight:800, letterSpacing:'.08em',
                  padding:'3px 8px', borderRadius:5,
                  background:'rgba(200,241,105,0.18)', color:'#c8f169',
                  border:'1px solid rgba(200,241,105,0.4)',
                }}>PROCHAIN MATCH</span>
                {dayLabel && (
                  <span style={{
                    fontSize:10.5, fontWeight:800, letterSpacing:'.08em',
                    padding:'3px 8px', borderRadius:5,
                    background:'rgba(255,255,255,0.06)', color:'#fff',
                    border:'1px solid rgba(255,255,255,0.18)',
                  }}>{dayLabel}</span>
                )}
                {(nextM.isAmical || nextM.kind === 'amical') && (
                  <span style={{
                    fontSize:10.5, fontWeight:800, letterSpacing:'.06em',
                    padding:'3px 8px', borderRadius:5,
                    background:'rgba(167,139,250,0.15)', color:'#c4b5fd',
                    border:'1px solid rgba(167,139,250,0.4)',
                  }}>🤝 AMICAL</span>
                )}
              </div>
              <div style={{fontSize:17, fontWeight:800, color:'#fff', letterSpacing:'-.01em'}}>
                {fmtVs(nextM)}
              </div>
              <div style={{
                display:'grid', gridTemplateColumns:'1fr 1fr', gap:8,
                fontSize:12.5, color:'rgba(255,255,255,0.85)',
              }}>
                <div style={{display:'flex', alignItems:'center', gap:6}}>
                  <span>📅</span><b>{nextM.date}</b>
                </div>
                <div style={{display:'flex', alignItems:'center', gap:6}}>
                  <span>📍</span>
                  <b style={{color:venueColor}}>{venueLabel}</b>
                </div>
                {nextInfo?.kickoff && (
                  <div style={{display:'flex', alignItems:'center', gap:6}}>
                    <span>⚽</span><b>Coup d'envoi {nextInfo.kickoff}</b>
                  </div>
                )}
                {nextInfo?.arrival && (
                  <div style={{display:'flex', alignItems:'center', gap:6}}>
                    <span>🕐</span><b>RDV {nextInfo.arrival}</b>
                  </div>
                )}
                {nextInfo?.stadium?.name && (
                  <div style={{display:'flex', alignItems:'center', gap:6, gridColumn:'1 / -1'}}>
                    <span>🏟️</span>
                    <b>{nextInfo.stadium.name}</b>
                    {nextInfo.stadium.address && (
                      <span style={{opacity:0.7, fontWeight:400}}> · {nextInfo.stadium.address}</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* LISTE — Matchs suivants (compacts) */}
            {rest.length > 0 && (
              <>
                <div className="sec-h" style={{marginTop:4}}>
                  <span className="t">À suivre · {rest.length}</span>
                </div>
                {rest.map((m, i) => {
                  const opp = _oppOf(m);
                  const vL = _isHomeOf(m) ? 'DOMICILE' : 'EXTÉRIEUR';
                  const isAmi = m.isAmical || m.kind === 'amical';
                  return (
                    <div className="lec-cal-row" key={m.id || i}
                         style={{background:'rgba(255,255,255,0.03)'}}>
                      <span style={{fontSize:15, flexShrink:0}}>📅</span>
                      <span className="lec-cal-opp">
                        <em>{vL}</em>
                        {opp}
                        {isAmi && (
                          <span style={{marginLeft:6, fontSize:10, fontWeight:700, color:'#a78bfa',
                            background:'rgba(167,139,250,0.12)', padding:'1px 6px', borderRadius:4}}>
                            AMICAL
                          </span>
                        )}
                      </span>
                      <span className="lec-cal-d num">{m.date}</span>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        );
      })()}

      {tab === "class" && (
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
          {(!CDD_STANDINGS || CDD_STANDINGS.length === 0) ? (
            <div className="rs-cal-empty">
              <div className="rs-cal-empty-ic">🏆</div>
              <div className="rs-cal-empty-t">Classement non chargé</div>
              <div className="rs-cal-empty-d">Le classement sera mis à jour bientôt</div>
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
              <span className={`num ${(s.diff || (s.gf-s.ga)) > 0 ? "pos" : (s.diff || (s.gf-s.ga)) < 0 ? "neg" : "dim"}`}>
                {(s.diff || (s.gf-s.ga)) > 0 ? "+" : ""}{s.diff || (s.gf-s.ga)}
              </span>
              <b className="num rs-r-pts">{s.pts}</b>
            </div>
          ))}
        </div>
      )}

      <div className="lec-foot">
        <span>📱 Page lecteur</span>
        <span className="sep">·</span>
        <span>Aucune donnée privée transmise</span>
      </div>
    </div>
  );
}

window.ScreenLecteur = ScreenLecteur;


/* ============================================================
   SCREEN — Vote post-match
   ============================================================ */

function ScreenVote({ go, tweaks }) {
  // Liste de tous les matchs joués + arbitrés par le coach, pour permettre
  // de noter n'importe quel match passé (pas seulement le dernier).
  const playedMatches = (window.CDD_LAST_MATCHES || []).filter(m => m.coachArbitrated && m.id);
  const defaultMatchId = (() => {
    try {
      const last = localStorage.getItem('cdd_match_last_finished');
      if (last && playedMatches.some(m => m.id === last)) return last;
    } catch (e) {}
    return playedMatches[0]?.id || null;
  })();
  const [selectedMatchId, setSelectedMatchId] = useState(defaultMatchId);
  const [showMatchPicker, setShowMatchPicker] = useState(false);

  const [votes, setVotes] = useState({}); // playerId -> 0-10 (demi-points)
  const [motm, setMotm] = useState(null); // playerId élu MOTM explicitement
  const [nsSet, setNsSet] = useState(new Set()); // playerIds "Pas vu jouer"
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);

  // Reset des états quand on change de match
  React.useEffect(() => {
    setVotes({});
    setMotm(null);
    setNsSet(new Set());
    setSubmitted(false);
    setSendError(null);
  }, [selectedMatchId]);

  // Charge le match sélectionné depuis localStorage
  const lastFinishedMatch = (() => {
    try {
      if (!selectedMatchId || !window.MATCH_HELPERS?.loadMatch) return null;
      return window.MATCH_HELPERS.loadMatch(selectedMatchId);
    } catch (e) { return null; }
  })();
  const playedLineup = lastFinishedMatch?.tA?.p || [];
  const starters = (playedLineup.length > 0)
    ? playedLineup.map(lp => CDD_PLAYERS.find(p => p.id === lp.id) || lp).filter(Boolean)
    : CDD_CONVO.starters.map(id => CDD_PLAYERS.find(p => p.id === id)).filter(Boolean);

  const setRating = (id, r) => {
    setVotes(v => ({...v, [id]: r}));
    // Lever le NS si on note quand même
    setNsSet(s => { const ns = new Set(s); ns.delete(id); return ns; });
  };

  const toggleNs = (id) => {
    setNsSet(s => {
      const ns = new Set(s);
      if (ns.has(id)) {
        ns.delete(id);
      } else {
        ns.add(id);
        // Effacer la note et le MOTM si NS
        setVotes(v => { const nv = {...v}; delete nv[id]; return nv; });
        setMotm(m => m === id ? null : m);
      }
      return ns;
    });
  };

  const toggleMotm = (id) => setMotm(m => m === id ? null : id);

  // Traité = noté (note posée) OU marqué NS
  const treated = starters.filter(p => votes[p.id] !== undefined || nsSet.has(p.id)).length;
  const allRated = starters.every(p => votes[p.id] !== undefined || nsSet.has(p.id));

  const submitVote = async () => {
    setSending(true);
    setSendError(null);
    try {
      if (window.cddSync?.sendVote) {
        // Le vote pointe sur le match SÉLECTIONNÉ dans le picker (qui defaulte
        // au dernier match terminé). Permet de noter n'importe quel match passé.
        const targetMatchId = selectedMatchId
                           || window.cddSync.lastFinishedMatchId
                           || window.cddSync.matchId;
        await window.cddSync.sendVote(
          targetMatchId,
          window.cddSync.voterId,
          votes,
          { motm, ns: [...nsSet] }
        );
      }
      // Applique les deltas OVR avec le vote du coach comme signal qualitatif.
      // Le match a déjà appliqué les deltas "perf brute" (buts/passes/cartons) à la fin ;
      // ici on RE-applique avec le voteAggregate pour intégrer la note coach (la dernière
      // applique écrase la précédente pour ce matchId, idempotent).
      // Normalisation /2 pour ramener l'échelle 0-10 vers l'équivalent 0-5 attendu.
      if (lastFinishedMatch && window.CDD_COACH?.applyMatchPerformanceDeltas) {
        const voteAggregate = {};
        Object.entries(votes).forEach(([pid, rating]) => {
          voteAggregate[pid] = { avg: rating / 2, count: 1 };
        });
        window.CDD_COACH.applyMatchPerformanceDeltas(lastFinishedMatch, voteAggregate);
      }
      setSubmitted(true);
    } catch (err) {
      console.warn('[vote] submit failed:', err.message);
      setSendError(err.message || 'Erreur envoi');
      setSubmitted(true);
    } finally {
      setSending(false);
    }
  };

  if (submitted) {
    const motmPlayer = motm ? starters.find(p => p.id === motm) : null;
    // Fallback : meilleure note si pas de MOTM explicite
    const fallbackMvp = !motmPlayer ? starters.reduce((best, p) => {
      if (nsSet.has(p.id)) return best;
      const r = votes[p.id] ?? -1;
      return r > (best?.r ?? -1) ? { p, r } : best;
    }, null) : null;
    const displayMvp = motmPlayer
      ? { p: motmPlayer, r: votes[motmPlayer.id] }
      : fallbackMvp;
    return (
      <div className="scr scr-vote fade-in" data-screen-label="13 Vote — Submitted">
        <div className="vote-success">
          <div className="vote-success-ic">⭐</div>
          <div className="vote-success-t">Notes envoyées !</div>
          <div className="vote-success-d">Tes notes sont prises en compte dans la synthèse collective de l'équipe.</div>
          {displayMvp && displayMvp.r >= 0 && (
            <div className="vote-success-mvp">
              <div className="vote-success-mvp-k">{motmPlayer ? 'HOMME DU MATCH' : 'TON MEILLEUR JOUEUR'}</div>
              <div className="vote-success-mvp-name">
                <span>{displayMvp.p.first}</span><b>{displayMvp.p.last}</b>
              </div>
              <div className="vote-success-mvp-rate">{displayMvp.r.toFixed(1)}<span style={{fontSize:14,opacity:.6}}>/10</span></div>
            </div>
          )}
          <button className="btn-cta ghost" onClick={() => setSubmitted(false)}>← Modifier mes notes</button>
        </div>
      </div>
    );
  }

  return (
    <div className="scr scr-vote fade-in" data-screen-label="13 Vote post-match">

      {lastFinishedMatch ? (() => {
        const M = lastFinishedMatch;
        const teamLabel = (window.CDD?.getActiveTeam?.()?.name)
          || (window.CDD?.getActiveTeam?.()?.category) || '';
        const dateLabel = M.endedAt
          ? new Date(M.endedAt).toLocaleDateString('fr-FR', { day:'numeric', month:'long' })
          : '';
        const myColors = [M.tA?.c || '#c8f169', M.tA?.c2 || '#0a0e14'];
        const oppColors = [M.tB?.c || '#3b82f6', M.tB?.c2 || '#fff'];
        // Convention foot : recevant à gauche. Le venue vient :
        //   1. directement de M.isAtHome (toggle au lancement, v124+)
        //   2. sinon de CDD_LAST_MATCHES (dérivé via friendly match en fallback)
        const matchMeta = playedMatches.find(pm => pm.id === selectedMatchId);
        const derivedVenue = M.isAtHome === true ? 'H'
                           : M.isAtHome === false ? 'E'
                           : (matchMeta?.venue || '?');
        const isAway = derivedVenue === 'E';
        const venueLabel = derivedVenue === 'H' ? 'DOMICILE' : derivedVenue === 'E' ? 'EXTÉRIEUR' : '';
        const leftName   = isAway ? (M.tB?.n || 'Adversaire') : (M.tA?.n || 'Mon équipe');
        const rightName  = isAway ? (M.tA?.n || 'Mon équipe') : (M.tB?.n || 'Adversaire');
        const leftScore  = isAway ? (M.sB||0) : (M.sA||0);
        const rightScore = isAway ? (M.sA||0) : (M.sB||0);
        const leftColors  = isAway ? oppColors : myColors;
        const rightColors = isAway ? myColors  : oppColors;
        const leftLogo    = isAway ? (M.tB?.logoDataUrl || null) : (M.tA?.logoDataUrl || null);
        const rightLogo   = isAway ? (M.tA?.logoDataUrl || null) : (M.tB?.logoDataUrl || null);
        const myClubId    = M.clubId || window.CDD?.getActiveClub?.()?.id;
        const leftClubId  = isAway ? null : myClubId;
        const rightClubId = isAway ? myClubId : null;
        return (
          <div className="vote-hero">
            <div className="vote-hero-bg"/>
            <div className="vote-hero-grad"/>
            <div className="vote-hero-in">
              <div className="vote-hero-k">VOTE · 48H</div>
              <div className="vote-hero-title">Note les joueurs<br/>du match</div>
              <div className="vote-hero-score" style={{display:'flex', alignItems:'center', justifyContent:'center', gap:14, flexWrap:'wrap'}}>
                {window.ClubBadge && (
                  <window.ClubBadge clubId={leftClubId}
                                    clubName={leftName} colors={leftColors}
                                    forceLogo={leftLogo}
                                    size={36} shape="circle"/>
                )}
                <span>{leftName}</span>
                <b className="num">{leftScore}–{rightScore}</b>
                <span>{rightName}</span>
                {window.ClubBadge && (
                  <window.ClubBadge clubId={rightClubId}
                                    clubName={rightName} colors={rightColors}
                                    forceLogo={rightLogo}
                                    size={36} shape="circle"/>
                )}
              </div>
              {(dateLabel || teamLabel || venueLabel) && (
                <div className="vote-hero-sub">
                  {[dateLabel, venueLabel, teamLabel].filter(Boolean).join(' · ')}
                </div>
              )}
            </div>
          </div>
        );
      })() : null}

      {playedMatches.length > 1 && (
        <div style={{padding:'0 14px 10px'}}>
          <button onClick={() => setShowMatchPicker(p => !p)}
            style={{
              width:'100%', padding:'10px 12px',
              background:'rgba(255,255,255,.05)',
              border:'1px solid rgba(255,255,255,.12)',
              borderRadius:10, color:'#fff',
              display:'flex', justifyContent:'space-between', alignItems:'center',
              fontSize:12, cursor:'pointer',
            }}>
            <span style={{opacity:.7}}>📅 {playedMatches.length} matchs jouables</span>
            <span style={{fontWeight:700}}>{showMatchPicker ? '▲ Fermer' : 'Changer de match ▼'}</span>
          </button>
          {showMatchPicker && (
            <div style={{marginTop:6, display:'flex', flexDirection:'column', gap:4,
                         maxHeight:240, overflowY:'auto',
                         background:'rgba(0,0,0,.25)', borderRadius:10, padding:6}}>
              {playedMatches.map(m => {
                const isSel = m.id === selectedMatchId;
                const resColor = m.result === 'W' ? '#c8f169' : m.result === 'L' ? '#ff8a8a' : '#fbbf24';
                const resLabel = m.result === 'W' ? 'V' : m.result === 'L' ? 'D' : 'N';
                return (
                  <button key={m.id} onClick={() => { setSelectedMatchId(m.id); setShowMatchPicker(false); }}
                    style={{
                      padding:'10px 12px', textAlign:'left',
                      background: isSel ? 'rgba(200,241,105,.12)' : 'rgba(255,255,255,.04)',
                      border:'1px solid ' + (isSel ? 'var(--acc, #c8f169)' : 'rgba(255,255,255,.08)'),
                      borderRadius:8, color:'#fff', cursor:'pointer',
                      display:'flex', alignItems:'center', gap:10, fontSize:12,
                    }}>
                    <span style={{
                      display:'inline-block', width:22, height:22, borderRadius:6,
                      background:resColor + '22', color:resColor,
                      fontWeight:900, fontSize:11, textAlign:'center', lineHeight:'22px',
                    }}>{resLabel}</span>
                    <span style={{flex:1}}>{m.date} · {m.opp}</span>
                    <span className="num" style={{fontWeight:700}}>{m.score?.[0]}–{m.score?.[1]}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="vote-progress">
        <div className="vote-progress-bar">
          <div className="vote-progress-fill" style={{width: starters.length ? `${(treated / starters.length) * 100}%` : '0%'}}/>
        </div>
        <div className="vote-progress-txt">
          <b className="num">{treated}</b>
          <span>/{starters.length}</span>
          <em>joueurs traités</em>
        </div>
      </div>

      {motm && (
        <div className="vote-motm-banner">
          ★ MOTM sélectionné — tu peux changer en cliquant une autre étoile
        </div>
      )}

      <div className="vote-list">
        {starters.map(p => {
          const isNs = nsSet.has(p.id);
          const isMotm = motm === p.id;
          const val = votes[p.id]; // undefined si pas encore noté
          return (
            <div className={`vote-row ${val !== undefined ? 'done' : ''} ${isNs ? 'ns' : ''}`} key={p.id}>
              <div className="vote-row-top">
                <div className="vote-row-pl">
                  <div className="vote-pl-avatar">
                    {p.photo ? <img src={p.photo} alt=""/> : <span>{p.first?.[0]}{p.last?.[0]}</span>}
                  </div>
                  <div className="vote-pl-info">
                    <b>#{p.num} {p.first} {p.last}</b>
                    <em>{POSITION_LABEL[p.pos] || p.pos}{p.goals > 0 ? ` · ⚽ ${p.goals}` : ''}</em>
                  </div>
                </div>
                <button
                  className={`vote-motm-btn ${isMotm ? 'on' : ''}`}
                  onClick={() => !isNs && toggleMotm(p.id)}
                  title={isMotm ? 'Retirer MOTM' : 'Élire Homme du match'}
                  disabled={isNs}
                >
                  {isMotm ? '★' : '☆'}
                </button>
              </div>

              {isNs ? (
                <div className="vote-row-ns-bar">
                  <span className="vote-ns-label">Pas vu jouer (NS)</span>
                  <button className="vote-ns-cancel" onClick={() => toggleNs(p.id)}>Annuler</button>
                </div>
              ) : (
                <div className="vote-row-rating">
                  <button className="vote-ns-btn" onClick={() => toggleNs(p.id)} title="Pas vu jouer">NS</button>
                  <input
                    type="range" min="0" max="10" step="0.5"
                    className="vote-slider"
                    value={val ?? 5}
                    onPointerDown={() => { if (val === undefined) setRating(p.id, 5); }}
                    onChange={e => setRating(p.id, parseFloat(e.target.value))}
                  />
                  <span className={`vote-val ${val !== undefined ? 'set' : ''}`}>
                    {val !== undefined ? val.toFixed(1) : '—'}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="vote-submit">
        <button className="btn-cta" disabled={!allRated || sending} onClick={submitVote}>
          {sending ? <span>Envoi en cours…</span>
                   : allRated ? <><span>ENVOYER MES NOTES</span><span className="arr">→</span></>
                              : <span>Note tous les joueurs pour valider ({treated}/{starters.length})</span>}
        </button>
        {sendError && (
          <div style={{textAlign:"center", marginTop:8, color:"#ff8a8a", fontSize:12}}>
            ⚠ {sendError} — notes sauvegardées localement
          </div>
        )}
      </div>
    </div>
  );
}

window.ScreenVote = ScreenVote;
