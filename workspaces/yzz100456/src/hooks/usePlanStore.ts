import { create } from 'zustand';
import type { LiftPlan, CraneSpec, CargoSpec, Zone, LiftOperation, RiskItem, HandoverRecord } from '@/types';
import { DEMO_PLAN, CRANE_PRESETS } from '@/utils/mockData';
import { useIndexedDB } from './useIndexedDB';

interface PlanState {
  currentPlan: LiftPlan;
  loadedPlanId: string | null;
  plans: LiftPlan[];
  handover: HandoverRecord | null;
  canvasRef: HTMLCanvasElement | null;

  updateCrane: (crane: Partial<CraneSpec>) => void;
  updateCargo: (cargo: Partial<CargoSpec>) => void;
  updateZones: (zones: Zone[]) => void;
  addZone: (zone: Zone) => void;
  removeZone: (id: string) => void;
  updateOperations: (operations: LiftOperation[]) => void;
  addOperation: (op: LiftOperation) => void;
  updateOperation: (id: string, patch: Partial<LiftOperation>) => void;
  removeOperation: (id: string) => void;
  updateWindSpeed: (v: number) => void;
  updateRemarks: (r: string) => void;
  updateName: (n: string) => void;
  setRisks: (risks: RiskItem[]) => void;
  setCanvasRef: (c: HTMLCanvasElement | null) => void;
  setScreenshot: (dataUrl: string) => void;

  loadPlansFromDB: () => Promise<void>;
  loadPlan: (id: string) => Promise<void>;
  saveCurrentPlan: () => Promise<void>;
  newPlan: () => void;
  deletePlan: (id: string) => Promise<void>;

  loadHandover: (planId: string) => Promise<void>;
  confirmHandover: (userId: string, userName: string, role: string) => Promise<void>;
  lockHandover: () => Promise<void>;
}

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const clonePlan = (p: LiftPlan): LiftPlan => JSON.parse(JSON.stringify(p));

const buildDefaultPlan = (): LiftPlan => {
  const demo = clonePlan(DEMO_PLAN);
  return {
    ...demo,
    id: uid(),
    planNo: 'DZ' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Math.floor(Math.random() * 900 + 100),
    createTime: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
    name: '新建吊装方案',
    createUser: '当前安全员',
    version: 1,
    locked: false,
    risks: [],
    crane: {
      ...demo.crane,
      brand: CRANE_PRESETS[1].brand,
    },
  };
};

export const usePlanStore = create<PlanState>((set, get) => {
  const db = useIndexedDB();

  return {
    currentPlan: buildDefaultPlan(),
    loadedPlanId: null,
    plans: [],
    handover: null,
    canvasRef: null,

    updateCrane: (crane) =>
      set((s) => ({ currentPlan: { ...s.currentPlan, crane: { ...s.currentPlan.crane, ...crane } } })),
    updateCargo: (cargo) =>
      set((s) => ({ currentPlan: { ...s.currentPlan, cargo: { ...s.currentPlan.cargo, ...cargo } } })),
    updateZones: (zones) => set((s) => ({ currentPlan: { ...s.currentPlan, zones } })),
    addZone: (zone) => set((s) => ({ currentPlan: { ...s.currentPlan, zones: [...s.currentPlan.zones, zone] } })),
    removeZone: (id) =>
      set((s) => ({ currentPlan: { ...s.currentPlan, zones: s.currentPlan.zones.filter((z) => z.id !== id) } })),
    updateOperations: (operations) => set((s) => ({ currentPlan: { ...s.currentPlan, operations } })),
    addOperation: (op) => set((s) => ({ currentPlan: { ...s.currentPlan, operations: [...s.currentPlan.operations, op] } })),
    updateOperation: (id, patch) =>
      set((s) => ({
        currentPlan: {
          ...s.currentPlan,
          operations: s.currentPlan.operations.map((o) => (o.id === id ? { ...o, ...patch } : o)),
        },
      })),
    removeOperation: (id) =>
      set((s) => ({ currentPlan: { ...s.currentPlan, operations: s.currentPlan.operations.filter((o) => o.id !== id) } })),
    updateWindSpeed: (windSpeed) => set((s) => ({ currentPlan: { ...s.currentPlan, windSpeed } })),
    updateRemarks: (remarks) => set((s) => ({ currentPlan: { ...s.currentPlan, remarks } })),
    updateName: (name) => set((s) => ({ currentPlan: { ...s.currentPlan, name } })),
    setRisks: (risks) => set((s) => ({ currentPlan: { ...s.currentPlan, risks } })),
    setCanvasRef: (canvasRef) => set({ canvasRef }),
    setScreenshot: (screenshot) => set((s) => ({ currentPlan: { ...s.currentPlan, screenshot } })),

    loadPlansFromDB: async () => {
      const all = await db.getAllPlans();
      set({ plans: all });
    },

    loadPlan: async (id) => {
      const p = await db.getPlan(id);
      if (p) {
        set({ currentPlan: clonePlan(p), loadedPlanId: id });
      }
    },

    saveCurrentPlan: async () => {
      const plan = get().currentPlan;
      const toSave = clonePlan(plan);
      if (!toSave.planNo) {
        toSave.planNo =
          'DZ' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Math.floor(Math.random() * 900 + 100);
      }
      toSave.createTime = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-');
      if (get().loadedPlanId === toSave.id) {
        toSave.version += 1;
      }
      await db.savePlan(toSave);
      set({ currentPlan: clonePlan(toSave), loadedPlanId: toSave.id });
      await get().loadPlansFromDB();
    },

    newPlan: () => {
      set({ currentPlan: buildDefaultPlan(), loadedPlanId: null });
    },

    deletePlan: async (id) => {
      await db.deletePlan(id);
      await get().loadPlansFromDB();
      if (get().loadedPlanId === id) {
        set({ currentPlan: buildDefaultPlan(), loadedPlanId: null });
      }
    },

    loadHandover: async (planId) => {
      const rec = await db.getHandover(planId);
      const plan = get().currentPlan;
      set({
        handover:
          rec ??
          ({
            planId,
            version: plan.version,
            confirmations: [],
            locked: false,
          } as HandoverRecord),
      });
    },

    confirmHandover: async (userId, userName, role) => {
      const { handover } = get();
      if (!handover || handover.locked) return;
      const exists = handover.confirmations.find((c) => c.userId === userId);
      if (exists) return;
      const next: HandoverRecord = {
        ...handover,
        confirmations: [
          ...handover.confirmations,
          {
            userId,
            userName,
            role,
            time: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
          },
        ],
      };
      set({ handover: next });
      await db.saveHandover(next);
    },

    lockHandover: async () => {
      const { handover } = get();
      if (!handover) return;
      const next = { ...handover, locked: true };
      set({ handover: next, currentPlan: { ...get().currentPlan, locked: true } });
      await db.saveHandover(next);
      await db.savePlan({ ...get().currentPlan, locked: true });
    },
  };
});
