import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Seat,
  Locker,
  Reservation,
  Violation,
  LostItem,
  Clearance,
  HourlySnapshot,
  User,
  ViolationType,
  LostItemType,
  Zone,
} from '@/types';
import {
  generateSeats,
  generateLockers,
  generateViolations,
  generateLostItems,
  generateClearance,
  generateHourlySnapshots,
  generateRuntimeSeats,
  generateRuntimeLockers,
} from '@/data/seed';
import { genId, todayStr, dayjs } from '@/utils';

export interface Toast {
  id: string;
  type: 'info' | 'success' | 'warn' | 'error';
  title: string;
  message?: string;
}

interface AppState {
  _initialized: boolean;
  seats: Seat[];
  lockers: Locker[];
  reservations: Reservation[];
  violations: Violation[];
  lostItems: LostItem[];
  clearances: Clearance[];
  snapshots: HourlySnapshot[];
  currentUser: User | null;
  currentClearance: Clearance | null;
  toasts: Toast[];

  init: () => void;
  resetAll: () => void;

  setCurrentUser: (u: User | null) => void;

  pushToast: (t: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;

  reserveSeat: (input: {
    seatId: string;
    studentId: string;
    studentName: string;
    studentPhone: string;
  }) => { ok: boolean; error?: string; reservation?: Reservation };

  cancelReservation: (reservationId: string) => void;

  checkIn: (reservationId: string) => void;

  checkOut: (seatId: string) => void;

  markTempAway: (seatId: string) => void;

  extendTempAway: (seatId: string) => { ok: boolean; error?: string };

  returnFromTempAway: (seatId: string) => void;

  forceReleaseSeat: (seatId: string, reason: string, operator: string) => void;

  processTick: (nowTs: number) => { expiredReservations: string[]; expiredTempAway: string[] };

  swapLocker: (seatId: string, newLockerId: string) => { ok: boolean; error?: string };

  addViolation: (v: Omit<Violation, 'id' | 'occurredAt' | 'handled'>) => Violation;

  markViolationHandled: (id: string, handlerName: string) => void;

  startClearance: (operatorName: string) => void;

  checkSeatInClearance: (seatId: string) => void;

  addLostItem: (input: {
    seatId: string;
    seatCode: string;
    type: LostItemType;
    description: string;
  }) => LostItem;

  completeClearance: () => void;

  markLostItemClaimed: (id: string, claimedBy: string) => void;

  recordSnapshot: () => void;

  getAvailableLockers: (zone: Zone) => Locker[];

  getActiveReservationByStudent: (studentId: string) => Reservation | undefined;

  getActiveSeatByStudent: (studentId: string) => Seat | undefined;
}

function createFreshState(): Partial<AppState> {
  const baseSeats = generateSeats();
  const baseLockers = generateLockers();
  const seats = generateRuntimeSeats(baseSeats);
  const lockers = generateRuntimeLockers(baseLockers, seats);
  const violations = generateViolations(seats);
  const clearance0 = generateClearance();
  const lostItems = generateLostItems(seats, clearance0);
  const snapshots = generateHourlySnapshots(7);
  const reservations: Reservation[] = seats
    .filter((s) => s.status !== 'available')
    .map((s) => {
      const locker = lockers.find((l) => l.id === s.lockerId);
      const status: Reservation['status'] =
        s.status === 'reserved'
          ? 'pending_checkin'
          : s.status === 'violation'
            ? 'violation'
            : 'checked_in';
      return {
        id: genId('res'),
        seatId: s.id,
        seatCode: s.code,
        lockerId: locker?.id ?? '',
        lockerCode: locker?.code ?? '',
        studentId: s.studentId!,
        studentName: s.studentName!,
        studentPhone: '138****' + String(Math.floor(1000 + Math.random() * 8999)),
        status,
        reservedAt: s.checkInAt
          ? s.checkInAt - 1000 * 60 * 8
          : (s.reservationExpireAt ?? dayjs().valueOf()) - 1000 * 60 * 25,
        reservationExpireAt: s.reservationExpireAt ?? dayjs().add(30, 'minute').valueOf(),
        checkInAt: s.checkInAt,
        tempAwayCount: s.tempAwayExtensionsLeft !== undefined ? 2 - s.tempAwayExtensionsLeft : 0,
        totalMinutes: s.checkInAt
          ? Math.floor((dayjs().valueOf() - s.checkInAt) / 60000)
          : 0,
      };
    });
  return {
    seats,
    lockers,
    reservations,
    violations,
    lostItems,
    clearances: [clearance0],
    snapshots,
  };
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      _initialized: false,
      seats: [],
      lockers: [],
      reservations: [],
      violations: [],
      lostItems: [],
      clearances: [],
      snapshots: [],
      currentUser: null,
      currentClearance: null,
      toasts: [],

      init: () => {
        const s = get();
        if (s._initialized) return;
        if (s.seats.length === 0) {
          const fresh = createFreshState();
          set({ ...fresh, _initialized: true });
        } else {
          set({ _initialized: true });
        }
      },

      resetAll: () => {
        const fresh = createFreshState();
        set({
          ...fresh,
          _initialized: true,
          currentUser: null,
          currentClearance: null,
          toasts: [],
        });
      },

      setCurrentUser: (u) => set({ currentUser: u }),

      pushToast: (t) => {
        const toast: Toast = { id: genId('toast'), ...t };
        set((s) => ({ toasts: [...s.toasts, toast] }));
        setTimeout(() => {
          get().dismissToast(toast.id);
        }, 3600);
      },

      dismissToast: (id) =>
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

      reserveSeat: ({ seatId, studentId, studentName, studentPhone }) => {
        const s = get();
        const existingSeat = s.getActiveSeatByStudent(studentId);
        if (existingSeat) {
          return { ok: false, error: `您已经占用座位 ${existingSeat.code}，不能同时预约多个座位` };
        }
        const seat = s.seats.find((x) => x.id === seatId);
        if (!seat || seat.status !== 'available') {
          return { ok: false, error: '该座位当前不可预约' };
        }
        const availLockers = s.getAvailableLockers(seat.zone);
        if (availLockers.length === 0) {
          return { ok: false, error: `${seat.zone}区储物柜已满，无法预约` };
        }
        const locker = availLockers[0];
        const now = dayjs().valueOf();
        const expire = now + 30 * 60 * 1000;
        const reservation: Reservation = {
          id: genId('res'),
          seatId,
          seatCode: seat.code,
          lockerId: locker.id,
          lockerCode: locker.code,
          studentId,
          studentName,
          studentPhone,
          status: 'pending_checkin',
          reservedAt: now,
          reservationExpireAt: expire,
          tempAwayCount: 0,
          totalMinutes: 0,
        };
        set((st) => ({
          seats: st.seats.map((x) =>
            x.id === seatId
              ? {
                  ...x,
                  status: 'reserved',
                  studentId,
                  studentName,
                  lockerId: locker.id,
                  reservationExpireAt: expire,
                }
              : x,
          ),
          lockers: st.lockers.map((l) =>
            l.id === locker.id
              ? { ...l, status: 'in_use', seatId, studentId }
              : l,
          ),
          reservations: [...st.reservations, reservation],
        }));
        s.pushToast({ type: 'success', title: '预约成功', message: `座位 ${seat.code}，柜号 ${locker.code}，请30分钟内签到` });
        return { ok: true, reservation };
      },

      cancelReservation: (reservationId) => {
        const s = get();
        const res = s.reservations.find((r) => r.id === reservationId);
        if (!res) return;
        set((st) => ({
          seats: st.seats.map((x) =>
            x.id === res.seatId
              ? {
                  ...x,
                  status: 'available',
                  studentId: undefined,
                  studentName: undefined,
                  lockerId: undefined,
                  reservationExpireAt: undefined,
                }
              : x,
          ),
          lockers: st.lockers.map((l) =>
            l.id === res.lockerId
              ? { ...l, status: 'available', seatId: undefined, studentId: undefined }
              : l,
          ),
          reservations: st.reservations.map((r) =>
            r.id === reservationId ? { ...r, status: 'cancelled' } : r,
          ),
        }));
      },

      checkIn: (reservationId) => {
        const s = get();
        const res = s.reservations.find((r) => r.id === reservationId);
        if (!res) return;
        const now = dayjs().valueOf();
        set((st) => ({
          seats: st.seats.map((x) =>
            x.id === res.seatId
              ? { ...x, status: 'in_use', checkInAt: now, reservationExpireAt: undefined }
              : x,
          ),
          reservations: st.reservations.map((r) =>
            r.id === reservationId ? { ...r, status: 'checked_in', checkInAt: now } : r,
          ),
        }));
        s.pushToast({ type: 'success', title: '签到成功', message: `${res.studentName} · 座位 ${res.seatCode}` });
      },

      checkOut: (seatId) => {
        const s = get();
        const seat = s.seats.find((x) => x.id === seatId);
        if (!seat) return;
        const res = s.reservations.find(
          (r) => r.seatId === seatId && (r.status === 'checked_in' || r.status === 'violation'),
        );
        const now = dayjs().valueOf();
        const totalMinutes = seat.checkInAt ? Math.floor((now - seat.checkInAt) / 60000) : 0;
        set((st) => ({
          seats: st.seats.map((x) =>
            x.id === seatId
              ? {
                  ...x,
                  status: 'available',
                  studentId: undefined,
                  studentName: undefined,
                  lockerId: undefined,
                  reservationExpireAt: undefined,
                  checkInAt: undefined,
                  tempAwayAt: undefined,
                  tempAwayExpireAt: undefined,
                  tempAwayExtensionsLeft: undefined,
                }
              : x,
          ),
          lockers: seat.lockerId
            ? st.lockers.map((l) =>
                l.id === seat.lockerId
                  ? { ...l, status: 'available', seatId: undefined, studentId: undefined }
                  : l,
              )
            : st.lockers,
          reservations: res
            ? st.reservations.map((r) =>
                r.id === res.id
                  ? { ...r, status: 'completed', checkOutAt: now, totalMinutes }
                  : r,
              )
            : st.reservations,
        }));
        if (res) {
          s.pushToast({ type: 'success', title: '离座完成', message: `座位 ${seat.code} 已释放，累计使用 ${totalMinutes} 分钟` });
        }
      },

      markTempAway: (seatId) => {
        const s = get();
        const seat = s.seats.find((x) => x.id === seatId);
        if (!seat || seat.status !== 'in_use') return;
        const now = dayjs().valueOf();
        set((st) => ({
          seats: st.seats.map((x) =>
            x.id === seatId
              ? {
                  ...x,
                  status: 'temporarily_away',
                  tempAwayAt: now,
                  tempAwayExpireAt: now + 30 * 60 * 1000,
                  tempAwayExtensionsLeft: 2,
                }
              : x,
          ),
        }));
        s.pushToast({ type: 'info', title: '已记录临时离座', message: '请在30分钟内返回，可续时2次' });
      },

      extendTempAway: (seatId) => {
        const s = get();
        const seat = s.seats.find((x) => x.id === seatId);
        if (!seat || seat.status !== 'temporarily_away') {
          return { ok: false, error: '当前状态不可续时' };
        }
        if (!seat.tempAwayExtensionsLeft || seat.tempAwayExtensionsLeft <= 0) {
          return { ok: false, error: '续时次数已用完' };
        }
        set((st) => ({
          seats: st.seats.map((x) =>
            x.id === seatId
              ? {
                  ...x,
                  tempAwayExpireAt: (x.tempAwayExpireAt ?? dayjs().valueOf()) + 30 * 60 * 1000,
                  tempAwayExtensionsLeft: (x.tempAwayExtensionsLeft ?? 0) - 1,
                }
              : x,
          ),
          reservations: st.reservations.map((r) =>
            r.seatId === seatId && r.status === 'checked_in'
              ? { ...r, tempAwayCount: r.tempAwayCount + 1 }
              : r,
          ),
        }));
        s.pushToast({ type: 'success', title: '续时成功', message: '已延长30分钟' });
        return { ok: true };
      },

      returnFromTempAway: (seatId) => {
        const s = get();
        set((st) => ({
          seats: st.seats.map((x) =>
            x.id === seatId
              ? {
                  ...x,
                  status: 'in_use',
                  tempAwayAt: undefined,
                  tempAwayExpireAt: undefined,
                  tempAwayExtensionsLeft: undefined,
                }
              : x,
          ),
        }));
        s.pushToast({ type: 'info', title: '欢迎回来', message: '座位已恢复使用中' });
      },

      forceReleaseSeat: (seatId, reason, operator) => {
        const s = get();
        const seat = s.seats.find((x) => x.id === seatId);
        if (!seat) return;
        s.addViolation({
          type: 'forced_release',
          seatId,
          seatCode: seat.code,
          studentId: seat.studentId,
          studentName: seat.studentName,
          description: `${operator} 强制释放座位：${reason}`,
        });
        s.checkOut(seatId);
        const lastViol = s.violations[s.violations.length - 1];
        if (lastViol) s.markViolationHandled(lastViol.id, operator);
      },

      processTick: (nowTs) => {
        const s = get();
        const expiredReservations: string[] = [];
        const expiredTempAway: string[] = [];
        const newViolations: Violation[] = [];
        const updatedSeats = s.seats.map((seat) => {
          if (seat.status === 'reserved' && seat.reservationExpireAt && seat.reservationExpireAt <= nowTs) {
            expiredReservations.push(seat.id);
            newViolations.push({
              id: genId('vio'),
              type: 'no_show',
              seatId: seat.id,
              seatCode: seat.code,
              studentId: seat.studentId,
              studentName: seat.studentName,
              occurredAt: seat.reservationExpireAt,
              description: '预约座位30分钟内未签到，系统自动释放并记录违规',
              handled: false,
            });
            return {
              ...seat,
              status: 'available' as const,
              studentId: undefined,
              studentName: undefined,
              lockerId: undefined,
              reservationExpireAt: undefined,
            };
          }
          if (seat.status === 'temporarily_away' && seat.tempAwayExpireAt && seat.tempAwayExpireAt <= nowTs) {
            expiredTempAway.push(seat.id);
            newViolations.push({
              id: genId('vio'),
              type: 'over_temp_away',
              seatId: seat.id,
              seatCode: seat.code,
              studentId: seat.studentId,
              studentName: seat.studentName,
              occurredAt: seat.tempAwayExpireAt,
              description: '临时离座超过时限，已标记违规待前台处理',
              handled: false,
            });
            return { ...seat, status: 'violation' as const };
          }
          return seat;
        });
        const expiredLockerIds = updatedSeats
          .filter((seat, i) => {
            const prev = s.seats[i];
            return prev.status !== 'available' && seat.status === 'available';
          })
          .map((x) => x.lockerId)
          .filter(Boolean);
        const updatedLockers = s.lockers.map((l) =>
          expiredLockerIds.includes(l.id)
            ? { ...l, status: 'available' as const, seatId: undefined, studentId: undefined }
            : l,
        );
        const updatedReservations = s.reservations.map((r) => {
          if (r.status === 'pending_checkin' && expiredReservations.includes(r.seatId)) {
            return { ...r, status: 'violation' as const };
          }
          return r;
        });
        if (newViolations.length > 0) {
          set({
            seats: updatedSeats,
            lockers: updatedLockers,
            reservations: updatedReservations,
            violations: [...s.violations, ...newViolations],
          });
          for (const v of newViolations) {
            s.pushToast({
              type: 'warn',
              title: '违规提醒',
              message: `座位 ${v.seatCode} ${v.type === 'no_show' ? '未签到' : '离座超时'}`,
            });
          }
        }
        return { expiredReservations, expiredTempAway };
      },

      swapLocker: (seatId, newLockerId) => {
        const s = get();
        const seat = s.seats.find((x) => x.id === seatId);
        const newLocker = s.lockers.find((l) => l.id === newLockerId);
        if (!seat || !newLocker) return { ok: false, error: '座位或储物柜不存在' };
        if (newLocker.status !== 'available') return { ok: false, error: '该储物柜已占用' };
        if (newLocker.zone !== seat.zone) return { ok: false, error: '储物柜必须与座位同区' };
        const oldLockerId = seat.lockerId;
        set((st) => ({
          seats: st.seats.map((x) => (x.id === seatId ? { ...x, lockerId: newLockerId } : x)),
          lockers: st.lockers.map((l) => {
            if (l.id === newLockerId)
              return { ...l, status: 'in_use' as const, seatId, studentId: seat.studentId };
            if (l.id === oldLockerId)
              return { ...l, status: 'available' as const, seatId: undefined, studentId: undefined };
            return l;
          }),
          reservations: st.reservations.map((r) =>
            r.seatId === seatId && (r.status === 'pending_checkin' || r.status === 'checked_in')
              ? { ...r, lockerId: newLockerId, lockerCode: newLocker.code }
              : r,
          ),
        }));
        s.pushToast({ type: 'success', title: '储物柜已更换', message: `新柜号 ${newLocker.code}` });
        return { ok: true };
      },

      addViolation: (v) => {
        const viol: Violation = {
          id: genId('vio'),
          occurredAt: dayjs().valueOf(),
          handled: false,
          ...v,
        };
        set((s) => ({ violations: [...s.violations, viol] }));
        return viol;
      },

      markViolationHandled: (id, handlerName) =>
        set((s) => ({
          violations: s.violations.map((v) =>
            v.id === id
              ? { ...v, handled: true, handledBy: handlerName, handledAt: dayjs().valueOf() }
              : v,
          ),
        })),

      startClearance: (operatorName) => {
        const today = todayStr();
        const exist = get().clearances.find((c) => c.date === today);
        if (exist) {
          set({
            currentClearance: {
              ...exist,
              startedAt: exist.startedAt || dayjs().valueOf(),
              operatorName: exist.operatorName || operatorName,
              seatsChecked: exist.seatsChecked,
            },
          });
        } else {
          set({
            currentClearance: {
              id: genId('clr'),
              date: today,
              startedAt: dayjs().valueOf(),
              operatorName,
              seatsChecked: [],
              lostItemsFound: 0,
              seatsReleased: 0,
            },
          });
        }
        get().pushToast({ type: 'info', title: '清场模式已开启', message: `操作人：${operatorName}` });
      },

      checkSeatInClearance: (seatId) =>
        set((s) => {
          if (!s.currentClearance) return {};
          if (s.currentClearance.seatsChecked.includes(seatId)) return {};
          return {
            currentClearance: {
              ...s.currentClearance,
              seatsChecked: [...s.currentClearance.seatsChecked, seatId],
            },
          };
        }),

      addLostItem: (input) => {
        const s = get();
        if (!s.currentClearance) throw new Error('未开始清场');
        const item: LostItem = {
          id: genId('item'),
          foundAt: dayjs().valueOf(),
          claimed: false,
          clearanceId: s.currentClearance.id,
          ...input,
        };
        set({
          lostItems: [...s.lostItems, item],
          currentClearance: {
            ...s.currentClearance,
            lostItemsFound: s.currentClearance.lostItemsFound + 1,
          },
        });
        return item;
      },

      completeClearance: () => {
        const s = get();
        if (!s.currentClearance) return;
        const occupied = s.seats.filter(
          (x) => x.status === 'in_use' || x.status === 'temporarily_away' || x.status === 'violation',
        );
        let released = 0;
        for (const seat of occupied) {
          s.checkOut(seat.id);
          released++;
        }
        const completed: Clearance = {
          ...s.currentClearance,
          completedAt: dayjs().valueOf(),
          seatsReleased: released,
        };
        const existed = s.clearances.some((c) => c.id === completed.id);
        set({
          clearances: existed
            ? s.clearances.map((c) => (c.id === completed.id ? completed : c))
            : [...s.clearances, completed],
          currentClearance: null,
        });
        s.pushToast({
          type: 'success',
          title: '清场完成',
          message: `共检查 ${completed.seatsChecked.length} 座，释放 ${released} 座，遗留物 ${completed.lostItemsFound} 件`,
        });
      },

      markLostItemClaimed: (id, claimedBy) =>
        set((s) => ({
          lostItems: s.lostItems.map((it) =>
            it.id === id
              ? { ...it, claimed: true, claimedBy, claimedAt: dayjs().valueOf() }
              : it,
          ),
        })),

      recordSnapshot: () => {
        const s = get();
        const total = s.seats.length;
        const occupied = s.seats.filter(
          (x) => x.status === 'in_use' || x.status === 'temporarily_away',
        ).length;
        const temp = s.seats.filter((x) => x.status === 'temporarily_away').length;
        const viol = s.seats.filter((x) => x.status === 'violation').length;
        const now = dayjs();
        const snap: HourlySnapshot = {
          id: genId('snap'),
          date: now.format('YYYY-MM-DD'),
          hour: now.hour(),
          totalSeats: total,
          occupiedSeats: occupied,
          tempAwaySeats: temp,
          violationCount: viol,
          recordedAt: now.valueOf(),
        };
        set({ snapshots: [...s.snapshots, snap] });
      },

      getAvailableLockers: (zone) =>
        get().lockers.filter((l) => l.zone === zone && l.status === 'available'),

      getActiveReservationByStudent: (studentId) =>
        get().reservations.find(
          (r) =>
            r.studentId === studentId &&
            (r.status === 'pending_checkin' || r.status === 'checked_in' || r.status === 'violation'),
        ),

      getActiveSeatByStudent: (studentId) =>
        get().seats.find(
          (s) =>
            s.studentId === studentId &&
            (s.status === 'reserved' ||
              s.status === 'in_use' ||
              s.status === 'temporarily_away' ||
              s.status === 'violation'),
        ),
    }),
    {
      name: 'study-room-app-state-v1',
      partialize: (s) => ({
        _initialized: s._initialized,
        seats: s.seats,
        lockers: s.lockers,
        reservations: s.reservations,
        violations: s.violations,
        lostItems: s.lostItems,
        clearances: s.clearances,
        snapshots: s.snapshots,
        currentUser: s.currentUser,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state._initialized = true;
      },
    },
  ),
);
