import type { AuditLog, PriceTag } from "@/types";

export function exportLogsCsv(logs: AuditLog[], tags: PriceTag[]): string {
  const tagMap = new Map(tags.map((t) => [t.id, t]));
  const header = ["时间", "操作", "操作人", "品类", "品名", "产地", "详情"];
  const rows = logs.map((log) => {
    const tag = tagMap.get(log.tagId);
    const actionText: Record<string, string> = {
      edit: "编辑",
      confirm: "老板确认",
      reject: "驳回",
      print: "打印",
    };
    return [
      new Date(log.timestamp).toLocaleString("zh-CN"),
      actionText[log.action] || log.action,
      log.operator || "-",
      tag?.category || "-",
      tag?.name || "-",
      tag?.origin || "-",
      log.detail || "",
    ]
      .map((c) => `"${String(c).replace(/"/g, '""')}"`)
      .join(",");
  });
  return [header.join(","), ...rows].join("\n");
}

export function exportTagsCsv(tags: PriceTag[]): string {
  const header = [
    "品类",
    "品名",
    "产地",
    "等级",
    "箱规(斤)",
    "斤价",
    "箱价",
    "会员折扣",
    "促销开始",
    "促销结束",
    "状态",
    "确认人",
    "打印人",
    "备注",
  ];
  const statusText: Record<string, string> = {
    draft: "草稿",
    confirmed: "待打印",
    printed: "已打印",
  };
  const rows = tags.map((t) =>
    [
      t.category,
      t.name,
      t.origin,
      t.grade,
      t.boxSpec,
      t.jinPrice,
      t.boxPrice,
      t.memberDiscount,
      t.promoStart,
      t.promoEnd,
      statusText[t.status] || t.status,
      t.confirmedBy || "",
      t.printedBy || "",
      t.remark,
    ]
      .map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`)
      .join(",")
  );
  return [header.join(","), ...rows].join("\n");
}

export function downloadCsv(content: string, filename: string) {
  const bom = "\uFEFF";
  const blob = new Blob([bom + content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
