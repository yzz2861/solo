import React from 'react';
import { Thermometer, Droplets, DoorOpen, Package } from 'lucide-react';
import UnitInput from './UnitInput';
import WarningBanner from './WarningBanner';
import { useCalcStore } from '@/store/calculationStore';
import { formatDurationString } from '@/utils/unitConverter';

export default function InputCard() {
  const { input, warnings, setInput } = useCalcStore();

  const openMinutes = Math.floor(input.avgOpenDuration / 60);
  const openSeconds = input.avgOpenDuration % 60;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5 space-y-4">
        <div className="flex items-center gap-2 text-sky-400">
          <Thermometer className="h-4 w-4" />
          <h3 className="text-sm font-semibold">基础参数</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <UnitInput
            label="库容"
            value={input.volume}
            onChange={(v) => setInput({ volume: v })}
            unit="m³"
            min={1}
            placeholder="200"
            icon={<Package className="h-3 w-3" />}
          />
          <UnitInput
            label="目标温度"
            value={input.targetTemp}
            onChange={(v) => setInput({ targetTemp: v })}
            unit="°C"
            min={-40}
            max={10}
            step={0.5}
            placeholder="-18"
            icon={<Thermometer className="h-3 w-3" />}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <UnitInput
            label="进货温度"
            value={input.goodsTemp}
            onChange={(v) => setInput({ goodsTemp: v })}
            unit="°C"
            min={-30}
            max={50}
            step={0.5}
            placeholder="5"
            icon={<Package className="h-3 w-3" />}
          />
          <UnitInput
            label="进货量"
            value={input.goodsWeight}
            onChange={(v) => setInput({ goodsWeight: v })}
            unit="kg/天"
            min={0}
            step={100}
            placeholder="2000"
            icon={<Package className="h-3 w-3" />}
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5 space-y-4">
        <div className="flex items-center gap-2 text-amber-400">
          <Droplets className="h-4 w-4" />
          <h3 className="text-sm font-semibold">外界环境</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <UnitInput
            label="外界温度"
            value={input.ambientTemp}
            onChange={(v) => setInput({ ambientTemp: v })}
            unit="°C"
            min={-20}
            max={50}
            step={0.5}
            placeholder="32"
            icon={<Thermometer className="h-3 w-3" />}
          />
          <UnitInput
            label="外界湿度"
            value={input.ambientHumidity}
            onChange={(v) => setInput({ ambientHumidity: v })}
            unit="%"
            min={0}
            max={100}
            placeholder="75"
            icon={<Droplets className="h-3 w-3" />}
          />
        </div>
        {input.ambientHumidity > 70 && (
          <div className="flex items-center gap-2 text-xs text-amber-400/70">
            <Droplets className="h-3 w-3" />
            <span>外界湿度偏高，潜热负荷将显著增加</span>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5 space-y-4">
        <div className="flex items-center gap-2 text-orange-400">
          <DoorOpen className="h-4 w-4" />
          <h3 className="text-sm font-semibold">门洞与开门</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <UnitInput
            label="门洞宽度"
            value={input.doorWidth}
            onChange={(v) => setInput({ doorWidth: v })}
            unit="m"
            min={0.5}
            max={6}
            step={0.1}
            placeholder="2.0"
          />
          <UnitInput
            label="门洞高度"
            value={input.doorHeight}
            onChange={(v) => setInput({ doorHeight: v })}
            unit="m"
            min={1}
            max={5}
            step={0.1}
            placeholder="2.5"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <UnitInput
            label="开门次数"
            value={input.openCount}
            onChange={(v) => setInput({ openCount: v })}
            unit="次/天"
            min={1}
            max={200}
            placeholder="20"
          />
          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
              平均开门时长
            </label>
            <div className="flex gap-1">
              <div className="flex items-center gap-0 flex-1">
                <input
                  type="number"
                  value={openMinutes || ''}
                  onChange={(e) => {
                    const m = Number(e.target.value) || 0;
                    setInput({ avgOpenDuration: m * 60 + openSeconds });
                  }}
                  min={0}
                  max={60}
                  placeholder="分"
                  className="w-full rounded-l-lg border border-slate-600 bg-slate-800/50 px-2 py-2 text-sm text-slate-100 font-mono placeholder:text-slate-600 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/50 transition-colors"
                />
                <span className="rounded-r-lg border border-l-0 border-slate-600 bg-slate-700/50 px-1.5 py-2 text-xs text-slate-500">
                  分
                </span>
              </div>
              <div className="flex items-center gap-0 flex-1">
                <input
                  type="number"
                  value={openSeconds || ''}
                  onChange={(e) => {
                    const s = Number(e.target.value) || 0;
                    setInput({ avgOpenDuration: openMinutes * 60 + s });
                  }}
                  min={0}
                  max={59}
                  placeholder="秒"
                  className="w-full rounded-l-lg border border-slate-600 bg-slate-800/50 px-2 py-2 text-sm text-slate-100 font-mono placeholder:text-slate-600 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/50 transition-colors"
                />
                <span className="rounded-r-lg border border-l-0 border-slate-600 bg-slate-700/50 px-1.5 py-2 text-xs text-slate-500">
                  秒
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="text-xs text-slate-500">
          门洞面积：{(input.doorWidth * input.doorHeight).toFixed(2)} m² ·
          日累计开门：{formatDurationString(input.openCount * input.avgOpenDuration)}
        </div>
      </div>

      <WarningBanner warnings={warnings} />
    </div>
  );
}
