import { create } from 'zustand';
import type { MedicalRecord, RevisionHistory } from '@shared/types';

interface AppState {
  records: MedicalRecord[];
  currentRecord: MedicalRecord | null;
  revisions: RevisionHistory[];
  loading: boolean;

  setRecords: (r: MedicalRecord[]) => void;
  setCurrentRecord: (r: MedicalRecord | null) => void;
  setRevisions: (r: RevisionHistory[]) => void;
  setLoading: (b: boolean) => void;
  updateFieldValue: (fieldId: string, newValue: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  records: [],
  currentRecord: null,
  revisions: [],
  loading: false,

  setRecords: (r) => set({ records: r }),
  setCurrentRecord: (r) => set({ currentRecord: r }),
  setRevisions: (r) => set({ revisions: r }),
  setLoading: (b) => set({ loading: b }),

  updateFieldValue: (fieldId, newValue) => {
    const { currentRecord } = get();
    if (!currentRecord) return;
    const updated = {
      ...currentRecord,
      extractions: currentRecord.extractions.map((f) =>
        f.id === fieldId ? { ...f, value: newValue } : f,
      ),
    };
    set({ currentRecord: updated });
  },
}));
