// ═══════════════════════════════════════════════════════════════
// DATE-CORE.JS — Modulo CONDIVISO (backend Node + frontend browser)
// ───────────────────────────────────────────────────────────────
// Un'unica fonte di verità per la formattazione date in italiano.
// • Backend:  require("../../shared/date-core.js")
// • Frontend: <script src="shared/date-core.js"> → funzioni globali
// Formato UMD: funziona in entrambi gli ambienti senza build step.
// ═══════════════════════════════════════════════════════════════
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    // Ambiente Node.js (backend)
    module.exports = api;
  }
  if (typeof window !== "undefined") {
    // Ambiente browser (frontend): esponi come globali + namespace
    root.DateCore = api;
    Object.keys(api).forEach((k) => {
      root[k] = api[k];
    });
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /**
   * Formatta una data in formato italiano (GG/MM/AAAA)
   * @param {string|Date} data - Stringa ISO (YYYY-MM-DD), europea (DD/MM/YYYY) o Date
   * @returns {string} - La data formattata in italiano, "" se non valida
   */
  function formattaDataItaliana(data) {
    if (!data) return "";

    let dataObj;

    if (typeof data === "string") {
      if (data.includes("-")) {
        // Formato ISO: YYYY-MM-DD o YYYY-MM-DDTHH:mm:ss
        const parts = data.split("T")[0].split("-");
        if (parts.length === 3) {
          dataObj = new Date(parts[0], parts[1] - 1, parts[2]);
        }
      } else if (data.includes("/")) {
        // Formato europeo: DD/MM/YYYY (o americano MM/DD/YYYY come fallback)
        const parts = data.split("/");
        if (parts.length === 3) {
          const giorno = parseInt(parts[0], 10);
          const mese = parseInt(parts[1], 10);
          const anno = parseInt(parts[2], 10);
          if (mese > 12) {
            // Probabile formato americano
            dataObj = new Date(mese, giorno - 1, anno);
          } else {
            dataObj = new Date(anno, mese - 1, giorno);
          }
        }
      } else {
        dataObj = new Date(data);
      }
    } else if (data instanceof Date) {
      dataObj = data;
    } else {
      return "";
    }

    if (!dataObj || isNaN(dataObj.getTime())) return "";

    const giorno = String(dataObj.getDate()).padStart(2, "0");
    const mese = String(dataObj.getMonth() + 1).padStart(2, "0");
    const anno = dataObj.getFullYear();

    return `${giorno}/${mese}/${anno}`;
  }

  /**
   * Formatta una data con ora in formato italiano (GG/MM/AAAA HH:mm)
   * @param {string|Date} data - La data da formattare
   * @returns {string}
   */
  function formattaDataOraItaliana(data) {
    if (!data) return "";

    let dataObj;
    if (typeof data === "string") {
      dataObj = new Date(data);
    } else if (data instanceof Date) {
      dataObj = data;
    } else {
      return "";
    }

    if (isNaN(dataObj.getTime())) return "";

    const giorno = String(dataObj.getDate()).padStart(2, "0");
    const mese = String(dataObj.getMonth() + 1).padStart(2, "0");
    const anno = dataObj.getFullYear();
    const ore = String(dataObj.getHours()).padStart(2, "0");
    const minuti = String(dataObj.getMinutes()).padStart(2, "0");

    return `${giorno}/${mese}/${anno} ${ore}:${minuti}`;
  }

  /**
   * Converte una data dal formato italiano (DD/MM/YYYY) a ISO (YYYY-MM-DD)
   * @param {string} dataItaliana
   * @returns {string}
   */
  function daItalianaAISO(dataItaliana) {
    if (!dataItaliana) return "";

    const parts = dataItaliana.split("/");
    if (parts.length !== 3) return "";

    const giorno = parts[0].padStart(2, "0");
    const mese = parts[1].padStart(2, "0");
    const anno = parts[2];

    return `${anno}-${mese}-${giorno}`;
  }

  /** Data odierna in formato italiano */
  function oggiItaliano() {
    return formattaDataItaliana(new Date());
  }

  /** Data e ora odierne in formato italiano */
  function oraOggiItaliano() {
    return formattaDataOraItaliana(new Date());
  }

  /**
   * Formatta un timestamp Unix (ms) in formato italiano
   * @param {number} timestamp
   * @returns {string}
   */
  function formattaTimestampItaliano(timestamp) {
    if (!timestamp) return "";
    return formattaDataItaliana(new Date(timestamp));
  }

  return {
    formattaDataItaliana,
    formattaDataOraItaliana,
    daItalianaAISO,
    oggiItaliano,
    oraOggiItaliano,
    formattaTimestampItaliano,
  };
});
