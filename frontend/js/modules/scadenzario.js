// ═══════════════════════════════════════════════════════════════
// SCADENZARIO.JS — Scadenzario singolo cliente
// ═══════════════════════════════════════════════════════════════

function getAdempimentiMancanti() {
  if (!state.selectedCliente) return [];
  const cat = JSON.parse(state.selectedCliente.categorie_attive || "[]");
  const compatibili = state.adempimenti.filter(a => a.categoria === "TUTTI" || cat.includes(a.categoria));
  return compatibili.filter(a => !state.adpInseriti.includes(a.id));
}

function renderBtnAddAdp(id_cliente) {
  const mancanti = getAdempimentiMancanti();
  if (!mancanti.length)
    return `<button class="btn btn-sm btn-purple" disabled style="opacity:0.4;cursor:not-allowed" title="Tutti gli adempimenti compatibili sono già inseriti">✓ Tutti inseriti</button>`;
  return `<button class="btn btn-sm btn-purple" onclick="openAddAdp(${id_cliente})" title="Aggiungi un adempimento mancante (${mancanti.length} disponibili)">+ Adempimento <span style="font-size:10px;background:rgba(255,255,255,0.2);border-radius:10px;padding:1px 6px;margin-left:2px">${mancanti.length}</span></button>`;
}

// ─── SEZIONE RIEPILOGO ADEMPIMENTI DEL CLIENTE ────────────────
function renderAdpRiepilogoCliente(data) {
  if (!data || !data.length) return "";

  // Raggruppa per adempimento
  const adpMap = {};
  data.forEach(r => {
    const key = r.id_adempimento;
    if (!adpMap[key]) adpMap[key] = {
      nome: r.adempimento_nome,
      codice: r.adempimento_codice,
      categoria: r.categoria,
      scadenza_tipo: r.scadenza_tipo,
      rows: []
    };
    adpMap[key].rows.push(r);
  });

  // Raggruppa per categoria
  const catMap = {};
  Object.values(adpMap).forEach(g => {
    const cat = g.categoria || "ALTRI";
    if (!catMap[cat]) catMap[cat] = [];
    catMap[cat].push(g);
  });

  const scadIcons = { annuale: "📅", semestrale: "📆", trimestrale: "📊", mensile: "🗓️" };

  let html = `<div class="table-wrap" style="margin-bottom:20px">
    <div class="table-header" style="background:var(--surface2)">
      <span style="font-size:18px">📋</span>
      <h3 style="font-size:15px">Riepilogo Adempimenti — ${state.selectedCliente?.nome || ""}</h3>
      <span style="font-size:12px;color:var(--text3);margin-left:4px">${Object.keys(adpMap).length} adempimenti · Anno ${state.anno}</span>
    </div>
    <div style="padding:14px;display:flex;flex-direction:column;gap:12px">`;

  Object.entries(catMap).forEach(([catCode, items]) => {
    const catInfo  = CATEGORIE.find(x => x.codice === catCode);
    const catColor = catInfo?.color || "var(--accent)";

    html += `<div>
      <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--surface2);border-radius:var(--r-sm) var(--r-sm) 0 0;border-left:3px solid ${catColor}">
        <span style="font-size:17px">${catInfo?.icona || "📋"}</span>
        <span style="color:${catColor};font-weight:800;font-size:14px">${catCode}</span>
        <span style="font-size:12px;color:var(--text3)">${items.length} adempiment${items.length===1?"o":"i"}</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px;padding:10px;background:var(--surface);border:1px solid var(--border);border-top:none;border-radius:0 0 var(--r-sm) var(--r-sm)">`;

    items.forEach(g => {
      const comp = g.rows.filter(r => r.stato === "completato").length;
      const tot  = g.rows.length;
      const p    = tot > 0 ? Math.round((comp / tot) * 100) : 0;
      const pgColor = p === 100 ? "var(--green)" : p > 50 ? "var(--yellow)" : "var(--red)";

      // Badge stati
      const daFare     = g.rows.filter(r => r.stato === "da_fare").length;
      const inCorso    = g.rows.filter(r => r.stato === "in_corso").length;
      const completati = g.rows.filter(r => r.stato === "completato").length;

      html += `<div class="adp-riepilogo-card" title="${escAttr(g.nome)} — ${g.scadenza_tipo}">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:6px">
          <span class="adp-def-codice" style="font-size:12px">${g.codice}</span>
          <span style="font-size:11px;color:var(--text3)">${scadIcons[g.scadenza_tipo]||"📅"} ${g.scadenza_tipo}</span>
        </div>
        <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:8px;line-height:1.3">${g.nome}</div>
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
          <div class="mini-bar" style="flex:1;height:6px"><div class="mini-fill" style="width:${p}%;background:${pgColor}"></div></div>
          <span style="font-size:11px;font-family:var(--mono);color:${pgColor};min-width:36px;text-align:right">${p}%</span>
        </div>
        <div style="display:flex;gap:5px;flex-wrap:wrap">
          <span style="font-size:11px;padding:2px 7px;border-radius:10px;background:var(--surface3);color:var(--text2);font-family:var(--mono)">${tot} tot.</span>
          ${completati > 0 ? `<span style="font-size:11px;padding:2px 7px;border-radius:10px;background:var(--green-dim);color:var(--green);font-family:var(--mono)">✅ ${completati}</span>` : ""}
          ${daFare > 0 ? `<span style="font-size:11px;padding:2px 7px;border-radius:10px;background:var(--red-dim);color:var(--red);font-family:var(--mono)">⭕ ${daFare}</span>` : ""}
          ${inCorso > 0 ? `<span style="font-size:11px;padding:2px 7px;border-radius:10px;background:var(--yellow-dim);color:var(--yellow);font-family:var(--mono)">🔄 ${inCorso}</span>` : ""}
        </div>
      </div>`;
    });

    html += `</div></div>`;
  });

  html += `</div></div>`;
  return html;
}

// ─── RENDER PAGE ──────────────────────────────────────────────
function renderScadenzarioPage() {
  const opts = state.clienti
    .map(c => `<option value="${c.id}" ${state.selectedCliente?.id===c.id?"selected":""}>[${c.tipologia_codice}] ${c.nome}</option>`)
    .join("");

  document.getElementById("topbar-actions").innerHTML = `
    <select class="select" id="sel-cliente" style="width:280px;font-size:13px" onchange="onClienteChange()" title="Seleziona il cliente da visualizzare">
      <option value="">-- Seleziona Cliente --</option>${opts}
    </select>
    <div class="year-sel">
      <button onclick="changeAnnoScad(-1)" title="Anno precedente">&#9664;</button>
      <span class="year-num">${state.anno}</span>
      <button onclick="changeAnnoScad(1)" title="Anno successivo">&#9654;</button>
    </div>
    <div class="scad-filtri-bar">
      <select class="select scad-filtro-select" id="scad-filtro-stato" onchange="applyScadFiltri()" title="Filtra per stato adempimento" style="font-size:13px">
        <option value="">🔵 Tutti gli stati</option>
        <option value="da_fare">⭕ Da fare</option>
        <option value="in_corso">🔄 In corso</option>
        <option value="completato">✅ Completato</option>
        <option value="n_a">➖ N/A</option>
      </select>
      <select class="select scad-filtro-select" id="scad-filtro-cat" onchange="applyScadFiltri()" title="Filtra per categoria adempimento" style="font-size:13px">
        <option value="">📋 Tutte le categorie</option>
        ${CATEGORIE.map(c => `<option value="${c.codice}">${c.icona} ${c.codice}</option>`).join("")}
      </select>
      <button class="btn btn-sm btn-primary" onclick="resetScadFiltri()" title="Azzera tutti i filtri e mostra tutto" style="font-size:13px">⟳ Tutti</button>
    </div>
    <div class="search-wrap" style="width:210px">
      <span class="search-icon">🔍</span>
      <input class="input" id="scad-search" placeholder="Cerca adempimento..." oninput="applyScadSearch()" title="Cerca tra gli adempimenti del cliente" style="font-size:13px">
    </div>`;

  if (state.selectedCliente) loadScadenzario();
  else document.getElementById("content").innerHTML = `<div class="empty"><div class="empty-icon">📅</div><p style="font-size:16px">Seleziona un cliente dalla lista in alto</p></div>`;
}

function onClienteChange() {
  const id = parseInt(document.getElementById("sel-cliente").value);
  state.selectedCliente = state.clienti.find(c => c.id === id) || null;
  state.adpInseriti = [];
  if (state.selectedCliente) loadScadenzario();
}

function changeAnnoScad(d) {
  state.anno += d;
  document.querySelectorAll(".year-num").forEach(el => el.textContent = state.anno);
  if (state.selectedCliente) loadScadenzario();
}

function loadScadenzario() {
  const sv  = document.getElementById("scad-search")?.value || "";
  const st  = document.getElementById("scad-filtro-stato")?.value || "";
  const cat = document.getElementById("scad-filtro-cat")?.value || "";
  socket.emit("get:scadenzario", {
    id_cliente: state.selectedCliente.id,
    anno: state.anno,
    filtri: { search: sv, stato: st, categoria: cat },
  });
}

const applyScadSearch = debounce(() => {
  if (state.selectedCliente) loadScadenzario();
}, 300);

function applyScadFiltri() {
  if (state.selectedCliente) loadScadenzario();
}

function resetScadFiltri() {
  const st = document.getElementById("scad-filtro-stato");
  const cat = document.getElementById("scad-filtro-cat");
  const src = document.getElementById("scad-search");
  if (st) st.value = "";
  if (cat) cat.value = "";
  if (src) src.value = "";
  if (state.selectedCliente) loadScadenzario();
}

// ─── RENDER TABELLA ───────────────────────────────────────────
function renderScadenzarioTabella(data) {
  const c = state.selectedCliente;
  if (!c) return;
  const totale = data.length;
  const comp   = data.filter(r => r.stato === "completato").length;
  const daF    = data.filter(r => r.stato === "da_fare").length;
  const inC    = data.filter(r => r.stato === "in_corso").length;
  const perc   = totale > 0 ? Math.round((comp / totale) * 100) : 0;
  const avatar = getAvatar(c.nome);
  const tipColor = c.tipologia_colore || getTipologiaColor(c.tipologia_codice);
  const sottotipoLabel = getLabelSottotipologia(c);

  const categorie = (() => { try { return JSON.parse(c.categorie_attive || "[]"); } catch (e) { return []; } })();
  const catBadges = categorie.map(cat => {
    const found = CATEGORIE.find(x => x.codice === cat);
    return found ? `<span class="cat-mini-badge" style="color:${found.color};border-color:${found.color}22;background:${found.color}11;font-size:11px" title="${found.nome}: ${getCatDescription(found.codice)}">${found.icona} ${found.codice}</span>` : "";
  }).join("");

  const col2Map = { privato: "Privato", ditta: "Ditta Ind.", socio: "Socio", professionista: "Prof." };
  const col3Map = { ordinario: "Ord.", semplificato: "Sempl.", forfettario: "Forf.", ordinaria: "Ord.", semplificata: "Sempl." };

  const clienteCard = `<div class="cliente-preview-card" style="border-left-color:${tipColor}">
    <div style="display:flex;align-items:flex-start;gap:18px;width:100%">
      <div class="cpc-avatar" style="border-color:${tipColor};color:${tipColor};background:${tipColor}22;font-size:20px" title="${escAttr(c.nome)}">${avatar}</div>
      <div style="flex:1;min-width:0">
        <div class="cpc-nome" style="font-size:19px">${escAttr(c.nome)}</div>
        <div class="cpc-sub" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:5px">
          <span class="badge b-${(c.tipologia_codice||"").toLowerCase()}" style="font-size:12px" title="${TIPOLOGIE_INFO[c.tipologia_codice]?.desc || ''}">${c.tipologia_codice||"-"}</span>
          ${sottotipoLabel ? `<span class="badge b-categoria" style="font-size:12px" title="Sottotipologia">${sottotipoLabel}</span>` : ""}
          ${c.col2_value ? `<span class="badge-info" style="font-size:11px" title="Sottocategoria">${col2Map[c.col2_value]||c.col2_value}</span>` : ""}
          ${c.col3_value ? `<span class="badge-info" style="font-size:11px" title="Regime fiscale">${col3Map[c.col3_value]||c.col3_value}</span>` : ""}
          ${c.periodicita ? `<span class="badge-per" style="font-size:11px" title="Periodicità contabile">${c.periodicita==="mensile"?"📅 Mensile":"📆 Trimestrale"}</span>` : ""}
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:10px">${catBadges}</div>
        ${c.codice_fiscale||c.partita_iva||c.email ? `<div class="cpc-meta-row" style="margin-top:10px">
          ${c.codice_fiscale ? `<span class="cpc-meta-chip" style="font-size:12px" title="Codice Fiscale">CF: <strong>${c.codice_fiscale}</strong></span>` : ""}
          ${c.partita_iva    ? `<span class="cpc-meta-chip" style="font-size:12px" title="Partita IVA">P.IVA: <strong>${c.partita_iva}</strong></span>` : ""}
          ${c.email          ? `<span class="cpc-meta-chip" style="font-size:12px" title="Email">📧 ${c.email}</span>` : ""}
          ${c.telefono       ? `<span class="cpc-meta-chip" style="font-size:12px" title="Telefono">📞 ${c.telefono}</span>` : ""}
        </div>` : ""}
      </div>
      <div class="cpc-stats">
        <div class="cpc-stat-item" title="Totale adempimenti dell'anno"><div class="cpc-stat-num" style="font-size:26px">${totale}</div><div class="cpc-stat-lbl" style="font-size:11px">Totale</div></div>
        <div class="cpc-stat-item" title="Adempimenti completati"><div class="cpc-stat-num" style="color:var(--green);font-size:26px">${comp}</div><div class="cpc-stat-lbl" style="font-size:11px">Comp.</div></div>
        <div class="cpc-stat-item" title="Adempimenti da fare"><div class="cpc-stat-num" style="color:var(--red);font-size:26px">${daF}</div><div class="cpc-stat-lbl" style="font-size:11px">Da fare</div></div>
        <div class="cpc-stat-item" title="Adempimenti in corso"><div class="cpc-stat-num" style="color:var(--yellow);font-size:26px">${inC}</div><div class="cpc-stat-lbl" style="font-size:11px">Corso</div></div>
        <div class="cpc-stat-item" title="Percentuale completamento">
          <div class="cpc-stat-num" style="color:var(--green);font-size:26px">${perc}%</div>
          <div class="cpc-stat-lbl" style="font-size:11px">Progresso</div>
          <div class="mini-bar" style="margin-top:5px;width:55px"><div class="mini-fill" style="width:${perc}%"></div></div>
        </div>
      </div>
    </div>
    <div class="cpc-actions no-print" style="margin-top:16px;padding-top:14px;border-top:1px solid var(--border);display:flex;gap:10px;flex-wrap:wrap">
      <button class="btn btn-sm btn-orange" onclick="generaScadenzario()" title="Genera automaticamente tutti gli adempimenti per questo cliente e anno" style="font-size:13px">⚡ Genera</button>
      <button class="btn btn-sm btn-cyan"   onclick="openCopia()" title="Copia gli adempimenti da un anno all'altro" style="font-size:13px">📋 Copia</button>
      ${renderBtnAddAdp(c.id)}
      <button class="btn btn-print btn-sm" style="margin-left:auto;font-size:13px" onclick="window.print()" title="Stampa lo scadenzario">🖨️ Stampa</button>
    </div>
    ${renderClienteDatiRiferimento(c)}
  </div>`;

  // ─── RIEPILOGO ADEMPIMENTI SOPRA ──────────────────────────
  const riepilogoHtml = renderAdpRiepilogoCliente(data);

  // Raggruppa per categoria → per adempimento
  const grouped = {};
  data.forEach(r => {
    storeRow(r);
    const cat = r.categoria || "ALTRI";
    if (!grouped[cat]) grouped[cat] = {};
    const key = r.id_adempimento;
    if (!grouped[cat][key])
      grouped[cat][key] = { nome: r.adempimento_nome, codice: r.adempimento_codice, categoria: r.categoria, scadenza_tipo: r.scadenza_tipo, rows: [] };
    grouped[cat][key].rows.push(r);
  });

  let content = "";
  Object.entries(grouped).forEach(([catCode, adpMap]) => {
    const catInfo  = CATEGORIE.find(x => x.codice === catCode);
    const catColor = catInfo?.color || "var(--accent)";
    let adpHtml = "";
    Object.values(adpMap).forEach(g => {
      const compG = g.rows.filter(r => r.stato === "completato").length;
      const totG  = g.rows.length;
      const pG    = totG > 0 ? Math.round((compG / totG) * 100) : 0;
      const pgColor = pG === 100 ? "var(--green)" : pG > 50 ? "var(--yellow)" : "var(--red)";
      const periodiHtml = g.rows.map(r => renderPeriodoPill(r)).join("");
      const isMensile   = g.rows.length > 4;
      adpHtml += `<div class="adp-card">
        <div class="adp-card-header">
          <span class="adp-codice" style="font-size:12px" title="Codice adempimento">${g.codice}</span>
          <span class="adp-nome" style="font-size:14px">${g.nome}</span>
          <span class="adp-tipo-badge" style="font-size:11px" title="Frequenza scadenza">${g.scadenza_tipo}</span>
          <div style="margin-left:auto;display:flex;align-items:center;gap:10px">
            <div class="mini-bar" style="width:70px" title="${pG}% completato"><div class="mini-fill" style="width:${pG}%;background:${pgColor}"></div></div>
            <span style="font-size:12px;font-family:var(--mono);color:${pgColor}" title="${compG} completati su ${totG}">${compG}/${totG}</span>
          </div>
        </div>
        <div class="adp-card-periodi${isMensile ? " periodi-mensili" : ""}">${periodiHtml}</div>
      </div>`;
    });
    content += `<div class="cat-section">
      <div class="cat-section-header" style="border-left:3px solid ${catColor}">
        <span class="cat-section-icon" style="color:${catColor};font-size:20px">${catInfo?.icona || "📋"}</span>
        <span class="cat-section-nome" style="color:${catColor};font-size:15px">${catCode}</span>
        <span class="cat-section-count" style="font-size:12px">${Object.keys(adpMap).length} adempimenti</span>
      </div>
      <div class="cat-section-body">${adpHtml}</div>
    </div>`;
  });

  if (!content)
    content = `<div class="empty"><div class="empty-icon">📅</div><p style="font-size:16px">Nessun adempimento per ${state.anno}</p><button class="btn btn-primary" onclick="generaScadenzario()" style="font-size:14px;margin-top:12px" title="Genera automaticamente lo scadenzario">⚡ Genera Scadenzario</button></div>`;

  document.getElementById("content").innerHTML = `${clienteCard}${riepilogoHtml}<div id="scad-content">${content}</div>`;
}

// ─── AZIONI ───────────────────────────────────────────────────
function generaScadenzario() {
  if (!state.selectedCliente) return;
  socket.emit("genera:scadenzario", { id_cliente: state.selectedCliente.id, anno: state.anno });
}

function openCopia() {
  if (!state.selectedCliente) return;
  document.getElementById("copia-cliente-id").value = state.selectedCliente.id;
  document.getElementById("copia-modalita").value   = "singolo";
  document.getElementById("copia-da").value         = state.anno - 1;
  document.getElementById("copia-a").value          = state.anno;
  document.getElementById("copia-info").innerHTML   = `Copia adempimenti per <strong>${state.selectedCliente.nome}</strong>`;
  openModal("modal-copia");
}

function openCopiaTutti() {
  document.getElementById("copia-cliente-id").value = "";
  document.getElementById("copia-modalita").value   = "tutti";
  document.getElementById("copia-da").value         = state.anno - 1;
  document.getElementById("copia-a").value          = state.anno;
  document.getElementById("copia-info").innerHTML   = `Copia adempimenti per <strong>tutti i clienti</strong>`;
  openModal("modal-copia");
}

function eseguiCopia() {
  const modalita = document.getElementById("copia-modalita").value;
  const da = parseInt(document.getElementById("copia-da").value);
  const a  = parseInt(document.getElementById("copia-a").value);
  if (modalita === "singolo") {
    const id = parseInt(document.getElementById("copia-cliente-id").value);
    socket.emit("copia:scadenzario", { id_cliente: id, anno_da: da, anno_a: a });
  } else socket.emit("copia:tutti", { anno_da: da, anno_a: a });
}

function openGeneraTutti() {
  document.getElementById("genera-tutti-anno").value = state.anno;
  openModal("modal-genera-tutti");
}

function eseguiGeneraTutti() {
  const anno = parseInt(document.getElementById("genera-tutti-anno").value);
  socket.emit("genera:tutti", { anno });
}

// ─── ADD ADEMPIMENTO ──────────────────────────────────────────
function openAddAdp(id_cliente) {
  document.getElementById("add-adp-cliente-id").value = id_cliente;
  document.getElementById("add-adp-anno").value       = state.anno;
  const c = state.selectedCliente;
  if (c) document.getElementById("add-adp-cliente-info").innerHTML = renderClienteInfoBox(c);
  refreshAddAdpSelect();
  openModal("modal-add-adp");
}

function refreshAddAdpSelect() {
  const mancanti = getAdempimentiMancanti();
  const sel = document.getElementById("add-adp-select");
  sel.innerHTML = mancanti
    .map(a => `<option value="${a.id}" data-scadenza="${a.scadenza_tipo}">${a.codice} — ${a.nome}</option>`)
    .join("");
  updatePeriodoOptions();
}

function updatePeriodoOptions() {
  const sel    = document.getElementById("add-adp-select");
  const perSel = document.getElementById("add-adp-periodo");
  if (!sel || !perSel) return;
  const opt  = sel.options[sel.selectedIndex];
  if (!opt) { perSel.innerHTML = ""; return; }
  const tipo = opt.dataset.scadenza;
  let opts = "";
  if (tipo === "mensile")
    opts = MESI.map((m, i) => `<option value="mese:${i + 1}">${m}</option>`).join("");
  else if (tipo === "trimestrale")
    opts = [1,2,3,4].map(t => `<option value="trim:${t}">${t}° Trimestre</option>`).join("");
  else if (tipo === "semestrale")
    opts = `<option value="sem:1">1° Semestre</option><option value="sem:2">2° Semestre</option>`;
  else
    opts = `<option value="annuale">Annuale</option>`;
  perSel.innerHTML = opts;
}

function eseguiAddAdp() {
  const id_cliente     = parseInt(document.getElementById("add-adp-cliente-id").value);
  const id_adempimento = parseInt(document.getElementById("add-adp-select").value);
  const anno           = parseInt(document.getElementById("add-adp-anno").value);
  const periodo        = document.getElementById("add-adp-periodo").value;
  const data = { id_cliente, id_adempimento, anno };
  if (periodo.startsWith("mese:"))  data.mese      = parseInt(periodo.split(":")[1]);
  else if (periodo.startsWith("trim:")) data.trimestre = parseInt(periodo.split(":")[1]);
  else if (periodo.startsWith("sem:"))  data.semestre  = parseInt(periodo.split(":")[1]);
  socket.emit("add:adempimento_cliente", data);
}