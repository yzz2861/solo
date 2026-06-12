import { create } from 'zustand';
import type {
  GameSession,
  ClickRecord,
  Obstacle,
  UserAnswer,
  Block,
} from '../types';
import { generateId, calculateObstacleScore } from '../utils/score';

interface GameState {
  blockId: string | null;
  sessionId: string | null;
  isPlaying: boolean;
  isPaused: boolean;
  startTime: number;
  timeRemaining: number;
  timeLimit: number;
  currentScore: number;
  foundObstacles: Map<string, ClickRecord>;
  falsePositiveClicks: ClickRecord[];
  selectedObstacle: Obstacle | null;
  showPanel: boolean;
  feedbackState: 'correct' | 'wrong' | null;
  lastScoreChange: number;

  startGame: (block: Block) => void;
  pauseGame: () => void;
  resumeGame: () => void;
  endGame: () => GameSession | null;
  selectObstacle: (obstacle: Obstacle | null) => void;
  submitAnswer: (obstacle: Obstacle, answer: UserAnswer) => {
    isCorrect: boolean;
    score: number;
    details: unknown;
  };
  submitFalsePositive: (x: number, y: number, answer: UserAnswer) => boolean;
  setTimeRemaining: (time: number) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  blockId: null,
  sessionId: null,
  isPlaying: false,
  isPaused: false,
  startTime: 0,
  timeRemaining: 0,
  timeLimit: 180,
  currentScore: 0,
  foundObstacles: new Map(),
  falsePositiveClicks: [],
  selectedObstacle: null,
  showPanel: false,
  feedbackState: null,
  lastScoreChange: 0,

  startGame: (block) => {
    const sessionId = generateId();
    set({
      blockId: block.id,
      sessionId,
      isPlaying: true,
      isPaused: false,
      startTime: Date.now(),
      timeRemaining: block.timeLimit,
      timeLimit: block.timeLimit,
      currentScore: 0,
      foundObstacles: new Map(),
      falsePositiveClicks: [],
      selectedObstacle: null,
      showPanel: false,
      feedbackState: null,
      lastScoreChange: 0,
    });
  },

  pauseGame: () => {
    set({ isPaused: true });
  },

  resumeGame: () => {
    set({ isPaused: false });
  },

  endGame: () => {
    const state = get();
    if (!state.blockId || !state.sessionId) return null;

    const { blockStore } = useGameStore.getState() as unknown as { blockStore: typeof import('./blockStore').useBlockStore };

    const session: GameSession = {
      id: state.sessionId,
      blockId: state.blockId,
      startTime: state.startTime,
      endTime: Date.now(),
      score: state.currentScore,
      correctCount: state.foundObstacles.size,
      missedCount: 0,
      falsePositiveCount: state.falsePositiveClicks.length,
      clickRecords: [...state.foundObstacles.values(), ...state.falsePositiveClicks],
      totalObstacles: 0,
      accuracy: 0,
    };

    set({ isPlaying: false });
    return session;
  },

  selectObstacle: (obstacle) => {
    if (!obstacle) {
      set({ selectedObstacle: null, showPanel: false, feedbackState: null });
      return;
    }

    const found = get().foundObstacles.has(obstacle.id);
    if (found) {
      set({ selectedObstacle: obstacle, showPanel: true, feedbackState: null });
    } else {
      set({ selectedObstacle: obstacle, showPanel: true, feedbackState: null });
    }
  },

  submitAnswer: (obstacle, answer) => {
    const result = calculateObstacleScore(obstacle, answer);
    const sessionId = get().sessionId || generateId();

    const clickRecord: ClickRecord = {
      id: generateId(),
      sessionId,
      obstacleId: obstacle.id,
      clickX: obstacle.x,
      clickY: obstacle.y,
      isCorrect: result.isCorrect,
      userAnswer: answer,
      correctAnswer: {
        canBypass: obstacle.canBypass,
        urgency: obstacle.urgency,
        contactDept: obstacle.contactDept,
      },
      timestamp: Date.now(),
      scoreChange: result.score,
      obstacleType: obstacle.type,
    };

    set((state) => {
      const newFound = new Map(state.foundObstacles);
      if (!obstacle.isFalsePositive) {
        newFound.set(obstacle.id, clickRecord);
      }
      return {
        currentScore: Math.max(0, state.currentScore + result.score),
        foundObstacles: newFound,
        feedbackState: result.isCorrect ? 'correct' : 'wrong',
        lastScoreChange: result.score,
        selectedObstacle: obstacle,
      };
    });

    return { isCorrect: result.isCorrect, score: result.score, details: result.details };
  },

  submitFalsePositive: (x, y, answer) => {
    const sessionId = get().sessionId || generateId();

    const isCorrect = answer.canBypass === null &&
      answer.urgency === null &&
      answer.contactDept === null;

    const scoreChange = isCorrect ? 50 : -20;

    const clickRecord: ClickRecord = {
      id: generateId(),
      sessionId,
      obstacleId: null,
      clickX: x,
      clickY: y,
      isCorrect,
      userAnswer: answer,
      timestamp: Date.now(),
      scoreChange,
    };

    set((state) => ({
      currentScore: Math.max(0, state.currentScore + scoreChange),
      falsePositiveClicks: [...state.falsePositiveClicks, clickRecord],
      feedbackState: isCorrect ? 'correct' : 'wrong',
      lastScoreChange: scoreChange,
    }));

    return isCorrect;
  },

  setTimeRemaining: (time) => {
    set({ timeRemaining: time });
  },

  resetGame: () => {
    set({
      blockId: null,
      sessionId: null,
      isPlaying: false,
      isPaused: false,
      startTime: 0,
      timeRemaining: 0,
      timeLimit: 180,
      currentScore: 0,
      foundObstacles: new Map(),
      falsePositiveClicks: [],
      selectedObstacle: null,
      showPanel: false,
      feedbackState: null,
      lastScoreChange: 0,
    });
  },
}));
