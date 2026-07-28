/**
 * Resizes and compresses a Base64 image string to fit within specified maximum dimensions and quality.
 * Prevents Firestore document size limit errors (1MB max limit).
 */
export async function compressBase64Image(
  base64Str: string,
  maxWidth = 250,
  maxHeight = 250,
  quality = 0.85
): Promise<string> {
  if (!base64Str || !base64Str.startsWith('data:image')) {
    return base64Str;
  }

  // If already under 150KB (150,000 chars), no heavy compression needed
  if (base64Str.length < 150000) {
    return base64Str;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64Str.substring(0, 100000)); // fallback safety
        return;
      }

      // Draw with smooth scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Export as PNG if transparent or JPEG
      const isPng = base64Str.startsWith('data:image/png');
      const compressedDataUrl = canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', quality);

      // If compressed version is smaller, return it
      if (compressedDataUrl.length < base64Str.length) {
        resolve(compressedDataUrl);
      } else {
        resolve(base64Str);
      }
    };

    img.onerror = () => {
      // If error loading image, resolve original or empty if corrupted
      resolve(base64Str.length > 500000 ? '' : base64Str);
    };

    img.src = base64Str;
  });
}
