export type StoneColor = 'black' | 'white' | null;

export interface Position {
  row: number;
  col: number;
}

export interface StoneGroup {
  stones: Position[];
  color: StoneColor;
  liberties: Position[];
  libertyCount: number;
}

export interface MoveRecord {
  position: Position;
  color: StoneColor;
  capturedStones: Position[];
  boardState: StoneColor[][];
  previousBoardState?: StoneColor[][];
  timestamp: number;
  explanation?: string;
}

export type ProblemType = 'capture' | 'atari' | 'escape' | 'forbidden' | 'double-atari';

export type ErrorType = 'liberty-misjudge' | 'greedy-capture' | 'wrong-position' | 'forbidden-move';

export interface Problem {
  id: string;
  type: ProblemType;
  title: string;
  description: string;
  difficulty: 1 | 2 | 3;
  boardSize: number;
  initialBoard: StoneColor[][];
  playerColor: StoneColor;
  correctMoves: Position[];
  forbiddenMoves: Position[];
  hint?: string;
  explanation: string;
  wrongExplanations?: Record<string, string>;
}

export interface Attempt {
  problemId: string;
  position: Position;
  isCorrect: boolean;
  errorType?: ErrorType;
  timestamp: number;
  explanation?: string;
}

export interface ProblemProgress {
  problemId: string;
  completed: boolean;
  attempts: Attempt[];
  lastAttempt: number | null;
  mastered: boolean;
  bestAttempt: boolean;
}

export interface PracticeReport {
  studentName?: string;
  date: string;
  totalProblems: number;
  completedProblems: number;
  accuracy: number;
  errorBreakdown: Record<ErrorType, number>;
  weakPoints: string[];
  suggestions: string[];
}

export type GameMode = 'student' | 'teacher';

export interface GameState {
  board: StoneColor[][];
  boardSize: number;
  currentPlayer: StoneColor;
  moveHistory: MoveRecord[];
  currentMoveIndex: number;
  stoneGroups: StoneGroup[];
  capturedStones: Position[];
  lastMove: Position | null;
  isGameOver: boolean;
  winner: StoneColor;
}

export interface ExplanationState {
  show: boolean;
  type: 'success' | 'error' | 'info' | 'forbidden';
  title: string;
  message: string;
  details?: string;
  libertyChanges?: {
    before: number;
    after: number;
    position: Position;
  }[];
}

export const problemTypeLabels: Record<ProblemType, string> = {
  'capture': '提子题',
  'atari': '打吃题',
  'escape': '逃子题',
  'forbidden': '禁入点识别',
  'double-atari': '双吃题',
};

export const errorTypeLabels: Record<ErrorType, string> = {
  'liberty-misjudge': '气数判断错误',
  'greedy-capture': '贪吃棋子',
  'wrong-position': '落子位置错误',
  'forbidden-move': '禁入点错误',
};

export const errorTypeDescriptions: Record<ErrorType, string> = {
  'liberty-misjudge': '没有正确数清对方或自己棋子的气数，需要多练习气的计算',
  'greedy-capture': '为了吃小棋而忽略了更大的危险，先看看自己的棋有没有危险',
  'wrong-position': '落子的位置不对，再想想哪里才是要点',
  'forbidden-move': '这里是禁入点，不能下在这里哦',
};
