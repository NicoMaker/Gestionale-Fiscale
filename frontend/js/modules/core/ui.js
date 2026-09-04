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
const NOTIF_ICONS = {
  success:
    '<svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  error:
    '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
  info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
};

function showNotif(msg, type = "info") {
  const container = document.getElementById("notif-container");
  const div = document.createElement("div");
  div.className = `notif ${type}`;
  div.innerHTML = `<span class="notif-icon">${NOTIF_ICONS[type] || NOTIF_ICONS.info}</span><span>${msg}</span>`;
  container.appendChild(div);
  setTimeout(() => {
    div.style.opacity = "0";
    div.style.transform = "translateX(80px)";
    div.style.transition = "all 0.3s ease";
    setTimeout(() => div.remove(), 300);
  }, 4000);
}

// ─── SCROLL TO TOP ────────────────────────────────────────────
function scrollToTop() {
  const content = document.getElementById("content");
  if (content) content.scrollTop = 0;
}
