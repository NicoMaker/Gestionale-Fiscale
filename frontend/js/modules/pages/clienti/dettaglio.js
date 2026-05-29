// ═══════════════════════════════════════════════════════════════
// CLIENTI-DETTAGLIO.JS — Dettaglio cliente, storico, modal modifica/nuovo
// Dipende da: clienti-filtri.js (per _cfg, _col2DbToLabel, ecc.)
// ═══════════════════════════════════════════════════════════════
// ─── DETTAGLIO CLIENTE ────────────────────────────────────────
function showClienteDettaglio(id) {
  currentClienteId = id;
  currentClienteAnno = new Date().getFullYear();
  loadClienteDettaglio(id, currentClienteAnno);
}

function loadClienteDettaglio(id, anno) {
  if (typeof socket !== "undefined") {
    socket.emit("get:cliente", { id, anno });
    socket.emit("get:cliente_storico", { id });
  }
}

if (typeof socket !== "undefined") {
  socket.on("res:cliente", ({ success, data, anno }) => {
    if (!success || !data) return;
    currentClienteAnno = anno;
    renderClienteDettaglio(data, anno);
  });

  socket.on("res:cliente_storico", ({ success, data }) => {
    if (!success) return;
    renderStoricoConfig(data);
  });
}

function renderClienteDettaglio(c, anno) {
  const tipColor = c.tipologia_colore || getTipologiaColor(c.tipologia_codice);
  const avatar = getAvatar(c.nome);
  const tipInfo = TIPOLOGIE_INFO[c.tipologia_codice] || {};

  const col2LMap = _col2DbToLabel();
  const col3LMap = _col3DbToLabel();
  const periodicitaMap = {
    mensile: "📅 Mensile",
    trimestrale: "📆 Trimestrale",
    annuale: "📅 Annuale",
  };

  const classificazioneHtml = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px">
      <div style="display:flex;align-items:center;gap:12px">
        <span style="font-size:13px;color:var(--t2)">📅 Anno configurazione:</span>
        <select id="det-anno-select" class="select" style="width:110px" onchange="onDettaglioAnnoChange()">
          ${buildAnniOptions(anno)}
        </select>
        ${
          c.config_anno && c.config_anno !== anno
            ? `<span class="badge-info" style="background:var(--yellow)18;color:var(--yellow)">⚠️ Ereditata dal ${c.config_anno}</span>`
            : ""
        }
      </div>
      <button class="btn btn-sm btn-primary" onclick="editClienteConfig(${c.id},${anno})" title="Modifica configurazione per quest'anno">✏️ Modifica ${anno}</button>
    </div>`;

  const noConfigWarning = !c.id_tipologia
    ? `<div class="infobox" style="margin-bottom:16px;background:var(--yellow)18;border-color:var(--yellow);color:var(--yellow)">
        ⚠️ Nessuna configurazione registrata per il ${anno}. Clicca <strong>Modifica ${anno}</strong> per crearne una.
       </div>`
    : "";

  const configCards = c.id_tipologia
    ? `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:20px">
      <div style="background:var(--s2);border-radius:var(--r-sm);padding:14px;border-left:3px solid ${tipColor}">
        <div style="font-size:11px;color:var(--t3);text-transform:uppercase">Tipologia</div>
        <div style="font-size:15px;font-weight:700;margin-top:4px">${tipInfo.icon || ""} ${c.tipologia_codice || "-"} — ${c.tipologia_nome || ""}</div>
      </div>
      ${
        c.col2_value
          ? `<div style="background:var(--s2);border-radius:var(--r-sm);padding:14px;border-left:3px solid #fb923c">
        <div style="font-size:11px;color:var(--t3);text-transform:uppercase">Sottocategoria</div>
        <div style="font-size:15px;font-weight:700;margin-top:4px">${col2LMap[c.col2_value] || c.col2_value}</div>
      </div>`
          : ""
      }
      ${
        c.col3_value
          ? `<div style="background:var(--s2);border-radius:var(--r-sm);padding:14px;border-left:3px solid #5b8df6">
        <div style="font-size:11px;color:var(--t3);text-transform:uppercase">Regime</div>
        <div style="font-size:15px;font-weight:700;margin-top:4px">${col3LMap[c.col3_value] || c.col3_value}</div>
      </div>`
          : ""
      }
      ${
        c.periodicita
          ? `<div style="background:var(--s2);border-radius:var(--r-sm);padding:14px;border-left:3px solid #22d3ee">
        <div style="font-size:11px;color:var(--t3);text-transform:uppercase">Periodicità</div>
        <div style="font-size:15px;font-weight:700;margin-top:4px">${periodicitaMap[c.periodicita] || c.periodicita}</div>
      </div>`
          : ""
      }
    </div>`
    : "";

  document.getElementById("modal-cliente-det-title").textContent = c.nome;
  document.getElementById("cliente-dettaglio-content").innerHTML = `
    <div style="display:flex;align-items:center;gap:16px;padding:16px;background:var(--s2);border-radius:var(--r-sm);margin-bottom:20px;border-left:4px solid ${tipColor}">
      <div class="det-avatar" style="width:48px;height:48px;background:${tipColor}22;border:2px solid ${tipColor};color:${tipColor};display:flex;align-items:center;justify-content:center;border-radius:12px;font-size:18px;font-weight:800">${avatar}</div>
      <div>
        <div style="font-size:20px;font-weight:800">${escAttr(c.nome)}</div>
        <div style="font-size:13px;color:var(--t2);margin-top:4px">${c.codice_fiscale || c.partita_iva || ""}</div>
      </div>
    </div>
    <div style="margin-bottom:12px;font-size:12px;font-weight:700;color:var(--accent);text-transform:uppercase">📊 Classificazione per ${anno}</div>
    ${classificazioneHtml}
    ${noConfigWarning}
    ${configCards}
    <div id="storico-config-container" style="margin-top:20px"></div>
    ${renderClienteDatiRiferimento(c)}`;

  const actions = document.getElementById("modal-cliente-det-actions");
  if (actions) {
    actions.innerHTML = `
      <button class="btn btn-danger btn-sm" onclick="deleteClienteFromDettaglio()">🗑️ Elimina</button>
      <div style="flex:1"></div>
      <button class="btn btn-secondary" onclick="closeModal('modal-cliente-dettaglio')">Chiudi</button>
      <button class="btn btn-primary" onclick="goToClienteScadenzario()">📅 Vai a Scadenzario</button>`;
  }
  openModal("modal-cliente-dettaglio");
}

function renderStoricoConfig(storico) {
  const container = document.getElementById("storico-config-container");
  if (!container) return;
  if (!storico || storico.length === 0) {
    container.innerHTML = `<div class="infobox" style="font-size:12px">📋 Nessuna configurazione storica.</div>`;
    return;
  }
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
  let rows = "";
  storico.forEach((cfg) => {
    rows += `<tr style="border-bottom:1px solid var(--b0)">
      <td style="padding:8px 12px;font-weight:700;color:var(--accent)">${cfg.anno}</td>
      <td style="padding:8px 12px"><span class="badge b-${(cfg.tipologia_codice || "").toLowerCase()}">${cfg.tipologia_codice || "-"}</span></td>
      <td style="padding:8px 12px">${cfg.col2_value || "-"}</td>
      <td style="padding:8px 12px">${cfg.col3_value ? col3Map[cfg.col3_value] || cfg.col3_value : "-"}</td>
      <td style="padding:8px 12px">${cfg.periodicita ? periodicitaMap[cfg.periodicita] || cfg.periodicita : "-"}</td>
      <td style="padding:8px 12px"><button class="btn btn-xs btn-secondary" onclick="editClienteConfig(${cfg.id_cliente},${cfg.anno})">✏️</button></td>
    </tr>`;
  });
  container.innerHTML = `
    <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--b0)">
      <div style="font-size:12px;font-weight:700;color:var(--t2);margin-bottom:10px">📜 Storico configurazioni per anno</div>
      <div style="overflow-x:auto">
        <table style="width:100%;font-size:12px">
          <thead><tr style="background:var(--s2)">
            <th style="padding:8px 12px;text-align:left">Anno</th>
            <th style="padding:8px 12px;text-align:left">Tipo</th>
            <th style="padding:8px 12px;text-align:left">Col2</th>
            <th style="padding:8px 12px;text-align:left">Col3</th>
            <th style="padding:8px 12px;text-align:left">Periodicità</th>
            <th style="padding:8px 12px;text-align:left"></th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
}

function onDettaglioAnnoChange() {
  const anno = parseInt(document.getElementById("det-anno-select").value);
  if (currentClienteId) loadClienteDettaglio(currentClienteId, anno);
}

function editClienteConfig(id, anno) {
  if (typeof socket !== "undefined") {
    socket.emit("get:cliente", { id, anno });
    socket.once("res:cliente", ({ success, data }) => {
      if (!success || !data) return;
      openEditClienteModal(data, anno);
    });
  }
}

function editClienteFromDettaglio() {
  const anno = parseInt(
    document.getElementById("det-anno-select")?.value ||
      new Date().getFullYear(),
  );
  if (currentClienteId) editClienteConfig(currentClienteId, anno);
}

function deleteClienteFromDettaglio() {
  if (!currentClienteId) return;
  const anno =
    parseInt(document.getElementById("det-anno-select")?.value) ||
    new Date().getFullYear();
  const cliente = state.clienti.find((c) => c.id === currentClienteId);
  const clienteNome = cliente ? cliente.nome : "questo cliente";
  if (confirm(`Eliminare "${clienteNome}" solo per l'anno ${anno}?`)) {
    closeModal("modal-cliente-dettaglio");
    if (typeof socket !== "undefined")
      socket.emit("delete:cliente", { id: currentClienteId, anno });
  }
}

function goToClienteScadenzario() {
  if (currentClienteId) {
    closeModal("modal-cliente-dettaglio");
    goScadenzario(currentClienteId);
  }
}

function editCliente(id) {
  const anno =
    parseInt(document.getElementById("filter-anno")?.value) ||
    (typeof state !== 'undefined' && state.anno ? state.anno : null) ||
    new Date().getFullYear();
  editClienteConfig(id, anno);
}

function openEditClienteModal(cliente, anno) {
  document.getElementById("modal-cliente-title").textContent =
    `Modifica Cliente — ${anno}`;
  document.getElementById("cliente-id").value = cliente.id;
  document.getElementById("cliente-edit-anno").value = anno;
  const annoInfo = document.getElementById("cliente-anno-info");
  if (annoInfo) {
    annoInfo.innerHTML = `<div class="infobox" style="margin-bottom:16px;background:var(--accent-d);border-color:var(--accent)">
      📅 Configurazione per <strong>${anno}</strong>. Le modifiche non influenzeranno gli anni precedenti.</div>`;
  }
  const fields = {
    "c-nome": cliente.nome,
    "c-cf": cliente.codice_fiscale,
    "c-piva": cliente.partita_iva,
    "c-email": cliente.email,
    "c-tel": cliente.telefono,
    "c-indirizzo": cliente.indirizzo,
    "c-note": cliente.note,
    "c-pec": cliente.pec,
    "c-sdi": cliente.sdi,
    "c-citta": cliente.citta,
    "c-cap": cliente.cap,
    "c-prov": cliente.provincia,
    "c-referente": cliente.referente,
    "c-iban": cliente.iban,
  };
  Object.entries(fields).forEach(([elId, val]) => {
    const el = document.getElementById(elId);
    if (el) el.value = val || "";
  });
  populateTipologiaSelect(cliente.id_tipologia);
  const col2Val = cliente.col2_value || "",
    col3Val = cliente.col3_value || "",
    col4Val = cliente.periodicita || "";
  const badge = document.getElementById("col4-forfettario-badge");
  if (badge) badge.style.display = "none";

  // Store the values that need to be set after the columns are updated
  lastClienteFormValues = { col2: col2Val, col3: col3Val, col4: col4Val };

  setTimeout(() => {
    // First update the columns structure
    aggiornaColonneCliente();

    setTimeout(() => {
      // Then set the actual values after the DOM is ready
      if (document.getElementById("c-col2"))
        document.getElementById("c-col2").value = col2Val;
      if (document.getElementById("c-col3"))
        document.getElementById("c-col3").value = col3Val;

      const tipCodice = _getTipologiaCodice();

      // Per privato e socio: nascondi col3 e col4 (non servono)
      if (col2Val === "privato" || col2Val === "socio") {
        const col3Wrap = document.getElementById("wrap-col3");
        const col4Wrap = document.getElementById("wrap-col4");
        if (col3Wrap) col3Wrap.style.display = "none";
        if (col4Wrap) col4Wrap.style.display = "none";
        const col3Sel = document.getElementById("c-col3");
        const col4Sel = document.getElementById("c-col4");
        if (col3Sel) col3Sel.value = "";
        if (col4Sel) col4Sel.value = "";
      } else if (REGIMI_ANNUALI.includes(col3Val)) {
        _aggiornCol4BasedOnCol3(tipCodice, col3Val);
      } else if (document.getElementById("c-col4")) {
        document.getElementById("c-col4").value = col4Val;
      }

      aggiornaRiepilogoClassificazione();
    }, 50);
  }, 60);
  openModal("modal-cliente");
}

function openNuovoCliente() {
  const currentAnno =
    parseInt(document.getElementById("filter-anno")?.value) ||
    new Date().getFullYear();
  document.getElementById("modal-cliente-title").textContent =
    `Nuovo Cliente — ${currentAnno}`;
  document.getElementById("cliente-id").value = "";
  document.getElementById("cliente-edit-anno").value = currentAnno;
  const annoInfo = document.getElementById("cliente-anno-info");
  if (annoInfo) {
    annoInfo.innerHTML = `<div class="infobox" style="margin-bottom:16px;background:var(--accent-d);border-color:var(--accent)">
      📅 Creazione cliente per l'anno <strong>${currentAnno}</strong>.</div>`;
  }
  [
    "c-nome",
    "c-cf",
    "c-piva",
    "c-email",
    "c-tel",
    "c-indirizzo",
    "c-note",
    "c-pec",
    "c-sdi",
    "c-citta",
    "c-cap",
    "c-prov",
    "c-referente",
    "c-iban",
    "c-col2",
    "c-col3",
    "c-col4",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  const badge = document.getElementById("col4-forfettario-badge");
  if (badge) badge.style.display = "none";
  lastClienteFormValues = { col2: "", col3: "", col4: "" };
  if (state.tipologie && state.tipologie.length > 0)
    populateTipologiaSelect(state.tipologie[0].id);
  else populateTipologiaSelect("");
  setTimeout(() => {
    aggiornaColonneCliente();
    aggiornaRiepilogoClassificazione();
  }, 50);
  openModal("modal-cliente");
}

function saveCliente() {
  const id = document.getElementById("cliente-id").value;
  const anno = parseInt(
    document.getElementById("cliente-edit-anno")?.value ||
      new Date().getFullYear(),
  );
  const nome = document.getElementById("c-nome").value.trim();
  if (!nome) {
    showNotif("Il nome è obbligatorio", "error");
    return;
  }
  if (!validaClassificazioneCliente()) return;

  let col2Val = null,
    col3Val = null,
    col4Val = null;
  const col2Wrap = document.getElementById("wrap-col2");
  const col3Wrap = document.getElementById("wrap-col3");
  const col4Wrap = document.getElementById("wrap-col4");

  if (col2Wrap && col2Wrap.style.display !== "none") {
    const val = document.getElementById("c-col2")?.value || "";
    col2Val = val === "" ? null : val;
  }
  if (col3Wrap && col3Wrap.style.display !== "none") {
    const val = document.getElementById("c-col3")?.value || "";
    col3Val = val === "" ? null : val;
    lastClienteFormValues.col3 = col3Val;
  }
  if (col4Wrap && col4Wrap.style.display !== "none") {
    const val = document.getElementById("c-col4")?.value || "";
    col4Val = val === "" ? null : val;
    lastClienteFormValues.col4 = col4Val;
  }
  if (col3Val && REGIMI_ANNUALI.includes(col3Val)) {
    col4Val = "annuale";
    lastClienteFormValues.col4 = col4Val;
  }

  const tipologiaVal = document.getElementById("c-tipologia")?.value || "";
  lastClienteFormValues.col2 = col2Val;
  lastClienteFormValues.col3 = col3Val;
  lastClienteFormValues.col4 = col4Val;

  const data = {
    id: id ? parseInt(id) : undefined,
    anno,
    nome,
    id_tipologia: parseInt(tipologiaVal),
    id_sottotipologia: _calcolaSottotipologiaId() || null,
    col2_value: col2Val || null,
    col3_value: col3Val || null,
    periodicita: col4Val || null,
    codice_fiscale:
      document.getElementById("c-cf")?.value.trim().toUpperCase() || null,
    partita_iva:
      document
        .getElementById("c-piva")
        ?.value.replace(/[^0-9]/g, "")
        .trim() || null,
    email: document.getElementById("c-email")?.value.trim() || null,
    telefono:
      document
        .getElementById("c-tel")
        ?.value.replace(/[^0-9+\s\-]/g, "")
        .trim() || null,
    indirizzo: document.getElementById("c-indirizzo")?.value.trim() || null,
    citta: document.getElementById("c-citta")?.value.trim() || null,
    cap:
      document
        .getElementById("c-cap")
        ?.value.replace(/[^0-9]/g, "")
        .trim() || null,
    provincia:
      document.getElementById("c-prov")?.value.trim().toUpperCase() || null,
    pec: document.getElementById("c-pec")?.value.trim() || null,
    sdi: document.getElementById("c-sdi")?.value.trim().toUpperCase() || null,
    iban: document.getElementById("c-iban")?.value.trim().toUpperCase() || null,
    referente: document.getElementById("c-referente")?.value.trim() || null,
    note: document.getElementById("c-note")?.value.trim() || null,
  };

  if (typeof socket !== "undefined") {
    if (id) socket.emit("update:cliente", data);
    else socket.emit("create:cliente", data);
  }
}

function deleteCliente(id) {
  const currentAnno =
    parseInt(document.getElementById("filter-anno")?.value) ||
    new Date().getFullYear();
  const cliente = state.clienti.find((c) => c.id === id);
  const clienteNome = cliente ? cliente.nome : "questo cliente";

  if (typeof socket !== "undefined") {
    socket.emit("check:adempimenti_cliente", {
      id_cliente: id,
      anno: currentAnno,
    });
    socket.once(
      "res:check:adempimenti_cliente",
      ({ success, hasAdempimenti, count }) => {
        if (!success) {
          proceedWithBasicDeletion(id, currentAnno, clienteNome);
          return;
        }
        if (hasAdempimenti && count > 0) {
          if (
            confirm(
              `Eliminare "${clienteNome}" solo per l'anno ${currentAnno}? Il cliente ha ${count} adempimento/i.`,
            )
          )
            socket.emit("delete:cliente", { id, anno: currentAnno });
        } else {
          if (confirm(`Eliminare "${clienteNome}" da tutti gli anni?`))
            socket.emit("delete:cliente", { id, anno: null, deleteAll: true });
          else if (confirm(`Eliminare solo dall'anno ${currentAnno}?`))
            socket.emit("delete:cliente", { id, anno: currentAnno });
        }
      },
    );
  } else {
    proceedWithBasicDeletion(id, currentAnno, clienteNome);
  }
}

function proceedWithBasicDeletion(id, currentAnno, clienteNome) {
  if (confirm(`Eliminare "${clienteNome}" solo per l'anno ${currentAnno}?`))
    if (typeof socket !== "undefined")
      socket.emit("delete:cliente", { id, anno: currentAnno });
}

function goScadenzario(id) {
  const c = state.clienti.find((x) => x.id === id);
  if (c) {
    state.selectedCliente = c;
    document
      .querySelectorAll(".nav-item")
      .forEach((x) => x.classList.remove("active"));
    document.querySelector('[data-page="scadenzario"]').classList.add("active");
    renderPage("scadenzario");
  } else {
    state._gotoClienteId = id;
    state._pending = "scadenzario";
    if (typeof socket !== "undefined") socket.emit("get:clienti");
  }
}
