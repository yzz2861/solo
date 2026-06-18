import { useMemo } from 'react';
import { Plus, Printer, Flame, CheckCircle, Clock, ChevronRight } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { BatchAllocator } from '@/utils/batchAllocator';
import { OrderCard } from '@/components/order/OrderCard';
import { generateBakingListHTML, printHTML } from '@/utils/printUtils';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';
import { BATCH_STATUS_INFO, PRODUCT_INFO } from '@/types';

export const BatchView = () => {
  const { batches, orders, selectedDate, updateBatch, allocateBatch, setEditingOrder, config } = useAppStore();
  const { showToast } = useToast();

  const dayBatches = useMemo(() => {
    return batches
      .filter(b => b.bakingDate === selectedDate)
      .sort((a, b) => a.batchNumber - b.batchNumber);
  }, [batches, selectedDate]);

  const ordersByBatch = useMemo(() => {
    return BatchAllocator.groupOrdersByBatch(orders, batches, selectedDate, config);
  }, [orders, batches, selectedDate, config]);

  const unassignedOrders = ordersByBatch.get('unassigned') || [];

  const handleStartBaking = (batchId: string) => {
    updateBatch(batchId, { status: 'baking' });
    showToast('开始烘焙！', 'success');
  };

  const handleCompleteBaking = (batchId: string) => {
    updateBatch(batchId, { status: 'completed' });
    const batchOrders = ordersByBatch.get(batchId) || [];
    batchOrders.forEach(order => {
      useAppStore.getState().updateOrderStatus(order.id, 'ready');
    });
    showToast('本炉烘焙完成！', 'success');
  };

  const handlePrintBatch = (batchId: string) => {
    const batch = batches.find(b => b.id === batchId);
    const batchOrders = ordersByBatch.get(batchId) || [];
    if (!batch) return;
    const html = generateBakingListHTML(batch, batchOrders, selectedDate);
    printHTML(html);
  };

  const handleAllocateBatch = (orderId: string, batchId: string) => {
    allocateBatch(orderId, batchId);
    showToast('已分配到批次', 'success');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-orange-500 to-red-500">
          <h2 className="text-xl font-bold text-white font-serif flex items-center gap-2">
            <Flame className="w-6 h-6" />
            烤炉批次管理
          </h2>
          <p className="text-orange-100 text-sm mt-1">
            管理今日各批次烘焙进度，分配订单到合适的烤炉
          </p>
        </div>

        <div className="p-6">
          {dayBatches.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Flame className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>今日暂无烤炉安排</p>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {dayBatches.map(batch => {
                const loadPercent = BatchAllocator.getBatchLoadPercentage(batch);
                const batchOrders = ordersByBatch.get(batch.id) || [];
                const statusInfo = BATCH_STATUS_INFO[batch.status];
                
                return (
                  <div
                    key={batch.id}
                    className={cn(
                      'rounded-2xl border overflow-hidden transition-all',
                      batch.status === 'baking' && 'ring-2 ring-orange-400 shadow-lg',
                      batch.status === 'completed' && 'opacity-75'
                    )}
                  >
                    <div className={cn(
                      'px-5 py-4 flex items-center justify-between',
                      batch.status === 'baking' 
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500'
                        : batch.status === 'completed'
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                        : 'bg-gradient-to-r from-amber-100 to-orange-100'
                    )}>
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-12 h-12 rounded-xl flex items-center justify-center text-2xl',
                          batch.status === 'baking' && 'bg-white/20 animate-pulse',
                          batch.status === 'completed' && 'bg-white/20',
                          batch.status === 'scheduled' && 'bg-white/50'
                        )}>
                          {batch.status === 'baking' ? '🔥' : 
                           batch.status === 'completed' ? '✅' : '⏰'}
                        </div>
                        <div>
                          <h3 className={cn(
                            'text-lg font-bold',
                            batch.status === 'scheduled' ? 'text-amber-800' : 'text-white'
                          )}>
                            第 {batch.batchNumber} 炉
                          </h3>
                          <p className={cn(
                            'text-sm',
                            batch.status === 'scheduled' ? 'text-amber-600' : 'text-white/80'
                          )}>
                            <Clock className="w-3.5 h-3.5 inline mr-1" />
                            {batch.startTime} - {batch.endTime}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'px-3 py-1 rounded-full text-sm font-medium',
                          statusInfo.color
                        )}>
                          {statusInfo.label}
                        </span>
                      </div>
                    </div>

                    <div className="p-5 bg-white">
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-600">容量使用</span>
                          <span className="text-sm text-gray-500">
                            {batch.usedCapacity} / {batch.capacity}
                          </span>
                        </div>
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-700',
                              loadPercent > 90 ? 'bg-gradient-to-r from-red-500 to-orange-500' :
                              loadPercent > 70 ? 'bg-gradient-to-r from-orange-500 to-amber-500' :
                              'bg-gradient-to-r from-amber-400 to-orange-400'
                            )}
                            style={{ width: `${loadPercent}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 mb-4">
                        {(Object.keys(batch.productSummary) as Array<keyof typeof batch.productSummary>).map(type => {
                          const info = PRODUCT_INFO[type];
                          return (
                            <div
                              key={type}
                              className="p-3 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl text-center"
                            >
                              <div className="text-2xl mb-1">{info.emoji}</div>
                              <div className="text-xl font-bold text-amber-700">
                                {batch.productSummary[type]}
                              </div>
                              <div className="text-xs text-gray-500">{info.name}</div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex gap-2 mb-4">
                        {batch.status === 'scheduled' && batch.usedCapacity > 0 && (
                          <button
                            onClick={() => handleStartBaking(batch.id)}
                            className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-medium hover:from-orange-600 hover:to-amber-600 transition-all flex items-center justify-center gap-2"
                          >
                            <Flame className="w-4 h-4" />
                            开始烘焙
                          </button>
                        )}
                        {batch.status === 'baking' && (
                          <button
                            onClick={() => handleCompleteBaking(batch.id)}
                            className="flex-1 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium hover:from-green-600 hover:to-emerald-600 transition-all flex items-center justify-center gap-2"
                          >
                            <CheckCircle className="w-4 h-4" />
                            烘焙完成
                          </button>
                        )}
                        {batch.usedCapacity > 0 && (
                          <button
                            onClick={() => handlePrintBatch(batch.id)}
                            className="px-4 py-2.5 border border-amber-300 text-amber-700 rounded-xl font-medium hover:bg-amber-50 transition-colors flex items-center gap-2"
                          >
                            <Printer className="w-4 h-4" />
                            打印
                          </button>
                        )}
                      </div>

                      {batchOrders.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            本炉订单 ({batchOrders.length})
                          </h4>
                          <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                            {batchOrders.map(order => (
                              <div key={order.id} className="relative">
                                <OrderCard
                                  order={order}
                                  onEdit={() => setEditingOrder(order)}
                                  showBatchInfo={false}
                                />
                                {batch.status === 'scheduled' && (
                                  <div className="absolute top-2 right-2">
                                    <select
                                      defaultValue={batch.id}
                                      onChange={(e) => handleAllocateBatch(order.id, e.target.value)}
                                      className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-1"
                                    >
                                      {dayBatches
                                        .filter(b => b.status === 'scheduled' && BatchAllocator.isBatchAvailable(b, BatchAllocator.calculateCapacity(order.items)))
                                        .map(b => (
                                          <option key={b.id} value={b.id}>
                                            改到第{b.batchNumber}炉
                                          </option>
                                        ))}
                                    </select>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {unassignedOrders.length > 0 && (
            <div className="mt-8 p-6 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200">
              <h3 className="font-semibold text-amber-800 mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5" />
                未分配批次的订单 ({unassignedOrders.length})
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {unassignedOrders.map(order => (
                  <div key={order.id} className="relative">
                    <OrderCard
                      order={order}
                      onEdit={() => setEditingOrder(order)}
                      showBatchInfo={false}
                    />
                    <div className="absolute top-2 right-2">
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAllocateBatch(order.id, e.target.value);
                            e.target.value = '';
                          }
                        }}
                        className="text-xs bg-white border border-amber-300 rounded-lg px-2 py-1 text-amber-700"
                      >
                        <option value="">分配到批次</option>
                        {dayBatches
                          .filter(b => b.status === 'scheduled' && BatchAllocator.isBatchAvailable(b, BatchAllocator.calculateCapacity(order.items)))
                          .map(b => (
                            <option key={b.id} value={b.id}>
                              第{b.batchNumber}炉 ({b.usedCapacity}/{b.capacity})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
