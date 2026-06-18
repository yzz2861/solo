export interface InventoryRecord {
  id: string;
  sku: string;
  productName: string;
  category: string;
  storeId: string;
  storeName: string;
  quantity: number;
  unitPrice: number;
  expiryDateRaw: string;
  expiryDate: Date;
  productionDate?: Date;
  shelfLifeDays?: number;
  shelfLocation?: string;
  inboundDate?: Date;
}

export interface DiscountRecord {
  id: string;
  sku: string;
  productName: string;
  category: string;
  storeId: string;
  storeName: string;
  discountStartDate: Date;
  discountEndDate: Date;
  discountRate: number;
  discountType: 'percentage' | 'fixed' | 'buyXgetY';
  buyXgetYDetails?: { buy: number; get: number };
  originalPrice: number;
  discountedPrice: number;
  isStackedWithPromotion: boolean;
  promotionName?: string;
  notes?: string;
  shelfLocationAtDiscount?: string;
}

export interface SalesRecord {
  id: string;
  sku: string;
  productName: string;
  category: string;
  storeId: string;
  storeName: string;
  saleDate: Date;
  quantity: number;
  unitPrice: number;
  discountApplied: boolean;
  discountRate?: number;
  promotionApplied?: string;
  isBuyXgetY?: boolean;
}

export interface LossRecord {
  id: string;
  sku: string;
  productName: string;
  category: string;
  storeId: string;
  storeName: string;
  lossDate: Date;
  quantity: number;
  unitCost: number;
  lossReason?: string;
  lossReasonCategory?: string;
  isExpiryRelated: boolean;
  daysBeforeExpiry?: number;
  notes?: string;
}

export interface StoreInfo {
  storeId: string;
  storeName: string;
  address?: string;
  storeType: 'standard' | 'flagship' | 'community';
  area?: number;
}

export interface CategoryInfo {
  categoryId: string;
  categoryName: string;
  parentCategory?: string;
  typicalShelfLifeDays?: number;
}

export interface DiscountPerformance {
  sku: string;
  productName: string;
  category: string;
  storeId: string;
  storeName: string;
  discountStartDate: Date;
  discountRate: number;
  initialStock: number;
  soldDuringDiscount: number;
  remainingAfterDiscount: number;
  lostQuantity: number;
  sellThroughRate: number;
  lossRate: number;
  daysBeforeExpiryAtDiscount: number;
  daysToClear: number;
  shelfLocation?: string;
  notes?: string;
}

export interface CategoryAnalysis {
  category: string;
  totalStock: number;
  totalSold: number;
  totalLost: number;
  totalRevenue: number;
  totalLossCost: number;
  sellThroughRate: number;
  lossRate: number;
  avgDiscountRate: number;
  avgDaysBeforeExpiryAtDiscount: number;
  avgClearDays: number;
  highRiskProducts: string[];
  commonReasons: { reason: string; count: number }[];
}

export interface StoreAnalysis {
  storeId: string;
  storeName: string;
  totalStock: number;
  totalSold: number;
  totalLost: number;
  sellThroughRate: number;
  lossRate: number;
  avgDiscountEffectiveness: number;
  categoryBreakdown: { category: string; lossRate: number; sellThrough: number }[];
}

export interface ClearanceTimelineItem {
  date: Date;
  stockLevel: number;
  sold: number;
  cumulativeSold: number;
  discountApplied: boolean;
  discountRate?: number;
  daysToExpiry: number;
}

export interface DataQualityIssue {
  type: 'expiry_format' | 'missing_loss_reason' | 'buy_get_stack' | 'same_day_discount' | 'missing_shelf';
  description: string;
  count: number;
  affectedRecords: string[];
  severity: 'low' | 'medium' | 'high';
}

export type ViewMode = 'manager' | 'procurement' | 'dataQuality';
