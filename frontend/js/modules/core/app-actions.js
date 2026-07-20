// ═══════════════════════════════════════════════════════════════
// APP-ACTIONS.JS — Azioni app: download DB, nuovo anno, ricerca cliente condivisa
// ═══════════════════════════════════════════════════════════════

const _ANNO_KEY = "gestionale_last_anno";
const SHARED_SEARCH_KEY = "gestionale_search_cliente";

// ─── DOWNLOAD DATABASE ────────────────────────────────────────
function scaricaDatabase() {
  showNotif("⏳ Download in corso...", "info");
  fetch("/api/download-db", { method: "GET" })
    .then((r) => {
      if (!r.ok)
        return r.json().then((e) => {
          throw new Error(e.error || "Download fallito");
        });
      return r.blob();
    })
    .then((blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "gestionale.db";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showNotif("✅ Database scaricato!", "success");
    })
    .catch((e) => showNotif(`❌ Errore: ${e.message}`, "error"));
}

function checkNuovoAnno(anno) {
  const last = parseInt(localStorage.getItem(_ANNO_KEY) || "0");
  if (last && anno > last) {
    localStorage.setItem(_ANNO_KEY, anno);
    setTimeout(() => aprireDialogoNuovoAnno(anno, last), 800);
  } else if (!last) {
    localStorage.setItem(_ANNO_KEY, anno);
  }
}

function aprireDialogoNuovoAnno(annoNuovo, annoPrecedente) {
  let overlay = document.getElementById("modal-nuovo-anno");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "modal-nuovo-anno";
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal modal-sm">
        <div class="modal-title">🎉 Nuovo Anno <span id="nna-anno" style="color:var(--accent)"></span></div>
        <div class="infobox" style="margin-bottom:16px">
          Sei nel <strong id="nna-anno2"></strong>. Vuoi rivedere le categorie attive dei clienti prima di generare lo scadenzario?
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" onclick="closeModal('modal-nuovo-anno')">⏭️ Salta</button>
          <button class="btn btn-primary" onclick="closeModal('modal-nuovo-anno');renderPage('clienti')">👥 Vai ai Clienti</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.classList.remove("open");
    });
  }
  document.getElementById("nna-anno").textContent = annoNuovo;
  document.getElementById("nna-anno2").textContent = annoNuovo;
  openModal("modal-nuovo-anno");
}

function getSharedClienteSearch() {
  try {
    return localStorage.getItem(SHARED_SEARCH_KEY) || "";
  } catch (e) {
    return "";
  }
}

function setSharedClienteSearch(value) {
  try {
    localStorage.setItem(SHARED_SEARCH_KEY, value || "");
  } catch (e) {
    /* ignora storage non disponibile */
  }
}

// Esposizioni globali
window.getSharedClienteSearch = getSharedClienteSearch;
window.setSharedClienteSearch = setSharedClienteSearch;
