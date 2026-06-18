import type { PitchFrame, NoteAnalysis, AnomalyWarning, NoteTarget, VoiceRange } from '@/types'

const FRAME_SIZE = 2048
const HOP_SIZE = 512
const MIN_FREQ = 80
const MAX_FREQ = 1000
const MIN_CONFIDENCE = 0.3

export async function decodeAudioFile(file: File): Promise<AudioBuffer> {
  const ctx = new AudioContext()
  const arrayBuffer = await file.arrayBuffer()
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
  await ctx.close()
  return audioBuffer
}

export function getChannelData(audioBuffer: AudioBuffer): Float32Array {
  return audioBuffer.getChannelData(0)
}

export function detectPitchFrames(audioBuffer: AudioBuffer): PitchFrame[] {
  const data = getChannelData(audioBuffer)
  const sampleRate = audioBuffer.sampleRate
  const frames: PitchFrame[] = []
  const totalFrames = Math.floor((data.length - FRAME_SIZE) / HOP_SIZE)

  for (let i = 0; i < totalFrames; i++) {
    const offset = i * HOP_SIZE
    const time = offset / sampleRate
    const freq = autocorrelation(data, offset, sampleRate)
    if (freq > 0) {
      const confidence = computeConfidence(data, offset, sampleRate, freq)
      frames.push({ time, frequency: freq, confidence })
    }
  }

  return frames
}

function autocorrelation(data: Float32Array, offset: number, sampleRate: number): number {
  const minLag = Math.floor(sampleRate / MAX_FREQ)
  const maxLag = Math.ceil(sampleRate / MIN_FREQ)
  const end = Math.min(offset + FRAME_SIZE, data.length)

  let maxVal = -Infinity
  let bestLag = minLag

  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0
    let count = 0
    for (let j = offset; j < end - lag; j++) {
      sum += data[j] * data[j + lag]
      count++
    }
    const val = count > 0 ? sum / count : 0
    if (val > maxVal) {
      maxVal = val
      bestLag = lag
    }
  }

  if (maxVal <= 0) return 0

  const refinedLag = parabolicInterpolation(data, offset, bestLag, end)
  const freq = sampleRate / refinedLag

  if (freq < MIN_FREQ || freq > MAX_FREQ) return 0
  return freq
}

function parabolicInterpolation(data: Float32Array, offset: number, lag: number, end: number): number {
  if (lag <= 0 || offset + lag + 1 >= end) return lag

  let s0 = 0, s1 = 0, s2 = 0
  let count = 0
  for (let j = offset; j < end - lag - 1; j++) {
    s0 += data[j] * data[j + lag - 1]
    s1 += data[j] * data[j + lag]
    s2 += data[j] * data[j + lag + 1]
    count++
  }
  if (count === 0) return lag

  s0 /= count
  s1 /= count
  s2 /= count

  const denom = 2 * s1 - s0 - s2
  if (Math.abs(denom) < 1e-10) return lag

  const shift = (s0 - s2) / (2 * denom)
  return lag + Math.max(-0.5, Math.min(0.5, shift))
}

function computeConfidence(data: Float32Array, offset: number, sampleRate: number, freq: number): number {
  const period = Math.round(sampleRate / freq)
  const end = Math.min(offset + FRAME_SIZE, data.length)
  if (offset + period * 2 >= end) return 0

  let sum1 = 0, sum2 = 0, count = 0
  for (let j = offset; j < end - period; j++) {
    sum1 += data[j] * data[j + period]
    sum2 += data[j] * data[j]
    count++
  }
  if (count === 0 || sum2 === 0) return 0
  return Math.min(1, sum1 / (count * Math.sqrt(sum2 / count)))
}

function findClosestNote(freq: number): { name: string; frequency: number; deviationCents: number } {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const semitones = 12 * Math.log2(freq / 440)
  const roundedSemitones = Math.round(semitones)
  const octave = Math.floor((roundedSemitones + 9) / 12) + 4
  const noteIdx = ((roundedSemitones + 9) % 12 + 12) % 12
  const noteFreq = 440 * Math.pow(2, roundedSemitones / 12)
  const deviationCents = 1200 * Math.log2(freq / noteFreq)

  return {
    name: `${noteNames[noteIdx]}${octave}`,
    frequency: noteFreq,
    deviationCents,
  }
}

export function analyzeNotes(
  pitchFrames: PitchFrame[],
  targetNotes: NoteTarget[],
  audioDuration: number
): NoteAnalysis[] {
  if (targetNotes.length === 0 || pitchFrames.length === 0) return []

  const analyses: NoteAnalysis[] = []
  const totalTargetDuration = targetNotes.reduce((s, n) => s + n.duration, 0)
  let currentTime = 0

  for (const target of targetNotes) {
    const noteStart = currentTime
    const noteEnd = noteStart + (target.duration / totalTargetDuration) * audioDuration

    const noteFrames = pitchFrames.filter(
      (f) => f.time >= noteStart && f.time < noteEnd && f.confidence > MIN_CONFIDENCE
    )

    if (noteFrames.length === 0) {
      analyses.push({
        noteName: target.name,
        targetFreq: target.frequency,
        actualFreq: 0,
        deviationCents: 0,
        jitter: 0,
        duration: noteEnd - noteStart,
        startTime: noteStart,
        endTime: noteEnd,
      })
      currentTime = noteEnd
      continue
    }

    const freqs = noteFrames.map((f) => f.frequency)
    const actualFreq = freqs.reduce((a, b) => a + b, 0) / freqs.length
    const deviationCents = 1200 * Math.log2(actualFreq / target.frequency)

    let jitterSum = 0
    for (let i = 1; i < freqs.length; i++) {
      jitterSum += Math.abs(freqs[i] - freqs[i - 1])
    }
    const jitter = freqs.length > 1 ? (jitterSum / (freqs.length - 1)) / actualFreq : 0

    analyses.push({
      noteName: target.name,
      targetFreq: target.frequency,
      actualFreq: Math.round(actualFreq * 100) / 100,
      deviationCents: Math.round(deviationCents * 10) / 10,
      jitter: Math.round(jitter * 10000) / 10000,
      duration: noteEnd - noteStart,
      startTime: noteStart,
      endTime: noteEnd,
    })

    currentTime = noteEnd
  }

  return analyses
}

export function detectAnomalies(
  audioBuffer: AudioBuffer,
  pitchFrames: PitchFrame[],
  voiceRange: VoiceRange
): AnomalyWarning[] {
  const warnings: AnomalyWarning[] = []
  const data = getChannelData(audioBuffer)
  const sampleRate = audioBuffer.sampleRate

  const frameEnergy: { time: number; energy: number }[] = []
  for (let i = 0; i < data.length; i += HOP_SIZE) {
    let sum = 0
    const end = Math.min(i + FRAME_SIZE, data.length)
    for (let j = i; j < end; j++) {
      sum += data[j] * data[j]
    }
    frameEnergy.push({ time: i / sampleRate, energy: sum / (end - i) })
  }

  const avgEnergy = frameEnergy.reduce((s, f) => s + f.energy, 0) / frameEnergy.length
  const silentFrames = frameEnergy.filter((f) => f.energy < avgEnergy * 0.01)
  if (silentFrames.length > frameEnergy.length * 0.3) {
    warnings.push({
      type: 'noise',
      severity: 'high',
      message: '音频信噪比较低，可能存在环境噪声干扰，音高检测结果可能不准确',
    })
  }

  const highFreqRatio = computeHighFrequencyRatio(data, sampleRate)
  if (highFreqRatio > 0.5) {
    warnings.push({
      type: 'accompaniment',
      severity: 'medium',
      message: '检测到较多高频成分，可能存在伴奏干扰，建议使用清唱录音',
    })
  }

  const validFrames = pitchFrames.filter((f) => f.confidence > MIN_CONFIDENCE)
  if (validFrames.length > 0) {
    const freqs = validFrames.map((f) => f.frequency)
    const minFreq = Math.min(...freqs)
    const maxFreq = Math.max(...freqs)

    const maleRange = { min: 80, max: 500 }
    const femaleRange = { min: 160, max: 1000 }
    const range = voiceRange === 'male' ? maleRange : femaleRange

    if (maxFreq > range.max * 1.2 || minFreq < range.min * 0.8) {
      warnings.push({
        type: 'range_mismatch',
        severity: 'medium',
        message: `检测到的音高范围 (${Math.round(minFreq)}-${Math.round(maxFreq)}Hz) 与设定的${voiceRange === 'male' ? '男声' : '女声'}音区不完全匹配，请确认音区设置`,
      })
    }
  }

  if (frameEnergy.length > 2) {
    const firstEnergy = frameEnergy[0].energy
    const lastEnergy = frameEnergy[frameEnergy.length - 1].energy
    const midEnergy = avgEnergy

    if (firstEnergy > midEnergy * 10 || lastEnergy > midEnergy * 10) {
      warnings.push({
        type: 'incomplete',
        severity: 'low',
        message: '音频开头或结尾存在能量突变，可能录音不完整',
      })
    }
  }

  return warnings
}

function computeHighFrequencyRatio(data: Float32Array, sampleRate: number): number {
  const fftSize = 2048
  const slice = data.slice(0, Math.min(fftSize, data.length))
  let lowEnergy = 0
  let highEnergy = 0
  const midBin = Math.floor(fftSize / 4)

  for (let i = 0; i < slice.length; i++) {
    const freq = (i * sampleRate) / fftSize
    const energy = slice[i] * slice[i]
    if (i < midBin) {
      lowEnergy += energy
    } else {
      highEnergy += energy
    }
  }

  return lowEnergy > 0 ? highEnergy / lowEnergy : 0
}

export function computeOverallScore(analyses: NoteAnalysis[]): number {
  if (analyses.length === 0) return 0
  const scoredAnalyses = analyses.filter((a) => a.actualFreq > 0)
  if (scoredAnalyses.length === 0) return 0

  const avgAbsDeviation = scoredAnalyses.reduce((s, a) => s + Math.abs(a.deviationCents), 0) / scoredAnalyses.length
  const avgJitter = scoredAnalyses.reduce((s, a) => s + a.jitter, 0) / scoredAnalyses.length

  const deviationScore = Math.max(0, 100 - avgAbsDeviation * 2)
  const jitterScore = Math.max(0, 100 - avgJitter * 5000)
  return Math.round((deviationScore * 0.7 + jitterScore * 0.3) * 10) / 10
}
