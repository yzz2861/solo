import type { MedicalRecord, RevisionHistory } from '@shared/types';

export async function fetchRecords(params?: {
  status?: string;
  from?: string;
  to?: string;
  search?: string;
}): Promise<MedicalRecord[]> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.from) query.set('from', params.from);
  if (params?.to) query.set('to', params.to);
  if (params?.search) query.set('search', params.search);
  const res = await fetch(`/api/records?${query.toString()}`);
  if (!res.ok) throw new Error('加载失败');
  return res.json();
}

export async function fetchRecord(id: string): Promise<MedicalRecord> {
  const res = await fetch(`/api/records/${id}`);
  if (!res.ok) throw new Error('加载失败');
  return res.json();
}

export async function createRecord(payload: any) {
  const res = await fetch('/api/records', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('创建失败');
  return res.json();
}

export async function extractRecord(id: string): Promise<MedicalRecord> {
  const res = await fetch(`/api/records/${id}/extract`, { method: 'POST' });
  if (!res.ok) throw new Error('抽取失败');
  return res.json();
}

export async function confirmRecord(id: string, corrections: any[], operator: string) {
  const res = await fetch(`/api/records/${id}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ corrections, operator }),
  });
  if (!res.ok) throw new Error('确认失败');
  return res.json();
}

export async function fetchHistory(id: string): Promise<RevisionHistory[]> {
  const res = await fetch(`/api/records/${id}/history`);
  if (!res.ok) throw new Error('加载失败');
  return res.json();
}

export async function fetchPatientRecords(patientId: string): Promise<MedicalRecord[]> {
  const res = await fetch(`/api/records/patients/${patientId}/records`);
  if (!res.ok) throw new Error('加载失败');
  return res.json();
}

export async function fetchRevisions(): Promise<any[]> {
  const res = await fetch('/api/qa/revisions');
  if (!res.ok) throw new Error('加载失败');
  return res.json();
}

export async function submitQAReview(payload: any) {
  const res = await fetch('/api/qa/reviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('提交失败');
  return res.json();
}

export async function exportQA(from?: string, to?: string) {
  const query = new URLSearchParams();
  if (from) query.set('from', from);
  if (to) query.set('to', to);
  query.set('format', 'json');
  window.open(`/api/qa/export?${query.toString()}`, '_blank');
}
