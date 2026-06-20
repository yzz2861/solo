import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import type { Commitment, Order, ViewType } from "@/types";
import {
  CONFIDENCE_LABELS,
  STATUS_LABELS,
  EXTRACT_FIELD_LABELS,
} from "@/types";

const fmt = (v: unknown) => (v === null || v === undefined ? "" : String(v));

const confidenceText = (c: string) => CONFIDENCE_LABELS[c as keyof typeof CONFIDENCE_LABELS] || c;

const listStr = (arr: string[] | null) => (arr && arr.length ? arr.join("、") : "无");

export interface ExportRow {
  供应商: string;
  交期: string;
  交期置信度: string;
  数量: string;
  数量置信度: string;
  价格: string;
  价格置信度: string;
  替代料: string;
  附加条件: string;
  状态: string;
  关联订单: string;
  确认人: string;
  确认时间: string;
  创建时间: string;
}

export const buildExportRows = (
  commitments: Commitment[],
  orders: Order[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _view: ViewType
): ExportRow[] => {
  return commitments
    .filter((c) => c.status !== "rejected")
    .map((c) => {
      const linkedOrderNos = c.linkedOrderIds
        .map((id) => orders.find((o) => o.id === id)?.orderNo)
        .filter(Boolean)
        .join("、");
      return {
        供应商: fmt(c.supplierName),
        交期: fmt(c.deliveryDate.value),
        交期置信度: confidenceText(c.deliveryDate.confidence),
        数量: c.quantity.value === null ? "" : fmt(c.quantity.value),
        数量置信度: confidenceText(c.quantity.confidence),
        价格: c.price.value === null ? "按上次" : fmt(c.price.value),
        价格置信度: confidenceText(c.price.confidence),
        替代料: listStr(c.alternativeMaterials.value),
        附加条件: fmt(c.additionalTerms.value) || "无",
        状态: STATUS_LABELS[c.status] || c.status,
        关联订单: linkedOrderNos || "未关联",
        确认人: fmt(c.confirmedBy) || "-",
        确认时间: c.confirmedAt
          ? new Date(c.confirmedAt).toLocaleString("zh-CN")
          : "-",
        创建时间: new Date(c.createdAt).toLocaleString("zh-CN"),
      };
    });
};

export const exportToExcel = (
  commitments: Commitment[],
  orders: Order[],
  view: ViewType,
  filename = `供应商承诺表_${new Date().toISOString().slice(0, 10)}.xlsx`
) => {
  const rows = buildExportRows(commitments, orders, view);
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [
    { wch: 24 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
    { wch: 10 }, { wch: 10 }, { wch: 24 }, { wch: 36 }, { wch: 8 },
    { wch: 22 }, { wch: 10 }, { wch: 20 }, { wch: 20 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "承诺表");
  XLSX.writeFile(wb, filename);
};

export const exportEvidenceAudit = (commitment: Commitment) => {
  const fields = [
    { key: "deliveryDate", label: EXTRACT_FIELD_LABELS.deliveryDate },
    { key: "quantity", label: EXTRACT_FIELD_LABELS.quantity },
    { key: "price", label: EXTRACT_FIELD_LABELS.price },
    { key: "alternativeMaterials", label: EXTRACT_FIELD_LABELS.alternativeMaterials },
    { key: "additionalTerms", label: EXTRACT_FIELD_LABELS.additionalTerms },
  ] as const;

  const rows = fields.map((f) => {
    const field = commitment[f.key] as {
      value: unknown; confidence: string; reasons: string[]; evidenceSentence: string; isEdited: boolean;
    };
    const v = Array.isArray(field.value) ? listStr(field.value as string[]) : fmt(field.value);
    return {
      字段: f.label,
      抽取值: v === "null" ? "" : v,
      置信度: confidenceText(field.confidence),
      人工修正: field.isEdited ? "是" : "否",
      证据句: field.evidenceSentence || "-",
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [{ wch: 10 }, { wch: 24 }, { wch: 10 }, { wch: 10 }, { wch: 60 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "证据清单");

  if (commitment.auditLogs.length) {
    const auditRows = commitment.auditLogs.map((log) => ({
      时间: new Date(log.timestamp).toLocaleString("zh-CN"),
      操作人: log.operatorName,
      修改字段: EXTRACT_FIELD_LABELS[log.fieldChanged as keyof typeof EXTRACT_FIELD_LABELS] || log.fieldChanged,
      旧值: fmt(log.oldValue) || "(空)",
      新值: Array.isArray(log.newValue) ? listStr(log.newValue as string[]) : fmt(log.newValue) || "(空)",
      备注: log.note || "-",
    }));
    const ws2 = XLSX.utils.json_to_sheet(auditRows);
    ws2["!cols"] = [{ wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, ws2, "修正历史");
  }

  XLSX.writeFile(wb, `承诺证据_${commitment.id}_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

export const exportToPDF = (
  commitments: Commitment[],
  orders: Order[],
  filename = `供应商承诺表_${new Date().toISOString().slice(0, 10)}.pdf`
) => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  doc.setFontSize(16);
  doc.text("供应商承诺汇总表", 40, 50);
  doc.setFontSize(10);
  doc.text(`生成时间：${new Date().toLocaleString("zh-CN")}`, 40, 70);

  const headers = ["供应商", "交期", "数量", "价格", "替代料", "状态", "关联订单"];
  const colWidths = [110, 70, 50, 60, 80, 50, 90];
  let y = 100;

  doc.setFillColor(30, 58, 95);
  doc.setTextColor(255, 255, 255);
  let x = 40;
  headers.forEach((h, i) => {
    doc.rect(x, y - 14, colWidths[i], 20, "F");
    doc.text(h, x + 4, y);
    x += colWidths[i];
  });
  doc.setTextColor(30, 58, 95);
  y += 14;

  const rows = commitments.filter((c) => c.status !== "rejected").slice(0, 25);
  rows.forEach((c) => {
    const linkedOrderNos = c.linkedOrderIds
      .map((id) => orders.find((o) => o.id === id)?.orderNo)
      .filter(Boolean)
      .join(",") || "-";
    const cells = [
      (c.supplierName || "").slice(0, 14),
      c.deliveryDate.value ? String(c.deliveryDate.value).slice(0, 10) : "-",
      c.quantity.value === null ? "-" : String(c.quantity.value),
      c.price.value === null ? "按上次" : String(c.price.value),
      listStr(c.alternativeMaterials.value).slice(0, 12) || "-",
      STATUS_LABELS[c.status] || "-",
      linkedOrderNos,
    ];
    let cx = 40;
    cells.forEach((v, i) => {
      doc.text(v, cx + 4, y);
      doc.rect(cx, y - 14, colWidths[i], 20);
      cx += colWidths[i];
    });
    y += 20;
    if (y > 780) {
      doc.addPage();
      y = 50;
    }
  });

  doc.save(filename);
};
