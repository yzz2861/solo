import { Plus, Calendar, Clock, Flame, Settings, Printer } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { ViewMode } from '@/types';
import { cn } from '@/lib/utils';

const viewOptions: { id: ViewMode; label: string; icon: typeof Calendar }[] = [
  { id: 'calendar', label: '月历', icon: Calendar },
  { id: 'day', label: '时段', icon: Clock },
  { id: 'batch', label: '批次', icon: Flame },
];

export const Header = () => {
  const { currentView, setCurrentView, setShowOrderModal, orders, selectedDate } = useAppStore();

  const todayOrders = orders.filter(o => o.pickupDate === selectedDate).length;
  const unpaidOrders = orders.filter(o => !o.isPaid).length;

  return (
    <header className="bg-white/80 backdrop-blur-lg border-b border-amber-100 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-3xl">🥖</span>
              <div>
                <h1 className="text-xl font-bold text-amber-900 font-serif">
                  面包预订日历
                </h1>
                <p className="text-xs text-gray-500">Bread Booking Calendar</p>
              </div>
            </div>
          </div>

          <nav className="flex items-center gap-1 bg-amber-50 p-1 rounded-xl">
            {viewOptions.map(option => {
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  onClick={() => setCurrentView(option.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    currentView === option.id
                      ? 'bg-white text-amber-700 shadow-sm'
                      : 'text-gray-600 hover:text-amber-700 hover:bg-white/50'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {option.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1 text-amber-600">
                <Calendar className="w-4 h-4" />
                <span>今日 <strong>{todayOrders}</strong> 单</span>
              </div>
              {unpaidOrders > 0 && (
                <div className="flex items-center gap-1 text-red-500">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span>待付款 <strong>{unpaidOrders}</strong></span>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowOrderModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg shadow-amber-200 hover:shadow-xl"
            >
              <Plus className="w-4 h-4" />
              新建订单
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
