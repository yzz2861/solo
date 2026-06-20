export type ConfidenceLevel = "high" | "medium" | "low";

export type ConfidenceReason =
  | "direct_statement"
  | "forward_chain"
  | "screenshot_ocr"
  | "vague_time"
  | "context_revocation"
  | "manual_override";

export interface ForwardChainItem {
  index: number;
  sender: string;
  date: string;
  content: string;
}

export type AttachmentType = "image" | "pdf" | "excel" | "other";

export interface Attachment {
  id: string;
  name: string;
  type: AttachmentType;
  size: number;
  isQuote: boolean;
  ocrText?: string;
  isOcrProcessed: boolean;
}

export interface Email {
  id: string;
  subject: string;
  sender: string;
  senderEmail: string;
  supplierId: string;
  supplierName: string;
  receivedAt: string;
  content: string;
  rawContent: string;
  forwardChain: ForwardChainItem[];
  attachments: Attachment[];
  isForwarded: boolean;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone?: string;
}

export interface ExtractedField<T> {
  value: T | null;
  confidence: ConfidenceLevel;
  reasons: ConfidenceReason[];
  evidenceSentence: string;
  evidenceRange: [number, number];
  isEdited: boolean;
}

export type CommitmentStatus = "pending" | "confirmed" | "rejected";
export type LinkStatus = "linked" | "unlinked" | "exception";

export interface Commitment {
  id: string;
  emailId: string;
  supplierId: string;
  supplierName: string;
  deliveryDate: ExtractedField<string>;
  quantity: ExtractedField<number>;
  price: ExtractedField<number>;
  alternativeMaterials: ExtractedField<string[]>;
  additionalTerms: ExtractedField<string>;
  status: CommitmentStatus;
  linkedOrderIds: string[];
  createdAt: string;
  confirmedAt?: string;
  confirmedBy?: string;
  auditLogs: AuditLog[];
}

export type FieldChangedKey =
  | "deliveryDate"
  | "quantity"
  | "price"
  | "alternativeMaterials"
  | "additionalTerms"
  | "status"
  | "linkedOrderIds"
  | "general";

export interface AuditLog {
  id: string;
  timestamp: string;
  operatorId: string;
  operatorName: string;
  fieldChanged: FieldChangedKey;
  oldValue: unknown;
  newValue: unknown;
  note?: string;
}

export type OrderStatus = "pending" | "partial" | "completed";

export interface Order {
  id: string;
  orderNo: string;
  supplierId: string;
  supplierName: string;
  materialName: string;
  materialCode: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  expectedDelivery: string;
  status: OrderStatus;
  linkedCommitmentIds: string[];
}

export interface DailyStat {
  date: string;
  imported: number;
  confirmed: number;
}

export interface DashboardStats {
  pendingCount: number;
  unlinkedCount: number;
  weeklyImported: number;
  sevenDayTrend: DailyStat[];
}

export type ViewType = "procurement" | "planner";

export const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  high: "高置信",
  medium: "中置信",
  low: "低置信",
};

export const REASON_LABELS: Record<ConfidenceReason, string> = {
  direct_statement: "直接陈述",
  forward_chain: "来自转发链",
  screenshot_ocr: "截图OCR转写",
  vague_time: "时间表述模糊",
  context_revocation: "存在反悔上下文",
  manual_override: "人工修正",
};

export const STATUS_LABELS: Record<CommitmentStatus, string> = {
  pending: "待确认",
  confirmed: "已确认",
  rejected: "已驳回",
};

export const LINK_STATUS_LABELS: Record<LinkStatus, string> = {
  linked: "已关联",
  unlinked: "未关联",
  exception: "关联异常",
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "待交付",
  partial: "部分交付",
  completed: "已完成",
};

export const FIELD_LABELS: Record<FieldChangedKey, string> = {
  deliveryDate: "交期",
  quantity: "数量",
  price: "价格",
  alternativeMaterials: "替代料",
  additionalTerms: "附加条件",
  status: "状态",
  linkedOrderIds: "关联订单",
  general: "综合修改",
};

export const EXTRACT_FIELD_KEYS = [
  "deliveryDate",
  "quantity",
  "price",
  "alternativeMaterials",
  "additionalTerms",
] as const;

export type ExtractFieldKey = (typeof EXTRACT_FIELD_KEYS)[number];

export const EXTRACT_FIELD_LABELS: Record<ExtractFieldKey, string> = {
  deliveryDate: "交期",
  quantity: "数量",
  price: "价格",
  alternativeMaterials: "替代料",
  additionalTerms: "附加条件",
};

export const EXTRACT_FIELD_ICONS: Record<ExtractFieldKey, string> = {
  deliveryDate: "CalendarDays",
  quantity: "Package",
  price: "BadgeDollarSign",
  alternativeMaterials: "RefreshCcw",
  additionalTerms: "FileText",
};
