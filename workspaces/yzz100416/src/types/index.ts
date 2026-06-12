export type OrderStatus = 'pending' | 'in_progress' | 'delivered';

export type FlowerCategory = '主花' | '辅花' | '叶材' | '配饰';

export interface FlowerItem {
  id: string;
  name: string;
  unit: string;
  price: number;
  stock: number;
  safeStock: number;
  category: FlowerCategory;
}

export interface Florist {
  id: string;
  name: string;
  phone?: string;
}

export interface OrderFlower {
  flowerId: string;
  quantity: number;
}

export type AlertType = 'low_stock' | 'time_conflict' | 'driver_early' | 'plate_duplicate';

export interface Alert {
  id: string;
  type: AlertType;
  orderId?: string;
  message: string;
  timestamp: number;
  resolved: boolean;
}

export interface WeddingCarOrder {
  id: string;
  date: string;
  coupleName: string;
  carModel: string;
  plateNumber: string;
  flowers: OrderFlower[];
  floristId: string | null;
  arrivalTime: string;
  driverArrivedTime?: string;
  handoverNote: string;
  status: OrderStatus;
  startedAt?: string;
  finishedAt?: string;
  deliveredAt?: string;
  costTotal: number;
  anomalies: string[];
  createdAt: number;
  updatedAt: number;
}

export type UserRole = 'clerk' | 'florist' | 'manager';
