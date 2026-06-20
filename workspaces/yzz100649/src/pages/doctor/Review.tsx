import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  BadgeCheck,
  Check,
  CheckCircle2,
  Download,
  Eye,
  FileEdit,
  Pencil,
  RefreshCcw,
  Trash2,
  User,
  XCircle,
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { Button } from '@/components/common/Button';
import { Tag } from '@/components/common/Tag';
import { Card } from '@/components/common/Card';
import { Field, Select, TextArea, TextInput } from '@/components/common/Field';
import { useToast } from '@/components/common/Toast';
import { ArticlePreview } from '@/components/article/ArticlePreview';
import {
  buildReviewReport,
  downloadCSV,
  downloadJSON,
  reviewReportToCSV,
} from '@/services/fileIO';
import {
  CATEGORY_META,
  DOCTOR_DECISION_META,
  EDITOR_STATUS_META,
  EXPRESSION_META,
  RISK_LEVEL_META,
  STAGE_META,
  type Annotation,
  type DoctorDecision,
} from '@/types';
import { clsx } from 'clsx';
import { Modal } from '@/components/common/Modal';
import { formatDateTime } from '@/utils/formatters';

const LOCAL_DOCTOR_KEY = 'medical_review_doctor_name';

export default function DoctorReview() {
  const { id } = useParams();
  const nav = useNavigate();
  const init = useAppStore((s) => s.init);
  const getArticle = useAppStore((s) => s.getArticle);
  const setDoctorDecision = useAppStore((s) => s.setDoctorDecision);
  const setStage = useAppStore((s) => s.setStage);
  const { push } = useToast();

  const [doctorName, setDoctorName] = useState(() => localStorage.getItem(LOCAL_DOCTOR_KEY) || '');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [decision, setDecision] = useState<DoctorDecision>('approved');
  const [advice, setAdvice] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [, force] = useState(0);

  useEffect(() => {
    init();
  }, [init]);

  const article = id ? getArticle(id) : undefined;

  useEffect(() => {
    if (article && !activeId) {
      const pending = article.annotations.find((a) => a.doctorDecision === 'pending');
      if (pending) setActiveId(pending.id);
      else if (article.annotations[0]) setActiveId(article.annotations[0].id);
    }
  }, [article, activeId]);

  useEffect(() => {
    if (doctorName) localStorage.setItem(LOCAL_DOCTOR_KEY, doctorName);
  }, [doctorName]);

  if (!article) {
    return <div className="p-12 text-center text-slate-400 text-sm">正在加载…</div>;
  }

  const counts = useMemo(() => {
    const c = article.annotations.reduce(
      (acc, a) => {
        acc.total++;
        acc[a.doctorDecision] = (acc[a.doctorDecision] || 0) + 1;
        if (a.riskLevel === 'high') acc.high++;
        if (a.editorStatus !== 'pending') acc.editorHandled++;
        return acc;
      },
      { total: 0, pending: 0, approved: 0, needs_rewrite: 0, delete: 0, high: 0, editorHandled: 0 } as Record<string, number>
    );
    return c;
  }, [article]);

  const activeAnnotation = activeId
    ? article.annotations.find((a) => a.id === activeId)
    : article.annotations[0];

  const allDone = counts.pending === 0 && counts.total > 0;
  const progress = counts.total === 0 ? 100 : Math.round(((counts.total - counts.pending) / counts.total) * 100);

  const openReview = (ann: Annotation) => {
    setActiveId(ann.id);
    setDecision(ann.doctorDecision === 'pending' ? 'approved' : ann.doctorDecision);
    setAdvice(ann.doctorAdvice || '');
    setOpen(true);
  };

  const saveReview = () => {
    if (!activeAnnotation) return;
    if (!doctorName.trim()) {
      push('warn', '请先填写您的姓名/标识');
      return;
    }
    setDoctorDecision(article.id, activeAnnotation.id, decision, {
      advice: advice.trim() || undefined,
      doctorName: doctorName.trim(),
    });
    push('success', `已保存：${DOCTOR_DECISION_META[decision].label}`);
    setOpen(false);
    force((n) => n + 1);
  };

  const quickDecide = (annId: string, d: DoctorDecision) => {
    if (!doctorName.trim()) {
      push('warn', '请先填写您的姓名/标识，在页面右上方输入');
      return;
    }
    setDoctorDecision(article.id, annId, d, { doctorName: doctorName.trim() });
    push('info', `已标记：${DOCTOR_DECISION_META[d].label}`);
    force((n) => n + 1);
  };

  const finalize = () => {
    if (!doctorName.trim()) {
      push('warn', '请填写姓名');
      return;
    }
    if (counts.pending > 0) {
      if (!confirm(`仍有 ${counts.pending} 项未审核，确认结束审核并导出报告吗？`)) return;
    }
    setStage(article.id, 'doctor_reviewed');
    push('success', '审核结束，报告已可导出');
    exportReportJSON();
  };

  const exportReportJSON = () => {
    if (!doctorName.trim()) {
      push('warn', '请填写姓名');
      return;
    }
    const report = buildReviewReport(article, doctorName.trim());
    const safe = article.title.replace(/[^\w\u4e00-\u9fa5-]+/g, '_');
    downloadJSON(report, `${safe}_审核报告_${Date.now()}.json`);
    push('success', 'JSON 审核报告已导出');
  };

  const exportReportCSV = () => {
    if (!doctorName.trim()) {
      push('warn', '请填写姓名');
      return;
    }
    const report = buildReviewReport(article, doctorName.trim());
    const safe = article.title.replace(/[^\w\u4e00-\u9fa5-]+/g, '_');
    downloadCSV(reviewReportToCSV(report), `${safe}_审核报告_${Date.now()}.csv`);
    push('success', 'CSV 报告已导出');
  };

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Tag className="bg-violet-50 text-violet-700 border border-violet-100">
              <BadgeCheck className="w-3 h-3" /> 医生流程 · 步骤 2 / 2
            </Tag>
            <Tag className={STAGE_META[article.stage].cls}>{STAGE_META[article.stage].label}</Tag>
          </div>
          <h1 className="text-2xl font-semibold text-slate-800 mb-1">{article.title}</h1>
          <div className="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
            <span>作者：{article.author || '未填写'}</span>
            <span>·</span>
            <span>来源：{article.source || '未填写'}</span>
            <span>·</span>
            <span>{counts.total} 项待审核</span>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-[200px]">
            <Field label="医生姓名/标识" required>
              <TextInput
                value={doctorName}
                placeholder="用于报告签名"
                onChange={(e) => setDoctorName(e.target.value)}
              />
            </Field>
          </div>
          <Button variant="secondary" onClick={() => setPreviewOpen(true)} icon={<Eye className="w-4 h-4" />}>
            原文预览
          </Button>
          <Button variant="secondary" onClick={exportReportCSV} icon={<Download className="w-4 h-4" />}>
            导出 CSV
          </Button>
          <Button variant="secondary" onClick={exportReportJSON} icon={<Download className="w-4 h-4" />}>
            导出 JSON
          </Button>
          <Button
            onClick={finalize}
            variant={allDone ? 'primary' : 'warning'}
            icon={<RefreshCcw className="w-4 h-4" />}
          >
            结束审核并导出报告
          </Button>
        </div>
      </div>

      <div className="mb-5">
        <Card>
          <div className="flex flex-wrap items-center gap-4 mb-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-violet-600" />
              <span className="text-sm font-medium text-slate-700">审核进度</span>
            </div>
            <div className="text-xs text-slate-500">
              已审核 <b className="text-violet-600">{counts.total - counts.pending}</b> / {counts.total} 项（{progress}%）
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <MiniStat label="通过" value={counts.approved} tone="emerald" />
              <MiniStat label="需改写" value={counts.needs_rewrite} tone="amber" />
              <MiniStat label="删除" value={counts.delete} tone="rose" />
              <MiniStat label="高风险" value={counts.high} tone="red" />
            </div>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-400 to-violet-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12 xl:col-span-7 space-y-3">
          {article.annotations.length === 0 && (
            <Card>
              <div className="py-16 text-center text-sm text-slate-400">暂无需要审核的标注项</div>
            </Card>
          )}
          {article.annotations.map((ann) => (
            <ReviewCard
              key={ann.id}
              annotation={ann}
              active={activeId === ann.id}
              onSelect={() => setActiveId(ann.id)}
              onReview={() => openReview(ann)}
              onQuick={(d) => quickDecide(ann.id, d)}
            />
          ))}
        </div>

        <div className="col-span-12 xl:col-span-5 space-y-5 sticky top-24 self-start">
          <Card title="选中项审核面板">
            {activeAnnotation ? (
              <div className="space-y-4">
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
                  <Tag className="bg-white border border-slate-200 text-slate-600 flex items-center gap-1">
                    <span className={clsx('w-1.5 h-1.5 rounded-full', RISK_LEVEL_META[activeAnnotation.riskLevel].dot)} />
                    {RISK_LEVEL_META[activeAnnotation.riskLevel].label}
                  </Tag>
                  <Tag className={EDITOR_STATUS_META[activeAnnotation.editorStatus].cls}>
                    编辑：{EDITOR_STATUS_META[activeAnnotation.editorStatus].label}
                  </Tag>
                  <Tag className={DOCTOR_DECISION_META[activeAnnotation.doctorDecision].cls}>
                    当前：{DOCTOR_DECISION_META[activeAnnotation.doctorDecision].label}
                  </Tag>
                </div>
                <div className="text-[11px] text-slate-400 mb-2 flex items-center gap-3 flex-wrap">
                  <span>段落 {activeAnnotation.paragraphIndex + 1}</span>
                  {activeAnnotation.lineNumber && <span>第 {activeAnnotation.lineNumber} 行</span>}
                  {activeAnnotation.doctorReviewedAt && (
                    <span>审核于 {formatDateTime(activeAnnotation.doctorReviewedAt)}</span>
                  )}
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[13.5px] leading-relaxed text-slate-800">
                  {activeAnnotation.originalText}
                </div>
                {activeAnnotation.editorRevisedText && (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                    <div className="text-[11px] text-emerald-500 font-medium mb-1">编辑改写建议</div>
                    <div className="text-[13px] text-emerald-800 leading-relaxed">
                      {activeAnnotation.editorRevisedText}
                    </div>
                  </div>
                )}
                {activeAnnotation.doctorAdvice && (
                  <div className="p-3 rounded-lg bg-violet-50 border border-violet-200">
                    <div className="text-[11px] text-violet-500 font-medium mb-1 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      您上次的审核意见
                      {activeAnnotation.doctorName && `（${activeAnnotation.doctorName}）`}
                    </div>
                    <div className="text-[13px] text-violet-800 leading-relaxed">
                      {activeAnnotation.doctorAdvice}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <Button variant="success" onClick={() => quickDecide(activeAnnotation.id, 'approved')} icon={<CheckCircle2 className="w-4 h-4" />}>
                    通过
                  </Button>
                  <Button variant="warning" onClick={() => quickDecide(activeAnnotation.id, 'needs_rewrite')} icon={<Pencil className="w-4 h-4" />}>
                    需改写
                  </Button>
                  <Button variant="danger" onClick={() => quickDecide(activeAnnotation.id, 'delete')} icon={<Trash2 className="w-4 h-4" />}>
                    删除
                  </Button>
                </div>
                <Button className="w-full justify-center" variant="secondary" onClick={() => openReview(activeAnnotation)} icon={<FileEdit className="w-4 h-4" />}>
                  填写详细审核意见
                </Button>
              </div>
            ) : (
              <div className="py-10 text-center text-sm text-slate-400">请从左侧选择一项</div>
            )}
          </Card>

          <Card title="审核签名">
            <div className="text-xs text-slate-500 mb-2">请在页面上方填写您的姓名/标识，所有审核意见将附带该签名</div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-br from-violet-50 to-white border border-violet-100">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 text-white flex items-center justify-center text-sm font-semibold shadow-sm">
                {doctorName.trim() ? doctorName.trim().charAt(0) : '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-800 truncate">
                  {doctorName.trim() || '未填写姓名'}
                </div>
                <div className="text-[11px] text-slate-400">
                  {doctorName.trim() ? '签名已就绪' : '请在上方填写姓名后再审核'}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="专业审核"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>取消</Button>
            <Button onClick={saveReview} icon={<Check className="w-4 h-4" />}>保存</Button>
          </>
        }
      >
        {activeAnnotation && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[13px] leading-relaxed text-slate-800">
              <div className="text-[11px] text-slate-400 mb-1">原句</div>
              {activeAnnotation.originalText}
            </div>
            {activeAnnotation.editorRevisedText && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-[13px] text-emerald-800 leading-relaxed">
                <div className="text-[11px] text-emerald-500 mb-1">编辑改写</div>
                {activeAnnotation.editorRevisedText}
              </div>
            )}
            <Field label="审核结论" required>
              <Select
                value={decision}
                onChange={(e) => setDecision(e.target.value as DoctorDecision)}
              >
                <option value="approved">通过（表述合规）</option>
                <option value="needs_rewrite">需改写（有问题，请修改）</option>
                <option value="delete">删除（不适合发布）</option>
              </Select>
            </Field>
            <Field label="专业意见（建议填写）" hint="说明依据或具体修改建议，将作为最终审核报告留档">
              <TextArea
                rows={5}
                value={advice}
                onChange={(e) => setAdvice(e.target.value)}
                placeholder="请输入专业审核意见，可注明依据来源（如某指南、某说明书）…"
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

function MiniStat({ label, value, tone }: { label: string; value: number; tone: 'emerald' | 'amber' | 'rose' | 'red' }) {
  const map = {
    emerald: 'from-emerald-50 to-white text-emerald-700 border-emerald-200',
    amber: 'from-amber-50 to-white text-amber-700 border-amber-200',
    rose: 'from-rose-50 to-white text-rose-700 border-rose-200',
    red: 'from-red-50 to-white text-red-700 border-red-200',
  };
  return (
    <div className={clsx('rounded-xl border p-2.5 bg-gradient-to-br text-center min-w-[70px]', map[tone])}>
      <div className="text-[10px] opacity-80">{label}</div>
      <div className="text-lg font-semibold leading-none mt-0.5">{value}</div>
    </div>
  );
}

function ReviewCard({
  annotation,
  active,
  onSelect,
  onReview,
  onQuick,
}: {
  annotation: Annotation;
  active: boolean;
  onSelect: () => void;
  onReview: () => void;
  onQuick: (d: DoctorDecision) => void;
}) {
  const cat = CATEGORY_META[annotation.category];
  const pending = annotation.doctorDecision === 'pending';
  return (
    <div
      className={clsx(
        'bg-white rounded-xl border transition-all overflow-hidden',
        active
          ? 'border-violet-400/50 ring-1 ring-violet-400/20 shadow-md'
          : 'border-slate-200 shadow-sm hover:shadow-md'
      )}
    >
      <div
        className={clsx('p-4 flex gap-4 cursor-pointer', !pending && 'bg-slate-50/40')}
        onClick={onSelect}
      >
        <div className="w-1 rounded-full shrink-0" style={{ background: cat.color }} />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            <Tag className={clsx(cat.bg, cat.text, 'border', cat.border)}>{cat.label}</Tag>
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
              编辑：{EDITOR_STATUS_META[annotation.editorStatus].label}
            </Tag>
            <Tag className={DOCTOR_DECISION_META[annotation.doctorDecision].cls}>
              {pending ? '待您审核' : `医生：${DOCTOR_DECISION_META[annotation.doctorDecision].label}`}
            </Tag>
            {annotation.doctorAdvice && (
              <div className="text-[12px] text-violet-700 bg-violet-50 rounded px-2 py-1 border border-violet-100 flex-1 min-w-0 truncate">
                💬 {annotation.doctorAdvice}
              </div>
            )}
            {annotation.doctorReviewedAt && (
              <span className="text-[11px] text-slate-400 ml-auto">
                {formatDateTime(annotation.doctorReviewedAt)}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center border-t border-slate-100 bg-slate-50/60 px-4 py-2 gap-2 flex-wrap">
        <span className="text-[11px] text-slate-400 mr-1">审核：</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onQuick('approved');
          }}
          className="h-7 px-2.5 rounded-md text-[11px] inline-flex items-center gap-1 hover:bg-emerald-50 text-emerald-700 transition"
        >
          <CheckCircle2 className="w-3.5 h-3.5" /> 通过
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onQuick('needs_rewrite');
          }}
          className="h-7 px-2.5 rounded-md text-[11px] inline-flex items-center gap-1 hover:bg-amber-50 text-amber-700 transition"
        >
          <Pencil className="w-3.5 h-3.5" /> 需改写
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onQuick('delete');
          }}
          className="h-7 px-2.5 rounded-md text-[11px] inline-flex items-center gap-1 hover:bg-rose-50 text-rose-700 transition"
        >
          <XCircle className="w-3.5 h-3.5" /> 删除
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onReview();
          }}
          className="h-7 px-2.5 rounded-md text-[11px] inline-flex items-center gap-1 hover:bg-violet-50 text-violet-700 transition ml-auto"
        >
          <FileEdit className="w-3.5 h-3.5" /> 填写意见
        </button>
      </div>
    </div>
  );
}
