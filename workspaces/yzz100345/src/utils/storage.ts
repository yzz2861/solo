import type { ProblemProgress, GameMode } from '@/types';

const STORAGE_KEYS = {
  PROGRESS: 'go-practice-progress',
  GAME_MODE: 'go-practice-mode',
  STUDENT_NAME: 'go-practice-student-name',
};

export const saveProgress = (progress: Record<string, ProblemProgress>): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progress));
  } catch (e) {
    console.error('Failed to save progress:', e);
  }
};

export const loadProgress = (): Record<string, ProblemProgress> => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PROGRESS);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load progress:', e);
  }
  return {};
};

export const clearProgress = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEYS.PROGRESS);
  } catch (e) {
    console.error('Failed to clear progress:', e);
  }
};

export const saveGameMode = (mode: GameMode): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.GAME_MODE, mode);
  } catch (e) {
    console.error('Failed to save game mode:', e);
  }
};

export const loadGameMode = (): GameMode => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.GAME_MODE);
    if (data === 'student' || data === 'teacher') {
      return data;
    }
  } catch (e) {
    console.error('Failed to load game mode:', e);
  }
  return 'student';
};

export const saveStudentName = (name: string): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.STUDENT_NAME, name);
  } catch (e) {
    console.error('Failed to save student name:', e);
  }
};

export const loadStudentName = (): string => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.STUDENT_NAME);
    if (data) {
      return data;
    }
  } catch (e) {
    console.error('Failed to load student name:', e);
  }
  return '';
};
