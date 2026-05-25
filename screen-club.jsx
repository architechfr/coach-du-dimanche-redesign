/* global React, CDD_CLUB */
/* ============================================================
   SCREEN — Page du Club (identité, stade, contacts)
   ============================================================
   Référentiel central du club. Le stade du club sert de défaut
   pour la modale match-info quand un match est joué à domicile.

   Champs persistés dans le doc clubs/{clubId} (Firestore) :
   - name, short, colors, logoDataUrl (déjà existants)
   - stadium: { name, address, gpsUrl? }
   - contacts: [ { id, role, name, phone, email } ]
   - district, federation (optionnel)
   - socialMedia: { facebook, instagram, website } (optionnel)
   ============================================================ */

const { useState: useStateCL, useEffect: useEffectCL } = React;

function ScreenClub({ go, tweaks }) {
  const activeClub = window.CDD?.getActiveClub?.() || {};
  const clubId = activeClub.id;

  // ── Capacité d'édition ────────────────────────────────────────
  // Éditer le club = capacité 'club' (Phase C5). Coach principal/owner/admin uniquement.
  const canEdit = !window.CDD_ROLES || !window.CDD_ROLES.canDo
    || window.CDD_ROLES.canDo('club');

  // ── État local : forme normalisée ────────────────────────────
  const buildInitial = () => ({
    name:         activeClub.name || '',
    short:        activeClub.short || '',
    description:  activeClub.description || '',
    foundedYear:  activeClub.foundedYear || '',
    palmares:     activeClub.palmares || '',
    presidentWord: activeClub.presidentWord || '',
    stadium:      {
      name:    activeClub.stadium?.name || '',
      address: activeClub.stadium?.address || '',
      gpsUrl:  activeClub.stadium?.gpsUrl || '',
    },
    contacts:     Array.isArray(activeClub.contacts) ? activeClub.contacts : [],
    district:     activeClub.district || '',
    federation:   activeClub.federation || '',
    socialMedia:  {
      facebook:  activeClub.socialMedia?.facebook || '',
      instagram: activeClub.socialMedia?.instagram || '',
      website:   activeClub.socialMedia?.website || '',
    },
  });
  const [edit, setEdit] = useStateCL(false);
  const [data, setData] = useStateCL(buildInitial);
  const [savedFlash, setSavedFlash] = useStateCL(false);

  // Re-render quand le club est rebuild (push cloud, etc.)
  const [, forceTick] = useStateCL({});
  useEffectCL(() => {
    const h = () => { forceTick({}); if (!edit) setData(buildInitial()); };
    window.addEventListener('cdd-data-rebuilt', h);
    return () => window.removeEventListener('cdd-data-rebuilt', h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edit]);

  // ── Helpers d'édition ────────────────────────────────────────
  const updateStd = (k, v) => setData(d => ({ ...d, stadium: { ...d.stadium, [k]: v } }));
  const updateSoc = (k, v) => setData(d => ({ ...d, socialMedia: { ...d.socialMedia, [k]: v } }));
  const addContact = () => setData(d => ({
    ...d,
    contacts: [...d.contacts, { id: 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
                                role: '', name: '', phone: '', email: '' }],
  }));
  const updateContact = (id, k, v) => setData(d => ({
    ...d,
    contacts: d.contacts.map(c => c.id === id ? { ...c, [k]: v } : c),
  }));
  const removeContact = (id) => setData(d => ({
    ...d, contacts: d.contacts.filter(c => c.id !== id),
  }));

  // ── Persistance ──────────────────────────────────────────────
  // save() est maintenant ASYNC : on attend le push cloud pour confirmer que
  // les données sont vraiment montées (sans ça, une erreur permission-denied
  // de Firestore restait silencieuse — bug Florian 26/05/2026).
  const save = async () => {
    if (!clubId) { alert('Aucun club actif.'); return; }
    try {
      const all = JSON.parse(localStorage.getItem('arb_clubs') || '[]');
      const i = all.findIndex(c => c && c.id === clubId);
      if (i < 0) { alert('Club introuvable dans le storage local.'); return; }
      const updated = {
        ...all[i],
        name:        data.name.trim() || all[i].name || '',
        // `short` doit être une string (ne JAMAIS être undefined sinon
        // Firestore refuse tout le doc avec "Unsupported field value:
        // undefined" — bug Florian 26/05/2026).
        short:       data.short.trim() || all[i].short || all[i].name || '',
        description: (data.description || '').trim(),
        foundedYear: (data.foundedYear || '').toString().trim(),
        palmares:    (data.palmares || '').trim(),
        presidentWord: (data.presidentWord || '').trim(),
        stadium:     { ...data.stadium,
                       name: data.stadium.name.trim(),
                       address: data.stadium.address.trim(),
                       gpsUrl: data.stadium.gpsUrl.trim() },
        contacts:    data.contacts
                       .map(c => ({ ...c, role: c.role.trim(), name: c.name.trim(),
                                    phone: c.phone.trim(), email: c.email.trim().toLowerCase() }))
                       .filter(c => c.role || c.name || c.phone || c.email),
        district:    data.district.trim(),
        federation:  data.federation.trim(),
        socialMedia: { ...data.socialMedia,
                       facebook:  data.socialMedia.facebook.trim(),
                       instagram: data.socialMedia.instagram.trim(),
                       website:   data.socialMedia.website.trim() },
      };
      all[i] = updated;
      localStorage.setItem('arb_clubs', JSON.stringify(all));
      // Push cloud SYNCHRONE — on attend la réponse Firestore pour confirmer
      // que ça monte vraiment. Si rejection (rules, taille, perms), on alerte
      // l'utilisateur ET on garde le local (pas de rollback : il pourra
      // réessayer après une connexion ou un fix admin).
      if (window.cddData?.saveClub) {
        try {
          await window.cddData.saveClub(updated);
          console.info('[club] sauvegarde cloud OK ←', updated.id);
        } catch (e) {
          const msg = (e && e.message) || String(e);
          const isPerm = /permission|insufficient|denied/i.test(msg);
          alert('⚠ Sauvegarde locale OK, mais le cloud a REFUSÉ la mise à jour.\n\n'
            + 'Détail : ' + msg + '\n\n'
            + (isPerm
                ? 'Permission refusée par Firestore. Soit la limite de champs '
                  + 'a été atteinte (rules), soit ton rôle n\'autorise pas cette '
                  + 'modification. Préviens l\'admin pour qu\'il publie les '
                  + 'dernières firestore.rules.'
                : 'Ré-essaie dans un moment. Si ça persiste, regarde la console (F12).'));
        }
      }
      // Rebuild + close edit
      if (window.CDD_REBUILD) window.CDD_REBUILD();
      window.dispatchEvent(new CustomEvent('cdd-data-rebuilt'));
      setSavedFlash(true);
      setTimeout(() => { setSavedFlash(false); setEdit(false); }, 600);
    } catch (e) {
      alert('Sauvegarde échouée : ' + e.message);
    }
  };

  // ── Styles ───────────────────────────────────────────────────
  const inputStyle = {
    width:'100%', padding:'10px 12px', borderRadius:9, fontSize:13.5,
    background:'rgba(255,255,255,0.04)',
    border:'1px solid rgba(255,255,255,0.12)',
    color:'#fff', fontFamily:'inherit', outline:'none', boxSizing:'border-box',
  };
  const labelText = { fontSize:11, fontWeight:700, opacity:0.7, letterSpacing:'.04em', marginBottom:5, display:'block' };
  const sectionStyle = {
    margin:'8px 14px 12px', padding:'12px 14px', borderRadius:11,
    background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)',
  };
  const sectionHeader = {
    fontSize:11, fontWeight:900, letterSpacing:'.08em',
    color:'#c8f169', marginBottom:10, textTransform:'uppercase',
    display:'flex', alignItems:'center', gap:6,
  };

  // ── Rendu ────────────────────────────────────────────────────
  const club = window.CDD_CLUB || {};
  const primary = (club.colors && club.colors[0]) || '#22c55e';

  return (
    <div className="scr scr-club fade-in" data-screen-label="Page du club">

      {/* HERO — logo + nom + statut éditable */}
      <div className="cv-hero">
        <div className="cv-hero-bg"/>
        <div className="cv-hero-grad"/>
        <div className="cv-hero-in">
          <div className="cv-hero-k">PAGE DU CLUB</div>
          <div style={{display:'flex', alignItems:'center', gap:14, marginTop:6}}>
            {club.logoDataUrl ? (
              <img src={club.logoDataUrl} alt={club.name}
                   style={{width:56, height:56, borderRadius:10, objectFit:'cover',
                           border:'1px solid rgba(255,255,255,0.15)'}}/>
            ) : (
              <div style={{
                width:56, height:56, borderRadius:10,
                background: primary, color:'#000',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:24, fontWeight:900, fontFamily:'var(--f-display)',
              }}>{(club.short || club.name || '?')[0]}</div>
            )}
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontSize:22, fontWeight:900, lineHeight:1.1}}>{club.name || 'Mon club'}</div>
              <div style={{fontSize:12, opacity:0.7, marginTop:4}}>
                {club.season || 'Saison'} · {club.league || ''}
              </div>
            </div>
          </div>
          {canEdit && !edit && (
            <button onClick={() => setEdit(true)}
              style={{
                marginTop:10, padding:'8px 14px', borderRadius:9,
                background:'rgba(200,241,105,0.10)', color:'#c8f169',
                border:'1px solid rgba(200,241,105,0.40)',
                fontSize:12, fontWeight:700, cursor:'pointer',
                alignSelf:'flex-start', letterSpacing:'.04em',
              }}>
              ✎ Éditer les infos du club
            </button>
          )}
        </div>
      </div>

      {/* SECTIONS — view ou edit */}

      {/* Bouton recharger depuis le cloud — utile quand la page semble vide
          (cas typique : autre device / cache local effacé). Visible pour le
          coach principal/owner/admin uniquement, et seulement en mode lecture. */}
      {canEdit && !edit && window.cddData?.pullCloudData && (
        <div style={{padding:'0 14px 8px'}}>
          <button onClick={async (e) => {
            const btn = e.currentTarget;
            try {
              btn.disabled = true;
              btn.textContent = '⟳ Chargement…';
              await window.cddData.pullCloudData();
              if (window.CDD_REBUILD) window.CDD_REBUILD();
              window.dispatchEvent(new CustomEvent('cdd-data-rebuilt'));
              setData(buildInitial());
              btn.textContent = '✓ Rechargé depuis le cloud';
              setTimeout(() => { btn.disabled = false; btn.textContent = '⟳ Recharger depuis le cloud'; }, 1500);
            } catch (err) {
              btn.disabled = false;
              btn.textContent = '⟳ Recharger depuis le cloud';
              alert('Echec du rechargement : ' + (err.message || err));
            }
          }}
          style={{
            width:'100%', padding:'9px 12px',
            background:'rgba(125,211,252,0.06)',
            border:'1px dashed rgba(125,211,252,0.30)',
            borderRadius:9, color:'#7dd3fc',
            fontSize:11, fontWeight:700, cursor:'pointer',
            letterSpacing:'.04em',
          }}>
            ⟳ Recharger depuis le cloud
          </button>
          <div style={{fontSize:10, opacity:.5, textAlign:'center', marginTop:4}}>
            Si la page semble vide alors que tu avais déjà rempli — récupère la dernière version sauvée en Firestore.
          </div>
        </div>
      )}

      {/* À PROPOS — description + année de fondation */}
      <div style={sectionStyle}>
        <div style={sectionHeader}><span>📝</span><span>À propos du club</span></div>
        {edit ? (
          <>
            <label style={{display:'block', marginBottom:10}}>
              <span style={labelText}>ANNÉE DE FONDATION</span>
              <input type="text" value={data.foundedYear || ''}
                onChange={e => setData(d => ({...d, foundedYear: e.target.value}))}
                placeholder="ex : 1995"
                style={{...inputStyle, maxWidth:140}}/>
            </label>
            <label style={{display:'block'}}>
              <span style={labelText}>DESCRIPTION / MOT DU CLUB</span>
              <textarea value={data.description || ''}
                onChange={e => setData(d => ({...d, description: e.target.value}))}
                placeholder="ex : Le FC Magny-le-Hongre est un club familial fondé en 1995, qui forme les jeunes du U7 au U18 dans le respect, l'engagement et le plaisir du jeu."
                rows={4}
                style={{...inputStyle, resize:'vertical', minHeight:90, lineHeight:1.4}}/>
            </label>
          </>
        ) : (
          <div style={{fontSize:13, lineHeight:1.5, color:data.description ? '#fff' : 'rgba(255,255,255,.4)', fontStyle:data.description ? 'normal' : 'italic'}}>
            {data.description || 'Non renseigné'}
            {data.foundedYear && (
              <div style={{marginTop:8, fontSize:11, opacity:.6}}>
                Fondé en <b style={{color:'#fff'}}>{data.foundedYear}</b>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MOT DU PRÉSIDENT — citation courte mise en avant */}
      <div style={sectionStyle}>
        <div style={sectionHeader}><span>💬</span><span>Mot du président</span></div>
        {edit ? (
          <label style={{display:'block'}}>
            <span style={labelText}>CITATION COURTE (1-2 PHRASES)</span>
            <textarea value={data.presidentWord || ''}
              onChange={e => setData(d => ({...d, presidentWord: e.target.value}))}
              placeholder={`ex : "Le FCMH c'est plus qu'un club, c'est une famille. Ici on forme des joueurs et des hommes."`}
              rows={3}
              style={{...inputStyle, resize:'vertical', minHeight:70, lineHeight:1.4, fontStyle:'italic'}}/>
          </label>
        ) : (
          data.presidentWord ? (
            <div style={{
              fontSize:14, lineHeight:1.5, fontStyle:'italic',
              color:'#fff', padding:'4px 8px',
              borderLeft:'3px solid #c8f169',
            }}>
              « {data.presidentWord} »
            </div>
          ) : (
            <div style={{fontSize:13, color:'rgba(255,255,255,.4)', fontStyle:'italic'}}>Non renseigné</div>
          )
        )}
      </div>

      {/* PALMARÈS — titres et anecdotes */}
      <div style={sectionStyle}>
        <div style={sectionHeader}><span>🏆</span><span>Palmarès & histoire</span></div>
        {edit ? (
          <label style={{display:'block'}}>
            <span style={labelText}>TITRES, MOMENTS MARQUANTS, HISTOIRE</span>
            <textarea value={data.palmares || ''}
              onChange={e => setData(d => ({...d, palmares: e.target.value}))}
              placeholder={`ex :
- Champion départemental U15 (2022-2023)
- Demi-finale Coupe Île-de-France U13 (2024)
- Fondé par un groupe de parents bénévoles en 1995.`}
              rows={5}
              style={{...inputStyle, resize:'vertical', minHeight:110, lineHeight:1.5, whiteSpace:'pre-wrap'}}/>
          </label>
        ) : (
          <div style={{fontSize:13, lineHeight:1.5, color:data.palmares ? '#fff' : 'rgba(255,255,255,.4)',
                       fontStyle:data.palmares ? 'normal' : 'italic', whiteSpace:'pre-wrap'}}>
            {data.palmares || 'Non renseigné'}
          </div>
        )}
      </div>

      {/* ÉQUIPES DU CLUB — lecture seule, dérivé des teams existantes */}
      {(() => {
        const teams = (window.CDD?.getTeams?.() || []).filter(t => t && t.clubId === clubId);
        if (teams.length === 0) return null;
        const totalPlayers = teams.reduce((sum, t) => sum + ((t.players || []).length || 0), 0);
        return (
          <div style={sectionStyle}>
            <div style={sectionHeader}>
              <span>⚽</span>
              <span>Équipes du club</span>
              <span style={{marginLeft:'auto', fontSize:10, opacity:.7, fontWeight:700, letterSpacing:'.04em'}}>
                {teams.length} équipe{teams.length > 1 ? 's' : ''} · {totalPlayers} joueur{totalPlayers > 1 ? 's' : ''}
              </span>
            </div>
            <div style={{display:'flex', flexDirection:'column', gap:6}}>
              {teams.map(t => {
                const pl = (t.players || []).length;
                return (
                  <div key={t.id} style={{
                    padding:'8px 12px', borderRadius:8,
                    background:'rgba(255,255,255,.03)',
                    border:'1px solid rgba(255,255,255,.06)',
                    display:'flex', alignItems:'center', justifyContent:'space-between',
                    fontSize:13,
                  }}>
                    <span style={{fontWeight:700}}>{t.name || 'Équipe'}</span>
                    <span style={{display:'flex', gap:8, alignItems:'center'}}>
                      {t.category && <span style={{fontSize:11, opacity:.7}}>{t.category}</span>}
                      {pl > 0 && (
                        <span style={{
                          fontSize:10, fontWeight:900, padding:'2px 6px', borderRadius:5,
                          background:'rgba(200,241,105,.10)', color:'#c8f169',
                        }}>{pl} j.</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* STADE */}
      <div style={sectionStyle}>
        <div style={sectionHeader}><span>🏟️</span><span>Stade principal</span></div>
        {edit ? (
          <>
            <label><span style={labelText}>NOM DU STADE</span>
              <input type="text" value={data.stadium.name}
                     onChange={e => updateStd('name', e.target.value)}
                     placeholder="ex: Stade Auguste-Delaune" style={inputStyle}/>
            </label>
            <div style={{height:8}}/>
            <label><span style={labelText}>ADRESSE</span>
              <input type="text" value={data.stadium.address}
                     onChange={e => updateStd('address', e.target.value)}
                     placeholder="ex: 1 rue du Sport, 95870 Magny-en-Vexin" style={inputStyle}/>
            </label>
            <div style={{height:8}}/>
            <label><span style={labelText}>LIEN GOOGLE MAPS (OPTIONNEL)</span>
              <input type="text" value={data.stadium.gpsUrl}
                     onChange={e => updateStd('gpsUrl', e.target.value)}
                     placeholder="https://maps.google.com/..." style={inputStyle}/>
            </label>
          </>
        ) : (
          <div style={{fontSize:13, lineHeight:1.5, color:'rgba(255,255,255,0.85)'}}>
            {club.stadium?.name || club.stadium?.address ? (
              <>
                <div style={{fontWeight:800}}>{club.stadium?.name || '—'}</div>
                {club.stadium?.address && <div style={{opacity:0.75, marginTop:3}}>📍 {club.stadium.address}</div>}
                {club.stadium?.gpsUrl && (
                  <a href={club.stadium.gpsUrl} target="_blank" rel="noopener noreferrer"
                     style={{color:'#7dd3fc', fontSize:11.5, marginTop:6, display:'inline-block'}}>
                    🗺️ Ouvrir dans Google Maps →
                  </a>
                )}
              </>
            ) : (
              <div style={{opacity:0.5, fontStyle:'italic'}}>Non renseigné</div>
            )}
          </div>
        )}
      </div>

      {/* CONTACTS */}
      <div style={sectionStyle}>
        <div style={sectionHeader}><span>👥</span><span>Contacts du club</span></div>
        {edit ? (
          <>
            {data.contacts.length === 0 && (
              <div style={{fontSize:12, opacity:0.55, fontStyle:'italic', marginBottom:10}}>
                Aucun contact. Ajoute le président, secrétaire, dirigeants, autres coachs…
              </div>
            )}
            {data.contacts.map((c, idx) => (
              <div key={c.id} style={{
                padding:'10px', borderRadius:8, marginBottom:8,
                background:'rgba(255,255,255,0.03)',
                border:'1px solid rgba(255,255,255,0.07)',
              }}>
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:6}}>
                  <input type="text" value={c.role}
                         onChange={e => updateContact(c.id, 'role', e.target.value)}
                         placeholder="Rôle (ex: Président)" style={inputStyle}/>
                  <input type="text" value={c.name}
                         onChange={e => updateContact(c.id, 'name', e.target.value)}
                         placeholder="Nom complet" style={inputStyle}/>
                </div>
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:6}}>
                  <input type="tel" value={c.phone}
                         onChange={e => updateContact(c.id, 'phone', e.target.value)}
                         placeholder="Téléphone" style={inputStyle}/>
                  <input type="email" value={c.email}
                         onChange={e => updateContact(c.id, 'email', e.target.value)}
                         placeholder="Email" style={inputStyle}/>
                </div>
                <button onClick={() => removeContact(c.id)}
                  style={{
                    background:'transparent', border:'1px solid rgba(255,80,80,0.30)',
                    color:'#ff8a8a', padding:'4px 10px', borderRadius:6,
                    fontSize:11, cursor:'pointer', fontWeight:700,
                  }}>🗑 Supprimer</button>
              </div>
            ))}
            <button onClick={addContact}
              style={{
                width:'100%', padding:'10px', borderRadius:9, cursor:'pointer',
                background:'transparent', color:'rgba(255,255,255,0.7)',
                border:'1px dashed rgba(255,255,255,0.20)',
                fontSize:12, fontWeight:700,
              }}>
              + Ajouter un contact
            </button>
          </>
        ) : (
          <>
            {(!club.contacts || club.contacts.length === 0) ? (
              <div style={{fontSize:13, opacity:0.5, fontStyle:'italic'}}>Aucun contact renseigné</div>
            ) : (
              <div style={{display:'flex', flexDirection:'column', gap:6}}>
                {club.contacts.map((c, i) => (
                  <div key={c.id || i} style={{
                    padding:'10px 12px', borderRadius:8,
                    background:'rgba(255,255,255,0.03)',
                    border:'1px solid rgba(255,255,255,0.06)',
                  }}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:6}}>
                      <div>
                        <div style={{fontSize:13, fontWeight:800}}>{c.name || '—'}</div>
                        <div style={{fontSize:10.5, opacity:0.65, letterSpacing:'.04em',
                                     textTransform:'uppercase', fontWeight:700, marginTop:2}}>
                          {c.role || 'Contact'}
                        </div>
                      </div>
                      <div style={{display:'flex', gap:8, alignItems:'center'}}>
                        {c.phone && (
                          <a href={`tel:${c.phone.replace(/\s/g, '')}`}
                             style={{color:'#c8f169', fontSize:11, textDecoration:'none', fontWeight:700}}>
                            📞 {c.phone}
                          </a>
                        )}
                        {c.email && (
                          <a href={`mailto:${c.email}`}
                             style={{color:'#7dd3fc', fontSize:11, textDecoration:'none', fontWeight:700}}>
                            ✉️
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* DISTRICT / FÉDÉRATION */}
      <div style={sectionStyle}>
        <div style={sectionHeader}><span>🏆</span><span>Fédération & district</span></div>
        {edit ? (
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
            <label><span style={labelText}>FÉDÉRATION</span>
              <input type="text" value={data.federation}
                     onChange={e => setData(d => ({ ...d, federation: e.target.value }))}
                     placeholder="ex: FFF" style={inputStyle}/>
            </label>
            <label><span style={labelText}>DISTRICT / LIGUE</span>
              <input type="text" value={data.district}
                     onChange={e => setData(d => ({ ...d, district: e.target.value }))}
                     placeholder="ex: District Val-d'Oise" style={inputStyle}/>
            </label>
          </div>
        ) : (
          <div style={{fontSize:13, color:'rgba(255,255,255,0.8)'}}>
            {club.federation || club.district ? (
              <span>{club.federation || ''}{club.federation && club.district ? ' · ' : ''}{club.district || ''}</span>
            ) : (
              <span style={{opacity:0.5, fontStyle:'italic'}}>Non renseigné</span>
            )}
          </div>
        )}
      </div>

      {/* RÉSEAUX SOCIAUX */}
      <div style={sectionStyle}>
        <div style={sectionHeader}><span>🌐</span><span>Présence en ligne</span></div>
        {edit ? (
          <>
            <label><span style={labelText}>SITE WEB</span>
              <input type="text" value={data.socialMedia.website}
                     onChange={e => updateSoc('website', e.target.value)}
                     placeholder="https://..." style={inputStyle}/>
            </label>
            <div style={{height:6}}/>
            <label><span style={labelText}>FACEBOOK</span>
              <input type="text" value={data.socialMedia.facebook}
                     onChange={e => updateSoc('facebook', e.target.value)}
                     placeholder="https://facebook.com/..." style={inputStyle}/>
            </label>
            <div style={{height:6}}/>
            <label><span style={labelText}>INSTAGRAM</span>
              <input type="text" value={data.socialMedia.instagram}
                     onChange={e => updateSoc('instagram', e.target.value)}
                     placeholder="@nom ou URL" style={inputStyle}/>
            </label>
          </>
        ) : (
          (club.socialMedia?.website || club.socialMedia?.facebook || club.socialMedia?.instagram) ? (
            <div style={{display:'flex', gap:12, flexWrap:'wrap', fontSize:12}}>
              {club.socialMedia.website && (
                <a href={club.socialMedia.website} target="_blank" rel="noopener noreferrer"
                   style={{color:'#7dd3fc', fontWeight:700}}>🌐 Site</a>
              )}
              {club.socialMedia.facebook && (
                <a href={club.socialMedia.facebook} target="_blank" rel="noopener noreferrer"
                   style={{color:'#7dd3fc', fontWeight:700}}>📘 Facebook</a>
              )}
              {club.socialMedia.instagram && (
                <a href={club.socialMedia.instagram.startsWith('http') ? club.socialMedia.instagram : `https://instagram.com/${club.socialMedia.instagram.replace('@','')}`}
                   target="_blank" rel="noopener noreferrer"
                   style={{color:'#7dd3fc', fontWeight:700}}>📷 Instagram</a>
              )}
            </div>
          ) : (
            <div style={{fontSize:13, opacity:0.5, fontStyle:'italic'}}>Non renseigné</div>
          )
        )}
      </div>

      {/* BOUTONS save / cancel en mode édition */}
      {edit && (
        <div style={{display:'flex', gap:8, padding:'14px 14px 28px'}}>
          <button onClick={() => { setData(buildInitial()); setEdit(false); }}
            style={{
              flex:1, height:46, borderRadius:10, cursor:'pointer',
              background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.75)',
              border:'1px solid rgba(255,255,255,0.15)', fontSize:13, fontWeight:700,
            }}>Annuler</button>
          <button onClick={save}
            style={{
              flex:2, height:46, borderRadius:10, cursor:'pointer',
              background: savedFlash ? 'rgba(200,241,105,0.40)' : 'var(--acc, #c8f169)',
              color:'#000', border:'none', fontSize:14, fontWeight:900,
              letterSpacing:'.02em',
            }}>
            {savedFlash ? '✓ Enregistré' : '💾 Enregistrer les infos du club'}
          </button>
        </div>
      )}

    </div>
  );
}

window.ScreenClub = ScreenClub;
