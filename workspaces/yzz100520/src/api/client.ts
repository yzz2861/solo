import type {
  Building,
  BuildingAnomalyDetail,
  BuildingAnomalySummary,
  Holiday,
  Occupancy,
  RepairRecord,
  WaterReading,
} from '@shared/types';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const api = {
  getBuildings: () => request<Building[]>('/api/buildings'),
  createBuilding: (data: Partial<Building>) =>
    request<Building>('/api/buildings', { method: 'POST', body: JSON.stringify(data) }),
  updateBuilding: (id: number, data: Partial<Building>) =>
    request<Building>(`/api/buildings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  getWaterReadings: (params?: { buildingId?: number; startDate?: string; endDate?: string }) => {
    const q = new URLSearchParams();
    if (params?.buildingId) q.set('buildingId', String(params.buildingId));
    if (params?.startDate) q.set('startDate', params.startDate);
    if (params?.endDate) q.set('endDate', params.endDate);
    return request<WaterReading[]>(`/api/water-readings?${q.toString()}`);
  },
  importWaterReadings: (csv: string, type?: 'preview' | 'import') =>
    request('/api/water-readings/import', {
      method: 'POST',
      body: JSON.stringify({ csv, type: type || 'import' }),
    }),

  getOccupancies: (params?: { buildingId?: number; startDate?: string; endDate?: string }) => {
    const q = new URLSearchParams();
    if (params?.buildingId) q.set('buildingId', String(params.buildingId));
    return request<Occupancy[]>(`/api/occupancy?${q.toString()}`);
  },
  importOccupancy: (csv: string, type?: 'preview' | 'import') =>
    request('/api/occupancy/import', {
      method: 'POST',
      body: JSON.stringify({ csv, type: type || 'import' }),
    }),

  getRepairs: (buildingId?: number) => {
    const q = new URLSearchParams();
    if (buildingId) q.set('buildingId', String(buildingId));
    return request<RepairRecord[]>(`/api/repairs?${q.toString()}`);
  },
  createRepair: (data: Partial<RepairRecord>) =>
    request<RepairRecord>('/api/repairs', { method: 'POST', body: JSON.stringify(data) }),
  updateRepair: (id: number, data: Partial<RepairRecord>) =>
    request<RepairRecord>(`/api/repairs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  importRepairs: (csv: string, type?: 'preview' | 'import') =>
    request('/api/repairs/import', {
      method: 'POST',
      body: JSON.stringify({ csv, type: type || 'import' }),
    }),

  getHolidays: () => request<Holiday[]>('/api/holidays'),
  createHoliday: (data: Partial<Holiday>) =>
    request<Holiday>('/api/holidays', { method: 'POST', body: JSON.stringify(data) }),
  deleteHoliday: (id: number) =>
    request(`/api/holidays/${id}`, { method: 'DELETE' }),
  importHolidays: (csv: string, type?: 'preview' | 'import') =>
    request('/api/holidays/import', {
      method: 'POST',
      body: JSON.stringify({ csv, type: type || 'import' }),
    }),

  getAnomalyOverview: (excludeHoliday: boolean = true) =>
    request<BuildingAnomalySummary[]>(`/api/anomaly/overview?excludeHoliday=${excludeHoliday}`),
  getBuildingAnomaly: (id: number) =>
    request<BuildingAnomalyDetail>(`/api/anomaly/building/${id}`),
};
