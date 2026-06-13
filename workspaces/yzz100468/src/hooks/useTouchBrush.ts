import { useState, useRef, useCallback, useEffect } from 'react';

interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

interface UseTouchBrushOptions {
  elementRef: React.RefObject<HTMLElement>;
  onBrushMove?: (position: { x: number; y: number }, pressure: number) => void;
  onBrushStart?: (position: { x: number; y: number }) => void;
  onBrushEnd?: () => void;
  pressureSmoothing?: number;
}

export function useTouchBrush(options: UseTouchBrushOptions) {
  const { elementRef, onBrushMove, onBrushStart, onBrushEnd, pressureSmoothing = 0.3 } = options;
  
  const [isBrushing, setIsBrushing] = useState(false);
  const [brushPosition, setBrushPosition] = useState<{ x: number; y: number } | null>(null);
  const [pressure, setPressure] = useState(0);
  
  const lastPointsRef = useRef<TouchPoint[]>([]);
  const smoothedPressureRef = useRef(0);
  const lastCellRef = useRef<string | null>(null);
  const sameCellStartTimeRef = useRef<number>(0);

  const calculatePressure = useCallback((points: TouchPoint[]): number => {
    if (points.length < 2) return 50;
    
    let totalDistance = 0;
    let totalTime = 0;
    
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      totalDistance += Math.sqrt(dx * dx + dy * dy);
      totalTime += points[i].timestamp - points[i - 1].timestamp;
    }
    
    if (totalTime === 0) return 50;
    
    const speed = totalDistance / (totalTime / 1000);
    let pressureValue = Math.min(speed / 3, 100);
    
    return pressureValue;
  }, []);

  const getRelativePosition = useCallback((clientX: number, clientY: number) => {
    if (!elementRef.current) return { x: 0, y: 0 };
    const rect = elementRef.current.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    };
  }, [elementRef]);

  const handleStart = useCallback((clientX: number, clientY: number) => {
    const pos = getRelativePosition(clientX, clientY);
    setIsBrushing(true);
    setBrushPosition(pos);
    lastPointsRef.current = [{ x: pos.x, y: pos.y, timestamp: Date.now() }];
    smoothedPressureRef.current = 50;
    setPressure(50);
    sameCellStartTimeRef.current = Date.now();
    lastCellRef.current = null;
    onBrushStart?.(pos);
  }, [getRelativePosition, onBrushStart]);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isBrushing) return;
    
    const pos = getRelativePosition(clientX, clientY);
    setBrushPosition(pos);
    
    const now = Date.now();
    lastPointsRef.current.push({ x: pos.x, y: pos.y, timestamp: now });
    
    if (lastPointsRef.current.length > 10) {
      lastPointsRef.current.shift();
    }
    
    const rawPressure = calculatePressure(lastPointsRef.current);
    smoothedPressureRef.current = 
      smoothedPressureRef.current * (1 - pressureSmoothing) + 
      rawPressure * pressureSmoothing;
    
    setPressure(smoothedPressureRef.current);
    onBrushMove?.(pos, smoothedPressureRef.current);
  }, [isBrushing, getRelativePosition, calculatePressure, pressureSmoothing, onBrushMove]);

  const handleEnd = useCallback(() => {
    setIsBrushing(false);
    setBrushPosition(null);
    setPressure(0);
    lastPointsRef.current = [];
    onBrushEnd?.();
  }, [onBrushEnd]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      handleStart(e.clientX, e.clientY);
    };
    const onMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      handleMove(e.clientX, e.clientY);
    };
    const onMouseUp = () => handleEnd();
    const onMouseLeave = () => {
      if (isBrushing) handleEnd();
    };

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      handleStart(touch.clientX, touch.clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    };
    const onTouchEnd = () => handleEnd();

    element.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    element.addEventListener('mouseleave', onMouseLeave);
    
    element.addEventListener('touchstart', onTouchStart, { passive: false });
    element.addEventListener('touchmove', onTouchMove, { passive: false });
    element.addEventListener('touchend', onTouchEnd);

    return () => {
      element.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      element.removeEventListener('mouseleave', onMouseLeave);
      
      element.removeEventListener('touchstart', onTouchStart);
      element.removeEventListener('touchmove', onTouchMove);
      element.removeEventListener('touchend', onTouchEnd);
    };
  }, [elementRef, handleStart, handleMove, handleEnd, isBrushing]);

  const getPressureLevel = (p: number): 'too-light' | 'good' | 'too-hard' => {
    if (p < 25) return 'too-light';
    if (p > 75) return 'too-hard';
    return 'good';
  };

  return {
    isBrushing,
    brushPosition,
    pressure,
    pressureLevel: getPressureLevel(pressure),
    getPressureLevel,
  };
}
