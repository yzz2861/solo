import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import {
  LifeBuoy,
  AlertTriangle,
  Clock,
  User,
  MapPin,
  Plus,
  CheckCircle,
  XCircle,
  MessageSquare,
  Phone,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { RescueType, RescueStatus } from '@/types';

export default function RescueManagement() {
  const {
    rescueRecords,
    riggers,
    addRescueRecord,
    updateRescueRecord,
    resolveRescue,
    currentActivityId,
    markAlertRead,
    alerts,
  } = useAppStore();

  const [showAddForm, setShowAddForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<RescueStatus | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState('');

  const [newRescue, setNewRescue] = useState({
    riggerId: '',
    type: 'help' as RescueType,
    description: '',
    location: '',
  });

  const handleAddRescue = () => {
    if (!newRescue.riggerId || !newRescue.description.trim() || !currentActivityId) return;
    addRescueRecord({
      ...newRescue,
      activityId: currentActivityId,
    });
    setNewRescue({ riggerId: '', type: 'help', description: '', location: '' });
    setShowAddForm(false);
  };

  const handleResolve = (id: string) => {
    if (!resolutionText.trim()) return;
    resolveRescue(id, resolutionText);
    setResolutionText('');
    setExpandedId(null);
  };

  const filteredRecords = rescueRecords
    .filter((r) => filterStatus === 'all' || r.status === filterStatus)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const getTypeStyle = (type: RescueType) => {
    switch (type) {
      case 'help':
        return 'bg-amber-100 text-amber-700';
      case 'rescue':
        return 'bg-red-100 text-red-700';
      case 'drop':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeLabel = (type: RescueType) => {
    switch (type) {
      case 'help':
        return '求助';
      case 'rescue':
        return '救援';
      case 'drop':
        return '退赛';
      default:
        return type;
    }
  };

  const getStatusStyle = (status: RescueStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-red-100 text-red-700';
      case 'processing':
        return 'bg-amber-100 text-amber-700';
      case 'resolved':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: RescueStatus) => {
    switch (status) {
      case 'pending':
        return '待处理';
      case 'processing':
        return '处理中';
      case 'resolved':
        return '已解决';
      default:
        return status;
    }
  };

  const activeRiggers = riggers.filter((r) => r.status === 'active');

  const pendingCount = rescueRecords.filter((r) => r.status === 'pending').length;
  const processingCount = rescueRecords.filter((r) => r.status === 'processing').length;
  const resolvedCount = rescueRecords.filter((r) => r.status === 'resolved').length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">求助救援</h1>
          <p className="text-gray-500 mt-1">处理队员求助、救援和退赛申请</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          新建记录
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
              <LifeBuoy className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">总记录</p>
              <p className="text-2xl font-bold text-gray-900">{rescueRecords.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">待处理</p>
              <p className="text-2xl font-bold text-red-600">{pendingCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">处理中</p>
              <p className="text-2xl font-bold text-amber-600">{processingCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">已解决</p>
              <p className="text-2xl font-bold text-green-600">{resolvedCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {(['all', 'pending', 'processing', 'resolved'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === status
                ? 'bg-primary-100 text-primary-700'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {status === 'all' ? '全部' : getStatusLabel(status)}
          </button>
        ))}
      </div>

      {showAddForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 animate-slide-in-up">
          <h3 className="font-semibold text-gray-900 mb-4">新建求助/退赛记录</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">队员</label>
              <select
                value={newRescue.riggerId}
                onChange={(e) => setNewRescue({ ...newRescue, riggerId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">请选择队员</option>
                {activeRiggers.map((rider) => (
                  <option key={rider.id} value={rider.id}>
                    {rider.name} ({rider.group || '未分组'})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">类型</label>
              <select
                value={newRescue.type}
                onChange={(e) => setNewRescue({ ...newRescue, type: e.target.value as RescueType })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="help">求助</option>
                <option value="rescue">救援</option>
                <option value="drop">退赛</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">位置</label>
              <input
                type="text"
                value={newRescue.location}
                onChange={(e) => setNewRescue({ ...newRescue, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="大概位置描述"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-600 mb-1">情况描述</label>
              <textarea
                value={newRescue.description}
                onChange={(e) => setNewRescue({ ...newRescue, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                rows={3}
                placeholder="请详细描述情况..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowAddForm(false)} className="btn-secondary">
              取消
            </button>
            <button onClick={handleAddRescue} className="btn-primary">
              提交
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {filteredRecords.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 text-center py-12">
            <LifeBuoy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">暂无记录</p>
          </div>
        ) : (
          filteredRecords.map((record) => {
            const rider = riggers.find((r) => r.id === record.riggerId);
            const isExpanded = expandedId === record.id;

            return (
              <div
                key={record.id}
                className={`bg-white rounded-2xl border transition-all ${
                  record.status === 'pending'
                    ? 'border-red-200 ring-2 ring-red-100'
                    : 'border-gray-100'
                }`}
              >
                <div
                  className="p-5 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : record.id)}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-medium ${
                        rider?.avatarColor || 'bg-gray-400'
                      }`}
                    >
                      {rider?.name.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {rider?.name || '未知队员'}
                        </span>
                        <span className={`badge ${getTypeStyle(record.type)}`}>
                          {getTypeLabel(record.type)}
                        </span>
                        <span className={`badge ${getStatusStyle(record.status)}`}>
                          {getStatusLabel(record.status)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {new Date(record.timestamp).toLocaleString('zh-CN', {
                            month: 'numeric',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {record.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {record.location}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-2 line-clamp-1">
                        {record.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {rider && (
                        <a
                          href={`tel:${rider.phone}`}
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Phone className="w-5 h-5" />
                        </a>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">详细描述</p>
                        <p className="text-gray-700">{record.description}</p>
                      </div>

                      {record.resolvedAt && record.resolution && (
                        <div className="bg-green-50 rounded-xl p-3">
                          <p className="text-sm text-green-600 font-medium mb-1">处理结果</p>
                          <p className="text-sm text-green-800">{record.resolution}</p>
                          <p className="text-xs text-green-600 mt-2">
                            解决时间：
                            {new Date(record.resolvedAt).toLocaleString('zh-CN')}
                          </p>
                        </div>
                      )}

                      {record.status !== 'resolved' && (
                        <div className="flex gap-3">
                          {record.status === 'pending' && (
                            <button
                              onClick={() =>
                                updateRescueRecord(record.id, { status: 'processing' })
                              }
                              className="btn-secondary flex-1"
                            >
                              开始处理
                            </button>
                          )}
                          <div className="flex-1 flex gap-2">
                            <input
                              type="text"
                              placeholder="输入处理结果..."
                              value={resolutionText}
                              onChange={(e) => setResolutionText(e.target.value)}
                              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <button
                              onClick={() => handleResolve(record.id)}
                              disabled={!resolutionText.trim()}
                              className="btn-primary disabled:opacity-50"
                            >
                              标记解决
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
