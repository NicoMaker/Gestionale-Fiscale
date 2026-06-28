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

