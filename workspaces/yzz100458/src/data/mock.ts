import type { StoreInfo, InspectionBatch, Photo, Annotation, AnnotationHistory, RectificationItem, Report } from '@/types'

export const STORES: StoreInfo[] = [
  { id: 'store-1', name: '北京朝阳店', region: '华北区', address: '北京市朝阳区建国路88号' },
  { id: 'store-2', name: '上海静安店', region: '华东区', address: '上海市静安区南京西路1266号' },
  { id: 'store-3', name: '广州天河店', region: '华南区', address: '广州市天河区体育西路101号' },
]

export const SUPERVISORS = [
  { id: 'sup-1', name: '王建国', role: 'supervisor' as const },
  { id: 'sup-2', name: '李明辉', role: 'supervisor' as const },
]

function generatePhotoUrl(seed: number, w = 800, h = 600): string {
  return `https://picsum.photos/seed/shelf${seed}/${w}/${h}`
}

function generateThumbnailUrl(seed: number): string {
  return `https://picsum.photos/seed/shelf${seed}/200/150`
}

export const INSPECTION_BATCHES: InspectionBatch[] = [
  {
    id: 'batch-1',
    storeId: 'store-1',
    date: '2026-06-10',
    supervisorId: 'sup-1',
    supervisorName: '王建国',
    status: 'reviewed',
    totalPhotos: 10,
    issueCount: 18,
  },
  {
    id: 'batch-2',
    storeId: 'store-2',
    date: '2026-06-11',
    supervisorId: 'sup-1',
    supervisorName: '王建国',
    status: 'completed',
    totalPhotos: 8,
    issueCount: 12,
  },
  {
    id: 'batch-3',
    storeId: 'store-3',
    date: '2026-06-12',
    supervisorId: 'sup-2',
    supervisorName: '李明辉',
    status: 'processing',
    totalPhotos: 12,
    issueCount: 22,
  },
]

const issueTypeList: Array<import('@/types').IssueType> = [
  'MISSING_PRICE', 'WRONG_PRICE', 'INSUFFICIENT_SHELF', 'COMPETITOR_MIX', 'DISPLAY_BLOCKED',
]

function generateAnnotations(photoId: string, seed: number, count: number): Annotation[] {
  const annotations: Annotation[] = []
  for (let i = 0; i < count; i++) {
    const typeIdx = (seed + i) % issueTypeList.length
    const type = issueTypeList[typeIdx]
    const confidence = 0.3 + Math.random() * 0.7
    const x = 5 + Math.random() * 50
    const y = 5 + Math.random() * 40
    const w = 15 + Math.random() * 25
    const h = 10 + Math.random() * 20
    annotations.push({
      id: `ann-${photoId}-${i}`,
      photoId,
      type,
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      width: Math.round(w * 10) / 10,
      height: Math.round(h * 10) / 10,
      confidence: Math.round(confidence * 100) / 100,
      confidenceLevel: confidence >= 0.8 ? 'HIGH' : confidence >= 0.5 ? 'MEDIUM' : 'LOW',
      status: 'PENDING',
      note: '',
      label: '',
    })
  }
  return annotations
}

const photoSeeds = [101, 202, 303, 404, 505, 606, 707, 808, 909, 1010, 1111, 1212]

export const PHOTOS: Photo[] = [
  ...Array.from({ length: 10 }, (_, i) => ({
    id: `photo-1-${i}`,
    batchId: 'batch-1',
    storeId: 'store-1',
    url: generatePhotoUrl(photoSeeds[i]),
    thumbnailUrl: generateThumbnailUrl(photoSeeds[i]),
    quality: i === 3 ? ('BLURRY' as const) : i === 7 ? ('GLARE' as const) : ('GOOD' as const),
    blurScore: i === 3 ? 0.8 : Math.random() * 0.2,
    glareScore: i === 7 ? 0.75 : Math.random() * 0.15,
    takenAt: `2026-06-10T${9 + Math.floor(i / 3)}:${String(i * 7 % 60).padStart(2, '0')}:00`,
    hasIssues: true,
    issueTypes: [issueTypeList[i % 5], issueTypeList[(i + 2) % 5]].filter((v, idx, arr) => arr.indexOf(v) === idx),
    minConfidence: 0.4 + Math.random() * 0.5,
  })),
  ...Array.from({ length: 8 }, (_, i) => ({
    id: `photo-2-${i}`,
    batchId: 'batch-2',
    storeId: 'store-2',
    url: generatePhotoUrl(photoSeeds[i + 10]),
    thumbnailUrl: generateThumbnailUrl(photoSeeds[i + 10]),
    quality: i === 5 ? ('OCCLUDED' as const) : i === 2 ? ('MULTI_ANGLE' as const) : ('GOOD' as const),
    blurScore: Math.random() * 0.15,
    glareScore: i === 5 ? 0.6 : Math.random() * 0.2,
    takenAt: `2026-06-11T${10 + Math.floor(i / 3)}:${String(i * 11 % 60).padStart(2, '0')}:00`,
    hasIssues: i < 6,
    issueTypes: i < 6 ? [issueTypeList[(i + 1) % 5]] : [],
    minConfidence: i < 6 ? 0.5 + Math.random() * 0.45 : 1,
  })),
  ...Array.from({ length: 12 }, (_, i) => ({
    id: `photo-3-${i}`,
    batchId: 'batch-3',
    storeId: 'store-3',
    url: generatePhotoUrl(photoSeeds[i + 18]),
    thumbnailUrl: generateThumbnailUrl(photoSeeds[i + 18]),
    quality: i === 4 ? ('BLURRY' as const) : i === 9 ? ('GLARE' as const) : i === 11 ? ('OCCLUDED' as const) : ('GOOD' as const),
    blurScore: i === 4 ? 0.85 : Math.random() * 0.2,
    glareScore: i === 9 ? 0.7 : Math.random() * 0.15,
    takenAt: `2026-06-12T${8 + Math.floor(i / 4)}:${String(i * 5 % 60).padStart(2, '0')}:00`,
    hasIssues: true,
    issueTypes: [issueTypeList[i % 5], issueTypeList[(i + 3) % 5]].filter((v, idx, arr) => arr.indexOf(v) === idx),
    minConfidence: 0.35 + Math.random() * 0.55,
  })),
]

const allAnnotations: Annotation[] = []
PHOTOS.forEach((photo, batchIdx) => {
  const count = photo.hasIssues ? 2 + Math.floor(Math.random() * 4) : 0
  const seed = (batchIdx + 1) * 7
  allAnnotations.push(...generateAnnotations(photo.id, seed, count))
})

export const ANNOTATIONS = allAnnotations

export const ANNOTATION_HISTORIES: AnnotationHistory[] = [
  {
    id: 'hist-1',
    annotationId: 'ann-photo-1-0-0',
    action: 'created',
    previousValue: '',
    newValue: 'AI 自动识别',
    operatorId: 'system',
    operatorName: 'AI 系统',
    timestamp: '2026-06-10T14:30:00',
  },
  {
    id: 'hist-2',
    annotationId: 'ann-photo-1-0-0',
    action: 'modified_type',
    previousValue: '缺价签',
    newValue: '错价签',
    operatorId: 'sup-1',
    operatorName: '王建国',
    timestamp: '2026-06-10T15:20:00',
  },
  {
    id: 'hist-3',
    annotationId: 'ann-photo-1-0-0',
    action: 'confirmed',
    previousValue: '待确认',
    newValue: '已确认',
    operatorId: 'sup-1',
    operatorName: '王建国',
    timestamp: '2026-06-10T15:22:00',
  },
  {
    id: 'hist-4',
    annotationId: 'ann-photo-1-1-1',
    action: 'created',
    previousValue: '',
    newValue: 'AI 自动识别',
    operatorId: 'system',
    operatorName: 'AI 系统',
    timestamp: '2026-06-10T14:30:00',
  },
  {
    id: 'hist-5',
    annotationId: 'ann-photo-1-1-1',
    action: 'added_note',
    previousValue: '',
    newValue: '此区域灯光反光，需重新拍照确认',
    operatorId: 'sup-1',
    operatorName: '王建国',
    timestamp: '2026-06-10T15:25:00',
  },
]

export const RECTIFICATION_ITEMS: RectificationItem[] = [
  {
    id: 'rect-1',
    storeId: 'store-1',
    annotationId: 'ann-photo-1-0-0',
    photoId: 'photo-1-0',
    batchId: 'batch-1',
    description: '货架第二层左侧商品缺少价签',
    issueType: 'MISSING_PRICE',
    status: 'PENDING',
    deadline: '2026-06-17',
    createdAt: '2026-06-10T16:00:00',
    completedAt: null,
    photoUrl: generatePhotoUrl(101),
    storeName: '北京朝阳店',
  },
  {
    id: 'rect-2',
    storeId: 'store-1',
    annotationId: 'ann-photo-1-1-1',
    photoId: 'photo-1-1',
    batchId: 'batch-1',
    description: '货架第三层竞品混入我品区域',
    issueType: 'COMPETITOR_MIX',
    status: 'IN_PROGRESS',
    deadline: '2026-06-17',
    createdAt: '2026-06-10T16:00:00',
    completedAt: null,
    photoUrl: generatePhotoUrl(202),
    storeName: '北京朝阳店',
  },
  {
    id: 'rect-3',
    storeId: 'store-1',
    annotationId: 'ann-photo-1-2-0',
    photoId: 'photo-1-2',
    batchId: 'batch-1',
    description: '堆头被促销物料遮挡',
    issueType: 'DISPLAY_BLOCKED',
    status: 'COMPLETED',
    deadline: '2026-06-17',
    createdAt: '2026-06-10T16:00:00',
    completedAt: '2026-06-12T10:30:00',
    photoUrl: generatePhotoUrl(303),
    storeName: '北京朝阳店',
  },
  {
    id: 'rect-4',
    storeId: 'store-2',
    annotationId: 'ann-photo-2-0-0',
    photoId: 'photo-2-0',
    batchId: 'batch-2',
    description: '商品价签与实际商品不匹配',
    issueType: 'WRONG_PRICE',
    status: 'PENDING',
    deadline: '2026-06-18',
    createdAt: '2026-06-11T17:00:00',
    completedAt: null,
    photoUrl: generatePhotoUrl(1111),
    storeName: '上海静安店',
  },
  {
    id: 'rect-5',
    storeId: 'store-2',
    annotationId: 'ann-photo-2-1-1',
    photoId: 'photo-2-1',
    batchId: 'batch-2',
    description: '排面商品数量不足，需补充至标准排面',
    issueType: 'INSUFFICIENT_SHELF',
    status: 'REJECTED',
    deadline: '2026-06-18',
    createdAt: '2026-06-11T17:00:00',
    completedAt: null,
    photoUrl: generatePhotoUrl(1212),
    storeName: '上海静安店',
  },
  {
    id: 'rect-6',
    storeId: 'store-3',
    annotationId: 'ann-photo-3-0-0',
    photoId: 'photo-3-0',
    batchId: 'batch-3',
    description: '第三层货架多处缺少价签',
    issueType: 'MISSING_PRICE',
    status: 'PENDING',
    deadline: '2026-06-19',
    createdAt: '2026-06-12T16:00:00',
    completedAt: null,
    photoUrl: generatePhotoUrl(1111),
    storeName: '广州天河店',
  },
]

export const REPORTS: Report[] = [
  {
    id: 'report-1',
    batchId: 'batch-1',
    storeId: 'store-1',
    storeName: '北京朝阳店',
    generatedAt: '2026-06-10T18:00:00',
    supervisorName: '王建国',
    totalPhotos: 10,
    totalIssues: 18,
    confirmedIssues: 8,
    rejectedIssues: 3,
    pendingIssues: 7,
    issueBreakdown: {
      MISSING_PRICE: 5,
      WRONG_PRICE: 3,
      INSUFFICIENT_SHELF: 4,
      COMPETITOR_MIX: 3,
      DISPLAY_BLOCKED: 3,
    },
    date: '2026-06-10',
  },
  {
    id: 'report-2',
    batchId: 'batch-2',
    storeId: 'store-2',
    storeName: '上海静安店',
    generatedAt: '2026-06-11T18:00:00',
    supervisorName: '王建国',
    totalPhotos: 8,
    totalIssues: 12,
    confirmedIssues: 5,
    rejectedIssues: 2,
    pendingIssues: 5,
    issueBreakdown: {
      MISSING_PRICE: 3,
      WRONG_PRICE: 2,
      INSUFFICIENT_SHELF: 3,
      COMPETITOR_MIX: 2,
      DISPLAY_BLOCKED: 2,
    },
    date: '2026-06-11',
  },
  {
    id: 'report-3',
    batchId: 'batch-3',
    storeId: 'store-3',
    storeName: '广州天河店',
    generatedAt: '2026-06-12T18:00:00',
    supervisorName: '李明辉',
    totalPhotos: 12,
    totalIssues: 22,
    confirmedIssues: 0,
    rejectedIssues: 0,
    pendingIssues: 22,
    issueBreakdown: {
      MISSING_PRICE: 6,
      WRONG_PRICE: 4,
      INSUFFICIENT_SHELF: 5,
      COMPETITOR_MIX: 4,
      DISPLAY_BLOCKED: 3,
    },
    date: '2026-06-12',
  },
]
