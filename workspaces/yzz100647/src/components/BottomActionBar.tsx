import { useState } from 'react';
import { useComplaintStore } from '@/store/complaintStore';
import {
  Download, Check, FileSpreadsheet, FileJson, RotateCcw, Save, CheckCheck,
  ChevronDown, ClipboardList, AlertCircle, Loader2,
} from 'lucide-react';
import {
  exportNamingCSV, exportMappingJSON, downloadBlob, suggestFileNameForComplaint,
} from '@/utils/exporters';
import { GapStatus } from '@/types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

export default function BottomActionBar() {
  const cmp = useComplaintStore((s) => s.getComplaint());
  const confirmNaming = useComplaintStore((s) => s.confirmNaming);
  const createNew = useComplaintStore((s) => s.createNewComplaint);
  const setComplaintField = useComplaintStore((s) => s.setComplaintField);
  const runRecognition = useComplaintStore((s) => s.runRecognition);
  const persist = useComplaintStore((s) => s._persist);

  const [exportOpen, setExportOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [savedTip, setSavedTip] = useState(false);

  if (!cmp) return null;

  const requiredMissing = cmp.materialGaps.filter(
    (g) => g.status === GapStatus.MISSING && g.isRequired,
  ).length;
  const lowCount = cmp.attachments.filter(
    (a) => cmp.recognitions[a.id]?.lowConfidenceReasons.length,
  ).length;
  const hasUnknown = cmp.attachments.some(
    (a) => !cmp.recognitions[a.id] || cmp.recognitions[a.id].materialType === 'UNKNOWN',
  );
  const canExport = cmp.attachments.length > 0 && cmp.namingList.length > 0;

  const handleConfirm = async () => {
    setConfirming(true);
    await new Promise((r) => setTimeout(r, 500));
    confirmNaming();
    setConfirming(false);
  };

  const handleSaveDraft = () => {
    persist();
    setSavedTip(true);
    setTimeout(() => setSavedTip(false), 1600);
  };

  const getExportCtx = () => {
    const ctx = useComplaintStore.getState().getExportContext();
    return {
      complaintNo: ctx.meta.complaintNo,
      customerInfo: ctx.meta.customerInfo,
      scenario: ctx.meta.scenario,
      globalOrderNo: ctx.meta.globalOrderNo,
      createdAt: ctx.meta.createdAt,
      items: ctx.naming,
      attachments: ctx.items,
      missingMaterials: ctx.missing,
    };
  };

  const handleExportCSV = () => {
    const ctx = getExportCtx();
    const blob = exportNamingCSV(ctx);
    downloadBlob(blob, `${suggestFileNameForComplaint(cmp.complaintNo)}-命名清单.csv`);
    setComplaintField('status', 'EXPORTED' as any);
    setExportOpen(false);
  };

  const handleExportJSON = () => {
    const ctx = getExportCtx();
    const blob = exportMappingJSON(ctx);
    downloadBlob(blob, `${suggestFileNameForComplaint(cmp.complaintNo)}-完整映射.json`);
    setComplaintField('status', 'EXPORTED' as any);
    setExportOpen(false);
  };

  const handleExportBoth = () => {
    handleExportCSV();
    setTimeout(() => handleExportJSON(), 350);
  };

  const handleReset = () => {
    if (!confirm('确定重置当前投诉单？所有附件、识别结果、命名将被清空')) return;
    useComplaintStore.setState({
      typeOverrides: {},
      orderNoOverrides: {},
      sequenceOverrides: {},
      fileNameOverrides: {},
    });
    const complaints = useComplaintStore.getState().complaints.map((c) =>
      c.id === cmp.id ? {
        ...c,
        complaintNo: '',
        customerInfo: '',
        globalOrderNo: '',
        status: 'DRAFT' as const,
        attachments: [],
        recognitions: {},
        namingList: [],
        materialGaps: [],
        scenario: 'general',
        updatedAt: new Date().toISOString(),
      } : c,
    );
    useComplaintStore.setState({ complaints });
    persist();
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-200/80 glass animate-fade-in">
      <div className="container flex flex-wrap items-center justify-between gap-3 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-zinc-100/80 px-3 py-1.5">
            <ClipboardList className="h-4 w-4 text-zinc-500" />
            <span className="text-[12px] text-zinc-600">
              共 <b className="text-zinc-900">{cmp.attachments.length}</b> 个附件
            </span>
            <span className="text-zinc-300">·</span>
            <span className="text-[12px] text-zinc-600">
              生成 <b className="text-zinc-900">{cmp.namingList.length}</b> 个命名
            </span>
          </div>

          {(lowCount > 0 || hasUnknown || requiredMissing > 0) && (
            <div className="flex items-center gap-1.5">
              {lowCount > 0 && (
                <span className="chip bg-warn-50 text-warn-700 border border-warn-200">
                  <AlertCircle className="h-3 w-3" />
                  {lowCount} 低置信待复核
                </span>
              )}
              {hasUnknown && (
                <span className="chip bg-zinc-100 text-zinc-600 border border-zinc-200">
                  <AlertCircle className="h-3 w-3" />
                  存在未识别类型
                </span>
              )}
              {requiredMissing > 0 && (
                <span className="chip bg-danger-50 text-danger-700 border border-danger-200">
                  <AlertCircle className="h-3 w-3" />
                  {requiredMissing} 必备材料缺失
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            disabled={cmp.attachments.length === 0}
            className="btn-ghost text-[12.5px]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            重置
          </button>
          <button
            onClick={handleSaveDraft}
            className="btn-secondary text-[12.5px] relative"
          >
            {savedTip ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-emerald-700">已保存 ✓</span>
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                保存草稿
              </>
            )}
          </button>
          <button
            onClick={() => runRecognition()}
            className="btn-secondary text-[12.5px]"
            disabled={cmp.attachments.length === 0}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            重新识别全部
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirming || cmp.attachments.length === 0 || cmp.status === 'CONFIRMED'}
            className={cn(
              'text-[12.5px] shadow-card',
              cmp.status === 'CONFIRMED'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white btn'
                : 'btn-primary',
            )}
          >
            {confirming ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : cmp.status === 'CONFIRMED' ? (
              <><CheckCheck className="h-3.5 w-3.5" /> 已确认命名</>
            ) : (
              <><Check className="h-3.5 w-3.5" /> 确认命名</>
            )}
          </button>

          <div className="relative">
            <button
              onClick={() => setExportOpen((o) => !o)}
              disabled={!canExport}
              className="btn-primary gradient-warn !text-amber-950 hover:brightness-105 text-[12.5px]"
            >
              <Download className="h-3.5 w-3.5" />
              导出
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', exportOpen && 'rotate-180')} />
            </button>
            {exportOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setExportOpen(false)}
                />
                <div className="absolute bottom-full right-0 mb-2 w-56 overflow-hidden rounded-xl bg-white shadow-lift border border-zinc-100 py-1.5 animate-fade-in z-20">
                  <button
                    onClick={handleExportBoth}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-[12.5px] hover:bg-brand-50 text-zinc-700 transition-colors border-b border-zinc-50"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50">
                      <Download className="h-3.5 w-3.5 text-brand-700" />
                    </div>
                    <div>
                      <div className="font-semibold">导出全部（推荐）</div>
                      <div className="text-[10.5px] text-zinc-400">命名清单 CSV + 完整映射 JSON</div>
                    </div>
                  </button>
                  <button
                    onClick={handleExportCSV}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-[12.5px] hover:bg-zinc-50 text-zinc-700 transition-colors"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                    <div>
                      <div>仅命名清单 CSV</div>
                      <div className="text-[10.5px] text-zinc-400">质检同事直接使用</div>
                    </div>
                  </button>
                  <button
                    onClick={handleExportJSON}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-[12.5px] hover:bg-zinc-50 text-zinc-700 transition-colors border-t border-zinc-50"
                  >
                    <FileJson className="h-4 w-4 text-sky-600" />
                    <div>
                      <div>完整映射 JSON</div>
                      <div className="text-[10.5px] text-zinc-400">含原始附件 ID、OCR、回溯信息</div>
                    </div>
                  </button>
                  <div className="mt-1 border-t border-zinc-50 pt-1.5 px-3.5 pb-1">
                    <p className="text-[10.5px] text-zinc-400 leading-relaxed">
                      💡 命名清单含新/旧文件名映射，质检可随时凭 ID 找客服追溯原附件
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
          <button
            onClick={createNew}
            className="btn-ghost text-[12.5px] border border-zinc-200 bg-white hover:bg-zinc-50"
            title="另起新投诉单"
          >
            + 新单
          </button>
        </div>
      </div>
    </div>
  );
}
