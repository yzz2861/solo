import { create } from "zustand";
import type { ViewType, ExtractFieldKey } from "@/types";
import { MOCK_CURRENT_USER } from "@/data/mockData";

interface UIState {
  sidebarOpen: boolean;
  activeRoute: string;
  currentView: ViewType;
  editingField: ExtractFieldKey | null;
  auditPanelOpen: boolean;
  orderLinkModalOpen: boolean;
  toast: {
    open: boolean;
    type: "success" | "error" | "info";
    message: string;
  };

  currentUser: typeof MOCK_CURRENT_USER;

  toggleSidebar: () => void;
  setActiveRoute: (r: string) => void;
  setCurrentView: (v: ViewType) => void;
  setEditingField: (f: ExtractFieldKey | null) => void;
  toggleAuditPanel: (open?: boolean) => void;
  setOrderLinkModalOpen: (open: boolean) => void;
  showToast: (type: "success" | "error" | "info", message: string) => void;
  hideToast: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  sidebarOpen: true,
  activeRoute: "/",
  currentView: "procurement",
  editingField: null,
  auditPanelOpen: false,
  orderLinkModalOpen: false,
  toast: { open: false, type: "info", message: "" },

  currentUser: MOCK_CURRENT_USER,

  toggleSidebar: () =>
    set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setActiveRoute: (r) => set({ activeRoute: r }),

  setCurrentView: (v) => set({ currentView: v }),

  setEditingField: (f) => set({ editingField: f }),

  toggleAuditPanel: (open) =>
    set((state) => ({
      auditPanelOpen: typeof open === "boolean" ? open : !state.auditPanelOpen,
    })),

  setOrderLinkModalOpen: (open) => set({ orderLinkModalOpen: open }),

  showToast: (type, message) => {
    set({ toast: { open: true, type, message } });
    setTimeout(() => get().hideToast(), 3000);
  },

  hideToast: () =>
    set({ toast: { open: false, type: "info", message: "" } }),
}));
