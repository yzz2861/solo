import React from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { ForecastData } from '../../types';
import { TrendingUp, Calendar } from 'lucide-react';
import { formatDate } from '../../utils/dateUtils';

interface ForecastChartProps {
  historicalData: { date: string; actual: number }[];
  forecastData: ForecastData;
  title?: string;
}

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
        <p className="text-sm font-medium text-gray-800 mb-2">{formatDate(label)}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4 text-sm">
            <span style={{ color: entry.color }} className="font-medium">
              {entry.name}
            </span>
            <span className="font-mono font-bold">{entry.value} 份</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const ForecastChart: React.FC<ForecastChartProps> = ({ 
  historicalData,
  forecastData,
  title = '销量预测'
}) => {
  const combinedData = [
    ...historicalData.map(d => ({
      date: d.date,
      actual: d.actual,
      forecast: null,
      lower: null,
      upper: null
    })),
    {
      date: forecastData.date,
      actual: null,
      forecast: forecastData.forecastQuantity,
      lower: forecastData.confidenceInterval.lower,
      upper: forecastData.confidenceInterval.upper
    }
  ];
  
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-indigo-500" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={combinedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#9C27B0" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#9C27B0" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12, fill: '#666' }}
                tickLine={false}
                axisLine={{ stroke: '#e0e0e0' }}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                }}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#666' }}
                tickLine={false}
                axisLine={{ stroke: '#e0e0e0' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                iconType="circle"
                wrapperStyle={{ paddingTop: '20px' }}
              />
              <ReferenceLine 
                x={forecastData.date} 
                stroke="#9C27B0" 
                strokeDasharray="5 5"
                strokeWidth={2}
                label={{ value: '预测日', position: 'top', fill: '#9C27B0', fontSize: 12 }}
              />
              <Area
                type="monotone"
                dataKey="upper"
                stroke="transparent"
                fill="url(#confidenceGradient)"
                name="置信区间上限"
              />
              <Area
                type="monotone"
                dataKey="lower"
                stroke="transparent"
                fill="#fff"
                name="置信区间下限"
              />
              <Bar
                dataKey="actual"
                name="实际销量"
                fill="#1976D2"
                radius={[4, 4, 0, 0]}
                barSize={30}
              />
              <Line
                type="monotone"
                dataKey="forecast"
                name="预测销量"
                stroke="#9C27B0"
                strokeWidth={3}
                dot={{ r: 6, fill: '#fff', strokeWidth: 3, stroke: '#9C27B0' }}
                activeDot={{ r: 8 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-indigo-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-xs text-gray-500 mb-1">
              <Calendar className="w-3 h-3" />
              预测日期
            </div>
            <div className="text-xl font-bold text-indigo-600">
              {formatDate(forecastData.date)}
            </div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-xs text-gray-500 mb-1">预测销量</div>
            <div className="text-2xl font-bold text-purple-600" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {forecastData.forecastQuantity}
            </div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-xs text-gray-500 mb-1">置信区间</div>
            <div className="text-xl font-bold text-blue-600" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {forecastData.confidenceInterval.lower} - {forecastData.confidenceInterval.upper}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
