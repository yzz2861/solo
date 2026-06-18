import type { Booking, Compensation, Member, Court, Coach } from "@/types";

function escapeCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function rowToCsv(row: unknown[]): string {
  return row.map(escapeCell).join(",");
}

function download(filename: string, content: string, mime: string) {
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportLossReport(
  bookings: Booking[],
  courts: Court[],
  members: Member[],
  coaches: Coach[],
  date: string
) {
  const headers = [
    "订单号",
    "日期",
    "时段",
    "会员",
    "等级",
    "原场地",
    "类型",
    "教练",
    "付款金额",
    "处理状态",
    "退款金额",
    "改至场地",
    "延期到",
    "已开场(分钟)",
    "天气备注",
    "处理备注",
  ];
  const rows: string[][] = [headers];

  const dayBookings = bookings.filter(
    (b) => b.date === date && b.status !== "normal"
  );

  let totalPaid = 0;
  let totalRefund = 0;
  let totalLoss = 0;

  for (const b of dayBookings) {
    const member = members.find((m) => m.id === b.memberId);
    const court = courts.find((c) => c.id === b.courtId);
    const coach = coaches.find((c) => c.id === b.coachId);
    const switchCourt = courts.find((c) => c.id === b.switchToCourtId);
    totalPaid += b.paidAmount;
    totalRefund += b.refundAmount;
    if (b.status === "refunded") totalLoss += b.refundAmount;
    else if (b.status === "rescheduled") totalLoss += b.paidAmount * 0.1;

    rows.push([
      b.id,
      b.date,
      `${b.startTime}-${b.endTime}`,
      member?.name ?? "-",
      member?.level ?? "-",
      court?.name ?? "-",
      court?.type === "indoor" ? "室内" : "室外",
      coach?.name ?? "无",
      String(b.paidAmount),
      statusLabel(b.status),
      String(b.refundAmount),
      switchCourt?.name ?? "-",
      b.rescheduleToDate ?? "-",
      String(b.elapsedMinutes),
      b.weatherNote ?? "-",
      b.processRemark ?? "-",
    ]);
  }

  rows.push([]);
  rows.push(["", "", "", "", "", "", "", "", "汇总付款", "", "汇总退款", "", "", "估算损失", "", ""]);
  rows.push([
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    String(totalPaid),
    "",
    String(totalRefund),
    "",
    "",
    String(Math.round(totalLoss * 100) / 100),
    "",
    "",
  ]);

  const csv = rows.map(rowToCsv).join("\n");
  download(`停场损失报表_${date}.csv`, csv, "text/csv");
}

export function exportCompensationReport(
  compensations: Compensation[],
  bookings: Booking[],
  coaches: Coach[],
  members: Member[],
  courts: Court[]
) {
  const headers = [
    "补偿编号",
    "订单号",
    "会员",
    "教练",
    "时段",
    "原场地",
    "教练补偿金额",
    "补偿方案",
    "操作人",
    "审批人",
    "创建时间",
  ];
  const rows: string[][] = [headers];

  for (const c of compensations) {
    const booking = bookings.find((b) => b.id === c.bookingId);
    const coach = coaches.find((cc) => cc.id === c.coachId);
    const member = members.find((m) => m.id === booking?.memberId);
    const court = courts.find((cc) => cc.id === booking?.courtId);
    rows.push([
      c.id,
      c.bookingId,
      member?.name ?? "-",
      coach?.name ?? c.coachId ?? "-",
      booking ? `${booking.date} ${booking.startTime}-${booking.endTime}` : "-",
      court?.name ?? "-",
      String(c.coachCompensation),
      c.compensationPlan,
      `${c.operatorName}(${roleLabel(c.operatorRole)})`,
      c.approverId ?? "-",
      c.createdAt,
    ]);
  }

  const total = compensations.reduce((s, c) => s + c.coachCompensation, 0);
  rows.push([]);
  rows.push(["", "", "", "", "", "", `合计:${total}`, "", "", "", ""]);

  const csv = rows.map(rowToCsv).join("\n");
  download(`补偿记录_${new Date().toISOString().slice(0, 10)}.csv`, csv, "text/csv");
}

function statusLabel(s: string) {
  const map: Record<string, string> = {
    normal: "正常",
    stopped: "已停场",
    switched: "已换场",
    rescheduled: "已延期",
    refunded: "已退款",
  };
  return map[s] ?? s;
}

function roleLabel(r: string) {
  const map: Record<string, string> = {
    reception: "前台",
    manager: "店长",
    coach: "教练",
  };
  return map[r] ?? r;
}
