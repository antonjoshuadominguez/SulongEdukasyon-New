import { loadEnv } from './load-env.js';
import pg from 'pg';

// Load environment variables
loadEnv();

const { Pool } = pg;

async function main() {
  console.log('Checking database status and tables...');

  // Create a database connection
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Check basic connection
    console.log('Checking database connection...');
    const dbVersion = await pool.query('SELECT version()');
    console.log('Connected to PostgreSQL:', dbVersion.rows[0].version);
    
    // List all tables in the public schema
    console.log('\nFetching database tables...');
    const tableQuery = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    if (tableQuery.rowCount === 0) {
      console.log('No tables found in public schema');
    } else {
      console.log('Tables in database:');
      tableQuery.rows.forEach((row, i) => {
        console.log(`  ${i+1}. ${row.table_name}`);
      });
    }
    
    // Check the users table and count rows
    console.log('\nChecking essential tables...');
    const tables = ['users', 'game_lobbies', 'lobby_participants', 'game_scores', 'game_images', 'sessions'];
    
    for (const table of tables) {
      try {
        const countQuery = await pool.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`Table '${table}': ${countQuery.rows[0].count} rows`);
        
        // Sample first row if available
        if (parseInt(countQuery.rows[0].count) > 0) {
          const sampleQuery = await pool.query(`SELECT * FROM ${table} LIMIT 1`);
          console.log(`  Sample data: ${JSON.stringify(sampleQuery.rows[0]).substring(0, 100)}...`);
        }
      } catch (error) {
        console.error(`Error checking table '${table}':`, error.message);
      }
    }
    
    console.log('\nDatabase check completed');
  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);