// ═══════════════════════════════════════════════════════════════
// CESTINO.JS — Pagina Cestino con ripristino, eliminazione, selezione bulk
// ═══════════════════════════════════════════════════════════════

let cestinoData = [];
let cestinoFiltro = { tabelle: new Set(), search: "" };
let cestinoSelezione = new Set();
let cestinoTicker = null; // ← ticker per aggiornamento automatico badge

const TABELLA_LABELS = {
  clienti: { label: "Cliente", icon: "👥" },
  adempimenti: { label: "Adempimento", icon: "📋" },
  adempimenti_cliente: { label: "Riga Scadenzario", icon: "📅" },
  appunti: { label: "Scadenza Studio", icon: "🗒️" },
  pagina_bianca: { label: "Nota", icon: "📝" },
};

function isRipristinabile(item) {
  return [
    "clienti",
    "adempimenti",
    "appunti",
    "pagina_bianca",
    "adempimenti_cliente",
  ].includes(item.tabella);
}

const CESTINO_TIPI = [
  { value: "clienti", label: "Clienti", icon: "👥" },
  { value: "adempimenti", label: "Adempimenti", icon: "📋" },
  { value: "adempimenti_cliente", label: "Righe Scadenzario", icon: "📅" },
  { value: "appunti", label: "Scadenze Studio", icon: "🗒️" },
  { value: "pagina_bianca", label: "Note", icon: "📝" },
];

function renderFiltroTipi() {
  const nessuno = cestinoFiltro.tabelle.size === 0;
  const STILE_ATTIVO =
    "background:var(--accent,#2563eb);color:#fff;border-color:var(--accent,#2563eb);font-weight:600;";
  const STILE_INATTIVO =
    "background:var(--bg);color:var(--text2,#374151);border-color:var(--border,#d1d5db);font-weight:400;";
  const chips = CESTINO_TIPI.map((t) => {
    const attivo = cestinoFiltro.tabelle.has(t.value);
    return `<button
      onclick="toggleFiltroTipo('${t.value}')"
      style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;font-size:12px;border-radius:20px;cursor:pointer;border:1.5px solid;transition:all 0.15s;white-space:nowrap;${attivo ? STILE_ATTIVO : STILE_INATTIVO}"
    >${t.icon} ${t.label}</button>`;
  }).join("");
  const tuttiBtn = `<button
    onclick="resetFiltroTipi()"
    style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;font-size:12px;border-radius:20px;cursor:pointer;border:1.5px solid;transition:all 0.15s;white-space:nowrap;${nessuno ? STILE_ATTIVO : STILE_INATTIVO}"
  >Tutti i tipi</button>`;
  const el = document.getElementById("cestino-filter-chips");
  if (el) el.innerHTML = tuttiBtn + chips;
}

function toggleFiltroTipo(valore) {
  if (cestinoFiltro.tabelle.has(valore)) cestinoFiltro.tabelle.delete(valore);
  else cestinoFiltro.tabelle.add(valore);
  if (cestinoFiltro.tabelle.size === CESTINO_TIPI.length)
    cestinoFiltro.tabelle.clear();
  renderFiltroTipi();
  applyCestinoFiltri();
}

function resetFiltroTipi() {
  cestinoFiltro.tabelle.clear();
  renderFiltroTipi();
  applyCestinoFiltri();
}

function renderCestinoPage() {
  cestinoSelezione.clear();
  cestinoFiltro.tabelle = new Set();
  cestinoFiltro.search = "";

  // ── Avvia ticker: rirenderizza ogni 60s così il badge si aggiorna
  // automaticamente a mezzanotte senza bisogno di refresh manuale
  clearInterval(cestinoTicker);
  cestinoTicker = setInterval(() => {
    if (state.page !== "cestino") {
      clearInterval(cestinoTicker);
      cestinoTicker = null;
      return;
    }
    const container = document.getElementById("cestino-content");
    if (container && cestinoData.length)
      renderCestinoTabella(container, getCestinoDataFiltrato());
  }, 60_000);

  document.getElementById("topbar-actions").innerHTML = `
    <div id="cestino-filter-chips" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center"></div>
    <div class="search-wrap" style="width:220px">
      <span class="search-icon">🔍</span>
      <input class="input" id="cestino-search" placeholder="Cerca nel cestino…" oninput="applyCestinoFiltri()" style="font-size:13px">
    </div>
    <button class="btn btn-sm btn-danger no-print" onclick="svuotaCestino()" style="font-size:13px">🗑️ Svuota cestino</button>
  `;
  renderFiltroTipi();

  document.getElementById("content").innerHTML = `
    <div id="cestino-content" style="padding:16px">
      <div class="empty" id="cestino-loading">
        <div class="empty-icon">⏳</div>
        <p>Caricamento cestino…</p>
      </div>
    </div>
  `;

  socket.emit("get:cestino", {});
}

function applyCestinoFiltri() {
  cestinoFiltro.search = document.getElementById("cestino-search")?.value || "";
  socket.emit("get:cestino", {
    search: cestinoFiltro.search || undefined,
  });
}

function getCestinoDataFiltrato() {
  if (cestinoFiltro.tabelle.size === 0) return cestinoData;
  return cestinoData.filter((i) => cestinoFiltro.tabelle.has(i.tabella));
}

socket.on("res:cestino", ({ success, data, error }) => {
  if (state.page !== "cestino") return;
  const container = document.getElementById("cestino-content");
  if (!container) return;

  if (!success) {
    container.innerHTML = `<div class="empty"><div class="empty-icon">❌</div><p>Errore: ${error}</p></div>`;
    return;
  }

  cestinoData = data || [];
  const idSet = new Set(cestinoData.map((i) => i.id));
  for (const id of cestinoSelezione) {
    if (!idSet.has(id)) cestinoSelezione.delete(id);
  }
  renderCestinoTabella(container, getCestinoDataFiltrato());
});

// ── Quando il server elimina elementi scaduti a mezzanotte (cron),
// questo broadcast fa ricaricare i dati automaticamente su tutti i client
// che hanno il cestino aperto — senza che l'utente faccia refresh.
socket.on("broadcast:cestino_updated", () => {
  if (state.page === "cestino") {
    socket.emit("get:cestino", {
      search: cestinoFiltro.search || undefined,
    });
  }
});

function renderCestinoTabella(container, filteredData) {
  filteredData = filteredData || getCestinoDataFiltrato();
  if (!filteredData.length) {
    container.innerHTML = `
      <div class="empty">
        <div class="empty-icon">🗑️</div>
        <p style="font-size:15px;margin-bottom:6px">Il cestino è vuoto</p>
        <p style="color:var(--text3);font-size:13px">Gli elementi eliminati appariranno qui per 15 giorni prima di essere rimossi definitivamente.</p>
      </div>`;
    return;
  }

  const now = new Date();
  const oggi = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const tuttiSelezionati =
    filteredData.length > 0 &&
    filteredData.every((i) => cestinoSelezione.has(i.id));
  const qualcunoSelezionato = cestinoSelezione.size > 0;

  const selezionati = filteredData.filter((i) => cestinoSelezione.has(i.id));
  const selezionatiRipristinabili = selezionati.filter(isRipristinabile);
  const tuttiRipristinabili = filteredData.filter(isRipristinabile);

  const rows = filteredData
    .map((item) => {
      const info = TABELLA_LABELS[item.tabella] || {
        label: item.tabella,
        icon: "📄",
      };
      const dati = item.dati || {};
      const nome =
        item.tabella === "adempimenti_cliente"
          ? dati.adempimento_nome ||
            dati.adempimento_codice ||
            `Adempimento #${dati.id_adempimento}`
          : dati.nome || dati.titolo || dati.codice || `#${item.record_id}`;

      const dataEl = new Date(item.data_eliminazione);
      const eliminatoIl = new Date(
        dataEl.getFullYear(),
        dataEl.getMonth(),
        dataEl.getDate(),
      );
      const giorni = Math.round((oggi - eliminatoIl) / (1000 * 60 * 60 * 24));
      const rimanenti = 15 - giorni;

      // 0 giorni rimasti = verrà eliminato stanotte: non mostrarlo
      if (rimanenti <= 0) return null;

      const dataFmt = dataEl.toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const urgente = rimanenti <= 5;
      const badgeColor = urgente
        ? "var(--red, #dc2626)"
        : rimanenti <= 10
          ? "var(--yellow, #d97706)"
          : "var(--text3, #6b7280)";
      const ripristinabile = isRipristinabile(item);
      const selezionato = cestinoSelezione.has(item.id);

      let extra = "";
      if (item.tabella === "clienti") {
        extra = [dati.codice_fiscale, dati.partita_iva, dati.email]
          .filter(Boolean)
          .join(" · ");
      } else if (item.tabella === "adempimenti") {
        extra = [dati.codice, dati.scadenza_tipo].filter(Boolean).join(" · ");
      } else if (item.tabella === "adempimenti_cliente") {
        let periodo = "";
        if (dati.mese) {
          const mesi = [
            "Gen",
            "Feb",
            "Mar",
            "Apr",
            "Mag",
            "Giu",
            "Lug",
            "Ago",
            "Set",
            "Ott",
            "Nov",
            "Dic",
          ];
          periodo = mesi[(dati.mese || 1) - 1];
        } else if (dati.trimestre) {
          periodo = `T${dati.trimestre}`;
        } else if (dati.semestre) {
          periodo = `S${dati.semestre}`;
        } else {
          periodo = "Annuale";
        }
        const statoLabel = {
          da_fare: "Da fare",
          fatto: "Completato",
          non_applicabile: "N/A",
          in_corso: "In corso",
          text_only: "Testo",
        };
        extra = `${dati.cliente_nome || `Cliente #${dati.id_cliente}`} · ${periodo} ${dati.anno} · ${statoLabel[dati.stato] || dati.stato}`;
      } else if (item.tabella === "appunti") {
        extra = dati.contenuto
          ? dati.contenuto.substring(0, 80) +
            (dati.contenuto.length > 80 ? "…" : "")
          : "";
      } else if (item.tabella === "pagina_bianca") {
        extra = [
          dati.tipo === "cliente" ? "Note cliente" : "Note studio",
          dati.cliente_nome,
        ]
          .filter(Boolean)
          .join(" · ");
      }

      const ripristinaBtn = ripristinabile
        ? `<button class="btn btn-sm btn-primary" onclick="ripristinaDaCestino(${item.id})" style="font-size:12px;margin-right:6px" title="Ripristina">↩️ Ripristina</button>`
        : `<button class="btn btn-sm" disabled style="font-size:12px;margin-right:6px;opacity:0.45;cursor:not-allowed;background:var(--s1);color:var(--text3);border-color:var(--border)" title="Non ripristinabile: dipendenze mancanti">↩️ N/R</button>`;

      return `
      <tr class="${selezionato ? "cestino-row-selected" : ""}" style="transition:background 0.15s">
        <td style="width:32px;padding:8px 4px 8px 12px">
          <input type="checkbox" class="cestino-checkbox"
            onchange="toggleSelezione(${item.id})"
            ${selezionato ? "checked" : ""}
            style="width:15px;height:15px;cursor:pointer;accent-color:var(--accent,#2563eb)">
        </td>
        <td style="white-space:nowrap">
          <span style="font-size:18px">${info.icon}</span>
          <span style="font-size:12px;color:var(--text2);margin-left:4px">${info.label}</span>
          ${!ripristinabile ? `<span style="font-size:10px;color:var(--text3);margin-left:4px" title="Dipendenze mancanti">⚠️</span>` : ""}
        </td>
        <td>
          <strong>${escapeHtml(nome)}</strong>
          ${extra ? `<br><span style="font-size:12px;color:var(--text2)">${escapeHtml(extra)}</span>` : ""}
        </td>
        <td style="white-space:nowrap;font-size:12px;color:var(--text2)">${dataFmt}</td>
        <td style="white-space:nowrap">
          <span style="font-size:12px;color:${badgeColor};font-weight:600">
            ${urgente ? "⚠️ " : ""}${rimanenti} giorn${rimanenti === 1 ? "o" : "i"} rimast${rimanenti === 1 ? "o" : "i"}
          </span>
        </td>
        <td style="white-space:nowrap">
          ${ripristinaBtn}
          <button class="btn btn-sm btn-danger" onclick="eliminaDefinitivoCestino(${item.id})" style="font-size:12px">🗑️ Elimina</button>
        </td>
      </tr>`;
    })
    .filter(Boolean)
    .join("");

  const bulkBar = qualcunoSelezionato
    ? `
    <div id="cestino-bulk-bar" style="
      display:flex;align-items:center;gap:10px;
      background:var(--bg);border:1.5px solid var(--accent,#2563eb);
      border-radius:8px;padding:8px 14px;margin-bottom:12px;
      box-shadow:0 1px 6px rgba(37,99,235,0.08);
    ">
      <span style="font-size:13px;font-weight:600;color:var(--accent,#2563eb)">
        ${cestinoSelezione.size} selezionat${cestinoSelezione.size === 1 ? "o" : "i"}
      </span>
      <span style="color:var(--text2);font-size:12px">
        (${selezionatiRipristinabili.length} ripristinabil${selezionatiRipristinabili.length === 1 ? "e" : "i"})
      </span>
      <div style="flex:1"></div>
      ${
        selezionatiRipristinabili.length > 0
          ? `
        <button class="btn btn-sm btn-primary" onclick="ripristinaBulk()" style="font-size:12px">
          ↩️ Ripristina selezionati (${selezionatiRipristinabili.length})
        </button>`
          : ""
      }
      <button class="btn btn-sm btn-danger" onclick="eliminaBulk()" style="font-size:12px">
        🗑️ Elimina selezionati (${cestinoSelezione.size})
      </button>
      <button class="btn btn-sm btn-secondary" onclick="deselezionaTutti()" style="font-size:12px">✕ Deseleziona</button>
    </div>`
    : "";

  container.innerHTML = `
    <div style="margin-bottom:12px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <span style="font-size:13px;color:var(--text2)">${filteredData.length} element${filteredData.length === 1 ? "o" : "i"}${cestinoFiltro.tabelle.size > 0 ? " (filtrati)" : " nel cestino"}</span>
      <span style="font-size:12px;color:var(--text3)">· Gli elementi vengono eliminati automaticamente dopo 15 giorni</span>
      <div style="flex:1"></div>
      ${
        tuttiRipristinabili.length > 0
          ? `
        <button class="btn btn-sm btn-primary" onclick="ripristinaTutto()" style="font-size:12px" title="Ripristina tutti gli elementi che è possibile ripristinare">
          ↩️ Ripristina tutto (${tuttiRipristinabili.length})
        </button>`
          : ""
      }
    </div>
    ${bulkBar}
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th style="width:32px;padding:8px 4px 8px 12px">
              <input type="checkbox" id="cestino-check-all"
                onchange="toggleSelezioneAll(this.checked)"
                ${tuttiSelezionati ? "checked" : ""}
                style="width:15px;height:15px;cursor:pointer;accent-color:var(--accent,#2563eb)">
            </th>
            <th style="width:130px">Tipo</th>
            <th>Nome / Dettaglio</th>
            <th style="width:160px">Eliminato il</th>
            <th style="width:160px">Scade tra</th>
            <th style="width:220px">Azioni</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <style>
      .cestino-row-selected { background: color-mix(in srgb, var(--accent, #2563eb) 6%, transparent) !important; }
      [data-theme="dark"] .cestino-row-selected { 
        background: color-mix(in srgb, var(--accent, #4f8ef7) 12%, var(--s0, #161b22)) !important; 
      }
    </style>`;
}

// ── Selezione ──────────────────────────────────────────────────
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

function goVistaGlobaleAdp(nomi) {
  var lista = Array.isArray(nomi) ? nomi : [nomi];
  state.globalePreFiltroAdp = lista.length === 1 ? lista[0] : "";
  state.globalePreFiltroAdpMulti = lista;
  document.querySelectorAll(".nav-item").forEach(function (x) {
    x.classList.remove("active");
  });
  var nav = document.querySelector('[data-page="scadenzario_globale"]');
  if (nav) nav.classList.add("active");
  state.dashSearch = "";
  state.dashFiltroStatoAdp = "";
  renderPage("scadenzario_globale");
}

// ─── SELEZIONE MULTIPLA CARD ADEMPIMENTO (DASHBOARD) ──────────

function _getDashSelezionati() {
  if (!state.dashAdpSelezionati) state.dashAdpSelezionati = new Set();
  return state.dashAdpSelezionati;
}

function toggleDashAdpCard(nome, event) {
  if (event) event.stopPropagation();
  var sel = _getDashSelezionati();
  if (sel.has(nome)) sel.delete(nome);
  else sel.add(nome);
  if (state.dashStats) updateDashboardContent(state.dashStats);
}

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

function clearDashAdpSelezione() {
  _getDashSelezionati().clear();
  if (state.dashStats) updateDashboardContent(state.dashStats);
}

function apriVistaGlobaleDaSelezione() {
  var sel = Array.from(_getDashSelezionati());
  if (sel.length === 0) return;
  goVistaGlobaleAdp(sel);
}

function _renderDashMultiselBar() {
  var bar = document.getElementById("dash-multisel-bar");
  if (!bar) return;
  var sel = _getDashSelezionati();
  if (sel.size === 0) {
    bar.classList.remove("is-visible");
    bar.innerHTML = "";
    return;
  }
  bar.classList.add("is-visible");
  bar.innerHTML =
    "<span><strong>" +
    sel.size +
    "</strong> adempiment" +
    (sel.size === 1 ? "o selezionato" : "i selezionati") +
    "</span>" +
    '<button class="btn btn-sm btn-primary" onclick="selezionaTuttiDashAdpVisibili()">✅ Seleziona tutti</button>' +
    '<button class="btn btn-sm btn-primary" onclick="apriVistaGlobaleDaSelezione()">🌐 Apri in Vista Globale</button>' +
    '<button class="btn btn-sm btn-secondary" onclick="clearDashAdpSelezione()">✕ Deseleziona tutto</button>';
}

// ─── FILTRI STATO / SEARCH ────────────────────────────────────

function onDashFiltroStatoAdp() {
  var el = document.getElementById("dash-filtro-stato-adp");
  state.dashFiltroStatoAdp = el ? el.value : "";
  if (state.dashStats) updateDashboardContent(state.dashStats);
}

function onDashAdpSearch(val) {
  state.dashSearch = val;
  if (state.dashStats) updateDashboardContent(state.dashStats);
}

function resetDashFiltri() {
  state.dashSearch = "";
  state.dashFiltroStatoAdp = "";
  if (state.dashAdpSelezionati) state.dashAdpSelezionati.clear();
  var searchEl = document.getElementById("dash-adp-search");
  if (searchEl) searchEl.value = "";
  var statoEl = document.getElementById("dash-filtro-stato-adp");
  if (statoEl) statoEl.value = "";
  if (typeof initializeTipologieFilter === "function")
    initializeTipologieFilter();
  _refreshDashTipFiltroPanel();
  _aggiornaDashTipFiltroCounter();
  if (state.dashStats) updateDashboardContent(state.dashStats);
}

// ─── PANNELLO TIPOLOGIE DASHBOARD ─────────────────────────────

var _dashTipFiltroPanelOpen = false;
var _dashFiltroObserver = null;

function _getStorageKeys() {
  return {
    FILTRI: "gestionale_filtri_tipologie",
    NESSUNO: "gestionale_filtri_nessuno",
    PANNELLO_APERTO: "gestionale_filtri_pannello_aperto",
  };
}

function _salvaFiltriDashboardSuStorage() {
  try {
    const keys =
      typeof window._activeFiltroKeys !== "undefined"
        ? window._activeFiltroKeys
        : new Set();
    const nessuno =
      typeof window._filtroManualeNessuno !== "undefined"
        ? window._filtroManualeNessuno
        : false;

    const filtriData = {
      keys: Array.from(keys),
      nessuno: nessuno,
      pannelloAperto: _dashTipFiltroPanelOpen,
    };
    localStorage.setItem(_getStorageKeys().FILTRI, JSON.stringify(filtriData));
  } catch (e) {
    console.warn("[dashboard.js] Errore salvataggio filtri:", e);
  }
}

function toggleDashTipFiltroPanel(event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  _dashTipFiltroPanelOpen = !_dashTipFiltroPanelOpen;
  _salvaFiltriDashboardSuStorage();
  _aggiornaDashPanelVisibility();
  if (_dashTipFiltroPanelOpen) _refreshDashTipFiltroPanel();
}

function closeDashTipFiltroPanel(event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  _dashTipFiltroPanelOpen = false;
  _salvaFiltriDashboardSuStorage();
  _aggiornaDashPanelVisibility();
}

function _aggiornaDashPanelVisibility() {
  var container = document.getElementById("dash-tip-filtro-container");
  if (!container) return;
  container.style.display = _dashTipFiltroPanelOpen ? "block" : "none";
  var btn = document.getElementById("dash-tip-filtro-toggle-btn");
  if (btn) {
    btn.innerHTML = _dashTipFiltroPanelOpen
      ? '<button class="btn btn-xs btn-secondary" onclick="closeDashTipFiltroPanel(event)">✕ Chiudi</button>'
      : '<button class="btn btn-xs btn-secondary" onclick="toggleDashTipFiltroPanel(event)">▼ Espandi</button>';
  }
}

function _aggiornaDashTipFiltroCounter() {
  var badge = document.getElementById("dash-tip-filtro-count");
  var warning = document.getElementById("dash-tip-filtro-warning");
  if (!badge) return;

  var keys =
    typeof _getActiveFiltroKeys === "function"
      ? _getActiveFiltroKeys()
      : new Set();
  var allKeys =
    typeof window._getAllKeys === "function" ? window._getAllKeys() : [];
  var isNone = window._filtroManualeNessuno || keys.size === 0;
  var isAll = !isNone && keys.size === allKeys.length;

  if (isNone) {
    badge.textContent = "0";
    badge.style.display = "inline-flex";
    badge.style.background = "var(--red)";
    if (warning) warning.style.display = "inline";
  } else if (isAll) {
    badge.textContent = "";
    badge.style.display = "none";
    if (warning) warning.style.display = "none";
  } else {
    badge.textContent = keys.size;
    badge.style.display = "inline-flex";
    badge.style.background = "var(--accent)";
    if (warning) warning.style.display = "none";
  }
}

function _refreshDashTipFiltroPanel() {
  var container = document.getElementById("dash-tip-filtro-container");
  if (!container) return;
  if (typeof renderTipologieFiltroPanel !== "function") return;

  if (_dashFiltroObserver) {
    _dashFiltroObserver.disconnect();
    _dashFiltroObserver = null;
  }

  var tmp = document.createElement("div");
  tmp.innerHTML = renderTipologieFiltroPanel();
  container.innerHTML = "";
  container.appendChild(tmp.firstChild);

  container.style.display = _dashTipFiltroPanelOpen ? "block" : "none";
  _aggiornaDashTipFiltroCounter();
}

// ─── FILTRO TIPOLOGIE SU ADEMPIMENTI ─────────────────────────

function adempimentoPassaFiltroStato(a, ss) {
  if (!ss) return true;
  var inCorso = a.totale - a.completati - a.da_fare - (a.na || 0);
  if (ss === "da_fare") return a.da_fare > 0;
  if (ss === "in_corso") return inCorso > 0;
  if (ss === "completato") return a.completati > 0;
  if (ss === "n_a") return (a.na || 0) > 0;
  return true;
}

function clientePassaFiltroTipologieDashboard(adempimento) {
  var keys =
    typeof _getActiveFiltroKeys === "function"
      ? _getActiveFiltroKeys()
      : new Set();
  var allKeys =
    typeof window._getAllKeys === "function" ? window._getAllKeys() : [];
  var isNone = window._filtroManualeNessuno;
  var isAll = !isNone && keys.size === allKeys.length;

  if (keys.size === 0 || isAll) return true;
  if (isNone) return false;

  if (adempimento.cliente_tipologia_codice) {
    var tipCod = adempimento.cliente_tipologia_codice;
    return Array.from(keys).some(function (key) {
      return key.split("|")[0] === tipCod;
    });
  }
  return true;
}

// ─── AGGIORNAMENTO CONTENUTO DASHBOARD ───────────────────────

function updateDashboardContent(stats) {
  var allAdp = stats.adempimentiStats || [];
  var sq = (state.dashSearch || "").toLowerCase();
  var ss = state.dashFiltroStatoAdp || "";
  var _annoDash = state.anno || new Date().getFullYear();

  var adpVis = allAdp.filter(function (a) {
    if (a.anno_validita != null && Number(a.anno_validita) !== _annoDash)
      return false;
    if (
      sq &&
      a.nome.toLowerCase().indexOf(sq) === -1 &&
      a.codice.toLowerCase().indexOf(sq) === -1
    )
      return false;
    if (!adempimentoPassaFiltroStato(a, ss)) return false;
    if (!clientePassaFiltroTipologieDashboard(a)) return false;
    return true;
  });

  var fT = 0,
    fC = 0,
    fD = 0,
    fI = 0;
  adpVis.forEach(function (aa) {
    fT += aa.totale;
    fC += aa.completati;
    fD += aa.da_fare;
    fI += Math.max(0, aa.totale - aa.completati - aa.da_fare - (aa.na || 0));
  });
  var fP = fT > 0 ? Math.round((fC / fT) * 100) : 0;
  var isF = sq !== "" || ss !== "";

  var lblTot = document.getElementById("ds-lbl-tot");
  if (lblTot)
    lblTot.innerHTML =
      "Adempimenti " +
      stats.anno +
      (isF
        ? ' <span style="font-size:10px;color:var(--yellow)">(filtro)</span>'
        : "");
  var totEl = document.getElementById("ds-tot");
  if (totEl) totEl.textContent = fT;
  var compEl = document.getElementById("ds-comp");
  if (compEl) compEl.textContent = fC;
  var dafareEl = document.getElementById("ds-dafare");
  if (dafareEl) dafareEl.textContent = fD;
  var incorsoEl = document.getElementById("ds-incorso");
  if (incorsoEl) incorsoEl.textContent = fI;
  var percEl = document.getElementById("ds-perc");
  if (percEl) percEl.textContent = fP + "%";
  var progEl = document.getElementById("ds-prog");
  if (progEl) progEl.style.width = fP + "%";

  var titleEl = document.getElementById("dash-adp-count-title");
  if (titleEl)
    titleEl.innerHTML =
      "Adempimenti " +
      stats.anno +
      ' <span style="font-size:12px;font-weight:400;color:var(--text3);margin-left:6px">' +
      adpVis.length +
      "/" +
      allAdp.length +
      "</span>";

  var grid = document.getElementById("dash-adp-grid");
  if (!grid) return;

  if (adpVis.length === 0) {
    grid.innerHTML =
      '<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--text3)">' +
      '<div style="font-size:40px;margin-bottom:16px">📋</div><div>Nessun adempimento</div></div>';
    return;
  }

  var html = "";
  var dashSel = _getDashSelezionati();
  adpVis.forEach(function (adpItem) {
    var p =
      adpItem.totale > 0
        ? Math.round((adpItem.completati / adpItem.totale) * 100)
        : 0;
    var iC = Math.max(
      0,
      adpItem.totale - adpItem.completati - adpItem.da_fare - (adpItem.na || 0),
    );
    var pgColor =
      p === 100 ? "var(--green)" : p > 50 ? "var(--yellow)" : "var(--red)";
    var isSel = dashSel.has(adpItem.nome);
    html +=
      '<div class="dash-adp-card' +
      (isSel ? " is-selected" : "") +
      '" onclick="toggleDashAdpCard(\'' +
      adpItem.nome.replace(/'/g, "\\'") +
      "', event)\">" +
      '<div class="dash-adp-card-top">' +
      '<span class="dash-adp-card-checkbox">' +
      (isSel ? "✓" : "") +
      "</span>" +
      '<span class="adp-def-codice">' +
      adpItem.codice +
      "</span>" +
      '<div class="mini-bar" style="width:60px"><div class="mini-fill" style="width:' +
      p +
      "%;background:" +
      pgColor +
      '"></div></div>' +
      '<span style="font-size:11px;font-family:var(--mono);color:' +
      pgColor +
      '">' +
      p +
      "%</span>" +
      "</div>" +
      '<div class="dash-adp-nome">' +
      adpItem.nome +
      "</div>" +
      '<div class="dash-adp-stats">' +
      '<div class="dash-stat-chip"><span class="ds-num">' +
      adpItem.totale +
      '</span><span class="ds-lbl">Tot.</span></div>' +
      '<div class="dash-stat-chip" style="color:var(--green)"><span class="ds-num">' +
      adpItem.completati +
      '</span><span class="ds-lbl">✓</span></div>' +
      '<div class="dash-stat-chip" style="color:var(--red)"><span class="ds-num">' +
      adpItem.da_fare +
      '</span><span class="ds-lbl">⭕</span></div>' +
      (iC > 0
        ? '<div class="dash-stat-chip" style="color:var(--yellow)"><span class="ds-num">' +
          iC +
          '</span><span class="ds-lbl">🔄</span></div>'
        : "") +
      "</div></div>";
  });
  grid.innerHTML = html;
  _renderDashMultiselBar();
}

// ─── RENDER PRINCIPALE ────────────────────────────────────────

function renderDashboard(stats) {
  if (!state._dashRendered) buildDashboardShell(stats);
  state.dashStats = stats;
  updateDashboardContent(stats);
  if (typeof initializeTipologieFilter === "function")
    initializeTipologieFilter();
  _refreshDashTipFiltroPanel();
  _aggiornaDashTipFiltroCounter();
}

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
