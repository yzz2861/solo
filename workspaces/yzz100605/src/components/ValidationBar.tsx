import { useBufferStore } from '@/store/useBufferStore';
import { validate } from '@/engine/validate';
import { AlertTriangle, Info, XCircle, CheckCircle2 } from 'lucide-react';

export default function ValidationBar() {
  const input = useBufferStore((s) => s.input);

  const messages = validate(input);
  const hasErrors = messages.some((m) => m.level === 'error');
  const hasWarnings = messages.some((m) => m.level === 'warning');
  const hasInfo = messages.some((m) => m.level === 'info');

  if (messages.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <span className="text-sm font-medium text-green-700">参数校验通过，可以计算</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {hasErrors && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <div className="space-y-1">
            {messages
              .filter((m) => m.level === 'error')
              .map((m, i) => (
                <div key={i}>
                  <p className="text-sm font-semibold text-red-700">{m.message}</p>
                  <p className="text-xs text-red-600">{m.suggestion}</p>
                </div>
              ))}
          </div>
        </div>
      )}
      {hasWarnings && (
        <div className="flex items-start gap-2 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" />
          <div className="space-y-1">
            {messages
              .filter((m) => m.level === 'warning')
              .map((m, i) => (
                <div key={i}>
                  <p className="text-sm font-semibold text-yellow-700">{m.message}</p>
                  <p className="text-xs text-yellow-600">{m.suggestion}</p>
                </div>
              ))}
          </div>
        </div>
      )}
      {hasInfo && (
        <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
          <div className="space-y-1">
            {messages
              .filter((m) => m.level === 'info')
              .map((m, i) => (
                <div key={i}>
                  <p className="text-sm font-semibold text-blue-700">{m.message}</p>
                  <p className="text-xs text-blue-600">{m.suggestion}</p>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
