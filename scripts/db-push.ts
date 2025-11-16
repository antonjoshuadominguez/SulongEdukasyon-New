// This is a simple script to create the database tables using raw SQL
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { loadEnv } from './load-env';

async function main() {
  // Load environment variables from .env file
  loadEnv();
  
  // Create a PostgreSQL client with SSL support for Supabase
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    // For Supabase connection - reject unauthorized SSL connections when in production
    ssl: process.env.DATABASE_URL?.includes('supabase') 
      ? { rejectUnauthorized: false } 
      : false,
  });

  console.log("Creating database tables...");
  
  try {
    await client.connect();
    console.log("Connected to database");

    // Create enums
    console.log("Creating enums...");
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
          CREATE TYPE user_role AS ENUM ('teacher', 'student');
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'game_type') THEN
          CREATE TYPE game_type AS ENUM ('picture_puzzle', 'picture_matching', 'arrange_timeline', 'explain_image', 'fill_blanks', 'tama_ang_ayos', 'true_or_false');
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lobby_status') THEN
          CREATE TYPE lobby_status AS ENUM ('active', 'completed');
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'game_topic') THEN
          CREATE TYPE game_topic AS ENUM (
            'philippine_presidents', 
            'spanish_colonial_period', 
            'american_colonial_period', 
            'japanese_occupation',
            'martial_law_era',
            'post_war_period'
          );
        END IF;
      END $$;
    `);

    // Create users table
    console.log("Creating users table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role user_role NOT NULL,
        full_name TEXT NOT NULL,
        class TEXT
      );
    `);

    // Create game_lobbies table
    console.log("Creating game_lobbies table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS game_lobbies (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        lobby_code TEXT NOT NULL UNIQUE,
        game_type game_type NOT NULL,
        game_topic game_topic,
        teacher_id INTEGER NOT NULL REFERENCES users(id),
        status lobby_status NOT NULL DEFAULT 'active',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        class TEXT,
        custom_image_url TEXT,
        custom_image_description TEXT,
        custom_questions TEXT,
        custom_explain_image_url TEXT,
        custom_explain_questions TEXT,
        custom_events TEXT,
        custom_sentences TEXT,
        custom_categories TEXT,
        custom_items TEXT
      );
    `);

    // Create lobby_participants table
    console.log("Creating lobby_participants table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS lobby_participants (
        id SERIAL PRIMARY KEY,
        lobby_id INTEGER NOT NULL REFERENCES game_lobbies(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
        is_ready BOOLEAN DEFAULT FALSE
      );
    `);

    // Create game_scores table
    console.log("Creating game_scores table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS game_scores (
        id SERIAL PRIMARY KEY,
        lobby_id INTEGER NOT NULL REFERENCES game_lobbies(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        score INTEGER NOT NULL,
        completion_time INTEGER,
        completed_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Create game_images table
    console.log("Creating game_images table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS game_images (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        image_url TEXT NOT NULL,
        description TEXT NOT NULL
      );
    `);

    // No drawing-related tables needed for the current games

    // Create sessions table for connect-pg-simple
    console.log("Creating sessions table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
      );
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
    `);

    console.log("Successfully created all database tables!");
  } catch (error) {
    console.error("Error creating database tables:", error);
  } finally {
    await client.end();
  }
}

main();