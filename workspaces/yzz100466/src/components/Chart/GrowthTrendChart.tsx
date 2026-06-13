import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Scatter,
} from 'recharts';
import { ChartDataPoint } from '../../types';
import { formatDateShort, formatWidth, formatTemperature } from '../../utils/format';

interface GrowthTrendChartProps {
  data: ChartDataPoint[];
  warningThreshold?: number;
  dangerThreshold?: number;
  height?: number;
}

export default function GrowthTrendChart({
  data,
  warningThreshold,
  dangerThreshold,
  height = 400,
}: GrowthTrendChartProps) {
  const customTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      const point = data.find((d) => d.date === label);
      return (
        <div className="bg-white p-3 border border-neutral-200 rounded shadow-lg">
          <p className="text-sm font-medium text-neutral-800 mb-2">{formatDateShort(label || '')}</p>
          {payload.map((entry, idx) => (
            <p key={idx} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: {entry.name.includes('宽度') ? formatWidth(entry.value) : entry.name.includes('温度') ? formatTemperature(entry.value) : entry.value.toFixed(3)}
            </p>
          ))}
          {point && (
            <p className="text-xs text-neutral-500 mt-1">
              温度: {formatTemperature(point.temperature)}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="date"
            tickFormatter={(value) => formatDateShort(value)}
            tick={{ fontSize: 12, fill: '#64748b' }}
            axisLine={{ stroke: '#cbd5e1' }}
            tickLine={{ stroke: '#cbd5e1' }}
          />
          <YAxis
            yAxisId="left"
            tickFormatter={(value) => `${value} mm`}
            tick={{ fontSize: 12, fill: '#64748b' }}
            axisLine={{ stroke: '#cbd5e1' }}
            tickLine={{ stroke: '#cbd5e1' }}
            label={{ value: '裂缝宽度 (mm)', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#64748b' } }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tickFormatter={(value) => `${value}℃`}
            tick={{ fontSize: 12, fill: '#64748b' }}
            axisLine={{ stroke: '#cbd5e1' }}
            tickLine={{ stroke: '#cbd5e1' }}
            label={{ value: '温度 (℃)', angle: 90, position: 'insideRight', style: { fontSize: 12, fill: '#64748b' } }}
          />
          <Tooltip content={customTooltip} />
          <Legend
            wrapperStyle={{ paddingTop: '10px' }}
            iconType="line"
          />
          
          {warningThreshold !== undefined && (
            <ReferenceLine
              yAxisId="left"
              y={warningThreshold}
              stroke="#f59e0b"
              strokeDasharray="5 5"
              label={{ value: `注意阈值 ${warningThreshold}mm`, fill: '#d97706', fontSize: 11, position: 'right' }}
            />
          )}
          {dangerThreshold !== undefined && (
            <ReferenceLine
              yAxisId="left"
              y={dangerThreshold}
              stroke="#dc2626"
              strokeDasharray="5 5"
              label={{ value: `封控阈值 ${dangerThreshold}mm`, fill: '#b91c1c', fontSize: 11, position: 'right' }}
            />
          )}
          
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="width"
            name="实测宽度"
            stroke="#1e40af"
            strokeWidth={2.5}
            dot={{ fill: '#1e40af', r: 4 }}
            activeDot={{ r: 6, stroke: '#1e40af', strokeWidth: 2, fill: '#fff' }}
          />
          
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="trend"
            name="趋势线"
            stroke="#64748b"
            strokeWidth={2}
            strokeDasharray="8 4"
            dot={false}
          />
          
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="temperature"
            name="环境温度"
            stroke="#f97316"
            strokeWidth={1.5}
            dot={{ fill: '#f97316', r: 3 }}
            opacity={0.6}
          />
          
          <Scatter dataKey="width" yAxisId="left" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
