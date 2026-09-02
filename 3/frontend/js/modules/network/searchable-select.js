// ═══════════════════════════════════════════════════════════════
// SEARCHABLE-SELECT.JS — Widget select ricercabile (singolo e multiplo)
// ═══════════════════════════════════════════════════════════════

// NAV.JS — Navigazione, routing e searchable select
// (versione responsive con supporto hamburger mobile)
// ═══════════════════════════════════════════════════════════════

// ─── SEARCHABLE SELECT ────────────────────────────────────────
function initSearchableSelect(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel || sel.dataset.ssinit) return;
  sel.dataset.ssinit = "1";
  sel.style.display = "none";

  const wrap = document.createElement("div");
  wrap.className = "ss-wrap";
  wrap.style.cssText = [
    "position:relative",
    "display:inline-block",
    `min-width:${sel.style.minWidth || "160px"}`,
    `max-width:${sel.style.maxWidth || "260px"}`,
    `width:${sel.style.width || "auto"}`,
  ].join(";");
  sel.parentNode.insertBefore(wrap, sel);
  wrap.appendChild(sel);

  const trigger = document.createElement("div");
  trigger.className = "ss-trigger input topbar-select";
  trigger.setAttribute("tabindex", "0");
  trigger.setAttribute("role", "combobox");
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.innerHTML = `<span class="ss-trigger-label">${sel.options[sel.selectedIndex]?.text || "-- Seleziona --"}</span><span class="ss-arrow" style="font-size:10px;opacity:0.5;flex-shrink:0;transition:transform 0.15s">▼</span>`;
  wrap.insertBefore(trigger, sel);

  const panel = document.createElement("div");
  panel.className = "ss-panel";
  panel.setAttribute("role", "listbox");
  wrap.appendChild(panel);

  const searchInput = document.createElement("input");
  searchInput.placeholder = "🔍 Cerca...";
  searchInput.setAttribute("type", "text");
  searchInput.setAttribute("aria-label", "Cerca opzione");
  panel.appendChild(searchInput);

  const list = document.createElement("div");
  list.style.maxHeight = "280px";
  list.style.overflowY = "auto";
  panel.appendChild(list);

  function getAllOptions() {
    return Array.from(sel.options).map((o) => ({
      value: o.value,
      text: o.text,
    }));
  }
  function renderList(q) {
    const opts = getAllOptions();
    const filtered = q
      ? opts.filter((o) => o.text.toLowerCase().includes(q.toLowerCase()))
      : opts;
    list.innerHTML = "";
    if (!filtered.length) {
      list.innerHTML = `<div style="padding:14px;text-align:center;color:var(--t3);font-size:13px">Nessun risultato</div>`;
      return;
    }
    const frag = document.createDocumentFragment();
    filtered.forEach((o) => {
      const item = document.createElement("div");
      item.className =
        "ss-item" +
        (String(o.value) === String(sel.value) ? " ss-selected" : "");
      item.dataset.value = o.value;
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", String(o.value) === String(sel.value));
      item.textContent = o.text;
      item.addEventListener("click", () => {
        sel.value = o.value;
        sel.dispatchEvent(new Event("change", { bubbles: true }));
        trigger.querySelector(".ss-trigger-label").textContent = o.text;
        closePanel();
      });
      frag.appendChild(item);
    });
    list.appendChild(frag);
  }

  function openPanel() {
    document.querySelectorAll(".ss-panel[data-open]").forEach((p) => {
      if (p !== panel) _closeOtherPanel(p);
    });
    panel.style.display = "block";
    panel.dataset.open = "1";
    trigger.setAttribute("aria-expanded", "true");
    trigger.querySelector(".ss-arrow").style.transform = "rotate(180deg)";
    trigger.style.borderColor = "var(--accent)";
    searchInput.value = "";
    renderList("");
    requestAnimationFrame(() => {
      const wrapRect = wrap.getBoundingClientRect();
      const panelH = panel.offsetHeight;
      const spaceDown = window.innerHeight - wrapRect.bottom;
      if (spaceDown < panelH && wrapRect.top > panelH) {
        panel.style.top = "auto";
        panel.style.bottom = "calc(100% + 4px)";
      } else {
        panel.style.top = "calc(100% + 4px)";
        panel.style.bottom = "auto";
      }
      searchInput.focus();
    });
  }

  function closePanel() {
    panel.style.display = "none";
    delete panel.dataset.open;
    trigger.setAttribute("aria-expanded", "false");
    trigger.querySelector(".ss-arrow").style.transform = "rotate(0deg)";
    trigger.style.borderColor = "";
  }

  function _closeOtherPanel(p) {
    p.style.display = "none";
    delete p.dataset.open;
    const ow = p.closest(".ss-wrap");
    if (ow) {
      const ot = ow.querySelector(".ss-trigger");
      if (ot) {
        ot.setAttribute("aria-expanded", "false");
        const arr = ot.querySelector(".ss-arrow");
        if (arr) arr.style.transform = "rotate(0deg)";
        ot.style.borderColor = "";
      }
    }
  }

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    panel.style.display === "none" ? openPanel() : closePanel();
  });
  trigger.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      panel.style.display === "none" ? openPanel() : closePanel();
    }
  });
  searchInput.addEventListener("input", () => renderList(searchInput.value));
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closePanel();
      trigger.focus();
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const items = list.querySelectorAll(".ss-item");
      const focused = list.querySelector(".ss-item:focus");
      let idx = focused ? Array.from(items).indexOf(focused) : -1;
      idx =
        e.key === "ArrowDown"
          ? Math.min(idx + 1, items.length - 1)
          : Math.max(idx - 1, 0);
      if (items[idx]) items[idx].focus();
    }
  });
  document.addEventListener("click", (e) => {
    const filtroPanel = e.target.closest(
      '.tip-filtro-panel, #tip-filtro-panel, #dash-tip-filtro-panel, #glob-tip-filtro-panel, [id*="tip-filtro-container"]',
    );
    if (!wrap.contains(e.target) && !filtroPanel) closePanel();
  });
  sel._ssRefresh = function () {
    const opt = sel.options[sel.selectedIndex];
    if (opt) trigger.querySelector(".ss-trigger-label").textContent = opt.text;
    if (panel.dataset.open) renderList(searchInput.value);
  };
}

// ─── SELECT MULTIPLO RICERCABILE (checkbox, non si chiude al click) ───
// Usato ovunque si debba scegliere PIÙ DI UN adempimento da un elenco
// (es. filtro adempimenti nello scadenzario cliente).
// opts.showSearch = false → nasconde la barra "🔍 Cerca..." interna al
// pannello (usato es. per il selettore multiplo di clienti).
// opts.placeholder → testo mostrato nel trigger quando nulla è selezionato.
function initSearchableMultiSelect(selectId, opts) {
  opts = opts || {};
  const showSearch = opts.showSearch !== false;
  const sel = document.getElementById(selectId);
  if (!sel || sel.dataset.ssinit) return;
  sel.dataset.ssinit = "1";
  sel.multiple = true;
  sel.style.display = "none";
  if (opts.placeholder) sel.dataset.placeholder = opts.placeholder;

  const wrap = document.createElement("div");
  wrap.className = "ss-wrap";
  wrap.style.cssText = [
    "position:relative",
    "display:inline-block",
    `min-width:${sel.style.minWidth || "160px"}`,
    `max-width:${sel.style.maxWidth || "260px"}`,
    `width:${sel.style.width || "auto"}`,
  ].join(";");
  sel.parentNode.insertBefore(wrap, sel);
  wrap.appendChild(sel);

  const trigger = document.createElement("div");
  trigger.className = "ss-trigger input topbar-select";
  trigger.setAttribute("tabindex", "0");
  trigger.setAttribute("role", "combobox");
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.innerHTML = `<span class="ss-trigger-label"></span><span class="ss-arrow" style="font-size:10px;opacity:0.5;flex-shrink:0;transition:transform 0.15s">▼</span>`;
  wrap.insertBefore(trigger, sel);

  const panel = document.createElement("div");
  panel.className = "ss-panel";
  panel.setAttribute("role", "listbox");
  panel.setAttribute("aria-multiselectable", "true");
  wrap.appendChild(panel);

  let searchInput = null;
  if (showSearch) {
    searchInput = document.createElement("input");
    searchInput.placeholder = "🔍 Cerca...";
    searchInput.setAttribute("type", "text");
    searchInput.setAttribute("aria-label", "Cerca opzione");
    panel.appendChild(searchInput);
  }

  const actionsRow = document.createElement("div");
  actionsRow.style.cssText =
    "display:flex;gap:6px;padding:6px 10px;border-bottom:1px solid var(--b1)";
  actionsRow.innerHTML =
    '<button type="button" class="btn btn-xs ss-ms-btn" data-ms-all style="font-size:11px;flex:1">✅ Tutti</button>' +
    '<button type="button" class="btn btn-xs ss-ms-btn" data-ms-none style="font-size:11px;flex:1">✕ Nessuno</button>';
  panel.appendChild(actionsRow);
  const btnAll = actionsRow.querySelector("[data-ms-all]");
  const btnNone = actionsRow.querySelector("[data-ms-none]");

  function updateActionsState() {
    const total = sel.options.length;
    const selectedCount = sel.selectedOptions.length;
    btnAll.classList.toggle(
      "ss-ms-active",
      total > 0 && selectedCount === total,
    );
    btnNone.classList.toggle("ss-ms-active", selectedCount === 0);
  }

  const list = document.createElement("div");
  list.style.maxHeight = "240px";
  list.style.overflowY = "auto";
  panel.appendChild(list);

  function getAllOptions() {
    return Array.from(sel.options).map((o) => ({
      value: o.value,
      text: o.text,
    }));
  }
  function getSelectedValues() {
    return Array.from(sel.selectedOptions).map((o) => o.value);
  }
  function updateLabel() {
    const selected = Array.from(sel.selectedOptions);
    const label = trigger.querySelector(".ss-trigger-label");
    if (selected.length === 0) {
      label.textContent = sel.dataset.placeholder || "-- Tutti --";
    } else if (selected.length === 1) {
      label.textContent = selected[0].text;
    } else {
      label.textContent = selected.length + " selezionati";
    }
  }
  function renderList(q) {
    const opts = getAllOptions();
    const selectedVals = new Set(getSelectedValues());
    const filtered = q
      ? opts.filter((o) => o.text.toLowerCase().includes(q.toLowerCase()))
      : opts;
    list.innerHTML = "";
    if (!filtered.length) {
      list.innerHTML = `<div style="padding:14px;text-align:center;color:var(--t3);font-size:13px">Nessun risultato</div>`;
      return;
    }
    const frag = document.createDocumentFragment();
    filtered.forEach((o) => {
      const item = document.createElement("div");
      item.className =
        "ss-item" + (selectedVals.has(o.value) ? " ss-selected" : "");
      item.style.cssText = "display:flex;align-items:center;gap:8px";
      item.dataset.value = o.value;
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", String(selectedVals.has(o.value)));
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = selectedVals.has(o.value);
      cb.style.cssText = "pointer-events:none;margin:0;flex-shrink:0";
      const txt = document.createElement("span");
      txt.textContent = o.text;
      item.appendChild(cb);
      item.appendChild(txt);
      item.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const opt = Array.from(sel.options).find((x) => x.value === o.value);
        if (!opt) return;
        opt.selected = !opt.selected;
        cb.checked = opt.selected;
        item.classList.toggle("ss-selected", opt.selected);
        item.setAttribute("aria-selected", String(opt.selected));
        updateLabel();
        updateActionsState();
        sel.dispatchEvent(new Event("change", { bubbles: true }));
      });
      frag.appendChild(item);
    });
    list.appendChild(frag);
    updateActionsState();
  }

  function openPanel() {
    document.querySelectorAll(".ss-panel[data-open]").forEach((p) => {
      if (p !== panel) _closeOtherPanel(p);
    });
    panel.style.display = "block";
    panel.dataset.open = "1";
    trigger.setAttribute("aria-expanded", "true");
    trigger.querySelector(".ss-arrow").style.transform = "rotate(180deg)";
    trigger.style.borderColor = "var(--accent)";
    if (searchInput) searchInput.value = "";
    renderList("");
    requestAnimationFrame(() => {
      const wrapRect = wrap.getBoundingClientRect();
      const panelH = panel.offsetHeight;
      const spaceDown = window.innerHeight - wrapRect.bottom;
      if (spaceDown < panelH && wrapRect.top > panelH) {
        panel.style.top = "auto";
        panel.style.bottom = "calc(100% + 4px)";
      } else {
        panel.style.top = "calc(100% + 4px)";
        panel.style.bottom = "auto";
      }
      if (searchInput) searchInput.focus();
    });
  }

  function closePanel() {
    panel.style.display = "none";
    delete panel.dataset.open;
    trigger.setAttribute("aria-expanded", "false");
    trigger.querySelector(".ss-arrow").style.transform = "rotate(0deg)";
    trigger.style.borderColor = "";
  }

  function _closeOtherPanel(p) {
    p.style.display = "none";
    delete p.dataset.open;
    const ow = p.closest(".ss-wrap");
    if (ow) {
      const ot = ow.querySelector(".ss-trigger");
      if (ot) {
        ot.setAttribute("aria-expanded", "false");
        const arr = ot.querySelector(".ss-arrow");
        if (arr) arr.style.transform = "rotate(0deg)";
        ot.style.borderColor = "";
      }
    }
  }

  actionsRow.querySelector("[data-ms-all]").addEventListener("click", (e) => {
    e.stopPropagation();
    Array.from(sel.options).forEach((o) => (o.selected = true));
    updateLabel();
    renderList(searchInput ? searchInput.value : "");
    updateActionsState();
    sel.dispatchEvent(new Event("change", { bubbles: true }));
  });
  actionsRow.querySelector("[data-ms-none]").addEventListener("click", (e) => {
    e.stopPropagation();
    Array.from(sel.options).forEach((o) => (o.selected = false));
    updateLabel();
    renderList(searchInput ? searchInput.value : "");
    updateActionsState();
    sel.dispatchEvent(new Event("change", { bubbles: true }));
  });

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    panel.style.display === "none" ? openPanel() : closePanel();
  });
  trigger.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      panel.style.display === "none" ? openPanel() : closePanel();
    }
    if (e.key === "Escape") closePanel();
  });
  if (searchInput) {
    searchInput.addEventListener("input", () => renderList(searchInput.value));
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closePanel();
        trigger.focus();
      }
    });
  }
  document.addEventListener("click", (e) => {
    if (!wrap.contains(e.target)) closePanel();
  });

  sel._ssRefresh = function () {
    updateLabel();
    updateActionsState();
    if (panel.dataset.open) renderList(searchInput ? searchInput.value : "");
  };
  updateLabel();
  updateActionsState();
}

// Codice a livello di modulo
window.initSearchableSelect = initSearchableSelect;
window.initSearchableMultiSelect = initSearchableMultiSelect;
