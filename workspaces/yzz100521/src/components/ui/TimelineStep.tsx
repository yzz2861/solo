import React from 'react';
import { Clock, Eye, CheckCircle2 } from 'lucide-react';

interface TimelineStepProps {
  step: number;
  title: string;
  description: string;
  observationPoint: string;
  timing?: string;
  isActive?: boolean;
  isCompleted?: boolean;
}

const TimelineStep: React.FC<TimelineStepProps> = ({
  step,
  title,
  description,
  observationPoint,
  timing,
  isActive = false,
  isCompleted = false,
}) => {
  return (
    <div className="relative pl-12 pb-8 last:pb-0">
      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-cream-200 last:bg-transparent" />
      
      <div
        className={`absolute left-0 top-0 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
          isCompleted
            ? 'bg-mint-300 border-mint-300'
            : isActive
            ? 'bg-icecream-pink border-icecream-pink scale-110'
            : 'bg-white border-cream-200'
        }`}
      >
        {isCompleted ? (
          <CheckCircle2 size={18} className="text-white" />
        ) : (
          <span className={`text-sm font-bold ${isActive ? 'text-white' : 'text-chocolate-500'}`}>
            {step}
          </span>
        )}
      </div>

      <div
        className={`transition-all duration-300 ${
          isActive ? 'scale-[1.02]' : ''
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          <h4
            className={`font-bold ${
              isCompleted ? 'text-mint-500' : isActive ? 'text-chocolate-900' : 'text-chocolate-700'
            }`}
          >
            {title}
          </h4>
          {timing && (
            <span className="flex items-center gap-1 text-xs text-chocolate-500 bg-cream-100 px-2 py-0.5 rounded-full">
              <Clock size={12} />
              {timing}
            </span>
          )}
        </div>
        <p className="text-sm text-chocolate-600 mb-2">{description}</p>
        <div className="flex items-start gap-2 bg-cream-50 rounded-lg p-3">
          <Eye size={16} className="text-icecream-pink shrink-0 mt-0.5" />
          <div>
            <span className="text-xs font-medium text-icecream-pinkDark">观察要点：</span>
            <p className="text-sm text-chocolate-600">{observationPoint}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineStep;
