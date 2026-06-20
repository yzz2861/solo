import { ShieldAlert, ClipboardCheck, FileCheck, ArrowDownRight, TrendingUp, BadgeCheck } from 'lucide-react';
import type { CalculationResult, InputParams, FillHistoryRecord } from '@/types/water-tower';
import { VOLUME_UNIT_LABELS, FLOW_UNIT_LABELS } from '@/types/water-tower';
import { formatLiters, formatLpm, formatDuration, formatDurationWithSeconds } from '@/utils/water-calc';
import { useWaterStore } from '@/store/useWaterStore';
import { cn } from '@/lib/utils';

interface Props {
  params: InputParams;
  result: CalculationResult;
}

const SupervisorView = ({ params, result }: Props) => {
  const { history } = useWaterStore();
  const completed = history.filter((r) => r.status === 'completed');
  const avgAccuracy =
    completed.length > 0
      ? completed.reduce((s, r) => s + (r.estimateAccuracyPct ?? 0), 0) / completed.length
      : null;

  return (
    <div className="space-y-5 animate-fade-up stagger-3">
      {/* 顶部总览卡 */}
      <div className="industrial-card p-6 md:p-7 bg-gradient-to-br from-industrial-50 via-white to-aqua-50/50">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-industrial-gradient flex items-center justify-center shadow-lg">
              <ClipboardCheck className="w-5 h-5 text-white" strokeWidth={2.2} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-industrial-800">主管审核视图</h3>
              <p className="text-xs text-industrial-400 mt-0.5">
                保留全部参数 + 15% 保守余量 · 风险一目了然
              </p>
            </div>
          </div>
          {completed.length > 0 && (
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-success-gradient/10 border border-status-success/20">
              <BadgeCheck className="w-4 h-4 text-status-success" />
              <div>
                <div className="text-[10px] text-status-success font-medium leading-none">
                  历史平均估算精度
                </div>
                <div className="font-mono-digits text-base font-bold text-status-success mt-0.5">
                  {avgAccuracy!.toFixed(1)}%
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 核心对比 - 三个启动时间方案 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <TimingCard
            label="理论启动时间"
            subtitle="纯计算值 · 无余量"
            time={result.latestStartDisplay}
            period={result.latestStartPeriod}
            duration={result.fillMinutesRounded}
            color="#00B8D9"
            tagColor="aqua"
          />
          <TimingCard
            label={`建议启动时间（+${result.conservativeBufferPct}%余量）`}
            subtitle="主管推荐值 · 应对波动"
            time={result.conservativeStartDisplay}
            period={result.conservativeStartPeriod}
            duration={result.conservativeMinutes}
            color="#16336B"
            tagColor="industrial"
            featured
          />
          <TimingCard
            label="早高峰截止时间"
            subtitle="红线 · 必须在此刻前完成"
            time={params.morningPeakTime}
            period="早高峰"
            duration={0}
            color="#FF5630"
            tagColor="danger"
            isDeadline
          />
        </div>

        {/* 方案对比条 */}
        <div className="p-4 rounded-xl bg-white/80 border border-industrial-100">
          <div className="text-xs font-bold text-industrial-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5" />
            时间轴对比（距早高峰）
          </div>
          <div className="relative h-14 rounded-lg overflow-hidden bg-industrial-50 border border-industrial-100">
            <div
              className="absolute left-0 top-0 bottom-0"
              style={{
                width: `${((result.conservativeMinutes) / (result.conservativeMinutes + 30)) * 100}%`,
                background: 'repeating-linear-gradient(135deg, #C7D6EC 0, #C7D6EC 8px, #E6EEF8 8px, #E6EEF8 16px)',
              }}
            />
            <div
              className="absolute left-0 top-0 bottom-0 opacity-70"
              style={{
                width: `${(result.fillMinutesRounded / (result.conservativeMinutes + 30)) * 100}%`,
                background: 'linear-gradient(90deg, #00B8D9, #007A96)',
              }}
            />
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-status-danger"
              style={{ left: `${(result.conservativeMinutes / (result.conservativeMinutes + 30)) * 100}%` }}
            />
            <div className="absolute inset-x-0 bottom-0 flex justify-between text-[10px] px-2 pb-1 text-industrial-500 font-mono-digits">
              <span>0</span>
              <span className="text-aqua-600">理论 {formatDuration(result.fillMinutesExact)}</span>
              <span className="text-industrial-700 font-bold">+15% 余量 {formatDuration(result.conservativeMinutes - result.fillMinutesRounded)}</span>
              <span className="text-status-danger font-bold">早高峰 截止</span>
            </div>
          </div>
        </div>
      </div>

      {/* 参数明细表 */}
      <div className="industrial-card overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-industrial-50 bg-industrial-50/50">
          <FileCheck className="w-4 h-4 text-industrial-500" />
          <h3 className="font-bold text-industrial-800">全部参数明细表</h3>
          <span className="ml-auto text-xs text-industrial-400 font-mono-digits">
            {new Date().toLocaleString('zh-CN')}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-industrial-400 bg-industrial-50/30">
                <th className="text-left font-medium px-6 py-3 w-48">参数</th>
                <th className="text-left font-medium px-6 py-3 w-36">输入值</th>
                <th className="text-left font-medium px-6 py-3 w-40">统一单位换算</th>
                <th className="text-left font-medium px-6 py-3">备注</th>
              </tr>
            </thead>
            <tbody>
              <ParamRow
                name="水塔总容量"
                input={`${params.tankCapacity} ${VOLUME_UNIT_LABELS[params.tankCapacityUnit]}`}
                unified={formatLiters(result.tankCapacityLiters)}
                note="水塔标称容量"
              />
              <ParamRow
                name="当前水位"
                input={
                  params.currentLevelType === 'percent'
                    ? `${params.currentWaterLevel}%`
                    : `${params.currentWaterLevel} ${VOLUME_UNIT_LABELS[params.currentLevelUnit]}`
                }
                unified={formatLiters(result.currentLiters)}
                note={`占容量 ${((result.currentLiters / result.tankCapacityLiters) * 100).toFixed(1)}%`}
              />
              <ParamRow
                name="目标水位"
                input={
                  params.targetLevelType === 'percent'
                    ? `${params.targetWaterLevel}%`
                    : `${params.targetWaterLevel} ${VOLUME_UNIT_LABELS[params.targetLevelUnit]}`
                }
                unified={formatLiters(result.targetLiters)}
                note={`占容量 ${((result.targetLiters / result.tankCapacityLiters) * 100).toFixed(1)}%`}
                featured
              />
              <ParamRow
                name="🔺 需补水量"
                input=""
                unified={formatLiters(result.requiredLiters)}
                note="目标 - 当前"
                highlight="#00B8D9"
              />
              <ParamRow
                name="水泵标称流量"
                input={`${params.pumpFlowRate} ${FLOW_UNIT_LABELS[params.pumpFlowUnit]}`}
                unified={formatLpm(result.nominalFlowLpm)}
                note="设备铭牌值"
              />
              <ParamRow
                name="管路损耗"
                input={`${(result.pipeLossRatio * 100).toFixed(1)}%`}
                unified={`-${formatLpm(result.pipeLossAmount)}`}
                note="按管道长度和老化程度估算"
                caution={result.pipeLossRatio > 0.25}
              />
              <ParamRow
                name="高峰同时用水"
                input={`${params.concurrentUsage} ${FLOW_UNIT_LABELS[params.concurrentUsageUnit]}`}
                unified={`-${formatLpm(result.concurrentUsageLpm)}`}
                note={`占标称 ${((result.concurrentUsageLpm / Math.max(0.001, result.nominalFlowLpm)) * 100).toFixed(1)}%`}
                caution={result.warnings.excessiveUsage}
              />
              <ParamRow
                name="🔺 实际净流量"
                input=""
                unified={formatLpm(result.netFlowLpm)}
                note="标称 × (1-管损) - 同时用水"
                highlight="#36B37E"
              />
              <ParamRow
                name="早高峰时间"
                input={params.morningPeakTime}
                unified="红线截止"
                note="投诉风险时间点"
                caution
              />
            </tbody>
          </table>
        </div>
      </div>

      {/* 风险评估 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <RiskBox
          title="缺水投诉风险"
          level={
            result.hasBlockingError
              ? '高'
              : result.warnings.excessiveUsage
              ? '中'
              : result.fillMinutesRounded > 60 * 5
              ? '中'
              : '低'
          }
          detail={
            result.hasBlockingError
              ? '当前参数无法完成补水，必须调整'
              : result.warnings.excessiveUsage
              ? '同耗较大，建议提前启动或错峰'
              : '参数正常，按建议时间启动即可'
          }
        />
        <RiskBox
          title="设备负荷评估"
          level={
            result.nominalFlowLpm === 0
              ? '停机'
              : ((result.concurrentUsageLpm + result.pipeLossAmount) / result.nominalFlowLpm) > 0.7
              ? '高'
              : '中'
          }
          detail={`实际负载率 ${(((result.concurrentUsageLpm + result.pipeLossAmount) / Math.max(0.001, result.nominalFlowLpm)) * 100).toFixed(1)}%`}
        />
        <RiskBox
          title="预估偏差范围"
          level={completed.length >= 3 ? '受控' : '待观察'}
          detail={
            completed.length >= 3
              ? `基于${completed.length}次历史数据，偏差 ±${(100 - avgAccuracy!).toFixed(1)}%`
              : `历史记录不足（${completed.length}次），建议多记录几次`
          }
        />
      </div>

      {/* 签名栏 */}
      <div className="industrial-card p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-dashed border-industrial-200">
            <div className="text-xs text-industrial-400 mb-6">值班工程师签名</div>
            <div className="border-b border-industrial-200 pb-1" />
            <div className="text-xs text-industrial-400 mt-2">日期：____________</div>
          </div>
          <div className="p-4 rounded-xl border border-dashed border-industrial-200">
            <div className="text-xs text-industrial-400 mb-6">工程主管审核签名</div>
            <div className="border-b border-industrial-200 pb-1" />
            <div className="text-xs text-industrial-400 mt-2">日期：____________</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const TimingCard = ({
  label,
  subtitle,
  time,
  period,
  duration,
  color,
  tagColor,
  featured,
  isDeadline,
}: {
  label: string;
  subtitle: string;
  time: string;
  period: string;
  duration: number;
  color: string;
  tagColor: string;
  featured?: boolean;
  isDeadline?: boolean;
}) => {
  const tagStyles: Record<string, string> = {
    aqua: 'bg-aqua-100 text-aqua-700 border-aqua-200',
    industrial: 'bg-industrial-700 text-white border-industrial-700 shadow-md',
    danger: 'bg-danger-gradient text-white border-status-danger shadow-md',
  };
  return (
    <div
      className={cn(
        'relative rounded-2xl p-5 border-2 transition-all',
        featured
          ? 'border-industrial-600 shadow-card-hover bg-gradient-to-br from-industrial-50 to-aqua-50 -translate-y-1'
          : isDeadline
          ? 'border-status-danger/30 bg-status-danger/5'
          : 'border-industrial-100 bg-white',
      )}
    >
      {featured && (
        <div className="absolute -top-3 left-4">
          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-industrial-gradient text-white shadow-lg flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" />
            主管推荐
          </span>
        </div>
      )}
      <div className="text-xs font-medium text-industrial-500 mb-1">{label}</div>
      <div className="text-[11px] text-industrial-400 mb-3">{subtitle}</div>
      <div
        className="font-mono-digits text-3xl md:text-4xl font-bold leading-none mb-2 tracking-tight"
        style={{ color }}
      >
        {time}
      </div>
      <div className="flex items-center justify-between">
        <span className={cn('chip text-[11px] border', tagStyles[tagColor])}>{period}</span>
        {!isDeadline ? (
          <span className="text-xs text-industrial-400 font-mono-digits">
            耗时 {formatDurationWithSeconds(duration)}
          </span>
        ) : (
          <span className="text-xs text-status-danger font-medium flex items-center gap-1">
            <ArrowDownRight className="w-3 h-3" />
            红线
          </span>
        )}
      </div>
    </div>
  );
};

const ParamRow = ({
  name,
  input,
  unified,
  note,
  featured,
  highlight,
  caution,
}: {
  name: string;
  input: string;
  unified: string;
  note: string;
  featured?: boolean;
  highlight?: string;
  caution?: boolean;
}) => (
  <tr
    className={cn(
      'border-t border-industrial-50 transition-colors hover:bg-industrial-50/30',
      featured && 'bg-aqua-50/30',
    )}
  >
    <td className="px-6 py-3">
      <span
        className={cn(
          'font-medium',
          highlight ? 'font-bold' : 'text-industrial-700',
          caution && 'text-status-warning',
        )}
        style={highlight ? { color: highlight } : undefined}
      >
        {name}
      </span>
    </td>
    <td className="px-6 py-3 font-mono-digits text-industrial-600">{input || '—'}</td>
    <td className="px-6 py-3 font-mono-digits font-bold text-industrial-800">{unified}</td>
    <td className="px-6 py-3 text-xs text-industrial-400">{note}</td>
  </tr>
);

const RiskBox = ({
  title,
  level,
  detail,
}: {
  title: string;
  level: string;
  detail: string;
}) => {
  const levelMap: Record<string, string> = {
    高: 'bg-danger-gradient text-white',
    中: 'bg-warning-gradient text-white',
    低: 'bg-success-gradient text-white',
    停机: 'bg-industrial-gradient text-white',
    受控: 'bg-aqua-gradient text-white',
    '待观察': 'bg-industrial-500 text-white',
  };
  return (
    <div className="industrial-card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-industrial-500 font-medium">{title}</span>
        <span className={cn('chip text-[11px]', levelMap[level] || 'bg-industrial-500 text-white')}>
          {level}
        </span>
      </div>
      <p className="text-xs text-industrial-600 leading-relaxed">{detail}</p>
    </div>
  );
};

export default SupervisorView;
