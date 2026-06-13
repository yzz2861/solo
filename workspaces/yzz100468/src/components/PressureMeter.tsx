import React from 'react';
import { PressureLevel } from '@/types';

interface PressureMeterProps {
  pressure: number;
  pressureLevel: PressureLevel;
  showLabel?: boolean;
  vertical?: boolean;
}

const PressureMeter: React.FC<PressureMeterProps> = ({
  pressure,
  pressureLevel,
  showLabel = true,
  vertical = false,
}) => {
  const getColor = () => {
    switch (pressureLevel) {
      case 'too-light':
        return 'bg-sky2-400';
      case 'good':
        return 'bg-mint-500';
      case 'too-hard':
        return 'bg-coral-500';
      default:
        return 'bg-gray-300';
    }
  };

  const getLabel = () => {
    switch (pressureLevel) {
      case 'too-light':
        return '太轻了';
      case 'good':
        return '刚刚好';
      case 'too-hard':
        return '太用力';
      default:
        return '';
    }
  };

  const getLabelColor = () => {
    switch (pressureLevel) {
      case 'too-light':
        return 'text-sky2-600';
      case 'good':
        return 'text-mint-600';
      case 'too-hard':
        return 'text-coral-600';
      default:
        return 'text-gray-500';
    }
  };

  const clampedPressure = Math.min(Math.max(pressure, 0), 100);

  if (vertical) {
    return (
      <div className="flex flex-col items-center gap-2">
        {showLabel && (
          <span className={`text-sm font-medium ${getLabelColor()}`}>
            {getLabel()}
          </span>
        )}
        <div className="relative w-6 h-48 bg-gray-200 rounded-full overflow-hidden shadow-inner">
          <div
            className={`absolute bottom-0 left-0 right-0 ${getColor()} transition-all duration-150 rounded-b-full`}
            style={{ height: `${clampedPressure}%` }}
          />
          <div className="absolute inset-0 flex flex-col justify-between py-2">
            <div className="w-full h-px bg-white/30" />
            <div className="w-full h-px bg-white/30" />
            <div className="w-full h-px bg-white/30" />
            <div className="w-full h-px bg-white/30" />
          </div>
        </div>
        <span className="text-xs text-gray-500">力度</span>
      </div>
    );
  }

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-gray-500">力度</span>
          <span className={`text-sm font-medium ${getLabelColor()}`}>
            {getLabel()}
          </span>
        </div>
      )}
      <div className="relative w-full h-4 bg-gray-200 rounded-full overflow-hidden shadow-inner">
        <div
          className={`absolute left-0 top-0 bottom-0 ${getColor()} transition-all duration-150 rounded-l-full`}
          style={{ width: `${clampedPressure}%` }}
        />
      </div>
    </div>
  );
};

export default PressureMeter;
