const {
  runQuery,
  runQueryAndGetId,
  queryAll,
  queryOne,
} = require("../database");

const GIORNI_RETENTION = 15;

// Calcola la soglia in JavaScript (evita problemi con datetime() in sql.js/WASM)
function getSoglia() {
  const d = new Date();
  d.setDate(d.getDate() - GIORNI_RETENTION);
  // Formato SQLite: YYYY-MM-DD HH:MM:SS
  return d.toISOString().replace("T", " ").substring(0, 19);
}

function spostaInCestino({ tabella, record_id, dati_json, eliminato_da }) {
  // Salva il timestamp in formato ISO locale calcolato in JS
  const ora = new Date().toISOString().replace("T", " ").substring(0, 19);
  return runQueryAndGetId(
    `INSERT INTO cestino (tabella, record_id, dati_json, eliminato_da, data_eliminazione)
     VALUES (?,?,?,?,?)`,
    [tabella, record_id, JSON.stringify(dati_json), eliminato_da || "utente", ora],
  );
}

function getCestino(filtri = {}) {
  // Elimina subito i record scaduti ogni volta che si apre il cestino
  eliminaScadutiCestino();

  let sql = `SELECT * FROM cestino WHERE 1=1`;
  const params = [];
  if (filtri.tabella) {
    sql += ` AND tabella = ?`;
    params.push(filtri.tabella);
  }
  if (filtri.search && filtri.search.trim()) {
    sql += ` AND (dati_json LIKE ? OR tabella LIKE ?)`;
    params.push(`%${filtri.search.trim()}%`, `%${filtri.search.trim()}%`);
  }
  sql += ` ORDER BY data_eliminazione DESC`;
  const rows = queryAll(sql, params);
  return rows.map((r) => ({ ...r, dati: safeParseJson(r.dati_json) }));
}

function getCestinoItem(id) {
  const r = queryOne(`SELECT * FROM cestino WHERE id = ?`, [id]);
  if (!r) return null;
  return { ...r, dati: safeParseJson(r.dati_json) };
}

function eliminaDalCestino(id) {
  const item = queryOne(`SELECT * FROM cestino WHERE id = ?`, [id]);
  if (!item) throw new Error("Elemento non trovato nel cestino");
  runQuery(`DELETE FROM cestino WHERE id = ?`, [id]);
  return item;
}

function svuotaCestino() {
  const count = queryOne(`SELECT COUNT(*) as cnt FROM cestino`);
  runQuery(`DELETE FROM cestino`);
  return count.cnt;
}

function eliminaScadutiCestino() {
  // Soglia calcolata in JS: funziona sia con timestamp UTC che localtime
  const soglia = getSoglia();
  const result = queryOne(
    `SELECT COUNT(*) as cnt FROM cestino WHERE data_eliminazione <= ?`,
    [soglia],
  );
  runQuery(`DELETE FROM cestino WHERE data_eliminazione <= ?`, [soglia]);
  return result ? result.cnt : 0;
}

function safeParseJson(str) {
  try {
    return typeof str === "string" ? JSON.parse(str) : str;
  } catch {
    return {};
  }
}

module.exports = {
  spostaInCestino,
  getCestino,
  getCestinoItem,
  eliminaDalCestino,
  svuotaCestino,
  eliminaScadutiCestino,
  GIORNI_RETENTION,
};