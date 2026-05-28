// ═══════════════════════════════════════════════════════════════
// PAGINA-BIANCA-MODAL.JS — Modale nuovo/modifica appunto,
//                           salvataggio, eliminazione, esposizioni globali
// Dipende da: pagina-bianca-render.js
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// MODALE NUOVO APPUNTO
// ═══════════════════════════════════════════════════════════════
function openPaginaBiancaEditor(id = null) {
  paginaBiancaEditMode = !!id;
  paginaBiancaCurrentEntry = id;

  if (!state.clienti || state.clienti.length === 0) {
    socket.emit("get:clienti", { anno: state.anno });
    socket.once("res:clienti", (data) => {
      if (data.success) {
        state.clienti = data.data;
        showPaginaBiancaModal();
      }
    });
  } else {
    showPaginaBiancaModal();
  }
}

function showPaginaBiancaModal() {
  let modal = document.getElementById("modal-pagina-bianca");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "modal-pagina-bianca";
    modal.className = "modal-overlay";
    modal.innerHTML = `
      <div class="modal modal-lg" style="max-width: 800px;">
        <div class="modal-title">
          <span id="pb-modal-title">✏️ Nuova Nota</span>
        </div>
        <input type="hidden" id="pb-id">
        
        <div class="form-group">
          <label>Tipo Appunto <span class="required-star">*</span></label>
          <div style="display: flex; gap: 16px; margin-top: 8px;">
            <label class="flag-chip" style="cursor: pointer;">
              <input type="radio" name="pb-tipo" value="studio" onchange="onPaginaBiancaTipoChange()">
              <span>🏢 Appunto Studio</span>
            </label>
            <label class="flag-chip" style="cursor: pointer;">
              <input type="radio" name="pb-tipo" value="cliente" onchange="onPaginaBiancaTipoChange()">
              <span>👤 Appunto Cliente</span>
            </label>
          </div>
        </div>

        <div id="pb-cliente-group" class="form-group" style="display: none;">
          <label>Cliente Associato <span class="required-star">*</span></label>
          <div style="position: relative;">
            <input type="text" 
              id="pb-modal-cliente-search" 
              class="input" 
              placeholder="🔍 Cerca cliente..." 
              style="margin-bottom: 4px;"
              oninput="filterModalClientiSelect()">
            <select id="pb-id-cliente" class="select" style="margin-top: 0px; height: 160px; overflow-y: scroll;" size="6">
              <option value="">-- Seleziona un cliente --</option>
              ${state.clienti ? state.clienti.map((c) => `<option value="${c.id}">${escAttr(c.nome)} (${c.tipologia_codice || "-"})</option>`).join("") : ""}
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>Titolo</label>
          <input type="text" id="pb-titolo" class="input" placeholder="Titolo della nota (opzionale)..." maxlength="200">
        </div>

        <div class="form-group">
          <label>Contenuto</label>
          <textarea id="pb-contenuto" class="input" rows="12" placeholder="Scrivi qui il tuo appunto...&#10;&#10;Puoi usare testo libero, note, promemoria, checklist, ecc." style="font-family: inherit; resize: vertical;"></textarea>
        </div>

        <div class="form-group">
          <label>Allegati / Riferimenti</label>
          <input type="text" id="pb-allegati" class="input" placeholder="Es: Documenti allegati, link, riferimenti, ecc.">
        </div>

        <div class="modal-actions">
          <button class="btn btn-secondary" onclick="closeModal('modal-pagina-bianca')">Annulla</button>
          <button class="btn btn-primary" onclick="savePaginaBiancaAppunto()">💾 Salva Appunto</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.remove("open");
    });
  }

  // Reset form
  document.getElementById("pb-id").value = "";
  document.getElementById("pb-titolo").value = "";
  document.getElementById("pb-contenuto").value = "";
  document.getElementById("pb-allegati").value = "";

  const modalSearch = document.getElementById("pb-modal-cliente-search");
  if (modalSearch) modalSearch.value = "";

  const clienteSelect = document.getElementById("pb-id-cliente");
  if (clienteSelect) clienteSelect.value = "";

  // Reset esplicito radio e gruppo cliente prima di applicare il contesto
  const radioStudio = document.querySelector(
    'input[name="pb-tipo"][value="studio"]',
  );
  const radioCliente = document.querySelector(
    'input[name="pb-tipo"][value="cliente"]',
  );
  // Reset di default a "studio" e nascondi gruppo cliente
  if (radioStudio) radioStudio.checked = true;
  if (radioCliente) radioCliente.checked = false;
  const clienteGroupReset = document.getElementById("pb-cliente-group");
  if (clienteGroupReset) clienteGroupReset.style.display = "none";

  if (paginaBiancaFilter.tipo === "cliente" && paginaBiancaFilter.id_cliente) {
    if (radioCliente) radioCliente.checked = true;
    document.getElementById("pb-cliente-group").style.display = "block";
    setTimeout(() => {
      if (clienteSelect) clienteSelect.value = paginaBiancaFilter.id_cliente;
      filterModalClientiSelect();
    }, 50);
    document.getElementById("pb-modal-title").textContent =
      "✏️ Nuova Nota Cliente";
  } else if (
    paginaBiancaFilter.tipo === "cliente" &&
    !paginaBiancaFilter.id_cliente
  ) {
    if (radioCliente) radioCliente.checked = true;
    document.getElementById("pb-cliente-group").style.display = "block";
    document.getElementById("pb-modal-title").textContent =
      "✏️ Nuova Nota Cliente";
  } else {
    if (radioStudio) radioStudio.checked = true;
    document.getElementById("pb-cliente-group").style.display = "none";
    document.getElementById("pb-modal-title").textContent =
      "✏️ Nuova Nota Studio";
  }

  // Se è in modifica
  if (paginaBiancaEditMode && paginaBiancaCurrentEntry) {
    socket.emit("get:pagina_bianca_singolo", { id: paginaBiancaCurrentEntry });
    socket.once("res:pagina_bianca_singolo", ({ success, data }) => {
      if (success && data) {
        document.getElementById("pb-id").value = data.id;
        document.getElementById("pb-titolo").value = data.titolo || "";
        document.getElementById("pb-contenuto").value = data.contenuto || "";
        document.getElementById("pb-allegati").value = data.allegati || "";
        document.getElementById("pb-modal-title").textContent =
          "✏️ Modifica Nota";

        if (data.tipo === "cliente") {
          if (radioCliente) radioCliente.checked = true;
          document.getElementById("pb-cliente-group").style.display = "block";
          if (data.id_cliente && clienteSelect) {
            clienteSelect.value = data.id_cliente;
            filterModalClientiSelect();
          }
        } else {
          if (radioStudio) radioStudio.checked = true;
          document.getElementById("pb-cliente-group").style.display = "none";
        }
      }
    });
  }

  openModal("modal-pagina-bianca");
}

function onPaginaBiancaTipoChange() {
  const tipo = document.querySelector('input[name="pb-tipo"]:checked')?.value;
  const clienteGroup = document.getElementById("pb-cliente-group");
  const titleSpan = document.getElementById("pb-modal-title");

  if (clienteGroup) {
    clienteGroup.style.display = tipo === "cliente" ? "block" : "none";
  }

  if (titleSpan) {
    titleSpan.textContent =
      tipo === "cliente" ? "✏️ Nuova Nota Cliente" : "✏️ Nuova Nota Studio";
  }
}

function savePaginaBiancaAppunto() {
  const id = document.getElementById("pb-id").value;
  const tipo = document.querySelector('input[name="pb-tipo"]:checked')?.value;
  const titolo = document.getElementById("pb-titolo").value.trim() || null;
  const contenuto = document.getElementById("pb-contenuto").value;
  const allegati = document.getElementById("pb-allegati").value;
  let id_cliente = null;

  if (tipo === "cliente") {
    id_cliente = document.getElementById("pb-id-cliente").value;
    if (!id_cliente) {
      showNotif("Seleziona un cliente per l'appunto", "error");
      return;
    }
    id_cliente = parseInt(id_cliente);
  }

  const data = {
    tipo,
    titolo,
    contenuto: contenuto || null,
    allegati: allegati || null,
    id_cliente: id_cliente || null,
  };

  if (id) {
    data.id = parseInt(id);
    socket.emit("update:pagina_bianca", data);
  } else {
    socket.emit("create:pagina_bianca", data);
  }

  closeModal("modal-pagina-bianca");
}

function deletePaginaBiancaAppunto(id) {
  if (confirm("Eliminare questa nota definitivamente?")) {
    socket.emit("delete:pagina_bianca", { id });
  }
}

function openPaginaBiancaPerCliente(clienteId, clienteNome) {
  paginaBiancaFilter = {
    tipo: "cliente",
    id_cliente: String(clienteId),
    search: "",
  };
  paginaBiancaClientiSearchTerm = "";

  document
    .querySelectorAll(".nav-item")
    .forEach((x) => x.classList.remove("active"));
  const nav = document.querySelector('[data-page="pagina_bianca"]');
  if (nav) nav.classList.add("active");

  state.page = "pagina_bianca";
  document.getElementById("page-title").textContent = `📝 Note`;

  setupPaginaBiancaSocketListeners();
  renderPaginaBiancaPage();
}

// ═══════════════════════════════════════════════════════════════
// INIZIALIZZAZIONE
// ═══════════════════════════════════════════════════════════════
setupPaginaBiancaSocketListeners();

// ═══════════════════════════════════════════════════════════════
// ESPOSIZIONI GLOBALI
// ═══════════════════════════════════════════════════════════════
window.renderPaginaBiancaPage = renderPaginaBiancaPage;
window.setPaginaBiancaTipo = setPaginaBiancaTipo;
window.filterPaginaBianca = filterPaginaBianca;
window.resetPaginaBiancaFiltri = resetPaginaBiancaFiltri;
window.openPaginaBiancaEditor = openPaginaBiancaEditor;
window.savePaginaBiancaAppunto = savePaginaBiancaAppunto;
window.deletePaginaBiancaAppunto = deletePaginaBiancaAppunto;
window.onPaginaBiancaTipoChange = onPaginaBiancaTipoChange;
window.openPaginaBiancaPerCliente = openPaginaBiancaPerCliente;
window.debounceFilterPaginaBianca = debounceFilterPaginaBianca;
window.cleanupPaginaBianca = cleanupPaginaBianca;
window.onPaginaBiancaClientiSearch = onPaginaBiancaClientiSearch;
window.onPaginaBiancaClienteSelectChange = onPaginaBiancaClienteSelectChange;
window.filterModalClientiSelect = filterModalClientiSelect;
window.onModalClientiSearchInput = onModalClientiSearchInput;
window.stampaPaginaBianca = stampaPaginaBianca;
