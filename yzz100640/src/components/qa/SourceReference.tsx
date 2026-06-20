import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import SourceBadge from '@/components/SourceBadge';
import type { QARecord } from '@/types';
import { cn } from '@/lib/utils';

interface SourceReferenceProps {
  source: QARecord['sources'][number];
  delay?: number;
}

export default function SourceReference({ source, delay }: SourceReferenceProps) {
  const [expanded, setExpanded] = useState(true);
  const { sourceType, sourceName, snippet, page } = source;

  return (
    <div
      className="card mb-3 animate-fade-in-up"
      style={{ animationDelay: `${delay ?? 0}s` }}
    >
      <div
        className="flex items-center justify-between p-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <SourceBadge sourceType={sourceType} sourceName={sourceName} />
          {page !== undefined && (
            <span className="chip-default">页：{page}</span>
          )}
        </div>
        <ChevronDown
          className={cn(
            'w-5 h-5 text-leaf-500 transition-transform flex-shrink-0 ml-2',
            expanded && 'rotate-180'
          )}
        />
      </div>
      {expanded && (
        <div className="p-4 pt-0 text-sm text-leaf-800 leading-relaxed bg-leaf-50/50 rounded-b-lg whitespace-pre-wrap">
          {snippet}
        </div>
      )}
    </div>
  );
}
