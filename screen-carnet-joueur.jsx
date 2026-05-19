/* global React, CDD_PLAYERS, CDD_CLUB, FutCard, POSITION_LABEL */

/* ============================================================
   SCREEN — Carnet du joueur (v0)
   ============================================================
   Vue dédiée au JOUEUR (enfant). Accessible par lien magique :
   https://coach-du-dimanche.app/?carnet=PLAYER_ID
   ou via la section "Mes joueurs" du coach (qui voit la vue à leur place).

   Sections v0 :
   1. Sa carte FUT plein écran (FutCard size=xl)
   2. Sa progression OVR sur la saison (calculée depuis cdd_player_perf_deltas)
   3. Ses derniers matchs (depuis CDD_COACH.getPerfDeltaHistory)
   4. Ses badges débloqués (calcul à la volée depuis l'historique perf)
   5. Bouton "Partager ma carte"

   Pas d'auth pour v0 — le lien magique fait foi.
   Itérations futures : page parents/coach pour générer le lien,
   notifications push but/MVP, vue stats détaillées.
   ============================================================ */

const { useState: useStateCJ, useMemo: useMemoCJ } = React;

function ScreenCarnetJoueur({ go, playerId }) {
  // Résolution du joueur : prop > URL ?carnet=ID > fallback premier titulaire
  const resolvedId = (() => {
    if (playerId) return playerId;
    try {
      const params = new URLSearchParams(window.location.search || '');
      return params.get('carnet') || params.get('joueur') || null;
    } catch (e) { return null; }
  })();
  const player = useMemoCJ(() => {
    if (resolvedId) {
      const found = (window.CDD_PLAYERS || []).find(p => p.id === resolvedId);
      if (found) return found;
    }
    // Démo : premier titulaire
    return (window.CDD_PLAYERS || []).find(p => p.isStarter) || (window.CDD_PLAYERS || [])[0];
  }, [resolvedId]);

  if (!player) {
    return (
      <div style={{padding:'40px 20px', textAlign:'center', color:'#fff'}}>
        <div style={{fontSize:48, marginBottom:12}}>🤷</div>
        <h2 style={{margin:'0 0 8px'}}>Joueur introuvable</h2>
        <p style={{opacity:0.7, fontSize:13}}>
          Vérifie le lien magique ou demande à ton coach un nouveau lien.
        </p>
      </div>
    );
  }

  // Historique des deltas de perf → liste matchs + évolution OVR
  const deltaHistory = (window.CDD_COACH?.getPerfDeltaHistory?.(player.id)) || [];
  const totalDelta = (window.CDD_COACH?.getPerfDeltaSum?.(player.id)) || { PAC:0, SHO:0, PAS:0, DRI:0, DEF:0, PHY:0 };
  const ovrDelta = Math.round((totalDelta.PAC + totalDelta.SHO + totalDelta.PAS + totalDelta.DRI + totalDelta.DEF + totalDelta.PHY) / 6 * 10) / 10;

  // Stats agrégées saison
  const seasonStats = deltaHistory.reduce((acc, d) => ({
    goals:   acc.goals   + (d.goals || 0),
    assists: acc.assists + (d.assists || 0),
    yellows: acc.yellows + (d.yellows || 0),
    reds:    acc.reds    + (d.reds || 0),
    matches: acc.matches + 1,
  }), { goals:0, assists:0, yellows:0, reds:0, matches:0 });

  // Badges débloqués (v0 : 6 badges hardcodés)
  const badges = computeBadges(deltaHistory, seasonStats, ovrDelta);

  // Partage
  const shareCard = async () => {
    const club = window.CDD_CLUB || {};
    const text = `🎴 La carte de ${player.first} ${player.last || ''}\n`
               + `${club.name || 'Mon club'} · OVR ${player.stats?.ovr || '?'}\n`
               + `${seasonStats.matches} matchs · ${seasonStats.goals} buts · ${seasonStats.assists} passes\n\n`
               + `Voir ma carte : ${window.location.origin}/?carnet=${player.id}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Ma carte', text }); return; } catch (e) {}
    }
    try { await navigator.clipboard.writeText(text); alert('Lien copié !'); } catch (e) {}
  };

  return (
    <div className="scr scr-carnet fade-in" data-screen-label="20 Carnet joueur" style={{
      background:'linear-gradient(180deg, #0a1018 0%, #0B1320 100%)', minHeight:'100vh',
      color:'#fff', paddingBottom:80,
    }}>
      {/* Header simple */}
      <div style={{
        padding:'18px 16px 12px', display:'flex', alignItems:'center', gap:10,
      }}>
        {go && (
          <button onClick={() => go('home')} style={{
            background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)',
            color:'#fff', width:36, height:36, borderRadius:18, cursor:'pointer', fontSize:16,
          }}>‹</button>
        )}
        <div style={{flex:1}}>
          <div style={{fontSize:10, fontWeight:800, letterSpacing:'.12em', opacity:0.55, textTransform:'uppercase'}}>
            Mon carnet
          </div>
          <div style={{fontSize:18, fontWeight:900, letterSpacing:'-.02em'}}>
            {player.first} {player.last || ''}
          </div>
        </div>
        <button onClick={shareCard} style={{
          background:'rgba(200,241,105,0.12)', border:'1px solid rgba(200,241,105,0.35)',
          color:'#c8f169', padding:'8px 14px', borderRadius:18, cursor:'pointer',
          fontSize:12, fontWeight:800, display:'flex', alignItems:'center', gap:4,
        }}>↗ Partager</button>
      </div>

      {/* Section 1 : Carte FUT plein écran */}
      <div style={{
        padding:'10px 16px 20px', display:'flex', justifyContent:'center',
        background:'radial-gradient(ellipse at top, rgba(200,241,105,0.10), transparent 60%)',
      }}>
        {window.FutCard ? (
          <FutCard player={player} variant="fut" size="xl"/>
        ) : (
          <div style={{padding:30, opacity:0.5}}>Carte indisponible</div>
        )}
      </div>

      {/* Section 2 : Progression OVR */}
      {ovrDelta !== 0 && (
        <div style={{margin:'0 16px 16px'}}>
          <div style={{
            padding:'14px 16px', borderRadius:14,
            background: ovrDelta > 0 ? 'rgba(200,241,105,0.10)' : 'rgba(255,107,107,0.10)',
            border: `1px solid ${ovrDelta > 0 ? 'rgba(200,241,105,0.30)' : 'rgba(255,107,107,0.30)'}`,
            display:'flex', alignItems:'center', gap:12,
          }}>
            <div style={{fontSize:32}}>{ovrDelta > 0 ? '📈' : '📉'}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:10, fontWeight:800, letterSpacing:'.12em', opacity:0.7, textTransform:'uppercase'}}>
                Ta progression
              </div>
              <div style={{fontSize:14, fontWeight:700, marginTop:2}}>
                Tu as gagné <b style={{color: ovrDelta > 0 ? '#c8f169' : '#ff6b6b'}}>
                  {ovrDelta > 0 ? '+' : ''}{ovrDelta}
                </b> sur ton OVR depuis le début de la saison
              </div>
              <div style={{fontSize:11, opacity:0.6, marginTop:2}}>
                Sur {deltaHistory.length} match{deltaHistory.length>1?'s':''} joué{deltaHistory.length>1?'s':''}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 3 : Stats saison */}
      <div style={{margin:'0 16px 16px'}}>
        <SectionTitle>📊 Ma saison</SectionTitle>
        <div style={{
          display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:8, marginTop:8,
        }}>
          <StatCard value={seasonStats.matches} label="Matchs" color="#fff"/>
          <StatCard value={seasonStats.goals} label="Buts" color="#c8f169"/>
          <StatCard value={seasonStats.assists} label="Passes" color="#fbbf24"/>
          <StatCard value={seasonStats.yellows + seasonStats.reds * 2} label="Cartons" color="#ff6b6b"/>
        </div>
      </div>

      {/* Section 4 : Mes badges */}
      <div style={{margin:'0 16px 16px'}}>
        <SectionTitle>🏆 Mes badges</SectionTitle>
        {badges.length === 0 ? (
          <div style={{
            marginTop:8, padding:'18px 14px', borderRadius:12,
            background:'rgba(255,255,255,0.04)', border:'1px dashed rgba(255,255,255,0.12)',
            textAlign:'center', fontSize:13, color:'rgba(255,255,255,0.55)',
          }}>
            Aucun badge encore débloqué.<br/>
            <span style={{fontSize:11, opacity:0.7}}>Joue ton premier match pour commencer !</span>
          </div>
        ) : (
          <div style={{
            display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8, marginTop:8,
          }}>
            {badges.map(b => (
              <div key={b.id} style={{
                padding:'14px 8px', borderRadius:12,
                background:`linear-gradient(135deg, ${b.color}20, transparent)`,
                border:`1px solid ${b.color}50`,
                textAlign:'center',
              }}>
                <div style={{fontSize:28}}>{b.icon}</div>
                <div style={{fontSize:11, fontWeight:800, color:b.color, marginTop:4, letterSpacing:'.02em'}}>
                  {b.label}
                </div>
                <div style={{fontSize:9, opacity:0.6, marginTop:2}}>{b.desc}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 5 : Mes derniers matchs */}
      <div style={{margin:'0 16px 16px'}}>
        <SectionTitle>⚽ Mes derniers matchs</SectionTitle>
        {deltaHistory.length === 0 ? (
          <div style={{
            marginTop:8, padding:'18px 14px', borderRadius:12,
            background:'rgba(255,255,255,0.04)', border:'1px dashed rgba(255,255,255,0.12)',
            textAlign:'center', fontSize:13, color:'rgba(255,255,255,0.55)',
          }}>
            Aucun match enregistré pour l'instant.
          </div>
        ) : (
          <div style={{marginTop:8, display:'flex', flexDirection:'column', gap:6}}>
            {deltaHistory.slice(0, 8).map((d, i) => (
              <div key={i} style={{
                padding:'10px 12px', borderRadius:10,
                background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
                display:'flex', alignItems:'center', gap:10,
              }}>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:13, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                    vs {d.opp || '?'}
                  </div>
                  <div style={{fontSize:10, opacity:0.55, marginTop:1}}>
                    {d.matchDate ? new Date(d.matchDate).toLocaleDateString('fr-FR', {day:'numeric', month:'short'}) : ''}
                  </div>
                </div>
                <div style={{display:'flex', gap:8, fontSize:11, fontWeight:700}}>
                  {d.goals > 0 && <span style={{color:'#c8f169'}}>⚽×{d.goals}</span>}
                  {d.assists > 0 && <span style={{color:'#fbbf24'}}>🅰️×{d.assists}</span>}
                  {d.yellows > 0 && <span style={{color:'#fbbf24'}}>🟨</span>}
                  {d.reds > 0 && <span style={{color:'#ff6b6b'}}>🟥</span>}
                  {d.voteAvg != null && <span style={{color:'#c8f169'}}>⭐{d.voteAvg.toFixed(1)}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer mini */}
      <div style={{
        textAlign:'center', fontSize:10, opacity:0.4, padding:'20px 16px 8px',
      }}>
        Ton carnet ⚽ Coach du Dimanche
      </div>
    </div>
  );
}

// ─── Helpers UI ───
function SectionTitle({ children }) {
  return (
    <div style={{
      fontSize:11, fontWeight:800, letterSpacing:'.12em', color:'rgba(255,255,255,0.55)',
      textTransform:'uppercase',
    }}>{children}</div>
  );
}

function StatCard({ value, label, color }) {
  return (
    <div style={{
      padding:'12px 6px', borderRadius:10,
      background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
      textAlign:'center',
    }}>
      <div style={{fontSize:22, fontWeight:900, color, fontVariantNumeric:'tabular-nums'}}>{value}</div>
      <div style={{fontSize:9, opacity:0.6, marginTop:2, letterSpacing:'.05em', textTransform:'uppercase'}}>{label}</div>
    </div>
  );
}

// ─── Badges calculés depuis l'historique perf ───
// v0 : 6 badges simples. À enrichir plus tard (capitaine, fair-play, etc.)
function computeBadges(history, seasonStats, ovrDelta) {
  const badges = [];
  if (seasonStats.goals >= 1) badges.push({ id:'first-goal', icon:'⚽', label:'1ER BUT', color:'#c8f169', desc:'Marqué cette saison' });
  if (history.some(d => d.goals >= 3)) badges.push({ id:'hat-trick', icon:'🎩', label:'HAT-TRICK', color:'#fbbf24', desc:'3 buts dans un match' });
  if (history.some(d => d.goals === 2)) badges.push({ id:'double', icon:'⚡', label:'DOUBLÉ', color:'#fbbf24', desc:'2 buts dans un match' });
  if (seasonStats.assists >= 3) badges.push({ id:'playmaker', icon:'🎯', label:'MENEUR', color:'#3b82f6', desc:'3+ passes décisives' });
  if (seasonStats.matches >= 5 && seasonStats.reds === 0) badges.push({ id:'fairplay', icon:'🤝', label:'FAIR-PLAY', color:'#10b981', desc:'5 matchs sans rouge' });
  if (ovrDelta >= 2) badges.push({ id:'rising', icon:'🚀', label:'EN PROGRESSION', color:'#c8f169', desc:'+2 OVR cette saison' });
  if (history.some(d => d.voteAvg >= 4.5)) badges.push({ id:'mvp', icon:'🌟', label:'HOMME DU MATCH', color:'#fbbf24', desc:'Élu MVP par tes parents' });
  return badges.slice(0, 9); // max 3 lignes de 3
}

window.ScreenCarnetJoueur = ScreenCarnetJoueur;
