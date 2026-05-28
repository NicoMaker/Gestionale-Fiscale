const clientiModel = require("../models/clienti");
const adempimentiModel = require("../models/adempimenti");
const scadenzarioModel = require("../models/scadenzario");
const statsModel = require("../models/stats");
const appuntiModel = require("../models/appunti");
const paginaBiancaModel = require("../models/paginaBianca");
const cestinoModel = require("../models/cestino");
const { queryAll, queryOne, runQuery } = require("../database");

module.exports = function setupSocketHandlers(io) {
  io.on("connection", (socket) => {
    console.log(`✅ Client connesso: ${socket.id}`);

    // ── TIPOLOGIE ──
    socket.on("get:tipologie", () => {
      try {
        const tip = queryAll(`SELECT * FROM tipologie_cliente ORDER BY id`);
        const sub = queryAll(
          `SELECT * FROM sottotipologie ORDER BY id_tipologia, ordine, id`,
        );
        tip.forEach((t) => {
          t.sottotipologie = sub.filter((s) => s.id_tipologia === t.id);
        });
        socket.emit("res:tipologie", { success: true, data: tip });
      } catch (e) {
        socket.emit("res:tipologie", { success: false, error: e.message });
      }
    });

    // ── CLIENTI ──
    socket.on("get:clienti", (filtri = {}) => {
      try {
        const anno = filtri.anno || new Date().getFullYear();
        const data = clientiModel.getClientiConDettagli(filtri, anno);
        socket.emit("res:clienti", { success: true, data, anno });
      } catch (e) {
        socket.emit("res:clienti", { success: false, error: e.message });
      }
    });

    socket.on("get:cliente", ({ id, anno }) => {
      try {
        const a = anno || new Date().getFullYear();
        const c = clientiModel.getClienteConDettagli(id, a);
        socket.emit("res:cliente", { success: true, data: c, anno: a });
      } catch (e) {
        socket.emit("res:cliente", { success: false, error: e.message });
      }
    });

    socket.on("get:cliente_storico", ({ id }) => {
      try {
        const storico = clientiModel.getConfigStoricoCliente(id);
        socket.emit("res:cliente_storico", { success: true, data: storico });
      } catch (e) {
        socket.emit("res:cliente_storico", {
          success: false,
          error: e.message,
        });
      }
    });

    socket.on("create:cliente", (data) => {
      try {
        const newId = clientiModel.createCliente(data);
        io.emit("broadcast:clienti_updated");
        socket.emit("res:create:cliente", { success: true, id: newId });
        socket.emit("notify", {
          type: "success",
          msg: "Cliente creato con successo",
        });
      } catch (e) {
        socket.emit("res:create:cliente", { success: false, error: e.message });
      }
    });

    socket.on("update:cliente", (data) => {
      try {
        clientiModel.updateClienteAnagrafica(data);
        clientiModel.updateClienteConfig(data);
        io.emit("broadcast:clienti_updated");
        socket.emit("res:update:cliente", { success: true });
        socket.emit("notify", { type: "success", msg: "Cliente aggiornato" });
      } catch (e) {
        socket.emit("res:update:cliente", { success: false, error: e.message });
      }
    });

    socket.on("delete:cliente", ({ id }) => {
      try {
        clientiModel.deleteCliente(id);
        io.emit("broadcast:clienti_updated");
        socket.emit("res:delete:cliente", { success: true });
        socket.emit("notify", {
          type: "success",
          msg: "Cliente eliminato con successo",
        });
      } catch (e) {
        socket.emit("res:delete:cliente", { success: false, error: e.message });
        socket.emit("notify", { type: "error", msg: e.message });
      }
    });

    // Copia configurazione cliente
    socket.on("copia:config_cliente", ({ id_cliente, anno_da, anno_a }) => {
      try {
        const config = clientiModel.copiaConfigClienteAnno(
          id_cliente,
          anno_da,
          anno_a,
        );
        io.emit("broadcast:clienti_updated");
        socket.emit("res:copia:config_cliente", { success: true, config });
        socket.emit("notify", {
          type: "success",
          msg: `Configurazione cliente copiata dall'anno ${anno_da} al ${anno_a}`,
        });
      } catch (e) {
        socket.emit("res:copia:config_cliente", {
          success: false,
          error: e.message,
        });
        socket.emit("notify", { type: "error", msg: e.message });
      }
    });

    socket.on("copia:config_tutti_clienti", ({ anno_da, anno_a }) => {
      try {
        const risultati = clientiModel.copiaTuttiClientiAnno(anno_da, anno_a);
        io.emit("broadcast:clienti_updated");
        socket.emit("res:copia:config_tutti_clienti", {
          success: true,
          risultati,
        });
      } catch (e) {
        socket.emit("res:copia:config_tutti_clienti", {
          success: false,
          error: e.message,
        });
      }
    });

    // ── ADEMPIMENTI ──
    socket.on("get:adempimenti", () => {
      try {
        const data = adempimentiModel.getAdempimenti();
        socket.emit("res:adempimenti", { success: true, data });
      } catch (e) {
        socket.emit("res:adempimenti", { success: false, error: e.message });
      }
    });

    socket.on("get:adempimenti_cliente", ({ id_cliente, anno }) => {
      try {
        const data = adempimentiModel.getAdempimentiCliente(id_cliente, anno);
        socket.emit("res:adempimenti_cliente", { success: true, data });
      } catch (e) {
        socket.emit("res:adempimenti_cliente", {
          success: false,
          error: e.message,
        });
      }
    });

    socket.on("create:adempimento", (data) => {
      try {
        const newId = adempimentiModel.createAdempimento(data);
        const anno = data.anno_validita
          ? parseInt(data.anno_validita)
          : new Date().getFullYear();
        const tot = adempimentiModel.generaAdempimentoPerTutti(newId, anno);
        io.emit("broadcast:adempimenti_updated");
        io.emit("broadcast:scadenzario_updated", { anno });
        socket.emit("res:create:adempimento", {
          success: true,
          id: newId,
          generati: tot,
        });
      } catch (e) {
        socket.emit("res:create:adempimento", {
          success: false,
          error: e.message,
        });
      }
    });

    socket.on("update:adempimento", (data) => {
      try {
        adempimentiModel.updateAdempimento(data);
        io.emit("broadcast:adempimenti_updated");
        socket.emit("res:update:adempimento", { success: true });
      } catch (e) {
        socket.emit("res:update:adempimento", {
          success: false,
          error: e.message,
        });
      }
    });

    socket.on("delete:adempimento", ({ id }) => {
      try {
        adempimentiModel.deleteAdempimento(id);
        io.emit("broadcast:adempimenti_updated");
        socket.emit("res:delete:adempimento", { success: true });
        socket.emit("notify", {
          type: "success",
          msg: "Adempimento eliminato con successo",
        });
      } catch (e) {
        socket.emit("res:delete:adempimento", {
          success: false,
          error: e.message,
        });
        socket.emit("notify", { type: "error", msg: e.message });
      }
    });

    socket.on("create:adempimento_personalizzato", (data) => {
      try {
        const risultato =
          adempimentiModel.createAdempimentoPersonalizzato(data);
        io.emit("broadcast:adempimenti_updated");
        if (risultato.generati_per_clienti > 0) {
          io.emit("broadcast:scadenzario_updated", {
            anno: data.anno || new Date().getFullYear(),
          });
          io.emit("broadcast:globale_updated", {
            anno: data.anno || new Date().getFullYear(),
          });
          io.emit("broadcast:stats_updated", {
            anno: data.anno || new Date().getFullYear(),
          });
        }
        socket.emit("res:create:adempimento_personalizzato", {
          success: true,
          ...risultato,
        });
      } catch (e) {
        socket.emit("res:create:adempimento_personalizzato", {
          success: false,
          error: e.message,
        });
      }
    });

    // ── SCADENZARIO ──
    socket.on("get:scadenzario", ({ id_cliente, anno, filtri = {} }) => {
      try {
        const data = scadenzarioModel.getScadenzarioConDettagliCliente(
          id_cliente,
          anno,
          filtri,
        );
        socket.emit("res:scadenzario", { success: true, data });
      } catch (e) {
        socket.emit("res:scadenzario", { success: false, error: e.message });
      }
    });

    socket.on("genera:scadenzario", ({ id_cliente, anno }) => {
      try {
        const tot = scadenzarioModel.generaScadenzarioInterno(id_cliente, anno);
        io.emit("broadcast:scadenzario_updated", { id_cliente, anno });
        io.emit("broadcast:stats_updated", { anno });
        socket.emit("res:genera:scadenzario", { success: true, inseriti: tot });
      } catch (e) {
        socket.emit("res:genera:scadenzario", {
          success: false,
          error: e.message,
        });
      }
    });

    socket.on("genera:tutti", ({ anno, adempimenti }) => {
      try {
        const risultato = scadenzarioModel.generaTuttiClientiAnno(
          anno,
          adempimenti,
        );
        io.emit("broadcast:scadenzario_updated", { anno });
        io.emit("broadcast:globale_updated", { anno });
        io.emit("broadcast:stats_updated", { anno });
        socket.emit("res:genera:tutti", { success: true, ...risultato });
      } catch (e) {
        socket.emit("res:genera:tutti", { success: false, error: e.message });
      }
    });

    socket.on("rigenera:tutti", ({ anno, adempimenti }) => {
      try {
        const tot = scadenzarioModel.rigeneraTuttiClientiAnno(
          anno,
          adempimenti,
        );
        io.emit("broadcast:scadenzario_updated", { anno });
        io.emit("broadcast:globale_updated", { anno });
        io.emit("broadcast:stats_updated", { anno });
        socket.emit("res:rigenera:tutti", { success: true, inseriti: tot });
      } catch (e) {
        socket.emit("res:rigenera:tutti", { success: false, error: e.message });
      }
    });

    socket.on("check:adempimenti_cliente", ({ id_cliente, anno }) => {
      try {
        const risultato = adempimentiModel.checkAdempimentiClienteEsistenti(
          id_cliente,
          anno,
        );
        socket.emit("res:check:adempimenti_cliente", {
          success: true,
          data: risultato,
        });
      } catch (e) {
        socket.emit("res:check:adempimenti_cliente", {
          success: false,
          error: e.message,
        });
      }
    });

    socket.on("copia:scadenzario", ({ id_cliente, anno_da, anno_a }) => {
      try {
        const tot = scadenzarioModel.copiaScadenzarioCliente(
          id_cliente,
          anno_da,
          anno_a,
        );
        io.emit("broadcast:scadenzario_updated", { id_cliente, anno: anno_a });
        socket.emit("res:copia:scadenzario", { success: true, copiati: tot });
      } catch (e) {
        socket.emit("res:copia:scadenzario", {
          success: false,
          error: e.message,
        });
      }
    });

    socket.on("copia:tutti", ({ anno_da, anno_a }) => {
      try {
        const tot = scadenzarioModel.copiaTuttiClienti(anno_da, anno_a);
        io.emit("broadcast:scadenzario_updated", { anno: anno_a });
        io.emit("broadcast:globale_updated", { anno: anno_a });
        socket.emit("res:copia:tutti", { success: true, copiati: tot });
      } catch (e) {
        socket.emit("res:copia:tutti", { success: false, error: e.message });
      }
    });

    socket.on("update:adempimento_stato", (data) => {
      try {
        const result = scadenzarioModel.updateAdempimentoStato(data);
        io.emit("broadcast:scadenzario_updated", {
          id_cliente: result.id_cliente,
          anno: result.anno,
        });
        io.emit("broadcast:globale_updated", { anno: result.anno });
        io.emit("broadcast:stats_updated", { anno: result.anno });
        socket.emit("res:update:adempimento_stato", { success: true });
      } catch (e) {
        socket.emit("res:update:adempimento_stato", {
          success: false,
          error: e.message,
        });
      }
    });

    socket.on("delete:adempimento_cliente", ({ id }) => {
      try {
        const result = scadenzarioModel.deleteAdempimentoCliente(id);
        io.emit("broadcast:scadenzario_updated", {
          id_cliente: result.id_cliente,
          anno: result.anno,
        });
        io.emit("broadcast:globale_updated", { anno: result.anno });
        socket.emit("res:delete:adempimento_cliente", { success: true });
      } catch (e) {
        socket.emit("res:delete:adempimento_cliente", {
          success: false,
          error: e.message,
        });
      }
    });

    socket.on("add:adempimento_cliente", (data) => {
      try {
        scadenzarioModel.addAdempimentoCliente(data);
        io.emit("broadcast:scadenzario_updated", {
          id_cliente: data.id_cliente,
          anno: data.anno,
        });
        socket.emit("res:add:adempimento_cliente", { success: true });
      } catch (e) {
        socket.emit("res:add:adempimento_cliente", {
          success: false,
          error: e.message,
        });
      }
    });

    // ── SCADENZARIO GLOBALE ──
    socket.on("get:scadenzario_globale", ({ anno, filtri = {} }) => {
      try {
        const data = scadenzarioModel.getScadenzarioGlobale(anno, filtri);
        socket.emit("res:scadenzario_globale", { success: true, data });
      } catch (e) {
        socket.emit("res:scadenzario_globale", {
          success: false,
          error: e.message,
        });
      }
    });

    // ── STATISTICHE ──
    socket.on("get:stats", ({ anno }) => {
      try {
        const data = statsModel.getStats(anno);
        socket.emit("res:stats", { success: true, data });
      } catch (e) {
        socket.emit("res:stats", { success: false, error: e.message });
      }
    });

    // ── APPLICA ADEMPIMENTI A CLIENTI ──
    socket.on(
      "applica:adempimenti_a_clienti",
      ({ adempimenti_ids, clienti_ids, anno }) => {
        try {
          const risultato = adempimentiModel.applicaAdempimentiAClienti(
            adempimenti_ids,
            clienti_ids,
            anno,
          );
          io.emit("broadcast:adempimenti_updated");
          io.emit("broadcast:scadenzario_updated", { anno });
          io.emit("broadcast:globale_updated", { anno });
          io.emit("broadcast:stats_updated", { anno });
          socket.emit("res:applica:adempimenti_a_clienti", {
            success: true,
            inseriti: risultato.inseriti,
            clienti: clienti_ids.length,
            adempimenti: adempimenti_ids.length,
            dettagli: { skipped: risultato.skipped },
          });
        } catch (e) {
          socket.emit("res:applica:adempimenti_a_clienti", {
            success: false,
            error: e.message,
          });
        }
      },
    );

    // ── CLIENTI SENZA ADEMPIMENTI ──
    socket.on("get:clienti_senza_adempimenti", ({ anno }) => {
      try {
        const clientiSenzaAdp = clientiModel.getClientiSenzaAdempimenti(anno);
        socket.emit("res:clienti_senza_adempimenti", {
          success: true,
          data: clientiSenzaAdp,
        });
      } catch (e) {
        socket.emit("res:clienti_senza_adempimenti", {
          success: false,
          error: e.message,
        });
      }
    });

    // ── ELIMINA ADEMPIMENTI DA CLIENTI ──
    socket.on(
      "elimina:adempimenti_a_clienti",
      ({ adempimenti_ids, clienti_ids, anno }) => {
        try {
          const risultato = adempimentiModel.eliminaAdempimentiDaClienti(
            adempimenti_ids,
            clienti_ids,
            anno,
          );
          io.emit("broadcast:scadenzario_updated", { anno });
          io.emit("broadcast:globale_updated", { anno });
          io.emit("broadcast:stats_updated", { anno });
          socket.emit("res:elimina:adempimenti_a_clienti", {
            success: true,
            eliminati: risultato.eliminati,
            nonTrovati: risultato.nonTrovati,
            clienti: clienti_ids.length,
            adempimenti: adempimenti_ids.length,
          });
        } catch (e) {
          socket.emit("res:elimina:adempimenti_a_clienti", {
            success: false,
            error: e.message,
          });
        }
      },
    );

    // ── ELIMINA ADEMPIMENTI BULK ──
    socket.on(
      "elimina:adempimenti_cliente_bulk",
      ({ ids_righe, id_cliente, anno }) => {
        try {
          const risultato =
            adempimentiModel.eliminaAdempimentiClienteBulk(ids_righe);
          io.emit("broadcast:scadenzario_updated", { id_cliente, anno });
          io.emit("broadcast:globale_updated", { anno });
          io.emit("broadcast:stats_updated", { anno });
          socket.emit("res:elimina:adempimenti_cliente_bulk", {
            success: true,
            eliminati: risultato.eliminati,
          });
        } catch (e) {
          socket.emit("res:elimina:adempimenti_cliente_bulk", {
            success: false,
            error: e.message,
          });
        }
      },
    );

    // ========== APPUNTI ==========
    socket.on("get:appunti", (filtri = {}) => {
      try {
        const data = appuntiModel.getAppunti(filtri);
        socket.emit("res:appunti", { success: true, data });
      } catch (e) {
        socket.emit("res:appunti", { success: false, error: e.message });
      }
    });

    socket.on("get:appunto", ({ id }) => {
      try {
        const data = appuntiModel.getAppunto(id);
        socket.emit("res:appunto", { success: true, data });
      } catch (e) {
        socket.emit("res:appunto", { success: false, error: e.message });
      }
    });

    socket.on("create:appunto", (data) => {
      try {
        const newId = appuntiModel.createAppunto(data);
        io.emit("broadcast:appunti_updated");
        socket.emit("res:create:appunto", { success: true, id: newId });
        socket.emit("notify", {
          type: "success",
          msg: "Appunto creato con successo",
        });
      } catch (e) {
        socket.emit("res:create:appunto", { success: false, error: e.message });
      }
    });

    socket.on("update:appunto", (data) => {
      try {
        appuntiModel.updateAppunto(data);
        io.emit("broadcast:appunti_updated");
        socket.emit("res:update:appunto", { success: true });
        socket.emit("notify", { type: "success", msg: "Appunto aggiornato" });
      } catch (e) {
        socket.emit("res:update:appunto", { success: false, error: e.message });
      }
    });

    socket.on("delete:appunto", ({ id }) => {
      try {
        appuntiModel.deleteAppunto(id);
        io.emit("broadcast:appunti_updated");
        socket.emit("res:delete:appunto", { success: true });
        socket.emit("notify", { type: "success", msg: "Appunto eliminato" });
      } catch (e) {
        socket.emit("res:delete:appunto", { success: false, error: e.message });
      }
    });

    socket.on("toggle:appunto_completato", ({ id, completato }) => {
      try {
        appuntiModel.toggleAppuntoCompletato(id, completato);
        io.emit("broadcast:appunti_updated");
        socket.emit("res:toggle:appunto_completato", { success: true });
      } catch (e) {
        socket.emit("res:toggle:appunto_completato", {
          success: false,
          error: e.message,
        });
      }
    });

    socket.on("copia:appunti_anno", ({ anno_da, anno_a, id_cliente }) => {
      try {
        const copiati = appuntiModel.copiaAppuntiDaAnno(
          anno_da,
          anno_a,
          id_cliente || null,
        );
        io.emit("broadcast:appunti_updated");
        socket.emit("res:copia:appunti_anno", { success: true, copiati });
        socket.emit("notify", {
          type: "success",
          msg: `Copiati ${copiati} appunti dall'anno ${anno_da} al ${anno_a}`,
        });
      } catch (e) {
        socket.emit("res:copia:appunti_anno", {
          success: false,
          error: e.message,
        });
      }
    });

    // ========== PAGINA BIANCA ==========
    socket.on("get:pagina_bianca", (filtri) => {
      try {
        const data = paginaBiancaModel.getPaginaBianca(filtri);
        socket.emit("res:pagina_bianca", { success: true, data });
      } catch (e) {
        socket.emit("res:pagina_bianca", { success: false, error: e.message });
      }
    });

    socket.on("get:pagina_bianca_singolo", ({ id }) => {
      try {
        const data = paginaBiancaModel.getPaginaBiancaSingolo(id);
        socket.emit("res:pagina_bianca_singolo", { success: true, data });
      } catch (e) {
        socket.emit("res:pagina_bianca_singolo", {
          success: false,
          error: e.message,
        });
      }
    });

    socket.on("create:pagina_bianca", (data) => {
      try {
        const newId = paginaBiancaModel.createPaginaBianca(data);
        io.emit("broadcast:pagina_bianca_updated");
        socket.emit("res:create:pagina_bianca", { success: true, id: newId });
        socket.emit("notify", {
          type: "success",
          msg: "Appunto creato con successo",
        });
      } catch (e) {
        socket.emit("res:create:pagina_bianca", {
          success: false,
          error: e.message,
        });
      }
    });

    socket.on("update:pagina_bianca", (data) => {
      try {
        paginaBiancaModel.updatePaginaBianca(data);
        io.emit("broadcast:pagina_bianca_updated");
        socket.emit("res:update:pagina_bianca", { success: true });
        socket.emit("notify", { type: "success", msg: "Appunto aggiornato" });
      } catch (e) {
        socket.emit("res:update:pagina_bianca", {
          success: false,
          error: e.message,
        });
      }
    });

    socket.on("delete:pagina_bianca", ({ id }) => {
      try {
        paginaBiancaModel.deletePaginaBianca(id);
        io.emit("broadcast:pagina_bianca_updated");
        socket.emit("res:delete:pagina_bianca", { success: true });
        socket.emit("notify", { type: "success", msg: "Appunto eliminato" });
      } catch (e) {
        socket.emit("res:delete:pagina_bianca", {
          success: false,
          error: e.message,
        });
      }
    });

    // ========== CESTINO ==========
    socket.on("get:cestino", (filtri = {}) => {
      try {
        // Pulizia automatica elementi scaduti (>30gg)
        cestinoModel.eliminaScadutiCestino();
        const data = cestinoModel.getCestino(filtri);
        socket.emit("res:cestino", { success: true, data });
      } catch (e) {
        socket.emit("res:cestino", { success: false, error: e.message });
      }
    });

    socket.on("ripristina:cestino", ({ id }) => {
      try {
        const item = cestinoModel.getCestinoItem(id);
        if (!item) throw new Error("Elemento non trovato nel cestino");

        const dati = item.dati;
        let ripristinato = false;

        if (item.tabella === "clienti") {
          // Riattiva il cliente
          runQuery(`UPDATE clienti SET attivo = 1, updated_at = datetime('now') WHERE id = ?`, [item.record_id]);
          ripristinato = true;
          io.emit("broadcast:clienti_updated");
        } else if (item.tabella === "adempimenti") {
          // Riattiva l'adempimento
          runQuery(`UPDATE adempimenti SET attivo = 1 WHERE id = ?`, [item.record_id]);
          ripristinato = true;
          io.emit("broadcast:adempimenti_updated");
        } else if (item.tabella === "appunti") {
          // Reinserisce l'appunto
          runQuery(
            `INSERT OR REPLACE INTO appunti (id, titolo, contenuto, id_cliente, data_inserimento, data_scadenza, priorita, completato)
             VALUES (?,?,?,?,?,?,?,?)`,
            [dati.id, dati.titolo, dati.contenuto || null, dati.id_cliente || null,
             dati.data_inserimento, dati.data_scadenza || null, dati.priorita || "media", dati.completato || 0]
          );
          ripristinato = true;
          io.emit("broadcast:appunti_updated");
        } else if (item.tabella === "pagina_bianca") {
          // Reinserisce la nota
          runQuery(
            `INSERT OR REPLACE INTO pagina_bianca (id, tipo, titolo, contenuto, allegati, id_cliente, data_creazione, data_modifica)
             VALUES (?,?,?,?,?,?,?,?)`,
            [dati.id, dati.tipo, dati.titolo || "", dati.contenuto || null,
             dati.allegati || null, dati.id_cliente || null, dati.data_creazione, dati.data_modifica]
          );
          ripristinato = true;
          io.emit("broadcast:pagina_bianca_updated");
        } else if (item.tabella === "adempimenti_cliente") {
          // Verifica che cliente e adempimento esistano ancora
          const clienteOk = queryOne(`SELECT id FROM clienti WHERE id = ? AND attivo = 1`, [dati.id_cliente]);
          if (!clienteOk) throw new Error(`Impossibile ripristinare: il cliente associato non esiste più o è stato eliminato.`);
          const adpOk = queryOne(`SELECT id FROM adempimenti WHERE id = ? AND attivo = 1`, [dati.id_adempimento]);
          if (!adpOk) throw new Error(`Impossibile ripristinare: l'adempimento associato non esiste più o è stato eliminato.`);
          // Reinserisce la riga adempimenti_cliente
          runQuery(
            `INSERT OR REPLACE INTO adempimenti_cliente
               (id, id_cliente, id_adempimento, anno, mese, trimestre, semestre,
                stato, data_scadenza, data_completamento, note, importo,
                importo_saldo, importo_acconto1, importo_acconto2, importo_iva,
                importo_contabilita, cont_completata)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
              dati.id, dati.id_cliente, dati.id_adempimento, dati.anno,
              dati.mese || null, dati.trimestre || null, dati.semestre || null,
              dati.stato || "da_fare",
              dati.data_scadenza || null, dati.data_completamento || null,
              dati.note || null, dati.importo || null,
              dati.importo_saldo || null, dati.importo_acconto1 || null,
              dati.importo_acconto2 || null, dati.importo_iva || null,
              dati.importo_contabilita || null, dati.cont_completata || 0,
            ]
          );
          ripristinato = true;
          io.emit("broadcast:scadenzario_updated", { id_cliente: dati.id_cliente, anno: dati.anno });
          io.emit("broadcast:globale_updated", { anno: dati.anno });
          io.emit("broadcast:stats_updated", { anno: dati.anno });
        }

        if (ripristinato) {
          cestinoModel.eliminaDalCestino(id);
          io.emit("broadcast:cestino_updated");
          socket.emit("res:ripristina:cestino", { success: true });
          socket.emit("notify", { type: "success", msg: "Elemento ripristinato con successo" });
        } else {
          throw new Error("Tabella non supportata per il ripristino: " + item.tabella);
        }
      } catch (e) {
        socket.emit("res:ripristina:cestino", { success: false, error: e.message });
        socket.emit("notify", { type: "error", msg: e.message });
      }
    });

    socket.on("delete:cestino_item", ({ id }) => {
      try {
        cestinoModel.eliminaDalCestino(id);
        io.emit("broadcast:cestino_updated");
        socket.emit("res:delete:cestino_item", { success: true });
        socket.emit("notify", { type: "success", msg: "Elemento eliminato definitivamente" });
      } catch (e) {
        socket.emit("res:delete:cestino_item", { success: false, error: e.message });
      }
    });

    socket.on("svuota:cestino", () => {
      try {
        const cnt = cestinoModel.svuotaCestino();
        io.emit("broadcast:cestino_updated");
        socket.emit("res:svuota:cestino", { success: true, eliminati: cnt });
        socket.emit("notify", { type: "success", msg: `Cestino svuotato (${cnt} elementi eliminati)` });
      } catch (e) {
        socket.emit("res:svuota:cestino", { success: false, error: e.message });
      }
    });

    // ── BULK: ripristina più elementi selezionati ──────────────────────
    socket.on("ripristina:cestino:bulk", ({ ids }) => {
      if (!Array.isArray(ids) || !ids.length) {
        socket.emit("res:ripristina:cestino:bulk", { success: false, error: "Nessun id fornito" });
        return;
      }
      const results = { ok: [], failed: [] };
      for (const id of ids) {
        try {
          const item = cestinoModel.getCestinoItem(id);
          if (!item) throw new Error("Elemento non trovato");
          const dati = item.dati;
          let ripristinato = false;

          if (item.tabella === "clienti") {
            runQuery(`UPDATE clienti SET attivo = 1, updated_at = datetime('now') WHERE id = ?`, [item.record_id]);
            ripristinato = true;
            io.emit("broadcast:clienti_updated");
          } else if (item.tabella === "adempimenti") {
            runQuery(`UPDATE adempimenti SET attivo = 1 WHERE id = ?`, [item.record_id]);
            ripristinato = true;
            io.emit("broadcast:adempimenti_updated");
          } else if (item.tabella === "appunti") {
            runQuery(
              `INSERT OR REPLACE INTO appunti (id, titolo, contenuto, id_cliente, data_inserimento, data_scadenza, priorita, completato) VALUES (?,?,?,?,?,?,?,?)`,
              [dati.id, dati.titolo, dati.contenuto || null, dati.id_cliente || null, dati.data_inserimento, dati.data_scadenza || null, dati.priorita || "media", dati.completato || 0]
            );
            ripristinato = true;
            io.emit("broadcast:appunti_updated");
          } else if (item.tabella === "pagina_bianca") {
            runQuery(
              `INSERT OR REPLACE INTO pagina_bianca (id, tipo, titolo, contenuto, allegati, id_cliente, data_creazione, data_modifica) VALUES (?,?,?,?,?,?,?,?)`,
              [dati.id, dati.tipo, dati.titolo || "", dati.contenuto || null, dati.allegati || null, dati.id_cliente || null, dati.data_creazione, dati.data_modifica]
            );
            ripristinato = true;
            io.emit("broadcast:pagina_bianca_updated");
          } else if (item.tabella === "adempimenti_cliente") {
            const clienteOk = queryOne(`SELECT id FROM clienti WHERE id = ? AND attivo = 1`, [dati.id_cliente]);
            if (!clienteOk) throw new Error(`Cliente non trovato o eliminato`);
            const adpOk = queryOne(`SELECT id FROM adempimenti WHERE id = ? AND attivo = 1`, [dati.id_adempimento]);
            if (!adpOk) throw new Error(`Adempimento non trovato o eliminato`);
            runQuery(
              `INSERT OR REPLACE INTO adempimenti_cliente (id, id_cliente, id_adempimento, anno, mese, trimestre, semestre, stato, data_scadenza, data_completamento, note, importo, importo_saldo, importo_acconto1, importo_acconto2, importo_iva, importo_contabilita, cont_completata) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
              [dati.id, dati.id_cliente, dati.id_adempimento, dati.anno, dati.mese || null, dati.trimestre || null, dati.semestre || null, dati.stato || "da_fare", dati.data_scadenza || null, dati.data_completamento || null, dati.note || null, dati.importo || null, dati.importo_saldo || null, dati.importo_acconto1 || null, dati.importo_acconto2 || null, dati.importo_iva || null, dati.importo_contabilita || null, dati.cont_completata || 0]
            );
            ripristinato = true;
            io.emit("broadcast:scadenzario_updated", { id_cliente: dati.id_cliente, anno: dati.anno });
            io.emit("broadcast:globale_updated", { anno: dati.anno });
            io.emit("broadcast:stats_updated", { anno: dati.anno });
          }

          if (ripristinato) {
            cestinoModel.eliminaDalCestino(id);
            results.ok.push(id);
          } else {
            results.failed.push({ id, error: "Tabella non supportata" });
          }
        } catch (e) {
          results.failed.push({ id, error: e.message });
        }
      }
      io.emit("broadcast:cestino_updated");
      socket.emit("res:ripristina:cestino:bulk", { success: true, ok: results.ok.length, failed: results.failed });
      const msg = results.failed.length
        ? `Ripristinati ${results.ok.length}, falliti ${results.failed.length}`
        : `${results.ok.length} element${results.ok.length === 1 ? "o ripristinato" : "i ripristinati"} con successo`;
      socket.emit("notify", { type: results.failed.length ? "warning" : "success", msg });
    });

    // ── BULK: elimina definitivamente più elementi selezionati ─────────
    socket.on("delete:cestino:bulk", ({ ids }) => {
      if (!Array.isArray(ids) || !ids.length) {
        socket.emit("res:delete:cestino:bulk", { success: false, error: "Nessun id fornito" });
        return;
      }
      let eliminati = 0;
      for (const id of ids) {
        try {
          cestinoModel.eliminaDalCestino(id);
          eliminati++;
        } catch (_) {}
      }
      io.emit("broadcast:cestino_updated");
      socket.emit("res:delete:cestino:bulk", { success: true, eliminati });
      socket.emit("notify", { type: "success", msg: `${eliminati} element${eliminati === 1 ? "o eliminato" : "i eliminati"} definitivamente` });
    });

    socket.on("disconnect", () => {
      console.log(`❌ Client disconnesso: ${socket.id}`);
    });
  });
};
