import type { Project, ComponentItem, Annotation, Photo, Disease, Measurement, RepairSuggestion, Reinspection, Viewpoint, ReviewTask, ReviewItem, ExpertOpinion } from '@/types'

export const DEMO_PROJECT: Project = {
  id: 'proj-1',
  name: '东岳庙大殿梁架',
  description: '东岳庙大殿为明代建筑，面阔五间，进深三间，抬梁式木构架。本次勘查重点为东次间梁架构件病害标注。',
  modelUrl: '',
  createdAt: '2024-03-15T08:00:00Z',
  updatedAt: '2024-06-10T14:30:00Z',
}

export const DEMO_COMPONENTS: ComponentItem[] = [
  { id: 'comp-1', projectId: 'proj-1', name: '东次间五架梁', code: 'L-E2-01', type: 'beam', material: '杉木', dimensions: '长5.2m × 宽0.35m × 高0.55m', parentId: '', positionX: -2, positionY: 3.5, positionZ: 0, createdAt: '2024-03-15T10:00:00Z' },
  { id: 'comp-2', projectId: 'proj-1', name: '东次间三架梁', code: 'L-E2-02', type: 'beam', material: '杉木', dimensions: '长2.8m × 宽0.30m × 高0.45m', parentId: '', positionX: -2, positionY: 5.2, positionZ: 0, createdAt: '2024-03-15T10:05:00Z' },
  { id: 'comp-3', projectId: 'proj-1', name: '东次间上金檩', code: 'P-E2-03', type: 'purlin', material: '杉木', dimensions: '长5.0m × 直径0.22m', parentId: '', positionX: -2, positionY: 4.8, positionZ: -1.2, createdAt: '2024-03-15T10:10:00Z' },
  { id: 'comp-4', projectId: 'proj-1', name: '东次间下金檩', code: 'P-E2-04', type: 'purlin', material: '杉木', dimensions: '长5.0m × 直径0.24m', parentId: '', positionX: -2, positionY: 3.2, positionZ: -1.2, createdAt: '2024-03-15T10:15:00Z' },
  { id: 'comp-5', projectId: 'proj-1', name: '东次间檐檩', code: 'P-E2-05', type: 'purlin', material: '杉木', dimensions: '长5.0m × 直径0.20m', parentId: '', positionX: -2, positionY: 2.8, positionZ: -2.5, createdAt: '2024-03-15T10:20:00Z' },
  { id: 'comp-6', projectId: 'proj-1', name: '东次间前檐柱', code: 'C-E2-06', type: 'pillar', material: '楠木', dimensions: '高4.2m × 直径0.40m', parentId: '', positionX: -2, positionY: 1.5, positionZ: -2.5, createdAt: '2024-03-15T10:25:00Z' },
  { id: 'comp-7', projectId: 'proj-1', name: '东次间后檐柱', code: 'C-E2-07', type: 'pillar', material: '楠木', dimensions: '高4.2m × 直径0.40m', parentId: '', positionX: -2, positionY: 1.5, positionZ: 2.5, createdAt: '2024-03-15T10:30:00Z' },
  { id: 'comp-8', projectId: 'proj-1', name: '东次间前金柱', code: 'C-E2-08', type: 'pillar', material: '楠木', dimensions: '高5.5m × 直径0.45m', parentId: '', positionX: -2, positionY: 2.0, positionZ: -1.2, createdAt: '2024-03-15T10:35:00Z' },
  { id: 'comp-9', projectId: 'proj-1', name: '东次间斗拱组', code: 'D-E2-09', type: 'dougong', material: '杉木', dimensions: '出跳3踩', parentId: '', positionX: -2, positionY: 2.8, positionZ: -2.3, createdAt: '2024-03-15T10:40:00Z' },
  { id: 'comp-10', projectId: 'proj-1', name: '东次间脊檩', code: '', type: 'purlin', material: '杉木', dimensions: '长5.0m × 直径0.26m', parentId: '', positionX: -2, positionY: 5.8, positionZ: 0, createdAt: '2024-03-15T10:45:00Z' },
  { id: 'comp-11', projectId: 'proj-1', name: '明间五架梁', code: 'L-C1-01', type: 'beam', material: '杉木', dimensions: '长5.4m × 宽0.38m × 高0.58m', parentId: '', positionX: 0, positionY: 3.5, positionZ: 0, createdAt: '2024-03-16T09:00:00Z' },
  { id: 'comp-12', projectId: 'proj-1', name: '西次间下金檩', code: 'P-W2-04', type: 'purlin', material: '杉木', dimensions: '长5.0m × 直径0.23m', parentId: '', positionX: 2, positionY: 3.2, positionZ: -1.2, createdAt: '2024-03-16T09:30:00Z' },
]

export const DEMO_ANNOTATIONS: Annotation[] = [
  { id: 'ann-1', componentId: 'comp-3', type: 'disease', positionX: -2.1, positionY: 4.85, positionZ: -1.15, label: '纵向裂缝', description: '上金檩东侧1/3处纵向裂缝' },
  { id: 'ann-2', componentId: 'comp-1', type: 'disease', positionX: -1.8, positionY: 3.55, positionZ: 0.3, label: '虫蛀', description: '五架梁底面虫蛀孔洞' },
  { id: 'ann-3', componentId: 'comp-6', type: 'disease', positionX: -2.05, positionY: 1.0, positionZ: -2.45, label: '糟朽', description: '前檐柱根部糟朽' },
  { id: 'ann-4', componentId: 'comp-9', type: 'disease', positionX: -1.95, positionY: 2.9, positionZ: -2.25, label: '变形', description: '斗拱华拱变形下倾' },
  { id: 'ann-5', componentId: 'comp-3', type: 'purlin', positionX: -2, positionY: 4.8, positionZ: -1.2, label: '东次间上金檩', description: '' },
  { id: 'ann-6', componentId: 'comp-1', type: 'beam', positionX: -2, positionY: 3.5, positionZ: 0, label: '东次间五架梁', description: '' },
  { id: 'ann-7', componentId: 'comp-6', type: 'pillar', positionX: -2, positionY: 1.5, positionZ: -2.5, label: '东次间前檐柱', description: '' },
  { id: 'ann-8', componentId: 'comp-9', type: 'dougong', positionX: -2, positionY: 2.8, positionZ: -2.3, label: '东次间斗拱组', description: '' },
  { id: 'ann-9', componentId: 'comp-4', type: 'purlin', positionX: -2, positionY: 3.2, positionZ: -1.2, label: '东次间下金檩', description: '' },
  { id: 'ann-10', componentId: 'comp-2', type: 'beam', positionX: -2, positionY: 5.2, positionZ: 0, label: '东次间三架梁', description: '' },
  { id: 'ann-11', componentId: 'comp-5', type: 'purlin', positionX: -2, positionY: 2.8, positionZ: -2.5, label: '东次间檐檩', description: '' },
  { id: 'ann-12', componentId: 'comp-7', type: 'pillar', positionX: -2, positionY: 1.5, positionZ: 2.5, label: '东次间后檐柱', description: '' },
  { id: 'ann-13', componentId: 'comp-8', type: 'pillar', positionX: -2, positionY: 2.0, positionZ: -1.2, label: '东次间前金柱', description: '' },
  { id: 'ann-14', componentId: 'comp-10', type: 'purlin', positionX: -2, positionY: 5.8, positionZ: 0, label: '东次间脊檩', description: '' },
  { id: 'ann-15', componentId: 'comp-11', type: 'beam', positionX: 0, positionY: 3.5, positionZ: 0, label: '明间五架梁', description: '' },
  { id: 'ann-16', componentId: 'comp-12', type: 'purlin', positionX: 2, positionY: 3.2, positionZ: -1.2, label: '西次间下金檩', description: '' },
]

export const DEMO_PHOTOS: Photo[] = [
  { id: 'photo-1', componentId: 'comp-3', angle: 'side', description: '上金檩东侧纵向裂缝近景', takenAt: '2024-03-20T10:30:00Z', takenBy: '张工', thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=ancient%20chinese%20wooden%20purlin%20with%20longitudinal%20crack%20close-up%20photograph%20heritage%20conservation&image_size=landscape_4_3' },
  { id: 'photo-2', componentId: 'comp-3', angle: 'front', description: '上金檩整体正视', takenAt: '2024-03-20T10:35:00Z', takenBy: '张工', thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=ancient%20chinese%20temple%20purlin%20front%20view%20photograph%20wooden%20beam&image_size=landscape_4_3' },
  { id: 'photo-3', componentId: 'comp-1', angle: 'bottom', description: '五架梁底面虫蛀孔洞', takenAt: '2024-03-20T11:00:00Z', takenBy: '李工', thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=ancient%20chinese%20wooden%20beam%20bottom%20insect%20damage%20holes%20photograph&image_size=landscape_4_3' },
  { id: 'photo-4', componentId: 'comp-6', angle: 'unknown', description: '前檐柱根部状况（角度待确认）', takenAt: '2024-03-20T14:00:00Z', takenBy: '王工', thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=ancient%20chinese%20wooden%20pillar%20base%20rot%20damage%20photograph%20heritage&image_size=landscape_4_3' },
  { id: 'photo-5', componentId: 'comp-9', angle: 'side', description: '斗拱华拱侧视变形情况', takenAt: '2024-03-21T09:30:00Z', takenBy: '张工', thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=ancient%20chinese%20dougong%20bracket%20deformation%20side%20view%20photograph%20temple&image_size=landscape_4_3' },
]

export const DEMO_DISEASES: Disease[] = [
  { id: 'dis-1', componentId: 'comp-3', type: '裂缝', description: '东次间上金檩东侧1/3处纵向裂缝，缝宽3-8mm，缝长约1.2m，深度约30mm', severity: 'high', discoveredAt: '2024-03-20T10:30:00Z', discoveredBy: '张工' },
  { id: 'dis-2', componentId: 'comp-1', type: '虫蛀', description: '五架梁底面发现虫蛀孔洞3处，孔径2-5mm，局部木纤维脱落', severity: 'medium', discoveredAt: '2024-03-20T11:00:00Z', discoveredBy: '李工' },
  { id: 'dis-3', componentId: 'comp-6', type: '糟朽', description: '前檐柱根部距地面200mm范围内糟朽，糟朽深度约30mm，面积约200×150mm', severity: 'critical', discoveredAt: '2024-03-20T14:00:00Z', discoveredBy: '王工' },
  { id: 'dis-4', componentId: 'comp-9', type: '变形', description: '斗拱华拱前端下倾约15mm，翘度超限', severity: 'medium', discoveredAt: '2024-03-21T09:30:00Z', discoveredBy: '张工' },
]

export const DEMO_MEASUREMENTS: Measurement[] = [
  { id: 'meas-1', componentId: 'comp-3', metricName: '裂缝宽度', value: 8, unit: 'mm', measuredAt: '2024-03-20T10:30:00Z', measuredBy: '张工' },
  { id: 'meas-2', componentId: 'comp-3', metricName: '裂缝长度', value: 1200, unit: 'mm', measuredAt: '2024-03-20T10:30:00Z', measuredBy: '张工' },
  { id: 'meas-3', componentId: 'comp-3', metricName: '裂缝深度', value: 30, unit: 'mm', measuredAt: '2024-03-20T10:30:00Z', measuredBy: '张工' },
  { id: 'meas-4', componentId: 'comp-3', metricName: '裂缝宽度', value: 10, unit: 'mm', measuredAt: '2024-06-15T10:00:00Z', measuredBy: '张工' },
  { id: 'meas-5', componentId: 'comp-6', metricName: '糟朽深度', value: 30, unit: 'mm', measuredAt: '2024-03-20T14:00:00Z', measuredBy: '王工' },
  { id: 'meas-6', componentId: 'comp-9', metricName: '下倾量', value: 15, unit: 'mm', measuredAt: '2024-03-21T09:30:00Z', measuredBy: '张工' },
]

export const DEMO_REPAIR_SUGGESTIONS: RepairSuggestion[] = [
  { id: 'rep-1', componentId: 'comp-3', suggestion: '对纵向裂缝采用环氧树脂灌注加固，裂缝表面贴覆碳纤维布补强', responsiblePerson: '赵工', plannedDate: '2024-09-01', status: 'pending' },
  { id: 'rep-2', componentId: 'comp-1', suggestion: '虫蛀区域清除腐朽木纤维后，采用木条嵌补+防虫剂处理', responsiblePerson: '李工', plannedDate: '2024-08-15', status: 'in_progress' },
  { id: 'rep-3', componentId: 'comp-6', suggestion: '根部糟朽区域剔除后，采用同材质木料墩接，外加铁箍固定', responsiblePerson: '赵工', plannedDate: '2024-10-01', status: 'pending' },
  { id: 'rep-4', componentId: 'comp-9', suggestion: '华拱复位后增设暗销固定，检查相邻斗拱连接状况', responsiblePerson: '张工', plannedDate: '2024-09-15', status: 'pending' },
]

export const DEMO_REINSPECTIONS: Reinspection[] = [
  { id: 'rein-1', diseaseId: 'dis-1', taskId: 'task-1', inspectedAt: '2024-06-15T10:00:00Z', inspectedBy: '张工', conclusion: '裂缝宽度由3-8mm扩展至5-10mm，建议尽快处理', isExpanded: true, notes: '裂缝两端有延伸趋势' },
  { id: 'rein-2', diseaseId: 'dis-2', taskId: 'task-1', inspectedAt: '2024-06-15T11:00:00Z', inspectedBy: '李工', conclusion: '虫蛀区域已做防虫处理，暂无新虫蛀孔洞', isExpanded: false, notes: '继续观察' },
  { id: 'rein-3', diseaseId: 'dis-1', taskId: 'task-2', inspectedAt: '2025-06-10T10:00:00Z', inspectedBy: '张工', conclusion: '经灌注加固后裂缝稳定，未继续扩展', isExpanded: false, notes: '建议纳入下一年度复查计划' },
]

export const DEMO_VIEWPOINTS: Viewpoint[] = [
  { id: 'vp-1', projectId: 'proj-1', name: '东次间全景', camera: { position: { x: -5, y: 4, z: -4 }, rotation: { x: -0.3, y: 0.5, z: 0 }, fov: 50 }, target: { x: -2, y: 3, z: 0 }, createdAt: '2024-03-15T11:00:00Z' },
  { id: 'vp-2', projectId: 'proj-1', name: '上金檩裂缝特写', camera: { position: { x: -2.5, y: 5.0, z: -1.8 }, rotation: { x: -0.2, y: 0.1, z: 0 }, fov: 35 }, target: { x: -2.1, y: 4.85, z: -1.15 }, createdAt: '2024-03-20T10:40:00Z' },
  { id: 'vp-3', projectId: 'proj-1', name: '斗拱正视', camera: { position: { x: -4, y: 3, z: -2.3 }, rotation: { x: -0.1, y: 0, z: 0 }, fov: 45 }, target: { x: -2, y: 2.8, z: -2.3 }, createdAt: '2024-03-21T09:45:00Z' },
]

export const DEMO_REVIEW_TASKS: ReviewTask[] = [
  { id: 'task-1', projectId: 'proj-1', title: '2024年度上半年复查', year: 2024, assignedTo: '张工', deadline: '2024-06-30', status: 'completed' },
  { id: 'task-2', projectId: 'proj-1', title: '2025年度复查', year: 2025, assignedTo: '张工', deadline: '2025-06-30', status: 'in_progress' },
]

export const DEMO_REVIEW_ITEMS: ReviewItem[] = [
  { id: 'ri-1', diseaseId: 'dis-1', title: '东次间上金檩纵向裂缝', status: 'reviewing', exportedAt: '2024-07-01T09:00:00Z' },
  { id: 'ri-2', diseaseId: 'dis-2', title: '东次间五架梁虫蛀', status: 'reviewed', exportedAt: '2024-07-01T09:00:00Z' },
  { id: 'ri-3', diseaseId: 'dis-3', title: '东次间前檐柱根部糟朽', status: 'pending', exportedAt: '2024-07-01T09:00:00Z' },
  { id: 'ri-4', diseaseId: 'dis-4', title: '东次间斗拱华拱变形', status: 'pending', exportedAt: '2024-07-01T09:00:00Z' },
]

export const DEMO_EXPERT_OPINIONS: ExpertOpinion[] = [
  { id: 'eo-1', reviewItemId: 'ri-2', expertName: '陈教授', opinion: '虫蛀处理方案合理，防虫剂建议选用硼化物类，对木构无损。处理后应持续观察2年。', verdict: 'approve', createdAt: '2024-07-10T15:00:00Z' },
  { id: 'eo-2', reviewItemId: 'ri-1', expertName: '刘研究员', opinion: '裂缝灌注方案可行，但建议先做裂缝深度精确测定，确认是否贯通。如贯通需考虑双侧灌浆。', verdict: 'modify', createdAt: '2024-07-12T10:00:00Z' },
]

export function loadDemoData() {
  const { useStore } = require('@/store')
  const state = useStore.getState()

  if (state.project) return

  useStore.setState({
    project: DEMO_PROJECT,
    components: DEMO_COMPONENTS,
    annotations: DEMO_ANNOTATIONS,
    photos: DEMO_PHOTOS,
    measurements: DEMO_MEASUREMENTS,
    diseases: DEMO_DISEASES,
    repairSuggestions: DEMO_REPAIR_SUGGESTIONS,
    reinspections: DEMO_REINSPECTIONS,
    viewpoints: DEMO_VIEWPOINTS,
    reviewTasks: DEMO_REVIEW_TASKS,
    reviewItems: DEMO_REVIEW_ITEMS,
    expertOpinions: DEMO_EXPERT_OPINIONS,
  })

  useStore.getState().generateAlerts()
}
