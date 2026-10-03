/**
 * High-performance clinical report image compression and cloud-optimization utility.
 * Optimizes medical inspection sheets, laboratory test photos, and ultrasound scans
 * to ensure crystal-clear text readability while strictly keeping document payload
 * under Firestore's 1MB limit (typically targets 150KB - 480KB).
 */

export interface CompressionResult {
  dataUrl: string;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  originalSizeFormatted: string;
  compressedSizeFormatted: string;
  width: number;
  height: number;
  reductionPercentage: number;
  safeForCloud: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Calculates byte size of a Base64 data URL string
 */
export function getBase64SizeBytes(dataUrl: string): number {
  const base64Str = dataUrl.split(',')[1] || '';
  return Math.round((base64Str.length * 3) / 4);
}

/**
 * Compress an image File or Data URL for Firestore Cloud storage.
 * @param input File object or existing data:image string
 * @param maxDimension Maximum width or height (default 1600px, optimal for A4 reports)
 * @param targetMaxBytes Strict cap in bytes (default 500KB = 512,000 bytes)
 */
export async function compressReportImageForCloud(
  input: File | string,
  maxDimension = 1600,
  targetMaxBytes = 500 * 1024
): Promise<CompressionResult> {
  return new Promise((resolve, reject) => {
    let originalSizeBytes = 0;

    const img = document.createElement('img');
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // 1. Maintain aspect ratio while capping max dimension to 1600px
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (!ctx) {
          throw new Error('Canvas 2D context not available for compression');
        }

        // Fill white background (handles transparent PNGs becoming black when converted to JPEG)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        // Draw downscaled crisp image
        ctx.drawImage(img, 0, 0, width, height);

        // 2. Iteratively adjust quality until under targetMaxBytes
        const qualitySteps = [0.85, 0.75, 0.65, 0.52, 0.40];
        let bestDataUrl = '';
        let bestSize = Infinity;

        // Try modern WebP first if supported, fallback to JPEG
        const mimeTypes = ['image/webp', 'image/jpeg'];

        for (const mimeType of mimeTypes) {
          for (const quality of qualitySteps) {
            const dataUrl = canvas.toDataURL(mimeType, quality);
            const size = getBase64SizeBytes(dataUrl);

            if (size < targetMaxBytes) {
              bestDataUrl = dataUrl;
              bestSize = size;
              break;
            } else if (size < bestSize) {
              bestDataUrl = dataUrl;
              bestSize = size;
            }
          }
          if (bestSize < targetMaxBytes) break;
        }

        // If still somehow over target, downscale canvas dimensions further by 25%
        if (bestSize > targetMaxBytes && (width > 800 || height > 800)) {
          const secondCanvas = document.createElement('canvas');
          secondCanvas.width = Math.round(width * 0.75);
          secondCanvas.height = Math.round(height * 0.75);
          const secondCtx = secondCanvas.getContext('2d');
          if (secondCtx) {
            secondCtx.fillStyle = '#ffffff';
            secondCtx.fillRect(0, 0, secondCanvas.width, secondCanvas.height);
            secondCtx.drawImage(canvas, 0, 0, secondCanvas.width, secondCanvas.height);
            bestDataUrl = secondCanvas.toDataURL('image/jpeg', 0.68);
            bestSize = getBase64SizeBytes(bestDataUrl);
          }
        }

        const reduction = originalSizeBytes > 0 
          ? Math.max(0, Math.round(((originalSizeBytes - bestSize) / originalSizeBytes) * 100))
          : 0;

        resolve({
          dataUrl: bestDataUrl,
          originalSizeBytes,
          compressedSizeBytes: bestSize,
          originalSizeFormatted: formatBytes(originalSizeBytes),
          compressedSizeFormatted: formatBytes(bestSize),
          width,
          height,
          reductionPercentage: reduction,
          safeForCloud: bestSize <= targetMaxBytes
        });
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      reject(new Error('无法读取或解码图像文件'));
    };

    // Load image from File or string
    if (typeof input === 'string') {
      originalSizeBytes = getBase64SizeBytes(input);
      img.src = input;
    } else {
      originalSizeBytes = input.size;
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('读取文件失败'));
      reader.readAsDataURL(input);
    }
  });
}
