// ═══════════════════════════════════════════════════════════════
// NAV.JS — Navigazione, routing pagine e cambio anno
// ═══════════════════════════════════════════════════════════════


// ─── INIT NAV ─────────────────────────────────────────────────
function initNav() {
  document.querySelectorAll(".nav-item").forEach((el) => {
    if (!el.dataset.page) return;
    el.addEventListener("click", () => {
      document
        .querySelectorAll(".nav-item")
        .forEach((x) => x.classList.remove("active"));
      el.classList.add("active");
      renderPage(el.dataset.page);
      if (window.mobileSidebar && window.mobileSidebar.isOpen())
        window.mobileSidebar.close();
    });
  });

  document.getElementById("btn-scarica-db")?.addEventListener("click", (e) => {
    e.stopPropagation();
    scaricaDatabase();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape")
      document
        .querySelectorAll(".modal-overlay.open")
        .forEach((m) => m.classList.remove("open"));
  });

  setupDecimalInputs();
}


// ─── RENDER PAGE ──────────────────────────────────────────────
function renderPage(page) {
  state.page = page;
  state._dashRendered = false;
  scrollToTop();

  // Reset pill bulk selection on page change
  if (
    typeof disattivaModalitaSelezione === "function" &&
    typeof _pillBulkAttivo !== "undefined" &&
    _pillBulkAttivo
  ) {
    disattivaModalitaSelezione();
  }

  const titles = {
    dashboard: "Dashboard",
    clienti: "Clienti",
    scadenzario: "Scadenzario Cliente",
    scadenzario_globale: "Vista Globale",
    adempimenti: "Adempimenti Fiscali",
    tipologie: "Tipologie Clienti",
    appunti: "Scadenze Studio",
  };
  document.getElementById("page-title").textContent = titles[page] || page;

  document.querySelectorAll(".nav-item").forEach((el) => {
    el.setAttribute(
      "aria-current",
      el.dataset.page === page ? "page" : "false",
    );
  });

  if (page === "dashboard") {
    document.getElementById("topbar-actions").innerHTML =
      `<div class="year-sel"><button onclick="changeAnno(-1)" title="Anno precedente">&#9664;</button><span class="year-num">${state.anno}</span><button onclick="changeAnno(1)" title="Anno successivo">&#9654;</button></div><button class="btn btn-sm" style="background:var(--accent-d);color:var(--accent);border:1px solid rgba(91,141,246,0.3);font-size:13px" onclick="setDashCat('tutti')" title="Mostra tutti">📋 Tutti</button><button class="btn btn-cyan btn-sm no-print" onclick="openCopiaTutti()" style="font-size:13px">📋 Copia</button><button class="btn btn-print btn-sm" onclick="window.print()" style="font-size:13px">🖨️</button>`;
    socket.emit("get:stats", { anno: state.anno });
  } else if (page === "clienti") {
    state._pending = "clienti";
    document.getElementById("topbar-actions").innerHTML =
      `<div class="search-wrap" style="width:240px"><span class="search-icon">🔍</span><input class="input" id="global-search-clienti" placeholder="Cerca nome, CF, P.IVA…" oninput="applyClientiFiltri()" style="font-size:13px"></div><button class="btn btn-sm btn-primary" onclick="resetClientiFiltri()" style="font-size:13px">⟳</button><button class="btn btn-print btn-sm no-print" onclick="window.print()" style="font-size:13px">🖨️</button><button class="btn btn-primary no-print" onclick="openNuovoCliente()" style="font-size:13px">+ Cliente</button>`;
    setTimeout(() => {
      if (typeof applyClientiFiltriImmediate === "function")
        applyClientiFiltriImmediate();
      else {
        const anno =
          parseInt(document.getElementById("filter-anno")?.value) ||
          new Date().getFullYear();
        socket.emit("get:clienti", { anno });
      }
    }, 50);
  } else if (page === "scadenzario") {
    state._pending = "scadenzario";
    document.getElementById("topbar-actions").innerHTML = "";
    socket.emit("get:clienti");
  } else if (page === "scadenzario_globale") {
    renderGlobalePage();
  } else if (page === "adempimenti") {
    state._pending = "adempimenti";
    document.getElementById("topbar-actions").innerHTML =
      `<div class="search-wrap" style="width:260px"><span class="search-icon">🔍</span><input class="input" id="global-search-adempimenti" placeholder="Cerca codice o nome…" oninput="applyAdempimentiFiltriSearch()" style="font-size:13px"></div><button class="btn btn-sm btn-primary" onclick="resetAdempimentiFiltri()" style="font-size:13px">⟳</button><button class="btn btn-primary no-print" onclick="openNuovoAdpDef()" style="font-size:13px">+ Nuovo</button>`;
    socket.emit("get:adempimenti");
  } else if (page === "tipologie") {
    document.getElementById("topbar-actions").innerHTML = "";
    renderTipologiePage();
  } else if (page === "appunti") {
    // ═══ PAGINA APPUNTI ═══
    document.getElementById("topbar-actions").innerHTML = "";
    if (typeof renderAppuntiPage === "function") {
      renderAppuntiPage();
    } else {
      console.error("❌ renderAppuntiPage non definita!");
      document.getElementById("content").innerHTML =
        `<div class="empty"><div class="empty-icon">❌</div><p>Errore: modulo appunti non caricato</p><button class="btn btn-primary" onclick="location.reload()">⟳ Ricarica</button></div>`;
    }
  }
}


function refreshPage() {
  renderPage(state.page);
}


function changeAnno(d) {
  state.anno += d;
  document
    .querySelectorAll(".year-num")
    .forEach((el) => (el.textContent = state.anno));
  if (state.page === "dashboard") {
    state._dashRendered = false;
    socket.emit("get:stats", { anno: state.anno });
  }
}


function setupDecimalInputs() {
  document.querySelectorAll('input[type="number"]').forEach(setupDecimalInput);
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.tagName === "INPUT" && node.type === "number")
            setupDecimalInput(node);
          if (node.querySelectorAll)
            node
              .querySelectorAll('input[type="number"]')
              .forEach(setupDecimalInput);
        }
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

// Codice a livello di modulo
window.initNav = initNav;
window.renderPage = renderPage;
window.refreshPage = refreshPage;
window.changeAnno = changeAnno;
window.setupDecimalInputs = setupDecimalInputs;
