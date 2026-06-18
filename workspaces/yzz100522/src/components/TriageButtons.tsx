import type { TriageLevel } from '../types';
import { getLevelColorClass, getLevelLabel } from '../utils/scoring';
import { cn } from '../lib/utils';

interface TriageButtonsProps {
  selectedLevel?: TriageLevel;
  onSelect: (level: TriageLevel) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const levels: { level: TriageLevel; icon: string; description: string }[] = [
  { level: 'red', icon: '🔴', description: '立即处理 · 危及生命' },
  { level: 'yellow', icon: '🟡', description: '优先处理 · 需紧急医疗' },
  { level: 'green', icon: '🟢', description: '轻微 · 可自行走动' },
  { level: 'black', icon: '⚫', description: '期待 · 无生还可能' },
];

export default function TriageButtons({
  selectedLevel,
  onSelect,
  disabled = false,
  size = 'md',
}: TriageButtonsProps) {
  const sizeClasses = {
    sm: 'py-2 px-3 text-sm',
    md: 'py-3 px-4 text-base',
    lg: 'py-4 px-6 text-lg',
  };
  
  return (
    <div className="grid grid-cols-4 gap-2">
      {levels.map(({ level, icon, description }) => (
        <button
          key={level}
          onClick={() => onSelect(level)}
          disabled={disabled}
          className={cn(
            'rounded-xl font-semibold transition-all duration-200 flex flex-col items-center gap-1',
            'transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
            sizeClasses[size],
            selectedLevel === level
              ? `${getLevelColorClass(level)} shadow-lg scale-105 ring-2 ring-offset-2`
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          )}
        >
          <span className="text-2xl">{icon}</span>
          <span>{getLevelLabel(level).split(' - ')[0]}</span>
          <span className={cn(
            'text-xs font-normal opacity-80',
            selectedLevel === level ? 'text-white/80' : 'text-gray-500'
          )}>
            {description.split(' · ')[1]}
          </span>
        </button>
      ))}
    </div>
  );
}
