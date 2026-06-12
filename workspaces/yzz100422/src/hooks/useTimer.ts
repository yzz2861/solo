import { useState, useEffect, useRef, useCallback } from 'react';

interface UseTimerProps {
  initialTime: number;
  autoStart?: boolean;
  onTick?: (timeRemaining: number) => void;
  onComplete?: () => void;
}

export function useTimer({ initialTime, autoStart = false, onTick, onComplete }: UseTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(initialTime);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (isRunning && !isPaused) return;
    setIsRunning(true);
    setIsPaused(false);
  }, [isRunning, isPaused]);

  const pause = useCallback(() => {
    if (!isRunning || isPaused) return;
    setIsPaused(true);
  }, [isRunning, isPaused]);

  const resume = useCallback(() => {
    if (!isRunning || !isPaused) return;
    setIsPaused(false);
  }, [isRunning, isPaused]);

  const reset = useCallback((newTime?: number) => {
    clearTimer();
    setTimeRemaining(newTime ?? initialTime);
    setIsRunning(false);
    setIsPaused(false);
  }, [clearTimer, initialTime]);

  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = window.setInterval(() => {
        setTimeRemaining((prev) => {
          const next = prev - 1;
          if (next <= 0) {
            clearTimer();
            setIsRunning(false);
            onComplete?.();
            return 0;
          }
          onTick?.(next);
          return next;
        });
      }, 1000);
    } else {
      clearTimer();
    }

    return clearTimer;
  }, [isRunning, isPaused, clearTimer, onTick, onComplete]);

  useEffect(() => {
    if (autoStart) {
      start();
    }
    return clearTimer;
  }, []);

  return {
    timeRemaining,
    isRunning,
    isPaused,
    start,
    pause,
    resume,
    reset,
    setTimeRemaining,
  };
}
