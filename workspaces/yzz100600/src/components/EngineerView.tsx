import type { CalculationResult, InputParams } from '@/types/water-tower';
import {
  Timer,
  AlarmClockMinus,
  CloudRain,
  Droplets,
  PlayCircle,
  StopCircle,
  CheckCircle2,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { useWaterStore } from '@/store/useWaterStore';
import { formatLiters, formatLpm, formatDurationWithSeconds } from '@/utils/water-calc';

interface Props {
  params: InputParams;
  result: CalculationResult;
}

const EngineerView = ({ params, result }: Props) => {
  const { startNewRecord, history, openRecordModal } = useWaterStore();
  const runningRecord = history.find((r) => r.status === 'running');

  const handleStart = () => {
    startNewRecord(params, {
      requiredLiters: result.requiredLiters,
      fillMinutesExact: result.fillMinutesExact,
      netFlowLpm: result.netFlowLpm,
      latestStartDisplay: result.latestStartDisplay,
    });
  };

  if (result.hasBlockingError) {
    return (
      <div className="industrial-card p-8 text-center animate-fade-up stagger-3">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-danger-gradient flex items-center justify-center mb-5 shadow-lg">
          <StopCircle className="w-10 h-10 text-white" strokeWidth={2} />
        </div>
        <h3 className="text-xl font-bold text-industrial-800 mb-2">当前参数无法执行补水</h3>
        <p className="text-industrial-500 max-w-md mx-auto">
          请检查上方红色警告提示，修正参数后重新估算。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-up stagger-3">
      {/* 主操作卡 */}
      <div className="relative overflow-hidden industrial-card">
        <div
          className="absolute inset-0 opacity-95"
          style={{
            background:
              'linear-gradient(135deg, #0F2550 0%, #1E4087 45%, #007A96 100%)',
          }}
        />
        <div className="absolute top-0 right-0 w-64 h-64 -mt-20 -mr-20 rounded-full bg-white/5" />
        <div className="absolute bottom-0 left-0 w-48 h-48 -mb-16 -ml-16 rounded-full bg-aqua-400/10" />

        <div className="relative p-6 md:p-7 text-white">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur border border-white/20 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-aqua-200" />
              </div>
              <div>
                <h3 className="text-lg font-bold">值班工程师操作面板</h3>
                <p className="text-xs text-white/60 mt-0.5">按此执行可确保早高峰前达标</p>
              </div>
            </div>
            <div className="chip bg-white/10 text-aqua-200 border border-white/15">
              <CheckCircle2 className="w-3.5 h-3.5" />
              参数已校验
            </div>
          </div>

          {/* 大字数字区 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="rounded-2xl bg-white/8 backdrop-blur-sm border border-white/15 p-5">
              <div className="flex items-center gap-2 text-xs text-white/60 mb-2">
                <Timer className="w-3.5 h-3.5" />
                <span>预计补水耗时</span>
              </div>
              <div className="font-mono-digits text-4xl md:text-5xl font-bold tracking-tight leading-none mb-1">
                {result.fillDurationDisplay.split('小时')[0]}
                {result.fillDurationDisplay.includes('小时') && (
                  <span className="text-2xl md:text-3xl font-medium opacity-80 ml-1">
                    小时 {result.fillDurationDisplay.split('小时')[1]}
                  </span>
                )}
              </div>
              <div className="text-xs text-white/50 mt-2 font-mono-digits">
                ≈ {formatDurationWithSeconds(result.fillMinutesExact)}
              </div>
            </div>

            <div className="relative rounded-2xl overflow-hidden p-5 border-2 border-aqua-300/30"
              style={{ background: 'linear-gradient(135deg, rgba(0, 184, 217, 0.25), rgba(0, 122, 150, 0.1))' }}>
              <div className="absolute -top-1 -right-1 flex items-center gap-1 px-2 py-0.5 rounded-b-lg rounded-tr-lg bg-aqua-400 text-[10px] font-bold text-industrial-900 shadow">
                ⚠️ 关键时间点
              </div>
              <div className="flex items-center gap-2 text-xs text-aqua-100 mb-2">
                <AlarmClockMinus className="w-3.5 h-3.5" />
                <span>最晚启动时间 · 早高峰 {params.morningPeakTime} 前完成</span>
              </div>
              <div className="font-mono-digits text-4xl md:text-5xl font-bold tracking-tight leading-none mb-1 text-aqua-100">
                {result.latestStartDisplay}
              </div>
              <div className="text-sm text-aqua-200/80 mt-2">
                <span className="font-medium">{result.latestStartPeriod}</span> 之前必须启动
              </div>
            </div>
          </div>

          {/* 操作步骤 */}
          <div className="space-y-3 mb-6">
            <div className="text-xs font-bold text-white/60 uppercase tracking-wider mb-2">
              操作步骤 Step by Step
            </div>
            {[
              {
                n: '01',
                title: `确认启动时间不晚于 ${result.latestStartDisplay}`,
                sub: '建议提前5分钟到场准备，预留操作时间',
              },
              {
                n: '02',
                title: '检查水泵阀门、电源、电控柜',
                sub: `铭牌流量 ${params.pumpFlowRate}${FLOW_LABEL[params.pumpFlowUnit]}，确认无异响`,
              },
              {
                n: '03',
                title: '点击「记录启动」→ 启泵 → 记录实际时间',
                sub: `预计 ${result.fillDurationDisplay} 后检查水位达到目标值`,
              },
              {
                n: '04',
                title: '到达目标后停泵 → 记录停止时间与最终水位',
                sub: `数据将用于优化下次估算精度，偏差通常 ±5%`,
              },
            ].map((step, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3.5 rounded-xl bg-white/5 hover:bg-white/10 transition border border-white/10"
              >
                <span className="shrink-0 w-10 h-10 rounded-lg bg-aqua-400/20 border border-aqua-400/30 flex items-center justify-center font-mono-digits font-bold text-aqua-200 text-sm">
                  {step.n}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{step.title}</div>
                  <div className="text-xs text-white/55 mt-0.5">{step.sub}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-white/30 mt-1" />
              </div>
            ))}
          </div>

          {/* 操作按钮 */}
          <div className="flex flex-col sm:flex-row gap-3">
            {runningRecord ? (
              <>
                <div className="flex-1 p-3 rounded-xl bg-white/10 border border-white/15 text-sm">
                  <div className="text-white/60 text-xs mb-1">进行中补水任务</div>
                  <div className="font-medium">
                    启动于{' '}
                    {runningRecord.actualStartTime
                      ? new Date(runningRecord.actualStartTime).toLocaleString('zh-CN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '待记录'}
                  </div>
                </div>
                <button
                  onClick={() => openRecordModal('stop', runningRecord.id)}
                  className="btn-danger flex-1 sm:flex-none shadow-lg animate-pulse-danger"
                >
                  <StopCircle className="w-5 h-5" />
                  <span>补水完成 · 记录停止</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleStart}
                className="btn-success flex-1 shadow-lg text-base"
              >
                <PlayCircle className="w-5 h-5" />
                <span>准备就绪 · 记录启动</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 关键指标快览 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniStat
          icon={<Droplets className="w-4 h-4" />}
          label="待补水量"
          value={formatLiters(result.requiredLiters)}
          sub={`目标 ${formatLiters(result.targetLiters)} - 当前 ${formatLiters(result.currentLiters)}`}
          color="#00B8D9"
        />
        <MiniStat
          icon={<CloudRain className="w-4 h-4" />}
          label="实际净流量"
          value={formatLpm(result.netFlowLpm)}
          sub={`标称 ${formatLpm(result.nominalFlowLpm)} × ${(1 - result.pipeLossRatio).toFixed(2)}`}
          color="#36B37E"
        />
        <MiniStat
          icon={<Timer className="w-4 h-4" />}
          label="管损流量"
          value={`${(result.pipeLossRatio * 100).toFixed(1)}%`}
          sub={`损失 ${formatLpm(result.pipeLossAmount)}`}
          color="#FF8B00"
          caution={result.pipeLossRatio > 0.25}
        />
        <MiniStat
          icon={<Droplets className="w-4 h-4" />}
          label="同耗抵消"
          value={formatLpm(result.concurrentUsageLpm)}
          sub={`占标称 ${((result.concurrentUsageLpm / Math.max(0.001, result.nominalFlowLpm)) * 100).toFixed(1)}%`}
          color="#FF5630"
          caution={result.warnings.excessiveUsage}
        />
      </div>
    </div>
  );
};

const MiniStat = ({
  icon,
  label,
  value,
  sub,
  color,
  caution,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: string;
  caution?: boolean;
}) => (
  <div
    className={`industrial-card p-4 transition-all ${caution ? 'ring-2 ring-status-warning/40' : ''}`}
  >
    <div className="flex items-center gap-2 mb-2">
      <span
        className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
        style={{ background: `linear-gradient(135deg, ${color}, ${color}99)` }}
      >
        {icon}
      </span>
      <span className="text-xs font-medium text-industrial-500">{label}</span>
    </div>
    <div className="font-mono-digits text-lg font-bold text-industrial-800 leading-none mb-1">
      {value}
    </div>
    <div className="text-[11px] text-industrial-400 leading-snug truncate" title={sub}>
      {sub}
    </div>
  </div>
);

const FLOW_LABEL: Record<string, string> = {
  lpm: ' L/min',
  lph: ' L/h',
  tph: ' t/h',
  cmh: ' m³/h',
};

export default EngineerView;
