import React from 'react';
import { cn } from '@/lib/utils';
import { 
  GradingLevel, 
  GRADING_LEVEL_LABELS, 
  GRADING_LEVEL_COLORS,
  GRADING_LEVEL_TEXT_COLORS,
  GRADING_LEVEL_BG_COLORS
} from '@/types';
import { AlertTriangle, Brain, Users, MessageCircle, Search } from 'lucide-react';

interface GradingBadgeProps {
  level: GradingLevel;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  className?: string;
}

const levelIcons: Record<GradingLevel, React.ReactNode> = {
  emergency: <AlertTriangle className="w-3.5 h-3.5" />,
  psychology: <Brain className="w-3.5 h-3.5" />,
  headteacher: <Users className="w-3.5 h-3.5" />,
  general: <MessageCircle className="w-3.5 h-3.5" />,
  review: <Search className="w-3.5 h-3.5" />,
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
};

export function GradingBadge({ level, size = 'md', pulse = false, className }: GradingBadgeProps) {
  const showPulse = pulse && (level === 'emergency' || level === 'psychology');
  
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full',
        'transition-all duration-200',
        sizeClasses[size],
        GRADING_LEVEL_BG_COLORS[level],
        GRADING_LEVEL_TEXT_COLORS[level],
        showPulse && 'animate-pulse',
        className
      )}
    >
      <span className={cn(
        'w-2 h-2 rounded-full flex-shrink-0',
        GRADING_LEVEL_COLORS[level],
        showPulse && 'animate-ping'
      )} />
      {levelIcons[level]}
      <span>{GRADING_LEVEL_LABELS[level]}</span>
    </span>
  );
}

export default GradingBadge;
