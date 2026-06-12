import { 
  Accident, 
  Photo, 
  AuditLog, 
  User, 
  LoginRequest, 
  LoginResponse,
  CreateAccidentRequest,
  UpdateAccidentRequest
} from '../../shared/types.js';

const API_BASE = '/api';

let token: string | null = null;

export const setToken = (t: string | null) => {
  token = t;
  if (t) {
    localStorage.setItem('auth_token', t);
  } else {
    localStorage.removeItem('auth_token');
  }
};

export const getToken = (): string | null => {
  if (!token) {
    token = localStorage.getItem('auth_token');
  }
  return token;
};

const request = async <T>(
  path: string,
  options: RequestInit = {}
): Promise<T> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  const authToken = getToken();
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '请求失败' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
};

export const authApi = {
  login: (data: LoginRequest): Promise<LoginResponse> =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  
  logout: () => {
    setToken(null);
  }
};

export const accidentApi = {
  list: (filters?: {
    status?: string;
    startDate?: string;
    endDate?: string;
    plateNumber?: string;
  }): Promise<Accident[]> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.plateNumber) params.append('plateNumber', filters.plateNumber);
    
    const query = params.toString();
    return request<Accident[]>(`/accidents${query ? `?${query}` : ''}`);
  },

  create: (data: CreateAccidentRequest): Promise<Accident> =>
    request<Accident>('/accidents', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  get: (id: string): Promise<Accident> =>
    request<Accident>(`/accidents/${id}`),

  update: (id: string, data: UpdateAccidentRequest): Promise<Accident> =>
    request<Accident>(`/accidents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  confirm: (id: string): Promise<Accident> =>
    request<Accident>(`/accidents/${id}/confirm`, {
      method: 'POST'
    }),

  requestClose: (id: string): Promise<Accident> =>
    request<Accident>(`/accidents/${id}/close`, {
      method: 'POST'
    }),

  getPhotos: (id: string): Promise<Photo[]> =>
    request<Photo[]>(`/accidents/${id}/photos`),

  uploadPhotos: (id: string, files: File[], description?: string): Promise<Photo[]> => {
    const formData = new FormData();
    files.forEach(file => formData.append('photos', file));
    if (description) formData.append('description', description);

    const authToken = getToken();
    return fetch(`${API_BASE}/accidents/${id}/photos`, {
      method: 'POST',
      headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {},
      body: formData
    }).then(res => {
      if (!res.ok) throw new Error('上传失败');
      return res.json();
    });
  },

  getAuditLogs: (id: string): Promise<AuditLog[]> =>
    request<AuditLog[]>(`/accidents/${id}/audit`)
};

export const managerApi = {
  getUnclosed: (): Promise<Accident[]> =>
    request<Accident[]>('/manager/unclosed'),

  getOverdue: (): Promise<Accident[]> =>
    request<Accident[]>('/manager/overdue'),

  getDisputed: (): Promise<Accident[]> =>
    request<Accident[]>('/manager/disputed'),

  export: (type: 'unclosed' | 'overdue' | 'disputed'): Promise<Blob> => {
    const authToken = getToken();
    return fetch(`${API_BASE}/manager/export/${type}`, {
      headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
    }).then(res => {
      if (!res.ok) throw new Error('导出失败');
      return res.blob();
    });
  },

  getAuditTimeline: (id: string): Promise<{
    photoEvents: AuditLog[];
    feeEvents: AuditLog[];
    statusEvents: AuditLog[];
  }> =>
    request(`/manager/audit-timeline/${id}`),

  closeAccident: (id: string): Promise<Accident> =>
    request<Accident>(`/manager/accidents/${id}/close`, {
      method: 'POST'
    }),

  markDisputed: (id: string): Promise<Accident> =>
    request<Accident>(`/manager/accidents/${id}/dispute`, {
      method: 'POST'
    })
};

export const getPhotoUrl = (fileName: string): string => {
  return `${API_BASE}/accidents/photos/${fileName}`;
};
