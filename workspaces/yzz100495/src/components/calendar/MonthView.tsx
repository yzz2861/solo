import { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { format, addMonths, isSameMonth, isToday, isSameDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useAppStore } from '@/store/useAppStore';
import { getDaysInMonth, formatDate } from '@/utils/dateUtils';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export const MonthView = () => {
  const { orders, selectedDate, setSelectedDate, setCurrentView, setShowOrderModal } = useAppStore();
  
  const currentMonth = useMemo(() => new Date(selectedDate), [selectedDate]);
  const days = useMemo(() => getDaysInMonth(currentMonth), [currentMonth]);

  const getDayOrderCount = (date: Date) => {
    const dateStr = formatDate(date);
    return orders.filter(o => o.pickupDate === dateStr).length;
  };

  const getDayOrderSummary = (date: Date) => {
    const dateStr = formatDate(date);
    const dayOrders = orders.filter(o => o.pickupDate === dateStr);
    
    const unpaid = dayOrders.filter(o => !o.isPaid).length;
    const ready = dayOrders.filter(o => o.status === 'ready').length;
    const preparing = dayOrders.filter(o => o.status === 'preparing').length;
    const noShow = dayOrders.filter(o => o.status === 'noShow').length;
    
    return { total: dayOrders.length, unpaid, ready, preparing, noShow };
  };

  const handlePrevMonth = () => {
    setSelectedDate(formatDate(addMonths(currentMonth, -1)));
  };

  const handleNextMonth = () => {
    setSelectedDate(formatDate(addMonths(currentMonth, 1)));
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(formatDate(date));
    setCurrentView('day');
  };

  const handleQuickAdd = (date: Date, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDate(formatDate(date));
    setShowOrderModal(true);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-between">
        <button
          onClick={handlePrevMonth}
          className="p-2 hover:bg-white/20 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <h2 className="text-xl font-bold text-white font-serif">
          {format(currentMonth, 'yyyy年 M月', { locale: zhCN })}
        </h2>
        <button
          onClick={handleNextMonth}
          className="p-2 hover:bg-white/20 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-white" />
        </button>
      </div>

      <div className="grid grid-cols-7 border-b border-amber-100">
        {WEEKDAYS.map(day => (
          <div
            key={day}
            className="py-3 text-center text-sm font-medium text-amber-700 bg-amber-50"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((date, index) => {
          const isCurrentMonth = isSameMonth(date, currentMonth);
          const isSelected = isSameDay(date, selectedDate);
          const isTodayDate = isToday(date);
          const summary = getDayOrderSummary(date);
          const dateStr = formatDate(date);

          return (
            <div
              key={index}
              onClick={() => isCurrentMonth && handleDayClick(date)}
              className={cn(
                'min-h-[120px] p-2 border-b border-r border-amber-50 transition-all cursor-pointer group',
                !isCurrentMonth && 'bg-gray-50 opacity-50 cursor-default',
                isSelected && 'bg-amber-50',
                isCurrentMonth && !isSelected && 'hover:bg-amber-50/50'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={cn(
                  'w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium',
                  isTodayDate && 'bg-amber-500 text-white',
                  isSelected && !isTodayDate && 'bg-amber-100 text-amber-700',
                  !isCurrentMonth && 'text-gray-400'
                )}>
                  {format(date, 'd')}
                </span>
                {isCurrentMonth && summary.total > 0 && (
                  <button
                    onClick={(e) => handleQuickAdd(date, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-amber-100 rounded transition-all"
                    title="快速添加订单"
                  >
                    <Plus className="w-4 h-4 text-amber-600" />
                  </button>
                )}
              </div>

              {summary.total > 0 && (
                <div className="space-y-1">
                  <div className="text-lg font-bold text-amber-700 text-center">
                    {summary.total} 单
                  </div>
                  <div className="flex justify-center gap-1 flex-wrap">
                    {summary.unpaid > 0 && (
                      <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs rounded">
                        待付{summary.unpaid}
                      </span>
                    )}
                    {summary.preparing > 0 && (
                      <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">
                        烘焙{summary.preparing}
                      </span>
                    )}
                    {summary.ready > 0 && (
                      <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                        待取{summary.ready}
                      </span>
                    )}
                    {summary.noShow > 0 && (
                      <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded">
                        爽约{summary.noShow}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
