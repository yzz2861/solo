import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import {
  Package,
  Plus,
  Droplets,
  Zap,
  Apple,
  Heart,
  MoreHorizontal,
  AlertTriangle,
  TrendingDown,
  Edit2,
} from 'lucide-react';
import type { SupplyCategory } from '@/types';

export default function SupplyManagement() {
  const {
    supplyPoints,
    supplyItems,
    supplyRecords,
    addSupplyItem,
    updateSupplyItem,
    riggers,
    currentActivityId,
    addSupplyRecord,
  } = useAppStore();

  const [selectedPoint, setSelectedPoint] = useState<string | null>(
    supplyPoints[0]?.id || null
  );
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    category: 'water' as SupplyCategory,
    quantity: 0,
    initialQuantity: 0,
    unit: '瓶',
    lowStockThreshold: 10,
  });
  const [showGiveOut, setShowGiveOut] = useState<string | null>(null);
  const [giveOutQty, setGiveOutQty] = useState(1);
  const [selectedRider, setSelectedRider] = useState('');

  const getCategoryIcon = (category: SupplyCategory) => {
    switch (category) {
      case 'water':
        return Droplets;
      case 'energy':
        return Zap;
      case 'food':
        return Apple;
      case 'medical':
        return Heart;
      default:
        return Package;
    }
  };

  const getCategoryColor = (category: SupplyCategory) => {
    switch (category) {
      case 'water':
        return 'bg-blue-100 text-blue-600';
      case 'energy':
        return 'bg-amber-100 text-amber-600';
      case 'food':
        return 'bg-green-100 text-green-600';
      case 'medical':
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getCategoryLabel = (category: SupplyCategory) => {
    const labels = {
      water: '饮用水',
      energy: '能量补给',
      food: '食物',
      medical: '医疗用品',
      other: '其他',
    };
    return labels[category];
  };

  const handleAddItem = () => {
    if (!newItem.name.trim() || !selectedPoint || !currentActivityId) return;
    addSupplyItem({
      ...newItem,
      supplyPointId: selectedPoint,
    });
    setNewItem({
      name: '',
      category: 'water',
      quantity: 0,
      initialQuantity: 0,
      unit: '瓶',
      lowStockThreshold: 10,
    });
    setShowAddItem(false);
  };

  const handleGiveOut = (itemId: string) => {
    if (!selectedRider || !selectedPoint) return;
    addSupplyRecord(selectedRider, itemId, giveOutQty, selectedPoint);
    setShowGiveOut(null);
    setGiveOutQty(1);
    setSelectedRider('');
  };

  const itemsByPoint = selectedPoint
    ? supplyItems.filter((item) => item.supplyPointId === selectedPoint)
    : [];

  const recordsByPoint = selectedPoint
    ? supplyRecords.filter((r) => r.supplyPointId === selectedPoint).slice(0, 10)
    : [];

  const totalItems = itemsByPoint.reduce((sum, item) => sum + item.quantity, 0);
  const lowStockCount = itemsByPoint.filter(
    (item) => item.lowStockThreshold && item.quantity <= item.lowStockThreshold
  ).length;

  const activeRiders = riggers.filter((r) => r.status === 'active');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">补给管理</h1>
          <p className="text-gray-500 mt-1">管理各补给点物资库存和发放</p>
        </div>
        <button
          onClick={() => setShowAddItem(true)}
          disabled={!selectedPoint}
          className="btn-primary flex items-center gap-2 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          添加物资
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {supplyPoints.map((point) => (
          <button
            key={point.id}
            onClick={() => setSelectedPoint(point.id)}
            className={`px-4 py-2.5 rounded-xl font-medium transition-all ${
              selectedPoint === point.id
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-200'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {point.name}
          </button>
        ))}
      </div>

      {selectedPoint && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <p className="text-sm text-gray-500">物资种类</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{itemsByPoint.length}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <p className="text-sm text-gray-500">库存总量</p>
              <p className="text-2xl font-bold text-primary-600 mt-1">{totalItems}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <p className="text-sm text-gray-500">已发放</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{recordsByPoint.length}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <p className="text-sm text-gray-500">库存预警</p>
              <p className={`text-2xl font-bold mt-1 ${lowStockCount > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                {lowStockCount} 项
              </p>
            </div>
          </div>

          {showAddItem && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 animate-slide-in-up">
              <h3 className="font-semibold text-gray-900 mb-4">添加物资</h3>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-600 mb-1">物资名称</label>
                  <input
                    type="text"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="例：矿泉水"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">分类</label>
                  <select
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value as SupplyCategory })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="water">饮用水</option>
                    <option value="energy">能量补给</option>
                    <option value="food">食物</option>
                    <option value="medical">医疗用品</option>
                    <option value="other">其他</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">初始数量</label>
                  <input
                    type="number"
                    value={newItem.initialQuantity}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        initialQuantity: Number(e.target.value),
                        quantity: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">单位</label>
                  <input
                    type="text"
                    value={newItem.unit}
                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="瓶/包/个"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">预警阈值</label>
                  <input
                    type="number"
                    value={newItem.lowStockThreshold}
                    onChange={(e) =>
                      setNewItem({ ...newItem, lowStockThreshold: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setShowAddItem(false)} className="btn-secondary">
                  取消
                </button>
                <button onClick={handleAddItem} className="btn-primary">
                  添加
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="p-5 border-b border-gray-100">
                  <h2 className="font-semibold text-gray-900">物资清单</h2>
                </div>
                <div className="divide-y divide-gray-50">
                  {itemsByPoint.length === 0 ? (
                    <div className="text-center py-12">
                      <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">暂无物资</p>
                    </div>
                  ) : (
                    itemsByPoint.map((item) => {
                      const Icon = getCategoryIcon(item.category);
                      const isLowStock =
                        item.lowStockThreshold && item.quantity <= item.lowStockThreshold;
                      const percentage = item.initialQuantity > 0
                        ? (item.quantity / item.initialQuantity) * 100
                        : 0;

                      return (
                        <div
                          key={item.id}
                          className={`p-4 hover:bg-gray-50 transition-colors ${
                            isLowStock ? 'bg-amber-50/30' : ''
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className={`w-12 h-12 rounded-xl flex items-center justify-center ${getCategoryColor(
                                item.category
                              )}`}
                            >
                              <Icon className="w-6 h-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium text-gray-900">{item.name}</h3>
                                <span className="text-xs text-gray-400">{getCategoryLabel(item.category)}</span>
                                {isLowStock && (
                                  <span className="badge bg-red-100 text-red-700 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    库存不足
                                  </span>
                                )}
                              </div>
                              <div className="mt-2">
                                <div className="flex items-center justify-between text-sm mb-1">
                                  <span className="text-gray-600">
                                    {item.quantity} {item.unit}
                                  </span>
                                  <span className="text-gray-400">
                                    初始 {item.initialQuantity} {item.unit}
                                  </span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      isLowStock ? 'bg-red-500' : 'bg-primary-500'
                                    }`}
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setShowGiveOut(item.id);
                                  setSelectedRider('');
                                }}
                                className="px-3 py-1.5 bg-primary-50 text-primary-700 text-sm font-medium rounded-lg hover:bg-primary-100 transition-colors"
                              >
                                发放
                              </button>
                              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {showGiveOut === item.id && (
                            <div className="mt-4 ml-16 p-4 bg-gray-50 rounded-xl">
                              <div className="flex items-end gap-3">
                                <div className="flex-1">
                                  <label className="block text-xs text-gray-500 mb-1">领取队员</label>
                                  <select
                                    value={selectedRider}
                                    onChange={(e) => setSelectedRider(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                  >
                                    <option value="">选择队员</option>
                                    {activeRiders.map((rider) => (
                                      <option key={rider.id} value={rider.id}>
                                        {rider.name} ({rider.group || '未分组'})
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="w-24">
                                  <label className="block text-xs text-gray-500 mb-1">数量</label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={giveOutQty}
                                    onChange={(e) => setGiveOutQty(Number(e.target.value))}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                  />
                                </div>
                                <button
                                  onClick={() => handleGiveOut(item.id)}
                                  disabled={!selectedRider || giveOutQty <= 0 || giveOutQty > item.quantity}
                                  className="btn-primary disabled:opacity-50"
                                >
                                  确认发放
                                </button>
                                <button
                                  onClick={() => setShowGiveOut(null)}
                                  className="btn-secondary"
                                >
                                  取消
                                </button>
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

            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">发放记录</h2>
              </div>
              <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto scrollbar-thin">
                {recordsByPoint.length === 0 ? (
                  <div className="text-center py-12">
                    <TrendingDown className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">暂无发放记录</p>
                  </div>
                ) : (
                  recordsByPoint.map((record) => {
                    const rider = riggers.find((r) => r.id === record.riggerId);
                    const item = supplyItems.find((i) => i.id === record.supplyItemId);
                    return (
                      <div key={record.id} className="p-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm ${
                              rider?.avatarColor || 'bg-gray-400'
                            }`}
                          >
                            {rider?.name.charAt(0) || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{rider?.name || '未知'}</p>
                            <p className="text-xs text-gray-500">
                              {item?.name || '未知物资'} × {record.quantity} {item?.unit}
                            </p>
                          </div>
                          <span className="text-xs text-gray-400">
                            {new Date(record.timestamp).toLocaleTimeString('zh-CN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
