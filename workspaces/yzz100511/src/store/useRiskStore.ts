import { create } from 'zustand';
import type { RiskItem, ExhibitionObject, MallConfig } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { detectAllRisks } from '../utils/riskEngine';

interface RiskState {
  risks: RiskItem[];
  focusedRiskId: string | null;
  updateRisks: (objects: ExhibitionObject[], mall: MallConfig) => void;
  resolveRisk: (riskId: string) => void;
  focusRisk: (riskId: string | null) => void;
}

export const useRiskStore = create<RiskState>((set) => ({
  risks: [],
  focusedRiskId: null,
  updateRisks: (objects, mall) => {
    const newRisks = detectAllRisks(objects, mall);
    set({ risks: newRisks });
  },
  resolveRisk: (riskId) =>
    set((state) => ({
      risks: state.risks.map((r) =>
        r.id === riskId ? { ...r, resolved: true } : r
      ),
    })),
  focusRisk: (riskId) => set({ focusedRiskId: riskId }),
}));
