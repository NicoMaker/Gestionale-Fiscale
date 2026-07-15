// ═══════════════════════════════════════════════════════════════
// PILL.JS — Rendering delle pill adempimento (colore, testo, checkbox, periodo)
// ═══════════════════════════════════════════════════════════════


// ─── COLORE PILLOLA ───────────────────────────────────────────
function getPillColor(r, stato) {
  if (isTextOnly(r)) return "var(--purple)";
  const isCompletato = stato === "completato";
  const isNA = stato === "n_a";
  if (isCheckbox(r)) {
    if (isNA) return "var(--text3)";
    if (isCompletato) return "var(--green)";
    return "var(--red)";
  }
  if (isContabilita(r)) {
    const hasIva = !!r.importo_iva && parseFloat(r.importo_iva) !== 0;
    const contDone = parseInt(r.cont_completata) === 1;
    if (hasIva && contDone) return "var(--green)";
    if (hasIva || contDone) return "var(--accent)";
    return "var(--red)";
  }
  if (hasRate(r)) {
    const sNum =
      r.importo_saldo != null && r.importo_saldo !== ""
        ? parseFloat(r.importo_saldo)
        : null;
    const a1Num =
      r.importo_acconto1 != null && r.importo_acconto1 !== ""
        ? parseFloat(r.importo_acconto1)
        : null;
    const a2Num =
      r.importo_acconto2 != null && r.importo_acconto2 !== ""
        ? parseFloat(r.importo_acconto2)
        : null;
    const filled = [sNum, a1Num, a2Num].filter(
      (v) => v !== null && v !== 0,
    ).length;
    const contDone = parseInt(r.cont_completata) === 1;
    const hasAnyRate = filled >= 1;
    if (hasAnyRate && contDone) return "var(--green)";
    if (hasAnyRate || contDone) return "var(--accent)";
    return "var(--red)";
  }
  // Solo scadenza — usa isSoloScadenzaScaduto che legge OGGI globale
  if (isCompletato) return "var(--green)";
  if (isNA) return "var(--text3)";
  if (isSoloScadenzaScaduto(r)) return "var(--orange)";
  return "var(--red)";
}


// ─── SOLO TESTO PILL ────────────────────────────────────────────
function renderTextOnlyPill(r) {
  const ps = getPeriodoShort(r);
  const pillColor = "var(--purple)";
  return `<div class="periodo-pill text-only-pill" data-id="${r.id}"
    onclick="openAdpById(${r.id})"
    title="${escAttr(getPeriodoLabel(r))} — Click: modifica"
    style="border-color:${pillColor};min-width:145px;flex:1 1 145px;position:relative">
    <div class="pp-top">
      <span class="pp-tag" style="border-color:${pillColor};color:${pillColor}">📝 ${ps}</span>
    </div>
    <div class="pp-nome" style="color:${pillColor};font-weight:600">${r.adempimento_nome || ""}</div>
    ${r.note ? `<div class="pp-note" style="margin-top:4px">📝 ${r.note}</div>` : ""}
  </div>`;
}


// ─── CHECKBOX PILL ────────────────────────────────────────────
function renderCheckboxPill(r) {
  const stato = r.stato || "da_fare";
  const ps = getPeriodoShort(r);
  const isDone = stato === "completato";
  const isNA = stato === "n_a";
  const isDaFare = !isDone && !isNA;
  let color;
  if (isDone) color = "var(--green)";
  else if (isNA) color = "var(--text3)";
  else color = "var(--red)";
  const icon = isDone ? "✅" : isNA ? "➖" : "✗";
  const btnReset = `<button class="cbx-btn${isDaFare ? " cbx-active cbx-red" : ""}" onclick="setCbxStato(event,${r.id},'da_fare')" title="Segna da fare">☐</button>`;
  const btnNA = `<button class="cbx-btn${isNA ? " cbx-active cbx-gray" : ""}" onclick="setCbxStato(event,${r.id},'n_a')" title="Segna N/A">➖</button>`;
  const btnDone = `<button class="cbx-btn${isDone ? " cbx-active cbx-green" : ""}" onclick="setCbxStato(event,${r.id},'completato')" title="Segna completato">✅</button>`;
  const nomeHtml = r.adempimento_nome
    ? `<div class="pp-nome" style="color:${color};font-size:11px;line-height:1.3;margin-bottom:2px">${r.adempimento_nome}</div>`
    : "";
  return `<div class="periodo-pill checkbox-pill s-${stato}" data-id="${r.id}" onclick="openAdpById(${r.id})" oncontextmenu="toggleAdpCompletato(event,${r.id})" title="${escAttr(getPeriodoLabel(r))} — Click: modifica | Tasto DX: toggle completato" style="border-color:${color};min-width:120px;flex:0 1 120px;position:relative">
    <div class="pp-top" style="justify-content:space-between;gap:4px">
      <span class="pp-tag" style="border-color:${color};color:${color}">${ps}</span>
      <span style="font-size:18px;line-height:1">${icon}</span>
    </div>
    ${nomeHtml}
    <div class="cbx-btn-row" onclick="event.stopPropagation()">${btnReset}${btnNA}${btnDone}</div>
    ${r.note ? `<div class="pp-note" title="${escAttr(r.note)}">📝 ${r.note}</div>` : ""}
  </div>`;
}


// ─── PERIODO PILL ─────────────────────────────────────────────
function renderPeriodoPill(r) {
  if (isCheckbox(r)) return renderCheckboxPill(r);
  if (isTextOnly(r)) return renderTextOnlyPill(r);

  const stato = r.stato || "da_fare";
  const ps = getPeriodoShort(r);
  const pillColor = getPillColor(r, stato);
  let statoIcon, statoLabel;

  if (hasRate(r)) {
    const sNum =
      r.importo_saldo != null && r.importo_saldo !== ""
        ? parseFloat(r.importo_saldo)
        : null;
    const a1Num =
      r.importo_acconto1 != null && r.importo_acconto1 !== ""
        ? parseFloat(r.importo_acconto1)
        : null;
    const a2Num =
      r.importo_acconto2 != null && r.importo_acconto2 !== ""
        ? parseFloat(r.importo_acconto2)
        : null;
    const filled = [sNum, a1Num, a2Num].filter(
      (v) => v !== null && v !== 0,
    ).length;
    statoIcon = filled >= 3 ? "✅" : filled >= 1 ? "🔄" : "⭕";
    statoLabel =
      filled >= 3
        ? "Tutte le rate"
        : filled >= 1
          ? `${filled}/3 rate`
          : "Nessuna rata";
  } else {
    statoIcon =
      stato === "da_fare"
        ? "⭕"
        : stato === "in_corso"
          ? "🔄"
          : stato === "completato"
            ? "✅"
            : "➖";
    statoLabel =
      stato === "da_fare"
        ? "Da fare"
        : stato === "in_corso"
          ? "In corso"
          : stato === "completato"
            ? "Completato"
            : "N/A";
  }

  const impHtml = renderImportoCellCompact(r);
  const hasImp = impHtml !== `<span class="imp-empty">—</span>`;
  let importiInline = "";
  if (isContabilita(r)) importiInline = _buildContabilitaLabel(r, pillColor);
  else if (hasRate(r)) importiInline = _buildRateLabel(r, pillColor);

  // Badge SCADUTO / Non scaduto — usa OGGI globale aggiornato a mezzanotte
  let scadutoBadge = "";
  const _isSoloScad =
    !isContabilita(r) && !hasRate(r) && !isCheckbox(r) && !isTextOnly(r);
  if (_isSoloScad && r.data_scadenza && stato !== "n_a") {
    const _dataScad = new Date(r.data_scadenza);
    _dataScad.setHours(0, 0, 0, 0);
    if (_dataScad < OGGI) {
      // ← usa OGGI globale
      scadutoBadge = `<div class="pp-scaduto-badge" style="margin-top:4px;display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;letter-spacing:0.05em;background:var(--orange);color:#fff">⚠️ SCADUTO</div>`;
    } else {
      scadutoBadge = `<div class="pp-scaduto-badge" style="margin-top:4px;display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;letter-spacing:0.05em;background:var(--green);color:#fff;opacity:0.85">✓ Non scaduto</div>`;
    }
  }

  // Per "solo scadenza": mostra solo la data di scadenza, mai quella di completamento
  let dateLine = "";
  if (_isSoloScad) {
    if (r.data_scadenza)
      dateLine = `<div class="pp-dates"><span class="pp-date" title="Data scadenza">📅 ${formattaDataItaliana(r.data_scadenza)}</span></div>`;
  } else if (r.data_scadenza || r.data_completamento) {
    dateLine = `<div class="pp-dates">`;
    if (r.data_scadenza)
      dateLine += `<span class="pp-date" title="Data scadenza">📅 ${formattaDataItaliana(r.data_scadenza)}</span>`;
    if (r.data_completamento)
      dateLine += `<span class="pp-date" style="color:var(--green)" title="Data completamento">✅ ${formattaDataItaliana(r.data_completamento)}</span>`;
    dateLine += `</div>`;
  }

  const tooltipText = `${getPeriodoLabel(r)} — ${statoLabel}${r.data_scadenza ? ` | Scad: ${formattaDataItaliana(r.data_scadenza)}` : ""}${r.data_completamento ? ` | Compl: ${formattaDataItaliana(r.data_completamento)}` : ""}\nClick sinistro: modifica | Click destro: toggle completato`;
  const tagColor =
    isContabilita(r) && r.importo_iva ? "var(--green)" : pillColor;

  return `<div class="periodo-pill s-${stato}" data-id="${r.id}" onclick="openAdpById(${r.id})" oncontextmenu="toggleAdpCompletato(event,${r.id})" title="${escAttr(tooltipText)}" style="border-color:${pillColor};color:${pillColor};position:relative">
    <div class="pp-top">
      <span class="pp-tag" style="border-color:${tagColor};color:${tagColor}">${ps}</span>
      <span class="pp-stato-icon" title="${escAttr(statoLabel)}">${statoIcon}</span>
    </div>
    <div class="pp-nome" style="color:${pillColor}">${r.adempimento_nome || ""}</div>
    ${importiInline}
    ${dateLine}
    ${scadutoBadge}
    ${!importiInline && hasImp ? `<div class="pp-imp">${impHtml}</div>` : ""}
    ${r.note ? `<div class="pp-note" title="${escAttr(r.note)}">📝 ${r.note}</div>` : ""}
  </div>`;
}


// ─── HELPER: label con checkbox per contabilità ───────────────
function _buildContabilitaLabel(r, pillColor) {
  const ivaNum =
    r.importo_iva != null && r.importo_iva !== ""
      ? parseFloat(r.importo_iva)
      : null;
  const hasIva = ivaNum !== null && ivaNum !== 0;
  const contDone = parseInt(r.cont_completata) === 1;
  let cIva, cCont;
  if (hasIva && contDone) {
    cIva = cCont = "var(--green)";
  } else if (hasIva || contDone) {
    cIva = cCont = "var(--accent)";
  } else {
    cIva = cCont = "var(--red)";
  }
  const ivaVal = hasIva
    ? `<span style="color:${ivaNum < 0 ? "var(--red)" : "var(--green)"}">${formattaNumeroItaliano(ivaNum)}&euro;</span>`
    : "&mdash;";
  return `<div class="pp-cont-labels">
    <div class="pp-cont-row"><span class="pp-cont-check" style="color:${cIva}">${hasIva ? "✓" : "✗"}</span><span class="pp-cont-lbl" style="color:${cIva}">💰 IVA</span><span class="pp-cont-val" style="color:${cIva}">${ivaVal}</span></div>
    <div class="pp-cont-row"><span class="pp-cont-check" style="color:${cCont}">${contDone ? "✓" : "✗"}</span><span class="pp-cont-lbl" style="color:${cCont}">📊 Adempimento Comp.</span><span class="pp-cont-val" style="color:${cCont}">${contDone ? "fatto" : "—"}</span></div>
  </div>`;
}


// ─── HELPER: label con checkbox per rate ───────────────────────
function _buildRateLabel(r, pillColor) {
  let lb = ["Saldo", "1°Acc.", "2°Acc."];
  try {
    if (r.rate_labels) lb = JSON.parse(r.rate_labels);
  } catch (e) {}
  const sNum =
    r.importo_saldo != null && r.importo_saldo !== ""
      ? parseFloat(r.importo_saldo)
      : null;
  const a1Num =
    r.importo_acconto1 != null && r.importo_acconto1 !== ""
      ? parseFloat(r.importo_acconto1)
      : null;
  const a2Num =
    r.importo_acconto2 != null && r.importo_acconto2 !== ""
      ? parseFloat(r.importo_acconto2)
      : null;
  const icons = ["💰", "📥", "📥"];
  const filled = [sNum, a1Num, a2Num].filter(
    (v) => v !== null && v !== 0,
  ).length;
  const allDone = filled >= 3;
  const contDone = parseInt(r.cont_completata) === 1;
  const hasAnyRate = filled >= 1;
  let cRate, cCont;
  if (allDone && contDone) {
    cRate = cCont = "var(--green)";
  } else if (hasAnyRate || contDone) {
    cRate = cCont = "var(--accent)";
  } else {
    cRate = cCont = "var(--red)";
  }
  const rows = [
    { num: sNum, icon: icons[0], label: lb[0] },
    { num: a1Num, icon: icons[1], label: lb[1] },
    { num: a2Num, icon: icons[2], label: lb[2] },
  ]
    .map((item) => {
      const done = item.num !== null && item.num !== 0;
      const display = done
        ? `<span style="color:${item.num < 0 ? "var(--red)" : "var(--green)"}">${formattaNumeroItaliano(item.num)}&euro;</span>`
        : "&mdash;";
      return `<div class="pp-cont-row"><span class="pp-cont-check" style="color:${cRate}">${done ? "✓" : "✗"}</span><span class="pp-cont-lbl" style="color:${cRate}">${item.icon} ${item.label}</span><span class="pp-cont-val" style="color:${cRate}">${display}</span></div>`;
    })
    .join("");
  const contRow = `<div class="pp-cont-row"><span class="pp-cont-check" style="color:${cCont}">${contDone ? "✓" : "✗"}</span><span class="pp-cont-lbl" style="color:${cCont}">📊 Adempimento Comp.</span><span class="pp-cont-val" style="color:${cCont}">${contDone ? "fatto" : "—"}</span></div>`;
  return `<div class="pp-cont-labels">${rows}${contRow}</div>`;
}
