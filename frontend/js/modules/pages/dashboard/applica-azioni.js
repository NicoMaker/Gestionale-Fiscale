function renderApplicaClientiList() {
  _renderApplicaTipFiltroPanel();

  const container = document.getElementById("applica-clienti-list");
  if (!container) return;
  if (!state.clienti || state.clienti.length === 0) {
    container.innerHTML =
      '<div style="text-align:center;padding:20px">👥 Nessun cliente</div>';
    return;
  }

  const clientiFiltrati = _getApplicaClientiFiltrati();

  // Applica filtro tipologia se attivo
  const clientiVisibili =
    _applicaTipFiltro.size > 0
      ? clientiFiltrati.filter(function (c) {
          return _applicaTipFiltro.has(c.tipologia_codice);
        })
      : clientiFiltrati;

  if (clientiVisibili.length === 0) {
    container.innerHTML =
      '<div style="text-align:center;padding:20px;color:var(--text3)">Nessun cliente per questa tipologia</div>';
    return;
  }

  // Raggruppa per tipologia con header colorato e bottone "Seleziona gruppo"
  const gruppi = {};
  const gruppiOrder = [];
  clientiVisibili.forEach(function (c) {
    const tc = c.tipologia_codice || "?";
    if (!gruppi[tc]) {
      const info =
        (typeof TIPOLOGIE_INFO !== "undefined" && TIPOLOGIE_INFO[tc]) || {};
      gruppi[tc] = {
        color: c.tipologia_colore || info.color || "#5b8df6",
        icon: info.icon || "📋",
        desc: info.desc || tc,
        codice: tc,
        clienti: [],
      };
      gruppiOrder.push(tc);
    }
    gruppi[tc].clienti.push(c);
  });

  let html = "";
  gruppiOrder.forEach(function (tc) {
    const g = gruppi[tc];
    html +=
      '<div style="margin-bottom:10px">' +
      '<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;' +
      "background:" +
      g.color +
      "15;border-left:3px solid " +
      g.color +
      ';border-radius:0 6px 6px 0;margin-bottom:5px">' +
      '<span style="font-size:12px;font-weight:800;color:' +
      g.color +
      '">' +
      g.icon +
      " " +
      g.codice +
      "</span>" +
      '<span style="font-size:11px;color:var(--text3)">' +
      g.desc +
      " — " +
      g.clienti.length +
      " client" +
      (g.clienti.length === 1 ? "e" : "i") +
      "</span>" +
      "<button onclick=\"event.stopPropagation();_applicaSelezionaTipologia('" +
      g.codice +
      "')\" " +
      'data-gruppo-tc="' +
      g.codice +
      '" data-color="' +
      g.color +
      '" ' +
      'style="margin-left:auto;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:700;cursor:pointer;' +
      "border:1px solid " +
      g.color +
      ";background:" +
      g.color +
      "22;color:" +
      g.color +
      '">+ Seleziona tutti</button>' +
      "</div>" +
      '<div style="display:flex;flex-wrap:wrap">';
    g.clienti.forEach(function (cli) {
      html +=
        '<label class="flag-chip" style="margin:3px;padding:5px 10px;font-size:12px;width:calc(33% - 6px);border-left:2px solid ' +
        g.color +
        '55">' +
        '<input type="checkbox" class="applica-cliente-checkbox" value="' +
        cli.id +
        '" data-tc="' +
        g.codice +
        '" onchange="_aggiornaApplicaSelezionaTuttiCounter();_aggiornaBottoniGruppo()">' +
        "<span>" +
        g.icon +
        " " +
        (cli.nome || "") +
        "</span></label>";
    });
    html += "</div></div>";
  });

  container.innerHTML = html;
  _aggiornaApplicaSelezionaTuttiCounter();
  _aggiornaBottoniGruppo();
}

function filtraClientiApplica() {
  renderApplicaClientiList();
}

function toggleSelezionaTuttiAdpApplicaBtn() {
  const tot = document.querySelectorAll(".applica-adp-checkbox").length;
  const checked = document.querySelectorAll(
    ".applica-adp-checkbox:checked",
  ).length;
  const selezionaTutti = !(tot > 0 && checked === tot);
  document.querySelectorAll(".applica-adp-checkbox").forEach(function (cb) {
    cb.checked = selezionaTutti;
  });
  _aggiornaAdpSelezionaTuttiBtn();
}

function toggleSelezionaTuttiClientiApplicaBtn() {
  const tot = document.querySelectorAll(".applica-cliente-checkbox").length;
  const checked = document.querySelectorAll(
    ".applica-cliente-checkbox:checked",
  ).length;
  const selezionaTutti = !(tot > 0 && checked === tot);
  document.querySelectorAll(".applica-cliente-checkbox").forEach(function (cb) {
    cb.checked = selezionaTutti;
  });
  _aggiornaApplicaSelezionaTuttiCounter();
}

// Mantieni le vecchie funzioni per compatibilità
function toggleSelezionaTuttiAdpApplica() {
  toggleSelezionaTuttiAdpApplicaBtn();
}
function toggleSelezionaTuttiClientiApplica() {
  toggleSelezionaTuttiClientiApplicaBtn();
}
function resetSelezioneAdpApplica() {
  document.querySelectorAll(".applica-adp-checkbox").forEach(function (cb) {
    cb.checked = false;
  });
  _aggiornaAdpSelezionaTuttiBtn();
}
function getSelectedAdempimentiApplica() {
  return Array.from(
    document.querySelectorAll(".applica-adp-checkbox:checked"),
  ).map(function (cb) {
    return parseInt(cb.value);
  });
}
function getSelectedClientiApplica() {
  return Array.from(
    document.querySelectorAll(".applica-cliente-checkbox:checked"),
  ).map(function (cb) {
    return parseInt(cb.value);
  });
}
function eseguiApplicaAdempimenti() {
  if (!_applicaModalita) {
    showNotif("⬆ Scegli prima la modalità: Inserisci o Elimina", "error");
    return;
  }
  const adpIds = getSelectedAdempimentiApplica();
  const clientiIds = getSelectedClientiApplica();
  const anno = parseInt(
    document.getElementById("applica-adempimenti-anno")?.value || state.anno,
  );
  if (adpIds.length === 0) {
    showNotif("Seleziona almeno un adempimento", "error");
    return;
  }
  if (clientiIds.length === 0) {
    showNotif("Seleziona almeno un cliente", "error");
    return;
  }

  if (_applicaModalita === "elimina") {
    const nAdp = adpIds.length;
    const nCli = clientiIds.length;
    if (
      !confirm(
        "Eliminerai " +
          nAdp +
          " adempiment" +
          (nAdp === 1 ? "o" : "i") +
          " da " +
          nCli +
          " client" +
          (nCli === 1 ? "e" : "i") +
          " per l'anno " +
          anno +
          ".\n\nI clienti che non hanno l'adempimento vengono ignorati.\n\nConfermi?",
      )
    )
      return;
    socket.emit("elimina:adempimenti_a_clienti", {
      adempimenti_ids: adpIds,
      clienti_ids: clientiIds,
      anno,
    });
  } else {
    socket.emit("applica:adempimenti_a_clienti", {
      adempimenti_ids: adpIds,
      clienti_ids: clientiIds,
      anno,
    });
  }
  closeModal("modal-applica-adempimenti");
}

// Aggiungi/modifica queste funzioni in dashboard/applica.js

function _aggiornaAdpSelezionaTuttiBtn() {
  const tot = document.querySelectorAll(".applica-adp-checkbox").length;
  const checked = document.querySelectorAll(
    ".applica-adp-checkbox:checked",
  ).length;
  const tuttiSelezionati = tot > 0 && checked === tot;
  const btn = document.getElementById("applica-adp-btn-seleziona-tutti");
  if (btn) {
    if (tuttiSelezionati) {
      btn.textContent = "☑️ Deseleziona tutti gli adempimenti";
      btn.classList.add("attivo");
    } else {
      btn.textContent = "✅ Seleziona tutti gli adempimenti";
      btn.classList.remove("attivo");
    }
  }
}

function _aggiornaApplicaSelezionaTuttiCounter() {
  const tot = document.querySelectorAll(".applica-cliente-checkbox").length;
  const checked = document.querySelectorAll(
    ".applica-cliente-checkbox:checked",
  ).length;
  const tuttiSelezionati = tot > 0 && checked === tot;
  const btn = document.getElementById("applica-clienti-btn-seleziona-tutti");
  if (btn) {
    if (tuttiSelezionati) {
      btn.textContent = "☑️ Deseleziona tutti i clienti";
      btn.classList.add("attivo");
    } else {
      btn.textContent = "✅ Seleziona tutti i clienti";
      btn.classList.remove("attivo");
    }
  }
}

// Funzione per i bottoni di gruppo (tipologia)
function _aggiornaBottoniGruppo() {
  document.querySelectorAll("[data-gruppo-tc]").forEach(function (btn) {
    const tc = btn.dataset.gruppoTc;
    const checkboxes = Array.from(
      document.querySelectorAll(
        ".applica-cliente-checkbox[data-tc='" + tc + "']",
      ),
    );
    if (checkboxes.length === 0) return;
    const tuttiChecked = checkboxes.every(function (cb) {
      return cb.checked;
    });
    btn.textContent = tuttiChecked
      ? "− Deseleziona tutti"
      : "+ Seleziona tutti";
    if (tuttiChecked) {
      btn.classList.add("attivo");
    } else {
      btn.classList.remove("attivo");
    }
  });
}

// ─── ESPOSIZIONE GLOBALE ──────────────────────────────────────
window.openApplicaAdempimenti = openApplicaAdempimenti;
window._applicaSetTipFiltro = _applicaSetTipFiltro;
window._applicaToggleTipFiltro = _applicaToggleTipFiltro;
window._applicaSelezionaTipologia = _applicaSelezionaTipologia;
window._aggiornaApplicaSelezionaTuttiCounter =
  _aggiornaApplicaSelezionaTuttiCounter;
window.filtraClientiApplica = filtraClientiApplica;
window.toggleSelezionaTuttiAdpApplica = toggleSelezionaTuttiAdpApplica;
window.toggleSelezionaTuttiClientiApplica = toggleSelezionaTuttiClientiApplica;
window.resetSelezioneAdpApplica = resetSelezioneAdpApplica;
window.eseguiApplicaAdempimenti = eseguiApplicaAdempimenti;
window.apriApplicaAdempimentiPerVuoti = apriApplicaAdempimentiPerVuoti;
window.goToClienteScadenzarioDiretto = goToClienteScadenzarioDiretto;
