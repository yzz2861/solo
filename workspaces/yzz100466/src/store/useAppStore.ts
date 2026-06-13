import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Bridge,
  Crack,
  CrackAlias,
  Measurement,
  MeasurementFormData,
  AnalysisResult,
  ThresholdConfig,
  DEFAULT_THRESHOLD,
  RiskLevel,
} from '../types';
import { MOCK_BRIDGES, MOCK_CRACKS, MOCK_CRACK_ALIASES, MOCK_MEASUREMENTS } from '../data/mockData';
import { parseWidthInput, ConversionResult } from '../services/unitConverter';
import { detectAnomalies } from '../services/anomalyDetector';
import { analyzeGrowthTrend } from '../services/trendAnalysis';
import { checkThresholds } from '../services/thresholdCheck';
import { generateId } from '../utils/date';

interface AppState {
  bridges: Bridge[];
  cracks: Crack[];
  crackAliases: CrackAlias[];
  measurements: Measurement[];
  threshold: ThresholdConfig;
  selectedCrackId: string | null;
  selectedBridgeId: string | null;
  
  addBridge: (bridge: Omit<Bridge, 'id'>) => void;
  addCrack: (crack: Omit<Crack, 'id'>) => void;
  addCrackAlias: (alias: Omit<CrackAlias, 'id'>) => void;
  addMeasurement: (formData: MeasurementFormData) => { measurement: Measurement; conversion: ConversionResult } | null;
  setSelectedCrackId: (id: string | null) => void;
  setSelectedBridgeId: (id: string | null) => void;
  updateThreshold: (config: Partial<ThresholdConfig>) => void;
  
  getMeasurementsByCrackId: (crackId: string) => Measurement[];
  getCracksByBridgeId: (bridgeId: string) => Crack[];
  getCrackByCode: (code: string) => Crack | undefined;
  resolveCrackId: (code: string) => string | null;
  analyzeCrack: (crackId: string) => AnalysisResult | null;
  analyzeAllCracks: () => AnalysisResult[];
  getCracksByRiskLevel: (level: RiskLevel) => AnalysisResult[];
  resetData: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      bridges: MOCK_BRIDGES,
      cracks: MOCK_CRACKS,
      crackAliases: MOCK_CRACK_ALIASES,
      measurements: MOCK_MEASUREMENTS,
      threshold: DEFAULT_THRESHOLD,
      selectedCrackId: null,
      selectedBridgeId: null,

      addBridge: (bridge) => {
        const newBridge: Bridge = {
          ...bridge,
          id: generateId('bridge'),
        };
        set((state) => ({ bridges: [...state.bridges, newBridge] }));
      },

      addCrack: (crack) => {
        const newCrack: Crack = {
          ...crack,
          id: generateId('crack'),
        };
        set((state) => ({ cracks: [...state.cracks, newCrack] }));
      },

      addCrackAlias: (alias) => {
        const newAlias: CrackAlias = {
          ...alias,
          id: generateId('alias'),
        };
        set((state) => ({ crackAliases: [...state.crackAliases, newAlias] }));
      },

      addMeasurement: (formData) => {
        const state = get();
        const conversion = parseWidthInput(formData.widthInput);
        
        if (conversion.value <= 0) {
          return null;
        }

        const crackMeasurements = state
          .getMeasurementsByCrackId(formData.crackId)
          .sort((a, b) => new Date(a.measureDate).getTime() - new Date(b.measureDate).getTime());
        const previousMeasurement = crackMeasurements[crackMeasurements.length - 1] || null;

        const newMeasurement: Measurement = {
          id: generateId('meas'),
          crackId: formData.crackId,
          measureDate: formData.measureDate,
          widthRaw: conversion.value,
          widthUnit: conversion.unit,
          widthMm: conversion.convertedMm,
          temperature: formData.temperature,
          photoId: formData.photoId,
          photoAngle: formData.photoAngle,
          surveyor: formData.surveyor,
          rechecker: formData.rechecker,
          tool: formData.tool,
          notes: formData.notes,
          anomalies: [],
        };

        const { anomalies } = detectAnomalies(
          newMeasurement,
          previousMeasurement,
          state.threshold
        );

        if (conversion.wasAutoDetected && conversion.note) {
          anomalies.unshift({
            id: generateId('anom'),
            type: 'unit_conversion',
            description: conversion.note,
          });
        }

        newMeasurement.anomalies = anomalies;

        set((s) => ({ measurements: [...s.measurements, newMeasurement] }));

        return { measurement: newMeasurement, conversion };
      },

      setSelectedCrackId: (id) => set({ selectedCrackId: id }),
      setSelectedBridgeId: (id) => set({ selectedBridgeId: id }),

      updateThreshold: (config) => {
        set((state) => ({
          threshold: { ...state.threshold, ...config },
        }));
      },

      getMeasurementsByCrackId: (crackId) => {
        const state = get();
        return state.measurements
          .filter((m) => m.crackId === crackId)
          .sort((a, b) => new Date(a.measureDate).getTime() - new Date(b.measureDate).getTime());
      },

      getCracksByBridgeId: (bridgeId) => {
        return get().cracks.filter((c) => c.bridgeId === bridgeId);
      },

      getCrackByCode: (code) => {
        const state = get();
        const upperCode = code.toUpperCase();
        let crack = state.cracks.find((c) => c.code.toUpperCase() === upperCode);
        if (crack) return crack;

        const alias = state.crackAliases.find(
          (a) => a.oldCode.toUpperCase() === upperCode || a.newCode.toUpperCase() === upperCode
        );
        if (alias) {
          return state.cracks.find((c) => c.id === alias.crackId);
        }
        return undefined;
      },

      resolveCrackId: (code) => {
        const crack = get().getCrackByCode(code);
        return crack ? crack.id : null;
      },

      analyzeCrack: (crackId) => {
        const state = get();
        const crack = state.cracks.find((c) => c.id === crackId);
        if (!crack) return null;

        const bridge = state.bridges.find((b) => b.id === crack.bridgeId);
        if (!bridge) return null;

        const measurements = state.getMeasurementsByCrackId(crackId);
        if (measurements.length === 0) return null;

        const trend = analyzeGrowthTrend(measurements);
        const currentWidth = measurements[measurements.length - 1].widthMm;

        const growthRate = trend ? trend.growthRatePerQuarter : 0;
        const check = checkThresholds(growthRate, currentWidth, state.threshold);

        const warnings: string[] = [...check.warnings];
        measurements.forEach((m) => {
          m.anomalies.forEach((a) => {
            if (a.type === 'temp_diff' || a.type === 'width_fluctuation') {
              if (!warnings.includes(a.description)) {
                warnings.push(a.description);
              }
            }
          });
        });

        return {
          crackId: crack.id,
          crackCode: crack.code,
          bridgeName: bridge.name,
          bridgeId: bridge.id,
          location: crack.location,
          growthRate,
          rSquared: trend ? trend.rSquared : 0,
          currentWidth,
          predictedWidth: trend ? trend.predictedNextQuarter : currentWidth,
          firstMeasureDate: measurements[0].measureDate,
          lastMeasureDate: measurements[measurements.length - 1].measureDate,
          measureCount: measurements.length,
          riskLevel: check.riskLevel,
          warnings,
          measurements,
        };
      },

      analyzeAllCracks: () => {
        const state = get();
        return state.cracks
          .map((c) => state.analyzeCrack(c.id))
          .filter((r): r is AnalysisResult => r !== null);
      },

      getCracksByRiskLevel: (level) => {
        return get()
          .analyzeAllCracks()
          .filter((r) => r.riskLevel === level);
      },

      resetData: () => {
        set({
          bridges: MOCK_BRIDGES,
          cracks: MOCK_CRACKS,
          crackAliases: MOCK_CRACK_ALIASES,
          measurements: MOCK_MEASUREMENTS,
          threshold: DEFAULT_THRESHOLD,
        });
      },
    }),
    {
      name: 'bridge-crack-storage',
      partialize: (state) => ({
        bridges: state.bridges,
        cracks: state.cracks,
        crackAliases: state.crackAliases,
        measurements: state.measurements,
        threshold: state.threshold,
      }),
    }
  )
);
