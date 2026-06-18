import * as fs from 'fs';
import * as path from 'path';
const AdmZip = require('adm-zip');
import {
  PhotoFile,
  DocumentFile,
  ArchiveFile,
  CloudLink,
  Issue,
  IssueCategory,
  IssueSeverity
} from './types';
import {
  generateId,
  getFileExtension,
  getFileName,
  isImageFile,
  isDocumentFile,
  isArchiveFile,
  isLinkFile,
  getFileSize,
  calculateMD5,
  extractUrlsFromText,
  detectCloudPlatform,
  walkDirectory,
  readTextFile,
  looksLikeChineseName
} from './utils';
import { readImageMetadata, readDocumentContent, checkSignatureInPdf, checkSignatureInText } from './metadataReader';

export interface RawFiles {
  photos: PhotoFile[];
  documents: DocumentFile[];
  archives: ArchiveFile[];
  cloudLinks: CloudLink[];
  unclassified: string[];
  issues: Issue[];
}

export async function scanDirectory(
  dirPath: string,
  autoExtractArchives: boolean = false
): Promise<RawFiles> {
  const result: RawFiles = {
    photos: [],
    documents: [],
    archives: [],
    cloudLinks: [],
    unclassified: [],
    issues: []
  };

  const allFiles: string[] = [];
  walkDirectory(dirPath, (filePath) => {
    allFiles.push(filePath);
  });

  for (const filePath of allFiles) {
    try {
      if (isImageFile(filePath)) {
        const photo = await processImageFile(filePath);
        result.photos.push(photo);
      } else if (isArchiveFile(filePath)) {
        const archive = await processArchiveFile(filePath, autoExtractArchives, dirPath);
        result.archives.push(archive);
        
        result.issues.push({
          id: generateId(),
          category: 'archive',
          severity: 'warning',
          message: `发现压缩包: ${path.basename(filePath)}，请手动检查内容`,
          relatedItemId: archive.id,
          relatedItemType: 'document'
        });
      } else if (isLinkFile(filePath)) {
        const link = await processLinkFile(filePath);
        if (link) {
          result.cloudLinks.push(link);
          
          result.issues.push({
            id: generateId(),
            category: 'cloud_link',
            severity: 'warning',
            message: `发现网盘链接 (${link.platform}): ${link.url}，请手动下载检查`,
            relatedItemId: link.id,
            relatedItemType: 'document'
          });
        } else {
          result.unclassified.push(filePath);
        }
      } else if (isDocumentFile(filePath)) {
        const doc = await processDocumentFile(filePath);
        result.documents.push(doc);
      } else {
        result.unclassified.push(filePath);
      }
    } catch (error) {
      result.issues.push({
        id: generateId(),
        category: 'other',
        severity: 'error',
        message: `处理文件失败: ${filePath} - ${error}`
      });
    }
  }

  return result;
}

async function processImageFile(filePath: string): Promise<PhotoFile> {
  const metadata = await readImageMetadata(filePath);
  const ext = getFileExtension(filePath);
  
  return {
    id: generateId(),
    originalName: path.basename(filePath),
    filePath,
    size: getFileSize(filePath),
    extension: ext,
    metadata,
    md5Hash: calculateMD5(filePath)
  };
}

async function processDocumentFile(filePath: string): Promise<DocumentFile> {
  const ext = getFileExtension(filePath);
  const fileName = getFileName(filePath).toLowerCase();
  const content = await readDocumentContent(filePath, ext);
  
  let type: DocumentFile['type'] = 'other';
  
  if (fileName.includes('授权') || fileName.includes('authorize') || fileName.includes('同意书') || fileName.includes('版权')) {
    type = 'authorization';
  } else if (fileName.includes('简介') || fileName.includes('bio') || fileName.includes('自我介绍') || fileName.includes('个人')) {
    type = 'bio';
  } else if (fileName.includes('说明') || fileName.includes('statement') || fileName.includes('作品介绍') || fileName.includes('description')) {
    type = 'statement';
  }
  
  if (type === 'other' && content) {
    const lowerContent = content.toLowerCase();
    if (lowerContent.includes('授权') || lowerContent.includes('authorize') || lowerContent.includes('版权声明')) {
      type = 'authorization';
    } else if (lowerContent.includes('作者简介') || lowerContent.includes('biography') || lowerContent.includes('个人简介')) {
      type = 'bio';
    } else if (lowerContent.includes('作品说明') || lowerContent.includes('创作说明') || lowerContent.includes('statement')) {
      type = 'statement';
    }
  }
  
  const doc: DocumentFile = {
    id: generateId(),
    type,
    originalName: path.basename(filePath),
    filePath,
    size: getFileSize(filePath),
    extension: ext,
    content
  };
  
  if (type === 'authorization') {
    if (ext === '.pdf') {
      doc.hasSignature = await checkSignatureInPdf(filePath);
    } else if (content) {
      doc.hasSignature = checkSignatureInText(content);
    }
  }
  
  return doc;
}

async function processArchiveFile(
  filePath: string,
  autoExtract: boolean,
  baseDir: string
): Promise<ArchiveFile> {
  const archive: ArchiveFile = {
    id: generateId(),
    originalName: path.basename(filePath),
    filePath,
    size: getFileSize(filePath),
    contents: []
  };

  if (autoExtract && getFileExtension(filePath) === '.zip') {
    try {
      const zip = new AdmZip(filePath);
      const entries = zip.getEntries();
      archive.contents = entries.map((e: any) => e.entryName);
      
      const extractDir = path.join(baseDir, '_extracted', getFileName(filePath));
      zip.extractAllTo(extractDir, true);
      archive.extractedPath = extractDir;
    } catch (error) {
      archive.contents = [`无法读取压缩包内容: ${error}`];
    }
  } else if (getFileExtension(filePath) === '.zip') {
    try {
      const zip = new AdmZip(filePath);
      const entries = zip.getEntries();
      archive.contents = entries.map((e: any) => e.entryName);
    } catch (error) {
      archive.contents = [`无法读取压缩包内容: ${error}`];
    }
  }

  return archive;
}

async function processLinkFile(filePath: string): Promise<CloudLink | null> {
  const ext = getFileExtension(filePath);
  let content = '';
  
  if (ext === '.url') {
    content = readTextFile(filePath);
    const urlMatch = content.match(/URL=(.+)/i);
    if (urlMatch) {
      const url = urlMatch[1].trim();
      return {
        id: generateId(),
        originalName: path.basename(filePath),
        filePath,
        url,
        platform: detectCloudPlatform(url)
      };
    }
  } else if (ext === '.txt') {
    content = readTextFile(filePath).trim();
    const urls = extractUrlsFromText(content);
    if (urls.length > 0) {
      return {
        id: generateId(),
        originalName: path.basename(filePath),
        filePath,
        url: urls[0],
        platform: detectCloudPlatform(urls[0])
      };
    }
  } else if (ext === '.webloc') {
    try {
      const plist = require('plist');
      const data = fs.readFileSync(filePath, 'utf8');
      const parsed = plist.parse(data);
      if (parsed.URL) {
        return {
          id: generateId(),
          originalName: path.basename(filePath),
          filePath,
          url: parsed.URL,
          platform: detectCloudPlatform(parsed.URL)
        };
      }
    } catch {
    }
  }
  
  return null;
}

const EXCLUDED_DIR_NAMES = [
  '其他文件', 'others', '其他', 'misc', 'miscellaneous',
  '压缩包', 'archives', '链接', 'links', '临时', 'temp'
];

function isExcludedDirName(name: string): boolean {
  const normalized = name.toLowerCase().replace(/\s+/g, '');
  return EXCLUDED_DIR_NAMES.some(excluded => 
    normalized === excluded.toLowerCase().replace(/\s+/g, '')
  );
}

export function detectPotentialAuthorNames(files: { path: string; content?: string }[]): string[] {
  const names = new Set<string>();
  
  for (const file of files) {
    const dirParts = path.dirname(file.path).split(path.sep);
    for (const part of dirParts) {
      if (isExcludedDirName(part)) continue;
      if (looksLikeChineseName(part) || /^[A-Za-z\s]+$/.test(part)) {
        names.add(part);
      }
    }
    
    if (file.content) {
      const namePatterns = [
        /姓名[：:]\s*([^\n\r,，]+)/,
        /作者[：:]\s*([^\n\r,，]+)/,
        /Name[：:]\s*([^\n\r,，]+)/i,
        /Author[：:]\s*([^\n\r,，]+)/i
      ];
      
      for (const pattern of namePatterns) {
        const match = file.content.match(pattern);
        if (match && match[1]) {
          const name = match[1].trim();
          if (name.length > 1 && name.length < 20) {
            names.add(name);
          }
        }
      }
    }
  }
  
  return Array.from(names);
}

export function detectPotentialWorkTitles(files: { path: string; content?: string }[]): string[] {
  const titles = new Set<string>();
  
  for (const file of files) {
    const fileName = getFileName(file.path);
    if (!fileName.match(/^[A-Z]{0,3}_?\d{4,}/) && fileName.length > 3) {
      titles.add(fileName);
    }
    
    if (file.content) {
      const titlePatterns = [
        /标题[：:]\s*([^\n\r]+)/,
        /作品名[：:]\s*([^\n\r]+)/,
        /Title[：:]\s*([^\n\r]+)/i,
        /作品名称[：:]\s*([^\n\r]+)/
      ];
      
      for (const pattern of titlePatterns) {
        const match = file.content.match(pattern);
        if (match && match[1]) {
          const title = match[1].trim();
          if (title.length > 1 && title.length < 100) {
            titles.add(title);
          }
        }
      }
    }
  }
  
  return Array.from(titles);
}
