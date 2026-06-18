import type { RefundResult } from "@/types";

export function calculateRefund(
  elapsedMinutes: number,
  totalMinutes: number,
  paidAmount: number
): RefundResult {
  let ratio = 1;
  let tier = "全额退款";

  if (totalMinutes <= 0) {
    return { refundRatio: 1, refundAmount: paidAmount, tier: "全额退款" };
  }

  const elapsed = Math.max(0, Math.min(elapsedMinutes, totalMinutes));

  if (elapsed <= 15) {
    ratio = 1;
    tier = "刚开场（≤15min）：全额退款";
  } else if (elapsed <= 45) {
    ratio = 0.7;
    tier = "开场16-45min：退70%";
  } else if (elapsed <= 90) {
    ratio = 0.5;
    tier = "开场46-90min：退50%";
  } else {
    ratio = 0;
    tier = "开场>90min：不予退款";
  }

  return {
    refundRatio: ratio,
    refundAmount: Math.round(paidAmount * ratio * 100) / 100,
    tier,
  };
}

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function minutesBetween(start: string, end: string): number {
  return Math.max(0, timeToMinutes(end) - timeToMinutes(start));
}

export function computeElapsedMinutes(
  startTime: string,
  endTime: string,
  nowOverride?: Date
): number {
  const now = nowOverride ?? new Date();
  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);
  const nowMin = now.getHours() * 60 + now.getMinutes();

  if (nowMin <= startMin) return 0;
  if (nowMin >= endMin) return endMin - startMin;
  return nowMin - startMin;
}
