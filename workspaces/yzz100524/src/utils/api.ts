const BASE = '/api';

async function request<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || '请求失败');
  }
  return data.data;
}

export const api = {
  vehicles: {
    list: (params?: { status?: string; search?: string }) => {
      const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
      return request<any[]>(`/vehicles${qs}`);
    },
    available: (params?: { start_time?: string; duration?: number }) => {
      const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
      return request<any[]>(`/vehicles/available${qs}`);
    },
    create: (data: any) => request('/vehicles', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) =>
      request(`/vehicles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    updateStatus: (id: number, status: string) =>
      request(`/vehicles/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  },
  customers: {
    list: (params?: { search?: string }) => {
      const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
      return request<any[]>(`/customers${qs}`);
    },
    get: (id: number) => request(`/customers/${id}`),
    search: (q: string) => request(`/customers/search?q=${encodeURIComponent(q)}`),
    create: (data: any) => request('/customers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) =>
      request(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    feedback: (id: number, data: any) =>
      request(`/customers/${id}/feedback`, { method: 'POST', body: JSON.stringify(data) }),
  },
  testRides: {
    list: (params?: { status?: string; date?: string }) => {
      const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
      return request<any[]>(`/test-rides${qs}`);
    },
    active: () => request<any[]>('/test-rides/active'),
    unreturned: () => request<any[]>('/test-rides/unreturned-deposits'),
    create: (data: any) =>
      request('/test-rides', { method: 'POST', body: JSON.stringify(data) }),
    returnRide: (id: number, data: any) =>
      request(`/test-rides/${id}/return`, { method: 'PUT', body: JSON.stringify(data) }),
  },
  reports: {
    conversion: (params?: { start_date?: string; end_date?: string }) => {
      const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
      return request(`/reports/conversion${qs}`);
    },
    vehicleIssues: (params?: { resolved?: string; start_date?: string; end_date?: string }) => {
      const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
      return request(`/reports/vehicle-issues${qs}`);
    },
    depositFlow: (params?: { start_date?: string; end_date?: string }) => {
      const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
      return request(`/reports/deposit-flow${qs}`);
    },
    exportReport: (type: string, params?: { start_date?: string; end_date?: string }) => {
      const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
      return request(`/reports/export/${type}${qs}`);
    },
  },
};
