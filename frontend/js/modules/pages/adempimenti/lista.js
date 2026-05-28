// ═══════════════════════════════════════════════════════════════
// ADEMPIMENTI-LISTA.JS — Utility null-safe, lista adempimenti,
//                         modal definizione (nuovo/modifica)
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// ADEMPIMENTI.JS — Gestione definizioni adempimenti e modal stato
// ═══════════════════════════════════════════════════════════════

// ─── UTILITY NULL-SAFE ────────────────────────────────────────
function setVal(id, val) {
  const el = document.getElementById(id);
  if (!el) {
    console.warn(`[adp] elemento non trovato: #${id}`);
    return;
  }
  if (el.type === "checkbox") el.checked = !!val;
  else el.value = val ?? "";
}
function setTxt(id, txt) {
  const el = document.getElementById(id);
  if (!el) {
    console.warn(`[adp] elemento non trovato: #${id}`);
    return;
  }
  el.textContent = txt ?? "";
}
function setDisplay(id, display) {
  const el = document.getElementById(id);
  if (!el) {
    console.warn(`[adp] elemento non trovato: #${id}`);
    return;
  }
  el.style.display = display;
}
function getVal(id) {
  const el = document.getElementById(id);
  if (!el) {
    console.warn(`[adp] elemento non trovato: #${id}`);
    return "";
  }
  return el.type === "checkbox" ? el.checked : (el.value ?? "");
}

// ─── HELPERS PER TIPO ─────────────────────────────────────────
function isContabilita(r) {
  return parseInt(r.is_contabilita) === 1 || r.is_contabilita === true;
}
function hasRate(r) {
  return parseInt(r.has_rate) === 1 || r.has_rate === true;
}
function isCheckbox(r) {
  return parseInt(r.is_checkbox) === 1 || r.is_checkbox === true;
}
function isTextOnly(r) {
  return parseInt(r.is_text_only) === 1 || r.is_text_only === true;
}

// ─── LISTA ADEMPIMENTI ────────────────────────────────────────
const applyAdempimentiFiltriSearch = debounce(() => {
  const q =
    document
      .getElementById("global-search-adempimenti")
      ?.value?.toLowerCase() || "";
  const filtered = state.adempimenti.filter((a) => {
    if (
      q &&
      !a.codice.toLowerCase().includes(q) &&
      !a.nome.toLowerCase().includes(q)
    )
      return false;
    return true;
  });
  renderAdempimentiTabella(filtered);
}, 300);

function resetAdempimentiFiltri() {
  const s = document.getElementById("global-search-adempimenti");
  if (s) s.value = "";
  renderAdempimentiTabella(state.adempimenti);
}

function renderAdempimentiPage() {
  renderAdempimentiTabella(state.adempimenti);
}

function renderAdempimentiTabella(adempimenti) {
  const scadIcons = {
    annuale: "📅",
    semestrale: "📆",
    trimestrale: "📊",
    mensile: "🗓️",
  };
  const scadFreq = {
    annuale: "1×/anno",
    semestrale: "2×/anno",
    trimestrale: "4×/anno",
    mensile: "12×/anno",
  };
  const scadDesc = {
    annuale: "Scadenza annuale",
    semestrale: "Scadenza semestrale",
    trimestrale: "Scadenza trimestrale",
    mensile: "Scadenza mensile",
  };

  const totAdp = adempimenti.length;
  const totAll = state.adempimenti.length;
  const isFiltrato = totAdp < totAll;

  let html = `<div style="margin-bottom:16px;display:flex;align-items:center;gap:10px">
    <span style="font-size:14px;color:var(--text2)">
      ${isFiltrato ? `<span style="color:var(--yellow)">⚠️ Filtro attivo:</span> ${totAdp} di ${totAll} adempimenti` : `<span style="color:var(--text3)">${totAll} adempimenti totali</span>`}
    </span>
    ${isFiltrato ? `<button class="btn btn-sm btn-primary" onclick="resetAdempimentiFiltri()" style="font-size:12px">⟳ Tutti</button>` : ""}
  </div>`;

  const adempimentiOrdinati = [...adempimenti].sort((a, b) =>
    a.nome.localeCompare(b.nome, "it", { sensitivity: "base" }),
  );

  const cards = adempimentiOrdinati
    .map((a) => {
      const flagsBadges = [];
      if (a.is_contabilita)
        flagsBadges.push(
          `<span class="adp-flag-badge" style="color:#22d3ee;background:#22d3ee15;border-color:#22d3ee33;font-size:11px" title="IVA + Contabilità separati">📊 Cont.</span>`,
        );
      if (a.has_rate)
        flagsBadges.push(
          `<span class="adp-flag-badge" style="color:#34d399;background:#34d39915;border-color:#34d39933;font-size:11px" title="Con rate">💰 Rate</span>`,
        );
      if (a.is_checkbox)
        flagsBadges.push(
          `<span class="adp-flag-badge" style="color:#a78bfa;background:#a78bfa15;border-color:#a78bfa33;font-size:11px" title="Checkbox semplice ✓/✗">☑️ Check</span>`,
        );
      if (a.is_text_only)
        flagsBadges.push(
          `<span class="adp-flag-badge" style="color:#c084fc;background:#c084fc15;border-color:#c084fc33;font-size:11px" title="Solo testo (nessuno stato)">📝 Testo</span>`,
        );
      if (!a.is_contabilita && !a.has_rate && !a.is_checkbox && !a.is_text_only)
        flagsBadges.push(
          `<span class="adp-flag-badge" style="color:#5b8df6;background:#5b8df615;border-color:#5b8df633;font-size:11px" title="Solo data scadenza">📅 Solo Scad.</span>`,
        );

      return `<div class="adp-def-card" title="${escAttr(a.nome)} — ${scadDesc[a.scadenza_tipo] || a.scadenza_tipo}">
      <div class="adp-def-card-top">
        <div class="adp-def-codice" style="font-size:13px">${a.codice}</div>
        <div style="display:flex;gap:5px">
          <button class="btn btn-xs btn-secondary" onclick="editAdpDef(${a.id})" title="Modifica">✏️</button>
          <button class="btn btn-xs btn-danger" onclick="deleteAdpDef(${a.id})" title="Elimina">🗑️</button>
        </div>
      </div>
      <div class="adp-def-nome" style="font-size:15px">${a.nome}</div>
      ${a.descrizione ? `<div class="adp-def-desc" style="font-size:12px">${a.descrizione}</div>` : ""}
      <div class="adp-def-meta">
        <span class="adp-scad-badge" style="font-size:12px" title="${scadDesc[a.scadenza_tipo] || a.scadenza_tipo}">
          <span style="font-size:14px">${scadIcons[a.scadenza_tipo] || "📅"}</span>
          ${a.scadenza_tipo}
          <span style="color:var(--text3);font-size:10px">(${scadFreq[a.scadenza_tipo] || ""})</span>
        </span>
        ${flagsBadges.join("")}
        ${a.anno_validita ? `<span class="adp-flag-badge" style="color:#f59e0b;background:#f59e0b18;border-color:#f59e0b44;font-size:11px" title="Valido solo per l'anno ${a.anno_validita}">📆 Solo ${a.anno_validita}</span>` : ""}
      </div>
    </div>`;
    })
    .join("");

  if (!adempimenti.length) {
    html += `<div class="empty"><div class="empty-icon">📋</div><p style="font-size:15px">Nessun adempimento trovato</p></div>`;
    document.getElementById("content").innerHTML = html;
    return;
  }

  html += `<div class="adp-def-grid-flat">${cards}</div>`;
  document.getElementById("content").innerHTML = html;
}

// ─── MODAL ADEMPIMENTO DEF ────────────────────────────────────
function openNuovoAdpDef() {
  setTxt("modal-adp-def-title", "Nuovo Adempimento");
  setVal("adp-def-id", "");
  setVal("adp-def-codice", "");
  setVal("adp-def-nome", "");
  setVal("adp-def-desc", "");
  setVal("adp-def-scadenza", "annuale");

  const sempliceRadio = document.getElementById("adp-def-semplice");
  const contRadio = document.getElementById("adp-def-contabilita");
  const rateRadio = document.getElementById("adp-def-rate");
  const checkRadio = document.getElementById("adp-def-checkbox");
  const textRadio = document.getElementById("adp-def-textonly");

  if (sempliceRadio) sempliceRadio.checked = true;
  if (contRadio) contRadio.checked = false;
  if (rateRadio) rateRadio.checked = false;
  if (checkRadio) checkRadio.checked = false;
  if (textRadio) textRadio.checked = false;

  setDisplay("sect-rate-labels", "none");
  setVal("adp-rate-l1", "Saldo");
  setVal("adp-rate-l2", "1° Acconto");
  setVal("adp-rate-l3", "2° Acconto");
  setVal("adp-def-anno-validita", "");
  openModal("modal-adp-def");
}

function editAdpDef(id) {
  const a = state.adempimenti.find((x) => x.id === id);
  if (!a) return;

  setTxt("modal-adp-def-title", "Modifica Adempimento");
  setVal("adp-def-id", a.id);
  setVal("adp-def-codice", a.codice);
  setVal("adp-def-nome", a.nome);
  setVal("adp-def-desc", a.descrizione || "");
  setVal("adp-def-scadenza", a.scadenza_tipo || "annuale");
  setVal("adp-def-anno-validita", a.anno_validita || "");

  const isCont = a.is_contabilita === 1;
  const isRate = a.has_rate === 1;
  const isCheck = a.is_checkbox === 1;
  const isText = a.is_text_only === 1;

  const sempliceRadio = document.getElementById("adp-def-semplice");
  const contRadio = document.getElementById("adp-def-contabilita");
  const rateRadio = document.getElementById("adp-def-rate");
  const checkRadio = document.getElementById("adp-def-checkbox");
  const textRadio = document.getElementById("adp-def-textonly");

  if (isCont && contRadio) {
    contRadio.checked = true;
    sempliceRadio.checked = false;
    rateRadio.checked = false;
    checkRadio.checked = false;
    textRadio.checked = false;
  } else if (isRate && rateRadio) {
    rateRadio.checked = true;
    sempliceRadio.checked = false;
    contRadio.checked = false;
    checkRadio.checked = false;
    textRadio.checked = false;
  } else if (isCheck && checkRadio) {
    checkRadio.checked = true;
    sempliceRadio.checked = false;
    contRadio.checked = false;
    rateRadio.checked = false;
    textRadio.checked = false;
  } else if (isText && textRadio) {
    textRadio.checked = true;
    sempliceRadio.checked = false;
    contRadio.checked = false;
    rateRadio.checked = false;
    checkRadio.checked = false;
  } else {
    if (sempliceRadio) sempliceRadio.checked = true;
  }

  let lb = ["Saldo", "1° Acconto", "2° Acconto"];
  try {
    if (a.rate_labels) lb = JSON.parse(a.rate_labels);
  } catch (e) {}
  setVal("adp-rate-l1", lb[0] || "Saldo");
  setVal("adp-rate-l2", lb[1] || "1° Acconto");
  setVal("adp-rate-l3", lb[2] || "2° Acconto");

  onAdpTipoChange();
  openModal("modal-adp-def");
}

function onAdpTipoChange() {
  const isRate = document.getElementById("adp-def-rate")?.checked || false;
  setDisplay("sect-rate-labels", isRate ? "" : "none");
}

function saveAdpDef() {
  const id = getVal("adp-def-id");
  const codice = String(getVal("adp-def-codice")).trim().toUpperCase();
  const nome = String(getVal("adp-def-nome")).trim();
  if (!codice || !nome) {
    showNotif("Codice e nome sono obbligatori", "error");
    return;
  }

  const isSemplice =
    document.getElementById("adp-def-semplice")?.checked || false;
  const isCont =
    document.getElementById("adp-def-contabilita")?.checked || false;
  const isRate = document.getElementById("adp-def-rate")?.checked || false;
  const isCheck = document.getElementById("adp-def-checkbox")?.checked || false;
  const isText = document.getElementById("adp-def-textonly")?.checked || false;

  const data = {
    codice,
    nome,
    descrizione: String(getVal("adp-def-desc")).trim() || null,
    scadenza_tipo: getVal("adp-def-scadenza"),
    anno_validita: (function () {
      const v = String(getVal("adp-def-anno-validita")).trim();
      const n = parseInt(v, 10);
      return v.length === 4 && n >= 2000 && n <= 2099 ? n : null;
    })(),
    is_contabilita: 0,
    has_rate: 0,
    is_checkbox: 0,
    is_text_only: 0,
  };

  if (isCont) data.is_contabilita = 1;
  else if (isRate) data.has_rate = 1;
  else if (isCheck) data.is_checkbox = 1;
  else if (isText) data.is_text_only = 1;

  if (data.has_rate)
    data.rate_labels = [
      getVal("adp-rate-l1"),
      getVal("adp-rate-l2"),
      getVal("adp-rate-l3"),
    ];

  if (id) {
    data.id = parseInt(id);
    socket.emit("update:adempimento", data);
  } else socket.emit("create:adempimento", data);
}

function deleteAdpDef(id) {
  if (confirm("Eliminare questo adempimento?"))
    socket.emit("delete:adempimento", { id });
}
