import { useAppStore } from '@/store/useAppStore';
import {
  Users,
  MapPin,
  Package,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Navigation,
  LifeBuoy,
  Heart,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const {
    getCurrentActivity,
    getRoutePointsOrdered,
    riggers,
    supplyItems,
    alerts,
    getUnreadAlertsCount,
    checkinRecords,
    rescueRecords,
  } = useAppStore();

  const activity = getCurrentActivity();
  const routePoints = getRoutePointsOrdered();
  const unreadCount = getUnreadAlertsCount();

  const activeRiggers = riggers.filter((r) => r.status === 'active').length;
  const finishedRiggers = riggers.filter((r) => r.status === 'finished').length;
  const droppedRiggers = riggers.filter((r) => r.status === 'dropped').length;
  const rescuedRiggers = riggers.filter((r) => r.status === 'rescued').length;

  const totalSupplyItems = supplyItems.reduce((sum, item) => sum + item.initialQuantity, 0);
  const remainingSupply = supplyItems.reduce((sum, item) => sum + item.quantity, 0);

  const lowStockItems = supplyItems.filter(
    (item) => item.lowStockThreshold && item.quantity <= item.lowStockThreshold
  ).length;

  const todayCheckins = checkinRecords.filter(
    (c) => new Date(c.timestamp).toDateString() === new Date().toDateString()
  ).length;

  const pendingRescues = rescueRecords.filter((r) => r.status === 'pending').length;

  const stats = [
    {
      label: '活动中队员',
      value: activeRiggers,
      total: riggers.length,
      icon: Users,
      color: 'bg-teal-500',
      bgColor: 'bg-teal-50',
      textColor: 'text-teal-700',
    },
    {
      label: '路线点位',
      value: routePoints.length,
      icon: MapPin,
      color: 'bg-cyan-500',
      bgColor: 'bg-cyan-50',
      textColor: 'text-cyan-700',
    },
    {
      label: '物资库存',
      value: remainingSupply,
      total: totalSupplyItems,
      icon: Package,
      color: 'bg-emerald-500',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-700',
    },
    {
      label: '未读提醒',
      value: unreadCount,
      icon: AlertTriangle,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-700',
    },
  ];

  const recentAlerts = alerts.slice(0, 5);

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'danger':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'warning':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{activity?.name || '活动总览'}</h1>
          <p className="text-gray-500 mt-1">
            {activity?.date} · {activity?.description}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              activity?.status === 'ongoing'
                ? 'bg-green-100 text-green-700'
                : activity?.status === 'completed'
                ? 'bg-gray-100 text-gray-700'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            {activity?.status === 'ongoing'
              ? '进行中'
              : activity?.status === 'completed'
              ? '已结束'
              : '筹备中'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-2xl p-5 border border-gray-100 card-hover"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {stat.value}
                  {stat.total !== undefined && (
                    <span className="text-lg text-gray-400 font-normal">/{stat.total}</span>
                  )}
                </p>
              </div>
              <div className={`${stat.color} p-3 rounded-xl text-white`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">路线进度</h2>
            <Link
              to="/routes"
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              查看详情
            </Link>
          </div>
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              {routePoints.map((point, index) => (
                <div key={point.id} className="flex flex-col items-center relative flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium z-10 ${
                      point.type === 'start'
                        ? 'bg-green-500'
                        : point.type === 'end'
                        ? 'bg-primary-600'
                        : point.type === 'supply'
                        ? 'bg-amber-500'
                        : 'bg-gray-400'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <p className="text-xs text-gray-600 mt-2 text-center max-w-[80px] truncate">
                    {point.name.split('：')[1] || point.name}
                  </p>
                  <p className="text-xs text-gray-400">{point.distance}km</p>
                  {index < routePoints.length - 1 && (
                    <div className="absolute top-5 left-1/2 w-full h-1 bg-gray-200 -z-0" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-gray-100">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span className="text-xl font-bold">{finishedRiggers}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">已完成</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-primary-600">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xl font-bold">{activeRiggers}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">进行中</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-red-500">
                <XCircle className="w-4 h-4" />
                <span className="text-xl font-bold">{droppedRiggers + rescuedRiggers}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">退赛/救援</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">最新提醒</h2>
            <Link
              to="/rescue"
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              全部
            </Link>
          </div>
          <div className="space-y-3">
            {recentAlerts.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">暂无提醒</p>
            ) : (
              recentAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-xl border ${getSeverityStyle(alert.severity)} ${
                    !alert.read ? 'ring-2 ring-offset-1 ring-primary-300' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{alert.title}</p>
                      <p className="text-xs opacity-80 mt-0.5">{alert.message}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">今日签到</h2>
            <Link
              to="/checkin"
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              查看记录
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold text-gray-900">{todayCheckins}</div>
            <div>
              <p className="text-sm text-gray-500">次签到记录</p>
              <p className="text-xs text-gray-400 mt-1">
                平均每人 {riggers.length > 0 ? (todayCheckins / riggers.length).toFixed(1) : 0} 次
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">待处理事项</h2>
            <Link
              to="/rescue"
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              处理
            </Link>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl">
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-amber-600" />
                <span className="text-sm text-amber-800">库存预警</span>
              </div>
              <span className="text-sm font-bold text-amber-700">{lowStockItems} 项</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
              <div className="flex items-center gap-3">
                <LifeBuoy className="w-5 h-5 text-red-600" />
                <span className="text-sm text-red-800">待处理求助</span>
              </div>
              <span className="text-sm font-bold text-red-700">{pendingRescues} 条</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/leader" className="block">
          <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl p-5 text-white card-hover h-full">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Navigation className="w-5 h-5" />
              </div>
              <h3 className="font-semibold">领队视图</h3>
            </div>
            <p className="text-sm text-white/80">全局监控活动状态，实时处理异常</p>
          </div>
        </Link>
        <Link to="/supply-vehicle" className="block">
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 text-white card-hover h-full">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-semibold">补给车视图</h3>
            </div>
            <p className="text-sm text-white/80">按导航顺序查看物资配送清单</p>
          </div>
        </Link>
        <Link to="/medic" className="block">
          <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl p-5 text-white card-hover h-full">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Heart className="w-5 h-5" />
              </div>
              <h3 className="font-semibold">队医视图</h3>
            </div>
            <p className="text-sm text-white/80">重点关注队员健康状态</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
