import type {
  Order,
  Material,
  Evidence,
  AppealSummary,
  CreateProjectRequest,
  UpdateEvidenceRequest,
  BatchConfirmRequest,
  SaveSummaryRequest,
  UpdateMaterialOrderRequest,
  ExportRequest,
  ExportResponse,
  MaterialOrder,
  ApiResponse
} from '../../shared/types';

const API_BASE = '/api';

async function request<T>(url: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  
  const data = await response.json();
  return data as ApiResponse<T>;
}

async function requestFormData<T>(url: string, formData: FormData, method: string = 'POST'): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_BASE}${url}`, {
    method,
    body: formData,
  });
  
  const data = await response.json();
  return data as ApiResponse<T>;
}

export const projectApi = {
  getAll: () => request<Order[]>('/projects'),
  getById: (id: string) => request<Order>(`/projects/${id}`),
  create: (data: CreateProjectRequest) => request<Order>('/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateStatus: (id: string, status: Order['status']) => request<Order>(`/projects/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  }),
  delete: (id: string) => request<{ deleted: boolean }>(`/projects/${id}`, {
    method: 'DELETE',
  }),
};

export const materialApi = {
  getByProjectId: (projectId: string) => request<Material[]>(`/materials/project/${projectId}`),
  getById: (id: string) => request<Material>(`/materials/${id}`),
  upload: (projectId: string, files: File[], type?: string) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    if (type) formData.append('type', type);
    return requestFormData<Material[]>(`/materials/project/${projectId}/upload`, formData);
  },
  updateType: (id: string, type: string) => request<Material>(`/materials/${id}/type`, {
    method: 'PUT',
    body: JSON.stringify({ type }),
  }),
  delete: (id: string) => request<{ deleted: boolean }>(`/materials/${id}`, {
    method: 'DELETE',
  }),
  getOrder: (projectId: string) => request<MaterialOrder>(`/materials/project/${projectId}/order`),
  updateOrder: (projectId: string, order: string[]) => request<MaterialOrder>(`/materials/project/${projectId}/order`, {
    method: 'PUT',
    body: JSON.stringify({ order }),
  }),
};

export const evidenceApi = {
  getByProjectId: (projectId: string) => request<Evidence[]>(`/evidence/project/${projectId}`),
  getById: (id: string) => request<Evidence>(`/evidence/${id}`),
  analyze: (projectId: string) => request<Evidence[]>(`/evidence/project/${projectId}/analyze`, {
    method: 'POST',
  }),
  update: (id: string, data: UpdateEvidenceRequest) => request<Evidence>(`/evidence/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  batchConfirm: (ids: string[]) => request<{ confirmed: number }>('/evidence/batch-confirm', {
    method: 'POST',
    body: JSON.stringify({ ids } as BatchConfirmRequest),
  }),
  delete: (id: string) => request<{ deleted: boolean }>(`/evidence/${id}`, {
    method: 'DELETE',
  }),
};

export const summaryApi = {
  getByProjectId: (projectId: string) => request<AppealSummary[]>(`/summaries/project/${projectId}`),
  getLatest: (projectId: string) => request<AppealSummary>(`/summaries/project/${projectId}/latest`),
  generate: (projectId: string) => request<AppealSummary>(`/summaries/project/${projectId}/generate`, {
    method: 'POST',
  }),
  save: (projectId: string, data: SaveSummaryRequest) => request<AppealSummary>(`/summaries/project/${projectId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getById: (id: string) => request<AppealSummary>(`/summaries/${id}`),
};

export const exportApi = {
  export: (projectId: string, format: ExportRequest['format']) => request<ExportResponse>(`/export/project/${projectId}`, {
    method: 'POST',
    body: JSON.stringify({ format }),
  }),
  download: (fileName: string) => `${API_BASE}/export/download/${fileName}`,
};
