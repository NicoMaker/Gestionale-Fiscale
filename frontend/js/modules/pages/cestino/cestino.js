// ═══════════════════════════════════════════════════════════════
// CESTINO.JS — Pagina Cestino con ripristino e eliminazione
// ═══════════════════════════════════════════════════════════════

let cestinoData = [];
let cestinoFiltro = { tabella: "", search: "" };
let cestinoSelezione = new Set(); // IDs selezionati con checkbox
let cestinoNonRipristinabili = new Set(); // IDs marcati come non ripristinabili dal server

const TABELLA_LABELS = {
  clienti: { label: "Cliente", icon: "👥" },
  adempimenti: { label: "Adempimento", icon: "📋" },
  adempimenti_cliente: { label: "Riga Scadenzario", icon: "📅" },
  appunti: { label: "Scadenza Studio", icon: "🗒️" },
  pagina_bianca: { label: "Nota", icon: "📝" },
};

function renderCestinoPage() {
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
    <button class="btn btn-sm btn-primary no-print" id="btn-ripristina-selezionati" onclick="ripristinaSelezione()" style="font-size:13px;display:none">↩️ Ripristina selezionati (<span id="count-sel">0</span>)</button>
    <button class="btn btn-sm no-print" onclick="ripristinaTutto()" style="font-size:13px;background:#16a34a;color:#fff;border:none">↩️ Ripristina tutto</button>
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
  // Rimuovi dalla selezione elementi che non esistono più
  cestinoSelezione = new Set([...cestinoSelezione].filter(id => cestinoData.some(d => d.id === id)));
  renderCestinoTabella(container);
  aggiornaBarraSelezione();
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
  const tuttiSelezionati = cestinoData.length > 0 && cestinoData.every(d => cestinoSelezione.has(d.id));

  const rows = cestinoData.map((item) => {
    const info = TABELLA_LABELS[item.tabella] || { label: item.tabella, icon: "📄" };
    const dati = item.dati || {};
    const nome = item.tabella === "adempimenti_cliente"
      ? (dati.adempimento_nome || dati.adempimento_codice || `Adempimento #${dati.id_adempimento}`)
      : (dati.nome || dati.titolo || dati.codice || `#${item.record_id}`);
    const dataEl = new Date(item.data_eliminazione);
    const giorni = Math.floor((now - dataEl) / (1000 * 60 * 60 * 24));
    const rimanenti = 30 - giorni;
    const dataFmt = dataEl.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

    const urgente = rimanenti <= 5;
    const badgeColor = urgente ? "#dc2626" : rimanenti <= 10 ? "#d97706" : "#6b7280";

    const nonRipristinabile = cestinoNonRipristinabili.has(item.id);
    const selezionato = cestinoSelezione.has(item.id);

    let extra = "";
    if (item.tabella === "clienti") {
      extra = [dati.codice_fiscale, dati.partita_iva, dati.email].filter(Boolean).join(" · ");
    } else if (item.tabella === "adempimenti") {
      extra = [dati.codice, dati.scadenza_tipo].filter(Boolean).join(" · ");
    } else if (item.tabella === "adempimenti_cliente") {
      let periodo = "";
      if (dati.mese) {
        const mesi = ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];
        periodo = mesi[(dati.mese || 1) - 1];
      } else if (dati.trimestre) {
        periodo = `T${dati.trimestre}`;
      } else if (dati.semestre) {
        periodo = `S${dati.semestre}`;
      } else {
        periodo = "Annuale";
      }
      const statoLabel = { da_fare: "Da fare", fatto: "Completato", non_applicabile: "N/A", in_corso: "In corso", text_only: "Testo" };
      extra = `${dati.cliente_nome || `Cliente #${dati.id_cliente}`} · ${periodo} ${dati.anno} · ${statoLabel[dati.stato] || dati.stato}`;
    } else if (item.tabella === "appunti") {
      extra = dati.contenuto ? dati.contenuto.substring(0, 80) + (dati.contenuto.length > 80 ? "…" : "") : "";
    } else if (item.tabella === "pagina_bianca") {
      extra = [dati.tipo === "cliente" ? "Note cliente" : "Note studio", dati.cliente_nome].filter(Boolean).join(" · ");
    }

    const rowStyle = nonRipristinabile
      ? `opacity:0.55;background:var(--bg-muted,#f5f5f5);`
      : "";

    const badgeNonRip = nonRipristinabile
      ? `<span style="font-size:11px;background:#fee2e2;color:#dc2626;border-radius:4px;padding:1px 6px;margin-left:6px;font-weight:600" title="Dipendenza eliminata: questo elemento non può essere ripristinato">⚠️ Non ripristinabile</span>`
      : "";

    const checkboxDisabled = nonRipristinabile ? "disabled title='Non ripristinabile: dipendenze mancanti'" : "";

    return `
      <tr style="${rowStyle}" id="cestino-row-${item.id}">
        <td style="width:36px;text-align:center">
          <input type="checkbox" class="cestino-check" data-id="${item.id}"
            ${selezionato ? "checked" : ""}
            ${checkboxDisabled}
            onchange="toggleCestinoSelezione(${item.id}, this.checked)"
            style="width:16px;height:16px;cursor:${nonRipristinabile ? 'not-allowed' : 'pointer'}">
        </td>
        <td style="white-space:nowrap">
          <span style="font-size:18px">${info.icon}</span>
          <span style="font-size:12px;color:var(--text-muted);margin-left:4px">${info.label}</span>
        </td>
        <td>
          <strong>${escapeHtml(nome)}</strong>${badgeNonRip}
          ${extra ? `<br><span style="font-size:12px;color:var(--text-muted)">${escapeHtml(extra)}</span>` : ""}
        </td>
        <td style="white-space:nowrap;font-size:12px;color:var(--text-muted)">${dataFmt}</td>
        <td style="white-space:nowrap">
          <span style="font-size:12px;color:${badgeColor};font-weight:600">
            ${urgente ? "⚠️ " : ""}${rimanenti} giorn${rimanenti === 1 ? "o" : "i"} rimast${rimanenti === 1 ? "o" : "i"}
          </span>
        </td>
        <td style="white-space:nowrap">
          ${nonRipristinabile
            ? `<button class="btn btn-sm" disabled style="font-size:12px;margin-right:6px;opacity:0.4;cursor:not-allowed" title="Non ripristinabile: dipendenze mancanti">↩️ Ripristina</button>`
            : `<button class="btn btn-sm btn-primary" onclick="ripristinaDaCestino(${item.id})" style="font-size:12px;margin-right:6px">↩️ Ripristina</button>`
          }
          <button class="btn btn-sm btn-danger" onclick="eliminaDefinitivoCestino(${item.id})" style="font-size:12px;background:#dc2626;color:#fff;border:none">🗑️ Elimina</button>
        </td>
      </tr>`;
  }).join("");

  container.innerHTML = `
    <div style="margin-bottom:12px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <span style="font-size:13px;color:var(--text-muted)">${cestinoData.length} element${cestinoData.length === 1 ? "o" : "i"} nel cestino</span>
      <span style="font-size:12px;color:var(--text-muted)">· Gli elementi vengono eliminati automaticamente dopo 30 giorni</span>
      ${cestinoNonRipristinabili.size > 0 ? `<span style="font-size:12px;color:#dc2626;font-weight:500">⚠️ ${cestinoNonRipristinabili.size} element${cestinoNonRipristinabili.size === 1 ? "o non ripristinabile" : "i non ripristinabili"} (dipendenze mancanti)</span>` : ""}
    </div>
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th style="width:36px;text-align:center">
              <input type="checkbox" id="cestino-check-all" title="Seleziona tutti"
                ${tuttiSelezionati ? "checked" : ""}
                onchange="toggleTuttiCestino(this.checked)"
                style="width:16px;height:16px;cursor:pointer">
            </th>
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

// ─── SELEZIONE ────────────────────────────────────────────────

function toggleCestinoSelezione(id, checked) {
  if (checked) cestinoSelezione.add(id);
  else cestinoSelezione.delete(id);
  aggiornaBarraSelezione();
  // Aggiorna checkbox "seleziona tutti"
  const checkAll = document.getElementById("cestino-check-all");
  if (checkAll) {
    const ripristinabili = cestinoData.filter(d => !cestinoNonRipristinabili.has(d.id));
    checkAll.checked = ripristinabili.length > 0 && ripristinabili.every(d => cestinoSelezione.has(d.id));
  }
}

function toggleTuttiCestino(checked) {
  cestinoSelezione.clear();
  if (checked) {
    cestinoData.forEach(item => {
      if (!cestinoNonRipristinabili.has(item.id)) {
        cestinoSelezione.add(item.id);
      }
    });
  }
  // Aggiorna checkbox singole
  document.querySelectorAll(".cestino-check:not(:disabled)").forEach(cb => {
    cb.checked = checked;
  });
  aggiornaBarraSelezione();
}

function aggiornaBarraSelezione() {
  const btn = document.getElementById("btn-ripristina-selezionati");
  const countEl = document.getElementById("count-sel");
  if (!btn) return;
  const n = cestinoSelezione.size;
  if (n > 0) {
    btn.style.display = "";
    if (countEl) countEl.textContent = n;
  } else {
    btn.style.display = "none";
  }
}

// ─── RIPRISTINA SELEZIONE (solo quelli disponibili) ───────────

function ripristinaSelezione() {
  const ids = [...cestinoSelezione].filter(id => !cestinoNonRipristinabili.has(id));
  if (!ids.length) {
    alert("Nessun elemento ripristinabile selezionato.");
    return;
  }
  const nonDisp = [...cestinoSelezione].filter(id => cestinoNonRipristinabili.has(id));
  let msg = `Ripristinare ${ids.length} element${ids.length === 1 ? "o" : "i"} selezionat${ids.length === 1 ? "o" : "i"}?`;
  if (nonDisp.length > 0) {
    msg += `\n\n⚠️ ${nonDisp.length} element${nonDisp.length === 1 ? "o" : "i"} non ripristinabil${nonDisp.length === 1 ? "e" : "i"} (dipendenze mancanti) ${nonDisp.length === 1 ? "verrà ignorato" : "verranno ignorati"}.`;
  }
  if (!confirm(msg)) return;
  socket.emit("ripristina:cestino_bulk", { ids });
}

// ─── RIPRISTINA TUTTO ─────────────────────────────────────────

function ripristinaTutto() {
  if (!cestinoData.length) {
    alert("Il cestino è già vuoto.");
    return;
  }
  const ripristinabili = cestinoData.filter(d => !cestinoNonRipristinabili.has(d.id));
  const nonRip = cestinoData.filter(d => cestinoNonRipristinabili.has(d.id));

  if (!ripristinabili.length) {
    alert("Nessun elemento è ripristinabile (tutti hanno dipendenze mancanti).");
    return;
  }

  let msg = `Ripristinare ${ripristinabili.length} element${ripristinabili.length === 1 ? "o" : "i"}?`;
  if (nonRip.length > 0) {
    msg += `\n\n⚠️ ${nonRip.length} element${nonRip.length === 1 ? "o" : "i"} non ripristinabil${nonRip.length === 1 ? "e" : "i"} (dipendenze mancanti) ${nonRip.length === 1 ? "verrà ignorato" : "verranno ignorati"}.`;
  }
  if (!confirm(msg)) return;

  const ids = ripristinabili.map(d => d.id);
  socket.emit("ripristina:cestino_bulk", { ids });
}

// ─── RIPRISTINA SINGOLO ───────────────────────────────────────

function ripristinaDaCestino(id) {
  if (cestinoNonRipristinabili.has(id)) {
    alert("Questo elemento non può essere ripristinato: le sue dipendenze sono state eliminate.");
    return;
  }
  if (!confirm("Vuoi ripristinare questo elemento?")) return;
  socket.emit("ripristina:cestino", { id });
}

socket.on("res:ripristina:cestino", ({ success, error, non_ripristinabile, id }) => {
  if (!success) {
    // Se il server segnala che non è ripristinabile, marcarlo visivamente
    if (non_ripristinabile && id) {
      cestinoNonRipristinabili.add(id);
      cestinoSelezione.delete(id);
      const container = document.getElementById("cestino-content");
      if (container) renderCestinoTabella(container);
      aggiornaBarraSelezione();
      showNotif("⚠️ Elemento non ripristinabile: le dipendenze sono state eliminate.", "error");
    } else {
      alert("Errore ripristino: " + error);
    }
  }
});

// ─── RIPRISTINA BULK ──────────────────────────────────────────

socket.on("res:ripristina:cestino_bulk", ({ success, ripristinati, saltati, non_ripristinabili_ids, error }) => {
  if (!success) {
    showNotif("❌ Errore ripristino: " + (error || "Operazione fallita"), "error");
    return;
  }

  // Marca come non ripristinabili quelli segnalati dal server
  if (non_ripristinabili_ids && non_ripristinabili_ids.length) {
    non_ripristinabili_ids.forEach(id => {
      cestinoNonRipristinabili.add(id);
      cestinoSelezione.delete(id);
    });
  }

  let msg = `✅ Ripristinat${ripristinati === 1 ? "o" : "i"} ${ripristinati} element${ripristinati === 1 ? "o" : "i"}`;
  if (saltati && saltati > 0) {
    msg += ` · ${saltati} ignorat${saltati === 1 ? "o" : "i"} (non ripristinabili)`;
  }
  showNotif(msg, "success");
  aggiornaBarraSelezione();
});

// ─── ELIMINA DEFINITIVO ───────────────────────────────────────

function eliminaDefinitivoCestino(id) {
  if (!confirm("Eliminare definitivamente questo elemento? L'operazione non è reversibile.")) return;
  socket.emit("delete:cestino_item", { id });
}

// ─── SVUOTA CESTINO ───────────────────────────────────────────

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
  else {
    cestinoSelezione.clear();
    cestinoNonRipristinabili.clear();
    aggiornaBarraSelezione();
  }
});

// ─── HELPERS ──────────────────────────────────────────────────

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
window.ripristinaSelezione = ripristinaSelezione;
window.toggleCestinoSelezione = toggleCestinoSelezione;
window.toggleTuttiCestino = toggleTuttiCestino;
