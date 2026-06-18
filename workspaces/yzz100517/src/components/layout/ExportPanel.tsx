import { useStore } from "@/store";
import {
  FileSpreadsheet,
  DollarSign,
  Printer,
  MessageSquare,
  BadgeCheck,
  Download,
} from "lucide-react";
import { exportLossReport, exportCompensationReport } from "@/utils/csv";
import { buildPrintHtml } from "@/utils/print";
import { todayStr } from "@/data/seed";
import { useState } from "react";
import { generateNotify, copyToClipboard } from "@/utils/notify";
import type { Booking } from "@/types";

export default function ExportPanel() {
  const courts = useStore((s) => s.courts);
  const members = useStore((s) => s.members);
  const coaches = useStore((s) => s.coaches);
  const bookings = useStore((s) => s.bookings);
  const compensations = useStore((s) => s.compensations);
  const weather = useStore((s) => s.weatherNote);
  const currentRole = useStore((s) => s.currentRole);
  const pushToast = useStore((s) => s.pushToast);

  const [notifyBookingId, setNotifyBookingId] = useState<string>("");
  const [notifyTab, setNotifyTab] = useState<"sms" | "wechat">("wechat");

  const changedBookings = bookings.filter(
    (b) => b.date === todayStr && b.status !== "normal"
  );

  const doPrint = () => {
    const html = buildPrintHtml(
      bookings,
      courts,
      members,
      coaches,
      todayStr,
      weather.remark
    );
    const win = window.open("", "_blank", "width=900,height=1200");
    if (!win) {
      pushToast("error", "弹窗被拦截，请允许弹窗");
      return;
    }
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>今日变更单</title>
    <style>
      body { margin:0; font-family:'Noto Sans SC','Microsoft YaHei',sans-serif; color:#1f2937; }
      .print-area { padding: 32px; }
      @media print { @page { size: A4; margin: 0; } }
    </style></head><body>${html}</body></html>`);
    win.document.close();
    setTimeout(() => {
      win.print();
    }, 400);
  };

  const doExportLoss = () => {
    exportLossReport(bookings, courts, members, coaches, todayStr);
    pushToast("success", "已导出停场损失报表");
  };

  const doExportComp = () => {
    if (compensations.length === 0) {
      pushToast("info", "暂无补偿记录可导出");
      return;
    }
    exportCompensationReport(compensations, bookings, coaches, members, courts);
    pushToast("success", "已导出补偿记录报表");
  };

  const notifyBooking: Booking | undefined =
    bookings.find((b) => b.id === notifyBookingId) ?? changedBookings[0];

  const originalCourt = notifyBooking
    ? courts.find((c) => c.id === notifyBooking.courtId)
    : undefined;
  const newCourt = notifyBooking
    ? courts.find((c) => c.id === notifyBooking.switchToCourtId)
    : undefined;
  const member = notifyBooking
    ? members.find((m) => m.id === notifyBooking.memberId)
    : undefined;

  const notifyContent = notifyBooking
    ? generateNotify(notifyBooking, member, originalCourt, newCourt, weather.remark)
    : { sms: "", wechat: "" };

  const handleCopy = async () => {
    const text = notifyTab === "sms" ? notifyContent.sms : notifyContent.wechat;
    if (!text) return;
    const ok = await copyToClipboard(text.replace(/<b>|<\/b>/g, ""));
    if (ok) pushToast("success", "通知内容已复制");
    else pushToast("error", "复制失败");
  };

  const canExportLoss = currentRole !== "coach";
  const canExportComp = currentRole !== "coach";

  return (
    <aside className="no-print shrink-0 w-80 space-y-4">
      <div
        className="card p-5 animate-fade-in-up"
        style={{ animationDelay: "80ms" }}
      >
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-4">
          <Download className="w-4 h-4 text-court-600" />
          导出与打印中心
        </h3>

        <div className="space-y-2.5">
          <button
            onClick={doPrint}
            disabled={changedBookings.length === 0}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gradient-to-br from-white to-gray-50 hover:from-court-50 hover:to-cyan-50 hover:border-court-200 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="w-9 h-9 rounded-xl bg-court-100 text-court-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Printer className="w-4 h-4" />
            </div>
            <div className="text-left flex-1">
              <div className="text-sm font-semibold text-gray-800">打印今日变更单</div>
              <div className="text-[10px] text-gray-500">
                A4标准 · 含{changedBookings.length}单变更记录
              </div>
            </div>
          </button>

          <button
            onClick={doExportLoss}
            disabled={!canExportLoss}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gradient-to-br from-white to-gray-50 hover:from-red-50 hover:to-rose-50 hover:border-red-200 transition-all duration-200 group disabled:opacity-50"
          >
            <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div className="text-left flex-1">
              <div className="text-sm font-semibold text-gray-800">导出停场损失</div>
              <div className="text-[10px] text-gray-500">CSV · 损失估算汇总</div>
            </div>
          </button>

          <button
            onClick={doExportComp}
            disabled={!canExportComp}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gradient-to-br from-white to-gray-50 hover:from-amber-50 hover:to-yellow-50 hover:border-amber-200 transition-all duration-200 group disabled:opacity-50"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <DollarSign className="w-4 h-4" />
            </div>
            <div className="text-left flex-1">
              <div className="text-sm font-semibold text-gray-800">导出补偿记录</div>
              <div className="text-[10px] text-gray-500">
                CSV · 共{compensations.length}条补偿
              </div>
            </div>
          </button>
        </div>
      </div>

      <div
        className="card p-5 animate-fade-in-up"
        style={{ animationDelay: "140ms" }}
      >
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-4">
          <MessageSquare className="w-4 h-4 text-blue-500" />
          会员通知生成
        </h3>

        <div className="mb-3">
          <label className="label">选择订单</label>
          <select
            className="select"
            value={notifyBooking?.id ?? ""}
            onChange={(e) => setNotifyBookingId(e.target.value)}
          >
            {changedBookings.length === 0 && (
              <option value="">请先标记停场</option>
            )}
            {changedBookings.map((b) => {
              const m = members.find((x) => x.id === b.memberId);
              return (
                <option key={b.id} value={b.id}>
                  {m?.name ?? "未关联"} · {b.startTime}-{b.endTime} ·{" "}
                  {statusZh(b.status)}
                </option>
              );
            })}
          </select>
        </div>

        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-3">
          {(["sms", "wechat"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setNotifyTab(t)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                notifyTab === t
                  ? "bg-white shadow-sm text-gray-800"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "sms" ? "📱 短信模板" : "💬 微信模板"}
            </button>
          ))}
        </div>

        <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs leading-relaxed text-gray-700 whitespace-pre-wrap max-h-40 overflow-y-auto scrollbar-thin mb-3">
          {notifyBooking
            ? (notifyTab === "sms" ? notifyContent.sms : notifyContent.wechat)
                .replace(/<b>/g, "")
                .replace(/<\/b>/g, "")
            : "请选择订单以生成通知内容"}
        </div>

        <button
          onClick={handleCopy}
          disabled={!notifyBooking}
          className="w-full btn-primary text-xs !py-2"
        >
          <BadgeCheck className="w-3.5 h-3.5" />
          复制{notifyTab === "sms" ? "短信" : "微信"}模板内容
        </button>
      </div>
    </aside>
  );
}

function statusZh(s: string) {
  const map: Record<string, string> = {
    normal: "正常",
    stopped: "停场",
    switched: "换场",
    rescheduled: "延期",
    refunded: "退款",
  };
  return map[s] ?? s;
}
