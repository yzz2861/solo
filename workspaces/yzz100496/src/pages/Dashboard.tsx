import { useStore } from '@/store/useStore';
import { 
  Users, 
  DollarSign, 
  FileCheck, 
  FilePlus,
  AlertTriangle,
  Calendar,
  ArrowRight,
  TrendingUp,
  CreditCard,
  Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCurrency, formatDate } from '@/utils';
import { STATUS_LABELS } from '@/types';

export default function Dashboard() {
  const { registrations, reminders, trips, currentTripId } = useStore();
  
  const currentTrip = trips.find(t => t.id === currentTripId);
  
  const activeRegistrations = registrations.filter(
    r => r.status !== 'cancelled' && r.status !== 'refunded' && r.status !== 'departed'
  );
  
  const fullyPaidCount = registrations.filter(r => r.status === 'fully_paid').length;
  const pendingPaymentCount = registrations.filter(
    r => r.status === 'deposit_paid' || r.status === 'confirmed'
  ).length;
  
  const totalRevenue = registrations.reduce((sum, r) => {
    const paid = r.payments.reduce((s, p) => s + p.amount, 0);
    return sum + paid;
  }, 0);
  
  const unreadReminders = reminders.filter(r => !r.read);
  
  const upcomingTrips = trips.filter(t => t.status === 'upcoming').slice(0, 3);
  
  const recentRegistrations = [...registrations]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const stats = [
    { 
      label: '有效报名', 
      value: activeRegistrations.length, 
      icon: Users, 
      color: 'text-primary-600',
      bgColor: 'bg-primary-50'
    },
    { 
      label: '已付清', 
      value: fullyPaidCount, 
      icon: FileCheck, 
      color: 'text-success-600',
      bgColor: 'bg-success-50'
    },
    { 
      label: '待收尾款', 
      value: pendingPaymentCount, 
      icon: CreditCard, 
      color: 'text-amber-600',
      bgColor: 'bg-amber-50'
    },
    { 
      label: '累计收款', 
      value: formatCurrency(totalRevenue), 
      icon: DollarSign, 
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50'
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-warm-800">工作台</h1>
          <p className="text-warm-500 mt-1">欢迎回来，今天是 {formatDate(new Date(), 'YYYY年MM月DD日')}</p>
        </div>
        <Link to="/registration/new" className="btn-primary">
          <FilePlus size={18} />
          新建报名
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div 
              key={index} 
              className="card p-5 hover:shadow-card transition-shadow duration-300"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-warm-500 text-sm">{stat.label}</p>
                  <p className="text-2xl font-bold text-warm-800 mt-2">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                  <Icon size={24} className={stat.color} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-warm-800">即将出发的团期</h2>
              <Link to="/settings" className="text-primary-600 text-sm hover:text-primary-700 flex items-center gap-1">
                查看全部 <ArrowRight size={14} />
              </Link>
            </div>
            <div className="space-y-3">
              {upcomingTrips.map(trip => (
                <div 
                  key={trip.id} 
                  className="flex items-center gap-4 p-4 bg-warm-50 rounded-xl hover:bg-warm-100 transition-colors cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                    <Calendar size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-warm-800 truncate">{trip.name}</h3>
                    <p className="text-sm text-warm-500">
                      {formatDate(trip.startDate)} - {formatDate(trip.endDate)} · {trip.destination}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm text-warm-500">基准价</p>
                    <p className="font-semibold text-primary-600">{formatCurrency(trip.basePrice)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-warm-800">最近报名</h2>
              <Link to="/list" className="text-primary-600 text-sm hover:text-primary-700 flex items-center gap-1">
                查看全部 <ArrowRight size={14} />
              </Link>
            </div>
            <div className="space-y-3">
              {recentRegistrations.map(reg => (
                <Link 
                  key={reg.id} 
                  to={`/registration/${reg.id}`}
                  className="flex items-center gap-4 p-3 hover:bg-warm-50 rounded-xl transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium flex-shrink-0">
                    {reg.familyName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-warm-800 truncate">{reg.familyName}</h3>
                    <p className="text-sm text-warm-500">
                      {reg.members.length}人 · {reg.tripName}
                    </p>
                  </div>
                  <div className={`badge ${getStatusBadge(reg.status)} flex-shrink-0`}>
                    {STATUS_LABELS[reg.status]}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-warm-800">待处理提醒</h2>
              <span className="badge-danger">{unreadReminders.length} 条</span>
            </div>
            {unreadReminders.length === 0 ? (
              <div className="text-center py-8 text-warm-400">
                <AlertTriangle size={40} className="mx-auto mb-2 opacity-50" />
                <p>暂无待处理提醒</p>
              </div>
            ) : (
              <div className="space-y-3">
                {unreadReminders.slice(0, 5).map(reminder => (
                  <Link 
                    key={reminder.id}
                    to="/reminders"
                    className={`p-3 rounded-lg border-l-4 ${getReminderBorderClass(reminder.level)} bg-warm-50 hover:bg-warm-100 transition-colors`}
                  >
                    <p className="font-medium text-warm-800 text-sm">{reminder.title}</p>
                    <p className="text-xs text-warm-500 mt-1 line-clamp-2">{reminder.description}</p>
                  </Link>
                ))}
              </div>
            )}
            <Link to="/reminders" className="btn-ghost w-full mt-4 text-sm">
              查看全部提醒
            </Link>
          </div>

          <div className="card p-6 bg-gradient-to-br from-primary-500 to-primary-700 text-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <TrendingUp size={20} />
              </div>
              <h2 className="font-semibold">快速操作</h2>
            </div>
            <div className="space-y-2">
              <Link to="/register" className="block w-full py-2 px-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm">
                快速新建报名
              </Link>
              <Link to="/list" className="block w-full py-2 px-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm">
                管理所有报名
              </Link>
              <Link to="/export" className="block w-full py-2 px-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm">
                导出数据报表
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getStatusBadge(status: string): string {
  const map: Record<string, string> = {
    pending: 'badge-warning',
    confirmed: 'badge-primary',
    deposit_paid: 'badge-primary',
    fully_paid: 'badge-success',
    departed: 'badge-gray',
    cancelled: 'badge-danger',
    refunded: 'badge-gray',
  };
  return map[status] || 'badge-gray';
}

function getReminderBorderClass(level: string): string {
  const map: Record<string, string> = {
    info: 'border-blue-500',
    warning: 'border-amber-500',
    error: 'border-red-500',
  };
  return map[level] || map.info;
}
