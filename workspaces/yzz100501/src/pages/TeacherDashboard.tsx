import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  LayoutDashboard,
  BarChart3,
  BookOpen,
  ClipboardList,
  Users,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react';
import useGameStore from '@/stores/useGameStore';
import useLevelStore from '@/stores/useLevelStore';
import useStatsStore from '@/stores/useStatsStore';

type TabKey = 'stats' | 'levels' | 'review';

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const user = useGameStore((s) => s.user);
  const { levels, loadLevels, deleteLevel } = useLevelStore();
  const { sessions, loadSessions, getAllClassNames, getClassStats } =
    useStatsStore();

  const [activeTab, setActiveTab] = useState<TabKey>('stats');
  const [selectedClass, setSelectedClass] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'teacher') {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    loadSessions();
    loadLevels();
  }, [loadSessions, loadLevels]);

  const classNames = useMemo(() => getAllClassNames(), [getAllClassNames, sessions]);

  useEffect(() => {
    if (classNames.length > 0 && !selectedClass) {
      setSelectedClass(classNames[0]);
    }
  }, [classNames, selectedClass]);

  const classStats = useMemo(
    () => (selectedClass ? getClassStats(selectedClass) : null),
    [selectedClass, getClassStats],
  );

  const chartData = useMemo(() => {
    if (!classStats) return [];
    return classStats.stepErrorRates
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, 10)
      .map((s) => ({
        name: s.scene.length > 8 ? s.scene.slice(0, 8) + '…' : s.scene,
        errorRate: Math.round(s.errorRate * 100),
      }));
  }, [classStats]);

  const weakPoints = useMemo(() => {
    if (!classStats) return [];
    return [...classStats.safetyWeakPoints].sort(
      (a, b) => b.errorCount - a.errorCount,
    );
  }, [classStats]);

  const maxWeakPointCount = useMemo(
    () => Math.max(...weakPoints.map((w) => w.errorCount), 1),
    [weakPoints],
  );

  const filteredSessions = useMemo(
    () =>
      selectedClass
        ? sessions.filter((s) => s.className === selectedClass)
        : sessions,
    [sessions, selectedClass],
  );

  const studentRows = useMemo(() => {
    const map = new Map<
      string,
      { name: string; levels: Set<string>; errors: number; lastTime: number }
    >();
    for (const s of filteredSessions) {
      const existing = map.get(s.studentName);
      if (existing) {
        existing.levels.add(s.levelId);
        existing.errors += s.answers.filter((a) => !a.isCorrect).length;
        if (s.completedAt > existing.lastTime) {
          existing.lastTime = s.completedAt;
        }
      } else {
        map.set(s.studentName, {
          name: s.studentName,
          levels: new Set([s.levelId]),
          errors: s.answers.filter((a) => !a.isCorrect).length,
          lastTime: s.completedAt,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.lastTime - a.lastTime);
  }, [filteredSessions]);

  const handleDeleteLevel = (id: string) => {
    if (window.confirm('确定要删除这个关卡吗？')) {
      deleteLevel(id);
    }
  };

  if (!user) return null;

  const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: 'stats', label: '班级统计', icon: BarChart3 },
    { key: 'levels', label: '关卡管理', icon: ClipboardList },
    { key: 'review', label: '课后回顾', icon: BookOpen },
  ];

  return (
    <div className="min-h-screen bg-[#0D3B2E] text-white">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FF6B35]/20">
            <LayoutDashboard size={24} className="text-[#FF6B35]" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">教师仪表盘</h1>
            <p className="text-white/60">{user.name}</p>
          </div>
        </div>

        <div className="mb-6 flex gap-2 border-b border-white/10 pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  if (tab.key === 'review') {
                    navigate('/teacher/review');
                    return;
                  }
                  setActiveTab(tab.key);
                }}
                className={`flex items-center gap-2 rounded-t-lg px-4 py-2 text-sm font-medium transition ${
                  active
                    ? 'bg-white/10 text-white'
                    : 'text-white/50 hover:text-white/80'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'stats' && (
          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-sm text-white/60">选择班级</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="rounded-xl bg-white/10 px-4 py-2 text-sm text-white outline-none border border-white/10 focus:border-[#2ECC71] transition"
              >
                {classNames.map((cn) => (
                  <option key={cn} value={cn} className="bg-[#0D3B2E]">
                    {cn}
                  </option>
                ))}
                {classNames.length === 0 && (
                  <option value="" className="bg-[#0D3B2E]">
                    暂无班级数据
                  </option>
                )}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="card-scene">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white/80">
                  <BarChart3 size={16} className="text-[#FF6B35]" />
                  最易错步骤
                </h3>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={chartData}>
                      <XAxis
                        dataKey="name"
                        tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                        axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                        axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                        tickLine={false}
                        unit="%"
                      />
                      <Tooltip
                        contentStyle={{
                          background: '#145A45',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                          color: '#fff',
                        }}
                        formatter={(value: number) => [`${value}%`, '错误率']}
                      />
                      <Bar dataKey="errorRate" fill="#FF6B35" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[260px] items-center justify-center text-white/30">
                    暂无数据
                  </div>
                )}
              </div>

              <div className="card-scene">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white/80">
                  <Users size={16} className="text-[#FF6B35]" />
                  安全薄弱点排行
                </h3>
                {weakPoints.length > 0 ? (
                  <div className="space-y-3">
                    {weakPoints.map((wp) => (
                      <div key={wp.category}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="text-white/80">{wp.category}</span>
                          <span className="text-white/50">{wp.errorCount} 次</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-[#FF6B35] transition-all"
                            style={{
                              width: `${(wp.errorCount / maxWeakPointCount) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-[260px] items-center justify-center text-white/30">
                    暂无数据
                  </div>
                )}
              </div>
            </div>

            <div className="card-scene">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white/80">
                <Users size={16} className="text-[#2ECC71]" />
                学生统计
              </h3>
              {studentRows.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-left text-white/50">
                        <th className="pb-2 pr-4">姓名</th>
                        <th className="pb-2 pr-4">完成关卡数</th>
                        <th className="pb-2 pr-4">总错误数</th>
                        <th className="pb-2">最近完成时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentRows.map((row) => (
                        <tr
                          key={row.name}
                          className="border-b border-white/5 text-white/80"
                        >
                          <td className="py-3 pr-4">{row.name}</td>
                          <td className="py-3 pr-4">{row.levels.size}</td>
                          <td className="py-3 pr-4">
                            <span
                              className={
                                row.errors > 3
                                  ? 'text-[#FF6B35]'
                                  : 'text-[#2ECC71]'
                              }
                            >
                              {row.errors}
                            </span>
                          </td>
                          <td className="py-3">
                            {new Date(row.lastTime).toLocaleString('zh-CN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center text-white/30">
                  暂无学生数据
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'levels' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => navigate('/teacher/levels/edit/new')}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                <Plus size={16} />
                添加关卡
              </button>
            </div>

            {levels.length > 0 ? (
              <div className="space-y-3">
                {levels.map((level) => (
                  <div
                    key={level.id}
                    className="card-scene flex items-center justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold">{level.title}</h4>
                      <p className="mt-1 text-sm text-white/50">
                        {level.category} · 难度 {level.difficulty} ·{' '}
                        {level.steps.length} 步
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          navigate(`/teacher/levels/edit/${level.id}`)
                        }
                        className="rounded-lg bg-white/10 p-2 transition hover:bg-white/20"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteLevel(level.id)}
                        className="rounded-lg bg-[#FF6B35]/10 p-2 text-[#FF6B35] transition hover:bg-[#FF6B35]/20"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-white/30">
                暂无关卡，点击上方按钮添加
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
