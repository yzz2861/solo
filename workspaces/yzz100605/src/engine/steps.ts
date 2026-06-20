import type { BufferInput, CalculationStep } from '@/types';
import { formatNumber } from './convert';

interface StepContext {
  C_acid: number;
  C_base: number;
  V_total_L: number;
  V_total_mL: number;
  ratio: number;
  V_acid_L: number;
  V_base_L: number;
  V_water_L: number;
  V_acid_mL: number;
  V_base_mL: number;
  V_water_mL: number;
  finalAcidConc: number;
  finalBaseConc: number;
  beta: number;
}

export function generateSteps(input: BufferInput, ctx: StepContext): CalculationStep[] {
  const steps: CalculationStep[] = [];
  const { C_acid, C_base, ratio, V_acid_mL, V_base_mL, V_water_mL, finalAcidConc, finalBaseConc, beta } = ctx;

  steps.push({
    step: 1,
    title: '写出 Henderson-Hasselbalch 方程',
    formula: 'pH = pKa + log([A⁻] / [HA])',
    substitution: `${input.targetPH} = ${input.pKa} + log([${input.baseName}] / [${input.acidName}])`,
    result: `等式成立，需 [${input.baseName}] / [${input.acidName}] = R`,
  });

  steps.push({
    step: 2,
    title: '计算碱/酸浓度比 R',
    formula: 'R = 10^(pH − pKa)',
    substitution: `R = 10^(${input.targetPH} − ${input.pKa}) = 10^${formatNumber(input.targetPH - input.pKa)}`,
    result: `R = ${formatNumber(ratio, 4)}`,
  });

  steps.push({
    step: 3,
    title: '换算母液浓度为 mol/L',
    formula: 'C = 输入值 × 单位换算系数',
    substitution: `C_${input.acidName} = ${formatNumber(input.acidConcentration)} ${input.acidConcentrationUnit} → ${formatNumber(C_acid, 4)} mol/L；C_${input.baseName} = ${formatNumber(input.baseConcentration)} ${input.baseConcentrationUnit} → ${formatNumber(C_base, 4)} mol/L`,
    result: `C_酸 = ${formatNumber(C_acid, 4)} mol/L，C_碱 = ${formatNumber(C_base, 4)} mol/L`,
  });

  steps.push({
    step: 4,
    title: '计算酸母液体积 V_acid',
    formula: 'V_acid = V_total × C_base / (C_base + R × C_acid)',
    substitution: `V_acid = ${formatNumber(ctx.V_total_mL)} mL × ${formatNumber(C_base, 4)} / (${formatNumber(C_base, 4)} + ${formatNumber(ratio, 4)} × ${formatNumber(C_acid, 4)})`,
    result: `V_acid = ${formatNumber(V_acid_mL, 2)} mL`,
  });

  steps.push({
    step: 5,
    title: '计算碱母液体积 V_base',
    formula: 'V_base = V_total × R × C_acid / (C_base + R × C_acid)',
    substitution: `V_base = ${formatNumber(ctx.V_total_mL)} mL × ${formatNumber(ratio, 4)} × ${formatNumber(C_acid, 4)} / (${formatNumber(C_base, 4)} + ${formatNumber(ratio, 4)} × ${formatNumber(C_acid, 4)})`,
    result: `V_base = ${formatNumber(V_base_mL, 2)} mL`,
  });

  steps.push({
    step: 6,
    title: '计算定容用水体积',
    formula: 'V_water = V_total − V_acid − V_base',
    substitution: `V_water = ${formatNumber(ctx.V_total_mL)} − ${formatNumber(V_acid_mL, 2)} − ${formatNumber(V_base_mL, 2)}`,
    result: `V_water = ${formatNumber(V_water_mL, 2)} mL`,
  });

  steps.push({
    step: 7,
    title: '验证最终浓度与缓冲容量',
    formula: 'β = 2.303 × [HA] × [A⁻] / ([HA] + [A⁻])',
    substitution: `[${input.acidName}] = ${formatNumber(finalAcidConc, 4)} mol/L, [${input.baseName}] = ${formatNumber(finalBaseConc, 4)} mol/L`,
    result: `缓冲容量 β = ${formatNumber(beta, 4)} mol/(L·pH)`,
  });

  return steps;
}
