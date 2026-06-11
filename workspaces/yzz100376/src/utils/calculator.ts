import type {
  Ingredient,
  EnvironmentParams,
  ConversionResult,
  CalculationStep,
  AdjustmentNote,
  FinalIngredient,
  Unit,
  IngredientCategory,
} from '@/types';

export function roundTo(n: number, decimals: number = 1): number {
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}

export function formatWeight(grams: number): string {
  if (grams >= 1000) {
    return `${roundTo(grams / 1000, 2)}kg (${roundTo(grams, 0)}g)`;
  }
  return `${roundTo(grams, 1)}g`;
}

export function unitToGrams(
  value: number,
  unit: Unit,
  flourWeight: number
): number {
  switch (unit) {
    case 'g':
      return value;
    case 'kg':
      return value * 1000;
    case '%':
      return (flourWeight * value) / 100;
    default:
      return value;
  }
}

export function convertUnit(
  value: number,
  fromUnit: Unit,
  toUnit: Unit,
  flourWeight: number
): number {
  const grams = unitToGrams(value, fromUnit, flourWeight);
  switch (toUnit) {
    case 'g':
      return roundTo(grams, 1);
    case 'kg':
      return roundTo(grams / 1000, 3);
    case '%':
      return flourWeight > 0 ? roundTo((grams / flourWeight) * 100, 1) : 0;
    default:
      return value;
  }
}

export function getCategoryByName(name: string): IngredientCategory {
  const n = name.toLowerCase();
  if (n.includes('面粉') || n.includes('flour') || n.includes('粉')) return 'flour';
  if (n.includes('水') || n.includes('water') || n.includes('牛奶') || n.includes('milk') || n.includes('蛋液') || n.includes('egg')) return 'water';
  if (n.includes('盐') || n.includes('salt')) return 'salt';
  if (n.includes('糖') || n.includes('sugar') || n.includes('蜂蜜') || n.includes('honey')) return 'sugar';
  if (n.includes('油') || n.includes('黄油') || n.includes('butter') || n.includes('脂')) return 'fat';
  if (n.includes('酵母') || n.includes('yeast')) return 'yeast';
  if (n.includes('老面') || n.includes('starter') || n.includes('种')) return 'starter';
  return 'other';
}

export function isWaterContained(name: string): boolean {
  const n = name.toLowerCase();
  return (
    n.includes('老面') ||
    n.includes('starter') ||
    n.includes('中种') ||
    n.includes('汤种') ||
    n.includes('烫种')
  );
}

export interface StarterBreakdown {
  totalWeight: number;
  flourWeight: number;
  waterWeight: number;
  hydration: number;
}

export function breakdownStarter(
  starterTotalWeight: number,
  hydrationPercent: number
): StarterBreakdown {
  const flour = (starterTotalWeight * 100) / (100 + hydrationPercent);
  const water = (starterTotalWeight * hydrationPercent) / (100 + hydrationPercent);
  return {
    totalWeight: starterTotalWeight,
    flourWeight: flour,
    waterWeight: water,
    hydration: hydrationPercent,
  };
}

export function hasStarter(recipe: Ingredient[], envParams: EnvironmentParams): boolean {
  const hasStarterInRecipe = recipe.some(
    (i) => i.category === 'starter' || isWaterContained(i.name)
  );
  return hasStarterInRecipe || envParams.starterRatio > 0;
}

export function calculateConversion(
  baseRecipe: Ingredient[],
  envParams: EnvironmentParams
): ConversionResult {
  const steps: CalculationStep[] = [];
  const adjustments: AdjustmentNote[] = [];
  const boundaryWarnings: string[] = [];

  const baseFlourItem = baseRecipe.find((i) => i.category === 'flour');
  const baseFlourWeight = baseFlourItem
    ? unitToGrams(baseFlourItem.value, baseFlourItem.unit, 0)
    : 0;

  steps.push({
    description: '基准面粉重量',
    formula: '从配方中提取面粉量',
    result: formatWeight(baseFlourWeight),
  });

  const originalTotal = baseRecipe.reduce((sum, ing) => {
    return sum + unitToGrams(ing.value, ing.unit, baseFlourWeight);
  }, 0);

  const scaleFactor = baseFlourWeight > 0
    ? envParams.targetYield / originalTotal
    : 1;

  steps.push({
    description: '配方放大倍数',
    formula: `目标出品量 ÷ 原配方总重 = ${envParams.targetYield}g ÷ ${roundTo(originalTotal, 0)}g`,
    result: `${roundTo(scaleFactor, 2)}×`,
  });

  if (scaleFactor > 5) {
    boundaryWarnings.push('单次放大超过5倍，建议分批次制作，避免揉面不均、发酵不一致');
  }
  if (scaleFactor > 10) {
    boundaryWarnings.push('放大超过10倍，工业级生产需调整搅拌时间和发酵工艺');
  }

  const totalFlourWeight = baseFlourWeight * scaleFactor;
  steps.push({
    description: '总面粉量（放大后）',
    formula: `${roundTo(baseFlourWeight, 0)}g × ${roundTo(scaleFactor, 2)}`,
    result: formatWeight(totalFlourWeight),
  });

  const useStarter = hasStarter(baseRecipe, envParams);
  let starterBreakdown: StarterBreakdown | null = null;
  let mainFlourWeight = totalFlourWeight;

  if (useStarter && envParams.starterRatio > 0) {
    const starterTotal = (totalFlourWeight * envParams.starterRatio) / 100;
    starterBreakdown = breakdownStarter(starterTotal, envParams.starterHydration);
    mainFlourWeight = totalFlourWeight - starterBreakdown.flourWeight;

    steps.push({
      description: '老面总重量',
      formula: `总面粉量 × 老面比例 = ${roundTo(totalFlourWeight, 0)}g × ${envParams.starterRatio}%`,
      result: formatWeight(starterBreakdown.totalWeight),
    });

    steps.push({
      description: '老面中含有的面粉量',
      formula: `老面总重 × 100 ÷ (100 + 水合率) = ${roundTo(starterBreakdown.totalWeight, 0)}g × 100 ÷ ${100 + envParams.starterHydration}`,
      result: formatWeight(starterBreakdown.flourWeight),
    });

    steps.push({
      description: '老面中含有的水量',
      formula: `老面总重 × 水合率 ÷ (100 + 水合率) = ${roundTo(starterBreakdown.totalWeight, 0)}g × ${envParams.starterHydration} ÷ ${100 + envParams.starterHydration}`,
      result: formatWeight(starterBreakdown.waterWeight),
    });

    steps.push({
      description: '主配方需加面粉量',
      formula: `总面粉量 - 老面中面粉 = ${roundTo(totalFlourWeight, 0)}g - ${roundTo(starterBreakdown.flourWeight, 0)}g`,
      result: formatWeight(mainFlourWeight),
    });

    adjustments.push({
      type: 'info',
      description: `老面比例${envParams.starterRatio}%，老面重${formatWeight(starterBreakdown.totalWeight)}，其中自带面粉${formatWeight(starterBreakdown.flourWeight)}、自带水${formatWeight(starterBreakdown.waterWeight)}`,
    });

    adjustments.push({
      type: 'warning',
      description: `已扣除老面自带的水分 ${formatWeight(starterBreakdown.waterWeight)}，避免重复加水导致面团过湿。这是新人最容易出错的环节！`,
    });
  }

  const humidityCorrection = 1 - (envParams.roomHumidity - 60) * 0.003;
  steps.push({
    description: '湿度修正系数',
    formula: `1 - (室内湿度 - 60%) × 0.003 = 1 - (${envParams.roomHumidity} - 60) × 0.003`,
    result: roundTo(humidityCorrection, 4).toString(),
  });

  const targetAbsorptionWater = (totalFlourWeight * envParams.flourAbsorption) / 100;
  steps.push({
    description: '按吸水率计算理论总水量',
    formula: `总面粉量 × 吸水率 = ${roundTo(totalFlourWeight, 0)}g × ${envParams.flourAbsorption}%`,
    result: formatWeight(targetAbsorptionWater),
  });

  const totalWaterNeeded = targetAbsorptionWater * humidityCorrection;
  steps.push({
    description: '湿度修正后总水量（面团应含水总量）',
    formula: `${roundTo(targetAbsorptionWater, 0)}g × ${roundTo(humidityCorrection, 4)}`,
    result: formatWeight(totalWaterNeeded),
  });

  const starterWater = starterBreakdown?.waterWeight ?? 0;
  const actualWaterToAdd = Math.max(0, totalWaterNeeded - starterWater);

  if (useStarter && envParams.starterRatio > 0) {
    steps.push({
      description: '实际需加水量（扣除老面自带水）',
      formula: `总需水量 - 老面自带水 = ${roundTo(totalWaterNeeded, 0)}g - ${roundTo(starterWater, 0)}g`,
      result: formatWeight(actualWaterToAdd),
    });
  } else {
    steps.push({
      description: '实际需加水量',
      formula: `${roundTo(totalWaterNeeded, 0)}g（无老面，全部直接加）`,
      result: formatWeight(actualWaterToAdd),
    });
  }

  if (actualWaterToAdd > 5000) {
    boundaryWarnings.push('总水量超过5kg，大量水建议分次加入，先加80%观察面团状态再逐步补加');
  }

  const baseWaterItem = baseRecipe.find((i) => i.category === 'water' && !isWaterContained(i.name));
  const baseWaterWeight = baseWaterItem
    ? unitToGrams(baseWaterItem.value, baseWaterItem.unit, baseFlourWeight)
    : 0;

  const waterDiff = actualWaterToAdd - baseWaterWeight * scaleFactor;
  if (Math.abs(waterDiff) > 30) {
    const direction = waterDiff > 0 ? '增加' : '减少';
    let reason = '';
    if (useStarter && envParams.starterRatio > 0) {
      reason = '（含老面自带水扣减 + 湿度/吸水率调整）';
    } else {
      reason = `（吸水率${envParams.flourAbsorption}%、湿度${envParams.roomHumidity}%影响）`;
    }
    adjustments.push({
      type: 'water',
      description: `水量${direction} ${formatWeight(Math.abs(waterDiff))} ${reason}`,
    });
  }

  const finalRecipe: FinalIngredient[] = [];

  finalRecipe.push({
    name: '高筋面粉（主）',
    value: roundTo(mainFlourWeight, 0),
    category: 'flour',
    isCritical: true,
    note: useStarter && envParams.starterRatio > 0
      ? `总面粉${roundTo(totalFlourWeight, 0)}g - 老面带粉${roundTo(starterBreakdown!.flourWeight, 0)}g`
      : undefined,
  });

  finalRecipe.push({
    name: '水',
    value: roundTo(actualWaterToAdd, 0),
    category: 'water',
    isWater: true,
    isCritical: true,
    note: starterWater > 0
      ? `已扣老面含水${roundTo(starterWater, 0)}g`
      : undefined,
  });

  const categoryMap: Record<IngredientCategory, { total: number; names: string[] }> = {
    flour: { total: 0, names: [] },
    water: { total: 0, names: [] },
    salt: { total: 0, names: [] },
    sugar: { total: 0, names: [] },
    fat: { total: 0, names: [] },
    yeast: { total: 0, names: [] },
    starter: { total: 0, names: [] },
    other: { total: 0, names: [] },
  };

  baseRecipe.forEach((ing) => {
    if (ing.category === 'flour') return;
    if (ing.category === 'water' && !isWaterContained(ing.name)) return;
    if (ing.category === 'starter') return;

    const grams = unitToGrams(ing.value, ing.unit, baseFlourWeight);
    const scaled = grams * scaleFactor;
    categoryMap[ing.category].total += scaled;
    categoryMap[ing.category].names.push(ing.name);

    if (ing.value === 0) {
      adjustments.push({
        type: 'info',
        description: `${ing.name}为0，此配方不添加该原料`,
      });
    }
  });

  if (categoryMap.salt.total > 0) {
    finalRecipe.push({
      name: '盐',
      value: roundTo(categoryMap.salt.total, 1),
      category: 'salt',
    });
    const saltPct = (categoryMap.salt.total / totalFlourWeight) * 100;
    if (saltPct < 1.5) {
      adjustments.push({ type: 'salt', description: `盐量偏低(${roundTo(saltPct, 1)}%)，注意风味和发酵控制，建议不低于1.8%` });
    } else if (saltPct > 2.5) {
      adjustments.push({ type: 'salt', description: `盐量偏高(${roundTo(saltPct, 1)}%)，会抑制酵母活性，注意延长发酵时间` });
    }
  }

  if (categoryMap.sugar.total > 0) {
    finalRecipe.push({
      name: '糖',
      value: roundTo(categoryMap.sugar.total, 0),
      category: 'sugar',
    });
  }

  if (categoryMap.fat.total > 0) {
    finalRecipe.push({
      name: '油脂/黄油',
      value: roundTo(categoryMap.fat.total, 0),
      category: 'fat',
    });
  }

  let yeastTotal = categoryMap.yeast.total;
  if (envParams.starterRatio > 30 && yeastTotal > 0) {
    const yeastReduction = (envParams.starterRatio - 30) * 0.01;
    yeastTotal = yeastTotal * (1 - Math.min(yeastReduction, 0.5));
    adjustments.push({
      type: 'yeast',
      description: `老面比例${envParams.starterRatio}%较高，酵母用量减至${roundTo((1 - Math.min(yeastReduction, 0.5)) * 100, 0)}%`,
    });
  }
  if (yeastTotal > 0) {
    finalRecipe.push({
      name: '酵母',
      value: roundTo(yeastTotal, 1),
      category: 'yeast',
    });
  }

  if (starterBreakdown && starterBreakdown.totalWeight > 0) {
    finalRecipe.push({
      name: '老面/种面',
      value: roundTo(starterBreakdown.totalWeight, 0),
      category: 'starter',
      note: `${envParams.starterHydration}%水合 · 自带粉${roundTo(starterBreakdown.flourWeight, 0)}g · 自带水${roundTo(starterBreakdown.waterWeight, 0)}g`,
    });
  }

  categoryMap.other.names.forEach((name) => {
    const ing = baseRecipe.find((i) => i.name === name);
    if (ing) {
      const grams = unitToGrams(ing.value, ing.unit, baseFlourWeight);
      finalRecipe.push({
        name,
        value: roundTo(grams * scaleFactor, 1),
        category: 'other',
      });
    }
  });

  if (envParams.starterRatio > 40) {
    boundaryWarnings.push('老面比例超过40%，发酵速度会明显加快，注意缩短发酵时间，关注面团状态');
  }

  if (envParams.roomHumidity > 75) {
    boundaryWarnings.push('室内湿度>75%，面团易发黏，操作时多撒手粉，注意控制揉面程度');
  } else if (envParams.roomHumidity < 40) {
    boundaryWarnings.push('室内湿度<40%，面团表面易干皮，发酵时注意盖湿布保湿');
  }

  if (envParams.flourAbsorption > 70) {
    adjustments.push({ type: 'info', description: `吸水率${envParams.flourAbsorption}%偏高（高蛋白粉），揉面时注意面筋形成` });
  } else if (envParams.flourAbsorption < 55) {
    adjustments.push({ type: 'info', description: `吸水率${envParams.flourAbsorption}%偏低，可能是低筋粉或面粉较干` });
  }

  const totalWeight = finalRecipe.reduce((sum, i) => sum + i.value, 0);

  return {
    finalRecipe,
    totalWeight: roundTo(totalWeight, 0),
    totalWater: roundTo(totalWaterNeeded, 0),
    calculationSteps: steps,
    adjustments,
    boundaryWarnings,
    scaleFactor: roundTo(scaleFactor, 2),
    baseFlourWeight: roundTo(baseFlourWeight, 0),
    inputSnapshot: {
      baseRecipe: JSON.parse(JSON.stringify(baseRecipe)),
      envParams: { ...envParams },
      timestamp: Date.now(),
    },
  };
}

export const defaultRecipe: Ingredient[] = [
  { id: '1', name: '高筋面粉', value: 250, unit: 'g', category: 'flour' },
  { id: '2', name: '水', value: 162, unit: 'g', category: 'water' },
  { id: '3', name: '盐', value: 5, unit: 'g', category: 'salt' },
  { id: '4', name: '糖', value: 12, unit: 'g', category: 'sugar' },
  { id: '5', name: '黄油', value: 10, unit: 'g', category: 'fat' },
  { id: '6', name: '干酵母', value: 2.5, unit: 'g', category: 'yeast' },
  { id: '7', name: '老面', value: 50, unit: 'g', category: 'starter', isHydrated: true, hydrationRatio: 65 },
];

export const defaultEnvParams: EnvironmentParams = {
  targetYield: 500,
  flourAbsorption: 65,
  roomHumidity: 60,
  starterRatio: 20,
  starterHydration: 65,
};
