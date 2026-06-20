import Papa from 'papaparse'
import { downloadBlob } from './export'

export async function parseCsvFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<any>(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (result) => {
        if (result.errors.length > 0) {
          reject(new Error(result.errors[0].message))
          return
        }
        resolve(result.data)
      },
      error: (err) => reject(err),
    })
  })
}

export function exportCsv(
  rows: Record<string, any>[],
  headers: { key: string; label: string }[],
  filename: string
): void {
  const headerRow = headers.map((h) => h.label)
  const dataRows = rows.map((row) =>
    headers.map((h) => {
      const v = row[h.key]
      if (v === null || v === undefined) return ''
      return v
    })
  )
  const csv = Papa.unparse([headerRow, ...dataRows])
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, filename.endsWith('.csv') ? filename : filename + '.csv')
}
