import React, { memo } from 'react';
import type { StoneColor } from '@/types';
import { cn } from '@/lib/utils';

interface StoneProps {
  color: StoneColor;
  size?: number;
  isLastMove?: boolean;
  isCaptured?: boolean;
  onClick?: () => void;
  className?: string;
}

export const Stone = memo(function Stone({
  color,
  size = 40,
  isLastMove = false,
  isCaptured = false,
  onClick,
  className,
}: StoneProps) {
  if (!color) return null;

  const stoneStyle = {
    width: `${size}px`,
    height: `${size}px`,
  };

  return (
    <div
      className={cn(
        'relative rounded-full transition-all duration-300 cursor-pointer',
        'shadow-lg',
        color === 'black'
          ? 'bg-gradient-to-br from-gray-700 via-gray-900 to-black'
          : 'bg-gradient-to-br from-white via-gray-100 to-gray-300 border border-gray-300',
        isLastMove && 'ring-2 ring-red-500 ring-offset-1',
        isCaptured && 'animate-ping opacity-0',
        onClick && 'hover:scale-105',
        className
      )}
      style={stoneStyle}
      onClick={onClick}
    >
      <div
        className={cn(
          'absolute top-1 left-1 rounded-full',
          color === 'black'
            ? 'w-3 h-3 bg-gray-500 opacity-40'
            : 'w-3 h-3 bg-white opacity-80'
        )}
      />
      {isLastMove && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={cn(
              'w-2 h-2 rounded-full',
              color === 'black' ? 'bg-red-500' : 'bg-red-600'
            )}
          />
        </div>
      )}
    </div>
  );
});
