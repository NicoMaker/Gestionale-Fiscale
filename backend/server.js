const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

const DB_PATH = path.join(__dirname, 'db', 'gestionale.db');
let db;

async function initDB() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
    console.log('✅ Database caricato da file');
  } else {
    db = new SQL.Database();
    console.log('🆕 Nuovo database creato');
    createSchema();
    seedData();
    saveDB();
  }
}

function saveDB() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, buffer);
}

function runQuery(sql, params = []) {
  db.run(sql, params);
  saveDB();
}

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function queryOne(sql, params = []) {
  return queryAll(sql, params)[0] || null;
}

function createSchema() {
  db.run(`CREATE TABLE IF NOT EXISTS tipologie_cliente (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codice TEXT NOT NULL UNIQUE,
    nome TEXT NOT NULL,
    descrizione TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS sottotipologie (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_tipologia INTEGER NOT NULL,
    codice TEXT NOT NULL,
    nome TEXT NOT NULL,
    FOREIGN KEY (id_tipologia) REFERENCES tipologie_cliente(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS clienti (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    id_tipologia INTEGER NOT NULL,
    id_sottotipologia INTEGER,
    codice_fiscale TEXT,
    partita_iva TEXT,
    email TEXT,
    telefono TEXT,
    indirizzo TEXT,
    note TEXT,
    attivo INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (id_tipologia) REFERENCES tipologie_cliente(id),
    FOREIGN KEY (id_sottotipologia) REFERENCES sottotipologie(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS adempimenti (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codice TEXT NOT NULL UNIQUE,
    nome TEXT NOT NULL,
    descrizione TEXT,
    tipologie_applicabili TEXT,
    scadenza_tipo TEXT,
    attivo INTEGER DEFAULT 1
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS adempimenti_cliente (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_cliente INTEGER NOT NULL,
    id_adempimento INTEGER NOT NULL,
    anno INTEGER NOT NULL,
    mese INTEGER,
    trimestre INTEGER,
    stato TEXT DEFAULT 'da_fare',
    data_scadenza TEXT,
    data_completamento TEXT,
    note TEXT,
    importo REAL,
    FOREIGN KEY (id_cliente) REFERENCES clienti(id),
    FOREIGN KEY (id_adempimento) REFERENCES adempimenti(id)
  )`);

  console.log('📐 Schema creato');
}

function seedData() {
  const tipologie = [
    { codice: 'PF', nome: 'Persona Fisica', descrizione: 'Contribuente persona fisica' },
    { codice: 'SP', nome: 'Società di Persone', descrizione: 'SNC, SAS, SS' },
    { codice: 'SC', nome: 'Società di Capitali', descrizione: 'SRL, SPA, SAPA' },
    { codice: 'ASS', nome: 'Associazione', descrizione: 'Associazioni e enti non commerciali' },
  ];
  tipologie.forEach(t => db.run(`INSERT INTO tipologie_cliente (codice, nome, descrizione) VALUES (?,?,?)`, [t.codice, t.nome, t.descrizione]));

  const sottotipologie = [
    { id_tipologia: 1, codice: 'PF_O', nome: 'PF - Ordinario' },
    { id_tipologia: 1, codice: 'PF_F', nome: 'PF - Forfettario' },
    { id_tipologia: 1, codice: 'PF_PRIVA', nome: 'PF - Privato' },
    { id_tipologia: 1, codice: 'PF_SOCIO', nome: 'PF - Socio' },
    { id_tipologia: 1, codice: 'PF_DITTA', nome: 'PF - Ditta Individuale' },
    { id_tipologia: 1, codice: 'PF_PROF', nome: 'PF - Professionista' },
    { id_tipologia: 2, codice: 'SP_O', nome: 'SP - Ordinaria' },
    { id_tipologia: 2, codice: 'SP_S', nome: 'SP - Semplificata' },
    { id_tipologia: 2, codice: 'SP_PROF', nome: 'SP - Studio Professionale' },
    { id_tipologia: 3, codice: 'SC_O', nome: 'SC - Ordinaria' },
    { id_tipologia: 3, codice: 'SC_S', nome: 'SC - Semplificata' },
    { id_tipologia: 4, codice: 'ASS_O', nome: 'ASS - Ordinaria' },
    { id_tipologia: 4, codice: 'ASS_S', nome: 'ASS - Semplificata' },
  ];
  sottotipologie.forEach(s => db.run(`INSERT INTO sottotipologie (id_tipologia, codice, nome) VALUES (?,?,?)`, [s.id_tipologia, s.codice, s.nome]));

  const adempimenti = [
    { codice: 'TASSA_NID', nome: 'Tassa NID', descrizione: 'Tassa numerazione e idoneità documenti', tipologie: ['PF','SP','SC','ASS'], scadenza: 'annuale' },
    { codice: 'INAIL', nome: 'INAIL', descrizione: 'Dichiarazione e pagamenti INAIL', tipologie: ['PF','SP','SC'], scadenza: 'annuale' },
    { codice: 'INPS_1', nome: 'INPS Trim. 1°', descrizione: 'INPS 1° trimestre', tipologie: ['PF','SP','SC'], scadenza: 'trimestrale' },
    { codice: 'INPS_2', nome: 'INPS Trim. 2°', descrizione: 'INPS 2° trimestre', tipologie: ['PF','SP','SC'], scadenza: 'trimestrale' },
    { codice: 'INPS_3', nome: 'INPS Trim. 3°', descrizione: 'INPS 3° trimestre', tipologie: ['PF','SP','SC'], scadenza: 'trimestrale' },
    { codice: 'INPS_4', nome: 'INPS Trim. 4°', descrizione: 'INPS 4° trimestre', tipologie: ['PF','SP','SC'], scadenza: 'trimestrale' },
    { codice: 'LIPE_1', nome: 'LIPE 1°', descrizione: 'Liquidazione IVA periodica 1° trimestre', tipologie: ['PF','SP','SC'], scadenza: 'trimestrale' },
    { codice: 'LIPE_2', nome: 'LIPE 2°', descrizione: 'Liquidazione IVA periodica 2° trimestre', tipologie: ['PF','SP','SC'], scadenza: 'trimestrale' },
    { codice: 'LIPE_3', nome: 'LIPE 3°', descrizione: 'Liquidazione IVA periodica 3° trimestre', tipologie: ['PF','SP','SC'], scadenza: 'trimestrale' },
    { codice: 'LIPE_4', nome: 'LIPE 4°', descrizione: 'Liquidazione IVA periodica 4° trimestre', tipologie: ['PF','SP','SC'], scadenza: 'trimestrale' },
    { codice: 'ACCONTO_IVA', nome: 'Acconto IVA', descrizione: 'Acconto IVA annuale', tipologie: ['PF','SP','SC'], scadenza: 'annuale' },
    { codice: 'CU', nome: 'CU', descrizione: 'Certificazione Unica', tipologie: ['PF','SP','SC','ASS'], scadenza: 'annuale' },
    { codice: '770', nome: '770', descrizione: 'Dichiarazione sostituti di imposta', tipologie: ['PF','SP','SC','ASS'], scadenza: 'annuale' },
    { codice: 'DICH_IVA', nome: 'Dichiarazione IVA', descrizione: 'Dichiarazione IVA annuale', tipologie: ['PF','SP','SC'], scadenza: 'annuale' },
    { codice: 'BILANCIO', nome: 'Bilancio', descrizione: 'Deposito bilancio annuale', tipologie: ['SC'], scadenza: 'annuale' },
    { codice: 'DIRITTO_ANNUALE', nome: 'Diritto Annuale CCIAA', descrizione: 'Diritto annuale Camera di Commercio', tipologie: ['SP','SC'], scadenza: 'annuale' },
    { codice: 'IRAP', nome: 'IRAP', descrizione: 'Imposta Regionale sulle Attività Produttive', tipologie: ['PF','SP','SC'], scadenza: 'annuale' },
    { codice: 'ELAB_SALARI_1', nome: 'Elab. Salari 1°', descrizione: 'Elaborazione salari 1° semestre', tipologie: ['PF','SP','SC','ASS'], scadenza: 'semestrale' },
    { codice: 'ELAB_SALARI_2', nome: 'Elab. Salari 2°', descrizione: 'Elaborazione salari 2° semestre', tipologie: ['PF','SP','SC','ASS'], scadenza: 'semestrale' },
    { codice: 'DICH_REDDITI', nome: 'Dichiarazione Redditi', descrizione: 'Dichiarazione annuale redditi (ex Unico)', tipologie: ['PF','SP','SC','ASS'], scadenza: 'annuale' },
    { codice: 'DICH_INPS', nome: 'Dichiarazione INPS', descrizione: 'Dichiarazione INPS annuale', tipologie: ['PF','SP','SC'], scadenza: 'annuale' },
    { codice: '730', nome: '730', descrizione: 'Mod. 730 persone fisiche dipendenti', tipologie: ['PF'], scadenza: 'annuale' },
    { codice: '770_ELAB', nome: '770 Elab. Invest.', descrizione: '770 Elaborazione investimenti', tipologie: ['SC','SP'], scadenza: 'annuale' },
    { codice: 'IMU', nome: 'IMU', descrizione: 'Imposta Municipale Unica', tipologie: ['PF','SP','SC','ASS'], scadenza: 'annuale' },
  ];
  adempimenti.forEach(a => db.run(`INSERT INTO adempimenti (codice, nome, descrizione, tipologie_applicabili, scadenza_tipo) VALUES (?,?,?,?,?)`,
    [a.codice, a.nome, a.descrizione, JSON.stringify(a.tipologie), a.scadenza]));

  const clientiEsempio = [
    { nome: 'Mario Rossi', id_tipologia: 1, id_sottotipologia: 1, cf: 'RSSMRA80A01L219K', piva: null, email: 'mario.rossi@email.it', tel: '333 1234567', indirizzo: 'Via Roma 1, Udine' },
    { nome: 'Anna Bianchi', id_tipologia: 1, id_sottotipologia: 2, cf: 'BNCNNA85M41F205X', piva: null, email: 'anna.bianchi@email.it', tel: '347 9876543', indirizzo: 'Via Venezia 5, Trieste' },
    { nome: 'Studio Verdi SNC', id_tipologia: 2, id_sottotipologia: 8, cf: null, piva: '01234567890', email: 'info@studioverdi.it', tel: '0432 123456', indirizzo: 'Corso Vittorio 10, Udine' },
    { nome: 'Alfa Srl', id_tipologia: 3, id_sottotipologia: 10, cf: null, piva: '09876543210', email: 'info@alfasrl.it', tel: '040 654321', indirizzo: 'Zona Industriale, Trieste' },
    { nome: 'Associazione Beta', id_tipologia: 4, id_sottotipologia: 12, cf: null, piva: '05555555555', email: 'info@assocbeta.it', tel: '0481 333444', indirizzo: 'Via Aquileia 3, Gorizia' },
    { nome: 'Giuseppe Neri', id_tipologia: 1, id_sottotipologia: 5, cf: 'NRIGPP70C15H501Z', piva: '12345678901', email: 'g.neri@email.it', tel: '348 1112223', indirizzo: 'Via Garibaldi 7, Pordenone' },
  ];
  clientiEsempio.forEach(c => db.run(`INSERT INTO clienti (nome, id_tipologia, id_sottotipologia, codice_fiscale, partita_iva, email, telefono, indirizzo) VALUES (?,?,?,?,?,?,?,?)`,
    [c.nome, c.id_tipologia, c.id_sottotipologia, c.cf, c.piva, c.email, c.tel, c.indirizzo]));

  console.log('🌱 Dati di esempio inseriti');
}

// ─── HELPER: genera scadenzario per cliente/anno ──────────────────────────────
function generaScadenzarioInterno(id_cliente, anno) {
  const cliente = queryOne(`SELECT c.*, t.codice as tip_codice FROM clienti c JOIN tipologie_cliente t ON c.id_tipologia=t.id WHERE c.id=?`, [id_cliente]);
  if (!cliente) throw new Error('Cliente non trovato');

  const adempimenti = queryAll(`SELECT * FROM adempimenti WHERE attivo=1`);
  const applicabili = adempimenti.filter(a => {
    try { return JSON.parse(a.tipologie_applicabili).includes(cliente.tip_codice); } catch { return false; }
  });

  runQuery(`DELETE FROM adempimenti_cliente WHERE id_cliente=? AND anno=?`, [id_cliente, anno]);

  applicabili.forEach(a => {
    if (a.scadenza_tipo === 'trimestrale') {
      [1,2,3,4].forEach(t => runQuery(`INSERT INTO adempimenti_cliente (id_cliente, id_adempimento, anno, trimestre, stato) VALUES (?,?,?,?,?)`, [id_cliente, a.id, anno, t, 'da_fare']));
    } else if (a.scadenza_tipo === 'mensile') {
      [1,2,3,4,5,6,7,8,9,10,11,12].forEach(m => runQuery(`INSERT INTO adempimenti_cliente (id_cliente, id_adempimento, anno, mese, stato) VALUES (?,?,?,?,?)`, [id_cliente, a.id, anno, m, 'da_fare']));
    } else if (a.scadenza_tipo === 'semestrale') {
      [1,2].forEach(s => runQuery(`INSERT INTO adempimenti_cliente (id_cliente, id_adempimento, anno, trimestre, stato) VALUES (?,?,?,?,?)`, [id_cliente, a.id, anno, s, 'da_fare']));
    } else {
      runQuery(`INSERT INTO adempimenti_cliente (id_cliente, id_adempimento, anno, stato) VALUES (?,?,?,?)`, [id_cliente, a.id, anno, 'da_fare']);
    }
  });

  return applicabili.length;
}

// ─── SOCKET.IO ────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`🔌 Client connesso: ${socket.id}`);

  // ── TIPOLOGIE ──
  socket.on('get:tipologie', () => {
    try {
      const tipologie = queryAll(`SELECT * FROM tipologie_cliente ORDER BY id`);
      const sottotipologie = queryAll(`SELECT * FROM sottotipologie ORDER BY id_tipologia, id`);
      tipologie.forEach(t => { t.sottotipologie = sottotipologie.filter(s => s.id_tipologia === t.id); });
      socket.emit('res:tipologie', { success: true, data: tipologie });
    } catch (e) { socket.emit('res:tipologie', { success: false, error: e.message }); }
  });

  // ── CLIENTI ──
  socket.on('get:clienti', (filtri = {}) => {
    try {
      let sql = `
        SELECT c.*, t.codice as tipologia_codice, t.nome as tipologia_nome,
               s.codice as sottotipologia_codice, s.nome as sottotipologia_nome
        FROM clienti c
        LEFT JOIN tipologie_cliente t ON c.id_tipologia = t.id
        LEFT JOIN sottotipologie s ON c.id_sottotipologia = s.id
        WHERE c.attivo = 1
      `;
      const params = [];
      if (filtri.tipologia) { sql += ` AND t.codice = ?`; params.push(filtri.tipologia); }
      if (filtri.search) { sql += ` AND (c.nome LIKE ? OR c.codice_fiscale LIKE ? OR c.partita_iva LIKE ? OR c.email LIKE ?)`; const s = `%${filtri.search}%`; params.push(s,s,s,s); }
      sql += ` ORDER BY c.nome`;
      const clienti = queryAll(sql, params);
      socket.emit('res:clienti', { success: true, data: clienti });
    } catch (e) { socket.emit('res:clienti', { success: false, error: e.message }); }
  });

  socket.on('get:cliente', ({ id }) => {
    try {
      const cliente = queryOne(`
        SELECT c.*, t.codice as tipologia_codice, t.nome as tipologia_nome,
               s.codice as sottotipologia_codice, s.nome as sottotipologia_nome
        FROM clienti c
        LEFT JOIN tipologie_cliente t ON c.id_tipologia = t.id
        LEFT JOIN sottotipologie s ON c.id_sottotipologia = s.id
        WHERE c.id = ?`, [id]);
      socket.emit('res:cliente', { success: true, data: cliente });
    } catch (e) { socket.emit('res:cliente', { success: false, error: e.message }); }
  });

  socket.on('create:cliente', (data) => {
    try {
      runQuery(`INSERT INTO clienti (nome, id_tipologia, id_sottotipologia, codice_fiscale, partita_iva, email, telefono, indirizzo, note) VALUES (?,?,?,?,?,?,?,?,?)`,
        [data.nome, data.id_tipologia, data.id_sottotipologia || null, data.codice_fiscale || null, data.partita_iva || null, data.email || null, data.telefono || null, data.indirizzo || null, data.note || null]);
      const newId = queryOne(`SELECT last_insert_rowid() as id`).id;
      // Auto-genera scadenzario per anno corrente
      const anno = new Date().getFullYear();
      const nAdp = generaScadenzarioInterno(newId, anno);
      io.emit('notify', { type: 'success', msg: `Cliente "${data.nome}" creato con ${nAdp} adempimenti per ${anno}` });
      socket.emit('res:create:cliente', { success: true, id: newId });
    } catch (e) { socket.emit('res:create:cliente', { success: false, error: e.message }); }
  });

  socket.on('update:cliente', (data) => {
    try {
      const vecchio = queryOne(`SELECT id_tipologia FROM clienti WHERE id=?`, [data.id]);
      runQuery(`UPDATE clienti SET nome=?, id_tipologia=?, id_sottotipologia=?, codice_fiscale=?, partita_iva=?, email=?, telefono=?, indirizzo=?, note=? WHERE id=?`,
        [data.nome, data.id_tipologia, data.id_sottotipologia || null, data.codice_fiscale || null, data.partita_iva || null, data.email || null, data.telefono || null, data.indirizzo || null, data.note || null, data.id]);
      // Se cambio tipologia, rigenera scadenzario
      if (vecchio && vecchio.id_tipologia !== data.id_tipologia) {
        const anno = new Date().getFullYear();
        generaScadenzarioInterno(data.id, anno);
        io.emit('notify', { type: 'info', msg: `Tipologia cambiata: scadenzario ${anno} rigenerato` });
      } else {
        io.emit('notify', { type: 'success', msg: `Cliente aggiornato` });
      }
      socket.emit('res:update:cliente', { success: true });
    } catch (e) { socket.emit('res:update:cliente', { success: false, error: e.message }); }
  });

  socket.on('delete:cliente', ({ id }) => {
    try {
      runQuery(`UPDATE clienti SET attivo=0 WHERE id=?`, [id]);
      io.emit('notify', { type: 'info', msg: `Cliente eliminato` });
      socket.emit('res:delete:cliente', { success: true });
    } catch (e) { socket.emit('res:delete:cliente', { success: false, error: e.message }); }
  });

  // ── ADEMPIMENTI (CRUD completo) ──
  socket.on('get:adempimenti', () => {
    try {
      const adempimenti = queryAll(`SELECT * FROM adempimenti WHERE attivo=1 ORDER BY codice`);
      socket.emit('res:adempimenti', { success: true, data: adempimenti });
    } catch (e) { socket.emit('res:adempimenti', { success: false, error: e.message }); }
  });

  socket.on('create:adempimento', (data) => {
    try {
      const existing = queryOne(`SELECT id FROM adempimenti WHERE codice=?`, [data.codice]);
      if (existing) throw new Error(`Codice "${data.codice}" già esistente`);
      runQuery(`INSERT INTO adempimenti (codice, nome, descrizione, tipologie_applicabili, scadenza_tipo) VALUES (?,?,?,?,?)`,
        [data.codice, data.nome, data.descrizione || null, JSON.stringify(data.tipologie_applicabili || []), data.scadenza_tipo]);
      io.emit('notify', { type: 'success', msg: `Adempimento "${data.nome}" creato` });
      socket.emit('res:create:adempimento', { success: true });
    } catch (e) { socket.emit('res:create:adempimento', { success: false, error: e.message }); }
  });

  socket.on('update:adempimento', (data) => {
    try {
      runQuery(`UPDATE adempimenti SET codice=?, nome=?, descrizione=?, tipologie_applicabili=?, scadenza_tipo=? WHERE id=?`,
        [data.codice, data.nome, data.descrizione || null, JSON.stringify(data.tipologie_applicabili || []), data.scadenza_tipo, data.id]);
      io.emit('notify', { type: 'success', msg: `Adempimento aggiornato` });
      socket.emit('res:update:adempimento', { success: true });
    } catch (e) { socket.emit('res:update:adempimento', { success: false, error: e.message }); }
  });

  socket.on('delete:adempimento', ({ id }) => {
    try {
      runQuery(`UPDATE adempimenti SET attivo=0 WHERE id=?`, [id]);
      io.emit('notify', { type: 'info', msg: `Adempimento eliminato` });
      socket.emit('res:delete:adempimento', { success: true });
    } catch (e) { socket.emit('res:delete:adempimento', { success: false, error: e.message }); }
  });

  // ── SCADENZARIO ──
  socket.on('get:scadenzario', ({ id_cliente, anno, filtro_stato, filtro_adempimento }) => {
    try {
      let sql = `
        SELECT ac.*, a.codice, a.nome as adempimento_nome, a.scadenza_tipo,
               c.nome as cliente_nome
        FROM adempimenti_cliente ac
        JOIN adempimenti a ON ac.id_adempimento = a.id
        JOIN clienti c ON ac.id_cliente = c.id
        WHERE ac.id_cliente=? AND ac.anno=?
      `;
      const params = [id_cliente, anno];
      if (filtro_stato && filtro_stato !== 'tutti') { sql += ` AND ac.stato=?`; params.push(filtro_stato); }
      if (filtro_adempimento) { sql += ` AND a.codice LIKE ?`; params.push(`%${filtro_adempimento}%`); }
      sql += ` ORDER BY a.codice, ac.trimestre, ac.mese`;
      const righe = queryAll(sql, params);
      socket.emit('res:scadenzario', { success: true, data: righe });
    } catch (e) { socket.emit('res:scadenzario', { success: false, error: e.message }); }
  });

  socket.on('get:scadenzario_globale', ({ anno, filtro_stato, filtro_tipologia }) => {
    try {
      let sql = `
        SELECT ac.*, a.codice, a.nome as adempimento_nome, a.scadenza_tipo,
               c.nome as cliente_nome, t.codice as tipologia_codice
        FROM adempimenti_cliente ac
        JOIN adempimenti a ON ac.id_adempimento = a.id
        JOIN clienti c ON ac.id_cliente = c.id
        JOIN tipologie_cliente t ON c.id_tipologia = t.id
        WHERE ac.anno=? AND c.attivo=1
      `;
      const params = [anno];
      if (filtro_stato && filtro_stato !== 'tutti') { sql += ` AND ac.stato=?`; params.push(filtro_stato); }
      if (filtro_tipologia && filtro_tipologia !== 'tutti') { sql += ` AND t.codice=?`; params.push(filtro_tipologia); }
      sql += ` ORDER BY c.nome, a.codice`;
      const righe = queryAll(sql, params);
      socket.emit('res:scadenzario_globale', { success: true, data: righe });
    } catch (e) { socket.emit('res:scadenzario_globale', { success: false, error: e.message }); }
  });

  socket.on('genera:scadenzario', ({ id_cliente, anno }) => {
    try {
      const nAdp = generaScadenzarioInterno(id_cliente, anno);
      const cliente = queryOne(`SELECT nome FROM clienti WHERE id=?`, [id_cliente]);
      io.emit('notify', { type: 'success', msg: `Scadenzario ${anno} generato: ${nAdp} adempimenti per ${cliente.nome}` });
      socket.emit('res:genera:scadenzario', { success: true });
    } catch (e) { socket.emit('res:genera:scadenzario', { success: false, error: e.message }); }
  });

  socket.on('copia:scadenzario', ({ id_cliente, anno_da, anno_a }) => {
    try {
      const righe = queryAll(`SELECT * FROM adempimenti_cliente WHERE id_cliente=? AND anno=?`, [id_cliente, anno_da]);
      runQuery(`DELETE FROM adempimenti_cliente WHERE id_cliente=? AND anno=?`, [id_cliente, anno_a]);
      righe.forEach(r => runQuery(`INSERT INTO adempimenti_cliente (id_cliente, id_adempimento, anno, mese, trimestre, stato, data_scadenza, note, importo) VALUES (?,?,?,?,?,?,?,?,?)`,
        [r.id_cliente, r.id_adempimento, anno_a, r.mese, r.trimestre, r.stato, null, null, null]));
      io.emit('notify', { type: 'success', msg: `Scadenzario copiato da ${anno_da} a ${anno_a}` });
      socket.emit('res:copia:scadenzario', { success: true });
    } catch (e) { socket.emit('res:copia:scadenzario', { success: false, error: e.message }); }
  });

  socket.on('update:adempimento_stato', ({ id, stato, data_completamento, importo, note, data_scadenza }) => {
    try {
      runQuery(`UPDATE adempimenti_cliente SET stato=?, data_completamento=?, importo=?, note=?, data_scadenza=? WHERE id=?`,
        [stato, data_completamento || null, importo || null, note || null, data_scadenza || null, id]);
      socket.emit('res:update:adempimento_stato', { success: true });
    } catch (e) { socket.emit('res:update:adempimento_stato', { success: false, error: e.message }); }
  });

  socket.on('delete:adempimento_cliente', ({ id }) => {
    try {
      runQuery(`DELETE FROM adempimenti_cliente WHERE id=?`, [id]);
      io.emit('notify', { type: 'info', msg: `Adempimento rimosso dallo scadenzario` });
      socket.emit('res:delete:adempimento_cliente', { success: true });
    } catch (e) { socket.emit('res:delete:adempimento_cliente', { success: false, error: e.message }); }
  });

  socket.on('add:adempimento_cliente', ({ id_cliente, id_adempimento, anno, trimestre, mese }) => {
    try {
      runQuery(`INSERT INTO adempimenti_cliente (id_cliente, id_adempimento, anno, trimestre, mese, stato) VALUES (?,?,?,?,?,?)`,
        [id_cliente, id_adempimento, anno, trimestre || null, mese || null, 'da_fare']);
      io.emit('notify', { type: 'success', msg: `Adempimento aggiunto allo scadenzario` });
      socket.emit('res:add:adempimento_cliente', { success: true });
    } catch (e) { socket.emit('res:add:adempimento_cliente', { success: false, error: e.message }); }
  });

  // ── STATS ──
  socket.on('get:stats', ({ anno }) => {
    try {
      const totClienti = queryOne(`SELECT COUNT(*) as n FROM clienti WHERE attivo=1`).n;
      const perTipologia = queryAll(`SELECT t.codice, t.nome, COUNT(c.id) as n FROM tipologie_cliente t LEFT JOIN clienti c ON c.id_tipologia=t.id AND c.attivo=1 GROUP BY t.id ORDER BY t.id`);
      const totAdempimenti = queryOne(`SELECT COUNT(*) as n FROM adempimenti_cliente WHERE anno=?`, [anno]).n;
      const completati = queryOne(`SELECT COUNT(*) as n FROM adempimenti_cliente WHERE anno=? AND stato='completato'`, [anno]).n;
      const daFare = queryOne(`SELECT COUNT(*) as n FROM adempimenti_cliente WHERE anno=? AND stato='da_fare'`, [anno]).n;
      const inCorso = queryOne(`SELECT COUNT(*) as n FROM adempimenti_cliente WHERE anno=? AND stato='in_corso'`, [anno]).n;
      socket.emit('res:stats', { success: true, data: { totClienti, perTipologia, totAdempimenti, completati, daFare, inCorso, anno } });
    } catch (e) { socket.emit('res:stats', { success: false, error: e.message }); }
  });

  socket.on('disconnect', () => console.log(`🔌 Client disconnesso: ${socket.id}`));
});

const PORT = process.env.PORT || 3000;
initDB().then(() => {
  server.listen(PORT, () => console.log(`🚀 Server avviato su http://localhost:${PORT}`));
});