import type { UserAnswer, Obstacle, UrgencyLevel, ContactDepartment } from '../types';

export interface ScoreResult {
  score: number;
  correctFields: number;
  isCorrect: boolean;
  details: {
    canBypass: boolean;
    urgency: boolean;
    contactDept: boolean;
    specialCase: boolean;
  };
}

export function calculateObstacleScore(
  obstacle: Obstacle,
  userAnswer: UserAnswer
): ScoreResult {
  if (obstacle.isFalsePositive) {
    const isCorrect = userAnswer.canBypass === null &&
      userAnswer.urgency === null &&
      userAnswer.contactDept === null;

    return {
      score: isCorrect ? 80 : -20,
      correctFields: isCorrect ? 1 : 0,
      isCorrect,
      details: {
        canBypass: isCorrect,
        urgency: isCorrect,
        contactDept: isCorrect,
        specialCase: obstacle.specialCase ? isCorrect : false,
      },
    };
  }

  const canBypassCorrect = userAnswer.canBypass === obstacle.canBypass;
  const urgencyCorrect = userAnswer.urgency === obstacle.urgency;
  const contactDeptCorrect = userAnswer.contactDept === obstacle.contactDept;

  const correctFields = [canBypassCorrect, urgencyCorrect, contactDeptCorrect].filter(Boolean).length;

  let baseScore = 0;
  if (correctFields === 3) baseScore = 100;
  else if (correctFields === 2) baseScore = 60;
  else if (correctFields === 1) baseScore = 20;

  let specialCaseBonus = 0;
  let specialCaseCorrect = false;
  if (obstacle.specialCase && correctFields >= 2) {
    specialCaseBonus = 30;
    specialCaseCorrect = true;
  }

  return {
    score: baseScore + specialCaseBonus,
    correctFields,
    isCorrect: correctFields >= 2,
    details: {
      canBypass: canBypassCorrect,
      urgency: urgencyCorrect,
      contactDept: contactDeptCorrect,
      specialCase: specialCaseCorrect,
    },
  };
}

export function calculateMissedPenalty(count: number): number {
  return -30 * count;
}

export function calculateFalsePositivePenalty(count: number): number {
  return -20 * count;
}

export function calculateTimeBonus(timeRemaining: number, timeLimit: number): number {
  const maxBonus = 200;
  const ratio = timeRemaining / timeLimit;
  return Math.floor(maxBonus * Math.max(0, Math.min(1, ratio)));
}

export function calculateGrade(accuracy: number): string {
  if (accuracy >= 0.9) return 'S';
  if (accuracy >= 0.8) return 'A';
  if (accuracy >= 0.7) return 'B';
  if (accuracy >= 0.6) return 'C';
  return 'D';
}

export function calculateTotalScore(
  obstacleScores: number[],
  missedCount: number,
  falsePositiveCount: number,
  timeRemaining: number,
  timeLimit: number
): number {
  const obstacleTotal = obstacleScores.reduce((sum, s) => sum + s, 0);
  const missedPenalty = calculateMissedPenalty(missedCount);
  const fpPenalty = calculateFalsePositivePenalty(falsePositiveCount);
  const timeBonus = calculateTimeBonus(timeRemaining, timeLimit);

  return Math.max(0, obstacleTotal + missedPenalty + fpPenalty + timeBonus);
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export function getUrgencyLevelColor(urgency: UrgencyLevel): string {
  const colors: Record<UrgencyLevel, string> = {
    low: 'bg-green-500',
    medium: 'bg-yellow-500',
    high: 'bg-orange-500',
    emergency: 'bg-red-500',
  };
  return colors[urgency];
}

export function getDepartmentLabel(dept: ContactDepartment): string {
  const labels: Record<ContactDepartment, string> = {
    traffic_police: '交警部门',
    city_management: '城管部门',
    construction_dept: '住建部门',
    transportation: '交通部门',
    utility_company: '公用事业单位',
    community: '社区居委会',
    environmental: '环卫部门',
  };
  return labels[dept];
}
