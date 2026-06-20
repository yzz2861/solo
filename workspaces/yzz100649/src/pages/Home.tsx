import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { useEffect, useMemo } from 'react';
import { Shield, UserCog, FilePlus, ListChecks, Trash2, Eye, Sparkles, AlertTriangle, CheckCircle, FileText, Clock } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Tag } from '@/components/common/Tag';
import { STAGE_META, CATEGORY_META } from '@/types';
import { Card } from '@/components/common/Card';
import { formatDateTime, truncate } from '@/utils/formatters';
import { clsx } from 'clsx';

export default function Home() {
  const init = useAppStore((s) => s.init);
  const role = useAppStore((s) => s.role);
  const setRole = useAppStore((s) => s.setRole);
  const articles = useAppStore((s) => s.articles);
  const importSample = useAppStore((s) => s.importSample);
  const deleteArticle = useAppStore((s) => s.deleteArticle);
  const nav = useNavigate();

  useEffect(() => {
    init();
  }, [init]);

  const stats = useMemo(() => {
    const total = articles.length;
    const pending = articles.filter(
      (a) => ['imported', 'annotated', 'confirmed'].includes(a.stage)
    ).length;
    const review = articles.filter((a) => a.stage === 'sent_to_doctor').length;
    const done = articles.filter(
      (a) => a.stage === 'doctor_reviewed' || a.stage === 'completed'
    ).length;
    const totalRisks = articles.reduce((s, a) => s + a.annotations.length, 0);
    const highRisks = articles.reduce(
      (s, a) => s + a.annotations.filter((x) => x.riskLevel === 'high').length,
      0
    );
    return { total, pending, review, done, totalRisks, highRisks };
  }, [articles]);

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-8">
      {/* Hero */}
      <section className="mb-8">
        <div className="rounded-3xl bg-gradient-to-br from-[#1e3a5f] via-[#264a7a] to-[#2f5a96] text-white p-8 md:p-10 relative overflow-hidden shadow-xl">
          <div className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.4) 0, transparent 40%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.3) 0, transparent 40%)',
            }}
          />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-xs font-medium border border-white/20 mb-5">
              <Sparkles className="w-3.5 h-3.5" />
              智能识别 · 编辑确认 · 医生审核 · 全程留痕
            </div>
            <h1 className="text-3xl md:text-4xl font-semibold mb-3 leading-tight">
              医学科普稿事实核对
            </h1>
            <p className="text-white/80 max-w-2xl leading-relaxed mb-7">
              自动标注疗效、剂量、人群、禁忌和数据来源等风险项，区分指南引用、患者故事、广告化表达与模糊建议，辅助编辑与医生高效协作，降低内容合规风险。
            </p>

            {/* Role switch cards */}
            <div className="grid md:grid-cols-2 gap-4 max-w-3xl">
              <button
                onClick={() => {
                  setRole('editor');
                  nav('/editor/import');
                }}
                className={clsx(
                  'group text-left p-5 rounded-2xl transition-all border backdrop-blur-sm',
                  role === 'editor'
                    ? 'bg-white text-slate-900 border-white/60 shadow-lg scale-[1.02]'
                    : 'bg-white/10 border-white/20 hover:bg-white/15 hover:border-white/30'
                )}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={clsx(
                    'w-10 h-10 rounded-xl flex items-center justify-center',
                    role === 'editor' ? 'bg-[#1e3a5f] text-white' : 'bg-white/20'
                  )}>
                    <UserCog className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold">我是编辑</div>
                    <div className={clsx('text-xs', role === 'editor' ? 'text-slate-500' : 'text-white/60')}>导入稿件，进行标注与确认</div>
                  </div>
                </div>
                <p className={clsx('text-xs mt-2 leading-relaxed', role === 'editor' ? 'text-slate-600' : 'text-white/70')}>
                  粘贴或上传医学科普文稿，自动识别风险，逐条确认后导出修订清单给医生。
                </p>
                <div className="mt-3 flex items-center gap-1 text-xs font-medium">
                  {role === 'editor' ? (
                    <>
                      <FilePlus className="w-3.5 h-3.5 text-[#1e3a5f]" />
                      立即导入稿件 →
                    </>
                  ) : (
                    <>进入编辑工作台</>
                  )}
                </div>
              </button>

              <button
                onClick={() => {
                  setRole('doctor');
                  nav('/doctor/import');
                }}
                className={clsx(
                  'group text-left p-5 rounded-2xl transition-all border backdrop-blur-sm',
                  role === 'doctor'
                    ? 'bg-white text-slate-900 border-white/60 shadow-lg scale-[1.02]'
                    : 'bg-white/10 border-white/20 hover:bg-white/15 hover:border-white/30'
                )}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={clsx(
                    'w-10 h-10 rounded-xl flex items-center justify-center',
                    role === 'doctor' ? 'bg-[#1e3a5f] text-white' : 'bg-white/20'
                  )}>
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold">我是医生</div>
                    <div className={clsx('text-xs', role === 'doctor' ? 'text-slate-500' : 'text-white/60')}>导入清单，进行专业审核</div>
                  </div>
                </div>
                <p className={clsx('text-xs mt-2 leading-relaxed', role === 'doctor' ? 'text-slate-600' : 'text-white/70')}>
                  导入编辑提交的修订清单，逐项审核并给出专业意见，输出完整审核报告。
                </p>
                <div className="mt-3 flex items-center gap-1 text-xs font-medium">
                  {role === 'doctor' ? (
                    <>
                      <ListChecks className="w-3.5 h-3.5 text-[#1e3a5f]" />
                      立即导入清单 →
                    </>
                  ) : (
                    <>进入医生工作台</>
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-8">
        <StatCard label="稿件总数" value={stats.total} icon={<FileText className="w-4 h-4" />} tone="slate" />
        <StatCard label="风险项总数" value={stats.totalRisks} icon={<AlertTriangle className="w-4 h-4" />} tone="amber" />
        <StatCard label="高风险项" value={stats.highRisks} icon={<AlertTriangle className="w-4 h-4" />} tone="red" />
        <StatCard label="待编辑处理" value={stats.pending} icon={<Clock className="w-4 h-4" />} tone="indigo" />
        <StatCard label="待医生审核" value={stats.review} icon={<ListChecks className="w-4 h-4" />} tone="sky" />
        <StatCard label="已完成" value={stats.done} icon={<CheckCircle className="w-4 h-4" />} tone="emerald" />
      </section>

      {/* Article list */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#1e3a5f]" />
            历史稿件
            <span className="text-xs text-slate-400 font-normal">
              ({articles.length})
            </span>
          </div>
        }
        extra={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => importSample()} icon={<Sparkles className="w-4 h-4" />}>
              加载示例
            </Button>
            <Link to={role === 'editor' ? '/editor/import' : '/doctor/import'}>
              <Button size="sm" icon={<FilePlus className="w-4 h-4" />}>
                {role === 'editor' ? '新建稿件' : '新建审核'}
              </Button>
            </Link>
          </div>
        }
      >
        {articles.length === 0 ? (
          <div className="py-20 text-center text-sm text-slate-400 space-y-3">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
              <FilePlus className="w-6 h-6 text-slate-400" />
            </div>
            <div>还没有任何稿件，点击上方按钮导入或加载示例</div>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] text-slate-400 border-b border-slate-100">
                  <th className="text-left py-3 px-2 font-medium">稿件标题</th>
                  <th className="text-left py-3 px-2 font-medium w-[88px]">作者/来源</th>
                  <th className="text-left py-3 px-2 font-medium w-[96px]">风险分布</th>
                  <th className="text-left py-3 px-2 font-medium w-[100px]">状态</th>
                  <th className="text-left py-3 px-2 font-medium w-[140px]">更新时间</th>
                  <th className="text-right py-3 px-2 font-medium w-[140px]">操作</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((a) => {
                  const countByCat = a.annotations.reduce<Record<string, number>>((acc, ann) => {
                    acc[ann.category] = (acc[ann.category] || 0) + 1;
                    return acc;
                  }, {});
                  const nextPath = (() => {
                    if (role === 'editor') {
                      if (a.stage === 'doctor_reviewed' || a.stage === 'completed') return `/review-result/${a.id}`;
                      return `/editor/annotate/${a.id}`;
                    }
                    if (role === 'doctor') {
                      if (a.stage === 'sent_to_doctor') return `/doctor/review/${a.id}`;
                      return `/review-result/${a.id}`;
                    }
                    return `/editor/annotate/${a.id}`;
                  })();
                  return (
                    <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors group">
                      <td className="py-3.5 px-2">
                        <button
                          onClick={() => nav(nextPath)}
                          className="text-left block max-w-sm"
                        >
                          <div className="text-slate-800 font-medium hover:text-[#1e3a5f] transition truncate">
                            {a.title}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                            <span>{a.paragraphs.length} 段</span>
                            <span>·</span>
                            <span>{a.annotations.length} 项风险</span>
                          </div>
                        </button>
                      </td>
                      <td className="py-3.5 px-2">
                        <div className="text-xs text-slate-600 truncate max-w-[100px]">
                          {a.author || '—'}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[100px]">
                          {truncate(a.source || '', 12)}
                        </div>
                      </td>
                      <td className="py-3.5 px-2">
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(countByCat).slice(0, 3).map(([k, v]) => (
                            <span
                              key={k}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium"
                              style={{
                                color: CATEGORY_META[k as keyof typeof CATEGORY_META].color,
                                background: `${CATEGORY_META[k as keyof typeof CATEGORY_META].color}14`,
                              }}
                            >
                              <span className="w-1 h-1 rounded-full" style={{ background: CATEGORY_META[k as keyof typeof CATEGORY_META].color }} />
                              {CATEGORY_META[k as keyof typeof CATEGORY_META].label} {v}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-2">
                        <Tag className={STAGE_META[a.stage].cls}>{STAGE_META[a.stage].label}</Tag>
                      </td>
                      <td className="py-3.5 px-2 text-xs text-slate-500">
                        {formatDateTime(a.updatedAt)}
                      </td>
                      <td className="py-3.5 px-2">
                        <div className="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition">
                          <button
                            onClick={() => nav(nextPath)}
                            className="w-7 h-7 inline-flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-[#1e3a5f] transition"
                            title="查看"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('确认删除该稿件？删除后不可恢复。')) deleteArticle(a.id);
                            }}
                            className="w-7 h-7 inline-flex items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition"
                            title="删除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: 'slate' | 'red' | 'amber' | 'emerald' | 'indigo' | 'sky';
}) {
  const tones = {
    slate: 'from-slate-50 to-white text-slate-700 border-slate-200',
    red: 'from-red-50 to-white text-red-700 border-red-200',
    amber: 'from-amber-50 to-white text-amber-700 border-amber-200',
    emerald: 'from-emerald-50 to-white text-emerald-700 border-emerald-200',
    indigo: 'from-indigo-50 to-white text-indigo-700 border-indigo-200',
    sky: 'from-sky-50 to-white text-sky-700 border-sky-200',
  }[tone];
  return (
    <div className={clsx('rounded-2xl border p-4 bg-gradient-to-br shadow-sm', tones)}>
      <div className="flex items-center justify-between mb-2 opacity-80">
        {icon}
        <span className="text-xs opacity-80">{label}</span>
      </div>
      <div className="text-2xl font-semibold leading-none">{value}</div>
    </div>
  );
}
