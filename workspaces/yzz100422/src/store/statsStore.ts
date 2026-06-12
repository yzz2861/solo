import { create } from 'zustand';
import type { GameSession, UserStats, BlockStat, ObstacleType } from '../types';
import { storage, STORAGE_KEYS } from '../utils/storage';
import { calculateMissedPenalty, calculateTimeBonus, calculateGrade } from '../utils/score';

interface StatsState {
  sessions: GameSession[];
  userStats: UserStats;
  loading: boolean;

  loadStats: () => void;
  saveStats: () => void;
  addSession: (session: GameSession, totalObstacles: number, realObstacleCount: number) => void;
  getBlockStats: (blockId: string) => BlockStat | null;
  getWeakTypes: () => { type: ObstacleType | string; errorRate: number; total: number; correct: number }[];
  getBlockAccuracy: (blockId: string) => number;
  getSessionsByBlock: (blockId: string) => GameSession[];
  getWeakSegments: (blockId: string) => { segmentId: string; errorRate: number }[];
  clearStats: () => void;
}

const defaultStats: UserStats = {
  totalSessions: 0,
  totalScore: 0,
  averageAccuracy: 0,
  weakTypes: {},
  blockStats: {},
  lastPlayedAt: 0,
};

export const useStatsStore = create<StatsState>((set, get) => ({
  sessions: [],
  userStats: defaultStats,
  loading: true,

  loadStats: () => {
    const sessions = storage.get<GameSession[]>(STORAGE_KEYS.SESSIONS, []);
    const stats = storage.get<UserStats>(STORAGE_KEYS.STATS, defaultStats);
    set({ sessions, userStats: stats, loading: false });
  },

  saveStats: () => {
    const { sessions, userStats } = get();
    storage.set(STORAGE_KEYS.SESSIONS, sessions);
    storage.set(STORAGE_KEYS.STATS, userStats);
  },

  addSession: (session, totalObstacles, realObstacleCount) => {
    const missedCount = realObstacleCount - session.correctCount;
    const accuracy = realObstacleCount > 0
      ? Math.max(0, session.correctCount - session.falsePositiveCount) / realObstacleCount
      : 0;

    const finalSession: GameSession = {
      ...session,
      missedCount: Math.max(0, missedCount),
      totalObstacles: realObstacleCount,
      accuracy,
    };

    set((state) => {
      const newSessions = [...state.sessions, finalSession];

      const weakTypes = { ...state.userStats.weakTypes };
      session.clickRecords.forEach((record) => {
        if (record.obstacleType) {
          if (!weakTypes[record.obstacleType]) {
            weakTypes[record.obstacleType] = { correct: 0, total: 0 };
          }
          weakTypes[record.obstacleType].total += 1;
          if (record.isCorrect) {
            weakTypes[record.obstacleType].correct += 1;
          }
        }
      });

      const blockStats = { ...state.userStats.blockStats };
      const existing = blockStats[session.blockId];
      blockStats[session.blockId] = {
        blockId: session.blockId,
        bestScore: Math.max(existing?.bestScore || 0, session.score),
        bestAccuracy: Math.max(existing?.bestAccuracy || 0, accuracy),
        playCount: (existing?.playCount || 0) + 1,
        lastPlayedAt: session.endTime,
      };

      const totalSessions = state.userStats.totalSessions + 1;
      const totalScore = state.userStats.totalScore + session.score;
      const averageAccuracy = newSessions.reduce((sum, s) => sum + s.accuracy, 0) / newSessions.length;

      return {
        sessions: newSessions,
        userStats: {
          ...state.userStats,
          totalSessions,
          totalScore,
          averageAccuracy,
          weakTypes,
          blockStats,
          lastPlayedAt: session.endTime,
        },
      };
    });

    get().saveStats();
  },

  getBlockStats: (blockId) => {
    return get().userStats.blockStats[blockId] || null;
  },

  getWeakTypes: () => {
    const { weakTypes } = get().userStats;
    return Object.entries(weakTypes)
      .map(([type, data]) => ({
        type: type as ObstacleType,
        errorRate: data.total > 0 ? 1 - data.correct / data.total : 0,
        total: data.total,
        correct: data.correct,
      }))
      .filter((d) => d.total > 0)
      .sort((a, b) => b.errorRate - a.errorRate);
  },

  getBlockAccuracy: (blockId) => {
    const sessions = get().sessions.filter((s) => s.blockId === blockId);
    if (sessions.length === 0) return 0;
    return sessions.reduce((sum, s) => sum + s.accuracy, 0) / sessions.length;
  },

  getSessionsByBlock: (blockId) => {
    return get().sessions
      .filter((s) => s.blockId === blockId)
      .sort((a, b) => b.endTime - a.endTime);
  },

  getWeakSegments: (blockId) => {
    const { blockStore } = get() as unknown as { blockStore: typeof import('./blockStore').useBlockStore };

    const block = blockStore.getState?.().blocks.find((b: { id: string }) => b.id === blockId);
    if (!block || !block.segments) return [];

    const segmentErrors: Record<string, { errors: number; total: number }> = {};
    block.segments.forEach((seg) => {
      segmentErrors[seg.id] = { errors: 0, total: 0 };
    });

    const sessions = get().sessions.filter((s) => s.blockId === blockId);
    sessions.forEach((session) => {
      session.clickRecords.forEach((record) => {
        const obstacle = block.obstacles.find((o: { id: string | null }) => o.id === record.obstacleId);
        if (obstacle?.segmentId && segmentErrors[obstacle.segmentId]) {
          segmentErrors[obstacle.segmentId].total += 1;
          if (!record.isCorrect) {
            segmentErrors[obstacle.segmentId].errors += 1;
          }
        }
      });
    });

    return Object.entries(segmentErrors)
      .filter(([, data]) => data.total > 0)
      .map(([segmentId, data]) => ({
        segmentId,
        errorRate: data.errors / data.total,
      }))
      .sort((a, b) => b.errorRate - a.errorRate);
  },

  clearStats: () => {
    set({ sessions: [], userStats: defaultStats });
    storage.remove(STORAGE_KEYS.SESSIONS);
    storage.remove(STORAGE_KEYS.STATS);
  },
}));
