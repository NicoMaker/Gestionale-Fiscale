// ═══════════════════════════════════════════════════════════════
// SINTESI-DETTAGLIO.JS — Click cella → apre Vista Globale filtrata
// ═══════════════════════════════════════════════════════════════

/**
 * Chiamata da renderSintesiTabella quando si clicca su una cella.
 * Porta l'utente alla Vista Globale con i filtri pre-impostati su
 * cliente, adempimento, anno. La cella verrà evidenziata.
 */
function sintesiApriInVistaGlobale(clienteId, adempimentoId) {
  var adpDef = (state.adempimenti || []).find(function (a) {
    return a.id === adempimentoId;
  });
  if (!adpDef) {
    showNotif("Adempimento non trovato.", "error");
    return;
  }

  // Prepara i filtri per la Vista Globale
  state.globaleSelectedClienti = [clienteId];
  state.globalePreFiltroAdpMulti = [adpDef.nome];
  state.globalePreFiltroAdp = "";
  state._sintesi_highlight = {
    clienteId: clienteId,
    adempimentoId: adempimentoId,
  };

  // Naviga alla Vista Globale
  document.querySelectorAll(".nav-item").forEach(function (x) {
    x.classList.remove("active");
  });
  var nav = document.querySelector('[data-page="scadenzario_globale"]');
  if (nav) nav.classList.add("active");

  renderPage("scadenzario_globale");

  showNotif(
    "🌐 Vista Globale aperta su " + adpDef.nome + " per questo cliente",
    "info",
  );
}
window.sintesiApriInVistaGlobale = sintesiApriInVistaGlobale;

// ═══════════════════════════════════════════════════════════════
// APERTURA MODALE MODIFICA/CREAZIONE (dalla Vista Globale)
// ═══════════════════════════════════════════════════════════════

/**
 * Apre il modale di modifica per un periodo esistente.
 * Recupera il record da _rowStore (popolato durante il render).
 */
function openAdpByIdGlobale(rowId) {
  var r = null;
  if (typeof _rowStore !== "undefined" && _rowStore[rowId]) {
    r = _rowStore[rowId];
  }
  if (!r) {
    r = (state.scadGlobale || []).find(function (x) {
      return x.id === rowId;
    });
  }
  if (!r) {
    showNotif("Impossibile trovare i dati per questo periodo.", "error");
    return;
  }
  if (typeof openAdpModal === "function") {
    openAdpModal(r);
  } else {
    showNotif("Modulo di modifica non caricato.", "error");
  }
}
window.openAdpByIdGlobale = openAdpByIdGlobale;

/**
 * Apre il modale in modalità CREAZIONE per un nuovo periodo.
 */
function openAddAdpForPeriod(clienteId, adempimentoId, periodoShort, anno) {
  var adpDef = (state.adempimenti || []).find(function (a) {
    return a.id === adempimentoId;
  });
  if (!adpDef) {
    showNotif("Definizione adempimento non trovata.", "error");
    return;
  }

  var cliente = (state.clienti || []).find(function (c) {
    return c.id === clienteId;
  });
  if (!cliente) {
    showNotif("Cliente non trovato.", "error");
    return;
  }

  var scadenzaTipo = adpDef.scadenza_tipo;
  var mese = null,
    trimestre = null,
    semestre = null;

  if (scadenzaTipo === "mensile") {
    var mesiShort = [
      "Gen",
      "Feb",
      "Mar",
      "Apr",
      "Mag",
      "Giu",
      "Lug",
      "Ago",
      "Set",
      "Ott",
      "Nov",
      "Dic",
    ];
    var idx = mesiShort.indexOf(periodoShort);
    if (idx !== -1) mese = idx + 1;
  } else if (scadenzaTipo === "trimestrale") {
    var match = periodoShort.match(/T(\d)/);
    if (match) trimestre = parseInt(match[1]);
  } else if (scadenzaTipo === "semestrale") {
    var match2 = periodoShort.match(/S(\d)/);
    if (match2) semestre = parseInt(match2[1]);
  }

  var nuovoPeriodo = {
    id: null,
    is_new: true,
    id_cliente: clienteId,
    id_adempimento: adempimentoId,
    adempimento_nome: adpDef.nome,
    adempimento_codice: adpDef.codice,
    anno: anno,
    scadenza_tipo: scadenzaTipo,
    mese: mese,
    trimestre: trimestre,
    semestre: semestre,
    stato: "da_fare",
    data_scadenza: null,
    data_completamento: null,
    note: null,
    importo: null,
    importo_saldo: null,
    importo_acconto1: null,
    importo_acconto2: null,
    importo_iva: null,
    importo_contabilita: null,
    cont_completata: 0,
    iva_completata: 0,
    is_contabilita: adpDef.is_contabilita,
    has_rate: adpDef.has_rate,
    is_checkbox: adpDef.is_checkbox,
    is_text_only: adpDef.is_text_only,
    rate_labels: adpDef.rate_labels,
    cliente_nome: cliente.nome,
    cliente_tipologia_codice: cliente.tipologia_codice,
    cliente_sottotipologia_nome: cliente.sottotipologia_nome,
    cliente_cf: cliente.codice_fiscale,
    cliente_piva: cliente.partita_iva,
    cliente_periodicita: cliente.periodicita,
    cliente_col2: cliente.col2_value,
    cliente_col3: cliente.col3_value,
  };

  if (typeof openAdpModal === "function") {
    openAdpModal(nuovoPeriodo);
  } else {
    showNotif("Modulo di modifica non caricato.", "error");
  }
}
window.openAddAdpForPeriod = openAddAdpForPeriod;

// ═══════════════════════════════════════════════════════════════
// STAMPA LISTA COMPLETA
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
window.stampaSintesiCompleta = stampaSintesiCompleta;

function _generaFinestraStampa() {
  var adpSel = document.getElementById("sint-filtro-adp");
  var selectedAdpIds = adpSel
    ? Array.from(adpSel.selectedOptions || []).map(function (o) {
        return parseInt(o.value);
      })
    : [];

  var clienteSel = document.getElementById("sint-filtro-cliente");
  var filtroClienteId =
    clienteSel && clienteSel.value ? parseInt(clienteSel.value) : null;

  var tipoSel = document.getElementById("sint-filtro-tipo-utente");
  var filtroTipiUtente = tipoSel
    ? Array.from(tipoSel.selectedOptions || []).map(function (o) {
        return o.value;
      })
    : [];

  var searchTerm = (getSharedClienteSearch() || "").toLowerCase();

  var clienti = (state.clienti || []).filter(function (c) {
    if (c.attivo === 0 || c.attivo === "0" || c.attivo === false) return false;
    if (filtroClienteId && c.id !== filtroClienteId) return false;
    if (
      filtroTipiUtente.length > 0 &&
      !filtroTipiUtente.includes(c.tipologia_codice)
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
  clienti.sort(function (a, b) {
    return (a.nome || "").localeCompare(b.nome || "", "it", {
      sensitivity: "base",
    });
  });

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

  var lookup = {};
  (state.sintesiData || []).forEach(function (r) {
    var k = r.cliente_id + "|" + r.id_adempimento;
    if (!lookup[k]) lookup[k] = [];
    lookup[k].push(r);
  });

  var statoFiltriAttivi = _sintesiStatoFiltriAttivi();

  var clientiDaStampare = [];
  clienti.forEach(function (cliente) {
    var adempimentiCliente = [];
    columns.forEach(function (adp) {
      var key = cliente.id + "|" + adp.id;
      var periodi = lookup[key] || [];
      var st = _sintesiStatoCella(periodi);
      if (
        statoFiltriAttivi.length > 0 &&
        statoFiltriAttivi.indexOf(st.kind) === -1
      ) {
        return;
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

  var htmlParts = [];
  htmlParts.push(
    '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Sintesi Adempimenti ' +
      state.anno +
      "</title><style>",
  );
  htmlParts.push("@page{size:landscape;margin:10mm}");
  htmlParts.push(
    "*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;padding:0;margin:0;color:#1a2233}",
  );
  htmlParts.push(
    ".header{text-align:center;margin-bottom:14px;border-bottom:2px solid #1F3B57;padding-bottom:10px}",
  );
  htmlParts.push(".header h1{font-size:20px;margin:0;color:#1F3B57}");
  htmlParts.push(".header p{font-size:12px;color:#667085;margin:4px 0 0}");
  htmlParts.push(
    ".header .date{font-size:10.5px;color:#98a2b3;margin:2px 0 0}",
  );
  htmlParts.push(
    "table.xlv{border-collapse:collapse;width:100%;table-layout:fixed;font-size:10.5px}",
  );
  htmlParts.push("table.xlv thead{display:table-header-group}");
  htmlParts.push("table.xlv tr{page-break-inside:avoid}");
  htmlParts.push(
    "table.xlv th{background:#1F3B57;color:#fff;font-size:9.5px;font-weight:700;padding:6px 4px;border:1px solid #ccd3da;text-align:center;letter-spacing:.02em}",
  );
  htmlParts.push(
    "table.xlv th.corner{text-align:left;width:150px;font-size:10.5px}",
  );
  htmlParts.push(
    "table.xlv td{border:1px solid #d8dee5;padding:4px 3px;text-align:center;vertical-align:middle;font-weight:700}",
  );
  htmlParts.push(
    "table.xlv td.nome-cell{text-align:left;font-weight:700;background:#f4f6f8;padding:5px 6px}",
  );
  htmlParts.push(
    "table.xlv td.nome-cell .cf{display:block;font-weight:400;font-size:9px;color:#667085}",
  );
  htmlParts.push(
    "table.xlv tbody tr:nth-child(even) td.nome-cell{background:#eceef1}",
  );
  htmlParts.push(".bg-done{background:#dcf5e6;color:#1e8e5a}");
  htmlParts.push(".bg-partial{background:#fcf1d8;color:#b8860b}");
  htmlParts.push(".bg-todo{background:#fbe0de;color:#c0392b}");
  htmlParts.push(".bg-na{background:#ecedef;color:#6b7280}");
  htmlParts.push("table.xlv td.cell-multi{background:#fbfbfc}");
  htmlParts.push(
    ".pchip-wrap{display:flex;flex-wrap:wrap;gap:1.5px;justify-content:center}",
  );
  htmlParts.push(
    ".pchip{display:inline-block;padding:1px 3px;border-radius:2px;font-size:7px;font-weight:700;line-height:1.5;min-width:14px}",
  );
  htmlParts.push(".pchip.bg-done{background:#dcf5e6;color:#1e8e5a}");
  htmlParts.push(".pchip.bg-partial{background:#fcf1d8;color:#b8860b}");
  htmlParts.push(".pchip.bg-todo{background:#fbe0de;color:#c0392b}");
  htmlParts.push(".pchip.bg-na{background:#ecedef;color:#98a2b3}");
  htmlParts.push(
    ".legend{display:flex;flex-wrap:wrap;gap:14px;margin-top:12px;font-size:10px;color:#475467}",
  );
  htmlParts.push(
    ".legend span.sw{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:4px;vertical-align:middle}",
  );
  htmlParts.push(
    ".adp-legend{margin-top:14px;font-size:9.5px;color:#475467;columns:3;column-gap:24px}",
  );
  htmlParts.push(
    ".adp-legend div{break-inside:avoid;padding:2px 0;border-bottom:1px dotted #e3e6ea}",
  );
  htmlParts.push(
    ".no-data{padding:30px;text-align:center;color:#98a2b3;font-size:13px}",
  );
  htmlParts.push(
    ".footer{text-align:center;margin-top:14px;padding-top:8px;border-top:1px solid #e3e6ea;font-size:9.5px;color:#98a2b3}",
  );
  htmlParts.push("</style></head><body>");

  htmlParts.push(
    '<div class="header"><h1>📊 Sintesi Adempimenti ' + state.anno + "</h1>",
  );
  htmlParts.push(
    "<p>Matrice Clienti × Adempimenti — vista foglio di calcolo, con i filtri attuali</p>",
  );
  htmlParts.push(
    '<div class="date">Stampato il ' +
      new Date().toLocaleDateString("it-IT") +
      " alle " +
      new Date().toLocaleTimeString("it-IT") +
      "</div></div>",
  );

  if (clientiDaStampare.length === 0 || columns.length === 0) {
    htmlParts.push(
      '<div class="no-data">Nessun adempimento da stampare con i filtri correnti.</div>',
    );
  } else {
    htmlParts.push('<table class="xlv"><thead><tr>');
    htmlParts.push('<th class="corner">Cliente</th>');
    columns.forEach(function (adp) {
      htmlParts.push("<th>" + escAttr(adp.codice || adp.nome) + "</th>");
    });
    htmlParts.push("</tr></thead><tbody>");

    clientiDaStampare.forEach(function (item) {
      var cliente = item.cliente;
      htmlParts.push("<tr>");
      htmlParts.push(
        '<td class="nome-cell">' +
          escAttr(cliente.nome) +
          (cliente.codice_fiscale || cliente.partita_iva
            ? '<span class="cf">' +
              (cliente.codice_fiscale || cliente.partita_iva) +
              "</span>"
            : "") +
          "</td>",
      );
      var byAdpId = {};
      item.adempimenti.forEach(function (ai) {
        byAdpId[ai.adp.id] = ai;
      });
      columns.forEach(function (adp) {
        var ai = byAdpId[adp.id];
        if (!ai) {
          htmlParts.push('<td class="bg-na">—</td>');
          return;
        }
        var st = ai.stato;
        if (ai.periodi.length > 1) {
          var sortedPer = ai.periodi.slice().sort(function (a, b) {
            if (a.mese != null && b.mese != null) return a.mese - b.mese;
            if (a.trimestre != null && b.trimestre != null)
              return a.trimestre - b.trimestre;
            if (a.semestre != null && b.semestre != null)
              return a.semestre - b.semestre;
            return 0;
          });
          var chips = sortedPer
            .map(function (p) {
              var pKind =
                p.stato === "completato"
                  ? "done"
                  : p.stato === "in_corso"
                    ? "partial"
                    : p.stato === "n_a"
                      ? "na"
                      : "todo";
              var pShort =
                typeof getPeriodoShort === "function"
                  ? getPeriodoShort(p)
                  : "-";
              return (
                '<span class="pchip bg-' + pKind + '">' + pShort + "</span>"
              );
            })
            .join("");
          htmlParts.push(
            '<td class="cell-multi" title="' +
              escAttr(adp.nome) +
              " — " +
              escAttr(st.label) +
              '"><div class="pchip-wrap">' +
              chips +
              "</div></td>",
          );
        } else {
          var icon =
            st.kind === "done"
              ? "✔"
              : st.kind === "partial"
                ? "◐"
                : st.kind === "todo"
                  ? "○"
                  : "—";
          htmlParts.push(
            '<td class="bg-' +
              st.kind +
              '" title="' +
              escAttr(adp.nome) +
              " — " +
              escAttr(st.label) +
              '">' +
              icon +
              "</td>",
          );
        }
      });
      htmlParts.push("</tr>");
    });

    htmlParts.push("</tbody></table>");

    htmlParts.push(
      '<div class="legend">' +
        '<span><span class="sw" style="background:#1e8e5a"></span>✔ Completato</span>' +
        '<span><span class="sw" style="background:#b8860b"></span>◐ In corso</span>' +
        '<span><span class="sw" style="background:#c0392b"></span>○ Da fare</span>' +
        '<span><span class="sw" style="background:#6b7280"></span>— N/A</span>' +
        "</div>",
    );

    htmlParts.push('<div class="adp-legend">');
    columns.forEach(function (adp) {
      htmlParts.push(
        "<div><strong>" +
          escAttr(adp.codice || "") +
          "</strong> — " +
          escAttr(adp.nome) +
          "</div>",
      );
    });
    htmlParts.push("</div>");
  }

  var html = htmlParts.join("");

  var iframe = document.createElement("iframe");
  iframe.style.position = "absolute";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  document.body.appendChild(iframe);

  var doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  iframe.contentWindow.focus();
  iframe.contentWindow.print();

  setTimeout(function () {
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
  }, 10000);
}
