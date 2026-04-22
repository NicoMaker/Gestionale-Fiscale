// ═══════════════════════════════════════════════════════════════
// NAV.JS — Navigazione e routing tra le pagine
// ═══════════════════════════════════════════════════════════════

// ─── SEARCHABLE SELECT HELPER ─────────────────────────────────
function initSearchableSelect(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel || sel.dataset.ssinit) return;
  sel.dataset.ssinit = "1";
  sel.style.display = "none";

  const wrap = document.createElement("div");
  wrap.className = "ss-wrap";
  wrap.style.cssText = `position:relative;display:inline-block;min-width:${sel.style.minWidth || "160px"};max-width:${sel.style.maxWidth || "260px"};width:${sel.style.width || "auto"}`;
  sel.parentNode.insertBefore(wrap, sel);
  wrap.appendChild(sel);

  const trigger = document.createElement("div");
  trigger.className = "ss-trigger input topbar-select";
  trigger.style.cssText = `display:flex;align-items:center;justify-content:space-between;gap:6px;cursor:pointer;user-select:none;padding:7px 12px;font-size:13px;width:100%;box-sizing:border-box`;
  trigger.innerHTML = `<span class="ss-trigger-label" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1">${sel.options[sel.selectedIndex]?.text || "-- Seleziona --"}</span><span style="font-size:10px;opacity:0.5;flex-shrink:0">▼</span>`;
  wrap.insertBefore(trigger, sel);

  const panel = document.createElement("div");
  panel.className = "ss-panel";
  panel.style.cssText = `display:none;position:absolute;top:calc(100% + 4px);left:0;right:0;z-index:9999;background:var(--surface2);border:1px solid var(--border2);border-radius:var(--r-sm);box-shadow:0 12px 40px rgba(0,0,0,0.6);overflow:hidden`;
  wrap.appendChild(panel);

  const searchInput = document.createElement("input");
  searchInput.placeholder = "🔍 Cerca...";
  searchInput.style.cssText = `width:100%;padding:9px 14px;background:var(--surface3);border:none;border-bottom:1px solid var(--border);color:var(--text);font-family:var(--sans);font-size:13px;outline:none;box-sizing:border-box`;
  panel.appendChild(searchInput);

  const list = document.createElement("div");
  list.style.cssText = `max-height:280px;overflow-y:auto`;
  panel.appendChild(list);

  function getAllOptions() {
    return Array.from(sel.options).map(o => ({ value: o.value, text: o.text }));
  }

  function renderList(q) {
    const opts = getAllOptions();
    const filtered = q ? opts.filter(o => o.text.toLowerCase().includes(q.toLowerCase())) : opts;
    list.innerHTML = "";
    if (!filtered.length) {
      list.innerHTML = `<div style="padding:14px;text-align:center;color:var(--text3);font-size:13px">Nessun risultato</div>`;
      return;
    }
    filtered.forEach(o => {
      const item = document.createElement("div");
      item.className = "ss-item";
      item.dataset.value = o.value;
      const isSelected = String(o.value) === String(sel.value);
      item.style.cssText = `padding:9px 14px;cursor:pointer;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:background 0.1s;${isSelected ? "background:var(--accent-dim);color:var(--accent);font-weight:700" : ""}`;
      item.textContent = o.text;
      item.addEventListener("mouseover", () => { if (!isSelected) item.style.background = "var(--surface3)"; });
      item.addEventListener("mouseout",  () => { if (!isSelected) item.style.background = ""; });
      item.addEventListener("click", () => {
        sel.value = o.value;
        sel.dispatchEvent(new Event("change", { bubbles: true }));
        trigger.querySelector(".ss-trigger-label").textContent = o.text;
        closePanel();
      });
      list.appendChild(item);
    });
  }

  function openPanel() {
    panel.style.display = "block";
    searchInput.value = "";
    renderList("");
    setTimeout(() => searchInput.focus(), 30);
    trigger.style.borderColor = "var(--accent)";
    trigger.querySelector("span:last-child").textContent = "▲";
  }

  function closePanel() {
    panel.style.display = "none";
    trigger.style.borderColor = "";
    trigger.querySelector("span:last-child").textContent = "▼";
  }

  trigger.addEventListener("click", e => { e.stopPropagation(); panel.style.display === "none" ? openPanel() : closePanel(); });
  searchInput.addEventListener("input", () => renderList(searchInput.value));
  searchInput.addEventListener("keydown", e => { if (e.key === "Escape") closePanel(); });
  document.addEventListener("click", e => { if (!wrap.contains(e.target)) closePanel(); });

  sel._ssRefresh = function() {
    const opt = sel.options[sel.selectedIndex];
    if (opt) trigger.querySelector(".ss-trigger-label").textContent = opt.text;
  };
}

// ─── INIT NAV ─────────────────────────────────────────────────
function initNav() {
  document.querySelectorAll(".nav-item").forEach(el => {
    if (el.dataset.page)
      el.addEventListener("click", () => {
        document.querySelectorAll(".nav-item").forEach(x => x.classList.remove("active"));
        el.classList.add("active");
        renderPage(el.dataset.page);
      });
  });

  document.getElementById("btn-scarica-db")?.addEventListener("click", e => {
    e.stopPropagation();
    scaricaDatabase();
  });

  document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", e => { if (e.target === overlay) overlay.classList.remove("open"); });
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape")
      document.querySelectorAll(".modal-overlay.open").forEach(m => m.classList.remove("open"));
  });
}

// ─── RENDER PAGE ──────────────────────────────────────────────
function renderPage(page) {
  state.page = page;
  state._dashRendered = false;
  scrollToTop();

  const titles = {
    dashboard:          "Dashboard",
    clienti:            "Clienti",
    scadenzario:        "Scadenzario Cliente",
    scadenzario_globale:"Vista Globale",
    adempimenti:        "Adempimenti Fiscali",
    tipologie:          "Tipologie Clienti",
  };
  document.getElementById("page-title").textContent = titles[page] || page;

  if (page === "dashboard") {
    document.getElementById("topbar-actions").innerHTML = `
      <div class="year-sel">
        <button onclick="changeAnno(-1)" title="Anno precedente">&#9664;</button>
        <span class="year-num">${state.anno}</span>
        <button onclick="changeAnno(1)" title="Anno successivo">&#9654;</button>
      </div>
      <button class="btn btn-sm" style="background:var(--accent-dim);color:var(--accent);border:1px solid rgba(91,141,246,0.3);font-size:13px" onclick="setDashCat('tutti')" title="Mostra tutti">📋 Tutti</button>
      <button class="btn btn-orange btn-sm no-print" onclick="openGeneraTutti()" style="font-size:13px">⚡ Genera Tutti</button>
      <button class="btn btn-cyan btn-sm no-print"   onclick="openCopiaTutti()" style="font-size:13px">📋 Copia Anno</button>
      <button class="btn btn-print btn-sm"           onclick="window.print()" style="font-size:13px">🖨️ Stampa</button>`;
    socket.emit("get:stats", { anno: state.anno });

  } else if (page === "clienti") {
    state._pending = "clienti";
    document.getElementById("topbar-actions").innerHTML = `
      <div class="search-wrap" style="width:280px">
        <span class="search-icon">🔍</span>
        <input class="input" id="global-search-clienti" placeholder="Cerca nome, CF, P.IVA, email..." oninput="applyClientiFiltri()" style="font-size:13px">
      </div>
      <button class="btn btn-sm btn-primary" onclick="resetClientiFiltri()" style="font-size:13px">⟳ Tutti</button>
      <button class="btn btn-print btn-sm no-print" onclick="window.print()" style="font-size:13px">🖨️ Stampa</button>
      <button class="btn btn-primary no-print" onclick="openNuovoCliente()" style="font-size:13px">+ Nuovo Cliente</button>`;
    socket.emit("get:clienti");

  } else if (page === "scadenzario") {
    state._pending = "scadenzario";
    document.getElementById("topbar-actions").innerHTML = "";
    socket.emit("get:clienti");

  } else if (page === "scadenzario_globale") {
    renderGlobalePage();

  } else if (page === "adempimenti") {
    state._pending = "adempimenti";
    // ⭐ Topbar senza filtro categoria — solo ricerca testo
    document.getElementById("topbar-actions").innerHTML = `
      <div class="search-wrap" style="width:300px">
        <span class="search-icon">🔍</span>
        <input class="input" id="global-search-adempimenti" placeholder="Cerca codice o nome..." oninput="applyAdempimentiFiltriSearch()" style="font-size:13px">
      </div>
      <button class="btn btn-sm btn-primary" onclick="resetAdempimentiFiltri()" style="font-size:13px">⟳ Tutti</button>
      <button class="btn btn-primary no-print" onclick="openNuovoAdpDef()" style="font-size:13px">+ Nuovo</button>`;
    socket.emit("get:adempimenti");

  } else if (page === "tipologie") {
    document.getElementById("topbar-actions").innerHTML = "";
    renderTipologiePage();
  }
}

function refreshPage() { renderPage(state.page); }

function changeAnno(d) {
  state.anno += d;
  document.querySelectorAll(".year-num").forEach(el => (el.textContent = state.anno));
  if (state.page === "dashboard") {
    state._dashRendered = false;
    socket.emit("get:stats", { anno: state.anno });
  }
}
