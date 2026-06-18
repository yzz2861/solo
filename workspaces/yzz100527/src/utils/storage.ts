import type { Student } from '@/types';

const STORAGE_KEY = 'yanxue_students';

export function loadStudents(): Student[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load students from localStorage:', e);
  }
  return [];
}

export function saveStudents(students: Student[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
  } catch (e) {
    console.error('Failed to save students to localStorage:', e);
  }
}

export function clearStudents(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear students from localStorage:', e);
  }
}
