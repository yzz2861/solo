import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RecycleOrder, RecycleStatus, OpLog, PriceChange } from '../types';
import { genMockOrders } from '../utils/mockData';

interface RecycleState {
  orders: RecycleOrder[];
  addOrder: (order: RecycleOrder) => void;
  updateOrder: (id: string, patch: Partial<RecycleOrder>, log?: Omit<OpLog, 'id' | 'timestamp'>) => void;
  getOrderById: (id: string) => RecycleOrder | undefined;
  changeStatus: (id: string, status: RecycleStatus, log?: Omit<OpLog, 'id' | 'timestamp'>) => void;
  addPriceChange: (id: string, change: Omit<PriceChange, 'id' | 'timestamp'>) => void;
  batchOnShelf: (ids: string[], operator: string, operatorRole: 'staff' | 'manager') => void;
  resetAll: () => void;
}

const genId = () =>
  (crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 10) + Date.now().toString(36));

export const useRecycleStore = create<RecycleState>()(
  persist(
    (set, get) => ({
      orders: genMockOrders(),
      addOrder: (order) =>
        set((s) => ({ orders: [order, ...s.orders] })),
      updateOrder: (id, patch, log) =>
        set((s) => ({
          orders: s.orders.map((o) =>
            o.id === id
              ? {
                  ...o,
                  ...patch,
                  updatedAt: Date.now(),
                  logs: log
                    ? [...o.logs, { ...log, id: genId(), timestamp: Date.now() }]
                    : o.logs,
                }
              : o
          ),
        })),
      getOrderById: (id) => get().orders.find((o) => o.id === id),
      changeStatus: (id, status, log) =>
        set((s) => ({
          orders: s.orders.map((o) =>
            o.id === id
              ? {
                  ...o,
                  status,
                  updatedAt: Date.now(),
                  logs: log
                    ? [...o.logs, { ...log, id: genId(), timestamp: Date.now() }]
                    : o.logs,
                }
              : o
          ),
        })),
      addPriceChange: (id, change) => {
        const fullChange: PriceChange = { ...change, id: genId(), timestamp: Date.now() };
        set((s) => ({
          orders: s.orders.map((o) =>
            o.id === id
              ? {
                  ...o,
                  priceHistory: [...o.priceHistory, fullChange],
                  finalPrice: change.newPrice,
                  updatedAt: Date.now(),
                }
              : o
          ),
        }));
      },
      batchOnShelf: (ids, operator, operatorRole) =>
        set((s) => ({
          orders: s.orders.map((o) => {
            if (!ids.includes(o.id)) return o;
            return {
              ...o,
              status: 'on_shelf' as RecycleStatus,
              updatedAt: Date.now(),
              logs: [
                ...o.logs,
                {
                  id: genId(),
                  timestamp: Date.now(),
                  action: '上架',
                  operator,
                  operatorRole,
                },
              ],
            };
          }),
        })),
      resetAll: () => set({ orders: genMockOrders() }),
    }),
    { name: 'recycle-order-store-v1', partialize: (s) => ({ orders: s.orders }) }
  )
);
