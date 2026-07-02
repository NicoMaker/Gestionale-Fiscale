// scripts/generateTestData.js
const { faker } = require("@faker-js/faker/locale/it");

const { initDB, runQuery, queryAll, queryOne } = require("../modules/database");
const clientiModel = require("../modules/models/clienti");
const adempimentiModel = require("../modules/models/adempimenti");
const scadenzarioModel = require("../modules/models/scadenzario");
const appuntiModel = require("../modules/models/appunti");
const paginaBiancaModel = require("../modules/models/paginaBianca");

// ─── UTILITY ──────────────────────────────────────────────────────────────────
function casuale(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getTipologie() {
  return queryAll(`SELECT * FROM tipologie_cliente`);
}

function getSottotipologiePerTipologia(id_tipologia) {
  return queryAll(`SELECT * FROM sottotipologie WHERE id_tipologia = ?`, [
    id_tipologia,
  ]);
}

function getAdempimentiEsistenti() {
  return queryAll(`SELECT * FROM adempimenti WHERE attivo = 1`);
}

// ─── CREA ADEMPIMENTI DI ESEMPIO (se non ci sono) ──────────────────────────
function creaAdempimentiEsempio() {
  const esistenti = getAdempimentiEsistenti();
  if (esistenti.length > 0) return esistenti;

  const adempimenti = [
    {
      codice: "DICHI_IVA",
      nome: "Dichiarazione IVA",
      scadenza_tipo: "annuale",
      is_contabilita: 1,
    },
    {
      codice: "LIQU_IVA",
      nome: "Liquidazione IVA",
      scadenza_tipo: "trimestrale",
      is_contabilita: 1,
    },
    {
      codice: "UNICO",
      nome: "Modello Unico",
      scadenza_tipo: "annuale",
      is_contabilita: 1,
    },
    {
      codice: "770",
      nome: "Modello 770",
      scadenza_tipo: "annuale",
      is_contabilita: 1,
    },
    { codice: "F24", nome: "F24", scadenza_tipo: "mensile", is_contabilita: 0 },
    {
      codice: "RAPPRESENTANTE",
      nome: "Nomina Rappresentante",
      scadenza_tipo: "annuale",
      is_checkbox: 1,
    },
    {
      codice: "VERBALE_ASS",
      nome: "Verbale Assemblea",
      scadenza_tipo: "annuale",
      is_text_only: 1,
    },
    {
      codice: "BILANCIO",
      nome: "Bilancio",
      scadenza_tipo: "annuale",
      is_contabilita: 1,
    },
    {
      codice: "IVA_PERIODICA",
      nome: "Iva periodica",
      scadenza_tipo: "trimestrale",
      is_contabilita: 1,
    },
    {
      codice: "STUDIO_SETT",
      nome: "Studio di settore",
      scadenza_tipo: "annuale",
    },
    {
      codice: "SPESOMETRO",
      nome: "Spesometro",
      scadenza_tipo: "semestrale",
      is_contabilita: 1,
    },
  ];

  adempimenti.forEach((a) => {
    try {
      adempimentiModel.createAdempimento(a);
    } catch (_) {
      /* ignora duplicati */
    }
  });
  return getAdempimentiEsistenti();
}

// ─── GENERA CLIENTE ──────────────────────────────────────────────────────────
function generaCliente(tipologie, sottotipologieMap, annoCorrente) {
  const nome = faker.person.firstName();
  const cognome = faker.person.lastName();
  const nomeCompleto = `${nome} ${cognome}`;

  const tipologia = casuale(tipologie);
  const sottotipologie = sottotipologieMap[tipologia.id] || [];
  const sottotipologia = sottotipologie.length ? casuale(sottotipologie) : null;

  const col2Values = ["A", "B", "C", "D", "E"];
  const col3Values = ["X", "Y", "Z", "W", "V"];
  const periodicitaOptions = [
    "annuale",
    "semestrale",
    "trimestrale",
    "mensile",
  ];

  return {
    nome: nomeCompleto,
    codice_fiscale: faker.string.alphanumeric(16).toUpperCase(),
    partita_iva: "IT" + faker.string.numeric(11),
    email: faker.internet
      .email({ firstName: nome, lastName: cognome })
      .toLowerCase(),
    telefono: faker.phone.number("+39 3## ### ####"),
    indirizzo: faker.location.streetAddress(),
    citta: faker.location.city(),
    cap: faker.location.zipCode(),
    provincia: faker.location.state({ abbreviated: true }),
    pec: faker.internet
      .email({ firstName: "pec", lastName: cognome })
      .toLowerCase(),
    sdi: faker.string.alphanumeric(7).toUpperCase(),
    iban: "IT" + faker.string.numeric(25),
    note: faker.lorem.sentence(),
    referente: faker.person.fullName(),
    contabilita: Math.random() > 0.5 ? 1 : 0,
    id_tipologia: tipologia.id,
    id_sottotipologia: sottotipologia ? sottotipologia.id : null,
    col2_value: casuale(col2Values),
    col3_value: casuale(col3Values),
    periodicita: casuale(periodicitaOptions),
    anno: annoCorrente,
  };
}

// ─── ASSEGNA ADEMPIMENTI A CLIENTE ──────────────────────────────────────────
function assegnaAdempimentiACliente(id_cliente, anno, adempimenti) {
  const stati = ["da_fare", "in_corso", "completato", "n_a"];
  const numAdp = Math.min(
    adempimenti.length,
    Math.floor(Math.random() * adempimenti.length) + 3,
  );
  const shuffled = [...adempimenti].sort(() => Math.random() - 0.5);
  const scelti = shuffled.slice(0, numAdp);

  scelti.forEach((adp) => {
    scadenzarioModel.addAdempimentoCliente({
      id_cliente,
      id_adempimento: adp.id,
      anno,
    });
    const righe = queryAll(
      `SELECT id FROM adempimenti_cliente WHERE id_cliente = ? AND id_adempimento = ? AND anno = ?`,
      [id_cliente, adp.id, anno],
    );
    righe.forEach((r) => {
      const stato = casuale(stati);
      scadenzarioModel.updateAdempimentoStato({
        id: r.id,
        stato,
        data_scadenza: faker.date
          .future({ years: 1 })
          .toISOString()
          .split("T")[0],
        data_completamento:
          stato === "completato"
            ? new Date().toISOString().split("T")[0]
            : null,
        note: Math.random() > 0.7 ? faker.lorem.sentence() : null,
        importo: Math.round(Math.random() * 10000) / 100,
        importo_saldo: Math.round(Math.random() * 5000) / 100,
        importo_acconto1: Math.round(Math.random() * 2000) / 100,
        importo_acconto2: Math.round(Math.random() * 2000) / 100,
        importo_iva: Math.round(Math.random() * 2000) / 100,
        importo_contabilita: Math.round(Math.random() * 1000) / 100,
        cont_completata: Math.random() > 0.7 ? 1 : 0,
      });
    });
  });
}

// ─── GENERA APPUNTI PER CLIENTE ─────────────────────────────────────────────
function generaAppuntiPerCliente(id_cliente, anno) {
  const numAppunti = Math.floor(Math.random() * 4) + 1;
  for (let i = 0; i < numAppunti; i++) {
    const dataScadenza = faker.date
      .future({ years: 1 })
      .toISOString()
      .split("T")[0];
    appuntiModel.createAppunto({
      titolo: faker.lorem.words({ min: 2, max: 5 }),
      contenuto: faker.lorem.paragraphs({ min: 1, max: 2 }),
      id_cliente,
      data_scadenza: dataScadenza,
      priorita: casuale(["bassa", "media", "alta"]),
      completato: Math.random() > 0.7 ? 1 : 0,
    });
  }
}

// ─── GENERA APPUNTI "STUDIO" (senza cliente) ──────────────────────────────
function generaAppuntiStudio(anno) {
  const numAppunti = Math.floor(Math.random() * 5) + 3;
  for (let i = 0; i < numAppunti; i++) {
    const dataScadenza = faker.date
      .future({ years: 1 })
      .toISOString()
      .split("T")[0];
    appuntiModel.createAppunto({
      titolo: faker.lorem.words({ min: 3, max: 7 }),
      contenuto: faker.lorem.paragraphs({ min: 1, max: 3 }),
      id_cliente: null,
      data_scadenza: dataScadenza,
      priorita: casuale(["bassa", "media", "alta"]),
      completato: Math.random() > 0.8 ? 1 : 0,
    });
  }
}

// ─── GENERA PAGINA BIANCA PER CLIENTE ───────────────────────────────────────
function generaPaginaBiancaPerCliente(id_cliente) {
  if (Math.random() > 0.6) return;
  const numNote = Math.floor(Math.random() * 2) + 1;
  for (let i = 0; i < numNote; i++) {
    paginaBiancaModel.createPaginaBianca({
      tipo: "cliente",
      titolo: faker.lorem.words({ min: 2, max: 4 }),
      contenuto: faker.lorem.paragraphs({ min: 1, max: 2 }),
      allegati: Math.random() > 0.8 ? faker.system.fileName() : null,
      id_cliente,
    });
  }
}

// ─── GENERA PAGINA BIANCA "STUDIO" ──────────────────────────────────────────
function generaPaginaBiancaStudio() {
  const numNote = Math.floor(Math.random() * 3) + 1;
  for (let i = 0; i < numNote; i++) {
    paginaBiancaModel.createPaginaBianca({
      tipo: "studio",
      titolo: faker.lorem.words({ min: 3, max: 6 }),
      contenuto: faker.lorem.paragraphs({ min: 1, max: 3 }),
      allegati: Math.random() > 0.8 ? faker.system.fileName() : null,
      id_cliente: null,
    });
  }
}

// ─── GENERA DATI DI TEST ─────────────────────────────────────────────────────
async function generateTestData() {
  console.log("🔄 Inizializzazione database...");
  await initDB();

  const annoCorrente = new Date().getFullYear();

  const tipologie = getTipologie();
  if (!tipologie.length) {
    console.error(
      "❌ Nessuna tipologia trovata. Esegui prima il seed iniziale.",
    );
    process.exit(1);
  }
  const sottotipologieMap = {};
  tipologie.forEach((t) => {
    sottotipologieMap[t.id] = getSottotipologiePerTipologia(t.id);
  });

  console.log("📋 Verifica adempimenti...");
  const adempimenti = creaAdempimentiEsempio();
  console.log(`   ${adempimenti.length} adempimenti disponibili`);

  console.log("👤 Generazione 100 clienti...");
  const clientiIds = [];
  for (let i = 0; i < 100; i++) {
    const data = generaCliente(tipologie, sottotipologieMap, annoCorrente);
    try {
      const id = clientiModel.createCliente(data);
      clientiIds.push(id);
      if (i % 10 === 0) process.stdout.write(".");
    } catch (e) {
      console.error(`   Errore creazione cliente ${i + 1}:`, e.message);
    }
  }
  console.log(`\n✅ Creati ${clientiIds.length} clienti`);

  console.log("📅 Assegnazione adempimenti ai clienti...");
  const clientiConAdempimenti = clientiIds.slice(0, 90);
  for (const id of clientiConAdempimenti) {
    assegnaAdempimentiACliente(id, annoCorrente, adempimenti);
    if (id % 10 === 0) process.stdout.write(".");
  }
  console.log(
    `\n✅ Adempimenti assegnati a ${clientiConAdempimenti.length} clienti`,
  );

  console.log("📝 Generazione appunti per clienti...");
  for (const id of clientiIds) {
    generaAppuntiPerCliente(id, annoCorrente);
    if (id % 10 === 0) process.stdout.write(".");
  }
  console.log("\n✅ Appunti clienti generati");

  console.log("📝 Generazione appunti studio (generali)...");
  generaAppuntiStudio(annoCorrente);
  console.log("   Appunti studio creati");

  console.log("📄 Generazione pagina bianca per clienti...");
  for (const id of clientiIds) {
    generaPaginaBiancaPerCliente(id);
    if (id % 10 === 0) process.stdout.write(".");
  }
  console.log("\n✅ Pagina bianca clienti generata");

  console.log("📄 Generazione pagina bianca studio...");
  generaPaginaBiancaStudio();
  console.log("   Pagina bianca studio creata");

  // ─── CREA PIÙ ADEMPIMENTI EXTRA PER IL CESTINO ──────────────────────────
  console.log("🧩 Creazione adempimenti extra per il cestino (10)...");
  const adpExtra = [];
  for (let i = 0; i < 10; i++) {
    const data = {
      codice: `EXTRA_${i}`,
      nome: `Adempimento Extra ${i}`,
      descrizione: faker.lorem.sentence(),
      scadenza_tipo: casuale(["annuale", "trimestrale"]),
      is_contabilita: Math.random() > 0.5 ? 1 : 0,
      has_rate: 0,
      is_checkbox: 0,
      is_text_only: 0,
    };
    try {
      const id = adempimentiModel.createAdempimento(data);
      adpExtra.push(id);
    } catch (_) {}
  }
  console.log(`   Creati ${adpExtra.length} adempimenti extra`);

  // ─── ELIMINA ANCHE 2 ADEMPIMENTI ESISTENTI (dopo aver rimosso i collegamenti) ──
  console.log("🧹 Rimozione di 2 adempimenti esistenti per cestinarli...");
  const adpDaEliminare = adempimenti.slice(0, 2); // prendi i primi 2
  for (const adp of adpDaEliminare) {
    // 1. Elimina tutte le righe in adempimenti_cliente per questo adempimento
    const righe = queryAll(
      `SELECT id FROM adempimenti_cliente WHERE id_adempimento = ?`,
      [adp.id],
    );
    for (const r of righe) {
      try {
        scadenzarioModel.deleteAdempimentoCliente(r.id);
      } catch (_) {}
    }
    // 2. Ora elimina l'adempimento (finirà nel cestino)
    try {
      adempimentiModel.deleteAdempimento(adp.id);
      console.log(
        `   Adempimento "${adp.nome}" (ID ${adp.id}) eliminato e spostato nel cestino`,
      );
    } catch (e) {
      console.error(`   Errore eliminazione adempimento ${adp.id}:`, e.message);
    }
  }

  // ─── POPOLA IL CESTINO ────────────────────────────────────────────────────
  console.log("🗑️  Popolazione cestino...");

  // 8a. Elimina i 10 clienti senza adempimenti (li sposta nel cestino)
  const clientiDaEliminare = clientiIds.slice(90, 100);
  for (const id of clientiDaEliminare) {
    try {
      clientiModel.deleteCliente(id);
      console.log(`   Cliente ${id} spostato nel cestino`);
    } catch (e) {
      console.error(`   Errore eliminazione cliente ${id}:`, e.message);
    }
  }

  // 8b. Elimina gli adempimenti extra (non associati)
  for (const id of adpExtra) {
    try {
      adempimentiModel.deleteAdempimento(id);
      console.log(`   Adempimento ${id} spostato nel cestino`);
    } catch (e) {
      console.error(`   Errore eliminazione adempimento ${id}:`, e.message);
    }
  }

  // 8c. Elimina alcuni appunti (prendi i primi 10 id)
  const appunti = queryAll(`SELECT id FROM appunti LIMIT 10`);
  for (const a of appunti) {
    try {
      appuntiModel.deleteAppunto(a.id);
      console.log(`   Appunto ${a.id} spostato nel cestino`);
    } catch (e) {
      console.error(`   Errore eliminazione appunto ${a.id}:`, e.message);
    }
  }

  // 8d. Elimina alcune pagine bianche (prendi i primi 5 id)
  const pagine = queryAll(`SELECT id FROM pagina_bianca LIMIT 5`);
  for (const p of pagine) {
    try {
      paginaBiancaModel.deletePaginaBianca(p.id);
      console.log(`   Pagina bianca ${p.id} spostata nel cestino`);
    } catch (e) {
      console.error(`   Errore eliminazione pagina ${p.id}:`, e.message);
    }
  }

  // 8e. Elimina alcune righe adempimenti_cliente (scadenze) per popolare ulteriormente il cestino
  const scadenze = queryAll(
    `SELECT id FROM adempimenti_cliente LIMIT 10 OFFSET 5`,
  );
  for (const s of scadenze) {
    try {
      scadenzarioModel.deleteAdempimentoCliente(s.id);
      console.log(`   Scadenza ${s.id} spostata nel cestino`);
    } catch (e) {
      console.error(`   Errore eliminazione scadenza ${s.id}:`, e.message);
    }
  }

  console.log("✅ Cestino popolato con successo");

  // 9. Statistiche finali
  const stats = {
    clienti: queryOne(`SELECT COUNT(*) as cnt FROM clienti WHERE attivo = 1`),
    clientiCestino: queryOne(
      `SELECT COUNT(*) as cnt FROM cestino WHERE tabella = 'clienti'`,
    ),
    adempimentiAttivi: queryOne(
      `SELECT COUNT(*) as cnt FROM adempimenti WHERE attivo = 1`,
    ),
    adempimentiCestino: queryOne(
      `SELECT COUNT(*) as cnt FROM cestino WHERE tabella = 'adempimenti'`,
    ),
    appunti: queryOne(`SELECT COUNT(*) as cnt FROM appunti`),
    appuntiCestino: queryOne(
      `SELECT COUNT(*) as cnt FROM cestino WHERE tabella = 'appunti'`,
    ),
    paginaBianca: queryOne(`SELECT COUNT(*) as cnt FROM pagina_bianca`),
    paginaBiancaCestino: queryOne(
      `SELECT COUNT(*) as cnt FROM cestino WHERE tabella = 'pagina_bianca'`,
    ),
    scadenze: queryOne(`SELECT COUNT(*) as cnt FROM adempimenti_cliente`),
    scadenzeCestino: queryOne(
      `SELECT COUNT(*) as cnt FROM cestino WHERE tabella = 'adempimenti_cliente'`,
    ),
  };

  console.log("\n📊 STATISTICHE FINALI:");
  console.log(`   Clienti attivi:          ${stats.clienti.cnt}`);
  console.log(`   Clienti nel cestino:     ${stats.clientiCestino.cnt}`);
  console.log(`   Adempimenti attivi:      ${stats.adempimentiAttivi.cnt}`);
  console.log(`   Adempimenti nel cestino: ${stats.adempimentiCestino.cnt}`);
  console.log(`   Appunti totali:          ${stats.appunti.cnt}`);
  console.log(`   Appunti nel cestino:     ${stats.appuntiCestino.cnt}`);
  console.log(`   Pagina bianca totali:    ${stats.paginaBianca.cnt}`);
  console.log(`   Pagina bianca nel cestino: ${stats.paginaBiancaCestino.cnt}`);
  console.log(`   Scadenze totali:         ${stats.scadenze.cnt}`);
  console.log(`   Scadenze nel cestino:    ${stats.scadenzeCestino.cnt}`);

  console.log("\n🎉 Dati di test generati con successo!");
}

generateTestData().catch(console.error);
