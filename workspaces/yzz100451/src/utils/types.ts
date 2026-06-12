export type BodyPart = 'neckline' | 'shoulder' | 'chest' | 'waist' | 'hip' | 'sleeveLength' | 'pantsLength' | 'armhole' | 'backWidth'

export type PhotoSide = 'front' | 'back' | 'side'

export type Movement = 'raiseArms' | 'bendOver' | 'sit' | 'walk' | 'crossLegs' | 'squat' | 'reachForward' | 'turnAround'

export type AlertType = 'missingSize' | 'multipleVersions' | 'photoNoSide' | 'conflict'

export interface StyleNumber {
  id: string
  code: string
  name: string
  versions: string[]
}

export interface SizeChart {
  id: string
  styleId: string
  version: string
  size: string
  neckline: number | null
  shoulder: number | null
  chest: number | null
  waist: number | null
  hip: number | null
  sleeveLength: number | null
  pantsLength: number | null
}

export interface Feedback {
  id: string
  styleId: string
  version: string
  wearerName: string
  height: number
  weight: number
  size: string
  movements: Movement[]
  overallComment: string
  createdAt: number
}

export interface Photo {
  id: string
  feedbackId: string
  url: string
  side: PhotoSide | ''
}

export interface DiscomfortItem {
  id: string
  feedbackId: string
  bodyPart: BodyPart
  description: string
  originalWords: string
  severity: number
}

export interface Alert {
  id: string
  type: AlertType
  message: string
  relatedIds: string[]
}

export interface PriorityMark {
  styleId: string
  bodyPart: BodyPart
  marked: boolean
}
