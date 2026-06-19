import { Clock, AlertTriangle, Package, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { SlowRoomAnalysis } from '@/types';
import { formatDuration } from '@/utils/timeUtils';

interface CleaningAnalysisProps {
  analysis: SlowRoomAnalysis[];
}

export default function CleaningAnalysis({ analysis }: CleaningAnalysisProps) {
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);

  const getComplexityLabel = (complexity: string) => {
    const map: Record<string, string> = {
      simple: '简单',
      medium: '中等',
      complex: '复杂',
    };
    return map[complexity] || complexity;
  };

  const getComplexityColor = (complexity: string) => {
    const map: Record<string, string> = {
      simple: 'bg-green-100 text-green-700',
      medium: 'bg-yellow-100 text-yellow-700',
      complex: 'bg-red-100 text-red-700',
    };
    return map[complexity] || 'bg-gray-100 text-gray-700';
  };

  if (analysis.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">暂无足够数据进行清台效率分析</p>
        <p className="text-sm text-gray-400 mt-1">需要至少2条已完成的清台记录</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className="p-2 bg-amber-100 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h3 className="font-bold text-gray-800">清台慢包间复盘</h3>
          <p className="text-sm text-gray-500">分析清台效率，判断是套餐复杂还是人手不足</p>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {analysis.map((room) => (
          <div key={room.roomId}>
            <button
              onClick={() => setExpandedRoom(expandedRoom === room.roomId ? null : room.roomId)}
              className="w-full px-6 py-4 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <h4 className="font-medium text-gray-800">{room.roomName}</h4>
                    <p className="text-sm text-gray-500">
                      标准 {formatDuration(room.standardDuration)} · 样本 {room.sampleCount} 次
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-800">
                      {formatDuration(room.avgCleaningTime)}
                    </p>
                    <p className="text-sm text-red-500">
                      慢 {((room.slowRatio - 1) * 100).toFixed(0)}%
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {room.isLikelyPackageIssue && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                        <Package className="w-3 h-3" />
                        套餐复杂
                      </span>
                    )}
                    {room.isLikelyStaffIssue && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                        <Users className="w-3 h-3" />
                        人手问题
                      </span>
                    )}
                  </div>

                  {expandedRoom === room.roomId ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>
            </button>

            {expandedRoom === room.roomId && (
              <div className="px-6 pb-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <h5 className="text-sm font-medium text-gray-700 mb-3">套餐明细</h5>
                  <div className="space-y-2">
                    {room.packageBreakdown.map((pkg, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between py-2 px-3 bg-white rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${getComplexityColor(pkg.complexity)}`}>
                            {getComplexityLabel(pkg.complexity)}
                          </span>
                          <span className="text-gray-700">{pkg.packageName}</span>
                          <span className="text-sm text-gray-400">{pkg.count}次</span>
                        </div>
                        <span className="font-medium text-gray-800">
                          平均 {formatDuration(pkg.avgCleaningTime)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-100">
                    <p className="text-sm text-amber-700">
                      <strong>分析结论：</strong>
                      {room.isLikelyPackageIssue
                        ? '该包间清台慢主要受复杂套餐影响，建议优化复杂套餐的清台流程或为复杂套餐预留更多准备时间。'
                        : room.isLikelyStaffIssue
                        ? '该包间清台慢与套餐复杂度关联不大，可能是人手分配问题，建议高峰期增加该区域保洁人员。'
                        : '数据样本较少，建议积累更多数据后再做判断。'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
