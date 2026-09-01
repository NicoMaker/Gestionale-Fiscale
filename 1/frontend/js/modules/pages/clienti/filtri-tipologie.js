// ═══════════════════════════════════════════════════════════════
// CLIENTI.JS — Gestione clienti con configurazione annuale
// Configurazione letta da: json/tipologie-data.json
// ═══════════════════════════════════════════════════════════════

let currentClienteAnno = new Date().getFullYear();
let currentClienteId = null;

let lastClienteFormValues = {
  col2: "",
  col3: "",
  col4: "",
};

// ─── CARICAMENTO CONFIG JSON ──────────────────────────────────
// _TIPOLOGIE_DATA è null finché il fetch non completa.
// _cfgReady è una Promise che si risolve appena i dati sono disponibili.
let _TIPOLOGIE_DATA = null;

const _cfgReady = (async () => {
  try {
    const res = await fetch("json/tipologie-data.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    _TIPOLOGIE_DATA = await res.json();
    // Esponi anche globalmente per globale.js (caricato separatamente)
    window.TIPOLOGIE_CONFIG = _TIPOLOGIE_DATA;
    // Ora che i dati ci sono, inizializza i filtri e le mappe
    initializeTipologieFilter();
    _syncGlobalFiltroKeys();
  } catch (e) {
    console.error(
      "[clienti.js] Impossibile caricare json/tipologie-data.json:",
      e,
    );
    _TIPOLOGIE_DATA = {};
    window.TIPOLOGIE_CONFIG = {};
  }
})();

// Accessor sincrono — restituisce l'oggetto già caricato oppure {}
// (tutte le funzioni che lo usano vengono chiamate dopo il DOM ready,
//  quindi _TIPOLOGIE_DATA è già popolato quando servono)
function _cfg() {
  if (!_TIPOLOGIE_DATA) {
    // Caso raro: chiamata prima che il fetch completi
    return window.TIPOLOGIE_CONFIG || {};
  }
  return _TIPOLOGIE_DATA;
}

// Espone una funzione per attendere il caricamento (usabile da altri moduli)
window._cfgReady = _cfgReady;

// ─── COSTRUISCE TIPOLOGIE_PERCORSI_DATA DAL JSON ──────────────
// Shape identica alla versione hardcoded, così il resto del codice
// continua a funzionare senza modifiche.
function _buildTipologiePercorsiData() {
  const cfg = _cfg();
  if (!cfg.percorsi || !cfg.tipologie) return {};
  const out = {};
  Object.entries(cfg.percorsi).forEach(([tipCod, percorsiArr]) => {
    const tipMeta = cfg.tipologie[tipCod] || {};
    out[tipCod] = {
      color: tipMeta.color || "#888",
      icon: tipMeta.icon || "📋",
      desc: tipMeta.desc || tipCod,
      percorsi: percorsiArr.map((p) => ({
        col2: p.col2Label,
        col3: p.col3Label,
        codice: p.codice,
        hasPer: p.hasPer,
        isForf: p.isForfettario,
      })),
    };
  });
  return out;
}

// Getter lazy: si ricalcola dal JSON ogni volta, così un hot-reload
// del JSON viene recepito immediatamente.
function _getTipologiePercorsiData() {
  return _buildTipologiePercorsiData();
}

// ─── MAPPE LABEL ↔ DB ─────────────────────────────────────────
// Costruite dinamicamente dal JSON invece di essere hardcoded.
function _buildCol2Maps() {
  const cfg = _cfg();
  const label2db = {};
  const db2label = {};
  Object.values(cfg.percorsi || {})
    .flat()
    .forEach((p) => {
      if (!p.col2Label) return;
      const db =
        p.col2Label === "Ditta Individuale"
          ? "ditta"
          : p.col2Label.toLowerCase();
      label2db[p.col2Label] = db;
      db2label[db] = p.col2Label;
    });
  return { label2db, db2label };
}

function _buildCol3Maps() {
  const cfg = _cfg();
  const label2db = {};
  const db2label = {};
  Object.values(cfg.percorsi || {})
    .flat()
    .forEach((p) => {
      if (!p.col3Label) return;
      const db = p.col3Label.toLowerCase();
      label2db[p.col3Label] = db;
      db2label[db] = p.col3Label;
    });
  return { label2db, db2label };
}

// Esposti globalmente (usati anche da globale.js)
function _col2LabelToDb() {
  return _buildCol2Maps().label2db;
}
function _col2DbToLabel() {
  return _buildCol2Maps().db2label;
}
function _col3LabelToDb() {
  return _buildCol3Maps().label2db;
}
function _col3DbToLabel() {
  return _buildCol3Maps().db2label;
}

// ─── STATO FILTRO ─────────────────────────────────────────────
// Set di chiavi attive: "TIP|col2Label|col3Label|periodicita"
// NOTA: col2 e col3 nelle chiavi usano il *label display* (non il valore DB)
let _activeFiltroKeys = new Set();
let _tipFiltroPanelOpen = false;

// ─── COSTANTE SPECIALE ────────────────────────────────────────
// Usata internamente per distinguere "nessuno selezionato manualmente"
// da "tutti selezionati".
const _FILTRO_NESSUNO = "__NESSUNO__";
let _filtroManualeNessuno = false; // true = l'utente ha cliccato "Nessuno"

// ─── LOCAL STORAGE KEYS ───────────────────────────────────────
const _STORAGE_KEYS = {
  FILTRI: "gestionale_filtri_tipologie",
  NESSUNO: "gestionale_filtri_nessuno",
  PANNELLO_APERTO: "gestionale_filtri_pannello_aperto",
};

function _buildFiltroKey(tipCod, col2, col3, per) {
  return `${tipCod}|${col2 || ""}|${col3 || ""}|${per || ""}`;
}

function _getAllKeys() {
  const data = _getTipologiePercorsiData();
  const cfg = _cfg();
  const ivaPer = (cfg.periodicitaIva || []).map((p) => p.value);
  const annPer = (cfg.periodicitaAnnuale || []).map((p) => p.value);

  const keys = [];
  Object.entries(data).forEach(([tipCod, tip]) => {
    tip.percorsi.forEach((p) => {
      const perList = p.isForf ? annPer : p.hasPer ? ivaPer : [""];
      perList.forEach((per) =>
        keys.push(_buildFiltroKey(tipCod, p.col2, p.col3, per)),
      );
    });
  });
  return keys;
}

// ─── GESTIONE PERSISTENZA ─────────────────────────────────────
function salvaFiltriSuStorage() {
  try {
    const filtriData = {
      keys: Array.from(_activeFiltroKeys),
      nessuno: _filtroManualeNessuno,
      pannelloAperto: _tipFiltroPanelOpen,
    };
    localStorage.setItem(_STORAGE_KEYS.FILTRI, JSON.stringify(filtriData));
  } catch (e) {
    console.warn("[clienti.js] Errore salvataggio filtri:", e);
  }
}

function caricaFiltriDaStorage() {
  try {
    const saved = localStorage.getItem(_STORAGE_KEYS.FILTRI);
    if (saved) {
      const filtriData = JSON.parse(saved);
      _activeFiltroKeys = new Set(filtriData.keys || []);
      _filtroManualeNessuno = filtriData.nessuno || false;
      _tipFiltroPanelOpen = filtriData.pannelloAperto || false;
      return true;
    }
  } catch (e) {
    console.warn("[clienti.js] Errore caricamento filtri:", e);
  }
  return false;
}

// ─── INIT FILTRO: carica da storage o seleziona tutto ────────────────────────────
function initializeTipologieFilter() {
  const hasLoaded = caricaFiltriDaStorage();
  if (!hasLoaded) {
    // Se non ci sono filtri salvati, seleziona tutto
    _filtroManualeNessuno = false;
    _activeFiltroKeys = new Set(_getAllKeys());
  } else {
    // Also ensure we have all keys even if loaded from storage
    const allKeys = _getAllKeys();
    if (
      _activeFiltroKeys.size === 0 ||
      (_activeFiltroKeys.size === 1 && _filtroManualeNessuno)
    ) {
      // If filters are empty or only "nessuno", select all
      _filtroManualeNessuno = false;
      _activeFiltroKeys = new Set(allKeys);
      salvaFiltriSuStorage(); // Save the corrected state
    }
  }
  _syncGlobalFiltroKeys();
}

// ─── NOTA: initializeTipologieFilter() viene chiamata automaticamente
// dalla _cfgReady Promise appena il JSON è caricato. ─────────

function _syncGlobalFiltroKeys() {
  window._activeFiltroKeys = _activeFiltroKeys;
  window._filtroManualeNessuno = _filtroManualeNessuno;
  window.COL2_DB_TO_LABEL = _col2DbToLabel();
  window.COL3_DB_TO_LABEL = _col3DbToLabel();
  window.COL2_LABEL_TO_DB = _col2LabelToDb();
  window.COL3_LABEL_TO_DB = _col3LabelToDb();

  // Sincronizza con altre viste aperte
  _sincronizzaFiltriGlobali();
}

function _sincronizzaFiltriGlobali() {
  // Emetti evento custom per notificare le altre viste
  const event = new CustomEvent("filtriTipologieAggiornati", {
    detail: {
      keys: Array.from(_activeFiltroKeys),
      nessuno: _filtroManualeNessuno,
      pannelloAperto: _tipFiltroPanelOpen,
    },
  });
  window.dispatchEvent(event);
}

function _isTipCodAllSelected(tipCod) {
  const data = _getTipologiePercorsiData();
  const tip = data[tipCod];
  if (!tip) return false;
  const cfg = _cfg();
  const ivaPer = (cfg.periodicitaIva || []).map((p) => p.value);
  const annPer = (cfg.periodicitaAnnuale || []).map((p) => p.value);
  return tip.percorsi.every((p) => {
    const perList = p.isForf ? annPer : p.hasPer ? ivaPer : [""];
    return perList.every((per) =>
      _activeFiltroKeys.has(_buildFiltroKey(tipCod, p.col2, p.col3, per)),
    );
  });
}

// ─── RENDER PANNELLO ──────────────────────────────────────────
function renderTipologieFiltroPanel() {
  const data = _getTipologiePercorsiData();
  const cfg = _cfg();
  const ivaPer = cfg.periodicitaIva || [];
  const annPer = cfg.periodicitaAnnuale || [];
  const allKeys = _getAllKeys();
  const totalKeys = allKeys.length;
  // ── Counter: mostra numero effettivo solo se parziale ─────
  const activeCount = _filtroManualeNessuno ? 0 : _activeFiltroKeys.size;
  const isAll = !_filtroManualeNessuno && activeCount === totalKeys;
  const isNone = _filtroManualeNessuno || activeCount === 0;
  // Badge numerico: visibile solo se parziale (né tutto né niente)
  const showBadge = !isAll && !isNone;
  const badgeNum = isNone ? "" : isAll ? "" : activeCount;

  let html = `<div class="tip-filtro-panel" id="tip-filtro-panel">
    <div class="tip-filtro-header">
      <span style="font-size:12px;font-weight:700;color:var(--t2);text-transform:uppercase;letter-spacing:.06em">🏷️ Filtra per Tipologia</span>
      <span style="font-size:11px;color:var(--t3);margin-left:4px">(${isNone ? 0 : isAll ? totalKeys : activeCount}/${totalKeys} selezionati)</span>
      <div style="display:flex;gap:6px;align-items:center;margin-left:auto">
        <button class="tip-btn-all"  onclick="event.stopPropagation(); selezionaTuttiTipFiltro(event)"   title="Seleziona tutto">✦ Tutti</button>
        <button class="tip-btn-none" onclick="event.stopPropagation(); deselezionaTuttiTipFiltro(event)" title="Deseleziona tutto">✕ Nessuno</button>
      </div>
    </div>
    <div class="tip-filtro-body">`;

  Object.entries(data).forEach(([tipCod, tip]) => {
    const allSelected = !isNone && _isTipCodAllSelected(tipCod);
    const someSelected =
      !isNone &&
      tip.percorsi.some((p) => {
        const perList = p.isForf
          ? annPer.map((x) => x.value)
          : p.hasPer
            ? ivaPer.map((x) => x.value)
            : [""];
        return perList.some((per) =>
          _activeFiltroKeys.has(_buildFiltroKey(tipCod, p.col2, p.col3, per)),
        );
      });

    html += `<div class="tip-gruppo">
      <div class="tip-gruppo-header" onclick="event.stopPropagation(); toggleTipologiaGruppo(event,'${tipCod}')"
           style="border-color:${tip.color}44;background:${tip.color}0d">
        <span class="tip-gruppo-badge" style="background:${tip.color}22;color:${tip.color};border-color:${tip.color}44">${tip.icon} ${tipCod}</span>
        <span class="tip-gruppo-desc">${tip.desc}</span>
        <span class="tip-gruppo-selall" style="color:${tip.color}" title="Seleziona/deseleziona tutto ${tipCod}">
          ${allSelected ? "✦ tutti" : someSelected ? "◐ parz." : "○ nessuno"}
        </span>
      </div>
      <div class="tip-percorsi-grid">`;

    tip.percorsi.forEach((p) => {
      const perList = p.isForf
        ? annPer
        : p.hasPer
          ? ivaPer
          : [{ value: "", color: "" }];
      perList.forEach((perObj) => {
        const per = typeof perObj === "string" ? perObj : perObj.value || "";
        const perColor = typeof perObj === "object" ? perObj.color || "" : "";
        const key = _buildFiltroKey(tipCod, p.col2, p.col3, per);
        const isActive = !isNone && _activeFiltroKeys.has(key);

        let labelParts = [];
        if (p.col2) labelParts.push(p.col2);
        if (p.col3) labelParts.push(p.col3);
        const label = labelParts.join(" · ") || tipCod;

        const perIcon =
          per === "mensile"
            ? "📅"
            : per === "trimestrale"
              ? "📆"
              : per === "annuale"
                ? "🗓️"
                : "";

        html += `<button
          class="tip-percorso-chip${isActive ? " tip-active" : ""}"
          onclick="event.stopPropagation(); toggleFiltroPercorso(event,'${tipCod}','${p.col2 || ""}','${p.col3 || ""}','${per}')"
          style="${isActive ? `background:${tip.color}22;border-color:${tip.color};color:${tip.color}` : ""}"
          title="${p.codice}">
          <span class="tip-chip-codice">${p.codice}</span>
          <span class="tip-chip-label">${label}</span>
          ${per ? `<span class="tip-chip-per" style="color:${perColor};background:${perColor}18;border-color:${perColor}44">${perIcon} ${per}</span>` : ""}
        </button>`;
      });
    });

    html += `</div></div>`;
  });

  html += `</div></div>`;
  return html;
}

// ─── TOGGLE PANNELLO ──────────────────────────────────────────
function toggleTipFiltroPanel(event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  _tipFiltroPanelOpen = !_tipFiltroPanelOpen;
  salvaFiltriSuStorage(); // Salva lo stato del pannello
  _aggiornaTipFiltroPanelVisibility();
}

function closeTipFiltroPanel(event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  _tipFiltroPanelOpen = false;
  salvaFiltriSuStorage(); // Salva lo stato del pannello
  _aggiornaTipFiltroPanelVisibility();
}

function _aggiornaTipFiltroPanelVisibility() {
  const container = document.getElementById("tip-filtro-container");
  const headerRow = document.getElementById("tip-filtro-header-row");
  if (!container) return;
  container.style.display = _tipFiltroPanelOpen ? "block" : "none";
  if (headerRow) {
    const btn = headerRow.querySelector(".tip-filtro-toggle-btn");
    if (btn) {
      btn.innerHTML = _tipFiltroPanelOpen
        ? `<button class="btn btn-xs btn-secondary" onclick="closeTipFiltroPanel(event)">✕ Chiudi</button>`
        : `<button class="btn btn-xs btn-secondary" onclick="toggleTipFiltroPanel(event)">▼ Espandi</button>`;
    }
  }
}

// ─── AZIONI FILTRO ────────────────────────────────────────────

function toggleFiltroPercorso(event, tipCod, col2, col3, per) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  const key = _buildFiltroKey(tipCod, col2, col3, per);

  if (_filtroManualeNessuno) {
    // Prima selezione dopo "Nessuno": attiva solo questo chip
    _filtroManualeNessuno = false;
    _activeFiltroKeys = new Set([key]);
  } else {
    if (_activeFiltroKeys.has(key)) {
      _activeFiltroKeys.delete(key);
      // Se ora è vuoto → passa in stato "nessuno manuale"
      if (_activeFiltroKeys.size === 0) _filtroManualeNessuno = true;
    } else {
      _activeFiltroKeys.add(key);
    }
  }

  _syncGlobalFiltroKeys();
  salvaFiltriSuStorage(); // Salva le modifiche

  // Aggiorna solo il chip cliccato e il contatore, non tutto il pannello
  _updateSingleChip(key, tipCod, col2, col3, per);
  _aggiornaTipFiltroCounter();

  // Applica subito il filtro alla lista clienti (era mancante: la selezione
  // sembrava "in ritardo" perché il chip si aggiornava ma la lista no)
  applyClientiFiltriDB();
}

function toggleTipologiaGruppo(event, tipCod) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  const data = _getTipologiePercorsiData();
  const tip = data[tipCod];
  if (!tip) return;
  const cfg = _cfg();
  const ivaPer = (cfg.periodicitaIva || []).map((p) => p.value);
  const annPer = (cfg.periodicitaAnnuale || []).map((p) => p.value);

  const allKeys = [];
  tip.percorsi.forEach((p) => {
    const perList = p.isForf ? annPer : p.hasPer ? ivaPer : [""];
    perList.forEach((per) =>
      allKeys.push(_buildFiltroKey(tipCod, p.col2, p.col3, per)),
    );
  });

  if (_filtroManualeNessuno) {
    // Attiva tutto il gruppo partendo da zero
    _filtroManualeNessuno = false;
    allKeys.forEach((k) => _activeFiltroKeys.add(k));
  } else {
    const allActive = allKeys.every((k) => _activeFiltroKeys.has(k));
    if (allActive) {
      allKeys.forEach((k) => _activeFiltroKeys.delete(k));
      if (_activeFiltroKeys.size === 0) _filtroManualeNessuno = true;
    } else {
      allKeys.forEach((k) => _activeFiltroKeys.add(k));
    }
  }

  _syncGlobalFiltroKeys();
  salvaFiltriSuStorage(); // Salva le modifiche
  _refreshTipFiltroPanel();
  applyClientiFiltriDB();
}

// ── "✦ Tutti": seleziona tutto (resetta flag nessuno) ────────
function selezionaTuttiTipFiltro(event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  _filtroManualeNessuno = false;
  _activeFiltroKeys = new Set(_getAllKeys());
  _syncGlobalFiltroKeys();
  salvaFiltriSuStorage(); // Salva le modifiche
  _refreshTipFiltroPanel();
  applyClientiFiltriDB();
}

// ── "✕ Nessuno": deseleziona tutto, rimane nessuno finché
//    l'utente non clicca singolarmente o "Tutti"  ────────────
function deselezionaTuttiTipFiltro(event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  _filtroManualeNessuno = true;
  _activeFiltroKeys = new Set();
  _syncGlobalFiltroKeys();
  salvaFiltriSuStorage(); // Salva le modifiche
  _refreshTipFiltroPanel();
  applyClientiFiltriDB();
}

function _refreshTipFiltroPanel() {
  const container = document.getElementById("tip-filtro-container");
  if (!container) return;
  const tmp = document.createElement("div");
  tmp.innerHTML = renderTipologieFiltroPanel();
  container.innerHTML = "";
  container.appendChild(tmp.firstChild);
  _aggiornaTipFiltroCounter();
  container.style.display = _tipFiltroPanelOpen ? "block" : "none";
}

function _updateSingleChip(key, tipCod, col2, col3, per) {
  // Trova tutti i chip e cerca quello corrispondente
  const chips = document.querySelectorAll(".tip-percorso-chip");

  for (let i = 0; i < chips.length; i++) {
    const chip = chips[i];
    const onclickAttr = chip.getAttribute("onclick") || "";

    // Verifica se questo chip corrisponde ai parametri
    if (
      onclickAttr.includes(`'${tipCod}'`) &&
      onclickAttr.includes(`'${col2 || ""}'`) &&
      onclickAttr.includes(`'${col3 || ""}'`) &&
      onclickAttr.includes(`'${per}'`)
    ) {
      const isActive = _activeFiltroKeys.has(key);
      const data = _getTipologiePercorsiData();
      const tip = data[tipCod];
      const tipColor = tip ? tip.color : "#888";

      if (isActive) {
        chip.classList.add("tip-active");
        chip.style.background = `${tipColor}22`;
        chip.style.borderColor = tipColor;
        chip.style.color = tipColor;
      } else {
        chip.classList.remove("tip-active");
        chip.style.background = "";
        chip.style.borderColor = "";
        chip.style.color = "";
      }
      break; // Trovato il chip corretto, esci dal ciclo
    }
  }
}

function _aggiornaTipFiltroCounter() {
  const badge = document.getElementById("tip-filtro-count");
  if (!badge) return;
  const allKeys = _getAllKeys();
  const isAll =
    !_filtroManualeNessuno && _activeFiltroKeys.size === allKeys.length;
  const isNone = _filtroManualeNessuno || _activeFiltroKeys.size === 0;
  // Mostra numero solo se parziale; se tutto → nasconde badge; se nessuno → "0" in rosso
  if (isNone) {
    badge.textContent = "0";
    badge.style.display = "inline-flex";
    badge.style.background = "var(--red)";
  } else if (isAll) {
    badge.textContent = "";
    badge.style.display = "none";
  } else {
    badge.textContent = _activeFiltroKeys.size;
    badge.style.display = "inline-flex";
    badge.style.background = "var(--accent)";
  }
}

// ─── COSTRUISCE I FILTRI PER LA RICHIESTA AL SERVER ───────────
