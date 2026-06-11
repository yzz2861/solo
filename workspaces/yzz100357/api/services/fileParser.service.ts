import fs from 'fs/promises';
import path from 'path';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { createOCRService } from './ocr.service.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const ocrService = createOCRService();

export async function parseFile(filePath: string, fileType: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  
  if (fileType.startsWith('image/')) {
    return await ocrService.recognizeImage(filePath);
  }
  
  switch (ext) {
    case '.txt':
      return await parseTxt(filePath);
    case '.docx':
      return await parseDocx(filePath);
    case '.pdf':
      return await parsePdf(filePath);
    case '.md':
      return await parseTxt(filePath);
    case '.html':
    case '.htm':
      return await parseHtml(filePath);
    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }
}

async function parseTxt(filePath: string): Promise<string> {
  return await fs.readFile(filePath, 'utf-8');
}

async function parseDocx(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

async function parsePdf(filePath: string): Promise<string> {
  const data = new Uint8Array(await fs.readFile(filePath));
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  let fullText = '';
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += `\n--- Page ${i} ---\n${pageText}\n`;
  }
  
  return fullText;
}

async function parseHtml(filePath: string): Promise<string> {
  const html = await fs.readFile(filePath, 'utf-8');
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function detectFileType(fileName: string): 'chat' | 'logistics' | 'refund' | 'other' {
  const lowerName = fileName.toLowerCase();
  
  if (lowerName.includes('聊天') || lowerName.includes('chat') || 
      lowerName.includes('对话') || lowerName.includes('message')) {
    return 'chat';
  }
  if (lowerName.includes('物流') || lowerName.includes('快递') || 
      lowerName.includes('logistics') || lowerName.includes('shipping') ||
      lowerName.includes('tracking')) {
    return 'logistics';
  }
  if (lowerName.includes('退款') || lowerName.includes('售后') || 
      lowerName.includes('refund') || lowerName.includes('return')) {
    return 'refund';
  }
  return 'other';
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
