import type {
  Seat,
  Locker,
  Reservation,
  Violation,
  LostItem,
  Clearance,
  HourlySnapshot,
} from '@/types';

const API_BASE =
  (typeof window !== 'undefined' && (window as any).__API_BASE__) ||
  '/api';

export interface ApiState {
  seats: Seat[];
  lockers: Locker[];
  reservations: Reservation[];
  violations: Violation[];
  lostItems: LostItem[];
  clearances: Clearance[];
  snapshots: HourlySnapshot[];
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  const text = await res.text();
  let data: any;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { ok: res.ok, message: text };
  }
  if (!res.ok && !data?.ok) {
    throw new Error(data?.error || `HTTP ${res.status}`);
  }
  return data as T;
}

export const apiClient = {
  health: () => request<{ ok: boolean; ts: number; db: string }>('/health'),
  getState: () => request<{ ok: boolean; data: ApiState }>('/state'),
  getSeats: () => request<{ ok: boolean; data: Seat[] }>('/seats'),
  getLockers: () => request<{ ok: boolean; data: Locker[] }>('/lockers'),
  getReservations: () => request<{ ok: boolean; data: Reservation[] }>('/reservations'),
  getViolations: () => request<{ ok: boolean; data: Violation[] }>('/violations'),
  reserve: (payload: {
    seatId: string;
    studentName: string;
    studentPhone?: string;
    operator?: string;
  }) => request<{ ok: boolean; data?: Reservation; error?: string }>('/reserve', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  checkIn: (seatId: string, operator?: string) =>
    request<{ ok: boolean; data?: { seatCode: string; checkInAt: number }; error?: string }>('/checkin', {
      method: 'POST',
      body: JSON.stringify({ seatId, operator }),
    }),
  checkOut: (seatId: string, operator?: string, reason?: string) =>
    request<{ ok: boolean; data?: { seatCode: string; totalMinutes: number }; error?: string }>('/checkout', {
      method: 'POST',
      body: JSON.stringify({ seatId, operator, reason }),
    }),
  tempAway: (seatId: string, operator?: string) =>
    request<{ ok: boolean; data?: { seatCode: string; expireAt: number }; error?: string }>('/temp-away', {
      method: 'POST',
      body: JSON.stringify({ seatId, operator }),
    }),
  extendAway: (seatId: string, operator?: string) =>
    request<{ ok: boolean; data?: { seatCode: string; expireAt: number }; error?: string }>('/extend-away', {
      method: 'POST',
      body: JSON.stringify({ seatId, operator }),
    }),
  returnFromAway: (seatId: string, operator?: string) =>
    request<{ ok: boolean; data?: { seatCode: string }; error?: string }>('/return', {
      method: 'POST',
      body: JSON.stringify({ seatId, operator }),
    }),
  release: (seatId: string, operator?: string, reason?: string) =>
    request<{ ok: boolean; data?: { seatCode: string; totalMinutes: number }; error?: string }>('/release', {
      method: 'POST',
      body: JSON.stringify({ seatId, operator, reason }),
    }),
  handleViolation: (id: string, operator?: string, action?: 'release' | 'return' | 'warn') =>
    request<{ ok: boolean }>(`/violations/${id}/handle`, {
      method: 'POST',
      body: JSON.stringify({ operator, action }),
    }),
  sync: (payload: {
    seats?: Seat[];
    lockers?: Locker[];
    reservations?: Reservation[];
    violations?: Violation[];
    operator?: string;
  }) =>
    request<{ ok: boolean }>('/sync', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  exportUtilization: () => request<{ ok: boolean; data: HourlySnapshot[] }>('/export/utilization'),
  getEvents: () => request<{ ok: boolean; data: any[] }>('/events'),
};

let syncTimer: number | null = null;
let pendingSync = false;
let lastPayload = '';

export function debouncedSync(payload: {
  seats: Seat[];
  lockers: Locker[];
  reservations: Reservation[];
  violations: Violation[];
  operator?: string;
}) {
  const signature = JSON.stringify({
    s: payload.seats.map((x) => `${x.id}${x.status}${x.studentId ?? ''}${x.lockerId ?? ''}`),
    l: payload.lockers.map((x) => `${x.id}${x.status}${x.studentId ?? ''}`),
    r: payload.reservations.map((x) => `${x.id}${x.status}`),
    v: payload.violations.map((x) => `${x.id}${x.handled ? '1' : '0'}`),
  });
  if (signature === lastPayload) return;
  pendingSync = true;
  if (syncTimer) window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(async () => {
    try {
      await apiClient.sync(payload);
      lastPayload = signature;
      pendingSync = false;
    } catch (e) {
      // 网络失败时静默（前端本地状态已正确）
      pendingSync = false;
    }
  }, 400);
}

export function isApiAvailable(): Promise<boolean> {
  return apiClient
    .health()
    .then(() => true)
    .catch(() => false);
}
