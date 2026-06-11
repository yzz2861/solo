import Tesseract from 'tesseract.js';

export function createOCRService() {
  let worker: Tesseract.Worker | null = null;

  async function initWorker() {
    if (!worker) {
      worker = await Tesseract.createWorker('chi_sim+eng');
    }
    return worker;
  }

  async function recognizeImage(imagePath: string): Promise<string> {
    try {
      const w = await initWorker();
      const result = await w.recognize(imagePath);
      return result.data.text;
    } catch (error) {
      console.error('OCR recognition failed:', error);
      throw new Error('图片文字识别失败，请确保图片清晰');
    }
  }

  async function terminate() {
    if (worker) {
      await worker.terminate();
      worker = null;
    }
  }

  return {
    recognizeImage,
    terminate
  };
}

export type OCRService = ReturnType<typeof createOCRService>;
