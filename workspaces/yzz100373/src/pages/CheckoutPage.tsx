import { useState, useEffect } from 'react';
import type { Order, OrderStatus } from '../../shared/types';
import { orderApi } from '../lib/services';
import { OrderCard } from '../components/checkout/OrderCard';
import { VehicleForm } from '../components/checkout/VehicleForm';
import { OrderDetailPanel } from '../components/checkout/OrderDetailPanel';
import { useAppStore } from '../store/appStore';
import { ListTodo, Car, CheckCircle, Clock } from 'lucide-react';

type FilterTab = 'all' | OrderStatus;

const tabs: { key: FilterTab; label: string; icon: typeof Clock }[] = [
  { key: 'all', label: '全部', icon: ListTodo },
  { key: 'queued', label: '排队', icon: Clock },
  { key: 'washing', label: '清洗中', icon: Car },
  { key: 'done', label: '已完成', icon: CheckCircle },
];

export default function CheckoutPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [loading, setLoading] = useState(false);
  const { showToast } = useAppStore();

  const loadOrders = async () => {
    try {
      const data = await orderApi.getList({ date: new Date().toISOString().split('T')[0] });
      setOrders(data);
    } catch {
      showToast('error', '加载订单失败');
    }
  };

  useEffect(() => {
    loadOrders();
    const timer = setInterval(loadOrders, 15000);
    return () => clearInterval(timer);
  }, []);

  const handleCreateOrder = async (data: Parameters<typeof orderApi.create>[0]) => {
    setLoading(true);
    try {
      const order = await orderApi.create(data);
      showToast('success', `核销成功！排队号 #${order.queueNumber}`);
      setSelectedId(order.id);
      setActiveTab('all');
      loadOrders();
    } catch (err: any) {
      showToast('error', err.response?.data?.error || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = activeTab === 'all'
    ? orders.filter((o) => o.status !== 'cancelled')
    : orders.filter((o) => o.status === activeTab);

  const queuedCount = orders.filter((o) => o.status === 'queued').length;
  const washingCount = orders.filter((o) => o.status === 'washing').length;
  const doneCount = orders.filter((o) => o.status === 'done').length;

  const selectedOrder = orders.find((o) => o.id === selectedId) || null;

  return (
    <div className="h-full flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">前台核销台</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl">
              <Clock className="w-4 h-4 text-slate-500" />
              <span className="text-sm">
                <span className="font-bold text-slate-900">{queuedCount}</span>
                <span className="text-slate-500"> 排队</span>
              </span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-xl">
              <Car className="w-4 h-4 text-blue-600" />
              <span className="text-sm">
                <span className="font-bold text-blue-700">{washingCount}</span>
                <span className="text-blue-600"> 清洗中</span>
              </span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-xl">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm">
                <span className="font-bold text-green-700">{doneCount}</span>
                <span className="text-green-600"> 已完成</span>
              </span>
            </div>
            <button
              onClick={loadOrders}
              className="px-4 py-2 text-sm font-medium text-brand bg-brand-50 rounded-xl hover:bg-brand-100 transition-colors"
            >
              刷新
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden p-6 grid grid-cols-12 gap-6">
        <div className="col-span-4 flex flex-col gap-4 min-h-0">
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl shadow-card">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              const count = tab.key === 'all'
                ? orders.filter(o => o.status !== 'cancelled').length
                : orders.filter(o => o.status === tab.key).length;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-brand text-white shadow'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-slate-200'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-auto space-y-3 pr-1">
            {filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-16">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <ListTodo className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-slate-500">暂无订单</p>
                <p className="text-slate-400 text-sm mt-1">从右侧开始登记车辆</p>
              </div>
            ) : (
              filteredOrders
                .sort((a, b) => {
                  if (a.status === 'done' && b.status !== 'done') return 1;
                  if (a.status !== 'done' && b.status === 'done') return -1;
                  return a.queueNumber - b.queueNumber;
                })
                .map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    selected={order.id === selectedId}
                    onClick={() => setSelectedId(order.id)}
                  />
                ))
            )}
          </div>
        </div>

        <div className="col-span-4 flex flex-col min-h-0">
          <VehicleForm onSubmit={handleCreateOrder} loading={loading} />
        </div>

        <div className="col-span-4 min-h-0">
          <OrderDetailPanel order={selectedOrder} onRefresh={loadOrders} />
        </div>
      </div>
    </div>
  );
}
