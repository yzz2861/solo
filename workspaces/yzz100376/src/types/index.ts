export type Unit = 'g' | 'kg' | '%';

export type IngredientCategory =
  | 'flour'
  | 'water'
  | 'salt'
  | 'sugar'
  | 'fat'
  | 'yeast'
  | 'starter'
  | 'other';

export interface Ingredient {
  id: string;
  name: string;
  value: number;
  unit: Unit;
  category: IngredientCategory;
  isHydrated?: boolean;
  hydrationRatio?: number;
}

export interface EnvironmentParams {
  targetYield: number;
  flourAbsorption: number;
  roomHumidity: number;
  starterRatio: number;
  starterHydration: number;
}

export interface CalculationStep {
  description: string;
  formula: string;
  result: string;
}

export interface AdjustmentNote {
  type: 'water' | 'salt' | 'sugar' | 'fat' | 'yeast' | 'warning' | 'info';
  description: string;
}

export interface FinalIngredient {
  name: string;
  value: number;
  category: IngredientCategory;
  note?: string;
  isWater?: boolean;
  isCritical?: boolean;
}

export interface ConversionResult {
  finalRecipe: FinalIngredient[];
  totalWeight: number;
  totalWater: number;
  calculationSteps: CalculationStep[];
  adjustments: AdjustmentNote[];
  boundaryWarnings: string[];
  scaleFactor: number;
  baseFlourWeight: number;
  inputSnapshot: {
    baseRecipe: Ingredient[];
    envParams: EnvironmentParams;
    timestamp: number;
  };
}

export type ResultView = 'kitchen' | 'manager' | 'workstation';
