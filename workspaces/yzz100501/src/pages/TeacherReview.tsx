import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ClipboardCopy,
  CheckCircle,
  XCircle,
  Filter,
} from 'lucide-react';
import useGameStore from '@/stores/useGameStore';
import useLevelStore from '@/stores/useLevelStore';
import useStatsStore from '@/stores/useStatsStore';

export default function TeacherReview() {
  const navigate = useNavigate();
  const user = useGameStore((s) => s.user);
  const { sessions, loadSessions, getAllClassNames } = useStatsStore();
  const { levels, loadLevels } = useLevelStore();

  const [filterClass, setFilterClass] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  const filteredSessions = useMemo(() => {
    let result = [...sessions];
    if (filterClass) {
      result = result.filter((s) => s.className === filterClass);
    }
    if (filterLevel) {
      result = result.filter((s) => s.levelId === filterLevel);
    }
    return result.sort((a, b) => b.completedAt - a.completedAt);
  }, [sessions, filterClass, filterLevel]);

  const getLevelTitle = (levelId: string) => {
    const level = levels.find((l) => l.id === levelId);
    return level?.title ?? levelId;
  };

  const handleExport = () => {
    const lines: string[] = ['课后回顾报告', ''];

    for (const session of filteredSessions) {
      const correctCount = session.answers.filter((a) => a.isCorrect).length;
      lines.push(
        `学生: ${session.studentName} | 班级: ${session.className} | 关卡: ${getLevelTitle(session.levelId)} | 得分: ${correctCount}/${session.totalSteps} | 完成时间: ${new Date(session.completedAt).toLocaleString('zh-CN')}`,
      );
      for (const answer of session.answers) {
        lines.push(
          `  步骤${answer.stepOrder}: ${answer.isCorrect ? '✓' : '✗'} ${answer.choiceText}`,
        );
        if (!answer.isCorrect) {
          lines.push(`    正确做法: ${answer.correctAction}`);
        }
      }
      lines.push('');
    }

    window.navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0D3B2E] text-white">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/teacher')}
              className="rounded-full bg-white/10 p-2 transition hover:bg-white/20"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-3">
              <BookOpen size={24} className="text-[#2ECC71]" />
              <h1 className="font-display text-xl font-bold">课后回顾</h1>
            </div>
          </div>

          <button
            onClick={handleExport}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            {copied ? (
              <>
                <CheckCircle size={16} />
                已复制
              </>
            ) : (
              <>
                <ClipboardCopy size={16} />
                导出回顾
              </>
            )}
          </button>
        </div>

        <div className="card-scene mb-6">
          <div className="flex items-center gap-2 mb-3 text-sm text-white/50">
            <Filter size={14} />
            筛选
          </div>
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="mb-1 block text-xs text-white/40">班级</label>
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="rounded-xl bg-white/10 px-4 py-2 text-sm text-white outline-none border border-white/10 focus:border-[#2ECC71] transition"
              >
                <option value="" className="bg-[#0D3B2E]">
                  全部班级
                </option>
                {classNames.map((cn) => (
                  <option key={cn} value={cn} className="bg-[#0D3B2E]">
                    {cn}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-white/40">关卡</label>
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="rounded-xl bg-white/10 px-4 py-2 text-sm text-white outline-none border border-white/10 focus:border-[#2ECC71] transition"
              >
                <option value="" className="bg-[#0D3B2E]">
                  全部关卡
                </option>
                {levels.map((l) => (
                  <option key={l.id} value={l.id} className="bg-[#0D3B2E]">
                    {l.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {filteredSessions.length > 0 ? (
          <div className="space-y-3">
            {filteredSessions.map((session) => {
              const isExpanded = expandedId === session.id;
              const correctCount = session.answers.filter(
                (a) => a.isCorrect,
              ).length;

              return (
                <div key={session.id} className="card-scene">
                  <button
                    onClick={() =>
                      setExpandedId(isExpanded ? null : session.id)
                    }
                    className="flex w-full items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold ${
                          correctCount === session.totalSteps
                            ? 'bg-[#2ECC71]/20 text-[#2ECC71]'
                            : correctCount / session.totalSteps >= 0.6
                              ? 'bg-orange-500/20 text-orange-400'
                              : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {correctCount}/{session.totalSteps}
                      </div>
                      <div className="text-left">
                        <div className="font-semibold">
                          {session.studentName}
                        </div>
                        <div className="text-xs text-white/50">
                          {session.className} · {getLevelTitle(session.levelId)} ·{' '}
                          {new Date(session.completedAt).toLocaleString('zh-CN')}
                        </div>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp size={18} className="text-white/40" />
                    ) : (
                      <ChevronDown size={18} className="text-white/40" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
                      {session.answers.map((answer) => (
                        <div
                          key={answer.stepOrder}
                          className={`rounded-lg p-3 text-sm ${
                            answer.isCorrect
                              ? 'bg-[#2ECC71]/5 border border-[#2ECC71]/20'
                              : 'bg-[#FF6B35]/5 border border-[#FF6B35]/20'
                          }`}
                        >
                          <div className="mb-1 flex items-center gap-2">
                            {answer.isCorrect ? (
                              <CheckCircle
                                size={14}
                                className="text-[#2ECC71]"
                              />
                            ) : (
                              <XCircle
                                size={14}
                                className="text-[#FF6B35]"
                              />
                            )}
                            <span className="font-medium text-white/80">
                              步骤 {answer.stepOrder}
                            </span>
                            <span className="text-white/40">
                              — {answer.choiceText}
                            </span>
                          </div>

                          {!answer.isCorrect && (
                            <div className="mt-2 space-y-1 pl-6">
                              <p className="text-xs text-white/50">
                                {answer.feedback}
                              </p>
                              <p className="text-xs text-[#2ECC71]/70">
                                正确做法：{answer.correctAction}
                              </p>
                              {answer.screenshotDataUrl && (
                                <img
                                  src={answer.screenshotDataUrl}
                                  alt={`步骤${answer.stepOrder}截图`}
                                  className="mt-2 max-w-xs rounded-lg border border-white/10"
                                />
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center text-white/30">暂无回顾数据</div>
        )}
      </div>
    </div>
  );
}
