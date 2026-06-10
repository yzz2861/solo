import {
  Ruler,
  RotateCcw,
  AlertTriangle,
  Shield,
  AlertCircle,
  Footprints,
  Users,
} from 'lucide-react';
import { useSceneStore } from '@/store/useSceneStore';
import { formatDistance } from '@/utils/units';
import { cn } from '@/lib/utils';

interface StatusBarProps {
  className?: string;
}

export function StatusBar({ className }: StatusBarProps) {
  const { getPathStats, displaySettings, collisions, zoneViolations } = useSceneStore();
  const stats = getPathStats();
  const unit = displaySettings.unit;

  const getSeverityColor = (distance: number | null) => {
    if (distance === null) return 'text-slate-400';
    if (distance <= 0.05) return 'text-red-400';
    if (distance <= 0.3) return 'text-yellow-400';
    return 'text-emerald-400';
  };

  const getSeverityBg = (distance: number | null) => {
    if (distance === null) return 'bg-slate-800/50';
    if (distance <= 0.05) return 'bg-red-500/10 border-red-500/30';
    if (distance <= 0.3) return 'bg-yellow-500/10 border-yellow-500/30';
    return 'bg-emerald-500/10 border-emerald-500/30';
  };

  const StatusCard = ({
    icon: Icon,
    label,
    value,
    subValue,
    severity,
  }: {
    icon: React.ElementType;
    label: string;
    value: string;
    subValue?: string;
    severity?: 'safe' | 'warning' | 'danger' | 'neutral';
  }) => {
    const colors = {
      safe: 'text-emerald-400',
      warning: 'text-yellow-400',
      danger: 'text-red-400',
      neutral: 'text-slate-400',
    };

    const bgColors = {
      safe: 'bg-emerald-500/10 border-emerald-500/30',
      warning: 'bg-yellow-500/10 border-yellow-500/30',
      danger: 'bg-red-500/10 border-red-500/30',
      neutral: 'bg-slate-800/50 border-slate-700/50',
    };

    return (
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-2.5 rounded-xl border backdrop-blur-sm',
          bgColors[severity || 'neutral'],
        )}
      >
        <div
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center',
            severity === 'safe' && 'bg-emerald-500/20',
            severity === 'warning' && 'bg-yellow-500/20',
            severity === 'danger' && 'bg-red-500/20',
            severity === 'neutral' && 'bg-slate-700/50',
          )}
        >
          <Icon className={cn('w-4 h-4', colors[severity || 'neutral'])} />
        </div>
        <div>
          <p className="text-xs text-slate-400">{label}</p>
          <p className={cn('text-sm font-semibold font-mono', colors[severity || 'neutral'])}>
            {value}
          </p>
          {subValue && <p className="text-xs text-slate-500">{subValue}</p>}
        </div>
      </div>
    );
  };

  const overallSeverity = (): 'safe' | 'warning' | 'danger' | 'neutral' => {
    if (collisions.length === 0) return 'neutral';
    if (stats.dangerCount > 0) return 'danger';
    if (stats.warningCount > 0) return 'warning';
    return 'safe';
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-2 bg-slate-900/80 backdrop-blur-md rounded-xl border border-slate-700/50 shadow-2xl',
        className,
      )}
    >
      <StatusCard
        icon={Ruler}
        label="路径总长"
        value={formatDistance(stats.totalLength, unit, 1)}
        severity="neutral"
      />

      <StatusCard
        icon={RotateCcw}
        label="最小转弯半径"
        value={stats.minTurnRadius ? formatDistance(stats.minTurnRadius, unit, 2) : '--'}
        subValue={stats.minTurnRadius ? '路径最弯处' : '无路径数据'}
        severity="neutral"
      />

      <StatusCard
        icon={AlertTriangle}
        label="最近障碍物"
        value={stats.nearestObstacle !== null ? formatDistance(stats.nearestObstacle, unit, 2) : '--'}
        subValue={
          stats.dangerCount > 0
            ? `${stats.dangerCount}处碰撞`
            : stats.warningCount > 0
              ? `${stats.warningCount}处警告`
              : '安全'
        }
        severity={overallSeverity()}
      />

      <StatusCard
        icon={Users}
        label="行人通道净距"
        value={
          stats.pedestrianClearance !== null
            ? formatDistance(stats.pedestrianClearance, unit, 2)
            : '--'
        }
        subValue="最近行人通道"
        severity={
          stats.pedestrianClearance === null
            ? 'neutral'
            : stats.pedestrianClearance < 0.5
              ? 'danger'
              : stats.pedestrianClearance < 1
                ? 'warning'
                : 'safe'
        }
      />

      <div className="h-8 w-px bg-slate-700/50" />

      <div className="flex items-center gap-2 px-2">
        {stats.dangerCount > 0 && (
          <div className="flex items-center gap-1 text-xs text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span>{stats.dangerCount} 危险</span>
          </div>
        )}
        {stats.warningCount > 0 && (
          <div className="flex items-center gap-1 text-xs text-yellow-400">
            <AlertTriangle className="w-4 h-4" />
            <span>{stats.warningCount} 警告</span>
          </div>
        )}
        {stats.dangerCount === 0 && stats.warningCount === 0 && collisions.length === 0 && (
          <div className="flex items-center gap-1 text-xs text-emerald-400">
            <Shield className="w-4 h-4" />
            <span>安全</span>
          </div>
        )}
      </div>

      {zoneViolations.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-lg">
          <Ban className="w-4 h-4 text-red-400" />
          <span className="text-xs text-red-400 font-medium">
            路径侵入 {zoneViolations.length} 个禁行区
          </span>
        </div>
      )}
    </div>
  );
}

function Ban({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m4.93 4.93 14.14 14.14" />
    </svg>
  );
}
