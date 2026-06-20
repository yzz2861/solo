import { Formula, Ingredient, InventoryResult } from '@/types';

export function calculateInventory(
  formula: Formula,
  ingredients: Ingredient[]
): InventoryResult {
  const result: InventoryResult = {};

  formula.items.forEach(item => {
    const ingredient = ingredients.find(i => i.id === item.ingredientId);
    if (!ingredient) return;

    const ratioDecimal = item.ratio / 100;
    const required = formula.targetOutput * ratioDecimal;
    const available = ingredient.inventory;
    const sufficient = available >= required;
    const shortage = sufficient ? 0 : required - available;

    result[item.ingredientId] = {
      required: Number(required.toFixed(2)),
      available: Number(available.toFixed(2)),
      sufficient,
      shortage: Number(shortage.toFixed(2)),
    };
  });

  return result;
}

export function calculateAvailableDays(
  formula: Formula,
  inventory: InventoryResult
): number {
  const days = Object.entries(inventory).map(([ingredientId, inv]) => {
    const formulaItem = formula.items.find(i => i.ingredientId === ingredientId);
    if (!formulaItem) return Infinity;

    const dailyUsage = formula.dailyConsumption * (formulaItem.ratio / 100);
    if (dailyUsage <= 0) return Infinity;

    return inv.available / dailyUsage;
  });

  const minDays = Math.min(...days);
  return Number(minDays.toFixed(1));
}

export function calculateCost(
  formula: Formula,
  ingredients: Ingredient[]
): { totalCost: number; costPerKg: number } {
  let totalCost = 0;

  formula.items.forEach(item => {
    const ingredient = ingredients.find(i => i.id === item.ingredientId);
    if (!ingredient) return;

    const ratioDecimal = item.ratio / 100;
    const quantity = formula.targetOutput * ratioDecimal;
    totalCost += quantity * ingredient.price;
  });

  const costPerKg = formula.targetOutput > 0 ? totalCost / formula.targetOutput : 0;

  return {
    totalCost: Number(totalCost.toFixed(2)),
    costPerKg: Number(costPerKg.toFixed(2)),
  };
}

export function getInventoryWarnings(
  inventory: InventoryResult,
  ingredients: Ingredient[]
): string[] {
  const warnings: string[] = [];

  Object.entries(inventory).forEach(([ingredientId, inv]) => {
    const ingredient = ingredients.find(i => i.id === ingredientId);
    if (!ingredient) return;

    if (!inv.sufficient) {
      warnings.push(`${ingredient.emoji} ${ingredient.name}库存不足：需要${inv.required}公斤，现有${inv.available}公斤，缺${inv.shortage}公斤`);
    } else if (inv.available < inv.required * 1.2) {
      warnings.push(`${ingredient.emoji} ${ingredient.name}库存偏低：现有${inv.available}公斤，仅够${((inv.available / inv.required) * 100).toFixed(0)}%的需求量`);
    }
  });

  return warnings;
}
