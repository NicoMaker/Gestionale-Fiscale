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

// Stato per il filtro clienti
var _sintesiClienteFiltro = null; // id del cliente selezionato, null = tutti

// ═══════════════════════════════════════════════════════════════
// RENDER PAGINA PRINCIPALE
// ═══════════════════════════════════════════════════════════════

function renderSintesiPage() {
  // NON inizializzare il filtro tipologie - lo rimuoviamo completamente

  // Carica i clienti per il selettore
  if (!state.clienti || state.clienti.length === 0) {
    if (typeof socket !== "undefined") {
      socket.emit("get:clienti", { anno: state.anno });
      socket.once("res:clienti", function (d) {
        if (d.success) {
          state.clienti = d.data;
          _renderSintesiTopbar();
          if (state.page === "sintesi") renderSintesiTabella();
        }
      });
    }
  } else {
    _renderSintesiTopbar();
  }

  // Carica gli adempimenti
  if (!state.adempimenti || state.adempimenti.length === 0) {
    if (typeof socket !== "undefined") {
      socket.emit("get:adempimenti");
      socket.once("res:adempimenti", function (d) {
        if (d.success) {
          state.adempimenti = d.data;
          _popolaSintesiAdpSelect();
          if (state.page === "sintesi") renderSintesiTabella();
        }
      });
    }
  } else {
    _popolaSintesiAdpSelect();
  }

  // Carica i dati della sintesi
  loadSintesi();
}

function _renderSintesiTopbar() {
  var topbar = document.getElementById("topbar-actions");
  if (!topbar) return;

  // Costruisce le opzioni del selettore clienti
  var clientiOpts = '<option value="">-- Tutti i clienti --</option>';
  if (state.clienti) {
    var sorted = state.clienti.slice().sort(function (a, b) {
      return (a.nome || "").localeCompare(b.nome || "", "it", {
        sensitivity: "base",
      });
    });
    sorted.forEach(function (c) {
      // Salta clienti inattivi
      if (c.attivo === 0 || c.attivo === "0" || c.attivo === false) return;
      var selected = _sintesiClienteFiltro === c.id ? "selected" : "";
      clientiOpts +=
        '<option value="' +
        c.id +
        '" ' +
        selected +
        ">" +
        escAttr(c.nome || "") +
        (c.tipologia_codice ? " (" + escAttr(c.tipologia_codice) + ")" : "") +
        "</option>";
    });
  }

  topbar.innerHTML =
    '<div class="year-sel">' +
    '<button onclick="changeAnnoSintesi(-1)" title="Anno precedente">&#9664;</button>' +
    '<span class="year-num">' +
    state.anno +
    "</span>" +
    '<button onclick="changeAnnoSintesi(1)" title="Anno successivo">&#9654;</button>' +
    "</div>" +
    '<select class="select topbar-select" id="sint-filtro-cliente" onchange="onSintesiClienteChange()" title="Filtra per cliente" style="min-width:180px;max-width:250px">' +
    clientiOpts +
    "</select>" +
    '<div class="search-wrap" style="width:200px"><span class="search-icon">🔍</span><input class="input" id="sint-search-cliente" placeholder="Cerca nome, CF, P.IVA…" value="' +
    escAttr(getSharedClienteSearch()) +
    '" oninput="onSintesiSearchInput(this.value)" style="font-size:13px"></div>' +
    '<select class="select" id="sint-filtro-adp" multiple style="width:200px;font-size:13px" onchange="applySintesiFiltriLocali()" title="Mostra in tabella solo gli adempimenti selezionati" data-placeholder="📋 Tutti gli adempimenti">' +
    "</select>" +
    '<button class="btn btn-sm btn-primary" onclick="resetSintesiFiltri()" title="Azzera tutti i filtri" style="font-size:13px">⟳ Tutti</button>' +
    '<button class="btn btn-sm btn-stampa-completa" onclick="stampaSintesiCompleta()" title="Stampa lista completa con TUTTI gli adempimenti per TUTTI i clienti" style="font-size:13px;background:var(--accent);color:#fff;border-color:var(--accent)">🖨️ Stampa Lista Completa</button>' +
    '<button class="btn btn-print btn-sm" onclick="window.print()" style="font-size:13px">🖨️ Stampa</button>';

  // Inizializza il select dei clienti come searchable
  if (typeof initSearchableSelect === "function") {
    setTimeout(function () {
      initSearchableSelect("sint-filtro-cliente");
    }, 50);
  }

  // Inizializza il select multiplo degli adempimenti
  setTimeout(function () {
    initSearchableMultiSelect("sint-filtro-adp");
    _popolaSintesiAdpSelect();
  }, 50);
}

function onSintesiClienteChange() {
  var sel = document.getElementById("sint-filtro-cliente");
  if (!sel) return;
  var val = sel.value;
  _sintesiClienteFiltro = val ? parseInt(val) : null;
  renderSintesiTabella();
}
window.onSintesiClienteChange = onSintesiClienteChange;

function changeAnnoSintesi(d) {
  state.anno += d;
  var yearNums = document.querySelectorAll(".year-num");
  for (var i = 0; i < yearNums.length; i++)
    yearNums[i].textContent = state.anno;
  state.sintesiActiveCellKey = null;
  // Ricarica il selettore clienti con l'anno aggiornato
  if (typeof socket !== "undefined") {
    socket.emit("get:clienti", { anno: state.anno });
    socket.once("res:clienti", function (d) {
      if (d.success) {
        state.clienti = d.data;
        _renderSintesiTopbar();
        loadSintesi();
      }
    });
  } else {
    loadSintesi();
  }
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
        _renderSintesiTopbar();
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
// FILTRI (ricerca condivisa, adempimenti) — tutto locale,
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
  var clienteSel = document.getElementById("sint-filtro-cliente");
  if (clienteSel) {
    clienteSel.value = "";
    if (clienteSel._ssRefresh) clienteSel._ssRefresh();
  }
  _sintesiClienteFiltro = null;
  state.sintesiStatoFiltro = {
    done: false,
    partial: false,
    todo: false,
    na: false,
  };
  state.sintesiActiveCellKey = null;
  renderSintesiTabella();
}

// ═══════════════════════════════════════════════════════════════
// FILTRO PER STATO CELLA (✅ Fatto / 🔄 Parziale / ⭕ Da fare / ➖ N/A)
// ═══════════════════════════════════════════════════════════════

function _sintesiStatoFiltroSafe() {
  if (!state.sintesiStatoFiltro)
    state.sintesiStatoFiltro = {
      done: false,
      partial: false,
      todo: false,
      na: false,
    };
  return state.sintesiStatoFiltro;
}

function _sintesiStatoFiltroAttivi() {
  var f = _sintesiStatoFiltroSafe();
  return Object.keys(f).filter(function (k) {
    return f[k];
  });
}

function toggleSintesiStatoFiltro(kind) {
  var f = _sintesiStatoFiltroSafe();
  f[kind] = !f[kind];
  renderSintesiTabella();
}
window.toggleSintesiStatoFiltro = toggleSintesiStatoFiltro;

function resetSintesiStatoFiltro() {
  state.sintesiStatoFiltro = {
    done: false,
    partial: false,
    todo: false,
    na: false,
  };
  renderSintesiTabella();
}
window.resetSintesiStatoFiltro = resetSintesiStatoFiltro;

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

  // ─── Righe (clienti) ──────────────────────────────────────────
  var searchTerm = (getSharedClienteSearch() || "").toLowerCase();
  var clienti = (state.clienti || []).filter(function (c) {
    if (c.attivo === 0 || c.attivo === "0" || c.attivo === false) return false;
    if (_sintesiClienteFiltro && c.id !== _sintesiClienteFiltro) return false;
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

  // ─── Filtro per stato cella ──────────────────────────────────
  var statoFiltroAttivi = _sintesiStatoFiltroAttivi();
  var clientiVisibili = !statoFiltroAttivi.length
    ? clienti
    : clienti.filter(function (c) {
        for (var fci = 0; fci < columns.length; fci++) {
          var fk = c.id + "|" + columns[fci].id;
          var fst = _sintesiStatoCella(lookup[fk]);
          if (statoFiltroAttivi.indexOf(fst.kind) !== -1) return true;
        }
        return false;
      });

  // ─── Header riepilogativo ─────────────────────────────────────
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

  var clientiCountLabel =
    statoFiltroAttivi.length && clientiVisibili.length !== clienti.length
      ? clientiVisibili.length + " di " + clienti.length
      : String(clienti.length);
  var clientiCountUnit = clienti.length === 1 ? "e" : "i";

  function _sintStatBoxHtml(kind, count, color, iconaLabel) {
    var active = statoFiltroAttivi.indexOf(kind) !== -1;
    return (
      '<button type="button" class="gpc-stat-btn' +
      (active ? " active" : "") +
      '" onclick="toggleSintesiStatoFiltro(\'' +
      kind +
      '\')" title="Filtra: mostra solo ' +
      escAttr(iconaLabel) +
      '">' +
      '<div style="font-family:var(--mono);font-weight:800;color:' +
      color +
      ';font-size:16px">' +
      count +
      "</div>" +
      '<div style="font-size:10.5px;color:var(--t3)">' +
      iconaLabel +
      "</div>" +
      "</button>"
    );
  }

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
    clientiCountLabel +
    " client" +
    clientiCountUnit +
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
    _sintStatBoxHtml("done", doneCells, "var(--green)", "✅ Fatti") +
    _sintStatBoxHtml("partial", partialCells, "var(--yellow)", "🔄 Parziali") +
    _sintStatBoxHtml("todo", todoCells, "var(--red)", "⭕ Da fare") +
    _sintStatBoxHtml("na", naCells, "var(--t3)", "➖ N/A") +
    "</div>" +
    "</div>" +
    '<div style="font-size:11px;color:var(--t3);margin-top:8px">📖 Vista di sola lettura — i dati si modificano dallo Scadenzario Cliente o dalla Vista Globale.</div>' +
    "</div>";

  // ─── Legenda ───────────────────────────────────────────────────
  function _sintLegendItemHtml(kind, label) {
    var active = statoFiltroAttivi.indexOf(kind) !== -1;
    return (
      '<button type="button" class="sint-legend-item' +
      (active ? " active" : "") +
      '" onclick="toggleSintesiStatoFiltro(\'' +
      kind +
      '\')" title="Filtra: mostra solo ' +
      escAttr(label) +
      '">' +
      '<span class="sint-legend-dot ' +
      kind +
      '"></span>' +
      label +
      "</button>"
    );
  }

  var legend =
    '<div class="sint-legend">' +
    _sintLegendItemHtml(
      "done",
      "✅ Adempimento completato per tutti i periodi",
    ) +
    _sintLegendItemHtml("partial", "🔄 Parzialmente completato") +
    _sintLegendItemHtml("todo", "⭕ Da fare / non ancora iniziato") +
    _sintLegendItemHtml("na", "➖ N/A — non applicato a questo cliente") +
    (statoFiltroAttivi.length
      ? '<button type="button" class="sint-legend-clear" onclick="resetSintesiStatoFiltro()">✕ Rimuovi filtro stato</button>'
      : "") +
    '<span style="color:var(--t3)">· Clicca una voce per filtrare, clicca una cella per vedere il dettaglio mese per mese / trimestre</span>' +
    "</div>";

  // ─── Tabella ───────────────────────────────────────────────────
  var bodyHtml = "";
  if (!clientiVisibili.length || !columns.length) {
    var msgVuoto = !columns.length
      ? "Nessun adempimento selezionato — usa il filtro in alto o clicca ⟳ Tutti"
      : statoFiltroAttivi.length
        ? "Nessun cliente ha celle nello stato selezionato, per " + state.anno
        : "Nessun cliente corrisponde ai filtri attivi per " + state.anno;
    bodyHtml =
      '<div class="empty">' +
      '<div class="empty-icon">🧮</div>' +
      '<p style="font-size:15px">' +
      msgVuoto +
      "</p>" +
      '<button class="btn btn-sm btn-primary" onclick="resetSintesiFiltri()" style="margin-top:12px">⟳ Rimuovi filtri</button>' +
      (statoFiltroAttivi.length
        ? '<button class="btn btn-sm btn-secondary" onclick="resetSintesiStatoFiltro()" style="margin-top:12px;margin-left:8px">✕ Solo filtro stato</button>'
        : "") +
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
    for (var i = 0; i < clientiVisibili.length; i++) {
      var c = clientiVisibili[i];
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
        var isDim =
          statoFiltroAttivi.length > 0 &&
          statoFiltroAttivi.indexOf(st.kind) === -1;
        
        var sortedP = periodi.slice().sort(function (a, b) {
          if (a.mese != null && b.mese != null) return a.mese - b.mese;
          if (a.trimestre != null && b.trimestre != null)
            return a.trimestre - b.trimestre;
          if (a.semestre != null && b.semestre != null)
            return a.semestre - b.semestre;
          return 0;
        });
        var doneCount = 0;
        var pillsHtml = sortedP
          .map(function (p) {
            var pStato = p.stato || "da_fare";
            if (pStato === "completato") doneCount++;
            var pInfo = _SINT_STATO_INFO[pStato] || _SINT_STATO_INFO.da_fare;
            var pShort =
              typeof getPeriodoShort === "function" ? getPeriodoShort(p) : "-";
            var bgColor =
              pStato === "completato"
                ? "var(--green)"
                : pStato === "in_corso"
                  ? "var(--yellow)"
                  : pStato === "n_a"
                    ? "var(--t3)"
                    : "var(--red)";
            return (
              '<span style="display:inline-flex;align-items:center;gap:2px;padding:2px 5px;border-radius:4px;font-size:10px;font-weight:700;background:' +
              bgColor +
              "22;border:1px solid " +
              bgColor +
              "55;color:" +
              bgColor +
              ';line-height:1.2">' +
              pInfo.icon +
              " " +
              escAttr(pShort) +
              "</span>"
            );
          })
          .join("");

        var cellContent;
        if (periodi.length > 0) {
          cellContent =
            '<div style="display:flex;flex-wrap:wrap;gap:3px;justify-content:center">' +
            pillsHtml +
            "</div>" +
            '<div style="font-size:10px;color:var(--t3);margin-top:3px;font-weight:700">' +
            doneCount +
            "/" +
            periodi.length +
            "</div>";
        } else {
          cellContent =
            st.kind === "na"
              ? '<span style="font-size:11px">N/A</span>'
              : "<span>—</span>";
        }

        cellsHtml +=
          '<td class="sint-td"><button type="button" class="sint-cell sint-cell-' +
          st.kind +
          (isActive ? " active" : "") +
          (isDim ? " sint-cell-dim" : "") +
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

  var gridHtml = "";
  var doneN = 0,
    totN = periodi.length;
  if (periodi.length) {
    var chips = periodi
      .map(function (p, idx) {
        var stato = p.stato || "da_fare";
        if (stato === "completato") doneN++;
        var info = _SINT_STATO_INFO[stato] || _SINT_STATO_INFO.da_fare;
        var shortLabel =
          typeof getPeriodoShort === "function" ? getPeriodoShort(p) : "-";
        var fullLabel =
          typeof getPeriodoLabel === "function" ? getPeriodoLabel(p) : "-";
        var tooltip =
          fullLabel +
          " — " +
          info.label +
          (p.data_scadenza
            ? " · Scad. " + formattaDataItaliana(p.data_scadenza)
            : "") +
          (p.data_completamento
            ? " · Completato " + formattaDataItaliana(p.data_completamento)
            : "");
        return (
          '<button type="button" class="sint-dett-chip sint-dett-chip-' +
          stato +
          '" data-pidx="' +
          idx +
          '" onclick="_sintesiDettScrollTo(' +
          idx +
          ')" title="' +
          escAttr(tooltip) +
          '"><span class="sint-dett-chip-ico">' +
          info.icon +
          '</span><span class="sint-dett-chip-lbl">' +
          escAttr(shortLabel) +
          "</span></button>"
        );
      })
      .join("");
    gridHtml =
      '<div class="sint-dett-grid-wrap">' +
      '<div class="sint-dett-grid-label">📅 Vista rapida — ' +
      totN +
      (totN === 1 ? " periodo" : " periodi") +
      " · " +
      doneN +
      "/" +
      totN +
      " completati</div>" +
      '<div class="sint-dett-grid">' +
      chips +
      "</div>" +
      "</div>";
  }

  var rowsHtml = "";
  if (!periodi.length) {
    rowsHtml =
      '<tr><td colspan="4" style="text-align:center;color:var(--t3);padding:16px">➖ Adempimento non applicato / non generato per questo cliente nell\'anno ' +
      state.anno +
      "</td></tr>";
  } else {
    periodi.forEach(function (p, idx) {
      var stato = p.stato || "da_fare";
      var info = _SINT_STATO_INFO[stato] || _SINT_STATO_INFO.da_fare;
      var periodoLabel =
        typeof getPeriodoLabel === "function" ? getPeriodoLabel(p) : "-";
      rowsHtml +=
        '<tr data-pidx="' +
        idx +
        '"><td>' +
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
    gridHtml +
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

function _sintesiDettScrollTo(idx) {
  var row = document.querySelector(
    '.sint-dett-table tr[data-pidx="' + idx + '"]',
  );
  if (!row) return;
  row.scrollIntoView({ behavior: "smooth", block: "center" });
  row.classList.add("flash");
  setTimeout(function () {
    row.classList.remove("flash");
  }, 900);
}
window._sintesiDettScrollTo = _sintesiDettScrollTo;

// ═══════════════════════════════════════════════════════════════
// STAMPA LISTA COMPLETA — stampa una lista verticale per ogni cliente
// con NOME ADEMPIMENTO e dettaglio dei periodi (stato, scadenza)
// ═══════════════════════════════════════════════════════════════

function stampaSintesiCompleta() {
  // Salva lo stato corrente dei filtri
  var statoPrecedente = {
    clienteFiltro: _sintesiClienteFiltro,
    searchTerm: getSharedClienteSearch(),
    statoFiltro: JSON.parse(JSON.stringify(state.sintesiStatoFiltro || {})),
    adpSelezionati: []
  };

  // Salva gli adempimenti selezionati
  var adpSel = document.getElementById("sint-filtro-adp");
  if (adpSel) {
    statoPrecedente.adpSelezionati = Array.from(adpSel.selectedOptions || []).map(function(o) {
      return o.value;
    });
  }

  // Rimuovi temporaneamente TUTTI i filtri
  _sintesiClienteFiltro = null;
  setSharedClienteSearch("");

  // Reset del filtro stato
  state.sintesiStatoFiltro = {
    done: false,
    partial: false,
    todo: false,
    na: false,
  };

  // Deseleziona tutti gli adempimenti nel filtro (mostra TUTTI)
  if (adpSel) {
    Array.from(adpSel.options).forEach(function (o) {
      o.selected = false;
    });
    if (adpSel._ssRefresh) adpSel._ssRefresh();
  }

  // Assicurati che i dati siano caricati
  if (!state.sintesiData || state.sintesiData.length === 0) {
    showNotif("⏳ Caricamento dati in corso...", "info");
    socket.emit("get:sintesi", { anno: state.anno });
    socket.once("res:sintesi", function(data) {
      if (data.success) {
        state.sintesiData = data.data;
        _generaStampaLista();
      }
    });
    return;
  }

  _generaStampaLista();

  function _generaStampaLista() {
    // Crea un container per la stampa
    var printContainer = document.createElement('div');
    printContainer.id = 'stampa-lista-completa';
    printContainer.style.cssText = 'padding:20px;font-family:Arial,sans-serif;max-width:1200px;margin:0 auto;';
    
    // Intestazione
    printContainer.innerHTML = `
      <div style="text-align:center;margin-bottom:30px;border-bottom:2px solid #333;padding-bottom:15px;">
        <h1 style="font-size:24px;margin:0;color:#333;">Sintesi Adempimenti ${state.anno}</h1>
        <p style="font-size:14px;color:#666;margin:5px 0 0;">Lista completa di tutti gli adempimenti per cliente</p>
        <p style="font-size:12px;color:#999;margin:2px 0 0;">Stampato il ${new Date().toLocaleDateString('it-IT')}</p>
      </div>
    `;

    // Prepara i dati
    var allClienti = (state.clienti || []).filter(function(c) {
      if (c.attivo === 0 || c.attivo === "0" || c.attivo === false) return false;
      return true;
    }).sort(function(a, b) {
      return (a.nome || "").localeCompare(b.nome || "", "it", { sensitivity: "base" });
    });

    var allAdp = (state.adempimenti || []).filter(function(a) {
      return !a.anno_validita || parseInt(a.anno_validita) === parseInt(state.anno);
    }).sort(function(a, b) {
      return (a.nome || "").localeCompare(b.nome || "", "it", { sensitivity: "base" });
    });

    var lookup = {};
    (state.sintesiData || []).forEach(function(r) {
      var k = r.cliente_id + "|" + r.id_adempimento;
      if (!lookup[k]) lookup[k] = [];
      lookup[k].push(r);
    });

    // Genera la lista per ogni cliente
    allClienti.forEach(function(cliente) {
      var tipColor = cliente.tipologia_colore || 
        (typeof getTipologiaColor === "function" ? getTipologiaColor(cliente.tipologia_codice) : "#888");
      
      var clienteHtml = `
        <div style="margin-bottom:25px;border:1px solid #ddd;border-radius:8px;padding:15px;page-break-inside:avoid;background:#f9f9f9;">
          <div style="display:flex;align-items:center;gap:15px;margin-bottom:12px;border-bottom:2px solid ${tipColor};padding-bottom:10px;">
            <div style="font-size:20px;font-weight:700;color:#333;">${escAttr(cliente.nome)}</div>
            <div style="font-size:12px;color:#666;background:${tipColor}22;padding:2px 10px;border-radius:12px;border:1px solid ${tipColor};">${cliente.tipologia_codice || '-'}</div>
            ${cliente.codice_fiscale ? `<div style="font-size:11px;color:#888;">CF: ${cliente.codice_fiscale}</div>` : ''}
          </div>
          <div style="display:grid;grid-template-columns:1fr;gap:6px;">
      `;

      var hasData = false;
      allAdp.forEach(function(adp) {
        var key = cliente.id + "|" + adp.id;
        var periodi = lookup[key] || [];
        var st = _sintesiStatoCella(periodi);
        
        if (st.kind === "na" && periodi.length === 0) {
          // Non mostrare gli N/A senza periodi
          return;
        }

        hasData = true;
        var sortedP = periodi.slice().sort(function(a, b) {
          if (a.mese != null && b.mese != null) return a.mese - b.mese;
          if (a.trimestre != null && b.trimestre != null) return a.trimestre - b.trimestre;
          if (a.semestre != null && b.semestre != null) return a.semestre - b.semestre;
          return 0;
        });

        var statoIcon = st.kind === "done" ? "✅" : 
                        st.kind === "partial" ? "🔄" : 
                        st.kind === "todo" ? "⭕" : "➖";
        var statoColor = st.kind === "done" ? "#2e7d32" : 
                         st.kind === "partial" ? "#f9a825" : 
                         st.kind === "todo" ? "#c62828" : "#888";

        var periodiDetails = sortedP.map(function(p) {
          var pStato = p.stato || "da_fare";
          var pInfo = _SINT_STATO_INFO[pStato] || _SINT_STATO_INFO.da_fare;
          var pLabel = typeof getPeriodoLabel === "function" ? getPeriodoLabel(p) : "-";
          var scadenza = p.data_scadenza ? formattaDataItaliana(p.data_scadenza) : "-";
          var completato = p.data_completamento ? formattaDataItaliana(p.data_completamento) : "-";
          return `<span style="display:inline-block;margin:2px 4px 2px 0;padding:2px 8px;border-radius:4px;font-size:11px;background:${pInfo.color}22;border:1px solid ${pInfo.color}55;color:${pInfo.color};">${pInfo.icon} ${pLabel}</span>`;
        }).join('');

        var scadenzaDate = sortedP.map(function(p) {
          return p.data_scadenza ? formattaDataItaliana(p.data_scadenza) : '-';
        }).filter(function(d) { return d !== '-'; });

        clienteHtml += `
          <div style="display:grid;grid-template-columns:180px 1fr;gap:10px;padding:6px 10px;border-radius:4px;background:#fff;border:1px solid #eee;align-items:center;">
            <div style="font-weight:600;font-size:13px;color:#333;">
              ${escAttr(adp.nome)}
              <span style="font-size:10px;color:#999;font-weight:400;display:block;">${escAttr(adp.codice || '')}</span>
            </div>
            <div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;">
              <span style="font-size:13px;font-weight:700;color:${statoColor};min-width:80px;">${statoIcon} ${st.label}</span>
              ${periodi.length > 0 ? `<span style="font-size:11px;color:#888;">${periodi.length} periodi</span>` : ''}
              ${periodiDetails}
              ${scadenzaDate.length > 0 ? `<span style="font-size:10px;color:#999;margin-left:4px;">📅 ${scadenzaDate.join(', ')}</span>` : ''}
            </div>
          </div>
        `;
      });

      if (!hasData) {
        clienteHtml += `
          <div style="padding:10px;text-align:center;color:#999;font-size:13px;background:#fff;border-radius:4px;border:1px dashed #ddd;">
            Nessun adempimento registrato per questo cliente nell'anno ${state.anno}
          </div>
        `;
      }

      clienteHtml += `
          </div>
        </div>
      `;

      printContainer.innerHTML += clienteHtml;
    });

    // Footer
    printContainer.innerHTML += `
      <div style="text-align:center;margin-top:30px;padding-top:15px;border-top:1px solid #ddd;font-size:11px;color:#999;">
        Studio Fiscale - Sintesi Adempimenti ${state.anno} - Pagina 1/1
      </div>
    `;

    // Sostituisci il contenuto con la lista per la stampa
    var container = document.getElementById("content");
    var originalContent = container.innerHTML;
    container.innerHTML = printContainer.innerHTML;

    // Stampa
    setTimeout(function() {
      window.print();

      // Ripristina il contenuto originale
      setTimeout(function() {
        // Ripristina i filtri
        _sintesiClienteFiltro = statoPrecedente.clienteFiltro;
        setSharedClienteSearch(statoPrecedente.searchTerm || "");
        state.sintesiStatoFiltro = statoPrecedente.statoFiltro;

        var clienteSel = document.getElementById("sint-filtro-cliente");
        if (clienteSel) {
          clienteSel.value = _sintesiClienteFiltro || "";
          if (clienteSel._ssRefresh) clienteSel._ssRefresh();
        }

        var searchEl = document.getElementById("sint-search-cliente");
        if (searchEl) searchEl.value = statoPrecedente.searchTerm || "";

        if (adpSel) {
          Array.from(adpSel.options).forEach(function (o) {
            o.selected = statoPrecedente.adpSelezionati.indexOf(o.value) !== -1;
          });
          if (adpSel._ssRefresh) adpSel._ssRefresh();
        }

        // Rigenera la tabella originale
        renderSintesiTabella();
      }, 100);
    }, 300);
  }
}
window.stampaSintesiCompleta = stampaSintesiCompleta;

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
window.stampaSintesiCompleta = stampaSintesiCompleta;