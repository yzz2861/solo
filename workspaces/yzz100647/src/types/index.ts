export enum MaterialType {
  CHAT_SCREENSHOT = 'CHAT_SCREENSHOT',
  INSPECTION_REPORT = 'INSPECTION_REPORT',
  EXPRESS_PHOTO = 'EXPRESS_PHOTO',
  PURCHASE_PROOF = 'PURCHASE_PROOF',
  PRODUCT_PHOTO = 'PRODUCT_PHOTO',
  RETURN_FORM = 'RETURN_FORM',
  OTHER = 'OTHER',
  UNKNOWN = 'UNKNOWN',
}

export enum LowConfidenceReason {
  CROPPED = 'CROPPED',
  MULTIPLE_PAGES = 'MULTIPLE_PAGES',
  ORDER_NO_UNCLEAR = 'ORDER_NO_UNCLEAR',
  TYPE_UNCERTAIN = 'TYPE_UNCERTAIN',
  LOW_TEXT_VOLUME = 'LOW_TEXT_VOLUME',
}

export enum GapStatus {
  MISSING = 'MISSING',
  MARKED_PROVIDED = 'MARKED_PROVIDED',
  WAIVED = 'WAIVED',
}

export type ComplaintStatus = 'DRAFT' | 'CONFIRMED' | 'EXPORTED';

export interface Attachment {
  id: string;
  complaintId: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  previewUrl: string;
  ocrText: string;
  description: string;
  file?: File;
}

export interface RecognitionResult {
  attachmentId: string;
  materialType: MaterialType;
  materialConfidence: number;
  extractedOrderNo: string;
  orderNoConfidence: number;
  lowConfidenceReasons: LowConfidenceReason[];
  groupId: number | null;
  sortOrder: number;
}

export interface NamingItem {
  attachmentId: string;
  originalName: string;
  newFileName: string;
  sequence: number;
  materialType: MaterialType;
  orderNo: string;
  fileSize: number;
}

export interface MaterialGap {
  id: string;
  complaintId: string;
  materialName: string;
  materialType: MaterialType | null;
  isRequired: boolean;
  description: string;
  status: GapStatus;
  scenario: string;
}

export interface Complaint {
  id: string;
  complaintNo: string;
  customerInfo: string;
  globalOrderNo: string;
  createdAt: string;
  updatedAt: string;
  status: ComplaintStatus;
  attachments: Attachment[];
  recognitions: Record<string, RecognitionResult>;
  namingList: NamingItem[];
  materialGaps: MaterialGap[];
  scenario: string;
  confirmedAt?: string;
  exportedAt?: string;
}

export interface AppSettings {
  namingTemplate: string;
  sequencePadding: number;
  maxHistory: number;
}

export interface PersistState {
  currentComplaintId: string | null;
  complaints: Complaint[];
  settings: AppSettings;
}

export const MATERIAL_TYPE_LABELS: Record<MaterialType, string> = {
  [MaterialType.CHAT_SCREENSHOT]: '聊天截图',
  [MaterialType.INSPECTION_REPORT]: '检测报告',
  [MaterialType.EXPRESS_PHOTO]: '快递照片',
  [MaterialType.PURCHASE_PROOF]: '购买凭证',
  [MaterialType.PRODUCT_PHOTO]: '商品照片',
  [MaterialType.RETURN_FORM]: '退换货单',
  [MaterialType.OTHER]: '其他材料',
  [MaterialType.UNKNOWN]: '未识别',
};

export const MATERIAL_TYPE_SHORT: Record<MaterialType, string> = {
  [MaterialType.CHAT_SCREENSHOT]: '聊天',
  [MaterialType.INSPECTION_REPORT]: '检测',
  [MaterialType.EXPRESS_PHOTO]: '快递',
  [MaterialType.PURCHASE_PROOF]: '购买',
  [MaterialType.PRODUCT_PHOTO]: '商品',
  [MaterialType.RETURN_FORM]: '退货',
  [MaterialType.OTHER]: '其他',
  [MaterialType.UNKNOWN]: '未知',
};

export const MATERIAL_TYPE_ORDER: MaterialType[] = [
  MaterialType.PURCHASE_PROOF,
  MaterialType.CHAT_SCREENSHOT,
  MaterialType.PRODUCT_PHOTO,
  MaterialType.INSPECTION_REPORT,
  MaterialType.EXPRESS_PHOTO,
  MaterialType.RETURN_FORM,
  MaterialType.OTHER,
  MaterialType.UNKNOWN,
];

export const LOW_CONFIDENCE_LABELS: Record<LowConfidenceReason, string> = {
  [LowConfidenceReason.CROPPED]: '截图不完整',
  [LowConfidenceReason.MULTIPLE_PAGES]: '同材多张',
  [LowConfidenceReason.ORDER_NO_UNCLEAR]: '订单号不清',
  [LowConfidenceReason.TYPE_UNCERTAIN]: '类型存疑',
  [LowConfidenceReason.LOW_TEXT_VOLUME]: '文本过少',
};

export const GAP_STATUS_LABELS: Record<GapStatus, string> = {
  [GapStatus.MISSING]: '待补充',
  [GapStatus.MARKED_PROVIDED]: '已提供',
  [GapStatus.WAIVED]: '无需提供',
};

export const SCENARIOS = [
  { key: 'quality', label: '质量问题投诉', desc: '商品存在质量瑕疵/损坏' },
  { key: 'return', label: '退换货投诉', desc: '申请退换货相关纠纷' },
  { key: 'logistics', label: '物流投诉', desc: '快递丢失/延误/破损' },
  { key: 'general', label: '通用投诉', desc: '其他通用投诉场景' },
];
