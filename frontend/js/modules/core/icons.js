// ═══════════════════════════════════════════════════════════════
// ICONS.JS — Lucide icons helper
// ═══════════════════════════════════════════════════════════════

/**
 * Re-renderizza tutte le icone Lucide nel DOM.
 * Chiamare dopo ogni aggiornamento dinamico del contenuto.
 */
function refreshIcons(root) {
  if (typeof lucide === "undefined" || !lucide.createIcons) return;
  try {
    lucide.createIcons({
      attrs: {
        "stroke-width": "2",
        "aria-hidden": "true",
      },
      root: root || document,
    });
  } catch (_) {}
}

window.refreshIcons = refreshIcons;
