import { create } from 'zustand';
import type { Order, Material, Evidence, AppealSummary, MaterialOrder, SummaryVersion } from '../../shared/types';
import { projectApi, materialApi, evidenceApi, summaryApi, exportApi } from '../services/api';

interface AppState {
  projects: Order[];
  currentProject: Order | null;
  materials: Material[];
  evidence: Evidence[];
  summaries: AppealSummary[];
  materialOrders: MaterialOrder | null;
  currentSummary: AppealSummary | null;
  loading: boolean;
  analyzing: boolean;
  exporting: boolean;
  generating: boolean;
  error: string | null;
  
  projectApi: typeof projectApi;
  materialApi: typeof materialApi;
  evidenceApi: typeof evidenceApi;
  summaryApi: typeof summaryApi;
  exportApi: typeof exportApi;
  
  loadProjects: () => Promise<void>;
  createProject: (data: any) => Promise<Order | null>;
  setCurrentProject: (project: Order | null) => void;
  loadMaterials: (projectId: string) => Promise<void>;
  uploadMaterials: (projectId: string, files: File[], type?: string) => Promise<Material[] | null>;
  deleteMaterial: (id: string) => Promise<boolean>;
  loadEvidence: (projectId: string) => Promise<void>;
  analyzeEvidence: (projectId: string) => Promise<Evidence[] | null>;
  analyzeMaterials: (projectId: string) => Promise<Evidence[] | null>;
  updateEvidence: (id: string, data: any) => Promise<Evidence | null>;
  confirmEvidence: (id: string) => Promise<boolean>;
  confirmAllEvidence: (projectId: string) => Promise<boolean>;
  deleteEvidence: (id: string) => Promise<boolean>;
  batchConfirmEvidence: (ids: string[]) => Promise<boolean>;
  loadSummaries: (projectId: string) => Promise<void>;
  loadSummary: (projectId: string) => Promise<void>;
  generateSummary: (projectId: string) => Promise<AppealSummary | null>;
  saveSummary: (projectId: string, content: string, changeLog?: string) => Promise<AppealSummary | null>;
  createSummaryVersion: (projectId: string, content: string, versionNote: string) => Promise<SummaryVersion | null>;
  loadMaterialOrders: (projectId: string) => Promise<void>;
  saveMaterialOrders: (projectId: string, order: string[]) => Promise<void>;
  updateMaterialOrder: (projectId: string, order: string[]) => Promise<void>;
  exportMaterials: (projectId: string, format: any) => Promise<any>;
  setError: (error: string | null) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  projects: [],
  currentProject: null,
  materials: [],
  evidence: [],
  summaries: [],
  materialOrders: null,
  currentSummary: null,
  loading: false,
  analyzing: false,
  exporting: false,
  generating: false,
  error: null,

  projectApi,
  materialApi,
  evidenceApi,
  summaryApi,
  exportApi,

  loadProjects: async () => {
    set({ loading: true, error: null });
    try {
      const response = await projectApi.getAll();
      if (response.success && response.data) {
        set({ projects: response.data });
      }
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  createProject: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await projectApi.create(data);
      if (response.success && response.data) {
        set(state => ({ projects: [response.data!, ...state.projects] }));
        return response.data;
      }
      return null;
    } catch (error: any) {
      set({ error: error.message });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  setCurrentProject: (project) => {
    set({ currentProject: project });
  },

  loadMaterials: async (projectId) => {
    set({ loading: true, error: null });
    try {
      const response = await materialApi.getByProjectId(projectId);
      if (response.success && response.data) {
        set({ materials: response.data });
      }
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  uploadMaterials: async (projectId, files, type) => {
    set({ loading: true, error: null });
    try {
      const response = await materialApi.upload(projectId, files, type);
      if (response.success && response.data) {
        set(state => ({ materials: [...state.materials, ...response.data!] }));
        return response.data;
      }
      return null;
    } catch (error: any) {
      set({ error: error.message });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  deleteMaterial: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await materialApi.delete(id);
      if (response.success) {
        set(state => ({ materials: state.materials.filter(m => m.id !== id) }));
        return true;
      }
      return false;
    } catch (error: any) {
      set({ error: error.message });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  loadEvidence: async (projectId) => {
    set({ loading: true, error: null });
    try {
      const response = await evidenceApi.getByProjectId(projectId);
      if (response.success && response.data) {
        set({ evidence: response.data });
      }
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  analyzeEvidence: async (projectId) => {
    set({ analyzing: true, error: null });
    try {
      const response = await evidenceApi.analyze(projectId);
      if (response.success && response.data) {
        set({ evidence: response.data });
        return response.data;
      }
      return null;
    } catch (error: any) {
      set({ error: error.message });
      return null;
    } finally {
      set({ analyzing: false });
    }
  },

  analyzeMaterials: async (projectId) => {
    set({ analyzing: true, error: null });
    try {
      const response = await evidenceApi.analyze(projectId);
      if (response.success && response.data) {
        set({ evidence: response.data });
        return response.data;
      }
      return null;
    } catch (error: any) {
      set({ error: error.message });
      return null;
    } finally {
      set({ analyzing: false });
    }
  },

  updateEvidence: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const response = await evidenceApi.update(id, data);
      if (response.success && response.data) {
        set(state => ({
          evidence: state.evidence.map(e => e.id === id ? response.data! : e)
        }));
        return response.data;
      }
      return null;
    } catch (error: any) {
      set({ error: error.message });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  confirmEvidence: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await evidenceApi.update(id, { confirmed: true });
      if (response.success) {
        set(state => ({
          evidence: state.evidence.map(e => e.id === id ? { ...e, confirmed: true } : e)
        }));
        return true;
      }
      return false;
    } catch (error: any) {
      set({ error: error.message });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  confirmAllEvidence: async (projectId) => {
    set({ loading: true, error: null });
    try {
      const unconfirmedIds = get().evidence.filter(e => !e.confirmed).map(e => e.id);
      const response = await evidenceApi.batchConfirm(unconfirmedIds);
      if (response.success) {
        set(state => ({
          evidence: state.evidence.map(e => ({ ...e, confirmed: true }))
        }));
        return true;
      }
      return false;
    } catch (error: any) {
      set({ error: error.message });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  deleteEvidence: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await evidenceApi.delete(id);
      if (response.success) {
        set(state => ({
          evidence: state.evidence.filter(e => e.id !== id)
        }));
        return true;
      }
      return false;
    } catch (error: any) {
      set({ error: error.message });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  batchConfirmEvidence: async (ids) => {
    set({ loading: true, error: null });
    try {
      const response = await evidenceApi.batchConfirm(ids);
      if (response.success) {
        set(state => ({
          evidence: state.evidence.map(e => ids.includes(e.id) ? { ...e, confirmed: true } : e)
        }));
        return true;
      }
      return false;
    } catch (error: any) {
      set({ error: error.message });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  loadSummaries: async (projectId) => {
    set({ loading: true, error: null });
    try {
      const response = await summaryApi.getByProjectId(projectId);
      if (response.success && response.data) {
        set({ summaries: response.data });
      }
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  loadSummary: async (projectId) => {
    set({ loading: true, error: null });
    try {
      const response = await summaryApi.getByProjectId(projectId);
      if (response.success && response.data && response.data.length > 0) {
        set({ currentSummary: response.data[0], summaries: response.data });
      }
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  generateSummary: async (projectId) => {
    set({ generating: true, error: null });
    try {
      const response = await summaryApi.generate(projectId);
      if (response.success && response.data) {
        set(state => ({ 
          summaries: [response.data!, ...state.summaries],
          currentSummary: response.data!
        }));
        return response.data;
      }
      return null;
    } catch (error: any) {
      set({ error: error.message });
      return null;
    } finally {
      set({ generating: false });
    }
  },

  saveSummary: async (projectId, content, changeLog) => {
    set({ loading: true, error: null });
    try {
      const response = await summaryApi.save(projectId, { content, changeLog: changeLog || '手动修改' });
      if (response.success && response.data) {
        set(state => ({ 
          summaries: [response.data!, ...state.summaries],
          currentSummary: response.data!
        }));
        return response.data;
      }
      return null;
    } catch (error: any) {
      set({ error: error.message });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  createSummaryVersion: async (projectId, content, versionNote) => {
    set({ loading: true, error: null });
    try {
      const response = await summaryApi.save(projectId, { content, changeLog: versionNote });
      if (response.success && response.data) {
        const version: SummaryVersion = {
          id: response.data.id,
          projectId: response.data.projectId,
          content: response.data.content,
          version: response.data.version,
          versionNote: response.data.changeLog,
          createdAt: response.data.createdAt,
          modifiedBy: response.data.modifiedBy,
        };
        set(state => ({ 
          summaries: [response.data!, ...state.summaries],
          currentSummary: response.data!
        }));
        return version;
      }
      return null;
    } catch (error: any) {
      set({ error: error.message });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  loadMaterialOrders: async (projectId) => {
    set({ loading: true, error: null });
    try {
      const response = await materialApi.getOrder(projectId);
      if (response.success && response.data) {
        set({ materialOrders: response.data });
      }
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  saveMaterialOrders: async (projectId, order) => {
    set({ loading: true, error: null });
    try {
      const response = await materialApi.updateOrder(projectId, order);
      if (response.success) {
        set({ materialOrders: { projectId, order } });
      }
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  updateMaterialOrder: async (projectId, order) => {
    try {
      await materialApi.updateOrder(projectId, order);
      set({ materialOrders: { projectId, order } });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  exportMaterials: async (projectId, format) => {
    set({ exporting: true, error: null });
    try {
      const response = await exportApi.export(projectId, format);
      if (response.success && response.data) {
        const { downloadUrl, fileName } = response.data;
        
        const downloadResponse = await fetch(downloadUrl);
        const blob = await downloadResponse.blob();
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        return response.data;
      }
      return null;
    } catch (error: any) {
      set({ error: error.message });
      return null;
    } finally {
      set({ exporting: false });
    }
  },

  setError: (error) => {
    set({ error });
  },
}));
