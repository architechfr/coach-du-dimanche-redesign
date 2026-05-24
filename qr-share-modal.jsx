/* global React */
/* ============================================================
   QR SHARE MODAL — Modale partage d'un lien avec QR code
   ============================================================
   Réutilisable pour :
   - Invitations (lien ?invite=TOKEN)
   - Carte coach (?coach=UID)
   - Lien lecteur (?t=TOKEN)
   - Match amical, etc.

   Affiche un QR code grand format avec le lien dessous, boutons
   copier / partager natif. Idéal pour afficher au vestiaire ou
   en réunion parents pour scan rapide.

   Props :
   - title : titre de la modale (ex: "🔗 Invitation parent")
   - url   : URL à encoder (requis)
   - subtitle : description sous le QR (optionnel)
   - onClose() : fermeture
   ============================================================ */

function QRShareModal({ title, url, subtitle, onClose }) {
  const [copied, setCopied] = React.useState(false);
  const [shared, setShared] = React.useState(false);

  if (!url) return null;

  const copy = () => {
    try {
      navigator.clipboard?.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      prompt('Copie ce lien :', url);
    }
  };

  const share = async () => {
    if (!navigator.share) { copy(); return; }
    try {
      await navigator.share({ title: title || 'Lien Coach du Dimanche', url });
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch (e) { /* user a annulé */ }
  };

  // Impression : ouvre une fenêtre dédiée avec QR + titre, prête à imprimer
  // (utile pour afficher au vestiaire / sur le tableau du club).
  const printIt = () => {
    const w = window.open('', '_blank', 'width=420,height=540');
    if (!w) return;
    w.document.write(`
      <!doctype html><html><head><meta charset="utf-8"><title>${(title||'QR')}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif;
               padding: 32px; text-align: center; color: #111; }
        h1 { font-size: 18px; margin: 0 0 16px; }
        .sub { font-size: 12px; color: #555; margin-bottom: 18px; line-height: 1.4; }
        .qr  { margin: 8px auto; padding: 12px; background: #fff;
               border: 2px solid #111; display: inline-block; }
        .url { font-size: 11px; color: #444; word-break: break-all;
               margin-top: 14px; padding: 0 20px; }
        .foot{ font-size: 10px; color: #999; margin-top: 30px; letter-spacing: .04em; }
      </style></head>
      <body>
        <h1>${(title || 'Scanne le QR code').replace(/[^\x20-\x7EÀ-ſéèêëàâäîïôöùûüçÉÈÊËÀÂÄÎÏÔÖÙÛÜÇ\s_\-📋🔗📱👤🤝🎯🔢👟📋🪪🏟️📅🗓️]/g, '')}</h1>
        ${subtitle ? `<div class="sub">${subtitle}</div>` : ''}
        <div class="qr" id="qrhost"></div>
        <div class="url">${url}</div>
        <div class="foot">Coach du Dimanche</div>
        <script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js"></script>
        <script>
          const q = window.qrcode(0, 'M'); q.addData(${JSON.stringify(url)}); q.make();
          const cells = q.getModuleCount(); const margin = 2; const size = 280;
          const total = cells + margin*2; const cellSize = size/total;
          let path = '';
          for (let r=0; r<cells; r++) for (let c=0; c<cells; c++) {
            if (q.isDark(r,c)) {
              const x=(c+margin)*cellSize, y=(r+margin)*cellSize;
              path += 'M'+x+','+y+'h'+cellSize+'v'+cellSize+'h-'+cellSize+'z';
            }
          }
          document.getElementById('qrhost').innerHTML =
            '<svg xmlns="http://www.w3.org/2000/svg" width="'+size+'" height="'+size+'" viewBox="0 0 '+size+' '+size+'">'
            +'<rect width="'+size+'" height="'+size+'" fill="#fff"/>'
            +'<path d="'+path+'" fill="#000"/></svg>';
          setTimeout(() => window.print(), 250);
        </script>
      </body></html>
    `);
    w.document.close();
  };

  return (
    <div className="fi-sp-overlay" onClick={onClose}>
      <div className="fi-sp-sheet" onClick={e => e.stopPropagation()}
           style={{maxWidth:'420px', width:'94%'}}>
        <div className="fi-sp-h">
          <span className="fi-sp-t">{title || '📱 QR Code'}</span>
          <button className="fi-sp-x" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        {subtitle && (
          <div style={{padding:'12px 16px 4px', fontSize:12,
                       color:'rgba(255,255,255,0.7)', lineHeight:1.45,
                       borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
            {subtitle}
          </div>
        )}

        {/* QR code grand format sur fond blanc */}
        <div style={{padding:'18px 16px 12px', display:'flex', justifyContent:'center'}}>
          <div style={{
            padding:14, background:'#fff', borderRadius:14,
            display:'inline-block', border:'1px solid rgba(255,255,255,0.10)',
            boxShadow:'0 4px 18px rgba(0,0,0,0.30)',
          }}>
            {window.QRCode && <window.QRCode value={url} size={220}/>}
          </div>
        </div>

        <div style={{padding:'4px 16px 8px', fontSize:11, color:'rgba(255,255,255,0.55)',
                     textAlign:'center', lineHeight:1.4}}>
          Scanne avec ton téléphone pour ouvrir directement
        </div>

        {/* URL en clair */}
        <div style={{padding:'8px 16px'}}>
          <div style={{
            padding:'10px 12px', borderRadius:9,
            background:'rgba(255,255,255,0.04)',
            border:'1px solid rgba(255,255,255,0.10)',
            fontSize:11, color:'rgba(255,255,255,0.65)',
            wordBreak:'break-all', lineHeight:1.5,
            fontFamily:'monospace',
          }}>{url}</div>
        </div>

        {/* Boutons d'action */}
        <div style={{display:'flex', gap:8, padding:'10px 16px 14px',
                     flexWrap:'wrap'}}>
          <button onClick={copy} type="button"
            style={{
              flex:'1 1 100px', height:40, borderRadius:9, cursor:'pointer',
              background: copied ? 'rgba(200,241,105,0.25)' : 'rgba(255,255,255,0.05)',
              color: copied ? '#c8f169' : 'rgba(255,255,255,0.85)',
              border:'1px solid ' + (copied ? 'rgba(200,241,105,0.40)' : 'rgba(255,255,255,0.15)'),
              fontSize:12, fontWeight:700,
            }}>
            {copied ? '✓ Copié' : '⧉ Copier le lien'}
          </button>
          <button onClick={share} type="button"
            style={{
              flex:'1 1 100px', height:40, borderRadius:9, cursor:'pointer',
              background: shared ? 'rgba(125,211,252,0.25)' : 'rgba(125,211,252,0.10)',
              color:'#7dd3fc',
              border:'1px solid rgba(125,211,252,0.40)',
              fontSize:12, fontWeight:700,
            }}>
            {shared ? '✓ Partagé' : '↗ Partager'}
          </button>
          <button onClick={printIt} type="button"
            style={{
              flex:'1 1 100px', height:40, borderRadius:9, cursor:'pointer',
              background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.85)',
              border:'1px solid rgba(255,255,255,0.15)',
              fontSize:12, fontWeight:700,
            }}>
            🖨 Imprimer
          </button>
        </div>
      </div>
    </div>
  );
}

window.QRShareModal = QRShareModal;
