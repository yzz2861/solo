import type { Booking, Room, Package, ConflictAlert } from '@/types';
import { generateId, getMinutesFromNow, getMinutesUntil, isBeforeNow, addMinutesToTime } from './timeUtils';

const LATE_THRESHOLD_MINUTES = 15;

export const detectConflicts = (
  bookings: Booking[],
  rooms: Room[],
  packages: Package[],
  now: Date = new Date()
): ConflictAlert[] => {
  const alerts: ConflictAlert[] = [];

  for (const booking of bookings) {
    if (booking.status === 'cancelled' || booking.status === 'completed') {
      continue;
    }

    if (booking.status === 'pending') {
      const lateAlert = checkLateArrival(booking);
      if (lateAlert) alerts.push(lateAlert);

      const packageAlert = checkPackageNotReady(booking, packages);
      if (packageAlert) alerts.push(packageAlert);

      const cleaningAlert = checkCleaningIncomplete(booking, bookings, rooms);
      if (cleaningAlert) alerts.push(cleaningAlert);
    }

    if (booking.status === 'in-use' || booking.status === 'checked-in') {
      const conflictAlert = checkNextBookingConflict(booking, bookings, rooms);
      if (conflictAlert) alerts.push(conflictAlert);
    }
  }

  return alerts;
};

const checkLateArrival = (booking: Booking): ConflictAlert | null => {
  const minutesLate = getMinutesFromNow(booking.scheduledArrival);
  if (minutesLate >= LATE_THRESHOLD_MINUTES && !booking.actualArrival) {
    return {
      id: generateId(),
      type: 'late-arrival',
      bookingId: booking.id,
      message: `客人已迟到 ${minutesLate} 分钟，请注意联系确认`,
      severity: 'warning',
    };
  }
  return null;
};

const checkPackageNotReady = (booking: Booking, packages: Package[]): ConflictAlert | null => {
  const pkg = packages.find((p) => p.id === booking.packageId);
  if (!pkg || booking.packageReady) return null;

  const minutesUntilArrival = getMinutesUntil(booking.scheduledArrival);
  if (minutesUntilArrival < pkg.prepTime && minutesUntilArrival > 0) {
    return {
      id: generateId(),
      type: 'package-not-ready',
      bookingId: booking.id,
      message: `距到店仅 ${minutesUntilArrival} 分钟，${pkg.name} 还未备齐`,
      severity: 'warning',
    };
  }

  if (minutesUntilArrival <= 0) {
    return {
      id: generateId(),
      type: 'package-not-ready',
      bookingId: booking.id,
      message: `客人已到店时间，${pkg.name} 还未备齐！`,
      severity: 'error',
    };
  }

  return null;
};

const checkCleaningIncomplete = (
  booking: Booking,
  allBookings: Booking[],
  rooms: Room[]
): ConflictAlert | null => {
  const room = rooms.find((r) => r.id === booking.roomId);
  if (!room) return null;

  const prevBooking = allBookings
    .filter(
      (b) =>
        b.roomId === booking.roomId &&
        b.id !== booking.id &&
        b.status !== 'cancelled' &&
        b.scheduledEnd < booking.scheduledArrival
    )
    .sort((a, b) => (a.scheduledEnd < b.scheduledEnd ? 1 : -1))[0];

  if (!prevBooking) return null;

  if (prevBooking.status === 'completed' && prevBooking.cleaningEnd) {
    return null;
  }

  let expectedCleaningEnd: string;
  if (prevBooking.cleaningStart) {
    expectedCleaningEnd = addMinutesToTime(prevBooking.cleaningStart, room.cleaningDuration);
  } else {
    const endTime = prevBooking.actualEnd || prevBooking.scheduledEnd;
    expectedCleaningEnd = addMinutesToTime(endTime, room.cleaningDuration);
  }

  if (expectedCleaningEnd > booking.scheduledArrival) {
    const delayMinutes = Math.ceil(
      (new Date(expectedCleaningEnd).getTime() - new Date(booking.scheduledArrival).getTime()) / 60000
    );
    return {
      id: generateId(),
      type: 'cleaning-incomplete',
      bookingId: booking.id,
      message: `清台可能来不及，预计晚 ${delayMinutes} 分钟才能入座`,
      severity: 'error',
    };
  }

  return null;
};

const checkNextBookingConflict = (
  booking: Booking,
  allBookings: Booking[],
  rooms: Room[]
): ConflictAlert | null => {
  const room = rooms.find((r) => r.id === booking.roomId);
  if (!room) return null;

  const nextBooking = allBookings
    .filter(
      (b) =>
        b.roomId === booking.roomId &&
        b.id !== booking.id &&
        b.status !== 'cancelled' &&
        b.status !== 'completed' &&
        b.scheduledArrival > booking.scheduledEnd
    )
    .sort((a, b) => (a.scheduledArrival > b.scheduledArrival ? 1 : -1))[0];

  if (!nextBooking) return null;

  const currentEnd = booking.scheduledEnd;
  const nextArrival = nextBooking.scheduledArrival;
  const cleaningBuffer = room.cleaningDuration;

  const gapMinutes =
    (new Date(nextArrival).getTime() - new Date(currentEnd).getTime()) / 60000 - cleaningBuffer;

  if (gapMinutes < 0) {
    return {
      id: generateId(),
      type: 'time-conflict',
      bookingId: booking.id,
      message: `加钟会撞到下一桌（${formatTimeShort(nextArrival)}），请提前沟通`,
      severity: 'error',
    };
  }

  if (gapMinutes < 15) {
    return {
      id: generateId(),
      type: 'time-conflict',
      bookingId: booking.id,
      message: `距离下一桌仅 ${Math.ceil(gapMinutes)} 分钟缓冲，加钟请谨慎`,
      severity: 'warning',
    };
  }

  return null;
};

const formatTimeShort = (dateStr: string): string => {
  const date = new Date(dateStr);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

export const checkBookingConflict = (
  newBooking: { roomId: string; scheduledArrival: string; scheduledEnd: string; id?: string },
  allBookings: Booking[]
): boolean => {
  const conflicting = allBookings.some((b) => {
    if (b.id === newBooking.id) return false;
    if (b.status === 'cancelled') return false;
    if (b.roomId !== newBooking.roomId) return false;

    const newStart = new Date(newBooking.scheduledArrival).getTime();
    const newEnd = new Date(newBooking.scheduledEnd).getTime();
    const existStart = new Date(b.scheduledArrival).getTime();
    const existEnd = new Date(b.scheduledEnd).getTime();

    return newStart < existEnd && newEnd > existStart;
  });

  return conflicting;
};
