import { v4 as uuidv4 } from 'uuid';
import {
  BatterySpec,
  CorrectionFactors,
  EnduranceResult,
  LoadPhase,
  MeasurementRecord,
  ComparisonResult,
  PhaseDeviation,
  PhaseEnergyBreakdown,
  ValidationAlert,
} from '../types';
import {
  convertCapacityToWh,
  convertDurationToS,
  convertPowerToW,
  joulesToWh,
  roundTo,
  clamp,
} from './units';
import { PHASE_LABELS } from '../constants/defaults';

function getPhaseDisplayName(phase: LoadPhase): string {
  if (phase.name === 'custom' && phase.customName && phase.customName.trim()) {
    return phase.customName.trim();
  }
  return PHASE_LABELS[phase.name];
}

export function computeTemperatureDerating(
  temperature: number,
  coefficientPerC: number
): number {
  const baseTemp = 25;
  const delta = temperature - baseTemp;
  if (delta >= 0) {
    return 1.0;
  }
  const rawDerating = 1 + (delta * Math.abs(coefficientPerC)) / 100;
  return clamp(rawDerating, 0.1, 1.0);
}

export function validateInputs(
  battery: BatterySpec,
  phases: LoadPhase[],
  corrections: CorrectionFactors
): ValidationAlert[] {
  const alerts: ValidationAlert[] = [];

  if (!battery.capacity || battery.capacity <= 0) {
    alerts.push({
      id: uuidv4(),
      level: 'error',
      message: '电池容量必须设置为大于 0 的数值',
      anchor: '#battery',
    });
  }
  if (!battery.nominalVoltage || battery.nominalVoltage <= 0) {
    alerts.push({
      id: uuidv4(),
      level: 'error',
      message: '电池标称电压必须设置为大于 0 的数值',
      anchor: '#battery',
    });
  }

  const activePhases = phases.filter((p) => p.dutyCycle > 0 || p.name === 'charging');
  if (phases.length === 0) {
    alerts.push({
      id: uuidv4(),
      level: 'info',
      message: '尚未配置任何负载阶段，请至少添加一个阶段来估算续航',
      anchor: '#phases',
    });
  } else if (activePhases.length === 0) {
    alerts.push({
      id: uuidv4(),
      level: 'warning',
      message: '所有负载阶段的占空比均为 0%，系统将处于纯待机零功耗状态',
      anchor: '#phases',
    });
  }

  const criticalPhases = ['standby', 'sampling', 'wireless'];
  const hasCritical: Record<string, boolean> = {};
  phases.forEach((p) => {
    hasCritical[p.name] = true;
  });
  criticalPhases.forEach((key) => {
    if (!hasCritical[key]) {
      alerts.push({
        id: uuidv4(),
        level: 'info',
        message: `缺少「${PHASE_LABELS[key as keyof typeof PHASE_LABELS]}」阶段配置，完整建模建议包含该阶段`,
        anchor: '#phases',
      });
    }
  });

  phases.forEach((phase, idx) => {
    if (phase.power < 0) {
      alerts.push({
        id: uuidv4(),
        level: 'error',
        message: `阶段「${getPhaseDisplayName(phase)}」的功耗不能为负数`,
        anchor: `#phase-${phase.id}`,
      });
    }
    if (phase.duration < 0) {
      alerts.push({
        id: uuidv4(),
        level: 'error',
        message: `阶段「${getPhaseDisplayName(phase)}」的持续时间不能为负数`,
        anchor: `#phase-${phase.id}`,
      });
    }
    if (phase.dutyCycle < 0 || phase.dutyCycle > 100) {
      alerts.push({
        id: uuidv4(),
        level: 'error',
        message: `阶段「${getPhaseDisplayName(phase)}」的占空比应在 0% ~ 100% 之间`,
        anchor: `#phase-${phase.id}`,
      });
    }
    if (phase.worstCaseMultiplier < 1) {
      alerts.push({
        id: uuidv4(),
        level: 'warning',
        message: `阶段「${getPhaseDisplayName(phase)}」的最差功耗倍率小于 1，不符合最差场景定义（建议 ≥ 1.0）`,
        anchor: `#phase-${phase.id}`,
      });
    }
  });

  const totalDutyCycle = phases.reduce((sum, p) => sum + p.dutyCycle, 0);
  if (totalDutyCycle > 110 && phases.length > 0) {
    alerts.push({
      id: uuidv4(),
      level: 'warning',
      message: `各阶段占空比之和为 ${roundTo(totalDutyCycle, 1)}%，超过 100% 表示阶段时间有重叠，估算可能偏保守`,
      anchor: '#phases',
    });
  }

  if (corrections.conversionEfficiency > 100) {
    alerts.push({
      id: uuidv4(),
      level: 'error',
      message: `电源转换效率为 ${roundTo(corrections.conversionEfficiency, 1)}%，超过 100% 不符合能量守恒定律`,
      anchor: '#corrections',
    });
  } else if (corrections.conversionEfficiency === 100) {
    alerts.push({
      id: uuidv4(),
      level: 'warning',
      message: '电源转换效率设置为 100%，实际电路总会有损耗，建议设置为 80% ~ 95%',
      anchor: '#corrections',
    });
  } else if (corrections.conversionEfficiency < 50) {
    alerts.push({
      id: uuidv4(),
      level: 'warning',
      message: `电源转换效率仅 ${roundTo(corrections.conversionEfficiency, 1)}%，效率偏低，请确认是否合理`,
      anchor: '#corrections',
    });
  }

  if (corrections.ambientTemperature <= -20) {
    alerts.push({
      id: uuidv4(),
      level: 'warning',
      message: `工作温度 ${corrections.ambientTemperature}℃ 为低温环境，电池容量会显著下降，已启用低温降容修正`,
      anchor: '#corrections',
    });
  }
  if (corrections.ambientTemperature <= -40) {
    alerts.push({
      id: uuidv4(),
      level: 'error',
      message: `温度 ${corrections.ambientTemperature}℃ 已低于多数电芯的最低工作温度，电池可能无法正常放电`,
      anchor: '#corrections',
    });
  }
  if (corrections.ambientTemperature >= 60) {
    alerts.push({
      id: uuidv4(),
      level: 'warning',
      message: `温度 ${corrections.ambientTemperature}℃ 偏高，可能加速老化或触发安全保护`,
      anchor: '#corrections',
    });
  }

  if (corrections.agingFactor > 1 || corrections.agingFactor < 0.5) {
    alerts.push({
      id: uuidv4(),
      level: 'warning',
      message: `老化系数 ${roundTo(corrections.agingFactor, 2)} 超出常规范围 (0.5 ~ 1.0)，新电芯建议 0.90 ~ 0.98`,
      anchor: '#corrections',
    });
  }

  if (corrections.designMargin < 0 || corrections.designMargin > 50) {
    alerts.push({
      id: uuidv4(),
      level: 'warning',
      message: `设计裕度 ${roundTo(corrections.designMargin, 1)}% 超出推荐范围 (0% ~ 30%)`,
      anchor: '#corrections',
    });
  }

  const nominalWh = convertCapacityToWh(
    battery.capacity,
    battery.capacityUnit,
    battery.nominalVoltage * battery.seriesCount
  );
  const derating = computeTemperatureDerating(
    corrections.ambientTemperature,
    corrections.temperatureCoefficient
  );
  const marginRatio = 1 - corrections.designMargin / 100;
  const efficiencyRatio = clamp(corrections.conversionEfficiency / 100, 0.01, 1);
  const usableWh = nominalWh * derating * corrections.agingFactor * marginRatio;
  const correctedUsableWh = usableWh * efficiencyRatio;

  const avgPowerW = phases.reduce((sum, phase) => {
    const pW = convertPowerToW(phase.power, phase.powerUnit);
    const dS = convertDurationToS(phase.duration, phase.durationUnit);
    const dc = clamp(phase.dutyCycle / 100, 0, 1);
    return sum + pW * dS * dc;
  }, 0);

  if (correctedUsableWh > 0 && avgPowerW > 0) {
    const enduranceHours = correctedUsableWh / avgPowerW * 1;
    if (avgPowerW > correctedUsableWh / 0.1) {
      alerts.push({
        id: uuidv4(),
        level: 'warning',
        message: `平均负载功耗过高，预估续航仅约 ${roundTo(enduranceHours * 60, 0)} 分钟，建议检查负载配置或增大电池容量`,
        anchor: '#result',
      });
    }
  }

  return alerts;
}

function computePhaseBreakdown(
  phases: LoadPhase[],
  useWorstCase: boolean
): { breakdown: PhaseEnergyBreakdown[]; avgPowerW: number } {
  const breakdown: PhaseEnergyBreakdown[] = [];
  let totalAvgPower = 0;

  phases.forEach((phase) => {
    const multiplier = useWorstCase ? phase.worstCaseMultiplier : 1.0;
    const durationMultiplier = useWorstCase ? phase.worstCaseDurationMultiplier : 1.0;

    const powerW = convertPowerToW(phase.power, phase.powerUnit) * multiplier;
    const durationS = convertDurationToS(phase.duration, phase.durationUnit) * durationMultiplier;
    const energyPerCycleJ = powerW * durationS;
    const energyPerCycleWh = joulesToWh(energyPerCycleJ);
    const dutyCycle = clamp(phase.dutyCycle / 100, 0, 1);
    const avgPowerW = powerW * durationS * dutyCycle;

    totalAvgPower += avgPowerW;

    breakdown.push({
      phaseId: phase.id,
      phaseName: phase.name,
      displayName: getPhaseDisplayName(phase),
      powerW,
      durationS,
      energyPerCycleJ,
      energyPerCycleWh,
      dutyCycle: phase.dutyCycle,
      avgPowerW,
      energyShare: 0,
    });
  });

  if (totalAvgPower > 0) {
    breakdown.forEach((b) => {
      b.energyShare = (b.avgPowerW / totalAvgPower) * 100;
    });
  }

  return { breakdown, avgPowerW: totalAvgPower };
}

export function computeEndurance(
  battery: BatterySpec,
  phases: LoadPhase[],
  corrections: CorrectionFactors
): EnduranceResult | null {
  const totalVoltage = battery.nominalVoltage * battery.seriesCount;
  if (!battery.capacity || battery.capacity <= 0 || !totalVoltage || totalVoltage <= 0) {
    return null;
  }

  const nominalCapacityWh = convertCapacityToWh(battery.capacity, battery.capacityUnit, totalVoltage);
  const temperatureDerating = computeTemperatureDerating(
    corrections.ambientTemperature,
    corrections.temperatureCoefficient
  );
  const efficiencyRatio = clamp(corrections.conversionEfficiency / 100, 0.01, 1);
  const agingLoss = clamp(corrections.agingFactor, 0.1, 1);
  const marginRatio = 1 - clamp(corrections.designMargin, 0, 90) / 100;
  const usableCapacityRatio = temperatureDerating * agingLoss * marginRatio;
  const efficiencyLoss = efficiencyRatio;

  const availableBeforeEfficiency_typical = nominalCapacityWh * usableCapacityRatio;
  const availableCapacityWh_typical = availableBeforeEfficiency_typical * efficiencyLoss;
  const availableBeforeEfficiency_worst = nominalCapacityWh * usableCapacityRatio * 0.95;
  const availableCapacityWh_worst = availableBeforeEfficiency_worst * efficiencyLoss * 0.97;

  const { breakdown: typicalBreakdown, avgPowerW: avgPowerDrawW_typical } = computePhaseBreakdown(phases, false);
  const { breakdown: worstBreakdown, avgPowerW: avgPowerDrawW_worst } = computePhaseBreakdown(phases, true);

  let typicalHours = 0;
  let worstCaseHours = 0;

  if (avgPowerDrawW_typical > 0) {
    typicalHours = availableCapacityWh_typical / avgPowerDrawW_typical;
  }
  if (avgPowerDrawW_worst > 0) {
    worstCaseHours = availableCapacityWh_worst / avgPowerDrawW_worst;
  }

  const steps: string[] = [];
  steps.push(
    `① 标称容量换算：${battery.capacity} ${battery.capacityUnit} × ${totalVoltage.toFixed(2)}V = ${nominalCapacityWh.toFixed(3)} Wh`
  );
  steps.push(
    `② 温度降容系数：${corrections.ambientTemperature}℃ × (${Math.abs(corrections.temperatureCoefficient).toFixed(2)}%/℃) → 系数 = ${(temperatureDerating * 100).toFixed(1)}%`
  );
  steps.push(
    `③ 老化系数：${(agingLoss * 100).toFixed(1)}% × 设计裕度保留：${(marginRatio * 100).toFixed(1)}%`
  );
  steps.push(
    `④ 综合可用容量（效率前）：${nominalCapacityWh.toFixed(3)} Wh × ${(usableCapacityRatio * 100).toFixed(1)}% = ${availableBeforeEfficiency_typical.toFixed(3)} Wh`
  );
  steps.push(
    `⑤ 电源转换效率修正：${availableBeforeEfficiency_typical.toFixed(3)} Wh × ${(efficiencyLoss * 100).toFixed(1)}% = ${availableCapacityWh_typical.toFixed(3)} Wh（可用）`
  );

  if (typicalBreakdown.length > 0) {
    typicalBreakdown.forEach((b) => {
      steps.push(
        `   · ${b.displayName}：${b.powerW >= 1 ? b.powerW.toFixed(3) + 'W' : (b.powerW * 1000).toFixed(1) + 'mW'} × ${b.durationS.toFixed(2)}s × ${b.dutyCycle.toFixed(1)}% = ${(b.avgPowerW * 1000).toFixed(2)} mW（平均）`
      );
    });
  }
  steps.push(
    `⑥ 总平均功耗（典型）：${(avgPowerDrawW_typical * 1000).toFixed(2)} mW = ${avgPowerDrawW_typical.toFixed(4)} W`
  );
  steps.push(
    `⑦ 典型续航 = ${availableCapacityWh_typical.toFixed(3)} Wh ÷ ${avgPowerDrawW_typical.toFixed(4)} W = ${typicalHours.toFixed(3)} h`
  );
  steps.push(
    `⑧ 最差续航 = ${availableCapacityWh_worst.toFixed(3)} Wh ÷ ${avgPowerDrawW_worst.toFixed(4)} W = ${worstCaseHours.toFixed(3)} h（含最差功耗倍率 × 5% 安全裕度）`
  );

  return {
    typicalHours: clamp(typicalHours, 0, 100000),
    worstCaseHours: clamp(worstCaseHours, 0, 100000),
    availableCapacityWh_typical,
    availableCapacityWh_worst,
    avgPowerDrawW_typical,
    avgPowerDrawW_worst,
    phaseBreakdown_typical: typicalBreakdown,
    phaseBreakdown_worst: worstBreakdown,
    temperatureDerating,
    efficiencyLoss,
    agingLoss,
    marginLoss: marginRatio,
    calculationSteps: steps,
    nominalCapacityWh,
    usableCapacityRatio,
  };
}

export function computeComparison(
  result: EnduranceResult,
  measurement: MeasurementRecord,
  phases: LoadPhase[]
): ComparisonResult | null {
  if (!result || !measurement) return null;
  if (!measurement.measuredEnduranceHours || measurement.measuredEnduranceHours <= 0) return null;

  const estimatedHours = result.typicalHours;
  const deviationPercent = ((estimatedHours - measurement.measuredEnduranceHours) / measurement.measuredEnduranceHours) * 100;

  const phaseDeviations: PhaseDeviation[] = [];
  let totalImpact = 0;
  let maxOptimism = -Infinity;
  let mostOptimisticId: string | null = null;
  let mostOptimisticName: string | null = null;

  const typicalMap = new Map<string, PhaseEnergyBreakdown>();
  result.phaseBreakdown_typical.forEach((b) => typicalMap.set(b.phaseId, b));

  const phaseMap = new Map<string, LoadPhase>();
  phases.forEach((p) => phaseMap.set(p.id, p));

  measurement.phaseMeasurements.forEach((pm) => {
    const typical = typicalMap.get(pm.phaseId);
    const phase = phaseMap.get(pm.phaseId);
    if (!typical || !phase) return;

    const estimatedPowerW = typical.powerW / (phase.worstCaseMultiplier > 1 ? 1 : 1);
    const measuredPowerW = pm.measuredPower;
    const powerDeviation = measuredPowerW > 0
      ? ((estimatedPowerW - measuredPowerW) / measuredPowerW) * 100
      : 0;

    const estimatedDurationS = typical.durationS;
    const measuredDurationS = pm.measuredDuration;
    const durationDeviation = measuredDurationS > 0
      ? ((estimatedDurationS - measuredDurationS) / measuredDurationS) * 100
      : 0;

    const optimistic = powerDeviation < -5 || durationDeviation < -5;
    const avgDeviation = (powerDeviation + durationDeviation) / 2;
    const impactScore = Math.abs(avgDeviation) * (typical.energyShare / 100);
    totalImpact += impactScore;

    if (optimistic && avgDeviation < maxOptimism) {
      maxOptimism = avgDeviation;
      mostOptimisticId = pm.phaseId;
      mostOptimisticName = typical.displayName;
    }

    phaseDeviations.push({
      phaseId: pm.phaseId,
      phaseName: phase.name,
      displayName: typical.displayName,
      estimatedPowerW,
      measuredPowerW,
      powerDeviation,
      estimatedDurationS,
      measuredDurationS,
      durationDeviation,
      optimistic,
      impactScore,
    });
  });

  const recommendations: string[] = [];
  let conclusion = '';

  if (deviationPercent > 25) {
    conclusion = `估算值明显偏乐观，高估了 ${deviationPercent.toFixed(1)}%，需修正负载假设`;
    recommendations.push('建议重新标定各阶段的实测功耗，尤其是已标记为偏乐观的阶段');
    recommendations.push('考虑增加最差场景倍率或降低转换效率假设');
  } else if (deviationPercent > 10) {
    conclusion = `估算值偏乐观，高估了 ${deviationPercent.toFixed(1)}%，存在一定优化空间`;
    recommendations.push('检查功耗偏高的阶段是否有降功耗优化手段');
  } else if (deviationPercent < -25) {
    conclusion = `估算值显著偏保守，低估了 ${Math.abs(deviationPercent).toFixed(1)}%`;
    recommendations.push('模型偏保守，可以适当放宽最差场景倍率以获得更真实的续航预期');
  } else if (deviationPercent < -10) {
    conclusion = `估算值偏保守，低估了 ${Math.abs(deviationPercent).toFixed(1)}%`;
    recommendations.push('可以考虑调整设计裕度参数以更贴近实际表现');
  } else {
    conclusion = `估算与实测吻合良好，偏差仅 ${deviationPercent.toFixed(1)}%，模型可靠`;
    recommendations.push('当前模型参数合理，继续积累更多实测数据持续校准');
  }

  if (mostOptimisticName) {
    recommendations.unshift(`重点关注阶段「${mostOptimisticName}」，该阶段假设最偏乐观`);
  }

  const optimisticCount = phaseDeviations.filter((d) => d.optimistic).length;
  if (optimisticCount > 0) {
    recommendations.push(`共 ${optimisticCount} 个阶段存在偏乐观假设，建议逐项复核`);
  }

  return {
    deviationPercent,
    phaseDeviations,
    mostOptimisticPhase: mostOptimisticId,
    mostOptimisticPhaseName: mostOptimisticName,
    totalOptimismScore: totalImpact,
    conclusion,
    recommendations,
    measurementId: measurement.id,
  };
}
