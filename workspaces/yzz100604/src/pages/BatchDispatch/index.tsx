import { useMemo } from 'react';
import { useStore } from '@/store';
import { Truck, Clock, MapPin, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BridgeRisk {
  id: string;
  name: string;
  location: string;
  area: number;
  score: number;
  temp: number;
  humidity: number;
  wind: number;
  lastCheck: string;
  needAction: boolean;
}

const generateBatchData = (): BridgeRisk[] => {
  const bridges = useStore.getState().bridges;
  return bridges.map((b, i) => {
    const baseScore = 30 + i * 8 + (i % 3) * 15;
    const score = Math.min(98, baseScore);
    const needAction = score >= 50;
    const now = new Date();
    return {
      id: b.id,
      name: b.name,
      location: b.location,
      area: b.area,
      score,
      temp: Math.round((-3 + i * 0.6) * 10) / 10,
      humidity: 70 + i * 3,
      wind: 2 + i,
      lastCheck: new Date(now.getTime() - (i * 15 + 5) * 60000).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      needAction,
    };
  });
};

const getRiskStyle = (score: number) => {
  if (score >= 75) return { text: 'text-red-700', bg: 'bg-red-50', bar: 'bg-ice-danger', border: 'border-red-200', label: '紧急' };
  if (score >= 50) return { text: 'text-orange-700', bg: 'bg-orange-50', bar: 'bg-ice-warning', border: 'border-orange-200', label: '预警' };
  if (score >= 25) return { text: 'text-amber-700', bg: 'bg-amber-50', bar: 'bg-ice-caution', border: 'border-amber-200', label: '关注' };
  return { text: 'text-emerald-700', bg: 'bg-emerald-50', bar: 'bg-ice-safe', border: 'border-emerald-200', label: '安全' };
};

export default function BatchDispatch() {
  const data = useMemo(() => generateBatchData(), []);
  const urgent = data.filter((d) => d.needAction);
  const total = data.length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="ice-card rounded-2xl p-5 bg-white border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">监控桥梁</p>
              <p className="text-3xl font-black text-slate-800 mt-1">{total}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-ice-accent" />
            </div>
          </div>
        </div>
        <div className="ice-card rounded-2xl p-5 bg-white border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-red-600">需立即处置</p>
              <p className="text-3xl font-black text-red-700 mt-1">{urgent.filter((u) => u.score >= 75).length}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-ice-danger" />
            </div>
          </div>
        </div>
        <div className="ice-card rounded-2xl p-5 bg-white border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-orange-600">预警级</p>
              <p className="text-3xl font-black text-orange-700 mt-1">{urgent.filter((u) => u.score >= 50 && u.score < 75).length}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center">
              <Truck className="w-6 h-6 text-ice-warning" />
            </div>
          </div>
        </div>
        <div className="ice-card rounded-2xl p-5 bg-white border border-emerald-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-emerald-600">安全运行</p>
              <p className="text-3xl font-black text-emerald-700 mt-1">{data.filter((d) => d.score < 25).length}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-ice-safe" />
            </div>
          </div>
        </div>
      </div>

      <div className="ice-card rounded-2xl bg-white border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <div>
            <h3 className="font-bold text-slate-800">全桥实时风险看板</h3>
            <p className="text-xs text-slate-500 mt-0.5">自动轮询数据，刷新间隔 5 分钟</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
            <RefreshCw className="w-4 h-4" />
            立即刷新
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">桥梁</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">风险评分</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">气温</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">湿度</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">风速</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">桥面面积</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <Clock className="w-4 h-4 inline" /> 最近检查
                </th>
                <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">调度</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => {
                const style = getRiskStyle(row.score);
                return (
                  <tr key={row.id} className={cn('border-b border-slate-100 hover:bg-slate-50/60 transition-colors', row.needAction && 'bg-' + style.bg.slice(3) + '/20')}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn('w-10 h-10 rounded-lg border flex items-center justify-center shrink-0', style.border, style.bg)}>
                          <MapPin className={cn('w-5 h-5', style.text)} />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{row.name}</p>
                          <p className="text-xs text-slate-500">{row.location}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-[120px]">
                          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={cn('h-full rounded-full transition-all', style.bar)} style={{ width: row.score + '%' }} />
                          </div>
                        </div>
                        <span className={cn('text-sm font-black min-w-[60px]', style.text)}>
                          {row.score} <span className="text-xs font-medium">({style.label})</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700 font-mono">{row.temp}℃</td>
                    <td className="px-6 py-4 text-sm text-slate-700 font-mono">{row.humidity}%</td>
                    <td className="px-6 py-4 text-sm text-slate-700 font-mono">{row.wind} m/s</td>
                    <td className="px-6 py-4 text-sm text-slate-700 font-mono">{row.area.toLocaleString()} ㎡</td>
                    <td className="px-6 py-4 text-sm text-slate-500 font-mono">{row.lastCheck}</td>
                    <td className="px-6 py-4">
                      {row.needAction ? (
                        <button className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                          row.score >= 75
                            ? 'bg-ice-danger text-white hover:bg-red-600 shadow-sm shadow-red-500/25'
                            : 'bg-ice-warning text-white hover:bg-orange-600 shadow-sm shadow-orange-500/25'
                        )}>
                          <Truck className="w-3.5 h-3.5 inline mr-1.5" />
                          {row.score >= 75 ? '紧急调度' : '调度撒盐'}
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 正常
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
