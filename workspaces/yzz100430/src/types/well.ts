export type RiskLevel = 'STOP' | 'RETEST' | 'OBSERVE';

export interface Village {
  id: string;
  name: string;
  code: string;
  lat?: number;
  lng?: number;
  positionX?: number;
  positionY?: number;
}

export interface Well {
  id: string;
  villageId: string;
  officialNo: string;
  commonName: string;
}

export interface SampleRecord {
  id: string;
  wellId: string;
  sampleDate: string;
  photoNo: string;
  postRain: boolean;
  missing: boolean;
  note?: string;
}

export type NitrateUnit = 'mg/L' | 'μg/L';

export interface LabResult {
  id: string;
  sampleId?: string;
  villageCode: string;
  wellNo: string;
  labDate: string;
  nitrate: number;
  nitrateUnit: NitrateUnit;
  turbidity: number;
  coliform: number;
}

export interface FeedbackRecord {
  id: string;
  villageName: string;
  wellNoOrName: string;
  reportDate: string;
  reporter: string;
  odorDesc: string;
  matchedWellId?: string;
}

export interface ThresholdConfig {
  nitrateStop: number;
  nitrateRetest: number;
  turbidityStop: number;
  turbidityRetest: number;
  coliformStop: number;
  coliformRetest: number;
}

export interface AdviceTemplate {
  risk: RiskLevel;
  title: string;
  suggestion: string;
  forwardTemplate: string;
}

export type IndicatorKey = 'nitrate' | 'turbidity' | 'coliform';

export interface ExceedFlags {
  nitrate: boolean;
  turbidity: boolean;
  coliform: boolean;
  nitrateBoundary: boolean;
  turbidityBoundary: boolean;
  coliformBoundary: boolean;
}

export interface MergedRecord {
  id: string;
  wellId: string;
  wellCommonName: string;
  villageId: string;
  villageName: string;
  sampleDate: string;
  sample?: SampleRecord;
  lab?: LabResult;
  feedbacks: FeedbackRecord[];
  hasOdorFeedback: boolean;
  postRain: boolean;
  missingSample: boolean;
  missingLab: boolean;
  nitrateMgL: number;
  turbidityNtu: number;
  coliformCfu: number;
  exceeds: ExceedFlags;
  riskLevel: RiskLevel;
  customAdvice?: string;
}

export interface LabImportRow {
  villageCode?: string;
  village?: string;
  wellNo?: string;
  labDate?: string;
  nitrate?: string | number;
  nitrateUnit?: NitrateUnit | string;
  turbidity?: string | number;
  coliform?: string | number;
  [key: string]: any;
}

export interface SampleImportRow {
  village?: string;
  villageCode?: string;
  wellNo?: string;
  sampleDate?: string;
  photoNo?: string;
  postRain?: string | boolean;
  missing?: string | boolean;
  note?: string;
  [key: string]: any;
}

export interface FeedbackImportRow {
  villageName?: string;
  village?: string;
  wellNo?: string;
  wellName?: string;
  reportDate?: string;
  reporter?: string;
  odorDesc?: string;
  feedback?: string;
  [key: string]: any;
}

export interface MergeStats {
  totalWells: number;
  totalRecords: number;
  matchedSampleLab: number;
  missingSample: number;
  missingLab: number;
  postRainCount: number;
  odorFeedbackCount: number;
  stopCount: number;
  retestCount: number;
  observeCount: number;
}

export const RISK_LABEL: Record<RiskLevel, string> = {
  STOP: '需停用',
  RETEST: '需复检',
  OBSERVE: '安全观察',
};

export const RISK_COLOR: Record<RiskLevel, string> = {
  STOP: 'danger',
  RETEST: 'warn',
  OBSERVE: 'safe',
};

export const INDICATOR_LABEL: Record<IndicatorKey, string> = {
  nitrate: '硝酸盐',
  turbidity: '浊度',
  coliform: '菌落总数',
};

export const INDICATOR_UNIT: Record<IndicatorKey, string> = {
  nitrate: 'mg/L',
  turbidity: 'NTU',
  coliform: 'CFU/mL',
};
