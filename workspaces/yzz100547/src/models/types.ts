export type UserRole = 'resident' | 'social_worker' | 'director';

export type TransactionType = 'award' | 'freeze' | 'exchange' | 'refund' | 'revoke';

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'reversed';

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export type ActivityStatus = 'active' | 'cancelled';

export type OrderStatus = 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';

export interface User {
  id: number;
  name: string;
  phone: string;
  password: string;
  role: UserRole;
  points_balance: number;
  created_at: string;
}

export interface PublicUser {
  id: number;
  name: string;
  phone: string;
  role: UserRole;
  points_balance: number;
}

export interface Activity {
  id: number;
  name: string;
  description?: string;
  points_per_person: number;
  status: ActivityStatus;
  created_at: string;
  cancelled_at?: string;
}

export interface ActivityParticipant {
  id: number;
  activity_id: number;
  user_id: number;
  points_awarded: number;
  transaction_id?: number;
  created_at: string;
}

export interface PointsTransaction {
  id: number;
  user_id: number;
  type: TransactionType;
  amount: number;
  balance_after: number;
  related_id?: number;
  status: TransactionStatus;
  idempotency_key?: string;
  description?: string;
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: number;
  review_status?: ReviewStatus;
}

export interface InventoryItem {
  id: number;
  name: string;
  description?: string;
  points_cost: number;
  stock_quantity: number;
  category?: string;
  created_at: string;
  updated_at: string;
}

export interface ExchangeOrder {
  id: number;
  user_id: number;
  inventory_item_id: number;
  quantity: number;
  total_points: number;
  status: OrderStatus;
  idempotency_key?: string;
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: number;
  review_note?: string;
}

export interface IdempotencyKey {
  id: number;
  key: string;
  transaction_type: string;
  response_data?: string;
  created_at: string;
  expires_at: string;
}

export interface JwtPayload {
  userId: number;
  role: UserRole;
  name: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateActivityRequest {
  name: string;
  description?: string;
  points_per_person: number;
}

export interface AwardPointsRequest {
  activity_id: number;
  user_ids: number[];
  idempotency_key?: string;
}

export interface CreateInventoryRequest {
  name: string;
  description?: string;
  points_cost: number;
  stock_quantity: number;
  category?: string;
}

export interface UpdateInventoryRequest {
  name?: string;
  description?: string;
  points_cost?: number;
  stock_quantity?: number;
  category?: string;
}

export interface ExchangeRequest {
  inventory_item_id: number;
  quantity: number;
  idempotency_key?: string;
}

export interface ReviewOrderRequest {
  status: 'approved' | 'rejected';
  note?: string;
}

export interface ReviewTransactionRequest {
  status: 'approved' | 'rejected';
  note?: string;
}

export interface TransactionQuery {
  userId?: number;
  type?: TransactionType;
  status?: TransactionStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface RankingQuery {
  limit?: number;
  startDate?: string;
  endDate?: string;
}
