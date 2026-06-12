export type DefectType =
  | "crack"
  | "missing_part"
  | "stain"
  | "water_damage"
  | "human_damage"
  | "old_repair";

export type OrderStatus =
  | "pending"
  | "screened"
  | "customer_reviewed"
  | "quality_check"
  | "quality_passed"
  | "disputed"
  | "closed";

export type TagSource = "ai" | "human";

export interface Photo {
  id: string;
  orderId: string;
  url: string;
  angle: string;
  clarity: number;
  brightness: number;
}

export interface DefectTag {
  id: string;
  orderId: string;
  type: DefectType;
  confidence: number;
  source: TagSource;
  createdAt: string;
}

export interface EvidenceArea {
  id: string;
  photoId: string;
  tagType: DefectType;
  x: number;
  y: number;
  width: number;
  height: number;
  description: string;
}

export interface AuditLog {
  id: string;
  orderId: string;
  operator: string;
  action: string;
  beforeValue?: string;
  afterValue?: string;
  remark?: string;
  createdAt: string;
}

export interface ConfidenceFactor {
  factor: string;
  impact: number;
  description: string;
}

export interface WorkOrder {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  applianceType: string;
  applianceModel?: string;
  remark: string;
  status: OrderStatus;
  confidence: number;
  isDisputed: boolean;
  confidenceFactors: ConfidenceFactor[];
  createdBy: string;
  createdAt: string;
  photos: Photo[];
  tags: DefectTag[];
  evidenceAreas: EvidenceArea[];
  auditLogs: AuditLog[];
  tagModifyCount: number;
}

export type OrderFilter = {
  status?: OrderStatus;
  defectType?: DefectType;
  confidenceMin?: number;
  isDisputed?: boolean;
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
};
