export interface Level {
  id: string;
  title: string;
  description: string;
  category: 'acid-base' | 'alcohol-lamp' | 'glassware' | 'general' | 'custom';
  difficulty: 1 | 2 | 3;
  steps: Step[];
  isCustom?: boolean;
  createdAt: number;
}

export interface Step {
  order: number;
  scene: string;
  choices: Choice[];
  safetyCategory?: string;
}

export interface Choice {
  id: string;
  text: string;
  isCorrect: boolean;
  feedback: string;
  correctAction: string;
}

export interface StudentSession {
  id: string;
  studentName: string;
  className: string;
  levelId: string;
  score: number;
  totalSteps: number;
  answers: Answer[];
  completedAt: number;
}

export interface Answer {
  stepOrder: number;
  choiceId: string;
  choiceText: string;
  isCorrect: boolean;
  feedback: string;
  correctAction: string;
  screenshotDataUrl?: string;
  levelId?: string;
  levelTitle?: string;
  scene?: string;
  safetyCategory?: string;
}

export interface QuizSession {
  id: string;
  studentName: string;
  className: string;
  levelId: string;
  score: number;
  totalQuestions: number;
  quizAnswers: QuizAnswer[];
  completedAt: number;
}

export interface QuizAnswer {
  questionIndex: number;
  selectedChoiceId: string;
  isCorrect: boolean;
}

export interface ClassStats {
  className: string;
  totalStudents: number;
  completedStudents: number;
  stepErrorRates: {
    levelId: string;
    levelTitle: string;
    stepOrder: number;
    scene: string;
    errorRate: number;
    errorCount: number;
    totalCount: number;
  }[];
  safetyWeakPoints: { category: string; errorCount: number }[];
}

export type UserRole = 'student' | 'teacher';

export interface UserInfo {
  role: UserRole;
  name: string;
  className?: string;
}
