import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Tag,
  ShoppingCart,
  ChevronRight,
  Cloud,
  Sun,
  CloudRain,
  Snowflake,
  Thermometer,
  Wind,
  Package,
  Clock,
  BarChart3,
  PieChart,
  ArrowRight,
  Info,
  CheckCircle,
  XCircle,
  Zap,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import {
  ChartCard,
  StackedBarChart,
  LineChart,
  HorizontalBarChart,
  DoughnutChart,
} from '../../../components/charts/ChartComponents';
import {
  formatCurrency,
  formatPercent,
  getTimeSlotLabel,
  getWeatherIcon,
  getWeatherTypeLabel,
  getWasteReasonLabel,
  getWasteReasonColor,
  getPromotionTypeLabel,
  getPromotionTypeColor,
  getWasteRateLevel,
} from '../../../utils/formatters';
import {
  calculateDailyStats,
  calculateTimeSlotStats,
  calculateCategoryStats,
  calculateTrendData,
  calculateWasteReasonDetails,
  calculatePromotionEffect,
  calculateSlowMovingItems,
  calculateStockoutAnalysis,
  calculateWeatherWasteCorrelation,
} from '../../../utils/analytics';
import { format, addDays } from 'date-fns';
import type { WeatherType, WasteReasonDetail, PromotionEffect, SlowMovingItem } from '../../../types';

const weatherIcons: Record<WeatherType, React.ReactNode> = {
  sunny: <Sun className="w-5 h-5" />,
  cloudy: <Cloud className="w-5 h-5" />,
  rainy: <CloudRain className="w-5 h-5" />,
  snowy: <Snowflake className="w-5 h-5" />,
  hot: <Thermometer className="w-5 h-5" />,
  cold: <Wind className="w-5 h-5" />,
};

export default function WasteAnalyticsPage() {
  const navigate = useNavigate();
  const {
    state,
    getStoreSales,
    getStoreWaste,
    getStoreOrderPlans,
    getCurrentStore,
  } = useApp();

  const [dateRange, setDateRange] = useState<'7d' | '14d' | '30d'>('7d');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const today = format(new Date(), 'yyyy-MM-dd');
  const currentStore = getCurrentStore();
  const sales = getStoreSales();
  const waste = getStoreWaste();
  const orderPlans = getStoreOrderPlans();

  const todayStats = useMemo(() => calculateDailyStats(sales, waste, today), [sales, waste, today]);
  const timeSlotStats = useMemo(() => calculateTimeSlotStats(sales, waste, today), [sales, waste, today]);
  const categoryStats = useMemo(
    () => calculateCategoryStats(sales, waste, state.products, state.categories, today),
    [sales, waste, state.products, state.categories, today]
  );
  const trendData = useMemo(() => calculateTrendData(sales, waste, 7), [sales, waste]);
  const wasteReasonDetails = useMemo(
    () => calculateWasteReasonDetails(waste, state.products, today),
    [waste, state.products, today]
  );
  const promotionEffects = useMemo(
    () => calculatePromotionEffect(sales, waste, state.products, 7),
    [sales, waste, state.products]
  );
  const slowMovingItems = useMemo(
    () => calculateSlowMovingItems(sales, waste, state.products, state.categories, 7),
    [sales, waste, state.products, state.categories]
  );

  const todayWeather = state.weatherData.find(w => w.date === today);
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const tomorrowWeather = state.weatherData.find(w => w.date === tomorrow) || state.weatherData[0];

  const timeSlotLabels = timeSlotStats.map(s => getTimeSlotLabel(s.timeSlot));

  const stockoutRecords = useMemo(() => {
    const deliveryData = state.deliveryData[state.currentStoreId] || [];
    return calculateStockoutAnalysis(sales, waste, deliveryData, state.products, today);
  }, [sales, waste, state.deliveryData, state.currentStoreId, state.products, today]);

  const wasteRateLevel = getWasteRateLevel(todayStats.wasteRate);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">报损分析</h1>
          <p className="text-gray-500 mt-1">
            {currentStore?.name} · 多维度报损分析，优化订货决策
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white rounded-xl shadow-card p-1">
            {(['7d', '14d', '30d'] as const).map(range => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dateRange === range
                    ? 'bg-primary-500 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {range === '7d' ? '近7天' : range === '14d' ? '近14天' : '近30天'}
              </button>
            ))}
          </div>
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
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">今日报损率</span>
            <div className={`w-3 h-3 rounded-full ${wasteRateLevel.bgColor}`} />
          </div>
          <div className="text-3xl font-bold text-gray-800">{formatPercent(todayStats.wasteRate)}</div>
          <div className="flex items-center gap-1 mt-2">
            {todayStats.wasteRate < 0.1 ? (
              <TrendingDown className="w-4 h-4 text-green-500" />
            ) : (
              <TrendingUp className="w-4 h-4 text-red-500" />
            )}
            <span className={`text-sm ${todayStats.wasteRate < 0.1 ? 'text-green-600' : 'text-red-600'}`}>
              {wasteRateLevel.label}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">报损金额</span>
            <Package className="w-5 h-5 text-red-400" />
          </div>
          <div className="text-3xl font-bold text-gray-800">
            {formatCurrency(todayStats.totalWaste * 12)}
          </div>
          <div className="text-sm text-gray-400 mt-2">预估损失金额</div>
        </div>

        <div className="bg-white rounded-xl shadow-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">缺货商品</span>
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="text-3xl font-bold text-gray-800">{stockoutRecords.length}</div>
          <div className="text-sm text-gray-400 mt-2">
            预估损失 {formatCurrency(stockoutRecords.reduce((sum, s) => sum + s.estimatedLostAmount, 0))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">折扣贡献率</span>
            <Tag className="w-5 h-5 text-primary-400" />
          </div>
          <div className="text-3xl font-bold text-gray-800">
            {formatPercent(todayStats.discountContribution)}
          </div>
          <div className="text-sm text-gray-400 mt-2">促销带来的销售占比</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChartCard title="分时段销售与报损对比" subtitle="各时段正常销售、折扣销售与报损数量">
            <StackedBarChart
              labels={timeSlotLabels}
              datasets={[
                {
                  label: '正常销售',
                  data: timeSlotStats.map(s => s.salesQty - s.discountQty),
                  backgroundColor: '#10B981',
                },
                {
                  label: '折扣销售',
                  data: timeSlotStats.map(s => s.discountQty),
                  backgroundColor: '#F59E0B',
                },
                {
                  label: '报损',
                  data: timeSlotStats.map(s => s.wasteQty),
                  backgroundColor: '#EF4444',
                },
              ]}
            />
          </ChartCard>
        </div>
        <div>
          <ChartCard title="报损率时段分布" subtitle="各时段报损率对比">
            <HorizontalBarChart
              labels={timeSlotLabels}
              datasets={[
                {
                  label: '报损率',
                  data: timeSlotStats.map(s => +(s.wasteRate * 100).toFixed(1)),
                  backgroundColor: '#EF4444',
                },
              ]}
            />
          </ChartCard>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="报损原因详情" subtitle="今日报损按原因分类及说明">
          <div className="space-y-3">
            {wasteReasonDetails.map((reason: WasteReasonDetail) => (
              <div
                key={reason.reason}
                className={`p-4 rounded-xl border transition-colors ${
                  reason.needsAttention
                    ? 'border-yellow-200 bg-yellow-50/50'
                    : 'border-gray-100 bg-gray-50/30'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getWasteReasonColor(reason.reason)}`}>
                      {reason.reasonLabel}
                    </span>
                    {reason.needsAttention && (
                      <span className="flex items-center gap-1 text-xs text-yellow-600">
                        <AlertTriangle className="w-3 h-3" />
                        需关注
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-800">{reason.quantity} 件</div>
                    <div className="text-xs text-gray-400">{formatCurrency(reason.amount)}</div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div
                    className={`h-2 rounded-full ${
                      reason.reason === 'expired' ? 'bg-red-500' :
                      reason.reason === 'poorQuality' ? 'bg-yellow-500' :
                      reason.reason === 'customerReturn' ? 'bg-orange-500' :
                      reason.reason === 'systemReturn' ? 'bg-gray-500' :
                      'bg-slate-400'
                    }`}
                    style={{ width: `${(reason.percentage * 100).toFixed(1)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500">{reason.description}</p>

                {reason.reason === 'systemReturn' && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-blue-700">
                        <p className="font-medium mb-1">系统退货说明</p>
                        <p>系统退货是总部根据临期预警自动发起的退货，不计入门店考核指标。</p>
                        <p className="mt-1">请配合上传商品照片，便于总部复核确认。</p>
                      </div>
                    </div>
                  </div>
                )}

                {reason.reason === 'unknown' && (
                  <div className="mt-3 p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-yellow-700">
                        <p className="font-medium mb-1">原因空白说明</p>
                        <p>报损原因未填写会影响数据分析准确性，建议尽量明确具体原因。</p>
                        <p className="mt-1">原因空白的记录会在督导报告中特别标注。</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="促销效果分析" subtitle="各类促销活动的减损效果">
          <div className="space-y-4">
            {promotionEffects.map((promo: PromotionEffect) => (
              <div key={promo.promotionType || 'none'} className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {promo.promotionType && (
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getPromotionTypeColor(promo.promotionType)}`}>
                        {getPromotionTypeLabel(promo.promotionType)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-medium text-gray-700">
                      效果 {(promo.effectiveness * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-semibold text-gray-800">{promo.totalSalesQty}</div>
                    <div className="text-xs text-gray-500">促销销量</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-green-600">+{promo.wasteReduction.toFixed(0)}</div>
                    <div className="text-xs text-gray-500">减少报损</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-primary-600">
                      {formatCurrency(promo.totalSalesAmount)}
                    </div>
                    <div className="text-xs text-gray-500">促销销售额</div>
                  </div>
                </div>

                {promo.promotionType === 'buyOneGetOne' && (
                  <div className="mt-3 p-2.5 bg-green-50 rounded-lg text-xs text-green-700">
                    <span className="font-medium">买一赠一：</span>
                    适合高毛利、保质期短的商品，通过增加销量来降低报损。
                  </div>
                )}
                {promo.promotionType === 'groupBuy' && (
                  <div className="mt-3 p-2.5 bg-purple-50 rounded-lg text-xs text-purple-700">
                    <span className="font-medium">临时团购：</span>
                    适合批量清理库存，建议在报损高峰时段前发起。
                  </div>
                )}
                {promo.promotionType === 'timeDiscount' && (
                  <div className="mt-3 p-2.5 bg-yellow-50 rounded-lg text-xs text-yellow-700">
                    <span className="font-medium">时段折扣：</span>
                    晚间折扣是减少当日报损的最常用方式，建议根据销售情况灵活调整折扣力度。
                  </div>
                )}
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="各品类报损与缺货率" subtitle="按品类对比报损率和缺货率">
          <HorizontalBarChart
            labels={categoryStats.map(c => c.categoryName)}
            datasets={[
              {
                label: '报损率',
                data: categoryStats.map(c => +(c.wasteRate * 100).toFixed(1)),
                backgroundColor: '#EF4444',
              },
              {
                label: '缺货率',
                data: categoryStats.map(c => +(c.stockoutRate * 100).toFixed(1)),
                backgroundColor: '#F59E0B',
              },
            ]}
          />
        </ChartCard>

        <ChartCard title="滞销商品TOP5" subtitle="报损率最高的商品">
          <div className="space-y-3">
            {slowMovingItems.slice(0, 5).map((item: SlowMovingItem, index: number) => (
              <div key={item.productId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  index === 0 ? 'bg-red-100 text-red-600' :
                  index === 1 ? 'bg-orange-100 text-orange-600' :
                  index === 2 ? 'bg-yellow-100 text-yellow-600' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-800">{item.productName}</div>
                  <div className="text-xs text-gray-400">{item.categoryName}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-red-600">{formatPercent(item.wasteRate)}</div>
                  <div className="text-xs text-gray-400">日均报损 {item.avgDailyWaste.toFixed(1)}</div>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChartCard title="近7日报损趋势" subtitle="报损率与销售额变化趋势">
            <LineChart
              labels={trendData.dates.map(d => d.slice(5))}
              datasets={[
                {
                  label: '报损率',
                  data: trendData.wasteRates.map(r => +(r * 100).toFixed(1)),
                  borderColor: '#EF4444',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  fill: true,
                  yAxisID: 'y',
                },
                {
                  label: '销售额',
                  data: trendData.salesAmounts,
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
          <ChartCard title="明日订货建议" subtitle="基于历史数据与天气预测">
            {tomorrowWeather && (
              <div className="p-4 bg-blue-50 rounded-xl mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-3xl">{getWeatherIcon(tomorrowWeather.type)}</div>
                  <div>
                    <div className="font-medium text-gray-800">
                      明日 {getWeatherTypeLabel(tomorrowWeather.type)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {tomorrowWeather.temperature}°C
                    </div>
                  </div>
                </div>
                <p className="text-xs text-blue-600">
                  系统已根据明日天气调整订货建议
                </p>
              </div>
            )}

            <div className="space-y-2 mb-4">
              {state.categories.slice(0, 4).map(cat => {
                const catProducts = state.products.filter(p => p.categoryId === cat.id);
                const catPlans = orderPlans.filter(p => catProducts.some(cp => cp.id === p.productId));
                const totalQty = catPlans.reduce((sum, p) => sum + (p.adjustedQty || p.suggestedQty), 0);

                return (
                  <div key={cat.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <span className="text-sm text-gray-600">{cat.name}</span>
                    <span className="font-medium text-gray-800">{totalQty} 件</span>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => navigate('/manager/order')}
              className="w-full flex items-center justify-center gap-2 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              查看全部订货建议
              <ChevronRight className="w-4 h-4" />
            </button>
          </ChartCard>
        </div>
      </div>

      {stockoutRecords.length > 0 && (
        <div className="bg-white rounded-xl shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-gray-800">今日缺货预警</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                以下商品可能存在缺货情况，建议关注并调整订货量
              </p>
            </div>
            <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-sm rounded-full font-medium">
              {stockoutRecords.length} 个商品
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stockoutRecords.slice(0, 6).map(record => {
              const product = state.products.find(p => p.id === record.productId);
              return (
                <div key={record.id} className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center text-lg">
                      🍱
                    </div>
                    <div>
                      <div className="font-medium text-gray-800">{product?.name}</div>
                      <div className="text-xs text-gray-400">
                        {getTimeSlotLabel(record.timeSlot)} 可能缺货
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">预估损失</span>
                    <span className="font-medium text-red-600">
                      {formatCurrency(record.estimatedLostAmount)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
