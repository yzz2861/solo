import { TrendingUp, Clock, DollarSign, Coffee, Users } from 'lucide-react';
import type { DailyStats } from '@/types';
import { formatCurrency, formatDuration } from '@/utils/timeUtils';

interface StatsOverviewProps {
  stats: DailyStats;
}

export default function StatsOverview({ stats }: StatsOverviewProps) {
  const extendRatio = stats.totalRevenue > 0
    ? ((stats.extendRevenue / stats.totalRevenue) * 100).toFixed(1)
    : '0';

  const statCards = [
    {
      title: '今日预订',
      value: String(stats.totalBookings),
      suffix: '单',
      icon: <Coffee className="w-6 h-6" />,
      bgClass: 'from-blue-500 to-blue-600',
      iconBgClass: 'bg-blue-400/30',
    },
    {
      title: '翻台率',
      value: stats.turnoverRate.toFixed(2),
      suffix: '次/包间',
      icon: <TrendingUp className="w-6 h-6" />,
      bgClass: 'from-green-500 to-green-600',
      iconBgClass: 'bg-green-400/30',
    },
    {
      title: '总营收',
      value: formatCurrency(stats.totalRevenue),
      suffix: '',
      icon: <DollarSign className="w-6 h-6" />,
      bgClass: 'from-amber-500 to-amber-600',
      iconBgClass: 'bg-amber-400/30',
    },
    {
      title: '加钟收入',
      value: formatCurrency(stats.extendRevenue),
      suffix: `(${extendRatio}%)`,
      icon: <Clock className="w-6 h-6" />,
      bgClass: 'from-purple-500 to-purple-600',
      iconBgClass: 'bg-purple-400/30',
    },
    {
      title: '平均清台',
      value: formatDuration(stats.avgCleaningTime),
      suffix: '',
      icon: <Users className="w-6 h-6" />,
      bgClass: 'from-teal-500 to-teal-600',
      iconBgClass: 'bg-teal-400/30',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {statCards.map((card, index) => (
        <div
          key={index}
          className={`bg-gradient-to-br ${card.bgClass} rounded-2xl p-5 text-white shadow-lg`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm opacity-90">{card.title}</span>
            <div className={`p-2 rounded-lg ${card.iconBgClass}`}>
              {card.icon}
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold">{card.value}</span>
            {card.suffix && <span className="text-sm opacity-80">{card.suffix}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
