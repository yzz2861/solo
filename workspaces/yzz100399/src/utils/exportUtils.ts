import type { PlaygroundComponent, RiskItem, Scheme } from "@/types";

export function exportRectificationList(
  scheme: { name: string; maxHeight: number; bufferRange: number },
  components: PlaygroundComponent[],
  risks: RiskItem[]
): void {
  const lines: string[] = [];
  lines.push("═══════════════════════════════════════════");
  lines.push("  儿童乐园攀爬设施 — 整改清单");
  lines.push("═══════════════════════════════════════════");
  lines.push("");
  lines.push(`方案名称：${scheme.name}`);
  lines.push(`最大允许高度：${scheme.maxHeight}cm`);
  lines.push(`缓冲范围：${scheme.bufferRange}cm`);
  lines.push(`生成时间：${new Date().toLocaleString("zh-CN")}`);
  lines.push("");

  lines.push("── 部件清单 ──────────────────────────────");
  for (const comp of components) {
    const u = comp.unit === "m" ? "米" : "厘米";
    lines.push(`  ${comp.name}（${comp.type}）`);
    lines.push(`    位置：(${comp.position.x}, ${comp.position.y}, ${comp.position.z})`);
    lines.push(`    尺寸：${comp.dimensions.width}×${comp.dimensions.height}×${comp.dimensions.depth} ${u}`);
    if (comp.bufferZone > 0) {
      lines.push(`    缓冲区：${comp.bufferZone} ${u}`);
    }
    lines.push("");
  }

  lines.push("── 风险项目 ──────────────────────────────");
  if (risks.length === 0) {
    lines.push("  ✓ 未发现风险，方案通过安全检查");
  } else {
    const severityIcon: Record<string, string> = { critical: "✖", warning: "▲", info: "●" };
    for (const risk of risks) {
      const icon = severityIcon[risk.severity] || "●";
      const compNames = risk.componentIds
        .map((id) => components.find((c) => c.id === id)?.name || id)
        .join("、");
      lines.push(`  ${icon} [${risk.severity === "critical" ? "严重" : risk.severity === "warning" ? "警告" : "提示"}] ${risk.message}`);
      lines.push(`    涉及部件：${compNames}`);
      lines.push("");
    }
  }

  lines.push("═══════════════════════════════════════════");
  lines.push("  请厂家对照以上问题进行整改");
  lines.push("═══════════════════════════════════════════");

  const content = lines.join("\n");
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `整改清单_${scheme.name}_${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export function saveSchemeToStorage(scheme: Scheme): void {
  const existing: Scheme[] = JSON.parse(localStorage.getItem("playground_schemes") || "[]");
  const idx = existing.findIndex((s) => s.id === scheme.id);
  if (idx >= 0) {
    existing[idx] = { ...scheme, updatedAt: new Date().toISOString() };
  } else {
    existing.push(scheme);
  }
  localStorage.setItem("playground_schemes", JSON.stringify(existing));
  localStorage.setItem("playground_current", JSON.stringify(scheme));
}

export function loadSchemesFromStorage(): Scheme[] {
  return JSON.parse(localStorage.getItem("playground_schemes") || "[]") as Scheme[];
}

export function deleteSchemeFromStorage(id: string): void {
  const existing: Scheme[] = JSON.parse(localStorage.getItem("playground_schemes") || "[]");
  localStorage.setItem("playground_schemes", JSON.stringify(existing.filter((s) => s.id !== id)));
}
