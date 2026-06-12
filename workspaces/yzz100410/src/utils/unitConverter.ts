const M_TO_FT = 3.28084;

export function mToFt(m: number): number {
  return m * M_TO_FT;
}

export function ftToM(ft: number): number {
  return ft / M_TO_FT;
}

export function convertValue(value: number, from: "m" | "ft", to: "m" | "ft"): number {
  if (from === to) return value;
  return from === "m" ? mToFt(value) : ftToM(value);
}

export function formatValue(value: number, unit: "m" | "ft", decimals = 2): string {
  return `${value.toFixed(decimals)} ${unit}`;
}
