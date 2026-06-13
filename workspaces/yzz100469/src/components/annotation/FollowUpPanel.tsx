import { useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, GripVertical } from 'lucide-react';
import type { FollowUpQuestion } from '@/types';

interface Props {
  questions: FollowUpQuestion[];
  onAdd: (question: Omit<FollowUpQuestion, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<FollowUpQuestion>) => void;
  onDelete: (id: string) => void;
}

const PRIORITY_CONFIG = {
  high: { label: '高优先级', color: 'text-bias bg-bias-light', dot: 'bg-bias' },
  medium: { label: '中优先级', color: 'text-noevidence-dark bg-noevidence-light', dot: 'bg-noevidence' },
  low: { label: '低优先级', color: 'text-evidence-dark bg-evidence-light', dot: 'bg-evidence' },
};

export function FollowUpPanel({ questions, onAdd, onUpdate, onDelete }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newPriority, setNewPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editPriority, setEditPriority] = useState<'high' | 'medium' | 'low'>('medium');

  const handleAdd = () => {
    if (!newQuestion.trim()) return;
    onAdd({
      question: newQuestion.trim(),
      isCustom: true,
      priority: newPriority,
    });
    setNewQuestion('');
    setNewPriority('medium');
    setShowAdd(false);
  };

  const startEdit = (q: FollowUpQuestion) => {
    setEditingId(q.id);
    setEditText(q.question);
    setEditPriority(q.priority);
  };

  const saveEdit = (id: string) => {
    if (!editText.trim()) return;
    onUpdate(id, { question: editText.trim(), priority: editPriority });
    setEditingId(null);
  };

  const sorted = [...questions].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.priority] - order[b.priority];
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-lg font-semibold text-brand-900">下一轮追问建议</h3>
          <span className="chip bg-followup-light text-followup-dark">{questions.length} 条</span>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-followup text-white text-xs font-medium hover:bg-followup-dark transition-colors"
        >
          <Plus size={14} />
          添加追问
        </button>
      </div>

      {showAdd && (
        <div className="mb-4 p-3 rounded-xl bg-followup-light/40 border border-followup/20 animate-fade-in">
          <textarea
            rows={2}
            className="input-base resize-none text-sm scrollbar-thin mb-2"
            placeholder="输入自定义追问问题..."
            value={newQuestion}
            onChange={e => setNewQuestion(e.target.value)}
          />
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1">
              {(['high', 'medium', 'low'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setNewPriority(p)}
                  className={`chip transition-all ${
                    newPriority === p
                      ? PRIORITY_CONFIG[p].color + ' ring-2 ring-offset-1 ring-followup/30'
                      : 'bg-white text-neutral-500 border border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_CONFIG[p].dot}`} />
                  {PRIORITY_CONFIG[p].label.replace('优先级', '')}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={handleAdd}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-followup text-white text-xs font-medium hover:bg-followup-dark"
              >
                <Check size={12} /> 添加
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neutral-100 text-neutral-600 text-xs font-medium hover:bg-neutral-200"
              >
                <X size={12} /> 取消
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto scrollbar-thin space-y-2 pr-1 -mr-1 min-h-0">
        {sorted.length === 0 ? (
          <div className="text-center py-10 text-neutral-400">
            <p className="text-sm">暂无追问建议</p>
            <p className="text-xs mt-1">分析纪要后系统会自动生成</p>
          </div>
        ) : (
          sorted.map((q, idx) => {
            const pConfig = PRIORITY_CONFIG[q.priority];
            const isEditing = q.id === editingId;

            return (
              <div
                key={q.id}
                className="group relative rounded-xl border border-neutral-200 bg-white p-3 hover:shadow-soft hover:border-neutral-300 transition-all opacity-0 animate-slide-up"
                style={{ animationDelay: `${Math.min(idx * 0.04, 0.4)}s` }}
              >
                {isEditing ? (
                  <div>
                    <textarea
                      rows={2}
                      className="input-base resize-none text-sm scrollbar-thin mb-2"
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1">
                        {(['high', 'medium', 'low'] as const).map(p => (
                          <button
                            key={p}
                            onClick={() => setEditPriority(p)}
                            className={`chip transition-all ${
                              editPriority === p
                                ? PRIORITY_CONFIG[p].color
                                : 'bg-white text-neutral-500 border border-neutral-200'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_CONFIG[p].dot}`} />
                            {PRIORITY_CONFIG[p].label.replace('优先级', '')}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => saveEdit(q.id)}
                          className="p-1.5 rounded-lg bg-evidence text-white hover:bg-evidence-dark"
                        >
                          <Check size={13} />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1.5 rounded-lg bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2.5">
                    <div className="flex flex-col items-center gap-1 pt-0.5">
                      <GripVertical size={14} className="text-neutral-300" />
                      <span className={`w-2 h-2 rounded-full ${pConfig.dot}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-1">
                        <span className={`chip ${pConfig.color} flex-shrink-0`}>
                          {pConfig.label}
                        </span>
                        {q.isCustom && (
                          <span className="chip bg-brand-50 text-brand-700 border border-brand-100">自定义</span>
                        )}
                      </div>
                      <p className="text-sm text-neutral-700 leading-relaxed">{q.question}</p>
                    </div>
                    <div className="flex items-start gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEdit(q)}
                        className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => { if (confirm('确定删除此追问？')) onDelete(q.id); }}
                        className="p-1.5 rounded-lg hover:bg-bias-light text-neutral-400 hover:text-bias"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
