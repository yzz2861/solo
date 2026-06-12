import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Plan, RoomParams, CoolingResult, ReportView } from '@/types';
import { DEFAULT_PARAMS } from '@/utils/constants';
import { calculateCoolingLoad } from '@/utils/coolingLoad';
import { validateParams } from '@/utils/validation';
import type { WarningItem } from '@/types';

interface CalculatorState {
  params: RoomParams;
  result: CoolingResult;
  warnings: WarningItem[];
  reportView: ReportView;
  setParams: (params: Partial<RoomParams>) => void;
  resetParams: () => void;
  setReportView: (view: ReportView) => void;
  recalculate: () => void;
}

interface PlanState {
  plans: Plan[];
  savePlan: (name: string, params: RoomParams, result: CoolingResult) => void;
  deletePlan: (id: string) => void;
  loadPlan: (id: string) => { params: RoomParams; result: CoolingResult } | null;
  clearAllPlans: () => void;
}

export const useCalculatorStore = create<CalculatorState>((set, get) => ({
  params: { ...DEFAULT_PARAMS },
  result: calculateCoolingLoad(DEFAULT_PARAMS),
  warnings: validateParams(DEFAULT_PARAMS),
  reportView: 'admin',

  setParams: (newParams) => {
    const updated = { ...get().params, ...newParams };
    const result = calculateCoolingLoad(updated);
    const warnings = validateParams(updated);
    set({ params: updated, result, warnings });
  },

  resetParams: () => {
    set({
      params: { ...DEFAULT_PARAMS },
      result: calculateCoolingLoad(DEFAULT_PARAMS),
      warnings: validateParams(DEFAULT_PARAMS),
    });
  },

  setReportView: (view) => {
    set({ reportView: view });
  },

  recalculate: () => {
    const { params } = get();
    const result = calculateCoolingLoad(params);
    const warnings = validateParams(params);
    set({ result, warnings });
  },
}));

export const usePlanStore = create<PlanState>()(
  persist(
    (set, get) => ({
      plans: [],

      savePlan: (name, params, result) => {
        const newPlan: Plan = {
          id: `plan_${Date.now()}`,
          name: name || `方案 ${get().plans.length + 1}`,
          params: { ...params },
          result: { ...result },
          createdAt: Date.now(),
        };
        set({ plans: [...get().plans, newPlan] });
      },

      deletePlan: (id) => {
        set({ plans: get().plans.filter((p) => p.id !== id) });
      },

      loadPlan: (id) => {
        const plan = get().plans.find((p) => p.id === id);
        if (plan) {
          return { params: plan.params, result: plan.result };
        }
        return null;
      },

      clearAllPlans: () => {
        set({ plans: [] });
      },
    }),
    {
      name: 'cooling-load-plans',
    }
  )
);
