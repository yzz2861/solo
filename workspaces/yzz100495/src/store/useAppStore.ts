import { create } from 'zustand';
import type { Order, Batch, Customer, AppConfig, Warning, ViewMode, OrderFormData, OrderItem } from '@/types';
import { storage, generateId } from '@/utils/storage';
import { initializeMockData, defaultConfig } from '@/data/mockData';
import { OrderValidator } from '@/utils/orderValidator';
import { BatchAllocator } from '@/utils/batchAllocator';
import { getTimeSlot, isSameDay } from '@/utils/dateUtils';

interface AppState {
  orders: Order[];
  batches: Batch[];
  customers: Customer[];
  config: AppConfig;
  currentView: ViewMode;
  selectedDate: string;
  selectedBatchId: string | null;
  warnings: Warning[];
  isLoading: boolean;
  showOrderModal: boolean;
  editingOrder: Order | null;
}

interface AppActions {
  initializeData: () => void;
  setCurrentView: (view: ViewMode) => void;
  setSelectedDate: (date: string) => void;
  setSelectedBatchId: (id: string | null) => void;
  setShowOrderModal: (show: boolean) => void;
  setEditingOrder: (order: Order | null) => void;
  addOrder: (formData: OrderFormData) => { warnings: Warning[]; order?: Order };
  updateOrder: (id: string, formData: Partial<OrderFormData>) => void;
  deleteOrder: (id: string) => void;
  markNoShow: (id: string, reschedule?: boolean) => void;
  updateOrderStatus: (id: string, status: Order['status']) => void;
  addBatch: (batch: Batch) => void;
  updateBatch: (id: string, batch: Partial<Batch>) => void;
  allocateBatch: (orderId: string, batchId: string) => void;
  updateConfig: (config: Partial<AppConfig>) => void;
  addWarning: (warning: Warning) => void;
  clearWarnings: () => void;
  validateOrder: (formData: OrderFormData) => Warning[];
  getOrdersByDate: (date: string) => Order[];
  getBatchesByDate: (date: string) => Batch[];
}

const loadFromStorage = (): Partial<AppState> => {
  const hasData = storage.checkVersion();
  if (hasData) {
    const orders = storage.getOrders();
    const batches = storage.getBatches();
    const customers = storage.getCustomers();
    const config = storage.getConfig();
    
    if (orders.length > 0) {
      return {
        orders,
        batches,
        customers,
        config: config || defaultConfig,
      };
    }
  }
  return {};
};

const persistToStorage = (state: Partial<AppState>) => {
  if (state.orders) storage.saveOrders(state.orders);
  if (state.batches) storage.saveBatches(state.batches);
  if (state.customers) storage.saveCustomers(state.customers);
  if (state.config) storage.saveConfig(state.config);
};

export const useAppStore = create<AppState & AppActions>((set, get) => {
  const storedData = loadFromStorage();
  const mockData = initializeMockData();
  
  const initialState: AppState = {
    orders: storedData.orders || mockData.orders,
    batches: storedData.batches || mockData.batches,
    customers: storedData.customers || mockData.customers,
    config: storedData.config || mockData.config,
    currentView: 'calendar',
    selectedDate: new Date().toISOString().split('T')[0],
    selectedBatchId: null,
    warnings: [],
    isLoading: false,
    showOrderModal: false,
    editingOrder: null,
  };

  return {
    ...initialState,

    initializeData: () => {
      const storedData = loadFromStorage();
      if (Object.keys(storedData).length > 0) {
        set(storedData);
      }
    },

    setCurrentView: (view) => {
      set({ currentView: view });
    },

    setSelectedDate: (date) => {
      set({ selectedDate: date });
    },

    setSelectedBatchId: (id) => {
      set({ selectedBatchId: id });
    },

    setShowOrderModal: (show) => {
      set({ showOrderModal: show, editingOrder: null });
    },

    setEditingOrder: (order) => {
      set({ editingOrder: order, showOrderModal: true });
    },

    validateOrder: (formData) => {
      const state = get();
      const timeSlot = getTimeSlot(formData.pickupTime, state.config.timeSlotDuration);
      
      const items: OrderItem[] = formData.items.map(item => ({
        id: generateId(),
        ...item,
      }));
      
      return OrderValidator.validate({
        orders: state.orders,
        config: state.config,
        customerPhone: formData.customerPhone,
        pickupDate: formData.pickupDate,
        timeSlot,
        isPaid: formData.isPaid,
        items,
      });
    },

    addOrder: (formData) => {
      const state = get();
      const warnings = get().validateOrder(formData);
      
      const hasError = warnings.some(w => w.severity === 'error');
      if (hasError) {
        return { warnings };
      }
      
      const timeSlot = getTimeSlot(formData.pickupTime, state.config.timeSlotDuration);
      const items: OrderItem[] = formData.items.map(item => ({
        id: generateId(),
        ...item,
      }));
      
      let customer = state.customers.find(c => c.phone === formData.customerPhone);
      if (!customer) {
        customer = {
          id: generateId(),
          name: formData.customerName,
          phone: formData.customerPhone,
          noShowCount: 0,
          createdAt: new Date().toISOString(),
        };
        set({ customers: [...state.customers, customer] });
      }
      
      const batch = BatchAllocator.allocateBatch(
        formData.pickupDate,
        formData.pickupTime,
        items,
        state.batches,
        state.config
      );
      
      let batches = state.batches;
      let batchId: string | null = null;
      
      if (batch) {
        const updatedBatch = BatchAllocator.updateBatchSummary(batch, items, true);
        if (!batches.find(b => b.id === batch.id)) {
          batches = [...batches, batch];
        }
        batches = batches.map(b => b.id === updatedBatch.id ? updatedBatch : b);
        batchId = updatedBatch.id;
      }
      
      const order: Order = {
        id: generateId(),
        customerId: customer.id,
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        pickupDate: formData.pickupDate,
        pickupTime: formData.pickupTime,
        timeSlot,
        status: formData.isPaid ? 'paid' : 'pending',
        isPaid: formData.isPaid,
        specialRequest: formData.specialRequest,
        batchId,
        items,
        noShowHistory: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      const newState = {
        orders: [...state.orders, order],
        batches,
        warnings,
      };
      
      set(newState);
      persistToStorage(newState);
      
      return { warnings, order };
    },

    updateOrder: (id, formData) => {
      const state = get();
      const order = state.orders.find(o => o.id === id);
      if (!order) return;
      
      const newItems: OrderItem[] = formData.items
        ? formData.items.map(item => ({ id: generateId(), ...item }))
        : order.items;
      
      const newPickupDate = formData.pickupDate || order.pickupDate;
      const newPickupTime = formData.pickupTime || order.pickupTime;
      const newTimeSlot = formData.pickupTime
        ? getTimeSlot(formData.pickupTime, state.config.timeSlotDuration)
        : order.timeSlot;
      
      const isDateOrTimeChanged = 
        formData.pickupDate !== undefined || 
        formData.pickupTime !== undefined;
      const isItemsChanged = formData.items !== undefined;
      
      let batches = [...state.batches];
      let newBatchId: string | null = order.batchId;
      
      if (isDateOrTimeChanged) {
        if (order.batchId) {
          const oldBatch = batches.find(b => b.id === order.batchId);
          if (oldBatch) {
            const updatedOldBatch = BatchAllocator.updateBatchSummary(oldBatch, order.items, false);
            batches = batches.map(b => b.id === updatedOldBatch.id ? updatedOldBatch : b);
          }
        }
        
        const newBatch = BatchAllocator.allocateBatch(
          newPickupDate,
          newPickupTime,
          newItems,
          batches,
          state.config
        );
        
        if (newBatch) {
          if (!batches.find(b => b.id === newBatch.id)) {
            batches = [...batches, newBatch];
          }
          const updatedNewBatch = BatchAllocator.updateBatchSummary(newBatch, newItems, true);
          batches = batches.map(b => b.id === updatedNewBatch.id ? updatedNewBatch : b);
          newBatchId = updatedNewBatch.id;
        } else {
          newBatchId = null;
        }
      } else if (isItemsChanged && order.batchId) {
        const currentBatch = batches.find(b => b.id === order.batchId);
        if (currentBatch) {
          let updatedBatch = BatchAllocator.updateBatchSummary(currentBatch, order.items, false);
          updatedBatch = BatchAllocator.updateBatchSummary(updatedBatch, newItems, true);
          batches = batches.map(b => b.id === updatedBatch.id ? updatedBatch : b);
        }
      }
      
      const updatedOrder: Order = {
        ...order,
        ...formData,
        items: newItems,
        timeSlot: newTimeSlot,
        batchId: newBatchId,
        pickupDate: newPickupDate,
        pickupTime: newPickupTime,
        status: formData.isPaid !== undefined 
          ? (formData.isPaid ? 'paid' : 'pending') 
          : order.status,
        updatedAt: new Date().toISOString(),
      };
      
      const newState = {
        orders: state.orders.map(o => o.id === id ? updatedOrder : o),
        batches,
      };
      set(newState);
      persistToStorage(newState);
    },

    deleteOrder: (id) => {
      const state = get();
      const order = state.orders.find(o => o.id === id);
      
      if (order && order.batchId) {
        const batch = state.batches.find(b => b.id === order.batchId);
        if (batch) {
          const updatedBatch = BatchAllocator.updateBatchSummary(batch, order.items, false);
          set({
            batches: state.batches.map(b => b.id === updatedBatch.id ? updatedBatch : b),
          });
        }
      }
      
      const newState = {
        orders: state.orders.filter(o => o.id !== id),
      };
      set(newState);
      persistToStorage(newState);
    },

    markNoShow: (id, reschedule = false) => {
      const state = get();
      const order = state.orders.find(o => o.id === id);
      if (!order) return;
      
      const customer = state.customers.find(c => c.id === order.customerId);
      if (customer) {
        set({
          customers: state.customers.map(c => 
            c.id === customer.id 
              ? { ...c, noShowCount: c.noShowCount + 1 }
              : c
          ),
        });
      }
      
      const updatedOrder: Order = {
        ...order,
        status: 'noShow',
        noShowHistory: reschedule ? [...order.noShowHistory, order.id] : order.noShowHistory,
        updatedAt: new Date().toISOString(),
      };
      
      const newState = {
        orders: state.orders.map(o => o.id === id ? updatedOrder : o),
      };
      set(newState);
      persistToStorage(newState);
    },

    updateOrderStatus: (id, status) => {
      const state = get();
      const newState = {
        orders: state.orders.map(o => 
          o.id === id ? { ...o, status, updatedAt: new Date().toISOString() } : o
        ),
      };
      set(newState);
      persistToStorage(newState);
    },

    addBatch: (batch) => {
      const state = get();
      const newState = { batches: [...state.batches, batch] };
      set(newState);
      persistToStorage(newState);
    },

    updateBatch: (id, batch) => {
      const state = get();
      const newState = {
        batches: state.batches.map(b => b.id === id ? { ...b, ...batch } : b),
      };
      set(newState);
      persistToStorage(newState);
    },

    allocateBatch: (orderId, batchId) => {
      const state = get();
      const order = state.orders.find(o => o.id === orderId);
      const batch = state.batches.find(b => b.id === batchId);
      
      if (!order || !batch) return;
      
      if (order.batchId) {
        const oldBatch = state.batches.find(b => b.id === order.batchId);
        if (oldBatch) {
          const updatedOldBatch = BatchAllocator.updateBatchSummary(oldBatch, order.items, false);
          set({
            batches: state.batches.map(b => b.id === updatedOldBatch.id ? updatedOldBatch : b),
          });
        }
      }
      
      const updatedBatch = BatchAllocator.updateBatchSummary(batch, order.items, true);
      
      const newState = {
        orders: state.orders.map(o => 
          o.id === orderId ? { ...o, batchId, updatedAt: new Date().toISOString() } : o
        ),
        batches: state.batches.map(b => b.id === batchId ? updatedBatch : b),
      };
      set(newState);
      persistToStorage(newState);
    },

    updateConfig: (config) => {
      const state = get();
      const newState = { config: { ...state.config, ...config } };
      set(newState);
      persistToStorage(newState);
    },

    addWarning: (warning) => {
      set(state => ({ warnings: [...state.warnings, warning] }));
    },

    clearWarnings: () => {
      set({ warnings: [] });
    },

    getOrdersByDate: (date) => {
      return get().orders.filter(o => isSameDay(o.pickupDate, date));
    },

    getBatchesByDate: (date) => {
      return get().batches.filter(b => b.bakingDate === date);
    },
  };
});
