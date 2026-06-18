export interface NoteTarget {
  name: string
  frequency: number
  duration: number
}

export interface ScaleDefinition {
  id: string
  name: string
  notes: NoteTarget[]
}

export interface PitchFrame {
  time: number
  frequency: number
  confidence: number
}

export interface NoteAnalysis {
  noteName: string
  targetFreq: number
  actualFreq: number
  deviationCents: number
  jitter: number
  duration: number
  startTime: number
  endTime: number
}

export interface AnomalyWarning {
  type: 'noise' | 'accompaniment' | 'range_mismatch' | 'incomplete'
  severity: 'low' | 'medium' | 'high'
  message: string
  timeRange?: [number, number]
}

export interface PracticeMark {
  id: string
  startTime: number
  endTime: number
  label: string
  color: string
  createdBy: 'teacher'
}

export interface PracticeRecord {
  id: string
  date: string
  studentName: string
  audioBlobKey: string
  scaleId: string
  pitchFrames: PitchFrame[]
  noteAnalyses: NoteAnalysis[]
  anomalies: AnomalyWarning[]
  marks: PracticeMark[]
  overallScore: number
}

export type UserRole = 'teacher' | 'student'
export type VoiceRange = 'male' | 'female'
