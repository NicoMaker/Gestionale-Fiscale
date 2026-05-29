// ═══════════════════════════════════════════════════════════════
// FIELD-HISTORY.JS — Frecce ◀ ▶ per navigare la cronologia di
//                    ogni campo nei form modali.
//
// Regole salvataggio:
//   • Blur reale (tab, clic fuori) → salva
//   • Bottone "Salva" del form     → salva
//   • Invio                        → NON salva
//
// Contatore:
//   • Mostra solo i valori salvati in storia: "2/3"
//   • Quando sei sul valore live (non in navigazione) il
//     contatore è nascosto oppure mostra solo il totale
// ═══════════════════════════════════════════════════════════════

(function () {
  "use strict";

  const MAX_HISTORY = 20;
  const STORAGE_KEY = "fh_v1";

  // ── STORAGE ─────────────────────────────────────────────────
  let _db = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) _db = JSON.parse(raw);
  } catch (_) {
    _db = {};
  }

  function _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(_db));
    } catch (_) {}
  }

  function _key(modalId, fieldId) {
    return modalId + "__" + fieldId;
  }

  function _getHistory(modalId, fieldId) {
    return _db[_key(modalId, fieldId)] || [];
  }

  function _pushValue(modalId, fieldId, value) {
    if (!value || !value.trim()) return;
    const k = _key(modalId, fieldId);
    const arr = _db[k] || [];
    if (arr[arr.length - 1] === value) return;
    const filtered = arr.filter(function (v) {
      return v !== value;
    });
    filtered.push(value);
    if (filtered.length > MAX_HISTORY) filtered.shift();
    _db[k] = filtered;
    _save();
  }

  // ── STATO NAVIGAZIONE ───────────────────────────────────────
  // idx === history.length  →  siamo sul valore "live" (non in navigazione)
  // idx < history.length    →  siamo su un valore storico
  const _nav = new WeakMap();

  function _initNav(el, modalId, fieldId) {
    // non reinizializzare se già presente (evita reset dell'idx durante navigazione)
    if (_nav.has(el)) return;
    const h = _getHistory(modalId, fieldId);
    _nav.set(el, {
      modalId: modalId,
      fieldId: fieldId,
      idx: h.length,
      liveValue: undefined,
    });
  }

  function _resetNavToLive(el) {
    const state = _nav.get(el);
    if (!state) return;
    const h = _getHistory(state.modalId, state.fieldId);
    state.idx = h.length;
    state.liveValue = undefined;
    _nav.set(el, state);
  }

  // ── FLAG INVIO ───────────────────────────────────────────────
  const _enterPressed = new WeakSet();

  // ── NAVIGAZIONE ─────────────────────────────────────────────
  function _navigate(el, direction) {
    const state = _nav.get(el);
    if (!state) return;
    const history = _getHistory(state.modalId, state.fieldId);
    if (history.length === 0) {
      _flashEmpty(el);
      return;
    }

    // prima di andare indietro, salva il valore live corrente
    if (state.idx === history.length && direction === -1) {
      state.liveValue = el.value;
    }

    let newIdx = state.idx + direction;
    if (newIdx < 0) newIdx = 0;
    if (newIdx > history.length) newIdx = history.length;
    state.idx = newIdx;
    _nav.set(el, state);

    if (newIdx === history.length) {
      // torna al live
      el.value = state.liveValue !== undefined ? state.liveValue : "";
    } else {
      el.value = history[newIdx];
    }

    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    _updateButtons(el);
    _flashField(el);
  }

  function _flashField(el) {
    el.classList.add("fh-flash");
    setTimeout(function () {
      el.classList.remove("fh-flash");
    }, 350);
  }
  function _flashEmpty(el) {
    el.classList.add("fh-flash-empty");
    setTimeout(function () {
      el.classList.remove("fh-flash-empty");
    }, 400);
  }

  // ── UI BUTTONS ──────────────────────────────────────────────
  function _injectButtons(el, modalId, fieldId) {
    const group = el.closest(".form-group");
    if (!group) return;
    if (group.querySelector(".fh-wrap")) return;

    const wrap = document.createElement("div");
    wrap.className = "fh-wrap";
    el.parentNode.insertBefore(wrap, el);
    wrap.appendChild(el);

    const btnBack = document.createElement("button");
    btnBack.type = "button";
    btnBack.className = "fh-btn fh-btn-back";
    btnBack.title = "Valore precedente (Alt+\u2191)";
    btnBack.innerHTML = "&#9664;";
    btnBack.setAttribute("tabindex", "-1");

    const counter = document.createElement("span");
    counter.className = "fh-counter";

    const btnFwd = document.createElement("button");
    btnFwd.type = "button";
    btnFwd.className = "fh-btn fh-btn-fwd";
    btnFwd.title = "Valore successivo (Alt+\u2193)";
    btnFwd.innerHTML = "&#9654;";
    btnFwd.setAttribute("tabindex", "-1");

    wrap.appendChild(btnBack);
    wrap.appendChild(counter);
    wrap.appendChild(btnFwd);

    btnBack.addEventListener("mousedown", function (e) {
      e.preventDefault();
      _navigate(el, -1);
    });
    btnFwd.addEventListener("mousedown", function (e) {
      e.preventDefault();
      _navigate(el, +1);
    });
    btnBack.addEventListener(
      "touchstart",
      function (e) {
        e.preventDefault();
        _navigate(el, -1);
      },
      { passive: false },
    );
    btnFwd.addEventListener(
      "touchstart",
      function (e) {
        e.preventDefault();
        _navigate(el, +1);
      },
      { passive: false },
    );

    _updateButtons(el);
  }

  function _updateButtons(el) {
    const group = el.closest(".form-group");
    if (!group) return;
    const wrap = group.querySelector(".fh-wrap");
    if (!wrap) return;
    const state = _nav.get(el);
    if (!state) return;
    const history = _getHistory(state.modalId, state.fieldId);
    const total = history.length; // solo valori salvati

    const btnBack = wrap.querySelector(".fh-btn-back");
    const btnFwd = wrap.querySelector(".fh-btn-fwd");
    const counter = wrap.querySelector(".fh-counter");

    const onLive = state.idx === total;
    const canBack = state.idx > 0;
    // puoi andare avanti solo se sei su un valore storico (non già sul live)
    const canFwd = !onLive && state.idx < total;

    btnBack.disabled = !canBack;
    btnFwd.disabled = !canFwd;
    btnBack.classList.toggle("fh-btn-active", canBack);
    btnFwd.classList.toggle("fh-btn-active", canFwd);

    if (total === 0 || onLive) {
      // nessuna navigazione attiva: mostra solo il totale se > 0
      if (total > 0) {
        counter.textContent = String(total);
        counter.title = total + " valori salvati per questo campo";
        counter.style.display = "";
      } else {
        counter.style.display = "none";
      }
    } else {
      // in navigazione: mostra posizione sul totale salvato  es. "2/3"
      const pos = state.idx + 1;
      counter.textContent = pos + "/" + total;
      counter.title = "Valore " + pos + " di " + total + " salvati";
      counter.style.display = "";
    }
  }

  // ── FOCUS ───────────────────────────────────────────────────
  function _onFocus(e) {
    const el = e.target;
    if (!_isTrackedField(el)) return;
    const modal = el.closest(".modal-overlay");
    if (!modal) return;
    const fieldId = el.id || el.name || el.dataset.fhId;
    if (!fieldId) return;
    _initNav(el, modal.id, fieldId);
    _injectButtons(el, modal.id, fieldId);
    _updateButtons(el);
  }

  // ── BLUR — salva solo se non causato da Invio ───────────────
  function _onBlur(e) {
    const el = e.target;
    if (!_isTrackedField(el)) return;

    if (_enterPressed.has(el)) {
      _enterPressed.delete(el);
      return;
    }

    const state = _nav.get(el);
    if (!state) return;
    const val = el.value.trim();
    if (val) {
      _pushValue(state.modalId, state.fieldId, val);
    }
    // dopo blur torna sempre al live (con idx aggiornato)
    _resetNavToLive(el);
    _updateButtons(el);
  }

  // ── KEYDOWN ─────────────────────────────────────────────────
  function _onKeydown(e) {
    const el = e.target;
    if (!_isTrackedField(el)) return;

    if (e.key === "Enter") {
      _enterPressed.add(el);
      setTimeout(function () {
        _enterPressed.delete(el);
      }, 200);
      return;
    }

    if (!e.altKey) return;
    if (e.key === "ArrowUp") {
      e.preventDefault();
      _navigate(el, -1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      _navigate(el, +1);
    }
  }

  // ── SALVA AL CLICK "Salva" ──────────────────────────────────
  function _onSalvaClick(e) {
    const btn = e.target.closest("button");
    if (!btn) return;
    if (!(btn.textContent || "").includes("Salva")) return;
    const modal = btn.closest(".modal-overlay");
    if (!modal) return;
    modal
      .querySelectorAll("input.input, textarea.input")
      .forEach(function (el) {
        if (!_isTrackedField(el)) return;
        const fieldId = el.id || el.name || el.dataset.fhId;
        if (!fieldId) return;
        const val = el.value.trim();
        if (val) _pushValue(modal.id, fieldId, val);
      });
  }

  // ── HELPER ──────────────────────────────────────────────────
  function _isTrackedField(el) {
    if (!el) return false;
    if (
      el.type === "hidden" ||
      el.type === "checkbox" ||
      el.type === "radio" ||
      el.type === "date"
    )
      return false;
    if (el.tagName !== "INPUT" && el.tagName !== "TEXTAREA") return false;
    if (!el.classList.contains("input")) return false;
    return true;
  }

  // ── INIT ─────────────────────────────────────────────────────
  function init() {
    document.addEventListener("focusin", _onFocus, true);
    document.addEventListener("focusout", _onBlur, true);
    document.addEventListener("keydown", _onKeydown, true);
    document.addEventListener("click", _onSalvaClick, true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window._fieldHistory = {
    push: _pushValue,
    get: _getHistory,
    clearAll: function () {
      _db = {};
      _save();
    },
    clearField: function (modalId, fieldId) {
      delete _db[_key(modalId, fieldId)];
      _save();
    },
  };
})();
