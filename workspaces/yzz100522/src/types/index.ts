export type TriageLevel = 'red' | 'yellow' | 'green' | 'black';

export type BreathingStatus = 'normal' | 'fast' | 'slow' | 'absent';
export type BleedingStatus = 'none' | 'minor' | 'moderate' | 'severe';
export type ConsciousnessLevel = 'alert' | 'verbal' | 'pain' | 'unresponsive';
export type PulseStatus = 'normal' | 'fast' | 'slow' | 'weak' | 'absent';

export type Difficulty = 'easy' | 'medium' | 'hard';
export type Scenario = 'daytime' | 'night' | 'rainy' | 'crowded';
export type UserRole = 'student' | 'teacher';

export interface Casualty {
  id: string;
  name: string;
  age: number;
  gender: 'male' | 'female';
  
  breathing: BreathingStatus;
  respiratoryRate?: number;
  bleeding: BleedingStatus;
  consciousness: ConsciousnessLevel;
  pulse?: PulseStatus;
  bloodPressure?: { systolic: number; diastolic: number };
  oxygenSaturation?: number;
  
  symptoms: string[];
  injuryDescription: string;
  
  hasChronicDisease?: boolean;
  chronicDiseaseDesc?: string;
  isChild?: boolean;
  isCrying?: boolean;
  deniesInjury?: boolean;
  specialNotes?: string;
  
  correctLevel: TriageLevel;
  correctPriority: number;
  explanation: string;
  misjudgePoints: string[];
}

export interface Resources {
  stretchers: number;
  medics: number;
  ambulances: number;
}

export type SpecialEventType = 'resource_reduce' | 'new_casualty' | 'condition_worsen' | 'transport_arrive';

export interface SpecialEvent {
  id: string;
  type: SpecialEventType;
  triggerTime: number;
  description: string;
  resourceChange?: Partial<Resources>;
  newCasualty?: Casualty;
  targetCasualtyId?: string;
}

export interface TrainingCase {
  id: string;
  name: string;
  description: string;
  difficulty: Difficulty;
  scenario: Scenario;
  casualties: Casualty[];
  resources: Resources;
  specialEvents?: SpecialEvent[];
  timeLimit?: number;
  createdAt: number;
  updatedAt: number;
}

export interface StudentAnswer {
  casualtyId: string;
  selectedLevel: TriageLevel;
  priority: number;
}

export type MistakeType = 'level' | 'priority' | 'both';

export interface MistakeItem {
  casualtyId: string;
  casualtyName: string;
  correctLevel: TriageLevel;
  studentLevel: TriageLevel;
  correctPriority: number;
  studentPriority: number;
  mistakeType: MistakeType;
  explanation: string;
  misjudgedVitals: string[];
}

export interface LevelAccuracy {
  red: number;
  yellow: number;
  green: number;
  black: number;
}

export interface TrainingRecord {
  id: string;
  studentName: string;
  caseId: string;
  caseName: string;
  startTime: number;
  endTime: number;
  duration: number;
  answers: StudentAnswer[];
  score: number;
  accuracy: number;
  levelAccuracy: LevelAccuracy;
  mistakes: MistakeItem[];
  difficulty: Difficulty;
  scenario: Scenario;
}

export interface Student {
  id: string;
  name: string;
  className?: string;
  trainingCount: number;
  averageScore: number;
  lastTrainingTime?: number;
}

export interface CurrentUser {
  role: UserRole;
  name: string;
}
