// Migration script to add 2026+ user configurations
// This ensures users are available in 2026 and subsequent years

const { runQuery, queryAll, queryOne } = require('../database');

function add2026PlusConfigurations() {
  console.log('➕ Adding 2026+ user configurations...');
  
  try {
    // Get all active clients
    const clients = queryAll(
      `SELECT id, nome FROM clienti WHERE attivo = 1`
    );
    
    if (clients.length === 0) {
      console.log('ℹ️ No active clients found');
      return true;
    }
    
    let addedCount = 0;
    const currentYear = new Date().getFullYear();
    
    // Add configurations for 2026 through current year + 2
    for (let year = 2026; year <= currentYear + 2; year++) {
      for (const client of clients) {
        // Check if configuration already exists
        const existing = queryOne(
          `SELECT id FROM clienti_config_annuale WHERE id_cliente = ? AND anno = ?`,
          [client.id, year]
        );
        
        if (!existing) {
          // Get the most recent configuration to copy
          const lastConfig = queryOne(
            `SELECT * FROM clienti_config_annuale WHERE id_cliente = ? AND anno < ? ORDER BY anno DESC LIMIT 1`,
            [client.id, year]
          );
          
          if (lastConfig) {
            // Copy the last configuration
            runQuery(
              `INSERT INTO clienti_config_annuale 
                (id_cliente, anno, id_tipologia, id_sottotipologia, col2_value, col3_value, periodicita) 
               VALUES (?,?,?,?,?,?,?)`,
              [
                client.id,
                year,
                lastConfig.id_tipologia,
                lastConfig.id_sottotipologia,
                lastConfig.col2_value,
                lastConfig.col3_value,
                lastConfig.periodicita
              ]
            );
            addedCount++;
          } else {
            // Create a default configuration if no previous one exists
            const defaultTipologia = queryOne(`SELECT id FROM tipologie_cliente WHERE codice = 'PF' LIMIT 1`);
            
            if (defaultTipologia) {
              runQuery(
                `INSERT INTO clienti_config_annuale 
                  (id_cliente, anno, id_tipologia, id_sottotipologia, col2_value, col3_value, periodicita) 
                 VALUES (?,?,?,?,?,?,?)`,
                [
                  client.id,
                  year,
                  defaultTipologia.id,
                  null,
                  null,
                  null,
                  null
                ]
              );
              addedCount++;
            }
          }
        }
      }
    }
    
    console.log(`✅ Added ${addedCount} configurations for 2026+ years`);
    return true;
  } catch (error) {
    console.error('❌ Error adding 2026+ configurations:', error);
    return false;
  }
}

module.exports = { add2026PlusConfigurations };
