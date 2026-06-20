import type { LoadStandard, Task, Cargo } from '@/types';
import { generateId, getCargoColor } from '@/utils/calculator';

export const defaultStandards: LoadStandard[] = [
  {
    id: 'std-1',
    name: '4.2米厢货标准',
    vehicleType: '4.2m厢式货车',
    frontLimit: 3500,
    rearLimit: 4500,
    totalLimit: 8000,
    isDefault: true,
  },
  {
    id: 'std-2',
    name: '6.8米货车标准',
    vehicleType: '6.8m载货汽车',
    frontLimit: 6000,
    rearLimit: 10000,
    totalLimit: 16000,
    isDefault: false,
  },
  {
    id: 'std-3',
    name: '9.6米单车标准',
    vehicleType: '9.6m单桥货车',
    frontLimit: 7000,
    rearLimit: 11000,
    totalLimit: 18000,
    isDefault: false,
  },
];

const sampleCargoes: Cargo[] = [
  {
    id: generateId(),
    name: '电机A批次',
    weight: 800,
    position: 1200,
    width: 1000,
    color: getCargoColor(0),
  },
  {
    id: generateId(),
    name: '控制箱',
    weight: 500,
    position: 2500,
    width: 800,
    color: getCargoColor(1),
  },
  {
    id: generateId(),
    name: '钢材捆',
    weight: 1200,
    position: 1800,
    width: 1200,
    color: getCargoColor(2),
  },
  {
    id: generateId(),
    name: '包装箱B',
    weight: 600,
    position: 3200,
    width: 900,
    color: getCargoColor(3),
  },
];

export const defaultTask: Task = {
  id: generateId(),
  name: '北京-上海 2024-06-20',
  vehiclePlate: '京A·12345',
  vehicleParams: {
    wheelbase: 3800,
    emptyFrontAxle: 2200,
    emptyRearAxle: 2800,
    carriageLength: 4200,
    carriageOffset: 300,
  },
  standardId: 'std-1',
  cargoes: sampleCargoes,
  versions: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export function createSampleTasks(): Task[] {
  return [
    {
      ...defaultTask,
      id: 'task-sample-1',
      name: '北京-上海 运输任务',
      vehiclePlate: '京A·12345',
      versions: [
        {
          id: 'ver-1',
          taskId: 'task-sample-1',
          versionNumber: 1,
          note: '初次试算',
          cargoSnapshot: [],
          axleResult: {
            frontAxle: 3000,
            rearAxle: 4000,
            totalWeight: 7000,
            frontMargin: 500,
            rearMargin: 500,
            totalMargin: 1000,
            frontOverloaded: false,
            rearOverloaded: false,
            totalOverloaded: false,
            frontRatio: 0.857,
            rearRatio: 0.889,
          },
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
      ],
    },
  ];
}
