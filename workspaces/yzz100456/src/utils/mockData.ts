import type { CraneModelPreset, CrewMember, LiftPlan, Zone, LiftOperation, RiskItem } from '@/types';

const buildRadiusTable = (baseArm: number, arms: number[], radii: number[], baseCapacities: number[][]): { armLength: number; radius: number; capacity: number }[] => {
  const result: { armLength: number; radius: number; capacity: number }[] = [];
  arms.forEach((arm, i) => {
    radii.forEach((r, j) => {
      const cap = baseCapacities[i]?.[j];
      if (cap !== undefined && cap > 0) {
        result.push({ armLength: baseArm + arm, radius: r, capacity: cap });
      }
    });
  });
  return result;
};

export const CRANE_PRESETS: CraneModelPreset[] = [
  {
    id: 'xcmg-qy50k',
    brand: '徐工',
    spec: {
      model: 'QY50K',
      maxArmLength: 42,
      ratedCapacity: 50,
      basePosition: [0, 0, 0],
      radiusTable: buildRadiusTable(
        10.6,
        [0, 5.4, 10.8, 16.2, 21.4, 26.8, 31.4],
        [3, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 34],
        [
          [50, 42, 35, 30, 23, 18.5, 15.5, 13, 11.5, 10, 8.5, 7.5, 6.5, 5.5, 4.5, 3.5, 0],
          [42, 38, 33, 29, 22, 18, 15, 12.5, 11, 9.5, 8.5, 7.5, 6.5, 5.5, 4.5, 3.5, 2.5],
          [35, 32, 29, 26, 20, 16.5, 14, 11.8, 10.5, 9, 8, 7, 6, 5, 4.2, 3.5, 2.3],
          [28, 26, 24, 22, 17.5, 14.5, 12.2, 10.5, 9.5, 8.2, 7.2, 6.4, 5.6, 4.8, 4, 3.2, 2],
          [22, 20, 19, 17.5, 14, 11.8, 10, 8.6, 7.8, 6.8, 6, 5.3, 4.7, 4, 3.4, 2.8, 1.8],
          [16, 15, 14, 13, 10.8, 9.2, 7.8, 6.8, 6, 5.2, 4.6, 4, 3.5, 3, 2.6, 2.2, 1.4],
          [11, 10.5, 10, 9.5, 8, 6.8, 5.8, 5, 4.4, 3.8, 3.3, 2.9, 2.5, 2.2, 1.9, 1.6, 1],
        ]
      )
    }
  },
  {
    id: 'zoomlion-qy80v',
    brand: '中联重科',
    spec: {
      model: 'QY80V',
      maxArmLength: 47.8,
      ratedCapacity: 80,
      basePosition: [0, 0, 0],
      radiusTable: buildRadiusTable(
        12,
        [0, 6, 12, 18, 24, 30, 35.8],
        [3, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 34, 38],
        [
          [80, 70, 62, 55, 43, 34, 28, 23.5, 20, 17.5, 15, 13.5, 12, 10.5, 9.5, 8.5, 7, 0],
          [70, 65, 58, 52, 41, 32.5, 27, 22.5, 19.5, 17, 14.5, 13, 11.5, 10, 9, 8, 6.5, 5],
          [58, 54, 50, 46, 37, 29.5, 24.5, 20.5, 18, 15.5, 13.5, 12, 10.8, 9.5, 8.5, 7.5, 6, 4.8],
          [46, 43, 41, 38, 31, 25, 21, 17.8, 15.5, 13.5, 12, 10.5, 9.5, 8.5, 7.5, 6.8, 5.4, 4.2],
          [35, 33, 31.5, 30, 25, 20.5, 17.2, 14.8, 12.8, 11.2, 10, 8.8, 7.8, 7, 6.2, 5.5, 4.4, 3.5],
          [25, 24, 23, 22, 18.8, 15.5, 13, 11.2, 9.8, 8.5, 7.5, 6.8, 6, 5.3, 4.8, 4.2, 3.3, 2.6],
          [17, 16, 15.5, 15, 13, 10.8, 9.2, 7.8, 6.8, 5.9, 5.1, 4.5, 4, 3.5, 3.1, 2.7, 2, 1.5],
        ]
      )
    }
  },
  {
    id: 'sany-stc1000',
    brand: '三一重工',
    spec: {
      model: 'STC1000C',
      maxArmLength: 50,
      ratedCapacity: 100,
      basePosition: [0, 0, 0],
      radiusTable: buildRadiusTable(
        13.2,
        [0, 6, 12, 18, 24, 30, 36.8],
        [3, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 34, 38, 42],
        [
          [100, 88, 78, 70, 55, 44, 36, 30.5, 26, 22.5, 19.8, 17.5, 15.5, 14, 12.5, 11.5, 9.5, 7.5, 0],
          [88, 82, 73, 66, 52, 42, 34.5, 29, 24.8, 21.5, 19, 16.8, 15, 13.5, 12, 11, 9, 7.2, 5.5],
          [72, 68, 63, 58, 47, 38, 31.5, 26.5, 22.8, 20, 17.5, 15.5, 13.8, 12.5, 11, 10, 8.2, 6.8, 5.2],
          [58, 55, 52, 49, 40, 32.5, 27, 22.8, 19.8, 17.2, 15.2, 13.5, 12, 10.8, 9.8, 9, 7.2, 6, 4.8],
          [44, 42, 40, 38, 32, 26, 21.8, 18.5, 16, 14, 12.3, 10.9, 9.8, 8.8, 8, 7.2, 5.8, 4.8, 3.8],
          [32, 30, 29, 28, 24, 19.8, 16.5, 14, 12, 10.5, 9.2, 8.2, 7.3, 6.6, 6, 5.4, 4.3, 3.5, 2.8],
          [21, 20, 19.5, 19, 16.5, 13.8, 11.5, 9.8, 8.5, 7.3, 6.4, 5.7, 5, 4.5, 4, 3.6, 2.8, 2.2, 1.8],
        ]
      )
    }
  }
];

export const DEFAULT_CREW: CrewMember[] = [
  { userId: 'u001', userName: '张伟', role: '安全员' },
  { userId: 'u002', userName: '李强', role: '班组长' },
  { userId: 'u003', userName: '王磊', role: '吊车司机' },
  { userId: 'u004', userName: '刘洋', role: '司索工' },
  { userId: 'u005', userName: '陈明', role: '信号司索' },
  { userId: 'u006', userName: '赵刚', role: '协助作业' },
];

export const DEFAULT_ZONES: Zone[] = [
  {
    id: 'zone-ship',
    type: 'ship_edge',
    name: '3号泊位船舷',
    polygon: [[-20, 15], [-8, 15], [-8, 28], [-20, 28]],
    height: 6,
  },
  {
    id: 'zone-warehouse',
    type: 'warehouse_door',
    name: 'A库西侧大门',
    polygon: [[18, -12], [18, -4], [24, -4], [24, -12]],
    height: 5.5,
  },
  {
    id: 'zone-forbid',
    type: 'forbidden',
    name: '高压线下禁入区',
    polygon: [[-10, -18], [6, -18], [6, -8], [-10, -8]],
    height: 12,
  },
  {
    id: 'zone-walkway',
    type: 'walkway',
    name: '东侧人员通道',
    polygon: [[10, -4], [10, 14], [14, 14], [14, -4]],
    height: 2.5,
  },
  {
    id: 'zone-obstacle',
    type: 'obstacle',
    name: '泊位消防栓组',
    polygon: [[-4, -2], [-2, -2], [-2, 2], [-4, 2]],
    height: 1.8,
  },
];

export const DEFAULT_OPERATIONS: LiftOperation[] = [
  {
    id: 'op-1',
    liftNo: 'L-001',
    armLength: 34,
    startAngle: 60,
    endAngle: 160,
    stepAngle: 5,
    liftPoint: [-14, 22, 1],
    dropPoint: [20, -8, 0.5],
    reviewed: false,
  },
  {
    id: 'op-2',
    liftNo: 'L-002',
    armLength: 30,
    startAngle: 80,
    endAngle: 140,
    stepAngle: 5,
    liftPoint: [-14, 22, 1],
    dropPoint: [16, -6, 0.5],
    reviewed: false,
  },
  {
    id: 'op-3',
    liftNo: 'L-003',
    armLength: 36,
    startAngle: 50,
    endAngle: 170,
    stepAngle: 5,
    liftPoint: [-14, 22, 1],
    dropPoint: [22, -10, 0.5],
    reviewed: false,
  },
];

export const DEMO_PLAN: LiftPlan = {
  id: 'plan-demo-001',
  planNo: 'DZ2026-0612-003',
  name: '3号泊位-发电机组卸船转库',
  createTime: '2026-06-12 14:30:00',
  createUser: '张伟（安全员）',
  version: 1,
  windSpeed: 8.5,
  remarks: '现场有六级阵风，注意风载影响；货物底部需垫木方200mm。',
  locked: false,
  crane: {
    ...CRANE_PRESETS[1].spec,
    basePosition: [0, 0, 0],
    brand: CRANE_PRESETS[1].brand,
  },
  cargo: {
    name: '柴油发电机组+底座',
    length: 5.8,
    width: 3.2,
    height: 3.6,
    weight: 28.5,
    weightUnit: 'ton',
    liftPointOffsetX: 0.15,
    liftPointOffsetY: -0.08,
    position: [-14, 22, 0.2],
  },
  zones: DEFAULT_ZONES,
  operations: DEFAULT_OPERATIONS,
  risks: [],
};
