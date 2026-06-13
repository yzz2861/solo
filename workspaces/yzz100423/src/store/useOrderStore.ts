import { create } from "zustand";
import type {
  WorkOrder,
  DefectTag,
  OrderFilter,
  DefectType,
  OrderStatus,
  AuditLog,
  Photo,
  EvidenceArea,
  ConfidenceFactor,
} from "@/types";
import { generateMockOrders } from "@/utils/mockData";
import { calculateConfidence, isDisputedOrder } from "@/utils/confidence";

interface OrderState {
  orders: WorkOrder[];
  filter: OrderFilter;
  selectedOrderId: string | null;
  isLoading: boolean;

  initMockData: () => void;
  setFilter: (filter: Partial<OrderFilter>) => void;
  setSelectedOrder: (id: string | null) => void;
  getOrderById: (id: string) => WorkOrder | undefined;
  getFilteredOrders: () => WorkOrder[];

  addTag: (orderId: string, tagType: DefectType, operator: string) => void;
  removeTag: (orderId: string, tagId: string, operator: string) => void;
  updateTagConfidence: (
    orderId: string,
    tagId: string,
    confidence: number,
    operator: string
  ) => void;

  updateOrderStatus: (
    orderId: string,
    status: OrderStatus,
    operator: string,
    remark?: string
  ) => void;

  markAsDisputed: (orderId: string, operator: string, remark?: string) => void;
  unmarkDisputed: (orderId: string, operator: string, remark?: string) => void;

  addAuditLog: (orderId: string, log: Omit<AuditLog, "id" | "orderId" | "createdAt">) => void;

  getQualityPendingOrders: () => WorkOrder[];
  getDisputedOrders: () => WorkOrder[];
}

function randomId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 11)}`;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  filter: {},
  selectedOrderId: null,
  isLoading: false,

  initMockData: () => {
    const orders = generateMockOrders(15);
    set({ orders, isLoading: false });
  },

  setFilter: (filter) => {
    set((state) => ({ filter: { ...state.filter, ...filter } }));
  },

  setSelectedOrder: (id) => {
    set({ selectedOrderId: id });
  },

  getOrderById: (id) => {
    return get().orders.find((o) => o.id === id);
  },

  getFilteredOrders: () => {
    const { orders, filter } = get();
    let result = [...orders];

    if (filter.status) {
      result = result.filter((o) => o.status === filter.status);
    }

    if (filter.defectType) {
      result = result.filter((o) => o.tags.some((t) => t.type === filter.defectType));
    }

    if (filter.confidenceMin !== undefined) {
      result = result.filter((o) => o.confidence >= filter.confidenceMin!);
    }

    if (filter.isDisputed !== undefined) {
      result = result.filter((o) => o.isDisputed === filter.isDisputed);
    }

    if (filter.keyword) {
      const kw = filter.keyword.toLowerCase();
      result = result.filter(
        (o) =>
          o.id.toLowerCase().includes(kw) ||
          o.customerName.includes(kw) ||
          o.applianceType.includes(kw) ||
          o.remark.includes(kw)
      );
    }

    if (filter.dateFrom) {
      result = result.filter((o) => new Date(o.createdAt) >= new Date(filter.dateFrom!));
    }

    if (filter.dateTo) {
      const to = new Date(filter.dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((o) => new Date(o.createdAt) <= to);
    }

    return result;
  },

  addTag: (orderId, tagType, operator) => {
    set((state) => {
      const orders = state.orders.map((order) => {
        if (order.id !== orderId) return order;

        const existingTag = order.tags.find((t) => t.type === tagType);
        if (existingTag) return order;

        const newTag: DefectTag = {
          id: randomId("tag"),
          orderId,
          type: tagType,
          confidence: 85,
          source: "human",
          createdAt: new Date().toISOString(),
        };

        const newTags = [...order.tags, newTag];

        const hasOldRepair = newTags.some((t) => t.type === "old_repair");
        const { overallConfidence, factors } = calculateConfidence({
          photos: order.photos,
          tags: newTags,
          remark: order.remark,
          hasOldRepair,
        });

        const newLog: AuditLog = {
          id: randomId("log"),
          orderId,
          operator,
          action: "添加标签",
          afterValue: `新增标签：${tagType}`,
          createdAt: new Date().toISOString(),
        };

        const disputed = isDisputedOrder({
          ...order,
          tags: newTags,
          confidence: overallConfidence,
          isDisputed: false,
          tagModifyCount: order.tagModifyCount + 1,
        });

        return {
          ...order,
          tags: newTags,
          confidence: overallConfidence,
          confidenceFactors: factors,
          auditLogs: [...order.auditLogs, newLog],
          tagModifyCount: order.tagModifyCount + 1,
          isDisputed: disputed,
          status: disputed ? "disputed" : order.status,
        };
      });

      return { orders };
    });
  },

  removeTag: (orderId, tagId, operator) => {
    set((state) => {
      const orders = state.orders.map((order) => {
        if (order.id !== orderId) return order;

        const tagToRemove = order.tags.find((t) => t.id === tagId);
        if (!tagToRemove) return order;

        const newTags = order.tags.filter((t) => t.id !== tagId);

        const hasOldRepair = newTags.some((t) => t.type === "old_repair");
        const { overallConfidence, factors } = calculateConfidence({
          photos: order.photos,
          tags: newTags,
          remark: order.remark,
          hasOldRepair,
        });

        const newLog: AuditLog = {
          id: randomId("log"),
          orderId,
          operator,
          action: "删除标签",
          beforeValue: `删除标签：${tagToRemove.type}`,
          createdAt: new Date().toISOString(),
        };

        return {
          ...order,
          tags: newTags,
          confidence: overallConfidence,
          confidenceFactors: factors,
          auditLogs: [...order.auditLogs, newLog],
          tagModifyCount: order.tagModifyCount + 1,
        };
      });

      return { orders };
    });
  },

  updateTagConfidence: (orderId, tagId, confidence, operator) => {
    set((state) => {
      const orders = state.orders.map((order) => {
        if (order.id !== orderId) return order;

        const oldTag = order.tags.find((t) => t.id === tagId);
        if (!oldTag) return order;

        const newTags = order.tags.map((t) =>
          t.id === tagId ? { ...t, confidence, source: "human" as const } : t
        );

        const hasOldRepair = newTags.some((t) => t.type === "old_repair");
        const { overallConfidence, factors } = calculateConfidence({
          photos: order.photos,
          tags: newTags,
          remark: order.remark,
          hasOldRepair,
        });

        const newLog: AuditLog = {
          id: randomId("log"),
          orderId,
          operator,
          action: "调整标签置信度",
          beforeValue: `${oldTag.type}: ${oldTag.confidence}%`,
          afterValue: `${oldTag.type}: ${confidence}%`,
          createdAt: new Date().toISOString(),
        };

        const disputed = isDisputedOrder({
          ...order,
          tags: newTags,
          confidence: overallConfidence,
          isDisputed: false,
          tagModifyCount: order.tagModifyCount + 1,
        });

        return {
          ...order,
          tags: newTags,
          confidence: overallConfidence,
          confidenceFactors: factors,
          auditLogs: [...order.auditLogs, newLog],
          tagModifyCount: order.tagModifyCount + 1,
          isDisputed: disputed,
          status: disputed ? "disputed" : order.status,
        };
      });

      return { orders };
    });
  },

  updateOrderStatus: (orderId, status, operator, remark) => {
    set((state) => {
      const orders = state.orders.map((order) => {
        if (order.id !== orderId) return order;

        const newLog: AuditLog = {
          id: randomId("log"),
          orderId,
          operator,
          action: "状态变更",
          beforeValue: order.status,
          afterValue: status,
          remark,
          createdAt: new Date().toISOString(),
        };

        return {
          ...order,
          status,
          auditLogs: [...order.auditLogs, newLog],
        };
      });

      return { orders };
    });
  },

  markAsDisputed: (orderId, operator, remark) => {
    set((state) => {
      const orders = state.orders.map((order) => {
        if (order.id !== orderId) return order;

        const newLog: AuditLog = {
          id: randomId("log"),
          orderId,
          operator,
          action: "标记为争议件",
          remark,
          createdAt: new Date().toISOString(),
        };

        return {
          ...order,
          isDisputed: true,
          status: "disputed" as const,
          auditLogs: [...order.auditLogs, newLog],
        };
      });

      return { orders };
    });
  },

  unmarkDisputed: (orderId, operator, remark) => {
    set((state) => {
      const orders = state.orders.map((order) => {
        if (order.id !== orderId) return order;

        const newLog: AuditLog = {
          id: randomId("log"),
          orderId,
          operator,
          action: "解除争议标记",
          remark,
          createdAt: new Date().toISOString(),
        };

        return {
          ...order,
          isDisputed: false,
          status: "quality_passed" as const,
          auditLogs: [...order.auditLogs, newLog],
        };
      });

      return { orders };
    });
  },

  addAuditLog: (orderId, log) => {
    set((state) => {
      const orders = state.orders.map((order) => {
        if (order.id !== orderId) return order;

        const newLog: AuditLog = {
          ...log,
          id: randomId("log"),
          orderId,
          createdAt: new Date().toISOString(),
        };

        return {
          ...order,
          auditLogs: [...order.auditLogs, newLog],
        };
      });

      return { orders };
    });
  },

  getQualityPendingOrders: () => {
    return get().orders.filter(
      (o) => o.status === "quality_check" || o.confidence < 70
    );
  },

  getDisputedOrders: () => {
    return get().orders.filter((o) => o.isDisputed || o.status === "disputed");
  },
}));
