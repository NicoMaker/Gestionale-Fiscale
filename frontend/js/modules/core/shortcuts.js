// ═══════════════════════════════════════════════════════════════
// SHORTCUTS.JS — Scorciatoie da tastiera per TUTTE le pagine
//
//  • Un'unica tabella (REGISTRO) descrive i tasti di ogni pagina.
//  • La stessa tabella genera la guida in-app (tasto ? oppure F1),
//    così guida e comportamento non possono andare fuori sincrono.
//  • I tasti "semplici" (lettere) NON scattano mentre si scrive in un
//    campo di testo; le combinazioni con Ctrl/Alt funzionano sempre.
//  • Le azioni distruttive richiamano le stesse funzioni dei pulsanti,
//    quindi mantengono la loro finestra di conferma.
// ═══════════════════════════════════════════════════════════════
(function () {
  "use strict";

  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || "");
  const MOD = isMac ? "⌘" : "Ctrl";

  // ─── HELPER DOM ─────────────────────────────────────────────
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const visible = (el) =>
    !!el && !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);

  // Primo elemento visibile con onclick che contiene la funzione indicata
  function byFn(fn, root = document) {
    const needle = fn.includes("(") ? fn : fn + "(";
    return $$(`[onclick*="${needle}"]`, root).find(visible);
  }
  function clickFn(fn, root) {
    const el = byFn(fn, root);
    if (el) {
      el.click();
      return true;
    }
    return false;
  }
  const act =
    (...fns) =>
    () =>
      fns.some((f) => clickFn(f));
  // Chiama una funzione globale se esiste (fallback: clic sul pulsante)
  const call =
    (fn, ...args) =>
    () => {
      if (clickFn(fn)) return true;
      if (typeof window[fn] === "function") {
        window[fn](...args);
        return true;
      }
      return false;
    };

  function openModalEl() {
    const open = $$(".modal-overlay.open");
    return open[open.length - 1] || null;
  }
  const isTyping = (t) =>
    !!t &&
    (t.tagName === "INPUT" && !/^(checkbox|radio|button)$/.test(t.type)
      ? true
      : t.tagName === "TEXTAREA" ||
        t.tagName === "SELECT" ||
        t.isContentEditable);
  const isInteractive = (t) =>
    !!t && /^(INPUT|TEXTAREA|SELECT|BUTTON|A|SUMMARY)$/.test(t.tagName);

  // ─── RIGHE / ELENCHI ────────────────────────────────────────
  // selector: righe navigabili · cb: checkbox di selezione · all: "seleziona tutto"
  const LISTE = {
    clienti: {
      righe: "#content tr.clienti-bulk-row",
      cb: ".clienti-bulk-cb",
      all: "#clienti-select-all",
    },
    adempimenti: {
      righe: "#content .adp-bulk-card",
      cb: ".adp-bulk-cb",
      allFn: "toggleSelezionaTuttiAdp",
    },
    appunti: {
      righe: "#content tr.appunti-bulk-row",
      cb: ".appunti-bulk-cb",
      all: "#appunti-select-all",
    },
    pagina_bianca: {
      righe: "#content .pb-bulk-card",
      cb: ".pb-bulk-cb",
      all: "#pb-select-all",
    },
    cestino: {
      righe: "#content tbody tr:has(.cestino-checkbox)",
      cb: ".cestino-checkbox",
      all: "#cestino-check-all",
    },
    scadenzario: { righe: "#content .adp-card" },
  };

  const righe = () => {
    const l = LISTE[state.page];
    return l ? $$(l.righe).filter(visible) : [];
  };
  function focusRiga(delta, assoluto) {
    const rs = righe();
    if (!rs.length) return false;
    const attuale = rs.findIndex((r) => r.classList.contains("kb-focus"));
    rs.forEach((r) => r.classList.remove("kb-focus"));
    const idx =
      assoluto !== undefined
        ? assoluto < 0
          ? rs.length - 1
          : assoluto
        : Math.min(rs.length - 1, Math.max(0, attuale + delta));
    const r = rs[idx];
    r.classList.add("kb-focus");
    r.scrollIntoView({ block: "nearest", behavior: "smooth" });
    return true;
  }
  function rigaCorrente() {
    const rs = righe();
    return rs.find((r) => r.classList.contains("kb-focus")) || null;
  }
  // Esegue sulla riga a fuoco il pulsante il cui onclick contiene `fn`
  function rigaAzione(fn) {
    return () => {
      const r = rigaCorrente();
      if (!r) return false;
      const b = $$(`[onclick*="${fn}"]`, r)[0];
      if (b) {
        b.click();
        return true;
      }
      return false;
    };
  }
  const rigaApri = () => {
    const r = rigaCorrente();
    if (!r) return false;
    if (r.getAttribute("onclick")) {
      r.click();
      return true;
    }
    const b = $$("button, [onclick]", r).find((x) =>
      /(open|show|edit|ripristina)/i.test(x.getAttribute("onclick") || ""),
    );
    if (b) {
      b.click();
      return true;
    }
    return false;
  };
  const rigaSeleziona = () => {
    const r = rigaCorrente();
    const l = LISTE[state.page];
    const cb = r && l?.cb ? $(l.cb, r) : null;
    if (!cb) return false;
    cb.checked = !cb.checked;
    cb.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  };
  const selezionati = () => {
    const l = LISTE[state.page];
    return l?.cb ? $$(l.cb).filter((c) => c.checked) : [];
  };
  const selezionaTutti = () => {
    const l = LISTE[state.page];
    if (!l) return false;
    if (l.all && $(l.all)) {
      const a = $(l.all);
      a.checked = true;
      a.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
    if (l.allFn) return clickFn(l.allFn);
    return false;
  };

  // ─── REGISTRO TASTI ─────────────────────────────────────────
  // key: tasto · label: descrizione · run: azione (ritorna false se non applicabile)
  // `shift: true` richiede Maiusc. I tasti comuni a tutte le pagine sono in GLOBALI.
  const NAV = [
    ["d", "dashboard", "Dashboard"],
    ["c", "clienti", "Clienti"],
    ["s", "scadenzario", "Scadenzario cliente"],
    ["v", "scadenzario_globale", "Vista Globale"],
    ["y", "sintesi", "Sintesi Adempimenti"],
    ["a", "adempimenti", "Adempimenti"],
    ["t", "tipologie", "Tipologie Clienti"],
    ["p", "appunti", "Scadenze Studio"],
    ["n", "pagina_bianca", "Note"],
    ["x", "cestino", "Cestino"],
    ["k", "scorciatoie", "Scorciatoie"],
  ];

  const cercaCampo = () =>
    $$(
      "#topbar-actions input.input, #content input[type=search], #content input.input[placeholder*='erca'], #adp-filter-search",
    ).find(visible);

  const GLOBALI = [
    {
      key: "?",
      label: "Apri / chiudi questa guida (anche F1)",
      run: () => toggleGuida(),
    },
    {
      key: `${MOD} K`,
      label: "Cerca una pagina e salta (palette)",
      info: true,
    },
    {
      key: "g poi lettera",
      label: "Vai a una pagina (vedi elenco sotto)",
      info: true,
    },
    {
      key: "/",
      label: "Vai al campo di ricerca della pagina",
      run: () => {
        const c = cercaCampo();
        if (!c) return false;
        c.focus();
        c.select?.();
        return true;
      },
    },
    { key: "t", label: "Tema chiaro / scuro", run: call("toggleTheme") },
    {
      key: "b",
      label: "Scarica il database (backup)",
      run: () => $("#btn-scarica-db")?.click() ?? false,
    },
    { key: "Esc", label: "Chiude finestra, pannello o selezione", info: true },
    {
      key: "Alt ↑ / ↓",
      label: "Nei campi di testo: scorre la cronologia dei valori",
      info: true,
    },
  ];

  const MODAL = [
    {
      key: `${MOD} Invio`,
      label: "Conferma / Salva nella finestra aperta",
      info: true,
    },
    { key: `${MOD} S`, label: "Come sopra: salva", info: true },
    { key: "Esc", label: "Chiude la finestra senza salvare", info: true },
    {
      key: "Alt 1 / Alt 2",
      label: "Cambia scheda (Aggiungi/Elimina, Inserisci/Elimina…)",
      info: true,
    },
  ];

  const LISTA_COMUNE = [
    {
      key: "j / ↓",
      label: "Riga successiva (le frecce dopo il primo j)",
      run: (e) =>
        e?.key.startsWith("Arrow") && !rigaCorrente() ? false : focusRiga(+1),
    },
    {
      key: "k / ↑",
      label: "Riga precedente",
      run: (e) =>
        e?.key.startsWith("Arrow") && !rigaCorrente() ? false : focusRiga(-1),
    },
    { key: "Home / End", label: "Prima / ultima riga", info: true },
    { key: "Invio", label: "Apri la riga evidenziata", run: rigaApri },
    {
      key: "Spazio / x",
      label: "Seleziona / deseleziona la riga",
      run: rigaSeleziona,
    },
    {
      key: "Shift A",
      label: "Seleziona tutte le righe",
      run: selezionaTutti,
      shift: true,
    },
  ];

  // Apre un filtro (menu a tendina ricercabile o select normale) dato l'id
  const apriSel =
    (...ids) =>
    () => {
      for (const id of ids) {
        const sel = document.getElementById(id);
        if (!sel) continue;
        const t = sel.parentElement?.querySelector(".ss-trigger");
        if (t && visible(t)) {
          t.click();
          t.focus?.();
          return true;
        }
        if (visible(sel)) {
          sel.focus();
          try {
            sel.showPicker?.();
          } catch (_) {}
          return true;
        }
      }
      return false;
    };
  const apriFn = (fn) => () =>
    typeof window[fn] === "function" ? (window[fn](), true) : false;

  const anno = (fn) => [
    { key: "[", label: "Anno precedente", run: act(`${fn}(-1)`) },
    { key: "]", label: "Anno successivo", run: act(`${fn}(1)`) },
  ];

  const PAGINE = {
    dashboard: {
      titolo: "Dashboard",
      tasti: [
        ...anno("changeAnno"),
        {
          key: "u",
          label: "Mostra tutti gli adempimenti",
          run: act("setDashCat('tutti')"),
        },
        {
          key: "a",
          label: "Applica adempimenti ai clienti",
          run: act("openApplicaAdempimenti"),
        },
        {
          key: "v",
          label: "Applica ai clienti senza adempimenti",
          run: act("apriApplicaAdempimentiPerVuoti"),
        },
        {
          key: "c",
          label: "Copia configurazione da un anno all'altro",
          run: act("openCopiaTutti"),
        },
        {
          key: "f",
          label: "Filtro tipologie clienti",
          run: act("toggleDashTipFiltroPanel"),
        },
        { key: "r", label: "Ripristina i filtri", run: act("resetDashFiltri") },
        {
          key: "p",
          label: "Nuovo adempimento personalizzato",
          run: apriFn("openAdempimentoPersonalizzatoFromDashboard"),
        },
        {
          key: "o",
          label: "Apri la selezione in Vista Globale",
          run: act("apriVistaGlobaleDaSelezione"),
        },
        {
          key: "Shift A",
          label: "Seleziona tutti gli adempimenti visibili",
          run: act("selezionaTuttiDashAdpVisibili"),
          shift: true,
        },
        {
          key: "Shift D",
          label: "Deseleziona gli adempimenti",
          run: act("clearDashAdpSelezione"),
          shift: true,
        },
        {
          key: "Shift P",
          label: "Stampa",
          run: () => window.print(),
          shift: true,
        },
      ],
    },
    clienti: {
      titolo: "Clienti",
      lista: true,
      tasti: [
        { key: "n", label: "Nuovo cliente", run: act("openNuovoCliente") },
        {
          key: "r",
          label: "Ripristina i filtri",
          run: act("resetClientiFiltri"),
        },
        {
          key: "f",
          label: "Filtro tipologie",
          run: act("toggleTipFiltroPanel"),
        },
        {
          key: "e",
          label: "Modifica il cliente evidenziato",
          run: rigaAzione("editCliente"),
        },
        {
          key: "s",
          label: "Scadenzario del cliente evidenziato",
          run: rigaAzione("goScadenzario"),
        },
        {
          key: "m",
          label: "Note del cliente evidenziato",
          run: rigaAzione("openPaginaBiancaPerCliente"),
        },
        {
          key: "i",
          label: "Scheda di dettaglio del cliente evidenziato",
          run: rigaAzione("showClienteDettaglio"),
        },
        {
          key: "Shift C",
          label: "Copia la configurazione dei clienti da un anno all'altro",
          run: call("openCopiaConfigTutti"),
          shift: true,
        },
        {
          key: "Canc",
          label: "Elimina il cliente evidenziato (o i selezionati)",
          run: () =>
            eliminaCorrenteOSelezione(
              "deleteCliente",
              "eliminaClientiSelezionati",
            ),
        },
        {
          key: "Shift D",
          label: "Deseleziona tutti",
          run: act("deselezionaTuttiClienti"),
          shift: true,
        },
        {
          key: "Shift P",
          label: "Stampa",
          run: () => window.print(),
          shift: true,
        },
      ],
    },
    scadenzario: {
      titolo: "Scadenzario cliente",
      lista: true,
      tasti: [
        ...anno("changeAnnoScad"),
        { key: ", / .", label: "Cliente precedente / successivo", info: true },
        {
          key: "l",
          label: "Scegli il cliente (apre l'elenco)",
          run: () => {
            const s = $("#sel-cliente");
            if (!s) return false;
            s.focus();
            return true;
          },
        },
        {
          key: "n",
          label: "Aggiungi / elimina adempimento del cliente",
          run: act("openAddAdp"),
        },
        {
          key: "c",
          label: "Copia le scadenze da un anno all'altro",
          run: act("openCopia"),
        },
        { key: "e", label: "Modifica il cliente", run: act("editCliente") },
        {
          key: "w",
          label: "Genera gli adempimenti mancanti del cliente",
          run: call("generaScadenzario"),
        },
        {
          key: "Shift G",
          label: "Genera lo scadenzario per tutti i clienti",
          run: call("openGeneraTutti"),
          shift: true,
        },
        {
          key: "p",
          label: "Crea un adempimento personalizzato",
          run: call("openAdempimentoPersonalizzato"),
        },
        {
          key: "i",
          label: "Applica adempimenti esistenti a più clienti",
          run: call("openApplicaAdempimenti"),
        },
        {
          key: "Shift C",
          label: "Copia la configurazione del cliente da un anno all'altro",
          run: call("openCopiaConfig"),
          shift: true,
        },
        {
          key: "m",
          label: "Note del cliente",
          run: act("openPaginaBiancaPerCliente"),
        },
        {
          key: "s",
          label: "Selezione multipla di scadenze (attiva/disattiva)",
          run: act("toggleScadBulkMode", "attivaModalitaSelezione"),
        },
        {
          key: "Canc",
          label: "Elimina le scadenze selezionate",
          run: act("eliminaBulkScadenzario"),
        },
        {
          key: "Shift A",
          label: "Seleziona tutte le scadenze",
          run: act("toggleSelezionaTuttiBulk"),
          shift: true,
        },
        { key: "r", label: "Ripristina i filtri", run: act("resetScadFiltri") },
        {
          key: "Shift P",
          label: "Stampa",
          run: () => window.print(),
          shift: true,
        },
      ],
    },
    scadenzario_globale: {
      titolo: "Vista Globale",
      tasti: [
        ...anno("changeAnnoGlobale"),
        {
          key: "f",
          label: "Filtro tipologie",
          run: act("toggleGlobTipFiltroPanel"),
        },
        {
          key: "l",
          label: "Scegli i clienti",
          run: apriSel("glob-sel-cliente"),
        },
        {
          key: "a",
          label: "Scegli gli adempimenti",
          run: apriSel("glob-filtro-adp"),
        },
        {
          key: "u",
          label: "Filtra per stato",
          run: apriSel("glob-filtro-stato"),
        },
        {
          key: "r",
          label: "Ripristina i filtri",
          run: act("resetGlobaleFiltri"),
        },
        {
          key: "s",
          label: "Selezione multipla di scadenze",
          run: act("attivaModalitaSelezione", "toggleScadBulkMode"),
        },
        {
          key: "Canc",
          label: "Elimina le scadenze selezionate",
          run: act("eliminaBulkScadenzario"),
        },
        {
          key: "Shift P",
          label: "Stampa",
          run: () => window.print(),
          shift: true,
        },
      ],
    },
    sintesi: {
      titolo: "Sintesi Adempimenti",
      tasti: [
        ...anno("changeAnnoSintesi"),
        {
          key: "r",
          label: "Ripristina i filtri",
          run: act("resetSintesiFiltri"),
        },
        {
          key: "l",
          label: "Scegli i clienti",
          run: apriSel("sint-filtro-cliente"),
        },
        {
          key: "a",
          label: "Scegli gli adempimenti",
          run: apriSel("sint-filtro-adp"),
        },
        {
          key: "u",
          label: "Scegli le tipologie di cliente",
          run: apriSel("sint-filtro-tipo-utente"),
        },
        {
          key: "Shift P",
          label: "Stampa la sintesi completa",
          run: act("stampaSintesiCompleta"),
          shift: true,
        },
        {
          key: "Esc",
          label: "Chiude il dettaglio",
          run: act("sintesiCloseDettaglio"),
        },
      ],
    },
    adempimenti: {
      titolo: "Adempimenti",
      lista: true,
      tasti: [
        { key: "n", label: "Nuovo adempimento", run: act("openNuovoAdpDef") },
        {
          key: "r",
          label: "Ripristina i filtri",
          run: act("resetAdempimentiFiltri"),
        },
        {
          key: "e",
          label: "Modifica l'adempimento evidenziato",
          run: rigaAzione("editAdpDef"),
        },
        {
          key: "Canc",
          label: "Elimina l'adempimento evidenziato (o i selezionati)",
          run: () =>
            eliminaCorrenteOSelezione("deleteAdpDef", "eliminaAdpSelezionati"),
        },
        {
          key: "Shift D",
          label: "Deseleziona tutti",
          run: act("deselezionaTuttiAdp"),
          shift: true,
        },
        {
          key: "Shift P",
          label: "Stampa",
          run: () => window.print(),
          shift: true,
        },
      ],
    },
    tipologie: {
      titolo: "Tipologie Clienti",
      tasti: [
        {
          key: "Shift P",
          label: "Stampa",
          run: () => window.print(),
          shift: true,
        },
      ],
    },
    appunti: {
      titolo: "Scadenze Studio",
      lista: true,
      tasti: [
        {
          key: "n",
          label: "Nuova scadenza studio",
          run: act("openNuovoAppunto"),
        },
        {
          key: "c",
          label: "Segna fatta / da fare la scadenza evidenziata",
          run: rigaAzione("toggleAppuntoCompletato"),
        },
        {
          key: "e",
          label: "Apri / modifica la scadenza evidenziata",
          run: rigaApri,
        },
        {
          key: "s",
          label: "Filtra per stato (da fare / completate)",
          run: apriSel("appunti-filtro-completato"),
        },
        {
          key: "p",
          label: "Filtra per priorità",
          run: apriSel("appunti-filtro-priorita"),
        },
        {
          key: "l",
          label: "Filtra per cliente",
          run: apriSel("appunti-filtro-cliente"),
        },
        {
          key: "Canc",
          label: "Elimina la scadenza evidenziata (o le selezionate)",
          run: () =>
            eliminaCorrenteOSelezione(
              "deleteAppunto",
              "eliminaAppuntiSelezionati",
            ),
        },
        {
          key: "Shift D",
          label: "Deseleziona tutte",
          run: act("deselezionaTuttiAppunti"),
          shift: true,
        },
        {
          key: "Shift C",
          label: "Copia le scadenze (da un anno all'altro)",
          run: () =>
            typeof window.openCopiaAppunti === "function"
              ? (window.openCopiaAppunti(), true)
              : false,
          shift: true,
        },
        {
          key: "Shift P",
          label: "Stampa",
          run: () => window.print(),
          shift: true,
        },
      ],
    },
    pagina_bianca: {
      titolo: "Note",
      lista: true,
      tasti: [
        { key: "n", label: "Nuova nota", run: act("openPaginaBiancaEditor") },
        // ✅ FIX: chiamata diretta a setPaginaBiancaTipo per evitare che
        // `call()` clicchi sempre il primo pulsante "Studio" trovato nel DOM
        // (bug: il tasto 2 non riusciva mai a passare a "cliente").
        {
          key: "1",
          label: "Note dello studio",
          run: () => {
            if (typeof window.setPaginaBiancaTipo === "function") {
              window.setPaginaBiancaTipo("studio");
              return true;
            }
            return false;
          },
        },
        {
          key: "2",
          label: "Note dei clienti",
          run: () => {
            if (typeof window.setPaginaBiancaTipo === "function") {
              window.setPaginaBiancaTipo("cliente");
              return true;
            }
            return false;
          },
        },
        {
          key: "l",
          label: "Filtra per cliente",
          run: apriSel("pb-filtro-cliente-select", "pb-filtro-cliente"),
        },
        {
          key: "e",
          label: "Modifica la nota evidenziata",
          run: rigaAzione("openPaginaBiancaEditor"),
        },
        {
          key: "Canc",
          label: "Elimina la nota evidenziata (o le selezionate)",
          run: () =>
            eliminaCorrenteOSelezione(
              "deletePaginaBiancaAppunto",
              "eliminaNoteSelezionate",
            ),
        },
        {
          key: "Shift D",
          label: "Deseleziona tutte",
          run: act("deselezionaTutteNote"),
          shift: true,
        },
        {
          key: "r",
          label: "Ripristina i filtri",
          run: act("resetPaginaBiancaFiltri"),
        },
        {
          key: "Shift P",
          label: "Stampa le note",
          run: act("stampaPaginaBianca"),
          shift: true,
        },
      ],
    },
    scorciatoie: {
      titolo: "Scorciatoie",
      tasti: [
        {
          key: "Shift P",
          label: "Stampa l'elenco delle scorciatoie",
          run: () => window.print(),
          shift: true,
        },
      ],
    },
    cestino: {
      titolo: "Cestino",
      lista: true,
      tasti: [
        {
          key: "Invio",
          label: "Ripristina l'elemento evidenziato (o i selezionati)",
          run: () =>
            selezionati().length
              ? clickFn("ripristinaBulk")
              : rigaAzione("ripristinaDaCestino")(),
        },
        {
          key: "Canc",
          label: "Elimina definitivamente evidenziato (o selezionati)",
          run: () =>
            eliminaCorrenteOSelezione(
              "eliminaDefinitivoCestino",
              "eliminaBulk",
            ),
        },
        {
          key: "Shift R",
          label: "Ripristina tutto",
          run: act("ripristinaTutto"),
          shift: true,
        },
        {
          key: "Shift X",
          label: "Svuota il cestino",
          run: act("svuotaCestino"),
          shift: true,
        },
        {
          key: "Shift D",
          label: "Deseleziona tutti",
          run: act("deselezionaTutti"),
          shift: true,
        },
        {
          key: "r",
          label: "Azzera il filtro per tipo",
          run: act("resetFiltroTipi"),
        },
      ],
    },
  };

  function eliminaCorrenteOSelezione(fnSingolo, fnBulk) {
    if (selezionati().length && clickFn(fnBulk)) return true;
    return rigaAzione(fnSingolo)();
  }

  // ─── GESTORE TASTI ──────────────────────────────────────────
  let attesaG = null;
  const hint = document.createElement("div");
  hint.className = "kb-hint";
  hint.hidden = true;
  document.body.appendChild(hint);
  function mostraHint(html) {
    hint.innerHTML = html;
    hint.hidden = !html;
  }
  function finisciG() {
    clearTimeout(attesaG);
    attesaG = null;
    mostraHint("");
  }

  const NOMI = {
    Canc: ["Delete", "Backspace"],
    Invio: ["Enter"],
    Esc: ["Escape"],
    Spazio: [" "],
    "↓": ["ArrowDown"],
    "↑": ["ArrowUp"],
    Home: ["Home"],
    End: ["End"],
  };
  // spec: "n", "Shift A", "Canc", "[" …
  function combacia(spec, e) {
    const m = spec.match(/^Shift (.)$/);
    if (m) return e.shiftKey && e.key.toLowerCase() === m[1].toLowerCase();
    if (NOMI[spec]) return NOMI[spec].includes(e.key);
    if (spec.length === 1) {
      if (/[a-z]/i.test(spec)) return !e.shiftKey && e.key === spec;
      return e.key === spec;
    }
    return false;
  }

  function tastoPagina(e) {
    const cfg = PAGINE[state.page];
    const tasti = [...(cfg?.tasti || [])];
    if (cfg?.lista) tasti.push(...LISTA_COMUNE);
    for (const t of tasti) {
      if (!t.run) continue;
      if (!t.key.split(" / ").some((spec) => combacia(spec, e))) continue;
      // Invio/Spazio su pulsanti, link e campi mantengono il loro uso nativo
      if (isInteractive(e.target) && (e.key === "Enter" || e.key === " "))
        continue;
      if (t.run(e) !== false) {
        e.preventDefault();
        return true;
      }
    }
    return false;
  }

  function tastoLista(e) {
    if (!PAGINE[state.page]?.lista) return false;
    if (e.key === "Home") return focusRiga(0, 0);
    if (e.key === "End") return focusRiga(0, -1);
    return false;
  }

  function nelModal(e) {
    const m = openModalEl();
    if (!m) return false;
    const mod = e.ctrlKey || e.metaKey;
    // Salva / Conferma
    if ((mod && e.key === "Enter") || (mod && e.key.toLowerCase() === "s")) {
      e.preventDefault();
      const bottoni = $$("button", m).filter(visible);
      const conferma =
        bottoni.find(
          (b) =>
            /(^|[^a-z])(save|esegui|crea|conferma|applica|aggiungi|elimina)[A-Za-z]*\(/i.test(
              b.getAttribute("onclick") || "",
            ) && !/closeModal/.test(b.getAttribute("onclick") || ""),
        ) || bottoni.find((b) => b.classList.contains("btn-primary"));
      conferma?.click();
      return true;
    }
    // Schede: Alt+1 / Alt+2
    if (e.altKey && /^Digit[1-9]$/.test(e.code)) {
      const schede = $$(
        ".modal-tabs button, [onclick*='switchAddAdpTab'], [onclick*='setApplicaModalita']",
        m,
      ).filter(visible);
      const s = schede[Number(e.code.slice(5)) - 1];
      if (s) {
        e.preventDefault();
        s.click();
        return true;
      }
    }
    return false;
  }

  document.addEventListener("keydown", (e) => {
    if (e.defaultPrevented || e.isComposing) return;
    const guida = $("#kb-guida-overlay:not([hidden])");
    const paletteAperta = $(".cmdk-overlay:not([hidden])");
    if (paletteAperta) return;

    // Guida aperta: Esc / ? la chiudono
    if (guida) {
      if (e.key === "Escape" || e.key === "?" || e.key === "F1") {
        e.preventDefault();
        chiudiGuida();
      }
      return;
    }

    if (e.key === "F1") {
      e.preventDefault();
      apriGuida();
      return;
    }

    // Finestre aperte: solo i tasti specifici del modal
    if (openModalEl()) {
      nelModal(e);
      return;
    }

    const mod = e.ctrlKey || e.metaKey || e.altKey;
    if (mod) return; // le combinazioni sono gestite altrove (palette, cronologia, browser)

    // Sequenza "g" + lettera
    if (attesaG) {
      const voce = NAV.find((n) => n[0] === e.key.toLowerCase());
      finisciG();
      if (voce) {
        e.preventDefault();
        $(`.nav-item[data-page="${voce[1]}"]`)?.click();
      }
      return;
    }

    // Esc fuori dai modal: chiude pannelli e selezioni aperte
    if (e.key === "Escape") {
      if (isTyping(e.target)) {
        e.target.blur();
        return;
      }
      document
        .querySelectorAll(".kb-focus")
        .forEach((r) => r.classList.remove("kb-focus"));
      const pannello = $$("[onclick*='close'][onclick*='FiltroPanel']").find(
        visible,
      );
      pannello?.click();
      PAGINE[state.page]?.tasti.find((t) => t.key === "Esc")?.run?.();
      return;
    }

    // Cliente precedente/successivo nello scadenzario
    if (
      !isTyping(e.target) &&
      state.page === "scadenzario" &&
      (e.key === "," || e.key === ".")
    ) {
      const s = $("#sel-cliente");
      if (s) {
        const i = s.selectedIndex + (e.key === "." ? 1 : -1);
        if (i >= 1 && i < s.options.length) {
          s.selectedIndex = i;
          s.dispatchEvent(new Event("change", { bubbles: true }));
          e.preventDefault();
        }
        return;
      }
    }

    if (isTyping(e.target)) return;

    if (e.key === "g" && !e.shiftKey) {
      e.preventDefault();
      mostraHint(
        "<b>g</b> poi: " +
          NAV.map((n) => `<kbd>${n[0]}</kbd> ${n[2]}`).join(" · "),
      );
      attesaG = setTimeout(finisciG, 2500);
      return;
    }
    if (e.key === "?") {
      e.preventDefault();
      apriGuida();
      return;
    }
    if (tastoPagina(e)) return;
    if (tastoLista(e)) {
      e.preventDefault();
      return;
    }
    // Globali semplici
    for (const t of GLOBALI) {
      if (t.run && t.key === e.key) {
        if (t.run() !== false) e.preventDefault();
        return;
      }
    }
  });

  // ─── GUIDA IN-APP ───────────────────────────────────────────
  let overlay;
  const kbd = (s) =>
    s
      .split(" / ")
      .map((p) =>
        p
          .split(" ")
          .map((x) => (/^(poi|lettera)$/.test(x) ? x : `<kbd>${x}</kbd>`))
          .join(" "),
      )
      .join(" <span class='kb-or'>oppure</span> ");
  const righeHtml = (arr) =>
    arr
      .map((t) => `<tr><td>${kbd(t.key)}</td><td>${t.label}</td></tr>`)
      .join("");

  function costruisciGuida() {
    const cfg = PAGINE[state.page];
    const corrente = cfg
      ? `<section class="kb-sec kb-cur"><h3>Questa pagina · ${cfg.titolo}</h3><table>${righeHtml(
          [...cfg.tasti, ...(cfg.lista ? LISTA_COMUNE : [])],
        )}</table></section>`
      : "";
    const nav = `<section class="kb-sec"><h3>Vai a… (premi <kbd>g</kbd> e poi la lettera)</h3><div class="kb-nav">${NAV.map(
      (n) => `<span><kbd>g</kbd> <kbd>${n[0]}</kbd> ${n[2]}</span>`,
    ).join("")}</div></section>`;
    const altre = Object.entries(PAGINE)
      .filter(([k]) => k !== state.page)
      .map(
        ([, p]) =>
          `<details><summary>${p.titolo}</summary><table>${righeHtml([
            ...p.tasti,
            ...(p.lista ? LISTA_COMUNE : []),
          ])}</table></details>`,
      )
      .join("");
    return `<div class="kb-guida" role="dialog" aria-label="Guida tasti da tastiera">
      <div class="kb-head"><h2>⌨️ Tasti da tastiera</h2><button type="button" class="kb-x" aria-label="Chiudi">Esc</button></div>
      <div class="kb-body">
        ${corrente}
        <section class="kb-sec"><h3>Ovunque</h3><table>${righeHtml(GLOBALI)}</table></section>
        ${nav}
        <section class="kb-sec"><h3>Nelle finestre (modal)</h3><table>${righeHtml(MODAL)}</table></section>
        <section class="kb-sec"><h3>Tutte le altre pagine</h3>${altre}</section>
        <p class="kb-note">I tasti con lettera funzionano solo quando non stai scrivendo in un campo.
        Le eliminazioni chiedono sempre conferma.</p>
      </div></div>`;
  }
  function apriGuida() {
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "kb-guida-overlay";
      overlay.className = "kb-overlay";
      overlay.addEventListener(
        "mousedown",
        (e) => e.target === overlay && chiudiGuida(),
      );
      document.body.appendChild(overlay);
    }
    overlay.innerHTML = costruisciGuida();
    overlay.querySelector(".kb-x").onclick = chiudiGuida;
    overlay.hidden = false;
    overlay.querySelector(".kb-body").focus?.();
  }
  function chiudiGuida() {
    if (overlay) overlay.hidden = true;
  }
  function toggleGuida() {
    overlay && !overlay.hidden ? chiudiGuida() : apriGuida();
  }
  window.apriGuidaTastiera = apriGuida;

  // Pulsante "⌨" nella barra superiore (accanto a "Vai a…")
  const barra = $(".topbar");
  if (barra) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "kb-trigger no-print";
    b.title = "Guida tasti da tastiera (?)";
    b.setAttribute("aria-label", "Guida tasti da tastiera");
    b.innerHTML = "⌨️ <kbd>?</kbd>";
    b.onclick = apriGuida;
    barra.appendChild(b);
  }

  // Pulsante tema chiaro/scuro nella barra superiore (dopo ⌨)
  if (barra) {
    const t = document.createElement("button");
    t.type = "button";
    t.className = "kb-trigger theme-top no-print";
    t.setAttribute("aria-label", "Tema chiaro / scuro");
    const aggiorna = () => {
      const scuro =
        document.documentElement.getAttribute("data-theme") === "dark";
      t.innerHTML = scuro ? "☀️ <span>Chiaro</span>" : "🌙 <span>Scuro</span>";
      t.title = scuro ? "Passa al tema chiaro (t)" : "Passa al tema scuro (t)";
    };
    t.onclick = () => window.toggleTheme?.();
    new MutationObserver(aggiorna).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    aggiorna();
    barra.appendChild(t);
  }

  window.GF_SHORTCUTS = { PAGINE, GLOBALI, MODAL, NAV, LISTA_COMUNE };
})();
