import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Palette,
  User,
  Flame,
  Lightbulb,
  ChevronRight,
  Search,
  Filter,
  Edit3,
  Save,
  X,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Target,
  Palette as PaletteIcon,
  Sparkles,
  Plus,
} from 'lucide-react';
import { useFiringStore } from '../store/firingStore';
import FiringCurveChart from '../components/FiringCurveChart';
import { formatHours, formatTemp, segmentTypeNames, generateId } from '../utils/curveCalc';
import { cn } from '../lib/utils';
import type { StudentWork, FiringSegment } from '../types';

const deviationLabels: Record<StudentWork['colorDeviation'], { label: string; cls: string; icon: string }> = {
  excellent: { label: '极佳', cls: 'bg-emerald-100 text-emerald-700 border-emerald-300', icon: '✨' },
  good: { label: '正常', cls: 'bg-blue-100 text-blue-700 border-blue-300', icon: '✅' },
  slight: { label: '微偏', cls: 'bg-amber-100 text-amber-700 border-amber-300', icon: '⚠️' },
  significant: { label: '明显偏差', cls: 'bg-orange-100 text-orange-700 border-orange-300', icon: '🔥' },
  failed: { label: '失败', cls: 'bg-red-100 text-red-700 border-red-300', icon: '❌' },
};

const WorksPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { records, setCurrentRecord, updateWork } = useFiringStore();
  const record = records.find((r) => r.id === id) || records[0];
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | StudentWork['colorDeviation']>('all');
  const [search, setSearch] = useState('');
  const [editingWork, setEditingWork] = useState<StudentWork | null>(null);
  const [editImpact, setEditImpact] = useState('');

  useMemo(() => {
    if (record) setCurrentRecord(record.id);
  }, [record, setCurrentRecord]);

  if (!record) {
    return (
      <div className="p-8 text-center">
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          返回首页
        </button>
      </div>
    );
  }

  const allWorks = record.batches.flatMap((b) =>
    b.works.map((w) => ({ ...w, batchId: b.id, batchName: b.name })),
  );

  const filteredWorks = allWorks.filter((w) => {
    if (filter !== 'all' && w.colorDeviation !== filter) return false;
    if (search && !(w.studentName.toLowerCase().includes(search.toLowerCase()) || w.workName.toLowerCase().includes(search.toLowerCase())))
      return false;
    return true;
  });

  const selectedWork = selectedWorkId
    ? allWorks.find((w) => w.id === selectedWorkId)
    : null;

  const relatedSegments = selectedWork
    ? record.segments.filter((s) => selectedWork.relatedSegmentIds.includes(s.id))
    : [];

  const stats = useMemo(() => {
    const counts: Record<StudentWork['colorDeviation'], number> = {
      excellent: 0,
      good: 0,
      slight: 0,
      significant: 0,
      failed: 0,
    };
    allWorks.forEach((w) => counts[w.colorDeviation]++);
    return counts;
  }, [allWorks]);

  const avgScore =
    allWorks.length > 0
      ? (allWorks.reduce((s, w) => {
          const scores = { excellent: 5, good: 4, slight: 3, significant: 2, failed: 1 };
          return s + scores[w.colorDeviation];
        }, 0) /
          allWorks.length)
      : 0;

  const startEdit = (w: StudentWork) => {
    setEditingWork(w);
    setEditImpact(w.impactExplanation);
  };

  const saveEdit = () => {
    if (!editingWork) return;
    const batch = record.batches.find((b) => b.works.some((w) => w.id === editingWork.id));
    if (batch) {
      updateWork(record.id, batch.id, editingWork.id, { impactExplanation: editImpact });
    }
    setEditingWork(null);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1800px] mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            className="btn btn-ghost !p-2 !rounded-lg border border-kiln-200 hover:bg-white"
            onClick={() => navigate(`/report/${record.id}`)}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="badge bg-clay-100 text-clay-700 border-clay-200">
                <PaletteIcon className="w-3 h-3" />
                作品讲评中心
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-gradient-fire">
              {record.name} · 作品釉色讲评
            </h1>
            <p className="text-sm text-kiln-500 mt-0.5">
              共 {allWorks.length} 件作品 · 平均得分 {avgScore.toFixed(1)}/5.0
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-kiln-400" />
            <input
              className="input !pl-9 !w-48"
              placeholder="搜索学生/作品..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1 p-1 rounded-lg bg-kiln-50 border border-kiln-200">
            {(['all', 'excellent', 'good', 'slight', 'significant', 'failed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-medium transition-all',
                  filter === f
                    ? 'bg-white text-fire-700 shadow-sm'
                    : 'text-kililn-500 hover:text-kililn-700',
                )}
              >
                {f === 'all' ? `全部 ${allWorks.length}` : `${deviationLabels[f].icon} ${stats[f]}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(
          [
            { k: 'excellent', title: '极佳', cls: 'from-emerald-50 to-teal-50 border-emerald-100', value: stats.excellent },
            { k: 'good', title: '正常', cls: 'from-blue-50 to-indigo-50 border-blue-100', value: stats.good },
            { k: 'slight', title: '微偏', cls: 'from-amber-50 to-yellow-50 border-amber-100', value: stats.slight },
            { k: 'significant', title: '明显偏差', cls: 'from-orange-50 to-red-50 border-orange-100', value: stats.significant },
            { k: 'failed', title: '失败', cls: 'from-red-50 to-rose-50 border-red-100', value: stats.failed },
          ] as const
        ).map((c) => (
          <div
            key={c.k}
            className={cn(
              'card p-4 bg-gradient-to-br border',
              c.cls,
              filter === c.k && 'ring-2 ring-fire-400/50 cursor-pointer',
            )}
            onClick={() => setFilter(c.k)}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-kililn-500 font-medium">{c.title}</p>
                <p className="text-2xl font-bold font-display text-kililn-800 mt-0.5">{c.value}</p>
              </div>
              <span className="text-2xl">{deviationLabels[c.k].icon}</span>
            </div>
            <p className="text-[10px] text-kililn-500 mt-1">
              {allWorks.length > 0 ? ((c.value / allWorks.length) * 100).toFixed(0) : 0}% 占比
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-2 space-y-4">
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-display font-bold text-kililn-800 flex items-center gap-2">
                <Layers className="w-4 h-4 text-clay-500" />
                作品列表（{filteredWorks.length}）
              </h3>
              <span className="text-[11px] text-kililn-500">点击查看影响分析</span>
            </div>
            <div className="space-y-2 max-h-[640px] overflow-y-auto custom-scroll-container pr-1">
              {filteredWorks.map((w, i) => (
                <button
                  key={w.id}
                  onClick={() => setSelectedWorkId(w.id === selectedWorkId ? null : w.id)}
                  className={cn(
                    'w-full text-left p-3.5 rounded-xl border transition-all group',
                    selectedWorkId === w.id
                      ? 'bg-gradient-to-r from-fire-50 to-amber-50 border-fire-300 shadow-card glow-orange'
                      : 'bg-white/70 border-kililn-100 hover:border-kililn-300 hover:shadow-card',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-clay-200 to-clay-400 flex items-center justify-center text-white font-bold font-display shrink-0 shadow-sm">
                      {w.studentName?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-kililn-800 truncate">
                              {w.workName || '未命名'}
                            </span>
                            <span className="text-[10px] text-kililn-400">#{i + 1}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <User className="w-3 h-3 text-kililn-400" />
                            <span className="text-xs text-kililn-600 truncate">
                              {w.studentName || '未署名'}
                            </span>
                            <span className="text-kililn-300">·</span>
                            <span className="text-[10.5px] text-kililn-500 truncate">
                              {w.glaze.name || '未知釉'}
                            </span>
                          </div>
                        </div>
                        <span className={cn('badge !text-[10px] shrink-0', deviationLabels[w.colorDeviation].cls)}>
                          {deviationLabels[w.colorDeviation].icon}
                          {deviationLabels[w.colorDeviation].label}
                        </span>
                      </div>
                      {w.shelfPosition && (
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-[10.5px] text-kililn-500 flex items-center gap-1">
                            📍 {w.shelfPosition}
                          </span>
                          <span className="text-[10.5px] text-kililn-500 flex items-center gap-1">
                            <Layers className="w-3 h-3" /> {w.batchName}
                          </span>
                        </div>
                      )}
                    </div>
                    <ChevronRight
                      className={cn(
                        'w-4 h-4 shrink-0 mt-1 transition-transform',
                        selectedWorkId === w.id && 'text-fire-500 rotate-90',
                        selectedWorkId !== w.id && 'text-kililn-400 group-hover:text-kililn-600',
                      )}
                    />
                  </div>
                </button>
              ))}

              {filteredWorks.length === 0 && (
                <div className="p-8 text-center text-kililn-400">
                  <PaletteIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">暂无符合条件的作品</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="xl:col-span-3 space-y-5">
          {!selectedWork ? (
            <div className="card p-12 text-center">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-fire-100 to-clay-100 flex items-center justify-center mb-4">
                <Sparkles className="w-10 h-10 text-fire-400" />
              </div>
              <h3 className="text-xl font-display font-bold text-kililn-800 mb-2">
                选择一件作品，查看烧成曲线影响分析
              </h3>
              <p className="text-sm text-kililn-500 max-w-md mx-auto">
                点击左侧任意作品卡片，老师可以关联曲线上的关键时段，
                清晰说明"哪一步操作影响了最终釉色"，用于课堂教学讲评。
              </p>
            </div>
          ) : (
            <>
              <FiringCurveChart
                record={record}
                height={320}
                selectedSegmentId={relatedSegments[0]?.id || null}
              />

              <div className="card overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-clay-50 via-white to-fire-50 border-b border-kililn-100">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-clay-300 to-clay-500 flex items-center justify-center text-white text-2xl font-bold font-display shadow-md">
                        {selectedWork.studentName?.charAt(0) || '?'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h2 className="text-xl font-display font-bold text-kililn-800">
                            {selectedWork.workName}
                          </h2>
                          <span className={cn('badge text-xs', deviationLabels[selectedWork.colorDeviation].cls)}>
                            {deviationLabels[selectedWork.colorDeviation].icon}{' '}
                            {deviationLabels[selectedWork.colorDeviation].label}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-kililn-600">
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5" /> {selectedWork.studentName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Palette className="w-3.5 h-3.5" /> {selectedWork.glaze.name}
                          </span>
                          <span className="flex items-center gap-1">
                            📍 {selectedWork.shelfPosition} ({selectedWork.batchName})
                          </span>
                        </div>
                      </div>
                    </div>
                    {editingWork?.id !== selectedWork.id && (
                      <button
                        className="btn btn-secondary !py-1.5 !px-3 text-xs"
                        onClick={() => startEdit(selectedWork)}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        编辑讲评
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5">
                  <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4 text-blue-500" />
                      <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">预期釉色</span>
                    </div>
                    <p className="text-sm text-blue-800 leading-relaxed">
                      {selectedWork.expectedColor || '未填写预期描述'}
                    </p>
                    {selectedWork.glaze.firingTemp > 0 && (
                      <p className="text-[11px] text-blue-600 mt-2 font-mono">
                        釉料烧成温度：{formatTemp(selectedWork.glaze.firingTemp, 'C')}
                      </p>
                    )}
                  </div>
                  <div className="p-4 rounded-xl bg-gradient-to-br from-fire-50/60 to-amber-50/60 border border-fire-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Flame className="w-4 h-4 text-fire-500" />
                      <span className="text-xs font-bold text-fire-700 uppercase tracking-wider">实际釉色（出窑）</span>
                    </div>
                    <p className="text-sm text-fire-800 leading-relaxed">
                      {selectedWork.actualColor || '出窑后请补充实际釉色描述'}
                    </p>
                  </div>
                </div>

                {relatedSegments.length > 0 && (
                  <div className="px-5 pb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                        关联烧成段（{relatedSegments.length} 段）
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {relatedSegments.map((seg) => (
                        <SegmentHighlightCard key={seg.id} seg={seg} />
                      ))}
                    </div>
                  </div>
                )}

                <div className="px-5 pb-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-amber-500" />
                      <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                        老师讲评 · 釉色偏差原因分析
                      </span>
                    </div>
                    {editingWork?.id === selectedWork.id && (
                      <div className="flex items-center gap-1.5">
                        <button
                          className="btn btn-secondary !py-1 !px-2 text-[11px]"
                          onClick={() => setEditingWork(null)}
                        >
                          <X className="w-3.5 h-3.5" />
                          取消
                        </button>
                        <button
                          className="btn btn-primary !py-1 !px-2 text-[11px]"
                          onClick={saveEdit}
                        >
                          <Save className="w-3.5 h-3.5" />
                          保存
                        </button>
                      </div>
                    )}
                  </div>

                  {editingWork?.id === selectedWork.id ? (
                    <textarea
                      className="input min-h-[160px] text-sm leading-relaxed resize-y font-sans"
                      value={editImpact}
                      onChange={(e) => setEditImpact(e.target.value)}
                      placeholder="说明这几件作品在烧成过程中受到哪些阶段的影响，以及为什么会呈现这样的釉色效果..."
                    />
                  ) : (
                    <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 via-white to-indigo-50/40 border border-amber-100 relative overflow-hidden">
                      <div className="absolute top-2 right-3 text-5xl opacity-5">💡</div>
                      {selectedWork.impactExplanation ? (
                        <div className="text-sm text-kililn-700 leading-relaxed whitespace-pre-line">
                          {selectedWork.impactExplanation}
                        </div>
                      ) : (
                        <p className="text-sm text-kililn-500 italic">
                          点击右上角「编辑讲评」，填写针对该作品的烧成影响分析和教学讲评要点...
                        </p>
                      )}
                    </div>
                  )}

                  {selectedWork.glaze.notes && (
                    <div className="mt-3 p-3 rounded-xl bg-kililn-50 border border-kililn-100">
                      <p className="text-[11px] font-bold text-kililn-600 uppercase mb-1">
                        🧪 釉料特性备注
                      </p>
                      <p className="text-xs text-kililn-600 leading-relaxed">{selectedWork.glaze.notes}</p>
                    </div>
                  )}

                  {selectedWork.glaze.ingredients.length > 0 && (
                    <div className="mt-3 p-3 rounded-xl bg-kililn-50 border border-kililn-100">
                      <p className="text-[11px] font-bold text-kililn-600 uppercase mb-2">
                        🧪 釉料配方（{selectedWork.glaze.ingredients.length} 种原料）
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedWork.glaze.ingredients.map((ing, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center px-2 py-0.5 rounded-md bg-white border border-kililn-200 text-[11px] text-kililn-700"
                          >
                            {ing.name}
                            <span className="ml-1 font-mono font-bold text-kililn-500">
                              {ing.percentage}%
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const SegmentHighlightCard = ({ seg }: { seg: FiringSegment }) => {
  const colors: Record<string, string> = {
    heating: 'from-fire-50 to-orange-50 border-fire-200 text-fire-700',
    holding: 'from-amber-50 to-yellow-50 border-amber-200 text-amber-700',
    cooling: 'from-blue-50 to-sky-50 border-blue-200 text-blue-700',
  };
  const icons = { heating: Flame, holding: AlertTriangle, cooling: AlertTriangle };
  const Icon = icons[seg.type];
  return (
    <div className={cn('p-3 rounded-xl border bg-gradient-to-br relative overflow-hidden', colors[seg.type])}>
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-bold uppercase tracking-wider">{segmentTypeNames[seg.type]}</span>
        <span className={cn('ml-auto grade-ring w-6 h-6 text-[11px] grade-' + (seg.grade || 'B'))}>
          {seg.grade || 'B'}
        </span>
      </div>
      <p className="text-xs font-mono font-bold mb-1">
        T+{seg.startTime.toFixed(1)}h ~ T+{seg.endTime.toFixed(1)}h · 时长 {formatHours(seg.durationHours)}
      </p>
      <p className="text-[11px] font-mono opacity-80">
        {seg.startTemp.toFixed(0)} → {seg.endTemp.toFixed(0)}℃ · 速率 {seg.rate > 0 ? '+' : ''}
        {seg.rate.toFixed(0)}℃/h · 平均偏差 ±{seg.avgDeviation.toFixed(1)}℃
      </p>
    </div>
  );
};

export default WorksPage;
