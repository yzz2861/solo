import { CalculationResult, NutritionResult } from '@/types';

function calculateNutritionScore(nutrition: NutritionResult): number {
  const nutrients = [
    nutrition.crudeProtein,
    nutrition.metabolizableEnergy,
    nutrition.phosphorus,
    nutrition.lysine,
  ];

  let passCount = 0;
  let warnCount = 0;
  let failCount = 0;

  nutrients.forEach(n => {
    if (n.status === 'pass') passCount++;
    else if (n.status === 'warn') warnCount++;
    else failCount++;
  });

  if (nutrition.calcium.status === 'pass') passCount++;
  else if (nutrition.calcium.status === 'warn') warnCount++;
  else failCount++;

  const total = nutrients.length + 1;
  return ((passCount * 100 + warnCount * 60) / total);
}

function calculateInventoryScore(inventory: CalculationResult['inventory']): number {
  const items = Object.values(inventory);
  if (items.length === 0) return 100;

  const sufficientItems = items.filter(i => i.sufficient).length;
  const sufficientRate = sufficientItems / items.length;

  const totalShortage = items.reduce((sum, i) => sum + i.shortage, 0);
  const totalRequired = items.reduce((sum, i) => sum + i.required, 0);
  const shortageRate = totalRequired > 0 ? totalShortage / totalRequired : 0;

  return Math.max(0, sufficientRate * 100 - shortageRate * 50);
}

function calculateCostScore(costPerKg: number, allResults: CalculationResult[]): number {
  const allCosts = allResults.filter(r => r).map(r => r.costPerKg);
  if (allCosts.length === 0) return 100;

  const minCost = Math.min(...allCosts);
  const maxCost = Math.max(...allCosts);

  if (maxCost === minCost) return 100;

  return 100 - ((costPerKg - minCost) / (maxCost - minCost)) * 50;
}

export function calculatePlanScore(
  result: CalculationResult,
  allResults: CalculationResult[]
): number {
  const nutritionScore = calculateNutritionScore(result.nutrition);
  const inventoryScore = calculateInventoryScore(result.inventory);
  const costScore = calculateCostScore(result.costPerKg, allResults);

  const finalScore = nutritionScore * 0.4 + inventoryScore * 0.3 + costScore * 0.3;
  return Number(finalScore.toFixed(1));
}

export function comparePlans(results: (CalculationResult | null)[]): {
  bestPlanIndex: number;
  comparison: {
    metric: string;
    values: (number | string)[];
    bestIndex: number;
  }[];
} {
  const validResults = results.filter(r => r !== null) as CalculationResult[];
  if (validResults.length === 0) return { bestPlanIndex: -1, comparison: [] };

  const scores = results.map(r => r ? calculatePlanScore(r, validResults) : 0);
  const bestPlanIndex = scores.indexOf(Math.max(...scores));

  const comparison = [
    {
      metric: '综合评分',
      values: scores.map(s => s.toFixed(1)),
      bestIndex: bestPlanIndex,
    },
    {
      metric: '粗蛋白(%)',
      values: results.map(r => r ? `${r.nutrition.crudeProtein.actual}${r.nutrition.crudeProtein.status === 'fail' ? ' ❌' : r.nutrition.crudeProtein.status === 'warn' ? ' ⚠️' : ' ✓'}` : '-'),
      bestIndex: results.findIndex(r => r && r.nutrition.crudeProtein.status === 'pass'),
    },
    {
      metric: '代谢能(MJ/kg)',
      values: results.map(r => r ? `${r.nutrition.metabolizableEnergy.actual}${r.nutrition.metabolizableEnergy.status === 'fail' ? ' ❌' : r.nutrition.metabolizableEnergy.status === 'warn' ? ' ⚠️' : ' ✓'}` : '-'),
      bestIndex: results.findIndex(r => r && r.nutrition.metabolizableEnergy.status === 'pass'),
    },
    {
      metric: '钙(%)',
      values: results.map(r => r ? `${r.nutrition.calcium.actual}${r.nutrition.calcium.status === 'fail' ? ' ❌' : r.nutrition.calcium.status === 'warn' ? ' ⚠️' : ' ✓'}` : '-'),
      bestIndex: results.findIndex(r => r && r.nutrition.calcium.status === 'pass'),
    },
    {
      metric: '磷(%)',
      values: results.map(r => r ? `${r.nutrition.phosphorus.actual}${r.nutrition.phosphorus.status === 'fail' ? ' ❌' : r.nutrition.phosphorus.status === 'warn' ? ' ⚠️' : ' ✓'}` : '-'),
      bestIndex: results.findIndex(r => r && r.nutrition.phosphorus.status === 'pass'),
    },
    {
      metric: '可用天数',
      values: results.map(r => r ? r.availableDays : '-'),
      bestIndex: results.findIndex(r => r && r.availableDays === Math.max(...validResults.map(pr => pr.availableDays))),
    },
    {
      metric: '成本(元/公斤)',
      values: results.map(r => r ? r.costPerKg : '-'),
      bestIndex: results.findIndex(r => r && r.costPerKg === Math.min(...validResults.map(pr => pr.costPerKg))),
    },
    {
      metric: '库存充足',
      values: results.map(r => r ? (Object.values(r.inventory).every(i => i.sufficient) ? '是' : '否') : '-'),
      bestIndex: results.findIndex(r => r && Object.values(r.inventory).every(i => i.sufficient)),
    },
  ];

  return { bestPlanIndex, comparison };
}
