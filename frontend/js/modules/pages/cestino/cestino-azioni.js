function toggleSelezione(id) {
  if (cestinoSelezione.has(id)) cestinoSelezione.delete(id);
  else cestinoSelezione.add(id);
  const container = document.getElementById("cestino-content");
  if (container) renderCestinoTabella(container, getCestinoDataFiltrato());
}

function toggleSelezioneAll(checked) {
  const visible = getCestinoDataFiltrato();
  if (checked) visible.forEach((i) => cestinoSelezione.add(i.id));
  else visible.forEach((i) => cestinoSelezione.delete(i.id));
  const container = document.getElementById("cestino-content");
  if (container) renderCestinoTabella(container);
}

function deselezionaTutti() {
  cestinoSelezione.clear();
  const container = document.getElementById("cestino-content");
  if (container) renderCestinoTabella(container, getCestinoDataFiltrato());
}

// ── Ripristino singolo ─────────────────────────────────────────
function ripristinaDaCestino(id) {
  if (!confirm("Vuoi ripristinare questo elemento?")) return;
  socket.emit("ripristina:cestino", { id });
}

socket.on("res:ripristina:cestino", ({ success, error }) => {
  if (!success) alert("Errore ripristino: " + error);
});

// ── Elimina singolo ───────────────────────────────────────────
function eliminaDefinitivoCestino(id) {
  if (
    !confirm(
      "Eliminare definitivamente questo elemento? L'operazione non è reversibile.",
    )
  )
    return;
  socket.emit("delete:cestino_item", { id });
}

// ── Ripristina tutto ──────────────────────────────────────────
function ripristinaTutto() {
  const visibili = getCestinoDataFiltrato();
  const ripristinabili = visibili.filter(isRipristinabile);
  if (!ripristinabili.length) {
    alert("Nessun elemento ripristinabile tra quelli visibili.");
    return;
  }
  const nonRipristinabili = visibili.length - ripristinabili.length;
  const hasFiltro = cestinoFiltro.tabelle.size > 0 || cestinoFiltro.search;
  let msg = hasFiltro
    ? `Ripristinare i ${ripristinabili.length} elementi visibili (filtrati)?`
    : `Ripristinare tutti i ${ripristinabili.length} elementi ripristinabili?`;
  if (nonRipristinabili > 0) {
    msg += `\n\n⚠️ ${nonRipristinabili} element${nonRipristinabili === 1 ? "o" : "i"} non verr${nonRipristinabili === 1 ? "à" : "anno"} ripristinato (dipendenze mancanti, es. cliente o adempimento già eliminato).`;
  }
  if (!confirm(msg)) return;
  socket.emit("ripristina:cestino:bulk", {
    ids: ripristinabili.map((i) => i.id),
  });
}

socket.on("res:ripristina:cestino:bulk", ({ success, ok, failed, error }) => {
  if (!success) {
    alert("Errore: " + error);
    return;
  }
  if (failed && failed.length) {
    const dettagli = failed.map((f) => `• ID ${f.id}: ${f.error}`).join("\n");
    alert(
      `✅ Ripristinati: ${ok}\n❌ Falliti: ${failed.length}\n\nDettagli fallimenti:\n${dettagli}`,
    );
  }
});

// ── Ripristina bulk (selezione) ───────────────────────────────
function ripristinaBulk() {
  const selezionati = cestinoData.filter((i) => cestinoSelezione.has(i.id));
  const ripristinabili = selezionati.filter(isRipristinabile);
  const nonRipristinabili = selezionati.length - ripristinabili.length;
  if (!ripristinabili.length) {
    alert("Nessuno degli elementi selezionati è ripristinabile.");
    return;
  }
  let msg = `Ripristinare ${ripristinabili.length} element${ripristinabili.length === 1 ? "o" : "i"} selezionat${ripristinabili.length === 1 ? "o" : "i"}?`;
  if (nonRipristinabili > 0) {
    msg += `\n\n⚠️ ${nonRipristinabili} element${nonRipristinabili === 1 ? "o" : "i"} verr${nonRipristinabili === 1 ? "à" : "anno"} saltato (dipendenze mancanti).`;
  }
  if (!confirm(msg)) return;
  socket.emit("ripristina:cestino:bulk", {
    ids: ripristinabili.map((i) => i.id),
  });
}

// ── Elimina bulk (selezione) ──────────────────────────────────
function eliminaBulk() {
  const ids = Array.from(cestinoSelezione);
  if (!ids.length) return;
  if (
    !confirm(
      `Eliminare definitivamente ${ids.length} element${ids.length === 1 ? "o" : "i"} selezionat${ids.length === 1 ? "o" : "i"}? L'operazione non è reversibile.`,
    )
  )
    return;
  socket.emit("delete:cestino:bulk", { ids });
  cestinoSelezione.clear();
}

socket.on("res:delete:cestino:bulk", ({ success, error }) => {
  if (!success) alert("Errore eliminazione: " + error);
});

// ── Svuota cestino ────────────────────────────────────────────
function svuotaCestino() {
  const visibili = getCestinoDataFiltrato();
  const hasFiltro = cestinoFiltro.tabelle.size > 0 || cestinoFiltro.search;

  if (!visibili.length) {
    alert(
      hasFiltro
        ? "Nessun elemento visibile da eliminare."
        : "Il cestino è già vuoto.",
    );
    return;
  }

  if (hasFiltro) {
    if (
      !confirm(
        `Eliminare definitivamente i ${visibili.length} elementi visibili? L'operazione non è reversibile.`,
      )
    )
      return;
    socket.emit("delete:cestino:bulk", { ids: visibili.map((i) => i.id) });
    cestinoSelezione.clear();
  } else {
    if (
      !confirm(
        `Eliminare definitivamente tutti i ${cestinoData.length} elementi nel cestino? L'operazione non è reversibile.`,
      )
    )
      return;
    socket.emit("svuota:cestino");
  }
}

socket.on("res:svuota:cestino", ({ success, eliminati, error }) => {
  if (!success) alert("Errore: " + error);
});

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

window.renderCestinoPage = renderCestinoPage;
window.applyCestinoFiltri = applyCestinoFiltri;
window.toggleFiltroTipo = toggleFiltroTipo;
window.resetFiltroTipi = resetFiltroTipi;
window.ripristinaDaCestino = ripristinaDaCestino;
window.eliminaDefinitivoCestino = eliminaDefinitivoCestino;
window.svuotaCestino = svuotaCestino;
window.ripristinaTutto = ripristinaTutto;
window.ripristinaBulk = ripristinaBulk;
window.eliminaBulk = eliminaBulk;
window.toggleSelezione = toggleSelezione;
window.toggleSelezioneAll = toggleSelezioneAll;
window.deselezionaTutti = deselezionaTutti;

// ═══════════════════════════════════════════════════════════════
// DASHBOARD-RENDER.JS — Filtri stato/search, pannello tipologie,
//                        aggiornamento contenuto, render principale
// Dipende da: dashboard-applica.js
// ═══════════════════════════════════════════════════════════════
// ─── VISTA GLOBALE ────────────────────────────────────────────



// ─── SELEZIONE MULTIPLA CARD ADEMPIMENTO (DASHBOARD) ──────────





function selezionaTuttiDashAdpVisibili() {
  // Seleziona tutte le card attualmente visibili (dopo filtri stato/search)
  var grid = document.getElementById("dash-adp-grid");
  if (!grid) return;
  var cardNomi = Array.from(grid.querySelectorAll(".dash-adp-card"))
    .map(function (card) {
      // Il nome è nel div .dash-adp-nome
      var nomeEl = card.querySelector(".dash-adp-nome");
      return nomeEl ? nomeEl.textContent.trim() : null;
    })
    .filter(Boolean);

  var sel = _getDashSelezionati();
  cardNomi.forEach(function (nome) {
    sel.add(nome);
  });
  if (state.dashStats) updateDashboardContent(state.dashStats);
}







// ─── FILTRI STATO / SEARCH ────────────────────────────────────







// ─── PANNELLO TIPOLOGIE DASHBOARD ─────────────────────────────

var _dashTipFiltroPanelOpen = false;
var _dashFiltroObserver = null;















// ─── FILTRO TIPOLOGIE SU ADEMPIMENTI ─────────────────────────





// ─── AGGIORNAMENTO CONTENUTO DASHBOARD ───────────────────────



// ─── RENDER PRINCIPALE ────────────────────────────────────────



// ─── SOCKET LISTENERS ─────────────────────────────────────────

if (typeof socket !== "undefined") {
  socket.on("res:clienti_senza_adempimenti", function (data) {
    if (data.success) renderClientiSenzaAdempimenti(data.data);
  });
  socket.on("res:applica:adempimenti_a_clienti", function (data) {
    if (data.success) {
      var msg =
        "✅ Applicati " +
        data.inseriti +
        " adempimenti a " +
        data.clienti +
        " clienti";
      if (data.dettagli && data.dettagli.skipped > 0)
        msg += " — " + data.dettagli.skipped + " già esistenti";
      showNotif(msg, "success");
      socket.emit("get:stats", { anno: state.anno });
      caricaClientiSenzaAdempimenti();
    } else {
      showNotif("❌ Errore: " + (data.error || "Operazione fallita"), "error");
    }
  });

  socket.on("res:elimina:adempimenti_a_clienti", function (data) {
    if (data.success) {
      var msg =
        "🗑️ Eliminati " +
        data.eliminati +
        " record da " +
        data.clienti +
        " clienti";
      if (data.nonTrovati > 0)
        msg += " (" + data.nonTrovati + " già assenti, ignorati)";
      showNotif(msg, "success");
      socket.emit("get:stats", { anno: state.anno });
      caricaClientiSenzaAdempimenti();
    } else {
      showNotif(
        "❌ Errore eliminazione: " + (data.error || "Operazione fallita"),
        "error",
      );
    }
  });
}

// ─── ESPOSIZIONE GLOBALE ──────────────────────────────────────

window.caricaClientiSenzaAdempimenti = caricaClientiSenzaAdempimenti;
window.goVistaGlobaleAdp = goVistaGlobaleAdp;
window.toggleDashAdpCard = toggleDashAdpCard;
window.selezionaTuttiDashAdpVisibili = selezionaTuttiDashAdpVisibili;
window.clearDashAdpSelezione = clearDashAdpSelezione;
window.apriVistaGlobaleDaSelezione = apriVistaGlobaleDaSelezione;
window.onDashFiltroStatoAdp = onDashFiltroStatoAdp;
window.resetDashFiltri = resetDashFiltri;
window.onDashAdpSearch = onDashAdpSearch;
window.toggleDashTipFiltroPanel = toggleDashTipFiltroPanel;
window.closeDashTipFiltroPanel = closeDashTipFiltroPanel;
window._aggiornaDashPanelVisibility = _aggiornaDashPanelVisibility;
window._aggiornaDashTipFiltroCounter = _aggiornaDashTipFiltroCounter;
window._refreshDashTipFiltroPanel = _refreshDashTipFiltroPanel;
window.setApplicaModalita = setApplicaModalita;
