import { useState, useEffect, useMemo } from 'react';
import { X, Clock, Play, Square, Droplets, User, FileText, BadgeCheck } from 'lucide-react';
import { useWaterStore } from '@/store/useWaterStore';
import ParamInput, { UnitSelect } from './ParamInput';
import type { VolumeUnit, FillHistoryRecord } from '@/types/water-tower';
import { VOLUME_UNIT_LABELS, FLOW_UNIT_LABELS } from '@/types/water-tower';
import { toLiters, formatLiters, formatDuration, formatLpm } from '@/utils/water-calc';
import { cn } from '@/lib/utils';

const toDateTimeLocal = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const fromDateTimeLocal = (str: string) => (str ? new Date(str) : null);

const volumeOptions = Object.entries(VOLUME_UNIT_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const RecordModal = () => {
  const {
    showRecordModal,
    recordModalMode,
    pendingRecordId,
    history,
    closeRecordModal,
    updateRecordStartTime,
    updateRecordStopTime,
  } = useWaterStore();

  const record = useMemo<FillHistoryRecord | undefined>(
    () => history.find((r) => r.id === pendingRecordId),
    [history, pendingRecordId],
  );

  // 表单状态
  const [engineerName, setEngineerName] = useState('');
  const [startTime, setStartTime] = useState(toDateTimeLocal(new Date()));

  const [stopTime, setStopTime] = useState(toDateTimeLocal(new Date()));
  const [stopLevel, setStopLevel] = useState(90);
  const [stopLevelType, setStopLevelType] = useState<'percent' | 'volume'>('percent');
  const [stopLevelUnit, setStopLevelUnit] = useState<VolumeUnit>('ton');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!showRecordModal) return;
    setStartTime(toDateTimeLocal(new Date()));
    setStopTime(toDateTimeLocal(new Date()));
    if (record) {
      setEngineerName(record.engineerName);
      if (record.paramsSnapshot) {
        setStopLevelType(record.paramsSnapshot.targetLevelType);
        setStopLevelUnit(record.paramsSnapshot.targetLevelUnit);
        setStopLevel(record.paramsSnapshot.targetWaterLevel);
      }
    }
  }, [showRecordModal, record]);

  if (!showRecordModal || !record) return null;

  const isStartMode = recordModalMode === 'start';

  const handleConfirm = () => {
    if (isStartMode) {
      const t = fromDateTimeLocal(startTime);
      if (!t || !engineerName.trim()) {
        alert('请填写启动时间与值班工程师姓名');
        return;
      }
      updateRecordStartTime(record.id, t.getTime(), engineerName.trim());
    } else {
      const stop = fromDateTimeLocal(stopTime);
      const start = record.actualStartTime ? new Date(record.actualStartTime) : null;
      if (!stop) {
        alert('请选择实际停止时间');
        return;
      }
      if (start && stop.getTime() <= start.getTime()) {
        alert('停止时间必须晚于启动时间');
        return;
      }
      const tankL = toLiters(
        record.paramsSnapshot.tankCapacity,
        record.paramsSnapshot.tankCapacityUnit,
      );
      const targetL =
        stopLevelType === 'percent'
          ? (stopLevel / 100) * tankL
          : toLiters(stopLevel, stopLevelUnit);
      const startL =
        record.paramsSnapshot.currentLevelType === 'percent'
          ? (record.paramsSnapshot.currentWaterLevel / 100) * tankL
          : toLiters(
              record.paramsSnapshot.currentWaterLevel,
              record.paramsSnapshot.currentLevelUnit,
            );
      const realLiters = Math.max(0, targetL - startL);
      const startTs = start ? start.getTime() : record.createdAt;
      const minutes = Math.max(0.1, (stop.getTime() - startTs) / 60000);
      const actualFlowLpm = realLiters / minutes;
      const est = record.estimatedResult.fillMinutesExact;
      const accuracy = Math.max(0, 100 - Math.abs(minutes - est) / est * 100);
      updateRecordStopTime(
        record.id,
        stop.getTime(),
        stopLevel,
        stopLevelType,
        stopLevelUnit,
        notes.trim(),
        minutes,
        actualFlowLpm,
        accuracy,
      );
    }
  };

  // 预览计算
  const previewStop = isStartMode
    ? null
    : (() => {
        const stop = fromDateTimeLocal(stopTime);
        const start = record.actualStartTime ? new Date(record.actualStartTime) : null;
        const tankL = toLiters(
          record.paramsSnapshot.tankCapacity,
          record.paramsSnapshot.tankCapacityUnit,
        );
        const startL =
          record.paramsSnapshot.currentLevelType === 'percent'
            ? (record.paramsSnapshot.currentWaterLevel / 100) * tankL
            : toLiters(
                record.paramsSnapshot.currentWaterLevel,
                record.paramsSnapshot.currentLevelUnit,
              );
        const targetL =
          stopLevelType === 'percent'
            ? (stopLevel / 100) * tankL
            : toLiters(stopLevel, stopLevelUnit);
        if (!stop || !start || stop.getTime() <= start.getTime()) return null;
        const realLiters = Math.max(0, targetL - startL);
        const minutes = Math.max(0.1, (stop.getTime() - start.getTime()) / 60000);
        const flow = realLiters / minutes;
        const est = record.estimatedResult.fillMinutesExact;
        const acc = Math.max(0, 100 - Math.abs(minutes - est) / est * 100);
        return { realLiters, minutes, flow, acc };
      })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-up">
      <div
        className="absolute inset-0 bg-industrial-900/60 backdrop-blur-sm"
        onClick={closeRecordModal}
      />
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-fade-up stagger-2">
        {/* 头部 */}
        <div
          className={cn(
            'p-6 text-white relative overflow-hidden',
            isStartMode ? 'bg-success-gradient' : 'bg-industrial-gradient',
          )}
        >
          <button
            onClick={closeRecordModal}
            className="absolute top-4 right-4 w-9 h-9 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur border border-white/20 flex items-center justify-center">
              {isStartMode ? (
                <Play className="w-5 h-5" fill="currentColor" />
              ) : (
                <Square className="w-5 h-5" fill="currentColor" />
              )}
            </div>
            <div>
              <h3 className="text-xl font-bold">
                {isStartMode ? '记录水泵启动时间' : '记录补水完成 & 停泵'}
              </h3>
              <p className="text-xs text-white/70 mt-0.5">
                {isStartMode
                  ? '时间默认填入此刻，可调整为实际启泵时刻'
                  : '填写停止时间与最终水位，系统反推真实流量'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-5">
          {isStartMode ? (
            <>
              <div className="space-y-4">
                <ParamInput
                  label="实际启动时间"
                  icon={<Clock className="w-3.5 h-3.5" />}
                  hint="建议精确到分钟"
                  accentColor="#00875A"
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
                <ParamInput
                  label="值班工程师"
                  icon={<User className="w-3.5 h-3.5" />}
                  hint="姓名或工号"
                  accentColor="#16336B"
                  value={engineerName}
                  onChange={(e) => setEngineerName(e.target.value)}
                  placeholder="例：王师傅 / 00123"
                />
              </div>
              <div className="p-4 rounded-xl bg-aqua-50 border border-aqua-100 text-sm text-industrial-600 flex gap-3">
                <BadgeCheck className="w-5 h-5 text-aqua-500 shrink-0 mt-0.5" />
                <div>
                  本次计划：
                  <span className="font-bold text-industrial-800 mx-1">
                    补 {formatLiters(record.estimatedResult.requiredLiters)}
                  </span>
                  ·
                  <span className="font-bold text-industrial-800 mx-1">
                    预计耗时 {formatDuration(record.estimatedResult.fillMinutesExact)}
                  </span>
                  ·
                  <span className="mx-1">建议最晚</span>
                  <span className="font-bold text-aqua-600">
                    {record.estimatedResult.latestStartDisplay}
                  </span>
                  <span className="ml-1">前启动</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <ParamInput
                label="实际停止时间"
                icon={<Clock className="w-3.5 h-3.5" />}
                hint="停泵时间，默认填入此刻"
                accentColor="#FF5630"
                type="datetime-local"
                value={stopTime}
                onChange={(e) => setStopTime(e.target.value)}
              />

              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-industrial-700">
                    <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-aqua-500 to-aqua-700 flex items-center justify-center text-white shadow-sm">
                      <Droplets className="w-3.5 h-3.5" />
                    </span>
                    停止时实际水位
                  </label>
                  <span className="text-xs text-industrial-400">用于反推真实补水量</span>
                </div>
                <ParamInput
                  label=""
                  icon={<Droplets className="w-3.5 h-3.5" />}
                  accentColor="#007A96"
                  type="number"
                  min={0}
                  max={stopLevelType === 'percent' ? 100 : undefined}
                  step="any"
                  value={stopLevel}
                  onChange={(e) => setStopLevel(parseFloat(e.target.value) || 0)}
                />
                <div className="flex items-center gap-2">
                  <div className="flex p-1 rounded-lg bg-industrial-50 border border-industrial-100 flex-1">
                    <button
                      onClick={() => setStopLevelType('percent')}
                      className={cn(
                        'flex-1 h-9 rounded-md text-xs font-medium transition-all',
                        stopLevelType === 'percent'
                          ? 'bg-white text-industrial-700 shadow-sm border border-industrial-100'
                          : 'text-industrial-400 hover:text-industrial-600',
                      )}
                    >
                      按百分比 %
                    </button>
                    <button
                      onClick={() => setStopLevelType('volume')}
                      className={cn(
                        'flex-1 h-9 rounded-md text-xs font-medium transition-all',
                        stopLevelType === 'volume'
                          ? 'bg-white text-industrial-700 shadow-sm border border-industrial-100'
                          : 'text-industrial-400 hover:text-industrial-600',
                      )}
                    >
                      按体积
                    </button>
                  </div>
                  {stopLevelType === 'volume' && (
                    <UnitSelect
                      value={stopLevelUnit}
                      onChange={(e) => setStopLevelUnit(e.target.value as VolumeUnit)}
                      options={volumeOptions}
                      className="!h-9 text-xs"
                    />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-industrial-700">
                  <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-industrial-500 to-industrial-700 flex items-center justify-center text-white shadow-sm">
                    <FileText className="w-3.5 h-3.5" />
                  </span>
                  备注（可选）
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="例：水压稳定、无异常、中途曾短暂停泵5分钟..."
                  className="w-full px-4 py-3 rounded-xl border-2 border-industrial-100 bg-white text-industrial-700 text-sm outline-none transition-all focus:border-aqua-400 focus:shadow-glow-sm resize-none"
                />
              </div>

              {/* 预览 */}
              {previewStop ? (
                <div className="space-y-2 p-4 rounded-2xl bg-gradient-to-br from-industrial-50 via-aqua-50/50 to-white border border-industrial-100">
                  <div className="text-[11px] font-bold text-industrial-500 uppercase tracking-wider flex items-center gap-1.5">
                    <BadgeCheck className="w-3.5 h-3.5 text-aqua-500" />
                    系统将计算（确认后保存）
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Preview label="实际耗时" value={formatDuration(previewStop.minutes)} />
                    <Preview label="实际净流量" value={formatLpm(previewStop.flow)} />
                    <Preview label="实际补水量" value={formatLiters(previewStop.realLiters)} />
                    <Preview
                      label="估算准确度"
                      value={`${previewStop.acc.toFixed(1)}%`}
                      color={
                        previewStop.acc >= 90
                          ? '#36B37E'
                          : previewStop.acc >= 75
                          ? '#FFAB00'
                          : '#FF5630'
                      }
                    />
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-status-warning/5 border border-status-warning/20 text-xs text-status-warning flex gap-2 items-start">
                  <BadgeCheck className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>请填写有效的停止时间（必须晚于启动时间）后才能预览计算结果。</span>
                </div>
              )}

              <div className="text-xs text-industrial-400 flex gap-2">
                <span className="chip bg-industrial-50 text-industrial-500 border border-industrial-100 !py-0.5">
                  参考：原估算流量 {formatLpm(record.estimatedResult.netFlowLpm)}
                </span>
                <span className="chip bg-industrial-50 text-industrial-500 border border-industrial-100 !py-0.5">
                  原目标 {record.paramsSnapshot.targetWaterLevel}
                  {record.paramsSnapshot.targetLevelType === 'percent'
                    ? '%'
                    : ' ' + VOLUME_UNIT_LABELS[record.paramsSnapshot.targetLevelUnit]}
                </span>
              </div>
            </>
          )}
        </div>

        {/* 底部操作 */}
        <div className="p-5 border-t border-industrial-50 bg-industrial-50/30 flex flex-col sm:flex-row gap-3">
          <button
            onClick={closeRecordModal}
            className="btn-outline border-industrial-200 text-industrial-600 hover:bg-white flex-1"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className={cn('flex-1', isStartMode ? 'btn-success' : 'btn-primary')}
          >
            {isStartMode ? (
              <>
                <Play className="w-4 h-4" fill="currentColor" />
                <span>确认启动记录</span>
              </>
            ) : (
              <>
                <Square className="w-4 h-4" fill="currentColor" />
                <span>保存并完成</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const Preview = ({ label, value, color }: { label: string; value: string; color?: string }) => (
  <div className="p-2.5 rounded-lg bg-white border border-industrial-100">
    <div className="text-[10px] text-industrial-400 mb-0.5">{label}</div>
    <div
      className="font-mono-digits text-sm font-bold leading-none"
      style={{ color: color || '#0A2540' }}
    >
      {value}
    </div>
  </div>
);

export default RecordModal;
