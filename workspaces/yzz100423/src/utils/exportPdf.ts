import { jsPDF } from "jspdf";
import type { WorkOrder, DefectType, OrderStatus } from "@/types";
import { DEFECT_TYPE_CONFIG, STATUS_CONFIG } from "@/utils/constants";
import {
  desensitizePhone,
  desensitizeName,
  desensitizeAddress,
} from "@/utils/desensitize";
import type { ExportOptions } from "./exportExcel";

function filterOrders(orders: WorkOrder[], options: ExportOptions): WorkOrder[] {
  let result = [...orders];

  if (options.dateFrom) {
    result = result.filter((o) => new Date(o.createdAt) >= new Date(options.dateFrom!));
  }

  if (options.dateTo) {
    const to = new Date(options.dateTo);
    to.setHours(23, 59, 59, 999);
    result = result.filter((o) => new Date(o.createdAt) <= to);
  }

  if (options.includeDisputedOnly) {
    result = result.filter((o) => o.isDisputed);
  }

  if (options.includeLowConfidence) {
    result = result.filter((o) => o.confidence < 60);
  }

  if (options.status && options.status !== "all") {
    result = result.filter((o) => o.status === options.status);
  }

  if (options.defectType && options.defectType !== "all") {
    result = result.filter((o) => o.tags.some((t) => t.type === options.defectType));
  }

  return result;
}

function formatDateForFilename(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDefectLabels(order: WorkOrder): string {
  if (!order.tags || order.tags.length === 0) return "无";
  return order.tags.map((t) => DEFECT_TYPE_CONFIG[t.type]?.label || t.type).join("\u3001");
}

function getStatusLabel(status: OrderStatus): string {
  return STATUS_CONFIG[status]?.label || status;
}

function calculateSummary(orders: WorkOrder[]) {
  const total = orders.length;
  const passed = orders.filter(
    (o) => o.status === "quality_passed" || o.status === "closed"
  ).length;
  const disputed = orders.filter((o) => o.isDisputed).length;
  const lowConfidence = orders.filter((o) => o.confidence < 60).length;
  const avgConfidence =
    total > 0
      ? Math.round(orders.reduce((sum, o) => sum + o.confidence, 0) / total)
      : 0;

  const defectCounts: Record<string, number> = {};
  orders.forEach((order) => {
    order.tags.forEach((tag) => {
      const label = DEFECT_TYPE_CONFIG[tag.type]?.label || tag.type;
      defectCounts[label] = (defectCounts[label] || 0) + 1;
    });
  });

  return { total, passed, disputed, lowConfidence, avgConfidence, defectCounts };
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 80) return "#059669";
  if (confidence >= 60) return "#d97706";
  return "#dc2626";
}