// ═══════════════════════════════════════════════════════════════
// ADP-PILL-BULK.JS — Selezione multi-periodo (checkbox su pill)
//   Funziona sia in Vista Scadenzario (cliente singolo)
//   che in Vista Globale (tutti i clienti)
//
// ─── COME FUNZIONA ────────────────────────────────────────────
//  • Ogni periodo-pill ha un checkbox overlay in alto a sinistra
//    visibile al hover o in modalità selezione attiva.
//  • In modalità bulk attiva le pill selezionate si evidenziano.
//  • La barra azioni appare quando almeno 1 è selezionata.
//  • eliminaBulkPill() invia elimina:adempimenti_cliente_bulk
//    e poi aggiorna la vista corrente.
//
// ─── API PUBBLICA ─────────────────────────────────────────────
//  attivaModalitaSelezione(contesto)   'scad' | 'globale'
//  disattivaModalitaSelezione()
//  togglePillSelezionata(id)
//  selezionaTuttePill()
//  deselezionaTuttePill()
//  eliminaBulkPill()
// ═══════════════════════════════════════════════════════════════

var _pillBulkAttivo = false;        // modalità selezione on/off
var _pillBulkContesto = null;       // 'scad' | 'globale'
var _pillBulkSelezione = new Set(); // set di id (interi)

// ── ATTIVA / DISATTIVA ─────────────────────────────────────────
function attivaModalitaSelezione(contesto) {
  _pillBulkAttivo = true;
  _pillBulkContesto = contesto || 'scad';
  _pillBulkSelezione.clear();
  _renderBarraBulkPill();
  _aggiornaPillBulkUI();
}

function disattivaModalitaSelezione() {
  _pillBulkAttivo = false;
  _pillBulkContesto = null;
  _pillBulkSelezione.clear();
  _aggiornaBarraBulkPill();
  _aggiornaPillBulkUI();
}

// ── SELEZIONE ──────────────────────────────────────────────────
function togglePillSelezionata(id) {
  id = parseInt(id);
  if (_pillBulkSelezione.has(id)) {
    _pillBulkSelezione.delete(id);
  } else {
    _pillBulkSelezione.add(id);
  }
  _aggiornaBarraBulkPill();
  _aggiornaPillBulkUI();
}

function selezionaTuttePill() {
  document.querySelectorAll('.periodo-pill[data-id]').forEach(function(p) {
    var id = parseInt(p.dataset.id);
    if (id) _pillBulkSelezione.add(id);
  });
  _aggiornaBarraBulkPill();
  _aggiornaPillBulkUI();
}

function deselezionaTuttePill() {
  _pillBulkSelezione.clear();
  _aggiornaBarraBulkPill();
  _aggiornaPillBulkUI();
}

// ── ELIMINA ────────────────────────────────────────────────────
function eliminaBulkPill() {
  var ids = Array.from(_pillBulkSelezione);
  if (!ids.length) { showNotif('Seleziona almeno un periodo', 'error'); return; }

  var n = ids.length;
  if (!confirm('Eliminare ' + n + ' period' + (n === 1 ? 'o' : 'i') + ' selezionat' + (n === 1 ? 'o' : 'i') + '?\nVerranno spostati nel cestino.')) return;

  var idCliente = null;
  var anno = state.anno;
  if (_pillBulkContesto === 'scad' && state.selectedCliente) {
    idCliente = state.selectedCliente.id;
  }

  socket.emit('elimina:adempimenti_cliente_bulk', {
    ids_righe: ids,
    id_cliente: idCliente,
    anno: anno
  });
}

// ── RENDER BARRA AZIONI ────────────────────────────────────────
function _renderBarraBulkPill() {
  var esistente = document.getElementById('adp-pill-bulk-barra');
  if (esistente) { esistente.remove(); }
  if (!_pillBulkAttivo) return;

  var barra = document.createElement('div');
  barra.id = 'adp-pill-bulk-barra';
  barra.style.cssText = [
    'position:sticky','top:0','z-index:50',
    'display:flex','align-items:center','gap:10px','flex-wrap:wrap',
    'padding:10px 14px',
    'background:var(--bg-card,#fff)',
    'border:1.5px solid var(--red,#dc2626)',
    'border-radius:8px','margin-bottom:14px',
    'box-shadow:0 2px 8px rgba(220,38,38,.12)'
  ].join(';');

  barra.innerHTML = [
    '<span id="apb-counter" style="font-size:13px;font-weight:700;color:var(--red)">0 selezionati</span>',
    '<button class="btn btn-sm" onclick="selezionaTuttePill()" style="font-size:12px">☑ Tutti</button>',
    '<button class="btn btn-sm" onclick="deselezionaTuttePill()" style="font-size:12px">☐ Nessuno</button>',
    '<div style="flex:1"></div>',
    '<button id="apb-btn-elimina" class="btn btn-sm" onclick="eliminaBulkPill()" disabled',
    ' style="background:var(--red,#dc2626);color:#fff;border-color:var(--red,#dc2626);font-size:12px;opacity:.45;cursor:not-allowed">',
    '🗑️ Elimina selezionati (0)</button>',
    '<button class="btn btn-sm btn-secondary" onclick="disattivaModalitaSelezione()" style="font-size:12px">✕ Esci</button>'
  ].join('');

  // Inserisci dopo l'header-card, prima del contenuto adempimenti
  var content = document.getElementById('content');
  if (!content) return;

  var firstTableWrap = content.querySelector('.table-wrap, .adp-card');
  if (firstTableWrap && firstTableWrap.parentNode === content) {
    content.insertBefore(barra, firstTableWrap);
  } else if (firstTableWrap) {
    firstTableWrap.parentNode.insertBefore(barra, firstTableWrap);
  } else {
    content.appendChild(barra);
  }
}

function _aggiornaBarraBulkPill() {
  if (!_pillBulkAttivo) {
    var b = document.getElementById('adp-pill-bulk-barra');
    if (b) b.remove();
    return;
  }
  var n = _pillBulkSelezione.size;
  var counter = document.getElementById('apb-counter');
  var btnEl = document.getElementById('apb-btn-elimina');
  if (counter) counter.textContent = n + ' selezionat' + (n === 1 ? 'o' : 'i');
  if (btnEl) {
    btnEl.textContent = '🗑️ Elimina selezionati (' + n + ')';
    btnEl.disabled = n === 0;
    btnEl.style.opacity = n === 0 ? '0.45' : '1';
    btnEl.style.cursor = n === 0 ? 'not-allowed' : 'pointer';
  }
}

// ── AGGIORNA ASPETTO PILL ──────────────────────────────────────
function _aggiornaPillBulkUI() {
  document.querySelectorAll('.periodo-pill[data-id]').forEach(function(p) {
    var id = parseInt(p.dataset.id);
    var cb = p.querySelector('.pill-bulk-cb');

    if (_pillBulkAttivo) {
      p.style.outline = _pillBulkSelezione.has(id) ? '2.5px solid var(--red,#dc2626)' : '';
      p.style.background = _pillBulkSelezione.has(id) ? 'rgba(220,38,38,.07)' : '';
      if (!cb) {
        cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'pill-bulk-cb';
        cb.style.cssText = 'position:absolute;top:5px;left:5px;width:14px;height:14px;cursor:pointer;accent-color:var(--red,#dc2626);z-index:2';
        cb.addEventListener('change', function(e) {
          e.stopPropagation();
          togglePillSelezionata(id);
        });
        cb.addEventListener('click', function(e) { e.stopPropagation(); });
        // make pill relative
        if (getComputedStyle(p).position === 'static') p.style.position = 'relative';
        p.insertBefore(cb, p.firstChild);
      }
      cb.checked = _pillBulkSelezione.has(id);
      cb.style.display = '';
    } else {
      p.style.outline = '';
      p.style.background = '';
      if (cb) cb.style.display = 'none';
    }
  });
}

// ── INIT: osserva cambi di pagina per pulire stato ─────────────
document.addEventListener('DOMContentLoaded', function() {
  if (typeof socket === 'undefined') return;

  socket.on('res:elimina:adempimenti_cliente_bulk', function(data) {
    if (_pillBulkAttivo) {
      if (data.success) {
        showNotif('🗑️ Eliminat' + (data.eliminati === 1 ? 'o' : 'i') + ' ' + data.eliminati + ' period' + (data.eliminati === 1 ? 'o' : 'i'), 'success');
        disattivaModalitaSelezione();
        if (_pillBulkContesto === 'scad' && typeof loadScadenzario === 'function') {
          loadScadenzario();
        } else if (_pillBulkContesto === 'globale' && typeof applyGlobaleFiltri === 'function') {
          applyGlobaleFiltri();
        }
      } else {
        showNotif('❌ Errore: ' + (data.error || 'Eliminazione fallita'), 'error');
      }
    }
  });
});

// ── ESPOSIZIONI GLOBALI ────────────────────────────────────────
window.attivaModalitaSelezione = attivaModalitaSelezione;
window.disattivaModalitaSelezione = disattivaModalitaSelezione;
window.togglePillSelezionata = togglePillSelezionata;
window.selezionaTuttePill = selezionaTuttePill;
window.deselezionaTuttePill = deselezionaTuttePill;
window.eliminaBulkPill = eliminaBulkPill;
window._aggiornaPillBulkUI = _aggiornaPillBulkUI;
window._renderBarraBulkPill = _renderBarraBulkPill;
window._aggiornaBarraBulkPill = _aggiornaBarraBulkPill;
