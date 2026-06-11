import React from 'react';
import { X, ChevronDown, ChevronUp, Info, AlertTriangle, CheckCircle, Ban } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { cn } from '@/lib/utils';

export function ExplanationPanel() {
  const { explanation, hideExplanation, setShowLiberties, showLiberties } = useGameStore();
  const [expanded, setExpanded] = React.useState(true);

  if (!explanation.show) return null;

  const getIcon = () => {
    switch (explanation.type) {
      case 'success':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'error':
        return <AlertTriangle className="w-6 h-6 text-orange-500" />;
      case 'forbidden':
        return <Ban className="w-6 h-6 text-red-500" />;
      default:
        return <Info className="w-6 h-6 text-blue-500" />;
    }
  };

  const getBorderColor = () => {
    switch (explanation.type) {
      case 'success':
        return 'border-green-400 bg-green-50';
      case 'error':
        return 'border-orange-400 bg-orange-50';
      case 'forbidden':
        return 'border-red-400 bg-red-50';
      default:
        return 'border-blue-400 bg-blue-50';
    }
  };

  const getTitleColor = () => {
    switch (explanation.type) {
      case 'success':
        return 'text-green-700';
      case 'error':
        return 'text-orange-700';
      case 'forbidden':
        return 'text-red-700';
      default:
        return 'text-blue-700';
    }
  };

  return (
    <div
      className={cn(
        'w-full max-w-md mx-auto rounded-xl border-2 shadow-lg overflow-hidden',
        'transition-all duration-300 transform',
        'animate-in slide-in-from-bottom-4 fade-in duration-300',
        getBorderColor()
      )}
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            {getIcon()}
            <div className="flex-1">
              <h3 className={cn('font-bold text-lg', getTitleColor())}>
                {explanation.title}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 hover:bg-black hover:bg-opacity-10 rounded transition-colors"
            >
              {expanded ? (
                <ChevronUp className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-600" />
              )}
            </button>
            <button
              onClick={hideExplanation}
              className="p-1 hover:bg-black hover:bg-opacity-10 rounded transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <p className="text-gray-700 leading-relaxed text-base">
              {explanation.message}
            </p>

            {explanation.details && (
              <div className="mt-3 p-3 bg-white bg-opacity-60 rounded-lg">
                <p className="text-sm text-gray-600">{explanation.details}</p>
              </div>
            )}

            {explanation.libertyChanges && explanation.libertyChanges.length > 0 && (
              <div className="mt-3 p-3 bg-white bg-opacity-60 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">气数变化：</h4>
                <div className="space-y-1">
                  {explanation.libertyChanges.map((change, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span className="text-gray-600">
                        ({change.position.row + 1}, {change.position.col + 1})
                      </span>
                      <span className={cn(
                        'font-bold',
                        change.after < change.before ? 'text-red-500' : 'text-green-500'
                      )}>
                        {change.before} → {change.after}
                      </span>
                      <span className="text-gray-500">口气</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showLiberties}
                  onChange={(e) => setShowLiberties(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">显示气数</span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
