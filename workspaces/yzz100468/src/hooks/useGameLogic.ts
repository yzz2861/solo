import { useState, useCallback, useRef, useEffect } from 'react';
import { ToothRegion, RegionDetail, REGION_ORDER, REGION_NAMES } from '@/types';
import { calculateScore } from '@/utils/scoring';
import { getRegionStartMessage, getRegionCompleteMessage } from '@/utils/feedback';
import { getRandomFeedback } from '@/utils/feedback';

interface UseGameLogicOptions {
  targetDuration: number;
  difficulty: 'easy' | 'normal' | 'hard';
  onComplete?: (result: GameResult) => void;
}

export interface GameResult {
  totalDuration: number;
  score: number;
  stars: number;
  regions: Record<ToothRegion, RegionDetail>;
  overallIssues: string[];
}

interface FeedbackItem {
  id: string;
  type: 'success' | 'warning' | 'info';
  message: string;
  timestamp: number;
}

const GRID_COLS = 8;
const GRID_ROWS = 3;

function createInitialRegions(targetPerRegion: number): Record<ToothRegion, RegionDetail> {
  const regions: Partial<Record<ToothRegion, RegionDetail>> = {};
  REGION_ORDER.forEach((region) => {
    regions[region] = {
      name: region,
      duration: 0,
      targetDuration: targetPerRegion,
      completed: false,
      cleanliness: 0,
      issues: [],
      cleanedCells: new Set<string>(),
    };
  });
  return regions as Record<ToothRegion, RegionDetail>;
}

function getCellKey(col: number, row: number): string {
  return `${col}-${row}`;
}

function positionToCell(x: number, y: number): { col: number; row: number } | null {
  if (x < 0 || x > 100 || y < 0 || y > 100) return null;
  const col = Math.floor((x / 100) * GRID_COLS);
  const row = Math.floor((y / 100) * GRID_ROWS);
  return { col: Math.min(col, GRID_COLS - 1), row: Math.min(row, GRID_ROWS - 1) };
}

export function useGameLogic(options: UseGameLogicOptions) {
  const { targetDuration, difficulty, onComplete } = options;
  
  const targetPerRegion = Math.floor(targetDuration / 4);
  
  const [currentRegionIndex, setCurrentRegionIndex] = useState(0);
  const [regions, setRegions] = useState<Record<ToothRegion, RegionDetail>>(
    () => createInitialRegions(targetPerRegion)
  );
  const [totalTime, setTotalTime] = useState(0);
  const [regionTime, setRegionTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [countdown, setCountdown] = useState(3);
  const [gamePhase, setGamePhase] = useState<'idle' | 'countdown' | 'playing' | 'completed'>('idle');
  
  const lastPositionRef = useRef<{ x: number; y: number } | null>(null);
  const lastCellRef = useRef<string | null>(null);
  const sameCellTimeRef = useRef(0);
  const lastFeedbackTimeRef = useRef(0);
  const intervalRef = useRef<number | null>(null);

  const currentRegion = REGION_ORDER[currentRegionIndex];

  const addFeedback = useCallback((type: FeedbackItem['type'], message: string) => {
    const now = Date.now();
    if (now - lastFeedbackTimeRef.current < 1500) return;
    lastFeedbackTimeRef.current = now;
    
    const id = now.toString();
    setFeedbacks((prev) => [...prev.slice(-2), { id, type, message, timestamp: now }]);
    
    setTimeout(() => {
      setFeedbacks((prev) => prev.filter((f) => f.id !== id));
    }, 2500);
  }, []);

  const handleBrushMove = useCallback((position: { x: number; y: number }, pressure: number) => {
    if (!isPlaying || isPaused) return;

    const cell = positionToCell(position.x, position.y);
    if (!cell) return;

    const cellKey = getCellKey(cell.col, cell.row);

    setRegions((prev) => {
      const region = { ...prev[currentRegion] };
      const newCleanedCells = new Set(region.cleanedCells);
      
      if (!newCleanedCells.has(cellKey)) {
        newCleanedCells.add(cellKey);
        region.cleanedCells = newCleanedCells;
        
        const totalCells = GRID_COLS * GRID_ROWS;
        const progress = newCleanedCells.size / totalCells;
        region.cleanliness = Math.min(Math.round(progress * 100), 100);
        
        if (region.cleanliness >= 90 && !region.completed) {
          region.completed = true;
        }
      }
      
      if (lastCellRef.current === cellKey) {
        sameCellTimeRef.current += 0.05;
        if (sameCellTimeRef.current > 2) {
          if (!region.issues.includes('来回蹭同一处')) {
            region.issues.push('来回蹭同一处');
          }
          addFeedback('warning', getRandomFeedback('sameSpot'));
          sameCellTimeRef.current = 0;
        }
      } else {
        sameCellTimeRef.current = 0;
        lastCellRef.current = cellKey;
      }
      
      return { ...prev, [currentRegion]: region };
    });

    if (pressure > 75) {
      setRegions((prev) => {
        const region = { ...prev[currentRegion] };
        if (!region.issues.includes('力度过大')) {
          region.issues.push('力度过大');
        }
        return { ...prev, [currentRegion]: region };
      });
      addFeedback('warning', getRandomFeedback('tooHard'));
    } else if (pressure < 20) {
      addFeedback('info', getRandomFeedback('tooLight'));
    } else {
      if (Math.random() < 0.02) {
        addFeedback('success', getRandomFeedback('good'));
      }
    }

    lastPositionRef.current = position;
  }, [isPlaying, isPaused, currentRegion, addFeedback]);

  const nextRegion = useCallback(() => {
    if (currentRegionIndex >= REGION_ORDER.length - 1) {
      setGamePhase('completed');
      setIsPlaying(false);
      
      const result = calculateScore(regions, totalTime, targetDuration);
      
      onComplete?.({
        totalDuration: totalTime,
        score: result.score,
        stars: result.stars,
        regions,
        overallIssues: result.overallIssues,
      });
      return;
    }

    const wasCompleted = regions[currentRegion].completed;
    
    if (!wasCompleted) {
      addFeedback('warning', getRandomFeedback('skipRegion'));
    } else {
      addFeedback('success', getRegionCompleteMessage(currentRegion));
    }

    const nextIndex = currentRegionIndex + 1;
    setCurrentRegionIndex(nextIndex);
    setRegionTime(0);
    lastCellRef.current = null;
    sameCellTimeRef.current = 0;
    
    const nextRegionName = REGION_ORDER[nextIndex];
    setTimeout(() => {
      addFeedback('info', getRegionStartMessage(nextRegionName));
    }, 500);
  }, [currentRegionIndex, currentRegion, regions, totalTime, targetDuration, onComplete, addFeedback]);

  const prevRegion = useCallback(() => {
    if (currentRegionIndex <= 0) return;
    setCurrentRegionIndex(currentRegionIndex - 1);
    setRegionTime(0);
    lastCellRef.current = null;
  }, [currentRegionIndex]);

  const startGame = useCallback(() => {
    setRegions(createInitialRegions(targetPerRegion));
    setCurrentRegionIndex(0);
    setTotalTime(0);
    setRegionTime(0);
    setCountdown(3);
    setGamePhase('countdown');
    setFeedbacks([]);
    lastCellRef.current = null;
    sameCellTimeRef.current = 0;
    
    let count = 3;
    const countdownInterval = setInterval(() => {
      count--;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(countdownInterval);
        setGamePhase('playing');
        setIsPlaying(true);
        setIsPaused(false);
        addFeedback('info', getRegionStartMessage('outer'));
      }
    }, 1000);
  }, [targetPerRegion, addFeedback]);

  const pauseGame = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resumeGame = useCallback(() => {
    setIsPaused(false);
  }, []);

  const endGame = useCallback(() => {
    setIsPlaying(false);
    setGamePhase('completed');
    
    const result = calculateScore(regions, totalTime, targetDuration);
    
    onComplete?.({
      totalDuration: totalTime,
      score: result.score,
      stars: result.stars,
      regions,
      overallIssues: result.overallIssues,
    });
  }, [regions, totalTime, targetDuration, onComplete]);

  const resetGame = useCallback(() => {
    setRegions(createInitialRegions(targetPerRegion));
    setCurrentRegionIndex(0);
    setTotalTime(0);
    setRegionTime(0);
    setIsPlaying(false);
    setIsPaused(false);
    setGamePhase('idle');
    setFeedbacks([]);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [targetPerRegion]);

  useEffect(() => {
    if (gamePhase !== 'playing' || isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = window.setInterval(() => {
      setTotalTime((t) => t + 0.05);
      setRegionTime((t) => t + 0.05);
    }, 50);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [gamePhase, isPaused]);

  useEffect(() => {
    if (gamePhase === 'playing' && !isPaused) {
      const region = regions[currentRegion];
      if (region.completed && regionTime >= region.targetDuration * 0.8) {
        // Optional: auto-advance or let user click
      }
    }
  }, [regions, currentRegion, regionTime, gamePhase, isPaused]);

  return {
    gamePhase,
    currentRegion,
    currentRegionIndex,
    regions,
    totalTime,
    regionTime,
    isPlaying,
    isPaused,
    feedbacks,
    countdown,
    startGame,
    pauseGame,
    resumeGame,
    endGame,
    resetGame,
    nextRegion,
    prevRegion,
    handleBrushMove,
    targetPerRegion,
    gridSize: { cols: GRID_COLS, rows: GRID_ROWS },
  };
}
