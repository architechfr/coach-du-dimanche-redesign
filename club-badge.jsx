/* global React */

/* ============================================================
   CLUB BADGE — composant unifié pour afficher un logo de club
   ────────────────────────────────────────────────────────────
   Une seule source de vérité pour le rendu du club, partout dans
   l'app. Affiche le logo si dispo, sinon un cercle/carré coloré
   avec l'initiale (fallback historique).

   Source du logo : window.CDD_LOGO.getForClub(clubId)
     1. cdd_club_logos[clubId] (storage principal, multi-club)
     2. arb_clubs.find().logoDataUrl (fallback)
     3. null sinon → fallback initiale + couleur

   Re-render auto sur cdd-data-rebuilt (declenche par les uploads
   et changements de club actif).
   ============================================================ */

// ─── Helper global de résolution du logo ───
(function () {
  function getForClub(clubId) {
    if (!clubId) return null;
    try {
      const logos = JSON.parse(localStorage.getItem('cdd_club_logos') || '{}');
      if (logos[clubId]) return logos[clubId];
    } catch (e) {}
    try {
      const clubs = JSON.parse(localStorage.getItem('arb_clubs') || '[]');
      const c = clubs.find(x => x.id === clubId);
      if (c && c.logoDataUrl) return c.logoDataUrl;
    } catch (e) {}
    return null;
  }
  function getForActiveClub() {
    let clubId = null;
    try {
      const ctx = JSON.parse(localStorage.getItem('cdd_active_context') || '{}');
      clubId = ctx.clubId || localStorage.getItem('arb_current_club');
    } catch (e) {}
    return getForClub(clubId);
  }
  window.CDD_LOGO = { getForClub, getForActiveClub };
})();

// ─── Composant unifié ───
// Props :
//   clubId        : id du club (preferé pour le multi-club)
//   clubName      : nom du club (utilisé pour l'initiale fallback)
//   colors        : [primary, secondary] couleurs du club (pour le fallback)
//   size          : taille en px (defaut 32)
//   className     : classe CSS additionnelle
//   forceLogo     : dataUrl directe (court-circuite la résolution, utile pour
//                   afficher un logo qu'on a deja chargé via FFF API)
//   shape         : 'square' (defaut) | 'circle' (pour les cards avec rond)
//   showName      : si true, affiche le nom à droite du badge
//   nameStyle     : style additionnel pour le nom
function ClubBadge({
  clubId, clubName, colors,
  size = 32, className = '',
  forceLogo = null, shape = 'square',
  showName = false, nameStyle,
}) {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const onChange = () => setTick(t => t + 1);
    window.addEventListener('cdd-data-rebuilt', onChange);
    window.addEventListener('cdd-active-club-changed', onChange);
    return () => {
      window.removeEventListener('cdd-data-rebuilt', onChange);
      window.removeEventListener('cdd-active-club-changed', onChange);
    };
  }, []);

  const logo = forceLogo
    || (clubId ? window.CDD_LOGO?.getForClub?.(clubId) : null)
    || null;
  const initial = String((clubName || '?')[0] || '?').toUpperCase();
  const c1 = (colors && colors[0]) || '#c8f169';
  const c2 = (colors && colors[1]) || '#0a0e14';
  const isCircle = shape === 'circle';
  const radius = isCircle ? size / 2 : Math.max(4, size * 0.22);

  const badgeStyle = {
    width: size, height: size,
    borderRadius: radius,
    flexShrink: 0,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  };

  const badge = logo ? (
    <span className={`club-badge club-badge-img ${className}`}
          title={clubName || ''}
          style={{
            ...badgeStyle,
            background: '#fff',
            border: `1.5px solid ${c1}`,
          }}>
      <img src={logo} alt={clubName || ''}
           style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
    </span>
  ) : (
    <span className={`club-badge club-badge-init ${className}`}
          title={clubName || ''}
          style={{
            ...badgeStyle,
            background: c1, color: c2,
            fontWeight: 900,
            fontSize: Math.max(10, size * 0.45),
            letterSpacing: '-0.02em',
            textShadow: c2 === '#0a0e14' || c2 === '#000000' ? 'none' : '0 1px 2px rgba(0,0,0,0.3)',
          }}>{initial}</span>
  );

  if (!showName) return badge;

  return (
    <span style={{display:'inline-flex', alignItems:'center', gap:8}}>
      {badge}
      <span style={{fontWeight:800, ...(nameStyle || {})}}>{clubName || ''}</span>
    </span>
  );
}

window.ClubBadge = ClubBadge;
