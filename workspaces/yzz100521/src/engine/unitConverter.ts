import { DENSITY } from './constants';
import type { Unit, IngredientInput, IngredientWeights } from './types';

type IngredientKey = keyof Omit<IngredientInput, 'targetYield'>;

export function convertToGrams(
  amount: number,
  unit: Unit,
  ingredient: IngredientKey,
  totalTargetWeight: number
): number {
  if (unit === 'g') return amount;
  if (unit === 'ml') {
    const density = DENSITY[ingredient];
    return amount * density;
  }
  if (unit === '%') {
    return (amount / 100) * totalTargetWeight;
  }
  return amount;
}

export function convertToGramsWithYield(
  amount: number,
  unit: Unit,
  ingredient: IngredientKey,
  targetYield: { amount: number; unit: 'g' | 'ml' }
): number {
  const totalTargetWeight = targetYield.unit === 'g'
    ? targetYield.amount
    : targetYield.amount * DENSITY.water;

  return convertToGrams(amount, unit, ingredient, totalTargetWeight);
}

export function convertAllToGrams(
  ingredients: IngredientInput
): IngredientWeights & { calculationSteps: Array<{ name: string; formula: string; variables: Record<string, number>; result: number }> } {
  const calculationSteps: Array<{ name: string; formula: string; variables: Record<string, number>; result: number }> = [];

  const totalTargetWeight = ingredients.targetYield.unit === 'g'
    ? ingredients.targetYield.amount
    : ingredients.targetYield.amount * DENSITY.water;

  calculationSteps.push({
    name: '目标产量换算为克',
    formula: ingredients.targetYield.unit === 'g'
      ? 'targetWeight = targetYield'
      : 'targetWeight = targetYield × waterDensity',
    variables: {
      targetYield: ingredients.targetYield.amount,
      waterDensity: DENSITY.water,
    },
    result: totalTargetWeight,
  });

  const keys: IngredientKey[] = ['milk', 'cream', 'sugar', 'fruitPuree', 'alcohol', 'stabilizer'];
  const weights: Partial<IngredientWeights> = {};

  keys.forEach((key) => {
    const input = ingredients[key];
    const weight = convertToGrams(input.amount, input.unit, key, totalTargetWeight);
    weights[key] = weight;

    let formula = '';
    const variables: Record<string, number> = { amount: input.amount };

    if (input.unit === 'g') {
      formula = 'weight = amount';
    } else if (input.unit === 'ml') {
      formula = 'weight = amount × density';
      variables.density = DENSITY[key];
    } else {
      formula = 'weight = (amount / 100) × totalTargetWeight';
      variables.totalTargetWeight = totalTargetWeight;
    }

    calculationSteps.push({
      name: `${key}换算为克`,
      formula,
      variables,
      result: weight,
    });
  });

  const total = keys.reduce((sum, key) => sum + (weights[key] || 0), 0);

  calculationSteps.push({
    name: '计算配料总重量',
    formula: 'total = milk + cream + sugar + fruitPuree + alcohol + stabilizer',
    variables: {
      milk: weights.milk || 0,
      cream: weights.cream || 0,
      sugar: weights.sugar || 0,
      fruitPuree: weights.fruitPuree || 0,
      alcohol: weights.alcohol || 0,
      stabilizer: weights.stabilizer || 0,
    },
    result: total,
  });

  return {
    milk: weights.milk || 0,
    cream: weights.cream || 0,
    sugar: weights.sugar || 0,
    fruitPuree: weights.fruitPuree || 0,
    alcohol: weights.alcohol || 0,
    stabilizer: weights.stabilizer || 0,
    total,
    calculationSteps,
  };
}

export function adjustWeightsToTarget(
  weights: IngredientWeights,
  targetYield: { amount: number; unit: 'g' | 'ml' }
): { adjusted: IngredientWeights; calculationSteps: Array<{ name: string; formula: string; variables: Record<string, number>; result: number }> } {
  const calculationSteps: Array<{ name: string; formula: string; variables: Record<string, number>; result: number }> = [];

  const targetWeight = targetYield.unit === 'g'
    ? targetYield.amount
    : targetYield.amount * DENSITY.water;

  const scaleFactor = targetWeight / weights.total;

  calculationSteps.push({
    name: '计算缩放系数',
    formula: 'scaleFactor = targetWeight / currentTotal',
    variables: {
      targetWeight,
      currentTotal: weights.total,
    },
    result: scaleFactor,
  });

  const keys: (keyof IngredientWeights)[] = ['milk', 'cream', 'sugar', 'fruitPuree', 'alcohol', 'stabilizer'];
  const adjusted: Partial<IngredientWeights> = {};

  keys.forEach((key) => {
    if (key === 'total') return;
    adjusted[key] = weights[key] * scaleFactor;

    calculationSteps.push({
      name: `调整${key}用量`,
      formula: 'adjusted = original × scaleFactor',
      variables: {
        original: weights[key],
        scaleFactor,
      },
      result: adjusted[key] || 0,
    });
  });

  adjusted.total = targetWeight;

  calculationSteps.push({
    name: '调整后总重量',
    formula: 'total = targetWeight',
    variables: { targetWeight },
    result: targetWeight,
  });

  return {
    adjusted: adjusted as IngredientWeights,
    calculationSteps,
  };
}
