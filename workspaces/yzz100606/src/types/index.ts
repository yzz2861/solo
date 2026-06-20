export interface Ingredient {
  id: string;
  name: string;
  emoji: string;
  crudeProtein: number;
  metabolizableEnergy: number;
  calcium: number;
  phosphorus: number;
  lysine: number;
  methionine: number;
  price: number;
  priceNote: string;
  inventory: number;
}

export interface FormulaItem {
  ingredientId: string;
  ratio: number;
  replacedBy?: string;
}

export interface Formula {
  id: string;
  name: string;
  items: FormulaItem[];
  dailyConsumption: number;
  targetOutput: number;
  animalType: AnimalType;
}

export type AnimalType = 'pig' | 'chicken' | 'cattle' | 'sheep' | 'custom';

export interface NutritionStandard {
  name: string;
  animalType: AnimalType;
  minCrudeProtein: number;
  minMetabolizableEnergy: number;
  minCalcium: number;
  maxCalcium: number;
  minPhosphorus: number;
  minLysine: number;
}

export type NutritionStatus = 'pass' | 'warn' | 'fail';

export interface NutritionResultItem {
  actual: number;
  target: number;
  gap: number;
  status: NutritionStatus;
  unit: string;
}

export interface CalciumResult {
  actual: number;
  min: number;
  max: number;
  status: NutritionStatus;
  unit: string;
}

export interface NutritionResult {
  crudeProtein: NutritionResultItem;
  metabolizableEnergy: NutritionResultItem;
  calcium: CalciumResult;
  phosphorus: NutritionResultItem;
  lysine: NutritionResultItem;
}

export interface InventoryResult {
  [ingredientId: string]: {
    required: number;
    available: number;
    sufficient: boolean;
    shortage: number;
  };
}

export interface CalculationResult {
  nutrition: NutritionResult;
  inventory: InventoryResult;
  availableDays: number;
  totalCost: number;
  costPerKg: number;
  score: number;
  calculationDetails: CalculationDetail[];
}

export interface CalculationDetail {
  ingredientId: string;
  ingredientName: string;
  ratio: number;
  quantity: number;
  contributions: {
    nutrient: string;
    value: number;
    contribution: number;
    unit: string;
  }[];
}

export interface ReplacementImpact {
  original: string;
  replacement: string;
  nutritionChanges: {
    nutrient: string;
    before: number;
    after: number;
    impact: 'increase' | 'decrease' | 'neutral';
    description: string;
  }[];
  costChange: number;
  inventoryChange: number;
}

export interface ComparisonPlan {
  id: string;
  name: string;
  formula: Formula;
  result: CalculationResult | null;
}

export type ReportType = 'farmer' | 'technician';

export interface AppState {
  ingredients: Ingredient[];
  standards: NutritionStandard[];
  currentFormula: Formula;
  comparisonPlans: ComparisonPlan[];
  reportType: ReportType;
  showReplaceImpact: boolean;
  replacementImpact: ReplacementImpact | null;
}
