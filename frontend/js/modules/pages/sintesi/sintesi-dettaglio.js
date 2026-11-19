// ═══════════════════════════════════════════════════════════════
// SINTESI-DETTAGLIO.JS — Pannello di dettaglio periodi + stampa
// ═══════════════════════════════════════════════════════════════

// Ricorda quale periodo si sta modificando, così dopo il salvataggio
// lo scroll torna esattamente su quella riga (e la evidenzia).
function sintesiEditPeriodo(id) {
  state.sintesiEditedPeriodoId = id;
  const r = typeof _rowStore !== "undefined" ? _rowStore[id] : null;
  state.sintesiEditedCellKey = r
    ? r.cliente_id + "|" + r.id_adempimento
    : state.sintesiActiveCellKey;
  state.sintesiFocusCellKey = state.sintesiEditedCellKey;
  _sintesiWatchModal();
  openAdpById(id);
}
window.sintesiEditPeriodo = sintesiEditPeriodo;

// Quando il modal di modifica si chiude (salva, chiudi, clic fuori, ESC)
// apre/lascia aperto il dettaglio sotto sulla cella appena modificata.
let _sintesiModalObs = null;
function _sintesiWatchModal() {
  if (_sintesiModalObs) return;
  const modal = document.getElementById("modal-adempimento");
  if (!modal) return;
  _sintesiModalObs = new MutationObserver(function () {
    if (modal.classList.contains("open")) return;
    const key = state.sintesiEditedCellKey;
    if (!key || state.page !== "sintesi") return;
    state.sintesiEditedCellKey = null;
    state.sintesiActiveCellKey = key;
    renderSintesiTabella();
    sintesiFocusTabellaCella(key);
    setTimeout(function () {
      if (!sintesiScrollToEdited(false)) {
        const panel = document.getElementById("sint-dettaglio");
        if (panel) panel.scrollIntoView({ block: "nearest" });
      }
    }, 50);
  });
  _sintesiModalObs.observe(modal, {
    attributes: true,
    attributeFilter: ["class"],
  });
}

// Posiziona lo scroll INTERNO della tabella (verticale e orizzontale) in
// modo che la cella/riga del cliente modificato sia al centro.
function sintesiFocusTabellaCella(key) {
  if (!key) return;
  const wrap = document.querySelector(".sint-table-wrap");
  const cell = document.querySelector('.sint-cell[data-key="' + key + '"]');
  if (!wrap || !cell) return;
  const w = wrap.getBoundingClientRect();
  const c = cell.getBoundingClientRect();
  wrap.scrollTop += c.top - w.top - (wrap.clientHeight - c.height) / 2;
  wrap.scrollLeft += c.left - w.left - (wrap.clientWidth - c.width) / 2;
}
window.sintesiFocusTabellaCella = sintesiFocusTabellaCella;

function sintesiScrollToEdited(consuma) {
  const id = state.sintesiEditedPeriodoId;
  if (!id) return false;
  const row = document.querySelector(
    '.sint-dett-table tr[data-pid="' + id + '"]',
  );
  if (!row) return false;
  row.scrollIntoView({ behavior: "auto", block: "nearest" });
  row.classList.add("flash");
  setTimeout(function () {
    row.classList.remove("flash");
  }, 1200);
  if (consuma) state.sintesiEditedPeriodoId = null;
  return true;
}
window.sintesiScrollToEdited = sintesiScrollToEdited;

// Chiamata alla chiusura del modal: riporta la vista sulla riga modificata
function sintesiRiportaAlDettaglio() {
  if (state.page !== "sintesi" || !state.sintesiActiveCellKey) return;
  setTimeout(function () {
    if (!sintesiScrollToEdited(false)) {
      const panel = document.getElementById("sint-dettaglio");
      if (panel && panel.innerHTML)
        panel.scrollIntoView({ behavior: "auto", block: "nearest" });
    }
  }, 150);
}
window.sintesiRiportaAlDettaglio = sintesiRiportaAlDettaglio;

function sintesiToggleDettaglio(key, clienteId, adempimentoId) {
  state.sintesiActiveCellKey = state.sintesiActiveCellKey === key ? null : key;
  renderSintesiTabella();
  if (state.sintesiActiveCellKey) {
    setTimeout(function () {
      const panel = document.getElementById("sint-dettaglio");
      if (panel) panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 30);
  }
}
window.sintesiToggleDettaglio = sintesiToggleDettaglio;

function sintesiCloseDettaglio() {
  state.sintesiActiveCellKey = null;
  const panel = document.getElementById("sint-dettaglio");
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
  const panel = document.getElementById("sint-dettaglio");
  if (!panel) return;

  const cliente = (state.clienti || []).find(function (c) {
    return c.id === clienteId;
  });
  const adp = (state.adempimenti || []).find(function (a) {
    return a.id === adempimentoId;
  });
  let periodi = (state.sintesiData || []).filter(function (r) {
    return r.cliente_id === clienteId && r.id_adempimento === adempimentoId;
  });
  periodi = _sintesiOrdinaPeriodi(periodi);

  // Popola lo store globale _rowStore (definito in adempimenti-pill.js)
  // così openAdpById(id) può recuperare il record completo.
  if (typeof storeRow === "function") {
    periodi.forEach(function (p) {
      storeRow(p);
    });
  }

  let gridHtml = "";
  let doneN = 0;
  const totN = periodi.length;
  if (periodi.length) {
    const chips = periodi
      .map(function (p, idx) {
        const stato = p.stato || "da_fare";
        if (stato === "completato") doneN++;
        const info = _SINT_STATO_INFO[stato] || _SINT_STATO_INFO.da_fare;
        const shortLabel =
          typeof getPeriodoShort === "function" ? getPeriodoShort(p) : "-";
        const fullLabel =
          typeof getPeriodoLabel === "function" ? getPeriodoLabel(p) : "-";
        const tooltip =
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

  let rowsHtml = "";
  if (!periodi.length) {
    rowsHtml =
      '<tr><td colspan="5" style="text-align:center;color:var(--t3);padding:16px">➖ Adempimento non applicato / non generato per questo cliente nell\'anno ' +
      state.anno +
      "</td></tr>";
  } else {
    periodi.forEach(function (p, idx) {
      const stato = p.stato || "da_fare";
      const info = _SINT_STATO_INFO[stato] || _SINT_STATO_INFO.da_fare;
      const periodoLabel =
        typeof getPeriodoLabel === "function" ? getPeriodoLabel(p) : "-";
      rowsHtml +=
        '<tr data-pidx="' +
        idx +
        '" data-pid="' +
        p.id +
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
        '</td><td style="text-align:center;white-space:nowrap">' +
        '<button class="btn btn-xs btn-secondary sint-dett-edit-btn" ' +
        'onclick="event.stopPropagation(); sintesiEditPeriodo(' +
        p.id +
        ')" ' +
        'title="Modifica questo periodo" ' +
        'style="padding:2px 8px;font-size:12px">✏️</button>' +
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
    "<thead><tr><th>Periodo</th><th>Stato</th><th>Scadenza</th><th>Completato il</th><th style='text-align:center'>Azioni</th></tr></thead>" +
    "<tbody>" +
    rowsHtml +
    "</tbody></table></div>";
  panel.style.display = "block";

  document.querySelectorAll(".sint-cell.active").forEach(function (el) {
    el.classList.remove("active");
  });
  const key = clienteId + "|" + adempimentoId;
  const cellEl = document.querySelector('.sint-cell[data-key="' + key + '"]');
  if (cellEl) cellEl.classList.add("active");
}

function _sintesiDettScrollTo(idx) {
  const row = document.querySelector(
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
// STAMPA LISTA COMPLETA - RISPETTA TUTTI I FILTRI (incluso multi‑tipo)
// ═══════════════════════════════════════════════════════════════

function stampaSintesiCompleta() {
  const data = _sintesiCache;

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
  const adpSel = document.getElementById("sint-filtro-adp");
  const selectedAdpIds = adpSel
    ? Array.from(adpSel.selectedOptions || []).map(function (o) {
        return parseInt(o.value);
      })
    : [];

  const clienteSel = document.getElementById("sint-filtro-cliente");
  const filtroClienteIds = clienteSel
    ? Array.from(clienteSel.selectedOptions || []).map(function (o) {
        return parseInt(o.value);
      })
    : [];

  // FILTRO TIPO UTENTE (multi‑select)
  const tipoSel = document.getElementById("sint-filtro-tipo-utente");
  const filtroTipiUtente = tipoSel
    ? Array.from(tipoSel.selectedOptions || []).map(function (o) {
        return o.value;
      })
    : [];

  const searchTerm = (getSharedClienteSearch() || "").toLowerCase();

  // ---- 2. Filtra clienti (attivi, search, cliente specifico, tipi utente) ----
  const clienti = (state.clienti || []).filter(function (c) {
    if (c.attivo === 0 || c.attivo === "0" || c.attivo === false) return false;
    if (filtroClienteIds.length > 0 && filtroClienteIds.indexOf(c.id) === -1)
      return false;
    if (
      filtroTipiUtente.length > 0 &&
      !filtroTipiUtente.includes(c.tipologia_codice)
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
  clienti.sort(function (a, b) {
    return (a.nome || "").localeCompare(b.nome || "", "it", {
      sensitivity: "base",
    });
  });

  // ---- 3. Filtra adempimenti (anno e selezione) ----
  const allDefs = (state.adempimenti || []).filter(function (a) {
    return (
      !a.anno_validita || parseInt(a.anno_validita) === parseInt(state.anno)
    );
  });
  const columns = selectedAdpIds.length
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
  const lookup = {};
  (state.sintesiData || []).forEach(function (r) {
    const k = r.cliente_id + "|" + r.id_adempimento;
    if (!lookup[k]) lookup[k] = [];
    lookup[k].push(r);
  });

  // ---- 5. Stato filtri cella ----
  const statoFiltriAttivi = _sintesiStatoFiltriAttivi();

  // ---- 6. Per ogni cliente, costruisci la lista di adempimenti da mostrare ----
  const clientiDaStampare = [];
  clienti.forEach(function (cliente) {
    const adempimentiCliente = [];
    columns.forEach(function (adp) {
      const key = cliente.id + "|" + adp.id;
      const periodi = lookup[key] || [];
      const st = _sintesiStatoCella(periodi);
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

  // ---- 7. Genera HTML per la stampa — VERO FOGLIO DI CALCOLO ----
  const htmlParts = [];
  htmlParts.push(
    '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Sintesi Adempimenti ' +
      state.anno +
      "</title><style>",
  );
  htmlParts.push(
    '@page{size:landscape;margin:10mm 10mm 14mm;@bottom-right{content:"Pagina " counter(page) " di " counter(pages);font-family:Arial,sans-serif;font-size:9px;color:#555}}',
  );
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
      const cliente = item.cliente;
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
      const byAdpId = {};
      item.adempimenti.forEach(function (ai) {
        byAdpId[ai.adp.id] = ai;
      });
      columns.forEach(function (adp) {
        const ai = byAdpId[adp.id];
        if (!ai) {
          htmlParts.push('<td class="bg-na">—</td>');
          return;
        }
        const st = ai.stato;
        if (ai.periodi.length > 1) {
          const sortedPer = ai.periodi.slice().sort(function (a, b) {
            if (a.mese != null && b.mese != null) return a.mese - b.mese;
            if (a.trimestre != null && b.trimestre != null)
              return a.trimestre - b.trimestre;
            if (a.semestre != null && b.semestre != null)
              return a.semestre - b.semestre;
            return 0;
          });
          const chips = sortedPer
            .map(function (p) {
              const pKind =
                p.stato === "completato"
                  ? "done"
                  : p.stato === "in_corso"
                    ? "partial"
                    : p.stato === "n_a"
                      ? "na"
                      : "todo";
              const pShort =
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
          const icon =
            st.kind === "done"
              ? "✔"
              : st.kind === "partial"
                ? "◐"
                : st.kind === "todo"
                  ? "☐"
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
        '<span><span class="sw" style="background:#c0392b"></span>Da fare</span>' +
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

  const html = htmlParts.join("");

  const iframe = document.createElement("iframe");
  iframe.style.position = "absolute";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  iframe.contentWindow.focus();
  iframe.contentWindow.print();

  setTimeout(function () {
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
  }, 10000);
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
window.stampaSintesiCompleta = stampaSintesiCompleta;
window.onSintesiTipoUtenteChange = onSintesiTipoUtenteChange;
