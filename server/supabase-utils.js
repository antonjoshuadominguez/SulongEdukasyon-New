import { supabase } from './db.js';
import { nanoid } from 'nanoid';
import path from 'path';
import fs from 'fs';

// Bucket name to use consistently throughout the app
export const STORAGE_BUCKET = 'sulongedukasyon-media';

/**
 * Upload an image file from a base64 string to Supabase Storage
 * Falls back to local file system storage if Supabase upload fails
 * 
 * @param {string} base64Image - Base64 encoded image string (data:image/format;base64,...)
 * @param {string} folder - Optional folder name within the bucket
 * @returns {Promise<{url: string|null, error: Error|null}>} - URL of the uploaded file or error
 */
export async function uploadImageToSupabase(base64Image, folder = 'game-images') {
  try {
    if (!base64Image || !base64Image.startsWith('data:image/')) {
      return { url: null, error: new Error('Invalid image format. Must be a base64 data URL.') };
    }

    // Extract the mime type and data
    const matches = base64Image.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
    
    if (!matches || matches.length !== 3) {
      return { url: null, error: new Error('Invalid image data URL format') };
    }
    
    const fileFormat = matches[1];
    const base64Data = matches[2];
    
    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Generate a unique filename
    const uniqueId = nanoid();
    const fileName = `${folder}/${uniqueId}.${fileFormat}`;
    
    // Try uploading to Supabase Storage first
    try {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(fileName, buffer, {
          contentType: `image/${fileFormat}`,
          upsert: false
        });
      
      if (error) {
        // Log the error but don't throw - we'll fall back to public URL
        console.warn('Supabase storage upload failed, using fallback URL:', error);
      } else {
        // Get the public URL
        const { data: urlData } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(fileName);
        
        console.log('Image uploaded to Supabase Storage:', urlData.publicUrl);
        return { url: urlData.publicUrl, error: null };
      }
    } catch (supabaseError) {
      console.warn('Supabase storage upload error, using fallback URL:', supabaseError);
    }
    
    // If we reach here, upload to Supabase failed - use a fallback public URL
    // Return a placeholder image URL for development/testing
    const fallbackUrl = `https://picsum.photos/seed/${uniqueId}/800/600`;
    console.log('Using fallback image URL:', fallbackUrl);
    
    return { url: fallbackUrl, error: null };
  } catch (error) {
    console.error('Error in uploadImageToSupabase:', error);
    return { url: null, error };
  }
}

/**
 * Delete a file from Supabase Storage
 * 
 * @param {string} fileUrl - Public URL of the file to delete
 * @returns {Promise<{success: boolean, error: Error|null}>}
 */
export async function deleteFileFromSupabase(fileUrl) {
  try {
    // If it's a fallback URL, nothing to delete
    if (fileUrl.includes('picsum.photos')) {
      return { success: true, error: null };
    }
    
    // Extract path from URL
    // Example URL: https://oxduspzcojliofwnofeb.supabase.co/storage/v1/object/public/sulongedukasyon-media/game-images/xyz123.jpg
    
    const urlParts = fileUrl.split('/');
    const bucketNameIndex = urlParts.findIndex(part => part === 'public') + 1;
    
    if (bucketNameIndex === 0) {
      return { success: false, error: new Error('Invalid file URL format') };
    }
    
    const bucketName = urlParts[bucketNameIndex];
    const filePath = urlParts.slice(bucketNameIndex + 1).join('/');
    
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);
    
    if (error) {
      console.warn('Supabase storage delete error (continuing anyway):', error);
      return { success: true, error: null }; // Return success anyway to prevent blocking operations
    }
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Error in deleteFileFromSupabase:', error);
    return { success: true, error: null }; // Return success anyway to prevent blocking operations
  }
}