import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Users,
  FileWarning,
  Clock,
  WifiOff,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Filter,
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { useAppStore } from '../store';
import { getAnomalyDetails } from '../utils/heatmap';
import type { AnomalyType, AnomalyDetail } from '../types';

interface AnomalyCategory {
  type: AnomalyType;
  label: string;
  description: string;
  icon: typeof AlertTriangle;
  color: string;
  bgColor: string;
}

const anomalyCategories: AnomalyCategory[] = [
  {
    type: 'high_flow_low_clean',
    label: '高客流低保洁',
    description: '客流量大但保洁频次不足的点位',
    icon: Users,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
  },
  {
    type: 'high_complaint_normal_inspection',
    label: '投诉多巡检正常',
    description: '投诉较多但巡检记录显示正常的点位',
    icon: FileWarning,
    color: 'text-red-500',
    bgColor: 'bg-red-50',
  },
  {
    type: 'missing_checkin',
    label: '连续缺打卡',
    description: '连续多日未打卡的点位',
    icon: Clock,
    color: 'text-amber-500',
    bgColor: 'bg-amber-50',
  },
  {
    type: 'device_offline',
    label: '设备离线',
    description: '客流计设备离线的点位',
    icon: WifiOff,
    color: 'text-navy-500',
    bgColor: 'bg-navy-50',
  },
];

export default function AnomalyAnalysis() {
  const { toilets, hourlyData, thresholdConfig } = useAppStore();
  const [expandedToilet, setExpandedToilet] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<AnomalyType | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  const allAnomalies = useMemo(() => {
    if (toilets.length === 0) return [];
    return getAnomalyDetails(toilets, hourlyData, thresholdConfig);
  }, [toilets, hourlyData, thresholdConfig]);

  const filteredAnomalies = useMemo(() => {
    let result = allAnomalies;
    if (selectedCategory !== 'all') {
      result = result.filter((a) => a.type === selectedCategory);
    }
    if (severityFilter !== 'all') {
      result = result.filter((a) => a.severity === severityFilter);
    }
    return result;
  }, [allAnomalies, selectedCategory, severityFilter]);

  const groupedByType = useMemo(() => {
    const groups: Record<AnomalyType, AnomalyDetail[]> = {
      'high_flow_low_clean': [],
      'high_complaint_normal_inspection': [],
      'missing_checkin': [],
      'device_offline': [],
    };
    filteredAnomalies.forEach((a) => {
      groups[a.type].push(a);
    });
    return groups;
  }, [filteredAnomalies]);

  const trendChartOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      textStyle: { color: '#1e293b' },
    },
    legend: {
      data: ['高客流低保洁', '投诉多巡检正常', '连续缺打卡', '设备离线'],
      bottom: 0,
      textStyle: { fontSize: 12, color: '#64748b' },
    },
    grid: { left: '3%', right: '4%', bottom: '15%', top: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#64748b', fontSize: 12 },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
      axisLabel: { color: '#64748b', fontSize: 12 },
    },
    series: [
      {
        name: '高客流低保洁',
        type: 'line',
        smooth: true,
        data: [3, 5, 4, 6, 7, 9, 8],
        itemStyle: { color: '#f97316' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(249, 115, 22, 0.3)' },
              { offset: 1, color: 'rgba(249, 115, 22, 0)' },
            ],
          },
        },
      },
      {
        name: '投诉多巡检正常',
        type: 'line',
        smooth: true,
        data: [2, 3, 4, 3, 5, 6, 5],
        itemStyle: { color: '#ef4444' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(239, 68, 68, 0.3)' },
              { offset: 1, color: 'rgba(239, 68, 68, 0)' },
            ],
          },
        },
      },
      {
        name: '连续缺打卡',
        type: 'line',
        smooth: true,
        data: [1, 2, 1, 3, 2, 4, 3],
        itemStyle: { color: '#f59e0b' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(245, 158, 11, 0.3)' },
              { offset: 1, color: 'rgba(245, 158, 11, 0)' },
            ],
          },
        },
      },
      {
        name: '设备离线',
        type: 'line',
        smooth: true,
        data: [2, 2, 3, 2, 2, 3, 2],
        itemStyle: { color: '#64748b' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(100, 116, 139, 0.3)' },
              { offset: 1, color: 'rgba(100, 116, 139, 0)' },
            ],
          },
        },
      },
    ],
  };

  const severityColors = {
    high: 'bg-red-500',
    medium: 'bg-orange-500',
    low: 'bg-yellow-500',
  };

  const severityLabels = {
    high: '高风险',
    medium: '中风险',
    low: '低风险',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">异常分析</h1>
          <p className="text-navy-500 mt-1">智能识别三类异常点位，辅助调班决策</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-navy-500">
            <Filter className="w-4 h-4" />
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as any)}
              className="px-3 py-1.5 border border-navy-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">全部等级</option>
              <option value="high">高风险</option>
              <option value="medium">中风险</option>
              <option value="low">低风险</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {anomalyCategories.map((cat, index) => {
          const Icon = cat.icon;
          const count = groupedByType[cat.type].length;
          const isSelected = selectedCategory === cat.type;
          return (
            <button
              key={cat.type}
              onClick={() => setSelectedCategory(isSelected ? 'all' : cat.type)}
              className={`p-5 rounded-xl text-left transition-all card-hover ${
                isSelected
                  ? 'bg-white ring-2 ring-primary-500 shadow-lg'
                  : 'bg-white shadow-sm'
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start gap-3">
                <div className={`p-3 rounded-xl ${cat.bgColor}`}>
                  <Icon className={`w-6 h-6 ${cat.color}`} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-navy-800">{cat.label}</p>
                  <p className="text-3xl font-bold text-navy-900 mt-1">{count}</p>
                  <div className="flex items-center gap-1 mt-2 text-xs">
                    {count > 5 ? (
                      <>
                        <TrendingUp className="w-3 h-3 text-red-500" />
                        <span className="text-red-500">较上周 +23%</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="w-3 h-3 text-green-500" />
                        <span className="text-green-500">较上周 -12%</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-xs text-navy-400 mt-3">{cat.description}</p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-5">
          <h3 className="font-semibold text-navy-800 mb-4">异常趋势（近7天）</h3>
          <ReactECharts option={trendChartOption} style={{ height: '300px' }} />
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="font-semibold text-navy-800 mb-4">风险等级分布</h3>
          <div className="space-y-4">
            {(['high', 'medium', 'low'] as const).map((level) => {
              const count = filteredAnomalies.filter((a) => a.severity === level).length;
              const total = filteredAnomalies.length || 1;
              return (
                <div key={level}>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${severityColors[level]}`} />
                      <span className="text-navy-600">{severityLabels[level]}</span>
                    </div>
                    <span className="font-semibold text-navy-800">{count} 个</span>
                  </div>
                  <div className="h-2 bg-navy-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${severityColors[level]} rounded-full transition-all duration-700`}
                      style={{ width: `${(count / total) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-navy-100">
            <div className="text-center">
              <p className="text-sm text-navy-500">本周异常总数</p>
              <p className="text-4xl font-bold text-navy-900 mt-1">
                {allAnomalies.length}
              </p>
              <p className="text-xs text-green-500 mt-1 flex items-center justify-center gap-1">
                <TrendingDown className="w-3 h-3" />
                较上周下降 8.5%
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-4 border-b border-navy-100">
          <h3 className="font-semibold text-navy-800 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            异常点位详情
            <span className="text-sm font-normal text-navy-400">
              共 {filteredAnomalies.length} 条
            </span>
          </h3>
        </div>

        <div className="divide-y divide-navy-100">
          {filteredAnomalies.map((anomaly, index) => {
            const cat = anomalyCategories.find((c) => c.type === anomaly.type);
            const Icon = cat?.icon || AlertTriangle;
            const isExpanded = expandedToilet === `${anomaly.toiletId}-${anomaly.type}`;

            return (
              <div key={`${anomaly.toiletId}-${anomaly.type}-${index}`}>
                <button
                  onClick={() =>
                    setExpandedToilet(
                      isExpanded ? null : `${anomaly.toiletId}-${anomaly.type}`
                    )
                  }
                  className="w-full p-4 flex items-center gap-4 hover:bg-navy-50 transition-colors text-left"
                >
                  <div className={`p-2 rounded-lg ${cat?.bgColor || 'bg-navy-50'}`}>
                    <Icon className={`w-5 h-5 ${cat?.color || 'text-navy-500'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <p className="font-medium text-navy-800">{anomaly.toiletName}</p>
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          anomaly.severity === 'high'
                            ? 'bg-red-100 text-red-700'
                            : anomaly.severity === 'medium'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {severityLabels[anomaly.severity]}
                      </span>
                      <span className="text-xs text-navy-400">{cat?.label}</span>
                    </div>
                    <p className="text-sm text-navy-500 mt-0.5">{anomaly.description}</p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-navy-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-navy-400 flex-shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pl-16">
                    <div className="bg-navy-50 rounded-lg p-4">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-navy-400">异常类型</p>
                          <p className="font-medium text-navy-700 mt-1">{cat?.label}</p>
                        </div>
                        <div>
                          <p className="text-navy-400">风险等级</p>
                          <p className="font-medium text-navy-700 mt-1">
                            {severityLabels[anomaly.severity]}
                          </p>
                        </div>
                        <div>
                          <p className="text-navy-400">持续时间</p>
                          <p className="font-medium text-navy-700 mt-1">3 天</p>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-navy-200">
                        <p className="text-sm text-navy-600 font-medium mb-2">建议措施</p>
                        <ul className="text-sm text-navy-500 space-y-1">
                          <li>• 增加该点位保洁人员配置</li>
                          <li>• 调整保洁班次，覆盖高峰时段</li>
                          <li>• 安排专项巡检，排查问题根源</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filteredAnomalies.length === 0 && (
            <div className="p-12 text-center text-navy-400">
              <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>暂无符合条件的异常记录</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
