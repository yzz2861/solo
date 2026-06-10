import { useState, useEffect } from 'react';
import type { DailyReport, Order } from '../../shared/types';
import { WASH_STEP_LABELS } from '../../shared/types';
import { reportApi } from '../lib/services';
import { useAppStore } from '../store/appStore';
import {
  BarChart3,
  Download,
  Calendar,
  DollarSign,
  CreditCard,
  Sparkles,
  Undo2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export default function ReportPage() {
  const [date, setDate] = useState(new Date());
  const [report, setReport] = useState<DailyReport | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'cancelled'>('all');
  const { showToast } = useAppStore();

  const loadReport = async () => {
    try {
      const data = await reportApi.getDaily(date.toISOString().split('T')[0]);
      setReport(data);
    } catch {
      showToast('error', '加载报表失败');
    }
  };

  useEffect(() => {
    loadReport();
  }, [date]);

  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  const addDays = (d: Date, n: number) => {
    const nd = new Date(d);
    nd.setDate(nd.getDate() + n);
    return nd;
  };

  const handleExport = () => {
    reportApi.exportDaily(formatDate(date));
    showToast('success', '正在导出报表...');
  };

  const displayOrders = report
    ? activeTab === 'cancelled'
      ? report.orders.filter((o) => o.status === 'cancelled')
      : report.orders.filter((o) => o.status !== 'cancelled')
    : [];

  return (
    <div className="h-full flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">老板日结</h1>
            <p className="text-sm text-slate-500 mt-0.5">查看每日收支明细和撤销记录</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-xl">
              <button
                onClick={() => setDate(addDays(date, -1))}
                className="p-1 hover:bg-white rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-lg">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">
                  {date.toLocaleDateString('zh-CN')}
                </span>
              </div>
              <button
                onClick={() => setDate(addDays(date, 1))}
                className="p-1 hover:bg-white rounded-lg transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand text-white rounded-xl font-medium hover:bg-brand-light transition-colors shadow-md"
            >
              <Download className="w-4 h-4" />
              导出报表
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {report && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                icon={<DollarSign className="w-5 h-5" />}
                label="总营业收入"
                value={`¥${report.totalRevenue.toFixed(2)}`}
                sub={`${report.totalOrders} 笔订单`}
                color="blue"
              />
              <StatCard
                icon={<CreditCard className="w-5 h-5" />}
                label="会员扣次"
                value={`¥${report.memberDeductionAmount.toFixed(2)}`}
                sub={`${report.memberDeductionCount} 次扣减`}
                color="green"
              />
              <StatCard
                icon={<Sparkles className="w-5 h-5" />}
                label="加项收入"
                value={`¥${report.addonRevenue.toFixed(2)}`}
                sub={`现金 / 已收款`}
                color="orange"
              />
              <StatCard
                icon={<Undo2 className="w-5 h-5" />}
                label="撤销订单"
                value={`${report.cancelledOrders} 笔`}
                sub={`涉及金额 ¥${report.cancelledAmount.toFixed(2)}`}
                color="red"
              />
            </div>

            <div className="bg-white rounded-2xl shadow-card overflow-hidden">
              <div className="flex items-center border-b border-slate-200">
                <TabButton
                  active={activeTab === 'all'}
                  onClick={() => setActiveTab('all')}
                  label="订单明细"
                  count={report.orders.filter((o) => o.status !== 'cancelled').length}
                />
                <TabButton
                  active={activeTab === 'cancelled'}
                  onClick={() => setActiveTab('cancelled')}
                  label="撤销记录"
                  count={report.orders.filter((o) => o.status === 'cancelled').length}
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">时间</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">排队号</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">车牌</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">会员/套餐</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">洗车工</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">支付方式</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase">洗车金额</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase">加项收入</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">状态</th>
                      {activeTab === 'cancelled' && (
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">撤销原因</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayOrders.length === 0 ? (
                      <tr>
                        <td colSpan={activeTab === 'cancelled' ? 10 : 9} className="text-center py-12 text-slate-400">
                          <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                          暂无数据
                        </td>
                      </tr>
                    ) : (
                      displayOrders.map((order) => (
                        <OrderRow key={order.id} order={order} showCancel={activeTab === 'cancelled'} />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: 'blue' | 'green' | 'orange' | 'red';
}) {
  const colorMap = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-emerald-500 to-emerald-600',
    orange: 'from-orange-500 to-orange-600',
    red: 'from-red-500 to-red-600',
  };
  const bgMap = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    orange: 'bg-orange-50 text-orange-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div className="bg-white rounded-2xl shadow-card p-5">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${bgMap[color]}`}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-slate-900 mb-1">{value}</div>
      <div className="text-sm font-medium text-slate-700">{label}</div>
      <div className="text-xs text-slate-400 mt-0.5">{sub}</div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative px-6 py-4 text-sm font-medium transition-colors ${
        active ? 'text-brand' : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      {label}
      <span
        className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
          active ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500'
        }`}
      >
        {count}
      </span>
      {active && <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-brand rounded-full" />}
    </button>
  );
}

function OrderRow({ order, showCancel }: { order: Order; showCancel: boolean }) {
  const addonTotal = order.addons.filter((a) => a.paid).reduce((s, a) => s + a.price, 0);

  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="px-5 py-3 text-sm text-slate-600">
        {new Date(order.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
      </td>
      <td className="px-5 py-3">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-brand text-white text-xs font-bold">
          #{order.queueNumber}
        </span>
      </td>
      <td className="px-5 py-3 font-bold text-slate-900">{order.plateNumber}</td>
      <td className="px-5 py-3 text-sm text-slate-600">
        {order.memberName || '-'}
        {order.packageName && <div className="text-xs text-slate-400">{order.packageName}</div>}
      </td>
      <td className="px-5 py-3 text-sm text-slate-600">{order.workerName || '-'}</td>
      <td className="px-5 py-3 text-sm">
        <span
          className={`px-2 py-0.5 rounded-md text-xs font-medium ${
            order.payType === 'member' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
          }`}
        >
          {order.payType === 'member' ? `会员扣${order.packageDeducted}次` : '现金'}
        </span>
      </td>
      <td className="px-5 py-3 text-sm text-right font-medium text-slate-900">
        ¥{(order.cashAmount || 0).toFixed(2)}
      </td>
      <td className="px-5 py-3 text-sm text-right font-medium text-orange-600">
        {addonTotal > 0 ? `¥${addonTotal.toFixed(2)}` : '-'}
        {order.addons.length > 0 && (
          <div className="text-xs text-slate-400">
            {order.addons.filter((a) => !a.paid).length > 0 &&
              `${order.addons.filter((a) => !a.paid).length}项未付`}
          </div>
        )}
      </td>
      <td className="px-5 py-3 text-sm">
        {order.status === 'done' ? (
          <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-green-100 text-green-700">已完成</span>
        ) : order.status === 'washing' ? (
          <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-700">
            {WASH_STEP_LABELS[order.currentStep]}
          </span>
        ) : order.status === 'queued' ? (
          <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">排队中</span>
        ) : (
          <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-red-100 text-red-700">已撤销</span>
        )}
      </td>
      {showCancel && (
        <td className="px-5 py-3 text-sm text-red-600">
          {order.cancelReason}
          {order.cancelledBy && <div className="text-xs text-red-400">by {order.cancelledBy}</div>}
        </td>
      )}
    </tr>
  );
}
