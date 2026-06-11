import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, AlertTriangle, CheckCircle, Clock, Star, 
  Thermometer, Droplets, Calendar, Pin, TrendingUp, 
  TrendingDown, Zap, Search, Copy 
} from 'lucide-react';
import { useBatchStore } from '@/store/useBatchStore';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { FermentationChart } from '@/components/Chart/FermentationChart';
import { TastingForm } from '@/components/TastingForm';
import { BatchCard } from '@/components/BatchCard';
import type { AnomalySegment, InflectionPoint } from '@/types';
import { ANOMALY_TYPE_LABELS, ANOMALY_TYPE_COLORS, BATCH_STATUS_LABELS } from '@/types';
import { formatDateTime, formatDuration, formatTime } from '@/utils/timeParser';
import { formatBrix, formatTemperature } from '@/utils/unitConverter';
import { findSimilarBatches } from '@/utils/curveMatcher';

export default function BatchDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { batches, addTastingNote, markAnomalyReviewed } = useBatchStore();
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalySegment | null>(null);
  const [showSimilarBatches, setShowSimilarBatches] = useState(false);
  const [similarBatches, setSimilarBatches] = useState<{ batchId: string; similarity: number }[]>([]);

  const batch = batches.find(b => b.id === id);

  useEffect(() => {
    if (batch && showSimilarBatches) {
      const similar = findSimilarBatches(batch, batches.filter(b => b.id !== id), 3);
      setSimilarBatches(similar);
    }
  }, [batch, showSimilarBatches, batches]);

  if (!batch) {
    return (
      <div className="text-center py-12">
        <p className="text-amber-600">批次不存在</p>
        <Button onClick={() => navigate('/batches')} className="mt-4">
          返回批次列表
        </Button>
      </div>
    );
  }

  const endTime = batch.endTime || new Date();
  const duration = formatDuration(batch.startTime, endTime);
  
  const validTemps = batch.temperatureLogs.filter(l => !l.isBadRow);
  const validSugars = batch.sugarReadings.filter(r => !r.isBadRow);
  
  const avgTemp = validTemps.length > 0 
    ? validTemps.reduce((sum, l) => sum + l.temperature, 0) / validTemps.length 
    : 0;
  
  const minTemp = validTemps.length > 0 
    ? Math.min(...validTemps.map(l => l.temperature)) 
    : 0;
  
  const maxTemp = validTemps.length > 0 
    ? Math.max(...validTemps.map(l => l.temperature)) 
    : 0;

  const initialBrix = validSugars.length > 0 ? validSugars[0].brix : 0;
  const finalBrix = validSugars.length > 0 ? validSugars[validSugars.length - 1].brix : 0;
  const brixDrop = initialBrix - finalBrix;

  const handleReviewAnomaly = (anomalyId: string) => {
    if (batch) {
      markAnomalyReviewed(batch.id, anomalyId);
    }
  };

  const handleAddTastingNote = (note: Omit<import('@/types').TastingNote, 'id' | 'createdAt'>) => {
    if (batch) {
      addTastingNote(batch.id, note);
    }
  };

  const handleAnomalyClick = (anomaly: AnomalySegment) => {
    setSelectedAnomaly(anomaly);
  };

  const renderInflectionIcon = (type: InflectionPoint['type']) => {
    switch (type) {
      case 'peak':
        return <TrendingUp className="w-4 h-4 text-red-500" />;
      case 'valley':
        return <TrendingDown className="w-4 h-4 text-blue-500" />;
      case 'sudden_rise':
      case 'sudden_change':
        return <Zap className="w-4 h-4 text-orange-500" />;
      case 'sudden_drop':
        return <Zap className="w-4 h-4 text-cyan-500" />;
      default:
        return <Zap className="w-4 h-4 text-amber-500" />;
    }
  };

  const riskLevelColor = batch.riskLevel >= 70 ? 'text-red-600' 
    : batch.riskLevel >= 40 ? 'text-yellow-600' 
    : 'text-green-600';
  
  const riskLevelBg = batch.riskLevel >= 70 ? 'bg-red-50 border-red-200' 
    : batch.riskLevel >= 40 ? 'bg-yellow-50 border-yellow-200' 
    : 'bg-green-50 border-green-200';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/batches')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-display font-bold text-amber-900">
              {batch.batchNo}
            </h1>
            <Badge variant={batch.status === 'ongoing' ? 'info' : batch.status === 'tasted' ? 'success' : 'warning'}>
              {batch.status === 'ongoing' && <Clock className="w-3 h-3 mr-1" />}
              {batch.status === 'tasted' && <Star className="w-3 h-3 mr-1" />}
              {BATCH_STATUS_LABELS[batch.status]}
            </Badge>
          </div>
          <p className="text-amber-600 mt-1">{batch.tankNo}</p>
        </div>
        <Button 
          variant="secondary" 
          onClick={() => setShowSimilarBatches(!showSimilarBatches)}
        >
          <Search className="w-4 h-4 mr-2" />
          {showSimilarBatches ? '隐藏相似批次' : '查找相似批次'}
        </Button>
      </div>

      <div className="grid grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-amber-600 mb-1">
              <Calendar className="w-4 h-4" />
              开始时间
            </div>
            <p className="font-medium text-amber-900">{formatDateTime(batch.startTime)}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-amber-600 mb-1">
              <Clock className="w-4 h-4" />
              发酵时长
            </div>
            <p className="font-medium text-amber-900">{duration}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-red-600 mb-1">
              <Thermometer className="w-4 h-4" />
              平均温度
            </div>
            <p className="font-medium text-red-700">{formatTemperature(avgTemp)}</p>
            <p className="text-xs text-red-500 mt-1">
              {formatTemperature(minTemp)} ~ {formatTemperature(maxTemp)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-blue-600 mb-1">
              <Droplets className="w-4 h-4" />
              糖度变化
            </div>
            <p className="font-medium text-blue-700">
              {formatBrix(initialBrix)} → {formatBrix(finalBrix)}
            </p>
            <p className="text-xs text-blue-500 mt-1">
              下降 {formatBrix(brixDrop)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-orange-600 mb-1">
              <AlertTriangle className="w-4 h-4" />
              异常检测
            </div>
            <p className="font-medium text-orange-700">{batch.anomalies.length} 处</p>
            <p className="text-xs text-orange-500 mt-1">
              {batch.anomalies.filter(a => !a.reviewed).length} 待复核
            </p>
          </CardContent>
        </Card>
        
        <Card className={riskLevelBg}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600 mb-1">风险等级</p>
                <p className={`text-2xl font-bold ${riskLevelColor}`}>{batch.riskLevel}</p>
              </div>
              <div className="w-16 h-2 bg-amber-100 rounded-full overflow-hidden rotate-[-90deg]">
                <div 
                  className={`h-full rounded-full ${
                    batch.riskLevel >= 70 ? 'bg-red-500' 
                      : batch.riskLevel >= 40 ? 'bg-yellow-500' 
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${batch.riskLevel}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pin className="w-5 h-5 text-amber-500" />
            发酵曲线
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FermentationChart 
            batch={batch} 
            height={400}
            onAnomalyClick={handleAnomalyClick}
            selectedAnomalyId={selectedAnomaly?.id}
          />
          
          {batch.inflectionPoints && batch.inflectionPoints.length > 0 && (
            <div className="mt-4 pt-4 border-t border-amber-100">
              <h4 className="text-sm font-medium text-amber-700 mb-3">拐点分析</h4>
              <div className="flex flex-wrap gap-2">
                {batch.inflectionPoints.slice(0, 10).map((point, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-full text-sm"
                  >
                    {renderInflectionIcon(point.type)}
                    <span className="text-amber-700">{formatTime(point.timestamp)}</span>
                    <span className="text-amber-600">
                      {point.valueType === 'temperature' ? formatTemperature(point.value) : formatBrix(point.value)}
                    </span>
                    <span className="text-amber-400 text-xs">
                      {point.valueType === 'temperature' ? '°C' : 'Brix'}
                    </span>
                  </div>
                ))}
                {batch.inflectionPoints.length > 10 && (
                  <span className="px-3 py-1.5 text-amber-500 text-sm">
                    +{batch.inflectionPoints.length - 10} 更多
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          {batch.anomalies.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  异常片段
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {batch.anomalies.map(anomaly => (
                    <div 
                      key={anomaly.id}
                      className={`p-4 rounded-lg border transition-all cursor-pointer ${
                        selectedAnomaly?.id === anomaly.id 
                          ? 'ring-2 ring-amber-400' 
                          : ''
                      } ${
                        anomaly.reviewed 
                          ? 'bg-gray-50 border-gray-200' 
                          : `border-[${ANOMALY_TYPE_COLORS[anomaly.type]}40] bg-[${ANOMALY_TYPE_COLORS[anomaly.type]}08]`
                      }`}
                      style={{
                        backgroundColor: anomaly.reviewed 
                          ? undefined 
                          : `${ANOMALY_TYPE_COLORS[anomaly.type]}10`,
                        borderColor: anomaly.reviewed 
                          ? '#e5e7eb' 
                          : `${ANOMALY_TYPE_COLORS[anomaly.type]}40`
                      }}
                      onClick={() => handleAnomalyClick(anomaly)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <span 
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: ANOMALY_TYPE_COLORS[anomaly.type] }}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-amber-900">
                                {ANOMALY_TYPE_LABELS[anomaly.type]}
                              </span>
                              {anomaly.reviewed ? (
                                <Badge variant="success" size="sm">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  已复核
                                </Badge>
                              ) : (
                                <Badge variant="warning" size="sm">待复核</Badge>
                              )}
                            </div>
                            <p className="text-sm text-amber-600 mt-1">
                              {formatDateTime(anomaly.startTime)} → {formatTime(anomaly.endTime)}
                            </p>
                            <p className="text-sm text-amber-700 mt-1">{anomaly.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold" style={{ color: ANOMALY_TYPE_COLORS[anomaly.type] }}>
                            {anomaly.severity}
                          </p>
                          <p className="text-xs text-amber-500">严重程度</p>
                          {!anomaly.reviewed && (
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="mt-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReviewAnomaly(anomaly.id);
                              }}
                            >
                              标记已复核
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {batch.feedingRecords.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Pin className="w-5 h-5 text-amber-500" />
                  投料记录
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-amber-100">
                        <th className="text-left py-2 px-3 text-amber-600 font-medium">时间</th>
                        <th className="text-left py-2 px-3 text-amber-600 font-medium">类型</th>
                        <th className="text-left py-2 px-3 text-amber-600 font-medium">数量</th>
                        <th className="text-left py-2 px-3 text-amber-600 font-medium">备注</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batch.feedingRecords.filter(r => !r.isBadRow).map((record, idx) => (
                        <tr key={idx} className="border-b border-amber-50 hover:bg-amber-50">
                          <td className="py-2 px-3 text-amber-900">{formatDateTime(record.timestamp)}</td>
                          <td className="py-2 px-3">
                            <Badge variant="amber">{record.feedType}</Badge>
                          </td>
                          <td className="py-2 px-3 text-amber-900">{record.amount} {record.unit}</td>
                          <td className="py-2 px-3 text-amber-700">{record.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {showSimilarBatches && similarBatches.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5 text-green-500" />
                  相似历史批次
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-amber-600 mb-4">
                  基于曲线特征匹配找到以下相似批次，可参考当时的处理方案
                </p>
                <div className="space-y-3">
                  {similarBatches.map(({ batchId, similarity }) => {
                    const similarBatch = batches.find(b => b.id === batchId);
                    if (!similarBatch) return null;
                    return (
                      <div key={batchId} className="relative">
                        <div className="absolute -left-2 top-4 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                          {Math.round(similarity * 100)}%
                        </div>
                        <BatchCard batch={similarBatch} />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <TastingForm 
            batchId={batch.id}
            existingNote={batch.tastingNote}
            onSubmit={handleAddTastingNote}
          />

          {batch.sugarReadings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-blue-500" />
                  糖度记录
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {batch.sugarReadings.filter(r => !r.isBadRow).map((reading, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between py-2 border-b border-amber-50 last:border-0"
                    >
                      <div>
                        <p className="text-sm text-amber-900">{formatDateTime(reading.timestamp)}</p>
                        <p className="text-xs text-amber-500">
                          {reading.originalUnit !== 'brix' && `原数据: ${reading.originalValue}${reading.originalUnit}`}
                        </p>
                      </div>
                      <span className="font-medium text-blue-700">{formatBrix(reading.brix)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {batch.badRows && batch.badRows.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  待复核数据 ({batch.badRows.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {batch.badRows.map((row, idx) => (
                    <div 
                      key={idx} 
                      className="p-2 bg-yellow-50 rounded border border-yellow-200 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-yellow-800 font-medium">{row.source}</span>
                        <span className="text-yellow-600">#{row.lineNumber}</span>
                      </div>
                      <p className="text-yellow-700 mt-1 truncate">{row.rawData}</p>
                      <p className="text-yellow-600 mt-1">{row.error}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-4">
              <h4 className="text-sm font-medium text-amber-700 mb-3">快捷操作</h4>
              <div className="space-y-2">
                <Button variant="ghost" className="w-full justify-start">
                  <Copy className="w-4 h-4 mr-2" />
                  复制批次信息
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  <Search className="w-4 h-4 mr-2" />
                  搜索同缸号批次
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
