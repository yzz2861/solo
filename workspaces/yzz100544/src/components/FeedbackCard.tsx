import React, { useState } from 'react';
import type { Feedback, Theme } from '@/types';
import { useAppStore } from '@/store/appStore';
import { SeverityBadge, SourceBadge, ThemeTag } from './ui/Badge';
import { formatDateTime } from '@/utils/io';
import { Clock, User, Edit3, Trash2, BookOpen, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeedbackCardProps {
  feedback: Feedback;
  compact?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  highlight?: boolean;
}

export function FeedbackCard({ feedback, compact = false, onEdit, onDelete, highlight }: FeedbackCardProps) {
  const themes = useAppStore(s => s.getThemesForFeedback(feedback.id));
  const setFeedbackThemes = useAppStore(s => s.setFeedbackThemes);
  const allThemes = useAppStore(s => s.themes);
  const [editingTags, setEditingTags] = useState(false);

  const toggleTheme = (themeId: string) => {
    const current = themes.map(t => t.id);
    const next = current.includes(themeId)
      ? current.filter(id => id !== themeId)
      : [...current, themeId];
    setFeedbackThemes(feedback.id, next);
  };

  return (
    <div
      className={cn(
        'card p-4 transition-all duration-300 hover:shadow-card group',
        feedback.severity === 'critical' && 'ring-1 ring-red-200 bg-gradient-to-br from-white to-red-50/30',
        feedback.severity === 'rare-critical' && 'ring-1 ring-violet-200 bg-gradient-to-br from-white to-violet-50/30',
        highlight && 'ring-2 ring-amber-300 shadow-lg'
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <SourceBadge source={feedback.source} />
          <SeverityBadge level={feedback.severity} />
          {feedback.homework && (
            <span className="badge bg-paper-50 text-brand-500 border-brand-100">
              <BookOpen className="w-3 h-3" />
              {feedback.homework}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <button
              onClick={onEdit}
              className="w-8 h-8 rounded-lg hover:bg-brand-50 flex items-center justify-center text-brand-400 hover:text-brand-600 transition"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-brand-300 hover:text-red-500 transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <p className={cn(
        'text-brand-700 leading-relaxed mb-3 whitespace-pre-wrap break-words',
        compact ? 'text-sm line-clamp-3' : 'text-sm'
      )}>
        {feedback.content}
      </p>

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {editingTags ? (
            <div className="p-2 rounded-xl bg-paper-50 border border-brand-100">
              <div className="flex flex-wrap gap-1.5 mb-2">
                {allThemes.map(t => {
                  const selected = themes.some(x => x.id === t.id);
                  return (
                    <button
                      key={t.id}
                      onClick={() => toggleTheme(t.id)}
                      className={cn(
                        'tag border gap-1.5 transition-all',
                        selected
                          ? 'border-transparent text-white shadow-soft'
                          : 'border-brand-200 text-brand-500 bg-white hover:border-brand-300'
                      )}
                      style={selected ? { backgroundColor: t.color } : {}}
                    >
                      {selected && <Check className="w-3 h-3" />}
                      {t.name}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setEditingTags(false)}
                className="text-xs text-brand-500 hover:text-brand-700 flex items-center gap-1"
              >
                <X className="w-3 h-3" /> 完成编辑
              </button>
            </div>
          ) : (
            <div
              onClick={() => setEditingTags(true)}
              className={cn(
                'flex flex-wrap gap-1.5',
                themes.length === 0 && 'text-xs text-brand-300 italic cursor-pointer hover:text-brand-500'
              )}
            >
              {themes.length === 0 ? (
                <span>点击标注主题 →</span>
              ) : (
                themes.map(t => (
                  <ThemeTag key={t.id} name={t.name} color={t.color} />
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {(feedback.author || true) && (
        <div className="mt-3 pt-3 border-t border-brand-50 flex items-center gap-4 text-xs text-brand-400">
          {feedback.author && (
            <span className="inline-flex items-center gap-1">
              <User className="w-3 h-3" />
              {feedback.author}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDateTime(feedback.createdAt)}
          </span>
        </div>
      )}
    </div>
  );
}
