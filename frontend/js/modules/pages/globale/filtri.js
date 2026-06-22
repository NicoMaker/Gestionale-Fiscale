// ═══════════════════════════════════════════════════════════════
// GLOBALE-FILTRI.JS — Storage filtri, panel tipologie, funzioni helper,
//                     render pagina principale e select clienti, header
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// GLOBALE.JS — Vista Globale scadenzario tutti i clienti
// ═══════════════════════════════════════════════════════════════

var _globTipFiltroPanelOpen = false;

// ─── CONDIVISIONE STORAGE CON CLIENTI.JS ─────────────────────
function _getGlobStorageKeys() {
  return {
    FILTRI: "gestionale_filtri_tipologie",
    NESSUNO: "gestionale_filtri_nessuno",
    PANNELLO_APERTO: "gestionale_filtri_pannello_aperto",
  };
}

function _salvaFiltriGlobaleSuStorage() {
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
      pannelloAperto: _globTipFiltroPanelOpen,
    };
    localStorage.setItem(
      _getGlobStorageKeys().FILTRI,
      JSON.stringify(filtriData),
    );
  } catch (e) {
    console.warn("[globale.js] Errore salvataggio filtri:", e);
  }
}

function _caricaFiltriGlobaleDaStorage() {
  try {
    const saved = localStorage.getItem(_getGlobStorageKeys().FILTRI);
    if (saved) {
      const filtriData = JSON.parse(saved);
      _globTipFiltroPanelOpen = filtriData.pannelloAperto || false;
      return true;
    }
  } catch (e) {
    console.warn("[globale.js] Errore caricamento filtri:", e);
  }
  return false;
}

function calcolaGlobaleStats(data) {
  var totale = data.length;
  var comp = 0,
    daF = 0,
    inC = 0;
  for (var i = 0; i < data.length; i++) {
    var r = data[i];
    if (r.stato === "completato") comp++;
    else if (r.stato === "da_fare") daF++;
    else if (r.stato === "in_corso") inC++;
  }
  var clientiSet = {},
    adpSet = {};
  for (var j = 0; j < data.length; j++) {
    var row = data[j];
    clientiSet[row.cliente_id] = true;
    adpSet[row.adempimento_nome] = true;
  }
  return {
    totale: totale,
    comp: comp,
    daF: daF,
    inC: inC,
    clienti: Object.keys(clientiSet).length,
    adempimenti: Object.keys(adpSet),
  };
}

function _globCfg() {
  if (window.TIPOLOGIE_CONFIG) return window.TIPOLOGIE_CONFIG;
  if (!window._globCfgFetchStarted) {
    window._globCfgFetchStarted = true;
    fetch("json/tipologie-data.json")
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        window.TIPOLOGIE_CONFIG = data;
      })
      .catch(function (e) {
        console.error("[globale.js] fetch tipologie-data.json:", e);
      });
  }
  return {};
}

function _getActiveFiltroKeys() {
  if (typeof window._activeFiltroKeys !== "undefined")
    return window._activeFiltroKeys;
  if (typeof _activeFiltroKeys !== "undefined") return _activeFiltroKeys;
  return new Set();
}

function _isManualNessuno() {
  return typeof window._filtroManualeNessuno !== "undefined"
    ? window._filtroManualeNessuno
    : false;
}

function toggleGlobTipFiltroPanel(event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  _globTipFiltroPanelOpen = !_globTipFiltroPanelOpen;
  _salvaFiltriGlobaleSuStorage(); // Salva stato pannello
  _aggiornaGlobPanelVisibility();
}

function closeGlobTipFiltroPanel(event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  _globTipFiltroPanelOpen = false;
  _salvaFiltriGlobaleSuStorage(); // Salva stato pannello
  _aggiornaGlobPanelVisibility();
}

function _aggiornaGlobPanelVisibility() {
  var container = document.getElementById("glob-tip-filtro-container");
  if (!container) return;
  container.style.display = _globTipFiltroPanelOpen ? "block" : "none";
  // Impedisce che i click dentro il pannello salgano all'header e lo chiudano
  container.onclick = function (e) {
    e.stopPropagation();
  };
  var btn = document.getElementById("glob-tip-filtro-toggle-btn");
  if (btn) {
    btn.innerHTML = _globTipFiltroPanelOpen
      ? '<button class="btn btn-xs btn-secondary" onclick="closeGlobTipFiltroPanel(event)">✕ Chiudi</button>'
      : '<button class="btn btn-xs btn-secondary" onclick="toggleGlobTipFiltroPanel(event)">▼ Espandi</button>';
  }
}

function _aggiornaGlobTipFiltroCounter() {
  var badge = document.getElementById("glob-tip-filtro-count");
  if (!badge) return;
  var keys = _getActiveFiltroKeys();
  var allKeys =
    typeof window._getAllKeys === "function" ? window._getAllKeys() : [];
  var isNone = _isManualNessuno() || keys.size === 0;
  var isAll = !isNone && keys.size === allKeys.length;
  if (isNone) {
    badge.textContent = "0";
    badge.style.display = "inline-flex";
    badge.style.background = "var(--red)";
  } else if (isAll) {
    badge.textContent = "";
    badge.style.display = "none";
  } else {
    badge.textContent = keys.size;
    badge.style.display = "inline-flex";
    badge.style.background = "var(--accent)";
  }
}

function _refreshGlobTipFiltroPanel() {
  var container = document.getElementById("glob-tip-filtro-container");
  if (!container || !_globTipFiltroPanelOpen) return;
  if (typeof renderTipologieFiltroPanel === "function") {
    var tmp = document.createElement("div");
    tmp.innerHTML = renderTipologieFiltroPanel();
    container.innerHTML = "";
    container.appendChild(tmp.firstChild);
  }
  container.style.display = "block";
  _aggiornaGlobTipFiltroCounter();
}

function clientePassaFiltroTipologie(c) {
  var activeFiltroKeys = _getActiveFiltroKeys();
  var isNone = _isManualNessuno();
  var allKeys =
    typeof window._getAllKeys === "function" ? window._getAllKeys() : [];

  // Se non ci sono filtri o tutti sono selezionati, mostra tutto
  if (
    activeFiltroKeys.size === 0 ||
    (allKeys.length > 0 && activeFiltroKeys.size === allKeys.length)
  ) {
    return true;
  }

  // Se è stato selezionato "Nessuno" manualmente, nascondi tutto
  if (isNone) {
    return false;
  }
  var tipCod = c.tipologia_codice || "";
  var col2DbToLabel = window.COL2_DB_TO_LABEL || {
    privato: "Privato",
    ditta: "Ditta Individuale",
    socio: "Socio",
    professionista: "Professionista",
  };
  var col3DbToLabel = window.COL3_DB_TO_LABEL || {
    ordinario: "Ordinario",
    ordinaria: "Ordinaria",
    semplificato: "Semplificato",
    semplificata: "Semplificata",
    forfettario: "Forfettario",
  };
  var col2Raw = (c.col2 || "").toLowerCase();
  var col3Raw = (c.col3 || "").toLowerCase();
  var col2Display = col2DbToLabel[col2Raw] || "";
  var col3Display = col3DbToLabel[col3Raw] || "";
  var per = c.periodicita || "";
  var keysArray = Array.from(activeFiltroKeys);
  for (var i = 0; i < keysArray.length; i++) {
    var key = keysArray[i];
    var parts = key.split("|");
    var kTip = parts[0];
    var kCol2 = parts[1] || "";
    var kCol3 = parts[2] || "";
    var kPer = parts[3] || "";
    if (kTip !== tipCod) continue;
    if (kCol2 && kCol2 !== col2Display && kCol2.toLowerCase() !== col2Raw)
      continue;
    if (kCol3 && kCol3 !== col3Display && kCol3.toLowerCase() !== col3Raw)
      continue;
    if (kPer && kPer !== per) continue;
    return true;
  }
  return false;
}

function clientePassaFiltroStato(periodi, filtroClienteStato) {
  if (!filtroClienteStato) return true;
  var hasInCorso = false,
    hasDaFare = false,
    hasCompletato = false,
    hasNA = false;
  var tuttiComp = true,
    nessunAvanz = true;
  for (var i = 0; i < periodi.length; i++) {
    var stato = periodi[i].stato;
    if (stato === "in_corso") hasInCorso = true;
    if (stato === "da_fare") hasDaFare = true;
    if (stato === "completato") hasCompletato = true;
    if (stato === "n_a") hasNA = true;
    if (stato !== "completato" && stato !== "n_a") tuttiComp = false;
    if (stato !== "da_fare") nessunAvanz = false;
  }
  switch (filtroClienteStato) {
    case "con_in_corso":
      return hasInCorso;
    case "senza_in_corso":
      return !hasInCorso;
    case "tutti_completati":
      return tuttiComp;
    case "con_da_fare":
      return hasDaFare;
    case "solo_da_fare":
      return nessunAvanz;
    case "non_completati":
      return !tuttiComp;
    case "con_na":
      return hasNA;
    default:
      return true;
  }
}

function _getCol2DisplayMap() {
  var cfg = _globCfg();
  var map = {};
  var percorsi = cfg.percorsi || {};
  var keys = Object.keys(percorsi);
  for (var k = 0; k < keys.length; k++) {
    var arr = percorsi[keys[k]];
    for (var i = 0; i < arr.length; i++) {
      var p = arr[i];
      if (!p.col2Label) continue;
      var db =
        p.col2Label === "Ditta Individuale"
          ? "ditta"
          : p.col2Label.toLowerCase();
      var short =
        p.col2Label === "Ditta Individuale"
          ? "Ditta Ind."
          : p.col2Label === "Professionista"
            ? "Prof."
            : p.col2Label;
      map[db] = short;
    }
  }
  return map;
}

function _getCol3DisplayMap() {
  var cfg = _globCfg();
  var map = {};
  var percorsi = cfg.percorsi || {};
  var keys = Object.keys(percorsi);
  for (var k = 0; k < keys.length; k++) {
    var arr = percorsi[keys[k]];
    for (var i = 0; i < arr.length; i++) {
      var p = arr[i];
      if (!p.col3Label) continue;
      var db = p.col3Label.toLowerCase();
      var short =
        p.col3Label.indexOf("Ordin") === 0
          ? "Ord."
          : p.col3Label.indexOf("Sempl") === 0
            ? "Sempl."
            : p.col3Label === "Forfettario"
              ? "Forf."
              : p.col3Label;
      map[db] = short;
    }
  }
  return map;
}

function _renderGlobaleClienteClassBadges(c) {
  var cfg = _globCfg();
  var col2Map = _getCol2DisplayMap();
  var col3Map = _getCol3DisplayMap();
  var tipColor = c.tipologia_colore || getTipologiaColor(c.tipologia_codice);
  var perAll = (cfg.periodicitaIva || []).concat(cfg.periodicitaAnnuale || []);
  var badges =
    '<span class="badge b-' +
    (c.tipologia_codice || "").toLowerCase() +
    '" style="font-size:11px" title="' +
    ((TIPOLOGIE_INFO[c.tipologia_codice] || {}).desc || "") +
    '">' +
    (c.tipologia_codice || "-") +
    "</span>";
  if (c.col2)
    badges +=
      '<span class="badge-info" style="font-size:10px">' +
      (col2Map[c.col2] || c.col2) +
      "</span>";
  if (c.col3)
    badges +=
      '<span class="badge-info" style="font-size:10px">' +
      (col3Map[c.col3] || c.col3) +
      "</span>";
  if (c.periodicita && c.col2 !== "privato") {
    var perObj = null;
    for (var i = 0; i < perAll.length; i++) {
      if (perAll[i].value === c.periodicita) {
        perObj = perAll[i];
        break;
      }
    }
    badges +=
      '<span class="badge-per" style="font-size:10px">' +
      (perObj ? perObj.label : c.periodicita) +
      "</span>";
  }
  return badges;
}

function escapeHtmlForSelect(str) {
  if (!str) return str;
  return str.replace(/[&<>]/g, function (m) {
    if (m === "&") return "&amp;";
    if (m === "<") return "&lt;";
    if (m === ">") return "&gt;";
    return m;
  });
}

// ═══════════════════════════════════════════════════════════════
// RENDER PAGINA PRINCIPALE
// ═══════════════════════════════════════════════════════════════

function renderGlobalePage() {
  var activeFiltroKeys = _getActiveFiltroKeys();
  if (
    activeFiltroKeys.size === 0 &&
    !_isManualNessuno() &&
    typeof initializeTipologieFilter === "function"
  ) {
    initializeTipologieFilter();
  }

  // Carica stato pannello da storage
  _caricaFiltriGlobaleDaStorage();

  // Event listener per sincronizzazione filtri solo se siamo nella vista globale
  window.addEventListener("filtriTipologieAggiornati", function (e) {
    // Verifica che siamo effettivamente nella vista globale prima di aggiornare
    if (document.getElementById("glob-tip-filtro-container")) {
      // NON sovrascrivere _globTipFiltroPanelOpen con pannelloAperto di clienti.js:
      // i due pannelli sono indipendenti e hanno stati separati.
      // Aggiorna solo il contatore, non fare refresh completo del pannello
      _aggiornaGlobTipFiltroCounter();
      if (state.scadGlobale) renderGlobaleTabella(state.scadGlobale);
    }
  });

  if (typeof state.globaleSelectedCliente === "undefined")
    state.globaleSelectedCliente = "";

  document.getElementById("topbar-actions").innerHTML =
    '<div class="year-sel">' +
    '<button onclick="changeAnnoGlobale(-1)" title="Anno precedente">&#9664;</button>' +
    '<span class="year-num">' +
    state.anno +
    "</span>" +
    '<button onclick="changeAnnoGlobale(1)" title="Anno successivo">&#9654;</button>' +
    "</div>" +
    '<div class="search-wrap" style="width:200px"><span class="search-icon">🔍</span><input class="input" id="glob-search-cliente" placeholder="Cerca cliente…" value="' +
    escAttr(getSharedClienteSearch()) +
    '" oninput="setSharedClienteSearch(this.value);applyGlobaleFiltriLocali()" style="font-size:13px"></div>' +
    '<select class="select topbar-select" id="glob-sel-cliente" onchange="onGlobaleClienteChange()" title="Seleziona il cliente" style="min-width:200px;max-width:260px">' +
    '<option value="">-- Seleziona Cliente --</option>' +
    "</select>" +
    '<select class="select" id="glob-filtro-adp" multiple style="width:210px;font-size:13px" onchange="applyGlobaleFiltri()" title="Filtra per uno o più tipi di adempimento" data-placeholder="📋 Tutti adempimenti">' +
    "</select>" +
    '<select class="select" id="glob-filtro-stato" style="width:155px;font-size:13px" onchange="applyGlobaleFiltri()" title="Filtra per stato adempimento">' +
    '<option value="">🔵 Tutti stati</option>' +
    '<option value="da_fare">⭕ Da fare</option>' +
    '<option value="in_corso">🔄 In corso</option>' +
    '<option value="completato">✅ Completato</option>' +
    '<option value="n_a">➖ N/A</option>' +
    "</select>" +
    '<button class="btn btn-sm btn-primary" onclick="resetGlobaleFiltri()" title="Azzera tutti i filtri" style="font-size:13px">⟳ Tutti</button>' +
    '<button class="btn btn-print btn-sm" onclick="window.print()" style="font-size:13px">🖨️ Stampa</button>';

  setTimeout(function () {
    initSearchableMultiSelect("glob-filtro-adp");
    initSearchableSelect("glob-sel-cliente");
    populateGlobaleClienti();
    var preFiltroMulti =
      state.globalePreFiltroAdpMulti && state.globalePreFiltroAdpMulti.length
        ? state.globalePreFiltroAdpMulti
        : state.globalePreFiltroAdp && state.globalePreFiltroAdp !== ""
          ? [state.globalePreFiltroAdp]
          : null;
    if (preFiltroMulti) {
      var adpSel = document.getElementById("glob-filtro-adp");
      if (adpSel) {
        setTimeout(function () {
          var valuesSet = {};
          for (var i = 0; i < preFiltroMulti.length; i++)
            valuesSet[preFiltroMulti[i]] = true;
          Array.from(adpSel.options).forEach(function (o) {
            o.selected = !!valuesSet[o.value];
          });
          if (adpSel._ssRefresh) adpSel._ssRefresh();
          var filtri = { adempimento: preFiltroMulti.slice() };
          socket.emit("get:scadenzario_globale", {
            anno: state.anno,
            filtri: filtri,
          });
          state.globalePreFiltroAdpMulti = null;
        }, 150);
      }
    } else {
      loadGlobale();
    }
  }, 50);
}

function changeAnnoGlobale(d) {
  state.anno += d;
  var yearNums = document.querySelectorAll(".year-num");
  for (var i = 0; i < yearNums.length; i++)
    yearNums[i].textContent = state.anno;
  loadGlobale();
}

function populateGlobaleClienti() {
  if (!state.clienti || state.clienti.length === 0) {
    socket.emit("get:clienti", { anno: state.anno });
    socket.once("res:clienti", function (data) {
      if (data.success) {
        state.clienti = data.data;
        renderGlobaleClientiSelect();
      }
    });
  } else {
    renderGlobaleClientiSelect();
  }
}

function renderGlobaleClientiSelect() {
  var clienteSel = document.getElementById("glob-sel-cliente");
  if (!clienteSel) return;
  var currentValue = state.globaleSelectedCliente || "";
  var opts = (state.clienti || [])
    .map(function (c) {
      return (
        '<option value="' +
        c.id +
        '"' +
        (String(c.id) === String(currentValue) ? " selected" : "") +
        ">[" +
        (c.tipologia_codice || "?") +
        "] " +
        c.nome +
        "</option>"
      );
    })
    .join("");
  clienteSel.innerHTML =
    '<option value="">-- Seleziona Cliente --</option>' + opts;
  if (currentValue) clienteSel.value = currentValue;
  if (!clienteSel.dataset.ssinit) {
    initSearchableSelect("glob-sel-cliente");
  } else if (clienteSel._ssRefresh) {
    clienteSel._ssRefresh();
  }
}

function onGlobaleClienteChange() {
  var clienteSel = document.getElementById("glob-sel-cliente");
  var clienteId = clienteSel ? clienteSel.value : "";
  state.globaleSelectedCliente = clienteId;
  applyGlobaleFiltri();
}

function loadGlobale() {
  var filtri = {};
  var adpSel = document.getElementById("glob-filtro-adp");
  var statoSel = document.getElementById("glob-filtro-stato");
  var clienteSearch = document.getElementById("glob-search-cliente");
  var adpValori = adpSel
    ? Array.from(adpSel.selectedOptions || []).map(function (o) {
        return o.value;
      })
    : [];
  if (adpValori.length) filtri.adempimento = adpValori;
  if (statoSel && statoSel.value) filtri.stato = statoSel.value;
  if (clienteSearch && clienteSearch.value) filtri.search = clienteSearch.value;
  if (state.globaleSelectedCliente && state.globaleSelectedCliente !== "")
    filtri.cliente_id = parseInt(state.globaleSelectedCliente);
  if (state.globalePreFiltroAdp && !filtri.adempimento)
    filtri.adempimento = [state.globalePreFiltroAdp];
  socket.emit("get:scadenzario_globale", { anno: state.anno, filtri: filtri });
}

var applyGlobaleFiltriDebounced = debounce(function () {
  state.globalePreFiltroAdp = "";
  loadGlobale();
}, 300);
function applyGlobaleFiltri() {
  state.globalePreFiltroAdp = "";
  loadGlobale();
}
function applyGlobaleFiltriLocali() {
  if (state.scadGlobale) renderGlobaleTabella(state.scadGlobale);
}

function resetGlobaleFiltri() {
  state.globalePreFiltroAdp = "";
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

    // ⭐ Usa l'elenco COMPLETO degli adempimenti definiti (state.adempimenti),
    // non quello derivato dai dati già filtrati (st.adempimenti). Altrimenti
    // selezionando una sola voce, le altre sparirebbero dalla tendina stessa.
    var adpList;
    if (state.adempimenti && state.adempimenti.length) {
      var nomiSet = {};
      var _annoGlob = state.anno || new Date().getFullYear();
      state.adempimenti.forEach(function (a) {
        if (!a || !a.nome) return;
        // Escludi adempimenti validi solo per un anno diverso da quello corrente
        if (a.anno_validita != null && Number(a.anno_validita) !== _annoGlob) return;
        nomiSet[a.nome] = true;
      });
      // Aggiunge eventuali nomi presenti solo nei dati filtrati correnti
      // (es. adempimenti storici non più "attivi" ma con record esistenti)
      Array.from(st.adempimenti || []).forEach(function (n) {
        nomiSet[n] = true;
      });
      adpList = Object.keys(nomiSet);
    } else {
      adpList = Array.from(st.adempimenti || []);
      // Lista completa non ancora disponibile: la richiediamo ora,
      // così al prossimo aggiornamento la tendina mostrerà tutte le voci.
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
    state.globalePreFiltroAdp = "";
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
  // La navigazione prev/next isola un singolo adempimento alla volta
  Array.from(adpSel.options).forEach(function (o) {
    o.selected = o.value === lista[newIdx];
  });
  if (adpSel._ssRefresh) adpSel._ssRefresh();
  applyGlobaleFiltri();
}

// ═══════════════════════════════════════════════════════════════
// HELPER INTERNO: costruisce l'HTML dei periodi ordinati per un cliente
// Ordine: data_scadenza ASC (29/04 prima di 30/05), parità → alfabetico
// ═══════════════════════════════════════════════════════════════

function _buildPeriodiOrdinatiHtml(periodi) {
  // ⭐ ORDINA i periodi: data_scadenza ASC (29/04 prima di 30/05), parità → alfabetico
  var periodiOrdinati = periodi.slice().sort(function (a, b) {
    // Ordine ASC: data più vicina (es. 29/04) prima di data più lontana (es. 30/05)
    if (a.data_scadenza && b.data_scadenza) {
      var dateA = new Date(a.data_scadenza);
      var dateB = new Date(b.data_scadenza);
      if (dateA - dateB !== 0) return dateA - dateB;
      // Parità di data → alfabetico per nome adempimento
      return a.adempimento_nome.localeCompare(b.adempimento_nome, "it", {
        sensitivity: "base",
      });
    }
    // Chi ha data va prima di chi non ha data
    if (a.data_scadenza) return -1;
    if (b.data_scadenza) return 1;
    // Se nessuna data → alfabetico
    return a.adempimento_nome.localeCompare(b.adempimento_nome, "it", {
      sensitivity: "base",
    });
  });

  var html = "";
  for (var i = 0; i < periodiOrdinati.length; i++) {
    html += renderPeriodoPill(periodiOrdinati[i]);
  }
  return html;
}
