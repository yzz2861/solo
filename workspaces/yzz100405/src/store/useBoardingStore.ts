import { create } from 'zustand';
import type {
  PetBoarding,
  FeedingPlan,
  MedicationPlan,
  WalkPlan,
  CareTask,
  Warning,
  TaskStatus,
} from '@/types';

interface BoardingStore {
  boardings: PetBoarding[];
  feedingPlans: FeedingPlan[];
  medicationPlans: MedicationPlan[];
  walkPlans: WalkPlan[];
  tasks: CareTask[];

  addBoarding: (boarding: PetBoarding) => void;
  updateBoarding: (id: string, data: Partial<PetBoarding>) => void;
  removeBoarding: (id: string) => void;

  addFeedingPlan: (plan: FeedingPlan) => void;
  updateFeedingPlan: (id: string, data: Partial<FeedingPlan>) => void;
  removeFeedingPlan: (id: string) => void;

  addMedicationPlan: (plan: MedicationPlan) => void;
  updateMedicationPlan: (id: string, data: Partial<MedicationPlan>) => void;
  removeMedicationPlan: (id: string) => void;

  addWalkPlan: (plan: WalkPlan) => void;
  updateWalkPlan: (id: string, data: Partial<WalkPlan>) => void;
  removeWalkPlan: (id: string) => void;

  addTask: (task: CareTask) => void;
  updateTask: (id: string, data: Partial<CareTask>) => void;
  removeTask: (id: string) => void;
  removeTasksByBoardingId: (boardingId: string) => void;

  completeTask: (id: string) => void;
  markTaskAbnormal: (id: string, reason: string) => void;

  validateBoarding: (boarding: Partial<PetBoarding>, excludeId?: string) => Warning[];
  validatePickup: (boardingId: string, actualPickupDate: string) => Warning[];
  pickupBoarding: (boardingId: string, actualPickupDate: string) => void;
  getPendingTasksByBoardingId: (boardingId: string) => CareTask[];
  getTodayTasks: () => CareTask[];
  getActiveBoardings: () => PetBoarding[];
  getTasksByCage: () => Record<string, CareTask[]>;
  getAbnormalAndDelayed: () => CareTask[];

  _devHydrate: (data: {
    boardings: PetBoarding[];
    feedingPlans: FeedingPlan[];
    medicationPlans: MedicationPlan[];
    walkPlans: WalkPlan[];
    tasks: CareTask[];
  }) => void;
}

const STORAGE_KEY = 'pet-boarding-store';

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage(key: string, data: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // silently fail
  }
}

function persistState(state: {
  boardings: PetBoarding[];
  feedingPlans: FeedingPlan[];
  medicationPlans: MedicationPlan[];
  walkPlans: WalkPlan[];
  tasks: CareTask[];
}) {
  saveToStorage(STORAGE_KEY, state);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const saved = loadFromStorage<{
  boardings: PetBoarding[];
  feedingPlans: FeedingPlan[];
  medicationPlans: MedicationPlan[];
  walkPlans: WalkPlan[];
  tasks: CareTask[];
}>(STORAGE_KEY, {
  boardings: [],
  feedingPlans: [],
  medicationPlans: [],
  walkPlans: [],
  tasks: [],
});

export const useBoardingStore = create<BoardingStore>((set, get) => ({
  boardings: saved.boardings,
  feedingPlans: saved.feedingPlans,
  medicationPlans: saved.medicationPlans,
  walkPlans: saved.walkPlans,
  tasks: saved.tasks,

  _devHydrate: (data: typeof saved) => {
    set((s) => ({ ...s, ...data }));
    persistState({ ...get(), ...data });
  },

  addBoarding: (boarding) => {
    set((s) => {
      const next = { ...s, boardings: [...s.boardings, boarding] };
      persistState(next);
      return next;
    });
  },
  updateBoarding: (id, data) => {
    set((s) => {
      const next = {
        ...s,
        boardings: s.boardings.map((b) =>
          b.id === id ? { ...b, ...data, updatedAt: new Date().toISOString() } : b
        ),
      };
      persistState(next);
      return next;
    });
  },
  removeBoarding: (id) => {
    set((s) => {
      const next = { ...s, boardings: s.boardings.filter((b) => b.id !== id) };
      persistState(next);
      return next;
    });
  },

  addFeedingPlan: (plan) => {
    set((s) => {
      const next = { ...s, feedingPlans: [...s.feedingPlans, plan] };
      persistState(next);
      return next;
    });
  },
  updateFeedingPlan: (id, data) => {
    set((s) => {
      const next = {
        ...s,
        feedingPlans: s.feedingPlans.map((p) =>
          p.id === id ? { ...p, ...data } : p
        ),
      };
      persistState(next);
      return next;
    });
  },
  removeFeedingPlan: (id) => {
    set((s) => {
      const next = { ...s, feedingPlans: s.feedingPlans.filter((p) => p.id !== id) };
      persistState(next);
      return next;
    });
  },

  addMedicationPlan: (plan) => {
    set((s) => {
      const next = { ...s, medicationPlans: [...s.medicationPlans, plan] };
      persistState(next);
      return next;
    });
  },
  updateMedicationPlan: (id, data) => {
    set((s) => {
      const next = {
        ...s,
        medicationPlans: s.medicationPlans.map((p) =>
          p.id === id ? { ...p, ...data } : p
        ),
      };
      persistState(next);
      return next;
    });
  },
  removeMedicationPlan: (id) => {
    set((s) => {
      const next = { ...s, medicationPlans: s.medicationPlans.filter((p) => p.id !== id) };
      persistState(next);
      return next;
    });
  },

  addWalkPlan: (plan) => {
    set((s) => {
      const next = { ...s, walkPlans: [...s.walkPlans, plan] };
      persistState(next);
      return next;
    });
  },
  updateWalkPlan: (id, data) => {
    set((s) => {
      const next = {
        ...s,
        walkPlans: s.walkPlans.map((p) =>
          p.id === id ? { ...p, ...data } : p
        ),
      };
      persistState(next);
      return next;
    });
  },
  removeWalkPlan: (id) => {
    set((s) => {
      const next = { ...s, walkPlans: s.walkPlans.filter((p) => p.id !== id) };
      persistState(next);
      return next;
    });
  },

  addTask: (task) => {
    set((s) => {
      const next = { ...s, tasks: [...s.tasks, task] };
      persistState(next);
      return next;
    });
  },
  updateTask: (id, data) => {
    set((s) => {
      const next = {
        ...s,
        tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...data } : t)),
      };
      persistState(next);
      return next;
    });
  },
  removeTask: (id) => {
    set((s) => {
      const next = { ...s, tasks: s.tasks.filter((t) => t.id !== id) };
      persistState(next);
      return next;
    });
  },
  removeTasksByBoardingId: (boardingId) => {
    set((s) => {
      const next = { ...s, tasks: s.tasks.filter((t) => t.boardingId !== boardingId) };
      persistState(next);
      return next;
    });
  },

  completeTask: (id) => {
    set((s) => {
      const next = {
        ...s,
        tasks: s.tasks.map((t) =>
          t.id === id
            ? { ...t, status: 'completed' as TaskStatus, completedTime: new Date().toISOString(), isAbnormal: false, abnormalReason: '' }
            : t
        ),
      };
      persistState(next);
      return next;
    });
  },
  markTaskAbnormal: (id, reason) => {
    set((s) => {
      const next = {
        ...s,
        tasks: s.tasks.map((t) =>
          t.id === id
            ? { ...t, status: 'abnormal' as TaskStatus, isAbnormal: true, abnormalReason: reason }
            : t
        ),
      };
      persistState(next);
      return next;
    });
  },

  validateBoarding: (boarding, excludeId) => {
    const warnings: Warning[] = [];
    const state = get();
    const activeBoardings = state.boardings.filter(
      (b) => b.status === 'active' && b.id !== excludeId
    );

    if (boarding.petName) {
      const sameName = activeBoardings.filter(
        (b) => b.petName === boarding.petName
      );
      if (sameName.length > 0) {
        warnings.push({
          type: 'same_name',
          message: `同名宠物警告：已有同名宠物「${boarding.petName}」在笼位 ${sameName.map((b) => b.cageNumber).join('、')}`,
          severity: 'warning',
          relatedIds: sameName.map((b) => b.id),
        });
      }
    }

    if (boarding.cageNumber) {
      const cageConflict = activeBoardings.filter(
        (b) => b.cageNumber === boarding.cageNumber
      );
      if (cageConflict.length > 0) {
        warnings.push({
          type: 'cage_conflict',
          message: `笼位冲突：笼位 ${boarding.cageNumber} 已有宠物「${cageConflict[0].petName}」入住`,
          severity: 'error',
          relatedIds: cageConflict.map((b) => b.id),
        });
      }
    }

    if (boarding.actualPickupDate && boarding.expectedPickupDate) {
      if (boarding.actualPickupDate < boarding.expectedPickupDate) {
        const boardingId = excludeId || '';
        const pendingTasks = state.tasks.filter(
          (t) => t.boardingId === boardingId && t.status === 'pending'
        );
        if (pendingTasks.length > 0) {
          warnings.push({
            type: 'early_pickup',
            message: `主人提前接回，但还有 ${pendingTasks.length} 项未处理任务`,
            severity: 'warning',
            relatedIds: pendingTasks.map((t) => t.id),
          });
        }
      }
    }

    if (boarding.id) {
      const meds = state.medicationPlans.filter(
        (m) => m.boardingId === boarding.id
      );
      for (const med of meds) {
        if (med.dosage && !med.unit) {
          warnings.push({
            type: 'missing_unit',
            message: `药品「${med.medicineName}」剂量 ${med.dosage} 缺少单位`,
            severity: 'error',
            relatedIds: [med.id],
          });
        }
      }
    }

    return warnings;
  },

  validatePickup: (boardingId, actualPickupDate) => {
    const warnings: Warning[] = [];
    const state = get();
    const boarding = state.boardings.find((b) => b.id === boardingId);
    if (!boarding) return warnings;

    const pendingTasks = state.tasks.filter(
      (t) => t.boardingId === boardingId && t.status === 'pending'
    );

    if (actualPickupDate < boarding.expectedPickupDate && pendingTasks.length > 0) {
      warnings.push({
        type: 'early_pickup',
        message: `⚠ 提前接回风险：主人计划 ${boarding.expectedPickupDate} 接回，现提前至 ${actualPickupDate}，但该寄养记录下还有 ${pendingTasks.length} 项未处理任务！`,
        severity: 'warning',
        relatedIds: pendingTasks.map((t) => t.id),
      });
    }

    if (pendingTasks.length > 0 && actualPickupDate >= boarding.expectedPickupDate) {
      warnings.push({
        type: 'early_pickup',
        message: `接回提醒：该寄养记录下还有 ${pendingTasks.length} 项未处理任务，请确认是否已安排妥当`,
        severity: 'warning',
        relatedIds: pendingTasks.map((t) => t.id),
      });
    }

    const abnormalTasks = state.tasks.filter(
      (t) => t.boardingId === boardingId && t.status === 'abnormal'
    );
    if (abnormalTasks.length > 0) {
      warnings.push({
        type: 'early_pickup',
        message: `异常任务提醒：该寄养记录下有 ${abnormalTasks.length} 项异常任务未处理，接回前请确认`,
        severity: 'warning',
        relatedIds: abnormalTasks.map((t) => t.id),
      });
    }

    return warnings;
  },

  pickupBoarding: (boardingId, actualPickupDate) => {
    set((s) => {
      const next = {
        ...s,
        boardings: s.boardings.map((b) =>
          b.id === boardingId
            ? { ...b, status: 'picked_up' as const, actualPickupDate, updatedAt: new Date().toISOString() }
            : b
        ),
      };
      persistState(next);
      return next;
    });
  },

  getPendingTasksByBoardingId: (boardingId) => {
    return get().tasks.filter(
      (t) => t.boardingId === boardingId && (t.status === 'pending' || t.status === 'abnormal')
    );
  },

  getTodayTasks: () => {
    const today = todayStr();
    return get().tasks.filter((t) => {
      if (t.status === 'completed' && !t.completedTime?.startsWith(today)) return false;
      return t.scheduledTime?.startsWith(today) || t.status === 'pending' || t.status === 'abnormal';
    });
  },

  getActiveBoardings: () => {
    return get().boardings.filter((b) => b.status === 'active');
  },

  getTasksByCage: () => {
    const tasks = get().tasks;
    const byCage: Record<string, CareTask[]> = {};
    for (const t of tasks) {
      if (!byCage[t.cageNumber]) byCage[t.cageNumber] = [];
      byCage[t.cageNumber].push(t);
    }
    return byCage;
  },

  getAbnormalAndDelayed: () => {
    const now = new Date();
    return get().tasks.filter((t) => {
      if (t.isAbnormal) return true;
      if (t.status === 'pending' && new Date(t.scheduledTime) < now) return true;
      return false;
    });
  },
}));

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__boardingStore = useBoardingStore;
}
