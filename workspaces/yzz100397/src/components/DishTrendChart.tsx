import { useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
  Legend,
} from 'recharts';
import type { WasteAnalysis, DailyRecord, Dish } from '@/types';
import { toKg } from '@/utils/analytics';

interface Props {
  dish: Dish;
  wasteData: WasteAnalysis[];
  dailyRecords: DailyRecord[];
}

export default function DishTrendChart({ dish, wasteData, dailyRecords }: Props) {
  const chartData = useMemo(() => {
    const dishWastes = wasteData
      .filter(w => w.dishId === dish.id)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14);

    return dishWastes.map(w => {
      const daily = dailyRecords.find(d => d.date === w.date);
      const dishRec = daily?.dishRecords.find(r => r.dishId === dish.id);
      const prepKg = dishRec ? toKg(dishRec.preparedQty, dishRec.preparedUnit, dish) : 0;

      return {
        date: w.date.slice(5),
        fullDate: w.date,
        备餐量: Number(prepKg.toFixed(2)),
        浪费量: Number(w.wastedKg.toFixed(2)),
        浪费率: Number(w.wasteRate.toFixed(1)),
        isRainy: daily?.weather === 'rainy' || daily?.weather === 'snowy',
        hasGroup: daily && daily.groupGuests > 0,
        specialNote: daily?.specialNote,
        isEstimated: w.isEstimated,
      };
    });
  }, [dish, wasteData, dailyRecords]);

  if (chartData.length === 0) {
    return <div className="text-center text-surface-700 py-12 text-sm">暂无数据</div>;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
          <defs>
            <linearGradient id="wasteGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={{ stroke: '#334155' }}
            tickLine={false}
          />
          <YAxis
            yAxisId="left"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={{ stroke: '#334155' }}
            tickLine={false}
            label={{ value: 'kg', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={{ stroke: '#334155' }}
            tickLine={false}
            domain={[0, 100]}
            label={{ value: '%', angle: 90, position: 'insideRight', fill: '#64748b', fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              borderRadius: 8,
              fontSize: 12,
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            }}
            labelStyle={{ color: '#e2e8f0', fontWeight: 600, marginBottom: 4 }}
            itemStyle={{ color: '#cbd5e1' }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            iconType="circle"
          />

          <Area
            yAxisId="left"
            type="monotone"
            dataKey="浪费量"
            stroke="#f43f5e"
            fill="url(#wasteGrad)"
            strokeWidth={2}
            dot={{ r: 3, fill: '#f43f5e' }}
            activeDot={{ r: 5 }}
            name="浪费量 (kg)"
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="备餐量"
            stroke="#f97316"
            strokeWidth={2}
            dot={{ r: 3, fill: '#f97316' }}
            name="备餐量 (kg)"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="浪费率"
            stroke="#fbbf24"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={false}
            name="浪费率 (%)"
          />

          {chartData.map((d, i) => (
            d.isRainy && (
              <ReferenceDot
                key={`rain-${i}`}
                yAxisId="left"
                x={d.date}
                y={d.备餐量}
                r={6}
                fill="#3b82f6"
                stroke="#1e40af"
                strokeWidth={1}
              />
            )
          ))}

          {chartData.map((d, i) => (
            d.hasGroup && (
              <ReferenceDot
                key={`group-${i}`}
                yAxisId="left"
                x={d.date}
                y={d.备餐量 + 0.2}
                r={5}
                fill="#fbbf24"
                stroke="#b45309"
                strokeWidth={1}
              />
            )
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
