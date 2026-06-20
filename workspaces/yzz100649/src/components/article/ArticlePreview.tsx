import { useMemo } from 'react';
import type { Annotation, RiskCategory } from '@/types';
import { CATEGORY_META, EDITOR_STATUS_META, DOCTOR_DECISION_META } from '@/types';
import { clsx } from 'clsx';
import { escapeHtml } from '@/utils/formatters';

interface Props {
  paragraphs: string[];
  annotations: Annotation[];
  activeId?: string | null;
  onAnnotationClick?: (id: string) => void;
  showHandledBadge?: boolean;
}

interface Segment {
  text: string;
  annotation?: Annotation;
  index: number;
}

export function ArticlePreview({
  paragraphs,
  annotations,
  activeId,
  onAnnotationClick,
  showHandledBadge = false,
}: Props) {
  const renderedParagraphs = useMemo(() => {
    return paragraphs.map((paragraph, pIdx) => {
      const annsInPara = annotations
        .filter((a) => a.paragraphIndex === pIdx)
        .sort((a, b) => a.startChar - b.startChar);

      const segments: Segment[] = [];
      let cursor = 0;
      let segIndex = 0;

      for (const ann of annsInPara) {
        if (ann.startChar > cursor) {
          segments.push({
            text: paragraph.slice(cursor, ann.startChar),
            index: segIndex++,
          });
        }
        segments.push({
          text: paragraph.slice(ann.startChar, ann.endChar) || ann.originalText,
          annotation: ann,
          index: segIndex++,
        });
        cursor = ann.endChar;
      }
      if (cursor < paragraph.length) {
        segments.push({ text: paragraph.slice(cursor), index: segIndex++ });
      }

      return { paragraphIndex: pIdx, segments, raw: paragraph };
    });
  }, [paragraphs, annotations]);

  return (
    <div className="prose-doc">
      {renderedParagraphs.map(({ paragraphIndex, segments }) => (
        <p
          key={paragraphIndex}
          className="group relative leading-[1.95] text-slate-700 text-[15px] mb-5 pl-10 hover:bg-slate-50/60 rounded-lg -ml-3 px-3 py-1.5 transition-colors"
        >
          <span className="absolute left-0 top-1 select-none text-[11px] font-mono text-slate-300 group-hover:text-slate-400 w-8 text-right">
            {paragraphIndex + 1}
          </span>
          {segments.length === 0 ? (
            <span>&nbsp;</span>
          ) : (
            segments.map((seg) =>
              seg.annotation ? (
                <HighlightSpan
                  key={seg.index}
                  annotation={seg.annotation}
                  isActive={activeId === seg.annotation.id}
                  onClick={() => onAnnotationClick?.(seg.annotation!.id)}
                  showHandledBadge={showHandledBadge}
                >
                  {seg.text}
                </HighlightSpan>
              ) : (
                <span key={seg.index} dangerouslySetInnerHTML={{ __html: escapeHtml(seg.text) }} />
              )
            )
          )}
        </p>
      ))}
    </div>
  );
}

function HighlightSpan({
  annotation,
  isActive,
  onClick,
  showHandledBadge,
  children,
}: {
  annotation: Annotation;
  isActive?: boolean;
  onClick?: () => void;
  showHandledBadge?: boolean;
  children: string;
}) {
  const meta = CATEGORY_META[annotation.category as RiskCategory];
  const handled = annotation.editorStatus === 'handled';
  const reviewed = annotation.doctorDecision !== 'pending';
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'relative inline align-baseline rounded px-1 py-0.5 cursor-pointer transition-all duration-200 border-b-2 -mb-[3px]',
        meta.bg,
        meta.border,
        'hover:brightness-95',
        isActive && 'ring-2 ring-offset-1 scale-[1.02] shadow-sm',
        handled && 'opacity-70 line-through decoration-slate-400/60'
      )}
      style={{
        borderBottomColor: meta.color,
        boxShadow: isActive ? `0 0 0 3px ${meta.color}33` : undefined,
      }}
      title={`${meta.label} · ${annotation.riskLevel}风险`}
    >
      <span dangerouslySetInnerHTML={{ __html: escapeHtml(children) }} />
      {showHandledBadge && handled && (
        <sup
          className="ml-1 inline-block px-1 py-px rounded text-[9px] font-semibold bg-emerald-500 text-white not-italic align-super"
          title={EDITOR_STATUS_META.handled.label}
        >
          已处理
        </sup>
      )}
      {reviewed && (
        <sup
          className={clsx(
            'ml-1 inline-block px-1 py-px rounded text-[9px] font-semibold text-white not-italic align-super',
            annotation.doctorDecision === 'approved' && 'bg-emerald-500',
            annotation.doctorDecision === 'needs_rewrite' && 'bg-amber-500',
            annotation.doctorDecision === 'delete' && 'bg-rose-500'
          )}
          title={DOCTOR_DECISION_META[annotation.doctorDecision].label}
        >
          {DOCTOR_DECISION_META[annotation.doctorDecision].label}
        </sup>
      )}
    </button>
  );
}
