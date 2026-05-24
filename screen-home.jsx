/* global React, CDD_CLUB, CDD_PLAYERS, CDD_NEXT_MATCH, CDD_LIVE_MATCH, CDD_LAST_MATCHES, CDD_STANDINGS, CDD_TOP_SCORERS, CDD_CONVO, CDD_FORMATIONS, CDD_OBSERVATIONS, CDD_POS_COLOR, FutCard, POSITION_LABEL */

/* ============================================================
   SCREEN — Home / Dashboard
   ============================================================ */

const { useState, useEffect, useMemo } = React;

// ---------- Tiny utility components ----------
function CountdownPill({ days }) {
  return (
    <div className="cd-pill">
      <span className="num">{days}</span>
      <em>jour{days>1?"s":""}</em>
    </div>
  );
}

// Accepte W/D/L (anglais, vient de FFF) ou V/N/D (français, traduit).
// Affiche toujours en français V/N/D — convention coach FR.
function FormDot({ r, big }) {
  const display = r === 'W' ? 'V' : r === 'L' ? 'D' : r === 'D' ? 'N' : r;
  const cls = display === 'V' ? 'fd-w' : display === 'D' ? 'fd-l' : 'fd-d';
  return <span className={`fd ${cls} ${big?"fd-big":""}`}>{display}</span>;
}

// ---------- Visuel jour/nuit auto selon heure ----------
function pickCoachVisual() {
  const h = new Date().getHours();
  const isDay = h >= 7 && h < 19;
  return isDay ? 'assets/coach-day.png' : 'assets/coach-night.png';
}

// ---------- HOME ----------
function ScreenHome({ go, tweaks }) {
  const next = CDD_NEXT_MATCH;
  const last = CDD_LAST_MATCHES;
  const club = CDD_CLUB;
  // Pick top 2 stars: highest OVR among starters, fallback to first 2 players
  const starters = CDD_PLAYERS.filter(p => p.isStarter);
  const sorted = [...(starters.length ? starters : CDD_PLAYERS)].sort((a,b) => (b.stats?.ovr||0) - (a.stats?.ovr||0));
  const topScorer = sorted[0];
  const topAssist = sorted[1];

  // Detection match en cours (#20) — bouton REPRENDRE si match interrompu
  const liveMatch = (window.MATCH_HELPERS && window.MATCH_HELPERS.getLiveMatch)
                  ? window.MATCH_HELPERS.getLiveMatch()
                  : null;

  // Suivi présences live : compte les non-respondants pour le prochain match,
  // sert d'alerte d'accueil "X parents à relancer" + badge sur la tile Convocations.
  const matchId = (typeof window.cddSync !== 'undefined' && window.cddSync.matchId) || 'demo';
  const [parentResponses, setParentResponses] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`cdd_v2_convoc_${matchId}`) || '{}'); }
    catch (e) { return {}; }
  });
  useEffect(() => {
    if (!window.cddSync?.watchConvocResponses) return;
    const unsubscribe = window.cddSync.watchConvocResponses(matchId, (r) => setParentResponses(r));
    return () => { try { unsubscribe?.(); } catch (e) {} };
  }, [matchId]);
  const convocIds = [...(CDD_CONVO?.starters || []), ...(CDD_CONVO?.bench || [])];
  const respondedCount = convocIds.filter(id => parentResponses[id]).length;
  const pendingCount = convocIds.length - respondedCount;

  // Filtrage des tiles par rôle effectif (2026-05-24).
  // Coach/Owner/Adjoint/Admin voient tout. Parent/Joueur/Lecteur n'ont que
  // les tiles pertinentes (pas de Prépa, pas d'Effectif, pas de Compo, etc.)
  const _role = (window.CDD_ROLES?.effectiveRole?.()) || 'coach';
  const isCoachLike = ['owner', 'coach', 'adjoint', 'admin'].includes(_role);
  const isOwnerLike = ['owner', 'coach', 'admin'].includes(_role);
  const isParent    = _role === 'parent';
  const isJoueur    = _role === 'joueur';
  const isLecteur   = _role === 'lecteur';
  // Tile Vote / Mon club / Carnet : utile pour tout membre actif (pas lecteur seul).
  const canSeeMembership = isCoachLike || isParent || isJoueur;

  return (
    <div className="scr scr-home fade-in" data-screen-label="01 Home">

      {/* Alerte présences : visible quand match dans <= 7j ET parents pas tous répondu */}
      {/* Bandeau 'X parents pas répondu' — réservé aux coachs (action de relance). */}
      {isCoachLike && !liveMatch && pendingCount > 0 && next && !next.noUpcoming && (next.daysLeft || 0) <= 7 && (
        <button onClick={() => go('convocations')}
                style={{
                  width:'calc(100% - 28px)', margin:'14px 14px 0',
                  padding:'11px 14px', borderRadius:12,
                  background:'rgba(249,115,22,0.10)',
                  color:'#fff', border:'1px solid rgba(249,115,22,0.35)',
                  cursor:'pointer', display:'flex', alignItems:'center', gap:10,
                  textAlign:'left', fontFamily:'inherit',
                }}>
          <span style={{fontSize:20}}>📣</span>
          <span style={{flex:1, minWidth:0}}>
            <div style={{fontSize:13, fontWeight:800, color:'#f97316', lineHeight:1.3}}>
              {pendingCount} parent{pendingCount>1?'s':''} pas encore répondu
            </div>
            <div style={{fontSize:11, opacity:0.7, marginTop:1}}>
              Match {next.daysLeft > 0 ? `dans ${next.daysLeft}j` : 'imminent'} · tap pour relancer en 1 click
            </div>
          </span>
          <span style={{fontSize:18, opacity:0.7, flexShrink:0}}>→</span>
        </button>
      )}

      {/* Bouton REPRENDRE match en cours (#20) */}
      {liveMatch && (() => {
        // ── Résolution robuste du logo du match en cours.
        // 1. liveMatch.tA.logoDataUrl (snapshot dans le match si on l'a)
        // 2. liveMatch.clubId (vrai chemin propre)
        // 3. Fallback : chercher dans arb_clubs par nom (cas des matchs
        //    crees avant le multi-club, qui n'ont pas de clubId stocke)
        // 4. Fallback ultime : club actif courant
        const resolveLiveLogo = () => {
          if (liveMatch.tA && liveMatch.tA.logoDataUrl) return liveMatch.tA.logoDataUrl;
          if (liveMatch.clubId && window.CDD_LOGO?.getForClub) {
            const byId = window.CDD_LOGO.getForClub(liveMatch.clubId);
            if (byId) return byId;
          }
          const tName = (liveMatch.tA && liveMatch.tA.n) || '';
          if (tName) {
            try {
              const clubs = JSON.parse(localStorage.getItem('arb_clubs') || '[]');
              // Match par nom complet OU par short. Tolérant à la casse.
              const norm = (s) => (s || '').toLowerCase().trim();
              const found = clubs.find(c => norm(c.name) === norm(tName) || norm(c.short) === norm(tName));
              if (found && window.CDD_LOGO?.getForClub) {
                const byName = window.CDD_LOGO.getForClub(found.id);
                if (byName) return byName;
              }
            } catch (e) {}
          }
          // Dernier fallback : logo du club actif (utile en mono-club)
          if (window.CDD_LOGO?.getForActiveClub) {
            return window.CDD_LOGO.getForActiveClub();
          }
          return null;
        };
        const resolveLiveClubId = () => {
          if (liveMatch.clubId) return liveMatch.clubId;
          const tName = (liveMatch.tA && liveMatch.tA.n) || '';
          if (tName) {
            try {
              const clubs = JSON.parse(localStorage.getItem('arb_clubs') || '[]');
              const norm = (s) => (s || '').toLowerCase().trim();
              const found = clubs.find(c => norm(c.name) === norm(tName) || norm(c.short) === norm(tName));
              if (found) return found.id;
            } catch (e) {}
          }
          return null;
        };
        const liveLogo = resolveLiveLogo();
        const liveClubId = resolveLiveClubId();
        return (
        <button onClick={() => go('match')}
                style={{
                  width:'calc(100% - 28px)', margin:'14px',
                  padding:'14px 16px', borderRadius:14,
                  background:'linear-gradient(135deg, #ef4444, #dc2626)',
                  color:'#fff', border:'none', cursor:'pointer',
                  display:'flex', alignItems:'center', gap:12,
                  boxShadow:'0 6px 20px rgba(239,68,68,.4)',
                  textAlign:'left', fontFamily:'inherit',
                }}>
          {window.ClubBadge ? (
            <span style={{position:'relative', display:'inline-block', flexShrink:0}}>
              <window.ClubBadge clubId={liveClubId}
                                clubName={(liveMatch.tA && liveMatch.tA.n) || '?'}
                                colors={[liveMatch.tA?.c || '#fff', liveMatch.tA?.c2 || '#0a0e14']}
                                forceLogo={liveLogo}
                                size={42} shape="square"/>
              {/* Petit point rouge "live" en pulsation sur le coin */}
              <span style={{
                position:'absolute', top:-3, right:-3,
                width:12, height:12, borderRadius:6,
                background:'#fff', border:'2px solid #dc2626',
                boxShadow:'0 0 0 2px rgba(255,255,255,0.4)',
              }}/>
            </span>
          ) : (
            <span style={{fontSize:28, flexShrink:0}}>🔴</span>
          )}
          <span style={{flex:1, minWidth:0}}>
            <div style={{fontSize:11, fontWeight:800, letterSpacing:'.12em', opacity:.8}}>
              MATCH EN COURS
            </div>
            <div style={{fontSize:15, fontWeight:900, marginTop:2}}>
              {(liveMatch.tA && liveMatch.tA.n) || 'Mon équipe'} {liveMatch.sA||0} - {liveMatch.sB||0} {(liveMatch.tB && liveMatch.tB.n) || 'Adversaire'}
            </div>
            <div style={{fontSize:11, opacity:.85, marginTop:2}}>
              ▶ REPRENDRE LE MATCH
            </div>
          </span>
        </button>
        );
      })()}

      {/* HERO — next match avec visuel coach jour/nuit auto */}
      <div className={`home-hero hero-${tweaks.hero}`}>
        <div className="home-hero-bg" style={{
          backgroundImage: `url(${pickCoachVisual()})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.7
        }} />
        <div className="home-hero-grad" />
        <div className="home-hero-noise" />

        <div className="home-hero-top">
          <div className="chip live">{`J-${next.daysLeft} · À VENIR`}</div>
          <button className="hero-share" aria-label="Partager" onClick={() => go("share")}>↗</button>
        </div>

        {/* Affichage : MON CLUB toujours à gauche, ADVERSAIRE à droite,
            peu importe le venue (home/away). Évite la confusion 'FCMH vs FCMH'
            quand on joue à l'extérieur (next.home n'est alors PAS notre club). */}
        {(() => {
          const myClubLabel = club.short || club.name || next.myClubName || 'MON CLUB';
          const oppLabel = next.opponentName
                        || (next.venue === 'Domicile' ? next.away : next.home)
                        || 'À venir';
          const oppLogo = next.opponentLogo
                       || (next.venue === 'Domicile' ? next.awayLogoDataUrl : next.homeLogoDataUrl)
                       || null;
          return (
            <div className="home-hero-vs">
              <div className="hero-club hero-club-home">
                {window.ClubBadge ? (
                  <window.ClubBadge clubId={window.CDD?.getActiveClub?.()?.id}
                                    clubName={myClubLabel}
                                    colors={club.colors}
                                    size={56} shape="square"/>
                ) : (
                  <div className="hero-badge me" aria-hidden="true">{(myClubLabel || 'F')[0]}</div>
                )}
                <div className="hero-club-name">{myClubLabel}</div>
              </div>
              <div className="hero-vs">
                <span>VS</span>
                <div className="hero-when num">{next.date}</div>
              </div>
              <div className="hero-club hero-club-away">
                {window.ClubBadge ? (
                  <window.ClubBadge clubId={null}
                                    clubName={oppLabel}
                                    colors={['#3b82f6','#fff']}
                                    forceLogo={oppLogo}
                                    size={56} shape="square"/>
                ) : (
                  <div className="hero-badge them" aria-hidden="true">{(oppLabel || '?')[0]}</div>
                )}
                <div className="hero-club-name">{oppLabel}</div>
              </div>
            </div>
          );
        })()}

        <div className="home-hero-meta">
          <span>{next.venue}</span>
          <span className="sep">•</span>
          <span>{next.weather}</span>
        </div>

        <div className="home-hero-cta">
          {isCoachLike ? (
            <button className="btn-cta" onClick={() => go("match-prep")}>
              <span>PRÉPARER LE MATCH</span>
              <span className="arr">→</span>
            </button>
          ) : (isParent || isJoueur) ? (
            <button className="btn-cta" onClick={() => go("lecteur")}>
              <span>VOIR MA CONVOCATION</span>
              <span className="arr">→</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* QUICK TILES — filtrées par rôle. Coach/Owner/Adjoint voient tout.
          Parent/Joueur/Lecteur n'ont que les tiles pertinentes pour eux. */}
      <div className="sec-h"><span className="t">Hub</span><span className="a">Tout en un coup d'œil</span></div>
      <div className="home-tiles home-tiles-grid">
        {isCoachLike && (
          <button className="tile tile-prep" onClick={() => go("prep")}>
            <span className="tile-ic">🧠</span>
            <span className="tile-t">Prépa match</span>
            <span className="tile-s">J-{next.daysLeft} · adversaire</span>
          </button>
        )}
        {isCoachLike && (
          <button className="tile tile-convoc" onClick={() => go("convocations")}>
            <span className="tile-ic">📋</span>
            <span className="tile-t">Convocations</span>
            <span className="tile-s">
              {convocIds.length > 0
                ? <>{respondedCount}/{convocIds.length} répondus{pendingCount > 0 ? <span style={{color:'#f97316', fontWeight:700}}> · {pendingCount} à relancer</span> : null}</>
                : `${CDD_CONVO?.starters.length + CDD_CONVO?.bench.length || 0} convoqués`}
            </span>
          </button>
        )}
        {/* Pour parent/joueur : accès direct à la page lecteur (ma convoc) */}
        {(isParent || isJoueur) && (
          <button className="tile tile-convoc" onClick={() => go("lecteur")}>
            <span className="tile-ic">📋</span>
            <span className="tile-t">Ma convocation</span>
            <span className="tile-s">Réponse présence · infos match</span>
          </button>
        )}
        {isCoachLike && (
          <button className="tile tile-effectif" onClick={() => go("effectif")}>
            <span className="tile-ic">👥</span>
            <span className="tile-t">Effectif</span>
            <span className="tile-s">{CDD_PLAYERS.length} joueurs</span>
          </button>
        )}
        {isCoachLike && (
          <button className="tile tile-lineup" onClick={() => go("lineup")}>
            <span className="tile-ic">⚽</span>
            <span className="tile-t">Compo</span>
            <span className="tile-s">Équipe type saison</span>
          </button>
        )}
        {isCoachLike && (
          <button className="tile tile-match" onClick={() => go("match-prep")}>
            <span className="tile-ic" style={{color:"#ef4444"}}>●</span>
            <span className="tile-t">Prochain match</span>
            <span className="tile-s">Préparer · lancer</span>
          </button>
        )}
        {/* Championnat : visible pour tout le monde (info publique du club) */}
        <button className="tile tile-champ" onClick={() => go("results")}>
          <span className="tile-ic">🏆</span>
          <span className="tile-t">Championnat</span>
          <span className="tile-s">{club.rank ? <>{club.rank}<sup>e</sup> · {club.pts} pts</> : 'FFF live'}</span>
        </button>
        {isCoachLike && (
          <button className="tile tile-fiche" onClick={() => go("effectif")}>
            <span className="tile-ic">📊</span>
            <span className="tile-t">Fiches joueurs</span>
            <span className="tile-s">Stats · obs · niveau</span>
          </button>
        )}
        {canSeeMembership && (
          <button className="tile tile-vote" onClick={() => go("vote")}>
            <span className="tile-ic">⭐</span>
            <span className="tile-t">Vote post-match</span>
            <span className="tile-s">Notes joueurs</span>
          </button>
        )}
        {canSeeMembership && (
          <button className="tile tile-club" onClick={() => go("club")}>
            <span className="tile-ic">🏢</span>
            <span className="tile-t">Mon club</span>
            <span className="tile-s">Stade · contacts</span>
          </button>
        )}
        {isCoachLike && (
          <button className="tile tile-coach" onClick={() => go("coach-profile")}>
            <span className="tile-ic">🪪</span>
            <span className="tile-t">Ma carte coach</span>
            <span className="tile-s">Partageable</span>
          </button>
        )}
      </div>

      {/* SECONDARY tiles — outils & admin. Filtrés par rôle. */}
      <div className="sec-h"><span className="t">{isCoachLike ? 'Partage & Outils' : 'Outils'}</span></div>
      <div className="home-tiles home-tiles-grid">
        {/* Page lecteur — visible pour les coachs (preview parents) ET pour les lecteurs.
            Parent/joueur l'ont déjà via 'Ma convocation' au-dessus. */}
        {(isCoachLike || isLecteur) && (
          <button className="tile tile-lecteur" onClick={() => go("lecteur")}>
            <span className="tile-ic">👀</span>
            <span className="tile-t">{isCoachLike ? 'Page parents' : 'Page lecteur'}</span>
            <span className="tile-s">{isCoachLike ? 'Lecteur public' : 'Convoc · effectif · stats'}</span>
          </button>
        )}
        {isCoachLike && (
          <button className="tile tile-cvp" onClick={() => go("share")}>
            <span className="tile-ic">↗</span>
            <span className="tile-t">Partager</span>
            <span className="tile-s">WhatsApp · SMS · QR</span>
          </button>
        )}
        {isCoachLike && (
          <button className="tile tile-arb" onClick={() => go("arb")}>
            <span className="tile-ic">🟨</span>
            <span className="tile-t">Mode arbitre</span>
            <span className="tile-s">Cartons · chrono</span>
          </button>
        )}
        {isOwnerLike && (
          <button className="tile tile-transfert" onClick={() => go("transfert")}>
            <span className="tile-ic">⇄</span>
            <span className="tile-t">Transfert</span>
            <span className="tile-s">Donner équipe</span>
          </button>
        )}
        {isCoachLike && (
          <button className="tile tile-sync" onClick={() => go("sync")}>
            <span className="tile-ic">☁️</span>
            <span className="tile-t">Sync cloud</span>
            <span className="tile-s">Multi-club · Firestore</span>
          </button>
        )}
        {/* Réglages : tout le monde (chacun gère son compte, préférences, etc.) */}
        <button className="tile tile-set" onClick={() => go("set")}>
          <span className="tile-ic">⚙️</span>
          <span className="tile-t">Réglages</span>
          <span className="tile-s">Apparence · sons</span>
        </button>
      </div>

      {/* SEASON SNAPSHOT */}
      <div className="sec-h"><span className="t">Saison · ranking</span><button className="a" onClick={() => go("results")}>Voir tout</button></div>
      <div className="snap-card">
        <div className="snap-rank">
          <div className="snap-rank-n num">{club.rank}<sup>e</sup></div>
          <div className="snap-rank-l">{club.league}</div>
        </div>
        <div className="snap-grid">
          <div><b className="num">{club.played}</b><em>J</em></div>
          <div><b className="num">{club.W}</b><em>V</em></div>
          <div><b className="num">{club.D}</b><em>N</em></div>
          <div><b className="num">{club.L}</b><em>D</em></div>
          <div><b className="num">{club.gf}:{club.ga}</b><em>BUTS</em></div>
          <div><b className="num">{club.pts}</b><em>PTS</em></div>
        </div>
        <div className="snap-form">
          <span className="snap-form-l">FORME</span>
          {club.form.map((r,i) => <FormDot key={i} r={r}/>)}
        </div>
      </div>

      {/* TOP PERFORMERS */}
      <div className="sec-h"><span className="t">Tops du moment</span><button className="a" onClick={() => go("effectif")}>Effectif →</button></div>
      <div className="home-tops">
        {topScorer && <FutCard player={topScorer} size="md" onClick={() => go("fiche", topScorer)} />}
        {topAssist && <FutCard player={topAssist} size="md" onClick={() => go("fiche", topAssist)} />}
      </div>

      {/* DERNIERS MATCHS — inclut désormais les matchs arbitrés par le coach
          (avec date + type) en plus des matchs FFF officiels */}
      <div className="sec-h"><span className="t">Derniers matchs</span><button className="a" onClick={() => go("results")}>Tous →</button></div>
      <div className="lm-list">
        {last.slice(0, 5).map((m,i) => {
          const typeLabels = {
            championnat: { l: 'Champ.', c: '#c8f169' },
            coupe:       { l: 'Coupe',  c: '#fbbf24' },
            amical:      { l: 'Amical', c: '#94a3b8' },
            entrainement:{ l: 'Entr.',  c: '#94a3b8' },
            tournoi:     { l: 'Tournoi',c: '#a78bfa' },
          };
          const typ = typeLabels[m.matchType] || typeLabels.amical;
          // Normalise le résultat W/D/L (FFF) vers V/N/D (français)
          const resultFR = m.result === 'W' ? 'V' : m.result === 'L' ? 'D' : m.result === 'D' ? 'N' : m.result;
          return (
            <button className={`lm-card lm-${(m.result || '').toLowerCase()}`} key={m.id || i}
                    onClick={() => go("fiche-match")}>
              <div className="lm-result"><FormDot r={resultFR} big/></div>
              <div className="lm-main">
                <div className="lm-opp">
                  <span className="lm-venue">{m.venue}</span>
                  <span className="lm-club">{m.opp}</span>
                </div>
                <div style={{display:'flex', alignItems:'center', gap:6, marginTop:2}}>
                  <span style={{
                    fontSize:9, fontWeight:800, letterSpacing:'.06em',
                    padding:'2px 6px', borderRadius:5,
                    background: typ.c + '20', color: typ.c, border:`1px solid ${typ.c}40`,
                  }}>{typ.l}</span>
                  {m.scorers && m.scorers.length > 0 && (
                    <span className="lm-scorers" style={{fontSize:10, opacity:0.7}}>
                      {m.scorers.slice(0, 3).join(' · ')}{m.scorers.length > 3 ? '…' : ''}
                    </span>
                  )}
                </div>
              </div>
              <div className="lm-score num">
                <span>{m.score[0]}</span><i>–</i><span>{m.score[1]}</span>
              </div>
              <div className="lm-date">{m.date}</div>
            </button>
          );
        })}
        {last.length === 0 && (
          <div style={{
            padding:'16px', textAlign:'center', fontSize:12, opacity:0.55,
            background:'rgba(255,255,255,0.03)', borderRadius:10,
          }}>
            Aucun match joué encore — termine ton premier match pour le voir ici.
          </div>
        )}
      </div>

    </div>
  );
}

window.ScreenHome = ScreenHome;
