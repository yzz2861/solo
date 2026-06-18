import * as path from 'path';
import * as stringSimilarity from 'string-similarity';
import {
  Author,
  Work,
  PhotoFile,
  DocumentFile,
  Issue,
  OrganizeOptions
} from './types';
import {
  generateId,
  normalizeName,
  getFileName,
  looksLikeChineseName,
  extractEmail,
  extractPhone
} from './utils';
import { RawFiles, detectPotentialAuthorNames, detectPotentialWorkTitles } from './scanner';

export interface OrganizationResult {
  authors: Author[];
  issues: Issue[];
}

let scanRootDir = '';

function getRelativePath(filePath: string): string {
  if (!scanRootDir) return filePath;
  const rel = path.relative(scanRootDir, filePath);
  return rel.startsWith('..') ? filePath : rel;
}

export async function organizeSubmissions(
  rawFiles: RawFiles,
  options: OrganizeOptions,
  scanDir?: string
): Promise<OrganizationResult> {
  if (scanDir) {
    scanRootDir = scanDir;
  }
  
  const issues: Issue[] = [...rawFiles.issues];
  
  const allFilesWithContent = [
    ...rawFiles.documents.map(d => ({ path: getRelativePath(d.filePath), content: d.content })),
    ...rawFiles.photos.map(p => ({ path: getRelativePath(p.filePath), content: undefined }))
  ];
  
  const potentialAuthorNames = detectPotentialAuthorNames(allFilesWithContent);
  detectPotentialWorkTitles(allFilesWithContent);
  
  const authors = await groupByAuthors(rawFiles, potentialAuthorNames, options);
  
  return {
    authors,
    issues
  };
}

async function groupByAuthors(
  rawFiles: RawFiles,
  potentialNames: string[],
  options: OrganizeOptions
): Promise<Author[]> {
  const authorMap = new Map<string, Author>();
  
  for (const name of potentialNames) {
    const normalized = normalizeName(name);
    if (normalized.length >= 2) {
      authorMap.set(normalized, createAuthor(name));
    }
  }
  
  for (const doc of rawFiles.documents) {
    const author = await findOrCreateAuthorForFile(authorMap, getRelativePath(doc.filePath), doc.content, options);
    
    if (doc.type === 'bio') {
      if (!author.bio) {
        author.bio = doc;
      } else if (author.bio.size < doc.size) {
        author.bio = doc;
      }
      
      if (doc.content) {
        const email = extractEmail(doc.content);
        const phone = extractPhone(doc.content);
        if (email && !author.email) author.email = email;
        if (phone && !author.phone) author.phone = phone;
      }
    } else if (doc.type === 'authorization') {
      if (!author.authorization || author.authorization.size < doc.size) {
        author.authorization = doc;
      }
    } else if (doc.type === 'statement') {
      assignStatementToWork(author, doc);
    }
  }
  
  for (const photo of rawFiles.photos) {
    const author = await findOrCreateAuthorForFile(authorMap, getRelativePath(photo.filePath), undefined, options);
    assignPhotoToWork(author, photo);
  }
  
  const unassignedDocs = rawFiles.documents.filter(d => {
    const dirAuthor = getAuthorFromDirectory(getRelativePath(d.filePath));
    return !dirAuthor;
  });
  
  for (const doc of unassignedDocs) {
    if (doc.type === 'bio' && authorMap.size > 0) {
      const firstAuthor = Array.from(authorMap.values())[0];
      if (!firstAuthor.bio) {
        firstAuthor.bio = doc;
      }
    }
  }
  
  return Array.from(authorMap.values()).filter(a => a.works.length > 0 || a.bio || a.authorization);
}

function createAuthor(name: string): Author {
  return {
    id: generateId(),
    name,
    nameVariants: [name],
    works: [],
    detectedIssues: []
  };
}

function isInExcludedDirectory(filePath: string): boolean {
  const relPath = getRelativePath(filePath);
  const parts = path.dirname(relPath).split(path.sep).filter(p => p && p !== '.' && p !== '..');
  return parts.some(part => isExcludedDirName(part));
}

async function findOrCreateAuthorForFile(
  authorMap: Map<string, Author>,
  filePath: string,
  content?: string,
  options?: OrganizeOptions
): Promise<Author> {
  const dirAuthor = getAuthorFromDirectory(filePath);
  
  if (dirAuthor) {
    const normalized = normalizeName(dirAuthor.normalized);
    const originalName = dirAuthor.original;
    let author = authorMap.get(normalized);
    
    if (author) {
      if (!author.nameVariants.includes(originalName)) {
        author.nameVariants.push(originalName);
      }
      if (author.name.includes(' ') && !originalName.includes(' ')) {
        author.name = originalName;
      }
      return author;
    }
    
    if (!author) {
      for (const [key, existing] of authorMap) {
        const similarity = stringSimilarity.compareTwoStrings(normalized, key);
        if (similarity >= (options?.nameSimilarityThreshold || 0.8)) {
          if (!existing.nameVariants.includes(originalName)) {
            existing.nameVariants.push(originalName);
          }
          return existing;
        }
      }
      
      author = createAuthor(originalName);
      authorMap.set(normalized, author);
    }
    
    return author;
  }
  
  if (isInExcludedDirectory(filePath)) {
    const otherKey = 'other_submissions';
    let author = authorMap.get(otherKey);
    if (!author) {
      author = createAuthor('其他投稿');
      authorMap.set(otherKey, author);
    }
    return author;
  }
  
  if (content) {
    const nameMatch = content.match(/(?:姓名|作者|Name|Author)[：:]\s*([^\n\r,，]+)/i);
    if (nameMatch && nameMatch[1]) {
      const name = nameMatch[1].trim();
      const normalized = normalizeName(name);
      
      if (normalized.length >= 2) {
        let author = authorMap.get(normalized);
        
        if (!author) {
          for (const [key, existing] of authorMap) {
            const similarity = stringSimilarity.compareTwoStrings(normalized, key);
            if (similarity >= (options?.nameSimilarityThreshold || 0.8)) {
              if (!existing.nameVariants.includes(name)) {
                existing.nameVariants.push(name);
              }
              return existing;
            }
          }
          
          author = createAuthor(name);
          authorMap.set(normalized, author);
        }
        
        return author;
      }
    }
  }
  
  if (authorMap.size === 0) {
    const author = createAuthor('未知作者');
    authorMap.set('unknown', author);
    return author;
  }
  
  const unknownKey = 'unknown_unclassified';
  let author = authorMap.get(unknownKey);
  if (!author) {
    author = createAuthor('未分类投稿');
    authorMap.set(unknownKey, author);
  }
  return author;
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

function getAuthorFromDirectory(filePath: string): { normalized: string; original: string } | null {
  const relPath = getRelativePath(filePath);
  const parts = path.dirname(relPath).split(path.sep).filter(p => p && p !== '.' && p !== '..');
  const candidates: { name: string; depth: number }[] = [];
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (isExcludedDirName(part)) continue;
    if (looksLikeChineseName(part) || (/^[A-Za-z\s]+$/.test(part) && part.length > 2 && part.length < 20)) {
      candidates.push({ name: part, depth: i });
    }
  }
  
  if (candidates.length === 0) return null;
  
  const selected = candidates[0];
  return {
    normalized: selected.name.replace(/\s+/g, ''),
    original: selected.name
  };
}

function getWorkTitleFromDirectory(filePath: string, authorName: string): string {
  const relPath = getRelativePath(filePath);
  const parts = path.dirname(relPath).split(path.sep).filter(p => p && p !== '.' && p !== '..');
  
  const authorVariants = [authorName];
  let authorIndex = -1;
  
  for (const variant of authorVariants) {
    for (let i = 0; i < parts.length; i++) {
      if (normalizeName(parts[i]) === normalizeName(variant)) {
        authorIndex = i;
        break;
      }
    }
    if (authorIndex >= 0) break;
  }
  
  if (authorIndex >= 0 && authorIndex < parts.length - 1) {
    return parts[authorIndex + 1];
  }
  
  const fileName = getFileName(path.basename(relPath));
  if (!fileName.match(/^[A-Z]{0,3}_?\d{4,}/) && fileName.length > 3) {
    return fileName;
  }
  
  return '未命名作品';
}

function assignPhotoToWork(author: Author, photo: PhotoFile): void {
  let workTitle = getWorkTitleFromDirectory(photo.filePath, author.name);
  
  const normalizedTitle = workTitle.toLowerCase();
  let work = author.works.find(w => 
    w.title.toLowerCase() === normalizedTitle ||
    stringSimilarity.compareTwoStrings(w.title.toLowerCase(), normalizedTitle) > 0.8
  );
  
  if (!work) {
    work = {
      id: generateId(),
      title: workTitle,
      photos: [],
      detectedIssues: []
    };
    author.works.push(work);
  }
  
  work.photos.push(photo);
}

function assignStatementToWork(author: Author, doc: DocumentFile): void {
  let workTitle = getWorkTitleFromDirectory(doc.filePath, author.name);
  
  if (workTitle === '未命名作品' && doc.content) {
    const titleMatch = doc.content.match(/(?:标题|作品名|Title|作品名称)[：:]\s*([^\n\r]+)/i);
    if (titleMatch && titleMatch[1]) {
      workTitle = titleMatch[1].trim();
    }
  }
  
  if (workTitle && workTitle !== '未命名作品') {
    const normalizedTitle = workTitle.toLowerCase();
    let work = author.works.find(w => 
      w.title.toLowerCase() === normalizedTitle ||
      stringSimilarity.compareTwoStrings(w.title.toLowerCase(), normalizedTitle) > 0.8
    );
    
    if (work) {
      work.statement = doc;
    } else {
      work = {
        id: generateId(),
        title: workTitle,
        photos: [],
        statement: doc,
        detectedIssues: []
      };
      author.works.push(work);
    }
  }
}

export function detectNameInconsistencies(authors: Author[], threshold: number = 0.8): Issue[] {
  const issues: Issue[] = [];
  const allNames: { name: string; authorId: string }[] = [];
  
  for (const author of authors) {
    for (const variant of author.nameVariants) {
      allNames.push({ name: variant, authorId: author.id });
    }
  }
  
  for (let i = 0; i < allNames.length; i++) {
    for (let j = i + 1; j < allNames.length; j++) {
      if (allNames[i].authorId !== allNames[j].authorId) {
        const similarity = stringSimilarity.compareTwoStrings(
          normalizeName(allNames[i].name),
          normalizeName(allNames[j].name)
        );
        
        if (similarity >= threshold) {
          issues.push({
            id: generateId(),
            category: 'name_inconsistency',
            severity: 'warning',
            message: `作者名写法可能不一致: "${allNames[i].name}" 和 "${allNames[j].name}" 相似度 ${(similarity * 100).toFixed(0)}%`,
            relatedItemId: allNames[i].authorId,
            relatedItemType: 'author'
          });
        }
      }
    }
  }
  
  return issues;
}

export function mergeSimilarAuthors(authors: Author[], threshold: number = 0.8): Author[] {
  const merged: Author[] = [];
  const processed = new Set<string>();
  
  for (let i = 0; i < authors.length; i++) {
    if (processed.has(authors[i].id)) continue;
    
    const current = authors[i];
    const toMerge: Author[] = [current];
    processed.add(current.id);
    
    for (let j = i + 1; j < authors.length; j++) {
      if (processed.has(authors[j].id)) continue;
      
      let maxSimilarity = 0;
      for (const n1 of current.nameVariants) {
        for (const n2 of authors[j].nameVariants) {
          const sim = stringSimilarity.compareTwoStrings(normalizeName(n1), normalizeName(n2));
          if (sim > maxSimilarity) {
            maxSimilarity = sim;
          }
        }
      }
      
      if (maxSimilarity >= threshold) {
        toMerge.push(authors[j]);
        processed.add(authors[j].id);
      }
    }
    
    if (toMerge.length > 1) {
      const mergedAuthor = mergeAuthors(toMerge);
      merged.push(mergedAuthor);
    } else {
      merged.push(current);
    }
  }
  
  return merged;
}

function mergeAuthors(authors: Author[]): Author {
  const allVariants: string[] = [];
  for (const author of authors) {
    for (const variant of author.nameVariants) {
      if (!allVariants.includes(variant)) {
        allVariants.push(variant);
      }
    }
  }
  
  let bestName = authors[0].name;
  for (const variant of allVariants) {
    if (!variant.includes(' ') && bestName.includes(' ')) {
      bestName = variant;
      break;
    }
  }
  
  const primary = authors[0];
  
  const merged: Author = {
    id: primary.id,
    name: bestName,
    nameVariants: allVariants,
    works: [],
    detectedIssues: []
  };
  
  for (const author of authors) {
    merged.works.push(...author.works);
    
    if (!merged.bio && author.bio) merged.bio = author.bio;
    if (!merged.authorization && author.authorization) merged.authorization = author.authorization;
    if (!merged.email && author.email) merged.email = author.email;
    if (!merged.phone && author.phone) merged.phone = author.phone;
    
    merged.detectedIssues.push(...author.detectedIssues);
  }
  
  if (allVariants.length > 1) {
    merged.detectedIssues.push({
      id: generateId(),
      category: 'name_inconsistency',
      severity: 'warning',
      message: `作者名写法可能不一致，检测到多种写法: ${allVariants.join('、')}`,
      relatedItemId: merged.id,
      relatedItemType: 'author'
    });
  }
  
  return merged;
}
