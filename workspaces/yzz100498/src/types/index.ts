export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'supper';
export type OrderStatus = 'pending' | 'confirmed' | 'completed' | 'refunded';
export type RefundReason = 'discharge' | 'lockdown' | 'duplicate' | 'other';
export type UserRole = 'logistics' | 'canteen_manager' | 'nurse_station' | 'purchaser' | 'nurse';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type ChartType = 'line' | 'bar' | 'pie';

export interface Order {
  id: string;
  patientId: string;
  patientName: string;
  familyMemberName: string;
  wardId: string;
  wardName: string;
  mealId: string;
  mealName: string;
  mealType: MealType;
  mealTypeLabel: string;
  orderDate: string;
  quantity: number;
  price: number;
  status: OrderStatus;
  isSpecial: boolean;
  dietaryType?: string;
  createdAt: string;
  notes?: string;
  flags: {
    isDuplicate: boolean;
    isCrossMidnight: boolean;
    isHoliday: boolean;
  };
}

export interface Refund {
  id: string;
  orderId: string;
  reason: RefundReason;
  reasonDetail?: string;
  amount: number;
  refundTime: string;
  operator: string;
}

export interface WardCount {
  id: string;
  wardId: string;
  wardName: string;
  reportDate: string;
  patientCount: number;
  companionCount: number;
  specialMealCount: number;
  reporter: string;
  isLockedDown: boolean;
}

export interface Ward {
  id: string;
  name: string;
  floor: number;
  nurseInCharge: string;
  phone: string;
}

export interface Holiday {
  date: string;
  name: string;
  type: 'public' | 'hospital' | 'event';
  impactFactor: number;
  notes?: string;
}

export interface Meal {
  id: string;
  name: string;
  type: MealType;
  price: number;
  ingredients: string[];
  nutritionalInfo: string;
  isSpecial: boolean;
  dietaryType?: string;
}

export interface SalesAnalysis {
  date: string;
  wardId: string;
  wardName: string;
  mealType: MealType;
  orderCount: number;
  refundCount: number;
  netSales: number;
  wardReportedCount: number;
  variance: number;
  varianceRate: number;
  orders: Order[];
}

export interface PreparationSuggestion {
  date: string;
  mealType: MealType;
  wardId: string;
  wardName: string;
  suggestedQuantity: number;
  historicalAverage: number;
  wardReported: number;
  wardCount: number;
  safetyStock: number;
  adjustmentReason: string;
  wasteRisk: RiskLevel;
  shortageRisk: RiskLevel;
  confidence: number;
}

export interface ForecastData {
  date: string;
  wardId: string;
  wardName: string;
  mealType: MealType;
  forecastQuantity: number;
  predictedQuantity: number;
  historicalTrend: number[];
  lowerBound: number;
  upperBound: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  changeFromToday: number;
  changeFromLastWeek: number;
  holidayImpact: number;
}

export interface IngredientDemand {
  ingredientId: string;
  ingredientName: string;
  mealType: MealType;
  unit: string;
  historicalUsage: number;
  forecastUsage: number;
  safetyStock: number;
  suggestedPurchase: number;
  currentStock: number;
  shortage: number;
  name: string;
  requiredQuantity: number;
  needToPurchase: number;
  priority: 'high' | 'medium' | 'low';
}

export interface SpecialMeal {
  id: string;
  orderId: string;
  patientName: string;
  wardName: string;
  bedNo: string;
  dietaryType: 'diabetic' | 'low_salt' | 'low_fat' | 'soft' | 'liquid' | 'allergy_free' | 'other';
  mealName: string;
  mealDate: string;
  mealType: MealType;
  isVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  notes?: string;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  roleLabel: string;
  wardId?: string;
  avatar?: string;
}

export interface Alert {
  id: string;
  type: 'waste' | 'shortage' | 'anomaly' | 'verification';
  level: RiskLevel;
  title: string;
  message: string;
  relatedData?: any;
  createdAt: string;
  isRead: boolean;
}

export interface FilterState {
  dateRange: {
    start: string;
    end: string;
  };
  selectedWards: string[];
  selectedMealTypes: MealType[];
  searchQuery: string;
}

export interface KPIData {
  title: string;
  value: number;
  unit: string;
  trend: number;
  trendType: 'up' | 'down' | 'neutral';
  description: string;
}

export interface TomorrowChange {
  wardId: string;
  wardName: string;
  todayActual: number;
  tomorrowForecast: number;
  change: number;
  changePercentage: number;
  reason: string;
  confidence: number;
}

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  supper: '夜宵'
};

export const ROLE_LABELS: Record<UserRole, string> = {
  logistics: '后勤管理人员',
  canteen_manager: '食堂经理',
  nurse_station: '护士站',
  purchaser: '采购人员',
  nurse: '病区护士'
};

export const RISK_COLORS: Record<RiskLevel, string> = {
  low: '#4CAF50',
  medium: '#FF9800',
  high: '#F44336',
  critical: '#B71C1C'
};

export const RISK_LABELS: Record<RiskLevel, string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
  critical: '严重风险'
};
