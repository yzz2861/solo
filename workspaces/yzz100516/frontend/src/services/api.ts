import axios from 'axios';
import type {
  Sample,
  SampleListResponse,
  SampleCreate,
  SampleUpdate,
  ApprovalRequest,
  ReturnRequest,
  DestroyRequest,
  OutboundRequest,
  OverdueSample,
  Statistics,
  BatchCheckResult,
  ComplianceSummary,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

export const sampleApi = {
  list: (params: {
    skip?: number;
    limit?: number;
    status?: string;
    approval_status?: string;
    batch_number?: string;
    applicant?: string;
    keyword?: string;
    purpose?: string;
  } = {}) => {
    return api.get<SampleListResponse>('/samples', { params }).then(res => res.data);
  },

  get: (id: number) => {
    return api.get<Sample>(`/samples/${id}`).then(res => res.data);
  },

  create: (data: SampleCreate) => {
    return api.post<Sample>('/samples', data).then(res => res.data);
  },

  update: (id: number, data: SampleUpdate) => {
    return api.put<Sample>(`/samples/${id}`, data).then(res => res.data);
  },

  delete: (id: number) => {
    return api.delete(`/samples/${id}`).then(res => res.data);
  },

  approve: (id: number, data: ApprovalRequest) => {
    return api.post<Sample>(`/samples/${id}/approve`, data).then(res => res.data);
  },

  outbound: (id: number, data: OutboundRequest) => {
    return api.post<Sample>(`/samples/${id}/outbound`, data).then(res => res.data);
  },

  return: (id: number, data: ReturnRequest) => {
    return api.post<Sample>(`/samples/${id}/return`, data).then(res => res.data);
  },

  destroy: (id: number, data: DestroyRequest) => {
    return api.post<Sample>(`/samples/${id}/destroy`, data).then(res => res.data);
  },

  statistics: () => {
    return api.get<Statistics>('/samples/statistics').then(res => res.data);
  },

  overdue: (sortByOverdueDays: boolean = true) => {
    return api.get<OverdueSample[]>('/samples/overdue', {
      params: { sort_by_overdue_days: sortByOverdueDays }
    }).then(res => res.data);
  },

  outSamples: () => {
    return api.get<Sample[]>('/samples/out').then(res => res.data);
  },

  missingDocs: () => {
    return api.get<Sample[]>('/samples/missing-docs').then(res => res.data);
  },

  batchCheck: (batchNumber: string) => {
    return api.get<BatchCheckResult>(`/samples/batch-check/${batchNumber}`).then(res => res.data);
  },

  uploadAttachment: (sampleId: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/samples/${sampleId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(res => res.data);
  },

  deleteAttachment: (sampleId: number, attachmentId: number) => {
    return api.delete(`/samples/${sampleId}/attachments/${attachmentId}`).then(res => res.data);
  },

  getAttachmentUrl: (sampleId: number, attachmentId: number) => {
    return `/api/samples/${sampleId}/attachments/${attachmentId}`;
  },
};

export const complianceApi = {
  summary: () => {
    return api.get<ComplianceSummary>('/compliance/summary').then(res => res.data);
  },

  export: () => {
    window.open('/api/compliance/export', '_blank');
  },

  releaseOrder: (sampleId: number) => {
    window.open(`/api/compliance/release-order/${sampleId}`, '_blank');
  },
};

export default api;
