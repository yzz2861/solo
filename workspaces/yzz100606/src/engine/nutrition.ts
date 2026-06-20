import { Ingredient, Formula, FormulaItem, NutritionStandard, NutritionResult, CalculationDetail, NutritionStatus } from '@/types';

function calculateNutrientValue(
  items: FormulaItem[],
  ingredients: Ingredient[],
  nutrientKey: keyof Ingredient
): number {
  return items.reduce((total, item) => {
    const ingredient = ingredients.find(i => i.id === item.ingredientId);
    if (!ingredient) return total;
    const ratioDecimal = item.ratio / 100;
    const nutrientValue = ingredient[nutrientKey] as number;
    return total + ratioDecimal * nutrientValue;
  }, 0);
}

function getNutritionStatus(actual: number, min: number, max?: number): NutritionStatus {
  if (actual < min * 0.95) return 'fail';
  if (actual < min) return 'warn';
  if (max && actual > max * 1.05) return 'fail';
  if (max && actual > max) return 'warn';
  return 'pass';
}

export function calculateNutrition(
  formula: Formula,
  ingredients: Ingredient[],
  standard: NutritionStandard
): NutritionResult {
  const crudeProteinActual = calculateNutrientValue(formula.items, ingredients, 'crudeProtein');
  const metabolizableEnergyActual = calculateNutrientValue(formula.items, ingredients, 'metabolizableEnergy');
  const calciumActual = calculateNutrientValue(formula.items, ingredients, 'calcium');
  const phosphorusActual = calculateNutrientValue(formula.items, ingredients, 'phosphorus');
  const lysineActual = calculateNutrientValue(formula.items, ingredients, 'lysine');

  return {
    crudeProtein: {
      actual: Number(crudeProteinActual.toFixed(2)),
      target: standard.minCrudeProtein,
      gap: Number((crudeProteinActual - standard.minCrudeProtein).toFixed(2)),
      status: getNutritionStatus(crudeProteinActual, standard.minCrudeProtein),
      unit: '%',
    },
    metabolizableEnergy: {
      actual: Number(metabolizableEnergyActual.toFixed(2)),
      target: standard.minMetabolizableEnergy,
      gap: Number((metabolizableEnergyActual - standard.minMetabolizableEnergy).toFixed(2)),
      status: getNutritionStatus(metabolizableEnergyActual, standard.minMetabolizableEnergy),
      unit: 'MJ/kg',
    },
    calcium: {
      actual: Number(calciumActual.toFixed(3)),
      min: standard.minCalcium,
      max: standard.maxCalcium,
      status: getNutritionStatus(calciumActual, standard.minCalcium, standard.maxCalcium),
      unit: '%',
    },
    phosphorus: {
      actual: Number(phosphorusActual.toFixed(3)),
      target: standard.minPhosphorus,
      gap: Number((phosphorusActual - standard.minPhosphorus).toFixed(3)),
      status: getNutritionStatus(phosphorusActual, standard.minPhosphorus),
      unit: '%',
    },
    lysine: {
      actual: Number(lysineActual.toFixed(3)),
      target: standard.minLysine,
      gap: Number((lysineActual - standard.minLysine).toFixed(3)),
      status: getNutritionStatus(lysineActual, standard.minLysine),
      unit: '%',
    },
  };
}

export function calculateDetails(
  formula: Formula,
  ingredients: Ingredient[],
  _standard: NutritionStandard
): CalculationDetail[] {
  return formula.items.map(item => {
    const ingredient = ingredients.find(i => i.id === item.ingredientId);
    if (!ingredient) return null;

    const ratioDecimal = item.ratio / 100;
    const quantity = formula.targetOutput * ratioDecimal;

    const contributions = [
      {
        nutrient: '粗蛋白',
        value: ingredient.crudeProtein,
        contribution: Number((ratioDecimal * ingredient.crudeProtein).toFixed(3)),
        unit: '%',
      },
      {
        nutrient: '代谢能',
        value: ingredient.metabolizableEnergy,
        contribution: Number((ratioDecimal * ingredient.metabolizableEnergy).toFixed(3)),
        unit: 'MJ/kg',
      },
      {
        nutrient: '钙',
        value: ingredient.calcium,
        contribution: Number((ratioDecimal * ingredient.calcium).toFixed(4)),
        unit: '%',
      },
      {
        nutrient: '磷',
        value: ingredient.phosphorus,
        contribution: Number((ratioDecimal * ingredient.phosphorus).toFixed(4)),
        unit: '%',
      },
      {
        nutrient: '赖氨酸',
        value: ingredient.lysine,
        contribution: Number((ratioDecimal * ingredient.lysine).toFixed(4)),
        unit: '%',
      },
    ];

    return {
      ingredientId: ingredient.id,
      ingredientName: ingredient.name,
      ratio: item.ratio,
      quantity: Number(quantity.toFixed(2)),
      contributions,
    };
  }).filter(Boolean) as CalculationDetail[];
}

export function generateAdjustmentSuggestions(
  nutrition: NutritionResult,
  ingredients: Ingredient[],
  formula: Formula
): string[] {
  const suggestions: string[] = [];

  if (nutrition.crudeProtein.status === 'fail' && nutrition.crudeProtein.gap < 0) {
    const highProteinIngredients = ingredients
      .filter(i => i.crudeProtein > 30 && formula.items.some(fi => fi.ingredientId === i.id))
      .map(i => i.name);
    if (highProteinIngredients.length > 0) {
      suggestions.push(`粗蛋白不足 ${Math.abs(nutrition.crudeProtein.gap).toFixed(2)}%，建议增加${highProteinIngredients.join('、')}的比例`);
    } else {
      suggestions.push(`粗蛋白不足 ${Math.abs(nutrition.crudeProtein.gap).toFixed(2)}%，建议添加高蛋白原料如豆粕、鱼粉等`);
    }
  }

  if (nutrition.metabolizableEnergy.status === 'fail' && nutrition.metabolizableEnergy.gap < 0) {
    suggestions.push(`代谢能不足 ${Math.abs(nutrition.metabolizableEnergy.gap).toFixed(2)} MJ/kg，建议增加玉米、小麦或油脂比例`);
  }

  if (nutrition.calcium.status === 'fail') {
    if (nutrition.calcium.actual < nutrition.calcium.min) {
      suggestions.push(`钙不足，建议添加石粉或磷酸氢钙补充`);
    } else {
      suggestions.push(`钙含量过高，可能影响磷吸收，建议减少含钙原料比例`);
    }
  }

  if (nutrition.phosphorus.status === 'fail' && nutrition.phosphorus.gap < 0) {
    suggestions.push(`磷不足，建议添加磷酸氢钙或调整预混料比例`);
  }

  if (nutrition.lysine.status === 'fail' && nutrition.lysine.gap < 0) {
    suggestions.push(`赖氨酸不足 ${Math.abs(nutrition.lysine.gap).toFixed(3)}%，建议增加豆粕或鱼粉比例`);
  }

  return suggestions;
}
