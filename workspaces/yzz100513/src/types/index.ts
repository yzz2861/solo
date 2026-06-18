export type ChapterType = 'childhood' | 'techniques' | 'mentorship' | 'tools' | 'difficulties' | null

export type SelectedChapter = ChapterType | undefined

export type EntityType = 'person' | 'place' | 'technique' | 'quote'

export type UncertaintyType = 'unintelligible' | 'multiple_names' | 'timeline_jump'

export type UncertaintyStatus = 'pending' | 'confirmed' | 'resolved'

export interface ChapterInfo {
  id: ChapterType
  name: string
  icon: string
  color: string
  description: string
}

export interface Entity {
  id: string
  type: EntityType
  name: string
  description?: string
  confirmed: boolean
  paragraphIds: string[]
  metadata?: Record<string, string>
}

export interface Uncertainty {
  id: string
  type: UncertaintyType
  status: UncertaintyStatus
  startIndex: number
  endIndex: number
  text: string
  note?: string
  paragraphId: string
}

export interface Paragraph {
  id: string
  content: string
  chapter: ChapterType
  order: number
  startTimecode?: string
  endTimecode?: string
  entities: Entity[]
  uncertainties: Uncertainty[]
  originalIndex: number
}

export interface Transcript {
  id: string
  title: string
  interviewee: string
  interviewer: string
  interviewDate: string
  location: string
  duration?: string
  description?: string
  paragraphs: Paragraph[]
  entities: Entity[]
  uncertainties: Uncertainty[]
  createdAt: string
  updatedAt: string
  language: string
  heritageType: string
}

export interface ChapterKeyword {
  keywords: string[]
  weights: Record<string, number>
}

export interface EntityPattern {
  type: EntityType
  patterns: RegExp[]
}

export interface UncertaintyPattern {
  type: UncertaintyType
  patterns: RegExp[]
}
