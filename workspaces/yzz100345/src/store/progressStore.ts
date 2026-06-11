import { create } from 'zustand';
import type { ProblemProgress, Attempt, GameMode, PracticeReport, ErrorType } from '@/types';
import { loadProgress, saveProgress, loadGameMode, saveGameMode, loadStudentName, saveStudentName, clearProgress } from '@/utils/storage';
import { problems } from '@/data/problems';
import { errorTypeLabels, errorTypeDescriptions } from '@/types';

interface ProgressStore {
  progress: Record<string, ProblemProgress>;
  gameMode: GameMode;
  studentName: string;
  isLoaded: boolean;
  loadData: () => void;
  addAttempt: (problemId: string, attempt: Attempt) => void;
  markCompleted: (problemId: string, mastered: boolean) => void;
  setGameMode: (mode: GameMode) => void;
  setStudentName: (name: string) => void;
  getProgressStats: () => {
    total: number;
    completed: number;
    accuracy: number;
    errorCount: number;
  };
  getWrongAttempts: () => Attempt[];
  getErrorBreakdown: () => Record<ErrorType, number>;
  generatePracticeReport: () => PracticeReport;
  clearAllProgress: () => void;
  getProblemProgress: (problemId: string) => ProblemProgress | undefined;
}

export const useProgressStore = create<ProgressStore>((set, get) => ({
  progress: {},
  gameMode: 'student',
  studentName: '',
  isLoaded: false,

  loadData: () => {
    const progress = loadProgress();
    const gameMode = loadGameMode();
    const studentName = loadStudentName();
    
    set({
      progress,
      gameMode,
      studentName,
      isLoaded: true,
    });
  },

  addAttempt: (problemId, attempt) => {
    set(state => {
      const existingProgress = state.progress[problemId] || {
        problemId,
        completed: false,
        attempts: [],
        lastAttempt: null,
        mastered: false,
        bestAttempt: false,
      };

      const newAttempts = [...existingProgress.attempts, attempt];
      const hasCorrect = newAttempts.some(a => a.isCorrect);
      
      const newProgress: ProblemProgress = {
        ...existingProgress,
        attempts: newAttempts,
        lastAttempt: attempt.timestamp,
        completed: hasCorrect,
        bestAttempt: hasCorrect,
      };

      const newProgressRecord = {
        ...state.progress,
        [problemId]: newProgress,
      };

      saveProgress(newProgressRecord);

      return {
        progress: newProgressRecord,
      };
    });
  },

  markCompleted: (problemId, mastered) => {
    set(state => {
      const existingProgress = state.progress[problemId];
      if (!existingProgress) return state;

      const newProgress: ProblemProgress = {
        ...existingProgress,
        completed: true,
        mastered,
      };

      const newProgressRecord = {
        ...state.progress,
        [problemId]: newProgress,
      };

      saveProgress(newProgressRecord);

      return {
        progress: newProgressRecord,
      };
    });
  },

  setGameMode: (mode) => {
    saveGameMode(mode);
    set({ gameMode: mode });
  },

  setStudentName: (name) => {
    saveStudentName(name);
    set({ studentName: name });
  },

  getProgressStats: () => {
    const state = get();
    const total = problems.length;
    const completed = Object.values(state.progress).filter(p => p.completed).length;
    
    const allAttempts = Object.values(state.progress).flatMap(p => p.attempts);
    const correctAttempts = allAttempts.filter(a => a.isCorrect).length;
    const accuracy = allAttempts.length > 0 ? Math.round((correctAttempts / allAttempts.length) * 100) : 0;
    
    const errorCount = allAttempts.filter(a => !a.isCorrect).length;

    return {
      total,
      completed,
      accuracy,
      errorCount,
    };
  },

  getWrongAttempts: () => {
    const state = get();
    return Object.values(state.progress)
      .flatMap(p => p.attempts)
      .filter(a => !a.isCorrect)
      .sort((a, b) => b.timestamp - a.timestamp);
  },

  getErrorBreakdown: () => {
    const state = get();
    const breakdown: Record<ErrorType, number> = {
      'liberty-misjudge': 0,
      'greedy-capture': 0,
      'wrong-position': 0,
      'forbidden-move': 0,
    };

    Object.values(state.progress).forEach(p => {
      p.attempts.forEach(a => {
        if (a.errorType) {
          breakdown[a.errorType]++;
        }
      });
    });

    return breakdown;
  },

  generatePracticeReport: () => {
    const state = get();
    const stats = state.getProgressStats();
    const errorBreakdown = state.getErrorBreakdown();
    
    const weakPoints: string[] = [];
    const suggestions: string[] = [];

    if (errorBreakdown['liberty-misjudge'] > 0) {
      weakPoints.push(`气数判断（${errorBreakdown['liberty-misjudge']}次错误）`);
      suggestions.push('加强气的计算练习，每下一步棋前先数数双方棋子的气');
    }
    if (errorBreakdown['greedy-capture'] > 0) {
      weakPoints.push(`贪吃棋子（${errorBreakdown['greedy-capture']}次错误）`);
      suggestions.push('记住"先保护自己，再吃对方"，落子前先看自己有没有危险');
    }
    if (errorBreakdown['wrong-position'] > 0) {
      weakPoints.push(`要点识别（${errorBreakdown['wrong-position']}次错误）`);
      suggestions.push('多练习找"急所"，也就是最关键的位置');
    }
    if (errorBreakdown['forbidden-move'] > 0) {
      weakPoints.push(`禁入点理解（${errorBreakdown['forbidden-move']}次错误）`);
      suggestions.push('牢记禁入点规则：没气又吃不到子的地方不能下');
    }

    if (stats.accuracy >= 80) {
      suggestions.push('表现很棒！可以尝试更难的题目了');
    } else if (stats.accuracy >= 60) {
      suggestions.push('继续加油！多练习错题，正确率会越来越高的');
    } else {
      suggestions.push('别着急！围棋需要慢慢来，先从简单的题目开始打基础');
    }

    const today = new Date();
    const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;

    return {
      studentName: state.studentName || undefined,
      date: dateStr,
      totalProblems: stats.total,
      completedProblems: stats.completed,
      accuracy: stats.accuracy,
      errorBreakdown,
      weakPoints,
      suggestions,
    };
  },

  clearAllProgress: () => {
    clearProgress();
    set({ progress: {} });
  },

  getProblemProgress: (problemId) => {
    const state = get();
    return state.progress[problemId];
  },
}));
