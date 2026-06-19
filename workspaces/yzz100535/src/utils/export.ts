import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import type { Judge, Work, Score, AwardLevel } from '@/types'
import { getWorkAverageScore, getAggregatedComment, getRankedWorks } from './validation'

export interface ImportRow {
  imagePath: string
  author: string
  theme: string
}

export function parseCSV(text: string): ImportRow[] {
  const result = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true })
  return result.data.map((row) => ({
    imagePath: row['图片路径'] || row['imagePath'] || row['文件名'] || row['filename'] || '',
    author: row['作者'] || row['author'] || row['摄影师'] || '',
    theme: row['主题'] || row['theme'] || row['标题'] || row['title'] || '',
  }))
}

export function parseExcel(buffer: ArrayBuffer): ImportRow[] {
  const wb = XLSX.read(buffer, { type: 'array' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const data = XLSX.utils.sheet_to_json<Record<string, string>>(sheet)
  return data.map((row) => ({
    imagePath: row['图片路径'] || row['imagePath'] || row['文件名'] || row['filename'] || '',
    author: row['作者'] || row['author'] || row['摄影师'] || '',
    theme: row['主题'] || row['theme'] || row['标题'] || row['title'] || '',
  }))
}

export function generateCSVTemplate(): string {
  return Papa.unparse([
    { '图片路径': 'photo001.jpg', '作者': '张三', '主题': '晨曦' },
    { '图片路径': 'photo002.jpg', '作者': '李四', '主题': '暮色' },
  ])
}

export function buildImageMapFromFiles(files: FileList | File[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const file of files) {
    map[file.name] = URL.createObjectURL(file)
  }
  return map
}

export function exportPublicReport(
  eventName: string,
  eventDate: string,
  rankedWorks: ReturnType<typeof getRankedWorks>,
  scores: Score[],
  judges: Judge[],
  awards: AwardLevel[]
): string {
  const lines: string[] = []
  lines.push(`# ${eventName} 评片结果`)
  lines.push(`日期: ${eventDate}`)
  lines.push('')

  const awardWinners: { level: string; work: typeof rankedWorks[0] }[] = []
  let idx = 0
  for (const award of awards) {
    for (let i = 0; i < award.count && idx < rankedWorks.length; i++, idx++) {
      awardWinners.push({ level: award.label, work: rankedWorks[idx] })
    }
  }

  lines.push('## 获奖名单')
  lines.push('')
  for (const w of awardWinners) {
    lines.push(`**${w.level}** - ${w.work.author}《${w.work.theme}》 平均分: ${w.work.avgScore}`)
  }
  lines.push('')
  lines.push('## 获奖作品点评')
  lines.push('')
  for (const w of awardWinners) {
    const comment = getAggregatedComment(w.work.id, scores, judges)
    lines.push(`### ${w.work.author}《${w.work.theme}》 (${w.level})`)
    lines.push(comment || '暂无点评')
    lines.push('')
  }

  return lines.join('\n')
}

export function exportInternalReport(
  eventName: string,
  eventDate: string,
  rankedWorks: ReturnType<typeof getRankedWorks>,
  scores: Score[],
  judges: Judge[],
  awards: AwardLevel[]
): string {
  const lines: string[] = []
  lines.push(`# ${eventName} 评片内部明细`)
  lines.push(`日期: ${eventDate}`)
  lines.push('')

  const activeJudges = judges.filter((j) => !j.absent)
  const awardSet = new Set<string>()
  let idx = 0
  for (const award of awards) {
    for (let i = 0; i < award.count && idx < rankedWorks.length; i++, idx++) {
      awardSet.add(rankedWorks[idx].id)
    }
  }

  lines.push('| 排名 | 编号 | 作者 | 主题 | 平均分 | ' + activeJudges.map((j) => j.name + '评分').join(' | ') + ' |')
  lines.push('|' + '------|'.repeat(5 + activeJudges.length))
  for (const w of rankedWorks) {
    const judgeScores = activeJudges.map((j) => {
      const sc = scores.find((s) => s.workId === w.id && s.judgeId === j.id)
      return sc?.score ?? '-'
    })
    const awardTag = awardSet.has(w.id) ? '★' : ''
    lines.push(`| ${w.rank} ${awardTag} | ${w.anonymousCode} | ${w.author} | ${w.theme} | ${w.avgScore} | ${judgeScores.join(' | ')} |`)
  }

  lines.push('')
  lines.push('## 详细点评')
  lines.push('')
  for (const w of rankedWorks) {
    lines.push(`### ${w.anonymousCode} - ${w.author}《${w.theme}》`)
    for (const j of activeJudges) {
      const sc = scores.find((s) => s.workId === w.id && s.judgeId === j.id)
      lines.push(`- ${j.name}: ${sc?.score ?? '-'}分 | ${sc?.comment || '无点评'}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

export function exportAuthorCommentary(
  author: string,
  works: Work[],
  scores: Score[],
  judges: Judge[]
): string {
  const lines: string[] = []
  const authorWorks = works.filter((w) => w.author === author)
  lines.push(`# ${author} 作品点评稿`)
  lines.push('')
  for (const w of authorWorks) {
    const avg = getWorkAverageScore(w.id, scores, judges)
    lines.push(`## 《${w.theme}》(编号: ${w.anonymousCode}) 综合评分: ${avg}`)
    lines.push('')
    const comment = getAggregatedComment(w.id, scores, judges)
    lines.push(comment || '暂无点评')
    lines.push('')
  }
  return lines.join('\n')
}

export function downloadTextFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadCSVFile(content: string, filename: string) {
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
