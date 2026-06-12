import { BarChart3, Package, AlertTriangle, TrendingUp } from 'lucide-react';
import type { GameStats } from '@/types/game';
import { GARBAGE_LABELS, GARBAGE_COLORS } from '@/types/level';
import type { GarbageType } from '@/types/game';

const GARBAGE_TYPES: GarbageType[] = ['floating_plastic', 'shoreline_foam', 'large_debris'];

interface StatsPanelProps {
  stats: GameStats | null;
  initialGarbageCount: number;
}

export default function StatsPanel({ stats, initialGarbageCount }: StatsPanelProps) {
  if (!stats) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-center text-slate-500 text-sm">
        暂无统计数据
      </div>
    );
  }

  const efficiency = initialGarbageCount > 0
    ? Math.round((stats.totalSalvaged / initialGarbageCount) * 100)
    : 0;

  const maxBoatSalvaged = Math.max(1, ...Object.values(stats.perBoatSalvaged));
  const maxTypeSalvaged = Math.max(1, ...Object.values(stats.perTypeSalvaged));

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 size={18} className="text-blue-400" />
        <h3 className="text-sm font-bold text-slate-200">游戏统计</h3>
      </div>

      <div className="flex items-center gap-3 bg-slate-700/50 rounded p-3">
        <Package size={20} className="text-green-400" />
        <div>
          <div className="text-xs text-slate-400">总回收量</div>
          <div className="text-lg font-bold text-green-400">{stats.totalSalvaged}</div>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-bold text-slate-400 mb-2">各船回收量</h4>
        <div className="space-y-1.5">
          {Object.entries(stats.perBoatSalvaged).map(([name, val]) => (
            <div key={name} className="flex items-center gap-2">
              <span className="text-xs text-slate-300 w-16 truncate">{name}</span>
              <div className="flex-1 bg-slate-700 rounded-full h-3 overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(val / maxBoatSalvaged) * 100}%` }} />
              </div>
              <span className="text-xs text-slate-400 w-8 text-right">{val}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-bold text-slate-400 mb-2">分类回收</h4>
        <div className="space-y-1.5">
          {GARBAGE_TYPES.map(gt => {
            const val = stats.perTypeSalvaged[gt] || 0;
            return (
              <div key={gt} className="flex items-center gap-2">
                <span className="text-xs text-slate-300 w-16 truncate">{GARBAGE_LABELS[gt]}</span>
                <div className="flex-1 bg-slate-700 rounded-full h-3 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(val / maxTypeSalvaged) * 100}%`, backgroundColor: GARBAGE_COLORS[gt] }} />
                </div>
                <span className="text-xs text-slate-400 w-8 text-right">{val}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-700/50 rounded p-2">
          <div className="text-xs text-slate-400">垃圾袋预估</div>
          <div className="text-sm font-bold text-amber-400">{stats.bagEstimate}</div>
        </div>
        <div className="bg-slate-700/50 rounded p-2">
          <div className="text-xs text-slate-400">推荐袋数</div>
          <div className="text-sm font-bold text-amber-400">{stats.bagRecommendation}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-300">
        <AlertTriangle size={14} className="text-amber-400" />
        遗漏区域: {stats.missedAreas.length}
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-300">
        <AlertTriangle size={14} className="text-red-400" />
        浪费行程: {stats.wastedTrips.length}
      </div>

      <div className="flex items-center gap-3 bg-slate-700/50 rounded p-3">
        <TrendingUp size={20} className={efficiency >= 80 ? 'text-green-400' : efficiency >= 50 ? 'text-yellow-400' : 'text-red-400'} />
        <div>
          <div className="text-xs text-slate-400">效率评分</div>
          <div className={`text-lg font-bold ${efficiency >= 80 ? 'text-green-400' : efficiency >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
            {efficiency}%
          </div>
        </div>
      </div>
    </div>
  );
}
