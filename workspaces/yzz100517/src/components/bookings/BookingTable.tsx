import { useStore } from "@/store";
import { todayStr } from "@/data/seed";
import {
  ChevronRight,
  RefreshCw,
  CalendarX,
  Wallet,
  PauseCircle,
  Plus,
  Trees,
  Home,
  Filter,
  Search,
  User,
  Clock,
  Crown,
  Medal,
  Award,
  Trash2,
  Undo2,
} from "lucide-react";
import { useState } from "react";
import BookingRow from "./BookingRow";
import type { BookingStatus, CourtType } from "@/types";

const statusBadgeMap: Record<
  BookingStatus,
  { cls: string; icon: typeof PauseCircle; zh: string }
> = {
  normal: { cls: "badge-normal", icon: Clock, zh: "正常" },
  stopped: { cls: "badge-stopped", icon: PauseCircle, zh: "已停场" },
  switched: { cls: "badge-switched", icon: RefreshCw, zh: "已换场" },
  rescheduled: { cls: "badge-rescheduled", icon: CalendarX, zh: "已延期" },
  refunded: { cls: "badge-refunded", icon: Wallet, zh: "已退款" },
};

const levelMap = {
  gold: { icon: Crown, cls: "text-amber-500 bg-amber-50", zh: "金卡" },
  silver: { icon: Medal, cls: "text-slate-500 bg-slate-50", zh: "银卡" },
  normal: { icon: Award, cls: "text-gray-500 bg-gray-50", zh: "普通" },
};

type FilterKey = "all" | CourtType | BookingStatus;

export default function BookingTable() {
  const bookings = useStore((s) => s.bookings);
  const courts = useStore((s) => s.courts);
  const members = useStore((s) => s.members);
  const coaches = useStore((s) => s.coaches);
  const toggleSelectBooking = useStore((s) => s.toggleSelectBooking);
  const selectedIds = useStore((s) => s.selectedBookingIds);
  const setDrawerBookingId = useStore((s) => s.setDrawerBookingId);
  const addOrUpdateBooking = useStore((s) => s.addOrUpdateBooking);
  const currentRole = useStore((s) => s.currentRole);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const canEdit = currentRole !== "coach";

  const filtered = bookings
    .filter((b) => b.date === todayStr)
    .filter((b) => {
      if (filter === "all") return true;
      if (filter === "outdoor" || filter === "indoor") {
        const c = courts.find((cc) => cc.id === b.courtId);
        return c?.type === filter;
      }
      return b.status === filter;
    })
    .filter((b) => {
      if (!search.trim()) return true;
      const s = search.trim().toLowerCase();
      const m = members.find((mm) => mm.id === b.memberId);
      const court = courts.find((c) => c.id === b.courtId);
      const coach = coaches.find((c) => c.id === b.coachId);
      return (
        m?.name.toLowerCase().includes(s) ||
        m?.phone.includes(s) ||
        court?.name.toLowerCase().includes(s) ||
        coach?.name.includes(s) ||
        b.startTime.includes(s) ||
        b.endTime.includes(s)
      );
    })
    .sort((a, b) => {
      if (a.startTime !== b.startTime) return a.startTime < b.startTime ? -1 : 1;
      return a.courtId.localeCompare(b.courtId);
    });

  const filters: { key: FilterKey; label: string }[] = [
    { key: "all", label: "全部" },
    { key: "outdoor", label: "室外" },
    { key: "indoor", label: "室内" },
    { key: "stopped", label: "停场" },
    { key: "switched", label: "换场" },
    { key: "rescheduled", label: "延期" },
    { key: "refunded", label: "退款" },
  ];

  return (
    <div className="card overflow-hidden animate-fade-in-up">
      <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
          <User className="w-4 h-4 text-court-600" />
          今日订单 <span className="text-xs text-gray-400 font-normal">共{filtered.length}条</span>
        </h3>

        <div className="flex items-center gap-1 p-1 bg-gray-50 rounded-xl border border-gray-100">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                filter === f.key
                  ? "bg-white text-court-700 shadow-sm border border-court-100"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-xs ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索会员/教练/场地/时段"
            className="input pl-9 !py-1.5 !text-xs"
          />
        </div>

        {canEdit && (
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary !py-1.5 !px-3 text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            新增订单
          </button>
        )}
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[900px]">
          <thead className="bg-gradient-to-b from-gray-50 to-white sticky top-0 z-10">
            <tr>
              <th className="th-cell w-10">
                <span className="sr-only">选择</span>
              </th>
              <th className="th-cell w-20">时段</th>
              <th className="th-cell">会员</th>
              <th className="th-cell">场地</th>
              <th className="th-cell">教练</th>
              <th className="th-cell w-24 text-right">付款</th>
              <th className="th-cell w-20">已开场</th>
              <th className="th-cell w-28">状态</th>
              <th className="th-cell w-40 text-right no-print">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-16 text-center">
                  <div className="inline-flex flex-col items-center gap-2 text-gray-400">
                    <Filter className="w-10 h-10 opacity-40" />
                    <div className="text-sm">暂无符合条件的订单</div>
                  </div>
                </td>
              </tr>
            )}
            {filtered.map((b, i) => {
              const m = members.find((mm) => mm.id === b.memberId);
              const court = courts.find((c) => c.id === b.courtId);
              const switchCourt = courts.find((c) => c.id === b.switchToCourtId);
              const coach = coaches.find((c) => c.id === b.coachId);
              const statusConf = statusBadgeMap[b.status];
              const StatusIcon = statusConf.icon;
              const levelConf = levelMap[m?.level ?? "normal"];
              const LevelIcon = levelConf.icon;
              const checked = selectedIds.includes(b.id);

              return (
                <BookingRow
                  key={b.id}
                  booking={b}
                  index={i}
                  member={m}
                  court={court}
                  switchCourt={switchCourt}
                  coach={coach}
                  statusConf={statusConf}
                  StatusIcon={StatusIcon}
                  levelConf={levelConf}
                  LevelIcon={LevelIcon}
                  checked={checked}
                  onToggle={() => canEdit && toggleSelectBooking(b.id)}
                  onOpen={() => setDrawerBookingId(b.id)}
                  canEdit={canEdit}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <CreateBookingModal onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}

function CreateBookingModal({ onClose }: { onClose: () => void }) {
  const courts = useStore((s) => s.courts);
  const members = useStore((s) => s.members);
  const coaches = useStore((s) => s.coaches);
  const addOrUpdateBooking = useStore((s) => s.addOrUpdateBooking);
  const [form, setForm] = useState({
    memberId: members[0]?.id ?? "",
    courtId: courts[0]?.id ?? "",
    coachId: "" as string,
    startTime: "14:00",
    endTime: "16:00",
    paidAmount: 300,
    payMethod: "wechat" as const,
  });

  const submit = () => {
    addOrUpdateBooking(
      {
        ...form,
        coachId: form.coachId || null,
        paidAmount: Number(form.paidAmount),
      },
      true
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-fade-in-up">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-800">新增订单</h3>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto scrollbar-thin">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">会员</label>
              <select
                className="select"
                value={form.memberId}
                onChange={(e) => setForm({ ...form, memberId: e.target.value })}
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} · {m.phone}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">场地</label>
              <select
                className="select"
                value={form.courtId}
                onChange={(e) => setForm({ ...form, courtId: e.target.value })}
              >
                {courts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.type === "indoor" ? "室内" : "室外"})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">教练（可选）</label>
              <select
                className="select"
                value={form.coachId}
                onChange={(e) => setForm({ ...form, coachId: e.target.value })}
              >
                <option value="">无教练</option>
                {coaches.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.specialty}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">开始</label>
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">结束</label>
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  className="input"
                />
              </div>
            </div>
            <div>
              <label className="label">付款金额（元）</label>
              <input
                type="number"
                value={form.paidAmount}
                onChange={(e) =>
                  setForm({ ...form, paidAmount: Number(e.target.value) })
                }
                className="input font-mono"
              />
            </div>
            <div>
              <label className="label">支付方式</label>
              <select
                className="select"
                value={form.payMethod}
                onChange={(e) =>
                  setForm({ ...form, payMethod: e.target.value as typeof form.payMethod })
                }
              >
                <option value="wechat">微信</option>
                <option value="alipay">支付宝</option>
                <option value="card">刷卡</option>
                <option value="cash">现金</option>
              </select>
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost !text-xs">
            取消
          </button>
          <button onClick={submit} className="btn-primary !text-xs">
            确认创建
          </button>
        </div>
      </div>
    </div>
  );
}
