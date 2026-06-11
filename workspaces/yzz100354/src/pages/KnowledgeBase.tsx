import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, BookOpen, Star, AlertTriangle, TrendingUp, Clock, Lightbulb, CheckCircle } from 'lucide-react';
import { useBatchStore } from '@/store/useBatchStore';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { BatchCard } from '@/components/BatchCard';
import { findSimilarBatches } from '@/utils/curveMatcher';
import { ANOMALY_TYPE_LABELS, ANOMALY_TYPE_COLORS } from '@/types';
import { formatDateTime } from '@/utils/timeParser';
import type { AnomalyType } from '@/types';

export default function KnowledgeBase() {
  const navigate = useNavigate();
  const { batches, setCurrentBatch } = useBatchStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [similarityResults, setSimilarityResults] = useState<{ batchId: string; similarity: number }[]>([]);
  const [anomalyFilter, setAnomalyFilter] = useState<AnomalyType | 'all'>('all');
  const [scoreFilter, setScoreFilter] = useState<'all' | 'good' | 'medium' | 'poor'>('all');

  const tastedBatches = useMemo(() => {
    return batches.filter(b => b.tastingNote);
  }, [batches]);

  const filteredBatches = useMemo(() => {
    return tastedBatches
      .filter(batch => {
        const matchesSearch = batch.batchNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
          batch.tankNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
          batch.tastingNote?.conclusion.toLowerCase().includes(searchQuery.toLowerCase()) ||
          batch.tastingNote?.treatment?.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesAnomaly = anomalyFilter === 'all' || 
          batch.anomalies.some(a => a.type === anomalyFilter);
        
        const matchesScore = scoreFilter === 'all' || 
          (scoreFilter === 'good' && (batch.tastingNote?.score || 0) >= 80) ||
          (scoreFilter === 'medium' && (batch.tastingNote?.score || 0) >= 60 && (batch.tastingNote?.score || 0) < 80) ||
          (scoreFilter === 'poor' && (batch.tastingNote?.score || 0) < 60);
        
        return matchesSearch && matchesAnomaly && matchesScore;
      })
      .sort((a, b) => (b.tastingNote?.score || 0) - (a.tastingNote?.score || 0));
  }, [tastedBatches, searchQuery, anomalyFilter, scoreFilter]);

  const handleSearchSimilar = (batchId: string) => {
    const targetBatch = batches.find(b => b.id === batchId);
    if (!targetBatch) return;
    
    setSelectedBatchId(batchId);
    setCurrentBatch(targetBatch);
    
    const similar = findSimilarBatches(
      targetBatch, 
      batches.filter(b => b.id !== batchId && b.tastingNote), 
      5
    );
    setSimilarityResults(similar);
  };

  const selectedBatch = selectedBatchId ? batches.find(b => b.id === selectedBatchId) : null;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-50 border-green-200';
    if (score >= 60) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  const bestPracticeBatches = useMemo(() => {
    return tastedBatches
      .filter(b => (b.tastingNote?.score || 0) >= 85)
      .sort((a, b) => (b.tastingNote?.score || 0) - (a.tastingNote?.score || 0))
      .slice(0, 3);
  }, [tastedBatches]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-amber-900">知识库</h1>
          <p className="text-amber-600 mt-1">基于历史批次的曲线匹配与经验沉淀</p>
        </div>
        <Badge variant="success">
          <BookOpen className="w-3 h-3 mr-1" />
          已沉淀 {tastedBatches.length} 条经验
        </Badge>
      </div>

      {bestPracticeBatches.length > 0 && (
        <Card className="bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-green-600" />
              最佳实践推荐
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {bestPracticeBatches.map(batch => (
                <div 
                  key={batch.id}
                  className="p-4 bg-white rounded-lg border border-green-100 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/batches/${batch.id}`)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-amber-900">{batch.batchNo}</span>
                    <Badge variant="success">
                      <Star className="w-3 h-3 mr-1 fill-current" />
                      {batch.tastingNote?.score}
                    </Badge>
                  </div>
                  <p className="text-sm text-amber-700 line-clamp-2">
                    {batch.tastingNote?.conclusion}
                  </p>
                  {batch.tastingNote?.treatment && (
                    <p className="text-xs text-green-600 mt-2 line-clamp-2">
                      💡 {batch.tastingNote.treatment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
              <input
                type="text"
                placeholder="搜索批次号、缸号、品评结论、处理措施..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-amber-500" />
              <select
                value={anomalyFilter}
                onChange={(e) => setAnomalyFilter(e.target.value as AnomalyType | 'all')}
                className="px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="all">全部异常</option>
                <option value="heating_too_fast">升温太快</option>
                <option value="low_temp_too_long">低温拖太久</option>
                <option value="feeding_no_response">补料无响应</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" />
              <select
                value={scoreFilter}
                onChange={(e) => setScoreFilter(e.target.value as 'all' | 'good' | 'medium' | 'poor')}
                className="px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="all">全部评分</option>
                <option value="good">优秀 (≥80)</option>
                <option value="medium">一般 (60-79)</option>
                <option value="poor">较差 ({"<"}60)</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-display font-bold text-amber-900">
              历史批次 ({filteredBatches.length})
            </h2>
          </div>
          
          {filteredBatches.length > 0 ? (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {filteredBatches.map(batch => {
                const score = batch.tastingNote?.score || 0;
                const isSelected = selectedBatchId === batch.id;
                
                return (
                  <div 
                    key={batch.id}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected 
                        ? 'ring-2 ring-green-400 border-green-300 bg-green-50' 
                        : 'border-amber-100 bg-white hover:border-amber-300 hover:shadow-sm'
                    }`}
                    onClick={() => handleSearchSimilar(batch.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-amber-900">{batch.batchNo}</span>
                          <Badge variant="amber" size="sm">{batch.tankNo}</Badge>
                          {batch.anomalies.length > 0 && (
                            <Badge variant="warning" size="sm">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              {batch.anomalies.length}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-amber-500 mb-2">
                          {formatDateTime(batch.startTime)}
                        </p>
                        <p className="text-sm text-amber-700 line-clamp-2">
                          {batch.tastingNote?.conclusion}
                        </p>
                        {batch.tastingNote?.treatment && (
                          <p className="text-xs text-green-600 mt-2 line-clamp-1">
                            处理：{batch.tastingNote.treatment}
                          </p>
                        )}
                        {batch.anomalies.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {[...new Set(batch.anomalies.map(a => a.type))].map(type => (
                              <span 
                                key={type}
                                className="text-xs px-2 py-0.5 rounded-full"
                                style={{ 
                                  backgroundColor: `${ANOMALY_TYPE_COLORS[type]}15`,
                                  color: ANOMALY_TYPE_COLORS[type]
                                }}
                              >
                                {ANOMALY_TYPE_LABELS[type]}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className={`text-center p-3 rounded-lg ${getScoreBg(score)}`}>
                        <p className={`text-2xl font-bold ${getScoreColor(score)}`}>{score}</p>
                        <p className="text-xs text-amber-500">评分</p>
                        <p className="text-xs text-amber-400 mt-1">
                          {batch.tastingNote?.author}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <BookOpen className="w-16 h-16 mx-auto text-amber-300 mb-4" />
                <p className="text-amber-700 font-medium">暂无匹配的经验记录</p>
                <p className="text-amber-500 text-sm mt-1">
                  {searchQuery ? '尝试调整搜索条件' : '请先为批次添加品评记录'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className={selectedBatch ? 'border-green-300' : ''}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                曲线匹配结果
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedBatch && similarityResults.length > 0 ? (
                <div className="space-y-4">
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm font-medium text-green-800">基准批次</p>
                    <p className="text-lg font-bold text-green-900">{selectedBatch.batchNo}</p>
                    <p className="text-xs text-green-600 mt-1">
                      {selectedBatch.tankNo} · 评分 {selectedBatch.tastingNote?.score}
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-sm text-amber-500">找到 {similarityResults.length} 个相似曲线</p>
                  </div>
                  
                  <div className="space-y-3">
                    {similarityResults.map(({ batchId, similarity }) => {
                      const similarBatch = batches.find(b => b.id === batchId);
                      if (!similarBatch) return null;
                      
                      return (
                        <div 
                          key={batchId}
                          className="p-3 bg-amber-50 rounded-lg border border-amber-100 hover:bg-amber-100 transition-colors cursor-pointer"
                          onClick={() => navigate(`/batches/${batchId}`)}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-amber-900">{similarBatch.batchNo}</span>
                                <Badge variant="amber" size="sm">{similarBatch.tankNo}</Badge>
                              </div>
                              <p className="text-xs text-amber-500 mt-1 line-clamp-1">
                                {similarBatch.tastingNote?.conclusion}
                              </p>
                              {similarBatch.tastingNote?.treatment && (
                                <p className="text-xs text-green-600 mt-1 line-clamp-1">
                                  💡 {similarBatch.tastingNote.treatment}
                                </p>
                              )}
                            </div>
                            <div className="text-center">
                              <div className="relative w-12 h-12">
                                <svg className="w-12 h-12 transform -rotate-90">
                                  <circle
                                    cx="24"
                                    cy="24"
                                    r="20"
                                    fill="none"
                                    stroke="#fef3c7"
                                    strokeWidth="4"
                                  />
                                  <circle
                                    cx="24"
                                    cy="24"
                                    r="20"
                                    fill="none"
                                    stroke="#22c55e"
                                    strokeWidth="4"
                                    strokeDasharray={`${similarity * 126} 126`}
                                    strokeLinecap="round"
                                  />
                                </svg>
                                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-green-600">
                                  {Math.round(similarity * 100)}
                                </span>
                              </div>
                              <p className="text-xs text-amber-500 mt-1">匹配度</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 mx-auto text-amber-300 mb-3" />
                  <p className="text-amber-600">选择一个批次</p>
                  <p className="text-amber-500 text-sm mt-1">查看曲线匹配结果</p>
                </div>
              )}
            </CardContent>
          </Card>

          {selectedBatch?.tastingNote?.treatment && (
            <Card className="border-green-300 bg-green-50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-green-600" />
                  当时的处理措施
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-green-800 leading-relaxed">
                  {selectedBatch.tastingNote.treatment}
                </p>
                <div className="mt-3 pt-3 border-t border-green-200">
                  <p className="text-xs text-green-600">
                    品评人：{selectedBatch.tastingNote.author}
                  </p>
                  <p className="text-xs text-green-500">
                    记录时间：{formatDateTime(new Date(selectedBatch.tastingNote.createdAt))}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedBatch && (
            <Button 
              className="w-full"
              onClick={() => navigate(`/batches/${selectedBatch.id}`)}
            >
              查看完整详情
            </Button>
          )}

          {similarityResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  相似批次推荐
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {similarityResults.slice(0, 3).map(({ batchId }) => {
                  const batch = batches.find(b => b.id === batchId);
                  if (!batch) return null;
                  return <BatchCard key={batchId} batch={batch} />;
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
