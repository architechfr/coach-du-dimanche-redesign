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
  const canEdit = !window.CDD_ROLES || !window.CDD_ROLES.canDo
    || window.CDD_ROLES.canDo('compo');

  const addPlayer = (pid) => {
    if (!canEdit || !teamId || !window.CDD_CONVOC) return;
    // addToConvoc gère lui-même le cap bench=5 et étend convocCount au besoin
    window.CDD_CONVOC.addToConvoc(teamId, pid, 'bench');
  };
  const removePlayer = (pid) => {
    if (!canEdit || !teamId || !window.CDD_CONVOC) return;
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
  // respCell — affichage unifié sur chaque ligne joueur (refonte 2026-05-23) :
  //   • Parent a répondu → badge emoji (👍/👎/❓)
  //   • Parent n'a PAS répondu → bouton « 💬 » WhatsApp inline cliquable
  // Évite d'avoir 2 listes du même joueur (une dans Suivi présences, l'autre
  // dans Titulaires/Remplaçants). Tout est sur la ligne du joueur.
  // Tri par numéro maillot croissant (refonte 2026-05-23). Les joueurs sans
  // numéro tombent en queue (999). Plus lisible et conforme à l'usage foot.
  const sortByNum = (arr) => [...(arr || [])].sort((a, b) => {
    const na = (a && typeof a.num === 'number' && a.num) || 999;
    const nb = (b && typeof b.num === 'number' && b.num) || 999;
    return na - nb;
  });
  // Idem mais pour absentEntries qui sont des objets { p, reason, note }.
  const sortAbsentByNum = (arr) => [...(arr || [])].sort((a, b) => {
    const na = (a?.p?.num && typeof a.p.num === 'number') ? a.p.num : 999;
    const nb = (b?.p?.num && typeof b.p.num === 'number') ? b.p.num : 999;
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
      return <span className="cv-parent-resp" title={title} style={{marginLeft:6, fontSize:14, opacity:0.9}}>{label}</span>;
    }
    const hasPhone = !!normalizePhone(p.parentPhone);
    return (
      <button
        onClick={(e) => { e.stopPropagation(); openRelanceWhatsApp(p); }}
        title={hasPhone
          ? `Relancer ${p.first} sur WhatsApp`
          : `Pas de numéro parent enregistré — WhatsApp s'ouvrira vide`}
        style={{
          marginLeft: 8, padding: '3px 8px', borderRadius: 7,
          background: hasPhone ? '#25D366' : 'rgba(255,170,40,0.15)',
          color: hasPhone ? '#fff' : '#ffc788',
          border: hasPhone ? 'none' : '1px solid rgba(255,170,40,0.35)',
          fontSize: 11, fontWeight: 800, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 3,
          whiteSpace: 'nowrap', flexShrink: 0,
        }}>
        💬 {hasPhone ? '' : '?'}
      </button>
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
  const buildRelanceMsg = (playerFirst) => (
    `Salut ! Petit rappel pour la convoc ${(CDD_CLUB && CDD_CLUB.team) || ''} ${next.home || ''} vs ${next.away || ''} (${next.date || ''}).\n\n` +
    `Tu peux confirmer la présence de ${playerFirst} en 1 tap ici :\n${lecteurUrl}\n\nMerci 🙏`
  );
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
          <div style={{display:'flex', flexDirection:'column', gap:8, width:'100%'}}>
            <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
              <button className="btn-cta" onClick={() => go("share")}>
                ↗ PARTAGER AUX PARENTS
              </button>
              <button className="btn-cta" onClick={() => go("match-lineup")}
                      style={{background:'rgba(249,115,22,.12)', border:'1px solid rgba(249,115,22,.40)', color:'#f97316'}}>
                🎯 COMPO DU MATCH
              </button>
              <button className="btn-cta" onClick={() => go("tv-match")}
                      style={{background:'rgba(249,115,22,.12)', border:'1px solid rgba(249,115,22,.40)', color:'#f97316'}}>
                👟 MODE VESTIAIRE
              </button>
            </div>
            {/* Numéros maillots match-specific — bouton 🔢 (orange = match) */}
            {canEdit && (
              <button
                onClick={() => setJerseyModalMode('edit')}
                style={{
                  width:'100%', padding:'9px 12px', borderRadius:9,
                  background:'rgba(249,115,22,0.10)', color:'#f97316',
                  border:'1px solid rgba(249,115,22,0.35)',
                  fontSize:12.5, fontWeight:700, letterSpacing:'.04em',
                  cursor:'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                }}>
                🔢 NUMÉROS MAILLOTS DU MATCH
                {window.CDD_JERSEY?.hasOverrides?.(teamId, (window.CDD_NEXT_MATCH && window.CDD_NEXT_MATCH.id) || 'placeholder') && (
                  <span style={{
                    fontSize:10, padding:'2px 7px', borderRadius:10,
                    background:'rgba(249,115,22,0.25)', fontWeight:800,
                  }}>modifiés ✓</span>
                )}
              </button>
            )}
            {/* Phase 1E — Coup d'envoi direct depuis Convocations */}
            {canEdit && (
              <button
                onClick={() => {
                  // 1er lancement : on impose un passage par la modale numéros
                  // pour éviter le "vrais maillots ≠ profils" reporté par le coach.
                  const mid = (window.CDD_NEXT_MATCH && window.CDD_NEXT_MATCH.id) || 'placeholder';
                  const reviewed = window.CDD_JERSEY?.wasReviewed?.(teamId, mid);
                  if (!reviewed) {
                    setJerseyModalMode('pre-match');
                  } else {
                    go('match');
                  }
                }}
                style={{
                  width:'100%', padding:'11px 16px', borderRadius:10,
                  background:'linear-gradient(135deg, rgba(200,241,105,0.18) 0%, rgba(200,241,105,0.08) 100%)',
                  border:'1px solid rgba(200,241,105,0.50)',
                  color:'#c8f169', fontWeight:800, fontSize:14,
                  letterSpacing:'.06em', cursor:'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                }}>
                🏁 LANCER LE MATCH
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="cv-stats">
        <div className="cv-stat"><b className="num">{starterPlayers.length}</b><em>Titulaires</em></div>
        <div className={`cv-stat ${benchPlayers.length >= BENCH_MAX ? 'cv-stat-full' : ''}`}>
          <b className="num">{benchPlayers.length}<span className="cv-stat-max">/{BENCH_MAX}</span></b>
          <em>Banc</em>
        </div>
        <div className="cv-stat warn"><b className="num">{absentEntries.length}</b><em>Absents</em></div>
      </div>

      {/* Suivi présences — bandeau + section actionnable non-respondants */}
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

      {/* Bandeau Compo type vs Convocation match (séparation des 3 couches) */}
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
              <span className="cv-num num">#{p.num}</span>
              <span className="cv-name">
                <span className="cv-first">{p.first}</span>
                {p.last && <span className="cv-last">{p.last.toUpperCase()}</span>}
                {respCell(p)}
              </span>
              <span className="cv-pos">{POSITION_LABEL[p.pos]||p.pos}</span>
              {canEdit && (
                <button className="cv-action"
                        onClick={(e) => { e.stopPropagation(); removePlayer(p.id); }}
                        title="Retirer de la convocation">−</button>
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
              <span className="cv-num num">#{p.num}</span>
              <span className="cv-name">
                <span className="cv-first">{p.first}</span>
                {p.last && <span className="cv-last">{p.last.toUpperCase()}</span>}
                {respCell(p)}
              </span>
              <span className="cv-pos">{POSITION_LABEL[p.pos]||p.pos}</span>
              {canEdit && (
                <button className="cv-action"
                        onClick={(e) => { e.stopPropagation(); removePlayer(p.id); }}
                        title="Retirer de la convocation">−</button>
              )}
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
          ) : sortAbsentByNum(absentEntries).map((a,i) => a.p && (
            <div className="cv-row abs cv-row-clickable" key={i}>
              {renderAvatar(a.p)}
              <span className="cv-num num"
                    onClick={() => setFicheModalPlayer(a.p)}
                    style={{cursor:'pointer'}}>#{a.p.num}</span>
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
      </div>

      {reservePlayers.length > 0 && (
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
            {sortByNum(reservePlayers).map(p => (
              <div className="cv-row cv-row-add cv-row-clickable" key={p.id}
                   onClick={() => setFicheModalPlayer(p)}
                   title="Toucher pour voir la fiche du joueur">
                {renderAvatar(p)}
                <span className="cv-num num">#{p.num}</span>
                <span className="cv-name">
                  <span className="cv-first">{p.first}</span>
                  {p.last && <span className="cv-last">{p.last.toUpperCase()}</span>}
                </span>
                <span className="cv-pos">{POSITION_LABEL[p.pos]||p.pos}</span>
                {canEdit && (
                  <button className={`cv-action cv-action-add ${benchPlayers.length >= BENCH_MAX ? 'cv-action-disabled' : ''}`}
                          disabled={benchPlayers.length >= BENCH_MAX}
                          onClick={(e) => { e.stopPropagation(); addPlayer(p.id); }}
                          title={benchPlayers.length >= BENCH_MAX ? `Banc plein (${BENCH_MAX}/${BENCH_MAX})` : "Ajouter à la convocation"}>+</button>
                )}
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
