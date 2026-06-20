import { History, Trash2, ChevronDown, ChevronUp, Clock, Play, Square, Droplets, Gauge, XCircle, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { useWaterStore } from '@/store/useWaterStore';
import type { FillHistoryRecord } from '@/types/water-tower';
import { VOLUME_UNIT_LABELS } from '@/types/water-tower';
import { formatLiters, formatLpm, formatDuration } from '@/utils/water-calc';
import { cn } from '@/lib/utils';

const HistoryTimeline = () => {
  const { history, clearHistory, deleteRecord, openRecordModal } = useWaterStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="industrial-card p-6 md:p-7 animate-fade-up stagger-6">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-industrial-600 to-industrial-800 flex items-center justify-center shadow-md">
            <History className="w-5 h-5 text-white" strokeWidth={2} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-industrial-800">补水历史记录</h3>
            <p className="text-xs text-industrial-400 mt-0.5">
              实际启停时间将反推真实流量，优化下次估算精度
            </p>
          </div>
          <span className="chip bg-industrial-50 text-industrial-600 border border-industrial-100">
            共 {history.length} 条
          </span>
        </div>
        {history.length > 0 && (
          <button
            onClick={() => {
              if (confirm('确定清空全部历史记录？此操作不可恢复。')) clearHistory();
            }}
            className="btn-outline !h-9 !px-3 text-xs border-status-danger/30 text-status-danger hover:bg-status-danger/5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            清空全部
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="relative">
          <div className="absolute left-6 top-2 bottom-2 w-0.5 bg-gradient-to-b from-aqua-300 via-industrial-200 to-industrial-100" />
          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
            {history.map((r, idx) => (
              <RecordItem
                key={r.id}
                index={idx}
                record={r}
                expanded={expandedId === r.id}
                onToggle={() => setExpandedId(expandedId === r.id ? null : r.id)}
                onDelete={() => {
                  if (confirm('确定删除此条记录？')) deleteRecord(r.id);
                }}
                onRecordStop={() => openRecordModal('stop', r.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const EmptyState = () => (
  <div className="relative py-16 text-center">
    <div className="w-20 h-20 mx-auto rounded-3xl bg-industrial-50 flex items-center justify-center mb-4 border-2 border-dashed border-industrial-200">
      <History className="w-9 h-9 text-industrial-300" />
    </div>
    <h4 className="font-medium text-industrial-600 mb-1">暂无补水记录</h4>
    <p className="text-sm text-industrial-400 max-w-sm mx-auto">
      完成首次补水后，记录实际启动与停止时间，系统将自动反推真实补水流量，用于优化后续估算。
    </p>
    <div className="mt-6 max-w-md mx-auto grid grid-cols-3 gap-3 text-left">
      <MiniTip n="01" t="启泵" d="点击「记录启动」按钮" />
      <MiniTip n="02" t="停泵" d="到达目标后记录停止" />
      <MiniTip n="03" t="优化" d="数据自动回写模型" />
    </div>
  </div>
);

const MiniTip = ({ n, t, d }: { n: string; t: string; d: string }) => (
  <div className="p-3 rounded-xl bg-industrial-50/50 border border-industrial-100">
    <div className="font-mono-digits text-xs font-bold text-aqua-500 mb-1">{n}</div>
    <div className="text-sm font-medium text-industrial-700 mb-0.5">{t}</div>
    <div className="text-[11px] text-industrial-400 leading-snug">{d}</div>
  </div>
);

interface RecordItemProps {
  record: FillHistoryRecord;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onRecordStop: () => void;
}

const RecordItem = ({ record, index, expanded, onToggle, onDelete, onRecordStop }: RecordItemProps) => {
  const statusMap = {
    running: {
      label: '进行中',
      color: 'bg-status-warning text-white',
      icon: <Play className="w-3 h-3" fill="currentColor" />,
    },
    completed: {
      label: '已完成',
      color: 'bg-status-success text-white',
      icon: <CheckCircle2 className="w-3 h-3" />,
    },
    cancelled: {
      label: '已取消',
      color: 'bg-industrial-400 text-white',
      icon: <XCircle className="w-3 h-3" />,
    },
  };
  const st = statusMap[record.status];

  return (
    <div className="relative pl-14 animate-fade-up" style={{ animationDelay: `${index * 50}ms` }}>
      {/* 时间轴圆点 */}
      <div
        className={cn(
          'absolute left-2.5 top-5 w-7 h-7 rounded-full border-4 flex items-center justify-center z-10',
          record.status === 'completed'
            ? 'bg-white border-status-success'
            : record.status === 'running'
            ? 'bg-white border-status-warning animate-pulse-danger'
            : 'bg-white border-industrial-300',
        )}
      >
        <div
          className={cn(
            'w-2 h-2 rounded-full',
            record.status === 'completed'
              ? 'bg-status-success'
              : record.status === 'running'
              ? 'bg-status-warning'
              : 'bg-industrial-300',
          )}
        />
      </div>

      <div className="industrial-card !rounded-xl overflow-hidden transition-all">
        <button
          onClick={onToggle}
          className="w-full text-left p-4 flex items-start gap-4 hover:bg-industrial-50/30 transition"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="font-mono-digits text-sm font-bold text-industrial-700">
                {new Date(record.createdAt).toLocaleDateString('zh-CN', {
                  month: '2-digit',
                  day: '2-digit',
                })}
              </span>
              <span className="font-mono-digits text-xs text-industrial-400">
                {new Date(record.createdAt).toLocaleTimeString('zh-CN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                创建
              </span>
              <span className={cn('chip !py-0.5 !text-[11px]', st.color)}>
                {st.icon}
                {st.label}
              </span>
              {record.engineerName && (
                <span className="chip bg-industrial-50 text-industrial-600 border border-industrial-100 !py-0.5 !text-[11px]">
                  👷 {record.engineerName}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
              <InfoPill icon={<Droplets className="w-3 h-3" />} label="补水" value={formatLiters(record.estimatedResult.requiredLiters)} color="#00B8D9" />
              <InfoPill icon={<Gauge className="w-3 h-3" />} label="估算流量" value={formatLpm(record.estimatedResult.netFlowLpm)} color="#16336B" />
              <InfoPill
                icon={<Clock className="w-3 h-3" />}
                label="估算耗时"
                value={formatDuration(record.estimatedResult.fillMinutesExact)}
                color="#36B37E"
              />
              {record.actualFillMinutes != null && record.status === 'completed' ? (
                <InfoPill
                  icon={<Square className="w-3 h-3" fill="currentColor" />}
                  label="实际耗时"
                  value={formatDuration(record.actualFillMinutes)}
                  color="#FF5630"
                  highlight={Math.abs(record.actualFillMinutes - record.estimatedResult.fillMinutesExact) / record.estimatedResult.fillMinutesExact > 0.1}
                />
              ) : (
                <InfoPill
                  icon={<Clock className="w-3 h-3" />}
                  label="建议启动"
                  value={record.estimatedResult.latestStartDisplay}
                  color="#FFAB00"
                />
              )}
            </div>

            {record.status === 'completed' && record.estimateAccuracyPct != null && (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-industrial-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, record.estimateAccuracyPct)}%`,
                      background:
                        record.estimateAccuracyPct >= 90
                          ? 'linear-gradient(90deg, #36B37E, #00875A)'
                          : record.estimateAccuracyPct >= 75
                          ? 'linear-gradient(90deg, #FFAB00, #FF8B00)'
                          : 'linear-gradient(90deg, #FF5630, #DE350B)',
                    }}
                  />
                </div>
                <span className="font-mono-digits text-xs font-bold text-industrial-600 w-12 text-right">
                  {record.estimateAccuracyPct.toFixed(0)}%
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className="p-1 rounded-lg hover:bg-industrial-100 transition">
              {expanded ? (
                <ChevronUp className="w-4 h-4 text-industrial-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-industrial-400" />
              )}
            </div>
          </div>
        </button>

        {/* 展开详情 */}
        {expanded && (
          <div className="px-4 pb-4 pt-0 border-t border-industrial-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <DetailBlock title="时间明细">
                <DetailRow label="参数创建" value={formatTS(record.createdAt)} />
                <DetailRow label="实际启动" value={record.actualStartTime ? formatTS(record.actualStartTime) : '—'} />
                <DetailRow label="实际停止" value={record.actualStopTime ? formatTS(record.actualStopTime) : '—'} />
                <DetailRow
                  label="实际耗时"
                  value={
                    record.actualFillMinutes != null
                      ? formatDuration(record.actualFillMinutes)
                      : '—'
                  }
                />
              </DetailBlock>
              <DetailBlock title="真实流量反推">
                <DetailRow
                  label="真实净流量"
                  value={record.actualFlowLpm != null ? formatLpm(record.actualFlowLpm) : '—'}
                />
                <DetailRow
                  label="估算净流量"
                  value={formatLpm(record.estimatedResult.netFlowLpm)}
                />
                <DetailRow
                  label="流量偏差"
                  value={
                    record.actualFlowLpm != null
                      ? `${(((record.actualFlowLpm - record.estimatedResult.netFlowLpm) / record.estimatedResult.netFlowLpm) * 100).toFixed(1)}%`
                      : '—'
                  }
                />
                <DetailRow
                  label="估算准确度"
                  value={
                    record.estimateAccuracyPct != null
                      ? `${record.estimateAccuracyPct.toFixed(1)}%`
                      : '—'
                  }
                />
              </DetailBlock>
              <DetailBlock title="最终水位验证">
                <DetailRow
                  label="停止时水位"
                  value={
                    record.actualStopLevel != null
                      ? `${record.actualStopLevel}${record.actualStopLevelType === 'percent' ? '%' : ' ' + VOLUME_UNIT_LABELS[record.actualStopLevelUnit || 'ton']}`
                      : '—'
                  }
                />
              </DetailBlock>
              <DetailBlock title="备注与操作">
                <DetailRow label="备注" value={record.notes || '—'} />
                <div className="flex gap-2 mt-2">
                  {record.status === 'running' && (
                    <button onClick={onRecordStop} className="btn-danger !h-9 !px-3 text-xs flex-1">
                      <Square className="w-3.5 h-3.5" fill="currentColor" />
                      记录停止
                    </button>
                  )}
                  <button
                    onClick={onDelete}
                    className="btn-outline !h-9 !px-3 text-xs border-status-danger/30 text-status-danger hover:bg-status-danger/5 flex-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    删除
                  </button>
                </div>
              </DetailBlock>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const InfoPill = ({
  icon,
  label,
  value,
  color,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  highlight?: boolean;
}) => (
  <div
    className={cn(
      'p-2 rounded-lg border transition-all',
      highlight ? 'bg-status-warning/10 border-status-warning/30' : 'bg-industrial-50/50 border-industrial-100',
    )}
  >
    <div className="flex items-center gap-1 text-[10px] text-industrial-400 mb-0.5">
      <span style={{ color }}>{icon}</span>
      <span>{label}</span>
    </div>
    <div className="font-mono-digits text-xs font-bold text-industrial-700 truncate" title={value}>
      {value}
    </div>
  </div>
);

const DetailBlock = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="p-3 rounded-xl bg-industrial-50/50 border border-industrial-100">
    <div className="text-[10px] font-bold text-industrial-400 uppercase tracking-wider mb-2">
      {title}
    </div>
    <div className="space-y-1.5">{children}</div>
  </div>
);

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between text-xs gap-3">
    <span className="text-industrial-400 shrink-0">{label}</span>
    <span className="font-mono-digits text-industrial-700 font-medium text-right truncate">
      {value}
    </span>
  </div>
);

const formatTS = (ts: number) =>
  new Date(ts).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

export default HistoryTimeline;
