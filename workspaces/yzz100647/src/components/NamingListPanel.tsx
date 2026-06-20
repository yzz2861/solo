import { useComplaintStore } from '@/store/complaintStore';
import {
  MATERIAL_TYPE_LABELS, GAP_STATUS_LABELS, GapStatus, MaterialGap,
} from '@/types';
import { formatFileSize } from '@/utils/namingGenerator';
import {
  ListOrdered, AlertTriangle, CheckSquare, Square, XOctagon, Copy, Eye,
  FileWarning, PackageCheck, ClipboardCheck,
} from 'lucide-react';
import { useState } from 'react';

export default function NamingListPanel() {
  const cmp = useComplaintStore((s) => s.getComplaint());
  const overrideFileName = useComplaintStore((s) => s.overrideFileName);
  const setGapStatus = useComplaintStore((s) => s.setGapStatus);
  const fileNameOverrides = useComplaintStore((s) => s.fileNameOverrides);

  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'naming' | 'gaps'>('naming');

  if (!cmp) return null;

  const copyName = (idx: number, name: string) => {
    navigator.clipboard?.writeText(name);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1200);
  };

  const missingCount = cmp.materialGaps.filter((g) => g.status === GapStatus.MISSING).length;
  const requiredMissing = cmp.materialGaps.filter(
    (g) => g.status === GapStatus.MISSING && g.isRequired,
  ).length;

  return (
    <div className="card flex flex-col h-full min-h-0 animate-fade-in">
      <div className="card-header">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50">
            <ListOrdered className="h-4.5 w-4.5 text-brand-700" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-zinc-900">命名清单 & 材料检查</h2>
            <p className="text-[11px] text-zinc-500">质检可见文件名 · 可回溯原始附件</p>
          </div>
        </div>
        <div className="flex gap-1 rounded-lg bg-zinc-100 p-1">
          <button
            onClick={() => setActiveTab('naming')}
            className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'naming'
                ? 'bg-white text-brand-700 shadow-soft'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <ClipboardCheck className="h-3.5 w-3.5" />
            命名清单
            <span className="chip bg-zinc-100 px-1.5 text-[10px] text-zinc-600">{cmp.namingList.length}</span>
          </button>
          <button
            onClick={() => setActiveTab('gaps')}
            className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'gaps'
                ? 'bg-white text-brand-700 shadow-soft'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <FileWarning className="h-3.5 w-3.5" />
            缺失材料
            {missingCount > 0 && (
              <span className={`chip px-1.5 text-[10px] ${requiredMissing > 0 ? 'bg-danger-100 text-danger-700' : 'bg-warn-100 text-warn-700'}`}>
                {missingCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 scroll-y p-4 pt-3 min-h-0">
        {activeTab === 'naming' && (
          cmp.namingList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 mb-3">
                <PackageCheck className="h-6 w-6 text-zinc-400" />
              </div>
              <p className="text-sm font-medium text-zinc-600 mb-1">暂无命名结果</p>
              <p className="text-[12px] text-zinc-400 max-w-xs">
                上传附件后将自动按「序号-材料类型-订单号」生成规范文件名
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm px-2 py-2 border-b border-zinc-100 mb-2">
                <div className="grid grid-cols-12 gap-2 text-[10.5px] font-semibold uppercase tracking-wider text-zinc-400">
                  <div className="col-span-1 text-center">#</div>
                  <div className="col-span-6">新文件名（质检可见）</div>
                  <div className="col-span-3">材料类型 / 订单号</div>
                  <div className="col-span-2 text-right">操作</div>
                </div>
              </div>
              {cmp.namingList
                .sort((a, b) => a.sequence - b.sequence)
                .map((item, idx) => {
                  const hasCustomName = !!fileNameOverrides[item.attachmentId];
                  const att = cmp.attachments.find((a) => a.id === item.attachmentId);
                  return (
                    <div
                      key={item.attachmentId}
                      className="group grid grid-cols-12 gap-2 items-center px-2 py-2 rounded-lg hover:bg-zinc-50 transition-colors animate-fade-in"
                      style={{ animationDelay: `${idx * 15}ms` }}
                    >
                      <div className="col-span-1 text-center">
                        <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-brand-700 text-[12px] font-bold text-white tabular-nums shadow-soft">
                          {item.sequence}
                        </div>
                      </div>
                      <div className="col-span-6 min-w-0">
                        <div className="flex items-center gap-1.5">
                          {hasCustomName && (
                            <span className="chip bg-warn-50 text-warn-600 border border-warn-200 text-[9.5px]">自定义</span>
                          )}
                          <input
                            defaultValue={item.newFileName}
                            onBlur={(e) => {
                              overrideFileName(
                                item.attachmentId,
                                e.target.value === item.newFileName ? null : e.target.value,
                              );
                            }}
                            className="w-full truncate font-mono text-[12.5px] font-semibold text-zinc-800 bg-transparent px-1.5 py-1 rounded border border-transparent hover:border-zinc-200 focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100 transition-all outline-none"
                          />
                        </div>
                        <div className="mt-0.5 pl-1.5 flex items-center gap-1.5 text-[10.5px] text-zinc-400">
                          <Eye className="h-3 w-3" />
                          <span className="truncate" title={`原文件：${item.originalName}`}>
                            原: {item.originalName}
                          </span>
                          <span className="shrink-0">· {formatFileSize(item.fileSize)}</span>
                        </div>
                      </div>
                      <div className="col-span-3 space-y-1 pl-1 border-l border-zinc-100">
                        <div className="text-[11.5px] font-medium text-zinc-700 flex items-center gap-1">
                          <span className={`inline-block h-1.5 w-1.5 rounded-full ${
                            item.materialType === 'UNKNOWN' ? 'bg-zinc-300' : 'bg-brand-500'
                          }`} />
                          {MATERIAL_TYPE_LABELS[item.materialType]}
                        </div>
                        <div className="font-mono text-[10.5px] text-zinc-500 truncate">
                          {item.orderNo || <span className="text-zinc-300">（无订单号）</span>}
                        </div>
                        <div className="text-[10px] text-zinc-300">
                          ID: {att?.id.slice(4, 10)}
                        </div>
                      </div>
                      <div className="col-span-2 flex justify-end gap-0.5 opacity-70 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => copyName(idx, item.newFileName)}
                          className="p-1.5 rounded text-zinc-400 hover:bg-brand-50 hover:text-brand-700 transition-colors"
                          title="复制新文件名"
                        >
                          {copiedIdx === idx ? (
                            <CheckSquare className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )
        )}

        {activeTab === 'gaps' && (
          cmp.materialGaps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <AlertTriangle className="h-10 w-10 text-zinc-300 mb-2" />
              <p className="text-sm text-zinc-500">请先选择投诉场景</p>
            </div>
          ) : (
            <div className="space-y-2">
              {requiredMissing > 0 && (
                <div className="rounded-xl border-2 border-danger-200 bg-danger-50/60 p-3.5 mb-3 animate-fade-in">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="h-4.5 w-4.5 text-danger-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-[13px] font-semibold text-danger-800">
                        有 {requiredMissing} 项必备材料尚未提供
                      </h4>
                      <p className="text-[11.5px] text-danger-600/90 mt-0.5">
                        缺少这些材料可能导致质检无法审核或被退回。请联系客户补充或标记"无需提供"。
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {cmp.materialGaps.map((gap) => (
                <GapRow key={gap.id} gap={gap} onChange={(st) => setGapStatus(gap.id, st)} />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

function GapRow({ gap, onChange }: { gap: MaterialGap; onChange: (s: GapStatus) => void }) {
  const statusStyle = {
    [GapStatus.MISSING]: gap.isRequired
      ? 'border-danger-200 bg-white hover:border-danger-300'
      : 'border-warn-200 bg-white/80 hover:border-warn-300',
    [GapStatus.MARKED_PROVIDED]: 'border-emerald-200 bg-emerald-50/50',
    [GapStatus.WAIVED]: 'border-zinc-200 bg-zinc-50',
  }[gap.status];

  const iconStyle = {
    [GapStatus.MISSING]: gap.isRequired ? 'text-danger-500' : 'text-warn-500',
    [GapStatus.MARKED_PROVIDED]: 'text-emerald-500',
    [GapStatus.WAIVED]: 'text-zinc-400',
  }[gap.status];

  return (
    <div className={`rounded-xl border p-3 transition-all ${statusStyle} animate-slide-in`}>
      <div className="flex items-start gap-2.5">
        <button
          onClick={() => onChange(gap.status === GapStatus.MARKED_PROVIDED ? GapStatus.MISSING : GapStatus.MARKED_PROVIDED)}
          className={`mt-0.5 shrink-0 transition-colors ${iconStyle}`}
        >
          {gap.status === GapStatus.MARKED_PROVIDED ? (
            <CheckSquare className="h-4.5 w-4.5" />
          ) : (
            <Square className="h-4.5 w-4.5" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className={`text-[13px] font-semibold ${
              gap.status === GapStatus.WAIVED ? 'line-through text-zinc-400' : 'text-zinc-800'
            }`}>
              {gap.materialName}
            </h4>
            {gap.isRequired && (
              <span className={`chip text-[10px] ${gap.status === GapStatus.MISSING ? 'bg-danger-100 text-danger-700' : 'bg-emerald-100 text-emerald-700'}`}>
                必备
              </span>
            )}
            <span className="chip bg-zinc-100 text-zinc-500 text-[10px]">{gap.scenario}</span>
            <span className={`ml-auto chip text-[10.5px] border ${
              gap.status === GapStatus.MISSING
                ? gap.isRequired ? 'bg-danger-50 text-danger-700 border-danger-200' : 'bg-warn-50 text-warn-700 border-warn-200'
                : gap.status === GapStatus.MARKED_PROVIDED
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-zinc-100 text-zinc-500 border-zinc-200'
            }`}>
              {GAP_STATUS_LABELS[gap.status]}
            </span>
          </div>
          <p className={`mt-1 text-[11.5px] leading-relaxed ${
            gap.status === GapStatus.WAIVED ? 'text-zinc-400 line-through' : 'text-zinc-500'
          }`}>
            {gap.description}
          </p>
        </div>
        <button
          onClick={() => onChange(gap.status === GapStatus.WAIVED ? GapStatus.MISSING : GapStatus.WAIVED)}
          className={`shrink-0 p-1.5 rounded-lg transition-colors ${
            gap.status === GapStatus.WAIVED
              ? 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'
              : 'text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600'
          }`}
          title={gap.status === GapStatus.WAIVED ? '恢复要求' : '标记为无需提供'}
        >
          <XOctagon className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
