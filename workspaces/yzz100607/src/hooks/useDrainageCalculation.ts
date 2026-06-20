import { useEffect } from 'react';
import { useCalculationStore } from '@/store/useCalculationStore';
import { validateInput } from '@/utils/validation';
import { calculateDrainage } from '@/utils/calculation';

export function useDrainageCalculation() {
  const input = useCalculationStore((state) => state.input);
  const result = useCalculationStore((state) => state.result);
  const setResult = useCalculationStore((state) => state.calculate);

  useEffect(() => {
    const warnings = validateInput(input);
    const calcResult = calculateDrainage(input);
    useCalculationStore.setState({
      result: { ...calcResult, warnings },
    });
  }, [input]);

  const hasDangerWarning = result?.warnings.some((w) => w.level === 'danger');
  const hasWarning = result?.warnings.some((w) => w.level === 'warning');
  const hasInfo = result?.warnings.some((w) => w.level === 'info');

  return {
    input,
    result,
    calculate: setResult,
    hasDangerWarning,
    hasWarning,
    hasInfo,
  };
}
