import { useStore } from "@/store";
import { todayStr } from "@/data/seed";
import { detectCapacityWarning } from "@/engine/scheduler";
import {
  Trees,
  Home,
  PauseCircle,
  RefreshCw,
  CalendarX,
  Wallet,
  AlertTriangle,
  TrendingUp,
  Users,
} from "lucide-react";

export default function StatsSidebar() {
  const courts = useStore((s) => s.courts);
  const bookings = useStore((s) => s.bookings);

  const today = todayStr;
  const todayBookings = bookings.filter((b) => b.date === today);

  const outdoorCourts = courts.filter((c) => c.type === "outdoor");
  const indoorCourts = courts.filter((c) => c.type === "indoor");

  const outdoorUsed = todayBookings.filter(
    (b) =>
      b.courtId.startsWith("c_o_") &&
      b.status !== "refunded" &&
      b.status !== "rescheduled"
  ).length;
  const outdoorTotal = outdoorCourts.reduce((s, c) => s + c.capacity, 0);

  const cap = detectCapacityWarning(indoorCourts, todayBookings, today);

  const stoppedCount = todayBookings.filter((b) => b.status === "stopped").length;
  const switchedCount = todayBookings.filter((b) => b.status === "switched").length;
  const rescheduledCount = todayBookings.filter(
    (b) => b.status === "rescheduled"
  ).length;
  const refundedCount = todayBookings.filter((b) => b.status === "refunded").length;
  const totalChanged = stoppedCount + switchedCount + rescheduledCount + refundedCount;

  const totalPaid = todayBookings
    .filter((b) => b.status !== "normal")
    .reduce((s, b) => s + b.paidAmount, 0);
  const totalRefund = todayBookings.reduce((s, b) => s + b.refundAmount, 0);

  const stats = [
    {
      label: "室外场",
      value: `${outdoorUsed}/${outdoorTotal}`,
      icon: Trees,
      color: "from-emerald-50 to-emerald-100",
      iconBg: "bg-emerald-100 text-emerald-700",
      arrow: outdoorUsed > outdoorTotal * 0.8 ? "↑" : "→",
      arrowColor: outdoorUsed > outdoorTotal * 0.8 ? "text-red-500" : "text-gray-400",
      hint: outdoorUsed > outdoorTotal * 0.8 ? "高负荷" : "正常",
    },
    {
      label: "室内场",
      value: `${cap.usedIndoor}/${cap.totalIndoor}`,
      icon: Home,
      color: cap.warning
        ? "from-amber-50 to-orange-100"
        : "from-court-50 to-court-100",
      iconBg: cap.warning
        ? "bg-amber-100 text-amber-700"
        : "bg-court-100 text-court-700",
      arrow: cap.warning ? "↑" : "→",
      arrowColor: cap.warning ? "text-amber-600" : "text-gray-400",
      hint: cap.warning ? "容量告急" : "充足",
    },
    {
      label: "已停场",
      value: String(stoppedCount),
      icon: PauseCircle,
      color: stoppedCount
        ? "from-red-50 to-rose-100"
        : "from-gray-50 to-gray-100",
      iconBg: "bg-red-100 text-red-600",
      arrow: stoppedCount > 5 ? "↑" : "→",
      arrowColor: stoppedCount > 5 ? "text-red-500" : "text-gray-400",
      hint: stoppedCount ? "待处理" : "暂无",
    },
    {
      label: "换场成功",
      value: String(switchedCount),
      icon: RefreshCw,
      color: "from-teal-50 to-cyan-100",
      iconBg: "bg-teal-100 text-teal-700",
      arrow: "↑",
      arrowColor: "text-teal-500",
      hint: "推荐首选",
    },
    {
      label: "延期",
      value: String(rescheduledCount),
      icon: CalendarX,
      color: "from-amber-50 to-yellow-100",
      iconBg: "bg-amber-100 text-amber-700",
      arrow: "→",
      arrowColor: "text-amber-500",
      hint: "改期累计",
    },
    {
      label: "退款",
      value: String(refundedCount),
      icon: Wallet,
      color: "from-purple-50 to-fuchsia-100",
      iconBg: "bg-purple-100 text-purple-700",
      arrow: "↓",
      arrowColor: "text-purple-500",
      hint: `退¥${totalRefund.toFixed(0)}`,
    },
  ];

  return (
    <aside className="no-print shrink-0 w-72 space-y-4">
      <div className="card p-5 animate-fade-in-up" style={{ animationDelay: "20ms" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-court-600" />
            今日场地概览
          </h3>
          <span className="text-[10px] text-gray-400">{today}</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {stats.map((s, i) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className={`relative p-3 rounded-2xl bg-gradient-to-br ${s.color} border border-white/80 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-default animate-fade-in-up`}
                style={{ animationDelay: `${40 + i * 40}ms` }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${s.iconBg}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`text-sm font-bold ${s.arrowColor}`}>{s.arrow}</span>
                </div>
                <div className="text-xs text-gray-600 mb-0.5">{s.label}</div>
                <div className="text-lg font-bold text-gray-800 font-mono tracking-tight">
                  {s.value}
                </div>
                <div className={`text-[10px] mt-1 ${s.arrowColor}`}>{s.hint}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div
        className="card p-5 animate-fade-in-up"
        style={{ animationDelay: "260ms" }}
      >
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          变更汇总
        </h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">总变更订单</span>
            <span className="font-bold text-gray-800 font-mono">{totalChanged}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">涉及付款金额</span>
            <span className="font-bold text-gray-800 font-mono">
              ¥{totalPaid.toFixed(0)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">退款合计</span>
            <span className="font-bold text-red-600 font-mono">
              ¥{totalRefund.toFixed(2)}
            </span>
          </div>
          <div className="progress-track mt-3">
            <div
              className={`progress-fill ${
                totalChanged === 0
                  ? "bg-gray-200"
                  : totalChanged > 10
                  ? "bg-gradient-to-r from-red-400 to-red-500"
                  : totalChanged > 5
                  ? "bg-gradient-to-r from-amber-400 to-orange-500"
                  : "bg-gradient-to-r from-court-400 to-teal-500"
              }`}
              style={{ width: `${Math.min(100, totalChanged * 6)}%` }}
            />
          </div>
          <div className="text-[10px] text-gray-400 mt-1 flex items-center justify-between">
            <span>变更压力指数</span>
            <span>
              {totalChanged === 0
                ? "空闲"
                : totalChanged > 10
                ? "高压 ⚠"
                : totalChanged > 5
                ? "繁忙"
                : "正常"}
            </span>
          </div>
        </div>
      </div>

      <div
        className="card p-5 animate-fade-in-up"
        style={{ animationDelay: "300ms" }}
      >
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-court-600" />
          今日订单分布
        </h3>
        <div className="space-y-3">
          {[
            {
              label: "室外",
              value: todayBookings.filter((b) => b.courtId.startsWith("c_o_")).length,
              color: "bg-emerald-400",
              pct:
                todayBookings.length === 0
                  ? 0
                  : Math.round(
                      (todayBookings.filter((b) => b.courtId.startsWith("c_o_")).length /
                        todayBookings.length) *
                        100
                    ),
            },
            {
              label: "室内",
              value: todayBookings.filter((b) => b.courtId.startsWith("c_i_")).length,
              color: "bg-court-500",
              pct:
                todayBookings.length === 0
                  ? 0
                  : Math.round(
                      (todayBookings.filter((b) => b.courtId.startsWith("c_i_")).length /
                        todayBookings.length) *
                        100
                    ),
            },
          ].map((item) => (
            <div key={item.label}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-600">{item.label}</span>
                <span className="font-mono font-semibold text-gray-700">
                  {item.value}单 · {item.pct}%
                </span>
              </div>
              <div className="progress-track">
                <div
                  className={`progress-fill ${item.color}`}
                  style={{ width: `${item.pct}%` }}
                />
              </div>
            </div>
          ))}
          <div className="pt-2 mt-2 border-t border-gray-100 text-center">
            <div className="text-2xl font-bold text-gray-800 font-mono">
              {todayBookings.length}
            </div>
            <div className="text-[10px] text-gray-400">今日总订单</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
