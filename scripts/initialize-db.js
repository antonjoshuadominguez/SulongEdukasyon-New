import { loadEnv } from './load-env.js';
import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;

// Load environment variables
loadEnv();

async function initializeDatabase() {
  console.log('Initializing database...');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connected to database, checking for existing tables...');
    
    // Create the sessions table (for connect-pg-simple session storage)
    const sessionsTableQuery = `
      CREATE TABLE IF NOT EXISTS "sessions" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "sessions_pkey" PRIMARY KEY ("sid")
      );
      CREATE INDEX IF NOT EXISTS "IDX_sessions_expire" ON "sessions" ("expire");
    `;
    
    await pool.query(sessionsTableQuery);
    console.log('Sessions table created or verified.');
    
    console.log('Database initialization completed successfully.');
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    await pool.end();
  }
}

// Run the initialization
initializeDatabase().catch(console.error);