export type ToothRegion = 'outer' | 'inner' | 'occlusal' | 'lingual';

export type GameStatus = 'idle' | 'countdown' | 'playing' | 'paused' | 'completed' | 'early_exit';

export type PressureLevel = 'too-light' | 'good' | 'too-hard';

export interface RegionDetail {
  name: ToothRegion;
  duration: number;
  targetDuration: number;
  completed: boolean;
  cleanliness: number;
  issues: string[];
  cleanedCells: Set<string>;
}

export interface PracticeRecord {
  id: string;
  date: string;
  startTime: number;
  totalDuration: number;
  score: number;
  regions: Record<ToothRegion, RegionDetail>;
  overallIssues: string[];
  stars: number;
  difficulty: 'easy' | 'normal' | 'hard';
}

export interface UserSettings {
  childName: string;
  difficulty: 'easy' | 'normal' | 'hard';
  soundEnabled: boolean;
  targetDuration: number;
}

export interface GameState {
  status: GameStatus;
  currentRegion: ToothRegion;
  currentRegionIndex: number;
  elapsedTime: number;
  regionElapsedTime: number;
  pressure: number;
  brushPosition: { x: number; y: number } | null;
  cleanedCells: Set<string>;
  regionIssues: string[];
  countdown: number;
}

export interface FeedbackItem {
  id: string;
  type: 'success' | 'warning' | 'info';
  message: string;
  timestamp: number;
}

export interface StarBurst {
  id: number;
  x: number;
  y: number;
}

export const REGION_ORDER: ToothRegion[] = ['outer', 'inner', 'occlusal', 'lingual'];

export const REGION_NAMES: Record<ToothRegion, string> = {
  outer: '外侧',
  inner: '内侧',
  occlusal: '咬合面',
  lingual: '舌侧',
};

export const REGION_DESCRIPTIONS: Record<ToothRegion, string> = {
  outer: '牙齿朝外的一面，微笑时能看到的地方',
  inner: '牙齿朝里的一面，靠近舌头的一侧',
  occlusal: '上下牙咬合的咀嚼面',
  lingual: '前牙内侧靠近舌头的一面',
};

export const REGION_TIPS: Record<ToothRegion, string> = {
  outer: '从左到右，轻轻画圈刷～',
  inner: '嘴巴微微张开，牙刷竖起来刷哦～',
  occlusal: '来回摩擦，把食物残渣都赶跑！',
  lingual: '刷头立起来，轻轻刷前牙内侧～',
};
