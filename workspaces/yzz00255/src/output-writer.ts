import * as fs from 'fs';
import * as path from 'path';
import { stringify } from 'csv-stringify/sync';
import { ProcessedRecord, OutputSummary } from './types';

export interface OutputFiles {
  normal: string;
  abnormal: string;
  pending: string;
  summary: string;
  traceLog: string;
}

export function writeOutput(
  normalRecords: ProcessedRecord[],
  abnormalRecords: ProcessedRecord[],
  pendingRecords: ProcessedRecord[],
  summary: OutputSummary,
  outputDir: string
): OutputFiles {
  const absoluteDir = path.resolve(outputDir);

  if (!fs.existsSync(absoluteDir)) {
    fs.mkdirSync(absoluteDir, { recursive: true });
  }

  const normalPath = path.join(absoluteDir, 'normal.csv');
  const abnormalPath = path.join(absoluteDir, 'abnormal.csv');
  const pendingPath = path.join(absoluteDir, 'pending_review.csv');
  const summaryPath = path.join(absoluteDir, 'summary.json');
  const traceLogPath = path.join(absoluteDir, 'trace_log.csv');

  fs.writeFileSync(normalPath, generateNormalCsv(normalRecords));
  fs.writeFileSync(abnormalPath, generateAbnormalCsv(abnormalRecords));
  fs.writeFileSync(pendingPath, generatePendingCsv(pendingRecords));
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  fs.writeFileSync(traceLogPath, generateTraceLog([...normalRecords, ...abnormalRecords, ...pendingRecords]));

  return {
    normal: normalPath,
    abnormal: abnormalPath,
    pending: pendingPath,
    summary: summaryPath,
    traceLog: traceLogPath,
  };
}

function generateNormalCsv(records: ProcessedRecord[]): string {
  if (records.length === 0) {
    return stringify([], { header: true, columns: [] });
  }

  const columns = Object.keys(records[0].record).filter((k) => k !== '__rowNumber');
  const outputColumns = [
    ...columns,
    '分类结果',
    '归属部门',
    '任务状态',
    '匹配规则数',
    '处理时间',
    '批次号',
  ];

  const rows = records.map((r) => {
    const recordCopy = { ...r.record } as any;
    delete recordCopy.__rowNumber;
    return {
      ...recordCopy,
      '分类结果': r.category || '',
      '归属部门': r.department || '',
      '任务状态': r.taskStatus,
      '匹配规则数': r.matchedRules.filter((m) => m.matched).length,
      '处理时间': r.processingTime,
      '批次号': r.batchId,
    };
  });

  return stringify(rows, { header: true, columns: outputColumns as any });
}

function generateAbnormalCsv(records: ProcessedRecord[]): string {
  const outputColumns = [
    '来源行号',
    '记录ID',
    '标题',
    '异常类型',
    '异常原因',
    '原始内容',
    '任务状态',
    '处理时间',
    '批次号',
  ];

  const rows = records.map((r) => ({
    '来源行号': r.sourceRow,
    '记录ID': r.record.id || '',
    '标题': r.record.title || '',
    '异常类型': r.abnormalTypes.join('; '),
    '异常原因': r.abnormalReasons.join(' | '),
    '原始内容': JSON.stringify(r.record),
    '任务状态': r.taskStatus,
    '处理时间': r.processingTime,
    '批次号': r.batchId,
  }));

  return stringify(rows, { header: true, columns: outputColumns as any });
}

function generatePendingCsv(records: ProcessedRecord[]): string {
  const outputColumns = [
    '来源行号',
    '记录ID',
    '标题',
    '内容',
    '建议分类',
    '建议部门',
    '待复核原因',
    '冲突规则',
    '是否重复',
    '重复来源',
    '任务状态',
    '处理时间',
    '批次号',
  ];

  const rows = records.map((r) => ({
    '来源行号': r.sourceRow,
    '记录ID': r.record.id || '',
    '标题': r.record.title || '',
    '内容': r.record.content || '',
    '建议分类': r.category || '',
    '建议部门': r.department || '',
    '待复核原因': r.abnormalReasons.join(' | '),
    '冲突规则': (r.conflictingRules || []).join('; '),
    '是否重复': r.isDuplicate ? '是' : '否',
    '重复来源': r.duplicateOf || '',
    '任务状态': r.taskStatus,
    '处理时间': r.processingTime,
    '批次号': r.batchId,
  }));

  return stringify(rows, { header: true, columns: outputColumns as any });
}

function generateTraceLog(records: ProcessedRecord[]): string {
  const outputColumns = [
    '来源行号',
    '记录ID',
    '处理状态',
    '分类结果',
    '归属部门',
    '匹配规则详情',
    '异常类型',
    '异常原因',
    '是否重复',
    '重复来源',
    '是否有规则冲突',
    '冲突规则',
    '历史快照分类',
    '历史快照部门',
    '历史快照状态',
    '任务状态',
    '处理时间',
    '批次号',
  ];

  const rows = records.map((r) => ({
    '来源行号': r.sourceRow,
    '记录ID': r.record.id || '',
    '处理状态': r.status,
    '分类结果': r.category || '',
    '归属部门': r.department || '',
    '匹配规则详情': r.matchedRules
      .map((m) => `${m.ruleName}(${m.matched ? '匹配' : '不匹配'}:${m.matchedConditions}/${m.totalConditions})`)
      .join('; '),
    '异常类型': r.abnormalTypes.join('; '),
    '异常原因': r.abnormalReasons.join(' | '),
    '是否重复': r.isDuplicate ? '是' : '否',
    '重复来源': r.duplicateOf || '',
    '是否有规则冲突': r.hasRuleConflict ? '是' : '否',
    '冲突规则': (r.conflictingRules || []).join('; '),
    '历史快照分类': r.previousSnapshot?.category || '',
    '历史快照部门': r.previousSnapshot?.department || '',
    '历史快照状态': r.previousSnapshot?.status || '',
    '任务状态': r.taskStatus,
    '处理时间': r.processingTime,
    '批次号': r.batchId,
  }));

  return stringify(rows, { header: true, columns: outputColumns as any });
}
