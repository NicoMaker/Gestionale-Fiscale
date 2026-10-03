// ═══════════════════════════════════════════════════════════════
// SCORCIATOIE.JS — Pagina "Scorciatoie": elenco stampabile di TUTTI i
// tasti da tastiera di TUTTE le pagine. Legge lo stesso registro di
// shortcuts.js (window.GF_SHORTCUTS), quindi resta sempre allineata.
// ═══════════════════════════════════════════════════════════════
(function () {
  "use strict";

  const ICONE = {
    dashboard: "📊",
    clienti: "👥",
    scadenzario: "📅",
    scadenzario_globale: "🌐",
    sintesi: "🗓️",
    adempimenti: "📋",
    tipologie: "🏷️",
    appunti: "📆",
    pagina_bianca: "📝",
    cestino: "🗑️",
    scorciatoie: "⌨️",
  };

  const kbd = (s) =>
    s
      .split(" / ")
      .map((p) =>
        p
          .split(" ")
          .map((x) => (/^(poi|lettera)$/.test(x) ? x : `<kbd>${x}</kbd>`))
          .join(" "),
      )
      .join(" <span class='sc-or'>oppure</span> ");

  const tabella = (arr) =>
    `<table class="sc-table"><tbody>${arr
      .map(
        (t) =>
          `<tr><td class="sc-k">${kbd(t.key)}</td><td>${t.label}</td></tr>`,
      )
      .join("")}</tbody></table>`;

  const sezione = (icona, titolo, corpo, extra = "") =>
    `<section class="sc-card ${extra}"><h3><span class="sc-ico">${icona}</span>${titolo}</h3>${corpo}</section>`;

  function costruisci() {
    const R = window.GF_SHORTCUTS;
    if (!R)
      return `<div class="empty"><p>Registro scorciatoie non caricato.</p></div>`;
    const { PAGINE, GLOBALI, MODAL, NAV, LISTA_COMUNE } = R;

    const palette = [
      { key: "Ctrl K / ⌘ K", label: "Apre la ricerca rapida «Vai a…»" },
      { key: "↑ / ↓", label: "Scorre le pagine nell'elenco" },
      { key: "Invio", label: "Apre la pagina evidenziata" },
      {
        key: "Esc",
        label:
          "Chiude la ricerca (oppure clic sul tasto Esc con il mouse, o fuori dalla finestra)",
      },
    ];

    const nav = `<div class="sc-nav">${NAV.map(
      (n) => `<span><kbd>g</kbd> <kbd>${n[0]}</kbd> <b>${n[2]}</b></span>`,
    ).join("")}<span><kbd>g</kbd> <kbd>k</kbd> <b>Scorciatoie</b></span></div>
      <p class="sc-note">Premi <kbd>g</kbd> e, entro 2,5 secondi, la lettera.</p>`;

    const pagine = Object.entries(PAGINE)
      .map(([k, p]) =>
        sezione(
          ICONE[k] || "📄",
          p.titolo,
          tabella([...p.tasti, ...(p.lista ? LISTA_COMUNE : [])]),
        ),
      )
      .join("");

    return `
    <div class="sc-page">
      <div class="sc-print-title">⌨️ Scorciatoie da tastiera — Studio Fiscale</div>
      <div class="sc-hero no-print">
        <div>
          <h2>Tutti i tasti, in un solo posto</h2>
          <p>Premi <kbd>Ctrl</kbd> <kbd>K</kbd> per cercare una pagina, <kbd>?</kbd> per la guida
          della pagina in cui sei, <kbd>Esc</kbd> per chiudere. Stampa questo foglio con
          <kbd>Shift</kbd> <kbd>P</kbd>.</p>
        </div>
        <button class="btn btn-print no-print" onclick="window.print()">🖨️ Stampa</button>
      </div>
      <div class="sc-grid">
        ${sezione("🔎", "Ricerca rapida (Ctrl K)", tabella(palette))}
        ${sezione("🌍", "Ovunque", tabella(GLOBALI))}
        ${sezione("🧭", "Vai a… (g + lettera)", nav)}
        ${sezione("🪟", "Nelle finestre (modal)", tabella(MODAL))}
        ${pagine}
      </div>
      <p class="sc-note">I tasti con lettera funzionano solo quando non stai scrivendo in un campo.
      Le eliminazioni chiedono sempre conferma.</p>
    </div>`;
  }

  window.renderScorciatoiePage = function () {
    document.getElementById("topbar-actions").innerHTML =
      `<button class="btn btn-print btn-sm no-print" onclick="window.print()" title="Stampa (Shift P)" style="font-size:13px">🖨️ Stampa</button>`;
    document.getElementById("content").innerHTML = costruisci();
  };
})();
