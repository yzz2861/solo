import { useState, useEffect } from 'react';
import type { Order, Worker, WashStep } from '../../shared/types';
import { WASH_STEP_LABELS, WASH_STEPS } from '../../shared/types';
import { orderApi, workerApi } from '../lib/services';
import { User, Car, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

export default function WorkersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);

  const loadData = async () => {
    const [o, w] = await Promise.all([
      orderApi.getList({ date: new Date().toISOString().split('T')[0] }),
      workerApi.getList(),
    ]);
    setOrders(o.filter((o) => o.status !== 'cancelled'));
    setWorkers(w);
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 10000);
    return () => clearInterval(timer);
  }, []);

  const unassigned = orders.filter((o) => !o.workerId && o.status !== 'done');

  return (
    <div className="h-full flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">洗车工进度看板</h1>
            <p className="text-sm text-slate-500 mt-0.5">实时查看每位洗车工的处理进度</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {unassigned.length > 0 && (
            <div className="bg-white rounded-2xl shadow-card overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-200 rounded-xl flex items-center justify-center">
                    <Car className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">待分配</div>
                    <div className="text-xs text-slate-500">{unassigned.length} 辆车排队</div>
                  </div>
                </div>
              </div>
              <div className="p-4 space-y-3 max-h-96 overflow-auto">
                {unassigned.map((order) => (
                  <OrderWorkerCard key={order.id} order={order} />
                ))}
              </div>
            </div>
          )}

          {workers.map((worker) => {
            const workerOrders = orders.filter(
              (o) => o.workerId === worker.id && o.status !== 'done'
            );
            const doneToday = orders.filter(
              (o) => o.workerId === worker.id && o.status === 'done'
            ).length;

            return (
              <div key={worker.id} className="bg-white rounded-2xl shadow-card overflow-hidden">
                <div className="p-4 bg-gradient-to-r from-brand-50 to-blue-50 border-b border-brand-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center text-white">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{worker.name}</div>
                      <div className="text-xs text-slate-500">
                        进行中 {workerOrders.length} 辆 · 今日完成 {doneToday} 辆
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-4 space-y-3 max-h-96 overflow-auto">
                  {workerOrders.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">暂无车辆</div>
                  ) : (
                    workerOrders.map((order) => (
                      <OrderWorkerCard key={order.id} order={order} showProgress />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function OrderWorkerCard({ order, showProgress }: { order: Order; showProgress?: boolean }) {
  const progress = WASH_STEPS.indexOf(order.currentStep);
  const totalSteps = WASH_STEPS.length - 1;
  const percent = Math.round((progress / totalSteps) * 100);

  return (
    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-brand hover:bg-brand-50/30 transition-all">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-brand text-white text-sm font-bold">
            #{order.queueNumber}
          </span>
          <span className="font-bold text-slate-900 text-lg">{order.plateNumber}</span>
        </div>
        <span
          className={clsx(
            'px-2 py-0.5 rounded-md text-xs font-medium',
            order.status === 'washing' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
          )}
        >
          {WASH_STEP_LABELS[order.currentStep]}
        </span>
      </div>

      {order.packageName && (
        <div className="text-xs text-slate-500 mb-2">{order.packageName}</div>
      )}

      {order.addons.length > 0 && (
        <div className="text-xs text-orange-600 mb-2 flex items-center gap-1">
          <ChevronRight className="w-3 h-3" />
          加项：{order.addons.map((a) => a.name).join('、')}
        </div>
      )}

      {showProgress && (
        <div className="mt-2">
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand to-blue-400 rounded-full transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>进度 {percent}%</span>
            <span>还差 {WASH_STEP_LABELS[WASH_STEPS[Math.min(progress + 1, WASH_STEPS.length - 1)] as WashStep]}</span>
          </div>
        </div>
      )}
    </div>
  );
}
