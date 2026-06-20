import { useState } from 'react';
import {
  Building2,
  Waves,
  Target,
  Gauge,
  WindArrowDown,
  Users,
  Clock8,
  RotateCcw,
  History,
} from 'lucide-react';
import ParamInput, { UnitSelect } from './ParamInput';
import { VOLUME_UNIT_LABELS, FLOW_UNIT_LABELS } from '@/types/water-tower';
import type { InputParams, VolumeUnit, FlowUnit } from '@/types/water-tower';
import { useWaterStore } from '@/store/useWaterStore';
import { cn } from '@/lib/utils';

const volumeOptions = Object.entries(VOLUME_UNIT_LABELS).map(([value, label]) => ({
  value,
  label,
}));
const flowOptions = Object.entries(FLOW_UNIT_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const ParameterPanel = () => {
  const { params, setParams, resetParams, history } = useWaterStore();
  const [showQuickFill, setShowQuickFill] = useState(false);

  const setP = <K extends keyof InputParams>(k: K, v: InputParams[K]) =>
    setParams({ [k]: v } as Partial<InputParams>);

  const useLastRecord = () => {
    if (history.length === 0) return;
    const last = history[0].paramsSnapshot;
    setParams(last);
    setShowQuickFill(false);
  };

  return (
    <div className="industrial-card p-6 md:p-7 animate-fade-up stagger-2">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-industrial-gradient flex items-center justify-center shadow-md">
            <Gauge className="w-5 h-5 text-white" strokeWidth={2.2} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-industrial-800">补水参数配置</h2>
            <p className="text-xs text-industrial-400 mt-0.5">
              支持 吨 / 立方米 / 升 / 升每分 混合单位输入
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowQuickFill((v) => !v)}
            className="btn-outline border-industrial-100 text-industrial-600 hover:bg-industrial-50 !h-10 !px-3 text-sm"
            disabled={history.length === 0}
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">导入上次</span>
          </button>
          <button
            onClick={resetParams}
            className="btn-outline border-industrial-100 text-industrial-600 hover:bg-industrial-50 !h-10 !px-3 text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">重置</span>
          </button>
        </div>
      </div>

      {showQuickFill && history.length > 0 && (
        <div className="mb-5 p-3 rounded-xl bg-aqua-50 border border-aqua-100 flex items-center justify-between animate-fade-up">
          <div className="flex items-center gap-3 text-sm">
            <History className="w-4 h-4 text-aqua-500" />
            <span className="text-industrial-600">
              最近一次记录：
              <span className="font-medium text-industrial-800 ml-1">
                {new Date(history[0].createdAt).toLocaleString('zh-CN', {
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </span>
          </div>
          <button onClick={useLastRecord} className="btn-primary !h-9 !px-4 text-sm">
            使用此参数
          </button>
        </div>
      )}

      <div className="space-y-5">
        {/* 水塔容量 */}
        <section className="space-y-3">
          <SectionLabel icon={<Building2 className="w-3.5 h-3.5" />} text="水塔规格" color="#16336B" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <ParamInput
                label="水塔总容量"
                icon={<Building2 className="w-3.5 h-3.5" />}
                hint="吨 / 立方米 / 升"
                accentColor="#16336B"
                type="number"
                min={0}
                step="any"
                value={params.tankCapacity}
                onChange={(e) => setP('tankCapacity', parseFloat(e.target.value) || 0)}
              />
            </div>
            <UnitSelect
              value={params.tankCapacityUnit}
              onChange={(e) => setP('tankCapacityUnit', e.target.value as VolumeUnit)}
              options={volumeOptions}
            />
          </div>
        </section>

        {/* 水位 */}
        <section className="space-y-3">
          <SectionLabel icon={<Waves className="w-3.5 h-3.5" />} text="水位配置" color="#00B8D9" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <WaterLevelInput
              label="当前水位"
              icon={<Waves className="w-3.5 h-3.5" />}
              accentColor="#5F86C3"
              typeKey="currentLevelType"
              levelKey="currentWaterLevel"
              unitKey="currentLevelUnit"
            />
            <WaterLevelInput
              label="目标水位"
              icon={<Target className="w-3.5 h-3.5" />}
              accentColor="#007A96"
              typeKey="targetLevelType"
              levelKey="targetWaterLevel"
              unitKey="targetLevelUnit"
            />
          </div>
        </section>

        {/* 水泵与管损 */}
        <section className="space-y-3">
          <SectionLabel icon={<Gauge className="w-3.5 h-3.5" />} text="水泵与管路" color="#1E4087" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <ParamInput
                label="水泵标称流量"
                icon={<Gauge className="w-3.5 h-3.5" />}
                hint="设备铭牌数值"
                accentColor="#1E4087"
                type="number"
                min={0}
                step="any"
                value={params.pumpFlowRate}
                onChange={(e) => setP('pumpFlowRate', parseFloat(e.target.value) || 0)}
              />
            </div>
            <UnitSelect
              value={params.pumpFlowUnit}
              onChange={(e) => setP('pumpFlowUnit', e.target.value as FlowUnit)}
              options={flowOptions}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PipeLossInput />
          </div>
        </section>

        {/* 用水与高峰 */}
        <section className="space-y-3">
          <SectionLabel icon={<Users className="w-3.5 h-3.5" />} text="用水与高峰" color="#FFAB00" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <ParamInput
                label="夜间同时用水估计"
                icon={<Users className="w-3.5 h-3.5" />}
                hint="住户同时段消耗"
                accentColor="#FF8B00"
                type="number"
                min={0}
                step="any"
                value={params.concurrentUsage}
                onChange={(e) => setP('concurrentUsage', parseFloat(e.target.value) || 0)}
              />
            </div>
            <UnitSelect
              value={params.concurrentUsageUnit}
              onChange={(e) => setP('concurrentUsageUnit', e.target.value as FlowUnit)}
              options={flowOptions}
            />
          </div>

          <div className="mt-3">
            <ParamInput
              label="早高峰开始时间"
              icon={<Clock8 className="w-3.5 h-3.5" />}
              hint="需在此前补满"
              accentColor="#FF5630"
              type="time"
              value={params.morningPeakTime}
              onChange={(e) => setP('morningPeakTime', e.target.value)}
            />
          </div>
        </section>
      </div>
    </div>
  );
};

const SectionLabel = ({
  icon,
  text,
  color,
}: {
  icon: React.ReactNode;
  text: string;
  color: string;
}) => (
  <div className="flex items-center gap-2 pt-1">
    <span
      className="w-6 h-6 rounded-md flex items-center justify-center text-white"
      style={{ backgroundColor: color }}
    >
      {icon}
    </span>
    <span className="text-xs font-bold tracking-wide text-industrial-500 uppercase">
      {text}
    </span>
    <div className="flex-1 h-px bg-gradient-to-r from-industrial-100 to-transparent" />
  </div>
);

interface WaterLevelInputProps {
  label: string;
  icon: React.ReactNode;
  accentColor: string;
  typeKey: 'currentLevelType' | 'targetLevelType';
  levelKey: 'currentWaterLevel' | 'targetWaterLevel';
  unitKey: 'currentLevelUnit' | 'targetLevelUnit';
}

const WaterLevelInput = ({
  label,
  icon,
  accentColor,
  typeKey,
  levelKey,
  unitKey,
}: WaterLevelInputProps) => {
  const { params, setParams } = useWaterStore();
  const isPercent = params[typeKey] === 'percent';
  const value = params[levelKey];
  const unit = params[unitKey];

  return (
    <div className="space-y-2">
      <ParamInput
        label={label}
        icon={icon}
        accentColor={accentColor}
        type="number"
        min={0}
        max={isPercent ? 100 : undefined}
        step="any"
        value={value}
        onChange={(e) =>
          setParams({ [levelKey]: parseFloat(e.target.value) || 0 } as Partial<InputParams>)
        }
      />
      <div className="flex items-center gap-2">
        <div className="flex p-1 rounded-lg bg-industrial-50 border border-industrial-100 flex-1">
          <button
            onClick={() => setParams({ [typeKey]: 'percent' } as Partial<InputParams>)}
            className={cn(
              'flex-1 h-9 rounded-md text-xs font-medium transition-all',
              isPercent
                ? 'bg-white text-industrial-700 shadow-sm border border-industrial-100'
                : 'text-industrial-400 hover:text-industrial-600',
            )}
          >
            按百分比 %
          </button>
          <button
            onClick={() => setParams({ [typeKey]: 'volume' } as Partial<InputParams>)}
            className={cn(
              'flex-1 h-9 rounded-md text-xs font-medium transition-all',
              !isPercent
                ? 'bg-white text-industrial-700 shadow-sm border border-industrial-100'
                : 'text-industrial-400 hover:text-industrial-600',
            )}
          >
            按体积
          </button>
        </div>
        {!isPercent && (
          <UnitSelect
            value={unit}
            onChange={(e) =>
              setParams({ [unitKey]: e.target.value as VolumeUnit } as Partial<InputParams>)
            }
            options={volumeOptions}
            className="!h-9 text-xs"
          />
        )}
      </div>
      {isPercent && (
        <div className="h-2 rounded-full bg-industrial-100 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, Math.max(0, value))}%`,
              background: `linear-gradient(90deg, ${accentColor}66, ${accentColor})`,
            }}
          />
        </div>
      )}
    </div>
  );
};

const PipeLossInput = () => {
  const { params, setParams } = useWaterStore();
  const isPercent = params.pipeLossType === 'percent';
  const displayVal = isPercent ? params.pipeLoss : params.pipeLoss * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <label className="flex items-center gap-2 text-sm font-medium text-industrial-700">
          <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-sm"
            style={{ background: 'linear-gradient(135deg, #5F86C3, #345FA8)' }}>
            <WindArrowDown className="w-3.5 h-3.5" />
          </span>
          管路损耗
        </label>
        <span className="font-mono-digits text-sm font-bold text-industrial-600">
          {displayVal.toFixed(1)}%
        </span>
      </div>
      <div className="px-1">
        <input
          type="range"
          min={0}
          max={50}
          step={0.5}
          value={displayVal}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            setParams({
              pipeLoss: isPercent ? v : v / 100,
            } as Partial<InputParams>);
          }}
          className="w-full h-2 rounded-full appearance-none cursor-pointer accent-industrial-500"
          style={{
            background: `linear-gradient(90deg, #36B37E 0%, #FFAB00 60%, #FF5630 100%)`,
          }}
        />
        <div className="flex justify-between text-[10px] text-industrial-400 mt-1.5">
          <span>0%</span>
          <span>优</span>
          <span>良 15%</span>
          <span>较差 30%</span>
          <span>50%</span>
        </div>
      </div>
    </div>
  );
};

export default ParameterPanel;
