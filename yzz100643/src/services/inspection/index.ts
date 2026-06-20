import type { 
  ArchiveRecord, 
  InspectionTask, 
  InspectionItem, 
  InspectionStrategy,
  FieldType 
} from '@/types';
import { generateId } from '@/utils/common';

interface InspectionConfig {
  strategy?: InspectionStrategy;
  sampleRatio?: number;
  sampleCount?: number;
  priorityWeights?: {
    date: number;
    documentNumber: number;
    name: number;
    pageNumber: number;
    materialType: number;
  };
}

const defaultConfig: Required<InspectionConfig> = {
  strategy: 'weighted',
  sampleRatio: 0.2,
  sampleCount: 0,
  priorityWeights: {
    date: 3.0,
    documentNumber: 2.5,
    name: 2.0,
    pageNumber: 1.5,
    materialType: 1.0
  }
};

const getPriorityLevel = (score: number): 'critical' | 'high' | 'medium' | 'low' => {
  if (score >= 0.8) return 'critical';
  if (score >= 0.6) return 'high';
  if (score >= 0.4) return 'medium';
  return 'low';
};

const calculateFieldPriority = (
  record: ArchiveRecord,
  fieldName: FieldType,
  weights: typeof defaultConfig.priorityWeights
): number => {
  const field = record.fields.find(f => f.fieldName === fieldName);
  if (!field) return 0;
  
  const weight = weights[fieldName];
  const confidenceScore = 1 - field.confidence;
  const ambiguityScore = field.isAmbiguous ? 0.3 : 0;
  const missingScore = !field.ocrValue ? 0.4 : 0;
  
  let sameNameScore = 0;
  if (fieldName === 'name' && record.hasSameNameWarning) {
    sameNameScore = 0.3;
  }
  
  let missingPageScore = 0;
  if (fieldName === 'pageNumber' && record.hasMissingPage) {
    missingPageScore = 0.3;
  }
  
  const baseScore = (confidenceScore + ambiguityScore + missingScore + sameNameScore + missingPageScore) / 3;
  const weightedScore = baseScore * weight;
  
  return Math.min(1, weightedScore);
};

const lowConfidenceFirstStrategy = (
  records: ArchiveRecord[],
  sampleCount: number,
  weights: typeof defaultConfig.priorityWeights
): InspectionItem[] => {
  const items: InspectionItem[] = [];
  
  for (const record of records) {
    for (const field of record.fields) {
      if (field.isLowConfidence || field.isAmbiguous || !field.ocrValue) {
        const priority = calculateFieldPriority(record, field.fieldName, weights);
        items.push({
          id: generateId(),
          taskId: '',
          recordId: record.id,
          fieldName: field.fieldName,
          priority,
          priorityLevel: getPriorityLevel(priority),
          status: 'pending',
          ocrValue: field.ocrValue,
          correctedValue: field.correctedValue
        });
      }
    }
  }
  
  items.sort((a, b) => b.priority - a.priority);
  
  return items.slice(0, sampleCount);
};

const stratifiedStrategy = (
  records: ArchiveRecord[],
  sampleCount: number,
  weights: typeof defaultConfig.priorityWeights
): InspectionItem[] => {
  const items: InspectionItem[] = [];
  
  const byMaterialType = new Map<string, ArchiveRecord[]>();
  for (const record of records) {
    const typeField = record.fields.find(f => f.fieldName === 'materialType');
    const type = typeField?.ocrValue || '未分类';
    if (!byMaterialType.has(type)) {
      byMaterialType.set(type, []);
    }
    byMaterialType.get(type)!.push(record);
  }
  
  const totalRecords = records.length;
  
  for (const [_type, typeRecords] of byMaterialType) {
    const strataSize = typeRecords.length;
    const strataSampleRatio = strataSize / totalRecords;
    const strataSampleCount = Math.max(1, Math.round(sampleCount * strataSampleRatio));
    
    const strataItems: InspectionItem[] = [];
    for (const record of typeRecords) {
      for (const field of record.fields) {
        const priority = calculateFieldPriority(record, field.fieldName, weights);
        strataItems.push({
          id: generateId(),
          taskId: '',
          recordId: record.id,
          fieldName: field.fieldName,
          priority,
          priorityLevel: getPriorityLevel(priority),
          status: 'pending',
          ocrValue: field.ocrValue,
          correctedValue: field.correctedValue
        });
      }
    }
    
    strataItems.sort((a, b) => b.priority - a.priority);
    items.push(...strataItems.slice(0, strataSampleCount));
  }
  
  items.sort((a, b) => b.priority - a.priority);
  
  return items.slice(0, sampleCount);
};

const randomStrategy = (
  records: ArchiveRecord[],
  sampleCount: number,
  weights: typeof defaultConfig.priorityWeights
): InspectionItem[] => {
  const allItems: InspectionItem[] = [];
  
  for (const record of records) {
    for (const field of record.fields) {
      const priority = calculateFieldPriority(record, field.fieldName, weights);
      allItems.push({
        id: generateId(),
        taskId: '',
        recordId: record.id,
        fieldName: field.fieldName,
        priority,
        priorityLevel: getPriorityLevel(priority),
        status: 'pending',
        ocrValue: field.ocrValue,
        correctedValue: field.correctedValue
      });
    }
  }
  
  for (let i = allItems.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allItems[i], allItems[j]] = [allItems[j], allItems[i]];
  }
  
  return allItems.slice(0, sampleCount);
};

const weightedStrategy = (
  records: ArchiveRecord[],
  sampleCount: number,
  weights: typeof defaultConfig.priorityWeights
): InspectionItem[] => {
  const items: InspectionItem[] = [];
  const allItems: InspectionItem[] = [];
  
  for (const record of records) {
    for (const field of record.fields) {
      const priority = calculateFieldPriority(record, field.fieldName, weights);
      allItems.push({
        id: generateId(),
        taskId: '',
        recordId: record.id,
        fieldName: field.fieldName,
        priority,
        priorityLevel: getPriorityLevel(priority),
        status: 'pending',
        ocrValue: field.ocrValue,
        correctedValue: field.correctedValue
      });
    }
  }
  
  const totalWeight = allItems.reduce((sum, item) => sum + item.priority + 0.1, 0);
  const cumulativeWeights: number[] = [];
  let cumulative = 0;
  
  for (const item of allItems) {
    cumulative += (item.priority + 0.1) / totalWeight;
    cumulativeWeights.push(cumulative);
  }
  
  const selectedIndices = new Set<number>();
  const maxAttempts = sampleCount * 10;
  let attempts = 0;
  
  while (selectedIndices.size < sampleCount && attempts < maxAttempts) {
    const rand = Math.random();
    for (let i = 0; i < cumulativeWeights.length; i++) {
      if (rand <= cumulativeWeights[i] && !selectedIndices.has(i)) {
        selectedIndices.add(i);
        break;
      }
    }
    attempts++;
  }
  
  for (const index of selectedIndices) {
    items.push(allItems[index]);
  }
  
  items.sort((a, b) => b.priority - a.priority);
  
  return items;
};

export const generateInspectionTask = (
  projectId: string,
  records: ArchiveRecord[],
  name: string,
  config: InspectionConfig = {}
): InspectionTask & { items: InspectionItem[] } => {
  const mergedConfig = { ...defaultConfig, ...config };
  
  let sampleCount = mergedConfig.sampleCount;
  if (sampleCount === 0 || sampleCount > records.length * 5) {
    sampleCount = Math.max(1, Math.round(records.length * mergedConfig.sampleRatio));
  }
  sampleCount = Math.min(sampleCount, records.length * 5);
  
  let items: InspectionItem[] = [];
  
  switch (mergedConfig.strategy) {
    case 'lowConfidenceFirst':
      items = lowConfidenceFirstStrategy(records, sampleCount, mergedConfig.priorityWeights);
      break;
    case 'stratified':
      items = stratifiedStrategy(records, sampleCount, mergedConfig.priorityWeights);
      break;
    case 'random':
      items = randomStrategy(records, sampleCount, mergedConfig.priorityWeights);
      break;
    case 'weighted':
    default:
      items = weightedStrategy(records, sampleCount, mergedConfig.priorityWeights);
      break;
  }
  
  const taskId = generateId();
  items.forEach(item => item.taskId = taskId);
  
  const task: InspectionTask & { items: InspectionItem[] } = {
    id: taskId,
    projectId,
    name,
    strategy: mergedConfig.strategy,
    sampleCount: items.length,
    totalRecords: records.length,
    completedCount: 0,
    status: 'created',
    createdAt: Date.now(),
    priorityWeights: mergedConfig.priorityWeights,
    items
  };
  
  return task;
};

export const updateInspectionItem = (
  item: InspectionItem,
  status: 'pass' | 'fail' | 'recheck',
  notes?: string,
  correctedValue?: string
): InspectionItem => {
  return {
    ...item,
    status,
    notes,
    correctedValue: correctedValue || item.correctedValue,
    reviewedBy: '当前用户',
    reviewedAt: Date.now()
  };
};

export const getInspectionStats = (items: InspectionItem[]): {
  total: number;
  pending: number;
  pass: number;
  fail: number;
  recheck: number;
  byPriority: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  byField: Record<FieldType, number>;
} => {
  const stats = {
    total: items.length,
    pending: 0,
    pass: 0,
    fail: 0,
    recheck: 0,
    byPriority: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    },
    byField: {
      name: 0,
      date: 0,
      documentNumber: 0,
      pageNumber: 0,
      materialType: 0
    } as Record<FieldType, number>
  };
  
  for (const item of items) {
    stats[item.status]++;
    stats.byPriority[item.priorityLevel]++;
    stats.byField[item.fieldName]++;
  }
  
  return stats;
};

export const getStrategyLabel = (strategy: InspectionStrategy): string => {
  const labels: Record<InspectionStrategy, string> = {
    lowConfidenceFirst: '低置信优先',
    stratified: '分层抽样',
    random: '随机抽样',
    weighted: '加权混合'
  };
  return labels[strategy];
};

export default {
  generateInspectionTask,
  updateInspectionItem,
  getInspectionStats,
  getStrategyLabel
};
