import { useStore } from "@/store";
import {
  X,
  CloudRain,
  AlertTriangle,
  CheckCircle2,
  PauseCircle,
  Home,
} from "lucide-react";
import { useState, useMemo } from "react";

export default function StopConfirmModal() {
  const open = useStore((s) => s.stopModalOpen);
  const close = useStore((s) => s.setStopModalOpen);
  const selectedIds = useStore((s) => s.selectedBookingIds);
  const bookings = useStore((s) => s.bookings);
  const courts = useStore((s) => s.courts);
  const members = useStore((s) => s.members);
  const markStopped = useStore((s) => s.markStopped);
  const clearSelection = useStore((s) => s.clearSelection);
  const weather = useStore((s) => s.weatherNote);

  const [remark, setRemark] = useState(weather.remark || "突降暴雨，室外场地湿滑");

  const selectedBookings = useMemo(
    () => bookings.filter((b) => selectedIds.includes(b.id)),
    [bookings, selectedIds]
  );

  const stats = useMemo(() => {
    const total = selectedBookings.length;
    const totalPaid = selectedBookings.reduce((s, b) => s + b.paidAmount, 0);
    const withCoach = selectedBookings.filter((b) => b.coachId).length;
    const membersAffected = new Set(selectedBookings.map((b) => b.memberId)).size;
    return { total, totalPaid, withCoach, membersAffected };
  }, [selectedBookings]);

  const handleConfirm = () => {
    markStopped(selectedIds, remark || null);
    clearSelection();
    close(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
        <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-amber-50 via-orange-50 to-red-50 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <CloudRain className="absolute w-32 h-32 -top-8 -right-8 text-amber-400 animate-pulse" />
          </div>
          <div className="relative flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-soft shrink-0">
              <CloudRain className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-800 text-base">确认批量停场</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                将对选中的 {stats.total} 条室外订单执行停场操作，后续可逐个换场/延期/退款
              </p>
            </div>
            <button
              onClick={() => close(false)}
              className="w-9 h-9 rounded-xl hover:bg-white/60 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto scrollbar-thin">
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={PauseCircle}
              label="停场订单"
              value={`${stats.total} 单`}
              tone="amber"
            />
            <StatCard
              icon={Home}
              label="影响会员"
              value={`${stats.membersAffected} 人`}
              tone="blue"
            />
            <StatCard
              icon={CheckCircle2}
              label="含教练课"
              value={`${stats.withCoach} 单`}
              tone="court"
            />
            <StatCard
              icon={AlertTriangle}
              label="涉款金额"
              value={`¥${stats.totalPaid.toFixed(0)}`}
              tone="red"
            />
          </div>

          <div>
            <label className="label flex items-center gap-1.5">
              <CloudRain className="w-3.5 h-3.5 text-gray-400" />
              天气备注（前台解释说明用）
            </label>
            <textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              className="input min-h-[72px] resize-y"
              placeholder="如：下午14:30突降雷阵雨，场地积水..."
            />
          </div>

          {selectedBookings.length > 0 && (
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-gray-600">订单明细</span>
                <span className="text-[10px] text-gray-400">前 5 条展示</span>
              </div>
              <div className="divide-y divide-gray-50">
                {selectedBookings.slice(0, 5).map((b) => {
                  const m = members.find((x) => x.id === b.memberId);
                  const c = courts.find((x) => x.id === b.courtId);
                  return (
                    <div
                      key={b.id}
                      className="px-3 py-2 flex items-center gap-2.5 hover:bg-gray-50/60 transition-colors"
                    >
                      <div className="w-1 h-8 rounded-full bg-amber-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-800 flex items-center gap-1.5">
                          <span>{m?.name}</span>
                          <span className="text-gray-400">·</span>
                          <span className="text-gray-500">{c?.name}</span>
                        </div>
                        <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                          {b.startTime} - {b.endTime}
                        </div>
                      </div>
                      <div className="text-xs font-mono font-semibold text-gray-700 shrink-0">
                        ¥{b.paidAmount}
                      </div>
                    </div>
                  );
                })}
                {selectedBookings.length > 5 && (
                  <div className="px-3 py-2 text-center text-[11px] text-gray-400 bg-gray-50/30">
                    还有 {selectedBookings.length - 5} 条订单未展示...
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
            <div className="text-[11px] text-amber-800 leading-relaxed">
              <AlertTriangle className="w-3.5 h-3.5 inline mr-1 -mt-0.5 text-amber-500" />
              <strong>提示：</strong>停场仅标记状态，不会自动退款。请在订单详情抽屉中为每位会员选择
              <span className="text-amber-900 font-semibold mx-0.5">换场/延期/退款</span>
              方案，并生成对应通知模板。
            </div>
          </div>
        </div>

        <div className="px-5 py-3.5 border-t border-gray-100 flex items-center gap-2 bg-gray-50/50">
          <button
            onClick={() => close(false)}
            className="btn-ghost !py-2 !text-xs flex-1"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={stats.total === 0}
            className="btn-warn !py-2 !text-xs flex-1 disabled:opacity-50"
          >
            <PauseCircle className="w-3.5 h-3.5" />
            确认标记 {stats.total} 单停场
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: any;
  label: string;
  value: string;
  tone: "amber" | "blue" | "court" | "red";
}) {
  const toneMap = {
    amber: "bg-amber-50 border-amber-100 text-amber-600",
    blue: "bg-blue-50 border-blue-100 text-blue-600",
    court: "bg-court-50 border-court-100 text-court-600",
    red: "bg-red-50 border-red-100 text-red-600",
  };
  return (
    <div className={`p-3 rounded-xl border ${toneMap[tone]} bg-opacity-40`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="w-3.5 h-3.5 opacity-80" />
        <span className="text-[11px] font-medium opacity-80">{label}</span>
      </div>
      <div className="text-lg font-bold opacity-90">{value}</div>
    </div>
  );
}
