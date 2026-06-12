import { useState, useMemo, useEffect } from 'react';
import {
  History,
  Sun,
  Cloud,
  CloudRain,
  Snowflake,
  Calendar,
  MapPin,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Users,
  Sparkles,
  ArrowLeftRight,
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';
import { useAppStore } from '../store';
import { calculateDailyStats, generateHeatmapPoints } from '../utils/heatmap';
import { generatePatrolSuggestions } from '../utils/export';
import type { WeatherRecord, Activity, DailyStats } from '../types';

const weatherIcons: Record<string, typeof Sun> = {
  '晴': Sun,
  '多云': Cloud,
  '阴': Cloud,
  '小雨': CloudRain,
  '中雨': CloudRain,
  '大雨': CloudRain,
  '雪': Snowflake,
};

const weatherColors: Record<string, string> = {
  '晴': 'text-yellow-500',
  '多云': 'text-gray-500',
  '阴': 'text-gray-600',
  '小雨': 'text-blue-400',
  '中雨': 'text-blue-500',
  '大雨': 'text-blue-600',
  '雪': 'text-cyan-400',
};

const weatherBgColors: Record<string, string> = {
  '晴': 'bg-yellow-50',
  '多云': 'bg-gray-50',
  '阴': 'bg-gray-100',
  '小雨': 'bg-blue-50',
  '中雨': 'bg-blue-100',
  '大雨': 'bg-blue-200',
  '雪': 'bg-cyan-50',
};

export default function HistoryReview() {
  const { toilets, hourlyData, weather, activities, initMockData } = useAppStore();
  const [selectedDate, setSelectedDate] = useState(dayjs().subtract(3, 'day').format('YYYY-MM-DD'));
  const [compareDate, setCompareDate] = useState(dayjs().subtract(10, 'day').format('YYYY-MM-DD'));
  const [weatherFilter, setWeatherFilter] = useState<string>('all');
  const [showComparison, setShowComparison] = useState(false);
  const [selectedActivityFilter, setSelectedActivityFilter] = useState<string>('all');

  useEffect(() => {
    if (toilets.length === 0) {
      initMockData();
    }
  }, [toilets.length, initMockData]);

  const selectedWeather = useMemo(() => {
    return weather.find((w) => w.date === selectedDate);
  }, [weather, selectedDate]);

  const compareWeather = useMemo(() => {
    return weather.find((w) => w.date === compareDate);
  }, [weather, compareDate]);

  const dateActivities = useMemo(() => {
    return activities.filter((a) => a.activityDate === selectedDate);
  }, [activities, selectedDate]);

  const filteredDaysWithWeather = useMemo(() => {
    let result = weather;
    if (weatherFilter !== 'all') {
      result = result.filter((w) => w.weatherType === weatherFilter);
    }
    if (selectedActivityFilter === 'hasActivity') {
      const activityDates = new Set(activities.map((a) => a.activityDate));
      result = result.filter((w) => activityDates.has(w.date));
    } else if (selectedActivityFilter === 'noActivity') {
      const activityDates = new Set(activities.map((a) => a.activityDate));
      result = result.filter((w) => !activityDates.has(w.date));
    }
    return result.sort((a, b) => a.date.localeCompare(b.date));
  }, [weather, activities, weatherFilter, selectedActivityFilter]);

  const selectedDailyStats = useMemo((): DailyStats | null => {
    if (toilets.length === 0) return null;
    return calculateDailyStats(toilets, hourlyData, selectedDate);
  }, [toilets, hourlyData, selectedDate]);

  const compareDailyStats = useMemo((): DailyStats | null => {
    if (!showComparison || toilets.length === 0) return null;
    return calculateDailyStats(toilets, hourlyData, compareDate);
  }, [toilets, hourlyData, compareDate, showComparison]);

  const patrolSuggestions = useMemo(() => {
    const weatherType = selectedWeather?.weatherType || '晴';
    const isWeekend = dayjs(selectedDate).day() === 0 || dayjs(selectedDate).day() === 6;
    const hasActivity = dateActivities.length > 0;
    return generatePatrolSuggestions(selectedDate, weatherType, isWeekend, hasActivity);
  }, [selectedDate, selectedWeather, dateActivities]);

  const heatmapPoints = useMemo(() => {
    if (toilets.length === 0) return [];
    return generateHeatmapPoints(toilets, hourlyData, selectedDate, 12);
  }, [toilets, hourlyData, selectedDate]);

  const highRiskToilets = useMemo(() => {
    return [...heatmapPoints]
      .sort((a, b) => b.heatLevel - a.heatLevel || b.passengerCount - a.passengerCount)
      .slice(0, 5);
  }, [heatmapPoints]);

  const trendChartOption = {
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
    grid: { left: '3%', right: '4%', bottom: '3%', top: '12%', containLabel: true },
    xAxis: {
      type: 'category',
      data: filteredDaysWithWeather.map((w) => w.date.slice(5)),
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
        data: filteredDaysWithWeather.map((w) => {
          const stats = calculateDailyStats(toilets, hourlyData, w.date);
          return stats.totalPassengers;
        }),
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
        barWidth: 12,
      },
      {
        name: '保洁次数',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        data: filteredDaysWithWeather.map((w) => {
          const stats = calculateDailyStats(toilets, hourlyData, w.date);
          return stats.totalCleanings;
        }),
        itemStyle: { color: '#22c55e' },
        lineStyle: { width: 2 },
        symbol: 'circle',
        symbolSize: 6,
      },
    ],
  };

  const comparisonChartOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      textStyle: { color: '#1e293b' },
    },
    legend: {
      data: [selectedDate, compareDate],
      top: 0,
      textStyle: { fontSize: 12, color: '#64748b' },
    },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '12%', containLabel: true },
    xAxis: {
      type: 'category',
      data: ['6时', '8时', '10时', '12时', '14时', '16时', '18时', '20时', '22时'],
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#64748b', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      name: '客流人次',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
      axisLabel: { color: '#64748b', fontSize: 11 },
    },
    series: [
      {
        name: selectedDate,
        type: 'line',
        smooth: true,
        data: [6, 8, 10, 12, 14, 16, 18, 20, 22].map((hour) => {
          const data = hourlyData.find(
            (d) => d.date === selectedDate && d.hour === hour
          );
          return data ? data.passengerCount : 0;
        }),
        itemStyle: { color: '#3b82f6' },
        lineStyle: { width: 3 },
        symbol: 'circle',
        symbolSize: 8,
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0)' },
            ],
          },
        },
      },
      {
        name: compareDate,
        type: 'line',
        smooth: true,
        data: [6, 8, 10, 12, 14, 16, 18, 20, 22].map((hour) => {
          const data = hourlyData.find(
            (d) => d.date === compareDate && d.hour === hour
          );
          return data ? data.passengerCount : 0;
        }),
        itemStyle: { color: '#f97316' },
        lineStyle: { width: 3, type: 'dashed' },
        symbol: 'circle',
        symbolSize: 8,
      },
    ],
  };

  const getStatDiff = (current: number | undefined, compare: number | undefined): number | null => {
    if (current === undefined || compare === undefined || compare === 0) return null;
    const diff = (current - compare) / compare;
    return diff;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">历史回看</h1>
          <p className="text-navy-500 mt-1">按天气、活动日回看数据，辅助加巡决策</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowComparison(!showComparison)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              showComparison
                ? 'bg-primary-500 text-white'
                : 'bg-white text-navy-700 border border-navy-200 hover:bg-navy-50'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4" />
            双日对比
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-navy-400" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-navy-600">选择日期</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 text-sm border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {showComparison && (
            <div className="flex items-center gap-3">
              <ArrowLeftRight className="w-4 h-4 text-orange-400" />
              <div className="flex items-center gap-2">
                <span className="text-sm text-navy-600">对比日期</span>
                <input
                  type="date"
                  value={compareDate}
                  onChange={(e) => setCompareDate(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          )}

          <div className="h-6 w-px bg-navy-200" />

          <div className="flex items-center gap-2">
            <span className="text-sm text-navy-600">天气筛选</span>
            <select
              value={weatherFilter}
              onChange={(e) => setWeatherFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">全部天气</option>
              <option value="晴">晴天</option>
              <option value="多云">多云</option>
              <option value="阴">阴天</option>
              <option value="小雨">小雨</option>
              <option value="中雨">中雨</option>
              <option value="大雨">大雨</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-navy-600">活动日</span>
            <select
              value={selectedActivityFilter}
              onChange={(e) => setSelectedActivityFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">全部</option>
              <option value="hasActivity">有活动</option>
              <option value="noActivity">无活动</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-navy-500">当日客流</p>
              <p className="text-2xl font-bold text-navy-900 mt-1">
                {selectedDailyStats?.totalPassengers.toLocaleString() || 0}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-50">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
          </div>
          {showComparison && compareDailyStats && (
            <div className="mt-3 pt-3 border-t border-navy-100">
              {getStatDiff(
                selectedDailyStats?.totalPassengers,
                compareDailyStats.totalPassengers
              ) !== null && (
                <div className="flex items-center gap-1 text-xs">
                  {getStatDiff(
                    selectedDailyStats?.totalPassengers,
                    compareDailyStats.totalPassengers
                  )! >= 0 ? (
                    <>
                      <TrendingUp className="w-3 h-3 text-red-500" />
                      <span className="text-red-500">
                        较对比日 +{Math.abs(
                          Math.round(
                            getStatDiff(
                              selectedDailyStats?.totalPassengers,
                              compareDailyStats.totalPassengers
                            )! * 100
                          )
                        )}
                        %
                      </span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="w-3 h-3 text-green-500" />
                      <span className="text-green-500">
                        较对比日 -{Math.abs(
                          Math.round(
                            getStatDiff(
                              selectedDailyStats?.totalPassengers,
                              compareDailyStats.totalPassengers
                            )! * 100
                          )
                        )}
                        %
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-navy-500">保洁次数</p>
              <p className="text-2xl font-bold text-navy-900 mt-1">
                {selectedDailyStats?.totalCleanings || 0}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-green-50">
              <Sparkles className="w-5 h-5 text-green-500" />
            </div>
          </div>
          {showComparison && compareDailyStats && (
            <div className="mt-3 pt-3 border-t border-navy-100">
              {getStatDiff(
                selectedDailyStats?.totalCleanings,
                compareDailyStats.totalCleanings
              ) !== null && (
                <div className="flex items-center gap-1 text-xs">
                  {getStatDiff(
                    selectedDailyStats?.totalCleanings,
                    compareDailyStats.totalCleanings
                  )! >= 0 ? (
                    <>
                      <TrendingUp className="w-3 h-3 text-green-500" />
                      <span className="text-green-500">
                        较对比日 +{Math.abs(
                          Math.round(
                            getStatDiff(
                              selectedDailyStats?.totalCleanings,
                              compareDailyStats.totalCleanings
                            )! * 100
                          )
                        )}
                        %
                      </span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="w-3 h-3 text-red-500" />
                      <span className="text-red-500">
                        较对比日 -{Math.abs(
                          Math.round(
                            getStatDiff(
                              selectedDailyStats?.totalCleanings,
                              compareDailyStats.totalCleanings
                            )! * 100
                          )
                        )}
                        %
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-navy-500">投诉数量</p>
              <p className="text-2xl font-bold text-navy-900 mt-1">
                {selectedDailyStats?.totalComplaints || 0}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-orange-50">
              <AlertCircle className="w-5 h-5 text-orange-500" />
            </div>
          </div>
          {showComparison && compareDailyStats && (
            <div className="mt-3 pt-3 border-t border-navy-100">
              {getStatDiff(
                selectedDailyStats?.totalComplaints,
                compareDailyStats.totalComplaints
              ) !== null && (
                <div className="flex items-center gap-1 text-xs">
                  {getStatDiff(
                    selectedDailyStats?.totalComplaints,
                    compareDailyStats.totalComplaints
                  )! >= 0 ? (
                    <>
                      <TrendingUp className="w-3 h-3 text-red-500" />
                      <span className="text-red-500">
                        较对比日 +{Math.abs(
                          Math.round(
                            getStatDiff(
                              selectedDailyStats?.totalComplaints,
                              compareDailyStats.totalComplaints
                            )! * 100
                          )
                        )}
                        %
                      </span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="w-3 h-3 text-green-500" />
                      <span className="text-green-500">
                        较对比日 -{Math.abs(
                          Math.round(
                            getStatDiff(
                              selectedDailyStats?.totalComplaints,
                              compareDailyStats.totalComplaints
                            )! * 100
                          )
                        )}
                        %
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-navy-500">异常点位</p>
              <p className="text-2xl font-bold text-navy-900 mt-1">
                {selectedDailyStats?.anomalyCount || 0}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-red-50">
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
          </div>
          {showComparison && compareDailyStats && (
            <div className="mt-3 pt-3 border-t border-navy-100">
              {getStatDiff(
                selectedDailyStats?.anomalyCount,
                compareDailyStats.anomalyCount
              ) !== null && (
                <div className="flex items-center gap-1 text-xs">
                  {getStatDiff(
                    selectedDailyStats?.anomalyCount,
                    compareDailyStats.anomalyCount
                  )! >= 0 ? (
                    <>
                      <TrendingUp className="w-3 h-3 text-red-500" />
                      <span className="text-red-500">
                        较对比日 +{Math.abs(
                          Math.round(
                            getStatDiff(
                              selectedDailyStats?.anomalyCount,
                              compareDailyStats.anomalyCount
                            )! * 100
                          )
                        )}
                        %
                      </span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="w-3 h-3 text-green-500" />
                      <span className="text-green-500">
                        较对比日 -{Math.abs(
                          Math.round(
                            getStatDiff(
                              selectedDailyStats?.anomalyCount,
                              compareDailyStats.anomalyCount
                            )! * 100
                          )
                        )}
                        %
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="font-semibold text-navy-800 mb-4">客流与保洁趋势</h3>
            <ReactECharts option={trendChartOption} style={{ height: '280px' }} />
          </div>

          {showComparison && (
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h3 className="font-semibold text-navy-800 mb-4">双日客流对比</h3>
              <ReactECharts option={comparisonChartOption} style={{ height: '280px' }} />
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="font-semibold text-navy-800 mb-4">高压力点位 Top 5</h3>
            <div className="space-y-3">
              {highRiskToilets.map((point, index) => (
                <div key={point.toiletId} className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                      index === 0
                        ? 'bg-red-500'
                        : index === 1
                        ? 'bg-orange-500'
                        : index === 2
                        ? 'bg-yellow-500'
                        : 'bg-navy-300'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="flex-1 text-sm text-navy-700 truncate">
                    {point.toiletName}
                  </span>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: (() => {
                          const colors = {
                            1: '#22c55e',
                            2: '#84cc16',
                            3: '#eab308',
                            4: '#f97316',
                            5: '#ef4444',
                          };
                          return colors[point.heatLevel];
                        })(),
                      }}
                    />
                    <span className="text-xs text-navy-500">
                      热力{point.heatLevel}级
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-navy-800">
                    {point.passengerCount} 人
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="font-semibold text-navy-800 mb-4">当日天气</h3>
            {selectedWeather ? (
              <div className={`p-4 rounded-xl ${weatherBgColors[selectedWeather.weatherType] || 'bg-gray-50'}`}>
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-white shadow-sm">
                    {(() => {
                      const Icon = weatherIcons[selectedWeather.weatherType] || Sun;
                      return <Icon className={`w-8 h-8 ${weatherColors[selectedWeather.weatherType] || 'text-yellow-500'}`} />;
                    })()}
                  </div>
                  <div>
                    <p className="text-lg font-bold text-navy-900">{selectedWeather.weatherType}</p>
                    <p className="text-2xl font-bold text-navy-800">{selectedWeather.temperature}°C</p>
                    <p className="text-sm text-navy-500">{selectedWeather.windLevel}风</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-navy-400">
                <Sun className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">暂无天气数据</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="font-semibold text-navy-800 mb-4">当日活动</h3>
            {dateActivities.length > 0 ? (
              <div className="space-y-3">
                {dateActivities.map((activity) => (
                  <div key={activity.id} className="p-3 bg-orange-50 rounded-lg">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-navy-800 text-sm">{activity.name}</p>
                        <p className="text-xs text-navy-500 mt-0.5">{activity.location}</p>
                      </div>
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full flex-shrink-0 ${
                          activity.scale === '大型'
                            ? 'bg-red-100 text-red-700'
                            : activity.scale === '中型'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {activity.scale}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-navy-400">
                <MapPin className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">当日无活动</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="font-semibold text-navy-800 mb-4">加巡建议</h3>
            <div className="space-y-3">
              {patrolSuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg ${
                    suggestion.priority === 'high'
                      ? 'bg-red-50 border border-red-100'
                      : suggestion.priority === 'medium'
                      ? 'bg-orange-50 border border-orange-100'
                      : 'bg-green-50 border border-green-100'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        suggestion.priority === 'high'
                          ? 'bg-red-500 text-white'
                          : suggestion.priority === 'medium'
                          ? 'bg-orange-500 text-white'
                          : 'bg-green-500 text-white'
                      }`}
                    >
                      {suggestion.priority === 'high'
                        ? '高优先级'
                        : suggestion.priority === 'medium'
                        ? '中优先级'
                        : '低优先级'}
                    </span>
                  </div>
                  <p className="text-xs text-navy-600 mb-2">{suggestion.reason}</p>
                  <div className="flex flex-wrap gap-1">
                    {suggestion.toilets.map((toilet) => (
                      <span
                        key={toilet}
                        className="px-2 py-0.5 text-xs bg-white rounded text-navy-600 border border-navy-200"
                      >
                        {toilet}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5">
        <h3 className="font-semibold text-navy-800 mb-4">历史天气日历</h3>
        <div className="grid grid-cols-7 gap-2">
          {['日', '一', '二', '三', '四', '五', '六'].map((day) => (
            <div key={day} className="text-center text-xs text-navy-400 py-2">
              {day}
            </div>
          ))}
          {weather.slice(-28).map((w) => {
            const Icon = weatherIcons[w.weatherType] || Sun;
            const isSelected = w.date === selectedDate;
            const hasActivity = activities.some((a) => a.activityDate === w.date);
            return (
              <button
                key={w.date}
                onClick={() => setSelectedDate(w.date)}
                className={`p-2 rounded-lg transition-all text-center ${
                  isSelected
                    ? 'bg-primary-500 text-white shadow-lg'
                    : 'hover:bg-navy-50 hover:shadow-sm'
                }`}
              >
                <p className={`text-xs font-medium ${isSelected ? 'text-white' : 'text-navy-700'}`}>
                  {dayjs(w.date).date()}
                </p>
                <Icon
                  className={`w-4 h-4 mx-auto mt-1 ${
                    isSelected ? 'text-white' : weatherColors[w.weatherType] || 'text-yellow-500'
                  }`}
                />
                <p className={`text-xs mt-0.5 ${isSelected ? 'text-white/80' : 'text-navy-400'}`}>
                  {w.temperature}°
                </p>
                {hasActivity && (
                  <div className={`w-1.5 h-1.5 rounded-full mx-auto mt-0.5 ${
                    isSelected ? 'bg-white' : 'bg-orange-500'
                  }`} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
