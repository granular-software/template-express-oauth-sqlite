#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDatabase() {
  try {
    console.log('🔧 Initializing SQLite database...');
    
    // Create data directory if it doesn't exist
    const dataDir = path.join(__dirname, '..', 'data');
    await fs.mkdir(dataDir, { recursive: true });
    
    // The database will be created automatically when the SQLiteStorage is initialized
    console.log('✅ Database initialization completed');
    console.log('📁 Database file location: data/oauth.db');
    
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  }
}

initDatabase(); 