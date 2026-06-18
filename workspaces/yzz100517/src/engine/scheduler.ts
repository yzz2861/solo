import type {
  Booking,
  Court,
  Coach,
  RecommendedCourt,
  CapacityInfo,
  CoachConflictResult,
} from "@/types";
import { timeToMinutes } from "./refund";

function overlaps(
  s1: string,
  e1: string,
  s2: string,
  e2: string
): boolean {
  return timeToMinutes(s1) < timeToMinutes(e2) && timeToMinutes(s2) < timeToMinutes(e1);
}

export function findAvailableIndoorCourts(
  bookings: Booking[],
  courts: Court[],
  coaches: Coach[],
  targetStart: string,
  targetEnd: string,
  targetDate: string,
  coachId: string | null,
  excludeBookingId?: string
): RecommendedCourt[] {
  const indoorCourts = courts.filter((c) => c.type === "indoor" && c.isActive);
  const activeBookings = bookings.filter(
    (b) =>
      b.date === targetDate &&
      b.id !== excludeBookingId &&
      b.status !== "refunded" &&
      b.status !== "rescheduled"
  );

  const result: RecommendedCourt[] = [];

  for (const court of indoorCourts) {
    const sameTimeBookings = activeBookings.filter(
      (b) =>
        (b.courtId === court.id || b.switchToCourtId === court.id) &&
        overlaps(b.startTime, b.endTime, targetStart, targetEnd)
    );

    const capacityUsed = sameTimeBookings.reduce((sum, b) => sum + 1, 0);
    const hasCapacity = capacityUsed < court.capacity;

    let coachAvailable = true;
    if (coachId) {
      const coachConflict = activeBookings.some(
        (b) =>
          b.coachId === coachId &&
          overlaps(b.startTime, b.endTime, targetStart, targetEnd) &&
          !(b.courtId === court.id && sameTimeBookings.includes(b))
      );
      coachAvailable = !coachConflict;
    }

    let score = 0;
    if (hasCapacity) score += 50;
    if (coachAvailable && coachId) score += 30;
    if (!coachId) score += 10;
    score += Math.max(0, 20 - capacityUsed * 5);

    result.push({
      court,
      score,
      capacityUsed,
      capacityTotal: court.capacity,
      coachAvailable,
      sameTimeBookings,
    });
  }

  return result.sort((a, b) => b.score - a.score);
}

export function checkCoachConflict(
  coachId: string,
  startTime: string,
  endTime: string,
  date: string,
  bookings: Booking[],
  excludeBookingId?: string
): CoachConflictResult {
  const active = bookings.filter(
    (b) =>
      b.id !== excludeBookingId &&
      b.date === date &&
      b.status !== "refunded" &&
      b.status !== "rescheduled"
  );
  const conflict = active.find(
    (b) =>
      b.coachId === coachId && overlaps(b.startTime, b.endTime, startTime, endTime)
  );
  return {
    hasConflict: !!conflict,
    conflictingBooking: conflict ?? null,
  };
}

export function detectCapacityWarning(
  indoorCourts: Court[],
  bookings: Booking[],
  date: string
): CapacityInfo {
  const totalIndoor = indoorCourts.reduce((sum, c) => sum + c.capacity, 0);
  const active = bookings.filter(
    (b) =>
      b.date === date && b.status !== "refunded" && b.status !== "rescheduled"
  );
  let usedIndoor = 0;
  for (const b of active) {
    const courtId = b.switchToCourtId ?? b.courtId;
    const c = indoorCourts.find((ic) => ic.id === courtId);
    if (c) usedIndoor += 1;
  }
  const ratio = totalIndoor === 0 ? 1 : usedIndoor / totalIndoor;
  return {
    totalIndoor,
    usedIndoor,
    remainingIndoor: Math.max(0, totalIndoor - usedIndoor),
    ratio,
    warning: ratio >= 0.8,
  };
}

export function isCourtBooked(
  courtId: string,
  startTime: string,
  endTime: string,
  date: string,
  bookings: Booking[],
  excludeBookingId?: string
): boolean {
  return bookings.some(
    (b) =>
      b.id !== excludeBookingId &&
      b.date === date &&
      b.status !== "refunded" &&
      b.status !== "rescheduled" &&
      (b.courtId === courtId || b.switchToCourtId === courtId) &&
      overlaps(b.startTime, b.endTime, startTime, endTime)
  );
}
