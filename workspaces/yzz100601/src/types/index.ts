export type WeightUnit = 'kg' | 'jin' | 'lb';
export type RiskLevel = 'safe' | 'warning' | 'danger';
export type PositionZone = 'tl' | 'tc' | 'tr' | 'ml' | 'mc' | 'mr' | 'bl' | 'bc' | 'br';

export interface ShelfConfig {
  id: string;
  name: string;
  layerCount: number;
  layerWidth_cm: number;
  layerDepth_cm: number;
  layerMaxWeight_kg: number;
  singleItemLimit_kg: number;
}

export interface BoxItem {
  id: string;
  layerIndex: number;
  name: string;
  weight: number;
  weightUnit: WeightUnit;
  length_cm: number;
  width_cm: number;
  height_cm: number;
  quantity: number;
  positionZone: PositionZone;
}

export interface MaxContributor {
  boxId: string;
  boxName: string;
  weight_kg: number;
  percent: number;
}

export interface LayerResult {
  layerIndex: number;
  totalWeight_kg: number;
  utilizationPercent: number;
  riskLevel: RiskLevel;
  safetyMargin_kg: number;
  maxContributor: MaxContributor | null;
  zoneWeights: Record<PositionZone, number>;
  centerConcentrationRatio: number;
  boxCount: number;
}

export interface CalculationReport {
  id: string;
  shelfId: string;
  calculatedAt: string;
  version: number;
  shelfConfig: ShelfConfig;
  boxes: BoxItem[];
  layerResults: LayerResult[];
  globalWarnings: WarningItem[];
  totalWeight_kg: number;
}

export interface WarningItem {
  type: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  detail?: string;
  layerIndex?: number;
  boxId?: string;
}

export const POSITION_ZONES: PositionZone[] = [
  'tl', 'tc', 'tr',
  'ml', 'mc', 'mr',
  'bl', 'bc', 'br',
];

export const POSITION_LABELS: Record<PositionZone, string> = {
  tl: '左上', tc: '上中', tr: '右上',
  ml: '左中', mc: '中心', mr: '右中',
  bl: '左下', bc: '下中', br: '右下',
};

export const WEIGHT_UNIT_LABELS: Record<WeightUnit, string> = {
  kg: '公斤(kg)',
  jin: '斤',
  lb: '磅(lb)',
};

export const RISK_LEVEL_CONFIG: Record<RiskLevel, { label: string; bg: string; text: string; bar: string }> = {
  safe: { label: '安全', bg: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-500' },
  warning: { label: '警告', bg: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-500' },
  danger: { label: '超限', bg: 'bg-rose-50', text: 'text-rose-700', bar: 'bg-rose-500' },
};
