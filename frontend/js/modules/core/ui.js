// ═══════════════════════════════════════════════════════════════
// UI.JS — Helper UI generici: debounce, escape, modali, notifiche, scroll
// ═══════════════════════════════════════════════════════════════


// ─── DEBOUNCE ─────────────────────────────────────────────────
function debounce(fn, ms) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}


// ─── HTML ESCAPE ──────────────────────────────────────────────
function escAttr(s) {
  return (s || "")
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}


// ─── MODAL HELPERS ────────────────────────────────────────────
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add("open");
    setTimeout(() => {
      modal.scrollTop = 0;
      const modalInner = modal.querySelector(".modal");
      if (modalInner) modalInner.scrollTop = 0;
      window.scrollTo(0, 0);
    }, 100);
  }
}


function closeModal(id) {
  document.getElementById(id)?.classList.remove("open");
}


// ─── NOTIFICATIONS ────────────────────────────────────────────
function showNotif(msg, type = "info") {
  const container = document.getElementById("notif-container");
  const div = document.createElement("div");
  div.className = `notif ${type}`;
  div.innerHTML = `${type === "success" ? "✅" : type === "error" ? "❌" : "ℹ️"} ${msg}`;
  container.appendChild(div);
  setTimeout(() => div.remove(), 4000);
}


// ─── SCROLL TO TOP ────────────────────────────────────────────
function scrollToTop() {
  const content = document.getElementById("content");
  if (content) content.scrollTop = 0;
}
