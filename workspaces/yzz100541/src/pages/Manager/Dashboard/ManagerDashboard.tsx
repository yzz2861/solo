import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingDown,
  DollarSign,
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
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import StatCard from '../../../components/common/StatCard';
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
} from '../../../utils/formatters';
import {
  calculateDailyStats,
  calculateTimeSlotStats,
  calculateCategoryStats,
  calculateTrendData,
} from '../../../utils/analytics';
import { format, addDays } from 'date-fns';
import type { WeatherType, TimeSlotStats, CategoryStats } from '../../../types';

const weatherIcons: Record<WeatherType, React.ReactNode> = {
  sunny: <Sun className="w-5 h-5" />,
  cloudy: <Cloud className="w-5 h-5" />,
  rainy: <CloudRain className="w-5 h-5" />,
  snowy: <Snowflake className="w-5 h-5" />,
  hot: <Thermometer className="w-5 h-5" />,
  cold: <Wind className="w-5 h-5" />,
};

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const {
    state,
    getStoreSales,
    getStoreWaste,
    getCurrentStore,
    getStoreOrderPlans,
  } = useApp();

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

  const todayWeather = state.weatherData.find(w => w.date === today);
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const tomorrowWeather = state.weatherData.find(w => w.date === tomorrow) || state.weatherData[0];

  const totalOrderQty = orderPlans.reduce((sum, p) => sum + (p.adjustedQty || p.suggestedQty), 0);
  const confirmedCount = orderPlans.filter(p => p.isConfirmed).length;

  const timeSlotLabels = timeSlotStats.map(s => getTimeSlotLabel(s.timeSlot));

  const wasteReasonData = useMemo(() => {
    const reasons = ['expired', 'poorQuality', 'customerReturn', 'systemReturn', 'unknown'];
    const reasonLabels = ['过期', '品相不佳', '顾客退回', '系统退货', '原因空白'];
    const colors = ['#EF4444', '#F59E0B', '#F97316', '#6B7280', '#94A3B8'];

    const counts = reasons.map(reason =>
      waste.filter(w => w.date === today && w.reason === reason).reduce((sum, w) => sum + w.quantity, 0)
    );

    return { labels: reasonLabels, data: counts, colors };
  }, [waste, today]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">店长仪表盘</h1>
          <p className="text-gray-500 mt-1">
            {currentStore?.name} · 今日数据概览
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
          {tomorrowWeather && (
            <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg">
              <CloudRain className="w-5 h-5 text-blue-500" />
              <div>
                <div className="text-sm font-medium text-blue-700">
                  明日 {getWeatherTypeLabel(tomorrowWeather.type)} {tomorrowWeather.temperature}°C
                </div>
                <div className="text-xs text-blue-500">建议适度减少订货</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="今日报损率"
          value={formatPercent(todayStats.wasteRate)}
          change={-0.02}
          changeLabel="较昨日"
          icon={<TrendingDown className="w-6 h-6" />}
          color="red"
          trendIsGood={true}
        />
        <StatCard
          title="今日销售额"
          value={formatCurrency(todayStats.totalSales)}
          change={0.085}
          changeLabel="较昨日"
          icon={<DollarSign className="w-6 h-6" />}
          color="green"
          trendIsGood={true}
        />
        <StatCard
          title="缺货商品"
          value={todayStats.stockoutCount}
          unit="个"
          change={-1}
          changeLabel="较昨日"
          icon={<AlertTriangle className="w-6 h-6" />}
          color="yellow"
          trendIsGood={true}
        />
        <StatCard
          title="折扣贡献率"
          value={formatPercent(todayStats.discountContribution)}
          change={0.03}
          changeLabel="较上周"
          icon={<Tag className="w-6 h-6" />}
          color="primary"
          trendIsGood={true}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChartCard title="分时段销售与报损" subtitle="今日各时段销售、报损及折扣销量对比">
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
          <ChartCard title="报损原因分布" subtitle="今日报损数量按原因分类">
            <DoughnutChart
              labels={wasteReasonData.labels}
              data={wasteReasonData.data}
              colors={wasteReasonData.colors}
              centerText={todayStats.totalWaste.toString()}
              centerSubtext="件报损"
              height={260}
            />
          </ChartCard>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
      </div>

      <div className="bg-white rounded-xl shadow-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-gray-800">明日订货速览</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              系统已生成 {orderPlans.length} 个商品的订货建议
            </p>
          </div>
          <button
            onClick={() => navigate('/manager/order')}
            className="flex items-center gap-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm font-medium"
          >
            <ShoppingCart className="w-4 h-4" />
            查看全部
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {state.categories.slice(0, 3).map(cat => {
            const catProducts = state.products.filter(p => p.categoryId === cat.id);
            const catPlans = orderPlans.filter(p => catProducts.some(cp => cp.id === p.productId));
            const totalQty = catPlans.reduce((sum, p) => sum + (p.adjustedQty || p.suggestedQty), 0);
            const adjustedCount = catPlans.filter(p => p.adjustedQty !== null).length;

            return (
              <div
                key={cat.id}
                className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => navigate('/manager/order')}
              >
                <div className="text-sm text-gray-500 mb-1">{cat.name}</div>
                <div className="text-2xl font-bold text-gray-800">{totalQty} 件</div>
                <div className="text-xs text-gray-400 mt-1">
                  {catProducts.length} 个商品 · 已调整 {adjustedCount} 个
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-gray-500">计划订货总数：</span>
              <span className="font-semibold text-gray-800">{totalOrderQty} 件</span>
            </div>
            <div>
              <span className="text-gray-500">已确认：</span>
              <span className="font-semibold text-green-600">{confirmedCount} / {orderPlans.length}</span>
            </div>
          </div>
          {confirmedCount < orderPlans.length && (
            <div className="text-xs text-orange-500 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              请确认所有商品订货量
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
