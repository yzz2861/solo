import React, { useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  height?: number;
}

export function ChartCard({ title, subtitle, children, height = 300 }: ChartCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-card p-5">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-800">{title}</h3>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      <div style={{ height }}>{children}</div>
    </div>
  );
}

interface StackedBarChartProps {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor: string;
  }>;
  height?: number;
}

export function StackedBarChart({ labels, datasets, height = 280 }: StackedBarChartProps) {
  const data = {
    labels,
    datasets: datasets.map(ds => ({
      ...ds,
      borderRadius: 4,
      borderSkipped: false as const,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: { size: 12 },
        },
      },
      tooltip: {
        backgroundColor: '#1E293B',
        titleFont: { size: 13 },
        bodyFont: { size: 12 },
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        stacked: true,
        grid: { display: false },
        ticks: { font: { size: 12 } },
      },
      y: {
        stacked: true,
        grid: { color: '#F1F5F9' },
        ticks: { font: { size: 12 } },
      },
    },
  };

  return <Bar data={data} options={options} height={height} />;
}

interface LineChartProps {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    fill?: boolean;
    yAxisID?: string;
  }>;
  height?: number;
}

export function LineChart({ labels, datasets, height = 280 }: LineChartProps) {
  const hasTwoYAxis = datasets.some(d => d.yAxisID);

  const data = {
    labels,
    datasets: datasets.map(ds => ({
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 6,
      borderWidth: 2,
      ...ds,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: { size: 12 },
        },
      },
      tooltip: {
        backgroundColor: '#1E293B',
        titleFont: { size: 13 },
        bodyFont: { size: 12 },
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 11 } },
      },
      y: {
        grid: { color: '#F1F5F9' },
        ticks: { font: { size: 11 } },
      },
      ...(hasTwoYAxis && {
        y1: {
          position: 'right' as const,
          grid: { display: false },
          ticks: { font: { size: 11 } },
        },
      }),
    },
  };

  return <Line data={data} options={options} height={height} />;
}

interface DoughnutChartProps {
  labels: string[];
  data: number[];
  colors: string[];
  height?: number;
  centerText?: string;
  centerSubtext?: string;
}

export function DoughnutChart({ labels, data, colors, height = 260, centerText, centerSubtext }: DoughnutChartProps) {
  const chartData = {
    labels,
    datasets: [
      {
        data,
        backgroundColor: colors,
        borderWidth: 0,
        hoverOffset: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          font: { size: 12 },
        },
      },
      tooltip: {
        backgroundColor: '#1E293B',
        titleFont: { size: 13 },
        bodyFont: { size: 12 },
        padding: 12,
        cornerRadius: 8,
      },
    },
  };

  return (
    <div className="relative" style={{ height }}>
      <Doughnut data={chartData} options={options} height={height} />
      {(centerText || centerSubtext) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {centerText && <div className="text-2xl font-bold text-gray-800">{centerText}</div>}
          {centerSubtext && <div className="text-sm text-gray-500">{centerSubtext}</div>}
        </div>
      )}
    </div>
  );
}

interface HorizontalBarChartProps {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor: string;
  }>;
  height?: number;
}

export function HorizontalBarChart({ labels, datasets, height = 280 }: HorizontalBarChartProps) {
  const data = {
    labels,
    datasets: datasets.map(ds => ({
      ...ds,
      borderRadius: 4,
      borderSkipped: false as const,
    })),
  };

  const options = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: { size: 12 },
        },
      },
      tooltip: {
        backgroundColor: '#1E293B',
        titleFont: { size: 13 },
        bodyFont: { size: 12 },
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: { color: '#F1F5F9' },
        ticks: { font: { size: 11 } },
      },
      y: {
        grid: { display: false },
        ticks: { font: { size: 12 } },
      },
    },
  };

  return <Bar data={data} options={options} height={height} />;
}
