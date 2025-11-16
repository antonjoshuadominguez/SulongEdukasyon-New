import { loadEnv } from './load-env.js';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
loadEnv();

const { Pool } = pg;

async function main() {
  console.log('Setting up the database...');

  // Create a database connection
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Ensuring database tables are created...');

    // Create the enum types first
    const enumTypes = [
      {
        name: 'user_role',
        values: ['teacher', 'student']
      },
      {
        name: 'game_type',
        values: [
          'picture_puzzle', 
          'picture_matching', 
          'arrange_timeline', 
          'explain_image', 
          'fill_blanks', 
          'tama_ang_ayos', 
          'true_or_false'
        ]
      },
      {
        name: 'lobby_status',
        values: ['active', 'completed']
      },
      {
        name: 'game_topic',
        values: [
          'philippine_presidents', 
          'spanish_colonial_period', 
          'american_colonial_period', 
          'japanese_occupation',
          'martial_law_era',
          'post_war_period'
        ]
      }
    ];

    for (const enumType of enumTypes) {
      try {
        // First check if enum type exists
        const enumExists = await pool.query(`
          SELECT 1 FROM pg_type 
          WHERE typname = $1
        `, [enumType.name]);

        if (enumExists.rowCount === 0) {
          console.log(`Creating enum type: ${enumType.name}`);
          const createEnumQuery = `
            CREATE TYPE "${enumType.name}" AS ENUM (${enumType.values.map(v => `'${v}'`).join(', ')});
          `;
          await pool.query(createEnumQuery);
        } else {
          console.log(`Enum type ${enumType.name} already exists.`);
        }
      } catch (error) {
        console.error(`Error creating enum type ${enumType.name}:`, error);
      }
    }

    // Create the tables using direct SQL - more controlled than drizzle push
    const createTablesSQL = `
    -- Create users table
    CREATE TABLE IF NOT EXISTS "users" (
      "id" SERIAL PRIMARY KEY,
      "username" TEXT NOT NULL,
      "password" TEXT NOT NULL,
      "role" user_role NOT NULL,
      "full_name" TEXT NOT NULL,
      "class" TEXT
    );

    -- Create game_lobbies table
    CREATE TABLE IF NOT EXISTS "game_lobbies" (
      "id" SERIAL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "lobby_code" TEXT NOT NULL,
      "game_type" game_type NOT NULL,
      "game_topic" game_topic,
      "teacher_id" INTEGER NOT NULL REFERENCES "users"("id"),
      "status" lobby_status NOT NULL DEFAULT 'active',
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "class" TEXT,
      "custom_image_url" TEXT,
      "custom_image_description" TEXT,
      "custom_questions" TEXT,
      "custom_explain_image_url" TEXT,
      "custom_explain_questions" TEXT,
      "custom_events" TEXT,
      "custom_sentences" TEXT,
      "custom_categories" TEXT,
      "custom_items" TEXT
    );

    -- Create lobby_participants table
    CREATE TABLE IF NOT EXISTS "lobby_participants" (
      "id" SERIAL PRIMARY KEY,
      "lobby_id" INTEGER NOT NULL REFERENCES "game_lobbies"("id"),
      "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
      "joined_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "is_ready" BOOLEAN DEFAULT FALSE
    );

    -- Create game_scores table
    CREATE TABLE IF NOT EXISTS "game_scores" (
      "id" SERIAL PRIMARY KEY,
      "lobby_id" INTEGER NOT NULL REFERENCES "game_lobbies"("id"),
      "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
      "score" INTEGER NOT NULL,
      "completion_time" INTEGER,
      "completed_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- Create game_images table
    CREATE TABLE IF NOT EXISTS "game_images" (
      "id" SERIAL PRIMARY KEY,
      "title" TEXT NOT NULL,
      "image_url" TEXT NOT NULL,
      "description" TEXT NOT NULL
    );

    -- Create sessions table for connect-pg-simple
    CREATE TABLE IF NOT EXISTS "sessions" (
      "sid" VARCHAR NOT NULL COLLATE "default" PRIMARY KEY,
      "sess" JSON NOT NULL,
      "expire" TIMESTAMP(6) NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS "IDX_sessions_expire" ON "sessions" ("expire");
    `;

    await pool.query(createTablesSQL);
    console.log('Database tables created or already exist.');

    // Try to add unique constraints if they don't exist
    try {
      // Check if unique constraint on username exists
      const usernameConstraintExists = await pool.query(`
        SELECT 1 FROM pg_constraint
        WHERE conname = 'users_username_unique'
      `);

      if (usernameConstraintExists.rowCount === 0) {
        console.log('Adding unique constraint to users.username...');
        // Get all usernames and handle duplicates before adding constraint
        const usernames = await pool.query('SELECT id, username FROM users ORDER BY id');
        
        // Track unique usernames to handle duplicates
        const seenUsernames = new Set();
        const duplicates = [];
        
        for (const row of usernames.rows) {
          if (seenUsernames.has(row.username)) {
            duplicates.push(row);
          } else {
            seenUsernames.add(row.username);
          }
        }
        
        // Handle duplicates by appending a unique suffix
        for (const dup of duplicates) {
          const newUsername = `${dup.username}_${dup.id}`;
          await pool.query('UPDATE users SET username = $1 WHERE id = $2', [newUsername, dup.id]);
          console.log(`Updated duplicate username: ${dup.username} -> ${newUsername} for ID ${dup.id}`);
        }
        
        // Now add the unique constraint
        await pool.query('ALTER TABLE users ADD CONSTRAINT users_username_unique UNIQUE (username)');
        console.log('Added unique constraint to users.username');
      } else {
        console.log('Unique constraint on users.username already exists.');
      }
      
      // Check if unique constraint on lobby_code exists
      const lobbyCodeConstraintExists = await pool.query(`
        SELECT 1 FROM pg_constraint
        WHERE conname = 'game_lobbies_lobby_code_unique'
      `);
      
      if (lobbyCodeConstraintExists.rowCount === 0) {
        console.log('Adding unique constraint to game_lobbies.lobby_code...');
        // Handle duplicates using the same approach
        const lobbyCodes = await pool.query('SELECT id, lobby_code FROM game_lobbies ORDER BY id');
        
        const seenLobbyCodes = new Set();
        const duplicates = [];
        
        for (const row of lobbyCodes.rows) {
          if (seenLobbyCodes.has(row.lobby_code)) {
            duplicates.push(row);
          } else {
            seenLobbyCodes.add(row.lobby_code);
          }
        }
        
        for (const dup of duplicates) {
          const newLobbyCode = `${dup.lobby_code}_${dup.id}`;
          await pool.query('UPDATE game_lobbies SET lobby_code = $1 WHERE id = $2', [newLobbyCode, dup.id]);
          console.log(`Updated duplicate lobby_code: ${dup.lobby_code} -> ${newLobbyCode} for ID ${dup.id}`);
        }
        
        await pool.query('ALTER TABLE game_lobbies ADD CONSTRAINT game_lobbies_lobby_code_unique UNIQUE (lobby_code)');
        console.log('Added unique constraint to game_lobbies.lobby_code');
      } else {
        console.log('Unique constraint on game_lobbies.lobby_code already exists.');
      }
    } catch (error) {
      console.error('Error adding unique constraints:', error);
    }
    
    console.log('Database setup completed successfully.');
  } catch (error) {
    console.error('Error setting up database:', error);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);