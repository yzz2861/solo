import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import {
  Users,
  Plus,
  Search,
  Heart,
  Phone,
  Shield,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import type { RiggerStatus } from '@/types';

export default function RiderManagement() {
  const { riggers, addRigger, updateRigger, deleteRigger, currentActivityId } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<RiggerStatus | 'all'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRider, setNewRider] = useState({
    name: '',
    phone: '',
    group: '',
    emergencyContact: '',
    healthNotes: '',
    needsAttention: false,
  });

  const filteredRiders = riggers.filter((r) => {
    const matchesSearch =
      r.name.includes(searchTerm) || r.phone.includes(searchTerm) || (r.group || '').includes(searchTerm);
    const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleAddRider = () => {
    if (!newRider.name.trim() || !currentActivityId) return;

    addRigger({
      ...newRider,
      activityId: currentActivityId,
      status: 'active',
    });
    setNewRider({
      name: '',
      phone: '',
      group: '',
      emergencyContact: '',
      healthNotes: '',
      needsAttention: false,
    });
    setShowAddForm(false);
  };

  const toggleAttention = (id: string, currentValue: boolean) => {
    updateRigger(id, { needsAttention: !currentValue });
  };

  const getStatusStyle = (status: RiggerStatus) => {
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

  const getStatusLabel = (status: RiggerStatus) => {
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

  const statusCounts = {
    active: riggers.filter((r) => r.status === 'active').length,
    finished: riggers.filter((r) => r.status === 'finished').length,
    dropped: riggers.filter((r) => r.status === 'dropped').length,
    rescued: riggers.filter((r) => r.status === 'rescued').length,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">队员管理</h1>
          <p className="text-gray-500 mt-1">管理活动参与队员信息</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          添加队员
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">总人数</p>
              <p className="text-2xl font-bold text-gray-900">{riggers.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">骑行中</p>
              <p className="text-2xl font-bold text-green-600">{statusCounts.active}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">需关注</p>
              <p className="text-2xl font-bold text-amber-600">
                {riggers.filter((r) => r.needsAttention).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">已退赛</p>
              <p className="text-2xl font-bold text-red-600">{statusCounts.dropped}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="搜索队员姓名、电话、分组..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'finished', 'dropped', 'rescued'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === status
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {status === 'all' ? '全部' : getStatusLabel(status as RiggerStatus)}
            </button>
          ))}
        </div>
      </div>

      {showAddForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 animate-slide-in-up">
          <h3 className="font-semibold text-gray-900 mb-4">添加新队员</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">姓名 *</label>
              <input
                type="text"
                value={newRider.name}
                onChange={(e) => setNewRider({ ...newRider, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="队员姓名"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">电话 *</label>
              <input
                type="tel"
                value={newRider.phone}
                onChange={(e) => setNewRider({ ...newRider, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="手机号码"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">分组</label>
              <input
                type="text"
                value={newRider.group}
                onChange={(e) => setNewRider({ ...newRider, group: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="如：快队、中队、慢队"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">紧急联系人</label>
              <input
                type="text"
                value={newRider.emergencyContact}
                onChange={(e) => setNewRider({ ...newRider, emergencyContact: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="姓名 电话"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">健康注意事项</label>
              <input
                type="text"
                value={newRider.healthNotes}
                onChange={(e) => setNewRider({ ...newRider, healthNotes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="如：高血压、过敏史等"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newRider.needsAttention}
                  onChange={(e) => setNewRider({ ...newRider, needsAttention: e.target.checked })}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-600">需要重点关注</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowAddForm(false)} className="btn-secondary">
              取消
            </button>
            <button onClick={handleAddRider} className="btn-primary">
              添加
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-5 py-3 text-sm font-medium text-gray-500">队员</th>
                <th className="text-left px-5 py-3 text-sm font-medium text-gray-500">分组</th>
                <th className="text-left px-5 py-3 text-sm font-medium text-gray-500">状态</th>
                <th className="text-left px-5 py-3 text-sm font-medium text-gray-500">当前位置</th>
                <th className="text-left px-5 py-3 text-sm font-medium text-gray-500">上次签到</th>
                <th className="text-left px-5 py-3 text-sm font-medium text-gray-500">重点关注</th>
                <th className="text-right px-5 py-3 text-sm font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredRiders.map((rider) => (
                <tr key={rider.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
                          rider.avatarColor || 'bg-gray-400'
                        }`}
                      >
                        {rider.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{rider.name}</p>
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {rider.phone}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm text-gray-600">{rider.group || '-'}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`badge ${getStatusStyle(rider.status)}`}>
                      {getStatusLabel(rider.status)}
                    </span>
                    {rider.dropReason && (
                      <p className="text-xs text-gray-400 mt-1">{rider.dropReason}</p>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm text-gray-600">
                      {rider.currentPointId ? `点位 ${rider.currentPointId}` : '未出发'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm text-gray-500 flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {rider.lastCheckinTime
                        ? new Date(rider.lastCheckinTime).toLocaleTimeString('zh-CN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '-'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => toggleAttention(rider.id, rider.needsAttention)}
                      className={`p-2 rounded-lg transition-colors ${
                        rider.needsAttention
                          ? 'bg-red-100 text-red-600'
                          : 'bg-gray-100 text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      <Heart className="w-5 h-5" fill={rider.needsAttention ? 'currentColor' : 'none'} />
                    </button>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteRigger(rider.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredRiders.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">暂无队员数据</p>
          </div>
        )}
      </div>
    </div>
  );
}
