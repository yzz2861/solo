import { Trash2 } from 'lucide-react';
import type { CartItem } from '@/types';
import { useSolutionStore } from '@/store/useSolutionStore';

interface Props {
  item: CartItem;
}

export default function CartItemRow({ item }: Props) {
  const updateCartItem = useSolutionStore((s) => s.updateCartItem);
  const deleteCartItem = useSolutionStore((s) => s.deleteCartItem);

  const subtotal = item.price * item.quantity;

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl border transition-all animate-fade-in ${
        item.isBundle
          ? 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200'
          : 'bg-white border-gray-100 hover:border-primary-200'
      }`}
    >
      <input
        className="input-field !w-20 flex-shrink-0"
        value={item.name}
        onChange={(e) => updateCartItem(item.id, { name: e.target.value })}
        placeholder="商品名"
      />
      <div className="flex items-center gap-1 text-gray-500">
        <span className="text-sm">¥</span>
        <input
          type="number"
          className="input-field !w-20"
          value={item.price}
          onChange={(e) =>
            updateCartItem(item.id, { price: Number(e.target.value) || 0 })
          }
          min={0}
          step="0.01"
        />
      </div>
      <span className="text-gray-400">×</span>
      <input
        type="number"
        className="input-field !w-16"
        value={item.quantity}
        onChange={(e) =>
          updateCartItem(item.id, { quantity: Math.max(1, Number(e.target.value) || 1) })
        }
        min={1}
      />
      <label className="flex items-center gap-1.5 text-xs cursor-pointer flex-shrink-0">
        <input
          type="checkbox"
          checked={item.isBundle}
          onChange={(e) => updateCartItem(item.id, { isBundle: e.target.checked })}
          className="w-3.5 h-3.5 rounded border-orange-300 text-orange-500 focus:ring-orange-400"
        />
        <span className={item.isBundle ? 'text-orange-600 font-medium' : 'text-gray-500'}>
          套装
        </span>
      </label>
      <div className="ml-auto text-right flex-shrink-0">
        <div className="text-sm font-medium text-gray-800">¥{subtotal.toFixed(2)}</div>
      </div>
      <button
        onClick={() => deleteCartItem(item.id)}
        className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
        title="模拟退货：移除此商品"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
