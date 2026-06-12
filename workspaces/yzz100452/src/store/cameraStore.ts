import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Equipment,
  Inspection,
  PriceChangeLog,
  PriceChangeRequest,
  Appointment,
  Settlement,
  EquipmentStatus,
  DefectGrade,
  AppointmentStatus,
} from '@/types';
import {
  seedEquipments,
  seedInspections,
  seedPriceChangeLogs,
  seedPriceChangeRequests,
  seedAppointments,
  seedSettlements,
} from '@/data/seed';

interface CameraState {
  equipments: Equipment[];
  inspections: Inspection[];
  priceChangeLogs: PriceChangeLog[];
  priceChangeRequests: PriceChangeRequest[];
  appointments: Appointment[];
  settlements: Settlement[];

  findBySerialNumber: (serialNumber: string, excludeId?: string) => Equipment | null;

  addEquipment: (data: Omit<Equipment, 'id' | 'createdAt'>) => Equipment;
  updateEquipment: (id: string, data: Partial<Equipment>) => Equipment | null;
  updateEquipmentStatus: (id: string, status: EquipmentStatus) => Equipment | null;
  updateEquipmentPrice: (
    id: string,
    newPrice: number,
    operatorId: string,
    operatorName: string,
    remark?: string,
  ) => Equipment | null;
  markEquipmentSold: (
    id: string,
    soldPrice: number,
    soldAt?: string,
  ) => Equipment | null;
  deleteEquipment: (id: string) => boolean;

  addInspection: (data: Omit<Inspection, 'id' | 'createdAt'>) => Inspection;
  updateInspection: (id: string, data: Partial<Inspection>) => Inspection | null;

  addPriceChangeLog: (
    data: Omit<PriceChangeLog, 'id' | 'createdAt'>,
  ) => PriceChangeLog;

  addPriceChangeRequest: (
    data: Omit<PriceChangeRequest, 'id' | 'createdAt' | 'status'>,
  ) => PriceChangeRequest;
  approvePriceChangeRequest: (
    id: string,
    approverId: string,
    approverName: string,
  ) => PriceChangeRequest | null;
  rejectPriceChangeRequest: (
    id: string,
    approverId: string,
    approverName: string,
    rejectReason: string,
  ) => PriceChangeRequest | null;

  addAppointment: (
    data: Omit<Appointment, 'id' | 'createdAt' | 'status'> & {
      status?: AppointmentStatus;
    },
  ) => Appointment;
  updateAppointment: (
    id: string,
    data: Partial<Appointment>,
  ) => Appointment | null;
  updateAppointmentStatus: (
    id: string,
    status: AppointmentStatus,
  ) => Appointment | null;
  confirmAppointment: (id: string) => Appointment | null;
  completeAppointment: (id: string) => Appointment | null;
  cancelAppointment: (id: string, note?: string) => Appointment | null;
  markAppointmentNoShow: (id: string, note?: string) => Appointment | null;

  addSettlement: (data: Omit<Settlement, 'id' | 'settledAt'>) => Settlement;

  setDefectGrade: (
    equipmentId: string,
    grade: DefectGrade,
    inspectorId: string,
    inspectorName: string,
  ) => Equipment | null;
}

const generateId = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const getNow = () => new Date().toISOString();

export const useCameraStore = create<CameraState>()(
  persist(
    (set, get) => ({
      equipments: seedEquipments,
      inspections: seedInspections,
      priceChangeLogs: seedPriceChangeLogs,
      priceChangeRequests: seedPriceChangeRequests,
      appointments: seedAppointments,
      settlements: seedSettlements,

      findBySerialNumber: (serialNumber: string, excludeId?: string) => {
        const { equipments } = get();
        return (
          equipments.find(
            (e) =>
              e.serialNumber === serialNumber &&
              (!excludeId || e.id !== excludeId),
          ) || null
        );
      },

      addEquipment: (data) => {
        const equipment: Equipment = {
          ...data,
          id: generateId('eq'),
          createdAt: getNow(),
        };
        set((state) => ({ equipments: [...state.equipments, equipment] }));

        if (data.currentPrice > 0) {
          get().addPriceChangeLog({
            equipmentId: equipment.id,
            oldPrice: 0,
            newPrice: data.currentPrice,
            operatorId: data.createdBy,
            operatorName: data.createdByName,
            changeType: 'create',
            remark: '入库定价',
          });
        }

        return equipment;
      },

      updateEquipment: (id, data) => {
        let updated: Equipment | null = null;
        set((state) => ({
          equipments: state.equipments.map((e) => {
            if (e.id === id) {
              updated = { ...e, ...data };
              return updated;
            }
            return e;
          }),
        }));
        return updated;
      },

      updateEquipmentStatus: (id, status) => {
        return get().updateEquipment(id, { status });
      },

      updateEquipmentPrice: (
        id,
        newPrice,
        operatorId,
        operatorName,
        remark,
      ) => {
        const equipment = get().equipments.find((e) => e.id === id);
        if (!equipment) return null;
        if (equipment.currentPrice === newPrice) return equipment;

        const updated = get().updateEquipment(id, { currentPrice: newPrice });

        if (updated) {
          get().addPriceChangeLog({
            equipmentId: id,
            oldPrice: equipment.currentPrice,
            newPrice,
            operatorId,
            operatorName,
            changeType: 'adjust',
            remark,
          });
        }

        return updated;
      },

      markEquipmentSold: (id, soldPrice, soldAt) => {
        const equipment = get().equipments.find((e) => e.id === id);
        if (!equipment) return null;

        const updateData: Partial<Equipment> = {
          status: 'sold',
          soldPrice,
          soldAt: soldAt || getNow(),
        };
        const updated = get().updateEquipment(id, updateData);

        if (updated) {
          get().addPriceChangeLog({
            equipmentId: id,
            oldPrice: equipment.currentPrice,
            newPrice: soldPrice,
            operatorId: 'system',
            operatorName: '系统',
            changeType: 'sale',
            remark: '成交价格',
          });
        }

        return updated;
      },

      deleteEquipment: (id) => {
        const exists = get().equipments.some((e) => e.id === id);
        if (!exists) return false;
        set((state) => ({
          equipments: state.equipments.filter((e) => e.id !== id),
        }));
        return true;
      },

      addInspection: (data) => {
        const inspection: Inspection = {
          ...data,
          id: generateId('ins'),
          createdAt: getNow(),
        };
        set((state) => ({
          inspections: [...state.inspections, inspection],
        }));

        get().updateEquipment(data.equipmentId, {
          inspectionId: inspection.id,
          defectGrade: data.defectGrade,
        });

        return inspection;
      },

      updateInspection: (id, data) => {
        let updated: Inspection | null = null;
        set((state) => ({
          inspections: state.inspections.map((i) => {
            if (i.id === id) {
              updated = { ...i, ...data };
              return updated;
            }
            return i;
          }),
        }));
        if (updated && data.defectGrade) {
          get().updateEquipment(updated.equipmentId, {
            defectGrade: data.defectGrade,
          });
        }
        return updated;
      },

      addPriceChangeLog: (data) => {
        const log: PriceChangeLog = {
          ...data,
          id: generateId('pcl'),
          createdAt: getNow(),
        };
        set((state) => ({
          priceChangeLogs: [...state.priceChangeLogs, log],
        }));
        return log;
      },

      addPriceChangeRequest: (data) => {
        const request: PriceChangeRequest = {
          ...data,
          id: generateId('pcr'),
          status: 'pending',
          createdAt: getNow(),
        };
        set((state) => ({
          priceChangeRequests: [...state.priceChangeRequests, request],
        }));
        return request;
      },

      approvePriceChangeRequest: (id, approverId, approverName) => {
        let updated: PriceChangeRequest | null = null;
        const now = getNow();
        set((state) => ({
          priceChangeRequests: state.priceChangeRequests.map((r) => {
            if (r.id === id && r.status === 'pending') {
              updated = {
                ...r,
                status: 'approved',
                approverId,
                approverName,
                approvedAt: now,
              };
              return updated;
            }
            return r;
          }),
        }));

        if (updated) {
          get().updateEquipmentPrice(
            updated.equipmentId,
            updated.newPrice,
            approverId,
            approverName,
            `调价审批通过 #${updated.id}`,
          );
        }
        return updated;
      },

      rejectPriceChangeRequest: (
        id,
        approverId,
        approverName,
        rejectReason,
      ) => {
        let updated: PriceChangeRequest | null = null;
        set((state) => ({
          priceChangeRequests: state.priceChangeRequests.map((r) => {
            if (r.id === id && r.status === 'pending') {
              updated = {
                ...r,
                status: 'rejected',
                approverId,
                approverName,
                rejectReason,
              };
              return updated;
            }
            return r;
          }),
        }));
        return updated;
      },

      addAppointment: (data) => {
        const appointment: Appointment = {
          ...data,
          id: generateId('app'),
          status: data.status || 'pending',
          createdAt: getNow(),
        };
        set((state) => ({
          appointments: [...state.appointments, appointment],
        }));
        return appointment;
      },

      updateAppointment: (id, data) => {
        let updated: Appointment | null = null;
        set((state) => ({
          appointments: state.appointments.map((a) => {
            if (a.id === id) {
              updated = { ...a, ...data };
              return updated;
            }
            return a;
          }),
        }));
        return updated;
      },

      updateAppointmentStatus: (id, status) => {
        return get().updateAppointment(id, { status });
      },

      confirmAppointment: (id) => {
        return get().updateAppointment(id, {
          status: 'confirmed',
          confirmedAt: getNow(),
        });
      },

      completeAppointment: (id) => {
        return get().updateAppointmentStatus(id, 'completed');
      },

      cancelAppointment: (id, note) => {
        return get().updateAppointment(id, {
          status: 'cancelled',
          ...(note ? { note } : {}),
        });
      },

      markAppointmentNoShow: (id, note) => {
        return get().updateAppointment(id, {
          status: 'no_show',
          ...(note ? { note } : {}),
        });
      },

      addSettlement: (data) => {
        const settlement: Settlement = {
          ...data,
          id: generateId('set'),
          settledAt: getNow(),
        };
        set((state) => ({
          settlements: [...state.settlements, settlement],
        }));
        return settlement;
      },

      setDefectGrade: (equipmentId, grade, inspectorId, inspectorName) => {
        const existingInspection = get().inspections.find(
          (i) => i.equipmentId === equipmentId,
        );
        if (existingInspection) {
          get().updateInspection(existingInspection.id, { defectGrade: grade });
        } else {
          get().addInspection({
            equipmentId,
            equipmentSerialNumber:
              get().equipments.find((e) => e.id === equipmentId)?.serialNumber ||
              '',
            shutterCount: 0,
            moldSpotsCount: 0,
            moldPhotos: [],
            focusTest: {
              passed: true,
              centerSharp: true,
              edgeSharp: true,
              infinityFocus: true,
            },
            accessoryCheck: [],
            defectGrade: grade,
            conclusion: '快速定级',
            inspectorId,
            inspectorName,
          });
        }
        return get().updateEquipment(equipmentId, { defectGrade: grade });
      },
    }),
    {
      name: 'camera_db_v1',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);
