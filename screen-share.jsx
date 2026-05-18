/* global React, CDD_CLUB, CDD_NEXT_MATCH, CDD_CONVO, CDD_PLAYERS */

/* ============================================================
   SCREEN — Partager aux parents
   Module v40+ : URL courte → lecteur public + QR code
   + canaux natifs (WhatsApp / SMS / Email / Copier)
   ============================================================ */

const { useState: useSP, useEffect: useSPe, useMemo: useSPm } = React;

function ScreenSharePartage({ go, tweaks }) {
  const club = CDD_CLUB || {};
  const next = CDD_NEXT_MATCH || {};
  const convo = CDD_CONVO || {};
  const players = CDD_PLAYERS || [];

  // Persistent share token
  const token = useSPm(() => {
    try {
      let t = localStorage.getItem('cdd_share_token');
      if (!t) {
        t = Math.random().toString(36).slice(2, 9).toUpperCase();
        localStorage.setItem('cdd_share_token', t);
      }
      return t;
    } catch (e) { return 'PROTO123'; }
  }, []);

  const baseUrl = 'coach-du-dimanche.app/lecteur';
  const url = `${baseUrl}/?t=${token}`;
  const fullUrl = `https://${url}`;

  const [tab, setTab] = useSP('match'); // match | team | season
  const [copied, setCopied] = useSP(false);
  const [includes, setIncludes] = useSP({
    convocation: true,
    effectif: true,
    calendrier: true,
    classement: true,
    stats: false,
    photos: true,
  });

  const toggleInclude = (key) => setIncludes(s => ({...s, [key]: !s[key]}));

  // Build share message
  const teamLabel = club.team || 'mon équipe';
  const matchMsg = `📣 Convocation ${teamLabel}\n\n` +
    `${next.home || 'Mon club'} vs ${next.away || 'Adversaire'}\n` +
    `📅 ${next.date || 'à venir'}\n` +
    `🏟️ ${next.venue || 'lieu à confirmer'}\n` +
    `⏰ RDV vestiaire 09h45\n\n` +
    `Détails + ta réponse 1-tap :\n${fullUrl}`;

  const teamMsg = `👥 ${club.name || 'Mon club'} · ${teamLabel}\n` +
    `Saison ${club.season || '2025-26'}\n\n` +
    `Effectif, calendrier, classement live FFF :\n${fullUrl}`;

  const message = tab === 'match' ? matchMsg : tab === 'team' ? teamMsg :
    `📊 Bilan saison ${teamLabel}\n${fullUrl}`;

  const copy = () => {
    try { navigator.clipboard?.writeText(message); setCopied(true); setTimeout(()=>setCopied(false), 1800); }
    catch (e) {}
  };
  const shareNative = () => {
    if (navigator.share) {
      navigator.share({ title:'Coach du Dimanche', text: message, url: fullUrl }).catch(()=>{});
    } else { copy(); }
  };

  const tabs = [
    { id:'match',  l:'Prochain match', ic:'⚽', desc:'Convocation + RDV + réponse 1-tap' },
    { id:'team',   l:'Mon équipe',     ic:'👥', desc:'Effectif · calendrier · classement' },
    { id:'season', l:'Bilan saison',   ic:'📊', desc:'Stats équipe + matchs joués' },
  ];

  return (
    <div className="scr scr-share fade-in" data-screen-label="17 Partager parents">

      <div className="sp-hero">
        <div className="sp-hero-bg"/>
        <div className="sp-hero-grad"/>
        <div className="sp-hero-in">
          <div className="sp-hero-k">PARTAGE LECTURE SEULE</div>
          <div className="sp-hero-t">Partager aux parents<br/>et aux joueurs</div>
          <div className="sp-hero-s">
            Aucune donnée privée transmise · pas de compte requis
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sp-tabs">
        {tabs.map(t => (
          <button key={t.id} className={`sp-tab ${tab===t.id?'on':''}`} onClick={()=>setTab(t.id)}>
            <span className="sp-tab-ic">{t.ic}</span>
            <span className="sp-tab-l">{t.l}</span>
          </button>
        ))}
      </div>
      <div className="sp-tab-desc">{tabs.find(t=>t.id===tab)?.desc}</div>

      {/* What's included */}
      {tab === 'team' && (
        <div className="sp-includes">
          <div className="sp-includes-k">À inclure dans la page parents</div>
          <div className="sp-include-list">
            {[
              { k:'convocation', l:'📋 Convocations futures', desc:'Date · lieu · RDV' },
              { k:'effectif',    l:'👥 Effectif',             desc:`${players.length} joueurs · stats publiques` },
              { k:'calendrier',  l:'📅 Calendrier FFF',       desc:'Tous les matchs de la saison' },
              { k:'classement',  l:'🏆 Classement live',      desc:'Position dans la poule' },
              { k:'photos',      l:'🖼 Photos joueurs',        desc:'Photos FFF (publiques)' },
              { k:'stats',       l:'📈 Stats individuelles',  desc:'Buts/passes par joueur', sensitive: true },
            ].map(it => (
              <label key={it.k} className={`sp-include ${includes[it.k]?'on':''} ${it.sensitive?'sensitive':''}`}>
                <span className="sp-include-l">
                  <b>{it.l}</b>
                  <em>{it.desc}{it.sensitive && ' · sensible'}</em>
                </span>
                <span className="sp-include-tg">
                  <i className={includes[it.k]?'on':''}/>
                </span>
                <input type="checkbox" checked={includes[it.k]} onChange={()=>toggleInclude(it.k)}/>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* QR + URL card */}
      <div className="sp-qr-card">
        <div className="sp-qr-k">LIEN COURT · CODE {token}</div>
        <div className="sp-qr-wrap">
          {/* Vrai QR genere via qr-helper.jsx (lazy CDN) */}
          {window.QRCode ? (
            <window.QRCode value={`https://${baseUrl}/?t=${token}`} size={160}/>
          ) : (
            <div className="sp-qr" style={{
              width:160, height:160, background:'#fff',
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'#888', fontSize:11, borderRadius:6
            }}>Chargement QR…</div>
          )}
        </div>
        <div className="sp-url">
          <span className="sp-url-prefix">https://</span>
          <span className="sp-url-host">{baseUrl}</span>
          <span className="sp-url-token">/?t={token}</span>
        </div>
        <div className="sp-meta">
          <span>🔒 Lecture seule</span>
          <span className="sep">·</span>
          <span>🕓 Pas d'expiration</span>
          <span className="sep">·</span>
          <span>👤 Anonyme</span>
        </div>
      </div>

      {/* Message preview */}
      <div className="sp-msg-card">
        <div className="sp-msg-h">
          <span className="sp-msg-k">APERÇU DU MESSAGE</span>
          <button className={`sp-msg-copy ${copied?'on':''}`} onClick={copy}>
            {copied ? '✓ Copié' : '📋 Copier'}
          </button>
        </div>
        <pre className="sp-msg-body">{message}</pre>
      </div>

      {/* Channels */}
      <div className="sp-channels-k">PARTAGER VIA</div>
      <div className="sp-channels">
        <button className="sp-channel sp-ch-wa" onClick={()=>{
          const txt = encodeURIComponent(message);
          window.open(`https://wa.me/?text=${txt}`, '_blank');
        }}>
          <span className="sp-ch-ic">💬</span>
          <span className="sp-ch-l">WhatsApp</span>
          <span className="sp-ch-s">Groupe parents</span>
        </button>
        <button className="sp-channel sp-ch-sms" onClick={()=>{
          const txt = encodeURIComponent(message);
          window.open(`sms:?body=${txt}`, '_blank');
        }}>
          <span className="sp-ch-ic">💌</span>
          <span className="sp-ch-l">SMS</span>
          <span className="sp-ch-s">Direct</span>
        </button>
        <button className="sp-channel sp-ch-mail" onClick={()=>{
          const subject = encodeURIComponent(`Convocation ${teamLabel}`);
          const body = encodeURIComponent(message);
          window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
        }}>
          <span className="sp-ch-ic">✉️</span>
          <span className="sp-ch-l">Email</span>
          <span className="sp-ch-s">Liste parents</span>
        </button>
        <button className="sp-channel sp-ch-native" onClick={shareNative}>
          <span className="sp-ch-ic">📤</span>
          <span className="sp-ch-l">Plus…</span>
          <span className="sp-ch-s">Web Share</span>
        </button>
      </div>

      {/* CTA */}
      <div className="sp-cta-row">
        <button className="btn-cta ghost" onClick={()=>go('lecteur')}>
          👀 Aperçu page parents
        </button>
        <button className="btn-cta" onClick={shareNative}>
          <span>PARTAGER MAINTENANT</span>
          <span className="arr">→</span>
        </button>
      </div>

      <div className="sp-foot">
        Les parents reçoivent une page web · pas d'app à installer.<br/>
        Les données du club restent privées par défaut.
      </div>
    </div>
  );
}

window.ScreenSharePartage = ScreenSharePartage;
