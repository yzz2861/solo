import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Eye, RefreshCcw, ShieldCheck, Tag as TagIcon } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { Button } from '@/components/common/Button';
import { Tag } from '@/components/common/Tag';
import { ArticlePreview } from '@/components/article/ArticlePreview';
import { AnnotationList } from '@/components/annotation/AnnotationList';
import { AnnotationDetail } from '@/components/annotation/AnnotationDetail';
import { Card } from '@/components/common/Card';
import { useToast } from '@/components/common/Toast';
import { annotateArticle } from '@/services/annotationEngine';
import { splitParagraphs } from '@/services/fileIO';
import { CATEGORY_META, STAGE_META } from '@/types';
import { formatDateTime } from '@/utils/formatters';

export default function EditorAnnotate() {
  const { id } = useParams();
  const nav = useNavigate();
  const init = useAppStore((s) => s.init);
  const getArticle = useAppStore((s) => s.getArticle);
  const upsertArticle = useAppStore((s) => s.upsertArticle);
  const setStage = useAppStore((s) => s.setStage);
  const { push } = useToast();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [, force] = useState(0);
  const rerender = () => force((n) => n + 1);

  useEffect(() => {
    init();
  }, [init]);

  const article = id ? getArticle(id) : undefined;

  useEffect(() => {
    if (!article && id) {
      push('warn', '稿件不存在或已删除');
      nav('/editor/import');
    }
  }, [article, id, nav, push]);

  const stats = useMemo(() => {
    if (!article) return null;
    const total = article.annotations.length;
    const handled = article.annotations.filter(
      (a) => a.editorStatus !== 'pending'
    ).length;
    const byCat: Record<string, number> = {};
    for (const a of article.annotations) {
      byCat[a.category] = (byCat[a.category] || 0) + 1;
    }
    const progress = total === 0 ? 100 : Math.round((handled / total) * 100);
    return { total, handled, byCat, progress };
  }, [article]);

  if (!article || !stats) {
    return (
      <div className="p-12 text-center text-slate-400 text-sm">正在加载稿件…</div>
    );
  }

  const reAnnotate = () => {
    const paragraphs = splitParagraphs(article.content);
    const newAnnotations = annotateArticle(paragraphs);
    const preserved = article.annotations.filter((a) => a.editorStatus !== 'pending');
    const exists = (n: typeof newAnnotations[0]) =>
      preserved.some(
        (p) =>
          p.paragraphIndex === n.paragraphIndex &&
          p.originalText === n.originalText
      );
    const merged = [
      ...preserved,
      ...newAnnotations.filter((a) => !exists(a)),
    ].sort((a, b) => a.paragraphIndex - b.paragraphIndex || a.startChar - b.startChar);
    upsertArticle({
      ...article,
      paragraphs,
      annotations: merged,
      stage: merged.length > 0 ? 'annotated' : article.stage,
    });
    push('info', '已重新扫描稿件，保留已确认项');
    rerender();
  };

  const goConfirm = () => {
    if (article.stage !== 'annotated' && article.stage !== 'confirmed' && article.stage !== 'imported') {
      push('warn', '当前状态不适合确认，请先完成标注');
      return;
    }
    setStage(article.id, 'confirmed');
    push('success', `已确认 ${stats.handled}/${stats.total} 项，进入确认清单环节`);
    nav(`/editor/confirm/${article.id}`);
  };

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Tag className="bg-sky-50 text-sky-700 border border-sky-100">
              <Eye className="w-3 h-3" /> 编辑流程 · 步骤 2 / 3
            </Tag>
            <Tag className={STAGE_META[article.stage].cls}>{STAGE_META[article.stage].label}</Tag>
            {article.author && <Tag className="bg-slate-50 text-slate-600">编辑：{article.author}</Tag>}
            {article.source && <Tag className="bg-slate-50 text-slate-600">来源：{article.source}</Tag>}
          </div>
          <h1 className="text-2xl font-semibold text-slate-800 mb-1">{article.title}</h1>
          <div className="text-xs text-slate-400 flex items-center gap-3 flex-wrap">
            <span>导入于 {formatDateTime(article.createdAt)}</span>
            <span>·</span>
            <span>{article.paragraphs.length} 段 / {article.annotations.length} 项风险</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="secondary" onClick={reAnnotate} icon={<RefreshCcw className="w-4 h-4" />}>
            重新扫描
          </Button>
          <Button
            onClick={goConfirm}
            iconRight={<ArrowRight className="w-4 h-4" />}
          >
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              确认 {stats.handled}/{stats.total}
            </span>
          </Button>
        </div>
      </div>

      <div className="mb-5">
        <Card>
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#1e3a5f]" />
              <span className="text-sm font-medium text-slate-700">处理进度</span>
            </div>
            <div className="text-xs text-slate-500">
              已处理 <span className="font-semibold text-emerald-600">{stats.handled}</span> / {stats.total} 项
              <span className="ml-1 text-slate-400">（{stats.progress}%）</span>
            </div>
            <div className="ml-auto flex items-center gap-2 flex-wrap">
              {Object.entries(stats.byCat).map(([k, v]) => (
                <span
                  key={k}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium border"
                  style={{
                    color: CATEGORY_META[k as keyof typeof CATEGORY_META].color,
                    background: `${CATEGORY_META[k as keyof typeof CATEGORY_META].color}10`,
                    borderColor: `${CATEGORY_META[k as keyof typeof CATEGORY_META].color}33`,
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: CATEGORY_META[k as keyof typeof CATEGORY_META].color }} />
                  <TagIcon className="w-3 h-3" />
                  {CATEGORY_META[k as keyof typeof CATEGORY_META].label} {v}
                </span>
              ))}
            </div>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500"
              style={{ width: `${stats.progress}%` }}
            />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-12 gap-5" style={{ minHeight: 'calc(100vh - 340px)' }}>
        <div className="col-span-12 lg:col-span-3 h-[calc(100vh-360px)] min-h-[560px] bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <AnnotationList
            annotations={article.annotations}
            activeId={activeId}
            onSelect={setActiveId}
          />
        </div>
        <div className="col-span-12 lg:col-span-6 h-[calc(100vh-360px)] min-h-[560px] overflow-auto bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-5 py-3 flex items-center justify-between">
            <div className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1e3a5f]" />
              原文预览
            </div>
            <div className="text-xs text-slate-400">
              点击高亮段可查看详情 · 颜色对应风险类别
            </div>
          </div>
          <div className="p-6">
            <ArticlePreview
              paragraphs={article.paragraphs}
              annotations={article.annotations}
              activeId={activeId}
              onAnnotationClick={setActiveId}
            />
          </div>
        </div>
        <div className="col-span-12 lg:col-span-3 h-[calc(100vh-360px)] min-h-[560px] overflow-auto">
          <AnnotationDetail
            annotation={
              activeId ? article.annotations.find((a) => a.id === activeId) ?? null : article.annotations[0] ?? null
            }
            articleTitle={article.title}
          />
        </div>
      </div>
    </div>
  );
}
