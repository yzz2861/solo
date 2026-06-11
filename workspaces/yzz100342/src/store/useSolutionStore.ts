import { create } from 'zustand';
import type { Solution, GiftRule, CartItem } from '@/types';
import {
  loadSolutions,
  saveSolutions,
  loadActiveSolutionId,
  saveActiveSolutionId,
  generateId,
} from '@/utils/storage';

interface SolutionState {
  solutions: Solution[];
  activeId: string | null;
  createSolution: (name?: string) => Solution;
  setActive: (id: string) => void;
  deleteSolution: (id: string) => void;
  renameSolution: (id: string, name: string) => void;
  saveAll: () => void;
  updateActive: (updater: (s: Solution) => Solution) => void;
  addRule: (rule: Omit<GiftRule, 'id'>) => void;
  updateRule: (id: string, patch: Partial<GiftRule>) => void;
  deleteRule: (id: string) => void;
  addCartItem: (item: Omit<CartItem, 'id'>) => void;
  updateCartItem: (id: string, patch: Partial<CartItem>) => void;
  deleteCartItem: (id: string) => void;
  setCoupon: (amount: number) => void;
  setOrderNumber: (num: number) => void;
  getActive: () => Solution | null;
}

function createDefaultSolution(name = '直播赠品方案'): Solution {
  return {
    id: generateId(),
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    rules: [
      {
        id: generateId(),
        name: '满199送定制马克杯',
        type: 'threshold',
        priority: 10,
        thresholdAmount: 199,
        useCoupon: true,
        excludeBundle: true,
        giftId: generateId(),
        giftName: '定制马克杯',
        giftStock: 500,
        giftPerOrder: 1,
        enabled: true,
      },
      {
        id: generateId(),
        name: '前200单送香薰小样',
        type: 'limit_first',
        priority: 5,
        limitCount: 200,
        giftId: generateId(),
        giftName: '香薰小样',
        giftStock: 200,
        giftPerOrder: 1,
        enabled: true,
      },
    ],
    cart: [
      { id: generateId(), name: '水乳套装', price: 299, quantity: 1, isBundle: true },
      { id: generateId(), name: '精华液', price: 99, quantity: 1, isBundle: false },
    ],
    couponAmount: 20,
    orderNumber: 45,
  };
}

export const useSolutionStore = create<SolutionState>((set, get) => ({
  solutions: [],
  activeId: null,

  getActive: () => {
    const { solutions, activeId } = get();
    return solutions.find((s) => s.id === activeId) ?? null;
  },

  createSolution: (name) => {
    const solution = createDefaultSolution(name);
    set((state) => ({
      solutions: [...state.solutions, solution],
      activeId: solution.id,
    }));
    get().saveAll();
    return solution;
  },

  setActive: (id) => {
    set({ activeId: id });
    saveActiveSolutionId(id);
  },

  deleteSolution: (id) => {
    set((state) => {
      const solutions = state.solutions.filter((s) => s.id !== id);
      const activeId = state.activeId === id ? (solutions[0]?.id ?? null) : state.activeId;
      return { solutions, activeId };
    });
    get().saveAll();
  },

  renameSolution: (id, name) => {
    set((state) => ({
      solutions: state.solutions.map((s) =>
        s.id === id ? { ...s, name, updatedAt: Date.now() } : s,
      ),
    }));
    get().saveAll();
  },

  saveAll: () => {
    const { solutions, activeId } = get();
    saveSolutions(solutions);
    saveActiveSolutionId(activeId);
  },

  updateActive: (updater) => {
    set((state) => ({
      solutions: state.solutions.map((s) =>
        s.id === state.activeId ? { ...updater(s), updatedAt: Date.now() } : s,
      ),
    }));
  },

  addRule: (rule) => {
    get().updateActive((s) => ({
      ...s,
      rules: [...s.rules, { ...rule, id: generateId() }],
    }));
    get().saveAll();
  },

  updateRule: (id, patch) => {
    get().updateActive((s) => ({
      ...s,
      rules: s.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
    get().saveAll();
  },

  deleteRule: (id) => {
    get().updateActive((s) => ({
      ...s,
      rules: s.rules.filter((r) => r.id !== id),
    }));
    get().saveAll();
  },

  addCartItem: (item) => {
    get().updateActive((s) => ({
      ...s,
      cart: [...s.cart, { ...item, id: generateId() }],
    }));
    get().saveAll();
  },

  updateCartItem: (id, patch) => {
    get().updateActive((s) => ({
      ...s,
      cart: s.cart.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
    get().saveAll();
  },

  deleteCartItem: (id) => {
    get().updateActive((s) => ({
      ...s,
      cart: s.cart.filter((c) => c.id !== id),
    }));
    get().saveAll();
  },

  setCoupon: (amount) => {
    get().updateActive((s) => ({ ...s, couponAmount: amount }));
    get().saveAll();
  },

  setOrderNumber: (num) => {
    get().updateActive((s) => ({ ...s, orderNumber: num }));
    get().saveAll();
  },
}));

export function initializeStore() {
  const savedSolutions = loadSolutions();
  const savedActive = loadActiveSolutionId();

  if (savedSolutions.length > 0) {
    const activeId =
      savedActive && savedSolutions.some((s) => s.id === savedActive)
        ? savedActive
        : savedSolutions[0].id;
    useSolutionStore.setState({ solutions: savedSolutions, activeId });
  } else {
    const defaultSolution = createDefaultSolution('618 直播赠品方案');
    useSolutionStore.setState({
      solutions: [defaultSolution],
      activeId: defaultSolution.id,
    });
    useSolutionStore.getState().saveAll();
  }
}
