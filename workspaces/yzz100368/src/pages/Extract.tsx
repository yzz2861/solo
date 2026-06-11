import { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  FileText,
  MessageSquareHeart,
  Pill,
  ShieldAlert,
  CalendarClock,
} from 'lucide-react';
import { extractRecord, fetchRecord } from '@/lib/api';
import { ConfidenceBadge, WarningTag } from '@/components/Badges';
import { useAppStore } from '@/store';
import type { ExtractedField, FieldType } from '@shared/types';
import { FIELD_LABELS } from '@shared/types';
import { cn } from '@/lib/utils';

const FIELD_ICONS: Record<FieldType, any> = {
  chief_complaint: MessageSquareHeart,
  diagnosis: FileText,
  medication: Pill,
  allergy: ShieldAlert,
  followup: CalendarClock,
};

const FIELD_COLORS: Record<FieldType, string> = {
  chief_complaint: 'medical',
  diagnosis: 'life',
  medication: 'warn',
  allergy: 'danger',
  followup: 'purple',
};

export default function ExtractPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { currentRecord, setCurrentRecord } = useAppStore();
  const [extracting, setExtracting] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!id) return;
    if (currentRecord?.id === id && currentRecord.extractions.length > 0) return;

    fetchRecord(id).then((r) => {
      setCurrentRecord(r);
      if (r.status === 'uploaded') {
        runExtraction();
      }
    });
  }, [id, currentRecord?.id, setCurrentRecord]);

  const runExtraction = async () => {
    setExtracting(true);
    setProgress(0);
    const timer = setInterval(() => setProgress((p) => Math.min(p + 8, 95)), 120);
    try {
      const r = await extractRecord(id);
      setCurrentRecord(r);
      setProgress(100);
      setTimeout(() => setExtracting(false), 600);
    } finally {
      clearInterval(timer);
    }
  };

  const highlightedText = useMemo(() => {
    if (!currentRecord?.sourceContent || currentRecord.sourceType !== 'text') return null;
    const text = currentRecord.sourceContent;
    const sorted = [...currentRecord.extractions].sort(
      (a, b) => (a.evidence.startIndex ?? 0) - (b.evidence.startIndex ?? 0),
    );
    const fragments: React.ReactNode[] = [];
    let lastEnd = 0;
    sorted.forEach((f, i) => {
      const start = f.evidence.startIndex ?? 0;
      const end = f.evidence.endIndex ?? 0;
      if (start > lastEnd) {
        fragments.push(<span key={`t-${i}`}>{text.slice(lastEnd, start)}</span>);
      }
      fragments.push(
        <span key={`h-${i}`} className={`highlight-${f.fieldType}`} title={FIELD_LABELS[f.fieldType]}>
          {text.slice(start, end)}
        </span>,
      );
      lastEnd = end;
    });
    if (lastEnd < text.length) fragments.push(<span key="tail">{text.slice(lastEnd)}</span>);
    return fragments;
  }, [currentRecord]);

  if (!currentRecord) {
    return (
      <div className="p-8 text-center text-slate-400">加载中...</div>
    );
  }

  const { patient, extractions, visitDate } = currentRecord;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-slate-500 hover:text-slate-700">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-lg font-serif font-semibold text-slate-900">
                {patient?.name} · 字段抽取结果
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {patient?.gender} · {patient?.age}岁 · 身份证 {patient?.idCardMasked} · 就诊 {visitDate}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {extracting ? (
              <div className="flex items-center gap-2 text-sm text-medical-700">
                <Sparkles className="w-4 h-4 animate-spin" />
                智能抽取中
                <div className="w-40 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-medical-600 rounded-full transition-all duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-life-700">
                <CheckCircle2 className="w-4 h-4" />
                抽取完成，共 {extractions.length} 项
              </div>
            )}
            <button
              onClick={() => navigate(`/record/${id}/confirm`)}
              disabled={extracting}
              className="bg-medical-800 hover:bg-medical-900 disabled:bg-slate-300 text-white px-5 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors"
            >
              下一步：人工确认
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="p-8 grid grid-cols-5 gap-6 max-w-[1600px] mx-auto">
        <div className="col-span-2">
          <div className="bg-white rounded-xl shadow-card border border-slate-100 overflow-hidden sticky top-24">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-serif font-semibold text-slate-900 text-sm">原始内容（标注依据）</h2>
              <span className="text-xs text-slate-400">{currentRecord.sourceType === 'text' ? '文本录入' : '照片'}</span>
            </div>
            <div className="p-5 max-h-[70vh] overflow-y-auto">
              {currentRecord.sourceType === 'image' ? (
                <img src={currentRecord.sourceContent} alt="病历" className="w-full rounded shadow" />
              ) : (
                <div className="text-sm leading-7 text-slate-700 whitespace-pre-wrap font-mono">
                  {highlightedText}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-span-3 space-y-4">
          {extractions.length === 0 && extracting && (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-100 p-5 animate-pulse">
                  <div className="h-4 w-32 bg-slate-200 rounded mb-3" />
                  <div className="h-5 w-3/4 bg-slate-100 rounded mb-2" />
                  <div className="h-4 w-1/2 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          )}
          {extractions.map((f, i) => (
            <FieldCard key={f.id} field={f} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

function FieldCard({ field, index }: { field: ExtractedField; index: number }) {
  const Icon = FIELD_ICONS[field.fieldType];
  const color = FIELD_COLORS[field.fieldType];
  const isLow = field.confidence === 'low';

  const colorMap: any = {
    medical: 'bg-medical-50 text-medical-700 border-medical-200',
    life: 'bg-life-50 text-life-700 border-life-200',
    warn: 'bg-warn-50 text-warn-700 border-warn-200',
    danger: 'bg-danger-50 text-danger-700 border-danger-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  return (
    <div
      className={cn(
        'bg-white rounded-xl shadow-card border transition-all animate-fade-in-up',
        isLow ? 'border-warn-300 animate-pulse-soft' : 'border-slate-100 hover:shadow-hover hover:-translate-y-0.5',
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center border', colorMap[color])}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-semibold text-slate-900">{FIELD_LABELS[field.fieldType]}</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                依据：「{field.evidence.text || field.originalRaw}」
              </p>
            </div>
          </div>
          <ConfidenceBadge level={field.confidence} />
        </div>

        <div className={cn('p-4 rounded-lg border', colorMap[color])}>
          <p className="text-sm leading-relaxed">{field.value}</p>
        </div>

        {field.warnings.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {field.warnings.map((w, i) => (
              <WarningTag key={i} text={w} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
