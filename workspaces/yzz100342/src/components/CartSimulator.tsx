import { ShoppingCart, Plus, Ticket, Hash } from 'lucide-react';
import CartItemRow from './CartItemRow';
import { useSolutionStore } from '@/store/useSolutionStore';
import { calculateTotals } from '@/engine/giftCalculator';

export default function CartSimulator() {
  const solution = useSolutionStore((s) => s.getActive());
  const addCartItem = useSolutionStore((s) => s.addCartItem);
  const setCoupon = useSolutionStore((s) => s.setCoupon);
  const setOrderNumber = useSolutionStore((s) => s.setOrderNumber);

  if (!solution) return null;

  const totals = calculateTotals(solution.cart, solution.couponAmount);

  const handleAddItem = () => {
    addCartItem({
      name: `商品 ${solution.cart.length + 1}`,
      price: 99,
      quantity: 1,
      isBundle: false,
    });
  };

  return (
    <div className="card flex flex-col h-full min-h-0">
      <div className="card-header justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-accent-500" />
          <span className="card-title">模拟购物车</span>
          <span className="tag-accent">{solution.cart.length} 件商品</span>
        </div>
        <button className="btn-primary flex items-center gap-1" onClick={handleAddItem}>
          <Plus className="w-4 h-4" />
          添加商品
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {solution.cart.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">
            购物车为空，点击右上角添加商品
          </div>
        )}
        {solution.cart.map((item) => (
          <CartItemRow key={item.id} item={item} />
        ))}
      </div>

      <div className="border-t border-primary-50 p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="flex items-center gap-1 text-xs text-gray-500 mb-1">
              <Ticket className="w-3.5 h-3.5" />
              优惠券金额
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">¥</span>
              <input
                type="number"
                className="input-field !pl-7"
                value={solution.couponAmount || ''}
                onChange={(e) => setCoupon(Number(e.target.value) || 0)}
                min={0}
                step="0.01"
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <label className="flex items-center gap-1 text-xs text-gray-500 mb-1">
              <Hash className="w-3.5 h-3.5" />
              模拟订单号
            </label>
            <input
              type="number"
              className="input-field"
              value={solution.orderNumber || ''}
              onChange={(e) => setOrderNumber(Number(e.target.value) || 0)}
              min={0}
              placeholder="用于限量规则判断"
            />
          </div>
        </div>

        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">券前合计</span>
            <span className="text-gray-700">¥{totals.originalTotal.toFixed(2)}</span>
          </div>
          {totals.nonBundleTotal !== totals.originalTotal && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">非套装金额</span>
              <span className="text-orange-600">¥{totals.nonBundleTotal.toFixed(2)}</span>
            </div>
          )}
          {solution.couponAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">优惠券</span>
              <span className="text-green-600">-¥{solution.couponAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-semibold pt-1.5 border-t border-gray-100">
            <span className="text-gray-800">券后实付</span>
            <span className="text-primary-700">¥{totals.finalTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
