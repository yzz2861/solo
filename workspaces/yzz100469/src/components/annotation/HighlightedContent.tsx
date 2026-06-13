import { useMemo, useRef, useState, useEffect } from 'react';
import type { Annotation, AnnotationType } from '@/types';
import { ANNOTATION_TYPE_LABELS, ANNOTATION_TYPE_COLORS } from '@/types';

interface Props {
  paragraphs: string[];
  annotations: Annotation[];
  content: string;
  selectedAnnotationId: string | null;
  onSelectAnnotation: (id: string | null) => void;
  onAddAnnotation: (text: string, start: number, end: number, paragraphIndex: number) => void;
}

interface Segment {
  text: string;
  start: number;
  end: number;
  annotation?: Annotation;
}

function buildSegments(paragraph: string, paraOffset: number, paraAnns: Annotation[]): Segment[] {
  const segments: Segment[] = [];
  const sortedAnns = [...paraAnns].sort((a, b) => a.start - b.start);
  let cursor = paraOffset;

  for (const ann of sortedAnns) {
    if (ann.start > cursor) {
      segments.push({
        text: paragraph.slice(cursor - paraOffset, ann.start - paraOffset),
        start: cursor,
        end: ann.start,
      });
    }
    segments.push({
      text: paragraph.slice(ann.start - paraOffset, ann.end - paraOffset),
      start: ann.start,
      end: ann.end,
      annotation: ann,
    });
    cursor = Math.max(cursor, ann.end);
  }

  if (cursor < paraOffset + paragraph.length) {
    segments.push({
      text: paragraph.slice(cursor - paraOffset),
      start: cursor,
      end: paraOffset + paragraph.length,
    });
  }

  return segments;
}

const TYPE_CLASS: Record<AnnotationType, string> = {
  evidence: 'highlight-evidence',
  no_evidence: 'highlight-noevidence',
  bias: 'highlight-bias',
  follow_up: 'highlight-followup',
};

export function HighlightedContent({
  paragraphs,
  annotations,
  content,
  selectedAnnotationId,
  onSelectAnnotation,
  onAddAnnotation,
}: Props) {
  const [selectionInfo, setSelectionInfo] = useState<{ text: string; start: number; end: number; paraIdx: number; rect: DOMRect } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const paraOffsets = useMemo(() => {
    const offsets: number[] = [];
    let searchFrom = 0;
    for (const para of paragraphs) {
      const start = content.indexOf(para, searchFrom);
      offsets.push(start !== -1 ? start : searchFrom);
      searchFrom = start !== -1 ? start + para.length : searchFrom;
    }
    return offsets;
  }, [paragraphs, content]);

  const annsByPara = useMemo(() => {
    const map = new Map<number, Annotation[]>();
    annotations.forEach(ann => {
      const list = map.get(ann.paragraphIndex) || [];
      list.push(ann);
      map.set(ann.paragraphIndex, list);
    });
    return map;
  }, [annotations]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (selectionInfo && !(e.target as HTMLElement).closest('.selection-popup')) {
        setSelectionInfo(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectionInfo]);

  const handleMouseUp = (e: React.MouseEvent, paraIdx: number) => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      setSelectionInfo(null);
      return;
    }

    const range = sel.getRangeAt(0);
    const text = sel.toString().trim();

    if (text.length >= 2 && text.length <= 200) {
      const paraOffset = paraOffsets[paraIdx];
      const paraEl = (e.currentTarget as HTMLElement);
      const textContent = paraEl.textContent || '';
      const preRange = document.createRange();
      preRange.selectNodeContents(paraEl);
      preRange.setEnd(range.startContainer, range.startOffset);
      const relStart = preRange.toString().length;
      const relEnd = relStart + text.length;

      const absStart = paraOffset + relStart;
      const absEnd = paraOffset + relEnd;

      if (absStart < absEnd) {
        const rect = range.getBoundingClientRect();
        const containerRect = contentRef.current?.getBoundingClientRect();
        if (containerRect) {
          setSelectionInfo({
            text,
            start: absStart,
            end: absEnd,
            paraIdx,
            rect: {
              top: rect.top - containerRect.top,
              left: rect.left - containerRect.left,
              width: rect.width,
              height: rect.height,
              bottom: rect.bottom - containerRect.top,
              right: rect.right - containerRect.left,
              x: rect.left - containerRect.left,
              y: rect.top - containerRect.top,
              toJSON: () => '',
            },
          });
        }
      }
    }
  };

  const handleQuickAnnotate = (type: AnnotationType) => {
    if (!selectionInfo) return;
    onAddAnnotation(selectionInfo.text, selectionInfo.start, selectionInfo.end, selectionInfo.paraIdx);
    setSelectionInfo(null);
    window.getSelection()?.removeAllRanges();
  };

  return (
    <div ref={contentRef} className="relative">
      <div className="space-y-4">
        {paragraphs.map((para, paraIdx) => {
          const paraOffset = paraOffsets[paraIdx];
          const paraAnns = annsByPara.get(paraIdx) || [];
          const segments = buildSegments(para, paraOffset, paraAnns);

          return (
            <div
              key={paraIdx}
              className="relative group"
              onMouseUp={(e) => handleMouseUp(e, paraIdx)}
            >
              <div className="absolute -left-6 top-0.5 text-xs text-neutral-300 font-mono group-hover:text-neutral-400 transition-colors">
                {paraIdx + 1}
              </div>
              <p
                className="text-neutral-700 leading-8 text-[15px] pl-0 select-text cursor-text"
                style={{ wordBreak: 'break-word' }}
              >
                {segments.map((seg, segIdx) => {
                  if (seg.annotation) {
                    const isSelected = seg.annotation.id === selectedAnnotationId;
                    const annColor = ANNOTATION_TYPE_COLORS[seg.annotation.type];
                    return (
                      <span
                        key={segIdx}
                        className={`${TYPE_CLASS[seg.annotation.type]} cursor-pointer transition-all duration-150 ${
                          isSelected ? 'ring-2 ring-offset-1 ' + annColor.border + ' rounded' : 'hover:opacity-80'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectAnnotation(seg.annotation!.id);
                        }}
                      >
                        {seg.text}
                      </span>
                    );
                  }
                  return <span key={segIdx}>{seg.text}</span>;
                })}
              </p>
            </div>
          );
        })}
      </div>

      {selectionInfo && (
        <div
          className="selection-popup absolute z-50 flex items-center gap-1 bg-neutral-900 text-white rounded-xl shadow-elevated px-2 py-1.5 animate-fade-in"
          style={{
            top: selectionInfo.rect.top - 44,
            left: Math.max(0, selectionInfo.rect.left + selectionInfo.rect.width / 2 - 140),
          }}
        >
          <span className="text-[11px] text-neutral-300 px-2 py-0.5">标注为:</span>
          {(['evidence', 'no_evidence', 'bias'] as AnnotationType[]).map(type => (
            <button
              key={type}
              onClick={() => handleQuickAnnotate(type)}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors hover:bg-white/10 ${ANNOTATION_TYPE_COLORS[type].text}`}
            >
              {ANNOTATION_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
