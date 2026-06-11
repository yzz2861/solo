import React, { memo } from 'react';
import { cn } from '@/lib/utils';

interface LibertyMarkerProps {
  count: number;
  size?: number;
  position?: 'center' | 'corner';
  showNumber?: boolean;
  className?: string;
}

export const LibertyMarker = memo(function LibertyMarker({
  count,
  size = 24,
  position = 'center',
  showNumber = true,
  className,
}: LibertyMarkerProps) {
  const getColor = () => {
    if (count === 0) return 'bg-red-500 text-white';
    if (count === 1) return 'bg-orange-500 text-white';
    if (count === 2) return 'bg-yellow-500 text-white';
    return 'bg-blue-500 text-white';
  };

  const getAnimation = () => {
    if (count === 0) return 'animate-pulse';
    if (count === 1) return 'animate-pulse';
    return '';
  };

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full font-bold text-xs',
        'shadow-md transition-all duration-300',
        position === 'center' ? 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' : '',
        getColor(),
        getAnimation(),
        className
      )}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        fontSize: `${size * 0.5}px`,
      }}
    >
      {showNumber && count}
    </div>
  );
});
