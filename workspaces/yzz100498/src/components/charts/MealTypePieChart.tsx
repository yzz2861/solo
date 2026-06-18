import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { PieChart as PieChartIcon } from 'lucide-react';

interface MealTypeData {
  name: string;
  value: number;
}

interface MealTypePieChartProps {
  data: MealTypeData[];
  title?: string;
}

const COLORS = ['#FF9800', '#4CAF50', '#2196F3', '#9C27B0'];

const CustomTooltip: React.FC<any> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const total = payload.reduce((sum: number, p: any) => sum + p.payload.value, 0);
    const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : 0;
    
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
        <p className="text-sm font-medium text-gray-800 mb-1">{data.name}</p>
        <div className="flex items-center gap-2">
          <span 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: data.color }}
          ></span>
          <span className="font-mono font-bold">{data.value} 份</span>
          <span className="text-gray-500 text-sm">({percentage}%)</span>
        </div>
      </div>
    );
  }
  return null;
};

const renderCustomizedLabel = ({ 
  cx, cy, midAngle, innerRadius, outerRadius, percent 
}: any) => {
  if (percent < 0.05) return null;
  
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor="middle" 
      dominantBaseline="central"
      fontSize={12}
      fontWeight="bold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export const MealTypePieChart: React.FC<MealTypePieChartProps> = ({ 
  data, 
  title = '餐次占比'
}) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <PieChartIcon className="w-5 h-5 text-purple-500" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={100}
                innerRadius={50}
                paddingAngle={3}
                dataKey="value"
                animationBegin={0}
                animationDuration={800}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]}
                    stroke="white"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="bottom"
                height={36}
                iconType="circle"
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">总订餐量</span>
            <span 
              className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              {total}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
