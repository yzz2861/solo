import React from 'react';

interface ConfidenceBarProps {
  value: number;
}

export default function ConfidenceBar({ value }: ConfidenceBarProps) {
  const getColorClasses = () => {
    if (value >= 85) {
      return {
        text: 'text-leaf-600',
        fill: 'bg-leaf-500',
      };
    }
    if (value >= 60) {
      return {
        text: 'text-harvest-600',
        fill: 'bg-harvest-500',
      };
    }
    return {
      text: 'text-red-600',
      fill: 'bg-red-500',
    };
  };

  const { text, fill } = getColorClasses();

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className={`font-medium ${text}`}>置信度 {value}%</span>
      <div className="w-32 h-2 bg-leaf-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${fill} rounded-full transition-all duration-300`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
