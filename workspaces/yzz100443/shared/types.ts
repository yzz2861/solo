export type FraudType =
  | 'fake_service'
  | 'investment'
  | 'fake_relative'
  | 'verification_code'
  | 'malicious_link';

export const FRAUD_TYPE_LABELS: Record<FraudType, string> = {
  fake_service: '冒充客服',
  investment: '投资群诈骗',
  fake_relative: '假冒亲友',
  verification_code: '验证码诈骗',
  malicious_link: '恶意链接',
};

export type AdminRole = 'police' | 'social_worker';

export interface Dialogue {
  id: number;
  speaker: 'scammer' | 'elderly' | 'system';
  content: string;
  delay?: number;
}

export interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
  feedback: {
    title: string;
    content: string;
    explanation: string;
  };
}

export interface Case {
  id: number;
  title: string;
  fraudType: FraudType;
  description: string;
  difficulty: 1 | 2 | 3;
  dialogues: Dialogue[];
  options: Option[];
  warningPoints: string[];
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export interface Elderly {
  id: number;
  name: string;
  phoneLast4: string;
  age?: number;
  community?: string;
  isFocus: boolean;
  createdAt: string;
}

export interface GameProgress {
  id: number;
  elderlyId: number;
  currentCaseId?: number;
  currentDialogueIndex: number;
  consecutiveCorrect: number;
  currentDifficulty: number;
  lastPlayTime?: string;
  createdAt: string;
}

export interface AnswerRecord {
  id: number;
  elderlyId: number;
  caseId: number;
  dialogueIndex: number;
  isCorrect: boolean;
  selectedOption: string;
  ageGroup?: string;
  fraudType: FraudType;
  createdAt: string;
}

export interface Admin {
  id: number;
  username: string;
  name: string;
  role: AdminRole;
  community?: string;
  createdAt: string;
}

export interface FollowUpRecord {
  id: number;
  elderlyId: number;
  socialWorkerId: number;
  socialWorkerName: string;
  notes: string;
  createdAt: string;
}

export interface ElderlyWithStats extends Elderly {
  totalGames: number;
  correctRate: number;
  lastPlayTime?: string;
  weakFraudTypes: FraudType[];
}

export interface FraudTypeStats {
  fraudType: FraudType;
  label: string;
  totalAnswers: number;
  incorrectAnswers: number;
  fraudRate: number;
}

export interface AgeGroupStats {
  ageGroup: string;
  totalAnswers: number;
  incorrectAnswers: number;
  fraudRate: number;
  topFraudTypes: { fraudType: FraudType; rate: number }[];
}

export function getAgeGroup(age?: number): string {
  if (!age) return '未知';
  if (age < 60) return '60岁以下';
  if (age < 70) return '60-69岁';
  if (age < 80) return '70-79岁';
  return '80岁以上';
}

export function adjustDifficulty(
  consecutiveCorrect: number,
  currentDifficulty: number
): number {
  if (consecutiveCorrect >= 3 && currentDifficulty < 3) {
    return currentDifficulty + 1;
  }
  if (consecutiveCorrect === 0 && currentDifficulty > 1) {
    return currentDifficulty - 1;
  }
  return currentDifficulty;
}
