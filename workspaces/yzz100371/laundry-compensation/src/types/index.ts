export enum OrderStatus {
  Received = 'received',
  Washing = 'washing',
  Done = 'done',
  PickedUp = 'picked_up',
}

export enum ClaimStatus {
  Pending = 'pending',
  Merged = 'merged',
  UnderReview = 'under_review',
  Approved = 'approved',
  Rejected = 'rejected',
  SupplementRequested = 'supplement_requested',
}

export enum ReviewAction {
  Approve = 'approve',
  RequestSupplement = 'request_supplement',
  Reject = 'reject',
}

export enum TimelineEventType {
  OrderCreated = 'order_created',
  OrderStatusChanged = 'order_status_changed',
  NoteAdded = 'note_added',
  ClaimSubmitted = 'claim_submitted',
  ClaimMerged = 'claim_merged',
  ReviewCompleted = 'review_completed',
  SupplementSubmitted = 'supplement_submitted',
}

export interface CareOrder {
  id: string;
  storeId: string;
  customerId: string;
  customerName: string;
  status: OrderStatus;
  receiptPhotos: string;
  receivedAt: string;
  pickedUpAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InspectionNote {
  id: string;
  orderId: string;
  storeId: string;
  defectDescription: string;
  defectPhotos: string;
  severity: 'minor' | 'moderate' | 'severe';
  createdBy: string;
  createdAt: string;
}

export interface CompensationClaim {
  id: string;
  orderId: string;
  storeId: string;
  amount: number;
  reason: string;
  status: ClaimStatus;
  mergedIntoId: string | null;
  reviewerId: string | null;
  requiresSeniorReview: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClaimReview {
  id: string;
  claimId: string;
  reviewerId: string;
  action: ReviewAction;
  comment: string;
  approvedAmount: number | null;
  createdAt: string;
}

export interface ClaimSupplement {
  id: string;
  claimId: string;
  submittedBy: string;
  photos: string;
  description: string;
  createdAt: string;
}

export interface TimelineEvent {
  id: string;
  orderId: string;
  eventType: TimelineEventType;
  actorId: string;
  detail: string;
  createdAt: string;
}

export interface ClaimWithDetails extends CompensationClaim {
  order: CareOrder;
  notes: InspectionNote[];
  reviews: ClaimReview[];
  supplements: ClaimSupplement[];
}

export interface MonthlyExportRow {
  claimId: string;
  orderId: string;
  storeId: string;
  customerName: string;
  claimAmount: number;
  approvedAmount: number | null;
  claimStatus: ClaimStatus;
  orderStatus: OrderStatus;
  submittedAt: string;
  reviewedAt: string | null;
}

export interface CreateOrderInput {
  storeId: string;
  customerId: string;
  customerName: string;
  receiptPhotos: string[];
}

export interface AddNoteInput {
  orderId: string;
  storeId: string;
  defectDescription: string;
  defectPhotos: string[];
  severity: 'minor' | 'moderate' | 'severe';
  createdBy: string;
}

export interface SubmitClaimInput {
  orderId: string;
  storeId: string;
  amount: number;
  reason: string;
}

export interface ReviewClaimInput {
  claimId: string;
  reviewerId: string;
  action: ReviewAction;
  comment: string;
  approvedAmount?: number;
}

export interface SubmitSupplementInput {
  claimId: string;
  submittedBy: string;
  photos: string[];
  description: string;
}
