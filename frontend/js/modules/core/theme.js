// ═══════════════════════════════════════════════════════════════
// THEME.JS — Gestione tema chiaro/scuro
//   • Prima visita: usa il tema del sistema operativo
//   • Scelta utente: salvata in localStorage, persiste
//   • Cambia il data-theme sull'<html>
// ═══════════════════════════════════════════════════════════════

const THEME_KEY = "gf_theme"; // chiave localStorage

/**
 * Restituisce il tema attualmente attivo ('light' | 'dark')
 */
function getCurrentTheme() {
  return document.documentElement.getAttribute("data-theme") || "light";
}

/**
 * Applica il tema senza salvarlo (usato all'avvio)
 */
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  // Aggiorna meta theme-color per mobile
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute("content", theme === "dark" ? "#0f1117" : "#ffffff");
  }
  // Aggiorna l'icona del toggle nella sidebar
  _updateToggleUI(theme);
}

/**
 * Imposta e salva il tema
 */
function setTheme(theme) {
  applyTheme(theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (_) {}
}

/**
 * Alterna tra chiaro e scuro
 */
function toggleTheme() {
  const next = getCurrentTheme() === "dark" ? "light" : "dark";
  setTheme(next);
}

/**
 * Aggiorna l'etichetta/icona del bottone toggle nella sidebar
 */
function _updateToggleUI(theme) {
  const iconEl = document.querySelector(".theme-toggle-icon");
  const labelEl = document.querySelector(".theme-toggle-label");
  if (iconEl) iconEl.textContent = theme === "dark" ? "☀️" : "🌙";
  if (labelEl)
    labelEl.textContent = theme === "dark" ? "Tema Chiaro" : "Tema Scuro";
}

/**
 * Inizializzazione — chiamata una sola volta al caricamento della pagina.
 * Determina il tema da usare: localStorage → preferenza sistema → light
 */
function initTheme() {
  let saved = null;
  try {
    saved = localStorage.getItem(THEME_KEY);
  } catch (_) {}

  let theme;
  if (saved === "light" || saved === "dark") {
    // L'utente ha già scelto esplicitamente
    theme = saved;
  } else {
    // Prima visita: usa il tema del sistema operativo
    const prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    theme = prefersDark ? "dark" : "light";
  }

  applyTheme(theme);

  // Ascolta i cambiamenti del sistema SOLO se non c'è una preferenza salvata
  if (!saved && window.matchMedia) {
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (e) => {
        try {
          const hasSaved = localStorage.getItem(THEME_KEY);
          if (!hasSaved) {
            applyTheme(e.matches ? "dark" : "light");
          }
        } catch (_) {}
      });
  }
}

// Esponi globalmente
window.initTheme = initTheme;
window.toggleTheme = toggleTheme;
window.setTheme = setTheme;
window.getCurrentTheme = getCurrentTheme;

// Inizializza subito (prima che il DOM sia completo, per evitare flash)
initTheme();
