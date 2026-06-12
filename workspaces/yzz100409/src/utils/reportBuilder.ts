import type { ETResult, SensorInput, DailyRecord } from '../../shared/types';
import { CROP_STAGE_LABELS } from '../../shared/types';
import { mmToM3Mu } from './unitConverter';

export interface FarmerReportSection {
  title: string;
  emoji: string;
  content: string;
  highlight?: string;
}

export interface FarmerReport {
  headline: string;
  verdict: 'water-plenty' | 'water-ok' | 'water-moderate' | 'water-urgent';
  sections: FarmerReportSection[];
  actionList: string[];
}

export const buildFarmerReport = (
  input: SensorInput,
  result: ETResult
): FarmerReport => {
  const grossMm = result.grossIrrigation;
  const grossM3 = result.grossIrrigationM3Mu;
  const stage = input.cropStage ?? '未选择';
  const stageLabel = stage === '未选择' ? '（未选择）' : CROP_STAGE_LABELS[stage as Exclude<typeof stage, '未选择' | null>];

  let headline: string;
  let verdict: FarmerReport['verdict'];
  if (grossMm <= 0.5) {
    headline = '今日地够湿，可以不浇水 🌿';
    verdict = 'water-plenty';
  } else if (grossMm < 3) {
    headline = `今日小水即可，建议浇 ${grossM3.toFixed(1)} 方/亩`;
    verdict = 'water-ok';
  } else if (grossMm < 8) {
    headline = `今日正常灌溉，约 ${grossM3.toFixed(1)} 方/亩`;
    verdict = 'water-moderate';
  } else {
    headline = `今日需水多！建议 ${grossM3.toFixed(1)} 方/亩，分两次浇`;
    verdict = 'water-urgent';
  }

  const sections: FarmerReportSection[] = [
    {
      title: '作物今天渴不渴？',
      emoji: '🍅',
      content:
        `今天是番茄的「${stageLabel}」，综合温湿度、光照和风力，` +
        `作物蒸腾消耗约 ${result.etc.toFixed(1)} mm 水。${
          result.soilCorrection >= 1.2
            ? '目前土壤偏干，要及时补水，防中午萎蔫！'
            : result.soilCorrection <= 0.6
            ? '土壤比较湿，千万少浇，避免裂果和根腐。'
            : '土壤湿度尚可，按建议量浇即可。'
        }`,
    },
    {
      title: '今天要浇多少水？',
      emoji: '💧',
      content:
        `按建议量：总共要浇 ${grossMm.toFixed(1)} 毫米，换算下来每亩 ${grossM3.toFixed(1)} 方。` +
        `（灌溉系统效率按 ${(input.irrigationEfficiency * 100).toFixed(0)}% 计）`,
      highlight: `${grossM3.toFixed(1)} 方/亩 ≈ ${grossMm.toFixed(1)} mm`,
    },
  ];

  const windowList = result.scheduledWindows
    .filter((w) => w.startHour >= 0)
    .map((w) => {
      const time =
        w.startHour === w.endHour
          ? `${w.startHour}:00 前后`
          : `${String(w.startHour).padStart(2, '0')}:00 ~ ${String(w.endHour).padStart(2, '0')}:00`;
      return { time, priority: w.priority, reason: w.reason };
    });

  if (windowList.length > 0) {
    sections.push({
      title: '什么时候浇最好？',
      emoji: '⏰',
      content: windowList
        .map(
          (w, i) =>
            `${i + 1}. ${w.priority === 'primary' ? '【首选】' : '【补充】'}${w.time}：${w.reason}`
        )
        .join('\n'),
    });
  }

  if (result.warnings.length > 0) {
    sections.push({
      title: '需要您留意',
      emoji: '⚠️',
      content:
        `今天有 ${result.warnings.length} 项传感器数据异常或缺失，` +
        `系统已经保守估算（整体偏大 ${((result.totalConservativeFactor - 1) * 100).toFixed(
          0
        )}%），建议下午再观察作物状态，如中午叶片打卷可补浇少量。`,
    });
  }

  const actionList = generateActionList(input, result, windowList);
  return { headline, verdict, sections, actionList };
};

const generateActionList = (
  input: SensorInput,
  result: ETResult,
  windows: Array<{ time: string; priority: 'primary' | 'secondary'; reason: string }>
): string[] => {
  const actions: string[] = [];
  const gross = result.grossIrrigation;

  if (gross <= 0.5) {
    actions.push('今天不用开阀门，省水省电；下午4点后观察一下叶片是否打卷。');
    return actions;
  }

  const primary = windows.find((w) => w.priority === 'primary');
  if (primary) {
    actions.push(`${primary.time} 开启灌溉，优先完成总量的 ${windows.length > 1 ? '60%~70%' : '100%'}。`);
  }

  const secondary = windows.filter((w) => w.priority === 'secondary');
  secondary.forEach((w) => {
    if (w.time.includes('12:00')) {
      actions.push('正午如温度超32℃，可开微喷5~10分钟降温（不是补水，是增湿降温）。');
    } else {
      actions.push(`${w.time} 补浇剩余的 30%~40%，注意观察地表是否积水。`);
    }
  });

  if (input.cropStage === 'fruit_expansion') {
    actions.push('膨果期特别注意：水量不要忽大忽小，避免裂果；如发现裂果增多，适当减量10%。');
  } else if (input.cropStage === 'mature') {
    actions.push('成熟期建议控水提质，可按建议量的80%~90%浇，甜度更好。');
  } else if (input.cropStage === 'flowering') {
    actions.push('开花期湿度不要过大，注意放风排湿，防止灰霉病。');
  }

  actions.push('灌溉结束后，把实际浇水量填到「历史记录」，下周就能看偏差分析啦 ✍️');
  return actions;
};

export interface TechnicianReport {
  inputParams: Array<{ key: string; label: string; value: string; note?: string }>;
  calcSteps: ETResult['calcSteps'];
  finalResult: {
    label: string;
    value: string;
  };
  warnings: Array<{
    type: string;
    message: string;
    factor: string;
  }>;
  record: DailyRecord | null;
}

export const buildTechnicianReport = (
  input: SensorInput,
  result: ETResult,
  record?: DailyRecord
): TechnicianReport => {
  const stageText = input.cropStage
    ? CROP_STAGE_LABELS[input.cropStage]
    : '未选择（已×1.15）';

  const inputParams: TechnicianReport['inputParams'] = [
    {
      key: 'temperature',
      label: '气温 T',
      value: input.temperature !== null ? `${input.temperature.toFixed(1)} ℃` : '缺测，代用 25℃',
      note: input.temperatureRaw
        ? `原始 ${input.temperatureRaw.value}${
            input.temperatureRaw.unit === 'celsius' ? '℃' : '℉'
          }`
        : undefined,
    },
    {
      key: 'humidity',
      label: '相对湿度 RH',
      value: input.humidity !== null ? `${input.humidity.toFixed(0)} %` : '缺测，代用 60%',
      note:
        input.humidityPrevious !== null
          ? `前值 ${input.humidityPrevious}%，变化 ${
              input.humidity !== null
                ? (input.humidity - input.humidityPrevious).toFixed(0) + '%'
                : 'N/A'
            }`
          : undefined,
    },
    {
      key: 'radiation',
      label: '太阳辐射 Rₛ',
      value: input.radiation !== null ? `${input.radiation.toFixed(0)} W/m²` : '缺测，代用 250 W/m²',
      note: input.radiationRaw
        ? `原始 ${input.radiationRaw.value}${
            input.radiationRaw.unit === 'w_m2' ? ' W/m²' : ' lux'
          }`
        : undefined,
    },
    {
      key: 'wind',
      label: '风速 u',
      value: input.wind !== null ? `${input.wind.toFixed(2)} m/s` : '缺测，代用 0.5 m/s',
      note: input.windRaw
        ? `原始 ${input.windRaw.value}${input.windRaw.unit === 'm_s' ? ' m/s' : ' km/h'}`
        : undefined,
    },
    { key: 'stage', label: '作物阶段', value: stageText },
    {
      key: 'soilMoisture',
      label: '土壤湿度 θᵥ',
      value: input.soilMoisture !== null ? `${input.soilMoisture.toFixed(1)} 体积%` : '缺测，代用 25%',
      note: input.soilMoistureRaw
        ? `原始 ${input.soilMoistureRaw.value}${
            input.soilMoistureRaw.unit === 'vol_percent' ? ' 体积%' : ' mbar'
          }`
        : undefined,
    },
    {
      key: 'efficiency',
      label: '灌溉效率 η',
      value: `${(input.irrigationEfficiency * 100).toFixed(0)}%（${
        { drip: '滴灌', sprinkler: '微喷', furrow: '沟灌' }[input.irrigationMethod]
      }）`,
    },
    {
      key: 'conservativeFactor',
      label: '总保守系数',
      value: `×${result.totalConservativeFactor.toFixed(3)} （共 ${result.warnings.length} 项）`,
    },
  ];

  return {
    inputParams,
    calcSteps: result.calcSteps,
    finalResult: {
      label: '最终毛灌溉量',
      value: `${result.grossIrrigation.toFixed(2)} mm = ${result.grossIrrigationM3Mu.toFixed(
        2
      )} 方/亩  （净灌溉 ${result.netIrrigation.toFixed(2)} mm，即 ${mmToM3Mu(
        result.netIrrigation
      ).toFixed(2)} 方/亩）`,
    },
    warnings: result.warnings.map((w) => ({
      type: {
        missing: '缺测代用',
        jump: '跳变异常',
        stage_unselected: '阶段未选',
        out_of_range: '范围异常',
      }[w.type],
      message: w.message,
      factor: `×${w.conservativeFactor.toFixed(3)}`,
    })),
    record: record ?? null,
  };
};
