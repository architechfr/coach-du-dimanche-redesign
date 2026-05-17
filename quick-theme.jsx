/* global React */
/* ============================================================
   QUICK THEME PICKER — floating button accessible everywhere
   ============================================================ */

const { useState: useState_QT, useEffect: useEffect_QT } = React;

const THEME_OPTIONS = [
  { id:"#c8f169", l:"Lime" },
  { id:"#f5c451", l:"Or" },
  { id:"#06b6d4", l:"Cyan" },
  { id:"#ef4444", l:"Rouge" },
  { id:"#a78bfa", l:"Violet" },
  { id:"#22c55e", l:"Vert" },
  { id:"#3b82f6", l:"Bleu" },
  { id:"#ec4899", l:"Rose" },
];

function QuickTheme({ value, onChange }) {
  const [open, setOpen] = useState_QT(false);

  // Close on escape
  useEffect_QT(() => {
    if (!open) return;
    const h = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open]);

  return (
    <>
      <button
        className="qt-fab"
        onClick={() => setOpen(o => !o)}
        aria-label="Changer la couleur"
        style={{background: `radial-gradient(circle at 30% 30%, ${value}, ${value}66)`}}>
        <span className="qt-fab-inner">🎨</span>
      </button>

      {open && (
        <div className="qt-overlay" onClick={() => setOpen(false)}>
          <div className="qt-panel" onClick={e => e.stopPropagation()}>
            <div className="qt-h">
              <span className="qt-t">COULEUR DE L'APP</span>
              <button className="qt-x" onClick={() => setOpen(false)}>✕</button>
            </div>
            <div className="qt-grid">
              {THEME_OPTIONS.map(c => (
                <button key={c.id}
                  className={`qt-sw ${value===c.id?"on":""}`}
                  onClick={() => { onChange(c.id); /* keep open to compare */ }}>
                  <span className="qt-sw-c" style={{background: c.id, boxShadow: value===c.id ? `0 0 24px ${c.id}` : 'none'}}/>
                  <span className="qt-sw-l">{c.l}</span>
                </button>
              ))}
            </div>
            <button className="qt-close-cta" onClick={() => setOpen(false)}>OK</button>
          </div>
        </div>
      )}
    </>
  );
}

window.QuickTheme = QuickTheme;
