import { useStore } from "@/store";
import {
  PauseCircle,
  RefreshCw,
  CalendarX,
  Wallet,
  X,
  CheckSquare,
  Square,
  Trees,
  Home,
} from "lucide-react";

export default function BatchActionBar() {
  const selectedIds = useStore((s) => s.selectedBookingIds);
  const bookings = useStore((s) => s.bookings);
  const courts = useStore((s) => s.courts);
  const clearSelection = useStore((s) => s.clearSelection);
  const selectAllOutdoorToday = useStore((s) => s.selectAllOutdoorToday);
  const setStopModalOpen = useStore((s) => s.setStopModalOpen);
  const pushToast = useStore((s) => s.pushToast);
  const refundBooking = useStore((s) => s.refundBooking);
  const setDrawerBookingId = useStore((s) => s.setDrawerBookingId);

  if (selectedIds.length === 0) return null;

  const selectedBookings = bookings.filter((b) => selectedIds.includes(b.id));
  const hasOutdoor = selectedBookings.some((b) =>
    courts.find((c) => c.id === b.courtId)?.type === "outdoor"
  );
  const allStopped = selectedBookings.every((b) => b.status === "stopped");
  const allHandled = selectedBookings.every(
    (b) => b.status === "switched" || b.status === "rescheduled" || b.status === "refunded"
  );

  const handleBatchRefund = () => {
    if (allStopped) {
      selectedIds.forEach((id) => refundBooking(id, "批量退款（雨天）"));
      clearSelection();
    } else {
      pushToast("warning", "请先标记为停场后再批量退款");
    }
  };

  const handleBatchOpenDrawer = () => {
    if (selectedIds.length === 1) {
      setDrawerBookingId(selectedIds[0]);
    } else {
      setDrawerBookingId(selectedIds[0]);
      pushToast("info", "已打开第一单详情，可逐个处理");
    }
  };

  return (
    <div className="no-print sticky top-[84px] z-20 mb-4 animate-fade-in-up">
      <div className="bg-white rounded-2xl shadow-sticky border border-gray-100 p-3 flex items-center gap-3">
        <button
          onClick={clearSelection}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-court-50 rounded-xl border border-court-100">
          <CheckSquare className="w-4 h-4 text-court-600" />
          <span className="text-xs font-semibold text-court-800">
            已选择 {selectedIds.length} 单
          </span>
          {hasOutdoor && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100">
              <Trees className="w-3 h-3" />
              含室外
            </span>
          )}
          {selectedBookings.some((b) =>
            courts.find((c) => c.id === b.courtId)?.type === "indoor"
          ) && (
            <span className="flex items-center gap-1 text-[10px] text-court-700 bg-cyan-50 px-1.5 py-0.5 rounded-md border border-cyan-100">
              <Home className="w-3 h-3" />
              含室内
            </span>
          )}
        </div>

        <button
          onClick={selectAllOutdoorToday}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-court-300 hover:text-court-700 hover:bg-court-50 transition-colors"
        >
          <Square className="w-3.5 h-3.5" />
          全选今日室外
        </button>

        <div className="h-6 w-px bg-gray-200 mx-1" />

        <button
          onClick={() => setStopModalOpen(true)}
          className="btn-warn text-xs !py-1.5 !px-3"
        >
          <PauseCircle className="w-3.5 h-3.5" />
          批量标记停场
        </button>

        <button
          onClick={handleBatchOpenDrawer}
          disabled={selectedIds.length === 0}
          className="btn-primary text-xs !py-1.5 !px-3"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          逐个换场/延期
        </button>

        <button
          onClick={() => {
            pushToast(
              "info",
              "延期需为每单分别指定日期，请打开详情处理"
            );
            setDrawerBookingId(selectedIds[0] ?? null);
          }}
          disabled={selectedIds.length === 0}
          className="btn-secondary text-xs !py-1.5 !px-3"
        >
          <CalendarX className="w-3.5 h-3.5" />
          延期处理
        </button>

        <button
          onClick={handleBatchRefund}
          disabled={!allStopped || selectedIds.length === 0}
          className="btn-danger text-xs !py-1.5 !px-3"
        >
          <Wallet className="w-3.5 h-3.5" />
          {allHandled ? "全部已处理" : "全部退款"}
        </button>
      </div>
    </div>
  );
}
