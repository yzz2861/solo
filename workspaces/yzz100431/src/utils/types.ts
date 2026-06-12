export type PlateStatus = 'adopted' | 'rejected' | 'warning' | 'no_data'

export type ReasonCode =
  | ''
  | 'BELOW_RANGE'
  | 'ABOVE_RANGE'
  | 'TNTC'
  | 'BLANK_CONTAMINATED'
  | 'DUPLICATE_VARIANCE'
  | 'NO_DATA'

export type VolumeUnit = 'mL' | 'μL'

export type PlateRawInput = string

export interface PlateData {
  id: string
  plateIndex: number
  rawInput: PlateRawInput
  colonyCount: number | null
  status: PlateStatus
  reasonCode: ReasonCode
  reasonText: string
}

export interface DilutionGroup {
  id: string
  rawDilutionInput: string
  dilutionValue: number
  dilutionDisplay: string
  inoculationVolume: number
  volumeUnit: VolumeUnit
  inoculationVolumeMl: number
  plates: PlateData[]
}

export interface SampleEntry {
  id: string
  sampleName: string
  dilutions: DilutionGroup[]
  finalCfu: number | null
  calculationNote: string
  adoptedDilutionId: string | null
}

export interface ReviewRecord {
  id: string
  className: string
  groupName: string
  reviewDate: string
  reviewerName: string
  role: 'teacher' | 'technician'
  samples: SampleEntry[]
  createdAt: number
}

export const REASON_TEXT: Record<ReasonCode, string> = {
  '': '',
  BELOW_RANGE: '菌落数 < 30，低于可计数区间',
  ABOVE_RANGE: '菌落数 > 300，高于可计数区间',
  TNTC: '菌落太多无法计数 (TNTC)',
  BLANK_CONTAMINATED: '空白平板有污染',
  DUPLICATE_VARIANCE: '重复平板差异过大（>50%）',
  NO_DATA: '无数据',
}

export const PLATE_SPECIAL_VALUES = ['TNTC', '空白污染'] as const
export type PlateSpecialValue = (typeof PLATE_SPECIAL_VALUES)[number]
