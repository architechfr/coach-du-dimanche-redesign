/* global React, CDD_CLUB, CDD_PLAYERS */

/* ============================================================
   SCREEN — Transfert d'équipe entre coachs
   ============================================================ */

function ScreenTransfert({ go, tweaks }) {
  const [step, setStep] = useState(1);
  const [selectedTeams, setSelectedTeams] = useState({ "u15-d1": true, "u13-d2": false });
  const code = "K4M-7XR-9PQ";

  const toggle = (id) => setSelectedTeams(s => ({...s, [id]: !s[id]}));
  const teams = [
    { id:"u15-d1",   club:"FCMH",  name:"U15 D1",     n:18 },
    { id:"u13-d2",   club:"FCMH",  name:"U13 D2",     n:14 },
    { id:"vet-usdf", club:"USDF",      name:"Vétérans",   n:22 },
  ];

  return (
    <div className="scr scr-transfert fade-in" data-screen-label="14 Transfert">

      <div className="tr-hero">
        <div className="tr-hero-bg"/>
        <div className="tr-hero-grad"/>
        <div className="tr-hero-in">
          <div className="tr-hero-k">TRANSFERT DE PARAMÉTRAGE</div>
          <div className="tr-hero-title">Donne une équipe<br/>à un autre coach</div>
          <div className="tr-hero-sub">Effectif, photos, FFF, formation · validité 7 jours</div>
        </div>
      </div>

      <div className="tr-steps">
        {["Choisir", "Code", "Partager"].map((s,i) => (
          <div key={i} className={`tr-step ${step > i ? "done" : ""} ${step === i+1 ? "on" : ""}`}>
            <span className="tr-step-n">{i+1}</span>
            <span className="tr-step-l">{s}</span>
          </div>
        ))}
      </div>

      {step === 1 && (
        <>
          <div className="sec-h"><span className="t">Quelles équipes transférer ?</span></div>
          <div className="tr-teams">
            {teams.map(t => (
              <button key={t.id}
                className={`tr-team ${selectedTeams[t.id] ? "on" : ""}`}
                onClick={() => toggle(t.id)}>
                <div className="tr-team-club">{t.club}</div>
                <div className="tr-team-name">{t.name}</div>
                <div className="tr-team-n"><b>{t.n}</b> joueurs</div>
                <div className="tr-team-check">{selectedTeams[t.id] ? "✓" : ""}</div>
              </button>
            ))}
          </div>
          <div className="tr-cta">
            <button className="btn-cta" disabled={!Object.values(selectedTeams).some(v=>v)}
              onClick={() => setStep(2)}>
              <span>GÉNÉRER LE CODE</span><span className="arr">→</span>
            </button>
          </div>
        </>
      )}

      {step === 2 && (
        <div className="tr-code-screen">
          <div className="tr-code-k">CODE DE TRANSFERT · 8 CARACTÈRES</div>
          <div className="tr-code">
            {code.split("").map((c,i) => (
              <span key={i} className={c === "-" ? "tr-code-sep" : "tr-code-c"}>{c}</span>
            ))}
          </div>
          <div className="tr-code-meta">
            <span>🕓 Expire dans 7 jours</span>
            <span className="sep">·</span>
            <span>📦 {Object.values(selectedTeams).filter(v=>v).length} équipe(s)</span>
          </div>

          <div className="tr-qr">
            <div className="tr-qr-grid">
              {[...Array(225)].map((_,i) => (
                <span key={i} style={{
                  background: (i*7+i%13+Math.floor(i/15)) % 3 === 0 ? "#fff" : "#000"
                }}/>
              ))}
              <div className="tr-qr-mark tl"/>
              <div className="tr-qr-mark tr"/>
              <div className="tr-qr-mark bl"/>
            </div>
          </div>

          <div className="tr-cta">
            <button className="btn-cta" onClick={() => setStep(3)}>
              <span>PARTAGER LE LIEN</span><span className="arr">→</span>
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="tr-share-screen">
          <div className="sec-h"><span className="t">Partager via</span></div>
          <div className="tr-share-grid">
            {[
              { ic:"💬", l:"WhatsApp",  c:"#25d366" },
              { ic:"✉️", l:"Email",     c:"#3b82f6" },
              { ic:"💌", l:"SMS",       c:"#a78bfa" },
              { ic:"📋", l:"Copier",    c:"#6b7280" },
              { ic:"📤", l:"Plus...",   c:"#9ca3af" },
              { ic:"🔗", l:"Lien",      c:"#06b6d4" },
            ].map((s,i) => {
              const url = `https://coach-du-dimanche-redesign.vercel.app/?import=${code}`;
              const msg = `Rejoins mon équipe sur Coach du Dimanche ! Code: ${code}`;
              const handlers = {
                "WhatsApp": () => window.open(`https://wa.me/?text=${encodeURIComponent(msg + " · " + url)}`, "_blank"),
                "Email":    () => window.location.href = `mailto:?subject=${encodeURIComponent("Invitation Coach du Dimanche")}&body=${encodeURIComponent(msg + "\n\n" + url)}`,
                "SMS":      () => window.location.href = `sms:?body=${encodeURIComponent(msg + " · " + url)}`,
                "Copier":   async () => { try { await navigator.clipboard.writeText(url); alert("Lien copié !"); } catch(e) { prompt("Copie ce lien :", url); } },
                "Plus...":  async () => { try { await navigator.share({ title:"Coach du Dimanche", text:msg, url }); } catch(e) { /* user cancel */ } },
                "Lien":     async () => { try { await navigator.clipboard.writeText(url); alert("Lien copié !"); } catch(e) { prompt("Copie ce lien :", url); } },
              };
              return (
                <button key={i} className="tr-share-btn" onClick={handlers[s.l] || (()=>{})}>
                  <span className="tr-share-ic" style={{background:s.c}}>{s.ic}</span>
                  <span className="tr-share-l">{s.l}</span>
                </button>
              );
            })}
          </div>

          <div className="tr-share-link">
            <div className="tr-share-link-k">Lien direct</div>
            <div className="tr-share-link-v mono">coach-du-dimanche.app/?import={code}</div>
          </div>

          <div className="tr-cta">
            <button className="btn-cta ghost" onClick={() => { setStep(1); go("home"); }}>
              ← Terminer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

window.ScreenTransfert = ScreenTransfert;


/* ============================================================
   SCREEN — Sync cloud & multi-club
   ============================================================ */

function ScreenSyncCloud({ go, tweaks }) {
  const [active, setActive] = useState("u15-d1");
  const clubs = [
    { id:"asm",   name:"FCMH",        team:"U15 D1",      players:18, color:"#c8f169", on: true },
    { id:"usdf",  name:"USDF",            team:"Vétérans",    players:22, color:"#3b82f6", on: false },
    { id:"fcmh",  name:"FCMH",            team:"U11 D3",      players:12, color:"#f5c451", on: false },
  ];

  return (
    <div className="scr scr-sync fade-in" data-screen-label="15 Sync Cloud">

      <div className="sync-hero">
        <div className="sync-hero-bg"/>
        <div className="sync-hero-grad"/>
        <div className="sync-hero-in">
          <div className="sync-hero-k">SYNC CLOUD · MULTI-CLUB</div>
          <div className="sync-hero-title">Tes données suivent<br/>tous tes appareils</div>
          <div className="sync-status">
            <div className="sync-pulse"/>
            <span>Connecté · dernière sync il y a 2 min</span>
          </div>
        </div>
      </div>

      <div className="sync-account">
        <div className="sync-acc-avatar">FC</div>
        <div className="sync-acc-info">
          <b>Florian C.</b>
          <em>flo***@gmail.com</em>
          <span className="sync-acc-chip">Google</span>
        </div>
        <button className="sync-acc-sync" onClick={() => alert("Sync compte cloud — disponible avec l'auth Google (V2.x)")}>↻</button>
      </div>

      <div className="sec-h"><span className="t">Mes clubs</span><span className="a">{clubs.length} actifs</span></div>
      <div className="sync-clubs">
        {clubs.map(c => (
          <button key={c.id}
            className={`sync-club ${active === c.id ? "on" : ""}`}
            onClick={() => setActive(c.id)}>
            <div className="sync-club-badge" style={{background: c.color, color:"#0a0e14"}}>{c.name[0]}</div>
            <div className="sync-club-info">
              <b>{c.name}</b>
              <em>{c.team} · {c.players} joueurs</em>
            </div>
            <div className="sync-club-status">
              {active === c.id ? (
                <span className="sync-club-active">CLUB ACTIF</span>
              ) : (
                <span className="sync-club-arr">›</span>
              )}
            </div>
          </button>
        ))}
        <button className="sync-club-add" onClick={() => {
          const name = prompt("Nom du nouveau club :");
          if (!name) return;
          const team = prompt("Catégorie (ex: U15 D1) :", "U15 D1");
          if (!team) return;
          try {
            const arr = JSON.parse(localStorage.getItem("arb_clubs") || "[]");
            arr.push({ id:"club_"+Date.now(), name, team, players:0, color:"#"+Math.floor(Math.random()*16777215).toString(16) });
            localStorage.setItem("arb_clubs", JSON.stringify(arr));
            alert(`Club "${name}" ajouté. Recharge l'app pour le voir apparaître.`);
          } catch(e) { alert("Erreur sauvegarde : " + e.message); }
        }}>
          <div className="sync-club-add-ic">+</div>
          <span>Ajouter un club</span>
        </button>
      </div>

      <div className="sec-h"><span className="t">Activité sync</span></div>
      <div className="sync-activity">
        {[
          { t:"il y a 2 min", k:"PUSH", l:"Effectif U15 modifié (Hannachi blessé)", ic:"↑" },
          { t:"il y a 12 min", k:"PUSH", l:"Match préparé · vs FC Pontoise", ic:"↑" },
          { t:"il y a 1 h", k:"PULL", l:"Synchronisation depuis iPhone", ic:"↓" },
          { t:"il y a 3 h", k:"PUSH", l:"Vote post-match · 8 réponses", ic:"↑" },
          { t:"hier 22:14", k:"PULL", l:"Auto-sync au démarrage", ic:"↓" },
        ].map((a,i) => (
          <div className="sync-evt" key={i}>
            <span className={`sync-evt-ic sync-evt-${a.k.toLowerCase()}`}>{a.ic}</span>
            <div className="sync-evt-body">
              <b>{a.l}</b>
              <em>{a.k} · {a.t}</em>
            </div>
          </div>
        ))}
      </div>

      <div className="sync-actions">
        <button className="btn-cta" onClick={() => alert("Sync cloud Firestore — disponible avec l'auth Google (V2.x)")}>↻ FORCER UNE SYNC</button>
        <button className="btn-cta ghost" onClick={() => alert("Pull cloud — disponible avec l'auth Google (V2.x)")}>↧ Pull depuis cloud</button>
      </div>
    </div>
  );
}

window.ScreenSyncCloud = ScreenSyncCloud;


/* ============================================================
   SCREEN — Onboarding duo (refonte avec mode coach+arbitre)
   Already exists as ScreenOnboarding, expose enhanced version
   ============================================================ */


/* ============================================================
   SCREEN — Convocation parent (page reçue par les parents)
   ============================================================ */

function ScreenConvoParent({ go, tweaks }) {
  const [resp, setResp] = useState(null);
  const next = window.CDD_NEXT_MATCH;
  const me = window.CDD_PLAYERS.find(p => p.id === "p10"); // Sékou

  if (resp) {
    return (
      <div className="scr scr-cvp fade-in" data-screen-label="16 Convocation parent — répondu">
        <div className={`cvp-success cvp-success-${resp}`}>
          <div className="cvp-success-ic">
            {resp === "yes" ? "✓" : resp === "no" ? "✕" : "?"}
          </div>
          <div className="cvp-success-t">
            {resp === "yes" ? "Présence confirmée !" : resp === "no" ? "Absence enregistrée" : "Réponse incertaine"}
          </div>
          <div className="cvp-success-d">
            Ton coach a été notifié. Tu peux modifier ta réponse jusqu'au coup d'envoi.
          </div>
          <div className="cvp-success-card">
            <div className="cvp-success-card-k">RÉCAP MATCH</div>
            <div className="cvp-success-card-vs">
              <b>FCMH</b><i>VS</i><b>FC PONTOISE</b>
            </div>
            <div className="cvp-success-card-meta">
              <span>📅 {next.date}</span>
              <span>🏟️ {next.venue}</span>
              <span>👕 RDV 09h45 · vestiaire</span>
            </div>
          </div>
          <button className="btn-cta ghost" onClick={() => setResp(null)}>← Modifier ma réponse</button>
        </div>
      </div>
    );
  }

  return (
    <div className="scr scr-cvp fade-in" data-screen-label="16 Convocation parent">

      <div className="cvp-hero">
        <div className="cvp-hero-bg"/>
        <div className="cvp-hero-grad"/>
        <div className="cvp-hero-in">
          <div className="cvp-hero-k">CONVOCATION · FCMH U15 D1</div>
          <div className="cvp-hero-title">
            <span className="cvp-hero-name">{me.first}</span><br/>
            est convoqué
          </div>
          <div className="cvp-hero-pos">{POSITION_LABEL[me.pos] || me.pos} · #{me.num}</div>
        </div>
      </div>

      <div className="cvp-match">
        <div className="cvp-match-k">MATCH</div>
        <div className="cvp-match-vs">
          <div className="cvp-match-team">
            <div className="cvp-match-badge me">M</div>
            <span>FCMH</span>
          </div>
          <div className="cvp-match-vs-l">VS</div>
          <div className="cvp-match-team">
            <div className="cvp-match-badge them">P</div>
            <span>FC PONTOISE</span>
          </div>
        </div>
        <div className="cvp-match-info">
          <div><em>QUAND</em><b>{next.date}</b></div>
          <div><em>OÙ</em><b>{next.venue}</b></div>
          <div><em>RDV</em><b className="acc">09h45</b></div>
          <div><em>FIN PRÉVUE</em><b>12h30</b></div>
        </div>
      </div>

      <div className="cvp-coach-note">
        <div className="cvp-coach-note-avatar">FC</div>
        <div className="cvp-coach-note-body">
          <div className="cvp-coach-note-k">MOT DU COACH</div>
          <div className="cvp-coach-note-t">
            "Match important pour la 2<sup>e</sup> place. Sékou je compte sur toi en MOC — gros pressing devant. Pluie possible, prévoyez crampons longs."
          </div>
        </div>
      </div>

      <div className="cvp-question">Sékou sera-t-il présent ?</div>

      <div className="cvp-answers">
        <button className="cvp-answer cvp-yes" onClick={() => setResp("yes")}>
          <span className="cvp-answer-ic">✓</span>
          <span className="cvp-answer-l">JE VIENS</span>
        </button>
        <button className="cvp-answer cvp-no" onClick={() => setResp("no")}>
          <span className="cvp-answer-ic">✕</span>
          <span className="cvp-answer-l">ABSENT</span>
        </button>
        <button className="cvp-answer cvp-may" onClick={() => setResp("may")}>
          <span className="cvp-answer-ic">?</span>
          <span className="cvp-answer-l">PEUT-ÊTRE</span>
        </button>
      </div>

      <div className="cvp-meta">
        <span>📬 14 réponses sur 18 convoqués</span>
        <span>·</span>
        <span>4 en attente</span>
      </div>

      <div className="cvp-foot">
        Page de convocation · Coach du Dimanche · réponse anonyme, pas de compte requis
      </div>
    </div>
  );
}

window.ScreenConvoParent = ScreenConvoParent;
