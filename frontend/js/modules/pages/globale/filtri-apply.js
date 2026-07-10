function applyGlobaleFiltri() {
  state.globalePreFiltroAdp = "";
  loadGlobale();
}

function applyGlobaleFiltriLocali() {
  if (state.scadGlobale) renderGlobaleTabella(state.scadGlobale);
}

function resetGlobaleFiltri() {
  state.globalePreFiltroAdp = "";
  state.globalePreFiltroAdpMulti = null;
  state.globaleSelectedCliente = "";
  setSharedClienteSearch("");
  var adpSel = document.getElementById("glob-filtro-adp");
  if (adpSel) {
    Array.from(adpSel.options).forEach(function (o) {
      o.selected = false;
    });
    if (adpSel._ssRefresh) adpSel._ssRefresh();
  }
  var ids = ["glob-filtro-stato", "glob-search-cliente", "glob-sel-cliente"];
  for (var i = 0; i < ids.length; i++) {
    var el = document.getElementById(ids[i]);
    if (el) {
      el.value = "";
      if (el._ssRefresh) el._ssRefresh();
    }
  }
  if (typeof initializeTipologieFilter === "function")
    initializeTipologieFilter();
  _refreshGlobTipFiltroPanel();
  _aggiornaGlobTipFiltroCounter();
  loadGlobale();
}

function resetGlobaleClienteSel() {
  state.globaleSelectedCliente = "";
  var el = document.getElementById("glob-sel-cliente");
  if (el) {
    el.value = "";
    if (el._ssRefresh) el._ssRefresh();
  }
}

// ═══════════════════════════════════════════════════════════════
// RENDER HEADER CON FILTRO ADEMPIMENTO
// ═══════════════════════════════════════════════════════════════

function renderGlobaleHeader() {
  var st = state.globaleStats;
  if (!st) return;
  var adpSel = document.getElementById("glob-filtro-adp");
  if (adpSel) {
    var currentValues = new Set(
      Array.from(adpSel.selectedOptions || []).map(function (o) {
        return o.value;
      }),
    );

    if (state.globalePreFiltroAdp && state.globalePreFiltroAdp !== "")
      currentValues.add(state.globalePreFiltroAdp);
    if (
      state.globalePreFiltroAdpMulti &&
      state.globalePreFiltroAdpMulti.length
    ) {
      state.globalePreFiltroAdpMulti.forEach(function (n) {
        currentValues.add(n);
      });
    }

    var adpList;
    if (state.adempimenti && state.adempimenti.length) {
      var nomiSet = {};
      var _annoGlob = state.anno || new Date().getFullYear();
      state.adempimenti.forEach(function (a) {
        if (!a || !a.nome) return;
        if (a.anno_validita != null && Number(a.anno_validita) !== _annoGlob)
          return;
        nomiSet[a.nome] = true;
      });
      Array.from(st.adempimenti || []).forEach(function (n) {
        nomiSet[n] = true;
      });
      adpList = Object.keys(nomiSet);
    } else {
      adpList = Array.from(st.adempimenti || []);
      if (!state._globAdpFetchStarted) {
        state._globAdpFetchStarted = true;
        socket.emit("get:adempimenti");
      }
    }

    adpList.sort(function (a, b) {
      return a.localeCompare(b, "it", { sensitivity: "base" });
    });

    var options = "";
    for (var i = 0; i < adpList.length; i++) {
      var adpName = adpList[i];
      var selected = currentValues.has(adpName) ? " selected" : "";
      options +=
        '<option value="' +
        escapeHtmlForSelect(adpName) +
        '"' +
        selected +
        ">" +
        adpName +
        "</option>";
    }
    adpSel.innerHTML = options;

    if (!adpSel.dataset.ssinit) initSearchableMultiSelect("glob-filtro-adp");
    else if (adpSel._ssRefresh) adpSel._ssRefresh();

    // Azzera i pre‑filtri dopo averli applicati
    state.globalePreFiltroAdp = "";
    state.globalePreFiltroAdpMulti = null;
  }
}

function _globToggleAdpFiltro(nome) {
  var adpSel = document.getElementById("glob-filtro-adp");
  if (!adpSel) return;
  var opt = Array.from(adpSel.options).find(function (o) {
    return o.value === nome;
  });
  if (opt) opt.selected = false;
  if (adpSel._ssRefresh) adpSel._ssRefresh();
  applyGlobaleFiltri();
}
window._globToggleAdpFiltro = _globToggleAdpFiltro;

function navigaAdempimento(direzione) {
  var adpSel = document.getElementById("glob-filtro-adp");
  if (!adpSel || !state.globaleStats) return;
  var lista = Array.from(state.globaleStats.adempimenti);
  lista.sort(function (a, b) {
    return a.localeCompare(b, "it", { sensitivity: "base" });
  });
  var currentSelected = Array.from(adpSel.selectedOptions || []).map(
    function (o) {
      return o.value;
    },
  );
  var current = currentSelected.length === 1 ? currentSelected[0] : "";
  var idx = lista.indexOf(current);
  var newIdx;
  if (direzione === -1) newIdx = idx <= 0 ? lista.length - 1 : idx - 1;
  else newIdx = idx >= lista.length - 1 || idx === -1 ? 0 : idx + 1;

  Array.from(adpSel.options).forEach(function (o) {
    o.selected = o.value === lista[newIdx];
  });
  if (adpSel._ssRefresh) adpSel._ssRefresh();
  applyGlobaleFiltri();
}

// ═══════════════════════════════════════════════════════════════
// HELPER INTERNO: costruisce l'HTML dei periodi ordinati per un cliente
// Ordine: adempimento, poi periodo naturale (T1 prima di T2), poi data
// ═══════════════════════════════════════════════════════════════

function _buildPeriodiOrdinatiHtml(periodi) {
  // Ordine NATURALE: adempimento A→Z, poi T1 → T2 → T3 → T4 (mai il
  // contrario), Gen → Dic, S1 → S2, quindi data crescente.
  // Comparatore nel modulo condiviso /shared/periodi.js
  var periodiOrdinati = periodi.slice().sort(confrontaPeriodi);

  var html = "";
  for (var i = 0; i < periodiOrdinati.length; i++) {
    html += renderPeriodoPill(periodiOrdinati[i]);
  }
  return html;
}
