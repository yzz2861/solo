export type ObstacleType =
  | 'shared_bike'
  | 'low_signboard'
  | 'construction'
  | 'crossing_gap'
  | 'parked_car'
  | 'utility_pole'
  | 'manhole_cover'
  | 'side_object'
  | 'temp_construction'
  | 'low_visibility'
  | 'trash_bin'
  | 'newsstand';

export type UrgencyLevel = 'low' | 'medium' | 'high' | 'emergency';

export type ContactDepartment =
  | 'traffic_police'
  | 'city_management'
  | 'construction_dept'
  | 'transportation'
  | 'utility_company'
  | 'community'
  | 'environmental';

export type SpecialCase =
  | 'side_object'
  | 'temp_construction_with_warning'
  | 'night_visibility'
  | null;

export type UserRole = 'volunteer' | 'teacher';

export interface Obstacle {
  id: string;
  blockId: string;
  type: ObstacleType;
  x: number;
  y: number;
  canBypass: boolean;
  urgency: UrgencyLevel;
  contactDept: ContactDepartment;
  explanation: string;
  isFalsePositive: boolean;
  specialCase?: SpecialCase;
  specialExplanation?: string;
  segmentId?: string;
}

export interface Block {
  id: string;
  name: string;
  description: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  tags: string[];
  mapWidth: number;
  mapHeight: number;
  blindPathPoints: { x: number; y: number }[];
  buildings: { x: number; y: number; width: number; height: number; color?: string }[];
  roads: { x1: number; y1: number; x2: number; y2: number; width: number }[];
  obstacles: Obstacle[];
  segments: { id: string; name: string; startIndex: number; endIndex: number }[];
  timeLimit: number;
  createdAt: number;
  updatedAt: number;
}

export interface UserAnswer {
  canBypass: boolean | null;
  urgency: UrgencyLevel | null;
  contactDept: ContactDepartment | null;
}

export interface ClickRecord {
  id: string;
  sessionId: string;
  obstacleId: string | null;
  clickX: number;
  clickY: number;
  isCorrect: boolean;
  userAnswer: UserAnswer;
  correctAnswer?: {
    canBypass: boolean;
    urgency: UrgencyLevel;
    contactDept: ContactDepartment;
  };
  timestamp: number;
  scoreChange: number;
  obstacleType?: ObstacleType;
}

export interface GameSession {
  id: string;
  blockId: string;
  startTime: number;
  endTime: number;
  score: number;
  correctCount: number;
  missedCount: number;
  falsePositiveCount: number;
  clickRecords: ClickRecord[];
  totalObstacles: number;
  accuracy: number;
}

export interface BlockStat {
  blockId: string;
  bestScore: number;
  bestAccuracy: number;
  playCount: number;
  lastPlayedAt: number;
}

export interface UserStats {
  totalSessions: number;
  totalScore: number;
  averageAccuracy: number;
  weakTypes: Record<string, { correct: number; total: number }>;
  blockStats: Record<string, BlockStat>;
  lastPlayedAt: number;
}

export interface GameState {
  blockId: string | null;
  sessionId: string | null;
  isPlaying: boolean;
  isPaused: boolean;
  currentScore: number;
  timeRemaining: number;
  foundObstacles: Set<string>;
  falsePositiveClicks: ClickRecord[];
  selectedObstacle: Obstacle | null;
  showPanel: boolean;
  feedbackState: 'correct' | 'wrong' | null;
}

export const OBSTACLE_TYPE_LABELS: Record<ObstacleType, string> = {
  shared_bike: '共享单车',
  low_signboard: '低矮招牌',
  construction: '施工围挡',
  crossing_gap: '路口断点',
  parked_car: '违停车辆',
  utility_pole: '电线杆',
  manhole_cover: '井盖缺失',
  side_object: '旁侧物体',
  temp_construction: '临时施工',
  low_visibility: '夜间可见差',
  trash_bin: '垃圾桶',
  newsstand: '报刊亭',
};

export const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  low: '低',
  medium: '中',
  high: '高',
  emergency: '紧急',
};

export const URGENCY_COLORS: Record<UrgencyLevel, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  emergency: 'bg-red-100 text-red-700',
};

export const DEPARTMENT_LABELS: Record<ContactDepartment, string> = {
  traffic_police: '交警部门',
  city_management: '城管部门',
  construction_dept: '住建部门',
  transportation: '交通部门',
  utility_company: '公用事业单位',
  community: '社区居委会',
  environmental: '环卫部门',
};

export const SPECIAL_CASE_LABELS: Record<string, string> = {
  side_object: '旁侧不影响通行',
  temp_construction_with_warning: '临时施工有警示',
  night_visibility: '夜间可见性差',
};

export const GRADE_LABELS = ['S', 'A', 'B', 'C', 'D'];
export const GRADE_COLORS = [
  'text-yellow-500',
  'text-green-500',
  'text-blue-500',
  'text-orange-500',
  'text-red-500',
];
