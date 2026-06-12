import { useMemo, useState, useCallback } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  Label,
  Brush,
  Scatter,
  Cell,
} from 'recharts';
import type { FiringRecord, FiringSegment, SpecialEvent, SegmentType } from '../types';
import { formatHours, formatTemp, formatTimestamp, segmentTypeNames } from '../utils/curveCalc';

const segBgColors: Record<SegmentType, string> = {
  heating: 'rgba(232, 67, 17, 0.04)',
  holding: 'rgba(251, 191, 36, 0.06)',
  cooling: 'rgba(37, 99, 235, 0.04)',
};

const segColors: Record<SegmentType, string> = {
  heating: '#E84311',
  holding: '#F59E0B',
  cooling: '#2563EB',
};

interface ChartDataPoint {
  time: number;
  timeLabel: string;
  actualTemp: number | null;
  targetTemp: number | null;
  deviation: number;
  rate: number;
  segmentType: SegmentType | null;
  segmentId: string | null;
  hasEvent: boolean;
  eventTypes: string[];
  severity: 'low' | 'medium' | 'high' | null;
}

const eventIcons: Record<string, string> = {
  log_gap: '⚠️',
  overnight: '🌙',
  lid_open: '🚪',
  manual_adjust: '🎛️',
  power_loss: '⚡',
  other: '📍',
};

interface Props {
  record: FiringRecord;
  onSegmentClick?: (segmentId: string) => void;
  onEventClick?: (eventId: string) => void;
  onTimeHover?: (timeHours: number | null) => void;
  selectedSegmentId?: string | null;
  height?: number;
}

const FiringCurveChart = ({
  record,
  onSegmentClick,
  onEventClick,
  onTimeHover,
  selectedSegmentId,
  height = 520,
}: Props) => {
  const [hoveredTime, setHoveredTime] = useState<number | null>(null);

  const { chartData, yMin, yMax, segmentRanges, eventPoints } = useMemo(() => {
    const data: ChartDataPoint[] = [];
    const points = record.logPoints;
    const targets = record.targetPoints || [];

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const timeHours = (p.timestamp - record.startAt) / 3_600_000;

      let segment: FiringSegment | undefined;
      for (const seg of record.segments) {
        if (i >= seg.startIndex && i <= seg.endIndex) {
          segment = seg;
          break;
        }
      }

      const pointEvents = record.events.filter(
        (e) => Math.abs(e.timeHours - timeHours) < 0.05,
      );

      const targetTemp = targets[i]?.temperature ?? null;
      const actualTemp = p.isValid ? p.temperature : null;
      const deviation = targetTemp && actualTemp ? Math.abs(actualTemp - targetTemp) : 0;
      const percent = targetTemp ? (deviation / targetTemp) * 100 : 0;
      let severity: ChartDataPoint['severity'] = null;
      if (percent > 15) severity = 'high';
      else if (percent > 5) severity = 'medium';
      else if (percent > 2) severity = 'low';

      data.push({
        time: Math.round(timeHours * 100) / 100,
        timeLabel: formatHours(timeHours),
        actualTemp,
        targetTemp,
        deviation,
        rate: p.rate ?? 0,
        segmentType: segment?.type || null,
        segmentId: segment?.id || null,
        hasEvent: pointEvents.length > 0,
        eventTypes: pointEvents.map((e) => e.type),
        severity,
      });
    }

    const temps = points.map((p) => p.temperature);
    const tMin = Math.min(...temps) - 50;
    const tMax = Math.max(...temps) + 100;

    const ranges = record.segments.map((seg) => ({
      id: seg.id,
      type: seg.type,
      x1: Math.round(seg.startTime * 100) / 100,
      x2: Math.round(seg.endTime * 100) / 100,
    }));

    const events = record.events.map((e) => ({
      id: e.id,
      x: Math.round(e.timeHours * 100) / 100,
      y:
        points.find((p) => p.timestamp >= e.timestamp)?.temperature ??
        Math.max(...temps) * 0.8,
      icon: eventIcons[e.type] || '📍',
      type: e.type,
      title: e.title,
    }));

    return {
      chartData: data,
      yMin: Math.max(0, Math.floor(tMin / 50) * 50),
      yMax: Math.ceil(tMax / 50) * 50,
      segmentRanges: ranges,
      eventPoints: events,
    };
  }, [record]);

  const xTicks = useMemo(() => {
    const max = chartData[chartData.length - 1]?.time || 24;
    const step = max > 30 ? 4 : max > 16 ? 2 : 1;
    const ticks: number[] = [];
    for (let t = 0; t <= max; t += step) ticks.push(Math.round(t * 100) / 100);
    return ticks;
  }, [chartData]);

  const CustomTooltip = useCallback(
    ({ active, payload, label }: any) => {
      if (!active || !payload || payload.length === 0) return null;
      const dp = payload[0]?.payload as ChartDataPoint;
      if (!dp) return null;

      const timeIdx = Math.round(dp.time / (chartData[1]?.time || 0.03));
      const realPoint = record.logPoints[Math.min(timeIdx, record.logPoints.length - 1)];

      const relatedEvents = record.events.filter(
        (e) => Math.abs(e.timeHours - dp.time) < 0.08,
      );

      return (
        <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-card-hover border border-kiln-100 p-3 min-w-[240px]">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-kiln-100">
            <div>
              <p className="text-xs font-semibold text-kiln-800">
                T+{formatHours(dp.time)}
              </p>
              <p className="text-[10px] text-kiln-500 font-mono">
                {realPoint ? formatTimestamp(realPoint.timestamp) : '-'}
              </p>
            </div>
            {dp.segmentType && (
              <span
                className="badge text-[10px]"
                style={{
                  background: segColors[dp.segmentType] + '15',
                  borderColor: segColors[dp.segmentType] + '50',
                  color: segColors[dp.segmentType],
                }}
              >
                {segmentTypeNames[dp.segmentType]}
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-kiln-500 flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: '#E84311' }}
                />
                实际温度
              </span>
              <span className="text-sm font-bold font-mono text-fire-700">
                {dp.actualTemp !== null ? formatTemp(dp.actualTemp, record.unit) : '-'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-kiln-500 flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full border-2 border-dashed"
                  style={{ borderColor: '#64748B' }}
                />
                目标温度
              </span>
              <span className="text-sm font-bold font-mono text-slate-600">
                {dp.targetTemp !== null ? formatTemp(dp.targetTemp, record.unit) : '-'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-kiln-500">升温速率</span>
              <span
                className={
                  'text-sm font-bold font-mono ' +
                  (dp.rate > 200
                    ? 'text-red-600'
                    : dp.rate > 100
                      ? 'text-fire-600'
                      : dp.rate < -150
                        ? 'text-blue-600'
                        : 'text-kiln-700')
                }
              >
                {dp.rate > 0 ? '+' : ''}
                {dp.rate.toFixed(0)} ℃/h
              </span>
            </div>
            {dp.targetTemp !== null && dp.actualTemp !== null && (
              <>
                <div className="my-1 h-px bg-kiln-100" />
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-kiln-500">偏差</span>
                  <span
                    className={
                      'text-sm font-bold font-mono ' +
                      (Math.abs(dp.actualTemp - dp.targetTemp) > 30
                        ? 'text-red-600'
                        : Math.abs(dp.actualTemp - dp.targetTemp) > 10
                          ? 'text-amber-600'
                          : 'text-green-600')
                    }
                  >
                    {dp.actualTemp - dp.targetTemp > 0 ? '+' : ''}
                    {(dp.actualTemp - dp.targetTemp).toFixed(1)} ℃
                    <span className="text-[10px] font-normal ml-1">
                      ({((((dp.actualTemp - dp.targetTemp) / dp.targetTemp) * 100)).toFixed(1)}
                      %)
                    </span>
                  </span>
                </div>
              </>
            )}
          </div>

          {relatedEvents.length > 0 && (
            <div className="mt-2 pt-2 border-t border-kiln-100 space-y-1">
              {relatedEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-start gap-1.5 text-[10.5px] bg-amber-50 rounded-lg p-1.5 border border-amber-100 cursor-pointer hover:bg-amber-100 transition-colors"
                  onClick={() => onEventClick?.(ev.id)}
                >
                  <span className="text-base leading-none">{eventIcons[ev.type]}</span>
                  <div>
                    <p className="font-semibold text-amber-800">{ev.title}</p>
                    <p className="text-amber-600 leading-tight mt-0.5">{ev.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    },
    [chartData, record, onEventClick],
  );

  return (
    <div className="card p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between mb-4 gap-3">
        <div>
          <h3 className="text-base font-display font-bold text-kiln-800">烧成温度曲线</h3>
          <p className="text-xs text-kiln-500 mt-0.5">
            实际温度 vs 目标曲线 · 共 {record.logPoints.length} 个数据点 ·{' '}
            {formatHours(record.durationHours)}
          </p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-6 h-0.5 rounded-full bg-fire-500" />
            <span className="text-xs text-kiln-600">实际温度</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 border-t-2 border-dashed border-slate-500" />
            <span className="text-xs text-kiln-600">目标曲线</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
            <span className="text-xs text-kiln-600">高偏差点</span>
          </div>
        </div>
      </div>

      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 20, right: 20, left: 0, bottom: 0 }}
            onMouseMove={(e: any) => {
              const t = e?.activePayload?.[0]?.payload?.time ?? null;
              setHoveredTime(t);
              onTimeHover?.(t);
            }}
            onMouseLeave={() => {
              setHoveredTime(null);
              onTimeHover?.(null);
            }}
          >
            <defs>
              <linearGradient id="actualGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#2563EB" />
                <stop offset="30%" stopColor="#10B981" />
                <stop offset="55%" stopColor="#F59E0B" />
                <stop offset="80%" stopColor="#EF4444" />
                <stop offset="100%" stopColor="#FBBF24" />
              </linearGradient>
              <linearGradient id="deviationFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EF4444" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#EF4444" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {segmentRanges.map((seg) => (
              <ReferenceArea
                key={`bg-${seg.id}`}
                x1={seg.x1}
                x2={seg.x2}
                y1={yMin}
                y2={yMax}
                fill={segBgColors[seg.type]}
                stroke={selectedSegmentId === seg.id ? segColors[seg.type] : 'transparent'}
                strokeOpacity={0.4}
                strokeDasharray="4 4"
              />
            ))}

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#EBD8C0"
              opacity={0.5}
              vertical={true}
            />

            {record.summary.peakTime > 0 && (
              <ReferenceLine
                x={Math.round(record.summary.peakTime * 100) / 100}
                stroke="#F59E0B"
                strokeWidth={1.5}
                strokeDasharray="5 4"
              >
                <Label
                  value={`🔥 ${record.summary.peakTemp.toFixed(0)}℃`}
                  position="top"
                  fill="#B45309"
                  fontSize={11}
                  fontWeight={600}
                />
              </ReferenceLine>
            )}

            <XAxis
              dataKey="time"
              type="number"
              domain={[0, 'auto']}
              ticks={xTicks}
              tickFormatter={(v) => `${v}h`}
              tick={{ fontSize: 11, fill: '#723822', fontWeight: 500 }}
              axisLine={{ stroke: '#DCB98E' }}
              tickLine={{ stroke: '#DCB98E' }}
              label={{
                value: '烧成时间（小时）',
                position: 'insideBottom',
                offset: -5,
                style: { fontSize: 11, fill: '#723822', fontWeight: 500 },
              }}
            />

            <YAxis
              yAxisId="temp"
              domain={[yMin, yMax]}
              tickFormatter={(v) => `${v}`}
              tick={{ fontSize: 11, fill: '#723822', fontWeight: 500, fontFamily: 'JetBrains Mono' }}
              axisLine={{ stroke: '#DCB98E' }}
              tickLine={{ stroke: '#DCB98E' }}
              width={50}
              label={{
                value: `温度 (${record.unit === 'C' ? '℃' : '℉'})`,
                angle: -90,
                position: 'insideLeft',
                offset: 10,
                style: { fontSize: 11, fill: '#723822', fontWeight: 500 },
              }}
            />

            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: '#C92D0A', strokeWidth: 1, strokeDasharray: '4 4' }}
            />

            <Area
              yAxisId="temp"
              type="monotone"
              dataKey="targetTemp"
              fill="none"
              stroke="none"
            />

            <Line
              yAxisId="temp"
              type="monotone"
              dataKey="targetTemp"
              stroke="#64748B"
              strokeWidth={2}
              strokeDasharray="6 5"
              dot={false}
              activeDot={{ r: 4, fill: '#64748B' }}
              connectNulls
              isAnimationActive={true}
              animationDuration={1200}
            />

            <Line
              yAxisId="temp"
              type="monotone"
              dataKey="actualTemp"
              stroke="url(#actualGradient)"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 5, fill: '#C92D0A', stroke: '#fff', strokeWidth: 2 }}
              connectNulls
              isAnimationActive={true}
              animationDuration={1800}
              animationEasing="ease-in-out"
            />

            <Scatter yAxisId="temp" dataKey="actualTemp" data={chartData.filter((d) => d.severity === 'high')}>
              {chartData
                .filter((d) => d.severity === 'high')
                .map((_, i) => (
                  <Cell key={i} fill="#EF4444" stroke="#fff" strokeWidth={1.5} />
                ))}
            </Scatter>

            <Brush
              dataKey="time"
              height={24}
              stroke="#A95A2A"
              fill="#FBF6F0"
              travellerWidth={8}
              tickFormatter={(v) => `${v}h`}
            >
              <ComposedChart>
                <Line
                  type="monotone"
                  dataKey="actualTemp"
                  stroke="#C92D0A"
                  strokeWidth={1.2}
                  dot={false}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </Brush>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {eventPoints.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-kiln-100">
          <span className="text-[11px] font-semibold text-kiln-500 uppercase tracking-wider">
            特殊事件
          </span>
          {eventPoints.map((e) => (
            <button
              key={e.id}
              onClick={() => onEventClick?.(e.id)}
              className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white border border-kiln-200 hover:border-fire-400 hover:bg-fire-50 hover:text-fire-700 transition-all"
            >
              <span className="text-sm">{e.icon}</span>
              <span>{e.title}</span>
              <span className="text-kiln-400 group-hover:text-fire-500 font-mono">
                T+{e.x.toFixed(1)}h
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default FiringCurveChart;
