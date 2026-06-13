import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useAppStore } from '@/store';

export default function GlobalAlertBar() {
  const [open, setOpen] = useState(false);
  const conflicts = useAppStore((s) => s.getAllConflicts());
  const errors = conflicts.filter((c) => c.severity === 'error');
  const warnings = conflicts.filter((c) => c.severity === 'warning');
  const total = conflicts.length;

  if (total === 0) return null;

  return (
    <div className="no-print">
      <div className="bg-coral-500/95 text-white px-5 py-2.5 flex items-center gap-3 shadow-md">
        <div className="relative">
          <AlertTriangle className="w-5 h-5 animate-pulse-slow" />
        </div>
        <div className="flex-1 text-sm">
          <span className="font-semibold">检测到 {total} 项排班异常</span>
          <span className="opacity-90">：{errors.length} 项错误 · {warnings.length} 项警告</span>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 text-xs bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-md transition"
        >
          {open ? '收起' : '查看详情'}
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>
      {open && (
        <div className="bg-white border-b border-coral-100 px-5 py-3 max-h-56 overflow-auto animate-fade-in">
          <ul className="space-y-2 text-sm">
            {conflicts.map((c) => (
              <li
                key={c.id}
                className={`flex items-start gap-2 ${
                  c.severity === 'error' ? 'text-coral-700' : 'text-amber-700'
                }`}
              >
                <span
                  className={`mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                    c.severity === 'error' ? 'bg-coral-100 text-coral-700' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {c.severity === 'error' ? '错误' : '警告'}
                </span>
                <span className="flex-1">{c.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
