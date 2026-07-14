// ═══════════════════════════════════════════════════════════════
// FORMAT.JS — Formattazione numeri in formato italiano e input decimali
// ═══════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════
// GESTIONE INPUT NUMERICI - FUNZIONE UNIFICATA (CORRETTA)
// ═══════════════════════════════════════════════════════════════

/**
 * Converte numero dal formato italiano al formato numerico
 * @param {string} valore
 * @returns {number}
 */
function parseNumeroItaliano(valore) {
  if (!valore) return 0;
  let pulito = valore.replace("€", "").trim();
  if (!pulito || pulito === "-") return 0;

  // Gestisce formato italiano (virgola decimale)
  if (pulito.includes(",")) {
    // Rimuovi i punti delle migliaia e sostituisci virgola con punto
    pulito = pulito.replace(/\./g, "").replace(",", ".");
  }

  const num = parseFloat(pulito);
  return isNaN(num) ? 0 : num;
}


/**
 * Converte numero al formato italiano con simbolo € (per visualizzazione)
 * @param {number|string} num
 * @returns {string} Es: "-1.234,56€"
 */
function formattaNumeroItaliano(num) {
  if (num === null || num === undefined || num === "") return "";
  if (num === 0) return "0,00€";

  const n = typeof num === "string" ? parseNumeroItaliano(num) : num;
  if (isNaN(n)) return "";

  const negativo = n < 0;
  const assoluto = Math.abs(n);
  const parts = assoluto.toFixed(2).split(".");
  const interoFormattato = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  return (negativo ? "-" : "") + interoFormattato + "," + parts[1] + "€";
}


/**
 * Formatta un numero per la visualizzazione nelle tabelle (senza €)
 * @param {number|string} num
 * @returns {string}
 */
function formattaNumeroVisualizzazione(num) {
  if (num === null || num === undefined || num === "") return "";
  if (num === 0) return "0,00";

  const n = typeof num === "string" ? parseNumeroItaliano(num) : num;
  if (isNaN(n)) return "";

  const negativo = n < 0;
  const assoluto = Math.abs(n);
  const parts = assoluto.toFixed(2).split(".");
  const interoFormattato = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  return (negativo ? "-" : "") + interoFormattato + "," + parts[1];
}


/**
 * Setup completo per input numerici con formato italiano
 * - Durante la digitazione: punto decimale (es. 100.50)
 * - All'uscita (blur): virgola decimale + formato italiano (es. 100,50€)
 * - Al focus: torna al punto decimale per modificare
 */
function setupDecimalInput(input) {
  if (!input) return;

  // Rimuovi eventuali listener precedenti clonando il nodo
  const newInput = input.cloneNode(true);
  input.parentNode?.replaceChild(newInput, input);
  input = newInput;

  // ─── EVENT: FOCUS (mostra formato modifica con punto) ────────
  input.addEventListener("focus", function (e) {
    const valoreAttuale = e.target.value;
    if (valoreAttuale && valoreAttuale !== "") {
      // Converti in formato modifica (con punto)
      const num = parseNumeroItaliano(valoreAttuale);
      if (!isNaN(num) && num !== 0) {
        e.target.value = num.toString();
      } else if (num === 0) {
        e.target.value = "";
      }
    }
    coloraInputImporto(input);
  });

  // ─── EVENT: INPUT (durante la digitazione) ─────────────────
  input.addEventListener("input", function (e) {
    let value = e.target.value.trim();

    if (!value) {
      e.target.value = "";
      coloraInputImporto(input);
      return;
    }

    // Estrai il segno negativo
    let negativo = value.startsWith("-");
    if (negativo) value = value.substring(1);

    // Permetti solo cifre, punto e virgola
    value = value.replace(/[^0-9.,]/g, "");

    // Converti eventuali virgole in punto (per coerenza durante digitazione)
    value = value.replace(/,/g, ".");

    // Assicura un solo punto decimale
    const parts = value.split(".");
    if (parts.length > 2) {
      value = parts[0] + "." + parts.slice(1).join("");
    }

    // Limita i decimali a 2 cifre
    const [intPart, decPart] = value.split(".");
    if (decPart && decPart.length > 2) {
      value = intPart + "." + decPart.substring(0, 2);
    }

    // Riaggiungi il segno meno
    if (negativo && value !== "" && value !== ".") {
      value = "-" + value;
    }

    e.target.value = value;
    coloraInputImporto(input);
  });

  // ─── EVENT: BLUR (formattazione finale con virgola) ────────
  input.addEventListener("blur", function (e) {
    let value = e.target.value.trim();

    if (!value || value === "-") {
      e.target.value = "";
      coloraInputImporto(input);
      return;
    }

    const num = parseNumeroItaliano(value);
    if (!isNaN(num) && num !== 0) {
      e.target.value = formattaNumeroItaliano(num);
    } else if (num === 0) {
      e.target.value = "";
    }
    coloraInputImporto(input);
  });

  // ─── EVENT: PASTE (quando incolli) ────────────────────────
  input.addEventListener("paste", function (e) {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text");
    const num = parseNumeroItaliano(pastedData);
    if (!isNaN(num) && num !== 0) {
      e.target.value = num.toString();
    } else {
      e.target.value = "";
    }
    coloraInputImporto(input);
  });

  // ─── EVENT: KEYDOWN (blocca caratteri non validi) ─────────
  input.addEventListener("keydown", function (e) {
    // Blocca caratteri non validi
    const char = e.key;
    const isValidChar =
      /^[0-9]$/.test(char) ||
      char === "," ||
      char === "." ||
      char === "-" ||
      char === "Backspace" ||
      char === "Delete" ||
      char === "ArrowLeft" ||
      char === "ArrowRight" ||
      char === "Tab" ||
      char === "Enter" ||
      char === "Home" ||
      char === "End";

    if (!isValidChar) {
      e.preventDefault();
      return;
    }

    // Permetti il meno solo all'inizio e solo se non già presente
    if (char === "-") {
      if (this.selectionStart !== 0 || this.value.includes("-")) {
        e.preventDefault();
      }
    }
  });
}


// ─── COLORAZIONE INPUT IN BASE AL SEGNO ──────────────────────
function coloraInputImporto(input) {
  if (!input) return;

  const value = input.value.trim();

  if (!value) {
    input.style.color = "";
    input.style.borderColor = "";
    return;
  }

  const num = parseNumeroItaliano(value);

  if (isNaN(num)) {
    input.style.color = "";
    input.style.borderColor = "";
  } else if (num < 0) {
    input.style.color = "var(--red)";
  } else if (num > 0) {
    input.style.color = "var(--green)";
  } else {
    input.style.color = "";
  }
}
