export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginationResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CreateOrderRequest {
  userId: string;
  communityId: string;
  cutoffId: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  remark?: string;
}

export interface UpdateOrderItemRequest {
  quantity: number;
}

export interface CloseCutoffRequest {
  actualCutoffTime?: string;
}

export interface CreateDeliveryRequest {
  cutoffId: string;
  productId: string;
  actualQuantity: number;
  supplierName?: string;
  remark?: string;
}

export interface CreateSubstitutionRequest {
  orderItemId: string;
  substituteProductId: string;
  substituteQuantity: number;
  leaderRemark?: string;
}

export interface ApproveSubstitutionRequest {
  leaderId: string;
  leaderRemark?: string;
}

export interface CustomerSubstitutionResponse {
  response: 'accepted' | 'rejected';
  customerRemark?: string;
}

export interface CreateRefundRequest {
  idempotencyKey: string;
  orderId: string;
  orderItemId?: string;
  amount: number;
  reason: 'out_of_stock' | 'substitution_diff' | 'quality_issue' | 'customer_cancel' | 'other';
  remark?: string;
}

export interface ProcessRefundRequest {
  status: 'approved' | 'transferred' | 'completed' | 'cancelled';
  processedBy: string;
  transferMethod?: string;
  transferTransactionId?: string;
  remark?: string;
}

export interface CreateSortingListRequest {
  cutoffId: string;
  routeId?: string;
  name: string;
  createdBy: string;
  remark?: string;
}

export interface UpdateSortingBagRequest {
  status: 'pending' | 'packed' | 'delivered';
  remark?: string;
}

export interface RefundExportParams {
  cutoffId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

export interface RefundExportItem {
  refundId: string;
  orderNo: string;
  customerName: string;
  customerPhone: string;
  communityName: string;
  amount: number;
  reason: string;
  status: string;
  createdAt: string;
  completedAt?: string;
  transferMethod?: string;
  transferTransactionId?: string;
  remark?: string;
}
