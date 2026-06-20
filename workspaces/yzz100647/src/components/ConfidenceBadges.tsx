import {
  LowConfidenceReason,
  LOW_CONFIDENCE_LABELS,
  MaterialType,
  MATERIAL_TYPE_LABELS,
} from '@/types';
import { AlertTriangle, AlertCircle, Scissors, Layers, Search, FileQuestion, MessageSquare } from 'lucide-react';

interface Props {
  reasons: LowConfidenceReason[];
  materialConfidence: number;
  orderNoConfidence: number;
}

const reasonConfig: Record<LowConfidenceReason, { Icon: any; cls: string; dot: string }> = {
  [LowConfidenceReason.CROPPED]: {
    Icon: Scissors,
    cls: 'bg-danger-50 text-danger-700 border-danger-200 hover:bg-danger-100',
    dot: 'bg-danger-500',
  },
  [LowConfidenceReason.MULTIPLE_PAGES]: {
    Icon: Layers,
    cls: 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100',
    dot: 'bg-violet-500',
  },
  [LowConfidenceReason.ORDER_NO_UNCLEAR]: {
    Icon: Search,
    cls: 'bg-warn-50 text-warn-700 border-warn-200 hover:bg-warn-100',
    dot: 'bg-warn-500',
  },
  [LowConfidenceReason.TYPE_UNCERTAIN]: {
    Icon: FileQuestion,
    cls: 'bg-zinc-100 text-zinc-700 border-zinc-300 hover:bg-zinc-200',
    dot: 'bg-zinc-500',
  },
  [LowConfidenceReason.LOW_TEXT_VOLUME]: {
    Icon: MessageSquare,
    cls: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
    dot: 'bg-amber-500',
  },
};

export default function ConfidenceBadges({ reasons, materialConfidence, orderNoConfidence }: Props) {
  const avg = (materialConfidence + (orderNoConfidence || materialConfidence)) / 2;
  const overallColor = avg >= 0.8
    ? 'bg-emerald-500'
    : avg >= 0.55
    ? 'bg-warn-500'
    : 'bg-danger-500';

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <div className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2 py-0.5" title={`综合置信度 ${Math.round(avg * 100)}%`}>
        <div className={`h-1.5 w-1.5 rounded-full ${overallColor}`} />
        <span className="text-[10.5px] font-semibold text-zinc-600">
          {Math.round(avg * 100)}%
        </span>
      </div>
      {reasons.map((r) => {
        const cfg = reasonConfig[r];
        const Icon = cfg.Icon;
        return (
          <span
            key={r}
            className={`chip border cursor-help transition-colors ${cfg.cls}`}
            title={LOW_CONFIDENCE_LABELS[r]}
          >
            <Icon className="h-3 w-3" />
            <span className="text-[11px] font-medium">{LOW_CONFIDENCE_LABELS[r]}</span>
          </span>
        );
      })}
    </div>
  );
}

export function TypeConfidenceBar({ type, confidence }: { type: MaterialType; confidence: number }) {
  const color = confidence >= 0.8
    ? 'bg-emerald-500'
    : confidence >= 0.55
    ? 'bg-warn-500'
    : 'bg-danger-400';

  return (
    <div className="flex items-center gap-2" title={`${MATERIAL_TYPE_LABELS[type]} 置信度 ${Math.round(confidence * 100)}%`}>
      <div className="h-1.5 flex-1 rounded-full bg-zinc-100 overflow-hidden min-w-[48px]">
        <div
          className={`h-full ${color} transition-all duration-300`}
          style={{ width: `${Math.max(8, confidence * 100)}%` }}
        />
      </div>
      <span className="text-[10.5px] font-medium tabular-nums text-zinc-500 w-8">
        {Math.round(confidence * 100)}
      </span>
    </div>
  );
}

export function ConfidenceSummary({ countLow, countTotal }: { countLow: number; countTotal: number }) {
  if (countTotal === 0) return null;
  if (countLow === 0) {
    return (
      <div className="inline-flex items-center gap-1.5 chip border-0 bg-emerald-50 text-emerald-700 px-2.5 py-1">
        <AlertCircle className="h-3.5 w-3.5" />
        <span className="text-[11.5px] font-medium">识别全部高置信</span>
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-1.5 chip border-0 bg-danger-50 text-danger-700 px-2.5 py-1">
      <AlertTriangle className="h-3.5 w-3.5" />
      <span className="text-[11.5px] font-medium">
        {countLow} 个低置信 · 请人工复核
      </span>
    </div>
  );
}
