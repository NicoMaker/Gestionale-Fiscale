// ═══════════════════════════════════════════════════════════════
// OGGI.JS — Data 'oggi' globale, aggiornata automaticamente a mezzanotte
// ═══════════════════════════════════════════════════════════════

function _calcolaOggi() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Schedula un aggiornamento automatico a mezzanotte.
 * - Ricalcola OGGI
 * - Ri-renderizza tutte le pills già presenti nel DOM che
 *   mostrano un badge scaduto/non-scaduto (.periodo-pill[data-id])
 * - Si auto-riprogramma per la mezzanotte successiva (loop)
 *
 * Chiama questa funzione UNA sola volta all'avvio della pagina,
 * oppure esporta e chiama schedulaMezzanotte() da main.js.
 */
function schedulaMezzanotte() {
  const ora = new Date();
  const prossimaM = new Date(
    ora.getFullYear(),
    ora.getMonth(),
    ora.getDate() + 1, // giorno dopo
    0,
    0,
    0,
    0,
  );
  const msAllaMezzanotte = prossimaM - ora;

  setTimeout(() => {
    // 1. Aggiorna la variabile globale
    OGGI = _calcolaOggi();

    // 2. Ri-renderizza le pills nel DOM (se la funzione globale esiste)
    //    Aspettati che il progetto esponga una funzione tipo
    //    `refreshAllPills()` o `renderAdempimenti()`.
    //    Fallback: aggiorna solo i badge già presenti nel DOM in modo leggero.
    if (typeof refreshAllPills === "function") {
      refreshAllPills();
    } else {
      _aggiornaBadgeScadutoNelDOM();
    }

    // 3. Riprogramma per la mezzanotte successiva
    schedulaMezzanotte();
  }, msAllaMezzanotte);
}

/**
 * Fallback leggero: riscrive solo i badge .pp-scaduto-badge
 * nelle pills già presenti nel DOM senza re-fetch né re-render completo.
 * Funziona se i dati dell'adempimento sono accessibili via dataset
 * o se il record è recuperabile tramite getAdpById(id).
 */
function _aggiornaBadgeScadutoNelDOM() {
  document.querySelectorAll(".periodo-pill[data-id]").forEach((pill) => {
    const id = parseInt(pill.dataset.id);
    if (!id) return;

    // Prova a recuperare il record dal registry globale (se esiste)
    const r = typeof getAdpById === "function" ? getAdpById(id) : null;
    if (!r) return;

    const _isSoloScad =
      !isContabilita(r) && !hasRate(r) && !isCheckbox(r) && !isTextOnly(r);
    if (!_isSoloScad || !r.data_scadenza) return;

    const stato = r.stato || "da_fare";
    if (stato === "n_a") return;

    // Costruisce il nuovo badge
    const _dataScad = new Date(r.data_scadenza);
    _dataScad.setHours(0, 0, 0, 0);
    const nuovoBadge =
      _dataScad < OGGI
        ? `<div class="pp-scaduto-badge" style="margin-top:4px;display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;letter-spacing:0.05em;background:var(--orange);color:#fff">⚠️ SCADUTO</div>`
        : `<div class="pp-scaduto-badge" style="margin-top:4px;display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;letter-spacing:0.05em;background:var(--green);color:#fff;opacity:0.85">✓ Non scaduto</div>`;

    // Sostituisce il badge esistente oppure lo inserisce
    const vecchioBadge = pill.querySelector(".pp-scaduto-badge");
    if (vecchioBadge) {
      vecchioBadge.outerHTML = nuovoBadge;
    } else {
      // Inserisce prima delle note, o in fondo alla pill
      const note = pill.querySelector(".pp-note");
      if (note) {
        note.insertAdjacentHTML("beforebegin", nuovoBadge);
      } else {
        pill.insertAdjacentHTML("beforeend", nuovoBadge);
      }
    }
  });
}

// Codice a livello di modulo
let OGGI = _calcolaOggi();
schedulaMezzanotte();
