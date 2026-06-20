import type { BufferInput, ValidationMessage } from '@/types';
import { concentrationToMolL, volumeToL } from './convert';

export function validate(input: BufferInput): ValidationMessage[] {
  const messages: ValidationMessage[] = [];

  if (!input.acidName.trim()) {
    messages.push({
      level: 'error',
      rule: 'acid_name_empty',
      message: '请输入酸组分名称',
      suggestion: '例如：乙酸、HAc、H₃PO₄',
    });
  }

  if (!input.baseName.trim()) {
    messages.push({
      level: 'error',
      rule: 'base_name_empty',
      message: '请输入碱组分名称',
      suggestion: '例如：乙酸钠、NaAc、Na₂HPO₄',
    });
  }

  if (isNaN(input.pKa) || input.pKa < 0 || input.pKa > 14) {
    messages.push({
      level: 'error',
      rule: 'pka_invalid',
      message: `pKa = ${input.pKa} 不在合理范围（0–14）`,
      suggestion: '请检查 pKa 值是否正确',
    });
  }

  if (isNaN(input.targetPH) || input.targetPH < 0 || input.targetPH > 14) {
    messages.push({
      level: 'error',
      rule: 'ph_invalid',
      message: `目标 pH = ${input.targetPH} 不在合理范围（0–14）`,
      suggestion: 'pH 值应在 0–14 之间',
    });
  }

  if (input.acidConcentration <= 0) {
    messages.push({
      level: 'error',
      rule: 'acid_conc_zero',
      message: '酸母液浓度不能为零或负数',
      suggestion: '请输入正确的母液浓度',
    });
  }

  if (input.baseConcentration <= 0) {
    messages.push({
      level: 'error',
      rule: 'base_conc_zero',
      message: '碱母液浓度不能为零或负数',
      suggestion: '请输入正确的母液浓度',
    });
  }

  if (input.targetVolume <= 0) {
    messages.push({
      level: 'error',
      rule: 'volume_zero',
      message: '目标体积不能为零或负数',
      suggestion: '请输入正确的目标体积',
    });
  }

  if (input.acidConcentration > 0 && input.baseConcentration > 0 && input.targetVolume > 0) {
    const deltaPH = Math.abs(input.targetPH - input.pKa);

    if (deltaPH > 2.5) {
      messages.push({
        level: 'error',
        rule: 'ph_out_of_range',
        message: `目标 pH 与 pKa 偏差 ${deltaPH.toFixed(2)}，超出有效缓冲范围（±2.5）`,
        suggestion: `该缓冲体系无法在 pH ${input.targetPH} 有效工作，建议选择 pKa 接近 ${input.targetPH} 的缓冲对`,
      });
    } else if (deltaPH > 1.5) {
      messages.push({
        level: 'warning',
        rule: 'ph_weak_buffer',
        message: `目标 pH 与 pKa 偏差 ${deltaPH.toFixed(2)}，缓冲能力较弱`,
        suggestion: `有效缓冲范围通常为 pKa ±1（即 ${Math.max(0, input.pKa - 1).toFixed(1)} – ${Math.min(14, input.pKa + 1).toFixed(1)}），建议调整 pH 或更换缓冲体系`,
      });
    }

    const C_acid = concentrationToMolL(input.acidConcentration, input.acidConcentrationUnit);
    const C_base = concentrationToMolL(input.baseConcentration, input.baseConcentrationUnit);
    const V_total_L = volumeToL(input.targetVolume, input.targetVolumeUnit);
    const ratio = Math.pow(10, input.targetPH - input.pKa);
    const V_acid_L = V_total_L * C_base / (C_base + ratio * C_acid);
    const V_base_L = V_total_L * ratio * C_acid / (C_base + ratio * C_acid);
    const V_acid_mL = V_acid_L * 1000;
    const V_base_mL = V_base_L * 1000;

    if (V_acid_mL < 0.01) {
      messages.push({
        level: 'warning',
        rule: 'acid_volume_tiny',
        message: `酸母液体积仅 ${V_acid_mL.toFixed(4)} mL，难以精确量取`,
        suggestion: '建议提高酸母液浓度或降低碱母液浓度',
      });
    }

    if (V_base_mL < 0.01) {
      messages.push({
        level: 'warning',
        rule: 'base_volume_tiny',
        message: `碱母液体积仅 ${V_base_mL.toFixed(4)} mL，难以精确量取`,
        suggestion: '建议提高碱母液浓度或降低酸母液浓度',
      });
    }

    const totalBufferConc = C_acid * V_acid_L / V_total_L + C_base * V_base_L / V_total_L;
    if (totalBufferConc < 0.001) {
      messages.push({
        level: 'warning',
        rule: 'buffer_very_dilute',
        message: `最终缓冲液总浓度仅 ${(totalBufferConc * 1000).toFixed(2)} mM，缓冲能力极弱`,
        suggestion: '建议提高母液浓度',
      });
    }
  }

  if (input.acidConcentrationUnit !== input.baseConcentrationUnit) {
    messages.push({
      level: 'info',
      rule: 'unit_mismatch',
      message: `酸/碱母液使用不同浓度单位（${input.acidConcentrationUnit} vs ${input.baseConcentrationUnit}）`,
      suggestion: '已自动统一换算为 mol/L 进行计算',
    });
  }

  return messages;
}
