// ═══════════════════════════════════════════════════════════════
// GUIDA.JS — Bottone «Guida» nella barra laterale
//
// Apre il manuale PDF (manuale-utente-gestionale.pdf, nella radice del
// progetto) in una nuova scheda. Il file viene servito dal backend
// (vedi backend/src/app.js).
// ═══════════════════════════════════════════════════════════════
(function () {
  "use strict";

  const URL_GUIDA = "/manuale-utente-gestionale.pdf";

  function apriGuida() {
    const w = window.open(URL_GUIDA, "_blank", "noopener");
    // popup bloccato: apro nella stessa scheda
    if (!w) window.location.href = URL_GUIDA;
  }
  window.apriGuida = apriGuida;

  document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("btn-guida");
    if (!btn) return;
    const vai = () => {
      apriGuida();
      // su mobile richiude il menu laterale
      const ms = window.mobileSidebar;
      if (ms && ms.isOpen && ms.isOpen()) ms.close();
    };
    btn.addEventListener("click", vai);
    // accessibilità: Invio / Spazio come un vero bottone
    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        vai();
      }
    });
  });
})();
