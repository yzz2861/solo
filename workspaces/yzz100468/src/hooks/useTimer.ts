import { useState, useRef, useCallback, useEffect } from 'react';

interface UseTimerOptions {
  initialTime?: number;
  onTick?: (time: number) => void;
  onComplete?: () => void;
  interval?: number;
}

export function useTimer(options: UseTimerOptions = {}) {
  const { initialTime = 0, onTick, onComplete, interval = 1000 } = options;
  const [time, setTime] = useState(initialTime);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const accumulatedTimeRef = useRef<number>(initialTime);

  const tick = useCallback(() => {
    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    const newTime = accumulatedTimeRef.current + elapsed;
    setTime(newTime);
    onTick?.(newTime);
  }, [onTick]);

  const start = useCallback(() => {
    if (isRunning) return;
    setIsRunning(true);
    startTimeRef.current = Date.now();
    intervalRef.current = window.setInterval(tick, interval);
  }, [isRunning, tick, interval]);

  const pause = useCallback(() => {
    if (!isRunning) return;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    accumulatedTimeRef.current = time;
    setIsRunning(false);
  }, [isRunning, time]);

  const reset = useCallback((newTime = initialTime) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setTime(newTime);
    accumulatedTimeRef.current = newTime;
    setIsRunning(false);
  }, [initialTime]);

  const resume = useCallback(() => {
    if (isRunning) return;
    setIsRunning(true);
    startTimeRef.current = Date.now();
    intervalRef.current = window.setInterval(tick, interval);
  }, [isRunning, tick, interval]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    time,
    isRunning,
    start,
    pause,
    reset,
    resume,
    setTime,
  };
}
