import { create } from 'zustand';
import type { Visitor, Handover, Alert, CurrentUser, VisitorFormData, AlertType } from '../types';
import {
  getVisitors,
  saveVisitors,
  getHandovers,
  saveHandovers,
  getAlerts,
  saveAlerts,
  getCurrentUser,
  saveCurrentUser,
  clearCurrentUser,
  getParkingSpots,
  generateId,
} from '../utils/storage';
import { calculateOverdueMinutes } from '../utils/dateUtils';
import { checkParkingConflict, checkAllDayOccupied } from '../utils/parkingConflict';
import { formatPlateNumber } from '../utils/plateValidator';

interface StoreState {
  visitors: Visitor[];
  handovers: Handover[];
  alerts: Alert[];
  currentUser: CurrentUser | null;
  parkingSpots: string[];
  loading: boolean;
  
  initData: () => void;
  addVisitor: (data: VisitorFormData, createdBy: string) => { success: boolean; conflicts?: Visitor[] };
  updateVisitor: (id: string, data: Partial<Visitor>) => void;
  deleteVisitor: (id: string) => void;
  checkInVisitor: (id: string) => void;
  checkOutVisitor: (id: string) => void;
  changePlateNumber: (id: string, newPlate: string, approver: string) => boolean;
  
  addAlert: (type: AlertType, message: string, visitorId?: string) => void;
  dismissAlert: (id: string) => void;
  clearDismissedAlerts: () => void;
  
  addHandover: (data: Omit<Handover, 'id' | 'isReviewed'>) => void;
  reviewHandover: (id: string) => void;
  
  setCurrentUser: (user: CurrentUser) => void;
  logout: () => void;
  
  updateOverdueStatus: () => void;
}

export const useStore = create<StoreState>((set, get) => ({
  visitors: [],
  handovers: [],
  alerts: [],
  currentUser: null,
  parkingSpots: [],
  loading: true,

  initData: () => {
    const visitors = getVisitors();
    const handovers = getHandovers();
    const alerts = getAlerts();
    const currentUser = getCurrentUser();
    const parkingSpots = getParkingSpots();

    set({
      visitors,
      handovers,
      alerts,
      currentUser,
      parkingSpots,
      loading: false,
    });

    get().updateOverdueStatus();
  },

  addVisitor: (data, createdBy) => {
    const state = get();
    const formattedPlate = formatPlateNumber(data.plateNumber);
    
    const conflicts = checkParkingConflict(
      state.visitors,
      data.parkingSpot,
      data.visitDate,
      data.startTime,
      data.endTime
    );

    if (conflicts.length > 0) {
      get().addAlert(
        'parking_conflict',
        `车位 ${data.parkingSpot} 在 ${data.visitDate} ${data.startTime}-${data.endTime} 已被预约`
      );
      return { success: false, conflicts };
    }

    const allDayOccupied = checkAllDayOccupied(
      state.visitors,
      data.parkingSpot,
      data.visitDate
    );

    if (allDayOccupied) {
      get().addAlert(
        'all_day_occupied',
        `车位 ${data.parkingSpot} 在 ${data.visitDate} 已被全天占用`
      );
    }

    const now = new Date().toISOString();
    const newVisitor: Visitor = {
      id: generateId(),
      ...data,
      plateNumber: formattedPlate,
      status: 'pending',
      createdBy,
      createdAt: now,
      updatedAt: now,
      isPlateChanged: false,
    };

    const updatedVisitors = [...state.visitors, newVisitor];
    saveVisitors(updatedVisitors);
    set({ visitors: updatedVisitors });

    return { success: true };
  },

  updateVisitor: (id, data) => {
    const state = get();
    const updatedVisitors = state.visitors.map((v) =>
      v.id === id
        ? { ...v, ...data, updatedAt: new Date().toISOString() }
        : v
    );
    saveVisitors(updatedVisitors);
    set({ visitors: updatedVisitors });
  },

  deleteVisitor: (id) => {
    const state = get();
    const updatedVisitors = state.visitors.filter((v) => v.id !== id);
    saveVisitors(updatedVisitors);
    set({ visitors: updatedVisitors });
  },

  checkInVisitor: (id) => {
    get().updateVisitor(id, {
      status: 'arrived',
      checkInTime: new Date().toISOString(),
    });
  },

  checkOutVisitor: (id) => {
    get().updateVisitor(id, {
      status: 'checked_out',
      checkOutTime: new Date().toISOString(),
    });
  },

  changePlateNumber: (id, newPlate, approver) => {
    const state = get();
    const visitor = state.visitors.find((v) => v.id === id);
    if (!visitor) return false;

    const formattedNewPlate = formatPlateNumber(newPlate);
    
    get().updateVisitor(id, {
      plateNumber: formattedNewPlate,
      originalPlateNumber: visitor.plateNumber,
      plateChangeApprover: approver,
      plateChangeTime: new Date().toISOString(),
      isPlateChanged: true,
    });

    get().addAlert(
      'plate_changed',
      `${visitor.company} 的车牌已由 ${visitor.plateNumber} 变更为 ${formattedNewPlate}（批准人：${approver}）`,
      id
    );

    return true;
  },

  addAlert: (type, message, visitorId) => {
    const state = get();
    const newAlert: Alert = {
      id: generateId(),
      type,
      message,
      visitorId,
      timestamp: new Date().toISOString(),
      dismissed: false,
    };
    const updatedAlerts = [...state.alerts, newAlert];
    saveAlerts(updatedAlerts);
    set({ alerts: updatedAlerts });
  },

  dismissAlert: (id) => {
    const state = get();
    const updatedAlerts = state.alerts.map((a) =>
      a.id === id ? { ...a, dismissed: true } : a
    );
    saveAlerts(updatedAlerts);
    set({ alerts: updatedAlerts });
  },

  clearDismissedAlerts: () => {
    const state = get();
    const updatedAlerts = state.alerts.filter((a) => !a.dismissed);
    saveAlerts(updatedAlerts);
    set({ alerts: updatedAlerts });
  },

  addHandover: (data) => {
    const state = get();
    const newHandover: Handover = {
      ...data,
      id: generateId(),
      isReviewed: false,
    };
    const updatedHandovers = [...state.handovers, newHandover];
    saveHandovers(updatedHandovers);
    set({ handovers: updatedHandovers });
  },

  reviewHandover: (id) => {
    const state = get();
    const updatedHandovers = state.handovers.map((h) =>
      h.id === id
        ? { ...h, isReviewed: true, reviewedAt: new Date().toISOString() }
        : h
    );
    saveHandovers(updatedHandovers);
    set({ handovers: updatedHandovers });
  },

  setCurrentUser: (user) => {
    saveCurrentUser(user);
    set({ currentUser: user });
  },

  logout: () => {
    clearCurrentUser();
    set({ currentUser: null });
  },

  updateOverdueStatus: () => {
    const state = get();
    const today = new Date().toISOString().split('T')[0];
    
    let hasOverdue = false;
    const updatedVisitors = state.visitors.map((v) => {
      if (
        v.visitDate === today &&
        (v.status === 'pending' || v.status === 'arrived')
      ) {
        const overdueMinutes = calculateOverdueMinutes(v.endTime, v.checkOutTime);
        if (overdueMinutes > 0) {
          hasOverdue = true;
          return { ...v, status: 'overdue' as const, updatedAt: new Date().toISOString() };
        }
      }
      return v;
    });

    if (hasOverdue) {
      saveVisitors(updatedVisitors);
      set({ visitors: updatedVisitors });
    }
  },
}));
