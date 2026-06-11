import type { Solution } from '@/types';

const STORAGE_KEY = 'live-gift-solutions';
const ACTIVE_KEY = 'live-gift-active-solution';

export function loadSolutions(): Solution[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Solution[];
  } catch {
    return [];
  }
}

export function saveSolutions(solutions: Solution[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(solutions));
}

export function loadActiveSolutionId(): string | null {
  return localStorage.getItem(ACTIVE_KEY);
}

export function saveActiveSolutionId(id: string | null): void {
  if (id) {
    localStorage.setItem(ACTIVE_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_KEY);
  }
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
