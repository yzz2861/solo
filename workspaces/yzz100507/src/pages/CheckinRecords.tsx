import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import {
  CheckSquare,
  MapPin,
  Clock,
  User,
  AlertTriangle,
  Plus,
  Search,
} from 'lucide-react';

export default function CheckinRecords() {
  const {
    getRoutePointsOrdered,
    checkinRecords,
    riggers,
    addCheckin,
    currentActivityId,
    getOverdueRiggers,
  } = useAppStore();

  const routePoints = getRoutePointsOrdered();
  const overdueRiggers = getOverdueRiggers();
  const [selectedPoint, setSelectedPoint] = useState<string | null>(null);
  const [showCheckinForm, setShowCheckinForm] = useState(false);
  const [checkinRigger, setCheckinRigger] = useState('');
  const [checkinNote, setCheckinNote] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRecords = checkinRecords
    .filter((r) => {
      if (selectedPoint && r.routePointId !== selectedPoint) return false;
      if (searchTerm) {
        const rider = riggers.find((rg) => rg.id === r.riggerId);
        const point = routePoints.find((p) => p.id === r.routePointId);
        return (
          rider?.name.includes(searchTerm) ||
          point?.name.includes(searchTerm)
        );
      }
      return true;
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const handleCheckin = () => {
    if (!checkinRigger || !selectedPoint) return;
    addCheckin(checkinRigger, selectedPoint, checkinNote);
    setCheckinRigger('');
    setCheckinNote('');
    setShowCheckinForm(false);
  };

  const activeRiggers = riggers.filter((r) => r.status === 'active');

  const getCheckinCountByPoint = (pointId: string) => {
    return checkinRecords.filter((r) => r.routePointId === pointId).length;
  };

  const getUniqueRiggersAtPoint = (pointId: string) => {
    const records = checkinRecords.filter((r) => r.routePointId === pointId);
    return new Set(records.map((r) => r.riggerId)).size;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">签到记录</h1>
          <p className="text-gray-500 mt-1">查看各点位签到情况</p>
        </div>
        <button
          onClick={() => setShowCheckinForm(true)}
          disabled={!selectedPoint}
          className="btn-primary flex items-center gap-2 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          手动签到
        </button>
      </div>

      {overdueRiggers.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-amber-800">超时未到预警</h3>
              <p className="text-sm text-amber-700 mt-1">
                以下队员长时间未到达下一点位，请关注：
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {overdueRiggers.map((r) => (
                  <span
                    key={r.id}
                    className="px-3 py-1 bg-white rounded-full text-sm text-amber-700 border border-amber-200"
                  >
                    {r.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-900 mb-4">点位签到统计</h2>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
          <button
            onClick={() => setSelectedPoint(null)}
            className={`flex-shrink-0 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              selectedPoint === null
                ? 'bg-primary-600 text-white'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="text-lg font-bold">{checkinRecords.length}</div>
            <div>总签到次数</div>
          </button>
          {routePoints.map((point) => (
            <button
              key={point.id}
              onClick={() => setSelectedPoint(point.id)}
              className={`flex-shrink-0 px-4 py-3 rounded-xl text-sm font-medium transition-all min-w-[120px] ${
                selectedPoint === point.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className="text-lg font-bold">{getUniqueRiggersAtPoint(point.id)}</div>
              <div className="text-xs opacity-80">{point.name.split('：')[1] || point.name}</div>
              <div className="text-xs opacity-60 mt-1">{point.distance}km</div>
            </button>
          ))}
        </div>
      </div>

      {showCheckinForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 animate-slide-in-up">
          <h3 className="font-semibold text-gray-900 mb-4">手动签到</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">选择点位</label>
              <select
                value={selectedPoint || ''}
                onChange={(e) => setSelectedPoint(e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">请选择点位</option>
                {routePoints.map((point) => (
                  <option key={point.id} value={point.id}>
                    {point.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">选择队员</label>
              <select
                value={checkinRigger}
                onChange={(e) => setCheckinRigger(e.target.value)}
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
              <label className="block text-sm text-gray-600 mb-1">备注</label>
              <input
                type="text"
                value={checkinNote}
                onChange={(e) => setCheckinNote(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="可选备注"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowCheckinForm(false)} className="btn-secondary">
              取消
            </button>
            <button onClick={handleCheckin} className="btn-primary">
              确认签到
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="搜索队员或点位..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">签到记录</h2>
          <span className="text-sm text-gray-500">
            共 {filteredRecords.length} 条记录
          </span>
        </div>
        <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto scrollbar-thin">
          {filteredRecords.length === 0 ? (
            <div className="text-center py-12">
              <CheckSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">暂无签到记录</p>
            </div>
          ) : (
            filteredRecords.map((record) => {
              const rider = riggers.find((r) => r.id === record.riggerId);
              const point = routePoints.find((p) => p.id === record.routePointId);

              return (
                <div
                  key={record.id}
                  className={`p-4 hover:bg-gray-50 transition-colors ${
                    record.isDuplicate ? 'bg-amber-50/30' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
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
                        {record.isDuplicate && (
                          <span className="badge bg-amber-100 text-amber-700 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            重复签到
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {point?.name || '未知点位'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {new Date(record.timestamp).toLocaleString('zh-CN', {
                            month: 'numeric',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      {record.note && (
                        <p className="text-xs text-gray-400 mt-1">备注：{record.note}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
