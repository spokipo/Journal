import { supabase, isSupabaseConfigured } from './supabase';
import { optimizeImage } from './imageOptimizer';

/**
 * Uploads an image to Supabase Storage 'system-images' bucket with client-side WebP compression.
 * Returns the public URL of the uploaded image.
 */
export async function uploadSystemImage(
  file: File | Blob,
  userId?: string
): Promise<string> {
  // 1. Client-side compression to WebP (maxWidth: 1920px, quality: 0.82)
  const compressedBlob = await optimizeImage(file, 1920, 0.82);

  const uid = userId || 'anonymous';
  const randomKey = Math.random().toString(36).substring(2, 9);
  const filePath = `${uid}/${Date.now()}-${randomKey}.webp`;

  if (isSupabaseConfigured) {
    try {
      const { error: uploadErr } = await supabase.storage
        .from('system-images')
        .upload(filePath, compressedBlob, {
          contentType: 'image/webp',
          upsert: false,
        });

      if (!uploadErr) {
        const { data: { publicUrl } } = supabase.storage
          .from('system-images')
          .getPublicUrl(filePath);
        if (publicUrl) {
          return publicUrl;
        }
      } else {
        console.warn('Supabase storage upload error in system-images bucket:', uploadErr);
      }
    } catch (err) {
      console.warn('Failed to upload to Supabase storage, using fallback:', err);
    }
  }

  // Fallback to data URL for offline or unconfigured environments
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(compressedBlob);
  });
}

