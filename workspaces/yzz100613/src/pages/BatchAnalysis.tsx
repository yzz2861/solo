import { useState, useEffect } from 'react';
import {
  Upload,
  Filter,
  TrendingUp,
  TrendingDown,
  Download,
  Plus,
  Trash2,
  EyeOff,
  Eye,
  AlertTriangle,
  Wind,
  Clock,
  Users,
  Calendar,
  ChevronDown,
  Copy,
  FileText,
  BarChart3
} from 'lucide-react';
import { useRecordStore } from '@/store/useRecordStore';
import { LineChart } from '@/components/charts/LineChart';
import { BarChart } from '@/components/charts/BarChart';
import { WarningCard } from '@/components/cards/WarningCard';
import { parseCSV, formatDate, formatWindSpeed, formatTrackType, formatTimingMethod } from '@/utils/format';
import { calculateCorrection } from '@/utils/correction';
import { SprintRecord } from '@/types';
import { cn } from '@/lib/utils';

export default function BatchAnalysis() {
  const {
    records,
    filters,
    setFilter,
    addRecords,
    toggleExclude,
    deleteRecord,
    getBatchAnalysis,
    clearAllRecords,
    initMockData,
  } = useRecordStore();

  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const [activeTab, setActiveTab] = useState<'trend' | 'records'>('trend');

  useEffect(() => {
    if (records.length === 0) {
      initMockData();
    }
  }, []);

  const analysis = getBatchAnalysis();

  const handleImport = () => {
    try {
      const parsed = parseCSV(importText);
      if (parsed.length === 0) {
        setImportError('未能解析到有效数据，请检查格式');
        return;
      }
      addRecords(parsed);
      setImportText('');
      setShowImport(false);
      setImportError('');
    } catch {
      setImportError('解析失败，请检查数据格式');
    }
  };

  const handleCopyTemplate = () => {
    const template = `日期,项目,成绩,风速,海拔,温度,赛道,计时,姓名
2024-01-01,100米,12.56,1.5,50,25,塑胶,电计,张小明
2024-01-02,100米,12.45,-0.8,50,22,塑胶,电计,张小明`;
    navigator.clipboard.writeText(template);
  };

  const trendData = analysis.trend.slice(-10).map((r) => ({
    label: formatDate(r.date).split(' ')[0],
    value: r.correctedTime,
    secondaryValue: r.rawTime,
  }));

  const studentStats = analysis.trend.reduce((acc, r) => {
    const name = r.studentName || '未知';
    if (!acc[name]) {
      acc[name] = { count: 0, best: Infinity, avg: 0, total: 0 };
    }
    acc[name].count++;
    acc[name].best = Math.min(acc[name].best, r.correctedTime);
    acc[name].total += r.correctedTime;
    acc[name].avg = acc[name].total / acc[name].count;
    return acc;
  }, {} as Record<string, { count: number; best: number; avg: number; total: number }>);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-white font-display">
              训练数据分析
            </h2>
            <p className="text-dark-400 text-sm mt-1">
              批量导入成绩，查看真实进步趋势
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImport(true)}
              className="btn-primary flex items-center gap-2 text-sm py-2.5"
            >
              <Upload className="w-4 h-4" />
              导入数据
            </button>
            <button
              onClick={initMockData}
              className="btn-secondary flex items-center gap-2 text-sm py-2.5"
            >
              <FileText className="w-4 h-4" />
              示例数据
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="glass-card p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <p className="text-dark-500 text-xs">总记录</p>
                <p className="text-xl font-bold text-white font-display">{analysis.totalRecords}</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-dark-500 text-xs">有效记录</p>
                <p className="text-xl font-bold text-white font-display">{analysis.validRecords}</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-accent-500/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-accent-400" />
              </div>
              <div>
                <p className="text-dark-500 text-xs">最佳成绩</p>
                <p className="text-xl font-bold text-white font-display">
                  {analysis.bestCorrectedTime ? analysis.bestCorrectedTime.toFixed(2) : '-'}s
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center',
                analysis.improvement > 0 ? 'bg-primary-500/20' : 'bg-red-500/20'
              )}>
                {analysis.improvement > 0 ? (
                  <TrendingUp className="w-5 h-5 text-primary-400" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-400" />
                )}
              </div>
              <div>
                <p className="text-dark-500 text-xs">进步幅度</p>
                <p className={cn(
                  'text-xl font-bold font-display',
                  analysis.improvement > 0 ? 'text-primary-400' : 'text-red-400'
                )}>
                  {analysis.improvement > 0 ? '+' : ''}
                  {analysis.improvement.toFixed(2)}s
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-dark-400" />
            <span className="text-sm font-medium text-dark-300">数据筛选</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="flex items-center gap-2 px-3 py-2 bg-dark-700/50 rounded-lg cursor-pointer hover:bg-dark-700 transition-colors">
              <input
                type="checkbox"
                checked={filters.excludeMissingWind}
                onChange={(e) => setFilter('excludeMissingWind', e.target.checked)}
                className="w-4 h-4 rounded border-dark-500 bg-dark-800 text-primary-500 focus:ring-primary-500 focus:ring-offset-0"
              />
              <span className="text-sm text-dark-300">排除风速缺失</span>
              {analysis.missingWind > 0 && (
                <span className="text-xs text-accent-400">({analysis.missingWind})</span>
              )}
            </label>

            <label className="flex items-center gap-2 px-3 py-2 bg-dark-700/50 rounded-lg cursor-pointer hover:bg-dark-700 transition-colors">
              <input
                type="checkbox"
                checked={filters.excludeHighError}
                onChange={(e) => setFilter('excludeHighError', e.target.checked)}
                className="w-4 h-4 rounded border-dark-500 bg-dark-800 text-primary-500 focus:ring-primary-500 focus:ring-offset-0"
              />
              <span className="text-sm text-dark-300">排除手计误差大</span>
              {analysis.highErrorManual > 0 && (
                <span className="text-xs text-accent-400">({analysis.highErrorManual})</span>
              )}
            </label>

            <label className="flex items-center gap-2 px-3 py-2 bg-dark-700/50 rounded-lg cursor-pointer hover:bg-dark-700 transition-colors">
              <input
                type="checkbox"
                checked={filters.excludeOutliers}
                onChange={(e) => setFilter('excludeOutliers', e.target.checked)}
                className="w-4 h-4 rounded border-dark-500 bg-dark-800 text-primary-500 focus:ring-primary-500 focus:ring-offset-0"
              />
              <span className="text-sm text-dark-300">排除异常值</span>
              {analysis.outlierCount > 0 && (
                <span className="text-xs text-accent-400">({analysis.outlierCount})</span>
              )}
            </label>

            <label className="flex items-center gap-2 px-3 py-2 bg-dark-700/50 rounded-lg cursor-pointer hover:bg-dark-700 transition-colors">
              <input
                type="checkbox"
                checked={filters.excludeExcluded}
                onChange={(e) => setFilter('excludeExcluded', e.target.checked)}
                className="w-4 h-4 rounded border-dark-500 bg-dark-800 text-primary-500 focus:ring-primary-500 focus:ring-offset-0"
              />
              <span className="text-sm text-dark-300">排除已标记</span>
            </label>

            <select
              value={filters.eventType}
              onChange={(e) => setFilter('eventType', e.target.value as any)}
              className="px-3 py-2 bg-dark-700/50 border-0 rounded-lg text-sm text-dark-300 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            >
              <option value="all">全部项目</option>
              <option value="100m">100米</option>
              <option value="200m">200米</option>
            </select>
          </div>
        </div>

        <div className="flex gap-1 mb-4">
          <button
            onClick={() => setActiveTab('trend')}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-t-xl transition-colors',
              activeTab === 'trend'
                ? 'bg-dark-800/60 text-white'
                : 'text-dark-400 hover:text-dark-200'
            )}
          >
            <TrendingUp className="w-4 h-4 inline mr-2" />
            趋势分析
          </button>
          <button
            onClick={() => setActiveTab('records')}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-t-xl transition-colors',
              activeTab === 'records'
                ? 'bg-dark-800/60 text-white'
                : 'text-dark-400 hover:text-dark-200'
            )}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            数据列表
          </button>
        </div>

        {activeTab === 'trend' ? (
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">成绩趋势</h3>
              {trendData.length > 1 ? (
                <LineChart
                  data={trendData}
                  height={220}
                  showArea
                  secondaryLine
                  showValues={false}
                />
              ) : (
                <div className="h-48 flex items-center justify-center text-dark-500">
                  数据不足，无法生成趋势图
                </div>
              )}
              <div className="flex items-center gap-6 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary-500" />
                  <span className="text-dark-400">修正后成绩</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-accent-500" style={{ borderTop: '2px dashed #f97316' }} />
                  <span className="text-dark-400">原始成绩</span>
                </div>
              </div>
            </div>

            {Object.keys(studentStats).length > 0 && (
              <div className="glass-card p-6">
                <h3 className="text-lg font-semibold text-white mb-4">学生成绩对比</h3>
                <BarChart
                  data={Object.entries(studentStats).map(([name, stats]) => ({
                    label: name,
                    value: stats.best,
                    color: '#22c55e',
                  }))}
                  height={180}
                  showValues
                />
              </div>
            )}

            {analysis.missingWind > 0 || analysis.highErrorManual > 0 || analysis.outlierCount > 0 ? (
              <div className="space-y-3">
                <WarningCard
                  type="warning"
                  title="数据质量提示"
                  message={`共有 ${analysis.missingWind + analysis.highErrorManual + analysis.outlierCount} 条记录存在数据质量问题，建议使用筛选功能排除后再进行比较。`}
                />
              </div>
            ) : null}
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dark-700/50">
                    <th className="text-left py-3 px-4 text-dark-400 font-medium">日期</th>
                    <th className="text-left py-3 px-4 text-dark-400 font-medium">姓名</th>
                    <th className="text-left py-3 px-4 text-dark-400 font-medium">项目</th>
                    <th className="text-right py-3 px-4 text-dark-400 font-medium">原始成绩</th>
                    <th className="text-right py-3 px-4 text-dark-400 font-medium">修正成绩</th>
                    <th className="text-center py-3 px-4 text-dark-400 font-medium">风速</th>
                    <th className="text-center py-3 px-4 text-dark-400 font-medium">计时</th>
                    <th className="text-center py-3 px-4 text-dark-400 font-medium">状态</th>
                    <th className="text-center py-3 px-4 text-dark-400 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => {
                    const result = calculateCorrection(record);
                    return (
                      <tr
                        key={record.id}
                        className={cn(
                          'border-b border-dark-700/30 hover:bg-dark-700/20 transition-colors',
                          record.isExcluded && 'opacity-50'
                        )}
                      >
                        <td className="py-3 px-4 text-dark-300">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-dark-500" />
                            {formatDate(record.date)}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-dark-200 font-medium">
                          {record.studentName || '-'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="tag-neutral">{record.event}</span>
                        </td>
                        <td className="py-3 px-4 text-right text-dark-300 font-mono">
                          {record.rawTime.toFixed(2)}s
                        </td>
                        <td className="py-3 px-4 text-right text-primary-400 font-medium font-mono">
                          {result?.correctedTime.toFixed(2)}s
                        </td>
                        <td className="py-3 px-4 text-center">
                          {record.windSpeed !== undefined ? (
                            <span className={cn(
                              'text-xs font-medium',
                              record.windSpeed! > 2 || record.windSpeed! < -2
                                ? 'text-accent-400'
                                : 'text-dark-400'
                            )}>
                              {formatWindSpeed(record.windSpeed)}
                            </span>
                          ) : (
                            <span className="text-xs text-red-400 flex items-center justify-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              缺失
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center text-dark-400 text-xs">
                          {formatTimingMethod(record.timingMethod)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {record.isExcluded ? (
                            <span className="tag-error">已排除</span>
                          ) : result?.isComparable === false ? (
                            <span className="tag-warning">待确认</span>
                          ) : (
                            <span className="tag-success">正常</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => toggleExclude(record.id)}
                              className="p-1.5 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-dark-200 transition-colors"
                              title={record.isExcluded ? '恢复' : '排除'}
                            >
                              {record.isExcluded ? (
                                <Eye className="w-4 h-4" />
                              ) : (
                                <EyeOff className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => deleteRecord(record.id)}
                              className="p-1.5 rounded-lg hover:bg-red-500/20 text-dark-400 hover:text-red-400 transition-colors"
                              title="删除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {records.length === 0 && (
              <div className="py-16 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-dark-800 flex items-center justify-center">
                  <FileText className="w-8 h-8 text-dark-600" />
                </div>
                <p className="text-dark-400 mb-4">暂无训练记录</p>
                <button
                  onClick={() => setShowImport(true)}
                  className="btn-primary text-sm py-2"
                >
                  <Plus className="w-4 h-4 inline mr-1" />
                  导入数据
                </button>
              </div>
            )}
          </div>
        )}

        {records.length > 0 && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => {
                if (confirm('确定要清空所有记录吗？此操作不可撤销。')) {
                  clearAllRecords();
                }
              }}
              className="text-sm text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" />
              清空所有记录
            </button>
          </div>
        )}
      </div>

      {showImport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card w-full max-w-xl p-6 animate-slide-up">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary-400" />
              批量导入数据
            </h3>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="input-label mb-0">粘贴 CSV 数据</label>
                <button
                  onClick={handleCopyTemplate}
                  className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  复制模板
                </button>
              </div>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="日期,项目,成绩,风速,海拔,温度,赛道,计时,姓名&#10;2024-01-01,100米,12.56,1.5,50,25,塑胶,电计,张小明"
                rows={8}
                className="input-field font-mono text-xs resize-none"
              />
              {importError && (
                <p className="text-xs text-red-400 mt-2">{importError}</p>
              )}
            </div>

            <div className="p-3 bg-dark-900/50 rounded-xl mb-4">
              <p className="text-xs text-dark-400 mb-2 font-medium">支持的列：</p>
              <div className="flex flex-wrap gap-1.5">
                {['日期', '项目', '成绩', '风速', '海拔', '温度', '赛道', '计时', '姓名', '备注'].map((col) => (
                  <span key={col} className="tag-neutral text-[10px]">{col}</span>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowImport(false);
                  setImportText('');
                  setImportError('');
                }}
                className="btn-secondary flex-1"
              >
                取消
              </button>
              <button
                onClick={handleImport}
                className="btn-primary flex-1"
              >
                导入
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
