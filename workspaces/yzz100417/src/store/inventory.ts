import { create } from "zustand";
import type {
  Patient,
  Attachment,
  PatientAttachment,
  StatsOverview,
  User,
  AttachmentModel,
  Location,
  FollowUpRecord,
  InventoryAdjustment,
} from "../../shared/types";
import { apiClient, isApiError } from "../api/client";

export type UserRole = User["role"];

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
  duration?: number;
}

export interface ScanResult {
  attachment: Attachment;
  boundPatient: Patient | null;
  isDuplicate: boolean;
}

export interface PatientDetailData {
  patient: Patient;
  bindings: PatientAttachment[];
  followUps: FollowUpRecord[];
}

interface InventoryState {
  patients: Patient[];
  attachments: Attachment[];
  patientAttachments: PatientAttachment[];
  attachmentModels: AttachmentModel[];
  locations: Location[];
  stats: StatsOverview;
  followUpRecords: FollowUpRecord[];
  adjustments: InventoryAdjustment[];
  currentUser: User | null;
  loading: boolean;
  error: string | null;
  toasts: ToastMessage[];
  selectedPatient: Patient | null;
  searchQuery: string;
  selectedRole: UserRole;

  missingList: PatientAttachment[];
  nearExpiryList: (Attachment & { days_left?: number })[];
  tomorrowPatients: (PatientAttachment & { patient?: Patient; attachment?: Attachment })[];
  scanResult: ScanResult | null;
  patientDetail: PatientDetailData | null;
  loadingMap: Record<string, boolean>;

  setCurrentUser: (user: User | null) => void;
  setSelectedRole: (role: UserRole) => void;
  setSearchQuery: (query: string) => void;
  setSelectedPatient: (patient: Patient | null) => void;

  fetchPatients: () => Promise<void>;
  fetchAttachments: () => Promise<void>;
  fetchPatientAttachments: () => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchAttachmentModels: () => Promise<void>;
  fetchLocations: () => Promise<void>;
  fetchAll: () => Promise<void>;

  addPatient: (patient: Omit<Patient, "id" | "created_at">) => Promise<Patient | null>;
  addAttachment: (attachment: Omit<Attachment, "id" | "created_at">) => Promise<Attachment | null>;
  bindAttachmentToPatient: (
    data: Omit<PatientAttachment, "id" | "created_at">
  ) => Promise<PatientAttachment | null>;
  updateAttachmentStatus: (
    id: string,
    status: Attachment["status"]
  ) => Promise<boolean>;

  addToast: (toast: Omit<ToastMessage, "id">) => void;
  removeToast: (id: string) => void;

  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  fetchMissing: () => Promise<void>;
  fetchNearExpiry: (days?: number) => Promise<void>;
  fetchTomorrowPatients: (clinicRoom?: string) => Promise<void>;
  fetchPatientDetail: (id: string) => Promise<void>;
  scanAttachment: (code: string) => Promise<ScanResult | null>;
  bindAttachment: (params: {
    attachmentId: string;
    patientId: string;
    alignerBatch: string;
    followUpDate: string;
    clinicRoom: string;
    missingReason?: string | null;
  }) => Promise<{ success: boolean; message?: string }>;
  createPatient: (params: { name: string; phone?: string; treatment_plan?: string }) => Promise<Patient | null>;
  clearScanResult: () => void;
  clearPatientDetail: () => void;
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  patients: [],
  attachments: [],
  patientAttachments: [],
  attachmentModels: [],
  locations: [],
  stats: {
    totalStock: 0,
    boundCount: 0,
    missingCount: 0,
    nearExpiryCount: 0,
  },
  followUpRecords: [],
  adjustments: [],
  currentUser: null,
  loading: false,
  error: null,
  toasts: [],
  selectedPatient: null,
  searchQuery: "",
  selectedRole: "nurse",

  missingList: [],
  nearExpiryList: [],
  tomorrowPatients: [],
  scanResult: null,
  patientDetail: null,
  loadingMap: {},

  setCurrentUser: (user) => set({ currentUser: user }),
  setSelectedRole: (role) => set({ selectedRole: role }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedPatient: (patient) => set({ selectedPatient: patient }),

  fetchPatients: async () => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.get<Patient[]>("/patients");
      set({ patients: res.data, loading: false });
    } catch (err) {
      const message = isApiError(err) ? err.message : "获取患者列表失败";
      set({ error: message, loading: false });
      get().addToast({ type: "error", message });
    }
  },

  fetchAttachments: async () => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.get<Attachment[]>("/attachments");
      set({ attachments: res.data, loading: false });
    } catch (err) {
      const message = isApiError(err) ? err.message : "获取附件列表失败";
      set({ error: message, loading: false });
      get().addToast({ type: "error", message });
    }
  },

  fetchPatientAttachments: async () => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.get<PatientAttachment[]>("/patient-attachments");
      set({ patientAttachments: res.data, loading: false });
    } catch (err) {
      const message = isApiError(err) ? err.message : "获取患者附件绑定失败";
      set({ error: message, loading: false });
      get().addToast({ type: "error", message });
    }
  },

  fetchStats: async () => {
    try {
      const res = await apiClient.get<StatsOverview>("/overview");
      set({ stats: res.data });
    } catch (err) {
      const message = isApiError(err) ? err.message : "获取统计数据失败";
      set({ error: message });
    }
  },

  fetchAttachmentModels: async () => {
    try {
      const res = await apiClient.get<AttachmentModel[]>("/models");
      set({ attachmentModels: res.data });
    } catch (err) {
      const message = isApiError(err) ? err.message : "获取附件型号失败";
      set({ error: message });
    }
  },

  fetchLocations: async () => {
    try {
      const res = await apiClient.get<Location[]>("/locations");
      set({ locations: res.data });
    } catch (err) {
      const message = isApiError(err) ? err.message : "获取位置信息失败";
      set({ error: message });
    }
  },

  fetchAll: async () => {
    set({ loading: true, error: null });
    try {
      await Promise.all([
        get().fetchPatients(),
        get().fetchAttachments(),
        get().fetchPatientAttachments(),
        get().fetchStats(),
        get().fetchAttachmentModels(),
        get().fetchLocations(),
      ]);
      set({ loading: false });
    } catch (err) {
      const message = isApiError(err) ? err.message : "加载数据失败";
      set({ error: message, loading: false });
    }
  },

  addPatient: async (patient) => {
    try {
      const res = await apiClient.post<Patient>("/patients", patient);
      const newPatient = res.data;
      set((state) => ({ patients: [...state.patients, newPatient] }));
      get().addToast({ type: "success", message: "患者添加成功" });
      return newPatient;
    } catch (err) {
      const message = isApiError(err) ? err.message : "添加患者失败";
      get().addToast({ type: "error", message });
      return null;
    }
  },

  addAttachment: async (attachment) => {
    try {
      const res = await apiClient.post<Attachment>("/attachments", attachment);
      const newAttachment = res.data;
      set((state) => ({ attachments: [...state.attachments, newAttachment] }));
      get().addToast({ type: "success", message: "附件添加成功" });
      return newAttachment;
    } catch (err) {
      const message = isApiError(err) ? err.message : "添加附件失败";
      get().addToast({ type: "error", message });
      return null;
    }
  },

  bindAttachmentToPatient: async (data) => {
    try {
      const res = await apiClient.post<PatientAttachment>("/patient-attachments", data);
      const newBinding = res.data;
      set((state) => ({
        patientAttachments: [...state.patientAttachments, newBinding],
      }));
      get().addToast({ type: "success", message: "附件绑定成功" });
      return newBinding;
    } catch (err) {
      const message = isApiError(err) ? err.message : "绑定附件失败";
      get().addToast({ type: "error", message });
      return null;
    }
  },

  updateAttachmentStatus: async (id, status) => {
    try {
      await apiClient.patch(`/attachments/${id}/status`, { status });
      set((state) => ({
        attachments: state.attachments.map((a) =>
          a.id === id ? { ...a, status } : a
        ),
      }));
      get().addToast({ type: "success", message: "状态更新成功" });
      return true;
    } catch (err) {
      const message = isApiError(err) ? err.message : "更新状态失败";
      get().addToast({ type: "error", message });
      return false;
    }
  },

  addToast: (toast) => {
    const id = Math.random().toString(36).slice(2);
    const duration = toast.duration ?? 3000;
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  fetchMissing: async () => {
    set({ loadingMap: { ...get().loadingMap, missing: true } });
    try {
      const res = await apiClient.get<PatientAttachment[]>("/inventory/missing");
      set({ missingList: res.data, error: null });
    } catch (err) {
      const message = isApiError(err) ? err.message : "获取缺件列表失败";
      set({ error: message });
    } finally {
      set({ loadingMap: { ...get().loadingMap, missing: false } });
    }
  },

  fetchNearExpiry: async (days = 30) => {
    set({ loadingMap: { ...get().loadingMap, nearExpiry: true } });
    try {
      const res = await apiClient.get<(Attachment & { days_left?: number })[]>(
        "/inventory/near-expiry",
        { params: { days } }
      );
      set({ nearExpiryList: res.data, error: null });
    } catch (err) {
      const message = isApiError(err) ? err.message : "获取近效期列表失败";
      set({ error: message });
    } finally {
      set({ loadingMap: { ...get().loadingMap, nearExpiry: false } });
    }
  },

  fetchTomorrowPatients: async (clinicRoom) => {
    set({ loadingMap: { ...get().loadingMap, tomorrow: true } });
    try {
      const res = await apiClient.get<
        (PatientAttachment & { patient?: Patient; attachment?: Attachment })[]
      >("/patients/tomorrow", {
        params: clinicRoom ? { clinicRoom } : undefined,
      });
      set({ tomorrowPatients: res.data, error: null });
    } catch (err) {
      const message = isApiError(err) ? err.message : "获取明日待复诊失败";
      set({ error: message });
    } finally {
      set({ loadingMap: { ...get().loadingMap, tomorrow: false } });
    }
  },

  fetchPatientDetail: async (id) => {
    set({ loadingMap: { ...get().loadingMap, patientDetail: true } });
    try {
      const res = await apiClient.get<PatientDetailData>(`/patients/${id}`);
      set({ patientDetail: res.data, error: null });
    } catch (err) {
      const message = isApiError(err) ? err.message : "获取患者详情失败";
      set({ error: message });
    } finally {
      set({ loadingMap: { ...get().loadingMap, patientDetail: false } });
    }
  },

  scanAttachment: async (code) => {
    set({ loadingMap: { ...get().loadingMap, scan: true } });
    try {
      const res = await apiClient.post<ScanResult>("/attachments/scan", { code });
      set({ scanResult: res.data, error: null });
      return res.data;
    } catch (err) {
      const message = isApiError(err) ? err.message : "扫码识别失败";
      set({ error: message, scanResult: null });
      get().addToast({ type: "error", message });
      return null;
    } finally {
      set({ loadingMap: { ...get().loadingMap, scan: false } });
    }
  },

  bindAttachment: async (params) => {
    set({ loadingMap: { ...get().loadingMap, bind: true } });
    try {
      const res = await apiClient.post("/attachments/bind", params);
      get().addToast({ type: "success", message: "绑定成功" });
      set({ error: null });
      return { success: true, message: "" };
    } catch (err) {
      const message = isApiError(err) ? err.message : "绑定失败";
      set({ error: message });
      return { success: false, message };
    } finally {
      set({ loadingMap: { ...get().loadingMap, bind: false } });
    }
  },

  createPatient: async (params) => {
    set({ loadingMap: { ...get().loadingMap, createPatient: true } });
    try {
      const res = await apiClient.post<Patient>("/patients", params);
      set((state) => ({ patients: [...state.patients, res.data], error: null }));
      get().addToast({ type: "success", message: "患者创建成功" });
      return res.data;
    } catch (err) {
      const message = isApiError(err) ? err.message : "创建患者失败";
      set({ error: message });
      get().addToast({ type: "error", message });
      return null;
    } finally {
      set({ loadingMap: { ...get().loadingMap, createPatient: false } });
    }
  },

  clearScanResult: () => set({ scanResult: null }),
  clearPatientDetail: () => set({ patientDetail: null }),
}));
