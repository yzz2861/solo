export interface User {
  id: string;
  username: string;
  name: string;
  role: 'surveyor' | 'leader';
  phone: string;
  avatar: string;
  createdAt: string;
}

export interface AccidentTime {
  date: string | null;
  time: string | null;
  period: string | null;
  isComplete: boolean;
  isVague: boolean;
}

export interface AccidentLocation {
  road: string | null;
  intersection: string | null;
  details: string | null;
  isComplete: boolean;
  isVague: boolean;
}

export interface AccidentDirection {
  ourDirection: string | null;
  otherDirection: string | null;
  isComplete: boolean;
  isVague: boolean;
  hasVagueWords: string[];
}

export interface VehiclePart {
  id: string;
  name: string;
  zone: string;
  zoneName: string;
  isEstimated: boolean;
  source: string;
  damage?: string;
}

export interface AccidentType {
  type: string;
  description: string;
}

export interface LiabilityClue {
  liability: string;
  clue: string;
  evidence: string[];
}

export interface DamageDescription {
  type: string;
  severity: string;
}

export interface MissingMaterial {
  id: string;
  name: string;
  description: string;
  reason: string;
}

export interface LowConfidenceFlag {
  type: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  suggestion: string;
  details?: any;
}

export interface ReshootItem {
  id: string;
  type: string;
  partName?: string;
  shotName?: string;
  reason: string;
  description?: string;
  angle?: string;
  isCompleted: boolean;
  completedAt?: string;
  notes?: string;
  photoUrl?: string;
}

export interface CompletionResult {
  originalDescription: string;
  photoNotes: string[];
  accidentTime: AccidentTime;
  accidentLocation: AccidentLocation;
  accidentDirection: AccidentDirection;
  vehicleParts: VehiclePart[];
  accidentType: AccidentType;
  liabilityClue: LiabilityClue;
  damageDescription: DamageDescription[];
  standardDescription: string;
  missingMaterials: MissingMaterial[];
  lowConfidenceFlags: LowConfidenceFlag[];
  confidenceScore: number;
  reshootList: ReshootItem[];
  trainingNotes: any[];
}

export interface Case {
  id: string;
  surveyorId: string;
  plateNumber: string;
  originalDescription: string;
  photoNotes: string[];
  context: any;
  accidentTime: AccidentTime;
  accidentLocation: AccidentLocation;
  accidentDirection: AccidentDirection;
  vehicleParts: VehiclePart[];
  accidentType: AccidentType;
  liabilityClue: LiabilityClue;
  damageDescription: DamageDescription[];
  standardDescription: string;
  finalDescription?: string;
  missingMaterials: MissingMaterial[];
  lowConfidenceFlags: LowConfidenceFlag[];
  confidenceScore: number;
  reshootList: ReshootItem[];
  status: 'draft' | 'confirmed' | 'reshoot-pending' | 'reshoot-completed';
  confirmedParts?: { id: string; name: string; damage: string }[];
  confirmedLiability?: string;
  notes?: string;
  confirmedAt?: string;
  reshootCompletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaderboardItem {
  userId: string;
  userName: string;
  avatar: string;
  totalCases: number;
  highConfidenceCases: number;
  avgConfidence: number;
}

export interface Stats {
  totalCases: number;
  statusCounts: Record<string, number>;
  lowConfidenceCount: number;
  highConfidenceCount: number;
  avgConfidence: number;
  trainingCasesCount: number;
}

export interface TrainingCase {
  id: string;
  originalCaseId?: string;
  sourceCaseId?: string;
  sourcePlateNumber?: string;
  originalDescription: string;
  standardDescription: string;
  issues?: LowConfidenceFlag[];
  improvements: string[];
  example?: {
    bad: string;
    good: string;
    explanation: string;
  };
  trainerNotes?: string;
  confidenceImprovement?: number;
  category?: string;
  isCompleted?: boolean;
  completedAt?: string;
  learnerId?: string;
  learnerNotes?: string;
  quizScore?: number;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ExportData {
  caseId: string;
  summaryText: string;
  reshootList: ReshootItem[];
  missingMaterials: MissingMaterial[];
  exportTime: string;
}
