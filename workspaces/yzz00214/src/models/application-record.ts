export interface TransactionRecord {
  transactionId: string;
  cardId: string;
  amount: number;
  transactionTime: string;
  location: string;
  merchant: string;
  transactionType: 'consume' | 'recharge' | 'refund' | 'transfer';
  deviceId: string;
}

export interface AnomalyApplicationRecord {
  applicationId: string;
  cardId: string;
  studentId: string;
  applyTime: string;
  anomalyType: AnomalyType;
  anomalyDescription: string;
  involvedTransactions: string[];
  claimAmount: number;
  applicantContact: string;
}

export type AnomalyType =
  | 'stolen_card'
  | 'lost_card'
  | 'unauthorized_consumption'
  | 'abnormal_amount'
  | 'abnormal_location'
  | 'system_error'
  | 'other';
