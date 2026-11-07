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

  // Se hai ingrandito il testo (Personalizza → Testo), il PDF si apre con lo
  // stesso zoom (#zoom=… è riconosciuto da Chrome, Edge e Firefox).
  function urlConZoom() {
    try {
      const t = window.GF_PERSONALIZZA && window.GF_PERSONALIZZA.stato
        ? window.GF_PERSONALIZZA.stato().misure.testo
        : 100;
      return t && t !== 100 ? `${URL_GUIDA}#zoom=${t}` : URL_GUIDA;
    } catch (_) {
      return URL_GUIDA;
    }
  }

  // Apre SEMPRE in una nuova scheda usando un <a target="_blank">.
  // Questo metodo non viene mai bloccato come popup dai browser.
  function apriGuida() {
    const url = urlConZoom();

    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();

    // Rimuove l'elemento dopo che il browser ha gestito il click
    setTimeout(() => a.remove(), 0);
  }
  window.apriGuida = apriGuida;

  document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("btn-guida");
    if (!btn) return;

    const vai = (e) => {
      if (e) e.preventDefault();
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