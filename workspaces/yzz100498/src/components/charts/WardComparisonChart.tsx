import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Building2 } from 'lucide-react';

interface WardDataPoint {
  wardId: string;
  wardName: string;
  total: number;
  refunds: number;
  variance?: number;
}

interface WardComparisonChartProps {
  data: WardDataPoint[];
  title?: string;
}

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
        <p className="text-sm font-medium text-gray-800 mb-2">{data.wardName}</p>
        <div className="space-y-1">
          <div className="flex justify-between gap-4 text-sm">
            <span className="text-gray-500">净销量</span>
            <span className="font-mono font-bold text-blue-600">{data.total} 份</span>
          </div>
          <div className="flex justify-between gap-4 text-sm">
            <span className="text-gray-500">退餐数</span>
            <span className="font-mono font-bold text-red-500">{data.refunds} 份</span>
          </div>
          {data.variance !== undefined && (
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-gray-500">与报餐差值</span>
              <span className={`font-mono font-bold ${data.variance >= 0 ? 'text-green-600' : 'text-orange-500'}`}>
                {data.variance >= 0 ? '+' : ''}{data.variance} 份
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

const getBarColor = (index: number) => {
  const colors = [
    '#1976D2', '#2196F3', '#4CAF50', '#8BC34A',
    '#FF9800', '#FF5722', '#9C27B0', '#E91E63'
  ];
  return colors[index % colors.length];
};

export const WardComparisonChart: React.FC<WardComparisonChartProps> = ({ 
  data, 
  title = '各病区销量对比'
}) => {
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-green-500" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={data} 
              margin={{ top: 10, right: 30, left: 0, bottom: 50 }}
              barCategoryGap="20%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis 
                dataKey="wardName" 
                tick={{ fontSize: 11, fill: '#666' }}
                tickLine={false}
                axisLine={{ stroke: '#e0e0e0' }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#666' }}
                tickLine={false}
                axisLine={{ stroke: '#e0e0e0' }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f5f5f5' }} />
              <Legend 
                iconType="rect"
                wrapperStyle={{ paddingTop: '20px' }}
              />
              <Bar dataKey="total" name="净销量" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(index)} />
                ))}
              </Bar>
              <Bar dataKey="refunds" name="退餐数" fill="#f44336" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-xs text-gray-500 mb-1">总销量</div>
            <div className="text-2xl font-bold text-blue-600" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {data.reduce((sum, d) => sum + d.total, 0)}
            </div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-xs text-gray-500 mb-1">总退餐</div>
            <div className="text-2xl font-bold text-red-500" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {data.reduce((sum, d) => sum + d.refunds, 0)}
            </div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-xs text-gray-500 mb-1">平均销量</div>
            <div className="text-2xl font-bold text-green-600" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {data.length > 0 ? Math.round(data.reduce((sum, d) => sum + d.total, 0) / data.length) : 0}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
