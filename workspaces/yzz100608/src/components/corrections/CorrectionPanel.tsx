import React from 'react';
import { Card } from '../common/Card';
import { RangeSlider } from '../common/RangeSlider';
import { NumberInput } from '../common/NumberInput';
import { useAppStore } from '../../store/useAppStore';
import { TEMPERATURE_PRESETS } from '../../constants/defaults';
import { computeTemperatureDerating } from '../../lib/calculator';
import { formatNumber, formatPercent, formatTemperature } from '../../lib/formatters';

export const CorrectionPanel: React.FC = () => {
  const corrections = useAppStore((s) => s.corrections);
  const setCorrections = useAppStore((s) => s.setCorrections);
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  const derating = computeTemperatureDerating(
    corrections.ambientTemperature,
    corrections.temperatureCoefficient
  );
  const totalRetention = derating * corrections.agingFactor * (1 - corrections.designMargin / 100);

  return (
    <Card
      id="corrections"
      title="修正系数"
      icon="🌡️"
      accent="warning"
      animationDelay={0.12}
      titleExtra={
        <div className="flex items-center gap-1 text-[11px] text-text-muted font-mono">
          <span
            className={`px-2 py-0.5 rounded border ${
              totalRetention < 0.6
                ? 'bg-danger/15 text-danger border-danger/25'
                : totalRetention < 0.8
                ? 'bg-warning/15 text-warning border-warning/25'
                : 'bg-success/15 text-success border-success/25'
            }`}
          >
            容量保持 {formatPercent(totalRetention * 100, 0)}
          </span>
        </div>
      }
    >
      <div className="space-y-4">
        <RangeSlider
          label="电源转换效率"
          value={corrections.conversionEfficiency}
          onChange={(v) => setCorrections({ conversionEfficiency: v })}
          min={10}
          max={100}
          step={0.5}
          valueFormatter={(v) => `${v.toFixed(1)}%`}
          accentColor={corrections.conversionEfficiency > 100 ? 'var(--danger)' : 'var(--warning)'}
          showMarkers
          markerCount={5}
          hint="DC-DC 通常 85%~95%，LDO 较低（与压差相关）"
        />

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-medium text-text-secondary tracking-wide">
              环境温度
            </div>
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {TEMPERATURE_PRESETS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setCorrections({ ambientTemperature: p.value })}
                  className={`text-[10px] px-2 py-0.5 rounded-md border transition-all ${
                    corrections.ambientTemperature === p.value
                      ? 'bg-warning/20 text-warning border-warning/40 shadow-[0_0_8px_rgba(255,159,67,0.25)]'
                      : 'bg-black/20 text-text-muted border-custom hover:border-warning/40 hover:text-text-secondary'
                  }`}
                >
                  {p.value}℃
                </button>
              ))}
            </div>
          </div>
          <NumberInput
            label={null as any}
            suffix="℃"
            value={corrections.ambientTemperature}
            onChange={(v) => setCorrections({ ambientTemperature: v })}
            step={1}
            decimals={0}
          />
          <div className="flex items-center gap-3 text-[11px]">
            <TempBar temp={corrections.ambientTemperature} />
          </div>
          <div className="grid grid-cols-3 gap-2 text-[11px] text-text-muted">
            <div className="flex items-center justify-between px-2 py-1.5 rounded-md bg-black/20 border border-custom/60">
              <span>温度降容</span>
              <span className={`font-mono font-semibold ${derating < 0.7 ? 'text-danger' : derating < 0.85 ? 'text-warning' : 'text-success'}`}>
                {formatPercent(derating * 100, 1)}
              </span>
            </div>
            <div className="flex items-center justify-between px-2 py-1.5 rounded-md bg-black/20 border border-custom/60">
              <span>温度系数</span>
              <input
                type="number"
                step={0.1}
                value={corrections.temperatureCoefficient}
                onChange={(e) => setCorrections({ temperatureCoefficient: parseFloat(e.target.value) || 0 })}
                className="w-16 bg-transparent outline-none text-right font-mono font-semibold text-accent-primary"
              />
              <span className="text-text-muted ml-0.5">%/℃</span>
            </div>
            <div className="flex items-center justify-between px-2 py-1.5 rounded-md bg-black/20 border border-custom/60">
              <span>当前温度</span>
              <span className="font-mono font-semibold text-text-primary">
                {formatTemperature(corrections.ambientTemperature)}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-center gap-1.5 text-[11px] text-text-muted hover:text-text-secondary transition-colors py-1"
        >
          <span className="w-4 h-px bg-text-muted/40 flex-1 max-w-10" />
          <span>{showAdvanced ? '收起高级选项' : '展开高级选项'}</span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
          <span className="w-4 h-px bg-text-muted/40 flex-1 max-w-10" />
        </button>

        {showAdvanced && (
          <div className="space-y-3 pt-1 animate-fade-in">
            <RangeSlider
              label="老化系数 (新电芯)"
              value={corrections.agingFactor * 100}
              onChange={(v) => setCorrections({ agingFactor: v / 100 })}
              min={50}
              max={100}
              step={0.5}
              valueFormatter={(v) => `${v.toFixed(1)}%`}
              accentColor="var(--info)"
              hint="新出厂通常 95%~98%，循环后会降低"
            />
            <RangeSlider
              label="设计裕度 (预留容量)"
              value={corrections.designMargin}
              onChange={(v) => setCorrections({ designMargin: v })}
              min={0}
              max={40}
              step={1}
              valueFormatter={(v) => `${v.toFixed(0)}%`}
              accentColor="var(--accent-secondary)"
              hint="保留给意外情况的安全余量，通常 5%~20%"
            />
            <NumberInput
              label="自放电率 (每月)"
              suffix="%"
              value={corrections.selfDischarge}
              onChange={(v) => setCorrections({ selfDischarge: v })}
              min={0}
              step={0.1}
              decimals={1}
              hint="LiPo 约 2%~5%/月，长期存放需考虑"
            />
          </div>
        )}
      </div>
    </Card>
  );
};

const TempBar: React.FC<{ temp: number }> = ({ temp }) => {
  const clamped = Math.max(-40, Math.min(60, temp));
  const pct = ((clamped + 40) / 100) * 100;
  const color =
    temp < -20 ? 'var(--danger)' :
    temp < 0 ? 'var(--info)' :
    temp < 45 ? 'var(--success)' :
    'var(--warning)';

  return (
    <div className="flex-1 relative h-2 rounded-full bg-black/30 border border-custom overflow-hidden">
      <div
        className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
        style={{
          width: `${pct}%`,
          background: `linear-gradient(90deg, #60a5fa, ${color}, #f97316)`,
        }}
      />
      <div
        className="absolute -top-0.5 w-3 h-3 rounded-full border-2 border-[#0a1628] transition-all duration-500"
        style={{
          left: `calc(${pct}% - 6px)`,
          background: color,
          boxShadow: `0 0 8px ${color}`,
        }}
      />
    </div>
  );
};
