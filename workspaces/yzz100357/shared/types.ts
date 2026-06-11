export type OrderStatus = 'draft' | 'analyzing' | 'confirmed' | 'exported';

export type MaterialType = 'chat' | 'logistics' | 'refund' | 'other';

export type EvidenceType = 'shipping_time' | 'customer_promise' | 'refund_node' | 'violation_speech';

export type RiskLevel = 'low' | 'medium' | 'high';

export type ExportFormat = 'pdf' | 'word' | 'zip';

export interface Order {
  id: string;
  orderNo: string;
  customerName: string;
  orderTime: string;
  appealDeadline: string;
  createdAt: string;
  status: OrderStatus;
}

export interface Material {
  id: string;
  projectId: string;
  type: MaterialType;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  parsedContent?: string;
  uploadedAt: string;
}

export interface Evidence {
  id: string;
  projectId: string;
  type: EvidenceType;
  content: string;
  sourceText: string;
  sourceMaterialId: string;
  sourceLocation: string;
  confidence: number;
  confirmed: boolean;
  timestamp?: string;
  riskLevel?: RiskLevel;
  notes?: string;
}

export interface AppealSummary {
  id: string;
  projectId: string;
  content: string;
  version: number;
  createdAt: string;
  modifiedBy: string;
  changeLog: string;
}

export interface SummaryVersion {
  id: string;
  projectId: string;
  content: string;
  version: number;
  versionNote: string;
  createdAt: string;
  modifiedBy: string;
}

export interface MaterialOrder {
  projectId: string;
  order: string[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface CreateProjectRequest {
  orderNo: string;
  customerName: string;
  orderTime: string;
  appealDeadline: string;
}

export interface UpdateEvidenceRequest {
  confirmed?: boolean;
  notes?: string;
}

export interface BatchConfirmRequest {
  ids: string[];
}

export interface SaveSummaryRequest {
  content: string;
  changeLog: string;
}

export interface UpdateMaterialOrderRequest {
  order: string[];
}

export interface ExportRequest {
  format: ExportFormat;
}

export interface ExportResponse {
  downloadUrl: string;
  fileName: string;
}

export const MATERIAL_TYPE_LABELS: Record<MaterialType, string> = {
  chat: '聊天记录',
  logistics: '物流截图',
  refund: '退款凭证',
  other: '其他材料'
};

export const EVIDENCE_TYPE_LABELS: Record<EvidenceType, string> = {
  shipping_time: '发货时间',
  customer_promise: '客户承诺',
  refund_node: '退款节点',
  violation_speech: '违规话术'
};

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险'
};

export const STATUS_LABELS: Record<OrderStatus, string> = {
  draft: '草稿',
  analyzing: '分析中',
  confirmed: '已确认',
  exported: '已导出'
};
