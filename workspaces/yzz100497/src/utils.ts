import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.tif', '.tiff', '.heic', '.heif', '.raw', '.cr2', '.nef', '.arw'];
export const DOCUMENT_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.md'];
export const ARCHIVE_EXTENSIONS = ['.zip', '.rar', '.7z', '.tar', '.gz'];
export const LINK_EXTENSIONS = ['.url', '.webloc', '.txt'];

export function generateId(): string {
  return crypto.randomBytes(8).toString('hex');
}

export function getFileExtension(filePath: string): string {
  return path.extname(filePath).toLowerCase();
}

export function getFileName(filePath: string): string {
  return path.basename(filePath, getFileExtension(filePath));
}

export function isImageFile(filePath: string): boolean {
  return IMAGE_EXTENSIONS.includes(getFileExtension(filePath));
}

export function isDocumentFile(filePath: string): boolean {
  return DOCUMENT_EXTENSIONS.includes(getFileExtension(filePath));
}

export function isArchiveFile(filePath: string): boolean {
  return ARCHIVE_EXTENSIONS.includes(getFileExtension(filePath));
}

export function isLinkFile(filePath: string): boolean {
  const ext = getFileExtension(filePath);
  if (LINK_EXTENSIONS.includes(ext)) {
    if (ext === '.txt') {
      const content = fs.readFileSync(filePath, 'utf8').trim();
      return content.startsWith('http://') || content.startsWith('https://');
    }
    return true;
  }
  return false;
}

export function getFileSize(filePath: string): number {
  return fs.statSync(filePath).size;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function calculateMD5(filePath: string): string {
  const hash = crypto.createHash('md5');
  const data = fs.readFileSync(filePath);
  hash.update(data);
  return hash.digest('hex');
}

export function extractUrlsFromText(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
}

export function detectCloudPlatform(url: string): string {
  if (url.includes('pan.baidu.com') || url.includes('yun.baidu.com')) return '百度网盘';
  if (url.includes('aliyundrive.com') || url.includes('aliyun.com')) return '阿里云盘';
  if (url.includes('weiyun.com')) return '微云';
  if (url.includes('dropbox.com')) return 'Dropbox';
  if (url.includes('google.com/drive')) return 'Google Drive';
  if (url.includes('onedrive.com')) return 'OneDrive';
  if (url.includes('icloud.com')) return 'iCloud';
  return '未知网盘';
}

export function walkDirectory(dirPath: string, callback: (filePath: string) => void): void {
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDirectory(fullPath, callback);
    } else {
      callback(fullPath);
    }
  }
}

export function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function readTextFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[_\-\s\.]+/g, '')
    .replace(/[^\u4e00-\u9fa5a-z0-9]/g, '');
}

export function extractEmail(text: string): string | undefined {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const match = text.match(emailRegex);
  return match ? match[0] : undefined;
}

export function extractPhone(text: string): string | undefined {
  const phoneRegex = /1[3-9]\d{9}/;
  const match = text.match(phoneRegex);
  return match ? match[0] : undefined;
}

export function looksLikeChineseName(name: string): boolean {
  const cleaned = name.trim().replace(/\s+/g, '');
  return /^[\u4e00-\u9fa5]{2,4}$/.test(cleaned);
}

export function parseAspectRatio(ratioStr: string): { width: number; height: number } | null {
  const match = ratioStr.match(/^(\d+):(\d+)$/);
  if (match) {
    return { width: parseInt(match[1]), height: parseInt(match[2]) };
  }
  return null;
}

export function formatDate(date?: Date): string {
  if (!date) return '未知';
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}
