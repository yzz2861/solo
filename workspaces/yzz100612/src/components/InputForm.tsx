import { useEstimateStore } from '@/store/useEstimateStore'
import { ANCHOR_LABELS, ANCHOR_DESCRIPTIONS, type AnchorType, type DepthUnit, type WindUnit, type WaveUnit } from '@/types'
import { beaufortToKnots, knotsToBeaufort } from '@/utils/units'
import { Droplets, Ship, Anchor, Wind, Waves, Clock, MapPin, Moon } from 'lucide-react'

function UnitToggle<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="flex rounded-md bg-slate-800/80 p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`rounded px-2 py-0.5 text-xs font-medium transition-all ${
            value === opt.value
              ? 'bg-cyan-600/60 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function InputField({ label, icon: Icon, children }: { label: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-slate-400">
        <Icon className="h-3.5 w-3.5 text-cyan-500" />
        {label}
      </label>
      {children}
    </div>
  )
}

export default function InputForm() {
  const { input, setInput } = useEstimateStore()

  return (
    <div className="space-y-4">
      <InputField label="水深" icon={Droplets}>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            step={0.1}
            value={input.waterDepth || ''}
            onChange={(e) => setInput({ waterDepth: parseFloat(e.target.value) || 0 })}
            className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            placeholder="输入水深"
          />
          <UnitToggle
            value={input.depthUnit}
            onChange={(v) => setInput({ depthUnit: v as DepthUnit })}
            options={[
              { value: 'm' as DepthUnit, label: '米' },
              { value: 'ft' as DepthUnit, label: '英尺' },
            ]}
          />
        </div>
      </InputField>

      <InputField label="船长" icon={Ship}>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            step={0.5}
            value={input.boatLength || ''}
            onChange={(e) => setInput({ boatLength: parseFloat(e.target.value) || 0 })}
            className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            placeholder="输入船长"
          />
          <span className="shrink-0 text-xs text-slate-400">米</span>
        </div>
      </InputField>

      <InputField label="锚型" icon={Anchor}>
        <select
          value={input.anchorType}
          onChange={(e) => setInput({ anchorType: e.target.value as AnchorType })}
          className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
        >
          {(Object.keys(ANCHOR_LABELS) as AnchorType[]).map((type) => (
            <option key={type} value={type}>
              {ANCHOR_LABELS[type]} — {ANCHOR_DESCRIPTIONS[type]}
            </option>
          ))}
        </select>
      </InputField>

      <InputField label="风力" icon={Wind}>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={input.windUnit === 'beaufort' ? 12 : 100}
            step={1}
            value={input.windLevel || ''}
            onChange={(e) => {
              const val = parseFloat(e.target.value) || 0
              setInput({ windLevel: val })
            }}
            className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            placeholder="输入风力"
          />
          <UnitToggle
            value={input.windUnit}
            onChange={(v) => {
              const newUnit = v as WindUnit
              const currentVal = input.windLevel
              const newVal = newUnit === 'knots'
                ? beaufortToKnots(currentVal)
                : knotsToBeaufort(currentVal)
              setInput({ windUnit: newUnit, windLevel: newVal })
            }}
            options={[
              { value: 'beaufort' as WindUnit, label: '蒲福' },
              { value: 'knots' as WindUnit, label: '节' },
            ]}
          />
        </div>
        {input.windUnit === 'beaufort' && input.windLevel > 0 && (
          <p className="mt-1 text-xs text-slate-500">
            ≈ {beaufortToKnots(input.windLevel)} 节
          </p>
        )}
        {input.windUnit === 'knots' && input.windLevel > 0 && (
          <p className="mt-1 text-xs text-slate-500">
            ≈ 蒲福{knotsToBeaufort(input.windLevel)}级
          </p>
        )}
      </InputField>

      <InputField label="浪高" icon={Waves}>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            step={0.1}
            value={input.waveHeight || ''}
            onChange={(e) => setInput({ waveHeight: parseFloat(e.target.value) || 0 })}
            className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            placeholder="输入浪高"
          />
          <UnitToggle
            value={input.waveUnit}
            onChange={(v) => setInput({ waveUnit: v as WaveUnit })}
            options={[
              { value: 'm' as WaveUnit, label: '米' },
              { value: 'ft' as WaveUnit, label: '英尺' },
            ]}
          />
        </div>
      </InputField>

      <InputField label="停泊时间" icon={Clock}>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            step={0.5}
            value={input.mooringHours || ''}
            onChange={(e) => setInput({ mooringHours: parseFloat(e.target.value) || 0 })}
            className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            placeholder="输入停泊时长"
          />
          <span className="shrink-0 text-xs text-slate-400">小时</span>
        </div>
      </InputField>

      <InputField label="靠泊地点" icon={MapPin}>
        <input
          type="text"
          value={input.location}
          onChange={(e) => setInput({ location: e.target.value })}
          className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
          placeholder="如：三亚湾1号锚地"
        />
      </InputField>

      <InputField label="夜间停泊" icon={Moon}>
        <button
          onClick={() => setInput({ isNight: !input.isNight })}
          className={`relative flex h-10 w-full items-center rounded-lg border px-3 text-sm font-medium transition-all ${
            input.isNight
              ? 'border-indigo-500/50 bg-indigo-500/20 text-indigo-300'
              : 'border-slate-700 bg-slate-800/50 text-slate-400'
          }`}
        >
          <div className={`mr-2 h-4 w-4 rounded-sm border transition-all ${
            input.isNight
              ? 'border-indigo-400 bg-indigo-500'
              : 'border-slate-600 bg-slate-700'
          }`}>
            {input.isNight && (
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          {input.isNight ? '🌙 夜间停泊模式已开启' : '非夜间停泊'}
        </button>
      </InputField>
    </div>
  )
}
