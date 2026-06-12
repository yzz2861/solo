import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Machine,
  Driver,
  Reservation,
  Maintenance,
  ChangeLog,
  ReservationStatus,
  WorkType,
  MachineType,
} from '../types';
import {
  format,
  addDays,
  parse,
  isWithinInterval,
  parseISO,
  addMinutes,
  isSameDay,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';

const genId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const todayStr = () => format(new Date(), 'yyyy-MM-dd');
const tomorrowStr = () => format(addDays(new Date(), 1), 'yyyy-MM-dd');

const initialMachines: Machine[] = [
  { id: 'm1', name: '东方红-001', type: '拖拉机', status: '正常', plateNumber: '豫A·12345' },
  { id: 'm2', name: '东方红-002', type: '拖拉机', status: '正常', plateNumber: '豫A·12346' },
  { id: 'm3', name: '久保田-001', type: '插秧机', status: '正常', plateNumber: '豫A·12347' },
  { id: 'm4', name: '久保田-002', type: '插秧机', status: '正常', plateNumber: '豫A·12348' },
  { id: 'm5', name: '雷沃-001', type: '收割机', status: '正常', plateNumber: '豫A·12349' },
];

const initialDrivers: Driver[] = [
  { id: 'd1', name: '张师傅', phone: '13811111001', machineIds: ['m1', 'm2'], active: true },
  { id: 'd2', name: '李师傅', phone: '13811111002', machineIds: ['m3', 'm4'], active: true },
  { id: 'd3', name: '王师傅', phone: '13811111003', machineIds: ['m1', 'm5'], active: true },
  { id: 'd4', name: '赵师傅', phone: '13811111004', machineIds: ['m2', 'm3'], active: true },
];

const buildSampleReservations = (): Reservation[] => {
  const today = todayStr();
  const tomorrow = tomorrowStr();
  return [
    {
      id: genId(),
      farmerId: 'f1', farmerName: '王大柱', farmerPhone: '13922222001', farmerVillage: '东河村一组',
      plotId: 'p1', plotName: '东河湾3号地', plotAcres: 12, plotLocation: '东河村东500米',
      machineId: 'm1', machineName: '东方红-001', machineType: '拖拉机',
      driverId: 'd1', driverName: '张师傅', driverPhone: '13811111001',
      workDate: today, startTime: '07:30', durationHours: 4, workType: '犁地',
      estimatedFuel: 180, status: '待作业', sequence: 1,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    },
    {
      id: genId(),
      farmerId: 'f1', farmerName: '王大柱', farmerPhone: '13922222001', farmerVillage: '东河村一组',
      plotId: 'p1', plotName: '东河湾3号地', plotAcres: 12, plotLocation: '东河村东500米',
      machineId: 'm1', machineName: '东方红-001', machineType: '拖拉机',
      driverId: 'd1', driverName: '张师傅', driverPhone: '13811111001',
      workDate: today, startTime: '13:00', durationHours: 3, workType: '耙地',
      estimatedFuel: 120, status: '待作业', sequence: 2,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    },
    {
      id: genId(),
      farmerId: 'f2', farmerName: '刘二强', farmerPhone: '13922222002', farmerVillage: '东河村二组',
      plotId: 'p2', plotName: '南岗上2号地', plotAcres: 8, plotLocation: '村南一公里南岗',
      machineId: 'm3', machineName: '久保田-001', machineType: '插秧机',
      driverId: 'd2', driverName: '李师傅', driverPhone: '13811111002',
      workDate: today, startTime: '08:00', durationHours: 5, workType: '插秧',
      estimatedFuel: 150, status: '待作业', sequence: 1,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    },
    {
      id: genId(),
      farmerId: 'f3', farmerName: '陈三贵', farmerPhone: '13922222003', farmerVillage: '西坡村一组',
      plotId: 'p3', plotName: '西坡洼5号地', plotAcres: 15, plotLocation: '西坡村西洼地',
      machineId: 'm2', machineName: '东方红-002', machineType: '拖拉机',
      driverId: 'd4', driverName: '赵师傅', driverPhone: '13811111004',
      workDate: tomorrow, startTime: '07:00', durationHours: 6, workType: '犁地',
      estimatedFuel: 280, status: '待作业', sequence: 1,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    },
    {
      id: genId(),
      farmerId: 'f2', farmerName: '刘二强', farmerPhone: '13922222002', farmerVillage: '东河村二组',
      plotId: 'p2', plotName: '南岗上2号地', plotAcres: 8, plotLocation: '村南一公里南岗',
      machineId: 'm2', machineName: '东方红-002', machineType: '拖拉机',
      driverId: 'd4', driverName: '赵师傅', driverPhone: '13811111004',
      workDate: tomorrow, startTime: '14:00', durationHours: 3, workType: '耙地',
      estimatedFuel: 100, status: '待作业', sequence: 2,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    },
  ];
};

const initialMaintenances: Maintenance[] = [];

interface AppState {
  machines: Machine[];
  drivers: Driver[];
  reservations: Reservation[];
  maintenances: Maintenance[];
  changeLogs: ChangeLog[];

  addReservation: (data: Omit<Reservation, 'id' | 'createdAt' | 'updatedAt' | 'sequence'> & { sequence?: number }) => { success: boolean; warnings: string[] };
  updateReservationStatus: (id: string, status: ReservationStatus, reason?: string) => void;
  rescheduleReservation: (id: string, newDate: string, newTime: string, reason: string) => void;
  cancelReservation: (id: string, reason: string) => void;
  changeDriver: (id: string, newDriverId: string, reason: string) => void;
  batchRescheduleRain: (dateStr: string) => number;

  addMaintenance: (m: Omit<Maintenance, 'id' | 'createdAt'>) => void;
  resolveMaintenance: (id: string) => void;

  isMachineUnderMaintenance: (machineId: string, dateStr: string) => boolean;
  getMaintenanceAt: (machineId: string, dateStr: string) => Maintenance | null;
  checkDuplicatePlot: (plotName: string, workDate: string, excludeId?: string) => Reservation[];
  checkDriverConflict: (driverId: string, workDate: string, startTime: string, durationHours: number, excludeId?: string) => Reservation | null;
  checkMachineConflict: (machineId: string, workDate: string, startTime: string, durationHours: number, excludeId?: string) => Reservation | null;

  getReservationsByDate: (dateStr: string) => Reservation[];
  getReservationsByDriver: (driverId: string, dateStr: string) => Reservation[];
  getReservationsByMachine: (machineId: string, dateStr: string) => Reservation[];

  addMachine: (m: Omit<Machine, 'id'>) => void;
  addDriver: (d: Omit<Driver, 'id'>) => void;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function hasTimeOverlap(
  start1: string, dur1: number, start2: string, dur2: number
): boolean {
  const s1 = timeToMinutes(start1);
  const e1 = s1 + Math.round(dur1 * 60);
  const s2 = timeToMinutes(start2);
  const e2 = s2 + Math.round(dur2 * 60);
  return s1 < e2 && s2 < e1;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      machines: initialMachines,
      drivers: initialDrivers,
      reservations: buildSampleReservations(),
      maintenances: initialMaintenances,
      changeLogs: [],

      addMachine: (m) => set((s) => ({ machines: [...s.machines, { ...m, id: genId() }] })),
      addDriver: (d) => set((s) => ({ drivers: [...s.drivers, { ...d, id: genId() }] })),

      isMachineUnderMaintenance: (machineId, dateStr) => {
        const { maintenances } = get();
        return maintenances.some((m) => {
          if (m.machineId !== machineId || m.status !== '维修中') return false;
          try {
            return isWithinInterval(parseISO(dateStr), {
              start: parseISO(m.startDate),
              end: parseISO(m.endDate),
            });
          } catch {
            return false;
          }
        });
      },

      getMaintenanceAt: (machineId, dateStr) => {
        const { maintenances } = get();
        return maintenances.find((m) => {
          if (m.machineId !== machineId || m.status !== '维修中') return false;
          try {
            return isWithinInterval(parseISO(dateStr), {
              start: parseISO(m.startDate),
              end: parseISO(m.endDate),
            });
          } catch {
            return false;
          }
        }) || null;
      },

      checkDuplicatePlot: (plotName, workDate, excludeId) => {
        return get().reservations.filter(
          (r) =>
            r.plotName === plotName &&
            r.workDate === workDate &&
            r.status !== '已取消' &&
            r.id !== excludeId
        );
      },

      checkDriverConflict: (driverId, workDate, startTime, durationHours, excludeId) => {
        return get().reservations.find(
          (r) =>
            r.driverId === driverId &&
            r.workDate === workDate &&
            r.status !== '已取消' &&
            r.id !== excludeId &&
            hasTimeOverlap(r.startTime, r.durationHours, startTime, durationHours)
        ) || null;
      },

      checkMachineConflict: (machineId, workDate, startTime, durationHours, excludeId) => {
        return get().reservations.find(
          (r) =>
            r.machineId === machineId &&
            r.workDate === workDate &&
            r.status !== '已取消' &&
            r.id !== excludeId &&
            hasTimeOverlap(r.startTime, r.durationHours, startTime, durationHours)
        ) || null;
      },

      addReservation: (data) => {
        const warnings: string[] = [];
        const { reservations, changeLogs } = get();

        const dups = get().checkDuplicatePlot(data.plotName, data.workDate);
        if (dups.length > 0) {
          warnings.push(`该地块(${data.plotName})在${data.workDate}已有预约，请确认是否重复`);
        }

        if (get().isMachineUnderMaintenance(data.machineId, data.workDate)) {
          return { success: false, warnings: ['所选机器在该日期处于维修中，无法预约'] };
        }

        const driverConflict = get().checkDriverConflict(
          data.driverId, data.workDate, data.startTime, data.durationHours
        );
        if (driverConflict) {
          warnings.push(`司机(${data.driverName})在此时段与「${driverConflict.farmerName}-${driverConflict.plotName}」时间冲突`);
        }

        const machineConflict = get().checkMachineConflict(
          data.machineId, data.workDate, data.startTime, data.durationHours
        );
        if (machineConflict) {
          warnings.push(`机器(${data.machineName})在此时段与「${machineConflict.farmerName}-${machineConflict.plotName}」时间冲突`);
        }

        const sameDaySameDriver = reservations.filter(
          (r) => r.driverId === data.driverId && r.workDate === data.workDate && r.status !== '已取消'
        );
        const sequence = data.sequence ?? (sameDaySameDriver.length + 1);

        const newRes: Reservation = {
          ...data,
          id: genId(),
          sequence,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const log: ChangeLog = {
          id: genId(),
          reservationId: newRes.id,
          changeType: '状态变更',
          oldValue: '(新建)',
          newValue: '待作业',
          reason: '新建预约',
          createdAt: new Date().toISOString(),
        };

        set({
          reservations: [...reservations, newRes],
          changeLogs: [...changeLogs, log],
        });

        return { success: true, warnings };
      },

      updateReservationStatus: (id, status, reason = '状态更新') => {
        const { reservations, changeLogs } = get();
        const old = reservations.find((r) => r.id === id);
        if (!old) return;
        set({
          reservations: reservations.map((r) =>
            r.id === id ? { ...r, status, updatedAt: new Date().toISOString() } : r
          ),
          changeLogs: [
            ...changeLogs,
            {
              id: genId(),
              reservationId: id,
              changeType: '状态变更',
              oldValue: old.status,
              newValue: status,
              reason,
              createdAt: new Date().toISOString(),
            },
          ],
        });
      },

      rescheduleReservation: (id, newDate, newTime, reason) => {
        const { reservations, changeLogs } = get();
        const old = reservations.find((r) => r.id === id);
        if (!old) return;
        const newReservations = reservations.map((r) =>
          r.id === id
            ? {
                ...r,
                workDate: newDate,
                startTime: newTime,
                rescheduleFrom: `${old.workDate} ${old.startTime}`,
                updatedAt: new Date().toISOString(),
              }
            : r
        );
        set({
          reservations: newReservations,
          changeLogs: [
            ...changeLogs,
            {
              id: genId(),
              reservationId: id,
              changeType: '改期',
              oldValue: `${old.workDate} ${old.startTime}`,
              newValue: `${newDate} ${newTime}`,
              reason,
              createdAt: new Date().toISOString(),
            },
          ],
        });
      },

      cancelReservation: (id, reason) => {
        const { reservations, changeLogs } = get();
        const old = reservations.find((r) => r.id === id);
        if (!old) return;
        set({
          reservations: reservations.map((r) =>
            r.id === id
              ? { ...r, status: '已取消', cancelReason: reason, updatedAt: new Date().toISOString() }
              : r
          ),
          changeLogs: [
            ...changeLogs,
            {
              id: genId(),
              reservationId: id,
              changeType: '取消',
              oldValue: old.status,
              newValue: '已取消',
              reason,
              createdAt: new Date().toISOString(),
            },
          ],
        });
      },

      changeDriver: (id, newDriverId, reason) => {
        const { reservations, drivers, changeLogs } = get();
        const old = reservations.find((r) => r.id === id);
        const newDriver = drivers.find((d) => d.id === newDriverId);
        if (!old || !newDriver) return;
        set({
          reservations: reservations.map((r) =>
            r.id === id
              ? {
                  ...r,
                  driverId: newDriverId,
                  driverName: newDriver.name,
                  driverPhone: newDriver.phone,
                  driverChangeReason: reason,
                  updatedAt: new Date().toISOString(),
                }
              : r
          ),
          changeLogs: [
            ...changeLogs,
            {
              id: genId(),
              reservationId: id,
              changeType: '改派司机',
              oldValue: old.driverName,
              newValue: newDriver.name,
              reason,
              createdAt: new Date().toISOString(),
            },
          ],
        });
      },

      batchRescheduleRain: (dateStr) => {
        const { reservations, changeLogs } = get();
        const nextDate = format(addDays(parseISO(dateStr), 1), 'yyyy-MM-dd');
        let count = 0;
        const newLogs: ChangeLog[] = [];
        const updated = reservations.map((r) => {
          if (r.workDate === dateStr && r.status !== '已取消' && r.status !== '已完成') {
            count++;
            newLogs.push({
              id: genId(),
              reservationId: r.id,
              changeType: '批量改期-雨天',
              oldValue: `${r.workDate} ${r.startTime}`,
              newValue: `${nextDate} ${r.startTime}`,
              reason: '雨天顺延',
              createdAt: new Date().toISOString(),
            });
            return {
              ...r,
              workDate: nextDate,
              rescheduleFrom: `${r.workDate} ${r.startTime}`,
              updatedAt: new Date().toISOString(),
            };
          }
          return r;
        });
        set({ reservations: updated, changeLogs: [...changeLogs, ...newLogs] });
        return count;
      },

      addMaintenance: (m) => {
        set((s) => ({ maintenances: [...s.maintenances, { ...m, id: genId(), createdAt: new Date().toISOString() }] }));
      },

      resolveMaintenance: (id) => {
        set((s) => ({
          maintenances: s.maintenances.map((m) => (m.id === id ? { ...m, status: '已完成' } : m)),
        }));
      },

      getReservationsByDate: (dateStr) => {
        return get()
          .reservations.filter((r) => r.workDate === dateStr)
          .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
      },

      getReservationsByDriver: (driverId, dateStr) => {
        return get()
          .reservations.filter((r) => r.driverId === driverId && r.workDate === dateStr && r.status !== '已取消')
          .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
      },

      getReservationsByMachine: (machineId, dateStr) => {
        return get()
          .reservations.filter((r) => r.machineId === machineId && r.workDate === dateStr && r.status !== '已取消')
          .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
      },
    }),
    {
      name: 'farm-machine-reservation-store',
    }
  )
);

export { hasTimeOverlap, timeToMinutes, genId, todayStr, tomorrowStr };
export type { WorkType, MachineType };
