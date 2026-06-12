import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout')
};

export const claimAPI = {
  list: (params) => api.get('/claims', { params }),
  create: (data) => api.post('/claims', data),
  get: (id) => api.get(`/claims/${id}`),
  update: (id, data) => api.put(`/claims/${id}`, data),
  delete: (id) => api.delete(`/claims/${id}`)
};

export const documentAPI = {
  list: (claimId) => api.get(`/documents/${claimId}`),
  upload: (claimId, formData) => api.post(`/documents/${claimId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getContent: (claimId, docId) => api.get(`/documents/${claimId}/${docId}/content`),
  saveContent: (claimId, docId, data) => api.post(`/documents/${claimId}/${docId}/content`, data),
  delete: (claimId, docId) => api.delete(`/documents/${claimId}/${docId}`)
};

export const summaryAPI = {
  generate: (claimId) => api.post(`/summaries/${claimId}/generate`),
  get: (summaryId) => api.get(`/summaries/${summaryId}`),
  updateItem: (itemId, data) => api.put(`/summaries/items/${itemId}`, data),
  addItem: (summaryId, data) => api.post(`/summaries/${summaryId}/items`, data),
  deleteItem: (itemId, data) => api.delete(`/summaries/items/${itemId}`, { data }),
  resolveConflict: (conflictId, resolved) => api.put(`/summaries/conflicts/${conflictId}/resolve`, { resolved }),
  updateMissing: (itemId, data) => api.put(`/summaries/missing/${itemId}`, data),
  addMissing: (summaryId, data) => api.post(`/summaries/${summaryId}/missing`, data),
  deleteMissing: (itemId) => api.delete(`/summaries/missing/${itemId}`),
  updateFollowup: (pointId, data) => api.put(`/summaries/followup/${pointId}`, data),
  addFollowup: (summaryId, data) => api.post(`/summaries/${summaryId}/followup`, data),
  deleteFollowup: (pointId) => api.delete(`/summaries/followup/${pointId}`)
};

export const exportAPI = {
  customer: (summaryId) => api.post(`/exports/${summaryId}/customer`),
  internal: (summaryId) => api.post(`/exports/${summaryId}/internal`)
};

export const supervisorAPI = {
  revisions: (params) => api.get('/supervisor/revisions', { params }),
  getRevision: (summaryId) => api.get(`/supervisor/revisions/${summaryId}`),
  review: (summaryId, data) => api.post(`/supervisor/${summaryId}/review`, data),
  reviews: (params) => api.get('/supervisor/reviews', { params }),
  statistics: () => api.get('/supervisor/statistics')
};

export default api;
