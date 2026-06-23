const {
  runQuery,
  runQueryAndGetId,
  queryAll,
  queryOne,
} = require("../database");

// Eliminazione dopo 14 giorni completi: la pulizia notturna avviene
// nella notte tra il 14° e il 15° giorno, così il badge non mostra mai
// "0 giorni rimasti" (il frontend nasconde già gli elementi con ≤ 0 giorni).
const GIORNI_RETENTION = 14;

function spostaInCestino({ tabella, record_id, dati_json, eliminato_da }) {
  return runQueryAndGetId(
    `INSERT INTO cestino (tabella, record_id, dati_json, eliminato_da, data_eliminazione)
     VALUES (?,?,?,?,datetime('now'))`,
    [tabella, record_id, JSON.stringify(dati_json), eliminato_da || "utente"],
  );
}

function getCestino(filtri = {}) {
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
  // Eliminazione nella notte tra il 14° e il 15° giorno (GIORNI_RETENTION=14).
  // Il frontend già nasconde gli elementi con rimanenti ≤ 0, quindi
  // il badge non mostra mai "0 giorni rimasti".
  const soglia = `datetime('now', '-${GIORNI_RETENTION} days')`;
  const result = queryOne(
    `SELECT COUNT(*) as cnt FROM cestino WHERE data_eliminazione < ${soglia}`,
  );
  runQuery(`DELETE FROM cestino WHERE data_eliminazione < ${soglia}`);
  return result.cnt;
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
