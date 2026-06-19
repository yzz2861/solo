export type StoreType = 'community' | 'office' | 'school' | 'station';

export interface Store {
  id: string;
  name: string;
  type: StoreType;
  address: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  price: number;
  unit: string;
}

export type TimeSlot = 'morning' | 'noon' | 'afternoon' | 'evening' | 'night';

export type PromotionType = 'buyOneGetOne' | 'timeDiscount' | 'groupBuy' | null;

export interface SalesRecord {
  id: string;
  storeId: string;
  productId: string;
  date: string;
  timeSlot: TimeSlot;
  quantity: number;
  amount: number;
  promotionType: PromotionType;
}

export type WasteReason = 'expired' | 'poorQuality' | 'customerReturn' | 'systemReturn' | 'unknown';

export interface WasteRecord {
  id: string;
  storeId: string;
  productId: string;
  date: string;
  timeSlot: TimeSlot;
  quantity: number;
  reason: WasteReason;
  photoUrls: string[];
  isSystemReturn: boolean;
  remark?: string;
}

export interface OrderPlan {
  id: string;
  storeId: string;
  productId: string;
  date: string;
  suggestedQty: number;
  adjustedQty: number | null;
  adjustReason?: string;
  isConfirmed: boolean;
}

export interface DeliveryRecord {
  id: string;
  storeId: string;
  productId: string;
  date: string;
  deliveredQty: number;
}

export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'hot' | 'cold';

export interface Weather {
  date: string;
  city: string;
  type: WeatherType;
  temperature: number;
}

export type PromotionTypeDetail = 'buyOneGetOne' | 'timeDiscount' | 'groupBuy';

export interface DiscountPromotion {
  id: string;
  name: string;
  type: PromotionTypeDetail;
  timeSlot: TimeSlot;
  discountRate: number;
  startDate: string;
  endDate: string;
}

export type UserRole = 'manager' | 'supervisor' | 'staff';

export interface DailyStats {
  date: string;
  totalSales: number;
  totalWaste: number;
  wasteRate: number;
  stockoutCount: number;
  discountContribution: number;
}

export interface TimeSlotStats {
  timeSlot: TimeSlot;
  salesQty: number;
  wasteQty: number;
  discountQty: number;
  wasteRate: number;
}

export interface CategoryStats {
  categoryId: string;
  categoryName: string;
  salesQty: number;
  wasteQty: number;
  wasteRate: number;
  stockoutRate: number;
}

export interface StoreStats {
  storeId: string;
  storeName: string;
  storeType: StoreType;
  wasteRate: number;
  wasteRateChange: number;
  totalSales: number;
  avgWasteRate: number;
}

export interface StockoutRecord {
  id: string;
  storeId: string;
  productId: string;
  date: string;
  timeSlot: TimeSlot;
  estimatedLostQty: number;
  estimatedLostAmount: number;
}

export interface SlowMovingItem {
  productId: string;
  productName: string;
  categoryId: string;
  categoryName: string;
  avgDailySales: number;
  avgDailyWaste: number;
  wasteRate: number;
  stockTurnoverDays: number;
}

export interface PromotionEffect {
  promotionType: PromotionType;
  promotionName: string;
  totalSalesQty: number;
  totalSalesAmount: number;
  wasteReduction: number;
  profitImpact: number;
  effectiveness: number;
}

export interface TimeSlotWastePattern {
  timeSlot: TimeSlot;
  storeId: string;
  storeName: string;
  avgWasteQty: number;
  wasteRate: number;
  frequency: number;
  trend: 'rising' | 'falling' | 'stable';
}

export interface WeatherWasteAnalysis {
  weatherType: WeatherType;
  avgWasteRate: number;
  avgSalesAmount: number;
  storeCount: number;
  comparedToNormal: number;
}

export interface StoreTypeAnalysis {
  storeType: StoreType;
  storeCount: number;
  avgWasteRate: number;
  avgSalesAmount: number;
  avgStockoutRate: number;
  bestTimeSlot: TimeSlot;
  worstTimeSlot: TimeSlot;
}

export interface WasteReasonDetail {
  reason: WasteReason;
  reasonLabel: string;
  quantity: number;
  amount: number;
  percentage: number;
  description: string;
  needsAttention: boolean;
}

export interface OrderSuggestion {
  productId: string;
  productName: string;
  categoryId: string;
  categoryName: string;
  suggestedQty: number;
  adjustedQty: number | null;
  baseOnHistory: number;
  weatherAdjustment: number;
  wasteAdjustment: number;
  trendAdjustment: number;
  confidence: 'high' | 'medium' | 'low';
  reasons: string[];
}

export interface SupervisorReportData {
  periodStart: string;
  periodEnd: string;
  totalStores: number;
  avgWasteRate: number;
  wasteRateChange: number;
  totalSales: number;
  totalWasteAmount: number;
  topProblemStores: StoreStats[];
  bestPerformingStores: StoreStats[];
  commonWastePatterns: TimeSlotWastePattern[];
  weatherImpact: WeatherWasteAnalysis[];
  storeTypeComparison: StoreTypeAnalysis[];
  recommendations: string[];
}

export interface ImportDataResult {
  type: 'sales' | 'waste' | 'delivery' | 'weather' | 'promotion';
  totalRecords: number;
  successCount: number;
  errorCount: number;
  errors: string[];
}
