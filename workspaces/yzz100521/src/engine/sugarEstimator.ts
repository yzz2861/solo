import { COMPOSITION, FRUIT_SUGAR_CONTENT, SUGAR_CONTENT_LABELS } from './constants';
import type { SugarContentLevel, CalculationStep } from './types';

export function estimateFruitPureeSugar(
  fruitPureeWeight: number,
  sugarContentLevel: SugarContentLevel
): { sugar: number; solids: number; water: number; calculationSteps: CalculationStep[] } {
  const composition = COMPOSITION.fruitPuree[sugarContentLevel];
  const calculationSteps: CalculationStep[] = [];

  calculationSteps.push({
    name: '确定果泥含糖量等级',
    formula: '使用预设含糖量比例',
    variables: {
      sugarContentLevel,
      sugarPercent: composition.sugar * 100,
      solidsPercent: composition.solids * 100,
      description: SUGAR_CONTENT_LABELS[sugarContentLevel].description,
    },
    result: composition.sugar,
  });

  const sugar = fruitPureeWeight * composition.sugar;
  const solids = fruitPureeWeight * composition.solids;
  const water = fruitPureeWeight * composition.water;

  calculationSteps.push({
    name: '计算果泥中糖的重量',
    formula: 'sugar = fruitPureeWeight × sugarRatio',
    variables: {
      fruitPureeWeight,
      sugarRatio: composition.sugar,
    },
    result: sugar,
  });

  calculationSteps.push({
    name: '计算果泥中固形物重量',
    formula: 'solids = fruitPureeWeight × solidsRatio',
    variables: {
      fruitPureeWeight,
      solidsRatio: composition.solids,
    },
    result: solids,
  });

  calculationSteps.push({
    name: '计算果泥中水分重量',
    formula: 'water = fruitPureeWeight × waterRatio',
    variables: {
      fruitPureeWeight,
      waterRatio: composition.water,
    },
    result: water,
  });

  return { sugar, solids, water, calculationSteps };
}

export function calculateTotalSugar(
  weights: {
    milk: number;
    cream: number;
    sugar: number;
    fruitPureeSugar: number;
  }
): { total: number; bySource: { milk: number; cream: number; added: number; fruit: number }; calculationSteps: CalculationStep[] } {
  const calculationSteps: CalculationStep[] = [];

  const milkSugar = weights.milk * COMPOSITION.milk.sugar;
  const creamSugar = weights.cream * COMPOSITION.cream.sugar;
  const addedSugar = weights.sugar * COMPOSITION.sugar.sugar;
  const fruitSugar = weights.fruitPureeSugar;

  calculationSteps.push({
    name: '牛奶中的乳糖',
    formula: 'milkSugar = milkWeight × milkSugarRatio',
    variables: {
      milkWeight: weights.milk,
      milkSugarRatio: COMPOSITION.milk.sugar,
    },
    result: milkSugar,
  });

  calculationSteps.push({
    name: '奶油中的乳糖',
    formula: 'creamSugar = creamWeight × creamSugarRatio',
    variables: {
      creamWeight: weights.cream,
      creamSugarRatio: COMPOSITION.cream.sugar,
    },
    result: creamSugar,
  });

  calculationSteps.push({
    name: '添加的蔗糖',
    formula: 'addedSugar = sugarWeight × sugarRatio',
    variables: {
      sugarWeight: weights.sugar,
      sugarRatio: COMPOSITION.sugar.sugar,
    },
    result: addedSugar,
  });

  calculationSteps.push({
    name: '果泥中的果糖',
    formula: 'fruitSugar = fruitPureeSugar (已计算)',
    variables: {
      fruitPureeSugar: weights.fruitPureeSugar,
    },
    result: fruitSugar,
  });

  const total = milkSugar + creamSugar + addedSugar + fruitSugar;

  calculationSteps.push({
    name: '总糖含量',
    formula: 'totalSugar = milkSugar + creamSugar + addedSugar + fruitSugar',
    variables: {
      milkSugar,
      creamSugar,
      addedSugar,
      fruitSugar,
    },
    result: total,
  });

  return {
    total,
    bySource: {
      milk: milkSugar,
      cream: creamSugar,
      added: addedSugar,
      fruit: fruitSugar,
    },
    calculationSteps,
  };
}

export function suggestFruitType(fruitName: string): SugarContentLevel {
  const normalizedName = fruitName.toLowerCase().trim();
  
  for (const [key, value] of Object.entries(FRUIT_SUGAR_CONTENT)) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) {
      return value.level;
    }
  }
  
  return 'medium';
}
