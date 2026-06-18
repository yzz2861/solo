import { RISK_THRESHOLDS, SOLIDS_RATIO } from './constants';
import type { Risk, KitchenInstruction, CalculationStep } from './types';

export function assessRisks(
  alcoholContent: number,
  fatContent: number,
  sugarContent: number,
  stabilizerContent: number,
  solidsRatio: number
): { risks: Risk[]; calculationSteps: CalculationStep[] } {
  const risks: Risk[] = [];
  const calculationSteps: CalculationStep[] = [];

  calculationSteps.push({
    name: '酒精含量风险评估',
    formula: 'alcoholContent vs thresholds',
    variables: {
      alcoholContent,
      warningThreshold: RISK_THRESHOLDS.alcohol.warning * 100,
      dangerThreshold: RISK_THRESHOLDS.alcohol.danger * 100,
    },
    result: alcoholContent,
    unit: '%',
  });

  if (alcoholContent > RISK_THRESHOLDS.alcohol.danger * 100) {
    risks.push({
      type: 'alcohol_high',
      level: 'danger',
      message: `酒精含量过高（${alcoholContent.toFixed(1)}% > ${RISK_THRESHOLDS.alcohol.danger * 100}%），冰淇淋可能难以凝固，建议减少酒精用量或增加糖和脂肪含量`,
    });
  } else if (alcoholContent > RISK_THRESHOLDS.alcohol.warning * 100) {
    risks.push({
      type: 'alcohol_high',
      level: 'warning',
      message: `酒精含量偏高（${alcoholContent.toFixed(1)}% > ${RISK_THRESHOLDS.alcohol.warning * 100}%），可能影响凝固效果，建议降低冷冻温度${((alcoholContent - RISK_THRESHOLDS.alcohol.warning * 100) * 0.5).toFixed(1)}°C`,
    });
  }

  calculationSteps.push({
    name: '脂肪含量风险评估',
    formula: 'fatContent vs thresholds',
    variables: {
      fatContent,
      warningThreshold: RISK_THRESHOLDS.fat.warning * 100,
      dangerThreshold: RISK_THRESHOLDS.fat.danger * 100,
    },
    result: fatContent,
    unit: '%',
  });

  if (fatContent < RISK_THRESHOLDS.fat.danger * 100) {
    risks.push({
      type: 'fat_low',
      level: 'danger',
      message: `脂肪含量过低（${fatContent.toFixed(1)}% < ${RISK_THRESHOLDS.fat.danger * 100}%），口感会较差，容易产生冰渣，建议增加奶油用量`,
    });
  } else if (fatContent < RISK_THRESHOLDS.fat.warning * 100) {
    risks.push({
      type: 'fat_low',
      level: 'warning',
      message: `脂肪含量偏低（${fatContent.toFixed(1)}% < ${RISK_THRESHOLDS.fat.warning * 100}%），可能影响绵密口感，建议适当增加奶油或使用高脂奶油`,
    });
  }

  calculationSteps.push({
    name: '糖含量风险评估',
    formula: 'sugarContent vs thresholds',
    variables: {
      sugarContent,
      warningThreshold: RISK_THRESHOLDS.sugar.warning * 100,
      dangerThreshold: RISK_THRESHOLDS.sugar.danger * 100,
    },
    result: sugarContent,
    unit: '%',
  });

  if (sugarContent > RISK_THRESHOLDS.sugar.danger * 100) {
    risks.push({
      type: 'sugar_high',
      level: 'danger',
      message: `糖含量过高（${sugarContent.toFixed(1)}% > ${RISK_THRESHOLDS.sugar.danger * 100}%），会严重降低凝固点，可能导致冰淇淋太软`,
    });
  } else if (sugarContent > RISK_THRESHOLDS.sugar.warning * 100) {
    risks.push({
      type: 'sugar_high',
      level: 'warning',
      message: `糖含量偏高（${sugarContent.toFixed(1)}% > ${RISK_THRESHOLDS.sugar.warning * 100}%），凝固点会降低，需要更低的冷冻温度`,
    });
  }

  calculationSteps.push({
    name: '稳定剂含量风险评估',
    formula: 'stabilizerContent vs thresholds',
    variables: {
      stabilizerContent,
      warningThreshold: RISK_THRESHOLDS.stabilizer.warning * 100,
      dangerThreshold: RISK_THRESHOLDS.stabilizer.danger * 100,
    },
    result: stabilizerContent,
    unit: '%',
  });

  if (stabilizerContent > RISK_THRESHOLDS.stabilizer.danger * 100) {
    risks.push({
      type: 'stabilizer_high',
      level: 'danger',
      message: `稳定剂用量过高（${stabilizerContent.toFixed(2)}% > ${RISK_THRESHOLDS.stabilizer.danger * 100}%），会影响口感，产生胶质感`,
    });
  } else if (stabilizerContent > RISK_THRESHOLDS.stabilizer.warning * 100) {
    risks.push({
      type: 'stabilizer_high',
      level: 'warning',
      message: `稳定剂用量偏高（${stabilizerContent.toFixed(2)}% > ${RISK_THRESHOLDS.stabilizer.warning * 100}%），注意不要过度搅拌，以免产生粘性`,
    });
  }

  calculationSteps.push({
    name: '固形物比例评估',
    formula: 'solidsRatio vs ideal range',
    variables: {
      solidsRatio,
      minIdeal: SOLIDS_RATIO.minIdeal * 100,
      maxIdeal: SOLIDS_RATIO.maxIdeal * 100,
    },
    result: solidsRatio,
    unit: '%',
  });

  return { risks, calculationSteps };
}

export function generateKitchenInstructions(
  freezingPoint: number,
  risks: Risk[],
  hasAlcohol: boolean
): { instructions: KitchenInstruction[]; calculationSteps: CalculationStep[] } {
  const calculationSteps: CalculationStep[] = [];
  const instructions: KitchenInstruction[] = [];

  calculationSteps.push({
    name: '生成后厨操作指引',
    formula: 'based on freezing point and risks',
    variables: {
      freezingPoint,
      riskCount: risks.length,
      hasAlcohol,
    },
    result: 1,
  });

  const freezerTemp = Math.min(-18, freezingPoint - 4);

  instructions.push({
    step: 1,
    title: '准备配料',
    description: '按照配方准确称量所有原料。注意：液体原料使用量杯时要保持水平视线读数',
    observationPoint: '确保所有原料称量准确，误差控制在±2%以内',
    timing: '约10分钟',
  });

  instructions.push({
    step: 2,
    title: '混合基础原料',
    description: '将牛奶、奶油、糖放入锅中，小火加热至40-45°C，不断搅拌使糖完全溶解。不要煮沸',
    observationPoint: '糖完全溶解，液体呈现透明状，没有颗粒感',
    timing: '约5-8分钟',
  });

  if (hasAlcohol) {
    instructions.push({
      step: 3,
      title: '添加酒精与果泥',
      description: '关火后，先加入果泥搅拌均匀。待混合物冷却至30°C以下后，再加入酒精搅拌均匀',
      observationPoint: '酒精要在降温后加入，避免挥发损失。确保完全混合均匀',
      timing: '约3分钟',
    });
  } else {
    instructions.push({
      step: 3,
      title: '添加果泥',
      description: '关火后，加入果泥搅拌均匀，确保无结块',
      observationPoint: '混合物均匀细腻，无明显果泥结块',
      timing: '约3分钟',
    });
  }

  instructions.push({
    step: 4,
    title: '添加稳定剂',
    description: '将稳定剂与少量细砂糖预混合，边搅拌边缓慢撒入混合料中，继续搅拌2-3分钟',
    observationPoint: '稳定剂完全分散，没有结块。混合物开始微微变稠',
    timing: '约5分钟',
  });

  instructions.push({
    step: 5,
    title: '巴氏杀菌（可选）',
    description: '将混合料加热至75°C，保持15秒，然后迅速冷却至4°C以下',
    observationPoint: '使用温度计准确控制温度和时间',
    timing: '约10分钟',
  });

  instructions.push({
    step: 6,
    title: '冷藏老化',
    description: '将混合料放入冰箱冷藏（0-4°C）至少4小时，最好过夜',
    observationPoint: '混合料变得浓稠，表面形成轻微的膜',
    timing: '4-12小时',
  });

  instructions.push({
    step: 7,
    title: '冰淇淋机凝冻',
    description: '将老化好的混合料倒入预冷的冰淇淋机中，搅拌凝冻',
    observationPoint: `根据凝固点${freezingPoint.toFixed(1)}°C调整凝冻时间。当混合物达到${freezingPoint - 1}°C左右，质地如软冰淇淋时即可`,
    timing: '约15-25分钟',
  });

  instructions.push({
    step: 8,
    title: '装盒与硬化',
    description: '将凝冻好的冰淇淋装入容器，表面压平，密封后放入冷冻室硬化',
    observationPoint: `冷冻室温度建议设置为${freezerTemp}°C以下，硬化时间至少4小时${risks.some(r => r.type === 'alcohol_high') ? '，含酒精配方建议延长硬化时间2-4小时' : ''}`,
    timing: '4-8小时',
  });

  instructions.push({
    step: 9,
    title: '成品检查',
    description: '从冷冻室取出，检查冰淇淋的硬度、质地和风味',
    observationPoint: risks.length > 0
      ? `注意观察：${risks.map(r => r.message).join('；')}`
      : '冰淇淋应该可以用勺子轻松挖取，质地绵密无明显冰渣',
    timing: '立即检查',
  });

  return { instructions, calculationSteps };
}
