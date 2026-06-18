import { useState, useEffect } from 'react';
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
  Bell,
  ChevronRight,
  RefreshCw,
  Navigation,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LeaderView() {
  const {
    getCurrentActivity,
    getRoutePointsOrdered,
    riggers,
    supplyItems,
    alerts,
    getUnreadAlertsCount,
    checkinRecords,
    rescueRecords,
    getOverdueRiggers,
    markAllAlertsRead,
  } = useAppStore();

  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const activity = getCurrentActivity();
  const routePoints = getRoutePointsOrdered();
  const unreadCount = getUnreadAlertsCount();
  const overdueRiggers = getOverdueRiggers();

  const activeRiggers = riggers.filter((r) => r.status === 'active').length;
  const finishedRiggers = riggers.filter((r) => r.status === 'finished').length;
  const droppedRiggers = riggers.filter((r) => r.status === 'dropped').length;
  const pendingRescues = rescueRecords.filter((r) => r.status === 'pending').length;

  const lowStockItems = supplyItems.filter(
    (item) => item.lowStockThreshold && item.quantity <= item.lowStockThreshold
  ).length;

  const handleRefresh = () => {
    setIsRefreshing(true);
    setLastUpdate(new Date());
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const getRiggersAtPoint = (pointId: string) => {
    return riggers.filter((r) => r.currentPointId === pointId && r.status === 'active');
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'danger':
        return 'bg-red-100 text-red-700 border-l-4 border-red-500';
      case 'warning':
        return 'bg-amber-100 text-amber-700 border-l-4 border-amber-500';
      default:
        return 'bg-blue-100 text-blue-700 border-l-4 border-blue-500';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            领队实时监控
          </h1>
          <p className="text-gray-500 mt-1">
            {activity?.name} · 最后更新: {lastUpdate.toLocaleTimeString('zh-CN')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            刷新
          </button>
          <Link to="/rescue" className="relative btn-primary flex items-center gap-2">
            <Bell className="w-4 h-4" />
            提醒中心
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {overdueRiggers.length > 0 && (
        <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-2xl p-5 animate-slide-in-up">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-8 h-8 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-bold text-lg">超时预警</h3>
              <p className="text-white/90 mt-1">
                有 {overdueRiggers.length} 名队员长时间未到达下一点位
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {overdueRiggers.slice(0, 5).map((r) => (
                  <span
                    key={r.id}
                    className="px-3 py-1 bg-white/20 rounded-full text-sm"
                  >
                    {r.name}
                  </span>
                ))}
                {overdueRiggers.length > 5 && (
                  <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
                    +{overdueRiggers.length - 5} 人
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={markAllAlertsRead}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
            >
              全部已读
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm">进行中队员</p>
              <p className="text-3xl font-bold mt-1">{activeRiggers}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 text-sm text-white/70">
            共 {riggers.length} 人参加
          </div>
        </div>

        <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm">已完成</p>
              <p className="text-3xl font-bold mt-1">{finishedRiggers}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 text-sm text-white/70">
            {riggers.length > 0
              ? `完成率 ${((finishedRiggers / riggers.length) * 100).toFixed(0)}%`
              : '-'}
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm">库存预警</p>
              <p className="text-3xl font-bold mt-1">{lowStockItems}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 text-sm text-white/70">
            物资库存不足
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm">待处理求助</p>
              <p className="text-3xl font-bold mt-1">{pendingRescues}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 text-sm text-white/70">
            {droppedRiggers} 人已退赛
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-900">路线进度实时跟踪</h2>
            <Link
              to="/routes"
              className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
            >
              路线管理 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-4">
            {routePoints.map((point, index) => {
              const riggersAtPoint = getRiggersAtPoint(point.id);
              const isLast = index === routePoints.length - 1;

              return (
                <div key={point.id} className="relative">
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${
                          point.type === 'start'
                            ? 'bg-green-500'
                            : point.type === 'end'
                            ? 'bg-primary-600'
                            : point.type === 'supply'
                            ? 'bg-amber-500'
                            : 'bg-blue-500'
                        } ${riggersAtPoint.length > 0 ? 'animate-pulse-ring' : ''}`}
                      >
                        {index + 1}
                      </div>
                      {!isLast && (
                        <div className="w-0.5 h-12 bg-gray-200 mt-1" />
                      )}
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">{point.name}</h3>
                          <p className="text-sm text-gray-500">
                            {point.distance}km · 预计 {point.estimatedArrival}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">
                            {riggersAtPoint.length} 人在此处
                          </span>
                          <div className="flex -space-x-2">
                            {riggersAtPoint.slice(0, 3).map((r) => (
                              <div
                                key={r.id}
                                className={`w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-medium ${
                                  r.avatarColor || 'bg-gray-400'
                                }`}
                              >
                                {r.name.charAt(0)}
                              </div>
                            ))}
                            {riggersAtPoint.length > 3 && (
                              <div className="w-7 h-7 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-medium">
                                +{riggersAtPoint.length - 3}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">最新提醒</h2>
              <span className="text-xs text-gray-400">
                {alerts.slice(0, 5).length} 条
              </span>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-thin">
              {alerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-xl ${getSeverityStyle(alert.severity)} ${
                    !alert.read ? 'ring-2 ring-offset-1' : ''
                  }`}
                >
                  <p className="font-medium text-sm">{alert.title}</p>
                  <p className="text-xs opacity-80 mt-1">{alert.message}</p>
                  <p className="text-xs opacity-60 mt-2">
                    {new Date(alert.timestamp).toLocaleTimeString('zh-CN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">快速操作</h2>
            <div className="space-y-2">
              <Link
                to="/checkin"
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Navigation className="w-5 h-5 text-primary-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">签到记录</p>
                  <p className="text-xs text-gray-500">查看所有签到</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </Link>
              <Link
                to="/supplies"
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">补给管理</p>
                  <p className="text-xs text-gray-500">物资库存和发放</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </Link>
              <Link
                to="/rescue"
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">求助救援</p>
                  <p className="text-xs text-gray-500">处理求助和退赛</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
