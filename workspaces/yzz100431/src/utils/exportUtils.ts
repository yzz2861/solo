import { ReviewRecord, PlateData } from './types'

export function exportStudentCsv(record: ReviewRecord): string {
  const lines: string[] = []
  lines.push('菌落稀释计数批改表')
  lines.push(`班级,${record.className}`)
  lines.push(`组号,${record.groupName}`)
  lines.push(`日期,${record.reviewDate}`)
  lines.push(`批改人,${record.reviewerName}`)
  lines.push('')

  for (const sample of record.samples) {
    lines.push(`样品: ${sample.sampleName}`)
    lines.push('稀释度,接种体积,平板1菌落数,平板1状态,平板2菌落数,平板2状态,CFU/mL')

    for (const d of sample.dilutions) {
      const p1 = d.plates[0]
      const p2 = d.plates[1]
      const row = [
        d.dilutionDisplay || d.rawDilutionInput,
        `${d.inoculationVolume}${d.volumeUnit}`,
        p1 ? formatPlateColony(p1) : '',
        p1 ? formatPlateStatus(p1) : '',
        p2 ? formatPlateColony(p2) : '',
        p2 ? formatPlateStatus(p2) : '',
        d.id === sample.adoptedDilutionId ? String(sample.finalCfu ?? '') : '',
      ]
      lines.push(row.join(','))
    }

    lines.push(`结果: ${sample.finalCfu !== null ? sample.finalCfu + ' CFU/mL' : '无法计算'}`)
    lines.push('')
  }

  return lines.join('\n')
}

export function exportTechnicianJson(record: ReviewRecord): string {
  return JSON.stringify(record, null, 2)
}

export function exportTechnicianCsv(record: ReviewRecord): string {
  const lines: string[] = []
  lines.push('菌落稀释计数复算记录（实验员版）')
  lines.push(`记录ID,${record.id}`)
  lines.push(`班级,${record.className}`)
  lines.push(`组号,${record.groupName}`)
  lines.push(`日期,${record.reviewDate}`)
  lines.push(`复核人,${record.reviewerName}`)
  lines.push(`角色,${record.role === 'teacher' ? '教师' : '实验员'}`)
  lines.push('')

  for (const sample of record.samples) {
    lines.push(`=== 样品: ${sample.sampleName} ===`)
    lines.push('稀释度(原始输入),稀释度(解析值),稀释度(显示),接种体积,接种单位,体积(mL),平板序号,原始输入,菌落数,状态,原因代码,原因说明')

    for (const d of sample.dilutions) {
      for (const p of d.plates) {
        const row = [
          d.rawDilutionInput,
          d.dilutionValue,
          d.dilutionDisplay,
          d.inoculationVolume,
          d.volumeUnit,
          d.inoculationVolumeMl,
          p.plateIndex + 1,
          `"${p.rawInput}"`,
          p.colonyCount ?? '',
          p.status,
          p.reasonCode,
          `"${p.reasonText}"`,
        ]
        lines.push(row.join(','))
      }
    }

    lines.push(`最终CFU/mL,${sample.finalCfu ?? '无法计算'}`)
    lines.push(`计算过程,"${sample.calculationNote.replace(/\n/g, ' | ')}"`)
    lines.push(`选用稀释度ID,${sample.adoptedDilutionId ?? ''}`)
    lines.push('')
  }

  return lines.join('\n')
}

function formatPlateColony(p: PlateData): string {
  if (p.status === 'rejected' && p.reasonCode === 'TNTC') return 'TNTC'
  if (p.status === 'rejected' && p.reasonCode === 'BLANK_CONTAMINATED') return '空白污染'
  if (p.colonyCount !== null) return String(p.colonyCount)
  return ''
}

function formatPlateStatus(p: PlateData): string {
  switch (p.status) {
    case 'adopted': return '✓ 采纳'
    case 'rejected': return `✗ 剔除(${p.reasonText})`
    case 'warning': return `⚠ ${p.reasonText}`
    case 'no_data': return '—'
  }
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob(['\uFEFF' + content], { type: `${mimeType};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function generateFilename(record: ReviewRecord, suffix: string, ext: string): string {
  const date = record.reviewDate.replace(/[/\\]/g, '-')
  return `CFU复核_${record.className}_${record.groupName}_${date}_${suffix}.${ext}`
}
