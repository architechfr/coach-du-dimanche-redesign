/* global React, CDD_NEXT_MATCH, CDD_CONVO, CDD_CLUB, POSITION_LABEL */
/* ============================================================
   SCREEN — Page Match dédiée (préparation du prochain match)
   ============================================================
   Hub centralisé accessible depuis l'Accueil. Regroupe :
   - Header match (adversaire, date, heure, badge amical)
   - Checklist de préparation (4 items binaires)
   - Grille d'actions rapides (Infos, Compo, Numéros, Vestiaire, Convocs)
   - Bouton primaire LANCER LE MATCH

   Évite au coach de naviguer entre 4-5 écrans pour préparer un match.
   ============================================================ */

const { useState: useStateMP, useEffect: useEffectMP } = React;

function ScreenMatchPrep({ go, tweaks }) {
  const next = window.CDD_NEXT_MATCH || {};
  const conv = window.CDD_CONVO || { starters: [], bench: [], absent: [] };
  const club = window.CDD_CLUB || {};
  const teamId = window.CDD?.getActiveTeam?.()?.id;
  const clubId = window.CDD?.getActiveTeam?.()?.clubId || null;
  const matchId = next.id || 'placeholder';
  const noUpcoming = next.noUpcoming || !next.away || next.away === 'À déterminer';

  // Modales locales (réutilisent les composants existants)
  const [matchInfoOpen, setMatchInfoOpen] = useStateMP(false);
  const [jerseyOpen, setJerseyOpen] = useStateMP(false);
  const [friendlyOpen, setFriendlyOpen] = useStateMP(null); // null | 'create' | 'edit'

  // Re-render quand les données du match changent (cdd-data-rebuilt, friendly, jersey, info)
  const [, forceRender] = useStateMP({});
  useEffectMP(() => {
    const h = () => forceRender({});
    window.addEventListener('cdd-data-rebuilt', h);
    window.addEventListener('cdd-friendly-changed', h);
    window.addEventListener('cdd-match-info-changed', h);
    window.addEventListener('cdd-jersey-changed', h);
    window.addEventListener('cdd-active-match-changed', h);
    return () => {
      window.removeEventListener('cdd-data-rebuilt', h);
      window.removeEventListener('cdd-friendly-changed', h);
      window.removeEventListener('cdd-match-info-changed', h);
      window.removeEventListener('cdd-jersey-changed', h);
      window.removeEventListener('cdd-active-match-changed', h);
    };
  }, []);

  // Liste des matchs à venir (FFF + amicaux) pour le sélecteur multi-matchs.
  const upcomingMatches = (teamId && window.CDD_MATCH_SWITCHER?.listUpcoming)
    ? window.CDD_MATCH_SWITCHER.listUpcoming(teamId)
    : [];

  // ── Statut préparation ────────────────────────────────────────
  const hasMatchInfo = teamId && window.CDD_MATCH_INFO?.hasAny?.(teamId, matchId);
  const hasJerseys   = teamId && window.CDD_JERSEY?.hasOverrides?.(teamId, matchId);
  const hasMatchLineup = (() => {
    if (!teamId) return false;
    try {
      const all = JSON.parse(localStorage.getItem('cdd_match_lineup') || '{}');
      const ml = all[teamId] && all[teamId][matchId];
      return !!(ml && ml.starters && Object.keys(ml.starters).length >= 11);
    } catch (e) { return false; }
  })();
  // Réponses parents
  const parentResponses = (() => {
    try {
      const _mid = (typeof window.cddSync !== 'undefined' && window.cddSync.matchId) || 'demo';
      return JSON.parse(localStorage.getItem(`cdd_v2_convoc_${_mid}`) || '{}');
    } catch (e) { return {}; }
  })();
  const convoIds = [...(conv.starters || []), ...(conv.bench || [])];
  const responded = convoIds.filter(id => parentResponses[id]).length;
  const respPct = convoIds.length > 0 ? Math.round(100 * responded / convoIds.length) : 0;
  const hasEnoughResponses = convoIds.length > 0 && respPct >= 80;

  // Capacité d'édition
  const _baseCanEdit = !window.CDD_ROLES || !window.CDD_ROLES.canDo
    || window.CDD_ROLES.canDo('compo');
  // VERROU pendant match en cours : les actions "préparation" (infos, compo,
  // numéros, lancer) sont gelées pour éviter d'écraser le live qui tourne.
  const _liveMatch = (window.MATCH_HELPERS && window.MATCH_HELPERS.getLiveMatch)
    ? window.MATCH_HELPERS.getLiveMatch() : null;
  const _matchInProgress = !!_liveMatch;
  const canEdit = _baseCanEdit && !_matchInProgress;

  // ── Helpers UI ────────────────────────────────────────────────
  const ChecklistItem = ({ ic, label, sub, done, onClick }) => (
    <button onClick={onClick} disabled={!onClick}
      style={{
        display:'grid', gridTemplateColumns:'28px 1fr auto', gap:10, alignItems:'center',
        padding:'10px 12px', borderRadius:10, cursor: onClick ? 'pointer' : 'default',
        background: done ? 'rgba(200,241,105,0.08)' : 'rgba(255,170,40,0.06)',
        border: '1px solid ' + (done ? 'rgba(200,241,105,0.30)' : 'rgba(255,170,40,0.30)'),
        color:'#fff', fontFamily:'inherit', textAlign:'left', width:'100%',
      }}>
      <span style={{fontSize:20, lineHeight:1}}>{done ? '✅' : '⚠️'}</span>
      <div style={{minWidth:0}}>
        <div style={{fontSize:13, fontWeight:800}}>{label}</div>
        {sub && <div style={{fontSize:11, opacity:0.7, marginTop:2, lineHeight:1.35}}>{sub}</div>}
      </div>
      {onClick && <span style={{opacity:0.5, fontSize:14, color: done ? '#c8f169' : '#ffc788'}}>›</span>}
    </button>
  );
  const ActionTile = ({ ic, label, sub, color, onClick }) => (
    <button onClick={onClick}
      style={{
        padding:'14px 12px', borderRadius:12, cursor:'pointer',
        background:'rgba(255,255,255,0.04)',
        border:'1px solid rgba(255,255,255,0.10)',
        color:'#fff', fontFamily:'inherit',
        display:'flex', flexDirection:'column', alignItems:'center', gap:8,
        minHeight:96, textAlign:'center',
      }}>
      <span style={{fontSize:28, color: color || '#fff'}}>{ic}</span>
      <span style={{fontSize:11, fontWeight:800, letterSpacing:'.04em'}}>{label}</span>
      {sub && <span style={{fontSize:10, opacity:0.6, lineHeight:1.3}}>{sub}</span>}
    </button>
  );

  // Si pas de match → invitation à en créer un (amical)
  if (noUpcoming) {
    return (
      <div className="scr scr-prep fade-in" data-screen-label="Page match — vide">
        <div style={{padding:'28px 18px', textAlign:'center'}}>
          <div style={{fontSize:56, marginBottom:14}}>📅</div>
          <div style={{fontSize:20, fontWeight:900, marginBottom:8}}>
            Aucun match à préparer
          </div>
          <div style={{fontSize:13, opacity:0.65, lineHeight:1.5, marginBottom:24, maxWidth:340, margin:'0 auto 24px'}}>
            Le prochain match du championnat n'est pas encore connu, ou tu n'as pas
            programmé de match amical. Tu peux en créer un dès maintenant.
          </div>
          {canEdit && (
            <button onClick={() => setFriendlyOpen('create')}
              style={{
                padding:'13px 22px', borderRadius:11, cursor:'pointer',
                background:'rgba(168,85,247,0.12)', color:'#c4b5fd',
                border:'1px solid rgba(168,85,247,0.45)',
                fontSize:14, fontWeight:800, letterSpacing:'.04em',
                display:'inline-flex', alignItems:'center', gap:8,
              }}>
              🤝 + Créer un match amical
            </button>
          )}
        </div>
        {friendlyOpen && window.FriendlyMatchModal && teamId && (
          <window.FriendlyMatchModal
            teamId={teamId} clubId={clubId}
            existing={null}
            onClose={() => setFriendlyOpen(null)}
            onSaved={() => setFriendlyOpen(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="scr scr-prep fade-in" data-screen-label="Page match">

      {/* Bandeau VERROUILLAGE — un match est lancé, on bascule sur le live */}
      {_matchInProgress && _baseCanEdit && (
        <div style={{
          margin:'10px 14px 0', padding:'11px 14px', borderRadius:10,
          background:'rgba(249,115,22,0.10)',
          border:'1px solid rgba(249,115,22,0.45)',
          color:'#fbbf24', fontSize:12.5, fontWeight:700,
          display:'flex', alignItems:'center', gap:10, flexWrap:'wrap',
        }}>
          <span style={{fontSize:18}}>🔒</span>
          <span style={{flex:1, minWidth:0}}>
            <b>Match en cours</b> — la préparation est verrouillée. Termine le match d'abord.
          </span>
          <button type="button" onClick={() => go && go('match')}
            style={{
              padding:'7px 12px', borderRadius:7, cursor:'pointer',
              background:'rgba(249,115,22,0.18)', color:'#fbbf24',
              border:'1px solid rgba(249,115,22,0.40)',
              fontSize:11.5, fontWeight:800, fontFamily:'inherit',
              whiteSpace:'nowrap',
            }}>▶ Aller au match</button>
        </div>
      )}

      {/* HEADER — Match info */}
      <div className="cv-hero">
        <div className="cv-hero-bg"/>
        <div className="cv-hero-grad"/>
        <div className="cv-hero-in">
          <div className="cv-hero-k" style={{display:'flex', alignItems:'center', gap:8, flexWrap:'wrap'}}>
            <span>PROCHAIN MATCH</span>
            {next.isAmical && (
              <span style={{
                fontSize:9.5, padding:'2px 8px', borderRadius:10,
                background:'rgba(168,85,247,0.18)', color:'#c4b5fd',
                border:'1px solid rgba(168,85,247,0.45)',
                fontWeight:800, letterSpacing:'.08em',
              }}>🤝 AMICAL</span>
            )}
          </div>
          <div className="cv-hero-title">{next.home}<br/>VS {next.away}</div>
          {(() => {
            // Heure affichée = priorité au coup d'envoi saisi dans
            // "Infos du match" (kickoff), fallback sur l'heure d'origine
            // FFF/amical (next.time). Permet au coach de corriger une
            // heure erronée sans devoir rééditer le match amical.
            const _mInfo = (teamId && matchId && window.CDD_MATCH_INFO?.get)
              ? window.CDD_MATCH_INFO.get(teamId, matchId) : null;
            const _eff = (_mInfo && _mInfo.kickoff) || next.time || '';
            return (
              <div className="cv-hero-meta">
                <span>📅 {next.date}{_eff ? ` · ${_eff}` : ''}</span>
                <span>🏟️ {next.venue}</span>
              </div>
            );
          })()}
          {/* Bouton "Ajouter à mon agenda" — visible pour TOUS (coach, adjoint,
              parent, joueur, lecteur). Génère un .ics téléchargé, ouvert
              automatiquement par l'app calendrier du téléphone (Apple/Google/
              Samsung/Outlook). Alarm 2h avant le match incluse. */}
          {!next.noUpcoming && window.CDD_CAL?.downloadMatchICS && (
            <div style={{marginTop:10}}>
              <button onClick={() => {
                const info = (teamId && matchId && window.CDD_MATCH_INFO?.get)
                  ? window.CDD_MATCH_INFO.get(teamId, matchId) : null;
                window.CDD_CAL.downloadMatchICS(next, info);
              }} style={{
                padding:'10px 16px', borderRadius:10, cursor:'pointer',
                background:'rgba(125,211,252,0.10)', color:'#7dd3fc',
                border:'1px solid rgba(125,211,252,0.40)',
                fontSize:12.5, fontWeight:800, letterSpacing:'.04em',
                fontFamily:'inherit',
                display:'inline-flex', alignItems:'center', gap:8,
              }}>
                📅 Ajouter à mon agenda
              </button>
              <div style={{
                fontSize:10.5, opacity:0.6, marginTop:5, lineHeight:1.4,
              }}>
                Téléchargement d'un fichier .ics · ouvre ton appli calendrier ·
                rappel 2h avant le match
              </div>
            </div>
          )}
          {canEdit && next.isAmical && (
            <div style={{display:'flex', gap:8, marginTop:8, flexWrap:'wrap'}}>
              <button onClick={() => setFriendlyOpen('edit')}
                style={{
                  padding:'8px 14px', borderRadius:9, cursor:'pointer',
                  background:'rgba(168,85,247,0.10)', color:'#c4b5fd',
                  border:'1px solid rgba(168,85,247,0.40)',
                  fontSize:11.5, fontWeight:700, letterSpacing:'.04em',
                  fontFamily:'inherit',
                }}>
                ✎ Éditer le match amical
              </button>
              {/* Bouton "Marquer joué" : permet de retirer un match de la
                  liste "à venir" sans avoir à lancer + finir le live.
                  Utile pour : match annulé, match joué sans l'app, match
                  fictif de test à nettoyer. */}
              <button onClick={() => {
                if (!confirm("Marquer ce match comme joué / terminé ?\n\nIl disparaîtra de la liste \"à venir\" sur l'Accueil et les Convocations.")) return;
                try {
                  // Pour un amical : flag endedAt côté CDD_FRIENDLY (sync cloud)
                  if (next.isAmical && teamId && next.id && window.CDD_FRIENDLY?.markEnded) {
                    window.CDD_FRIENDLY.markEnded(teamId, next.id);
                  }
                  // Pour TOUS : pose dans cdd_match_last_finished pour
                  // déclencher le filtre dans data-bridge / match-switcher.
                  if (next.id) {
                    localStorage.setItem('cdd_match_last_finished', next.id);
                  }
                  if (window.CDD_REBUILD) window.CDD_REBUILD();
                } catch (e) {
                  console.warn('[match-prep] markEnded failed', e);
                  alert("Erreur — réessaie ou supprime le match via 'Éditer'.");
                }
              }}
                style={{
                  padding:'8px 14px', borderRadius:9, cursor:'pointer',
                  background:'rgba(200,241,105,0.10)', color:'#c8f169',
                  border:'1px solid rgba(200,241,105,0.40)',
                  fontSize:11.5, fontWeight:700, letterSpacing:'.04em',
                  fontFamily:'inherit',
                }}>
                ✓ Marquer comme joué
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SÉLECTEUR multi-matchs (visible seulement si >1 match upcoming) */}
      {upcomingMatches.length > 1 && (
        <div style={{margin:'4px 14px 12px'}}>
          <div style={{
            fontSize:11, fontWeight:900, letterSpacing:'.08em',
            color:'rgba(255,255,255,0.55)', marginBottom:8, textTransform:'uppercase',
          }}>
            Quel match préparer ?
          </div>
          <div style={{display:'flex', gap:6, overflowX:'auto', paddingBottom:4,
                       scrollbarWidth:'thin'}}>
            {upcomingMatches.slice(0, 6).map(m => {
              const active = m.id === next.id;
              const isAmical = m.kind === 'amical';
              const dDisp = (() => {
                const r = /^(\d{4})-(\d{2})-(\d{2})$/.exec(m.dateISO || '');
                return r ? `${r[3]}/${r[2]}` : (m.date || '?').slice(0, 5);
              })();
              return (
                <button key={m.id} type="button"
                  onClick={() => window.CDD_MATCH_SWITCHER?.setActive?.(teamId, m.id)}
                  style={{
                    flexShrink: 0, padding:'8px 12px', borderRadius:9, cursor:'pointer',
                    background: active
                      ? (isAmical ? 'rgba(168,85,247,0.18)' : 'rgba(200,241,105,0.18)')
                      : 'rgba(255,255,255,0.04)',
                    color: active
                      ? (isAmical ? '#c4b5fd' : '#c8f169')
                      : '#fff',
                    border: '1px solid ' + (active
                      ? (isAmical ? 'rgba(168,85,247,0.50)' : 'rgba(200,241,105,0.50)')
                      : 'rgba(255,255,255,0.10)'),
                    fontFamily:'inherit', textAlign:'left',
                    minWidth: 120,
                  }}>
                  <div style={{fontSize:10, fontWeight:800, opacity:active ? 1 : 0.6,
                               letterSpacing:'.06em', textTransform:'uppercase',
                               marginBottom:2,
                               color: isAmical ? (active ? '#c4b5fd' : 'rgba(168,85,247,0.75)') : undefined}}>
                    {isAmical ? '🤝 Amical' : '🏆 Champ.'} · {dDisp}
                  </div>
                  <div style={{fontSize:12, fontWeight:800, whiteSpace:'nowrap',
                               overflow:'hidden', textOverflow:'ellipsis', maxWidth:140}}>
                    {m.venue === 'H' ? 'vs ' : '@ '}{m.opponent}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* CHECKLIST — Statut préparation */}
      <div style={{margin:'4px 14px 12px'}}>
        <div style={{
          fontSize:11, fontWeight:900, letterSpacing:'.08em',
          color:'rgba(255,255,255,0.55)', marginBottom:8, textTransform:'uppercase',
        }}>
          Statut de préparation
        </div>
        <div style={{display:'flex', flexDirection:'column', gap:6}}>
          <ChecklistItem
            ic="📋" label="Infos du match"
            sub={hasMatchInfo ? 'Stade, adresse et horaires renseignés' : 'Stade, adresse, RDV vestiaire, coup d\'envoi à renseigner'}
            done={hasMatchInfo}
            onClick={canEdit ? () => setMatchInfoOpen(true) : null}/>
          <ChecklistItem
            ic="🎯" label="Compo du match"
            sub={hasMatchLineup ? 'Les 11 titulaires sont positionnés' : 'Pose la compo de match (héritera de l\'équipe type)'}
            done={hasMatchLineup}
            onClick={() => go('match-lineup')}/>
          <ChecklistItem
            ic="🔢" label="Numéros maillots du match"
            sub={hasJerseys ? 'Numéros adaptés enregistrés' : 'Vérifie les numéros (utile si dépannage / maillots changés)'}
            done={hasJerseys}
            onClick={canEdit ? () => setJerseyOpen(true) : null}/>
          <ChecklistItem
            ic="📣" label={(() => {
              const audience = window.CDD_TEAM_HELPERS?.activeTeamIsAdult?.() ? 'joueurs' : 'parents';
              return `Convocations ${audience} · ${responded}/${convoIds.length || 0}`;
            })()}
            sub={convoIds.length === 0
              ? 'Pose d\'abord la compo'
              : hasEnoughResponses
                ? `${respPct}% des ${window.CDD_TEAM_HELPERS?.activeTeamIsAdult?.() ? 'joueurs' : 'parents'} ont répondu`
                : `${respPct}% de réponses — pense à relancer`}
            done={hasEnoughResponses}
            onClick={() => go('convocations')}/>
        </div>
      </div>

      {/* ACTIONS — Grille de tuiles */}
      <div style={{margin:'10px 14px 12px'}}>
        <div style={{
          fontSize:11, fontWeight:900, letterSpacing:'.08em',
          color:'rgba(255,255,255,0.55)', marginBottom:8, textTransform:'uppercase',
        }}>
          Actions rapides
        </div>
        <div style={{
          display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8,
        }}>
          <ActionTile ic="📋" label="INFOS" sub="Stade · horaires" color="#7dd3fc"
            onClick={() => setMatchInfoOpen(true)}/>
          <ActionTile ic="🎯" label="COMPO" sub="Du match" color="#f97316"
            onClick={() => go('match-lineup')}/>
          <ActionTile ic="🔢" label="NUMÉROS" sub="Maillots match" color="#f97316"
            onClick={() => setJerseyOpen(true)}/>
          <ActionTile ic="👟" label="VESTIAIRE" sub="Visuel compo" color="#f97316"
            onClick={() => go('tv-match')}/>
          <ActionTile ic="📣" label="CONVOCS" sub={`${responded}/${convoIds.length || 0} parents`} color="#c8f169"
            onClick={() => go('convocations')}/>
          <ActionTile ic="↗" label="PARTAGER" sub="Aux parents"
            onClick={() => go('share')}/>
        </div>
      </div>

      {/* CTA PRIMAIRE — Lancer le match */}
      {canEdit && (
        <div style={{margin:'14px 14px 24px'}}>
          <button onClick={() => {
                    // Si pas encore vérifié, modale numéros obligatoire (cohérent
                    // avec le flow depuis Convocations).
                    const reviewed = window.CDD_JERSEY?.wasReviewed?.(teamId, matchId);
                    if (!reviewed) {
                      setJerseyOpen(true);
                    } else {
                      go('match');
                    }
                  }}
            style={{
              width:'100%', padding:'15px 20px', borderRadius:12,
              background:'linear-gradient(135deg, rgba(200,241,105,0.22) 0%, rgba(200,241,105,0.10) 100%)',
              border:'1px solid rgba(200,241,105,0.55)',
              color:'#c8f169', fontWeight:900, fontSize:16,
              letterSpacing:'.08em', cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', gap:10,
              boxShadow:'0 4px 24px rgba(200,241,105,0.15)',
            }}>
            🏁 LANCER LE MATCH
          </button>
          {!hasEnoughResponses && convoIds.length > 0 && (
            <div style={{
              marginTop:8, padding:'8px 10px', borderRadius:8,
              background:'rgba(255,170,40,0.08)', border:'1px solid rgba(255,170,40,0.30)',
              fontSize:11, color:'#ffc788', lineHeight:1.4, textAlign:'center',
            }}>
              💡 {convoIds.length - responded} parent{convoIds.length - responded > 1 ? 's' : ''} n'ont pas encore confirmé. Tu peux relancer depuis Convocations.
            </div>
          )}
        </div>
      )}

      {/* Modales */}
      {matchInfoOpen && window.MatchInfoModal && teamId && (
        <window.MatchInfoModal
          teamId={teamId} matchId={matchId}
          matchLabel={`${next.home || ''} vs ${next.away || ''} · ${next.date || ''}`}
          onClose={() => setMatchInfoOpen(false)}/>
      )}
      {jerseyOpen && window.JerseyNumbersModal && teamId && (
        <window.JerseyNumbersModal
          teamId={teamId} matchId={matchId}
          players={[...(conv.starters || []).map(id => (window.CDD_PLAYERS || []).find(p => p.id === id)).filter(Boolean),
                    ...(conv.bench    || []).map(id => (window.CDD_PLAYERS || []).find(p => p.id === id)).filter(Boolean)]}
          title="🔢 NUMÉROS MAILLOTS DU MATCH"
          onClose={() => setJerseyOpen(false)}/>
      )}
      {friendlyOpen && window.FriendlyMatchModal && teamId && (
        <window.FriendlyMatchModal
          teamId={teamId} clubId={clubId}
          existing={friendlyOpen === 'edit' && next.isAmical
            ? window.CDD_FRIENDLY?.get?.(teamId, next.id)
            : null}
          onClose={() => setFriendlyOpen(null)}
          onSaved={() => setFriendlyOpen(null)}/>
      )}
    </div>
  );
}

window.ScreenMatchPrep = ScreenMatchPrep;
