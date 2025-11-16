import { loadEnv } from './load-env.js';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
loadEnv();

const { Pool } = pg;

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function main() {
  console.log('Seeding the database with initial data...');

  // Create a database connection
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Check if users already exist to avoid duplicates
    const usersExist = await pool.query('SELECT COUNT(*) FROM users');
    
    if (parseInt(usersExist.rows[0].count) === 0) {
      console.log('Adding default users...');
      
      // Create a teacher account
      const teacherPassword = await hashPassword('teacher123');
      await pool.query(
        'INSERT INTO users (username, password, role, full_name, class) VALUES ($1, $2, $3, $4, $5)',
        ['teacher', teacherPassword, 'teacher', 'Teacher Demo', 'All Classes']
      );
      
      // Create a student account
      const studentPassword = await hashPassword('student123');
      await pool.query(
        'INSERT INTO users (username, password, role, full_name, class) VALUES ($1, $2, $3, $4, $5)',
        ['student', studentPassword, 'student', 'Student Demo', 'Grade 7']
      );
      
      console.log('Created default teacher and student accounts');
    } else {
      console.log('Users already exist, skipping user creation');
    }
    
    // Check if images already exist
    const imagesExist = await pool.query('SELECT COUNT(*) FROM game_images');
    
    if (parseInt(imagesExist.rows[0].count) === 0) {
      console.log('Adding sample game images...');
      
      const sampleImages = [
        {
          title: "Rizal Monument",
          imageUrl: "https://upload.wikimedia.org/wikipedia/commons/b/b4/Rizal_Monument_in_Luneta_-_panoramio.jpg",
          description: "The Rizal Monument is a memorial in Rizal Park, Manila, to commemorate the Filipino nationalist and hero José Rizal."
        },
        {
          title: "EDSA Revolution",
          imageUrl: "https://upload.wikimedia.org/wikipedia/commons/1/18/Edsa_revolution_25_anniversary.jpg",
          description: "The People Power Revolution was a series of popular demonstrations in the Philippines, mostly in Metro Manila, from February 22-25, 1986."
        },
        {
          title: "Aguinaldo Shrine",
          imageUrl: "https://upload.wikimedia.org/wikipedia/commons/b/b3/Aguinaldo_Shrine_front_view.jpg",
          description: "The Aguinaldo Shrine is where Philippine independence was declared on June 12, 1898."
        },
        {
          title: "Ferdinand Marcos",
          imageUrl: "https://upload.wikimedia.org/wikipedia/commons/9/9b/Ferdinand_Marcos_portrait.jpg",
          description: "Ferdinand Emmanuel Edralin Marcos Sr. was a Filipino politician, lawyer, and kleptocrat who served as the 10th president of the Philippines from 1965 to 1986."
        }
      ];
      
      for (const image of sampleImages) {
        await pool.query(
          'INSERT INTO game_images (title, image_url, description) VALUES ($1, $2, $3)',
          [image.title, image.imageUrl, image.description]
        );
      }
      
      console.log('Added sample game images');
    } else {
      console.log('Images already exist, skipping image creation');
    }
    
    console.log('Database seeding completed successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);