export type BookingStatus = 'pending' | 'checked-in' | 'in-use' | 'completed' | 'cancelled';

export type PackageComplexity = 'simple' | 'medium' | 'complex';

export type BoardGroup = 'pending' | 'in-use' | 'cleaning' | 'available';

export type ConflictType = 'time-conflict' | 'cleaning-incomplete' | 'package-not-ready' | 'late-arrival';

export interface Room {
  id: string;
  name: string;
  capacity: number;
  cleaningDuration: number;
}

export interface Package {
  id: string;
  name: string;
  price: number;
  duration: number;
  prepTime: number;
  complexity: PackageComplexity;
}

export interface Booking {
  id: string;
  roomId: string;
  packageId: string;
  customerName: string;
  customerPhone: string;
  guestCount: number;
  scheduledArrival: string;
  scheduledEnd: string;
  actualArrival?: string;
  actualEnd?: string;
  extendedMinutes: number;
  extendedFee: number;
  status: BookingStatus;
  packageReady: boolean;
  cleaningStart?: string;
  cleaningEnd?: string;
  notes: string;
  createdAt: string;
}

export interface ConflictAlert {
  id: string;
  type: ConflictType;
  bookingId: string;
  message: string;
  severity: 'warning' | 'error';
}

export interface BookingWithDetails extends Booking {
  room: Room;
  package: Package;
}

export interface DailyStats {
  date: string;
  totalBookings: number;
  turnoverRate: number;
  totalRevenue: number;
  extendRevenue: number;
  avgCleaningTime: number;
  roomStats: Array<{
    roomId: string;
    roomName: string;
    bookings: number;
    avgCleaningTime: number;
    totalRevenue: number;
  }>;
}

export interface SlowRoomAnalysis {
  roomId: string;
  roomName: string;
  avgCleaningTime: number;
  standardDuration: number;
  slowRatio: number;
  sampleCount: number;
  packageBreakdown: Array<{
    packageName: string;
    complexity: PackageComplexity;
    count: number;
    avgCleaningTime: number;
  }>;
  isLikelyPackageIssue: boolean;
  isLikelyStaffIssue: boolean;
}
