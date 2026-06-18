import { jsPDF } from 'jspdf'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import type { Transcript, ChapterType } from '@/types'
import { chapterInfos } from '@/data/keywords'

const FONT_SIZE_TITLE = 18
const FONT_SIZE_HEADING = 14
const FONT_SIZE_BODY = 12
const LINE_HEIGHT = 1.5
const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const MARGIN = 20

function getChineseFont(doc: jsPDF): void {
  doc.setFont('helvetica', 'normal')
}

function addText(doc: jsPDF, text: string, x: number, y: number, maxWidth: number): number {
  const words = text.split('')
  let line = ''
  let currentY = y
  const fontSize = doc.getFontSize()
  const charWidth = fontSize * 0.35

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i]
    const testWidth = testLine.length * charWidth

    if (testWidth > maxWidth && line !== '') {
      doc.text(line, x, currentY)
      line = words[i]
      currentY += fontSize * LINE_HEIGHT
    } else {
      line = testLine
    }
  }

  if (line) {
    doc.text(line, x, currentY)
    currentY += fontSize * LINE_HEIGHT
  }

  return currentY
}

function checkNewPage(doc: jsPDF, currentY: number, needed: number): number {
  if (currentY + needed > PAGE_HEIGHT - MARGIN) {
    doc.addPage()
    return MARGIN + 10
  }
  return currentY
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('zh-CN')
  } catch {
    return dateStr
  }
}

export function exportCatalog(project: Transcript, options: { includeTimecode?: boolean } = {}): Blob {
  const doc = new jsPDF()
  getChineseFont(doc)

  let y = MARGIN

  doc.setFontSize(FONT_SIZE_TITLE)
  doc.setFont('helvetica', 'bold')
  y = addText(doc, project.title, MARGIN, y, PAGE_WIDTH - MARGIN * 2)
  y += 5

  doc.setFontSize(FONT_SIZE_BODY)
  doc.setFont('helvetica', 'normal')
  y = addText(doc, `被采访人: ${project.interviewee}`, MARGIN, y, PAGE_WIDTH - MARGIN * 2)
  y = addText(doc, `采访人: ${project.interviewer}`, MARGIN, y, PAGE_WIDTH - MARGIN * 2)
  y = addText(doc, `采访日期: ${formatDate(project.interviewDate)}`, MARGIN, y, PAGE_WIDTH - MARGIN * 2)
  y = addText(doc, `采访地点: ${project.location}`, MARGIN, y, PAGE_WIDTH - MARGIN * 2)
  y += 10

  const chapters = chapterInfos.filter(c => c.id !== null)

  chapters.forEach(chapter => {
    const chapterParagraphs = project.paragraphs.filter(p => p.chapter === chapter.id)
    if (chapterParagraphs.length === 0) return

    y = checkNewPage(doc, y, 30)

    doc.setFontSize(FONT_SIZE_HEADING)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(80, 50, 20)
    y = addText(doc, `${chapter.name}`, MARGIN, y, PAGE_WIDTH - MARGIN * 2)
    doc.setTextColor(0, 0, 0)
    y += 3

    doc.setFontSize(FONT_SIZE_BODY)
    doc.setFont('helvetica', 'normal')

    chapterParagraphs.forEach((paragraph, index) => {
      y = checkNewPage(doc, y, 20)

      let prefix = `${index + 1}. `
      if (options.includeTimecode && paragraph.startTimecode) {
        prefix += `[${paragraph.startTimecode}] `
      }

      const content = prefix + paragraph.content
      y = addText(doc, content, MARGIN, y, PAGE_WIDTH - MARGIN * 2)
      y += 2
    })

    y += 5
  })

  const unclassified = project.paragraphs.filter(p => p.chapter === null)
  if (unclassified.length > 0) {
    y = checkNewPage(doc, y, 30)
    doc.setFontSize(FONT_SIZE_HEADING)
    doc.setFont('helvetica', 'bold')
    y = addText(doc, '未分类', MARGIN, y, PAGE_WIDTH - MARGIN * 2)
    y += 3

    doc.setFontSize(FONT_SIZE_BODY)
    doc.setFont('helvetica', 'normal')

    unclassified.forEach((paragraph, index) => {
      y = checkNewPage(doc, y, 20)
      const prefix = `${index + 1}. ${paragraph.content}`
      y = addText(doc, prefix, MARGIN, y, PAGE_WIDTH - MARGIN * 2)
      y += 2
    })
  }

  return new Blob([doc.output('arraybuffer') as ArrayBuffer], { type: 'application/pdf' })
}

export function exportResearch(project: Transcript, options: { showOriginalPosition?: boolean } = {}): Blob {
  const doc = new jsPDF()
  getChineseFont(doc)

  let y = MARGIN

  doc.setFontSize(FONT_SIZE_TITLE)
  doc.setFont('helvetica', 'bold')
  y = addText(doc, project.title, MARGIN, y, PAGE_WIDTH - MARGIN * 2)
  y += 5

  doc.setFontSize(FONT_SIZE_BODY)
  doc.setFont('helvetica', 'normal')
  y = addText(doc, `被采访人: ${project.interviewee}`, MARGIN, y, PAGE_WIDTH - MARGIN * 2)
  y = addText(doc, `采访人: ${project.interviewer}`, MARGIN, y, PAGE_WIDTH - MARGIN * 2)
  y += 10

  if (project.description) {
    doc.setFontSize(FONT_SIZE_HEADING)
    doc.setFont('helvetica', 'bold')
    y = addText(doc, '项目简介', MARGIN, y, PAGE_WIDTH - MARGIN * 2)
    doc.setFontSize(FONT_SIZE_BODY)
    doc.setFont('helvetica', 'normal')
    y = addText(doc, project.description, MARGIN, y, PAGE_WIDTH - MARGIN * 2)
    y += 10
  }

  const sortedParagraphs = [...project.paragraphs].sort((a, b) => a.order - b.order)

  sortedParagraphs.forEach((paragraph, index) => {
    y = checkNewPage(doc, y, 40)

    const chapterInfo = chapterInfos.find(c => c.id === paragraph.chapter)
    const chapterName = chapterInfo ? chapterInfo.name : '未分类'

    doc.setFontSize(FONT_SIZE_BODY)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(100, 60, 30)
    y = addText(doc, `第 ${index + 1} 段 [${chapterName}]`, MARGIN, y, PAGE_WIDTH - MARGIN * 2)
    doc.setTextColor(0, 0, 0)

    if (paragraph.startTimecode || paragraph.endTimecode) {
      const timecode = `${paragraph.startTimecode || ''}${paragraph.endTimecode ? ` - ${paragraph.endTimecode}` : ''}`
      doc.setFontSize(FONT_SIZE_BODY - 2)
      doc.setFont('helvetica', 'italic')
      y = addText(doc, `时间码: ${timecode}`, MARGIN + 5, y, PAGE_WIDTH - MARGIN * 2)
      doc.setFontSize(FONT_SIZE_BODY)
    }

    if (options.showOriginalPosition) {
      doc.setFontSize(FONT_SIZE_BODY - 2)
      y = addText(doc, `原始位置: 第 ${paragraph.originalIndex + 1} 段`, MARGIN + 5, y, PAGE_WIDTH - MARGIN * 2)
      doc.setFontSize(FONT_SIZE_BODY)
    }

    doc.setFont('helvetica', 'normal')
    y = addText(doc, paragraph.content, MARGIN, y, PAGE_WIDTH - MARGIN * 2)

    if (paragraph.entities.length > 0) {
      y = checkNewPage(doc, y, 15)
      doc.setFontSize(FONT_SIZE_BODY - 2)
      doc.setFont('helvetica', 'italic')
      const entityNames = paragraph.entities.map(e => `${e.name}(${e.type})`).join(', ')
      y = addText(doc, `实体: ${entityNames}`, MARGIN, y, PAGE_WIDTH - MARGIN * 2)
      doc.setFontSize(FONT_SIZE_BODY)
      doc.setFont('helvetica', 'normal')
    }

    if (paragraph.uncertainties.length > 0) {
      y = checkNewPage(doc, y, 15)
      doc.setTextColor(200, 100, 100)
      doc.setFontSize(FONT_SIZE_BODY - 2)
      const uncText = paragraph.uncertainties.map(u => `${u.text}[${u.type}]`).join(', ')
      y = addText(doc, `待确认: ${uncText}`, MARGIN, y, PAGE_WIDTH - MARGIN * 2)
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(FONT_SIZE_BODY)
      doc.setFont('helvetica', 'normal')
    }

    y += 8
  })

  return new Blob([doc.output('arraybuffer') as ArrayBuffer], { type: 'application/pdf' })
}

export function exportConfirmationList(
  project: Transcript,
  options: { format: 'xlsx' | 'csv'; onlyUnconfirmed?: boolean } = { format: 'xlsx' }
): Blob {
  const uncertainties = options.onlyUnconfirmed
    ? project.uncertainties.filter(u => u.status === 'pending')
    : project.uncertainties

  const data = uncertainties.map(u => {
    const paragraph = project.paragraphs.find(p => p.id === u.paragraphId)
    const typeMap: Record<string, string> = {
      unintelligible: '听不清',
      multiple_names: '多称呼',
      timeline_jump: '时间跳跃'
    }
    const statusMap: Record<string, string> = {
      pending: '待确认',
      confirmed: '已确认',
      resolved: '已解决'
    }

    return {
      '序号': '',
      '类型': typeMap[u.type] || u.type,
      '原文内容': u.text,
      '所在段落': paragraph ? paragraph.content.substring(0, 50) + '...' : '',
      '状态': statusMap[u.status] || u.status,
      '备注': u.note || '',
      '段落ID': u.paragraphId
    }
  })

  data.forEach((row, index) => {
    row['序号'] = (index + 1).toString()
  })

  const entityData = project.entities.map((e, index) => {
    const typeMap: Record<string, string> = {
      person: '人物',
      place: '地名',
      technique: '技法',
      quote: '原话'
    }

    return {
      '序号': (index + 1).toString(),
      '类型': typeMap[e.type] || e.type,
      '名称': e.name,
      '描述': e.description || '',
      '确认状态': e.confirmed ? '已确认' : '待确认',
      '出现次数': e.paragraphIds.length.toString(),
      '备注': ''
    }
  })

  const wb = XLSX.utils.book_new()

  const ws1 = XLSX.utils.json_to_sheet(data)
  XLSX.utils.book_append_sheet(wb, ws1, '待确认事项')

  const ws2 = XLSX.utils.json_to_sheet(entityData)
  XLSX.utils.book_append_sheet(wb, ws2, '实体列表')

  if (options.format === 'csv') {
    const csv = XLSX.utils.sheet_to_csv(ws1)
    return new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
  }

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

export function downloadBlob(blob: Blob, filename: string): void {
  saveAs(blob, filename)
}

export function getChapterName(chapter: ChapterType): string {
  const info = chapterInfos.find(c => c.id === chapter)
  return info ? info.name : '未分类'
}
