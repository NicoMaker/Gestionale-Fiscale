// ═══════════════════════════════════════════════════════════════
// SCORCIATOIE.JS — Pagina "Scorciatoie": elenco stampabile di TUTTI i
// tasti da tastiera di TUTTE le pagine. Legge lo stesso registro di
// shortcuts.js (window.GF_SHORTCUTS), quindi resta sempre allineata.
// Con FILTRI per categoria + RICERCA testuale.
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

  // ── Stato dei filtri (persistente in sessione) ──────────────
  const FILTRI = {
    ricerca: "",
    categorie: new Set(), // vuoto = tutte
  };

  // Categorie disponibili (le "macro" oltre alle singole pagine)
  const CATEGORIE_FISSE = [
    { id: "palette", label: "🔎 Ricerca rapida", icona: "🔎" },
    { id: "globali", label: "🌍 Ovunque", icona: "🌍" },
    { id: "nav", label: "🧭 Vai a… (g + lettera)", icona: "🧭" },
    { id: "modal", label: "🪟 Nelle finestre (modal)", icona: "🪟" },
  ];

  // ── Utility ─────────────────────────────────────────────────
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

  const sezione = (icona, titolo, corpo, extra = "", idCat = "") =>
    `<section class="sc-card ${extra}" data-cat="${idCat}"><h3><span class="sc-ico">${icona}</span>${titolo}</h3>${corpo}</section>`;

  // Normalizza per ricerca (minuscolo, senza accenti)
  const norm = (s) =>
    (s || "")
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  // ── Costruzione dell'indice di ricerca ──────────────────────
  function buildSezioni() {
    const R = window.GF_SHORTCUTS;
    if (!R)
      return {
        errore: true,
        sezioni: [],
      };
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

    const navTasti = NAV.map((n) => ({
      key: `g ${n[0]}`,
      label: `Vai a ${n[2]}`,
    })).concat([{ key: "g k", label: "Vai a Scorciatoie" }]);

    const sezioni = [];

    sezioni.push({
      id: "palette",
      icona: "🔎",
      titolo: "Ricerca rapida (Ctrl K)",
      tasti: palette,
    });

    sezioni.push({
      id: "globali",
      icona: "🌍",
      titolo: "Ovunque",
      tasti: GLOBALI,
    });

    sezioni.push({
      id: "nav",
      icona: "🧭",
      titolo: "Vai a… (g + lettera)",
      tasti: navTasti,
    });

    sezioni.push({
      id: "modal",
      icona: "🪟",
      titolo: "Nelle finestre (modal)",
      tasti: MODAL,
    });

    Object.entries(PAGINE).forEach(([k, p]) => {
      sezioni.push({
        id: k,
        icona: ICONE[k] || "📄",
        titolo: p.titolo,
        tasti: [...p.tasti, ...(p.lista ? LISTA_COMUNE : [])],
      });
    });

    return { errore: false, sezioni };
  }

  // ── Filtro ──────────────────────────────────────────────────
  function sezioneVisibile(sez) {
    // Filtro categoria
    if (FILTRI.categorie.size > 0 && !FILTRI.categorie.has(sez.id)) {
      return false;
    }
    // Filtro ricerca
    if (FILTRI.ricerca.trim()) {
      const q = norm(FILTRI.ricerca);
      const inTitolo = norm(sez.titolo).includes(q);
      const inTasti = sez.tasti.some(
        (t) => norm(t.key).includes(q) || norm(t.label).includes(q),
      );
      if (!inTitolo && !inTasti) return false;
    }
    return true;
  }

  // ── Barra filtri ────────────────────────────────────────────
  function renderBarraFiltri() {
    const tutteLeCategorie = CATEGORIE_FISSE.concat(
      Object.keys(ICONE).map((k) => ({
        id: k,
        label: `${ICONE[k]} ${k.replace(/_/g, " ")}`,
        icona: ICONE[k],
        dinamica: true,
      })),
    );

    const chips = tutteLeCategorie
      .map((c) => {
        const attiva = FILTRI.categorie.has(c.id);
        return `<button class="sc-chip ${attiva ? "sc-chip-on" : ""}"
                        data-cat="${c.id}"
                        onclick="window.scToggleCategoria('${c.id}')">${c.label}</button>`;
      })
      .join("");

    return `
      <div class="sc-filtri no-print">
        <div class="sc-filtri-row">
          <div class="sc-search-wrap">
            <input type="text"
                   id="sc-search-input"
                   class="sc-search-input"
                   placeholder="Cerca testo o descrizione…"
                   value="${FILTRI.ricerca.replace(/"/g, "&quot;")}"
                   oninput="window.scSetRicerca(this.value)" />
            ${
              FILTRI.ricerca
                ? `<button class="sc-search-clear" onclick="window.scClearRicerca()" title="Pulisci">✕</button>`
                : ""
            }
          </div>
          <button class="sc-chip sc-chip-reset ${FILTRI.categorie.size > 0 || FILTRI.ricerca ? "sc-chip-reset-on" : ""}"
                  onclick="window.scResetFiltri()"
                  title="Azzera tutti i filtri">
            ↺ Reset
          </button>
        </div>
        <div class="sc-filtri-cats">
          <span class="sc-filtri-lbl">Categorie:</span>
          ${chips}
        </div>
        <div class="sc-filtri-info" id="sc-filtri-info"></div>
      </div>
    `;
  }

  // ── Render principale ───────────────────────────────────────
  function renderContenuto() {
    const { errore, sezioni } = buildSezioni();
    if (errore) {
      return `<div class="empty"><p>Registro scorciatoie non caricato.</p></div>`;
    }

    const visibili = sezioni.filter(sezioneVisibile);
    const totale = sezioni.length;

    const htmlSezioni = visibili
      .map((s) => sezione(s.icona, s.titolo, tabella(s.tasti), "", s.id))
      .join("");

    const infoTesto =
      FILTRI.ricerca || FILTRI.categorie.size
        ? `Mostrate <strong>${visibili.length}</strong> di ${totale} sezioni`
        : `Mostrate <strong>${totale}</strong> sezioni`;

    setTimeout(() => {
      const el = document.getElementById("sc-filtri-info");
      if (el) el.innerHTML = infoTesto;
    }, 0);

    const contenuto = visibili.length
      ? `<div class="sc-grid">${htmlSezioni}</div>`
      : `<div class="empty sc-empty-filtri">
           <p>😕 Nessun risultato con i filtri attuali.</p>
           <button class="btn btn-secondary btn-sm" onclick="window.scResetFiltri()">↺ Azzera filtri</button>
         </div>`;

    return contenuto;
  }

  // ── API globale ─────────────────────────────────────────────
  window.scSetRicerca = function (v) {
    FILTRI.ricerca = v;
    aggiornaSoloContenuto();
  };

  window.scClearRicerca = function () {
    FILTRI.ricerca = "";
    aggiornaSoloContenuto();
  };

  window.scToggleCategoria = function (id) {
    if (FILTRI.categorie.has(id)) FILTRI.categorie.delete(id);
    else FILTRI.categorie.add(id);
    aggiornaSoloContenuto();
  };

  window.scResetFiltri = function () {
    FILTRI.ricerca = "";
    FILTRI.categorie.clear();
    aggiornaSoloContenuto();
  };

  // Aggiorna solo il blocco contenuto (mantiene il focus sull'input)
  function aggiornaSoloContenuto() {
    const wrap = document.getElementById("sc-contenuto-wrap");
    if (!wrap) return;

    const input = document.getElementById("sc-search-input");
    const selStart = input ? input.selectionStart : null;
    const selEnd = input ? input.selectionEnd : null;
    const hasFocus = input && document.activeElement === input;

    wrap.innerHTML =
      renderBarraFiltri() + `<div id="sc-sezioni">${renderContenuto()}</div>`;

    const nuovoInput = document.getElementById("sc-search-input");
    if (nuovoInput && hasFocus) {
      nuovoInput.focus();
      if (selStart !== null && selEnd !== null) {
        try {
          nuovoInput.setSelectionRange(selStart, selEnd);
        } catch (e) {
          /* noop */
        }
      }
    }
  }

  // ── Entry point pagina ──────────────────────────────────────
  window.renderScorciatoiePage = function () {
    document.getElementById("topbar-actions").innerHTML =
      `<button class="btn btn-print btn-sm no-print" onclick="window.print()" title="Stampa (Shift P)" style="font-size:13px">🖨️ Stampa</button>`;

    const hero = `
      <div class="sc-hero no-print">
        <div>
          <h2>Tutti i tasti, in un solo posto</h2>
          <p>Premi <kbd>Ctrl</kbd> <kbd>K</kbd> per cercare una pagina, <kbd>?</kbd> per la guida
          della pagina in cui sei, <kbd>Esc</kbd> per chiudere. Stampa questo foglio con
          <kbd>Shift</kbd> <kbd>P</kbd>.</p>
        </div>
      </div>`;

    document.getElementById("content").innerHTML = `
      <div class="sc-page">
        <div class="sc-print-title">⌨️ Scorciatoie da tastiera — Studio Fiscale</div>
        ${hero}
        <div id="sc-contenuto-wrap">
          ${renderBarraFiltri()}
          <div id="sc-sezioni">${renderContenuto()}</div>
        </div>
        <p class="sc-note">I tasti con lettera funzionano solo quando non stai scrivendo in un campo.
        Le eliminazioni chiedono sempre conferma.</p>
      </div>`;
  };
})();
