import { useState, useCallback, useRef } from 'react';
import { useRecordStore } from '@/store/recordStore';
import { fmt } from '@/utils/calculation';
import type { CalculationRecord } from '@/types';
import {
  ClipboardList,
  Printer,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CircleAlert,
  FileText,
  X,
  Droplets,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Records() {
  const { records, deleteRecord, clearRecords } = useRecordStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [qcRecord, setQcRecord] = useState<CalculationRecord | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const handlePrintHandover = useCallback(() => {
    if (!printRef.current) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>交班记录</title>
      <style>
        body { font-family: -apple-system, sans-serif; padding: 20px; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; font-size: 13px; }
        th { background: #f0f0f0; font-weight: 600; }
        h2 { font-size: 16px; margin-bottom: 4px; }
        .sig { margin-top: 20px; display: flex; gap: 40px; font-size: 13px; }
        .sig span { border-bottom: 1px solid #999; padding-bottom: 2px; }
      </style></head><body>
      ${printRef.current.innerHTML}
      </body></html>
    `);
    win.document.close();
    win.print();
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      if (window.confirm('确定删除此记录？')) {
        deleteRecord(id);
        if (expandedId === id) setExpandedId(null);
        if (qcRecord?.id === id) setQcRecord(null);
      }
    },
    [deleteRecord, expandedId, qcRecord]
  );

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-700">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">核对记录</h1>
              <p className="text-xs text-slate-400">共 {records.length} 条</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <Droplets className="w-4 h-4" />
              剂量核对
            </Link>
            {records.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm('确定清空所有记录？')) clearRecords();
                }}
                className="text-xs text-red-500 hover:text-red-700 font-medium"
              >
                清空全部
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <FileText className="w-12 h-12 mb-3" />
            <p className="text-sm">暂无核对记录</p>
          </div>
        ) : (
          <div className="space-y-3">
            {records.map((rec) => (
              <RecordCard
                key={rec.id}
                record={rec}
                expanded={expandedId === rec.id}
                onToggle={() => toggleExpand(rec.id)}
                onDelete={() => handleDelete(rec.id)}
                onPrint={() => {
                  setQcRecord(rec);
                  setTimeout(handlePrintHandover, 100);
                }}
                onQc={() => setQcRecord(rec)}
              />
            ))}
          </div>
        )}
      </main>

      {qcRecord && (
        <QcDetailModal record={qcRecord} onClose={() => setQcRecord(null)} />
      )}

      <div ref={printRef} className="hidden">
        {records.slice(0, 5).map((rec) => (
          <div key={rec.id} className="mb-4">
            <h2>
              {rec.input.drugName || '未命名'} — {rec.confirmedAt ? new Date(rec.confirmedAt).toLocaleString('zh-CN') : ''}
            </h2>
            <table>
              <thead>
                <tr>
                  <th>项目</th>
                  <th>值</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>泵速</td><td>{rec.result.pumpRateMlPerH !== null ? fmt(rec.result.pumpRateMlPerH) : '—'} mL/h</td></tr>
                <tr><td>体重剂量</td><td>{rec.result.weightDoseMgKgMin !== null ? fmt(rec.result.weightDoseMgKgMin) : '—'} mg/kg/min</td></tr>
                <tr><td>体重剂量</td><td>{rec.result.weightDoseUgKgH !== null ? fmt(rec.result.weightDoseUgKgH) : '—'} μg/kg/h</td></tr>
                <tr><td>确认人</td><td>{rec.confirmedBy}</td></tr>
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecordCard({
  record: rec,
  expanded,
  onToggle,
  onDelete,
  onPrint,
  onQc,
}: {
  record: CalculationRecord;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onPrint: () => void;
  onQc: () => void;
}) {
  const hasWarning = rec.result.warnings.length > 0;
  const time = new Date(rec.createdAt).toLocaleString('zh-CN');

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div
        className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800 truncate">
              {rec.input.drugName || '未命名药品'}
            </span>
            {hasWarning && (
              <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                <AlertTriangle className="w-3 h-3" />
                有提示
              </span>
            )}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            {time} · 确认人: {rec.confirmedBy}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-mono text-xl font-bold text-blue-600">
            {rec.result.pumpRateMlPerH !== null ? fmt(rec.result.pumpRateMlPerH) : '—'}
          </div>
          <div className="text-xs text-slate-400 font-mono">mL/h</div>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-slate-400 shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
        )}
      </div>

      {expanded && (
        <div className="border-t border-slate-100 px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <Detail label="医嘱剂量" value={`${rec.input.doseValue} ${rec.input.doseUnit}`} />
            <Detail label="药液浓度" value={`${rec.input.concentration} ${rec.input.concentrationUnit}`} />
            <Detail label="体重" value={rec.input.weight ? `${rec.input.weight} kg` : '未填写'} />
            <Detail label="计划时间" value={`${rec.input.plannedTime} ${rec.input.timeUnit}`} />
          </div>

          {rec.result.warnings.length > 0 && (
            <div className="space-y-1.5">
              {rec.result.warnings.map((w, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg"
                  style={{
                    backgroundColor: w.level === 'error' ? '#FEF2F2' : '#FFFBEB',
                  }}
                >
                  {w.level === 'error' ? (
                    <CircleAlert className="w-3.5 h-3.5 text-red-500" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  )}
                  <span style={{ color: w.level === 'error' ? '#991B1B' : '#92400E' }}>
                    {w.message}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPrint();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              打印交班
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onQc();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              质控详情
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 transition-colors ml-auto"
            >
              <Trash2 className="w-3.5 h-3.5" />
              删除
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-slate-400">{label}</div>
      <div className="font-mono text-slate-700 text-sm mt-0.5">{value}</div>
    </div>
  );
}

function QcDetailModal({ record: rec, onClose }: { record: CalculationRecord; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
          <h2 className="text-base font-bold text-slate-800">质控详情</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-5">
          <Section title="原始输入">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Detail label="药品名称" value={rec.input.drugName || '—'} />
              <Detail label="医嘱剂量" value={`${rec.input.doseValue} ${rec.input.doseUnit}`} />
              <Detail label="药液浓度" value={`${rec.input.concentration} ${rec.input.concentrationUnit}`} />
              <Detail label="药液总量" value={`${rec.input.totalVolume} ${rec.input.volumeUnit}`} />
              <Detail label="患者体重" value={rec.input.weight ? `${rec.input.weight} ${rec.input.weightUnit}` : '未填写'} />
              <Detail label="计划时间" value={`${rec.input.plannedTime} ${rec.input.timeUnit}`} />
            </div>
          </Section>

          <Section title="计算路径">
            <div className="space-y-2">
              {rec.result.steps.map((step, i) => (
                <div key={i} className="flex items-start gap-3 bg-slate-50 rounded-lg px-4 py-2.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-slate-400 font-medium">{step.label}</div>
                    <div className="font-mono text-xs text-slate-600 break-all">{step.formula}</div>
                  </div>
                  <div className="font-mono text-xs font-semibold text-blue-700 shrink-0">
                    {step.result}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="计算结果">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <Detail label="泵速" value={rec.result.pumpRateMlPerH !== null ? `${fmt(rec.result.pumpRateMlPerH)} mL/h` : '—'} />
              <Detail label="体重剂量" value={rec.result.weightDoseMgKgMin !== null ? `${fmt(rec.result.weightDoseMgKgMin)} mg/kg/min` : '—'} />
              <Detail label="体重剂量" value={rec.result.weightDoseUgKgH !== null ? `${fmt(rec.result.weightDoseUgKgH)} μg/kg/h` : '—'} />
            </div>
          </Section>

          {rec.result.warnings.length > 0 && (
            <Section title="安全提示">
              <div className="space-y-1.5">
                {rec.result.warnings.map((w, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg"
                    style={{
                      backgroundColor: w.level === 'error' ? '#FEF2F2' : '#FFFBEB',
                    }}
                  >
                    {w.level === 'error' ? (
                      <CircleAlert className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    )}
                    <span style={{ color: w.level === 'error' ? '#991B1B' : '#92400E' }}>
                      {w.message}
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          <Section title="确认信息">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Detail label="确认人" value={rec.confirmedBy} />
              <Detail label="确认时间" value={new Date(rec.confirmedAt).toLocaleString('zh-CN')} />
              <Detail label="记录 ID" value={rec.id.slice(0, 8)} />
              <Detail label="创建时间" value={new Date(rec.createdAt).toLocaleString('zh-CN')} />
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-500 mb-2 tracking-wide uppercase">{title}</h3>
      {children}
    </div>
  );
}
