import { AlertTriangle, AlertCircle } from 'lucide-react';

interface Props {
  warnings: string[];
}

export default function WarningBanner({ warnings }: Props) {
  if (warnings.length === 0) return null;

  return (
    <div className="space-y-2 animate-fade-in">
      {warnings.map((w, idx) => {
        const isMultiHit = w.startsWith('🎯');
        return (
          <div
            key={idx}
            className={`flex items-start gap-2 px-3 py-2.5 rounded-lg text-sm animate-fade-in ${
              isMultiHit
                ? 'bg-purple-50 border border-purple-200 text-purple-800'
                : 'bg-amber-50 border-2 border-amber-300 text-amber-800'
            }`}
            style={{ animationDelay: `${idx * 60}ms` }}
          >
            {isMultiHit ? (
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-purple-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" />
            )}
            <span className="leading-relaxed">{w}</span>
          </div>
        );
      })}
    </div>
  );
}
