import { create } from "zustand";
import type {
  Commitment,
  Email,
  AuditLog,
  ExtractedField,
  FieldChangedKey,
  ExtractFieldKey,
  DashboardStats,
  DailyStat,
} from "@/types";
import { MOCK_COMMITMENTS, MOCK_CURRENT_USER, MOCK_SEVEN_DAY_TREND } from "@/data/mockData";
import { extractCommitment } from "@/services/commitmentExtractor";

interface CommitmentState {
  commitments: Commitment[];
  currentCommitment: Commitment | null;
  isLoading: boolean;

  createCommitment: (email: Email) => Commitment;
  getCommitmentById: (id: string) => Commitment | undefined;
  setCurrentCommitment: (cmt: Commitment | null) => void;
  updateField: (
    commitmentId: string,
    fieldKey: ExtractFieldKey,
    newValue: unknown,
    note?: string
  ) => void;
  confirmCommitment: (commitmentId: string, note?: string) => void;
  rejectCommitment: (commitmentId: string, note?: string) => void;
  linkOrders: (commitmentId: string, orderIds: string[]) => void;
  unlinkOrder: (commitmentId: string, orderId: string) => void;
  deleteCommitment: (commitmentId: string) => void;
  getPendingCount: () => number;
  getUnlinkedCount: () => number;
  getWeeklyImportedCount: () => number;
  getDashboardStats: () => DashboardStats;
  getCommitmentsByStatus: (status: Commitment["status"]) => Commitment[];
  getCommitmentsBySupplier: (supplierId: string) => Commitment[];
  getUnlinkedCommitments: () => Commitment[];
}

const uuid = () => Math.random().toString(36).slice(2, 10);

const now = new Date();
const dateOffset = (days: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  return d.toISOString();
};

const addAuditLog = (
  commitment: Commitment,
  fieldChanged: FieldChangedKey,
  oldValue: unknown,
  newValue: unknown,
  note?: string
): AuditLog => ({
  id: `log-${uuid()}`,
  timestamp: dateOffset(0),
  operatorId: MOCK_CURRENT_USER.id,
  operatorName: MOCK_CURRENT_USER.name,
  fieldChanged,
  oldValue,
  newValue,
  note,
});

export const useCommitmentStore = create<CommitmentState>((set, get) => ({
  commitments: MOCK_COMMITMENTS,
  currentCommitment: null,
  isLoading: false,

  createCommitment: (email) => {
    const commitment = extractCommitment(email);
    set((state) => ({
      commitments: [commitment, ...state.commitments],
      currentCommitment: commitment,
    }));
    return commitment;
  },

  getCommitmentById: (id) => get().commitments.find((c) => c.id === id),

  setCurrentCommitment: (cmt) => set({ currentCommitment: cmt }),

  updateField: (commitmentId, fieldKey, newValue, note) =>
    set((state) => {
      const commitments = state.commitments.map((c) => {
        if (c.id !== commitmentId) return c;
        const oldField = c[fieldKey] as ExtractedField<unknown>;
        const oldValue = Array.isArray(oldField.value)
          ? [...oldField.value]
          : oldField.value;

        const newField: ExtractedField<unknown> = {
          ...oldField,
          value: newValue,
          isEdited: true,
          confidence: "high",
          reasons: oldField.reasons.includes("manual_override")
            ? oldField.reasons
            : [...oldField.reasons, "manual_override"],
        };

        const log = addAuditLog(c, fieldKey, oldValue, newValue, note);

        return {
          ...c,
          [fieldKey]: newField,
          auditLogs: [...c.auditLogs, log],
        };
      });
      return {
        commitments,
        currentCommitment:
          state.currentCommitment?.id === commitmentId
            ? commitments.find((c) => c.id === commitmentId) || null
            : state.currentCommitment,
      };
    }),

  confirmCommitment: (commitmentId, note) =>
    set((state) => {
      const commitments = state.commitments.map((c) => {
        if (c.id !== commitmentId) return c;
        const log = addAuditLog(c, "status", c.status, "confirmed", note);
        return {
          ...c,
          status: "confirmed" as const,
          confirmedAt: dateOffset(0),
          confirmedBy: MOCK_CURRENT_USER.name,
          auditLogs: [...c.auditLogs, log],
        };
      });
      return {
        commitments,
        currentCommitment:
          state.currentCommitment?.id === commitmentId
            ? commitments.find((c) => c.id === commitmentId) || null
            : state.currentCommitment,
      };
    }),

  rejectCommitment: (commitmentId, note) =>
    set((state) => {
      const commitments = state.commitments.map((c) => {
        if (c.id !== commitmentId) return c;
        const log = addAuditLog(c, "status", c.status, "rejected", note);
        return {
          ...c,
          status: "rejected" as const,
          auditLogs: [...c.auditLogs, log],
        };
      });
      return {
        commitments,
        currentCommitment:
          state.currentCommitment?.id === commitmentId
            ? commitments.find((c) => c.id === commitmentId) || null
            : state.currentCommitment,
      };
    }),

  linkOrders: (commitmentId, orderIds) =>
    set((state) => {
      const commitments = state.commitments.map((c) => {
        if (c.id !== commitmentId) return c;
        const existingIds = new Set(c.linkedOrderIds);
        orderIds.forEach((id) => existingIds.add(id));
        const newLinkedIds = Array.from(existingIds);
        const log = addAuditLog(
          c,
          "linkedOrderIds",
          c.linkedOrderIds,
          newLinkedIds,
          "关联订单"
        );
        return {
          ...c,
          linkedOrderIds: newLinkedIds,
          auditLogs: [...c.auditLogs, log],
        };
      });
      return {
        commitments,
        currentCommitment:
          state.currentCommitment?.id === commitmentId
            ? commitments.find((c) => c.id === commitmentId) || null
            : state.currentCommitment,
      };
    }),

  unlinkOrder: (commitmentId, orderId) =>
    set((state) => {
      const commitments = state.commitments.map((c) => {
        if (c.id !== commitmentId) return c;
        const newLinkedIds = c.linkedOrderIds.filter((id) => id !== orderId);
        const log = addAuditLog(
          c,
          "linkedOrderIds",
          c.linkedOrderIds,
          newLinkedIds,
          "取消关联订单"
        );
        return {
          ...c,
          linkedOrderIds: newLinkedIds,
          auditLogs: [...c.auditLogs, log],
        };
      });
      return {
        commitments,
        currentCommitment:
          state.currentCommitment?.id === commitmentId
            ? commitments.find((c) => c.id === commitmentId) || null
            : state.currentCommitment,
      };
    }),

  deleteCommitment: (commitmentId) =>
    set((state) => ({
      commitments: state.commitments.filter((c) => c.id !== commitmentId),
      currentCommitment:
        state.currentCommitment?.id === commitmentId
          ? null
          : state.currentCommitment,
    })),

  getPendingCount: () =>
    get().commitments.filter((c) => c.status === "pending").length,

  getUnlinkedCount: () =>
    get().commitments.filter(
      (c) => c.status === "confirmed" && c.linkedOrderIds.length === 0
    ).length,

  getWeeklyImportedCount: () => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return get().commitments.filter(
      (c) => new Date(c.createdAt).getTime() >= weekAgo
    ).length;
  },

  getDashboardStats: (): DashboardStats => {
    const sevenDayTrend: DailyStat[] = MOCK_SEVEN_DAY_TREND;
    return {
      pendingCount: get().getPendingCount(),
      unlinkedCount: get().getUnlinkedCount(),
      weeklyImported: get().getWeeklyImportedCount(),
      sevenDayTrend,
    };
  },

  getCommitmentsByStatus: (status) =>
    get().commitments.filter((c) => c.status === status),

  getCommitmentsBySupplier: (supplierId) =>
    get().commitments.filter((c) => c.supplierId === supplierId),

  getUnlinkedCommitments: () =>
    get().commitments.filter(
      (c) => c.status === "confirmed" && c.linkedOrderIds.length === 0
    ),
}));
