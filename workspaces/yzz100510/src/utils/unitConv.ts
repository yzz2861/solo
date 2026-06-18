export type VolumeUnit = "m3" | "ft3";
export type LengthUnit = "m" | "ft";
export type DiameterUnit = "mm" | "in";
export type FilterType = "none" | "coarse" | "medium" | "fine" | "custom" | "unknown";

export const FILTER_RESISTANCE_MAP: Record<FilterType, { value: number; label: string; isEstimated: boolean }> = {
  none: { value: 0, label: "无过滤网", isEstimated: false },
  coarse: { value: 50, label: "初效过滤网", isEstimated: true },
  medium: { value: 120, label: "中效过滤网", isEstimated: true },
  fine: { value: 250, label: "高效过滤网", isEstimated: true },
  custom: { value: 0, label: "自定义", isEstimated: false },
  unknown: { value: 150, label: "未知（保守估算）", isEstimated: true },
};

export const FT3_TO_M3 = 0.0283168;
export const FT_TO_M = 0.3048;
export const IN_TO_MM = 25.4;
export const MM_TO_M = 0.001;
export const M3H_TO_CFM = 0.5886;
export const CFM_TO_M3H = 1 / M3H_TO_CFM;

export function volumeToM3(value: number, unit: VolumeUnit): number {
  return unit === "ft3" ? value * FT3_TO_M3 : value;
}

export function lengthToM(value: number, unit: LengthUnit): number {
  return unit === "ft" ? value * FT_TO_M : value;
}

export function diameterToM(value: number, unit: DiameterUnit): number {
  const mm = unit === "in" ? value * IN_TO_MM : value;
  return mm * MM_TO_M;
}

export function m3hToCfm(m3h: number): number {
  return m3h * M3H_TO_CFM;
}

export function cfmToM3h(cfm: number): number {
  return cfm * CFM_TO_M3H;
}

export function volumeToUnit(m3: number, unit: VolumeUnit): number {
  return unit === "ft3" ? m3 / FT3_TO_M3 : m3;
}

export function lengthToUnit(m: number, unit: LengthUnit): number {
  return unit === "ft" ? m / FT_TO_M : m;
}

export function diameterToUnit(m: number, unit: DiameterUnit): number {
  const mm = m / MM_TO_M;
  return unit === "in" ? mm / IN_TO_MM : mm;
}
