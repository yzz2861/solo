export type TableStatus = 'idle' | 'occupied' | 'paused' | 'maintenance';
export type CustomerType = 'walk-in' | 'member' | 'package';
export type DeliveryStatus = 'pending' | 'delivered' | 'cancelled';
export type PaymentMethod = 'cash' | 'wechat' | 'alipay' | 'member_balance';
export type OperatorRole = 'cashier' | 'admin';
export type RoundMode = 'up' | 'nearest';

export interface BilliardTable {
  id: string;
  table_no: number;
  name: string;
  status: TableStatus;
  hourly_rate: number;
}

export interface OrderSession {
  id: string;
  table_id: string;
  customer_type: CustomerType;
  member_id?: string | null;
  package_id?: string | null;
  start_time: string;
  total_paused_seconds: number;
  created_at: string;
  note?: string;
}

export interface OrderItem {
  id: string;
  session_id: string;
  product_id: string;
  table_id_at_add: string;
  delivery_status: DeliveryStatus;
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_at: string;
}

export interface TableTransfer {
  id: string;
  session_id: string;
  from_table_id: string;
  to_table_id: string;
  transfer_time: string;
  operator_note?: string;
}

export interface PauseRecord {
  id: string;
  session_id: string;
  pause_start: string;
  pause_end?: string | null;
  pause_reason: string;
  reminded: boolean;
}

export interface Product {
  id: string;
  name: string;
  category: '饮料' | '小吃' | '其他';
  price: number;
  stock: number;
  active: boolean;
}

export interface Member {
  id: string;
  name: string;
  phone: string;
  level: 'silver' | 'gold' | 'diamond';
  balance: number;
  discount_rate: number;
}

export interface Package {
  id: string;
  name: string;
  duration_minutes: number;
  original_price: number;
  package_price: number;
  applicable_tables: string[];
}

export interface Checkout {
  id: string;
  session_id: string;
  checkout_time: string;
  table_fee: number;
  product_total: number;
  subtotal: number;
  discount_amount: number;
  discount_rate?: number | null;
  final_total: number;
  received: number;
  change_amount: number;
  payment_method: PaymentMethod;
  operator_id: string;
  locked: boolean;
}

export interface RevocationLog {
  id: string;
  checkout_id: string;
  operator_id: string;
  revocation_time: string;
  reason: string;
  original_amount: number;
}

export interface Operator {
  id: string;
  username: string;
  password_hash: string;
  role: OperatorRole;
  display_name: string;
}

export interface Settings {
  pause_reminder_minutes: number;
  default_hourly_rate: number;
  round_minutes: number;
  round_mode: RoundMode;
  store_name: string;
  print_footer: string;
}

export interface LiveStateSnapshot {
  tables: BilliardTable[];
  sessions: OrderSession[];
  items: OrderItem[];
  pauses: PauseRecord[];
  transfers: TableTransfer[];
  current_operator_id: string | null;
  saved_at: string;
}
