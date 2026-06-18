import type { Paragraph, Transcript, ChapterType } from '@/types'
import { chapterKeywords } from '@/data/keywords'
import { extractAllEntities, detectAllUncertainties } from '@/utils/extractor'

export function generateId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`
}

export function parseText(text: string): Paragraph[] {
  const cleanedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const rawParagraphs = cleanedText.split(/\n\s*\n/).filter(p => p.trim().length > 0)

  return rawParagraphs.map((content, index) => ({
    id: generateId(),
    content: content.trim(),
    chapter: null,
    order: index,
    entities: [],
    uncertainties: [],
    originalIndex: index
  }))
}

export function calculateChapterScore(content: string, chapterKey: string): number {
  const config = chapterKeywords[chapterKey]
  if (!config) return 0

  let score = 0
  const lowerContent = content.toLowerCase()

  config.keywords.forEach(keyword => {
    const regex = new RegExp(keyword, 'g')
    const matches = lowerContent.match(regex)
    if (matches) {
      const weight = config.weights[keyword] || 1
      score += matches.length * weight
    }
  })

  return score
}

export function autoClassifyChapters(paragraphs: Paragraph[]): Paragraph[] {
  return paragraphs.map(paragraph => {
    let bestChapter: ChapterType = null
    let highestScore = 0

    Object.keys(chapterKeywords).forEach(chapterKey => {
      const score = calculateChapterScore(paragraph.content, chapterKey)
      if (score > highestScore && score >= 2) {
        highestScore = score
        bestChapter = chapterKey as ChapterType
      }
    })

    return { ...paragraph, chapter: bestChapter }
  })
}

export function processText(text: string, metadata: Partial<Transcript>): Transcript {
  const now = new Date().toISOString()
  const id = generateId()

  let paragraphs = parseText(text)
  paragraphs = autoClassifyChapters(paragraphs)

  const extractResult = extractAllEntities(paragraphs)
  paragraphs = extractResult.paragraphs

  const detectResult = detectAllUncertainties(paragraphs)
  paragraphs = detectResult.paragraphs

  const allEntities = extractResult.entities
  const allUncertainties = detectResult.uncertainties

  return {
    id,
    title: metadata.title || '未命名项目',
    interviewee: metadata.interviewee || '',
    interviewer: metadata.interviewer || '',
    interviewDate: metadata.interviewDate || now.split('T')[0],
    location: metadata.location || '',
    duration: metadata.duration,
    description: metadata.description,
    paragraphs,
    entities: allEntities,
    uncertainties: allUncertainties,
    createdAt: now,
    updatedAt: now,
    language: metadata.language || 'zh-CN',
    heritageType: metadata.heritageType || ''
  }
}
