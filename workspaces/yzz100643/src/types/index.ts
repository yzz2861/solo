export type FieldType = 'name' | 'date' | 'documentNumber' | 'pageNumber' | 'materialType';

export type RecordStatus = 'pending' | 'reviewing' | 'corrected' | 'approved';

export type InspectionStatus = 'pending' | 'pass' | 'fail' | 'recheck';

export type InspectionStrategy = 'lowConfidenceFirst' | 'stratified' | 'random' | 'weighted';

export type ExportFormat = 'xlsx' | 'csv';

export interface ExtractedField {
  id: string;
  recordId: string;
  fieldName: FieldType;
  ocrValue: string;
  correctedValue?: string;
  confidence: number;
  isLowConfidence: boolean;
  source: 'ocr' | 'manual' | 'inferred' | 'import' | 'filename';
  notes?: string;
  isAmbiguous?: boolean;
  ambiguousMatches?: string[];
}

export interface ArchiveRecord {
  id: string;
  projectId: string;
  photoPath: string;
  photoFileName: string;
  ocrText: string;
  overallConfidence: number;
  status: RecordStatus;
  pageNumber?: number;
  fields: ExtractedField[];
  hasMissingPage: boolean;
  missingPageReason?: string;
  hasSameNameWarning: boolean;
  sameNameRecordIds?: string[];
  createdAt: number;
  updatedAt: number;
  reviewedBy?: string;
  reviewNotes?: string;
}

export interface ArchiveProject {
  id: string;
  name: string;
  description?: string;
  recordCount: number;
  lowConfidenceCount: number;
  missingPageCount: number;
  createdAt: number;
  updatedAt: number;
  lastImportedAt?: number;
  status: 'importing' | 'processing' | 'ready' | 'completed';
  progress: number;
}

export interface InspectionTask {
  id: string;
  projectId: string;
  name: string;
  strategy: InspectionStrategy;
  sampleCount: number;
  totalRecords: number;
  completedCount: number;
  status: 'created' | 'in_progress' | 'completed';
  createdAt: number;
  completedAt?: number;
  priorityWeights?: {
    date: number;
    documentNumber: number;
    name: number;
    pageNumber: number;
    materialType: number;
  };
}

export interface InspectionItem {
  id: string;
  taskId: string;
  recordId: string;
  fieldName: FieldType;
  priority: number;
  priorityLevel: 'critical' | 'high' | 'medium' | 'low';
  status: InspectionStatus;
  ocrValue: string;
  correctedValue?: string;
  reviewedBy?: string;
  reviewedAt?: number;
  notes?: string;
}

export interface ImportOptions {
  hasHeader?: boolean;
  encoding?: 'utf-8' | 'gbk';
  delimiter?: ',' | '\t' | ';';
  dateFormat?: string;
}

export interface ImportPreview {
  headers: string[];
  sampleData: Record<string, string>[];
  totalRows: number;
  fileType: 'csv' | 'json' | 'txt' | 'folder';
  suggestedMappings: Record<string, FieldType | 'photoPath' | 'ocrText'>;
}

export interface ExportOptions {
  format: ExportFormat;
  includeOcrValue: boolean;
  includeCorrectedValue: boolean;
  includeConfidence: boolean;
  includePhotoPath: boolean;
  includeStatus: boolean;
  fieldSelection: FieldType[];
  filename?: string;
}

export interface QualityReport {
  projectId: string;
  totalRecords: number;
  lowConfidenceRecords: number;
  lowConfidenceByField: Record<FieldType, number>;
  averageConfidenceByField: Record<FieldType, number>;
  missingPageRecords: number;
  sameNameRecords: number;
  correctedCount: number;
  correctionRate: number;
}

export interface MissingPageDetection {
  recordId: string;
  expectedPage: number;
  actualPage?: number;
  gap: number;
  confidence: number;
  reason: 'sequence_gap' | 'number_jump' | 'filename_gap';
}

export interface SameNameDetection {
  name: string;
  recordIds: string[];
  count: number;
  hasDifferentDates: boolean;
  hasDifferentNumbers: boolean;
}
