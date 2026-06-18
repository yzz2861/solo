import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import {
  Truck,
  MapPin,
  Package,
  ChevronRight,
  CheckCircle,
  Clock,
  Navigation,
  Droplets,
  Zap,
  Apple,
  Heart,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import type { RoutePoint, SupplyPoint } from '@/types';

export default function SupplyVehicleView() {
  const { getRoutePointsOrdered, supplyPoints, supplyItems, riggers, checkinRecords } = useAppStore();
  const [selectedPoint, setSelectedPoint] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const routePoints = getRoutePointsOrdered();

  const supplyPointsWithRoute = supplyPoints
    .map((sp) => {
      const routePoint = routePoints.find((rp) => rp.id === sp.routePointId);
      return { ...sp, routePoint, order: routePoint?.order ?? 999 };
    })
    .sort((a, b) => a.order - b.order);

  const getItemsByPoint = (supplyPointId: string) => {
    return supplyItems.filter((item) => item.supplyPointId === supplyPointId);
  };

  const getCategoryIcon = (category: string) => {
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

  const getCategoryColor = (category: string) => {
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

  const getRiggersAtPoint = (routePointId: string) => {
    return riggers.filter((r) => r.currentPointId === routePointId && r.status === 'active');
  };

  const getTotalItemsAtPoint = (supplyPointId: string) => {
    const items = getItemsByPoint(supplyPointId);
    return items.reduce((sum, item) => sum + item.quantity, 0);
  };

  const hasLowStock = (supplyPointId: string) => {
    const items = getItemsByPoint(supplyPointId);
    return items.some(
      (item) => item.lowStockThreshold && item.quantity <= item.lowStockThreshold
    );
  };

  const currentPointIndex = supplyPointsWithRoute.findIndex(
    (sp) => sp.id === selectedPoint
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Truck className="w-7 h-7 text-amber-500" />
            补给车导航
          </h1>
          <p className="text-gray-500 mt-1">按路线顺序查看各补给点物资</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-xl">
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-amber-700">配送模式</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-500">补给点总数</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{supplyPoints.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-500">物资总件数</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {supplyItems.reduce((sum, i) => sum + i.quantity, 0)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-500">已发放</p>
          <p className="text-2xl font-bold text-primary-600 mt-1">
            {supplyItems.reduce((sum, i) => sum + i.initialQuantity - i.quantity, 0)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-500">库存预警</p>
          <p className="text-2xl font-bold text-red-500 mt-1">
            {supplyItems.filter(
              (i) => i.lowStockThreshold && i.quantity <= i.lowStockThreshold
            ).length}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">配送路线顺序</h2>
              <p className="text-sm text-gray-500 mt-1">点击补给点查看物资清单</p>
            </div>

            <div className="p-5">
              <div className="relative">
                {supplyPointsWithRoute.map((sp, index) => {
                  const items = getItemsByPoint(sp.id);
                  const riggersAtPoint = getRiggersAtPoint(sp.routePointId || '');
                  const isLowStock = hasLowStock(sp.id);
                  const isSelected = selectedPoint === sp.id;
                  const isLast = index === supplyPointsWithRoute.length - 1;

                  return (
                    <div key={sp.id} className="relative">
                      <div
                        onClick={() => {
                          setSelectedPoint(sp.id);
                          setShowDetail(true);
                        }}
                        className={`relative z-10 cursor-pointer rounded-2xl p-4 transition-all ${
                          isSelected
                            ? 'bg-amber-50 border-2 border-amber-400'
                            : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className="relative">
                            <div
                              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                isLowStock
                                  ? 'bg-red-100 text-red-600'
                                  : 'bg-amber-100 text-amber-600'
                              }`}
                            >
                              <MapPin className="w-6 h-6" />
                            </div>
                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-amber-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                              {index + 1}
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-gray-900">{sp.name}</h3>
                              {isLowStock && (
                                <span className="badge bg-red-100 text-red-700 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  库存不足
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              {sp.routePoint?.distance}km · 预计{' '}
                              {sp.routePoint?.estimatedArrival}
                            </p>
                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-sm text-gray-600 flex items-center gap-1">
                                <Package className="w-4 h-4" />
                                {items.length} 类物资
                              </span>
                              <span className="text-sm text-gray-600 flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                {riggersAtPoint.length} 人在此处
                              </span>
                              <span className="text-sm text-gray-600 flex items-center gap-1">
                                <CheckCircle className="w-4 h-4" />
                                {getTotalItemsAtPoint(sp.id)} 件库存
                              </span>
                            </div>
                          </div>

                          <ChevronRight
                            className={`w-5 h-5 text-gray-400 transition-transform ${
                              isSelected ? 'rotate-90' : ''
                            }`}
                          />
                        </div>
                      </div>

                      {!isLast && (
                        <div className="flex items-center justify-center py-2">
                          <ArrowRight className="w-5 h-5 text-gray-300" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {selectedPoint && showDetail ? (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="p-5 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">
                      {supplyPointsWithRoute.find((sp) => sp.id === selectedPoint)?.name}
                    </h3>
                    <p className="text-sm text-white/80">第 {currentPointIndex + 1} 站</p>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-3 max-h-96 overflow-y-auto scrollbar-thin">
                {getItemsByPoint(selectedPoint).map((item) => {
                  const Icon = getCategoryIcon(item.category);
                  const isLow =
                    item.lowStockThreshold && item.quantity <= item.lowStockThreshold;
                  const percentage =
                    item.initialQuantity > 0
                      ? (item.quantity / item.initialQuantity) * 100
                      : 0;

                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xl ${isLow ? 'bg-red-50' : 'bg-gray-50'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${getCategoryColor(
                            item.category
                          )}`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{item.name}</span>
                            {isLow && (
                              <AlertTriangle className="w-4 h-4 text-red-500" />
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-sm font-semibold text-gray-700">
                              {item.quantity} {item.unit}
                            </span>
                            <span className="text-xs text-gray-400">
                              / {item.initialQuantity} {item.unit}
                            </span>
                          </div>
                          <div className="h-1.5 bg-white rounded-full mt-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isLow ? 'bg-red-500' : 'bg-amber-500'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 border-t border-gray-100">
                <button className="w-full btn-primary">
                  开始配送
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
              <Navigation className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">选择一个补给点</p>
              <p className="text-sm text-gray-400 mt-1">查看详细物资清单</p>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-3">配送提示</h3>
            <div className="space-y-2">
              <div className="flex items-start gap-2 p-2 bg-blue-50 rounded-lg">
                <Clock className="w-4 h-4 text-blue-500 mt-0.5" />
                <p className="text-sm text-blue-700">
                  请按顺序依次配送，避免遗漏点位
                </p>
              </div>
              <div className="flex items-start gap-2 p-2 bg-amber-50 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />
                <p className="text-sm text-amber-700">
                  二号补给点能量胶库存不足，请优先补充
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Users({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
