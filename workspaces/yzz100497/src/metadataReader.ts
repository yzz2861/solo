import * as fs from 'fs';
const sharp = require('sharp');
import * as ExifReader from 'exifreader';
import { ImageMetadata } from './types';

export async function readImageMetadata(filePath: string): Promise<ImageMetadata> {
  try {
    const sharpMeta = await sharp(filePath).metadata();
    const width = sharpMeta.width || 0;
    const height = sharpMeta.height || 0;
    const megapixels = (width * height) / 1000000;

    let exifData: any = null;
    try {
      const fileBuffer = fs.readFileSync(filePath);
      exifData = ExifReader.load(fileBuffer);
    } catch {
    }

    const metadata: ImageMetadata = {
      width,
      height,
      megapixels: parseFloat(megapixels.toFixed(2))
    };

    if (exifData) {
      if (exifData['DateTimeOriginal'] || exifData['DateTime']) {
        const dateStr = exifData['DateTimeOriginal']?.description || exifData['DateTime']?.description;
        if (dateStr) {
          const parsed = parseExifDate(dateStr);
          if (parsed) {
            metadata.takenAt = parsed;
          }
        }
      }

      if (exifData['Make'] || exifData['Model']) {
        const make = exifData['Make']?.description || '';
        const model = exifData['Model']?.description || '';
        metadata.camera = `${make} ${model}`.trim();
      }

      if (exifData['LensModel']) {
        metadata.lens = exifData['LensModel'].description;
      }

      if (exifData['ISOSpeedRatings']) {
        metadata.iso = parseInt(exifData['ISOSpeedRatings'].description);
      }

      if (exifData['FNumber']) {
        metadata.aperture = 'f/' + exifData['FNumber'].description;
      }

      if (exifData['ExposureTime']) {
        metadata.shutterSpeed = exifData['ExposureTime'].description + 's';
      }
    }

    return metadata;
  } catch (error) {
    throw new Error(`无法读取图片元数据: ${filePath} - ${error}`);
  }
}

function parseExifDate(dateStr: string): Date | null {
  try {
    const match = dateStr.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
    if (match) {
      return new Date(
        parseInt(match[1]),
        parseInt(match[2]) - 1,
        parseInt(match[3]),
        parseInt(match[4]),
        parseInt(match[5]),
        parseInt(match[6])
      );
    }
  } catch {
  }
  return null;
}

export function checkSignatureInText(text: string): boolean {
  const lowerText = text.toLowerCase();
  
  const signatureKeywords = [
    '签字', '签名', '签署', '签章', '签名处', '作者签名',
    'signature', 'signed', 'sign here', 'author signature'
  ];
  
  const hasSignatureKeyword = signatureKeywords.some(keyword => lowerText.includes(keyword));
  
  const blankPatterns = [
    /签名[：:]\s*_{5,}/,
    /签字[：:]\s*_{5,}/,
    /作者签名[：:]\s*_{5,}/,
    /签名[：:]\s*-{5,}/,
    /签字[：:]\s*-{5,}/,
    /作者签名[：:]\s*-{5,}/,
    /sign[：:]\s*_{5,}/i
  ];
  
  const hasBlankSignature = blankPatterns.some(pattern => pattern.test(text));
  
  if (hasBlankSignature) {
    return false;
  }
  
  const filledPatterns = [
    /签名[：:]\s*\S+/,
    /签字[：:]\s*\S+/,
    /作者签名[：:]\s*\S+/,
    /author signature[：:]\s*\S+/i
  ];
  
  const hasFilledSignature = filledPatterns.some(pattern => pattern.test(text));
  
  return hasSignatureKeyword && !hasBlankSignature && hasFilledSignature;
}

export async function checkSignatureInPdf(filePath: string): Promise<boolean> {
  try {
    const pdfParse = require('pdf-parse');
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return checkSignatureInText(data.text);
  } catch {
    return false;
  }
}

export async function readDocumentContent(filePath: string, extension: string): Promise<string> {
  try {
    if (extension === '.pdf') {
      const pdfParse = require('pdf-parse');
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    }
    
    if (['.txt', '.md', '.rtf'].includes(extension)) {
      return fs.readFileSync(filePath, 'utf8');
    }
    
    if (['.doc', '.docx'].includes(extension)) {
      try {
        const { extractText } = require('office-text-extractor');
        return await extractText(filePath);
      } catch {
        return '';
      }
    }
    
    return '';
  } catch {
    return '';
  }
}
