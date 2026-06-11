import type { StoneColor, Position, StoneGroup, ErrorType, Problem } from '@/types';

export const createEmptyBoard = (size: number): StoneColor[][] => {
  return Array(size).fill(null).map(() => Array(size).fill(null));
};

export const copyBoard = (board: StoneColor[][]): StoneColor[][] => {
  return board.map(row => [...row]);
};

export const boardsEqual = (board1: StoneColor[][], board2: StoneColor[][]): boolean => {
  if (board1.length !== board2.length) return false;
  for (let i = 0; i < board1.length; i++) {
    if (board1[i].length !== board2[i].length) return false;
    for (let j = 0; j < board1[i].length; j++) {
      if (board1[i][j] !== board2[i][j]) return false;
    }
  }
  return true;
};

export const isValidPosition = (pos: Position, boardSize: number): boolean => {
  return pos.row >= 0 && pos.row < boardSize && pos.col >= 0 && pos.col < boardSize;
};

export const getNeighbors = (pos: Position, boardSize: number): Position[] => {
  const directions = [
    { row: -1, col: 0 },
    { row: 1, col: 0 },
    { row: 0, col: -1 },
    { row: 0, col: 1 },
  ];
  return directions
    .map(d => ({ row: pos.row + d.row, col: pos.col + d.col }))
    .filter(p => isValidPosition(p, boardSize));
};

export const getGroup = (
  board: StoneColor[][],
  startPos: Position,
  boardSize: number
): StoneGroup | null => {
  const color = board[startPos.row][startPos.col];
  if (!color) return null;

  const visited = new Set<string>();
  const stones: Position[] = [];
  const liberties: Position[] = [];
  const libertiesSet = new Set<string>();

  const posKey = (p: Position) => `${p.row},${p.col}`;

  const queue: Position[] = [startPos];
  visited.add(posKey(startPos));

  while (queue.length > 0) {
    const current = queue.shift()!;
    stones.push(current);

    const neighbors = getNeighbors(current, boardSize);
    for (const neighbor of neighbors) {
      const key = posKey(neighbor);
      const neighborColor = board[neighbor.row][neighbor.col];

      if (neighborColor === null) {
        if (!libertiesSet.has(key)) {
          libertiesSet.add(key);
          liberties.push(neighbor);
        }
      } else if (neighborColor === color && !visited.has(key)) {
        visited.add(key);
        queue.push(neighbor);
      }
    }
  }

  return {
    stones,
    color,
    liberties,
    libertyCount: liberties.length,
  };
};

export const getAllGroups = (board: StoneColor[][], boardSize: number): StoneGroup[] => {
  const visited = new Set<string>();
  const groups: StoneGroup[] = [];
  const posKey = (p: Position) => `${p.row},${p.col}`;

  for (let row = 0; row < boardSize; row++) {
    for (let col = 0; col < boardSize; col++) {
      const key = posKey({ row, col });
      if (board[row][col] && !visited.has(key)) {
        const group = getGroup(board, { row, col }, boardSize);
        if (group) {
          groups.push(group);
          group.stones.forEach(s => visited.add(posKey(s)));
        }
      }
    }
  }

  return groups;
};

export const getGroupAtPosition = (
  board: StoneColor[][],
  pos: Position,
  boardSize: number
): StoneGroup | null => {
  if (!board[pos.row][pos.col]) return null;
  return getGroup(board, pos, boardSize);
};

export const getLibertyCount = (
  board: StoneColor[][],
  pos: Position,
  boardSize: number
): number => {
  const group = getGroupAtPosition(board, pos, boardSize);
  return group?.libertyCount ?? 0;
};

export const simulateMove = (
  board: StoneColor[][],
  pos: Position,
  color: StoneColor,
  boardSize: number
): {
  newBoard: StoneColor[][];
  capturedStones: Position[];
  isValid: boolean;
  forbiddenReason?: string;
} => {
  if (board[pos.row][pos.col] !== null) {
    return {
      newBoard: copyBoard(board),
      capturedStones: [],
      isValid: false,
      forbiddenReason: '这里已经有棋子了！',
    };
  }

  const newBoard = copyBoard(board);
  newBoard[pos.row][pos.col] = color;

  const opponentColor = color === 'black' ? 'white' : 'black';
  const capturedStones: Position[] = [];
  const capturedSet = new Set<string>();
  const posKey = (p: Position) => `${p.row},${p.col}`;

  const neighbors = getNeighbors(pos, boardSize);
  for (const neighbor of neighbors) {
    if (newBoard[neighbor.row][neighbor.col] === opponentColor) {
      const group = getGroupAtPosition(newBoard, neighbor, boardSize);
      if (group && group.libertyCount === 0) {
        group.stones.forEach(s => {
          const key = posKey(s);
          if (!capturedSet.has(key)) {
            capturedSet.add(key);
            capturedStones.push(s);
            newBoard[s.row][s.col] = null;
          }
        });
      }
    }
  }

  const ownGroup = getGroupAtPosition(newBoard, pos, boardSize);
  if (ownGroup && ownGroup.libertyCount === 0 && capturedStones.length === 0) {
    return {
      newBoard: copyBoard(board),
      capturedStones: [],
      isValid: false,
      forbiddenReason: '这里是禁入点！下在这里你的棋子会没有气，也提不到对方的棋子。',
    };
  }

  return {
    newBoard,
    capturedStones,
    isValid: true,
  };
};

export const isForbiddenMove = (
  board: StoneColor[][],
  pos: Position,
  color: StoneColor,
  boardSize: number,
  previousBoardState?: StoneColor[][]
): { isForbidden: boolean; reason?: string } => {
  if (board[pos.row][pos.col] !== null) {
    return { isForbidden: true, reason: '这里已经有棋子了！' };
  }

  const simulation = simulateMove(board, pos, color, boardSize);
  if (!simulation.isValid) {
    return { isForbidden: true, reason: simulation.forbiddenReason };
  }

  if (previousBoardState && boardsEqual(simulation.newBoard, previousBoardState)) {
    return { isForbidden: true, reason: '这里是打劫！不能马上提回来。' };
  }

  return { isForbidden: false };
};

export const analyzeErrorType = (
  board: StoneColor[][],
  pos: Position,
  color: StoneColor,
  problem: Problem,
  boardSize: number
): { errorType: ErrorType; explanation: string } => {
  const posKey = `${pos.row},${pos.col}`;
  if (problem.wrongExplanations?.[posKey]) {
    const customExp = problem.wrongExplanations[posKey];
    if (customExp.includes('气')) {
      return { errorType: 'liberty-misjudge', explanation: customExp };
    } else if (customExp.includes('贪吃') || customExp.includes('自己')) {
      return { errorType: 'greedy-capture', explanation: customExp };
    }
    return { errorType: 'wrong-position', explanation: customExp };
  }

  const forbiddenCheck = isForbiddenMove(board, pos, color, boardSize);
  if (forbiddenCheck.isForbidden) {
    return {
      errorType: 'forbidden-move',
      explanation: forbiddenCheck.reason || '这里是禁入点，不能下在这里。',
    };
  }

  const simulation = simulateMove(board, pos, color, boardSize);
  const ownGroup = getGroupAtPosition(simulation.newBoard, pos, boardSize);
  const ownLiberties = ownGroup?.libertyCount ?? 0;

  const opponentColor = color === 'black' ? 'white' : 'black';
  let opponentWasInAtari = false;
  let opponentStillInAtari = false;
  
  const originalGroups = getAllGroups(board, boardSize);
  for (const g of originalGroups) {
    if (g.color === opponentColor && g.libertyCount <= 1) {
      opponentWasInAtari = true;
      break;
    }
  }
  
  const newGroups = getAllGroups(simulation.newBoard, boardSize);
  for (const g of newGroups) {
    if (g.color === opponentColor && g.libertyCount <= 1) {
      opponentStillInAtari = true;
      break;
    }
  }

  if (opponentWasInAtari && !opponentStillInAtari && simulation.capturedStones.length === 0) {
    return {
      errorType: 'liberty-misjudge',
      explanation: '哎呀，你让对方被打吃的棋子跑掉了！仔细看看，下在哪里才能让对方没有气呢？',
    };
  }

  if (ownLiberties <= 1 && simulation.capturedStones.length === 0) {
    return {
      errorType: 'greedy-capture',
      explanation: '小心！下在这里你自己的棋子只剩一口气了，先确保自己安全再想吃子哦。',
    };
  }

  if (ownLiberties <= 1 && simulation.capturedStones.length > 0) {
    return {
      errorType: 'greedy-capture',
      explanation: '虽然吃到了子，但你自己的棋子也危险了！有时候不贪吃才是更聪明的选择。',
    };
  }

  const minDistance = Math.min(
    ...problem.correctMoves.map(correct => 
      Math.abs(pos.row - correct.row) + Math.abs(pos.col - correct.col)
    )
  );

  if (minDistance > 2) {
    return {
      errorType: 'wrong-position',
      explanation: '这步棋离要点有点远哦，再仔细看看题目要求，想想哪里才是关键位置。',
    };
  }

  return {
    errorType: 'liberty-misjudge',
    explanation: '气数计算还需要练习，试着数清楚每块棋子有几口气。',
  };
};

export const getLibertyChanges = (
  oldBoard: StoneColor[][],
  newBoard: StoneColor[][],
  boardSize: number
): { position: Position; before: number; after: number }[] => {
  const changes: { position: Position; before: number; after: number }[] = [];
  const oldGroups = getAllGroups(oldBoard, boardSize);
  const newGroups = getAllGroups(newBoard, boardSize);

  const groupKey = (group: StoneGroup) => 
    group.stones.map(s => `${s.row},${s.col}`).sort().join('|');

  const oldGroupMap = new Map<string, StoneGroup>();
  oldGroups.forEach(g => oldGroupMap.set(groupKey(g), g));

  for (const newGroup of newGroups) {
    const key = groupKey(newGroup);
    const oldGroup = oldGroupMap.get(key);
    if (oldGroup && oldGroup.libertyCount !== newGroup.libertyCount) {
      changes.push({
        position: newGroup.stones[0],
        before: oldGroup.libertyCount,
        after: newGroup.libertyCount,
      });
    }
  }

  return changes;
};

export const generateChildFriendlyExplanation = (
  errorType: ErrorType,
  details?: string
): { title: string; message: string } => {
  const explanations: Record<ErrorType, { title: string; messages: string[] }> = {
    'liberty-misjudge': {
      title: '💭 再数一数气',
      messages: [
        '别着急，先停下来数一数每块棋子有几口气~',
        '气就像棋子的小鼻子，没有气就不能呼吸啦！',
        '记住：先数气，再落子，就不会出错啦！',
      ],
    },
    'greedy-capture': {
      title: '⚠️ 别急着吃子',
      messages: [
        '先看看自己的棋有没有危险，保护好自己才能吃更多子哦！',
        '有时候放弃吃一颗子，能吃到更大的鱼呢~',
        '围棋就像打仗，要先保护好自己的大本营！',
      ],
    },
    'wrong-position': {
      title: '🔍 找对位置很重要',
      messages: [
        '再仔细看看，哪里才是最关键的位置呢？',
        '就像踢球要瞄准球门，下棋也要找对目标哦！',
        '提示：看看对方哪里气最少~',
      ],
    },
    'forbidden-move': {
      title: '🚫 这里不能下',
      messages: [
        '这里是禁入点哦！下在这里棋子会没有气的。',
        '围棋有个规则：不能自杀！让我们找个能活的地方吧。',
        '记住：如果下进去棋子没有气，也吃不到对方，就不能下！',
      ],
    },
  };

  const exp = explanations[errorType];
  const randomMessage = exp.messages[Math.floor(Math.random() * exp.messages.length)];
  
  return {
    title: exp.title,
    message: details || randomMessage,
  };
};
