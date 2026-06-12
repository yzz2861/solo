import type { BridgeModule, AnchorPoint, EnvironmentParams, SafetyWarning } from "@/types";
import { ftToM } from "./unitConverter";

const MIN_PASSAGE_WIDTH_M = 1.2;
const MAX_CONNECTION_ANGLE_DEG = 15;
const MAX_TENSION_N = 50000;

export function calculateWindForce(windSpeed: number, area: number): number {
  return 0.5 * 1.225 * windSpeed * windSpeed * area * 1.2;
}

export function calculateWaveForce(waveHeight: number, area: number): number {
  return 0.5 * 1025 * 1.2 * area * (waveHeight * 0.5) * (waveHeight * 0.5);
}

export function calculateAnchorTension(
  modules: BridgeModule[],
  anchor: AnchorPoint,
  envParams: EnvironmentParams
): number {
  let totalArea = 0;
  for (const mod of modules) {
    const lengthM = mod.unit === "ft" ? ftToM(mod.length) : mod.length;
    const widthM = mod.unit === "ft" ? ftToM(mod.width) : mod.width;
    totalArea += lengthM * widthM;
  }
  const windForce = calculateWindForce(envParams.windSpeed, totalArea);
  const waveForce = calculateWaveForce(envParams.waveHeight, totalArea * 0.3);
  const visitorForce = envParams.visitorCount * envParams.visitorWeight * 9.81;
  return Math.sqrt(windForce * windForce + waveForce * waveForce) + visitorForce * 0.1;
}

export function calculateMinPassageWidth(
  modules: BridgeModule[]
): { width: number; moduleId1: string; moduleId2: string }[] {
  const results: { width: number; moduleId1: string; moduleId2: string }[] = [];
  for (let i = 0; i < modules.length - 1; i++) {
    const w1 = modules[i].unit === "ft" ? ftToM(modules[i].width) : modules[i].width;
    const w2 = modules[i + 1].unit === "ft" ? ftToM(modules[i + 1].width) : modules[i + 1].width;
    const gap = Math.min(w1, w2);
    results.push({ width: gap, moduleId1: modules[i].id, moduleId2: modules[i + 1].id });
  }
  return results;
}

export function calculateConnectionAngles(
  modules: BridgeModule[]
): { angle: number; moduleId1: string; moduleId2: string }[] {
  const results: { angle: number; moduleId1: string; moduleId2: string }[] = [];
  for (let i = 0; i < modules.length - 1; i++) {
    const angleDiff = Math.abs(modules[i].rotation - modules[i + 1].rotation);
    const normalized = angleDiff > 180 ? 360 - angleDiff : angleDiff;
    results.push({
      angle: normalized,
      moduleId1: modules[i].id,
      moduleId2: modules[i + 1].id,
    });
  }
  return results;
}

export function isAnchorInRestrictedZone(
  anchor: AnchorPoint,
  zones: { center: [number, number]; radius: number }[]
): boolean {
  const [ax, ay] = anchor.position;
  return zones.some(({ center, radius }) => {
    const dx = ax - center[0];
    const dy = ay - center[1];
    return Math.sqrt(dx * dx + dy * dy) < radius;
  });
}

export function isVisitorOverload(
  visitorCount: number,
  visitorWeight: number,
  modules: BridgeModule[]
): boolean {
  const totalLoad = visitorCount * visitorWeight;
  const totalCapacity = modules.reduce((sum, m) => sum + m.loadCapacity, 0);
  return totalLoad > totalCapacity;
}

export function runFullSafetyCheck(
  modules: BridgeModule[],
  anchors: AnchorPoint[],
  envParams: EnvironmentParams,
  currentUnit: "m" | "ft"
): SafetyWarning[] {
  const warnings: SafetyWarning[] = [];

  const unitMismatch = modules.some((m) => m.unit !== currentUnit);
  if (unitMismatch) {
    warnings.push({
      type: "unit_mismatch",
      level: "warning",
      message: "部分模块单位与当前全局单位不一致，请检查",
      relatedIds: modules.filter((m) => m.unit !== currentUnit).map((m) => m.id),
    });
  }

  if (isVisitorOverload(envParams.visitorCount, envParams.visitorWeight, modules)) {
    warnings.push({
      type: "overload",
      level: "danger",
      message: `游客总载荷 (${envParams.visitorCount}×${envParams.visitorWeight}kg) 超过桥体总承重`,
      relatedIds: modules.map((m) => m.id),
    });
  }

  const passageWidths = calculateMinPassageWidth(modules);
  for (const pw of passageWidths) {
    if (pw.width < MIN_PASSAGE_WIDTH_M) {
      warnings.push({
        type: "width",
        level: "danger",
        message: `通道宽度 ${pw.width.toFixed(2)}m 低于最小要求 ${MIN_PASSAGE_WIDTH_M}m`,
        relatedIds: [pw.moduleId1, pw.moduleId2],
      });
    }
  }

  const angles = calculateConnectionAngles(modules);
  for (const a of angles) {
    if (a.angle > MAX_CONNECTION_ANGLE_DEG) {
      warnings.push({
        type: "angle",
        level: "warning",
        message: `连接角度 ${a.angle.toFixed(1)}° 超过最大允许 ${MAX_CONNECTION_ANGLE_DEG}°`,
        relatedIds: [a.moduleId1, a.moduleId2],
      });
    }
  }

  const allRestrictedZones = anchors
    .filter((a) => a.restrictedZone)
    .map((a) => a.restrictedZone!);

  for (const anchor of anchors) {
    const tension = calculateAnchorTension(modules, anchor, envParams);
    if (tension > MAX_TENSION_N) {
      warnings.push({
        type: "tension",
        level: "danger",
        message: `锚点 ${anchor.id} 张力 ${tension.toFixed(0)}N 超过最大允许 ${MAX_TENSION_N}N`,
        relatedIds: [anchor.id],
      });
    }

    if (isAnchorInRestrictedZone(anchor, allRestrictedZones)) {
      warnings.push({
        type: "restricted",
        level: "danger",
        message: `锚点 ${anchor.id} 位于禁锚区内`,
        relatedIds: [anchor.id],
      });
    }
  }

  return warnings;
}
