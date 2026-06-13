import { Bridge, Crack, CrackAlias, Measurement, ThresholdConfig, DEFAULT_THRESHOLD } from '../types';

export const MOCK_BRIDGES: Bridge[] = [
  { id: 'b1', name: '长江大桥', location: '南京市' },
  { id: 'b2', name: '黄河大桥', location: '济南市' },
  { id: 'b3', name: '珠江大桥', location: '广州市' },
];

export const MOCK_CRACKS: Crack[] = [
  { id: 'c1', bridgeId: 'b1', code: 'L-001', location: '主梁跨中', description: '纵向裂缝，沿梁底分布' },
  { id: 'c2', bridgeId: 'b1', code: 'L-002', location: '桥墩顶部', description: '横向裂缝，环向分布' },
  { id: 'c3', bridgeId: 'b1', code: 'L-003', location: '桥台侧墙', description: '竖向裂缝' },
  { id: 'c4', bridgeId: 'b2', code: 'H-001', location: '主梁1/4跨', description: '斜向裂缝' },
  { id: 'c5', bridgeId: 'b2', code: 'H-002', location: '盖梁端部', description: '横向裂缝' },
  { id: 'c6', bridgeId: 'b3', code: 'Z-001', location: '箱梁腹板', description: '竖向裂缝，曾用名Z-001-old' },
];

export const MOCK_CRACK_ALIASES: CrackAlias[] = [
  {
    id: 'a1',
    crackId: 'c6',
    oldCode: 'Z-001-old',
    newCode: 'Z-001',
    changeDate: '2023-06-01',
  },
  {
    id: 'a2',
    crackId: 'c3',
    oldCode: 'L-003-old',
    newCode: 'L-003',
    changeDate: '2023-01-15',
  },
];

function generateMeasurements(): Measurement[] {
  const measurements: Measurement[] = [];
  let idCounter = 1;

  const crackData = [
    {
      crackId: 'c1',
      startWidth: 0.8,
      growthPerQuarter: 0.08,
      startDate: '2024-01-15',
      baseTemp: 5,
      surveyor: '张三',
      tool: '游标卡尺-A型',
      angle: '正面',
    },
    {
      crackId: 'c2',
      startWidth: 1.2,
      growthPerQuarter: 0.15,
      startDate: '2024-01-15',
      baseTemp: 5,
      surveyor: '李四',
      tool: '游标卡尺-A型',
      angle: '侧面',
    },
    {
      crackId: 'c3',
      startWidth: 0.5,
      growthPerQuarter: 0.03,
      startDate: '2024-01-15',
      baseTemp: 5,
      surveyor: '张三',
      tool: '游标卡尺-B型',
      angle: '正面',
    },
    {
      crackId: 'c4',
      startWidth: 2.0,
      growthPerQuarter: 0.35,
      startDate: '2024-01-15',
      baseTemp: 3,
      surveyor: '王五',
      tool: '游标卡尺-A型',
      angle: '斜向',
    },
    {
      crackId: 'c5',
      startWidth: 1.0,
      growthPerQuarter: 0.05,
      startDate: '2024-01-15',
      baseTemp: 3,
      surveyor: '王五',
      tool: '游标卡尺-B型',
      angle: '正面',
    },
    {
      crackId: 'c6',
      startWidth: 1.8,
      growthPerQuarter: 0.12,
      startDate: '2024-01-15',
      baseTemp: 12,
      surveyor: '赵六',
      tool: '游标卡尺-A型',
      angle: '正面',
    },
  ];

  const quarters = [
    { date: '2024-01-15', tempOffset: 0 },
    { date: '2024-04-15', tempOffset: 20 },
    { date: '2024-07-15', tempOffset: 30 },
    { date: '2024-10-15', tempOffset: 15 },
    { date: '2025-01-15', tempOffset: 2 },
    { date: '2025-04-15', tempOffset: 18 },
    { date: '2025-07-15', tempOffset: 32 },
    { date: '2025-10-15', tempOffset: 16 },
    { date: '2026-01-15', tempOffset: 3 },
    { date: '2026-04-15', tempOffset: 22 },
  ];

  crackData.forEach((crack) => {
    quarters.forEach((q, idx) => {
      const width = crack.startWidth + crack.growthPerQuarter * idx + (Math.random() - 0.5) * 0.05;
      const temperature = crack.baseTemp + q.tempOffset + (Math.random() - 0.5) * 2;
      
      let surveyor = crack.surveyor;
      let tool = crack.tool;
      let angle = crack.angle;
      
      if (crack.crackId === 'c2' && idx >= 4) {
        surveyor = '赵六';
      }
      if (crack.crackId === 'c4' && idx >= 5) {
        tool = '游标卡尺-C型';
      }
      if (crack.crackId === 'c1' && idx === 6) {
        angle = '侧面';
      }

      measurements.push({
        id: `m${idCounter++}`,
        crackId: crack.crackId,
        measureDate: q.date,
        widthRaw: Number(width.toFixed(2)),
        widthUnit: 'mm',
        widthMm: Number(width.toFixed(2)),
        temperature: Number(temperature.toFixed(1)),
        photoId: `IMG_${String(1000 + idCounter).padStart(4, '0')}`,
        photoAngle: angle,
        surveyor,
        rechecker: idx % 2 === 0 ? '李工' : '王工',
        tool,
        notes: '',
        anomalies: [],
      });
    });
  });

  measurements[12].widthRaw = 0.15;
  measurements[12].widthUnit = 'cm';
  measurements[12].widthMm = 1.5;

  return measurements;
}

export const MOCK_MEASUREMENTS: Measurement[] = generateMeasurements();

export const MOCK_THRESHOLD: ThresholdConfig = DEFAULT_THRESHOLD;

export const PHOTO_ANGLES = ['正面', '侧面', '斜向', '仰视', '俯视'];

export const TOOLS = ['游标卡尺-A型', '游标卡尺-B型', '游标卡尺-C型', '塞尺', '裂缝测宽仪'];

export const SURVEYORS = ['张三', '李四', '王五', '赵六', '钱七', '孙八'];

export const BRIDGE_LOCATIONS = [
  '主梁跨中',
  '主梁1/4跨',
  '主梁3/4跨',
  '桥墩顶部',
  '桥墩底部',
  '桥台侧墙',
  '盖梁端部',
  '盖梁中部',
  '箱梁腹板',
  '箱梁顶板',
  '箱梁底板',
];

export const CRACK_DESCRIPTIONS = [
  '纵向裂缝',
  '横向裂缝',
  '竖向裂缝',
  '斜向裂缝',
  '环向裂缝',
  '网状裂缝',
  '沿梁底分布',
  '沿腹板分布',
];
