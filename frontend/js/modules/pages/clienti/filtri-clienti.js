function getFiltriPerRequest() {
  // Nessuno selezionato manualmente → filtro vuoto (0 clienti)
  if (_filtroManualeNessuno || _activeFiltroKeys.size === 0) {
    return { nessuno: true };
  }
  // Tutti selezionati → nessun filtro (mostra tutto)
  const allKeys = _getAllKeys();
  if (_activeFiltroKeys.size === allKeys.length) {
    return {};
  }

  const tipologie = new Set();
  const col2Values = new Set();
  const col3Values = new Set();
  const periodicitaValues = new Set();
  const chiavi = [];
  const col2L2Db = _col2LabelToDb();
  const col3L2Db = _col3LabelToDb();

  _activeFiltroKeys.forEach((key) => {
    const [tip, col2, col3, per] = key.split("|");
    if (tip) tipologie.add(tip);
    if (col2) col2Values.add(col2L2Db[col2] || col2.toLowerCase());
    if (col3) col3Values.add(col3L2Db[col3] || col3.toLowerCase());
    if (per) periodicitaValues.add(per);
    chiavi.push(key);
  });

  return {
    tipologie: Array.from(tipologie),
    col2_values: Array.from(col2Values),
    col3_values: Array.from(col3Values),
    periodicita_values: Array.from(periodicitaValues),
    chiavi_attive: chiavi,
  };
}

// ─── ANNO MIN/MAX ─────────────────────────────────────────────
const ANNO_MIN = 2000;
const ANNO_MAX = 2200;

function buildAnniOptions(selectedAnno) {
  const opts = [];
  for (let y = ANNO_MIN; y <= ANNO_MAX; y++) {
    opts.push(
      `<option value="${y}" ${y === selectedAnno ? "selected" : ""}>${y}</option>`,
    );
  }
  return opts.join("");
}

// ─── FILTRI DB ────────────────────────────────────────────────
function applyClientiFiltriImmediate() {
  const search = document.getElementById("global-search-clienti")?.value || "";
  const anno =
    parseInt(document.getElementById("filter-anno")?.value) ||
    new Date().getFullYear();
  const filtriTip = getFiltriPerRequest();

  if (typeof socket !== "undefined") {
    socket.emit("get:clienti", {
      search,
      anno,
      filtri_tipologie: filtriTip,
      tipologia: filtriTip.tipologie ? filtriTip.tipologie.join(",") : "",
      col2: filtriTip.col2_values ? filtriTip.col2_values.join(",") : "",
      col3: filtriTip.col3_values ? filtriTip.col3_values.join(",") : "",
      periodicita: filtriTip.periodicita_values
        ? filtriTip.periodicita_values.join(",")
        : "",
      nessuno: filtriTip.nessuno || false,
    });
  }
}

const applyClientiFiltriDB = debounce(applyClientiFiltriImmediate, 300);

function applyClientiFiltri() {
  applyClientiFiltriDB();
}

function resetClientiFiltri() {
  const s = document.getElementById("global-search-clienti");
  if (s) s.value = "";
  setSharedClienteSearch("");
  const annoSelect = document.getElementById("filter-anno");
  if (annoSelect) annoSelect.value = new Date().getFullYear();
  initializeTipologieFilter();
  _refreshTipFiltroPanel();
  salvaFiltriSuStorage(); // Salva il reset
  if (typeof socket !== "undefined")
    socket.emit("get:clienti", { anno: new Date().getFullYear() });
}

// ─── RENDER LISTA ─────────────────────────────────────────────
function renderClientiPage() {
  // Ensure filters are properly initialized before rendering
  if (
    _activeFiltroKeys.size === 0 &&
    !_filtroManualeNessuno &&
    _getAllKeys().length > 0
  ) {
    initializeTipologieFilter();
    // Force a filter refresh to ensure all clients are loaded
    setTimeout(() => {
      applyClientiFiltriImmediate();
    }, 100);
    return; // Exit early, will be called again after filters are ready
  }

  // Double-check that we have valid filter state
  if (_activeFiltroKeys.size === 0 && !_filtroManualeNessuno && _cfg()) {
    initializeTipologieFilter();
    setTimeout(() => {
      renderClientiPage();
    }, 50);
    return;
  }

  renderClientiTabella(state.clienti);
}

function renderClientiTabella(clienti) {
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
  const periodicitaMap = {
    mensile: "Mensile",
    trimestrale: "Trimestrale",
    annuale: "Annuale",
  };

  const currentAnno =
    parseInt(document.getElementById("filter-anno")?.value) ||
    new Date().getFullYear();
  const allKeys = _getAllKeys();
  const isAll =
    !_filtroManualeNessuno && _activeFiltroKeys.size === allKeys.length;
  const isNone = _filtroManualeNessuno || _activeFiltroKeys.size === 0;
  const activeCount = isNone ? 0 : _activeFiltroKeys.size;
  const totalKeys = allKeys.length;

  const filterBar = `
    <div class="filtri-avanzati no-print" style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap;align-items:center;padding:12px 16px;background:var(--surface2);border-radius:var(--r-sm);">
      <span style="font-size:11px;color:var(--text3);font-weight:700;">📅 Anno:</span>
      <select id="filter-anno" class="select" style="width:110px" onchange="applyClientiFiltri()" title="Filtra per anno">
        ${buildAnniOptions(currentAnno)}
      </select>
      <button class="btn btn-sm btn-primary" onclick="resetClientiFiltri()" style="margin-left:auto">⟳ Reset</button>
    </div>

    <div style="margin-bottom:16px">
      <div id="tip-filtro-header-row" style="display:flex;align-items:center;gap:10px;margin-bottom:6px;padding:10px 14px;background:var(--s2);border:1px solid var(--b0);border-radius:var(--r-sm);">
        <span style="font-size:12px;font-weight:700;color:var(--t2);text-transform:uppercase;letter-spacing:.06em">🏷️ Filtro Tipologie</span>
        <span id="tip-filtro-count" style="display:${isNone ? "inline-flex" : !isAll ? "inline-flex" : "none"};align-items:center;justify-content:center;min-width:20px;height:20px;padding:0 6px;background:${isNone ? "var(--red)" : "var(--accent)"};color:#fff;border-radius:10px;font-size:11px;font-weight:700">${isNone ? "0" : activeCount}</span>
        ${isNone ? `<span style="font-size:11px;color:var(--red);font-weight:700">⚠️ Nessuno selezionato</span>` : ""}
        <div class="tip-filtro-toggle-btn" style="margin-left:auto" onclick="event.stopPropagation()">
          ${
            _tipFiltroPanelOpen
              ? `<button class="btn btn-xs btn-secondary" onclick="closeTipFiltroPanel(event)">✕ Chiudi</button>`
              : `<button class="btn btn-xs btn-secondary" onclick="toggleTipFiltroPanel(event)">▼ Espandi</button>`
          }
        </div>
      </div>
      <div id="tip-filtro-container" style="display:${_tipFiltroPanelOpen ? "block" : "none"}">
        ${renderTipologieFiltroPanel()}
      </div>
    </div>`;

  let tableRows = "";
  if (!clienti || clienti.length === 0) {
    if (isNone) {
      tableRows = `<tr><td colspan="5"><div class="empty"><div class="empty-icon">🏷️</div><p>Nessun filtro selezionato — clicca <strong>✦ Tutti</strong> per vedere tutti i clienti</p></div></td></tr>`;
    } else {
      tableRows = `<tr><td colspan="5"><div class="empty"><div class="empty-icon">👥</div><p>Nessun cliente trovato per l'anno ${currentAnno}</p></div></td></tr>`;
    }
  } else {
    tableRows = clienti
      .map((c) => {
        const tipColor =
          c.tipologia_colore || getTipologiaColor(c.tipologia_codice);
        const avatar = getAvatar(c.nome);
        const sottotipoLabel = c.sottotipologia_nome || "";
        const tipInfo = TIPOLOGIE_INFO[c.tipologia_codice] || {};
        const tipBadge = `<span class="badge b-${(c.tipologia_codice || "").toLowerCase()}"
        style="background:${tipColor}22;color:${tipColor};border:1px solid ${tipColor}44;font-size:12px"
        title="${tipInfo.desc || c.tipologia_codice}">${tipInfo.icon || ""} ${c.tipologia_codice || "-"}</span>`;

        let colBadges = "";
        if (c.col2_value)
          colBadges += `<span class="badge-info" style="font-size:11px">📁 ${col2Map[c.col2_value] || c.col2_value}</span>`;
        if (c.col3_value)
          colBadges += `<span class="badge-info" style="font-size:11px">⚙️ ${col3Map[c.col3_value] || c.col3_value}</span>`;
        if (c.periodicita && c.col2_value !== "privato")
          colBadges += `<span class="badge-per" style="font-size:11px">📅 ${periodicitaMap[c.periodicita] || c.periodicita}</span>`;

        const configInfo =
          c.config_anno && c.config_anno !== currentAnno
            ? `<div style="font-size:9px;color:var(--yellow);margin-top:3px" title="Configurazione ereditata dal ${c.config_anno}">📌 eredita ${c.config_anno}</div>`
            : "";

        return `<tr class="clickable clienti-bulk-row" data-id="${c.id}" onclick="showClienteDettaglio(${c.id})" style="cursor:pointer">
        <td class="no-print" style="padding:12px 10px 12px 16px;width:36px" onclick="event.stopPropagation()">
          <input type="checkbox" class="clienti-bulk-cb" data-id="${c.id}" onchange="aggiornaClientiBulkToolbar()" style="width:16px;height:16px;cursor:pointer;accent-color:var(--red)">
        </td>
        <td style="padding:12px 16px">
          <div style="display:flex;align-items:center;gap:12px">
            <div class="cliente-avatar-sm" style="background:${tipColor}22;border-color:${tipColor};color:${tipColor};width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:10px;font-weight:800;font-size:${avatarFontSize(avatar, 13)}">${avatar}</div>
            <div>
              <div style="font-weight:700;font-size:15px">${escAttr(c.nome)}</div>
              <div style="font-size:11px;color:var(--t3);font-family:var(--mono);margin-top:2px">${c.codice_fiscale || c.partita_iva || "—"}</div>
              ${configInfo}
            </div>
          </div>
        </td>
        <td style="padding:12px 16px">
          <div style="display:flex;flex-wrap:wrap;gap:5px;align-items:center">${tipBadge} ${colBadges}</div>
          ${sottotipoLabel ? `<div style="font-size:10px;color:var(--t3);margin-top:4px">🏷️ ${sottotipoLabel}</div>` : ""}
        </td>
        <td style="padding:12px 16px;color:var(--t2);font-size:13px">${c.email || "—"}</td>
        <td class="no-print" style="padding:12px 16px;white-space:nowrap">
          <div style="display:flex;gap:6px;flex-wrap:wrap" onclick="event.stopPropagation()">
            <button class="btn btn-xs btn-secondary" onclick="editCliente(${c.id})"    title="Modifica">✏️</button>
            <button class="btn btn-xs btn-success"   onclick="goScadenzario(${c.id})"  title="Scadenzario">📅</button>
            <button class="btn btn-xs btn-purple"    onclick="openPaginaBiancaPerCliente(${c.id}, '${escAttr(c.nome)}')" title="Appunti per questo cliente">📄</button>
            <button class="btn btn-xs btn-danger"    onclick="deleteCliente(${c.id})"  title="Elimina">🗑️</button>
          </div>
        </td>
      </tr>`;
      })
      .join("");
  }

  const html = `${filterBar}
    <div class="table-wrap">
      <div class="table-header no-print" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <h3>Clienti <span style="font-size:13px;color:var(--t3);margin-left:8px">(${clienti ? clienti.length : 0})</span></h3>
        <div id="clienti-bulk-toolbar" style="display:none;margin-left:auto;display:none;align-items:center;gap:8px">
          <span id="clienti-bulk-count" style="font-size:13px;color:var(--t2);font-weight:600"></span>
          <button class="btn btn-sm btn-danger" onclick="eliminaClientiSelezionati()">🗑️ Elimina selezionati</button>
          <button class="btn btn-sm btn-secondary" onclick="deselezionaTuttiClienti()">✕ Deseleziona</button>
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:var(--s2);border-bottom:1px solid var(--b0)">
            <th class="no-print" style="padding:12px 10px 12px 16px;width:36px">
              <input type="checkbox" id="clienti-select-all" onchange="toggleSelezionaTuttiClienti(this)" style="width:16px;height:16px;cursor:pointer;accent-color:var(--red)" title="Seleziona tutti">
            </th>
            <th style="text-align:left;padding:12px 16px;font-size:12px;color:var(--t2)">Cliente</th>
            <th style="text-align:left;padding:12px 16px;font-size:12px;color:var(--t2)">Classificazione ${currentAnno}</th>
            <th style="text-align:left;padding:12px 16px;font-size:12px;color:var(--t2)">Email</th>
            <th style="text-align:left;padding:12px 16px;font-size:12px;color:var(--t2)" class="no-print">Azioni</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>`;

  document.getElementById("content").innerHTML = html;
}

// ── BULK CLIENTI ────────────────────────────────────────────────
function aggiornaClientiBulkToolbar() {
  const cbs = document.querySelectorAll(".clienti-bulk-cb:checked");
  const toolbar = document.getElementById("clienti-bulk-toolbar");
  const countEl = document.getElementById("clienti-bulk-count");
  const selAll = document.getElementById("clienti-select-all");
  const allCbs = document.querySelectorAll(".clienti-bulk-cb");
  if (!toolbar) return;
  const n = cbs.length;
  if (n > 0) {
    toolbar.style.display = "flex";
    countEl.textContent = n + (n === 1 ? " selezionato" : " selezionati");
  } else {
    toolbar.style.display = "none";
  }
  if (selAll) {
    selAll.checked = n > 0 && n === allCbs.length;
    selAll.indeterminate = n > 0 && n < allCbs.length;
  }
}

function toggleSelezionaTuttiClienti(cb) {
  document.querySelectorAll(".clienti-bulk-cb").forEach((el) => {
    el.checked = cb.checked;
  });
  aggiornaClientiBulkToolbar();
}

function deselezionaTuttiClienti() {
  document.querySelectorAll(".clienti-bulk-cb").forEach((el) => {
    el.checked = false;
  });
  const selAll = document.getElementById("clienti-select-all");
  if (selAll) {
    selAll.checked = false;
    selAll.indeterminate = false;
  }
  aggiornaClientiBulkToolbar();
}

function eliminaClientiSelezionati() {
  const cbs = document.querySelectorAll(".clienti-bulk-cb:checked");
  if (cbs.length === 0) return;
  const ids = Array.from(cbs).map((cb) => parseInt(cb.dataset.id));

  // Prima controlla quali si possono eliminare
  if (typeof socket === "undefined") return;
  socket.emit("check:clienti:bulk", { ids });
  socket.once("res:check:clienti:bulk", ({ success, results }) => {
    if (!success) {
      showNotif("Errore durante il controllo", "error");
      return;
    }

    const eliminabili = results.filter((r) => r.canDelete);
    const nonEliminabili = results.filter((r) => !r.canDelete);

    let msg = `Stai per eliminare ${eliminabili.length} client${eliminabili.length === 1 ? "e" : "i"}`;
    if (nonEliminabili.length > 0) {
      msg += `\n\n⚠️ ${nonEliminabili.length} non eliminabil${nonEliminabili.length === 1 ? "e" : "i"} (hanno adempimenti):\n`;
      msg += nonEliminabili
        .map((r) => `• ${r.nome} (${r.adempimentiCount} adempimenti)`)
        .join("\n");
    }
    if (eliminabili.length === 0) {
      showNotif(
        "Nessun cliente selezionato può essere eliminato (hanno tutti adempimenti associati)",
        "warning",
      );
      return;
    }
    msg += "\n\nConfermi?";
    if (!confirm(msg)) return;
    socket.emit("delete:clienti:bulk", { ids: eliminabili.map((r) => r.id) });
    socket.once("res:delete:clienti:bulk", ({ ok, failed }) => {
      deselezionaTuttiClienti();
    });
  });
}

window.aggiornaClientiBulkToolbar = aggiornaClientiBulkToolbar;
window.toggleSelezionaTuttiClienti = toggleSelezionaTuttiClienti;
window.deselezionaTuttiClienti = deselezionaTuttiClienti;
window.eliminaClientiSelezionati = eliminaClientiSelezionati;

// Fine clienti-filtri.js
