// ═══════════════════════════════════════════════════════════════
// DATE-UTILS.JS (Frontend) — Utilità UI per campi data
// ───────────────────────────────────────────────────────────────
// Le funzioni CORE (formattaDataItaliana, formattaDataOraItaliana,
// daItalianaAISO, oggiItaliano, oraOggiItaliano,
// formattaTimestampItaliano) vivono nel modulo CONDIVISO
// /shared/date-core.js — caricato PRIMA di questo file — e sono
// le stesse identiche usate dal backend Node: zero duplicazione.
//
// Qui restano solo le utilità legate al DOM (input, datepicker).
// ═══════════════════════════════════════════════════════════════

/**
 * Formatta automaticamente l'input di una data mentre l'utente digita
 * @param {string} input - L'input dell'utente
 * @returns {string} - L'input formattato
 */
function formattaInputData(input) {
  // Rimuovi tutti i caratteri non numerici
  let numeri = input.replace(/\D/g, "");

  // Limita a 8 caratteri (ggmmaaaa)
  if (numeri.length > 8) {
    numeri = numeri.substring(0, 8);
  }

  // Aggiungi le barre
  if (numeri.length >= 5) {
    return `${numeri.substring(0, 2)}/${numeri.substring(2, 4)}/${numeri.substring(4, 8)}`;
  } else if (numeri.length >= 3) {
    return `${numeri.substring(0, 2)}/${numeri.substring(2, 4)}`;
  } else {
    return numeri;
  }
}

/**
 * Valida una data in formato italiano
 * @param {string} dataItaliana - La data in formato gg/mm/aaaa
 * @returns {boolean} - True se la data è valida
 */
function validaDataItaliana(dataItaliana) {
  if (!dataItaliana) return false;

  const parti = dataItaliana.split("/");
  if (parti.length !== 3) return false;

  const giorno = parseInt(parti[0], 10);
  const mese = parseInt(parti[1], 10);
  const anno = parseInt(parti[2], 10);

  // Controlli base
  if (isNaN(giorno) || isNaN(mese) || isNaN(anno)) return false;
  if (giorno < 1 || giorno > 31) return false;
  if (mese < 1 || mese > 12) return false;
  if (anno < 1900 || anno > 2100) return false;

  // Creiamo l'oggetto Date per validare la data
  const dataObj = new Date(anno, mese - 1, giorno);

  // Verifichiamo che la data sia valida (es. 31/02 non è valido)
  return (
    dataObj.getDate() === giorno &&
    dataObj.getMonth() === mese - 1 &&
    dataObj.getFullYear() === anno
  );
}

/**
 * Gestisce l'input di un campo data formattandolo automaticamente
 * @param {HTMLInputElement} inputElement - L'elemento input
 */
function gestisciInputData(inputElement) {
  inputElement.addEventListener("input", function (e) {
    const cursorPos = e.target.selectionStart;
    const valoreOriginale = e.target.value;
    const valoreFormattato = formattaInputData(valoreOriginale);

    if (valoreOriginale !== valoreFormattato) {
      e.target.value = valoreFormattato;

      // Riposiziona il cursore
      let nuovoCursorPos = cursorPos;
      if (valoreFormattato.length > valoreOriginale.length) {
        nuovoCursorPos++;
      }
      e.target.setSelectionRange(nuovoCursorPos, nuovoCursorPos);
    }
  });

  // Aggiungi validazione al blur (perdita focus)
  inputElement.addEventListener("blur", function (e) {
    const valore = e.target.value.trim();
    if (valore && !validaDataItaliana(valore)) {
      e.target.style.borderColor = "var(--red)";
      e.target.style.backgroundColor = "var(--red)08";
      showNotif(
        "Data non valida. Inserire una data nel formato gg/mm/aaaa",
        "error",
      );
    } else {
      e.target.style.borderColor = "";
      e.target.style.backgroundColor = "";
    }
  });
}

// ─── DATE PICKER ─────────────────────────────────────────────────────
/**
 * Crea un date picker personalizzato per l'input italiano
 * @param {HTMLInputElement} inputElement - L'elemento input a cui associare il picker
 */
function creaDatePicker(inputElement) {
  // Crea il contenitore del date picker
  const pickerContainer = document.createElement("div");
  pickerContainer.className = "date-picker-container";
  pickerContainer.style.cssText = `
    position: fixed;
    background: var(--surface1);
    border:1px solid var(--border);
    border-radius:8px;
    box-shadow:0 8px 24px rgba(0,0,0,0.25);
    z-index:9999;
    padding:12px;
    min-width:280px;
    max-width:320px;
    display: none;
    font-family: var(--font-family);
  `;

  // Crea l'header con mese e anno
  const header = document.createElement("div");
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    padding: 8px;
    background: var(--surface2);
    border-radius: 6px;
  `;

  const prevBtn = document.createElement("button");
  prevBtn.innerHTML = "‹";
  prevBtn.style.cssText = `
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    padding: 4px 8px;
    color: var(--text1);
  `;

  const nextBtn = document.createElement("button");
  nextBtn.innerHTML = "›";
  nextBtn.style.cssText = `
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    padding: 4px 8px;
    color: var(--text1);
  `;

  const monthYearLabel = document.createElement("div");
  monthYearLabel.style.cssText = `
    font-weight: 600;
    color: var(--text1);
    font-size: 14px;
  `;

  header.appendChild(prevBtn);
  header.appendChild(monthYearLabel);
  header.appendChild(nextBtn);

  // Crea la griglia dei giorni
  const grid = document.createElement("div");
  grid.style.cssText = `
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
    font-size: 12px;
  `;

  // Aggiungi header giorni della settimana
  const giorniSettimana = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
  giorniSettimana.forEach((giorno) => {
    const dayHeader = document.createElement("div");
    dayHeader.textContent = giorno;
    dayHeader.style.cssText = `
      text-align: center;
      font-weight: 600;
      color: var(--text2);
      padding: 4px;
    `;
    grid.appendChild(dayHeader);
  });

  pickerContainer.appendChild(header);
  pickerContainer.appendChild(grid);

  // Variabili di stato
  let currentDate = new Date();
  let selectedDate = null;
  let isVisible = false;

  // Funzione per renderizzare il calendario
  function renderCalendar() {
    // Pulisci la griglia (mantiene gli header)
    while (grid.children.length > 7) {
      grid.removeChild(grid.lastChild);
    }

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Aggiorna l'header
    monthYearLabel.textContent = `${getNomeMese(month)} ${year}`;

    // Calcola i giorni del mese
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    // Aggiungi giorni vuoti all'inizio
    for (let i = firstDay - 1; i >= 0; i--) {
      const dayDiv = document.createElement("div");
      dayDiv.textContent = daysInPrevMonth - i;
      dayDiv.style.cssText = `
        text-align: center;
        padding: 6px;
        color: var(--text3);
        cursor: not-allowed;
      `;
      grid.appendChild(dayDiv);
    }

    // Aggiungi giorni del mese
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDiv = document.createElement("div");
      dayDiv.textContent = day;
      dayDiv.style.cssText = `
        text-align: center;
        padding: 6px;
        cursor: pointer;
        border-radius: 4px;
        color: var(--text1);
      `;

      // Evidenzia oggi
      const today = new Date();
      if (
        year === today.getFullYear() &&
        month === today.getMonth() &&
        day === today.getDate()
      ) {
        dayDiv.style.background = "var(--accent)";
        dayDiv.style.color = "white";
      }

      // Evidenzia la data selezionata
      if (
        selectedDate &&
        year === selectedDate.getFullYear() &&
        month === selectedDate.getMonth() &&
        day === selectedDate.getDate()
      ) {
        dayDiv.style.background = "var(--primary)";
        dayDiv.style.color = "white";
      }

      // Hover effect
      dayDiv.addEventListener("mouseenter", () => {
        if (
          !dayDiv.style.background ||
          dayDiv.style.background === "var(--accent)"
        ) {
          dayDiv.style.background = "var(--surface2)";
        }
      });

      dayDiv.addEventListener("mouseleave", () => {
        if (
          !dayDiv.style.background ||
          dayDiv.style.background === "var(--accent)"
        ) {
          dayDiv.style.background = "";
        }
      });

      // Click sul giorno
      dayDiv.addEventListener("click", () => {
        selectedDate = new Date(year, month, day);
        inputElement.value = formattaDataItaliana(selectedDate);
        inputElement.style.borderColor = "";
        inputElement.style.backgroundColor = "";
        hidePicker();
      });

      grid.appendChild(dayDiv);
    }

    // Aggiungi giorni vuoti alla fine per completare la griglia
    const totalCells = grid.children.length - 7; // -7 per gli header
    const remainingCells = totalCells % 7;
    if (remainingCells > 0) {
      for (let i = 1; i <= 7 - remainingCells; i++) {
        const dayDiv = document.createElement("div");
        dayDiv.textContent = i;
        dayDiv.style.cssText = `
          text-align: center;
          padding: 6px;
          color: var(--text3);
          cursor: not-allowed;
        `;
        grid.appendChild(dayDiv);
      }
    }
  }

  // Funzione per ottenere il nome del mese in italiano
  function getNomeMese(monthIndex) {
    const mesi = [
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
    return mesi[monthIndex];
  }

  // Funzione per mostrare il picker
  function showPicker() {
    if (isVisible) return;

    // Posiziona il picker con logica anti-sovrapposizione
    const rect = inputElement.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Calcola la posizione ideale
    let top = rect.bottom + 4;
    let left = rect.left;

    // Controlla se il picker esce dal basso dello schermo
    const pickerHeight = 320; // altezza stimata del picker
    if (top + pickerHeight > viewportHeight) {
      // Posiziona sopra l'input
      top = rect.top - pickerHeight - 4;
    }

    // Controlla se il picker esce dal lato destro dello schermo
    const pickerWidth = 280; // larghezza del picker
    if (left + pickerWidth > viewportWidth) {
      // Allinea a destra
      left = viewportWidth - pickerWidth - 20;
    }

    // Assicurati che non esca dal lato sinistro
    if (left < 10) {
      left = 10;
    }

    pickerContainer.style.top = `${top}px`;
    pickerContainer.style.left = `${left}px`;

    document.body.appendChild(pickerContainer);
    pickerContainer.style.display = "block";
    isVisible = true;

    // Imposta la data corrente dal valore dell'input
    const inputValue = inputElement.value;
    if (inputValue && validaDataItaliana(inputValue)) {
      const parts = inputValue.split("/");
      currentDate = new Date(
        parseInt(parts[2]),
        parseInt(parts[1]) - 1,
        parseInt(parts[0]),
      );
      selectedDate = new Date(currentDate);
    } else {
      currentDate = new Date();
      selectedDate = null;
    }

    renderCalendar();
  }

  // Funzione per nascondere il picker
  function hidePicker() {
    if (!isVisible) return;
    pickerContainer.style.display = "none";
    if (pickerContainer.parentNode) {
      document.body.removeChild(pickerContainer);
    }
    isVisible = false;
  }

  // Event handlers
  prevBtn.addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  });

  nextBtn.addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  });

  // Click sull'input per mostrare il picker
  inputElement.addEventListener("click", (e) => {
    e.stopPropagation();
    showPicker();
  });

  // Click fuori per nascondere
  document.addEventListener("click", (e) => {
    if (!pickerContainer.contains(e.target) && e.target !== inputElement) {
      hidePicker();
    }
  });

  // ESC per nascondere
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isVisible) {
      hidePicker();
    }
  });

  // Funzione pubblica per aggiornare il picker
  inputElement.updatePicker = renderCalendar;
}

// ─── EXPORT GLOBALI (utilità UI) ────────────────────────────────
// Le funzioni core sono già globali grazie a /shared/date-core.js
if (typeof window !== "undefined") {
  window.formattaInputData = formattaInputData;
  window.validaDataItaliana = validaDataItaliana;
  window.gestisciInputData = gestisciInputData;
  window.creaDatePicker = creaDatePicker;
}
