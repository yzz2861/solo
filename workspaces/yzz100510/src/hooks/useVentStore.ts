import { create } from "zustand";
import type { VentInput, VentResult } from "@/utils/ventCalc";
import type { FilterType, VolumeUnit, LengthUnit, DiameterUnit } from "@/utils/unitConv";

export type WindFeeling = "weak" | "moderate" | "strong";
export type NoiseFeeling = "quiet" | "acceptable" | "loud";
export type OdorImprovement = "none" | "partial" | "obvious";

export interface FeedbackRecord {
  id: string;
  ventInput: VentInput;
  ventResult: VentResult;
  windFeeling: WindFeeling;
  noiseFeeling: NoiseFeeling;
  odorImprovement: OdorImprovement;
  notes: string;
  createdAt: string;
}

interface VentStore {
  ventInput: VentInput;
  ventResult: VentResult | null;
  feedbackRecords: FeedbackRecord[];
  reportMode: "procurement" | "facility";

  setVentInput: (input: Partial<VentInput>) => void;
  setVentResult: (result: VentResult | null) => void;
  setReportMode: (mode: "procurement" | "facility") => void;
  addFeedback: (feedback: Omit<FeedbackRecord, "id" | "createdAt">) => void;
  loadFromStorage: () => void;
}

const defaultInput: VentInput = {
  roomVolume: 0,
  roomVolumeUnit: "m3" as VolumeUnit,
  airChangeRate: 8,
  ductLength: 0,
  ductLengthUnit: "m" as LengthUnit,
  ductDiameter: 200,
  ductDiameterUnit: "mm" as DiameterUnit,
  elbowCount: 0,
  filterType: "unknown" as FilterType,
  filterResistance: null,
  noiseLimit: 65,
  odorSource: "",
};

function loadFeedbackRecords(): FeedbackRecord[] {
  try {
    const data = localStorage.getItem("vent-feedback-records");
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveFeedbackRecords(records: FeedbackRecord[]) {
  localStorage.setItem("vent-feedback-records", JSON.stringify(records));
}

export const useVentStore = create<VentStore>((set) => ({
  ventInput: defaultInput,
  ventResult: null,
  feedbackRecords: loadFeedbackRecords(),
  reportMode: "procurement",

  setVentInput: (input) =>
    set((state) => ({
      ventInput: { ...state.ventInput, ...input },
    })),

  setVentResult: (result) => set({ ventResult: result }),

  setReportMode: (mode) => set({ reportMode: mode }),

  addFeedback: (feedback) =>
    set((state) => {
      const record: FeedbackRecord = {
        ...feedback,
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        createdAt: new Date().toISOString(),
      };
      const records = [record, ...state.feedbackRecords];
      saveFeedbackRecords(records);
      return { feedbackRecords: records };
    }),

  loadFromStorage: () => {
    set({ feedbackRecords: loadFeedbackRecords() });
  },
}));
