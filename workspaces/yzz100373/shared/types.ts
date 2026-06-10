export type WashStep = 'queued' | 'rinsing' | 'soaping' | 'scrubbing' | 'washing' | 'drying' | 'addon' | 'done';

export type OrderStatus = 'queued' | 'washing' | 'done' | 'cancelled';

export type PayType = 'member' | 'cash';

export interface Member {
  id: string;
  name: string;
  phone: string;
  plateNumber: string;
  createdAt: string;
}

export interface MemberPackage {
  id: string;
  memberId: string;
  packageName: string;
  totalTimes: number;
  remainingTimes: number;
  pricePerTime: number;
}

export interface MemberWithPackages extends Member {
  packages: MemberPackage[];
}

export interface Worker {
  id: string;
  name: string;
  status: 'active' | 'off';
}

export interface Addon {
  id: string;
  orderId: string;
  name: string;
  price: number;
  originalPrice: number;
  priceAdjustReason?: string;
  paid: boolean;
  createdAt: string;
}

export interface Order {
  id: string;
  queueNumber: number;
  plateNumber: string;
  memberId?: string;
  memberName?: string;
  packageId?: string;
  packageName?: string;
  packageDeducted: number;
  payType: PayType;
  cashAmount?: number;
  workerId?: string;
  workerName?: string;
  currentStep: WashStep;
  status: OrderStatus;
  addons: Addon[];
  createdAt: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  cancelledBy?: string;
}

export interface AddonConfig {
  id: string;
  name: string;
  defaultPrice: number;
}

export interface DailyReport {
  date: string;
  totalOrders: number;
  totalRevenue: number;
  memberDeductionCount: number;
  memberDeductionAmount: number;
  cashRevenue: number;
  addonRevenue: number;
  cancelledOrders: number;
  cancelledAmount: number;
  orders: Order[];
}

export interface CreateOrderRequest {
  plateNumber: string;
  memberId?: string;
  packageId?: string;
  payType: PayType;
  cashAmount?: number;
  workerId?: string;
}

export interface UpdateOrderRequest {
  workerId?: string;
  currentStep?: WashStep;
  status?: OrderStatus;
}

export interface AddAddonRequest {
  name: string;
  price: number;
  originalPrice: number;
  priceAdjustReason?: string;
}

export interface CancelOrderRequest {
  cancelReason: string;
  cancelledBy: string;
}

export const WASH_STEP_LABELS: Record<WashStep, string> = {
  queued: '排队中',
  rinsing: '冲水',
  soaping: '打泡',
  scrubbing: '擦洗',
  washing: '冲洗',
  drying: '吹干',
  addon: '加项服务',
  done: '已完成',
};

export const WASH_STEPS: WashStep[] = ['queued', 'rinsing', 'soaping', 'scrubbing', 'washing', 'drying', 'addon', 'done'];
