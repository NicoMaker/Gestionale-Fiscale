// ═══════════════════════════════════════════════════════════════
// STATE.JS — Stato globale dell'applicazione
// ═══════════════════════════════════════════════════════════════

const state = {
  page: "appunti",
  tipologie: [],
  clienti: [],
  adempimenti: [],
  selectedCliente: null,
  anno: new Date().getFullYear(),
  filtri: { stato: "tutti", categoria: "tutti" },
  scadenzario: [],
  scadGlobale: [],
  dashStats: null,
  dashSearch: "",
  dashFiltroCategoria: "tutti",
  dashFiltroClienteStato: "",
  dashFiltroStatoAdp: "",
  globalePreFiltroAdp: "",
  globaleStats: null,
  _dashRendered: false,
  adpInseriti: [],
  _currentClienteDettaglio: null,
  _pending: null,
  _gotoClienteId: null,
  // ── Sintesi Adempimenti (matrice clienti × adempimenti, sola lettura) ──
  sintesiData: [],
  sintesiAnno: null,
  sintesiActiveCellKey: null,
  // Filtro per stato cella (done/partial/todo/na) — pannello legenda cliccabile
  sintesiStatoFiltro: { done: false, partial: false, todo: false, na: false },
};
