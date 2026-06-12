import { create } from 'zustand'
import {
  ReviewRecord,
  SampleEntry,
  DilutionGroup,
  PlateData,
} from '@/utils/types'
import { generateId, parseDilution, convertToMl, calculateCfu, judgePlate } from '@/utils/cfuCalculator'

interface ReviewState {
  currentRecord: ReviewRecord | null
  records: ReviewRecord[]

  initRecord: (className: string, groupName: string, date: string, reviewerName: string, role: 'teacher' | 'technician') => void
  addSample: (name: string) => void
  removeSample: (sampleId: string) => void
  updateSampleName: (sampleId: string, name: string) => void
  addDilution: (sampleId: string) => void
  removeDilution: (sampleId: string, dilutionId: string) => void
  updateDilution: (sampleId: string, dilutionId: string, updates: Partial<DilutionGroup>) => void
  updatePlate: (sampleId: string, dilutionId: string, plateId: string, rawInput: string) => void
  runReview: () => void
  saveRecord: () => void
  deleteRecord: (recordId: string) => void
  loadRecords: () => void
  loadRecord: (record: ReviewRecord) => void
  clearCurrent: () => void
}

const STORAGE_KEY = 'cfu_review_records'

function createEmptyDilution(): DilutionGroup {
  return {
    id: generateId(),
    rawDilutionInput: '',
    dilutionValue: 0,
    dilutionDisplay: '',
    inoculationVolume: 1,
    volumeUnit: 'mL',
    inoculationVolumeMl: 1,
    plates: [createEmptyPlate(0), createEmptyPlate(1)],
  }
}

function createEmptyPlate(index: number): PlateData {
  return {
    id: generateId(),
    plateIndex: index,
    rawInput: '',
    colonyCount: null,
    status: 'no_data',
    reasonCode: 'NO_DATA',
    reasonText: '',
  }
}

function createEmptySample(name: string): SampleEntry {
  return {
    id: generateId(),
    sampleName: name,
    dilutions: [createEmptyDilution()],
    finalCfu: null,
    calculationNote: '',
    adoptedDilutionId: null,
  }
}

function enrichDilution(d: DilutionGroup): DilutionGroup {
  const parsed = parseDilution(d.rawDilutionInput)
  return {
    ...d,
    dilutionValue: parsed?.value ?? 0,
    dilutionDisplay: parsed?.display ?? '',
    inoculationVolumeMl: convertToMl(d.inoculationVolume, d.volumeUnit),
  }
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  currentRecord: null,
  records: [],

  initRecord: (className, groupName, date, reviewerName, role) => {
    set({
      currentRecord: {
        id: generateId(),
        className,
        groupName,
        reviewDate: date,
        reviewerName,
        role,
        samples: [createEmptySample('')],
        createdAt: Date.now(),
      },
    })
  },

  addSample: (name) => {
    const { currentRecord } = get()
    if (!currentRecord) return
    set({
      currentRecord: {
        ...currentRecord,
        samples: [...currentRecord.samples, createEmptySample(name)],
      },
    })
  },

  removeSample: (sampleId) => {
    const { currentRecord } = get()
    if (!currentRecord) return
    set({
      currentRecord: {
        ...currentRecord,
        samples: currentRecord.samples.filter(s => s.id !== sampleId),
      },
    })
  },

  updateSampleName: (sampleId, name) => {
    const { currentRecord } = get()
    if (!currentRecord) return
    set({
      currentRecord: {
        ...currentRecord,
        samples: currentRecord.samples.map(s =>
          s.id === sampleId ? { ...s, sampleName: name } : s
        ),
      },
    })
  },

  addDilution: (sampleId) => {
    const { currentRecord } = get()
    if (!currentRecord) return
    set({
      currentRecord: {
        ...currentRecord,
        samples: currentRecord.samples.map(s =>
          s.id === sampleId
            ? { ...s, dilutions: [...s.dilutions, createEmptyDilution()] }
            : s
        ),
      },
    })
  },

  removeDilution: (sampleId, dilutionId) => {
    const { currentRecord } = get()
    if (!currentRecord) return
    set({
      currentRecord: {
        ...currentRecord,
        samples: currentRecord.samples.map(s =>
          s.id === sampleId
            ? { ...s, dilutions: s.dilutions.filter(d => d.id !== dilutionId) }
            : s
        ),
      },
    })
  },

  updateDilution: (sampleId, dilutionId, updates) => {
    const { currentRecord } = get()
    if (!currentRecord) return
    set({
      currentRecord: {
        ...currentRecord,
        samples: currentRecord.samples.map(s =>
          s.id === sampleId
            ? {
                ...s,
                dilutions: s.dilutions.map(d => {
                  if (d.id !== dilutionId) return d
                  const merged = { ...d, ...updates }
                  return enrichDilution(merged)
                }),
              }
            : s
        ),
      },
    })
  },

  updatePlate: (sampleId, dilutionId, plateId, rawInput) => {
    const { currentRecord } = get()
    if (!currentRecord) return
    set({
      currentRecord: {
        ...currentRecord,
        samples: currentRecord.samples.map(s =>
          s.id === sampleId
            ? {
                ...s,
                dilutions: s.dilutions.map(d =>
                  d.id === dilutionId
                    ? {
                        ...d,
                        plates: d.plates.map(p => {
                          if (p.id !== plateId) return p
                          const judged = judgePlate(rawInput, p.plateIndex)
                          return { ...judged, id: p.id }
                        }),
                      }
                    : d
                ),
              }
            : s
        ),
      },
    })
  },

  runReview: () => {
    const { currentRecord } = get()
    if (!currentRecord) return
    const reviewed = {
      ...currentRecord,
      samples: currentRecord.samples.map(s => calculateCfu({ ...s })),
    }
    set({ currentRecord: reviewed })
  },

  saveRecord: () => {
    const { currentRecord, records } = get()
    if (!currentRecord) return
    const existing = records.findIndex(r => r.id === currentRecord.id)
    let newRecords: ReviewRecord[]
    if (existing >= 0) {
      newRecords = records.map(r => r.id === currentRecord.id ? currentRecord : r)
    } else {
      newRecords = [...records, currentRecord]
    }
    set({ records: newRecords })
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newRecords))
    } catch { /* ignore */ }
  },

  deleteRecord: (recordId) => {
    const { records } = get()
    const newRecords = records.filter(r => r.id !== recordId)
    set({ records: newRecords })
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newRecords))
    } catch { /* ignore */ }
  },

  loadRecords: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      if (data) {
        set({ records: JSON.parse(data) })
      }
    } catch { /* ignore */ }
  },

  loadRecord: (record) => {
    set({ currentRecord: record })
  },

  clearCurrent: () => {
    set({ currentRecord: null })
  },
}))
