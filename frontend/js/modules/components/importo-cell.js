// ═══════════════════════════════════════════════════════════════
// IMPORTO-CELL.JS — Rendering cella importo compatta
// ═══════════════════════════════════════════════════════════════


// ─── IMPORTO CELL ─────────────────────────────────────────────
function renderImportoCellCompact(r) {
  if (isCheckbox(r) || isTextOnly(r)) {
    return `<span class="imp-empty">-</span>`;
  }
  if (isContabilita(r)) {
    const ivaNum =
      r.importo_iva != null && r.importo_iva !== ""
        ? parseFloat(r.importo_iva)
        : null;
    const acc2Num =
      r.importo_acconto2 != null && r.importo_acconto2 !== ""
        ? parseFloat(r.importo_acconto2)
        : null;
    const contDone = parseInt(r.cont_completata) === 1;
    const iva =
      ivaNum !== null
        ? `<span style="color:${ivaNum < 0 ? "var(--red)" : "var(--green)"}">${formattaNumeroItaliano(ivaNum)}&euro;</span>`
        : null;
    const acc2 =
      acc2Num !== null
        ? `<span style="color:${acc2Num < 0 ? "var(--red)" : "var(--green)"}">${formattaNumeroItaliano(acc2Num)}&euro;</span>`
        : null;
    if (!iva && !acc2 && !contDone) return `<span class="imp-empty">-</span>`;
    return `<div class="importi-cell">${iva ? `<div class="imp-row"><span class="imp-lbl">IVA</span><span class="imp-val">${iva}</span></div>` : ""}${acc2 ? `<div class="imp-row"><span class="imp-lbl">2&deg;Acc.</span><span class="imp-val">${acc2}</span></div>` : ""}${contDone ? `<div class="imp-row"><span class="imp-lbl">Adempimento Comp.</span><span class="imp-val"></span></div>` : ""}</div>`;
  }
  if (hasRate(r)) {
    let lb = ["Saldo", "1&deg;Acc.", "2&deg;Acc."];
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
    const s =
      sNum !== null
        ? `<span style="color:${sNum < 0 ? "var(--red)" : "var(--green)"}">${formattaNumeroItaliano(sNum)}&euro;</span>`
        : null;
    const a1 =
      a1Num !== null
        ? `<span style="color:${a1Num < 0 ? "var(--red)" : "var(--green)"}">${formattaNumeroItaliano(a1Num)}&euro;</span>`
        : null;
    const a2 =
      a2Num !== null
        ? `<span style="color:${a2Num < 0 ? "var(--red)" : "var(--green)"}">${formattaNumeroItaliano(a2Num)}&euro;</span>`
        : null;
    if (!s && !a1 && !a2) return `<span class="imp-empty">-</span>`;
    return `<div class="importi-cell">${s ? `<div class="imp-row"><span class="imp-lbl">${lb[0]}</span><span class="imp-val">${s}</span></div>` : ""}${a1 ? `<div class="imp-row"><span class="imp-lbl">${lb[1]}</span><span class="imp-val">${a1}</span></div>` : ""}${a2 ? `<div class="imp-row"><span class="imp-lbl">${lb[2]}</span><span class="imp-val">${a2}</span></div>` : ""}</div>`;
  }
  if (r.importo != null && r.importo !== "") {
    const impNum = parseFloat(r.importo);
    return `<div class="importi-cell"><div class="imp-row"><span class="imp-lbl">&euro;</span><span class="imp-val" style="color:${impNum < 0 ? "var(--red)" : "var(--green)"}">${formattaNumeroItaliano(impNum)}&euro;</span></div></div>`;
  }
  return `<span class="imp-empty">-</span>`;
}


// ─── HELPER: adempimento "solo scadenza" con data già scaduta ─
// Usa OGGI globale (aggiornato a mezzanotte) invece di new Date().
function isSoloScadenzaScaduto(r) {
  if (isContabilita(r) || hasRate(r) || isCheckbox(r) || isTextOnly(r))
    return false;
  const stato = r.stato || "da_fare";
  if (stato === "completato" || stato === "n_a") return false;
  if (!r.data_scadenza) return false;
  const dataScad = new Date(r.data_scadenza);
  dataScad.setHours(0, 0, 0, 0);
  return dataScad < OGGI; // ← usa OGGI globale
}
