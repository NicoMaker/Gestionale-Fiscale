// ═══════════════════════════════════════════════════════════════
// DASHBOARD-RENDER.JS — Filtri stato/search, pannello tipologie,
//                        aggiornamento contenuto, render principale
// Dipende da: dashboard-applica.js
// ═══════════════════════════════════════════════════════════════
// ─── VISTA GLOBALE ────────────────────────────────────────────

function goVistaGlobaleAdp(nome) {
  state.globalePreFiltroAdp = nome;
  document.querySelectorAll(".nav-item").forEach(function (x) {
    x.classList.remove("active");
  });
  var nav = document.querySelector('[data-page="scadenzario_globale"]');
  if (nav) nav.classList.add("active");
  state.dashSearch = "";
  state.dashFiltroStatoAdp = "";
  renderPage("scadenzario_globale");
}

// ─── FILTRI STATO / SEARCH ────────────────────────────────────

function onDashFiltroStatoAdp() {
  var el = document.getElementById("dash-filtro-stato-adp");
  state.dashFiltroStatoAdp = el ? el.value : "";
  if (state.dashStats) updateDashboardContent(state.dashStats);
}

function onDashAdpSearch(val) {
  state.dashSearch = val;
  if (state.dashStats) updateDashboardContent(state.dashStats);
}

function resetDashFiltri() {
  state.dashSearch = "";
  state.dashFiltroStatoAdp = "";
  var searchEl = document.getElementById("dash-adp-search");
  if (searchEl) searchEl.value = "";
  var statoEl = document.getElementById("dash-filtro-stato-adp");
  if (statoEl) statoEl.value = "";
  if (typeof initializeTipologieFilter === "function")
    initializeTipologieFilter();
  _refreshDashTipFiltroPanel();
  _aggiornaDashTipFiltroCounter();
  if (state.dashStats) updateDashboardContent(state.dashStats);
}

// ─── PANNELLO TIPOLOGIE DASHBOARD ─────────────────────────────
// Riusa renderTipologieFiltroPanel() da clienti.js (zero duplicazione).
// Un MutationObserver intercetta ogni re-render del pannello (causato dai
// toggle di clienti.js) e aggiorna i contatori + le card della dashboard.

var _dashTipFiltroPanelOpen = false;
var _dashFiltroObserver = null; // MutationObserver attivo

// ─── CONDIVISIONE STORAGE CON CLIENTI.JS ─────────────────────
// Usa le stesse funzioni di storage definite in clienti.js
function _getStorageKeys() {
  return {
    FILTRI: "gestionale_filtri_tipologie",
    NESSUNO: "gestionale_filtri_nessuno",
    PANNELLO_APERTO: "gestionale_filtri_pannello_aperto",
  };
}

function _salvaFiltriDashboardSuStorage() {
  try {
    const keys =
      typeof window._activeFiltroKeys !== "undefined"
        ? window._activeFiltroKeys
        : new Set();
    const nessuno =
      typeof window._filtroManualeNessuno !== "undefined"
        ? window._filtroManualeNessuno
        : false;

    const filtriData = {
      keys: Array.from(keys),
      nessuno: nessuno,
      pannelloAperto: _dashTipFiltroPanelOpen,
    };
    localStorage.setItem(_getStorageKeys().FILTRI, JSON.stringify(filtriData));
  } catch (e) {
    console.warn("[dashboard.js] Errore salvataggio filtri:", e);
  }
}

function toggleDashTipFiltroPanel(event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  _dashTipFiltroPanelOpen = !_dashTipFiltroPanelOpen;
  _salvaFiltriDashboardSuStorage(); // Salva stato pannello
  _aggiornaDashPanelVisibility();
  if (_dashTipFiltroPanelOpen) _refreshDashTipFiltroPanel();
}

function closeDashTipFiltroPanel(event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  _dashTipFiltroPanelOpen = false;
  _salvaFiltriDashboardSuStorage(); // Salva stato pannello
  _aggiornaDashPanelVisibility();
}

function _aggiornaDashPanelVisibility() {
  var container = document.getElementById("dash-tip-filtro-container");
  if (!container) return;
  container.style.display = _dashTipFiltroPanelOpen ? "block" : "none";
  var btn = document.getElementById("dash-tip-filtro-toggle-btn");
  if (btn) {
    btn.innerHTML = _dashTipFiltroPanelOpen
      ? '<button class="btn btn-xs btn-secondary" onclick="closeDashTipFiltroPanel(event)">✕ Chiudi</button>'
      : '<button class="btn btn-xs btn-secondary" onclick="toggleDashTipFiltroPanel(event)">▼ Espandi</button>';
  }
}

function _aggiornaDashTipFiltroCounter() {
  var badge = document.getElementById("dash-tip-filtro-count");
  var warning = document.getElementById("dash-tip-filtro-warning");
  if (!badge) return;

  var keys =
    typeof _getActiveFiltroKeys === "function"
      ? _getActiveFiltroKeys()
      : new Set();
  var allKeys =
    typeof window._getAllKeys === "function" ? window._getAllKeys() : [];
  var isNone = window._filtroManualeNessuno || keys.size === 0;
  var isAll = !isNone && keys.size === allKeys.length;

  if (isNone) {
    badge.textContent = "0";
    badge.style.display = "inline-flex";
    badge.style.background = "var(--red)";
    if (warning) warning.style.display = "inline";
  } else if (isAll) {
    badge.textContent = "";
    badge.style.display = "none";
    if (warning) warning.style.display = "none";
  } else {
    badge.textContent = keys.size;
    badge.style.display = "inline-flex";
    badge.style.background = "var(--accent)";
    if (warning) warning.style.display = "none";
  }
}

function _refreshDashTipFiltroPanel() {
  var container = document.getElementById("dash-tip-filtro-container");
  if (!container) return;
  if (typeof renderTipologieFiltroPanel !== "function") return;

  // Smonta il vecchio observer prima di ricostruire il DOM
  if (_dashFiltroObserver) {
    _dashFiltroObserver.disconnect();
    _dashFiltroObserver = null;
  }

  // Renderizza il pannello identico a clienti.js
  var tmp = document.createElement("div");
  tmp.innerHTML = renderTipologieFiltroPanel();
  container.innerHTML = "";
  container.appendChild(tmp.firstChild);

  // MutationObserver: ogni volta che clienti.js ri-renderizza i chip
  // (cambio classe "tip-active") aggiorna contatori + card dashboard.
  // DISABILITATO TEMPORANEAMENTE PER DEBUG
  /*
  _dashFiltroObserver = new MutationObserver(function () {
    _aggiornaDashTipFiltroCounter();
    if (state.dashStats) updateDashboardContent(state.dashStats);
  });
  _dashFiltroObserver.observe(container, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style"],
  });
  */

  container.style.display = _dashTipFiltroPanelOpen ? "block" : "none";
  _aggiornaDashTipFiltroCounter();
}

// ─── FILTRO TIPOLOGIE SU ADEMPIMENTI ─────────────────────────

function adempimentoPassaFiltroStato(a, ss) {
  if (!ss) return true;
  var inCorso = a.totale - a.completati - a.da_fare - (a.na || 0);
  if (ss === "da_fare") return a.da_fare > 0;
  if (ss === "in_corso") return inCorso > 0;
  if (ss === "completato") return a.completati > 0;
  if (ss === "n_a") return (a.na || 0) > 0;
  return true;
}

function clientePassaFiltroTipologieDashboard(adempimento) {
  var keys =
    typeof _getActiveFiltroKeys === "function"
      ? _getActiveFiltroKeys()
      : new Set();
  var allKeys =
    typeof window._getAllKeys === "function" ? window._getAllKeys() : [];
  var isNone = window._filtroManualeNessuno;
  var isAll = !isNone && keys.size === allKeys.length;

  // Se non ci sono filtri o tutti sono selezionati, mostra tutto
  if (keys.size === 0 || isAll) return true;

  // Se è stato selezionato "Nessuno" manualmente, nascondi tutto
  if (isNone) return false;

  // Se l'adempimento porta il codice tipologia del cliente, filtriamo su quello
  if (adempimento.cliente_tipologia_codice) {
    var tipCod = adempimento.cliente_tipologia_codice;
    return Array.from(keys).some(function (key) {
      return key.split("|")[0] === tipCod;
    });
  }
  return true;
}

// ─── AGGIORNAMENTO CONTENUTO DASHBOARD ───────────────────────

function updateDashboardContent(stats) {
  var allAdp = stats.adempimentiStats || [];
  var sq = (state.dashSearch || "").toLowerCase();
  var ss = state.dashFiltroStatoAdp || "";

  var adpVis = allAdp.filter(function (a) {
    if (
      sq &&
      a.nome.toLowerCase().indexOf(sq) === -1 &&
      a.codice.toLowerCase().indexOf(sq) === -1
    )
      return false;
    if (!adempimentoPassaFiltroStato(a, ss)) return false;
    if (!clientePassaFiltroTipologieDashboard(a)) return false;
    return true;
  });

  var fT = 0,
    fC = 0,
    fD = 0,
    fI = 0;
  adpVis.forEach(function (aa) {
    fT += aa.totale;
    fC += aa.completati;
    fD += aa.da_fare;
    fI += Math.max(0, aa.totale - aa.completati - aa.da_fare - (aa.na || 0));
  });
  var fP = fT > 0 ? Math.round((fC / fT) * 100) : 0;
  var isF = sq !== "" || ss !== "";

  var lblTot = document.getElementById("ds-lbl-tot");
  if (lblTot)
    lblTot.innerHTML =
      "Adempimenti " +
      stats.anno +
      (isF
        ? ' <span style="font-size:10px;color:var(--yellow)">(filtro)</span>'
        : "");
  var totEl = document.getElementById("ds-tot");
  if (totEl) totEl.textContent = fT;
  var compEl = document.getElementById("ds-comp");
  if (compEl) compEl.textContent = fC;
  var dafareEl = document.getElementById("ds-dafare");
  if (dafareEl) dafareEl.textContent = fD;
  var incorsoEl = document.getElementById("ds-incorso");
  if (incorsoEl) incorsoEl.textContent = fI;
  var percEl = document.getElementById("ds-perc");
  if (percEl) percEl.textContent = fP + "%";
  var progEl = document.getElementById("ds-prog");
  if (progEl) progEl.style.width = fP + "%";

  var titleEl = document.getElementById("dash-adp-count-title");
  if (titleEl)
    titleEl.innerHTML =
      "Adempimenti " +
      stats.anno +
      ' <span style="font-size:12px;font-weight:400;color:var(--text3);margin-left:6px">' +
      adpVis.length +
      "/" +
      allAdp.length +
      "</span>";

  var grid = document.getElementById("dash-adp-grid");
  if (!grid) return;

  if (adpVis.length === 0) {
    grid.innerHTML =
      '<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--text3)">' +
      '<div style="font-size:40px;margin-bottom:16px">📋</div><div>Nessun adempimento</div></div>';
    return;
  }

  var html = "";
  adpVis.forEach(function (adpItem) {
    var p =
      adpItem.totale > 0
        ? Math.round((adpItem.completati / adpItem.totale) * 100)
        : 0;
    var iC = Math.max(
      0,
      adpItem.totale - adpItem.completati - adpItem.da_fare - (adpItem.na || 0),
    );
    var pgColor =
      p === 100 ? "var(--green)" : p > 50 ? "var(--yellow)" : "var(--red)";
    html +=
      '<div class="dash-adp-card" onclick="goVistaGlobaleAdp(\'' +
      adpItem.nome.replace(/'/g, "\\'") +
      "')\">" +
      '<div class="dash-adp-card-top">' +
      '<span class="adp-def-codice">' +
      adpItem.codice +
      "</span>" +
      '<div class="mini-bar" style="width:60px"><div class="mini-fill" style="width:' +
      p +
      "%;background:" +
      pgColor +
      '"></div></div>' +
      '<span style="font-size:11px;font-family:var(--mono);color:' +
      pgColor +
      '">' +
      p +
      "%</span>" +
      "</div>" +
      '<div class="dash-adp-nome">' +
      adpItem.nome +
      "</div>" +
      '<div class="dash-adp-stats">' +
      '<div class="dash-stat-chip"><span class="ds-num">' +
      adpItem.totale +
      '</span><span class="ds-lbl">Tot.</span></div>' +
      '<div class="dash-stat-chip" style="color:var(--green)"><span class="ds-num">' +
      adpItem.completati +
      '</span><span class="ds-lbl">✓</span></div>' +
      '<div class="dash-stat-chip" style="color:var(--red)"><span class="ds-num">' +
      adpItem.da_fare +
      '</span><span class="ds-lbl">⭕</span></div>' +
      (iC > 0
        ? '<div class="dash-stat-chip" style="color:var(--yellow)"><span class="ds-num">' +
          iC +
          '</span><span class="ds-lbl">🔄</span></div>'
        : "") +
      "</div></div>";
  });
  grid.innerHTML = html;
}

// ─── RENDER PRINCIPALE ────────────────────────────────────────

function renderDashboard(stats) {
  if (!state._dashRendered) buildDashboardShell(stats);
  state.dashStats = stats;
  updateDashboardContent(stats);
  if (typeof initializeTipologieFilter === "function")
    initializeTipologieFilter();
  _refreshDashTipFiltroPanel();
  _aggiornaDashTipFiltroCounter();
}

// ─── SOCKET LISTENERS ─────────────────────────────────────────

if (typeof socket !== "undefined") {
  socket.on("res:clienti_senza_adempimenti", function (data) {
    if (data.success) renderClientiSenzaAdempimenti(data.data);
  });
  socket.on("res:applica:adempimenti_a_clienti", function (data) {
    if (data.success) {
      var msg =
        "✅ Applicati " +
        data.inseriti +
        " adempimenti a " +
        data.clienti +
        " clienti";
      if (data.dettagli && data.dettagli.skipped > 0)
        msg += " — " + data.dettagli.skipped + " già esistenti";
      showNotif(msg, "success");
      socket.emit("get:stats", { anno: state.anno });
      caricaClientiSenzaAdempimenti();
    } else {
      showNotif("❌ Errore: " + (data.error || "Operazione fallita"), "error");
    }
  });

  socket.on("res:elimina:adempimenti_a_clienti", function (data) {
    if (data.success) {
      var msg =
        "🗑️ Eliminati " +
        data.eliminati +
        " record da " +
        data.clienti +
        " clienti";
      if (data.nonTrovati > 0)
        msg += " (" + data.nonTrovati + " già assenti, ignorati)";
      showNotif(msg, "success");
      socket.emit("get:stats", { anno: state.anno });
      caricaClientiSenzaAdempimenti();
    } else {
      showNotif(
        "❌ Errore eliminazione: " + (data.error || "Operazione fallita"),
        "error",
      );
    }
  });
}

// ─── ESPOSIZIONE GLOBALE ──────────────────────────────────────

window.openApplicaAdempimenti = openApplicaAdempimenti;
window._applicaSetTipFiltro = _applicaSetTipFiltro;
window._applicaToggleTipFiltro = _applicaToggleTipFiltro;
window._applicaSelezionaTipologia = _applicaSelezionaTipologia;
window._aggiornaApplicaSelezionaTuttiCounter =
  _aggiornaApplicaSelezionaTuttiCounter;
window.filtraClientiApplica = filtraClientiApplica;
window.toggleSelezionaTuttiAdpApplica = toggleSelezionaTuttiAdpApplica;
window.toggleSelezionaTuttiClientiApplica = toggleSelezionaTuttiClientiApplica;
window.resetSelezioneAdpApplica = resetSelezioneAdpApplica;
window.eseguiApplicaAdempimenti = eseguiApplicaAdempimenti;
window.apriApplicaAdempimentiPerVuoti = apriApplicaAdempimentiPerVuoti;
window.goToClienteScadenzarioDiretto = goToClienteScadenzarioDiretto;
window.caricaClientiSenzaAdempimenti = caricaClientiSenzaAdempimenti;
window.goVistaGlobaleAdp = goVistaGlobaleAdp;
window.onDashFiltroStatoAdp = onDashFiltroStatoAdp;
window.resetDashFiltri = resetDashFiltri;
window.onDashAdpSearch = onDashAdpSearch;
window.toggleDashTipFiltroPanel = toggleDashTipFiltroPanel;
window.closeDashTipFiltroPanel = closeDashTipFiltroPanel;
window._aggiornaDashPanelVisibility = _aggiornaDashPanelVisibility;
window._aggiornaDashTipFiltroCounter = _aggiornaDashTipFiltroCounter;
window._refreshDashTipFiltroPanel = _refreshDashTipFiltroPanel;
window.setApplicaModalita = setApplicaModalita;
