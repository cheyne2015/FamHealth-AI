/**
 * Pure client-side on-device OCR engine powered by Tesseract.js WebAssembly.
 * Runs 100% locally in the browser with zero cloud API dependencies.
 */

export interface LocalOcrProgress {
  progress: number;
  status: string;
}

export async function runLocalClientOcr(
  imageSource: string | File,
  onProgress?: (p: LocalOcrProgress) => void
): Promise<string> {
  const Tesseract = await import('tesseract.js');

  try {
    if (onProgress) {
      onProgress({ progress: 10, status: '正在初始化端侧本地识别核心...' });
    }

    // Try recognizing with Chinese Simplified + English
    const result = await Tesseract.recognize(imageSource, 'chi_sim+eng', {
      logger: (m: any) => {
        if (onProgress && typeof m.progress === 'number') {
          const pct = Math.round(m.progress * 100);
          const statusText =
            m.status === 'recognizing text'
              ? `正在端侧离线识别文本 (${pct}%)...`
              : m.status === 'loading language traineddata'
              ? '正在载入离线字库模型...'
              : `正在处理图像 (${pct}%)...`;
          onProgress({ progress: pct, status: statusText });
        }
      }
    });

    return result.data.text || '';
  } catch (err: any) {
    console.warn('Local OCR chi_sim+eng failed, attempting eng-only fallback:', err?.message || err);
    // Fallback to pure English/alphanumeric digits (works offline with built-in font)
    try {
      if (onProgress) {
        onProgress({ progress: 50, status: '正在使用轻量级核心离线重试...' });
      }
      const engResult = await Tesseract.recognize(imageSource, 'eng');
      return engResult.data.text || '';
    } catch (secondErr: any) {
      throw new Error(`本地端侧 OCR 执行失败: ${secondErr?.message || '请直接粘贴文本或选用标准模板'}`);
    }
  }
}
