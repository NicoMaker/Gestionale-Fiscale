// ═══════════════════════════════════════════════════════════════
// CESTINO.JS — Pagina Cestino con ripristino e eliminazione
// ═══════════════════════════════════════════════════════════════

let cestinoData = [];
let cestinoFiltro = { tabella: "", search: "" };

const TABELLA_LABELS = {
  clienti: { label: "Cliente", icon: "👥" },
  adempimenti: { label: "Adempimento", icon: "📋" },
  appunti: { label: "Scadenza Studio", icon: "📅" },
  pagina_bianca: { label: "Nota", icon: "📝" },
};

function renderCestinoPage() {
  document.getElementById("topbar-actions").innerHTML = `
    <select class="input" id="cestino-filter-tabella" onchange="applyCestinoFiltri()" style="font-size:13px;max-width:180px">
      <option value="">Tutti i tipi</option>
      <option value="clienti">👥 Clienti</option>
      <option value="adempimenti">📋 Adempimenti</option>
      <option value="appunti">📅 Scadenze Studio</option>
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
  cestinoFiltro.tabella = document.getElementById("cestino-filter-tabella")?.value || "";
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

  const rows = cestinoData.map((item) => {
    const info = TABELLA_LABELS[item.tabella] || { label: item.tabella, icon: "📄" };
    const dati = item.dati || {};
    const nome = dati.nome || dati.titolo || dati.codice || `#${item.record_id}`;
    const dataEl = new Date(item.data_eliminazione);
    const giorni = Math.floor((now - dataEl) / (1000 * 60 * 60 * 24));
    const rimanenti = 30 - giorni;
    const dataFmt = dataEl.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

    const urgente = rimanenti <= 5;
    const badgeColor = urgente ? "#dc2626" : rimanenti <= 10 ? "#d97706" : "#6b7280";

    let extra = "";
    if (item.tabella === "clienti") {
      extra = [dati.codice_fiscale, dati.partita_iva, dati.email].filter(Boolean).join(" · ");
    } else if (item.tabella === "adempimenti") {
      extra = [dati.codice, dati.scadenza_tipo].filter(Boolean).join(" · ");
    } else if (item.tabella === "appunti") {
      extra = dati.contenuto ? dati.contenuto.substring(0, 80) + (dati.contenuto.length > 80 ? "…" : "") : "";
    } else if (item.tabella === "pagina_bianca") {
      extra = [dati.tipo === "cliente" ? "Note cliente" : "Note studio", dati.cliente_nome].filter(Boolean).join(" · ");
    }

    return `
      <tr>
        <td style="white-space:nowrap">
          <span style="font-size:18px">${info.icon}</span>
          <span style="font-size:12px;color:var(--text-muted);margin-left:4px">${info.label}</span>
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
          <button class="btn btn-sm btn-primary" onclick="ripristinaDaCestino(${item.id})" style="font-size:12px;margin-right:6px">↩️ Ripristina</button>
          <button class="btn btn-sm btn-danger" onclick="eliminaDefinitivoCestino(${item.id})" style="font-size:12px;background:#dc2626;color:#fff;border:none">🗑️ Elimina</button>
        </td>
      </tr>`;
  }).join("");

  container.innerHTML = `
    <div style="margin-bottom:12px;display:flex;align-items:center;gap:12px">
      <span style="font-size:13px;color:var(--text-muted)">${cestinoData.length} element${cestinoData.length === 1 ? "o" : "i"} nel cestino</span>
      <span style="font-size:12px;color:var(--text-muted)">· Gli elementi vengono eliminati automaticamente dopo 30 giorni</span>
    </div>
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th style="width:120px">Tipo</th>
            <th>Nome / Dettaglio</th>
            <th style="width:160px">Eliminato il</th>
            <th style="width:160px">Scade tra</th>
            <th style="width:200px">Azioni</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function ripristinaDaCestino(id) {
  if (!confirm("Vuoi ripristinare questo elemento?")) return;
  socket.emit("ripristina:cestino", { id });
}

socket.on("res:ripristina:cestino", ({ success, error }) => {
  if (!success) {
    alert("Errore ripristino: " + error);
  }
});

function eliminaDefinitivoCestino(id) {
  if (!confirm("Eliminare definitivamente questo elemento? L'operazione non è reversibile.")) return;
  socket.emit("delete:cestino_item", { id });
}

function svuotaCestino() {
  if (!cestinoData.length) {
    alert("Il cestino è già vuoto.");
    return;
  }
  if (!confirm(`Eliminare definitivamente tutti i ${cestinoData.length} elementi nel cestino? L'operazione non è reversibile.`)) return;
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
