export type UserRole = '馆员' | '教师' | '修复师'

export type PreciousLevel = '普通' | '珍贵' | '极珍贵'
export type PressingStatus = '正常' | '受潮'
export type SpecimenStatus = '在馆' | '借出中' | '待修复'

export interface Specimen {
  id: string
  code: string
  family: string
  genus: string
  collectionSite: string
  collector: string
  collectionDate: string
  preciousLevel: PreciousLevel
  pressingStatus: PressingStatus
  status: SpecimenStatus
  notes: string
  createdAt: string
  updatedAt: string
}

export type BorrowPurpose = '课程' | '科研' | '拍照'
export type BorrowStatus = '借出中' | '已归还' | '逾期'

export interface BorrowRecord {
  id: string
  specimenId: string
  specimenCode: string
  borrower: string
  purpose: BorrowPurpose
  photoRequest: boolean
  borrowDate: string
  expectedReturnDate: string
  returnDate: string | null
  status: BorrowStatus
  labelOk: boolean | null
  pressingOk: boolean | null
  specimenOk: boolean | null
  returnNotes: string
}

export interface BorrowValidation {
  canBorrow: boolean
  warnings: string[]
  errors: string[]
}
