import React from 'react';
import { Thermometer, Droplets, Calendar, AlertTriangle, CheckCircle, Clock, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import type { FermentationBatch } from '@/types';
import { BATCH_STATUS_LABELS, ANOMALY_TYPE_COLORS, ANOMALY_TYPE_LABELS } from '@/types';
import { formatDateTime, formatDuration } from '@/utils/timeParser';
import { formatBrix, formatTemperature } from '@/utils/unitConverter';

interface BatchCardProps {
  batch: FermentationBatch;
  onClick?: () => void;
}

export const BatchCard: React.FC<BatchCardProps> = ({ batch, onClick }) => {
  const navigate = useNavigate();
  
  const avgTemp = batch.temperatureLogs.length > 0
    ? batch.temperatureLogs.filter(l => !l.isBadRow).reduce((sum, l) => sum + l.temperature, 0) / 
      batch.temperatureLogs.filter(l => !l.isBadRow).length
    : 0;
  
  const finalBrix = batch.sugarReadings.length > 0
    ? batch.sugarReadings.filter(r => !r.isBadRow)[batch.sugarReadings.filter(r => !r.isBadRow).length - 1]?.brix || 0
    : 0;
  
  const anomalyTypes = [...new Set(batch.anomalies.map(a => a.type))];
  const unreviewedCount = batch.anomalies.filter(a => !a.reviewed).length;
  
  const riskLevelColor = batch.riskLevel >= 70 ? 'text-red-600' 
    : batch.riskLevel >= 40 ? 'text-yellow-600' 
    : 'text-green-600';
  
  const riskLevelBg = batch.riskLevel >= 70 ? 'bg-red-50 border-red-200' 
    : batch.riskLevel >= 40 ? 'bg-yellow-50 border-yellow-200' 
    : 'bg-green-50 border-green-200';

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(`/batches/${batch.id}`);
    }
  };

  const endTime = batch.endTime || new Date();
  const duration = formatDuration(batch.startTime, endTime);

  return (
    <Card 
      hover 
      className={cn(
        'cursor-pointer transition-all duration-300',
        unreviewedCount > 0 && 'ring-2 ring-red-200'
      )}
      onClick={handleClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl">{batch.batchNo}</CardTitle>
            <p className="text-sm text-amber-600 mt-1">{batch.tankNo}</p>
          </div>
          <div className="text-right">
            <Badge variant={batch.status === 'ongoing' ? 'info' : batch.status === 'tasted' ? 'success' : 'warning'}>
              {batch.status === 'ongoing' && <Clock className="w-3 h-3 mr-1" />}
              {batch.status === 'tasted' && <Star className="w-3 h-3 mr-1" />}
              {BATCH_STATUS_LABELS[batch.status]}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Thermometer className="w-4 h-4 text-red-500" />
            <span className="text-amber-700">平均温度</span>
            <span className="ml-auto font-medium text-amber-900">{formatTemperature(avgTemp)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Droplets className="w-4 h-4 text-blue-500" />
            <span className="text-amber-700">最终糖度</span>
            <span className="ml-auto font-medium text-amber-900">{formatBrix(finalBrix)}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-amber-500" />
          <span className="text-amber-700">{formatDateTime(batch.startTime)}</span>
          <span className="text-amber-400">→</span>
          <span className="text-amber-700">{batch.endTime ? formatDateTime(batch.endTime) : '进行中'}</span>
          <span className="ml-auto text-xs text-amber-500">({duration})</span>
        </div>
        
        {anomalyTypes.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              <span className="text-sm text-amber-700">异常检测</span>
              <span className="ml-auto text-sm font-medium text-red-600">
                {batch.anomalies.length} 处
                {unreviewedCount > 0 && ` (${unreviewedCount} 待复核)`}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {anomalyTypes.map(type => (
                <span 
                  key={type}
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ 
                    backgroundColor: `${ANOMALY_TYPE_COLORS[type]}15`, 
                    color: ANOMALY_TYPE_COLORS[type] 
                  }}
                >
                  {ANOMALY_TYPE_LABELS[type]}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {batch.tastingNote && (
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-100">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-green-800">已品评</p>
              <p className="text-xs text-green-600 truncate">{batch.tastingNote.conclusion}</p>
            </div>
            <div className="text-right">
              <span className={cn('text-lg font-bold', riskLevelColor)}>{batch.tastingNote.score}</span>
              <span className="text-xs text-green-600">/100</span>
            </div>
          </div>
        )}
        
        <div className={cn(
          'flex items-center justify-between p-3 rounded-lg border',
          riskLevelBg
        )}>
          <span className="text-sm font-medium text-amber-800">风险等级</span>
          <div className="flex items-center gap-3">
            <div className="w-32 h-2 bg-amber-100 rounded-full overflow-hidden">
              <div 
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  batch.riskLevel >= 70 ? 'bg-red-500' 
                    : batch.riskLevel >= 40 ? 'bg-yellow-500' 
                    : 'bg-green-500'
                )}
                style={{ width: `${batch.riskLevel}%` }}
              />
            </div>
            <span className={cn('font-bold', riskLevelColor)}>{batch.riskLevel}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
