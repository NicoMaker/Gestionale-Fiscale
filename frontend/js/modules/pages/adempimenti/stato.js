// ═══════════════════════════════════════════════════════════════
// ADEMPIMENTI-STATO.JS — Modal stato adempimento, importi (cont/rate/checkbox),
//                         salvataggio, esposizioni globali
// Dipende da: adempimenti-lista.js
// ═══════════════════════════════════════════════════════════════
// ─── MODAL STATO ADEMPIMENTO ──────────────────────────────────
function openAdpModal(r) {
  setVal("adp-id", r.id);
  setTxt("adp-nome-label", `${r.adempimento_nome} — ${getPeriodoLabel(r)}`);
  setVal("adp-stato", r.stato || "da_fare");
  setVal("adp-scadenza", formattaDataItaliana(r.data_scadenza) || "");
  setVal("adp-data", formattaDataItaliana(r.data_completamento) || "");
  setVal("adp-note", r.note || "");
  setVal("adp-is-contabilita", r.is_contabilita || 0);
  setVal("adp-has-rate", r.has_rate || 0);
  setVal("adp-is-checkbox", r.is_checkbox || 0);
  setVal("adp-is-text-only", r.is_text_only || 0);
  setVal("adp-rate-labels-json", r.rate_labels || "");

  setTimeout(() => {
    const campoScadenza = document.getElementById("adp-scadenza");
    const campoCompletamento = document.getElementById("adp-data");
    if (campoScadenza) {
      gestisciInputData(campoScadenza);
      creaDatePicker(campoScadenza);
    }
    if (campoCompletamento) {
      gestisciInputData(campoCompletamento);
      creaDatePicker(campoCompletamento);
    }
  }, 100);

  const clienteInfo = document.getElementById("adp-cliente-info");
  if (clienteInfo) {
    clienteInfo.innerHTML = renderClienteInfoBox({
      nome: r.cliente_nome,
      tipologia_codice: r.cliente_tipologia_codice,
      sottotipologia_nome: r.cliente_sottotipologia_nome,
      codice_fiscale: r.cliente_cf,
      partita_iva: r.cliente_piva,
      periodicita: r.cliente_periodicita,
      col2_value: r.cliente_col2,
      col3_value: r.cliente_col3,
    });
  }

  const isCont = isContabilita(r);
  const isRate = hasRate(r);
  const isCbx = isCheckbox(r);
  const isText = isTextOnly(r);
  const isSemplice = !isCont && !isRate && !isCbx && !isText;

  const dataCompletamentoGroup = document.getElementById(
    "data-completamento-group",
  );
  const statoGroup = document.getElementById("stato-group");
  if (dataCompletamentoGroup)
    dataCompletamentoGroup.style.display = isCont || isRate ? "" : "none";
  if (statoGroup) statoGroup.style.display = isText ? "none" : "";

  const sectNormale = document.getElementById("sect-importo-normale");
  const sectCont = document.getElementById("sect-importo-cont");
  const sectRate = document.getElementById("sect-importo-rate");
  const sectCheckbox = document.getElementById("sect-importo-checkbox");
  const sectTextOnly = document.getElementById("sect-text-only");

  if (sectNormale) sectNormale.style.display = "none";
  if (sectCont) sectCont.style.display = "none";
  if (sectRate) sectRate.style.display = "none";
  if (sectCheckbox) sectCheckbox.style.display = "none";
  if (sectTextOnly) sectTextOnly.style.display = "none";

  if (isCbx) {
    if (sectCheckbox) sectCheckbox.style.display = "block";
    _aggiornaPulsantiCheckbox(r.stato || "da_fare");
  } else if (isCont) {
    if (sectCont) sectCont.style.display = "block";
    setVal("adp-imp-iva", formattaNumeroItaliano(r.importo_iva));
    setVal("adp-imp-cont", formattaNumeroItaliano(r.importo_contabilita));
    const contCheck = document.getElementById("adp-cont-completata");
    if (contCheck) contCheck.checked = parseInt(r.cont_completata) === 1;
    _aggiornaColoriContabilita(r);
  } else if (isRate) {
    if (sectRate) sectRate.style.display = "block";
    setVal("adp-imp-saldo", formattaNumeroItaliano(r.importo_saldo));
    setVal("adp-imp-acc1", formattaNumeroItaliano(r.importo_acconto1));
    setVal("adp-imp-acc2", formattaNumeroItaliano(r.importo_acconto2));
    let lb = ["Saldo", "1° Acconto", "2° Acconto"];
    try {
      if (r.rate_labels) lb = JSON.parse(r.rate_labels);
    } catch (e) {}
    setTxt("rate-l0", `💰 ${lb[0]} (€)`);
    setTxt("rate-l1", `📥 ${lb[1]} (€)`);
    setTxt("rate-l2", `📥 ${lb[2]} (€)`);
    const rateContWrapper = document.getElementById(
      "rate-contabilita-checkbox-wrapper",
    );
    if (rateContWrapper) rateContWrapper.style.display = "";
    const rateContCheck = document.getElementById("adp-rate-cont-completata");
    if (rateContCheck)
      rateContCheck.checked = parseInt(r.cont_completata) === 1;
    _aggiornaColoriRateContabilita(r);
  } else if (isText) {
    if (sectTextOnly) sectTextOnly.style.display = "block";
  } else if (isSemplice) {
    if (sectNormale) sectNormale.style.display = "none";
  }
  openModal("modal-adempimento");
}

// ─── CHECKBOX PILL UI ─────────────────────────────────────────
function _aggiornaPulsantiCheckbox(stato) {
  const btnDaFare = document.getElementById("cbx-modal-dafare");
  const btnNA = document.getElementById("cbx-modal-na");
  const btnCompl = document.getElementById("cbx-modal-completato");
  if (!btnDaFare || !btnNA || !btnCompl) return;
  [btnDaFare, btnNA, btnCompl].forEach((b) => {
    b.classList.remove(
      "cbx-modal-active-red",
      "cbx-modal-active-gray",
      "cbx-modal-active-green",
    );
    b.style.opacity = "0.5";
    b.style.transform = "scale(1)";
  });
  if (stato === "da_fare") {
    btnDaFare.classList.add("cbx-modal-active-red");
    btnDaFare.style.opacity = "1";
    btnDaFare.style.transform = "scale(1.05)";
  } else if (stato === "n_a") {
    btnNA.classList.add("cbx-modal-active-gray");
    btnNA.style.opacity = "1";
    btnNA.style.transform = "scale(1.05)";
  } else if (stato === "completato") {
    btnCompl.classList.add("cbx-modal-active-green");
    btnCompl.style.opacity = "1";
    btnCompl.style.transform = "scale(1.05)";
  }
}

function setCbxModalStato(nuovoStato) {
  setVal("adp-stato", nuovoStato);
  _aggiornaPulsantiCheckbox(nuovoStato);
}

// ─── COLORI CONTABILITÀ PURA ──────────────────────────────────
function _aggiornaColoriContabilita(r) {
  const ivaVal = document.getElementById("adp-imp-iva")?.value;
  const hasIva = ivaVal != null && ivaVal !== "";
  const contCheck = document.getElementById("adp-cont-completata");
  const contDone = contCheck
    ? contCheck.checked
    : parseInt(r?.cont_completata) === 1;
  let colorIva = "",
    colorCont = "";
  if (hasIva && contDone) colorIva = colorCont = "var(--green)";
  else if (hasIva || contDone) colorIva = colorCont = "var(--accent)";
  const ivaLabel = document.getElementById("label-imp-iva");
  const contLabel = document.getElementById("label-cont-completata");
  const contSpan = document.getElementById("label-imp-cont");
  if (ivaLabel) ivaLabel.style.color = colorIva;
  if (contLabel) contLabel.style.color = colorCont;
  if (contSpan) contSpan.style.color = colorCont;
}

function onContabilitaImportoChange() {
  _aggiornaColoriContabilita(null);
  coloraInputImporto(document.getElementById("adp-imp-iva"));
}

function coloraInputImporto(input) {
  if (!input) return;
  const raw = (input.value || "").replace(/\./g, "").replace(",", ".").trim();
  const num = parseFloat(raw);
  if (!input.value || isNaN(num)) {
    input.style.color = "";
    input.style.borderColor = "";
  } else if (num < 0) {
    input.style.color = "var(--red)";
    input.style.borderColor = "";
  } else {
    input.style.color = "var(--green)";
    input.style.borderColor = "";
  }
}

function parseItalianoFloat(str) {
  if (str === null || str === undefined || str === "") return null;
  const n = parseFloat(String(str).replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? null : n;
}

function formattaInputConSeparatori(input) {
  if (!input) return;
  const raw = input.value;
  if (!raw) return;
  const posCursore = input.selectionStart;
  const lunghezzaOriginale = raw.length;
  const negativo = raw.startsWith("-");
  let pulito = raw.replace(/\./g, "").replace(/[^0-9,-]/g, "");
  if (pulito.startsWith("-")) pulito = pulito.substring(1);
  const parti = pulito.split(",");
  let intero = parti[0];
  let decimale =
    parti.length > 1 ? parti.slice(1).join("").substring(0, 2) : null;
  intero = intero.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  let formattato = negativo ? "-" + intero : intero;
  if (decimale !== null) formattato += "," + decimale;
  if (raw !== formattato) {
    input.value = formattato;
    const delta = formattato.length - lunghezzaOriginale;
    const nuovaPos = Math.max(0, posCursore + delta);
    try {
      input.setSelectionRange(nuovaPos, nuovaPos);
    } catch (e) {}
  }
}

function bloccaPuntoInput(e) {
  if (e.key === ".") {
    e.preventDefault();
    const input = e.target;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const val = input.value;
    if (!val.includes(",")) {
      input.value = val.substring(0, start) + "," + val.substring(end);
      input.setSelectionRange(start + 1, start + 1);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }
  if (e.key === "-") {
    const input = e.target;
    if (input.selectionStart !== 0 || input.value.includes("-"))
      e.preventDefault();
  }
}

function validaInputNumerico(input) {
  formattaInputConSeparatori(input);
  coloraInputImporto(input);
}

function convertiVirgolaInPunto(input) {
  const raw = input.value.trim();
  if (!raw || raw === "-") {
    input.value = "";
    coloraInputImporto(input);
    return;
  }
  const negativo = raw.startsWith("-");
  let pulito = raw.replace(/\./g, "").replace(/[^0-9,-]/g, "");
  if (pulito.startsWith("-")) pulito = pulito.substring(1);
  const parti = pulito.split(",");
  let intero = parti[0] || "0";
  let decimale =
    parti.length > 1 ? parti[1].substring(0, 2).padEnd(2, "0") : "00";
  intero = intero.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  input.value = (negativo ? "-" : "") + intero + "," + decimale;
  coloraInputImporto(input);
}

function _aggiornaColoriRateContabilita(r) {
  const rateContCheck = document.getElementById("adp-rate-cont-completata");
  const contDone = rateContCheck
    ? rateContCheck.checked
    : parseInt(r?.cont_completata) === 1;
  const saldoVal = document.getElementById("adp-imp-saldo")?.value;
  const acc1Val = document.getElementById("adp-imp-acc1")?.value;
  const acc2Val = document.getElementById("adp-imp-acc2")?.value;
  const hasAnyRate =
    (saldoVal && saldoVal !== "") ||
    (acc1Val && acc1Val !== "") ||
    (acc2Val && acc2Val !== "");
  let color = "none";
  if (hasAnyRate && contDone) color = "both";
  else if (hasAnyRate || contDone) color = "one";
  const labelCont = document.getElementById("label-rate-cont");
  if (labelCont)
    labelCont.style.color =
      color === "both"
        ? "var(--green)"
        : color === "one"
          ? "var(--accent)"
          : "";
}

function onRateContabilitaChange() {
  _aggiornaColoriRateContabilita(null);
  ["adp-imp-saldo", "adp-imp-acc1", "adp-imp-acc2"].forEach((id) =>
    coloraInputImporto(document.getElementById(id)),
  );
}

function saveAdpStato() {
  const id = parseInt(getVal("adp-id"));
  const isCont = getVal("adp-is-contabilita") === "1";
  const isRate = getVal("adp-has-rate") === "1";
  const isCbx = getVal("adp-is-checkbox") === "1";
  const isText = getVal("adp-is-text-only") === "1";
  const isSemplice = !isCont && !isRate && !isCbx && !isText;

  const data = {
    id,
    stato: getVal("adp-stato"),
    data_scadenza: daItalianaAISO(getVal("adp-scadenza")) || null,
    data_completamento: null,
    note: getVal("adp-note") || null,
    cont_completata: 0,
  };

  if (isText) {
    data.stato = "text_only";
    data.importo = null;
    data.importo_saldo = null;
    data.importo_acconto1 = null;
    data.importo_acconto2 = null;
    data.importo_iva = null;
    data.importo_contabilita = null;
  } else if (isCbx) {
    // nessun importo
  } else if (isCont) {
    data.importo_iva = parseItalianoFloat(getVal("adp-imp-iva"));
    data.importo_contabilita = parseItalianoFloat(getVal("adp-imp-cont"));
    data.cont_completata = document.getElementById("adp-cont-completata")
      ?.checked
      ? 1
      : 0;
    if (data.stato === "completato")
      data.data_completamento =
        daItalianaAISO(getVal("adp-data")) || daItalianaAISO(oggiItaliano());
  } else if (isRate) {
    data.importo_saldo = parseItalianoFloat(getVal("adp-imp-saldo"));
    data.importo_acconto1 = parseItalianoFloat(getVal("adp-imp-acc1"));
    data.importo_acconto2 = parseItalianoFloat(getVal("adp-imp-acc2"));
    data.cont_completata = document.getElementById("adp-rate-cont-completata")
      ?.checked
      ? 1
      : 0;
    if (data.stato === "completato")
      data.data_completamento =
        daItalianaAISO(getVal("adp-data")) || daItalianaAISO(oggiItaliano());
  } else if (isSemplice) {
    data.importo = null;
    if (data.stato === "completato")
      data.data_completamento =
        daItalianaAISO(getVal("adp-data")) || daItalianaAISO(oggiItaliano());
    else data.data_completamento = null;
  }

  socket.emit("update:adempimento_stato", data);
}

function deleteAdpCliente() {
  if (!confirm("Rimuovere questo adempimento dallo scadenzario?")) return;
  const id = parseInt(getVal("adp-id"));
  socket.emit("delete:adempimento_cliente", { id });
}

// Esposizioni globali
window.openNuovoAdpDef = openNuovoAdpDef;
window.editAdpDef = editAdpDef;
window.deleteAdpDef = deleteAdpDef;
window.saveAdpDef = saveAdpDef;
window.onAdpTipoChange = onAdpTipoChange;
window.applyAdempimentiFiltriSearch = applyAdempimentiFiltriSearch;
window.resetAdempimentiFiltri = resetAdempimentiFiltri;
