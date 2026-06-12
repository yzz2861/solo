import { AlertTriangle, AlertCircle, Info, FileText, Zap, Navigation, Users, Gauge, Settings } from 'lucide-react';
import type { RiskItem } from '@/types';

const LEVEL_STYLES: Record<RiskItem['level'], { bg: string; border: string; title: string; icon: any }> = {
  danger: {
    bg: 'bg-gradient-to-r from-safety-red/15 to-transparent',
    border: 'border-l-4 border-safety-red',
    title: 'text-safety-red',
    icon: AlertTriangle,
  },
  warning: {
    bg: 'bg-gradient-to-r from-safety-yellow/12 to-transparent',
    border: 'border-l-4 border-safety-yellow',
    title: 'text-safety-yellow',
    icon: Zap,
  },
  info: {
    bg: 'bg-gradient-to-r from-safety-blue/12 to-transparent',
    border: 'border-l-4 border-safety-blue',
    title: 'text-safety-blue',
    icon: Info,
  },
  notice: {
    bg: 'bg-gradient-to-r from-slate-500/10 to-transparent',
    border: 'border-l-4 border-slate-500',
    title: 'text-slate-300',
    icon: FileText,
  },
};

const CATEGORY_LABEL: Record<RiskItem['category'], { label: string; Icon: any }> = {
  radius: { label: '半径', Icon: Navigation },
  collision: { label: '碰撞', Icon: AlertCircle },
  walkway: { label: '通道', Icon: Users },
  capacity: { label: '载荷', Icon: Gauge },
  special: { label: '工况', Icon: Settings },
};

interface Props {
  risk: RiskItem;
  compact?: boolean;
}

export default function RiskCard({ risk, compact = false }: Props) {
  const style = LEVEL_STYLES[risk.level];
  const cat = CATEGORY_LABEL[risk.category];
  const Icon = style.icon;
  return (
    <div className={`${style.bg} ${style.border} rounded-r ${compact ? 'p-2 my-1' : 'p-3 my-1.5'} hover:brightness-110 transition-all`}>
      <div className="flex items-start gap-2">
        <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${style.title}`} />
        <div className="flex-1 min-w-0">
          <div className={`${compact ? 'text-xs' : 'text-sm'} font-semibold ${style.title} flex items-center gap-2 flex-wrap`}>
            <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-black/30 text-slate-300 font-medium">
              <cat.Icon className="w-3 h-3" />
              {cat.label}
            </span>
            <span>{risk.title}</span>
          </div>
          <div className={`${compact ? 'text-[11px]' : 'text-xs'} text-slate-400 mt-1 leading-relaxed`}>
            {risk.description}
          </div>
          {risk.affectedAngle && (
            <div className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded bg-dock-950/60 text-slate-300">
              <Navigation className="w-3 h-3 text-safety-orange" />
              影响角度 {risk.affectedAngle[0].toFixed(0)}° → {risk.affectedAngle[1].toFixed(0)}°
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
