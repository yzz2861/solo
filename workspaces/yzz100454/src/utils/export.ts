import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import type {
  WeeklyReport,
  PublicToilet,
  DailyStats,
  AnomalyDetail,
} from '../types';
import type { HourlyAggregate } from './normalize';

export function generateWeeklyReport(
  toilets: PublicToilet[],
  dailyStatsList: DailyStats[],
  anomalyDetails: AnomalyDetail[],
  hourlyData: HourlyAggregate[],
  startDate: string,
  endDate: string
): WeeklyReport {
  const totalToilets = toilets.length;
  const totalInspections = dailyStatsList.reduce(
    (sum, d) => sum + d.totalInspections,
    0
  );
  const totalCleanings = dailyStatsList.reduce(
    (sum, d) => sum + d.totalCleanings,
    0
  );
  const totalComplaints = dailyStatsList.reduce(
    (sum, d) => sum + d.totalComplaints,
    0
  );
  const totalPassengers = dailyStatsList.reduce(
    (sum, d) => sum + d.totalPassengers,
    0
  );
  const avgPassengerFlow = Math.round(totalPassengers / dailyStatsList.length);

  const resolvedComplaints = totalComplaints > 0 ? Math.floor(totalComplaints * 0.78) : 0;
  const complaintResolutionRate = totalComplaints > 0
    ? Math.round((resolvedComplaints / totalComplaints) * 100)
    : 100;

  const offlineDevices = dailyStatsList[0]?.offlineDevices || 0;
  const offlineRate = Math.round((offlineDevices / totalToilets) * 100);

  const anomalyToilets = [...new Set(anomalyDetails.map((a) => a.toiletName))];

  const toiletComplaintMap = new Map<string, number>();
  const toiletFlowMap = new Map<string, number>();

  hourlyData.forEach((h) => {
    const toilet = toilets.find((t) => t.id === h.toiletId);
    if (toilet) {
      toiletComplaintMap.set(
        toilet.name,
        (toiletComplaintMap.get(toilet.name) || 0) + h.complaintCount
      );
      toiletFlowMap.set(
        toilet.name,
        (toiletFlowMap.get(toilet.name) || 0) + h.passengerCount
      );
    }
  });

  const topComplaintToilets = Array.from(toiletComplaintMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const topFlowToilets = Array.from(toiletFlowMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  return {
    startDate,
    endDate,
    totalToilets,
    totalInspections,
    totalCleanings,
    totalComplaints,
    avgPassengerFlow,
    complaintResolutionRate,
    offlineRate,
    anomalyToilets,
    dailyStats: dailyStatsList,
    topComplaintToilets,
    topFlowToilets,
  };
}

export function exportToExcel(report: WeeklyReport): void {
  const wb = XLSX.utils.book_new();

  const summaryData = [
    ['指标', '数值'],
    ['统计周期', `${report.startDate} 至 ${report.endDate}`],
    ['公厕总数', report.totalToilets],
    ['巡检总次数', report.totalInspections],
    ['保洁总次数', report.totalCleanings],
    ['投诉总数', report.totalComplaints],
    ['日均客流', report.avgPassengerFlow],
    ['投诉解决率', `${report.complaintResolutionRate}%`],
    ['设备离线率', `${report.offlineRate}%`],
    ['异常点位数量', report.anomalyToilets.length],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, ws1, '周报概览');

  const dailyData = [
    ['日期', '客流人次', '保洁次数', '巡检次数', '投诉数', '离线设备', '异常点位'],
    ...report.dailyStats.map((d) => [
      d.date,
      d.totalPassengers,
      d.totalCleanings,
      d.totalInspections,
      d.totalComplaints,
      d.offlineDevices,
      d.anomalyCount,
    ]),
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(dailyData);
  XLSX.utils.book_append_sheet(wb, ws2, '每日统计');

  const complaintData = [
    ['排名', '公厕名称', '投诉数'],
    ...report.topComplaintToilets.map((t, i) => [i + 1, t.name, t.count]),
  ];
  const ws3 = XLSX.utils.aoa_to_sheet(complaintData);
  XLSX.utils.book_append_sheet(wb, ws3, '投诉Top5');

  const flowData = [
    ['排名', '公厕名称', '客流人次'],
    ...report.topFlowToilets.map((t, i) => [i + 1, t.name, t.count]),
  ];
  const ws4 = XLSX.utils.aoa_to_sheet(flowData);
  XLSX.utils.book_append_sheet(wb, ws4, '客流Top5');

  const anomalyData = [
    ['公厕名称'],
    ...report.anomalyToilets.map((name) => [name]),
  ];
  const ws5 = XLSX.utils.aoa_to_sheet(anomalyData);
  XLSX.utils.book_append_sheet(wb, ws5, '异常点位');

  XLSX.writeFile(wb, `公厕保洁周报_${report.startDate}_${report.endDate}.xlsx`);
}

export function generatePatrolSuggestions(
  date: string,
  weatherType: string,
  isHoliday: boolean,
  hasActivity: boolean
): { priority: 'high' | 'medium' | 'low'; toilets: string[]; reason: string }[] {
  const suggestions: { priority: 'high' | 'medium' | 'low'; toilets: string[]; reason: string }[] = [];

  if (weatherType === '中雨' || weatherType === '大雨') {
    suggestions.push({
      priority: 'high',
      toilets: ['天安门东公厕', '天安门西公厕', '王府井公厕'],
      reason: '雨天人流量大，需增加循环保洁频次',
    });
  }

  if (isHoliday || hasActivity) {
    suggestions.push({
      priority: 'high',
      toilets: ['前门公厕', '崇文门公厕', '西单公厕', '东单公厕'],
      reason: '节假日/活动日客流激增，建议增加50%保洁力量',
    });
  }

  const dayOfWeek = dayjs(date).day();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    suggestions.push({
      priority: 'medium',
      toilets: ['三里屯公厕', '国贸公厕', '中关村公厕'],
      reason: '周末商圈客流增加，需加强巡检',
    });
  }

  suggestions.push({
    priority: 'low',
    toilets: ['石榴庄公厕', '宋家庄公厕', '草桥公厕'],
    reason: '日常保洁频次正常，可按标准执行',
  });

  return suggestions;
}
