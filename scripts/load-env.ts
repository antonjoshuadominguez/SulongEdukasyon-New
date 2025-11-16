import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Helper function to load environment variables from .env file
 * This is used before any database operations to ensure environment variables are loaded
 */
export function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  
  if (fs.existsSync(envPath)) {
    console.log('Loading environment variables from .env file');
    dotenv.config();
  } else {
    console.warn('No .env file found. Make sure your DATABASE_URL is set properly.');
  }
  
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is not set.');
    console.error('Please create a .env file with the Supabase connection string:');
    console.error('DATABASE_URL=postgresql://postgres.oxduspzcojliofwnofeb:sulongedukasyon123@aws-0-us-east-2.pooler.supabase.com:5432/postgres');
    
    // Set a default for development if not exists
    process.env.DATABASE_URL = "postgresql://postgres.oxduspzcojliofwnofeb:sulongedukasyon123@aws-0-us-east-2.pooler.supabase.com:5432/postgres";
    console.info('Setting default Supabase connection for development');
  }
  
  // Set Supabase API details if needed
  if (!process.env.VITE_SUPABASE_URL) {
    process.env.VITE_SUPABASE_URL = "https://oxduspzcojliofwnofeb.supabase.co";
  }
  
  if (!process.env.VITE_SUPABASE_KEY) {
    process.env.VITE_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94ZHVzcHpjb2psaW9md25vZmViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNDA2MDAsImV4cCI6MjA2MDcxNjYwMH0.uOGRPw2Ooqnqj0KYp4r3obhs82Eu_MY_6SNKZSSsjMQ";
  }
  
  // Log a sanitized version of the connection string for debugging (hiding password)
  const dbUrl = process.env.DATABASE_URL;
  const sanitizedUrl = dbUrl.replace(/:\/\/postgres:([^@]*)@/, '://postgres:***@');
  console.log(`Using database: ${sanitizedUrl}`);
}

// If this file is executed directly, run the loadEnv function
if (require.main === module) {
  loadEnv();
}

export default loadEnv;