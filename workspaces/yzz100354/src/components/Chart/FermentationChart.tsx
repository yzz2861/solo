import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { FermentationBatch, AnomalySegment } from '@/types';
import { ANOMALY_TYPE_COLORS, ANOMALY_TYPE_LABELS } from '@/types';
import { formatDateTime, formatTime } from '@/utils/timeParser';
import { formatBrix, formatTemperature } from '@/utils/unitConverter';

interface FermentationChartProps {
  batch: FermentationBatch;
  height?: number;
  onAnomalyClick?: (anomaly: AnomalySegment) => void;
  selectedAnomalyId?: string;
}

export const FermentationChart: React.FC<FermentationChartProps> = ({
  batch,
  height = 500,
  onAnomalyClick,
  selectedAnomalyId,
}) => {
  const option = useMemo(() => {
    const tempLogs = batch.temperatureLogs
      .filter(l => !l.isBadRow)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    const sugarReadings = batch.sugarReadings
      .filter(r => !r.isBadRow)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    const feedings = batch.feedingRecords
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    const tempData = tempLogs.map(l => [l.timestamp, l.temperature]);
    const sugarData = sugarReadings.map(r => [r.timestamp, r.brix]);
    
    const markAreas = batch.anomalies.map(anomaly => {
      const color = ANOMALY_TYPE_COLORS[anomaly.type];
      const isSelected = selectedAnomalyId === anomaly.id;
      return [
        {
          xAxis: anomaly.startTime,
          itemStyle: {
            color: color,
            opacity: isSelected ? 0.35 : 0.15,
          },
        },
        {
          xAxis: anomaly.endTime,
        },
      ];
    });
    
    const markLines = feedings.map(feeding => ({
      xAxis: feeding.timestamp,
      label: {
        show: true,
        formatter: `${feeding.type}`,
        position: 'insideEndTop',
        color: '#D2691E',
        fontSize: 11,
      },
      lineStyle: {
        color: '#D2691E',
        type: 'dashed',
        width: 2,
      },
    }));
    
    const feedingData = feedings.map(f => ({
      value: [f.timestamp, null],
      tooltip: {
        formatter: () => `
          <div style="padding: 8px;">
            <div style="font-weight: bold; color: #D2691E; margin-bottom: 4px;">
              投料: ${f.type}
            </div>
            <div style="font-size: 12px; color: #666;">
              时间: ${formatDateTime(f.timestamp)}<br/>
              数量: ${f.amount}${f.unit}
            </div>
          </div>
        `,
      },
    }));

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#D2691E',
        borderWidth: 1,
        textStyle: {
          color: '#3E2723',
        },
        axisPointer: {
          type: 'cross',
        },
      },
      legend: {
        data: ['温度', '糖度', '投料', ...batch.anomalies.map(a => ANOMALY_TYPE_LABELS[a.type])],
        top: 10,
        textStyle: {
          color: '#3E2723',
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'time',
        axisLabel: {
          formatter: (value: number) => formatTime(new Date(value)),
          color: '#666',
        },
        axisLine: {
          lineStyle: {
            color: '#D2691E',
          },
        },
      },
      yAxis: [
        {
          type: 'value',
          name: '温度 (°C)',
          position: 'left',
          min: (value: { min: number }) => Math.floor(value.min - 2),
          max: (value: { max: number }) => Math.ceil(value.max + 2),
          axisLabel: {
            color: '#E53935',
          },
          nameTextStyle: {
            color: '#E53935',
          },
          axisLine: {
            lineStyle: {
              color: '#E53935',
            },
          },
          splitLine: {
            lineStyle: {
              color: 'rgba(210, 105, 30, 0.1)',
            },
          },
        },
        {
          type: 'value',
          name: '糖度 (°Bx)',
          position: 'right',
          min: (value: { min: number }) => Math.floor(value.min - 2),
          max: (value: { max: number }) => Math.ceil(value.max + 2),
          axisLabel: {
            color: '#1E88E5',
          },
          nameTextStyle: {
            color: '#1E88E5',
          },
          axisLine: {
            lineStyle: {
              color: '#1E88E5',
            },
          },
          splitLine: {
            show: false,
          },
        },
      ],
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100,
        },
        {
          type: 'slider',
          start: 0,
          end: 100,
          height: 30,
          bottom: 10,
          borderColor: '#D2691E',
          fillerColor: 'rgba(210, 105, 30, 0.2)',
          handleStyle: {
            color: '#D2691E',
          },
        },
      ],
      series: [
        {
          name: '温度',
          type: 'line',
          yAxisIndex: 0,
          data: tempData,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: {
            width: 3,
            color: '#E53935',
          },
          itemStyle: {
            color: '#E53935',
          },
          markArea: {
            silent: false,
            data: markAreas,
            onClick: (params: any) => {
              const anomaly = batch.anomalies.find(
                a => a.startTime <= params.componentIndex && a.endTime >= params.componentIndex
              );
              if (anomaly && onAnomalyClick) {
                onAnomalyClick(anomaly);
              }
            },
          },
          tooltip: {
            formatter: (params: any) => {
              const time = new Date(params.value[0]);
              return `
                <div style="padding: 4px;">
                  <div style="color: #E53935; font-weight: bold;">温度</div>
                  <div>${formatDateTime(time)}</div>
                  <div>${formatTemperature(params.value[1])}</div>
                </div>
              `;
            },
          },
        },
        {
          name: '糖度',
          type: 'line',
          yAxisIndex: 1,
          data: sugarData,
          smooth: true,
          symbol: 'diamond',
          symbolSize: 8,
          lineStyle: {
            width: 2,
            color: '#1E88E5',
            type: 'dashed',
          },
          itemStyle: {
            color: '#1E88E5',
          },
          tooltip: {
            formatter: (params: any) => {
              const time = new Date(params.value[0]);
              return `
                <div style="padding: 4px;">
                  <div style="color: #1E88E5; font-weight: bold;">糖度</div>
                  <div>${formatDateTime(time)}</div>
                  <div>${formatBrix(params.value[1])}</div>
                </div>
              `;
            },
          },
        },
        {
          name: '投料',
          type: 'scatter',
          yAxisIndex: 0,
          data: feedingData,
          symbol: 'pin',
          symbolSize: 30,
          itemStyle: {
            color: '#D2691E',
          },
          markLine: {
            silent: false,
            symbol: 'none',
            data: markLines,
          },
        },
        ...batch.anomalies.map((anomaly, idx) => ({
          name: ANOMALY_TYPE_LABELS[anomaly.type],
          type: 'line',
          yAxisIndex: 0,
          data: [],
          markArea: {
            silent: false,
            data: [
              [
                {
                  xAxis: anomaly.startTime,
                  itemStyle: {
                    color: ANOMALY_TYPE_COLORS[anomaly.type],
                    opacity: anomaly.reviewed ? 0.08 : 0.2,
                  },
                  label: {
                    show: true,
                    formatter: ANOMALY_TYPE_LABELS[anomaly.type],
                    position: 'insideTop',
                    color: ANOMALY_TYPE_COLORS[anomaly.type],
                    fontSize: 12,
                    fontWeight: 'bold',
                  },
                },
                {
                  xAxis: anomaly.endTime,
                },
              ],
            ],
            onClick: () => {
              if (onAnomalyClick) {
                onAnomalyClick(anomaly);
              }
            },
          },
        })),
      ],
    };
  }, [batch, onAnomalyClick, selectedAnomalyId]);

  return (
    <div className="w-full bg-white rounded-xl border border-amber-100 p-4">
      <ReactECharts
        option={option}
        style={{ height: `${height}px`, width: '100%' }}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  );
};
