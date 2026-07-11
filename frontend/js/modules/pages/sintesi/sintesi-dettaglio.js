// ═══════════════════════════════════════════════════════════════
// SINTESI DETTAGLIO — Gestione dettaglio e stampa
// ═══════════════════════════════════════════════════════════════

// ─── Helper per stampa in iframe nascosto (senza doppia esecuzione) ──
function stampaHTMLInIframe(html) {
  var iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "1px";
  iframe.style.height = "1px";
  iframe.style.border = "0";
  iframe.style.opacity = "0.01";
  iframe.style.pointerEvents = "none";
  iframe.style.zIndex = "-9999";
  document.body.appendChild(iframe);

  var doc = iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  var alreadyPrinted = false;

  function doPrint() {
    if (alreadyPrinted) return;
    alreadyPrinted = true;
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (e) {
      console.warn("Errore durante la stampa:", e);
    } finally {
      setTimeout(function () {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 2000);
    }
  }

  iframe.onload = function () {
    setTimeout(doPrint, 300);
  };

  // Fallback: se onload non si attiva entro 1s, esegui comunque (una sola volta)
  setTimeout(function () {
    if (
      iframe.contentWindow &&
      iframe.contentWindow.document.readyState === "complete"
    ) {
      doPrint();
    }
  }, 1000);
}

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

  // Usa l'iframe nascosto (ora corretto per non stampare due volte)
  stampaHTMLInIframe(html);
}

window.stampaSintesiCompleta = stampaSintesiCompleta;
