import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import {
  Heart,
  AlertTriangle,
  User,
  Phone,
  Shield,
  Clock,
  MapPin,
  ChevronRight,
  FileText,
  Stethoscope,
  Pill,
  Activity,
} from 'lucide-react';

export default function MedicView() {
  const { riggers, rescueRecords, checkinRecords, getRoutePointsOrdered } = useAppStore();
  const [selectedRider, setSelectedRider] = useState<string | null>(null);
  const routePoints = getRoutePointsOrdered();

  const attentionRiders = riggers.filter((r) => r.needsAttention);
  const activeAttentionRiders = attentionRiders.filter((r) => r.status === 'active');
  const droppedOrRescued = attentionRiders.filter(
    (r) => r.status === 'dropped' || r.status === 'rescued'
  );

  const getRiderRescues = (riderId: string) => {
    return rescueRecords.filter((r) => r.riggerId === riderId);
  };

  const getRiderCheckins = (riderId: string) => {
    return checkinRecords
      .filter((c) => c.riggerId === riderId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const getPointName = (pointId: string) => {
    return routePoints.find((p) => p.id === pointId)?.name || '未知点位';
  };

  const selectedRiderData = selectedRider
    ? riggers.find((r) => r.id === selectedRider)
    : null;

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'finished':
        return 'bg-primary-100 text-primary-700';
      case 'dropped':
        return 'bg-red-100 text-red-700';
      case 'rescued':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return '骑行中';
      case 'finished':
        return '已完成';
      case 'dropped':
        return '已退赛';
      case 'rescued':
        return '已救援';
      default:
        return status;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Heart className="w-7 h-7 text-rose-500" />
            队医工作台
          </h1>
          <p className="text-gray-500 mt-1">重点关注队员健康状态</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-rose-50 rounded-xl">
          <Stethoscope className="w-5 h-5 text-rose-500" />
          <span className="text-sm font-medium text-rose-700">医疗模式</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm">需重点关注</p>
              <p className="text-3xl font-bold mt-1">{attentionRiders.length}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Heart className="w-6 h-6" />
            </div>
          </div>
          <p className="text-sm text-white/70 mt-3">有健康注意事项的队员</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">骑行中</p>
              <p className="text-2xl font-bold text-green-600">{activeAttentionRiders.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">退赛/救援</p>
              <p className="text-2xl font-bold text-red-600">{droppedOrRescued.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <Pill className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">医疗求助</p>
              <p className="text-2xl font-bold text-amber-600">
                {rescueRecords.filter((r) => r.type === 'help' && r.status !== 'resolved').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">重点关注队员</h2>
              <p className="text-sm text-gray-500 mt-1">
                点击队员查看详细健康信息和记录
              </p>
            </div>

            <div className="divide-y divide-gray-50">
              {attentionRiders.length === 0 ? (
                <div className="text-center py-12">
                  <Heart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">暂无需要重点关注的队员</p>
                </div>
              ) : (
                attentionRiders.map((rider) => {
                  const riderRescues = getRiderRescues(rider.id);
                  const riderCheckins = getRiderCheckins(rider.id);
                  const isSelected = selectedRider === rider.id;

                  return (
                    <div
                      key={rider.id}
                      onClick={() => setSelectedRider(isSelected ? null : rider.id)}
                      className={`p-4 cursor-pointer transition-colors ${
                        isSelected ? 'bg-rose-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-medium ${
                              rider.avatarColor || 'bg-gray-400'
                            }`}
                          >
                            {rider.name.charAt(0)}
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center">
                            <Heart className="w-3 h-3 text-white" />
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-900">{rider.name}</h3>
                            <span className={`badge ${getStatusStyle(rider.status)}`}>
                              {getStatusLabel(rider.status)}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Phone className="w-4 h-4" />
                              {rider.phone}
                            </span>
                            {rider.group && (
                              <span className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                {rider.group}
                              </span>
                            )}
                          </div>
                          {rider.healthNotes && (
                            <div className="mt-2 flex items-start gap-2 p-2 bg-amber-50 rounded-lg">
                              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                              <p className="text-sm text-amber-700">{rider.healthNotes}</p>
                            </div>
                          )}
                        </div>

                        <div className="text-right">
                          <p className="text-sm text-gray-600">
                            {rider.currentPointId
                              ? getPointName(rider.currentPointId).split('：')[1] ||
                                getPointName(rider.currentPointId)
                              : '未出发'}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {rider.lastCheckinTime
                              ? new Date(rider.lastCheckinTime).toLocaleTimeString('zh-CN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '-'}
                          </p>
                        </div>

                        <ChevronRight
                          className={`w-5 h-5 text-gray-400 transition-transform ${
                            isSelected ? 'rotate-90' : ''
                          }`}
                        />
                      </div>

                      {isSelected && (
                        <div className="mt-4 ml-16 grid grid-cols-2 gap-4">
                          {rider.emergencyContact && (
                            <div className="p-3 bg-gray-50 rounded-xl">
                              <p className="text-xs text-gray-500 mb-1">紧急联系人</p>
                              <p className="text-sm font-medium text-gray-700">
                                {rider.emergencyContact}
                              </p>
                            </div>
                          )}
                          <div className="p-3 bg-gray-50 rounded-xl">
                            <p className="text-xs text-gray-500 mb-1">签到次数</p>
                            <p className="text-sm font-medium text-gray-700">
                              {riderCheckins.length} 次
                            </p>
                          </div>
                          <div className="p-3 bg-gray-50 rounded-xl">
                            <p className="text-xs text-gray-500 mb-1">求助/救援记录</p>
                            <p className="text-sm font-medium text-gray-700">
                              {riderRescues.length} 次
                            </p>
                          </div>
                          <div className="p-3 bg-gray-50 rounded-xl">
                            <p className="text-xs text-gray-500 mb-1">联系电话</p>
                            <a
                              href={`tel:${rider.phone}`}
                              className="text-sm font-medium text-primary-600 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {rider.phone}
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-600" />
              医疗记录
            </h3>
            <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-thin">
              {rescueRecords
                .filter((r) => r.type === 'help')
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, 8)
                .map((record) => {
                  const rider = riggers.find((r) => r.id === record.riggerId);
                  return (
                    <div
                      key={record.id}
                      className="p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium ${
                            rider?.avatarColor || 'bg-gray-400'
                          }`}
                        >
                          {rider?.name.charAt(0) || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {rider?.name || '未知'}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{record.description}</p>
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            record.status === 'resolved'
                              ? 'bg-green-100 text-green-700'
                              : record.status === 'processing'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {record.status === 'resolved'
                            ? '已解决'
                            : record.status === 'processing'
                            ? '处理中'
                            : '待处理'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              {rescueRecords.filter((r) => r.type === 'help').length === 0 && (
                <p className="text-center text-gray-400 text-sm py-4">暂无医疗求助记录</p>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-2xl p-5 border border-rose-100">
            <h3 className="font-semibold text-gray-900 mb-3">医疗提示</h3>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Heart className="w-4 h-4 text-rose-500 mt-0.5" />
                <p className="text-sm text-gray-700">
                  老王有高血压，需定时服药，请关注其状态
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Heart className="w-4 h-4 text-rose-500 mt-0.5" />
                <p className="text-sm text-gray-700">
                  大刘有膝盖旧伤，长时间骑行需注意休息
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
