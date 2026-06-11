import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  History,
  User,
  Calendar,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  FileText,
  MessageSquareHeart,
  Pill,
  ShieldAlert,
  CalendarClock,
} from 'lucide-react';
import { fetchRecord, fetchHistory } from '@/lib/api';
import { useAppStore } from '@/store';
import { FIELD_LABELS } from '@shared/types';
import type { FieldType, RevisionHistory, MedicalRecord } from '@shared/types';
import { cn } from '@/lib/utils';

const FIELD_ICONS: Record<FieldType, any> = {
  chief_complaint: MessageSquareHeart,
  diagnosis: FileText,
  medication: Pill,
  allergy: ShieldAlert,
  followup: CalendarClock,
};

export default function HistoryPage() {
  const { id = '' } = useParams();
  const { currentRecord, setCurrentRecord } = useAppStore();
  const [revisions, setRevisions] = useState<RevisionHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchRecord(id), fetchHistory(id)])
      .then(([record, hist]) => {
        setCurrentRecord(record);
        setRevisions(hist);
      })
      .finally(() => setLoading(false));
  }, [id, setCurrentRecord]);

  if (loading || !currentRecord) {
    return <div className="p-8 text-center text-slate-400">加载中...</div>;
  }

  const { patient, extractions, visitDate, status } = currentRecord;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/records" className="text-slate-500 hover:text-slate-700">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-lg font-serif font-semibold text-slate-900">
                修改历史 · {patient?.name}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                就诊 {visitDate} · 当前状态：{status === 'confirmed' ? '已确认归档' : status}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <History className="w-4 h-4" />
            共 {revisions.length} 条修改记录
          </div>
        </div>
      </header>

      <div className="p-8 max-w-[1200px] mx-auto grid grid-cols-5 gap-6">
        <div className="col-span-2 space-y-5">
          <div className="bg-white rounded-xl shadow-card border border-slate-100 p-5">
            <h2 className="font-serif font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-medical-700" />
              患者信息
            </h2>
            <div className="space-y-2.5">
              <InfoRow label="姓名" value={patient?.name || '-'} />
              <InfoRow label="性别/年龄" value={`${patient?.gender} · ${patient?.age}岁`} />
              <InfoRow label="身份证" value={patient?.idCardMasked || '-'} mono />
              <InfoRow label="联系电话" value={patient?.phoneMasked || '-'} mono />
              <InfoRow label="就诊日期" value={visitDate} />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-card border border-slate-100 p-5">
            <h2 className="font-serif font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-medical-700" />
              当前字段值
            </h2>
            <div className="space-y-3">
              {extractions.map((f) => {
                const Icon = FIELD_ICONS[f.fieldType];
                return (
                  <div key={f.id} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-3.5 h-3.5 text-medical-600" />
                      <span className="text-xs font-medium text-slate-700">{FIELD_LABELS[f.fieldType]}</span>
                    </div>
                    <div className="text-sm text-slate-800 leading-relaxed">{f.value}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="col-span-3">
          <div className="bg-white rounded-xl shadow-card border border-slate-100 p-5">
            <h2 className="font-serif font-semibold text-slate-900 mb-6 flex items-center gap-2">
              <History className="w-4 h-4 text-medical-700" />
              时间线 · 修改记录
            </h2>

            {revisions.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-14 h-14 rounded-full bg-life-50 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-7 h-7 text-life-600" />
                </div>
                <p className="text-sm font-medium text-slate-700">无修改记录</p>
                <p className="text-xs text-slate-400 mt-1">所有字段均以系统抽取值为准，护士未作修改</p>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-5 top-1 bottom-1 w-px bg-slate-200" />
                <div className="space-y-5">
                  {revisions.map((rv, i) => (
                    <RevisionItem key={rv.id} rv={rv} index={i} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={cn('text-sm text-slate-800', mono && 'font-mono')}>{value}</span>
    </div>
  );
}

function RevisionItem({ rv, index }: { rv: RevisionHistory; index: number }) {
  const Icon = FIELD_ICONS[rv.fieldType];
  return (
    <div className="relative pl-12 animate-fade-in-up" style={{ animationDelay: `${index * 80}ms` }}>
      <div className="absolute left-2.5 top-1.5 w-5 h-5 rounded-full bg-white border-2 border-medical-500 flex items-center justify-center">
        <Edit3 className="w-2.5 h-2.5 text-medical-600" />
      </div>
      <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-medical-50 text-medical-700 flex items-center justify-center border border-medical-100">
              <Icon className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-900">{FIELD_LABELS[rv.fieldType]}</div>
              <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                <User className="w-3 h-3" />
                {rv.operator}
                <span className="mx-1">·</span>
                <Calendar className="w-3 h-3" />
                {rv.operatedAt}
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-danger-50 border border-danger-100 p-3">
            <div className="text-xs text-danger-600 mb-1 font-medium">修改前（OCR）</div>
            <div className="text-sm text-danger-700 line-through">{rv.oldValue}</div>
          </div>
          <div className="rounded-lg bg-life-50 border border-life-100 p-3">
            <div className="text-xs text-life-700 mb-1 font-medium">修改后（护士确认）</div>
            <div className="text-sm text-life-800 font-medium">{rv.newValue}</div>
          </div>
        </div>
        {rv.reason && (
          <div className="mt-3 flex items-start gap-2 text-xs text-slate-600 bg-slate-50/60 rounded-md px-3 py-2 border border-slate-100">
            <AlertTriangle className="w-3.5 h-3.5 text-warn-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-medium">修改原因：</span>
              {rv.reason}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
