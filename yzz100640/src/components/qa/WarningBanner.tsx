import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface WarningBannerProps {
  reasons?: string[];
}

export default function WarningBanner({ reasons }: WarningBannerProps) {
  return (
    <div className="rounded-lg bg-red-50 border border-red-200 p-4 mb-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-bold text-red-700 mb-1">⚠️ 需要人工判断</p>
          {reasons && reasons.length > 0 && (
            <ul className="text-sm text-red-600 list-disc list-inside space-y-1">
              {reasons.map((reason, index) => (
                <li key={index}>{reason}</li>
              ))}
            </ul>
          )}
          <p className="text-xs text-red-500 mt-2">
            建议结合田间实际情况进一步核实，或咨询资深农技人员
          </p>
        </div>
      </div>
    </div>
  );
}
