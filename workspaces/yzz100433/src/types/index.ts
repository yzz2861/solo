// 商品类型
export interface Product {
  id: string;
  name: string;
  price: number;
  category: 'cake' | 'drink' | 'dessert';
  emoji: string;
}

// 购物车商品项
export interface CartItem {
  product: Product;
  quantity: number;
  subtotal: number;
}

// 优惠券类型
export type CouponType = 'full_reduction' | 'discount' | 'points';

export interface Coupon {
  id: string;
  type: CouponType;
  name: string;
  description: string;
  condition?: number;
  discountValue?: number;
  isStackable: boolean;
  isDamaged?: boolean;
  damageNote?: string;
}

// 支付方式
export type PaymentMethod = 'cash' | 'electronic';

export interface Payment {
  method: PaymentMethod;
  amountPaid: number;
}

// 场景特殊事件
export type SpecialEventType = 'none' | 'exchange' | 'partial_refund' | 'damaged_coupon' | 'group_order';

export interface SpecialEvent {
  type: SpecialEventType;
  description: string;
  ruleExplanation: string;
  exchangeItems?: { from: CartItem; to: CartItem }[];
  refundItems?: CartItem[];
}

// 场景类型
export type ScenarioType = 'basic' | 'stacking' | 'special' | 'complex';

// 需要输入的字段
export type RequiredInput = 'finalTotal' | 'changeAmount' | 'refundAmount';

// 训练场景
export interface Scenario {
  id: string;
  type: ScenarioType;
  typeLabel: string;
  cartItems: CartItem[];
  coupons: Coupon[];
  memberPoints: number;
  pointsRate: number;
  payment: Payment;
  specialEvent: SpecialEvent;
  originalTotal: number;
  discountTotal: number;
  pointsDeduction: number;
  finalTotal: number;
  changeAmount: number;
  refundAmount: number;
  requiredInputs: RequiredInput[];
  ruleExplanations: string[];
}

// 答题记录
export interface AnswerRecord {
  scenarioId: string;
  scenario: Scenario;
  userInputs: {
    finalTotal?: number;
    changeAmount?: number;
    refundAmount?: number;
  };
  isCorrect: boolean;
  wrongFields: string[];
  attemptedAt: string;
  attempts: number;
  errorType?: string;
}

// 店员状态
export type StaffStatus = 'observing' | 'practicing' | 'ready';

export interface Staff {
  id: string;
  name: string;
  avatar: string;
  status: StaffStatus;
  statusNote?: string;
  createdAt: string;
}

// 店员练习统计
export interface StaffStats {
  staffId: string;
  totalPractice: number;
  correctCount: number;
  wrongCount: number;
  accuracy: number;
  errorByType: Record<string, number>;
  unpassedScenarios: string[];
  lastPracticeAt: string;
}

// 错误类型分类
export type ErrorCategory = 
  | 'full_reduction'
  | 'discount'
  | 'points'
  | 'stacking'
  | 'exchange'
  | 'partial_refund'
  | 'damaged_coupon'
  | 'group_order'
  | 'change'
  | 'basic';

export const ERROR_CATEGORY_LABELS: Record<ErrorCategory, string> = {
  full_reduction: '满减规则',
  discount: '折扣计算',
  points: '积分抵扣',
  stacking: '优惠叠加',
  exchange: '商品调换',
  partial_refund: '部分退单',
  damaged_coupon: '破损券处理',
  group_order: '拼单结算',
  change: '找零计算',
  basic: '基础计算',
};

// 状态标签映射
export const STATUS_LABELS: Record<StaffStatus, string> = {
  observing: '旁听中',
  practicing: '练习中',
  ready: '可上岗',
};

export const STATUS_COLORS: Record<StaffStatus, string> = {
  observing: 'bg-peach-100 text-peach-600',
  practicing: 'bg-primary-100 text-primary-600',
  ready: 'bg-matcha-100 text-matcha-600',
};
