export interface Project {
  id: string
  name: string
  description: string
  modelUrl: string
  createdAt: string
  updatedAt: string
}

export interface ComponentItem {
  id: string
  projectId: string
  name: string
  code: string
  type: ComponentType
  material: string
  dimensions: string
  parentId: string
  positionX: number
  positionY: number
  positionZ: number
  createdAt: string
}

export type ComponentType = 'beam' | 'purlin' | 'pillar' | 'dougong' | 'disease'

export interface Annotation {
  id: string
  componentId: string
  type: ComponentType
  positionX: number
  positionY: number
  positionZ: number
  label: string
  description: string
}

export interface Photo {
  id: string
  componentId: string
  angle: PhotoAngle
  description: string
  takenAt: string
  takenBy: string
  thumbnail: string
}

export type PhotoAngle = 'front' | 'side' | 'top' | 'bottom' | 'unknown'

export interface Measurement {
  id: string
  componentId: string
  metricName: string
  value: number
  unit: string
  measuredAt: string
  measuredBy: string
}

export interface RepairSuggestion {
  id: string
  componentId: string
  suggestion: string
  responsiblePerson: string
  plannedDate: string
  status: 'pending' | 'in_progress' | 'completed'
}

export interface Disease {
  id: string
  componentId: string
  type: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  discoveredAt: string
  discoveredBy: string
}

export interface Reinspection {
  id: string
  diseaseId: string
  taskId: string
  inspectedAt: string
  inspectedBy: string
  conclusion: string
  isExpanded: boolean
  notes: string
}

export interface Viewpoint {
  id: string
  projectId: string
  name: string
  camera: {
    position: { x: number; y: number; z: number }
    rotation: { x: number; y: number; z: number }
    fov: number
  }
  target: { x: number; y: number; z: number }
  createdAt: string
  screenshot?: string
}

export interface ReviewTask {
  id: string
  projectId: string
  title: string
  year: number
  assignedTo: string
  deadline: string
  status: 'pending' | 'in_progress' | 'completed'
}

export interface ReviewItem {
  id: string
  diseaseId: string
  title: string
  status: 'pending' | 'reviewing' | 'reviewed'
  exportedAt: string
}

export interface ExpertOpinion {
  id: string
  reviewItemId: string
  expertName: string
  opinion: string
  verdict: 'approve' | 'modify' | 'reject'
  createdAt: string
}

export type AlertSeverity = 'warning' | 'error' | 'info'

export interface Alert {
  id: string
  type: 'missing_code' | 'unknown_angle' | 'conflicting_conclusion'
  severity: AlertSeverity
  componentId: string
  message: string
  relatedIds: string[]
  resolved: boolean
}
