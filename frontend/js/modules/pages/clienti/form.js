// ═══════════════════════════════════════════════════════════════
// CLIENTI-FORM.JS — 4 colonne classificazione, salvataggio, copia config
// Dipende da: clienti-filtri.js, clienti-dettaglio.js
// ═══════════════════════════════════════════════════════════════
// ─── TIPOLOGIA SELECT ─────────────────────────────────────────
function populateTipologiaSelect(selectedId) {
  const sel = document.getElementById("c-tipologia");
  if (!sel) return;
  const cfg = _cfg();
  sel.innerHTML = (state.tipologie || [])
    .map((t) => {
      const meta = (cfg.tipologie || {})[t.codice] || {};
      return `<option value="${t.id}" ${String(t.id) === String(selectedId) ? "selected" : ""}>${meta.icon || "📋"} ${t.codice} — ${meta.desc || t.nome}</option>`;
    })
    .join("");
  _aggiornaTipologiaSelectStyle();
}

function _aggiornaTipologiaSelectStyle() {
  const sel = document.getElementById("c-tipologia");
  if (!sel || !sel.value) return;
  const tipCodice = _getTipologiaCodice();
  const cfg = _cfg();
  const color = (cfg.tipologie || {})[tipCodice]?.color || "var(--accent)";
  sel.style.borderColor = color;
  sel.style.boxShadow = `0 0 0 1px ${color}44`;
}

// ─── 4 COLONNE ────────────────────────────────────────────────
function aggiornaColonneCliente() {
  const tipCodice = _getTipologiaCodice();
  const col2Wrap = document.getElementById("wrap-col2");
  const col2Sel = document.getElementById("c-col2");

  // Generate col2 options dynamically from JSON instead of hardcoded
  const col2Opts = _getCol2OptionsFromJson(tipCodice);
  _aggiornaTipologiaSelectStyle();
  if (!col2Opts || col2Opts.length === 0) {
    col2Wrap.style.display = "none";
    col2Sel.value = "";
    _aggiornaCol3(tipCodice, "");
  } else {
    col2Wrap.style.display = "";
    const col2Current = col2Sel.value;
    col2Sel.innerHTML =
      `<option value="">— Seleziona —</option>` +
      col2Opts
        .map(
          (o) =>
            `<option value="${o.value}" ${col2Current === o.value ? "selected" : ""}>${o.label}</option>`,
        )
        .join("");
    if (!col2Current) col2Sel.value = "";
    _aggiornaCol3(tipCodice, col2Sel.value);
  }

  // Always check if we should show periodicity based on tipologia and paths
  _checkAndShowPeriodicita(tipCodice);
  aggiornaRiepilogoClassificazione();
}

// Helper function to check and show periodicity field
function _checkAndShowPeriodicita(tipCodice) {
  const cfg = _cfg();
  const percorsi = cfg.percorsi?.[tipCodice] || [];
  const col2Val = document.getElementById("c-col2")?.value || "";

  // Check if any path for this tipologia has periodicity
  const hasPeriodicita = percorsi.some((p) => p.hasPer || p.isForfettario);

  const col4Wrap = document.getElementById("wrap-col4");
  // Hide periodicity for privato and socio
  if (col2Val === "privato" || col2Val === "socio") {
    col4Wrap.style.display = "none";
    const col4Sel = document.getElementById("c-col4");
    if (col4Sel) col4Sel.value = "";
  } else if (hasPeriodicita) {
    // Show periodicity field
    col4Wrap.style.display = "";
    // Initialize with empty options if not already populated
    const col4Sel = document.getElementById("c-col4");
    if (col4Sel && !col4Sel.innerHTML.includes("option")) {
      const ivaPer = cfg.periodicitaIva || [];
      const annPer = (cfg.periodicitaAnnuale || []).map((p) => p.value);

      col4Sel.innerHTML =
        `<option value="">— Seleziona —</option>` +
        ivaPer
          .map((p) => `<option value="${p.value}">${p.label}</option>`)
          .join("") +
        annPer
          .map((p) => `<option value="${p.value}">${p.label}</option>`)
          .join("");
    }
  } else {
    // Hide periodicity field
    _nascondiCol4();
  }
}

// Helper function to generate col2 options from JSON
function _getCol2OptionsFromJson(tipCodice) {
  const cfg = _cfg();
  const percorsi = cfg.percorsi?.[tipCodice] || [];
  const options = [];

  percorsi.forEach((p) => {
    if (p.col2Label) {
      const value =
        p.col2Label === "Ditta Individuale"
          ? "ditta"
          : p.col2Label.toLowerCase();

      // Check if this option already exists
      const existing = options.find((opt) => opt.value === value);
      if (!existing) {
        options.push({
          value,
          label: p.col2Label,
        });
      }
    }
  });

  return options;
}

function _aggiornaCol3(tipCodice, col2Val) {
  const col3Opts = getCol3Options(tipCodice, col2Val);
  const col3Wrap = document.getElementById("wrap-col3");
  const col3Sel = document.getElementById("c-col3");
  if (!col3Opts) {
    _nascondiCol3();
    return;
  }
  col3Wrap.style.display = "";
  const col3Current = col3Sel.value;
  col3Sel.innerHTML =
    `<option value="">— Seleziona —</option>` +
    col3Opts
      .map(
        (o) =>
          `<option value="${o.value}" ${col3Current === o.value ? "selected" : ""}>${o.label}</option>`,
      )
      .join("");
  if (!col3Current) col3Sel.value = "";
  _aggiornCol4BasedOnCol3(tipCodice, col3Sel.value);
  aggiornaRiepilogoClassificazione();
}

function _aggiornCol4BasedOnCol3(tipCodice, col3Val) {
  // Ensure JSON data is available before proceeding
  const cfg = _cfg();
  if (!cfg || !cfg.periodicitaIva || !cfg.periodicitaAnnuale) {
    // If JSON is not ready, wait and try again
    setTimeout(() => {
      if (_cfg() && _cfg().periodicitaIva && _cfg().periodicitaAnnuale) {
        _aggiornCol4BasedOnCol3(tipCodice, col3Val);
      }
    }, 100);
    return;
  }

  const annPer = (cfg.periodicitaAnnuale || []).map((p) => p.value);
  const ivaPer = cfg.periodicitaIva || [];

  const col4Wrap = document.getElementById("wrap-col4");
  const col4Sel = document.getElementById("c-col4");

  if (REGIMI_ANNUALI.includes(col3Val)) {
    col4Wrap.style.display = "none";
    col4Sel.value = annPer[0] || "annuale";
    let badge = document.getElementById("col4-forfettario-badge");
    if (!badge) {
      badge = document.createElement("div");
      badge.id = "col4-forfettario-badge";
      badge.style.cssText =
        "font-size:12px;color:var(--yellow);background:var(--yellow)18;border:1px solid var(--yellow)33;border-radius:var(--r-sm);padding:7px 12px;margin-top:8px;grid-column:1/-1";
      badge.innerHTML = `<span style="font-size:14px">📅</span> Regime <strong>Forfettario</strong> — periodicità automatica: <strong>Annuale</strong>`;
      document.querySelector(".quattro-colonne-grid")?.appendChild(badge);
    }
    badge.style.display = "";
  } else if (col3Val) {
    col4Wrap.style.display = "";
    // Popola le opzioni IVA dal JSON
    if (col4Sel && col4Sel.tagName === "SELECT" && ivaPer.length > 0) {
      const current = col4Sel.value;
      col4Sel.innerHTML =
        `<option value="">— Seleziona —</option>` +
        ivaPer
          .map(
            (p) =>
              `<option value="${p.value}" ${current === p.value ? "selected" : ""}>${p.label}</option>`,
          )
          .join("");
    }
    const badge = document.getElementById("col4-forfettario-badge");
    if (badge) badge.style.display = "none";
    if (!col4Sel.value) col4Sel.value = "";
  } else {
    _nascondiCol4();
    const badge = document.getElementById("col4-forfettario-badge");
    if (badge) badge.style.display = "none";
  }
  aggiornaRiepilogoClassificazione();
}

function _nascondiCol3() {
  const w = document.getElementById("wrap-col3"),
    s = document.getElementById("c-col3");
  if (w) w.style.display = "none";
  if (s) s.value = "";
  _nascondiCol4();
  aggiornaRiepilogoClassificazione();
}

function _nascondiCol4() {
  const w = document.getElementById("wrap-col4"),
    s = document.getElementById("c-col4");
  if (w) w.style.display = "none";
  if (s) s.value = "";
  aggiornaRiepilogoClassificazione();
}

function _getTipologiaCodice() {
  const sel = document.getElementById("c-tipologia");
  if (!sel || !sel.value) return "";
  const tip = (state.tipologie || []).find(
    (t) => String(t.id) === String(sel.value),
  );
  return tip ? tip.codice : "";
}

function _calcolaSottotipologiaId() {
  const tipCodice = _getTipologiaCodice();
  const col2 = document.getElementById("c-col2")?.value || "";
  const col3 = document.getElementById("c-col3")?.value || "";
  const stCode = getSottotipoCode(tipCodice, col2, col3);
  if (!stCode) return null;
  for (const t of state.tipologie || []) {
    const sub = (t.sottotipologie || []).find((s) => s.codice === stCode);
    if (sub) return sub.id;
  }
  return null;
}

function aggiornaRiepilogoClassificazione() {
  const box = document.getElementById("cliente-riepilogo-box");
  const content = document.getElementById("riepilogo-classificazione");
  if (!box || !content) return;
  const tipCodice = _getTipologiaCodice();
  const tip = (state.tipologie || []).find((t) => t.codice === tipCodice);
  const cfg = _cfg();
  const col2 = document.getElementById("c-col2")?.value || "";
  const col3 = document.getElementById("c-col3")?.value || "";
  const col4 = document.getElementById("c-col4")?.value || "";
  const annPer = (cfg.periodicitaAnnuale || []).map((p) => p.value);
  const col4Eff = annPer.includes(col3) ? annPer[0] || "annuale" : col4;
  const tipColor = (cfg.tipologie || {})[tipCodice]?.color || "var(--accent)";

  // --- Aggiorna badge tipologia e colore bordo box ---
  const badge = document.getElementById("riepilogo-tip-badge");
  if (badge) {
    if (tip && tipColor) {
      const tipInfo = (cfg.tipologie || {})[tipCodice] || {};
      badge.style.display = "";
      badge.style.color = tipColor;
      badge.style.background = tipColor + "18";
      badge.style.borderColor = tipColor + "66";
      badge.innerHTML = `<span class="tip-badge-icon">${tipInfo.icon || "📋"}</span><span class="tip-badge-code">${tip.codice}</span><span class="tip-badge-desc">— ${tip.nome}</span>`;
    } else {
      badge.style.display = "none";
      badge.innerHTML = "";
    }
  }
  // Aggiorna border-left del box col colore tipologia
  if (tipColor && tip) {
    box.style.borderLeftColor = tipColor;
  } else {
    box.style.borderLeftColor = "";
  }

  let chips = [];
  if (col2) {
    const opt = COL2_OPTIONS[tipCodice]?.find((o) => o.value === col2);
    if (opt)
      chips.push(
        `<div class="riepilogo-chip"><span class="chip-label">Sottocategoria:</span><span class="chip-value">${opt.label}</span></div>`,
      );
  }
  if (col3)
    chips.push(
      `<div class="riepilogo-chip"><span class="chip-label">Regime:</span><span class="chip-value">${col3}</span></div>`,
    );
  if (col4Eff) {
    const perObj = [
      ...(cfg.periodicitaIva || []),
      ...(cfg.periodicitaAnnuale || []),
    ].find((p) => p.value === col4Eff);
    chips.push(
      `<div class="riepilogo-chip"><span class="chip-label">Periodicità:</span><span class="chip-value">${perObj ? perObj.label : col4Eff}</span></div>`,
    );
  }
  if (tip) {
    content.innerHTML = chips.join("");
    box.style.display = "";
  } else box.style.display = "none";
}

function validaClassificazioneCliente() {
  const tipologia = document.getElementById("c-tipologia").value;
  if (!tipologia) {
    showNotif("La Tipologia è obbligatoria", "error");
    document.getElementById("c-tipologia").focus();
    return false;
  }
  const col2Wrap = document.getElementById("wrap-col2");
  const col3Wrap = document.getElementById("wrap-col3");
  const col4Wrap = document.getElementById("wrap-col4");
  if (col2Wrap && col2Wrap.style.display !== "none")
    if (!document.getElementById("c-col2").value) {
      showNotif("La Sottocategoria è obbligatoria", "error");
      document.getElementById("c-col2").focus();
      return false;
    }
  if (col3Wrap && col3Wrap.style.display !== "none")
    if (!document.getElementById("c-col3").value) {
      showNotif("Il Regime è obbligatorio", "error");
      document.getElementById("c-col3").focus();
      return false;
    }
  const col3Val = document.getElementById("c-col3")?.value || "";
  const cfg = _cfg();
  const annPer = (cfg.periodicitaAnnuale || []).map((p) => p.value);
  if (
    !annPer.includes(col3Val) &&
    col4Wrap &&
    col4Wrap.style.display !== "none"
  )
    if (!document.getElementById("c-col4").value) {
      showNotif("La Periodicità è obbligatoria", "error");
      document.getElementById("c-col4").focus();
      return false;
    }
  return true;
}

function onTipologiaChange() {
  const col2Sel = document.getElementById("c-col2");
  if (col2Sel) col2Sel.value = "";
  const col3Sel = document.getElementById("c-col3");
  if (col3Sel) col3Sel.value = "";
  _nascondiCol4();
  const badge = document.getElementById("col4-forfettario-badge");
  if (badge) badge.style.display = "none";

  // Ensure JSON data is loaded before updating columns
  if (_cfg() && _cfg().percorsi) {
    aggiornaColonneCliente();
  } else {
    // If JSON is not ready, wait and try again
    setTimeout(() => {
      if (_cfg() && _cfg().percorsi) {
        aggiornaColonneCliente();
      }
    }, 100);
  }
}

function onCol2Change() {
  const col2Val = document.getElementById("c-col2")?.value || "";
  lastClienteFormValues.col2 = col2Val;
  const col3Sel = document.getElementById("c-col3");
  if (col3Sel) col3Sel.value = "";
  // Nascondi il badge forfettario quando cambia col2
  const badge = document.getElementById("col4-forfettario-badge");
  if (badge) badge.style.display = "none";
  aggiornaColonneCliente();
}

function onCol3Change() {
  const tipCodice = _getTipologiaCodice();
  const col2Val = document.getElementById("c-col2")?.value || "";
  const col3Val = document.getElementById("c-col3")?.value || "";
  lastClienteFormValues.col2 = col2Val;
  lastClienteFormValues.col3 = col3Val;
  _aggiornaCol3(tipCodice, col2Val);
  _aggiornCol4BasedOnCol3(tipCodice, col3Val);
  aggiornaRiepilogoClassificazione();
}

// ─── COPIA CONFIGURAZIONE ─────────────────────────────────────
function openCopiaConfig(id_cliente = null) {
  document.getElementById("copia-config-cliente-id").value = id_cliente || "";
  document.getElementById("copia-config-modalita").value = id_cliente
    ? "singolo"
    : "tutti";
  document.getElementById("copia-config-da").value =
    new Date().getFullYear() - 1;
  document.getElementById("copia-config-a").value = new Date().getFullYear();
  if (id_cliente) {
    const cliente = state.clienti?.find((c) => c.id === id_cliente);
    document.getElementById("copia-config-info").innerHTML = cliente
      ? `Copia configurazione per <strong>${cliente.nome}</strong>`
      : "Copia configurazione cliente";
  } else {
    document.getElementById("copia-config-info").innerHTML =
      "Copia configurazione per <strong>tutti i clienti attivi</strong>";
  }
  openModal("modal-copia-config");
}

function openCopiaConfigTutti() {
  openCopiaConfig();
}

function eseguiCopiaConfig() {
  const modalita = document.getElementById("copia-config-modalita").value;
  const id_cliente = document.getElementById("copia-config-cliente-id").value;
  const da = parseInt(document.getElementById("copia-config-da").value);
  const a = parseInt(document.getElementById("copia-config-a").value);
  if (da >= a) {
    showNotif(
      "L'anno di partenza deve essere precedente all'anno di destinazione",
      "error",
    );
    return;
  }
  if (modalita === "singolo" && id_cliente) {
    if (typeof socket !== "undefined")
      socket.emit("copia:config_cliente", {
        id_cliente: parseInt(id_cliente),
        anno_da: da,
        anno_a: a,
      });
  } else {
    if (typeof socket !== "undefined")
      socket.emit("copia:config_tutti_clienti", { anno_da: da, anno_a: a });
  }
  closeModal("modal-copia-config");
}

// ─── ESPOSIZIONE GLOBALE ──────────────────────────────────────
window.editCliente = editCliente;
window.editClienteConfig = editClienteConfig;
window.deleteCliente = deleteCliente;
window.goScadenzario = goScadenzario;
window.showClienteDettaglio = showClienteDettaglio;
window.onDettaglioAnnoChange = onDettaglioAnnoChange;
window.editClienteFromDettaglio = editClienteFromDettaglio;
window.deleteClienteFromDettaglio = deleteClienteFromDettaglio;
window.goToClienteScadenzario = goToClienteScadenzario;
window.openCopiaConfig = openCopiaConfig;
window.openCopiaConfigTutti = openCopiaConfigTutti;
window.eseguiCopiaConfig = eseguiCopiaConfig;
window.openNuovoCliente = openNuovoCliente;
window.saveCliente = saveCliente;
window.applyClientiFiltri = applyClientiFiltri;
window.applyClientiFiltriImmediate = applyClientiFiltriImmediate;
window.resetClientiFiltri = resetClientiFiltri;
window.onTipologiaChange = onTipologiaChange;
window.onCol2Change = onCol2Change;
window.onCol3Change = onCol3Change;
window.toggleTipFiltroPanel = toggleTipFiltroPanel;
window.closeTipFiltroPanel = closeTipFiltroPanel;
window.toggleFiltroPercorso = toggleFiltroPercorso;
window.toggleTipologiaGruppo = toggleTipologiaGruppo;
window.selezionaTuttiTipFiltro = selezionaTuttiTipFiltro;
window.deselezionaTuttiTipFiltro = deselezionaTuttiTipFiltro;
window.initializeTipologieFilter = initializeTipologieFilter;
window.renderTipologieFiltroPanel = renderTipologieFiltroPanel;
window.getFiltriPerRequest = getFiltriPerRequest;
// Esposizioni per globale.js
window.TIPOLOGIE_PERCORSI_DATA = _getTipologiePercorsiData(); // snapshot iniziale
window._getAllKeys = _getAllKeys;
window._getActiveFiltroKeys = () => _activeFiltroKeys;
window._filtroManualeNessuno = false; // getter live sotto
Object.defineProperty(window, "_filtroManualeNessuno", {
  get: () => _filtroManualeNessuno,
  set: (v) => {
    _filtroManualeNessuno = v;
  },
  configurable: true,
});
