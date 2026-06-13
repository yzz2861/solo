import React from 'react';
import { formatTime } from '@/utils/dateUtils';

interface TimerDisplayProps {
  currentTime: number;
  totalTime?: number;
  targetTime?: number;
  showProgress?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const TimerDisplay: React.FC<TimerDisplayProps> = ({
  currentTime,
  totalTime,
  targetTime,
  showProgress = true,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
  };

  const progress = targetTime ? Math.min((currentTime / targetTime) * 100, 100) : 0;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`font-bold ${sizeClasses[size]} text-mint-700 font-mono`}>
        {formatTime(currentTime)}
      </div>
      
      {targetTime && showProgress && (
        <div className="w-full">
          <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-mint-400 to-mint-500 transition-all duration-200 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>已用</span>
            <span>目标 {formatTime(targetTime)}</span>
          </div>
        </div>
      )}

      {totalTime !== undefined && (
        <div className="text-sm text-gray-500">
          总计时: {formatTime(totalTime)}
        </div>
      )}
    </div>
  );
};

export default TimerDisplay;
