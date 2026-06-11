import { create } from 'zustand';
import type {
  StoneColor,
  Position,
  MoveRecord,
  StoneGroup,
  GameState,
  ExplanationState,
  Problem,
  ErrorType,
} from '@/types';
import {
  copyBoard,
  getAllGroups,
  simulateMove,
  isForbiddenMove,
  analyzeErrorType,
  getLibertyChanges,
  generateChildFriendlyExplanation,
} from '@/utils/goLogic';

interface GameStore extends GameState {
  currentProblem: Problem | null;
  explanation: ExplanationState;
  showLiberties: boolean;
  isAnimating: boolean;
  lastCapturedStones: Position[];
  setCurrentProblem: (problem: Problem | null) => void;
  resetGame: (boardSize: number, initialBoard: StoneColor[][], playerColor: StoneColor) => void;
  makeMove: (pos: Position) => Promise<{ isCorrect: boolean; errorType?: ErrorType }>;
  undoMove: () => void;
  redoMove: () => void;
  resetToInitial: () => void;
  setShowLiberties: (show: boolean) => void;
  setExplanation: (explanation: Partial<ExplanationState>) => void;
  hideExplanation: () => void;
  setIsAnimating: (animating: boolean) => void;
  goToMove: (index: number) => void;
}

const initialGameState: GameState = {
  board: [],
  boardSize: 7,
  currentPlayer: 'black',
  moveHistory: [],
  currentMoveIndex: -1,
  stoneGroups: [],
  capturedStones: [],
  lastMove: null,
  isGameOver: false,
  winner: null,
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialGameState,
  currentProblem: null,
  explanation: {
    show: false,
    type: 'info',
    title: '',
    message: '',
  },
  showLiberties: true,
  isAnimating: false,
  lastCapturedStones: [],

  setCurrentProblem: (problem) => {
    set({ currentProblem: problem });
  },

  resetGame: (boardSize, initialBoard, playerColor) => {
    const board = copyBoard(initialBoard);
    const stoneGroups = getAllGroups(board, boardSize);
    
    set({
      ...initialGameState,
      board,
      boardSize,
      currentPlayer: playerColor,
      stoneGroups,
      explanation: {
        show: false,
        type: 'info',
        title: '',
        message: '',
      },
      lastCapturedStones: [],
    });
  },

  makeMove: async (pos) => {
    const state = get();
    const { board, boardSize, currentPlayer, currentProblem, moveHistory, currentMoveIndex } = state;

    if (!currentProblem) {
      return { isCorrect: false };
    }

    const previousBoardState = moveHistory.length > 0 
      ? moveHistory[moveHistory.length - 1].boardState 
      : undefined;

    const forbiddenCheck = isForbiddenMove(board, pos, currentPlayer, boardSize, previousBoardState);
    
    if (forbiddenCheck.isForbidden) {
      const friendlyExp = generateChildFriendlyExplanation('forbidden-move', forbiddenCheck.reason);
      set({
        explanation: {
          show: true,
          type: 'forbidden',
          title: friendlyExp.title,
          message: friendlyExp.message,
        },
      });
      return { isCorrect: false, errorType: 'forbidden-move' };
    }

    const simulation = simulateMove(board, pos, currentPlayer, boardSize);
    if (!simulation.isValid) {
      const friendlyExp = generateChildFriendlyExplanation('forbidden-move', simulation.forbiddenReason);
      set({
        explanation: {
          show: true,
          type: 'forbidden',
          title: friendlyExp.title,
          message: friendlyExp.message,
        },
      });
      return { isCorrect: false, errorType: 'forbidden-move' };
    }

    const isCorrect = currentProblem.correctMoves.some(
      m => m.row === pos.row && m.col === pos.col
    );

    const newBoard = simulation.newBoard;
    const newStoneGroups = getAllGroups(newBoard, boardSize);
    const libertyChanges = getLibertyChanges(board, newBoard, boardSize);

    const newHistory = moveHistory.slice(0, currentMoveIndex + 1);
    const moveRecord: MoveRecord = {
      position: pos,
      color: currentPlayer,
      capturedStones: simulation.capturedStones,
      boardState: copyBoard(newBoard),
      previousBoardState: copyBoard(board),
      timestamp: Date.now(),
    };
    newHistory.push(moveRecord);

    set({
      board: newBoard,
      stoneGroups: newStoneGroups,
      moveHistory: newHistory,
      currentMoveIndex: newHistory.length - 1,
      lastMove: pos,
      lastCapturedStones: simulation.capturedStones,
    });

    if (isCorrect) {
      set({
        explanation: {
          show: true,
          type: 'success',
          title: '🎉 太棒了！',
          message: currentProblem.explanation,
          libertyChanges,
        },
      });
      return { isCorrect: true };
    } else {
      const errorAnalysis = analyzeErrorType(board, pos, currentPlayer, currentProblem, boardSize);
      const friendlyExp = generateChildFriendlyExplanation(errorAnalysis.errorType, errorAnalysis.explanation);
      
      set({
        explanation: {
          show: true,
          type: 'error',
          title: friendlyExp.title,
          message: friendlyExp.message,
          libertyChanges,
        },
      });
      
      return { isCorrect: false, errorType: errorAnalysis.errorType };
    }
  },

  undoMove: () => {
    const state = get();
    const { moveHistory, currentMoveIndex, boardSize } = state;
    
    if (currentMoveIndex <= 0) {
      if (currentMoveIndex === 0 && state.currentProblem) {
        set({
          board: copyBoard(state.currentProblem.initialBoard),
          stoneGroups: getAllGroups(state.currentProblem.initialBoard, boardSize),
          currentMoveIndex: -1,
          lastMove: null,
          lastCapturedStones: [],
          explanation: { show: false, type: 'info', title: '', message: '' },
        });
      }
      return;
    }

    const previousMove = moveHistory[currentMoveIndex - 1];
    const newBoard = previousMove ? copyBoard(previousMove.boardState) : copyBoard(state.currentProblem?.initialBoard || []);
    const newStoneGroups = getAllGroups(newBoard, boardSize);

    set({
      board: newBoard,
      stoneGroups: newStoneGroups,
      currentMoveIndex: currentMoveIndex - 1,
      lastMove: previousMove?.position || null,
      lastCapturedStones: previousMove?.capturedStones || [],
      explanation: { show: false, type: 'info', title: '', message: '' },
    });
  },

  redoMove: () => {
    const state = get();
    const { moveHistory, currentMoveIndex, boardSize } = state;
    
    if (currentMoveIndex >= moveHistory.length - 1) return;

    const nextMove = moveHistory[currentMoveIndex + 1];
    const newBoard = copyBoard(nextMove.boardState);
    const newStoneGroups = getAllGroups(newBoard, boardSize);

    set({
      board: newBoard,
      stoneGroups: newStoneGroups,
      currentMoveIndex: currentMoveIndex + 1,
      lastMove: nextMove.position,
      lastCapturedStones: nextMove.capturedStones,
    });
  },

  goToMove: (index) => {
    const state = get();
    const { moveHistory, boardSize, currentProblem } = state;
    
    if (index < -1 || index >= moveHistory.length) return;

    let newBoard: StoneColor[][];
    let lastMove: Position | null = null;
    let capturedStones: Position[] = [];

    if (index === -1) {
      newBoard = copyBoard(currentProblem?.initialBoard || []);
    } else {
      const move = moveHistory[index];
      newBoard = copyBoard(move.boardState);
      lastMove = move.position;
      capturedStones = move.capturedStones;
    }

    const newStoneGroups = getAllGroups(newBoard, boardSize);

    set({
      board: newBoard,
      stoneGroups: newStoneGroups,
      currentMoveIndex: index,
      lastMove,
      lastCapturedStones: capturedStones,
      explanation: { show: false, type: 'info', title: '', message: '' },
    });
  },

  resetToInitial: () => {
    const state = get();
    if (!state.currentProblem) return;

    state.resetGame(
      state.currentProblem.boardSize,
      state.currentProblem.initialBoard,
      state.currentProblem.playerColor
    );
  },

  setShowLiberties: (show) => {
    set({ showLiberties: show });
  },

  setExplanation: (explanation) => {
    set(state => ({
      explanation: { ...state.explanation, ...explanation, show: true },
    }));
  },

  hideExplanation: () => {
    set(state => ({
      explanation: { ...state.explanation, show: false },
    }));
  },

  setIsAnimating: (animating) => {
    set({ isAnimating: animating });
  },
}));
