export type Unit = 'kg' | 'portion' | 'plate';

export type Weather = 'sunny' | 'rainy' | 'cloudy' | 'snowy';

export type DishCategory = 'hot' | 'cold' | 'staple' | 'beverage';

export interface Dish {
  id: string;
  name: string;
  aliases: string[];
  defaultUnit: Unit;
  unitCost: number;
  conversionFactor: number;
  category: DishCategory;
}

export interface DishRecord {
  id: string;
  date: string;
  dishId: string;
  preparedQty: number;
  preparedUnit: Unit;
  leftoverQty: number | null;
  leftoverUnit: Unit | null;
  missingWeight: boolean;
  missingReason?: string;
}

export interface DailyRecord {
  date: string;
  occupancyRate: number;
  groupGuests: number;
  groupNote?: string;
  weather: Weather;
  specialNote?: string;
  dishRecords: DishRecord[];
}

export interface WasteAnalysis {
  date: string;
  dishId: string;
  dishName: string;
  wasteRate: number;
  wastedKg: number;
  wastedCost: number;
  isEstimated: boolean;
  note?: string;
}

export interface PrepSuggestion {
  dishId: string;
  dishName: string;
  suggestedQty: number;
  suggestedUnit: Unit;
  historicalAvg: number;
  adjustmentReason: 'weather' | 'occupancy' | 'group' | 'trend';
  confidence: 'high' | 'medium' | 'low';
}

export interface WeeklyErrorAnalysis {
  dishId: string;
  dishName: string;
  weekNumber: number;
  avgErrorRate: number;
  errorTrend: 'increasing' | 'decreasing' | 'stable';
  isSystematic: boolean;
  anomalyDates: string[];
}

export const UNIT_LABELS: Record<Unit, string> = {
  kg: '公斤',
  portion: '份',
  plate: '盘',
};

export const WEATHER_LABELS: Record<Weather, string> = {
  sunny: '晴',
  rainy: '雨',
  cloudy: '阴',
  snowy: '雪',
};

export const CATEGORY_LABELS: Record<DishCategory, string> = {
  hot: '热菜',
  cold: '凉菜',
  staple: '主食',
  beverage: '饮品',
};
