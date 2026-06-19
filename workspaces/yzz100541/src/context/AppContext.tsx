import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import type {
  UserRole,
  Store,
  SalesRecord,
  WasteRecord,
  OrderPlan,
  DeliveryRecord,
  Category,
  Product,
  Weather,
  DiscountPromotion,
} from '../types';
import {
  stores as mockStores,
  categories as mockCategories,
  products as mockProducts,
  allSalesData,
  allWasteData,
  allOrderPlans,
  allDeliveryData,
  weatherData as mockWeather,
  promotions as mockPromotions,
} from '../data/mockData';
import { generateId } from '../utils/formatters';

interface AppState {
  userRole: UserRole | null;
  currentStoreId: string;
  stores: Store[];
  categories: Category[];
  products: Product[];
  salesData: Record<string, SalesRecord[]>;
  wasteData: Record<string, WasteRecord[]>;
  orderPlans: Record<string, OrderPlan[]>;
  deliveryData: Record<string, DeliveryRecord[]>;
  weatherData: Weather[];
  promotions: DiscountPromotion[];
}

type AppAction =
  | { type: 'SET_USER_ROLE'; payload: UserRole | null }
  | { type: 'SET_CURRENT_STORE'; payload: string }
  | { type: 'ADD_WASTE_RECORD'; payload: { storeId: string; record: WasteRecord } }
  | { type: 'UPDATE_ORDER_PLAN'; payload: { storeId: string; planId: string; updates: Partial<OrderPlan> } }
  | { type: 'CONFIRM_ORDER_PLANS'; payload: string }
  | { type: 'IMPORT_DATA'; payload: Partial<AppState> };

const initialState: AppState = {
  userRole: null,
  currentStoreId: 's001',
  stores: mockStores,
  categories: mockCategories,
  products: mockProducts,
  salesData: allSalesData,
  wasteData: allWasteData,
  orderPlans: allOrderPlans,
  deliveryData: allDeliveryData,
  weatherData: mockWeather,
  promotions: mockPromotions,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USER_ROLE':
      return { ...state, userRole: action.payload };

    case 'SET_CURRENT_STORE':
      return { ...state, currentStoreId: action.payload };

    case 'ADD_WASTE_RECORD': {
      const { storeId, record } = action.payload;
      const storeWaste = state.wasteData[storeId] || [];
      return {
        ...state,
        wasteData: {
          ...state.wasteData,
          [storeId]: [...storeWaste, record],
        },
      };
    }

    case 'UPDATE_ORDER_PLAN': {
      const { storeId, planId, updates } = action.payload;
      const storePlans = state.orderPlans[storeId] || [];
      return {
        ...state,
        orderPlans: {
          ...state.orderPlans,
          [storeId]: storePlans.map(p =>
            p.id === planId ? { ...p, ...updates } : p
          ),
        },
      };
    }

    case 'CONFIRM_ORDER_PLANS': {
      const storeId = action.payload;
      const storePlans = state.orderPlans[storeId] || [];
      return {
        ...state,
        orderPlans: {
          ...state.orderPlans,
          [storeId]: storePlans.map(p => ({ ...p, isConfirmed: true })),
        },
      };
    }

    case 'IMPORT_DATA':
      return { ...state, ...action.payload };

    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  getCurrentStore: () => Store | undefined;
  getStoreSales: (storeId?: string) => SalesRecord[];
  getStoreWaste: (storeId?: string) => WasteRecord[];
  getStoreOrderPlans: (storeId?: string) => OrderPlan[];
  getProductById: (id: string) => Product | undefined;
  getCategoryById: (id: string) => Category | undefined;
  addWasteRecord: (record: Omit<WasteRecord, 'id'>) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    const savedRole = localStorage.getItem('userRole') as UserRole | null;
    const savedStore = localStorage.getItem('currentStoreId');
    if (savedRole) dispatch({ type: 'SET_USER_ROLE', payload: savedRole });
    if (savedStore) dispatch({ type: 'SET_CURRENT_STORE', payload: savedStore });
  }, []);

  useEffect(() => {
    if (state.userRole) localStorage.setItem('userRole', state.userRole);
    else localStorage.removeItem('userRole');
    localStorage.setItem('currentStoreId', state.currentStoreId);
  }, [state.userRole, state.currentStoreId]);

  const getCurrentStore = () => state.stores.find(s => s.id === state.currentStoreId);

  const getStoreSales = (storeId?: string) =>
    state.salesData[storeId || state.currentStoreId] || [];

  const getStoreWaste = (storeId?: string) =>
    state.wasteData[storeId || state.currentStoreId] || [];

  const getStoreOrderPlans = (storeId?: string) =>
    state.orderPlans[storeId || state.currentStoreId] || [];

  const getProductById = (id: string) => state.products.find(p => p.id === id);

  const getCategoryById = (id: string) => state.categories.find(c => c.id === id);

  const addWasteRecord = (record: Omit<WasteRecord, 'id'>) => {
    const newRecord: WasteRecord = {
      ...record,
      id: generateId(),
    };
    dispatch({
      type: 'ADD_WASTE_RECORD',
      payload: { storeId: record.storeId || state.currentStoreId, record: newRecord },
    });
  };

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        getCurrentStore,
        getStoreSales,
        getStoreWaste,
        getStoreOrderPlans,
        getProductById,
        getCategoryById,
        addWasteRecord,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
