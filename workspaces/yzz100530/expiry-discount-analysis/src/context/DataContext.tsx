import { createContext, useContext, useState, useMemo } from 'react';
import type { ReactNode } from 'react';
import type {
  InventoryRecord,
  DiscountRecord,
  SalesRecord,
  LossRecord,
  DiscountPerformance,
  CategoryAnalysis,
  StoreAnalysis,
  DataQualityIssue,
} from '../types';
import {
  mockInventory,
  mockDiscounts,
  mockSales,
  mockLosses,
  stores,
  categories,
} from '../data/mockData';
import {
  analyzeDiscountPerformance,
  analyzeByCategory,
  analyzeByStore,
  checkDataQuality,
} from '../utils/analysis';

interface DataContextType {
  inventory: InventoryRecord[];
  discounts: DiscountRecord[];
  sales: SalesRecord[];
  losses: LossRecord[];
  stores: typeof stores;
  categories: typeof categories;
  performance: DiscountPerformance[];
  categoryAnalysis: CategoryAnalysis[];
  storeAnalysis: StoreAnalysis[];
  dataQualityIssues: DataQualityIssue[];
  selectedStore: string;
  setSelectedStore: (store: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  notesMap: Map<string, string>;
  updateNote: (key: string, note: string) => void;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [inventory] = useState<InventoryRecord[]>(mockInventory);
  const [discounts] = useState<DiscountRecord[]>(mockDiscounts);
  const [sales] = useState<SalesRecord[]>(mockSales);
  const [losses] = useState<LossRecord[]>(mockLosses);
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [notesMap, setNotesMap] = useState<Map<string, string>>(new Map());

  const performance = useMemo(() => {
    let perf = analyzeDiscountPerformance(inventory, discounts, sales, losses);
    if (selectedStore !== 'all') {
      perf = perf.filter((p) => p.storeId === selectedStore);
    }
    if (selectedCategory !== 'all') {
      perf = perf.filter((p) => p.category === selectedCategory);
    }
    return perf;
  }, [inventory, discounts, sales, losses, selectedStore, selectedCategory]);

  const categoryAnalysis = useMemo(() => {
    let perf = performance;
    if (selectedStore !== 'all') {
      perf = perf.filter((p) => p.storeId === selectedStore);
    }
    return analyzeByCategory(perf, losses);
  }, [performance, losses, selectedStore]);

  const storeAnalysis = useMemo(() => {
    let perf = performance;
    if (selectedCategory !== 'all') {
      perf = perf.filter((p) => p.category === selectedCategory);
    }
    return analyzeByStore(perf);
  }, [performance, selectedCategory]);

  const dataQualityIssues = useMemo(() => {
    return checkDataQuality(inventory, discounts, sales, losses);
  }, [inventory, discounts, sales, losses]);

  const updateNote = (key: string, note: string) => {
    setNotesMap((prev) => {
      const next = new Map(prev);
      next.set(key, note);
      return next;
    });
  };

  return (
    <DataContext.Provider
      value={{
        inventory,
        discounts,
        sales,
        losses,
        stores,
        categories,
        performance,
        categoryAnalysis,
        storeAnalysis,
        dataQualityIssues,
        selectedStore,
        setSelectedStore,
        selectedCategory,
        setSelectedCategory,
        notesMap,
        updateNote,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) {
    throw new Error('useData must be used within a DataProvider');
  }
  return ctx;
}
