// ═══════════════════════════════════════════════════════════════
// GLOBALE-TABELLA.JS — Helper periodi ordinati, render tabella completo,
//                      esposizioni globali
// Dipende da: globale-filtri.js
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// RENDER TABELLA COMPLETO (UNICA VERSIONE CANONICA)
// ═══════════════════════════════════════════════════════════════

function renderGlobaleTabella(rawData) {
  var st = state.globaleStats;
  var filtroClienteStatoEl = document.getElementById(
    "glob-filtro-cliente-stato",
  );
  var filtroClienteStato = filtroClienteStatoEl
    ? filtroClienteStatoEl.value
    : "";

  // ⬇️ RIMOSSO searchTerm (non più presente)
  var selectedClienteIds =
    state.globaleSelectedClienti && state.globaleSelectedClienti.length
      ? state.globaleSelectedClienti.map(function (id) {
          return parseInt(id);
        })
      : [];

  var data = [];
  for (var i = 0; i < rawData.length; i++) {
    var r = rawData[i];
    if (
      selectedClienteIds.length &&
      selectedClienteIds.indexOf(r.cliente_id) === -1
    )
      continue;
    // ⬇️ RIMOSSO il filtro per searchTerm
    data.push(r);
  }

  var perc = st.totale > 0 ? Math.round((st.comp / st.totale) * 100) : 0;

  var activeFiltroKeys = _getActiveFiltroKeys();
  var allKeysArr =
    typeof window._getAllKeys === "function" ? window._getAllKeys() : [];
  var isNone = _isManualNessuno() || activeFiltroKeys.size === 0;
  var isAll = !isNone && activeFiltroKeys.size === allKeysArr.length;
  var tipFiltroIsNone = isNone;
  var hasFiltroTipologie = !isAll;

  var tipFiltroCountDisplay = isNone ? "0" : isAll ? "" : activeFiltroKeys.size;
  var showTipBadge = isNone || (!isAll && activeFiltroKeys.size > 0);

  var adpSel = document.getElementById("glob-filtro-adp");
  var adpFiltroAttivi = adpSel
    ? Array.from(adpSel.selectedOptions || []).map(function (o) {
        return o.value;
      })
    : [];

  if (
    state.globalePreFiltroAdp &&
    state.globalePreFiltroAdp !== "" &&
    adpFiltroAttivi.length === 0
  ) {
    adpFiltroAttivi = [state.globalePreFiltroAdp];
  }

  var filtroClienteStatoLabels = {
    con_in_corso: "🔄 Con almeno 1 in corso",
    senza_in_corso: "✅ Senza in corso",
    tutti_completati: "🏆 Tutto completato",
    con_da_fare: "⭕ Con almeno 1 da fare",
    solo_da_fare: "🚨 Solo da fare",
    non_completati: "⚠️ Non al 100%",
    con_na: "➖ Con almeno 1 N/A",
  };

  var filtroClienteStatoBadge = "";
  if (filtroClienteStato) {
    filtroClienteStatoBadge =
      '<div style="display:inline-flex;align-items:center;gap:6px;margin-top:8px;padding:5px 12px;background:var(--yellow)18;border:1px solid var(--yellow)44;border-radius:20px;font-size:12px;color:var(--yellow)">' +
      "<span>Filtro clienti:</span>" +
      "<strong>" +
      (filtroClienteStatoLabels[filtroClienteStato] || filtroClienteStato) +
      "</strong>" +
      '<button onclick="document.getElementById(\'glob-filtro-cliente-stato\').value=\'\';applyGlobaleFiltriLocali()" style="background:none;border:none;color:var(--yellow);cursor:pointer;font-size:13px;padding:0 2px;line-height:1" title="Rimuovi filtro">✕</button>' +
      "</div>";
  }

  var clienteSelBadge = "";
  if (selectedClienteIds.length && state.clienti) {
    var clientiTrovati = state.clienti.filter(function (c) {
      return selectedClienteIds.indexOf(parseInt(c.id)) !== -1;
    });
    if (clientiTrovati.length) {
      var clienteSelLabel =
        clientiTrovati.length === 1
          ? escAttr(clientiTrovati[0].nome)
          : clientiTrovati.length +
            " clienti selezionati (" +
            clientiTrovati
              .map(function (c) {
                return escAttr(c.nome);
              })
              .join(", ") +
            ")";
      clienteSelBadge =
        '<div style="display:inline-flex;align-items:center;gap:6px;margin-top:8px;margin-left:10px;padding:5px 12px;background:var(--accent)18;border:1px solid var(--accent)44;border-radius:20px;font-size:12px;color:var(--accent);max-width:520px">' +
        "<span>👤 Cliente" +
        (clientiTrovati.length > 1 ? "i" : "") +
        ":</span>" +
        '<strong style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
        clienteSelLabel +
        "</strong>" +
        '<button onclick="state.globaleSelectedClienti=[];resetGlobaleClienteSel();applyGlobaleFiltri()" style="background:none;border:none;color:var(--accent);cursor:pointer;font-size:13px;padding:0 2px;line-height:1" title="Rimuovi filtro cliente">✕</button>' +
        "</div>";
    }
  }

  // ⬇️ RIMOSSO searchBadge

  var navAdpHtml = "";
  if (adpFiltroAttivi.length > 0) {
    navAdpHtml =
      '<div class="glob-nav-adp" style="margin-top:14px;text-align:center;display:flex;flex-wrap:wrap;gap:6px;justify-content:center">' +
      adpFiltroAttivi
        .map(function (nome) {
          return (
            '<span style="display:inline-flex;align-items:center;gap:6px;font-family:var(--mono);font-size:13px;color:var(--accent);background:var(--accent-d);padding:4px 12px;border-radius:20px">' +
            nome +
            "<button onclick=\"_globToggleAdpFiltro('" +
            nome.replace(/'/g, "\\'") +
            '\')" style="background:none;border:none;color:var(--accent);cursor:pointer;font-size:13px;padding:0;line-height:1" title="Rimuovi questo filtro">✕</button>' +
            "</span>"
          );
        })
        .join("") +
      "</div>";
  }

  var tipFiltroHtml = "";
  if (typeof renderTipologieFiltroPanel === "function") {
    tipFiltroHtml =
      '<div class="glob-tip-filtro-wrap" style="margin-bottom:14px">' +
      '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--s2);border:1px solid var(--b0);border-radius:var(--r-sm);cursor:pointer;" onclick="toggleGlobTipFiltroPanel(event)">' +
      '<span style="font-size:12px;font-weight:700;color:var(--t2);text-transform:uppercase;letter-spacing:.06em">🏷️ Filtro Tipologie Clienti</span>' +
      '<span id="glob-tip-filtro-count" style="display:' +
      (showTipBadge ? "inline-flex" : "none") +
      ";align-items:center;justify-content:center;min-width:20px;height:20px;padding:0 6px;background:" +
      (isNone ? "var(--red)" : "var(--accent)") +
      ';color:#fff;border-radius:10px;font-size:11px;font-weight:700">' +
      tipFiltroCountDisplay +
      "</span>" +
      (tipFiltroIsNone
        ? '<span style="font-size:11px;color:var(--red);font-weight:700">⚠️ Nessuno selezionato</span>'
        : "") +
      '<div id="glob-tip-filtro-toggle-btn" style="margin-left:auto" onclick="event.stopPropagation()">' +
      (_globTipFiltroPanelOpen
        ? '<button class="btn btn-xs btn-secondary" onclick="event.stopPropagation(); closeGlobTipFiltroPanel(event)">✕ Chiudi</button>'
        : '<button class="btn btn-xs btn-secondary" onclick="event.stopPropagation(); toggleGlobTipFiltroPanel(event)">▼ Espandi</button>') +
      "</div>" +
      "</div>" +
      '<div id="glob-tip-filtro-container" style="display:' +
      (_globTipFiltroPanelOpen ? "block" : "none") +
      ';margin-top:8px" onclick="event.stopPropagation()">' +
      renderTipologieFiltroPanel() +
      "</div>" +
      "</div>";
  }

  var headerCard =
    '<div class="globale-preview-card">' +
    '<div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap;width:100%">' +
    '<div class="gpc-left">' +
    '<div class="gpc-globe">🌐</div>' +
    "<div>" +
    '<div class="gpc-title">Vista Globale ' +
    state.anno +
    "</div>" +
    '<div class="gpc-sub">' +
    st.clienti +
    " clienti · " +
    st.adempimenti.length +
    " tipi adempimenti</div>" +
    '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:6px">' +
    filtroClienteStatoBadge +
    clienteSelBadge +
    // ⬇️ RIMOSSO searchBadge
    "</div>" +
    "</div>" +
    "</div>" +
    '<div class="gpc-stats">' +
    '<div class="cpc-stat-item"><div class="cpc-stat-num" style="color:var(--accent)">' +
    st.totale +
    '</div><div class="cpc-stat-lbl">Totale</div></div>' +
    '<div class="cpc-stat-item"><div class="cpc-stat-num" style="color:var(--green)">' +
    st.comp +
    '</div><div class="cpc-stat-lbl">Comp.</div></div>' +
    '<div class="cpc-stat-item"><div class="cpc-stat-num" style="color:var(--red)">' +
    st.daF +
    '</div><div class="cpc-stat-lbl">Da fare</div></div>' +
    '<div class="cpc-stat-item"><div class="cpc-stat-num" style="color:var(--yellow)">' +
    st.inC +
    '</div><div class="cpc-stat-lbl">In corso</div></div>' +
    '<div class="cpc-stat-item">' +
    '<div class="cpc-stat-num" style="color:var(--green)">' +
    perc +
    "%</div>" +
    '<div class="cpc-stat-lbl">Progresso</div>' +
    '<div class="mini-bar" style="margin-top:4px;width:70px"><div class="mini-fill" style="width:' +
    perc +
    '%"></div></div>' +
    "</div>" +
    "</div>" +
    "</div>" +
    navAdpHtml +
    "</div>" +
    tipFiltroHtml;

  // RAGGRUPPA PER ADEMPIMENTO E CLIENTE
  var grouped = {};
  for (var idxData = 0; idxData < data.length; idxData++) {
    var rowData = data[idxData];
    storeRow(rowData);
    var adpKey = rowData.adempimento_nome;
    if (!grouped[adpKey]) {
      grouped[adpKey] = {
        nome: rowData.adempimento_nome,
        codice: rowData.adempimento_codice,
        clienti: {},
      };
    }
    var group = grouped[adpKey];
    var cliKey = rowData.cliente_id;
    if (!group.clienti[cliKey]) {
      group.clienti[cliKey] = {
        id: rowData.cliente_id,
        nome: rowData.cliente_nome,
        cf: rowData.cliente_cf,
        piva: rowData.cliente_piva,
        tipologia_codice: rowData.cliente_tipologia_codice,
        tipologia_colore: rowData.cliente_tipologia_colore,
        sottotipologia_nome: rowData.cliente_sottotipologia_nome,
        periodicita: rowData.cliente_periodicita,
        col2: rowData.cliente_col2,
        col3: rowData.cliente_col3,
        periodi: [],
      };
    }
    group.clienti[cliKey].periodi.push(rowData);
  }

  var gruppi = [];
  for (var key in grouped) {
    if (grouped.hasOwnProperty(key)) gruppi.push(grouped[key]);
  }
  gruppi.sort(function (a, b) {
    return a.nome.localeCompare(b.nome, "it", { sensitivity: "base" });
  });

  var content = "";
  for (var gIdx = 0; gIdx < gruppi.length; gIdx++) {
    var g = gruppi[gIdx];
    var clientiArray = [];
    for (var cKey in g.clienti) {
      if (g.clienti.hasOwnProperty(cKey)) clientiArray.push(g.clienti[cKey]);
    }

    var clientiFiltrati = [];
    for (var cIdx = 0; cIdx < clientiArray.length; cIdx++) {
      var c = clientiArray[cIdx];
      if (!clientePassaFiltroStato(c.periodi, filtroClienteStato)) continue;
      if (!clientePassaFiltroTipologie(c)) continue;
      clientiFiltrati.push(c);
    }

    clientiFiltrati.sort(function (a, b) {
      var primoA = a.periodi && a.periodi[0];
      var isSemplice =
        primoA &&
        !parseInt(primoA.is_contabilita) &&
        !parseInt(primoA.has_rate) &&
        !parseInt(primoA.is_checkbox);

      if (isSemplice) {
        var minDateA = null,
          minDateB = null;
        for (var pi = 0; pi < a.periodi.length; pi++) {
          if (a.periodi[pi].data_scadenza) {
            var d = new Date(a.periodi[pi].data_scadenza);
            if (!minDateA || d < minDateA) minDateA = d;
          }
        }
        for (var pj = 0; pj < b.periodi.length; pj++) {
          if (b.periodi[pj].data_scadenza) {
            var d2 = new Date(b.periodi[pj].data_scadenza);
            if (!minDateB || d2 < minDateB) minDateB = d2;
          }
        }
        if (minDateA && minDateB) {
          if (minDateA - minDateB !== 0) return minDateA - minDateB;
        } else if (minDateA) return -1;
        else if (minDateB) return 1;
      }
      return a.nome.localeCompare(b.nome, "it", { sensitivity: "base" });
    });

    if (clientiFiltrati.length === 0) continue;

    var allRows = [];
    for (var cfIdx = 0; cfIdx < clientiFiltrati.length; cfIdx++) {
      var periodi = clientiFiltrati[cfIdx].periodi;
      for (var pIdx = 0; pIdx < periodi.length; pIdx++)
        allRows.push(periodi[pIdx]);
    }
    var compG = 0;
    for (var arIdx = 0; arIdx < allRows.length; arIdx++) {
      if (allRows[arIdx].stato === "completato") compG++;
    }
    var totG = allRows.length;
    var pG = totG > 0 ? Math.round((compG / totG) * 100) : 0;

    var clientiHtml = "";
    for (var cFilIdx = 0; cFilIdx < clientiFiltrati.length; cFilIdx++) {
      var client = clientiFiltrati[cFilIdx];
      var tipColor =
        client.tipologia_colore || getTipologiaColor(client.tipologia_codice);
      var avatar = getAvatar(client.nome);
      var compC = 0,
        inCC = 0,
        daFC = 0,
        naC = 0;
      for (var perIdx = 0; perIdx < client.periodi.length; perIdx++) {
        var statoPer = client.periodi[perIdx].stato;
        if (statoPer === "completato") compC++;
        else if (statoPer === "in_corso") inCC++;
        else if (statoPer === "da_fare") daFC++;
        else if (statoPer === "n_a") naC++;
      }
      var totC = client.periodi.length;
      var pC = totC > 0 ? Math.round((compC / totC) * 100) : 0;
      var pgColor =
        pC === 100 ? "var(--green)" : pC > 50 ? "var(--yellow)" : "var(--red)";

      var situazioneBadges = "";
      if (compC > 0)
        situazioneBadges +=
          '<span style="font-size:10px;color:var(--green);background:var(--green)12;border:1px solid var(--green)33;border-radius:10px;padding:1px 6px">✅ ' +
          compC +
          "</span>";
      if (inCC > 0)
        situazioneBadges +=
          '<span style="font-size:10px;color:var(--yellow);background:var(--yellow)12;border:1px solid var(--yellow)33;border-radius:10px;padding:1px 6px">🔄 ' +
          inCC +
          "</span>";
      if (daFC > 0)
        situazioneBadges +=
          '<span style="font-size:10px;color:var(--red);background:var(--red)12;border:1px solid var(--red)33;border-radius:10px;padding:1px 6px">⭕ ' +
          daFC +
          "</span>";
      if (naC > 0)
        situazioneBadges +=
          '<span style="font-size:10px;color:var(--t3);background:var(--s3);border:1px solid var(--b0);border-radius:10px;padding:1px 6px">➖ ' +
          naC +
          "</span>";

      var classBadgesHtml = _renderGlobaleClienteClassBadges(client);
      var sottotipoLabel = client.sottotipologia_nome || "";

      var periodiHtml = _buildPeriodiOrdinatiHtml(client.periodi);
      var isMensile = client.periodi.length > 4;

      clientiHtml +=
        '<div class="glob-cliente-card">' +
        '<div class="glob-cliente-header">' +
        '<div class="gcr-avatar" style="border-color:' +
        tipColor +
        ";color:" +
        tipColor +
        ";background:" +
        tipColor +
        '15">' +
        avatar +
        "</div>" +
        '<div style="flex:1;min-width:0">' +
        '<div class="gcr-nome">' +
        escAttr(client.nome) +
        "</div>" +
        '<div class="gcr-cf">' +
        (client.cf || client.piva || "-") +
        "</div>" +
        (sottotipoLabel
          ? '<div style="font-size:10px;color:var(--t3);margin-top:2px">🏷️ ' +
            sottotipoLabel +
            "</div>"
          : "") +
        '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:5px">' +
        classBadgesHtml +
        "</div>" +
        (situazioneBadges
          ? '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">' +
            situazioneBadges +
            "</div>"
          : "") +
        "</div>" +
        '<div style="display:flex;align-items:center;gap:8px;margin-left:10px">' +
        '<div class="mini-bar" style="width:56px"><div class="mini-fill" style="width:' +
        pC +
        "%;background:" +
        pgColor +
        '"></div></div>' +
        '<span style="font-size:11px;font-family:var(--mono);color:' +
        pgColor +
        ';min-width:36px;text-align:right">' +
        compC +
        "/" +
        totC +
        "</span>" +
        "</div>" +
        '<div style="display:flex;flex-direction:column;gap:5px;margin-left:8px">' +
        '<button class="btn btn-xs" onclick="event.stopPropagation();editCliente(' +
        client.id +
        ')" title="Modifica dati cliente" style="font-size:11px;padding:3px 7px;border:1px solid var(--accent,#2563eb);color:var(--accent,#2563eb);background:transparent;border-radius:5px;cursor:pointer;white-space:nowrap">✏️ Modifica</button>' +
        '<button class="btn btn-xs" onclick="event.stopPropagation();attivaModalitaSelezioneGlobale(' +
        client.id +
        ')" title="Seleziona periodi di questo cliente per eliminarli" style="font-size:11px;padding:3px 7px;border:1px solid var(--red,#dc2626);color:var(--red,#dc2626);background:transparent;border-radius:5px;cursor:pointer;white-space:nowrap">☑ Seleziona</button>' +
        "</div>" +
        "</div>" +
        '<div class="glob-cliente-periodi' +
        (isMensile ? " periodi-mensili" : "") +
        '">' +
        periodiHtml +
        "</div>" +
        "</div>";
    }

    content +=
      '<div class="table-wrap" style="margin-bottom:16px">' +
      '<div class="table-header">' +
      '<div style="display:flex;align-items:center;gap:12px;flex:1">' +
      '<strong style="font-size:15px">' +
      g.nome +
      "</strong>" +
      '<span style="font-family:var(--mono);font-size:11px;color:var(--t3)">' +
      g.codice +
      "</span>" +
      (filtroClienteStato || hasFiltroTipologie
        ? '<span style="font-size:11px;color:var(--t3);margin-left:8px">' +
          clientiFiltrati.length +
          " client" +
          (clientiFiltrati.length === 1 ? "e" : "i") +
          " visibil" +
          (clientiFiltrati.length === 1 ? "e" : "i") +
          "</span>"
        : "") +
      "</div>" +
      '<div style="display:flex;align-items:center;gap:10px">' +
      '<div class="mini-bar" style="width:90px"><div class="mini-fill" style="width:' +
      pG +
      '%"></div></div>' +
      '<span style="font-size:12px;font-family:var(--mono);color:var(--t2)">' +
      compG +
      "/" +
      totG +
      " (" +
      pG +
      "%)</span>" +
      "</div>" +
      "</div>" +
      '<div style="padding:12px;display:flex;flex-direction:column;gap:8px">' +
      clientiHtml +
      "</div>" +
      "</div>";
  }

  if (!content) {
    var msgVuoto = tipFiltroIsNone
      ? "Nessun filtro tipologia selezionato — clicca <strong>✦ Tutti</strong> nel pannello Tipologie per vedere i clienti"
      : filtroClienteStato || hasFiltroTipologie || selectedClienteIds.length
        ? "Nessun cliente corrisponde ai filtri attivi per " + state.anno
        : "Nessun adempimento trovato per " + state.anno;

    content =
      '<div class="empty">' +
      '<div class="empty-icon">🌐</div>' +
      '<p style="font-size:15px">' +
      msgVuoto +
      "</p>" +
      '<button class="btn btn-sm btn-primary" onclick="resetGlobaleFiltri()" style="margin-top:12px">⟳ Rimuovi filtri</button>' +
      "</div>";
  }

  document.getElementById("content").innerHTML = headerCard + content;

  if (state.globalePreFiltroAdp) {
    state.globalePreFiltroAdp = "";
  }

  if (typeof _pillBulkAttivo !== "undefined" && _pillBulkAttivo) {
    _renderBarraBulkPill();
    _aggiornaPillBulkUI();
  }
}

// ═══════════════════════════════════════════════════════════════
// ESPOSIZIONE GLOBALE
// ═══════════════════════════════════════════════════════════════

window.toggleGlobTipFiltroPanel = toggleGlobTipFiltroPanel;
window.closeGlobTipFiltroPanel = closeGlobTipFiltroPanel;
window.resetGlobaleFiltri = resetGlobaleFiltri;

function attivaModalitaSelezioneGlobale(clienteId) {
  if (typeof attivaModalitaSelezione === "function") {
    attivaModalitaSelezione("globale");
  }
}
window.attivaModalitaSelezioneGlobale = attivaModalitaSelezioneGlobale;
window.resetGlobaleClienteSel = resetGlobaleClienteSel;
window.applyGlobaleFiltri = applyGlobaleFiltri;
window.applyGlobaleFiltriLocali = applyGlobaleFiltriLocali;
window.applyGlobaleFiltriDebounced = applyGlobaleFiltriDebounced;
window.navigaAdempimento = navigaAdempimento;
window.changeAnnoGlobale = changeAnnoGlobale;
window.populateGlobaleClienti = populateGlobaleClienti;
window.renderGlobaleClientiSelect = renderGlobaleClientiSelect;
window.onGlobaleClienteChange = onGlobaleClienteChange;
