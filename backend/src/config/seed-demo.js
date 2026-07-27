// ═══════════════════════════════════════════════════════════════════════════
//  seed-demo.js — DATABASE DIMOSTRATIVO con dati inventati
// ───────────────────────────────────────────────────────────────────────────
//  A cosa serve
//  ------------
//  Genera un database `gestionale.db` GIÀ POPOLATO con dati realistici ma
//  inventati, pensato per far capire il funzionamento del gestionale a una
//  persona che non l'ha mai usato (es. prima di una vendita / demo).
//
//  Copre TUTTI i casi descritti nel manuale utente:
//   • Tutte le 9 tabelle del database.
//   • Tutte le tipologie cliente (PF, SP, SC, ASS) e ogni sottocategoria/regime.
//   • Periodicità IVA mensile / trimestrale / annuale (forfettari).
//   • Tutti i 5 tipi di adempimento: Solo Scadenza, Con Contabilità, Con Rate,
//     Checkbox, Solo Testo.
//   • Tutte le 4 periodicità adempimento: annuale, semestrale, trimestrale, mensile.
//   • Tutti gli stati: da_fare, in_corso, completato, n_a, text_only.
//   • Adempimento con "anno di validità" specifico (visibile solo in un anno).
//   • Configurazione annuale diversa anno per anno (cambio regime nel tempo).
//   • Scadenze Studio (appunti) con priorità e completamento.
//   • Note (pagina bianca) di tipo studio e cliente.
//   • Cestino con elementi eliminati ripristinabili.
//
//  Come si lancia (dalla cartella backend/):
//     npm run dati          → genera solo il database demo
//     npm run dati:dev       → genera il database e avvia in sviluppo (nodemon)
//     npm run dati:start     → genera il database e avvia in produzione (node)
//
//  ⚠️  ATTENZIONE: sovrascrive il file backend/db/gestionale.db.
//      Se esiste già, ne fa automaticamente un backup con data/ora.
//
//  Come modificare i dati
//  ----------------------
//  Tutti i dati stanno negli array in cima al file (ADEMPIMENTI, CLIENTI,
//  ASSEGNAZIONI, APPUNTI, NOTE, CESTINO). Modifica lì e rilancia `npm run dati`.
// ═══════════════════════════════════════════════════════════════════════════

const initSqlJs = require("sql.js");
const path = require("path");
const fs = require("fs");
const { createSchema, seedData } = require("../src/config/seed");

const DB_PATH = path.join(__dirname, "gestionale.db");

// L'anno "corrente" della demo. Cambialo se vuoi spostare la demo su un altro anno.
const ANNO = 2026;
const ANNO_PREC = ANNO - 1;
// Data di riferimento usata per decidere cosa è "già fatto" e cosa è "da fare".
const OGGI = new Date(`${ANNO}-07-27`);

// ═══════════════════════════════════════════════════════════════════════════
//  1) CATALOGO ADEMPIMENTI  (tabella: adempimenti)
// ───────────────────────────────────────────────────────────────────────────
//  tipo: 'scadenza' | 'contabilita' | 'rate' | 'checkbox' | 'testo'
//  scadenza_tipo: 'annuale' | 'semestrale' | 'trimestrale' | 'mensile'
//  anno_validita: null = valido ogni anno, oppure un anno specifico.
// ═══════════════════════════════════════════════════════════════════════════
const ADEMPIMENTI = [
  // ── Mensili ────────────────────────────────────────────────────────────
  { codice: "IVA_M",   nome: "Liquidazione IVA Mensile",        scadenza_tipo: "mensile",     tipo: "contabilita", descrizione: "Liquidazione periodica IVA con versamento F24" },
  { codice: "F24_M",   nome: "Versamento F24",                  scadenza_tipo: "mensile",     tipo: "scadenza",    descrizione: "Predisposizione e invio deleghe F24" },
  { codice: "CONTAB",  nome: "Tenuta Contabilità",              scadenza_tipo: "mensile",     tipo: "contabilita", descrizione: "Registrazione fatture e prima nota" },
  { codice: "INTRA",   nome: "Modello INTRASTAT",               scadenza_tipo: "mensile",     tipo: "checkbox",    descrizione: "Elenchi riepilogativi operazioni intracomunitarie" },
  // ── Trimestrali ────────────────────────────────────────────────────────
  { codice: "IVA_T",   nome: "Liquidazione IVA Trimestrale",    scadenza_tipo: "trimestrale", tipo: "contabilita", descrizione: "Liquidazione IVA per contribuenti trimestrali" },
  { codice: "LIPE",    nome: "Comunicazione LIPE",              scadenza_tipo: "trimestrale", tipo: "scadenza",    descrizione: "Liquidazioni Periodiche IVA" },
  { codice: "ESTERO",  nome: "Esterometro",                     scadenza_tipo: "trimestrale", tipo: "checkbox",    descrizione: "Comunicazione operazioni transfrontaliere" },
  // ── Semestrali ─────────────────────────────────────────────────────────
  { codice: "IMU",     nome: "IMU (Acconto/Saldo)",             scadenza_tipo: "semestrale",  tipo: "scadenza",    descrizione: "Acconto (giugno) e saldo (dicembre) IMU" },
  // ── Annuali ────────────────────────────────────────────────────────────
  { codice: "DICH_IVA", nome: "Dichiarazione IVA Annuale",      scadenza_tipo: "annuale",     tipo: "contabilita", descrizione: "Dichiarazione IVA annuale" },
  { codice: "REDDITI",  nome: "Dichiarazione dei Redditi",      scadenza_tipo: "annuale",     tipo: "rate",        descrizione: "Modello Redditi PF/SP/SC", rate_labels: ["Saldo", "1° Acconto", "2° Acconto"] },
  { codice: "IRAP",     nome: "Dichiarazione IRAP",             scadenza_tipo: "annuale",     tipo: "rate",        descrizione: "Imposta regionale attività produttive", rate_labels: ["Saldo", "1° Acconto", "2° Acconto"] },
  { codice: "CU",       nome: "Certificazione Unica",           scadenza_tipo: "annuale",     tipo: "scadenza",    descrizione: "Invio CU dipendenti/autonomi" },
  { codice: "BILANCIO", nome: "Deposito Bilancio",              scadenza_tipo: "annuale",     tipo: "checkbox",    descrizione: "Deposito bilancio al Registro Imprese (società di capitali)" },
  { codice: "NOTE_CLI", nome: "Note Operative Cliente",         scadenza_tipo: "annuale",     tipo: "testo",       descrizione: "Annotazioni libere sul cliente (campo testo)" },
  // ── Con anno di validità SPECIFICO (compare solo in quell'anno) ──────────
  { codice: "CPB",      nome: "Concordato Preventivo Biennale", scadenza_tipo: "annuale",     tipo: "rate",        descrizione: "Adesione al CPB — valido solo per l'anno indicato", rate_labels: ["Saldo", "1° Acconto", "2° Acconto"], anno_validita: ANNO },
];

// ═══════════════════════════════════════════════════════════════════════════
//  2) CLIENTI  (tabelle: clienti + clienti_config_annuale)
// ───────────────────────────────────────────────────────────────────────────
//  sotto  = codice sottotipologia (definisce tipologia, regime, colonne).
//  per    = periodicità IVA: 'mensile' | 'trimestrale' | 'annuale' | null.
//  Le sottotipologie coprono OGNI combinazione prevista dal programma.
// ═══════════════════════════════════════════════════════════════════════════
const CLIENTI = [
  // key            nome                              sotto           per            contabilita  anagrafica...
  { key: "priv",   nome: "Bianchi Elena",             sotto: "PF_PRIV",     per: null,          contabilita: 0, nascita: { g: 12, m: 4,  a: 1985, sesso: "F", comune: "H501" }, citta: "Roma",      prov: "RM", cap: "00185", email: "elena.bianchi@example.it",   tel: "06 4455667",  ref: "" },
  { key: "socio",  nome: "Rossi Marco",               sotto: "PF_SOCIO",    per: null,          contabilita: 0, nascita: { g: 3,  m: 9,  a: 1978, sesso: "M", comune: "F205" }, citta: "Milano",    prov: "MI", cap: "20121", email: "marco.rossi@example.it",     tel: "02 998877",   ref: "" },
  { key: "ditta_o", nome: "Falegnameria Verdi",        sotto: "PF_DITTA_ORD", per: "mensile",   contabilita: 1, piva: true, nascita: { g: 22, m: 1, a: 1970, sesso: "M", comune: "A944" }, citta: "Bologna", prov: "BO", cap: "40100", email: "info@falegnameriaverdi.it", tel: "051 223344", ref: "Verdi Luca" },
  { key: "ditta_s", nome: "Ferramenta Conti",          sotto: "PF_DITTA_SEM", per: "trimestrale", contabilita: 1, piva: true, nascita: { g: 5, m: 11, a: 1982, sesso: "M", comune: "L219" }, citta: "Torino", prov: "TO", cap: "10121", email: "conti@ferramenta.it", tel: "011 556677", ref: "" },
  { key: "ditta_f", nome: "Idraulica Blu di Neri",     sotto: "PF_DITTA_FOR", per: "annuale",   contabilita: 0, piva: true, nascita: { g: 18, m: 7, a: 1990, sesso: "M", comune: "D612" }, citta: "Firenze", prov: "FI", cap: "50122", email: "neri@idraulicablu.it", tel: "055 112233", ref: "" },
  { key: "prof_o", nome: "Studio Legale Marino",        sotto: "PF_PROF_ORD", per: "trimestrale", contabilita: 1, piva: true, nascita: { g: 9, m: 2, a: 1975, sesso: "F", comune: "F839" }, citta: "Napoli", prov: "NA", cap: "80121", email: "avv.marino@example.it", tel: "081 445566", ref: "" },
  { key: "prof_s", nome: "Ing. Paolo Greco",           sotto: "PF_PROF_SEM", per: "mensile",   contabilita: 1, piva: true, nascita: { g: 27, m: 6, a: 1980, sesso: "M", comune: "G273" }, citta: "Palermo", prov: "PA", cap: "90133", email: "paolo.greco@ing.it", tel: "091 334455", ref: "" },
  { key: "prof_f", nome: "Dott.ssa Sara Lombardi",     sotto: "PF_PROF_FOR", per: "annuale",   contabilita: 0, piva: true, nascita: { g: 14, m: 10, a: 1992, sesso: "F", comune: "L840" }, citta: "Venezia", prov: "VE", cap: "30121", email: "sara.lombardi@example.it", tel: "041 667788", ref: "" },
  { key: "sp_ord", nome: "Costruzioni Sole SNC",       sotto: "SP_ORD",  per: "mensile",     contabilita: 1, piva: true, citta: "Bari",     prov: "BA", cap: "70121", email: "amministrazione@costruzionisole.it", tel: "080 223344", ref: "Sig. Esposito" },
  { key: "sp_sem", nome: "Trattoria Da Gino SAS",      sotto: "SP_SEMP", per: "trimestrale", contabilita: 1, piva: true, citta: "Verona",   prov: "VR", cap: "37121", email: "dagino@example.it", tel: "045 998811", ref: "" },
  { key: "sc_ord", nome: "TechNova SRL",               sotto: "SC_ORD",  per: "mensile",     contabilita: 1, piva: true, citta: "Milano",   prov: "MI", cap: "20124", email: "info@technova.it", tel: "02 776655", ref: "CFO Bianchi", sdi: "M5UXCR1", pec: "technova@pec.it" },
  { key: "ass_ord", nome: "ASD Polisportiva Aurora",   sotto: "ASS_ORD",  per: "trimestrale", contabilita: 1, piva: true, citta: "Genova",  prov: "GE", cap: "16121", email: "aurora@asd.it", tel: "010 445599", ref: "Presidente Ferrari" },
  { key: "ass_sem", nome: "Associazione Culturale Lux", sotto: "ASS_SEMP", per: "annuale",    contabilita: 0, piva: true, citta: "Cagliari", prov: "CA", cap: "09124", email: "info@lux.it", tel: "070 223311", ref: "" },
  // Cliente ESTERO (identificato da SDI convenzionale XXXXXXX) — mostra caso operazioni estere
  { key: "estero", nome: "Weber Handels GmbH",          sotto: "SC_ORD",  per: "mensile",     contabilita: 1, piva: true, citta: "Bolzano", prov: "BZ", cap: "39100", email: "info@weber-gmbh.de", tel: "0471 112200", ref: "Mr. Weber", sdi: "XXXXXXX", pec: "weber@pec.it" },
  // Cliente ELIMINATO (finisce nel Cestino, attivo=0). Nessun adempimento associato.
  { key: "deleted", nome: "Vecchio Cliente Cessato",    sotto: "PF_DITTA_SEM", per: "trimestrale", contabilita: 0, piva: true, nascita: { g: 1, m: 1, a: 1960, sesso: "M", comune: "H501" }, citta: "Roma", prov: "RM", cap: "00100", email: "cessato@example.it", tel: "", ref: "", attivo: 0 },
];

// ═══════════════════════════════════════════════════════════════════════════
//  3) ASSEGNAZIONI ADEMPIMENTI → CLIENTI  (tabella: adempimenti_cliente)
// ───────────────────────────────────────────────────────────────────────────
//  Per ogni cliente elenchiamo i codici adempimento da assegnare per l'ANNO
//  corrente. Gli stati vengono generati automaticamente in base al calendario
//  (mesi/trimestri passati = completati, quello in corso = in_corso, futuri =
//  da fare) tramite le funzioni più in basso. Alcuni casi speciali (N/A) sono
//  gestiti con OVERRIDE_STATO.
// ═══════════════════════════════════════════════════════════════════════════
const ASSEGNAZIONI = {
  priv:    ["REDDITI", "IMU", "NOTE_CLI"],
  socio:   ["REDDITI", "NOTE_CLI"],
  ditta_o: ["IVA_M", "F24_M", "CONTAB", "LIPE", "DICH_IVA", "REDDITI", "IRAP", "IMU", "NOTE_CLI", "CPB"],
  ditta_s: ["IVA_T", "LIPE", "CONTAB", "DICH_IVA", "REDDITI", "IRAP", "IMU", "NOTE_CLI"],
  ditta_f: ["REDDITI", "IMU", "NOTE_CLI"], // forfettario: niente IVA
  prof_o:  ["IVA_T", "LIPE", "CONTAB", "DICH_IVA", "REDDITI", "IRAP", "CU", "NOTE_CLI", "CPB"],
  prof_s:  ["IVA_M", "F24_M", "CONTAB", "DICH_IVA", "REDDITI", "IRAP", "CU", "NOTE_CLI"],
  prof_f:  ["REDDITI", "NOTE_CLI"], // forfettario
  sp_ord:  ["IVA_M", "F24_M", "CONTAB", "LIPE", "DICH_IVA", "REDDITI", "IRAP", "IMU", "CU", "NOTE_CLI"],
  sp_sem:  ["IVA_T", "LIPE", "CONTAB", "DICH_IVA", "REDDITI", "IRAP", "IMU", "NOTE_CLI"],
  sc_ord:  ["IVA_M", "F24_M", "CONTAB", "LIPE", "DICH_IVA", "REDDITI", "IRAP", "BILANCIO", "CU", "NOTE_CLI", "CPB"],
  ass_ord: ["IVA_T", "LIPE", "CONTAB", "DICH_IVA", "IRAP", "CU", "NOTE_CLI"],
  ass_sem: ["REDDITI", "NOTE_CLI"],
  estero:  ["IVA_M", "F24_M", "CONTAB", "INTRA", "ESTERO", "DICH_IVA", "REDDITI", "IRAP", "BILANCIO", "NOTE_CLI"],
};

// Casi N/A espliciti: "chiaveCliente|codiceAdemp|periodo" → 'n_a'
//   periodo: 'ann' | 'S1'/'S2' | 'T1'..'T4' | 'M1'..'M12'
const OVERRIDE_STATO = {
  "ditta_o|INTRA|ann": "n_a",     // (esempio, se assegnato)
  "sp_ord|IMU|S2": "n_a",          // secondo semestre IMU non dovuto
  "ass_ord|CU|ann": "n_a",         // associazione senza dipendenti
  "prof_s|IVA_M|M8": "n_a",        // agosto non applicabile (esempio)
};

// Testo per gli adempimenti "Solo Testo" (NOTE_CLI) per alcuni clienti.
const TESTO_ADEMPIMENTO = {
  ditta_o: "Cliente puntuale nei pagamenti. Contabilità consegnata entro il 10 di ogni mese.",
  sc_ord: "Verificare compensi amministratori e ritenute. Bilancio in forma abbreviata.",
  prof_o: "Cassa Forense: verificare contributi soggettivi e integrativi a fine anno.",
};

// ═══════════════════════════════════════════════════════════════════════════
//  4) SCADENZE STUDIO  (tabella: appunti)
// ───────────────────────────────────────────────────────────────────────────
//  cliente: chiave cliente o null (promemoria interno di studio).
//  priorita: 'bassa' | 'media' | 'alta'.  scadenza: 'YYYY-MM-DD' o null.
// ═══════════════════════════════════════════════════════════════════════════
const APPUNTI = [
  { titolo: "Scadenza invio LIPE 3° trimestre", contenuto: "Preparare e inviare le comunicazioni LIPE per tutti i clienti trimestrali.", cliente: null,     priorita: "alta",  scadenza: `${ANNO}-11-30`, completato: 0 },
  { titolo: "Chiamare TechNova per fatture mancanti", contenuto: "Mancano le fatture di acquisto di giugno.",                                cliente: "sc_ord", priorita: "alta",  scadenza: `${ANNO}-07-20`, completato: 0 }, // scaduto → in rosso
  { titolo: "Rinnovo firma digitale",         contenuto: "Verificare scadenza smart card dello studio.",                                    cliente: null,     priorita: "media", scadenza: `${ANNO}-09-15`, completato: 0 },
  { titolo: "Appuntamento con Bianchi Elena",  contenuto: "Consegna documenti 730.",                                                        cliente: "priv",   priorita: "media", scadenza: `${ANNO}-08-05`, completato: 0 },
  { titolo: "Backup archivio 2025 completato", contenuto: "Copia su NAS e cloud effettuata.",                                              cliente: null,     priorita: "bassa", scadenza: `${ANNO}-06-30`, completato: 1 },
  { titolo: "Ordinare cancelleria",            contenuto: "Toner e carta A4.",                                                              cliente: null,     priorita: "bassa", scadenza: null,            completato: 0 }, // senza data → in fondo
  { titolo: "Verifica CPB per clienti idonei", contenuto: "Valutare adesione al Concordato Preventivo Biennale.",                          cliente: "ditta_o", priorita: "alta", scadenza: `${ANNO}-10-31`, completato: 0 },
];

// ═══════════════════════════════════════════════════════════════════════════
//  5) NOTE  (tabella: pagina_bianca)
// ───────────────────────────────────────────────────────────────────────────
//  tipo: 'studio' (interna) | 'cliente' (associata a un cliente).
// ═══════════════════════════════════════════════════════════════════════════
const NOTE = [
  { tipo: "studio",  titolo: "Checklist chiusura anno",       contenuto: "1. Ratei e risconti\n2. Ammortamenti\n3. Rimanenze\n4. Compensi amministratori\n5. Verifica IVA da versare.", allegati: "Modello checklist: /modelli/chiusura.xlsx", cliente: null },
  { tipo: "studio",  titolo: "Scadenze fiscali principali",   contenuto: "16 di ogni mese: IVA e ritenute. 30/11: 2° acconto imposte. 16/12: saldo IMU.",                                  allegati: "", cliente: null },
  { tipo: "cliente", titolo: "Istruzioni fatturazione TechNova", contenuto: "Emette fatture elettroniche tramite portale interno. SDI: M5UXCR1. Contatto tecnico: IT dept.",                allegati: "https://portale.technova.it", cliente: "sc_ord" },
  { tipo: "cliente", titolo: "Regime forfettario — Idraulica Blu", contenuto: "Coefficiente redditività 67%. Limite ricavi 85.000 €. Monitorare superamento soglia.",                       allegati: "", cliente: "ditta_f" },
  { tipo: "cliente", titolo: "Verbale assemblea Polisportiva Aurora", contenuto: "Approvato rendiconto 2025. Confermato consiglio direttivo.",                                              allegati: "verbale-2025.pdf", cliente: "ass_ord" },
];

// ═══════════════════════════════════════════════════════════════════════════
//  6) CESTINO  (tabella: cestino) — elementi eliminati ripristinabili (<15gg)
// ───────────────────────────────────────────────────────────────────────────
//  Generato in parte automaticamente (il cliente "deleted") e in parte qui
//  sotto con record di esempio di altri tipi.
// ═══════════════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────────────────
//  UTILITY: generazione Codice Fiscale e Partita IVA formalmente validi
// ───────────────────────────────────────────────────────────────────────────
function calcolaPartitaIva() {
  // Genera 10 cifre casuali + cifra di controllo secondo l'algoritmo ufficiale.
  const d = [];
  for (let i = 0; i < 10; i++) d.push(Math.floor(Math.random() * 10));
  let somma = 0;
  for (let i = 0; i < 10; i++) {
    if (i % 2 === 0) {
      somma += d[i];
    } else {
      let x = d[i] * 2;
      if (x > 9) x -= 9;
      somma += x;
    }
  }
  const controllo = (10 - (somma % 10)) % 10;
  return d.join("") + controllo;
}

const CF_MESI = ["A", "B", "C", "D", "E", "H", "L", "M", "P", "R", "S", "T"];
const CF_PARI = { "0": 0, "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, A: 0, B: 1, C: 2, D: 3, E: 4, F: 5, G: 6, H: 7, I: 8, J: 9, K: 10, L: 11, M: 12, N: 13, O: 14, P: 15, Q: 16, R: 17, S: 18, T: 19, U: 20, V: 21, W: 22, X: 23, Y: 24, Z: 25 };
const CF_DISPARI = { "0": 1, "1": 0, "2": 5, "3": 7, "4": 9, "5": 13, "6": 15, "7": 17, "8": 19, "9": 21, A: 1, B: 0, C: 5, D: 7, E: 9, F: 13, G: 15, H: 17, I: 19, J: 21, K: 2, L: 4, M: 18, N: 20, O: 11, P: 3, Q: 6, R: 8, S: 12, T: 14, U: 16, V: 10, W: 22, X: 25, Y: 24, Z: 23 };
const CF_RESTO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function estraiConsonanti(s) { return s.toUpperCase().replace(/[^A-Z]/g, "").split("").filter((c) => !"AEIOU".includes(c)); }
function estraiVocali(s) { return s.toUpperCase().replace(/[^A-Z]/g, "").split("").filter((c) => "AEIOU".includes(c)); }

function cfCognome(cognome) {
  const cons = estraiConsonanti(cognome);
  const voc = estraiVocali(cognome);
  return (cons.join("") + voc.join("") + "XXX").substring(0, 3);
}
function cfNome(nome) {
  const cons = estraiConsonanti(nome);
  if (cons.length >= 4) return cons[0] + cons[2] + cons[3];
  const voc = estraiVocali(nome);
  return (cons.join("") + voc.join("") + "XXX").substring(0, 3);
}
function calcolaCodiceFiscale(nomeCompleto, n) {
  // nomeCompleto: "Cognome Nome" (o "Nome Cognome" — usiamo le due parole principali)
  const parole = nomeCompleto.replace(/[^A-Za-z ]/g, "").trim().split(/\s+/);
  const cognome = parole[0] || "XXX";
  const nome = parole[1] || parole[0] || "XXX";
  let cf = cfCognome(cognome) + cfNome(nome);
  cf += String(n.a).slice(-2);
  cf += CF_MESI[n.m - 1];
  const giorno = n.sesso === "F" ? n.g + 40 : n.g;
  cf += String(giorno).padStart(2, "0");
  cf += n.comune;
  // carattere di controllo
  let somma = 0;
  for (let i = 0; i < 15; i++) {
    const c = cf[i];
    somma += i % 2 === 0 ? CF_DISPARI[c] : CF_PARI[c];
  }
  cf += CF_RESTO[somma % 26];
  return cf;
}

// ───────────────────────────────────────────────────────────────────────────
//  UTILITY: date e stati per periodo
// ───────────────────────────────────────────────────────────────────────────
const pad = (n) => String(n).padStart(2, "0");
function dataScadMese(anno, mese) { const m = mese === 12 ? 1 : mese + 1; const a = mese === 12 ? anno + 1 : anno; return `${a}-${pad(m)}-16`; }
function dataScadTrim(anno, t) { const mesiFine = { 1: 5, 2: 8, 3: 11, 4: 2 }; const m = mesiFine[t]; const a = t === 4 ? anno + 1 : anno; return `${a}-${pad(m)}-28`; }
function dataScadSem(anno, s) { return s === 1 ? `${anno}-06-16` : `${anno}-12-16`; }
// Scadenza annuale reale per singolo adempimento (MM-DD). Default 11-30.
const ANN_DUE = { REDDITI: "06-30", IRAP: "06-30", DICH_IVA: "04-30", CU: "03-16", BILANCIO: "05-31", CPB: "06-30" };
function dataScadAnn(anno, cod) { return `${anno}-${ANN_DUE[cod] || "11-30"}`; }

function statoPerData(scadenzaStr) {
  const d = new Date(scadenzaStr);
  if (d < OGGI) {
    // periodo passato: quasi sempre completato, ogni tanto in corso
    return Math.random() < 0.85 ? "completato" : "in_corso";
  }
  // periodo entro ~35 giorni: in corso; oltre: da fare
  const diff = (d - OGGI) / (1000 * 60 * 60 * 24);
  if (diff <= 35) return "in_corso";
  return "da_fare";
}
function dataCompletamento(scadenzaStr) {
  const d = new Date(scadenzaStr);
  d.setDate(d.getDate() - (2 + Math.floor(Math.random() * 8)));
  return d.toISOString().split("T")[0];
}

// Importi realistici in base al tipo di adempimento
function importiPer(tipo, stato) {
  const attivo = stato === "completato" || stato === "in_corso";
  if (!attivo) return {};
  if (tipo === "contabilita") {
    return {
      importo_iva: Math.round((300 + Math.random() * 3500) * 100) / 100,
      importo_contabilita: [80, 100, 120, 150, 200][Math.floor(Math.random() * 5)],
      cont_completata: stato === "completato" ? 1 : 0,
    };
  }
  if (tipo === "rate") {
    const saldo = Math.round((800 + Math.random() * 6000) * 100) / 100;
    return {
      importo_saldo: saldo,
      importo_acconto1: Math.round(saldo * 0.4 * 100) / 100,
      importo_acconto2: Math.round(saldo * 0.6 * 100) / 100,
    };
  }
  if (tipo === "scadenza") {
    return { importo: Math.round((100 + Math.random() * 2000) * 100) / 100 };
  }
  return {};
}

// ═══════════════════════════════════════════════════════════════════════════
//  MOTORE DI GENERAZIONE
// ═══════════════════════════════════════════════════════════════════════════
async function main() {
  console.log("\n🌱 Generazione database DEMO in corso...\n");

  const SQL = await initSqlJs();

  // Backup del DB esistente (se presente)
  if (fs.existsSync(DB_PATH)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").substring(0, 19);
    const bak = `${DB_PATH}.backup-${stamp}`;
    fs.copyFileSync(DB_PATH, bak);
    console.log(`💾 Backup del database esistente: ${path.basename(bak)}`);
  }

  const db = new SQL.Database();
  createSchema(db);   // schema ufficiale del gestionale
  seedData(db);       // tipologie + sottotipologie ufficiali

  const run = (sql, params = []) => db.run(sql, params);
  const lastId = () => {
    const st = db.prepare("SELECT last_insert_rowid() AS id");
    st.step();
    const id = st.getAsObject().id;
    st.free();
    return id;
  };
  const one = (sql, params = []) => {
    const st = db.prepare(sql);
    st.bind(params);
    const r = st.step() ? st.getAsObject() : null;
    st.free();
    return r;
  };

  // ── Mappa sottotipologie → { id_tipologia, id_sottotipologia, col2, col3 } ──
  const percorsi = require("../../frontend/json/tipologie-data.json").percorsi;
  const sottoMap = {}; // codice sottotipologia → dettagli
  Object.entries(percorsi).forEach(([tipCod, arr]) => {
    arr.forEach((p) => {
      const tip = one(`SELECT id FROM tipologie_cliente WHERE codice = ?`, [tipCod]);
      const sot = one(`SELECT id FROM sottotipologie WHERE codice = ?`, [p.codice]);
      sottoMap[p.codice] = {
        id_tipologia: tip ? tip.id : null,
        id_sottotipologia: sot ? sot.id : null,
        col2: p.col2Label,
        col3: p.col3Label,
        tipCod,
      };
    });
  });

  // ── 1) ADEMPIMENTI ──────────────────────────────────────────────────────
  const adpMap = {}; // codice → { id, ...flags }
  ADEMPIMENTI.forEach((a) => {
    const flags = {
      is_contabilita: a.tipo === "contabilita" ? 1 : 0,
      has_rate: a.tipo === "rate" ? 1 : 0,
      is_checkbox: a.tipo === "checkbox" ? 1 : 0,
      is_text_only: a.tipo === "testo" ? 1 : 0,
    };
    run(
      `INSERT INTO adempimenti (codice, nome, descrizione, scadenza_tipo, is_contabilita, has_rate, is_checkbox, is_text_only, rate_labels, anno_validita, attivo)
       VALUES (?,?,?,?,?,?,?,?,?,?,1)`,
      [
        a.codice, a.nome, a.descrizione || null, a.scadenza_tipo,
        flags.is_contabilita, flags.has_rate, flags.is_checkbox, flags.is_text_only,
        a.rate_labels ? JSON.stringify(a.rate_labels) : null,
        a.anno_validita || null,
      ],
    );
    adpMap[a.codice] = { id: lastId(), tipo: a.tipo, scadenza_tipo: a.scadenza_tipo, anno_validita: a.anno_validita || null };
  });
  console.log(`✅ Adempimenti (catalogo): ${ADEMPIMENTI.length}`);

  // ── 2) CLIENTI + CONFIG ANNUALE ─────────────────────────────────────────
  const cliMap = {}; // key → id
  CLIENTI.forEach((c) => {
    const s = sottoMap[c.sotto];
    if (!s) throw new Error(`Sottotipologia sconosciuta: ${c.sotto}`);
    const cf = c.nascita ? calcolaCodiceFiscale(c.nome, c.nascita) : (c.piva ? null : null);
    const piva = c.piva ? calcolaPartitaIva() : null;
    const attivo = c.attivo === undefined ? 1 : c.attivo;

    run(
      `INSERT INTO clienti (nome, codice_fiscale, partita_iva, email, telefono, indirizzo, citta, cap, provincia, pec, sdi, iban, note, referente, attivo, contabilita)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        c.nome, cf, piva, c.email || null, c.tel || null,
        c.indirizzo || `Via Roma ${1 + Math.floor(Math.random() * 120)}`,
        c.citta || null, c.cap || null, c.prov || null,
        c.pec || null, c.sdi || null,
        `IT60X054${Math.floor(1000000000 + Math.random() * 8999999999)}`.substring(0, 27),
        c.note || null, c.ref || null, attivo, c.contabilita || 0,
      ],
    );
    const id = lastId();
    cliMap[c.key] = id;

    // Config anno corrente
    run(
      `INSERT INTO clienti_config_annuale (id_cliente, anno, id_tipologia, id_sottotipologia, col2_value, col3_value, periodicita)
       VALUES (?,?,?,?,?,?,?)`,
      [id, ANNO, s.id_tipologia, s.id_sottotipologia, s.col2, s.col3, c.per],
    );
  });
  console.log(`✅ Clienti: ${CLIENTI.length} (di cui 1 nel cestino) + configurazioni annuali ${ANNO}`);

  // ── 2b) CONFIG ANNO PRECEDENTE con CAMBIO REGIME (demo storicità) ─────────
  // Idraulica Blu era Semplificato nel 2025, è passato a Forfettario nel 2026.
  {
    const sPrec = sottoMap["PF_DITTA_SEM"];
    run(
      `INSERT INTO clienti_config_annuale (id_cliente, anno, id_tipologia, id_sottotipologia, col2_value, col3_value, periodicita)
       VALUES (?,?,?,?,?,?,?)`,
      [cliMap["ditta_f"], ANNO_PREC, sPrec.id_tipologia, sPrec.id_sottotipologia, sPrec.col2, sPrec.col3, "trimestrale"],
    );
  }
  // Dott.ssa Lombardi: stessa config anche nel 2025 (per avere dati storici)
  {
    const s = sottoMap["PF_PROF_FOR"];
    run(
      `INSERT INTO clienti_config_annuale (id_cliente, anno, id_tipologia, id_sottotipologia, col2_value, col3_value, periodicita)
       VALUES (?,?,?,?,?,?,?)`,
      [cliMap["prof_f"], ANNO_PREC, s.id_tipologia, s.id_sottotipologia, s.col2, s.col3, "annuale"],
    );
  }
  console.log(`✅ Configurazioni ${ANNO_PREC} (storicità / cambio regime): 2`);

  // ── 3) ADEMPIMENTI_CLIENTE ──────────────────────────────────────────────
  let righeAdp = 0;
  function assegna(cliKey, anno) {
    const codici = ASSEGNAZIONI[cliKey] || [];
    const id_cliente = cliMap[cliKey];
    codici.forEach((cod) => {
      const a = adpMap[cod];
      if (!a) return;
      if (a.anno_validita && a.anno_validita !== anno) return; // rispetta anno di validità

      const periodi = []; // { key, mese, trimestre, semestre, scad }
      if (a.tipo === "testo") {
        periodi.push({ key: "ann", scad: null });
      } else if (a.scadenza_tipo === "mensile") {
        for (let m = 1; m <= 12; m++) periodi.push({ key: `M${m}`, mese: m, scad: dataScadMese(anno, m) });
      } else if (a.scadenza_tipo === "trimestrale") {
        for (let t = 1; t <= 4; t++) periodi.push({ key: `T${t}`, trimestre: t, scad: dataScadTrim(anno, t) });
      } else if (a.scadenza_tipo === "semestrale") {
        for (let s = 1; s <= 2; s++) periodi.push({ key: `S${s}`, semestre: s, scad: dataScadSem(anno, s) });
      } else {
        periodi.push({ key: "ann", scad: dataScadAnn(anno, cod) });
      }

      periodi.forEach((p) => {
        let stato;
        let note = null;
        let importi = {};
        let dataCompl = null;

        if (a.tipo === "testo") {
          stato = "text_only";
          note = TESTO_ADEMPIMENTO[cliKey] || "";
        } else {
          // override N/A?
          const ov = OVERRIDE_STATO[`${cliKey}|${cod}|${p.key}`];
          if (ov) {
            stato = ov;
          } else if (a.tipo === "checkbox") {
            // checkbox: solo da_fare / completato / n_a (niente in_corso)
            const base = statoPerData(p.scad);
            stato = base === "in_corso" ? "da_fare" : base;
          } else {
            stato = statoPerData(p.scad);
          }

          if (stato === "completato" || stato === "in_corso") {
            importi = importiPer(a.tipo, stato);
          }
          if (stato === "completato") {
            dataCompl = dataCompletamento(p.scad);
          }
        }

        run(
          `INSERT INTO adempimenti_cliente
            (id_cliente, id_adempimento, anno, mese, trimestre, semestre, stato,
             data_scadenza, data_completamento, note,
             importo, importo_saldo, importo_acconto1, importo_acconto2, importo_iva, importo_contabilita, cont_completata)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            id_cliente, a.id, anno,
            p.mese || null, p.trimestre || null, p.semestre || null,
            stato, p.scad || null, dataCompl, note,
            importi.importo || null,
            importi.importo_saldo || null,
            importi.importo_acconto1 || null,
            importi.importo_acconto2 || null,
            importi.importo_iva || null,
            importi.importo_contabilita || null,
            importi.cont_completata || 0,
          ],
        );
        righeAdp++;
      });
    });
  }

  Object.keys(ASSEGNAZIONI).forEach((k) => assegna(k, ANNO));
  // Dati storici anno precedente per un paio di clienti (tutto completato)
  const OGGI_BAK = OGGI.getTime();
  assegnaStorico("ditta_o", ANNO_PREC);
  assegnaStorico("sc_ord", ANNO_PREC);
  function assegnaStorico(cliKey, anno) {
    // Riusa assegna ma forzando tutto "completato" spostando OGGI nel futuro
    const codici = ASSEGNAZIONI[cliKey] || [];
    const id_cliente = cliMap[cliKey];
    codici.forEach((cod) => {
      const a = adpMap[cod];
      if (!a) return;
      if (a.anno_validita && a.anno_validita !== anno) return;
      const periodi = [];
      if (a.tipo === "testo") periodi.push({ key: "ann" });
      else if (a.scadenza_tipo === "mensile") for (let m = 1; m <= 12; m++) periodi.push({ mese: m, scad: dataScadMese(anno, m) });
      else if (a.scadenza_tipo === "trimestrale") for (let t = 1; t <= 4; t++) periodi.push({ trimestre: t, scad: dataScadTrim(anno, t) });
      else if (a.scadenza_tipo === "semestrale") for (let s = 1; s <= 2; s++) periodi.push({ semestre: s, scad: dataScadSem(anno, s) });
      else periodi.push({ scad: dataScadAnn(anno, cod) });
      periodi.forEach((p) => {
        const stato = a.tipo === "testo" ? "text_only" : "completato";
        const importi = a.tipo === "testo" ? {} : importiPer(a.tipo, "completato");
        run(
          `INSERT INTO adempimenti_cliente
            (id_cliente, id_adempimento, anno, mese, trimestre, semestre, stato,
             data_scadenza, data_completamento, note,
             importo, importo_saldo, importo_acconto1, importo_acconto2, importo_iva, importo_contabilita, cont_completata)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            id_cliente, a.id, anno, p.mese || null, p.trimestre || null, p.semestre || null,
            stato, p.scad || null, p.scad ? dataCompletamento(p.scad) : null,
            a.tipo === "testo" ? (TESTO_ADEMPIMENTO[cliKey] || "") : null,
            importi.importo || null, importi.importo_saldo || null, importi.importo_acconto1 || null,
            importi.importo_acconto2 || null, importi.importo_iva || null, importi.importo_contabilita || null,
            importi.cont_completata || 0,
          ],
        );
        righeAdp++;
      });
    });
  }
  console.log(`✅ Righe scadenzario (adempimenti_cliente): ${righeAdp}`);

  // ── 4) APPUNTI (Scadenze Studio) ─────────────────────────────────────────
  APPUNTI.forEach((ap) => {
    run(
      `INSERT INTO appunti (titolo, contenuto, id_cliente, data_inserimento, data_scadenza, priorita, completato)
       VALUES (?,?,?,?,?,?,?)`,
      [ap.titolo, ap.contenuto || null, ap.cliente ? cliMap[ap.cliente] : null,
       `${ANNO}-07-01 09:00:00`, ap.scadenza || null, ap.priorita, ap.completato || 0],
    );
  });
  console.log(`✅ Scadenze Studio (appunti): ${APPUNTI.length}`);

  // ── 5) NOTE (pagina_bianca) ──────────────────────────────────────────────
  NOTE.forEach((n) => {
    run(
      `INSERT INTO pagina_bianca (tipo, titolo, contenuto, allegati, id_cliente, data_creazione, data_modifica)
       VALUES (?,?,?,?,?,?,?)`,
      [n.tipo, n.titolo, n.contenuto || null, n.allegati || null,
       n.cliente ? cliMap[n.cliente] : null, `${ANNO}-06-15 10:00:00`, `${ANNO}-06-15 10:00:00`],
    );
  });
  console.log(`✅ Note (pagina_bianca): ${NOTE.length}`);

  // ── 6) CESTINO ────────────────────────────────────────────────────────────
  const oraCestino = (giorniFa) => {
    const d = new Date(OGGI);
    d.setDate(d.getDate() - giorniFa);
    return d.toISOString().replace("T", " ").substring(0, 19);
  };
  // Il cliente "deleted" (attivo=0): mettiamo la sua riga anche nel cestino.
  const clienteDel = one(`SELECT * FROM clienti WHERE id = ?`, [cliMap["deleted"]]);
  run(
    `INSERT INTO cestino (tabella, record_id, dati_json, eliminato_da, data_eliminazione) VALUES (?,?,?,?,?)`,
    ["clienti", cliMap["deleted"], JSON.stringify(clienteDel), "utente", oraCestino(3)],
  );
  // Un appunto eliminato
  run(
    `INSERT INTO cestino (tabella, record_id, dati_json, eliminato_da, data_eliminazione) VALUES (?,?,?,?,?)`,
    ["appunti", 999, JSON.stringify({ id: 999, titolo: "Vecchio promemoria archiviato", contenuto: "Riunione annullata", priorita: "bassa", completato: 0 }), "utente", oraCestino(6)],
  );
  // Una nota eliminata
  run(
    `INSERT INTO cestino (tabella, record_id, dati_json, eliminato_da, data_eliminazione) VALUES (?,?,?,?,?)`,
    ["pagina_bianca", 998, JSON.stringify({ id: 998, tipo: "studio", titolo: "Bozza circolare 2025", contenuto: "Testo non più valido" }), "utente", oraCestino(10)],
  );
  console.log(`✅ Cestino: 3 elementi (cliente, scadenza studio, nota)`);

  // ── SALVATAGGIO ────────────────────────────────────────────────────────────
  const data = db.export();
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, Buffer.from(data));

  console.log(`\n🎉 Database demo creato: ${DB_PATH}`);
  console.log(`   Anno principale demo: ${ANNO} (con dati storici ${ANNO_PREC}).`);
  console.log(`   Avvia il gestionale con:  npm start   (poi apri http://localhost:3000)\n`);
}

main().catch((e) => {
  console.error("\n❌ Errore durante la generazione del seed:", e);
  process.exit(1);
});