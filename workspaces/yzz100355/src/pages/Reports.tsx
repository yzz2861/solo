import { useState, useRef, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import {
  FileSpreadsheet, FileText, FileJson, Download, RefreshCw,
  MapPin, Clock, AlertTriangle, CheckCircle2, XCircle,
  Loader2, Calendar, Bot, TrendingUp
} from 'lucide-react';
import { useSceneStore } from '@/store/useSceneStore';
import { useReportStore } from '@/store/useReportStore';
import { cn } from '@/utils/cn';
import { formatDuration, formatDateTime } from '@/utils/time';
import { calculateCoverageRate } from '@/services/analysisService';

type ReportTab = 'coverage' | 'stay' | 'missed';

export default function Reports() {
  const { patrolShifts, checkpoints, selectedShiftId, actions: { selectShift } } = useSceneStore();
  const {
    coverageReport,
    stayReport,
    missedPointsReport,
    isGenerating,
    error,
    actions: {
      generateAllReports,
      exportReport,
    },
  } = useReportStore();

  const [activeTab, setActiveTab] = useState<ReportTab>('coverage');
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf' | 'json'>('excel');
  const reportRef = useRef<HTMLDivElement>(null);

  const selectedShift = patrolShifts.find(s => s.id === selectedShiftId);

  useEffect(() => {
    if (selectedShiftId) {
      generateAllReports();
    }
  }, [selectedShiftId, generateAllReports]);

  const handleExport = async () => {
    try {
      await exportReport(activeTab, exportFormat, reportRef.current || undefined);
    } catch (e) {
      console.error('导出失败:', e);
    }
  };

  const coverageChartData = coverageReport ? [
    { name: '已覆盖', value: coverageReport.coveredCheckpoints, color: '#10b981' },
    { name: '未覆盖', value: coverageReport.missedCheckpoints.length, color: '#ef4444' },
  ] : [];

  const stayChartData = stayReport?.abnormalStays.map((stay, index) => ({
    name: `停留${index + 1}`,
    duration: Math.round(stay.duration / 60),
    x: stay.x.toFixed(1),
    y: stay.y.toFixed(1),
  })) || [];

  const timelineChartData = selectedShift ? (() => {
    const points = selectedShift.trajectoryPoints;
    const interval = Math.max(1, Math.floor(points.length / 20));
    return points.filter((_, i) => i % interval === 0).map(p => ({
      time: new Date(p.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      speed: p.speed,
      signal: p.signalStrength,
    }));
  })() : [];

  if (!selectedShift) {
    return (
      <div className="h-[calc(100vh-3.5rem)] flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle size={48} className="text-warning mx-auto mb-4" />
          <p className="text-white/70 mb-4">请先在左侧选择一个巡逻班次</p>
          <div className="flex flex-wrap justify-center gap-2">
            {patrolShifts.slice(0, 3).map(shift => (
              <button
                key={shift.id}
                onClick={() => selectShift(shift.id)}
                className="px-4 py-2 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors text-sm"
              >
                {shift.shiftName}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] flex overflow-hidden">
      <div className="w-72 flex-shrink-0 bg-background-dark/50 border-r border-white/10 p-4 overflow-y-auto">
        <h3 className="font-display font-semibold text-lg mb-4 text-primary">选择班次</h3>
        <div className="space-y-2">
          {patrolShifts.map(shift => {
            const coverage = calculateCoverageRate(shift, checkpoints);
            const isSelected = shift.id === selectedShiftId;
            return (
              <button
                key={shift.id}
                onClick={() => selectShift(shift.id)}
                className={cn(
                  "w-full p-3 rounded-lg border text-left transition-all",
                  isSelected
                    ? "border-primary/50 bg-primary/10"
                    : "border-white/10 bg-white/5 hover:border-white/20"
                )}
              >
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
                <div className="text-xs text-white/50">
                  <div className="flex items-center gap-1">
                    <Calendar size={10} />
                    {shift.date}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Bot size={10} />
                    {shift.robotId}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-white/10 bg-background-dark/30">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display font-bold text-xl text-white">
                报表中心 - {selectedShift.shiftName}
              </h2>
              <p className="text-sm text-white/50">
                {selectedShift.date} · {selectedShift.robotId}
              </p>
            </div>

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
                onClick={() => generateAllReports()}
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
          </div>

          {error && (
            <div className="mt-2 p-2 bg-danger/10 border border-danger/30 rounded text-danger text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="border-b border-white/10">
          <div className="flex">
            {[
              { key: 'coverage' as const, label: '巡逻覆盖', icon: MapPin },
              { key: 'stay' as const, label: '异常停留', icon: Clock },
              { key: 'missed' as const, label: '未到达点位', icon: XCircle },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2 border-b-2",
                    activeTab === tab.key
                      ? "text-primary border-primary"
                      : "text-white/50 border-transparent hover:text-white/80"
                  )}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6" ref={reportRef}>
          {isGenerating ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Loader2 size={40} className="animate-spin text-primary mx-auto mb-3" />
                <p className="text-white/60">正在生成报告...</p>
              </div>
            </div>
          ) : activeTab === 'coverage' && coverageReport ? (
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                <div className="stat-card">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp size={14} className="text-primary" />
                    <span className="text-xs text-white/50">覆盖率</span>
                  </div>
                  <div className={cn(
                    "text-2xl font-display font-bold",
                    coverageReport.coverageRate >= 0.9 ? 'text-success' :
                    coverageReport.coverageRate >= 0.7 ? 'text-warning' : 'text-danger'
                  )}>
                    {(coverageReport.coverageRate * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="stat-card">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 size={14} className="text-success" />
                    <span className="text-xs text-white/50">已巡点位</span>
                  </div>
                  <div className="text-2xl font-display font-bold text-success">
                    {coverageReport.coveredCheckpoints}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="flex items-center gap-2 mb-1">
                    <XCircle size={14} className="text-danger" />
                    <span className="text-xs text-white/50">漏巡点位</span>
                  </div>
                  <div className="text-2xl font-display font-bold text-danger">
                    {coverageReport.missedCheckpoints.length}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock size={14} className="text-primary" />
                    <span className="text-xs text-white/50">巡逻时长</span>
                  </div>
                  <div className="text-2xl font-display font-bold text-white">
                    {formatDuration(coverageReport.patrolDuration)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="panel p-4">
                  <h4 className="font-medium text-white mb-4">覆盖率分布</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={coverageChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {coverageChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                          labelStyle={{ color: '#fff' }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="panel p-4">
                  <h4 className="font-medium text-white mb-4">速度与信号趋势</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={timelineChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                        <YAxis yAxisId="left" stroke="#64748b" fontSize={11} />
                        <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={11} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                          labelStyle={{ color: '#fff' }}
                        />
                        <Legend />
                        <Line yAxisId="left" type="monotone" dataKey="speed" stroke="#3b82f6" name="速度(m/s)" dot={false} />
                        <Line yAxisId="right" type="monotone" dataKey="signal" stroke="#10b981" name="信号强度(%)" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {coverageReport.missedCheckpoints.length > 0 && (
                <div className="panel p-4">
                  <h4 className="font-medium text-white mb-4">漏巡点位列表</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-xs text-white/50 border-b border-white/10">
                          <th className="pb-2 font-medium">点位名称</th>
                          <th className="pb-2 font-medium">坐标 X</th>
                          <th className="pb-2 font-medium">坐标 Y</th>
                          <th className="pb-2 font-medium">半径</th>
                          <th className="pb-2 font-medium">是否必巡</th>
                        </tr>
                      </thead>
                      <tbody>
                        {coverageReport.missedCheckpoints.map(cp => (
                          <tr key={cp.id} className="border-b border-white/5 text-sm">
                            <td className="py-2 text-white">{cp.name}</td>
                            <td className="py-2 text-white/70">{cp.x.toFixed(1)}</td>
                            <td className="py-2 text-white/70">{cp.y.toFixed(1)}</td>
                            <td className="py-2 text-white/70">{cp.radius}m</td>
                            <td className="py-2">
                              {cp.required ? (
                                <span className="text-danger">必巡</span>
                              ) : (
                                <span className="text-white/50">可选</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === 'stay' && stayReport ? (
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                <div className="stat-card">
                  <div className="text-xs text-white/50 mb-1">异常停留次数</div>
                  <div className="text-2xl font-display font-bold text-warning">{stayReport.stayCount}</div>
                </div>
                <div className="stat-card">
                  <div className="text-xs text-white/50 mb-1">总停留时间</div>
                  <div className="text-2xl font-display font-bold text-white">{formatDuration(stayReport.totalStayTime)}</div>
                </div>
                <div className="stat-card">
                  <div className="text-xs text-white/50 mb-1">平均停留时长</div>
                  <div className="text-2xl font-display font-bold text-primary">{formatDuration(stayReport.avgStayDuration)}</div>
                </div>
                <div className="stat-card">
                  <div className="text-xs text-white/50 mb-1">最长停留时长</div>
                  <div className="text-2xl font-display font-bold text-danger">{formatDuration(stayReport.maxStayDuration)}</div>
                </div>
              </div>

              {stayReport.abnormalStays.length > 0 && (
                <>
                  <div className="panel p-4">
                    <h4 className="font-medium text-white mb-4">停留时长分布</h4>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stayChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                          <YAxis stroke="#64748b" fontSize={11} label={{ value: '分钟', angle: -90, position: 'insideLeft', fill: '#64748b' }} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                            labelStyle={{ color: '#fff' }}
                            formatter={(value: number) => [`${value} 分钟`, '停留时长']}
                          />
                          <Bar dataKey="duration" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="panel p-4">
                    <h4 className="font-medium text-white mb-4">异常停留详情</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="text-left text-xs text-white/50 border-b border-white/10">
                            <th className="pb-2 font-medium">序号</th>
                            <th className="pb-2 font-medium">位置 X</th>
                            <th className="pb-2 font-medium">位置 Y</th>
                            <th className="pb-2 font-medium">开始时间</th>
                            <th className="pb-2 font-medium">结束时间</th>
                            <th className="pb-2 font-medium">停留时长</th>
                            <th className="pb-2">原因</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stayReport.abnormalStays.map((stay, index) => (
                            <tr key={stay.id} className="border-b border-white/5 text-sm">
                              <td className="py-2 text-white/70">{index + 1}</td>
                              <td className="py-2 text-white">{stay.x.toFixed(1)}</td>
                              <td className="py-2 text-white">{stay.y.toFixed(1)}</td>
                              <td className="py-2 text-white/70">{formatDateTime(stay.startTime)}</td>
                              <td className="py-2 text-white/70">{formatDateTime(stay.endTime)}</td>
                              <td className="py-2 text-warning font-medium">{formatDuration(stay.duration)}</td>
                              <td className="py-2 text-white/50">{stay.reason || '待标注'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : activeTab === 'missed' && missedPointsReport ? (
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                <div className="stat-card">
                  <div className="text-xs text-white/50 mb-1">未到达点位</div>
                  <div className="text-2xl font-display font-bold text-danger">{missedPointsReport.totalMissed}</div>
                </div>
                <div className="stat-card">
                  <div className="text-xs text-white/50 mb-1">总检查点</div>
                  <div className="text-2xl font-display font-bold text-white">{checkpoints.length}</div>
                </div>
                <div className="stat-card">
                  <div className="text-xs text-white/50 mb-1">到达率</div>
                  <div className="text-2xl font-display font-bold text-primary">
                    {(((checkpoints.length - missedPointsReport.totalMissed) / checkpoints.length) * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="stat-card">
                  <div className="text-xs text-white/50 mb-1">报告日期</div>
                  <div className="text-xl font-display font-bold text-white">{missedPointsReport.date}</div>
                </div>
              </div>

              {missedPointsReport.missedPoints.length > 0 ? (
                <div className="panel p-4">
                  <h4 className="font-medium text-white mb-4">未到达点位详情</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-xs text-white/50 border-b border-white/10">
                          <th className="pb-2 font-medium">点位名称</th>
                          <th className="pb-2 font-medium">坐标 X</th>
                          <th className="pb-2 font-medium">坐标 Y</th>
                          <th className="pb-2 font-medium">半径</th>
                          <th className="pb-2 font-medium">是否必巡</th>
                          <th className="pb-2 font-medium">上次到达时间</th>
                        </tr>
                      </thead>
                      <tbody>
                        {missedPointsReport.missedPoints.map(cp => (
                          <tr key={cp.id} className="border-b border-white/5 text-sm">
                            <td className="py-2 text-white">{cp.name}</td>
                            <td className="py-2 text-white/70">{cp.x.toFixed(1)}</td>
                            <td className="py-2 text-white/70">{cp.y.toFixed(1)}</td>
                            <td className="py-2 text-white/70">{cp.radius}m</td>
                            <td className="py-2">
                              {cp.required ? (
                                <span className="text-danger">必巡</span>
                              ) : (
                                <span className="text-white/50">可选</span>
                              )}
                            </td>
                            <td className="py-2 text-white/50">
                              {missedPointsReport.lastVisitTimes[cp.id]
                                ? formatDateTime(missedPointsReport.lastVisitTimes[cp.id]!)
                                : '从未到达'
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="panel p-8 text-center">
                  <CheckCircle2 size={48} className="text-success mx-auto mb-3" />
                  <p className="text-white font-medium">所有点位均已到达</p>
                  <p className="text-white/50 text-sm mt-1">本次巡逻无遗漏</p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
