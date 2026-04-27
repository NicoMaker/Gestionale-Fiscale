// Migration script to remove all user configurations before 2026
// This ensures users are only available from 2026 onwards

const { runQuery, queryAll } = require('../database');

function removePre2026Configurations() {
  console.log('🗑️ Removing all user configurations before 2026...');
  
  try {
    // First, check if there are any configurations before 2026
    const configsPre2026 = queryAll(
      `SELECT COUNT(*) as count FROM clienti_config_annuale WHERE anno < 2026`
    );
    
    if (configsPre2026[0].count > 0) {
      // Delete all configurations for years before 2026
      const result = runQuery(
        `DELETE FROM clienti_config_annuale WHERE anno < 2026`
      );
      
      console.log(`✅ Removed ${configsPre2026[0].count} configurations for years before 2026`);
    } else {
      console.log('ℹ️ No pre-2026 configurations found to remove');
    }
    
    // Check for any adempimenti before 2026 and remove them as well
    const adempimentiPre2026 = queryAll(
      `SELECT COUNT(*) as count FROM adempimenti_cliente WHERE anno < 2026`
    );
    
    if (adempimentiPre2026[0].count > 0) {
      runQuery(
        `DELETE FROM adempimenti_cliente WHERE anno < 2026`
      );
      console.log(`✅ Removed ${adempimentiPre2026[0].count} adempimenti for years before 2026`);
    }
    
    console.log('✅ Pre-2026 cleanup completed successfully');
    return true;
  } catch (error) {
    console.error('❌ Error removing pre-2026 configurations:', error);
    return false;
  }
}

module.exports = { removePre2026Configurations };
