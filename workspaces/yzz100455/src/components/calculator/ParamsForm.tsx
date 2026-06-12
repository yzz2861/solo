import { useCalculatorStore } from '@/store';
import NumberInput from '@/components/common/NumberInput';
import Select from '@/components/common/Select';
import Slider from '@/components/common/Slider';
import {
  ORIENTATION_OPTIONS,
  USAGE_TYPE_OPTIONS,
} from '@/utils/constants';
import { Building2, Users, Monitor, Sun, Clock, Ruler, Grid3X3 } from 'lucide-react';

export default function ParamsForm() {
  const { params, setParams } = useCalculatorStore();

  const areaUnitOptions = [
    { value: 'sqm', label: '㎡' },
    { value: 'sqft', label: 'sqft' },
  ];

  const orientationOptions = ORIENTATION_OPTIONS.map((o) => ({
    value: o.value,
    label: `${o.label}向`,
  }));

  const usageTypeOptions = USAGE_TYPE_OPTIONS.map((o) => ({
    value: o.value,
    label: o.label,
  }));

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Grid3X3 size={20} className="text-ice-500" />
          房间基本信息
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <NumberInput
            label="房间面积"
            value={params.area}
            onChange={(v) => setParams({ area: v ?? 0 })}
            min={1}
            max={2000}
            step={1}
            placeholder="输入面积"
            unitOptions={areaUnitOptions}
            unitValue={params.areaUnit}
            onUnitChange={(u) => setParams({ areaUnit: u as 'sqm' | 'sqft' })}
          />
          <NumberInput
            label="层高"
            value={params.floorHeight}
            onChange={(v) => setParams({ floorHeight: v })}
            min={2}
            max={6}
            step={0.1}
            unit="米"
            placeholder="2.8"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="窗户朝向"
            value={params.orientation}
            options={orientationOptions}
            onChange={(v) => setParams({ orientation: v as typeof params.orientation })}
          />
          <div className="space-y-1">
            <label className="label-text">使用类型</label>
            <div className="grid grid-cols-3 gap-2">
              {usageTypeOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    setParams({ usageType: opt.value as typeof params.usageType })
                  }
                  className={`py-2 px-1 rounded-xl text-xs font-medium transition-all duration-200 ${
                    params.usageType === opt.value
                      ? 'bg-ice-500 text-white shadow-md'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Slider
          label="窗墙比"
          value={params.windowWallRatio}
          onChange={(v) => setParams({ windowWallRatio: v })}
          min={0}
          max={1}
          step={0.05}
          valueFormat={(v) => `${Math.round(v * 100)}%`}
        />
      </div>

      <div className="border-t border-slate-200 pt-6 space-y-4">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Users size={20} className="text-ice-500" />
          人员与设备
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <NumberInput
            label="人员数量"
            value={params.peopleCount}
            onChange={(v) => setParams({ peopleCount: v ?? 0 })}
            min={0}
            max={200}
            step={1}
            unit="人"
          />
          <NumberInput
            label="电脑数量"
            value={params.computerCount}
            onChange={(v) => setParams({ computerCount: v ?? 0 })}
            min={0}
            max={200}
            step={1}
            unit="台"
          />
        </div>
      </div>

      <div className="border-t border-slate-200 pt-6 space-y-4">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Clock size={20} className="text-ice-500" />
          使用时段
        </h3>

        <Slider
          label="每日使用时长"
          value={params.usageHours}
          onChange={(v) => setParams({ usageHours: v })}
          min={1}
          max={24}
          step={1}
          valueFormat={(v) => `${v} 小时`}
        />

        <div className="flex justify-between text-xs text-slate-500">
          <span>1小时</span>
          <span>24小时</span>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => useCalculatorStore.getState().resetParams()}
          className="btn-secondary flex-1 text-sm"
        >
          重置参数
        </button>
      </div>
    </div>
  );
}
