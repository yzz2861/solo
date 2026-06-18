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

    const stepErrorMap = new Map<
      number,
      { errors: number; total: number; scene: string }
    >();
    for (const session of classSessions) {
      for (const answer of session.answers) {
        const existing = stepErrorMap.get(answer.stepOrder);
        if (existing) {
          existing.total += 1;
          if (!answer.isCorrect) existing.errors += 1;
        } else {
          stepErrorMap.set(answer.stepOrder, {
            errors: answer.isCorrect ? 0 : 1,
            total: 1,
            scene: answer.feedback,
          });
        }
      }
    }

    const stepErrorRates = Array.from(stepErrorMap.entries()).map(
      ([stepOrder, data]) => ({
        stepOrder,
        errorRate: data.total > 0 ? data.errors / data.total : 0,
        scene: data.scene,
      }),
    );

    const categoryErrorMap = new Map<string, number>();
    for (const session of classSessions) {
      for (const answer of session.answers) {
        if (!answer.isCorrect) {
          const category = 'general';
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
