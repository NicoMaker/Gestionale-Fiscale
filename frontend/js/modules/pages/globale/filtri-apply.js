function applyGlobaleFiltriLocali() {
  if (state.scadGlobale) renderGlobaleTabella(state.scadGlobale);
}

function resetGlobaleClienteSel() {
  state.globaleSelectedClienti = [];
  const el = document.getElementById("glob-sel-cliente");
  if (el) {
    Array.from(el.options).forEach(function (o) {
      o.selected = false;
    });
    if (el._ssRefresh) el._ssRefresh();
  }
}

// ═══════════════════════════════════════════════════════════════
// RENDER HEADER CON FILTRO ADEMPIMENTO
// ═══════════════════════════════════════════════════════════════

function renderGlobaleHeader() {
  const st = state.globaleStats;
  if (!st) return;
  const adpSel = document.getElementById("glob-filtro-adp");
  if (adpSel) {
    const currentValues = new Set(
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

    let adpList;
    if (state.adempimenti && state.adempimenti.length) {
      const nomiSet = {};
      const _annoGlob = state.anno || new Date().getFullYear();
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

    let options = "";
    for (let i = 0; i < adpList.length; i++) {
      const adpName = adpList[i];
      const selected = currentValues.has(adpName) ? " selected" : "";
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

    state.globalePreFiltroAdp = "";
    state.globalePreFiltroAdpMulti = null;
  }
}

function _globToggleAdpFiltro(nome) {
  const adpSel = document.getElementById("glob-filtro-adp");
  if (!adpSel) return;
  const opt = Array.from(adpSel.options).find(function (o) {
    return o.value === nome;
  });
  if (opt) opt.selected = false;
  if (adpSel._ssRefresh) adpSel._ssRefresh();
  applyGlobaleFiltri();
}
window._globToggleAdpFiltro = _globToggleAdpFiltro;

function navigaAdempimento(direzione) {
  const adpSel = document.getElementById("glob-filtro-adp");
  if (!adpSel || !state.globaleStats) return;
  const lista = Array.from(state.globaleStats.adempimenti);
  lista.sort(function (a, b) {
    return a.localeCompare(b, "it", { sensitivity: "base" });
  });
  const currentSelected = Array.from(adpSel.selectedOptions || []).map(
    function (o) {
      return o.value;
    },
  );
  const current = currentSelected.length === 1 ? currentSelected[0] : "";
  const idx = lista.indexOf(current);
  let newIdx;
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
// ═══════════════════════════════════════════════════════════════

function _buildPeriodiOrdinatiHtml(periodi) {
  const periodiOrdinati = periodi.slice().sort(function (a, b) {
    if (a.data_scadenza && b.data_scadenza) {
      const dateA = new Date(a.data_scadenza);
      const dateB = new Date(b.data_scadenza);
      if (dateA - dateB !== 0) return dateA - dateB;
      return a.adempimento_nome.localeCompare(b.adempimento_nome, "it", {
        sensitivity: "base",
      });
    }
    if (a.data_scadenza) return -1;
    if (b.data_scadenza) return 1;
    return a.adempimento_nome.localeCompare(b.adempimento_nome, "it", {
      sensitivity: "base",
    });
  });

  let html = "";
  for (let i = 0; i < periodiOrdinati.length; i++) {
    html += renderPeriodoPill(periodiOrdinati[i]);
  }
  return html;
}
