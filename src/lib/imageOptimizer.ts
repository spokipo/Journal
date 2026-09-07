/**
 * Client-side image compression and format conversion utility.
 * Rescales large screenshots (TradingView, desktop captures) down to a max width (default 1920px)
 * and converts to lightweight image/webp format, reducing 5-10MB files down to 150-300KB.
 */
export async function optimizeImage(
  file: File | Blob,
  maxWidth = 1920,
  quality = 0.82
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Create an object URL for the image file
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      // Clean up object URL after loading
      URL.revokeObjectURL(objectUrl);

      let targetWidth = img.naturalWidth || img.width;
      let targetHeight = img.naturalHeight || img.height;

      // Calculate proportional scale if width exceeds maxWidth
      if (targetWidth > maxWidth) {
        const ratio = maxWidth / targetWidth;
        targetWidth = maxWidth;
        targetHeight = Math.round(targetHeight * ratio);
      }

      // Create an offscreen HTML5 canvas
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get 2D canvas context'));
        return;
      }

      // High quality image rendering settings
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Draw the resized image onto the canvas
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      // Convert canvas content to compressed WebP blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            // Fallback to original file or JPEG blob if WebP is unsupported
            canvas.toBlob(
              (fallbackBlob) => {
                if (fallbackBlob) {
                  resolve(fallbackBlob);
                } else {
                  reject(new Error('Canvas image conversion failed'));
                }
              },
              'image/jpeg',
              quality
            );
          }
        },
        'image/webp',
        quality
      );
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for optimization: ' + err));
    };

    img.src = objectUrl;
  });
}

