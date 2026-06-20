import { useMemo, useState } from 'react';
import {
  Trash2, ChevronDown, ChevronUp, Eye, RefreshCw, Search as SearchIcon,
  GripVertical, Tag as TagIcon, FileText as FileTextIcon,
  ArrowUp, ArrowDown, ZoomIn, ImageOff,
} from 'lucide-react';
import { useComplaintStore } from '@/store/complaintStore';
import {
  Attachment, MaterialType, MATERIAL_TYPE_LABELS, MATERIAL_TYPE_ORDER,
} from '@/types';
import { formatFileSize } from '@/utils/namingGenerator';
import ConfidenceBadges, { TypeConfidenceBar, ConfidenceSummary } from './ConfidenceBadges';

function Thumbnail({ att }: { att: Attachment }) {
  const [error, setError] = useState(false);
  if (!att.previewUrl || error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center rounded-lg bg-gradient-to-br from-zinc-50 to-zinc-100 border border-zinc-200">
        <ImageOff className="h-6 w-6 text-zinc-300 mb-1" />
        <span className="text-[9px] text-zinc-400 uppercase tracking-wider">
          {att.fileType.split('/').pop()?.slice(0, 4) || 'FILE'}
        </span>
      </div>
    );
  }
  return (
    <img
      src={att.previewUrl}
      alt={att.originalName}
      onError={() => setError(true)}
      className="h-full w-full rounded-lg object-cover"
    />
  );
}

function PreviewModal({ att, onClose }: { att: Attachment; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in p-8"
      onClick={onClose}
    >
      <div
        className="max-h-[88vh] max-w-[88vw] overflow-hidden rounded-2xl bg-white shadow-2xl animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
          <div>
            <div className="flex items-center gap-2">
              <FileTextIcon className="h-4 w-4 text-brand-700" />
              <span className="font-mono text-sm font-medium text-zinc-800">{att.originalName}</span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {formatFileSize(att.fileSize)} · {att.fileType}
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost p-2">
            <ChevronDown className="h-5 w-5" />
          </button>
        </div>
        <div className="flex flex-col lg:flex-row max-h-[calc(88vh-58px)]">
          <div className="flex items-center justify-center bg-zinc-900 p-4 lg:min-w-[420px] lg:max-w-[60%]">
            {att.previewUrl ? (
              <img
                src={att.previewUrl}
                className="max-h-[55vh] lg:max-h-[70vh] max-w-full object-contain rounded-lg shadow-lift"
                alt=""
              />
            ) : (
              <div className="text-zinc-400 text-sm">无预览</div>
            )}
          </div>
          <div className="flex-1 p-5 space-y-4 overflow-y-auto">
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-zinc-600">OCR 文本 / 图片说明</label>
              <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-3 text-[13px] leading-relaxed whitespace-pre-wrap text-zinc-700 max-h-[220px] overflow-y-auto">
                {att.ocrText || <span className="text-zinc-400 italic">（暂无OCR文本）</span>}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-zinc-600">人工备注</label>
              <div className="rounded-lg bg-brand-50/40 border border-brand-200 p-3 text-[13px] leading-relaxed text-zinc-700">
                {att.description || <span className="text-zinc-400 italic">（无备注）</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AttachmentList() {
  const cmp = useComplaintStore((s) => s.getComplaint());
  const removeAttachment = useComplaintStore((s) => s.removeAttachment);
  const setAttachmentField = useComplaintStore((s) => s.setAttachmentField);
  const runRecognition = useComplaintStore((s) => s.runRecognition);
  const overrideMaterialType = useComplaintStore((s) => s.overrideMaterialType);
  const overrideOrderNo = useComplaintStore((s) => s.overrideOrderNo);
  const overrideFileName = useComplaintStore((s) => s.overrideFileName);
  const moveItem = useComplaintStore((s) => s.moveItem);
  const typeOverrides = useComplaintStore((s) => s.typeOverrides);
  const orderNoOverrides = useComplaintStore((s) => s.orderNoOverrides);
  const fileNameOverrides = useComplaintStore((s) => s.fileNameOverrides);

  const [previewId, setPreviewId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'low' | MaterialType>('all');

  const previewAtt = previewId ? cmp?.attachments.find((a) => a.id === previewId) : null;

  const countLow = useMemo(() => {
    if (!cmp) return 0;
    return cmp.attachments.filter((a) => {
      const r = cmp.recognitions[a.id];
      return r && r.lowConfidenceReasons.length > 0;
    }).length;
  }, [cmp]);

  const sortedAttachments = useMemo(() => {
    if (!cmp) return [];
    const items = [...cmp.attachments];
    if (filter !== 'all') {
      if (filter === 'low') {
        return items.filter((a) => cmp.recognitions[a.id]?.lowConfidenceReasons.length);
      }
      return items.filter((a) => {
        const rec = cmp.recognitions[a.id];
        const type = typeOverrides[a.id] ?? rec?.materialType;
        return type === filter;
      });
    }
    const getSeq = (id: string) => cmp.namingList.find((n) => n.attachmentId === id)?.sequence ?? 999;
    return items.sort((a, b) => getSeq(a.id) - getSeq(b.id));
  }, [cmp, filter, typeOverrides]);

  if (!cmp) return null;

  if (cmp.attachments.length === 0) {
    return (
      <div className="card animate-fade-in">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <TagIcon className="h-4.5 w-4.5 text-zinc-500" />
            <h2 className="text-[15px] font-semibold text-zinc-900">附件识别列表</h2>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 mb-3">
            <GripVertical className="h-7 w-7 text-zinc-400" />
          </div>
          <p className="text-sm font-medium text-zinc-600 mb-1">尚未上传任何附件</p>
          <p className="text-[12px] text-zinc-400 max-w-sm">
            请先在上方上传区域拖拽或选择客户提供的图片，系统将自动识别材料类型并提取订单线索
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card animate-fade-in flex flex-col">
      <div className="card-header flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <TagIcon className="h-4.5 w-4.5 text-brand-700" />
          <h2 className="text-[15px] font-semibold text-zinc-900">附件识别列表</h2>
          <ConfidenceSummary countLow={countLow} countTotal={cmp.attachments.length} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1">
            {(['all', 'low'] as const).map((k) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`rounded-md px-2.5 py-1 text-[11.5px] font-medium transition-all ${
                  filter === k
                    ? 'bg-white text-brand-700 shadow-soft border border-zinc-200'
                    : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                {k === 'all' ? '全部' : '仅低置信'}
              </button>
            ))}
            <div className="mx-1 h-4 w-px bg-zinc-200" />
            {MATERIAL_TYPE_ORDER.slice(0, 6).map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`rounded-md px-2 py-1 text-[11px] transition-all ${
                  filter === t
                    ? 'bg-white text-brand-700 shadow-soft border border-zinc-200 font-medium'
                    : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                {MATERIAL_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3 scroll-y max-h-[calc(100vh-540px)] min-h-[200px]">
        {sortedAttachments.length === 0 && (
          <div className="py-8 text-center text-[13px] text-zinc-400">当前筛选下无附件</div>
        )}
        {sortedAttachments.map((att) => {
          const rec = cmp.recognitions[att.id];
          const currentType = typeOverrides[att.id] ?? rec?.materialType ?? MaterialType.UNKNOWN;
          const currentOrderNo = orderNoOverrides[att.id] ?? rec?.extractedOrderNo ?? '';
          const currentFileName = fileNameOverrides[att.id] ?? '';
          const isExpanded = expandedIds.has(att.id);
          const namingItem = cmp.namingList.find((n) => n.attachmentId === att.id);
          const seq = namingItem?.sequence;
          const isFirst = seq === 1;
          const isLast = seq === cmp.namingList.length;

          return (
            <div
              key={att.id}
              className={`group rounded-xl border transition-all duration-200 ${
                rec?.lowConfidenceReasons.length
                  ? 'border-danger-200 bg-danger-50/30 hover:border-danger-300 hover:shadow-soft'
                  : 'border-zinc-200 bg-white hover:border-brand-200 hover:shadow-soft'
              }`}
            >
              <div className="p-3.5 flex gap-3.5">
                <div className="flex flex-col items-center gap-1.5 pt-0.5 shrink-0">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold tabular-nums ${
                    seq ? 'bg-brand-700 text-white shadow-soft' : 'bg-zinc-100 text-zinc-500'
                  }`}>
                    {seq || '-'}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => moveItem(att.id, 'up')}
                      disabled={isFirst}
                      title="上移"
                      className="p-1 rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-20 disabled:hover:bg-transparent"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => moveItem(att.id, 'down')}
                      disabled={isLast}
                      title="下移"
                      className="p-1 rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-20 disabled:hover:bg-transparent"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                <div
                  className="h-[72px] w-[72px] shrink-0 rounded-lg overflow-hidden cursor-zoom-in shadow-soft ring-1 ring-zinc-200"
                  onClick={() => setPreviewId(att.id)}
                >
                  <Thumbnail att={att} />
                </div>

                <div className="flex-1 min-w-0 space-y-2.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[13px] font-semibold text-zinc-800 truncate" title={att.originalName}>
                          {att.originalName}
                        </span>
                        <span className="chip bg-zinc-100 text-zinc-500 shrink-0">
                          {formatFileSize(att.fileSize)}
                        </span>
                        {namingItem && (
                          <span className="chip bg-brand-50 text-brand-700 border border-brand-200 font-mono text-[11px] shrink-0" title="将命名为">
                            → {namingItem.newFileName}
                          </span>
                        )}
                      </div>
                      {rec && (
                        <div className="mt-1.5">
                          <ConfidenceBadges
                            reasons={rec.lowConfidenceReasons}
                            materialConfidence={rec.materialConfidence}
                            orderNoConfidence={rec.orderNoConfidence}
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={() => setPreviewId(att.id)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-brand-700 transition-colors"
                        title="预览大图"
                      >
                        <ZoomIn className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => runRecognition(att.id)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:bg-brand-50 hover:text-brand-700 transition-colors"
                        title="重新识别"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => removeAttachment(att.id)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:bg-danger-50 hover:text-danger-600 transition-colors"
                        title="移除附件"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                    <div className="md:col-span-5">
                      <label className="mb-1 flex items-center gap-1 text-[11px] font-medium text-zinc-500">
                        材料类型
                        {rec && <TypeConfidenceBar type={rec.materialType} confidence={rec.materialConfidence} />}
                      </label>
                      <select
                        className="select text-[12.5px] py-1.5"
                        value={currentType}
                        onChange={(e) => {
                          const val = e.target.value as MaterialType;
                          overrideMaterialType(att.id, val === rec?.materialType ? null : val);
                        }}
                      >
                        {MATERIAL_TYPE_ORDER.map((t) => (
                          <option key={t} value={t}>
                            {MATERIAL_TYPE_LABELS[t]}
                            {t === rec?.materialType ? ` · 置信${Math.round((rec.materialConfidence || 0) * 100)}%` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-5">
                      <label className="mb-1 flex items-center gap-1 text-[11px] font-medium text-zinc-500">
                        <SearchIcon className="h-3 w-3" />
                        订单号（留空用全局）
                      </label>
                      <input
                        className="input text-[12.5px] py-1.5 font-mono"
                        placeholder="未提取到订单号"
                        value={currentOrderNo}
                        onChange={(e) => overrideOrderNo(att.id, e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-2 flex items-end">
                      <button
                        onClick={() => setExpandedIds((s) => {
                          const n = new Set(s);
                          n.has(att.id) ? n.delete(att.id) : n.add(att.id);
                          return n;
                        })}
                        className="w-full btn-secondary py-1.5 text-[12px] justify-center"
                      >
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        {isExpanded ? '收起' : '详情'}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="pt-2 mt-2 border-t border-zinc-200/70 space-y-2.5 animate-slide-in">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-zinc-500">OCR 识别文本（粘贴或输入）</label>
                          <textarea
                            className="textarea text-[12.5px] min-h-[72px]"
                            placeholder="粘贴OCR结果，或输入图片中的文字描述，越详细识别越准…"
                            value={att.ocrText}
                            onChange={(e) => setAttachmentField(att.id, 'ocrText', e.target.value)}
                            onBlur={() => runRecognition(att.id)}
                          />
                        </div>
                        <div className="space-y-2.5">
                          <div>
                            <label className="mb-1 block text-[11px] font-medium text-zinc-500">人工备注 / 图片说明</label>
                            <input
                              className="input text-[12.5px] py-1.5"
                              placeholder="如：聊天记录第2张、快递单正反面、商品破损特写"
                              value={att.description}
                              onChange={(e) => setAttachmentField(att.id, 'description', e.target.value)}
                              onBlur={() => runRecognition(att.id)}
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-[11px] font-medium text-zinc-500">
                              自定义文件名（可选，留空用模板生成）
                            </label>
                            <input
                              className="input text-[12.5px] py-1.5 font-mono"
                              placeholder="如：01-聊天记录-主对话.jpg"
                              value={currentFileName}
                              onChange={(e) => overrideFileName(att.id, e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {previewAtt && <PreviewModal att={previewAtt} onClose={() => setPreviewId(null)} />}
    </div>
  );
}
