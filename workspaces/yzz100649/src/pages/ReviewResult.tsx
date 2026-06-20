import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Filter,
  History,
  Pencil,
  Upload,
  User,
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { Button } from '@/components/common/Button';
import { Tag } from '@/components/common/Tag';
import { Card } from '@/components/common/Card';
import { useToast } from '@/components/common/Toast';
import { ArticlePreview } from '@/components/article/ArticlePreview';
import { ReviewTimeline } from '@/components/timeline/ReviewTimeline';
import { Modal } from '@/components/common/Modal';
import {
  CATEGORY_META,
  DOCTOR_DECISION_META,
  EDITOR_STATUS_META,
  EXPRESSION_META,
  RISK_LEVEL_META,
  STAGE_META,
  type Annotation,
  type DoctorDecision,
  type RiskCategory,
} from '@/types';
import { applyReviewReportToArticle, parseReviewReport, readFileAsText } from '@/services/fileIO';
import { clsx } from 'clsx';
import { formatDateTime } from '@/utils/formatters';

type FilterKey = 'all' | 'pending_doctor' | 'approved' | 'needs_rewrite' | 'delete' | 'handled';

export default function ReviewResult() {
  const { id } = useParams();
  const nav = useNavigate();
  const init = useAppStore((s) => s.init);
  const getArticle = useAppStore((s) => s.getArticle);
  const upsertArticle = useAppStore((s) => s.upsertArticle);
  const role = useAppStore((s) => s.role);
  const { push } = useToast();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<'all' | RiskCategory>('all');
  const [statusFilter, setStatusFilter] = useState<FilterKey>('all');
  const [, force] = useState(0);

  useEffect(() => {
    init();
  }, [init]);

  const article = id ? getArticle(id) : undefined;

  useEffect(() => {
    if (article && !activeId && article.annotations[0]) {
      setActiveId(article.annotations[0].id);
    }
  }, [article, activeId]);

  if (!article) {
    return <div className="p-12 text-center text-slate-400 text-sm">正在加载…</div>;
  }

  const filtered = useMemo(() => {
    return article.annotations.filter((a) => {
      if (categoryFilter !== 'all' && a.category !== categoryFilter) return false;
      switch (statusFilter) {
        case 'all':
          return true;        case 'pending_doctor':
          return a.doctorDecision === 'pending';
        case 'approved':
          return a.doctorDecision === 'approved';
        case 'needs_rewrite':
          return a.doctorDecision === 'needs_rewrite';
        case 'delete':
          return a.doctorDecision === 'delete';
        case 'handled':
          return a.editorStatus === 'handled';
      }
      return true;
    });
  }, [article.annotations, categoryFilter, statusFilter]);

  const summary = useMemo(() => {
    return article.annotations.reduce(
      (acc, a) => {
        acc.total++;
        acc[a.doctorDecision] = (acc[a.doctorDecision] || 0) + 1;
        if (a.editorStatus === 'handled') acc.editorHandled++;
        if (a.riskLevel === 'high') acc.high++;
        return acc;
      },
      { total: 0, pending: 0, approved: 0, needs_rewrite: 0, delete: 0, editorHandled: 0, high: 0 } as Record<string, number>
    );
  }, [article.annotations]);

  const activeAnnotation = activeId
    ? article.annotations.find((a) => a.id === activeId)
    : article.annotations[0];

  const importDoctorReport = async (file: File) => {
    try {
      const text = await readFileAsText(file);
      const report = parseReviewReport(text);
      if (!report) {
        push('error', '文件格式不正确，请选择医生导出的审核报告 JSON');
        return;
      }
      if (report.articleId !== article.id) {
        if (!confirm(`该报告对应稿件 ID 与当前不匹配，是否仍要应用到当前稿件？`)) return;
      }
      const updated = applyReviewReportToArticle(article, report);
      upsertArticle(updated);
      push('success', `已导入 ${report.summary.total} 条审核意见`);
      force((n) => n + 1);
    } catch {
      push('error', '读取失败');
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Tag className="bg-indigo-50 text-indigo-700 border border-indigo-100">
              <History className="w-3 h-3" /> 审核结果回溯
            </Tag>
            <Tag className={STAGE_META[article.stage].cls}>{STAGE_META[article.stage].label}</Tag>
            {article.author && <Tag className="bg-slate-50 text-slate-600">编辑：{article.author}</Tag>}
          </div>
          <h1 className="text-2xl font-semibold text-slate-800 mb-1">{article.title}</h1>
          <div className="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
            <span>导入于 {formatDateTime(article.createdAt)}</span>
            <span>·</span>
            <span>更新于 {formatDateTime(article.updatedAt)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {role === 'editor' && (
            <label className="cursor-pointer inline-flex items-center gap-1.5 h-10 px-4 text-sm rounded-lg font-medium transition bg-white text-[#1e3a5f] border border-slate-200 hover:bg-slate-50">
              <Upload className="w-4 h-4" />
              导入医生报告
              <input
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) importDoctorReport(f);
                }}
              />
            </label>
          )}
          <Button variant="secondary" onClick={() => setPreviewOpen(true)} icon={<Eye className="w-4 h-4" />}>
            预览原文
          </Button>
          {role === 'editor' ? (
            <Button
              onClick={() => nav(`/editor/confirm/${article.id}`)}
              iconRight={<ArrowRight className="w-4 h-4" />}
            >
              <Pencil className="w-4 h-4 mr-1.5" /> 继续编辑确认
            </Button>
          ) : (
            <Button onClick={() => nav(`/doctor/review/${article.id}`)} iconRight={<ArrowRight className="w-4 h-4" />}>
              回到审核页
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <SummaryCard label="风险项" value={summary.total} icon={<FileText className="w-4 h-4" />} tone="slate" />
        <SummaryCard label="医生通过" value={summary.approved} icon={<CheckCircle2 className="w-4 h-4" />} tone="emerald" />
        <SummaryCard label="需改写 / 删除" value={summary.needs_rewrite + summary.delete} icon={<Pencil className="w-4 h-4" />} tone="amber" />
        <SummaryCard label="编辑已处理" value={summary.editorHandled} icon={<User className="w-4 h-4" />} tone="indigo" />
      </div>

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12 xl:col-span-7 space-y-3">
          <Card>
            <div className="flex flex-wrap items-center gap-3">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                className="h-8 text-xs px-2.5 rounded-md border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]/30"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as typeof categoryFilter)}
              >
                <option value="all">全部风险类别</option>
                {Object.entries(CATEGORY_META).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
              <select
                className="h-8 text-xs px-2.5 rounded-md border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]/30"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              >
                <option value="all">全部审核状态</option>
                <option value="pending_doctor">医生待审核</option>
                <option value="approved">医生已通过</option>
                <option value="needs_rewrite">需改写</option>
                <option value="delete">删除</option>
                <option value="handled">编辑已处理</option>
              </select>
              <div className="ml-auto text-xs text-slate-400">
                显示 {filtered.length} / {article.annotations.length} 项
              </div>
            </div>
          </Card>

          {filtered.length === 0 && (
            <Card>
              <div className="py-16 text-center text-sm text-slate-400">当前筛选条件下无匹配项</div>
            </Card>
          )}

          {filtered.map((ann) => (
            <ResultCard
              key={ann.id}
              annotation={ann}
              active={activeId === ann.id}
              onClick={() => setActiveId(ann.id)}
            />
          ))}
        </div>

        <div className="col-span-12 xl:col-span-5 space-y-5 sticky top-24 self-start">
          <Card title="处理时间线">
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
                    医生：{DOCTOR_DECISION_META[activeAnnotation.doctorDecision].label}
                  </Tag>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[13px] leading-relaxed text-slate-800">
                  {activeAnnotation.originalText}
                </div>
                <ReviewTimeline annotation={activeAnnotation} />
              </div>
            ) : (
              <div className="py-10 text-center text-sm text-slate-400">请从左侧选择一项查看时间线</div>
            )}
          </Card>

          <Card title="整体审核分布">
            <DistBar label="通过" value={summary.approved} total={summary.total} color="bg-emerald-500" />
            <DistBar label="需改写" value={summary.needs_rewrite} total={summary.total} color="bg-amber-500" />
            <DistBar label="删除" value={summary.delete} total={summary.total} color="bg-rose-500" />
            <DistBar label="未审" value={summary.pending} total={summary.total} color="bg-slate-300" />
          </Card>
        </div>
      </div>

      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={`${article.title} · 带状态预览`}
        size="lg"
      >
        <div className="mb-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> 编辑已处理</span>
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> 医生需改写</span>
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> 建议删除</span>
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal-500" /> 医生已通过</span>
        </div>
        <ArticlePreview
          paragraphs={article.paragraphs}
          annotations={article.annotations}
          onAnnotationClick={(aId) => {
            setActiveId(aId);
            setPreviewOpen(false);
          }}
          showHandledBadge
        />
      </Modal>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: 'slate' | 'emerald' | 'amber' | 'indigo';
}) {
  const map = {
    slate: 'from-slate-50 to-white text-slate-700 border-slate-200',
    emerald: 'from-emerald-50 to-white text-emerald-700 border-emerald-200',
    amber: 'from-amber-50 to-white text-amber-700 border-amber-200',
    indigo: 'from-indigo-50 to-white text-indigo-700 border-indigo-200',
  }[tone];
  return (
    <div className={clsx('rounded-2xl border p-4 bg-gradient-to-br shadow-sm', map)}>
      <div className="flex items-center justify-between opacity-90 mb-1">
        {icon}
        <span className="text-[11px]">{label}</span>
      </div>
      <div className="text-2xl font-semibold leading-none mt-1">{value}</div>
    </div>
  );
}

function DistBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
        <span>{label}</span>
        <span className="font-medium">{value} ({pct}%)</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className={clsx('h-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ResultCard({
  annotation,
  active,
  onClick,
}: {
  annotation: Annotation;
  active: boolean;
  onClick: () => void;
}) {
  const cat = CATEGORY_META[annotation.category];
  const doctor = annotation.doctorDecision;
  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full text-left bg-white rounded-xl border transition-all overflow-hidden',
        active ? 'border-indigo-400/40 ring-1 ring-indigo-400/20 shadow-md' : 'border-slate-200 shadow-sm hover:shadow-md'
      )}
    >
      <div className="p-4 flex gap-4">
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
            <Tag className={EDITOR_STATUS_META[annotation.editorStatus].cls}>
              {EDITOR_STATUS_META[annotation.editorStatus].label}
            </Tag>
            {doctor !== 'pending' && (
              <Tag
                className={clsx(
                  DOCTOR_DECISION_META[doctor as DoctorDecision].cls,
                  'ml-auto'
                )}
              >
                {DOCTOR_DECISION_META[doctor as DoctorDecision].label}
              </Tag>
            )}
          </div>
          <p className="text-[14px] leading-relaxed text-slate-800 mb-2 line-clamp-2">
            {annotation.originalText}
          </p>
          {annotation.editorRevisedText && (
            <div className="text-[12px] text-emerald-700 bg-emerald-50/70 rounded px-2 py-1 border border-emerald-100 mb-2 truncate">
              编辑改写：{annotation.editorRevisedText}
            </div>
          )}
          {annotation.doctorAdvice && (
            <div className="text-[12px] text-violet-700 bg-violet-50/70 rounded px-2 py-1 border border-violet-100 truncate">
              医生意见：{annotation.doctorAdvice}
            </div>
          )}
          <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-3 flex-wrap">
            <span>段落 {annotation.paragraphIndex + 1}{annotation.lineNumber ? ` · L${annotation.lineNumber}` : ''}</span>
            {annotation.doctorName && <span>· 医生签名：{annotation.doctorName}</span>}
            {annotation.doctorReviewedAt && <span>· 审核于 {formatDateTime(annotation.doctorReviewedAt)}</span>}
          </div>
        </div>
      </div>
    </button>
  );
}
