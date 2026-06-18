import { create } from 'zustand';
import { Order, Refund, WardCount, Ward, Holiday, Meal, SpecialMeal, Alert } from '../types';
import { orders as mockOrders, refunds as mockRefunds, wards as mockWards, wardCounts as mockWardCounts, holidays as mockHolidays, meals as mockMeals, specialMeals as mockSpecialMeals } from '../data';

interface DataState {
  orders: Order[];
  refunds: Refund[];
  wardCounts: WardCount[];
  wards: Ward[];
  holidays: Holiday[];
  meals: Meal[];
  specialMeals: SpecialMeal[];
  alerts: Alert[];
  isLoading: boolean;
  setOrders: (orders: Order[]) => void;
  setRefunds: (refunds: Refund[]) => void;
  setWardCounts: (counts: WardCount[]) => void;
  addOrder: (order: Order) => void;
  addRefund: (refund: Refund) => void;
  addWardCount: (count: WardCount) => void;
  addAlert: (alert: Alert) => void;
  markAlertRead: (alertId: string) => void;
  verifySpecialMeal: (orderId: string, verifiedBy: string) => void;
  loadMockData: () => void;
}

const generateAlerts = (): Alert[] => {
  const alerts: Alert[] = [
    {
      id: 'alert-001',
      type: 'shortage',
      level: 'high',
      title: '内科一病区午餐缺餐风险',
      message: '预计今日午餐内科一病区预计缺餐风险较高，建议增加备餐15份',
      createdAt: new Date().toISOString(),
      isRead: false,
    },
    {
      id: 'alert-002',
      type: 'waste',
      level: 'medium',
      title: '外科二病区晚餐浪费预警',
      message: '外科二病区连续3天晚餐剩余超过20%，建议减少备餐',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      isRead: false,
    },
    {
      id: 'alert-003',
      type: 'anomaly',
      level: 'medium',
      title: '重复订餐检测',
      message: '检测到5笔重复订餐，已自动标记退餐',
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      isRead: true,
    },
    {
      id: 'alert-004',
      type: 'verification',
      level: 'low',
      title: '特殊餐待核对',
      message: '有12份明日特殊餐待病区护士核对',
      createdAt: new Date(Date.now() - 10800000).toISOString(),
      isRead: false,
    },
  ];
  return alerts;
};

export const useDataStore = create<DataState>((set) => ({
  orders: [],
  refunds: [],
  wardCounts: [],
  wards: [],
  holidays: [],
  meals: [],
  specialMeals: [],
  alerts: [],
  isLoading: true,
  setOrders: (orders) => set({ orders }),
  setRefunds: (refunds) => set({ refunds }),
  setWardCounts: (counts) => set({ wardCounts: counts }),
  addOrder: (order) => set((state) => ({ orders: [order, ...state.orders] })),
  addRefund: (refund) => set((state) => ({ refunds: [refund, ...state.refunds] })),
  addWardCount: (count) => set((state) => ({ wardCounts: [count, ...state.wardCounts] })),
  addAlert: (alert) => set((state) => ({ alerts: [alert, ...state.alerts] })),
  markAlertRead: (alertId) => set((state) => ({
    alerts: state.alerts.map(a =>
      a.id === alertId ? { ...a, isRead: true } : a
    )
  })),
  verifySpecialMeal: (orderId, verifiedBy) => set((state) => ({
    specialMeals: state.specialMeals.map(sm =>
      sm.orderId === orderId
        ? { ...sm, isVerified: true, verifiedBy, verifiedAt: new Date().toISOString() }
        : sm
    )
  })),
  loadMockData: () => set({
    orders: mockOrders,
    refunds: mockRefunds,
    wardCounts: mockWardCounts,
    wards: mockWards,
    holidays: mockHolidays,
    meals: mockMeals,
    specialMeals: mockSpecialMeals,
    alerts: generateAlerts(),
    isLoading: false,
  }),
}));
