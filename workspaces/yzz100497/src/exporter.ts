import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { createObjectCsvWriter } from 'csv-writer';
import { Author, Work, PhotoFile, ProcessedSubmission, SubmissionStatus, ExportOptions } from './types';
import { FilteredResult } from './filter';
import { ensureDirectoryExists, formatFileSize, formatDate } from './utils';
import { DetectionResult, collectAllIssues } from './issueDetector';

export async function exportResults(
  submissions: ProcessedSubmission[],
  detection: DetectionResult,
  options: ExportOptions
): Promise<string[]> {
  ensureDirectoryExists(options.outputDir);
  const exportedFiles: string[] = [];

  const selected = submissions.filter(s => s.status === 'selected');
  const pending = submissions.filter(s => s.status === 'pending');
  const rejected = submissions.filter(s => s.status === 'rejected');

  if (options.format === 'csv') {
    exportedFiles.push(await exportSubmissionsCSV(selected, 'selected', options.outputDir, options));
    exportedFiles.push(await exportSubmissionsCSV(pending, 'pending', options.outputDir, options));
    exportedFiles.push(await exportSubmissionsCSV(rejected, 'rejected', options.outputDir, options));
    exportedFiles.push(await exportIssuesCSV(detection, options.outputDir));
  } else {
    exportedFiles.push(await exportAllXLSX(submissions, detection, options));
  }

  return exportedFiles.filter(f => f);
}

async function exportSubmissionsCSV(
  submissions: ProcessedSubmission[],
  status: SubmissionStatus,
  outputDir: string,
  options: ExportOptions
): Promise<string> {
  if (submissions.length === 0) return '';

  const records: any[] = [];

  for (const submission of submissions) {
    for (const work of submission.author.works) {
      for (const photo of work.photos) {
        const record: any = {
          作者: submission.author.name,
          作者别名: submission.author.nameVariants.join('、'),
          联系邮箱: submission.author.email || '',
          联系电话: submission.author.phone || '',
          作品标题: work.title,
          文件名: photo.originalName,
          文件大小: formatFileSize(photo.size),
          尺寸: `${photo.metadata.width}x${photo.metadata.height}`,
          像素: `${photo.metadata.megapixels}MP`,
          拍摄时间: formatDate(photo.metadata.takenAt),
          相机: photo.metadata.camera || '',
          镜头: photo.metadata.lens || '',
          ISO: photo.metadata.iso || '',
          光圈: photo.metadata.aperture || '',
          快门: photo.metadata.shutterSpeed || '',
          文件路径: photo.filePath,
          状态: getStatusText(status),
          原因: submission.reasons.join('; ')
        };

        if (options.includeIssues) {
          const workIssues = work.detectedIssues.map(i => i.message).join('; ');
          const photoIssues = submission.author.detectedIssues
            .filter(i => i.relatedItemId === photo.id)
            .map(i => i.message)
            .join('; ');
          record.作品问题 = workIssues;
          record.图片问题 = photoIssues;
        }

        records.push(record);
      }
    }
  }

  if (records.length === 0) return '';

  const filePath = path.join(outputDir, `${getStatusText(status)}清单.csv`);
  
  const headers = Object.keys(records[0]).map(key => ({ id: key, title: key }));
  
  const csvWriter = createObjectCsvWriter({
    path: filePath,
    header: headers,
    encoding: 'utf8'
  });

  await csvWriter.writeRecords(records);
  return filePath;
}

async function exportIssuesCSV(
  detection: DetectionResult,
  outputDir: string
): Promise<string> {
  const allIssues = collectAllIssues(detection);
  
  if (allIssues.length === 0) return '';

  const records = allIssues.map(issue => ({
    类别: getCategoryText(issue.category),
    严重程度: getSeverityText(issue.severity),
    问题描述: issue.message,
    关联项目ID: issue.relatedItemId || '',
    关联项目类型: issue.relatedItemType || ''
  }));

  const filePath = path.join(outputDir, '问题清单.csv');
  
  const headers = Object.keys(records[0]).map(key => ({ id: key, title: key }));
  
  const csvWriter = createObjectCsvWriter({
    path: filePath,
    header: headers,
    encoding: 'utf8'
  });

  await csvWriter.writeRecords(records);
  return filePath;
}

async function exportAllXLSX(
  submissions: ProcessedSubmission[],
  detection: DetectionResult,
  options: ExportOptions
): Promise<string> {
  const wb = XLSX.utils.book_new();

  const selectedData = flattenSubmissions(submissions.filter(s => s.status === 'selected'), 'selected');
  const pendingData = flattenSubmissions(submissions.filter(s => s.status === 'pending'), 'pending');
  const rejectedData = flattenSubmissions(submissions.filter(s => s.status === 'rejected'), 'rejected');
  const issuesData = collectAllIssues(detection).map(issue => ({
    类别: getCategoryText(issue.category),
    严重程度: getSeverityText(issue.severity),
    问题描述: issue.message,
    关联项目ID: issue.relatedItemId || '',
    关联项目类型: issue.relatedItemType || ''
  }));

  if (selectedData.length > 0) {
    const ws1 = XLSX.utils.json_to_sheet(selectedData);
    XLSX.utils.book_append_sheet(wb, ws1, '入围初筛');
  }

  if (pendingData.length > 0) {
    const ws2 = XLSX.utils.json_to_sheet(pendingData);
    XLSX.utils.book_append_sheet(wb, ws2, '待补材料');
  }

  if (rejectedData.length > 0) {
    const ws3 = XLSX.utils.json_to_sheet(rejectedData);
    XLSX.utils.book_append_sheet(wb, ws3, '退回');
  }

  if (issuesData.length > 0) {
    const ws4 = XLSX.utils.json_to_sheet(issuesData);
    XLSX.utils.book_append_sheet(wb, ws4, '问题清单');
  }

  const filePath = path.join(options.outputDir, '影展投稿整理结果.xlsx');
  XLSX.writeFile(wb, filePath);
  return filePath;
}

function flattenSubmissions(
  submissions: ProcessedSubmission[],
  status: SubmissionStatus
): any[] {
  const records: any[] = [];

  for (const submission of submissions) {
    for (const work of submission.author.works) {
      for (const photo of work.photos) {
        records.push({
          作者: submission.author.name,
          作者别名: submission.author.nameVariants.join('、'),
          联系邮箱: submission.author.email || '',
          联系电话: submission.author.phone || '',
          作品标题: work.title,
          文件名: photo.originalName,
          文件大小: formatFileSize(photo.size),
          尺寸: `${photo.metadata.width}x${photo.metadata.height}`,
          像素: `${photo.metadata.megapixels}MP`,
          拍摄时间: formatDate(photo.metadata.takenAt),
          相机: photo.metadata.camera || '',
          镜头: photo.metadata.lens || '',
          ISO: photo.metadata.iso || '',
          光圈: photo.metadata.aperture || '',
          快门: photo.metadata.shutterSpeed || '',
          文件路径: photo.filePath,
          状态: getStatusText(status),
          原因: submission.reasons.join('; ')
        });
      }
    }
  }

  return records;
}

export async function exportFilteredResults(
  filteredResults: FilteredResult[],
  options: ExportOptions
): Promise<string> {
  ensureDirectoryExists(options.outputDir);
  
  const records: any[] = [];

  for (const result of filteredResults) {
    for (const fw of result.works) {
      for (const photo of fw.photos) {
        records.push({
          作者: result.author.name,
          作品标题: fw.work.title,
          文件名: photo.originalName,
          尺寸: `${photo.metadata.width}x${photo.metadata.height}`,
          像素: `${photo.metadata.megapixels}MP`,
          拍摄时间: formatDate(photo.metadata.takenAt),
          相机: photo.metadata.camera || '',
          文件路径: photo.filePath
        });
      }
    }
  }

  if (records.length === 0) return '';

  const filePath = path.join(options.outputDir, '布展尺寸筛选结果.csv');
  
  const headers = Object.keys(records[0]).map(key => ({ id: key, title: key }));
  
  const csvWriter = createObjectCsvWriter({
    path: filePath,
    header: headers,
    encoding: 'utf8'
  });

  await csvWriter.writeRecords(records);
  return filePath;
}

export async function exportReplyTemplates(
  submissions: ProcessedSubmission[],
  outputDir: string,
  exhibitionName: string = '影展'
): Promise<string[]> {
  ensureDirectoryExists(outputDir);
  const files: string[] = [];

  const statusMap: Record<SubmissionStatus, string> = {
    selected: '入围通知',
    pending: '待补材料通知',
    rejected: '退回通知'
  };

  for (const submission of submissions) {
    const { generateReplyTemplate } = require('./classifier');
    const content = generateReplyTemplate(submission, exhibitionName);
    const statusDir = path.join(outputDir, statusMap[submission.status]);
    ensureDirectoryExists(statusDir);
    
    const fileName = `${submission.author.name}_${statusMap[submission.status]}.txt`;
    const filePath = path.join(statusDir, fileName);
    
    fs.writeFileSync(filePath, content, 'utf8');
    files.push(filePath);
  }

  return files;
}

function getStatusText(status: SubmissionStatus): string {
  const map: Record<SubmissionStatus, string> = {
    selected: '入围初筛',
    pending: '待补材料',
    rejected: '退回'
  };
  return map[status];
}

function getSeverityText(severity: string): string {
  const map: Record<string, string> = {
    error: '错误',
    warning: '警告',
    info: '信息'
  };
  return map[severity] || severity;
}

function getCategoryText(category: string): string {
  const map: Record<string, string> = {
    duplicate: '重复投稿',
    small_image: '图片过小',
    name_inconsistency: '作者名不一致',
    missing_signature: '缺少签字',
    missing_document: '缺少文档',
    missing_statement: '缺少作品说明',
    missing_authorization: '缺少授权书',
    cloud_link: '网盘链接',
    archive: '压缩包',
    other: '其他'
  };
  return map[category] || category;
}
