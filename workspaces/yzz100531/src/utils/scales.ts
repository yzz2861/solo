import type { ScaleDefinition } from '@/types'

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

function noteFreq(name: string, octave: number): number {
  const idx = NOTE_NAMES.indexOf(name)
  const semitones = (octave - 4) * 12 + (idx - 9)
  return 440 * Math.pow(2, semitones / 12)
}

interface ScalePattern {
  id: string
  name: string
  intervals: number[]
}

const SCALE_PATTERNS: ScalePattern[] = [
  { id: 'major', name: '大调音阶', intervals: [0, 2, 4, 5, 7, 9, 11, 12] },
  { id: 'minor', name: '小调音阶', intervals: [0, 2, 3, 5, 7, 8, 10, 12] },
  { id: 'chromatic', name: '半音阶', intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
  { id: 'pentatonic', name: '五声音阶', intervals: [0, 2, 4, 7, 9, 12] },
  { id: 'arpeggio-major', name: '大调琶音', intervals: [0, 4, 7, 12, 7, 4, 0] },
  { id: 'arpeggio-minor', name: '小调琶音', intervals: [0, 3, 7, 12, 7, 3, 0] },
]

function buildScale(pattern: ScalePattern, startNote: string, startOctave: number, noteDuration: number = 1): ScaleDefinition {
  const startIdx = NOTE_NAMES.indexOf(startNote)
  const notes = pattern.intervals.map((interval) => {
    const totalSemitones = startIdx + interval
    const octaveOffset = Math.floor(totalSemitones / 12)
    const noteIdx = ((totalSemitones % 12) + 12) % 12
    const octave = startOctave + octaveOffset
    return {
      name: `${NOTE_NAMES[noteIdx]}${octave}`,
      frequency: noteFreq(NOTE_NAMES[noteIdx], octave),
      duration: noteDuration,
    }
  })
  return {
    id: `${pattern.id}-${startNote}${startOctave}`,
    name: `${pattern.name} (${startNote}${startOctave})`,
    notes,
  }
}

export function getAllScalePresets(): ScaleDefinition[] {
  const starts: [string, number][] = [
    ['C', 4], ['D', 4], ['E', 4], ['F', 4], ['G', 4], ['A', 4], ['B', 4],
    ['C', 3], ['C', 5],
  ]
  const presets: ScaleDefinition[] = []
  for (const pattern of SCALE_PATTERNS) {
    for (const [note, octave] of starts) {
      presets.push(buildScale(pattern, note, octave))
    }
  }
  return presets
}

export function buildCustomScale(noteNames: string[], startOctave: number, noteDuration: number = 1): ScaleDefinition {
  const notes = noteNames.map((name) => {
    const match = name.match(/^([A-G]#?)(\d)$/)
    if (!match) return null
    return {
      name,
      frequency: noteFreq(match[1], parseInt(match[2])),
      duration: noteDuration,
    }
  }).filter(Boolean) as { name: string; frequency: number; duration: number }[]
  return {
    id: `custom-${Date.now()}`,
    name: '自定义音阶',
    notes,
  }
}

export { NOTE_NAMES, noteFreq, SCALE_PATTERNS, buildScale }
