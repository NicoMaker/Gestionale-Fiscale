// ═══════════════════════════════════════════════════════════════
// FIELD-HISTORY.JS — Frecce ↑↓ per navigare la cronologia di
//                    ogni campo nei form modali.
//
// Come funziona:
//   • Ogni campo input/textarea nei modal tiene una lista di
//     valori inseriti in precedenza (per campo, per modal).
//   • Quando il campo è focalizzato appaiono due frecce ◀ ▶
//     (o ↑ ↓) accanto ad esso.
//   • Clic/tap sulle frecce o tasti ↑/↓ con ALT permettono di
//     scorrere avanti/indietro nella storia di quel campo.
//   • Il valore attuale viene salvato nella storia quando:
//       – si preme Invio nel campo
//       – il campo perde il focus con un valore non vuoto
//       – si salva il form (intercettazione dei btn "Salva")
//   • La storia è persistita in localStorage per sessione
//     (max 20 valori per campo).
// ═══════════════════════════════════════════════════════════════

(function () {
  "use strict";

  // ── COSTANTI ────────────────────────────────────────────────
  const MAX_HISTORY = 20;          // max valori salvati per campo
  const STORAGE_KEY = "fh_v1";     // chiave localStorage
  const DEBOUNCE_MS = 400;         // debounce per salvare onInput

  // ── STORAGE ─────────────────────────────────────────────────
  // struttura: { "modalId__fieldId": ["valore1","valore2",...] }
  let _db = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) _db = JSON.parse(raw);
  } catch (_) { _db = {}; }

  function _save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(_db)); }
    catch (_) {}
  }

  function _key(modalId, fieldId) {
    return `${modalId}__${fieldId}`;
  }

  function _getHistory(modalId, fieldId) {
    return _db[_key(modalId, fieldId)] || [];
  }

  function _pushValue(modalId, fieldId, value) {
    if (!value || !value.trim()) return;
    const k = _key(modalId, fieldId);
    const arr = _db[k] || [];
    // non duplicare l'ultimo valore identico
    if (arr[arr.length - 1] === value) return;
    // rimuovi occorrenze precedenti dello stesso valore
    const filtered = arr.filter(v => v !== value);
    filtered.push(value);
    if (filtered.length > MAX_HISTORY) filtered.shift();
    _db[k] = filtered;
    _save();
  }

  // ── STATO NAVIGAZIONE (una voce per campo attivo) ───────────
  // { element → { modalId, fieldId, idx } }
  const _nav = new WeakMap();

  function _getNav(el) {
    return _nav.get(el) || null;
  }

  function _initNav(el, modalId, fieldId) {
    const history = _getHistory(modalId, fieldId);
    // idx parte da history.length (punta "fuori" = valore live)
    _nav.set(el, { modalId, fieldId, idx: history.length });
  }

  // ── NAVIGAZIONE ─────────────────────────────────────────────
  // direction: -1 = indietro (passato), +1 = avanti (futuro)
  function _navigate(el, direction) {
    const state = _getNav(el);
    if (!state) return;
    const history = _getHistory(state.modalId, state.fieldId);
    if (history.length === 0) {
      _flashEmpty(el);
      return;
    }

    // Salva il valore live la prima volta che si va "indietro"
    if (state.idx === history.length && direction === -1) {
      state.liveValue = el.value;
    }

    let newIdx = state.idx + direction;
    // limiti
    if (newIdx < 0) newIdx = 0;
    if (newIdx > history.length) newIdx = history.length;

    state.idx = newIdx;
    _nav.set(el, state);

    if (newIdx === history.length) {
      // torna al valore live
      el.value = state.liveValue !== undefined ? state.liveValue : "";
    } else {
      el.value = history[newIdx];
    }

    // triggera evento input per eventuali listener
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));

    _updateButtons(el);
    _flashField(el);
  }

  function _flashField(el) {
    el.classList.add("fh-flash");
    setTimeout(() => el.classList.remove("fh-flash"), 350);
  }

  function _flashEmpty(el) {
    el.classList.add("fh-flash-empty");
    setTimeout(() => el.classList.remove("fh-flash-empty"), 400);
  }

  // ── UI BUTTONS ──────────────────────────────────────────────
  // Crea il wrapper con le frecce e lo inietta nel form-group
  function _injectButtons(el, modalId, fieldId) {
    const group = el.closest(".form-group");
    if (!group) return;
    // evita doppia iniezione
    if (group.querySelector(".fh-wrap")) return;

    // avvolgi il campo originale + bottoni in un wrapper
    const wrap = document.createElement("div");
    wrap.className = "fh-wrap";

    // inserisci wrap prima del campo nel DOM
    el.parentNode.insertBefore(wrap, el);
    wrap.appendChild(el);

    const btnBack = document.createElement("button");
    btnBack.type = "button";
    btnBack.className = "fh-btn fh-btn-back";
    btnBack.title = "Valore precedente (Alt+↑)";
    btnBack.innerHTML = "◀";
    btnBack.setAttribute("tabindex", "-1");

    const counter = document.createElement("span");
    counter.className = "fh-counter";

    const btnFwd = document.createElement("button");
    btnFwd.type = "button";
    btnFwd.className = "fh-btn fh-btn-fwd";
    btnFwd.title = "Valore successivo (Alt+↓)";
    btnFwd.innerHTML = "▶";
    btnFwd.setAttribute("tabindex", "-1");

    wrap.appendChild(btnBack);
    wrap.appendChild(counter);
    wrap.appendChild(btnFwd);

    btnBack.addEventListener("mousedown", (e) => {
      e.preventDefault(); // non perdere focus dal campo
      _navigate(el, -1);
    });
    btnFwd.addEventListener("mousedown", (e) => {
      e.preventDefault();
      _navigate(el, +1);
    });

    // touch support
    btnBack.addEventListener("touchstart", (e) => {
      e.preventDefault();
      _navigate(el, -1);
    }, { passive: false });
    btnFwd.addEventListener("touchstart", (e) => {
      e.preventDefault();
      _navigate(el, +1);
    }, { passive: false });

    _updateButtons(el);
  }

  function _updateButtons(el) {
    const group = el.closest(".form-group");
    if (!group) return;
    const wrap = group.querySelector(".fh-wrap");
    if (!wrap) return;

    const state = _getNav(el);
    if (!state) return;
    const history = _getHistory(state.modalId, state.fieldId);
    const total = history.length;

    const btnBack = wrap.querySelector(".fh-btn-back");
    const btnFwd  = wrap.querySelector(".fh-btn-fwd");
    const counter = wrap.querySelector(".fh-counter");

    const canBack = state.idx > 0;
    const canFwd  = state.idx < total;

    btnBack.disabled = !canBack;
    btnFwd.disabled  = !canFwd;
    btnBack.classList.toggle("fh-btn-active", canBack);
    btnFwd.classList.toggle("fh-btn-active", canFwd);

    if (total > 0) {
      const pos = state.idx < total ? state.idx + 1 : total + 1;
      counter.textContent = `${pos}/${total + 1}`;
      counter.title = `Posizione ${pos} di ${total + 1} (${total} salvati)`;
      counter.style.display = "";
    } else {
      counter.textContent = "";
      counter.style.display = "none";
    }
  }

  // ── INTERCETTA FOCUS SUI CAMPI ──────────────────────────────
  function _onFocus(e) {
    const el = e.target;
    if (!_isTrackedField(el)) return;

    const modal = el.closest(".modal-overlay");
    if (!modal) return;

    const modalId  = modal.id;
    const fieldId  = el.id || el.name || el.dataset.fhId;
    if (!fieldId) return;

    _initNav(el, modalId, fieldId);
    _injectButtons(el, modalId, fieldId);
    _updateButtons(el);
  }

  // ── SALVA VALORE AL BLUR ─────────────────────────────────────
  function _onBlur(e) {
    const el = e.target;
    if (!_isTrackedField(el)) return;
    const state = _getNav(el);
    if (!state) return;
    const val = el.value.trim();
    if (!val) return;
    _pushValue(state.modalId, state.fieldId, val);
    // resetta indice al fondo (nuovo valore live)
    const history = _getHistory(state.modalId, state.fieldId);
    state.idx = history.length;
    _nav.set(el, state);
    _updateButtons(el);
  }

  // ── TASTI ALT+↑/↓ ──────────────────────────────────────────
  function _onKeydown(e) {
    const el = e.target;
    if (!_isTrackedField(el)) return;
    if (!e.altKey) return;
    if (e.key === "ArrowUp") {
      e.preventDefault();
      _navigate(el, -1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      _navigate(el, +1);
    }
  }

  // ── SALVA PRIMA DI SUBMIT (bottoni Salva) ───────────────────
  function _onSalvaClick(e) {
    const btn = e.target.closest("button");
    if (!btn) return;
    const text = btn.textContent || "";
    if (!text.includes("Salva")) return;

    const modal = btn.closest(".modal-overlay");
    if (!modal) return;

    modal.querySelectorAll("input.input, textarea.input").forEach(el => {
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
    if (el.type === "hidden") return false;
    if (el.type === "checkbox" || el.type === "radio") return false;
    if (el.tagName !== "INPUT" && el.tagName !== "TEXTAREA") return false;
    if (!el.classList.contains("input")) return false;
    // skip campi data (poco utile la storia)
    if (el.type === "date") return false;
    return true;
  }

  // ── INIT ─────────────────────────────────────────────────────
  function init() {
    document.addEventListener("focusin",  _onFocus,   true);
    document.addEventListener("focusout", _onBlur,    true);
    document.addEventListener("keydown",  _onKeydown, true);
    document.addEventListener("click",    _onSalvaClick, true);
  }

  // Avvia dopo il DOM
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // ── API pubblica (opzionale) ─────────────────────────────────
  window._fieldHistory = {
    push: _pushValue,
    get:  _getHistory,
    clearAll: () => { _db = {}; _save(); },
    clearField: (modalId, fieldId) => {
      delete _db[_key(modalId, fieldId)];
      _save();
    },
  };

})();
