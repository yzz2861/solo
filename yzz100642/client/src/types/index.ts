export interface Customer {
  id: number;
  name: string;
  company: string;
  contact: string;
  created_at: string;
  opportunity_count?: number;
  commitment_count?: number;
}

export interface Opportunity {
  id: number;
  customer_id: number;
  name: string;
  status: string;
  amount: number;
  created_at: string;
  customer_name?: string;
  customer_company?: string;
  chat_count?: number;
  commitment_count?: number;
  approved_count?: number;
}

export interface ChatMessage {
  id: number;
  chat_id: number;
  sender: string;
  content: string;
  timestamp: string;
  message_type: 'text' | 'voice' | 'media';
}

export type CommitmentType = 'price' | 'gift' | 'delivery' | 'aftersales' | 'condition';

export type CommitmentStatus = 'pending' | 'approved' | 'rejected' | 'needs_revision';

export interface Commitment {
  id: number;
  chat_message_id: number;
  opportunity_id: number;
  type: CommitmentType;
  typeName: string;
  content: string;
  original_sentence: string;
  confidence: number;
  confidence_reason: string | null;
  status: CommitmentStatus;
  contract_reference: string | null;
  created_at: string;
  updated_at: string;
  sender?: string;
  message_content?: string;
  timestamp?: string;
  salesperson?: string;
  opportunity_name?: string;
  customer_name?: string;
  version_count?: number;
}

export interface CommitmentVersion {
  id: number;
  commitment_id: number;
  content: string;
  original_sentence: string;
  type: string;
  confidence: number;
  confidence_reason: string | null;
  changed_by: string;
  change_reason: string;
  created_at: string;
}

export interface Approval {
  id: number;
  commitment_id: number;
  approver: string;
  action: 'approve' | 'reject' | 'revise';
  comment: string | null;
  created_at: string;
}

export interface CommitmentTypeMap {
  [key: string]: string;
}

export interface ImportResult {
  chatId: number;
  commitments: Commitment[];
  messages: ChatMessage[];
}

export interface CustomerSummary {
  id: number;
  name: string;
  company: string;
  opportunity_count: number;
  total_commitments: number;
  approved_commitments: number;
  price_count: number;
  gift_count: number;
  delivery_count: number;
  aftersales_count: number;
  condition_count: number;
}

export interface OpportunitySummary {
  id: number;
  name: string;
  status: string;
  amount: number;
  customer_name: string;
  customer_company: string;
  total_commitments: number;
  approved_commitments: number;
  pending_commitments: number;
  price_count: number;
  gift_count: number;
  delivery_count: number;
  aftersales_count: number;
  condition_count: number;
}

export interface DeliveryHandover {
  opportunity_id: number;
  opportunity_name: string;
  customer_name: string;
  customer_company: string;
  customer_contact: string;
  commitments: {
    price: Commitment[];
    gift: Commitment[];
    delivery: Commitment[];
    aftersales: Commitment[];
    condition: Commitment[];
  };
}
