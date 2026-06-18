export type ProductType = 'baguette' | 'toast' | 'cake';

export type OrderStatus = 'pending' | 'paid' | 'preparing' | 'ready' | 'completed' | 'noShow';

export type BatchStatus = 'scheduled' | 'baking' | 'completed';

export type WarningType = 'duplicate_order' | 'batch_full' | 'unpaid_peak' | 'no_show_history' | 'batch_conflict';

export type ViewMode = 'calendar' | 'day' | 'batch';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  noShowCount: number;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  productType: ProductType;
  quantity: number;
  flavor: string;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  pickupDate: string;
  pickupTime: string;
  timeSlot: string;
  status: OrderStatus;
  isPaid: boolean;
  specialRequest: string;
  batchId: string | null;
  items: OrderItem[];
  noShowHistory: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Batch {
  id: string;
  batchNumber: number;
  bakingDate: string;
  startTime: string;
  endTime: string;
  capacity: number;
  usedCapacity: number;
  status: BatchStatus;
  productSummary: {
    baguette: number;
    toast: number;
    cake: number;
  };
}

export interface AppConfig {
  ovenCapacity: number;
  timeSlotDuration: number;
  peakHours: string[];
  pickupStartTime: string;
  pickupEndTime: string;
  bakingInterval: number;
  prepTime: number;
}

export interface Warning {
  type: WarningType;
  message: string;
  severity: 'info' | 'warning' | 'error';
  orderId?: string;
}

export interface OrderFormData {
  customerName: string;
  customerPhone: string;
  pickupDate: string;
  pickupTime: string;
  isPaid: boolean;
  specialRequest: string;
  items: {
    productType: ProductType;
    quantity: number;
    flavor: string;
  }[];
}

export const PRODUCT_INFO: Record<ProductType, { name: string; emoji: string; capacity: number }> = {
  baguette: { name: '法棍', emoji: '🥖', capacity: 1 },
  toast: { name: '吐司', emoji: '🍞', capacity: 2 },
  cake: { name: '蛋糕', emoji: '🎂', capacity: 3 },
};

export const STATUS_INFO: Record<OrderStatus, { label: string; color: string }> = {
  pending: { label: '待确认', color: 'bg-amber-100 text-amber-800' },
  paid: { label: '已付款', color: 'bg-green-100 text-green-800' },
  preparing: { label: '烘焙中', color: 'bg-orange-100 text-orange-800' },
  ready: { label: '待取货', color: 'bg-blue-100 text-blue-800' },
  completed: { label: '已完成', color: 'bg-gray-100 text-gray-800' },
  noShow: { label: '爽约', color: 'bg-red-100 text-red-800' },
};

export const BATCH_STATUS_INFO: Record<BatchStatus, { label: string; color: string }> = {
  scheduled: { label: '待烘焙', color: 'bg-amber-100 text-amber-800' },
  baking: { label: '烘焙中', color: 'bg-orange-100 text-orange-800' },
  completed: { label: '已完成', color: 'bg-green-100 text-green-800' },
};
