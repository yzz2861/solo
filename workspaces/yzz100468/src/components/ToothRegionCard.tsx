import React from 'react';
import { Smile, CircleDot, Grid3X3, MessageSquare } from 'lucide-react';
import { ToothRegion, REGION_NAMES, REGION_DESCRIPTIONS } from '@/types';
import ProgressRing from './ProgressRing';

interface ToothRegionCardProps {
  region: ToothRegion;
  cleanliness: number;
  duration: number;
  targetDuration: number;
  completed: boolean;
  isActive?: boolean;
  onClick?: () => void;
  showDetails?: boolean;
}

const regionIcons: Record<ToothRegion, React.ReactNode> = {
  outer: <Smile className="w-6 h-6" />,
  inner: <CircleDot className="w-6 h-6" />,
  occlusal: <Grid3X3 className="w-6 h-6" />,
  lingual: <MessageSquare className="w-6 h-6" />,
};

const regionColors: Record<ToothRegion, string> = {
  outer: '#4ECDC4',
  inner: '#38bdf8',
  occlusal: '#fbbf24',
  lingual: '#f472b6',
};

const ToothRegionCard: React.FC<ToothRegionCardProps> = ({
  region,
  cleanliness,
  duration,
  targetDuration,
  completed,
  isActive = false,
  onClick,
  showDetails = true,
}) => {
  const color = regionColors[region];

  return (
    <div
      className={`relative p-4 rounded-2xl border-2 transition-all duration-300 cursor-pointer ${
        isActive
          ? 'border-mint-400 bg-mint-50 shadow-lg scale-105'
          : completed
          ? 'border-mint-300 bg-white shadow-md'
          : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:shadow-md'
      }`}
      onClick={onClick}
    >
      {isActive && (
        <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-mint-500 text-white text-xs rounded-full animate-pulse">
          进行中
        </div>
      )}

      {completed && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-mint-500 rounded-full flex items-center justify-center text-white text-xs">
          ✓
        </div>
      )}

      <div className="flex items-start gap-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
          style={{ backgroundColor: color }}
        >
          {regionIcons[region]}
        </div>

        <div className="flex-1">
          <h4 className="font-bold text-gray-800">{REGION_NAMES[region]}</h4>
          {showDetails && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
              {REGION_DESCRIPTIONS[region]}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="text-xs text-gray-500">
          <span className="font-medium text-gray-700">{Math.round(duration)}s</span>
          <span className="mx-1">/</span>
          <span>{targetDuration}s</span>
        </div>
        <ProgressRing
          progress={cleanliness}
          size={40}
          strokeWidth={4}
          color={color}
          bgColor="#e5e7eb"
          label={`${Math.round(cleanliness)}%`}
        />
      </div>
    </div>
  );
};

export default ToothRegionCard;
