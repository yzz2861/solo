import type { User, Chemical, ShiftRecord } from '@/types';

export const mockUsers: User[] = [
  { id: 'u1', name: '张师傅', employeeId: 'A001', role: 'admin' },
  { id: 'u2', name: '李师傅', employeeId: 'A002', role: 'admin' },
  { id: 'u3', name: '王主管', employeeId: 'S001', role: 'supervisor' },
  { id: 'u4', name: '赵主管', employeeId: 'S002', role: 'supervisor' },
];

export const mockChemicals: Chemical[] = [
  { id: 'c1', name: '三氯异氰尿酸片（强氯精）', type: 'tablet', defaultConcentration: 90, defaultUnit: 'percent' },
  { id: 'c2', name: '二氯异氰尿酸钠', type: 'tablet', defaultConcentration: 56, defaultUnit: 'percent' },
  { id: 'c3', name: '次氯酸钠溶液（漂白水）', type: 'liquid', defaultConcentration: 10, defaultUnit: 'percent' },
  { id: 'c4', name: '液氯', type: 'liquid', defaultConcentration: 100, defaultUnit: 'percent' },
  { id: 'c5', name: '二氧化氯', type: 'liquid', defaultConcentration: 2000, defaultUnit: 'ppm' },
];

const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);
const dayBefore = new Date(today);
dayBefore.setDate(dayBefore.getDate() - 2);

export const mockRecords: ShiftRecord[] = [
  {
    id: 'r1',
    calculatorId: 'u1',
    calculatorName: '张师傅',
    operatorId: 'u1',
    operatorName: '张师傅',
    createdAt: today.toISOString(),
    poolVolume: 500,
    currentChlorine: 0.5,
    targetChlorine: 1.5,
    chlorineUnit: 'mgL',
    ph: 7.4,
    chemicalId: 'c1',
    chemicalName: '三氯异氰尿酸片（强氯精）',
    chemicalConcentration: 90,
    concentrationUnit: 'percent',
    dosingMethod: 'feeder',
    calculatedDose: 555.56,
    doseUnit: 'g',
    warnings: [],
    hasBoundaryViolation: false,
    postChlorine: 1.4,
    postPh: 7.3,
    notes: '正常加药，水质良好',
    isPrinted: true,
    steps: [],
  },
  {
    id: 'r2',
    calculatorId: 'u2',
    calculatorName: '李师傅',
    operatorId: 'u2',
    operatorName: '李师傅',
    createdAt: yesterday.toISOString(),
    poolVolume: 500,
    currentChlorine: 2.0,
    targetChlorine: 1.0,
    chlorineUnit: 'mgL',
    ph: 7.5,
    chemicalId: 'c3',
    chemicalName: '次氯酸钠溶液（漂白水）',
    chemicalConcentration: 10,
    concentrationUnit: 'percent',
    dosingMethod: 'diluted',
    calculatedDose: 0,
    doseUnit: 'L',
    warnings: [
      {
        type: 'danger',
        message: '目标余氯低于当前余氯，不建议投加含氯药剂！',
        code: 'TARGET_BELOW_CURRENT',
      },
    ],
    hasBoundaryViolation: true,
    violationReason: '目标余氯低于当前余氯，不建议投加含氯药剂！',
    postChlorine: 1.8,
    postPh: 7.5,
    notes: '余氯偏高，未投加药剂，已开启循环',
    isPrinted: true,
    steps: [],
  },
  {
    id: 'r3',
    calculatorId: 'u1',
    calculatorName: '张师傅',
    operatorId: 'u2',
    operatorName: '李师傅',
    createdAt: dayBefore.toISOString(),
    poolVolume: 500,
    currentChlorine: 0.2,
    targetChlorine: 2.0,
    chlorineUnit: 'mgL',
    ph: 8.0,
    chemicalId: 'c2',
    chemicalName: '二氯异氰尿酸钠',
    chemicalConcentration: 56,
    concentrationUnit: 'percent',
    dosingMethod: 'direct',
    calculatedDose: 1.6,
    doseUnit: 'kg',
    warnings: [
      {
        type: 'warning',
        message: 'pH 值 8.0 超出正常范围 (7.2-7.8)，建议先调节 pH 再进行加药。',
        code: 'PH_OUT_OF_RANGE',
      },
      {
        type: 'warning',
        message: '余氯提升幅度过大 (1.80 mg/L)，建议分多次投加，避免单次投加量过大。',
        code: 'LARGE_CHLORINE_INCREASE',
      },
    ],
    hasBoundaryViolation: false,
    postChlorine: 1.9,
    postPh: 7.9,
    notes: '分两次投加，已通知主管',
    isPrinted: true,
    steps: [],
  },
];
