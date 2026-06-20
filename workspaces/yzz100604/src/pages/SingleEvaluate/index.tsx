import { useState } from 'react';
import { useStore } from '@/store';
import { Thermometer, Droplets, Wind, CloudRain, Calculator, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EvalForm {
  bridgeId: string;
  roadTemp: string;
  airTemp: string;
  humidity: string;
  windSpeed: string;
  precipitation: string;
}

const RISK_LEVELS = [
  { min: 0, max: 24, level: '安全', color: 'ice-safe', label: '绿', text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { min: 25, max: 49, level: '关注', color: 'ice-caution', label: '黄', text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  { min: 50, max: 74, level: '预警', color: 'ice-warning', label: '橙', text: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  { min: 75, max: 100, level: '紧急', color: 'ice-danger', label: '红', text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
];

export default function SingleEvaluate() {
  const bridges = useStore((s) => s.bridges);
  const [form, setForm] = useState<EvalForm>({
    bridgeId: bridges[0]?.id || '',
    roadTemp: '',
    airTemp: '2',
    humidity: '85',
    windSpeed: '5',
    precipitation: '0',
  });
  const [result, setResult] = useState<number | null>(null);

  const calculateScore = () => {
    const rt = parseFloat(form.roadTemp) || 0.5 * parseFloat(form.airTemp) - 1;
    const at = parseFloat(form.airTemp) || 0;
    const hu = parseFloat(form.humidity) || 0;
    const ws = parseFloat(form.windSpeed) || 0;
    const pr = parseFloat(form.precipitation) || 0;

    let tempScore = 0;
    if (rt <= -5) tempScore = 30;
    else if (rt <= 0) tempScore = 25;
    else if (rt <= 2) tempScore = 18;
    else if (rt <= 5) tempScore = 10;
    else tempScore = 2;

    const humidityScore = hu >= 90 ? 20 : hu >= 80 ? 15 : hu >= 70 ? 10 : hu >= 60 ? 5 : 0;
    const windScore = ws >= 10 ? 15 : ws >= 6 ? 10 : ws >= 3 ? 5 : 0;
    const precipScore = pr > 2 ? 25 : pr > 0 ? 15 : pr === 0 ? 0 : 5;

    const total = Math.min(100, tempScore + humidityScore + windScore + precipScore);
    setResult(total);
  };

  const riskLevel = result !== null ? RISK_LEVELS.find((r) => result >= r.min && result <= r.max)! : null;
  const selectedBridge = bridges.find((b) => b.id === form.bridgeId);

  const update = (key: keyof EvalForm, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="ice-card rounded-2xl p-6 border border-slate-200 bg-white">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-ice-accent" />
              单桥结冰风险评估
            </h3>
            <p className="text-sm text-slate-500 mt-1">输入桥梁环境参数，实时计算结冰风险等级</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">选择桥梁</label>
              <select
                value={form.bridgeId}
                onChange={(e) => update('bridgeId', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-ice-accent focus:ring-2 focus:ring-ice-accent/20 outline-none transition-all text-slate-800"
              >
                {bridges.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}（{b.location}）</option>
                ))}
              </select>
              {selectedBridge && (
                <p className="mt-2 text-xs text-slate-500">桥面面积约 {selectedBridge.area.toLocaleString()} ㎡</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1.5">
                  <Thermometer className="w-4 h-4 text-red-500" /> 路表温度（℃）
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={form.roadTemp}
                  onChange={(e) => update('roadTemp', e.target.value)}
                  placeholder="缺省时将根据气温估算"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-ice-accent focus:ring-2 focus:ring-ice-accent/20 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1.5">
                  <Thermometer className="w-4 h-4 text-orange-500" /> 现场气温（℃）
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={form.airTemp}
                  onChange={(e) => update('airTemp', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-ice-accent focus:ring-2 focus:ring-ice-accent/20 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1.5">
                  <Droplets className="w-4 h-4 text-blue-500" /> 相对湿度（%）
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.humidity}
                  onChange={(e) => update('humidity', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-ice-accent focus:ring-2 focus:ring-ice-accent/20 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1.5">
                  <Wind className="w-4 h-4 text-cyan-500" /> 风速（m/s）
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={form.windSpeed}
                  onChange={(e) => update('windSpeed', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-ice-accent focus:ring-2 focus:ring-ice-accent/20 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1.5">
                <CloudRain className="w-4 h-4 text-indigo-500" /> 降水强度（mm/h）
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={form.precipitation}
                onChange={(e) => update('precipitation', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-ice-accent focus:ring-2 focus:ring-ice-accent/20 outline-none transition-all"
              />
            </div>

            <button
              onClick={calculateScore}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-ice-primary to-ice-accent text-white font-semibold shadow-lg shadow-sky-500/25 hover:shadow-xl hover:shadow-sky-500/30 hover:from-ice-primary hover:to-sky-500 active:scale-[0.99] transition-all duration-200"
            >
              计算风险评分
            </button>
          </div>

          <div className="space-y-4">
            {result !== null && riskLevel ? (
              <div className={cn('rounded-2xl p-6 border-2', riskLevel.border, riskLevel.bg)}>
                <div className="text-center">
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">风险评分</div>
                  <div className={cn('text-6xl font-black mb-2 risk-pulse', riskLevel.text)}>{result}</div>
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <span className={cn('w-4 h-4 rounded-full bg-ice-' + riskLevel.color)} />
                    <span className={cn('font-bold text-lg', riskLevel.text)}>{riskLevel.level}级（{riskLevel.label}）</span>
                  </div>
                </div>
                <div className="bg-white/60 rounded-xl p-4 text-sm space-y-2">
                  <div className="flex items-start gap-2">
                    {riskLevel.color === 'ice-safe' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-" />
                    )}
                    <p className="text-slate-700 leading-relaxed">
                      {riskLevel.level === '安全' && '桥面状态稳定，可按正常巡视频次管理，建议2小时后复查。'}
                      {riskLevel.level === '关注' && '桥面存在轻微结冰风险，建议加密巡查频次，每小时复查一次。'}
                      {riskLevel.level === '预警' && '桥面结冰风险较高，立即通知养护队伍待命，准备撒盐作业。'}
                      {riskLevel.level === '紧急' && '桥面极易结冰，请立即调度撒盐车辆作业，封闭交通并发布预警。'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl p-8 border-2 border-dashed border-slate-200 bg-slate-50/50 text-center">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                  <Calculator className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-sm text-slate-500">填写参数后点击<br />「计算风险评分」查看结果</p>
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">风险等级参考</h4>
              </div>
              <div className="p-3 space-y-2">
                {RISK_LEVELS.map((r) => (
                  <div key={r.label} className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-slate-50">
                    <span className={cn('w-3 h-3 rounded-full bg-ice-' + r.color)} />
                    <span className={cn('text-xs font-semibold w-10', r.text)}>{r.level}</span>
                    <span className="text-xs text-slate-500">{r.min}–{r.max} 分</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
