import { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Printer, Package, Users, AlertTriangle } from 'lucide-react';
import { addDays } from 'date-fns';
import { useAppStore } from '@/store/useAppStore';
import { formatDateDisplay, formatDate, getTimeSlots, isPeakHour } from '@/utils/dateUtils';
import { OrderCard } from '@/components/order/OrderCard';
import { generatePickupListHTML, generatePackingListHTML, printHTML } from '@/utils/printUtils';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

export const DayView = () => {
  const { orders, batches, selectedDate, config, setSelectedDate, setEditingOrder, currentView, setCurrentView } = useAppStore();
  const { showToast } = useToast();

  const dayOrders = useMemo(() => {
    return orders.filter(o => o.pickupDate === selectedDate);
  }, [orders, selectedDate]);

  const timeSlots = useMemo(() => getTimeSlots(config), [config]);

  const ordersBySlot = useMemo(() => {
    const grouped = new Map<string, typeof dayOrders>();
    timeSlots.forEach(slot => grouped.set(slot, []));
    dayOrders.forEach(order => {
      const slot = order.timeSlot;
      if (grouped.has(slot)) {
        grouped.get(slot)!.push(order);
      }
    });
    return grouped;
  }, [dayOrders, timeSlots]);

  const dayBatches = useMemo(() => {
    return batches.filter(b => b.bakingDate === selectedDate);
  }, [batches, selectedDate]);

  const handlePrevDay = () => {
    const prev = addDays(new Date(selectedDate), -1);
    setSelectedDate(formatDate(prev));
  };

  const handleNextDay = () => {
    const next = addDays(new Date(selectedDate), 1);
    setSelectedDate(formatDate(next));
  };

  const handlePrintPickup = () => {
    if (dayOrders.length === 0) {
      showToast('今日没有订单', 'warning');
      return;
    }
    const html = generatePickupListHTML(dayOrders, selectedDate);
    printHTML(html);
  };

  const handlePrintPacking = () => {
    if (dayOrders.length === 0) {
      showToast('今日没有订单', 'warning');
      return;
    }
    const html = generatePackingListHTML(dayOrders, selectedDate);
    printHTML(html);
  };

  const totalOrders = dayOrders.length;
  const totalItems = dayOrders.reduce((sum, o) => 
    sum + o.items.reduce((s, i) => s + i.quantity, 0), 0
  );
  const unpaidCount = dayOrders.filter(o => !o.isPaid).length;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handlePrevDay}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-white font-serif">
                {formatDateDisplay(selectedDate)}
              </h2>
              <div className="flex items-center gap-4 text-amber-100 text-sm">
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {totalOrders} 位顾客
                </span>
                <span className="flex items-center gap-1">
                  <Package className="w-4 h-4" />
                  {totalItems} 件产品
                </span>
                {unpaidCount > 0 && (
                  <span className="flex items-center gap-1 text-red-200">
                    <AlertTriangle className="w-4 h-4" />
                    {unpaidCount} 单待付款
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrintPickup}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
            >
              <Printer className="w-4 h-4" />
              取货清单
            </button>
            <button
              onClick={handlePrintPacking}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
            >
              <Printer className="w-4 h-4" />
              包装清单
            </button>
            <button
              onClick={handleNextDay}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {dayBatches.length > 0 && (
            <div className="mb-6 p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-100">
              <h3 className="font-semibold text-orange-800 mb-3 flex items-center gap-2">
                🔥 今日烤炉安排
              </h3>
              <div className="flex flex-wrap gap-3">
                {dayBatches.map(batch => {
                  const loadPercent = Math.round((batch.usedCapacity / batch.capacity) * 100);
                  return (
                    <div
                      key={batch.id}
                      onClick={() => {
                        setCurrentView('batch');
                      }}
                      className={cn(
                        'flex-1 min-w-[200px] p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md',
                        batch.status === 'baking' 
                          ? 'bg-gradient-to-r from-orange-100 to-amber-100 border-orange-300' 
                          : batch.status === 'completed'
                          ? 'bg-green-50 border-green-200'
                          : 'bg-white border-gray-200'
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-gray-800">第{batch.batchNumber}炉</span>
                        <span className={cn(
                          'px-2 py-0.5 text-xs font-medium rounded-full',
                          batch.status === 'baking' ? 'bg-orange-200 text-orange-800' :
                          batch.status === 'completed' ? 'bg-green-200 text-green-800' :
                          'bg-gray-200 text-gray-600'
                        )}>
                          {batch.status === 'baking' ? '烘焙中' : 
                           batch.status === 'completed' ? '已完成' : '待烘焙'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        {batch.startTime} - {batch.endTime}
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-500',
                            loadPercent > 90 ? 'bg-red-500' : 
                            loadPercent > 70 ? 'bg-orange-500' : 'bg-amber-500'
                          )}
                          style={{ width: `${loadPercent}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-1 text-xs text-gray-500">
                        <span>
                          🥖{batch.productSummary.baguette} 
                          🍞{batch.productSummary.toast} 
                          🎂{batch.productSummary.cake}
                        </span>
                        <span>{batch.usedCapacity}/{batch.capacity}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-6">
            {timeSlots.map(slot => {
              const slotOrders = ordersBySlot.get(slot) || [];
              const isPeak = isPeakHour(slot, config.peakHours);
              
              return (
                <div
                  key={slot}
                  className={cn(
                    'rounded-xl border overflow-hidden',
                    isPeak ? 'border-orange-300' : 'border-gray-200'
                  )}
                >
                  <div className={cn(
                    'px-4 py-3 flex items-center justify-between',
                    isPeak 
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white'
                      : 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800'
                  )}>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold">{slot}</span>
                      {isPeak && (
                        <span className="px-2 py-0.5 bg-white/30 rounded-full text-xs font-medium">
                          🔥 热门时段
                        </span>
                      )}
                    </div>
                    <span className="text-sm">
                      {slotOrders.length} 单
                      {slotOrders.some(o => !o.isPaid) && (
                        <span className="ml-2 text-red-100">
                          ({slotOrders.filter(o => !o.isPaid).length} 待付)
                        </span>
                      )}
                    </span>
                  </div>
                  
                  <div className="p-4 bg-white">
                    {slotOrders.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        暂无订单
                      </div>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2">
                        {slotOrders.map(order => (
                          <OrderCard
                            key={order.id}
                            order={order}
                            onEdit={() => setEditingOrder(order)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
