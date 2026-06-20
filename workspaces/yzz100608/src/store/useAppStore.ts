import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import {
  AppState,
  BatterySpec,
  CorrectionFactors,
  LoadPhase,
  MeasurementRecord,
  PhaseNameType,
  ResultViewMode,
  ValidationAlert,
} from '../types';
import {
  CELL_TEMP_COEFFICIENTS,
  CELL_VOLTAGES,
  DEFAULT_BATTERY,
  DEFAULT_CORRECTIONS,
  DEFAULT_PHASES,
  createDefaultPhase,
} from '../constants/defaults';
import { computeComparison, computeEndurance, validateInputs } from '../lib/calculator';

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      battery: { ...DEFAULT_BATTERY },
      phases: DEFAULT_PHASES.map((p) => ({ ...p, id: uuidv4() })),
      corrections: { ...DEFAULT_CORRECTIONS },
      measurements: [],
      selectedMeasurementId: null,
      alerts: [],
      result: null,
      comparison: null,
      resultViewMode: 'pm',

      setBattery: (b: Partial<BatterySpec>) => {
        set((state) => {
          const newBattery = { ...state.battery, ...b };
          if (b.cellType && !b.nominalVoltage) {
            newBattery.nominalVoltage = CELL_VOLTAGES[b.cellType];
          }
          if (b.cellType && !('temperatureCoefficient' in b)) {
            const newCorrections = {
              ...state.corrections,
              temperatureCoefficient: CELL_TEMP_COEFFICIENTS[b.cellType],
            };
            return { battery: newBattery, corrections: newCorrections };
          }
          return { battery: newBattery };
        });
        get().recompute();
      },

      addPhase: (template?: Partial<LoadPhase>) => {
        const name: PhaseNameType = (template?.name as PhaseNameType) || 'custom';
        const newPhase = createDefaultPhase(name);
        if (template) {
          Object.assign(newPhase, template, { id: uuidv4() });
        }
        set((state) => ({ phases: [...state.phases, newPhase] }));
        get().recompute();
      },

      updatePhase: (id: string, patch: Partial<LoadPhase>) => {
        set((state) => ({
          phases: state.phases.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        }));
        get().recompute();
      },

      removePhase: (id: string) => {
        set((state) => ({
          phases: state.phases.filter((p) => p.id !== id),
        }));
        get().recompute();
      },

      reorderPhases: (startIndex: number, endIndex: number) => {
        set((state) => {
          const result = Array.from(state.phases);
          const [removed] = result.splice(startIndex, 1);
          result.splice(endIndex, 0, removed);
          return { phases: result };
        });
      },

      setCorrections: (c: Partial<CorrectionFactors>) => {
        set((state) => ({
          corrections: { ...state.corrections, ...c },
        }));
        get().recompute();
      },

      addMeasurement: (m: Omit<MeasurementRecord, 'id' | 'date'>) => {
        const record: MeasurementRecord = {
          ...m,
          id: uuidv4(),
          date: new Date().toISOString().slice(0, 10),
        };
        set((state) => ({
          measurements: [record, ...state.measurements],
          selectedMeasurementId: record.id,
        }));
        get().recomputeComparison();
      },

      removeMeasurement: (id: string) => {
        set((state) => ({
          measurements: state.measurements.filter((m) => m.id !== id),
          selectedMeasurementId: state.selectedMeasurementId === id ? null : state.selectedMeasurementId,
          comparison: state.selectedMeasurementId === id ? null : state.comparison,
        }));
      },

      selectMeasurement: (id: string | null) => {
        set({ selectedMeasurementId: id });
        get().recomputeComparison();
      },

      setResultViewMode: (mode: ResultViewMode) => {
        set({ resultViewMode: mode });
      },

      dismissAlert: (id: string) => {
        set((state) => ({
          alerts: state.alerts.filter((a) => a.id !== id),
        }));
      },

      recompute: () => {
        const { battery, phases, corrections, selectedMeasurementId } = get();
        const newAlerts: ValidationAlert[] = validateInputs(battery, phases, corrections);
        const newResult = computeEndurance(battery, phases, corrections);

        set({ alerts: newAlerts, result: newResult });

        if (selectedMeasurementId) {
          get().recomputeComparison();
        }
      },

      recomputeComparison: () => {
        const { result, measurements, selectedMeasurementId, phases } = get();
        if (!result || !selectedMeasurementId) {
          set({ comparison: null });
          return;
        }
        const m = measurements.find((x) => x.id === selectedMeasurementId);
        if (!m) {
          set({ comparison: null });
          return;
        }
        const comp = computeComparison(result, m, phases);
        set({ comparison: comp });
      },

      resetToDefaults: () => {
        set({
          battery: { ...DEFAULT_BATTERY },
          phases: DEFAULT_PHASES.map((p) => ({ ...p, id: uuidv4() })),
          corrections: { ...DEFAULT_CORRECTIONS },
          measurements: [],
          selectedMeasurementId: null,
          comparison: null,
          resultViewMode: 'pm',
        });
        get().recompute();
      },
    }),
    {
      name: 'battery-endurance-estimator-v1',
      partialize: (state) => ({
        battery: state.battery,
        phases: state.phases,
        corrections: state.corrections,
        measurements: state.measurements,
        selectedMeasurementId: state.selectedMeasurementId,
        resultViewMode: state.resultViewMode,
      }),
    }
  )
);
