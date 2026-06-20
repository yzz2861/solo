import { AlertTriangle, ArrowRight, ArrowLeft, Lightbulb } from 'lucide-react';
import type { AdjustmentSuggestion } from '@/types';
import { formatLength } from '@/utils/units';

interface AdjustmentPanelProps {
  suggestions: AdjustmentSuggestion[];
  lengthUnit?: 'mm' | 'cm' | 'm';
}

export default function AdjustmentPanel({
  suggestions,
  lengthUnit = 'mm',
}: AdjustmentPanelProps) {
  if (suggestions.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-green-700">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="font-medium">轴荷合格</span>
        </div>
        <p className="text-sm text-green-600 mt-1">前后轴均在限载范围内，可以装车</p>
      </div>
    );
  }

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-orange-100 border-b border-orange-200">
        <Lightbulb size={18} className="text-orange-600" />
        <h3 className="font-semibold text-orange-800">调整建议</h3>
      </div>
      <div className="p-4 space-y-3">
        {suggestions.map((s, index) => (
          <div
            key={index}
            className="flex items-start gap-3 p-3 bg-white rounded-lg border border-orange-100"
          >
            <div
              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                s.type === 'front'
                  ? 'bg-red-100 text-red-600'
                  : s.type === 'rear'
                  ? 'bg-orange-100 text-orange-600'
                  : 'bg-yellow-100 text-yellow-600'
              }`}
            >
              <AlertTriangle size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-800 text-sm">
                {s.type === 'front' && '前轴超载'}
                {s.type === 'rear' && '后轴超载'}
                {s.type === 'total' && '总重超载'}
              </div>
              <p className="text-sm text-gray-600 mt-1">{s.reason}</p>
              {s.suggestedDistance > 0 && (
                <div className="flex items-center gap-1 mt-2 text-sm">
                  {s.direction === 'forward' ? (
                    <ArrowLeft size={14} className="text-blue-500" />
                  ) : (
                    <ArrowRight size={14} className="text-blue-500" />
                  )}
                  <span className="text-blue-600 font-medium">
                    建议{s.direction === 'forward' ? '前移' : '后移'}约{' '}
                    {formatLength(s.suggestedDistance, lengthUnit, 0)}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
