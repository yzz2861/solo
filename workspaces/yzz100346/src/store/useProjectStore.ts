import { create } from 'zustand';
import type { BaseDevice, DeviceType, Position } from '../types/devices';
import type { Project, HistoryEntry, HistoryAction } from '../types/project';
import type { SafetySettings, Risk } from '../types/safety';
import { createNewProject } from '../types/project';
import { saveProject as saveProjectToStorage, loadProject as loadProjectFromStorage, deleteProject as deleteProjectFromStorage, getAllProjects, saveHistoryEntry, getHistoryForProject } from '../utils/storage';
import { runSafetyCheck } from '../utils/safetyEngine';
import { DEFAULT_DIMENSIONS, DEVICE_PLACEMENT_OFFSET, getDefaultDeviceName, getDeviceTypeCount, DEFAULT_MAX_HOIST_LOAD, DEFAULT_WEIGHT } from '../constants/deviceDefaults';
import { getHistoryActionLabel } from '../types/project';
import { isLightRig, isSpeaker, isHoistPoint } from '../types/devices';

interface ProjectState {
  project: Project | null;
  selectedDeviceId: string | null;
  history: HistoryEntry[];
  isLoading: boolean;
  error: string | null;

  initNewProject: () => void;
  loadProject: (projectId: string) => void;
  saveProject: (name?: string) => void;
  deleteProject: (projectId: string) => void;
  getAllProjects: () => Project[];
  addDevice: (type: DeviceType, position: Position) => void;
  updateDevice: (id: string, updates: Partial<BaseDevice>) => void;
  removeDevice: (id: string) => void;
  selectDevice: (id: string | null) => void;
  updateSafetySettings: (settings: Partial<SafetySettings>) => void;
  runSafetyCheck: () => void;
  loadHistory: () => void;
  rollbackToHistory: (entryId: string) => void;
  setProjectRisks: (risks: Risk[]) => void;
  clearError: () => void;
  addHistoryEntry: (action: HistoryAction, description: string) => void;
}

const generateDeviceId = () => crypto.randomUUID();

export const useProjectStore = create<ProjectState>((set, get) => ({
  project: null,
  selectedDeviceId: null,
  history: [],
  isLoading: false,
  error: null,

  initNewProject: () => {
    const project = createNewProject();
    set({ project, selectedDeviceId: null, history: [] });
    get().runSafetyCheck();
  },

  loadProject: (projectId: string) => {
    set({ isLoading: true, error: null });
    try {
      const project = loadProjectFromStorage(projectId);
      if (project) {
        set({ project, selectedDeviceId: null });
        get().runSafetyCheck();
        get().loadHistory();
      } else {
        set({ error: '方案不存在' });
      }
    } catch (error) {
      set({ error: '加载方案失败' });
    } finally {
      set({ isLoading: false });
    }
  },

  saveProject: (name) => {
    const { project } = get();
    if (!project) return;

    set({ isLoading: true, error: null });
    try {
      const updatedProject = {
        ...project,
        name: name || project.name,
        updatedAt: Date.now(),
      };
      saveProjectToStorage(updatedProject);
      set({ project: updatedProject });
      
      get().addHistoryEntry('updateDevice', `保存方案: ${updatedProject.name}`);
    } catch (error) {
      set({ error: '保存方案失败' });
    } finally {
      set({ isLoading: false });
    }
  },

  deleteProject: (projectId) => {
    try {
      deleteProjectFromStorage(projectId);
      const currentProject = get().project;
      if (currentProject?.id === projectId) {
        set({ project: null, selectedDeviceId: null, history: [] });
      }
    } catch (error) {
      set({ error: '删除方案失败' });
    }
  },

  getAllProjects: () => {
    return getAllProjects();
  },

  addDevice: (type, position) => {
    const { project } = get();
    if (!project) return;

    const existingNames = project.devices.map(d => d.name);
    const count = getDeviceTypeCount(type, existingNames);
    const dimensions = DEFAULT_DIMENSIONS[type];
    const yOffset = DEVICE_PLACEMENT_OFFSET[type].y;

    let newDevice: BaseDevice = {
      id: generateDeviceId(),
      type,
      name: getDefaultDeviceName(type, count),
      position: {
        x: position.x,
        y: yOffset,
        z: position.z,
      },
      dimensions,
    };

    if (isLightRig(newDevice)) {
      const defaults = DEFAULT_WEIGHT.lightRig;
      (newDevice as any).weight = defaults.weight;
      (newDevice as any).weightUnit = defaults.unit;
      (newDevice as any).lightCount = 0;
      (newDevice as any).connectedHoistPoints = [];
    } else if (isSpeaker(newDevice)) {
      const defaults = DEFAULT_WEIGHT.speaker;
      (newDevice as any).weight = defaults.weight;
      (newDevice as any).weightUnit = defaults.unit;
      (newDevice as any).power = 0;
    } else if (isHoistPoint(newDevice)) {
      (newDevice as any).maxLoad = DEFAULT_MAX_HOIST_LOAD;
      (newDevice as any).currentLoad = 0;
    }

    const updatedDevices = [...project.devices, newDevice];
    const updatedProject = {
      ...project,
      devices: updatedDevices,
      updatedAt: Date.now(),
    };

    set({ project: updatedProject, selectedDeviceId: newDevice.id });
    get().runSafetyCheck();
    get().addHistoryEntry('addDevice', `添加${newDevice.name}`);
  },

  updateDevice: (id, updates) => {
    const { project } = get();
    if (!project) return;

    const updatedDevices = project.devices.map(d =>
      d.id === id ? { ...d, ...updates } : d
    );
    const updatedProject = {
      ...project,
      devices: updatedDevices,
      updatedAt: Date.now(),
    };

    set({ project: updatedProject });
    get().runSafetyCheck();
  },

  removeDevice: (id) => {
    const { project, selectedDeviceId } = get();
    if (!project) return;

    const device = project.devices.find(d => d.id === id);
    const updatedDevices = project.devices.filter(d => d.id !== id);
    const updatedProject = {
      ...project,
      devices: updatedDevices,
      updatedAt: Date.now(),
    };

    set({
      project: updatedProject,
      selectedDeviceId: selectedDeviceId === id ? null : selectedDeviceId,
    });
    get().runSafetyCheck();
    
    if (device) {
      get().addHistoryEntry('removeDevice', `删除${device.name}`);
    }
  },

  selectDevice: (id) => set({ selectedDeviceId: id }),

  updateSafetySettings: (settings) => {
    const { project } = get();
    if (!project) return;

    const updatedProject = {
      ...project,
      safetySettings: {
        ...project.safetySettings,
        ...settings,
      },
      updatedAt: Date.now(),
    };

    set({ project: updatedProject });
    get().runSafetyCheck();
    get().addHistoryEntry('updateSafetySettings', '更新安全设置');
  },

  runSafetyCheck: () => {
    const { project } = get();
    if (!project) return;

    const risks = runSafetyCheck(project.devices, project.safetySettings);
    const updatedProject = {
      ...project,
      risks,
      updatedAt: Date.now(),
    };
    set({ project: updatedProject });
  },

  loadHistory: () => {
    const { project } = get();
    if (!project) return;

    const history = getHistoryForProject(project.id);
    set({ history });
  },

  addHistoryEntry: (action: HistoryAction, description: string) => {
    const { project } = get();
    if (!project) return;

    const entry: HistoryEntry = {
      id: crypto.randomUUID(),
      projectId: project.id,
      timestamp: Date.now(),
      action,
      description: `${getHistoryActionLabel(action)} - ${description}`,
      snapshot: JSON.parse(JSON.stringify(project)),
    };

    saveHistoryEntry(entry);
    get().loadHistory();
  },

  rollbackToHistory: (entryId) => {
    const { history } = get();
    const entry = history.find(h => h.id === entryId);
    if (!entry) return;

    const rolledBackProject = {
      ...entry.snapshot,
      id: entry.projectId,
      updatedAt: Date.now(),
    };

    set({ project: rolledBackProject, selectedDeviceId: null });
    saveProjectToStorage(rolledBackProject);
    get().runSafetyCheck();
    get().addHistoryEntry('rollback', `回滚到 ${new Date(entry.timestamp).toLocaleString('zh-CN')}`);
  },

  setProjectRisks: (risks) => {
    const { project } = get();
    if (!project) return;

    set({
      project: {
        ...project,
        risks,
      },
    });
  },

  clearError: () => set({ error: null }),
}));
