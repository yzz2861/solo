import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WeddingCarOrder, FlowerItem, Florist, Alert, OrderStatus, UserRole, OrderFlower } from '@/types';
import { seedOrders, seedFlowers, seedFlorists, todayStr } from '@/data/seedData';
import { uid } from '@/utils/dateUtils';
import { computeOrderCost, generateAlerts } from '@/utils/validators';

export type NewOrderInput = Omit<WeddingCarOrder, 'id' | 'createdAt' | 'updatedAt' | 'costTotal' | 'anomalies' | 'status'> & {
  status?: OrderStatus;
};

interface AppState {
  orders: WeddingCarOrder[];
  flowers: FlowerItem[];
  florists: Florist[];
  formDraft: Partial<WeddingCarOrder>;
  alerts: Alert[];
  selectedDate: string;
  currentRole: UserRole;
  inventoryModalOpen: boolean;
  alertCenterOpen: boolean;

  addOrder: (input: NewOrderInput) => WeddingCarOrder;
  updateOrder: (id: string, patch: Partial<WeddingCarOrder>) => void;
  updateOrderStatus: (id: string, status: OrderStatus) => void;
  deleteOrder: (id: string) => void;
  recordDriverArrival: (id: string) => void;

  updateStock: (flowerId: string, delta: number) => void;
  addFlower: (f: Omit<FlowerItem, 'id'>) => void;
  updateFlower: (id: string, patch: Partial<FlowerItem>) => void;

  saveDraft: (draft: Partial<WeddingCarOrder>) => void;
  clearDraft: () => void;

  refreshAlerts: () => void;
  resolveAlert: (alertId: string) => void;

  setSelectedDate: (date: string) => void;
  setRole: (role: UserRole) => void;
  setInventoryModalOpen: (open: boolean) => void;
  setAlertCenterOpen: (open: boolean) => void;

  resetAll: () => void;
}

const hydrateWithDefaults = () => {
  try {
    const stored = localStorage.getItem('wedding-car-store');
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        orders: parsed.state?.orders || seedOrders,
        flowers: parsed.state?.flowers || seedFlowers,
        florists: parsed.state?.florists || seedFlorists,
      };
    }
  } catch (_e) {}
  return { orders: seedOrders, flowers: seedFlowers, florists: seedFlorists };
};

const initialData = hydrateWithDefaults();

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      orders: initialData.orders,
      flowers: initialData.flowers,
      florists: initialData.florists,
      formDraft: {},
      alerts: [],
      selectedDate: todayStr(),
      currentRole: 'manager',
      inventoryModalOpen: false,
      alertCenterOpen: false,

      addOrder: (input) => {
        const now = Date.now();
        const costTotal = computeOrderCost(input.flowers, get().flowers);
        const newOrder: WeddingCarOrder = {
          id: 'o_' + uid(),
          status: input.status || 'pending',
          costTotal,
          anomalies: [],
          createdAt: now,
          updatedAt: now,
          ...input,
        };
        set(s => ({ orders: [newOrder, ...s.orders] }));
        get().refreshAlerts();
        return newOrder;
      },

      updateOrder: (id, patch) => {
        set(s => {
          const newFlowers = patch.flowers;
          return {
            orders: s.orders.map(o => {
              if (o.id !== id) return o;
              const updated: WeddingCarOrder = { ...o, ...patch, updatedAt: Date.now() };
              if (newFlowers) {
                updated.costTotal = computeOrderCost(newFlowers, s.flowers);
              }
              return updated;
            }),
          };
        });
        get().refreshAlerts();
      },

      updateOrderStatus: (id, status) => {
        const nowHM = (): string => {
          const d = new Date();
          return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        };
        set(s => ({
          orders: s.orders.map(o => {
            if (o.id !== id) return o;
            const patch: Partial<WeddingCarOrder> = { status, updatedAt: Date.now() };
            if (status === 'in_progress' && !o.startedAt) patch.startedAt = nowHM();
            if (status === 'delivered') {
              if (!o.finishedAt) patch.finishedAt = nowHM();
              patch.deliveredAt = nowHM();
            }
            return { ...o, ...patch };
          }),
        }));
        get().refreshAlerts();
      },

      deleteOrder: (id) => {
        set(s => ({ orders: s.orders.filter(o => o.id !== id) }));
        get().refreshAlerts();
      },

      recordDriverArrival: (id) => {
        const d = new Date();
        const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        set(s => ({
          orders: s.orders.map(o => {
            if (o.id !== id) return o;
            const anomalies = [...o.anomalies];
            if (!o.driverArrivedTime && o.status !== 'delivered' && !o.finishedAt) {
              anomalies.push(`司机于${hm}提前到店`);
            }
            return { ...o, driverArrivedTime: hm, anomalies, updatedAt: Date.now() };
          }),
        }));
        get().refreshAlerts();
      },

      updateStock: (flowerId, delta) => {
        set(s => ({
          flowers: s.flowers.map(f =>
            f.id === flowerId ? { ...f, stock: Math.max(0, f.stock + delta) } : f
          ),
        }));
        get().refreshAlerts();
      },

      addFlower: (f) => {
        set(s => ({ flowers: [...s.flowers, { id: 'f_' + uid(), ...f }] }));
        get().refreshAlerts();
      },

      updateFlower: (id, patch) => {
        set(s => ({
          flowers: s.flowers.map(f => (f.id === id ? { ...f, ...patch } : f)),
        }));
        get().refreshAlerts();
      },

      saveDraft: (draft) => set({ formDraft: draft }),
      clearDraft: () => set({ formDraft: {} }),

      refreshAlerts: () => {
        const s = get();
        const alerts = generateAlerts({
          orders: s.orders,
          flowers: s.flowers,
          florists: s.florists,
          today: s.selectedDate,
        });
        set({ alerts });
      },

      resolveAlert: (alertId) => {
        set(s => ({
          alerts: s.alerts.map(a => (a.id === alertId ? { ...a, resolved: true } : a)),
        }));
      },

      setSelectedDate: (date) => {
        set({ selectedDate: date });
        setTimeout(() => get().refreshAlerts(), 0);
      },
      setRole: (role) => set({ currentRole: role }),
      setInventoryModalOpen: (open) => set({ inventoryModalOpen: open }),
      setAlertCenterOpen: (open) => set({ alertCenterOpen: open }),

      resetAll: () => {
        set({
          orders: seedOrders,
          flowers: seedFlowers,
          florists: seedFlorists,
          formDraft: {},
          selectedDate: todayStr(),
        });
        get().refreshAlerts();
      },
    }),
    {
      name: 'wedding-car-store',
      partialize: state => ({
        orders: state.orders,
        flowers: state.flowers,
        florists: state.florists,
        formDraft: state.formDraft,
        selectedDate: state.selectedDate,
        currentRole: state.currentRole,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) setTimeout(() => state.refreshAlerts(), 50);
      },
    }
  )
);
