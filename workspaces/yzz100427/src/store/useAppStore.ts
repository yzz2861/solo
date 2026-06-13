import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Store, SKU, StoreInventory, TransferOrder, LossRecord, OperationLog, AppFilters, TransferItem, InventoryQty } from '@/types';
import { STORES, SKUS, INITIAL_INVENTORIES, INITIAL_TRANSFERS, INITIAL_LOSS_RECORDS, INITIAL_OPERATION_LOGS } from '@/utils/mockData';
import { validateTransfer } from '@/utils/validation';
import { generateId, generateOrderNo } from '@/utils/format';

interface AppState {
  stores: Store[];
  skus: SKU[];
  inventories: StoreInventory[];
  transfers: TransferOrder[];
  currentDraft: TransferOrder | null;
  lossRecords: LossRecord[];
  operationLogs: OperationLog[];
  currentUser: string;
  currentStoreId: string;
  filters: AppFilters;
  showForm: boolean;
  editingTransfer: TransferOrder | null;

  setFilters: (filters: Partial<AppFilters>) => void;
  resetFilters: () => void;
  setShowForm: (show: boolean) => void;
  setEditingTransfer: (transfer: TransferOrder | null) => void;
  setCurrentUser: (user: string) => void;
  setCurrentStoreId: (storeId: string) => void;

  saveDraft: (draft: TransferOrder) => void;
  clearDraft: () => void;

  addTransfer: (order: TransferOrder) => void;
  updateTransfer: (id: string, data: Partial<TransferOrder>) => void;
  completeTransfer: (id: string) => void;
  cancelTransfer: (id: string) => void;

  addLossRecord: (record: LossRecord) => void;
  updateLossRecord: (id: string, data: Partial<LossRecord>) => void;
  deleteLossRecord: (id: string) => void;

  getStoreInventory: (storeId: string, skuId: string) => StoreInventory | undefined;
  validateTransferOrder: (order: TransferOrder) => ReturnType<typeof validateTransfer>;
}

const defaultFilters: AppFilters = {
  storeId: '',
  category: '',
  status: '',
  dateRange: null,
  search: '',
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      stores: STORES,
      skus: SKUS,
      inventories: INITIAL_INVENTORIES,
      transfers: INITIAL_TRANSFERS,
      currentDraft: null,
      lossRecords: INITIAL_LOSS_RECORDS,
      operationLogs: INITIAL_OPERATION_LOGS,
      currentUser: '店员-小刘',
      currentStoreId: 'store-a',
      filters: { ...defaultFilters },
      showForm: false,
      editingTransfer: null,

      setFilters: (filters) =>
        set((state) => ({ filters: { ...state.filters, ...filters } })),
      resetFilters: () => set({ filters: { ...defaultFilters } }),
      setShowForm: (show) => set({ showForm: show }),
      setEditingTransfer: (transfer) => set({ editingTransfer: transfer }),
      setCurrentUser: (user) => set({ currentUser: user }),
      setCurrentStoreId: (storeId) => set({ currentStoreId: storeId }),

      saveDraft: (draft) => {
        set({ currentDraft: draft });
      },
      clearDraft: () => set({ currentDraft: null }),

      addTransfer: (order) =>
        set((state) => {
          const log: OperationLog = {
            id: generateId(),
            orderId: order.id,
            lossId: '',
            action: '创建调拨单',
            operator: state.currentUser,
            timestamp: new Date().toISOString(),
            detail: `创建调拨单 ${order.orderNo}`,
          };
          return {
            transfers: [...state.transfers, order],
            operationLogs: [...state.operationLogs, log],
          };
        }),

      updateTransfer: (id, data) =>
        set((state) => {
          const log: OperationLog = {
            id: generateId(),
            orderId: id,
            lossId: '',
            action: '更新调拨单',
            operator: state.currentUser,
            timestamp: new Date().toISOString(),
            detail: `更新调拨单`,
          };
          return {
            transfers: state.transfers.map((t) =>
              t.id === id ? { ...t, ...data, updatedAt: new Date().toISOString() } : t
            ),
            operationLogs: [...state.operationLogs, log],
          };
        }),

      completeTransfer: (id) =>
        set((state) => {
          const order = state.transfers.find((t) => t.id === id);
          if (!order || order.status === 'completed') return state;

          let newInventories = [...state.inventories];
          for (const item of order.items) {
            const fromInvIdx = newInventories.findIndex(
              (i) => i.storeId === order.fromStoreId && i.skuId === item.skuId
            );
            if (fromInvIdx >= 0) {
              const inv = { ...newInventories[fromInvIdx] };
              inv.quantities = {
                sample: inv.quantities.sample - item.quantities.sample,
                gift: inv.quantities.gift - item.quantities.gift,
                trial: inv.quantities.trial - item.quantities.trial,
                damaged: inv.quantities.damaged - item.quantities.damaged,
              };
              inv.lastUpdated = new Date().toISOString();
              inv.lastOperator = state.currentUser;
              newInventories[fromInvIdx] = inv;
            }

            const toInvIdx = newInventories.findIndex(
              (i) => i.storeId === order.toStoreId && i.skuId === item.skuId
            );
            if (toInvIdx >= 0) {
              const inv = { ...newInventories[toInvIdx] };
              inv.quantities = {
                sample: inv.quantities.sample + item.quantities.sample,
                gift: inv.quantities.gift + item.quantities.gift,
                trial: inv.quantities.trial + item.quantities.trial,
                damaged: inv.quantities.damaged + item.quantities.damaged,
              };
              inv.lastUpdated = new Date().toISOString();
              inv.lastOperator = state.currentUser;
              newInventories[toInvIdx] = inv;
            }
          }

          const log: OperationLog = {
            id: generateId(),
            orderId: id,
            lossId: '',
            action: '完成调拨',
            operator: state.currentUser,
            timestamp: new Date().toISOString(),
            detail: `确认完成调拨单 ${order.orderNo}`,
          };

          return {
            transfers: state.transfers.map((t) =>
              t.id === id
                ? { ...t, status: 'completed' as const, completedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
                : t
            ),
            inventories: newInventories,
            operationLogs: [...state.operationLogs, log],
          };
        }),

      cancelTransfer: (id) =>
        set((state) => {
          const log: OperationLog = {
            id: generateId(),
            orderId: id,
            lossId: '',
            action: '取消调拨',
            operator: state.currentUser,
            timestamp: new Date().toISOString(),
            detail: `取消调拨单`,
          };
          return {
            transfers: state.transfers.map((t) =>
              t.id === id
                ? { ...t, status: 'cancelled' as const, updatedAt: new Date().toISOString() }
                : t
            ),
            operationLogs: [...state.operationLogs, log],
          };
        }),

      addLossRecord: (record) =>
        set((state) => {
          const log: OperationLog = {
            id: generateId(),
            orderId: '',
            lossId: record.id,
            action: '记录损耗',
            operator: state.currentUser,
            timestamp: new Date().toISOString(),
            detail: `记录损耗: ${record.remark || '无备注'}`,
          };
          return {
            lossRecords: [...state.lossRecords, record],
            operationLogs: [...state.operationLogs, log],
          };
        }),

      updateLossRecord: (id, data) =>
        set((state) => ({
          lossRecords: state.lossRecords.map((r) =>
            r.id === id ? { ...r, ...data } : r
          ),
        })),

      deleteLossRecord: (id) =>
        set((state) => ({
          lossRecords: state.lossRecords.filter((r) => r.id !== id),
        })),

      getStoreInventory: (storeId, skuId) => {
        return get().inventories.find(
          (i) => i.storeId === storeId && i.skuId === skuId
        );
      },

      validateTransferOrder: (order) => {
        return validateTransfer(order, get().inventories, get().transfers);
      },
    }),
    {
      name: 'flash-store-inventory',
      partialize: (state) => ({
        inventories: state.inventories,
        transfers: state.transfers,
        currentDraft: state.currentDraft,
        lossRecords: state.lossRecords,
        operationLogs: state.operationLogs,
        currentUser: state.currentUser,
        currentStoreId: state.currentStoreId,
      }),
    }
  )
);
