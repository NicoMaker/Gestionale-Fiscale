// ═══════════════════════════════════════════════════════════════
// FORMAT-DISPLAY.JS — Formattazione numeri per display e predicati di tipo
// ═══════════════════════════════════════════════════════════════


// ─── UTILITY ───────────────────────────────────────────────

// ─── FORMATTAZIONE NUMERO IN FORMATO ITALIANO ────────────────
function formattaNumeroItaliano(valore) {
  if (valore === null || valore === undefined || valore === "") return "";
  const s = String(valore);
  const normalizzato = s.includes(",")
    ? s.replace(/\./g, "").replace(",", ".")
    : s;
  const numero = parseFloat(normalizzato);
  if (isNaN(numero)) return "";
  const negativo = numero < 0;
  const [intero, dec] = Math.abs(numero).toFixed(2).split(".");
  const interoFormattato = intero.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const risultato = interoFormattato + "," + dec;
  return negativo ? "-" + risultato : risultato;
}


// ─── FORMATTA NUMERO CON COLORE PER DISPLAY ──────────────────
function formattaNumeroConColore(valore, elemento) {
  if (valore === null || valore === undefined || valore === "") {
    if (elemento) {
      elemento.textContent = "";
      elemento.style.color = "";
    }
    return "";
  }
  const _sr = String(valore);
  const numero = parseFloat(
    _sr.includes(",") ? _sr.replace(/\./g, "").replace(",", ".") : _sr,
  );
  if (isNaN(numero)) {
    if (elemento) {
      elemento.textContent = valore;
      elemento.style.color = "";
    }
    return valore;
  }
  const formattato = formattaNumeroItaliano(numero);
  if (elemento) {
    elemento.textContent = formattato;
    elemento.style.color = numero < 0 ? "var(--red)" : "var(--green)";
  }
  return formattato;
}


// ─── TYPE HELPERS ─────────────────────────────────────────────
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
