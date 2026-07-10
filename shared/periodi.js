// ═══════════════════════════════════════════════════════════════
// PERIODI.JS — Modulo CONDIVISO (backend Node + frontend browser)
// ───────────────────────────────────────────────────────────────
// Ordinamento NATURALE dei periodi fiscali di un adempimento:
//   • mensile:     Gen → Dic          (mese 1..12)
//   • trimestrale: T1 → T2 → T3 → T4  (SEMPRE, mai il contrario)
//   • semestrale:  S1 → S2
//   • annuale:     unico periodo
// La chiave è il MESE DI INIZIO del periodo, così anche tipi
// diversi si ordinano in modo coerente sull'anno.
// Formato UMD: usabile con require() nel backend e come <script>
// globale nel frontend.
// ═══════════════════════════════════════════════════════════════
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  if (typeof window !== "undefined") {
    root.PeriodiCore = api;
    Object.keys(api).forEach((k) => {
      root[k] = api[k];
    });
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /**
   * Chiave numerica di ordinamento di un periodo (mese di inizio 1..12).
   * @param {object} r - Riga scadenza con scadenza_tipo + trimestre/semestre/mese
   * @returns {number} 1..12 (99 se non determinabile, finisce in coda)
   */
  function getPeriodoOrder(r) {
    if (!r) return 99;
    const tipo = r.scadenza_tipo;
    if (tipo === "trimestrale") {
      const t = parseInt(r.trimestre, 10);
      return t >= 1 && t <= 4 ? (t - 1) * 3 + 1 : 99; // T1=1, T2=4, T3=7, T4=10
    }
    if (tipo === "semestrale") {
      const s = parseInt(r.semestre, 10);
      return s === 2 ? 7 : s === 1 ? 1 : 99; // S1=1, S2=7
    }
    if (tipo === "mensile") {
      const m = parseInt(r.mese, 10);
      return m >= 1 && m <= 12 ? m : 99;
    }
    // annuale / solo scadenza: un unico periodo, in testa
    return 1;
  }

  /**
   * Comparatore standard per liste di scadenze/periodi.
   * Ordine: nome adempimento (A→Z) → periodo naturale (T1 prima di T2,
   * Gen prima di Feb, S1 prima di S2) → data scadenza crescente → id.
   * @param {object} a
   * @param {object} b
   * @returns {number}
   */
  function confrontaPeriodi(a, b) {
    // 1) Stesso gruppo: adempimenti diversi in ordine alfabetico
    const nomeA = (a && a.adempimento_nome) || "";
    const nomeB = (b && b.adempimento_nome) || "";
    if (nomeA !== nomeB) {
      return nomeA.localeCompare(nomeB, "it", { sensitivity: "base" });
    }

    // 2) Periodo naturale: T1 < T2 < T3 < T4, Gen < ... < Dic, S1 < S2
    const ordA = getPeriodoOrder(a);
    const ordB = getPeriodoOrder(b);
    if (ordA !== ordB) return ordA - ordB;

    // 3) A parità di periodo: data scadenza crescente (chi ha la data prima)
    const dataA = a && a.data_scadenza ? new Date(a.data_scadenza).getTime() : null;
    const dataB = b && b.data_scadenza ? new Date(b.data_scadenza).getTime() : null;
    if (dataA != null && dataB != null && dataA !== dataB) return dataA - dataB;
    if (dataA != null && dataB == null) return -1;
    if (dataB != null && dataA == null) return 1;

    // 4) Stabilità finale: id crescente
    return (a && a.id ? a.id : 0) - (b && b.id ? b.id : 0);
  }

  return { getPeriodoOrder, confrontaPeriodi };
});
