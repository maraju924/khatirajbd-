/**
 * 100% Free Multi-Mode Product Image Uploader Engine
 * Supports:
 * 1. Built-in Smart Device Upload with HTML5 Canvas WebP/JPEG compression (< 90KB)
 *    so images save directly to Firestore without requiring Firebase Storage Blaze billing.
 * 2. Free ImgBB Cloud API upload (https://api.imgbb.com)
 * 3. Free Cloudinary Unsigned Preset upload
 */

export interface CompressedImageResult {
  dataUrl: string;
  width: number;
  height: number;
  sizeKb: number;
}

export async function compressImageFileToWebP(
  file: File,
  maxWidth = 800,
  maxHeight = 600,
  quality = 0.78
): Promise<CompressedImageResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('ফাইলটি পড়া যায়নি (Failed to read image file)'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('ছবিটি লোড করা যায়নি (Invalid image format)'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }

        // Fill clean off-white studio backdrop for transparent PNGs
        ctx.fillStyle = '#FAF9F6';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        let dataUrl = canvas.toDataURL('image/webp', quality);
        if (!dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        // Ensure it stays strictly within Firestore blueprint maxLength (250,000 chars)
        if (dataUrl.length > 220000) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.55);
        }

        const sizeKb = Math.round((dataUrl.length * 3) / 4 / 1024);
        resolve({ dataUrl, width, height, sizeKb });
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export async function uploadToImgBB(file: File, apiKey: string): Promise<string> {
  const formData = new FormData();
  formData.append('image', file);
  const response = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(apiKey.trim())}`, {
    method: 'POST',
    body: formData,
  });
  const json = await response.json();
  if (!response.ok || !json?.data?.url) {
    throw new Error(json?.error?.message || 'ImgBB আপলোড ব্যর্থ হয়েছে (Check API Key)');
  }
  return String(json.data.url);
}

export async function uploadToCloudinaryUnsigned(
  file: File,
  cloudName: string,
  uploadPreset: string
): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset.trim());

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName.trim())}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );
  const json = await response.json();
  if (!response.ok || !json?.secure_url) {
    throw new Error(json?.error?.message || 'Cloudinary আপলোড ব্যর্থ হয়েছে');
  }
  return String(json.secure_url);
}
