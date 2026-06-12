import { DilutionGroup, PlateData, REASON_TEXT, VolumeUnit, SampleEntry } from './types'

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export function parseDilution(raw: string): { value: number; display: string } | null {
  if (!raw.trim()) return null

  const s = raw.trim()

  const cnMatch = s.match(/^10的?(-?\d+)次方$/)
  if (cnMatch) {
    const exp = parseInt(cnMatch[1], 10)
    const value = Math.pow(10, exp)
    return { value, display: formatDilutionDisplay(exp) }
  }

  const caretMatch = s.match(/^10\s*[\^]\s*(-?\d+)$/)
  if (caretMatch) {
    const exp = parseInt(caretMatch[1], 10)
    const value = Math.pow(10, exp)
    return { value, display: formatDilutionDisplay(exp) }
  }

  const dashMatch = s.match(/^10\s*[-–—]\s*(\d+)$/)
  if (dashMatch) {
    const exp = -parseInt(dashMatch[1], 10)
    const value = Math.pow(10, exp)
    return { value, display: formatDilutionDisplay(exp) }
  }

  const eMatch = s.match(/^10\s*[eE]\s*(-?\d+)$/)
  if (eMatch) {
    const exp = parseInt(eMatch[1], 10)
    const value = Math.pow(10, exp)
    return { value, display: formatDilutionDisplay(exp) }
  }

  const sciMatch = s.match(/^(\d+(?:\.\d+)?)\s*[eE]\s*(-?\d+)$/)
  if (sciMatch) {
    const value = parseFloat(sciMatch[1]) * Math.pow(10, parseInt(sciMatch[2], 10))
    const exp = parseInt(sciMatch[2], 10)
    return { value, display: formatDilutionDisplay(exp) }
  }

  const plainNum = parseFloat(s)
  if (!isNaN(plainNum) && plainNum > 0) {
    const exp = Math.round(Math.log10(plainNum))
    if (Math.abs(plainNum - Math.pow(10, exp)) < 1e-10) {
      return { value: plainNum, display: formatDilutionDisplay(exp) }
    }
    return { value: plainNum, display: plainNum.toExponential() }
  }

  return null
}

function formatDilutionDisplay(exp: number): string {
  const superscripts: Record<string, string> = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    '-': '⁻',
  }
  const expStr = String(exp).split('').map(c => superscripts[c] || c).join('')
  return `10${expStr}`
}

export function convertToMl(volume: number, unit: VolumeUnit): number {
  return unit === 'μL' ? volume / 1000 : volume
}

export function judgePlate(rawInput: string, plateIndex: number): PlateData {
  const id = generateId()
  const trimmed = rawInput.trim()

  if (!trimmed) {
    return {
      id,
      plateIndex,
      rawInput: trimmed,
      colonyCount: null,
      status: 'no_data',
      reasonCode: 'NO_DATA',
      reasonText: REASON_TEXT['NO_DATA'],
    }
  }

  if (trimmed.toUpperCase() === 'TNTC') {
    return {
      id,
      plateIndex,
      rawInput: trimmed,
      colonyCount: null,
      status: 'rejected',
      reasonCode: 'TNTC',
      reasonText: REASON_TEXT.TNTC,
    }
  }

  if (trimmed === '空白污染') {
    return {
      id,
      plateIndex,
      rawInput: trimmed,
      colonyCount: null,
      status: 'rejected',
      reasonCode: 'BLANK_CONTAMINATED',
      reasonText: REASON_TEXT.BLANK_CONTAMINATED,
    }
  }

  const count = parseFloat(trimmed)
  if (isNaN(count) || count < 0) {
    return {
      id,
      plateIndex,
      rawInput: trimmed,
      colonyCount: null,
      status: 'no_data',
      reasonCode: 'NO_DATA',
      reasonText: `无法识别输入: "${trimmed}"`,
    }
  }

  if (count < 30) {
    return {
      id,
      plateIndex,
      rawInput: trimmed,
      colonyCount: count,
      status: 'rejected',
      reasonCode: 'BELOW_RANGE',
      reasonText: REASON_TEXT.BELOW_RANGE,
    }
  }

  if (count > 300) {
    return {
      id,
      plateIndex,
      rawInput: trimmed,
      colonyCount: count,
      status: 'rejected',
      reasonCode: 'ABOVE_RANGE',
      reasonText: REASON_TEXT.ABOVE_RANGE,
    }
  }

  return {
    id,
    plateIndex,
    rawInput: trimmed,
    colonyCount: count,
    status: 'adopted',
    reasonCode: '',
    reasonText: '',
  }
}

export function checkDuplicateVariance(plates: PlateData[]): void {
  const adopted = plates.filter(p => p.status === 'adopted' && p.colonyCount !== null)
  if (adopted.length === 2) {
    const [a, b] = adopted
    const avg = (a.colonyCount! + b.colonyCount!) / 2
    if (avg > 0) {
      const diff = Math.abs(a.colonyCount! - b.colonyCount!) / avg
      if (diff > 0.5) {
        adopted.forEach(p => {
          p.status = 'warning'
          p.reasonCode = 'DUPLICATE_VARIANCE'
          p.reasonText = REASON_TEXT.DUPLICATE_VARIANCE
        })
      }
    }
  }
}

export function calculateCfu(sample: SampleEntry): SampleEntry {
  const adoptableDilutions: {
    dilution: DilutionGroup
    adoptedPlates: PlateData[]
    avgCount: number
  }[] = []

  for (const dilution of sample.dilutions) {
    const parsed = parseDilution(dilution.rawDilutionInput)
    if (!parsed) continue

    const volMl = convertToMl(dilution.inoculationVolume, dilution.volumeUnit)
    if (volMl <= 0) continue

    const judgedPlates = dilution.plates.map((p, i) => judgePlate(p.rawInput, i))
    checkDuplicateVariance(judgedPlates)

    const adopted = judgedPlates.filter(
      p => (p.status === 'adopted' || p.status === 'warning') && p.colonyCount !== null
    )

    if (adopted.length > 0) {
      const avgCount = adopted.reduce((s, p) => s + p.colonyCount!, 0) / adopted.length
      adoptableDilutions.push({
        dilution: { ...dilution, plates: judgedPlates },
        adoptedPlates: adopted,
        avgCount,
      })
    } else {
      dilution.plates = judgedPlates
    }
  }

  if (adoptableDilutions.length === 0) {
    return {
      ...sample,
      finalCfu: null,
      calculationNote: '无可计数平板，无法计算 CFU',
      adoptedDilutionId: null,
    }
  }

  adoptableDilutions.sort((a, b) => {
    const distA = Math.abs(a.avgCount - 300)
    const distB = Math.abs(b.avgCount - 300)
    return distA - distB
  })

  const best = adoptableDilutions[0]
  const parsed = parseDilution(best.dilution.rawDilutionInput)!
  const volMl = convertToMl(best.dilution.inoculationVolume, best.dilution.volumeUnit)
  const dilutionReciprocal = 1 / parsed.value
  const cfu = (best.avgCount * dilutionReciprocal) / volMl

  const steps: string[] = []
  steps.push(`选用稀释度 ${parsed.display} (=${parsed.value})`)
  steps.push(`可计数平板菌落数: ${best.adoptedPlates.map(p => p.colonyCount).join(', ')}`)
  steps.push(`平均菌落数: ${best.avgCount.toFixed(1)}`)
  steps.push(`接种体积: ${best.dilution.inoculationVolume}${best.dilution.volumeUnit} = ${volMl}mL`)
  steps.push(`CFU/mL = (${best.avgCount.toFixed(1)} × ${dilutionReciprocal}) / ${volMl} = ${Math.round(cfu)}`)

  const hasVarianceWarning = best.adoptedPlates.some(p => p.reasonCode === 'DUPLICATE_VARIANCE')
  if (hasVarianceWarning) {
    steps.push('⚠ 重复平板差异过大，结果仅供参考')
  }

  for (const ad of adoptableDilutions) {
    const dIdx = sample.dilutions.findIndex(d => d.id === ad.dilution.id)
    if (dIdx !== -1) {
      sample.dilutions[dIdx].plates = ad.dilution.plates
    }
  }

  return {
    ...sample,
    finalCfu: Math.round(cfu),
    calculationNote: steps.join('\n'),
    adoptedDilutionId: best.dilution.id,
  }
}
