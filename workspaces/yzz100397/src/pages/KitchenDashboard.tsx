import { useMemo, useState } from 'react';
import Card from '@/components/Card';
import WasteHeatmap from '@/components/WasteHeatmap';
import PrepSuggestionCard from '@/components/PrepSuggestionCard';
import DishTrendChart from '@/components/DishTrendChart';
import StatBadge from '@/components/StatBadge';
import { useAppStore } from '@/store/useAppStore';
import { computeAllWaste, generatePrepSuggestions, formatNumber, formatDate, getDaysAgo } from '@/utils/analytics';
import { Flame, TrendingDown, DollarSign, Calendar, Cloud, CloudRain, CloudSnow, Sun, ChevronDown } from 'lucide-react';
import { WEATHER_LABELS, Weather } from '@/types';
import { cn } from '@/lib/utils';

const WEATHER_ICONS: Record<Weather, typeof Sun> = {
  sunny: Sun,
  cloudy: Cloud,
  rainy: CloudRain,
  snowy: CloudSnow,
};

export default function KitchenDashboard() {
  const { dishes, dailyRecords } = useAppStore();
  const [selectedDishId, setSelectedDishId] = useState(dishes[0]?.id);
  const [tomorrowWeather, setTomorrowWeather] = useState<Weather>('sunny');
  const [tomorrowOccupancy, setTomorrowOccupancy] = useState(75);
  const [tomorrowGroup, setTomorrowGroup] = useState(0);
  const [showWeatherDropdown, setShowWeatherDropdown] = useState(false);

  const sortedRecords = useMemo(
    () => [...dailyRecords].sort((a, b) => a.date.localeCompare(b.date)),
    [dailyRecords]
  );

  const wasteData = useMemo(
    () => computeAllWaste(sortedRecords, dishes),
    [sortedRecords, dishes]
  );

  const last14Dates = useMemo(() => {
    const dates = new Set(sortedRecords.map(r => r.date));
    return Array.from(dates).sort().slice(-14);
  }, [sortedRecords]);

  const suggestions = useMemo(
    () => generatePrepSuggestions(sortedRecords, dishes, tomorrowWeather, tomorrowOccupancy, tomorrowGroup),
    [sortedRecords, dishes, tomorrowWeather, tomorrowOccupancy, tomorrowGroup]
  );

  const todayRecord = sortedRecords[sortedRecords.length - 1];
  const yesterdayRecord = sortedRecords[sortedRecords.length - 2];

  const avgWasteRate = wasteData.length > 0
    ? wasteData.reduce((s, w) => s + w.wasteRate, 0) / wasteData.length
    : 0;

  const totalWasteCost = wasteData.reduce((s, w) => s + w.wastedCost, 0);
  const last7Cost = wasteData
    .filter(w => w.date >= getDaysAgo(7))
    .reduce((s, w) => s + w.wastedCost, 0);

  const costSavingPotential = avgWasteRate > 15
    ? totalWasteCost * ((avgWasteRate - 15) / avgWasteRate)
    : 0;

  const selectedDish = dishes.find(d => d.id === selectedDishId) || dishes[0];

  return (
    <div className="space-y-6 p-6 max-w-[1600px] mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="!p-5" delay={0}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-surface-700 mb-1">平均浪费率</p>
              <p className="text-3xl font-mono font-bold text-white">
                <StatBadge value={avgWasteRate} type="waste" size="lg" showSuffix={false} />
                <span className="text-lg text-surface-700 ml-1">%</span>
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-brand-500/15 flex items-center justify-center">
              <Flame className="w-6 h-6 text-brand-400" />
            </div>
          </div>
        </Card>

        <Card className="!p-5" delay={50}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-surface-700 mb-1">累计浪费金额</p>
              <p className="text-3xl font-mono font-bold text-brand-400">¥{formatNumber(totalWasteCost, 0)}</p>
              <p className="text-[11px] text-surface-700 mt-1">近7天 ¥{formatNumber(last7Cost, 0)}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-danger-500/15 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-danger-400" />
            </div>
          </div>
        </Card>

        <Card className="!p-5" delay={100}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-surface-700 mb-1">可节约潜力</p>
              <p className="text-3xl font-mono font-bold text-success-400">¥{formatNumber(costSavingPotential, 0)}</p>
              <p className="text-[11px] text-surface-700 mt-1">目标浪费率 15% 以内</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-success-500/15 flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-success-400" />
            </div>
          </div>
        </Card>

        <Card className="!p-5" delay={150}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-surface-700 mb-1">今日入住率</p>
              <p className="text-3xl font-mono font-bold text-white">
                {todayRecord?.occupancyRate ?? 0}
                <span className="text-lg text-surface-700 ml-1">%</span>
              </p>
              <p className="text-[11px] text-surface-700 mt-1 flex items-center gap-1">
                {todayRecord && (
                  <>
                    {(() => {
                      const WIcon = WEATHER_ICONS[todayRecord.weather];
                      return <WIcon className="w-3 h-3 inline" />;
                    })()}
                    {WEATHER_LABELS[todayRecord.weather]}
                    {todayRecord.groupGuests > 0 && ` · ${todayRecord.groupGuests}人团队`}
                  </>
                )}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </Card>
      </div>

      <Card
        title="浪费率热力图"
        subtitle="日期 × 菜品，颜色越深浪费越严重"
        icon={<Flame className="w-5 h-5" />}
        delay={200}
        className="overflow-x-auto"
      >
        <WasteHeatmap wasteData={wasteData} dishes={dishes} dates={last14Dates} />
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card
          title="次日备餐建议"
          subtitle="根据历史数据 + 天气 + 入住率智能推荐"
          icon={<Calendar className="w-5 h-5" />}
          delay={250}
          className="xl:col-span-2"
          action={
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-surface-700">明日天气</span>
                <div className="relative">
                  <button
                    onClick={() => setShowWeatherDropdown(!showWeatherDropdown)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-850 border border-surface-800 text-slate-200 hover:border-brand-500 transition-colors"
                  >
                    {(() => {
                      const WIcon = WEATHER_ICONS[tomorrowWeather];
                      return <WIcon className="w-3.5 h-3.5 text-brand-400" />;
                    })()}
                    {WEATHER_LABELS[tomorrowWeather]}
                    <ChevronDown className="w-3 h-3 text-surface-700" />
                  </button>
                  {showWeatherDropdown && (
                    <div className="absolute right-0 top-full mt-1 bg-surface-950 border border-surface-700 rounded-lg shadow-xl z-20 overflow-hidden">
                      {(Object.keys(WEATHER_LABELS) as Weather[]).map(w => {
                        const WIcon = WEATHER_ICONS[w];
                        return (
                          <button
                            key={w}
                            onClick={() => { setTomorrowWeather(w); setShowWeatherDropdown(false); }}
                            className={cn(
                              'flex items-center gap-2 w-full px-3 py-2 text-left text-sm hover:bg-surface-850',
                              tomorrowWeather === w ? 'text-brand-400 bg-surface-850/50' : 'text-slate-300'
                            )}
                          >
                            <WIcon className="w-3.5 h-3.5" />
                            {WEATHER_LABELS[w]}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-surface-700">入住率</span>
                <input
                  type="number"
                  value={tomorrowOccupancy}
                  onChange={e => setTomorrowOccupancy(Math.max(0, Math.min(100, Number(e.target.value))))}
                  className="w-16 px-2 py-1.5 rounded-lg bg-surface-850 border border-surface-800 text-slate-200 text-right font-mono focus:border-brand-500 focus:outline-none"
                />
                <span className="text-surface-700">%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-surface-700">团队客</span>
                <input
                  type="number"
                  value={tomorrowGroup}
                  onChange={e => setTomorrowGroup(Math.max(0, Number(e.target.value)))}
                  className="w-16 px-2 py-1.5 rounded-lg bg-surface-850 border border-surface-800 text-slate-200 text-right font-mono focus:border-brand-500 focus:outline-none"
                />
                <span className="text-surface-700">人</span>
              </div>
            </div>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {suggestions.map((s, i) => (
              <PrepSuggestionCard key={s.dishId} suggestion={s} index={i} />
            ))}
          </div>
        </Card>

        <Card
          title="菜品趋势分析"
          subtitle="备餐量 vs 浪费量 vs 浪费率"
          icon={<TrendingDown className="w-5 h-5" />}
          delay={300}
          action={
            <select
              value={selectedDishId}
              onChange={e => setSelectedDishId(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-surface-850 border border-surface-800 text-slate-200 text-sm focus:border-brand-500 focus:outline-none"
            >
              {dishes.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          }
        >
          {selectedDish && (
            <DishTrendChart dish={selectedDish} wasteData={wasteData} dailyRecords={sortedRecords} />
          )}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-surface-700">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-brand-500 inline-block" />
              备餐量
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-danger-500 inline-block" />
              浪费量
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-warning-500 inline-block" style={{ borderTop: '2px dashed #fbbf24' }} />
              浪费率
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
              雨/雪天
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
              团队客日
            </div>
          </div>

          {yesterdayRecord?.specialNote && (
            <div className="mt-4 p-3 rounded-lg bg-warning-500/10 border border-warning-500/30">
              <p className="text-xs text-warning-400">
                <strong>昨日异常：</strong>{yesterdayRecord.specialNote}
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
