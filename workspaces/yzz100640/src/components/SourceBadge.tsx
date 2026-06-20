import React from 'react';
import { SourceType } from '@/types';
import { BookOpen, Bug, Megaphone, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SourceBadgeProps {
  sourceType: SourceType;
  sourceName: string;
  className?: string;
}

export default function SourceBadge({ sourceType, sourceName, className }: SourceBadgeProps) {
  const config = {
    manual: {
      chipClass: 'chip-sky',
      Icon: BookOpen,
      prefix: '手册',
    },
    pest: {
      chipClass: 'chip-harvest',
      Icon: Bug,
      prefix: '病虫',
    },
    notice: {
      chipClass: 'chip-soil',
      Icon: Megaphone,
      prefix: '通知',
    },
    experience: {
      chipClass: 'chip-default',
      Icon: Lightbulb,
      prefix: '经验',
    },
  };

  const { chipClass, Icon, prefix } = config[sourceType];

  return (
    <span className={cn(chipClass, className)}>
      <Icon size={12} />
      <span>{prefix}｜{sourceName}</span>
    </span>
  );
}
