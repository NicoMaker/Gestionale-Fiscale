// ═══════════════════════════════════════════════════════════════
// LEGGENDA.JS — Home, Leggenda dei colori e Paletta
//
//  • 🏠 Home      → torna sempre alla Dashboard (tasto "g h", pulsante in
//                   alto a sinistra, clic sul logo, ricerca Ctrl K, tasto "h"
//                   nel pannello Personalizza).
//  • 🌈 Leggenda  → cosa significa ogni colore (tasto "g l").
//  • 🖌️ Paletta   → tutti i colori in uso, con codice e leggibilità
//                   (tasto "g o"). Un clic su un colore del tema apre il
//                   pannello Personalizza proprio su quel colore.
//
// Legge i colori VERI dell'app (variabili CSS), quindi segue sempre il
// tema attivo e le tue personalizzazioni.
// ═══════════════════════════════════════════════════════════════
(function () {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) =>
    String(s).replace(
      /[&<>"]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
    );

  // ─── 🏠 HOME ────────────────────────────────────────────────
  function home() {
    chiudi();
    window.chiudiPersonalizza && window.chiudiPersonalizza();
    const ms = window.mobileSidebar;
    if (ms && ms.isOpen && ms.isOpen() && ms.close) ms.close();
    const voce = $('.nav-item[data-page="dashboard"]');
    if (voce) voce.click();
    const c = $("#content") || $(".content");
    if (c && c.scrollTo) c.scrollTo(0, 0);
  }

  // ─── LETTURA COLORI ─────────────────────────────────────────
  function parseCol(str) {
    let m = String(str).match(/rgba?\(([^)]+)\)/);
    if (m) {
      const p = m[1]
        .split(/[ ,/]+/)
        .filter(Boolean)
        .map(Number);
      return p.slice(0, 3).map(Math.round);
    }
    m = String(str).match(/color\(srgb\s+([\d.\s-]+)/);
    if (m) {
      const p = m[1].trim().split(/\s+/).map(Number);
      return p.slice(0, 3).map((v) => Math.round(v * 255));
    }
    return null;
  }
  const toHex = (a) =>
    a ? "#" + a.map((v) => v.toString(16).padStart(2, "0")).join("") : null;
  function varHex(nome) {
    const t = document.createElement("i");
    t.style.cssText = `position:absolute;visibility:hidden;color:var(${nome})`;
    document.body.appendChild(t);
    const c = getComputedStyle(t).color;
    t.remove();
    return toHex(parseCol(c));
  }
  const contrasto = (a, b) =>
    window.GF_PERSONALIZZA && window.GF_PERSONALIZZA.contrasto && a && b
      ? window.GF_PERSONALIZZA.contrasto(a, b)
      : null;

  // ─── DATI ───────────────────────────────────────────────────
  // [chiave modificabile | null, variabile CSS | null, nome, spiegazione]
  const TEMA = [
    ["accent", "--accent", "Accento", "bottoni, voce di menu attiva, link"],
    ["accent2", null, "Accento secondario", "seconda tinta delle sfumature"],
    ["bg", "--bg", "Sfondo pagina", "il fondo dietro a tutto"],
    ["s0", "--s0", "Schede e pannelli", "tabelle, finestre, menu"],
    ["t0", "--t0", "Testo", "il colore principale delle scritte"],
    [null, "--s1", "Superficie 2", "intestazioni tabella, campi (derivato)"],
    [null, "--b1", "Bordi", "linee e contorni (derivato)"],
    [null, "--t2", "Testo secondario", "etichette e note (derivato)"],
  ];
  const STATO = [
    ["green", "--green", "Verde", "completato, tutto a posto"],
    ["red", "--red", "Rosso", "da fare, errore"],
    ["blue", "--blue", "Blu", "parziale: una parte è fatta"],
    ["yellow", "--yellow", "Giallo", "in corso, avviso"],
    ["orange", "--orange", "Arancio", "scaduto"],
    ["purple", "--purple", "Viola", "solo testo (nota)"],
    [null, "--t3", "Grigio", "N/A, non dovuto (derivato)"],
  ];

  // ─── OVERLAY ────────────────────────────────────────────────
  let ov = null,
    tab = "leggenda";

  function costruisci() {
    ov = document.createElement("div");
    ov.className = "gf-ov";
    ov.id = "gf-ov";
    ov.hidden = true;
    ov.innerHTML = `
      <div class="gf-card" role="dialog" aria-modal="true" aria-label="Leggenda e paletta dei colori">
        <header class="gf-head">
          <h2>🎨 Colori</h2>
          <div class="gf-tabs" role="tablist">
            <button type="button" role="tab" data-tab="leggenda"><kbd>1</kbd> 🌈 Leggenda</button>
            <button type="button" role="tab" data-tab="paletta"><kbd>2</kbd> 🖌️ Paletta</button>
          </div>
          <button type="button" class="gf-x" data-az="chiudi" aria-label="Chiudi">Esc</button>
        </header>
        <div class="gf-body" tabindex="-1"></div>
        <footer class="gf-foot">
          <span><kbd>1</kbd> <kbd>2</kbd> o <kbd>←</kbd> <kbd>→</kbd> cambia scheda</span>
          <span><kbd>e</kbd> Personalizza</span>
          <span><kbd>h</kbd> 🏠 Home</span>
          <span><kbd>Esc</kbd> chiudi</span>
        </footer>
      </div>`;
    document.body.appendChild(ov);
    ov.addEventListener("mousedown", (e) => e.target === ov && chiudi());
    ov.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.tab) return mostra(b.dataset.tab);
      if (b.dataset.az === "chiudi") return chiudi();
      if (b.dataset.az === "home") return home();
      if (b.dataset.az === "stato") {
        chiudi();
        return window.GF_PERSONALIZZA.apriSezione("stato");
      }
      if (b.dataset.az === "personalizza") {
        chiudi();
        return window.apriPersonalizza && window.apriPersonalizza();
      }
      if (b.dataset.k) return scegli(b.dataset.k, b.dataset.hex);
    });
  }

  // ── Leggenda ──
  const chip = (cssVar, testo) =>
    `<span class="gf-chip" style="--c:var(${cssVar})">${esc(testo)}</span>`;

  function htmlLeggenda() {
    const riga = (campione, titolo, desc) =>
      `<tr><td class="gf-sample">${campione}</td><td><b>${titolo}</b><br><span class="gf-muted">${desc}</span></td></tr>`;
    const righe = [
      riga(
        '<span class="badge b-completato">Completato</span>',
        "🟢 Verde",
        "Fatto: l'adempimento è completato (o tutte le parti sono completate).",
      ),
      riga(
        '<span class="badge b-da_fare">Da fare</span>',
        "🔴 Rosso",
        "Da fare: non ancora iniziato, oppure manca tutto.",
      ),
      riga(
        chip("--blue", "Parziale"),
        "🔵 Blu",
        "Parziale: una parte è fatta (es. IVA fatta ma contabilità no, o qualche rata).",
      ),
      riga(
        '<span class="badge b-in_corso">In corso</span>',
        "🟡 Giallo",
        "In corso di lavorazione. Il giallo è usato anche per gli avvisi.",
      ),
      riga(
        '<span class="gf-scaduto">⚠️ SCADUTO</span>',
        "🟠 Arancio",
        "Scaduto: la data di scadenza è passata e l'adempimento non è completato.",
      ),
      riga(
        chip("--purple", "📝 Solo testo"),
        "🟣 Viola",
        "Voce di solo testo: una nota, senza stato da completare.",
      ),
      riga(
        '<span class="badge b-n_a">N/A</span>',
        "⚪ Grigio",
        "Non applicabile: non dovuto per questo cliente.",
      ),
    ].join("");

    let tip = "";
    if (typeof TIPOLOGIE_INFO !== "undefined") {
      tip = Object.entries(TIPOLOGIE_INFO)
        .map(
          ([cod, t]) =>
            `<span class="gf-tip"><i style="background:${esc(t.color)}"></i><b>${esc(cod)}</b> ${esc(t.desc)}</span>`,
        )
        .join("");
    }

    return `
      <p class="gf-lead">I colori di <b>stato</b> hanno sempre lo stesso significato e
        <b>non cambiano con il tema</b>: così verde, blu e rosso non si confondono mai.</p>
      <table class="gf-leg">${righe}</table>
      <h3>Come cambia la pillola di un adempimento</h3>
      <ul class="gf-reg">
        <li><b>Spunta</b> (sì/no): ${chip("--red", "rosso")} → ${chip("--green", "verde")} quando la spunti.</li>
        <li><b>Contabilità / IVA</b>: ${chip("--red", "rosso")} nessuna parte · ${chip("--blue", "blu")} una sola parte · ${chip("--green", "verde")} entrambe.</li>
        <li><b>Rate</b> (saldo, acconti): ${chip("--red", "rosso")} niente · ${chip("--blue", "blu")} qualcosa fatto · ${chip("--green", "verde")} tutto fatto.</li>
        <li><b>Solo scadenza</b>: ${chip("--red", "rosso")} da fare · ${chip("--orange", "arancio")} scaduta · ${chip("--green", "verde")} completata.</li>
      </ul>
      ${tip ? `<h3>Tipi di cliente</h3><div class="gf-tips">${tip}</div>` : ""}
      <p class="gf-act">
        <button type="button" class="gf-btn" data-az="stato">🎨 Cambia i colori di stato</button>
        <button type="button" class="gf-btn" data-az="home">🏠 Torna alla Home</button>
      </p>`;
  }

  // ── Paletta ──
  function htmlPaletta() {
    const P = window.GF_PERSONALIZZA;
    let eff = {};
    try {
      eff = P.effettivi();
    } catch (_) {}
    const s0 = varHex("--s0");
    const card = ([chiave, v, nome, desc]) => {
      const hex = (v && varHex(v)) || (chiave && eff[chiave]) || null;
      const bg = hex || "transparent";
      const r =
        hex && s0 && v !== "--bg" && v !== "--s0" ? contrasto(hex, s0) : null;
      const rt = r
        ? `<span class="gf-cr ${r >= 4.5 ? "ok" : r >= 3 ? "mid" : "bad"}">${r.toFixed(1)}:1</span>`
        : "";
      const act = chiave
        ? "✏️ clic per modificare"
        : "clic per copiare il codice";
      return `<button type="button" class="gf-sw" data-k="${chiave || ""}" data-hex="${hex || ""}" title="${act}">
        <span class="gf-sw-c" style="background:${bg}"></span>
        <span class="gf-sw-t"><b>${esc(nome)}</b><small>${esc(desc)}</small></span>
        <code>${hex || "—"}</code>${rt}
      </button>`;
    };
    const modo = P && P.modo && P.modo() === "dark" ? "scuro" : "chiaro";
    return `
      <p class="gf-lead">Tema <b>${modo}</b>. I numeri a destra sono la leggibilità sulle schede
        (<span class="gf-cr ok">4.5:1</span> ottimo). Clic su un colore con ✏️ per cambiarlo: si apre il
        pannello già sul suo codice.</p>
      <h3>Colori del tema</h3>
      <div class="gf-grid">${TEMA.map(card).join("")}</div>
      <h3>Colori di stato <span class="gf-muted">(uguali in ogni tema)</span></h3>
      <div class="gf-grid">${STATO.map(card).join("")}</div>
      <p class="gf-act">
        <button type="button" class="gf-btn" data-az="personalizza">🎨 Apri Personalizza</button>
        <button type="button" class="gf-btn" data-az="home">🏠 Torna alla Home</button>
      </p>`;
  }

  function scegli(chiave, hex) {
    if (chiave) {
      chiudi();
      return window.GF_PERSONALIZZA.apriColore(chiave);
    }
    if (hex && navigator.clipboard) {
      navigator.clipboard.writeText(hex).then(() => {
        if (typeof showNotif === "function")
          showNotif(`Codice ${hex} copiato`, "success");
      });
    }
  }

  function mostra(t) {
    tab = t === "paletta" ? "paletta" : "leggenda";
    ov.querySelectorAll("[data-tab]").forEach((b) => {
      const on = b.dataset.tab === tab;
      b.classList.toggle("on", on);
      b.setAttribute("aria-selected", on);
    });
    const body = $(".gf-body", ov);
    body.innerHTML = tab === "leggenda" ? htmlLeggenda() : htmlPaletta();
    body.scrollTop = 0;
  }

  function apri(t) {
    if (!ov) costruisci();
    ov.hidden = false;
    mostra(t || tab);
    $(".gf-body", ov).focus({ preventScroll: true });
  }
  function chiudi() {
    if (ov) ov.hidden = true;
  }

  // ─── TASTIERA (solo a finestra aperta; prima delle altre scorciatoie) ───
  document.addEventListener(
    "keydown",
    (e) => {
      if (!ov || ov.hidden) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const fatto = () => {
        e.preventDefault();
        e.stopImmediatePropagation();
      };
      const k = e.key.toLowerCase();
      if (e.key === "Escape") return (fatto(), chiudi());
      if (k === "1" || (e.key === "ArrowLeft" && tab === "paletta"))
        return (fatto(), mostra("leggenda"));
      if (k === "2" || (e.key === "ArrowRight" && tab === "leggenda"))
        return (fatto(), mostra("paletta"));
      if (k === "h") return (fatto(), home());
      if (k === "e") {
        fatto();
        chiudi();
        return window.apriPersonalizza && window.apriPersonalizza();
      }
      // Tab / frecce / Invio sui colori: comportamento normale
    },
    true,
  );

  // ─── PULSANTE 🏠 IN ALTO + LOGO ─────────────────────────────
  const barra = $(".topbar");
  if (barra) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "kb-trigger gf-home no-print";
    b.title = "Torna alla Home (g poi h)";
    b.setAttribute("aria-label", "Torna alla Home");
    b.innerHTML = "🏠 <span>Home</span>";
    b.onclick = home;
    barra.insertBefore(b, barra.firstChild);

    const lg = document.createElement("button");
    lg.type = "button";
    lg.className = "kb-trigger no-print";
    lg.title = "Leggenda e paletta dei colori (g poi l / g poi o)";
    lg.setAttribute("aria-label", "Leggenda e paletta dei colori");
    lg.innerHTML = "🌈 <span>Colori</span>";
    lg.onclick = () => apri("leggenda");
    barra.appendChild(lg);
  }
  const logo = $(".sidebar .logo");
  if (logo) {
    logo.style.cursor = "pointer";
    logo.title = "Torna alla Home";
    logo.addEventListener("click", home);
  }

  window.GF_AZIONI = {
    home,
    leggenda: () => apri("leggenda"),
    paletta: () => apri("paletta"),
  };
})();
