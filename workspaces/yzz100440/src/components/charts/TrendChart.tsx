import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { DailyStatistics } from '../../../shared/types';

interface TrendChartProps {
  data: DailyStatistics[];
}

export function TrendChart({ data }: TrendChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const dates = data.map(d => d.date.substring(5));
    const missedRate = data.map(d => 
      d.totalDoses > 0 ? ((d.missed + d.late + d.conflict) / d.totalDoses * 100).toFixed(1) : '0'
    );
    const adherenceRate = data.map(d => 
      d.totalDoses > 0 ? (((d.taken + d.supplemented) / d.totalDoses) * 100).toFixed(1) : '100'
    );
    const totalDoses = data.map(d => d.totalDoses);

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#E5E6EB',
        borderWidth: 1,
        textStyle: { color: '#1D2129' },
        formatter: (params: any) => {
          const date = params[0].axisValue;
          let html = `<div class="font-medium mb-2">${date}</div>`;
          params.forEach((p: any) => {
            const unit = p.seriesName === '服药人次' ? '次' : '%';
            html += `<div class="flex items-center space-x-2">
              <span class="w-2 h-2 rounded-full" style="background:${p.color}"></span>
              <span>${p.seriesName}: <span class="font-medium">${p.value}${unit}</span></span>
            </div>`;
          });
          return html;
        },
      },
      legend: {
        data: ['依从率', '异常率', '服药人次'],
        bottom: 0,
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { color: '#4E5969', fontSize: 12 },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: dates,
        boundaryGap: false,
        axisLine: { lineStyle: { color: '#E5E6EB' } },
        axisLabel: { color: '#86909C', fontSize: 11 },
        axisTick: { show: false },
      },
      yAxis: [
        {
          type: 'value',
          name: '百分比(%)',
          min: 0,
          max: 100,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { color: '#86909C', fontSize: 11, formatter: '{value}%' },
          splitLine: { lineStyle: { color: '#F2F3F5', type: 'dashed' } },
        },
        {
          type: 'value',
          name: '人次',
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { color: '#86909C', fontSize: 11 },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: '依从率',
          type: 'line',
          smooth: true,
          yAxisIndex: 0,
          data: adherenceRate,
          lineStyle: { color: '#00B42A', width: 3 },
          itemStyle: { color: '#00B42A' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(0, 180, 42, 0.15)' },
              { offset: 1, color: 'rgba(0, 180, 42, 0.02)' },
            ]),
          },
          symbol: 'circle',
          symbolSize: 6,
        },
        {
          name: '异常率',
          type: 'line',
          smooth: true,
          yAxisIndex: 0,
          data: missedRate,
          lineStyle: { color: '#F53F3F', width: 3 },
          itemStyle: { color: '#F53F3F' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(245, 63, 63, 0.15)' },
              { offset: 1, color: 'rgba(245, 63, 63, 0.02)' },
            ]),
          },
          symbol: 'circle',
          symbolSize: 6,
        },
        {
          name: '服药人次',
          type: 'bar',
          yAxisIndex: 1,
          data: totalDoses,
          barWidth: '40%',
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#165DFF' },
              { offset: 1, color: '#4080FF' },
            ]),
            borderRadius: [4, 4, 0, 0],
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

  return <div ref={chartRef} className="w-full h-80" />;
}
