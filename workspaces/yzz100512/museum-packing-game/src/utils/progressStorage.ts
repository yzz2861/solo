import type { StudentProgress, MistakeRecord, MaterialType, PackingChoice, PackingResult, Level } from '../types';

const STORAGE_KEY = 'museum-packing-progress';

function getInitialProgress(): StudentProgress {
  return {
    totalAttempts: 0,
    correctCount: 0,
    mistakesByMaterial: {
      pottery: [],
      wood: [],
      metal: [],
    },
    levelProgress: {},
  };
}

export function loadProgress(): StudentProgress {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load progress:', e);
  }
  return getInitialProgress();
}

export function saveProgress(progress: StudentProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.error('Failed to save progress:', e);
  }
}

export function recordAttempt(
  progress: StudentProgress,
  level: Level,
  result: PackingResult,
  choice: PackingChoice
): StudentProgress {
  const newProgress: StudentProgress = JSON.parse(JSON.stringify(progress));

  newProgress.totalAttempts++;
  if (result.isCorrect) {
    newProgress.correctCount++;
  }

  const existingProgress = newProgress.levelProgress[level.id] || {
    completed: false,
    bestScore: 0,
    retryCount: 0,
  };

  const prevBest = existingProgress.bestScore;
  existingProgress.bestScore = Math.max(existingProgress.bestScore, result.score);
  if (result.score > prevBest && prevBest > 0) {
    existingProgress.retryCount++;
  } else if (!result.isCorrect) {
    existingProgress.retryCount++;
  }
  if (result.isCorrect) {
    existingProgress.completed = true;
  }

  newProgress.levelProgress[level.id] = existingProgress;

  if (!result.isCorrect && result.risks.length > 0) {
    const mistakeRecord: MistakeRecord = {
      id: `${level.id}-${Date.now()}`,
      levelId: level.id,
      artifactId: level.artifact.id,
      artifactName: level.artifact.name,
      material: level.artifact.material,
      timestamp: Date.now(),
      mistakes: result.risks,
      retryCount: existingProgress.retryCount,
      userSolution: choice,
    };

    const material = level.artifact.material;
    if (!newProgress.mistakesByMaterial[material]) {
      newProgress.mistakesByMaterial[material] = [];
    }

    const existingIndex = newProgress.mistakesByMaterial[material].findIndex(
      m => m.levelId === level.id
    );
    if (existingIndex >= 0) {
      newProgress.mistakesByMaterial[material][existingIndex] = mistakeRecord;
    } else {
      newProgress.mistakesByMaterial[material].push(mistakeRecord);
    }
  }

  newProgress.lastPracticeTime = Date.now();

  return newProgress;
}

export function getMistakesByMaterial(
  progress: StudentProgress,
  material: MaterialType
): MistakeRecord[] {
  return progress.mistakesByMaterial[material] || [];
}

export function getTotalMistakes(progress: StudentProgress): number {
  return Object.values(progress.mistakesByMaterial).reduce(
    (sum, arr) => sum + arr.length,
    0
  );
}

export function getAccuracyRate(progress: StudentProgress): number {
  if (progress.totalAttempts === 0) return 0;
  return Math.round((progress.correctCount / progress.totalAttempts) * 100);
}

export function resetProgress(): StudentProgress {
  const initial = getInitialProgress();
  saveProgress(initial);
  return initial;
}
