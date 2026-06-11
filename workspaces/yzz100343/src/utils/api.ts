import type { Hazard, Rectification, Review } from '@/types';

const BASE_URL = '/api';

export async function fetchHazards(params?: {
  status?: string;
  team?: string;
  onlyOverdue?: boolean;
}): Promise<Hazard[]> {
  const url = new URL(`${BASE_URL}/hazards`);
  if (params) {
    if (params.status && params.status !== 'ALL') url.searchParams.set('status', params.status);
    if (params.team && params.team !== 'ALL') url.searchParams.set('team', params.team);
    if (params.onlyOverdue) url.searchParams.set('onlyOverdue', 'true');
  }
  const response = await fetch(url.toString());
  if (!response.ok) throw new Error('获取隐患列表失败');
  return response.json();
}

export async function fetchHazardById(id: string): Promise<Hazard> {
  const response = await fetch(`${BASE_URL}/hazards/${id}`);
  if (!response.ok) throw new Error('获取隐患详情失败');
  return response.json();
}

export async function createHazard(data: {
  boxNumber: string;
  location: string;
  description: string;
  photoUrl?: string;
  team: string;
  deadline: string;
  createdBy: string;
}): Promise<Hazard> {
  const response = await fetch(`${BASE_URL}/hazards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('创建隐患失败');
  return response.json();
}

export async function submitRectification(hazardId: string, data: {
  description: string;
  photoUrl?: string;
  submittedBy: string;
}): Promise<Hazard> {
  const response = await fetch(`${BASE_URL}/hazards/${hazardId}/rectification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || '提交整改失败');
  }
  return response.json();
}

export async function submitReview(hazardId: string, data: {
  passed: boolean;
  comment: string;
  reviewedBy: string;
}): Promise<Hazard> {
  const response = await fetch(`${BASE_URL}/hazards/${hazardId}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || '提交复查失败');
  }
  return response.json();
}

export async function deleteHazard(id: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/hazards/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('删除隐患失败');
}

export interface TeamStat {
  team: string;
  total: number;
  closed: number;
  rectifying: number;
  pendingReview: number;
  rejected: number;
  overdue: number;
  rejectCount: number;
  closeRate: number;
  openRate: number;
}

export async function fetchTeamStats(): Promise<TeamStat[]> {
  const response = await fetch(`${BASE_URL}/stats/team`);
  if (!response.ok) throw new Error('获取班组统计失败');
  return response.json();
}

export interface OverviewStats {
  total: number;
  notClosed: number;
  overdue: number;
  totalRejected: number;
  closed: number;
  rate: number;
}

export async function fetchOverviewStats(): Promise<OverviewStats> {
  const response = await fetch(`${BASE_URL}/stats/overview`);
  if (!response.ok) throw new Error('获取概览统计失败');
  return response.json();
}

export async function checkApiHealth(): Promise<{ status: string; timestamp: string }> {
  const response = await fetch(`${BASE_URL}/health`);
  if (!response.ok) throw new Error('API服务不可用');
  return response.json();
}
