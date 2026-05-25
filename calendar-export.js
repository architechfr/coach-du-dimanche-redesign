/* global window */
/* ============================================================
   CALENDAR EXPORT — Génération de fichiers .ics pour ajouter
   un match au calendrier personnel (iPhone, Android, Google,
   Outlook, etc.). Le fichier .ics est un standard universel
   (RFC 5545) lu par tous les agendas.
   ============================================================
   API : window.CDD_CAL.{ buildMatchICS, downloadMatchICS }
   ============================================================ */

(function() {
  'use strict';

  // Échappe les caractères spéciaux dans une valeur ICS.
  // Selon la spec : virgules, points-virgules, backslashes et retours
  // ligne doivent être préfixés d'un \.
  function _esc(s) {
    return String(s || '')
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r?\n/g, '\\n');
  }

  // Formate une Date en YYYYMMDDTHHMMSS (heure locale, sans timezone).
  // L'agenda du téléphone l'interprète comme l'heure locale du device.
  function _fmtLocal(d) {
    const pad = (n) => String(n).padStart(2, '0');
    return d.getFullYear()
      + pad(d.getMonth() + 1)
      + pad(d.getDate())
      + 'T'
      + pad(d.getHours())
      + pad(d.getMinutes())
      + '00';
  }

  // Construit le contenu .ics complet pour UN match.
  // match = { id, home, away, dateISO, time, opponentName, venue, competition, isAmical, ... }
  // info  = { stadium: {name, address, gpsUrl}, kickoff, arrival, carpool, notes }
  //         (depuis CDD_MATCH_INFO.get(teamId, matchId), peut être null)
  function buildMatchICS(match, info) {
    if (!match) return '';

    const home = match.home || 'Mon équipe';
    const away = match.away || 'Adversaire';

    // ── Date + heure ─────────────────────────────────────────
    // 1. dateISO (YYYY-MM-DD) du match
    // 2. heure : kickoff de l'info, sinon match.time, sinon 14h00 par défaut
    let dateISO = match.dateISO || match.date || '';
    // Si format DD/MM/YYYY (FFF) → reconvertir
    const ddmmyyyy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dateISO);
    if (ddmmyyyy) dateISO = ddmmyyyy[3] + '-' + ddmmyyyy[2] + '-' + ddmmyyyy[1];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) {
      console.warn('[CDD_CAL] date invalide pour match', match.id, dateISO);
      return '';
    }
    const time = (info && info.kickoff) || match.time || '14:00';
    const [yyyy, mm, dd] = dateISO.split('-').map(Number);
    const [hh, mn] = String(time).split(':').map(Number);
    const start = new Date(yyyy, mm - 1, dd, hh || 14, mn || 0, 0);
    // Durée par défaut : 2h (90 min match + 30 min vestiaire/discussion)
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);

    // ── Lieu ─────────────────────────────────────────────────
    // Stade + adresse depuis match_info. Pour les matchs FFF, on a aussi
    // potentiellement venue = 'Domicile' → on pourrait aller chercher dans
    // CDD_CLUB.stadium. Mais c'est plus propre de laisser CDD_MATCH_INFO
    // pré-remplir avant l'export (cf. match-info-modal.jsx).
    let location = '';
    if (info && info.stadium) {
      const parts = [info.stadium.name, info.stadium.address].filter(Boolean);
      location = parts.join(', ');
    }

    // ── Description ──────────────────────────────────────────
    const lines = [];
    if (match.competition) lines.push(match.competition);
    if (info && info.arrival)  lines.push('RDV vestiaire : ' + info.arrival);
    if (info && info.kickoff)  lines.push("Coup d'envoi : " + info.kickoff);
    if (info && info.carpool && info.carpool.enabled) {
      lines.push('Covoiturage : ' + (info.carpool.place || '?') + (info.carpool.time ? ' à ' + info.carpool.time : ''));
    }
    if (info && info.notes) lines.push(info.notes);
    lines.push('');
    lines.push('🤖 Ajouté via Coach du Dimanche');

    // ── Construction de l'événement ──────────────────────────
    const uid = 'cdd-' + (match.id || 'match-' + Date.now()) + '@coach-du-dimanche.app';
    const summary = '⚽ ' + home + ' vs ' + away
      + (match.isAmical ? ' (Amical)' : '');

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Coach du Dimanche//FR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:' + uid,
      'DTSTAMP:' + _fmtLocal(new Date()),
      'DTSTART:' + _fmtLocal(start),
      'DTEND:' + _fmtLocal(end),
      'SUMMARY:' + _esc(summary),
      location ? 'LOCATION:' + _esc(location) : null,
      'DESCRIPTION:' + _esc(lines.join('\n')),
      // Alerte 2h avant
      'BEGIN:VALARM',
      'TRIGGER:-PT2H',
      'ACTION:DISPLAY',
      'DESCRIPTION:' + _esc('⚽ Match ' + home + ' vs ' + away + ' dans 2h'),
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ].filter(Boolean).join('\r\n');

    return ics;
  }

  // Déclenche le téléchargement du fichier .ics. Sur mobile, le navigateur
  // propose d'ouvrir avec l'app calendrier par défaut (Apple Calendar,
  // Google Calendar, Samsung Calendar, etc.).
  function downloadMatchICS(match, info) {
    const ics = buildMatchICS(match, info);
    if (!ics) {
      alert("Impossible de générer le fichier calendrier — la date du match est manquante ou invalide.");
      return false;
    }
    try {
      const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const filename = 'match-' + ((match && match.id) || Date.now()) + '.ics';
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      // Sur iOS Safari, le download n'est pas toujours déclenché par href :
      // on simule un click physique sur un <a> attaché au DOM.
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      return true;
    } catch (e) {
      console.error('[CDD_CAL] download échec', e);
      alert("Téléchargement bloqué par le navigateur. Sur iPhone, autorise les téléchargements depuis Réglages > Safari.");
      return false;
    }
  }

  window.CDD_CAL = { buildMatchICS, downloadMatchICS };
  console.info('[CDD_CAL] calendar-export ready');
})();
