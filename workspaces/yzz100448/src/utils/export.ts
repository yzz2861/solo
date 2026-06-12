import type { Visitor, CompanyStats, OverdueStats } from '../types';
import { formatDateTime, getTimeSlotLabel, getStatusLabel } from './dateUtils';

export function exportToCSV(data: Record<string, any>[], filename: string): void {
  if (data.length === 0) {
    alert('没有数据可导出');
    return;
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map((row) =>
      headers.map((header) => {
        const value = row[header];
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }
        return value ?? '';
      }).join(',')
    ),
  ].join('\n');

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function prepareVisitorsForExport(visitors: Visitor[]): Record<string, any>[] {
  return visitors.map((v) => ({
    来访单位: v.company,
    被访人: v.contactPerson,
    车牌号码: v.plateNumber,
    原车牌: v.originalPlateNumber || '',
    是否变更车牌: v.isPlateChanged ? '是' : '否',
    变更批准人: v.plateChangeApprover || '',
    访问日期: v.visitDate,
    时段: getTimeSlotLabel(v.timeSlot),
    开始时间: v.startTime,
    结束时间: v.endTime,
    车位: v.parkingSpot,
    状态: getStatusLabel(v.status),
    到场时间: v.checkInTime ? formatDateTime(new Date(v.checkInTime)) : '',
    离场时间: v.checkOutTime ? formatDateTime(new Date(v.checkOutTime)) : '',
    登记人: v.createdBy,
    登记时间: formatDateTime(new Date(v.createdAt)),
    备注: v.remarks || '',
  }));
}

export function prepareOverdueForExport(stats: OverdueStats[]): Record<string, any>[] {
  return stats.map((s) => ({
    '来访单位': s.visitor.company,
    '被访人': s.visitor.contactPerson,
    '车牌号码': s.visitor.plateNumber,
    '访问日期': s.visitor.visitDate,
    '车位': s.visitor.parkingSpot,
    '应离场时间': s.visitor.endTime,
    '超时时长(分钟)': s.overdueMinutes,
    '超时时长(小时)': (s.overdueMinutes / 60).toFixed(2),
  }));
}

export function prepareCompanyStatsForExport(stats: CompanyStats[]): Record<string, any>[] {
  return stats.map((s, index) => ({
    排名: index + 1,
    来访单位: s.company,
    来访次数: s.visitCount,
  }));
}

export function calculateCompanyStats(visitors: Visitor[]): CompanyStats[] {
  const companyMap = new Map<string, number>();
  
  visitors.forEach((v) => {
    const count = companyMap.get(v.company) || 0;
    companyMap.set(v.company, count + 1);
  });
  
  return Array.from(companyMap.entries())
    .map(([company, visitCount]) => ({ company, visitCount }))
    .sort((a, b) => b.visitCount - a.visitCount);
}
