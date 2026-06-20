import type { Annotation } from '@/types';
import {
  CATEGORY_META,
  EXPRESSION_META,
  RISK_LEVEL_META,
  EDITOR_STATUS_META,
  DOCTOR_DECISION_META,
} from '@/types';
import { Card } from '@/components/common/Card';
import { Tag } from '@/components/common/Tag';
import { formatDateTime } from '@/utils/formatters';
import { Lightbulb, MapPin, Clock, BookOpen, User, Megaphone, Cloud } from 'lucide-react';
import { clsx } from 'clsx';

interface Props {
  annotation: Annotation | null;
  articleTitle?: string;
}

const EXPRESSION_ICONS = {
  guideline: <BookOpen className="w-3 h-3" />,
  patient_story: <User className="w-3 h-3" />,
  advertising: <Megaphone className="w-3 h-3" />,
  vague_suggestion: <Cloud className="w-3 h-3" />,
};

export function AnnotationDetail({ annotation, articleTitle }: Props) {
  if (!annotation) {
    return (
      <Card className="h-full">
        <div className="py-16 text-center text-sm text-slate-400 space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
            <Lightbulb className="w-6 h-6 text-slate-400" />
          </div>
          <p>从左侧选择一个标注项查看详情</p>
        </div>
      </Card>
    );
  }

  const cat = CATEGORY_META[annotation.category];
  const rl = RISK_LEVEL_META[annotation.riskLevel];
  const exp = EXPRESSION_META[annotation.expressionType];
  const es = EDITOR_STATUS_META[annotation.editorStatus];
  const dd = DOCTOR_DECISION_META[annotation.doctorDecision];

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: cat.color }} />
          <span className={cat.text}>{cat.label}</span>
          <span className="text-slate-400">·</span>
          <span className="text-slate-600 font-normal">{articleTitle || '标注详情'}</span>
        </div>
      }
      className="h-full"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          <Tag className={clsx(cat.bg, cat.text, cat.border, 'border')} icon={EXPRESSION_ICONS[annotation.expressionType]}>
            {exp.label}
          </Tag>
          <Tag className="bg-white border border-slate-200 text-slate-600">
            <span className={clsx('w-1.5 h-1.5 rounded-full inline-block mr-1', rl.dot)} />
            {rl.label}
          </Tag>
          <Tag className={clsx(es.cls)}>{es.label}</Tag>
          {annotation.doctorDecision !== 'pending' && (
            <Tag className={clsx(dd.cls)}>医生：{dd.label}</Tag>
          )}
        </div>

        <div>
          <div className="text-xs text-slate-400 mb-1.5 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            原句位置
          </div>
          <div className="text-xs text-slate-500 mb-2 flex items-center gap-3 flex-wrap">
            <span>段落 {annotation.paragraphIndex + 1}</span>
            {annotation.lineNumber && <span>第 {annotation.lineNumber} 行</span>}
            <span>字符 {annotation.startChar}–{annotation.endChar}</span>
          </div>
          <div
            className={clsx(
              'p-3 rounded-lg border-l-4 bg-slate-50 border-slate-200 text-[13.5px] leading-[1.8] text-slate-800',
              cat.border.replace('border-', 'border-l-')
            )}
            style={{ borderLeftColor: cat.color }}
          >
            {annotation.originalText}
          </div>
        </div>

        <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
          <div className="flex items-start gap-2.5">
            <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-amber-700 mb-1">
                系统建议
              </div>
              <p className="text-[13px] leading-relaxed text-amber-900">
                {annotation.suggestion}
              </p>
            </div>
          </div>
        </div>

        {(annotation.editorStatus !== 'pending' || annotation.editorNote || annotation.editorRevisedText) && (
          <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/60 space-y-2">
            <div className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              编辑处理记录
            </div>
            <div className="text-xs flex items-center gap-2">
              <Tag className={clsx(es.cls)}>{es.label}</Tag>
              {annotation.editorHandledAt && (
                <span className="text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDateTime(annotation.editorHandledAt)}
                </span>
              )}
            </div>
            {annotation.editorNote && (
              <div>
                <div className="text-[11px] text-slate-400 mb-0.5">编辑备注</div>
                <p className="text-[13px] text-slate-700 leading-relaxed">{annotation.editorNote}</p>
              </div>
            )}
            {annotation.editorRevisedText && (
              <div>
                <div className="text-[11px] text-slate-400 mb-0.5">修改后文案</div>
                <p className="text-[13px] text-emerald-700 leading-relaxed bg-emerald-50 rounded-md px-2.5 py-1.5 border border-emerald-100">
                  {annotation.editorRevisedText}
                </p>
              </div>
            )}
          </div>
        )}

        {annotation.doctorDecision !== 'pending' && (
          <div className="rounded-xl border border-violet-100 p-4 bg-violet-50/50 space-y-2">
            <div className="text-xs font-semibold text-violet-700 mb-2 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              医生审核意见
            </div>
            <div className="text-xs flex items-center gap-2 flex-wrap">
              <Tag className={clsx(dd.cls)}>{dd.label}</Tag>
              {annotation.doctorName && <span className="text-slate-500">{annotation.doctorName}</span>}
              {annotation.doctorReviewedAt && (
                <span className="text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDateTime(annotation.doctorReviewedAt)}
                </span>
              )}
            </div>
            {annotation.doctorAdvice && (
              <div>
                <div className="text-[11px] text-violet-400 mb-0.5">专业意见</div>
                <p className="text-[13px] text-violet-900 leading-relaxed bg-white rounded-md px-2.5 py-1.5 border border-violet-100/80">
                  {annotation.doctorAdvice}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
