import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { AlertTriangle } from 'lucide-react';
import { RISK_COLORS, RISK_LABELS } from '../../types';
import { PreparationSuggestion } from '../../types';
import { cn } from '../../lib/utils';

interface RiskMatrixChartProps {
  data: PreparationSuggestion[];
  title?: string;
}

const RiskCell: React.FC<{
  x: number;
  y: number;
  count: number;
  items: PreparationSuggestion[];
}> = ({ x, y, count, items }) => {
  const wasteLevel = x === 0 ? 'low' : x === 1 ? 'medium' : 'high';
  const shortageLevel = y === 0 ? 'low' : y === 1 ? 'medium' : 'high';
  const overallRisk = Math.max(x, y);
  const color = overallRisk === 0 ? 'low' : overallRisk === 1 ? 'medium' : 'high';
  
  return (
    <div 
      className={cn(
        'aspect-square rounded-lg flex flex-col items-center justify-center p-2 transition-all cursor-pointer hover:scale-105 hover:shadow-lg',
        count === 0 ? 'bg-gray-50 border-2 border-dashed border-gray-200' : 'shadow-md'
      )}
      style={count > 0 ? { backgroundColor: RISK_COLORS[color as keyof typeof RISK_COLORS] + '40' } : {}}
    >
      {count > 0 ? (
        <>
          <span 
            className="text-2xl font-bold" 
            style={{ color: RISK_COLORS[color as keyof typeof RISK_COLORS], fontFamily: 'JetBrains Mono, monospace' }}
          >
            {count}
          </span>
          <span className="text-xs text-gray-600 mt-1">{items.length} 个病区</span>
          <div className="text-xs text-gray-500 mt-1">
            <span>浪费{RISK_LABELS[wasteLevel as keyof typeof RISK_LABELS]}</span>
            <span className="mx-1">·</span>
            <span>缺餐{RISK_LABELS[shortageLevel as keyof typeof RISK_LABELS]}</span>
          </div>
        </>
      ) : (
        <span className="text-gray-400 text-sm">无数据</span>
      )}
    </div>
  );
};

export const RiskMatrixChart: React.FC<RiskMatrixChartProps> = ({ 
  data, 
  title = '风险矩阵分布'
}) => {
  const matrix: PreparationSuggestion[][][] = Array(3).fill(null).map(() => 
    Array(3).fill(null).map(() => [])
  );
  
  data.forEach(item => {
    const x = item.wasteRisk === 'low' ? 0 : item.wasteRisk === 'medium' ? 1 : 2;
    const y = item.shortageRisk === 'low' ? 0 : item.shortageRisk === 'medium' ? 1 : 2;
    matrix[x][y].push(item);
  });
  
  const highRiskCount = data.filter(d => d.wasteRisk === 'high' || d.shortageRisk === 'high').length;
  const mediumRiskCount = data.filter(d => d.wasteRisk === 'medium' || d.shortageRisk === 'medium').length;
  const lowRiskCount = data.filter(d => d.wasteRisk === 'low' && d.shortageRisk === 'low').length;
  
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">缺餐风险 →</span>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div className="flex flex-col justify-between py-2">
              <span className="text-xs text-gray-500 text-right">低</span>
              <span className="text-xs text-gray-500 text-right">中</span>
              <span className="text-xs text-gray-500 text-right">高</span>
            </div>
            <div className="col-span-3 grid grid-cols-3 gap-2">
              {[0, 1, 2].map(y => (
                [0, 1, 2].map(x => (
                  <RiskCell
                    key={`${x}-${y}`}
                    x={x}
                    y={y}
                    count={matrix[x][y].length}
                    items={matrix[x][y]}
                  />
                ))
              ))}
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 mt-3 ml-[calc(25%+6px)]">
            <span className="text-xs text-gray-500">低</span>
            <div className="flex-1 h-1 bg-gradient-to-r from-green-200 via-yellow-200 to-red-200 rounded-full"></div>
            <span className="text-xs text-gray-500">高</span>
          </div>
          <div className="text-center text-sm text-gray-500 mt-1 ml-[calc(25%+6px)]">
            浪费风险
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="text-center p-3 bg-green-50 rounded-lg border border-green-100">
            <div className="text-xs text-gray-500 mb-1">低风险</div>
            <div className="text-2xl font-bold text-green-600" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {lowRiskCount}
            </div>
            <div className="text-xs text-gray-500 mt-1">风险可控</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-100">
            <div className="text-xs text-gray-500 mb-1">中风险</div>
            <div className="text-2xl font-bold text-yellow-600" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {mediumRiskCount}
            </div>
            <div className="text-xs text-gray-500 mt-1">需要关注</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg border border-red-100">
            <div className="text-xs text-gray-500 mb-1">高风险</div>
            <div className="text-2xl font-bold text-red-600" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {highRiskCount}
            </div>
            <div className="text-xs text-gray-500 mt-1">紧急处理</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
