import { convertAllToGrams, adjustWeightsToTarget } from './unitConverter';
import { estimateFruitPureeSugar, calculateTotalSugar } from './sugarEstimator';
import { calculateFreezingPoint } from './freezingPoint';
import { calculateSolidsRatio } from './solidsCalculator';
import { assessRisks, generateKitchenInstructions } from './riskAssessor';
import { DEFAULT_INGREDIENTS } from './constants';
import type { IngredientInput, CalculationResult, CalculationStep } from './types';

export * from './types';
export * from './constants';
export * from './unitConverter';
export * from './sugarEstimator';
export * from './freezingPoint';
export * from './solidsCalculator';
export * from './riskAssessor';

export function calculateIceCream(input: IngredientInput): CalculationResult {
  const allSteps: CalculationStep[] = [];

  const conversionResult = convertAllToGrams(input);
  allSteps.push(...conversionResult.calculationSteps);

  const { adjusted: weights, calculationSteps: adjustSteps } = adjustWeightsToTarget(
    {
      milk: conversionResult.milk,
      cream: conversionResult.cream,
      sugar: conversionResult.sugar,
      fruitPuree: conversionResult.fruitPuree,
      alcohol: conversionResult.alcohol,
      stabilizer: conversionResult.stabilizer,
      total: conversionResult.total,
    },
    input.targetYield
  );
  allSteps.push(...adjustSteps);

  const fruitEstimate = estimateFruitPureeSugar(
    weights.fruitPuree,
    input.fruitPuree.sugarContent
  );
  allSteps.push(...fruitEstimate.calculationSteps);

  const sugarBreakdown = calculateTotalSugar({
    milk: weights.milk,
    cream: weights.cream,
    sugar: weights.sugar,
    fruitPureeSugar: fruitEstimate.sugar,
  });
  allSteps.push(...sugarBreakdown.calculationSteps);

  const { freezingPoint, alcoholContent, calculationSteps: fpSteps } = calculateFreezingPoint(
    weights,
    sugarBreakdown,
    input.alcohol.abv
  );
  allSteps.push(...fpSteps);

  const { solidsRatio, fatContent, sugarContent, stabilizerContent, calculationSteps: solidsSteps } = calculateSolidsRatio(
    weights,
    input.fruitPuree.sugarContent,
    sugarBreakdown.total
  );
  allSteps.push(...solidsSteps);

  const { risks, calculationSteps: riskSteps } = assessRisks(
    alcoholContent,
    fatContent,
    sugarContent,
    stabilizerContent,
    solidsRatio
  );
  allSteps.push(...riskSteps);

  const { instructions, calculationSteps: instructionSteps } = generateKitchenInstructions(
    freezingPoint,
    risks,
    input.alcohol.amount > 0
  );
  allSteps.push(...instructionSteps);

  return {
    freezingPoint,
    solidsRatio,
    fatContent,
    sugarContent,
    alcoholContent,
    stabilizerContent,
    weights,
    risks,
    calculationSteps: allSteps,
    kitchenInstructions: instructions,
  };
}

export function createDefaultIngredients(): IngredientInput {
  return JSON.parse(JSON.stringify(DEFAULT_INGREDIENTS));
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function formatNumber(num: number, decimals: number = 2): string {
  return num.toFixed(decimals);
}
