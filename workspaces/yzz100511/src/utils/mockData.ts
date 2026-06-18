import type { MallConfig, ExhibitionObject, ApprovalRecord, PowerCheckpoint } from '../types';
import { v4 as uuidv4 } from 'uuid';

export const defaultMallConfig: MallConfig = {
  id: uuidv4(),
  name: '万象城购物中心',
  atriumDimensions: {
    width: 30,
    depth: 30,
    height: 15,
  },
  floorLoadCapacity: 5.0,
  minFireExitWidth: 1.8,
  minPassageWidth: 1.5,
  powerPoints: [
    { id: uuidv4(), name: '电源点A', position: [-12, 0.1, -12] },
    { id: uuidv4(), name: '电源点B', position: [12, 0.1, -12] },
    { id: uuidv4(), name: '电源点C', position: [-12, 0.1, 12] },
    { id: uuidv4(), name: '电源点D', position: [12, 0.1, 12] },
    { id: uuidv4(), name: '电源点E', position: [0, 0.1, -14] },
    { id: uuidv4(), name: '电源点F', position: [0, 0.1, 14] },
  ],
  fireExits: [
    {
      id: uuidv4(),
      name: '消防通道1',
      position: [-14, 0.01, 0],
      dimensions: { width: 2, depth: 10, height: 0.1 },
    },
    {
      id: uuidv4(),
      name: '消防通道2',
      position: [14, 0.01, 0],
      dimensions: { width: 2, depth: 10, height: 0.1 },
    },
  ],
  entrances: [
    {
      id: uuidv4(),
      name: '客流入口1',
      position: [0, 0.01, -14],
      dimensions: { width: 6, depth: 3, height: 0.1 },
    },
    {
      id: uuidv4(),
      name: '客流入口2',
      position: [0, 0.01, 14],
      dimensions: { width: 6, depth: 3, height: 0.1 },
    },
  ],
};

export const defaultObjects: ExhibitionObject[] = [
  {
    id: uuidv4(),
    type: 'booth',
    name: '主展台',
    position: [0, 0, 0],
    dimensions: { width: 6, depth: 4, height: 1.2 },
    weight: 500,
    weightUnit: 'kg',
    area: 24,
    areaUnit: 'm2',
    hasPower: true,
    powerSourceId: defaultMallConfig.powerPoints[0].id,
    notes: '品牌主展示区，居中放置',
  },
  {
    id: uuidv4(),
    type: 'car',
    name: '展示车辆1',
    position: [-8, 0, -5],
    dimensions: { width: 2, depth: 5, height: 1.5 },
    weight: 1.8,
    weightUnit: 'ton',
    area: 10,
    areaUnit: 'm2',
    hasPower: false,
  },
  {
    id: uuidv4(),
    type: 'car',
    name: '展示车辆2',
    position: [8, 0, -5],
    dimensions: { width: 2, depth: 5, height: 1.5 },
    weight: 2.2,
    weightUnit: 'ton',
    area: 10,
    areaUnit: 'm2',
    hasPower: false,
  },
  {
    id: uuidv4(),
    type: 'barrier',
    name: '围挡1',
    position: [0, 0, 8],
    dimensions: { width: 10, depth: 0.3, height: 1.2 },
    weight: 50,
    weightUnit: 'kg',
    area: 3,
    areaUnit: 'm2',
    hasPower: false,
  },
];

export const sampleApprovalRecords: ApprovalRecord[] = [
  {
    id: uuidv4(),
    projectName: '2024夏季车展',
    planName: '2024夏季车展方案',
    brandName: '奔驰汽车',
    date: '2024-06-01',
    status: 'approved',
    objects: defaultObjects,
    risks: [],
    approver: '物业张经理',
    createdAt: '2024-06-01T10:00:00Z',
    reviewedAt: '2024-06-02T14:30:00Z',
    loadBasis: '所有展具单位面积承重均低于5.0kN/m²限值',
    passageBasis: '通道宽度均满足1.5m最小要求，消防通道无遮挡',
  },
  {
    id: uuidv4(),
    projectName: '家电新品发布展',
    planName: '家电新品发布展',
    brandName: '海尔智家',
    date: '2024-06-10',
    status: 'rejected',
    objects: [
      {
        id: uuidv4(),
        type: 'booth',
        name: '家电展台',
        position: [0, 0, 0],
        dimensions: { width: 8, depth: 8, height: 2 },
        weight: 8,
        weightUnit: 'ton',
        area: 64,
        areaUnit: 'm2',
        hasPower: true,
      },
    ],
    risks: [],
    approver: '物业李主管',
    createdAt: '2024-06-10T09:00:00Z',
    reviewedAt: '2024-06-11T11:00:00Z',
    rectificationOpinion: '1. 展台重量超标，需分散布置；2. 请将展台向北移动2米，确保南侧通道≥2m；3. 需提供详细的承重计算书。',
    loadBasis: '展台总重8吨，面积64m²，单位承重1.23kN/m²（符合），但集中荷载建议分散',
    passageBasis: '当前布置导致北侧通道仅1.2m，小于1.5m要求',
  },
  {
    id: uuidv4(),
    projectName: '新能源汽车体验展',
    planName: '新能源汽车体验展',
    brandName: '蔚来汽车',
    date: '2024-06-15',
    status: 'pending',
    objects: [
      {
        id: uuidv4(),
        type: 'booth',
        name: '体验区展台',
        position: [0, 0, 0],
        dimensions: { width: 5, depth: 5, height: 1 },
        weight: 3,
        weightUnit: 'ton',
        area: 25,
        areaUnit: 'm2',
        hasPower: true,
      },
      {
        id: uuidv4(),
        type: 'car',
        name: 'ET5展车',
        position: [-6, 0, 0],
        dimensions: { width: 1.96, depth: 4.79, height: 1.5 },
        weight: 2.2,
        weightUnit: 'ton',
        area: 9.4,
        areaUnit: 'm2',
        hasPower: true,
      },
    ],
    risks: [],
    createdAt: '2024-06-15T16:00:00Z',
  },
];

export const createPowerCheckpoints = (): PowerCheckpoint[] => {
  return defaultMallConfig.powerPoints.map((pp) => ({
    id: uuidv4(),
    powerPointId: pp.id,
    name: pp.name,
    location: `位置 (${pp.position[0].toFixed(1)}, ${pp.position[2].toFixed(1)})`,
    position: pp.position,
    status: 'connected' as const,
  }));
};

export const objectDefaults: Record<string, Partial<ExhibitionObject>> = {
  booth: {
    dimensions: { width: 4, depth: 3, height: 1.2 },
    weight: 300,
    weightUnit: 'kg',
    area: 12,
    areaUnit: 'm2',
    hasPower: true,
  },
  car: {
    dimensions: { width: 2, depth: 5, height: 1.5 },
    weight: 1.8,
    weightUnit: 'ton',
    area: 10,
    areaUnit: 'm2',
    hasPower: false,
  },
  barrier: {
    dimensions: { width: 5, depth: 0.3, height: 1.2 },
    weight: 30,
    weightUnit: 'kg',
    area: 1.5,
    areaUnit: 'm2',
    hasPower: false,
  },
};

export const getObjectName = (type: string): string => {
  const names: Record<string, string> = {
    booth: '展台',
    car: '车辆',
    barrier: '围挡',
    power: '电源点',
    fire_exit: '消防通道',
    entrance: '客流入口',
  };
  return names[type] || type;
};
