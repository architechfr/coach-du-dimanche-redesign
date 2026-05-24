/* global window */
/* ============================================================
   COACH PROFILE — Carte de visite du coach
   ============================================================
   Profil partageable du coach (carte de visite numérique).
   Chaque coach a UN profil par compte Firebase (id = uid).

   Storage local : localStorage 'cdd_coach_profile_{uid}' (1 doc par uid).
   Cloud : collection coach_profiles, id = uid.

   Le profil est LISIBLE PUBLIQUEMENT (sans login) via un lien
   ?coach=UID — pour qu'un parent / dirigeant / autre coach puisse
   recevoir un lien et voir la fiche sans avoir à s'inscrire.
   Le coach contrôle ce qu'il met dedans (téléphone optionnel).
   ============================================================ */

(function() {
  const STORAGE_PREFIX = 'cdd_coach_profile_';

  function _keyFor(uid) { return STORAGE_PREFIX + String(uid); }

  function _read(uid) {
    if (!uid) return null;
    try { return JSON.parse(localStorage.getItem(_keyFor(uid)) || 'null'); }
    catch (e) { return null; }
  }
  function _write(uid, data) {
    if (!uid) return;
    try {
      if (data) localStorage.setItem(_keyFor(uid), JSON.stringify(data));
      else      localStorage.removeItem(_keyFor(uid));
    } catch (e) {}
  }

  // Forme par défaut.
  function emptyProfile() {
    return {
      firstName:    '',
      lastName:     '',
      displayName:  '',   // calculé "Florian C." si vide
      email:        '',
      phone:        '',
      photoDataUrl: '',
      bio:          '',   // max 280 chars
      experience:   '',   // "10 ans U13-U17"
      diplomas:     '',   // "BMF, CFF1, CFF3"
      currentClubs: '',   // "FCMH U15 A · FC Magny U13"
      social:       { facebook: '', instagram: '', linkedin: '' },
      updatedAt:    0,
    };
  }

  function get(uid) {
    if (!uid) return emptyProfile();
    const stored = _read(uid);
    if (!stored) return emptyProfile();
    const base = emptyProfile();
    return {
      ...base,
      ...stored,
      social: { ...base.social, ...(stored.social || {}) },
    };
  }

  // Profil de l'utilisateur courant (basé sur cdd_user_uid si dispo, sinon email).
  function getMine() {
    try {
      const uid = (localStorage.getItem('cdd_user_uid') || '').trim();
      if (uid) return get(uid);
    } catch (e) {}
    return emptyProfile();
  }
  function myUid() {
    try { return (localStorage.getItem('cdd_user_uid') || '').trim() || null; }
    catch (e) { return null; }
  }

  function hasAny(uid) {
    const p = get(uid);
    return !!(p.firstName || p.lastName || p.email || p.phone || p.bio
              || p.experience || p.diplomas || p.photoDataUrl);
  }

  // Set partiel (merge). Push cloud fire-and-forget.
  function set(uid, patch) {
    if (!uid || !patch) return;
    const merged = { ...get(uid), ...patch, updatedAt: Date.now() };
    if (patch.social) merged.social = { ...get(uid).social, ...patch.social };
    _write(uid, merged);
    try { window.dispatchEvent(new CustomEvent('cdd-coach-profile-changed', { detail: { uid } })); } catch (e) {}
    if (window.cddData?.saveCoachProfile) {
      window.cddData.saveCoachProfile(uid, merged)
        .catch(e => console.warn('[coach-profile] cloud push', e.message));
    }
  }

  // Compresse une image (drag and drop ou input file) en base64 ~ 400×400 JPEG 80%.
  function compressPhoto(file, maxSize = 400, quality = 0.80) {
    return new Promise((resolve, reject) => {
      if (!file) { resolve(''); return; }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('FileReader'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Image decode'));
        img.onload = () => {
          const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
          const w = Math.round(img.width * ratio);
          const h = Math.round(img.height * ratio);
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // Helpers de display
  function displayName(p) {
    if (!p) return '';
    if (p.displayName && p.displayName.trim()) return p.displayName.trim();
    const fn = (p.firstName || '').trim();
    const ln = (p.lastName  || '').trim();
    if (fn && ln) return fn + ' ' + ln.charAt(0).toUpperCase() + '.';
    return fn || ln || '';
  }

  // Récupère un profil depuis le cloud (utilisé par la vue publique ?coach=UID).
  async function fetchPublic(uid) {
    if (!uid || !window.cddData?.fetchCoachProfile) return null;
    try {
      const p = await window.cddData.fetchCoachProfile(uid);
      if (p) {
        // On met aussi en cache local (read-only pour le visiteur).
        _write(uid, p);
        try { window.dispatchEvent(new CustomEvent('cdd-coach-profile-changed', { detail: { uid } })); } catch (e) {}
      }
      return p;
    } catch (e) {
      console.warn('[coach-profile] fetch public', e.message);
      return null;
    }
  }

  window.CDD_COACH_PROFILE = {
    emptyProfile, get, getMine, myUid, hasAny, set,
    compressPhoto, displayName, fetchPublic,
  };
})();
