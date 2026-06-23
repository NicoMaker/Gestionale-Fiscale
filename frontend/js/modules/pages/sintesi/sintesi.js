// ═══════════════════════════════════════════════════════════════
// SINTESI.JS — Pagina "Sintesi Adempimenti": matrice CLIENTI × ADEMPIMENTI
// ═══════════════════════════════════════════════════════════════

var _SINT_STATO_INFO = {
  completato: { icon: "✅", label: "Completato", color: "var(--green)" },
  in_corso: { icon: "🔄", label: "In corso", color: "var(--yellow)" },
  da_fare: { icon: "⭕", label: "Da fare", color: "var(--red)" },
  n_a: { icon: "➖", label: "N/A", color: "var(--t3)" },
  text_only: { icon: "📝", label: "Testo", color: "var(--purple)" },
};

// Stato per il filtro clienti
var _sintesiClienteFiltro = null;

// Stato per il filtro tipo utente (PF / SP / SC / ASS / null = tutti)
var _sintesiTipoUtenteFiltro = null;

// Stato per i filtri di stato (done, partial, todo, na)
var _sintesiStatoFiltri = {
  done: false,
  partial: false,
  todo: false,
  na: false,
};

// Cache per i dati della sintesi
var _sintesiCache = {
  clienti: null,
  adempimenti: null,
  sintesiData: null,
  lookup: null,
  statiClienti: null,
};

// ═══════════════════════════════════════════════════════════════
// RENDER PAGINA PRINCIPALE
// ═══════════════════════════════════════════════════════════════

function renderSintesiPage() {
  // Carica i clienti per il selettore
  if (!state.clienti || state.clienti.length === 0) {
    if (typeof socket !== "undefined") {
      socket.emit("get:clienti", { anno: state.anno });
      socket.once("res:clienti", function (d) {
        if (d.success) {
          state.clienti = d.data;
          _sintesiCache.clienti = d.data;
          _renderSintesiTopbar();
          if (state.page === "sintesi") renderSintesiTabella();
        }
      });
    }
  } else {
    _sintesiCache.clienti = state.clienti;
    _renderSintesiTopbar();
  }

  // Carica gli adempimenti
  if (!state.adempimenti || state.adempimenti.length === 0) {
    if (typeof socket !== "undefined") {
      socket.emit("get:adempimenti");
      socket.once("res:adempimenti", function (d) {
        if (d.success) {
          state.adempimenti = d.data;
          _sintesiCache.adempimenti = d.data;
          _popolaSintesiAdpSelect();
          if (state.page === "sintesi") renderSintesiTabella();
        }
      });
    }
  } else {
    _sintesiCache.adempimenti = state.adempimenti;
    _popolaSintesiAdpSelect();
  }

  // Carica i dati della sintesi
  loadSintesi();
}

function _renderSintesiTopbar() {
  var topbar = document.getElementById("topbar-actions");
  if (!topbar) return;

  var clientiOpts = '<option value="">-- Tutti i clienti --</option>';
  if (state.clienti) {
    var sorted = state.clienti.slice().sort(function (a, b) {
      return (a.nome || "").localeCompare(b.nome || "", "it", {
        sensitivity: "base",
      });
    });
    sorted.forEach(function (c) {
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
    '<select class="select" id="sint-filtro-adp" multiple style="width:210px;font-size:13px" onchange="applySintesiFiltriAdp()" title="Filtra per uno o più adempimenti" data-placeholder="📋 Tutti adempimenti">' +
    "</select>" +
    '<select class="select topbar-select" id="sint-filtro-tipo-utente" onchange="onSintesiTipoUtenteChange()" title="Filtra per tipo utente" style="min-width:155px">' +
    '<option value="">-- Tutti i tipi --</option>' +
    '<option value="PF"' +
    (_sintesiTipoUtenteFiltro === "PF" ? " selected" : "") +
    ">👤 PF – Persona Fisica</option>" +
    '<option value="SP"' +
    (_sintesiTipoUtenteFiltro === "SP" ? " selected" : "") +
    ">🤝 SP – Soc. Persone</option>" +
    '<option value="SC"' +
    (_sintesiTipoUtenteFiltro === "SC" ? " selected" : "") +
    ">🏢 SC – Soc. Capitali</option>" +
    '<option value="ASS"' +
    (_sintesiTipoUtenteFiltro === "ASS" ? " selected" : "") +
    ">🏛️ ASS – Associazione</option>" +
    "</select>" +
    '<button class="btn btn-sm btn-primary" onclick="resetSintesiFiltri()" title="Azzera tutti i filtri" style="font-size:13px">⟳ Tutti</button>' +
    '<button class="btn btn-sm btn-stampa-completa" onclick="stampaSintesiCompleta()" title="Stampa lista completa con TUTTI gli adempimenti per TUTTI i clienti" style="font-size:13px;background:var(--accent);color:#fff;border-color:var(--accent)">🖨️ Stampa</button>';

  if (typeof initSearchableSelect === "function") {
    setTimeout(function () {
      initSearchableSelect("sint-filtro-cliente");
    }, 50);
  }

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

function onSintesiTipoUtenteChange() {
  var sel = document.getElementById("sint-filtro-tipo-utente");
  _sintesiTipoUtenteFiltro = sel ? sel.value || null : null;
  renderSintesiTabella();
}
window.onSintesiTipoUtenteChange = onSintesiTipoUtenteChange;

function applySintesiFiltriAdp() {
  renderSintesiTabella();
}
window.applySintesiFiltriAdp = applySintesiFiltriAdp;

function changeAnnoSintesi(d) {
  state.anno += d;
  var yearNums = document.querySelectorAll(".year-num");
  for (var i = 0; i < yearNums.length; i++)
    yearNums[i].textContent = state.anno;
  state.sintesiActiveCellKey = null;
  _sintesiCache = {
    clienti: null,
    adempimenti: null,
    sintesiData: null,
    lookup: null,
    statiClienti: null,
  };
  if (typeof socket !== "undefined") {
    socket.emit("get:clienti", { anno: state.anno });
    socket.once("res:clienti", function (d) {
      if (d.success) {
        state.clienti = d.data;
        _sintesiCache.clienti = d.data;
        _renderSintesiTopbar();
        loadSintesi();
      }
    });
  } else {
    loadSintesi();
  }
}

// ═══════════════════════════════════════════════════════════════
// CARICAMENTO DATI
// ═══════════════════════════════════════════════════════════════

function loadSintesi() {
  if (!state.clienti || state.clienti.length === 0) {
    socket.emit("get:clienti", { anno: state.anno });
    socket.once("res:clienti", function (d) {
      if (d.success) {
        state.clienti = d.data;
        _sintesiCache.clienti = d.data;
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
        _sintesiCache.adempimenti = d.data;
        _popolaSintesiAdpSelect();
        if (state.page === "sintesi") renderSintesiTabella();
      }
    });
  }
  socket.emit("get:sintesi", { anno: state.anno });

  socket.once("res:sintesi", function (data) {
    if (data.success) {
      state.sintesiData = data.data;
      _sintesiCache.sintesiData = data.data;
      _sintesiCache.lookup = null;
      _sintesiCache.statiClienti = null;
      if (state.page === "sintesi") renderSintesiTabella();
    }
  });
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
// FILTRI
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
  _sintesiTipoUtenteFiltro = null;
  var tipoSel = document.getElementById("sint-filtro-tipo-utente");
  if (tipoSel) tipoSel.value = "";
  _sintesiStatoFiltri = {
    done: false,
    partial: false,
    todo: false,
    na: false,
  };
  state.sintesiActiveCellKey = null;
  renderSintesiTabella();
}

// ═══════════════════════════════════════════════════════════════
// FILTRO PER STATO CELLA - NASCONDE LE CELLE NON CORRISPONDENTI
// ═══════════════════════════════════════════════════════════════

function toggleSintesiStatoFiltro(kind) {
  _sintesiStatoFiltri[kind] = !_sintesiStatoFiltri[kind];
  renderSintesiTabella();
}
window.toggleSintesiStatoFiltro = toggleSintesiStatoFiltro;

function resetSintesiStatoFiltro() {
  _sintesiStatoFiltri = {
    done: false,
    partial: false,
    todo: false,
    na: false,
  };
  renderSintesiTabella();
}
window.resetSintesiStatoFiltro = resetSintesiStatoFiltro;

function _sintesiStatoFiltriAttivi() {
  return Object.keys(_sintesiStatoFiltri).filter(function (k) {
    return _sintesiStatoFiltri[k];
  });
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
// RENDER TABELLA PRINCIPALE - NASCONDE LE CELLE NON FILTRATE
// ═══════════════════════════════════════════════════════════════

function renderSintesiTabella() {
  if (state.page !== "sintesi") return;
  var container = document.getElementById("content");
  if (!container) return;

  if (!state.clienti || !state.adempimenti || !state.sintesiData) {
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

  // ─── Build lookup ─────────────────────────────────────────────
  var lookup = {};
  (state.sintesiData || []).forEach(function (r) {
    var k = r.cliente_id + "|" + r.id_adempimento;
    if (!lookup[k]) lookup[k] = [];
    lookup[k].push(r);
  });

  // ─── Righe (clienti) ──────────────────────────────────────────
  var searchTerm = (getSharedClienteSearch() || "").toLowerCase();
  var clienti = (state.clienti || []).filter(function (c) {
    if (c.attivo === 0 || c.attivo === "0" || c.attivo === false) return false;
    if (_sintesiClienteFiltro && c.id !== _sintesiClienteFiltro) return false;
    if (
      _sintesiTipoUtenteFiltro &&
      c.tipologia_codice !== _sintesiTipoUtenteFiltro
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

  // ─── Calcola stato per ogni cliente+adempimento ──────────────
  var statiClienti = {};
  var stats = { done: 0, partial: 0, todo: 0, na: 0 };

  clienti.forEach(function (c) {
    statiClienti[c.id] = {};
    columns.forEach(function (a) {
      var key = c.id + "|" + a.id;
      var st = _sintesiStatoCella(lookup[key] || []);
      statiClienti[c.id][a.id] = st;
      stats[st.kind] = (stats[st.kind] || 0) + 1;
    });
  });

  // ─── FILTRO STATO: mostra clienti con ALMENO una cella corrispondente ──
  var statoFiltriAttivi = _sintesiStatoFiltriAttivi();
  var clientiVisibili = clienti;

  if (statoFiltriAttivi.length > 0) {
    clientiVisibili = clienti.filter(function (c) {
      for (var j = 0; j < columns.length; j++) {
        var a = columns[j];
        var st = statiClienti[c.id][a.id];
        if (st && statoFiltriAttivi.indexOf(st.kind) !== -1) {
          return true;
        }
      }
      return false;
    });
  }

  // ─── Calcola statistiche ──────────────────────────────────────
  var doneCells = stats.done || 0;
  var naCells = stats.na || 0;
  var partialCells = stats.partial || 0;
  var todoCells = stats.todo || 0;

  var baseCalc = doneCells + partialCells + todoCells;
  var percCompletato =
    baseCalc > 0 ? Math.round((doneCells / baseCalc) * 100) : 0;

  var clientiCountLabel =
    statoFiltriAttivi.length > 0 && clientiVisibili.length !== clienti.length
      ? clientiVisibili.length + " di " + clienti.length
      : String(clienti.length);
  var clientiCountUnit = clienti.length === 1 ? "e" : "i";

  // ─── Header ────────────────────────────────────────────────────
  function _sintStatBoxHtml(kind, count, color, iconaLabel) {
    var active = _sintesiStatoFiltri[kind] || false;
    return (
      '<button type="button" class="gpc-stat-btn' +
      (active ? " active" : "") +
      '" onclick="toggleSintesiStatoFiltro(\'' +
      kind +
      '\')" title="Filtra: mostra solo clienti con almeno un adempimento ' +
      escAttr(iconaLabel.toLowerCase()) +
      '" style="cursor:pointer;">' +
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
    '<div style="font-size:11px;color:var(--t3);margin-top:8px">📖 Filtri stato: mostrano le celle che corrispondono allo stato selezionato. Le altre celle sono nascoste.</div>' +
    "</div>";

  // ─── Legenda ───────────────────────────────────────────────────
  function _sintLegendItemHtml(kind, label) {
    var active = _sintesiStatoFiltri[kind] || false;
    return (
      '<button type="button" class="sint-legend-item' +
      (active ? " active" : "") +
      '" onclick="toggleSintesiStatoFiltro(\'' +
      kind +
      '\')" title="Filtra: mostra solo clienti con almeno un adempimento ' +
      escAttr(label.toLowerCase()) +
      '" style="cursor:pointer;">' +
      '<span class="sint-legend-dot ' +
      kind +
      '"></span>' +
      label +
      "</button>"
    );
  }

  var legend =
    '<div class="sint-legend">' +
    _sintLegendItemHtml("done", "✅ Completato per tutti i periodi") +
    _sintLegendItemHtml("partial", "🔄 Parzialmente completato") +
    _sintLegendItemHtml("todo", "⭕ Da fare / non iniziato") +
    _sintLegendItemHtml("na", "➖ N/A — non applicato") +
    (statoFiltriAttivi.length > 0
      ? '<button type="button" class="sint-legend-clear" onclick="resetSintesiStatoFiltro()">✕ Rimuovi filtro stato</button>'
      : "") +
    '<span style="color:var(--t3);font-size:11px;">· Clicca per filtrare le celle</span>' +
    "</div>";

  // ─── Tabella ───────────────────────────────────────────────────
  var bodyHtml = "";
  if (!clientiVisibili.length || !columns.length) {
    var msgVuoto = !columns.length
      ? "Nessun adempimento selezionato — usa il filtro in alto o clicca ⟳ Tutti"
      : statoFiltriAttivi.length > 0
        ? "Nessun cliente ha adempimenti nello stato selezionato per " +
          state.anno
        : "Nessun cliente corrisponde ai filtri attivi per " + state.anno;
    bodyHtml =
      '<div class="empty">' +
      '<div class="empty-icon">🧮</div>' +
      '<p style="font-size:15px">' +
      msgVuoto +
      "</p>" +
      '<button class="btn btn-sm btn-primary" onclick="resetSintesiFiltri()" style="margin-top:12px">⟳ Rimuovi filtri</button>' +
      (statoFiltriAttivi.length > 0
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
        var st = statiClienti[c.id][a.id] || { kind: "na", label: "N/A" };
        var isActive = state.sintesiActiveCellKey === key;

        // Se ci sono filtri attivi, nascondi le celle che NON corrispondono
        var isHidden =
          statoFiltriAttivi.length > 0 &&
          statoFiltriAttivi.indexOf(st.kind) === -1;

        var periodi = lookup[key] || [];
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

        var cellClass = "sint-cell sint-cell-" + st.kind;
        if (isActive) cellClass += " active";
        if (isHidden) cellClass += " sint-cell-hidden";

        cellsHtml +=
          '<td class="sint-td"><button type="button" class="' +
          cellClass +
          '" data-key="' +
          key +
          '" onclick="sintesiToggleDettaglio(\'' +
          key +
          "'," +
          c.id +
          "," +
          a.id +
          ')"' +
          ' title="' +
          escAttr(c.nome + " · " + a.nome + " — " + st.label) +
          (isHidden ? " (nascosto dal filtro)" : "") +
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
    headerCard + legend + bodyHtml + '<div id="sint-dettaglio"></div>';

  if (state.sintesiActiveCellKey) {
    var parts = state.sintesiActiveCellKey.split("|");
    _renderSintesiDettaglio(parseInt(parts[0]), parseInt(parts[1]));
  }
}

// ═══════════════════════════════════════════════════════════════
// DETTAGLIO PERIODI
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
// STAMPA LISTA COMPLETA - RISPETTA TUTTI I FILTRI
// ═══════════════════════════════════════════════════════════════

function stampaSintesiCompleta() {
  var data = _sintesiCache;

  if (!data.sintesiData || data.sintesiData.length === 0) {
    showNotif("⏳ Caricamento dati in corso...", "info");
    socket.emit("get:sintesi", { anno: state.anno });
    socket.once("res:sintesi", function (res) {
      if (res.success) {
        state.sintesiData = res.data;
        _sintesiCache.sintesiData = res.data;
        _sintesiCache.lookup = null;
        _generaFinestraStampa();
      }
    });
    return;
  }
  _generaFinestraStampa();
}

function _generaFinestraStampa() {
  // ---- 1. Preleva tutti i filtri dalla UI ----
  var adpSel = document.getElementById("sint-filtro-adp");
  var selectedAdpIds = adpSel
    ? Array.from(adpSel.selectedOptions || []).map(function (o) {
        return parseInt(o.value);
      })
    : [];

  var clienteSel = document.getElementById("sint-filtro-cliente");
  var filtroClienteId =
    clienteSel && clienteSel.value ? parseInt(clienteSel.value) : null;

  var tipoUtenteSel = document.getElementById("sint-filtro-tipo-utente");
  var filtroTipoUtente = tipoUtenteSel ? tipoUtenteSel.value || null : null;

  var searchTerm = (getSharedClienteSearch() || "").toLowerCase();

  // ---- 2. Filtra clienti (attivi, search, cliente specifico, tipo utente) ----
  var clienti = (state.clienti || []).filter(function (c) {
    if (c.attivo === 0 || c.attivo === "0" || c.attivo === false) return false;
    if (filtroClienteId && c.id !== filtroClienteId) return false;
    if (filtroTipoUtente && c.tipologia_codice !== filtroTipoUtente)
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
  clienti.sort(function (a, b) {
    return (a.nome || "").localeCompare(b.nome || "", "it", {
      sensitivity: "base",
    });
  });

  // ---- 3. Filtra adempimenti (anno e selezione) ----
  var allDefs = (state.adempimenti || []).filter(function (a) {
    return (
      !a.anno_validita || parseInt(a.anno_validita) === parseInt(state.anno)
    );
  });
  var columns = selectedAdpIds.length
    ? allDefs.filter(function (a) {
        return selectedAdpIds.indexOf(a.id) !== -1;
      })
    : allDefs;
  columns.sort(function (a, b) {
    return (a.nome || "").localeCompare(b.nome || "", "it", {
      sensitivity: "base",
    });
  });

  // ---- 4. Build lookup periodi ----
  var lookup = {};
  (state.sintesiData || []).forEach(function (r) {
    var k = r.cliente_id + "|" + r.id_adempimento;
    if (!lookup[k]) lookup[k] = [];
    lookup[k].push(r);
  });

  // ---- 5. Stato filtri cella ----
  var statoFiltriAttivi = _sintesiStatoFiltriAttivi();

  // ---- 6. Per ogni cliente, costruisci la lista di adempimenti da mostrare ----
  var clientiDaStampare = [];
  clienti.forEach(function (cliente) {
    var adempimentiCliente = [];
    columns.forEach(function (adp) {
      var key = cliente.id + "|" + adp.id;
      var periodi = lookup[key] || [];
      var st = _sintesiStatoCella(periodi);
      // Se ci sono filtri stato attivi, salta le celle che non corrispondono
      if (
        statoFiltriAttivi.length > 0 &&
        statoFiltriAttivi.indexOf(st.kind) === -1
      ) {
        return; // cella nascosta
      }
      // Se il cliente non ha periodi per questo adempimento e lo stato è "na", lo mostriamo comunque come N/A
      adempimentiCliente.push({
        adp: adp,
        periodi: periodi,
        stato: st,
      });
    });
    if (adempimentiCliente.length > 0) {
      clientiDaStampare.push({
        cliente: cliente,
        adempimenti: adempimentiCliente,
      });
    }
  });

  // ---- 7. Genera HTML per la stampa ----
  var htmlParts = [];
  htmlParts.push(
    '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Sintesi Adempimenti ' +
      state.anno +
      "</title><style>",
  );
  htmlParts.push(
    "body{font-family:Arial,sans-serif;padding:20px;max-width:1200px;margin:0 auto}",
  );
  htmlParts.push(
    ".header{text-align:center;margin-bottom:30px;border-bottom:2px solid #333;padding-bottom:15px}",
  );
  htmlParts.push(".header h1{font-size:24px;margin:0;color:#333}");
  htmlParts.push(".header p{font-size:14px;color:#666;margin:5px 0 0}");
  htmlParts.push(".header .date{font-size:12px;color:#999;margin:2px 0 0}");
  htmlParts.push(
    ".cliente-card{margin-bottom:25px;border:1px solid #ddd;border-radius:8px;padding:15px;page-break-inside:avoid;background:#f9f9f9}",
  );
  htmlParts.push(
    ".cliente-header{display:flex;align-items:center;gap:15px;margin-bottom:12px;border-bottom:2px solid #888;padding-bottom:10px;flex-wrap:wrap}",
  );
  htmlParts.push(".cliente-nome{font-size:20px;font-weight:700;color:#333}");
  htmlParts.push(
    ".cliente-tip{font-size:12px;color:#666;background:#eee;padding:2px 10px;border-radius:12px}",
  );
  htmlParts.push(".cliente-cf{font-size:11px;color:#888}");
  htmlParts.push(
    ".adp-row{display:grid;grid-template-columns:180px 1fr;gap:10px;padding:6px 10px;border-radius:4px;background:#fff;border:1px solid #eee;align-items:center;margin-bottom:4px}",
  );
  htmlParts.push(".adp-nome{font-weight:600;font-size:13px;color:#333}");
  htmlParts.push(
    ".adp-codice{font-size:10px;color:#999;font-weight:400;display:block}",
  );
  htmlParts.push(".adp-stato{font-size:13px;font-weight:700;min-width:80px}");
  htmlParts.push(
    ".adp-periodi{display:flex;flex-wrap:wrap;align-items:center;gap:4px}",
  );
  htmlParts.push(
    ".periodo-chip{display:inline-block;margin:1px 2px;padding:1px 6px;border-radius:3px;font-size:10px;font-weight:600}",
  );
  htmlParts.push(".adp-scadenze{font-size:10px;color:#999;margin-left:4px}");
  htmlParts.push(
    ".no-data{padding:10px;text-align:center;color:#999;font-size:13px;background:#fff;border-radius:4px;border:1px dashed #ddd}",
  );
  htmlParts.push(
    ".footer{text-align:center;margin-top:30px;padding-top:15px;border-top:1px solid #ddd;font-size:11px;color:#999}",
  );
  htmlParts.push(".stato-done{color:#2e7d32}");
  htmlParts.push(".stato-partial{color:#f9a825}");
  htmlParts.push(".stato-todo{color:#c62828}");
  htmlParts.push(".stato-na{color:#888}");
  htmlParts.push(".bg-done{background:#e8f5e9;border-color:#a5d6a7}");
  htmlParts.push(".bg-partial{background:#fff8e1;border-color:#ffcc02}");
  htmlParts.push(".bg-todo{background:#ffebee;border-color:#ef9a9a}");
  htmlParts.push(".bg-na{background:#f5f5f5;border-color:#e0e0e0}");
  htmlParts.push("</style></head><body>");

  htmlParts.push(
    '<div class="header"><h1>🧮 Sintesi Adempimenti ' + state.anno + "</h1>",
  );
  htmlParts.push(
    "<p>Lista degli adempimenti visibili con i filtri attuali</p>",
  );
  htmlParts.push(
    '<div class="date">Stampato il ' +
      new Date().toLocaleDateString("it-IT") +
      " alle " +
      new Date().toLocaleTimeString("it-IT") +
      "</div></div>",
  );

  clientiDaStampare.forEach(function (item) {
    var cliente = item.cliente;
    var tipColor =
      cliente.tipologia_colore ||
      (typeof getTipologiaColor === "function"
        ? getTipologiaColor(cliente.tipologia_codice)
        : "#888");

    htmlParts.push('<div class="cliente-card">');
    htmlParts.push(
      '<div class="cliente-header" style="border-bottom-color:' +
        tipColor +
        '">',
    );
    htmlParts.push(
      '<div class="cliente-nome">' + escAttr(cliente.nome) + "</div>",
    );
    htmlParts.push(
      '<div class="cliente-tip">' +
        (cliente.tipologia_codice || "-") +
        "</div>",
    );
    if (cliente.codice_fiscale) {
      htmlParts.push(
        '<div class="cliente-cf">CF: ' + cliente.codice_fiscale + "</div>",
      );
    }
    htmlParts.push("</div>");

    item.adempimenti.forEach(function (adpItem) {
      var adp = adpItem.adp;
      var periodi = adpItem.periodi;
      var st = adpItem.stato;

      var statoIcon =
        st.kind === "done"
          ? "✅"
          : st.kind === "partial"
            ? "🔄"
            : st.kind === "todo"
              ? "⭕"
              : "➖";
      var statoClass = "stato-" + st.kind;
      var bgClass = "bg-" + st.kind;

      var sortedP = periodi.slice().sort(function (a, b) {
        if (a.mese != null && b.mese != null) return a.mese - b.mese;
        if (a.trimestre != null && b.trimestre != null)
          return a.trimestre - b.trimestre;
        if (a.semestre != null && b.semestre != null)
          return a.semestre - b.semestre;
        return 0;
      });

      var periodiDetails = sortedP
        .map(function (p) {
          var pStato = p.stato || "da_fare";
          var pInfo = _SINT_STATO_INFO[pStato] || _SINT_STATO_INFO.da_fare;
          var pLabel =
            typeof getPeriodoLabel === "function" ? getPeriodoLabel(p) : "-";
          return (
            '<span class="periodo-chip" style="background:' +
            pInfo.color +
            "22;border:1px solid " +
            pInfo.color +
            "55;color:" +
            pInfo.color +
            ';">' +
            pInfo.icon +
            " " +
            pLabel +
            "</span>"
          );
        })
        .join("");

      var scadenzaDates = sortedP
        .map(function (p) {
          return p.data_scadenza ? formattaDataItaliana(p.data_scadenza) : null;
        })
        .filter(function (d) {
          return d;
        });

      htmlParts.push('<div class="adp-row ' + bgClass + '">');
      htmlParts.push(
        '<div class="adp-nome">' +
          escAttr(adp.nome) +
          '<span class="adp-codice">' +
          escAttr(adp.codice || "") +
          "</span></div>",
      );
      htmlParts.push('<div><div class="adp-periodi">');
      htmlParts.push(
        '<span class="adp-stato ' +
          statoClass +
          '">' +
          statoIcon +
          " " +
          st.label +
          "</span>",
      );
      if (periodi.length > 0) {
        htmlParts.push(
          '<span style="font-size:11px;color:#888;">' +
            periodi.length +
            " periodi</span>",
        );
      }
      htmlParts.push(periodiDetails);
      if (scadenzaDates.length > 0) {
        htmlParts.push(
          '<span class="adp-scadenze">📅 ' +
            scadenzaDates.join(", ") +
            "</span>",
        );
      }
      htmlParts.push("</div></div></div>");
    });

    htmlParts.push("</div>");
  });

  if (clientiDaStampare.length === 0) {
    htmlParts.push(
      '<div class="no-data" style="text-align:center;padding:30px;">Nessun adempimento da stampare con i filtri correnti.</div>',
    );
  }

  htmlParts.push("</body></html>");

  var html = htmlParts.join("");

  var win = window.open("", "_blank", "width=1100,height=800,scrollbars=yes");
  if (!win) {
    showNotif(
      "⚠️ Il browser ha bloccato la finestra popup. Permetti i popup per questa pagina.",
      "error",
    );
    return;
  }
  win.document.write(html);
  win.document.close();
  win.onload = function () {
    setTimeout(function () {
      win.print();
    }, 300);
  };
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
window.onSintesiTipoUtenteChange = onSintesiTipoUtenteChange;