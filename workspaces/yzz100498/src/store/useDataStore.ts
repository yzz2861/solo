import { create } from 'zustand';
import { Order, Refund, WardCount, Ward, Holiday, Meal, SpecialMeal, Alert, MealType } from '../types';
import { orders as mockOrders, refunds as mockRefunds, wards as mockWards, wardCounts as mockWardCounts, holidays as mockHolidays, meals as mockMeals, specialMeals as mockSpecialMeals } from '../data';

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  supper: '夜宵'
};

const DIETARY_TYPE_MAP: Record<string, SpecialMeal['dietaryType']> = {
  diabetic: 'diabetic',
  low_salt: 'low_salt',
  low_fat: 'low_fat',
  soft: 'soft',
  liquid: 'liquid',
  allergy_free: 'allergy_free'
};

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
  setHolidays: (holidays: Holiday[]) => void;
  addOrder: (order: Order) => void;
  addRefund: (refund: Refund) => void;
  addWardCount: (count: WardCount) => void;
  addAlert: (alert: Alert) => void;
  markAlertRead: (alertId: string) => void;
  markAllAlertsRead: () => void;
  verifySpecialMeal: (idOrOrderId: string, verifiedBy: string) => void;
  importOrders: (orders: Order[]) => { count: number; specialCount: number; alerts: Alert[] };
  importRefunds: (refunds: Refund[]) => { count: number; updatedOrders: number; alerts: Alert[] };
  importWardCounts: (counts: WardCount[]) => { count: number; alerts: Alert[] };
  importHolidays: (holidays: Holiday[]) => { count: number };
  generateSpecialMealsFromOrders: (orders: Order[]) => SpecialMeal[];
  applyRefundsToOrders: (refunds: Refund[], orders: Order[]) => Order[];
  detectAnomaliesAndGenerateAlerts: (orders: Order[], refunds: Refund[], wardCounts: WardCount[]) => Alert[];
  clearAllData: () => void;
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

export const useDataStore = create<DataState>((set, get) => ({
  orders: [],
  refunds: [],
  wardCounts: [],
  wards: [],
  holidays: [],
  meals: [],
  specialMeals: [],
  alerts: [],
  isLoading: true,

  setOrders: (orders) => {
    const specialMeals = get().generateSpecialMealsFromOrders(orders);
    set({ orders, specialMeals });
  },
  setRefunds: (refunds) => {
    const orders = get().applyRefundsToOrders(refunds, get().orders);
    set({ refunds, orders });
  },
  setWardCounts: (counts) => set({ wardCounts: counts }),
  setHolidays: (holidays) => set({ holidays }),

  addOrder: (order) => set((state) => ({ orders: [order, ...state.orders] })),
  addRefund: (refund) => set((state) => {
    const updatedOrders = state.orders.map(o =>
      o.id === refund.orderId ? { ...o, status: 'refunded' as const } : o
    );
    return { refunds: [refund, ...state.refunds], orders: updatedOrders };
  }),
  addWardCount: (count) => set((state) => ({ wardCounts: [count, ...state.wardCounts] })),
  addAlert: (alert) => set((state) => ({ alerts: [alert, ...state.alerts] })),

  markAlertRead: (alertId) => set((state) => ({
    alerts: state.alerts.map(a =>
      a.id === alertId ? { ...a, isRead: true } : a
    )
  })),
  markAllAlertsRead: () => set((state) => ({
    alerts: state.alerts.map(a => ({ ...a, isRead: true }))
  })),

  verifySpecialMeal: (idOrOrderId, verifiedBy) => set((state) => ({
    specialMeals: state.specialMeals.map(sm =>
      (sm.id === idOrOrderId || sm.orderId === idOrOrderId)
        ? { ...sm, isVerified: true, verifiedBy, verifiedAt: new Date().toISOString() }
        : sm
    )
  })),

  generateSpecialMealsFromOrders: (orders) => {
    const wards = get().wards.length > 0 ? get().wards : mockWards;
    const specialOrders = orders.filter(o => o.isSpecial && o.status !== 'refunded');
    let smId = 1;

    return specialOrders.map((order) => {
      const ward = wards.find(w => w.id === order.wardId);
      const bedNo = `${ward?.floor || 3}${String(Math.floor(Math.random() * 30) + 1).padStart(2, '0')}`;
      const mappedDietaryType = DIETARY_TYPE_MAP[order.dietaryType || ''] || 'other';

      return {
        id: `SM-${String(smId++).padStart(4, '0')}`,
        orderId: order.id,
        patientName: order.patientName,
        wardName: order.wardName,
        bedNo,
        dietaryType: mappedDietaryType,
        mealName: order.mealName,
        mealDate: order.orderDate,
        mealType: order.mealType,
        isVerified: false,
        notes: undefined
      } as SpecialMeal;
    });
  },

  applyRefundsToOrders: (refunds, orders) => {
    const refundedOrderIds = new Set(refunds.map(r => r.orderId));
    return orders.map(o =>
      refundedOrderIds.has(o.id) ? { ...o, status: 'refunded' as const } : o
    );
  },

  detectAnomaliesAndGenerateAlerts: (orders, refunds, wardCounts) => {
    const newAlerts: Alert[] = [];
    let alertCounter = Date.now();

    const duplicateCount = orders.filter(o => o.flags?.isDuplicate).length;
    if (duplicateCount > 0) {
      newAlerts.push({
        id: `alert-imp-${alertCounter++}`,
        type: 'anomaly',
        level: 'medium',
        title: '重复订餐检测',
        message: `导入数据中检测到 ${duplicateCount} 笔重复订餐，请注意核对`,
        createdAt: new Date().toISOString(),
        isRead: false,
      });
    }

    const crossMidnightCount = orders.filter(o => o.flags?.isCrossMidnight).length;
    if (crossMidnightCount > 0) {
      newAlerts.push({
        id: `alert-imp-${alertCounter++}`,
        type: 'anomaly',
        level: 'low',
        title: '跨午夜餐次提醒',
        message: `检测到 ${crossMidnightCount} 笔跨午夜夜宵订单，已优化日期归属`,
        createdAt: new Date().toISOString(),
        isRead: false,
      });
    }

    const dischargeRefunds = refunds.filter(r => r.reason === 'discharge').length;
    if (dischargeRefunds > 0) {
      newAlerts.push({
        id: `alert-imp-${alertCounter++}`,
        type: 'waste',
        level: 'medium',
        title: '出院退餐提醒',
        message: `因病人出院导致 ${dischargeRefunds} 笔退餐，建议早会确认出院人数`,
        createdAt: new Date().toISOString(),
        isRead: false,
      });
    }

    const lockedDownWards = wardCounts.filter(wc => wc.isLockedDown);
    if (lockedDownWards.length > 0) {
      newAlerts.push({
        id: `alert-imp-${alertCounter++}`,
        type: 'anomaly',
        level: 'high',
        title: '病区封控预警',
        message: `检测到 ${lockedDownWards.length} 个病区处于封控状态：${lockedDownWards.map(w => w.wardName).join('、')}`,
        createdAt: new Date().toISOString(),
        isRead: false,
      });
    }

    const unverifiedSpecialCount = get().specialMeals.filter(sm => !sm.isVerified).length;
    if (unverifiedSpecialCount > 0) {
      newAlerts.push({
        id: `alert-imp-${alertCounter++}`,
        type: 'verification',
        level: 'low',
        title: '特殊餐待核对',
        message: `有 ${unverifiedSpecialCount} 份特殊餐待病区护士核对`,
        createdAt: new Date().toISOString(),
        isRead: false,
      });
    }

    return newAlerts;
  },

  importOrders: (parsedOrders) => {
    const existingRefunds = get().refunds;
    const holidays = get().holidays;
    const holidaySet = new Set(holidays.map(h => h.date));

    const enrichedOrders: Order[] = parsedOrders.map(order => {
      const mealType = (order.mealType || 'lunch') as MealType;
      const isDuplicate = order.flags?.isDuplicate ?? false;
      const isCrossMidnight = order.flags?.isCrossMidnight ?? (mealType === 'supper' && order.createdAt ? (() => {
        try {
          const hour = new Date(order.createdAt).getHours();
          return hour >= 23 || hour < 2;
        } catch { return false; }
      })() : false);
      const isHoliday = order.flags?.isHoliday ?? holidaySet.has(order.orderDate || '');

      return {
        id: order.id || `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        patientId: order.patientId || `P${Math.floor(Math.random() * 9000 + 1000)}`,
        patientName: order.patientName || '未知患者',
        familyMemberName: order.familyMemberName || `${order.patientName || '患者'}家属`,
        wardId: order.wardId || 'ward-001',
        wardName: order.wardName || '未明病区',
        mealId: order.mealId || 'MEAL-GENERIC',
        mealName: order.mealName || '标准餐',
        mealType,
        mealTypeLabel: order.mealTypeLabel || MEAL_TYPE_LABELS[mealType],
        orderDate: order.orderDate || new Date().toISOString().slice(0, 10),
        quantity: order.quantity || 1,
        price: typeof order.price === 'number' ? order.price : 20,
        status: order.status || 'confirmed',
        isSpecial: order.isSpecial || false,
        dietaryType: order.dietaryType,
        createdAt: order.createdAt || new Date().toISOString(),
        notes: order.notes,
        flags: {
          isDuplicate,
          isCrossMidnight,
          isHoliday
        }
      };
    });

    const finalOrders = get().applyRefundsToOrders(existingRefunds, enrichedOrders);
    const specialMeals = get().generateSpecialMealsFromOrders(finalOrders);
    const newAlerts = get().detectAnomaliesAndGenerateAlerts(finalOrders, existingRefunds, get().wardCounts);

    set(state => ({
      orders: finalOrders,
      specialMeals,
      alerts: [...newAlerts, ...state.alerts]
    }));

    return {
      count: finalOrders.length,
      specialCount: specialMeals.length,
      alerts: newAlerts
    };
  },

  importRefunds: (parsedRefunds) => {
    const enrichedRefunds: Refund[] = parsedRefunds.map(refund => ({
      id: refund.id || `REF-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      orderId: refund.orderId || '',
      reason: refund.reason || 'other',
      reasonDetail: refund.reasonDetail,
      amount: typeof refund.amount === 'number' ? refund.amount : 0,
      refundTime: refund.refundTime || new Date().toISOString(),
      operator: refund.operator || '系统导入'
    }));

    const existingOrders = get().orders;
    const updatedOrders = get().applyRefundsToOrders(enrichedRefunds, existingOrders);
    const newAlerts = get().detectAnomaliesAndGenerateAlerts(updatedOrders, enrichedRefunds, get().wardCounts);

    set(state => ({
      refunds: enrichedRefunds,
      orders: updatedOrders,
      alerts: [...newAlerts, ...state.alerts]
    }));

    const updatedOrderCount = enrichedRefunds.filter(r =>
      existingOrders.some(o => o.id === r.orderId && o.status !== 'refunded')
    ).length;

    return {
      count: enrichedRefunds.length,
      updatedOrders: updatedOrderCount,
      alerts: newAlerts
    };
  },

  importWardCounts: (parsedCounts) => {
    const enrichedCounts: WardCount[] = parsedCounts.map(wc => ({
      id: wc.id || `WC-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      wardId: wc.wardId || '',
      wardName: wc.wardName || '',
      reportDate: wc.reportDate || new Date().toISOString().slice(0, 10),
      patientCount: wc.patientCount || 0,
      companionCount: wc.companionCount || 0,
      specialMealCount: wc.specialMealCount || 0,
      reporter: wc.reporter || '系统导入',
      isLockedDown: wc.isLockedDown || false
    }));

    const newAlerts = get().detectAnomaliesAndGenerateAlerts(get().orders, get().refunds, enrichedCounts);

    set(state => ({
      wardCounts: enrichedCounts,
      alerts: [...newAlerts, ...state.alerts]
    }));

    return {
      count: enrichedCounts.length,
      alerts: newAlerts
    };
  },

  importHolidays: (parsedHolidays) => {
    const enriched: Holiday[] = parsedHolidays.map(h => ({
      date: h.date || '',
      name: h.name || '',
      type: h.type || 'public',
      impactFactor: typeof h.impactFactor === 'number' ? h.impactFactor : 1.0,
      notes: h.notes
    })).filter(h => h.date);

    set({ holidays: enriched });

    return { count: enriched.length };
  },

  clearAllData: () => set({
    orders: [],
    refunds: [],
    wardCounts: [],
    specialMeals: [],
    alerts: []
  }),

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
