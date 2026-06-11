import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, AlertTriangle, Clock, CheckCircle, FlaskConical, ArrowUpDown } from 'lucide-react';
import { useBatchStore } from '@/store/useBatchStore';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { BatchCard } from '@/components/BatchCard';
import type { BatchStatus, AnomalyType } from '@/types';
import { BATCH_STATUS_LABELS, ANOMALY_TYPE_LABELS } from '@/types';

type SortField = 'startTime' | 'riskLevel' | 'temperatureCount';
type SortOrder = 'asc' | 'desc';

export default function BatchList() {
  const navigate = useNavigate();
  const { batches } = useBatchStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<BatchStatus | 'all'>('all');
  const [tankFilter, setTankFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('startTime');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [anomalyFilter, setAnomalyFilter] = useState<AnomalyType | 'all'>('all');

  const tankNos = [...new Set(batches.map(b => b.tankNo))];
  
  const anomalyTypes: (AnomalyType | 'all')[] = ['all', 'heating_too_fast', 'low_temp_too_long', 'feeding_no_response'];

  const filteredBatches = batches
    .filter(batch => {
      const matchesSearch = batch.batchNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        batch.tankNo.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || batch.status === statusFilter;
      const matchesTank = tankFilter === 'all' || batch.tankNo === tankFilter;
      const matchesAnomaly = anomalyFilter === 'all' || 
        batch.anomalies.some(a => a.type === anomalyFilter);
      
      return matchesSearch && matchesStatus && matchesTank && matchesAnomaly;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'startTime':
          comparison = a.startTime.getTime() - b.startTime.getTime();
          break;
        case 'riskLevel':
          comparison = a.riskLevel - b.riskLevel;
          break;
        case 'temperatureCount':
          comparison = a.temperatureLogs.length - b.temperatureLogs.length;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const statusCounts = batches.reduce((acc, batch) => {
    acc[batch.status] = (acc[batch.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const unreviewedCount = batches.reduce(
    (sum, b) => sum + b.anomalies.filter(a => !a.reviewed).length, 0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-amber-900">批次管理</h1>
          <p className="text-amber-600 mt-1">
            共 {batches.length} 个批次，{unreviewedCount} 处异常待复核
          </p>
        </div>
        <Button onClick={() => navigate('/import')}>
          <FlaskConical className="w-4 h-4 mr-2" />
          新增批次
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {(['all', 'ongoing', 'completed', 'tasted'] as const).map(status => {
          const count = status === 'all' ? batches.length : (statusCounts[status] || 0);
          const Icon = status === 'ongoing' ? Clock : status === 'tasted' ? CheckCircle : AlertTriangle;
          const variant = status === 'ongoing' ? 'info' : status === 'tasted' ? 'success' : status === 'completed' ? 'warning' : 'amber';
          
          return (
            <Card key={status} className={statusFilter === status ? 'ring-2 ring-amber-400' : ''}>
              <CardContent className="p-4">
                <button
                  onClick={() => setStatusFilter(status)}
                  className="w-full text-left"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-amber-600">
                        {status === 'all' ? '全部批次' : BATCH_STATUS_LABELS[status]}
                      </p>
                      <p className="text-2xl font-bold text-amber-900">{count}</p>
                    </div>
                    <Badge variant={variant}>
                      <Icon className="w-3 h-3 mr-1" />
                      {count}
                    </Badge>
                  </div>
                </button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
              <input
                type="text"
                placeholder="搜索批次号或缸号..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-amber-500" />
              <select
                value={tankFilter}
                onChange={(e) => setTankFilter(e.target.value)}
                className="px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="all">全部缸号</option>
                {tankNos.map(tank => (
                  <option key={tank} value={tank}>{tank}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <select
                value={anomalyFilter}
                onChange={(e) => setAnomalyFilter(e.target.value as AnomalyType | 'all')}
                className="px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                {anomalyTypes.map(type => (
                  <option key={type} value={type}>
                    {type === 'all' ? '全部异常' : ANOMALY_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-amber-500" />
              <button
                onClick={() => handleSort('startTime')}
                className={`px-3 py-2 rounded-lg border transition-colors ${
                  sortField === 'startTime' ? 'bg-amber-100 border-amber-300' : 'border-amber-200 hover:bg-amber-50'
                }`}
              >
                时间 {sortField === 'startTime' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
              <button
                onClick={() => handleSort('riskLevel')}
                className={`px-3 py-2 rounded-lg border transition-colors ${
                  sortField === 'riskLevel' ? 'bg-amber-100 border-amber-300' : 'border-amber-200 hover:bg-amber-50'
                }`}
              >
                风险 {sortField === 'riskLevel' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {filteredBatches.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBatches.map(batch => (
            <BatchCard key={batch.id} batch={batch} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <FlaskConical className="w-16 h-16 mx-auto text-amber-300 mb-4" />
            <p className="text-amber-700 font-medium">暂无符合条件的批次</p>
            <p className="text-amber-500 text-sm mt-1">尝试调整筛选条件或导入新数据</p>
            <Button className="mt-4" onClick={() => navigate('/import')}>
              导入数据
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
