import type { Seat, Locker, HourlySnapshot, Violation, LostItem, Clearance, Zone, Floor } from '@/types';
import { todayStr, genId, dayjs, deriveStudentId } from '@/utils';

const zones: { zone: Zone; floor: Floor }[] = [
  { zone: 'A', floor: 1 },
  { zone: 'B', floor: 1 },
  { zone: 'C', floor: 2 },
  { zone: 'D', floor: 2 },
];

const SEATS_PER_ZONE = 15;
const COLS = 5;

export function generateSeats(): Seat[] {
  const seats: Seat[] = [];
  for (const { zone, floor } of zones) {
    for (let i = 0; i < SEATS_PER_ZONE; i++) {
      const row = Math.floor(i / COLS);
      const col = i % COLS;
      const code = `${zone}${String(i + 1).padStart(2, '0')}`;
      seats.push({
        id: `seat_${zone}_${i}`,
        code,
        zone,
        floor,
        row,
        col,
        status: 'available',
      });
    }
  }
  return seats;
}

export function generateLockers(): Locker[] {
  const lockers: Locker[] = [];
  for (const { zone, floor } of zones) {
    for (let i = 0; i < SEATS_PER_ZONE; i++) {
      const code = `L${zone}${String(i + 1).padStart(2, '0')}`;
      lockers.push({
        id: `locker_${zone}_${i}`,
        code,
        zone,
        floor,
        status: i === 7 || i === 14 ? 'maintenance' : 'available',
      });
    }
  }
  return lockers;
}

const VIOLATION_SEEDS: Array<Partial<Violation> & { type: Violation['type']; seatCode: string; hoursAgo: number }> = [
  { type: 'no_show', seatCode: 'A03', hoursAgo: 3, description: '预约座位后30分钟内未签到，系统自动释放' },
  { type: 'over_temp_away', seatCode: 'B11', hoursAgo: 5, studentName: '李四', description: '临时离座超过60分钟未返回，前台标记释放' },
  { type: 'multi_seat_attempt', seatCode: 'C05', hoursAgo: 8, studentName: '王五', description: '尝试同时预约两个座位，被系统拦截' },
  { type: 'unattended', seatCode: 'D08', hoursAgo: 12, studentName: '张三', description: '座位上有物品但无人超过2小时，前台介入处理' },
  { type: 'forced_release', seatCode: 'B07', hoursAgo: 20, description: '清场时强制释放未离座座位' },
];

export function generateViolations(seats: Seat[]): Violation[] {
  return VIOLATION_SEEDS.map((v) => {
    const seat = seats.find((s) => s.code === v.seatCode)!;
    const occurredAt = dayjs().subtract(v.hoursAgo, 'hour').valueOf();
    return {
      id: genId('vio'),
      type: v.type,
      seatId: seat.id,
      seatCode: seat.code,
      studentId: v.studentName ? `stu_${v.studentName}` : undefined,
      studentName: v.studentName,
      occurredAt,
      description: v.description,
      handled: v.hoursAgo > 4,
      handledBy: v.hoursAgo > 4 ? '前台小林' : undefined,
      handledAt: v.hoursAgo > 4 ? occurredAt + 1000 * 60 * 5 : undefined,
    };
  });
}

export function generateLostItems(seats: Seat[], clearance: Clearance): LostItem[] {
  const seeds: Array<{ seatCode: string; type: LostItem['type']; description: string; hoursAgo: number }> = [
    { seatCode: 'A08', type: 'cups', description: '膳魔师保温杯，杯身有蓝色贴纸', hoursAgo: 4 },
    { seatCode: 'C02', type: 'books', description: '高等数学第七版上册，内有笔记', hoursAgo: 4 },
    { seatCode: 'D10', type: 'electronics', description: '白色无线耳机充电盒，品牌不详', hoursAgo: 4 },
  ];
  return seeds.map((s) => {
    const seat = seats.find((x) => x.code === s.seatCode)!;
    return {
      id: genId('item'),
      seatId: seat.id,
      seatCode: seat.code,
      type: s.type,
      description: s.description,
      foundAt: dayjs().subtract(s.hoursAgo, 'hour').valueOf(),
      clearanceId: clearance.id,
      claimed: false,
    };
  });
}

export function generateClearance(): Clearance {
  return {
    id: genId('clr'),
    date: dayjs().subtract(1, 'day').format('YYYY-MM-DD'),
    startedAt: dayjs().subtract(1, 'day').hour(22).minute(30).valueOf(),
    completedAt: dayjs().subtract(1, 'day').hour(22).minute(55).valueOf(),
    operatorName: '前台小林',
    seatsChecked: Array.from({ length: 60 }, (_, i) => `seat_${i}`),
    lostItemsFound: 3,
    seatsReleased: 8,
  };
}

export function generateHourlySnapshots(days = 7): HourlySnapshot[] {
  const snaps: HourlySnapshot[] = [];
  for (let d = 0; d < days; d++) {
    const day = dayjs().subtract(d, 'day');
    const isWeekend = d === 0 ? false : d % 6 === 0 || d % 7 === 0;
    for (let h = 0; h < 24; h++) {
      let occPct = 0;
      if (h >= 8 && h < 10) occPct = 0.45;
      else if (h >= 10 && h < 12) occPct = 0.72;
      else if (h >= 12 && h < 14) occPct = 0.58;
      else if (h >= 14 && h < 18) occPct = 0.85;
      else if (h >= 18 && h < 22) occPct = isWeekend ? 0.92 : 0.88;
      else if (h >= 22 && h < 24) occPct = 0.48;
      else if (h >= 6 && h < 8) occPct = 0.18;
      else occPct = 0.04;
      occPct += (Math.random() - 0.5) * 0.08;
      occPct = Math.max(0.02, Math.min(0.98, occPct));

      const tempPct = h >= 11 && h < 14 ? 0.14 : h >= 17 && h < 19 ? 0.12 : 0.06;
      const occupied = Math.round(60 * occPct);
      const temp = Math.round(occupied * tempPct);
      snaps.push({
        id: genId('snap'),
        date: day.format('YYYY-MM-DD'),
        hour: h,
        totalSeats: 60,
        occupiedSeats: occupied,
        tempAwaySeats: temp,
        violationCount: h >= 12 && h < 14 ? 1 + Math.round(Math.random()) : h >= 19 ? 1 : 0,
        recordedAt: day.hour(h).minute(0).valueOf(),
      });
    }
  }
  return snaps;
}

export function generateRuntimeSeats(seats: Seat[]): Seat[] {
  const now = dayjs();
  const runtime: Seat[] = seats.map((s) => ({ ...s }));
  const assignments: Array<{ code: string; status: Seat['status']; studentName: string; studentId: string }> = [
    { code: 'A01', status: 'in_use', studentName: '张三', studentId: 'stu_zhangsan' },
    { code: 'A02', status: 'in_use', studentName: '陈曦', studentId: 'stu_chenxi' },
    { code: 'A04', status: 'reserved', studentName: '刘畅', studentId: 'stu_liuchang' },
    { code: 'A06', status: 'temporarily_away', studentName: '赵琳', studentId: 'stu_zhaolin' },
    { code: 'A10', status: 'in_use', studentName: '周伟', studentId: 'stu_zhouwei' },
    { code: 'B01', status: 'in_use', studentName: '孙悦', studentId: 'stu_sunyue' },
    { code: 'B03', status: 'in_use', studentName: '吴昊', studentId: 'stu_wuhao' },
    { code: 'B05', status: 'temporarily_away', studentName: '郑宇', studentId: 'stu_zhengyu' },
    { code: 'B08', status: 'reserved', studentName: '冯思远', studentId: 'stu_fengsy' },
    { code: 'B09', status: 'in_use', studentName: '黄雅', studentId: 'stu_huangya' },
    { code: 'B12', status: 'violation', studentName: '李四', studentId: 'stu_lisi' },
    { code: 'C01', status: 'in_use', studentName: '林小婷', studentId: 'stu_linxt' },
    { code: 'C03', status: 'in_use', studentName: '徐磊', studentId: 'stu_xulei' },
    { code: 'C06', status: 'in_use', studentName: '何苗', studentId: 'stu_hemiao' },
    { code: 'C09', status: 'temporarily_away', studentName: '马超', studentId: 'stu_machao' },
    { code: 'D01', status: 'in_use', studentName: '朱琳', studentId: 'stu_zhulin' },
    { code: 'D04', status: 'in_use', studentName: '韩梅', studentId: 'stu_hanmei' },
    { code: 'D07', status: 'reserved', studentName: '高峰', studentId: 'stu_gaofeng' },
    { code: 'D11', status: 'in_use', studentName: '杨帆', studentId: 'stu_yangfan' },
  ];
  for (const a of assignments) {
    const s = runtime.find((x) => x.code === a.code)!;
    s.status = a.status;
    s.studentId = a.studentId;
    s.studentName = a.studentName;
    const locker = `locker_${s.zone}_${parseInt(a.code.slice(1), 10) - 1}`;
    s.lockerId = locker;
    if (a.status === 'reserved') {
      s.reservationExpireAt = now.add(12 + Math.floor(Math.random() * 18), 'minute').valueOf();
      s.checkInAt = undefined;
    } else if (a.status === 'in_use') {
      s.checkInAt = now.subtract(40 + Math.floor(Math.random() * 200), 'minute').valueOf();
    } else if (a.status === 'temporarily_away') {
      s.checkInAt = now.subtract(80 + Math.floor(Math.random() * 200), 'minute').valueOf();
      s.tempAwayAt = now.subtract(5 + Math.floor(Math.random() * 20), 'minute').valueOf();
      s.tempAwayExpireAt = now.add(10 + Math.floor(Math.random() * 20), 'minute').valueOf();
      s.tempAwayExtensionsLeft = Math.random() > 0.5 ? 2 : 1;
    } else if (a.status === 'violation') {
      s.checkInAt = now.subtract(4, 'hour').valueOf();
      s.tempAwayAt = now.subtract(70, 'minute').valueOf();
      s.tempAwayExpireAt = now.subtract(10, 'minute').valueOf();
      s.tempAwayExtensionsLeft = 0;
    }
  }
  return runtime;
}

export function generateRuntimeLockers(lockers: Locker[], seats: Seat[]): Locker[] {
  return lockers.map((l) => {
    const linkedSeat = seats.find((s) => s.lockerId === l.id && s.status !== 'available');
    if (linkedSeat) {
      return {
        ...l,
        status: 'in_use',
        seatId: linkedSeat.id,
        studentId: linkedSeat.studentId,
      };
    }
    return l.status === 'maintenance' ? l : { ...l, status: 'available' };
  });
}

export function todayClearancePlaceholder(): Clearance {
  return {
    id: genId('clr_today'),
    date: todayStr(),
    startedAt: 0,
    operatorName: '',
    seatsChecked: [],
    lostItemsFound: 0,
    seatsReleased: 0,
  };
}
