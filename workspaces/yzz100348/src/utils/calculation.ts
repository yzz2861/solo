import type { CalculationInput, CalculationResult, CalculationStep, CalculationWarning } from '@/types';

function toMgPerH(doseValue: number, doseUnit: string, weight: number, plannedTime: number, timeUnit: string): { value: number | null; steps: CalculationStep[] } {
  const steps: CalculationStep[] = [];
  let mgPerH: number | null = null;

  switch (doseUnit) {
    case 'mg/kg/min': {
      if (!weight || weight <= 0) {
        steps.push({ label: '计算绝对剂量率', formula: `${doseValue} mg/kg/min × ${weight} kg`, result: '⚠ 体重缺失，无法计算' });
        return { value: null, steps };
      }
      const mgPerMin = doseValue * weight;
      mgPerH = mgPerMin * 60;
      steps.push({ label: '体重剂量率 → 绝对剂量率', formula: `${doseValue} mg/kg/min × ${weight} kg = ${fmt(mgPerMin)} mg/min`, result: `${fmt(mgPerMin)} mg/min` });
      steps.push({ label: 'mg/min → mg/h', formula: `${fmt(mgPerMin)} mg/min × 60 = ${fmt(mgPerH)} mg/h`, result: `${fmt(mgPerH)} mg/h` });
      break;
    }
    case 'μg/kg/h': {
      if (!weight || weight <= 0) {
        steps.push({ label: '计算绝对剂量率', formula: `${doseValue} μg/kg/h × ${weight} kg`, result: '⚠ 体重缺失，无法计算' });
        return { value: null, steps };
      }
      const ugPerH = doseValue * weight;
      mgPerH = ugPerH / 1000;
      steps.push({ label: '体重剂量率 → 绝对剂量率', formula: `${doseValue} μg/kg/h × ${weight} kg = ${fmt(ugPerH)} μg/h`, result: `${fmt(ugPerH)} μg/h` });
      steps.push({ label: 'μg/h → mg/h', formula: `${fmt(ugPerH)} μg/h ÷ 1000 = ${fmt(mgPerH)} mg/h`, result: `${fmt(mgPerH)} mg/h` });
      break;
    }
    case 'mg/h': {
      mgPerH = doseValue;
      steps.push({ label: '医嘱剂量率', formula: `${doseValue} mg/h`, result: `${fmt(mgPerH)} mg/h` });
      break;
    }
    case 'μg/h': {
      mgPerH = doseValue / 1000;
      steps.push({ label: 'μg/h → mg/h', formula: `${doseValue} μg/h ÷ 1000 = ${fmt(mgPerH)} mg/h`, result: `${fmt(mgPerH)} mg/h` });
      break;
    }
    case 'mg': {
      const timeH = toHours(plannedTime, timeUnit);
      if (!timeH || timeH <= 0) {
        steps.push({ label: '计算剂量率', formula: `${doseValue} mg ÷ 时间`, result: '⚠ 时间缺失，无法计算' });
        return { value: null, steps };
      }
      mgPerH = doseValue / timeH;
      steps.push({ label: '总量 → 剂量率', formula: `${doseValue} mg ÷ ${fmt(timeH)} h = ${fmt(mgPerH)} mg/h`, result: `${fmt(mgPerH)} mg/h` });
      break;
    }
    case 'μg': {
      const timeH2 = toHours(plannedTime, timeUnit);
      if (!timeH2 || timeH2 <= 0) {
        steps.push({ label: '计算剂量率', formula: `${doseValue} μg ÷ 时间`, result: '⚠ 时间缺失，无法计算' });
        return { value: null, steps };
      }
      const mgValue = doseValue / 1000;
      mgPerH = mgValue / timeH2;
      steps.push({ label: 'μg → mg', formula: `${doseValue} μg ÷ 1000 = ${fmt(mgValue)} mg`, result: `${fmt(mgValue)} mg` });
      steps.push({ label: '总量 → 剂量率', formula: `${fmt(mgValue)} mg ÷ ${fmt(timeH2)} h = ${fmt(mgPerH)} mg/h`, result: `${fmt(mgPerH)} mg/h` });
      break;
    }
    case 'g': {
      const timeH3 = toHours(plannedTime, timeUnit);
      if (!timeH3 || timeH3 <= 0) {
        steps.push({ label: '计算剂量率', formula: `${doseValue} g ÷ 时间`, result: '⚠ 时间缺失，无法计算' });
        return { value: null, steps };
      }
      const mgFromG = doseValue * 1000;
      mgPerH = mgFromG / timeH3;
      steps.push({ label: 'g → mg', formula: `${doseValue} g × 1000 = ${fmt(mgFromG)} mg`, result: `${fmt(mgFromG)} mg` });
      steps.push({ label: '总量 → 剂量率', formula: `${fmt(mgFromG)} mg ÷ ${fmt(timeH3)} h = ${fmt(mgPerH)} mg/h`, result: `${fmt(mgPerH)} mg/h` });
      break;
    }
  }

  return { value: mgPerH, steps };
}

function concentrationToMgPerMl(concentration: number, unit: string): { value: number | null; steps: CalculationStep[] } {
  const steps: CalculationStep[] = [];
  let mgPerMl: number | null = null;

  switch (unit) {
    case 'mg/mL':
      mgPerMl = concentration;
      steps.push({ label: '药液浓度', formula: `${concentration} mg/mL`, result: `${fmt(mgPerMl)} mg/mL` });
      break;
    case 'μg/mL':
      mgPerMl = concentration / 1000;
      steps.push({ label: 'μg/mL → mg/mL', formula: `${concentration} μg/mL ÷ 1000 = ${fmt(mgPerMl)} mg/mL`, result: `${fmt(mgPerMl)} mg/mL` });
      break;
    case 'g/mL':
      mgPerMl = concentration * 1000;
      steps.push({ label: 'g/mL → mg/mL', formula: `${concentration} g/mL × 1000 = ${fmt(mgPerMl)} mg/mL`, result: `${fmt(mgPerMl)} mg/mL` });
      break;
    case 'mg/50mL':
      mgPerMl = concentration / 50;
      steps.push({ label: 'mg/50mL → mg/mL', formula: `${concentration} mg ÷ 50 mL = ${fmt(mgPerMl)} mg/mL`, result: `${fmt(mgPerMl)} mg/mL` });
      break;
    case 'mg/100mL':
      mgPerMl = concentration / 100;
      steps.push({ label: 'mg/100mL → mg/mL', formula: `${concentration} mg ÷ 100 mL = ${fmt(mgPerMl)} mg/mL`, result: `${fmt(mgPerMl)} mg/mL` });
      break;
    case 'mg/250mL':
      mgPerMl = concentration / 250;
      steps.push({ label: 'mg/250mL → mg/mL', formula: `${concentration} mg ÷ 250 mL = ${fmt(mgPerMl)} mg/mL`, result: `${fmt(mgPerMl)} mg/mL` });
      break;
    case 'mg/500mL':
      mgPerMl = concentration / 500;
      steps.push({ label: 'mg/500mL → mg/mL', formula: `${concentration} mg ÷ 500 mL = ${fmt(mgPerMl)} mg/mL`, result: `${fmt(mgPerMl)} mg/mL` });
      break;
  }

  return { value: mgPerMl, steps };
}

function toHours(value: number, unit: string): number {
  if (!value || value <= 0) return 0;
  return unit === 'min' ? value / 60 : value;
}

function fmt(n: number | null): string {
  if (n === null) return '—';
  if (Number.isInteger(n)) return n.toString();
  if (Math.abs(n) >= 100) return n.toFixed(1);
  if (Math.abs(n) >= 1) return n.toFixed(2);
  if (Math.abs(n) >= 0.01) return n.toFixed(3);
  return n.toFixed(4);
}

function validate(input: CalculationInput): CalculationWarning[] {
  const warnings: CalculationWarning[] = [];

  if (!input.weight || input.weight <= 0) {
    const needsWeight = ['mg/kg/min', 'μg/kg/h'].includes(input.doseUnit);
    if (needsWeight) {
      warnings.push({ level: 'error', message: '体重缺失或为零，无法计算体重剂量率（mg/kg/min 或 μg/kg/h）' });
    } else {
      warnings.push({ level: 'warning', message: '体重未填写，无法换算体重剂量率' });
    }
  }

  if (!input.concentration || input.concentration <= 0) {
    warnings.push({ level: 'error', message: '药液浓度为零或未填写，无法计算泵速（mL/h）' });
  }

  if (input.weight > 300) {
    warnings.push({ level: 'warning', message: `体重 ${input.weight} kg 超出常见范围，请核实` });
  }

  if (input.doseValue < 0) {
    warnings.push({ level: 'error', message: '医嘱剂量不能为负数' });
  }

  if (input.totalVolume < 0) {
    warnings.push({ level: 'error', message: '药液总量不能为负数' });
  }

  return warnings;
}

export function calculate(input: CalculationInput): CalculationResult {
  const warnings = validate(input);
  const allSteps: CalculationStep[] = [];

  const { value: mgPerH, steps: doseSteps } = toMgPerH(
    input.doseValue, input.doseUnit, input.weight, input.plannedTime, input.timeUnit
  );
  allSteps.push(...doseSteps);

  const { value: concMgPerMl, steps: concSteps } = concentrationToMgPerMl(
    input.concentration, input.concentrationUnit
  );
  allSteps.push(...concSteps);

  let pumpRateMlPerH: number | null = null;
  if (mgPerH !== null && concMgPerMl !== null && concMgPerMl > 0) {
    pumpRateMlPerH = mgPerH / concMgPerMl;
    allSteps.push({
      label: '计算泵速',
      formula: `${fmt(mgPerH)} mg/h ÷ ${fmt(concMgPerMl)} mg/mL = ${fmt(pumpRateMlPerH)} mL/h`,
      result: `${fmt(pumpRateMlPerH)} mL/h`
    });
  } else if (mgPerH === null) {
    allSteps.push({ label: '计算泵速', formula: '剂量率缺失', result: '⚠ 无法计算泵速' });
  } else if (concMgPerMl === null || concMgPerMl <= 0) {
    allSteps.push({ label: '计算泵速', formula: '浓度缺失或为零', result: '⚠ 无法计算泵速' });
  }

  if (pumpRateMlPerH !== null) {
    if (pumpRateMlPerH > 999) {
      warnings.push({ level: 'warning', message: `泵速 ${fmt(pumpRateMlPerH)} mL/h 超出科室常用范围（>999 mL/h），请核实` });
    }
    if (pumpRateMlPerH < 0.1 && pumpRateMlPerH > 0) {
      warnings.push({ level: 'warning', message: `泵速 ${fmt(pumpRateMlPerH)} mL/h 低于常用范围（<0.1 mL/h），请核实` });
    }
    if (pumpRateMlPerH < 0) {
      warnings.push({ level: 'error', message: '泵速为负数，请检查输入参数' });
    }
  }

  if (input.totalVolume > 0 && pumpRateMlPerH !== null && pumpRateMlPerH > 0) {
    const timeH = toHours(input.plannedTime, input.timeUnit);
    if (timeH > 0) {
      const totalUsageMl = pumpRateMlPerH * timeH;
      const doseInTotalVolume = totalUsageMl * (concMgPerMl || 0);
      
      allSteps.push({
        label: '总量核对',
        formula: `${fmt(pumpRateMlPerH)} mL/h × ${fmt(timeH)} h = ${fmt(totalUsageMl)} mL`,
        result: `需使用 ${fmt(totalUsageMl)} mL`
      });

      if (totalUsageMl > input.totalVolume) {
        warnings.push({
          level: 'warning',
          message: `计算用量 ${fmt(totalUsageMl)} mL 大于药液总量 ${input.totalVolume} mL，请核实总量或调整输液时间`
        });
      } else if (concMgPerMl !== null && doseInTotalVolume > 0) {
        const remainingVolume = input.totalVolume - totalUsageMl;
        const remainingDose = remainingVolume * concMgPerMl;
        allSteps.push({
          label: '剩余药量',
          formula: `${input.totalVolume} mL - ${fmt(totalUsageMl)} mL = ${fmt(remainingVolume)} mL`,
          result: `剩余 ${fmt(remainingVolume)} mL (${fmt(remainingDose)} mg)`
        });
      }
    } else if (input.totalVolume > 0) {
      allSteps.push({
        label: '总量核对',
        formula: `药液总量 ${input.totalVolume} mL`,
        result: '时间未填写，无法计算用量'
      });
    }
  }

  let weightDoseMgKgMin: number | null = null;
  let weightDoseUgKgH: number | null = null;

  if (input.weight > 0) {
    if (input.doseUnit === 'mg/kg/min') {
      weightDoseMgKgMin = input.doseValue;
      weightDoseUgKgH = input.doseValue * 1000 * 60;
    } else if (input.doseUnit === 'μg/kg/h') {
      weightDoseMgKgMin = input.doseValue / 1000 / 60;
      weightDoseUgKgH = input.doseValue;
    } else if (mgPerH !== null) {
      weightDoseMgKgMin = mgPerH / input.weight / 60;
      weightDoseUgKgH = mgPerH / input.weight * 1000;
    }
  }

  return {
    pumpRateMlPerH,
    weightDoseMgKgMin,
    weightDoseUgKgH,
    steps: allSteps,
    warnings,
  };
}

export { fmt };
