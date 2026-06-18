export type Unit = 'g' | 'ml' | '%';
export type SugarContentLevel = 'low' | 'medium' | 'high';

export interface IngredientInput {
  milk: { amount: number; unit: Unit };
  cream: { amount: number; unit: Unit };
  sugar: { amount: number; unit: Unit };
  fruitPuree: {
    amount: number;
    unit: Unit;
    sugarContent: SugarContentLevel;
  };
  alcohol: { amount: number; unit: Unit; abv: number };
  stabilizer: { amount: number; unit: Unit };
  targetYield: { amount: number; unit: 'g' | 'ml' };
}

export interface IngredientWeights {
  milk: number;
  cream: number;
  sugar: number;
  fruitPuree: number;
  alcohol: number;
  stabilizer: number;
  total: number;
}

export interface CalculationStep {
  name: string;
  formula: string;
  variables: Record<string, number | string | boolean>;
  result: number;
  unit?: string;
}

export interface Risk {
  type: 'alcohol_high' | 'fat_low' | 'sugar_high' | 'stabilizer_high';
  level: 'warning' | 'danger';
  message: string;
}

export interface KitchenInstruction {
  step: number;
  title: string;
  description: string;
  observationPoint: string;
  timing?: string;
}

export interface CalculationResult {
  freezingPoint: number;
  solidsRatio: number;
  fatContent: number;
  sugarContent: number;
  alcoholContent: number;
  stabilizerContent: number;
  weights: IngredientWeights;
  risks: Risk[];
  calculationSteps: CalculationStep[];
  kitchenInstructions: KitchenInstruction[];
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecipeVersion {
  id: string;
  recipeId: string;
  versionNumber: number;
  ingredients: IngredientInput;
  calculationResult: CalculationResult;
  notes: string;
  createdAt: string;
}

export interface Feedback {
  id: string;
  recipeVersionId: string;
  iceCrystalScore: number;
  creaminessScore: number;
  sweetnessScore: number;
  flavorScore: number;
  notes: string;
  createdAt: string;
}
