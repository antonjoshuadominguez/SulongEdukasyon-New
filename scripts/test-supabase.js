import { loadEnv } from './load-env.js';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
loadEnv();

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_KEY
);

async function testConnection() {
  console.log('Testing Supabase connection...');
  
  try {
    // Test storage access which doesn't depend on database schema
    console.log('Testing Supabase Storage access...');
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.error('Error accessing Supabase Storage:', bucketError);
      return false;
    }
    
    console.log('Successfully connected to Supabase Storage API!');
    
    if (buckets && buckets.length > 0) {
      console.log('Storage buckets available:', buckets.map(b => b.name).join(', '));
      
      // Create a standard bucket for our app if it doesn't exist
      if (!buckets.find(b => b.name === 'sulongedukasyon-media')) {
        console.log('Creating required bucket: sulongedukasyon-media');
        const { data: newBucket, error: createError } = await supabase.storage.createBucket('sulongedukasyon-media', { 
          public: true 
        });
        
        if (createError) {
          console.error('Error creating bucket:', createError);
        } else {
          console.log('Successfully created application bucket');
        }
      }
      
      // Try to list files in the app bucket
      console.log('Checking files in application bucket...');
      const { data: files, error: filesError } = await supabase.storage
        .from('sulongedukasyon-media')
        .list('game-images');
        
      if (filesError) {
        console.error('Error listing files:', filesError);
      } else {
        console.log('Files in game-images folder:', files?.length ? files.map(f => f.name).join(', ') : 'No files');
      }
    } else {
      console.log('No storage buckets available. Creating application bucket...');
      
      // Create the application bucket
      const { data: newBucket, error: createError } = await supabase.storage.createBucket('sulongedukasyon-media', { 
        public: true 
      });
      
      if (createError) {
        console.error('Error creating bucket:', createError);
      } else {
        console.log('Successfully created application bucket');
      }
    }
    
    return true;
  } catch (err) {
    console.error('Unexpected error during Supabase connection test:', err);
    return false;
  }
}

// Run the test
testConnection()
  .then(success => {
    if (!success) {
      console.error('Supabase connection test failed.');
      process.exit(1);
    }
    console.log('All Supabase tests passed successfully!');
  })
  .catch(err => {
    console.error('Error running tests:', err);
    process.exit(1);
  });