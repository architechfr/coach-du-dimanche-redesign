/* global React */
/* ============================================================
   SCREEN — Carte de visite du coach (profil partageable)
   ============================================================
   2 modes :
   - Mode 'self' : l'utilisateur courant édite sa propre fiche
   - Mode 'public' : lecture seule d'un autre coach (?coach=UID)

   Props :
   - go (router)
   - uid : si fourni, c'est une vue publique de ce coach ;
           si absent, c'est la fiche de l'utilisateur courant.
   - publicView : true force le mode lecture seule
   ============================================================ */

const { useState: useStateCP, useEffect: useEffectCP } = React;

function ScreenCoachProfile({ go, tweaks, uid: uidFromProps, publicView }) {
  // Mode de chargement
  const myUid = (() => {
    try { return (localStorage.getItem('cdd_user_uid') || '').trim() || null; }
    catch (e) { return null; }
  })();
  const isPublic = !!publicView || (uidFromProps && uidFromProps !== myUid);
  const uid = uidFromProps || myUid;

  // ── État local ───────────────────────────────────────────────
  const [data, setData] = useStateCP(() =>
    window.CDD_COACH_PROFILE?.get?.(uid) || (window.CDD_COACH_PROFILE?.emptyProfile?.() || {})
  );
  const [edit, setEdit] = useStateCP(false);
  const [savedFlash, setSavedFlash] = useStateCP(false);
  const [loading, setLoading] = useStateCP(isPublic);
  const [notFound, setNotFound] = useStateCP(false);
  const [copiedLink, setCopiedLink] = useStateCP(false);

  // En mode public, on fetch le profil depuis le cloud (le local n'a probablement rien).
  useEffectCP(() => {
    if (!isPublic || !uid) { setLoading(false); return; }
    let alive = true;
    (async () => {
      try {
        const p = await window.CDD_COACH_PROFILE?.fetchPublic?.(uid);
        if (!alive) return;
        if (p) setData({ ...(window.CDD_COACH_PROFILE.emptyProfile()), ...p });
        else   setNotFound(true);
      } catch (e) { if (alive) setNotFound(true); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [isPublic, uid]);

  // ── Helpers UI ───────────────────────────────────────────────
  const updateField = (k, v) => setData(d => ({ ...d, [k]: v }));
  const updateSocial = (k, v) => setData(d => ({ ...d, social: { ...(d.social||{}), [k]: v } }));

  const onPhotoChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Image trop lourde (max 5 Mo)'); return; }
    try {
      const dataUrl = await window.CDD_COACH_PROFILE.compressPhoto(file);
      updateField('photoDataUrl', dataUrl);
    } catch (err) { alert('Échec de la compression image : ' + err.message); }
  };

  const save = () => {
    if (!myUid) { alert('Tu dois être connecté pour enregistrer ton profil.'); return; }
    try {
      window.CDD_COACH_PROFILE.set(myUid, data);
      setSavedFlash(true);
      setTimeout(() => { setSavedFlash(false); setEdit(false); }, 600);
    } catch (e) { alert('Sauvegarde échouée : ' + e.message); }
  };

  const shareLink = () => {
    if (!uid) return;
    const url = `${window.location.origin}/?coach=${encodeURIComponent(uid)}`;
    try {
      navigator.clipboard?.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (e) {
      prompt('Copie ce lien pour partager ta fiche :', url);
    }
    // Tente aussi un partage natif si dispo
    if (navigator.share) {
      navigator.share({
        title: `Carte de coach · ${window.CDD_COACH_PROFILE.displayName(data) || 'Coach'}`,
        url,
      }).catch(() => {});
    }
  };

  // ── Styles ───────────────────────────────────────────────────
  const inputStyle = {
    width:'100%', padding:'10px 12px', borderRadius:9, fontSize:13.5,
    background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.12)',
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

  // ── Cas particuliers ─────────────────────────────────────────
  if (loading) {
    return (
      <div className="scr fade-in" style={{padding:'40px 20px', textAlign:'center'}}>
        <div style={{fontSize:48, marginBottom:14}}>⏳</div>
        <div style={{fontSize:14, opacity:0.7}}>Chargement de la fiche…</div>
      </div>
    );
  }
  if (notFound) {
    return (
      <div className="scr fade-in" style={{padding:'40px 20px', textAlign:'center'}}>
        <div style={{fontSize:48, marginBottom:14}}>🔍</div>
        <div style={{fontSize:18, fontWeight:900, marginBottom:8}}>Fiche introuvable</div>
        <div style={{fontSize:13, opacity:0.65, lineHeight:1.5, maxWidth:340, margin:'0 auto 20px'}}>
          Ce coach n'a pas (encore) renseigné sa carte de visite,
          ou le lien est incorrect.
        </div>
        {go && (
          <button onClick={() => go('home')}
            style={{
              padding:'11px 22px', borderRadius:10, cursor:'pointer',
              background:'rgba(255,255,255,0.05)', color:'#fff',
              border:'1px solid rgba(255,255,255,0.15)',
              fontSize:13, fontWeight:700,
            }}>← Retour à l'accueil</button>
        )}
      </div>
    );
  }
  if (!uid) {
    return (
      <div className="scr fade-in" style={{padding:'40px 20px', textAlign:'center'}}>
        <div style={{fontSize:48, marginBottom:14}}>👤</div>
        <div style={{fontSize:18, fontWeight:900, marginBottom:8}}>Pas de fiche coach</div>
        <div style={{fontSize:13, opacity:0.65, lineHeight:1.5, maxWidth:340, margin:'0 auto 20px'}}>
          Connecte-toi pour créer ta carte de visite partageable.
        </div>
      </div>
    );
  }

  // ── Rendu principal ──────────────────────────────────────────
  const showEdit = !isPublic;
  const fullName = window.CDD_COACH_PROFILE.displayName(data) || 'Coach';
  const hasPhoto = !!data.photoDataUrl;

  return (
    <div className="scr fade-in" data-screen-label="Carte de coach">

      {/* HERO */}
      <div className="cv-hero">
        <div className="cv-hero-bg"/>
        <div className="cv-hero-grad"/>
        <div className="cv-hero-in" style={{alignItems:'center', textAlign:'center'}}>
          <div className="cv-hero-k">{isPublic ? 'CARTE DE COACH' : 'MA CARTE DE COACH'}</div>

          {/* Photo (édit possible si !isPublic) */}
          <div style={{position:'relative', margin:'14px auto 12px'}}>
            {hasPhoto ? (
              <img src={data.photoDataUrl} alt={fullName}
                style={{
                  width:108, height:108, borderRadius:'50%', objectFit:'cover',
                  border:'3px solid rgba(200,241,105,0.45)',
                  boxShadow:'0 4px 20px rgba(0,0,0,0.4)',
                }}/>
            ) : (
              <div style={{
                width:108, height:108, borderRadius:'50%',
                background:'rgba(255,255,255,0.05)',
                border:'3px solid rgba(200,241,105,0.25)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:42, color:'rgba(255,255,255,0.55)',
              }}>👤</div>
            )}
            {edit && (
              <label style={{
                position:'absolute', bottom:0, right:0,
                width:36, height:36, borderRadius:18,
                background:'#c8f169', color:'#000',
                display:'flex', alignItems:'center', justifyContent:'center',
                cursor:'pointer', fontSize:16, fontWeight:900,
                boxShadow:'0 2px 8px rgba(0,0,0,0.4)',
              }}>
                📷
                <input type="file" accept="image/*" onChange={onPhotoChange}
                       style={{display:'none'}}/>
              </label>
            )}
          </div>

          <div style={{fontSize:24, fontWeight:900, lineHeight:1.1}}>{fullName}</div>
          {data.experience && (
            <div style={{fontSize:12, opacity:0.7, marginTop:4}}>{data.experience}</div>
          )}

          {/* Bouton édit / partage */}
          {showEdit && !edit && (
            <div style={{display:'flex', gap:8, marginTop:14, justifyContent:'center', flexWrap:'wrap'}}>
              <button onClick={() => setEdit(true)}
                style={{
                  padding:'9px 14px', borderRadius:9, cursor:'pointer',
                  background:'rgba(200,241,105,0.10)', color:'#c8f169',
                  border:'1px solid rgba(200,241,105,0.40)',
                  fontSize:12, fontWeight:700, letterSpacing:'.04em',
                }}>✎ Éditer</button>
              <button onClick={shareLink}
                style={{
                  padding:'9px 14px', borderRadius:9, cursor:'pointer',
                  background:'rgba(125,211,252,0.10)', color:'#7dd3fc',
                  border:'1px solid rgba(125,211,252,0.40)',
                  fontSize:12, fontWeight:700, letterSpacing:'.04em',
                }}>
                {copiedLink ? '✓ Lien copié' : '↗ Partager ma fiche'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ÉDITION : champs d'identité */}
      {edit && (
        <div style={sectionStyle}>
          <div style={sectionHeader}><span>👤</span><span>Identité</span></div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
            <label><span style={labelText}>PRÉNOM</span>
              <input type="text" value={data.firstName}
                     onChange={e => updateField('firstName', e.target.value)}
                     placeholder="Florian" style={inputStyle}/>
            </label>
            <label><span style={labelText}>NOM</span>
              <input type="text" value={data.lastName}
                     onChange={e => updateField('lastName', e.target.value)}
                     placeholder="Clarisse" style={inputStyle}/>
            </label>
          </div>
          <div style={{height:8}}/>
          <label><span style={labelText}>NOM AFFICHÉ PUBLIQUEMENT (OPTIONNEL)</span>
            <input type="text" value={data.displayName}
                   onChange={e => updateField('displayName', e.target.value)}
                   placeholder="ex: Florian C." style={inputStyle}/>
          </label>
        </div>
      )}

      {/* BIO */}
      {(edit || data.bio) && (
        <div style={sectionStyle}>
          <div style={sectionHeader}><span>📝</span><span>Bio</span></div>
          {edit ? (
            <textarea value={data.bio} maxLength={280}
                      onChange={e => updateField('bio', e.target.value)}
                      placeholder="Quelques mots sur ton parcours, ta philosophie, ce que tu transmets…"
                      rows={3}
                      style={{ ...inputStyle, resize:'vertical', minHeight:70, fontFamily:'inherit' }}/>
          ) : (
            <div style={{fontSize:13.5, lineHeight:1.55, color:'rgba(255,255,255,0.88)'}}>
              {data.bio}
            </div>
          )}
          {edit && (
            <div style={{fontSize:10, opacity:0.5, marginTop:4, textAlign:'right'}}>
              {(data.bio || '').length}/280
            </div>
          )}
        </div>
      )}

      {/* PARCOURS / DIPLÔMES */}
      {(edit || data.experience || data.diplomas || data.currentClubs) && (
        <div style={sectionStyle}>
          <div style={sectionHeader}><span>🎓</span><span>Parcours</span></div>
          {edit ? (
            <>
              <label><span style={labelText}>EXPÉRIENCE</span>
                <input type="text" value={data.experience}
                       onChange={e => updateField('experience', e.target.value)}
                       placeholder="ex: 10 ans d'expérience U13–U17" style={inputStyle}/>
              </label>
              <div style={{height:8}}/>
              <label><span style={labelText}>DIPLÔMES</span>
                <input type="text" value={data.diplomas}
                       onChange={e => updateField('diplomas', e.target.value)}
                       placeholder="ex: BMF, CFF1, CFF3" style={inputStyle}/>
              </label>
              <div style={{height:8}}/>
              <label><span style={labelText}>CLUBS ACTUELS</span>
                <input type="text" value={data.currentClubs}
                       onChange={e => updateField('currentClubs', e.target.value)}
                       placeholder="ex: FCMH U15 A · FC Magny U13" style={inputStyle}/>
              </label>
            </>
          ) : (
            <div style={{fontSize:13, lineHeight:1.6, color:'rgba(255,255,255,0.85)'}}>
              {data.diplomas    && <div>🎓 <b>Diplômes :</b> {data.diplomas}</div>}
              {data.currentClubs && <div>⚽ <b>Clubs :</b> {data.currentClubs}</div>}
            </div>
          )}
        </div>
      )}

      {/* CONTACT */}
      {(edit || data.email || data.phone) && (
        <div style={sectionStyle}>
          <div style={sectionHeader}><span>📞</span><span>Contact</span></div>
          {edit ? (
            <>
              <label><span style={labelText}>TÉLÉPHONE</span>
                <input type="tel" value={data.phone}
                       onChange={e => updateField('phone', e.target.value)}
                       placeholder="06 12 34 56 78" style={inputStyle}/>
              </label>
              <div style={{fontSize:10, opacity:0.55, marginTop:4, lineHeight:1.4}}>
                Visible publiquement sur ta fiche. Laisse vide si tu ne veux pas le partager.
              </div>
              <div style={{height:8}}/>
              <label><span style={labelText}>EMAIL</span>
                <input type="email" value={data.email}
                       onChange={e => updateField('email', e.target.value)}
                       placeholder="ex: coach@gmail.com" style={inputStyle}/>
              </label>
            </>
          ) : (
            <div style={{display:'flex', flexDirection:'column', gap:8}}>
              {data.phone && (
                <a href={`tel:${data.phone.replace(/\s/g,'')}`}
                   style={{color:'#c8f169', fontSize:14, fontWeight:700, textDecoration:'none'}}>
                  📞 {data.phone}
                </a>
              )}
              {data.email && (
                <a href={`mailto:${data.email}`}
                   style={{color:'#7dd3fc', fontSize:14, fontWeight:700, textDecoration:'none'}}>
                  ✉️ {data.email}
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* RÉSEAUX SOCIAUX */}
      {(edit || data.social?.facebook || data.social?.instagram || data.social?.linkedin) && (
        <div style={sectionStyle}>
          <div style={sectionHeader}><span>🌐</span><span>Réseaux</span></div>
          {edit ? (
            <>
              <label><span style={labelText}>FACEBOOK</span>
                <input type="text" value={data.social?.facebook || ''}
                       onChange={e => updateSocial('facebook', e.target.value)}
                       placeholder="https://facebook.com/..." style={inputStyle}/>
              </label>
              <div style={{height:6}}/>
              <label><span style={labelText}>INSTAGRAM</span>
                <input type="text" value={data.social?.instagram || ''}
                       onChange={e => updateSocial('instagram', e.target.value)}
                       placeholder="@nom ou URL" style={inputStyle}/>
              </label>
              <div style={{height:6}}/>
              <label><span style={labelText}>LINKEDIN</span>
                <input type="text" value={data.social?.linkedin || ''}
                       onChange={e => updateSocial('linkedin', e.target.value)}
                       placeholder="https://linkedin.com/in/..." style={inputStyle}/>
              </label>
            </>
          ) : (
            <div style={{display:'flex', gap:12, flexWrap:'wrap', fontSize:12}}>
              {data.social?.facebook && (
                <a href={data.social.facebook} target="_blank" rel="noopener noreferrer"
                   style={{color:'#7dd3fc', fontWeight:700}}>📘 Facebook</a>
              )}
              {data.social?.instagram && (
                <a href={data.social.instagram.startsWith('http') ? data.social.instagram : `https://instagram.com/${data.social.instagram.replace('@','')}`}
                   target="_blank" rel="noopener noreferrer"
                   style={{color:'#7dd3fc', fontWeight:700}}>📷 Instagram</a>
              )}
              {data.social?.linkedin && (
                <a href={data.social.linkedin} target="_blank" rel="noopener noreferrer"
                   style={{color:'#7dd3fc', fontWeight:700}}>💼 LinkedIn</a>
              )}
            </div>
          )}
        </div>
      )}

      {/* CTA Save/Cancel en mode édition */}
      {edit && (
        <div style={{display:'flex', gap:8, padding:'14px 14px 28px'}}>
          <button onClick={() => {
                    setData(window.CDD_COACH_PROFILE.get(uid));
                    setEdit(false);
                  }}
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
            {savedFlash ? '✓ Enregistré' : '💾 Enregistrer ma fiche'}
          </button>
        </div>
      )}

      {/* Mode public : footer signature */}
      {isPublic && (
        <div style={{
          margin:'24px 14px 28px', padding:'12px',
          fontSize:10.5, opacity:0.45, textAlign:'center',
          borderTop:'1px solid rgba(255,255,255,0.06)',
        }}>
          Carte de visite générée par<br/>
          <b>Coach du Dimanche</b>
        </div>
      )}
    </div>
  );
}

window.ScreenCoachProfile = ScreenCoachProfile;
