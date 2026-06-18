import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Activity,
  RoutePoint,
  Rigger,
  SupplyPoint,
  SupplyItem,
  CheckinRecord,
  SupplyRecord,
  RescueRecord,
  Alert,
  ViewRole,
  SupplyCategory,
  RiggerStatus,
} from '@/types';

const AVATAR_COLORS = [
  'bg-teal-500',
  'bg-cyan-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-violet-500',
  'bg-sky-500',
  'bg-orange-500',
];

const generateId = () => Math.random().toString(36).substring(2, 10);

const ACTIVITY_ID = 'act-demo-001';

const initialActivities: Activity[] = [
  {
    id: ACTIVITY_ID,
    name: '周末环千岛湖拉练',
    date: new Date().toISOString().split('T')[0],
    status: 'ongoing',
    description: '120公里环湖骑行，补给点3个，预计6小时完成',
    totalDistance: 120,
  },
];

const initialRoutePoints: RoutePoint[] = [
  { id: 'rp-1', activityId: ACTIVITY_ID, name: '起点：千岛湖广场', distance: 0, order: 0, type: 'start', estimatedArrival: '07:00' },
  { id: 'rp-2', activityId: ACTIVITY_ID, name: '一号补给点：界首乡', distance: 25, order: 1, type: 'supply', estimatedArrival: '08:30' },
  { id: 'rp-3', activityId: ACTIVITY_ID, name: '打卡点：小金山大桥', distance: 45, order: 2, type: 'checkpoint', estimatedArrival: '09:45' },
  { id: 'rp-4', activityId: ACTIVITY_ID, name: '二号补给点：姜家镇', distance: 65, order: 3, type: 'supply', estimatedArrival: '11:00' },
  { id: 'rp-5', activityId: ACTIVITY_ID, name: '打卡点：文渊狮城', distance: 85, order: 4, type: 'checkpoint', estimatedArrival: '12:30' },
  { id: 'rp-6', activityId: ACTIVITY_ID, name: '三号补给点：汾口镇', distance: 100, order: 5, type: 'supply', estimatedArrival: '13:30' },
  { id: 'rp-7', activityId: ACTIVITY_ID, name: '终点：千岛湖广场', distance: 120, order: 6, type: 'end', estimatedArrival: '15:00' },
];

const initialRiggers: Rigger[] = [
  { id: 'r-1', activityId: ACTIVITY_ID, name: '张领队', phone: '13800000001', group: '领队组', needsAttention: false, status: 'active', currentPointId: 'rp-4', lastCheckinTime: new Date(Date.now() - 3600000).toISOString(), avatarColor: 'bg-teal-500' },
  { id: 'r-2', activityId: ACTIVITY_ID, name: '小李', phone: '13800000002', group: '快队', needsAttention: false, status: 'active', currentPointId: 'rp-4', lastCheckinTime: new Date(Date.now() - 3500000).toISOString(), avatarColor: 'bg-cyan-500' },
  { id: 'r-3', activityId: ACTIVITY_ID, name: '老王', phone: '13800000003', group: '快队', emergencyContact: '王夫人 13900000003', healthNotes: '高血压，需定时服药', needsAttention: true, status: 'active', currentPointId: 'rp-3', lastCheckinTime: new Date(Date.now() - 3000000).toISOString(), avatarColor: 'bg-emerald-500' },
  { id: 'r-4', activityId: ACTIVITY_ID, name: '阿杰', phone: '13800000004', group: '中队', needsAttention: false, status: 'active', currentPointId: 'rp-3', lastCheckinTime: new Date(Date.now() - 2800000).toISOString(), avatarColor: 'bg-amber-500' },
  { id: 'r-5', activityId: ACTIVITY_ID, name: '小美', phone: '13800000005', group: '中队', needsAttention: false, status: 'active', currentPointId: 'rp-2', lastCheckinTime: new Date(Date.now() - 5400000).toISOString(), avatarColor: 'bg-rose-500' },
  { id: 'r-6', activityId: ACTIVITY_ID, name: '大刘', phone: '13800000006', group: '慢队', healthNotes: '膝盖旧伤', needsAttention: true, status: 'active', currentPointId: 'rp-2', lastCheckinTime: new Date(Date.now() - 6000000).toISOString(), avatarColor: 'bg-violet-500' },
  { id: 'r-7', activityId: ACTIVITY_ID, name: '小陈', phone: '13800000007', group: '慢队', needsAttention: false, status: 'dropped', dropReason: '爆胎，等待救援', currentPointId: 'rp-2', lastCheckinTime: new Date(Date.now() - 7200000).toISOString(), avatarColor: 'bg-sky-500' },
  { id: 'r-8', activityId: ACTIVITY_ID, name: '阿强', phone: '13800000008', group: '快队', needsAttention: false, status: 'finished', currentPointId: 'rp-7', lastCheckinTime: new Date(Date.now() - 1800000).toISOString(), avatarColor: 'bg-orange-500' },
];

const initialSupplyPoints: SupplyPoint[] = [
  { id: 'sp-1', activityId: ACTIVITY_ID, routePointId: 'rp-2', name: '一号补给点：界首乡' },
  { id: 'sp-2', activityId: ACTIVITY_ID, routePointId: 'rp-4', name: '二号补给点：姜家镇' },
  { id: 'sp-3', activityId: ACTIVITY_ID, routePointId: 'rp-6', name: '三号补给点：汾口镇' },
];

const initialSupplyItems: SupplyItem[] = [
  // 一号补给点
  { id: 'si-1', supplyPointId: 'sp-1', name: '矿泉水', category: 'water', quantity: 45, initialQuantity: 60, unit: '瓶', lowStockThreshold: 15 },
  { id: 'si-2', supplyPointId: 'sp-1', name: '能量胶', category: 'energy', quantity: 30, initialQuantity: 40, unit: '包', lowStockThreshold: 10 },
  { id: 'si-3', supplyPointId: 'sp-1', name: '香蕉', category: 'food', quantity: 25, initialQuantity: 30, unit: '根', lowStockThreshold: 8 },
  // 二号补给点
  { id: 'si-4', supplyPointId: 'sp-2', name: '矿泉水', category: 'water', quantity: 38, initialQuantity: 50, unit: '瓶', lowStockThreshold: 15 },
  { id: 'si-5', supplyPointId: 'sp-2', name: '能量胶', category: 'energy', quantity: 8, initialQuantity: 30, unit: '包', lowStockThreshold: 10 },
  { id: 'si-6', supplyPointId: 'sp-2', name: '面包', category: 'food', quantity: 20, initialQuantity: 25, unit: '个', lowStockThreshold: 8 },
  { id: 'si-7', supplyPointId: 'sp-2', name: '创可贴', category: 'medical', quantity: 15, initialQuantity: 20, unit: '片', lowStockThreshold: 5 },
  // 三号补给点
  { id: 'si-8', supplyPointId: 'sp-3', name: '矿泉水', category: 'water', quantity: 55, initialQuantity: 60, unit: '瓶', lowStockThreshold: 15 },
  { id: 'si-9', supplyPointId: 'sp-3', name: '能量胶', category: 'energy', quantity: 28, initialQuantity: 35, unit: '包', lowStockThreshold: 10 },
  { id: 'si-10', supplyPointId: 'sp-3', name: '盐丸', category: 'medical', quantity: 18, initialQuantity: 20, unit: '粒', lowStockThreshold: 5 },
];

const initialCheckinRecords: CheckinRecord[] = [
  { id: 'c-1', riggerId: 'r-1', routePointId: 'rp-1', timestamp: new Date(Date.now() - 7 * 3600000).toISOString(), isDuplicate: false },
  { id: 'c-2', riggerId: 'r-2', routePointId: 'rp-1', timestamp: new Date(Date.now() - 6.9 * 3600000).toISOString(), isDuplicate: false },
  { id: 'c-3', riggerId: 'r-3', routePointId: 'rp-1', timestamp: new Date(Date.now() - 6.8 * 3600000).toISOString(), isDuplicate: false },
  { id: 'c-4', riggerId: 'r-8', routePointId: 'rp-7', timestamp: new Date(Date.now() - 1.8 * 3600000).toISOString(), isDuplicate: false },
  { id: 'c-5', riggerId: 'r-1', routePointId: 'rp-2', timestamp: new Date(Date.now() - 5.5 * 3600000).toISOString(), isDuplicate: false },
  { id: 'c-6', riggerId: 'r-2', routePointId: 'rp-2', timestamp: new Date(Date.now() - 5.3 * 3600000).toISOString(), isDuplicate: false },
  { id: 'c-7', riggerId: 'r-7', routePointId: 'rp-2', timestamp: new Date(Date.now() - 5.2 * 3600000).toISOString(), isDuplicate: false },
  { id: 'c-8', riggerId: 'r-1', routePointId: 'rp-3', timestamp: new Date(Date.now() - 4 * 3600000).toISOString(), isDuplicate: false },
  { id: 'c-9', riggerId: 'r-2', routePointId: 'rp-3', timestamp: new Date(Date.now() - 3.8 * 3600000).toISOString(), isDuplicate: false },
  { id: 'c-10', riggerId: 'r-3', routePointId: 'rp-3', timestamp: new Date(Date.now() - 3.2 * 3600000).toISOString(), isDuplicate: false },
  { id: 'c-11', riggerId: 'r-1', routePointId: 'rp-4', timestamp: new Date(Date.now() - 1.2 * 3600000).toISOString(), isDuplicate: false },
  { id: 'c-12', riggerId: 'r-2', routePointId: 'rp-4', timestamp: new Date(Date.now() - 1 * 3600000).toISOString(), isDuplicate: false },
];

const initialSupplyRecords: SupplyRecord[] = [
  { id: 'sr-1', riggerId: 'r-1', supplyItemId: 'si-1', quantity: 1, timestamp: new Date(Date.now() - 5.5 * 3600000).toISOString(), supplyPointId: 'sp-1' },
  { id: 'sr-2', riggerId: 'r-2', supplyItemId: 'si-1', quantity: 1, timestamp: new Date(Date.now() - 5.3 * 3600000).toISOString(), supplyPointId: 'sp-1' },
  { id: 'sr-3', riggerId: 'r-1', supplyItemId: 'si-2', quantity: 1, timestamp: new Date(Date.now() - 5.4 * 3600000).toISOString(), supplyPointId: 'sp-1' },
];

const initialRescueRecords: RescueRecord[] = [
  {
    id: 'rescue-1',
    activityId: ACTIVITY_ID,
    riggerId: 'r-7',
    type: 'drop',
    status: 'processing',
    description: '后胎爆胎，已更换备胎但感觉骑行困难，申请退赛',
    location: '界首乡补给点前3公里',
    timestamp: new Date(Date.now() - 3 * 3600000).toISOString(),
  },
  {
    id: 'rescue-2',
    activityId: ACTIVITY_ID,
    riggerId: 'r-3',
    type: 'help',
    status: 'resolved',
    description: '需要测量血压，感觉有点头晕',
    location: '小金山大桥打卡点',
    timestamp: new Date(Date.now() - 4 * 3600000).toISOString(),
    resolvedAt: new Date(Date.now() - 3.5 * 3600000).toISOString(),
    resolution: '休息15分钟，服用降压药，已恢复正常',
  },
];

const initialAlerts: Alert[] = [
  {
    id: 'alert-1',
    activityId: ACTIVITY_ID,
    type: 'low_stock',
    title: '二号补给点能量胶库存不足',
    message: '能量胶剩余 8 包，已低于阈值 10 包',
    severity: 'warning',
    read: false,
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    relatedId: 'si-5',
  },
  {
    id: 'alert-2',
    activityId: ACTIVITY_ID,
    type: 'help_request',
    title: '新的退赛申请',
    message: '小陈因爆胎申请退赛，等待处理',
    severity: 'danger',
    read: false,
    timestamp: new Date(Date.now() - 3 * 3600000).toISOString(),
    relatedId: 'rescue-1',
  },
  {
    id: 'alert-3',
    activityId: ACTIVITY_ID,
    type: 'overdue',
    title: '大刘超时未到达下一点',
    message: '大刘在一号补给点已停留超过预期时间，请注意',
    severity: 'warning',
    read: true,
    timestamp: new Date(Date.now() - 5 * 3600000).toISOString(),
    relatedId: 'r-6',
  },
];

interface AppState {
  currentActivityId: string | null;
  activities: Activity[];
  routePoints: RoutePoint[];
  riggers: Rigger[];
  supplyPoints: SupplyPoint[];
  supplyItems: SupplyItem[];
  checkinRecords: CheckinRecord[];
  supplyRecords: SupplyRecord[];
  rescueRecords: RescueRecord[];
  alerts: Alert[];
  currentView: ViewRole;

  setCurrentView: (view: ViewRole) => void;
  addActivity: (activity: Omit<Activity, 'id'>) => void;
  updateActivity: (id: string, data: Partial<Activity>) => void;

  addRoutePoint: (point: Omit<RoutePoint, 'id'>) => void;
  updateRoutePoint: (id: string, data: Partial<RoutePoint>) => void;
  deleteRoutePoint: (id: string) => void;

  addRigger: (rigger: Omit<Rigger, 'id'> & { avatarColor?: string }) => void;
  updateRigger: (id: string, data: Partial<Rigger>) => void;
  deleteRigger: (id: string) => void;
  setRiggerStatus: (id: string, status: RiggerStatus, dropReason?: string) => void;

  addSupplyPoint: (point: Omit<SupplyPoint, 'id'>) => void;
  addSupplyItem: (item: Omit<SupplyItem, 'id'>) => void;
  updateSupplyItem: (id: string, data: Partial<SupplyItem>) => void;

  addCheckin: (riggerId: string, routePointId: string, note?: string) => void;
  addSupplyRecord: (riggerId: string, supplyItemId: string, quantity: number, supplyPointId: string) => void;

  addRescueRecord: (record: Omit<RescueRecord, 'id' | 'timestamp' | 'status'> & { status?: RescueRecord['status'] }) => void;
  updateRescueRecord: (id: string, data: Partial<RescueRecord>) => void;
  resolveRescue: (id: string, resolution: string) => void;

  addAlert: (alert: Omit<Alert, 'id' | 'timestamp' | 'read'>) => void;
  markAlertRead: (id: string) => void;
  markAllAlertsRead: () => void;

  getCurrentActivity: () => Activity | undefined;
  getRoutePointsOrdered: () => RoutePoint[];
  getSupplyItemsByPoint: (supplyPointId: string) => SupplyItem[];
  getRiggersByStatus: (status: RiggerStatus) => Rigger[];
  getCheckinsByPoint: (routePointId: string) => CheckinRecord[];
  getUnreadAlertsCount: () => number;
  getOverdueRiggers: () => Rigger[];
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentActivityId: ACTIVITY_ID,
      activities: initialActivities,
      routePoints: initialRoutePoints,
      riggers: initialRiggers,
      supplyPoints: initialSupplyPoints,
      supplyItems: initialSupplyItems,
      checkinRecords: initialCheckinRecords,
      supplyRecords: initialSupplyRecords,
      rescueRecords: initialRescueRecords,
      alerts: initialAlerts,
      currentView: 'leader',

      setCurrentView: (view) => set({ currentView: view }),

      addActivity: (activity) =>
        set((state) => ({
          activities: [...state.activities, { ...activity, id: generateId() }],
        })),

      updateActivity: (id, data) =>
        set((state) => ({
          activities: state.activities.map((a) => (a.id === id ? { ...a, ...data } : a)),
        })),

      addRoutePoint: (point) =>
        set((state) => ({
          routePoints: [...state.routePoints, { ...point, id: generateId() }],
        })),

      updateRoutePoint: (id, data) =>
        set((state) => ({
          routePoints: state.routePoints.map((p) => (p.id === id ? { ...p, ...data } : p)),
        })),

      deleteRoutePoint: (id) =>
        set((state) => ({
          routePoints: state.routePoints.filter((p) => p.id !== id),
        })),

      addRigger: (rigger) => {
        const colorIndex = get().riggers.length % AVATAR_COLORS.length;
        set((state) => ({
          riggers: [
            ...state.riggers,
            {
              ...rigger,
              id: generateId(),
              avatarColor: rigger.avatarColor || AVATAR_COLORS[colorIndex],
            },
          ],
        }));
      },

      updateRigger: (id, data) =>
        set((state) => ({
          riggers: state.riggers.map((r) => (r.id === id ? { ...r, ...data } : r)),
        })),

      deleteRigger: (id) =>
        set((state) => ({
          riggers: state.riggers.filter((r) => r.id !== id),
        })),

      setRiggerStatus: (id, status, dropReason) =>
        set((state) => ({
          riggers: state.riggers.map((r) =>
            r.id === id ? { ...r, status, dropReason: dropReason || r.dropReason } : r
          ),
        })),

      addSupplyPoint: (point) =>
        set((state) => ({
          supplyPoints: [...state.supplyPoints, { ...point, id: generateId() }],
        })),

      addSupplyItem: (item) =>
        set((state) => ({
          supplyItems: [...state.supplyItems, { ...item, id: generateId() }],
        })),

      updateSupplyItem: (id, data) =>
        set((state) => {
          const updatedItems = state.supplyItems.map((item) =>
            item.id === id ? { ...item, ...data } : item
          );
          const updatedItem = updatedItems.find((i) => i.id === id);
          if (updatedItem && updatedItem.lowStockThreshold && updatedItem.quantity <= updatedItem.lowStockThreshold) {
            const supplyPoint = state.supplyPoints.find((sp) => sp.id === updatedItem.supplyPointId);
            get().addAlert({
              type: 'low_stock',
              title: `${supplyPoint?.name || '补给点'} ${updatedItem.name}库存不足`,
              message: `${updatedItem.name}剩余 ${updatedItem.quantity} ${updatedItem.unit}，已低于阈值 ${updatedItem.lowStockThreshold} ${updatedItem.unit}`,
              severity: 'warning',
              activityId: state.currentActivityId || '',
              relatedId: updatedItem.id,
            });
          }
          return { supplyItems: updatedItems };
        }),

      addCheckin: (riggerId, routePointId, note) => {
        const state = get();
        const isDuplicate = state.checkinRecords.some(
          (c) => c.riggerId === riggerId && c.routePointId === routePointId
        );
        const timestamp = new Date().toISOString();
        const newRecord: CheckinRecord = {
          id: generateId(),
          riggerId,
          routePointId,
          timestamp,
          isDuplicate,
          note,
        };

        if (isDuplicate) {
          const rigger = state.riggers.find((r) => r.id === riggerId);
          const point = state.routePoints.find((p) => p.id === routePointId);
          get().addAlert({
            type: 'duplicate_checkin',
            title: `${rigger?.name || '队员'}重复签到`,
            message: `${rigger?.name} 在 ${point?.name} 重复签到`,
            severity: 'info',
            activityId: state.currentActivityId || '',
            relatedId: newRecord.id,
          });
        }

        set((s) => ({
          checkinRecords: [...s.checkinRecords, newRecord],
          riggers: s.riggers.map((r) =>
            r.id === riggerId
              ? { ...r, currentPointId: routePointId, lastCheckinTime: timestamp }
              : r
          ),
        }));
      },

      addSupplyRecord: (riggerId, supplyItemId, quantity, supplyPointId) => {
        const state = get();
        const item = state.supplyItems.find((i) => i.id === supplyItemId);
        if (!item) return;

        const newQuantity = Math.max(0, item.quantity - quantity);
        get().updateSupplyItem(supplyItemId, { quantity: newQuantity });

        set((s) => ({
          supplyRecords: [
            ...s.supplyRecords,
            {
              id: generateId(),
              riggerId,
              supplyItemId,
              quantity,
              supplyPointId,
              timestamp: new Date().toISOString(),
            },
          ],
        }));
      },

      addRescueRecord: (record) => {
        const state = get();
        const newRecord: RescueRecord = {
          ...record,
          id: generateId(),
          status: record.status || 'pending',
          timestamp: new Date().toISOString(),
        };

        if (record.type === 'help' || record.type === 'drop') {
          const rigger = state.riggers.find((r) => r.id === record.riggerId);
          const typeText = record.type === 'help' ? '求助' : '退赛';
          get().addAlert({
            type: 'help_request',
            title: `新的${typeText}请求：${rigger?.name || '队员'}`,
            message: record.description,
            severity: record.type === 'drop' ? 'danger' : 'warning',
            activityId: state.currentActivityId || '',
            relatedId: newRecord.id,
          });
        }

        if (record.type === 'drop') {
          get().setRiggerStatus(record.riggerId, 'dropped', record.description);
        }

        set((s) => ({
          rescueRecords: [...s.rescueRecords, newRecord],
        }));
      },

      updateRescueRecord: (id, data) =>
        set((state) => ({
          rescueRecords: state.rescueRecords.map((r) => (r.id === id ? { ...r, ...data } : r)),
        })),

      resolveRescue: (id, resolution) =>
        set((state) => ({
          rescueRecords: state.rescueRecords.map((r) =>
            r.id === id
              ? { ...r, status: 'resolved', resolvedAt: new Date().toISOString(), resolution }
              : r
          ),
        })),

      addAlert: (alert) =>
        set((state) => ({
          alerts: [
            {
              ...alert,
              id: generateId(),
              timestamp: new Date().toISOString(),
              read: false,
            },
            ...state.alerts,
          ],
        })),

      markAlertRead: (id) =>
        set((state) => ({
          alerts: state.alerts.map((a) => (a.id === id ? { ...a, read: true } : a)),
        })),

      markAllAlertsRead: () =>
        set((state) => ({
          alerts: state.alerts.map((a) => ({ ...a, read: true })),
        })),

      getCurrentActivity: () => {
        const state = get();
        return state.activities.find((a) => a.id === state.currentActivityId);
      },

      getRoutePointsOrdered: () => {
        const state = get();
        return [...state.routePoints]
          .filter((p) => p.activityId === state.currentActivityId)
          .sort((a, b) => a.order - b.order);
      },

      getSupplyItemsByPoint: (supplyPointId) => {
        return get().supplyItems.filter((item) => item.supplyPointId === supplyPointId);
      },

      getRiggersByStatus: (status) => {
        const state = get();
        return state.riggers.filter(
          (r) => r.activityId === state.currentActivityId && r.status === status
        );
      },

      getCheckinsByPoint: (routePointId) => {
        return get().checkinRecords.filter((c) => c.routePointId === routePointId);
      },

      getUnreadAlertsCount: () => {
        const state = get();
        return state.alerts.filter((a) => !a.read && a.activityId === state.currentActivityId).length;
      },

      getOverdueRiggers: () => {
        const state = get();
        const points = state.getRoutePointsOrdered();
        const now = Date.now();
        const OVERDUE_THRESHOLD = 2 * 3600000; // 2小时超时

        return state.riggers.filter((r) => {
          if (r.status !== 'active' || !r.currentPointId || !r.lastCheckinTime) return false;
          const currentIdx = points.findIndex((p) => p.id === r.currentPointId);
          if (currentIdx >= points.length - 1) return false;
          const lastCheckinTime = new Date(r.lastCheckinTime).getTime();
          return now - lastCheckinTime > OVERDUE_THRESHOLD;
        });
      },
    }),
    {
      name: 'cycling-club-storage',
    }
  )
);

export { generateId };
