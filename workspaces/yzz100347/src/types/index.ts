export type PriceUnit = "斤" | "公斤";

export type ItemStatus = "confirmed" | "pending" | "ask_vendor";

export type ConfirmSource = "oral" | "ocr" | "manual" | "pending";

export type AnomalyType =
  | "unit_mismatch"
  | "price_surge"
  | "name_variant"
  | "ocr_unclear"
  | "unconfirmed";

export type AnomalySeverity = "warning" | "error";

export type SessionStatus = "draft" | "verified" | "published";

export interface PriceItem {
  id: string;
  name: string;
  category: string;
  oralPrice?: number;
  oralUnit?: PriceUnit;
  ocrPrice?: number;
  ocrUnit?: PriceUnit;
  ocrConfidence?: number;
  yesterdayPrice?: number;
  yesterdayUnit?: PriceUnit;
  confirmedPrice?: number;
  confirmedUnit?: PriceUnit;
  confirmedSource?: ConfirmSource;
  status: ItemStatus;
  stallNo: string;
}

export interface PriceSession {
  id: string;
  date: string;
  items: PriceItem[];
  broadcastScript: string;
  changeLog: ChangeRecord[];
  status: SessionStatus;
}

export interface ChangeRecord {
  id: string;
  sessionId: string;
  itemId: string;
  itemName: string;
  field: string;
  oldValue: string;
  newValue: string;
  reason: string;
  timestamp: string;
}

export interface AnomalyAlert {
  id: string;
  itemId: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  message: string;
  suggestion: string;
}

export const UNIT_CONVERT: Record<PriceUnit, number> = {
  "斤": 1,
  "公斤": 2,
};

export function toJin(price: number, unit: PriceUnit): number {
  return price * UNIT_CONVERT[unit];
}

export function formatPrice(price: number | undefined, unit: PriceUnit | undefined): string {
  if (price === undefined || unit === undefined) return "—";
  return `${price.toFixed(1)}元/${unit}`;
}

export function calcChangeRate(
  currentPrice: number,
  currentUnit: PriceUnit,
  yesterPrice: number,
  yesterUnit: PriceUnit
): number {
  const currentJin = toJin(currentPrice, currentUnit);
  const yesterJin = toJin(yesterPrice, yesterUnit);
  if (yesterJin === 0) return 0;
  return ((currentJin - yesterJin) / yesterJin) * 100;
}
