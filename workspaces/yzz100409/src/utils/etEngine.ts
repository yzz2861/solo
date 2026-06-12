import type {
  ETResult,
  SensorInput,
  CalcStep,
  ValidationWarning,
} from '../../shared/types';
import { CROP_KC_VALUES } from '../../shared/types';
import { mmToM3Mu } from './unitConverter';
import { suggestIrrigationWindows } from './scheduler';

const GAMMA = 0.067; // 干湿表常数 kPa/℃

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

export const calcDelta = (T: number): number => {
  const es = calcEs(T);
  return (4098 * es) / Math.pow(T + 237.3, 2);
};

export const calcEs = (T: number): number => {
  return 0.6108 * Math.exp((17.27 * T) / (T + 237.3));
};

export const calcRn = (radiationWm2: number): number => {
  const dailyTotal = radiationWm2 * 0.0864; // MJ/m²/day
  return dailyTotal * 0.7; // 温室反射+长波修正 取净辐射系数0.7
};

export const calcET0 = (
  T: number,
  RH: number,
  radiation: number,
  wind: number
): { et0: number; steps: CalcStep[] } => {
  const steps: CalcStep[] = [];

  const delta = calcDelta(T);
  steps.push({
    label: '饱和水汽压斜率 Δ',
    formula: 'Δ = 4098·eₛ / (T+237.3)²',
    value: `${delta.toFixed(4)} kPa/℃`,
  });

  const es = calcEs(T);
  steps.push({
    label: '饱和水汽压 eₛ',
    formula: 'eₛ = 0.6108·exp(17.27·T/(T+237.3))',
    value: `${es.toFixed(3)} kPa`,
  });

  const ea = es * (RH / 100);
  steps.push({
    label: '实际水汽压 eₐ',
    formula: 'eₐ = eₛ × RH/100',
    value: `${ea.toFixed(3)} kPa`,
  });

  const Rn = calcRn(radiation);
  steps.push({
    label: '净辐射 Rₙ',
    formula: 'Rₙ = 光照(W/m²)×0.0864×0.7（温室折减）',
    value: `${Rn.toFixed(3)} MJ/m²/day`,
  });

  const u2 = clamp(wind * 0.6, 0.1, 6); // 温室风速折减
  steps.push({
    label: '2m高处风速 u₂',
    formula: 'u₂ = 实测风速 × 0.6（温室折减），限幅 0.1~6',
    value: `${u2.toFixed(2)} m/s`,
  });

  const G = 0; // 日均值取 0
  const GTerm = 0;
  steps.push({
    label: '土壤热通量 G',
    formula: '日均值取 G = 0',
    value: `${GTerm.toFixed(2)} MJ/m²/day`,
  });

  const numerator1 = 0.408 * delta * (Rn - G);
  const numerator2 = GAMMA * (900 / (T + 273)) * u2 * (es - ea);
  const numerator = numerator1 + numerator2;
  const denominator = delta + GAMMA * (1 + 0.34 * u2);
  const et0 = numerator / denominator;

  steps.push({
    label: '分子项',
    formula: '0.408·Δ·(Rₙ-G) + γ·(900/(T+273))·u₂·(eₛ-eₐ)',
    value: `${numerator.toFixed(4)}`,
  });
  steps.push({
    label: '分母项',
    formula: 'Δ + γ·(1 + 0.34·u₂)',
    value: `${denominator.toFixed(4)}`,
  });
  steps.push({
    label: '参考蒸散 ET₀',
    formula: 'ET₀ = 分子 / 分母',
    value: `${et0.toFixed(2)} mm/day`,
  });

  return { et0: clamp(et0, 0.5, 15), steps };
};

export const calcKc = (
  stage: SensorInput['cropStage'],
  hasStageWarning: boolean
): { kc: number; step: CalcStep } => {
  let kc: number;
  let desc: string;
  if (stage === null) {
    kc = 0.92 * 1.15;
    desc = '未选阶段，默认Kc=0.92，再×1.15保守修正';
  } else {
    kc = CROP_KC_VALUES[stage];
    desc = {
      seedling: '育苗期 Kc=0.50',
      flowering: '开花期 Kc=0.75',
      fruit_set: '坐果期 Kc=0.90',
      fruit_expansion: '膨果期 Kc=1.12',
      mature: '成熟期 Kc=0.80',
    }[stage];
  }
  if (hasStageWarning && stage !== null) {
    kc = kc * 1.15;
    desc += '，×1.15 阶段不确定保守修正';
  }
  return {
    kc,
    step: {
      label: '作物系数 Kc',
      formula: desc,
      value: `Kc = ${kc.toFixed(3)}`,
    },
  };
};

export const calcSoilCorrection = (soilMoisture: number | null): {
  soilCorrection: number;
  step: CalcStep;
} => {
  const FIELD_CAPACITY = 38; // 体积%
  const REFILL_POINT = 22; // 开始灌溉阈值
  const CRITICAL_POINT = 12; // 萎蔫阈值附近

  let correction: number;
  let desc: string;

  if (soilMoisture === null) {
    correction = 1.0;
    desc = '土壤湿度缺测，按标准值1.0处理（不做修正，偏大谨慎）';
  } else if (soilMoisture >= FIELD_CAPACITY) {
    correction = 0.3;
    desc = `土壤湿度${soilMoisture.toFixed(0)}%接近或超过田间持水量，修正系数0.3（少浇）`;
  } else if (soilMoisture >= REFILL_POINT) {
    const ratio = (soilMoisture - REFILL_POINT) / (FIELD_CAPACITY - REFILL_POINT);
    correction = 1.0 - ratio * 0.65;
    desc = `土壤湿度${soilMoisture.toFixed(0)}%在(回灌点~田间持水量)之间，线性修正`;
  } else if (soilMoisture >= CRITICAL_POINT) {
    const ratio = (soilMoisture - CRITICAL_POINT) / (REFILL_POINT - CRITICAL_POINT);
    correction = 1.0 + (1 - ratio) * 0.25;
    desc = `土壤湿度${soilMoisture.toFixed(0)}%在(萎蔫~回灌点)之间，需补墒，系数×1.00~1.25`;
  } else {
    correction = 1.35;
    desc = `土壤湿度${soilMoisture.toFixed(0)}%低于萎蔫点，严重缺水，系数×1.35（请立即补水！）`;
  }

  return {
    soilCorrection: clamp(correction, 0.2, 1.5),
    step: {
      label: '土壤湿度修正系数 Kₛ',
      formula: desc,
      value: `Kₛ = ${correction.toFixed(3)}`,
    },
  };
};

export const computeET = (
  input: SensorInput,
  warnings: ValidationWarning[],
  totalConservativeFactor: number
): ETResult => {
  const T = input.temperature ?? 25;
  const RH = input.humidity ?? 60;
  const rad = input.radiation ?? 250;
  const wind = input.wind ?? 0.5;

  const { et0, steps: et0Steps } = calcET0(T, RH, rad, wind);
  const hasStageWarn = warnings.some((w) => w.type === 'stage_unselected');
  const { kc, step: kcStep } = calcKc(input.cropStage, hasStageWarn);

  const etc = et0 * kc;
  const etcStep: CalcStep = {
    label: '作物实际蒸散 ETc',
    formula: 'ETc = ET₀ × Kc',
    value: `${et0.toFixed(2)} × ${kc.toFixed(3)} = ${etc.toFixed(2)} mm/day`,
  };

  const { soilCorrection, step: soilStep } = calcSoilCorrection(input.soilMoisture);
  let netRaw = etc * soilCorrection * totalConservativeFactor;
  if (netRaw < 0.3) netRaw = 0; // 需水过少可以不浇

  const netStep: CalcStep = {
    label: '净灌溉量（考虑总保守系数）',
    formula: '净灌溉量 = ETc × Kₛ × ∏(保守系数)',
    value: `${etc.toFixed(2)} × ${soilCorrection.toFixed(3)} × ${totalConservativeFactor.toFixed(3)} = ${netRaw.toFixed(2)} mm`,
  };

  const netIrrigation = clamp(netRaw, 0, 40);
  const efficiency = clamp(input.irrigationEfficiency, 0.3, 1.0);
  const grossIrrigation = netIrrigation / efficiency;

  const grossStep: CalcStep = {
    label: '毛灌溉量（含系统损失）',
    formula: '毛灌溉量 = 净灌溉量 / 灌溉效率',
    value: `${netIrrigation.toFixed(2)} ÷ ${efficiency.toFixed(2)} = ${grossIrrigation.toFixed(2)} mm`,
  };

  const grossIrrigationM3Mu = mmToM3Mu(grossIrrigation);
  const m3muStep: CalcStep = {
    label: '换算为亩用水量',
    formula: '方/亩 = mm × 2000/3 × 0.001',
    value: `${grossIrrigation.toFixed(2)} mm = ${grossIrrigationM3Mu.toFixed(2)} 方/亩`,
  };

  const scheduledWindows = suggestIrrigationWindows(input, grossIrrigation);

  return {
    et0: Number(et0.toFixed(2)),
    kc: Number(kc.toFixed(3)),
    etc: Number(etc.toFixed(2)),
    soilCorrection: Number(soilCorrection.toFixed(3)),
    netIrrigation: Number(netIrrigation.toFixed(2)),
    grossIrrigation: Number(grossIrrigation.toFixed(2)),
    grossIrrigationM3Mu: Number(grossIrrigationM3Mu.toFixed(2)),
    scheduledWindows,
    warnings,
    totalConservativeFactor: Number(totalConservativeFactor.toFixed(3)),
    calcSteps: [
      ...et0Steps,
      kcStep,
      etcStep,
      soilStep,
      netStep,
      grossStep,
      m3muStep,
    ],
  };
};
