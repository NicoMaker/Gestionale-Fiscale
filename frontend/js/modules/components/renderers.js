// ═══════════════════════════════════════════════════════════════
// RENDERERS.JS — Helper di rendering condivisi
// ═══════════════════════════════════════════════════════════════

// ─── TYPE HELPERS ─────────────────────────────────────────────
function isContabilita(r) {
  return parseInt(r.is_contabilita) === 1 || r.is_contabilita === true || r.is_contabilita === 1;
}
function hasRate(r) {
  return parseInt(r.has_rate) === 1 || r.has_rate === true || r.has_rate === 1;
}
function isCheckbox(r) {
  return parseInt(r.is_checkbox) === 1 || r.is_checkbox === true || r.is_checkbox === 1;
}

// ─── CONTABILITÀ STATE ────────────────────────────────────────
// "none"  → nessun dato
// "iva"   → solo IVA compilata o cont_completata=0  → blu
// "both"  → IVA + cont_completata=1                 → verde
function getContabilitaVisualState(r) {
  const hasIva  = r.importo_iva != null && r.importo_iva !== "";
  // cont_completata: 1 = spuntata
  const hasCont = parseInt(r.cont_completata) === 1;
  if (hasIva && hasCont) return "both";
  if (hasIva)            return "iva";
  return "none";
}

// ─── IMPORTO CELL ─────────────────────────────────────────────
function renderImportoCellCompact(r) {
  if (isCheckbox(r)) {
    // Checkbox: nessun importo da mostrare nella pill
    return `<span class="imp-empty">—</span>`;
  }
  if (isContabilita(r)) {
    const iva  = r.importo_iva  ? `€${parseFloat(r.importo_iva).toFixed(2)}`  : null;
    const contDone = parseInt(r.cont_completata) === 1;
    if (!iva && !contDone) return `<span class="imp-empty">—</span>`;
    const visState = getContabilitaVisualState(r);
    const ivaColor  = "var(--accent)";
    const contColor = visState === "both" ? "var(--green)" : "var(--text3)";
    return `<div class="importi-cell">
      ${iva  ? `<div class="imp-row"><span class="imp-lbl" style="color:${ivaColor}">💰 IVA</span><span class="imp-val" style="color:${ivaColor}">${iva}</span></div>` : ""}
      ${contDone ? `<div class="imp-row"><span class="imp-lbl" style="color:${contColor}">📊 Cont.</span><span class="imp-val" style="color:${contColor}">✓</span></div>` : ""}
    </div>`;
  }
  if (hasRate(r)) {
    let lb = ["Saldo","1°Acc.","2°Acc."];
    try { if (r.rate_labels) lb = JSON.parse(r.rate_labels); } catch(e) {}
    const s  = r.importo_saldo    ? `€${parseFloat(r.importo_saldo).toFixed(2)}`    : null;
    const a1 = r.importo_acconto1 ? `€${parseFloat(r.importo_acconto1).toFixed(2)}` : null;
    const a2 = r.importo_acconto2 ? `€${parseFloat(r.importo_acconto2).toFixed(2)}` : null;
    if (!s && !a1 && !a2) return `<span class="imp-empty">—</span>`;
    return `<div class="importi-cell">
      ${s  ? `<div class="imp-row"><span class="imp-lbl">💰 ${lb[0]}</span><span class="imp-val">${s}</span></div>`  : ""}
      ${a1 ? `<div class="imp-row"><span class="imp-lbl">📥 ${lb[1]}</span><span class="imp-val">${a1}</span></div>` : ""}
      ${a2 ? `<div class="imp-row"><span class="imp-lbl">📥 ${lb[2]}</span><span class="imp-val">${a2}</span></div>` : ""}
    </div>`;
  }
  return r.importo
    ? `<div class="importi-cell"><div class="imp-row"><span class="imp-lbl">💶</span><span class="imp-val">€${parseFloat(r.importo).toFixed(2)}</span></div></div>`
    : `<span class="imp-empty">—</span>`;
}

// ─── CHECKBOX PILL ────────────────────────────────────────────
// Pill speciale per adempimenti di tipo checkbox: solo ✓ / ✗ grande
function renderCheckboxPill(r) {
  const done = r.stato === "completato";
  const ps = getPeriodoShort(r);
  const color = done ? "var(--green)" : "var(--red)";
  const icon  = done ? "✅" : "☐";
  const tooltipText = `${getPeriodoLabel(r)} — ${done ? "Completato" : "Da fare"}\nClick: toggle | Click destro: toggle rapido`;

  return `<div class="periodo-pill checkbox-pill s-${r.stato}"
    onclick="toggleCheckboxAdp(event,${r.id})"
    oncontextmenu="toggleAdpCompletato(event,${r.id})"
    title="${escAttr(tooltipText)}"
    style="border-color:${color};min-width:90px;flex:0 1 90px">
    <div class="pp-top" style="justify-content:center;gap:8px">
      <span class="pp-tag" style="border-color:${color};color:${color}">${ps}</span>
      <span style="font-size:22px;line-height:1">${icon}</span>
    </div>
    ${r.note ? `<div class="pp-note" title="${escAttr(r.note)}">📝 ${r.note}</div>` : ""}
  </div>`;
}

// ─── PERIODO PILL ─────────────────────────────────────────────
function renderPeriodoPill(r) {
  // Dispatch per tipo checkbox
  if (isCheckbox(r)) return renderCheckboxPill(r);

  const stato = r.stato || "da_fare";
  const ps = getPeriodoShort(r);
  const statoColors = {
    da_fare:   "var(--red)",
    in_corso:  "var(--yellow)",
    completato:"var(--green)",
    n_a:       "var(--text3)",
  };

  let pillBorderColor = statoColors[stato] || "var(--text3)";
  let pillBg = "";
  if (isContabilita(r) && stato !== "completato") {
    const vs = getContabilitaVisualState(r);
    if (vs === "iva")  { pillBorderColor = "var(--accent)"; pillBg = "rgba(91,141,246,0.07)"; }
    if (vs === "both") { pillBorderColor = "var(--green)";  pillBg = "rgba(52,211,153,0.07)"; }
  }

  const statoColor = statoColors[stato] || "var(--text3)";
  const statoIcon =
    stato === "da_fare"   ? "⭕" :
    stato === "in_corso"  ? "🔄" :
    stato === "completato"? "✅" : "➖";
  const statoLabel =
    stato === "da_fare"   ? "Da fare" :
    stato === "in_corso"  ? "In corso" :
    stato === "completato"? "Completato" : "N/A";

  const impHtml = renderImportoCellCompact(r);
  const hasImp = impHtml !== `<span class="imp-empty">—</span>`;

  let dateLine = "";
  if (r.data_scadenza || r.data_completamento) {
    dateLine = `<div class="pp-dates">`;
    if (r.data_scadenza)       dateLine += `<span class="pp-date" title="Data scadenza">📅 ${r.data_scadenza}</span>`;
    if (r.data_completamento)  dateLine += `<span class="pp-date" style="color:var(--green)" title="Data completamento">✅ ${r.data_completamento}</span>`;
    dateLine += `</div>`;
  }

  const tooltipText = `${getPeriodoLabel(r)} — ${statoLabel}${r.data_scadenza ? ` | Scad: ${r.data_scadenza}` : ""}${r.data_completamento ? ` | Compl: ${r.data_completamento}` : ""}\nClick sinistro: modifica | Click destro: toggle completato`;

  const extraStyle = pillBg ? `background:${pillBg};` : "";

  return `<div class="periodo-pill s-${stato}" 
    style="${extraStyle}"
    onclick="openAdpById(${r.id})" 
    oncontextmenu="toggleAdpCompletato(event,${r.id})"
    title="${escAttr(tooltipText)}">
    <div class="pp-top">
      <span class="pp-tag" style="border-color:${pillBorderColor};color:${pillBorderColor}">${ps}</span>
      <span class="pp-stato-icon" title="${escAttr(statoLabel)}">${statoIcon}</span>
    </div>
    ${dateLine}
    ${hasImp ? `<div class="pp-imp">${impHtml}</div>` : ""}
    ${r.note ? `<div class="pp-note" title="${escAttr(r.note)}">📝 ${r.note}</div>` : ""}
  </div>`;
}

// ─── CLIENTE INFO BOX ─────────────────────────────────────────
function renderClienteInfoBox(cliente) {
  if (!cliente) return "";
  const avatar   = getAvatar(cliente.nome);
  const tipColor = getTipologiaColor(cliente.tipologia_codice);
  const tipBadge = cliente.tipologia_codice
    ? `<span class="badge b-${(cliente.tipologia_codice||"").toLowerCase()}" title="${TIPOLOGIE_INFO[cliente.tipologia_codice]?.desc || cliente.tipologia_codice}">${cliente.tipologia_codice}</span>`
    : "";
  const sottotipoLabel = getLabelSottotipologia(cliente);
  const subBadge = sottotipoLabel
    ? `<span class="badge b-categoria" title="Sottotipologia: ${sottotipoLabel}">📋 ${sottotipoLabel}</span>`
    : "";

  let classCols = "";
  if (cliente.col2_value || cliente.col3_value || cliente.periodicita) {
    classCols = `<div class="cliente-class-pills">`;
    const col2Map = { privato:"Privato", ditta:"Ditta Ind.", socio:"Socio", professionista:"Professionista" };
    const col3Map = { ordinario:"Ordinario", semplificato:"Semplificato", forfettario:"Forfettario", ordinaria:"Ordinaria", semplificata:"Semplificata" };
    if (cliente.col2_value) classCols += `<span class="class-pill" title="Sottocategoria"><span class="cp-num">2</span>${col2Map[cliente.col2_value]||cliente.col2_value}</span>`;
    if (cliente.col3_value) classCols += `<span class="class-pill" title="Regime fiscale"><span class="cp-num">3</span>${col3Map[cliente.col3_value]||cliente.col3_value}</span>`;
    if (cliente.periodicita) classCols += `<span class="class-pill per-pill" title="Periodicità contabile"><span class="cp-num">4</span>${cliente.periodicita === "mensile" ? "📅 Mensile" : cliente.periodicita === "annuale" ? "📅 Annuale" : "📆 Trimestrale"}</span>`;
    classCols += `</div>`;
  }

  let metaChips = [];
  if (cliente.codice_fiscale) metaChips.push(`<span class="meta-chip" title="Codice Fiscale">CF: <strong>${cliente.codice_fiscale}</strong></span>`);
  if (cliente.partita_iva)   metaChips.push(`<span class="meta-chip" title="Partita IVA">P.IVA: <strong>${cliente.partita_iva}</strong></span>`);
  if (cliente.email)         metaChips.push(`<span class="meta-chip" title="Indirizzo email">📧 ${cliente.email}</span>`);
  if (cliente.telefono)      metaChips.push(`<span class="meta-chip" title="Numero di telefono">📞 ${cliente.telefono}</span>`);

  return `
    <div class="cliente-info-header">
      <div class="cliente-info-avatar" style="border-color:${tipColor};color:${tipColor};background:${tipColor}22;font-size:${avatarFontSize(avatar,15)}">${avatar}</div>
      <div style="flex:1">
        <div class="cliente-info-nome">${escAttr(cliente.nome)}</div>
        <div class="cliente-info-badges">${tipBadge} ${subBadge}</div>
        ${classCols}
      </div>
    </div>
    ${metaChips.length ? `<div class="cliente-info-meta">${metaChips.join("")}</div>` : ""}
  `;
}

// ─── CLIENTE DATI RIFERIMENTO ─────────────────────────────────
function renderClienteDatiRiferimento(cliente) {
  if (!cliente) return "";
  const items = [];
  const add = (icon, label, val, title) =>
    items.push(`<div class="dati-ref-item" title="${title||label+" "+val}"><span class="ref-icon">${icon}</span><span class="ref-label">${label}</span><span class="ref-value">${val}</span></div>`);
  if (cliente.codice_fiscale) add("🆔","CF:",   cliente.codice_fiscale, "Codice Fiscale");
  if (cliente.partita_iva)   add("🏢","P.IVA:", cliente.partita_iva,   "Partita IVA");
  if (cliente.email)         add("📧","Email:", cliente.email,         "Indirizzo email");
  if (cliente.telefono)      add("📞","Tel:",   cliente.telefono,      "Numero di telefono");
  if (cliente.pec)           add("📨","PEC:",   cliente.pec,           "Posta Elettronica Certificata");
  if (cliente.sdi)           add("📋","SDI:",   cliente.sdi,           "Codice SDI per fatturazione elettronica");
  if (cliente.referente)     add("👤","Ref.:",  cliente.referente,     "Referente / Contatto");
  if (cliente.iban)          add("🏦","IBAN:",  cliente.iban,          "Coordinate bancarie");
  if (cliente.indirizzo)     add("📍","Indirizzo:", `${cliente.indirizzo}${cliente.citta?`, ${cliente.citta}`:""}`, "Indirizzo completo");
  if (!items.length) return "";
  return `<div class="cpc-dati-riferimento"><div class="dati-ref-title">📋 Dati di Riferimento</div><div class="dati-ref-grid">${items.join("")}</div></div>`;
}
