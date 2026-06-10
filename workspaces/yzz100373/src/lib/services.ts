import api from './api';
import type {
  Member,
  MemberWithPackages,
  MemberPackage,
  Worker,
  Order,
  Addon,
  AddonConfig,
  DailyReport,
  CreateOrderRequest,
  UpdateOrderRequest,
  AddAddonRequest,
  CancelOrderRequest,
} from '../../shared/types';

export const workerApi = {
  getList: () => api.get<Worker[]>('/workers').then(r => r.data),
};

export const addonConfigApi = {
  getList: () => api.get<AddonConfig[]>('/addons-config').then(r => r.data),
};

export const memberApi = {
  search: (q?: string) =>
    api.get<MemberWithPackages[]>('/members', { params: { q } }).then(r => r.data),
  getById: (id: string) =>
    api.get<MemberWithPackages>(`/members/${id}`).then(r => r.data),
  getByPlate: (plate: string) =>
    api.get<MemberWithPackages>(`/members/by-plate/${plate}`).then(r => r.data),
  findSimilarPlates: (plate: string) =>
    api.get<{ plateNumber: string; id?: string; name?: string; similarity: number }[]>(
      '/members/similar-plates',
      { params: { plate } }
    ).then(r => r.data),
  create: (data: { name: string; phone: string; plateNumber: string }) =>
    api.post<MemberWithPackages>('/members', data).then(r => r.data),
  addPackage: (memberId: string, data: { packageName: string; totalTimes: number; pricePerTime: number }) =>
    api.post<MemberPackage>(`/members/${memberId}/packages`, data).then(r => r.data),
};

export const orderApi = {
  getList: (params?: { date?: string; status?: string }) =>
    api.get<Order[]>('/orders', { params }).then(r => r.data),
  getById: (id: string) =>
    api.get<Order>(`/orders/${id}`).then(r => r.data),
  create: (data: CreateOrderRequest) =>
    api.post<Order>('/orders', data).then(r => r.data),
  update: (id: string, data: UpdateOrderRequest) =>
    api.patch<Order>(`/orders/${id}`, data).then(r => r.data),
  addAddon: (orderId: string, data: AddAddonRequest) =>
    api.post<Addon>(`/orders/${orderId}/addons`, data).then(r => r.data),
  markAddonPaid: (orderId: string, addonId: string) =>
    api.patch<Addon>(`/orders/${orderId}/addons/${addonId}/paid`).then(r => r.data),
  checkUnpaid: (orderId: string) =>
    api.get<{ hasUnpaid: boolean }>(`/orders/${orderId}/unpaid-check`).then(r => r.data),
  cancel: (id: string, data: CancelOrderRequest) =>
    api.post<Order>(`/orders/${id}/cancel`, data).then(r => r.data),
};

export const reportApi = {
  getDaily: (date?: string) =>
    api.get<DailyReport>('/report/daily', { params: { date } }).then(r => r.data),
  exportDaily: (date?: string) => {
    const url = date ? `/api/report/daily/export?date=${date}` : '/api/report/daily/export';
    window.location.href = url;
  },
};
