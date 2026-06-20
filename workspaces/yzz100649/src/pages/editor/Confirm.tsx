import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Check,
  CheckCircle2,
  Download,
  Eye,
  Hand,
  Pencil,
  Send,
  X,
  XCircle,
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { Button } from '@/components/common/Button';
import { Tag } from '@/components/common/Tag';
import { Card } from '@/components/common/Card';
import { Field, Select, TextArea, TextInput } from '@/components/common/Field';
import { useToast } from '@/components/common/Toast';
import { ArticlePreview } from '@/components/article/ArticlePreview';
import { ReviewTimeline } from '@/components/timeline/ReviewTimeline';
import {
  CATEGORY_META,
  DOCTOR_DECISION_META,
  EDITOR_STATUS_META,
  EXPRESSION_META,
  RISK_LEVEL_META,
  STAGE_META,
  type EditorStatus,
} from '@/types';
import type { Annotation } from '@/types';
import {
  buildRevisionManifest,
  downloadCSV,
  downloadJSON,
  revisionToCSV,
} from '@/services/fileIO';
import { clsx } from 'clsx';
import { formatDateTime } from '@/utils/formatters';
import { Modal } from '@/components/common/Modal';

export default function EditorConfirm() {
  const { id } = useParams();
  const nav = useNavigate();
  const init = useAppStore((s) => s.init);
  const getArticle = useAppStore((s) => s.getArticle);
  const setEditorStatus = useAppStore((s) => s.setEditorStatus);
  const setStage = useAppStore((s) => s.setStage);
  const { push } = useToast();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorNote, setEditorNote] = useState('');
  const [editorRevised, setEditorRevised] = useState('');
  const [editorStatus, setEditorStatusLocal] = useState<EditorStatus>('handled');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [, force] = useState(0);

  useEffect(() => {
    init();
  }, [init]);

  const article = id ? getArticle(id) : undefined;

  useEffect(() => {
    if (article && !activeId) {
      const pending = article.annotations.find((a) => a.editorStatus === 'pending');
      if (pending) setActiveId(pending.id);
      else if (article.annotations[0]) setActiveId(article.annotations[0].id);
    }
  }, [article, activeId]);

  if (!article) {
    return <div className="p-12 text-center text-slate-400 text-sm">正在加载…</div>;
  }

  const counts = useMemo(() => {
    const c = article.annotations.reduce(
      (acc, a) => {
        acc.total++;
        acc[a.riskLevel]++;
        acc[a.editorStatus] = (acc[a.editorStatus] || 0) + 1;
        if (a.doctorDecision !== 'pending') acc.reviewed++;
        return acc;
      },
      { total: 0, high: 0, medium: 0, low: 0, pending: 0, confirmed: 0, ignored: 0, handled: 0, reviewed: 0 } as Record<string, number>
    );
    return c;
  }, [article]);

  const activeAnnotation: Annotation | undefined = activeId
    ? article.annotations.find((a) => a.id === activeId)
    : article.annotations[0];

  const openEditor = (ann: Annotation) => {
    setActiveId(ann.id);
    setEditorNote(ann.editorNote || '');
    setEditorRevised(ann.editorRevisedText || ann.originalText);
    setEditorStatusLocal(
      ann.editorStatus === 'pending' ? 'handled' : ann.editorStatus
    );
    setEditorOpen(true);
  };

  const saveEditor = () => {
    if (!activeAnnotation) return;
    setEditorStatus(article.id, activeAnnotation.id, editorStatus, {
      note: editorNote.trim() || undefined,
      revisedText: editorRevised.trim() || undefined,
    });
    push('success', `已保存处理：${EDITOR_STATUS_META[editorStatus].label}`);
    setEditorOpen(false);
    force((n) => n + 1);
  };

  const quickStatus = (annId: string, status: EditorStatus) => {
    setEditorStatus(article.id, annId, status, {});
    push('info', `已标记为 ${EDITOR_STATUS_META[status].label}`);
    force((n) => n + 1);
  };

  const sendToDoctor = () => {
    if (counts.pending > 0) {
      if (
        !confirm(
          `还有 ${counts.pending} 项未处理，确认发送给医生吗？建议先全部处理。`
        )
      )
        return;
    }
    setStage(article.id, 'sent_to_doctor');
    push('success', '已标记为待医生审核，请导出修订清单发送给医生');
    exportJSON();
  };

  const exportJSON = () => {
    const manifest = buildRevisionManifest(article);
    const safe = article.title.replace(/[^\w\u4e00-\u9fa5-]+/g, '_');
    downloadJSON(manifest, `${safe}_修订清单_${Date.now()}.json`);
    push('success', 'JSON 修订清单已导出');
  };

  const exportCSV = () => {
    const safe = article.title.replace(/[^\w\u4e00-\u9fa5-]+/g, '_');
    downloadCSV(revisionToCSV(article), `${safe}_修订清单_${Date.now()}.csv`);
    push('success', 'CSV 表格已导出（Excel 可直接打开）');
  };

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Tag className="bg-sky-50 text-sky-700 border border-sky-100">
              <Pencil className="w-3 h-3" /> 编辑流程 · 步骤 3 / 3
            </Tag>
            <Tag className={STAGE_META[article.stage].cls}>{STAGE_META[article.stage].label}</Tag>
          </div>
          <h1 className="text-2xl font-semibold text-slate-800 mb-1">编辑确认清单</h1>
          <div className="text-xs text-slate-500">
            逐条确认标注项，标记处理状态并填写修改文案，导出后交给医生审核
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="secondary" onClick={() => nav(`/editor/annotate/${article.id}`)}>
            返回标注视图
          </Button>
          <Button variant="secondary" onClick={() => setPreviewOpen(true)} icon={<Eye className="w-4 h-4" />}>
            预览原文
          </Button>
          <Button variant="secondary" onClick={exportCSV} icon={<Download className="w-4 h-4" />}>
            导出 CSV
          </Button>
          <Button variant="secondary" onClick={exportJSON} icon={<Download className="w-4 h-4" />}>
            导出 JSON
          </Button>
          <Button onClick={sendToDoctor} icon={<Send className="w-4 h-4" />}>
            提交给医生审核
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 md:grid-cols-8 gap-3 mb-5">
        <MiniStat label="风险总数" value={counts.total} />
        <MiniStat label="高风险" value={counts.high} tone="red" />
        <MiniStat label="中风险" value={counts.medium} tone="amber" />
        <MiniStat label="低风险" value={counts.low} tone="green" />
        <MiniStat label="待处理" value={counts.pending} tone="slate" />
        <MiniStat label="已确认" value={counts.confirmed} tone="sky" />
        <MiniStat label="已处理" value={counts.handled} tone="emerald" />
        <MiniStat label="医生已审" value={counts.reviewed} tone="violet" />
      </div>

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12 xl:col-span-7 space-y-3">
          {article.annotations.length === 0 && (
            <Card>
              <div className="py-16 text-center text-sm text-slate-400">未检测到任何风险项</div>
            </Card>
          )}
          {article.annotations.map((ann) => (
            <AnnotationCard
              key={ann.id}
              annotation={ann}
              active={activeId === ann.id}
              onSelect={() => setActiveId(ann.id)}
              onEdit={() => openEditor(ann)}
              onQuick={(s) => quickStatus(ann.id, s)}
            />
          ))}
        </div>

        <div className="col-span-12 xl:col-span-5 space-y-5 sticky top-24 self-start">
          <Card title="选中项详情与时间线">
            {activeAnnotation ? (
              <div className="space-y-4">
                <div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <Tag
                      className={clsx(
                        CATEGORY_META[activeAnnotation.category].bg,
                        CATEGORY_META[activeAnnotation.category].text,
                        'border',
                        CATEGORY_META[activeAnnotation.category].border
                      )}
                    >
                      {CATEGORY_META[activeAnnotation.category].label}
                    </Tag>
                    <Tag className="bg-slate-50 text-slate-600 border border-slate-200">
                      {EXPRESSION_META[activeAnnotation.expressionType].label}
                    </Tag>
                    <Tag
                      className={clsx(
                        'bg-white border border-slate-200 text-slate-600 flex items-center gap-1'
                      )}
                    >
                      <span className={clsx('w-1.5 h-1.5 rounded-full', RISK_LEVEL_META[activeAnnotation.riskLevel].dot)} />
                      {RISK_LEVEL_META[activeAnnotation.riskLevel].label}
                    </Tag>
                    <Tag className={EDITOR_STATUS_META[activeAnnotation.editorStatus].cls}>
                      编辑：{EDITOR_STATUS_META[activeAnnotation.editorStatus].label}
                    </Tag>
                    {activeAnnotation.doctorDecision !== 'pending' && (
                      <Tag className={DOCTOR_DECISION_META[activeAnnotation.doctorDecision].cls}>
                        医生：{DOCTOR_DECISION_META[activeAnnotation.doctorDecision].label}
                      </Tag>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 mb-2">
                    第 {activeAnnotation.paragraphIndex + 1} 段
                    {activeAnnotation.lineNumber ? ` · L${activeAnnotation.lineNumber}` : ''}
                    {activeAnnotation.editorHandledAt ? ` · 处理于 ${formatDateTime(activeAnnotation.editorHandledAt)}` : ''}
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[13.5px] leading-relaxed text-slate-800">
                    {activeAnnotation.originalText}
                  </div>
                </div>
                <ReviewTimeline annotation={activeAnnotation} />
                <div className="flex gap-2 pt-1">
                  <Button className="flex-1 justify-center" onClick={() => openEditor(activeAnnotation)} icon={<Pencil className="w-4 h-4" />}>
                    编辑处理
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-10 text-center text-sm text-slate-400">
                请从左侧选择一项查看详情
              </div>
            )}
          </Card>

          <Card title="导出说明">
            <ul className="text-xs text-slate-600 space-y-2 leading-relaxed">
              <li className="flex gap-2">
                <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-[#1e3a5f] shrink-0" />
                <span><b>JSON 清单</b>：发给医生导入使用，含完整标注信息与原文，推荐使用。</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <span><b>CSV 表格</b>：可用 Excel 打开，适合备份与离线查看。</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>所有数据保存在本地浏览器，切换浏览器/清缓存会丢失，建议定期导出。</span>
              </li>
            </ul>
          </Card>
        </div>
      </div>

      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title="编辑处理标注项"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditorOpen(false)}>取消</Button>
            <Button onClick={saveEditor} icon={<Check className="w-4 h-4" />}>保存</Button>
          </>
        }
      >
        {activeAnnotation && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[13px] leading-relaxed text-slate-800">
              <div className="text-[11px] text-slate-400 mb-1">原句</div>
              {activeAnnotation.originalText}
            </div>
            <Field label="处理状态" required>
              <Select
                value={editorStatus}
                onChange={(e) => setEditorStatusLocal(e.target.value as EditorStatus)}
              >
                <option value="pending">待处理</option>
                <option value="confirmed">已确认（表述正确，无需修改）</option>
                <option value="handled">已处理（已修改文案）</option>
                <option value="ignored">已忽略（非风险项）</option>
              </Select>
            </Field>
            <Field label="修改后文案（推荐填写）" hint="保留原意的同时，降低绝对化或补充必要的限定语">
              <TextArea
                rows={4}
                value={editorRevised}
                onChange={(e) => setEditorRevised(e.target.value)}
                placeholder="请输入改写后的建议文案…"
              />
            </Field>
            <Field label="编辑备注 / 疑问（可选）">
              <TextInput
                value={editorNote}
                onChange={(e) => setEditorNote(e.target.value)}
                placeholder="如有疑问或说明，请写给医生参考"
              />
            </Field>
          </div>
        )}
      </Modal>

      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={article.title}
        size="lg"
      >
        <ArticlePreview
          paragraphs={article.paragraphs}
          annotations={article.annotations}
          onAnnotationClick={(aId) => {
            setActiveId(aId);
            setPreviewOpen(false);
          }}
        />
      </Modal>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone = 'slate',
}: {
  label: string;
  value: number;
  tone?: 'slate' | 'red' | 'amber' | 'green' | 'sky' | 'emerald' | 'violet';
}) {
  const map = {
    slate: 'from-slate-50 to-white text-slate-700 border-slate-200',
    red: 'from-red-50 to-white text-red-700 border-red-200',
    amber: 'from-amber-50 to-white text-amber-700 border-amber-200',
    green: 'from-green-50 to-white text-green-700 border-green-200',
    sky: 'from-sky-50 to-white text-sky-700 border-sky-200',
    emerald: 'from-emerald-50 to-white text-emerald-700 border-emerald-200',
    violet: 'from-violet-50 to-white text-violet-700 border-violet-200',
  };
  return (
    <div className={clsx('rounded-xl border p-3 bg-gradient-to-br', map[tone])}>
      <div className="text-[11px] opacity-80 mb-1">{label}</div>
      <div className="text-xl font-semibold leading-none">{value}</div>
    </div>
  );
}

function AnnotationCard({
  annotation,
  active,
  onSelect,
  onEdit,
  onQuick,
}: {
  annotation: Annotation;
  active: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onQuick: (s: EditorStatus) => void;
}) {
  const cat = CATEGORY_META[annotation.category];
  return (
    <div
      className={clsx(
        'bg-white rounded-xl border transition-all overflow-hidden',
        active ? 'border-[#1e3a5f]/40 ring-1 ring-[#1e3a5f]/10 shadow-md' : 'border-slate-200 shadow-sm hover:shadow-md'
      )}
    >
      <div
        className={clsx('p-4 flex gap-4 cursor-pointer', annotation.editorStatus === 'ignored' && 'opacity-60')}
        onClick={onSelect}
      >
        <div
          className="w-1 rounded-full shrink-0"
          style={{ background: cat.color }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            <Tag className={clsx(cat.bg, cat.text, 'border', cat.border)}>
              {cat.label}
            </Tag>
            <Tag className="bg-slate-50 text-slate-600 border border-slate-200">
              {EXPRESSION_META[annotation.expressionType].label}
            </Tag>
            <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
              <span className={clsx('w-1.5 h-1.5 rounded-full', RISK_LEVEL_META[annotation.riskLevel].dot)} />
              {RISK_LEVEL_META[annotation.riskLevel].label}
            </span>
            <span className="text-[11px] text-slate-400 ml-auto">
              第{annotation.paragraphIndex + 1}段
              {annotation.lineNumber ? ` · L${annotation.lineNumber}` : ''}
            </span>
          </div>
          <p className="text-[14px] leading-relaxed text-slate-800 mb-2 line-clamp-3">
            {annotation.originalText}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Tag className={EDITOR_STATUS_META[annotation.editorStatus].cls}>
              {EDITOR_STATUS_META[annotation.editorStatus].label}
            </Tag>
            {annotation.doctorDecision !== 'pending' && (
              <Tag className={DOCTOR_DECISION_META[annotation.doctorDecision].cls}>
                医生：{DOCTOR_DECISION_META[annotation.doctorDecision].label}
              </Tag>
            )}
            {annotation.editorRevisedText && (
              <div className="text-[12px] text-emerald-700 bg-emerald-50 rounded px-2 py-1 border border-emerald-100 flex-1 min-w-0 truncate">
                修改后：{annotation.editorRevisedText}
              </div>
            )}
            {annotation.editorHandledAt && (
              <span className="text-[11px] text-slate-400 ml-auto">
                {formatDateTime(annotation.editorHandledAt)}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center border-t border-slate-100 bg-slate-50/60 px-4 py-2 gap-2 flex-wrap">
        <span className="text-[11px] text-slate-400 mr-1">快捷操作：</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onQuick('confirmed');
          }}
          className="h-7 px-2.5 rounded-md text-[11px] inline-flex items-center gap-1 hover:bg-sky-50 text-sky-700 transition"
        >
          <CheckCircle2 className="w-3.5 h-3.5" /> 确认无误
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onQuick('handled');
          }}
          className="h-7 px-2.5 rounded-md text-[11px] inline-flex items-center gap-1 hover:bg-emerald-50 text-emerald-700 transition"
        >
          <Hand className="w-3.5 h-3.5" /> 标记已处理
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onQuick('ignored');
          }}
          className="h-7 px-2.5 rounded-md text-[11px] inline-flex items-center gap-1 hover:bg-slate-100 text-slate-600 transition"
        >
          <XCircle className="w-3.5 h-3.5" /> 忽略
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="h-7 px-2.5 rounded-md text-[11px] inline-flex items-center gap-1 hover:bg-[#1e3a5f]/5 text-[#1e3a5f] transition ml-auto"
        >
          <Pencil className="w-3.5 h-3.5" /> 编辑处理
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className="h-7 px-2.5 rounded-md text-[11px] inline-flex items-center gap-1 hover:bg-slate-100 text-slate-600 transition"
        >
          <Eye className="w-3.5 h-3.5" /> 查看时间线
        </button>
      </div>
    </div>
  );
}
