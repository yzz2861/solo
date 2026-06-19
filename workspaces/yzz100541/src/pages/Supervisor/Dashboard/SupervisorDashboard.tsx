import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Store,
  BarChart3,
  Cloud,
  Sun,
  CloudRain,
  Snowflake,
  Thermometer,
  Wind,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  FileText,
  MapPin,
  Clock,
  Zap,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import {
  ChartCard,
  StackedBarChart,
  HorizontalBarChart,
  DoughnutChart,
  LineChart,
} from '../../../components/charts/ChartComponents';
import {
  formatCurrency,
  formatPercent,
  getStoreTypeLabel,
  getStoreTypeColor,
  getWeatherTypeLabel,
  getWeatherIcon,
  getTimeSlotLabel,
  getWasteRateLevel,
} from '../../../utils/formatters';
import {
  calculateStoreStats,
  calculateStoreTypeAnalysis,
  calculateWeatherWasteAnalysis,
  calculateTimeSlotWastePatterns,
  calculateTrendData,
} from '../../../utils/analytics';
import { format } from 'date-fns';
import type { StoreStats, StoreTypeAnalysis, WeatherWasteAnalysis, TimeSlotWastePattern, WeatherType } from '../../../types';

const weatherIcons: Record<WeatherType, React.ReactNode> = {
  sunny: <Sun className="w-5 h-5" />,
  cloudy: <Cloud className="w-5 h-5" />,
  rainy: <CloudRain className="w-5 h-5" />,
  snowy: <Snowflake className="w-5 h-5" />,
  hot: <Thermometer className="w-5 h-5" />,
  cold: <Wind className="w-5 h-5" />,
};

export default function SupervisorDashboard() {
  const navigate = useNavigate();
  const { state } = useApp();

  const [selectedStoreType, setSelectedStoreType] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'wasteRate' | 'wasteRateChange' | 'totalSales'>('wasteRate');

  const today = format(new Date(), 'yyyy-MM-dd');

  const storeStats = useMemo(() => {
    return state.stores.map(store =>
      calculateStoreStats(store, state.salesData[store.id] || [], state.wasteData[store.id] || [], today)
    );
  }, [state.stores, state.salesData, state.wasteData, today]);

  const storeTypeAnalysis = useMemo(() => {
    return calculateStoreTypeAnalysis(state.stores, state.salesData, state.wasteData, 7);
  }, [state.stores, state.salesData, state.wasteData]);

  const weatherAnalysis = useMemo(() => {
    return calculateWeatherWasteAnalysis(state.stores, state.salesData, state.wasteData, state.weatherData, 14);
  }, [state.stores, state.salesData, state.wasteData, state.weatherData]);

  const wastePatterns = useMemo(() => {
    return calculateTimeSlotWastePatterns(state.stores, state.salesData, state.wasteData, 7);
  }, [state.stores, state.salesData, state.wasteData]);

  const todayWeather = state.weatherData.find(w => w.date === today);

  const avgWasteRate = useMemo(() => {
    return storeStats.reduce((sum, s) => sum + s.wasteRate, 0) / storeStats.length;
  }, [storeStats]);

  const totalSales = useMemo(() => {
    return storeStats.reduce((sum, s) => sum + s.totalSales, 0);
  }, [storeStats]);

  const problemStores = useMemo(() => {
    return storeStats.filter(s => s.wasteRate > 0.15).sort((a, b) => b.wasteRate - a.wasteRate);
  }, [storeStats]);

  const sortedStores = useMemo(() => {
    const filtered = selectedStoreType
      ? storeStats.filter(s => s.storeType === selectedStoreType)
      : storeStats;
    return [...filtered].sort((a, b) => {
      if (sortBy === 'wasteRate') return b.wasteRate - a.wasteRate;
      if (sortBy === 'wasteRateChange') return b.wasteRateChange - a.wasteRateChange;
      return b.totalSales - a.totalSales;
    });
  }, [storeStats, selectedStoreType, sortBy]);

  const overallTrend = useMemo(() => {
    const allSales = Object.values(state.salesData).flat();
    const allWaste = Object.values(state.wasteData).flat();
    return calculateTrendData(allSales, allWaste, 7);
  }, [state.salesData, state.wasteData]);

  const highFrequencyPatterns = useMemo(() => {
    return wastePatterns.filter(p => p.frequency > 0.7).slice(0, 6);
  }, [wastePatterns]);

  const wasteRateLevel = getWasteRateLevel(avgWasteRate);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">门店总览</h1>
          <p className="text-gray-500 mt-1">
            华东区域 · {state.stores.length} 家门店 · 今日数据概览
          </p>
        </div>
        <div className="flex items-center gap-4">
          {todayWeather && (
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-card">
              {weatherIcons[todayWeather.type]}
              <div>
                <div className="text-sm font-medium text-gray-700">
                  {getWeatherTypeLabel(todayWeather.type)} {todayWeather.temperature}°C
                </div>
                <div className="text-xs text-gray-400">今日天气</div>
              </div>
            </div>
          )}
          <button
            onClick={() => navigate('/supervisor/report')}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm font-medium"
          >
            <FileText className="w-4 h-4" />
            生成督导报告
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">平均报损率</span>
            <div className={`w-3 h-3 rounded-full ${wasteRateLevel.bgColor}`} />
          </div>
          <div className="text-3xl font-bold text-gray-800">{formatPercent(avgWasteRate)}</div>
          <div className="flex items-center gap-1 mt-2">
            <span className={`text-sm ${wasteRateLevel.color}`}>{wasteRateLevel.label}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">今日总销售额</span>
            <BarChart3 className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-3xl font-bold text-gray-800">{formatCurrency(totalSales)}</div>
          <div className="text-sm text-gray-400 mt-2">{state.stores.length} 家门店</div>
        </div>

        <div className="bg-white rounded-xl shadow-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">高报损门店</span>
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="text-3xl font-bold text-gray-800">{problemStores.length}</div>
          <div className="text-sm text-yellow-600 mt-2">报损率超过 15%</div>
        </div>

        <div className="bg-white rounded-xl shadow-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">门店类型</span>
            <Store className="w-5 h-5 text-primary-400" />
          </div>
          <div className="text-3xl font-bold text-gray-800">{storeTypeAnalysis.length}</div>
          <div className="text-sm text-gray-400 mt-2">种商圈类型</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChartCard title="门店报损率排行" subtitle="各门店今日报损率对比">
            <HorizontalBarChart
              labels={sortedStores.slice(0, 6).map(s => s.storeName)}
              datasets={[
                {
                  label: '报损率',
                  data: sortedStores.slice(0, 6).map(s => +(s.wasteRate * 100).toFixed(1)),
                  backgroundColor: '#EF4444',
                },
              ]}
            />
          </ChartCard>
        </div>
        <div>
          <ChartCard title="门店类型分布" subtitle="按商圈类型统计">
            <DoughnutChart
              labels={storeTypeAnalysis.map(s => getStoreTypeLabel(s.storeType as any))}
              data={storeTypeAnalysis.map(s => s.storeCount)}
              colors={['#FF7A45', '#10B981', '#6366F1', '#F59E0B']}
              centerText={state.stores.length.toString()}
              centerSubtext="家门店"
              height={260}
            />
          </ChartCard>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="门店类型对比分析" subtitle="不同商圈类型的报损与销售表现">
          <div className="space-y-4">
            {storeTypeAnalysis.map((item: StoreTypeAnalysis) => (
              <div
                key={item.storeType}
                className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => setSelectedStoreType(selectedStoreType === item.storeType ? null : item.storeType)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStoreTypeColor(item.storeType as any)}`}>
                      {getStoreTypeLabel(item.storeType as any)}
                    </span>
                    <span className="text-xs text-gray-400">{item.storeCount} 家门店</span>
                  </div>
                  {selectedStoreType === item.storeType && (
                    <span className="text-xs text-primary-600 font-medium">已筛选</span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-semibold text-red-600">{formatPercent(item.avgWasteRate)}</div>
                    <div className="text-xs text-gray-500">平均报损率</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-green-600">{formatCurrency(item.avgSalesAmount)}</div>
                    <div className="text-xs text-gray-500">日均销售额</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-yellow-600">{formatPercent(item.avgStockoutRate)}</div>
                    <div className="text-xs text-gray-500">平均缺货率</div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <Clock className="w-3 h-3" />
                    <span>最佳时段：{getTimeSlotLabel(item.bestTimeSlot)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-red-600">
                    <AlertTriangle className="w-3 h-3" />
                    <span>最差时段：{getTimeSlotLabel(item.worstTimeSlot)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-4 text-center">
            * 不同商圈类型有不同的消费规律，请勿简单对比报损率
          </p>
        </ChartCard>

        <ChartCard title="天气对报损的影响" subtitle="不同天气下的报损率对比">
          <div className="space-y-3">
            {weatherAnalysis.map((item: WeatherWasteAnalysis) => (
              <div key={item.weatherType} className="p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getWeatherIcon(item.weatherType as any)}</span>
                    <div>
                      <div className="font-medium text-gray-800">
                        {getWeatherTypeLabel(item.weatherType as any)}
                      </div>
                      <div className="text-xs text-gray-400">{item.storeCount} 家门店样本</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-semibold ${
                      item.comparedToNormal > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {formatPercent(item.avgWasteRate)}
                    </div>
                    <div className={`flex items-center justify-end gap-1 text-xs ${
                      item.comparedToNormal > 0 ? 'text-red-500' : 'text-green-500'
                    }`}>
                      {item.comparedToNormal > 0 ? (
                        <ArrowUpRight className="w-3 h-3" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3" />
                      )}
                      <span>较平均 {item.comparedToNormal > 0 ? '+' : ''}{(item.comparedToNormal * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      item.comparedToNormal > 0.1 ? 'bg-red-500' :
                      item.comparedToNormal < -0.1 ? 'bg-green-500' :
                      'bg-yellow-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(20, item.avgWasteRate * 500))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-4 text-center">
            * 天气因素会显著影响客流，订货时需考虑天气预测
          </p>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChartCard title="近7天整体报损趋势" subtitle="全区域报损率与销售额变化">
            <LineChart
              labels={overallTrend.dates.map(d => d.slice(5))}
              datasets={[
                {
                  label: '平均报损率',
                  data: overallTrend.wasteRates.map(r => +(r * 100).toFixed(1)),
                  borderColor: '#EF4444',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  fill: true,
                  yAxisID: 'y',
                },
                {
                  label: '总销售额',
                  data: overallTrend.salesAmounts,
                  borderColor: '#10B981',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  fill: true,
                  yAxisID: 'y1',
                },
              ]}
            />
          </ChartCard>
        </div>

        <div>
          <ChartCard title="高频报损时段" subtitle="出现频率最高的报损时段">
            <div className="space-y-3">
              {highFrequencyPatterns.map((pattern: TimeSlotWastePattern, index: number) => (
                <div key={`${pattern.storeId}-${pattern.timeSlot}`} className="p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        index < 3 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {index + 1}
                      </span>
                      <div>
                        <div className="font-medium text-gray-800 text-sm">{pattern.storeName}</div>
                        <div className="text-xs text-gray-400">{getTimeSlotLabel(pattern.timeSlot)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-red-600 text-sm">
                        {formatPercent(pattern.wasteRate)}
                      </div>
                      <div className="text-xs text-gray-400">
                        频率 {(pattern.frequency * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      pattern.trend === 'rising' ? 'bg-red-100 text-red-600' :
                      pattern.trend === 'falling' ? 'bg-green-100 text-green-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {pattern.trend === 'rising' ? '上升趋势' :
                       pattern.trend === 'falling' ? '下降趋势' : '稳定'}
                    </span>
                    <span className="text-xs text-gray-400">
                      日均报损 {pattern.avgWasteQty.toFixed(1)} 件
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-gray-800">门店详情列表</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              点击门店可查看详细数据，共 {sortedStores.length} 家门店
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">排序：</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-primary-500"
            >
              <option value="wasteRate">按报损率</option>
              <option value="wasteRateChange">按变化率</option>
              <option value="totalSales">按销售额</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">门店</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase">类型</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase">报损率</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase">较昨日</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase">销售额</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase">7日平均</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody>
              {sortedStores.map((store: StoreStats) => {
                const level = getWasteRateLevel(store.wasteRate);
                return (
                  <tr key={store.storeId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                          <Store className="w-5 h-5 text-primary-500" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-800">{store.storeName}</div>
                          <div className="text-xs text-gray-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            华东区域
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${getStoreTypeColor(store.storeType as any)}`}>
                        {getStoreTypeLabel(store.storeType as any)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`font-semibold ${level.color}`}>
                        {formatPercent(store.wasteRate)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 text-sm ${
                        store.wasteRateChange > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {store.wasteRateChange > 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {store.wasteRateChange > 0 ? '+' : ''}
                        {(store.wasteRateChange * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-medium text-gray-800">
                      {formatCurrency(store.totalSales)}
                    </td>
                    <td className="py-3 px-4 text-center text-gray-600">
                      {formatPercent(store.avgWasteRate)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => navigate('/supervisor/report')}
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1 ml-auto"
                      >
                        查看详情
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {problemStores.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-800 mb-2">重点关注门店</h3>
              <p className="text-sm text-red-600 mb-3">
                以下 {problemStores.length} 家门店报损率超过 15%，建议重点关注并督导改进
              </p>
              <div className="flex flex-wrap gap-2">
                {problemStores.map(store => (
                  <span
                    key={store.storeId}
                    className="px-3 py-1.5 bg-white rounded-lg text-sm font-medium text-red-700 border border-red-200"
                  >
                    {store.storeName} · {formatPercent(store.wasteRate)}
                  </span>
                ))}
              </div>
            </div>
            <button
              onClick={() => navigate('/supervisor/report')}
              className="flex items-center gap-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
            >
              <Zap className="w-4 h-4" />
              生成整改报告
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
