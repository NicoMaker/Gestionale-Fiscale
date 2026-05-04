// ═══════════════════════════════════════════════════════════════
// DASHBOARD.JS — Dashboard con statistiche e clienti senza adempimenti
// ═══════════════════════════════════════════════════════════════

function buildDashboardShell(stats) {
  document.getElementById("content").innerHTML = `
    <div class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-bottom:24px">
      <div class="stat-card"><div class="stat-label">Clienti Attivi</div><div class="stat-value v-blue">${stats.totClienti}</div></div>
      <div class="stat-card"><div class="stat-label" id="ds-lbl-tot">Adempimenti ${stats.anno}</div><div class="stat-value" id="ds-tot">-</div></div>
      <div class="stat-card"><div class="stat-label">Completati</div><div class="stat-value v-green" id="ds-comp">-</div><div class="prog-bar"><div class="prog-fill green" id="ds-prog" style="width:0%"></div></div><div class="stat-sub" id="ds-perc">0%</div></div>
      <div class="stat-card"><div class="stat-label">Da Fare</div><div class="stat-value v-yellow" id="ds-dafare">-</div></div>
      <div class="stat-card"><div class="stat-label">In Corso</div><div class="stat-value v-purple" id="ds-incorso">-</div></div>
      <div class="stat-card"><div class="stat-label">N/A</div><div class="stat-value" style="color:var(--text3)" id="ds-na">${stats.na || 0}</div></div>
    </div>
    
    <!-- ⭐ CLIENTI SENZA ADEMPIMENTI -->
    <div class="table-wrap" style="margin-bottom:20px" id="clienti-senza-adp-section">
      <div class="table-header">
        <h3>⚠️ Clienti senza adempimenti per l'anno ${stats.anno}</h3>
        <div>
          <button class="btn btn-sm btn-primary" onclick="apriApplicaAdempimentiPerVuoti()" style="background: var(--orange); border-color: var(--orange);">
            ✨ Assegna adempimenti
          </button>
        </div>
      </div>
      <div id="clienti-senza-adp-list" style="padding: 16px; min-height: 100px;">
        <div style="text-align: center; padding: 20px; color: var(--text3);">
          ⏳ Caricamento clienti...
        </div>
      </div>
    </div>
    
    <!-- ⭐ Applica Adempimenti Esistenti a Clienti -->
    <div class="table-wrap" style="margin-bottom:20px">
      <div class="table-header">
        <h3>📋 Applica Adempimenti Esistenti a Clienti</h3>
        <div>
          <button class="btn btn-primary" onclick="openApplicaAdempimenti()" style="background: var(--purple); border-color: var(--purple);">
            ✨ Applica Adempimenti
          </button>
        </div>
      </div>
      <div style="padding: 16px; background: var(--surface2); border-radius: 8px; margin: 12px; font-size: 13px; color: var(--text2);">
        💡 Seleziona <strong>uno o più adempimenti</strong> e <strong>uno o più clienti</strong>. 
        Gli adempimenti già presenti vengono conservati.
      </div>
    </div>
    
    <div class="table-wrap">
      <div class="table-header no-print" style="flex-wrap:wrap;gap:10px">
        <h3 id="dash-adp-count-title">Adempimenti ${stats.anno}</h3>
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;flex:1">
          <div class="dash-filtri-bar" style="display:flex;gap:6px;align-items:center;margin-left:auto;flex-wrap:wrap">
            <select class="select" id="dash-filtro-stato-adp" style="width:170px;font-size:13px" onchange="onDashFiltroStatoAdp()">
              <option value="">🔵 Tutti gli stati</option>
              <option value="da_fare">⭕ Da fare</option>
              <option value="in_corso">🔄 In corso</option>
              <option value="completato">✅ Completato</option>
              <option value="n_a">➖ N/A</option>
            </select>
            <div class="search-wrap" style="width:220px">
              <span class="search-icon">🔍</span>
              <input class="input" id="dash-adp-search" placeholder="Cerca nome, codice..." oninput="onDashAdpSearch(this.value)" style="font-size:13px">
            </div>
            <button class="btn btn-sm btn-primary" onclick="resetDashFiltri()">⟳ Tutti</button>
          </div>
        </div>
      </div>
      <div id="dash-adp-grid" style="padding:16px;display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px"></div>
    </div>`;
  
  state._dashRendered = true;
  caricaClientiSenzaAdempimenti();
}

// ⭐ CARICA CLIENTI SENZA ADEMPIMENTI
function caricaClientiSenzaAdempimenti() {
  if (!socket) return;
  console.log("📡 Richiedo clienti senza adempimenti per anno:", state.anno);
  socket.emit("get:clienti_senza_adempimenti", { anno: state.anno });
}

// ⭐ RENDER CLIENTI SENZA ADEMPIMENTI
function renderClientiSenzaAdempimenti(clienti) {
  const container = document.getElementById("clienti-senza-adp-list");
  if (!container) return;
  
  console.log("🎨 Render clienti senza adempimenti:", clienti?.length);
  
  if (!clienti || clienti.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 20px; color: var(--green); background: var(--green)08; border-radius: 8px;">
        ✅ Tutti i clienti hanno almeno un adempimento per l'anno ${state.anno}!
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 12px;">
      <div style="font-size: 13px; color: var(--orange); padding: 8px 12px; background: var(--orange)08; border-radius: 6px;">
        ⚠️ ${clienti.length} clienti senza alcun adempimento
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${clienti.map(cliente => `
          <div class="cliente-senza-adp-row" style="
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: var(--s2);
            border: 1px solid var(--b1);
            border-radius: 10px;
            padding: 12px 16px;
            gap: 12px;
          ">
            <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
              <div class="cliente-avatar-sm" style="
                width: 40px;
                height: 40px;
                border-radius: 10px;
                background: ${cliente.tipologia_colore || '#5b8df6'}22;
                border: 2px solid ${cliente.tipologia_colore || '#5b8df6'};
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 800;
                font-size: 14px;
              ">${getAvatar(cliente.nome)}</div>
              <div>
                <div style="font-weight: 700; font-size: 15px;">${escAttr(cliente.nome)}</div>
                <div style="font-size: 12px; color: var(--t2);">${cliente.tipologia_codice || '-'} · ${cliente.email || 'nessuna email'}</div>
              </div>
            </div>
            <button class="btn btn-primary btn-sm" onclick="goToClienteScadenzarioDiretto(${cliente.id})" style="white-space: nowrap;">
              📅 Vai al Cliente
            </button>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ⭐ VAI DIRETTAMENTE ALLO SCADENZARIO DEL CLIENTE
function goToClienteScadenzarioDiretto(clienteId) {
  console.log("🔍 Vai al cliente:", clienteId);
  
  // Cerca il cliente nella lista già caricata
  const cliente = state.clienti?.find(c => c.id === clienteId);
  
  if (cliente) {
    state.selectedCliente = cliente;
    // Cambia pagina allo scadenzario
    document.querySelectorAll(".nav-item").forEach(x => x.classList.remove("active"));
    document.querySelector('[data-page="scadenzario"]').classList.add("active");
    renderPage("scadenzario");
  } else {
    // Se non è in stato, lo carichiamo e poi navighiamo
    state._gotoClienteId = clienteId;
    state._pending = "scadenzario";
    socket.emit("get:clienti", { anno: state.anno });
    document.querySelectorAll(".nav-item").forEach(x => x.classList.remove("active"));
    document.querySelector('[data-page="scadenzario"]').classList.add("active");
    renderPage("scadenzario");
  }
}

// ⭐ APRI MODAL APPLICA ADEMPIMENTI CON CLIENTI VUOTI PRESELEZIONATI
function apriApplicaAdempimentiPerVuoti() {
  // Prima recupera i clienti senza adempimenti
  socket.emit("get:clienti_senza_adempimenti", { anno: state.anno });
  socket.once("res:clienti_senza_adempimenti", ({ success, data }) => {
    if (success && data && data.length > 0) {
      // Salva gli ID dei clienti vuoti
      const clientiVuotiIds = data.map(c => c.id);
      
      // Carica adempimenti se necessario
      if (!state.adempimenti || state.adempimenti.length === 0) {
        socket.emit("get:adempimenti");
        socket.once("res:adempimenti", ({ success: adpSuccess, data: adpData }) => {
          if (adpSuccess) {
            state.adempimenti = adpData;
            apriModalConPreselezione(clientiVuotiIds);
          }
        });
      } else {
        apriModalConPreselezione(clientiVuotiIds);
      }
    } else {
      showNotif("Nessun cliente senza adempimenti da assegnare", "info");
    }
  });
}

function apriModalConPreselezione(clientiVuotiIds) {
  // Carica tutti i clienti
  socket.emit("get:clienti", { anno: state.anno });
  socket.once("res:clienti", ({ success, data }) => {
    if (success) {
      state.clienti = data;
      
      // Render del modal
      renderApplicaAdempimentiModal();
      renderApplicaClientiList();
      
      // Preseleziona i clienti vuoti
      setTimeout(() => {
        document.querySelectorAll(".applica-cliente-checkbox").forEach(cb => {
          if (clientiVuotiIds.includes(parseInt(cb.value))) {
            cb.checked = true;
          }
        });
        
        // Aggiorna messaggio informativo
        const infoBox = document.querySelector("#modal-applica-adempimenti .infobox");
        if (infoBox) {
          infoBox.innerHTML = `
            ✅ <strong>${clientiVuotiIds.length} clienti</strong> senza adempimenti sono stati preselezionati.<br>
            📌 Scegli gli adempimenti da assegnare e premi "Applica".
          `;
          infoBox.style.background = "var(--orange)18";
          infoBox.style.borderColor = "var(--orange)";
          infoBox.style.color = "var(--orange)";
        }
      }, 100);
      
      document.getElementById("applica-adempimenti-anno").value = state.anno;
      openModal("modal-applica-adempimenti");
    }
  });
}

// ⭐ APRE MODAL APPLICA ADEMPIMENTI GENERICO
function openApplicaAdempimenti() {
  if (!state.adempimenti || state.adempimenti.length === 0) {
    socket.emit("get:adempimenti");
    socket.once("res:adempimenti", ({ success, data }) => {
      if (success) {
        state.adempimenti = data;
        renderApplicaAdempimentiModal();
      }
    });
  } else {
    renderApplicaAdempimentiModal();
  }
  
  socket.emit("get:clienti", { anno: state.anno });
  socket.once("res:clienti", ({ success, data }) => {
    if (success) {
      state.clienti = data;
      renderApplicaClientiList();
    }
  });
  
  // Reset messaggio
  const infoBox = document.querySelector("#modal-applica-adempimenti .infobox");
  if (infoBox) {
    infoBox.innerHTML = `
      ✅ Seleziona <strong>uno o più adempimenti</strong> e <strong>uno o più clienti</strong>.<br>
      📌 Gli adempimenti già presenti vengono conservati.
    `;
    infoBox.style.background = "";
    infoBox.style.borderColor = "";
    infoBox.style.color = "";
  }
  
  document.getElementById("applica-adempimenti-anno").value = state.anno;
  openModal("modal-applica-adempimenti");
}

function renderApplicaAdempimentiModal() {
  const container = document.getElementById("applica-adp-list");
  if (!container) return;
  if (!state.adempimenti || state.adempimenti.length === 0) {
    container.innerHTML = `<div style="text-align:center;padding:20px;">📋 Nessun adempimento</div>`;
    return;
  }
  
  const adpOrdinati = [...state.adempimenti].sort((a, b) => a.nome.localeCompare(b.nome));
  container.innerHTML = `<div style="display:flex;flex-wrap:wrap;">${adpOrdinati.map(adp => `
    <label class="flag-chip" style="margin:4px;padding:6px 12px;font-size:13px;width:calc(33% - 8px);">
      <input type="checkbox" class="applica-adp-checkbox" value="${adp.id}">
      <span><strong>${adp.codice}</strong> — ${adp.nome}</span>
    </label>
  `).join('')}</div>`;
}

function renderApplicaClientiList() {
  const container = document.getElementById("applica-clienti-list");
  if (!container) return;
  if (!state.clienti || state.clienti.length === 0) {
    container.innerHTML = `<div style="text-align:center;padding:20px;">👥 Nessun cliente</div>`;
    return;
  }
  
  const soloAttivi = document.getElementById("applica-clienti-solo-attivi")?.checked !== false;
  let clientiFiltrati = state.clienti.filter(c => !soloAttivi || c.attivo === 1);
  
  const searchTerm = document.getElementById("applica-clienti-search")?.value?.toLowerCase() || "";
  if (searchTerm) {
    clientiFiltrati = clientiFiltrati.filter(c => 
      c.nome?.toLowerCase().includes(searchTerm) || 
      c.codice_fiscale?.toLowerCase().includes(searchTerm)
    );
  }
  
  clientiFiltrati.sort((a, b) => a.nome.localeCompare(b.nome));
  container.innerHTML = `<div style="display:flex;flex-wrap:wrap;">${clientiFiltrati.map(c => `
    <label class="flag-chip" style="margin:4px;padding:6px 12px;font-size:13px;width:calc(33% - 8px);">
      <input type="checkbox" class="applica-cliente-checkbox" value="${c.id}">
      <span>👤 ${c.nome} ${c.tipologia_codice ? `(${c.tipologia_codice})` : ''}</span>
    </label>
  `).join('')}</div>`;
}

function filtraClientiApplica() { renderApplicaClientiList(); }
function toggleSelezionaTuttiAdpApplica() {
  const sel = document.getElementById("applica-adp-seleziona-tutti").checked;
  document.querySelectorAll(".applica-adp-checkbox").forEach(cb => cb.checked = sel);
}
function toggleSelezionaTuttiClientiApplica() {
  const sel = document.getElementById("applica-clienti-seleziona-tutti").checked;
  document.querySelectorAll(".applica-cliente-checkbox").forEach(cb => cb.checked = sel);
}
function resetSelezioneAdpApplica() {
  document.querySelectorAll(".applica-adp-checkbox").forEach(cb => cb.checked = false);
  document.getElementById("applica-adp-seleziona-tutti").checked = false;
}
function getSelectedAdempimentiApplica() {
  const selected = [];
  document.querySelectorAll(".applica-adp-checkbox:checked").forEach(cb => selected.push(parseInt(cb.value)));
  return selected;
}
function getSelectedClientiApplica() {
  const selected = [];
  document.querySelectorAll(".applica-cliente-checkbox:checked").forEach(cb => selected.push(parseInt(cb.value)));
  return selected;
}
function eseguiApplicaAdempimenti() {
  const adpIds = getSelectedAdempimentiApplica();
  const clientiIds = getSelectedClientiApplica();
  const anno = parseInt(document.getElementById("applica-adempimenti-anno").value);
  if (adpIds.length === 0) { showNotif("Seleziona almeno un adempimento", "error"); return; }
  if (clientiIds.length === 0) { showNotif("Seleziona almeno un cliente", "error"); return; }
  socket.emit("applica:adempimenti_a_clienti", { adempimenti_ids: adpIds, clienti_ids: clientiIds, anno });
  closeModal("modal-applica-adempimenti");
}

// ⭐ STATISTICHE E ALTRO
function onDashFiltroStatoAdp() {
  state.dashFiltroStatoAdp = document.getElementById("dash-filtro-stato-adp")?.value || "";
  if (state.dashStats) updateDashboardContent(state.dashStats);
}
function resetDashFiltri() {
  state.dashSearch = "";
  state.dashFiltroStatoAdp = "";
  ["dash-adp-search", "dash-filtro-stato-adp"].forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
  if (state.dashStats) updateDashboardContent(state.dashStats);
}
function adempimentoPassaFiltroStato(a, ss) {
  if (!ss) return true;
  const inCorso = Math.max(0, a.totale - a.completati - a.da_fare - (a.na || 0));
  const na = a.na || 0;
  switch (ss) {
    case "da_fare": return a.da_fare > 0;
    case "in_corso": return inCorso > 0;
    case "completato": return a.completati > 0;
    case "n_a": return na > 0;
    default: return true;
  }
}
function updateDashboardContent(stats) {
  const allAdp = stats.adempimentiStats || [];
  const sq = (state.dashSearch || "").toLowerCase().trim();
  const ss = state.dashFiltroStatoAdp || "";
  const adpVis = allAdp.filter(a => {
    if (sq && !a.nome.toLowerCase().includes(sq) && !a.codice.toLowerCase().includes(sq)) return false;
    return adempimentoPassaFiltroStato(a, ss);
  });
  const fT = adpVis.reduce((s, a) => s + a.totale, 0);
  const fC = adpVis.reduce((s, a) => s + a.completati, 0);
  const fD = adpVis.reduce((s, a) => s + a.da_fare, 0);
  const fI = adpVis.reduce((s, a) => s + Math.max(0, a.totale - a.completati - a.da_fare), 0);
  const fP = fT > 0 ? Math.round((fC / fT) * 100) : 0;
  const isF = sq !== "" || ss !== "";
  document.getElementById("ds-lbl-tot").innerHTML = `Adempimenti ${stats.anno}${isF ? ' <span style="font-size:10px;color:var(--yellow)">(filtro)</span>' : ''}`;
  document.getElementById("ds-tot").textContent = fT;
  document.getElementById("ds-comp").textContent = fC;
  document.getElementById("ds-dafare").textContent = fD;
  document.getElementById("ds-incorso").textContent = fI;
  document.getElementById("ds-na").textContent = stats.na || 0;
  document.getElementById("ds-perc").textContent = fP + "%";
  const dp = document.getElementById("ds-prog");
  if (dp) dp.style.width = fP + "%";
  const title = document.getElementById("dash-adp-count-title");
  if (title) title.innerHTML = `Adempimenti ${stats.anno} <span style="font-size:12px;font-weight:400;color:var(--text3);margin-left:6px">${adpVis.length}/${allAdp.length}</span>`;
  const grid = document.getElementById("dash-adp-grid");
  if (!grid) return;
  if (!adpVis.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--text3)"><div style="font-size:40px;margin-bottom:16px">📋</div><div>Nessun adempimento</div></div>`;
    return;
  }
  let html = "";
  adpVis.forEach(a => {
    const p = a.totale > 0 ? Math.round((a.completati / a.totale) * 100) : 0;
    const iC = Math.max(0, a.totale - a.completati - a.da_fare - (a.na || 0));
    const pgColor = p === 100 ? "var(--green)" : p > 50 ? "var(--yellow)" : "var(--red)";
    html += `<div class="dash-adp-card" onclick="goVistaGlobaleAdp('${escAttr(a.nome)}')">
      <div class="dash-adp-card-top">
        <span class="adp-def-codice">${a.codice}</span>
        <div class="mini-bar" style="width:60px"><div class="mini-fill" style="width:${p}%;background:${pgColor}"></div></div>
        <span style="font-size:11px;font-family:var(--mono);color:${pgColor}">${p}%</span>
      </div>
      <div class="dash-adp-nome">${a.nome}</div>
      <div class="dash-adp-stats">
        <div class="dash-stat-chip"><span class="ds-num">${a.totale}</span><span class="ds-lbl">Tot.</span></div>
        <div class="dash-stat-chip" style="color:var(--green)"><span class="ds-num">${a.completati}</span><span class="ds-lbl">✓</span></div>
        <div class="dash-stat-chip" style="color:var(--red)"><span class="ds-num">${a.da_fare}</span><span class="ds-lbl">⭕</span></div>
        ${iC > 0 ? `<div class="dash-stat-chip" style="color:var(--yellow)"><span class="ds-num">${iC}</span><span class="ds-lbl">🔄</span></div>` : ''}
      </div>
    </div>`;
  });
  grid.innerHTML = html;
}
function renderDashboard(stats) {
  if (!state._dashRendered) buildDashboardShell(stats);
  updateDashboardContent(stats);
}
function onDashAdpSearch(val) { state.dashSearch = val; if (state.dashStats) updateDashboardContent(state.dashStats); }
function goVistaGlobaleAdp(nome) {
  state.globalePreFiltroAdp = nome;
  document.querySelectorAll(".nav-item").forEach(x => x.classList.remove("active"));
  document.querySelector('[data-page="scadenzario_globale"]').classList.add("active");
  renderPage("scadenzario_globale");
}

// ⭐ LISTENER SOCKET
if (typeof socket !== "undefined") {
  socket.on("res:clienti_senza_adempimenti", ({ success, data }) => {
    console.log("📨 Ricevuti clienti senza adempimenti:", success, data?.length);
    if (success) renderClientiSenzaAdempimenti(data);
  });
  socket.on("res:applica:adempimenti_a_clienti", ({ success, inseriti, clienti, adempimenti, dettagli, error }) => {
    if (success) {
      let msg = `✅ Applicati ${inseriti} adempimenti a ${clienti} clienti`;
      if (dettagli?.skipped > 0) msg += ` — ${dettagli.skipped} già esistenti`;
      showNotif(msg, "success");
      socket.emit("get:stats", { anno: state.anno });
      caricaClientiSenzaAdempimenti();
    } else {
      showNotif(`❌ Errore: ${error}`, "error");
    }
  });
}

// Esponi funzioni globali
window.openApplicaAdempimenti = openApplicaAdempimenti;
window.filtraClientiApplica = filtraClientiApplica;
window.toggleSelezionaTuttiAdpApplica = toggleSelezionaTuttiAdpApplica;
window.toggleSelezionaTuttiClientiApplica = toggleSelezionaTuttiClientiApplica;
window.resetSelezioneAdpApplica = resetSelezioneAdpApplica;
window.eseguiApplicaAdempimenti = eseguiApplicaAdempimenti;
window.apriApplicaAdempimentiPerVuoti = apriApplicaAdempimentiPerVuoti;
window.goToClienteScadenzarioDiretto = goToClienteScadenzarioDiretto;
window.caricaClientiSenzaAdempimenti = caricaClientiSenzaAdempimenti;