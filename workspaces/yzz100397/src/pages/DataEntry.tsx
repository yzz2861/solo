import { useState, useMemo } from 'react';
import Card from '@/components/Card';
import StatBadge from '@/components/StatBadge';
import { useAppStore } from '@/store/useAppStore';
import type { DishRecord, DailyRecord, Unit, Weather } from '@/types';
import { UNIT_LABELS, WEATHER_LABELS, CATEGORY_LABELS } from '@/types';
import { formatDate, toKg, computeWasteRate } from '@/utils/analytics';
import {
  Calendar,
  Save,
  Plus,
  Search,
  Scale,
  AlertTriangle,
  Check,
  Cloud,
  CloudRain,
  CloudSnow,
  Sun,
  Users,
  Building2,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const WEATHER_OPTIONS: { value: Weather; icon: typeof Sun }[] = [
  { value: 'sunny', icon: Sun },
  { value: 'cloudy', icon: Cloud },
  { value: 'rainy', icon: CloudRain },
  { value: 'snowy', icon: CloudSnow },
];

export default function DataEntry() {
  const { dishes, dailyRecords, addOrUpdateDailyRecord, getRecordByDate } = useAppStore();

  const today = formatDate(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [searchQuery, setSearchQuery] = useState('');

  const existingRecord = getRecordByDate(selectedDate);

  const [occupancyRate, setOccupancyRate] = useState(existingRecord?.occupancyRate ?? 70);
  const [groupGuests, setGroupGuests] = useState(existingRecord?.groupGuests ?? 0);
  const [groupNote, setGroupNote] = useState(existingRecord?.groupNote ?? '');
  const [weather, setWeather] = useState<Weather>(existingRecord?.weather ?? 'sunny');
  const [specialNote, setSpecialNote] = useState(existingRecord?.specialNote ?? '');

  const [dishEntries, setDishEntries] = useState<Map<string, DishRecord>>(() => {
    const map = new Map<string, DishRecord>();
    existingRecord?.dishRecords.forEach(r => map.set(r.dishId, r));
    return map;
  });

  const [savedMsg, setSavedMsg] = useState('');

  const filteredDishes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return dishes;
    return dishes.filter(d =>
      d.name.toLowerCase().includes(q) ||
      d.aliases.some(a => a.toLowerCase().includes(q))
    );
  }, [dishes, searchQuery]);

  const groupedDishes = useMemo(() => {
    const groups: Record<string, typeof dishes> = { hot: [], cold: [], staple: [], beverage: [] };
    filteredDishes.forEach(d => groups[d.category].push(d));
    return groups;
  }, [filteredDishes]);

  function updateDishEntry(dishId: string, patch: Partial<DishRecord>) {
    setDishEntries(prev => {
      const next = new Map(prev);
      const existing = next.get(dishId);
      const dish = dishes.find(d => d.id === dishId);
      if (!dish) return next;

      const base: DishRecord = existing ?? {
        id: `rec-${selectedDate}-${dishId}`,
        date: selectedDate,
        dishId,
        preparedQty: 0,
        preparedUnit: dish.defaultUnit,
        leftoverQty: null,
        leftoverUnit: dish.defaultUnit,
        missingWeight: false,
      };

      next.set(dishId, { ...base, ...patch });
      return next;
    });
  }

  function handleSave() {
    const dishRecordsArr = Array.from(dishEntries.values()).filter(r => r.preparedQty > 0);
    const record: DailyRecord = {
      date: selectedDate,
      occupancyRate,
      groupGuests,
      groupNote: groupNote || undefined,
      weather,
      specialNote: specialNote || undefined,
      dishRecords: dishRecordsArr,
    };
    addOrUpdateDailyRecord(record);
    setSavedMsg(`✓ ${selectedDate} 数据已保存（${dishRecordsArr.length} 道菜）`);
    setTimeout(() => setSavedMsg(''), 3000);
  }

  const summary = useMemo(() => {
    let totalPrepKg = 0;
    let totalLeftoverKg = 0;
    let missingCount = 0;
    let withData = 0;

    dishEntries.forEach(rec => {
      const dish = dishes.find(d => d.id === rec.dishId);
      if (!dish || rec.preparedQty <= 0) return;
      withData++;
      totalPrepKg += toKg(rec.preparedQty, rec.preparedUnit, dish);

      if (rec.missingWeight) {
        missingCount++;
      } else if (rec.leftoverQty !== null && rec.leftoverUnit) {
        totalLeftoverKg += toKg(rec.leftoverQty, rec.leftoverUnit, dish);
      }
    });

    const rate = totalPrepKg > 0 ? (totalLeftoverKg / totalPrepKg) * 100 : 0;
    return { totalPrepKg, totalLeftoverKg, rate, missingCount, withData };
  }, [dishEntries, dishes]);

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card title="日期与运营数据" icon={<Calendar className="w-5 h-5" />} delay={0} className="lg:col-span-1">
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-surface-700 mb-1.5">选择日期</label>
              <input
                type="date"
                value={selectedDate}
                onChange={e => {
                  setSelectedDate(e.target.value);
                  const rec = getRecordByDate(e.target.value);
                  setOccupancyRate(rec?.occupancyRate ?? 70);
                  setGroupGuests(rec?.groupGuests ?? 0);
                  setGroupNote(rec?.groupNote ?? '');
                  setWeather(rec?.weather ?? 'sunny');
                  setSpecialNote(rec?.specialNote ?? '');
                  const map = new Map<string, DishRecord>();
                  rec?.dishRecords.forEach(r => map.set(r.dishId, r));
                  setDishEntries(map);
                }}
                className="w-full px-3 py-2.5 rounded-lg bg-surface-850 border border-surface-800 text-slate-200 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-surface-700 mb-1.5 flex items-center gap-1">
                <Building2 className="w-3 h-3" /> 入住率 (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={occupancyRate}
                onChange={e => setOccupancyRate(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-lg bg-surface-850 border border-surface-800 text-slate-200 text-sm font-mono focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-surface-700 mb-1.5 flex items-center gap-1">
                <Users className="w-3 h-3" /> 团队客人数
              </label>
              <input
                type="number"
                min={0}
                value={groupGuests}
                onChange={e => setGroupGuests(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-lg bg-surface-850 border border-surface-800 text-slate-200 text-sm font-mono focus:border-brand-500 focus:outline-none"
              />
              <input
                type="text"
                placeholder="团队客备注（如：XX旅行团）"
                value={groupNote}
                onChange={e => setGroupNote(e.target.value)}
                className="mt-2 w-full px-3 py-2 rounded-lg bg-surface-850 border border-surface-800 text-slate-300 text-xs focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-surface-700 mb-2">天气</label>
              <div className="grid grid-cols-4 gap-2">
                {WEATHER_OPTIONS.map(opt => {
                  const Icon = opt.icon;
                  const active = weather === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setWeather(opt.value)}
                      className={cn(
                        'flex flex-col items-center gap-1 py-2.5 rounded-lg border transition-all',
                        active
                          ? 'bg-brand-500/15 border-brand-500 text-brand-400'
                          : 'bg-surface-850 border-surface-800 text-surface-700 hover:border-surface-700 hover:text-slate-300'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[10px]">{WEATHER_LABELS[opt.value]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs text-surface-700 mb-1.5 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> 特殊事件备注
              </label>
              <textarea
                rows={3}
                placeholder="如：团队客临时取消、菜品改名（如白粥→大米粥）、称重器故障等"
                value={specialNote}
                onChange={e => setSpecialNote(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-surface-850 border border-surface-800 text-slate-300 text-xs resize-none focus:border-brand-500 focus:outline-none"
              />
            </div>

            <button
              onClick={handleSave}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-white font-medium text-sm shadow-card hover:shadow-glow hover:from-brand-600 hover:to-brand-700 transition-all"
            >
              <Save className="w-4 h-4" />
              保存当日数据
            </button>

            {savedMsg && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-success-500/15 border border-success-500/30 text-success-400 text-xs">
                <Check className="w-4 h-4" />
                {savedMsg}
              </div>
            )}
          </div>
        </Card>

        <Card
          title="菜品备餐与剩余录入"
          subtitle="支持公斤/份数/盘数混合单位录入"
          icon={<Scale className="w-5 h-5" />}
          delay={50}
          className="lg:col-span-3"
          action={
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-700" />
              <input
                type="text"
                placeholder="搜索菜品..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-2 rounded-lg bg-surface-850 border border-surface-800 text-slate-200 text-sm w-48 focus:border-brand-500 focus:outline-none"
              />
            </div>
          }
        >
          <div className="space-y-6">
            {Object.entries(groupedDishes).map(([cat, catDishes]) => catDishes.length > 0 && (
              <div key={cat}>
                <h4 className="text-xs font-semibold text-brand-400 mb-3 flex items-center gap-2">
                  <span className="w-1 h-4 bg-brand-500 rounded-full" />
                  {CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS]}
                  <span className="text-surface-700 font-normal">({catDishes.length})</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {catDishes.map(dish => {
                    const entry = dishEntries.get(dish.id);
                    const wAnalysis = entry && entry.leftoverQty !== null && !entry.missingWeight
                      ? computeWasteRate(entry, dish, [])
                      : null;

                    return (
                      <div
                        key={dish.id}
                        className={cn(
                          'p-4 rounded-xl border transition-all',
                          entry?.preparedQty ? 'bg-surface-850/50 border-surface-800' : 'bg-surface-900 border-surface-800/60'
                        )}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-medium text-white text-sm">{dish.name}</h5>
                          {wAnalysis && (
                            <StatBadge value={wAnalysis.wasteRate} type="waste" size="sm" estimated={wAnalysis.isEstimated} />
                          )}
                          {entry?.missingWeight && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-warning-500/15 text-warning-400 flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" /> 缺称重
                            </span>
                          )}
                        </div>

                        {dish.aliases.length > 0 && (
                          <p className="text-[10px] text-surface-700 mb-2">别名：{dish.aliases.join('、')}</p>
                        )}

                        <div className="space-y-2.5">
                          <div>
                            <label className="block text-[10px] text-surface-700 mb-1">备餐量</label>
                            <div className="flex gap-1.5">
                              <input
                                type="number"
                                min={0}
                                step="0.1"
                                value={entry?.preparedQty ?? ''}
                                placeholder="0"
                                onChange={e => updateDishEntry(dish.id, { preparedQty: Number(e.target.value) })}
                                className="flex-1 px-2.5 py-1.5 rounded-lg bg-surface-900 border border-surface-800 text-slate-200 text-sm font-mono focus:border-brand-500 focus:outline-none"
                              />
                              <select
                                value={entry?.preparedUnit ?? dish.defaultUnit}
                                onChange={e => updateDishEntry(dish.id, { preparedUnit: e.target.value as Unit })}
                                className="px-2 py-1.5 rounded-lg bg-surface-900 border border-surface-800 text-slate-300 text-xs focus:border-brand-500 focus:outline-none"
                              >
                                <option value="kg">{UNIT_LABELS.kg}</option>
                                <option value="portion">{UNIT_LABELS.portion}</option>
                                <option value="plate">{UNIT_LABELS.plate}</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] text-surface-700 mb-1">剩余量</label>
                            <div className="flex gap-1.5">
                              <input
                                type="number"
                                min={0}
                                step="0.1"
                                value={entry?.missingWeight ? '' : entry?.leftoverQty ?? ''}
                                placeholder={entry?.missingWeight ? '—' : '0'}
                                disabled={entry?.missingWeight}
                                onChange={e => updateDishEntry(dish.id, {
                                  leftoverQty: Number(e.target.value),
                                  leftoverUnit: entry?.leftoverUnit ?? dish.defaultUnit,
                                })}
                                className={cn(
                                  'flex-1 px-2.5 py-1.5 rounded-lg bg-surface-900 border border-surface-800 text-slate-200 text-sm font-mono focus:border-brand-500 focus:outline-none',
                                  entry?.missingWeight && 'opacity-40 cursor-not-allowed'
                                )}
                              />
                              <select
                                value={entry?.leftoverUnit ?? dish.defaultUnit}
                                disabled={entry?.missingWeight}
                                onChange={e => updateDishEntry(dish.id, { leftoverUnit: e.target.value as Unit })}
                                className={cn(
                                  'px-2 py-1.5 rounded-lg bg-surface-900 border border-surface-800 text-slate-300 text-xs focus:border-brand-500 focus:outline-none',
                                  entry?.missingWeight && 'opacity-40 cursor-not-allowed'
                                )}
                              >
                                <option value="kg">{UNIT_LABELS.kg}</option>
                                <option value="portion">{UNIT_LABELS.portion}</option>
                                <option value="plate">{UNIT_LABELS.plate}</option>
                              </select>
                            </div>
                          </div>

                          <label className="flex items-center gap-2 cursor-pointer pt-1">
                            <input
                              type="checkbox"
                              checked={entry?.missingWeight ?? false}
                              onChange={e => updateDishEntry(dish.id, {
                                missingWeight: e.target.checked,
                                leftoverQty: e.target.checked ? null : entry?.leftoverQty ?? 0,
                              })}
                              className="w-3.5 h-3.5 rounded accent-brand-500"
                            />
                            <span className="text-[11px] text-surface-700">当日缺称重</span>
                          </label>

                          {entry?.missingWeight && (
                            <input
                              type="text"
                              placeholder="缺称重原因（如：太忙、设备故障）"
                              value={entry?.missingReason ?? ''}
                              onChange={e => updateDishEntry(dish.id, { missingReason: e.target.value })}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-surface-900 border border-surface-800 text-slate-300 text-[11px] focus:border-brand-500 focus:outline-none"
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="当日录入汇总" icon={<Info className="w-5 h-5" />} delay={100}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-surface-850/50 border border-surface-800">
            <p className="text-xs text-surface-700 mb-1">已录入菜品</p>
            <p className="text-2xl font-mono font-bold text-white">{summary.withData}</p>
            <p className="text-[10px] text-surface-700">共 {dishes.length} 道菜</p>
          </div>
          <div className="p-4 rounded-xl bg-surface-850/50 border border-surface-800">
            <p className="text-xs text-surface-700 mb-1">备餐总量</p>
            <p className="text-2xl font-mono font-bold text-brand-400">{summary.totalPrepKg.toFixed(1)}<span className="text-sm text-surface-700 ml-1">kg</span></p>
          </div>
          <div className="p-4 rounded-xl bg-surface-850/50 border border-surface-800">
            <p className="text-xs text-surface-700 mb-1">剩余总量</p>
            <p className="text-2xl font-mono font-bold text-warning-400">{summary.totalLeftoverKg.toFixed(1)}<span className="text-sm text-surface-700 ml-1">kg</span></p>
          </div>
          <div className="p-4 rounded-xl bg-surface-850/50 border border-surface-800">
            <p className="text-xs text-surface-700 mb-1">预估浪费率</p>
            <div className="flex items-center gap-2">
              <StatBadge value={summary.rate} type="waste" />
              {summary.missingCount > 0 && (
                <span className="text-[10px] text-warning-400">{summary.missingCount}道缺称重</span>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
