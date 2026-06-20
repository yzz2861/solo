import React from 'react';
import { AlertTriangle, AlertOctagon } from 'lucide-react';
import type { WarningInfo } from '@/utils/unitConverter';

interface WarningBannerProps {
  warnings: WarningInfo[];
}

export default function WarningBanner({ warnings }: WarningBannerProps) {
  if (warnings.length === 0) return null;

  return (
    <div className="space-y-2">
      {warnings.map((w, i) => (
        <div
          key={i}
          className={`flex items-start gap-2 rounded-lg px-4 py-3 text-sm ${
            w.type === 'danger'
              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          }`}
        >
          {w.type === 'danger' ? (
            <AlertOctagon className="h-4 w-4 mt-0.5 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          )}
          <span>{w.message}</span>
        </div>
      ))}
    </div>
  );
}
