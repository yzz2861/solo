import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import {
  MapPin,
  Plus,
  Trash2,
  Edit,
  Flag,
  Navigation,
  AlertCircle,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import type { RoutePointType } from '@/types';

export default function RouteManagement() {
  const { getRoutePointsOrdered, addRoutePoint, updateRoutePoint, deleteRoutePoint, currentActivityId, addAlert } = useAppStore();
  const routePoints = getRoutePointsOrdered();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const [newPoint, setNewPoint] = useState({
    name: '',
    distance: 0,
    type: 'checkpoint' as RoutePointType,
    estimatedArrival: '',
    note: '',
  });

  const handleAddPoint = () => {
    if (!newPoint.name.trim()) return;
    if (!currentActivityId) return;

    addRoutePoint({
      ...newPoint,
      activityId: currentActivityId,
      order: routePoints.length,
    });
    setNewPoint({ name: '', distance: 0, type: 'checkpoint', estimatedArrival: '', note: '' });
    setShowAddForm(false);
  };

  const handleDetour = (pointId: string) => {
    updateRoutePoint(pointId, { isDetour: true });
    const point = routePoints.find((p) => p.id === pointId);
    if (currentActivityId && point) {
      addAlert({
        type: 'detour',
        title: `路线临时改道：${point.name}`,
        message: `${point.name} 已标记为改道点，请所有队员注意`,
        severity: 'warning',
        activityId: currentActivityId,
        relatedId: pointId,
      });
    }
  };

  const getPointTypeLabel = (type: RoutePointType) => {
    const labels = {
      start: '起点',
      checkpoint: '打卡点',
      supply: '补给点',
      end: '终点',
    };
    return labels[type];
  };

  const getPointTypeStyle = (type: RoutePointType) => {
    const styles = {
      start: 'bg-green-100 text-green-700',
      checkpoint: 'bg-blue-100 text-blue-700',
      supply: 'bg-amber-100 text-amber-700',
      end: 'bg-primary-100 text-primary-700',
    };
    return styles[type];
  };

  const movePoint = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= routePoints.length) return;

    const currentPoint = routePoints[index];
    const targetPoint = routePoints[newIndex];

    updateRoutePoint(currentPoint.id, { order: newIndex });
    updateRoutePoint(targetPoint.id, { order: index });
  };

  const totalDistance = routePoints.length > 0 ? routePoints[routePoints.length - 1].distance : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">路线管理</h1>
          <p className="text-gray-500 mt-1">配置骑行路线点位和补给点</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          添加点位
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-500">总距离</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalDistance} km</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-500">点位数量</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{routePoints.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-500">补给点</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {routePoints.filter((p) => p.type === 'supply').length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-500">打卡点</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {routePoints.filter((p) => p.type === 'checkpoint').length}
          </p>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 animate-slide-in-up">
          <h3 className="font-semibold text-gray-900 mb-4">添加新点位</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-600 mb-1">点位名称</label>
              <input
                type="text"
                value={newPoint.name}
                onChange={(e) => setNewPoint({ ...newPoint, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="例：一号补给点：界首乡"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">距离 (km)</label>
              <input
                type="number"
                value={newPoint.distance}
                onChange={(e) => setNewPoint({ ...newPoint, distance: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">类型</label>
              <select
                value={newPoint.type}
                onChange={(e) => setNewPoint({ ...newPoint, type: e.target.value as RoutePointType })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="start">起点</option>
                <option value="checkpoint">打卡点</option>
                <option value="supply">补给点</option>
                <option value="end">终点</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">预计到达时间</label>
              <input
                type="time"
                value={newPoint.estimatedArrival}
                onChange={(e) => setNewPoint({ ...newPoint, estimatedArrival: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm text-gray-600 mb-1">备注</label>
              <input
                type="text"
                value={newPoint.note}
                onChange={(e) => setNewPoint({ ...newPoint, note: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="可选备注信息"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowAddForm(false)} className="btn-secondary">
              取消
            </button>
            <button onClick={handleAddPoint} className="btn-primary">
              添加
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">路线点位</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {routePoints.map((point, index) => (
            <div
              key={point.id}
              className={`p-4 hover:bg-gray-50 transition-colors ${
                point.isDetour ? 'bg-amber-50/50' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={() => movePoint(index, 'up')}
                    disabled={index === 0}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                      point.type === 'start'
                        ? 'bg-green-500'
                        : point.type === 'end'
                        ? 'bg-primary-600'
                        : point.type === 'supply'
                        ? 'bg-amber-500'
                        : 'bg-blue-500'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <button
                    onClick={() => movePoint(index, 'down')}
                    disabled={index === routePoints.length - 1}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">{point.name}</h3>
                    <span className={`badge ${getPointTypeStyle(point.type)}`}>
                      {getPointTypeLabel(point.type)}
                    </span>
                    {point.isDetour && (
                      <span className="badge bg-red-100 text-red-700 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        改道
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Navigation className="w-4 h-4" />
                      {point.distance} km
                    </span>
                    {point.estimatedArrival && (
                      <span className="flex items-center gap-1">
                        <Flag className="w-4 h-4" />
                        预计 {point.estimatedArrival}
                      </span>
                    )}
                    {point.note && <span>{point.note}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {point.type === 'checkpoint' && !point.isDetour && (
                    <button
                      onClick={() => handleDetour(point.id)}
                      className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      title="标记为改道"
                    >
                      <AlertCircle className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={() => setEditingId(editingId === point.id ? null : point.id)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => deleteRoutePoint(point.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {editingId === point.id && (
                <div className="mt-4 ml-14 p-4 bg-gray-50 rounded-xl">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">名称</label>
                      <input
                        type="text"
                        defaultValue={point.name}
                        className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md"
                        onBlur={(e) => updateRoutePoint(point.id, { name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">距离 (km)</label>
                      <input
                        type="number"
                        defaultValue={point.distance}
                        className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md"
                        onBlur={(e) => updateRoutePoint(point.id, { distance: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">类型</label>
                      <select
                        defaultValue={point.type}
                        className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md"
                        onChange={(e) => updateRoutePoint(point.id, { type: e.target.value as RoutePointType })}
                      >
                        <option value="start">起点</option>
                        <option value="checkpoint">打卡点</option>
                        <option value="supply">补给点</option>
                        <option value="end">终点</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">预计到达</label>
                      <input
                        type="time"
                        defaultValue={point.estimatedArrival}
                        className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md"
                        onBlur={(e) => updateRoutePoint(point.id, { estimatedArrival: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
