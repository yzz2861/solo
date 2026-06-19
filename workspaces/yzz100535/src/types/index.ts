export interface AppEvent {
  id: string
  name: string
  date: string
  scoreMin: number
  scoreMax: number
  maxWorksPerAuthor: number
  revealed: boolean
}

export interface Judge {
  id: string
  eventId: string
  name: string
  absent: boolean
  absentNote: string
}

export interface Work {
  id: string
  eventId: string
  anonymousCode: string
  imagePath: string
  author: string
  theme: string
  imageValid: boolean
  imageUrl: string
}

export interface Score {
  id: string
  workId: string
  judgeId: string
  score: number | null
  comment: string
}

export interface ValidationWarning {
  type: 'image_invalid' | 'author_exceed' | 'judge_missing' | 'score_out_of_range'
  message: string
  targetId: string
}

export interface AwardLevel {
  label: string
  count: number
  color: string
}
