import type { Level } from '../types';
import { initialLevels } from '../data/levels';

const LEVELS_STORAGE_KEY = 'museum-packing-levels';

export function loadLevels(): Level[] {
  try {
    const saved = localStorage.getItem(LEVELS_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load levels:', e);
  }
  return JSON.parse(JSON.stringify(initialLevels));
}

export function saveLevels(levels: Level[]): void {
  try {
    localStorage.setItem(LEVELS_STORAGE_KEY, JSON.stringify(levels));
  } catch (e) {
    console.error('Failed to save levels:', e);
  }
}

export function addLevel(levels: Level[], level: Level): Level[] {
  const newLevels = [...levels, level];
  saveLevels(newLevels);
  return newLevels;
}

export function updateLevel(levels: Level[], levelId: string, updates: Partial<Level>): Level[] {
  const newLevels = levels.map(l =>
    l.id === levelId ? { ...l, ...updates } : l
  );
  saveLevels(newLevels);
  return newLevels;
}

export function deleteLevel(levels: Level[], levelId: string): Level[] {
  const newLevels = levels.filter(l => l.id !== levelId);
  saveLevels(newLevels);
  return newLevels;
}

export function getLevelById(levels: Level[], id: string): Level | undefined {
  return levels.find(l => l.id === id);
}

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function createEmptyLevel(): Level {
  return {
    id: generateId('level'),
    name: '新关卡',
    description: '请填写关卡描述',
    difficulty: 'easy',
    transportDistance: 'short',
    artifact: {
      id: generateId('artifact'),
      name: '新文物',
      material: 'pottery',
      size: 'medium',
      weight: 1,
      description: '请填写文物描述',
      vulnerablePoints: [
        { id: 'vp1', name: '口沿', description: '器口边缘' },
      ],
    },
    optimalSolution: {
      liner: 'acid-free-paper',
      fixing: 'foam-block',
      desiccant: 'silica-gel',
      box: 'cardboard',
      supportPoints: ['底部'],
    },
    tips: '请填写学习提示',
  };
}
