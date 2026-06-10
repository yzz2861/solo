export type TagStatus = "draft" | "confirmed" | "printed";
export type IssueLevel = "error" | "warning" | "info";
export type IssueType = "empty" | "duplicate" | "price" | "promotion";

export interface PriceTag {
  id: string;
  category: string;
  name: string;
  origin: string;
  grade: string;
  boxSpec: number;
  jinPrice: number;
  boxPrice: number;
  memberDiscount: number;
  promoStart: string;
  promoEnd: string;
  remark: string;
  status: TagStatus;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  confirmedBy?: string;
  printedAt?: string;
  printedBy?: string;
}

export interface ValidationIssue {
  tagId: string;
  level: IssueLevel;
  type: IssueType;
  message: string;
  field?: string;
}

export interface AuditLog {
  id: string;
  tagId: string;
  action: "edit" | "confirm" | "reject" | "print";
  operator: string;
  timestamp: string;
  detail?: string;
}

export type PaperType = "a4-30" | "sticker-10" | "thermal";

export interface PrintSettings {
  paper: PaperType;
  onlyConfirmed: boolean;
  marginMm: number;
}

export interface SaveStatus {
  status: "idle" | "saving" | "saved" | "failed";
  lastSavedAt?: string;
}

export const CATEGORIES = [
  "浆果",
  "柑橘",
  "仁果",
  "核果",
  "瓜果",
  "热带",
  "进口",
  "其他",
];

export const GRADES = ["A", "AA", "AAA", "特选", "精选"];
