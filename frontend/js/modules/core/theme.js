// ═══════════════════════════════════════════════════════════════
// THEME.JS — Gestione tema chiaro/scuro
// ═══════════════════════════════════════════════════════════════

const THEME_KEY = "gf_theme";

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
  if (iconEl) {
    const iconName = theme === "dark" ? "sun" : "moon";
    iconEl.innerHTML = `<i data-lucide="${iconName}"></i>`;
    if (typeof refreshIcons === "function") refreshIcons(iconEl);
  }
  if (labelEl) {
    labelEl.textContent = theme === "dark" ? "Tema Chiaro" : "Tema Scuro";
  }
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
