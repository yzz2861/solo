export interface CuppingScores {
  aroma: number;
  acidity: number;
  sweetness: number;
  body: number;
  balance: number;
  overall: number;
}

export interface BrewParams {
  grinder: string;
  grindSize: string;
  waterTemp: number;
  ratio: string;
}

export interface RecordStatus {
  isOnSale: boolean;
  isRetest: boolean;
}

export interface CuppingRecord {
  id: string;
  origin: string;
  process: string;
  batch: string;
  cupper: string;
  cuppingDate: string;
  scores: CuppingScores;
  aromaNotes: string;
  flavorNotes: string;
  defects: string[];
  notes: string;
  brewParams: BrewParams;
  status: RecordStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ValidationWarning {
  type: 'score_range' | 'batch_conflict' | 'defect_spelling';
  message: string;
  severity: 'error' | 'warning';
  suggestions?: string[];
  details?: string;
}

export interface ValidationResult {
  valid: boolean;
  warnings: ValidationWarning[];
}

export type ScoreKey = keyof CuppingScores;

export interface FilterOptions {
  batch: string;
  onSale: 'all' | 'yes' | 'no';
  retest: 'all' | 'yes' | 'no';
  search: string;
}

export type ProcessType = '水洗' | '日晒' | '蜜处理' | '厌氧发酵' | '湿刨法' | '其他';

export const SCORE_LABELS: Record<ScoreKey, string> = {
  aroma: '香气',
  acidity: '酸质',
  sweetness: '甜感',
  body: '醇厚度',
  balance: '平衡感',
  overall: '整体评分',
};

export const PROCESS_OPTIONS: ProcessType[] = [
  '水洗',
  '日晒',
  '蜜处理',
  '厌氧发酵',
  '湿刨法',
  '其他',
];
