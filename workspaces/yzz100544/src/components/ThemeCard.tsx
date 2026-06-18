import React from 'react';
import type { ThemeWithStats } from '@/types';
import { AlertCircle, ChevronRight, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThemeCardProps {
  theme: ThemeWithStats;
  onClick?: () => void;
  className?: string;
  index?: number;
}

export function ThemeCard({ theme, onClick, className, index = 0 }: ThemeCardProps) {
  const hasCritical = theme.criticalCount > 0;
  const isEmpty = theme.feedbackCount === 0;

  return (
    <div
      onClick={onClick}
      className={cn(
        'card-hover p-5 cursor-pointer group animate-fade-in-up',
        hasCritical && 'ring-2 ring-red-200/70 ring-offset-2',
        isEmpty && 'opacity-60',
        className
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-mono font-bold text-lg shadow-soft"
            style={{
              background: `linear-gradient(135deg, ${theme.color}, ${theme.color}cc)`,
            }}
          >
            {theme.feedbackCount}
          </div>
          <div>
            <h3 className="font-serif font-semibold text-brand-800 flex items-center gap-2">
              {theme.name}
              {theme.isCustom && (
                <span className="text-[10px] font-sans px-1.5 py-0.5 rounded bg-brand-100 text-brand-600 font-medium">
                  自定义
                </span>
              )}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-brand-400 font-mono">
                {theme.feedbackCount} 条反馈
              </span>
              {hasCritical && (
                <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium bg-red-50 px-2 py-0.5 rounded-md animate-pulse-soft">
                  <AlertCircle className="w-3 h-3" />
                  {theme.criticalCount} 严重
                </span>
              )}
            </div>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-brand-300 group-hover:text-brand-600 group-hover:translate-x-1 transition-all" />
      </div>

      {theme.matchedKeywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {theme.matchedKeywords.slice(0, 5).map((kw, i) => (
            <span
              key={i}
              className="text-[11px] px-2 py-0.5 rounded-md"
              style={{ backgroundColor: `${theme.color}15`, color: theme.color }}
            >
              #{kw}
            </span>
          ))}
          {theme.matchedKeywords.length > 5 && (
            <span className="text-[11px] px-2 py-0.5 rounded-md text-brand-400 bg-brand-50">
              +{theme.matchedKeywords.length - 5}
            </span>
          )}
        </div>
      )}

      {theme.representativeQuotes.length > 0 && (
        <div className="space-y-2">
          {theme.representativeQuotes.slice(0, 2).map((quote, i) => (
            <div
              key={i}
              className="text-xs text-brand-600 leading-relaxed px-3 py-2 rounded-lg bg-paper-50 line-clamp-2 border-l-2"
              style={{ borderColor: theme.color }}
            >
              "{quote}"
            </div>
          ))}
        </div>
      )}

      {theme.description && theme.feedbackCount > 0 && (
        <p className="mt-3 pt-3 border-t border-brand-50 text-xs text-brand-400 line-clamp-2">
          {theme.description}
        </p>
      )}
    </div>
  );
}
