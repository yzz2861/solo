import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { FloorStatistics } from '../../../shared/types';

interface FloorHeatmapProps {
  data: FloorStatistics[];
}

export function FloorHeatmap({ data }: FloorHeatmapProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const floors = data.map(d => `${d.floor}楼`);
    const hours = ['早班', '中班', '晚班'];
    
    const heatmapData: number[][] = [];
    data.forEach((floor, floorIdx) => {
      heatmapData.push([0, floorIdx, floor.shiftIssues.morning]);
      heatmapData.push([1, floorIdx, floor.shiftIssues.afternoon]);
      heatmapData.push([2, floorIdx, floor.shiftIssues.night]);
    });

    const maxValue = Math.max(...heatmapData.map(d => d[2]), 1);

    const option: echarts.EChartsOption = {
      tooltip: {
        position: 'top',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#E5E6EB',
        borderWidth: 1,
        textStyle: { color: '#1D2129' },
        formatter: (params: any) => {
          const floor = floors[params.data[1]];
          const shift = hours[params.data[0]];
          const count = params.data[2];
          return `<div class="font-medium">${floor} ${shift}</div>
                  <div>异常次数: <span class="font-medium text-red-500">${count}</span></div>`;
        },
      },
      grid: {
        left: '15%',
        right: '10%',
        top: '10%',
        bottom: '15%',
      },
      xAxis: {
        type: 'category',
        data: hours,
        axisLine: { lineStyle: { color: '#E5E6EB' } },
        axisLabel: { color: '#4E5969', fontSize: 12 },
        axisTick: { show: false },
        splitArea: { show: true },
      },
      yAxis: {
        type: 'category',
        data: floors,
        axisLine: { lineStyle: { color: '#E5E6EB' } },
        axisLabel: { color: '#4E5969', fontSize: 12 },
        axisTick: { show: false },
        splitArea: { show: true },
      },
      visualMap: {
        min: 0,
        max: maxValue,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: '0%',
        inRange: {
          color: ['#E8FFEA', '#7DFF9E', '#0FC637', '#F7BA1E', '#F53F3F'],
        },
        textStyle: { color: '#86909C', fontSize: 10 },
      },
      series: [
        {
          type: 'heatmap',
          data: heatmapData,
          label: {
            show: true,
            color: '#1D2129',
            fontSize: 13,
            fontWeight: 500,
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.3)',
            },
          },
        },
      ],
    };

    chartInstance.current.setOption(option);

    const handleResize = () => {
      chartInstance.current?.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [data]);

  return <div ref={chartRef} className="w-full h-72" />;
}
