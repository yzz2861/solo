import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { 
  HelpRequest, 
  ReferralRecord, 
  GRADING_LEVEL_LABELS, 
  REQUEST_STATUS_LABELS,
  REFERRAL_STATUS_LABELS,
  REFERRAL_TYPE_LABELS
} from '../types';
import { maskContent } from './mask';

interface ExportHelpRequest {
  id: string;
  提交时间: string;
  求助内容: string;
  系统分级: string;
  最终分级: string;
  状态: string;
  处理备注: string;
  确认人: string;
  确认时间: string;
}

interface ExportReferralRecord {
  id: string;
  求助ID: string;
  转介类型: string;
  转介原因: string;
  转介人: string;
  接收人: string;
  状态: string;
  转介时间: string;
  处理备注: string;
}

function prepareRequestForExport(request: HelpRequest, maskSensitive: boolean): ExportHelpRequest {
  const content = maskSensitive ? maskContent(request.content) : request.content;
  
  return {
    id: request.id,
    提交时间: format(new Date(request.submitTime), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN }),
    求助内容: content,
    系统分级: request.gradingResult ? GRADING_LEVEL_LABELS[request.gradingResult.level] : '未分级',
    最终分级: request.confirmedLevel ? GRADING_LEVEL_LABELS[request.confirmedLevel] : '未确认',
    状态: REQUEST_STATUS_LABELS[request.status],
    处理备注: request.processRemark || '',
    确认人: request.confirmedBy || '',
    确认时间: request.confirmedAt ? format(new Date(request.confirmedAt), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN }) : '',
  };
}

function prepareReferralForExport(referral: ReferralRecord): ExportReferralRecord {
  return {
    id: referral.id,
    求助ID: referral.requestId,
    转介类型: REFERRAL_TYPE_LABELS[referral.referralType],
    转介原因: referral.reason,
    转介人: referral.fromRole,
    接收人: referral.toRole,
    状态: REFERRAL_STATUS_LABELS[referral.status],
    转介时间: format(new Date(referral.createdAt), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN }),
    处理备注: referral.handleRemark || '',
  };
}

export function exportToExcel(
  requests: HelpRequest[],
  referrals: ReferralRecord[],
  maskSensitive: boolean,
  includeReferrals: boolean
): void {
  const requestData = requests.map(r => prepareRequestForExport(r, maskSensitive));
  const requestSheet = XLSX.utils.json_to_sheet(requestData);
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, requestSheet, '求助记录');
  
  if (includeReferrals && referrals.length > 0) {
    const referralData = referrals.map(r => prepareReferralForExport(r));
    const referralSheet = XLSX.utils.json_to_sheet(referralData);
    XLSX.utils.book_append_sheet(wb, referralSheet, '转介记录');
  }
  
  const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
  XLSX.writeFile(wb, `校园求助记录_${timestamp}.xlsx`);
}

export function exportToCsv(
  requests: HelpRequest[],
  referrals: ReferralRecord[],
  maskSensitive: boolean,
  includeReferrals: boolean
): void {
  const requestData = requests.map(r => prepareRequestForExport(r, maskSensitive)) as unknown as Record<string, string>[];
  let csvContent = convertToCsv(requestData);
  
  if (includeReferrals && referrals.length > 0) {
    csvContent += '\n\n=== 转介记录 ===\n\n';
    const referralData = referrals.map(r => prepareReferralForExport(r)) as unknown as Record<string, string>[];
    csvContent += convertToCsv(referralData);
  }
  
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `校园求助记录_${timestamp}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function convertToCsv(data: Record<string, string>[]): string {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const headerRow = headers.join(',');
  
  const rows = data.map(row => 
    headers.map(header => {
      const value = row[header] || '';
      const escaped = value.replace(/"/g, '""');
      return `"${escaped}"`;
    }).join(',')
  );
  
  return [headerRow, ...rows].join('\n');
}

export function exportDutyList(
  requests: HelpRequest[],
  date: Date,
  reviewerName: string
): void {
  const exportData = requests.map(request => ({
    序号: '',
    分级: request.confirmedLevel 
      ? GRADING_LEVEL_LABELS[request.confirmedLevel] 
      : (request.gradingResult ? GRADING_LEVEL_LABELS[request.gradingResult.level] : '未分级'),
    内容摘要: maskContent(request.content).substring(0, 50) + '...',
    提交时间: format(new Date(request.submitTime), 'yyyy-MM-dd HH:mm', { locale: zhCN }),
    处理结果: REQUEST_STATUS_LABELS[request.status],
    处理备注: request.processRemark || '',
    复核人: reviewerName,
  }));
  
  exportData.forEach((item, index) => {
    item.序号 = String(index + 1);
  });
  
  const wb = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(exportData);
  XLSX.utils.book_append_sheet(wb, sheet, '值班清单');
  
  const dateStr = format(date, 'yyyyMMdd');
  XLSX.writeFile(wb, `值班清单_${dateStr}.xlsx`);
}
