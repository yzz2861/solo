import Papa from "papaparse";
import type { Scheme } from "@/types";

export function exportChecklistCsv(scheme: Scheme): void {
  const rows: Record<string, string>[] = [];
  const maxLen = Math.max(scheme.modules.length, scheme.anchors.length);

  for (let i = 0; i < maxLen; i++) {
    const mod = scheme.modules[i];
    const anchor = scheme.anchors[i];
    const reviewItems: string[] = [];

    if (mod) {
      const widthM = mod.unit === "ft" ? mod.width / 3.28084 : mod.width;
      if (widthM < 1.2) reviewItems.push("通道宽度不足");
      if (mod.rotation > 15) reviewItems.push("旋转角度偏大");
    }
    if (anchor) {
      if (anchor.restrictedZone) reviewItems.push("锚点位于禁锚区");
      if (anchor.ropeLength < 5) reviewItems.push("绳索长度过短");
    }

    rows.push({
      "\u6A21\u5757\u7F16\u53F7": mod?.id ?? "",
      "\u7C7B\u578B": mod?.type ?? "",
      "\u957F\u5EA6": mod ? String(mod.length) : "",
      "\u5BBD\u5EA6": mod ? String(mod.width) : "",
      "\u627F\u91CD(kg)": mod ? String(mod.loadCapacity) : "",
      "\u951A\u70B9\u7F16\u53F7": anchor?.id ?? "",
      "\u951A\u70B9\u7C7B\u578B": anchor?.type ?? "",
      "\u951A\u70B9\u5750\u6807": anchor ? `(${anchor.position[0]},${anchor.position[1]},${anchor.position[2]})` : "",
      "\u590D\u6838\u4E8B\u9879": reviewItems.join(";"),
    });
  }

  const csv = Papa.unparse(rows, {
    columns: [
      "\u6A21\u5757\u7F16\u53F7",
      "\u7C7B\u578B",
      "\u957F\u5EA6",
      "\u5BBD\u5EA6",
      "\u627F\u91CD(kg)",
      "\u951A\u70B9\u7F16\u53F7",
      "\u951A\u70B9\u7C7B\u578B",
      "\u951A\u70B9\u5750\u6807",
      "\u590D\u6838\u4E8B\u9879",
    ],
  });

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${scheme.name}_checklist.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
