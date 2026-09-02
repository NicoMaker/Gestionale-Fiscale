// ═══════════════════════════════════════════════════════════════
// BOTTOM-NAV.JS — Navigazione rapida mobile (bottom bar)
// ═══════════════════════════════════════════════════════════════

(function () {
  "use strict";

  function setActive(page) {
    document.querySelectorAll(".bn-item").forEach(function (b) {
      b.classList.remove("active");
    });
    const bn = document.querySelector('.bn-item[data-page="' + page + '"]');
    if (bn) bn.classList.add("active");
  }

  function handleBnClick(el, page) {
    const navItem = document.querySelector(
      '.nav-item[data-page="' + page + '"]',
    );
    if (navItem) navItem.click();
    setActive(page);
  }

  function init() {
    // Sync bottom nav when sidebar nav items are clicked
    document.querySelectorAll(".nav-item[data-page]").forEach(function (item) {
      item.addEventListener("click", function () {
        setActive(this.getAttribute("data-page"));
      });
    });

    // Set initial active state from sidebar
    const activeSidebarItem = document.querySelector(
      ".nav-item.active[data-page]",
    );
    if (activeSidebarItem) {
      setActive(activeSidebarItem.getAttribute("data-page"));
    }
  }

  // Expose click handler globally (called from HTML onclick)
  window.handleBnClick = handleBnClick;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
