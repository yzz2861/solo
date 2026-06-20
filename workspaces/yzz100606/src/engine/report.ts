import { CalculationResult, Formula, Ingredient, NutritionStandard, ReplacementImpact } from '@/types';
import { generateAdjustmentSuggestions } from './nutrition';
import { getInventoryWarnings } from './inventory';

export function generateFarmerReport(
  result: CalculationResult,
  formula: Formula,
  ingredients: Ingredient[],
  standard: NutritionStandard
): string {
  const lines: string[] = [];

  lines.push('📋 饲料配方评估报告（养殖户版）');
  lines.push('='.repeat(40));
  lines.push(`📅 生成时间：${new Date().toLocaleDateString('zh-CN')}`);
  lines.push(`🐖 适用对象：${standard.name}`);
  lines.push(`📦 配料批次：${formula.targetOutput}公斤`);
  lines.push(`📆 日耗量：${formula.dailyConsumption}公斤/天`);
  lines.push('');

  lines.push('📊 营养达标情况');
  lines.push('-'.repeat(40));
  lines.push(`粗蛋白：${result.nutrition.crudeProtein.actual}%（目标≥${result.nutrition.crudeProtein.target}%）${result.nutrition.crudeProtein.status === 'pass' ? ' ✓ 达标' : result.nutrition.crudeProtein.status === 'warn' ? ' ⚠️ 偏低' : ' ❌ 不足'}`);
  lines.push(`代谢能：${result.nutrition.metabolizableEnergy.actual} MJ/kg（目标≥${result.nutrition.metabolizableEnergy.target}）${result.nutrition.metabolizableEnergy.status === 'pass' ? ' ✓ 达标' : result.nutrition.metabolizableEnergy.status === 'warn' ? ' ⚠️ 偏低' : ' ❌ 不足'}`);
  lines.push(`钙：${result.nutrition.calcium.actual}%（目标${result.nutrition.calcium.min}-${result.nutrition.calcium.max}%）${result.nutrition.calcium.status === 'pass' ? ' ✓ 达标' : result.nutrition.calcium.status === 'warn' ? ' ⚠️ 注意' : ' ❌ 异常'}`);
  lines.push(`磷：${result.nutrition.phosphorus.actual}%（目标≥${result.nutrition.phosphorus.target}%）${result.nutrition.phosphorus.status === 'pass' ? ' ✓ 达标' : result.nutrition.phosphorus.status === 'warn' ? ' ⚠️ 偏低' : ' ❌ 不足'}`);
  lines.push(`赖氨酸：${result.nutrition.lysine.actual}%（目标≥${result.nutrition.lysine.target}%）${result.nutrition.lysine.status === 'pass' ? ' ✓ 达标' : result.nutrition.lysine.status === 'warn' ? ' ⚠️ 偏低' : ' ❌ 不足'}`);
  lines.push('');

  lines.push('🏭 库存与成本');
  lines.push('-'.repeat(40));
  lines.push(`📆 现有库存可用：${result.availableDays}天`);
  lines.push(`💰 本次配料成本：${result.totalCost}元（${result.costPerKg}元/公斤）`);
  lines.push('');

  const inventoryWarnings = getInventoryWarnings(result.inventory, ingredients);
  if (inventoryWarnings.length > 0) {
    lines.push('⚠️ 库存提醒');
    lines.push('-'.repeat(40));
    inventoryWarnings.forEach(w => lines.push(`• ${w}`));
    lines.push('');
  }

  const suggestions = generateAdjustmentSuggestions(result.nutrition, ingredients, formula);
  if (suggestions.length > 0) {
    lines.push('💡 调整建议');
    lines.push('-'.repeat(40));
    suggestions.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
    lines.push('');
  }

  const allPass = Object.values(result.nutrition).every(n => n.status === 'pass') &&
                  Object.values(result.inventory).every(i => i.sufficient);

  if (allPass) {
    lines.push('✅ 结论：配方营养达标，库存充足，可以放心使用！');
  } else {
    lines.push('🔧 结论：需要根据以上建议调整配方或补充库存。');
  }

  return lines.join('\n');
}

export function generateTechnicianReport(
  result: CalculationResult,
  formula: Formula,
  ingredients: Ingredient[],
  standard: NutritionStandard
): string {
  const lines: string[] = [];

  lines.push('📋 饲料配方评估报告（技术员版）');
  lines.push('='.repeat(60));
  lines.push(`📅 生成时间：${new Date().toLocaleDateString('zh-CN')}`);
  lines.push(`🐖 适用对象：${standard.name}`);
  lines.push(`📦 配料批次：${formula.targetOutput}公斤`);
  lines.push(`📆 日耗量：${formula.dailyConsumption}公斤/天`);
  lines.push('');

  lines.push('🧪 原料配比与用量');
  lines.push('-'.repeat(60));
  lines.push('原料名称'.padEnd(10) + '配比(%)'.padEnd(10) + '用量(kg)'.padEnd(12) + '单价(元/kg)'.padEnd(12) + '小计(元)');
  lines.push('-'.repeat(60));

  formula.items.forEach(item => {
    const ingredient = ingredients.find(i => i.id === item.ingredientId);
    if (!ingredient) return;
    const quantity = formula.targetOutput * (item.ratio / 100);
    const subtotal = quantity * ingredient.price;
    lines.push(
      `${ingredient.emoji} ${ingredient.name}`.padEnd(12) +
      item.ratio.toFixed(1).padEnd(10) +
      quantity.toFixed(2).padEnd(12) +
      ingredient.price.toFixed(2).padEnd(12) +
      subtotal.toFixed(2)
    );
  });

  lines.push('-'.repeat(60));
  const totalRatio = formula.items.reduce((sum, i) => sum + i.ratio, 0);
  lines.push('合计'.padEnd(12) + totalRatio.toFixed(1).padEnd(10) + formula.targetOutput.toFixed(2).padEnd(12) + ''.padEnd(12) + result.totalCost.toFixed(2));
  lines.push('');

  lines.push('📊 营养指标折算明细');
  lines.push('-'.repeat(60));
  lines.push('营养指标'.padEnd(12) + '配方实际值'.padEnd(16) + '标准范围'.padEnd(16) + '差值'.padEnd(12) + '状态');
  lines.push('-'.repeat(60));

  lines.push(
    '粗蛋白(%)'.padEnd(12) +
    result.nutrition.crudeProtein.actual.toFixed(2).padEnd(16) +
    `≥${result.nutrition.crudeProtein.target}`.padEnd(16) +
    (result.nutrition.crudeProtein.gap >= 0 ? '+' : '') + result.nutrition.crudeProtein.gap.toFixed(2).padEnd(12) +
    (result.nutrition.crudeProtein.status === 'pass' ? '✓ 达标' : result.nutrition.crudeProtein.status === 'warn' ? '⚠️ 偏低' : '❌ 不足')
  );

  lines.push(
    '代谢能(MJ/kg)'.padEnd(12) +
    result.nutrition.metabolizableEnergy.actual.toFixed(2).padEnd(16) +
    `≥${result.nutrition.metabolizableEnergy.target}`.padEnd(16) +
    (result.nutrition.metabolizableEnergy.gap >= 0 ? '+' : '') + result.nutrition.metabolizableEnergy.gap.toFixed(2).padEnd(12) +
    (result.nutrition.metabolizableEnergy.status === 'pass' ? '✓ 达标' : result.nutrition.metabolizableEnergy.status === 'warn' ? '⚠️ 偏低' : '❌ 不足')
  );

  lines.push(
    '钙(%)'.padEnd(12) +
    result.nutrition.calcium.actual.toFixed(3).padEnd(16) +
    `${result.nutrition.calcium.min}-${result.nutrition.calcium.max}`.padEnd(16) +
    ''.padEnd(12) +
    (result.nutrition.calcium.status === 'pass' ? '✓ 达标' : result.nutrition.calcium.status === 'warn' ? '⚠️ 注意' : '❌ 异常')
  );

  lines.push(
    '磷(%)'.padEnd(12) +
    result.nutrition.phosphorus.actual.toFixed(3).padEnd(16) +
    `≥${result.nutrition.phosphorus.target}`.padEnd(16) +
    (result.nutrition.phosphorus.gap >= 0 ? '+' : '') + result.nutrition.phosphorus.gap.toFixed(3).padEnd(12) +
    (result.nutrition.phosphorus.status === 'pass' ? '✓ 达标' : result.nutrition.phosphorus.status === 'warn' ? '⚠️ 偏低' : '❌ 不足')
  );

  lines.push(
    '赖氨酸(%)'.padEnd(12) +
    result.nutrition.lysine.actual.toFixed(3).padEnd(16) +
    `≥${result.nutrition.lysine.target}`.padEnd(16) +
    (result.nutrition.lysine.gap >= 0 ? '+' : '') + result.nutrition.lysine.gap.toFixed(3).padEnd(12) +
    (result.nutrition.lysine.status === 'pass' ? '✓ 达标' : result.nutrition.lysine.status === 'warn' ? '⚠️ 偏低' : '❌ 不足')
  );

  lines.push('');

  lines.push('🔬 各项营养折算过程');
  lines.push('-'.repeat(60));

  result.calculationDetails.forEach(detail => {
    lines.push(`\n${detail.ingredientName}（占比${detail.ratio}%，用量${detail.quantity}kg）`);
    lines.push('  营养贡献：');
    detail.contributions.forEach(c => {
      lines.push(`    ${c.nutrient}：${c.value}${c.unit} × ${detail.ratio}% = ${c.contribution}${c.unit}`);
    });
  });

  lines.push('');
  lines.push('📦 库存检查明细');
  lines.push('-'.repeat(60));
  lines.push('原料名称'.padEnd(12) + '需求量(kg)'.padEnd(14) + '库存量(kg)'.padEnd(14) + '缺口(kg)'.padEnd(12) + '状态');
  lines.push('-'.repeat(60));

  Object.entries(result.inventory).forEach(([ingredientId, inv]) => {
    const ingredient = ingredients.find(i => i.id === ingredientId);
    if (!ingredient) return;
    lines.push(
      `${ingredient.emoji} ${ingredient.name}`.padEnd(14) +
      inv.required.toFixed(2).padEnd(14) +
      inv.available.toFixed(2).padEnd(14) +
      inv.shortage.toFixed(2).padEnd(12) +
      (inv.sufficient ? '✓ 充足' : '❌ 不足')
    );
  });

  lines.push('');
  lines.push(`📆 按日耗${formula.dailyConsumption}kg计算，可用${result.availableDays}天`);
  lines.push(`💰 综合评分：${result.score}分`);

  return lines.join('\n');
}

export function generateReplacementImpactReport(impact: ReplacementImpact): string {
  const lines: string[] = [];

  lines.push('🔄 原料替换影响分析');
  lines.push('='.repeat(40));
  lines.push(`替换：${impact.original} → ${impact.replacement}`);
  lines.push('');

  lines.push('📊 营养变化');
  lines.push('-'.repeat(40));
  impact.nutritionChanges.forEach(change => {
    const arrow = change.impact === 'increase' ? '↑' : change.impact === 'decrease' ? '↓' : '→';
    lines.push(`${arrow} ${change.nutrient}：${change.before.toFixed(2)} → ${change.after.toFixed(2)}`);
    lines.push(`   ${change.description}`);
  });

  lines.push('');
  lines.push('💰 成本变化');
  lines.push('-'.repeat(40));
  if (impact.costChange > 0) {
    lines.push(`↑ 成本增加：${impact.costChange.toFixed(2)}元/公斤`);
  } else if (impact.costChange < 0) {
    lines.push(`↓ 成本降低：${Math.abs(impact.costChange).toFixed(2)}元/公斤`);
  } else {
    lines.push('→ 成本不变');
  }

  lines.push('');
  lines.push('📦 库存变化');
  lines.push('-'.repeat(40));
  if (impact.inventoryChange > 0) {
    lines.push(`↑ 库存消耗增加：${impact.inventoryChange.toFixed(2)}公斤`);
  } else if (impact.inventoryChange < 0) {
    lines.push(`↓ 库存消耗减少：${Math.abs(impact.inventoryChange).toFixed(2)}公斤`);
  } else {
    lines.push('→ 库存消耗不变');
  }

  return lines.join('\n');
}
