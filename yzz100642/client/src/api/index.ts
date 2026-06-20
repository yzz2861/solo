import axios from 'axios';
import type {
  Customer,
  Opportunity,
  Commitment,
  CommitmentVersion,
  Approval,
  ImportResult,
  CustomerSummary,
  OpportunitySummary,
  DeliveryHandover,
  CommitmentTypeMap,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

export const healthCheck = () => api.get('/health');

export const getCustomers = () => api.get<Customer[]>('/customers');

export const createCustomer = (data: { name: string; company?: string; contact?: string }) =>
  api.post<Customer>('/customers', data);

export const getOpportunities = () => api.get<Opportunity[]>('/opportunities');

export const createOpportunity = (data: { customer_id?: number; name: string; status?: string; amount?: number }) =>
  api.post<Opportunity>('/opportunities', data);

export const getOpportunity = (id: number) => api.get<Opportunity & { commitments: Commitment[] }>(`/opportunities/${id}`);

export const importChat = (data: {
  opportunity_id?: number;
  salesperson?: string;
  source?: string;
  content: string;
}) => api.post<ImportResult>('/chats/import', data);

export const getCommitments = (params?: {
  opportunity_id?: number;
  status?: string;
  type?: string;
  min_confidence?: number;
}) => api.get<Commitment[]>('/commitments', { params });

export const getCommitment = (id: number) =>
  api.get<Commitment & { versions: CommitmentVersion[]; approvals: Approval[] }>(`/commitments/${id}`);

export const updateCommitment = (
  id: number,
  data: {
    content?: string;
    original_sentence?: string;
    type?: string;
    confidence?: number;
    confidence_reason?: string;
    contract_reference?: string;
    changed_by?: string;
    change_reason?: string;
  }
) => api.put<Commitment>(`/commitments/${id}`, data);

export const approveCommitment = (
  id: number,
  data: { approver?: string; action?: string; comment?: string } = {}
) => api.post<Commitment>(`/commitments/${id}/approve`, { action: 'approve', ...data });

export const rejectCommitment = (
  id: number,
  data: { approver?: string; comment?: string } = {}
) => api.post<Commitment>(`/commitments/${id}/approve`, { action: 'reject', ...data });

export const needsRevision = (
  id: number,
  data: { approver?: string; comment?: string } = {}
) => api.post<Commitment>(`/commitments/${id}/approve`, { action: 'needs_revision', ...data });

export const bulkApprove = (data: { ids: number[]; approver?: string; action: string }) =>
  api.post<Commitment[]>('/commitments/bulk-approve', data);

export const bulkApproveCommitments = bulkApprove;
export const getCommitmentDetail = (id: number) =>
  api.get<{ commitment: Commitment; versions: CommitmentVersion[]; approvals: Approval[] }>(`/commitments/${id}`);
export const getSummaryByCustomer = () => api.get<CustomerSummary[]>('/summary/by-customer');
export const getSummaryByOpportunity = () => api.get<OpportunitySummary[]>('/summary/by-opportunity');

export const getCommitmentHistory = (id: number) =>
  api.get<{ versions: CommitmentVersion[]; approvals: Approval[] }>(`/commitments/${id}/history`);

export const exportCommitments = (params?: { opportunity_id?: number; format?: string; type?: string; status?: string }) =>
  api.get('/export/commitments', {
    params,
    responseType: params?.format === 'csv' ? 'blob' : 'json',
  });

export const getCustomerSummary = () => api.get<CustomerSummary[]>('/summary/by-customer');

export const getOpportunitySummary = () => api.get<OpportunitySummary[]>('/summary/by-opportunity');

export const getDeliveryHandover = (params?: { opportunity_id?: number }) =>
  api.get<DeliveryHandover[]>('/delivery/handover', { params });

export const getCommitmentTypes = () => api.get<CommitmentTypeMap>('/commitment-types');

export default api;
