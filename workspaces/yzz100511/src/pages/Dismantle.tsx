import { useState } from 'react';
import {
  Zap,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  Download,
  Power,
  MapPin,
  Calendar,
  User,
  RefreshCw,
  FileCheck,
} from 'lucide-react';
import { useApprovalStore } from '../store/useApprovalStore';
import { useMallStore } from '../store/useMallStore';
import { cn } from '../lib/utils';
import type { PowerCheckpoint } from '../types';

export default function Dismantle() {
  const { powerCheckpoints, updatePowerCheckpoint, generateDismantleReport } = useApprovalStore();
  const { config } = useMallStore();
  const [selectedApprovalId, setSelectedApprovalId] = useState<string | null>(null);
  const [dismantleInfo, setDismantleInfo] = useState({
    date: new Date().toISOString().split('T')[0],
    operator: '',
    supervisor: '',
  });

  const checkedCount = powerCheckpoints.filter((p) => p.status === 'checked').length;
  const remainingCount = powerCheckpoints.filter((p) => p.status !== 'checked').length;
  const hasIssue = powerCheckpoints.some((p) => p.status === 'issue');
  const progress = powerCheckpoints.length > 0 ? (checkedCount / powerCheckpoints.length) * 100 : 0;

  const handleToggleStatus = (id: string) => {
    const checkpoint = powerCheckpoints.find((p) => p.id === id);
    if (!checkpoint) return;

    const statusOrder: Array<PowerCheckpoint['status']> = ['pending', 'checked', 'issue'];
    const currentIndex = statusOrder.indexOf(checkpoint.status);
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];

    updatePowerCheckpoint(id, {
      status: nextStatus,
      checkedAt: nextStatus === 'checked' || nextStatus === 'issue' ? new Date().toISOString() : undefined,
      checkedBy: nextStatus === 'checked' || nextStatus === 'issue' ? dismantleInfo.operator || '操作员' : undefined,
    });
  };

  const handleAddNote = (id: string, note: string) => {
    updatePowerCheckpoint(id, { notes: note });
  };

  const handleReset = () => {
    if (confirm('确定要重置所有电源点的核对状态吗？')) {
      powerCheckpoints.forEach((p) => {
        updatePowerCheckpoint(p.id, {
          status: 'pending',
          checkedAt: undefined,
          checkedBy: undefined,
          notes: '',
        });
      });
    }
  };

  const statusConfig = {
    pending: { label: '待核对', color: 'text-slate-400 bg-slate-500/20', icon: Circle },
    checked: { label: '已确认', color: 'text-emerald-400 bg-emerald-500/20', icon: CheckCircle2 },
    issue: { label: '有问题', color: 'text-red-400 bg-red-500/20', icon: AlertTriangle },
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">撤展管理</h1>
            <p className="text-slate-400">撤展时核对每个电源点，确保安全断电和设备回收</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-colors border border-slate-700"
            >
              <RefreshCw className="w-5 h-5" />
              重置状态
            </button>
            <button
              onClick={() => generateDismantleReport(dismantleInfo, powerCheckpoints)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-medium rounded-xl transition-all duration-200 shadow-lg shadow-blue-600/30"
            >
              <Download className="w-5 h-5" />
              导出撤展报告
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-white mb-1">电源点核对进度</h2>
                  <p className="text-sm text-slate-400">点击电源点卡片切换核对状态</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-white">{progress.toFixed(0)}%</p>
                  <p className="text-sm text-slate-400">
                    {checkedCount}/{powerCheckpoints.length} 已完成
                  </p>
                </div>
              </div>

              <div className="h-3 bg-slate-800 rounded-full overflow-hidden mb-6">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                {powerCheckpoints.map((checkpoint) => {
                  const StatusIcon = statusConfig[checkpoint.status].icon;
                  const isSelected = selectedApprovalId === checkpoint.id;

                  return (
                    <div
                      key={checkpoint.id}
                      onClick={() => handleToggleStatus(checkpoint.id)}
                      className={cn(
                        'rounded-xl border-2 p-4 cursor-pointer transition-all duration-200',
                        checkpoint.status === 'checked'
                          ? 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/60'
                          : checkpoint.status === 'issue'
                          ? 'bg-red-500/10 border-red-500/30 hover:border-red-500/60'
                          : 'bg-slate-800/50 border-slate-700 hover:border-slate-600',
                        isSelected && 'ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-900'
                      )}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                          <Zap
                            className={cn(
                              'w-5 h-5',
                              checkpoint.status === 'checked'
                                ? 'text-emerald-400'
                                : checkpoint.status === 'issue'
                                ? 'text-red-400'
                                : 'text-slate-500'
                            )}
                          />
                        </div>
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1',
                            statusConfig[checkpoint.status].color
                          )}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig[checkpoint.status].label}
                        </span>
                      </div>

                      <h3 className="text-white font-medium mb-1">{checkpoint.name}</h3>
                      <p className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        位置: ({checkpoint.position[0].toFixed(1)}, {checkpoint.position[2].toFixed(1)})
                      </p>

                      {checkpoint.connectedObject && (
                        <p className="text-xs text-slate-500 truncate">
                          连接: {checkpoint.connectedObject}
                        </p>
                      )}

                      {checkpoint.checkedAt && (
                        <div className="mt-3 pt-3 border-t border-slate-700">
                          <p className="text-xs text-slate-500">
                            <Clock className="w-3 h-3 inline mr-1" />
                            {new Date(checkpoint.checkedAt).toLocaleString('zh-CN')}
                          </p>
                          {checkpoint.checkedBy && (
                            <p className="text-xs text-slate-500">
                              <User className="w-3 h-3 inline mr-1" />
                              {checkpoint.checkedBy}
                            </p>
                          )}
                        </div>
                      )}

                      {checkpoint.status === 'issue' && (
                        <div className="mt-3">
                          <input
                            type="text"
                            placeholder="记录问题..."
                            value={checkpoint.notes || ''}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleAddNote(checkpoint.id, e.target.value);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full px-2 py-1.5 bg-slate-900 border border-red-500/30 rounded-lg text-white text-xs placeholder-slate-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/30 outline-none"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-purple-400" />
                撤展确认单
              </h2>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">撤展日期</label>
                  <input
                    type="date"
                    value={dismantleInfo.date}
                    onChange={(e) => setDismantleInfo({ ...dismantleInfo, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">操作员</label>
                  <input
                    type="text"
                    value={dismantleInfo.operator}
                    onChange={(e) => setDismantleInfo({ ...dismantleInfo, operator: e.target.value })}
                    placeholder="操作员姓名"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">现场负责人</label>
                  <input
                    type="text"
                    value={dismantleInfo.supervisor}
                    onChange={(e) => setDismantleInfo({ ...dismantleInfo, supervisor: e.target.value })}
                    placeholder="负责人姓名"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-xl p-4">
                <h3 className="text-sm font-medium text-white mb-3">撤展核对清单</h3>
                <div className="space-y-3">
                  {[
                    { label: '所有电源点已断电并确认', key: 'power' },
                    { label: '所有展具已拆除并清场', key: 'exhibits' },
                    { label: '消防通道已恢复畅通', key: 'fire' },
                    { label: '地面无损坏和垃圾遗留', key: 'clean' },
                    { label: '物业现场验收通过', key: 'accept' },
                  ].map((item, index) => {
                    const isChecked = index < (progress === 100 ? 5 : Math.floor((progress / 100) * 5));
                    return (
                      <div key={item.key} className="flex items-center gap-3">
                        <div
                          className={cn(
                            'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                            isChecked
                              ? 'bg-emerald-500 border-emerald-500'
                              : 'border-slate-600'
                          )}
                        >
                          {isChecked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <span
                          className={cn(
                            'text-sm',
                            isChecked ? 'text-emerald-400' : 'text-slate-400'
                          )}
                        >
                          {item.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6 sticky top-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Power className="w-5 h-5 text-yellow-400" />
                电源分布图例
              </h2>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm text-white">已确认</p>
                    <p className="text-xs text-slate-500">电源已安全断开</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center">
                    <Circle className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm text-white">待核对</p>
                    <p className="text-xs text-slate-500">等待检查确认</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm text-white">有问题</p>
                    <p className="text-xs text-slate-500">存在异常需处理</p>
                  </div>
                </div>
              </div>

              {hasIssue && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
                  <p className="text-sm text-red-400 font-medium mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    存在待处理问题
                  </p>
                  <p className="text-xs text-slate-400">
                    有 {powerCheckpoints.filter((p) => p.status === 'issue').length} 个电源点存在问题，需处理后才能完成撤展
                  </p>
                </div>
              )}

              {remainingCount > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
                  <p className="text-sm text-amber-400 font-medium mb-2 flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    核对进行中
                  </p>
                  <p className="text-xs text-slate-400">
                    还有 {remainingCount} 个电源点等待核对
                  </p>
                </div>
              )}

              {progress === 100 && !hasIssue && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-6">
                  <p className="text-sm text-emerald-400 font-medium mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    核对完成
                  </p>
                  <p className="text-xs text-slate-400">
                    所有电源点已核对完成，可以导出撤展报告
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <h3 className="text-sm font-medium text-slate-300">操作指南</h3>
                <div className="space-y-2 text-xs text-slate-400">
                  <p>1. 点击电源点卡片切换核对状态</p>
                  <p>2. 状态顺序：待核对 → 已确认 → 有问题</p>
                  <p>3. 标记为"有问题"时可输入备注</p>
                  <p>4. 所有电源点确认后导出撤展报告</p>
                  <p>5. 报告需双方签字留存备案</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
