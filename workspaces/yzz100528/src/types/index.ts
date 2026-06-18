export type OrderStatus = "draft" | "assessing" | "reviewing" | "approved" | "recycling" | "completed" | "rejected"

export type ApplianceCategory = "refrigerator" | "washer" | "ac" | "tv" | "other"

export type Condition = "excellent" | "good" | "fair" | "poor"

export type PhotoType = "front" | "side" | "nameplate"

export type WorkflowStage = "assessing" | "reviewing" | "recycling" | "completed"

export type StepStatus = "pending" | "in_progress" | "done" | "rejected"

export interface OldAppliancePhoto {
  id: string
  type: PhotoType
  dataUrl: string
  hash: string
  uploadedAt: string
}

export interface DocUpload {
  id: string
  fileName: string
  dataUrl: string
  hash: string
  uploadedAt: string
}

export interface OldAppliance {
  category: ApplianceCategory
  brand: string
  model: string
  purchaseYear: number
  condition: Condition
  tradeInValue: number
  photos: OldAppliancePhoto[]
}

export interface SubsidyDocs {
  idCard: DocUpload | null
  purchaseProof: DocUpload | null
  subsidyQualification: DocUpload | null
  isComplete: boolean
}

export interface NewAppliance {
  model: string
  price: number
  discount: number
  tradeInCredit: number
  finalPrice: number
}

export interface Customer {
  name: string
  phone: string
  address: string
  floor: number
  hasElevator: boolean
  note: string
}

export interface RecyclingInfo {
  scheduledDate: string
  timeSlot: string
  technicianId: string
  confirmedAt: string | null
  confirmationCode: string
  photos: string[]
}

export interface WorkflowStep {
  stage: WorkflowStage
  status: StepStatus
  operator: string
  operatedAt: string
  remark: string
}

export interface TradeInOrder {
  id: string
  orderNo: string
  status: OrderStatus
  createdAt: string
  updatedAt: string
  oldAppliance: OldAppliance
  subsidyDocs: SubsidyDocs
  newAppliance: NewAppliance
  customer: Customer
  recycling: RecyclingInfo
  workflow: WorkflowStep[]
}

export interface Technician {
  id: string
  name: string
  phone: string
}

export interface PhotoDuplicateWarning {
  existingOrderId: string
  existingOrderNo: string
  matchType: "exact" | "similar"
  confidence: number
}

export const CATEGORY_LABELS: Record<ApplianceCategory, string> = {
  refrigerator: "冰箱",
  washer: "洗衣机",
  ac: "空调",
  tv: "电视",
  other: "其他",
}

export const CONDITION_LABELS: Record<Condition, string> = {
  excellent: "优",
  good: "良",
  fair: "中",
  poor: "差",
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  draft: "草稿",
  assessing: "评估中",
  reviewing: "审核中",
  approved: "已通过",
  recycling: "回收中",
  completed: "已结案",
  rejected: "已驳回",
}

export const TIME_SLOTS = [
  "09:00-11:00",
  "11:00-13:00",
  "13:00-15:00",
  "15:00-17:00",
  "17:00-19:00",
]

export const BRAND_OPTIONS: Record<ApplianceCategory, string[]> = {
  refrigerator: ["海尔", "美的", "格力", "容声", "西门子", "松下", "其他"],
  washer: ["海尔", "美的", "小天鹅", "西门子", "松下", "LG", "其他"],
  ac: ["格力", "美的", "海尔", "大金", "三菱", "松下", "其他"],
  tv: ["海信", "创维", "TCL", "索尼", "三星", "LG", "其他"],
  other: ["其他"],
}
