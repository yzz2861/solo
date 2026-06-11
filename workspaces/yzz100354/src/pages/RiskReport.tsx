import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import { 
  AlertTriangle, TrendingUp, Calendar, Users, 
  FlaskConical, Clock, CheckCircle, ArrowRight,
  BarChart3, PieChart
} from 'lucide-react';
import { useBatchStore } from '@/store/useBatchStore';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ANOMALY_TYPE_LABELS, ANOMALY_TYPE_COLORS } from '@/types';
import { formatDateTime, formatDuration } from '@/utils/timeParser';

export default function RiskReport() {
  const navigate = useNavigate();
  const { batches } = useBatchStore();

  const stats = useMemo(() => {
    const total = batches.length;
    const highRisk = batches.filter(b => b.riskLevel >= 70).length;
    const mediumRisk = batches.filter(b => b.riskLevel >= 40 && b.riskLevel < 70).length;
    const lowRisk = batches.filter(b => b.riskLevel < 40).length;
    
    const tasted = batches.filter(b => b.status === 'tasted').length;
    const avgScore = tasted > 0 
      ? Math.round(batches.filter(b => b.tastingNote).reduce((sum, b) => sum + (b.tastingNote?.score || 0), 0) / tasted)
      : 0;
    
    const ongoing = batches.filter(b => b.status === 'ongoing').length;
    
    const totalAnomalies = batches.reduce((sum, b) => sum + b.anomalies.length, 0);
    const unreviewed = batches.reduce((sum, b) => sum + b.anomalies.filter(a => !a.reviewed).length, 0);
    
    const anomalyByType = batches.reduce((acc, batch) => {
      batch.anomalies.forEach(a => {
        acc[a.type] = (acc[a.type] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    const batchesByTank = batches.reduce((acc, batch) => {
      acc[batch.tankNo] = (acc[batch.tankNo] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { total, highRisk, mediumRisk, lowRisk, tasted, avgScore, ongoing, totalAnomalies, unreviewed, anomalyByType, batchesByTank };
  }, [batches]);

  const highRiskBatches = useMemo(() => {
    return [...batches]
      .filter(b => b.riskLevel >= 50)
      .sort((a, b) => b.riskLevel - a.riskLevel)
      .slice(0, 5);
  }, [batches]);

  const needTastingBatches = useMemo(() => {
    return [...batches]
      .filter(b => b.status === 'completed' && !b.tastingNote)
      .sort((a, b) => (b.endTime?.getTime() || 0) - (a.endTime?.getTime() || 0))
      .slice(0, 5);
  }, [batches]);

  const riskDistributionOption = useMemo(() => ({
    tooltip: { trigger: 'item' },
    legend: { bottom: '0', left: 'center', icon: 'circle' },
    series: [{
      type: 'pie',
      radius: ['45%', '70%'],
      center: ['50%', '40%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, formatter: '{b}: {c}', fontSize: 12 },
      data: [
        { value: stats.highRisk, name: '高风险', itemStyle: { color: '#ef4444' } },
        { value: stats.mediumRisk, name: '中风险', itemStyle: { color: '#eab308' } },
        { value: stats.lowRisk, name: '低风险', itemStyle: { color: '#22c55e' } },
      ]
    }]
  }), [stats]);

  const anomalyTypeOption = useMemo(() => ({
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
    xAxis: { 
      type: 'category', 
      data: Object.keys(stats.anomalyByType).map(t => ANOMALY_TYPE_LABELS[t as keyof typeof ANOMALY_TYPE_LABELS]),
      axisLabel: { fontSize: 11, rotate: 0 }
    },
    yAxis: { type: 'value' },
    series: [{
      type: 'bar',
      data: Object.entries(stats.anomalyByType).map(([type, value]) => ({
        value,
        itemStyle: { color: ANOMALY_TYPE_COLORS[type as keyof typeof ANOMALY_TYPE_COLORS], borderRadius: [4, 4, 0, 0] }
      })),
      barWidth: '50%'
    }]
  }), [stats]);

  const last30DaysOption = useMemo(() => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date;
    });

    const batchesByDay = last30Days.map(day => {
      const dayStr = day.toISOString().split('T')[0];
      return batches.filter(b => 
        b.startTime.toISOString().split('T')[0] === dayStr
      ).length;
    });

    return {
      tooltip: { trigger: 'axis' },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
      xAxis: { 
        type: 'category', 
        data: last30Days.map(d => `${d.getMonth() + 1}/${d.getDate()}`),
        axisLabel: { fontSize: 10, interval: 4 }
      },
      yAxis: { type: 'value', minInterval: 1 },
      series: [{
        type: 'line',
        smooth: true,
        data: batchesByDay,
        areaStyle: { color: 'rgba(217, 119, 6, 0.1)' },
        lineStyle: { color: '#d97706', width: 2 },
        itemStyle: { color: '#d97706' }
      }]
    };
  }, [batches]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-amber-900">风险报告</h1>
          <p className="text-amber-600 mt-1">老板视角 - 批次风险总览与决策建议</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-amber-500">
            生成时间：{new Date().toLocaleString('zh-CN')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600">总批次</p>
                <p className="text-3xl font-bold text-amber-900 mt-1">{stats.total}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <FlaskConical className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-red-50 to-orange-50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600">高风险</p>
                <p className="text-3xl font-bold text-red-700 mt-1">{stats.highRisk}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">发酵中</p>
                <p className="text-3xl font-bold text-blue-700 mt-1">{stats.ongoing}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center animate-pulse">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">已品评</p>
                <p className="text-3xl font-bold text-green-700 mt-1">{stats.tasted}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-50 to-amber-50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600">平均评分</p>
                <p className="text-3xl font-bold text-purple-700 mt-1">{stats.avgScore}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {stats.unreviewed > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div>
              <p className="font-medium text-red-800">异常待复核提醒</p>
              <p className="text-sm text-red-600">目前有 {stats.unreviewed} 处异常等待酿酒师复核</p>
            </div>
          </div>
          <Button onClick={() => navigate('/batches')}>
            立即处理
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PieChart className="w-4 h-4 text-amber-500" />
              风险等级分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ReactECharts option={riskDistributionOption} style={{ height: '240px' }} />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-500" />
              异常类型统计
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ReactECharts option={anomalyTypeOption} style={{ height: '240px' }} />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-500" />
              近30天批次趋势
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ReactECharts option={last30DaysOption} style={{ height: '240px' }} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                高风险批次预警
              </CardTitle>
              <Badge variant="danger">{highRiskBatches.length} 个</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {highRiskBatches.length > 0 ? (
              <div className="space-y-3">
                {highRiskBatches.map(batch => (
                  <div 
                    key={batch.id}
                    className="p-4 rounded-lg border border-red-100 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer"
                    onClick={() => navigate(`/batches/${batch.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-red-800">{batch.batchNo}</span>
                          <Badge variant="danger">风险 {batch.riskLevel}</Badge>
                        </div>
                        <p className="text-sm text-red-600 mt-1">
                          {batch.tankNo} · {formatDateTime(batch.startTime)}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {batch.anomalies.slice(0, 3).map((a, idx) => (
                            <span 
                              key={idx}
                              className="text-xs px-2 py-0.5 rounded-full"
                              style={{ 
                                backgroundColor: `${ANOMALY_TYPE_COLORS[a.type]}15`,
                                color: ANOMALY_TYPE_COLORS[a.type]
                              }}
                            >
                              {ANOMALY_TYPE_LABELS[a.type]}
                            </span>
                          ))}
                          {batch.anomalies.length > 3 && (
                            <span className="text-xs text-red-500">+{batch.anomalies.length - 3}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        {batch.tastingNote ? (
                          <div>
                            <p className="text-lg font-bold text-green-600">{batch.tastingNote.score}</p>
                            <p className="text-xs text-green-500">已品评</p>
                          </div>
                        ) : (
                          <Badge variant="warning">待品评</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-green-600">
                <CheckCircle className="w-12 h-12 mx-auto mb-2" />
                <p>暂无高风险批次</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                建议提前品评批次
              </CardTitle>
              <Badge variant="warning">{needTastingBatches.length} 个</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {needTastingBatches.length > 0 ? (
              <div className="space-y-3">
                {needTastingBatches.map(batch => (
                  <div 
                    key={batch.id}
                    className="p-4 rounded-lg border border-amber-100 bg-amber-50 hover:bg-amber-100 transition-colors cursor-pointer"
                    onClick={() => navigate(`/batches/${batch.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-amber-800">{batch.batchNo}</span>
                          <Badge variant="warning">风险 {batch.riskLevel}</Badge>
                        </div>
                        <p className="text-sm text-amber-600 mt-1">
                          {batch.tankNo} · 发酵时长 {formatDuration(batch.startTime, batch.endTime || new Date())}
                        </p>
                        {batch.anomalies.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {batch.anomalies.slice(0, 3).map((a, idx) => (
                              <span 
                                key={idx}
                                className="text-xs px-2 py-0.5 rounded-full"
                                style={{ 
                                  backgroundColor: `${ANOMALY_TYPE_COLORS[a.type]}15`,
                                  color: ANOMALY_TYPE_COLORS[a.type]
                                }}
                              >
                                {ANOMALY_TYPE_LABELS[a.type]}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-amber-600">完成时间</p>
                        <p className="text-sm font-medium text-amber-800">
                          {batch.endTime ? formatDateTime(batch.endTime) : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-green-600">
                <CheckCircle className="w-12 h-12 mx-auto mb-2" />
                <p>所有批次均已品评</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-500" />
            各缸号批次统计
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 gap-4">
            {Object.entries(stats.batchesByTank).map(([tankNo, count]) => {
              const tankBatches = batches.filter(b => b.tankNo === tankNo);
              const avgRisk = Math.round(tankBatches.reduce((sum, b) => sum + b.riskLevel, 0) / count);
              const avgScore = tankBatches.filter(b => b.tastingNote).length > 0
                ? Math.round(tankBatches.filter(b => b.tastingNote).reduce((sum, b) => sum + (b.tastingNote?.score || 0), 0) / 
                  tankBatches.filter(b => b.tastingNote).length)
                : '-';
              
              return (
                <div key={tankNo} className="p-4 bg-amber-50 rounded-lg border border-amber-100 text-center">
                  <p className="text-lg font-bold text-amber-900">{tankNo}</p>
                  <p className="text-2xl font-bold text-amber-800 mt-1">{count}</p>
                  <p className="text-xs text-amber-600 mt-1">批次</p>
                  <div className="flex justify-center gap-2 mt-2 pt-2 border-t border-amber-100">
                    <div>
                      <p className="text-xs text-red-500">{avgRisk}</p>
                      <p className="text-xs text-amber-500">风险</p>
                    </div>
                    <div className="w-px bg-amber-200" />
                    <div>
                      <p className="text-xs text-green-600">{avgScore}</p>
                      <p className="text-xs text-amber-500">评分</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
