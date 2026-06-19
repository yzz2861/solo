import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  Check,
  Edit3,
  Save,
  X,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Cloud,
  Info,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { formatCurrency, getWeatherTypeLabel } from '../../../utils/formatters';
import { addDays, format } from 'date-fns';

export default function OrderPlanPage() {
  const navigate = useNavigate();
  const { state, dispatch, getStoreOrderPlans, getProductById, getCategoryById } = useApp();
  const orderPlans = getStoreOrderPlans();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['c001', 'c002']));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [editReason, setEditReason] = useState<string>('');
  const [showReasonModal, setShowReasonModal] = useState(false);

  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const tomorrowWeather = state.weatherData[0];

  const categoryOrderPlans = useMemo(() => {
    return state.categories.map(cat => {
      const catProducts = state.products.filter(p => p.categoryId === cat.id);
      const catPlans = orderPlans.filter(p => catProducts.some(cp => cp.id === p.productId));
      const totalSuggested = catPlans.reduce((sum, p) => sum + p.suggestedQty, 0);
      const totalAdjusted = catPlans.reduce(
        (sum, p) => sum + (p.adjustedQty !== null ? p.adjustedQty : p.suggestedQty),
        0
      );
      const adjustedCount = catPlans.filter(p => p.adjustedQty !== null).length;
      const confirmedCount = catPlans.filter(p => p.isConfirmed).length;

      return {
        ...cat,
        plans: catPlans,
        totalSuggested,
        totalAdjusted,
        adjustedCount,
        confirmedCount,
      };
    });
  }, [orderPlans, state.categories, state.products]);

  const totalStats = useMemo(() => {
    const totalSuggested = orderPlans.reduce((sum, p) => sum + p.suggestedQty, 0);
    const totalAdjusted = orderPlans.reduce(
      (sum, p) => sum + (p.adjustedQty !== null ? p.adjustedQty : p.suggestedQty),
      0
    );
    const totalAmount = orderPlans.reduce((sum, p) => {
      const product = getProductById(p.productId);
      const qty = p.adjustedQty !== null ? p.adjustedQty : p.suggestedQty;
      return sum + qty * (product?.price || 0);
    }, 0);
    const confirmedCount = orderPlans.filter(p => p.isConfirmed).length;

    return { totalSuggested, totalAdjusted, totalAmount, confirmedCount };
  }, [orderPlans, getProductById]);

  const toggleCategory = (catId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(catId)) {
        next.delete(catId);
      } else {
        next.add(catId);
      }
      return next;
    });
  };

  const startEdit = (planId: string, currentQty: number) => {
    setEditingId(planId);
    setEditValue(currentQty);
    setEditReason('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue(0);
    setEditReason('');
  };

  const handleQuickAdjust = (planId: string, delta: number, suggestedQty: number) => {
    const plan = orderPlans.find(p => p.id === planId);
    if (!plan) return;

    const currentQty = plan.adjustedQty !== null ? plan.adjustedQty : plan.suggestedQty;
    const newQty = Math.max(0, currentQty + delta);

    dispatch({
      type: 'UPDATE_ORDER_PLAN',
      payload: {
        storeId: state.currentStoreId,
        planId,
        updates: { adjustedQty: newQty },
      },
    });
  };

  const saveEdit = () => {
    if (!editingId) return;

    dispatch({
      type: 'UPDATE_ORDER_PLAN',
      payload: {
        storeId: state.currentStoreId,
        planId: editingId,
        updates: {
          adjustedQty: editValue,
          adjustReason: editReason || undefined,
        },
      },
    });
    cancelEdit();
  };

  const confirmAll = () => {
    if (window.confirm('确认所有订货计划？确认后将提交订货单。')) {
      dispatch({ type: 'CONFIRM_ORDER_PLANS', payload: state.currentStoreId });
    }
  };

  const resetToSuggested = (planId: string) => {
    dispatch({
      type: 'UPDATE_ORDER_PLAN',
      payload: {
        storeId: state.currentStoreId,
        planId,
        updates: { adjustedQty: null, adjustReason: undefined },
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">订货建议</h1>
          <p className="text-gray-500 mt-1">
            {tomorrow} 订货计划 · 基于历史销售和天气预测
          </p>
        </div>
        {tomorrowWeather && (
          <div className="flex items-center gap-2 bg-blue-50 px-4 py-3 rounded-xl">
            <Cloud className="w-6 h-6 text-blue-500" />
            <div>
              <div className="text-sm font-medium text-blue-700">
                明日天气：{getWeatherTypeLabel(tomorrowWeather.type)} {tomorrowWeather.temperature}°C
              </div>
              <div className="text-xs text-blue-500">
                订货建议已考虑天气因素
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-card p-4">
          <div className="text-sm text-gray-500 mb-1">建议订货总量</div>
          <div className="text-2xl font-bold text-gray-800">{totalStats.totalSuggested} 件</div>
          <div className="text-xs text-gray-400 mt-1">系统自动计算</div>
        </div>
        <div className="bg-white rounded-xl shadow-card p-4">
          <div className="text-sm text-gray-500 mb-1">调整后总量</div>
          <div className="text-2xl font-bold text-primary-600">{totalStats.totalAdjusted} 件</div>
          <div className={`text-xs mt-1 flex items-center gap-1 ${
            totalStats.totalAdjusted >= totalStats.totalSuggested ? 'text-red-500' : 'text-green-500'
          }`}>
            {totalStats.totalAdjusted >= totalStats.totalSuggested ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            较建议 {totalStats.totalAdjusted >= totalStats.totalSuggested ? '+' : ''}
            {(totalStats.totalAdjusted - totalStats.totalSuggested).toFixed(0)} 件
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-card p-4">
          <div className="text-sm text-gray-500 mb-1">预计订货金额</div>
          <div className="text-2xl font-bold text-gray-800">{formatCurrency(totalStats.totalAmount)}</div>
          <div className="text-xs text-gray-400 mt-1">按零售价计算</div>
        </div>
        <div className="bg-white rounded-xl shadow-card p-4">
          <div className="text-sm text-gray-500 mb-1">确认进度</div>
          <div className="text-2xl font-bold text-green-600">
            {totalStats.confirmedCount} / {orderPlans.length}
          </div>
          <div className="mt-2 w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{ width: `${(totalStats.confirmedCount / orderPlans.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Info className="w-4 h-4" />
          点击商品可手动调整订货量，调整后请确认
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowReasonModal(true)}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            批量调整说明
          </button>
          <button
            onClick={confirmAll}
            disabled={totalStats.confirmedCount === orderPlans.length}
            className="flex items-center gap-2 px-5 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4" />
            确认全部订货
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {categoryOrderPlans.map(cat => (
          <div key={cat.id} className="bg-white rounded-xl shadow-card overflow-hidden">
            <button
              onClick={() => toggleCategory(cat.id)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                {expandedCategories.has(cat.id) ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
                <div className="text-left">
                  <span className="font-semibold text-gray-800">{cat.name}</span>
                  <span className="ml-3 text-sm text-gray-500">{cat.plans.length} 个商品</span>
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div>
                  <span className="text-gray-500">建议：</span>
                  <span className="font-medium text-gray-700">{cat.totalSuggested} 件</span>
                </div>
                <div>
                  <span className="text-gray-500">调整后：</span>
                  <span className="font-semibold text-primary-600">{cat.totalAdjusted} 件</span>
                </div>
                <div className="w-24 text-right">
                  {cat.confirmedCount === cat.plans.length ? (
                    <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                      <Check className="w-4 h-4" />
                      已全部确认
                    </span>
                  ) : (
                    <span className="text-orange-500 text-sm">
                      {cat.confirmedCount}/{cat.plans.length} 已确认
                    </span>
                  )}
                </div>
              </div>
            </button>

            {expandedCategories.has(cat.id) && (
              <div className="border-t border-gray-100">
                <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-gray-50 text-xs text-gray-500 font-medium">
                  <div className="col-span-4">商品名称</div>
                  <div className="col-span-2 text-center">建议订货量</div>
                  <div className="col-span-3 text-center">调整订货量</div>
                  <div className="col-span-2 text-center">单价</div>
                  <div className="col-span-1 text-right">操作</div>
                </div>
                {cat.plans.map(plan => {
                  const product = getProductById(plan.productId);
                  if (!product) return null;

                  const displayQty = plan.adjustedQty !== null ? plan.adjustedQty : plan.suggestedQty;
                  const isAdjusted = plan.adjustedQty !== null;
                  const isEditing = editingId === plan.id;

                  return (
                    <div
                      key={plan.id}
                      className={`grid grid-cols-12 gap-4 px-4 py-3 border-t border-gray-50 items-center hover:bg-gray-50 transition-colors ${
                        plan.isConfirmed ? 'bg-green-50/50' : ''
                      }`}
                    >
                      <div className="col-span-4 flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center text-lg">
                          🍱
                        </div>
                        <div>
                          <div className="font-medium text-gray-800">{product.name}</div>
                          <div className="text-xs text-gray-400">单位：{product.unit}</div>
                        </div>
                        {plan.isConfirmed && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                            已确认
                          </span>
                        )}
                      </div>

                      <div className="col-span-2 text-center">
                        <div className="text-lg font-semibold text-gray-700">
                          {plan.suggestedQty}
                        </div>
                        <div className="text-xs text-gray-400">{product.unit}</div>
                      </div>

                      <div className="col-span-3">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setEditValue(Math.max(0, editValue - 1))}
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <input
                              type="number"
                              value={editValue}
                              onChange={e => setEditValue(parseInt(e.target.value) || 0)}
                              className="w-20 px-3 py-1.5 text-center border border-gray-300 rounded-lg focus:outline-none focus:border-primary-500"
                            />
                            <button
                              onClick={() => setEditValue(editValue + 1)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="text-center">
                            <div className={`text-lg font-bold ${isAdjusted ? 'text-primary-600' : 'text-gray-800'}`}>
                              {displayQty}
                              <span className="text-sm font-normal text-gray-400 ml-1">{product.unit}</span>
                            </div>
                            {isAdjusted && plan.adjustReason && (
                              <div className="text-xs text-gray-400 mt-0.5">{plan.adjustReason}</div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="col-span-2 text-center">
                        <div className="font-medium text-gray-700">{formatCurrency(product.price)}</div>
                        <div className="text-xs text-gray-400">
                          小计：{formatCurrency(product.price * displayQty)}
                        </div>
                      </div>

                      <div className="col-span-1 flex justify-end gap-1">
                        {isEditing ? (
                          <>
                            <button
                              onClick={saveEdit}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleQuickAdjust(plan.id, -1, plan.suggestedQty)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors text-gray-600"
                              title="减少1件"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => startEdit(plan.id, displayQty)}
                              className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-colors"
                              title="编辑"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {showReasonModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">批量调整说明</h3>
            <p className="text-sm text-gray-500 mb-4">
              您可以为所有已调整的商品添加统一的调整原因，便于后续追溯分析。
            </p>
            <textarea
              placeholder="请输入调整原因..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-primary-500 resize-none"
              rows={3}
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowReasonModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => setShowReasonModal(false)}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
