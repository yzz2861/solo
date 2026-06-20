import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { ArchiveRecord, FieldType, ExportOptions } from '@/types';
import { downloadFile, getFieldLabel, getStatusLabel } from '@/utils/common';

const getAllFieldValues = (
  record: ArchiveRecord,
  fieldName: FieldType
): { ocrValue: string; correctedValue: string; confidence: number } => {
  const field = record.fields.find(f => f.fieldName === fieldName);
  return {
    ocrValue: field?.ocrValue || '',
    correctedValue: field?.correctedValue || '',
    confidence: field?.confidence ?? 0
  };
};

const formatConfidence = (confidence: number): string => {
  if (confidence === 0) return '未识别';
  return `${(confidence * 100).toFixed(1)}%`;
};

export const generateCSV = (
  records: ArchiveRecord[],
  options: ExportOptions
): string => {
  const rows: Record<string, string>[] = [];
  
  for (const record of records) {
    const row: Record<string, string> = {};
    
    row['ID'] = record.id;
    row['照片文件名'] = record.photoFileName;
    
    if (options.includePhotoPath) {
      row['照片路径'] = record.photoPath;
    }
    
    if (options.includeStatus) {
      row['校对状态'] = getStatusLabel(record.status);
    }
    
    for (const fieldName of options.fieldSelection) {
      const values = getAllFieldValues(record, fieldName);
      const label = getFieldLabel(fieldName);
      
      if (options.includeOcrValue) {
        row[`${label}(OCR)`] = values.ocrValue;
      }
      
      if (options.includeCorrectedValue) {
        row[`${label}(修正)`] = values.correctedValue;
      }
      
      if (options.includeConfidence) {
        row[`${label}(置信度)`] = formatConfidence(values.confidence);
      }
    }
    
    if (options.includeOcrValue) {
      row['原始OCR文本'] = record.ocrText;
    }
    
    row['整体置信度'] = formatConfidence(record.overallConfidence);
    row['是否疑似缺页'] = record.hasMissingPage ? '是' : '否';
    row['是否同名提醒'] = record.hasSameNameWarning ? '是' : '否';
    row['创建时间'] = new Date(record.createdAt).toLocaleString('zh-CN');
    row['更新时间'] = new Date(record.updatedAt).toLocaleString('zh-CN');
    
    if (record.reviewNotes) {
      row['校对备注'] = record.reviewNotes;
    }
    
    rows.push(row);
  }
  
  return Papa.unparse(rows, {
    header: true,
    delimiter: ','
  });
};

export const generateExcel = (
  records: ArchiveRecord[],
  options: ExportOptions
): Blob => {
  const rows: Record<string, string>[] = [];
  const lowConfidenceRows: Record<string, string>[] = [];
  
  for (const record of records) {
    const row: Record<string, string> = {};
    
    row['ID'] = record.id;
    row['照片文件名'] = record.photoFileName;
    
    if (options.includePhotoPath) {
      row['照片路径'] = record.photoPath;
    }
    
    if (options.includeStatus) {
      row['校对状态'] = getStatusLabel(record.status);
    }
    
    for (const fieldName of options.fieldSelection) {
      const values = getAllFieldValues(record, fieldName);
      const label = getFieldLabel(fieldName);
      
      if (options.includeOcrValue) {
        row[`${label}(OCR)`] = values.ocrValue;
      }
      
      if (options.includeCorrectedValue) {
        row[`${label}(修正)`] = values.correctedValue;
      }
      
      if (options.includeConfidence) {
        row[`${label}(置信度)`] = formatConfidence(values.confidence);
      }
    }
    
    if (options.includeOcrValue) {
      row['原始OCR文本'] = record.ocrText;
    }
    
    row['整体置信度'] = formatConfidence(record.overallConfidence);
    row['是否疑似缺页'] = record.hasMissingPage ? '是' : '否';
    row['是否同名提醒'] = record.hasSameNameWarning ? '是' : '否';
    row['创建时间'] = new Date(record.createdAt).toLocaleString('zh-CN');
    row['更新时间'] = new Date(record.updatedAt).toLocaleString('zh-CN');
    
    if (record.reviewNotes) {
      row['校对备注'] = record.reviewNotes;
    }
    
    rows.push(row);
    
    const hasLowConfidence = record.fields.some(f => f.isLowConfidence);
    if (hasLowConfidence) {
      const lowRow = { ...row };
      for (const fieldName of options.fieldSelection) {
        const values = getAllFieldValues(record, fieldName);
        const label = getFieldLabel(fieldName);
        if (values.confidence < 0.6 && values.confidence > 0) {
          lowRow[`${label}(置信度)`] = `⚠️ ${formatConfidence(values.confidence)}`;
        }
      }
      lowConfidenceRows.push(lowRow);
    }
  }
  
  const wb = XLSX.utils.book_new();
  
  const mainWs = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, mainWs, '完整目录');
  
  if (lowConfidenceRows.length > 0) {
    const lowWs = XLSX.utils.json_to_sheet(lowConfidenceRows);
    XLSX.utils.book_append_sheet(wb, lowWs, '低置信字段');
  }
  
  const statsWs = XLSX.utils.json_to_sheet(generateStatistics(records, options));
  XLSX.utils.book_append_sheet(wb, statsWs, '统计信息');
  
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

const generateStatistics = (
  records: ArchiveRecord[],
  options: ExportOptions
): Record<string, string>[] => {
  const stats: Record<string, string>[] = [];
  
  stats.push({ '项目': '总记录数', '数值': records.length.toString() });
  
  let lowConfidenceCount = 0;
  const fieldLowConfidence: Record<FieldType, number> = {
    name: 0,
    date: 0,
    documentNumber: 0,
    pageNumber: 0,
    materialType: 0
  };
  
  const fieldAvgConfidence: Record<FieldType, number> = {
    name: 0,
    date: 0,
    documentNumber: 0,
    pageNumber: 0,
    materialType: 0
  };
  
  const fieldTotalConfidence: Record<FieldType, number> = {
    name: 0,
    date: 0,
    documentNumber: 0,
    pageNumber: 0,
    materialType: 0
  };
  
  const fieldCount: Record<FieldType, number> = {
    name: 0,
    date: 0,
    documentNumber: 0,
    pageNumber: 0,
    materialType: 0
  };
  
  let missingPageCount = 0;
  let sameNameCount = 0;
  let correctedCount = 0;
  
  for (const record of records) {
    if (record.fields.some(f => f.isLowConfidence)) {
      lowConfidenceCount++;
    }
    
    if (record.hasMissingPage) missingPageCount++;
    if (record.hasSameNameWarning) sameNameCount++;
    
    if (record.fields.some(f => f.correctedValue && f.correctedValue !== f.ocrValue)) {
      correctedCount++;
    }
    
    for (const field of record.fields) {
      fieldTotalConfidence[field.fieldName] += field.confidence;
      fieldCount[field.fieldName]++;
      if (field.isLowConfidence) {
        fieldLowConfidence[field.fieldName]++;
      }
    }
  }
  
  for (const fieldName of Object.keys(fieldAvgConfidence) as FieldType[]) {
    if (fieldCount[fieldName] > 0) {
      fieldAvgConfidence[fieldName] = fieldTotalConfidence[fieldName] / fieldCount[fieldName];
    }
  }
  
  stats.push({ '项目': '低置信记录数', '数值': `${lowConfidenceCount} (${((lowConfidenceCount / records.length) * 100).toFixed(1)}%)` });
  stats.push({ '项目': '疑似缺页数', '数值': missingPageCount.toString() });
  stats.push({ '项目': '同名提醒数', '数值': sameNameCount.toString() });
  stats.push({ '项目': '已修正记录数', '数值': `${correctedCount} (${((correctedCount / records.length) * 100).toFixed(1)}%)` });
  stats.push({ '项目': '', '数值': '' });
  stats.push({ '项目': '字段低置信统计', '数值': '' });
  
  for (const fieldName of options.fieldSelection) {
    const label = getFieldLabel(fieldName);
    const typedFieldName = fieldName as FieldType;
    const lowCount = fieldLowConfidence[typedFieldName];
    const avgConf = fieldAvgConfidence[typedFieldName];
    stats.push({
      '项目': `${label}`,
      '数值': `低置信: ${lowCount}, 平均置信度: ${(avgConf * 100).toFixed(1)}%`
    });
  }
  
  return stats;
};

export const exportArchive = (
  records: ArchiveRecord[],
  options: ExportOptions
): void => {
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = options.filename || `档案目录_${timestamp}`;
  
  if (options.format === 'csv') {
    const csv = generateCSV(records, options);
    const bom = '\uFEFF';
    downloadFile(bom + csv, `${filename}.csv`, 'text/csv;charset=utf-8');
  } else {
    const blob = generateExcel(records, options);
    downloadFile(blob, `${filename}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }
};

export const generateInspectionReport = (
  taskName: string,
  items: Array<{
    ocrValue: string;
    correctedValue?: string;
    status: string;
    priorityLevel: string;
    fieldName: string;
    recordId: string;
  }>
): string => {
  const report: string[] = [];
  
  report.push(`# 抽检报告：${taskName}`);
  report.push(`生成时间：${new Date().toLocaleString('zh-CN')}`);
  report.push(`抽检数量：${items.length}`);
  report.push('');
  
  const passCount = items.filter(i => i.status === 'pass').length;
  const failCount = items.filter(i => i.status === 'fail').length;
  const pendingCount = items.filter(i => i.status === 'pending').length;
  const recheckCount = items.filter(i => i.status === 'recheck').length;
  
  report.push('## 抽检统计');
  report.push(`- 通过：${passCount} (${((passCount / items.length) * 100).toFixed(1)}%)`);
  report.push(`- 不通过：${failCount} (${((failCount / items.length) * 100).toFixed(1)}%)`);
  report.push(`- 待复核：${recheckCount} (${((recheckCount / items.length) * 100).toFixed(1)}%)`);
  report.push(`- 待处理：${pendingCount} (${((pendingCount / items.length) * 100).toFixed(1)}%)`);
  report.push('');
  
  report.push('## 不通过项详情');
  for (const item of items.filter(i => i.status === 'fail')) {
    report.push(`### ${getFieldLabel(item.fieldName)} (${getPriorityLabel(item.priorityLevel)})`);
    report.push(`- 记录ID：${item.recordId}`);
    report.push(`- OCR值：${item.ocrValue || '无'}`);
    report.push(`- 修正值：${item.correctedValue || '无'}`);
    report.push('');
  }
  
  return report.join('\n');
};

const getPriorityLabel = (level: string): string => {
  const labels: Record<string, string> = {
    critical: '极优先',
    high: '高优先',
    medium: '中优先',
    low: '低优先'
  };
  return labels[level] || level;
};

export default {
  generateCSV,
  generateExcel,
  exportArchive,
  generateInspectionReport
};
