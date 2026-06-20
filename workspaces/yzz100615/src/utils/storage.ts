import type { Task, LoadStandard } from '@/types';

const TASKS_KEY = 'axle_calculator_tasks';
const STANDARDS_KEY = 'axle_calculator_standards';

export function saveTasks(tasks: Task[]): void {
  try {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.error('Failed to save tasks:', e);
  }
}

export function loadTasks(): Task[] {
  try {
    const data = localStorage.getItem(TASKS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load tasks:', e);
    return [];
  }
}

export function saveStandards(standards: LoadStandard[]): void {
  try {
    localStorage.setItem(STANDARDS_KEY, JSON.stringify(standards));
  } catch (e) {
    console.error('Failed to save standards:', e);
  }
}

export function loadStandards(): LoadStandard[] {
  try {
    const data = localStorage.getItem(STANDARDS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load standards:', e);
    return [];
  }
}
