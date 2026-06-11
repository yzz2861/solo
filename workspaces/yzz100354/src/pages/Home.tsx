import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, List, BarChart3, Database, AlertTriangle, CheckCircle, Clock, FlaskConical, Plus } from 'lucide-react';
import { useBatchStore } from '@/store/useBatchStore';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { BatchCard } from '@/components/BatchCard';
import { ANOMALY_TYPE_LABELS } from '@/types';
import { formatDateTime } from '@/utils/timeParser';

export default function Home() {
  const navigate = useNavigate();
  const { batches, loadSampleData } = useBatchStore();

  useEffect(() => {
    if (batches.length === 0) {
      loadSampleData();
    }
  }, [batches.length, loadSampleData]);

  const totalBatches = batches.length;
  const ongoingBatches = batches.filter(b => b.status === 'ongoing').length;
  const highRiskBatches = batches.filter(b => b.riskLevel >= 70).length;
  const tastedBatches = batches.filter(b => b.status === 'tasted').length;
  
  const avgScore = tastedBatches > 0
    ? Math.round(batches.filter(b => b.tastingNote).reduce((sum, b) => sum + (b.tastingNote?.score || 0), 0) / tastedBatches)
    : 0;

  const unreviewedAnomalies = batches.reduce(
    (sum, b) => sum + b.anomalies.filter(a => !a.reviewed).length, 0
  );

  const recentBatches = [...batches]
    .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
    .slice(0, 3);

  const highRiskList = batches
    .filter(b => b.riskLevel >= 50)
    .sort((a, b) => b.riskLevel - a.riskLevel)
    .slice(0, 3);

  const quickActions = [
    { icon: Upload, label: '导入数据', path: '/import', color: 'text-brand-600 bg-brand-50 hover:bg-brand-100' },
    { icon: List, label: '批次列表', path: '/batches', color: 'text-blue-600 bg-blue-50 hover:bg-blue-100' },
    { icon: BarChart3, label: '风险报告', path: '/report', color: 'text-red-600 bg-red-50 hover:bg-red-100' },
    { icon: Database, label: '知识库', path: '/knowledge', color: 'text-green-600 bg-green-50 hover:bg-green-100' },
  ];

  const anomalyStats = batches.reduce((acc, batch) => {
    batch.anomalies.forEach(a => {
      acc[a.type] = (acc[a.type] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 rounded-2xl p-6 border border-amber-100">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-amber-900">
              发酵温控批次分析
            </h1>
            <p className="text-amber-600 mt-2 max-w-xl">
              整合温度日志、糖度记录与投料数据，自动检测温控异常，辅助酿酒师精准把控发酵过程
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => navigate('/import')}>
              <Plus className="w-4 h-4 mr-2" />
              导入数据
            </Button>
            <Button variant="secondary" onClick={() => loadSampleData()}>
              加载示例
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600">总批次</p>
                <p className="text-3xl font-bold text-amber-900 mt-1">{totalBatches}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <FlaskConical className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">发酵中</p>
                <p className="text-3xl font-bold text-blue-700 mt-1">{ongoingBatches}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600 animate-pulse" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600">高风险</p>
                <p className="text-3xl font-bold text-red-700 mt-1">{highRiskBatches}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
            {unreviewedAnomalies > 0 && (
              <Badge variant="danger" className="mt-3">
                {unreviewedAnomalies} 处异常待复核
              </Badge>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">平均评分</p>
                <p className="text-3xl font-bold text-green-700 mt-1">{avgScore}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.path}
              onClick={() => navigate(action.path)}
              className={`flex items-center gap-3 p-4 rounded-xl border transition-all duration-200 ${action.color}`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{action.label}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-bold text-amber-900">最近批次</h2>
            <button 
              onClick={() => navigate('/batches')}
              className="text-sm text-amber-600 hover:text-amber-800"
            >
              查看全部 →
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {recentBatches.map(batch => (
              <BatchCard key={batch.id} batch={batch} />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-5">
              <h3 className="text-lg font-display font-bold text-amber-900 mb-4">异常分布</h3>
              <div className="space-y-3">
                {Object.entries(anomalyStats).length > 0 ? (
                  Object.entries(anomalyStats).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm text-amber-700">
                        {ANOMALY_TYPE_LABELS[type as keyof typeof ANOMALY_TYPE_LABELS]}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-amber-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-amber-500 rounded-full"
                            style={{ width: `${(count / (Object.values(anomalyStats).reduce((a, b) => a + b, 0))) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-amber-900 w-8">{count}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-amber-500">暂无异常记录</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h3 className="text-lg font-display font-bold text-amber-900 mb-4">高风险批次</h3>
              {highRiskList.length > 0 ? (
                <div className="space-y-3">
                  {highRiskList.map(batch => (
                    <button
                      key={batch.id}
                      onClick={() => navigate(`/batches/${batch.id}`)}
                      className="w-full p-3 rounded-lg bg-red-50 border border-red-100 hover:bg-red-100 transition-colors text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-red-800">{batch.batchNo}</p>
                          <p className="text-xs text-red-600">{batch.tankNo}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-red-600">{batch.riskLevel}</p>
                          <p className="text-xs text-red-500">风险值</p>
                        </div>
                      </div>
                      <p className="text-xs text-red-600 mt-1">
                        {formatDateTime(batch.startTime)}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-green-600">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2" />
                  <p>暂无高风险批次</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}