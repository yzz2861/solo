import { useMemo } from 'react';
import { useRecycleStore } from '../../store/useRecycleStore';
import { useAuthStore } from '../../store/useAuthStore';
import dayjs from 'dayjs';
import {
  PackageCheck, Banknote, TrendingDown, AlertTriangle, PackageOpen,
  ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'flat';
  trendValue?: string;
  icon: any;
  accent: string;
  iconBg: string;
  iconColor: string;
}

function StatCard({ title, value, subtitle, trend, trendValue, icon: Icon, accent, iconBg, iconColor }: StatCardProps) {
  const trendIcon = trend === 'up' ? <ArrowUpRight size={14} /> : trend === 'down' ? <ArrowDownRight size={14} /> : <Minus size={14} />;
  const trendCls = trend === 'up' ? 'text-emerald-600 bg-emerald-50' : trend === 'down' ? 'text-danger-600 bg-rose-50' : 'text-slate-500 bg-slate-50';
  return (
    <div className="card p-5 relative overflow-hidden group hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300">
      <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full ${accent} opacity-20 group-hover:opacity-30 transition-opacity`} />
      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm font-medium text-slate-500">{title}</div>
            <div className="mt-3 font-mono text-3xl font-black text-slate-800 tabular-nums">
              {value}
            </div>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${iconBg} ${iconColor} shadow-soft`}>
            <Icon size={22} />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          {trend && (
            <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-bold ${trendCls}`}>
              {trendIcon}
              {trendValue}
            </span>
          )}
          {subtitle && <span className="text-xs text-slate-400">{subtitle}</span>}
        </div>
      </div>
    </div>
  );
}

export default function StatsCards() {
  const orders = useRecycleStore((s) => s.orders);
  const { currentUser } = useAuthStore();

  const stats = useMemo(() => {
    const todayStart = dayjs().startOf('day').valueOf();
    const todayOrders = orders.filter(o => o.createdAt >= todayStart);
    const yStart = dayjs().subtract(1, 'day').startOf('day').valueOf();
    const yEnd = dayjs().startOf('day').valueOf();
    const yOrders = orders.filter(o => o.createdAt >= yStart && o.createdAt < yEnd);

    const recycleCount = todayOrders.length;
    const yRecycleCount = yOrders.length;
    const countTrend = yRecycleCount === 0 ? (recycleCount === 0 ? 'flat' : 'up') : recycleCount > yRecycleCount ? 'up' : recycleCount < yRecycleCount ? 'down' : 'flat';
    const countTrendVal = yRecycleCount === 0 ? '—' : `${((recycleCount - yRecycleCount) / yRecycleCount * 100).toFixed(0)}%`;

    const todayFinalized = todayOrders.filter(o => o.finalPrice !== null);
    const turnover = todayFinalized.reduce((s, o) => s + (o.finalPrice ?? 0), 0);
    const yFinalized = yOrders.filter(o => o.finalPrice !== null);
    const yTurnover = yFinalized.reduce((s, o) => s + (o.finalPrice ?? 0), 0);
    const turnoverTrend = yTurnover === 0 ? (turnover === 0 ? 'flat' : 'up') : turnover > yTurnover ? 'up' : turnover < yTurnover ? 'down' : 'flat';
    const turnoverTrendVal = yTurnover === 0 ? '—' : `${((turnover - yTurnover) / yTurnover * 100).toFixed(0)}%`;

    const bargains = todayOrders.filter(o => o.priceHistory.length > 0);
    const avgDiscount = bargains.length
      ? Math.round(bargains.reduce((s, o) => {
        const last = o.priceHistory[o.priceHistory.length - 1];
        return s + (last ? (o.initialPrice - last.newPrice) : 0);
      }, 0) / bargains.length)
      : 0;
    const yBargains = yOrders.filter(o => o.priceHistory.length > 0);
    const yAvgDiscount = yBargains.length
      ? Math.round(yBargains.reduce((s, o) => {
        const last = o.priceHistory[o.priceHistory.length - 1];
        return s + (last ? (o.initialPrice - last.newPrice) : 0);
      }, 0) / yBargains.length)
      : 0;
    const discTrend = yAvgDiscount === 0 ? (avgDiscount === 0 ? 'flat' : 'up') : avgDiscount > yAvgDiscount ? 'up' : avgDiscount < yAvgDiscount ? 'down' : 'flat';
    const discTrendVal = yAvgDiscount === 0 ? '—' : `${Math.abs(avgDiscount - yAvgDiscount)}元`;

    const riskCount = orders.filter(o => {
      const accountRisk = o.checkResult.account.idLoggedOut !== 'pass';
      const privacyRisk = !o.privacyWiped && ['pending_in', 'in_stock'].includes(o.status);
      const snRisk = o.duplicateSnWarning;
      const checkRisk = o.checkResult.water.indicator === 'fail' || o.checkResult.battery.bulge === 'fail' || o.checkResult.screen.crack === 'fail';
      return accountRisk || privacyRisk || snRisk || checkRisk;
    }).length;

    const pendingShelf = orders.filter(o => o.status === 'in_stock').length;

    return {
      recycleCount, countTrend, countTrendVal,
      turnover: turnover ? '¥' + turnover.toLocaleString('zh-CN') : '¥0',
      turnoverTrend, turnoverTrendVal,
      avgDiscount: avgDiscount ? '¥' + avgDiscount.toLocaleString('zh-CN') : '¥0',
      discTrend, discTrendVal,
      riskCount, pendingShelf,
    };
  }, [orders]);

  const isManager = currentUser?.role === 'manager';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      <StatCard
        title="今日回收量"
        value={stats.recycleCount + ' 台'}
        subtitle="较昨日"
        trend={stats.countTrend as any}
        trendValue={stats.countTrendVal}
        icon={PackageCheck}
        accent="bg-brand-500"
        iconBg="bg-brand-50"
        iconColor="text-brand-600"
      />
      <StatCard
        title="今日成交额"
        value={stats.turnover}
        subtitle="较昨日"
        trend={stats.turnoverTrend as any}
        trendValue={stats.turnoverTrendVal}
        icon={Banknote}
        accent="bg-emerald-500"
        iconBg="bg-emerald-50"
        iconColor="text-emerald-600"
      />
      <StatCard
        title="平均让价"
        value={stats.avgDiscount}
        subtitle={isManager ? '店长关注' : '每台平均'}
        trend={stats.discTrend as any}
        trendValue={stats.discTrendVal}
        icon={TrendingDown}
        accent="bg-warn-500"
        iconBg="bg-amber-50"
        iconColor="text-warn-600"
      />
      <StatCard
        title="风险机待处理"
        value={stats.riskCount + ' 台'}
        subtitle="含历史累计"
        icon={AlertTriangle}
        accent="bg-danger-500"
        iconBg="bg-rose-50"
        iconColor="text-danger-600"
      />
      <StatCard
        title="待上架审核"
        value={stats.pendingShelf + ' 台'}
        subtitle="在库可售"
        icon={PackageOpen}
        accent="bg-blue-500"
        iconBg="bg-blue-50"
        iconColor="text-blue-600"
      />
    </div>
  );
}
