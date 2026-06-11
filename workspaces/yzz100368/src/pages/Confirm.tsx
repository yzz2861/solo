import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  AlertTriangle,
  Edit3,
  Save,
  History,
} from 'lucide-react';
import { fetchRecord, confirmRecord, fetchPatientRecords } from '@/lib/api';
import { ConfidenceBadge } from '@/components/Badges';
import { useAppStore } from '@/store';
import { FIELD_LABELS } from '@shared/types';
import type { FieldType } from '@shared/types';
import { cn } from '@/lib/utils';

export default function ConfirmPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { currentRecord, setCurrentRecord } = useAppStore();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [otherRecords, setOtherRecords] = useState<any[]>([]);
  const [showWarn, setShowWarn] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchRecord(id).then((r) => {
      setCurrentRecord(r);
      const initChecked: any = {};
      const initEdits: any = {};
      r.extractions.forEach((f) => {
        initChecked[f.id] = f.confidence === 'high';
        initEdits[f.id] = f.value;
      });
      setChecked(initChecked);
      setEdits(initEdits);
      if (r.patientId) {
        fetchPatientRecords(r.patientId).then((list) => {
          const others = list.filter((x) => x.id !== id);
          if (others.length > 0) setOtherRecords(others);
        });
      }
    });
  }, [id, setCurrentRecord]);

  const handleSubmit = async () => {
    const allChecked = Object.values(checked).every(Boolean);
    if (!allChecked) {
      setShowWarn(true);
      return;
    }
    setSubmitting(true);
    try {
      const corrections: any[] = [];
      currentRecord?.extractions.forEach((f) => {
        if (edits[f.id] !== f.value) {
          corrections.push({
            extractionId: f.id,
            newValue: edits[f.id],
            reason: reasons[f.id] || '',
          });
        }
      });
      await confirmRecord(id, corrections, '录入护士-王琳');
      navigate(`/record/${id}/history`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!currentRecord) return <div className="p-8 text-center text-slate-400">加载中...</div>;

  const { patient, extractions, visitDate } = currentRecord;
  const total = extractions.length;
  const done = Object.values(checked).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={`/record/${id}/extract`} className="text-slate-500 hover:text-slate-700">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-lg font-serif font-semibold text-slate-900">
                人工确认 · {patient?.name}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                就诊 {visitDate} · 请逐条核对，低把握项务必确认
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-slate-600">
              已确认 <span className="font-semibold text-medical-700">{done}</span> / {total}
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-life-600 hover:bg-life-700 disabled:bg-slate-300 text-white px-5 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 11-6.219-8.56" />
                  </svg>
                  提交中
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  确认并归档
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="p-8 max-w-[1080px] mx-auto space-y-5">
        {otherRecords.length > 0 && (
          <div className="bg-warn-50 border border-warn-200 rounded-xl p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-warn-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-medium text-warn-800">该患者还有 {otherRecords.length} 条历史就诊记录</div>
              <div className="text-xs text-warn-700 mt-1">
                系统已将本次独立保存，<strong>未与历史记录合并</strong>。点击查看：
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {otherRecords.map((r) => (
                  <Link
                    key={r.id}
                    to={`/record/${r.id}/history`}
                    className="text-xs px-2.5 py-1 rounded bg-white border border-warn-300 text-warn-700 hover:bg-warn-100"
                  >
                    {r.visitDate} 就诊记录
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {showWarn && (
          <div className="bg-danger-50 border border-danger-200 rounded-xl p-4 flex gap-3 items-center">
            <AlertTriangle className="w-5 h-5 text-danger-600 shrink-0" />
            <div className="text-sm text-danger-700 flex-1">
              仍有字段未确认，请点击每项右侧的「确认无误」勾选。低把握项请先修正内容再确认。
            </div>
            <button onClick={() => setShowWarn(false)} className="text-xs text-danger-600 hover:text-danger-700">
              知道了
            </button>
          </div>
        )}

        {extractions.map((f) => (
          <div
            key={f.id}
            className={cn(
              'bg-white rounded-xl shadow-card border transition-all',
              checked[f.id] ? 'border-life-200' : f.confidence === 'low' ? 'border-warn-300' : 'border-slate-200',
            )}
          >
            <div className="p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-9 h-9 rounded-lg flex items-center justify-center transition-colors',
                      checked[f.id]
                        ? 'bg-life-100 text-life-700'
                        : f.confidence === 'low'
                        ? 'bg-warn-100 text-warn-600'
                        : 'bg-medical-100 text-medical-700',
                    )}
                  >
                    {checked[f.id] ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <Edit3 className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif font-semibold text-slate-900">{FIELD_LABELS[f.fieldType as FieldType]}</h3>
                      <ConfidenceBadge level={f.confidence} />
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      OCR原始：<span className="font-mono">{f.originalRaw || f.value}</span>
                    </p>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={!!checked[f.id]}
                    onChange={(e) => setChecked({ ...checked, [f.id]: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-life-600 focus:ring-life-500"
                  />
                  <span className="text-sm text-slate-600">确认无误</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500 block mb-1.5">系统抽取值</label>
                  <div className="p-3 bg-slate-50 rounded-md border border-slate-200 text-sm text-slate-500 line-through">
                    {f.value}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1.5">确认值（可修改）</label>
                  <input
                    type="text"
                    value={edits[f.id] || ''}
                    onChange={(e) => setEdits({ ...edits, [f.id]: e.target.value })}
                    className={cn(
                      'w-full p-3 rounded-md border text-sm focus:outline-none focus:ring-2 transition-colors',
                      edits[f.id] !== f.value
                        ? 'border-life-400 ring-life-100 bg-life-50/30'
                        : 'border-slate-200 focus:ring-medical-500/30 focus:border-medical-500',
                    )}
                  />
                </div>
              </div>

              {edits[f.id] !== f.value && (
                <div className="mt-3">
                  <label className="text-xs text-slate-500 block mb-1.5">修改原因（质控可查）</label>
                  <input
                    type="text"
                    value={reasons[f.id] || ''}
                    onChange={(e) => setReasons({ ...reasons, [f.id]: e.target.value })}
                    placeholder="例如：原字迹不清，电话确认患者"
                    className="w-full p-2.5 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-medical-500/30 focus:border-medical-500"
                  />
                </div>
              )}

              {f.warnings.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {f.warnings.map((w, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-warn-50 text-warn-700 text-xs border border-warn-200"
                    >
                      <AlertTriangle className="w-3 h-3" />
                      {w}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-8 py-3 flex items-center justify-between">
        <div className="text-sm text-slate-500 flex items-center gap-2">
          <History className="w-4 h-4" />
          所有修改将记录历史，质控护士可抽查
        </div>
        <div className="flex items-center gap-3">
          <Link to={`/record/${id}/history`} className="text-sm text-slate-500 hover:text-slate-700">
            查看修改历史
          </Link>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-life-600 hover:bg-life-700 disabled:bg-slate-300 text-white px-6 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors"
          >
            <Check className="w-4 h-4" />
            确认并归档
          </button>
        </div>
      </div>
    </div>
  );
}
