// ═══════════════════════════════════════════════════════════════
// THEME.JS — Gestione tema chiaro/scuro
// ═══════════════════════════════════════════════════════════════

const THEME_KEY = "gf_theme";

const ICONS = {
  moon: '<svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
  sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>',
};

function getCurrentTheme() {
  return document.documentElement.getAttribute("data-theme") || "light";
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute("content", theme === "dark" ? "#0b0f19" : "#f8fafc");
  }
  _updateToggleUI(theme);
}

function setTheme(theme) {
  applyTheme(theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (_) {}
}

function toggleTheme() {
  const next = getCurrentTheme() === "dark" ? "light" : "dark";
  setTheme(next);
}

function _updateToggleUI(theme) {
  const iconEl = document.querySelector(".theme-toggle-icon");
  const labelEl = document.querySelector(".theme-toggle-label");
  if (iconEl) iconEl.innerHTML = theme === "dark" ? ICONS.sun : ICONS.moon;
  if (labelEl)
    labelEl.textContent = theme === "dark" ? "Tema Chiaro" : "Tema Scuro";
}

function initTheme() {
  let saved = null;
  try {
    saved = localStorage.getItem(THEME_KEY);
  } catch (_) {}

  let theme;
  if (saved === "light" || saved === "dark") {
    theme = saved;
  } else {
    const prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    theme = prefersDark ? "dark" : "light";
  }

  applyTheme(theme);

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

window.initTheme = initTheme;
window.toggleTheme = toggleTheme;
window.setTheme = setTheme;
window.getCurrentTheme = getCurrentTheme;

initTheme();

(function () {
  var k = "gf_theme",
    s = null;
  try {
    s = localStorage.getItem(k);
  } catch (e) {}
  var theme =
    s === "light" || s === "dark"
      ? s
      : window.matchMedia &&
          window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
  document.documentElement.setAttribute("data-theme", theme);
})();
