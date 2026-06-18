import { COMPOSITION } from './constants';
import type { CalculationStep } from './types';

export function calculateSolidsRatio(
  weights: {
    milk: number;
    cream: number;
    sugar: number;
    fruitPuree: number;
    alcohol: number;
    stabilizer: number;
    total: number;
  },
  fruitSugarLevel: 'low' | 'medium' | 'high',
  totalSugarWeight: number
): {
  solidsRatio: number;
  fatContent: number;
  sugarContent: number;
  stabilizerContent: number;
  calculationSteps: CalculationStep[];
} {
  const calculationSteps: CalculationStep[] = [];

  const fruitComposition = COMPOSITION.fruitPuree[fruitSugarLevel];

  const milkSolids = weights.milk * COMPOSITION.milk.solids;
  const creamSolids = weights.cream * COMPOSITION.cream.solids;
  const sugarSolids = weights.sugar * COMPOSITION.sugar.solids;
  const fruitSolids = weights.fruitPuree * fruitComposition.solids;
  const alcoholSolids = weights.alcohol * COMPOSITION.alcohol.solids;
  const stabilizerSolids = weights.stabilizer * COMPOSITION.stabilizer.solids;

  calculationSteps.push({
    name: '牛奶固形物',
    formula: 'milkSolids = milkWeight × milkSolidsRatio',
    variables: {
      milkWeight: weights.milk,
      milkSolidsRatio: COMPOSITION.milk.solids,
    },
    result: milkSolids,
    unit: 'g',
  });

  calculationSteps.push({
    name: '奶油固形物',
    formula: 'creamSolids = creamWeight × creamSolidsRatio',
    variables: {
      creamWeight: weights.cream,
      creamSolidsRatio: COMPOSITION.cream.solids,
    },
    result: creamSolids,
    unit: 'g',
  });

  calculationSteps.push({
    name: '蔗糖固形物',
    formula: 'sugarSolids = sugarWeight × sugarSolidsRatio',
    variables: {
      sugarWeight: weights.sugar,
      sugarSolidsRatio: COMPOSITION.sugar.solids,
    },
    result: sugarSolids,
    unit: 'g',
  });

  calculationSteps.push({
    name: '果泥固形物',
    formula: 'fruitSolids = fruitPureeWeight × fruitSolidsRatio',
    variables: {
      fruitPureeWeight: weights.fruitPuree,
      fruitSolidsRatio: fruitComposition.solids,
    },
    result: fruitSolids,
    unit: 'g',
  });

  calculationSteps.push({
    name: '酒精固形物',
    formula: 'alcoholSolids = alcoholWeight × alcoholSolidsRatio',
    variables: {
      alcoholWeight: weights.alcohol,
      alcoholSolidsRatio: COMPOSITION.alcohol.solids,
    },
    result: alcoholSolids,
    unit: 'g',
  });

  calculationSteps.push({
    name: '稳定剂固形物',
    formula: 'stabilizerSolids = stabilizerWeight × stabilizerSolidsRatio',
    variables: {
      stabilizerWeight: weights.stabilizer,
      stabilizerSolidsRatio: COMPOSITION.stabilizer.solids,
    },
    result: stabilizerSolids,
    unit: 'g',
  });

  const totalSolids = milkSolids + creamSolids + sugarSolids + fruitSolids + alcoholSolids + stabilizerSolids;

  calculationSteps.push({
    name: '总固形物重量',
    formula: 'totalSolids = milkSolids + creamSolids + sugarSolids + fruitSolids + alcoholSolids + stabilizerSolids',
    variables: {
      milkSolids,
      creamSolids,
      sugarSolids,
      fruitSolids,
      alcoholSolids,
      stabilizerSolids,
    },
    result: totalSolids,
    unit: 'g',
  });

  const solidsRatio = (totalSolids / weights.total) * 100;

  calculationSteps.push({
    name: '固形物比例',
    formula: 'solidsRatio = (totalSolids / totalWeight) × 100',
    variables: {
      totalSolids,
      totalWeight: weights.total,
    },
    result: solidsRatio,
    unit: '%',
  });

  const milkFat = weights.milk * COMPOSITION.milk.fat;
  const creamFat = weights.cream * COMPOSITION.cream.fat;
  const totalFat = milkFat + creamFat;

  calculationSteps.push({
    name: '牛奶脂肪含量',
    formula: 'milkFat = milkWeight × milkFatRatio',
    variables: {
      milkWeight: weights.milk,
      milkFatRatio: COMPOSITION.milk.fat,
    },
    result: milkFat,
    unit: 'g',
  });

  calculationSteps.push({
    name: '奶油脂肪含量',
    formula: 'creamFat = creamWeight × creamFatRatio',
    variables: {
      creamWeight: weights.cream,
      creamFatRatio: COMPOSITION.cream.fat,
    },
    result: creamFat,
    unit: 'g',
  });

  calculationSteps.push({
    name: '总脂肪含量',
    formula: 'totalFat = milkFat + creamFat',
    variables: {
      milkFat,
      creamFat,
    },
    result: totalFat,
    unit: 'g',
  });

  const fatContent = (totalFat / weights.total) * 100;

  calculationSteps.push({
    name: '脂肪比例',
    formula: 'fatContent = (totalFat / totalWeight) × 100',
    variables: {
      totalFat,
      totalWeight: weights.total,
    },
    result: fatContent,
    unit: '%',
  });

  const sugarContent = (totalSugarWeight / weights.total) * 100;

  calculationSteps.push({
    name: '总糖比例',
    formula: 'sugarContent = (totalSugarWeight / totalWeight) × 100',
    variables: {
      totalSugarWeight,
      totalWeight: weights.total,
    },
    result: sugarContent,
    unit: '%',
  });

  const stabilizerContent = (weights.stabilizer / weights.total) * 100;

  calculationSteps.push({
    name: '稳定剂比例',
    formula: 'stabilizerContent = (stabilizerWeight / totalWeight) × 100',
    variables: {
      stabilizerWeight: weights.stabilizer,
      totalWeight: weights.total,
    },
    result: stabilizerContent,
    unit: '%',
  });

  return {
    solidsRatio,
    fatContent,
    sugarContent,
    stabilizerContent,
    calculationSteps,
  };
}
