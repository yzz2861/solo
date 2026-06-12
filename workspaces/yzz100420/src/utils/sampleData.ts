import type {
  FiringRecord,
  TemperaturePoint,
  StudentWork,
  WorkBatch,
  GlazeRecipe,
  PlainSummary,
} from '../types';
import { buildCompleteRecord, generateId } from './curveCalc';
import { PRESET_PLANS } from './dataParser';

const GLAZES: GlazeRecipe[] = [
  {
    id: generateId(),
    name: '天青釉',
    ingredients: [
      { name: '长石', percentage: 40 },
      { name: '石英', percentage: 25 },
      { name: '高岭土', percentage: 15 },
      { name: '石灰石', percentage: 12 },
      { name: '氧化钴', percentage: 0.8 },
      { name: '氧化铁', percentage: 0.2 },
    ],
    firingTemp: 1240,
    notes: '还原气氛效果更佳，需缓慢升温至石英转化点',
  },
  {
    id: generateId(),
    name: '天目釉',
    ingredients: [
      { name: '长石', percentage: 35 },
      { name: '氧化铁', percentage: 12 },
      { name: '石灰石', percentage: 18 },
      { name: '高岭土', percentage: 20 },
      { name: '碳酸镁', percentage: 8 },
      { name: '氧化锰', percentage: 2 },
    ],
    firingTemp: 1260,
    notes: '高温还原，保温时间影响油滴效果',
  },
  {
    id: generateId(),
    name: '钧窑月白',
    ingredients: [
      { name: '长石', percentage: 38 },
      { name: '石英', percentage: 20 },
      { name: '方解石', percentage: 15 },
      { name: '氧化锌', percentage: 8 },
      { name: '高岭土', percentage: 12 },
      { name: '氧化铜', percentage: 0.5 },
      { name: '五氧化二磷', percentage: 4 },
    ],
    firingTemp: 1250,
    notes: '气氛敏感，快速冷却可增加乳浊度',
  },
  {
    id: generateId(),
    name: '酱黄釉',
    ingredients: [
      { name: '长石', percentage: 42 },
      { name: '石英', percentage: 22 },
      { name: '氧化铁', percentage: 8 },
      { name: '石灰石', percentage: 14 },
      { name: '高岭土', percentage: 10 },
      { name: '氧化钛', percentage: 2 },
    ],
    firingTemp: 1230,
    notes: '升温过快易起泡，保温充足发色均匀',
  },
  {
    id: generateId(),
    name: '汝窑天蓝',
    ingredients: [
      { name: '长石', percentage: 35 },
      { name: '玛瑙末', percentage: 10 },
      { name: '石英', percentage: 20 },
      { name: '石灰石', percentage: 14 },
      { name: '高岭土', percentage: 15 },
      { name: '氧化铁', percentage: 1.2 },
      { name: '氧化钛', percentage: 0.8 },
    ],
    firingTemp: 1220,
    notes: '温和氧化焰，忌快速升温防止开裂',
  },
];

const addNoise = (base: number, rangePercent: number): number => {
  const range = base * (rangePercent / 100);
  return base + (Math.random() * 2 - 1) * range;
};

export const generateSampleRecord = (): FiringRecord => {
  const plan = JSON.parse(JSON.stringify(PRESET_PLANS[0].plan));
  const startAt = new Date('2026-06-10T20:00:00').getTime();
  const points: TemperaturePoint[] = [];
  const interval = 2 * 60 * 1000;
  const totalDuration = 26 * 60 * 60 * 1000;

  let temp = 25;

  for (let t = 0; t <= totalDuration; t += interval) {
    const timeHours = t / 3_600_000;
    let target = 25;

    for (const seg of plan.segments) {
      if (timeHours >= seg.startTime && timeHours <= seg.endTime) {
        const dur = seg.endTime - seg.startTime;
        const prog = dur > 0 ? (timeHours - seg.startTime) / dur : 0;
        target = seg.startTemp + (seg.endTemp - seg.startTemp) * prog;
        break;
      }
    }

    let noise = 0;
    if (timeHours >= 3.5 && timeHours <= 5.0) {
      noise = 30 + Math.random() * 25;
    } else if (timeHours >= 10.5 && timeHours <= 11.8) {
      noise = -20 - Math.random() * 20;
    } else if (timeHours >= 12.3 && timeHours <= 13.0) {
      noise = 15 + Math.random() * 15;
    } else if (timeHours >= 17 && timeHours <= 18.5) {
      noise = -35 - Math.random() * 25;
    } else {
      noise = addNoise(0, target * 0.015);
    }

    temp = target + noise;
    temp = Math.round(temp * 10) / 10;

    const isValid = !(t >= 10 * 3_600_000 && t <= 10.08 * 3_600_000);

    if (isValid) {
      points.push({
        timestamp: startAt + t,
        temperature: temp,
        unit: 'C',
        isValid: true,
      });
    }
  }

  const record = buildCompleteRecord('2026-06-10 中温釉烧第3窑', points, plan, 'C');

  const students = [
    { name: '林雨欣', work: '荷叶边茶盏', glazeIndex: 0, pos: 'A层左前', deviation: 'excellent' as const, color: '温润天青色，釉面匀净', expected: '天青色' },
    { name: '陈思远', work: '直口品茗杯', glazeIndex: 1, pos: 'A层中右', deviation: 'slight' as const, color: '灰褐偏暗，油滴不明显', expected: '深褐油滴' },
    { name: '王雅雯', work: '月白釉花瓶', glazeIndex: 2, pos: 'B层中心', deviation: 'good' as const, color: '乳浊月白，微蓝', expected: '乳白泛蓝' },
    { name: '刘子涵', work: '酱釉盖罐', glazeIndex: 3, pos: 'B层右后', deviation: 'significant' as const, color: '暗灰发闷，表面起泡', expected: '酱黄光泽' },
    { name: '赵铭轩', work: '汝窑笔洗', glazeIndex: 4, pos: 'C层左前', deviation: 'slight' as const, color: '略偏灰，开片细密', expected: '天蓝色开片' },
    { name: '周晓彤', work: '青瓷公道杯', glazeIndex: 0, pos: 'C层中心', deviation: 'good' as const, color: '青色纯正，釉面光亮', expected: '温润天青' },
    { name: '吴俊杰', work: '天目斗笠盏', glazeIndex: 1, pos: 'A层右前', deviation: 'good' as const, color: '兔毫纹清晰可见', expected: '黑褐兔毫' },
    { name: '郑婉清', work: '钧釉花盆', glazeIndex: 2, pos: 'D层左后', deviation: 'failed' as const, color: '灰蒙失透，釉色斑驳', expected: '月白泛紫' },
  ];

  const works: StudentWork[] = students.map((s, idx) => {
    const glaze = GLAZES[s.glazeIndex];
    const relatedSegments = record.segments.filter((seg) => {
      if (idx === 1 && seg.type === 'heating' && seg.startTime > 9) return true;
      if (idx === 3 && seg.type === 'heating' && seg.startTime > 3 && seg.startTime < 6) return true;
      if (idx === 3 && seg.type === 'holding') return true;
      if (idx === 7 && seg.type === 'heating' && seg.startTime > 9) return true;
      if (idx === 7 && seg.type === 'cooling' && seg.startTime < 18) return true;
      if (idx === 4 && seg.type === 'cooling' && seg.startTime < 18) return true;
      return false;
    }).map((s) => s.id);

    let impact = '釉色正常，烧成曲线符合预期，各阶段温度控制良好。';
    if (idx === 1) impact = '第10-12小时升温不足（低于目标约20-40℃），导致釉料熔融不充分，天目釉的铁结晶未能充分析出形成油滴。建议下次加强后期火力。';
    if (idx === 3) impact = '①第4-5小时升温超速（+30-55℃偏高），釉面起泡；②12:20-13:00保温段温度波动过大（+15-30℃），发色不均呈灰暗。建议：400-600℃区间控制在100℃/h以内，保温段稳定±5℃。';
    if (idx === 4) impact = '17:00-19:00冷却段降温过快（低于目标35-60℃），导致釉面内应力过大，虽有开片但色调偏灰冷。建议500-900℃区间缓慢降温，可在800℃短时停留。';
    if (idx === 7) impact = '多因素叠加：①升温末段温度不足，釉料反应不完全；②急冷段降温过快，乳浊相未能充分形成。此件窑位（D层左后）靠近窑门也可能温度偏低。建议移至中层中心位置。';

    return {
      id: generateId(),
      studentName: s.name,
      workName: s.work,
      glaze,
      expectedColor: s.expected,
      actualColor: s.color,
      colorDeviation: s.deviation,
      notes: '',
      relatedSegmentIds: relatedSegments,
      relatedEventIds: record.events.slice(0, 1).map((e) => e.id),
      impactExplanation: impact,
      shelfPosition: s.pos,
    };
  });

  record.batches = [
    {
      id: generateId(),
      name: '第一批次（上半窑）',
      shelfPosition: 'A-B层',
      works: works.slice(0, 4),
    },
    {
      id: generateId(),
      name: '第二批次（下半窑）',
      shelfPosition: 'C-D层',
      works: works.slice(4),
    },
  ];

  if (!record.events.find((e) => e.type === 'lid_open')) {
    record.events.push({
      id: generateId(),
      timestamp: startAt + 21.5 * 3_600_000,
      timeHours: 21.5,
      type: 'lid_open',
      title: '手动开盖',
      description: '约400℃时半开窑门10分钟辅助冷却，窑门开度约15%',
      durationMinutes: 10,
      params: { openDegree: 15 },
    });
  }

  if (!record.events.find((e) => e.type === 'manual_adjust')) {
    record.events.push({
      id: generateId(),
      timestamp: startAt + 4.2 * 3_600_000,
      timeHours: 4.2,
      type: 'manual_adjust',
      title: '手动加大火力',
      description: '发现升温偏慢，调增煤气阀开度10%',
      params: { adjustment: '+10% gas' },
    });
  }

  return record;
};

export const generateSampleRecord2 = (): FiringRecord => {
  const plan = JSON.parse(JSON.stringify(PRESET_PLANS[2].plan));
  const startAt = new Date('2026-06-05T18:00:00').getTime();
  const points: TemperaturePoint[] = [];
  const interval = 3 * 60 * 1000;
  const totalDuration = 25 * 60 * 60 * 1000;

  for (let t = 0; t <= totalDuration; t += interval) {
    const timeHours = t / 3_600_000;
    let target = 25;
    for (const seg of plan.segments) {
      if (timeHours >= seg.startTime && timeHours <= seg.endTime) {
        const dur = seg.endTime - seg.startTime;
        const prog = dur > 0 ? (timeHours - seg.startTime) / dur : 0;
        target = seg.startTemp + (seg.endTemp - seg.startTemp) * prog;
        break;
      }
    }
    const temp = Math.round(addNoise(target, 1.2) * 10) / 10;
    points.push({ timestamp: startAt + t, temperature: temp, unit: 'C', isValid: true });
  }

  const rec = buildCompleteRecord('2026-06-05 高温还原柴烧', points, plan, 'C');
  const glaze = GLAZES[1];
  rec.batches = [
    {
      id: generateId(),
      name: '柴烧主窑',
      shelfPosition: '全窑5层',
      works: [
        {
          id: generateId(),
          studentName: '陶艺大师班',
          workName: '综合柴烧作品组',
          glaze,
          expectedColor: '自然落灰釉、火痕',
          actualColor: '灰褐火痕明显，局部草木灰釉',
          colorDeviation: 'excellent',
          notes: '本次柴烧整体成功，气氛控制稳定',
          relatedSegmentIds: rec.segments.map((s) => s.id),
          relatedEventIds: [],
          impactExplanation: '还原气氛控制良好，各段温度曲线平稳，落灰效果自然。',
          shelfPosition: '多层',
        },
      ],
    },
  ];
  return rec;
};

export const generatePlainSummary = (record: FiringRecord): PlainSummary => {
  const goodPoints: { icon: string; title: string; detail: string }[] = [];
  const warnPoints: { icon: string; title: string; detail: string }[] = [];
  const suggestions: { icon: string; title: string; detail: string }[] = [];

  const s = record.summary;
  goodPoints.push({
    icon: '🌡️',
    title: `最高温度达到 ${s.peakTemp.toFixed(0)}℃`,
    detail: `在第 ${s.peakTime.toFixed(1)} 小时到达峰值，满足釉烧需求`,
  });

  if (s.avgDeviation < 15) {
    goodPoints.push({
      icon: '📏',
      title: `整体偏差较小（平均 ${s.avgDeviation.toFixed(1)}℃）`,
      detail: '大部分时间曲线与目标吻合良好',
    });
  }

  if (s.totalHoldingHours > 0.8) {
    goodPoints.push({
      icon: '🔥',
      title: `保温时长充足（${s.totalHoldingHours.toFixed(1)} 小时）`,
      detail: '釉料有足够时间熔融反应，利于发色',
    });
  }

  if (s.logGaps > 0) {
    warnPoints.push({
      icon: '⚠️',
      title: `有 ${s.logGaps} 处日志断点`,
      detail: '温控记录可能不完整，部分时段数据缺失',
    });
  }

  if (s.deviationPeriods > 0) {
    warnPoints.push({
      icon: '📈',
      title: `检测到 ${s.deviationPeriods} 处高偏差时段`,
      detail: `最大偏离达 ${s.maxDeviation.toFixed(1)}℃，可能影响釉色效果`,
    });
  }

  const heatSegs = record.segments.filter((x) => x.type === 'heating');
  const coolingSegs = record.segments.filter((x) => x.type === 'cooling');
  const holdingSegs = record.segments.filter((x) => x.type === 'holding');

  const fastHeat = heatSegs.find((x) => x.targetRate && x.rate > x.targetRate * 1.2);
  if (fastHeat) {
    warnPoints.push({
      icon: '🏃',
      title: `第 ${fastHeat.startTime.toFixed(0)}-${fastHeat.endTime.toFixed(0)} 小时升温偏快`,
      detail: `实际 ${fastHeat.rate.toFixed(0)}℃/h，目标 ${fastHeat.targetRate?.toFixed(0)}℃/h，可能导致坯裂或釉面起泡`,
    });
    suggestions.push({
      icon: '🐢',
      title: '控制低温段升温速率',
      detail: '在 300-600℃ 区间降低升温速度，给坯体水分排出和石英转化留足时间',
    });
  }

  const slowHeat = heatSegs.find((x) => x.targetRate && x.rate < x.targetRate * 0.8);
  if (slowHeat) {
    warnPoints.push({
      icon: '🐢',
      title: `第 ${slowHeat.startTime.toFixed(0)}-${slowHeat.endTime.toFixed(0)} 小时升温不足`,
      detail: `实际 ${slowHeat.rate.toFixed(0)}℃/h，目标 ${slowHeat.targetRate?.toFixed(0)}℃/h，到达温度偏晚`,
    });
    suggestions.push({
      icon: '🔥',
      title: '加强后期火力',
      detail: '1000℃以上可适当加大火力，确保在预定时间到达烧成温度',
    });
  }

  const shortHold = holdingSegs.find((x) => x.durationHours < 0.8);
  if (shortHold) {
    warnPoints.push({
      icon: '⏱️',
      title: `保温段时长偏短（${shortHold.durationHours.toFixed(1)}小时）`,
      detail: '釉料可能反应不完全，发色不充分',
    });
    suggestions.push({
      icon: '☕',
      title: '延长高温保温时间',
      detail: '在最高温处增加20-30分钟保温，有利于釉面匀净和结晶形成',
    });
  }

  const fastCool = coolingSegs.find(
    (x) => x.targetRate && Math.abs(x.rate) > Math.abs(x.targetRate!) * 1.3,
  );
  if (fastCool) {
    warnPoints.push({
      icon: '❄️',
      title: `第 ${fastCool.startTime.toFixed(0)}-${fastCool.endTime.toFixed(0)} 小时降温过快`,
      detail: `实际 ${fastCool.rate.toFixed(0)}℃/h，目标 ${fastCool.targetRate?.toFixed(0)}℃/h，易产生惊釉或开裂`,
    });
    suggestions.push({
      icon: '🧘',
      title: '500-900℃区间缓慢冷却',
      detail: '此区间为石英转化点，温度骤变易产生内应力，可设置缓冷平台',
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      icon: '👍',
      title: '保持当前烧成工艺',
      detail: '本次曲线控制良好，可作为后续批次的参考标准',
    });
  }

  const segmentReviews = record.segments.map((seg, idx) => {
    let analogy = '';
    let title = '';
    let typeName = '';

    if (seg.type === 'heating') {
      typeName = `升温段 #${idx + 1}`;
      const targetR = seg.targetRate ?? 100;
      const ratio = Math.abs(seg.rate / targetR);
      if (ratio > 1.2) {
        title = '升温像开车超速了';
        analogy = `就像在限速100的路上开到了 ${(100 * ratio).toFixed(0)}，油门踩得有点猛`;
      } else if (ratio < 0.8) {
        title = '升温有点慢，像在爬坡';
        analogy = `目标要爬 ${targetR.toFixed(0)}℃/h 的坡，实际只爬了 ${Math.abs(seg.rate).toFixed(0)}℃/h`;
      } else {
        title = '升温节奏刚刚好';
        analogy = `像匀速行驶的列车，稳稳地按计划到达 ${seg.endTemp.toFixed(0)}℃`;
      }
    } else if (seg.type === 'holding') {
      typeName = `保温段 #${idx + 1}`;
      if (seg.durationHours < 0.5) {
        title = '保温像喝了一口水就走';
        analogy = `只待了 ${(seg.durationHours * 60).toFixed(0)} 分钟，釉料还没来得及好好"泡个澡"`;
      } else if (seg.avgDeviation > 15) {
        title = '保温像坐过山车';
        analogy = `温度波动较大（平均差 ${seg.avgDeviation.toFixed(1)}℃），坐不稳就很难泡出好釉色`;
      } else {
        title = '保温像泡一杯好茶';
        analogy = `稳稳地在 ${seg.startTemp.toFixed(0)}℃ 泡了 ${(seg.durationHours * 60).toFixed(0)} 分钟，刚刚好`;
      }
    } else {
      typeName = `降温段 #${idx + 1}`;
      const targetR = Math.abs(seg.targetRate ?? 100);
      const actualR = Math.abs(seg.rate);
      const ratio = actualR / targetR;
      if (ratio > 1.3) {
        title = '降温像急刹车';
        analogy = `本来要慢慢滑行，结果踩了急刹车，坯体和釉层"晕车"了`;
      } else if (ratio < 0.6) {
        title = '降温慢得像散步';
        analogy = `冷却速度偏慢，虽然对发色好但效率低，可以提前半开盖辅助`;
      } else {
        title = '降温节奏稳';
        analogy = `像坐滑梯一样平稳滑下，从 ${seg.startTemp.toFixed(0)}℃ 滑到 ${seg.endTemp.toFixed(0)}℃`;
      }
    }

    return {
      segmentId: seg.id,
      segmentName: typeName,
      type: seg.type,
      grade: seg.grade || 'B',
      title,
      analogy,
      keyMetrics: `${seg.startTemp.toFixed(0)}→${seg.endTemp.toFixed(0)}℃ | 用时 ${(seg.durationHours * 60).toFixed(0)}分钟 | 速率 ${seg.rate.toFixed(0)}℃/h`,
    };
  });

  return {
    id: generateId(),
    recordId: record.id,
    goodPoints,
    warnPoints,
    suggestions,
    segmentReviews,
  };
};
