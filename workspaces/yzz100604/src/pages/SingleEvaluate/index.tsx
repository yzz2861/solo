import { useState, useMemo, useEffect } from 'react';
import {
  Search,
  ChevronDown,
  Thermometer,
  ThermometerSun,
  Droplets,
  Wind,
  Sun,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Snowflake,
  Clock,
  AlertCircle,
  AlertTriangle,
  Info,
  ChevronRight,
  ListPlus,
  Truck,
  HelpCircle,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RiskInput, RiskResult, PrecipType, TempUnit, WindUnit } from '@/engine/types';
import { PRECIP_LABELS, RISK_LEVEL_LABELS } from '@/engine/thresholds';
import { calculateRisk } from '@/engine/riskCalculator';
import { useAppStore } from '@/store';
import { RiskBadge } from '@/components/RiskBadge';
import { UnitInput } from '@/components/UnitInput';
import { CalcTracePanel } from '@/components/CalcTracePanel';

const precipConfig: { key: PrecipType; Icon: typeof Sun }[] = [
  { key: 'none', Icon: Sun },
  { key: 'drizzle', Icon: CloudDrizzle },
  { key: 'rain', Icon: CloudRain },
  { key: 'sleet', Icon: CloudSnow },
  { key: 'snow', Icon: Snowflake },
  { key: 'freezing_rain', Icon: CloudLightning },
];

const warningStyles = {
  info: 'bg-sky-50 border-sky-200 text-sky-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  danger: 'bg-red-50 border-red-200 text-red-800',
};

const warningIconMap = {
  info: Info,
  warning: AlertTriangle,
  danger: AlertCircle,
};

const levelBarColors = {
  safe: 'from-emerald-400 to-emerald-500',
  caution: 'from-amber-400 to-amber-500',
  warning: 'from-orange-400 to-orange-500',
  danger: 'from-red-400 to-red-500',
};

export default function SingleEvaluate() {
  const bridges = useAppStore((s) => s.bridges);
  const addDispatch = useAppStore((s) => s.addDispatch);
  const addToReviewList = useAppStore((s) => s.addToReviewList);

  const [bridgeSearch, setBridgeSearch] = useState('');
  const [bridgeDropdownOpen, setBridgeDropdownOpen] = useState(false);
  const [selectedBridgeId, setSelectedBridgeId] = useState<string>('');
  const [selectedBridgeName, setSelectedBridgeName] = useState<string>('');

  const [airTemp, setAirTemp] = useState<number>(2);
  const [airTempUnit, setAirTempUnit] = useState<TempUnit>('C');
  const [roadTemp, setRoadTemp] = useState<number | null>(1);
  const [roadTempUnit, setRoadTempUnit] = useState<TempUnit>('C');
  const [roadTempMissing, setRoadTempMissing] = useState(false);
  const [humidity, setHumidity] = useState<number>(78);
  const [windSpeed, setWindSpeed] = useState<number>(4.5);
  const [windUnit, setWindUnit] = useState<WindUnit>('m/s');
  const [precipitation, setPrecipitation] = useState<PrecipType>('none');
  const [saltAmount, setSaltAmount] = useState<number>(50);
  const [lastSaltHours, setLastSaltHours] = useState<number | ''>('');

  const [result, setResult] = useState<RiskResult | null>(null);
  const [expandedWarnings, setExpandedWarnings] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ type: 'success' | 'info'; text: string } | null>(null);

  const filteredBridges = useMemo(() => {
    const q = bridgeSearch.trim().toLowerCase();
    if (!q) return bridges;
    return bridges.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        (b.code?.toLowerCase().includes(q) ?? false) ||
        (b.district?.toLowerCase().includes(q) ?? false),
    );
  }, [bridgeSearch, bridges]);

  const buildInput = (): RiskInput | null => {
    if (!selectedBridgeId) return null;
    return {
      bridgeId: selectedBridgeId,
      bridgeName: selectedBridgeName,
      airTemp,
      airTempUnit,
      roadTemp: roadTempMissing ? null : roadTemp,
      roadTempUnit,
      roadTempMissing,
      humidity,
      windSpeed,
      windUnit,
      precipitation,
      saltAmount,
      lastSaltHours: lastSaltHours === '' ? undefined : Number(lastSaltHours),
    };
  };

  const handleEvaluate = () => {
    const input = buildInput();
    if (!input) {
      setToast({ type: 'info', text: '请先选择评估路段' });
      setTimeout(() => setToast(null), 2500);
      return;
    }
    setResult(calculateRisk(input));
  };

  useEffect(() => {
    const t = setTimeout(() => {
      const input = buildInput();
      if (input) {
        setResult(calculateRisk(input));
      }
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    airTemp,
    airTempUnit,
    roadTemp,
    roadTempUnit,
    roadTempMissing,
    humidity,
    windSpeed,
    windUnit,
    precipitation,
    saltAmount,
    lastSaltHours,
  ]);

  const handleBridgeSelect = (id: string, name: string) => {
    setSelectedBridgeId(id);
    setSelectedBridgeName(name);
    setBridgeSearch(name);
    setBridgeDropdownOpen(false);
  };

  const handleAddReview = () => {
    if (!selectedBridgeId || !selectedBridgeName) return;
    addToReviewList(selectedBridgeId, selectedBridgeName, result ? `风险分${result.score}·${RISK_LEVEL_LABELS[result.level]}` : undefined);
    setToast({ type: 'success', text: '已加入复查清单' });
    setTimeout(() => setToast(null), 2200);
  };

  const handleDispatch = () => {
    if (!selectedBridgeId || !selectedBridgeName || !result) return;
    addDispatch({
      bridgeId: selectedBridgeId,
      bridgeName: selectedBridgeName,
      riskLevel: result.level,
      riskScore: result.score,
      priority: 0,
      status: 'pending',
      note: `复查建议${result.reviewMinutes}分钟内`,
    });
    setToast({ type: 'success', text: '调度单已创建，待派车' });
    setTimeout(() => setToast(null), 2200);
  };

  const formatReviewTime = (minutes: number) => {
    if (minutes < 1) return '立即处置';
    if (minutes < 60) return `${minutes} 分钟`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m === 0 ? `${h} 小时` : `${h}小时${m}分`;
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleString('zh-CN', { hour12: false });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/40 to-cyan-50/30">
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <header className="mb-8">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
                  <Snowflake className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
                    桥面结冰风险评估
                  </h1>
                  <p className="text-sm text-slate-500 mt-0.5">
                    值班队长视图 · 单点位实时风险诊断
                  </p>
                </div>
              </div>
              <h2 className="text-lg font-semibold text-slate-700 mt-3">
                晚上好，值班长。今日桥面低温预警监控已启动 👋
              </h2>
              <p className="text-sm text-slate-500 mt-1 max-w-xl leading-relaxed">
                请在左侧录入路段与气象参数，系统将实时输出风险等级、复查建议及关键影响因子。
                缺数参数会自动启用估算模型并标记警告。
              </p>
            </div>

            <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-sky-100 bg-white/70 backdrop-blur shadow-sm max-w-sm">
              <div className="w-9 h-9 rounded-lg bg-sky-50 flex items-center justify-center shrink-0">
                <HelpCircle className="w-4.5 h-4.5 text-sky-600" />
              </div>
              <div className="text-xs text-slate-600 leading-relaxed">
                <p className="font-semibold text-sky-700 mb-0.5">快捷帮助</p>
                <p>风险等级 ≥ 中度 建议 <span className="font-semibold text-orange-600">30分钟内</span> 派车巡查</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <section className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.06)] overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/60 to-white flex items-center justify-between">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <span className="w-1 h-4 rounded-full bg-sky-500" />
                  参数输入表单
                </h3>
                <span className="text-xs text-slate-400">
                  录入后自动计算 · 点击「立即评估」确认
                </span>
              </div>

              <div className="p-6 space-y-6">
                <div className="relative">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    路段/桥面选择 <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="flex items-stretch rounded-lg border border-slate-200 bg-white focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-100 hover:border-slate-300 transition-all shadow-sm">
                      <div className="flex items-center px-3 text-slate-400 border-r border-slate-200 bg-slate-50 rounded-l-lg">
                        <Search className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={bridgeSearch}
                        onChange={(e) => {
                          setBridgeSearch(e.target.value);
                          setBridgeDropdownOpen(true);
                        }}
                        onFocus={() => setBridgeDropdownOpen(true)}
                        onBlur={() => setTimeout(() => setBridgeDropdownOpen(false), 200)}
                        placeholder="搜索桥名、编号或区域，或手动输入"
                        className="flex-1 px-3 py-2.5 text-sm text-slate-800 bg-transparent outline-none min-w-0"
                      />
                      <div className="flex items-center px-3 text-slate-400 border-l border-slate-200">
                        <ChevronDown className={cn('w-4 h-4 transition-transform', bridgeDropdownOpen && 'rotate-180')} />
                      </div>
                    </div>
                    {bridgeDropdownOpen && filteredBridges.length > 0 && (
                      <div className="absolute z-30 top-full left-0 right-0 mt-1.5 rounded-xl border border-slate-200 bg-white shadow-xl max-h-72 overflow-y-auto">
                        {filteredBridges.map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            onMouseDown={() => handleBridgeSelect(b.id, b.name)}
                            className={cn(
                              'w-full px-4 py-2.5 text-left text-sm flex items-center justify-between hover:bg-sky-50 transition-colors border-b border-slate-50 last:border-b-0',
                              selectedBridgeId === b.id && 'bg-sky-50/70',
                            )}
                          >
                            <div>
                              <div className="font-medium text-slate-800">{b.name}</div>
                              <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                                {b.code && <span className="font-mono">{b.code}</span>}
                                {b.district && <span>· {b.district}</span>}
                              </div>
                            </div>
                            {selectedBridgeId === b.id && (
                              <CheckCircle2 className="w-4 h-4 text-sky-500" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedBridgeName && (
                    <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      已选：<span className="font-medium text-slate-700">{selectedBridgeName}</span>
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-5">
                  <UnitInput
                    label="气温"
                    kind="temp"
                    value={airTemp}
                    onChange={setAirTemp}
                    unit={airTempUnit}
                    onUnitChange={(u) => setAirTempUnit(u as TempUnit)}
                    icon={<Thermometer className="w-4 h-4" />}
                    min={-50}
                    max={60}
                  />

                  <div className="space-y-2">
                    <UnitInput
                      label={roadTempMissing ? '路表温度（已标记缺失）' : '路表温度'}
                      kind="temp"
                      value={roadTemp}
                      onChange={(v) => setRoadTemp(v)}
                      unit={roadTempUnit}
                      onUnitChange={(u) => setRoadTempUnit(u as TempUnit)}
                      icon={<ThermometerSun className="w-4 h-4" />}
                      min={-50}
                      max={80}
                      disabled={roadTempMissing}
                      nullable
                      onNullChange={(isNull) => {
                        if (isNull) {
                          setRoadTemp(null);
                        }
                      }}
                    />
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none group">
                      <input
                        type="checkbox"
                        checked={roadTempMissing}
                        onChange={(e) => setRoadTempMissing(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-400"
                      />
                      <span className="text-xs text-slate-600 group-hover:text-slate-800 transition-colors">
                        巡查车数据缺失（启用估算算法）
                      </span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      相对湿度
                    </label>
                    <div className="rounded-lg border border-slate-200 bg-white shadow-sm hover:border-slate-300 focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-100 transition-all overflow-hidden">
                      <div className="flex items-stretch">
                        <div className="flex items-center px-3 text-slate-400 border-r border-slate-200 bg-slate-50">
                          <Droplets className="w-4 h-4" />
                        </div>
                        <div className="flex-1 px-3 py-2 flex items-center gap-3">
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={1}
                            value={humidity}
                            onChange={(e) => setHumidity(Number(e.target.value))}
                            className="flex-1 accent-sky-500 h-1.5"
                          />
                          <div className="flex items-baseline gap-0.5 min-w-[4.5rem] justify-end">
                            <span className="text-lg font-bold tabular-nums text-slate-800">{humidity}</span>
                            <span className="text-xs font-semibold text-slate-500">%</span>
                          </div>
                        </div>
                      </div>
                      <div className="h-1 bg-gradient-to-r from-sky-100 via-sky-300 to-sky-500" style={{ width: `${humidity}%` }} />
                    </div>
                  </div>

                  <UnitInput
                    label="风速"
                    kind="wind"
                    value={windSpeed}
                    onChange={setWindSpeed}
                    unit={windUnit}
                    onUnitChange={(u) => setWindUnit(u as WindUnit)}
                    icon={<Wind className="w-4 h-4" />}
                    min={0}
                    max={120}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    降水类型
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {precipConfig.map(({ key, Icon }) => {
                      const active = precipitation === key;
                      const { label } = PRECIP_LABELS[key];
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setPrecipitation(key)}
                          className={cn(
                            'group flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl border transition-all duration-200',
                            active
                              ? 'border-sky-500 bg-sky-500 text-white shadow-md shadow-sky-500/20 scale-[1.02]'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 shadow-sm',
                          )}
                        >
                          <Icon className={cn('w-5 h-5', active ? 'text-white' : 'text-slate-500 group-hover:text-sky-600')} />
                          <span className="text-xs font-semibold">{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-slate-700">撒盐量</label>
                    <span className="text-xs text-slate-400 font-mono">范围 0 - 200 g/㎡</span>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-4">
                      <Snowflake className="w-5 h-5 text-sky-500 shrink-0" />
                      <div className="flex-1">
                        <input
                          type="range"
                          min={0}
                          max={200}
                          step={1}
                          value={saltAmount}
                          onChange={(e) => setSaltAmount(Number(e.target.value))}
                          className="w-full accent-sky-500 h-1.5"
                        />
                        <div className="flex justify-between mt-1.5 text-[10px] text-slate-400 font-mono">
                          <span>0</span><span>50</span><span>100</span><span>150</span><span>200</span>
                        </div>
                      </div>
                      <div className="flex items-stretch rounded-lg border border-slate-200 focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-100 overflow-hidden">
                        <input
                          type="number"
                          min={0}
                          max={200}
                          value={saltAmount}
                          onChange={(e) => setSaltAmount(Math.min(200, Math.max(0, Number(e.target.value) || 0)))}
                          className="w-20 px-2.5 py-1.5 text-sm font-semibold text-slate-800 text-center tabular-nums outline-none bg-white"
                        />
                        <span className="flex items-center px-2 text-xs font-semibold text-slate-500 bg-slate-50 border-l border-slate-200">g/㎡</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      距离上次撒盐 <span className="text-xs text-slate-400 font-normal">(可选)</span>
                    </label>
                    <div className="flex items-stretch rounded-lg border border-slate-200 bg-white focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-100 hover:border-slate-300 transition-all shadow-sm">
                      <div className="flex items-center px-3 text-slate-400 border-r border-slate-200 bg-slate-50 rounded-l-lg">
                        <Clock className="w-4 h-4" />
                      </div>
                      <input
                        type="number"
                        min={0}
                        max={72}
                        value={lastSaltHours}
                        onChange={(e) => setLastSaltHours(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                        placeholder="未撒盐可留空"
                        className="flex-1 px-3 py-2 text-sm font-medium text-slate-800 bg-transparent outline-none min-w-0"
                      />
                      <span className="flex items-center px-3 text-xs font-semibold text-slate-500 bg-slate-50 border-l border-slate-200 rounded-r-lg">
                        小时
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleEvaluate}
                    className="group relative inline-flex items-center gap-2.5 px-7 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 text-white font-semibold shadow-lg shadow-sky-500/25 hover:shadow-xl hover:shadow-sky-500/30 hover:from-sky-600 hover:to-cyan-600 active:scale-[0.98] transition-all duration-200"
                  >
                    <span className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity animate-pulse" />
                    <Snowflake className="w-5 h-5 relative animate-spin-slow" />
                    <span className="relative">立即评估</span>
                  </button>
                  <p className="text-xs text-slate-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    输入变化时已自动实时计算
                  </p>
                </div>
              </div>
            </div>
          </section>

          <aside className="lg:sticky lg:top-6 space-y-5">
            {result ? (
              <>
                <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-12px_rgba(15,23,42,0.08)] overflow-hidden">
                  <div className={cn(
                    'px-6 py-5 relative overflow-hidden',
                    result.level === 'danger' && 'bg-gradient-to-br from-red-50 via-red-50/80 to-orange-50',
                    result.level === 'warning' && 'bg-gradient-to-br from-orange-50 via-orange-50/80 to-amber-50',
                    result.level === 'caution' && 'bg-gradient-to-br from-amber-50 via-amber-50/80 to-yellow-50',
                    result.level === 'safe' && 'bg-gradient-to-br from-emerald-50 via-emerald-50/80 to-teal-50',
                  )}>
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
                      backgroundImage: `radial-gradient(circle at 20% 30%, currentColor 1px, transparent 1px), radial-gradient(circle at 70% 60%, currentColor 1px, transparent 1px)`,
                      backgroundSize: '24px 24px, 36px 36px',
                    }} />
                    <div className="relative flex items-center gap-4">
                      <RiskBadge level={result.level} size="xl" pulse={result.urgent} showLabel={false} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn(
                            'text-xl font-black tracking-wide',
                            result.level === 'danger' && 'text-red-700',
                            result.level === 'warning' && 'text-orange-700',
                            result.level === 'caution' && 'text-amber-700',
                            result.level === 'safe' && 'text-emerald-700',
                          )}>
                            {RISK_LEVEL_LABELS[result.level]}
                          </span>
                          {result.urgent && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[11px] font-bold border border-red-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                              紧急
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 flex items-baseline gap-2">
                          <span className="text-5xl font-black tabular-nums text-slate-800 tracking-tight">
                            {result.score.toFixed(0)}
                          </span>
                          <span className="text-sm font-semibold text-slate-400">/ 100 分</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 relative">
                      <div className="h-2 rounded-full bg-white/70 overflow-hidden shadow-inner">
                        <div
                          className={cn('h-full rounded-full bg-gradient-to-r shadow-inner transition-all duration-700', levelBarColors[result.level])}
                          style={{ width: `${result.score}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="px-6 py-5 border-t border-slate-100 bg-white">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-11 h-11 rounded-xl flex items-center justify-center shrink-0',
                        result.reviewMinutes <= 10 ? 'bg-red-100 text-red-600' : result.reviewMinutes <= 45 ? 'bg-orange-100 text-orange-600' : 'bg-sky-100 text-sky-600',
                      )}>
                        <Clock className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-slate-500">建议复查时间</div>
                        <div className={cn(
                          'font-black tabular-nums tracking-tight leading-tight',
                          result.reviewMinutes <= 10 ? 'text-red-600 text-2xl' : result.reviewMinutes <= 45 ? 'text-orange-600 text-2xl' : 'text-slate-700 text-xl',
                        )}>
                          {formatReviewTime(result.reviewMinutes)}
                        </div>
                      </div>
                      <div className="text-right text-[10px] text-slate-400 leading-relaxed">
                        计算于
                        <div className="font-mono text-slate-500">{formatDate(result.timestamp)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="px-6 py-5 border-t border-slate-100">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                      关键影响因子
                    </h4>
                    <div className="space-y-3">
                      {result.keyFactors.map((f, idx) => (
                        <div key={idx}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className={cn(
                              'flex items-center gap-1.5 font-medium',
                              f.highlight ? 'text-slate-800' : 'text-slate-600',
                            )}>
                              {f.highlight && (
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse shrink-0" />
                              )}
                              {f.name}
                              {f.value && <span className="text-xs text-slate-400 font-mono">({f.value})</span>}
                            </span>
                            <span className={cn(
                              'text-xs font-bold tabular-nums',
                              f.contribution >= 0 ? 'text-red-600' : 'text-emerald-600',
                            )}>
                              {f.contribution >= 0 ? '+' : ''}{f.contribution}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all duration-500',
                                f.contribution >= 0
                                  ? f.highlight ? 'bg-gradient-to-r from-orange-400 to-red-400' : 'bg-gradient-to-r from-sky-300 to-sky-500'
                                  : 'bg-gradient-to-r from-emerald-300 to-emerald-500',
                              )}
                              style={{ width: `${Math.min(100, Math.abs(f.contribution) * 4)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {result.warnings.length > 0 && (
                    <div className="px-6 py-5 border-t border-slate-100">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                        警告提示 <span className="text-slate-400 font-normal">({result.warnings.length})</span>
                      </h4>
                      <div className="space-y-2">
                        {result.warnings.map((w) => {
                          const Icon = warningIconMap[w.type];
                          const open = expandedWarnings[w.code];
                          return (
                            <div
                              key={w.code}
                              className={cn(
                                'rounded-xl border transition-colors overflow-hidden',
                                warningStyles[w.type],
                              )}
                            >
                              <button
                                type="button"
                                onClick={() => setExpandedWarnings((m) => ({ ...m, [w.code]: !m[w.code] }))}
                                className="w-full px-3.5 py-2.5 flex items-start gap-2.5 text-left"
                              >
                                <Icon className="w-4 h-4 shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0 text-sm font-medium leading-snug">
                                  {w.message}
                                </div>
                                <ChevronRight className={cn('w-4 h-4 shrink-0 mt-0.5 opacity-70 transition-transform', open && 'rotate-90')} />
                              </button>
                              {open && w.suggestion && (
                                <div className="px-3.5 pb-3 pl-10 text-xs leading-relaxed opacity-90 border-t border-black/5 pt-2 -mt-0.5">
                                  <span className="font-semibold">建议：</span>
                                  {w.suggestion}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleAddReview}
                      disabled={!selectedBridgeId}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                      <ListPlus className="w-4 h-4" />
                      加入复查清单
                    </button>
                    <button
                      type="button"
                      onClick={handleDispatch}
                      disabled={!selectedBridgeId || !result}
                      className={cn(
                        'flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm',
                        result?.urgent
                          ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white hover:from-red-600 hover:to-orange-600 shadow-red-500/25'
                          : 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white hover:from-sky-600 hover:to-cyan-600 shadow-sky-500/25',
                      )}
                    >
                      <Truck className="w-4 h-4" />
                      立即派车
                    </button>
                  </div>
                </div>

                <CalcTracePanel trace={result.calcTrace} />
              </>
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white/50 p-10 text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <Snowflake className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-base font-semibold text-slate-700 mb-1">暂无评估结果</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  请先选择路段并录入参数，<br />系统将自动计算风险等级
                </p>
              </div>
            )}
          </aside>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-bounce-in">
          <div className={cn(
            'inline-flex items-center gap-2.5 px-5 py-3 rounded-xl shadow-2xl border backdrop-blur-sm',
            toast.type === 'success'
              ? 'bg-emerald-50/95 border-emerald-200 text-emerald-800'
              : 'bg-sky-50/95 border-sky-200 text-sky-800',
          )}>
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <Info className="w-5 h-5 text-sky-600" />
            )}
            <span className="text-sm font-semibold">{toast.text}</span>
          </div>
        </div>
      )}
    </div>
  );
}
