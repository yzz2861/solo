import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import type { 
  CoverageReport, 
  StayReport, 
  MissedPointsReport,
  ComparisonReport,
  PatrolShift,
  Checkpoint
} from '@/types';
import { formatDate, formatTime, formatDuration } from '@/utils/time';
import { generateCoverageReport, generateStayReport, generateMissedPointsReport } from './analysisService';

export const exportToJSON = (data: any, filename: string): void => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportToExcel = (
  report: CoverageReport | StayReport | MissedPointsReport | ComparisonReport,
  type: 'coverage' | 'stay' | 'missed' | 'comparison'
): void => {
  const wb = XLSX.utils.book_new();
  
  if (type === 'coverage' && 'coverageRate' in report) {
    const summaryData = [
      ['巡逻覆盖率报告'],
      [],
      ['日期', report.date],
      ['班次', report.shiftName],
      ['覆盖率', `${(report.coverageRate * 100).toFixed(1)}%`],
      ['应巡点位', report.totalCheckpoints],
      ['已巡点位', report.coveredCheckpoints],
      ['漏巡点位', report.missedCheckpoints.length],
      ['巡逻时长', formatDuration(report.patrolDuration)],
      ['总里程', `${report.totalDistance.toFixed(2)} 米`],
      [],
      ['漏巡点位列表'],
      ['点位名称', '坐标X', '坐标Y', '半径'],
      ...report.missedCheckpoints.map(cp => [cp.name, cp.x, cp.y, cp.radius]),
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws, '覆盖率报告');
  }
  
  if (type === 'stay' && 'abnormalStays' in report) {
    const summaryData = [
      ['异常停留报告'],
      [],
      ['日期', report.date],
      ['班次', report.shiftName],
      ['异常停留次数', report.stayCount],
      ['总停留时间', formatDuration(report.totalStayTime)],
      ['平均停留时长', formatDuration(report.avgStayDuration)],
      ['最长停留时长', formatDuration(report.maxStayDuration)],
      [],
      ['异常停留详情'],
      ['序号', '位置X', '位置Y', '开始时间', '结束时间', '停留时长'],
      ...report.abnormalStays.map((stay, index) => [
        index + 1,
        stay.x.toFixed(2),
        stay.y.toFixed(2),
        formatTime(stay.startTime),
        formatTime(stay.endTime),
        formatDuration(stay.duration),
      ]),
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws, '异常停留报告');
  }
  
  if (type === 'missed' && 'missedPoints' in report) {
    const summaryData = [
      ['未到达点位报告'],
      [],
      ['日期', report.date],
      ['班次', report.shiftName],
      ['未到达点位数量', report.totalMissed],
      [],
      ['未到达点位详情'],
      ['点位名称', '坐标X', '坐标Y', '上次到达时间'],
      ...report.missedPoints.map(cp => [
        cp.name,
        cp.x,
        cp.y,
        report.lastVisitTimes[cp.id] ? formatTime(report.lastVisitTimes[cp.id]!) : '从未到达',
      ]),
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws, '未到达点位报告');
  }
  
  if (type === 'comparison' && 'coverageComparison' in report) {
    const summaryData = [
      ['班次对比分析报告'],
      ['生成时间', formatDate(report.generatedAt) + ' ' + formatTime(report.generatedAt)],
      [],
      ['覆盖率对比'],
      ['班次', '覆盖率'],
      ...report.coverageComparison.map(c => [
        c.shiftName,
        `${(c.rate * 100).toFixed(1)}%`,
      ]),
      [],
      ['差异分析'],
      ['差异类型', '描述', '严重程度', ...report.shiftNames],
      ...report.differences.map(d => [
        getTypeName(d.type),
        d.description,
        getSeverityName(d.severity),
        d.shift1Value,
        d.shift2Value,
      ]),
      [],
      ['模式分析'],
      ['指标', '数值'],
      ['平均覆盖率', `${(report.patternAnalysis.averageCoverage * 100).toFixed(1)}%`],
      ['一致性评分', `${(report.patternAnalysis.consistentCoverage * 100).toFixed(1)}%`],
      ['是否系统性问题', report.patternAnalysis.isSystemicIssue ? '是' : '否'],
      [],
      ['改进建议'],
      ...report.patternAnalysis.recommendations.map(r => [r]),
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws, '班次对比报告');
  }
  
  XLSX.writeFile(wb, `${type}-report-${Date.now()}.xlsx`);
};

export const exportToPDF = async (
  element: HTMLElement,
  filename: string
): Promise<void> => {
  const canvas = await html2canvas(element, {
    backgroundColor: '#0a1628',
    scale: 2,
    useCORS: true,
  });
  
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
    unit: 'px',
    format: [canvas.width, canvas.height],
  });
  
  pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
  pdf.save(filename);
};

export const generateAllReports = (
  shift: PatrolShift,
  checkpoints: Checkpoint[]
): {
  coverage: CoverageReport;
  stay: StayReport;
  missed: MissedPointsReport;
} => {
  const coverage = generateCoverageReport(shift, checkpoints);
  const stay = generateStayReport(shift);
  const missed = generateMissedPointsReport(shift, checkpoints);
  
  return { coverage, stay, missed };
};

const getTypeName = (type: string): string => {
  const typeMap: { [key: string]: string } = {
    coverage: '覆盖率',
    route: '路线',
    timing: '时间',
    alarms: '告警',
  };
  return typeMap[type] || type;
};

const getSeverityName = (severity: string): string => {
  const severityMap: { [key: string]: string } = {
    low: '低',
    medium: '中',
    high: '高',
  };
  return severityMap[severity] || severity;
};

export default {
  exportToJSON,
  exportToExcel,
  exportToPDF,
  generateAllReports,
  generateCoverageReport,
  generateStayReport,
  generateMissedPointsReport,
};
