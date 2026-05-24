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
  const opp = standings.find(s => s.club === oppName) || standings.find(s => !s.me) || null;
  const me  = standings.find(s => s.me) || null;
  const lastMatch = lastMatches[0] || null;
  const allerMatch = { date:"22/09", opp: oppName, venue:"E", score:[1,2], result:"L" };
  const convoCount = (convo.starters?.length || 0) + (convo.bench?.length || 0);
  const absCount = convo.absent?.length || 0;

  return (
    <div className="scr scr-prep fade-in" data-screen-label="10 Preparation match">

      {/* Banner */}
      <div className="prep-hero">
        <div className="prep-hero-bg"/>
        <div className="prep-hero-grad"/>
        <div className="prep-hero-in">
          <div className="prep-hero-k">PRÉPARATION · J-{next.daysLeft}</div>
          <div className="prep-hero-title">{next.competition}</div>
          <div className="prep-hero-vs">
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
            <span className="prep-vs-l">VS</span>
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
          </div>
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
            <div className="prep-aller">
              <div className="prep-aller-k">MATCH ALLER · {allerMatch.date}</div>
              <div className="prep-aller-line">
                <span className="prep-aller-team">FCMH</span>
                <span className="prep-aller-sc num">{allerMatch.score[0]}–{allerMatch.score[1]}</span>
                <span className="prep-aller-team">{oppName}</span>
              </div>
              <div className={`prep-aller-tag rs-${allerMatch.result.toLowerCase()}`}>
                {allerMatch.result === "L" ? "DÉFAITE EXT." : "VICTOIRE EXT."}
              </div>
            </div>
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
  // Pas de pré-sélection si l'URL ne précise pas ?p= : le parent doit chercher
  // son enfant lui-même. Évite le piège "Ilian s'affiche tout le temps" du seed
  // démo (avant: fallback sur CDD_PLAYERS[0]).
  const [selectedPlayerId, setSelectedPlayerId] = useState(playerIdFromUrl || null);
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
  const sendResponse = async (newResp) => {
    setSending(true);
    setSendError(null);
    setResp(newResp);
    try {
      if (window.cddSync?.sendConvocResponse) {
        await window.cddSync.sendConvocResponse(matchId, playerId, newResp, playerDisplay);
      }
    } catch (err) {
      console.warn('[lecteur] sendResponse failed:', err.message);
      setSendError(err.message || 'Erreur envoi');
    } finally {
      setSending(false);
    }
  };


  return (
    <div className="scr scr-lecteur fade-in" data-screen-label="12 Lecteur public">

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

      {tab === "prochain" && (() => {
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
            <div className="lec-card-vs">
              <div className="lec-team">
                {window.ClubBadge && (
                  <window.ClubBadge clubId={window.CDD?.getActiveClub?.()?.id}
                                    clubName={myShort} colors={myColors}
                                    size={42} shape="circle"/>
                )}
                <span>{myShort}</span>
              </div>
              <div className="lec-vs">VS</div>
              <div className="lec-team">
                {window.ClubBadge && (
                  <window.ClubBadge clubId={null} clubName={oppShort}
                                    colors={['#3b82f6','#fff']}
                                    forceLogo={oppLogo}
                                    size={42} shape="circle"/>
                )}
                <span>{oppShort}</span>
              </div>
            </div>
            <div className="lec-when">
              <div><em>QUAND</em><b>{next.date}</b></div>
              <div><em>OÙ</em><b>{next.venue}</b></div>
              <div><em>RDV</em><b className="acc">09h45 · vestiaire</b></div>
            </div>
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
                {resp && (
                  <div className="lec-convo-confirm" style={{padding:"10px 14px", textAlign:"center", color:"var(--accent,#c8f169)", fontSize:13, fontWeight:600}}>
                    {sending ? "Envoi en cours…" :
                     sendError ? `⚠ ${sendError} (sauvegardé localement)` :
                     resp === 'yes' ? "✓ Réponse envoyée : présent" :
                     resp === 'no'  ? "✓ Réponse envoyée : absent" :
                                      "✓ Réponse envoyée : peut-être"}
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
            {renderSection('Titulaires',  '⚽', '#c8f169', startersList)}
            {renderSection('Banc',        '🪑', '#7dd3fc', benchList)}
            {renderSection('Reste de l\'effectif', '🛋️', '#94a3b8', restList)}
            {startersList.length === 0 && benchList.length === 0 && restList.length === 0 && (
              <div style={{
                padding: '40px 16px', textAlign: 'center',
                fontSize: 13, color: 'rgba(255,255,255,0.5)',
              }}>Aucun joueur dans l'effectif pour l'instant.</div>
            )}
          </div>
        );
      })()}

      {tab === "cal" && (
        <div className="lec-cal">
          {CDD_LAST_MATCHES.slice(0, 5).map((m,i) => (
            <div className={`lec-cal-row rs-${m.result.toLowerCase()}`} key={i}>
              <span className={`rs-cal-result rs-${m.result.toLowerCase()}`}>{m.result}</span>
              <span className="lec-cal-opp">
                <em>{m.venue === "H" ? "DOMICILE" : "EXTÉRIEUR"}</em>
                {m.opp}
              </span>
              <span className="num lec-cal-sc">{m.score[0]}–{m.score[1]}</span>
              <span className="lec-cal-d num">{m.date}</span>
            </div>
          ))}
        </div>
      )}

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
  const [votes, setVotes] = useState({}); // playerId -> 1-5
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);

  // Source des joueurs à noter : ceux qui ont VRAIMENT JOUÉ le dernier match terminé,
  // pas la convocation du prochain match. Fallback : CDD_CONVO.starters si pas de
  // match terminé en mémoire (cas démo / 1ère utilisation).
  const lastFinishedMatch = (() => {
    try {
      const lastId = localStorage.getItem('cdd_match_last_finished');
      if (!lastId || !window.MATCH_HELPERS?.loadMatch) return null;
      return window.MATCH_HELPERS.loadMatch(lastId);
    } catch (e) { return null; }
  })();
  const playedLineup = lastFinishedMatch?.tA?.p || [];
  const starters = (playedLineup.length > 0)
    ? playedLineup.map(lp => CDD_PLAYERS.find(p => p.id === lp.id) || lp).filter(Boolean)
    : CDD_CONVO.starters.map(id => CDD_PLAYERS.find(p => p.id === id)).filter(Boolean);

  const setRating = (id, r) => setVotes(v => ({...v, [id]: r}));
  const allRated = starters.every(p => votes[p.id]);

  const submitVote = async () => {
    setSending(true);
    setSendError(null);
    try {
      if (window.cddSync?.sendVote) {
        // Le vote doit pointer sur le match TERMINÉ (pas sur le prochain à préparer
        // ni sur le match live en cours). On préfère lastFinishedMatchId, et on retombe
        // sur matchId courant si aucun match terminé n'est connu (cas démo / proto).
        const targetMatchId = window.cddSync.lastFinishedMatchId || window.cddSync.matchId;
        await window.cddSync.sendVote(
          targetMatchId,
          window.cddSync.voterId,
          votes
        );
      }
      // Applique les deltas OVR avec le vote du coach comme signal qualitatif.
      // Le match a déjà appliqué les deltas "perf brute" (buts/passes/cartons) à la fin ;
      // ici on RE-applique avec le voteAggregate pour intégrer la note coach (la dernière
      // applique écrase la précédente pour ce matchId, idempotent).
      if (lastFinishedMatch && window.CDD_COACH?.applyMatchPerformanceDeltas) {
        const voteAggregate = {};
        Object.entries(votes).forEach(([pid, rating]) => {
          voteAggregate[pid] = { avg: rating, count: 1 };
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
    // MVP = joueur avec la note la plus haute parmi ceux votés (et non plus hardcodé au 1er)
    const mvp = starters.reduce((best, p) => {
      const r = votes[p.id] || 0;
      return r > (best?.r || 0) ? { p, r } : best;
    }, null);
    return (
      <div className="scr scr-vote fade-in" data-screen-label="13 Vote — Submitted">
        <div className="vote-success">
          <div className="vote-success-ic">⭐</div>
          <div className="vote-success-t">Notes envoyées !</div>
          <div className="vote-success-d">Tes notes sont prises en compte dans la synthèse collective de l'équipe.</div>
          {mvp && (
            <div className="vote-success-mvp">
              <div className="vote-success-mvp-k">TON HOMME DU MATCH</div>
              <div className="vote-success-mvp-name">
                <span>{mvp.p.first}</span><b>{mvp.p.last}</b>
              </div>
              <div className="vote-success-mvp-rate">{'⭐'.repeat(mvp.r)}</div>
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
        return (
          <div className="vote-hero">
            <div className="vote-hero-bg"/>
            <div className="vote-hero-grad"/>
            <div className="vote-hero-in">
              <div className="vote-hero-k">VOTE · 48H</div>
              <div className="vote-hero-title">Note les joueurs<br/>du match</div>
              <div className="vote-hero-score" style={{display:'flex', alignItems:'center', justifyContent:'center', gap:14, flexWrap:'wrap'}}>
                {window.ClubBadge && (
                  <window.ClubBadge clubId={M.clubId || window.CDD?.getActiveClub?.()?.id}
                                    clubName={M.tA?.n || 'F'} colors={myColors}
                                    forceLogo={M.tA?.logoDataUrl || null}
                                    size={36} shape="circle"/>
                )}
                <span>{M.tA?.n || 'Mon équipe'}</span>
                <b className="num">{M.sA||0}–{M.sB||0}</b>
                <span>{M.tB?.n || 'Adversaire'}</span>
                {window.ClubBadge && (
                  <window.ClubBadge clubId={null}
                                    clubName={M.tB?.n || '?'} colors={oppColors}
                                    forceLogo={M.tB?.logoDataUrl || null}
                                    size={36} shape="circle"/>
                )}
              </div>
              {(dateLabel || teamLabel) && (
                <div className="vote-hero-sub">
                  {[dateLabel, teamLabel].filter(Boolean).join(' · ')}
                </div>
              )}
            </div>
          </div>
        );
      })() : null}

      <div className="vote-progress">
        <div className="vote-progress-bar">
          <div className="vote-progress-fill" style={{width: `${(Object.keys(votes).length / starters.length) * 100}%`}}/>
        </div>
        <div className="vote-progress-txt">
          <b className="num">{Object.keys(votes).length}</b>
          <span>/{starters.length}</span>
          <em>joueurs notés</em>
        </div>
      </div>

      <div className="vote-list">
        {starters.map(p => (
          <div className={`vote-row ${votes[p.id] ? "done" : ""}`} key={p.id}>
            <div className="vote-row-pl">
              <div className="vote-pl-avatar">
                {p.photo ? <img src={p.photo} alt=""/> : <span>{p.first[0]}{p.last[0]}</span>}
              </div>
              <div className="vote-pl-info">
                <b>#{p.num} {p.first} {p.last}</b>
                <em>{POSITION_LABEL[p.pos] || p.pos} · {p.goals > 0 ? `⚽ ${p.goals}` : ""}</em>
              </div>
            </div>
            <div className="vote-stars">
              {[1,2,3,4,5].map(r => (
                <button key={r}
                  className={`vote-star ${(votes[p.id] || 0) >= r ? "on" : ""}`}
                  onClick={() => setRating(p.id, r)}>
                  ★
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="vote-submit">
        <button className="btn-cta" disabled={!allRated || sending} onClick={submitVote}>
          {sending ? <span>Envoi en cours…</span>
                   : allRated ? <><span>ENVOYER MES NOTES</span><span className="arr">→</span></>
                              : <span>Note tous les joueurs pour valider</span>}
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
