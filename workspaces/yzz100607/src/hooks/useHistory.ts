import { useEffect } from 'react';
import { useCalculationStore } from '@/store/useCalculationStore';

export function useHistory() {
  const records = useCalculationStore((state) => state.records);
  const loadAllRecords = useCalculationStore((state) => state.loadAllRecords);
  const loadRecord = useCalculationStore((state) => state.loadRecord);
  const removeRecord = useCalculationStore((state) => state.removeRecord);
  const setInputFromRecord = useCalculationStore((state) => state.setInputFromRecord);
  const exportDisclosure = useCalculationStore((state) => state.exportDisclosure);
  const saveRecord = useCalculationStore((state) => state.saveRecord);

  useEffect(() => {
    loadAllRecords();
  }, [loadAllRecords]);

  const rework = (recordId: string) => {
    const record = records.find((r) => r.id === recordId);
    if (record) {
      setInputFromRecord(record);
    }
  };

  return {
    records,
    loadRecord,
    removeRecord,
    rework,
    exportDisclosure,
    saveRecord,
  };
}
