import React, { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAppStore } from '@/store/appStore';
import { ThemeCard } from '@/components/ThemeCard';
import { FeedbackCard } from '@/components/FeedbackCard';
import { SourceBadge, SeverityBadge, ThemeTag } from '@/components/ui/Badge';
import type { Theme, ThemeWithStats, Feedback } from '@/types';
import {
  Grid3X3, Merge, Plus, Edit3, Trash2, X, Sparkles,
  ChevronRight, BarChart3, Layers, AlertCircle, Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Clustering() {
  const store = useAppStore();
  const {
    themes, feedback, feedbackThemes,
    getThemeStats, getFeedbackByTheme, getThemesForFeedback,
    addTheme, updateTheme, deleteTheme, mergeThemes,
    setFeedbackThemes,
  } = store;

  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeSelected, setMergeSelected] = useState<string[]>([]);
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
  const [showNewTheme, setShowNewTheme] = useState(false);
  const [newTheme, setNewTheme] = useState({ name: '', color: '#6366f1', keywords: '' });

  const themeStats = useMemo(() => getThemeStats(), [themes, feedback, feedbackThemes]);

  const activeStats: ThemeWithStats | null = selectedThemeId
    ? themeStats.find(t => t.id === selectedThemeId) ?? null
    : null;

  const activeFeedback: Feedback[] = useMemo(() => {
    if (!selectedThemeId) return [];
    return getFeedbackByTheme(selectedThemeId).sort((a, b) => {
      const sevOrder = { critical: 0, 'rare-critical': 1, important: 2, normal: 3 };
      return sevOrder[a.severity] - sevOrder[b.severity];
    });
  }, [selectedThemeId, feedback, feedbackThemes]);

  const toggleMergeSelect = (id: string) => {
    setMergeSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const doMerge = async () => {
    if (mergeSelected.length < 2) return;
    const [target, ...rest] = mergeSelected;
    const targetTheme = themes.find(t => t.id === target);
    await mergeThemes(rest, target);
    setMergeMode(false);
    setMergeSelected([]);
    setSelectedThemeId(target);
  };

  const handleCreateTheme = async () => {
    if (!newTheme.name.trim()) return;
    const keywords = newTheme.keywords.split(/[,，\s]+/).filter(Boolean);
    await addTheme({
      name: newTheme.name,
      color: newTheme.color,
      keywords,
      weight: 1,
      description: '自定义主题',
    });
    setShowNewTheme(false);
    setNewTheme({ name: '', color: '#6366f1', keywords: '' });
  };

  const handleSaveTheme = async () => {
    if (!editingTheme) return;
    await updateTheme(editingTheme.id, editingTheme);
    setEditingTheme(null);
  };

  return (
    <AppLayout
      title="聚类分析"
      subtitle={selectedThemeId ? `正在查看：${activeStats?.name ?? ''}` : `自动识别 ${themeStats.filter(t => t.feedbackCount > 0).length} 个主题`}
      actions={
        <div className="flex items-center gap-2">
          {mergeMode ? (
            <>
              <button
                onClick={() => { setMergeMode(false); setMergeSelected([]); }}
                className="btn-ghost"
              >
                <X className="w-4 h-4" />
                取消合并
              </button>
              <button
                onClick={doMerge}
                disabled={mergeSelected.length < 2}
                className="btn-primary"
              >
                <Merge className="w-4 h-4" />
                合并选中 ({mergeSelected.length})
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setShowNewTheme(true)} className="btn-secondary">
                <Plus className="w-4 h-4" />
                新建主题
              </button>
              <button onClick={() => setMergeMode(true)} className="btn-secondary">
                <Merge className="w-4 h-4" />
                合并主题
              </button>
            </>
          )}
        </div>
      }
    >
      {showNewTheme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowNewTheme(false)}>
          <div className="absolute inset-0 bg-brand-950/40 backdrop-blur-sm" />
          <div
            onClick={e => e.stopPropagation()}
            className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-hover animate-fade-in-up"
          >
            <h3 className="font-serif text-xl font-bold text-brand-800 mb-4">新建主题</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-brand-700 mb-1.5 block">主题名称</label>
                <input
                  value={newTheme.name}
                  onChange={e => setNewTheme(p => ({ ...p, name: e.target.value }))}
                  className="input"
                  placeholder="如：计算错误"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-brand-700 mb-1.5 block">主题颜色</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={newTheme.color}
                    onChange={e => setNewTheme(p => ({ ...p, color: e.target.value }))}
                    className="w-12 h-12 rounded-xl border-2 border-brand-100 cursor-pointer"
                  />
                  <input
                    value={newTheme.color}
                    onChange={e => setNewTheme(p => ({ ...p, color: e.target.value }))}
                    className="input !py-2 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-brand-700 mb-1.5 block">匹配关键词（逗号分隔）</label>
                <textarea
                  value={newTheme.keywords}
                  onChange={e => setNewTheme(p => ({ ...p, keywords: e.target.value }))}
                  className="textarea"
                  rows={3}
                  placeholder="如：算错, 计算, 算数错误, 数学错误"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setShowNewTheme(false)} className="btn-ghost">取消</button>
              <button onClick={handleCreateTheme} className="btn-primary">创建主题</button>
            </div>
          </div>
        </div>
      )}

      {editingTheme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setEditingTheme(null)}>
          <div className="absolute inset-0 bg-brand-950/40 backdrop-blur-sm" />
          <div
            onClick={e => e.stopPropagation()}
            className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-hover animate-fade-in-up"
          >
            <h3 className="font-serif text-xl font-bold text-brand-800 mb-4">编辑主题</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-brand-700 mb-1.5 block">主题名称</label>
                <input
                  value={editingTheme.name}
                  onChange={e => setEditingTheme({ ...editingTheme, name: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-brand-700 mb-1.5 block">主题颜色</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={editingTheme.color}
                    onChange={e => setEditingTheme({ ...editingTheme, color: e.target.value })}
                    className="w-12 h-12 rounded-xl border-2 border-brand-100 cursor-pointer"
                  />
                  <input
                    value={editingTheme.color}
                    onChange={e => setEditingTheme({ ...editingTheme, color: e.target.value })}
                    className="input !py-2 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-brand-700 mb-1.5 block">关键词</label>
                <textarea
                  value={editingTheme.keywords.join(', ')}
                  onChange={e => setEditingTheme({
                    ...editingTheme,
                    keywords: e.target.value.split(/[,，\s]+/).filter(Boolean)
                  })}
                  className="textarea"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-brand-700 mb-1.5 block">描述</label>
                <textarea
                  value={editingTheme.description ?? ''}
                  onChange={e => setEditingTheme({ ...editingTheme, description: e.target.value })}
                  className="textarea"
                  rows={2}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-between items-center">
              <button
                onClick={async () => { await deleteTheme(editingTheme.id); setEditingTheme(null); }}
                className="btn-danger"
              >
                <Trash2 className="w-4 h-4" /> 删除主题
              </button>
              <div className="flex gap-2">
                <button onClick={() => setEditingTheme(null)} className="btn-ghost">取消</button>
                <button onClick={handleSaveTheme} className="btn-primary">保存</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className={cn(
          'space-y-4 transition-all',
          selectedThemeId && 'xl:col-span-1',
          !selectedThemeId && 'xl:col-span-3'
        )}>
          {mergeMode && (
            <div className="card p-4 border-2 border-amber-200 bg-amber-50/50 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-800">
                  <Merge className="w-5 h-5" />
                  <div>
                    <div className="font-medium text-sm">合并模式已启用</div>
                    <div className="text-xs text-amber-700/80">选中 2 个以上主题进行合并</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className={cn(
            'grid gap-4',
            !selectedThemeId ? 'md:grid-cols-2 2xl:grid-cols-3' : 'grid-cols-1'
          )}>
            {themeStats.map((t, i) => (
              <div
                key={t.id}
                onClick={() => !mergeMode && setSelectedThemeId(t.id === selectedThemeId ? null : t.id)}
                className={cn(
                  'relative transition-all animate-fade-in-up',
                  mergeMode && 'cursor-pointer',
                  selectedThemeId === t.id && !mergeMode && 'xl:scale-[1.02]'
                )}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                {mergeMode && (
                  <div
                    onClick={e => { e.stopPropagation(); toggleMergeSelect(t.id); }}
                    className={cn(
                      'absolute -top-2 -left-2 z-10 w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all',
                      mergeSelected.includes(t.id)
                        ? 'bg-brand-600 border-brand-600 text-white shadow-soft'
                        : 'bg-white border-brand-200 text-transparent hover:border-brand-400'
                    )}
                  >
                    ✓
                  </div>
                )}

                {selectedThemeId === t.id && !mergeMode && (
                  <button
                    onClick={e => { e.stopPropagation(); setEditingTheme(t); }}
                    className="absolute top-3 right-3 z-10 w-8 h-8 rounded-lg bg-white/90 backdrop-blur-sm border border-brand-100 flex items-center justify-center text-brand-500 hover:text-brand-700 hover:bg-white transition"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}

                <div className={cn(
                  'transition-all',
                  selectedThemeId && selectedThemeId !== t.id && !mergeMode && 'opacity-60 hover:opacity-100'
                )}>
                  <ThemeCard theme={t} index={0} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedThemeId && activeStats && (
          <div className="xl:col-span-2 space-y-4 animate-fade-in-up">
            <div className="card p-5 border-l-4" style={{ borderLeftColor: activeStats.color }}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-mono font-bold text-xl shadow-card"
                      style={{ background: `linear-gradient(135deg, ${activeStats.color}, ${activeStats.color}cc)` }}
                    >
                      {activeStats.feedbackCount}
                    </div>
                    <div>
                      <h3 className="font-serif text-2xl font-bold text-brand-800">{activeStats.name}</h3>
                      <p className="text-sm text-brand-500 mt-0.5">
                        {activeStats.feedbackCount} 条反馈 · {activeStats.criticalCount} 条严重
                      </p>
                    </div>
                  </div>
                  {activeStats.description && (
                    <p className="text-sm text-brand-600 leading-relaxed max-w-xl">
                      {activeStats.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedThemeId(null)}
                  className="w-9 h-9 rounded-xl hover:bg-paper-100 flex items-center justify-center text-brand-400 hover:text-brand-600 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {activeStats.matchedKeywords.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs font-medium text-brand-500 mb-2 uppercase tracking-wider">高频关键词</div>
                  <div className="flex flex-wrap gap-1.5">
                    {activeStats.matchedKeywords.map((kw, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium"
                        style={{
                          backgroundColor: `${activeStats.color}12`,
                          color: activeStats.color,
                        }}
                      >
                        #{kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-paper-50 text-center">
                  <BarChart3 className="w-5 h-5 text-brand-400 mx-auto mb-1" />
                  <div className="text-lg font-bold text-brand-800 font-mono">{activeStats.feedbackCount}</div>
                  <div className="text-[11px] text-brand-400">总反馈</div>
                </div>
                <div className="p-3 rounded-xl bg-paper-50 text-center">
                  <AlertCircle className="w-5 h-5 text-red-400 mx-auto mb-1" />
                  <div className="text-lg font-bold text-red-600 font-mono">{activeStats.criticalCount}</div>
                  <div className="text-[11px] text-brand-400">严重问题</div>
                </div>
                <div className="p-3 rounded-xl bg-paper-50 text-center">
                  <Sparkles className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                  <div className="text-lg font-bold text-amber-600 font-mono">{activeStats.representativeQuotes.length}</div>
                  <div className="text-[11px] text-brand-400">代表原话</div>
                </div>
              </div>
            </div>

            <div className="card p-5">
              <h4 className="font-serif font-semibold text-brand-800 mb-4 flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-500" />
                该主题下的所有反馈（可手动调整主题）
              </h4>

              <div className="space-y-3">
                {activeFeedback.length === 0 ? (
                  <div className="text-center py-10 text-brand-400">
                    <Eye className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p>该主题暂无反馈数据</p>
                  </div>
                ) : (
                  activeFeedback.map(fb => {
                    const fThemes = getThemesForFeedback(fb.id);
                    return (
                      <div key={fb.id} className="border border-brand-100 rounded-2xl p-4 hover:border-brand-200 transition">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <SourceBadge source={fb.source} />
                          <SeverityBadge level={fb.severity} />
                        </div>
                        <p className="text-sm text-brand-700 leading-relaxed mb-3">
                          "{fb.content}"
                        </p>
                        <div className="border-t border-brand-50 pt-3">
                          <div className="text-[11px] text-brand-400 mb-1.5 uppercase tracking-wider">
                            所属主题（点击添加/移除）
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {themes.map(t => {
                              const has = fThemes.some(x => x.id === t.id);
                              return (
                                <button
                                  key={t.id}
                                  onClick={() => {
                                    const current = fThemes.map(x => x.id);
                                    const next = has ? current.filter(id => id !== t.id) : [...current, t.id];
                                    setFeedbackThemes(fb.id, next);
                                  }}
                                  className={cn(
                                    'tag border transition-all gap-1.5',
                                    has
                                      ? 'border-transparent text-white'
                                      : 'border-dashed border-brand-200 text-brand-400 hover:border-brand-300 hover:text-brand-600'
                                  )}
                                  style={has ? { backgroundColor: t.color } : {}}
                                >
                                  <span className={cn('w-1.5 h-1.5 rounded-full', !has && 'bg-brand-300')} style={has ? { backgroundColor: 'white' } : {}} />
                                  {t.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
