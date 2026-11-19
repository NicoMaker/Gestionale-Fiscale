function renderSintesiTabella() {
  if (state.page !== "sintesi") return;
  const container = document.getElementById("content");
  if (!container) return;

  if (!state.clienti || !state.adempimenti || !state.sintesiData) {
    container.innerHTML =
      '<div class="empty"><div class="empty-icon">⏳</div><p style="font-size:15px">Caricamento dati…</p></div>';
    return;
  }

  // ─── Colonne (adempimenti) ───────────────────────────────────
  const adpSel = document.getElementById("sint-filtro-adp");
  const selectedIds = adpSel
    ? Array.from(adpSel.selectedOptions || []).map(function (o) {
        return parseInt(o.value);
      })
    : [];
  const allDefs = (state.adempimenti || []).filter(function (a) {
    return (
      !a.anno_validita || parseInt(a.anno_validita) === parseInt(state.anno)
    );
  });
  let columns = selectedIds.length
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
  const lookup = {};
  (state.sintesiData || []).forEach(function (r) {
    const k = r.cliente_id + "|" + r.id_adempimento;
    if (!lookup[k]) lookup[k] = [];
    lookup[k].push(r);
  });

  // ─── Righe (clienti) ──────────────────────────────────────────
  const searchTerm = (getSharedClienteSearch() || "").toLowerCase();
  let clienti = (state.clienti || []).filter(function (c) {
    if (c.attivo === 0 || c.attivo === "0" || c.attivo === false) return false;
    if (
      _sintesiClienteFiltro.length > 0 &&
      _sintesiClienteFiltro.indexOf(c.id) === -1
    )
      return false;
    // FILTRO MULTI‑TIPO: se l'array non è vuoto, il cliente deve avere un codice incluso
    if (
      _sintesiTipiUtenteFiltro.length > 0 &&
      !_sintesiTipiUtenteFiltro.includes(c.tipologia_codice)
    )
      return false;
    if (searchTerm) {
      const nome = (c.nome || "").toLowerCase();
      const cf = (c.codice_fiscale || "").toLowerCase();
      const piva = (c.partita_iva || "").toLowerCase();
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
  const statiClienti = {};
  const stats = { done: 0, partial: 0, todo: 0, na: 0 };

  clienti.forEach(function (c) {
    statiClienti[c.id] = {};
    columns.forEach(function (a) {
      const key = c.id + "|" + a.id;
      const st = _sintesiStatoCella(lookup[key] || []);
      statiClienti[c.id][a.id] = st;
      stats[st.kind] = (stats[st.kind] || 0) + 1;
    });
  });

  // ─── FILTRO STATO: mostra clienti con ALMENO una cella corrispondente ──
  const statoFiltriAttivi = _sintesiStatoFiltriAttivi();
  let clientiVisibili = clienti;

  if (statoFiltriAttivi.length > 0) {
    clientiVisibili = clienti.filter(function (c) {
      for (let j = 0; j < columns.length; j++) {
        const a = columns[j];
        const st = statiClienti[c.id][a.id];
        if (st && statoFiltriAttivi.indexOf(st.kind) !== -1) {
          return true;
        }
      }
      return false;
    });
  }

  // ─── Calcola statistiche ──────────────────────────────────────
  const doneCells = stats.done || 0;
  const naCells = stats.na || 0;
  const partialCells = stats.partial || 0;
  const todoCells = stats.todo || 0;

  const baseCalc = doneCells + partialCells + todoCells;
  const percCompletato =
    baseCalc > 0 ? Math.round((doneCells / baseCalc) * 100) : 0;

  const clientiCountLabel =
    statoFiltriAttivi.length > 0 && clientiVisibili.length !== clienti.length
      ? clientiVisibili.length + " di " + clienti.length
      : String(clienti.length);
  const clientiCountUnit = clienti.length === 1 ? "e" : "i";

  // ─── Header ────────────────────────────────────────────────────
  function _sintStatBoxHtml(kind, count, color, iconaLabel) {
    const active = _sintesiStatoFiltri[kind] || false;
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

  const headerCard =
    '<div class="globale-preview-card">' +
    '<div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap;width:100%">' +
    '<div class="gpc-left">' +
    '<div class="gpc-globe">🧮</div>' +
    "<div>" +
    '<div class="gpc-title">Sintesi Adempimenti ' +
    state.anno +
    "</div>" +
    '<div class="gpc-sub"><span class="count-num">' +
    clientiCountLabel +
    "</span> client" +
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
    _sintStatBoxHtml("todo", todoCells, "var(--red)", "Da fare") +
    _sintStatBoxHtml("na", naCells, "var(--t3)", "N/A") +
    "</div>" +
    "</div>" +
    '<div style="font-size:11px;color:var(--t3);margin-top:8px">📖 Filtri stato: mostrano le celle che corrispondono allo stato selezionato. Le altre celle sono nascoste.</div>' +
    "</div>";

  // ─── Legenda ───────────────────────────────────────────────────
  function _sintLegendItemHtml(kind, label) {
    const active = _sintesiStatoFiltri[kind] || false;
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

  const legend =
    '<div class="sint-legend">' +
    _sintLegendItemHtml("done", "Completato per tutti i periodi") +
    _sintLegendItemHtml("partial", "🔄 Parzialmente completato") +
    _sintLegendItemHtml("todo", "Da fare / non iniziato") +
    _sintLegendItemHtml("na", "N/A — non applicato") +
    (statoFiltriAttivi.length > 0
      ? '<button type="button" class="sint-legend-clear" onclick="resetSintesiStatoFiltro()">✕ Rimuovi filtro stato</button>'
      : "") +
    '<span style="color:var(--t3);font-size:11px;">· Clicca per filtrare le celle</span>' +
    "</div>";

  // ─── Tabella ───────────────────────────────────────────────────
  let bodyHtml = "";
  if (!clientiVisibili.length || !columns.length) {
    const msgVuoto = !columns.length
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
    const theadCols = columns
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

    let rowsHtml = "";
    for (let i = 0; i < clientiVisibili.length; i++) {
      const c = clientiVisibili[i];
      const tipColor =
        c.tipologia_colore ||
        (typeof getTipologiaColor === "function"
          ? getTipologiaColor(c.tipologia_codice)
          : "#888");
      let cellsHtml = "";

      for (let j = 0; j < columns.length; j++) {
        const a = columns[j];
        const key = c.id + "|" + a.id;
        const st = statiClienti[c.id][a.id] || { kind: "na", label: "N/A" };
        const isActive = state.sintesiActiveCellKey === key;

        // Se ci sono filtri attivi, nascondi le celle che NON corrispondono
        const isHidden =
          statoFiltriAttivi.length > 0 &&
          statoFiltriAttivi.indexOf(st.kind) === -1;

        const periodi = lookup[key] || [];
        const sortedP = periodi.slice().sort(function (a, b) {
          if (a.mese != null && b.mese != null) return a.mese - b.mese;
          if (a.trimestre != null && b.trimestre != null)
            return a.trimestre - b.trimestre;
          if (a.semestre != null && b.semestre != null)
            return a.semestre - b.semestre;
          return 0;
        });

        let doneCount = 0;
        const pillsHtml = sortedP
          .map(function (p) {
            const pStato = p.stato || "da_fare";
            if (pStato === "completato") doneCount++;
            const pInfo = _SINT_STATO_INFO[pStato] || _SINT_STATO_INFO.da_fare;
            const pShort =
              typeof getPeriodoShort === "function" ? getPeriodoShort(p) : "-";
            const bgColor =
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

        let cellContent;
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

        let cellClass = "sint-cell sint-cell-" + st.kind;
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

  // Salva la posizione di scroll PRIMA di rigenerare l'HTML: dopo una
  // modifica (salvataggio dal modal) la tabella viene ridisegnata e il
  // browser altrimenti riporta la pagina in cima, facendo perdere il
  // pannello di dettaglio aperto.
  const _prevScrollTop = container.scrollTop;
  const _prevWinY = window.scrollY || 0;
  const _prevWrap = container.querySelector(".sint-table-wrap");
  const _prevScrollLeft = _prevWrap ? _prevWrap.scrollLeft : 0;
  const _prevWrapTop = _prevWrap ? _prevWrap.scrollTop : 0;

  container.innerHTML =
    headerCard + legend + bodyHtml + '<div id="sint-dettaglio"></div>';

  if (state.sintesiActiveCellKey) {
    const parts = state.sintesiActiveCellKey.split("|");
    _renderSintesiDettaglio(parseInt(parts[0]), parseInt(parts[1]));
  }

  // Ripristina la posizione: si resta sull'adempimento modificato
  const _newWrap = container.querySelector(".sint-table-wrap");
  if (_newWrap) {
    _newWrap.scrollLeft = _prevScrollLeft;
    _newWrap.scrollTop = _prevWrapTop;
  }
  container.scrollTop = _prevScrollTop;
  if (_prevWinY) window.scrollTo(window.scrollX || 0, _prevWinY);

  // Dopo il ridisegno (salvataggio): la tabella si posiziona sulla riga
  // del cliente modificato e il dettaglio evidenzia il periodo modificato
  if (
    state.sintesiEditedPeriodoId &&
    typeof sintesiScrollToEdited === "function"
  ) {
    if (typeof sintesiFocusTabellaCella === "function")
      sintesiFocusTabellaCella(state.sintesiFocusCellKey);
    state.sintesiFocusCellKey = null;
    sintesiScrollToEdited(true);
  }
}

// ═══════════════════════════════════════════════════════════════
// DETTAGLIO PERIODI
// ═══════════════════════════════════════════════════════════════
