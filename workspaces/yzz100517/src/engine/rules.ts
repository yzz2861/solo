import type { Member, RescheduleCheck, Booking, ConflictAlert } from "@/types";
import { calculateRefund, minutesBetween, timeToMinutes } from "./refund";
import { detectCapacityWarning, checkCoachConflict } from "./scheduler";
import type { Court } from "@/types";

const RESCHEDULE_LIMIT = 3;
const WINDOW_DAYS = 7;

export function checkRescheduleLimit(
  member: Member | undefined
): RescheduleCheck {
  if (!member) {
    return { exceed: false, count: 0, limit: RESCHEDULE_LIMIT, daysWindow: WINDOW_DAYS };
  }
  const exceed = member.rescheduleCount >= RESCHEDULE_LIMIT;
  return {
    exceed,
    count: member.rescheduleCount,
    limit: RESCHEDULE_LIMIT,
    daysWindow: WINDOW_DAYS,
  };
}

export function daysBetween(isoA: string | null, isoB: string): number {
  if (!isoA) return Infinity;
  const a = new Date(isoA);
  const b = new Date(isoB);
  const ms = Math.abs(b.getTime() - a.getTime());
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function shouldResetRescheduleCount(
  member: Member,
  today: string
): boolean {
  if (!member.lastRescheduleDate) return false;
  return daysBetween(member.lastRescheduleDate, today) > WINDOW_DAYS;
}

export function buildConflictAlerts(
  booking: Booking,
  member: Member | undefined,
  coachName: string | null,
  courts: Court[],
  bookings: Booking[]
): ConflictAlert[] {
  const alerts: ConflictAlert[] = [];

  const totalMin = minutesBetween(booking.startTime, booking.endTime);
  const refund = calculateRefund(booking.elapsedMinutes, totalMin, booking.paidAmount);
  if (refund.refundRatio < 1) {
    alerts.push({
      type: refund.refundRatio === 0 ? "error" : "warning",
      title: `退款比例：${Math.round(refund.refundRatio * 100)}%（¥${refund.refundAmount}）`,
      detail: refund.tier,
    });
  }

  const rs = checkRescheduleLimit(member);
  if (rs.exceed) {
    alerts.push({
      type: "error",
      title: `会员连续改期已达${rs.count}次（${rs.daysWindow}天内上限${rs.limit}次）`,
      detail: "需要店长审批后方可继续延期，建议选择换场或退款",
    });
  } else if (rs.count >= rs.limit - 1) {
    alerts.push({
      type: "warning",
      title: `会员7天内已改期${rs.count}次，接近上限${rs.limit}次`,
      detail: "下次延期需店长审批，请提醒会员注意",
    });
  }

  if (booking.coachId) {
    const cc = checkCoachConflict(
      booking.coachId,
      booking.startTime,
      booking.endTime,
      booking.date,
      bookings,
      booking.id
    );
    if (cc.hasConflict) {
      const cb = cc.conflictingBooking!;
      alerts.push({
        type: "warning",
        title: `教练 ${coachName ?? ""} 同时段另有安排`,
        detail: `${cb.startTime}-${cb.endTime} 存在冲突，换场后需重新分配教练`,
      });
    }
  }

  const indoorCourts = courts.filter((c) => c.type === "indoor");
  const cap = detectCapacityWarning(indoorCourts, bookings, booking.date);
  if (cap.warning) {
    alerts.push({
      type: cap.ratio >= 0.95 ? "error" : "warning",
      title: `室内容量告急：已用${cap.usedIndoor}/${cap.totalIndoor}（${Math.round(cap.ratio * 100)}%）`,
      detail: `剩余 ${cap.remainingIndoor} 个室内名额，建议优先安排高等级会员`,
    });
  }

  return alerts;
}

export { RESCHEDULE_LIMIT, WINDOW_DAYS };
