import type { PlaygroundComponent, RiskItem } from "@/types";

function toCm(value: number, unit: "cm" | "m"): number {
  return unit === "m" ? value * 100 : value;
}

function getBoundingBox(comp: PlaygroundComponent) {
  const w = toCm(comp.dimensions.width, comp.unit) / 2;
  const h = toCm(comp.dimensions.height, comp.unit);
  const d = toCm(comp.dimensions.depth, comp.unit) / 2;
  const buffer = toCm(comp.bufferZone, comp.unit);
  const px = toCm(comp.position.x, comp.unit);
  const py = toCm(comp.position.y, comp.unit);
  const pz = toCm(comp.position.z, comp.unit);

  return {
    minX: px - w - buffer,
    maxX: px + w + buffer,
    minY: py,
    maxY: py + h,
    minZ: pz - d - buffer,
    maxZ: pz + d + buffer,
  };
}

function boxesOverlap(a: ReturnType<typeof getBoundingBox>, b: ReturnType<typeof getBoundingBox>): boolean {
  return a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY && a.minZ < b.maxZ && a.maxZ > b.minZ;
}

function isSupervisorVisible(sup: PlaygroundComponent, target: PlaygroundComponent, allComponents: PlaygroundComponent[]): boolean {
  const supPos = { x: toCm(sup.position.x, sup.unit), y: toCm(sup.position.y, sup.unit) + toCm(sup.dimensions.height, sup.unit) * 0.9, z: toCm(sup.position.z, sup.unit) };
  const tgtCenter = {
    x: toCm(target.position.x, target.unit),
    y: toCm(target.position.y, target.unit) + toCm(target.dimensions.height, target.unit) / 2,
    z: toCm(target.position.z, target.unit),
  };

  const dx = tgtCenter.x - supPos.x;
  const dy = tgtCenter.y - supPos.y;
  const dz = tgtCenter.z - supPos.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (dist < 1) return true;

  const steps = 10;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const px = supPos.x + dx * t;
    const py = supPos.y + dy * t;
    const pz = supPos.z + dz * t;

    for (const comp of allComponents) {
      if (comp.id === sup.id || comp.id === target.id) continue;
      if (comp.type === "supervisor" || comp.type === "softpad") continue;

      const bb = getBoundingBox(comp);
      if (px >= bb.minX && px <= bb.maxX && py >= bb.minY && py <= bb.maxY && pz >= bb.minZ && pz <= bb.maxZ) {
        return false;
      }
    }
  }
  return true;
}

export function detectRisks(components: PlaygroundComponent[], maxHeight: number, bufferRange: number): RiskItem[] {
  const risks: RiskItem[] = [];
  let riskId = 0;

  for (const comp of components) {
    const heightCm = toCm(comp.dimensions.height, comp.unit);
    const posTopCm = toCm(comp.position.y, comp.unit) + heightCm;

    if (posTopCm > maxHeight && comp.type !== "supervisor" && comp.type !== "softpad") {
      risks.push({
        id: `risk_${riskId++}`,
        type: "height_exceed",
        severity: posTopCm > maxHeight * 1.2 ? "critical" : "warning",
        componentIds: [comp.id],
        message: `${comp.name} 顶部高度 ${posTopCm.toFixed(0)}cm 超出最大允许高度 ${maxHeight}cm`,
      });
    }

    if (comp.unit === "m" && (comp.dimensions.height > 10 || comp.dimensions.width > 10 || comp.dimensions.depth > 10)) {
      risks.push({
        id: `risk_${riskId++}`,
        type: "unit_error",
        severity: "warning",
        componentIds: [comp.id],
        message: `${comp.name} 单位设为"米"，但尺寸数值（${comp.dimensions.width}×${comp.dimensions.height}×${comp.dimensions.depth}）偏大，疑似单位选择错误，请确认应为"厘米"`,
      });
    }

    if (comp.type === "softpad") {
      const padW = toCm(comp.dimensions.width, comp.unit);
      const padD = toCm(comp.dimensions.depth, comp.unit);
      const padPos = { x: toCm(comp.position.x, comp.unit), z: toCm(comp.position.z, comp.unit) };

      const nearbyPlatforms = components.filter((c) => {
        if (c.type !== "platform" && c.type !== "slide") return false;
        const cx = toCm(c.position.x, c.unit);
        const cz = toCm(c.position.z, c.unit);
        const dist = Math.sqrt((cx - padPos.x) ** 2 + (cz - padPos.z) ** 2);
        return dist < 300;
      });

      for (const platform of nearbyPlatforms) {
        const platW = toCm(platform.dimensions.width, platform.unit);
        const platD = toCm(platform.dimensions.depth, platform.unit);
        const requiredW = platW + toCm(comp.bufferZone, comp.unit) * 2;
        const requiredD = platD + toCm(comp.bufferZone, comp.unit) * 2;

        if (padW < requiredW || padD < requiredD) {
          risks.push({
            id: `risk_${riskId++}`,
            type: "coverage_insufficient",
            severity: "warning",
            componentIds: [comp.id, platform.id],
            message: `软包"${comp.name}"覆盖不足：${platform.name}需要 ${requiredW.toFixed(0)}×${requiredD.toFixed(0)}cm 的软包区域，当前仅 ${padW.toFixed(0)}×${padD.toFixed(0)}cm`,
          });
        }
      }
    }

    if (comp.type === "slide") {
      const slideExitZ = toCm(comp.position.z, comp.unit) + toCm(comp.dimensions.depth, comp.unit) / 2;
      const slideExitY = toCm(comp.position.y, comp.unit);

      for (const other of components) {
        if (other.id === comp.id) continue;
        if (other.type !== "platform") continue;
        const otherZ = toCm(other.position.z, comp.unit);
        const otherY = toCm(other.position.y, comp.unit);
        const dist = Math.abs(slideExitZ - otherZ);
        const heightDiff = Math.abs(slideExitY - otherY);

        if (dist < bufferRange && heightDiff < 50) {
          risks.push({
            id: `risk_${riskId++}`,
            type: "collision",
            severity: dist < bufferRange * 0.5 ? "critical" : "warning",
            componentIds: [comp.id, other.id],
            message: `${comp.name}出口与${other.name}距离仅 ${dist.toFixed(0)}cm，小于缓冲范围 ${bufferRange}cm`,
          });
        }
      }
    }
  }

  for (let i = 0; i < components.length; i++) {
    for (let j = i + 1; j < components.length; j++) {
      const a = components[i];
      const b = components[j];
      if (a.type === "softpad" || b.type === "softpad") continue;
      if (a.type === "supervisor" || b.type === "supervisor") continue;

      const bbA = getBoundingBox(a);
      const bbB = getBoundingBox(b);

      if (boxesOverlap(bbA, bbB)) {
        const alreadyExists = risks.some(
          (r) => r.type === "collision" && r.componentIds.includes(a.id) && r.componentIds.includes(b.id)
        );
        if (!alreadyExists) {
          risks.push({
            id: `risk_${riskId++}`,
            type: "collision",
            severity: "critical",
            componentIds: [a.id, b.id],
            message: `${a.name}与${b.name}发生碰撞，请调整位置`,
          });
        }
      }
    }
  }

  const supervisors = components.filter((c) => c.type === "supervisor");
  const checkableComponents = components.filter((c) => c.type !== "supervisor" && c.type !== "softpad");

  if (supervisors.length > 0 && checkableComponents.length > 0) {
    for (const comp of checkableComponents) {
      const visibleByAny = supervisors.some((sup) => isSupervisorVisible(sup, comp, components));
      if (!visibleByAny) {
        risks.push({
          id: `risk_${riskId++}`,
          type: "blind_spot",
          severity: "critical",
          componentIds: [comp.id],
          message: `${comp.name}处于所有看护点视线盲区中，无法被任何看护员观察到`,
        });
      }
    }
  } else if (checkableComponents.length > 0 && supervisors.length === 0) {
    risks.push({
      id: `risk_${riskId++}`,
      type: "blind_spot",
      severity: "warning",
      componentIds: checkableComponents.map((c) => c.id),
      message: "场景中未放置看护点，所有部件均处于无监控状态",
    });
  }

  return risks.sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });
}

export { isSupervisorVisible };
