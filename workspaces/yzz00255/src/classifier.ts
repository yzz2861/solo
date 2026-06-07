import {
  HotlineRecord,
  ProcessedRecord,
  ClassificationConfig,
  SnapshotRecord,
  RecordStatus,
  AbnormalType,
  TaskStatus,
  RuleMatchResult,
} from './types';
import { validateRequiredFields } from './csv-reader';
import { matchAllRules, detectRuleConflict, getTopPriorityRule, getMatchedRules } from './rules-engine';
import { checkDuplicate, findSnapshotRecord } from './snapshot';

export interface ClassifyOptions {
  batchId: string;
  strictMode?: boolean;
}

export interface ClassifyResult {
  processedRecords: ProcessedRecord[];
  normalRecords: ProcessedRecord[];
  abnormalRecords: ProcessedRecord[];
  pendingRecords: ProcessedRecord[];
}

export function classifyRecords(
  records: HotlineRecord[],
  config: ClassificationConfig,
  snapshots: SnapshotRecord[],
  options: ClassifyOptions
): ClassifyResult {
  const processedRecords: ProcessedRecord[] = [];
  const normalRecords: ProcessedRecord[] = [];
  const abnormalRecords: ProcessedRecord[] = [];
  const pendingRecords: ProcessedRecord[] = [];

  const processedHotlineRecords: HotlineRecord[] = [];

  for (const record of records) {
    const processed = processRecord(
      record,
      config,
      snapshots,
      processedHotlineRecords,
      options
    );

    processedRecords.push(processed);

    if (processed.status === 'normal') {
      normalRecords.push(processed);
    } else if (processed.status === 'abnormal') {
      abnormalRecords.push(processed);
    } else {
      pendingRecords.push(processed);
    }

    processedHotlineRecords.push(record);
  }

  return {
    processedRecords,
    normalRecords,
    abnormalRecords,
    pendingRecords,
  };
}

function processRecord(
  record: HotlineRecord,
  config: ClassificationConfig,
  snapshots: SnapshotRecord[],
  processedRecords: HotlineRecord[],
  options: ClassifyOptions
): ProcessedRecord {
  const sourceRow = (record as any).__rowNumber || 0;
  const abnormalTypes: AbnormalType[] = [];
  const abnormalReasons: string[] = [];

  const fieldValidation = validateRequiredFields(record, config.requiredFields);
  if (!fieldValidation.valid) {
    abnormalTypes.push('missing_field');
    abnormalReasons.push(`缺少必填字段: ${fieldValidation.missingFields.join(', ')}`);
  }

  const ruleResults = matchAllRules(record, config.rules);
  const matchedRules = getMatchedRules(ruleResults);

  const conflict = detectRuleConflict(matchedRules);
  let hasRuleConflict = false;
  if (conflict.hasConflict && matchedRules.length > 1) {
    hasRuleConflict = true;
    abnormalTypes.push('rule_conflict');
    abnormalReasons.push(
      `规则冲突: 匹配到${matchedRules.length}条规则，涉及分类[${conflict.categories.join(', ')}]、部门[${conflict.departments.join(', ')}]`
    );
  }

  const duplicateCheck = checkDuplicate(
    record,
    config.duplicateCheckFields,
    processedRecords,
    snapshots
  );
  if (duplicateCheck.isDuplicate) {
    abnormalTypes.push('duplicate');
    abnormalReasons.push(
      `重复诉求: 与记录 ${duplicateCheck.duplicateOf} 重复，匹配字段: ${duplicateCheck.duplicateFields.join(', ')}`
    );
  }

  const topRule = getTopPriorityRule(matchedRules, config.rules);
  const category = topRule?.category || config.defaultCategory;
  const department = topRule?.department || config.defaultDepartment;

  let status: RecordStatus = 'normal';
  let taskStatus: TaskStatus = 'classified';

  if (abnormalTypes.length > 0) {
    if (hasRuleConflict || duplicateCheck.isDuplicate) {
      status = 'pending';
      taskStatus = 'pending_review';
    } else {
      status = 'abnormal';
      taskStatus = 'rejected';
    }
  }

  const previousSnapshot = findSnapshotRecord(record.id, snapshots);

  return {
    record,
    sourceRow,
    status,
    category,
    department,
    matchedRules: ruleResults,
    abnormalTypes,
    abnormalReasons,
    taskStatus,
    isDuplicate: duplicateCheck.isDuplicate,
    duplicateOf: duplicateCheck.duplicateOf,
    hasRuleConflict,
    conflictingRules: conflict.conflictingRules,
    processingTime: new Date().toISOString(),
    batchId: options.batchId,
    previousSnapshot,
  };
}

export function generateSummary(
  result: ClassifyResult,
  batchId: string
) {
  const { processedRecords, normalRecords, abnormalRecords, pendingRecords } = result;

  const missingFieldCount = abnormalRecords.filter((r) =>
    r.abnormalTypes.includes('missing_field')
  ).length;

  const ruleConflictCount = processedRecords.filter((r) =>
    r.abnormalTypes.includes('rule_conflict')
  ).length;

  const duplicateCount = processedRecords.filter((r) =>
    r.abnormalTypes.includes('duplicate')
  ).length;

  return {
    totalRecords: processedRecords.length,
    normalRecords: normalRecords.length,
    abnormalRecords: abnormalRecords.length,
    pendingRecords: pendingRecords.length,
    missingFieldCount,
    ruleConflictCount,
    duplicateCount,
    processingTime: new Date().toISOString(),
    batchId,
  };
}
