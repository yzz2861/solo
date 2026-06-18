export type MaterialType = 'pottery' | 'wood' | 'metal';

export type TransportDistance = 'short' | 'medium' | 'long';

export type LinerMaterial = 'bubble-wrap' | 'foam' | 'acid-free-paper' | 'cotton' | 'silk';

export type FixingMaterial = 'velcro' | 'foam-block' | 'elastic-band' | 'cotton-rope' | 'custom-mold';

export type DesiccantType = 'silica-gel' | 'charcoal' | 'none' | 'molecular-sieve';

export type BoxType = 'cardboard' | 'wooden' | 'aluminum' | 'foam-box';

export interface VulnerablePoint {
  id: string;
  name: string;
  description: string;
}

export interface Artifact {
  id: string;
  name: string;
  material: MaterialType;
  size: 'small' | 'medium' | 'large';
  weight: number;
  vulnerablePoints: VulnerablePoint[];
  description: string;
  imageUrl?: string;
}

export interface Level {
  id: string;
  name: string;
  description: string;
  artifact: Artifact;
  transportDistance: TransportDistance;
  difficulty: 'easy' | 'medium' | 'hard';
  optimalSolution: PackingSolution;
  tips?: string;
}

export interface PackingSolution {
  liner: LinerMaterial;
  fixing: FixingMaterial;
  desiccant: DesiccantType;
  box: BoxType;
  supportPoints: string[];
}

export interface PackingChoice {
  liner: LinerMaterial | null;
  fixing: FixingMaterial | null;
  desiccant: DesiccantType | null;
  box: BoxType | null;
  supportPoints: string[];
}

export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface PackingRisk {
  id: string;
  category: string;
  severity: RiskSeverity;
  title: string;
  description: string;
  relatedMaterial?: string;
}

export interface PackingResult {
  isCorrect: boolean;
  score: number;
  risks: PackingRisk[];
  correctSolution: PackingSolution;
  feedback: string;
}

export interface MistakeRecord {
  id: string;
  levelId: string;
  artifactId: string;
  artifactName: string;
  material: MaterialType;
  timestamp: number;
  mistakes: PackingRisk[];
  retryCount: number;
  userSolution: PackingChoice;
}

export interface StudentProgress {
  totalAttempts: number;
  correctCount: number;
  mistakesByMaterial: Record<MaterialType, MistakeRecord[]>;
  levelProgress: Record<string, { completed: boolean; bestScore: number; retryCount: number }>;
  lastPracticeTime?: number;
}

export type GameMode = 'practice' | 'review' | 'confirm' | 'exam';

export type UserRole = 'student' | 'teacher';
