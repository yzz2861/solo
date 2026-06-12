export interface Answer {
  id: string;
  projectId: string;
  topicId: string | null;
  originalText: string;
  cleanedText: string;
  userId?: string;
  submitTime?: Date;
  isDuplicate: boolean;
  duplicateOfId?: string;
  isPinned: boolean;
  importanceScore: number;
  matchedRiskKeywords: string[];
  sentimentScore: number;
  hasEmoji: boolean;
  hasTypo: boolean;
  riskScore: number;
  sentiment: number;
  rawData?: Record<string, any>;
}

export interface Topic {
  id: string;
  projectId: string;
  name: string;
  customName?: string;
  answerCount: number;
  percentage: number;
  keywords: string[];
  representativeAnswerIds: string[];
  isPinned: boolean;
  isRisk: boolean;
  riskScore: number;
  riskReason: string;
  sentimentScore: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  importCount: number;
  duplicateCount: number;
  cleanedCount: number;
  answers: Answer[];
  topics: Topic[];
  settings: ProjectSettings;
  stats: {
    totalAnswers: number;
    uniqueAnswers: number;
    duplicateAnswers: number;
    averageSentiment: number;
  };
}

export interface ProjectSettings {
  clusteringSensitivity: number;
  riskKeywords: string[];
  enableTypoCorrection: boolean;
  enableEmojiRemoval: boolean;
  minAnswerLength: number;
}

export interface ClusteringResult {
  topics: Topic[];
  answers: Answer[];
  processingTime: number;
  stats: {
    totalAnswers: number;
    clusteredAnswers: number;
    unclusteredAnswers: number;
    riskTopics: number;
    riskAnswers: number;
  };
}

export interface RiskKeyword {
  keyword: string;
  severity: 'high' | 'medium' | 'low';
  category: string;
}

export interface TypoEntry {
  wrong: string;
  correct: string;
}

export type ImportFormat = 'csv' | 'json' | 'text';

export interface ImportOptions {
  format: ImportFormat;
  hasHeader: boolean;
  textColumn?: string;
  userIdColumn?: string;
  timeColumn?: string;
  removeEmojis: boolean;
  correctTypos: boolean;
  markDuplicates: boolean;
  filterShortAnswers: boolean;
  clusteringSensitivity: number;
}

export type ExportFormat = 'markdown' | 'csv' | 'json';

export interface ExportOptions {
  format: ExportFormat;
  includeRawAnswers: boolean;
  includeRepresentativesOnly: boolean;
  includeRiskAnalysis: boolean;
}
