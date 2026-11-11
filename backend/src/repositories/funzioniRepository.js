const { queryAll, queryOne } = require("../config/database");
const statsRepository = require("./statsRepository");

const conta = (sql, params = []) => queryOne(sql, params)?.c || 0;

// Condizioni riusate: adempimenti dell'anno (validi per l'anno o senza validità)
const ADP_ANNO = `(a.anno_validita IS NULL OR a.anno_validita = ?)`;

/**
 * Dati per la pagina CENTRO FUNZIONI: un po' di numeri per ogni
 * funzionalità dell'app, così da poter saltare direttamente ai dati.
 * Sola lettura.
 */
function getFunzioni(anno) {
  const stats = statsRepository.getStats(anno);

  const clientiTot = conta(`SELECT COUNT(*) AS c FROM clienti`);

  const senzaAdempimenti = queryAll(
    `SELECT c.id, c.nome FROM clienti c
     WHERE c.attivo = 1
       AND NOT EXISTS (SELECT 1 FROM adempimenti_cliente ac
                       WHERE ac.id_cliente = c.id AND ac.anno = ?)
     ORDER BY c.nome COLLATE NOCASE`,
    [anno],
  );

  const topDaFare = queryAll(
    `SELECT c.id, c.nome,
            SUM(CASE WHEN ac.stato = 'da_fare' THEN 1 ELSE 0 END) AS da_fare,
            COUNT(*) AS totale
     FROM clienti c
     JOIN adempimenti_cliente ac ON ac.id_cliente = c.id AND ac.anno = ?
     JOIN adempimenti a ON a.id = ac.id_adempimento
     WHERE c.attivo = 1 AND ${ADP_ANNO}
     GROUP BY c.id, c.nome
     HAVING da_fare > 0
     ORDER BY da_fare DESC, c.nome COLLATE NOCASE
     LIMIT 5`,
    [anno, anno],
  );

  const aperti = `ac.anno = ? AND c.attivo = 1 AND ac.stato IN ('da_fare','in_corso')
     AND ${ADP_ANNO}
     AND ac.data_scadenza IS NOT NULL AND ac.data_scadenza <> ''`;
  const base = `FROM adempimenti_cliente ac
     JOIN clienti c ON c.id = ac.id_cliente
     JOIN adempimenti a ON a.id = ac.id_adempimento`;

  const scaduti = conta(
    `SELECT COUNT(*) AS c ${base}
     WHERE ${aperti} AND date(ac.data_scadenza) < date('now','localtime')`,
    [anno, anno],
  );
  const scadutiEsempi = queryAll(
    `SELECT ac.id_cliente, c.nome AS cliente, a.nome AS adempimento, ac.data_scadenza
     ${base}
     WHERE ${aperti} AND date(ac.data_scadenza) < date('now','localtime')
     ORDER BY ac.data_scadenza ASC LIMIT 5`,
    [anno, anno],
  );
  const inScadenza7 = conta(
    `SELECT COUNT(*) AS c ${base}
     WHERE ${aperti}
       AND date(ac.data_scadenza) BETWEEN date('now','localtime') AND date('now','localtime','+7 day')`,
    [anno, anno],
  );

  const appuntiAperti = conta(
    `SELECT COUNT(*) AS c FROM appunti WHERE completato = 0`,
  );
  const appuntiScaduti = conta(
    `SELECT COUNT(*) AS c FROM appunti
     WHERE completato = 0 AND data_scadenza IS NOT NULL AND data_scadenza <> ''
       AND date(data_scadenza) < date('now','localtime')`,
  );
  const appuntiIn7 = conta(
    `SELECT COUNT(*) AS c FROM appunti
     WHERE completato = 0 AND data_scadenza IS NOT NULL AND data_scadenza <> ''
       AND date(data_scadenza) BETWEEN date('now','localtime') AND date('now','localtime','+7 day')`,
  );
  const appuntiProssimi = queryAll(
    `SELECT id, titolo, data_scadenza, priorita FROM appunti
     WHERE completato = 0
     ORDER BY (data_scadenza IS NULL OR data_scadenza = ''), data_scadenza ASC, id DESC
     LIMIT 3`,
  );

  return {
    anno,
    clienti: { attivi: stats.totClienti, totale: clientiTot },
    anno_stats: {
      totale: stats.totale,
      completati: stats.completati,
      da_fare: stats.da_fare,
      in_corso: stats.in_corso,
      na: stats.na,
    },
    senza_adempimenti: {
      count: senzaAdempimenti.length,
      esempi: senzaAdempimenti.slice(0, 5),
    },
    top_da_fare: topDaFare,
    scaduti: { count: scaduti, esempi: scadutiEsempi },
    in_scadenza_7: inScadenza7,
    adempimenti: {
      attivi: conta(`SELECT COUNT(*) AS c FROM adempimenti WHERE attivo = 1`),
    },
    tipologie: {
      count: conta(`SELECT COUNT(*) AS c FROM tipologie_cliente`),
      sottotipologie: conta(`SELECT COUNT(*) AS c FROM sottotipologie`),
    },
    appunti: {
      aperti: appuntiAperti,
      scaduti: appuntiScaduti,
      in_scadenza_7: appuntiIn7,
      prossimi: appuntiProssimi,
    },
    note: {
      totale: conta(`SELECT COUNT(*) AS c FROM pagina_bianca`),
      studio: conta(
        `SELECT COUNT(*) AS c FROM pagina_bianca WHERE tipo = 'studio'`,
      ),
      cliente: conta(
        `SELECT COUNT(*) AS c FROM pagina_bianca WHERE tipo = 'cliente'`,
      ),
    },
    cestino: { totale: conta(`SELECT COUNT(*) AS c FROM cestino`) },
  };
}

module.exports = { getFunzioni };
