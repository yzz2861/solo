import { useState, useEffect, useMemo } from 'react';
import type { DetectionResult } from '@/types';
import { runAllDetections } from '@/services/detectionService';
import { useSceneStore } from '@/store/useSceneStore';

export const useDetection = (shiftId: string | null) => {
  const [detections, setDetections] = useState<DetectionResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  
  const selectedShift = useSceneStore(state => 
    state.patrolShifts.find(s => s.id === shiftId)
  );
  
  const forbiddenZones = useSceneStore(state => state.forbiddenZones);
  
  useEffect(() => {
    if (!selectedShift || selectedShift.trajectoryPoints.length === 0) {
      setDetections([]);
      return;
    }
    
    setIsRunning(true);
    
    const timer = setTimeout(() => {
      const results = runAllDetections(
        selectedShift.trajectoryPoints,
        forbiddenZones,
        {
          maxInterval: 60,
          toleranceMs: 1000,
          minStayDuration: 180,
        }
      );
      
      setDetections(results);
      setIsRunning(false);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [shiftId, selectedShift, forbiddenZones]);
  
  const stats = useMemo(() => {
    const total = detections.length;
    const high = detections.filter(d => d.severity === 'high').length;
    const medium = detections.filter(d => d.severity === 'medium').length;
    const low = detections.filter(d => d.severity === 'low').length;
    
    const byType = {
      missing: detections.filter(d => d.type === 'missing').length,
      duplicate: detections.filter(d => d.type === 'duplicate').length,
      proximity: detections.filter(d => d.type === 'proximity').length,
      abnormalStay: detections.filter(d => d.type === 'abnormalStay').length,
    };
    
    return { total, high, medium, low, byType };
  }, [detections]);
  
  return {
    detections,
    isRunning,
    stats,
  };
};

export const useDetectionAtTime = (detections: DetectionResult[], currentTime: string | null) => {
  return useMemo(() => {
    if (!currentTime || detections.length === 0) return [];
    
    const current = new Date(currentTime).getTime();
    
    return detections.filter(d => {
      const detectionTime = new Date(d.timestamp).getTime();
      return Math.abs(current - detectionTime) < 5000;
    });
  }, [detections, currentTime]);
};
