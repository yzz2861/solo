import { getConfidenceLabel, getConfidenceColor } from '@/utils/common';

interface ConfidenceIndicatorProps {
  confidence: number;
  showLabel?: boolean;
  showBar?: boolean;
  size?: 'sm' | 'md';
}

const ConfidenceIndicator = ({ 
  confidence, 
  showLabel = true, 
  showBar = true,
  size = 'md'
}: ConfidenceIndicatorProps) => {
  const colorClass = getConfidenceColor(confidence);
  const label = getConfidenceLabel(confidence);
  const percentage = confidence * 100;
  
  const barHeight = size === 'sm' ? 'h-1' : 'h-1.5';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  
  return (
    <div className="flex flex-col gap-1">
      {showBar && (
        <div className={`w-full ${barHeight} bg-archive-100 rounded-full overflow-hidden`}>
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              confidence >= 0.8 ? 'bg-success' : 
              confidence >= 0.6 ? 'bg-warning' : 'bg-error'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
      {showLabel && (
        <span className={`${textSize} font-medium ${colorClass}`}>
          {label} ({percentage.toFixed(0)}%)
        </span>
      )}
    </div>
  );
};

export default ConfidenceIndicator;
