import type { Casualty, StudentAnswer, MistakeItem, TriageLevel, LevelAccuracy } from '../types';

const LEVEL_ORDER: TriageLevel[] = ['red', 'yellow', 'green', 'black'];
const LEVEL_SCORES: Record<TriageLevel, number> = { red: 0, yellow: 1, green: 2, black: 3 };

export function calculateLevelDistance(level1: TriageLevel, level2: TriageLevel): number {
  return Math.abs(LEVEL_SCORES[level1] - LEVEL_SCORES[level2]);
}

export function calculateScore(
  casualties: Casualty[],
  answers: StudentAnswer[]
): {
  totalScore: number;
  accuracy: number;
  levelAccuracy: LevelAccuracy;
  mistakes: MistakeItem[];
} {
  const levelScoreWeight = 60;
  const priorityScoreWeight = 30;
  const specialScoreWeight = 10;
  
  let levelScore = 0;
  let priorityScore = 0;
  let specialScore = 0;
  
  const mistakes: MistakeItem[] = [];
  
  const levelCorrectCount: Record<TriageLevel, { correct: number; total: number }> = {
    red: { correct: 0, total: 0 },
    yellow: { correct: 0, total: 0 },
    green: { correct: 0, total: 0 },
    black: { correct: 0, total: 0 },
  };
  
  casualties.forEach(casualty => {
    const answer = answers.find(a => a.casualtyId === casualty.id);
    if (!answer) return;
    
    levelCorrectCount[casualty.correctLevel].total++;
    
    const levelDistance = calculateLevelDistance(answer.selectedLevel, casualty.correctLevel);
    
    if (levelDistance === 0) {
      levelCorrectCount[casualty.correctLevel].correct++;
    }
    
    if (levelDistance === 0) {
      levelScore += levelScoreWeight / casualties.length;
    } else if (levelDistance === 1) {
      levelScore += (levelScoreWeight / casualties.length) * 0.5;
    }
  });
  
  const sortedCorrect = [...casualties].sort((a, b) => {
    const levelDiff = LEVEL_SCORES[a.correctLevel] - LEVEL_SCORES[b.correctLevel];
    if (levelDiff !== 0) return levelDiff;
    return a.correctPriority - b.correctPriority;
  });
  
  const correctOrder = sortedCorrect.map(c => c.id);
  const studentOrder = answers
    .sort((a, b) => a.priority - b.priority)
    .map(a => a.casualtyId);
  
  let inversions = 0;
  const totalPairs = casualties.length * (casualties.length - 1) / 2;
  
  for (let i = 0; i < studentOrder.length; i++) {
    for (let j = i + 1; j < studentOrder.length; j++) {
      const idxI = correctOrder.indexOf(studentOrder[i]);
      const idxJ = correctOrder.indexOf(studentOrder[j]);
      if (idxI > idxJ) {
        inversions++;
      }
    }
  }
  
  if (totalPairs > 0) {
    priorityScore = priorityScoreWeight * (1 - inversions / totalPairs);
  }
  
  let specialCasesCount = 0;
  let correctSpecialCount = 0;
  
  casualties.forEach(casualty => {
    const answer = answers.find(a => a.casualtyId === casualty.id);
    if (!answer) return;
    
    const isSpecial = casualty.hasChronicDisease || casualty.isChild || casualty.deniesInjury;
    if (isSpecial) {
      specialCasesCount++;
      const levelDistance = calculateLevelDistance(answer.selectedLevel, casualty.correctLevel);
      if (levelDistance === 0) {
        correctSpecialCount++;
      }
    }
  });
  
  if (specialCasesCount > 0) {
    specialScore = specialScoreWeight * (correctSpecialCount / specialCasesCount);
  } else {
    specialScore = specialScoreWeight;
  }
  
  casualties.forEach(casualty => {
    const answer = answers.find(a => a.casualtyId === casualty.id);
    if (!answer) return;
    
    const levelDistance = calculateLevelDistance(answer.selectedLevel, casualty.correctLevel);
    const priorityWrong = Math.abs(
      correctOrder.indexOf(casualty.id) - studentOrder.indexOf(casualty.id)
    ) > 1;
    
    if (levelDistance > 0 || priorityWrong) {
      const misjudgedVitals: string[] = [];
      
      if (casualty.breathing !== 'normal' && answer.selectedLevel !== casualty.correctLevel) {
        misjudgedVitals.push('呼吸异常');
      }
      if (casualty.bleeding !== 'none' && casualty.bleeding !== 'minor') {
        misjudgedVitals.push('出血程度');
      }
      if (casualty.consciousness !== 'alert') {
        misjudgedVitals.push('意识状态');
      }
      if (casualty.hasChronicDisease) {
        misjudgedVitals.push('基础病影响');
      }
      if (casualty.isChild) {
        misjudgedVitals.push('儿童特殊情况');
      }
      if (casualty.deniesInjury) {
        misjudgedVitals.push('伤员否认伤情');
      }
      
      if (misjudgedVitals.length === 0) {
        misjudgedVitals.push('综合判断偏差');
      }
      
      let mistakeType: 'level' | 'priority' | 'both' = 'level';
      if (levelDistance > 0 && priorityWrong) {
        mistakeType = 'both';
      } else if (priorityWrong) {
        mistakeType = 'priority';
      }
      
      mistakes.push({
        casualtyId: casualty.id,
        casualtyName: casualty.name,
        correctLevel: casualty.correctLevel,
        studentLevel: answer.selectedLevel,
        correctPriority: correctOrder.indexOf(casualty.id) + 1,
        studentPriority: answer.priority,
        mistakeType,
        explanation: casualty.explanation,
        misjudgedVitals,
      });
    }
  });
  
  const levelAccuracy: LevelAccuracy = {
    red: levelCorrectCount.red.total > 0 
      ? Math.round((levelCorrectCount.red.correct / levelCorrectCount.red.total) * 100) 
      : 100,
    yellow: levelCorrectCount.yellow.total > 0 
      ? Math.round((levelCorrectCount.yellow.correct / levelCorrectCount.yellow.total) * 100) 
      : 100,
    green: levelCorrectCount.green.total > 0 
      ? Math.round((levelCorrectCount.green.correct / levelCorrectCount.green.total) * 100) 
      : 100,
    black: levelCorrectCount.black.total > 0 
      ? Math.round((levelCorrectCount.black.correct / levelCorrectCount.black.total) * 100) 
      : 100,
  };
  
  const totalCorrect = Object.values(levelCorrectCount).reduce((sum, lc) => sum + lc.correct, 0);
  const accuracy = Math.round((totalCorrect / casualties.length) * 100);
  
  return {
    totalScore: Math.round(levelScore + priorityScore + specialScore),
    accuracy,
    levelAccuracy,
    mistakes,
  };
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function getLevelLabel(level: TriageLevel): string {
  const labels: Record<TriageLevel, string> = {
    red: '红色 - 立即处理',
    yellow: '黄色 - 优先处理',
    green: '绿色 - 轻微',
    black: '黑色 - 期待',
  };
  return labels[level];
}

export function getLevelShortLabel(level: TriageLevel): string {
  const labels: Record<TriageLevel, string> = {
    red: '红色',
    yellow: '黄色',
    green: '绿色',
    black: '黑色',
  };
  return labels[level];
}

export function getLevelColorClass(level: TriageLevel): string {
  const colors: Record<TriageLevel, string> = {
    red: 'bg-red-500 text-white',
    yellow: 'bg-amber-500 text-white',
    green: 'bg-emerald-500 text-white',
    black: 'bg-gray-800 text-white',
  };
  return colors[level];
}

export function getLevelBorderClass(level: TriageLevel): string {
  const colors: Record<TriageLevel, string> = {
    red: 'border-red-500',
    yellow: 'border-amber-500',
    green: 'border-emerald-500',
    black: 'border-gray-800',
  };
  return colors[level];
}

export function getScenarioLabel(scenario: string): string {
  const labels: Record<string, string> = {
    daytime: '白天',
    night: '夜间',
    rainy: '雨天',
    crowded: '拥挤',
  };
  return labels[scenario] || scenario;
}

export function getDifficultyLabel(difficulty: string): string {
  const labels: Record<string, string> = {
    easy: '简单',
    medium: '中等',
    hard: '困难',
  };
  return labels[difficulty] || difficulty;
}

export function getDifficultyColor(difficulty: string): string {
  const colors: Record<string, string> = {
    easy: 'text-emerald-600 bg-emerald-50',
    medium: 'text-amber-600 bg-amber-50',
    hard: 'text-red-600 bg-red-50',
  };
  return colors[difficulty] || 'text-gray-600 bg-gray-50';
}
