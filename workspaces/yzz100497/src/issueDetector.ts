import * as path from 'path';
import { Author, Work, PhotoFile, Issue, IssueCategory } from './types';
import { generateId } from './utils';
import { detectNameInconsistencies } from './organizer';

export interface DetectionResult {
  authorIssues: Map<string, Issue[]>;
  workIssues: Map<string, Issue[]>;
  photoIssues: Map<string, Issue[]>;
  globalIssues: Issue[];
}

export function detectAllIssues(
  authors: Author[],
  minImageSize: number = 2,
  nameThreshold: number = 0.8
): DetectionResult {
  const result: DetectionResult = {
    authorIssues: new Map(),
    workIssues: new Map(),
    photoIssues: new Map(),
    globalIssues: []
  };

  const nameIssues = detectNameInconsistencies(authors, nameThreshold);
  result.globalIssues.push(...nameIssues);

  for (const author of authors) {
    const authorIssues: Issue[] = [];

    if (!author.bio) {
      authorIssues.push({
        id: generateId(),
        category: 'missing_document',
        severity: 'warning',
        message: '缺少作者简介',
        relatedItemId: author.id,
        relatedItemType: 'author'
      });
    }

    if (!author.authorization) {
      authorIssues.push({
        id: generateId(),
        category: 'missing_authorization',
        severity: 'error',
        message: '缺少授权书',
        relatedItemId: author.id,
        relatedItemType: 'author'
      });
    } else if (author.authorization.hasSignature === false) {
      authorIssues.push({
        id: generateId(),
        category: 'missing_signature',
        severity: 'error',
        message: '授权书缺少签字',
        relatedItemId: author.authorization.id,
        relatedItemType: 'document'
      });
    }

    if (author.nameVariants.length > 1) {
      authorIssues.push({
        id: generateId(),
        category: 'name_inconsistency',
        severity: 'info',
        message: `发现作者名多种写法: ${author.nameVariants.join('、')}`,
        relatedItemId: author.id,
        relatedItemType: 'author'
      });
    }

    result.authorIssues.set(author.id, authorIssues);
    author.detectedIssues.push(...authorIssues);

    const allAuthorPhotos: PhotoFile[] = [];
    for (const work of author.works) {
      allAuthorPhotos.push(...work.photos);
    }
    const crossWorkDuplicates = detectDuplicatePhotos(allAuthorPhotos);
    for (const dup of crossWorkDuplicates) {
      authorIssues.push({
        id: generateId(),
        category: 'duplicate',
        severity: 'warning',
        message: `发现跨作品重复投稿图片: ${dup.files.map(f => `${f.originalName} (${path.basename(path.dirname(f.filePath))})`).join('、')}`,
        relatedItemId: author.id,
        relatedItemType: 'author'
      });
    }
    result.authorIssues.set(author.id, authorIssues);
    author.detectedIssues.push(...authorIssues);

    for (const work of author.works) {
      const workIssues: Issue[] = [];

      if (!work.statement) {
        workIssues.push({
          id: generateId(),
          category: 'missing_document',
          severity: 'warning',
          message: `作品 "${work.title}" 缺少作品说明`,
          relatedItemId: work.id,
          relatedItemType: 'work'
        });
      }

      const duplicatePhotos = detectDuplicatePhotos(work.photos);
      for (const dup of duplicatePhotos) {
        workIssues.push({
          id: generateId(),
          category: 'duplicate',
          severity: 'warning',
          message: `发现重复投稿图片: ${dup.files.map(f => f.originalName).join('、')}`,
          relatedItemId: work.id,
          relatedItemType: 'work'
        });
      }

      result.workIssues.set(work.id, workIssues);
      work.detectedIssues.push(...workIssues);

      for (const photo of work.photos) {
        const photoIssues: Issue[] = [];

        if (photo.metadata.megapixels < minImageSize) {
          photoIssues.push({
            id: generateId(),
            category: 'small_image',
            severity: 'error',
            message: `图片尺寸过小: ${photo.metadata.width}x${photo.metadata.height} (${photo.metadata.megapixels}MP)，最低要求 ${minImageSize}MP`,
            relatedItemId: photo.id,
            relatedItemType: 'photo'
          });
        }

        if (photoIssues.length > 0) {
          result.photoIssues.set(photo.id, photoIssues);
        }
      }
    }
  }

  return result;
}

interface DuplicateGroup {
  hash: string;
  files: PhotoFile[];
}

function detectDuplicatePhotos(photos: PhotoFile[]): DuplicateGroup[] {
  const hashMap = new Map<string, PhotoFile[]>();

  for (const photo of photos) {
    if (photo.md5Hash) {
      if (!hashMap.has(photo.md5Hash)) {
        hashMap.set(photo.md5Hash, []);
      }
      hashMap.get(photo.md5Hash)!.push(photo);
    }
  }

  const duplicates: DuplicateGroup[] = [];
  for (const [hash, files] of hashMap) {
    if (files.length > 1) {
      duplicates.push({ hash, files });
    }
  }

  return duplicates;
}

export function getIssuesBySeverity(issues: Issue[], severity: 'error' | 'warning' | 'info'): Issue[] {
  return issues.filter(i => i.severity === severity);
}

export function getIssuesByCategory(issues: Issue[], category: IssueCategory): Issue[] {
  return issues.filter(i => i.category === category);
}

export function collectAllIssues(detection: DetectionResult): Issue[] {
  const all: Issue[] = [...detection.globalIssues];

  for (const issues of detection.authorIssues.values()) {
    all.push(...issues);
  }

  for (const issues of detection.workIssues.values()) {
    all.push(...issues);
  }

  for (const issues of detection.photoIssues.values()) {
    all.push(...issues);
  }

  return all;
}

export function hasErrors(detection: DetectionResult): boolean {
  const all = collectAllIssues(detection);
  return all.some(i => i.severity === 'error');
}

export function hasWarnings(detection: DetectionResult): boolean {
  const all = collectAllIssues(detection);
  return all.some(i => i.severity === 'warning');
}
