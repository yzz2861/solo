const API_BASE = '/api';

interface ApiOptions extends RequestInit {
  headers?: Record<string, string>;
}

async function request<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const adminToken = localStorage.getItem('adminToken');
  if (adminToken) {
    headers['Authorization'] = `Bearer ${adminToken}`;
  }

  const elderlyId = localStorage.getItem('elderlyId');
  if (elderlyId) {
    headers['X-Elderly-Id'] = elderlyId;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || '请求失败');
  }

  return data as T;
}

export const api = {
  get<T>(path: string) {
    return request<T>(path, { method: 'GET' });
  },
  post<T>(path: string, body?: any) {
    return request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  },
  put<T>(path: string, body?: any) {
    return request<T>(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  },
  delete<T>(path: string) {
    return request<T>(path, { method: 'DELETE' });
  },
  download(path: string) {
    const adminToken = localStorage.getItem('adminToken');
    const headers: Record<string, string> = {};
    if (adminToken) {
      headers['Authorization'] = `Bearer ${adminToken}`;
    }
    return fetch(`${API_BASE}${path}`, { headers });
  },
};

export const elderlyApi = {
  login: (name: string, phoneLast4: string, age?: number, community?: string) =>
    api.post<{
      elderly: { id: number; name: string; phoneLast4: string; age?: number; community?: string };
      progress: any;
    }>('/elderly/login', { name, phoneLast4, age, community }),

  getProfile: () => api.get<any>('/elderly/profile'),
  getProgress: () => api.get<any>('/elderly/progress'),
  saveProgress: (data: any) => api.post<any>('/elderly/progress', data),
  submitAnswer: (data: any) => api.post<any>('/elderly/answer', data),
  getNextCase: () => api.get<{ case: any; message?: string }>('/elderly/next-case'),
};

export const adminApi = {
  login: (username: string, password: string) =>
    api.post<{ token: string; admin: any }>('/admin/login', { username, password }),
  getProfile: () => api.get<any>('/admin/profile'),
};

export const caseApi = {
  list: (includeInactive = false) => api.get<any[]>(`/cases?includeInactive=${includeInactive}`),
  get: (id: number) => api.get<any>(`/cases/${id}`),
  create: (data: any) => api.post<any>('/cases', data),
  update: (id: number, data: any) => api.put<any>(`/cases/${id}`, data),
  delete: (id: number) => api.delete<any>(`/cases/${id}`),
  reorder: (caseIds: number[]) => api.post<any>('/cases/reorder', { caseIds }),
  stats: () => api.get<any>('/cases/stats'),
};

export const analyticsApi = {
  overview: () => api.get<any>('/analytics/overview'),
  fraudTypes: () => api.get<any[]>('/analytics/fraud-types'),
  ageGroups: () => api.get<any[]>('/analytics/age-groups'),
  trend: (days = 30) => api.get<any[]>(`/analytics/trend?days=${days}`),
  vulnerableCases: (limit = 10) => api.get<any[]>(`/analytics/vulnerable-cases?limit=${limit}`),
  export: () => api.download('/analytics/export'),
};

export const socialWorkerApi = {
  listElderly: () => api.get<any[]>('/social-worker/elderly'),
  getElderlyDetail: (id: number) => api.get<any>(`/social-worker/elderly/${id}`),
  toggleFocus: (id: number) => api.post<any>(`/social-worker/elderly/${id}/focus`),
  addFollowUp: (id: number, notes: string) =>
    api.post<any>(`/social-worker/elderly/${id}/follow-ups`, { notes }),
  getFollowUps: (id: number) => api.get<any[]>(`/social-worker/elderly/${id}/follow-ups`),
};
