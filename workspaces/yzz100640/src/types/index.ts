export type SourceType = 'manual' | 'pest' | 'notice' | 'experience';

export interface MaterialItem {
  id: string;
  title: string;
  sourceType: SourceType;
  sourceName: string;
  sourcePage?: number;
  content: string;
  applicableCrops: string[];
  applicableVarieties?: string[];
  applicableRegions: string[];
  applicableSeasons: string[];
  keywords: string[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  status?: 'pending' | 'approved';
}

export interface QARecord {
  id: string;
  question: string;
  filters: {
    crop?: string;
    variety?: string;
    region?: string;
    season?: string;
  };
  answer: string;
  sources: Array<{
    materialId: string;
    sourceType: SourceType;
    sourceName: string;
    snippet: string;
    page?: number;
  }>;
  applicableConditions: string[];
  needsManualJudgment: boolean;
  judgmentReasons?: string[];
  confidence: number;
  adopted: boolean | null;
  adoptionNote?: string;
  createdAt: string;
  askedBy: string;
}

export interface StatisticsData {
  totalQA: number;
  adoptionRate: number;
  manualJudgmentCount: number;
  topQuestions: Array<{
    question: string;
    count: number;
  }>;
  categoryDistribution: Array<{
    category: string;
    count: number;
  }>;
  uncoveredQuestions: Array<{
    question: string;
    note?: string;
    count: number;
  }>;
}

export interface CropLibraryItem {
  name: string;
  varieties: string[];
  regions: string[];
}

export interface RegionLibraryItem {
  province: string;
  city: string;
  counties: string[];
}
