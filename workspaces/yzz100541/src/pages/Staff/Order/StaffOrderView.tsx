import React, { useState, useMemo } from 'react';
import {
  ClipboardList,
  Sun,
  Cloud,
  CloudRain,
  Snowflake,
  Thermometer,
  Wind,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertTriangle,
  Info,
  Package,
  Clock,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import {
  formatCurrency,
  formatPercent,
  getWeatherTypeLabel,
  getWeatherIcon,
} from '../../../utils/formatters';
import { calculateOrderSuggestions } from '../../../utils/analytics';
import { format, addDays } from 'date-fns';
import type { WeatherType, OrderSuggestion } from '../../../types';

const weatherIcons: Record<WeatherType, React.ReactNode> = {
  sunny: <Sun className="w-6 h-6" />,
  cloudy: <Cloud className="w-6 h-6" />,
  rainy: <CloudRain className="w-6 h-6" />,
  snowy: <Snowflake className="w-6 h-6" />,
  hot: <Thermometer className="w-6 h-6" />,
  cold: <Wind className="w-6 h-6" />,
};

export default function StaffOrderView() {
  const { state, getCurrentStore, getStoreOrderPlans, getStoreSales, getStoreWaste } = useApp();

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(state.categories.map(c => c.id))
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const tomorrowWeather = state.weatherData[0];
  const currentStore = getCurrentStore();
  const sales = getStoreSales();
  const waste = getStoreWaste();

  const orderSuggestions = useMemo(() => {
    return calculateOrderSuggestions(
      sales,
      waste,
      state.products,
      state.categories,
      state.weatherData,
      tomorrowWeather
    );
  }, [sales, waste, state.products, state.categories, state.weatherData, tomorrowWeather]);

  const categoryGroups = useMemo(() => {
    return state.categories.map(cat => {
      const catProducts = state.products.filter(p => p.categoryId === cat.id);
      const catProductIds = catProducts.map(p => p.id);
      const catSuggestions = orderSuggestions.filter(s => catProductIds.includes(s.productId));
      const totalQty = catSuggestions.reduce((sum, s) => sum + s.suggestedQty, 0);
      const totalAmount = catSuggestions.reduce((sum, s) => {
        const product = state.products.find(p => p.id === s.productId);
        return sum + s.suggestedQty * (product?.price || 0);
      }, 0);

      return {
        ...cat,
        suggestions: catSuggestions,
        totalQty,
        totalAmount,
      };
    });
  }, [state.categories, state.products, orderSuggestions]);

  const totalStats = useMemo(() => {
    const totalQty = orderSuggestions.reduce((sum, s) => sum + s.suggestedQty, 0);
    const totalAmount = orderSuggestions.reduce((sum, s) => {
      const product = state.products.find(p => p.id === s.productId);
      return sum + s.suggestedQty * (product?.price || 0);
    }, 0);
    const highConfidence = orderSuggestions.filter(s => s.confidence === 'high').length;

    return { totalQty, totalAmount, highConfidence };
  }, [orderSuggestions, state.products]);

  const toggleCategory = (catId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  const confidenceColors: Record<string, { bg: string; text: string; label: string }> = {
    high: { bg: 'bg-green-100', text: 'text-green-700', label: '高置信度' },
    medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '中置信度' },
    low: { bg: 'bg-red-100', text: 'text-red-700', label: '低置信度' },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">明日订货清单</h1>
          <p className="text-gray-500 mt-1">
            {currentStore?.name} · {tomorrow}
          </p>
        </div>
        {tomorrowWeather && (
          <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-xl shadow-card">
            <div className="text-3xl">{getWeatherIcon(tomorrowWeather.type)}</div>
            <div>
              <div className="font-semibold text-gray-800">
                {getWeatherTypeLabel(tomorrowWeather.type)} {tomorrowWeather.temperature}°C
              </div>
              <div className="text-xs text-gray-500">明日天气</div>
            </div>
          </div>
        )}
      </div>

      {tomorrowWeather && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">订货建议说明</p>
              <p>
                系统已根据近7天销售数据、报损情况及明日天气预测生成订货建议。
                请核对后通知店长确认。如对某个商品订货量有疑问，请及时与店长沟通。
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-card p-5">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Package className="w-4 h-4" />
            <span>计划订货总数</span>
          </div>
          <div className="text-3xl font-bold text-gray-800">
            {totalStats.totalQty} 件
          </div>
          <div className="text-xs text-gray-400 mt-2">
            共 {orderSuggestions.length} 个商品
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-card p-5">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <span className="text-lg">💰</span>
            <span>预计订货金额</span>
          </div>
          <div className="text-3xl font-bold text-gray-800">
            {formatCurrency(totalStats.totalAmount)}
          </div>
          <div className="text-xs text-gray-400 mt-2">
            按零售价计算
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-card p-5">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <CheckCircle className="w-4 h-4" />
            <span>高置信度商品</span>
          </div>
          <div className="text-3xl font-bold text-green-600">
            {totalStats.highConfidence} 个
          </div>
          <div className="text-xs text-gray-400 mt-2">
            建议重点核对低置信度商品
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="搜索商品名称..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:outline-none focus:border-primary-500 text-sm"
          />
        </div>
        <select
          value={selectedCategory || ''}
          onChange={e => setSelectedCategory(e.target.value || null)}
          className="px-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:outline-none focus:border-primary-500 text-sm"
        >
          <option value="">全部分类</option>
          {state.categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {categoryGroups
          .filter(cat => !selectedCategory || cat.id === selectedCategory)
          .map(cat => {
            const filteredSuggestions = cat.suggestions.filter(s =>
              !searchQuery || s.productName.includes(searchQuery)
            );
            if (filteredSuggestions.length === 0) return null;

            return (
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
                      <span className="ml-3 text-sm text-gray-500">
                        {cat.suggestions.length} 个商品
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div>
                      <span className="text-gray-500">订货量：</span>
                      <span className="font-semibold text-primary-600">{cat.totalQty} 件</span>
                    </div>
                    <div>
                      <span className="text-gray-500">金额：</span>
                      <span className="font-medium text-gray-700">{formatCurrency(cat.totalAmount)}</span>
                    </div>
                  </div>
                </button>

                {expandedCategories.has(cat.id) && (
                  <div className="border-t border-gray-100">
                    <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-gray-50 text-xs text-gray-500 font-medium">
                      <div className="col-span-4">商品名称</div>
                      <div className="col-span-2 text-center">建议订货量</div>
                      <div className="col-span-2 text-center">单价</div>
                      <div className="col-span-2 text-center">小计金额</div>
                      <div className="col-span-2 text-center">置信度</div>
                    </div>

                    {filteredSuggestions.map((suggestion: OrderSuggestion) => {
                      const product = state.products.find(p => p.id === suggestion.productId);
                      if (!product) return null;

                      const confidence = confidenceColors[suggestion.confidence];

                      return (
                        <div
                          key={suggestion.productId}
                          className="grid grid-cols-12 gap-4 px-4 py-3 border-t border-gray-50 items-center hover:bg-gray-50 transition-colors"
                        >
                          <div className="col-span-4 flex items-center gap-3">
                            <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center text-lg">
                              🍱
                            </div>
                            <div>
                              <div className="font-medium text-gray-800">{product.name}</div>
                              <div className="text-xs text-gray-400">{product.unit}</div>
                            </div>
                          </div>

                          <div className="col-span-2 text-center">
                            <div className="text-lg font-bold text-primary-600">
                              {suggestion.suggestedQty}
                            </div>
                            <div className="text-xs text-gray-400">{product.unit}</div>
                          </div>

                          <div className="col-span-2 text-center">
                            <div className="font-medium text-gray-700">
                              {formatCurrency(product.price)}
                            </div>
                            <div className="text-xs text-gray-400">/ {product.unit}</div>
                          </div>

                          <div className="col-span-2 text-center">
                            <div className="font-semibold text-gray-800">
                              {formatCurrency(product.price * suggestion.suggestedQty)}
                            </div>
                          </div>

                          <div className="col-span-2 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${confidence.bg} ${confidence.text}`}>
                              {suggestion.confidence === 'high' && <CheckCircle className="w-3 h-3" />}
                              {suggestion.confidence === 'low' && <AlertTriangle className="w-3 h-3" />}
                              {confidence.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      <div className="bg-white rounded-xl shadow-card p-5">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary-500" />
          订货建议计算依据
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-blue-50 rounded-xl">
            <div className="text-sm font-medium text-blue-800 mb-2">历史销售数据</div>
            <p className="text-xs text-blue-600">
              基于近7天的平均销量计算基础订货量
            </p>
          </div>
          <div className="p-4 bg-green-50 rounded-xl">
            <div className="text-sm font-medium text-green-800 mb-2">报损率优化</div>
            <p className="text-xs text-green-600">
              根据历史报损率适当减少订货，降低浪费
            </p>
          </div>
          <div className="p-4 bg-yellow-50 rounded-xl">
            <div className="text-sm font-medium text-yellow-800 mb-2">天气因素</div>
            <p className="text-xs text-yellow-600">
              参考明日天气预测，调整订货量
            </p>
          </div>
          <div className="p-4 bg-purple-50 rounded-xl">
            <div className="text-sm font-medium text-purple-800 mb-2">销售趋势</div>
            <p className="text-xs text-purple-600">
              分析近期销售走势，动态调整
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-5 text-center">
        <p className="text-sm text-gray-500">
          如有疑问请联系店长 · 订货确认后系统将自动生成采购单
        </p>
      </div>
    </div>
  );
}
