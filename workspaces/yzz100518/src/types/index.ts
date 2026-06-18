export type Zone = 'A' | 'B' | 'C' | 'D';
export type Floor = 1 | 2;

export type SeatStatus =
  | 'available'
  | 'reserved'
  | 'in_use'
  | 'temporarily_away'
  | 'violation';

export interface Seat {
  id: string;
  code: string;
  zone: Zone;
  floor: Floor;
  row: number;
  col: number;
  status: SeatStatus;
  studentId?: string;
  studentName?: string;
  lockerId?: string;
  reservationExpireAt?: number;
  checkInAt?: number;
  tempAwayAt?: number;
  tempAwayExpireAt?: number;
  tempAwayExtensionsLeft?: number;
}

export type LockerStatus = 'available' | 'in_use' | 'maintenance';

export interface Locker {
  id: string;
  code: string;
  zone: Zone;
  floor: Floor;
  status: LockerStatus;
  seatId?: string;
  studentId?: string;
  maintenanceNote?: string;
}

export type ReservationStatus =
  | 'pending_checkin'
  | 'checked_in'
  | 'completed'
  | 'cancelled'
  | 'violation';

export interface Reservation {
  id: string;
  seatId: string;
  seatCode: string;
  lockerId?: string;
  lockerCode?: string;
  studentId: string;
  studentName: string;
  studentPhone?: string;
  status: ReservationStatus;
  reservedAt: number;
  reservationExpireAt?: number;
  checkInAt?: number;
  checkOutAt?: number;
  tempAwayCount: number;
  totalMinutes: number;
}

export type ViolationType =
  | 'no_show'
  | 'over_temp_away'
  | 'multi_seat_attempt'
  | 'unattended'
  | 'forced_release';

export interface Violation {
  id: string;
  type: ViolationType;
  seatId: string;
  seatCode: string;
  studentId?: string;
  studentName?: string;
  occurredAt: number;
  description: string;
  handled: boolean;
  handledBy?: string;
  handledAt?: number;
}

export type LostItemType =
  | 'electronics'
  | 'books'
  | 'bags'
  | 'cups'
  | 'keys'
  | 'id_card'
  | 'other';

export interface LostItem {
  id: string;
  seatId: string;
  seatCode: string;
  type: LostItemType;
  description: string;
  foundAt: number;
  clearanceId: string;
  claimed: boolean;
  claimedBy?: string;
  claimedAt?: number;
  photoUrl?: string;
}

export interface Clearance {
  id: string;
  date: string;
  startedAt: number;
  completedAt?: number;
  operatorName: string;
  seatsChecked: string[];
  lostItemsFound: number;
  seatsReleased: number;
}

export interface HourlySnapshot {
  id: string;
  date: string;
  hour: number;
  totalSeats: number;
  occupiedSeats: number;
  tempAwaySeats: number;
  violationCount: number;
  recordedAt: number;
}

export type UserRole = 'student' | 'reception' | 'manager' | 'owner';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  phone?: string;
}

export const VIOLATION_LABEL: Record<ViolationType, string> = {
  no_show: '预约未签到',
  over_temp_away: '临时离座超时',
  multi_seat_attempt: '尝试多占座位',
  unattended: '长时间无人',
  forced_release: '前台强制释放',
};

export const LOST_ITEM_LABEL: Record<LostItemType, string> = {
  electronics: '电子设备',
  books: '书籍资料',
  bags: '包袋',
  cups: '水杯',
  keys: '钥匙',
  id_card: '证件',
  other: '其他',
};

export const SEAT_STATUS_LABEL: Record<SeatStatus, string> = {
  available: '空闲',
  reserved: '已预约',
  in_use: '使用中',
  temporarily_away: '临时离座',
  violation: '违规',
};

export const ZONE_LABEL: Record<Zone, string> = {
  A: 'A区 · 靠窗安静区',
  B: 'B区 · 中央自习区',
  C: 'C区 · 研讨区',
  D: 'D区 · 通宵区',
};
