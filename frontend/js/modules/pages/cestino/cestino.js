// ═══════════════════════════════════════════════════════════════
// CESTINO.JS — Pagina Cestino con ripristino, eliminazione, selezione bulk
// ═══════════════════════════════════════════════════════════════

let cestinoData = [];
let cestinoFiltro = { tabella: "", search: "" };
let cestinoSelezione = new Set(); // ids selezionati

const TABELLA_LABELS = {
  clienti: { label: "Cliente", icon: "👥" },
  adempimenti: { label: "Adempimento", icon: "📋" },
  adempimenti_cliente: { label: "Riga Scadenzario", icon: "📅" },
  appunti: { label: "Scadenza Studio", icon: "🗒️" },
  pagina_bianca: { label: "Nota", icon: "📝" },
};

// Controlla se un elemento è ripristinabile (basato su tipo)
function isRipristinabile(item) {
  // adempimenti_cliente richiede che cliente e adempimento esistano: non possiamo saperlo lato client
  // Tutti gli altri tipi supportati possono essere ripristinati
  return [
    "clienti",
    "adempimenti",
    "appunti",
    "pagina_bianca",
    "adempimenti_cliente",
  ].includes(item.tabella);
}

function renderCestinoPage() {
  cestinoSelezione.clear();
  document.getElementById("topbar-actions").innerHTML = `
    <select class="input" id="cestino-filter-tabella" onchange="applyCestinoFiltri()" style="font-size:13px;max-width:180px">
      <option value="">Tutti i tipi</option>
      <option value="clienti">👥 Clienti</option>
      <option value="adempimenti">📋 Adempimenti</option>
      <option value="adempimenti_cliente">📅 Righe Scadenzario</option>
      <option value="appunti">🗒️ Scadenze Studio</option>
      <option value="pagina_bianca">📝 Note</option>
    </select>
    <div class="search-wrap" style="width:220px">
      <span class="search-icon">🔍</span>
      <input class="input" id="cestino-search" placeholder="Cerca nel cestino…" oninput="applyCestinoFiltri()" style="font-size:13px">
    </div>
    <button class="btn btn-sm btn-danger no-print" onclick="svuotaCestino()" style="font-size:13px;background:#dc2626;color:#fff;border:none">🗑️ Svuota cestino</button>
  `;

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
  cestinoFiltro.tabella =
    document.getElementById("cestino-filter-tabella")?.value || "";
  cestinoFiltro.search = document.getElementById("cestino-search")?.value || "";
  socket.emit("get:cestino", {
    tabella: cestinoFiltro.tabella || undefined,
    search: cestinoFiltro.search || undefined,
  });
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
  // Rimuovi dalla selezione elementi che non sono più presenti
  const idSet = new Set(cestinoData.map((i) => i.id));
  for (const id of cestinoSelezione) {
    if (!idSet.has(id)) cestinoSelezione.delete(id);
  }
  renderCestinoTabella(container);
});

socket.on("broadcast:cestino_updated", () => {
  if (state.page === "cestino") {
    socket.emit("get:cestino", {
      tabella: cestinoFiltro.tabella || undefined,
      search: cestinoFiltro.search || undefined,
    });
  }
});

function renderCestinoTabella(container) {
  if (!cestinoData.length) {
    container.innerHTML = `
      <div class="empty">
        <div class="empty-icon">🗑️</div>
        <p style="font-size:15px;margin-bottom:6px">Il cestino è vuoto</p>
        <p style="color:var(--text-muted);font-size:13px">Gli elementi eliminati appariranno qui per 30 giorni prima di essere rimossi definitivamente.</p>
      </div>`;
    return;
  }

  const now = new Date();
  const tuttiSelezionati =
    cestinoData.length > 0 &&
    cestinoData.every((i) => cestinoSelezione.has(i.id));
  const qualcunoSelezionato = cestinoSelezione.size > 0;

  // Calcola quanti selezionati sono ripristinabili
  const selezionati = cestinoData.filter((i) => cestinoSelezione.has(i.id));
  const selezionatiRipristinabili = selezionati.filter(isRipristinabile);
  const tuttiRipristinabili = cestinoData.filter(isRipristinabile);

  const rows = cestinoData
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
      const giorni = Math.floor((now - dataEl) / (1000 * 60 * 60 * 24));
      const rimanenti = 30 - giorni;
      const dataFmt = dataEl.toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const urgente = rimanenti <= 5;
      const badgeColor = urgente
        ? "#dc2626"
        : rimanenti <= 10
          ? "#d97706"
          : "#6b7280";
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
        : `<button class="btn btn-sm" disabled style="font-size:12px;margin-right:6px;opacity:0.45;cursor:not-allowed" title="Non ripristinabile: dipendenze mancanti">↩️ N/R</button>`;

      return `
      <tr class="${selezionato ? "cestino-row-selected" : ""}" style="transition:background 0.15s">
        <td style="width:32px;padding:8px 4px 8px 12px">
          <input type="checkbox" class="cestino-checkbox"
            onchange="toggleSelezione(${item.id})"
            ${selezionato ? "checked" : ""}
            style="width:15px;height:15px;cursor:pointer;accent-color:var(--primary)">
        </td>
        <td style="white-space:nowrap">
          <span style="font-size:18px">${info.icon}</span>
          <span style="font-size:12px;color:var(--text-muted);margin-left:4px">${info.label}</span>
          ${!ripristinabile ? `<span style="font-size:10px;color:#9ca3af;margin-left:4px" title="Dipendenze mancanti">⚠️</span>` : ""}
        </td>
        <td>
          <strong>${escapeHtml(nome)}</strong>
          ${extra ? `<br><span style="font-size:12px;color:var(--text-muted)">${escapeHtml(extra)}</span>` : ""}
        </td>
        <td style="white-space:nowrap;font-size:12px;color:var(--text-muted)">${dataFmt}</td>
        <td style="white-space:nowrap">
          <span style="font-size:12px;color:${badgeColor};font-weight:600">
            ${urgente ? "⚠️ " : ""}${rimanenti} giorn${rimanenti === 1 ? "o" : "i"} rimast${rimanenti === 1 ? "o" : "i"}
          </span>
        </td>
        <td style="white-space:nowrap">
          ${ripristinaBtn}
          <button class="btn btn-sm btn-danger" onclick="eliminaDefinitivoCestino(${item.id})" style="font-size:12px;background:#dc2626;color:#fff;border:none">🗑️ Elimina</button>
        </td>
      </tr>`;
    })
    .join("");

  // Barra azioni bulk
  const bulkBar = qualcunoSelezionato
    ? `
    <div id="cestino-bulk-bar" style="
      display:flex;align-items:center;gap:10px;
      background:var(--bg-card,#fff);border:1.5px solid var(--primary,#2563eb);
      border-radius:8px;padding:8px 14px;margin-bottom:12px;
      box-shadow:0 1px 6px rgba(37,99,235,0.08);
    ">
      <span style="font-size:13px;font-weight:600;color:var(--primary,#2563eb)">
        ${cestinoSelezione.size} selezionat${cestinoSelezione.size === 1 ? "o" : "i"}
      </span>
      <span style="color:var(--text-muted);font-size:12px">
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
      <button class="btn btn-sm btn-danger" onclick="eliminaBulk()" style="font-size:12px;background:#dc2626;color:#fff;border:none">
        🗑️ Elimina selezionati (${cestinoSelezione.size})
      </button>
      <button class="btn btn-sm" onclick="deselezionaTutti()" style="font-size:12px">✕ Deseleziona</button>
    </div>`
    : "";

  container.innerHTML = `
    <div style="margin-bottom:12px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <span style="font-size:13px;color:var(--text-muted)">${cestinoData.length} element${cestinoData.length === 1 ? "o" : "i"} nel cestino</span>
      <span style="font-size:12px;color:var(--text-muted)">· Gli elementi vengono eliminati automaticamente dopo 30 giorni</span>
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
                style="width:15px;height:15px;cursor:pointer;accent-color:var(--primary)">
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
      .cestino-row-selected { background: color-mix(in srgb, var(--primary, #2563eb) 6%, transparent) !important; }
    </style>`;
}

// ── Selezione ──────────────────────────────────────────────────
function toggleSelezione(id) {
  if (cestinoSelezione.has(id)) cestinoSelezione.delete(id);
  else cestinoSelezione.add(id);
  const container = document.getElementById("cestino-content");
  if (container) renderCestinoTabella(container);
}

function toggleSelezioneAll(checked) {
  if (checked) cestinoData.forEach((i) => cestinoSelezione.add(i.id));
  else cestinoSelezione.clear();
  const container = document.getElementById("cestino-content");
  if (container) renderCestinoTabella(container);
}

function deselezionaTutti() {
  cestinoSelezione.clear();
  const container = document.getElementById("cestino-content");
  if (container) renderCestinoTabella(container);
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
  const ripristinabili = cestinoData.filter(isRipristinabile);
  if (!ripristinabili.length) {
    alert("Nessun elemento ripristinabile nel cestino.");
    return;
  }
  const nonRipristinabili = cestinoData.length - ripristinabili.length;
  let msg = `Ripristinare tutti i ${ripristinabili.length} elementi ripristinabili?`;
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
  if (!cestinoData.length) {
    alert("Il cestino è già vuoto.");
    return;
  }
  if (
    !confirm(
      `Eliminare definitivamente tutti i ${cestinoData.length} elementi nel cestino? L'operazione non è reversibile.`,
    )
  )
    return;
  socket.emit("svuota:cestino");
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
window.ripristinaDaCestino = ripristinaDaCestino;
window.eliminaDefinitivoCestino = eliminaDefinitivoCestino;
window.svuotaCestino = svuotaCestino;
window.ripristinaTutto = ripristinaTutto;
window.ripristinaBulk = ripristinaBulk;
window.eliminaBulk = eliminaBulk;
window.toggleSelezione = toggleSelezione;
window.toggleSelezioneAll = toggleSelezioneAll;
window.deselezionaTutti = deselezionaTutti;
