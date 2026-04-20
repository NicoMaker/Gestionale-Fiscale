const socket = io();

const MESI = [
  "Gennaio",
  "Febbraio",
  "Marzo",
  "Aprile",
  "Maggio",
  "Giugno",
  "Luglio",
  "Agosto",
  "Settembre",
  "Ottobre",
  "Novembre",
  "Dicembre",
];
const MESI_SHORT = [
  "Gen",
  "Feb",
  "Mar",
  "Apr",
  "Mag",
  "Giu",
  "Lug",
  "Ago",
  "Set",
  "Ott",
  "Nov",
  "Dic",
];
const STATI = {
  da_fare: "⭕ Da fare",
  in_corso: "🔄 In corso",
  completato: "✅ Completato",
  n_a: "➖ N/A",
};
const CATEGORIE = [
  { codice: "IVA", nome: "💰 IVA", icona: "💰", color: "#fbbf24" },
  {
    codice: "DICHIARAZIONI",
    nome: "📄 Dichiarazioni",
    icona: "📄",
    color: "#5b8df6",
  },
  {
    codice: "PREVIDENZA",
    nome: "🏦 Previdenza",
    icona: "🏦",
    color: "#34d399",
  },
  { codice: "LAVORO", nome: "👔 Lavoro", icona: "👔", color: "#a78bfa" },
  { codice: "TRIBUTI", nome: "🏛️ Tributi", icona: "🏛️", color: "#f87171" },
  { codice: "BILANCIO", nome: "📊 Bilancio", icona: "📊", color: "#22d3ee" },
];

// ─── LOGICA 4 COLONNE ─────────────────────────────────────────
const COL2_OPTIONS = {
  PF: [
    { value: "privato", label: "Privato" },
    { value: "ditta", label: "Ditta Individuale" },
    { value: "socio", label: "Socio" },
    { value: "professionista", label: "Professionista" },
  ],
  SP: null,
  SC: null,
  ASS: null,
};

function getCol3Options(tipCodice, col2Value) {
  if (tipCodice === "SP" || tipCodice === "ASS") {
    return [
      { value: "ordinaria", label: "Ordinaria" },
      { value: "semplificata", label: "Semplificata" },
    ];
  }
  if (tipCodice === "SC") {
    return [{ value: "ordinaria", label: "Ordinaria" }];
  }
  if (tipCodice === "PF") {
    if (!col2Value || col2Value === "privato" || col2Value === "socio")
      return null;
    return [
      { value: "ordinario", label: "Ordinario" },
      { value: "semplificato", label: "Semplificato" },
      { value: "forfettario", label: "Forfettario" },
    ];
  }
  return null;
}

function col4Visible(col3Value) {
  return !!col3Value;
}

const SOTTOTIPO_MAP = {
  "PF|privato|": "PF_PRIV",
  "PF|ditta|ordinario": "PF_DITTA_ORD",
  "PF|ditta|semplificato": "PF_DITTA_SEP2",
  "PF|ditta|forfettario": "PF_DITTA_FOR",
  "PF|socio|": "PF_SOCIO",
  "PF|professionista|ordinario": "PF_PROF_ORD",
  "PF|professionista|semplificato": "PF_PROF_SEM",
  "PF|professionista|forfettario": "PF_PROF_FOR",
  "SP||ordinaria": "SP_ORD",
  "SP||semplificata": "SP_SEMP",
  "SC||ordinaria": "SC_ORD",
  "ASS||ordinaria": "ASS_ORD",
  "ASS||semplificata": "ASS_SEMP",
};

function getSottotipoCode(tipCodice, col2, col3) {
  const key = `${tipCodice}|${col2 || ""}|${col3 || ""}`;
  return SOTTOTIPO_MAP[key] || null;
}

// ─── ROW STORE ────────────────────────────────────────────────
let _rowStore = {};
function storeRow(r) {
  _rowStore[r.id] = r;
  return r.id;
}
function openAdpById(id) {
  const r = _rowStore[id];
  if (!r) {
    console.warn("Row not found:", id);
    return;
  }
  openAdpModal(
    r.id,
    r.stato,
    r.data_scadenza || "",
    r.data_completamento || "",
    r.importo || "",
    r.note || "",
    r.adempimento_nome + " — " + getPeriodoLabel(r),
    r.is_contabilita || 0,
    r.has_rate || 0,
    r.importo_saldo || "",
    r.importo_acconto1 || "",
    r.importo_acconto2 || "",
    r.importo_iva || "",
    r.importo_contabilita || "",
    r.rate_labels || "",
  );
}

let state = {
  page: "dashboard",
  tipologie: [],
  clienti: [],
  adempimenti: [],
  selectedCliente: null,
  anno: new Date().getFullYear(),
  filtri: { stato: "tutti", categoria: "tutti" },
  scadenzario: [],
  scadGlobale: [],
  dashStats: null,
  dashSearch: "",
  dashFiltroCategoria: "tutti",
  globalePreFiltroAdp: "",
  globaleStats: null,
  _dashRendered: false,
  adpInseriti: [],
};

function debounce(fn, ms) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}
function escAttr(s) {
  return (s || "")
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ─── SOCKET ───────────────────────────────────────────────────
socket.on("connect", () => {
  document.getElementById("conn-status").textContent = "● Online";
  document.getElementById("conn-status").style.color = "var(--green)";
  socket.emit("get:tipologie");
  renderPage("dashboard");
});
socket.on("disconnect", () => {
  document.getElementById("conn-status").textContent = "● Offline";
  document.getElementById("conn-status").style.color = "var(--red)";
});
socket.on("notify", ({ type, msg }) => showNotif(msg, type));

socket.on("broadcast:scadenzario_updated", ({ id_cliente, anno }) => {
  if (state.page === "scadenzario" && state.selectedCliente) {
    if (!id_cliente || state.selectedCliente.id === id_cliente) {
      if (!anno || state.anno === anno) loadScadenzario();
    }
  }
});
socket.on("broadcast:globale_updated", ({ anno }) => {
  if (state.page === "scadenzario_globale") {
    if (!anno || state.anno === anno) loadGlobale();
  }
});
socket.on("broadcast:stats_updated", ({ anno }) => {
  if (state.page === "dashboard") {
    if (!anno || state.anno === anno)
      socket.emit("get:stats", { anno: state.anno });
  }
});
socket.on("broadcast:clienti_updated", () => {
  if (state.page === "clienti") socket.emit("get:clienti");
});
socket.on("broadcast:adempimenti_updated", () => {
  if (state.page === "adempimenti") socket.emit("get:adempimenti");
  socket.emit("get:adempimenti");
});

socket.on("res:tipologie", ({ success, data }) => {
  if (success) state.tipologie = data;
});
socket.on("res:clienti", ({ success, data }) => {
  if (!success) return;
  state.clienti = data;
  if (state._pending === "clienti") {
    state._pending = null;
    renderClientiPage();
  } else if (state._pending === "scadenzario") {
    state._pending = null;
    renderScadenzarioPage();
  } else if (state.page === "clienti") renderClientiPage();
});
socket.on("res:adempimenti", ({ success, data }) => {
  if (success) state.adempimenti = data;
  if (state._pending === "adempimenti") {
    state._pending = null;
    renderAdempimentiPage();
  } else if (state.page === "adempimenti") renderAdempimentiPage();
  const sel = document.getElementById("add-adp-select");
  if (sel && success) {
    const modalOpen = document
      .getElementById("modal-add-adp")
      ?.classList.contains("open");
    if (modalOpen) refreshAddAdpSelect();
    updatePeriodoOptions();
  }
});
socket.on("res:stats", ({ success, data }) => {
  if (success) {
    state.dashStats = data;
    renderDashboard(data);
  }
});
socket.on("res:scadenzario", ({ success, data }) => {
  if (success) {
    state.scadenzario = data;
    const inseriti = new Set();
    data.forEach((r) => inseriti.add(r.id_adempimento));
    state.adpInseriti = Array.from(inseriti);
    renderScadenzarioTabella(data);
  }
});
socket.on("res:scadenzario_globale", ({ success, data }) => {
  if (success) {
    state.scadGlobale = data;
    state.globaleStats = calcolaGlobaleStats(data);
    renderGlobaleHeader();
    renderGlobaleTabella(data);
  }
});
socket.on("res:create:cliente", ({ success }) => {
  if (success) {
    closeModal("modal-cliente");
    state._pending = "clienti";
    socket.emit("get:clienti");
  }
});
socket.on("res:update:cliente", ({ success }) => {
  if (success) {
    closeModal("modal-cliente");
    refreshPage();
  }
});
socket.on("res:delete:cliente", ({ success }) => {
  if (success) refreshPage();
});
socket.on("res:create:adempimento", ({ success, error }) => {
  if (success) {
    closeModal("modal-adp-def");
    state._pending = "adempimenti";
    socket.emit("get:adempimenti");
  } else showNotif(error, "error");
});
socket.on("res:update:adempimento", ({ success, error }) => {
  if (success) {
    closeModal("modal-adp-def");
    state._pending = "adempimenti";
    socket.emit("get:adempimenti");
  } else showNotif(error, "error");
});
socket.on("res:delete:adempimento", ({ success }) => {
  if (success) {
    state._pending = "adempimenti";
    socket.emit("get:adempimenti");
  }
});
socket.on("res:genera:scadenzario", ({ success }) => {
  if (success && state.selectedCliente) loadScadenzario();
});
socket.on("res:genera:tutti", ({ success }) => {
  if (success) closeModal("modal-genera-tutti");
});
socket.on("res:copia:scadenzario", ({ success }) => {
  if (success) {
    closeModal("modal-copia");
    loadScadenzario();
  }
});
socket.on("res:copia:tutti", ({ success }) => {
  if (success) closeModal("modal-copia");
});
socket.on("res:update:adempimento_stato", ({ success }) => {
  if (success) {
    closeModal("modal-adempimento");
    if (state.page === "scadenzario") loadScadenzario();
    if (state.page === "scadenzario_globale") loadGlobale();
    if (state.page === "dashboard")
      socket.emit("get:stats", { anno: state.anno });
  }
});
socket.on("res:delete:adempimento_cliente", ({ success }) => {
  if (success) {
    closeModal("modal-adempimento");
    if (state.page === "scadenzario") loadScadenzario();
    if (state.page === "scadenzario_globale") loadGlobale();
  }
});
socket.on("res:add:adempimento_cliente", ({ success }) => {
  if (success) {
    closeModal("modal-add-adp");
    loadScadenzario();
  }
});

document.querySelectorAll(".nav-item").forEach((el) => {
  el.addEventListener("click", () => {
    document
      .querySelectorAll(".nav-item")
      .forEach((x) => x.classList.remove("active"));
    el.classList.add("active");
    renderPage(el.dataset.page);
  });
});

function renderPage(page) {
  state.page = page;
  state._dashRendered = false;
  const titles = {
    dashboard: "Dashboard",
    clienti: "Clienti",
    scadenzario: "Scadenzario Cliente",
    scadenzario_globale: "Vista Globale",
    adempimenti: "Adempimenti Fiscali",
    tipologie: "Tipologie Clienti",
  };
  document.getElementById("page-title").textContent = titles[page] || page;
  if (page === "dashboard") {
    document.getElementById("topbar-actions").innerHTML = `
      <div class="year-sel"><button onclick="changeAnno(-1)">&#9664;</button><span class="year-num">${state.anno}</span><button onclick="changeAnno(1)">&#9654;</button></div>
      <button class="btn btn-orange btn-sm no-print" onclick="openGeneraTutti()">⚡ Genera Tutti</button>
      <button class="btn btn-cyan btn-sm no-print" onclick="openCopiaTutti()">📋 Copia Anno</button>
      <button class="btn btn-print btn-sm" onclick="window.print()">🖨️ Stampa</button>`;
    socket.emit("get:stats", { anno: state.anno });
  } else if (page === "clienti") {
    state._pending = "clienti";
    document.getElementById("topbar-actions").innerHTML = `
      <div class="search-wrap" style="width:280px"><span class="search-icon">🔍</span><input class="input" id="global-search-clienti" placeholder="Cerca nome, CF, P.IVA, email..." oninput="applyClientiFiltri()"></div>
      <select class="select" id="filter-tipo" style="width:150px" onchange="applyClientiFiltri()">
        <option value="">Tutte tipologie</option><option value="PF">PF</option><option value="SP">SP</option><option value="SC">SC</option><option value="ASS">ASS</option>
      </select>
      <button class="btn btn-print btn-sm no-print" onclick="window.print()">🖨️ Stampa</button>
      <button class="btn btn-primary no-print" onclick="openNuovoCliente()">+ Nuovo Cliente</button>`;
    socket.emit("get:clienti");
  } else if (page === "scadenzario") {
    state._pending = "scadenzario";
    document.getElementById("topbar-actions").innerHTML = "";
    socket.emit("get:clienti");
  } else if (page === "scadenzario_globale") {
    renderGlobalePage();
  } else if (page === "adempimenti") {
    state._pending = "adempimenti";
    document.getElementById("topbar-actions").innerHTML = `
      <div class="search-wrap" style="width:280px"><span class="search-icon">🔍</span><input class="input" id="global-search-adempimenti" placeholder="Cerca codice, nome, categoria..." oninput="applyAdempimentiFiltri()"></div>
      <button class="btn btn-print btn-sm no-print" onclick="window.print()">🖨️ Stampa</button>
      <button class="btn btn-primary no-print" onclick="openNuovoAdpDef()">+ Nuovo</button>`;
    socket.emit("get:adempimenti");
  } else if (page === "tipologie") {
    document.getElementById("topbar-actions").innerHTML = "";
    renderTipologiePage();
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

// ═══════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════
function buildDashboardShell(stats) {
  document.getElementById("content").innerHTML = `
    <div class="print-header"><strong>Studio Commerciale - Dashboard ${stats.anno}</strong><br>Stampa: ${new Date().toLocaleDateString("it-IT")}</div>
    <div class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr));margin-bottom:20px">
      <div class="stat-card"><div class="stat-label">Clienti Attivi</div><div class="stat-value v-blue">${stats.totClienti}</div></div>
      <div class="stat-card"><div class="stat-label" id="ds-lbl-tot">Adempimenti ${stats.anno}</div><div class="stat-value" id="ds-tot">-</div></div>
      <div class="stat-card"><div class="stat-label">Completati</div><div class="stat-value v-green" id="ds-comp">-</div><div class="prog-bar"><div class="prog-fill green" id="ds-prog" style="width:0%"></div></div><div class="stat-sub" id="ds-perc">0%</div></div>
      <div class="stat-card"><div class="stat-label">Da Fare</div><div class="stat-value v-yellow" id="ds-dafare">-</div></div>
      <div class="stat-card"><div class="stat-label">In Corso</div><div class="stat-value v-purple" id="ds-incorso">-</div></div>
      <div class="stat-card"><div class="stat-label">N/A</div><div class="stat-value" style="color:var(--text3)" id="ds-na">${stats.na || 0}</div></div>
    </div>
    <div class="table-wrap">
      <div class="table-header no-print" style="flex-wrap:wrap;gap:10px">
        <h3 id="dash-adp-count-title">Adempimenti ${stats.anno}</h3>
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;flex:1">
          <div id="dash-cat-tabs" style="display:flex;gap:4px;flex-wrap:wrap"></div>
          <div class="search-wrap" style="width:210px;margin-left:auto">
            <span class="search-icon">🔍</span>
            <input class="input" id="dash-adp-search" placeholder="Cerca nome, codice..."
              value="${escAttr(state.dashSearch)}" oninput="onDashAdpSearch(this.value)">
          </div>
        </div>
      </div>
      <table>
        <thead><tr>
          <th style="width:90px">Codice</th><th>Nome adempimento</th><th>Categoria</th>
          <th style="text-align:right;width:65px">Totale</th>
          <th style="text-align:right;width:75px;color:var(--green)">✓ Comp.</th>
          <th style="text-align:right;width:75px;color:var(--red)">⭕ Da fare</th>
          <th style="text-align:right;width:65px;color:var(--yellow)">🔄 Corso</th>
          <th style="width:150px">Avanzamento</th>
        </tr></thead>
        <tbody id="dash-adp-tbody"></tbody>
      </table>
    </div>`;
  state._dashRendered = true;
}
function updateDashboardContent(stats) {
  const allAdp = stats.adempimentiStats || [];
  const sq = (state.dashSearch || "").toLowerCase().trim();
  const sc = state.dashFiltroCategoria || "tutti";
  const catColor = {};
  CATEGORIE.forEach((c) => (catColor[c.codice] = c.color));
  const adpVis = allAdp.filter((a) => {
    if (sc !== "tutti" && a.categoria !== sc) return false;
    if (
      sq &&
      !a.nome.toLowerCase().includes(sq) &&
      !a.codice.toLowerCase().includes(sq) &&
      !a.categoria.toLowerCase().includes(sq)
    )
      return false;
    return true;
  });
  const fT = adpVis.reduce((s, a) => s + a.totale, 0),
    fC = adpVis.reduce((s, a) => s + a.completati, 0);
  const fD = adpVis.reduce((s, a) => s + a.da_fare, 0);
  const fI = adpVis.reduce(
    (s, a) => s + Math.max(0, a.totale - a.completati - a.da_fare),
    0,
  );
  const fP = fT > 0 ? Math.round((fC / fT) * 100) : 0,
    isF = sc !== "tutti" || sq !== "";
  const se = (id, v) => {
    const e = document.getElementById(id);
    if (e) e.textContent = v;
  };
  const si = (id, v) => {
    const e = document.getElementById(id);
    if (e) e.innerHTML = v;
  };
  si(
    "ds-lbl-tot",
    `Adempimenti ${stats.anno}${isF ? ` <span style="font-size:9px;color:var(--yellow)">(filtro)</span>` : ""}`,
  );
  se("ds-tot", fT);
  se("ds-comp", fC);
  se("ds-dafare", fD);
  se("ds-incorso", fI);
  se("ds-na", stats.na || 0);
  se("ds-perc", fP + "%");
  const dp = document.getElementById("ds-prog");
  if (dp) dp.style.width = fP + "%";
  const title = document.getElementById("dash-adp-count-title");
  if (title)
    title.innerHTML = `Adempimenti ${stats.anno} <span style="font-size:11px;font-weight:400;color:var(--text3);margin-left:6px">${adpVis.length}/${allAdp.length} — clicca riga per Vista Globale</span>`;
  const tabsEl = document.getElementById("dash-cat-tabs");
  if (tabsEl)
    tabsEl.innerHTML = [
      { codice: "tutti", nome: "Tutti", color: "var(--text2)" },
      ...CATEGORIE,
    ]
      .map((c) => {
        const active = state.dashFiltroCategoria === c.codice,
          col = c.color || "var(--text2)";
        return `<button class="cat-tab${active ? " cat-tab-active" : ""}" style="${active ? `background:${col}22;border-color:${col};color:${col}` : ""}" onclick="setDashCat('${c.codice}')">${c.nome || c.codice}</button>`;
      })
      .join("");
  const tbody = document.getElementById("dash-adp-tbody");
  if (!tbody) return;
  if (!adpVis.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--text3)">Nessun adempimento</td></tr>`;
    return;
  }
  tbody.innerHTML = adpVis
    .map((a) => {
      const p = a.totale > 0 ? Math.round((a.completati / a.totale) * 100) : 0;
      const iC = Math.max(0, a.totale - a.completati - a.da_fare);
      const dot = catColor[a.categoria]
        ? `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${catColor[a.categoria]};margin-right:5px;vertical-align:middle"></span>`
        : "";
      return `<tr class="adp-dash-row" onclick="goVistaGlobaleAdp('${escAttr(a.nome)}')" title="Clicca per Vista Globale">
      <td><span style="font-family:var(--mono);font-size:10px;color:var(--accent);font-weight:700">${a.codice}</span></td>
      <td style="font-weight:700">${a.nome}</td>
      <td>${dot}<span class="badge b-categoria">${a.categoria}</span></td>
      <td style="font-family:var(--mono);font-size:13px;font-weight:700;text-align:right">${a.totale}</td>
      <td style="font-family:var(--mono);font-size:13px;font-weight:700;color:var(--green);text-align:right">${a.completati}</td>
      <td style="font-family:var(--mono);font-size:13px;font-weight:700;color:var(--red);text-align:right">${a.da_fare}</td>
      <td style="font-family:var(--mono);font-size:13px;font-weight:700;color:var(--yellow);text-align:right">${iC > 0 ? iC : "-"}</td>
      <td><div style="display:flex;align-items:center;gap:6px;min-width:110px">
        <div class="mini-bar" style="flex:1;height:7px"><div class="mini-fill" style="width:${p}%"></div></div>
        <span style="font-size:10px;font-family:var(--mono);color:var(--text3);min-width:30px;text-align:right">${p}%</span>
      </div></td>
    </tr>`;
    })
    .join("");
}
function renderDashboard(stats) {
  if (!state._dashRendered) buildDashboardShell(stats);
  updateDashboardContent(stats);
}
function setDashCat(c) {
  state.dashFiltroCategoria = c;
  if (state.dashStats) updateDashboardContent(state.dashStats);
}
function onDashAdpSearch(val) {
  state.dashSearch = val;
  if (state.dashStats) updateDashboardContent(state.dashStats);
}
function goVistaGlobaleAdp(nome) {
  state.globalePreFiltroAdp = nome;
  document
    .querySelectorAll(".nav-item")
    .forEach((x) => x.classList.remove("active"));
  document
    .querySelector('[data-page="scadenzario_globale"]')
    .classList.add("active");
  renderPage("scadenzario_globale");
}

// ═══════════════════════════════════════════════════════════════
// CLIENTI
// ═══════════════════════════════════════════════════════════════
const applyClientiFiltriDB = debounce(() => {
  const q = document.getElementById("global-search-clienti")?.value || "";
  const t = document.getElementById("filter-tipo")?.value || "";
  socket.emit("get:clienti", { search: q, tipologia: t });
}, 300);
function applyClientiFiltri() {
  applyClientiFiltriDB();
}
function renderClientiPage() {
  renderClientiTabella(state.clienti);
}
function renderClientiTabella(clienti) {
  const tbody = clienti.length
    ? clienti
        .map(
          (c) => `<tr>
    <td><strong>${c.nome}</strong></td>
    <td><span class="badge b-${(c.tipologia_codice || "").toLowerCase()}">${c.tipologia_codice || "-"}</span></td>
    <td class="td-dim">${c.sottotipologia_nome || "-"}</td>
    <td class="td-mono td-dim">${c.codice_fiscale || c.partita_iva || "-"}</td>
    <td class="td-dim">${c.email || "-"}</td><td class="td-dim">${c.telefono || "-"}</td>
    <td class="col-actions no-print"><div style="display:flex;gap:5px">
      <button class="btn btn-sm btn-secondary" onclick="editCliente(${c.id})">✏️</button>
      <button class="btn btn-sm btn-success" onclick="goScadenzario(${c.id})">📅</button>
      <button class="btn btn-sm btn-danger" onclick="deleteCliente(${c.id})">🗑️</button>
    </div></td>
  </tr>`,
        )
        .join("")
    : `<tr><td colspan="7"><div class="empty"><div class="empty-icon">👥</div><p>Nessun cliente trovato</p></div></td></tr>`;
  document.getElementById("content").innerHTML = `
    <div class="print-header"><strong>Studio Commerciale - Elenco Clienti</strong><br>Stampa: ${new Date().toLocaleDateString("it-IT")} - Tot: ${clienti.length}</div>
    <div class="table-wrap">
      <div class="table-header no-print"><h3>Clienti (${clienti.length})</h3></div>
      <table><thead><tr><th>Nome</th><th>Tipo</th><th>Sottotipo</th><th>CF / P.IVA</th><th>Email</th><th>Telefono</th><th class="no-print">Azioni</th></tr></thead>
      <tbody>${tbody}</tbody></table>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
// MODAL CLIENTE — LOGICA 4 COLONNE (CASCADE)
// ═══════════════════════════════════════════════════════════════
function aggiornaColonneCliente() {
  const tipCodice = _getTipologiaCodice();
  const col2Wrap = document.getElementById("wrap-col2");
  const col2Sel = document.getElementById("c-col2");
  const col2Opts = COL2_OPTIONS[tipCodice];
  if (!col2Opts) {
    col2Wrap.style.display = "none";
    col2Sel.value = "";
    _aggiornaCol3(tipCodice, "");
    return;
  }
  col2Wrap.style.display = "";
  const col2Current = col2Sel.value;
  col2Sel.innerHTML =
    `<option value="">-- Seleziona --</option>` +
    col2Opts
      .map(
        (o) =>
          `<option value="${o.value}" ${col2Current === o.value ? "selected" : ""}>${o.label}</option>`,
      )
      .join("");
  if (!col2Current) col2Sel.value = "";
  _aggiornaCol3(tipCodice, col2Sel.value);
}
function _aggiornaCol3(tipCodice, col2Val) {
  const col3Opts = getCol3Options(tipCodice, col2Val);
  const col3Wrap = document.getElementById("wrap-col3");
  const col3Sel = document.getElementById("c-col3");
  if (!col3Opts) {
    _nascondiCol3();
    return;
  }
  col3Wrap.style.display = "";
  const col3Current = col3Sel.value;
  col3Sel.innerHTML =
    `<option value="">-- Seleziona --</option>` +
    col3Opts
      .map(
        (o) =>
          `<option value="${o.value}" ${col3Current === o.value ? "selected" : ""}>${o.label}</option>`,
      )
      .join("");
  if (!col3Current) col3Sel.value = "";
  if (col3Sel.value) {
    document.getElementById("wrap-col4").style.display = "";
  } else {
    _nascondiCol4();
  }
}
function _nascondiCol3() {
  const w = document.getElementById("wrap-col3");
  const s = document.getElementById("c-col3");
  if (w) w.style.display = "none";
  if (s) s.value = "";
  _nascondiCol4();
}
function _nascondiCol4() {
  const w = document.getElementById("wrap-col4");
  const s = document.getElementById("c-col4");
  if (w) w.style.display = "none";
  if (s) s.value = "";
}
function _getTipologiaCodice() {
  const sel = document.getElementById("c-tipologia");
  if (!sel || !sel.value) return "";
  const tip = state.tipologie.find((t) => String(t.id) === String(sel.value));
  return tip ? tip.codice : "";
}
function _calcolaSottotipologiaId() {
  const tipCodice = _getTipologiaCodice();
  const col2 = document.getElementById("c-col2")?.value || "";
  const col3 = document.getElementById("c-col3")?.value || "";
  const stCode = getSottotipoCode(tipCodice, col2, col3);
  if (!stCode) return null;
  for (const t of state.tipologie) {
    const sub = (t.sottotipologie || []).find((s) => s.codice === stCode);
    if (sub) return sub.id;
  }
  return null;
}
function populateTipologiaSelect(selectedId) {
  const sel = document.getElementById("c-tipologia");
  if (!sel) return;
  sel.innerHTML = state.tipologie
    .map(
      (t) =>
        `<option value="${t.id}" ${String(t.id) === String(selectedId) ? "selected" : ""}>${t.codice} — ${t.nome}</option>`,
    )
    .join("");
}
function onTipologiaChange() {
  const col2Sel = document.getElementById("c-col2");
  if (col2Sel) col2Sel.value = "";
  const col3Sel = document.getElementById("c-col3");
  if (col3Sel) col3Sel.value = "";
  _nascondiCol4();
  aggiornaColonneCliente();
}
function onCol2Change() {
  const col3Sel = document.getElementById("c-col3");
  if (col3Sel) col3Sel.value = "";
  _nascondiCol4();
  aggiornaColonneCliente();
}
function onCol3Change() {
  const tipCodice = _getTipologiaCodice();
  const col2Val = document.getElementById("c-col2")?.value || "";
  _aggiornaCol3(tipCodice, col2Val);
}
function renderCategorieSelect(attuali = []) {
  const container = document.getElementById("categorie-attive");
  if (!container) return;
  container.innerHTML = CATEGORIE.map(
    (cat) =>
      `<label style="display:inline-flex;align-items:center;gap:8px;margin:4px 8px 4px 0;padding:8px 12px;background:var(--surface2);border-radius:var(--r-sm);cursor:pointer;border:1px solid ${attuali.includes(cat.codice) ? "var(--accent)" : "var(--border)"};transition:all 0.12s"><input type="checkbox" value="${cat.codice}" ${attuali.includes(cat.codice) ? "checked" : ""} style="accent-color:var(--accent)" onchange="this.parentElement.style.borderColor=this.checked?'var(--accent)':'var(--border)'"><span>${cat.icona} ${cat.nome}</span></label>`,
  ).join("");
}
function getSelectedCategorie() {
  return Array.from(document.querySelectorAll("#categorie-attive input"))
    .filter((cb) => cb.checked)
    .map((cb) => cb.value);
}
function openNuovoCliente() {
  document.getElementById("modal-cliente-title").textContent = "Nuovo Cliente";
  document.getElementById("cliente-id").value = "";
  [
    "c-nome",
    "c-cf",
    "c-piva",
    "c-email",
    "c-tel",
    "c-indirizzo",
    "c-note",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  if (document.getElementById("c-col2"))
    document.getElementById("c-col2").value = "";
  if (document.getElementById("c-col3"))
    document.getElementById("c-col3").value = "";
  if (document.getElementById("c-col4"))
    document.getElementById("c-col4").value = "";
  renderCategorieSelect([
    "IVA",
    "DICHIARAZIONI",
    "PREVIDENZA",
    "LAVORO",
    "TRIBUTI",
    "BILANCIO",
  ]);
  populateTipologiaSelect(state.tipologie[0]?.id);
  aggiornaColonneCliente();
  openModal("modal-cliente");
}
function editCliente(id) {
  socket.once("res:cliente", ({ success, data }) => {
    if (!success || !data) return;
    document.getElementById("modal-cliente-title").textContent =
      "Modifica Cliente";
    document.getElementById("cliente-id").value = data.id;
    document.getElementById("c-nome").value = data.nome || "";
    document.getElementById("c-cf").value = data.codice_fiscale || "";
    document.getElementById("c-piva").value = data.partita_iva || "";
    document.getElementById("c-email").value = data.email || "";
    document.getElementById("c-tel").value = data.telefono || "";
    document.getElementById("c-indirizzo").value = data.indirizzo || "";
    document.getElementById("c-note").value = data.note || "";
    const cat = JSON.parse(
      data.categorie_attive ||
        '["IVA","DICHIARAZIONI","PREVIDENZA","LAVORO","TRIBUTI","BILANCIO"]',
    );
    renderCategorieSelect(cat);
    populateTipologiaSelect(data.id_tipologia);
    const tipCodice = _getTipologiaCodice();
    let col2Val = "",
      col3Val = "",
      col4Val = "";
    if (data.id_sottotipologia) {
      let subCode = "";
      for (const t of state.tipologie) {
        const sub = (t.sottotipologie || []).find(
          (s) => s.id === data.id_sottotipologia,
        );
        if (sub) {
          subCode = sub.codice;
          break;
        }
      }
      for (const [key, val] of Object.entries(SOTTOTIPO_MAP)) {
        if (val === subCode) {
          const parts = key.split("|");
          col2Val = parts[1] || "";
          col3Val = parts[2] || "";
          break;
        }
      }
    }
    col4Val = data.periodicita || "";
    setTimeout(() => {
      if (document.getElementById("c-col2"))
        document.getElementById("c-col2").value = col2Val;
      if (document.getElementById("c-col3"))
        document.getElementById("c-col3").value = col3Val;
      aggiornaColonneCliente();
      setTimeout(() => {
        if (document.getElementById("c-col4"))
          document.getElementById("c-col4").value = col4Val;
      }, 50);
    }, 60);
    openModal("modal-cliente");
  });
  socket.emit("get:cliente", { id });
}
function saveCliente() {
  const id = document.getElementById("cliente-id").value;
  const nome = document.getElementById("c-nome").value.trim();
  if (!nome) {
    showNotif("Il nome è obbligatorio", "error");
    return;
  }
  const categorie = getSelectedCategorie();
  if (!categorie.length) {
    showNotif("Seleziona almeno una categoria", "error");
    return;
  }
  const id_sottotipologia = _calcolaSottotipologiaId();
  const col4Val = document.getElementById("c-col4")?.value || "";
  const data = {
    nome,
    id_tipologia: parseInt(document.getElementById("c-tipologia").value),
    id_sottotipologia: id_sottotipologia || null,
    codice_fiscale:
      document.getElementById("c-cf").value.trim().toUpperCase() || null,
    partita_iva: document.getElementById("c-piva").value.trim() || null,
    email: document.getElementById("c-email").value.trim() || null,
    telefono: document.getElementById("c-tel").value.trim() || null,
    indirizzo: document.getElementById("c-indirizzo").value.trim() || null,
    note: document.getElementById("c-note").value.trim() || null,
    categorie_attive: categorie,
    periodicita: col4Val || null,
  };
  if (id) {
    data.id = parseInt(id);
    socket.emit("update:cliente", data);
  } else socket.emit("create:cliente", data);
}
function deleteCliente(id) {
  if (confirm("Eliminare questo cliente?"))
    socket.emit("delete:cliente", { id });
}
function goScadenzario(id) {
  const c = state.clienti.find((x) => x.id === id);
  if (c) {
    state.selectedCliente = c;
    document
      .querySelectorAll(".nav-item")
      .forEach((x) => x.classList.remove("active"));
    document.querySelector('[data-page="scadenzario"]').classList.add("active");
    renderPage("scadenzario");
  } else {
    state._gotoClienteId = id;
    state._pending = "scadenzario";
    socket.emit("get:clienti");
  }
}

// ═══════════════════════════════════════════════════════════════
// HELPER: label e importo
// ═══════════════════════════════════════════════════════════════
function getPeriodoLabel(r) {
  if (r.scadenza_tipo === "trimestrale") {
    const m = { 1: "Gen-Mar", 2: "Apr-Giu", 3: "Lug-Set", 4: "Ott-Dic" };
    return `${r.trimestre}° Trim. (${m[r.trimestre] || ""})`;
  }
  if (r.scadenza_tipo === "semestrale")
    return r.semestre === 1 ? "1° Sem. (Gen-Giu)" : "2° Sem. (Lug-Dic)";
  if (r.scadenza_tipo === "mensile") return MESI[(r.mese || 1) - 1] || "-";
  return "Annuale";
}
function getPeriodoShort(r) {
  if (r.scadenza_tipo === "trimestrale") return `T${r.trimestre}`;
  if (r.scadenza_tipo === "semestrale") return r.semestre === 1 ? "S1" : "S2";
  if (r.scadenza_tipo === "mensile") return MESI_SHORT[(r.mese || 1) - 1];
  return "Ann.";
}
function isContabilita(r) {
  return (
    parseInt(r.is_contabilita) === 1 ||
    r.is_contabilita === true ||
    r.is_contabilita === 1
  );
}
function hasRate(r) {
  return parseInt(r.has_rate) === 1 || r.has_rate === true || r.has_rate === 1;
}

function renderImportoCellCompact(r) {
  if (isContabilita(r)) {
    const iva = r.importo_iva
      ? `€${parseFloat(r.importo_iva).toFixed(2)}`
      : null;
    const cont = r.importo_contabilita
      ? `€${parseFloat(r.importo_contabilita).toFixed(2)}`
      : null;
    if (!iva && !cont) return `<span class="imp-empty">—</span>`;
    return `<div class="importi-cell">${iva ? `<div class="imp-row"><span class="imp-lbl">💰 IVA</span><span class="imp-val">${iva}</span></div>` : ""}${cont ? `<div class="imp-row"><span class="imp-lbl">📊 Cont.</span><span class="imp-val">${cont}</span></div>` : ""}</div>`;
  }
  if (hasRate(r)) {
    let lb = ["Saldo", "1°Acc.", "2°Acc."];
    try {
      if (r.rate_labels) lb = JSON.parse(r.rate_labels);
    } catch (e) {}
    const s = r.importo_saldo
      ? `€${parseFloat(r.importo_saldo).toFixed(2)}`
      : null;
    const a1 = r.importo_acconto1
      ? `€${parseFloat(r.importo_acconto1).toFixed(2)}`
      : null;
    const a2 = r.importo_acconto2
      ? `€${parseFloat(r.importo_acconto2).toFixed(2)}`
      : null;
    if (!s && !a1 && !a2) return `<span class="imp-empty">—</span>`;
    return `<div class="importi-cell">${s ? `<div class="imp-row"><span class="imp-lbl">💰 ${lb[0]}</span><span class="imp-val">${s}</span></div>` : ""}${a1 ? `<div class="imp-row"><span class="imp-lbl">📥 ${lb[1]}</span><span class="imp-val">${a1}</span></div>` : ""}${a2 ? `<div class="imp-row"><span class="imp-lbl">📥 ${lb[2]}</span><span class="imp-val">${a2}</span></div>` : ""}</div>`;
  }
  return r.importo
    ? `<div class="importi-cell"><div class="imp-row"><span class="imp-lbl">💶 Imp.</span><span class="imp-val">€${parseFloat(r.importo).toFixed(2)}</span></div></div>`
    : `<span class="imp-empty">—</span>`;
}
function renderImportoCell(r) {
  if (isContabilita(r)) {
    const iva = r.importo_iva
      ? `€${parseFloat(r.importo_iva).toFixed(2)}`
      : "-";
    const cont = r.importo_contabilita
      ? `€${parseFloat(r.importo_contabilita).toFixed(2)}`
      : "-";
    return `<div class="importi-cell"><div class="imp-row"><span class="imp-lbl">💰 IVA:</span><span class="imp-val">${iva}</span></div><div class="imp-row"><span class="imp-lbl">📊 Contabilità:</span><span class="imp-val">${cont}</span></div></div>`;
  }
  if (hasRate(r)) {
    let lb = ["Saldo", "1° Acconto", "2° Acconto"];
    try {
      if (r.rate_labels) lb = JSON.parse(r.rate_labels);
    } catch (e) {}
    const s = r.importo_saldo
      ? `€${parseFloat(r.importo_saldo).toFixed(2)}`
      : "-";
    const a1 = r.importo_acconto1
      ? `€${parseFloat(r.importo_acconto1).toFixed(2)}`
      : "-";
    const a2 = r.importo_acconto2
      ? `€${parseFloat(r.importo_acconto2).toFixed(2)}`
      : "-";
    return `<div class="importi-cell"><div class="imp-row"><span class="imp-lbl">💰 ${lb[0]}:</span><span class="imp-val">${s}</span></div><div class="imp-row"><span class="imp-lbl">📥 ${lb[1]}:</span><span class="imp-val">${a1}</span></div><div class="imp-row"><span class="imp-lbl">📥 ${lb[2]}:</span><span class="imp-val">${a2}</span></div></div>`;
  }
  return r.importo ? `💶 €${parseFloat(r.importo).toFixed(2)}` : "-";
}
function renderPeriodoRigaCompleta(r) {
  const stato = r.stato || "da_fare";
  const pl = getPeriodoLabel(r),
    ps = getPeriodoShort(r);
  const imp = renderImportoCellCompact(r);
  return `<div class="periodo-row-full s-${stato}" onclick="openAdpById(${r.id})" title="${escAttr(r.adempimento_nome)} — ${escAttr(pl)}: clicca per modificare">
    <div class="periodo-row-header">
      <span class="periodo-tag">${ps}</span>
      <span class="badge b-${stato}" style="font-size:9px">${STATI[stato] || stato}</span>
      ${r.data_scadenza ? `<span class="prf-chip" title="Data scadenza">📅 Scad. <strong>${r.data_scadenza}</strong></span>` : ""}
      ${r.data_completamento ? `<span class="prf-chip prf-chip-green">✅ Compl. <strong>${r.data_completamento}</strong></span>` : ""}
    </div>
    ${
      imp !== `<span class="imp-empty">—</span>` || r.note
        ? `
    <div class="periodo-row-body">
      <div class="periodo-importo-wrap">${imp}</div>
      ${r.note ? `<div class="periodo-note-full">📝 <em>${r.note}</em></div>` : ""}
    </div>`
        : ""
    }
  </div>`;
}

// ═══════════════════════════════════════════════════════════════
// SCADENZARIO SINGOLO
// ═══════════════════════════════════════════════════════════════
function getAdempimentiMancanti() {
  if (!state.selectedCliente) return [];
  const cat = JSON.parse(state.selectedCliente.categorie_attive || "[]");
  const compatibili = state.adempimenti.filter(
    (a) => a.categoria === "TUTTI" || cat.includes(a.categoria),
  );
  return compatibili.filter((a) => !state.adpInseriti.includes(a.id));
}
function renderBtnAddAdp(id_cliente) {
  const mancanti = getAdempimentiMancanti();
  if (!mancanti.length)
    return `<button class="btn btn-sm btn-purple" disabled style="opacity:0.4;cursor:not-allowed">✓ Tutti inseriti</button>`;
  return `<button class="btn btn-sm btn-purple" onclick="openAddAdp(${id_cliente})" title="${mancanti.length} adempimenti da aggiungere">+ Adempimento <span style="font-size:10px;background:rgba(255,255,255,0.2);border-radius:10px;padding:1px 6px;margin-left:2px">${mancanti.length}</span></button>`;
}
function renderScadenzarioPage() {
  const opts = state.clienti
    .map(
      (c) =>
        `<option value="${c.id}" ${state.selectedCliente?.id === c.id ? "selected" : ""}>[${c.tipologia_codice}] ${c.nome}</option>`,
    )
    .join("");
  document.getElementById("topbar-actions").innerHTML = `
    <select class="select" id="sel-cliente" style="width:260px" onchange="onClienteChange()">
      <option value="">-- Seleziona Cliente --</option>${opts}
    </select>
    <div class="year-sel"><button onclick="changeAnnoScad(-1)">&#9664;</button><span class="year-num">${state.anno}</span><button onclick="changeAnnoScad(1)">&#9654;</button></div>
    <div class="search-wrap" style="width:200px"><span class="search-icon">🔍</span><input class="input" id="scad-search" placeholder="Cerca adempimento..." oninput="applyScadSearch()"></div>`;
  if (state.selectedCliente) loadScadenzario();
  else
    document.getElementById("content").innerHTML =
      `<div class="empty"><div class="empty-icon">📅</div><p>Seleziona un cliente dalla lista in alto</p></div>`;
}
function onClienteChange() {
  const id = parseInt(document.getElementById("sel-cliente").value);
  state.selectedCliente = state.clienti.find((c) => c.id === id) || null;
  state.adpInseriti = [];
  if (state.selectedCliente) loadScadenzario();
}
function changeAnnoScad(d) {
  state.anno += d;
  document
    .querySelectorAll(".year-num")
    .forEach((el) => (el.textContent = state.anno));
  if (state.selectedCliente) loadScadenzario();
}
function loadScadenzario() {
  const sv = document.getElementById("scad-search")?.value || "";
  const st = document.getElementById("f-stato")?.value || "tutti";
  socket.emit("get:scadenzario", {
    id_cliente: state.selectedCliente.id,
    anno: state.anno,
    filtro_stato: st,
    filtro_adempimento: sv,
  });
}
const applyScadSearchDB = debounce(loadScadenzario, 300);
function applyScadSearch() {
  applyScadSearchDB();
}
function applyScadFiltri() {
  loadScadenzario();
}
function resetScadFiltri() {
  if (document.getElementById("f-stato"))
    document.getElementById("f-stato").value = "tutti";
  if (document.getElementById("scad-search"))
    document.getElementById("scad-search").value = "";
  loadScadenzario();
}
function renderScadenzarioTabella(righe) {
  _rowStore = {};
  righe.forEach((r) => storeRow(r));
  const c = state.selectedCliente;
  const tot = righe.length,
    comp = righe.filter((r) => r.stato === "completato").length;
  const daF = righe.filter((r) => r.stato === "da_fare").length;
  const inC = righe.filter((r) => r.stato === "in_corso").length;
  const na = righe.filter((r) => r.stato === "n_a").length;
  const perc = tot > 0 ? Math.round((comp / tot) * 100) : 0;
  const grouped = {};
  righe.forEach((r) => {
    if (!grouped[r.id_adempimento]) grouped[r.id_adempimento] = [];
    grouped[r.id_adempimento].push(r);
  });
  Object.values(grouped).forEach((rows) =>
    rows.sort(
      (a, b) =>
        (a.trimestre || 0) - (b.trimestre || 0) ||
        (a.semestre || 0) - (b.semestre || 0) ||
        (a.mese || 0) - (b.mese || 0),
    ),
  );
  const tbody =
    Object.entries(grouped)
      .map(([, rows]) => {
        const r0 = rows[0];
        const isMulti =
          r0.scadenza_tipo === "mensile" ||
          r0.scadenza_tipo === "trimestrale" ||
          r0.scadenza_tipo === "semestrale";
        const totR = rows.length,
          compR = rows.filter((x) => x.stato === "completato").length;
        const percR = totR > 0 ? Math.round((compR / totR) * 100) : 0;
        const flagsBadge =
          (isContabilita(r0)
            ? `<span class="badge" style="background:var(--cyan-dim);color:var(--cyan);font-size:9px">CONT.</span>`
            : "") +
          (hasRate(r0)
            ? `<span class="badge" style="background:var(--green-dim);color:var(--green);font-size:9px">RATE</span>`
            : "");
        const adpLabelTd = `<td class="adp-label-td"><span class="adp-codice">${r0.codice}</span><span class="adp-nome">${r0.adempimento_nome}</span><span class="badge b-categoria" style="margin-top:4px">${r0.categoria || "-"}</span>${flagsBadge ? `<div style="margin-top:4px;display:flex;gap:3px;flex-wrap:wrap">${flagsBadge}</div>` : ""}</td>`;
        if (isMulti) {
          const descP =
            r0.scadenza_tipo === "semestrale"
              ? "2 semestri"
              : r0.scadenza_tipo === "trimestrale"
                ? "4 trimestri"
                : "12 mesi";
          return `<tr>${adpLabelTd}<td colspan="5"><div style="display:flex;align-items:flex-start;gap:14px"><div style="flex:1;min-width:0"><div class="periodi-desc-label">${r0.adempimento_nome} — ${descP}</div><div class="periodi-lista">${rows.map((rx) => renderPeriodoRigaCompleta(rx)).join("")}</div></div><div class="periodi-progress"><div style="font-size:11px;color:var(--text2);margin-bottom:4px">${compR}/${totR}</div><div class="prog-bar" style="width:80px"><div class="prog-fill green" style="width:${percR}%"></div></div><div style="font-size:10px;color:var(--text3);margin-top:3px">${percR}%</div></div></div></td></tr>`;
        }
        return rows
          .map(
            (
              rx,
              i,
            ) => `<tr class="clickable s-${rx.stato}" onclick="openAdpById(${rx.id})">${i === 0 ? adpLabelTd : `<td class="adp-label-td-empty"></td>`}
      <td>${getPeriodoLabel(rx)}</td>
      <td><span class="badge b-${rx.stato}">${STATI[rx.stato] || rx.stato}</span></td>
      <td>${renderImportoCell(rx)}</td>
      <td class="td-mono td-dim" style="font-size:11px">${rx.data_scadenza || "-"}</td>
      <td class="td-mono td-dim" style="font-size:11px">${rx.data_completamento || "-"}</td>
      <td class="td-dim" style="font-size:11px;max-width:120px;overflow:hidden;text-overflow:ellipsis" title="${escAttr(rx.note || "")}">${rx.note || ""}</td>
    </tr>`,
          )
          .join("");
      })
      .join("") ||
    `<tr><td colspan="7"><div class="empty"><div class="empty-icon">📋</div><p>Nessun adempimento. Clicca Genera.</p></div></td></tr>`;

  document.getElementById("content").innerHTML = `
    <div class="print-header"><strong>Studio Commerciale - Scadenzario</strong><br>Cliente: <strong>${c.nome}</strong> | Anno: <strong>${state.anno}</strong> | Stampa: ${new Date().toLocaleDateString("it-IT")}</div>
    <div class="cliente-preview-card">
      <div class="cpc-avatar-wrap"><div class="cpc-avatar">${(c.nome || "?").charAt(0).toUpperCase()}</div></div>
      <div class="cpc-info">
        <div class="cpc-nome">${c.nome}</div>
        <div class="cpc-sub">${c.tipologia_nome || ""}${c.sottotipologia_nome ? " · " + c.sottotipologia_nome : ""}</div>
        <div class="cpc-meta-row">
          ${c.codice_fiscale ? `<span class="cpc-meta-chip">🪪 CF: <strong>${c.codice_fiscale}</strong></span>` : ""}
          ${c.partita_iva ? `<span class="cpc-meta-chip">🏢 P.IVA: <strong>${c.partita_iva}</strong></span>` : ""}
          ${c.email ? `<span class="cpc-meta-chip">📧 <strong>${c.email}</strong></span>` : ""}
          ${c.telefono ? `<span class="cpc-meta-chip">📞 <strong>${c.telefono}</strong></span>` : ""}
        </div>
      </div>
      <div class="cpc-stats">
        <div class="cpc-stat-item"><div class="cpc-stat-num v-blue">${tot}</div><div class="cpc-stat-lbl">Totale</div></div>
        <div class="cpc-stat-item"><div class="cpc-stat-num v-green">${comp}</div><div class="cpc-stat-lbl">Completati</div></div>
        <div class="cpc-stat-item"><div class="cpc-stat-num v-yellow">${daF}</div><div class="cpc-stat-lbl">Da fare</div></div>
        <div class="cpc-stat-item"><div class="cpc-stat-num v-purple">${inC}</div><div class="cpc-stat-lbl">In corso</div></div>
        <div class="cpc-stat-item"><div class="cpc-stat-num" style="color:var(--text3)">${na}</div><div class="cpc-stat-lbl">N/A</div></div>
        <div class="cpc-stat-item"><div class="cpc-stat-num v-green">${perc}%</div><div class="cpc-stat-lbl">Avanz.</div><div class="prog-bar" style="width:60px;margin-top:4px"><div class="prog-fill green" style="width:${perc}%"></div></div></div>
      </div>
      <div class="cpc-actions no-print">
        <div id="btn-add-adp-wrap">${renderBtnAddAdp(c.id)}</div>
        <button class="btn btn-sm btn-secondary" onclick="openCopia(${c.id})">Copia anno</button>
        <button class="btn btn-sm btn-primary" onclick="generaScad(${c.id})">⚡ Genera ${state.anno}</button>
        <button class="btn btn-print btn-sm" onclick="window.print()">🖨️ Stampa</button>
      </div>
    </div>
    <div class="filtri-bar no-print">
      <label>Filtra:</label>
      <select class="select" style="width:150px" id="f-stato" onchange="applyScadFiltri()">
        <option value="tutti">Tutti</option><option value="da_fare">Da fare</option>
        <option value="in_corso">In corso</option><option value="completato">Completato</option><option value="n_a">N/A</option>
      </select>
      <button class="btn btn-sm btn-secondary" onclick="resetScadFiltri()">Reset</button>
    </div>
    <div class="table-wrap">
      <div class="table-header no-print"><h3>Scadenzario ${state.anno}</h3></div>
      <table><thead><tr><th>Adempimento</th><th>Periodo</th><th>Stato</th><th>Importo</th><th>Scadenza</th><th>Completato</th><th>Note</th></tr></thead>
      <tbody>${tbody}</tbody></table>
    </div>`;
  if (document.getElementById("f-stato"))
    document.getElementById("f-stato").value = state.filtri.stato;
}
function generaScad(id) {
  if (confirm(`Generare scadenzario ${state.anno}?`))
    socket.emit("genera:scadenzario", { id_cliente: id, anno: state.anno });
}
function openGeneraTutti() {
  document.getElementById("genera-tutti-anno").value = state.anno;
  openModal("modal-genera-tutti");
}
function eseguiGeneraTutti() {
  const anno = parseInt(document.getElementById("genera-tutti-anno").value);
  if (!anno) return;
  socket.emit("genera:tutti", { anno });
}
function openCopiaTutti() {
  document.getElementById("copia-cliente-id").value = "";
  document.getElementById("copia-modalita").value = "tutti";
  document.getElementById("copia-info").innerHTML =
    "Copia per tutti i clienti.";
  document.getElementById("copia-da").value = state.anno - 1;
  document.getElementById("copia-a").value = state.anno;
  openModal("modal-copia");
}
function eseguiCopia() {
  const m = document.getElementById("copia-modalita").value;
  const da = parseInt(document.getElementById("copia-da").value),
    a = parseInt(document.getElementById("copia-a").value);
  if (m === "tutti") socket.emit("copia:tutti", { anno_da: da, anno_a: a });
  else
    socket.emit("copia:scadenzario", {
      id_cliente: parseInt(document.getElementById("copia-cliente-id").value),
      anno_da: da,
      anno_a: a,
    });
}

// ═══════════════════════════════════════════════════════════════
// VISTA GLOBALE
// ═══════════════════════════════════════════════════════════════
function calcolaGlobaleStats(righe) {
  const clientiSet = new Set(righe.map((r) => r.id_cliente));
  const tot = righe.length,
    comp = righe.filter((r) => r.stato === "completato").length;
  const daF = righe.filter((r) => r.stato === "da_fare").length;
  const inC = righe.filter((r) => r.stato === "in_corso").length;
  const na = righe.filter((r) => r.stato === "n_a").length;
  const perc = tot > 0 ? Math.round((comp / tot) * 100) : 0;
  const perCat = {};
  righe.forEach((r) => {
    if (!perCat[r.categoria])
      perCat[r.categoria] = { totale: 0, completati: 0, da_fare: 0 };
    perCat[r.categoria].totale++;
    if (r.stato === "completato") perCat[r.categoria].completati++;
    if (r.stato === "da_fare") perCat[r.categoria].da_fare++;
  });
  return { clienti: clientiSet.size, tot, comp, daF, inC, na, perc, perCat };
}
function renderGlobalePage() {
  const preSearch = state.globalePreFiltroAdp || "";
  document.getElementById("topbar-actions").innerHTML = `
    <div class="search-wrap" style="width:260px"><span class="search-icon">🔍</span><input class="input" id="global-search-globale" placeholder="Cerca cliente, adempimento..." value="${escAttr(preSearch)}" oninput="onGlobaleSearchInput(this.value)"></div>
    <div class="year-sel"><button onclick="changeAnnoGlobale(-1)">&#9664;</button><span class="year-num">${state.anno}</span><button onclick="changeAnnoGlobale(1)">&#9654;</button></div>
    ${preSearch ? `<button class="btn btn-xs btn-secondary no-print" onclick="clearGlobalePrefiltro()">✕ "${escAttr(preSearch)}"</button>` : ""}
    <button class="btn btn-print btn-sm no-print" onclick="window.print()">🖨️ Stampa</button>`;
  document.getElementById("content").innerHTML = `
    <div class="print-header"><strong>Studio Commerciale - Vista Globale ${state.anno}</strong><br>Stampa: ${new Date().toLocaleDateString("it-IT")}</div>
    <div id="globale-header-panel"></div>
    <div class="filtri-bar no-print">
      <label>Stato:</label>
      <select class="select" style="width:150px" id="fg-stato" onchange="applyGlobaleFiltri()">
        <option value="tutti">Tutti</option><option value="da_fare">Da fare</option><option value="in_corso">In corso</option><option value="completato">Completato</option><option value="n_a">N/A</option>
      </select>
      <label>Categoria:</label>
      <select class="select" style="width:160px" id="fg-categoria" onchange="applyGlobaleFiltri()">
        <option value="tutti">Tutte</option>
        ${CATEGORIE.map((c) => `<option value="${c.codice}">${c.nome}</option>`).join("")}
        <option value="TUTTI">Tutti</option>
      </select>
    </div>
    <div id="globale-content"><div class="empty" style="padding:40px">⏳ Caricamento...</div></div>`;
  if (document.getElementById("fg-stato"))
    document.getElementById("fg-stato").value = state.filtri.stato;
  if (document.getElementById("fg-categoria"))
    document.getElementById("fg-categoria").value = state.filtri.categoria;
  loadGlobale(preSearch);
}
function renderGlobaleHeader() {
  const el = document.getElementById("globale-header-panel");
  if (!el) return;
  const gs = state.globaleStats;
  if (!gs || gs.tot === 0) {
    el.innerHTML = "";
    return;
  }
  const catColor = {};
  CATEGORIE.forEach((c) => (catColor[c.codice] = c.color));
  const catBadges = Object.entries(gs.perCat)
    .sort((a, b) => b[1].totale - a[1].totale)
    .map(([cat, d]) => {
      const p = d.totale > 0 ? Math.round((d.completati / d.totale) * 100) : 0;
      const col = catColor[cat] || "var(--accent)";
      return `<div class="gph-cat-chip" style="border-color:${col}33"><span style="color:${col};font-size:10px;font-weight:800">${cat}</span><span class="badge b-completato" style="font-size:8px;padding:1px 5px">${d.completati}✓</span><span class="badge b-da_fare" style="font-size:8px;padding:1px 5px">${d.da_fare}⭕</span><div class="mini-bar" style="width:36px"><div class="mini-fill" style="width:${p}%"></div></div><span style="font-size:9px;color:var(--text3);font-family:var(--mono)">${p}%</span></div>`;
    })
    .join("");
  const filterTags = [];
  if (state.globalePreFiltroAdp)
    filterTags.push(
      `<span class="ctx-tag">🔍 "${escAttr(state.globalePreFiltroAdp)}"</span>`,
    );
  if (state.filtri.stato !== "tutti")
    filterTags.push(
      `<span class="ctx-tag">Stato: ${STATI[state.filtri.stato] || state.filtri.stato}</span>`,
    );
  if (state.filtri.categoria !== "tutti")
    filterTags.push(
      `<span class="ctx-tag">Cat: ${state.filtri.categoria}</span>`,
    );
  filterTags.push(
    `<span class="ctx-tag ctx-tag-anno">📅 Anno: ${state.anno}</span>`,
  );
  el.innerHTML = `<div class="globale-preview-card">
    <div class="gpc-left"><div class="gpc-globe">🌐</div><div><div class="gpc-title">Vista Globale ${state.anno}</div><div class="gpc-sub">${gs.clienti} client${gs.clienti === 1 ? "e" : "i"} — ${gs.tot} adempiment${gs.tot === 1 ? "o" : "i"}</div><div class="gpc-ctx-tags">${filterTags.join("")}</div></div></div>
    <div class="gpc-stats">
      <div class="cpc-stat-item"><div class="cpc-stat-num v-green">${gs.comp}</div><div class="cpc-stat-lbl">Completati</div></div>
      <div class="cpc-stat-item"><div class="cpc-stat-num v-yellow">${gs.daF}</div><div class="cpc-stat-lbl">Da fare</div></div>
      <div class="cpc-stat-item"><div class="cpc-stat-num v-purple">${gs.inC}</div><div class="cpc-stat-lbl">In corso</div></div>
      <div class="cpc-stat-item"><div class="cpc-stat-num" style="color:var(--text3)">${gs.na}</div><div class="cpc-stat-lbl">N/A</div></div>
      <div class="cpc-stat-item"><div class="cpc-stat-num v-green">${gs.perc}%</div><div class="cpc-stat-lbl">Avanz. globale</div><div class="prog-bar" style="width:70px;margin-top:4px"><div class="prog-fill green" style="width:${gs.perc}%"></div></div></div>
    </div>
    <div class="gpc-cats">${catBadges}</div>
  </div>`;
}
function clearGlobalePrefiltro() {
  state.globalePreFiltroAdp = "";
  renderGlobalePage();
}
function onGlobaleSearchInput(val) {
  state.globalePreFiltroAdp = val;
  applyGlobaleSearchDB();
}
function loadGlobale(searchOverride) {
  const search =
    searchOverride !== undefined
      ? searchOverride
      : document.getElementById("global-search-globale")?.value || "";
  socket.emit("get:scadenzario_globale", {
    anno: state.anno,
    filtro_stato: state.filtri.stato,
    filtro_categoria: state.filtri.categoria,
    search,
  });
}
function changeAnnoGlobale(d) {
  state.anno += d;
  document
    .querySelectorAll(".year-num")
    .forEach((el) => (el.textContent = state.anno));
  loadGlobale();
}
function applyGlobaleFiltri() {
  state.filtri.stato = document.getElementById("fg-stato")?.value || "tutti";
  state.filtri.categoria =
    document.getElementById("fg-categoria")?.value || "tutti";
  loadGlobale();
}
const applyGlobaleSearchDB = debounce(loadGlobale, 300);
function renderGlobaleTabella(righe) {
  righe.forEach((r) => storeRow(r));
  const container = document.getElementById("globale-content");
  if (!container) return;
  const perCliente = {};
  righe.forEach((r) => {
    if (!perCliente[r.id_cliente])
      perCliente[r.id_cliente] = {
        id: r.id_cliente,
        nome: r.cliente_nome,
        tipo: r.tipologia_codice,
        righe: [],
      };
    perCliente[r.id_cliente].righe.push(r);
  });
  if (!Object.keys(perCliente).length) {
    container.innerHTML = `<div class="empty"><div class="empty-icon">📋</div><p>Nessun risultato per i filtri selezionati</p></div>`;
    return;
  }
  const html = Object.values(perCliente)
    .map((cl) => {
      const comp = cl.righe.filter((r) => r.stato === "completato").length;
      const daF = cl.righe.filter((r) => r.stato === "da_fare").length;
      const inC = cl.righe.filter((r) => r.stato === "in_corso").length;
      const na = cl.righe.filter((r) => r.stato === "n_a").length;
      const perc =
        cl.righe.length > 0 ? Math.round((comp / cl.righe.length) * 100) : 0;
      const groupedAdp = {};
      cl.righe.forEach((r) => {
        if (!groupedAdp[r.id_adempimento])
          groupedAdp[r.id_adempimento] = {
            nome: r.adempimento_nome,
            codice: r.codice,
            categoria: r.categoria,
            scad: r.scadenza_tipo,
            ic: r.is_contabilita,
            hr: r.has_rate,
            rl: r.rate_labels,
            totale: 0,
            completati: 0,
            da_fare: 0,
            in_corso: 0,
            righe: [],
          };
        const ga = groupedAdp[r.id_adempimento];
        ga.totale++;
        if (r.stato === "completato") ga.completati++;
        if (r.stato === "da_fare") ga.da_fare++;
        if (r.stato === "in_corso") ga.in_corso++;
        ga.righe.push(r);
      });
      const adpRows = Object.values(groupedAdp)
        .map((adp) => {
          const p2 =
            adp.totale > 0
              ? Math.round((adp.completati / adp.totale) * 100)
              : 0;
          const isMulti =
            adp.scad === "mensile" ||
            adp.scad === "trimestrale" ||
            adp.scad === "semestrale";
          const flagsBadge =
            (isContabilita({ is_contabilita: adp.ic })
              ? `<span class="badge" style="background:var(--cyan-dim);color:var(--cyan);font-size:9px">CONT.</span>`
              : "") +
            (hasRate({ has_rate: adp.hr })
              ? `<span class="badge" style="background:var(--green-dim);color:var(--green);font-size:9px">RATE</span>`
              : "");
          let periodoCell;
          if (isMulti) {
            const sorted = adp.righe
              .slice()
              .sort((a, b) =>
                adp.scad === "mensile"
                  ? (a.mese || 0) - (b.mese || 0)
                  : adp.scad === "trimestrale"
                    ? (a.trimestre || 0) - (b.trimestre || 0)
                    : (a.semestre || 0) - (b.semestre || 0),
              );
            const descT =
              adp.scad === "semestrale"
                ? "2 semestri (Gen-Giu · Lug-Dic)"
                : adp.scad === "trimestrale"
                  ? "4 trimestri"
                  : "12 mesi";
            periodoCell = `<div><div class="periodi-desc-label">${adp.nome} — ${descT}</div><div class="periodi-globale-wrap">${sorted
              .map((rx) => {
                const imp = renderImportoCellCompact(rx),
                  ps = getPeriodoShort(rx);
                return `<div class="periodo-globale-row s-${rx.stato}" onclick="openAdpById(${rx.id})"><div class="pga-label"><span class="periodo-tag-sm">${ps}</span></div><div class="pga-stato"><span class="badge b-${rx.stato}" style="font-size:8px">${STATI[rx.stato] || rx.stato}</span></div><div class="pga-importo">${imp}</div><div class="pga-date">${rx.data_scadenza ? `<span class="pga-date-chip">📅 ${rx.data_scadenza}</span>` : ""}${rx.data_completamento ? `<span class="pga-date-chip" style="color:var(--green)">✅ ${rx.data_completamento}</span>` : ""}</div><div class="pga-note">${rx.note ? `<span class="pga-note-txt">📝 ${rx.note}</span>` : ""}</div></div>`;
              })
              .join("")}</div></div>`;
          } else {
            const rx = adp.righe[0],
              imp = renderImportoCellCompact(rx),
              pl = getPeriodoLabel(rx);
            periodoCell = `<div class="periodo-globale-row s-${rx.stato}" onclick="openAdpById(${rx.id})"><div class="pga-label"><span class="periodo-tag-sm">${pl}</span></div><div class="pga-stato"><span class="badge b-${rx.stato}" style="font-size:8px">${STATI[rx.stato] || rx.stato}</span></div><div class="pga-importo">${imp}</div><div class="pga-date">${rx.data_scadenza ? `<span class="pga-date-chip">📅 ${rx.data_scadenza}</span>` : ""}${rx.data_completamento ? `<span class="pga-date-chip" style="color:var(--green)">✅ ${rx.data_completamento}</span>` : ""}</div><div class="pga-note">${rx.note ? `<span class="pga-note-txt">📝 ${rx.note}</span>` : ""}</div></div>`;
          }
          return `<tr><td class="td-mono" style="font-size:10px;color:var(--accent);white-space:nowrap;vertical-align:top;padding-top:10px">${adp.codice}</td><td style="vertical-align:top;padding-top:10px"><strong style="font-size:12px">${adp.nome}</strong>${flagsBadge ? `<div style="margin-top:3px;display:flex;gap:3px">${flagsBadge}</div>` : ""}</td><td style="vertical-align:top;padding-top:10px"><span class="badge b-categoria">${adp.categoria || "-"}</span></td><td style="min-width:320px;padding:6px 14px">${periodoCell}</td><td style="white-space:nowrap;vertical-align:top;padding-top:10px"><span class="badge b-completato" style="margin-bottom:3px;display:block">✓ ${adp.completati}</span><span class="badge b-da_fare" style="display:block">⭕ ${adp.da_fare}</span>${adp.in_corso > 0 ? `<span class="badge b-in_corso" style="display:block">🔄 ${adp.in_corso}</span>` : ""}</td><td style="vertical-align:top;padding-top:10px"><div style="display:flex;align-items:center;gap:6px"><div class="mini-bar" style="width:55px"><div class="mini-fill" style="width:${p2}%"></div></div><span style="font-size:10px;font-family:var(--mono);color:var(--text3)">${p2}%</span></div></td></tr>`;
        })
        .join("");
      return `<div class="table-wrap" style="margin-bottom:14px"><div class="table-header" style="cursor:pointer" onclick="toggleSection(this)"><span class="badge b-${(cl.tipo || "").toLowerCase()}" style="margin-right:6px">${cl.tipo}</span><h3>${cl.nome}</h3><div style="display:flex;align-items:center;gap:8px;margin-left:8px"><span class="badge b-completato">✓ ${comp}</span><span class="badge b-da_fare">⭕ ${daF}</span>${inC > 0 ? `<span class="badge b-in_corso">🔄 ${inC}</span>` : ""}${na > 0 ? `<span class="badge b-n_a">➖ ${na}</span>` : ""}</div><div class="mini-bar" style="width:70px;display:inline-block;margin-left:8px"><div class="mini-fill" style="width:${perc}%"></div></div><span style="font-size:10px;font-family:var(--mono);color:var(--text3);margin-left:4px">${perc}%</span><span class="toggle-arrow" style="margin-left:auto">▾</span></div><div class="section-body"><table><thead><tr><th style="width:70px">Codice</th><th>Adempimento</th><th style="width:90px">Categoria</th><th>Periodi · Importi · Date · Note</th><th style="width:90px">Riepilogo</th><th style="width:100px">Avanz.</th></tr></thead><tbody>${adpRows}</tbody></table></div></div>`;
    })
    .join("");
  container.innerHTML = html;
}
function toggleSection(header) {
  const body = header.nextElementSibling,
    arrow = header.querySelector(".toggle-arrow");
  if (body.style.display === "none") {
    body.style.display = "";
    if (arrow) arrow.textContent = "▾";
  } else {
    body.style.display = "none";
    if (arrow) arrow.textContent = "▸";
  }
}

// ═══════════════════════════════════════════════════════════════
// ADEMPIMENTI
// ═══════════════════════════════════════════════════════════════
const applyAdpFiltriDB = debounce(() => {
  const q = document.getElementById("global-search-adempimenti")?.value || "";
  socket.emit("get:adempimenti", { search: q });
}, 300);
function applyAdempimentiFiltri() {
  applyAdpFiltriDB();
}
function renderAdempimentiPage() {
  renderAdempimentiTabella(state.adempimenti);
}
function renderAdempimentiTabella(adempimenti) {
  const sl = {
    annuale: "1x/anno",
    semestrale: "2x/anno",
    trimestrale: "4x/anno",
    mensile: "12x/anno",
  };
  const rows =
    adempimenti
      .map((a) => {
        const flags = [];
        if (a.is_contabilita)
          flags.push(
            `<span class="badge" style="background:var(--cyan-dim);color:var(--cyan);font-size:9px">CONT.</span>`,
          );
        if (a.has_rate)
          flags.push(
            `<span class="badge" style="background:var(--green-dim);color:var(--green);font-size:9px">RATE</span>`,
          );
        return `<tr><td><span style="font-family:var(--mono);font-weight:700;color:var(--accent)">${a.codice}</span></td>
      <td><strong>${a.nome}</strong></td><td class="td-dim" style="font-size:12px">${a.descrizione || "-"}</td>
      <td><span class="badge b-categoria">${a.categoria || "-"}</span></td>
      <td><span style="font-family:var(--mono);font-size:11px">${a.scadenza_tipo || "-"}</span></td>
      <td><span style="font-family:var(--mono);font-size:11px;background:var(--accent-dim);color:var(--accent);padding:2px 6px;border-radius:4px">${sl[a.scadenza_tipo] || a.scadenza_tipo}</span></td>
      <td>${flags.join(" ") || "-"}</td>
      <td class="col-actions no-print"><div style="display:flex;gap:4px"><button class="btn btn-xs btn-secondary" onclick="editAdpDef(${a.id})">Modifica</button><button class="btn btn-xs btn-danger" onclick="deleteAdpDef(${a.id})">Elimina</button></div></td>
    </tr>`;
      })
      .join("") ||
    `<tr><td colspan="8"><div class="empty">Nessun adempimento trovato</div></td></tr>`;
  document.getElementById("content").innerHTML = `
    <div class="print-header"><strong>Studio Commerciale - Adempimenti</strong><br>Stampa: ${new Date().toLocaleDateString("it-IT")} - Tot: ${adempimenti.length}</div>
    <div class="infobox" style="margin-bottom:16px">Ogni nuovo adempimento viene automaticamente assegnato a tutti i clienti con la categoria corrispondente.</div>
    <div class="table-wrap">
      <div class="table-header no-print"><h3>Adempimenti (${adempimenti.length})</h3></div>
      <table><thead><tr><th>Codice</th><th>Nome</th><th>Descrizione</th><th>Categoria</th><th>Cadenza</th><th>Periodi/anno</th><th>Flags</th><th class="no-print">Azioni</th></tr></thead>
      <tbody>${rows}</tbody></table>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
// TIPOLOGIE — PAGINA VISIVA COMPLETA CON TUTTE 4 COLONNE
// ═══════════════════════════════════════════════════════════════
function renderTipologiePage() {
  document.getElementById("topbar-actions").innerHTML = "";

  const tipologieVisive = [
    {
      codice: "PF",
      nome: "Persona Fisica",
      desc: "Contribuente persona fisica",
      colore: "#5b8df6",
      coloreAlt: "rgba(91,141,246,0.08)",
      col2: COL2_OPTIONS.PF,
      col3Map: {
        privato: null,
        socio: null,
        ditta: getCol3Options("PF", "ditta"),
        professionista: getCol3Options("PF", "professionista"),
      },
      showCol4: true,
    },
    {
      codice: "SP",
      nome: "Società di Persone",
      desc: "SNC, SAS, SS",
      colore: "#a78bfa",
      coloreAlt: "rgba(167,139,250,0.08)",
      col2: null,
      col3: getCol3Options("SP", ""),
      showCol4: true,
    },
    {
      codice: "SC",
      nome: "Società di Capitali",
      desc: "SRL, SPA, SAPA",
      colore: "#34d399",
      coloreAlt: "rgba(52,211,153,0.08)",
      col2: null,
      col3: getCol3Options("SC", ""),
      showCol4: true,
    },
    {
      codice: "ASS",
      nome: "Associazione",
      desc: "Associazioni e enti non commerciali",
      colore: "#fbbf24",
      coloreAlt: "rgba(251,191,36,0.08)",
      col2: null,
      col3: getCol3Options("ASS", ""),
      showCol4: true,
    },
  ];

  function colBlock(num, label, c, content, note = "") {
    return `<div class="tip-col-block" style="border-color:${c}40;background:${c}08">
      <div class="tip-col-num" style="background:${c};color:#fff">${num}</div>
      <div class="tip-col-label">${label}</div>
      ${content}
      ${note ? `<div class="tip-col-note">${note}</div>` : ""}
    </div>`;
  }
  function colItems(opts) {
    return opts
      .map((o) => `<div class="tip-col-item">${o.label || o}</div>`)
      .join("");
  }
  function arrow(c, skip = false) {
    return `<div class="tip-flow-arrow${skip ? " tip-flow-skip" : ""}" style="color:${c}">${skip ? "▶▶" : "▶"}</div>`;
  }

  function buildFlowCard(tip) {
    const c = tip.colore;
    let cols = [];

    // ── COL 1: Tipologia ──────────────────────────────────────
    cols.push(
      colBlock(
        1,
        "Tipologia",
        c,
        `<div class="tip-col-value" style="color:${c}">${tip.codice}</div><div class="tip-col-sub">${tip.nome}</div>`,
      ),
    );

    // ── COL 2: Solo PF ────────────────────────────────────────
    if (tip.col2) {
      cols.push(arrow(c));
      cols.push(
        colBlock(
          2,
          "Sottocategoria PF",
          c,
          colItems(tip.col2),
          "Solo per Persona Fisica",
        ),
      );
    } else {
      cols.push(arrow(c, true));
      // placeholder col2 vuoto per allineamento
      cols.push(`<div class="tip-col-block tip-col-skip" style="border-color:${c}20;background:${c}04;opacity:0.4">
        <div class="tip-col-num" style="background:${c}40;color:${c}">2</div>
        <div class="tip-col-label">Sottocategoria</div>
        <div class="tip-col-note" style="font-size:10px">Non applicabile<br>per ${tip.codice}</div>
      </div>`);
    }

    // ── COL 3: Regime ─────────────────────────────────────────
    cols.push(arrow(c));
    if (tip.col3) {
      // SP / SC / ASS: col3 sempre visibile
      cols.push(colBlock(3, "Regime contabile", c, colItems(tip.col3)));
    } else if (tip.col2) {
      // PF: col3 dipende da col2 — mostro entrambe le varianti
      const dittaOpts = tip.col3Map.ditta || [];
      cols.push(`<div class="tip-col-block" style="border-color:${c}40;background:${c}08">
        <div class="tip-col-num" style="background:${c};color:#fff">3</div>
        <div class="tip-col-label">Regime contabile</div>
        <div class="tip-col-note" style="margin-bottom:4px">Per Privato / Socio:</div>
        <div class="tip-col-item" style="opacity:0.5;font-style:italic">— Non richiesto —</div>
        <div class="tip-col-note" style="margin:6px 0 4px">Per Ditta / Prof.:</div>
        ${colItems(dittaOpts)}
      </div>`);
    }

    // ── COL 4: Periodicità ────────────────────────────────────
    cols.push(arrow(c));
    cols.push(
      colBlock(
        4,
        "Periodicità IVA",
        c,
        `<div class="tip-col-item">📅 Mensile</div><div class="tip-col-item">📆 Trimestrale</div>`,
        "Visibile dopo selezione regime",
      ),
    );

    return `
      <div class="tip-flow-card">
        <div class="tip-flow-header" style="border-left:4px solid ${c};background:${tip.coloreAlt}">
          <div style="display:flex;align-items:center;gap:14px">
            <div class="tip-flow-code" style="color:${c}">${tip.codice}</div>
            <div>
              <div class="tip-flow-nome">${tip.nome}</div>
              <div class="tip-flow-desc">${tip.desc}</div>
            </div>
            <div style="margin-left:auto;display:flex;gap:6px;flex-wrap:wrap">
              ${tip.col2 ? `<span style="font-size:10px;padding:3px 8px;border-radius:4px;background:${c}20;color:${c};font-weight:700">4 colonne attive</span>` : `<span style="font-size:10px;padding:3px 8px;border-radius:4px;background:${c}20;color:${c};font-weight:700">Col.2 saltata → 3 colonne</span>`}
            </div>
          </div>
        </div>
        <div class="tip-flow-body">
          ${cols.join("")}
        </div>
      </div>`;
  }

  const html = `
    <div class="print-header"><strong>Studio Commerciale - Tipologie Clienti</strong><br>Stampa: ${new Date().toLocaleDateString("it-IT")}</div>

    <div class="infobox" style="margin-bottom:20px">
      🗂️ La classificazione avviene in <strong>4 colonne a cascata</strong>. Le colonne si attivano in sequenza in base alle scelte precedenti.<br>
      Per <strong>SP, SC, ASS</strong> la colonna 2 è saltata automaticamente. La colonna 4 (periodicità) appare solo dopo aver selezionato un regime nella colonna 3.
    </div>

    <!-- LEGENDA RAPIDA -->
    <div class="tip-legenda-grid">
      <div class="tip-legenda-item">
        <div class="tip-legenda-num" style="background:#5b8df6">1</div>
        <div><div class="tip-legenda-titolo">Tipologia</div><div class="tip-legenda-sub">PF · SP · SC · ASS</div></div>
      </div>
      <div class="tip-legenda-arrow">▶</div>
      <div class="tip-legenda-item">
        <div class="tip-legenda-num" style="background:#a78bfa">2</div>
        <div><div class="tip-legenda-titolo">Sottocategoria</div><div class="tip-legenda-sub">Solo per PF</div></div>
      </div>
      <div class="tip-legenda-arrow">▶</div>
      <div class="tip-legenda-item">
        <div class="tip-legenda-num" style="background:#34d399">3</div>
        <div><div class="tip-legenda-titolo">Regime</div><div class="tip-legenda-sub">Ordinario · Semplif. · Forf.</div></div>
      </div>
      <div class="tip-legenda-arrow">▶</div>
      <div class="tip-legenda-item">
        <div class="tip-legenda-num" style="background:#fbbf24">4</div>
        <div><div class="tip-legenda-titolo">Periodicità</div><div class="tip-legenda-sub">Mensile · Trimestrale</div></div>
      </div>
    </div>

    <!-- CARDS PER TIPOLOGIA -->
    <div class="tipologie-flow-grid">
      ${tipologieVisive.map((t) => buildFlowCard(t)).join("")}
    </div>

    <!-- LEGENDA FINALE -->
    <div class="infobox" style="margin-top:16px">
      <strong>Legenda frecce:</strong>
      <span style="margin-left:12px">▶ = passaggio diretto tra colonne</span>
      <span style="margin-left:12px">▶▶ = colonna 2 saltata (non applicabile)</span>
      <span style="margin-left:12px;opacity:0.6">□ con bordo tenue = colonna non attiva per questa tipologia</span>
    </div>`;

  document.getElementById("content").innerHTML = html;
}

// ═══════════════════════════════════════════════════════════════
// MODAL ADEMPIMENTO STATO
// ═══════════════════════════════════════════════════════════════
function openAdpModal(
  id,
  stato,
  scadenza,
  dataComp,
  importo,
  note,
  nome,
  iC,
  hR,
  impS,
  impA1,
  impA2,
  impIva,
  impCont,
  rl,
) {
  document.getElementById("adp-id").value = id;
  document.getElementById("adp-stato").value = stato;
  document.getElementById("adp-scadenza").value = scadenza || "";
  document.getElementById("adp-data").value = dataComp || "";
  document.getElementById("adp-note").value = note || "";
  document.getElementById("adp-nome-label").textContent = nome || "";
  document.getElementById("adp-is-contabilita").value = iC || 0;
  document.getElementById("adp-has-rate").value = hR || 0;
  document.getElementById("adp-rate-labels-json").value = rl || "";
  const showN = !iC && !hR;
  document.getElementById("sect-importo-normale").style.display = showN
    ? ""
    : "none";
  document.getElementById("sect-importo-rate").style.display = hR ? "" : "none";
  document.getElementById("sect-importo-cont").style.display = iC ? "" : "none";
  if (showN) document.getElementById("adp-importo").value = importo || "";
  if (hR) {
    let lb = ["Saldo (€)", "1° Acconto (€)", "2° Acconto (€)"];
    try {
      if (rl) {
        const l = JSON.parse(rl);
        lb = l.map((x) => x + " (€)");
      }
    } catch (e) {}
    document.getElementById("rate-l0").textContent = lb[0];
    document.getElementById("rate-l1").textContent = lb[1];
    document.getElementById("rate-l2").textContent = lb[2];
    document.getElementById("adp-imp-saldo").value = impS || "";
    document.getElementById("adp-imp-acc1").value = impA1 || "";
    document.getElementById("adp-imp-acc2").value = impA2 || "";
  }
  if (iC) {
    document.getElementById("adp-imp-iva").value = impIva || "";
    document.getElementById("adp-imp-cont").value = impCont || "";
  }
  openModal("modal-adempimento");
}
function saveAdpStato() {
  const isC = parseInt(document.getElementById("adp-is-contabilita").value);
  const hasR = parseInt(document.getElementById("adp-has-rate").value);
  const payload = {
    id: parseInt(document.getElementById("adp-id").value),
    stato: document.getElementById("adp-stato").value,
    data_scadenza: document.getElementById("adp-scadenza").value || null,
    data_completamento: document.getElementById("adp-data").value || null,
    note: document.getElementById("adp-note").value || null,
    importo: null,
    importo_saldo: null,
    importo_acconto1: null,
    importo_acconto2: null,
    importo_iva: null,
    importo_contabilita: null,
  };
  if (!isC && !hasR)
    payload.importo = document.getElementById("adp-importo").value || null;
  if (hasR) {
    payload.importo_saldo =
      document.getElementById("adp-imp-saldo").value || null;
    payload.importo_acconto1 =
      document.getElementById("adp-imp-acc1").value || null;
    payload.importo_acconto2 =
      document.getElementById("adp-imp-acc2").value || null;
  }
  if (isC) {
    payload.importo_iva = document.getElementById("adp-imp-iva").value || null;
    payload.importo_contabilita =
      document.getElementById("adp-imp-cont").value || null;
  }
  socket.emit("update:adempimento_stato", payload);
}
function deleteAdpCliente() {
  if (confirm("Rimuovere questo adempimento?"))
    socket.emit("delete:adempimento_cliente", {
      id: parseInt(document.getElementById("adp-id").value),
    });
}

// ═══════════════════════════════════════════════════════════════
// MODAL ADEMPIMENTO DEF
// ═══════════════════════════════════════════════════════════════
function onAdpFlagsChange() {
  const hC = document.getElementById("adp-def-contabilita").checked;
  const hR = document.getElementById("adp-def-rate").checked;
  if (hC) document.getElementById("adp-def-rate").checked = false;
  if (hR) document.getElementById("adp-def-contabilita").checked = false;
  document.getElementById("sect-rate-labels").style.display =
    document.getElementById("adp-def-rate").checked ? "" : "none";
}
function openNuovoAdpDef() {
  document.getElementById("modal-adp-def-title").textContent =
    "Nuovo Adempimento";
  ["adp-def-id", "adp-def-codice", "adp-def-nome", "adp-def-desc"].forEach(
    (id) => (document.getElementById(id).value = ""),
  );
  document.getElementById("adp-def-scadenza").value = "annuale";
  document.getElementById("adp-def-categoria").value = "TUTTI";
  document.getElementById("adp-def-contabilita").checked = false;
  document.getElementById("adp-def-rate").checked = false;
  document.getElementById("adp-rate-l1").value = "Saldo";
  document.getElementById("adp-rate-l2").value = "1° Acconto";
  document.getElementById("adp-rate-l3").value = "2° Acconto";
  document.getElementById("sect-rate-labels").style.display = "none";
  openModal("modal-adp-def");
}
function editAdpDef(id) {
  const a = state.adempimenti.find((x) => x.id === id);
  if (!a) return;
  document.getElementById("modal-adp-def-title").textContent =
    "Modifica Adempimento";
  document.getElementById("adp-def-id").value = a.id;
  document.getElementById("adp-def-codice").value = a.codice;
  document.getElementById("adp-def-nome").value = a.nome;
  document.getElementById("adp-def-desc").value = a.descrizione || "";
  document.getElementById("adp-def-scadenza").value =
    a.scadenza_tipo || "annuale";
  document.getElementById("adp-def-categoria").value = a.categoria || "TUTTI";
  document.getElementById("adp-def-contabilita").checked = !!a.is_contabilita;
  document.getElementById("adp-def-rate").checked = !!a.has_rate;
  if (a.rate_labels) {
    try {
      const l = JSON.parse(a.rate_labels);
      document.getElementById("adp-rate-l1").value = l[0] || "Saldo";
      document.getElementById("adp-rate-l2").value = l[1] || "1° Acconto";
      document.getElementById("adp-rate-l3").value = l[2] || "2° Acconto";
    } catch (e) {}
  }
  document.getElementById("sect-rate-labels").style.display = a.has_rate
    ? ""
    : "none";
  openModal("modal-adp-def");
}
function saveAdpDef() {
  const id = document.getElementById("adp-def-id").value;
  const isC = document.getElementById("adp-def-contabilita").checked;
  const hasR = document.getElementById("adp-def-rate").checked;
  const data = {
    codice: document
      .getElementById("adp-def-codice")
      .value.trim()
      .toUpperCase(),
    nome: document.getElementById("adp-def-nome").value.trim(),
    descrizione: document.getElementById("adp-def-desc").value.trim() || null,
    scadenza_tipo: document.getElementById("adp-def-scadenza").value,
    categoria: document.getElementById("adp-def-categoria").value,
    is_contabilita: isC,
    has_rate: hasR,
    rate_labels: hasR
      ? [
          document.getElementById("adp-rate-l1").value || "Saldo",
          document.getElementById("adp-rate-l2").value || "1° Acconto",
          document.getElementById("adp-rate-l3").value || "2° Acconto",
        ]
      : null,
  };
  if (!data.codice || !data.nome) {
    showNotif("Codice e Nome obbligatori", "error");
    return;
  }
  if (id) {
    data.id = parseInt(id);
    socket.emit("update:adempimento", data);
  } else socket.emit("create:adempimento", data);
}
function deleteAdpDef(id) {
  const a = state.adempimenti.find((x) => x.id === id);
  if (confirm(`Eliminare "${a?.nome || id}"?`))
    socket.emit("delete:adempimento", { id });
}

// ═══════════════════════════════════════════════════════════════
// MODAL COPIA / GENERA / ADD ADP
// ═══════════════════════════════════════════════════════════════
function openCopia(id) {
  document.getElementById("copia-cliente-id").value = id;
  document.getElementById("copia-modalita").value = "cliente";
  document.getElementById("copia-info").innerHTML =
    "Copia scadenzario per questo cliente.";
  document.getElementById("copia-da").value = state.anno - 1;
  document.getElementById("copia-a").value = state.anno;
  openModal("modal-copia");
}
function refreshAddAdpSelect() {
  const mancanti = getAdempimentiMancanti();
  const sel = document.getElementById("add-adp-select");
  if (!sel) return;
  if (!mancanti.length) {
    sel.innerHTML = `<option value="">Nessun adempimento da aggiungere</option>`;
    sel.disabled = true;
    const btn = document.querySelector("#modal-add-adp .btn-primary");
    if (btn) {
      btn.disabled = true;
      btn.style.opacity = "0.5";
    }
  } else {
    sel.disabled = false;
    sel.innerHTML = mancanti
      .map(
        (a) =>
          `<option value="${a.id}">[${a.categoria}] ${a.codice} - ${a.nome}</option>`,
      )
      .join("");
    const btn = document.querySelector("#modal-add-adp .btn-primary");
    if (btn) {
      btn.disabled = false;
      btn.style.opacity = "";
    }
  }
  updatePeriodoOptions();
}
function openAddAdp(id) {
  document.getElementById("add-adp-cliente-id").value = id;
  document.getElementById("add-adp-anno").value = state.anno;
  if (!state.adempimenti.length) {
    socket.once("res:adempimenti", () => {
      refreshAddAdpSelect();
      openModal("modal-add-adp");
    });
    socket.emit("get:adempimenti");
    return;
  }
  refreshAddAdpSelect();
  openModal("modal-add-adp");
}
function updatePeriodoOptions() {
  const selAdp = document.getElementById("add-adp-select"),
    selP = document.getElementById("add-adp-periodo");
  if (!selAdp || !selP) return;
  const adp = state.adempimenti.find((a) => a.id === parseInt(selAdp.value));
  if (!adp) {
    selP.innerHTML = `<option value="">- Seleziona adempimento -</option>`;
    return;
  }
  let opts = `<option value="">- Seleziona -</option>`;
  if (adp.scadenza_tipo === "trimestrale")
    opts += `<option value="trimestre_1">1° Trim. (Gen-Mar)</option><option value="trimestre_2">2° Trim. (Apr-Giu)</option><option value="trimestre_3">3° Trim. (Lug-Set)</option><option value="trimestre_4">4° Trim. (Ott-Dic)</option>`;
  else if (adp.scadenza_tipo === "semestrale")
    opts += `<option value="semestre_1">1° Semestre (Gen-Giu)</option><option value="semestre_2">2° Semestre (Lug-Dic)</option>`;
  else if (adp.scadenza_tipo === "mensile")
    MESI.forEach((m, i) => {
      opts += `<option value="mese_${i + 1}">${m}</option>`;
    });
  else opts += `<option value="annuale">Annuale</option>`;
  selP.innerHTML = opts;
}
function eseguiAddAdp() {
  const pv = document.getElementById("add-adp-periodo").value;
  let trimestre = null,
    semestre = null,
    mese = null;
  if (pv.startsWith("trimestre_")) trimestre = parseInt(pv.split("_")[1]);
  else if (pv.startsWith("semestre_")) semestre = parseInt(pv.split("_")[1]);
  else if (pv.startsWith("mese_")) mese = parseInt(pv.split("_")[1]);
  socket.emit("add:adempimento_cliente", {
    id_cliente: parseInt(document.getElementById("add-adp-cliente-id").value),
    id_adempimento: parseInt(document.getElementById("add-adp-select").value),
    anno: parseInt(document.getElementById("add-adp-anno").value) || state.anno,
    trimestre,
    semestre,
    mese,
  });
}

// ═══════════════════════════════════════════════════════════════
// MODAL UTILS
// ═══════════════════════════════════════════════════════════════
function openModal(id) {
  document.getElementById(id).classList.add("open");
}
function closeModal(id) {
  document.getElementById(id).classList.remove("open");
}
document.querySelectorAll(".modal-overlay").forEach((el) => {
  el.addEventListener("click", (e) => {
    if (e.target === el) el.classList.remove("open");
  });
});
function showNotif(msg, type = "info") {
  const icons = { success: "✓", info: "i", error: "!" };
  const el = document.createElement("div");
  el.className = `notif ${type}`;
  el.innerHTML = `<span>${icons[type] || "."}</span><span>${msg}</span>`;
  document.getElementById("notif-container").appendChild(el);
  setTimeout(() => el.remove(), 3800);
}
