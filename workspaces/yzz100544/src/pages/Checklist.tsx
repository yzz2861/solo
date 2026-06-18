import React, { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAppStore } from '@/store/appStore';
import { PriorityBadge, StatusBadge, ThemeTag } from '@/components/ui/Badge';
import type { Improvement, PriorityLevel, ImprovementStatus } from '@/types';
import {
  ClipboardList, Plus, Download, Edit3, Trash2, ChevronDown, ChevronUp,
  Target, Sparkles, FileText, Clock, User, CheckCircle2, Circle,
  ListOrdered, Settings2, RefreshCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { exportMarkdownChecklist, exportExcelChecklist, downloadMarkdown, downloadBlob, formatDate } from '@/utils/io';

const PRIORITY_ORDER: PriorityLevel[] = ['high', 'medium', 'low'];
const STATUS_ORDER: ImprovementStatus[] = ['todo', 'doing', 'done'];

export default function Checklist() {
  const {
    improvements, themes, courses, feedback,
    getThemeStats,
    addImprovement, updateImprovement, deleteImprovement, setImprovementStatus,
  } = useAppStore();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<PriorityLevel | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<ImprovementStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'priority' | 'status'>('priority');
  const [showNew, setShowNew] = useState(false);
  const [newImp, setNewImp] = useState({
    title: '', description: '', priority: 'medium' as PriorityLevel, estimatedMinutes: 15,
  });

  const themeStats = useMemo(() => getThemeStats(), [themes, feedback]);

  const sortedImprovements = useMemo(() => {
    let list = [...improvements];
    if (filterPriority !== 'all') list = list.filter(i => i.priority === filterPriority);
    if (filterStatus !== 'all') list = list.filter(i => i.status === filterStatus);

    if (sortBy === 'priority') {
      const order = { high: 0, medium: 1, low: 2 };
      list.sort((a, b) => order[a.priority] - order[b.priority]);
    } else {
      const order = { todo: 0, doing: 1, done: 2 };
      list.sort((a, b) => order[a.status] - order[b.status]);
    }
    return list;
  }, [improvements, filterPriority, filterStatus, sortBy]);

  const handleCreate = async () => {
    if (!newImp.title.trim()) return;
    await addImprovement({
      title: newImp.title,
      description: newImp.description,
      priority: newImp.priority,
      representativeQuotes: [],
      relatedThemeIds: [],
      status: 'todo',
      estimatedMinutes: newImp.estimatedMinutes,
    });
    setShowNew(false);
    setNewImp({ title: '', description: '', priority: 'medium', estimatedMinutes: 15 });
  };

  const handleExportMarkdown = () => {
    const md = exportMarkdownChecklist(improvements, themes, courses, themeStats, feedback.length);
    const date = formatDate(new Date());
    downloadMarkdown(md, `教学改进清单_${date}.md`);
  };

  const handleExportExcel = () => {
    const blob = exportExcelChecklist(improvements, themes, courses);
    const date = formatDate(new Date());
    downloadBlob(blob, `教学改进清单_${date}.xlsx`);
  };

  const cycleStatus = async (imp: Improvement) => {
    const order: ImprovementStatus[] = ['todo', 'doing', 'done'];
    const next = order[(order.indexOf(imp.status) + 1) % order.length];
    await setImprovementStatus(imp.id, next);
  };

  const ImprovementCard = ({ imp, index }: { imp: Improvement; index: number }) => {
    const isExpanded = expandedId === imp.id;
    const isEditing = editingId === imp.id;
    const relatedThemes = themes.filter(t => imp.relatedThemeIds.includes(t.id));
    const course = courses.find(c => c.id === imp.courseId);

    return (
      <div
        className="card overflow-hidden animate-fade-in-up"
        style={{ animationDelay: `${index * 40}ms` }}
      >
        <div
          className="p-5 cursor-pointer hover:bg-paper-50/60 transition"
          onClick={() => setExpandedId(isExpanded ? null : imp.id)}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <button
                onClick={e => { e.stopPropagation(); cycleStatus(imp); }}
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-all',
                  imp.status === 'done'
                    ? 'bg-green-100 text-green-600'
                    : imp.status === 'doing'
                      ? 'bg-blue-100 text-blue-600'
                      : 'border-2 border-brand-200 text-transparent hover:border-brand-400'
                )}
              >
                {imp.status === 'done' ? <CheckCircle2 className="w-5 h-5" /> :
                  imp.status === 'doing' ? <Circle className="w-3 h-3 fill-current" /> :
                    <Circle className="w-3 h-3" />
                }
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <PriorityBadge priority={imp.priority} />
                  <StatusBadge status={imp.status} />
                  {imp.estimatedMinutes && (
                    <span className="badge bg-brand-50 text-brand-600 border-brand-100">
                      <Clock className="w-3 h-3" />
                      {imp.estimatedMinutes}分钟
                    </span>
                  )}
                </div>
                <h4 className={cn(
                  'font-serif font-semibold text-brand-800 text-base leading-snug',
                  imp.status === 'done' && 'line-through text-brand-400'
                )}>
                  {imp.title}
                </h4>
                {imp.description && (
                  <p className="text-sm text-brand-500 mt-1.5 line-clamp-2 leading-relaxed">
                    {imp.description}
                  </p>
                )}

                {relatedThemes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {relatedThemes.map(t => (
                      <ThemeTag key={t.id} name={t.name} color={t.color} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={e => { e.stopPropagation(); setEditingId(isEditing ? null : imp.id); }}
                className="w-9 h-9 rounded-xl hover:bg-brand-50 flex items-center justify-center text-brand-400 hover:text-brand-600 transition"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              {isExpanded
                ? <ChevronUp className="w-5 h-5 text-brand-300" />
                : <ChevronDown className="w-5 h-5 text-brand-300" />
              }
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="px-5 pb-5 border-t border-brand-50 animate-fade-in">
            {imp.representativeQuotes.length > 0 && (
              <div className="mt-4">
                <div className="text-xs font-medium text-brand-500 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  代表原话
                </div>
                <div className="space-y-2">
                  {imp.representativeQuotes.map((q, i) => (
                    <div key={i} className="quote-block text-sm">
                      "{q}"
                    </div>
                  ))}
                </div>
              </div>
            )}

            {course && (
              <div className="mt-4 p-3 rounded-xl bg-violet-50 border border-violet-100">
                <div className="text-xs font-medium text-violet-700 mb-1">分配课程</div>
                <div className="text-sm text-violet-800 font-medium">
                  第{course.courseNumber}节课 · {course.name}
                </div>
                <div className="text-xs text-violet-600 mt-0.5">
                  {formatDate(course.scheduledAt)}
                </div>
                {imp.owner && (
                  <div className="text-xs text-violet-700 mt-1.5 flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {imp.owner}
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => deleteImprovement(imp.id)}
                className="btn-danger text-xs !py-1.5 !px-3"
              >
                <Trash2 className="w-3.5 h-3.5" />
                删除
              </button>
            </div>
          </div>
        )}

        {isEditing && (
          <div className="px-5 pb-5 border-t border-brand-50 animate-fade-in space-y-3 pt-4">
            <div>
              <label className="text-xs font-medium text-brand-600 mb-1 block">标题</label>
              <input
                value={imp.title}
                onChange={e => updateImprovement(imp.id, { title: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-brand-600 mb-1 block">描述</label>
              <textarea
                value={imp.description}
                onChange={e => updateImprovement(imp.id, { description: e.target.value })}
                className="textarea"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-brand-600 mb-1 block">优先级</label>
                <select
                  value={imp.priority}
                  onChange={e => updateImprovement(imp.id, { priority: e.target.value as PriorityLevel })}
                  className="input"
                >
                  <option value="high">P0 高</option>
                  <option value="medium">P1 中</option>
                  <option value="low">P2 低</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-brand-600 mb-1 block">建议课时(分钟)</label>
                <input
                  type="number"
                  value={imp.estimatedMinutes ?? ''}
                  onChange={e => updateImprovement(imp.id, { estimatedMinutes: e.target.value ? Number(e.target.value) : undefined })}
                  className="input"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditingId(null)} className="btn-ghost text-sm">完成</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <AppLayout
      title="改进清单"
      subtitle={`${improvements.length} 条教学改进点 · ${improvements.filter(i => i.status === 'done').length} 已完成`}
      actions={
        <div className="flex items-center gap-2">
          <button onClick={handleExportMarkdown} className="btn-secondary">
            <FileText className="w-4 h-4" />
            导出 Markdown
          </button>
          <button onClick={handleExportExcel} className="btn-secondary">
            <Download className="w-4 h-4" />
            导出 Excel
          </button>
          <button onClick={() => setShowNew(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            新增改进
          </button>
        </div>
      }
    >
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowNew(false)}>
          <div className="absolute inset-0 bg-brand-950/40 backdrop-blur-sm" />
          <div
            onClick={e => e.stopPropagation()}
            className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-hover animate-fade-in-up"
          >
            <h3 className="font-serif text-xl font-bold text-brand-800 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              新增改进点
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-brand-700 mb-1.5 block">改进点标题</label>
                <input
                  value={newImp.title}
                  onChange={e => setNewImp(p => ({ ...p, title: e.target.value }))}
                  className="input"
                  placeholder="如：补讲拉普拉斯变换概念"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-brand-700 mb-1.5 block">详细描述</label>
                <textarea
                  value={newImp.description}
                  onChange={e => setNewImp(p => ({ ...p, description: e.target.value }))}
                  className="textarea"
                  rows={3}
                  placeholder="说明为什么需要改进、怎么改进"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-brand-700 mb-1.5 block">优先级</label>
                  <select
                    value={newImp.priority}
                    onChange={e => setNewImp(p => ({ ...p, priority: e.target.value as PriorityLevel }))}
                    className="input"
                  >
                    <option value="high">P0 高</option>
                    <option value="medium">P1 中</option>
                    <option value="low">P2 低</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-brand-700 mb-1.5 block">建议课时</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={newImp.estimatedMinutes}
                      onChange={e => setNewImp(p => ({ ...p, estimatedMinutes: Number(e.target.value) }))}
                      className="input"
                    />
                    <span className="text-sm text-brand-500">分钟</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setShowNew(false)} className="btn-ghost">取消</button>
              <button onClick={handleCreate} className="btn-primary">创建</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <div className="card p-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-paper-50 border border-brand-100">
              {(['all', 'high', 'medium', 'low'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setFilterPriority(p)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    filterPriority === p ? 'bg-white text-brand-700 shadow-soft' : 'text-brand-500 hover:text-brand-700'
                  )}
                >
                  {p === 'all' ? '全部优先级' : p === 'high' ? 'P0 高' : p === 'medium' ? 'P1 中' : 'P2 低'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 p-1 rounded-xl bg-paper-50 border border-brand-100">
              {(['all', 'todo', 'doing', 'done'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    filterStatus === s ? 'bg-white text-brand-700 shadow-soft' : 'text-brand-500 hover:text-brand-700'
                  )}
                >
                  {s === 'all' ? '全部状态' : s === 'todo' ? '待办' : s === 'doing' ? '进行中' : '已完成'}
                </button>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-brand-400">排序：</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as 'priority' | 'status')}
                className="input !py-1.5 !text-xs w-auto"
              >
                <option value="priority">按优先级</option>
                <option value="status">按状态</option>
              </select>
            </div>
          </div>

          {sortedImprovements.length === 0 ? (
            <div className="card p-16 text-center">
              <Target className="w-16 h-16 mx-auto mb-4 text-brand-200" />
              <h3 className="font-serif text-lg text-brand-700 mb-2">暂无改进点</h3>
              <p className="text-brand-400 mb-5">
                从聚类分析中生成改进建议，或手动添加新的改进点
              </p>
              <button onClick={() => setShowNew(true)} className="btn-primary">
                <Plus className="w-4 h-4" />
                添加第一个改进点
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedImprovements.map((imp, i) => (
                <ImprovementCard key={imp.id} imp={imp} index={i} />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-serif font-semibold text-brand-800 mb-4 flex items-center gap-2">
              <ListOrdered className="w-5 h-5 text-brand-600" />
              完成进度
            </h3>
            {improvements.length > 0 ? (
              <>
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-brand-600">总体进度</span>
                    <span className="font-mono font-bold text-brand-700">
                      {Math.round(improvements.filter(i => i.status === 'done').length / improvements.length * 100)}%
                    </span>
                  </div>
                  <div className="progress-bar h-3">
                    <div
                      className="progress-fill bg-gradient-to-r from-emerald-400 to-emerald-500"
                      style={{
                        width: `${improvements.filter(i => i.status === 'done').length / improvements.length * 100}%`
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-2.5">
                  {STATUS_ORDER.map(s => {
                    const count = improvements.filter(i => i.status === s).length;
                    const labels: Record<ImprovementStatus, string> = { todo: '待办', doing: '进行中', done: '已完成' };
                    const colors: Record<ImprovementStatus, string> = {
                      todo: 'bg-gray-400', doing: 'bg-blue-500', done: 'bg-emerald-500'
                    };
                    return (
                      <div key={s} className="flex items-center gap-3">
                        <div className={cn('w-2.5 h-2.5 rounded-full', colors[s])} />
                        <span className="text-sm text-brand-600 flex-1">{labels[s]}</span>
                        <span className="font-mono font-semibold text-brand-800 text-sm">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="text-sm text-brand-400 text-center py-6">暂无数据</p>
            )}
          </div>

          <div className="card p-5">
            <h3 className="font-serif font-semibold text-brand-800 mb-4 flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-amber-500" />
              快速生成
            </h3>
            <p className="text-xs text-brand-500 leading-relaxed mb-4">
              基于当前聚类主题，自动生成对应的教学改进建议
            </p>
            <GenerateFromThemesButton />
          </div>

          <div className="rounded-2xl p-5 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100">
            <div className="flex items-center gap-2 mb-2 text-amber-800">
              <Sparkles className="w-5 h-5" />
              <span className="font-semibold text-sm">小贴士</span>
            </div>
            <p className="text-xs text-amber-700/90 leading-relaxed">
              点击左侧状态圆圈可快速切换改进点状态。把改进点分配到具体课程，可在「课程跟进」页面持续跟踪进度哦。
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function GenerateFromThemesButton() {
  const { getThemeStats, addImprovement, themes } = useAppStore();
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    const stats = getThemeStats().filter(t => t.feedbackCount > 0);
    const priorityMap: Record<string, PriorityLevel> = {
      concept: 'high', formula: 'high', step: 'medium',
      tool: 'medium', ambiguity: 'medium', difficulty: 'low',
    };

    for (const t of stats) {
      const priority = (priorityMap[t.id] ?? 'medium') as PriorityLevel;
      await addImprovement({
        title: `补讲${t.name}相关内容`,
        description: t.description ?? `根据作业反馈，学生在"${t.name}"方面问题较多，需要在课上重点回顾和强化练习。`,
        priority,
        status: 'todo',
        representativeQuotes: t.representativeQuotes,
        relatedThemeIds: [t.id],
        estimatedMinutes: t.feedbackCount > 10 ? 25 : t.feedbackCount > 5 ? 15 : 10,
      });
    }
    setTimeout(() => setGenerating(false), 500);
  };

  return (
    <button
      onClick={handleGenerate}
      disabled={generating}
      className="w-full btn-primary text-sm"
    >
      <RefreshCcw className={cn('w-4 h-4', generating && 'animate-spin')} />
      {generating ? '生成中...' : '从主题生成改进点'}
    </button>
  );
}
