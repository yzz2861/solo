import { create } from 'zustand'
import type { PracticeRecord, UserRole, VoiceRange, PracticeMark, PitchFrame, NoteAnalysis, AnomalyWarning, ScaleDefinition } from '@/types'
import { v4 as uuid } from 'uuid'
import { decodeAudioFile, detectPitchFrames, analyzeNotes, detectAnomalies, computeOverallScore } from '@/utils/pitchDetection'
import { savePracticeRecord, saveAudioBlob, getAllPracticeRecords, getAudioBlob, deletePracticeRecord, savePracticeMark, getPracticeMarks, deletePracticeMark } from '@/utils/db'

interface AppState {
  role: UserRole
  voiceRange: VoiceRange
  currentRecord: PracticeRecord | null
  allRecords: PracticeRecord[]
  audioBuffer: AudioBuffer | null
  audioBlob: Blob | null
  audioUrl: string | null
  selectedScale: ScaleDefinition | null
  pitchFrames: PitchFrame[]
  noteAnalyses: NoteAnalysis[]
  anomalies: AnomalyWarning[]
  marks: PracticeMark[]
  pendingMarks: PracticeMark[]
  isAnalyzing: boolean
  playbackTime: number
  zoomLevel: number

  setRole: (role: UserRole) => void
  setVoiceRange: (range: VoiceRange) => void
  setSelectedScale: (scale: ScaleDefinition) => void
  uploadAudio: (file: File) => Promise<void>
  runAnalysis: () => Promise<void>
  saveCurrentRecord: (studentName: string) => Promise<void>
  loadAllRecords: () => Promise<void>
  deleteRecord: (id: string) => Promise<void>
  addMark: (startTime: number, endTime: number, label: string, color: string) => Promise<void>
  removeMark: (markId: string) => Promise<void>
  loadMarks: (recordId: string) => Promise<void>
  loadAudioForRecord: (record: PracticeRecord) => Promise<void>
  setPlaybackTime: (time: number) => void
  setZoomLevel: (level: number) => void
  reset: () => void
  playSegment: (startTime: number, endTime: number) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  role: 'teacher',
  voiceRange: 'female',
  currentRecord: null,
  allRecords: [],
  audioBuffer: null,
  audioBlob: null,
  audioUrl: null,
  selectedScale: null,
  pitchFrames: [],
  noteAnalyses: [],
  anomalies: [],
  marks: [],
  pendingMarks: [],
  isAnalyzing: false,
  playbackTime: 0,
  zoomLevel: 1,

  setRole: (role) => set({ role }),
  setVoiceRange: (voiceRange) => set({ voiceRange }),
  setSelectedScale: (scale) => set({ selectedScale: scale }),

  uploadAudio: async (file: File) => {
    set({ isAnalyzing: true })
    try {
      const blob = new Blob([await file.arrayBuffer()], { type: file.type })
      const url = URL.createObjectURL(blob)
      const audioBuffer = await decodeAudioFile(file)
      set({ audioBuffer, audioBlob: blob, audioUrl: url, pitchFrames: [], noteAnalyses: [], anomalies: [], marks: [], pendingMarks: [] })
    } finally {
      set({ isAnalyzing: false })
    }
  },

  runAnalysis: async () => {
    const { audioBuffer, selectedScale, voiceRange } = get()
    if (!audioBuffer || !selectedScale) return

    set({ isAnalyzing: true })
    try {
      const pitchFrames = detectPitchFrames(audioBuffer)
      const noteAnalyses = analyzeNotes(pitchFrames, selectedScale.notes, audioBuffer.duration)
      const anomalies = detectAnomalies(audioBuffer, pitchFrames, voiceRange)
      set({ pitchFrames, noteAnalyses, anomalies })
    } finally {
      set({ isAnalyzing: false })
    }
  },

  saveCurrentRecord: async (studentName: string) => {
    const { audioBlob, selectedScale, pitchFrames, noteAnalyses, anomalies, marks, pendingMarks } = get()
    if (!audioBlob || !selectedScale) return

    const audioBlobKey = `audio-${uuid()}`
    await saveAudioBlob(audioBlobKey, audioBlob)

    const overallScore = computeOverallScore(noteAnalyses)
    const recordId = uuid()
    const allMarks = [...pendingMarks, ...marks.filter((m) => !pendingMarks.some((pm) => pm.id === m.id))]

    const record: PracticeRecord = {
      id: recordId,
      date: new Date().toISOString(),
      studentName,
      audioBlobKey,
      scaleId: selectedScale.id,
      pitchFrames,
      noteAnalyses,
      anomalies,
      marks: allMarks,
      overallScore,
    }

    await savePracticeRecord(record)

    for (const mark of pendingMarks) {
      await savePracticeMark({ ...mark, recordId })
    }

    set({ currentRecord: record, marks: allMarks, pendingMarks: [] })
    await get().loadAllRecords()
  },

  loadAllRecords: async () => {
    const allRecords = await getAllPracticeRecords()
    set({ allRecords })
  },

  deleteRecord: async (id: string) => {
    await deletePracticeRecord(id)
    await get().loadAllRecords()
  },

  addMark: async (startTime: number, endTime: number, label: string, color: string) => {
    const { currentRecord, pendingMarks, marks } = get()
    const mark: PracticeMark = {
      id: uuid(),
      startTime,
      endTime,
      label,
      color,
      createdBy: 'teacher',
    }

    if (currentRecord) {
      await savePracticeMark({ ...mark, recordId: currentRecord.id })
      const dbMarks = await getPracticeMarks(currentRecord.id)
      set({ marks: dbMarks, pendingMarks: [] })
    } else {
      set({ pendingMarks: [...pendingMarks, mark], marks: [...marks, mark] })
    }
  },

  removeMark: async (markId: string) => {
    const { currentRecord, pendingMarks, marks } = get()
    if (currentRecord) {
      await deletePracticeMark(markId)
      const dbMarks = await getPracticeMarks(currentRecord.id)
      set({ marks: dbMarks, pendingMarks: [] })
    } else {
      set({
        pendingMarks: pendingMarks.filter((m) => m.id !== markId),
        marks: marks.filter((m) => m.id !== markId),
      })
    }
  },

  loadMarks: async (recordId: string) => {
    const marks = await getPracticeMarks(recordId)
    set({ marks })
  },

  loadAudioForRecord: async (record: PracticeRecord) => {
    const blob = await getAudioBlob(record.audioBlobKey)
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const file = new File([blob], 'audio.wav', { type: blob.type })
    const audioBuffer = await decodeAudioFile(file)
    const dbMarks = await getPracticeMarks(record.id)
    set({
      currentRecord: record,
      audioBuffer,
      audioBlob: blob,
      audioUrl: url,
      pitchFrames: record.pitchFrames,
      noteAnalyses: record.noteAnalyses,
      anomalies: record.anomalies,
      marks: dbMarks,
      pendingMarks: [],
    })
  },

  setPlaybackTime: (time) => set({ playbackTime: time }),
  setZoomLevel: (level) => set({ zoomLevel: level }),

  reset: () => {
    const { audioUrl } = get()
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    set({
      currentRecord: null,
      audioBuffer: null,
      audioBlob: null,
      audioUrl: null,
      pitchFrames: [],
      noteAnalyses: [],
      anomalies: [],
      marks: [],
      pendingMarks: [],
      playbackTime: 0,
    })
  },

  playSegment: (startTime: number, endTime: number) => {
    const { audioBuffer } = get()
    if (!audioBuffer) return

    const ctx = new AudioContext()
    const source = ctx.createBufferSource()
    source.buffer = audioBuffer
    source.connect(ctx.destination)
    source.start(0, startTime, endTime - startTime)
    source.onended = () => ctx.close()
  },
}))
