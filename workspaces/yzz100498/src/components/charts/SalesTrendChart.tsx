import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { MEAL_TYPE_LABELS, MealType } from '../../types';
import { formatDate } from '../../utils/dateUtils';
import { TrendingUp } from 'lucide-react';

interface ChartDataPoint {
  date: string;
  breakfast: number;
  lunch: number;
  dinner: number;
  supper: number;
}

interface SalesTrendChartProps {
  data: ChartDataPoint[];
  title?: string;
  showArea?: boolean;
}

const mealColors: Record<MealType, string> = {
  breakfast: '#FF9800',
  lunch: '#4CAF50',
  dinner: '#2196F3',
  supper: '#9C27B0'
};

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

export const SalesTrendChart: React.FC<SalesTrendChartProps> = ({ 
  data, 
  title = '销量趋势',
  showArea = false
}) => {
  const ChartComponent = showArea ? AreaChart : LineChart;
  const DataComponent = showArea ? Area : Line;
  
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-500" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ChartComponent data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                {Object.entries(mealColors).map(([type, color]) => (
                  <linearGradient key={type} id={`color${type}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={color} stopOpacity={0}/>
                  </linearGradient>
                ))}
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
              {(Object.keys(MEAL_TYPE_LABELS) as MealType[]).map(type => (
                <DataComponent
                  key={type}
                  type="monotone"
                  dataKey={type}
                  name={MEAL_TYPE_LABELS[type]}
                  stroke={mealColors[type]}
                  fill={showArea ? `url(#color${type})` : undefined}
                  strokeWidth={2}
                  dot={{ r: 3, strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </ChartComponent>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 grid grid-cols-4 gap-4">
          {(Object.keys(MEAL_TYPE_LABELS) as MealType[]).map(type => {
            const total = data.reduce((sum, d) => sum + (d[type] || 0), 0);
            const avg = data.length > 0 ? Math.round(total / data.length) : 0;
            return (
              <div key={type} className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">{MEAL_TYPE_LABELS[type]}日均</div>
                <div 
                  className="text-2xl font-bold" 
                  style={{ color: mealColors[type], fontFamily: 'JetBrains Mono, monospace' }}
                >
                  {avg}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
