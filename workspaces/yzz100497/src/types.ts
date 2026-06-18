export interface ImageMetadata {
  width: number;
  height: number;
  megapixels: number;
  takenAt?: Date;
  camera?: string;
  lens?: string;
  iso?: number;
  aperture?: string;
  shutterSpeed?: string;
}

export interface PhotoFile {
  id: string;
  originalName: string;
  filePath: string;
  size: number;
  extension: string;
  metadata: ImageMetadata;
  md5Hash?: string;
}

export interface DocumentFile {
  id: string;
  type: 'bio' | 'statement' | 'authorization' | 'other';
  originalName: string;
  filePath: string;
  size: number;
  extension: string;
  hasSignature?: boolean;
  content?: string;
}

export interface ArchiveFile {
  id: string;
  originalName: string;
  filePath: string;
  size: number;
  extractedPath?: string;
  contents: string[];
}

export interface CloudLink {
  id: string;
  originalName: string;
  filePath: string;
  url: string;
  platform: string;
}

export interface Work {
  id: string;
  title: string;
  photos: PhotoFile[];
  statement?: DocumentFile;
  detectedIssues: Issue[];
}

export interface Author {
  id: string;
  name: string;
  nameVariants: string[];
  email?: string;
  phone?: string;
  bio?: DocumentFile;
  authorization?: DocumentFile;
  works: Work[];
  detectedIssues: Issue[];
}

export type IssueSeverity = 'error' | 'warning' | 'info';
export type IssueCategory = 
  | 'duplicate' 
  | 'small_image' 
  | 'name_inconsistency' 
  | 'missing_signature' 
  | 'missing_document'
  | 'missing_statement'
  | 'missing_authorization'
  | 'cloud_link'
  | 'archive'
  | 'other';

export interface Issue {
  id: string;
  category: IssueCategory;
  severity: IssueSeverity;
  message: string;
  relatedItemId?: string;
  relatedItemType?: 'photo' | 'document' | 'work' | 'author';
}

export type SubmissionStatus = 'selected' | 'pending' | 'rejected';

export interface ProcessedSubmission {
  author: Author;
  status: SubmissionStatus;
  reasons: string[];
}

export interface ScanResult {
  authors: Author[];
  archives: ArchiveFile[];
  cloudLinks: CloudLink[];
  unclassifiedFiles: string[];
  allIssues: Issue[];
}

export interface FilterOptions {
  minWidth?: number;
  minHeight?: number;
  minMegapixels?: number;
  maxWidth?: number;
  maxHeight?: number;
  aspectRatio?: string;
  orientation?: 'landscape' | 'portrait' | 'square';
}

export interface ExportOptions {
  format: 'csv' | 'xlsx';
  outputDir: string;
  includeIssues?: boolean;
  includeMetadata?: boolean;
}

export interface OrganizeOptions {
  minImageSize: number;
  nameSimilarityThreshold: number;
  autoExtractArchives: boolean;
}
