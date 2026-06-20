export type DisinfectantType = '84' | 'quaternary_ammonium' | 'alcohol'

export type ConcentrationUnit = '%' | 'mg/L'
export type VolumeUnit = 'mL' | 'L'

export interface ValidationResult {
  level: 'block' | 'warn' | 'info'
  message: string
  code: 'CONCENTRATION_OVERFLOW' | 'ALCOHOL_DILUTION' | 'CONTAINER_TOO_SMALL' | 'SCENARIO_MISMATCH' | 'MIXED_CONCENTRATION'
}

export interface DilutionRecord {
  id: string
  disinfectantType: DisinfectantType
  stockConcentration: number
  stockConcentrationUnit: ConcentrationUnit
  targetConcentration: number
  targetConcentrationUnit: ConcentrationUnit
  containerVolume: number
  containerVolumeUnit: VolumeUnit
  stockAmount: number
  stockAmountUnit: VolumeUnit
  waterAmount: number
  waterAmountUnit: VolumeUnit
  usageScenario: string
  createdAt: string
  operatorName: string
  recordType: 'print' | 'archive'
  warnings: string[]
}

export interface UsagePreset {
  id: string
  scenarioName: string
  recommendedType: DisinfectantType
  recommendedConcentration: number
  concentrationUnit: ConcentrationUnit
  description: string
}

export const DISINFECTANT_LABELS: Record<DisinfectantType, string> = {
  '84': '84消毒液',
  quaternary_ammonium: '季铵盐',
  alcohol: '酒精',
}

export const SCENARIO_COLORS: Record<string, string> = {
  '地面': 'bg-blue-100 text-blue-800',
  '门把手': 'bg-emerald-100 text-emerald-800',
  '垃圾点位': 'bg-amber-100 text-amber-800',
  '物表擦拭': 'bg-purple-100 text-purple-800',
}

export const DEFAULT_PRESETS: UsagePreset[] = [
  {
    id: '1',
    scenarioName: '地面',
    recommendedType: '84',
    recommendedConcentration: 500,
    concentrationUnit: 'mg/L',
    description: '地面日常消毒',
  },
  {
    id: '2',
    scenarioName: '门把手',
    recommendedType: 'alcohol',
    recommendedConcentration: 75,
    concentrationUnit: '%',
    description: '高频接触物表消毒',
  },
  {
    id: '3',
    scenarioName: '垃圾点位',
    recommendedType: '84',
    recommendedConcentration: 1000,
    concentrationUnit: 'mg/L',
    description: '垃圾区域加强消毒',
  },
  {
    id: '4',
    scenarioName: '物表擦拭',
    recommendedType: 'quaternary_ammonium',
    recommendedConcentration: 1000,
    concentrationUnit: 'mg/L',
    description: '一般物体表面擦拭消毒',
  },
]
