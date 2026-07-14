// ═══════════════════════════════════════════════════════════════
// ADEMPIMENTI-PILL.JS — Interazioni sulle pill adempimento (completa/checkbox) + row store
// ═══════════════════════════════════════════════════════════════

const _rowStore = {};


function storeRow(r) {
  _rowStore[r.id] = r;
  return r.id;
}


function openAdpById(id) {
  const r = _rowStore[id];
  if (!r) {
    console.warn("Row not found:", id);
    return;
  }
  openAdpModal(r);
}


// ─── TOGGLE RAPIDO COMPLETATO (click destro sulla pill) ───────
function toggleAdpCompletato(event, id) {
  event.preventDefault();
  event.stopPropagation();
  const r = _rowStore[id];
  if (!r) return;
  const nuovoStato = r.stato === "completato" ? "da_fare" : "completato";
  const data = {
    id,
    stato: nuovoStato,
    data_scadenza: r.data_scadenza || null,
    data_completamento:
      nuovoStato === "completato" ? daItalianaAISO(oggiItaliano()) : null,
    note: r.note || null,
    importo: r.importo || null,
    importo_saldo: r.importo_saldo || null,
    importo_acconto1: r.importo_acconto1 || null,
    importo_acconto2: r.importo_acconto2 || null,
    importo_iva: r.importo_iva || null,
    importo_contabilita: r.importo_contabilita || null,
    cont_completata: r.cont_completata || 0,
  };
  _rowStore[id] = {
    ...r,
    stato: nuovoStato,
    data_completamento: data.data_completamento,
  };
  socket.emit("update:adempimento_stato", data);
  showNotif(
    nuovoStato === "completato"
      ? "✅ Completato!"
      : "⭕ Ripristinato a Da fare",
    "success",
  );
}


// ─── IMPOSTA STATO CHECKBOX (tre bottoni nella pill) ──────────
function setCbxStato(event, id, nuovoStato) {
  event.preventDefault();
  event.stopPropagation();
  const r = _rowStore[id];
  if (!r) return;
  if (r.stato === nuovoStato) return;
  const data = {
    id,
    stato: nuovoStato,
    data_scadenza: r.data_scadenza || null,
    data_completamento:
      nuovoStato === "completato" ? daItalianaAISO(oggiItaliano()) : null,
    note: r.note || null,
    importo: null,
    importo_saldo: null,
    importo_acconto1: null,
    importo_acconto2: null,
    importo_iva: null,
    importo_contabilita: null,
    cont_completata: 0,
  };
  _rowStore[id] = {
    ...r,
    stato: nuovoStato,
    data_completamento: data.data_completamento,
  };
  socket.emit("update:adempimento_stato", data);
  const icons = {
    completato: "✅ Fatto!",
    n_a: "➖ N/A",
    da_fare: "☐ Da fare",
  };
  showNotif(icons[nuovoStato] || "Aggiornato", "success");
}


// ─── TOGGLE CHECKBOX ADEMPIMENTO (click sulla checkbox pill) ──
function toggleCheckboxAdp(event, id) {
  event.preventDefault();
  event.stopPropagation();
  const r = _rowStore[id];
  if (!r) return;
  const nuovoStato = r.stato === "completato" ? "da_fare" : "completato";
  const data = {
    id,
    stato: nuovoStato,
    data_scadenza: r.data_scadenza || null,
    data_completamento:
      nuovoStato === "completato" ? daItalianaAISO(oggiItaliano()) : null,
    note: r.note || null,
    importo: null,
    importo_saldo: null,
    importo_acconto1: null,
    importo_acconto2: null,
    importo_iva: null,
    importo_contabilita: null,
    cont_completata: 0,
  };
  _rowStore[id] = {
    ...r,
    stato: nuovoStato,
    data_completamento: data.data_completamento,
  };
  socket.emit("update:adempimento_stato", data);
  showNotif(
    nuovoStato === "completato" ? "✅ Fatto!" : "☐ Annullato",
    "success",
  );
}
