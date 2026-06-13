import { useState } from 'react';
import { Pencil, Trash2, Check, X, Plus, Minus } from 'lucide-react';
import type { Annotation, AnnotationType } from '@/types';
import { ANNOTATION_TYPE_LABELS, ANNOTATION_TYPE_COLORS } from '@/types';

interface Props {
  annotations: Annotation[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdate: (id: string, updates: Partial<Annotation>) => void;
  onDelete: (id: string) => void;
  onAdd: (type: AnnotationType) => void;
}

const TYPE_FILTERS: { type: AnnotationType | 'all'; label: string }[] = [
  { type: 'all', label: '全部' },
  { type: 'evidence', label: ANNOTATION_TYPE_LABELS.evidence },
  { type: 'no_evidence', label: ANNOTATION_TYPE_LABELS.no_evidence },
  { type: 'bias', label: ANNOTATION_TYPE_LABELS.bias },
];

export function AnnotationList({ annotations, selectedId, onSelect, onUpdate, onDelete, onAdd }: Props) {
  const [filter, setFilter] = useState<AnnotationType | 'all'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editReason, setEditReason] = useState('');
  const [editSuggestion, setEditSuggestion] = useState('');

  const filtered = filter === 'all'
    ? annotations
    : annotations.filter(a => a.type === filter);

  const counts = {
    all: annotations.length,
    evidence: annotations.filter(a => a.type === 'evidence').length,
    no_evidence: annotations.filter(a => a.type === 'no_evidence').length,
    bias: annotations.filter(a => a.type === 'bias').length,
  };

  const startEdit = (ann: Annotation) => {
    setEditingId(ann.id);
    setEditReason(ann.reason || '');
    setEditSuggestion(ann.suggestion || '');
  };

  const saveEdit = (id: string) => {
    onUpdate(id, { reason: editReason, suggestion: editSuggestion, isManual: true });
    setEditingId(null);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-wrap gap-1.5 mb-4">
        {TYPE_FILTERS.map(f => (
          <button
            key={f.type}
            onClick={() => setFilter(f.type)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === f.type
                ? f.type === 'all'
                  ? 'bg-brand-800 text-white'
                  : `${ANNOTATION_TYPE_COLORS[f.type as AnnotationType].bg} text-white`
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            {f.label} <span className="opacity-75">({counts[f.type]})</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin space-y-2 pr-1 -mr-1 min-h-0">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-neutral-400">
            <p className="text-sm">暂无此类型标注</p>
            <p className="text-xs mt-1">在左侧原文中选择文字可手动添加</p>
          </div>
        ) : (
          filtered.map((ann, idx) => {
            const colors = ANNOTATION_TYPE_COLORS[ann.type];
            const isSelected = ann.id === selectedId;
            const isEditing = ann.id === editingId;

            return (
              <div
                key={ann.id}
                onClick={() => onSelect(ann.id)}
                className={`group rounded-xl border p-3.5 cursor-pointer transition-all duration-200 opacity-0 animate-slide-up ${
                  isSelected
                    ? `${colors.border} border-2 ${colors.light} shadow-soft`
                    : 'border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-soft'
                }`}
                style={{ animationDelay: `${Math.min(idx * 0.03, 0.3)}s` }}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`chip ${colors.light} ${colors.text}`}>
                      {ANNOTATION_TYPE_LABELS[ann.type]}
                    </span>
                    {ann.isManual && (
                      <span className="chip bg-brand-50 text-brand-700 border border-brand-100">
                        ✏️ 人工
                      </span>
                    )}
                  </div>
                  {!isEditing && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); startEdit(ann); }}
                        className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); if (confirm('确定删除此标注？')) onDelete(ann.id); }}
                        className="p-1.5 rounded-lg hover:bg-bias-light text-neutral-400 hover:text-bias transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="bg-neutral-50 rounded-lg px-3 py-2 mb-2 border border-neutral-100">
                  <p className={`text-sm text-neutral-700 leading-relaxed ${colors.text}`}>
                    「{ann.text.length > 60 ? ann.text.slice(0, 60) + '...' : ann.text}」
                  </p>
                </div>

                {isEditing ? (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[11px] font-medium text-neutral-500 mb-1">标注理由</label>
                      <input
                        className="input-base py-1.5 text-sm"
                        value={editReason}
                        onChange={e => setEditReason(e.target.value)}
                        onClick={e => e.stopPropagation()}
                        placeholder="输入标注理由..."
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-neutral-500 mb-1">改进建议</label>
                      <input
                        className="input-base py-1.5 text-sm"
                        value={editSuggestion}
                        onChange={e => setEditSuggestion(e.target.value)}
                        onClick={e => e.stopPropagation()}
                        placeholder="输入改进建议..."
                      />
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); saveEdit(ann.id); }}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-brand-800 text-white text-xs font-medium hover:bg-brand-700"
                      >
                        <Check size={12} /> 保存
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingId(null); }}
                        className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-neutral-100 text-neutral-600 text-xs font-medium hover:bg-neutral-200"
                      >
                        <X size={12} /> 取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {ann.reason && (
                      <div className="mb-1.5">
                        <span className="text-[11px] font-medium text-neutral-400">标注理由：</span>
                        <p className="text-xs text-neutral-600 mt-0.5 leading-relaxed">{ann.reason}</p>
                      </div>
                    )}
                    {ann.suggestion && (
                      <div>
                        <span className="text-[11px] font-medium text-neutral-400">改进建议：</span>
                        <p className="text-xs text-brand-700 mt-0.5 leading-relaxed">💡 {ann.suggestion}</p>
                      </div>
                    )}
                  </>
                )}

                <div className="mt-2 pt-2 border-t border-neutral-100 flex items-center justify-between">
                  <span className="text-[11px] text-neutral-400">
                    第{ann.paragraphIndex + 1}段 · 位置 {ann.start}-{ann.end}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
