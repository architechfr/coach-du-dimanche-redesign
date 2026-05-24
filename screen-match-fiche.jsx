/* global React, CDD_LIVE_MATCH, CDD_PLAYERS, CDD_OBSERVATIONS, FutCard, POSITION_LABEL */

/* ScreenMatch broadcast retiré (mort code) — V2 utilise screen-match-live-v2.jsx */


/* ============================================================
   SCREEN — Fiche Joueur (Player profile + radar)
   ============================================================ */

function ScreenFiche({ go, tweaks, player }) {
  const basePlayer = player || CDD_PLAYERS[0]; // default first player
  if (!basePlayer) return <div className="fi-empty">Aucun joueur</div>;
  // Re-résoudre le joueur depuis CDD_PLAYERS à CHAQUE render. Indispensable pour
  // la notation : updateStat/applyQuick persistent l'override puis CDD_REBUILD()
  // remplace les objets de CDD_PLAYERS. Sans cette résolution, `p` resterait
  // l'objet capturé via la prop AVANT le rebuild → la fiche afficherait les
  // anciennes stats jusqu'à un sortie/retour (bug notation Rapide + Détaillé).
  const p = CDD_PLAYERS.find(x => x.id === basePlayer.id) || basePlayer;
  const stats = p.stats;
  const [tab, setTab] = useState("stats");
  const [, setRefresh] = useState(0);
  const triggerRefresh = () => setRefresh(x => x + 1);
  const obs = CDD_OBSERVATIONS[p.id] || [];

  // #C5 — édition de la fiche (statut, nom, notation, observations) = capacité
  // 'effectif'. Parent / joueur / lecteur sont en lecture seule. Fallback :
  // éditable si le module rôles n'est pas chargé (ne jamais bloquer le coach).
  const canEdit = !window.CDD_ROLES || !window.CDD_ROLES.canDo
    || window.CDD_ROLES.canDo('effectif');

  // ----- Status override -----
  // Fallback IDs alignés sur ceux exposés par CDD_COACH.STATUS_OPTIONS
  // (active / rest / injured / suspended / reserve) pour éviter les
  // collisions de namespaces si CDD_COACH n'est pas encore chargé.
  const STATUS_OPTIONS = (window.CDD_COACH && window.CDD_COACH.STATUS_OPTIONS) || [
    { id:'active',    l:'✓ Disponible',   cls:'ok'   },
    { id:'rest',      l:'⏸ Indisponible', cls:'warn' },
    { id:'injured',   l:'🩹 Blessé',      cls:'bad'  },
    { id:'suspended', l:'⛔ Suspendu',    cls:'bad'  },
    { id:'reserve',   l:'★ Réserve',     cls:'info' },
  ];
  // On passe l'objet `p` complet (pas seulement p.id) — getStatus est désormais tolérant.
  const currentStatus = (window.CDD_COACH && window.CDD_COACH.getStatus)
    ? window.CDD_COACH.getStatus(p) || 'active'
    : (p.status || 'active');
  const statusObj = STATUS_OPTIONS.find(s => s.id === currentStatus) || STATUS_OPTIONS[0];
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  // Modale détail (questions par statut) — null = fermée, sinon = statusId à éditer
  const [statusDetailFor, setStatusDetailFor] = useState(null);

  // Patch refresh : re-render à chaque changement statut/rebuild data.
  // Indispensable car `p` est un objet capturé au render — sans cet effet,
  // le clic enregistre bien dans localStorage mais la fiche ne relit pas.
  useEffect(() => {
    const onChange = () => triggerRefresh();
    window.addEventListener('cdd-player-changed', onChange);
    window.addEventListener('cdd-data-rebuilt',   onChange);
    return () => {
      window.removeEventListener('cdd-player-changed', onChange);
      window.removeEventListener('cdd-data-rebuilt',   onChange);
    };
  }, []);

  // ----- Name override -----
  const [editingName, setEditingName] = useState(false);
  const [editFirst, setEditFirst] = useState(p.first || '');
  const [editLast,  setEditLast]  = useState(p.last  || '');

  // ----- Notation joueur (édition pondérée par poste) -----
  const RATING = window.CDD_RATING;
  const [editingStats, setEditingStats] = useState(false);
  const [statMode, setStatMode] = useState('detail'); // 'quick' | 'detail'
  const [quickPos, setQuickPos] = useState(p.pos || 'MC');
  const [quickNote, setQuickNote] = useState(p.stats.ovr || 75);
  // Réaligner les contrôles du mode Rapide quand on change de joueur
  useEffect(() => {
    setQuickPos(p.pos || 'MC');
    setQuickNote(p.stats.ovr || 75);
    setEditingStats(false);
  }, [p.id]);

  const updateStat = (key, val) => {
    if (!canEdit) return;
    if (window.CDD_COACH && window.CDD_COACH.setStatOverride) {
      window.CDD_COACH.setStatOverride(p.id, key, val);
    } else {
      p.stats[key] = val; // fallback : mute en mémoire
    }
    triggerRefresh();
  };
  const resetStats = () => {
    if (!canEdit) return;
    if (window.CDD_COACH && window.CDD_COACH.resetStats) {
      window.CDD_COACH.resetStats(p.id);
    }
    setEditingStats(false);
    triggerRefresh();
  };
  // Mode Rapide : poste + note globale → l'app génère un profil de stats typé
  const applyQuick = () => {
    if (!canEdit || !RATING) return;
    const gen = RATING.quickProfile(quickPos, quickNote);
    if (window.CDD_COACH) {
      if (window.CDD_COACH.setProfile) {
        window.CDD_COACH.setProfile(p.id, { position: quickPos });
      }
      if (window.CDD_COACH.setStatsBulk) {
        window.CDD_COACH.setStatsBulk(p.id, gen);
      } else {
        Object.keys(gen).forEach(k => window.CDD_COACH.setStatOverride(p.id, k, gen[k]));
      }
    }
    setStatMode('detail');
    triggerRefresh();
  };

  // ----- Note saisie -----
  const [newNote, setNewNote] = useState('');

  // Radar 6 axes
  const radarPts = useMemo(() => {
    const axes = [stats.PAC, stats.SHO, stats.PAS, stats.DRI, stats.DEF, stats.PHY];
    return axes.map((v, i) => {
      const ang = (Math.PI * 2 * i) / axes.length - Math.PI/2;
      const r = (v / 99) * 80;
      return { x: 100 + Math.cos(ang) * r, y: 100 + Math.sin(ang) * r, v, ang };
    });
  }, [stats]);

  const radarPath = radarPts.map((p,i)=>(i?"L":"M")+p.x+","+p.y).join(" ") + "Z";
  // Libellés du radar : gardien = stats dédiées, joueur de champ = VIT/TIR/…
  const ratingLabels = RATING ? RATING.labelsFor(p.pos) : null;
  const axisLabels = ratingLabels
    ? ['PAC','SHO','PAS','DRI','DEF','PHY'].map(k => ratingLabels.short[k])
    : ["VIT","TIR","PAS","DRI","DEF","PHY"];

  return (
    <div className="scr scr-fiche fade-in" data-screen-label="05 Fiche Joueur">

      {/* ─── HERO V2: card on top, identity below, no name duplication ─── */}
      <div className="fi-hero-v2">
        <div className="fi-hero-bg"/>
        <div className="fi-hero-grad"/>

        {/* OVR ring backdrop — a giant decorative number */}
        <div className="fi-hero-ovr-ghost num">{p.stats.ovr}</div>

        <div className="fi-hero-card-wrap">
          <FutCard player={p} size="lg" />
        </div>

        <div className="fi-id">
          <div className="fi-id-row">
            <span className="fi-id-num">#{p.num}</span>
            <span className="fi-id-pos">{p.posLabel || POSITION_LABEL[p.pos] || p.pos}</span>
            <span className="fi-id-ovr"><b className="num">{p.stats.ovr}</b><em>OVR</em></span>
          </div>
          <div className="fi-id-name" onClick={() => { if (canEdit) setEditingName(true); }}
               title={canEdit ? "Cliquer pour modifier" : undefined}>
            <span className="fi-id-first">{p.first}</span>
            <h1 className="fi-id-last">{p.last}{canEdit && <span className="fi-id-edit-ic"> ✎</span>}</h1>
          </div>
          <div className="fi-id-meta">
            <span><b>{p.age}</b> ans</span>
            <span className="dot">·</span>
            <span>{p.height} cm</span>
            <span className="dot">·</span>
            <span>Pied {p.foot}</span>
          </div>

          {/* Status chips — cliquable seulement si le rôle peut éditer */}
          <div className="fi-chips">
            {canEdit ? (
              <button className={`fi-chip ${statusObj.cls} fi-chip-btn`}
                      onClick={() => setShowStatusPicker(true)}
                      title="Changer le statut">
                {statusObj.l} <span className="fi-chip-edit">✎</span>
              </button>
            ) : (
              <span className={`fi-chip ${statusObj.cls}`}>{statusObj.l}</span>
            )}
            {p.license && <span className="fi-chip info">Licence FFF</span>}
            {p.isStarter && <span className="fi-chip ok">★ Titulaire</span>}
          </div>

          {/* Actions Carnet du joueur — outils coach (distribution lien magique
              parent + preview coach). Masqué pour parent/lecteur/joueur. */}
          {canEdit && <CarnetActions player={p} go={go}/>}

          {/* v43.79 : Convoc perso joueur — outil coach (lien ciblé +
              push Firestore shared_teams). Masqué pour non-coach. */}
          {canEdit && <ConvocPersoActions player={p} go={go}/>}
        </div>
      </div>

      {/* Status picker overlay */}
      {showStatusPicker && (
        <div className="fi-sp-overlay" onClick={() => setShowStatusPicker(false)}>
          <div className="fi-sp-sheet" onClick={e => e.stopPropagation()}>
            <div className="fi-sp-h">
              <span className="fi-sp-t">STATUT DE {p.first?.toUpperCase()}</span>
              <button className="fi-sp-x" onClick={() => setShowStatusPicker(false)}>✕</button>
            </div>
            <div className="fi-sp-list">
              {window.CDD_COACH.STATUS_OPTIONS.map(s => (
                <button key={s.id}
                  className={`fi-sp-opt fi-sp-opt-${s.cls} ${currentStatus===s.id?'on':''}`}
                  onClick={() => {
                    // 1) Persister le statut nu (le coach voit la modale derrière)
                    window.CDD_COACH.setStatusOverride(p.id, s.id);
                    setShowStatusPicker(false);
                    // 2) Selon le statut, ouvrir la modale détail OU clôturer le meta
                    if (window.CDD_STATUS_DETAIL?.needsDetail(s.id)) {
                      setStatusDetailFor(s.id);
                    } else {
                      // 'active' → on archive simplement l'ancien meta
                      window.CDD_STATUS_DETAIL?.clearMeta(p.id);
                    }
                    triggerRefresh();
                  }}>
                  <span className="fi-sp-l">{s.l}</span>
                  {currentStatus === s.id && <span className="fi-sp-tick">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Status detail modal (questions par statut) */}
      {statusDetailFor && window.CDD_STATUS_DETAIL?.Component && (
        <window.CDD_STATUS_DETAIL.Component
          statusId={statusDetailFor}
          player={p}
          onClose={() => { setStatusDetailFor(null); triggerRefresh(); }}
        />
      )}

      {/* Name editor overlay */}
      {editingName && (
        <div className="fi-sp-overlay" onClick={() => setEditingName(false)}>
          <div className="fi-sp-sheet" onClick={e => e.stopPropagation()}>
            <div className="fi-sp-h">
              <span className="fi-sp-t">MODIFIER LE NOM</span>
              <button className="fi-sp-x" onClick={() => setEditingName(false)}>✕</button>
            </div>
            <div className="fi-ne-form">
              <label className="fi-ne-l">
                <span>Prénom</span>
                <input className="fi-ne-i" value={editFirst}
                       onChange={e => setEditFirst(e.target.value)}/>
              </label>
              <label className="fi-ne-l">
                <span>Nom de famille</span>
                <input className="fi-ne-i" value={editLast}
                       onChange={e => setEditLast(e.target.value)}/>
              </label>
              <div className="fi-ne-info">
                Tu peux corriger les fautes de la base FFF. Ces changements restent locaux.
              </div>
              <div className="fi-ne-actions">
                <button className="fi-attrs-btn-reset" onClick={() => {
                  window.CDD_COACH.resetName(p.id);
                  setEditFirst(p.raw?.firstName || '');
                  setEditLast(p.raw?.lastName || '');
                  setEditingName(false);
                  triggerRefresh();
                }}>Reset FFF</button>
                <button className="fi-attrs-btn-done" onClick={() => {
                  window.CDD_COACH.setNameOverride(p.id, editFirst, editLast);
                  setEditingName(false);
                  triggerRefresh();
                }}>Enregistrer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Licence FFF block (real data) ─── */}
      {p.license && (
        <div className="fi-licence">
          <div className="fi-licence-l">
            <div className="fi-licence-k">LICENCE FFF</div>
            <div className="fi-licence-n mono">{p.license}</div>
          </div>
          <div className="fi-licence-r">
            <div><em>Catégorie</em><b>{p.raw?.categorie || 'U15'}</b></div>
            {p.raw?.dateNaissance && <div><em>Né(e) le</em><b className="num">{p.raw.dateNaissance}</b></div>}
            {p.raw?.dernierClubQuitte && (
              <div className="fi-licence-prev">
                <em>Ex-club</em>
                <b>{(p.raw.dernierClubQuitte+'').replace(/^\d{4}\s/, '')}</b>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="fi-tabs">
        {[
          {id:"profil", l:"Profil"},
          {id:"stats", l:"Stats"},
          {id:"saison", l:"Saison"},
          // Onglet Observations = notes coach internes → réservé aux coachs
          ...(canEdit ? [{id:"obs",  l:"Observations"}] : []),
        ].map(t => (
          <button key={t.id} className={`fi-tab ${tab===t.id?"on":""}`} onClick={()=>setTab(t.id)}>
            {t.l}
          </button>
        ))}
      </div>

      {tab === "profil" && <ProfilTab player={p} onChange={triggerRefresh} />}

      {tab === "stats" && (
        <div className="fi-stats-tab">
          {/* Radar */}
          <div className="fi-radar">
            <svg viewBox="0 0 200 200" width="100%" height="100%">
              <defs>
                <radialGradient id="rgrad">
                  <stop offset="0%" stopColor="var(--acc)" stopOpacity=".5"/>
                  <stop offset="100%" stopColor="var(--acc)" stopOpacity=".05"/>
                </radialGradient>
              </defs>
              {/* concentric */}
              {[20, 40, 60, 80].map(r => (
                <polygon key={r}
                  points={[0,1,2,3,4,5].map(i => {
                    const a = (Math.PI*2*i)/6 - Math.PI/2;
                    return (100 + Math.cos(a)*r) + "," + (100 + Math.sin(a)*r);
                  }).join(" ")}
                  fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="1"/>
              ))}
              {/* axes */}
              {[0,1,2,3,4,5].map(i => {
                const a = (Math.PI*2*i)/6 - Math.PI/2;
                return <line key={i} x1="100" y1="100"
                  x2={100+Math.cos(a)*80} y2={100+Math.sin(a)*80}
                  stroke="rgba(255,255,255,.08)" strokeWidth="1"/>;
              })}
              {/* value polygon */}
              <path d={radarPath} fill="url(#rgrad)" stroke="var(--acc)" strokeWidth="1.5"/>
              {/* dots */}
              {radarPts.map((pt,i) => (
                <circle key={i} cx={pt.x} cy={pt.y} r="3" fill="var(--acc)" stroke="#000" strokeWidth="1"/>
              ))}
              {/* labels */}
              {axisLabels.map((l,i) => {
                const a = (Math.PI*2*i)/6 - Math.PI/2;
                const lx = 100 + Math.cos(a)*94;
                const ly = 100 + Math.sin(a)*94;
                return <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
                  fontSize="10" fontWeight="800" fill="var(--tx-2)" fontFamily="var(--f-display)">
                  {l}
                </text>;
              })}
            </svg>
          </div>

          <div className="fi-attrs">
            <div className="fi-attrs-h">
              <span className="fi-attrs-k">{canEdit ? 'NOTATION COACH' : 'ATTRIBUTS'}</span>
              {/* #C5 — édition de la notation réservée à la capacité 'effectif'.
                  Sans le bouton Éditer, editingStats reste false → lecture seule. */}
              {canEdit && (
                <div className="fi-attrs-actions">
                  {editingStats ? (
                    <>
                      <button className="fi-attrs-btn-reset" onClick={resetStats}>Reset</button>
                      <button className="fi-attrs-btn-done" onClick={() => setEditingStats(false)}>OK</button>
                    </>
                  ) : (
                    <button className="fi-attrs-btn-edit" onClick={() => setEditingStats(true)}>✎ Éditer</button>
                  )}
                </div>
              )}
            </div>

            {/* OVR pondéré + profil de poste sur lequel il est calculé */}
            <div className="fi-rate-head">
              <div className="fi-rate-ovr">
                <b className="num">{p.stats.ovr}</b>
                <em>OVR</em>
              </div>
              <div className="fi-rate-prof">
                <span className="fi-rate-prof-l">Noté comme</span>
                <span className="fi-rate-prof-v">
                  {RATING ? RATING.profileFor(p.pos).label : (p.posLabel || p.pos)}
                </span>
              </div>
            </div>

            {/* Sélecteur de mode d'édition */}
            {editingStats && RATING && (
              <div className="fi-rate-modes">
                <button className={`fi-rate-mode ${statMode==='quick'?'on':''}`}
                        onClick={() => setStatMode('quick')}>⚡ Rapide</button>
                <button className={`fi-rate-mode ${statMode==='detail'?'on':''}`}
                        onClick={() => setStatMode('detail')}>⚙ Détaillé</button>
              </div>
            )}

            {/* MODE RAPIDE — poste + note globale → profil typé généré */}
            {editingStats && statMode==='quick' && RATING && (
              <div className="fi-rate-quick">
                <label className="fi-rate-field">
                  <span className="fi-rate-field-l">Poste</span>
                  <select className="fi-rate-select" value={quickPos}
                          onChange={e => setQuickPos(e.target.value)}>
                    {(window.CDD_COACH?.POSITION_CHOICES || []).map(o => (
                      <option key={o.id} value={o.id}>{o.l}</option>
                    ))}
                  </select>
                </label>
                <label className="fi-rate-field">
                  <span className="fi-rate-field-l">
                    Note globale visée · <b className="num">{quickNote}</b>
                  </span>
                  <input type="range" className="fi-rate-range"
                         min={RATING.STAT_MIN} max={RATING.STAT_MAX} value={quickNote}
                         onChange={e => setQuickNote(parseInt(e.target.value))}/>
                </label>
                {(() => {
                  const prev = RATING.quickProfile(quickPos, quickNote);
                  const sh = RATING.labelsFor(quickPos).short;
                  return (
                    <div className="fi-rate-preview">
                      {['PAC','SHO','PAS','DRI','DEF','PHY'].map(k => (
                        <span key={k} className="fi-rate-chip">
                          <b className="num">{prev[k]}</b><em>{sh[k]}</em>
                        </span>
                      ))}
                    </div>
                  );
                })()}
                <button className="fi-rate-apply" onClick={applyQuick}>
                  Générer le profil {RATING.profileFor(quickPos).label}
                </button>
                <p className="fi-rate-hint">
                  L'app génère 6 stats réalistes typées pour ce poste — leur moyenne
                  pondérée vaut la note visée. Affinez ensuite en mode Détaillé.
                </p>
              </div>
            )}

            {/* MODE DÉTAILLÉ + lecture seule — 6 stats avec le poids du poste */}
            {(!editingStats || statMode==='detail') && (() => {
              const labels  = RATING ? RATING.labelsFor(p.pos).long
                : {PAC:'VITESSE',SHO:'TIR',PAS:'PASSE',DRI:'DRIBBLE',DEF:'DÉFENSE',PHY:'PHYSIQUE'};
              const weights = RATING ? RATING.profileFor(p.pos).weights : null;
              return (
                <div className="fi-rate-rows">
                  {['PAC','SHO','PAS','DRI','DEF','PHY'].map(k => {
                    const v = stats[k];
                    return (
                      <div className="fi-rate-row" key={k}>
                        <span className="fi-rate-row-l">{labels[k]}</span>
                        {weights && (
                          <span className="fi-rate-row-w"
                                title="Poids de cette stat dans la note de ce poste">
                            {weights[k]}%
                          </span>
                        )}
                        {editingStats ? (
                          <input type="range" className="fi-rate-range"
                                 min={RATING ? RATING.STAT_MIN : 40}
                                 max={RATING ? RATING.STAT_MAX : 95}
                                 value={v}
                                 onChange={e => updateStat(k, parseInt(e.target.value))}/>
                        ) : (
                          <div className="fi-rate-track">
                            <div className="fi-rate-fill" style={{width:v+'%'}}/>
                          </div>
                        )}
                        <span className="fi-rate-row-v num">{v}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {tab === "saison" && (
        <div className="fi-saison">
          <div className="fi-kpi-grid">
            <div className="fi-kpi"><b className="num">{p.mins}</b><em>min jouées</em></div>
            <div className="fi-kpi acc"><b className="num">{p.goals}</b><em>buts</em></div>
            <div className="fi-kpi"><b className="num">{p.assists}</b><em>passes déc.</em></div>
            <div className="fi-kpi"><b className="num">{p.mvp}</b><em>MVP match</em></div>
            <div className="fi-kpi"><b className="num">{p.yellow}</b><em>jaunes</em></div>
            <div className="fi-kpi"><b className="num">{p.red}</b><em>rouges</em></div>
          </div>
          {/* FORME / CONDITION = appréciations subjectives saisies par le coach
              → réservé aux coachs. Les KPI ci-dessus (mins, buts, etc.) restent
              visibles à tous : ce sont des faits du match, pas des opinions. */}
          {canEdit && (
            <div className="fi-form">
              <div className="fi-form-l">FORME · {p.form}/10</div>
              <div className="fi-form-bar">
                <div className="fi-form-fill" style={{width:(p.form*10)+"%"}}/>
              </div>
              <div className="fi-form-l">CONDITION · {p.fitness}%</div>
              <div className="fi-form-bar">
                <div className="fi-form-fill fitness" style={{width:p.fitness+"%"}}/>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "obs" && canEdit && (
        <div className="fi-obs">
          {/* #C5 — ajout d'observation réservé à la capacité 'effectif'. */}
          {canEdit && (
            <div className="fi-obs-add">
              <textarea
                className="fi-obs-input"
                placeholder="Note du coach… (entraînement, match, comportement…)"
                value={newNote}
                onChange={e => setNewNote(e.target.value)}/>
              <button
                className="fi-obs-add-btn"
                disabled={!newNote.trim()}
                onClick={() => {
                  if (!newNote.trim()) return;
                  window.CDD_COACH.addNote(p.id, { tag:'Coach', txt: newNote.trim() });
                  setNewNote("");
                  triggerRefresh();
                }}>
                + AJOUTER
              </button>
            </div>
          )}
          {obs.length === 0 ? (
            <div className="fi-empty">Pas encore d'observation. Tape ta première note ci-dessus.</div>
          ) : obs.map((o,i) => (
            <div className="fi-obs-item" key={i}>
              <div className="fi-obs-head">
                <span className="chip">{o.tag}</span>
                <span className="dim2 num">{o.date}</span>
                {canEdit && (
                  <button className="fi-obs-del" onClick={() => {
                    if (confirm('Supprimer cette note ?')) {
                      window.CDD_COACH.removeNote(p.id, i);
                      triggerRefresh();
                    }
                  }}>×</button>
                )}
              </div>
              <div className="fi-obs-txt">{o.txt}</div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

window.ScreenFiche = ScreenFiche;


/* ============================================================
   CarnetActions — boutons "Voir le Carnet" + "Envoyer au parent"
   ============================================================
   Sur la fiche d'un joueur, donne au coach :
   1. Une preview du Carnet (ce que le joueur voit) en 1 tap
   2. Un partage WhatsApp du lien magique au parent (pré-rempli avec son numéro
      si renseigné dans la fiche, sinon picker contact natif)
   ============================================================ */
function CarnetActions({ player, go }) {
  const carnetUrl = `${window.location.origin}/?carnet=${encodeURIComponent(player.id)}`;

  // Normalise 06 → 336 pour wa.me (FR uniquement, sinon laisse passer)
  const normalizePhone = (raw) => {
    if (!raw) return '';
    const d = String(raw).replace(/[^\d+]/g, '');
    if (d.startsWith('+')) return d.slice(1);
    if (d.startsWith('33')) return d;
    if (d.startsWith('0') && d.length === 10) return '33' + d.slice(1);
    return d;
  };

  const buildShareMsg = () => {
    const club = window.CDD_CLUB || {};
    const teamLabel = club.team ? ` (${club.team})` : '';
    return `Salut ! 🎴\n\n`
      + `Voici la carte officielle de ${player.first || 'votre enfant'}${teamLabel}, `
      + `basée sur ses vrais matchs cette saison. Sa note évolue à chaque match.\n\n`
      + `${player.first || 'Il'} peut la voir et la partager en 1 tap :\n${carnetUrl}\n\n`
      + `Coach`;
  };

  const markShared = () => {
    // Note : on trace l'INTENTION de partage du coach, pas la réception réelle.
    // Sert au compteur 'X/Y carnets envoyés' sur la page Effectif.
    try {
      const all = JSON.parse(localStorage.getItem('cdd_carnet_shared') || '{}');
      all[player.id] = { sharedAt: Date.now(), channel: 'whatsapp' };
      localStorage.setItem('cdd_carnet_shared', JSON.stringify(all));
      window.dispatchEvent(new CustomEvent('cdd-carnet-shared', { detail: { playerId: player.id } }));
    } catch (e) {}
  };

  const sendWhatsApp = () => {
    const phone = normalizePhone(player.parentPhone);
    const txt = encodeURIComponent(buildShareMsg());
    const url = phone ? `https://wa.me/${phone}?text=${txt}` : `https://wa.me/?text=${txt}`;
    markShared();
    window.open(url, '_blank');
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(carnetUrl);
      try {
        const all = JSON.parse(localStorage.getItem('cdd_carnet_shared') || '{}');
        all[player.id] = { sharedAt: Date.now(), channel: 'clipboard' };
        localStorage.setItem('cdd_carnet_shared', JSON.stringify(all));
        window.dispatchEvent(new CustomEvent('cdd-carnet-shared', { detail: { playerId: player.id } }));
      } catch (e) {}
      const el = document.getElementById('carnet-copy-feedback');
      if (el) {
        el.style.opacity = '1';
        setTimeout(() => { el.style.opacity = '0'; }, 1600);
      }
    } catch (e) {
      window.prompt('Copier le lien :', carnetUrl);
    }
  };

  const hasPhone = !!normalizePhone(player.parentPhone);

  return (
    <div style={{
      marginTop: 14, padding: '12px 14px', borderRadius: 12,
      background: 'linear-gradient(135deg, rgba(200,241,105,0.10), rgba(200,241,105,0.04))',
      border: '1px solid rgba(200,241,105,0.30)',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{display:'flex', alignItems:'center', gap:8}}>
        <span style={{fontSize:18}}>🎴</span>
        <div style={{flex:1, minWidth:0}}>
          <div style={{fontSize:11, fontWeight:800, letterSpacing:'.08em', color:'#c8f169', textTransform:'uppercase'}}>
            Carnet du joueur
          </div>
          <div style={{fontSize:11, color:'rgba(255,255,255,0.65)', marginTop:2, lineHeight:1.35}}>
            Carte joueur + progression + badges, visible par {player.first || 'le joueur'} via lien magique
          </div>
        </div>
      </div>
      <div style={{display:'flex', gap:6}}>
        <button
          onClick={() => { if (go) go('carnet', player); }}
          title={`Aperçu de ce que verra ${player.first || 'le joueur'}`}
          style={{
            flex: 1, padding:'10px 8px', borderRadius:9,
            background:'rgba(255,255,255,0.06)', color:'#fff',
            border:'1px solid rgba(255,255,255,0.14)', cursor:'pointer',
            fontSize:12, fontWeight:700,
            display:'inline-flex', alignItems:'center', justifyContent:'center', gap:5,
          }}>
          👁 Aperçu
        </button>
        <button
          onClick={sendWhatsApp}
          title={hasPhone ? `Envoyer la carte au numéro parent enregistré` : "Aucun numéro parent — choisir le contact dans WhatsApp"}
          style={{
            flex: 2, padding:'10px 12px', borderRadius:9,
            background:'linear-gradient(135deg, #25D366, #128C7E)',
            color:'#fff', border:'none', cursor:'pointer',
            fontSize:12, fontWeight:800,
            display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6,
            boxShadow:'0 2px 8px rgba(37,211,102,.25)',
          }}>
          💬 {hasPhone ? `Envoyer au parent` : `Envoyer (choisir contact)`}
        </button>
        <button
          onClick={copyLink}
          title="Copier le lien magique"
          style={{
            flex: 0, padding:'10px 12px', borderRadius:9,
            background:'rgba(255,255,255,0.06)', color:'#fff',
            border:'1px solid rgba(255,255,255,0.14)', cursor:'pointer',
            fontSize:13, fontWeight:700, flexShrink:0,
          }}>
          🔗
        </button>
      </div>
      <div id="carnet-copy-feedback" style={{
        fontSize:11, color:'#c8f169', fontWeight:700, textAlign:'center',
        opacity:0, transition:'opacity .2s',
      }}>
        ✓ Lien copié
      </div>
      {!hasPhone && (
        <div style={{
          fontSize:10, color:'rgba(255,170,40,0.85)', display:'flex', alignItems:'center', gap:5,
          padding:'4px 0 0',
        }}>
          ⚠️ Ajoute le numéro parent dans l'onglet <b>Profil</b> pour pré-remplir le destinataire
        </div>
      )}
    </div>
  );
}


/* ============================================================
   ConvocPersoActions — boutons "Aperçu" + "Envoyer convoc parent"
   ============================================================
   v43.79. Sur la fiche d'un joueur, donne au coach :
   1. Une preview du lien lecteur ciblé (?t=&p=) en 1 tap
   2. Un partage WhatsApp du lien magique au parent (pré-rempli avec
      son numéro si renseigné, sinon picker contact natif)
   3. Copier le lien dans le presse-papier

   Le lien généré pointe vers la page V1 /lecteur/?t=<teamToken>&p=<playerId>
   qui affiche : prochain match, statut convoc du joueur, et les boutons
   RSVP "Je viens / Absent / ?".

   Le teamToken est partagé avec ScreenSharePartage (clé localStorage
   `cdd_share_token`).
   ============================================================ */
function ConvocPersoActions({ player, go }) {
  const teamToken = (() => {
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
  const persoUrl = `${window.location.origin}/?t=${teamToken}&p=${encodeURIComponent(player.id)}`;

  // v43.79 : avant chaque action, s'assurer que le payload est publié dans
  // shared_teams/<token>. Sans ça, le lien lecteur tombe sur "Lien
  // introuvable". On throttle à 30s pour ne pas spammer Firestore.
  const ensurePushed = async () => {
    try {
      if (window.cddSync && window.cddSync.ensureSharedTeamPushed) {
        await window.cddSync.ensureSharedTeamPushed(teamToken);
      }
    } catch (e) {
      console.warn('[ConvocPersoActions] push payload failed', e);
    }
  };
  // Push automatique en background au premier rendu (best-effort).
  React.useEffect(() => { ensurePushed(); /* eslint-disable-next-line */ }, []);

  const normalizePhone = (raw) => {
    if (!raw) return '';
    const d = String(raw).replace(/[^\d+]/g, '');
    if (d.startsWith('+')) return d.slice(1);
    if (d.startsWith('33')) return d;
    if (d.startsWith('0') && d.length === 10) return '33' + d.slice(1);
    return d;
  };

  const buildShareMsg = () => {
    const club = window.CDD_CLUB || {};
    const teamLabel = club.team ? ` (${club.team})` : '';
    const next = window.CDD_NEXT_MATCH || {};
    const matchInfo = next.date
      ? `\n📅 ${next.date}${next.venue ? `\n🏟️ ${next.venue}` : ''}${next.away ? `\n⚽ vs ${next.away}` : ''}`
      : '';
    return `Salut ! 📋\n\n`
      + `Convocation pour ${player.first || 'votre enfant'}${teamLabel}${matchInfo}\n\n`
      + `${player.first || 'Votre enfant'} (ou vous) peut voir s'il est convoqué et répondre en 1 tap :\n${persoUrl}\n\n`
      + `Coach`;
  };

  const sendWhatsApp = async () => {
    await ensurePushed();
    const phone = normalizePhone(player.parentPhone);
    const txt = encodeURIComponent(buildShareMsg());
    const url = phone ? `https://wa.me/${phone}?text=${txt}` : `https://wa.me/?text=${txt}`;
    window.open(url, '_blank');
  };

  const copyLink = async () => {
    await ensurePushed();
    try {
      await navigator.clipboard.writeText(persoUrl);
      const el = document.getElementById('convoc-copy-feedback');
      if (el) {
        el.style.opacity = '1';
        setTimeout(() => { el.style.opacity = '0'; }, 1600);
      }
    } catch (e) {
      window.prompt('Copier le lien :', persoUrl);
    }
  };

  const openPreview = async () => {
    await ensurePushed();
    window.open(persoUrl, '_blank');
  };

  const hasPhone = !!normalizePhone(player.parentPhone);

  return (
    <div style={{
      marginTop: 10, padding: '12px 14px', borderRadius: 12,
      background: 'linear-gradient(135deg, rgba(59,130,246,0.10), rgba(59,130,246,0.04))',
      border: '1px solid rgba(59,130,246,0.30)',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{display:'flex', alignItems:'center', gap:8}}>
        <span style={{fontSize:18}}>📋</span>
        <div style={{flex:1, minWidth:0}}>
          <div style={{fontSize:11, fontWeight:800, letterSpacing:'.08em', color:'#3b82f6', textTransform:'uppercase'}}>
            Convocation perso
          </div>
          <div style={{fontSize:11, color:'rgba(255,255,255,0.65)', marginTop:2, lineHeight:1.35}}>
            Lien ciblé sur {player.first || 'ce joueur'} — statut convoc + RSVP (Je viens / Absent)
          </div>
        </div>
      </div>
      <div style={{display:'flex', gap:6}}>
        <button
          onClick={openPreview}
          title="Voir le lien comme un parent (nouvel onglet)"
          style={{
            flex: 1, padding:'10px 8px', borderRadius:9,
            background:'rgba(255,255,255,0.06)', color:'#fff',
            border:'1px solid rgba(255,255,255,0.14)', cursor:'pointer',
            fontSize:12, fontWeight:700,
            display:'inline-flex', alignItems:'center', justifyContent:'center', gap:5,
          }}>
          👁 Aperçu
        </button>
        <button
          onClick={sendWhatsApp}
          title={hasPhone ? `Envoyer la convoc au numéro parent enregistré` : "Aucun numéro parent — choisir le contact dans WhatsApp"}
          style={{
            flex: 2, padding:'10px 12px', borderRadius:9,
            background:'linear-gradient(135deg, #25D366, #128C7E)',
            color:'#fff', border:'none', cursor:'pointer',
            fontSize:12, fontWeight:800,
            display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6,
            boxShadow:'0 2px 8px rgba(37,211,102,.25)',
          }}>
          💬 {hasPhone ? `Envoyer convoc parent` : `Envoyer (choisir contact)`}
        </button>
        <button
          onClick={copyLink}
          title="Copier le lien convoc perso"
          style={{
            flex: 0, padding:'10px 12px', borderRadius:9,
            background:'rgba(255,255,255,0.06)', color:'#fff',
            border:'1px solid rgba(255,255,255,0.14)', cursor:'pointer',
            fontSize:13, fontWeight:700, flexShrink:0,
          }}>
          🔗
        </button>
      </div>
      <div id="convoc-copy-feedback" style={{
        fontSize:11, color:'#3b82f6', fontWeight:700, textAlign:'center',
        opacity:0, transition:'opacity .2s',
      }}>
        ✓ Lien convoc copié
      </div>
    </div>
  );
}


/* ============================================================
   ProfilTab — formulaire complet du profil joueur
   ============================================================
   Édite poste, licence, n°, taille, poids, pied fort,
   date de naissance, téléphones, email, photo.
   Persisté via window.CDD_COACH.setProfile(playerId, patch).
   ============================================================ */
function ProfilTab({ player, onChange }) {
  const CO = window.CDD_COACH;
  const POSITION_CHOICES = (CO && CO.POSITION_CHOICES) || [];
  const FOOT_CHOICES = (CO && CO.FOOT_CHOICES) || [];

  const init = () => {
    const ov = (CO && CO.getProfile) ? CO.getProfile(player.id) : {};
    return {
      position:    ov.position    || player.posLabel || player.pos || '',
      altPositions: Array.isArray(ov.altPositions) ? ov.altPositions.slice() : [],
      licence:     ov.licence     || player.license || '',
      num:         ov.num         != null ? ov.num   : (player.num || ''),
      height:      ov.height      || player.height   || '',
      weight:      ov.weight      || player.weight   || '',
      foot:        ov.foot        || player.foot     || '',
      birthDate:   ov.birthDate   || player.birthDate || '',
      phone:       ov.phone       || player.phone     || '',
      parentPhone: ov.parentPhone || player.parentPhone || '',
      email:       ov.email       || player.email      || '',
      photoDataUrl: ov.photoDataUrl || (player.raw && player.raw.photoDataUrl) || '',
    };
  };
  const [form, setForm] = React.useState(init);
  const [saved, setSaved] = React.useState(false);

  // #C5 — édition du profil joueur = capacité 'effectif'. Lecture seule pour
  // parent / joueur / lecteur. Fallback éditable si rôles non chargés.
  const canEdit = !window.CDD_ROLES || !window.CDD_ROLES.canDo
    || window.CDD_ROLES.canDo('effectif');

  const set = (k) => (e) => {
    const v = e && e.target ? e.target.value : e;
    setForm(f => ({ ...f, [k]: v }));
  };

  const onSave = () => {
    if (!canEdit || !CO || !CO.setProfile) return;
    const patch = { ...form };
    ['num', 'height', 'weight'].forEach(k => {
      if (patch[k] !== '' && patch[k] != null) {
        const n = parseInt(patch[k], 10);
        if (!isNaN(n)) patch[k] = n;
      }
    });
    CO.setProfile(player.id, patch);
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
    if (onChange) onChange();
  };

  const onReset = () => {
    if (!canEdit || !CO || !CO.resetProfile) return;
    if (!confirm('Effacer toutes tes modifs de profil et revenir aux données FFF/seed ?')) return;
    CO.resetProfile(player.id);
    setForm(init());
    if (onChange) onChange();
  };

  const onPhoto = (e) => {
    if (!canEdit) return;
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('Photo trop lourde (max 10 Mo).');
      return;
    }
    if (!window.CDD_compressImage) {
      alert('Module compression image indisponible. Recharge l\'app.');
      return;
    }
    // Compression : 400×400 max, JPEG qualité 75 → ~40-80 Ko. La photo va
    // ensuite dans profileOverride.photoDataUrl et sync via Firestore au
    // prochain enregistrement du profil (plan Spark OK).
    window.CDD_compressImage(file, 400, 0.75)
      .then(dataUrl => set('photoDataUrl')(dataUrl))
      .catch(err => alert('Erreur compression photo : ' + (err.message || err)));
  };

  return (
    <div className="fi-profil">
      <div className="fi-profil-grid">

        <div className="fi-pf-section">
          <div className="fi-pf-h">IDENTITÉ</div>
          <label className="fi-pf-l">
            <span>Poste principal</span>
            <select className="fi-pf-i" value={form.position} onChange={set('position')}>
              <option value="">— Aucun —</option>
              <optgroup label="Gardien">
                {POSITION_CHOICES.filter(o=>o.grp==='gk').map(o => <option key={o.id} value={o.id}>{o.l}</option>)}
              </optgroup>
              <optgroup label="Défense">
                {POSITION_CHOICES.filter(o=>o.grp==='def').map(o => <option key={o.id} value={o.id}>{o.l}</option>)}
              </optgroup>
              <optgroup label="Milieu">
                {POSITION_CHOICES.filter(o=>o.grp==='mid').map(o => <option key={o.id} value={o.id}>{o.l}</option>)}
              </optgroup>
              <optgroup label="Attaque">
                {POSITION_CHOICES.filter(o=>o.grp==='att').map(o => <option key={o.id} value={o.id}>{o.l}</option>)}
              </optgroup>
            </select>
          </label>

          {/* Phase E — Postes secondaires. Le poste principal pilote les
              caractéristiques ; les postes secondaires donnent un bonus
              polyvalence borné (+1 si 1 poste solide, +2 si 2+, jamais
              plus). Un poste « solide » = OVR sur ce profil ≥ OVR_principal
              − 4 ET ≥ 75 (cf. position-rating.js → versatilityReport). */}
          <label className="fi-pf-l">
            <span>
              Postes secondaires
              <em style={{ fontStyle:'normal', fontWeight:500, opacity:0.6,
                            marginLeft:6, fontSize:11 }}>
                — polyvalence (bonus jusqu'à +2)
              </em>
            </span>
            <div style={{
              display:'flex', flexWrap:'wrap', gap:6,
              padding: form.altPositions.length ? '6px 0 4px' : '0',
            }}>
              {form.altPositions.map(code => {
                const opt = POSITION_CHOICES.find(o => o.id === code);
                return (
                  <span key={code} style={{
                    display:'inline-flex', alignItems:'center', gap:6,
                    background:'rgba(200,241,105,0.14)',
                    border:'1px solid rgba(200,241,105,0.4)',
                    color:'#c8f169', borderRadius:999,
                    padding:'3px 4px 3px 10px', fontSize:12, fontWeight:700,
                  }}>
                    {opt ? opt.l : code}
                    {canEdit && (
                      <button type="button" aria-label={'Retirer ' + (opt ? opt.l : code)}
                              onClick={() => setForm(f => ({
                                ...f,
                                altPositions: (f.altPositions || []).filter(x => x !== code),
                              }))}
                              style={{
                                background:'transparent', border:'none', cursor:'pointer',
                                color:'#c8f169', fontSize:14, lineHeight:1,
                                padding:'0 6px', opacity:0.85,
                              }}>×</button>
                    )}
                  </span>
                );
              })}
              {form.altPositions.length === 0 && (
                <span style={{ fontSize:11.5, opacity:0.5, fontStyle:'italic' }}>
                  Aucun pour l'instant.
                </span>
              )}
            </div>
            {canEdit && (() => {
              const used = new Set([form.position, ...form.altPositions]);
              const renderOpt = (o) => (
                <option key={o.id} value={o.id} disabled={used.has(o.id)}>
                  {o.l}{used.has(o.id) ? ' (déjà sélectionné)' : ''}
                </option>
              );
              return (
                <select className="fi-pf-i" value=""
                        onChange={(e) => {
                          const v = e.target.value;
                          if (!v || used.has(v)) return;
                          setForm(f => ({
                            ...f,
                            altPositions: [...(f.altPositions || []), v],
                          }));
                        }}>
                  <option value="">+ Ajouter un poste secondaire…</option>
                  <optgroup label="Gardien">
                    {POSITION_CHOICES.filter(o=>o.grp==='gk').map(renderOpt)}
                  </optgroup>
                  <optgroup label="Défense">
                    {POSITION_CHOICES.filter(o=>o.grp==='def').map(renderOpt)}
                  </optgroup>
                  <optgroup label="Milieu">
                    {POSITION_CHOICES.filter(o=>o.grp==='mid').map(renderOpt)}
                  </optgroup>
                  <optgroup label="Attaque">
                    {POSITION_CHOICES.filter(o=>o.grp==='att').map(renderOpt)}
                  </optgroup>
                </select>
              );
            })()}
          </label>
          <label className="fi-pf-l">
            <span>N° maillot préféré</span>
            <input className="fi-pf-i" type="number" min="1" max="99"
                   value={form.num} onChange={set('num')} placeholder="1-99"/>
          </label>
          <label className="fi-pf-l">
            <span>N° licence FFF</span>
            <input className="fi-pf-i mono" value={form.licence} onChange={set('licence')}
                   placeholder="ex: 9602572213"/>
          </label>
          <label className="fi-pf-l">
            <span>Date de naissance</span>
            <input className="fi-pf-i" type="text" value={form.birthDate} onChange={set('birthDate')}
                   placeholder="JJ/MM/AAAA"/>
          </label>
        </div>

        <div className="fi-pf-section">
          <div className="fi-pf-h">PHYSIQUE</div>
          <label className="fi-pf-l">
            <span>Taille (cm)</span>
            <input className="fi-pf-i" type="number" min="120" max="220"
                   value={form.height} onChange={set('height')} placeholder="ex: 175"/>
          </label>
          <label className="fi-pf-l">
            <span>Poids (kg)</span>
            <input className="fi-pf-i" type="number" min="25" max="150"
                   value={form.weight} onChange={set('weight')} placeholder="ex: 68"/>
          </label>
          <label className="fi-pf-l">
            <span>Pied fort</span>
            <div className="fi-pf-radio">
              {FOOT_CHOICES.map(o => (
                <button key={o.id} type="button"
                  className={`fi-pf-rc ${form.foot===o.id?'on':''}`}
                  onClick={() => set('foot')(o.id)}>
                  {o.l}
                </button>
              ))}
            </div>
          </label>
        </div>

        {/* CONTACT — données privées (tel / email parent). Réservé aux coachs
            pour éviter qu'un parent voie les coordonnées d'autres familles. */}
        {canEdit && (
          <div className="fi-pf-section">
            <div className="fi-pf-h">CONTACT</div>
            <label className="fi-pf-l">
              <span>Téléphone joueur</span>
              <input className="fi-pf-i" type="tel" value={form.phone} onChange={set('phone')}
                     placeholder="06 12 34 56 78"/>
            </label>
            <label className="fi-pf-l">
              <span>Téléphone parent</span>
              <input className="fi-pf-i" type="tel" value={form.parentPhone} onChange={set('parentPhone')}
                     placeholder="06 12 34 56 78"/>
            </label>
            <label className="fi-pf-l">
              <span>Email parent</span>
              <input className="fi-pf-i" type="email" value={form.email} onChange={set('email')}
                     placeholder="parent@email.fr"/>
            </label>
          </div>
        )}

        <div className="fi-pf-section">
          <div className="fi-pf-h">PHOTO</div>
          <label className="fi-pf-l fi-pf-photo">
            <span>Photo joueur</span>
            <input className="fi-pf-i" type="file" accept="image/*" onChange={onPhoto}/>
            {form.photoDataUrl && (
              <div className="fi-pf-photo-prev">
                <img src={form.photoDataUrl} alt="" style={{maxWidth:'100px', borderRadius:'8px', marginTop:'8px'}}/>
                <button type="button" className="fi-attrs-btn-reset"
                        onClick={() => set('photoDataUrl')('')}>Retirer</button>
              </div>
            )}
          </label>
        </div>
      </div>

      {/* #C5 — actions d'enregistrement réservées à la capacité 'effectif'. */}
      {canEdit ? (
        <div className="fi-pf-actions">
          <button className="fi-attrs-btn-reset" onClick={onReset} type="button">
            ↺ Reset
          </button>
          <button className="fi-attrs-btn-done" onClick={onSave} type="button">
            {saved ? '✓ Enregistré' : '💾 Enregistrer'}
          </button>
        </div>
      ) : (
        <div className="fi-pf-actions" style={{fontSize:11, opacity:0.6, padding:'8px 0'}}>
          👁 Lecture seule — ton rôle ne permet pas de modifier ce profil.
        </div>
      )}
    </div>
  );
}
window.ProfilTab = ProfilTab;
