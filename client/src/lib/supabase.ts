import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';

// Bucket name used consistently throughout the app
export const STORAGE_BUCKET = 'sulongedukasyon-media';

// Create a single supabase client for interacting with your database
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials not found in environment variables.');
}

export const supabase = createClient(
  supabaseUrl || 'https://oxduspzcojliofwnofeb.supabase.co',
  supabaseKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94ZHVzcHpjb2psaW9md25vZmViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNDA2MDAsImV4cCI6MjA2MDcxNjYwMH0.uOGRPw2Ooqnqj0KYp4r3obhs82Eu_MY_6SNKZSSsjMQ'
);

/**
 * Upload an image to Supabase Storage with a fallback strategy
 * @param file File to upload
 * @param path Storage path (e.g. 'game-images')
 * @returns URL of the uploaded file or a fallback URL
 */
export async function uploadFile(file: File, path: string = 'game-images'): Promise<string> {
  try {
    // Generate unique identifier for consistent fallback
    const uniqueId = nanoid();
    const sanitizedName = file.name.replace(/\s+/g, '_').toLowerCase();
    const fileName = `${path}/${uniqueId}_${sanitizedName}`;
    
    // Try direct upload to Supabase
    try {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(fileName, file);
      
      if (error) {
        console.warn('Supabase storage upload failed, using fallback URL:', error);
      } else {
        const { data: urlData } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(fileName);
        
        console.log('Image uploaded to Supabase Storage:', urlData.publicUrl);
        return urlData.publicUrl;
      }
    } catch (supabaseError) {
      console.warn('Supabase storage upload error, using fallback URL:', supabaseError);
    }
    
    // If we reach here, Supabase upload failed - convert to base64 and upload via API
    console.log('Uploading via server API as fallback...');
    const base64Data = await fileToDataUrl(file);
    
    // Call the server API endpoint to handle the upload
    try {
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          image: base64Data,
          folder: path
        })
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed with status: ${response.status}`);
      }
      
      const result = await response.json();
      if (result.url) {
        console.log('Upload via server API successful:', result.url);
        return result.url;
      }
    } catch (apiError) {
      console.error('API upload failed:', apiError);
    }
    
    // Final fallback - use a placeholder image service
    const fallbackUrl = `https://picsum.photos/seed/${uniqueId}/800/600`;
    console.log('Using placeholder image as final fallback:', fallbackUrl);
    return fallbackUrl;
  } catch (error) {
    console.error('Error in uploadFile:', error);
    // Return a generic placeholder as absolute fallback
    return 'https://placehold.co/600x400?text=Image+Not+Available';
  }
}

/**
 * Convert a file to a base64 data URL
 * @param file File to convert
 * @returns Promise with base64 data URL
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Delete a file from storage
 * @param fileUrl URL of the file to delete
 */
export async function deleteFile(fileUrl: string): Promise<boolean> {
  // For placeholder URLs, no deletion needed
  if (fileUrl.includes('picsum.photos') || fileUrl.includes('placehold.co')) {
    return true;
  }
  
  try {
    // Delete via server API
    const response = await fetch('/api/delete-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: fileUrl })
    });
    
    if (!response.ok) {
      console.warn(`Delete request failed with status ${response.status}`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
}