import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
  LineChart, Line
} from 'recharts';
import {
  GitCompare, CheckCircle2, XCircle, AlertTriangle,
  FileSpreadsheet, FileText, FileJson, Download, RefreshCw,
  Calendar, Bot, TrendingUp,
  Loader2, CheckSquare, Square, Lightbulb
} from 'lucide-react';
import { useSceneStore } from '@/store/useSceneStore';
import { useReportStore } from '@/store/useReportStore';
import { cn } from '@/utils/cn';
import { formatDateTime } from '@/utils/time';
import { severityToHex } from '@/utils/colors';
import { calculateCoverageRate } from '@/services/analysisService';

type ExportFormat = 'excel' | 'pdf' | 'json';

const typeLabels: Record<string, string> = {
  coverage: '覆盖率',
  route: '路线',
  timing: '时间',
  alarms: '告警',
};

export default function Comparison() {
  const { patrolShifts, checkpoints } = useSceneStore();
  const {
    comparisonReport,
    isGenerating,
    error,
    selectedComparisonShiftIds,
    actions: {
      generateComparisonReport,
      toggleComparisonShift,
      setSelectedComparisonShiftIds,
      exportReport,
      clearReports,
    },
  } = useReportStore();

  const [exportFormat, setExportFormat] = useState<ExportFormat>('excel');

  useEffect(() => {
    return () => {
      clearReports();
    };
  }, [clearReports]);

  const handleGenerate = () => {
    generateComparisonReport();
  };

  const handleSelectAll = () => {
    if (selectedComparisonShiftIds.length === patrolShifts.length) {
      setSelectedComparisonShiftIds([]);
    } else {
      setSelectedComparisonShiftIds(patrolShifts.map(s => s.id));
    }
  };

  const handleExport = async () => {
    try {
      await exportReport('comparison', exportFormat);
    } catch (e) {
      console.error('导出失败:', e);
    }
  };

  const coverageBarData = useMemo(() => {
    if (!comparisonReport) return [];
    return comparisonReport.coverageComparison.map(c => ({
      name: c.shiftName.split(' ').slice(1).join(' '),
      date: c.shiftName.split(' ')[0],
      覆盖率: parseFloat((c.rate * 100).toFixed(1)),
    }));
  }, [comparisonReport]);

  const radarData = useMemo(() => {
    if (!comparisonReport) return [];
    const shifts = patrolShifts.filter(s => selectedComparisonShiftIds.includes(s.id));
    
    return ['覆盖率', '告警数', '时长', '点位', '速度'].map((metric) => {
      const item: Record<string, any> = { metric };
      shifts.forEach((shift) => {
        const { rate } = calculateCoverageRate(shift, checkpoints);
        let value = 0;
        switch (metric) {
          case '覆盖率':
            value = rate * 100;
            break;
          case '告警数':
            value = Math.max(0, 100 - shift.alarms.length * 10);
            break;
          case '时长':
            const duration = (new Date(shift.endTime).getTime() - new Date(shift.startTime).getTime()) / 1000;
            value = Math.min(100, (duration / 3600) * 50);
            break;
          case '点位':
            value = rate * 100;
            break;
          case '速度':
            const avgSpeed = shift.trajectoryPoints.reduce((sum, p) => sum + p.speed, 0) / shift.trajectoryPoints.length;
            value = Math.min(100, avgSpeed * 20);
            break;
        }
        item[shift.shiftName] = parseFloat(value.toFixed(1));
      });
      return item;
    });
  }, [comparisonReport, patrolShifts, selectedComparisonShiftIds, checkpoints]);

  const timelineData = useMemo(() => {
    if (!comparisonReport) return [];
    const shifts = patrolShifts.filter(s => selectedComparisonShiftIds.includes(s.id));
    const allTimes = new Set<string>();
    
    shifts.forEach(shift => {
      const interval = Math.max(1, Math.floor(shift.trajectoryPoints.length / 15));
      shift.trajectoryPoints.filter((_, i) => i % interval === 0).forEach(p => {
        allTimes.add(new Date(p.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }));
      });
    });

    const sortedTimes = Array.from(allTimes).sort();
    
    return sortedTimes.map(time => {
      const item: Record<string, any> = { time };
      shifts.forEach(shift => {
        const point = shift.trajectoryPoints.find(p => 
          new Date(p.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) === time
        );
        item[shift.shiftName] = point ? point.speed : null;
      });
      return item;
    });
  }, [comparisonReport, patrolShifts, selectedComparisonShiftIds]);

  return (
    <div className="h-[calc(100vh-3.5rem)] flex overflow-hidden">
      <div className="w-80 flex-shrink-0 bg-background-dark/50 border-r border-white/10 p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-lg text-primary">选择班次</h3>
          <button
            onClick={handleSelectAll}
            className="text-xs text-primary hover:text-primary/80 transition-colors"
          >
            {selectedComparisonShiftIds.length === patrolShifts.length ? '取消全选' : '全选'}
          </button>
        </div>

        <p className="text-xs text-white/50 mb-3">
          至少选择2个班次进行对比
        </p>

        <div className="space-y-2">
          {patrolShifts.map(shift => {
            const coverage = calculateCoverageRate(shift, checkpoints);
            const isSelected = selectedComparisonShiftIds.includes(shift.id);
            return (
              <button
                key={shift.id}
                onClick={() => toggleComparisonShift(shift.id)}
                className={cn(
                  "w-full p-3 rounded-lg border text-left transition-all",
                  isSelected
                    ? "border-primary/50 bg-primary/10"
                    : "border-white/10 bg-white/5 hover:border-white/20"
                )}
              >
                <div className="flex items-start gap-2">
                  <div className="mt-0.5">
                    {isSelected ? (
                      <CheckSquare size={16} className="text-primary" />
                    ) : (
                      <Square size={16} className="text-white/30" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-white text-sm">{shift.shiftName}</span>
                      <span className={cn(
                        "text-xs px-1.5 py-0.5 rounded",
                        coverage.rate >= 0.9 ? "bg-success/20 text-success" :
                        coverage.rate >= 0.7 ? "bg-warning/20 text-warning" :
                        "bg-danger/20 text-danger"
                      )}>
                        {(coverage.rate * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="text-xs text-white/50 space-y-0.5">
                      <div className="flex items-center gap-1">
                        <Calendar size={10} />
                        {shift.date}
                      </div>
                      <div className="flex items-center gap-1">
                        <Bot size={10} />
                        {shift.robotId} · {shift.alarms.length}个告警
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={handleGenerate}
          disabled={selectedComparisonShiftIds.length < 2 || isGenerating}
          className="w-full mt-4 px-4 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <GitCompare size={16} />
          )}
          {isGenerating ? '生成中...' : `对比 ${selectedComparisonShiftIds.length} 个班次`}
        </button>

        {error && (
          <div className="mt-3 p-2 bg-danger/10 border border-danger/30 rounded text-danger text-xs">
            {error}
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-white/10 bg-background-dark/30">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display font-bold text-xl text-white">
                班次对比分析
              </h2>
              <p className="text-sm text-white/50">
                {comparisonReport
                  ? `已对比 ${comparisonReport.shiftNames.length} 个班次`
                  : '请在左侧选择要对比的班次'
                }
              </p>
            </div>

            {comparisonReport && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
                  <button
                    onClick={() => setExportFormat('excel')}
                    className={cn(
                      "px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1",
                      exportFormat === 'excel' ? "bg-success text-white" : "text-white/60 hover:text-white"
                    )}
                  >
                    <FileSpreadsheet size={12} />
                    Excel
                  </button>
                  <button
                    onClick={() => setExportFormat('pdf')}
                    className={cn(
                      "px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1",
                      exportFormat === 'pdf' ? "bg-danger text-white" : "text-white/60 hover:text-white"
                    )}
                  >
                    <FileText size={12} />
                    PDF
                  </button>
                  <button
                    onClick={() => setExportFormat('json')}
                    className={cn(
                      "px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1",
                      exportFormat === 'json' ? "bg-primary text-white" : "text-white/60 hover:text-white"
                    )}
                  >
                    <FileJson size={12} />
                    JSON
                  </button>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="px-3 py-1.5 bg-white/10 text-white rounded-lg text-xs font-medium hover:bg-white/20 disabled:opacity-50 transition-colors flex items-center gap-1"
                >
                  <RefreshCw size={12} className={cn(isGenerating && 'animate-spin')} />
                  刷新
                </button>

                <button
                  onClick={handleExport}
                  disabled={isGenerating}
                  className="px-4 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-1"
                >
                  <Download size={14} />
                  导出
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!comparisonReport ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <GitCompare size={56} className="text-white/20 mx-auto mb-4" />
                <p className="text-white/60 mb-2">选择班次开始对比分析</p>
                <p className="text-white/40 text-sm">在左侧选择至少2个班次，然后点击"对比"按钮</p>
              </div>
            </div>
          ) : isGenerating ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Loader2 size={40} className="animate-spin text-primary mx-auto mb-3" />
                <p className="text-white/60">正在生成对比报告...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                <div className="stat-card">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp size={14} className="text-success" />
                    <span className="text-xs text-white/50">平均覆盖率</span>
                  </div>
                  <div className={cn(
                    "text-2xl font-display font-bold",
                    comparisonReport.patternAnalysis.averageCoverage >= 0.9 ? 'text-success' :
                    comparisonReport.patternAnalysis.averageCoverage >= 0.7 ? 'text-warning' : 'text-danger'
                  )}>
                    {(comparisonReport.patternAnalysis.averageCoverage * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="stat-card">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 size={14} className="text-primary" />
                    <span className="text-xs text-white/50">一致性评分</span>
                  </div>
                  <div className={cn(
                    "text-2xl font-display font-bold",
                    comparisonReport.patternAnalysis.consistentCoverage >= 0.8 ? 'text-success' :
                    comparisonReport.patternAnalysis.consistentCoverage >= 0.6 ? 'text-warning' : 'text-danger'
                  )}>
                    {(comparisonReport.patternAnalysis.consistentCoverage * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="stat-card">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle size={14} className="text-warning" />
                    <span className="text-xs text-white/50">差异项</span>
                  </div>
                  <div className="text-2xl font-display font-bold text-warning">
                    {comparisonReport.differences.length}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="flex items-center gap-2 mb-1">
                    {comparisonReport.patternAnalysis.isSystemicIssue ? (
                      <XCircle size={14} className="text-danger" />
                    ) : (
                      <CheckCircle2 size={14} className="text-success" />
                    )}
                    <span className="text-xs text-white/50">系统性问题</span>
                  </div>
                  <div className={cn(
                    "text-2xl font-display font-bold",
                    comparisonReport.patternAnalysis.isSystemicIssue ? 'text-danger' : 'text-success'
                  )}>
                    {comparisonReport.patternAnalysis.isSystemicIssue ? '存在' : '无'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="panel p-4">
                  <h4 className="font-medium text-white mb-4">覆盖率对比</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={coverageBarData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} unit="%" />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                          labelStyle={{ color: '#fff' }}
                          formatter={(value: number) => [`${value}%`, '覆盖率']}
                        />
                        <Bar dataKey="覆盖率" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="panel p-4">
                  <h4 className="font-medium text-white mb-4">多维度对比</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="#334155" />
                        <PolarAngleAxis dataKey="metric" stroke="#64748b" fontSize={11} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" fontSize={10} />
                        {patrolShifts.filter(s => selectedComparisonShiftIds.includes(s.id)).map((shift, index) => (
                          <Radar
                            key={shift.id}
                            name={shift.shiftName}
                            dataKey={shift.shiftName}
                            stroke={['#3b82f6', '#10b981', '#f59e0b', '#ef4444'][index % 4]}
                            fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444'][index % 4]}
                            fillOpacity={0.2}
                            strokeWidth={2}
                          />
                        ))}
                        <Legend />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                          labelStyle={{ color: '#fff' }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="panel p-4">
                <h4 className="font-medium text-white mb-4">速度趋势对比</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timelineData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={11} label={{ value: 'm/s', angle: -90, position: 'insideLeft', fill: '#64748b' }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Legend />
                      {patrolShifts.filter(s => selectedComparisonShiftIds.includes(s.id)).map((shift, index) => (
                        <Line
                          key={shift.id}
                          type="monotone"
                          dataKey={shift.shiftName}
                          stroke={['#3b82f6', '#10b981', '#f59e0b', '#ef4444'][index % 4]}
                          strokeWidth={2}
                          dot={false}
                          connectNulls
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {comparisonReport.differences.length > 0 && (
                <div className="panel p-4">
                  <h4 className="font-medium text-white mb-4">
                    差异分析 ({comparisonReport.differences.length}项)
                  </h4>
                  <div className="space-y-2">
                    {comparisonReport.differences.map((diff, index) => (
                      <div
                        key={index}
                        className="p-3 rounded-lg bg-white/5 border border-white/10"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: severityToHex(diff.severity) }}
                            />
                            <span className="px-2 py-0.5 bg-white/10 rounded text-xs text-white/70">
                              {typeLabels[diff.type] || diff.type}
                            </span>
                            <span className="text-white font-medium text-sm">{diff.description}</span>
                          </div>
                          <span className={cn(
                            "text-xs px-1.5 py-0.5 rounded",
                            diff.severity === 'high' ? "bg-danger/20 text-danger" :
                            diff.severity === 'medium' ? "bg-warning/20 text-warning" :
                            "bg-success/20 text-success"
                          )}>
                            {diff.severity === 'high' ? '高危' : diff.severity === 'medium' ? '中危' : '低危'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-white/50 text-xs mb-1">{comparisonReport.shiftNames[0]}</div>
                            <div className="text-white">{String(diff.shift1Value)}</div>
                          </div>
                          <div>
                            <div className="text-white/50 text-xs mb-1">{comparisonReport.shiftNames[1]}</div>
                            <div className="text-white">{String(diff.shift2Value)}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {comparisonReport.patternAnalysis.frequentMissedPoints.length > 0 && (
                <div className="panel p-4">
                  <h4 className="font-medium text-white mb-4">
                    频繁漏巡点位 ({comparisonReport.patternAnalysis.frequentMissedPoints.length}个)
                  </h4>
                  <p className="text-xs text-danger mb-3">
                    这些点位在超过50%的班次中被漏巡，可能存在系统性问题
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {comparisonReport.patternAnalysis.frequentMissedPoints.map(point => (
                      <div key={point.id} className="p-3 rounded-lg bg-danger/5 border border-danger/20">
                        <div className="flex items-center gap-2 mb-1">
                          <XCircle size={14} className="text-danger" />
                          <span className="text-white font-medium text-sm">{point.name}</span>
                        </div>
                        <div className="text-xs text-white/50">
                          坐标: ({point.x.toFixed(1)}, {point.y.toFixed(1)})
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="panel p-4">
                <h4 className="font-medium text-white mb-4 flex items-center gap-2">
                  <Lightbulb size={16} className="text-warning" />
                  改进建议
                </h4>
                <div className="space-y-2">
                  {comparisonReport.patternAnalysis.recommendations.map((rec, index) => (
                    <div key={index} className="flex items-start gap-2 p-2 rounded-lg bg-warning/5">
                      <span className="text-warning mt-0.5">{index + 1}.</span>
                      <p className="text-white/80 text-sm">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-center text-xs text-white/40 pt-4">
                报告生成时间: {formatDateTime(comparisonReport.generatedAt)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
