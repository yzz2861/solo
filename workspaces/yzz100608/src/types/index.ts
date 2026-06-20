export type CapacityUnit = 'mAh' | 'Wh';
export type CellType = 'LiPo' | 'Li-ion' | 'LiFePO4' | 'NiMH';

export interface BatterySpec {
  capacity: number;
  capacityUnit: CapacityUnit;
  nominalVoltage: number;
  seriesCount: number;
  cellType: CellType;
}

export type PhaseNameType = 'standby' | 'sampling' | 'wireless' | 'charging' | 'custom';
export type PowerUnit = 'W' | 'mW' | 'uW';
export type TimeUnit = 'ms' | 's' | 'min' | 'h';

export interface LoadPhase {
  id: string;
  name: PhaseNameType;
  customName?: string;
  power: number;
  powerUnit: PowerUnit;
  duration: number;
  durationUnit: TimeUnit;
  dutyCycle: number;
  worstCaseMultiplier: number;
  worstCaseDurationMultiplier: number;
}

export interface CorrectionFactors {
  conversionEfficiency: number;
  ambientTemperature: number;
  temperatureCoefficient: number;
  agingFactor: number;
  selfDischarge: number;
  designMargin: number;
}

export type AlertLevel = 'error' | 'warning' | 'info';

export interface ValidationAlert {
  id: string;
  level: AlertLevel;
  message: string;
  anchor: string;
}

export interface PhaseEnergyBreakdown {
  phaseId: string;
  phaseName: string;
  displayName: string;
  powerW: number;
  durationS: number;
  energyPerCycleJ: number;
  energyPerCycleWh: number;
  dutyCycle: number;
  avgPowerW: number;
  energyShare: number;
}

export interface EnduranceResult {
  typicalHours: number;
  worstCaseHours: number;
  availableCapacityWh_typical: number;
  availableCapacityWh_worst: number;
  avgPowerDrawW_typical: number;
  avgPowerDrawW_worst: number;
  phaseBreakdown_typical: PhaseEnergyBreakdown[];
  phaseBreakdown_worst: PhaseEnergyBreakdown[];
  temperatureDerating: number;
  efficiencyLoss: number;
  agingLoss: number;
  marginLoss: number;
  calculationSteps: string[];
  nominalCapacityWh: number;
  usableCapacityRatio: number;
}

export interface PhaseMeasurement {
  phaseId: string;
  measuredPower: number;
  measuredDuration: number;
}

export interface MeasurementRecord {
  id: string;
  date: string;
  measuredEnduranceHours: number;
  temperature: number;
  notes: string;
  phaseMeasurements: PhaseMeasurement[];
}

export interface PhaseDeviation {
  phaseId: string;
  phaseName: string;
  displayName: string;
  estimatedPowerW: number;
  measuredPowerW: number;
  powerDeviation: number;
  estimatedDurationS: number;
  measuredDurationS: number;
  durationDeviation: number;
  optimistic: boolean;
  impactScore: number;
}

export interface ComparisonResult {
  deviationPercent: number;
  phaseDeviations: PhaseDeviation[];
  mostOptimisticPhase: string | null;
  mostOptimisticPhaseName: string | null;
  totalOptimismScore: number;
  conclusion: string;
  recommendations: string[];
  measurementId: string;
}

export type ResultViewMode = 'pm' | 'engineering';

export interface AppState {
  battery: BatterySpec;
  phases: LoadPhase[];
  corrections: CorrectionFactors;
  measurements: MeasurementRecord[];
  selectedMeasurementId: string | null;
  alerts: ValidationAlert[];
  result: EnduranceResult | null;
  comparison: ComparisonResult | null;
  resultViewMode: ResultViewMode;

  setBattery: (b: Partial<BatterySpec>) => void;
  addPhase: (template?: Partial<LoadPhase>) => void;
  updatePhase: (id: string, patch: Partial<LoadPhase>) => void;
  removePhase: (id: string) => void;
  reorderPhases: (startIndex: number, endIndex: number) => void;
  setCorrections: (c: Partial<CorrectionFactors>) => void;
  addMeasurement: (m: Omit<MeasurementRecord, 'id' | 'date'>) => void;
  removeMeasurement: (id: string) => void;
  selectMeasurement: (id: string | null) => void;
  setResultViewMode: (mode: ResultViewMode) => void;
  dismissAlert: (id: string) => void;
  recompute: () => void;
  recomputeComparison: () => void;
  resetToDefaults: () => void;
}
