import { useEffect, useCallback, useRef } from 'react';
import { useObjectStore } from '../store/useObjectStore';
import { useRiskStore } from '../store/useRiskStore';
import { useMallStore } from '../store/useMallStore';

export const useRiskDetection = () => {
  const objects = useObjectStore((state) => state.objects);
  const config = useMallStore((state) => state.config);
  const updateRisks = useRiskStore((state) => state.updateRisks);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedUpdateRisks = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      updateRisks(objects, config);
    }, 300);
  }, [objects, config, updateRisks]);

  useEffect(() => {
    debouncedUpdateRisks();
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [debouncedUpdateRisks]);

  const forceUpdate = useCallback(() => {
    updateRisks(objects, config);
  }, [objects, config, updateRisks]);

  return {
    forceUpdate,
  };
};
