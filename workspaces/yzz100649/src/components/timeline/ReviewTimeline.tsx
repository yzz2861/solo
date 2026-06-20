import type { Annotation } from '@/types';
import { EDITOR_STATUS_META, DOCTOR_DECISION_META } from '@/types';
import { clsx } from 'clsx';
import { FileEdit, CheckCircle, XCircle, MessageSquare, Stethoscope, ArrowRight } from 'lucide-react';
import { formatDateTime } from '@/utils/formatters';

interface Props {
  annotation: Annotation;
  compact?: boolean;
}

interface Step {
  id: string;
  title: string;
  sub?: string;
  icon: React.ReactNode;
  tone: 'done' | 'active' | 'pending';
  time?: string;
  note?: React.ReactNode;
}

export function ReviewTimeline({ annotation, compact = false }: Props) {
  const steps: Step[] = [];

  steps.push({
    id: 'detect',
    title: '系统智能标注',
    sub: `${annotation.riskLevel === 'high' ? '高' : annotation.riskLevel === 'medium' ? '中' : '低'}风险 · ${annotation.category}`,
    icon: <FileEdit className="w-4 h-4" />,
    tone: 'done',
    note: (
      <p className="text-[12px] text-slate-500 leading-relaxed line-clamp-3">
        {annotation.suggestion}
      </p>
    ),
  });

  const handled = annotation.editorStatus !== 'pending';
  steps.push({
    id: 'editor',
    title: '编辑确认处理',
    sub: handled ? EDITOR_STATUS_META[annotation.editorStatus].label : '待编辑处理',
    icon: <CheckCircle className="w-4 h-4" />,
    tone: handled ? 'done' : 'pending',
    time: annotation.editorHandledAt,
    note:
      handled ? (
        <div className="space-y-1">
          {annotation.editorRevisedText && (
            <p className="text-[12px] text-emerald-700 bg-emerald-50 rounded px-2 py-1 border border-emerald-100">
              修改后：{annotation.editorRevisedText}
            </p>
          )}
          {annotation.editorNote && (
            <p className="text-[12px] text-slate-600">备注：{annotation.editorNote}</p>
          )}
        </div>
      ) : undefined,
  });

  const reviewed = annotation.doctorDecision !== 'pending';
  steps.push({
    id: 'doctor',
    title: '医生专业审核',
    sub: reviewed ? DOCTOR_DECISION_META[annotation.doctorDecision].label : '待医生审核',
    icon: <Stethoscope className="w-4 h-4" />,
    tone: reviewed ? 'done' : handled ? 'active' : 'pending',
    time: annotation.doctorReviewedAt,
    note:
      reviewed ? (
        <div className="space-y-1">
          {annotation.doctorName && (
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {annotation.doctorName}
            </p>
          )}
          {annotation.doctorAdvice && (
            <p className="text-[12px] text-violet-800 bg-violet-50 rounded px-2 py-1 border border-violet-100">
              {annotation.doctorAdvice}
            </p>
          )}
        </div>
      ) : undefined,
  });

  if (handled && annotation.editorStatus === 'handled' && reviewed && annotation.doctorDecision === 'approved') {
    steps.push({
      id: 'close',
      title: '风险项关闭',
      sub: '已通过完整审核',
      icon: <XCircle className="w-4 h-4" />,
      tone: 'done',
    });
  }

  const toneClass = {
    done: 'bg-emerald-500 text-white border-emerald-500',
    active: 'bg-[#1e3a5f] text-white border-[#1e3a5f] animate-pulse',
    pending: 'bg-white text-slate-400 border-slate-200',
  };

  return (
    <div className={clsx('relative', compact ? 'space-y-3' : 'space-y-4')}>
      {steps.map((step, idx) => (
        <div key={step.id} className="relative flex gap-3">
          <div className="flex flex-col items-center">
            <div
              className={clsx(
                'w-9 h-9 rounded-full border-2 flex items-center justify-center shrink-0 transition',
                toneClass[step.tone]
              )}
            >
              {step.icon}
            </div>
            {idx < steps.length - 1 && (
              <div
                className={clsx(
                  'w-px flex-1 my-1',
                  step.tone === 'pending' ? 'bg-slate-100' : 'bg-emerald-200'
                )}
                style={{ minHeight: compact ? 16 : 24 }}
              />
            )}
          </div>
          <div className="flex-1 pb-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-medium text-slate-800">{step.title}</div>
                {step.sub && (
                  <div className="text-[12px] text-slate-500 flex items-center gap-1 mt-0.5">
                    {step.sub}
                    {step.time && (
                      <>
                        <ArrowRight className="w-3 h-3 text-slate-300" />
                        <span>{formatDateTime(step.time)}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
            {step.note && <div className="mt-2">{step.note}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
