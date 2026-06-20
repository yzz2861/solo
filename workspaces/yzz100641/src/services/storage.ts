import { HelpRequest, ReferralRecord, ProcessLog } from '../types';

const STORAGE_KEYS = {
  REQUESTS: 'campus_help_requests',
  REFERRALS: 'campus_help_referrals',
  LOGS: 'campus_help_logs',
  CURRENT_USER: 'campus_help_current_user',
};

export function getAllRequests(): HelpRequest[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.REQUESTS);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load requests:', e);
    return [];
  }
}

export function saveRequests(requests: HelpRequest[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(requests));
  } catch (e) {
    console.error('Failed to save requests:', e);
  }
}

export function getRequestById(id: string): HelpRequest | undefined {
  const requests = getAllRequests();
  return requests.find(r => r.id === id);
}

export function updateRequest(updated: HelpRequest): void {
  const requests = getAllRequests();
  const index = requests.findIndex(r => r.id === updated.id);
  if (index !== -1) {
    requests[index] = { ...updated, updatedAt: new Date().toISOString() };
    saveRequests(requests);
  }
}

export function addRequest(request: HelpRequest): void {
  const requests = getAllRequests();
  requests.push(request);
  saveRequests(requests);
}

export function addRequests(newRequests: HelpRequest[]): void {
  const requests = getAllRequests();
  requests.push(...newRequests);
  saveRequests(requests);
}

export function deleteRequest(id: string): void {
  const requests = getAllRequests();
  const filtered = requests.filter(r => r.id !== id);
  saveRequests(filtered);
}

export function getAllReferrals(): ReferralRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.REFERRALS);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load referrals:', e);
    return [];
  }
}

export function saveReferrals(referrals: ReferralRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.REFERRALS, JSON.stringify(referrals));
  } catch (e) {
    console.error('Failed to save referrals:', e);
  }
}

export function addReferral(referral: ReferralRecord): void {
  const referrals = getAllReferrals();
  referrals.push(referral);
  saveReferrals(referrals);
}

export function updateReferral(updated: ReferralRecord): void {
  const referrals = getAllReferrals();
  const index = referrals.findIndex(r => r.id === updated.id);
  if (index !== -1) {
    referrals[index] = { ...updated, updatedAt: new Date().toISOString() };
    saveReferrals(referrals);
  }
}

export function getReferralsByRequestId(requestId: string): ReferralRecord[] {
  return getAllReferrals().filter(r => r.requestId === requestId);
}

export function getAllLogs(): ProcessLog[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.LOGS);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load logs:', e);
    return [];
  }
}

export function saveLogs(logs: ProcessLog[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
  } catch (e) {
    console.error('Failed to save logs:', e);
  }
}

export function addLog(log: ProcessLog): void {
  const logs = getAllLogs();
  logs.push(log);
  saveLogs(logs);
}

export function getLogsByRequestId(requestId: string): ProcessLog[] {
  return getAllLogs().filter(l => l.requestId === requestId).sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getCurrentUser(): string {
  try {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || '值班老师';
  } catch (e) {
    return '值班老师';
  }
}

export function setCurrentUser(name: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, name);
  } catch (e) {
    console.error('Failed to save user:', e);
  }
}

export function clearAllData(): void {
  localStorage.removeItem(STORAGE_KEYS.REQUESTS);
  localStorage.removeItem(STORAGE_KEYS.REFERRALS);
  localStorage.removeItem(STORAGE_KEYS.LOGS);
}
