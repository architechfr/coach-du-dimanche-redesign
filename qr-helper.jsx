/* global React */
/* ============================================================
   qr-helper.jsx — Composant <QRCode> qui charge qrcode-generator
   en lazy depuis CDN et rend un SVG ou canvas.
   ============================================================ */

const { useEffect: useEffectQR, useRef: useRefQR, useState: useStateQR } = React;

let _qrLib = null;
let _qrPromise = null;

function loadQRLib() {
  if (_qrLib) return Promise.resolve(_qrLib);
  if (_qrPromise) return _qrPromise;
  _qrPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    // qrcode-generator @ jsDelivr (UMD, expose window.qrcode)
    s.src = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js';
    s.onload = () => {
      _qrLib = window.qrcode;
      resolve(_qrLib);
    };
    s.onerror = () => reject(new Error('Echec chargement qrcode-generator'));
    document.head.appendChild(s);
  });
  return _qrPromise;
}

/**
 * <QRCode value="https://..." size={140} dark="#000" light="#fff" margin={2}/>
 * Genere un vrai QR code en SVG (scalable, sans rasterisation).
 * Niveau ECC : M (par defaut, bonne balance lisibilite / capacite).
 */
function QRCode({ value, size = 140, dark = '#000', light = '#fff', margin = 2, ecc = 'M' }) {
  const ref = useRefQR(null);
  const [err, setErr] = useStateQR(null);

  useEffectQR(() => {
    if (!value || !ref.current) return;
    let cancelled = false;
    loadQRLib().then(qrcode => {
      if (cancelled) return;
      try {
        const typeNumber = 0; // auto
        const q = qrcode(typeNumber, ecc);
        q.addData(String(value));
        q.make();
        const cells = q.getModuleCount();
        const total = cells + margin * 2;
        const cellSize = size / total;
        // Construire le SVG
        let path = '';
        for (let r = 0; r < cells; r++) {
          for (let c = 0; c < cells; c++) {
            if (q.isDark(r, c)) {
              const x = (c + margin) * cellSize;
              const y = (r + margin) * cellSize;
              path += `M${x},${y}h${cellSize}v${cellSize}h-${cellSize}z`;
            }
          }
        }
        ref.current.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">
            <rect width="${size}" height="${size}" fill="${light}"/>
            <path d="${path}" fill="${dark}"/>
          </svg>
        `;
      } catch (e) {
        setErr(e.message);
      }
    }).catch(e => { if (!cancelled) setErr(e.message); });
    return () => { cancelled = true; };
  }, [value, size, dark, light, margin, ecc]);

  if (err) {
    return <div style={{padding:8, color:'#ff8a8a', fontSize:11}}>QR err : {err}</div>;
  }
  return <div ref={ref} style={{width: size, height: size, display:'inline-block'}}/>;
}

window.QRCode = QRCode;
