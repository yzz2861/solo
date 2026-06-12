import type { Unit, Measurement } from "../types";

export function toMg(value: number, unit: Unit): number {
  switch (unit) {
    case "mg":
      return value;
    case "g":
      return value * 1000;
    case "kg":
      return value * 1000000;
    default:
      return value;
  }
}

export function fromMg(mg: number, unit: Unit): number {
  switch (unit) {
    case "mg":
      return mg;
    case "g":
      return mg / 1000;
    case "kg":
      return mg / 1000000;
    default:
      return mg;
  }
}

function autoSelectUnit(mg: number): Unit {
  const abs = Math.abs(mg);
  if (abs >= 1000000) return "kg";
  if (abs >= 1000) return "g";
  return "mg";
}

function formatSignificant(value: number, minSig: number, maxSig: number): string {
  if (!isFinite(value) || value === 0) {
    return "0";
  }
  const magnitude = Math.floor(Math.log10(Math.abs(value)));
  let sigFigs = Math.max(minSig, Math.min(maxSig, magnitude + 1));
  if (sigFigs < minSig) sigFigs = minSig;
  if (sigFigs > maxSig) sigFigs = maxSig;
  return value.toPrecision(sigFigs);
}

export function formatMg(
  mg: number,
  targetUnit?: Unit
): { value: string; unit: Unit } {
  const unit = targetUnit ?? autoSelectUnit(mg);
  const converted = fromMg(mg, unit);
  const formatted = formatSignificant(converted, 4, 6);
  return { value: formatted, unit };
}

function parseNumberWithUnit(token: string): { value: number; unit: Unit | null } {
  const trimmed = token.trim();
  if (!trimmed) return { value: NaN, unit: null };

  const unitMatch = trimmed.match(/(mg|g|kg)$/i);
  if (unitMatch) {
    const unitStr = unitMatch[1].toLowerCase() as Unit;
    const numStr = trimmed.slice(0, -unitMatch[1].length).trim();
    const num = parseFloat(numStr);
    return { value: num, unit: unitStr };
  }

  const num = parseFloat(trimmed);
  return { value: num, unit: null };
}

export function parsePastedMeasurements(
  text: string,
  defaultUnit: Unit
): Measurement[] {
  const results: Measurement[] = [];
  if (!text) return results;

  const lines = text.split(/\r?\n/);
  let globalIndex = 0;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    const tokens = trimmedLine.split(/[\t,;]|[,，]/).map((t) => t.trim()).filter(Boolean);

    for (const token of tokens) {
      const parsed = parseNumberWithUnit(token);
      if (isNaN(parsed.value)) continue;
      globalIndex++;
      results.push({
        index: globalIndex,
        value: parsed.value,
        unit: parsed.unit ?? defaultUnit,
      });
    }
  }

  return results;
}
