import React, { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAppStore } from '@/store/appStore';
import { FeedbackCard } from '@/components/FeedbackCard';
import { ImportModal } from '@/components/ImportModal';
import { SourceBadge, SeverityBadge } from '@/components/ui/Badge';
import type { FeedbackSource, SeverityLevel } from '@/types';
import {
  Upload, Plus, Search, Filter, RefreshCw, Trash2, Download,
  User, UserCheck, XCircle, FileText, Grid, List, Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/utils/io';

const SOURCE_FILTERS: { value: FeedbackSource | 'all'; label: string; icon: any }[] = [
  { value: 'all', label: '全部', icon: Layers },
  { value: 'student', label: '学生', icon: User },
  { value: 'ta', label: '助教', icon: UserCheck },
  { value: 'wrong_answer', label: '错题', icon: XCircle },
];

const SEVERITY_FILTERS: { value: SeverityLevel | 'all'; label: string }[] = [
  { value: 'all', label: '全部等级' },
  { value: 'critical', label: '🔴 严重' },
  { value: 'rare-critical', label: '⭐ 低频严重' },
  { value: 'important', label: '🟠 重要' },
  { value: 'normal', label: '🟡 一般' },
];

export default function DataManager() {
  const { feedback, themes, homeworkList, filterFeedback, runClustering, deleteFeedback, batchAddFeedback } = useAppStore();
  const [importOpen, setImportOpen] = useState(false);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [sourceFilter, setSourceFilter] = useState<FeedbackSource | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<SeverityLevel | 'all'>('all');
  const [homeworkFilter, setHomeworkFilter] = useState<string>('all');
  const [keyword, setKeyword] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const homeworks = useMemo(() => {
    const set = new Set<string>();
    feedback.forEach(f => f.homework && set.add(f.homework));
    return Array.from(set);
  }, [feedback]);

  const filtered = useMemo(() => {
    return filterFeedback({
      source: sourceFilter === 'all' ? undefined : [sourceFilter],
      severity: severityFilter === 'all' ? undefined : [severityFilter],
      homework: homeworkFilter === 'all' ? undefined : homeworkFilter,
      keyword: keyword || undefined,
    }).sort((a, b) => +b.createdAt - +a.createdAt);
  }, [feedback, sourceFilter, severityFilter, homeworkFilter, keyword]);

  const handleRunClustering = async () => {
    setRefreshing(true);
    await runClustering();
    setTimeout(() => setRefreshing(false), 600);
  };

  const handleExport = () => {
    const lines = filtered.map(f => {
      const prefix = f.source === 'student' ? 'S' : f.source === 'ta' ? 'TA' : 'W';
      return `${prefix}: ${f.content}`;
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feedback_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout
      title="数据管理"
      subtitle={`共 ${feedback.length} 条反馈 · 当前筛选 ${filtered.length} 条`}
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={handleRunClustering}
            className="btn-secondary"
            disabled={refreshing}
          >
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
            重新聚类
          </button>
          <button onClick={handleExport} className="btn-secondary">
            <Download className="w-4 h-4" />
            导出
          </button>
          <button onClick={() => setImportOpen(true)} className="btn-primary">
            <Upload className="w-4 h-4" />
            导入数据
          </button>
        </div>
      }
    >
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />

      <div className="card p-5 mb-6 animate-fade-in-up">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[280px] max-w-md">
            <Search className="w-4 h-4 text-brand-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder="搜索反馈内容、作者..."
              className="input pl-10"
            />
          </div>

          <div className="flex items-center gap-2 p-1 rounded-xl bg-paper-50 border border-brand-100">
            {SOURCE_FILTERS.map(s => (
              <button
                key={s.value}
                onClick={() => setSourceFilter(s.value)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all',
                  sourceFilter === s.value
                    ? 'bg-white text-brand-700 shadow-soft'
                    : 'text-brand-500 hover:text-brand-700'
                )}
              >
                <s.icon className="w-3.5 h-3.5" />
                {s.label}
                {s.value !== 'all' && (
                  <span className="text-[10px] text-brand-400">
                    {feedback.filter(f => f.source === s.value).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <select
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value as any)}
            className="input w-auto !py-2"
          >
            {SEVERITY_FILTERS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          <select
            value={homeworkFilter}
            onChange={e => setHomeworkFilter(e.target.value)}
            className="input w-auto !py-2"
          >
            <option value="all">全部作业</option>
            {homeworks.map(h => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>

          <div className="flex items-center p-1 rounded-xl bg-paper-50 border border-brand-100 ml-auto">
            <button
              onClick={() => setView('grid')}
              className={cn(
                'w-9 h-9 rounded-lg flex items-center justify-center transition',
                view === 'grid' ? 'bg-white text-brand-700 shadow-soft' : 'text-brand-400 hover:text-brand-600'
              )}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('list')}
              className={cn(
                'w-9 h-9 rounded-lg flex items-center justify-center transition',
                view === 'list' ? 'bg-white text-brand-700 shadow-soft' : 'text-brand-400 hover:text-brand-600'
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-16 text-center animate-fade-in">
          <FileText className="w-16 h-16 mx-auto mb-4 text-brand-200" />
          <h3 className="font-serif text-lg text-brand-700 mb-2">没有匹配的反馈</h3>
          <p className="text-brand-400 mb-5">尝试调整筛选条件或导入新的反馈数据</p>
          <button onClick={() => setImportOpen(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            导入反馈
          </button>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((fb, i) => (
            <div key={fb.id} style={{ animationDelay: `${i * 30}ms` }} className="animate-fade-in-up">
              <FeedbackCard
                feedback={fb}
                compact
                onDelete={() => deleteFeedback(fb.id)}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden animate-fade-in-up">
          <table className="w-full text-sm">
            <thead className="bg-paper-50 border-b border-brand-100">
              <tr>
                <th className="text-left px-5 py-3.5 font-medium text-brand-500 text-xs uppercase tracking-wider w-24">来源</th>
                <th className="text-left px-5 py-3.5 font-medium text-brand-500 text-xs uppercase tracking-wider">内容</th>
                <th className="text-left px-5 py-3.5 font-medium text-brand-500 text-xs uppercase tracking-wider w-32">作者/作业</th>
                <th className="text-left px-5 py-3.5 font-medium text-brand-500 text-xs uppercase tracking-wider w-28">严重度</th>
                <th className="text-left px-5 py-3.5 font-medium text-brand-500 text-xs uppercase tracking-wider w-40">时间</th>
                <th className="text-right px-5 py-3.5 font-medium text-brand-500 text-xs uppercase tracking-wider w-16">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-50">
              {filtered.map(fb => (
                <tr key={fb.id} className="hover:bg-brand-50/30 transition-colors">
                  <td className="px-5 py-4"><SourceBadge source={fb.source} /></td>
                  <td className="px-5 py-4">
                    <p className="text-brand-700 line-clamp-2 leading-relaxed">{fb.content}</p>
                  </td>
                  <td className="px-5 py-4 text-xs text-brand-500">
                    <div>{fb.author || '-'}</div>
                    <div className="text-brand-400">{fb.homework || '-'}</div>
                  </td>
                  <td className="px-5 py-4"><SeverityBadge level={fb.severity} /></td>
                  <td className="px-5 py-4 text-xs text-brand-400 font-mono">{formatDateTime(fb.createdAt)}</td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => deleteFeedback(fb.id)}
                      className="w-8 h-8 rounded-lg hover:bg-red-50 text-brand-300 hover:text-red-500 flex items-center justify-center transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  );
}
