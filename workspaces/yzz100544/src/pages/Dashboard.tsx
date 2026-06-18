import React, { useState, useEffect, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatCard } from '@/components/ui/StatCard';
import { useAppStore } from '@/store/appStore';
import { ImportModal } from '@/components/ImportModal';
import { ThemeCard } from '@/components/ThemeCard';
import { FeedbackCard } from '@/components/FeedbackCard';
import {
  MessageSquare, Grid3X3, AlertTriangle, ClipboardList, Calendar, TrendingUp,
  Upload, Plus, ChevronRight, BookOpen, Sparkles, ArrowUpRight, Target,
} from 'lucide-react';
import { PriorityBadge, StatusBadge } from '@/components/ui/Badge';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from 'recharts';
import { formatDateTime } from '@/utils/io';
import type { Improvement } from '@/types';

const PIE_COLORS = ['#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4', '#10b981', '#ec4899'];

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    feedback, themes, improvements, courses,
    getThemeStats, filterFeedback, isInitialized, loadAll, initializeWithMock
  } = useAppStore();
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    if (!isInitialized) {
      initializeWithMock();
    } else {
      loadAll();
    }
  }, [isInitialized]);

  const themeStats = useMemo(() => getThemeStats(), [feedback, themes, improvements]);
  const severeCount = useMemo(
    () => feedback.filter(f => f.severity === 'critical' || f.severity === 'rare-critical').length,
    [feedback]
  );
  const pendingImprovements = useMemo(
    () => improvements.filter(i => i.status !== 'done').sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.priority] - order[b.priority];
    }).slice(0, 5),
    [improvements]
  );
  const latestFeedback = useMemo(
    () => [...feedback].sort((a, b) => +b.createdAt - +a.createdAt).slice(0, 4),
    [feedback]
  );

  const pieData = themeStats
    .filter(t => t.feedbackCount > 0)
    .map(t => ({ name: t.name, value: t.feedbackCount, color: t.color }));

  const sourceData = useMemo(() => {
    const counts: Record<string, number> = { student: 0, ta: 0, wrong_answer: 0 };
    for (const f of feedback) counts[f.source] = (counts[f.source] ?? 0) + 1;
    return [
      { name: '学生', value: counts.student, color: '#1e3a5f' },
      { name: '助教', value: counts.ta, color: '#10b981' },
      { name: '错题', value: counts.wrong_answer, color: '#ef4444' },
    ];
  }, [feedback]);

  const upcomingCourses = useMemo(
    () => [...courses].sort((a, b) => +a.scheduledAt - +b.scheduledAt).filter(c => +c.scheduledAt > Date.now() - 86400000).slice(0, 3),
    [courses]
  );

  const renderImprovementCard = (imp: Improvement) => {
    const course = courses.find(c => c.id === imp.courseId);
    return (
      <div
        key={imp.id}
        onClick={() => navigate('/checklist')}
        className="group p-4 rounded-xl border border-brand-100 hover:border-brand-300 hover:shadow-card bg-white transition-all cursor-pointer"
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <PriorityBadge priority={imp.priority} />
          <StatusBadge status={imp.status} />
        </div>
        <h4 className="font-medium text-brand-800 text-sm mb-1 group-hover:text-brand-600 transition line-clamp-1">
          {imp.title}
        </h4>
        <p className="text-xs text-brand-400 line-clamp-2 leading-relaxed">
          {imp.description}
        </p>
        {course && (
          <div className="mt-3 pt-3 border-t border-brand-50 flex items-center gap-1.5 text-[11px] text-brand-400">
            <Calendar className="w-3 h-3" />
            第{course.courseNumber}节课 · {formatDateTime(course.scheduledAt)}
          </div>
        )}
      </div>
    );
  };

  return (
    <AppLayout
      title="工作台"
      subtitle={`${new Date().toLocaleDateString('zh-CN', { weekday: 'long', month: 'long', day: 'numeric' })} · 概览教学情况`}
      actions={
        <button onClick={() => setImportOpen(true)} className="btn-primary">
          <Upload className="w-4 h-4" />
          导入反馈
        </button>
      }
    >
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard
          label="总反馈数"
          value={feedback.length}
          icon={MessageSquare}
          gradient="linear-gradient(135deg, #1e3a5f 0%, #3a63a6 100%)"
          subText={`包含学生/助教/错题三类来源`}
          delay={0}
        />
        <StatCard
          label="识别主题数"
          value={themeStats.filter(t => t.feedbackCount > 0).length}
          icon={Grid3X3}
          gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
          subText={`共配置 ${themes.length} 个主题`}
          trend="up"
          delay={80}
        />
        <StatCard
          label="严重问题"
          value={severeCount}
          icon={AlertTriangle}
          gradient="linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
          subText="需优先处理的反馈"
          trend="up"
          delay={160}
        />
        <StatCard
          label="待跟进改进"
          value={improvements.filter(i => i.status !== 'done').length}
          icon={ClipboardList}
          gradient="linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)"
          subText={`共 ${improvements.length} 条改进建议`}
          delay={240}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="card p-6 lg:col-span-2 animate-fade-in-up">
          <div className="flex items-center justify-between mb-5">
            <h2 className="section-title !mb-0">
              <Sparkles className="w-5 h-5 text-amber-500" />
              主题聚类概览
            </h2>
            <button
              onClick={() => navigate('/clustering')}
              className="btn-ghost text-sm"
            >
              查看全部
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {themeStats.filter(t => t.feedbackCount > 0).slice(0, 6).map((t, i) => (
              <ThemeCard key={t.id} theme={t} index={i} onClick={() => navigate('/clustering')} />
            ))}
          </div>
        </div>

        <div className="card p-6 animate-fade-in-up animate-stagger-2">
          <h2 className="section-title !mb-5">
            <Target className="w-5 h-5 text-brand-600" />
            反馈来源分布
          </h2>
          <div className="h-48 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData.length > 0 ? pieData : [{ name: '暂无', value: 1, color: '#e7e5e4' }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.length > 0
                    ? pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)
                    : <Cell fill="#e7e5e4" />
                  }
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 12, border: 'none',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: 12
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            {pieData.map((d, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-brand-600">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                {d.name} · {d.value}
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-brand-100">
            <h3 className="text-sm font-medium text-brand-700 mb-3">来源比例</h3>
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourceData} layout="vertical">
                  <XAxis type="number" hide />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={24}>
                    {sourceData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Bar>
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between mt-2">
              {sourceData.map((d, i) => (
                <div key={i} className="text-[11px] text-brand-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: d.color }} />
                  {d.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-6 lg:col-span-2 animate-fade-in-up">
          <div className="flex items-center justify-between mb-5">
            <h2 className="section-title !mb-0">
              <BookOpen className="w-5 h-5 text-brand-600" />
              最新反馈
            </h2>
            <button onClick={() => navigate('/data')} className="btn-ghost text-sm">
              管理数据 <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {latestFeedback.length > 0 ? (
              latestFeedback.map((fb, i) => (
                <FeedbackCard key={fb.id} feedback={fb} compact index={i} />
              ))
            ) : (
              <div className="col-span-2 text-center py-16 text-brand-400">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="mb-3">还没有导入反馈数据</p>
                <button onClick={() => setImportOpen(true)} className="btn-primary">
                  <Plus className="w-4 h-4" /> 立即导入
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6 animate-fade-in-up animate-stagger-3">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title !mb-0">
                <ClipboardList className="w-5 h-5 text-emerald-600" />
                待跟进改进
              </h2>
              <button onClick={() => navigate('/checklist')} className="text-xs text-brand-500 hover:text-brand-700 flex items-center gap-0.5">
                全部 <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-3">
              {pendingImprovements.length > 0 ? (
                pendingImprovements.map(renderImprovementCard)
              ) : (
                <div className="text-center py-8 text-brand-400 text-sm">
                  <Target className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  暂无待跟进改进点
                </div>
              )}
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title !mb-0">
                <Calendar className="w-5 h-5 text-violet-600" />
                近期课程
              </h2>
              <button onClick={() => navigate('/courses')} className="text-xs text-brand-500 hover:text-brand-700 flex items-center gap-0.5">
                排课 <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-3">
              {upcomingCourses.length > 0 ? upcomingCourses.map(c => {
                const imps = improvements.filter(i => i.courseId === c.id);
                return (
                  <div
                    key={c.id}
                    onClick={() => navigate('/courses')}
                    className="p-3.5 rounded-xl border border-brand-100 hover:border-brand-300 hover:bg-brand-50/40 transition cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-brand-800">{c.name}</span>
                      {imps.length > 0 && (
                        <span className="badge bg-violet-50 text-violet-600 border-violet-100 text-[11px]">
                          {imps.length} 改进点
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-brand-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDateTime(c.scheduledAt)}
                    </div>
                    {c.notes && (
                      <p className="mt-2 text-xs text-brand-500 line-clamp-2 leading-relaxed">{c.notes}</p>
                    )}
                  </div>
                );
              }) : (
                <div className="text-center py-6 text-brand-400 text-sm">
                  <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  暂无排课
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
