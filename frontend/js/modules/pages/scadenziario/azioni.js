// ═══════════════════════════════════════════════════════════════
// SCADENZARIO-AZIONI.JS — Genera, copia, aggiungi adempimento,
//                          adempimento personalizzato, esposizioni globali
// Dipende da: scadenzario-render.js
// ═══════════════════════════════════════════════════════════════
// ─── AZIONI ───────────────────────────────────────────────────
function generaScadenzario() {
  if (!state.selectedCliente) return;

  const mancanti = getAdempimentiMancanti();

  if (!state.adempimenti || state.adempimenti.length === 0) {
    if (typeof socket !== "undefined") {
      socket.emit("get:adempimenti");
      socket.once("res:adempimenti", ({ success, data }) => {
        if (success) {
          state.adempimenti = data;
          generaScadenzario();
        }
      });
    }
    return;
  }

  if (
    mancanti.length === 0 &&
    state.scadenzario &&
    state.scadenzario.length > 0
  ) {
    showNotif(
      "✅ Tutti gli adempimenti sono già stati generati per quest'anno",
      "success",
    );
    return;
  }

  const idAdpDaGenerare =
    mancanti.length > 0
      ? mancanti.map((a) => a.id)
      : state.adempimenti.map((a) => a.id);

  if (typeof socket !== "undefined") {
    socket.emit("genera:tutti", {
      anno: state.anno,
      adempimenti: idAdpDaGenerare,
      id_cliente: state.selectedCliente.id,
    });
    showNotif(
      `⚡ Generazione di ${idAdpDaGenerare.length} adempiment${idAdpDaGenerare.length === 1 ? "o" : "i"} in corso...`,
      "info",
    );
  }
}

function openCopia() {
  if (!state.selectedCliente) return;
  document.getElementById("copia-cliente-id").value = state.selectedCliente.id;
  document.getElementById("copia-modalita").value = "singolo";
  document.getElementById("copia-da").value = state.anno - 1;
  document.getElementById("copia-a").value = state.anno;
  document.getElementById("copia-info").innerHTML =
    `Copia adempimenti per <strong>${state.selectedCliente.nome}</strong>`;
  openModal("modal-copia");
}

function openCopiaTutti() {
  document.getElementById("copia-cliente-id").value = "";
  document.getElementById("copia-modalita").value = "tutti";
  document.getElementById("copia-da").value = state.anno - 1;
  document.getElementById("copia-a").value = state.anno;
  document.getElementById("copia-info").innerHTML =
    `Copia adempimenti per <strong>tutti i clienti</strong>`;
  openModal("modal-copia");
}

function eseguiCopia() {
  const modalita = document.getElementById("copia-modalita").value;
  const da = parseInt(document.getElementById("copia-da").value);
  const a = parseInt(document.getElementById("copia-a").value);
  if (modalita === "singolo") {
    const id = parseInt(document.getElementById("copia-cliente-id").value);
    if (typeof socket !== "undefined") {
      socket.emit("copia:scadenzario", {
        id_cliente: id,
        anno_da: da,
        anno_a: a,
      });
    }
  } else {
    if (typeof socket !== "undefined") {
      socket.emit("copia:tutti", { anno_da: da, anno_a: a });
    }
  }
}

function openGeneraTutti() {
  document.getElementById("genera-tutti-anno").value = state.anno;

  if (!state.adempimenti || state.adempimenti.length === 0) {
    if (typeof socket !== "undefined") {
      socket.emit("get:adempimenti");
    }
    const container = document.getElementById("genera-tutti-adempimenti-list");
    if (container) {
      container.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text3);">
        <div>📋 Caricamento adempimenti...</div>
      </div>`;
    }
  } else {
    renderAdempimentiSelection();
  }

  openModal("modal-genera-tutti");
}

function renderAdempimentiSelection() {
  const container = document.getElementById("genera-tutti-adempimenti-list");
  if (!container) return;

  if (!state.adempimenti || state.adempimenti.length === 0) {
    if (typeof socket !== "undefined") {
      socket.emit("get:adempimenti");
    }
    container.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text3);">
      <div>📋 Caricamento adempimenti...</div>
    </div>`;
    setTimeout(() => {
      if (!state.adempimenti || state.adempimenti.length === 0) {
        renderAdempimentiSelection();
      }
    }, 2000);
    return;
  }

  const checkboxes = state.adempimenti
    .map((a) => {
      const checked = localStorage.getItem(`gen_adp_${a.id}`) !== "false";
      localStorage.setItem(`gen_adp_${a.id}`, checked);
      return `
      <label class="flag-chip" style="margin: 2px; padding: 6px 10px; font-size: 12px;">
        <input type="checkbox" 
               id="gen_adp_${a.id}" 
               value="${a.id}" 
               ${checked ? "checked" : ""}
               onchange="saveAdpSelection(${a.id})">
        <span>${a.nome} (${a.codice})</span>
      </label>
    `;
    })
    .join("");

  container.innerHTML = checkboxes;
  updateSelectAllCheckbox();
}

function updateSelectAllCheckbox() {
  const selectAllCheckbox = document.getElementById(
    "genera-tutti-seleziona-tutti",
  );
  if (!selectAllCheckbox) return;

  const totalCheckboxes = state.adempimenti.filter((a) =>
    document.getElementById(`gen_adp_${a.id}`),
  );
  const checkedBoxes = totalCheckboxes.filter(
    (a) => document.getElementById(`gen_adp_${a.id}`).checked,
  );

  selectAllCheckbox.checked =
    totalCheckboxes.length > 0 &&
    checkedBoxes.length === totalCheckboxes.length;
}

function saveAdpSelection(id) {
  const checkbox = document.getElementById(`gen_adp_${id}`);
  localStorage.setItem(`gen_adp_${id}`, checkbox.checked);
}

function toggleSelezionaTuttiAdempimenti() {
  const selectAll = document.getElementById(
    "genera-tutti-seleziona-tutti",
  ).checked;
  state.adempimenti.forEach((a) => {
    const checkbox = document.getElementById(`gen_adp_${a.id}`);
    if (checkbox) {
      checkbox.checked = selectAll;
      localStorage.setItem(`gen_adp_${a.id}`, selectAll);
    }
  });
}

function getSelectedAdempimenti() {
  return state.adempimenti
    .filter((a) => {
      const checkbox = document.getElementById(`gen_adp_${a.id}`);
      return checkbox && checkbox.checked;
    })
    .map((a) => a.id);
}

function eseguiGeneraTutti() {
  const anno = parseInt(document.getElementById("genera-tutti-anno").value);
  const selectedAdempimenti = getSelectedAdempimenti();
  const modalita =
    document.querySelector('input[name="genera-modalita"]:checked')?.value ||
    "normale";

  if (selectedAdempimenti.length === 0) {
    showNotif("Seleziona almeno un adempimento da generare", "error");
    return;
  }

  if (typeof socket !== "undefined") {
    if (modalita === "rigenera") {
      socket.emit("rigenera:tutti", { anno, adempimenti: selectedAdempimenti });
    } else {
      socket.emit("genera:tutti", { anno, adempimenti: selectedAdempimenti });
    }
  }
}

function openAddAdp(id_cliente) {
  document.getElementById("add-adp-cliente-id").value = id_cliente;
  document.getElementById("add-adp-anno").value = state.anno;

  const searchEl = document.getElementById("add-adp-search");
  if (searchEl) searchEl.value = "";

  if (!state.adempimenti || state.adempimenti.length === 0) {
    if (typeof socket !== "undefined") {
      socket.emit("get:adempimenti");
    }
    const container = document.getElementById("add-adp-list");
    if (container) {
      container.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text3);">
        <div>📋 Caricamento adempimenti...</div>
      </div>`;
    }
  } else {
    renderAddAdpSelection();
  }

  const c = state.selectedCliente;
  if (c)
    document.getElementById("add-adp-cliente-info").innerHTML =
      renderClienteInfoBox(c);
  if (typeof resetAddAdpTab === "function") {
    setTimeout(function () {
      resetAddAdpTab();
    }, 0);
  }
  openModal("modal-add-adp");
}

function filtraAddAdpList() {
  const q =
    document.getElementById("add-adp-search")?.value.toLowerCase().trim() || "";
  renderAddAdpSelection(q);
}

function renderAddAdpSelection(filtro = "") {
  const container = document.getElementById("add-adp-list");
  if (!container) return;

  if (!state.adempimenti || state.adempimenti.length === 0) {
    if (typeof socket !== "undefined") {
      socket.emit("get:adempimenti");
    }
    container.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text3);">
      <div>📋 Caricamento adempimenti...</div>
    </div>`;
    setTimeout(() => {
      if (!state.adempimenti || state.adempimenti.length === 0) {
        renderAddAdpSelection(filtro);
      }
    }, 2000);
    return;
  }

  const annoCorrente =
    parseInt(document.getElementById("add-adp-anno")?.value) || state.anno;

  const adempimentiFiltrati = filtro
    ? state.adempimenti.filter(
        (a) =>
          (a.anno_validita == null ||
            Number(a.anno_validita) === annoCorrente) &&
          (a.nome.toLowerCase().includes(filtro) ||
            a.codice.toLowerCase().includes(filtro)),
      )
    : state.adempimenti.filter(
        (a) =>
          a.anno_validita == null || Number(a.anno_validita) === annoCorrente,
      );

  if (adempimentiFiltrati.length === 0) {
    container.innerHTML = `<div style="text-align:center;padding:16px;color:var(--text3);font-size:13px">Nessun adempimento trovato</div>`;
    return;
  }

  const checkboxes = adempimentiFiltrati
    .map((a) => {
      const checked = localStorage.getItem(`add_adp_${a.id}`) !== "false";
      localStorage.setItem(`add_adp_${a.id}`, checked);
      return `
      <label class="flag-chip" style="margin: 2px; padding: 6px 10px; font-size: 12px;">
        <input type="checkbox" 
               id="add_adp_${a.id}" 
               value="${a.id}" 
               ${checked ? "checked" : ""}
               onchange="saveAddAdpSelection(${a.id})">
        <span>${a.nome} (${a.codice})</span>
      </label>
    `;
    })
    .join("");

  container.innerHTML = checkboxes;
  updateSelectAllAddAdpCheckbox();
}

function updateSelectAllAddAdpCheckbox() {
  const selectAllCheckbox = document.getElementById("add-adp-seleziona-tutti");
  if (!selectAllCheckbox) return;

  const totalCheckboxes = state.adempimenti.filter((a) =>
    document.getElementById(`add_adp_${a.id}`),
  );
  const checkedBoxes = totalCheckboxes.filter(
    (a) => document.getElementById(`add_adp_${a.id}`).checked,
  );

  selectAllCheckbox.checked =
    totalCheckboxes.length > 0 &&
    checkedBoxes.length === totalCheckboxes.length;
}

function saveAddAdpSelection(id) {
  const checkbox = document.getElementById(`add_adp_${id}`);
  localStorage.setItem(`add_adp_${id}`, checkbox.checked);
}

function toggleSelezionaTuttiAddAdp() {
  const selectAll = document.getElementById("add-adp-seleziona-tutti").checked;
  state.adempimenti.forEach((a) => {
    const checkbox = document.getElementById(`add_adp_${a.id}`);
    if (checkbox) {
      checkbox.checked = selectAll;
      localStorage.setItem(`add_adp_${a.id}`, selectAll);
    }
  });
}

function getSelectedAddAdp() {
  return state.adempimenti
    .filter((a) => {
      const checkbox = document.getElementById(`add_adp_${a.id}`);
      return checkbox && checkbox.checked;
    })
    .map((a) => a.id);
}

function refreshAddAdpSelect() {
  const mancanti = getAdempimentiMancanti();
  const sel = document.getElementById("add-adp-select");
  if (!sel) return;

  sel.innerHTML = mancanti
    .map(
      (a) =>
        `<option value="${a.id}" data-scadenza="${a.scadenza_tipo}">${a.codice} — ${a.nome}</option>`,
    )
    .join("");

  if (!sel.dataset.ssinit) {
    initSearchableSelect("add-adp-select");
  } else {
    if (sel._ssRefresh) sel._ssRefresh();
  }

  updatePeriodoOptions();
}

function updatePeriodoOptions() {
  const sel = document.getElementById("add-adp-select");
  const perSel = document.getElementById("add-adp-periodo");
  if (!sel || !perSel) return;
  const opt = sel.options[sel.selectedIndex];
  if (!opt) {
    perSel.innerHTML = "";
    return;
  }
  const tipo = opt.dataset.scadenza;
  let opts = "";
  if (tipo === "mensile")
    opts = MESI.map(
      (m, i) => `<option value="mese:${i + 1}">${m}</option>`,
    ).join("");
  else if (tipo === "trimestrale")
    opts = [1, 2, 3, 4]
      .map((t) => `<option value="trim:${t}">${t}° Trimestre</option>`)
      .join("");
  else if (tipo === "semestrale")
    opts = `<option value="sem:1">1° Semestre</option><option value="sem:2">2° Semestre</option>`;
  else opts = `<option value="annuale">Annuale</option>`;
  perSel.innerHTML = opts;
}

function eseguiAddAdp() {
  const id_cliente = parseInt(
    document.getElementById("add-adp-cliente-id").value,
  );
  const selectedAdempimenti = getSelectedAddAdp();
  const anno = parseInt(document.getElementById("add-adp-anno").value);

  if (selectedAdempimenti.length === 0) {
    showNotif("Seleziona almeno un adempimento da aggiungere", "error");
    return;
  }

  selectedAdempimenti.forEach((id_adempimento) => {
    const data = { id_cliente, id_adempimento, anno };
    if (typeof socket !== "undefined") {
      socket.emit("add:adempimento_cliente", data);
    }
  });

  closeModal("modal-add-adp");
}

function openAdempimentoPersonalizzato() {
  document.getElementById("custom-adp-anno").value = state.anno;
  openModal("modal-adempimento-personalizzato");
}

function creaAdempimentoPersonalizzato() {
  const nome = document.getElementById("custom-adp-nome").value.trim();
  const descrizione = document
    .getElementById("custom-adp-descrizione")
    .value.trim();
  const scadenzaTipo = document.getElementById(
    "custom-adp-scadenza-tipo",
  ).value;
  const isContabilita = document.getElementById(
    "custom-adp-is-contabilita",
  ).checked;
  const generaPer = document.getElementById("custom-adp-genera-per").value;
  const anno = parseInt(document.getElementById("custom-adp-anno").value);
  const clienteId = document.getElementById("custom-adp-cliente")?.value;

  if (!nome) {
    showNotif("Il nome dell'adempimento è obbligatorio", "error");
    return;
  }

  const data = {
    nome,
    descrizione,
    scadenza_tipo: scadenzaTipo,
    is_contabilita: isContabilita ? 1 : 0,
    anno,
    genera_immediatamente: generaPer !== "",
    clienti_selezionati: null,
  };

  if (generaPer === "tutti") {
    data.clienti_selezionati = "tutti";
  } else if (generaPer === "selezionati" && clienteId) {
    data.clienti_selezionati = [parseInt(clienteId)];
  } else if (generaPer === "selezionati" && !clienteId) {
    showNotif("Seleziona un cliente", "error");
    return;
  }

  if (typeof socket !== "undefined") {
    socket.emit("create:adempimento_personalizzato", data);
  }
}

// Esposizioni globali
window.onClienteChange = onClienteChange;
window.changeAnnoScad = changeAnnoScad;
window.applyScadFiltriAdp = applyScadFiltriAdp;
window.applyScadFiltri = applyScadFiltri;
window.filterAdpButtons = filterAdpButtons;
window.resetScadFiltri = resetScadFiltri;
window.generaScadenzario = generaScadenzario;
window.openCopia = openCopia;
window.openCopiaTutti = openCopiaTutti;
window.eseguiCopia = eseguiCopia;
window.openGeneraTutti = openGeneraTutti;
window.eseguiGeneraTutti = eseguiGeneraTutti;
window.openAddAdp = openAddAdp;
window.eseguiAddAdp = eseguiAddAdp;
window.openAdempimentoPersonalizzato = openAdempimentoPersonalizzato;
window.creaAdempimentoPersonalizzato = creaAdempimentoPersonalizzato;
window.refreshAddAdpSelect = refreshAddAdpSelect;
window.updatePeriodoOptions = updatePeriodoOptions;
window.toggleSelezionaTuttiAdempimenti = toggleSelezionaTuttiAdempimenti;
window.saveAdpSelection = saveAdpSelection;
window.toggleSelezionaTuttiAddAdp = toggleSelezionaTuttiAddAdp;
window.saveAddAdpSelection = saveAddAdpSelection;
window.toggleClienteSelect = function () {
  const generaPer = document.getElementById("custom-adp-genera-per")?.value;
  const clienteDiv = document.getElementById("custom-adp-cliente-div");
  if (clienteDiv) {
    clienteDiv.style.display = generaPer === "selezionati" ? "block" : "none";
  }
};
window.openAdempimentoPersonalizzatoFromDashboard = function () {
  document.getElementById("custom-adp-anno").value = state.anno;

  const clientiSelect = document.getElementById("custom-adp-cliente");
  if (clientiSelect && state.clienti && state.clienti.length > 0) {
    clientiSelect.innerHTML = `
      <option value="">-- Seleziona un cliente --</option>
      ${state.clienti.map((c) => `<option value="${c.id}">${c.nome} (${c.tipologia_codice || "-"})</option>`).join("")}
    `;
  }

  document.getElementById("custom-adp-nome").value = "";
  document.getElementById("custom-adp-descrizione").value = "";
  document.getElementById("custom-adp-scadenza-tipo").value = "annuale";
  document.getElementById("custom-adp-is-contabilita").checked = false;
  document.getElementById("custom-adp-genera-per").value = "tutti";

  window.toggleClienteSelect();
  openModal("modal-adempimento-personalizzato");
};
