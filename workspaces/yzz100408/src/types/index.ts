export type PriceType = 'peak' | 'flat' | 'valley' | 'promotion';

export interface ChargingOrder {
  orderId: string;
  gunId: string;
  vehiclePlate: string;
  vehicleModel: string;
  queueStartTime: Date;
  chargeStartTime: Date;
  chargeEndTime: Date;
  waitMinutes: number;
  chargeMinutes: number;
  chargeKwh: number;
  leftEarly: boolean;
  crossDay: boolean;
  affectedByFault?: string;
  pricePeriod?: string;
}

export interface QueueRecord {
  recordId: string;
  timestamp: Date;
  queueLength: number;
  gunId?: string;
}

export interface ElectricityPrice {
  periodId: string;
  effectiveDate: string;
  startHour: number;
  endHour: number;
  priceType: PriceType;
  pricePerKwh: number;
}

export interface GunFault {
  faultId: string;
  gunId: string;
  faultStartTime: Date;
  faultEndTime: Date;
  faultType: string;
  faultDurationMinutes: number;
  mergedFromMultiple: boolean;
  originalFaultIds?: string[];
}

export interface HourlyMetric {
  date: string;
  hour: number;
  gunId?: string;
  avgWaitMinutes: number;
  maxWaitMinutes: number;
  orderCount: number;
  queueLengthAvg: number;
  utilizationRate: number;
  idleMinutes: number;
  chargingMinutes: number;
  faultMinutes: number;
  priceType?: PriceType;
}

export interface AttributionResult {
  faultImpact: {
    totalAffectedOrders: number;
    totalExtraWaitMinutes: number;
    affectedGuns: string[];
    byFault: Record<string, { orders: number; extraWait: number }>;
  };
  priceImpact: {
    peakHourOrders: number;
    valleyHourOrders: number;
    promotionOrders: number;
    orderChangeRate: Record<string, number>;
  };
}

export interface ShiftRecommendation {
  hour: number;
  recommendedStaff: number;
  peakLevel: 'low' | 'medium' | 'high' | 'critical';
  avgWaitMinutes: number;
  expectedQueueLength: number;
  notes?: string;
}

export interface ParsedDataSummary {
  orders: { count: number; dateRange: [string, string]; anomalies: string[] };
  queue: { count: number; dateRange: [string, string]; anomalies: string[] };
  prices: { count: number; periods: PriceType[]; anomalies: string[] };
  faults: { count: number; affectedGuns: string[]; anomalies: string[] };
}

export type DataCategory = 'orders' | 'queue' | 'prices' | 'faults';

export interface UploadedFile {
  category: DataCategory;
  name: string;
  size: number;
  rawData: string;
}
