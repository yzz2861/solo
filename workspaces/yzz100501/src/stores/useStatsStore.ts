import { create } from 'zustand';
import type { StudentSession, QuizSession, ClassStats } from '@/types';

const SESSIONS_KEY = 'lab-safety-sessions';
const QUIZ_SESSIONS_KEY = 'lab-safety-quiz-sessions';

interface StatsState {
  sessions: StudentSession[];
  quizSessions: QuizSession[];
  loadSessions: () => void;
  saveSession: (session: StudentSession) => void;
  saveQuizSession: (session: QuizSession) => void;
  getClassStats: (className: string) => ClassStats;
  getLevelSessions: (levelId: string) => StudentSession[];
  getAllClassNames: () => string[];
}

function readStorage<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T[];
  } catch {
    // localStorage may be unavailable or data corrupted
  }
  return [];
}

function writeStorage<T>(key: string, data: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // localStorage may be unavailable or full
  }
}

const useStatsStore = create<StatsState>((set, get) => ({
  sessions: [],
  quizSessions: [],

  loadSessions: () => {
    const sessions = readStorage<StudentSession>(SESSIONS_KEY);
    const quizSessions = readStorage<QuizSession>(QUIZ_SESSIONS_KEY);
    set({ sessions, quizSessions });
  },

  saveSession: (session) =>
    set((state) => {
      const sessions = [...state.sessions, session];
      writeStorage(SESSIONS_KEY, sessions);
      return { sessions };
    }),

  saveQuizSession: (session) =>
    set((state) => {
      const quizSessions = [...state.quizSessions, session];
      writeStorage(QUIZ_SESSIONS_KEY, quizSessions);
      return { quizSessions };
    }),

  getClassStats: (className) => {
    const { sessions } = get();
    const classSessions = sessions.filter((s) => s.className === className);

    const uniqueStudents = new Set(classSessions.map((s) => s.studentName));
    const completedStudents = new Set(
      classSessions
        .filter((s) => s.score / s.totalSteps >= 0.6)
        .map((s) => s.studentName),
    );

    interface StepKey {
      levelId: string;
      stepOrder: number;
    }
    const stepKeyToId = (k: StepKey) => `${k.levelId}::${k.stepOrder}`;

    const stepErrorMap = new Map<
      string,
      {
        levelId: string;
        levelTitle: string;
        stepOrder: number;
        scene: string;
        errors: number;
        total: number;
      }
    >();

    for (const session of classSessions) {
      for (const answer of session.answers) {
        const levelId = answer.levelId ?? session.levelId;
        const levelTitle =
          answer.levelTitle ?? levelId;
        const key = stepKeyToId({
          levelId,
          stepOrder: answer.stepOrder,
        });
        const existing = stepErrorMap.get(key);
        const scene = answer.scene ?? answer.feedback;
        if (existing) {
          existing.total += 1;
          if (!answer.isCorrect) existing.errors += 1;
          if (!existing.scene && scene) existing.scene = scene;
        } else {
          stepErrorMap.set(key, {
            levelId,
            levelTitle,
            stepOrder: answer.stepOrder,
            scene,
            errors: answer.isCorrect ? 0 : 1,
            total: 1,
          });
        }
      }
    }

    const stepErrorRates = Array.from(stepErrorMap.values()).map((s) => ({
      levelId: s.levelId,
      levelTitle: s.levelTitle,
      stepOrder: s.stepOrder,
      scene: s.scene,
      errorRate: s.total > 0 ? s.errors / s.total : 0,
      errorCount: s.errors,
      totalCount: s.total,
    }));

    const categoryErrorMap = new Map<string, number>();
    for (const session of classSessions) {
      for (const answer of session.answers) {
        if (!answer.isCorrect) {
          const category =
            answer.safetyCategory && answer.safetyCategory.trim() !== ''
              ? answer.safetyCategory
              : `${answer.levelTitle ?? '未分类'} · 第${answer.stepOrder}步`;
          categoryErrorMap.set(
            category,
            (categoryErrorMap.get(category) ?? 0) + 1,
          );
        }
      }
    }
    const safetyWeakPoints = Array.from(categoryErrorMap.entries()).map(
      ([category, errorCount]) => ({ category, errorCount }),
    );

    return {
      className,
      totalStudents: uniqueStudents.size,
      completedStudents: completedStudents.size,
      stepErrorRates,
      safetyWeakPoints,
    };
  },

  getLevelSessions: (levelId) => {
    return get().sessions.filter((s) => s.levelId === levelId);
  },

  getAllClassNames: () => {
    const { sessions } = get();
    return [...new Set(sessions.map((s) => s.className))];
  },
}));

export default useStatsStore;
