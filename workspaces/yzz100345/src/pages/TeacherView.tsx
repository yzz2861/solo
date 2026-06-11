import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  AlertTriangle,
  Target,
  Brain,
  Ban,
  Copy,
  Check,
  Download,
  TrendingUp,
  Award,
  Calendar,
} from 'lucide-react';
import { useProgressStore } from '@/store/progressStore';
import { problems, getProblemById } from '@/data/problems';
import { errorTypeLabels, errorTypeDescriptions, problemTypeLabels } from '@/types';
import type { ErrorType, Attempt } from '@/types';
import { cn } from '@/lib/utils';

export default function TeacherView() {
  const navigate = useNavigate();
  const {
    progress,
    studentName,
    getProgressStats,
    getErrorBreakdown,
    getWrongAttempts,
    generatePracticeReport,
    loadData,
    isLoaded,
  } = useProgressStore();

  const [copied, setCopied] = useState(false);
  const [expandedProblem, setExpandedProblem] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) {
      loadData();
    }
  }, [isLoaded, loadData]);

  const stats = getProgressStats();
  const errorBreakdown = getErrorBreakdown();
  const wrongAttempts = getWrongAttempts();
  const report = generatePracticeReport();

  const wrongAttemptsByProblem = React.useMemo(() => {
    const grouped: Record<string, Attempt[]> = {};
    wrongAttempts.forEach(attempt => {
      if (!grouped[attempt.problemId]) {
        grouped[attempt.problemId] = [];
      }
      grouped[attempt.problemId].push(attempt);
    });
    return grouped;
  }, [wrongAttempts]);

  const getErrorIcon = (errorType: ErrorType) => {
    switch (errorType) {
      case 'liberty-misjudge':
        return <Target className="w-4 h-4" />;
      case 'greedy-capture':
        return <Brain className="w-4 h-4" />;
      case 'wrong-position':
        return <AlertTriangle className="w-4 h-4" />;
      case 'forbidden-move':
        return <Ban className="w-4 h-4" />;
    }
  };

  const getErrorColor = (errorType: ErrorType) => {
    switch (errorType) {
      case 'liberty-misjudge':
        return 'bg-blue-100 text-blue-700';
      case 'greedy-capture':
        return 'bg-purple-100 text-purple-700';
      case 'wrong-position':
        return 'bg-orange-100 text-orange-700';
      case 'forbidden-move':
        return 'bg-red-100 text-red-700';
    }
  };

  const getErrorBgColor = (errorType: ErrorType) => {
    switch (errorType) {
      case 'liberty-misjudge':
        return 'bg-blue-500';
      case 'greedy-capture':
        return 'bg-purple-500';
      case 'wrong-position':
        return 'bg-orange-500';
      case 'forbidden-move':
        return 'bg-red-500';
    }
  };

  const generateParentNote = () => {
    const name = studentName || '小朋友';
    const totalErrors = Object.values(errorBreakdown).reduce((a, b) => a + b, 0);
    
    let note = `📚 围棋练习反馈 - ${report.date}\n\n`;
    note += `亲爱的 ${name} 家长：\n\n`;
    note += `今天${name}在围棋吃子练习中表现很棒！\n\n`;
    note += `📊 练习概况：\n`;
    note += `• 完成题目：${stats.completed} / ${stats.total} 道\n`;
    note += `• 正确率：${stats.accuracy}%\n`;
    
    if (totalErrors > 0) {
      note += `• 错误次数：${totalErrors} 次\n\n`;
      note += `💡 需要关注的地方：\n`;
      
      if (errorBreakdown['liberty-misjudge'] > 0) {
        note += `• 气数判断：${errorBreakdown['liberty-misjudge']} 次\n`;
        note += `  ${errorTypeDescriptions['liberty-misjudge']}\n`;
      }
      if (errorBreakdown['greedy-capture'] > 0) {
        note += `• 贪吃棋子：${errorBreakdown['greedy-capture']} 次\n`;
        note += `  ${errorTypeDescriptions['greedy-capture']}\n`;
      }
      if (errorBreakdown['wrong-position'] > 0) {
        note += `• 要点识别：${errorBreakdown['wrong-position']} 次\n`;
        note += `  ${errorTypeDescriptions['wrong-position']}\n`;
      }
      if (errorBreakdown['forbidden-move'] > 0) {
        note += `• 禁入点理解：${errorBreakdown['forbidden-move']} 次\n`;
        note += `  ${errorTypeDescriptions['forbidden-move']}\n`;
      }
    }
    
    note += `\n🎯 后续建议：\n`;
    report.suggestions.forEach((s, i) => {
      note += `${i + 1}. ${s}\n`;
    });
    
    note += `\n${name}在练习中${stats.accuracy >= 80 ? '表现非常出色，继续保持！' : stats.accuracy >= 60 ? '有明显进步，继续加油！' : '很努力，我们慢慢来！'}\n\n`;
    note += `围棋是一门需要耐心和思考的艺术，相信${name}会越来越棒的！\n\n`;
    note += `围棋老师 敬上\n`;
    note += `${report.date}`;
    
    return note;
  };

  const handleCopyNote = async () => {
    const note = generateParentNote();
    try {
      await navigator.clipboard.writeText(note);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy:', e);
    }
  };

  const handleDownloadNote = () => {
    const note = generateParentNote();
    const blob = new Blob([note], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `围棋练习反馈_${studentName || '学生'}_${report.date}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const totalErrors = Object.values(errorBreakdown).reduce((a, b) => a + b, 0);
  const maxError = Math.max(...Object.values(errorBreakdown), 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <header className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/')}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-800">老师视图</h1>
                <p className="text-sm text-gray-500">练习分析与反馈</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                📊 分析模式
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-lg p-5 border-l-4 border-blue-500">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">练习日期</p>
                <p className="text-lg font-bold text-gray-800">{report.date}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-5 border-l-4 border-green-500">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">正确率</p>
                <p className="text-2xl font-bold text-gray-800">{stats.accuracy}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-5 border-l-4 border-amber-500">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <Award className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">完成度</p>
                <p className="text-2xl font-bold text-gray-800">
                  {stats.completed}/{stats.total}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-5 border-l-4 border-red-500">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">总错误</p>
                <p className="text-2xl font-bold text-gray-800">{totalErrors}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              错误类型分布
            </h2>
            <div className="space-y-4">
              {(Object.entries(errorBreakdown) as [ErrorType, number][]).map(([type, count]) => (
                <div key={type}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={cn('p-1 rounded', getErrorColor(type))}>
                        {getErrorIcon(type)}
                      </span>
                      <span className="text-sm font-medium text-gray-700">
                        {errorTypeLabels[type]}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-gray-600">{count} 次</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all duration-500', getErrorBgColor(type))}
                      style={{ width: `${(count / maxError) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {errorTypeDescriptions[type]}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              薄弱点分析
            </h2>
            {report.weakPoints.length > 0 ? (
              <div className="space-y-3">
                {report.weakPoints.map((point, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-orange-50 rounded-lg border border-orange-200"
                  >
                    <p className="text-sm text-orange-800">⚠️ {point}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">🎉</div>
                <p className="text-gray-500">太棒了！暂时没有明显的薄弱点</p>
              </div>
            )}

            <h3 className="text-md font-bold text-gray-800 mt-6 mb-3">💡 改进建议</h3>
            {report.suggestions.length > 0 && (
              <div className="space-y-2">
                {report.suggestions.map((suggestion, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-blue-50 rounded-lg border border-blue-200"
                  >
                    <p className="text-sm text-blue-800">
                      <span className="font-bold">{idx + 1}.</span> {suggestion}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Download className="w-5 h-5 text-green-600" />
              家长反馈说明
            </h2>
            <div className="flex gap-2">
              <button
                onClick={handleCopyNote}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all',
                  copied
                    ? 'bg-green-100 text-green-700'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                )}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? '已复制' : '复制'}
              </button>
              <button
                onClick={handleDownloadNote}
                className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium hover:bg-green-200 transition-all"
              >
                <Download className="w-4 h-4" />
                下载
              </button>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap text-gray-700 max-h-96 overflow-y-auto">
            {generateParentNote()}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            错题详情
          </h2>
          
          {Object.keys(wrongAttemptsByProblem).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(wrongAttemptsByProblem).map(([problemId, attempts]) => {
                const problem = getProblemById(problemId);
                if (!problem) return null;
                const isExpanded = expandedProblem === problemId;
                
                return (
                  <div
                    key={problemId}
                    className="border border-gray-200 rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedProblem(isExpanded ? null : problemId)}
                      className="w-full p-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-gray-800">{problem.title}</span>
                        <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded text-xs">
                          {problemTypeLabels[problem.type]}
                        </span>
                        <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded text-xs">
                          {attempts.length} 次错误
                        </span>
                      </div>
                      <span className="text-gray-400 text-sm">
                        {isExpanded ? '收起 ▲' : '展开 ▼'}
                      </span>
                    </button>
                    
                    {isExpanded && (
                      <div className="p-4 space-y-3">
                        <p className="text-sm text-gray-600 bg-amber-50 p-3 rounded-lg">
                          <span className="font-bold">题目：</span>
                          {problem.description}
                        </p>
                        
                        {attempts.map((attempt, idx) => (
                          <div
                            key={idx}
                            className="p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  'px-2 py-0.5 rounded text-xs font-medium',
                                  attempt.errorType && getErrorColor(attempt.errorType)
                                )}>
                                  {attempt.errorType && errorTypeLabels[attempt.errorType]}
                                </span>
                                <span className="text-xs text-gray-500">
                                  落子位置：({attempt.position.row + 1}, {attempt.position.col + 1})
                                </span>
                              </div>
                              <span className="text-xs text-gray-400">
                                {new Date(attempt.timestamp).toLocaleString('zh-CN')}
                              </span>
                            </div>
                            {attempt.errorType && (
                              <p className="text-xs text-gray-600">
                                {errorTypeDescriptions[attempt.errorType]}
                              </p>
                            )}
                          </div>
                        ))}
                        
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-sm text-green-700 bg-green-50 p-3 rounded-lg">
                            <span className="font-bold">✅ 正确答案：</span>
                            {problem.correctMoves.map((m, i) => (
                              <span key={i} className="mx-1">
                                ({m.row + 1}, {m.col + 1})
                              </span>
                            ))}
                          </p>
                          <p className="text-sm text-gray-600 mt-2">
                            <span className="font-bold">💡 讲解：</span>
                            {problem.explanation}
                          </p>
                        </div>
                        
                        <button
                          onClick={() => navigate(`/practice/${problemId}`)}
                          className="mt-3 w-full py-2 bg-amber-100 text-amber-700 rounded-lg font-medium hover:bg-amber-200 transition-colors"
                        >
                          重新练习这道题
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎊</div>
              <p className="text-gray-500 text-lg">太棒了！还没有错题记录</p>
              <p className="text-gray-400 text-sm mt-1">继续保持！</p>
            </div>
          )}
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
          <p>围棋吃子练习 · 老师视图</p>
          <p className="mt-1">数据保存在本地浏览器中，刷新页面不会丢失</p>
        </div>
      </footer>
    </div>
  );
}
