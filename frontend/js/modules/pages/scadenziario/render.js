// ═══════════════════════════════════════════════════════════════
// SCADENZARIO-RENDER.JS — Render pagina, select cliente, tabella
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// SCADENZARIO.JS — Scadenzario singolo cliente con configurazione annuale
// ═══════════════════════════════════════════════════════════════

function getAdempimentiMancanti() {
  if (!state.selectedCliente) return [];
  return state.adempimenti.filter((a) => !state.adpInseriti.includes(a.id));
}

function hasDatiDaGenerare() {
  if (!state.selectedCliente) return false;
  if (!state.scadenzario || state.scadenzario.length === 0) return true;
  return getAdempimentiMancanti().length > 0;
}

function renderBtnAddAdp(id_cliente) {
  const mancanti = getAdempimentiMancanti();
  if (!mancanti.length)
    return `<button class="btn btn-sm btn-purple" disabled style="opacity:0.4;cursor:not-allowed" title="Tutti gli adempimenti sono già inseriti">✓ Tutti inseriti</button>`;
  return `<button class="btn btn-sm btn-purple" onclick="openAddAdp(${id_cliente})" title="Aggiungi un adempimento mancante (${mancanti.length} disponibili)">+ Adempimento <span class="badge-count">${mancanti.length}</span></button>`;
}

function filtraScadPerAdp(idAdp) {
  const sel = document.getElementById("scad-filtro-adp");
  if (!sel) return;

  sel.value = idAdp ? String(idAdp) : "";
  if (sel._ssRefresh) sel._ssRefresh();

  applyScadFiltriAdp();

  const scadContent = document.getElementById("scad-content");
  if (scadContent) {
    scadContent.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  document.querySelectorAll(".adempimento-filter-btn").forEach((btn) => {
    const btnId = btn
      .getAttribute("onclick")
      .match(/filtraScadPerAdp\((\d+)\)/)?.[1];
    if (btnId === String(idAdp)) {
      btn.style.background = "var(--accent)";
      btn.style.borderColor = "var(--accent)";
      btn.style.color = "white";
    } else {
      btn.style.background = "var(--surface3)";
      btn.style.borderColor = "var(--border)";
      btn.style.color = "var(--text1)";
    }
  });
}

function aggiornaFiltroAdpScad(data) {
  const sel = document.getElementById("scad-filtro-adp");
  if (!sel) return;
  const currentValue = sel.value;

  const adpSet = {};
  data.forEach((r) => {
    adpSet[r.id_adempimento] = r.adempimento_nome;
  });

  sel.innerHTML =
    `<option value="">📋 Tutti adempimenti</option>` +
    Object.entries(adpSet)
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(
        ([id, nome]) =>
          `<option value="${id}" ${currentValue == id ? "selected" : ""}>${nome}</option>`,
      )
      .join("");

  if (!sel.dataset.ssinit) {
    initSearchableSelect("scad-filtro-adp");
  } else if (sel._ssRefresh) {
    sel._ssRefresh();
  }
}

function renderScadenzarioPage() {
  const annoCorrente = state.anno;
  if (typeof socket !== "undefined") {
    socket.emit("get:clienti", { anno: annoCorrente });
    socket.once("res:clienti", ({ success, data }) => {
      if (success && data) {
        state.clienti = data;
        renderScadenzarioSelect(data);
      }
    });
  } else {
    renderScadenzarioSelect(state.clienti);
  }
}

function renderScadenzarioSelect(clienti) {
  const opts = (clienti || [])
    .map(
      (c) =>
        `<option value="${c.id}" ${state.selectedCliente?.id === c.id ? "selected" : ""}>[${c.tipologia_codice || "?"}] ${c.nome}</option>`,
    )
    .join("");

  document.getElementById("topbar-actions").innerHTML = `
    <select class="select topbar-select" id="sel-cliente" onchange="onClienteChange()" title="Seleziona il cliente" style="min-width:200px;max-width:260px">
      <option value="">-- Seleziona Cliente --</option>${opts}
    </select>
    <div class="year-sel">
      <button onclick="changeAnnoScad(-1)" title="Anno precedente">&#9664;</button>
      <span class="year-num">${state.anno}</span>
      <button onclick="changeAnnoScad(1)" title="Anno successivo">&#9654;</button>
    </div>
    <select class="select topbar-select" id="scad-filtro-adp" onchange="applyScadFiltriAdp()" title="Filtra per adempimento specifico" style="min-width:160px;max-width:220px">
      <option value="">📋 Tutti adempimenti</option>
    </select>
    <select class="select topbar-select" id="scad-filtro-stato" onchange="applyScadFiltri()" title="Filtra per stato">
      <option value="">📋 Tutti gli stati</option>
      <option value="da_fare">⭕ Da fare</option>
      <option value="in_corso">🔄 In corso</option>
      <option value="completato">✅ Completato</option>
      <option value="n_a">➖ N/A</option>
    </select>
    <div class="search-wrap" style="width:180px">
      <span class="search-icon">🔍</span>
      <input class="input" id="scad-search" placeholder="Cerca adempimento..." oninput="applyScadSearch()" title="Cerca per nome o codice adempimento">
    </div>`;

  initSearchableSelect("sel-cliente");

  if (state.selectedCliente) loadScadenzario();
  else
    document.getElementById("content").innerHTML =
      `<div class="empty"><div class="empty-icon">📅</div><p>Seleziona un cliente dalla lista in alto</p></div>`;
}

function onClienteChange() {
  const id = parseInt(document.getElementById("sel-cliente").value);
  if (typeof socket !== "undefined") {
    socket.emit("get:cliente", { id, anno: state.anno });
    socket.once("res:cliente", ({ success, data }) => {
      if (success && data) {
        state.selectedCliente = data;
        state.adpInseriti = [];
        const adpSel = document.getElementById("scad-filtro-adp");
        if (adpSel) {
          adpSel.innerHTML = `<option value="">📋 Tutti adempimenti</option>`;
          if (adpSel._ssRefresh) adpSel._ssRefresh();
        }
        loadScadenzario();
      }
    });
  } else {
    state.selectedCliente = state.clienti.find((c) => c.id === id) || null;
    state.adpInseriti = [];
    const adpSel = document.getElementById("scad-filtro-adp");
    if (adpSel) {
      adpSel.innerHTML = `<option value="">📋 Tutti adempimenti</option>`;
      if (adpSel._ssRefresh) adpSel._ssRefresh();
    }
    if (state.selectedCliente) loadScadenzario();
  }
}

function changeAnnoScad(d) {
  state.anno += d;
  document
    .querySelectorAll(".year-num")
    .forEach((el) => (el.textContent = state.anno));
  if (state.selectedCliente) {
    if (typeof socket !== "undefined") {
      socket.emit("get:cliente", {
        id: state.selectedCliente.id,
        anno: state.anno,
      });
      socket.once("res:cliente", ({ success, data }) => {
        if (success && data) {
          state.selectedCliente = data;
          loadScadenzario();
        }
      });
    } else {
      loadScadenzario();
    }
  }
}

function loadScadenzario() {
  const sv = document.getElementById("scad-search")?.value || "";
  const st = document.getElementById("scad-filtro-stato")?.value || "";
  if (typeof socket !== "undefined") {
    if (!state.adempimenti || state.adempimenti.length === 0) {
      socket.emit("get:adempimenti");
    }
    socket.emit("get:scadenzario", {
      id_cliente: state.selectedCliente.id,
      anno: state.anno,
      filtri: { search: sv, stato: st },
    });
    socket.emit("get:adempimenti_cliente", {
      id_cliente: state.selectedCliente.id,
      anno: state.anno,
    });
  }
}

function applyScadFiltriAdp() {
  if (!state.scadenzario) return;
  renderScadenzarioTabella(state.scadenzario);
}

const applyScadSearch = debounce(() => {
  if (state.selectedCliente) loadScadenzario();
}, 300);

function applyScadFiltri() {
  if (state.selectedCliente) loadScadenzario();
}

function filterAdpButtons() {
  const searchInput = document.getElementById("adp-filter-search");
  const container = document.getElementById("adp-buttons-container");
  if (!searchInput || !container) return;

  const query = searchInput.value.toLowerCase().trim();
  const buttons = container.querySelectorAll(".adempimento-filter-btn");

  buttons.forEach((button) => {
    const codice = button.getAttribute("data-adp-codice") || "";
    const nome = button.getAttribute("data-adp-nome") || "";

    if (query === "" || codice.includes(query) || nome.includes(query)) {
      button.style.display = "";
    } else {
      button.style.display = "none";
    }
  });
}

function resetScadFiltri() {
  const statoSelect = document.getElementById("scad-filtro-stato");
  const adpSelect = document.getElementById("scad-filtro-adp");
  const searchInput = document.getElementById("scad-search");
  const adpFilterSearch = document.getElementById("adp-filter-search");

  if (statoSelect) statoSelect.value = "";
  if (adpSelect) {
    adpSelect.value = "";
    if (adpSelect._ssRefresh) adpSelect._ssRefresh();
  }
  if (searchInput) searchInput.value = "";
  if (adpFilterSearch) adpFilterSearch.value = "";

  document.querySelectorAll(".adempimento-filter-btn").forEach((btn) => {
    btn.style.background = "var(--surface3)";
    btn.style.borderColor = "var(--border)";
    btn.style.color = "var(--text1)";
    btn.style.display = "";
  });

  if (state.selectedCliente) loadScadenzario();
}

// ─── RENDER TABELLA ───────────────────────────────────────────
function renderScadenzarioTabella(data) {
  const c = state.selectedCliente;
  if (!c) return;

  aggiornaFiltroAdpScad(data);

  const adpFiltroId = document.getElementById("scad-filtro-adp")?.value || "";
  const dataFiltrata = adpFiltroId
    ? data.filter((r) => String(r.id_adempimento) === String(adpFiltroId))
    : data;

  const totale = dataFiltrata.length;
  const comp = dataFiltrata.filter((r) => r.stato === "completato").length;
  const daF = dataFiltrata.filter((r) => r.stato === "da_fare").length;
  const inC = dataFiltrata.filter((r) => r.stato === "in_corso").length;
  const perc = totale > 0 ? Math.round((comp / totale) * 100) : 0;
  const avatar = getAvatar(c.nome);
  const tipColor = c.tipologia_colore || getTipologiaColor(c.tipologia_codice);
  const sottotipoLabel = c.sottotipologia_nome || getLabelSottotipologia(c);

  const col2Map = {
    privato: "Privato",
    ditta: "Ditta Ind.",
    socio: "Socio",
    professionista: "Prof.",
  };
  const col3Map = {
    ordinario: "Ord.",
    semplificato: "Sempl.",
    forfettario: "Forf.",
    ordinaria: "Ord.",
    semplificata: "Sempl.",
  };
  const pgColor =
    perc === 100 ? "var(--green)" : perc > 50 ? "var(--yellow)" : "var(--red)";

  const hasDati = data && data.length > 0;
  const mancanti = getAdempimentiMancanti();
  const tuttiGenerati =
    hasDati && state.adempimenti.length > 0 && mancanti.length === 0;
  const hasDatiDaGenerare = !tuttiGenerati;

  let generaBtnClass = "btn btn-sm btn-orange";
  let generaBtnTitle = "Genera adempimenti mancanti per l'anno selezionato";
  let generaBtnIcon = "⚡";

  if (!hasDati) {
    generaBtnTitle =
      "Nessun adempimento presente. Genera lo scadenzario per l'anno selezionato";
  } else if (tuttiGenerati) {
    generaBtnClass = "btn btn-sm btn-success";
    generaBtnTitle =
      "✅ Tutti gli adempimenti sono già stati generati per quest'anno";
    generaBtnIcon = "✓";
  } else {
    generaBtnTitle = `Genera ${mancanti.length} adempimento/i mancante/i per l'anno selezionato`;
  }

  const adpFiltroAttivo = adpFiltroId
    ? data.find((r) => String(r.id_adempimento) === String(adpFiltroId))
        ?.adempimento_nome || ""
    : "";
  const filtroBadge = adpFiltroAttivo
    ? `<span style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;background:var(--accent)18;border:1px solid var(--accent)44;border-radius:20px;font-size:12px;color:var(--accent)">
        🔍 ${escAttr(adpFiltroAttivo)}
        <button onclick="resetScadFiltri()" style="background:none;border:none;color:var(--accent);cursor:pointer;font-size:13px;padding:0 2px;line-height:1" title="Rimuovi filtro">✕</button>
      </span>`
    : "";

  const configAnnoInfo =
    c.config_anno && c.config_anno !== state.anno
      ? `<div class="infobox" style="margin-bottom:12px;font-size:12px;background:var(--yellow)18;color:var(--yellow)">
        ⚠️ Configurazione ereditata dall'anno ${c.config_anno} (nessuna configurazione specifica per il ${state.anno})
       </div>`
      : "";

  const adempimentiButtons =
    state.adempimentiCliente && state.adempimentiCliente.length > 0
      ? `
    <div class="adempimenti-buttons-section" style="margin-top:16px;padding:16px;background:var(--surface2);border-radius:8px;border:1px solid var(--border)">
      <div style="font-size:13px;font-weight:600;color:var(--text2);margin-bottom:12px;display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:6px">
          📋 Adempimenti del cliente
          <span style="font-size:11px;color:var(--text3);font-weight:400">(clicca per filtrare)</span>
        </div>
        <div class="search-wrap" style="width:200px;margin:0">
          <input 
            class="input" 
            id="adp-filter-search" 
            placeholder="Cerca adempimenti..." 
            oninput="filterAdpButtons()" 
            title="Cerca adempimenti per codice o nome"
            style="font-size:12px;padding:4px 8px;height:28px"
          >
        </div>
      </div>
      <div class="adempimenti-buttons-grid" id="adp-buttons-container" style="display:flex;flex-wrap:wrap;gap:8px">
        ${state.adempimentiCliente
          .map(
            (adp) => `
          <button 
            class="btn btn-sm adempimento-filter-btn" 
            data-adp-codice="${escAttr(adp.codice.toLowerCase())}"
            data-adp-nome="${escAttr(adp.nome.toLowerCase())}"
            onclick="filtraScadPerAdp(${adp.id})"
            title="Filtra per ${escAttr(adp.nome)}"
            style="background:var(--surface3);border:1px solid var(--border);color:var(--text1);font-size:12px;padding:6px 12px;border-radius:6px;transition:all 0.2s"
            onmouseover="this.style.background='var(--accent)18';this.style.borderColor='var(--accent)44';this.style.color='var(--accent)'"
            onmouseout="this.style.background='var(--surface3)';this.style.borderColor='var(--border)';this.style.color='var(--text1)'"
          >
            <span style="font-weight:600">${adp.codice}</span>
            <span style="margin-left:4px;opacity:0.8">${adp.nome}</span>
          </button>
        `,
          )
          .join("")}
        <button 
          class="btn btn-sm" 
          onclick="resetScadFiltri()"
          title="Rimuovi tutti i filtri"
          style="background:var(--red);border:1px solid var(--red);color:white;font-size:12px;padding:6px 12px;border-radius:6px"
        >
          ✕ Cancella filtri
        </button>
      </div>
    </div>
  `
      : "";

  const clienteCard = `<div class="cliente-preview-card" style="border-left-color:${tipColor}">
    <div class="cpc-inner">
      <div class="cpc-avatar" style="border-color:${tipColor};color:${tipColor};background:${tipColor}22">${avatar}</div>
      <div class="cpc-info">
        <div class="cpc-nome">${escAttr(c.nome)}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:2px">Configurazione per l'anno <strong>${state.anno}</strong></div>
        ${filtroBadge ? `<div style="margin-top:6px">${filtroBadge}</div>` : ""}
        <div class="cpc-badges">
          <span class="badge b-${(c.tipologia_codice || "").toLowerCase()}" title="${TIPOLOGIE_INFO[c.tipologia_codice]?.desc || ""}">${c.tipologia_codice || "-"}</span>
          ${sottotipoLabel ? `<span class="badge b-categoria">${sottotipoLabel}</span>` : ""}
          ${c.col2_value ? `<span class="badge-info">${col2Map[c.col2_value] || c.col2_value}</span>` : ""}
          ${c.col3_value ? `<span class="badge-info">${col3Map[c.col3_value] || c.col3_value}</span>` : ""}
          ${c.periodicita && c.col2_value !== "privato" ? `<span class="badge-per">${c.periodicita === "mensile" ? "📅 Mensile" : c.periodicita === "annuale" ? "📅 Annuale" : "📆 Trimestrale"}</span>` : ""}
        </div>
        <div class="cpc-meta-row">
          ${c.codice_fiscale ? `<span class="cpc-meta-chip">CF: <strong>${c.codice_fiscale}</strong></span>` : ""}
          ${c.partita_iva ? `<span class="cpc-meta-chip">P.IVA: <strong>${c.partita_iva}</strong></span>` : ""}
          ${c.email ? `<span class="cpc-meta-chip">📧 ${c.email}</span>` : ""}
          ${c.telefono ? `<span class="cpc-meta-chip">📞 ${c.telefono}</span>` : ""}
        </div>
      </div>
      <div class="cpc-stats">
        <div class="cpc-stat-item"><div class="cpc-stat-num">${totale}</div><div class="cpc-stat-lbl">Totale</div></div>
        <div class="cpc-stat-item"><div class="cpc-stat-num" style="color:var(--green)">${comp}</div><div class="cpc-stat-lbl">Comp.</div></div>
        <div class="cpc-stat-item"><div class="cpc-stat-num" style="color:var(--red)">${daF}</div><div class="cpc-stat-lbl">Da fare</div></div>
        <div class="cpc-stat-item"><div class="cpc-stat-num" style="color:var(--yellow)">${inC}</div><div class="cpc-stat-lbl">In corso</div></div>
        <div class="cpc-stat-item">
          <div class="cpc-stat-num" style="color:${pgColor}">${perc}%</div>
          <div class="cpc-stat-lbl">Progresso</div>
          <div class="mini-bar" style="margin-top:5px;width:55px"><div class="mini-fill" style="width:${perc}%;background:${pgColor}"></div></div>
        </div>
      </div>
    </div>
    <div class="cpc-actions no-print">
      <button class="btn btn-sm btn-cyan" onclick="openCopia()">📋 Copia</button>
      ${renderBtnAddAdp(c.id)}
      <button class="btn btn-sm btn-purple" onclick="openPaginaBiancaPerCliente(${c.id}, '${escAttr(c.nome)}')" title="Appunti per questo cliente">📄 Appunti</button>
      <button class="btn btn-print btn-sm" style="margin-left:auto" onclick="window.print()">🖨️ Stampa</button>
    </div>
    ${renderClienteDatiRiferimento(c)}
  </div>
  ${adempimentiButtons}`;

  // Raggruppa per adempimento
  const grouped = {};
  dataFiltrata.forEach((r) => {
    storeRow(r);
    const key = r.id_adempimento;
    if (!grouped[key])
      grouped[key] = {
        nome: r.adempimento_nome,
        codice: r.adempimento_codice,
        scadenza_tipo: r.scadenza_tipo,
        is_contabilita: r.is_contabilita,
        has_rate: r.has_rate,
        is_checkbox: r.is_checkbox,
        rows: [],
      };
    grouped[key].rows.push(r);
  });

  const gruppiOrdinati = Object.values(grouped).sort((a, b) =>
    a.nome.localeCompare(b.nome, "it", { sensitivity: "base" }),
  );

  let content = "";
  gruppiOrdinati.forEach((g) => {
    const compG = g.rows.filter((r) => r.stato === "completato").length;
    const totG = g.rows.length;
    const pG = totG > 0 ? Math.round((compG / totG) * 100) : 0;
    const pgColorG =
      pG === 100 ? "var(--green)" : pG > 50 ? "var(--yellow)" : "var(--red)";

    const rowsOrdinati = [...g.rows].sort((a, b) => {
      if (a.data_scadenza && b.data_scadenza) {
        const dateA = new Date(a.data_scadenza);
        const dateB = new Date(b.data_scadenza);
        if (dateA - dateB !== 0) return dateB - dateA;
        return a.adempimento_nome.localeCompare(b.adempimento_nome, "it", {
          sensitivity: "base",
        });
      }
      if (a.data_scadenza) return -1;
      if (b.data_scadenza) return 1;
      return a.adempimento_nome.localeCompare(b.adempimento_nome, "it", {
        sensitivity: "base",
      });
    });

    const periodiHtml = rowsOrdinati.map((r) => renderPeriodoPill(r)).join("");
    const isMensile = g.rows.length > 4;
    content += `<div class="adp-card">
      <div class="adp-card-header">
        <span class="adp-codice">${g.codice}</span>
        <span class="adp-nome">${g.nome}</span>
        <span class="adp-tipo-badge">${g.scadenza_tipo}</span>
        <div style="margin-left:auto;display:flex;align-items:center;gap:10px">
          <div class="mini-bar" style="width:70px"><div class="mini-fill" style="width:${pG}%;background:${pgColorG}"></div></div>
          <span style="font-size:13px;font-family:var(--mono);color:${pgColorG}">${compG}/${totG}</span>
        </div>
      </div>
      <div class="adp-card-periodi${isMensile ? " periodi-mensili" : ""}">${periodiHtml}</div>
    </div>`;
  });

  if (!content)
    content = `<div class="empty">
      <div class="empty-icon">📅</div>
      <p>Nessun adempimento per ${state.anno}</p>
    </div>`;

  document.getElementById("content").innerHTML =
    configAnnoInfo + clienteCard + `<div id="scad-content">${content}</div>`;
}
