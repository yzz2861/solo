import React, { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAppStore } from '@/store/appStore';
import { PriorityBadge, StatusBadge, ThemeTag } from '@/components/ui/Badge';
import type { Course, Improvement, ImprovementStatus } from '@/types';
import {
  Calendar, Plus, MoreHorizontal, Trash2, Clock, Target, BarChart3,
  ChevronRight, Edit3, GripVertical, BookOpen, CheckCircle2, XCircle,
  Play, Pause, User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate, formatDateTime } from '@/utils/io';

const STATUS_COLUMNS: { key: ImprovementStatus; label: string; icon: any; color: string }[] = [
  { key: 'todo', label: '待办', icon: Target, color: 'text-gray-500' },
  { key: 'doing', label: '进行中', icon: Play, color: 'text-blue-500' },
  { key: 'done', label: '已完成', icon: CheckCircle2, color: 'text-emerald-500' },
];

export default function CourseTracker() {
  const {
    courses, improvements, themes,
    addCourse, updateCourse, deleteCourse,
    assignImprovementToCourse, updateImprovement,
  } = useAppStore();

  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [showNewCourse, setShowNewCourse] = useState(false);
  const [newCourse, setNewCourse] = useState({
    name: '', courseNumber: 1, scheduledAt: formatDate(new Date(Date.now() + 86400000)), notes: '',
  });
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  const sortedCourses = useMemo(
    () => [...courses].sort((a, b) => a.courseNumber - b.courseNumber),
    [courses]
  );

  const selectedCourse = useMemo(
    () => courses.find(c => c.id === selectedCourseId) ?? null,
    [courses, selectedCourseId]
  );

  const selectedImps = useMemo(
    () => selectedCourseId ? improvements.filter(i => i.courseId === selectedCourseId) : [],
    [improvements, selectedCourseId]
  );

  const unassignedImps = useMemo(
    () => improvements.filter(i => !i.courseId),
    [improvements]
  );

  const handleCreateCourse = async () => {
    if (!newCourse.name.trim()) return;
    await addCourse({
      name: newCourse.name,
      courseNumber: newCourse.courseNumber,
      scheduledAt: new Date(newCourse.scheduledAt),
      notes: newCourse.notes,
    });
    setShowNewCourse(false);
    setNewCourse({ name: '', courseNumber: sortedCourses.length + 1, scheduledAt: formatDate(new Date(Date.now() + 86400000)), notes: '' });
  };

  const moveStatus = async (imp: Improvement, target: ImprovementStatus) => {
    await updateImprovement(imp.id, { status: target });
  };

  const ImprovementCard = ({ imp, draggable = true }: { imp: Improvement; draggable?: boolean }) => {
    const course = courses.find(c => c.id === imp.courseId);
    const relatedThemes = themes.filter(t => imp.relatedThemeIds.includes(t.id));

    return (
      <div
        draggable={draggable}
        className="card p-4 cursor-grab active:cursor-grabbing hover:shadow-card transition-all group"
      >
        <div className="flex items-start gap-2">
          <GripVertical className="w-4 h-4 text-brand-200 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <PriorityBadge priority={imp.priority} />
              <StatusBadge status={imp.status} />
              {imp.estimatedMinutes && (
                <span className="text-[11px] text-brand-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {imp.estimatedMinutes}min
                </span>
              )}
            </div>
            <h4 className="text-sm font-medium text-brand-800 leading-snug group-hover:text-brand-600 transition">
              {imp.title}
            </h4>
            {imp.description && (
              <p className="text-xs text-brand-400 mt-1.5 line-clamp-2 leading-relaxed">
                {imp.description}
              </p>
            )}
            {relatedThemes.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {relatedThemes.slice(0, 3).map(t => (
                  <ThemeTag key={t.id} name={t.name} color={t.color} />
                ))}
              </div>
            )}
            {imp.owner && (
              <div className="mt-3 pt-2.5 border-t border-brand-50 flex items-center gap-1.5 text-[11px] text-brand-400">
                <User className="w-3 h-3" />
                {imp.owner}
              </div>
            )}
          </div>

          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
            {imp.status !== 'doing' && (
              <button
                onClick={() => moveStatus(imp, 'doing')}
                className="w-7 h-7 rounded-lg hover:bg-blue-50 flex items-center justify-center text-brand-300 hover:text-blue-500 transition"
                title="设为进行中"
              >
                <Play className="w-3.5 h-3.5" />
              </button>
            )}
            {imp.status !== 'done' && (
              <button
                onClick={() => moveStatus(imp, 'done')}
                className="w-7 h-7 rounded-lg hover:bg-emerald-50 flex items-center justify-center text-brand-300 hover:text-emerald-500 transition"
                title="标记完成"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
            )}
            {imp.status !== 'todo' && (
              <button
                onClick={() => moveStatus(imp, 'todo')}
                className="w-7 h-7 rounded-lg hover:bg-gray-50 flex items-center justify-center text-brand-300 hover:text-gray-500 transition"
                title="重置为待办"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const CourseCard = ({ course }: { course: Course }) => {
    const courseImps = improvements.filter(i => i.courseId === course.id);
    const doneCount = courseImps.filter(i => i.status === 'done').length;
    const progress = courseImps.length > 0 ? (doneCount / courseImps.length) * 100 : 0;
    const isPast = new Date(course.scheduledAt) < new Date();

    return (
      <div
        onClick={() => setSelectedCourseId(course.id === selectedCourseId ? null : course.id)}
        className={cn(
          'card p-4 cursor-pointer transition-all',
          selectedCourseId === course.id && 'ring-2 ring-brand-400 shadow-hover -translate-y-0.5',
          isPast && 'opacity-70'
        )}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-brand-50 text-brand-700 font-mono font-bold text-sm flex items-center justify-center">
                {course.courseNumber}
              </span>
              <h4 className="font-serif font-semibold text-brand-800 leading-tight">
                {course.name}
              </h4>
            </div>
            <div className="text-xs text-brand-400 mt-2 flex items-center gap-1.5 ml-10">
              <Calendar className="w-3 h-3" />
              {formatDate(course.scheduledAt)}
            </div>
          </div>
          <ChevronRight className={cn(
            'w-5 h-5 text-brand-300 transition-transform',
            selectedCourseId === course.id && 'rotate-90'
          )} />
        </div>

        <div className="space-y-2 ml-10">
          <div className="flex items-center justify-between text-xs">
            <span className="text-brand-500">{courseImps.length} 个改进点</span>
            <span className="text-brand-400 font-mono">{Math.round(progress)}%</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill bg-gradient-to-r from-brand-500 to-brand-400"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {course.notes && selectedCourseId === course.id && (
          <p className="mt-4 pt-3 border-t border-brand-50 text-xs text-brand-500 leading-relaxed">
            {course.notes}
          </p>
        )}
      </div>
    );
  };

  return (
    <AppLayout
      title="课程跟进"
      subtitle="把改进点分配到具体课程，持续跟踪落实进度"
      actions={
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 rounded-xl bg-paper-50 border border-brand-100">
            <button
              onClick={() => setViewMode('kanban')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                viewMode === 'kanban' ? 'bg-white text-brand-700 shadow-soft' : 'text-brand-500'
              )}
            >
              看板视图
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                viewMode === 'list' ? 'bg-white text-brand-700 shadow-soft' : 'text-brand-500'
              )}
            >
              列表视图
            </button>
          </div>
          <button onClick={() => setShowNewCourse(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            新建课程
          </button>
        </div>
      }
    >
      {showNewCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowNewCourse(false)}>
          <div className="absolute inset-0 bg-brand-950/40 backdrop-blur-sm" />
          <div
            onClick={e => e.stopPropagation()}
            className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-hover animate-fade-in-up"
          >
            <h3 className="font-serif text-xl font-bold text-brand-800 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-brand-600" />
              新建课程
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-brand-700 mb-1.5 block">第几节</label>
                  <input
                    type="number"
                    value={newCourse.courseNumber}
                    onChange={e => setNewCourse(p => ({ ...p, courseNumber: Number(e.target.value) }))}
                    className="input"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-brand-700 mb-1.5 block">上课日期</label>
                  <input
                    type="date"
                    value={newCourse.scheduledAt}
                    onChange={e => setNewCourse(p => ({ ...p, scheduledAt: e.target.value }))}
                    className="input"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-brand-700 mb-1.5 block">课程名称</label>
                <input
                  value={newCourse.name}
                  onChange={e => setNewCourse(p => ({ ...p, name: e.target.value }))}
                  className="input"
                  placeholder="如：第8节 频域分析"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-brand-700 mb-1.5 block">备课备注</label>
                <textarea
                  value={newCourse.notes}
                  onChange={e => setNewCourse(p => ({ ...p, notes: e.target.value }))}
                  className="textarea"
                  rows={2}
                  placeholder="备注要点..."
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setShowNewCourse(false)} className="btn-ghost">取消</button>
              <button onClick={handleCreateCourse} className="btn-primary">创建课程</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-1 space-y-4">
          <div className="card p-5">
            <h3 className="font-serif font-semibold text-brand-800 mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-brand-600" />
              课程列表
            </h3>
            <div className="space-y-3">
              {sortedCourses.length > 0 ? (
                sortedCourses.map(c => <CourseCard key={c.id} course={c} />)
              ) : (
                <div className="text-center py-8 text-brand-400 text-sm">
                  <Calendar className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  还没有课程安排
                </div>
              )}
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-serif font-semibold text-brand-800 mb-3 flex items-center gap-2">
              <Target className="w-5 h-5 text-amber-500" />
              未分配
              <span className="ml-auto text-sm font-mono text-brand-400">{unassignedImps.length}</span>
            </h3>
            <p className="text-xs text-brand-400 mb-3">
              把改进点拖到课程中分配
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {unassignedImps.length > 0 ? unassignedImps.map(imp => (
                <div key={imp.id} className="p-2.5 rounded-xl border border-brand-100 bg-brand-50/30">
                  <div className="flex items-center gap-2 mb-1">
                    <PriorityBadge priority={imp.priority} />
                  </div>
                  <p className="text-xs text-brand-700 font-medium line-clamp-2">{imp.title}</p>
                </div>
              )) : (
                <p className="text-xs text-brand-400 text-center py-4">全部已分配 ✓</p>
              )}
            </div>
          </div>
        </div>

        <div className="xl:col-span-3">
          {selectedCourse ? (
            <>
              <div className="card p-5 mb-5 animate-fade-in-up">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-500 text-white font-mono font-bold text-xl flex items-center justify-center shadow-soft">
                      {selectedCourse.courseNumber}
                    </div>
                    <div>
                      <h2 className="font-serif text-2xl font-bold text-brand-800">{selectedCourse.name}</h2>
                      <div className="flex items-center gap-3 mt-2 text-sm text-brand-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(selectedCourse.scheduledAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Target className="w-4 h-4" />
                          {selectedImps.length} 个改进点
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteCourse(selectedCourse.id)}
                    className="btn-danger text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    删除
                  </button>
                </div>

                {selectedCourse.notes && (
                  <div className="mt-5 p-4 rounded-xl bg-amber-50/50 border border-amber-100">
                    <div className="text-xs font-medium text-amber-700 mb-1">📝 备课备注</div>
                    <p className="text-sm text-amber-800/90 leading-relaxed">{selectedCourse.notes}</p>
                  </div>
                )}
              </div>

              {viewMode === 'kanban' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {STATUS_COLUMNS.map(col => {
                    const colImps = selectedImps.filter(i => i.status === col.key);
                    const Icon = col.icon;
                    return (
                      <div key={col.key} className="kanban-col animate-fade-in-up">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className={cn('w-4 h-4', col.color)} />
                          <span className="font-medium text-brand-700 text-sm">{col.label}</span>
                          <span className="ml-auto text-xs font-mono text-brand-400 bg-white px-2 py-0.5 rounded-full">
                            {colImps.length}
                          </span>
                        </div>
                        <div className="flex-1 space-y-3 min-h-[200px]">
                          {colImps.map(imp => (
                            <ImprovementCard key={imp.id} imp={imp} />
                          ))}
                          {colImps.length === 0 && (
                            <div className="h-20 border-2 border-dashed border-brand-100 rounded-xl flex items-center justify-center text-brand-300 text-xs">
                              拖拽改进点到这里
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="card overflow-hidden animate-fade-in-up">
                  <table className="w-full text-sm">
                    <thead className="bg-paper-50 border-b border-brand-100">
                      <tr>
                        <th className="text-left px-5 py-3 font-medium text-brand-500 text-xs uppercase tracking-wider">改进点</th>
                        <th className="text-left px-5 py-3 font-medium text-brand-500 text-xs uppercase tracking-wider w-24">优先级</th>
                        <th className="text-left px-5 py-3 font-medium text-brand-500 text-xs uppercase tracking-wider w-24">状态</th>
                        <th className="text-left px-5 py-3 font-medium text-brand-500 text-xs uppercase tracking-wider w-24">课时</th>
                        <th className="text-left px-5 py-3 font-medium text-brand-500 text-xs uppercase tracking-wider w-28">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-50">
                      {selectedImps.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-5 py-12 text-center text-brand-400">
                            这节课还没有分配改进点
                          </td>
                        </tr>
                      ) : (
                        selectedImps.map(imp => (
                          <tr key={imp.id} className="hover:bg-brand-50/30 transition-colors">
                            <td className="px-5 py-3.5">
                              <div className="font-medium text-brand-800">{imp.title}</div>
                              <div className="text-xs text-brand-400 mt-0.5 line-clamp-1">{imp.description}</div>
                            </td>
                            <td className="px-5 py-3.5"><PriorityBadge priority={imp.priority} /></td>
                            <td className="px-5 py-3.5"><StatusBadge status={imp.status} /></td>
                            <td className="px-5 py-3.5 text-brand-500 text-xs font-mono">
                              {imp.estimatedMinutes ? `${imp.estimatedMinutes}min` : '-'}
                            </td>
                            <td className="px-5 py-3.5">
                              <button
                                onClick={() => assignImprovementToCourse(imp.id, undefined)}
                                className="text-xs text-brand-400 hover:text-red-500 transition"
                              >
                                移出课程
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <div className="card p-16 text-center animate-fade-in-up">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-brand-200" />
              <h3 className="font-serif text-xl text-brand-700 mb-2">选择一节课查看详情</h3>
              <p className="text-brand-400 mb-5">
                从左侧课程列表中选择，或新建下一节课来分配改进点
              </p>
              <button onClick={() => setShowNewCourse(true)} className="btn-primary">
                <Plus className="w-4 h-4" />
                新建课程
              </button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
