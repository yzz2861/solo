export type RegistrationStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'deposit_paid' 
  | 'fully_paid' 
  | 'departed' 
  | 'cancelled' 
  | 'refunded';

export type ContractStatus = 'unsigned' | 'signed' | 'waived';
export type PaymentStatus = 'unpaid' | 'deposit_paid' | 'fully_paid' | 'partial_refund' | 'full_refund';

export type RelationType = 'father' | 'mother' | 'child' | 'grandpa' | 'grandma' | 'other';
export type IdType = 'id_card' | 'passport' | 'birth_certificate' | 'other';
export type PaymentMethod = 'cash' | 'wechat' | 'alipay' | 'bank_transfer' | 'credit_card';
export type PaymentType = 'deposit' | 'final' | 'supplement' | 'other';
export type RefundStatus = 'pending' | 'completed' | 'cancelled';
export type ReminderLevel = 'info' | 'warning' | 'error';
export type ReminderType = 
  | 'id_expiry' 
  | 'age_mismatch' 
  | 'contract_unsigned' 
  | 'final_payment_due' 
  | 'document_missing'
  | 'cancellation_fee';

export interface IdCard {
  type: IdType;
  number: string;
  expiryDate?: string;
}

export interface HealthInfo {
  allergies?: string;
  medicalConditions?: string;
  dietaryRestrictions?: string;
  specialCare?: string;
}

export interface FamilyMember {
  id: string;
  registrationId: string;
  name: string;
  relation: RelationType;
  birthDate: string;
  gender: 'male' | 'female';
  phone?: string;
  isPrimary: boolean;
  idCard?: IdCard;
  health?: HealthInfo;
}

export interface Insurance {
  planName: string;
  planType: string;
  premiumPerPerson: number;
  totalPremium: number;
  insurer: string;
}

export interface RoomBooking {
  roomType: string;
  roomCount: number;
  roomPrice: number;
  hasExtraBed: boolean;
  sharingRequest?: string;
}

export interface Contract {
  status: ContractStatus;
  signedDate?: string;
  signedBy?: string;
  contractNo?: string;
}

export interface Payment {
  id: string;
  registrationId: string;
  paymentType: PaymentType;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  receiptNumber?: string;
  operator: string;
  notes?: string;
}

export interface RefundRecord {
  id: string;
  registrationId: string;
  refundDate: string;
  refundAmount: number;
  deductionAmount: number;
  deductionReason: string;
  refundMethod: string;
  status: RefundStatus;
  operator: string;
}

export interface OperationLog {
  id: string;
  registrationId: string;
  operationType: string;
  detail: string;
  operator: string;
  createdAt: string;
}

export interface Registration {
  id: string;
  tripId: string;
  tripName: string;
  departureDate: string;
  returnDate: string;
  familyName: string;
  contactPhone: string;
  status: RegistrationStatus;
  members: FamilyMember[];
  insurance?: Insurance;
  roomBooking: RoomBooking;
  contract: Contract;
  payments: Payment[];
  refund?: RefundRecord;
  totalAmount: number;
  basePrice: number;
  depositAmount: number;
  finalPaymentAmount: number;
  finalPaymentDueDate: string;
  specialNotes?: string;
  roomNo?: string;
  busNo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Reminder {
  id: string;
  type: ReminderType;
  level: ReminderLevel;
  title: string;
  description: string;
  registrationId: string;
  registrationName: string;
  relatedMemberId?: string;
  relatedMemberName?: string;
  date?: string;
  createdAt: string;
  read: boolean;
}

export interface Trip {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  destination: string;
  basePrice: number;
  minChildAge: number;
  maxChildAge: number;
  capacity: number;
  status: 'upcoming' | 'in_progress' | 'completed' | 'cancelled';
  description?: string;
  imageUrl?: string;
}

export interface InsurancePlan {
  id: string;
  name: string;
  type: string;
  premiumPerPerson: number;
  insurer: string;
  coverage: string;
}

export interface RoomType {
  id: string;
  name: string;
  capacity: number;
  price: number;
  description?: string;
}

export interface RoomAssignment {
  id: string;
  tripId: string;
  roomNo: string;
  roomType: string;
  capacity: number;
  registrationIds: string[];
  memberIds: string[];
  notes?: string;
}

export interface BusAssignment {
  id: string;
  tripId: string;
  busNo: string;
  capacity: number;
  registrationIds: string[];
  memberIds: string[];
}

export interface CancellationTier {
  daysBeforeDeparture: number;
  feePercentage: number;
  label: string;
}

export const RELATION_LABELS: Record<RelationType, string> = {
  father: '爸爸',
  mother: '妈妈',
  child: '孩子',
  grandpa: '爷爷',
  grandma: '奶奶',
  other: '其他',
};

export const ID_TYPE_LABELS: Record<IdType, string> = {
  id_card: '身份证',
  passport: '护照',
  birth_certificate: '出生证明',
  other: '其他',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: '现金',
  wechat: '微信支付',
  alipay: '支付宝',
  bank_transfer: '银行转账',
  credit_card: '信用卡',
};

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  deposit: '定金',
  final: '尾款',
  supplement: '补款',
  other: '其他',
};

export const STATUS_LABELS: Record<RegistrationStatus, string> = {
  pending: '待确认',
  confirmed: '已确认',
  deposit_paid: '已付定金',
  fully_paid: '已付清',
  departed: '已出行',
  cancelled: '已取消',
  refunded: '已退款',
};

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  unsigned: '未签署',
  signed: '已签署',
  waived: '豁免',
};

export const CANCELLATION_TIERS: CancellationTier[] = [
  { daysBeforeDeparture: 30, feePercentage: 10, label: '出发前30天及以上' },
  { daysBeforeDeparture: 15, feePercentage: 30, label: '出发前15-29天' },
  { daysBeforeDeparture: 7, feePercentage: 50, label: '出发前7-14天' },
  { daysBeforeDeparture: 3, feePercentage: 70, label: '出发前3-6天' },
  { daysBeforeDeparture: 0, feePercentage: 100, label: '出发前2天及以内' },
];

export const INSURANCE_PLANS: InsurancePlan[] = [
  {
    id: 'ins-1',
    name: '基础保障计划',
    type: 'basic',
    premiumPerPerson: 30,
    insurer: '平安保险',
    coverage: '意外身故/伤残20万，医疗费用5万',
  },
  {
    id: 'ins-2',
    name: '标准保障计划',
    type: 'standard',
    premiumPerPerson: 60,
    insurer: '平安保险',
    coverage: '意外身故/伤残50万，医疗费用10万，紧急救援',
  },
  {
    id: 'ins-3',
    name: '豪华保障计划',
    type: 'premium',
    premiumPerPerson: 120,
    insurer: '平安保险',
    coverage: '意外身故/伤残100万，医疗费用30万，紧急救援，行程取消',
  },
];

export const ROOM_TYPES: RoomType[] = [
  { id: 'room-1', name: '标准双人房', capacity: 2, price: 280, description: '两张1.2米单人床' },
  { id: 'room-2', name: '大床房', capacity: 2, price: 320, description: '一张1.8米双人床' },
  { id: 'room-3', name: '家庭房', capacity: 3, price: 420, description: '一张1.8米床 + 一张1.2米床' },
  { id: 'room-4', name: '三人间', capacity: 3, price: 380, description: '三张1.2米单人床' },
  { id: 'room-5', name: '套房', capacity: 4, price: 580, description: '一室一厅，一张大床 + 一张沙发床' },
];
