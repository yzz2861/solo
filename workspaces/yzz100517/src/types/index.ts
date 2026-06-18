export type CourtType = "outdoor" | "indoor";
export type MemberLevel = "normal" | "silver" | "gold";
export type PayMethod = "cash" | "wechat" | "alipay" | "card";
export type BookingStatus =
  | "normal"
  | "stopped"
  | "switched"
  | "rescheduled"
  | "refunded";
export type ActionType =
  | "create"
  | "stop"
  | "switch"
  | "reschedule"
  | "refund";
export type Role = "reception" | "manager" | "coach";

export interface Court {
  id: string;
  name: string;
  type: CourtType;
  capacity: number;
  isActive: boolean;
}

export interface Coach {
  id: string;
  name: string;
  avatar: string;
  hourlyRate: number;
  specialty: string;
}

export interface Member {
  id: string;
  name: string;
  phone: string;
  level: MemberLevel;
  rescheduleCount: number;
  lastRescheduleDate: string | null;
}

export interface Booking {
  id: string;
  memberId: string;
  courtId: string;
  coachId: string | null;
  date: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  paidAmount: number;
  payMethod: PayMethod;
  elapsedMinutes: number;
  refundAmount: number;
  switchToCourtId: string | null;
  rescheduleToDate: string | null;
  weatherNote: string | null;
  processRemark: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Compensation {
  id: string;
  bookingId: string;
  coachId: string | null;
  coachCompensation: number;
  compensationPlan: string;
  operatorRole: Role;
  operatorName: string;
  approverId: string | null;
  createdAt: string;
}

export interface ChangeLog {
  id: string;
  bookingId: string;
  action: ActionType;
  beforeSnapshot: Partial<Booking> | null;
  afterSnapshot: Partial<Booking> | null;
  operatorRole: Role;
  operatorName: string;
  remark: string | null;
  timestamp: string;
}

export interface WeatherNote {
  date: string;
  condition: "sunny" | "cloudy" | "rain" | "storm";
  rainStart: string | null;
  rainEnd: string | null;
  remark: string | null;
  updatedAt: string;
}

export interface AppState {
  courts: Court[];
  coaches: Coach[];
  members: Member[];
  bookings: Booking[];
  compensations: Compensation[];
  changeLogs: ChangeLog[];
  weatherNote: WeatherNote;
  currentRole: Role;
  currentUser: string;
}

export interface RefundResult {
  refundRatio: number;
  refundAmount: number;
  tier: string;
}

export interface RecommendedCourt {
  court: Court;
  score: number;
  capacityUsed: number;
  capacityTotal: number;
  coachAvailable: boolean;
  sameTimeBookings: Booking[];
}

export interface CapacityInfo {
  totalIndoor: number;
  usedIndoor: number;
  remainingIndoor: number;
  ratio: number;
  warning: boolean;
}

export interface CoachConflictResult {
  hasConflict: boolean;
  conflictingBooking: Booking | null;
}

export interface RescheduleCheck {
  exceed: boolean;
  count: number;
  limit: number;
  daysWindow: number;
}

export interface ConflictAlert {
  type: "error" | "warning" | "info";
  title: string;
  detail: string;
}
