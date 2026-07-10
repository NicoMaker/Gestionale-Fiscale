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
        var sortedP = periodi.slice().sort(confrontaPeriodi);

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
