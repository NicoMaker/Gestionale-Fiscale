// ═══════════════════════════════════════════════════════════════
// DASHBOARD.JS — Dashboard con statistiche e griglia adempimenti
// ═══════════════════════════════════════════════════════════════

function buildDashboardShell(stats) {
  document.getElementById("content").innerHTML = `
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
            <input class="input" id="dash-adp-search" placeholder="Cerca nome, codice..." value="" oninput="onDashAdpSearch(this.value)">
          </div>
        </div>
      </div>
      <div id="dash-adp-grid" style="padding:14px;display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px"></div>
    </div>`;
  state._dashRendered = true;
}

function updateDashboardContent(stats) {
  const allAdp = stats.adempimentiStats || [];
  const sq = (state.dashSearch || "").toLowerCase().trim();
  const sc = state.dashFiltroCategoria || "tutti";
  const catColor = {};
  CATEGORIE.forEach(c => catColor[c.codice] = c.color);

  const adpVis = allAdp.filter(a => {
    if (sc !== "tutti" && a.categoria !== sc) return false;
    if (sq && !a.nome.toLowerCase().includes(sq) && !a.codice.toLowerCase().includes(sq) && !a.categoria.toLowerCase().includes(sq)) return false;
    return true;
  });

  const fT = adpVis.reduce((s, a) => s + a.totale, 0);
  const fC = adpVis.reduce((s, a) => s + a.completati, 0);
  const fD = adpVis.reduce((s, a) => s + a.da_fare, 0);
  const fI = adpVis.reduce((s, a) => s + Math.max(0, a.totale - a.completati - a.da_fare), 0);
  const fP = fT > 0 ? Math.round((fC / fT) * 100) : 0;
  const isF = sc !== "tutti" || sq !== "";

  const se = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  const si = (id, v) => { const e = document.getElementById(id); if (e) e.innerHTML = v; };

  si("ds-lbl-tot", `Adempimenti ${stats.anno}${isF ? ` <span style="font-size:9px;color:var(--yellow)">(filtro)</span>` : ""}`);
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
    title.innerHTML = `Adempimenti ${stats.anno} <span style="font-size:11px;font-weight:400;color:var(--text3);margin-left:6px">${adpVis.length}/${allAdp.length} — clicca per Vista Globale</span>`;

  // Tabs categoria
  const tabsEl = document.getElementById("dash-cat-tabs");
  if (tabsEl)
    tabsEl.innerHTML = [{ codice: "tutti", nome: "Tutti", color: "var(--text2)" }, ...CATEGORIE]
      .map(c => {
        const active = state.dashFiltroCategoria === c.codice;
        const col = c.color || "var(--text2)";
        return `<button class="cat-tab${active ? " cat-tab-active" : ""}" style="${active ? `background:${col}22;border-color:${col};color:${col}` : ""}" onclick="setDashCat('${c.codice}')">${c.nome || c.codice}</button>`;
      }).join("");

  // Raggruppa per categoria
  const grouped = {};
  adpVis.forEach(a => {
    const cat = a.categoria || "ALTRI";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(a);
  });

  const grid = document.getElementById("dash-adp-grid");
  if (!grid) return;

  if (!adpVis.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text3)">Nessun adempimento</div>`;
    return;
  }

  let html = "";
  Object.entries(grouped).forEach(([catCode, items]) => {
    const catInfo = CATEGORIE.find(x => x.codice === catCode);
    const cc = catInfo?.color || "var(--accent)";

    html += `<div style="grid-column:1/-1;display:flex;align-items:center;gap:10px;padding:8px 4px;margin-top:4px;border-bottom:1px solid var(--border)">
      <span style="font-size:16px">${catInfo?.icona || "📋"}</span>
      <span style="color:${cc};font-weight:800;font-size:13px">${catCode}</span>
      <span style="color:var(--text3);font-size:11px">${items.length} adempiment${items.length === 1 ? "o" : "i"}</span>
    </div>`;

    items.forEach(a => {
      const p = a.totale > 0 ? Math.round((a.completati / a.totale) * 100) : 0;
      const iC = Math.max(0, a.totale - a.completati - a.da_fare);
      const pgColor = p === 100 ? "var(--green)" : p > 50 ? "var(--yellow)" : "var(--red)";

      html += `<div class="dash-adp-card" onclick="goVistaGlobaleAdp('${escAttr(a.nome)}')" title="Clicca per Vista Globale">
        <div class="dash-adp-card-top">
          <span class="adp-def-codice">${a.codice}</span>
          <div class="mini-bar" style="width:50px"><div class="mini-fill" style="width:${p}%;background:${pgColor}"></div></div>
          <span style="font-size:10px;font-family:var(--mono);color:${pgColor};min-width:28px;text-align:right">${p}%</span>
        </div>
        <div class="dash-adp-nome">${a.nome}</div>
        <div class="dash-adp-stats">
          <div class="dash-stat-chip"><span class="ds-num">${a.totale}</span><span class="ds-lbl">Tot.</span></div>
          <div class="dash-stat-chip" style="color:var(--green)"><span class="ds-num">${a.completati}</span><span class="ds-lbl">✓</span></div>
          <div class="dash-stat-chip" style="color:var(--red)"><span class="ds-num">${a.da_fare}</span><span class="ds-lbl">⭕</span></div>
          ${iC > 0 ? `<div class="dash-stat-chip" style="color:var(--yellow)"><span class="ds-num">${iC}</span><span class="ds-lbl">🔄</span></div>` : ""}
        </div>
      </div>`;
    });
  });

  grid.innerHTML = html;
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
  document.querySelectorAll(".nav-item").forEach(x => x.classList.remove("active"));
  document.querySelector('[data-page="scadenzario_globale"]').classList.add("active");
  renderPage("scadenzario_globale");
}
