#!/usr/bin/env node
// Management script for user year configurations
// Usage: node manage_user_years.js [action]
// Actions: 'remove-pre-2026', 'add-2026', 'full-reset'

const path = require('path');
const { initDB } = require('../modules/database');

async function main() {
  const action = process.argv[2] || 'help';
  
  console.log('🚀 Starting user year management...');
  
  // Initialize database
  await initDB();
  
  const { removePre2026Configurations } = require('../modules/database/migrations/remove_2025_configs');
  const { add2026PlusConfigurations } = require('../modules/database/migrations/add_2026_configs');
  
  switch (action) {
    case 'remove-pre-2026':
      console.log('📋 Action: Remove all configurations before 2026');
      removePre2026Configurations();
      break;
      
    case 'add-2026':
      console.log('📋 Action: Add 2026+ configurations');
      add2026PlusConfigurations();
      break;
      
    case 'full-reset':
      console.log('📋 Action: Full reset (remove pre-2026, add 2026+)');
      removePre2026Configurations();
      add2026PlusConfigurations();
      break;
      
    case 'help':
    default:
      console.log(`
📖 User Year Management Script

Usage: node manage_user_years.js [action]

Actions:
  remove-pre-2026  Remove all user configurations before 2026
  add-2026         Add configurations for 2026 and subsequent years
  full-reset       Remove pre-2026 configs and add 2026+ configs
  help             Show this help message

Examples:
  node manage_user_years.js remove-pre-2026
  node manage_user_years.js add-2026
  node manage_user_years.js full-reset
      `);
      break;
  }
  
  console.log('✅ User year management completed');
}

main().catch(console.error);
