import { create } from "zustand";
import type {
  AppState,
  Booking,
  BookingStatus,
  Compensation,
  ChangeLog,
  ActionType,
  Role,
  WeatherNote,
  Member,
} from "@/types";
import { loadState, saveState, debounce, clearAllState } from "@/utils/storage";
import { calculateRefund, minutesBetween } from "@/engine/refund";
import { todayStr } from "@/data/seed";

const initial = loadState();

const debouncedSave = debounce((state: AppState) => saveState(state), 400);

function genId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

interface ToastItem {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
}

interface UIState {
  selectedBookingIds: string[];
  drawerBookingId: string | null;
  printOpen: boolean;
  stopModalOpen: boolean;
  toasts: ToastItem[];
  formDraft: Partial<Booking> | null;
}

interface Store extends AppState, UIState {
  hydrate: () => void;
  setRole: (role: Role) => void;
  toggleSelectBooking: (id: string) => void;
  selectAllOutdoorToday: () => void;
  clearSelection: () => void;
  setDrawerBookingId: (id: string | null) => void;
  setPrintOpen: (v: boolean) => void;
  setStopModalOpen: (v: boolean) => void;
  pushToast: (type: ToastItem["type"], message: string) => void;
  dismissToast: (id: string) => void;
  addOrUpdateBooking: (draft: Partial<Booking>, isNew?: boolean) => void;
  deleteBooking: (id: string) => void;
  markStopped: (ids: string[], weatherNote: string | null) => void;
  switchCourt: (
    bookingId: string,
    newCourtId: string,
    remark: string | null
  ) => boolean;
  rescheduleBooking: (
    bookingId: string,
    newDate: string,
    remark: string | null,
    overrideLimit?: boolean
  ) => boolean;
  refundBooking: (bookingId: string, remark: string | null) => void;
  revertBooking: (bookingId: string) => void;
  addCompensation: (c: Omit<Compensation, "id" | "createdAt">) => void;
  updateWeather: (w: Partial<WeatherNote>) => void;
  updateMember: (member: Partial<Member> & { id: string }) => void;
  resetAll: () => void;
  getLogsForBooking: (bookingId: string) => ChangeLog[];
  getCompensationsForBooking: (bookingId: string) => Compensation[];
}

function pushLog(state: Store, bookingId: string, action: ActionType, before: Partial<Booking> | null, after: Partial<Booking> | null, remark: string | null = null): ChangeLog {
  const log: ChangeLog = {
    id: genId("log"),
    bookingId,
    action,
    beforeSnapshot: before,
    afterSnapshot: after,
    operatorRole: state.currentRole,
    operatorName: state.currentUser,
    remark,
    timestamp: new Date().toISOString(),
  };
  state.changeLogs = [...state.changeLogs, log];
  return log;
}

export const useStore = create<Store>((set, get) => ({
  ...initial,
  selectedBookingIds: [],
  drawerBookingId: null,
  printOpen: false,
  stopModalOpen: false,
  toasts: [],
  formDraft: null,

  hydrate() {
    const fresh = loadState();
    set(fresh);
  },

  setRole(role) {
    set({ currentRole: role });
    const names: Record<Role, string> = { reception: "前台小王", manager: "店长老李", coach: "教练代表" };
    set({ currentUser: names[role] });
    debouncedSave(get());
  },

  toggleSelectBooking(id) {
    const s = get();
    const exists = s.selectedBookingIds.includes(id);
    set({
      selectedBookingIds: exists
        ? s.selectedBookingIds.filter((x) => x !== id)
        : [...s.selectedBookingIds, id],
    });
  },

  selectAllOutdoorToday() {
    const s = get();
    const today = todayStr;
    const ids = s.bookings
      .filter(
        (b) =>
        b.date === today &&
        b.courtId.startsWith("c_o_") &&
        b.status === "normal"
      )
      .map((b) => b.id);
    set({ selectedBookingIds: ids });
  },

  clearSelection() {
    set({ selectedBookingIds: [] });
  },

  setDrawerBookingId(id) {
    set({ drawerBookingId: id });
  },

  setPrintOpen(v) {
    set({ printOpen: v });
  },

  setStopModalOpen(v) {
    set({ stopModalOpen: v });
  },

  pushToast(type, message) {
    const id = genId("toast");
    const s = get();
    set({ toasts: [...s.toasts, { id, type, message }] });
    setTimeout(() => get().dismissToast(id), 2800);
  },

  dismissToast(id) {
    const s = get();
    set({ toasts: s.toasts.filter((t) => t.id !== id) });
  },

  addOrUpdateBooking(draft, isNew = false) {
    const s = get();
    const now = new Date().toISOString();
    if (isNew || !draft.id) {
      const nb: Booking = {
        id: genId("b"),
        memberId: "",
        courtId: "",
        coachId: null,
        date: todayStr,
        startTime: "14:00",
        endTime: "16:00",
        status: "normal",
        paidAmount: 0,
        payMethod: "wechat",
        elapsedMinutes: 0,
        refundAmount: 0,
        switchToCourtId: null,
        rescheduleToDate: null,
        weatherNote: null,
        processRemark: null,
        createdAt: now,
        updatedAt: now,
        ...draft,
      };
      set({ bookings: [...s.bookings, nb] });
      pushLog(get(), nb.id, "create", null, nb, null);
      get().pushToast("success", `已新增订单（${nb.startTime}-${nb.endTime}）`);
    } else {
      const idx = s.bookings.findIndex((b) => b.id === draft.id);
      if (idx < 0) return;
      const before = { ...s.bookings[idx] };
      const updated: Booking = { ...s.bookings[idx], ...draft, updatedAt: now };
      const next = [...s.bookings];
      next[idx] = updated;
      set({ bookings: next });
      pushLog(get(), updated.id, "create", before, updated, "编辑订单");
      get().pushToast("info", `订单已更新`);
    }
    debouncedSave(get());
  },

  deleteBooking(id) {
    const s = get();
    const b = s.bookings.find((x) => x.id === id);
    if (!b) return;
    set({ bookings: s.bookings.filter((x) => x.id !== id) });
    get().pushToast("info", "订单已删除");
    debouncedSave(get());
  },

  markStopped(ids, weatherNote) {
    const s = get();
    const now = new Date().toISOString();
    const updated = s.bookings.map((b) => {
      if (!ids.includes(b.id)) return b;
      const before = { ...b };
      const nb: Booking = {
        ...b,
        status: "stopped" as BookingStatus,
        weatherNote: weatherNote ?? b.weatherNote,
        updatedAt: now,
      };
      pushLog(get(), b.id, "stop", before, nb, weatherNote ?? null);
      return nb;
    });
    set({ bookings: updated });
    if (weatherNote) {
      get().updateWeather({ remark: weatherNote, condition: "rain" });
    }
    get().pushToast("success", `已标记 ${ids.length} 单停场`);
    debouncedSave(get());
  },

  switchCourt(bookingId, newCourtId, remark) {
    const s = get();
    const idx = s.bookings.findIndex((b) => b.id === bookingId);
    if (idx < 0) return false;
    const before = { ...s.bookings[idx] };
    const now = new Date().toISOString();
    const next = [...s.bookings];
    next[idx] = {
      ...before,
      status: "switched",
      switchToCourtId: newCourtId,
      processRemark: remark,
      updatedAt: now,
    };
    set({ bookings: next });
    pushLog(get(), bookingId, "switch", before, next[idx], remark);
    get().pushToast("success", "已完成换场 ✅");
    debouncedSave(get());
    return true;
  },

  rescheduleBooking(bookingId, newDate, remark, overrideLimit) {
    const s = get();
    const idx = s.bookings.findIndex((b) => b.id === bookingId);
    if (idx < 0) return false;
    const before = { ...s.bookings[idx] };
    const member = s.members.find((m) => m.id === before.memberId);
    if (member) {
      if (member.rescheduleCount >= 3 && !overrideLimit) {
        get().pushToast("error", "改期次数超限，需店长审批");
        return false;
      }
      const mIdx = s.members.findIndex((m) => m.id === member.id);
      const nm = [...s.members];
      nm[mIdx] = {
        ...member,
        rescheduleCount: member.rescheduleCount + 1,
        lastRescheduleDate: todayStr,
      };
      set({ members: nm });
    }
    const now = new Date().toISOString();
    const next = [...s.bookings];
    next[idx] = {
      ...before,
      status: "rescheduled",
      rescheduleToDate: newDate,
      processRemark: remark,
      updatedAt: now,
    };
    set({ bookings: next });
    pushLog(get(), bookingId, "reschedule", before, next[idx], remark);
    get().pushToast("success", `已延期至 ${newDate}`);
    debouncedSave(get());
    return true;
  },

  refundBooking(bookingId, remark) {
    const s = get();
    const idx = s.bookings.findIndex((b) => b.id === bookingId);
    if (idx < 0) return;
    const before = { ...s.bookings[idx] };
    const totalMin = minutesBetween(before.startTime, before.endTime);
    const { refundAmount } = calculateRefund(before.elapsedMinutes, totalMin, before.paidAmount);
    const now = new Date().toISOString();
    const next = [...s.bookings];
    next[idx] = {
      ...before,
      status: "refunded",
      refundAmount,
      processRemark: remark,
      updatedAt: now,
    };
    set({ bookings: next });
    pushLog(get(), bookingId, "refund", before, next[idx], remark);
    if (before.coachId) {
      get().addCompensation({
        bookingId,
        coachId: before.coachId,
        coachCompensation: Math.round(before.paidAmount * 0.3 * 100) / 100,
        compensationPlan: "雨天停场补偿（30%课时费）",
        operatorRole: get().currentRole,
        operatorName: get().currentUser,
        approverId: null,
      });
    }
    get().pushToast("success", `退款 ¥${refundAmount.toFixed(2)} 已记录`);
    debouncedSave(get());
  },

  revertBooking(bookingId) {
    const s = get();
    const idx = s.bookings.findIndex((b) => b.id === bookingId);
    if (idx < 0) return;
    const before = { ...s.bookings[idx] };
    const now = new Date().toISOString();
    const next = [...s.bookings];
    next[idx] = {
      ...before,
      status: "normal",
      switchToCourtId: null,
      rescheduleToDate: null,
      refundAmount: 0,
      updatedAt: now,
    };
    set({ bookings: next });
    pushLog(get(), bookingId, "create", before, next[idx], "恢复订单");
    get().pushToast("info", "订单已恢复为正常状态");
    debouncedSave(get());
  },

  addCompensation(c) {
    const comp: Compensation = {
      ...c,
      id: genId("cmp"),
      createdAt: new Date().toISOString(),
    };
    set({ compensations: [...get().compensations, comp] });
    debouncedSave(get());
  },

  updateWeather(w) {
    const s = get();
    set({ weatherNote: { ...s.weatherNote, ...w, updatedAt: new Date().toISOString() } });
    debouncedSave(get());
  },

  updateMember(m) {
    const s = get();
    const idx = s.members.findIndex((x) => x.id === m.id);
    if (idx < 0) return;
    const next = [...s.members];
    next[idx] = { ...next[idx], ...m };
    set({ members: next });
    debouncedSave(get());
  },

  resetAll() {
    const seed = clearAllState();
    set({
      ...seed,
      selectedBookingIds: [],
      drawerBookingId: null,
      printOpen: false,
      stopModalOpen: false,
      toasts: [],
      formDraft: null,
    });
    get().pushToast("success", "已重置为初始数据");
  },

  getLogsForBooking(bookingId) {
    return get()
      .changeLogs.filter((l) => l.bookingId === bookingId)
      .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  },

  getCompensationsForBooking(bookingId) {
    return get().compensations.filter((c) => c.bookingId === bookingId);
  },
}));

export { genId };
