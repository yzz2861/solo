import type { Booking, Member, Court, Coach } from "@/types";

export function buildPrintHtml(
  bookings: Booking[],
  courts: Court[],
  members: Member[],
  coaches: Coach[],
  date: string,
  weatherRemark: string | null
): string {
  const changedBookings = bookings.filter(
    (b) => b.date === date && b.status !== "normal"
  );

  const switched = changedBookings.filter((b) => b.status === "switched");
  const rescheduled = changedBookings.filter((b) => b.status === "rescheduled");
  const refunded = changedBookings.filter((b) => b.status === "refunded");
  const stopped = changedBookings.filter((b) => b.status === "stopped");

  const total = changedBookings.reduce((s, b) => s + b.paidAmount, 0);
  const totalRefund = changedBookings.reduce((s, b) => s + b.refundAmount, 0);

  const rows = (list: Booking[]) =>
    list
      .map((b, i) => {
        const m = members.find((x) => x.id === b.memberId);
        const c = courts.find((x) => x.id === b.courtId);
        const sc = courts.find((x) => x.id === b.switchToCourtId);
        const coach = coaches.find((x) => x.id === b.coachId);
        return `<tr>
          <td style="padding:8px;border:1px solid #ddd;">${i + 1}</td>
          <td style="padding:8px;border:1px solid #ddd;">${m?.name ?? "-"}<br><span style="font-size:11px;color:#666;">${m?.phone ?? ""}</span></td>
          <td style="padding:8px;border:1px solid #ddd;">${b.startTime}-${b.endTime}</td>
          <td style="padding:8px;border:1px solid #ddd;">${c?.name ?? "-"}</td>
          <td style="padding:8px;border:1px solid #ddd;">${coach?.name ?? "-"}</td>
          <td style="padding:8px;border:1px solid #ddd;">¥${b.paidAmount}</td>
          <td style="padding:8px;border:1px solid #ddd;">${
            b.status === "switched"
              ? sc?.name ?? "-"
              : b.status === "rescheduled"
              ? b.rescheduleToDate ?? "-"
              : b.status === "refunded"
              ? `¥${b.refundAmount}`
              : "-"
          }</td>
          <td style="padding:8px;border:1px solid #ddd;max-width:200px;word-break:break-all;">${b.processRemark ?? ""}</td>
        </tr>`;
      })
      .join("");

  const section = (title: string, list: Booking[]) => {
    if (list.length === 0) return "";
    return `<div style="margin:20px 0;">
      <h3 style="font-size:16px;color:#0F766E;margin:0 0 10px;border-left:4px solid #0F766E;padding-left:8px;">${title}（${list.length}单）</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#f0fdfa;">
            <th style="padding:8px;border:1px solid #ddd;text-align:left;width:40px;">#</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">会员</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">时段</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">原场地</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">教练</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">实付</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">变更结果</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">备注</th>
          </tr>
        </thead>
        <tbody>${rows(list)}</tbody>
      </table>
    </div>`;
  };

  return `
  <div class="print-area" style="font-family:'Noto Sans SC','Microsoft YaHei',sans-serif;color:#1f2937;line-height:1.6;">
    <div style="text-align:center;border-bottom:2px solid #0F766E;padding-bottom:16px;margin-bottom:20px;">
      <h1 style="font-size:24px;margin:0 0 4px;color:#0F766E;">🎾 网球馆今日变更单</h1>
      <div style="font-size:13px;color:#6b7280;">日期：${date} &nbsp;|&nbsp; 打印时间：${new Date().toLocaleString(
    "zh-CN"
  )}</div>
      ${weatherRemark ? `<div style="margin-top:8px;font-size:13px;background:#fef3c7;padding:6px 12px;border-radius:6px;color:#92400e;display:inline-block;">💧 天气备注：${weatherRemark}</div>` : ""}
    </div>

    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px;">
      <div style="background:#ecfdf5;padding:10px 14px;border-radius:8px;border:1px solid #a7f3d0;">
        <div style="font-size:12px;color:#065f46;">变更总数</div>
        <div style="font-size:22px;font-weight:700;color:#065f46;">${changedBookings.length}</div>
      </div>
      <div style="background:#ccfbf1;padding:10px 14px;border-radius:8px;border:1px solid #5eead4;">
        <div style="font-size:12px;color:#0F766E;">换场</div>
        <div style="font-size:22px;font-weight:700;color:#0F766E;">${switched.length}</div>
      </div>
      <div style="background:#fef3c7;padding:10px 14px;border-radius:8px;border:1px solid #fcd34d;">
        <div style="font-size:12px;color:#92400e;">延期</div>
        <div style="font-size:22px;font-weight:700;color:#92400e;">${rescheduled.length}</div>
      </div>
      <div style="background:#fce7f3;padding:10px 14px;border-radius:8px;border:1px solid #f9a8d4;">
        <div style="font-size:12px;color:#9d174d;">退款</div>
        <div style="font-size:22px;font-weight:700;color:#9d174d;">${refunded.length}</div>
      </div>
    </div>

    <div style="background:#f9fafb;padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:10px;">
      <strong>金额汇总：</strong>涉及付款 ¥${total.toFixed(2)} &nbsp;|&nbsp; 退款合计 ¥${totalRefund.toFixed(2)} &nbsp;|&nbsp; 待处理 ${stopped.length} 单
    </div>

    ${section("🔄 换场至室内", switched)}
    ${section("📅 已延期", rescheduled)}
    ${section("💰 已退款", refunded)}
    ${section("⏸ 已标记停场（待处理）", stopped)}

    <div style="margin-top:40px;display:flex;justify-content:space-between;font-size:12px;color:#6b7280;border-top:1px dashed #d1d5db;padding-top:12px;">
      <div>前台签字：________________</div>
      <div>店长签字：________________</div>
      <div>备注：本单一式两份，前台与财务各执一份</div>
    </div>
  </div>`;
}
