import { useState, useMemo } from 'react';
import {
  FileText,
  Download,
  Calendar,
  BarChart3,
  TrendingUp,
  CheckCircle,
  FileSpreadsheet,
  File,
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';
import { useAppStore } from '../store';
import { getAnomalyDetails, calculateDailyStats } from '../utils/heatmap';
import { generateWeeklyReport, exportToExcel } from '../utils/export';
import type { WeeklyReport } from '../types';

export default function ReportExport() {
  const { toilets, hourlyData, thresholdConfig } = useAppStore();
  const [startDate, setStartDate] = useState(dayjs().subtract(6, 'day').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [reportType, setReportType] = useState<'weekly' | 'monthly' | 'custom'>('weekly');

  const weeklyReport = useMemo((): WeeklyReport | null => {
    if (toilets.length === 0) return null;

    const dates: string[] = [];
    let d = dayjs(startDate);
    while (d.isBefore(endDate) || d.isSame(endDate, 'day')) {
      dates.push(d.format('YYYY-MM-DD'));
      d = d.add(1, 'day');
    }

    const dailyStatsList = dates.map((date) =>
      calculateDailyStats(toilets, hourlyData, date)
    );

    const anomalyDetails = getAnomalyDetails(toilets, hourlyData, thresholdConfig);

    return generateWeeklyReport(
      toilets,
      dailyStatsList,
      anomalyDetails,
      hourlyData,
      startDate,
      endDate
    );
  }, [toilets, hourlyData, thresholdConfig, startDate, endDate]);

  const flowChartOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      textStyle: { color: '#1e293b' },
    },
    legend: {
      data: ['客流人次', '保洁次数'],
      top: 0,
      textStyle: { fontSize: 12, color: '#64748b' },
    },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
    xAxis: {
      type: 'category',
      data: weeklyReport?.dailyStats.map((d) => d.date.slice(5)) || [],
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#64748b', fontSize: 11 },
    },
    yAxis: [
      {
        type: 'value',
        name: '客流',
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
        axisLabel: { color: '#64748b', fontSize: 11 },
      },
      {
        type: 'value',
        name: '保洁',
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { color: '#64748b', fontSize: 11 },
      },
    ],
    series: [
      {
        name: '客流人次',
        type: 'bar',
        data: weeklyReport?.dailyStats.map((d) => d.totalPassengers) || [],
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#3b82f6' },
              { offset: 1, color: '#93c5fd' },
            ],
          },
          borderRadius: [4, 4, 0, 0],
        },
        barWidth: 16,
      },
      {
        name: '保洁次数',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        data: weeklyReport?.dailyStats.map((d) => d.totalCleanings) || [],
        itemStyle: { color: '#22c55e' },
        lineStyle: { width: 3 },
        symbol: 'circle',
        symbolSize: 8,
      },
    ],
  };

  const complaintChartOption = {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      textStyle: { color: '#1e293b' },
    },
    series: [
      {
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: true,
          formatter: '{b}\n{d}%',
          fontSize: 11,
          color: '#64748b',
        },
        data: [
          { value: 42, name: '异味', itemStyle: { color: '#ef4444' } },
          { value: 28, name: '脏乱', itemStyle: { color: '#f97316' } },
          { value: 18, name: '设施损坏', itemStyle: { color: '#eab308' } },
          { value: 12, name: '其他', itemStyle: { color: '#94a3b8' } },
        ],
      },
    ],
  };

  const handleExportExcel = () => {
    if (weeklyReport) {
      exportToExcel(weeklyReport);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">报告导出</h1>
          <p className="text-navy-500 mt-1">生成周度/月度保洁报告，导出给街道考核</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            导出 Excel
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors">
            <FileText className="w-4 h-4" />
            导出 PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-navy-600">报告类型</span>
            <div className="flex bg-navy-100 rounded-lg p-1">
              {[
                { key: 'weekly', label: '周报' },
                { key: 'monthly', label: '月报' },
                { key: 'custom', label: '自定义' },
              ].map((type) => (
                <button
                  key={type.key}
                  onClick={() => setReportType(type.key as any)}
                  className={`px-4 py-1.5 text-sm rounded-md transition-all ${
                    reportType === type.key
                      ? 'bg-white text-primary-600 shadow-sm font-medium'
                      : 'text-navy-500 hover:text-navy-700'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-navy-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 text-sm border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <span className="text-navy-400">至</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 text-sm border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50">
              <BarChart3 className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-navy-500">公厕总数</p>
              <p className="text-2xl font-bold text-navy-900">
                {weeklyReport?.totalToilets || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-green-50">
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-navy-500">日均客流</p>
              <p className="text-2xl font-bold text-navy-900">
                {(weeklyReport?.avgPassengerFlow || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-50">
              <File className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-navy-500">投诉总数</p>
              <p className="text-2xl font-bold text-navy-900">
                {weeklyReport?.totalComplaints || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm text-navy-500">投诉解决率</p>
              <p className="text-2xl font-bold text-navy-900">
                {weeklyReport?.complaintResolutionRate || 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-5">
          <h3 className="font-semibold text-navy-800 mb-4">客流与保洁趋势</h3>
          <ReactECharts option={flowChartOption} style={{ height: '300px' }} />
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="font-semibold text-navy-800 mb-4">投诉类型分布</h3>
          <ReactECharts option={complaintChartOption} style={{ height: '300px' }} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="font-semibold text-navy-800 mb-4">客流量 Top 5</h3>
          <div className="space-y-3">
            {weeklyReport?.topFlowToilets.map((item, index) => (
              <div key={item.name} className="flex items-center gap-3">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                    index === 0
                      ? 'bg-yellow-500'
                      : index === 1
                      ? 'bg-gray-400'
                      : index === 2
                      ? 'bg-amber-600'
                      : 'bg-navy-300'
                  }`}
                >
                  {index + 1}
                </span>
                <span className="flex-1 text-sm text-navy-700 truncate">
                  {item.name}
                </span>
                <span className="text-sm font-semibold text-navy-800">
                  {item.count.toLocaleString()} 人次
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="font-semibold text-navy-800 mb-4">投诉量 Top 5</h3>
          <div className="space-y-3">
            {weeklyReport?.topComplaintToilets.map((item, index) => (
              <div key={item.name} className="flex items-center gap-3">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                    index === 0
                      ? 'bg-red-500'
                      : index === 1
                      ? 'bg-orange-500'
                      : index === 2
                      ? 'bg-amber-500'
                      : 'bg-navy-300'
                  }`}
                >
                  {index + 1}
                </span>
                <span className="flex-1 text-sm text-navy-700 truncate">
                  {item.name}
                </span>
                <span className="text-sm font-semibold text-red-600">
                  {item.count} 起
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5">
        <h3 className="font-semibold text-navy-800 mb-4">每日统计详情</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-navy-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-navy-500 uppercase">
                  日期
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-navy-500 uppercase">
                  客流人次
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-navy-500 uppercase">
                  保洁次数
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-navy-500 uppercase">
                  巡检次数
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-navy-500 uppercase">
                  投诉数
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-navy-500 uppercase">
                  离线设备
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-navy-500 uppercase">
                  异常点位
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {weeklyReport?.dailyStats.map((stat) => (
                <tr key={stat.date} className="hover:bg-navy-50">
                  <td className="px-4 py-3 text-sm text-navy-700">{stat.date}</td>
                  <td className="px-4 py-3 text-sm text-navy-700 text-right">
                    {stat.totalPassengers.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-navy-700 text-right">
                    {stat.totalCleanings}
                  </td>
                  <td className="px-4 py-3 text-sm text-navy-700 text-right">
                    {stat.totalInspections}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    <span
                      className={`font-medium ${
                        stat.totalComplaints > 5
                          ? 'text-red-600'
                          : 'text-navy-700'
                      }`}
                    >
                      {stat.totalComplaints}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-navy-700 text-right">
                    {stat.offlineDevices}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        stat.anomalyCount > 5
                          ? 'bg-red-100 text-red-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}
                    >
                      {stat.anomalyCount} 个
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
