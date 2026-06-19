import React, { useState, useMemo } from 'react';
import {
  FileText,
  Download,
  Share2,
  Calendar,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Store,
  Cloud,
  Sun,
  CloudRain,
  Snowflake,
  Thermometer,
  Wind,
  Clock,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  BarChart3,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import {
  ChartCard,
  LineChart,
  HorizontalBarChart,
  DoughnutChart,
  StackedBarChart,
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
  generateSupervisorReport,
  calculateTrendData,
} from '../../../utils/analytics';
import { format, subDays } from 'date-fns';
import type {
  SupervisorReportData,
  StoreStats,
  TimeSlotWastePattern,
  WeatherWasteAnalysis,
  StoreTypeAnalysis,
  WeatherType,
} from '../../../types';

const weatherIcons: Record<WeatherType, React.ReactNode> = {
  sunny: <Sun className="w-5 h-5" />,
  cloudy: <Cloud className="w-5 h-5" />,
  rainy: <CloudRain className="w-5 h-5" />,
  snowy: <Snowflake className="w-5 h-5" />,
  hot: <Thermometer className="w-5 h-5" />,
  cold: <Wind className="w-5 h-5" />,
};

export default function SupervisorReport() {
  const { state } = useApp();

  const [period, setPeriod] = useState<7 | 14 | 30>(7);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['summary', 'problemStores', 'patterns', 'weather', 'recommendations'])
  );

  const report = useMemo<SupervisorReportData>(() => {
    return generateSupervisorReport(state.stores, state.salesData, state.wasteData, state.weatherData, period);
  }, [state.stores, state.salesData, state.wasteData, state.weatherData, period]);

  const overallTrend = useMemo(() => {
    const allSales = Object.values(state.salesData).flat();
    const allWaste = Object.values(state.wasteData).flat();
    return calculateTrendData(allSales, allWaste, period);
  }, [state.salesData, state.wasteData, period]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const wasteRateLevel = getWasteRateLevel(report.avgWasteRate);

  const SectionHeader = ({ id, icon, title, subtitle }: {
    id: string;
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
  }) => (
    <button
      onClick={() => toggleSection(id)}
      className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
          {icon}
        </div>
        <div className="text-left">
          <h3 className="font-semibold text-gray-800">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {expandedSections.has(id) ? (
        <ChevronUp className="w-5 h-5 text-gray-400" />
      ) : (
        <ChevronDown className="w-5 h-5 text-gray-400" />
      )}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">督导报告</h1>
          <p className="text-gray-500 mt-1">
            {report.periodStart} ~ {report.periodEnd} · 综合分析报告
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white rounded-xl shadow-card p-1">
            {([7, 14, 30] as const).map(d => (
              <button
                key={d}
                onClick={() => setPeriod(d)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  period === d
                    ? 'bg-primary-500 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                近{d}天
              </button>
            ))}
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
            <Download className="w-4 h-4" />
            导出报告
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm font-medium">
            <Share2 className="w-4 h-4" />
            分享
          </button>
        </div>
      </div>

      <div className="bg-gradient-to-r from-primary-500 to-orange-400 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-6 h-6" />
              <span className="text-white/90 text-sm">商超鲜食报损分析报告</span>
            </div>
            <h2 className="text-3xl font-bold mb-1">华东区域 {period} 日报损分析</h2>
            <p className="text-white/80">
              报告周期：{report.periodStart} 至 {report.periodEnd}
            </p>
          </div>
          <div className="text-right">
            <div className="text-white/80 text-sm mb-1">平均报损率</div>
            <div className="text-4xl font-bold">{formatPercent(report.avgWasteRate)}</div>
            <div className={`flex items-center justify-end gap-1 mt-1 ${
              report.wasteRateChange < 0 ? 'text-green-200' : 'text-red-200'
            }`}>
              {report.wasteRateChange < 0 ? (
                <TrendingDown className="w-4 h-4" />
              ) : (
                <TrendingUp className="w-4 h-4" />
              )}
              <span className="text-sm">
                较上周期 {report.wasteRateChange > 0 ? '+' : ''}
                {(report.wasteRateChange * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/20">
          <div>
            <div className="text-white/70 text-sm mb-1">门店总数</div>
            <div className="text-2xl font-bold">{report.totalStores} 家</div>
          </div>
          <div>
            <div className="text-white/70 text-sm mb-1">总销售额</div>
            <div className="text-2xl font-bold">{formatCurrency(report.totalSales)}</div>
          </div>
          <div>
            <div className="text-white/70 text-sm mb-1">报损金额</div>
            <div className="text-2xl font-bold">{formatCurrency(report.totalWasteAmount)}</div>
          </div>
          <div>
            <div className="text-white/70 text-sm mb-1">综合评级</div>
            <div className="text-2xl font-bold">{wasteRateLevel.label}</div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <SectionHeader
          id="summary"
          icon={<BarChart3 className="w-5 h-5 text-primary-500" />}
          title="数据总览"
          subtitle={`${period}天整体报损与销售趋势`}
        />
        {expandedSections.has('summary') && (
          <div className="bg-white rounded-xl shadow-card p-5">
            <ChartCard title="报损率与销售额趋势" subtitle={`近${period}天变化趋势`}>
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
        )}
      </div>

      <div className="space-y-4">
        <SectionHeader
          id="problemStores"
          icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
          title="门店排行榜"
          subtitle="表现最好与最差的门店"
        />
        {expandedSections.has('problemStores') && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-card p-5">
              <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center text-red-600 text-sm font-bold">↓</span>
                需重点关注门店
              </h4>
              <div className="space-y-3">
                {report.topProblemStores.map((store: StoreStats, index: number) => (
                  <div key={store.storeId} className="p-4 bg-red-50 rounded-xl border border-red-100">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 bg-red-200 rounded-full flex items-center justify-center text-red-700 font-bold text-sm">
                          {index + 1}
                        </span>
                        <div>
                          <div className="font-medium text-gray-800">{store.storeName}</div>
                          <span className={`text-xs ${getStoreTypeColor(store.storeType as any)} px-1.5 py-0.5 rounded`}>
                            {getStoreTypeLabel(store.storeType as any)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-red-600">
                          {formatPercent(store.wasteRate)}
                        </div>
                        <div className="text-xs text-gray-400">
                          7日均值 {formatPercent(store.avgWasteRate)}
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-red-200 rounded-full h-2">
                      <div
                        className="bg-red-500 h-2 rounded-full"
                        style={{ width: `${Math.min(100, store.wasteRate * 300)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-card p-5">
              <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-sm font-bold">↑</span>
                表现优秀门店
              </h4>
              <div className="space-y-3">
                {report.bestPerformingStores.map((store: StoreStats, index: number) => (
                  <div key={store.storeId} className="p-4 bg-green-50 rounded-xl border border-green-100">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 bg-green-200 rounded-full flex items-center justify-center text-green-700 font-bold text-sm">
                          {index + 1}
                        </span>
                        <div>
                          <div className="font-medium text-gray-800">{store.storeName}</div>
                          <span className={`text-xs ${getStoreTypeColor(store.storeType as any)} px-1.5 py-0.5 rounded`}>
                            {getStoreTypeLabel(store.storeType as any)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">
                          {formatPercent(store.wasteRate)}
                        </div>
                        <div className="text-xs text-gray-400">
                          7日均值 {formatPercent(store.avgWasteRate)}
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-green-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${Math.min(100, store.wasteRate * 500)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <SectionHeader
          id="patterns"
          icon={<Clock className="w-5 h-5 text-yellow-500" />}
          title="报损时段模式"
          subtitle="高频率报损的时段分布"
        />
        {expandedSections.has('patterns') && (
          <div className="bg-white rounded-xl shadow-card p-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-800 mb-4">高频报损时段TOP10</h4>
                <div className="space-y-2">
                  {report.commonWastePatterns.slice(0, 10).map((pattern: TimeSlotWastePattern, index: number) => (
                    <div
                      key={`${pattern.storeId}-${pattern.timeSlot}`}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        index < 3 ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-800">
                          {pattern.storeName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {getTimeSlotLabel(pattern.timeSlot)} · 频率 {(pattern.frequency * 100).toFixed(0)}%
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-red-600">
                          {formatPercent(pattern.wasteRate)}
                        </div>
                        <div className={`text-xs ${
                          pattern.trend === 'rising' ? 'text-red-500' :
                          pattern.trend === 'falling' ? 'text-green-500' : 'text-gray-400'
                        }`}>
                          {pattern.trend === 'rising' ? '↑ 上升' :
                           pattern.trend === 'falling' ? '↓ 下降' : '→ 稳定'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-800 mb-4">时段分布统计</h4>
                <div className="space-y-4">
                  {['morning', 'noon', 'afternoon', 'evening', 'night'].map(slot => {
                    const slotPatterns = report.commonWastePatterns.filter(p => p.timeSlot === slot);
                    const avgWasteRate = slotPatterns.length > 0
                      ? slotPatterns.reduce((sum, p) => sum + p.wasteRate, 0) / slotPatterns.length
                      : 0;
                    return (
                      <div key={slot} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">
                            {getTimeSlotLabel(slot as any)}
                          </span>
                          <span className="text-sm text-gray-500">
                            {slotPatterns.length} 家门店高频
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-orange-500 h-2 rounded-full"
                            style={{ width: `${Math.min(100, avgWasteRate * 500)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-400 mt-4">
                  * 晚间是报损高发时段，建议加强晚市折扣和临期促销
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <SectionHeader
          id="weather"
          icon={<Cloud className="w-5 h-5 text-blue-500" />}
          title="天气与门店类型分析"
          subtitle="排除外界因素，客观评估门店表现"
        />
        {expandedSections.has('weather') && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-card p-5">
              <h4 className="font-semibold text-gray-800 mb-4">天气对报损的影响</h4>
              <div className="space-y-3">
                {report.weatherImpact.map((item: WeatherWasteAnalysis) => (
                  <div key={item.weatherType} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <span className="text-2xl">{getWeatherIcon(item.weatherType as any)}</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-800">
                        {getWeatherTypeLabel(item.weatherType as any)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.storeCount} 家门店样本
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-semibold ${
                        item.comparedToNormal > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {formatPercent(item.avgWasteRate)}
                      </div>
                      <div className="text-xs text-gray-400">
                        {item.comparedToNormal > 0 ? '+' : ''}
                        {(item.comparedToNormal * 100).toFixed(1)}% vs 平均
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-4 p-3 bg-blue-50 rounded-lg">
                💡 提示：评估门店表现时需考虑天气因素，雨天和极端天气会导致客流下降，报损率自然上升，不应完全归因于店长管理。
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-card p-5">
              <h4 className="font-semibold text-gray-800 mb-4">门店类型对比</h4>
              <div className="space-y-3">
                {report.storeTypeComparison.map((item: StoreTypeAnalysis) => (
                  <div key={item.storeType} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStoreTypeColor(item.storeType as any)}`}>
                        {getStoreTypeLabel(item.storeType as any)}
                      </span>
                      <span className="text-xs text-gray-500">{item.storeCount} 家门店</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div>
                        <div className="font-semibold text-red-600">{formatPercent(item.avgWasteRate)}</div>
                        <div className="text-gray-400">报损率</div>
                      </div>
                      <div>
                        <div className="font-semibold text-green-600">{formatCurrency(item.avgSalesAmount)}</div>
                        <div className="text-gray-400">日均销售</div>
                      </div>
                      <div>
                        <div className="font-semibold text-yellow-600">{formatPercent(item.avgStockoutRate)}</div>
                        <div className="text-gray-400">缺货率</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-4 p-3 bg-yellow-50 rounded-lg">
                ⚠️ 注意：不同商圈类型的客群和消费规律差异很大，应将同类型门店横向对比，避免把商圈差异误判为店长能力问题。
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <SectionHeader
          id="recommendations"
          icon={<Lightbulb className="w-5 h-5 text-yellow-500" />}
          title="改进建议"
          subtitle="基于数据分析的行动建议"
        />
        {expandedSections.has('recommendations') && (
          <div className="bg-white rounded-xl shadow-card p-5">
            <div className="space-y-3">
              {report.recommendations.map((rec: string, index: number) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-100"
                >
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Lightbulb className="w-4 h-4 text-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-700">{rec}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-semibold text-blue-800 mb-2">下期重点关注</h5>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• 跟踪高报损门店的改进情况</li>
                    <li>• 验证促销活动的减损效果</li>
                    <li>• 优化天气-订货预测模型</li>
                    <li>• 推广优秀门店的最佳实践</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-card p-5">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div>
            报告生成时间：{new Date().toLocaleString('zh-CN')}
          </div>
          <div>
            数据来源：销售系统 · 报损系统 · 天气数据
          </div>
        </div>
      </div>
    </div>
  );
}
