// ═══════════════════════════════════════════════════════════════
// SINTESI.JS — Pagina "Sintesi Adempimenti": matrice CLIENTI × ADEMPIMENTI
// Sola lettura: i dati (clienti / adempimenti / stato periodi) vengono
// sempre letti dal DB tramite socket, non sono mai modificabili da qui.
// Riusa il filtro tipologie condiviso (stesso pannello di Vista Globale
// e Clienti) e la ricerca cliente condivisa (localStorage).
// Dipende da: core/state.js, core/utils.js, core/constants.js,
//             pages/globale/filtri.js (pannello tipologie, helper),
//             network/socket.js (eventi get:sintesi / res:sintesi)
// ═══════════════════════════════════════════════════════════════

var _SINT_STATO_INFO = {
  completato: { icon: "✅", label: "Completato", color: "var(--green)" },
  in_corso: { icon: "🔄", label: "In corso", color: "var(--yellow)" },
  da_fare: { icon: "⭕", label: "Da fare", color: "var(--red)" },
  n_a: { icon: "➖", label: "N/A", color: "var(--t3)" },
  text_only: { icon: "📝", label: "Testo", color: "var(--purple)" },
};

// ═══════════════════════════════════════════════════════════════
// RENDER PAGINA PRINCIPALE
// ═══════════════════════════════════════════════════════════════

function renderSintesiPage() {
  // Il filtro tipologie è condiviso con Clienti / Vista Globale (var globali)
  if (
    typeof _getActiveFiltroKeys === "function" &&
    _getActiveFiltroKeys().size === 0 &&
    !(typeof _isManualNessuno === "function" && _isManualNessuno()) &&
    typeof initializeTipologieFilter === "function"
  ) {
    initializeTipologieFilter();
  }
  if (typeof _caricaFiltriGlobaleDaStorage === "function") {
    _caricaFiltriGlobaleDaStorage();
  }

  // Si riaggancia allo stesso evento di sync usato da Vista Globale, così
  // selezionando le tipologie da una pagina, l'altra resta coerente.
  window.addEventListener("filtriTipologieAggiornati", function () {
    if (state.page === "sintesi") {
      if (typeof _aggiornaGlobTipFiltroCounter === "function")
        _aggiornaGlobTipFiltroCounter();
      renderSintesiTabella();
    }
  });

  document.getElementById("topbar-actions").innerHTML =
    '<div class="year-sel">' +
    '<button onclick="changeAnnoSintesi(-1)" title="Anno precedente">&#9664;</button>' +
    '<span class="year-num">' +
    state.anno +
    "</span>" +
    '<button onclick="changeAnnoSintesi(1)" title="Anno successivo">&#9654;</button>' +
    "</div>" +
    '<div class="search-wrap" style="width:220px"><span class="search-icon">🔍</span><input class="input" id="sint-search-cliente" placeholder="Cerca nome, CF, P.IVA…" value="' +
    escAttr(getSharedClienteSearch()) +
    '" oninput="onSintesiSearchInput(this.value)" style="font-size:13px"></div>' +
    '<select class="select" id="sint-filtro-adp" multiple style="width:230px;font-size:13px" onchange="applySintesiFiltriLocali()" title="Mostra in tabella solo gli adempimenti selezionati" data-placeholder="📋 Tutti gli adempimenti">' +
    "</select>" +
    '<button class="btn btn-sm btn-primary" onclick="resetSintesiFiltri()" title="Azzera tutti i filtri" style="font-size:13px">⟳ Tutti</button>' +
    '<button class="btn btn-print btn-sm" onclick="window.print()" style="font-size:13px">🖨️ Stampa</button>';

  setTimeout(function () {
    initSearchableMultiSelect("sint-filtro-adp");
    _popolaSintesiAdpSelect();
    loadSintesi();
  }, 50);
}

function changeAnnoSintesi(d) {
  state.anno += d;
  var yearNums = document.querySelectorAll(".year-num");
  for (var i = 0; i < yearNums.length; i++)
    yearNums[i].textContent = state.anno;
  state.sintesiActiveCellKey = null;
  loadSintesi();
}

// ═══════════════════════════════════════════════════════════════
// CARICAMENTO DATI (sola lettura dal DB)
// ═══════════════════════════════════════════════════════════════

function loadSintesi() {
  if (!state.clienti || state.clienti.length === 0) {
    socket.emit("get:clienti", { anno: state.anno });
    socket.once("res:clienti", function (d) {
      if (d.success) {
        state.clienti = d.data;
        if (state.page === "sintesi") renderSintesiTabella();
      }
    });
  }
  if (!state.adempimenti || state.adempimenti.length === 0) {
    socket.emit("get:adempimenti");
    socket.once("res:adempimenti", function (d) {
      if (d.success) {
        state.adempimenti = d.data;
        _popolaSintesiAdpSelect();
        if (state.page === "sintesi") renderSintesiTabella();
      }
    });
  }
  socket.emit("get:sintesi", { anno: state.anno });
}

function _popolaSintesiAdpSelect() {
  var sel = document.getElementById("sint-filtro-adp");
  if (!sel) return;
  var currentValues = {};
  Array.from(sel.selectedOptions || []).forEach(function (o) {
    currentValues[o.value] = true;
  });
  var list = (state.adempimenti || []).filter(function (a) {
    return (
      !a.anno_validita || parseInt(a.anno_validita) === parseInt(state.anno)
    );
  });
  list = list.slice().sort(function (a, b) {
    return (a.nome || "").localeCompare(b.nome || "", "it", {
      sensitivity: "base",
    });
  });
  var options = list
    .map(function (a) {
      var selAttr = currentValues[String(a.id)] ? " selected" : "";
      var label = a.codice ? a.codice + " — " + a.nome : a.nome;
      return (
        '<option value="' +
        a.id +
        '"' +
        selAttr +
        ">" +
        escapeHtmlForSelect(label) +
        "</option>"
      );
    })
    .join("");
  sel.innerHTML = options;
  if (!sel.dataset.ssinit) initSearchableMultiSelect("sint-filtro-adp");
  else if (sel._ssRefresh) sel._ssRefresh();
}

// ═══════════════════════════════════════════════════════════════
// FILTRI (ricerca condivisa, adempimenti, tipologie) — tutto locale,
// nessuna richiesta al server: la pagina è già in possesso di tutti
// i dati dell'anno corrente.
// ═══════════════════════════════════════════════════════════════

function onSintesiSearchInput(value) {
  setSharedClienteSearch(value);
  applySintesiFiltriLocali();
}

var applySintesiFiltriLocali = debounce(function () {
  renderSintesiTabella();
}, 120);

function resetSintesiFiltri() {
  setSharedClienteSearch("");
  var searchEl = document.getElementById("sint-search-cliente");
  if (searchEl) searchEl.value = "";
  var adpSel = document.getElementById("sint-filtro-adp");
  if (adpSel) {
    Array.from(adpSel.options).forEach(function (o) {
      o.selected = false;
    });
    if (adpSel._ssRefresh) adpSel._ssRefresh();
  }
  if (typeof initializeTipologieFilter === "function")
    initializeTipologieFilter();
  if (typeof _refreshGlobTipFiltroPanel === "function")
    _refreshGlobTipFiltroPanel();
  if (typeof _aggiornaGlobTipFiltroCounter === "function")
    _aggiornaGlobTipFiltroCounter();
  state.sintesiActiveCellKey = null;
  renderSintesiTabella();
}

// ═══════════════════════════════════════════════════════════════
// LOGICA STATO CELLA
// ═══════════════════════════════════════════════════════════════

function _sintesiStatoCella(periodi) {
  if (!periodi || periodi.length === 0) {
    return { kind: "na", label: "N/A" };
  }
  var nonNA = periodi.filter(function (p) {
    return p.stato !== "n_a";
  });
  if (nonNA.length === 0) {
    return { kind: "na", label: "N/A" };
  }
  var doneCount = 0,
    avanzCount = 0;
  for (var i = 0; i < nonNA.length; i++) {
    if (nonNA[i].stato === "completato") doneCount++;
    else if (nonNA[i].stato === "in_corso") avanzCount++;
  }
  if (doneCount === nonNA.length) {
    return { kind: "done", label: "Fatto" };
  }
  if (doneCount > 0 || avanzCount > 0) {
    return { kind: "partial", label: doneCount + "/" + nonNA.length };
  }
  return { kind: "todo", label: "Da fare" };
}

function _sintesiOrdinaPeriodi(periodi) {
  return periodi.slice().sort(function (a, b) {
    if (a.mese != null && b.mese != null) return a.mese - b.mese;
    if (a.trimestre != null && b.trimestre != null)
      return a.trimestre - b.trimestre;
    if (a.semestre != null && b.semestre != null)
      return a.semestre - b.semestre;
    return 0;
  });
}

// ═══════════════════════════════════════════════════════════════
// RENDER TABELLA PRINCIPALE
// ═══════════════════════════════════════════════════════════════

function renderSintesiTabella() {
  if (state.page !== "sintesi") return;
  var container = document.getElementById("content");
  if (!container) return;

  if (!state.clienti || !state.adempimenti) {
    container.innerHTML =
      '<div class="empty"><div class="empty-icon">⏳</div><p style="font-size:15px">Caricamento dati…</p></div>';
    return;
  }

  // ─── Colonne (adempimenti) ───────────────────────────────────
  var adpSel = document.getElementById("sint-filtro-adp");
  var selectedIds = adpSel
    ? Array.from(adpSel.selectedOptions || []).map(function (o) {
        return parseInt(o.value);
      })
    : [];
  var allDefs = (state.adempimenti || []).filter(function (a) {
    return (
      !a.anno_validita || parseInt(a.anno_validita) === parseInt(state.anno)
    );
  });
  var columns = selectedIds.length
    ? allDefs.filter(function (a) {
        return selectedIds.indexOf(a.id) !== -1;
      })
    : allDefs;
  columns = columns.slice().sort(function (a, b) {
    return (a.nome || "").localeCompare(b.nome || "", "it", {
      sensitivity: "base",
    });
  });

  // ─── Righe (clienti): ricerca condivisa + filtro tipologie condiviso ──
  var searchTerm = (getSharedClienteSearch() || "").toLowerCase();
  var clienti = (state.clienti || []).filter(function (c) {
    if (c.attivo === 0 || c.attivo === "0" || c.attivo === false) return false;
    if (
      typeof clientePassaFiltroTipologie === "function" &&
      !clientePassaFiltroTipologie(c)
    )
      return false;
    if (searchTerm) {
      var nome = (c.nome || "").toLowerCase();
      var cf = (c.codice_fiscale || "").toLowerCase();
      var piva = (c.partita_iva || "").toLowerCase();
      if (
        nome.indexOf(searchTerm) === -1 &&
        cf.indexOf(searchTerm) === -1 &&
        piva.indexOf(searchTerm) === -1
      )
        return false;
    }
    return true;
  });
  clienti = clienti.slice().sort(function (a, b) {
    return (a.nome || "").localeCompare(b.nome || "", "it", {
      sensitivity: "base",
    });
  });

  // ─── Lookup periodi per cliente+adempimento ──────────────────
  var lookup = {};
  (state.sintesiData || []).forEach(function (r) {
    var k = r.cliente_id + "|" + r.id_adempimento;
    if (!lookup[k]) lookup[k] = [];
    lookup[k].push(r);
  });

  // ─── Pannello filtro tipologie (stesso markup/id di Vista Globale,
  // così le funzioni già esistenti restano riusabili senza modifiche) ──
  var tipFiltroHtml = "";
  if (typeof renderTipologieFiltroPanel === "function") {
    var activeFiltroKeys =
      typeof _getActiveFiltroKeys === "function"
        ? _getActiveFiltroKeys()
        : new Set();
    var allKeysArr =
      typeof window._getAllKeys === "function" ? window._getAllKeys() : [];
    var isNone =
      (typeof _isManualNessuno === "function" && _isManualNessuno()) ||
      activeFiltroKeys.size === 0;
    var isAll = !isNone && activeFiltroKeys.size === allKeysArr.length;
    var countDisplay = isNone ? "0" : isAll ? "" : activeFiltroKeys.size;
    var showBadge = isNone || (!isAll && activeFiltroKeys.size > 0);
  }

  // ─── Header riepilogativo + legenda ───────────────────────────
  var doneCells = 0,
    naCells = 0,
    partialCells = 0,
    todoCells = 0;
  for (var ci = 0; ci < clienti.length; ci++) {
    for (var cj = 0; cj < columns.length; cj++) {
      var k2 = clienti[ci].id + "|" + columns[cj].id;
      var st2 = _sintesiStatoCella(lookup[k2]);
      if (st2.kind === "done") doneCells++;
      else if (st2.kind === "na") naCells++;
      else if (st2.kind === "partial") partialCells++;
      else todoCells++;
    }
  }
  var baseCalc = doneCells + partialCells + todoCells;
  var percCompletato =
    baseCalc > 0 ? Math.round((doneCells / baseCalc) * 100) : 0;

  var headerCard =
    '<div class="globale-preview-card">' +
    '<div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap;width:100%">' +
    '<div class="gpc-left">' +
    '<div class="gpc-globe">🧮</div>' +
    "<div>" +
    '<div class="gpc-title">Sintesi Adempimenti ' +
    state.anno +
    "</div>" +
    '<div class="gpc-sub">' +
    clienti.length +
    " client" +
    (clienti.length === 1 ? "e" : "i") +
    " · " +
    columns.length +
    " adempiment" +
    (columns.length === 1 ? "o" : "i") +
    " in colonna · " +
    percCompletato +
    "% completato</div>" +
    "</div>" +
    "</div>" +
    '<div class="gpc-stats">' +
    '<div style="text-align:center"><div style="font-family:var(--mono);font-weight:800;color:var(--green);font-size:16px">' +
    doneCells +
    '</div><div style="font-size:10.5px;color:var(--t3)">✅ Fatti</div></div>' +
    '<div style="text-align:center"><div style="font-family:var(--mono);font-weight:800;color:var(--yellow);font-size:16px">' +
    partialCells +
    '</div><div style="font-size:10.5px;color:var(--t3)">🔄 Parziali</div></div>' +
    '<div style="text-align:center"><div style="font-family:var(--mono);font-weight:800;color:var(--red);font-size:16px">' +
    todoCells +
    '</div><div style="font-size:10.5px;color:var(--t3)">⭕ Da fare</div></div>' +
    '<div style="text-align:center"><div style="font-family:var(--mono);font-weight:800;color:var(--t3);font-size:16px">' +
    naCells +
    '</div><div style="font-size:10.5px;color:var(--t3)">➖ N/A</div></div>' +
    "</div>" +
    "</div>" +
    '<div style="font-size:11px;color:var(--t3);margin-top:8px">📖 Vista di sola lettura — i dati si modificano dallo Scadenzario Cliente o dalla Vista Globale.</div>' +
    "</div>";

  var legend =
    '<div class="sint-legend">' +
    '<span class="sint-legend-item"><span class="sint-legend-dot done"></span>✅ Adempimento completato per tutti i periodi</span>' +
    '<span class="sint-legend-item"><span class="sint-legend-dot partial"></span>🔄 Parzialmente completato</span>' +
    '<span class="sint-legend-item"><span class="sint-legend-dot todo"></span>⭕ Da fare / non ancora iniziato</span>' +
    '<span class="sint-legend-item"><span class="sint-legend-dot na"></span>➖ N/A — non applicato a questo cliente</span>' +
    '<span style="color:var(--t3)">· Clicca una cella per vedere il dettaglio mese per mese / trimestre</span>' +
    "</div>";

  // ─── Tabella ───────────────────────────────────────────────────
  var bodyHtml = "";
  if (!clienti.length || !columns.length) {
    var msgVuoto = !columns.length
      ? "Nessun adempimento selezionato — usa il filtro in alto o clicca ⟳ Tutti"
      : "Nessun cliente corrisponde ai filtri attivi per " + state.anno;
    bodyHtml =
      '<div class="empty">' +
      '<div class="empty-icon">🧮</div>' +
      '<p style="font-size:15px">' +
      msgVuoto +
      "</p>" +
      '<button class="btn btn-sm btn-primary" onclick="resetSintesiFiltri()" style="margin-top:12px">⟳ Rimuovi filtri</button>' +
      "</div>";
  } else {
    var theadCols = columns
      .map(function (a) {
        return (
          '<th class="sint-th" title="' +
          escAttr(a.nome) +
          '">' +
          '<span class="sint-th-cod">' +
          escAttr(a.codice || "") +
          "</span>" +
          '<span class="sint-th-nome">' +
          escAttr(a.nome) +
          "</span>" +
          "</th>"
        );
      })
      .join("");

    var rowsHtml = "";
    for (var i = 0; i < clienti.length; i++) {
      var c = clienti[i];
      var tipColor =
        c.tipologia_colore ||
        (typeof getTipologiaColor === "function"
          ? getTipologiaColor(c.tipologia_codice)
          : "#888");
      var cellsHtml = "";
      for (var j = 0; j < columns.length; j++) {
        var a = columns[j];
        var key = c.id + "|" + a.id;
        var periodi = lookup[key] || [];
        var st = _sintesiStatoCella(periodi);
        var isActive = state.sintesiActiveCellKey === key;
        var cellContent =
          st.kind === "done"
            ? "✓"
            : st.kind === "na"
              ? "N/A"
              : st.kind === "partial"
                ? st.label
                : "—";
        cellsHtml +=
          '<td class="sint-td"><button type="button" class="sint-cell sint-cell-' +
          st.kind +
          (isActive ? " active" : "") +
          '" data-key="' +
          key +
          '" onclick="sintesiToggleDettaglio(\'' +
          key +
          "'," +
          c.id +
          "," +
          a.id +
          ')" title="' +
          escAttr(c.nome + " · " + a.nome + " — " + st.label) +
          '">' +
          cellContent +
          "</button></td>";
      }
      rowsHtml +=
        '<tr><td class="sint-td-cliente" style="border-left:3px solid ' +
        tipColor +
        '"><div class="sint-cliente-nome">' +
        escAttr(c.nome) +
        '</div><div class="sint-cliente-sub">' +
        (c.codice_fiscale || c.partita_iva || "-") +
        (c.tipologia_codice
          ? ' · <span style="color:' +
            tipColor +
            '">' +
            c.tipologia_codice +
            "</span>"
          : "") +
        "</div></td>" +
        cellsHtml +
        "</tr>";
    }

    bodyHtml =
      '<div class="sint-table-wrap"><table class="sint-table">' +
      '<thead><tr><th class="sint-th-corner">Cliente</th>' +
      theadCols +
      "</tr></thead><tbody>" +
      rowsHtml +
      "</tbody></table></div>";
  }

  container.innerHTML =
    headerCard +
    tipFiltroHtml +
    legend +
    bodyHtml +
    '<div id="sint-dettaglio"></div>';

  if (state.sintesiActiveCellKey) {
    var parts = state.sintesiActiveCellKey.split("|");
    _renderSintesiDettaglio(parseInt(parts[0]), parseInt(parts[1]));
  }
}

// ═══════════════════════════════════════════════════════════════
// DETTAGLIO PERIODI (sotto-tabella mese/trimestre per la cella scelta)
// ═══════════════════════════════════════════════════════════════

function sintesiToggleDettaglio(key, clienteId, adempimentoId) {
  state.sintesiActiveCellKey = state.sintesiActiveCellKey === key ? null : key;
  renderSintesiTabella();
  if (state.sintesiActiveCellKey) {
    setTimeout(function () {
      var panel = document.getElementById("sint-dettaglio");
      if (panel) panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 30);
  }
}
window.sintesiToggleDettaglio = sintesiToggleDettaglio;

function sintesiCloseDettaglio() {
  state.sintesiActiveCellKey = null;
  var panel = document.getElementById("sint-dettaglio");
  if (panel) {
    panel.style.display = "none";
    panel.innerHTML = "";
  }
  document.querySelectorAll(".sint-cell.active").forEach(function (el) {
    el.classList.remove("active");
  });
}
window.sintesiCloseDettaglio = sintesiCloseDettaglio;

function _renderSintesiDettaglio(clienteId, adempimentoId) {
  var panel = document.getElementById("sint-dettaglio");
  if (!panel) return;

  var cliente = (state.clienti || []).find(function (c) {
    return c.id === clienteId;
  });
  var adp = (state.adempimenti || []).find(function (a) {
    return a.id === adempimentoId;
  });
  var periodi = (state.sintesiData || []).filter(function (r) {
    return r.cliente_id === clienteId && r.id_adempimento === adempimentoId;
  });
  periodi = _sintesiOrdinaPeriodi(periodi);

  var rowsHtml = "";
  if (!periodi.length) {
    rowsHtml =
      '<tr><td colspan="4" style="text-align:center;color:var(--t3);padding:16px">➖ Adempimento non applicato / non generato per questo cliente nell\'anno ' +
      state.anno +
      "</td></tr>";
  } else {
    periodi.forEach(function (p) {
      var stato = p.stato || "da_fare";
      var info = _SINT_STATO_INFO[stato] || _SINT_STATO_INFO.da_fare;
      var periodoLabel =
        typeof getPeriodoLabel === "function" ? getPeriodoLabel(p) : "-";
      rowsHtml +=
        "<tr><td>" +
        escAttr(periodoLabel) +
        '</td><td><span style="color:' +
        info.color +
        ';font-weight:700">' +
        info.icon +
        " " +
        info.label +
        "</span></td><td>" +
        (p.data_scadenza ? formattaDataItaliana(p.data_scadenza) : "—") +
        "</td><td>" +
        (p.data_completamento
          ? formattaDataItaliana(p.data_completamento)
          : "—") +
        "</td></tr>";
    });
  }

  panel.innerHTML =
    '<div class="sint-dett-head"><div>' +
    '<div class="sint-dett-cliente">👤 ' +
    escAttr(cliente ? cliente.nome : "—") +
    "</div>" +
    '<div class="sint-dett-adp">📋 ' +
    escAttr(
      adp ? (adp.codice ? adp.codice + " — " + adp.nome : adp.nome) : "—",
    ) +
    " · Anno " +
    state.anno +
    "</div>" +
    "</div>" +
    '<button type="button" class="btn btn-xs btn-secondary" onclick="sintesiCloseDettaglio()">✕ Chiudi</button>' +
    "</div>" +
    '<div style="overflow-x:auto"><table class="sint-dett-table">' +
    "<thead><tr><th>Periodo</th><th>Stato</th><th>Scadenza</th><th>Completato il</th></tr></thead>" +
    "<tbody>" +
    rowsHtml +
    "</tbody></table></div>";
  panel.style.display = "block";

  document.querySelectorAll(".sint-cell.active").forEach(function (el) {
    el.classList.remove("active");
  });
  var key = clienteId + "|" + adempimentoId;
  var cellEl = document.querySelector('.sint-cell[data-key="' + key + '"]');
  if (cellEl) cellEl.classList.add("active");
}

// ═══════════════════════════════════════════════════════════════
// ESPOSIZIONE GLOBALE
// ═══════════════════════════════════════════════════════════════
window.renderSintesiPage = renderSintesiPage;
window.changeAnnoSintesi = changeAnnoSintesi;
window.loadSintesi = loadSintesi;
window.renderSintesiTabella = renderSintesiTabella;
window.onSintesiSearchInput = onSintesiSearchInput;
window.applySintesiFiltriLocali = applySintesiFiltriLocali;
window.resetSintesiFiltri = resetSintesiFiltri;
