import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import type { WeeklySummary } from '../../shared/types';
import { TrendingUp, Droplet } from 'lucide-react';

interface Props {
  summary: WeeklySummary;
}

const CompareChart = ({ summary }: Props) => {
  const [mode, setMode] = useState<'bar' | 'cumulative'>('bar');

  const chartData = useMemo(
    () =>
      summary.dailyRecords.map((d) => {
        const s = Number(d.suggested.toFixed(2));
        const a = d.actual !== null ? Number(d.actual.toFixed(2)) : null;
        return {
          date: d.date.slice(5),
          建议量: s,
          实际量: a,
          偏差: d.diff !== null ? Number(d.diff.toFixed(2)) : null,
        };
      }),
    [summary]
  );

  const cumulative = useMemo(() => {
    let accS = 0;
    let accA = 0;
    return summary.dailyRecords.map((d) => {
      accS += d.suggested;
      if (d.actual !== null) accA += d.actual;
      return {
        date: d.date.slice(5),
        建议累计: Number(accS.toFixed(2)),
        实际累计: Number(accA.toFixed(2)),
      };
    });
  }, [summary]);

  const hasAnyActual = summary.dailyRecords.some((d) => d.actual !== null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-base p-5 sm:p-6"
    >
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-greenhouse-gradient text-white flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif text-xl font-bold text-greenhouse-800">
              建议 vs 实际 对比
            </h3>
            <p className="text-sm text-greenhouse-500">
              本周 ({summary.weekStart.slice(5)} 起)
            </p>
          </div>
        </div>

        {hasAnyActual && (
          <div className="flex items-center bg-greenhouse-50 rounded-lg p-0.5">
            <button
              onClick={() => setMode('bar')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                mode === 'bar'
                  ? 'bg-white text-greenhouse-700 shadow-soft'
                  : 'text-greenhouse-500'
              }`}
            >
              每日对比
            </button>
            <button
              onClick={() => setMode('cumulative')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                mode === 'cumulative'
                  ? 'bg-white text-greenhouse-700 shadow-soft'
                  : 'text-greenhouse-500'
              }`}
            >
              累计趋势
            </button>
          </div>
        )}
      </div>

      <div className="h-72 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          {mode === 'bar' ? (
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#DDEEDB" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#3D8B37' }}
                fontSize={12}
                tickLine={false}
                axisLine={{ stroke: '#BBDDB7' }}
              />
              <YAxis
                tick={{ fill: '#3D8B37' }}
                fontSize={12}
                tickLine={false}
                axisLine={{ stroke: '#BBDDB7' }}
                label={{
                  value: 'mm',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#2D5A27',
                  fontSize: 12,
                }}
              />
              <Tooltip
                contentStyle={{
                  background: 'white',
                  borderRadius: '12px',
                  border: '1px solid #DDEEDB',
                  boxShadow: '0 4px 12px rgba(45, 90, 39, 0.08)',
                  fontSize: 12,
                }}
                formatter={(value: unknown, name) => [
                  value !== null ? `${value} mm` : '未回填',
                  name,
                ]}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar
                dataKey="建议量"
                fill="#2980B9"
                radius={[6, 6, 0, 0]}
                opacity={0.85}
              />
              <Bar dataKey="实际量" fill="#3D8B37" radius={[6, 6, 0, 0]} />
            </BarChart>
          ) : (
            <LineChart
              data={cumulative}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#DDEEDB" />
              <XAxis dataKey="date" tick={{ fill: '#3D8B37' }} fontSize={12} />
              <YAxis
                tick={{ fill: '#3D8B37' }}
                fontSize={12}
                label={{
                  value: 'mm',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#2D5A27',
                  fontSize: 12,
                }}
              />
              <Tooltip
                contentStyle={{
                  background: 'white',
                  borderRadius: '12px',
                  fontSize: 12,
                }}
                formatter={(value: unknown) => `${value} mm`}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="建议累计"
                stroke="#2980B9"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#2980B9' }}
              />
              <Line
                type="monotone"
                dataKey="实际累计"
                stroke="#3D8B37"
                strokeWidth={2.5}
                strokeDasharray="5 5"
                dot={{ r: 4, fill: '#3D8B37' }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {!hasAnyActual && (
        <div className="mt-4 p-4 rounded-xl bg-water-50 border border-water-100 flex items-center gap-3 text-sm text-water-700">
          <Droplet className="w-5 h-5 text-water-500 shrink-0" />
          <span>还没有回填实际数据，先去上面填写每天的实际灌水量吧～</span>
        </div>
      )}
    </motion.div>
  );
};

export default CompareChart;
