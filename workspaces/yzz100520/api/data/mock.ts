import type { Building, WaterReading, Occupancy, RepairRecord, Holiday } from '../../shared/types';

interface MockResult {
  buildings: Building[];
  waterReadings: WaterReading[];
  occupancies: Occupancy[];
  repairs: RepairRecord[];
  holidays: Holiday[];
  nextId: {
    building: number;
    waterReading: number;
    occupancy: number;
    repair: number;
    holiday: number;
  };
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function generateMockData(): MockResult {
  const rand = seededRandom(42);
  const buildings: Building[] = [];
  const waterReadings: WaterReading[] = [];
  const occupancies: Occupancy[] = [];
  const repairs: RepairRecord[] = [];
  const holidays: Holiday[] = [];

  const buildingDefs = [
    { code: 'D1', name: '1号学生宿舍', floors: 6, totalRooms: 72, leakSeverity: 'severe' },
    { code: 'D2', name: '2号学生宿舍', floors: 6, totalRooms: 72, leakSeverity: 'warning' },
    { code: 'D3', name: '3号学生宿舍', floors: 5, totalRooms: 60, leakSeverity: 'normal' },
    { code: 'D4', name: '4号学生宿舍', floors: 6, totalRooms: 72, leakSeverity: 'severe' },
    { code: 'D5', name: '5号学生宿舍', floors: 7, totalRooms: 84, leakSeverity: 'warning' },
    { code: 'D6', name: '6号学生宿舍', floors: 5, totalRooms: 60, leakSeverity: 'normal' },
    { code: 'D7', name: '7号研究生宿舍', floors: 8, totalRooms: 96, leakSeverity: 'warning' },
    { code: 'D8', name: '8号研究生宿舍', floors: 8, totalRooms: 96, leakSeverity: 'normal' },
    { code: 'F1', name: '第一食堂', floors: 2, totalRooms: 10, leakSeverity: 'normal' },
    { code: 'F2', name: '第二食堂', floors: 3, totalRooms: 15, leakSeverity: 'warning' },
    { code: 'T1', name: '教学楼A座', floors: 5, totalRooms: 30, leakSeverity: 'normal' },
    { code: 'T2', name: '教学楼B座', floors: 6, totalRooms: 36, leakSeverity: 'normal' },
  ];

  let bid = 1, wid = 1, oid = 1, rid = 1, hid = 1;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const daysBack = 45;

  for (const def of buildingDefs) {
    const building: Building = {
      id: bid,
      code: def.code,
      name: def.name,
      meterCode: `M${String(bid).padStart(4, '0')}`,
      totalRooms: def.totalRooms,
      floors: def.floors,
      createdAt: new Date().toISOString(),
    };
    buildings.push(building);

    let baseReading = 10000 + bid * 500;
    const isDorm = def.code.startsWith('D');
    const isHolidayClosed = isDorm;

    for (let i = daysBack; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = formatDate(date);

      const isWeekend = date.getDay() === 0 || date.getDay() === 6;

      let dayBase = isDorm ? 12 : 40;
      let nightBase = isDorm ? 4 : 8;

      if (isWeekend && isDorm) {
        dayBase *= 1.15;
        nightBase *= 1.1;
      }

      const dayNoise = 0.85 + rand() * 0.3;
      const nightNoise = 0.8 + rand() * 0.4;

      let dayConsumption = Math.round(dayBase * dayNoise);
      let nightConsumption = Math.round(nightBase * nightNoise);

      if (def.leakSeverity === 'severe' && isDorm) {
        nightConsumption += Math.round(6 + rand() * 8);
        if (rand() < 0.3) nightConsumption += Math.round(5 + rand() * 10);
      } else if (def.leakSeverity === 'warning') {
        nightConsumption += Math.round(2 + rand() * 4);
      }

      const isHoliday = (i >= 30 && i <= 38) || (i >= 10 && i <= 12);
      if (isHoliday && isHolidayClosed) {
        dayConsumption = Math.max(1, Math.round(dayConsumption * 0.15));
        nightConsumption = Math.max(0, Math.round(nightConsumption * 0.1));
      }

      let isMeterChange = false;
      let isReversed = false;
      if (bid === 1 && i === 22) {
        isMeterChange = true;
        baseReading = 500;
      }
      if (bid === 4 && i === 15) {
        isReversed = true;
        baseReading -= 100;
      }

      const dayReading = baseReading + dayConsumption;
      waterReadings.push({
        id: wid++,
        buildingId: bid,
        readingDate: dateStr,
        period: 'day',
        reading: dayReading,
        consumption: dayConsumption,
        isMeterChange,
        isReversed,
        createdAt: new Date().toISOString(),
      });

      const nightReading = dayReading + nightConsumption;
      waterReadings.push({
        id: wid++,
        buildingId: bid,
        readingDate: dateStr,
        period: 'night',
        reading: nightReading,
        consumption: nightConsumption,
        createdAt: new Date().toISOString(),
      });

      baseReading = nightReading;

      const occupiedRatio = isDorm ? (0.85 + rand() * 0.12) : (0.4 + rand() * 0.3);
      const occupiedRooms = Math.round(def.totalRooms * occupiedRatio);
      const totalPeople = Math.round(occupiedRooms * (isDorm ? 4 : 1.2));
      occupancies.push({
        id: oid++,
        buildingId: bid,
        date: dateStr,
        occupiedRooms,
        totalPeople,
        isVacant: isHoliday && isHolidayClosed,
      });
    }

    if (def.leakSeverity !== 'normal') {
      const repairTypes = ['管道漏水', '水表故障', '阀门损坏', '卫生间漏水', '地下管线渗漏'];
      repairs.push({
        id: rid++,
        buildingId: bid,
        reportDate: formatDate(daysAgo(20 + Math.floor(rand() * 5))),
        repairDate: formatDate(daysAgo(17 + Math.floor(rand() * 3))),
        repairType: repairTypes[Math.floor(rand() * repairTypes.length)],
        description: def.leakSeverity === 'severe' ? '夜间水表持续不归零，疑似地下管道渗漏' : '夜间用水量偏高，需排查',
        result: def.leakSeverity === 'severe' ? '临时处理，夜间仍有异常流量' : '修复完成，流量恢复正常',
        recheckReading: def.leakSeverity === 'warning' ? baseReading - 50 : null,
        recheckDate: def.leakSeverity === 'warning' ? formatDate(daysAgo(10)) : null,
        recheckNote: def.leakSeverity === 'warning' ? '复测夜间流量已回归正常范围' : null,
        status: def.leakSeverity === 'severe' ? 'recheck' : 'completed',
      });
    }

    if (bid === 1 || bid === 4) {
      repairs.push({
        id: rid++,
        buildingId: bid,
        reportDate: formatDate(daysAgo(5)),
        repairDate: null,
        repairType: '管道漏水',
        description: '连续多日夜间异常，需紧急排查',
        result: null,
        recheckReading: null,
        recheckDate: null,
        recheckNote: null,
        status: 'pending',
      });
    }

    bid++;
  }

  holidays.push({
    id: hid++,
    name: '五一假期',
    startDate: formatDate(daysAgo(38)),
    endDate: formatDate(daysAgo(30)),
    buildingIds: buildings.filter(b => b.code.startsWith('D')).map(b => b.id),
  });
  holidays.push({
    id: hid++,
    name: '校庆调休',
    startDate: formatDate(daysAgo(12)),
    endDate: formatDate(daysAgo(10)),
    buildingIds: buildings.filter(b => b.code.startsWith('T')).map(b => b.id),
  });

  return {
    buildings,
    waterReadings,
    occupancies,
    repairs,
    holidays,
    nextId: { building: bid, waterReading: wid, occupancy: oid, repair: rid, holiday: hid },
  };
}
