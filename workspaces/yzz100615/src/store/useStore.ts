import { create } from 'zustand';
import type { Task, Cargo, LoadStandard, VehicleParams, TaskVersion, DriverRecord } from '@/types';
import { loadTasks, saveTasks, loadStandards, saveStandards } from '@/utils/storage';
import { defaultStandards, defaultTask } from '@/data/mockData';
import { generateId, getCargoColor, calculateAxleLoad } from '@/utils/calculator';

interface AppState {
  tasks: Task[];
  standards: LoadStandard[];
  currentTaskId: string | null;
  initStore: () => void;
  getCurrentTask: () => Task | null;
  getCurrentStandard: () => LoadStandard | null;
  setCurrentTask: (taskId: string | null) => void;
  createTask: (name: string, vehiclePlate: string, standardId: string) => Task;
  updateVehicleParams: (params: Partial<VehicleParams>) => void;
  addCargo: (cargo: Omit<Cargo, 'id' | 'color'>) => void;
  updateCargo: (cargoId: string, updates: Partial<Cargo>) => void;
  removeCargo: (cargoId: string) => void;
  saveVersion: (note: string) => void;
  rollbackToVersion: (versionId: string) => void;
  addStandard: (standard: Omit<LoadStandard, 'id'>) => void;
  updateStandard: (id: string, updates: Partial<LoadStandard>) => void;
  removeStandard: (id: string) => void;
  saveDriverRecord: (driverName: string, signatureData: string) => void;
}

export const useStore = create<AppState>((set, get) => ({
  tasks: [],
  standards: [],
  currentTaskId: null,

  initStore: () => {
    const storedTasks = loadTasks();
    const storedStandards = loadStandards();

    const standards = storedStandards.length > 0 ? storedStandards : defaultStandards;
    if (storedStandards.length === 0) {
      saveStandards(standards);
    }

    let tasks = storedTasks;
    if (tasks.length === 0) {
      const defaultStd = standards.find((s) => s.isDefault) || standards[0];
      const initialTask = {
        ...defaultTask,
        standardId: defaultStd.id,
        id: generateId(),
        cargoes: defaultTask.cargoes.map((c, i) => ({
          ...c,
          id: generateId(),
          color: getCargoColor(i),
        })),
      };
      tasks = [initialTask];
      saveTasks(tasks);
      set({ currentTaskId: initialTask.id });
    } else {
      set({ currentTaskId: tasks[0]?.id || null });
    }

    set({ tasks, standards });
  },

  getCurrentTask: () => {
    const { tasks, currentTaskId } = get();
    return tasks.find((t) => t.id === currentTaskId) || null;
  },

  getCurrentStandard: () => {
    const { standards, getCurrentTask } = get();
    const task = getCurrentTask();
    return standards.find((s) => s.id === task?.standardId) || standards[0] || null;
  },

  setCurrentTask: (taskId) => set({ currentTaskId: taskId }),

  createTask: (name, vehiclePlate, standardId) => {
    const newTask: Task = {
      id: generateId(),
      name,
      vehiclePlate,
      vehicleParams: {
        wheelbase: 3800,
        emptyFrontAxle: 2200,
        emptyRearAxle: 2800,
        carriageLength: 4200,
        carriageOffset: 300,
      },
      standardId,
      cargoes: [],
      versions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const tasks = [...get().tasks, newTask];
    set({ tasks, currentTaskId: newTask.id });
    saveTasks(tasks);
    return newTask;
  },

  updateVehicleParams: (params) => {
    const { currentTaskId, tasks } = get();
    const updated = tasks.map((t) =>
      t.id === currentTaskId
        ? {
            ...t,
            vehicleParams: { ...t.vehicleParams, ...params },
            updatedAt: new Date().toISOString(),
          }
        : t,
    );
    set({ tasks: updated });
    saveTasks(updated);
  },

  addCargo: (cargo) => {
    const { currentTaskId, tasks } = get();
    const currentTask = tasks.find((t) => t.id === currentTaskId);
    const colorIndex = currentTask?.cargoes.length || 0;
    const newCargo: Cargo = {
      ...cargo,
      id: generateId(),
      color: getCargoColor(colorIndex),
    };
    const updated = tasks.map((t) =>
      t.id === currentTaskId
        ? { ...t, cargoes: [...t.cargoes, newCargo], updatedAt: new Date().toISOString() }
        : t,
    );
    set({ tasks: updated });
    saveTasks(updated);
  },

  updateCargo: (cargoId, updates) => {
    const { currentTaskId, tasks } = get();
    const updated = tasks.map((t) =>
      t.id === currentTaskId
        ? {
            ...t,
            cargoes: t.cargoes.map((c) => (c.id === cargoId ? { ...c, ...updates } : c)),
            updatedAt: new Date().toISOString(),
          }
        : t,
    );
    set({ tasks: updated });
    saveTasks(updated);
  },

  removeCargo: (cargoId) => {
    const { currentTaskId, tasks } = get();
    const updated = tasks.map((t) =>
      t.id === currentTaskId
        ? {
            ...t,
            cargoes: t.cargoes.filter((c) => c.id !== cargoId),
            updatedAt: new Date().toISOString(),
          }
        : t,
    );
    set({ tasks: updated });
    saveTasks(updated);
  },

  saveVersion: (note) => {
    const { currentTaskId, tasks, getCurrentTask, getCurrentStandard } = get();
    const task = getCurrentTask();
    const standard = getCurrentStandard();
    if (!task || !standard) return;

    const axleResult = calculateAxleLoad(task.vehicleParams, task.cargoes, standard);
    const newVersion: TaskVersion = {
      id: generateId(),
      taskId: task.id,
      versionNumber: task.versions.length + 1,
      note,
      cargoSnapshot: JSON.parse(JSON.stringify(task.cargoes)),
      axleResult,
      createdAt: new Date().toISOString(),
    };

    const updated = tasks.map((t) =>
      t.id === currentTaskId
        ? { ...t, versions: [...t.versions, newVersion], updatedAt: new Date().toISOString() }
        : t,
    );
    set({ tasks: updated });
    saveTasks(updated);
  },

  rollbackToVersion: (versionId) => {
    const { currentTaskId, tasks } = get();
    const task = tasks.find((t) => t.id === currentTaskId);
    const version = task?.versions.find((v) => v.id === versionId);
    if (!task || !version) return;

    const updated = tasks.map((t) =>
      t.id === currentTaskId
        ? {
            ...t,
            cargoes: JSON.parse(JSON.stringify(version.cargoSnapshot)),
            updatedAt: new Date().toISOString(),
          }
        : t,
    );
    set({ tasks: updated });
    saveTasks(updated);
  },

  addStandard: (standard) => {
    const newStd: LoadStandard = { ...standard, id: generateId() };
    const standards = [...get().standards, newStd];
    set({ standards });
    saveStandards(standards);
  },

  updateStandard: (id, updates) => {
    const standards = get().standards.map((s) => (s.id === id ? { ...s, ...updates } : s));
    set({ standards });
    saveStandards(standards);
  },

  removeStandard: (id) => {
    const standards = get().standards.filter((s) => s.id !== id);
    set({ standards });
    saveStandards(standards);
  },

  saveDriverRecord: (driverName, signatureData) => {
    const { currentTaskId, tasks, getCurrentTask, getCurrentStandard } = get();
    const task = getCurrentTask();
    const standard = getCurrentStandard();
    if (!task || !standard) return;

    const axleResult = calculateAxleLoad(task.vehicleParams, task.cargoes, standard);
    const record: DriverRecord = {
      id: generateId(),
      taskId: task.id,
      driverName,
      signatureData,
      signedAt: new Date().toISOString(),
      axleResult,
      vehicleParams: { ...task.vehicleParams },
      cargoSnapshot: JSON.parse(JSON.stringify(task.cargoes)),
    };

    const updated = tasks.map((t) =>
      t.id === currentTaskId
        ? { ...t, driverRecord: record, updatedAt: new Date().toISOString() }
        : t,
    );
    set({ tasks: updated });
    saveTasks(updated);
  },
}));
