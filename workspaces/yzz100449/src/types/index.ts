export type RecycleStatus =
  | 'pending_in'
  | 'in_stock'
  | 'on_shelf'
  | 'returned'
  | 'bargain_fail';

export type CheckResult = 'pass' | 'fail' | 'pending';

export interface ScreenCheck {
  scratch: CheckResult;
  crack: CheckResult;
  display: CheckResult;
  remark?: string;
}
export interface BatteryCheck {
  health: number;
  bulge: CheckResult;
  remark?: string;
}
export interface WaterCheck {
  indicator: CheckResult;
  remark?: string;
}
export interface AccountCheck {
  idLoggedOut: CheckResult;
  remark?: string;
}
export interface FullCheck {
  screen: ScreenCheck;
  battery: BatteryCheck;
  water: WaterCheck;
  account: AccountCheck;
}

export interface PriceChange {
  id: string;
  oldPrice: number;
  newPrice: number;
  reason: string;
  operator: string;
  operatorRole: 'staff' | 'manager';
  timestamp: number;
}

export interface OpLog {
  id: string;
  action: string;
  operator: string;
  operatorRole: 'staff' | 'manager';
  timestamp: number;
  detail?: string;
}

export interface RecycleOrder {
  id: string;
  serialNumber: string;
  imei?: string;
  brand: string;
  model: string;
  storage: string;
  color: string;
  appearanceRating: 'A+' | 'A' | 'B' | 'C' | 'D';
  photos: string[];
  checkResult: FullCheck;
  privacyWiped: boolean;
  initialPrice: number;
  finalPrice: number | null;
  priceHistory: PriceChange[];
  failReasons?: string[];
  bargainFailRemark?: string;
  duplicateSnWarning?: boolean;
  status: RecycleStatus;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  createdByRole: 'staff' | 'manager';
  logs: OpLog[];
}

export interface Operator {
  id: string;
  name: string;
  code: string;
  role: 'staff' | 'manager';
}

export const BRANDS = ['Apple', '华为', '小米', 'OPPO', 'vivo', '荣耀', '三星', '其他'];
export const STORAGES = ['64GB', '128GB', '256GB', '512GB', '1TB'];
export const RATINGS: Array<'A+' | 'A' | 'B' | 'C' | 'D'> = ['A+', 'A', 'B', 'C', 'D'];
export const COLORS = ['黑色', '白色', '银色', '金色', '蓝色', '紫色', '绿色', '红色', '其他'];
export const QUICK_REASONS = ['屏幕划痕较多', '电池健康度低', '市场行情波动', '顾客坚持报价', '多台回收优惠', '外观磕碰明显', '功能小瑕疵'];

export const STATUS_LABEL: Record<RecycleStatus, string> = {
  pending_in: '待入库',
  in_stock: '已入库(待上架)',
  on_shelf: '已上架',
  returned: '已退回',
  bargain_fail: '议价失败',
};

export const STATUS_COLOR: Record<RecycleStatus, string> = {
  pending_in: 'bg-slate-100 text-slate-700',
  in_stock: 'bg-blue-100 text-blue-700',
  on_shelf: 'bg-emerald-100 text-emerald-700',
  returned: 'bg-rose-100 text-rose-700',
  bargain_fail: 'bg-amber-100 text-amber-700',
};
