import { ChargingOrder, QueueRecord, ElectricityPrice, GunFault, PriceType } from '@/types';
import { createDateFromParts, diffMinutes } from '@/utils/date';

const ANALYSIS_DATE = '2025-05-01';

const GUN_IDS = ['G01', 'G02', 'G03', 'G04', 'G05', 'G06', 'G07', 'G08'];

const VEHICLE_MODELS = [
  '特斯拉 Model Y',
  '比亚迪 汉EV',
  '蔚来 ET5',
  '小鹏 G6',
  '理想 L7',
  '极氪 001',
  '问界 M5',
  '智己 LS7',
];

const PLATE_PREFIXES = ['京A', '沪B', '粤C', '浙A', '苏E', '川A', '鲁B', '冀F'];

const generatePlate = (): string => {
  const prefix = PLATE_PREFIXES[Math.floor(Math.random() * PLATE_PREFIXES.length)];
  const num = Math.floor(Math.random() * 90000 + 10000).toString();
  return `${prefix}·${num}`;
};

const generateOrders = (): ChargingOrder[] => {
  const orders: ChargingOrder[] = [];
  let orderIdx = 1;

  const hourlyDemand: Record<number, { avgWait: number; count: number }> = {
    0: { avgWait: 2, count: 2 }, 1: { avgWait: 1, count: 1 }, 2: { avgWait: 1, count: 1 },
    3: { avgWait: 1, count: 1 }, 4: { avgWait: 2, count: 2 }, 5: { avgWait: 5, count: 4 },
    6: { avgWait: 10, count: 8 }, 7: { avgWait: 18, count: 14 }, 8: { avgWait: 32, count: 22 },
    9: { avgWait: 45, count: 28 }, 10: { avgWait: 52, count: 30 }, 11: { avgWait: 58, count: 32 },
    12: { avgWait: 42, count: 26 }, 13: { avgWait: 38, count: 24 }, 14: { avgWait: 44, count: 28 },
    15: { avgWait: 50, count: 30 }, 16: { avgWait: 55, count: 31 }, 17: { avgWait: 48, count: 28 },
    18: { avgWait: 35, count: 22 }, 19: { avgWait: 25, count: 18 }, 20: { avgWait: 15, count: 12 },
    21: { avgWait: 8, count: 6 }, 22: { avgWait: 4, count: 3 }, 23: { avgWait: 2, count: 2 },
  };

  const faultGunIds = ['G03', 'G05'];
  const faultStartHour = 9;
  const faultEndHour = 15;

  for (let hour = 0; hour < 24; hour++) {
    const demand = hourlyDemand[hour];
    const isPeak = hour >= 8 && hour <= 18;
    const ordersThisHour = demand.count + Math.floor(Math.random() * 4 - 2);

    for (let i = 0; i < ordersThisHour; i++) {
      const minuteOffset = Math.floor((60 / ordersThisHour) * i + Math.random() * 5);
      const minute = Math.min(59, minuteOffset);

      let gunId = GUN_IDS[Math.floor(Math.random() * GUN_IDS.length)];
      if (hour >= faultStartHour && hour < faultEndHour) {
        const availableGuns = GUN_IDS.filter(g => !faultGunIds.includes(g));
        gunId = availableGuns[Math.floor(Math.random() * availableGuns.length)];
      }

      const queueStart = createDateFromParts(ANALYSIS_DATE, hour, minute);
      let waitMinutes = Math.max(1, demand.avgWait + Math.floor(Math.random() * 20 - 10));

      if (hour >= faultStartHour && hour < faultEndHour && Math.random() < 0.35) {
        waitMinutes = Math.floor(waitMinutes * 1.6);
      }

      waitMinutes = Math.min(waitMinutes, 120);

      const chargeMinutes = 25 + Math.floor(Math.random() * 35);
      const chargeStart = new Date(queueStart.getTime() + waitMinutes * 60000);
      const chargeEnd = new Date(chargeStart.getTime() + chargeMinutes * 60000);

      const crossDay = chargeEnd.getDate() !== queueStart.getDate();
      const leftEarly = isPeak && Math.random() < 0.08;
      const actualChargeEnd = leftEarly
        ? new Date(chargeStart.getTime() + Math.floor(chargeMinutes * 0.4) * 60000)
        : chargeEnd;

      const order: ChargingOrder = {
        orderId: `ORD${String(orderIdx).padStart(5, '0')}`,
        gunId,
        vehiclePlate: generatePlate(),
        vehicleModel: VEHICLE_MODELS[Math.floor(Math.random() * VEHICLE_MODELS.length)],
        queueStartTime: queueStart,
        chargeStartTime: chargeStart,
        chargeEndTime: actualChargeEnd,
        waitMinutes,
        chargeMinutes: diffMinutes(chargeStart, actualChargeEnd),
        chargeKwh: +(20 + Math.random() * 45).toFixed(1),
        leftEarly,
        crossDay,
      };

      if (hour >= faultStartHour && hour < faultEndHour && waitMinutes > demand.avgWait * 1.3) {
        order.affectedByFault = faultGunIds.includes(gunId) ? 'F002' : 'F001';
      }

      orders.push(order);
      orderIdx++;
    }
  }

  return orders;
};

const generateQueueRecords = (): QueueRecord[] => {
  const records: QueueRecord[] = [];
  let idx = 1;

  const queueByHour: Record<number, number> = {
    0: 1, 1: 0, 2: 0, 3: 1, 4: 2, 5: 4, 6: 8, 7: 15,
    8: 22, 9: 30, 10: 35, 11: 38, 12: 28, 13: 25, 14: 30,
    15: 33, 16: 36, 17: 30, 18: 22, 19: 15, 20: 9, 21: 4, 22: 2, 23: 1,
  };

  for (let hour = 0; hour < 24; hour++) {
    for (let m = 0; m < 60; m += 5) {
      const baseQueue = queueByHour[hour];
      const variance = Math.floor(Math.random() * 6 - 3);
      records.push({
        recordId: `QR${String(idx).padStart(6, '0')}`,
        timestamp: createDateFromParts(ANALYSIS_DATE, hour, m),
        queueLength: Math.max(0, baseQueue + variance),
      });
      idx++;
    }
  }

  return records;
};

const generatePrices = (): ElectricityPrice[] => {
  const periods: Array<{ start: number; end: number; type: PriceType; price: number }> = [
    { start: 0, end: 6, type: 'valley', price: 0.38 },
    { start: 6, end: 10, type: 'peak', price: 1.25 },
    { start: 10, end: 14, type: 'flat', price: 0.78 },
    { start: 14, end: 19, type: 'peak', price: 1.25 },
    { start: 19, end: 22, type: 'flat', price: 0.78 },
    { start: 22, end: 24, type: 'valley', price: 0.38 },
  ];

  return periods.map((p, i) => ({
    periodId: `EP${String(i + 1).padStart(3, '0')}`,
    effectiveDate: ANALYSIS_DATE,
    startHour: p.start,
    endHour: p.end,
    priceType: p.type,
    pricePerKwh: p.price,
  }));
};

const generateFaults = (): GunFault[] => {
  return [
    {
      faultId: 'F001',
      gunId: 'G03',
      faultStartTime: createDateFromParts(ANALYSIS_DATE, 9, 12),
      faultEndTime: createDateFromParts(ANALYSIS_DATE, 14, 45),
      faultType: '模块过热保护',
      faultDurationMinutes: 333,
      mergedFromMultiple: true,
      originalFaultIds: ['F001a', 'F001b', 'F001c'],
    },
    {
      faultId: 'F002',
      gunId: 'G05',
      faultStartTime: createDateFromParts(ANALYSIS_DATE, 10, 30),
      faultEndTime: createDateFromParts(ANALYSIS_DATE, 13, 20),
      faultType: '通信中断',
      faultDurationMinutes: 170,
      mergedFromMultiple: false,
    },
    {
      faultId: 'F003',
      gunId: 'G07',
      faultStartTime: createDateFromParts(ANALYSIS_DATE, 3, 5),
      faultEndTime: createDateFromParts(ANALYSIS_DATE, 3, 48),
      faultType: '急停按钮触发',
      faultDurationMinutes: 43,
      mergedFromMultiple: false,
    },
  ];
};

export const mockOrders = generateOrders();
export const mockQueueRecords = generateQueueRecords();
export const mockElectricityPrices = generatePrices();
export const mockGunFaults = generateFaults();
export const mockAnalysisDate = ANALYSIS_DATE;
export const mockGunIds = GUN_IDS;
