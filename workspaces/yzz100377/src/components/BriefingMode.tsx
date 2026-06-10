import { useEffect } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Lightbulb,
  Volume2,
} from 'lucide-react';
import { useSceneStore } from '@/store/useSceneStore';
import { cn } from '@/lib/utils';
import { formatDistance } from '@/utils/units';

interface BriefingModeProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BriefingMode({ isOpen, onClose }: BriefingModeProps) {
  const {
    collisions,
    briefingRiskIndex,
    nextBriefingRisk,
    prevBriefingRisk,
    displaySettings,
    generateRectificationReport,
    getObjectById,
  } = useSceneStore();

  const risks = collisions.filter((c) => c.severity !== 'safe');
  const currentRisk = risks[briefingRiskIndex];
  const unit = displaySettings.unit;
  const rectItems = generateRectificationReport();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'ArrowRight') nextBriefingRisk();
      if (e.key === 'ArrowLeft') prevBriefingRisk();
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, nextBriefingRisk, prevBriefingRisk, onClose]);

  if (!isOpen) return null;

  const relatedObject = currentRisk ? getObjectById(currentRisk.objectId) : null;

  const getSeverityInfo = (severity: 'danger' | 'warning' | 'safe') => {
    if (severity === 'danger') {
      return {
        icon: AlertCircle,
        color: 'text-red-400',
        bg: 'bg-red-500/20',
        border: 'border-red-500/50',
        label: '危险',
        desc: '会发生碰撞，必须整改',
      };
    }
    if (severity === 'warning') {
      return {
        icon: AlertTriangle,
        color: 'text-yellow-400',
        bg: 'bg-yellow-500/20',
        border: 'border-yellow-500/50',
        label: '警告',
        desc: '距离太近，容易擦边',
      };
    }
    return {
      icon: CheckCircle,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/20',
      border: 'border-emerald-500/50',
      label: '安全',
      desc: '距离充足',
    };
  };

  const tips = [
    '通过窄道时要减速，鸣笛示意',
    '转弯时注意内轮差，后轮轨迹比前轮更靠近内侧',
    '托盘伸出时转弯半径会变大',
    '保持与行人通道至少1米的安全距离',
    '视线受阻时要有人指挥再通过',
    '每日班前检查刹车和转向系统',
  ];

  const currentTip = tips[briefingRiskIndex % tips.length];

  const severityInfo = currentRisk
    ? getSeverityInfo(currentRisk.severity)
    : getSeverityInfo('safe');
  const SeverityIcon = severityInfo.icon;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent pointer-events-auto" />

      <div className="absolute top-0 left-0 right-0 p-4 pointer-events-auto">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/50 flex items-center justify-center">
              <Volume2 className="w-5 h-5 text-orange-400 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">班前安全会</h2>
              <p className="text-sm text-slate-400">
                共 {risks.length} 个风险点 · 第 {briefingRiskIndex + 1} 个
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors border border-slate-700/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-6 pointer-events-auto">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={prevBriefingRisk}
              disabled={risks.length <= 1}
              className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-slate-700/50 hover:scale-105"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-2">
              {risks.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-2 h-2 rounded-full transition-all',
                    i === briefingRiskIndex
                      ? 'bg-orange-500 w-6'
                      : risks[i].severity === 'danger'
                        ? 'bg-red-500/50'
                        : 'bg-yellow-500/50',
                  )}
                />
              ))}
            </div>

            <button
              onClick={nextBriefingRisk}
              disabled={risks.length <= 1}
              className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-slate-700/50 hover:scale-105"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {risks.length === 0 ? (
            <div className="p-8 bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-emerald-500/30 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-emerald-400 mb-2">全部安全</h3>
              <p className="text-slate-400">
                当前路径没有发现碰撞风险，请保持安全驾驶习惯
              </p>
            </div>
          ) : (
            <div
              className={cn(
                'p-6 bg-slate-900/90 backdrop-blur-xl rounded-2xl border',
                severityInfo.border,
              )}
            >
              <div className="flex items-start gap-4 mb-4">
                <div
                  className={cn(
                    'w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0',
                    severityInfo.bg,
                  )}
                >
                  <SeverityIcon className={cn('w-7 h-7', severityInfo.color)} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={cn(
                        'px-2 py-0.5 text-xs font-medium rounded-md',
                        severityInfo.bg,
                        severityInfo.color,
                      )}
                    >
                      {severityInfo.label}
                    </span>
                    {relatedObject && (
                      <span className="text-sm text-slate-400">
                        涉及: {relatedObject.name || '未知物体'}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">
                    {currentRisk?.description}
                  </h3>
                  <p className="text-sm text-slate-400">{severityInfo.desc}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="p-3 bg-slate-800/60 rounded-xl">
                  <p className="text-xs text-slate-500">距离</p>
                  <p className={cn('text-lg font-bold font-mono', severityInfo.color)}>
                    {currentRisk && currentRisk.distance < 0
                      ? `侵入 ${formatDistance(Math.abs(currentRisk.distance), unit, 2)}`
                      : formatDistance(currentRisk?.distance || 0, unit, 2)}
                  </p>
                </div>
                <div className="p-3 bg-slate-800/60 rounded-xl">
                  <p className="text-xs text-slate-500">位置</p>
                  <p className="text-sm font-mono text-slate-300">
                    {currentRisk?.position.x.toFixed(1)}, {currentRisk?.position.z.toFixed(1)}
                  </p>
                </div>
                <div className="p-3 bg-slate-800/60 rounded-xl">
                  <p className="text-xs text-slate-500">类型</p>
                  <p className="text-sm text-slate-300">
                    {relatedObject?.type === 'shelf' && '货架碰撞'}
                    {relatedObject?.type === 'zone' && '禁行区侵入'}
                    {relatedObject?.type === 'pallet' && '托盘刮蹭'}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-xl border border-amber-500/20">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <Lightbulb className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-amber-300 mb-1">安全提示</p>
                    <p className="text-sm text-amber-200/80">{currentTip}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {rectItems.length > 0 && (
            <div className="mt-4 p-4 bg-slate-900/60 backdrop-blur-lg rounded-xl border border-slate-700/50">
              <p className="text-xs text-slate-400 mb-2">整改措施摘要</p>
              <ul className="text-sm text-slate-300 space-y-1">
                {rectItems.slice(0, 3).map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span
                      className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        item.priority === 'high' && 'bg-red-500',
                        item.priority === 'medium' && 'bg-yellow-500',
                        item.priority === 'low' && 'bg-blue-500',
                      )}
                    />
                    {item.description}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
